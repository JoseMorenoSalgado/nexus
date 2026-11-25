import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getPropertyDisplay} from "@/lib/property-display-settings";
export const dynamic="force-dynamic";
export default async function PropertyPresentation({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 await requireRole(["admin"]);
 const [settings,q]=await Promise.all([getPropertyDisplay(),searchParams]);
 return <section><div className="admin-heading"><h1>Presentación de propiedades</h1></div>
 {q.saved&&<p role="status" className="property-success">Configuración guardada.</p>}
 {q.error&&<p role="alert" className="admin-error">No se pudo guardar la configuración.</p>}
 <form className="admin-panel admin-form" action="/api/admin/property-display" method="post">
 <label><input name="showInquiry" type="checkbox" defaultChecked={settings.showInquiry}/> Mostrar formulario público de consulta</label>
 <label><input name="showPdfLogo" type="checkbox" defaultChecked={settings.showPdfLogo}/> Mostrar el logotipo corporativo en la ficha PDF</label>
 <label><input name="showPdfName" type="checkbox" defaultChecked={settings.showPdfName}/> Mostrar nombre de Nexus como texto en el PDF</label>
 <label><input name="showPdfQr" type="checkbox" defaultChecked={settings.showPdfQr}/> Mostrar código QR en el PDF cuando exista contenido adicional</label>
 <p>Por solicitud del cliente, el logotipo, el nombre corporativo y el código QR están ocultos de forma predeterminada. Puedes reactivarlos sin modificar las propiedades ni la identidad visual pública.</p>
 <button className="btn btn-red" type="submit">Guardar configuración</button></form></section>;
}
