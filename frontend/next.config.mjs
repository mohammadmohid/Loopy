/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com", // Allow R2 domains
      },
    ],
  },
};

export default nextConfig;
