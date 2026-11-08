import {NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")return NextResponse.json({error:"No disponible"},{status:404});
 const admin=await currentAdmin();
 if(!admin)return NextResponse.json({error:"No autorizado"},{status:401});
 const isAdmin=admin.roles.includes("admin")||admin.roles.includes("editor");
 if(!isAdmin&&!admin.roles.includes("agente"))return NextResponse.json({error:"Sin permisos"},{status:403});
 const {id}=await params;
 const db=getStandalonePrisma();
 const lead=await db.lead.findFirst({where:{id,...(!isAdmin?{assignedAgentId:admin.userId}:{})},select:{id:true}});
 if(!lead)return NextResponse.json({error:"Prospecto no encontrado"},{status:404});
 const [notes,assignments]=await Promise.all([
  db.leadNote.findMany({where:{leadId:id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:100,select:{id:true,authorName:true,body:true,createdAt:true}}),
  db.leadAssignmentHistory.findMany({where:{leadId:id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:100,select:{id:true,fromAgentName:true,toAgentName:true,changedByName:true,createdAt:true}})
 ]);
 return NextResponse.json({notes,assignments},{headers:{"Cache-Control":"private, no-store"}});
}
