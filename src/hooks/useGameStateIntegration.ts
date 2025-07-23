import { useState, useEffect, useCallback, useRef } from 'react';

export interface GameState {
  clock_time: number;
  game_time: number;
  paused: boolean;
  game_state: 'DOTA_GAMERULES_STATE_INIT' | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD' | 'DOTA_GAMERULES_STATE_HERO_SELECTION' | 'DOTA_GAMERULES_STATE_STRATEGY_TIME' | 'DOTA_GAMERULES_STATE_PRE_GAME' | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' | 'DOTA_GAMERULES_STATE_POST_GAME' | 'DOTA_GAMERULES_STATE_DISCONNECT';
  winner: number;
}

export const useGameStateIntegration = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      // GSI typically uses HTTP polling rather than WebSocket
      // We'll use a polling approach to check for GSI data
      setError(null);
      pollGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    }
  }, []);

  const pollGameState = useCallback(async () => {
    try {
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
          setIsConnected(true);
          setLastSyncTime(Date.now());
          setError(null);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game state';
      
      // Only set error if we weren't connected before (to avoid spam)
      if (isConnected) {
        setError(errorMessage);
        setIsConnected(false);
      }
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setGameState(null);
    setError(null);
  }, []);

  const syncGameTime = useCallback((): number | null => {
    if (!gameState || !isConnected) {
      return null;
    }
    
    // Return the current game time in seconds
    return gameState.game_time;
  }, [gameState, isConnected]);

  const isGameInProgress = useCallback((): boolean => {
    return gameState?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || false;
  }, [gameState]);

  // Auto-polling when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isConnected || (!isConnected && !error)) {
      interval = setInterval(pollGameState, 1000); // Poll every second
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, error, pollGameState]);

  // Auto-reconnect logic
  useEffect(() => {
    if (error && !isConnected) {
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000); // Retry every 5 seconds
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [error, isConnected, connect]);

  return {
    gameState,
    isConnected,
    error,
    lastSyncTime,
    connect,
    disconnect,
    syncGameTime,
    isGameInProgress,
  };
};