module.exports = {
  apps: [{
    name: 'server',
    script: './server/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
      SITE_URL: 'https://delaford.com',
    },
  }],
};
