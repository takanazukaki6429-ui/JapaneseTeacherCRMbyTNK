import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const content = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default content(nextConfig);
