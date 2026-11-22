import {NextRequest,NextResponse} from "next/server";
import {currentAdmin,verifyPassword,hashPassword,destroySession} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
const failed=()=>propertyRedirect("/admin/perfil?error=1");
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return new NextResponse(null,{status:404});
 const admin=await currentAdmin();
 if(!admin||!validMutationOrigin(req,"/admin/perfil"))return new NextResponse(null,{status:403});
 try{
  const form=await req.formData();
  const current=form.get("currentPassword"),next=form.get("password"),confirm=form.get("confirmPassword");
  if(typeof current!=="string"||current.length>256||typeof next!=="string"||next.length<12||next.length>256||next!==confirm||next===current||!/[a-z]/i.test(next)||!/\d/.test(next)||/[\x00-\x1f]/.test(next))return failed();
  const db=getStandalonePrisma();
  const user=await db.adminUser.findUnique({where:{id:admin.userId},select:{passwordHash:true,active:true}});
  if(!user?.active||!verifyPassword(current,user.passwordHash))return failed();
  const hash=hashPassword(next);
  const changed=await db.$transaction(async tx=>{
   const result=await tx.adminUser.updateMany({where:{id:admin.userId,passwordHash:user.passwordHash,active:true},data:{passwordHash:hash}});
   if(result.count!==1)return false;
   await tx.adminSession.deleteMany({where:{userId:admin.userId}});return true;
  });
  if(!changed)return failed();
  await destroySession();
  return propertyRedirect("/admin/acceso");
 }catch{return failed();}
}
