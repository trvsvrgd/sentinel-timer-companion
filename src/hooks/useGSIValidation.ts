import { useState, useEffect, useCallback } from 'react';

interface GSIValidationState {
  configFileExists: boolean;
  serverRunning: boolean;
  gameConnected: boolean;
  lastCheck: number | null;
}

export const useGSIValidation = () => {
  const [validationState, setValidationState] = useState<GSIValidationState>({
    configFileExists: false,
    serverRunning: false,
    gameConnected: false,
    lastCheck: null
  });

  const checkConfigFile = useCallback(async (): Promise<boolean> => {
    // Check if the GSI config file exists by attempting to read game state
    // This is an indirect way since we can't directly access file system from browser
    try {
      const response = await fetch('http://localhost:3000/gamestate', {
        method: 'GET',
        timeout: 2000
      } as any);
      
      // If we get any response (even empty), it suggests the server is running
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const checkServerRunning = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/gamestate', {
        method: 'GET',
        timeout: 2000
      } as any);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const checkGameConnected = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/gamestate');
      if (response.ok) {
        const data = await response.json();
        // Check if we have meaningful game data (not just empty object)
        return data && Object.keys(data).length > 0 && 
               (data.map?.game_state || data.game_state) !== undefined;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, []);

  const runValidation = useCallback(async () => {
    const [configExists, serverRunning, gameConnected] = await Promise.all([
      checkConfigFile(),
      checkServerRunning(),
      checkGameConnected()
    ]);

    setValidationState({
      configFileExists: configExists,
      serverRunning,
      gameConnected,
      lastCheck: Date.now()
    });

    return {
      configFileExists: configExists,
      serverRunning,
      gameConnected
    };
  }, [checkConfigFile, checkServerRunning, checkGameConnected]);

  // Auto-validate periodically when mounted
  useEffect(() => {
    runValidation();
    const interval = setInterval(runValidation, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [runValidation]);

  return {
    ...validationState,
    runValidation,
    isStepComplete: (step: number): boolean => {
      switch (step) {
        case 1: return validationState.configFileExists;
        case 2: return validationState.serverRunning;
        case 3: return validationState.gameConnected;
        default: return false;
      }
    }
  };
};