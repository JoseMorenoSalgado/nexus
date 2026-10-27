"use client";

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main style={{maxWidth:680,margin:"12vh auto",padding:"24px",fontFamily:"Arial,Helvetica,sans-serif",color:"#17243a",lineHeight:1.6}}>
  <div style={{borderLeft:"4px solid #c72d36",paddingLeft:20}}>
   <h1 style={{fontSize:"clamp(1.5rem,4vw,2rem)",margin:"0 0 12px"}}>No podemos mostrar el sitio en este momento</h1>
   <p>Se produjo un error temporal en la aplicación inmobiliaria NEXUS. No es necesario repetir la instalación ni borrar información.</p>
   {error.digest&&<p style={{fontSize:14,color:"#5c6774"}}>Referencia técnica: <code>{error.digest}</code></p>}
  </div>
  <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:24,alignItems:"center"}}>
   <button type="button" onClick={()=>reset()} style={{border:0,borderRadius:8,background:"#b71e2b",color:"white",padding:"12px 18px",cursor:"pointer"}}>Volver a intentar</button>
   <a href="/api/diagnostico" style={{color:"#17243a",textDecoration:"underline"}}>Verificar estado técnico</a>
  </div>
 </main>;
}
