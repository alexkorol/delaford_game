import { vi } from 'vitest';

export const axiosPostMock = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('axios', () => ({
  default: {
    post: axiosPostMock,
  },
  post: axiosPostMock,
}));
