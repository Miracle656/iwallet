import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. Without this, Turbopack walks up
  // and picks the stray /mnt/c/Users/HP/package-lock.json as the root, which
  // breaks module/asset resolution.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
