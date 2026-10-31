/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Development only: let phones on the same Wi-Fi open the dev server
  // or a temporary Cloudflare tunnel (e.g. to test scanning stickers).
  allowedDevOrigins: ["100.64.0.248", "*.trycloudflare.com"],
}

export default nextConfig
