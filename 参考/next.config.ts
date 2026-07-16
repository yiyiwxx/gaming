import type { NextConfig } from "next";

const basePathValue = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
const basePath = basePathValue ? `/${basePathValue}` : "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
