const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps', 'api', '.env') });

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
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES: process.env.JWT_EXPIRES,
        API_PORT: process.env.API_PORT,
        WEB_ORIGIN: process.env.WEB_ORIGIN,
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
        NEXT_PUBLIC_API_URL: 'http://192.168.103.8:3001',
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      time: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};