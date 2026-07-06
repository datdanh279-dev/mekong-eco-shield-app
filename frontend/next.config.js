/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  swcMinify: true,
  compress: true,
  generateEtags: false,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
