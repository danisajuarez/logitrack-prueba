import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opciones válidas y seguras
  reactStrictMode: true,
  // Podés agregar otras opciones válidas como `appDir`, `images`, etc.

  // Marcar puppeteer como external para evitar warning en build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('puppeteer');
    }
    return config;
  },
};

export default nextConfig;
