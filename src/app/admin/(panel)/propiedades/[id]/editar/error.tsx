"use client";
import Link from "next/link";

export default function PropertyEditorError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <section className="admin-panel" role="alert">
  <h1>No se pudo abrir la propiedad</h1>
  <p>Vuelve a intentar cargar el editor.</p>
  {error.digest&&<p>Referencia del error: <code>{error.digest}</code></p>}
  <div className="property-editor-actions">
   <button type="button" className="btn btn-red" onClick={reset}>Reintentar</button>
   <Link className="btn wizard-back" href="/admin/propiedades">Volver a propiedades</Link>
  </div>
 </section>;
}
