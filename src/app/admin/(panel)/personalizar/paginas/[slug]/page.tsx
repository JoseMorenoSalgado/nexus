import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getSiteTemplate} from "@/lib/site-template-store";
import {ArrowLeft,ExternalLink,Save,Building2} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {getCustomPage,textBlocks} from "@/lib/site-pages";
import {getSiteSettings} from "@/lib/site-settings";
import {prisma} from "@/lib/prisma";
import {CustomPageEditor} from "@/components/custom-page-editor";
import {SiteTextInput} from "@/components/site-text-input";
import {getPageDefinitions} from "@/lib/site-pages";
import {PageExtrasEditor} from "@/components/page-extras-editor";
import {PagePublicationAction} from "@/components/page-publication-action";
import {readExtraSections} from "@/lib/page-extras";
export const dynamic="force-dynamic";
type Field={name:string;label:string;max:number;multiline?:boolean;hint?:string};
type Builtin="home"|"propiedades"|"nosotros"|"servicios"|"contacto"|"asesoria-empresarial";
const sections:Record<Builtin,{title:string;description:string;path:string;fields:Field[]}>={
 home:{title:"Página de inicio",description:"Edita exclusivamente los textos del banner principal. Otros contenidos permanecen como estaban.",path:"/",
  fields:[
   {name:"heroEyebrow",label:"Texto superior",max:90},
   {name:"heroHeading",label:"Título principal",max:95},
   {name:"heroHighlight",label:"Frase destacada",max:90},
   {name:"heroDescription",label:"Descripción del banner",max:480,multiline:true},
   {name:"heroButton",label:"Texto del botón principal",max:45}
  ]},
 propiedades:{title:"Propiedades",description:"Configura el bloque de inmuebles destacados. El catálogo y las fotografías se gestionan en Propiedades.",path:"/propiedades",
  fields:[
   {name:"sectionEyebrow",label:"Etiqueta de sección",max:90},
   {name:"sectionHeading",label:"Título de propiedades destacadas",max:95},
   {name:"sectionHighlight",label:"Frase destacada",max:90},
   {name:"sectionDescription",label:"Descripción de la sección",max:320,multiline:true}
  ]},
 nosotros:{title:"Nosotros",description:"Administra los textos institucionales que aparecen en la página Nosotros y en la presentación de la portada.",path:"/nosotros",
  fields:[
   {name:"aboutTitle",label:"Título institucional",max:100},
   {name:"aboutDescription",label:"Descripción de la empresa",max:360,multiline:true},
   {name:"aboutMission",label:"Misión",max:400,multiline:true},
   {name:"aboutVision",label:"Visión",max:400,multiline:true}
  ]},
 servicios:{title:"Servicios",description:"Cada servicio tiene su propio contenido y se muestra en la página Servicios.",path:"/servicios",
  fields:[
   {name:"servicesHeading",label:"Encabezado de la página",max:110},
   {name:"servicesDescription",label:"Introducción",max:380,multiline:true},
   {name:"servicesSale",label:"Compra y venta",max:400,multiline:true},
   {name:"servicesRent",label:"Alquileres",max:400,multiline:true},
   {name:"servicesAdvice",label:"Asesoría inmobiliaria",max:400,multiline:true}
  ]},
 "asesoria-empresarial":{title:"Asesoría Empresarial",description:"Publica la asesoría en cumplimiento y añade textos e imágenes informativas.",path:"/asesoria-empresarial",fields:[]},
 contacto:{title:"Contacto",description:"Edita los mensajes y los canales de contacto que utilizarán tus visitantes.",path:"/contacto",
  fields:[
   {name:"contactHeading",label:"Título principal",max:100},
   {name:"contactHighlight",label:"Frase destacada",max:100},
   {name:"contactDescription",label:"Texto de invitación",max:360,multiline:true}
  ]}
};
const isBuiltin=(s:string):s is Builtin=>Object.prototype.hasOwnProperty.call(sections,s);
const canEditRole=(r:string)=>r==="admin"||r==="editor";
export default async function EditSitePage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{saved?:string;created?:string;blocksSaved?:string;error?:string}>}){
 const admin=await requireRole(["admin","editor"]);
 const {slug}=await params,q=await searchParams;
 const canEdit=canEditRole(admin.role);
 if(isBuiltin(slug)){
  const template=await getSiteTemplate(admin.tenantId);
  if(slug==="asesoria-empresarial"){
   if(template.key!=="real-estate")notFound();
   const [definitions,extras]=await Promise.all([getPageDefinitions(admin.tenantId),readExtraSections(admin.tenantId,"asesoria-empresarial")]);
   const published=definitions.some(page=>page.id==="asesoria-empresarial"&&page.published);
   return <>
    <div className="admin-heading"><div><Link href="/admin/personalizar/paginas" className="inline-link"><ArrowLeft size={16}/> Todas las páginas</Link>
     <h1>Asesoría Empresarial</h1><p>Auditoría externa, prevención LA/FT/FP y capacitaciones. Agrega textos e imágenes a esta página sin cambiar la inmobiliaria.</p></div>
     {published&&<Link href="/asesoria-empresarial" target="_blank" className="btn wizard-back">Ver página <ExternalLink size={16}/></Link>}
    </div>
    <div className="cms-publication-guide"><strong>{published?"Página publicada":"Página en borrador"}</strong>
     <span>{published?"Tu contenido ya es público. Puedes retirarlo cuando lo necesites.":"Puedes editar todo antes de publicarlo. Cuando publiques, añade el enlace en Menú principal."} <Link href="/admin/personalizar/menu">Organizar menú</Link>.</span>
    </div>
    <div className="cms-advisory-editor-publication"><PagePublicationAction slug="asesoria-empresarial" title="Asesoría Empresarial" published={published}/></div>
    {q.blocksSaved&&<p role="status" className="property-success">Contenido adicional guardado correctamente.</p>}
    {q.error&&<p role="alert" className="admin-error">{q.error==="imagenes"?"La imagen ya no está disponible. Vuelve a cargarla.":q.error==="secciones"?"Revisa los textos e imágenes.":"No fue posible guardar los contenidos."}</p>}
    <section className="cms-builtins-extras-intro"><h2>Material informativo e imágenes</h2>
     <p>Sube fotografías, infografías, encabezados o explicaciones sobre cumplimiento y formación.
     Se convierten a WebP y se almacenan por empresa. El contenido aparecerá al final de Asesoría Empresarial.</p></section>
    <PageExtrasEditor slug="asesoria-empresarial" initial={extras}/>
    <p className="property-help">El contenido legal introductorio y el formulario de solicitud se mantienen.
     Las imágenes y los textos de esta sección los puedes actualizar cuando lo necesites.</p>
   </>;
  }
  if(template.key!=="real-estate"){
   if(slug==="propiedades")notFound();
   const extra=await readExtraSections(admin.tenantId,slug);
   return <>
    <div className="admin-heading"><div><Link href="/admin/personalizar/paginas" className="inline-link"><ArrowLeft size={16}/> Todas las páginas</Link>
     <h1>Editar: {sections[slug].title}</h1><p>Agrega contenido adicional a esta página sin alterar los bloques y textos de tu plantilla.</p></div>
     <Link href="/admin/personalizar/plantilla" className="btn wizard-back">Editar textos de plantilla <ExternalLink size={16}/></Link>
    </div>
    {q.blocksSaved&&<p role="status" className="property-success">Secciones guardadas correctamente.</p>}
    {q.error&&<p role="alert" className="admin-error">{q.error==="imagenes"?"La fotografía seleccionada ya no está disponible. Cárgala de nuevo.":q.error==="secciones"?"Completa los encabezados y las descripciones de imágenes.":"No se pudieron guardar las secciones. Revisa tus permisos y vuelve a intentarlo."}</p>}
    <PageExtrasEditor slug={slug} initial={extra}/>
    <p className="property-help">Para cambiar el encabezado, los programas o los servicios principales, utiliza la edición de plantilla.</p>
   </>;
  }
  const [settings,properties,tenant,pageDefinitions,extraSections]=await Promise.all([
   getSiteSettings(admin.tenantId),
   slug==="propiedades"?prisma.property.findMany({where:{tenantId:admin.tenantId,published:true},
    select:{id:true,refCode:true,title:true},orderBy:{createdAt:"desc"},take:200}):Promise.resolve([]),
   slug==="contacto"?prisma.tenant.findUniqueOrThrow({where:{id:admin.tenantId},select:{contactEmail:true,whatsapp:true}}):Promise.resolve(null),
   getPageDefinitions(admin.tenantId),readExtraSections(admin.tenantId,slug)
  ]);
  const section=sections[slug];
  const isPublished=pageDefinitions.find(x=>x.id===slug)?.published!==false;
  return <>
   <div className="admin-heading"><div><Link href="/admin/personalizar/paginas" className="inline-link"><ArrowLeft size={16}/> Todas las páginas</Link>
    <h1>Editar: {section.title}</h1><p>{section.description}</p></div>
    {isPublished&&<Link className="btn wizard-back" href={section.path} target="_blank">Ver página <ExternalLink size={16}/></Link>}
   </div>
   {q.saved&&<p role="status" className="property-success">Cambios de {section.title} guardados correctamente. No se modificaron las demás páginas.</p>}
   {q.error&&<p role="alert" className="admin-error">No se pudieron guardar los cambios. Verifica los datos y tus permisos.</p>}
   {canEdit?<form className="admin-panel site-page-editor site-section-independent" action="/api/admin/site-section" method="post">
    <input type="hidden" name="section" value={slug}/>
    <div className="cms-editor-section-heading"><div><h2>Contenido de {section.title.toLowerCase()}</h2><p>Los cambios se aplican exclusivamente a esta sección cuando pulses Guardar.</p></div></div>
    <div className="cms-editor-status-line"><span className={"cms-status "+(isPublished?"cms-status-live":"cms-status-draft")}>{isPublished?"Página publicada":"Página en borrador"}</span><Link href="/admin/personalizar/paginas">Gestionar publicación</Link></div>
    {section.fields.map(f=><SiteTextInput key={f.name} name={f.name} label={f.label} value={settings[f.name as keyof typeof settings] as string} max={f.max} multiline={f.multiline} hint={f.hint}/>)}
    {slug==="propiedades"&&<div className="site-featured-picker">
     <strong>Elegir propiedades destacadas (máximo 3)</strong>
     <p>Estas propiedades aparecen en la portada. Solo se pueden destacar inmuebles publicados.</p>
     {properties.map(p=><label key={p.id}>
      <input type="checkbox" name="featuredIds" value={p.id} defaultChecked={settings.featuredIds.includes(p.id)}/>
      <span><strong>{p.refCode}</strong> · {p.title}</span>
     </label>)}
     {!properties.length&&<p>Aún no hay inmuebles publicados.</p>}
     <Link className="inline-link" href="/admin/propiedades">Administrar inmuebles <Building2 size={15}/></Link>
    </div>}
    {slug==="contacto"&&<div className="site-page-contact-fields">
     <label>WhatsApp (con código de país)<input name="whatsapp" maxLength={35} defaultValue={tenant?.whatsapp||""} placeholder="50588888888" inputMode="tel"/></label>
     <label>Correo electrónico<input type="email" name="contactEmail" maxLength={180} defaultValue={tenant?.contactEmail||""} placeholder="contacto@empresa.com"/></label>
    </div>}
    <div className="site-page-form-actions"><button type="submit" className="btn btn-red"><Save size={17}/> Guardar esta página</button>
     <Link className="btn wizard-back" href="/admin/personalizar/paginas">Volver a páginas</Link></div>
   </form>:<p className="admin-error">Tu cuenta no tiene permisos de edición.</p>}
   <section className="cms-builtins-extras-intro"><h2>Agregar contenido visual</h2><p>Estas secciones son independientes del formulario anterior. Puedes añadir encabezados, textos o imágenes sin modificar el contenido del banner ni otras páginas.</p></section>
   {q.blocksSaved&&<p role="status" className="property-success">Secciones adicionales guardadas correctamente.</p>}
   <PageExtrasEditor slug={slug} initial={extraSections}/>
   <p className="property-help">Las propiedades, menú y colores corporativos se administran por separado para evitar modificaciones accidentales.</p>
  </>;
 }
 const page=await getCustomPage(admin.tenantId,slug);
 if(!page)notFound();
 const blocks=textBlocks(page.blocks);
 return <>
  <div className="admin-heading"><div><Link className="inline-link" href="/admin/personalizar/paginas"><ArrowLeft size={16}/> Todas las páginas</Link>
   <h1>Editar: {page.title}</h1><p>Página independiente con su propio contenido y estado de publicación.</p></div>
   {page.published&&<Link href={"/pagina/"+slug} target="_blank" className="btn wizard-back">Ver página <ExternalLink size={16}/></Link>}</div>
  {(q.saved||q.created)&&<p className="property-success" role="status">Página {q.created?"creada":"actualizada"} correctamente.</p>}
  {q.error&&<p className="admin-error" role="alert">{q.error==="imagenes"?"La imagen elegida no se encuentra guardada en esta página. Cárgala nuevamente.":q.error==="secciones"?"Revisa los textos y las descripciones de los bloques.": "No se pudo guardar la página. Comprueba los textos y el estado de publicación."}</p>}
  {canEdit?<CustomPageEditor mode="edit" slug={slug} title={page.title}
    summary={blocks.summary} body={blocks.body} sections={blocks.sections} published={page.published}/>:
    <p className="admin-error">No tienes permisos para editar.</p>}

 </>;
}
