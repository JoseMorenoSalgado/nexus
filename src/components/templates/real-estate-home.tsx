import Link from "next/link";
import {ArrowRight,ArrowUpRight,Building2,KeyRound,Search,ShieldCheck,CheckCircle2} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import type {PublicProperty} from "@/lib/demo";
import {getPageDefinitions} from "@/lib/site-pages";
import {PropertyCard} from "@/components/property-card";
import {PublicFrame} from "@/components/public-frame";
import {ContactForm} from "@/components/contact-form";
import {PageExtraSections} from "@/components/page-extra-sections";
import {NexusHomeMotion} from "@/components/nexus-home-motion";
const DEFAULT_EYEBROW="NEXUS REAL ESTATE · NICARAGUA";
const services=[
 {href:"/servicios#comprar",Icon:Building2,title:"Compra y venta",desc:"Opciones para encontrar una vivienda o explorar oportunidades inmobiliarias."},
 {href:"/servicios#alquilar",Icon:KeyRound,title:"Alquileres",desc:"Alternativas para vivir o establecer tu proyecto según tus necesidades."},
 {href:"/servicios#asesoria",Icon:ShieldCheck,title:"Acompañamiento",desc:"Información clara y atención directa para tomar decisiones con confianza."}
];
export async function RealEstateHome(){
 const {tenant,properties:demoProperties,demo,settings,heroImage}=await getPublicContext({loadProperties:false});
 const published=demo?new Set(["home","propiedades","nosotros","servicios","contacto"]):
  new Set((await getPageDefinitions(tenant.id)).filter(p=>p.published).map(p=>p.id));
 const visible=(page:string)=>published.has(page);
 // Do not load every listing and photo for three homepage cards.
 const displayed:PublicProperty[]=demo?
  (settings.featuredIds.length?demoProperties.filter(p=>settings.featuredIds.includes(p.id)).sort((a,b)=>settings.featuredIds.indexOf(a.id)-settings.featuredIds.indexOf(b.id)):demoProperties).slice(0,3):
  await (async()=>{
   if(!visible("propiedades"))return [];
   const where={tenantId:tenant.id,published:true};
   const select={id:true,slug:true,refCode:true,title:true,description:true,city:true,neighborhood:true,type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,photos:{orderBy:{sortOrder:"asc" as const},take:1,select:{url:true}}};
   const featured=settings.featuredIds.length?await prisma.property.findMany({where:{...where,id:{in:settings.featuredIds.slice(0,3)}},select,take:3}):[];
   const rows=featured.length?featured:await prisma.property.findMany({where,select,take:3,orderBy:{createdAt:"desc"}});
   if(featured.length)rows.sort((a,b)=>settings.featuredIds.indexOf(a.id)-settings.featuredIds.indexOf(b.id));
   return rows.map(p=>({id:p.id,slug:p.slug,refCode:p.refCode,title:p.title,description:p.description,city:p.city,neighborhood:p.neighborhood||"",type:p.type,operation:p.operation==="alquiler"?"alquiler" as const:"venta" as const,price:Number(p.price),bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,areaM2:p.areaM2||0,image:p.photos[0]?.url||"",photos:p.photos.map(photo=>photo.url)}));
  })();
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" data-nexus-home-motion>
   <NexusHomeMotion/>
   <section className={"nexus-hero"+(heroImage?" nexus-hero-custom":"")}>
    <div className="container nexus-hero-layout nexus-hero-layout-simple">
     <div className="nexus-hero-copy">
      <p className="nexus-eyebrow-on-dark"><span className="nexus-eyebrow-line"/> {settings.heroEyebrow===DEFAULT_EYEBROW?tenant.name.toUpperCase()+" · NICARAGUA":settings.heroEyebrow}</p>
      <h1>{settings.heroHeading} <em>{settings.heroHighlight}</em></h1>
      <p className="nexus-hero-lead">{settings.heroDescription}</p>
      <div className="nexus-hero-actions">
       {visible("propiedades")&&<Link href="/propiedades" className="btn nexus-hero-primary">{settings.heroButton}<ArrowUpRight size={18}/></Link>}
       {visible("nosotros")&&<Link href="/nosotros" className="nexus-hero-secondary">Conócenos <ArrowRight size={17}/></Link>}
      </div>
     </div>
    </div>
   </section>

   {visible("propiedades")&&<section className="nexus-search-wrap" aria-label="Buscador de inmuebles">
    <div className="container">
     <div className="nexus-search-header"><strong>Encuentra tu próxima propiedad</strong><span>Busca entre las opciones disponibles</span></div>
     <form method="get" action="/propiedades" className="nexus-search-form">
      <label>Operación<select name="operacion" defaultValue=""><option value="">Comprar o alquilar</option><option value="venta">Comprar</option><option value="alquiler">Alquilar</option></select></label>
      <label>Tipo de inmueble<select name="tipo" defaultValue=""><option value="">Cualquier tipo</option><option value="Casa">Casa</option><option value="Apartamento">Apartamento</option><option value="Terreno">Terreno</option></select></label>
      <label>Ubicación<input name="ubicacion" placeholder="Ciudad o sector" maxLength={90}/></label>
      <button className="btn btn-red" type="submit"><Search size={19}/> Buscar inmuebles</button>
     </form>
    </div>
   </section>}

   {visible("propiedades")&&<section className="nexus-section nexus-featured" aria-labelledby="featured-title">
    <div className="container">
     <div className="nexus-section-heading">
      <div><span className="nexus-section-kicker">{settings.sectionEyebrow}</span>
       <h2 id="featured-title">{settings.sectionHeading} <em>{settings.sectionHighlight}</em></h2>
       <p>{settings.sectionDescription}</p>
      </div>
      <Link href="/propiedades" className="nexus-text-link">Ver catálogo completo <ArrowUpRight size={19}/></Link>
     </div>
     {demo&&<p className="demo-note">Propiedades de demostración: los precios y características son ilustrativos.</p>}
     {displayed.length?<div className="property-grid nexus-featured-grid">{displayed.map(p=><PropertyCard key={p.id} property={p}/>)}</div>:
      <div className="nexus-empty-listing"><Building2 size={32}/><h3>Próximamente, nuevas oportunidades</h3><p>Estamos preparando nuestro catálogo inmobiliario.</p>{visible("contacto")&&<Link href="/contacto" className="nexus-text-link">Cuéntanos qué buscas <ArrowUpRight size={16}/></Link>}</div>}
    </div>
   </section>}

   {visible("servicios")&&<section className="nexus-section nexus-services-preview">
    <div className="container">
     <div className="nexus-section-heading nexus-services-heading"><div><span className="nexus-section-kicker">A TU LADO EN CADA PASO</span>
      <h2>Más que propiedades, <em>soluciones.</em></h2>
      <p>Un servicio inmobiliario cercano, con opciones para tus diferentes objetivos.</p></div>
      <Link href="/servicios" className="nexus-text-link">Conocer servicios <ArrowUpRight size={18}/></Link>
     </div>
     <div className="nexus-services-grid">{services.map(({href,Icon,title,desc})=><Link href={href} key={href} className="nexus-service-card">
      <span className="nexus-service-top"><Icon size={27} strokeWidth={1.65}/></span>
      <h3>{title}</h3><p>{desc}</p><span className="nexus-service-more">Conocer más <ArrowUpRight size={18}/></span>
     </Link>)}</div>
    </div>
   </section>}

   {visible("asesoria-empresarial")&&<section className="nexus-section nexus-advisory-home" aria-labelledby="advisory-home-title">
    <div className="container nexus-advisory-home-row">
     <div className="nexus-advisory-home-mark"><ShieldCheck size={31}/></div>
     <div><span className="nexus-section-kicker">NUEVA ÁREA DE SERVICIOS</span>
      <h2 id="advisory-home-title">Asesoría empresarial y <em>cumplimiento normativo.</em></h2>
      <p>Auditoría externa, prevención LA/FT/FP y capacitación para sujetos obligados, conforme al marco legal aplicable en Nicaragua.</p></div>
     <Link href="/asesoria-empresarial" className="btn nexus-advisory-home-button">Conoce nuestra asesoría <ArrowUpRight size={18}/></Link>
    </div>
   </section>}

   {visible("nosotros")&&<section className="nexus-section nexus-story">
    <div className="container nexus-story-layout">
     <div className="nexus-story-panel">
      <span className="nexus-section-kicker">CONOCE NUESTRA ESENCIA</span>
      <h2>La propiedad importa. <em>Las personas, más.</em></h2>
      <p>{settings.aboutDescription}</p>
      <Link href="/nosotros" className="btn nexus-story-button">Descubre quiénes somos <ArrowUpRight size={17}/></Link>
     </div>
     <div className="nexus-story-steps">
      <div><span><CheckCircle2 size={21}/></span><div><strong>Escuchamos tus necesidades</strong><p>Conocemos tus preferencias y objetivos antes de presentarte opciones.</p></div></div>
      <div><span><Search size={21}/></span><div><strong>Exploramos alternativas</strong><p>Te ayudamos a identificar inmuebles que se ajusten a lo que buscas.</p></div></div>
      <div><span><ShieldCheck size={21}/></span><div><strong>Te acompañamos</strong><p>Respondemos tus dudas y facilitamos la comunicación durante el proceso.</p></div></div>
     </div>
    </div>
   </section>}

   {visible("contacto")&&<section className="nexus-section nexus-contact-home">
    <div className="container nexus-contact-home-layout">
     <div><span className="nexus-section-kicker nexus-kicker-light">HABLEMOS DE TU PRÓXIMO PASO</span>
      <h2>{settings.contactHeading} <em>{settings.contactHighlight}</em></h2>
      <p>{settings.contactDescription}</p>
      <Link href="/contacto" className="nexus-contact-page-link">Ver información de contacto <ArrowUpRight size={18}/></Link>
     </div>
     <div className="nexus-lead-panel"><span>TE ESCUCHAMOS</span><h3>¿Qué propiedad tienes en mente?</h3>
      {demo?<p className="preview-form-note">El formulario se habilitará cuando el sitio tenga una instalación activa.</p>:<ContactForm/>}
     </div>
    </div>
   </section>}
   <PageExtraSections tenantId={tenant.id} slug="home" demo={demo}/>
  </main>
 </PublicFrame>;
}
