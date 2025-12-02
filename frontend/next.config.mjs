/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // In production, use your actual Backend URL env var.
        // Locally, fallback to localhost:8000
        destination: `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        }/api/:path*`,
      },
    ];
  },
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
