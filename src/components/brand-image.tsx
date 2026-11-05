"use client";

import {useState} from "react";

/** Keep the approved local identity visible if an uploaded logo is unavailable. */
export function BrandImage({src,fallback}:{src:string;fallback?:string|null}){
 const [failed,setFailed]=useState<string[]>([]);
 const image=[src,fallback].find((value):value is string=>typeof value==="string"&&value.length>0&&!failed.includes(value));
 if(!image)return null; // The adjacent brand name remains the accessible identity.
 return <img src={image} alt="" width={48} height={52} decoding="async"
  onError={()=>setFailed(previous=>previous.includes(image)?previous:[...previous,image])}/>;
}
