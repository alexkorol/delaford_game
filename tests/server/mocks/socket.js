import { vi } from 'vitest';

export const socketBroadcastMock = vi.fn();

vi.mock('#server/socket.js', () => ({
  default: {
    broadcast: socketBroadcastMock,
  },
}));
