"use client";
import {useState,type FormEvent} from "react";
export function ContactForm({propertyId,messagePlaceholder="¿Qué propiedad te interesa?",topic}:{propertyId?:string;messagePlaceholder?:string;topic?:string}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setBusy(true);setNotice("");
   const f=e.currentTarget;
   const body=Object.fromEntries(new FormData(f).entries());
   const detail=typeof body.message==="string"?body.message.trim():"";
   const message=topic?(topic+(detail?" — "+detail:"")).slice(0,2000):detail;
   try{
     const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,propertyId,message})});
     const data=await r.json();if(!r.ok)throw new Error(data.error||"No se pudo enviar");
     setNotice("Recibimos tu consulta. Gracias por contactarnos.");f.reset();
   }catch(e){setNotice(e instanceof Error?e.message:"Error de comunicación");}
   finally{setBusy(false);}
 }
 return <form className="contact-form" onSubmit={submit}>
  <input name="name" placeholder="Nombre completo" minLength={2} maxLength={120} required/>
  <div className="form-row"><input name="phone" placeholder="Teléfono / WhatsApp" minLength={7} maxLength={30} required/><input name="email" type="email" placeholder="Correo electrónico" maxLength={180}/></div>
  <textarea name="message" placeholder={messagePlaceholder} maxLength={2000} rows={4}/>
  <label className="consent"><input type="checkbox" name="consent" value="yes" required/> Autorizo que me contacten para responder esta consulta.</label>
  <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true"/>
  <button className="btn btn-red" disabled={busy}>{busy?"Enviando...":"Enviar consulta →"}</button><p aria-live="polite" className="form-notice">{notice}</p>
 </form>;
}
