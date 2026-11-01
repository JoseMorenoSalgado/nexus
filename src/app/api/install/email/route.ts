import {NextRequest,NextResponse} from "next/server";
import {emailSetupEnabled,sendInstallerCode,verifyInstallerCode} from "@/lib/installer-email";
import {issueInstallerSession,INSTALLER_SESSION_COOKIE,INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const redirect=(state:string)=>new NextResponse(null,{status:303,headers:{Location:"/instalar?estado="+state,"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(!emailSetupEnabled())return redirect("correo-no-configurado");
 const origin=req.headers.get("origin"),host=req.headers.get("host");
 if(!origin || !host)return redirect("origen");
 try {
  const parsed=new URL(origin);
  const direct=host.toLowerCase();
  const internal=/^(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+)(:\\d+)?$/.test(direct);
  const forwarded=req.headers.get("x-forwarded-host")?.split(",")[0].trim().toLowerCase();
  if(!["https:","http:"].includes(parsed.protocol) || (parsed.host.toLowerCase()!==direct && !(internal && forwarded===parsed.host.toLowerCase())))return redirect("origen");
 }catch{return redirect("origen");}
 if(Number(req.headers.get("content-length")||"0")>4096)return redirect("correo-error");
 let form:FormData;try{form=await req.formData();}catch{return redirect("correo-error");}
 const action=String(form.get("action")||"");
 if(action==="send"){
  try{const result=await sendInstallerCode(String(form.get("email")||""));return redirect(result==="wait"?"correo-espera":"correo-enviado");}
  catch{return redirect("correo-error");}
 }
 if(action==="verify"){
  let valid=false;try{valid=verifyInstallerCode(String(form.get("code")||""));}catch{return redirect("correo-error");}
  if(!valid)return redirect("codigo-invalido");
  let session:string|null;try{session=issueInstallerSession();}catch{return redirect("almacenamiento");}
  if(!session)return redirect("ocupado");
  const res=redirect("autorizado");
  res.cookies.set(INSTALLER_SESSION_COOKIE,session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:INSTALLER_SESSION_SECONDS});
  return res;
 }
 return redirect("correo-error");
}
