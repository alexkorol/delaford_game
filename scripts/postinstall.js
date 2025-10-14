const { spawnSync } = require('child_process');

const truthy = (value) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const shouldSkip = truthy(process.env.DELAFORD_SKIP_BUILD)
  || truthy(process.env.SKIP_POSTINSTALL)
  || (!truthy(process.env.CI)
    && !truthy(process.env.DELAFORD_RUN_BUILD)
    && !truthy(process.env.npm_config_production)
    && process.env.NODE_ENV !== 'production');

if (shouldSkip) {
  console.log(
    'Skipping Delaford postinstall build. Set DELAFORD_RUN_BUILD=1 (or run npm run build-server && npm run build) when you need production assets.',
  );
  process.exit(0);
}

const run = (script) => {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

run('build-server');
run('build');
