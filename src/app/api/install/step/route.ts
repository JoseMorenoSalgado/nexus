import {NextRequest,NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {createStepProof,STEP_COOKIE} from "@/lib/installer-step";
import {installerOriginAllowed} from "@/lib/installer-origin";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const redirect=(path:string)=>new NextResponse(null,{status:303,headers:{Location:path,"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(!installerAvailable())return redirect("/admin/acceso");
 if(!installerOriginAllowed(req))return redirect("/instalar?estado=origen");
 if(Number(req.headers.get("content-length")||"0")>1024)return redirect("/instalar?estado=calculo");
 let answer="";try{answer=String((await req.formData()).get("mathAnswer")||"");}catch{return redirect("/instalar?estado=calculo");}
 if(answer!=="56")return redirect("/instalar?estado=calculo");
 const res=redirect("/instalar?paso=activar");
 res.cookies.set(STEP_COOKIE,createStepProof(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:300});
 return res;
}
