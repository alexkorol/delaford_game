import compression from 'compression';
import express from 'express';
import enforce from 'express-sslify';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import secure from 'ssl-express-www';

import Delaford from './Delaford.js';
import world from './core/world.js';
import nameValidationService from './core/services/name-validation.js';

const serverDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(serverDir, '..');
const distDir = path.join(projectRoot, 'dist');

const port = process.env.PORT || 6500;
const env = process.env.NODE_ENV || 'production';
const app = express();

const hasClientBundle = () => (
  fs.existsSync(distDir)
  && fs.existsSync(path.join(distDir, 'index.html'))
);

if (env === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
  app.use(secure);
}

app.use(compression());
app.use(express.json({ limit: '32kb' }));

if (hasClientBundle()) {
  app.use(express.static(distDir));
} else {
  process.stderr.write('[server] Client bundle not found in dist/. Static assets will be skipped.\n');
}

const serializeJob = (job) => {
  const payload = {
    jobId: job.id,
    status: job.status,
    requestedAt: job.requestedAt,
  };

  if (job.completedAt) {
    payload.completedAt = job.completedAt;
  }

  if (job.result) {
    payload.result = job.result;
  }

  if (job.error) {
    payload.error = job.error;
  }

  return payload;
};

app.post('/api/identity/name-validations', (req, res) => {
  const { name, accountId } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required.' });
  }

  const job = nameValidationService.createJob({ name, accountId });
  const statusCode = job.status === 'complete' ? 200 : 202;

  return res.status(statusCode).json(serializeJob(job));
});

app.get('/api/identity/name-validations/:jobId', (req, res) => {
  const job = nameValidationService.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ message: 'Validation job not found.' });
  }

  return res.json(serializeJob(job));
});

app.get('/api/identity/accounts/:accountId', (req, res) => {
  const account = nameValidationService.getAccountIdentity(req.params.accountId);

  if (!account) {
    return res.status(404).json({ message: 'Account not found.' });
  }

  return res.json(account);
});

app.get('/world/items', (_req, res) => res.send(world.items));
app.get('/world/players', (_req, res) => res.send(world.players));
app.get('/world/respawns', (_req, res) => res.send(world.respawns));
app.get('/world/shops', (_req, res) => res.send(world.shops));

app.use((_req, res) => {

  if (hasClientBundle()) {
    res.sendFile(path.join(distDir, 'index.html'));
    return;
  }

  res.status(503).json({
    message: 'Client bundle not found. Run `npm run build` or use the Vite dev server.',
  });
});

const server = http.createServer(app);
const sockets = new Set();

server.on('connection', (socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    process.stderr.write(`[server] Port ${port} is already in use. ${error}\n`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  process.stdout.write(`ENVIRONMENT: ${env} and PORT ${port}\n`);
});

const game = new Delaford(server);

game.start();

let isShuttingDown = false;

const gracefulShutdown = (signal, callback) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  process.stdout.write(`[server] Received ${signal}. Shutting down...\n`);

  try {
    game.shutdown();
  } catch (error) {
    process.stderr.write(`[server] Failed to stop game loop. ${error}\n`);
  }

  for (const socket of sockets) {
    try {
      socket.destroy();
    } catch (error) {
      process.stderr.write(`[server] Failed to destroy socket. ${error}\n`);
    }
  }

  const exitAfterClose = (code = 0) => {
    if (typeof callback === 'function') {
      callback();
      return;
    }
    process.exit(code);
  };

  const forceTimeout = setTimeout(() => {
    process.stderr.write('[server] Forced shutdown after timeout.\n');
    exitAfterClose(1);
  }, 5000);
  forceTimeout.unref();

  server.close((error) => {
    if (error) {
      process.stderr.write(`[server] Error closing HTTP server. ${error}\n`);
      exitAfterClose(1);
      return;
    }

    exitAfterClose(0);
  });
};

['SIGINT', 'SIGTERM', 'SIGBREAK'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

if (process.platform !== 'win32') {
  process.once('SIGUSR2', () => {
    gracefulShutdown('SIGUSR2', () => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}

export default app;
