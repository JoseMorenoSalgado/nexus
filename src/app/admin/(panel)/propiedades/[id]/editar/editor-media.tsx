import {PROPERTY_FILE_LIMIT_MB} from "@/lib/property-upload-limits";
import {stat} from "node:fs/promises";
import {Images} from "lucide-react";
import {isStoredPropertyPhoto,mediaFilePath,mediaVariantPath} from "@/lib/property-media";
import {hasCustomPdf} from "@/lib/property-document";
import {PropertyPhotoUploader} from "@/components/property-photo-uploader";
import {PropertyDocumentManager} from "@/components/property-document-manager";
import MediaBoundary from "./media-boundary";

type Photo={id:string;url:string;alt:string|null};
async function fileSize(path:()=>string){
 try{return (await stat(path())).size;}catch{return null;}
}
export default async function EditorMedia({property,photos,siteId}:{
 property:{id:string;slug:string;title:string;published:boolean};photos:Photo[];siteId:string;
}){
 const [hasDocument,entries]=await Promise.all([
  hasCustomPdf(siteId,property.id),
  Promise.all(photos.filter(isStoredPropertyPhoto).map(async photo=>{
   const [full,card,thumb]=await Promise.all([
    fileSize(()=>mediaFilePath(siteId,photo.id)),
    fileSize(()=>mediaVariantPath(siteId,photo.id,"card")),
    fileSize(()=>mediaVariantPath(siteId,photo.id,"thumb"))
   ]);
   return [photo.id,{full,card,thumb}] as const;
  }))
 ]);
 const photoSizes=Object.fromEntries(entries);
 return <>
  <section id="editar-fotos" className="admin-panel property-photo-panel editor-media-panel"><div className="editor-panel-heading"><Images size={19}/><h2>Fotografías ({photos.length})</h2></div><p>Sube imágenes JPG, PNG o WebP (máximo {PROPERTY_FILE_LIMIT_MB} MB cada una, hasta 15). Se convierten a WebP y se eliminan los metadatos de ubicación.</p>
   <MediaBoundary label="la galería"><PropertyPhotoUploader propertyId={property.id} sizes={photoSizes} photos={photos.map(x=>({id:x.id,url:x.url,alt:x.alt||property.title}))}/></MediaBoundary>
  </section>
  <details id="editar-pdf" className="admin-panel property-photo-panel editor-disclosure editor-pdf-disclosure"><summary><span><strong>Ficha técnica en PDF</strong><small>Descargar ficha o gestionar un PDF corporativo</small></span><span className="editor-chevron" aria-hidden="true">⌄</span></summary><div className="editor-disclosure-body">
   <p className="property-help">La ficha se genera automáticamente con los datos del inmueble o puedes subir una versión personalizada de tu empresa.</p>
   <div className="property-pdf-auto">
    <div><strong>Ficha automática optimizada</strong><span>Resumen de una página o ficha ampliada de máximo dos páginas.</span></div>
   </div>
   {property.published?<form action={"/api/propiedades/"+encodeURIComponent(property.slug)+"/pdf"} method="get" target="_blank" className="admin-form" aria-label="Exportar ficha técnica">
     <label>Formato de exportación<select name="formato" defaultValue="ampliada"><option value="resumida">Resumida — 1 página</option><option value="ampliada">Ampliada — máximo 2 páginas</option></select></label>
     <fieldset><legend>Seleccionar fotografías destacadas (máximo 5)</legend>
      {photos.slice(0,8).map((photo,i)=><label key={photo.id} className="property-check"><input name="fotos" type="checkbox" value={photo.id} defaultChecked={i<5}/>{photo.alt||"Fotografía "+(i+1)}</label>)}
     </fieldset>
     <p className="property-help">Las imágenes restantes se consultan en la galería de la página pública. Puedes ordenar la galería en la sección de fotografías.</p>
     <div className="property-editor-actions"><button type="submit" name="vista" value="1" className="btn wizard-back">Previsualizar PDF</button><button type="submit" name="vista" value="0" className="btn btn-red">Descargar PDF</button></div>
    </form>:<p className="property-help">Publica el inmueble para previsualizar o descargar la ficha automática.</p>}
   <MediaBoundary label="el PDF personalizado"><PropertyDocumentManager propertyId={property.id} hasDocument={hasDocument} canEdit/></MediaBoundary>
  </div></details>
 </>;
}
