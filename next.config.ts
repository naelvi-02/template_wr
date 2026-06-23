import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "super-rahasia-wahyu-redjo-2026",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://wr.naelvi.com"
  }
};

export default nextConfig;
