import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {tenantFromHost} from "@/lib/tenant";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
export async function POST(req:NextRequest){
 if(!hasDatabaseConfig())return NextResponse.json({ok:false},{status:503});
 const origin=req.headers.get("origin");
 if(origin){try{if(new URL(origin).host!==req.headers.get("host"))return NextResponse.json({ok:false},{status:403});}catch{return NextResponse.json({ok:false},{status:403});}}
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,1024);}
 catch(error){return NextResponse.json({ok:false},{status:error instanceof RequestPayloadError?error.status:400});}
 if(body.kind!=="view"&&body.kind!=="whatsapp")return NextResponse.json({ok:false},{status:400});
 const path=String(body.path||"/").slice(0,300);
 if(!path.startsWith("/")||path.startsWith("//"))return NextResponse.json({ok:false},{status:400});
 const tenant=await tenantFromHost(req.headers.get("host")||"");if(!tenant)return NextResponse.json({ok:false},{status:404});
 await prisma.visitEvent.create({data:{tenantId:tenant.tenantId,kind:body.kind,path}});
 return NextResponse.json({ok:true},{status:201});
}
