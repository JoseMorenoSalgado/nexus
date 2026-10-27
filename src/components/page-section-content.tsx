import {type PageSection} from "@/lib/page-sections";

/** Shared public/preview renderer. Only plain text and tenant-owned image ids. */
export function PageSectionContent({body,sections=[],slug,preview=false}:{
 body:string;sections?:PageSection[];slug:string;preview?:boolean
}){
 const paragraphs=body.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 return <div className="site-section-content">
  {paragraphs.map((p,i)=><p key={"legacy-"+i} className="site-content-paragraph">{p}</p>)}
  {sections.map(section=>{
   if(section.type==="heading")return <h2 key={section.id} className="site-content-heading">{section.text}</h2>;
   if(section.type==="text")return <p key={section.id} className="site-content-paragraph">{section.text}</p>;
   if(!section.imageId)return null;
   const prefix=preview?"/api/admin/site-pages/":"/api/site-page-images/";
   const url=preview
    ?prefix+encodeURIComponent(slug)+"/images/"+section.imageId
    :prefix+encodeURIComponent(slug)+"/"+section.imageId;
   return <figure key={section.id} className="site-content-figure">
    <img src={url} alt={section.alt} loading="lazy" decoding="async"/>
    {section.caption&&<figcaption>{section.caption}</figcaption>}
   </figure>;
  })}
  {!paragraphs.length&&!sections.length&&<p>Información disponible próximamente.</p>}
 </div>;
}
