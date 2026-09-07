/** @type {import('next').NextConfig} */
const isNetlify = typeof process.env.NETLIFY !== 'undefined';

const nextConfig = {
  output: 'export',
  async rewrites() {
    if (isNetlify) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;