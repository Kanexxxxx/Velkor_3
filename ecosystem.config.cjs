module.exports = {
  apps: [
    {
      name: 'velkor-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      max_memory_restart: '512M',
      time: true,
    },
    {
      name: 'velkor-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      max_memory_restart: '768M',
      time: true,
    },
  ],
};
