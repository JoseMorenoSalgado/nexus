import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {currentAdmin,hashPassword} from "@/lib/auth";
import {isUserRole,parseRoles,serializeRoles} from "@/lib/roles";
import {validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
function redirect(req:NextRequest,status:string){return NextResponse.redirect(new URL("/admin/clientes-agentes?status="+status,req.url),303);}
export async function POST(req:NextRequest){
 const admin=await currentAdmin();
 if(!admin||!admin.roles.includes("admin"))return new NextResponse("No autorizado",{status:403});
 if(!validMutationOrigin(req))return new NextResponse("Origen no autorizado",{status:403});
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size>10000)return redirect(req,"datos");
 let form:FormData;
 try{form=await req.formData();}catch{return redirect(req,"datos");}
 const intent=String(form.get("intent")||"");
 if(process.env.NEXUS_STANDALONE==="true"){
  const db=getStandalonePrisma();
  if(intent==="create"){
   const name=String(form.get("name")||"").trim().slice(0,120);
   const email=String(form.get("email")||"").trim().toLowerCase().slice(0,180);
   const password=String(form.get("password")||"");
   const roles=form.getAll("roles").map(String);
   if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>256||password!==String(form.get("confirmPassword")||"")||!/[a-z]/i.test(password)||!/\d/.test(password)||!roles.length||roles.length!==new Set(roles).size||!roles.every(isUserRole))return redirect(req,"datos");
   try{await db.adminUser.create({data:{name,email,role:serializeRoles(roles.filter(isUserRole)),passwordHash:hashPassword(password),active:true}});}
   catch{return redirect(req,"duplicado");}
   return redirect(req,"creado");
  }
  const id=String(form.get("id")||"");
  if(!id||id.length>100)return redirect(req,"datos");
  const target=await db.adminUser.findUnique({where:{id}});
  if(!target)return redirect(req,"datos");
  if(intent==="profile"){
   const name=String(form.get("name")||"").trim();
   const email=String(form.get("email")||"").trim().toLowerCase();
   if(name.length<2||name.length>120||email.length>180||!/^\S+@\S+\.\S+$/.test(email))return redirect(req,"datos");
   try{await db.adminUser.update({where:{id},data:{name,email}});await db.adminSession.deleteMany({where:{userId:id}});return redirect(req,"perfil");}
   catch{return redirect(req,"duplicado");}
  }
  if(intent!=="role"&&intent!=="toggle")return redirect(req,"datos");
  if(target.id===admin.userId)return redirect(req,"propia");
  const roles=form.getAll("roles").map(String);
  if(intent==="role"&&(!roles.length||roles.length!==new Set(roles).size||!roles.every(isUserRole)))return redirect(req,"datos");
  const losingAdmin=parseRoles(target.role).includes("admin")&&(intent==="toggle"?target.active:!roles.includes("admin"));
  if(losingAdmin&&target.active){
   const active=await db.adminUser.findMany({where:{active:true},select:{role:true}});
   if(active.filter(u=>parseRoles(u.role).includes("admin")).length<=1)return redirect(req,"ultimo");
  }
  await db.adminUser.update({where:{id},data:intent==="role"?{role:serializeRoles(roles.filter(isUserRole))}:{active:!target.active}});
  await db.adminSession.deleteMany({where:{userId:id}});
  return redirect(req,"guardado");
 }

 if(intent==="create"){
  const name=String(form.get("name")||"").trim().slice(0,120);
  const email=String(form.get("email")||"").trim().toLowerCase().slice(0,180);
  const password=String(form.get("password")||"");
  const confirmation=String(form.get("confirmPassword")||"");
  const roles=form.getAll("roles").map(String);
  const role=serializeRoles(roles.filter(isUserRole));
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>256||password!==confirmation||!/[a-z]/i.test(password)||!/\d/.test(password)||/[\x00-\x1F]/.test(password)||!roles.length||roles.length!==new Set(roles).size||!roles.every(isUserRole))return redirect(req,"datos");
  try{await prisma.adminUser.create({data:{tenantId:admin.tenantId,name,email,role,passwordHash:hashPassword(password),active:true}});}
  catch{return redirect(req,"duplicado");}
  return redirect(req,"creado");
 }
 if(intent==="profile"){
  const id=String(form.get("id")||"");
  const name=String(form.get("name")||"").trim();
  const email=String(form.get("email")||"").trim().toLowerCase();
  if(!id||id.length>100||name.length<2||name.length>120||email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return redirect(req,"datos");
  const target=await prisma.adminUser.findFirst({where:{id,tenantId:admin.tenantId},select:{id:true}});
  if(!target)return redirect(req,"datos");
  try{
   await prisma.adminUser.update({where:{id:target.id},data:{name,email}});
   await prisma.adminSession.deleteMany({where:{userId:target.id}});
   return redirect(req,"perfil");
  }catch{return redirect(req,"duplicado");}
 }
 if(intent==="role"||intent==="toggle"){
  const id=String(form.get("id")||"");
  if(!id||id.length>100)return redirect(req,"datos");
  const target=await prisma.adminUser.findFirst({where:{id,tenantId:admin.tenantId}});
  if(!target)return redirect(req,"datos");
  if(target.id===admin.userId)return redirect(req,"propia");
  const losingAdmin=parseRoles(target.role).includes("admin")&&(intent==="toggle"?target.active:!form.getAll("roles").includes("admin"));
  if(losingAdmin&&target.active){
   const users=await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:{role:true}});
   if(users.filter(u=>parseRoles(u.role).includes("admin")).length<=1)return redirect(req,"ultimo");
  }
  if(intent==="role"){
   const roles=form.getAll("roles").map(String);
   if(!roles.length||roles.length!==new Set(roles).size||!roles.every(isUserRole))return redirect(req,"datos");
   const role=serializeRoles(roles);
   await prisma.adminUser.update({where:{id:target.id},data:{role}});
  }else{
   await prisma.adminUser.update({where:{id:target.id},data:{active:!target.active}});
  }
  await prisma.adminSession.deleteMany({where:{userId:target.id}});
  return redirect(req,"guardado");
 }
 return redirect(req,"datos");
}
