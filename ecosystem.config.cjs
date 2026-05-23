/** PM2 — production : pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "unifresh",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      listen_timeout: 8000,
      kill_timeout: 10000,
    },
  ],
};
