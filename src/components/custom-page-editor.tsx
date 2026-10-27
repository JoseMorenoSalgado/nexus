"use client";
import {useEffect,useMemo,useState,type FormEvent,type MouseEvent} from "react";
import Link from "next/link";
import {
 ArrowLeft,ArrowDown,ArrowUp,Eye,FileText,Globe2,LockKeyhole,Plus,Save,
 Heading2,AlignLeft,ImagePlus,Trash2
} from "lucide-react";
import {type PageSection,MAX_PAGE_SECTIONS} from "@/lib/page-sections";
import {PageSectionContent} from "@/components/page-section-content";
import {CmsMediaPicker} from "@/components/cms-media-picker";

type EditorProps={mode:"create"|"edit";slug?:string;title?:string;summary?:string;body?:string;published?:boolean;sections?:PageSection[]};
function slugify(value:string){
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,65).replace(/-+$/,"");
}
type TypeChoice=PageSection["type"];

export function CustomPageEditor({
 mode,slug:storedSlug,title:initialTitle="",summary:initialSummary="",
 body:initialBody="",published:initialPublished=false,sections:initialSections=[]
}:EditorProps){
 const [title,setTitle]=useState(initialTitle);
 const [slug,setSlug]=useState(storedSlug||"");
 const [slugChanged,setSlugChanged]=useState(false);
 const [summary,setSummary]=useState(initialSummary);
 const [body,setBody]=useState(initialBody);
 const [sections,setSections]=useState<PageSection[]>(initialSections);
 const [published,setPublished]=useState(initialPublished);
 const [submitting,setSubmitting]=useState(false);
 const [busyImage,setBusyImage]=useState<string|null>(null);
 const [editorError,setEditorError]=useState("");
 const paragraphs=useMemo(()=>body.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),[body]);
 const destination=mode==="create"?"/api/admin/site-pages":"/api/admin/site-pages/"+encodeURIComponent(storedSlug||"");
 const previewPath="/pagina/"+(slug||"tu-pagina");
 const isEdited=title!==initialTitle||summary!==initialSummary||body!==initialBody||published!==initialPublished
  ||JSON.stringify(sections)!==JSON.stringify(initialSections)||(mode==="create"&&slug.length>0);
 const textCount=body.trim().length;

 useEffect(()=>{
  if(!isEdited||submitting)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return ()=>window.removeEventListener("beforeunload",warn);
 },[isEdited,submitting]);
 const confirmLeave=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(isEdited&&!submitting&&!window.confirm("Hay cambios sin guardar. ¿Quieres salir sin guardarlos?"))event.preventDefault();
 };
 const add=(type:TypeChoice)=>{
  if(sections.length>=MAX_PAGE_SECTIONS)return;
  const id="section-"+crypto.randomUUID();
  const next:PageSection=type==="image"
    ?{id,type:"image",imageId:"",alt:"",caption:""}
    :{id,type,text:""};
  setSections(current=>[...current,next]);
  setEditorError("");
 };
 const update=(id:string,updates:Partial<PageSection>)=>setSections(current=>current.map(section=>
  section.id===id?{...section,...updates} as PageSection:section
 ));
 const move=(index:number,delta:number)=>{
  const target=index+delta;
  if(target<0||target>=sections.length)return;
  const next=[...sections];[next[index],next[target]]=[next[target],next[index]];setSections(next);
 };
 const remove=(id:string)=>{
  const section=sections.find(x=>x.id===id);
  if(section?.type==="image"&&section.imageId&&!window.confirm("¿Quitar esta imagen de la página? La imagen seguirá almacenada hasta su limpieza. No se borrará la página."))return;
  setSections(current=>current.filter(x=>x.id!==id));
 };
 async function uploadImage(id:string,file?:File){
  if(!file||mode!=="edit"||!storedSlug||busyImage)return;
  setEditorError("");
  if(file.size>8*1024*1024||file.size<100||!["image/jpeg","image/png","image/webp"].includes(file.type)){
   setEditorError("Selecciona una imagen JPG, PNG o WebP de hasta 8 MB.");return;
  }
  setBusyImage(id);
  try{
   const data=new FormData();data.set("image",file);
   const response=await fetch("/api/admin/site-pages/"+encodeURIComponent(storedSlug)+"/images",{
    method:"POST",body:data,credentials:"same-origin",cache:"no-store"
   });
   const json=await response.json() as {id?:string;error?:string};
   if(!response.ok||!json.id)throw Error(json.error||"No fue posible subir la imagen.");
   // Require an intentional description instead of assuming the file name is accessible.
   update(id,{imageId:json.id} as Partial<PageSection>);
  }catch(e){setEditorError(e instanceof Error?e.message:"Error al subir la imagen.");}
  finally{setBusyImage(null);}
 }
 function submit(event:FormEvent<HTMLFormElement>){
  const incomplete=sections.some(s=>s.type==="heading"?s.text.trim().length<2:
   s.type==="text"?s.text.trim().length<1:!s.imageId||s.alt.trim().length<3);
  if(incomplete||busyImage){
   event.preventDefault();
   setEditorError("Completa el texto de cada sección y añade una descripción a cada imagen antes de guardar.");
   return;
  }
  setEditorError("");setSubmitting(true);
 }
 return <div className="cms-page-workspace">
  <form className="admin-panel site-page-editor cms-page-editor-form" action={destination} method="post" onSubmit={submit}>
   <div className="cms-editor-section-heading"><FileText size={18} aria-hidden="true"/><div><h2>Contenido de la página</h2>
    <p>Modifica textos, añade secciones y comprueba su presentación antes de guardar.</p></div></div>
   <label>Título de la página
    <input name="title" value={title} onChange={e=>{const next=e.target.value;setTitle(next);if(mode==="create"&&!slugChanged)setSlug(slugify(next));}}
      required minLength={3} maxLength={90} placeholder="Ej. Preguntas frecuentes"/>
    <small>{title.length}/90 caracteres</small>
   </label>
   {mode==="create"?
    <label>Dirección de la página
     <input name="slug" value={slug} onChange={e=>{setSlug(slugify(e.target.value));setSlugChanged(true);}}
      required minLength={3} maxLength={65} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="preguntas-frecuentes"/>
     <small>Se genera a partir del título. Puedes modificarla antes de crear la página.</small>
    </label>:
    <p className="cms-editor-url"><Globe2 size={16}/> Dirección fija: <code>{previewPath}</code> <span>Los enlaces existentes se conservan.</span></p>}
   <label>Descripción breve
    <textarea name="summary" rows={3} maxLength={240} value={summary} onChange={e=>setSummary(e.target.value)}
     placeholder="Una breve introducción para los visitantes"/>
    <small>{summary.length}/240 caracteres</small>
   </label>
   <label>Contenido principal
    <textarea name="body" rows={8} maxLength={10000} value={body} onChange={e=>setBody(e.target.value)}
     placeholder="Escribe aquí. Separa los párrafos dejando una línea vacía."/>
    <small>{textCount.toLocaleString("es")}/10.000 caracteres · {paragraphs.length} párrafo{paragraphs.length===1?"":"s"}</small>
   </label>
   <section className="cms-block-editor" aria-labelledby="cms-block-title">
    <div className="cms-block-editor-head"><div>
     <h3 id="cms-block-title">Secciones adicionales</h3>
     <p>Aparecerán debajo del contenido principal y podrás ordenarlas antes de publicar.</p>
    </div><span>{sections.length}/{MAX_PAGE_SECTIONS}</span></div>
    <input type="hidden" name="sections" value={JSON.stringify(sections)}/>
    <div className="cms-block-list">
     {sections.map((section,index)=><div className="cms-block-row" key={section.id}>
      <div className="cms-block-toolbar">
       <strong>{section.type==="heading"?"Encabezado":section.type==="text"?"Texto":"Imagen"} {index+1}</strong>
       <div className="cms-block-actions">
        <button type="button" title="Subir sección" aria-label={"Subir sección "+(index+1)} disabled={index===0}
          onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
        <button type="button" title="Bajar sección" aria-label={"Bajar sección "+(index+1)} disabled={index===sections.length-1}
          onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
        <button type="button" title="Quitar sección" aria-label={"Quitar sección "+(index+1)} onClick={()=>remove(section.id)}>
          <Trash2 size={16}/>
        </button>
       </div>
      </div>
      {section.type==="heading"&&<label>Texto del encabezado
       <input type="text" value={section.text} maxLength={140} placeholder="Ej. Lo que nos distingue"
        onChange={e=>update(section.id,{text:e.target.value})}/>
      </label>}
      {section.type==="text"&&<label>Texto de esta sección
       <textarea rows={4} value={section.text} maxLength={1800} placeholder="Escribe aquí el contenido de esta sección..."
        onChange={e=>update(section.id,{text:e.target.value})}/>
      </label>}
      {section.type==="image"&&<div className="cms-block-image">
       {mode==="edit"?
        <label className="cms-block-image-pick"><ImagePlus size={16} aria-hidden="true"/>
         {busyImage===section.id?"Procesando imagen...":section.imageId?"Cambiar imagen":"Seleccionar imagen"}
         <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busyImage)||submitting}
          onChange={e=>{void uploadImage(section.id,e.target.files?.[0]);e.target.value="";}}/>
        </label>:
        <p className="cms-block-image-help">Primero crea la página como borrador. Después podrás subir imágenes desde este editor.</p>}
       {mode==="edit"&&storedSlug&&<CmsMediaPicker targetSlug={storedSlug} disabled={Boolean(busyImage)||submitting} onChoose={imageId=>update(section.id,{imageId} as Partial<PageSection>)}/>}
       {section.imageId&&mode==="edit"&&storedSlug&&<img loading="lazy" src={"/api/admin/site-pages/"+encodeURIComponent(storedSlug)+"/images/"+section.imageId} alt={section.alt||"Imagen cargada en edición"}/>}
       <label>Descripción para accesibilidad (obligatoria)
        <input value={section.alt} onChange={e=>update(section.id,{alt:e.target.value})} maxLength={180}
         placeholder="Ej. Personal atendiendo a un cliente"/>
       </label>
       <label>Pie de imagen (opcional)
        <input value={section.caption} onChange={e=>update(section.id,{caption:e.target.value})} maxLength={220}
         placeholder="Texto que aparecerá debajo de la fotografía"/>
       </label>
       <small>JPG, PNG o WebP · máximo 8 MB. Convertimos automáticamente a WebP.</small>
      </div>}
     </div>)}
     {!sections.length&&<p className="cms-block-empty">Todavía no has añadido secciones. Puedes empezar con un encabezado, texto o imagen.</p>}
    </div>
    <div className="cms-block-add" aria-label="Añadir sección">
     <button type="button" onClick={()=>add("heading")} disabled={sections.length>=MAX_PAGE_SECTIONS}><Heading2 size={17}/> Encabezado</button>
     <button type="button" onClick={()=>add("text")} disabled={sections.length>=MAX_PAGE_SECTIONS}><AlignLeft size={17}/> Texto</button>
     {mode==="edit"&&<button type="button" onClick={()=>add("image")} disabled={sections.length>=MAX_PAGE_SECTIONS}><ImagePlus size={17}/> Imagen</button>}
    </div>
   </section>
   <div className="cms-publish-control">
    <div className="cms-publish-icon">{published?<Globe2 size={20}/>:<LockKeyhole size={20}/>}</div>
    <div><strong>{published?"Publicar en el sitio":"Guardar como borrador"}</strong>
     <p>{published?"Después de guardar, estará disponible mediante su enlace. Para mostrarla en el menú debes agregarla allí.":"Los visitantes no podrán acceder mientras esté en borrador."}</p></div>
    <label className="cms-publish-switch"><input name="published" type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/>
     <span>Publicada</span></label>
   </div>
   {editorError&&<p className="admin-error" role="alert">{editorError}</p>}
   <div className="site-page-form-actions cms-editor-actions">
    <button className="btn btn-red" type="submit" disabled={submitting||Boolean(busyImage)}>
     {mode==="create"?<Plus size={17}/>:<Save size={17}/>}
     {submitting?"Guardando...":mode==="create"?"Crear página":"Guardar cambios"}</button>
    <Link href="/admin/personalizar/paginas" className="btn wizard-back" onClick={confirmLeave}><ArrowLeft size={16}/> Volver a páginas</Link>
    {isEdited&&<span className="cms-unsaved" role="status">Cambios sin guardar</span>}
   </div>
  </form>
  <aside className="cms-live-preview" aria-label="Vista previa orientativa sin guardar">
   <div className="cms-preview-top"><Eye size={17}/> Vista previa <span>Sin publicar</span></div>
   <div className="cms-preview-body">
    <small>INFORMACIÓN</small>
    <h2>{title||"Título de tu página"}</h2>
    <p className="cms-preview-summary">{summary||"La descripción breve aparecerá aquí."}</p>
    <div className="cms-preview-divider"/>
    <PageSectionContent slug={slug||"tu-pagina"} body={body} sections={sections} preview/>
   </div>
   <p className="cms-preview-caption">La vista previa utiliza el mismo diseño de contenido que la página pública. No publica cambios ni modifica otras páginas.</p>
  </aside>
 </div>;
}
