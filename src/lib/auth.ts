import "server-only";
import {randomBytes,scryptSync,timingSafeEqual,createHash} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {hasDatabaseConfig} from "@/lib/server-config";
import {parseRoles,primaryRole} from "@/lib/roles";
import {singleInstallationTenantId} from "@/lib/single-installation";
const cookieName="webappecloud_session";
const sessionHours=24;
export function hashPassword(password:string){
 const salt=randomBytes(16).toString("hex");
 return "scrypt$"+salt+"$"+scryptSync(password,salt,64).toString("hex");
}
export function verifyPassword(password:string,stored:string){
 const parts=stored.split("$");
 if(parts.length!==3||parts[0]!=="scrypt"||!parts[1]||!parts[2])return false;
 const expected=Buffer.from(parts[2],"hex");if(expected.length!==64)return false;
 const actual=scryptSync(password,parts[1],64);return timingSafeEqual(expected,actual);
}
function tokenHash(s:string){return createHash("sha256").update(s).digest("hex");}
export async function currentAdmin(){
 if(!hasDatabaseConfig())return null;
 const cookie=(await cookies()).get(cookieName)?.value;
 if(!cookie||! /^[a-f0-9]{64}$/.test(cookie))return null;
 if(process.env.NEXUS_STANDALONE==="true"){
  const db=getStandalonePrisma();
  const session=await db.adminSession.findUnique({where:{tokenHash:tokenHash(cookie)},select:{expiresAt:true,user:{select:{id:true,name:true,email:true,role:true,active:true}}}});
  if(!session||session.expiresAt<new Date()||!session.user.active)return null;
  const config=await db.siteConfig.findUnique({where:{id:"main"},select:{name:true}});
  if(!config)return null;
  const roles=parseRoles(session.user.role);
  return {userId:session.user.id,name:session.user.name,email:session.user.email,tenantId:"main",tenantName:config.name,role:primaryRole(roles),roles};
 }
 const session=await prisma.adminSession.findUnique({where:{tokenHash:tokenHash(cookie)},select:{expiresAt:true,user:{select:{id:true,name:true,email:true,tenantId:true,role:true,active:true,tenant:{select:{name:true,active:true}}}}}});
 if(!session||session.expiresAt<new Date()||!session.user.active||!session.user.tenant.active)return null;
 // Standalone installation: authorize against the sole local organization, not HTTP Host.
 const installationTenantId=await singleInstallationTenantId();
 if(!installationTenantId||installationTenantId!==session.user.tenantId)return null;
 const roles=parseRoles(session.user.role);
 return {userId:session.user.id,name:session.user.name,email:session.user.email,tenantId:session.user.tenantId,tenantName:session.user.tenant.name,role:primaryRole(roles),roles};
}
export async function requireAdmin(){
 const user=await currentAdmin();if(!user)redirect("/admin/acceso");
 return user;
}
export async function startSession(userId:string){
 const raw=randomBytes(32).toString("hex");
 await (process.env.NEXUS_STANDALONE==="true"?getStandalonePrisma():prisma).adminSession.create({data:{userId,tokenHash:tokenHash(raw),expiresAt:new Date(Date.now()+sessionHours*3600e3)}});
 (await cookies()).set(cookieName,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:sessionHours*3600});
}
export async function destroySession(){
 const jar=await cookies(),raw=jar.get(cookieName)?.value;
 if(raw)await (process.env.NEXUS_STANDALONE==="true"?getStandalonePrisma():prisma).adminSession.deleteMany({where:{tokenHash:tokenHash(raw)}});
 jar.delete(cookieName);
}

export async function requireRole(roles:string[]){
 const user=await requireAdmin();
 if(!user.roles.some(role=>roles.includes(role)))redirect("/admin");
 return user;
}
