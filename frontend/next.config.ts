import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "yehagerbahillibs.com",
          },
        ],
        destination: "https://www.yehagerbahillibs.com/:path*",
        permanent: true,
      },
      {
        source: "/islamic",
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/all-collections",
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/collections",
        destination: "/catalog",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
