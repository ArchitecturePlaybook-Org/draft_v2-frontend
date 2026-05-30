import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jspdf", "fflate"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: "http://localhost:8000/media/:path*",
      },
    ];
  },
};

export default nextConfig;
