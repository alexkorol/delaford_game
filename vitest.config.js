import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    exclude: ['node_modules/**', 'tests/e2e/**', 'dist/**', 'build/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
}));
