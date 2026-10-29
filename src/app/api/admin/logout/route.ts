import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {validMutationOrigin} from "@/lib/admin-property-request";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const sessionCookie="webappecloud_session";

/** Stable HTML POST instead of a build-specific Next Server Action. */
export async function POST(req:NextRequest){
 if(!validMutationOrigin(req))return new NextResponse("Origen no autorizado",{status:403,headers:{"Cache-Control":"no-store"}});
 const token=req.cookies.get(sessionCookie)?.value;
 // Clear the browser cookie even when SQL is temporarily unavailable.
 const response=new NextResponse(null,{status:303,headers:{
  Location:"/admin/acceso", "Cache-Control":"no-store"
 }});
 response.cookies.set(sessionCookie,"",{path:"/",maxAge:0,expires:new Date(0),
  httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 if(token&&/^[a-f0-9]{64}$/.test(token)){
  try{
   await prisma.adminSession.deleteMany({where:{
    tokenHash:createHash("sha256").update(token).digest("hex")
   }});
  }catch(error){
   console.error("[admin-logout] session revocation failed",error instanceof Error?error.name:"unknown");
  }
 }
 return response;
}
