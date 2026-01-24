import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GSIConnectionStatus, RawGSIData } from '@/types/gsi';
import { validateAndSanitizeGSIData } from '@/utils/validation';
import { retryWithBackoff } from '@/utils/retry';
import { logger } from '@/utils/logger';
import { healthMonitor } from '@/utils/healthMonitor';

declare global {
  interface Window {
    electronAPI?: {
      getGSIStatus: () => Promise<{ isRunning: boolean; port: number }>;
      restartGSIServer: () => Promise<{ success: boolean; error?: string }>;
      onGameStateUpdate: (callback: (data: RawGSIData) => void) => () => void;
      checkForUpdates?: () => Promise<{ success: boolean; message?: string; error?: string }>;
      downloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
      installUpdate?: () => Promise<{ success: boolean; error?: string }>;
      onUpdateStatus?: (callback: (data: unknown) => void) => () => void;
      onUpdateProgress?: (callback: (data: unknown) => void) => () => void;
    };
  }
}

export const useElectronGSI = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GSIConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);

  const cleanupRef = useRef<(() => void) | null>(null);

  // Process game state data from IPC with validation
  const processGameState = useCallback((data: unknown) => {
    try {
      // Validate and sanitize incoming data
      const sanitized = validateAndSanitizeGSIData(data);
      
      if (!sanitized || Object.keys(sanitized).length === 0) {
        // Empty response means no active game
        setGameState(null);
        setConnectionStatus('connected'); // Server is running but no game data
        return;
      }

      // Extract relevant game state information with proper type handling
      const rawState = sanitized.map?.game_state || sanitized.game_state;
      const gameStateValue = (rawState && typeof rawState === 'string') 
        ? rawState as GameState['game_state']
        : 'DOTA_GAMERULES_STATE_INIT';

      const newGameState: GameState = {
        clock_time: sanitized.map?.clock_time ?? sanitized.clock_time ?? 0,
        game_time: sanitized.map?.game_time ?? sanitized.game_time ?? sanitized.map?.clock_time ?? sanitized.clock_time ?? 0,
        paused: sanitized.map?.paused ?? sanitized.paused ?? false,
        game_state: gameStateValue,
        winner: sanitized.map?.winner ?? sanitized.winner ?? 0
      };
      
      setGameState(newGameState);
      setConnectionStatus('connected');
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Error processing game state', error, { rawData: data });
      setError('Failed to process game state data');
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      setError('Electron API not available');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Use retry logic for getting GSI status
      const statusResult = await retryWithBackoff(
        () => window.electronAPI!.getGSIStatus(),
        {
          maxRetries: 2,
          initialDelay: 500,
          onRetry: (attempt, error) => {
            logger.warn(`Retrying GSI status check (attempt ${attempt})`, { error });
          },
        }
      );

      if (!statusResult.success || !statusResult.data) {
        throw new Error('Failed to get GSI status');
      }

      const status = statusResult.data;

      if (status.isRunning) {
        setConnectionStatus('connected');
        setError(null);
        
        // Fetch initial game state if available (with timeout and retry)
        const fetchResult = await retryWithBackoff(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            try {
              const response = await fetch(`http://localhost:${status.port}/gamestate`, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              
              const data = await response.json();
              return data;
            } catch (err) {
              clearTimeout(timeoutId);
              throw err;
            }
          },
          {
            maxRetries: 1,
            initialDelay: 500,
          }
        );

        if (fetchResult.success && fetchResult.data) {
          processGameState(fetchResult.data);
        }
        // Ignore fetch errors - IPC will handle updates going forward
      } else {
        const result = await window.electronAPI.restartGSIServer();
        if (result.success) {
          setConnectionStatus('connected');
          setError(null);
        } else {
          setConnectionStatus('error');
          setError(result.error || 'Failed to start GSI server');
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to connect to GSI', error);
      setConnectionStatus('error');
      setError('Failed to communicate with GSI server');
    }
  }, [isElectron, processGameState]);

  const disconnect = useCallback(() => {
    // Clean up IPC listener
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setConnectionStatus('disconnected');
    setGameState(null);
    setError(null);
  }, []);

  const syncGameTime = useCallback((): number | null => {
    if (!gameState || connectionStatus !== 'connected') {
      return null;
    }
    return gameState.game_time;
  }, [gameState, connectionStatus]);

  const isGameInProgress = useCallback((): boolean => {
    return gameState?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || false;
  }, [gameState]);

  // Listen for IPC game state updates (only when connected or connecting)
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onGameStateUpdate) return;
    if (connectionStatus === 'disconnected') return;

    // Clean up previous listener if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const handler = (data: unknown) => {
      try {
        processGameState(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Error in game state update handler', error, { data });
        setError('Failed to process game state update');
      }
    };

    const cleanup = window.electronAPI.onGameStateUpdate(handler);
    cleanupRef.current = cleanup;
    healthMonitor.trackListener(cleanup);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        healthMonitor.untrackListener(cleanup);
        cleanupRef.current = null;
      }
    };
  }, [isElectron, connectionStatus, processGameState]);

  // Auto-connect on startup if in Electron
  useEffect(() => {
    if (isElectron && connectionStatus === 'disconnected') {
      connect();
    }
  }, [isElectron, connectionStatus, connect]);

  return {
    gameState,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    error,
    connect,
    disconnect,
    syncGameTime,
    isGameInProgress,
    isElectron
  };
};