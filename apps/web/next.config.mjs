import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
  transpilePackages: ['@bace/shared'],
  serverExternalPackages: ["exceljs", "archiver", "glob"],
  reactStrictMode: true,

  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;