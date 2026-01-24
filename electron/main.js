const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let gsiServerProcess = null;
let latestGameState = null;
let gsiServerRestartCount = 0;
const GSI_PORT = 3000;
const MAX_SERVER_RESTARTS = 5;
const SERVER_RESTART_WINDOW = 60000; // 1 minute
const serverRestartTimes = [];

// GSI Server Management
const startGSIServer = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting GSI server...');
    
    // Simple HTTP server that accepts GSI data
    const serverCode = `
const http = require('http');

let latestGameState = null;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const newGameState = JSON.parse(body);
        latestGameState = newGameState;
        console.log('Received GSI data:', new Date().toISOString());
        
        // Notify Electron main process about new game state
        if (process.send) {
          process.send({ type: 'gsi-update', data: newGameState });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status": "ok"}');
      } catch (error) {
        console.error('Error parsing GSI data:', error);
        res.writeHead(400);
        res.end('{"error": "Invalid JSON"}');
      }
    });
  } else if (req.method === 'GET' && req.url === '/gamestate') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestGameState || {}));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(${GSI_PORT}, 'localhost', () => {
  console.log('GSI Server running on http://localhost:${GSI_PORT}');
});

process.on('SIGTERM', () => {
  console.log('GSI Server shutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('GSI Server shutting down...');
  server.close();
  process.exit(0);
});
`;

    // Write server code to temp file
    const tempDir = os.tmpdir();
    const serverFile = path.join(tempDir, 'gsi-server.js');
    
    try {
      fs.writeFileSync(serverFile, serverCode);
      
      // Start the server using fork to enable IPC
      gsiServerProcess = fork(serverFile, [], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      gsiServerProcess.stdout.on('data', (data) => {
        console.log('GSI Server:', data.toString());
      });
      
      gsiServerProcess.stderr.on('data', (data) => {
        console.error('GSI Server Error:', data.toString());
      });
      
      // Listen for game state updates from the GSI server process
      gsiServerProcess.on('message', (message) => {
        try {
          // Validate message structure
          if (!message || typeof message !== 'object' || Array.isArray(message)) {
            console.warn('Invalid message format from GSI server');
            return;
          }

          if (message.type === 'gsi-update' && message.data) {
            // Validate data is an object
            if (typeof message.data !== 'object' || Array.isArray(message.data)) {
              console.warn('Invalid game state data format');
              return;
            }

            latestGameState = message.data;
            
            // Send to all renderer processes with error handling
            if (mainWindow && !mainWindow.isDestroyed()) {
              try {
                mainWindow.webContents.send('gsi-game-state-update', message.data);
              } catch (error) {
                console.error('Error sending game state update to renderer:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error processing message from GSI server:', error);
        }
      });
      
      gsiServerProcess.on('close', (code, signal) => {
        console.log(`GSI server process exited with code ${code}, signal ${signal}`);
        gsiServerProcess = null;
        latestGameState = null;

        // Auto-restart if unexpected exit (not SIGTERM)
        if (signal !== 'SIGTERM' && code !== 0) {
          const now = Date.now();
          serverRestartTimes.push(now);
          
          // Clean old restart times
          const recentRestarts = serverRestartTimes.filter(time => now - time < SERVER_RESTART_WINDOW);
          serverRestartTimes.length = 0;
          serverRestartTimes.push(...recentRestarts);

          if (recentRestarts.length < MAX_SERVER_RESTARTS) {
            console.log(`GSI server crashed, attempting restart (${recentRestarts.length}/${MAX_SERVER_RESTARTS})...`);
            setTimeout(() => {
              if (!gsiServerProcess) {
                startGSIServer().catch(err => {
                  console.error('Failed to auto-restart GSI server:', err);
                });
              }
            }, 2000);
          } else {
            console.error(`GSI server has crashed too many times (${recentRestarts.length} times in ${SERVER_RESTART_WINDOW}ms). Stopping auto-restart.`);
          }
        }
      });
      
      gsiServerProcess.on('error', (error) => {
        console.error('Failed to start GSI server:', error);
        gsiServerProcess = null;
        reject(error);
      });

      // Handle uncaught exceptions in child process
      gsiServerProcess.on('uncaughtException', (error) => {
        console.error('Uncaught exception in GSI server process:', error);
      });
      
      // Give server time to start
      setTimeout(() => {
        if (gsiServerProcess && !gsiServerProcess.killed) {
          console.log('GSI server started successfully');
          resolve();
        } else {
          reject(new Error('GSI server failed to start'));
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error creating GSI server:', error);
      reject(error);
    }
  });
};

const stopGSIServer = () => {
  if (gsiServerProcess) {
    console.log('Stopping GSI server...');
    gsiServerProcess.kill('SIGTERM');
    gsiServerProcess = null;
  }
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Security: Disable web security only if absolutely necessary
      webSecurity: true,
      // Prevent new window creation
      nativeWindowOpen: false,
    },
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    title: 'Sentinel Timer - Dota 2 Timer Companion'
  });

  // Set Content Security Policy headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' http://localhost:* ws://localhost:*;"
        ]
      }
    });
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// App event handlers
app.whenReady().then(async () => {
  console.log('Electron app ready, starting GSI server...');
  
  try {
    await startGSIServer();
    console.log('GSI server started, creating window...');
    createWindow();
    
    // Check for updates after 5 seconds (to not block startup)
    if (process.env.NODE_ENV !== 'development') {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error('Failed to check for updates:', err);
        });
      }, 5000);
    }
  } catch (error) {
    console.error('Failed to start GSI server:', error);
    // Still create the window even if GSI server fails
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopGSIServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopGSIServer();
});

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('No update available');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'not-available' });
  }
});

