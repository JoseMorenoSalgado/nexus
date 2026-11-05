"use client";
import {useEffect,useState} from "react";
export default function AdminLoginCsrf(){
 const [token,setToken]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/admin/login-csrf",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error("csrf");return response.json() as Promise<{token:string}>;})
   .then(data=>{if(/^[a-f0-9]{64}$/.test(data.token))setToken(data.token);})
   .catch(()=>{});
  return ()=>controller.abort();
 },[]);
 return <><input type="hidden" name="csrf_token" value={token}/>{!token&&<p role="status">Preparando acceso seguro… Si no desaparece, actualiza la página.</p>}</>;
}
