"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Closing={id:string;label:string};
export default function PaymentForm({closings}:{closings:Closing[]}){
 const router=useRouter();const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;setError("");setBusy(true);
  try{
   const response=await fetch("/api/admin/comisiones",{method:"POST",body:new FormData(form),credentials:"same-origin"});
   const result=await response.json();
   if(!response.ok){setError(result.error||"No se pudo registrar el pago");return;}
   form.reset();router.refresh();
  }catch{setError("No se pudo conectar con el servidor");}finally{setBusy(false);}
 }
 return <form className="admin-panel" onSubmit={submit}>
  <h2>Registrar abono de comisión</h2>
  <div className="form-grid">
   <label>Cierre<select name="closingId" required defaultValue=""><option value="" disabled>Seleccionar cierre</option>{closings.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label>Importe (USD)<input type="number" name="amount" min="0.01" step="0.01" required/></label>
   <label>Fecha del pago<input type="date" name="paidAt" max={new Date().toISOString().slice(0,10)} required/></label>
   <label>Método<select name="method" required><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label>
   <label>Referencia<input name="reference" maxLength={120}/></label>
   <label>Observaciones<textarea name="notes" maxLength={1000}/></label>
  </div>
  {error&&<p role="alert">{error}</p>}
  <button type="submit" disabled={busy||!closings.length}>{busy?"Registrando…":"Registrar abono"}</button>
 </form>;
}
