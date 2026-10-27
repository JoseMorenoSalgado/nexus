"use client";
import {useEffect} from "react";

/**
 * Progressive, one-time entrance motion for the real-estate Home only.
 * DOM is always readable/interactive before hydration and when JS is off.
 * No new animation library, no scroll listeners and no layout measurements.
 */
export function NexusHomeMotion(){
 useEffect(()=>{
  const root=document.querySelector<HTMLElement>("[data-nexus-home-motion]");
  if(!root||!window.matchMedia||!window.IntersectionObserver||!Element.prototype.animate)return;

  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(reduced.matches)return;

  const selectors=[
   ".nexus-featured .nexus-section-heading",
   ".nexus-featured-grid > .property-card",
   ".nexus-empty-listing",
   ".nexus-services-preview .nexus-section-heading",
   ".nexus-services-grid > .nexus-service-card",
   ".nexus-story-panel",
   ".nexus-story-steps > div",
   ".nexus-contact-home-layout > div",
   ".nexus-advisory-home-row"
  ];
  const targets=Array.from(root.querySelectorAll<HTMLElement>(selectors.join(",")));
  const animations=new Set<Animation>();
  const played=new WeakSet<Element>();
  const observer=new IntersectionObserver((entries)=>{
   if(reduced.matches)return;
   for(const entry of entries){
    if(!entry.isIntersecting||played.has(entry.target))continue;
    played.add(entry.target);
    observer.unobserve(entry.target);
    const el=entry.target as HTMLElement;
    const index=targets.indexOf(el);
    const animation=el.animate(
     [
      {opacity:0.82,transform:"translate3d(0, 12px, 0)"},
      {opacity:1,transform:"translate3d(0, 0, 0)"}
     ],
     {duration:390,delay:(index%3)*55,easing:"cubic-bezier(.2,.7,.2,1)",fill:"none"}
    );
    animations.add(animation);
    void animation.finished.catch(()=>{}).then(()=>animations.delete(animation));
   }
  },{threshold:0.12,rootMargin:"0px 0px -7% 0px"});

  for(const target of targets)observer.observe(target);
  const onMotionChange=()=>{
   if(!reduced.matches)return;
   observer.disconnect();
   for(const animation of animations)animation.cancel();
   animations.clear();
  };
  reduced.addEventListener?.("change",onMotionChange);
  return ()=>{
   observer.disconnect();
   reduced.removeEventListener?.("change",onMotionChange);
   for(const animation of animations)animation.cancel();
   animations.clear();
  };
 },[]);
 return null;
}
