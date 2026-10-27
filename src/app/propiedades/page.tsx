import Link from "next/link";
import type {Metadata} from "next";
import {ArrowUpRight,Search,SlidersHorizontal,Building2,X} from "lucide-react";
import "./catalog-filters.css";
import {getPublicContext} from "@/lib/tenant";
import {getSiteTemplate} from "@/lib/site-template-store";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {notFound} from "next/navigation";
import {getCatalogPage,getCatalogLocationSuggestions,CATALOG_PAGE_SIZE,type CatalogSort} from "@/lib/catalog";
import {assertPagePublished} from "@/lib/site-pages";
import {PublicFrame} from "@/components/public-frame";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";
import {PageExtraSections} from "@/components/page-extra-sections";
import {PropertyCard} from "@/components/property-card";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Propiedades",description:"Explora inmuebles disponibles para compra o alquiler en Nicaragua."};
type Filters={operacion?:string;tipo?:string;ubicacion?:string;pagina?:string;orden?:string;precioMin?:string;precioMax?:string;ciudad?:string;codigo?:string};
export default async function Catalog({searchParams}:{searchParams:Promise<Filters>}){
 const raw=await searchParams;
 const orden:CatalogSort=raw.orden==="precio-asc"||raw.orden==="precio-desc"?raw.orden:"recientes";
 const parsePrice=(value:unknown)=>typeof value==="string"&&/^\d{1,10}(?:\.\d{1,2})?$/.test(value)&&Number(value)<=9999999999?Number(value):undefined;
 const rawMin=parsePrice(raw.precioMin),rawMax=parsePrice(raw.precioMax);
 const precioMin=rawMin!==undefined&&rawMax!==undefined&&rawMin>rawMax?undefined:rawMin;
 const precioMax=rawMin!==undefined&&rawMax!==undefined&&rawMin>rawMax?undefined:rawMax;
 const ciudad=typeof raw.ciudad==="string"?raw.ciudad.trim().slice(0,90):"";
 const codigo=typeof raw.codigo==="string"?raw.codigo.trim().slice(0,90):"";
 const f={ciudad,codigo,precioMin,precioMax,operacion:(raw.operacion||"").slice(0,20),tipo:(raw.tipo||"").slice(0,40),ubicacion:(raw.ubicacion||"").slice(0,90),orden};
 const {tenant,properties:demoProperties,demo}=await getPublicContext({loadProperties:false});
 if((await getSiteTemplate(tenant.id)).key!=="real-estate"||!await tenantModuleEnabled(tenant.id,"properties"))notFound();
 await assertPagePublished(tenant.id,demo,"propiedades");
 const requestedPage=/^[1-9]\d{0,5}$/.test(raw.pagina||"")?Number(raw.pagina):1;
 const normalizedLocation=f.ubicacion.toLocaleLowerCase();
 const normalizedType=f.tipo.toLocaleLowerCase();
 const demoMatching=demoProperties.filter(p=>
  (!ciudad||p.city.toLowerCase()===ciudad.toLowerCase())&&
  (!codigo||p.refCode.toLowerCase()===codigo.toLowerCase())&&
  (precioMin===undefined||p.price>=precioMin)&&
  (precioMax===undefined||p.price<=precioMax)&&
  (!f.operacion||p.operation===f.operacion)&&
  (!f.tipo||p.type.toLowerCase()===normalizedType)&&
  (!f.ubicacion||`${p.city} ${p.neighborhood}`.toLowerCase().includes(normalizedLocation))
 ).sort((a,b)=>orden==="precio-asc"?a.price-b.price:orden==="precio-desc"?b.price-a.price:0);
 const demoTotalPages=Math.max(1,Math.ceil(demoMatching.length/CATALOG_PAGE_SIZE));
 const demoPage=Math.min(requestedPage,demoTotalPages);
 const result=demo?{properties:demoMatching.slice((demoPage-1)*CATALOG_PAGE_SIZE,demoPage*CATALOG_PAGE_SIZE),count:demoMatching.length,currentPage:demoPage,totalPages:demoTotalPages}:await getCatalogPage(tenant.id,f,requestedPage);
 const matching=result.properties;
 const locations=demo?[...new Set(demoProperties.flatMap(p=>[p.city,p.neighborhood]).filter(Boolean))].slice(0,40):await getCatalogLocationSuggestions(tenant.id);
 const advancedActive=Boolean(ciudad||codigo||precioMin!==undefined||precioMax!==undefined);
 const filtersActive=Boolean(f.operacion||f.tipo||f.ubicacion||advancedActive||orden!=="recientes");
 const pageHref=(page:number)=>"/propiedades?"+new URLSearchParams({...Object.fromEntries(Object.entries(f).filter(([,v])=>v!==undefined&&v!=="").map(([k,v])=>[k,String(v)])),pagina:String(page)}).toString();
 return <PublicFrame tenant={tenant} demo={demo}><main id="contenido" data-nexus-inner-motion="catalogo"><NexusInnerMotion/>
  <section className="nexus-inner-hero nexus-catalog-hero"><div className="container">
   <span className="nexus-section-kicker nexus-kicker-light">CATÁLOGO INMOBILIARIO</span>
   <div className="nexus-inner-hero-row"><div>
    <h1>Propiedades para <em>cada nueva etapa.</em></h1>
    <p>Explora viviendas, terrenos y apartamentos disponibles para comprar o alquilar.</p>
   </div><div className="nexus-inner-label">EXPLORA TU PRÓXIMO ESPACIO</div></div>
  </div></section>
  <section className="nexus-section nexus-catalog-section"><div className="container">
   <form className="nexus-catalog-filter-card" method="get" action="/propiedades">
    <div className="nexus-catalog-filter-heading"><SlidersHorizontal size={20}/><strong>Filtrar propiedades</strong></div>
    <div className="nexus-search-form catalog-primary-filters">
     <label>Operación<select name="operacion" defaultValue={f.operacion}><option value="">Venta o alquiler</option><option value="venta">En venta</option><option value="alquiler">En alquiler</option></select></label>
     <label>Tipo de propiedad<select name="tipo" defaultValue={f.tipo}><option value="">Todos los tipos</option><option value="Casa">Casa</option><option value="Apartamento">Apartamento</option><option value="Terreno">Terreno</option></select></label>
     <label>Ciudad o zona<input name="ubicacion" list="catalog-locations" autoComplete="off" defaultValue={f.ubicacion} maxLength={90} placeholder="Buscar ubicación"/></label>
     <label>Ordenar por<select name="orden" defaultValue={orden}><option value="recientes">Más recientes</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option></select></label>
    </div>
    <datalist id="catalog-locations">{locations.map(place=><option key={place} value={place}/>)}</datalist>
    <details className="catalog-extra-filters" open={advancedActive}>
     <summary>Más filtros{advancedActive?" (activos)":""}</summary>
     <div className="catalog-extra-grid">
     <label>Ciudad exacta<input name="ciudad" defaultValue={ciudad} maxLength={90} placeholder="Ej. Granada"/></label>
     <label>Código de propiedad<input name="codigo" defaultValue={codigo} maxLength={90} placeholder="Referencia"/></label>
     <label>Precio mínimo<input type="number" name="precioMin" min="0" max="9999999999" step="0.01" defaultValue={precioMin??""} placeholder="Desde"/></label>
     <label>Precio máximo<input type="number" name="precioMax" min="0" max="9999999999" step="0.01" defaultValue={precioMax??""} placeholder="Hasta"/></label>
     </div>
    </details>
    <div className="catalog-filter-actions">
     <button className="btn btn-red" type="submit"><Search size={17}/> Aplicar filtros</button>
     <Link href="/propiedades" className="catalog-reset-filters"><X size={16}/> {filtersActive?"Limpiar filtros":"Ver todas las propiedades"}</Link>
    </div>
   </form>
   <div className="nexus-catalog-results"><div>
    <span className="nexus-section-kicker">DESCUBRE TU PRÓXIMO INMUEBLE</span>
    <h2>Propiedades <em>disponibles.</em></h2></div>
    <span className="nexus-catalog-count">{result.count} {result.count===1?"propiedad":"propiedades"} {demo?"(muestra)":""}</span>
   </div>
   {matching.length?<div className="property-grid nexus-featured-grid">{matching.map(p=><PropertyCard key={p.id} property={p}/>)}</div>:
   <div className="nexus-empty-listing"><Building2 size={33}/><h3>Sin propiedades que coincidan</h3><p>Prueba con otra ubicación o revisa todo el catálogo.</p><Link href="/propiedades" className="nexus-text-link">Ver todas las propiedades <ArrowUpRight size={17}/></Link></div>}
   {result.totalPages>1&&<nav aria-label="Páginas del catálogo" style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginTop:32}}>
    {result.currentPage>1&&<Link className="btn" href={pageHref(result.currentPage-1)}>Anterior</Link>}
    <span>Página {result.currentPage} de {result.totalPages}</span>
    {result.currentPage<result.totalPages&&<Link className="btn" href={pageHref(result.currentPage+1)}>Siguiente</Link>}
   </nav>}
  </div></section>
  <PageExtraSections tenantId={tenant.id} slug="propiedades" demo={demo}/>
 </main></PublicFrame>;
}
