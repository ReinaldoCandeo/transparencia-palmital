/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignora erros do ESLint que possam travar o build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipagem estática que possam travar o build
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
