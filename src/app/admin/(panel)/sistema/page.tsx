import Link from "next/link";
import {Database,ShieldCheck,CheckCircle2,AlertTriangle,ArrowLeft} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {commercialSchemaState} from "@/lib/commercial-schema";
export const dynamic="force-dynamic";
const labels=[
 ["propertyAgent","Asignación de agentes en propiedades"],
 ["leadAgent","Responsable individual de prospectos"],
 ["leadHistory","Historial de reasignaciones"],
 ["agenda","Agenda comercial"]
] as const;
export default async function SystemStatus({searchParams}:{searchParams:Promise<{status?:string}>}){
 const admin=await requireRole(["admin"]);
 const q=await searchParams;
 let state:Awaited<ReturnType<typeof commercialSchemaState>>|null=null;
 let failed=false;
 try{state=await commercialSchemaState();}catch{failed=true;}
 return <section className="system-diagnostics">
  <div className="admin-heading"><div>
   <Link href="/admin" className="inline-link"><ArrowLeft size={16}/> Inicio</Link>
   <h1>Estado de la base de datos</h1>
   <p>Comprueba la compatibilidad entre la instalación actual y las funciones comerciales del dashboard.</p>
  </div></div>
  {q.status==="repaired"&&<p className="property-success" role="status">Se completaron las comprobaciones y actualizaciones del esquema comercial.</p>}
  {q.status==="failed"&&<p className="admin-error" role="alert">La actualización no pudo finalizar. Consulta los registros de Plesk/Passenger o del servidor Node.js y revisa los permisos SQL antes de intentarlo nuevamente. No repitas migraciones manuales a ciegas.</p>}
  {failed?<div className="admin-panel"><AlertTriangle size={23}/><h2>No fue posible comprobar el esquema</h2><p>Verifica la conexión con MariaDB/PostgreSQL y los registros de Node.js en Plesk. Ningún cambio fue aplicado.</p></div>:
  <div className="admin-panel"><div className="heading-row"><h2>Estado del esquema comercial</h2><span>{state?.ready?"Actualizado":"Actualización pendiente"}</span></div>
   <div className="system-schema-list">{labels.map(([field,label])=><div key={field}>
    {state?.[field]?<CheckCircle2 size={19} color="#218456"/>:<AlertTriangle size={19} color="#b33c35"/>}
    <span>{label}</span><strong>{state?.[field]?"Disponible":"Pendiente"}</strong>
   </div>)}</div>
  </div>}
  {!failed&&!state?.ready&&<div className="admin-panel system-repair-panel">
   <h2><Database size={21}/> Completar estructura comercial</h2>
   <p>Esta acción agrega únicamente las columnas, índices, relaciones y tablas comerciales que falten, sin eliminar propiedades, usuarios ni prospectos existentes. Si hay una migración incompleta, intentará completar sus elementos faltantes.</p>
   <p><strong>Antes de ejecutarla:</strong> verifica que exista una copia de seguridad reciente y recuperable de la base de datos. Las operaciones DDL pueden quedar parcialmente aplicadas si el servidor interrumpe el proceso.</p>
   <form method="post" action="/api/admin/sistema/reparar">
    <label className="system-backup-confirm"><input type="checkbox" name="backupConfirmed" value="yes" required/> Confirmo que tengo un respaldo de la base de datos y autorizo completar las estructuras comerciales faltantes.</label>
    <button className="btn btn-red" type="submit"><ShieldCheck size={17}/> Completar estructura</button>
   </form>
  </div>}
  {state?.ready&&<div className="admin-panel"><p>Las estructuras comerciales requeridas están presentes. Esto no garantiza por sí mismo que todas las consultas de la aplicación funcionen; si el error continúa, revisa los registros de Plesk/Passenger para identificar la excepción concreta.</p><Link className="btn wizard-back" href="/admin">Regresar al dashboard</Link></div>}
  <p className="property-help">Esta página no muestra contraseñas ni cadenas de conexión. Visible únicamente para los administradores de la empresa.</p>
 </section>;
}
