"use client";
import {useEffect} from "react";

/**
 * Animation enhancement for the five original NEXUS inner pages.
 * Always-visible SSR content, no data fetching, layout shifts, or dependencies.
 * Filter forms, property galleries and lead forms are intentionally untouched.
 */
export function NexusInnerMotion(){
 useEffect(()=>{
  try {
  const root=document.querySelector<HTMLElement>("[data-nexus-inner-motion]");
  if(!root||!window.matchMedia||!("IntersectionObserver" in window)||!Element.prototype.animate)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(reduced.matches)return;

  const selectors=[
   ".nexus-catalog-results",
   ".nexus-catalog-section .nexus-featured-grid > .property-card",
   ".nexus-catalog-section .nexus-empty-listing",
   ".property-detail-main > .property-detail-section",
   ".nexus-about-intro .nexus-about-image",
   ".nexus-about-intro .nexus-about-intro-copy",
   ".nexus-principles-grid > article",
   ".nexus-value-list > div",
   ".nexus-services-page .nexus-service-details > article",
   ".nexus-steps-grid > div",
   ".nexus-contact-information .nexus-contact-methods > .nexus-contact-method",
   ".nexus-contact-information .nexus-contact-note",
   ".nexus-advisory-service-grid > .nexus-advisory-service",
   ".nexus-advisory-process > div",
   ".nexus-advisory-resources-inner"
  ];
  const targets=Array.from(root.querySelectorAll<HTMLElement>(selectors.join(",")));
  const running=new Set<Animation>();
  const played=new WeakSet<Element>();
  const observer=new IntersectionObserver((entries)=>{
   if(reduced.matches)return;
   for(const entry of entries){
    if(!entry.isIntersecting||played.has(entry.target))continue;
    played.add(entry.target);
    observer.unobserve(entry.target);
    const element=entry.target as HTMLElement;
    const sequence=targets.indexOf(element);
    try {
     const animation=element.animate(
      [{opacity:.86,transform:"translate3d(0, 10px, 0)"},{opacity:1,transform:"translate3d(0, 0, 0)"}],
      {duration:350,delay:(sequence%3)*45,easing:"cubic-bezier(.2,.7,.2,1)",fill:"none"}
     );
     running.add(animation);
     if(animation.finished && typeof animation.finished.catch==="function"){
      void animation.finished.catch(()=>{}).then(()=>running.delete(animation));
     }
    } catch {
     // Optional browser effect; never hide or replace the server DOM.
    }
   }
  },{threshold:.10,rootMargin:"0px 0px -6% 0px"});

  targets.forEach(element=>observer.observe(element));
  const disableMotion=()=>{
   if(!reduced.matches)return;
   observer.disconnect();
   running.forEach(animation=>animation.cancel());
   running.clear();
  };
  reduced.addEventListener?.("change",disableMotion);
  return ()=>{
   observer.disconnect();
   reduced.removeEventListener?.("change",disableMotion);
   running.forEach(animation=>animation.cancel());
   running.clear();
  };
  } catch (error) {
    // This is optional progressive enhancement: unsupported browser APIs
    // must never prevent hydration of the actual page content.
    console.warn("[NEXUS] Optional motion disabled", error instanceof Error ? error.name : "unsupported");
    return;
  }
 },[]);
 return null;
}
