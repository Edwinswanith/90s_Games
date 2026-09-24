import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PartyRoom, roomDirectory } from './rooms/PartyRoom';
import { BUILD, CONTENT } from '../../../packages/shared/src/config';
// Hosting platforms (Render, Railway) assign the port through PORT.
const port = Number(process.env.GAME_SERVER_PORT || process.env.PORT || 2567),
  clientPort = Number(process.env.CLIENT_PORT || 5173);
const hosts = [
  'localhost',
  '127.0.0.1',
  ...Object.values(networkInterfaces())
    .flat()
    .filter((x) => x?.family === 'IPv4')
    .map((x) => x!.address),
];
// Public URLs that hosting platforms expose automatically, so a deploy needs no manual origin.
const platform = [
  process.env.RENDER_EXTERNAL_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
].filter((x): x is string => !!x);
const allowed = new Set([
  ...platform,
  ...(process.env.ALLOWED_ORIGINS?.trim()
    ? process.env.ALLOWED_ORIGINS.split(',').map((x) => x.trim())
    : hosts.flatMap((h) => [`http://${h}:${port}`, `http://${h}:${clientPort}`])),
]);
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.status(403).json({ error: 'Origin is not allowed.' });
    return;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.get('/health', (_req, res) => {
  const samples = [...roomDirectory.values()].flatMap((r) => r.stepSamples).sort((a, b) => a - b);
  res.json({
    ok: true,
    build: BUILD,
    content: CONTENT,
    rooms: roomDirectory.size,
    participants: [...roomDirectory.values()].reduce((n, r) => n + r.state.players.size, 0),
    bodies: [...roomDirectory.values()].reduce((n, r) => n + r.physics.bodies.size, 0),
    stepP95Ms: samples[Math.floor(samples.length * 0.95)] ?? 0,
    rssMB: process.memoryUsage().rss / 1048576,
  });
});
app.get('/rooms/:code', (req, res) => {
  if (!/^[A-F0-9]{6}$/.test(req.params.code)) {
    res.status(400).json({ error: 'Enter the six-character room code.' });
    return;
  }
  const room = roomDirectory.get(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Room not found on this server.' });
    return;
  }
  res.json({
    roomId: room.roomId,
    joinable: room.state.phase === 'LOBBY' && room.state.players.size < room.state.slots,
    reason:
      room.state.phase !== 'LOBBY'
        ? 'This match has already started.'
        : room.state.players.size >= room.state.slots
          ? 'This room is full.'
          : '',
    build: BUILD,
  });
});
app.use('/assets', (req, res, next) => {
  if (!req.acceptsEncodings('gzip') || !/^\/[a-zA-Z0-9._-]+\.(js|css)$/.test(req.path))
    return next();
  const file = resolve('apps/web/dist/assets', req.path.slice(1) + '.gz');
  if (!existsSync(file)) return next();
  res.setHeader('Content-Encoding', 'gzip');
  res.append('Vary', 'Accept-Encoding');
  res.type(req.path.endsWith('.js') ? 'js' : 'css');
  res.sendFile(file);
});
app.use(express.static(resolve('apps/web/dist')));
app.get('/', (_req, res) => res.sendFile(resolve('apps/web/dist/index.html')));
const http = createServer(app);
const game = new Server({
  transport: new WebSocketTransport({
    server: http,
    maxPayload: 4096,
    verifyClient: (info, done) =>
      done(!info.origin || allowed.has(info.origin), 403, 'Origin is not allowed.'),
  }),
  greet: false,
  gracefullyShutdown: false,
});
game.define('party', PartyRoom);
http.once('error', (error) => {
  console.error(`Game port ${port} could not open: ${error.message}`);
  process.exit(1);
});
try {
  await game.listen(port, process.env.GAME_SERVER_HOST || '0.0.0.0');
} catch (error) {
  console.error(
    `Could not open game port ${port}. Close the other server or change GAME_SERVER_PORT.`,
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
// Colyseus installs its own router ahead of Express. Gate the resulting HTTP
// handlers so matchmaking and OPTIONS enforce the same origin policy as gameplay.
const handlers = http.listeners('request') as ((
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
) => void)[];
const attempts = new Map<string, { at: number; count: number }>();
http.removeAllListeners('request');
http.on('request', (req, res) => {
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Origin is not allowed.' }));
    return;
  }
  if (req.url?.startsWith('/matchmake/')) {
    if (Number(req.headers['content-length'] || 0) > 4096) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request is too large.' }));
      return;
    }
    const now = Date.now(),
      key = req.socket.remoteAddress || 'local';
    for (const [address, value] of attempts) if (now - value.at > 60000) attempts.delete(address);
    const bucket = attempts.get(key) || { at: now, count: 0 };
    attempts.set(key, bucket);
    if (++bucket.count > 120) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many join requests. Try again in a minute.' }));
      return;
    }
  }
  for (const handler of handlers) handler.call(http, req, res);
});
console.log(`Theru Party server ready on port ${port} · ${BUILD}`);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await game.gracefullyShutdown(false);
  http.close();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
