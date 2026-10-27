import Link from "next/link";
import {ArrowUpRight,Plus,Search,X} from "lucide-react";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import {PagePublicationAction} from "@/components/page-publication-action";
import {type PageDefinition} from "@/lib/site-pages";
import {requireAdmin} from "@/lib/auth";
import {getPageDefinitions} from "@/lib/site-pages";
export const dynamic="force-dynamic";
type Query={saved?:string;error?:string;estado?:string;buscar?:string};
export default async function PagesAdmin({searchParams}:{searchParams:Promise<Query>}){
 const admin=await requireAdmin(),q=await searchParams;
 const pages=await getPageDefinitions(admin.tenantId);
 const editingLocation=(page:PageDefinition)=>"/admin/personalizar/paginas/"+page.slug;
 const advisory=pages.find(p=>p.id==="asesoria-empresarial");
 const canEdit=admin.roles.some(r=>["admin","editor"].includes(r));
 const search=(q.buscar||"").trim().slice(0,90).toLocaleLowerCase("es");
 const status=q.estado==="publicadas"?"publicadas":q.estado==="borradores"?"borradores":"todas";
 const results=pages.filter(p=>(status==="todas"||(status==="publicadas"?p.published:!p.published))&&
  (!search||[p.title,p.href,p.summary].join(" ").toLocaleLowerCase("es").includes(search)));
 const published=pages.filter(p=>p.published).length;
 const tabs=[{id:"todas",label:"Todas",total:pages.length},{id:"publicadas",label:"Publicadas",total:published},{id:"borradores",label:"Borradores",total:pages.length-published}];
 const tabHref=(id:string)=>{const params=new URLSearchParams({estado:id});if(search)params.set("buscar",search);return "/admin/personalizar/paginas?"+params.toString();};
 return <>
  <div className="admin-heading cms-heading"><div><h1>Páginas</h1>
   <p>Edita el contenido y decide qué páginas pueden ver tus visitantes.</p></div>
   {canEdit&&<Link href="/admin/personalizar/paginas/nueva" className="btn btn-red"><Plus size={17}/> Nueva página</Link>}
  </div>
  <SiteCustomizerNav current="pages"/>
  <div className="cms-publication-guide"><strong>Publicar y mostrar en el menú son acciones diferentes.</strong><span>Una página publicada se puede abrir mediante su enlace. Para mostrarla en la navegación superior, agrégala en <Link href="/admin/personalizar/menu">Menú principal</Link>.</span></div>
  {advisory&&<section className="admin-panel cms-advisory-highlight" aria-labelledby="cms-advisory-title">
   <div className="cms-advisory-highlight-copy">
    <span className="cms-advisory-kicker">SERVICIO EMPRESARIAL</span>
    <h2 id="cms-advisory-title">Asesoría Empresarial</h2>
    <p>Auditorías externas de cumplimiento, prevención LA/FT/FP y capacitación para sujetos obligados. La página ya está incluida en el sistema, incluso si todavía está en borrador.</p>
    <Link href="/admin/personalizar/paginas/asesoria-empresarial" className="inline-link">Editar página, textos e imágenes <ArrowUpRight size={16}/></Link>
   </div>
   <div className="cms-advisory-highlight-actions">
    <span className={"cms-status "+(advisory.published?"cms-status-live":"cms-status-draft")}>{advisory.published?"Publicada":"Borrador"}</span>
    {advisory.published?<Link className="btn wizard-back" href="/asesoria-empresarial" target="_blank" rel="noopener noreferrer">Ver página <ArrowUpRight size={15}/></Link>:
     canEdit&&<PagePublicationAction slug={advisory.slug} title={advisory.title} published={false}/>}
    {!advisory.published&&<small>Disponible también en la pestaña «Borradores». Publicarla y añadirla al menú son acciones independientes.</small>}
   </div>
  </section>}
  {q.saved&&<p className="property-success" role="status">Estado de publicación actualizado correctamente.</p>}
  {q.error&&<p className="admin-error" role="alert">No se pudieron actualizar los datos. Comprueba los permisos.</p>}
  <section className="admin-panel cms-list-panel">
   <div className="cms-list-controls">
    <div className="cms-status-tabs">{tabs.map(t=><Link href={tabHref(t.id)} key={t.id}
      aria-current={status===t.id?"page":undefined}>{t.label} <span>{t.total}</span></Link>)}</div>
    <form action="/admin/personalizar/paginas" method="get" className="cms-search">
     <input type="hidden" name="estado" value={status}/>
     <label><Search size={16}/><input aria-label="Buscar páginas" name="buscar" defaultValue={q.buscar||""} placeholder="Buscar páginas" maxLength={90}/></label>
     <button type="submit" className="btn wizard-back">Buscar</button>
     {(search||status!=="todas")&&<Link href="/admin/personalizar/paginas" className="cms-clear-search"><X size={15}/> Limpiar</Link>}
    </form>
   </div>
   <div className="cms-table-wrap">
    <table className="cms-page-table">
     <thead><tr><th>Página</th><th>Estado</th><th>Dirección</th><th>Acciones</th></tr></thead>
     <tbody>{results.map(p=><tr key={p.id}>
      <td className="cms-page-name"><Link href={editingLocation(p)}>{p.title}</Link>
       <small>{p.builtIn?"Página del sitio":"Página personalizada"}</small></td>
      <td><span className={"cms-status "+(p.published?"cms-status-live":"cms-status-draft")}>{p.published?"Publicada":"Borrador"}</span></td>
      <td><code>{p.href}</code></td>
      <td><div className="cms-row-actions">
       <Link href={editingLocation(p)}>Editar</Link>
       {p.published&&<Link href={p.href} target="_blank" aria-label={"Ver "+p.title}>Ver <ArrowUpRight size={14}/></Link>}
       {canEdit&&p.id!=="home"&&<PagePublicationAction slug={p.slug} title={p.title} published={p.published}/>}
      </div></td>
     </tr>)}</tbody>
    </table>
    {!results.length&&<div className="cms-no-results"><strong>No se encontraron páginas.</strong>
     <p>{search||status!=="todas"?"Prueba otro filtro o limpia la búsqueda.":"Añade tu primera página desde el botón Nueva página."}</p></div>}
   </div>
   <div className="cms-list-footer"><span>{results.length} de {pages.length} páginas</span></div>
  </section>
  <p className="property-help">La portada siempre está publicada. Cada página se edita de forma independiente. <Link href="/admin/personalizar/inicio">Volver a Mi sitio web</Link>.</p>
 </>;
}
