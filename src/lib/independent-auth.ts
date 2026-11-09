import "server-only";
import {redirect} from "next/navigation";
import {currentAdmin} from "@/lib/auth";
import {isStandaloneMode} from "@/lib/installation-mode";

export async function currentStandaloneAdmin(){
 return isStandaloneMode()?currentAdmin():null;
}

export async function requireStandaloneRole(allowed:readonly string[]){
 const admin=await currentStandaloneAdmin();
 if(!admin)redirect("/admin/acceso");
 if(!admin.roles.some(role=>allowed.includes(role)))redirect("/admin");
 return admin;
}
