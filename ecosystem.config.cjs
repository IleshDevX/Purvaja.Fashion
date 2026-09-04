module.exports = {
  apps: [
    {
      name: 'purvaja-api',
      script: 'backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '127.0.0.1',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '127.0.0.1',
      },
    },
  ],
};
