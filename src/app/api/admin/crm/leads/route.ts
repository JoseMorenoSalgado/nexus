import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {getSiteTemplate} from "@/lib/site-template-store";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {managesAllLeads} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";

export const runtime="nodejs";
const back=(code:string)=>propertyRedirect("/admin/leads/nuevo?error="+code);
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"inquiries"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.some(r=>["admin","editor","agente"].includes(r)))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const len=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(len)||len>12000)return back("datos");
 if(!await crmTablesReady())return propertyRedirect("/admin/leads?error=inactivo");
 let form:FormData;
 try{form=await req.formData();}catch{return back("datos");}
 function field(name:string,limit:number){
  const v=form.get(name);
  if(v===null)return "";
  if(typeof v!=="string"||v.length>limit+30)throw new Error("datos");
  return v.trim().slice(0,limit);
 }
 try{
  const name=field("name",120);
  const phone=field("phone",30);
  const email=field("email",180).toLowerCase();
  const message=field("message",2000);
  const source=field("source",20);
  const propertyId=field("propertyId",80);
  if(name.length<2||!/^[+\d() -]{7,30}$/.test(phone))return back("datos");
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return back("correo");
  if(!["whatsapp","telefono","manual"].includes(source))return back("datos");
  if(form.get("consent")!=="on")return back("consentimiento");
  const realEstate=(await getSiteTemplate(admin.tenantId)).key==="real-estate";
  if(realEstate&&!managesAllLeads(admin)&&!propertyId)return back("propiedad");
  let assignedAgentId:string|null=null;
  if(propertyId){
   const property=await prisma.property.findFirst({where:{tenantId:admin.tenantId,id:propertyId,...(!managesAllLeads(admin)?{assignedAgentId:admin.userId}:{})},select:{id:true,assignedAgentId:true,assignedAgent:{select:{active:true,role:true,tenantId:true}}}});
   if(!property)return back("propiedad");
   if(property.assignedAgentId&&property.assignedAgent?.active&&property.assignedAgent.tenantId===admin.tenantId&&parseRoles(property.assignedAgent.role).includes("agente"))assignedAgentId=property.assignedAgentId;
  }
  if(managesAllLeads(admin)){
   const choice=form.get("assignedAgentId");
   if(typeof choice==="string"&&choice!=="auto"){
    if(choice.length>100)return back("agente");
    if(choice){
     const selected=await prisma.adminUser.findFirst({where:{id:choice,tenantId:admin.tenantId,active:true},select:{role:true}});
     if(!selected||!parseRoles(selected.role).includes("agente"))return back("agente");
    }
    assignedAgentId=choice||null;
   }
  }else assignedAgentId=admin.userId;
  const lead=await prisma.lead.create({data:{
   tenantId:admin.tenantId,propertyId:propertyId||null,assignedAgentId,name,phone,email:email||null,
   message:message||null,source,consent:true
  }});
  return propertyRedirect("/admin/leads/"+encodeURIComponent(lead.id)+"?created=1");
 }catch(error){
  if(error instanceof Error&&error.message==="datos")return back("datos");
  console.error("[crm] lead creation",error instanceof Error?error.name:"unknown");
  return back("servidor");
 }
}
