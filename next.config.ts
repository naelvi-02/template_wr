import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@imgly/background-removal-node", "onnxruntime-node"],
};

export default nextConfig;
