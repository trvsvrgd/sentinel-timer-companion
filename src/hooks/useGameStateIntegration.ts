import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GSIConnectionStatus } from '@/types/gsi';
import { validateAndSanitizeGSIData } from '@/utils/validation';
import { retryWithBackoff } from '@/utils/retry';
import { logger } from '@/utils/logger';
import { createTrackedInterval, clearTrackedInterval } from '@/utils/timeout';
import { healthMonitor } from '@/utils/healthMonitor';

export const useGameStateIntegration = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GSIConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  const connect = useCallback(() => {
    if (connectionStatus === 'connecting') return;
    
    setConnectionStatus('connecting');
    setConnectionAttempts(0);
    setError(null);
    pollGameState();
  }, [connectionStatus, pollGameState]);

  const pollGameState = useCallback(async () => {
    try {
      setConnectionAttempts(prev => prev + 1);
      
      // Use retry logic with timeout
      const result = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          try {
            const response = await fetch('http://localhost:3000/gamestate', {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Validate and sanitize data
            const sanitized = validateAndSanitizeGSIData(data);
            
            if (!sanitized || !sanitized.map || sanitized.map.clock_time === undefined) {
              throw new Error('Invalid GSI data format');
            }
            
            return sanitized;
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

      if (result.success && result.data) {
        const data = result.data;
        
        // Extract relevant game state information
        const rawState = data.map?.game_state || data.game_state;
        const gameStateValue = (rawState && typeof rawState === 'string') 
          ? rawState as GameState['game_state']
          : 'DOTA_GAMERULES_STATE_INIT';

        const newGameState: GameState = {
          clock_time: data.map?.clock_time ?? data.clock_time ?? 0,
          game_time: data.map?.game_time ?? data.game_time ?? data.map?.clock_time ?? data.clock_time ?? 0,
          paused: data.map?.paused ?? data.paused ?? false,
          game_state: gameStateValue,
          winner: data.map?.winner ?? data.winner ?? 0
        };
        
        setGameState(newGameState);
        setConnectionStatus('connected');
        setLastSyncTime(Date.now());
        setError(null);
        setConnectionAttempts(0);
      } else {
        throw result.error || new Error('Failed to fetch game state');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Error polling game state', error);
      const errorMessage = error.message;
      
      if (connectionAttempts >= maxRetries) {
        setConnectionStatus('error');
        setError(`GSI Connection Failed: ${errorMessage}. Please check that:\n1. GSI config file is set up correctly\n2. GSI server is running on localhost:3000\n3. Dota 2 is running with an active match`);
      } else if (connectionStatus === 'connecting') {
        // Continue trying while in connecting state
        setError(null);
      } else {
        setConnectionStatus('disconnected');
        setError(errorMessage);
      }
    }
  }, [connectionStatus, connectionAttempts, maxRetries]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
    setGameState(null);
    setError(null);
    setConnectionAttempts(0);
    logger.info('GSI connection disconnected');
  }, []);

  const syncGameTime = useCallback((): number | null => {
    if (!gameState || connectionStatus !== 'connected') {
      return null;
    }
    
    // Return the current game time in seconds
    return gameState.game_time;
  }, [gameState, connectionStatus]);

  const isGameInProgress = useCallback((): boolean => {
    return gameState?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || false;
  }, [gameState]);

  // Auto-polling when connected or connecting
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (connectionStatus === 'connected') {
      interval = createTrackedInterval(pollGameState, 1000); // Poll every second when connected
    } else if (connectionStatus === 'connecting' && connectionAttempts < maxRetries) {
      interval = createTrackedInterval(pollGameState, 2000); // Poll every 2 seconds when connecting
    }
    
    return () => {
      if (interval) {
        clearTrackedInterval(interval);
      }
    };
  }, [connectionStatus, connectionAttempts, maxRetries, pollGameState]);

  // Auto-reconnect logic (only after error state)
  useEffect(() => {
    if (connectionStatus === 'error') {
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus('disconnected');
        setError(null);
      }, 10000); // Wait 10 seconds before allowing retry after error
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectionStatus]);

  return {
    gameState,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    error,
    lastSyncTime,
    connect,
    disconnect,
    syncGameTime,
    isGameInProgress,
  };
};