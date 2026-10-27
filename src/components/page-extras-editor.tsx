"use client";
import {useEffect,useState,type FormEvent} from "react";
import {ArrowDown,ArrowUp,Heading2,AlignLeft,ImagePlus,Trash2,Save,Eye} from "lucide-react";
import {type PageSection,MAX_PAGE_SECTIONS} from "@/lib/page-sections";
import {PageSectionContent} from "@/components/page-section-content";
import {CmsMediaPicker} from "@/components/cms-media-picker";

type Variant=PageSection["type"];
export function PageExtrasEditor({slug,initial}:{slug:string;initial:PageSection[]}){
 const [sections,setSections]=useState(initial);
 const [uploading,setUploading]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState(false);
 const changed=JSON.stringify(sections)!==JSON.stringify(initial);
 useEffect(()=>{
  if(!changed||saving)return;
  const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
  window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);
 },[changed,saving]);
 const add=(type:Variant)=>setSections(old=>{
  if(old.length>=MAX_PAGE_SECTIONS)return old;
  const id="section-"+crypto.randomUUID();
  return [...old,type==="image"?{id,type,imageId:"",alt:"",caption:""}:{id,type,text:""}];
 });
 const edit=(id:string,value:Partial<PageSection>)=>setSections(old=>old.map(s=>s.id===id?{...s,...value} as PageSection:s));
 const move=(i:number,delta:number)=>{
  const j=i+delta;if(j<0||j>=sections.length)return;
  const next=[...sections];[next[i],next[j]]=[next[j],next[i]];setSections(next);
 };
 const remove=(id:string)=>setSections(old=>old.filter(s=>s.id!==id));
 async function upload(id:string,file?:File){
  if(!file||uploading)return;
  if(file.size<100||file.size>8*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type)){
   setError("Usa JPG, PNG o WebP de máximo 8 MB.");return;
  }
  setUploading(id);setError("");
  try{
   const form=new FormData();form.set("image",file);
   const r=await fetch("/api/admin/site-pages/"+encodeURIComponent(slug)+"/images",{method:"POST",body:form,credentials:"same-origin"});
   const json=await r.json() as {id?:string;error?:string};
   if(!r.ok||!json.id)throw Error(json.error||"La imagen no se pudo guardar.");
   edit(id,{imageId:json.id} as Partial<PageSection>);
  }catch(e){setError(e instanceof Error?e.message:"Error de conexión.");}
  finally{setUploading(null);}
 }
 function submit(e:FormEvent<HTMLFormElement>){
  const bad=sections.some(s=>s.type==="heading"?s.text.trim().length<2:
   s.type==="text"?s.text.trim().length===0:!s.imageId||s.alt.trim().length<3);
  if(bad||uploading){e.preventDefault();setError("Completa los textos, las imágenes y sus descripciones antes de guardar.");return;}
  setSaving(true);setError("");
 }
 return <div className="cms-extras-workspace">
  <form className="admin-panel cms-extras-panel" action={"/api/admin/site-extras/"+encodeURIComponent(slug)} method="post" onSubmit={submit}>
   <div className="cms-block-editor-head"><div>
    <h2>Secciones adicionales</h2>
    <p>Añade texto o imágenes sin modificar el diseño, el banner ni los elementos originales de esta página.</p>
   </div><span>{sections.length}/{MAX_PAGE_SECTIONS}</span></div>
   <input type="hidden" name="sections" value={JSON.stringify(sections)}/>
   <div className="cms-block-list">{sections.map((block,i)=><div className="cms-block-row" key={block.id}>
    <div className="cms-block-toolbar"><strong>{block.type==="heading"?"Encabezado":block.type==="image"?"Imagen":"Texto"} {i+1}</strong>
     <div className="cms-block-actions">
      <button type="button" onClick={()=>move(i,-1)} disabled={i===0} aria-label={"Subir sección "+(i+1)}><ArrowUp size={16}/></button>
      <button type="button" onClick={()=>move(i,1)} disabled={i===sections.length-1} aria-label={"Bajar sección "+(i+1)}><ArrowDown size={16}/></button>
      <button type="button" onClick={()=>remove(block.id)} aria-label={"Quitar sección "+(i+1)}><Trash2 size={16}/></button>
     </div>
    </div>
    {(block.type==="heading"||block.type==="text")&&<label>{block.type==="heading"?"Título de la sección":"Contenido"}
     {block.type==="heading"?<input value={block.text} maxLength={140} placeholder="Escribe el título" onChange={e=>edit(block.id,{text:e.target.value})}/>:
      <textarea value={block.text} rows={4} maxLength={1800} placeholder="Escribe el contenido" onChange={e=>edit(block.id,{text:e.target.value})}/>}
    </label>}
    {block.type==="image"&&<div className="cms-block-image">
     <label className="cms-block-image-pick"><ImagePlus size={16}/>{uploading===block.id?"Procesando...":block.imageId?"Cambiar imagen":"Subir imagen"}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)||saving}
       onChange={e=>{void upload(block.id,e.target.files?.[0]);e.target.value="";}}/>
     </label>
     <CmsMediaPicker targetSlug={slug} disabled={Boolean(uploading)||saving} onChoose={imageId=>edit(block.id,{imageId} as Partial<PageSection>)}/>
     {block.imageId&&<img src={"/api/admin/site-pages/"+encodeURIComponent(slug)+"/images/"+block.imageId} loading="lazy" alt={block.alt||"Imagen en edición"}/>}
     <label>Descripción de imagen para accesibilidad
      <input value={block.alt} maxLength={180} placeholder="Describe lo que se ve" onChange={e=>edit(block.id,{alt:e.target.value})}/>
     </label>
     <label>Pie de foto (opcional)<input value={block.caption} maxLength={220} onChange={e=>edit(block.id,{caption:e.target.value})}/></label>
    </div>}
   </div>)}</div>
   {!sections.length&&<p className="cms-block-empty">No hay secciones adicionales. Tu sitio seguirá mostrando sus contenidos habituales.</p>}
   <div className="cms-block-add">
    <button type="button" disabled={sections.length>=MAX_PAGE_SECTIONS} onClick={()=>add("heading")}><Heading2 size={17}/> Encabezado</button>
    <button type="button" disabled={sections.length>=MAX_PAGE_SECTIONS} onClick={()=>add("text")}><AlignLeft size={17}/> Texto</button>
    <button type="button" disabled={sections.length>=MAX_PAGE_SECTIONS} onClick={()=>add("image")}><ImagePlus size={17}/> Imagen</button>
   </div>
   {error&&<p className="admin-error" role="alert">{error}</p>}
   <div className="cms-extra-save"><button type="submit" className="btn btn-red" disabled={saving||Boolean(uploading)||!changed}>
    <Save size={16}/>{saving?"Guardando...":"Guardar secciones"}
   </button>{changed&&<span className="cms-unsaved" role="status">Cambios sin guardar</span>}</div>
  </form>
  <aside className="cms-live-preview" aria-label="Vista previa del contenido adicional">
   <div className="cms-preview-top"><Eye size={17}/> Vista previa <span>Sin publicar</span></div>
   <div className="cms-preview-body"><PageSectionContent slug={slug} preview sections={sections} body=""/></div>
   <p className="cms-preview-caption">El contenido adicional aparecerá en una sección propia, debajo del diseño existente.</p>
  </aside>
 </div>;
}
