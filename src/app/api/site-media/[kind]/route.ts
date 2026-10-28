import {NextRequest,NextResponse} from "next/server";
import {tenantFromHost} from "@/lib/tenant";
import {isSiteAssetKind,readSiteAsset} from "@/lib/site-assets";
import {builtinPagePublic} from "@/lib/page-extras";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest,{params}:{params:Promise<{kind:string}>}){
 const {kind}=await params;
 if(!isSiteAssetKind(kind))return new NextResponse(null,{status:404});
 const tenant=await tenantFromHost(req.headers.get("host")||"");
 if(!tenant)return new NextResponse(null,{status:404});
 const publishedSlug=kind==="about-photo"?"nosotros":kind.startsWith("hero-")?kind.slice(5):null;
 if(publishedSlug&&(!["propiedades","nosotros","servicios","contacto","asesoria-empresarial"].includes(publishedSlug)
    ||!await builtinPagePublic(tenant.tenantId,publishedSlug as "propiedades"|"nosotros"|"servicios"|"contacto"|"asesoria-empresarial")))
  return new NextResponse(null,{status:404});
 const bytes=await readSiteAsset(tenant.tenantId,kind);
 if(!bytes)return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(bytes),{headers:{
  "Content-Type":"image/webp","X-Content-Type-Options":"nosniff",
  "Cache-Control":"private, no-store","Cross-Origin-Resource-Policy":"same-origin"
 }});
}
