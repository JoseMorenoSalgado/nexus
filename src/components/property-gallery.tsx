"use client";

import {useCallback,useEffect,useMemo,useState,type PointerEvent,type SyntheticEvent} from "react";
import useEmblaCarousel from "embla-carousel-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import {ChevronLeft,ChevronRight,Expand,Image as ImageIcon,ZoomIn} from "lucide-react";
import "yet-another-react-lightbox/styles.css";
import {mediaVariantUrl} from "@/lib/media-url";

type PhotoSize={width:number;height:number};
export function PropertyGallery({photos,title}:{photos:string[];title:string}){
 const [emblaRef,emblaApi]=useEmblaCarousel({loop:photos.length>1,align:"start",duration:23});
 const [index,setIndex]=useState(0);
 const [lightboxOpen,setLightboxOpen]=useState(false);
 const [hoverIndex,setHoverIndex]=useState<number|null>(null);
 const [position,setPosition]=useState({x:50,y:50});
 const [imageDimensions,setImageDimensions]=useState<Record<number,PhotoSize>>({});
 const slides=useMemo(()=>photos.map(src=>({src,alt:title})),[photos,title]);
 const choose=useCallback(()=>{
  if(emblaApi){setIndex(emblaApi.selectedScrollSnap());setHoverIndex(null);}
 },[emblaApi]);
 useEffect(()=>{
  if(!emblaApi)return;
  choose();
  emblaApi.on("select",choose);
  emblaApi.on("reInit",choose);
  return ()=>{emblaApi.off("select",choose);emblaApi.off("reInit",choose);};
 },[emblaApi,choose]);
 const openPhoto=(i:number)=>{setIndex(i);setHoverIndex(null);setLightboxOpen(true);};
 const onLoaded=(event:SyntheticEvent<HTMLImageElement>,i:number)=>{
  const img=event.currentTarget;
  setImageDimensions(prev=>({...prev,[i]:{width:img.naturalWidth,height:img.naturalHeight}}));
 };
 const onPointerMove=(event:PointerEvent<HTMLDivElement>,i:number)=>{
  if(event.pointerType!=="mouse")return;
  const photo=event.currentTarget.querySelector("img.property-gallery-photo") as HTMLImageElement|null;
  const dimensions=imageDimensions[i];
  if(!photo||!dimensions||!photo.clientWidth||!photo.clientHeight||dimensions.width/photo.clientWidth<1.35||
    dimensions.height/photo.clientHeight<1.35){setHoverIndex(null);return;}
  const bounds=photo.getBoundingClientRect();
  const x=Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100));
  const y=Math.max(0,Math.min(100,(event.clientY-bounds.top)/bounds.height*100));
  setPosition({x,y});
  setHoverIndex(i);
 };
 if(!photos.length)return <div className="property-gallery-empty"><ImageIcon size={36}/><span>Fotografías próximamente</span></div>;
 const multiple=photos.length>1;
 return <section className="property-gallery" aria-label={"Fotografías de "+title}>
  <div className="property-gallery-viewport" ref={emblaRef}>
   <div className="property-gallery-track">
    {photos.map((photo,i)=><div className="property-gallery-slide" key={photo+"-"+i}>
     <div className="property-gallery-stage" onPointerMove={e=>onPointerMove(e,i)} onPointerLeave={()=>setHoverIndex(null)}>
      <div className="property-gallery-backdrop" style={{backgroundImage:`url("${photo.replace(/"/g,"%22")}")`}} aria-hidden="true"/>
      <img className={"property-gallery-photo"+(hoverIndex===i?" property-gallery-photo-zoom":"")}
        src={photo} alt={title+" — fotografía "+(i+1)}
        loading={i===0?"eager":"lazy"} decoding="async" onLoad={e=>onLoaded(e,i)}
        style={{transformOrigin:position.x+"% "+position.y+"%"}}/>
      <button type="button" className="property-gallery-expand" onClick={()=>openPhoto(i)}
        aria-label={"Ampliar fotografía "+(i+1)+" de "+photos.length}><Expand size={17}/> Ampliar</button>
      {hoverIndex===i&&<span className="property-gallery-zoom-label"><ZoomIn size={14}/> Acercamiento</span>}
     </div>
    </div>)}
   </div>
  </div>
  <div className="property-gallery-bottom">
   <div className="property-gallery-caption"><ImageIcon size={16}/> {multiple?photos.length+" fotografías":"Fotografía principal"} <span>· Pasa el cursor para explorar o pulsa Ampliar</span></div>
   {multiple&&<div className="property-gallery-controls">
    <button type="button" aria-label="Fotografía anterior" onClick={()=>emblaApi?.scrollPrev()}><ChevronLeft size={19}/></button>
    <span aria-live="polite">{index+1} / {photos.length}</span>
    <button type="button" aria-label="Fotografía siguiente" onClick={()=>emblaApi?.scrollNext()}><ChevronRight size={19}/></button>
   </div>}
  </div>
  {multiple&&<div className="property-gallery-thumbs" aria-label="Seleccionar una fotografía">
   {photos.map((photo,i)=><button type="button" key={photo+"-thumb-"+i} onClick={()=>emblaApi?.scrollTo(i)}
     className={index===i?"selected":""} aria-pressed={index===i} aria-label={"Mostrar fotografía "+(i+1)}>
    <img src={mediaVariantUrl(photo,"thumb")} alt="" loading="lazy" decoding="async"/>
   </button>)}
  </div>}
  <Lightbox open={lightboxOpen} close={()=>setLightboxOpen(false)} index={index}
   slides={slides} plugins={[Zoom]} zoom={{maxZoomPixelRatio:2}}
   carousel={{finite:!multiple}} controller={{closeOnBackdropClick:true}}
   on={{view:({index:current})=>{if(current!==index)emblaApi?.scrollTo(current);}}}/>
 </section>;
}
