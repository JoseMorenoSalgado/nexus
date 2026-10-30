import Link from "next/link";
import {Building2,MapPin,Pencil,Plus,Search,Image as ImageIcon,ExternalLink,Users,X} from "lucide-react";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth";
import {propertyWhere} from "@/lib/agent-scope";
export const dynamic="force-dynamic";
type Filters={q?:string;status?:string;operation?:string;page?:string;updated?:string;deleted?:string;error?:string};
const money=(x:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(x);
export default async function AdminProperties({searchParams}:{searchParams:Promise<Filters>}){
 const admin=await requireRole(["admin","editor","agente"]);
 const x=await searchParams;
 const q=(x.q||"").trim().slice(0,70),status=x.status||"",operation=x.operation||"";
 const page=Math.max(1,Math.min(10000,Number.parseInt(x.page||"1",10)||1));
 const where={
  ...propertyWhere(admin),
  ...(q?{OR:[{title:{contains:q}},{refCode:{contains:q}},{city:{contains:q}}]}:{}),
  ...(status==="publicada"?{published:true}:status==="borrador"?{published:false}:{}),
  ...(["venta","alquiler"].includes(operation)?{operation}:{})
 };
 const sequence=admin.roles.includes("admin")?await prisma.propertySequence.findUnique({where:{tenantId:admin.tenantId}}):null;
 const [total,rows,activeCount,draftCount]=await Promise.all([
  prisma.property.count({where}),
  prisma.property.findMany({where,select:{id:true,slug:true,title:true,refCode:true,city:true,neighborhood:true,price:true,operation:true,published:true,bedrooms:true,bathrooms:true,areaM2:true,photos:{select:{url:true},orderBy:{sortOrder:"asc"},take:1}},orderBy:{createdAt:"desc"},skip:(page-1)*12,take:12}),
  prisma.property.count({where:{...propertyWhere(admin),published:true}}),
  prisma.property.count({where:{...propertyWhere(admin),published:false}})
 ]);
 const filters=new URLSearchParams();
 if(q)filters.set("q",q);
 if(status==="publicada"||status==="borrador")filters.set("status",status);
 if(operation==="venta"||operation==="alquiler")filters.set("operation",operation);
 const queryUrl=(next:URLSearchParams)=>"/admin/propiedades"+(next.size?"?"+next.toString():"");
 const nextUrl=(p:number)=>{const params=new URLSearchParams(filters);params.set("page",String(p));return queryUrl(params);};
 const statusUrl=(value:""|"publicada"|"borrador")=>{const params=new URLSearchParams(filters);params.delete("page");if(value)params.set("status",value);else params.delete("status");return queryUrl(params);};
 const isFiltered=filters.size>0;
 const canEdit=admin.roles.some(r=>["admin","editor","agente"].includes(r));
 return <>
  <div className="admin-heading"><div><h1>Propiedades</h1><p>Organiza, publica y administra el catálogo de tu inmobiliaria.</p></div>{canEdit&&<Link href="/admin/propiedades/nueva" className="btn btn-red"><Plus size={18}/> Nueva propiedad</Link>}</div>
  {admin.roles.includes("admin")&&<details className="admin-panel editor-disclosure"><summary><strong>Configurar referencia automática</strong></summary><div className="editor-disclosure-body"><p className="property-help">Los códigos anteriores no cambian. Próximo número: {sequence?.nextNumber||1}.</p><form method="post" action="/api/admin/properties/reference-settings" className="admin-form"><label>Prefijo de la empresa<input name="prefix" defaultValue={sequence?.prefix||"NRE"} pattern="[A-Z][A-Z0-9-]{0,10}[A-Z0-9]" minLength={2} maxLength={12} required/></label><button className="btn wizard-back" type="submit">Guardar prefijo</button></form></div></details>}
  {(x.updated||x.deleted)&&<div className="property-success" role="status">{x.deleted?"Propiedad eliminada.":"Estado de publicación actualizado."}</div>}
  {x.error&&<div className="admin-error" role="alert">No fue posible completar la operación solicitada.</div>}
  <nav className="admin-quick-filters" aria-label="Estado de las propiedades">
   <Link href={statusUrl("")} aria-current={!status?"page":undefined} className={!status?"selected":""}>Todas <strong>{activeCount+draftCount}</strong></Link>
   <Link href={statusUrl("publicada")} aria-current={status==="publicada"?"page":undefined} className={status==="publicada"?"selected":""}>Publicadas <strong>{activeCount}</strong></Link>
   <Link href={statusUrl("borrador")} aria-current={status==="borrador"?"page":undefined} className={status==="borrador"?"selected":""}>Borradores <strong>{draftCount}</strong></Link>
  </nav>
  <form method="get" className="property-filters" action="/admin/propiedades">
   <label><span>Buscar inmuebles</span><div className="property-search"><Search size={17}/><input name="q" placeholder="Referencia, nombre o ciudad" defaultValue={q}/></div></label>
   <label><span>Estado</span><select name="status" defaultValue={status}><option value="">Todos</option><option value="publicada">Publicadas</option><option value="borrador">Borradores</option></select></label>
   <label><span>Operación</span><select name="operation" defaultValue={operation}><option value="">Todas</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
   <div className="admin-filter-actions"><button className="btn btn-dark" type="submit">Buscar</button>{isFiltered&&<Link href="/admin/propiedades" className="admin-clear-filters"><X size={15}/> Limpiar</Link>}</div>
  </form>
  <div className="property-result-heading"><strong>{total} resultados</strong><span>Página {page} de {Math.max(1,Math.ceil(total/12))}</span></div>
  {rows.length?<div className="property-admin-grid property-list-compact">{rows.map(item=>{
   const photo=item.photos[0];
   const label=[item.bedrooms?item.bedrooms+" hab.":null,item.bathrooms?item.bathrooms+" baños":null,item.areaM2?item.areaM2+" m²":null].filter(Boolean).join(" · ");
   return <article key={item.id} className="property-admin-card">
    <div className="property-admin-photo">{photo?<img loading="lazy" src={photo.url} alt={item.title}/>:<div className="property-photo-placeholder"><ImageIcon size={23}/><span>Sin foto</span></div>}</div>
    <div className="property-admin-content">
     <div className="property-admin-code"><strong>{item.refCode}</strong><span className={"property-admin-status "+(item.published?"is-published":"is-draft")}>{item.published?"Publicada":"Borrador"}</span></div>
     <h2><Link href={"/admin/propiedades/"+encodeURIComponent(item.id)+"/editar"}>{item.title}</Link></h2>
     <div className="property-admin-location"><MapPin size={14}/>{[item.neighborhood,item.city].filter(Boolean).join(", ")||"Ubicación por completar"}</div>
     {label&&<small className="property-admin-specs">{label}</small>}
    </div>
    <div className="property-admin-controls">
     <div className="property-admin-amount"><strong>{money(Number(item.price))}</strong><small>{item.operation==="venta"?"En venta":"En alquiler"}</small></div>
     <div className="property-admin-actions">
      <Link href={"/admin/propiedades/"+encodeURIComponent(item.id)+"/editar"} className="btn wizard-back"><Pencil size={15}/> Editar</Link>
      <Link href={"/admin/leads?q="+encodeURIComponent(item.refCode)} className="admin-row-link"><Users size={15}/> Prospectos</Link>
      {item.published&&<Link className="admin-row-link admin-view-link" target="_blank" rel="noopener noreferrer" href={"/propiedades/"+encodeURIComponent(item.slug)}><ExternalLink size={15}/> Ver sitio</Link>}
      <form method="post" action={"/api/admin/properties/"+encodeURIComponent(item.id)}><input type="hidden" name="intent" value={item.published?"unpublish":"publish"}/><button type="submit" className="btn btn-text">{item.published?"Ocultar":"Publicar"}</button></form>
     </div>
    </div>
   </article>;
  })}</div>:<div className="property-empty"><Building2 size={30}/><h2>{isFiltered?"No hay propiedades con esos filtros":"Tu catálogo está vacío"}</h2><p>{isFiltered?"Prueba otra búsqueda o limpia los filtros.":"Registra tu primer inmueble para empezar."}</p><div className="admin-empty-actions">{isFiltered&&<Link className="btn wizard-back" href="/admin/propiedades">Limpiar filtros</Link>}{!isFiltered&&canEdit&&<Link href="/admin/propiedades/nueva" className="btn btn-red"><Plus size={16}/> Nueva propiedad</Link>}</div></div>}
  {total>12&&<div className="property-pagination">{page>1&&<Link className="btn wizard-back" href={nextUrl(page-1)}>← Anterior</Link>}{page*12<total&&<Link className="btn wizard-back" href={nextUrl(page+1)}>Siguiente →</Link>}</div>}
 </>;
}
