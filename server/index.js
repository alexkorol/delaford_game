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
  // eslint-disable-next-line no-console
  console.warn('[server] Client bundle not found in dist/. Static assets will be skipped.');
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

app.get('*', (_req, res) => {
  if (hasClientBundle()) {
    res.sendFile(path.join(distDir, 'index.html'));
    return;
  }

  res.status(503).json({
    message: 'Client bundle not found. Run `npm run build` or use the Vite dev server.',
  });
});

const server = http.createServer(app);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ENVIRONMENT: ${env} and PORT ${port}`);
});

const game = new Delaford(server);

game.start();

export default app;
