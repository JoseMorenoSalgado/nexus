"use client";
import {useRef,useState} from "react";
import {Eye,EyeOff} from "lucide-react";

export function UserPasswordFields(){
 const [visible,setVisible]=useState(false);
 const confirmRef=useRef<HTMLInputElement>(null);
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const check=(first:string,second:string)=>{
  confirmRef.current?.setCustomValidity(second&&first!==second?"Las contraseñas no coinciden.":"");
 };
 return <div className="user-password-fields">
  <label>Contraseña inicial
   <span className="user-password-toggle">
    <input name="password" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={256} value={password}
     required onChange={event=>{setPassword(event.target.value);check(event.target.value,confirmation);}}/>
    <button type="button" aria-label={visible?"Ocultar contraseñas":"Mostrar contraseñas"} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>
     {visible?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}
    </button>
   </span>
  </label>
  <label>Confirmar contraseña
   <input ref={confirmRef} name="confirmPassword" type={visible?"text":"password"} autoComplete="new-password" minLength={12}
    maxLength={256} value={confirmation} required onChange={event=>{setConfirmation(event.target.value);check(password,event.target.value);}}/>
  </label>
  {confirmation&&password!==confirmation&&<p className="admin-error" role="alert">Las contraseñas deben coincidir.</p>}
 </div>;
}
