import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Tests must use localhost only");
const files={
 home:readFileSync("src/components/templates/real-estate-home.tsx","utf8"),
 frame:readFileSync("src/components/public-frame.tsx","utf8"),
 layout:readFileSync("src/app/layout.tsx","utf8"),
 classic:readFileSync("src/app/styles/templates/nexus-public.css","utf8"),
 polish:readFileSync("src/app/styles/templates/nexus-classic-polish.css","utf8")
};
assert.ok(files.layout.includes('import "./styles/templates/nexus-classic-polish.css";'));
assert.ok(!files.layout.includes("nexus-home-premium")&&!files.layout.includes("nexus-site-premium"),"Premium stylesheet remained active");
assert.ok(!files.frame.includes("nexus-site-premium"),"Premium layout class leaked");
assert.ok(!files.home.includes("nexus-home-premium")&&!files.home.includes("nexus-hero-photo-note"),"Premium Home layout was not restored");
assert.ok(files.home.includes("nexus-hero-layout-simple"),"Original full-photo hero must remain");
assert.ok(files.classic.includes(".nexus-hero-media")&&files.classic.includes("nexus-hero:after"),"Original full-bleed hero photo/overlay missing");
assert.ok(files.home.includes('fetchPriority="high"')&&files.home.includes('loading="eager"'),"LCP image must be visible in HTML with high priority");
assert.ok(!files.classic.includes("nexus-hero:before"),"CSS background image delays LCP discovery");
assert.ok(files.home.includes("settings.heroHeading")&&files.home.includes("settings.heroHighlight")&&files.home.includes("settings.featuredIds"),"Dynamic CMS configuration lost");
assert.ok(files.home.includes('method="get" action="/propiedades"'),"Property search integration lost");
assert.ok(files.home.includes("ContactForm")&&files.home.includes("PageExtraSections"),"CMS/contact integration lost");
assert.ok(files.polish.includes(":not(.public-site-organization)"),"Polish must be real-estate scoped");
assert.ok(files.polish.includes("prefers-reduced-motion:reduce"));
assert.ok(!files.polish.includes("transition:all"));
for(const marker of [".nexus-mobile-menu", ".property-gallery-photo", ".nexus-search-form"])assert.ok(files.polish.includes(marker));

for(const [path,markers] of [
 ["/",["nexus-hero-layout-simple","nexus-search-wrap","nexus-services-grid","nexus-story-panel"]],
 ["/propiedades",["nexus-catalog-filter-card","nexus-featured-grid"]],
 ["/propiedades/casa-zona-ejecutiva",["property-gallery","property-contact-card","Descargar ficha automática"]],
 ["/nosotros",["nexus-about-image","nexus-principles-grid"]],
 ["/servicios",["nexus-service-details","nexus-steps-grid"]],
 ["/contacto",["nexus-contact-form-card","nexus-contact-methods"]]
]){
 const result=await fetch(origin+path);
 assert.equal(result.status,200,"Public route failed: "+path);
 const html=await result.text();
 assert.ok(html.includes("public-site")&&!html.includes("nexus-site-premium"),"Unexpected premium marker on "+path);
 for(const mark of markers)assert.ok(html.includes(mark),"Expected "+mark+" on "+path);
}
console.log("NEXUS classic restored: original hero/cards, dynamic CMS, six public pages, safe scoped polish passed.");
