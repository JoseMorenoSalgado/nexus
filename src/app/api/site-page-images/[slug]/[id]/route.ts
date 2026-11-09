import {NextRequest,NextResponse} from "next/server";
import {isStandaloneMode} from "@/lib/installation-mode";
import {publicPageHostname} from "@/lib/public-request-origin";
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
 const siteId=isStandaloneMode()?(publicPageHostname(req.headers)?"main":null):
  (await tenantFromHost(req.headers.get("host")||""))?.tenantId;
 if(!siteId)return new NextResponse(null,{status:404});
 let sections;
 if(isBuiltinPageSlug(slug)){
  if(!await builtinPagePublic(siteId,slug))return new NextResponse(null,{status:404});
  sections=await readExtraSections(siteId,slug);
 }else{
  const page=await getCustomPage(siteId,slug);
  if(!page||!page.published)return new NextResponse(null,{status:404});
  const raw=page.blocks&&typeof page.blocks==="object"&&!Array.isArray(page.blocks)?page.blocks as Record<string,unknown>:{};
  sections=normalizePageSections(raw.sections);
 }
 if(!sections.some(section=>section.type==="image"&&section.imageId===id))return new NextResponse(null,{status:404});
 const bytes=await readPageImage(siteId,slug,id);
 if(!bytes)return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(bytes),{headers:{
  "Content-Type":"image/webp","X-Content-Type-Options":"nosniff",
  "Cache-Control":"private, no-store","Cross-Origin-Resource-Policy":"same-origin"
 }});
}
