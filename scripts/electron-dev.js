import { spawn } from 'child_process';
import path from 'path';
import { createServer } from 'vite';

async function startDev() {
  // Start Vite dev server
  const server = await createServer({
    server: { port: 8080 }
  });
  await server.listen();
  console.log('Vite dev server started on http://localhost:8080');

  // Run Electron from node_modules (not PATH)
  const electronBin = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron'
  );
  const electronProcess = spawn(electronBin, ['electron/main.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:8080'
    },
    shell: process.platform === 'win32'
  });

  electronProcess.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev().catch(console.error);