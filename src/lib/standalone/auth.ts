import "server-only";
import {createHash,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {standalonePrisma} from "@/lib/standalone/db";
import {parseRoles,primaryRole} from "@/lib/roles";

/**
 * Authentication for NEW standalone PostgreSQL installations.
 * Separate from the production auth module until all Prisma consumers migrate.
 */
const cookieName = "nexus_standalone_session";
const sessionHours = 24;
const tokenHash = (value:string) => createHash("sha256").update(value).digest("hex");

export async function currentStandaloneAdmin(){
 const raw=(await cookies()).get(cookieName)?.value;
 if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
 const session=await standalonePrisma().adminSession.findUnique({
  where:{tokenHash:tokenHash(raw)},
  select:{expiresAt:true,user:{select:{id:true,name:true,email:true,role:true,active:true}}}
 });
 if(!session||session.expiresAt<new Date()||!session.user.active)return null;
 const roles=parseRoles(session.user.role);
 return {userId:session.user.id,name:session.user.name,email:session.user.email,role:primaryRole(roles),roles};
}
export async function requireStandaloneAdmin(){
 const admin=await currentStandaloneAdmin();
 if(!admin)redirect("/admin/acceso");
 return admin;
}
export async function requireStandaloneRole(allowed:string[]){
 const admin=await requireStandaloneAdmin();
 if(!admin.roles.some(role=>allowed.includes(role)))redirect("/admin");
 return admin;
}
export async function startStandaloneSession(userId:string){
 const raw=randomBytes(32).toString("hex");
 await standalonePrisma().adminSession.create({data:{userId,tokenHash:tokenHash(raw),expiresAt:new Date(Date.now()+sessionHours*3600_000)}});
 (await cookies()).set(cookieName,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:sessionHours*3600});
}
export async function destroyStandaloneSession(){
 const jar=await cookies();
 const raw=jar.get(cookieName)?.value;
 if(raw)await standalonePrisma().adminSession.deleteMany({where:{tokenHash:tokenHash(raw)}});
 jar.delete(cookieName);
}
export function verifyStandalonePassword(password:string,stored:string){
 const parts=stored.split("$");
 if(parts.length!==3||parts[0]!=="scrypt"||!parts[1]||!parts[2])return false;
 const expected=Buffer.from(parts[2],"hex");
 if(expected.length!==64)return false;
 return timingSafeEqual(expected,scryptSync(password,parts[1],64));
}

/** Authenticate against the independent user table; generic failure prevents enumeration. */
export async function authenticateStandalone(email:string,password:string){
 const normalized=email.trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(normalized)||!password)return false;
 const user=await standalonePrisma().adminUser.findUnique({where:{email:normalized}});
 if(!user||!user.active||!verifyStandalonePassword(password,user.passwordHash))return false;
 await startStandaloneSession(user.id);
 return true;
}
