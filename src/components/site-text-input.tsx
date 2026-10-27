"use client";
import {useState} from "react";
type Props={name:string;label:string;value:string;max:number;multiline?:boolean;hint?:string};
export function SiteTextInput({name,label,value,max,multiline=false,hint}:Props){
 const [text,setText]=useState(value);
 const remaining=max-text.length;
 return <label className="cms-field">
  <span>{label}</span>
  {multiline?<textarea name={name} value={text} onChange={e=>setText(e.target.value)} maxLength={max} rows={4} required/>:
   <input name={name} value={text} onChange={e=>setText(e.target.value)} maxLength={max} required/>}
  <small className="cms-field-info">{hint||"Este texto aparecerá en el sitio público."}
   <span className={remaining<=15?"cms-field-near-limit":""}>{text.length}/{max}</span>
  </small>
 </label>;
}
