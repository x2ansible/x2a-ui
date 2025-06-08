import type { NextConfig } from "next";

// Get backend URL from environment variables
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

console.log(`[next.config.ts] Backend URL: ${backendUrl}`);
console.log(`[next.config.ts] Environment: ${process.env.NODE_ENV}`);

const nextConfig: NextConfig = {
  // Use Next.js server mode for full functionality
  images: {
    unoptimized: false,
    domains: ['localhost', '127.0.0.1'], // Add your OpenShift domain here when deploying
  },
  
  // Environment variables are automatically loaded from .env.local
  // No need to explicitly define them here since they're already NEXT_PUBLIC_*
  
  // API rewrites to your backend
  async rewrites() {
    console.log(`[next.config.ts] Setting up API rewrites to: ${backendUrl}`);
    
    return [
      // File operations
      {
        source: '/api/files/:path*',
        destination: `${backendUrl}/api/files/:path*`,
      },
      
      // Agent endpoints
      {
        source: '/api/chef/:path*',
        destination: `${backendUrl}/api/chef/:path*`,
      },
      {
        source: '/api/validate/:path*',
        destination: `${backendUrl}/api/validate/:path*`,
      },
      {
        source: '/api/context/:path*',
        destination: `${backendUrl}/api/context/:path*`,
      },
      {
        source: '/api/generate/:path*',
        destination: `${backendUrl}/api/generate/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/api/admin/:path*`,
      },
      {
        source: '/api/vector-db/:path*',
        destination: `${backendUrl}/api/vector-db/:path*`,
      },
      
      // Keep /api/auth/* for NextAuth - don't proxy these
    ];
  },
  
  // Build configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;