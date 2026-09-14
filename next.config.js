/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["adminjs", "@adminjs/prisma", "@adminjs/nextjs"],
  },
};

module.exports = nextConfig;
