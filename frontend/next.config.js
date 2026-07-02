/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost', 'api.mekongeco.shield'],
  },
};

module.exports = nextConfig;
