import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
import {prisma} from "@/lib/prisma";
import {validLeadSourceCode} from "@/lib/lead-sources";
export const runtime="nodejs";
const back=(status:string)=>propertyRedirect("/admin/leads/canales?status="+status);
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return new Response("No autorizado",{status:403});
 if(!validMutationOrigin(req))return new Response("Origen no autorizado",{status:403});
 if(Number(req.headers.get("content-length")||0)>6000)return back("datos");
 let form:FormData;
 try{form=await req.formData();}catch{return back("datos");}
 const intent=String(form.get("intent")||"");
 const code=String(form.get("code")||"").trim().toLowerCase();
 const name=String(form.get("name")||"").trim();
 if(!validLeadSourceCode(code))return back("datos");
 if(intent==="save"){
  if(name.length<2||name.length>80)return back("datos");
  await prisma.leadSource.upsert({where:{tenantId_code:{tenantId:admin.tenantId,code}},
   create:{tenantId:admin.tenantId,code,name,active:true},
   update:{name}});
  return back("guardado");
 }
 if(intent==="toggle"){
  const active=form.get("active")==="true";
  const existing=await prisma.leadSource.findUnique({where:{tenantId_code:{tenantId:admin.tenantId,code}}});
  if(!existing)return back("datos");
  await prisma.leadSource.update({where:{id:existing.id},data:{active}});
  return back("guardado");
 }
 return back("datos");
}
