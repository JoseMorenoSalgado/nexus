import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Standalone CRM lead inbox. Legacy installations must use their existing routes. */
export async function GET(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return NextResponse.json({error:"No disponible"},{status:404});
 const admin=await currentAdmin();
 if(!admin)return NextResponse.json({error:"No autorizado"},{status:401});
 const allowed=admin.roles.includes("admin")||admin.roles.includes("agente");
 if(!allowed)return NextResponse.json({error:"Sin permisos"},{status:403});
 const raw=Number(req.nextUrl.searchParams.get("page")||"1");
 const page=Number.isSafeInteger(raw)&&raw>=1&&raw<=10000?raw:1;
 const where=admin.roles.includes("admin")?{}:{assignedAgentId:admin.userId};
 const db=getStandalonePrisma();
 const [total,leads]=await Promise.all([
  db.lead.count({where}),
  db.lead.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:25,
   select:{id:true,name:true,phone:true,email:true,message:true,source:true,createdAt:true,assignedAgentId:true,
    property:{select:{id:true,title:true,refCode:true}},
    crm:true}})
 ]);
 return NextResponse.json({leads,total,page,pageSize:25},{headers:{"Cache-Control":"private, no-store"}});
}
