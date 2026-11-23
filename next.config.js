/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_API_URL || 'https://api.shravaniagro.store/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
