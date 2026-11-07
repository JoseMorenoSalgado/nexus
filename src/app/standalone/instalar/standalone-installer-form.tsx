"use client";
import {useState,type FormEvent} from "react";
export function StandaloneInstallerForm(){
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[complete,setComplete]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  const form=new FormData(event.currentTarget);
  const payload=Object.fromEntries(form.entries());
  try{
   const response=await fetch("/api/standalone/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"No se pudo instalar");
   setComplete(true);
  }catch(error){setError(error instanceof Error?error.message:"No se pudo completar la instalación");}
  finally{setBusy(false);}
 }
 if(complete)return <section role="status" className="mt-8"><h2 className="text-xl font-bold">Instalación completada</h2><a href="/standalone/acceso" className="mt-4 inline-block underline">Entrar al administrador</a></section>;
 const fields=[
  ["dbHost","Host PostgreSQL","text","127.0.0.1"],["dbPort","Puerto","number","5432"],
  ["dbName","Nombre de base de datos","text",""],["dbUser","Usuario PostgreSQL","text",""],
  ["dbPassword","Contraseña PostgreSQL","password",""],["institution","Nombre de la inmobiliaria","text",""],
  ["institutionEmail","Correo de contacto","email",""],["adminName","Nombre del administrador","text",""],
  ["adminEmail","Correo del administrador","email",""],["adminPassword","Contraseña del administrador","password",""]
 ];
 return <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
  {fields.map(([name,label,type,placeholder])=><label key={name} className="block">{label}
   <input name={name} type={type} placeholder={placeholder} defaultValue={name==="dbPort"?"5432":undefined}
    required minLength={name==="adminPassword"?14:undefined} autoComplete="off" className="mt-1 block w-full rounded border p-3"/>
  </label>)}
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  <button disabled={busy} className="rounded bg-black p-3 text-white disabled:opacity-50" type="submit">{busy?"Instalando…":"Instalar Nexus"}</button>
 </form>;
}
