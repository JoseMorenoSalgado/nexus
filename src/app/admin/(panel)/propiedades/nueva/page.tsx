import Link from "next/link";
import {Plus} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {parseRoles} from "@/lib/roles";
import {AdminPropertyFields} from "@/components/admin-property-fields";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 datos:"Revisa los campos obligatorios y los valores numéricos.",
 precio:"El precio debe ser mayor que cero y tener como máximo dos decimales.",
 duplicado:"Ya existe una propiedad con esa referencia o dirección de enlace.",
 origen:"La sesión del formulario es inválida. Abre de nuevo esta página.",
 servidor:"No fue posible guardar la propiedad. Comprueba los registros del servidor."
};
export default async function NewProperty({searchParams}:{searchParams:Promise<{error?:string}>}){
 const admin=await requireRole(["admin","editor"]);
 const {error}=await searchParams;
 const users=await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:{id:true,name:true,email:true,role:true}});
 const agents=users.filter(u=>parseRoles(u.role).includes("agente"));
 return <>
  <div className="admin-heading"><div><h1>Nueva propiedad</h1><p>Registra la información principal, guarda y después agrega las fotografías.</p></div><Link href="/admin/propiedades" className="inline-link">← Volver a propiedades</Link></div>
  {!admin.roles.some(r=>["admin","editor"].includes(r))?<p className="panel-notice">Tu cuenta no tiene permiso para crear propiedades.</p>:
  <form className="admin-form property-editor" method="post" action="/api/admin/properties">
   {error&&<div className="admin-error" role="alert">{errors[error]||errors.servidor}</div>}
   <AdminPropertyFields agents={agents}/>
   <div className="property-editor-actions"><button className="btn btn-red" type="submit"><Plus size={17}/> Crear propiedad y añadir fotos</button><Link className="btn wizard-back" href="/admin/propiedades">Cancelar</Link></div>
  </form>}
 </>;
}
