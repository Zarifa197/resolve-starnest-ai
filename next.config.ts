import type { NextConfig } from 'next';
import path from 'node:path';
const nodeRuntime = path.resolve(process.cwd(), 'build/node-runtime.ts');
const vercel = process.env.RESOLVE_RUNTIME === 'vercel';
const nextConfig: NextConfig = {
  ...(vercel ? {distDir: ".next-vercel"} : {}),
  webpack(config) {
    if (vercel) config.resolve.alias = {...config.resolve.alias, '@resolve/runtime': nodeRuntime, 'cloudflare:workers': nodeRuntime};
    return config;
  },
  ...(vercel ? {turbopack: {resolveAlias: {'@resolve/runtime': './build/node-runtime.ts', 'cloudflare:workers': './build/node-runtime.ts'}}} : {}),
};
export default nextConfig;
