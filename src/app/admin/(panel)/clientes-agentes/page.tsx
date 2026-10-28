import {requireAdmin} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {ROLE_LABELS,parseRoles} from "@/lib/roles";
import {redirect} from "next/navigation";
import Link from "next/link";
export const dynamic="force-dynamic";
const messages:Record<string,string>={creado:"Usuario creado correctamente.",perfil:"Perfil actualizado. Debe iniciarse una nueva sesión para aplicar el cambio.",guardado:"Permisos actualizados.",datos:"Revisa los datos ingresados.",duplicado:"No se pudo crear el usuario. Verifica si el correo ya existe.",propia:"No puedes modificar tu propia cuenta desde esta sección.",ultimo:"Debe quedar al menos un administrador activo."};
export default async function Users({searchParams}:{searchParams:Promise<{status?:string}>}){
 const admin=await requireAdmin();if(!admin.roles.includes("admin"))redirect("/admin");
 const users=await prisma.adminUser.findMany({where:{tenantId:admin.tenantId},orderBy:[{active:"desc"},{createdAt:"asc"}],select:{id:true,name:true,email:true,role:true,active:true}});
 const agents=users.filter(u=>parseRoles(u.role).includes("agente"));
 const counts=agents.length?await prisma.property.groupBy({by:["assignedAgentId"],where:{tenantId:admin.tenantId,assignedAgentId:{in:agents.map(a=>a.id)}},_count:{_all:true}}):[];
 const agentPropertyCounts=new Map(counts.map(x=>[x.assignedAgentId,x._count._all]));
 const {status}=await searchParams;
 return <section className="user-management">
  <div className="admin-heading"><div><h1>Equipo y usuarios</h1><p>Administra accesos y agentes comerciales. Los contactos de clientes están en <Link href="/admin/leads" className="inline-link">Prospectos</Link>.</p></div></div>
  <div className="client-agent-summary"><div><strong>{agents.length}</strong><span>Agentes registrados</span></div><div><strong>{users.length}</strong><span>Usuarios con acceso al panel</span></div></div>
  <div className="admin-panel"><div className="heading-row"><h2>Agentes comerciales</h2><span className="property-photo-count">{agents.length} registrados</span></div>
   {agents.length?<div className="agent-directory">{agents.map(agent=><article className="agent-directory-card" key={agent.id}>
    <span className="agent-directory-avatar" aria-hidden="true">{agent.name.slice(0,1).toLocaleUpperCase("es")}</span>
    <div><strong>{agent.name}</strong><small>{agent.email}</small><span>{agentPropertyCounts.get(agent.id)||0} propiedades asignadas · {agent.active?"Activo":"Inactivo"}</span></div>
    <Link className="btn wizard-back" href={"/admin/clientes-agentes/agentes/"+encodeURIComponent(agent.id)}>Ver perfil</Link>
   </article>)}</div>:<p className="property-help">Crea un usuario con el rol Agente comercial para asignarle propiedades y consultar sus prospectos.</p>}
  </div>
  <p className="property-help">Los prospectos no son usuarios del panel. Aquí solo gestionas las cuentas que pueden iniciar sesión.</p>
  {status&&messages[status]&&<p role="status" className={["creado","guardado","perfil"].includes(status)?"property-success":"admin-error"}>{messages[status]}</p>}
  <div className="admin-panel"><h2>Crear usuario</h2><form className="user-create-form" method="post" action="/api/admin/users">
   <input type="hidden" name="intent" value="create"/>
   <label>Nombre completo<input name="name" minLength={2} maxLength={120} required autoComplete="name"/></label>
   <label>Correo de acceso<input name="email" type="email" required autoComplete="off"/></label>
   <label>Contraseña inicial<input name="password" type="password" minLength={12} maxLength={256} required autoComplete="new-password"/></label>
   <fieldset className="user-role-options"><legend>Roles del usuario (puedes seleccionar varios)</legend>{Object.entries(ROLE_LABELS).map(([value,label])=><label key={value}><input type="checkbox" name="roles" value={value} defaultChecked={value==="agente"}/>{label}</label>)}</fieldset>
   <button className="btn btn-red" type="submit">Crear usuario</button>
  </form><p className="property-help">Las contraseñas deben tener al menos 12 caracteres. Cada usuario solo accederá a la empresa a la que pertenece.</p></div>
  <div className="admin-panel"><h2>Usuarios registrados ({users.length})</h2><div className="user-table-wrap"><table className="admin-table"><thead><tr><th>Usuario</th><th>Estado</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.name}</strong><div className="user-email">{u.email}</div></td><td>{u.active?"Activo":"Inactivo"}</td><td>{parseRoles(u.role).map(r=>ROLE_LABELS[r]).join(", ")||"Sin rol válido"}</td><td>{u.id===admin.userId?<span>Tu cuenta</span>:<div className="user-actions"><form method="post" action="/api/admin/users"><input type="hidden" name="intent" value="role"/><input type="hidden" name="id" value={u.id}/><fieldset className="user-role-options user-role-inline"><legend>Roles</legend>{Object.entries(ROLE_LABELS).map(([value,label])=><label key={value}><input type="checkbox" name="roles" value={value} defaultChecked={parseRoles(u.role).includes(value as keyof typeof ROLE_LABELS)}/>{label}</label>)}</fieldset><button type="submit">Guardar rol</button></form><form method="post" action="/api/admin/users"><input type="hidden" name="intent" value="toggle"/><input type="hidden" name="id" value={u.id}/><button type="submit">{u.active?"Desactivar":"Activar"}</button></form></div>}</td></tr>)}</tbody></table></div></div>
 </section>;
}
