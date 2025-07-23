import { useState, useEffect, useCallback, useRef } from 'react';

export interface GameState {
  clock_time: number;
  game_time: number;
  paused: boolean;
  game_state: 'DOTA_GAMERULES_STATE_INIT' | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD' | 'DOTA_GAMERULES_STATE_HERO_SELECTION' | 'DOTA_GAMERULES_STATE_STRATEGY_TIME' | 'DOTA_GAMERULES_STATE_PRE_GAME' | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' | 'DOTA_GAMERULES_STATE_POST_GAME' | 'DOTA_GAMERULES_STATE_DISCONNECT';
  winner: number;
}

export type GSIConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  }, [connectionStatus]);

  const pollGameState = useCallback(async () => {
    try {
      setConnectionAttempts(prev => prev + 1);
      
      // GSI typically writes to a local file or serves on localhost:3000
      // This is a common GSI endpoint for Dota 2
      const response = await fetch('http://localhost:3000/gamestate', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Extract relevant game state information
        if (data && data.map && data.map.clock_time !== undefined) {
          const newGameState: GameState = {
            clock_time: data.map.clock_time,
            game_time: data.map.game_time || data.map.clock_time,
            paused: data.map.paused || false,
            game_state: data.map.game_state || 'DOTA_GAMERULES_STATE_INIT',
            winner: data.map.winner || 0
          };
          
          setGameState(newGameState);
          setConnectionStatus('connected');
          setLastSyncTime(Date.now());
          setError(null);
          setConnectionAttempts(0);
        } else {
          throw new Error('Invalid GSI data format');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game state';
      
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
      interval = setInterval(pollGameState, 1000); // Poll every second when connected
    } else if (connectionStatus === 'connecting' && connectionAttempts < maxRetries) {
      interval = setInterval(pollGameState, 2000); // Poll every 2 seconds when connecting
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
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