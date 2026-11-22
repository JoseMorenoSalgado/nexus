"use client";

import {useEffect,useId,useRef,useState} from "react";
import Link from "next/link";
import type {Map as LeafletMap} from "leaflet";
import type {PropertyMapPoint} from "@/lib/property-map";
import "leaflet/dist/leaflet.css";
import "./property-map.css";

export function PropertyMap({points,showCatalogLink=false}:{points:PropertyMapPoint[];showCatalogLink?:boolean}){
 const id=useId();
 const surface=useRef<HTMLDivElement>(null);
 const [failed,setFailed]=useState(false);

 useEffect(()=>{
  const element=surface.current;
  if(!element||!points.length)return;
  let map:LeafletMap|undefined;
  let active=true;

  async function showMap(){
   const L=await import("leaflet");
   if(!active||!element)return;
   map=L.map(element,{scrollWheelZoom:false});
   const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:19
   });
   tiles.on("tileerror",()=>{if(active)setFailed(true);});
   tiles.on("tileload",()=>{if(active)setFailed(false);});
   tiles.addTo(map);

   const bounds=L.latLngBounds([]);
   for(const point of points){
    const position=L.latLng(point.latitude,point.longitude);
    bounds.extend(position);
    const popup=document.createElement("div");
    popup.className="property-map-preview";
    if(point.image&&/^\/api\/media\/[a-zA-Z0-9_-]+$/.test(point.image)){
     const photo=document.createElement("img");
     photo.src=point.image;photo.alt=point.title;photo.loading="lazy";photo.decoding="async";
     popup.append(photo);
    }
    const name=document.createElement("strong");
    name.textContent=point.title;
    const address=document.createElement("div");
    address.textContent=point.address;
    const link=document.createElement("a");
    link.href="/propiedades/"+encodeURIComponent(point.slug);
    link.textContent="Ver ficha";
    popup.append(name);
    if(typeof point.price==="number"){
     const price=document.createElement("strong");price.className="property-map-price";
     price.textContent="US$ "+new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(point.price)+(point.operation==="alquiler"?"/mes":"");
     popup.append(price);
    }
    const stats=document.createElement("span");
    stats.textContent=[point.bedrooms?point.bedrooms+" hab.":"",point.bathrooms?point.bathrooms+" baños":"",point.areaM2?point.areaM2+" m²":""].filter(Boolean).join(" · ");
    popup.append(address,stats,link);
    const marker=L.marker(position,{title:point.title,alt:point.title,
     icon:L.divIcon({className:"property-map-pin",iconSize:[22,22],iconAnchor:[11,11]})
    }).bindPopup(popup,{minWidth:220,maxWidth:260}).addTo(map);
    // Keep the preview open so its link remains accessible; a tap or keyboard activation also opens it.
    marker.on("mouseover",()=>marker.openPopup());
   }
   map.fitBounds(bounds,{padding:[30,30],maxZoom:15,animate:false});
  }

  // Defer the tile requests until the visitor reaches the map.
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    observer.disconnect();
    void showMap().catch(()=>{if(active)setFailed(true);});
   }
  });
  observer.observe(element);
  return ()=>{active=false;observer.disconnect();map?.remove();};
 },[points]);

 return <section className="property-map" aria-labelledby={id}>
  <header>
   <h2 id={id}>Propiedades en el mapa</h2>
   <p>Explora las ubicaciones publicadas y abre la ficha de cada inmueble.</p>
  </header>
  {points.length?<>
   <div ref={surface} className="property-map-surface" role="region" aria-label="Mapa interactivo de propiedades"/>
   {failed&&<p role="status">El mapa puede estar incompleto. Puedes abrir las fichas desde la lista.</p>}
   <details className="property-map-addresses">
    <summary>Ver direcciones ({points.length})</summary>
    <ul>{points.map(point=><li key={point.id}><Link href={"/propiedades/"+encodeURIComponent(point.slug)}>{point.title}</Link><span>{point.address}</span></li>)}</ul>
   </details>
  </>:<p>Por ahora no hay propiedades con ubicación publicada.</p>}
  {showCatalogLink&&<Link href="/propiedades" className="inline-link">Ver catálogo completo →</Link>}
 </section>;
}
