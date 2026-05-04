/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
          }/api/:path*`,
      },
    ];
  },
  images: {
    unoptimized: process.env.NEXT_PUBLIC_IS_LOCAL === "true" || process.env.NEXT_PUBLIC_IS_LOCAL === "1",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
    ],
  },
};

export default nextConfig;
