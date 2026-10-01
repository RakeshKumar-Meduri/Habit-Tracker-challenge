import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('====================================================');
console.log('🚀 Starting PULSE Real-Time Dev Servers...');
console.log('   - Backend API & WebSockets: http://localhost:3001');
console.log('   - Frontend Vite Client:     http://localhost:5173');
console.log('====================================================\n');

// 1. Start Backend Express + WebSocket Server (with --watch for live reload)
const serverProc = spawn(process.execPath, ['--watch', path.join(rootDir, 'server', 'server.js')], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' },
});

// 2. Start Vite Dev Server
const isWin = process.platform === 'win32';
const viteCmd = isWin ? 'npx.cmd' : 'npx';
const viteProc = spawn(viteCmd, ['vite', '--host'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWin,
});

function cleanup() {
  console.log('\n🛑 Shutting down dev servers...');
  try { serverProc.kill('SIGINT'); } catch {}
  try { viteProc.kill('SIGINT'); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
