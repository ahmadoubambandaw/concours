/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // En développement, proxifie l'API pour éviter les soucis CORS.
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [{ source: '/api/backend/:path*', destination: `${api}/api/v1/:path*` }];
  },
};

export default nextConfig;
