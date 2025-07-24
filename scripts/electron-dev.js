const { spawn } = require('child_process');
const { createServer } = require('vite');

async function startDev() {
  // Start Vite dev server
  const server = await createServer({
    server: { port: 5173 }
  });
  await server.listen();
  console.log('Vite dev server started on http://localhost:5173');

  // Start Electron
  const electronProcess = spawn('electron', ['electron/main.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev().catch(console.error);