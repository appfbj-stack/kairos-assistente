/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    // Proxy /proxy-api/* para o backend com Basic Auth via headers injetados
    // Isso evita problemas de CORS ao chamar api.admin.fbautomacao.space de admin.fbautomacao.space
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:3010/api';
    const apiBase = apiUrl.replace('/api', '');
    return [
      {
        source: '/proxy-api/:path*',
        destination: `${apiBase}/api/:path*`,
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
