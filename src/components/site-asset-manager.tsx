"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ImagePlus,Trash2,ImageIcon} from "lucide-react";
type Kind="hero"|"logo"|"about-photo"|"hero-propiedades"|"hero-nosotros"|"hero-servicios"|"hero-contacto"|"hero-asesoria-empresarial";
export function SiteAssetManager({kind,exists,canEdit}:{kind:Kind;exists:boolean;canEdit:boolean}){
 const router=useRouter(),ref=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const url="/api/admin/site-media/"+kind;
 async function upload(file?:File){
  if(!file||busy)return;
  setError("");setNotice("");
  if(file.size<100||file.size>8*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type)){
   setError("Selecciona una imagen JPG, PNG o WebP de hasta 8 MB.");return;
  }
  setBusy(true);
  try{
   const form=new FormData();form.append("image",file);
   const r=await fetch(url,{method:"POST",body:form,credentials:"same-origin",cache:"no-store"});
   const body=await r.json();
   if(!r.ok)throw Error(body.error||"No se pudo cargar la imagen.");
   setNotice("Imagen actualizada correctamente.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Fallo de conexión.");}
  finally{setBusy(false);if(ref.current)ref.current.value="";}
 }
 async function remove(){
  if(busy||!window.confirm("¿Restablecer la imagen predeterminada?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(url,{method:"DELETE",credentials:"same-origin",cache:"no-store"});
   const body=await r.json();
   if(!r.ok)throw Error(body.error||"No se pudo eliminar la imagen.");
   setNotice("Imagen predeterminada restaurada.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Fallo de conexión.");}
  finally{setBusy(false);}
 }
 return <div className="site-image-manager">
  <div className={"site-image-preview "+(kind==="logo"?"site-preview-logo":"site-preview-hero")}>
   {exists?<img src={"/api/site-media/"+kind} alt={kind==="logo"?"Logo corporativo":kind==="about-photo"?"Imagen de Nosotros":"Banner de la página"}/>:kind==="logo"?<span className="site-empty-logo"><ImageIcon size={22} aria-hidden="true"/> Agrega el logotipo de tu organización</span>:<span>Se conservará la imagen o el diseño predeterminado hasta que subas una fotografía.</span>}
  </div>
  <div className="site-image-actions">
   {canEdit&&<label className="property-upload-button"><ImagePlus size={17}/>{busy?"Procesando...":exists?"Reemplazar imagen":"Subir imagen"}
    <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0])}/>
   </label>}
   {canEdit&&exists&&<button className="btn wizard-back" disabled={busy} type="button" onClick={()=>void remove()}><Trash2 size={16}/> Restablecer</button>}
  </div>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {notice&&<p role="status" className="property-success">{notice}</p>}
  <p className="property-help">{kind==="logo"?"Recomendado: logo PNG con fondo transparente.":"Recomendado: foto horizontal de 1920 × 1080 px."} Máximo 8 MB. WebP de alta calidad: banner hasta 2560 px y logotipo sin pérdida de detalle. Se eliminan metadatos.</p>
 </div>;
}
