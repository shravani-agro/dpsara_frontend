/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/api/:path*',
        destination: 'http://162.0.214.158:8080/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
