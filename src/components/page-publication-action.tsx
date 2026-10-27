"use client";

import {useState} from "react";

export function PagePublicationAction({slug,title,published}:{slug:string;title:string;published:boolean}){
 const [submitting,setSubmitting]=useState(false);
 return <form method="post" action={"/api/admin/site-pages/"+encodeURIComponent(slug)} onSubmit={event=>{
  if(published&&!window.confirm('¿Pasar "'+title+'" a borrador? Dejará de estar disponible para los visitantes, incluso si conocen su enlace.')){event.preventDefault();return;}
  setSubmitting(true);
 }}>
  <input type="hidden" name="intent" value="status"/>
  {!published&&<input type="hidden" name="published" value="on"/>}
  <button type="submit" disabled={submitting} aria-label={(published?"Pasar a borrador: ":"Publicar página: ")+title}
   title={published?"Retirar la página del sitio público":"Hacer visible la página para visitantes"}>
   {submitting?"Actualizando...":published?"Pasar a borrador":"Publicar"}
  </button>
 </form>;
}
