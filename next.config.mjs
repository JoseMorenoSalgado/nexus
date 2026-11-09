/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
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
