import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {leadWhere} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";
import {isCrmStatus} from "@/lib/crm-status";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";

export const runtime="nodejs";
function back(id:string,param:string){
 return propertyRedirect("/admin/leads/"+encodeURIComponent(id)+"?"+param);
}
function parseContactDate(raw:string){
 if(raw==="")return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error("DATE");
 const dt=new Date(raw+"T12:00:00.000Z");
 if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==raw)throw new Error("DATE");
 if(dt.getUTCFullYear()<2020||dt.getUTCFullYear()>2100)throw new Error("DATE");
 return dt;
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"inquiries"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.some(r=>["admin","editor","agente"].includes(r)))return back(id,"error=permisos");
 if(!validMutationOrigin(req))return back(id,"error=origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isFinite(length)||length>15000)return back(id,"error=datos");
 const lead=await prisma.lead.findFirst({where:{id,...leadWhere(admin)},select:{id:true}});
 if(!lead)return propertyRedirect("/admin/leads?error=noexiste");
 if(!await crmTablesReady())return propertyRedirect("/admin/leads?error=inactivo");
 let form:FormData;
 try{form=await req.formData();}catch{return back(id,"error=datos");}
 const intent=form.get("intent");
 if(intent==="assign"){
  if(!admin.roles.some(r=>r==="admin"||r==="editor"))return back(id,"error=permisos");
  const raw=form.get("assignedAgentId");
  if(typeof raw!=="string"||raw.length>100)return back(id,"error=agente");
  const next=raw?await prisma.adminUser.findFirst({
   where:{id:raw,tenantId:admin.tenantId,active:true},
   select:{id:true,name:true,role:true}
  }):null;
  if(raw&&(!next||!parseRoles(next.role).includes("agente")))return back(id,"error=agente");
  try{
   const changed=await prisma.$transaction(async tx=>{
    const current=await tx.lead.findFirst({where:{id,tenantId:admin.tenantId},
     select:{id:true,assignedAgentId:true,assignedAgent:{select:{name:true}}}});
    if(!current)return false;
    if(current.assignedAgentId===(next?.id||null))return "unchanged";
    await tx.lead.update({where:{id},data:{assignedAgentId:next?.id||null}});
    await tx.leadAssignmentHistory.create({data:{
     tenantId:admin.tenantId,leadId:id,
     fromAgentId:current.assignedAgentId,
     fromAgentName:current.assignedAgent?.name||null,
     toAgentId:next?.id||null,toAgentName:next?.name||null,
     changedByName:admin.name.slice(0,120)
    }});
    return "changed";
   },{isolationLevel:"Serializable"});
   if(!changed)return propertyRedirect("/admin/leads?error=noexiste");
   return back(id,changed==="unchanged"?"unchanged=1":"assigned=1");
  }catch(error){
   console.error("[crm] assignment failed",error instanceof Error?error.name:"unknown");
   return back(id,"error=servidor");
  }
 }
 if(intent==="status"){
  const status=String(form.get("status")||"");
  if(!isCrmStatus(status))return back(id,"error=estado");
  let nextContactAt:Date|null;
  try{nextContactAt=parseContactDate(String(form.get("nextContactAt")||""));}
  catch{return back(id,"error=fecha");}
  try{
   await prisma.leadCrm.upsert({
    where:{leadId:id},
    create:{tenantId:admin.tenantId,leadId:id,status,nextContactAt},
    update:{status,nextContactAt}
   });
   return back(id,"saved=1");
  }catch(error){
   console.error("[crm] update failed",error instanceof Error?error.name:"unknown");
   return back(id,"error=servidor");
  }
 }
 if(intent==="note"){
  const body=form.get("body");
  if(typeof body!=="string"||body.length>2400||body.trim().length<3||body.trim().length>2000)return back(id,"error=nota");
  try{
   await prisma.leadNote.create({data:{
    tenantId:admin.tenantId,leadId:id,authorName:admin.name.slice(0,120),body:body.trim()
   }});
   return back(id,"noteSaved=1");
  }catch(error){
   console.error("[crm] note failed",error instanceof Error?error.name:"unknown");
   return back(id,"error=servidor");
  }
 }
 return back(id,"error=datos");
}
