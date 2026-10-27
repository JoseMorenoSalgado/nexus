"use client";
import {useState} from "react";
import {
 ArrowRight,BookOpen,BriefcaseBusiness,Building2,Check,Eye,
 LayoutTemplate,Monitor,Smartphone,GraduationCap,ShoppingBag
} from "lucide-react";
import {
 SITE_TEMPLATES,type SiteTemplateKey,type TemplateContent
} from "@/lib/site-template-registry";

type Listing={title:string;city:string;price:string;imageUrl:string|null};
type EstateCopy={eyebrow:string;heading:string;highlight:string;description:string;action:string};
type Props={
 current:SiteTemplateKey;
 variants:Record<SiteTemplateKey,TemplateContent>;
 businessName:string;
 estate:EstateCopy;
 listings:Listing[];
};

const illustrations={
 "real-estate":{label:"Catálogo inmobiliario",Icon:Building2},
 education:{label:"Institución educativa",Icon:GraduationCap},
 services:{label:"Empresa de servicios",Icon:BriefcaseBusiness},
 ecommerce:{label:"Comercio electrónico",Icon:ShoppingBag}
};

/**
 * All preview interactions stay in React state. Only the explicitly confirmed
 * HTML form below can POST to the authenticated /api/admin/site-template route.
 * This is an illustrative homepage preview, not a published site or an iframe.
 */
