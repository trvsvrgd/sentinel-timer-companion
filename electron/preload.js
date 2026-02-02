import { contextBridge, ipcRenderer } from 'electron';

// Rate limiting for IPC calls
const rateLimiter = {
  calls: new Map(),
  maxCalls: 10,
  windowMs: 1000, // 1 second window
  checkLimit(key) {
    const now = Date.now();
    const calls = this.calls.get(key) || [];
    const recentCalls = calls.filter(time => now - time < this.windowMs);
    
    if (recentCalls.length >= this.maxCalls) {
      return false;
    }
    
    recentCalls.push(now);
    this.calls.set(key, recentCalls);
    return true;
  }
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, calls] of rateLimiter.calls.entries()) {
    const recentCalls = calls.filter(time => now - time < rateLimiter.windowMs);
    if (recentCalls.length === 0) {
      rateLimiter.calls.delete(key);
    } else {
      rateLimiter.calls.set(key, recentCalls);
    }
  }
}, 5000);

// Validate callback function
function validateCallback(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  return true;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getGSIStatus: async () => {
    if (!rateLimiter.checkLimit('getGSIStatus')) {
      throw new Error('Rate limit exceeded for getGSIStatus');
    }
    try {
      return await ipcRenderer.invoke('get-gsi-status');
    } catch (error) {
      console.error('Error getting GSI status:', error);
      throw error;
    }
  },
  
  restartGSIServer: async () => {
    if (!rateLimiter.checkLimit('restartGSIServer')) {
      throw new Error('Rate limit exceeded for restartGSIServer');
    }
    try {
      return await ipcRenderer.invoke('restart-gsi-server');
    } catch (error) {
      console.error('Error restarting GSI server:', error);
      throw error;
    }
  },
  
  // Auto-updater API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') {
      console.error('onUpdateStatus: callback must be a function');
      return () => {};
    }
    const wrappedCallback = (_event, data) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in update status callback:', error);
      }
    };
    ipcRenderer.on('update-status', wrappedCallback);
    return () => {
      ipcRenderer.removeListener('update-status', wrappedCallback);
    };
  },
  onUpdateProgress: (callback) => {
    if (typeof callback !== 'function') {
      console.error('onUpdateProgress: callback must be a function');
      return () => {};
    }
    const wrappedCallback = (_event, data) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in update progress callback:', error);
      }
    };
    ipcRenderer.on('update-progress', wrappedCallback);
    return () => {
      ipcRenderer.removeListener('update-progress', wrappedCallback);
    };
  },
  
  onGameStateUpdate: (callback) => {
    try {
      validateCallback(callback);
    } catch (error) {
      console.error('onGameStateUpdate: invalid callback', error);
      return () => {}; // Return no-op cleanup
    }

    let messageCount = 0;
    const maxMessagesPerSecond = 10; // Prevent message spam
    let lastMessageTime = 0;

    const wrappedCallback = (_event, data) => {
      try {
        const now = Date.now();
        
        // Rate limit message processing
        if (now - lastMessageTime < 100) {
          messageCount++;
          if (messageCount > maxMessagesPerSecond) {
            console.warn('Game state update rate limit exceeded, skipping message');
            return;
          }
        } else {
          messageCount = 0;
        }
        lastMessageTime = now;

        // Validate data is an object
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          callback(data);
        } else {
          console.warn('Invalid game state data received:', typeof data);
        }
      } catch (error) {
        console.error('Error in game state update callback:', error);
      }
    };
    
    ipcRenderer.on('gsi-game-state-update', wrappedCallback);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('gsi-game-state-update', wrappedCallback);
    };
  }
});