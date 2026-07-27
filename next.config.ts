import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const backendUrlStr = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const mediaUrlStr = process.env.NEXT_PUBLIC_MEDIA_URL || backendUrlStr;

let backendUrl: URL;
try {
  backendUrl = new URL(backendUrlStr);
} catch {
  backendUrl = new URL("http://127.0.0.1:8000");
}

let mediaUrl: URL;
try {
  mediaUrl = new URL(mediaUrlStr);
} catch {
  mediaUrl = new URL("http://127.0.0.1:8000");
}

// Derive WS/WSS protocol matching the API protocol
const wsProtocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
const wsUrlStr = `${wsProtocol}//${backendUrl.host}`;

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' blob: data: https: ${backendUrl.origin} ${mediaUrl.origin} http://localhost:8000 http://127.0.0.1:8000 https://*.s3.amazonaws.com https://*.s3.*.amazonaws.com https://*.amazonaws.com https://s3.amazonaws.com`,
  `media-src 'self' blob: data: https: ${backendUrl.origin} ${mediaUrl.origin} http://localhost:8000 http://127.0.0.1:8000 https://*.s3.amazonaws.com https://*.s3.*.amazonaws.com https://*.amazonaws.com https://s3.amazonaws.com`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https: ${backendUrl.origin} ${wsUrlStr} ws://localhost:8000 ws://127.0.0.1:8000 blob: data: https://www.gstatic.com https://*.s3.amazonaws.com https://*.s3.*.amazonaws.com https://*.amazonaws.com https://s3.amazonaws.com`,
  "frame-src 'self' blob: data: http://localhost:8000 http://127.0.0.1:8000 https:",
  "object-src 'self' blob: data: http://localhost:8000 http://127.0.0.1:8000 https:",
  "worker-src 'self' blob:"
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["jspdf", "fflate"],
  images: {
    remotePatterns: [
      {
        protocol: mediaUrl.protocol.replace(":", "") as any,
        hostname: mediaUrl.hostname,
        port: mediaUrl.port || undefined,
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
      },
    ],
  },
  async rewrites() {
    const destination = `${backendUrlStr.endsWith("/") ? backendUrlStr : backendUrlStr + "/" }media/:path*`;
    return [
      {
        source: "/media/:path*",
        destination: destination,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      }
    ];
  },
};

const wrappedConfig = process.env.ANALYZE === "true"
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig;

export default wrappedConfig;
