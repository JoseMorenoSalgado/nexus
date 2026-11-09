"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function VoidClosingForm({id}:{id:string}){
 const router=useRouter();const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const res=await fetch("/api/admin/cierres/"+encodeURIComponent(id),{method:"POST",body:new FormData(e.currentTarget),credentials:"same-origin"});
   const data=await res.json();
   if(!res.ok){setError(data.error||"No se pudo anular");return;}
   setOpen(false);router.refresh();
  }catch{setError("No se pudo conectar con el servidor");}finally{setBusy(false);}
 }
 return <div>
  {!open?<button className="btn wizard-back" type="button" onClick={()=>setOpen(true)}>Anular cierre</button>:
  <form onSubmit={submit} className="admin-form commercial-entry-form">
   <input type="hidden" name="intent" value="void" readOnly/>
   <label>Motivo de anulación<textarea name="reason" minLength={10} maxLength={1000} required placeholder="Explique por qué se anula este cierre"/></label>
   {error&&<p role="alert" className="admin-error">{error}</p>}
   <button className="btn btn-danger" type="submit" disabled={busy}>{busy?"Anulando…":"Confirmar anulación"}</button>
   <button className="btn wizard-back" type="button" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</button>
  </form>}
 </div>;
}
