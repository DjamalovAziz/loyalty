/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["adminjs", "@adminjs/prisma"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        preact: require.resolve("preact"),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
