/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // This rewrite is only for local development
    if (process.env.NODE_ENV === 'production') return [];

    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
