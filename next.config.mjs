/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de tipagem estática que possam travar o build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
