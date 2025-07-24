import { useState, useEffect, useCallback } from 'react';

export interface GameState {
  clock_time: number;
  game_time: number;
  paused: boolean;
  game_state: string;
  winner: number;
}

export type GSIConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

declare global {
  interface Window {
    electronAPI?: {
      getGSIStatus: () => Promise<{ isRunning: boolean; port: number }>;
      restartGSIServer: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export const useElectronGSI = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GSIConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);

  const pollGameState = useCallback(async () => {
    if (!isElectron) return;

    try {
      const response = await fetch('http://localhost:3000/gamestate');
      if (response.ok) {
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          // Extract relevant game state information
          const newGameState: GameState = {
            clock_time: data.map?.clock_time || data.clock_time || 0,
            game_time: data.map?.game_time || data.game_time || data.map?.clock_time || data.clock_time || 0,
            paused: data.map?.paused || data.paused || false,
            game_state: data.map?.game_state || data.game_state || 'DOTA_GAMERULES_STATE_INIT',
            winner: data.map?.winner || data.winner || 0
          };
          
          setGameState(newGameState);
          setConnectionStatus('connected');
          setError(null);
        } else {
          // Empty response means no active game
          setGameState(null);
          setConnectionStatus('connected'); // Server is running but no game data
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('GSI server not responding. Make sure Dota 2 is running.');
    }
  }, [isElectron]);

  const connect = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      setError('Electron API not available');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const status = await window.electronAPI.getGSIStatus();
      if (status.isRunning) {
        setConnectionStatus('connected');
        setError(null);
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
      setConnectionStatus('error');
      setError('Failed to communicate with GSI server');
    }
  }, [isElectron]);

  const disconnect = useCallback(() => {
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

  // Auto-polling when connected
  useEffect(() => {
    if (!isElectron) return;

    let interval: NodeJS.Timeout | null = null;
    
    if (connectionStatus === 'connected') {
      interval = setInterval(pollGameState, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [connectionStatus, pollGameState, isElectron]);

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