import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDb } from './config/db.js';
import { registerIo } from './services/broadcast.js';
import { registerSocketHandlers } from './sockets/handlers.js';

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/queue-cure';
// Accepts a comma-separated list so the app can be reached from the host machine
// and from phones/TVs on the LAN at the same time.
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

async function start() {
  await connectDb(MONGO_URI);

  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
  });

  registerIo(io);
  registerSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`Queue Cure backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
