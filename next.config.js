/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/api/:path*',
        destination: 'https://backend.dpsara777.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
