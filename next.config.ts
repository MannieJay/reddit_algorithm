import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'reddit_algorithm'; // Update this if your repo name changes

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
