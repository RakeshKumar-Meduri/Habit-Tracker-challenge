import { createServer } from 'vite';

process.on('uncaughtException', (err) => console.error('[Vite Error]', err));
process.on('unhandledRejection', (err) => console.error('[Vite Rejection]', err));

async function start() {
  try {
    const server = await createServer({
      server: {
        port: 5173,
      },
    });
    await server.listen();
    console.log('[Vite Dev Server] Running at http://localhost:5173');
  } catch (err) {
    console.error('Failed to start Vite:', err);
  }
}

start();

// Keep event loop alive indefinitely
setInterval(() => {}, 60000);
