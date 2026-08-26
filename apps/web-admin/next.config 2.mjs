/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // GitHub Pages yayını: statik dışa aktarım + depo alt yolu (yerel dev'i etkilemez)
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  images: { unoptimized: true },
};
export default nextConfig;
