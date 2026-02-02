import { spawn } from 'child_process';
import path from 'path';
import { createServer } from 'vite';

async function startDev() {
  // Start Vite dev server
  const server = await createServer({
    server: { port: 5173 }
  });
  await server.listen();
  console.log('Vite dev server started on http://localhost:5173');

  // Run Electron from node_modules (not PATH)
  const electronBin = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron'
  );
  const electronProcess = spawn(electronBin, ['electron/main.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
    shell: process.platform === 'win32'
  });

  electronProcess.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev().catch(console.error);