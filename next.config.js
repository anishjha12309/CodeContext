import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["groq-sdk"],
  experimental: {
    optimizeCss: true,
  },
};

export default config;
