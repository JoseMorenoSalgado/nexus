"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowUpRight,Archive,CheckCircle2,Clock3,ImageIcon,RotateCcw,Trash2} from "lucide-react";
import {type TenantMedia,type TrashedMedia} from "@/lib/media-library";

type View="all"|"used"|"unused"|"recent"|"trash";
export function CmsMediaGallery({images,trashed,canManage}:{
 images:TenantMedia[];trashed:TrashedMedia[];canManage:boolean
}){
 const router=useRouter();
 const [view,setView]=useState<View>("all");
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const counts={all:images.length,used:images.filter(x=>x.used).length,
  unused:images.filter(x=>x.canArchive).length,
  recent:images.filter(x=>!x.used&&x.recent).length,trash:trashed.length};
 const visible=images.filter(image=>view==="all"||view==="used"&&image.used||
  view==="unused"&&image.canArchive||view==="recent"&&!image.used&&image.recent);
 async function manage(action:"archive"|"restore"|"purge",item:{slug:string;id:string;pageTitle:string}){
  const key=action+":"+item.slug+":"+item.id;
  if(busy)return;
  let confirmText:string|undefined;
  if(action==="archive"){
   if(!window.confirm('¿Mover esta imagen de "'+item.pageTitle+'" a la papelera? Solo se permite si no está usada. Podrás restaurarla.'))return;
   confirmText="ARCHIVAR";
  }
  if(action==="purge"){
   const accepted=window.prompt('La eliminación es definitiva. Escribe ELIMINAR para borrar esta imagen de "'+item.pageTitle+'".');
   if(accepted!=="ELIMINAR")return;
   confirmText="ELIMINAR";
  }
  setBusy(key);setError("");setSuccess("");
  try{
   const res=await fetch("/api/admin/media/manage",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,slug:item.slug,id:item.id,confirm:confirmText})
   });
   const result=await res.json() as {ok?:boolean;error?:string};
   if(!res.ok||!result.ok)throw Error(result.error||"No se pudo completar la operación.");
   setSuccess(action==="archive"?"Imagen trasladada a la papelera. Puedes recuperarla durante al menos siete días.":action==="restore"?"Imagen restaurada.":"Imagen eliminada definitivamente.");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo completar la operación.");}
  finally{setBusy(null);}
 }
 const filters:{key:View;label:string;count:number}[]=[
  {key:"all",label:"Todas",count:counts.all},{key:"used",label:"En uso",count:counts.used},
  {key:"unused",label:"Sin usar",count:counts.unused},{key:"recent",label:"Recientes",count:counts.recent}
 ];
 if(canManage)filters.push({key:"trash",label:"Papelera",count:counts.trash});
 return <div className="cms-library">
  <div className="cms-library-filters" role="group" aria-label="Filtrar imágenes">{filters.map(item=>
   <button key={item.key} type="button" aria-pressed={view===item.key}
    className={view===item.key?"is-selected":""} onClick={()=>{setView(item.key);setError("");}}
   >{item.label}<span>{item.count}</span></button>)}</div>
  <div className="cms-library-messages" aria-live="polite">
   {error&&<p className="admin-error" role="alert">{error}</p>}
   {success&&<p className="property-success" role="status">{success}</p>}
  </div>
  {view==="trash"?
   trashed.length?<section className="cms-media-gallery" aria-label="Imágenes archivadas">{trashed.map(item=>
    <article className="cms-media-gallery-item" key={item.slug+":"+item.id}>
     <img src={"/api/admin/media/trash/"+encodeURIComponent(item.slug)+"/"+item.id} alt={"Imagen de "+item.pageTitle+" en papelera"} loading="lazy" decoding="async"/>
     <div><strong>{item.pageTitle}</strong>
      <small>Papelera · {item.canPurge?"Disponible para eliminación definitiva":"En período de recuperación"}</small>
      <div className="cms-library-actions">
       <button type="button" disabled={Boolean(busy)} onClick={()=>void manage("restore",item)}>
        <RotateCcw size={15} aria-hidden="true"/> Restaurar
       </button>
       {item.canPurge&&<button className="is-destructive" type="button" disabled={Boolean(busy)}
        onClick={()=>void manage("purge",item)}>
        <Trash2 size={15} aria-hidden="true"/> Eliminar definitivamente
       </button>}
      </div>
     </div>
    </article>)}</section>:<p className="cms-library-empty">Tu papelera está vacía. Las imágenes archivadas aparecerán aquí y podrán restaurarse.</p>
   :visible.length?<section className="cms-media-gallery" aria-label="Imágenes de tu organización">{visible.map(item=>
    <article className="cms-media-gallery-item" key={item.slug+":"+item.id}>
     <img src={item.url} alt={"Imagen almacenada en la página "+item.pageTitle} loading="lazy" decoding="async"/>
     <div><strong>{item.pageTitle}</strong>
      <span className={"cms-library-status "+(item.used?"is-used":item.recent?"is-recent":"is-unused")}>
       {item.used?<CheckCircle2 size={14} aria-hidden="true"/>:item.recent?<Clock3 size={14} aria-hidden="true"/>:<Archive size={14} aria-hidden="true"/>}
       {item.used?"En uso":item.recent?"Reciente · protegida":"Sin usar"}
      </span>
      <small>WebP · Imagen de página</small>
      <Link href={"/admin/personalizar/paginas/"+encodeURIComponent(item.slug)}>Editar página <ArrowUpRight size={14}/></Link>
      {item.canArchive&&canManage&&<button className="cms-library-archive" type="button" disabled={Boolean(busy)}
       onClick={()=>void manage("archive",item)}><Archive size={15} aria-hidden="true"/> Mover a papelera</button>}
     </div>
    </article>)}</section>:
    <div className="cms-library-empty"><ImageIcon size={24} aria-hidden="true"/>
     <p>{view==="all"?"Todavía no has subido imágenes en los bloques de tus páginas.":view==="used"?"No hay imágenes utilizadas en secciones guardadas.":view==="recent"?"No tienes imágenes nuevas pendientes de guardar.":"No hay imágenes antiguas sin usar que necesiten limpieza."}</p>
     <Link href="/admin/personalizar/paginas">Abrir mis páginas <ArrowUpRight size={14}/></Link>
    </div>}
 </div>;
}
