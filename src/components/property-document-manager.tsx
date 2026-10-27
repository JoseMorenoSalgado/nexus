"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {FileCheck2,FileUp,Download,Trash2} from "lucide-react";

export function PropertyDocumentManager({propertyId,hasDocument,canEdit}:{propertyId:string;hasDocument:boolean;canEdit:boolean}){
 const router=useRouter(),input=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const endpoint="/api/admin/properties/"+encodeURIComponent(propertyId)+"/document";
 async function upload(file:File|undefined){
  if(!file||busy)return;
  setError("");setSuccess("");
  if(!file.name.toLowerCase().endsWith(".pdf")||file.size>10*1024*1024||file.size<100){
   setError("Selecciona un PDF válido de hasta 10 MB.");return;
  }
  setBusy(true);
  try{
   const data=new FormData();data.append("document",file);
   const response=await fetch(endpoint,{method:"POST",body:data,credentials:"same-origin",cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"No se pudo guardar el PDF.");
   setSuccess("PDF personalizado guardado. Ya puedes descargarlo desde esta ficha.");
   router.refresh();
  }catch(cause){setError(cause instanceof Error?cause.message:"Error de conexión.")}
  finally{setBusy(false);if(input.current)input.current.value="";}
 }
 async function remove(){
  if(busy||!window.confirm("¿Eliminar el PDF personalizado? La ficha automática continuará disponible."))return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch(endpoint,{method:"DELETE",credentials:"same-origin",cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"No se pudo eliminar el PDF.");
   setSuccess("PDF personalizado eliminado. La ficha automática sigue disponible.");
   router.refresh();
  }catch(cause){setError(cause instanceof Error?cause.message:"Error de conexión.")}
  finally{setBusy(false);}
 }
 return <div className="property-document-manager">
  <div className="property-document-status"><FileCheck2 size={22}/>
   <div><strong>{hasDocument?"PDF personalizado disponible":"Sin PDF personalizado"}</strong>
    <span>{hasDocument?"El documento original fue procesado y guardado en el espacio privado de esta inmobiliaria.":"Puedes añadir una ficha corporativa. La ficha automática ya funciona sin subir archivos."}</span>
   </div>
  </div>
  <div className="property-document-actions">
   {canEdit&&<label className="property-upload-button"><FileUp size={18}/>{busy?"Procesando PDF...":hasDocument?"Reemplazar PDF":"Subir PDF personalizado"}
    <input ref={input} type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>void upload(e.target.files?.[0])}/>
   </label>}
   {hasDocument&&<a href={endpoint} className="btn wizard-back"><Download size={17}/> Descargar PDF</a>}
   {canEdit&&hasDocument&&<button className="btn btn-text" onClick={()=>void remove()} disabled={busy} type="button"><Trash2 size={16}/> Eliminar PDF</button>}
  </div>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {success&&<p role="status" className="property-success">{success}</p>}
  <p className="property-help">PDF de hasta 10 MB y 60 páginas. Los formularios, enlaces interactivos y adjuntos integrados no se conservan al procesarlo.</p>
 </div>;
}
