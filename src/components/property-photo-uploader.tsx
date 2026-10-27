"use client";
import {useEffect,useRef,useState,type DragEvent} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Eye,ImagePlus,Star,Trash2} from "lucide-react";

type Photo={id:string;url:string;alt:string};
type Resolution={width:number;height:number};
type MediaSizes={full:number|null;card:number|null;thumb:number|null};
const formatSize=(size:number|null)=>size===null?"No disponible":size>=1048576?(size/1048576).toFixed(2)+" MB":(size/1024).toFixed(0)+" KB";
export function PropertyPhotoUploader({propertyId,photos,sizes}:{propertyId:string;photos:Photo[];sizes:Record<string,MediaSizes>}){
 const router=useRouter(),inputRef=useRef<HTMLInputElement>(null);
 const [items,setItems]=useState(photos);
 const [dimensions,setDimensions]=useState<Record<string,Resolution>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [preview,setPreview]=useState<Photo|null>(null);
 const [dragged,setDragged]=useState<string|null>(null);
 const lowQuality=items.filter(photo=>dimensions[photo.id]&&Math.min(dimensions[photo.id].width,dimensions[photo.id].height)<700).length;
 useEffect(()=>{setItems(photos);setError("");},[propertyId,photos]);
 const endpoint="/api/admin/properties/"+encodeURIComponent(propertyId)+"/photos";
 async function saveOrder(next:Photo[]){
  if(busy)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch(endpoint+"/order",{method:"PATCH",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({photoIds:next.map(p=>p.id)})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"No se pudo guardar el orden.");
   setItems(next);setSuccess("Orden y portada actualizados.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error de conexión.");}
  finally{setBusy(false);}
 }
 function move(from:number,to:number){
  if(to<0||to>=items.length||from===to||busy)return;
  const next=[...items];const [photo]=next.splice(from,1);next.splice(to,0,photo);
  void saveOrder(next);
 }
 function drop(e:DragEvent<HTMLDivElement>,to:number){
  e.preventDefault();if(!dragged||busy)return;
  const from=items.findIndex(p=>p.id===dragged);setDragged(null);
  if(from>=0)move(from,to);
 }
 async function addImages(files:FileList|null){
  if(!files?.length||busy)return;
  setError("");setSuccess("");
  const remaining=15-items.length;
  if(files.length>remaining){setError("Solo quedan "+remaining+" espacios disponibles.");return;}
  setBusy(true);
  try{
   let count=0;
   for(const file of Array.from(files)){
    if(file.size>8*1024*1024){setError("La imagen "+file.name+" supera los 8 MB.");break;}
    const body=new FormData();body.append("photo",file);
    const response=await fetch(endpoint,{method:"POST",body,credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok){setError(data.error||"No fue posible subir la imagen.");break;}
    count++;
   }
   if(count)setSuccess(count+" fotografía(s) guardada(s).");
   router.refresh();
  }catch{setError("No se pudo enviar la fotografía. Revisa la conexión.");}
  finally{setBusy(false);if(inputRef.current)inputRef.current.value="";}
 }
 async function removePhoto(id:string){
  if(busy||!window.confirm("¿Eliminar esta fotografía?"))return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch(endpoint+"/"+encodeURIComponent(id),{method:"DELETE",credentials:"same-origin",cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"No se pudo eliminar.");
   setItems(prev=>prev.filter(p=>p.id!==id));setSuccess("Fotografía eliminada.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error de conexión.");}
  finally{setBusy(false);}
 }
 return <div className="property-upload-area">
  <div className="property-photo-toolbar">
   <label className="property-upload-button"><ImagePlus size={19}/>{busy?"Procesando...":"Añadir fotografías"}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||items.length>=15} onChange={e=>void addImages(e.target.files)}/>
   </label>
   <span className="property-photo-count">{items.length} de 15 fotografías</span>
  </div>
  <p className="property-photo-instructions">La primera fotografía es la portada. Arrastra las imágenes para ordenarlas, utiliza las flechas o selecciona «Hacer portada».</p>
  <p className="property-help">Los tamaños indican espacio ocupado por las versiones WebP guardadas; no incluyen el archivo JPG/PNG original, que no se conserva. Las imágenes antiguas pueden no tener miniaturas todavía.</p>
  {lowQuality>0&&<p className="property-help" role="status">Aviso: {lowQuality} fotografía(s) tienen menos de 700 píxeles en su lado más corto. Para una presentación nítida, considera subir versiones de mayor resolución.</p>}
  {error&&<p className="admin-error" role="alert">{error}</p>}
  {success&&<p className="property-success" role="status">{success}</p>}
  {items.length>0?<div className="property-upload-grid property-photo-sort-grid">
   {items.map((photo,i)=><div key={photo.id} className="property-upload-tile property-photo-sort-tile" draggable={!busy}
    onDragStart={()=>setDragged(photo.id)} onDragEnd={()=>setDragged(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,i)}>
    <div className="property-photo-sort-image">
     <img src={photo.url} alt={photo.alt||"Fotografía "+(i+1)} loading="lazy" onLoad={e=>{const img=e.currentTarget;setDimensions(prev=>({...prev,[photo.id]:{width:img.naturalWidth,height:img.naturalHeight}}));}}/>
     {i===0&&<span className="property-cover-label"><Star size={12}/> Portada</span>}
    </div>
    <div className="property-photo-resolution">{dimensions[photo.id]?<span>{dimensions[photo.id].width} × {dimensions[photo.id].height} px{Math.min(dimensions[photo.id].width,dimensions[photo.id].height)<700?" · Calidad limitada para ampliación":" · Apta para visualización"}</span>:<span>Comprobando resolución…</span>}</div>
    {sizes[photo.id]&&<div className="property-photo-resolution">Archivo WebP: {formatSize(sizes[photo.id].full)} · Tarjeta: {formatSize(sizes[photo.id].card)} · Miniatura: {formatSize(sizes[photo.id].thumb)}</div>}
    <div className="property-photo-sort-actions">
     <button type="button" title="Ver imagen completa" aria-label={"Ampliar fotografía "+(i+1)} onClick={()=>setPreview(photo)}><Eye size={16}/></button>
     <button type="button" title="Mover a la izquierda" aria-label={"Mover fotografía "+(i+1)+" a la izquierda"} onClick={()=>move(i,i-1)} disabled={busy||i===0}><ArrowLeft size={16}/></button>
     <button type="button" title="Mover a la derecha" aria-label={"Mover fotografía "+(i+1)+" a la derecha"} onClick={()=>move(i,i+1)} disabled={busy||i===items.length-1}><ArrowRight size={16}/></button>
     <button type="button" className="property-photo-remove" title="Eliminar fotografía" aria-label={"Eliminar fotografía "+(i+1)} onClick={()=>void removePhoto(photo.id)} disabled={busy}><Trash2 size={16}/></button>
    </div>
    {i!==0&&<button type="button" className="property-photo-make-cover" disabled={busy} onClick={()=>move(i,0)}><Star size={14}/> Hacer portada</button>}
   </div>)}
  </div>:<p className="property-help">No has subido fotografías. La primera imagen será la portada del inmueble.</p>}
  {preview&&<div className="property-photo-preview-backdrop" role="presentation" onClick={()=>setPreview(null)}>
   <div className="property-photo-preview" role="dialog" aria-modal="true" aria-label="Vista completa de fotografía" onClick={e=>e.stopPropagation()}>
    <button type="button" onClick={()=>setPreview(null)} aria-label="Cerrar vista completa">Cerrar ×</button>
    <img src={preview.url} alt={preview.alt||"Vista previa"} />
   </div>
  </div>}
 </div>;
}
