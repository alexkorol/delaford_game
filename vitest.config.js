import { createRequire } from 'module';
import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

const require = createRequire(import.meta.url);

const resolveEnvironment = () => {
  if (process.env.VITEST_ENV) {
    return process.env.VITEST_ENV;
  }

  try {
    require.resolve('jsdom');
    return 'jsdom';
  } catch (error) {
    return 'node';
  }
};

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: resolveEnvironment(),
    include: ['tests/unit/**/*.spec.js'],
    exclude: ['tests/e2e/**'],
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
}));
