"use client";

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <html lang="es"><body style={{margin:0,background:"#f8f9fb"}}>
  <main style={{maxWidth:680,margin:"12vh auto",padding:"24px",fontFamily:"Arial,Helvetica,sans-serif",color:"#17243a",lineHeight:1.6}}>
   <h1>La aplicación inmobiliaria NEXUS no está disponible</h1>
   <p>No reinstales el sistema ni elimines sus datos. Comprueba el servicio y la conexión a la base de datos en Dockploy.</p>
   {error.digest&&<p>Referencia técnica: <code>{error.digest}</code></p>}
   <button type="button" onClick={()=>reset()} style={{padding:"12px 18px",cursor:"pointer"}}>Reintentar</button>
   <p><a href="/api/diagnostico">Verificar estado técnico</a></p>
  </main>
 </body></html>;
}
