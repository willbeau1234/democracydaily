/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,     // Add this line
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig