import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
  transpilePackages: ['@bace/shared'],
  serverExternalPackages: ["exceljs", "archiver", "glob"],
  reactStrictMode: true,
};

export default nextConfig;
