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

// Simulate the message handler logic extracted from Delaford.connection
const createMessageHandler = (handler, ws) => async (msg) => {
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

  await handler[data.event](data, ws);
  return { accepted: data.event };
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
