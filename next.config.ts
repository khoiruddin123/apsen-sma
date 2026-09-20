import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.121',
    '192.168.56.1',
    'trycloudflare.com',
    '*.trycloudflare.com',
    'pac-others-highlight-builders.trycloudflare.com',
  ],
};

export default nextConfig;
