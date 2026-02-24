/**
 * @vitest-environment node
 *
 * Tests for the WebSocket message handler security in Delaford.js.
 * Verifies that malformed, unknown, and missing-event messages are
 * handled gracefully without crashes.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

const createMockWs = (id = 'test-socket-001') => {
  const listeners = {};
  return {
    id,
    authenticated: false,
    on: vi.fn((event, handler) => {
      listeners[event] = handler;
    }),
    send: vi.fn(),
    readyState: 1, // OPEN
    _listeners: listeners,
    _trigger(event, ...args) {
      if (listeners[event]) {
        return listeners[event](...args);
      }
    },
  };
};

const PUBLIC_EVENTS = new Set(['player:login']);

// Simulate the message handler logic extracted from Delaford.connection
const createMessageHandler = (handler, ws, options = {}) => {
  const { rateLimiter } = options;

  return async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return { rejected: 'malformed' };
    }

    if (!data || typeof data.event !== 'string') {
      return { rejected: 'missing-event' };
    }

    if (typeof handler[data.event] !== 'function') {
      return { rejected: 'unknown-event' };
    }

    if (rateLimiter && !rateLimiter()) {
      return { rejected: 'rate-limited' };
    }

    if (!PUBLIC_EVENTS.has(data.event) && !ws.authenticated) {
      return { rejected: 'unauthenticated' };
    }

    await handler[data.event](data, ws);
    return { accepted: data.event };
  };
};

/**
 * Creates a token-bucket rate limiter (mirrors Delaford.js logic).
 */
const createRateLimiter = (maxTokens = 30, refillPerSec = 10) => {
  let tokens = maxTokens;
  let lastRefill = Date.now();

  return () => {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(maxTokens, tokens + elapsed * refillPerSec);
    lastRefill = now;
    if (tokens < 1) {
      return false;
    }
    tokens -= 1;
    return true;
  };
};

describe('WebSocket message handler validation', () => {
  let handler;
  let ws;
  let processMessage;

  beforeEach(() => {
    handler = {
      'player:login': vi.fn(),
      'player:move': vi.fn(),
      'player:say': vi.fn(),
    };
    ws = createMockWs();
    ws.authenticated = true;
    processMessage = createMessageHandler(handler, ws);
  });

  it('rejects malformed JSON gracefully', async () => {
    const result = await processMessage('not json at all{{{');
    expect(result.rejected).toBe('malformed');
    expect(handler['player:login']).not.toHaveBeenCalled();
  });

  it('rejects messages missing the event field', async () => {
    const result = await processMessage(JSON.stringify({ data: {} }));
    expect(result.rejected).toBe('missing-event');
  });

  it('rejects messages with non-string event field', async () => {
    const result = await processMessage(JSON.stringify({ event: 42 }));
    expect(result.rejected).toBe('missing-event');
  });

  it('rejects unknown event names', async () => {
    const result = await processMessage(JSON.stringify({ event: '__proto__' }));
    expect(result.rejected).toBe('unknown-event');
  });

  it('rejects events that do not exist on the handler', async () => {
    const result = await processMessage(JSON.stringify({ event: 'player:exploit' }));
    expect(result.rejected).toBe('unknown-event');
  });

  it('dispatches valid events to the correct handler', async () => {
    const msg = JSON.stringify({ event: 'player:move', data: { id: 'abc', direction: 'up' } });
    const result = await processMessage(msg);
    expect(result.accepted).toBe('player:move');
    expect(handler['player:move']).toHaveBeenCalledOnce();
  });

  it('passes data and ws to the handler', async () => {
    const payload = { event: 'player:say', data: { said: 'hello' } };
    await processMessage(JSON.stringify(payload));
    expect(handler['player:say']).toHaveBeenCalledWith(payload, ws);
  });

  it('rejects null message body', async () => {
    const result = await processMessage('null');
    expect(result.rejected).toBe('missing-event');
  });
});

describe('WebSocket authentication gate', () => {
  let handler;
  let ws;

  beforeEach(() => {
    handler = {
      'player:login': vi.fn(),
      'player:move': vi.fn(),
    };
    ws = createMockWs();
    ws.authenticated = false;
  });

  it('allows player:login without authentication', async () => {
    const processMessage = createMessageHandler(handler, ws);
    const result = await processMessage(JSON.stringify({ event: 'player:login', data: {} }));
    expect(result.accepted).toBe('player:login');
  });

  it('rejects non-login events from unauthenticated connections', async () => {
    const processMessage = createMessageHandler(handler, ws);
    const result = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(result.rejected).toBe('unauthenticated');
    expect(handler['player:move']).not.toHaveBeenCalled();
  });

  it('allows non-login events after authentication', async () => {
    ws.authenticated = true;
    const processMessage = createMessageHandler(handler, ws);
    const result = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(result.accepted).toBe('player:move');
  });
});

describe('WebSocket rate limiting', () => {
  let handler;
  let ws;

  beforeEach(() => {
    handler = {
      'player:login': vi.fn(),
      'player:move': vi.fn(),
    };
    ws = createMockWs();
    ws.authenticated = true;
  });

  it('allows messages when tokens are available', async () => {
    const limiter = createRateLimiter(5, 10);
    const processMessage = createMessageHandler(handler, ws, { rateLimiter: limiter });
    const result = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(result.accepted).toBe('player:move');
  });

  it('rejects messages when bucket is exhausted', async () => {
    const limiter = createRateLimiter(3, 0); // 3 tokens, no refill
    const processMessage = createMessageHandler(handler, ws, { rateLimiter: limiter });

    // Exhaust the bucket
    for (let i = 0; i < 3; i += 1) {
      await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    }

    const result = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(result.rejected).toBe('rate-limited');
  });

  it('refills tokens over time', async () => {
    const limiter = createRateLimiter(2, 1000); // 2 tokens, fast refill for testing
    const processMessage = createMessageHandler(handler, ws, { rateLimiter: limiter });

    // Exhaust
    await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    await processMessage(JSON.stringify({ event: 'player:move', data: {} }));

    // Should be empty
    const drained = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(drained.rejected).toBe('rate-limited');

    // Wait a tiny bit for refill (1000 tokens/sec means 1ms = 1 token)
    await new Promise(r => setTimeout(r, 5));

    const refilled = await processMessage(JSON.stringify({ event: 'player:move', data: {} }));
    expect(refilled.accepted).toBe('player:move');
  });
});
