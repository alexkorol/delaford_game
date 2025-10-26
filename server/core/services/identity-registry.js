import fs from 'fs';
import path from 'path';

const DEFAULT_STORE_FILE = path.join(__dirname, '../../data/identity-store.json');

const clone = (value) => JSON.parse(JSON.stringify(value));

class IdentityRegistry {
  constructor() {
    this.storeFile = process.env.IDENTITY_STORE_FILE || DEFAULT_STORE_FILE;
    this.state = { accounts: {} };
    this.writeInFlight = null;
    this.writeQueued = false;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.accounts) {
          this.state = { accounts: parsed.accounts };
        }
      } else {
        this.persist().catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('[identity-registry] Failed to persist initial state.', error);
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[identity-registry] Failed to load state, starting empty.', error);
      this.state = { accounts: {} };
    }
  }

  ensureAccount(accountId) {
    if (!accountId) {
      return null;
    }

    const id = String(accountId);
    if (!this.state.accounts[id]) {
      this.state.accounts[id] = {
        accountId: id,
        history: [],
        boundIdentity: null,
      };
    }

    return this.state.accounts[id];
  }

  async persist() {
    const dir = path.dirname(this.storeFile);
    await fs.promises.mkdir(dir, { recursive: true });

    const payload = JSON.stringify({ accounts: this.state.accounts }, null, 2);

    if (this.writeInFlight) {
      this.writeQueued = true;
      await this.writeInFlight;
      this.writeQueued = false;
    }

    this.writeInFlight = fs.promises.writeFile(this.storeFile, payload, 'utf8');

    try {
      await this.writeInFlight;
    } finally {
      this.writeInFlight = null;
      if (this.writeQueued) {
        this.writeQueued = false;
        await this.persist();
      }
    }
  }

  async recordValidation(accountId, payload) {
    if (!accountId) {
      return null;
    }

    const account = this.ensureAccount(accountId);
    if (!account) {
      return null;
    }

    const entry = {
      jobId: payload.jobId || null,
      requestedAt: payload.requestedAt || new Date().toISOString(),
      completedAt: payload.completedAt || new Date().toISOString(),
      rawName: payload.rawName,
      normalizedName: payload.normalizedName,
      valid: Boolean(payload.valid),
      reason: payload.reason || null,
      confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
      provider: payload.provider || 'local',
      metadata: payload.metadata || null,
    };

    account.history.push(entry);

    if (entry.valid) {
      account.boundIdentity = {
        name: entry.normalizedName,
        boundAt: entry.completedAt,
        jobId: entry.jobId,
        confidence: entry.confidence,
        provider: entry.provider,
      };
    }

    await this.persist();
    return clone(account);
  }

  getAccount(accountId) {
    if (!accountId) {
      return null;
    }

    const id = String(accountId);
    const account = this.state.accounts[id];
    if (!account) {
      return null;
    }

    return clone(account);
  }
}

module.exports = new IdentityRegistry();
