/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@prisma/client");
    }
    return config;
  },

  outputFileTracingIncludes: {
    "/api/**/*": ["./generated/prisma/**/*"],
    "/**/*": ["./generated/prisma/**/*"],
  },
};

export default config;
