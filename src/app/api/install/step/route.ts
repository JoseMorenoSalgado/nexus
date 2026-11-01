import {NextRequest,NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {createStepProof,STEP_COOKIE} from "@/lib/installer-step";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const redirect=(path:string)=>new NextResponse(null,{status:303,headers:{Location:path,"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(!installerAvailable())return redirect("/admin/acceso");
 const origin=req.headers.get("origin"),host=req.headers.get("host");
 if(!origin || !host)return redirect("/instalar?estado=origen");
 try{
  const parsed=new URL(origin),direct=host.trim().toLowerCase();
  const hostname=direct.startsWith("[")?direct.slice(1).split("]")[0]:direct.split(":")[0];
  const internal=hostname==="localhost"||hostname==="127.0.0.1"||hostname==="0.0.0.0"||hostname.startsWith("10.")||hostname.startsWith("192.168.")||/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname);
  const forwarded=req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const sameHost=parsed.host.toLowerCase()===direct || (internal && forwarded===parsed.host.toLowerCase());
  const browserSameOrigin=req.headers.get("sec-fetch-site")==="same-origin" && parsed.protocol==="https:" && process.env.NODE_ENV==="production";
  if(!["http:","https:"].includes(parsed.protocol)||(!sameHost&&!browserSameOrigin))return redirect("/instalar?estado=origen");
 }catch{return redirect("/instalar?estado=origen");}
 if(Number(req.headers.get("content-length")||"0")>1024)return redirect("/instalar?estado=calculo");
 let answer="";try{answer=String((await req.formData()).get("mathAnswer")||"");}catch{return redirect("/instalar?estado=calculo");}
 if(answer!=="56")return redirect("/instalar?estado=calculo");
 const res=redirect("/instalar?paso=activar");
 res.cookies.set(STEP_COOKIE,createStepProof(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:300});
 return res;
}
