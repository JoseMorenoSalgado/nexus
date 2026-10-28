"use server";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {verifyPassword,startSession,destroySession,requireAdmin} from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {createHash} from "node:crypto";
import {hasDatabaseConfig} from "@/lib/server-config";
import {normalizeSiteHost} from "@/lib/preview";
export async function signIn(form:FormData){
 if(!hasDatabaseConfig())redirect("/instalar");
 const email=String(form.get("email")||"").trim().toLowerCase().slice(0,180);
 const password=String(form.get("password")||"");
 if(!email||password.length<8||password.length>256)redirect("/admin/acceso?error=credenciales");
 const h=(await import("next/headers")).headers;
 const hostname=normalizeSiteHost((await h()).get("host")||"");
 const domain=await prisma.domain.findUnique({where:{hostname},select:{tenantId:true}});
 if(!domain)redirect("/admin/acceso?error=credenciales");
 const key=createHash("sha256").update(domain.tenantId+":"+email).digest("hex"),now=new Date();
 const previous=await prisma.adminLoginThrottle.findUnique({where:{key}});
 if(previous&&previous.expiresAt>now&&previous.attempts>=5)redirect("/admin/acceso?error=bloqueado");
 const user=await prisma.adminUser.findUnique({where:{tenantId_email:{tenantId:domain.tenantId,email}},select:{id:true,active:true,passwordHash:true,tenant:{select:{active:true}}}});
 if(!user||!user.active||!user.tenant.active||!verifyPassword(password,user.passwordHash)){
  const expiresAt=new Date(Date.now()+15*60*1000);
  if(previous&&previous.expiresAt>now)await prisma.adminLoginThrottle.update({where:{key},data:{attempts:{increment:1}}});
  else await prisma.adminLoginThrottle.upsert({where:{key},create:{key,attempts:1,expiresAt},update:{attempts:1,expiresAt}});
  redirect("/admin/acceso?error=credenciales");
 }
 await prisma.adminLoginThrottle.deleteMany({where:{key}});
 await startSession(user.id);
 redirect("/admin");
}
export async function signOut(){
 await destroySession();redirect("/admin/acceso");
}
const slugify=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,85);
export async function createProperty(form:FormData){
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))throw Error("No autorizado");
 const title=String(form.get("title")||"").trim().slice(0,140);
 const refCode=String(form.get("refCode")||"").trim().toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,40);
 const city=String(form.get("city")||"").trim().slice(0,80);
 const neighborhood=String(form.get("neighborhood")||"").trim().slice(0,80);
 const description=String(form.get("description")||"").trim().slice(0,8000);
 const type=String(form.get("type")||"Casa"),operation=String(form.get("operation")||"venta");
 const price=Number(form.get("price")||0);
 const image=String(form.get("image")||"").trim().slice(0,2048);
 if(title.length<5||refCode.length<3||!city||description.length<10||!Number.isFinite(price)||price<=0)throw Error("Completa los datos requeridos.");
 if(!["Casa","Apartamento","Terreno","Local","Otro"].includes(type)||!["venta","alquiler"].includes(operation))throw Error("Operación o tipo no válido");
 if(image && !/^https:\/\/[a-z0-9.-]+(?:[/:?#][^\s]*)?$/i.test(image))throw Error("Imagen debe ser una URL HTTPS válida");
 const number=(key:string)=>{const v=Number(form.get(key)||0);return Number.isInteger(v)&&v>=0&&v<10000000?v:0;};
 await prisma.property.create({data:{
  tenantId:admin.tenantId,title,refCode,slug:slugify(title)+"-"+refCode.toLowerCase(),
  city,neighborhood,description,type,operation,price,
  bedrooms:number("bedrooms"),bathrooms:number("bathrooms"),areaM2:number("areaM2"),
  published:form.get("published")==="on",
  ...(image?{photos:{create:{url:image,alt:title,sortOrder:0}}}:{})
 }});
 revalidatePath("/admin");revalidatePath("/admin/propiedades");
 redirect("/admin/propiedades");
}
