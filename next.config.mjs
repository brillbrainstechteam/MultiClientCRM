/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the app to be loaded through the cloudflared tunnel in dev
  // (so /_next assets + HMR work when you browse the https tunnel URL).
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
