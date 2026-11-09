import { createHash } from "node:crypto";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      const defaultFilename = config.output.filename;
      config.output.filename = (pathData, assetInfo) => {
        const name = pathData.chunk?.name;
        // Enhance can return 403 for JS assets under literal route segments like [slug].
        // Keep Next's route names intact and let its manifests reference the emitted files.
        if (name?.startsWith("app/") && /[\[\]()@]/.test(name)) {
          const routeKey = createHash("sha256").update(name).digest("hex").slice(0, 16);
          return `static/chunks/route-${routeKey}-[contenthash].js`;
        }
        return typeof defaultFilename === "function" ? defaultFilename(pathData, assetInfo) : defaultFilename;
      };
    }
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
    {source:"/admin/:path*",headers:[
      {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
      {key:"Cache-Control",value:"private, no-store, max-age=0"}
    ]},
    {source:"/api/admin/:path*",headers:[
      {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
      {key:"Cache-Control",value:"private, no-store, max-age=0"}
    ]},
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
      ]
    }];
  }
};
export default nextConfig;
