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
  async redirects() {
    return [
      ["/standalone", "/"],
      ["/standalone/propiedades/:path*", "/propiedades/:path*"],
      ["/standalone/admin/operaciones", "/admin/operaciones"],
      ["/admin/standalone", "/admin"],
      ["/admin/standalone/agenda", "/admin/agenda"],
      ["/admin/standalone/agentes/:id", "/admin/clientes-agentes/agentes/:id"],
      ["/admin/standalone/cierres/:path*", "/admin/cierres/:path*"],
      ["/admin/standalone/notificaciones", "/admin/notificaciones"],
      ["/admin/standalone/prospectos", "/admin/leads"],
      ["/admin/standalone/reportes", "/admin/reportes"],
      ["/admin/standalone/sistema", "/admin/sistema"]
    ].map(([source, destination]) => ({source, destination, permanent: false}));
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
