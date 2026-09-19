/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["telegraf", "@prisma/client"],
  },
};

export default nextConfig;
