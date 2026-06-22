import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Security: Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              // Get API URL without /api suffix for CSP
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
              const apiBaseUrl = apiUrl.replace(/\/api\/?$/, '');
              // In production, only allow the production API URL; in dev, allow localhost for hot reload
              const connectSrc = process.env.NODE_ENV === 'production' 
                ? `'self' ${apiBaseUrl}` 
                : `'self' ${apiBaseUrl} http://localhost:3001 https://localhost:3001`;
              return `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src ${connectSrc};`;
            })()
          }
        ],
      },
    ];
  },
};

export default nextConfig;
