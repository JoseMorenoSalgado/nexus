import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Profile({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireAdmin();const q=await searchParams;
 return <section><div className="admin-heading"><div><h1>Mi perfil y seguridad</h1><p>{admin.name} · {admin.email}</p></div></div>
 <form action="/api/admin/change-password" method="post" className="admin-panel admin-form">
 <h2>Cambiar contraseña</h2>{q.error&&<p role="alert" className="admin-error">No se pudo cambiar la contraseña. Comprueba los datos y vuelve a intentarlo.</p>}
 <label>Contraseña actual<input type="password" name="currentPassword" autoComplete="current-password" maxLength={256} required/></label>
 <label>Nueva contraseña<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label>
 <label>Confirmar contraseña<input type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={256} required/></label>
 <p>Usa al menos 12 caracteres, letras y números. Al cambiarla, todas tus sesiones se cerrarán.</p>
 <button type="submit" className="btn btn-red">Cambiar contraseña</button></form></section>;
}
