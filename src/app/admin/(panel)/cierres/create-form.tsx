"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Lead={id:string;name:string;ref:string;operation:string};
export default function CreateClosingForm({leads}:{leads:Lead[]}){
 const router=useRouter();const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setBusy(true);
  try{
   const res=await fetch("/api/admin/cierres",{method:"POST",body:new FormData(e.currentTarget),credentials:"same-origin"});
   const data=await res.json();
   if(!res.ok){setError(data.error||"No se pudo registrar");return;}
   router.refresh();e.currentTarget.reset();
  }catch{setError("No se pudo conectar con el servidor");}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="admin-panel">
  <h2>Registrar cierre comercial</h2>
  <p>Solo para operaciones confirmadas. Cada prospecto puede tener un cierre.</p>
  <div className="form-grid">
   <label>Prospecto y propiedad<select name="leadId" required defaultValue=""><option value="" disabled>Seleccionar prospecto</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.ref} ({l.operation})</option>)}</select></label>
   <label>Operación<select name="kind" required><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
   <label>Importe (USD)<input name="amount" type="number" min="0.01" max="99999999999" step="0.01" required/></label>
   <label>Comisión (USD)<input name="commissionAmount" type="number" min="0" max="99999999999" step="0.01" required/></label>
   <label>Fecha del cierre<input name="closedAt" type="date" max={new Date().toISOString().slice(0,10)} required/></label>
   <input name="agentId" type="hidden" value="auto" readOnly/>
   <label>Observaciones<textarea name="notes" maxLength={2000}/></label>
  </div>
  {error&&<p role="alert">{error}</p>}
  <button type="submit" disabled={busy||!leads.length}>{busy?"Registrando…":"Registrar cierre"}</button>
 </form>;
}