export function TemplateGallery({current,variants,businessName,estate,listings}:Props){
 const [selected,setSelected]=useState<SiteTemplateKey>(current);
 const [device,setDevice]=useState<"desktop"|"mobile">("desktop");
 const choice=SITE_TEMPLATES.find(t=>t.key===selected)!;
 const content=variants[selected];
 const isEstate=selected==="real-estate";
 const cards=isEstate
  ? listings.length?listings.map(l=>({title:l.title,description:l.city,price:l.price,imageUrl:l.imageUrl}))
   : [{title:"Inmueble destacado",description:"Catálogo de propiedades",price:"",imageUrl:null},
      {title:"Nuevas oportunidades",description:"Propiedades disponibles",price:"",imageUrl:null}]
  :content.cards.map(x=>({...x,price:"",imageUrl:null}));
 const label=isEstate?estate.eyebrow:content.eyebrow;
 const title=isEstate?estate.heading+" "+estate.highlight:content.headline;
 const text=isEstate?estate.description:content.description;
 const cta=isEstate?estate.action:content.actionLabel;
 const Icon=illustrations[selected].Icon;
 return <section className="admin-panel template-library" aria-labelledby="template-library-heading">
  <div className="template-library-heading">
   <div><div className="editor-panel-heading"><LayoutTemplate size={20} aria-hidden="true"/><h2 id="template-library-heading">Biblioteca de plantillas</h2></div>
    <p>Selecciona un diseño y revísalo antes de publicarlo. Explorar no modifica tu sitio.</p></div>
   <span className="template-library-count">{SITE_TEMPLATES.length} diseños</span>
  </div>
  <div className="template-choice-grid template-library-choices" role="radiogroup" aria-label="Seleccionar plantilla para visualizar">
   {SITE_TEMPLATES.map(template=>{
    const active=selected===template.key,live=current===template.key;
    const Thumb=illustrations[template.key].Icon;
    return <label key={template.key} className={"template-choice-card template-library-choice"+(active?" is-preview-selected":"")+(live?" is-current":"")}>
     <input type="radio" name="templatePreview" value={template.key} checked={active} onChange={()=>setSelected(template.key)}/>
     <span className={"template-miniature template-miniature-"+template.key} aria-hidden="true">
      <span className="template-miniature-bar"/><Thumb size={23}/>
      <span className="template-miniature-lines"><i/><i/><i/></span>
     </span>
     <span className="template-choice-copy">
      <span className="template-choice-title">{template.label} {live&&<small className="template-live-pill"><Check size={12}/> Actual</small>}</span>
      <small>{template.description}</small>
     </span>
    </label>;
   })}
  </div>
  <div className="template-preview-toolbar">
   <div><strong><Eye size={17} aria-hidden="true"/> Vista previa: {choice.label}</strong>
    <p>Representación orientativa de la portada con datos de tu empresa o de ejemplo.</p></div>
   <div className="template-device-toggle" role="group" aria-label="Tamaño de pantalla">
    <button type="button" aria-pressed={device==="desktop"} className={device==="desktop"?"is-active":""} onClick={()=>setDevice("desktop")}><Monitor size={17}/> <span>Escritorio</span></button>
    <button type="button" aria-pressed={device==="mobile"} className={device==="mobile"?"is-active":""} onClick={()=>setDevice("mobile")}><Smartphone size={17}/> <span>Celular</span></button>
   </div>
  </div>
  <div className={"template-preview-stage template-preview-stage-"+device}>
   <div className={"template-preview-frame template-preview-"+selected+" template-preview-device-"+device} aria-label={"Vista orientativa "+choice.label+" en "+(device==="desktop"?"escritorio":"celular")}>
    <div className="template-preview-browser"><span/><span/><span/><div>{businessName}</div></div>
    <div className="template-preview-website">
     <header className="template-preview-sitehead"><span className="template-preview-brand"><Icon size={21}/><strong>{businessName}</strong></span><span className="template-preview-menu">{device==="mobile"?"☰":"Inicio　 ·　 "+(isEstate?"Propiedades":"Servicios")+"　 ·　 Contacto"}</span></header>
     <main>
      <div className="template-preview-hero">
       <div className="template-preview-hero-content">
        <span className="template-preview-eyebrow">{label}</span>
        <h3>{title}</h3><p>{text}</p>
        <span className="template-preview-button">{cta}<ArrowRight size={14}/></span>
       </div>
       <div className="template-preview-hero-decoration" aria-hidden="true"><Icon size={55}/></div>
      </div>
      <section className="template-preview-section">
       <div className="template-preview-section-head"><strong>{isEstate?"Propiedades destacadas":selected==="education"?"Nuestros programas":"Nuestros servicios"}</strong><small>{isEstate?"Catálogo":selected==="education"?"Formación":"Soluciones"}</small></div>
       <div className="template-preview-card-grid">{cards.slice(0,3).map((item,i)=>
        <article className="template-preview-small-card" key={i}>
         <div className="template-preview-card-media">
          {item.imageUrl?<img src={item.imageUrl} alt=""/>:isEstate?<Building2 size={23} aria-hidden="true"/>:selected==="education"?<BookOpen size={22} aria-hidden="true"/>:<BriefcaseBusiness size={22} aria-hidden="true"/>}
         </div>
         <strong>{item.title}</strong><small>{item.description}</small>
         {item.price&&<span>{item.price}</span>}
        </article>
       )}</div>
      </section>
      <section className="template-preview-end"><div><strong>{isEstate?"Hablemos de tu próxima propiedad":content.contactTitle}</strong><small>{isEstate?"Un equipo listo para asesorarte":content.contactText}</small></div><span>Contacto <ArrowRight size={14}/></span></section>
     </main>
    </div>
   </div>
  </div>
  <div className="template-publish-controls" aria-live="polite">
   {selected===current?
    <p className="template-preview-safe"><Check size={17}/> Estás viendo la plantilla publicada actualmente. No se ha realizado ningún cambio.</p>:
    <div className="template-publish-confirm">
     <div><strong>¿Aplicar la plantilla {choice.label}?</strong><p>Esto cambiará el diseño público después de confirmar. Tu contenido anterior, propiedades y prospectos se conservarán.</p></div>
     <form method="post" action="/api/admin/site-template">
      <input type="hidden" name="intent" value="select"/>
      <input type="hidden" name="templateKey" value={selected}/>
      <button className="btn btn-red" type="submit">Confirmar y aplicar plantilla <ArrowRight size={16}/></button>
     </form>
    </div>}
  </div>
 </section>;
}
