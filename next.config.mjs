/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-hosting on our VPS: emit a minimal server bundle (.next/standalone)
  // that the Docker runtime stage copies, instead of shipping node_modules.
  output: 'standalone',
  // Allow the app to be loaded through the cloudflared tunnel in dev
  // (so /_next assets + HMR work when you browse the https tunnel URL).
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
