/**
 * Browser visual QA for the NEXUS real-estate public site.
 *
 * Runs ONLY on the seeded localhost CI server. Produces full-page screenshots
 * and JSON metrics to GitHub Actions artifacts for manual design review.
 * Screenshots are not a substitute for checking physical Android/iOS devices.
 */
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium} from "playwright";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Never run these screenshot checks against production.");
const output=process.env.VISUAL_QA_DIR||"/tmp/nexus-visual-qa";
await mkdir(output,{recursive:true});
const routes=[
 ["inicio","/"],
 ["catalogo","/propiedades"],
 ["ficha","/propiedades/casa-zona-ejecutiva"],
 ["nosotros","/nosotros"],
 ["servicios","/servicios"],
 ["contacto","/contacto"],
 ["asesoria","/asesoria-empresarial"]
];
const widths=[375,768,1024,1440];
const findings=[];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:"reduce",isMobile:width===375,hasTouch:width===375});
  try{
   for(const [name,route] of routes){
    const page=await context.newPage();
    try{
     const pageErrors=[];
     page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,250)));
     const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
     await page.locator(".nexus-header").waitFor({state:"visible"});
     await page.locator("main").waitFor({state:"visible"});
     // Stabilize optional background images without depending on external services.
     await page.evaluate(async()=>{
      if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]);
     });
     const metrics=await page.evaluate(()=>{
      const get=(selector)=>{
       const el=document.querySelector(selector);
       if(!el)return null;
       const r=el.getBoundingClientRect();
       const style=getComputedStyle(el);
       return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),
        visible:r.width>0&&r.height>0&&style.display!=="none"&&style.visibility!=="hidden"};
      };
      return {
       viewport:innerWidth,
       scrollWidth:document.documentElement.scrollWidth,
       bodyScrollWidth:document.body.scrollWidth,
       header:get(".nexus-header"),heading:get("main h1"),
       main:get("main"),footer:get(".nexus-footer"),
       search:get(".nexus-search-form"),catalogForm:get(".nexus-catalog-filter-card"),
       gallery:get(".property-gallery-stage"),contact:get(".nexus-contact-form-card"),
       editorLeak:!!document.querySelector(".admin-shell"),
       imageFit:document.querySelector(".property-gallery-photo")?getComputedStyle(document.querySelector(".property-gallery-photo")).objectFit:null
      };
     });
     // Keep screenshot evidence even if a check below fails.
     await page.screenshot({path:`${output}/${String(width)}-${name}.png`,fullPage:true,animations:"disabled",timeout:25000});
     const problems=[];
     if(response?.status()!==200)problems.push("HTTP "+response?.status());
     if(!metrics.header?.visible||!metrics.heading?.visible||!metrics.footer?.visible)problems.push("Missing core visible content");
     if(metrics.scrollWidth>width+3||metrics.bodyScrollWidth>width+3)problems.push(`Horizontal overflow: ${metrics.scrollWidth}px document / ${metrics.bodyScrollWidth}px body`);
     if(metrics.heading&&(metrics.heading.x< -2||metrics.heading.x+metrics.heading.width>width+3))problems.push("Heading outside viewport");
     if(metrics.editorLeak)problems.push("Administration UI leaked into public page");
     if(route.startsWith("/propiedades/")&&metrics.imageFit&&metrics.imageFit!=="contain")problems.push("Gallery image distorted or cropped: "+metrics.imageFit);
     if(pageErrors.length)problems.push("Client error: "+pageErrors.join(" | "));
     if(name!=="inicio"){
      const root=page.locator("[data-nexus-inner-motion]");
      if(await root.count()!==1)problems.push("Inner-page motion scope missing or duplicated");
      const heading=page.locator(name==="ficha"?"[data-nexus-inner-motion] .property-detail-header":"[data-nexus-inner-motion] .nexus-inner-hero h1");
      if(await heading.count()){
       const motionName=await heading.evaluate(el=>getComputedStyle(el).animationName);
       if(motionName!=="none")problems.push("Reduced-motion inner page still animates: "+motionName);
      }else problems.push("Inner-page motion heading missing");
     }
     if(name==="inicio"){
      const animationName=await page.locator("[data-nexus-home-motion] .nexus-hero-copy h1").evaluate(el=>getComputedStyle(el).animationName);
      if(animationName!=="none")problems.push("Reduced-motion Home still animates: "+animationName);
     }
     if(width===375){
      const summary=page.locator(".nexus-mobile-menu summary");
      if(await summary.count()){
       const box=await summary.boundingBox();
       if(box && (box.width<44||box.height<44))problems.push("Mobile menu touch target smaller than 44px");
       await summary.click();
       const expanded=await page.locator(".nexus-mobile-menu").getAttribute("open");
       if(expanded===null)problems.push("Mobile menu cannot open");
       else {
        const item=page.locator('.nexus-mobile-menu nav a').first();
        if(await item.count() && !(await item.isVisible()))problems.push("Mobile navigation links not visible when open");
       }
      }
     }
     findings.push({width,route,name,http:response?.status(),metrics,problems});
     console.log(`${problems.length?"FAIL":"OK"} ${width}px ${route} ${problems.join("; ")}`);
    }catch(error){
     findings.push({width,route,name,problems:[String(error).slice(0,500)]});
     console.error(`FAIL ${width}px ${route}: ${error}`);
    }finally{await page.close();}
   }
  }finally{await context.close();}
 }

 // Check that the classic Home really animates when the OS permits motion;
 // the 24 responsive screenshots above deliberately run with reduced motion.
 const motionContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:"no-preference"});
 try{
  const page=await motionContext.newPage();
  try{
   await page.addInitScript(()=>{
    window.__nexusHomeAnimations=0;
    const original=Element.prototype.animate;
    Element.prototype.animate=function(...args){
     if(this.closest("[data-nexus-home-motion]"))window.__nexusHomeAnimations++;
     return original.apply(this,args);
    };
   });
   const response=await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200,"Motion QA Home HTTP");
   const name=await page.locator("[data-nexus-home-motion] .nexus-hero-copy h1").evaluate(el=>getComputedStyle(el).animationName);
   assert.ok(name.includes("nexus-home-arrive"),"Classic hero has no CSS entrance animation");
   await page.waitForTimeout(850);
   await page.locator(".nexus-services-preview .nexus-service-card").first().scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>window.__nexusHomeAnimations>0,null,{timeout:10000});
   const played=await page.evaluate(()=>window.__nexusHomeAnimations);
   assert.ok(played>0,"IntersectionObserver failed to reveal the Home sections");
   console.log("Home motion QA: hero CSS animation and scroll-based WAAPI reveal passed ("+played+" elements)");
  }finally{await page.close();}
 }finally{await motionContext.close();}
 // Verify each inner page runs a real, one-time scroll reveal when motion
 // is enabled. The screenshots above run with reducedMotion=reduce.
 const innerContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:"no-preference"});
 try{
  for(const [route,target,heading] of [
   ["/propiedades",".nexus-catalog-results",".nexus-inner-hero h1"],
   ["/propiedades/casa-zona-ejecutiva",".property-detail-description",".property-detail-header"],
   ["/nosotros",".nexus-principles-grid > article",".nexus-inner-hero h1"],
   ["/servicios",".nexus-service-details > article",".nexus-inner-hero h1"],
   ["/contacto",".nexus-contact-methods > .nexus-contact-method",".nexus-inner-hero h1"],
   ["/asesoria-empresarial",".nexus-advisory-service-grid > .nexus-advisory-service",".nexus-inner-hero h1"]
  ]){
   const page=await innerContext.newPage();
   try{
    await page.addInitScript(()=>{
     window.__nexusInnerAnimations=0;
     const previous=Element.prototype.animate;
     Element.prototype.animate=function(...args){
      if(this.closest("[data-nexus-inner-motion]"))window.__nexusInnerAnimations++;
      return previous.apply(this,args);
     };
    });
    const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response?.status(),200,route+" HTTP");
    const heroAnimation=await page.locator("[data-nexus-inner-motion] "+heading).evaluate(el=>getComputedStyle(el).animationName);
    assert.ok(heroAnimation.includes("nexus-inner-enter"),route+" lacks classic hero motion");
    await page.waitForTimeout(600);
    await page.locator("[data-nexus-inner-motion] "+target).first().scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.__nexusInnerAnimations>0,null,{timeout:10000});
    const count=await page.evaluate(()=>window.__nexusInnerAnimations);
    assert.ok(count>0,route+" has no progressive scroll animation");
    console.log("Inner-page motion passed "+route+" ("+count+" elements)");
   }finally{await page.close();}
  }
 }finally{await innerContext.close();}
}finally{await browser.close();}
await writeFile(`${output}/report.json`,JSON.stringify({date:new Date().toISOString(),routes:findings,notes:[
 "Captured the CI-seeded property pages, not the actual Dockploy production deployment.",
 "Rendering may differ if external image hosts are unavailable or real customer media varies.",
 "The Home motion is tested separately with no-preference and reduced-motion browser contexts.",
 "Motion is verified in Chromium for all six inner-page routes including the opt-in compliance page, with reduced motion off and on.",
 "A human must still review screenshots before approving a new animation PR."
]},null,2));
const errors=findings.flatMap(row=>row.problems.map(problem=>`${row.width}px ${row.route}: ${problem}`));
assert.equal(errors.length,0,`Visual QA found ${errors.length} issue(s):\n${errors.join("\n")}`);
console.log(`Visual QA: ${findings.length} browser screenshots saved to ${output}`);
