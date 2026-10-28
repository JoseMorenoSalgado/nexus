"use client";
import {useMemo} from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

/** Download the full-screen zoom viewer only after a visitor opens it. */
export function PropertyLightbox({photos,title,index,onClose,onView}:{
 photos:string[];title:string;index:number;onClose:()=>void;onView:(index:number)=>void
}){
 const slides=useMemo(()=>photos.map(src=>({src,alt:title})),[photos,title]);
 return <Lightbox open close={onClose} index={index} slides={slides}
  plugins={[Zoom]} zoom={{maxZoomPixelRatio:2}}
  carousel={{finite:photos.length<=1}} controller={{closeOnBackdropClick:true}}
  on={{view:({index:current})=>onView(current)}}/>;
}
