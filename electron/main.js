const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let gsiServerProcess = null;
const GSI_PORT = 3000;

// GSI Server Management
const startGSIServer = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting GSI server...');
    
    // Simple HTTP server that accepts GSI data
    const serverCode = `
const http = require('http');
const fs = require('fs');

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
        latestGameState = JSON.parse(body);
        console.log('Received GSI data:', new Date().toISOString());
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
      
      // Start the server
      gsiServerProcess = spawn('node', [serverFile], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      gsiServerProcess.stdout.on('data', (data) => {
        console.log('GSI Server:', data.toString());
      });
      
      gsiServerProcess.stderr.on('data', (data) => {
        console.error('GSI Server Error:', data.toString());
      });
      
      gsiServerProcess.on('close', (code) => {
        console.log('GSI server process exited with code', code);
        gsiServerProcess = null;
      });
      
      gsiServerProcess.on('error', (error) => {
        console.error('Failed to start GSI server:', error);
        reject(error);
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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    title: 'Sentinel Timer - Dota 2 Timer Companion'
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

// IPC handlers
ipcMain.handle('get-gsi-status', () => {
  return {
    isRunning: gsiServerProcess !== null && !gsiServerProcess.killed,
    port: GSI_PORT
  };
});

ipcMain.handle('restart-gsi-server', async () => {
  stopGSIServer();
  try {
    await startGSIServer();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});