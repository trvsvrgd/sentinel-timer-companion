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
    // For config file, we assume it exists if server responds
    // In a real implementation, this would check file system
    try {
      const response = await fetch('http://localhost:3000/gamestate', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      // If server responds, config file likely exists
      return response.status !== 404;
    } catch (error) {
      return false;
    }
  }, []);

  const checkServerRunning = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/gamestate', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.status !== 0; // Any HTTP response means server is running
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

    return { configExists, serverRunning, gameConnected };
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
        case 1: return validationState.serverRunning; // Step 1 complete if server responds
        case 2: return validationState.serverRunning; // Step 2 same as step 1
        case 3: return validationState.gameConnected;
        default: return false;
      }
    }
  };
};