/**
 * @vitest-environment node
 */
import { describe, expect, it, beforeEach } from 'vitest';

// The service is a singleton, so we import the class-bearing module indirectly.
// We re-create a fresh instance for each test to avoid shared state.
const serviceModule = await import('#server/core/services/name-validation.js');
const NameValidationServiceClass = serviceModule.default.constructor;

describe('NameValidationService', () => {
  let service;

  beforeEach(() => {
    service = new NameValidationServiceClass();
  });

  describe('normalizeName', () => {
    it('capitalises each word and lowercases the rest', () => {
      expect(service.normalizeName('john DOE')).toBe('John Doe');
    });

    it('collapses excessive whitespace', () => {
      expect(service.normalizeName('  jane    doe  ')).toBe('Jane Doe');
    });

    it('returns empty string for falsy input', () => {
      expect(service.normalizeName('')).toBe('');
      expect(service.normalizeName(null)).toBe('');
      expect(service.normalizeName(undefined)).toBe('');
    });
  });

  describe('evaluateLocally', () => {
    it('rejects empty names', () => {
      const result = service.evaluateLocally('', '');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('required');
    });

    it('rejects names shorter than minimum length', () => {
      const result = service.evaluateLocally('Ab', 'Ab');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('at least');
    });

    it('rejects names exceeding maximum length', () => {
      const longName = 'A'.repeat(30);
      const result = service.evaluateLocally(longName, longName);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('or fewer');
    });

    it('rejects names with banned patterns (reserved keywords)', () => {
      const result = service.evaluateLocally('Admin Lord', 'Admin Lord');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('naming rules');
    });

    it('rejects names with profanity', () => {
      const result = service.evaluateLocally('Fuck Knight', 'Fuck Knight');
      expect(result.valid).toBe(false);
    });

    it('rejects names with digits or special characters', () => {
      const result = service.evaluateLocally('Player123', 'Player123');
      expect(result.valid).toBe(false);
    });

    it('rejects names with repeated characters (4+)', () => {
      const result = service.evaluateLocally('Aaaargh', 'Aaaargh');
      expect(result.valid).toBe(false);
    });

    it('accepts valid single-word names with lower confidence', () => {
      const result = service.evaluateLocally('Aldric', 'Aldric');
      expect(result.valid).toBe(true);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('accepts valid two-word names with higher confidence', () => {
      const result = service.evaluateLocally('Aldric Stonehelm', 'Aldric Stonehelm');
      expect(result.valid).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('accepts names with hyphens and apostrophes', () => {
      const result = service.evaluateLocally("O'Brien", "O'Brien");
      expect(result.valid).toBe(true);
    });
  });

  describe('cache', () => {
    it('returns null for missing cache entries', () => {
      expect(service.getCacheEntry('nonexistent')).toBeNull();
    });

    it('stores and retrieves cache entries', () => {
      const result = { valid: true, reason: 'ok' };
      service.setCacheEntry('test', result);
      expect(service.getCacheEntry('test')).toEqual(result);
    });
  });

  describe('createJob', () => {
    it('returns a job with pending status for new names', () => {
      const job = service.createJob({ name: 'Aldric', accountId: null });
      expect(job.id).toBeTruthy();
      expect(job.name).toBe('Aldric');
      expect(job.requestedAt).toBeTruthy();
      expect(['pending', 'complete']).toContain(job.status);
    });

    it('returns complete status when result is cached', () => {
      // Pre-populate the cache
      const cached = { valid: true, reason: 'ok', confidence: 0.9 };
      service.setCacheEntry('aldric', cached);

      const job = service.createJob({ name: 'Aldric', accountId: null });
      expect(job.status).toBe('complete');
      expect(job.result).toEqual(cached);
    });
  });

  describe('getJob', () => {
    it('returns null for unknown job IDs', () => {
      expect(service.getJob('nonexistent-id')).toBeNull();
    });

    it('retrieves a previously created job', () => {
      const job = service.createJob({ name: 'Elowen', accountId: null });
      expect(service.getJob(job.id)).toBe(job);
    });
  });
});
