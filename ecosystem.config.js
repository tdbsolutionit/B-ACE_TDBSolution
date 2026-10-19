module.exports = {
  apps: [
    {
      name: 'bace-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      time: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'bace-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      time: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};