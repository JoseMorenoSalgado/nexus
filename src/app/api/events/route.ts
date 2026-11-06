import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {validPublicMutationOrigin} from "@/lib/public-request-origin";
import {publicInstallationTenant} from "@/lib/public-installation";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
export async function POST(req:NextRequest){
 if(!hasDatabaseConfig())return NextResponse.json({ok:false},{status:503});
 if(req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({ok:false},{status:403});
 if(!validPublicMutationOrigin(req.headers))return NextResponse.json({ok:false},{status:403});
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,1024);}
 catch(error){return NextResponse.json({ok:false},{status:error instanceof RequestPayloadError?error.status:400});}
 if(body.kind!=="view"&&body.kind!=="whatsapp")return NextResponse.json({ok:false},{status:400});
 const path=String(body.path||"/").slice(0,300);
 if(!path.startsWith("/")||path.startsWith("//"))return NextResponse.json({ok:false},{status:400});
 const tenant=await publicInstallationTenant();if(!tenant)return NextResponse.json({ok:false},{status:404});
 await prisma.visitEvent.create({data:{tenantId:tenant.tenantId,kind:body.kind,path}});
 return NextResponse.json({ok:true},{status:201});
}
