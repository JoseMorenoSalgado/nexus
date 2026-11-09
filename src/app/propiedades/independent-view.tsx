import {PropertyMap} from "@/components/property-map";
import {getPropertyMapPoints} from "@/lib/property-map";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Search,ArrowLeft} from "lucide-react";
import {getStandalonePublicContext} from "@/lib/independent-public-context";
import {SiteNav} from "@/components/site-nav";
import {SiteFooter} from "@/components/site-footer";
import {PropertyCard} from "@/components/property-card";
import {PageExtraSections} from "@/components/page-extra-sections";
import {PageHeroMedia} from "@/components/page-hero-media";
import {assertPagePublished,getSiteMenu} from "@/lib/site-pages";
export const dynamic="force-dynamic";
type Filters=Record<string,string|string[]|undefined>;
export default async function StandaloneCatalog({searchParams}:{searchParams:Promise<Filters>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const [context,query]=await Promise.all([getStandalonePublicContext(),searchParams]);
 const raw=Object.fromEntries(Object.entries(query).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));
 if(!context)notFound();
 const {tenant}=context;
 await assertPagePublished("main",false,"propiedades");
 const links=await getSiteMenu("main");
 const operation=raw.operacion==="venta"||raw.operacion==="alquiler"?raw.operacion:"";
 const type=(raw.tipo||"").slice(0,80);
 const location=(raw.ubicacion||"").trim().slice(0,90).toLocaleLowerCase();
 const order=raw.orden==="precio-asc"||raw.orden==="precio-desc"?raw.orden:"recientes";
 const matches=context.properties.filter(p=>(!operation||p.operation===operation)&&(!type||p.type.toLocaleLowerCase()===type.toLocaleLowerCase())&&(!location||`${p.city} ${p.neighborhood}`.toLocaleLowerCase().includes(location)));
 if(order!=="recientes")matches.sort((a,b)=>order==="precio-asc"?a.price-b.price:b.price-a.price);
 const mapPoints=await getPropertyMapPoints(matches);
 const pageSize=12,pages=Math.max(1,Math.ceil(matches.length/pageSize));
 const page=Math.min(pages,/^[1-9]\d{0,4}$/.test(raw.pagina||"")?Number(raw.pagina):1);
 const pageHref=(n:number)=>"/propiedades?"+new URLSearchParams({...(operation?{operacion:operation}:{}),...(type?{tipo:type}:{}),...(location?{ubicacion:location}:{}),...(order!=="recientes"?{orden:order}:{}),pagina:String(n)}).toString();
 return <div className="public-site" style={{"--red":tenant.primaryColor,"--red-dark":tenant.primaryColor} as React.CSSProperties}>
  <SiteNav tenant={tenant} links={links}/>
  <main id="contenido">
   <section className="nexus-inner-hero nexus-catalog-hero">
    <PageHeroMedia slug="propiedades"/>
    <div className="container"><Link href="/" className="nexus-hero-secondary"><ArrowLeft size={16}/> Inicio</Link>
     <h1>Catálogo de <em>propiedades.</em></h1><p>Encuentra oportunidades de compra y alquiler en Nicaragua.</p>
    </div>
   </section>
   <section className="container nexus-section" aria-label="Buscar propiedades">
   <form action="/propiedades" method="get" className="nexus-search-form" style={{marginBottom:30}}>
    <label>Operación<select name="operacion" defaultValue={operation}><option value="">Todas</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
    <label>Tipo<select name="tipo" defaultValue={type}><option value="">Todos</option>{["Casa","Apartamento","Terreno","Local","Oficina"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    <label>Ubicación<input name="ubicacion" defaultValue={raw.ubicacion||""} maxLength={90} placeholder="Ciudad o sector"/></label>
    <label>Orden<select name="orden" defaultValue={order}><option value="recientes">Más recientes</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option></select></label>
    <button type="submit" className="btn btn-red"><Search size={17}/> Buscar</button>
   </form>
   <p>{matches.length} {matches.length===1?"propiedad encontrada":"propiedades encontradas"}</p>
   <div className={mapPoints.length?"catalog-map-layout":undefined}><div>
   {matches.length?<div className="property-grid" style={{marginTop:20}}>{matches.slice((page-1)*pageSize,page*pageSize).map(p=><PropertyCard key={p.id} property={p}/>)}</div>:<div className="nexus-empty-listing"><h2>No encontramos propiedades con esos filtros</h2><Link href="/propiedades">Ver todas las propiedades</Link></div>}
   {pages>1&&<nav aria-label="Paginación" style={{display:"flex",gap:14,marginTop:30}}>{page>1&&<Link href={pageHref(page-1)}>Anterior</Link>}<span>Página {page} de {pages}</span>{page<pages&&<Link href={pageHref(page+1)}>Siguiente</Link>}</nav>}
   </div>
   {mapPoints.length>0&&<PropertyMap points={mapPoints}/>}
   </div>
   </section>
   <PageExtraSections slug="propiedades"/>
  </main><SiteFooter tenant={tenant} links={links}/></div>;
}
