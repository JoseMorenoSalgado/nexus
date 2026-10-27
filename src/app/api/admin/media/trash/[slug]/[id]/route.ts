import {readFile} from "node:fs/promises";
import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {getPageDefinitions} from "@/lib/site-pages";
import {pageImageId} from "@/lib/page-sections";
import {trashedMediaPath} from "@/lib/media-library";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string;id:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return new NextResponse(null,{status:403});
 const {slug,id}=await params;
 if(!pageImageId.test(id))return new NextResponse(null,{status:404});
 const pages=await getPageDefinitions(admin.tenantId);
 if(!pages.some(p=>p.slug===slug))return new NextResponse(null,{status:404});
 let data:Buffer;
 try{data=await readFile(trashedMediaPath(admin.tenantId,slug,id));}
 catch{return new NextResponse(null,{status:404});}
 return new NextResponse(new Uint8Array(data),{headers:{
  "Content-Type":"image/webp","Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff","Cross-Origin-Resource-Policy":"same-origin"
 }});
}
