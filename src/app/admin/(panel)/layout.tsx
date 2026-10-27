import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {AdminNav} from "@/components/admin-nav";
import {Building2} from "lucide-react";
import {commercialNotifications} from "@/lib/commercial-notifications";
import {getSiteTemplate} from "@/lib/site-template-store";
import {getTenantModules} from "@/lib/tenant-modules";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){
 const admin=await requireAdmin();
 const template=await getSiteTemplate(admin.tenantId);
 const modules=await getTenantModules(admin.tenantId,template.key);
 const isNexus=template.key==="real-estate"&&admin.tenantName.toLowerCase()==="nexus real estate";
 let alertCount=0;
 if(template.key==="real-estate"&&admin.roles.some(role=>["admin","editor","agente"].includes(role))){
  try{alertCount=(await commercialNotifications(admin,{limit:0})).total;}
  catch(error){
   console.warn("[notifications] counters unavailable",error instanceof Error?error.name:"unknown");
  }
 }
 return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/admin" className="brand"><span className="brand-icon">{isNexus?<img src="/brand/nexus-icon.webp" alt=""/>:<Building2 size={28}/>}</span><span><strong>{isNexus?"NEXUS":admin.tenantName}</strong><small>{isNexus?"REAL ESTATE":"Mi sitio web"}</small></span></Link><AdminNav role={admin.role} roles={admin.roles} userId={admin.userId} userName={admin.name} notificationCount={alertCount} templateKey={template.key} enabledModules={modules}/></aside><div className="admin-main"><div className="admin-body">{children}</div></div></div>;
}
