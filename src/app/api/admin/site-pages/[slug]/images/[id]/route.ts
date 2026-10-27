import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {getCustomPage} from "@/lib/site-pages";
import {isBuiltinPageSlug,builtinPageAvailable} from "@/lib/page-extras";
import {validCustomSlug} from "@/lib/page-slug";
import {pageImageId} from "@/lib/page-sections";
import {readPageImage} from "@/lib/page-images";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_req:NextRequest,{params}:{params:Promise<{slug:string;id:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))return new NextResponse(null,{status:403});
 const {slug,id}=await params;
 if(!validCustomSlug(slug)||!pageImageId.test(id))return new NextResponse(null,{status:404});
 const exists=isBuiltinPageSlug(slug)?await builtinPageAvailable(admin.tenantId,slug):Boolean(await getCustomPage(admin.tenantId,slug));
 if(!exists)return new NextResponse(null,{status:404});
 const bytes=await readPageImage(admin.tenantId,slug,id);
 if(!bytes)return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(bytes),{headers:{
  "Content-Type":"image/webp","X-Content-Type-Options":"nosniff",
  "Cache-Control":"private, no-store","Cross-Origin-Resource-Policy":"same-origin"
 }});
}
