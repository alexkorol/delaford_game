/** ***************************************
Delaford
a fun medieval 2d javascript rpg
https://delaford.com
***************************************** */

// Webpack aliases
const moduleAlias = require('module-alias');

// Start Express
const path = require('path');
const secure = require('ssl-express-www');
const http = require('http');
const compression = require('compression');
const express = require('express');

const onProduction = process.env.NODE_ENV === 'production'; // Accommodate process.env and eqeqeq eslint rule
const serverFolder = onProduction ? 'build' : 'server';
moduleAlias.addAlias('@server', `${__dirname}/${serverFolder}`);
moduleAlias.addAlias('shared', `${__dirname}/${serverFolder}/shared`);
moduleAlias.addAlias('root', `${__dirname}/${serverFolder}`);
// eslint-disable-next-line
const world = require(`./${serverFolder}/core/world`);
// eslint-disable-next-line
const nameValidationService = require(`./${serverFolder}/core/services/name-validation`);

const port = process.env.PORT || 6500;
const env = process.env.NODE_ENV || 'production';
const app = express();

if (onProduction) {
  app.use(secure);
}

// Compress Express server bytes
app.use(compression());

app.use(express.json({ limit: '32kb' }));

// Start Express and use the correct env.
app.use(express.static(path.join(__dirname, '/dist')));

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

// Actual game server
console.log(`ENVIRONMENT: ${env} and PORT ${port}`);
// eslint-disable-next-line
const Delaford = require(`./${serverFolder}/Delaford`);

// Create server for websocket to listen on
const server = http.createServer(app);
server.listen(port);

// Initialize the Game class with port number
const game = new Delaford(server);

// Live update of world items and players
// TODO Allow only on localhost.
// Make dynamic
app.get('/world/items', (req, res) => res.send(world.items));
app.get('/world/players', (req, res) => res.send(world.players));
app.get('/world/respawns', (req, res) => res.send(world.respawns));
app.get('/world/shops', (req, res) => res.send(world.shops));
/** ************************************** */

// Start the game server.
game.start();
