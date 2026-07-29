import type {
  NextConfig,
} from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.235",
    "192.168.1.128",
  ],
};

export default nextConfig;