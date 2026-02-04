import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fork } from 'child_process';
import electronUpdater from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disableHardwareAcceleration();

let mainWindow;
let gsiServerProcess = null;
let latestGameState = null;
const GSI_PORT = 3000;
const MAX_SERVER_RESTARTS = 5;
const SERVER_RESTART_WINDOW = 60000; 
const serverRestartTimes = [];

// --- GSI Server Management ---
const startGSIServer = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting GSI server...');
    
    const serverCode = `
const http = require('http');
let latestGameState = null;
const server = http.createServer((req, res) => {
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
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const newGameState = JSON.parse(body);
        latestGameState = newGameState;
        if (process.send) {
          process.send({ type: 'gsi-update', data: newGameState });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status": "ok"}');
      } catch (error) {
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
`;

    const tempDir = os.tmpdir();
    const serverFile = path.join(tempDir, 'gsi-server.js');
    
    try {
      fs.writeFileSync(serverFile, serverCode);
      gsiServerProcess = fork(serverFile, [], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
      });
      
      gsiServerProcess.on('message', (message) => {
        if (message.type === 'gsi-update' && message.data) {
          latestGameState = message.data;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('gsi-game-state-update', message.data);
          }
        }
      });
      
      gsiServerProcess.on('close', (code, signal) => {
        gsiServerProcess = null;
        if (signal !== 'SIGTERM' && code !== 0) {
          const now = Date.now();
          const recentRestarts = serverRestartTimes.filter(time => now - time < SERVER_RESTART_WINDOW);
          if (recentRestarts.length < MAX_SERVER_RESTARTS) {
            serverRestartTimes.push(now);
            setTimeout(() => startGSIServer(), 2000);
          }
        }
      });

      setTimeout(() => {
        if (gsiServerProcess && !gsiServerProcess.killed) resolve();
        else reject(new Error('GSI server failed to start'));
      }, 2000);
      
    } catch (error) {
      reject(error);
    }
  });
};

const stopGSIServer = () => {
  if (gsiServerProcess) {
    gsiServerProcess.kill('SIGTERM');
    gsiServerProcess = null;
  }
};

// --- Main Window Creation ---
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    title: 'Sentinel Timer - Dota 2 Timer Companion'
  });

  // CSP Header Management
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

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = app.isPackaged
      ? path.join(app.getAppPath(), 'dist', 'index.html')
      : path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading production index from:', indexPath);
    mainWindow.loadFile(indexPath).catch(() => {
      const fallbackPath = path.join(app.getAppPath(), 'index.html');
      console.log('Falling back to:', fallbackPath);
      mainWindow.loadFile(fallbackPath);
    });
  }

  // --- Listeners inside createWindow ---
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`RENDERER LOG: ${message} (Source: ${sourceId}:${line})`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// --- Lifecycle & IPC ---
app.whenReady().then(async () => {
  try {
    await startGSIServer();
    createWindow();
    
    if (!app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => console.error(err));
      }, 5000);
    }
  } catch (error) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  stopGSIServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopGSIServer);

// IPC Handlers (Update/GSI Status)
ipcMain.handle('get-gsi-status', () => ({
  isRunning: gsiServerProcess !== null && !gsiServerProcess.killed,
  port: GSI_PORT
}));

ipcMain.handle('restart-gsi-server', async () => {
  stopGSIServer();
  await new Promise(r => setTimeout(r, 1000));
  await startGSIServer();
  return { success: true };
});

// Update Handlers (Simplified for brevity, keep your existing ones)
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return { success: false, message: 'Disabled in Dev' };
  await autoUpdater.checkForUpdates();
  return { success: true };
});