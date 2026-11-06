import type {Metadata,Viewport} from "next";
import {hasDatabaseConfig} from "@/lib/server-config";
import {publicInstallationTenant} from "@/lib/public-installation";
import "./globals.css";
import "./styles/legacy/admin-shell.css";
import "./styles/templates/nexus-public.css";
import "./styles/templates/nexus-property.css";
import "./styles/legacy/agent-admin.css";
import "./styles/templates/nexus-property-cover.css";
import "./home-tidy.css";
import "./page-content.css";
import "./cms-extras.css";
import "./mobile-native.css";
import "./styles/templates/nexus-classic-polish.css";
import "./styles/templates/nexus-home-motion.css";
import "./styles/templates/nexus-inner-motion.css";
import "./styles/templates/nexus-advisory.css";

export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#ffffff"};

/** Metadata and public pages share the dashboard's standalone organization. */
export async function generateMetadata():Promise<Metadata>{
 const fallback:Metadata={title:{default:"NEXUS Inmobiliaria",template:"%s | NEXUS"},description:"Catálogo inmobiliario, propiedades en venta y alquiler."};
 if(!hasDatabaseConfig())return fallback;
 const match=await publicInstallationTenant();
 if(!match)return fallback;
 const name=match.tenant.name;
 return {
  title:{default:name+(match.tenant.tagline?" | "+match.tenant.tagline:""),template:"%s | "+name},
  description:match.tenant.tagline||"Sitio oficial de "+name+"."
 };
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}
