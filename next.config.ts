import type { NextConfig } from "next";

// Main backend URL (default: 8000)
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

console.log(`[next.config.ts] Backend URL: ${backendUrl}`);
console.log(`[next.config.ts] Environment: ${process.env.NODE_ENV}`);

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    domains: ['localhost', '127.0.0.1'], // Add your OpenShift domain here
  },
  async rewrites() {
    console.log(`[next.config.ts] Setting up API rewrites:`);
    return [
      // File operations (main backend)
      {
        source: '/api/files/:path*',
        destination: `${backendUrl}/api/files/:path*`,
      },
      // Chef agent (main backend)
      {
        source: '/api/chef/:path*',
        destination: `${backendUrl}/api/chef/:path*`,
      },
      // Validate agent (main backend)
      {
        source: '/api/validate/:path*',
        destination: `${backendUrl}/api/validate/:path*`,
      },
      // Context agent (main backend)
      {
        source: '/api/context/:path*',
        destination: `${backendUrl}/api/context/:path*`,
      },
      // Generate agent (main backend)
      {
        source: '/api/generate/:path*',
        destination: `${backendUrl}/api/generate/:path*`,
      },
      // Admin (main backend)
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/api/admin/:path*`,
      },
      // Vector DB (main backend)
      {
        source: '/api/vector-db/:path*',
        destination: `${backendUrl}/api/vector-db/:path*`,
      },
      // (leave /api/auth/* alone for NextAuth or authentication services)
    ];
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during all builds
  },
};

export default nextConfig;
