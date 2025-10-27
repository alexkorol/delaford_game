import axios from 'axios';
import { randomUUID } from 'crypto';
import identityRegistry from './identity-registry.js';

const DEFAULT_CACHE_TTL = Number(process.env.NAME_VALIDATION_CACHE_TTL || 1000 * 60 * 15);
const MAX_NAME_LENGTH = Number(process.env.NAME_VALIDATION_MAX_LENGTH || 24);
const MIN_NAME_LENGTH = Number(process.env.NAME_VALIDATION_MIN_LENGTH || 3);
const PROVIDER = process.env.NAME_VALIDATION_PROVIDER || 'local';
const REMOTE_ENDPOINT = process.env.NAME_VALIDATION_ENDPOINT || '';
const REMOTE_API_KEY = process.env.NAME_VALIDATION_API_KEY || '';

const BANNED_PATTERNS = [
  /\badmin\b/i,
  /\bmoderator\b/i,
  /\bgm\b/i,
  /[^a-z\s\-']/i,
  /(.)\1{3,}/i,
  /\b(?:fuck|shit|bitch|cunt|asshole|nigg|rape)\b/i,
];

const sanitizeWhitespace = (value) => value
  .replace(/\s+/g, ' ')
  .trim();

class NameValidationService {
  constructor() {
    this.cache = new Map();
    this.jobs = new Map();
    this.queue = [];
    this.processing = false;
  }

  normalizeName(name) {
    if (!name) {
      return '';
    }

    const trimmed = sanitizeWhitespace(String(name));
    const normalized = trimmed
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    return normalized;
  }

  getCacheEntry(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  setCacheEntry(key, result) {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL,
    });
  }

  createJob({ name, accountId }) {
    const normalizedName = this.normalizeName(name);
    const cacheKey = normalizedName.toLowerCase();
    const cached = this.getCacheEntry(cacheKey);
    const jobId = randomUUID();
    const requestedAt = new Date().toISOString();

    if (cached) {
      const job = {
        id: jobId,
        status: 'complete',
        name: normalizedName,
        accountId,
        requestedAt,
        completedAt: new Date().toISOString(),
        result: cached,
      };

      this.jobs.set(jobId, job);
      if (accountId) {
        identityRegistry.recordValidation(accountId, {
          jobId,
          requestedAt,
          completedAt: job.completedAt,
          rawName: name,
          normalizedName,
          valid: cached.valid,
          reason: cached.reason,
          confidence: cached.confidence,
          provider: cached.provider,
          metadata: cached.metadata,
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('[name-validation] Failed to persist cached identity binding.', error);
        });
      }
      return job;
    }

    const job = {
      id: jobId,
      status: 'pending',
      name: normalizedName,
      rawName: name,
      accountId,
      requestedAt,
      completedAt: null,
      result: null,
      error: null,
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    this.pumpQueue();

    return job;
  }

  async pumpQueue() {
    if (this.processing) {
      return;
    }

    const nextId = this.queue.shift();
    if (!nextId) {
      return;
    }

    const job = this.jobs.get(nextId);
    if (!job || job.status !== 'pending') {
      setImmediate(() => this.pumpQueue());
      return;
    }

    this.processing = true;

    try {
      const result = await this.invokeProvider(job.rawName, job.name, job.accountId);
      job.result = result;
      job.completedAt = new Date().toISOString();
      job.status = 'complete';

      this.setCacheEntry(job.name.toLowerCase(), result);

      if (job.accountId) {
        await identityRegistry.recordValidation(job.accountId, {
          jobId: job.id,
          requestedAt: job.requestedAt,
          completedAt: job.completedAt,
          rawName: job.rawName,
          normalizedName: job.name,
          valid: result.valid,
          reason: result.reason,
          confidence: result.confidence,
          provider: result.provider,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      job.status = 'error';
      job.error = this.serializeError(error);
    } finally {
      this.processing = false;
      setImmediate(() => this.pumpQueue());
    }
  }

  serializeError(error) {
    if (!error) {
      return { message: 'Unknown error' };
    }

    if (error.response && error.response.data) {
      return {
        message: error.response.data.message || 'Validation provider error',
        status: error.response.status,
        data: error.response.data,
      };
    }

    return { message: error.message || String(error) };
  }

  async invokeProvider(rawName, normalizedName, accountId) {
    const baseResult = {
      rawName,
      normalizedName,
      accountId,
      provider: PROVIDER,
    };

    if (PROVIDER === 'http' && REMOTE_ENDPOINT) {
      const response = await axios.post(REMOTE_ENDPOINT, {
        name: rawName,
        normalizedName,
        accountId,
      }, {
        headers: REMOTE_API_KEY ? { Authorization: `Bearer ${REMOTE_API_KEY}` } : undefined,
      });

      return {
        ...baseResult,
        ...response.data,
      };
    }

    // Local heuristic fallback
    const result = this.evaluateLocally(rawName, normalizedName);
    return { ...baseResult, ...result };
  }

  evaluateLocally(rawName, normalizedName) {
    if (!rawName || sanitizeWhitespace(rawName).length === 0) {
      return {
        valid: false,
        reason: 'Name is required.',
        confidence: 0.2,
      };
    }

    if (normalizedName.length < MIN_NAME_LENGTH) {
      return {
        valid: false,
        reason: `Name must be at least ${MIN_NAME_LENGTH} characters long.`,
        confidence: 0.4,
      };
    }

    if (normalizedName.length > MAX_NAME_LENGTH) {
      return {
        valid: false,
        reason: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
        confidence: 0.4,
      };
    }

    for (let i = 0; i < BANNED_PATTERNS.length; i += 1) {
      if (BANNED_PATTERNS[i].test(normalizedName)) {
        return {
          valid: false,
          reason: 'Name violates role-play naming rules.',
          confidence: 0.7,
        };
      }
    }

    if (!/^[A-Za-z][A-Za-z\-']*(?:\s[A-Za-z][A-Za-z\-']*)*$/.test(normalizedName)) {
      return {
        valid: false,
        reason: 'Name must use alphabetic characters and optional hyphens or apostrophes.',
        confidence: 0.6,
      };
    }

    const hasSurname = normalizedName.includes(' ');
    const confidence = hasSurname ? 0.8 : 0.6;

    return {
      valid: true,
      reason: 'Name accepted by heuristic validator.',
      confidence,
    };
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getAccountIdentity(accountId) {
    return identityRegistry.getAccount(accountId);
  }
}

const nameValidationService = new NameValidationService();

export default nameValidationService;
