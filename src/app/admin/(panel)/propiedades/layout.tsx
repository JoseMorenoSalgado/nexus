import {type ReactNode} from "react";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";

export default async function ModuleLayout({children}:{children:ReactNode}){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"properties"))redirect("/admin/modulos?inactive=properties");
 return <>{children}</>;
}
