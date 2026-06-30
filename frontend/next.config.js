/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    async rewrites() {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:3010';
          return [
            {
                      source: '/proxy-api/:path*',
                      destination: `${backendUrl}/api/:path*`,
            },
                ];
    },
    async headers() {
          return [
            {
                      source: "/(.*)",
                      headers: [
                        { key: "Service-Worker-Allowed", value: "/" },
                                ],
            },
                ];
    },
};

module.exports = nextConfig;
