import {NextRequest,NextResponse} from "next/server";
import {tenantFromHost} from "@/lib/tenant";
import {getCustomPage} from "@/lib/site-pages";
import {isBuiltinPageSlug,builtinPagePublic,readExtraSections} from "@/lib/page-extras";
import {validCustomSlug} from "@/lib/page-slug";
import {normalizePageSections,pageImageId} from "@/lib/page-sections";
import {readPageImage} from "@/lib/page-images";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string;id:string}>}){
 const {slug,id}=await params;
 if(!validCustomSlug(slug)||!pageImageId.test(id))return new NextResponse(null,{status:404});
 const tenant=await tenantFromHost(req.headers.get("host")||"");
 if(!tenant)return new NextResponse(null,{status:404});
 let sections;
 if(isBuiltinPageSlug(slug)){
  if(!await builtinPagePublic(tenant.tenantId,slug))return new NextResponse(null,{status:404});
  sections=await readExtraSections(tenant.tenantId,slug);
 }else{
  const page=await getCustomPage(tenant.tenantId,slug);
  if(!page||!page.published)return new NextResponse(null,{status:404});
  const raw=page.blocks&&typeof page.blocks==="object"&&!Array.isArray(page.blocks)?page.blocks as Record<string,unknown>:{};
  sections=normalizePageSections(raw.sections);
 }
 if(!sections.some(section=>section.type==="image"&&section.imageId===id))return new NextResponse(null,{status:404});
 const bytes=await readPageImage(tenant.tenantId,slug,id);
 if(!bytes)return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(bytes),{headers:{
  "Content-Type":"image/webp","X-Content-Type-Options":"nosniff",
  "Cache-Control":"private, no-store","Cross-Origin-Resource-Policy":"same-origin"
 }});
}