autoUpdater.on('error', (error) => {
  console.error('Update error:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      status: 'error',
      error: error.message
    });
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version
    });
  }
});

// IPC handlers for update control
ipcMain.handle('check-for-updates', async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return { success: false, message: 'Updates disabled in development mode' };
    }
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check for updates on app start (after a delay)
app.whenReady().then(async () => {
  console.log('Electron app ready, starting GSI server...');
  
  try {
    await startGSIServer();
    console.log('GSI server started, creating window...');
    createWindow();
    
    // Check for updates after 5 seconds (to not block startup)
    if (process.env.NODE_ENV !== 'development') {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error('Failed to check for updates:', err);
        });
      }, 5000);
    }
  } catch (error) {
    console.error('Failed to start GSI server:', error);
    // Still create the window even if GSI server fails
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Rate limiting for IPC handlers
const ipcRateLimiter = {
  calls: new Map(),
  maxCalls: 10,
  windowMs: 1000,
  checkLimit(handler) {
    const now = Date.now();
    const calls = this.calls.get(handler) || [];
    const recentCalls = calls.filter(time => now - time < this.windowMs);
    
    if (recentCalls.length >= this.maxCalls) {
      return false;
    }
    
    recentCalls.push(now);
    this.calls.set(handler, recentCalls);
    return true;
  }
};

// IPC handlers with rate limiting and error handling
ipcMain.handle('get-gsi-status', (event) => {
  try {
    if (!ipcRateLimiter.checkLimit('get-gsi-status')) {
      return { isRunning: false, port: GSI_PORT, error: 'Rate limit exceeded' };
    }

    return {
      isRunning: gsiServerProcess !== null && !gsiServerProcess.killed,
      port: GSI_PORT
    };
  } catch (error) {
    console.error('Error in get-gsi-status handler:', error);
    return {
      isRunning: false,
      port: GSI_PORT,
      error: error.message || 'Unknown error'
    };
  }
});

ipcMain.handle('restart-gsi-server', async (event) => {
  try {
    if (!ipcRateLimiter.checkLimit('restart-gsi-server')) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    // Prevent too many restarts
    const now = Date.now();
    const recentRestarts = serverRestartTimes.filter(time => now - time < SERVER_RESTART_WINDOW);
    if (recentRestarts.length >= MAX_SERVER_RESTARTS) {
      return {
        success: false,
        error: `Too many restart attempts. Please wait before trying again.`
      };
    }

    stopGSIServer();
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await startGSIServer();
    serverRestartTimes.push(now);
    
    return { success: true };
  } catch (error) {
    console.error('Error restarting GSI server:', error);
    return {
      success: false,
      error: error.message || 'Failed to restart server'
    };
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
  // Don't exit - try to recover
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in main process:', reason);
  // Log but don't crash
});