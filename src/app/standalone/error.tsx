"use client";
import {useEffect} from "react";
export default function StandaloneError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{
  console.error("[NEXUS standalone] Client rendering failure",error);
 },[error]);
 return <main className="mx-auto max-w-xl px-6 py-20" role="alert">
  <h1 className="text-2xl font-bold">No se pudo mostrar esta página</h1>
  <p className="mt-4">La información guardada no se elimina por este error. Puedes intentar volver a cargar la vista.</p>
  {error.digest&&<p className="mt-3 text-sm">Referencia del error: <code>{error.digest}</code></p>}
  <div className="mt-6 flex flex-wrap gap-4">
   <button type="button" onClick={()=>reset()} className="rounded bg-black px-5 py-3 text-white">Reintentar</button>
   <a href="/standalone/admin" className="rounded border px-5 py-3">Volver al panel</a>
  </div>
 </main>;
}
