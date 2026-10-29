import {NextRequest,NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {integrationsForTenant,saveIntegrations,smtpValid,captchaValid,type IntegrationConfig} from "@/lib/integration-config";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const back=(result:string)=>new NextResponse(null,{status:303,headers:{
 Location:"/admin/integraciones?status="+encodeURIComponent(result),
 "Cache-Control":"no-store"
}});
const get=(form:FormData,key:string,max:number)=>{
 const value=form.get(key);
 return typeof value==="string"&&value.length<=max?value.trim():null;
};
const email=(value:string)=>/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(value);

export async function POST(req:NextRequest){
 const admin=await requireRole(["admin"]);
 if(!validMutationOrigin(req))return new NextResponse("Origen no autorizado",{status:403});
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>12000)return back("invalid");
 let form:FormData;
 try{form=await req.formData();}catch{return back("invalid");}
 try{
  const previous=integrationsForTenant(admin.tenantId);
  let config:IntegrationConfig={smtp:{...previous.smtp},captcha:{...previous.captcha}};
  const section=get(form,"section",20);
  if(section==="smtp"){
   const enabled=form.get("enabled")==="on";
   const host=get(form,"host",253),port=get(form,"port",4),
    user=get(form,"user",180),password=get(form,"password",256),
    from=get(form,"from",180),to=get(form,"to",180);
   if([host,port,user,password,from,to].some(v=>v===null))return back("invalid");
   const currentPassword=password||previous.smtp.password;
   config.smtp={enabled,host:host!,port:port==="465"?465:587,user:user!,
    password:currentPassword,from:from!,to:to!};
   if(port!=="465"&&port!=="587")return back("invalid");
   if(enabled&&!smtpValid(config.smtp))return back("smtp-invalid");
   if(!enabled&&(!!from&&!email(from)||!!to&&!email(to)))return back("smtp-invalid");
  }else if(section==="captcha"){
   const enabled=form.get("enabled")==="on";
   const siteKey=get(form,"siteKey",256),secretKey=get(form,"secretKey",256);
   if(siteKey===null||secretKey===null)return back("invalid");
   config.captcha={enabled,siteKey:siteKey||previous.captcha.siteKey,
    secretKey:secretKey||previous.captcha.secretKey};
   if(enabled&&!captchaValid(config.captcha))return back("captcha-invalid");
  }else{return back("invalid");}
  saveIntegrations(admin.tenantId,config);
  return back(section==="smtp"?"smtp-saved":"captcha-saved");
 }catch(error){
  console.error("[integrations] save failed",error instanceof Error?error.name:"unknown");
  return back("storage-error");
 }
}
