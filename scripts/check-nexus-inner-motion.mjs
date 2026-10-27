import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const pages=[
 ["catalogo","src/app/propiedades/page.tsx"],
 ["detalle","src/app/propiedades/[slug]/page.tsx"],
 ["nosotros","src/app/nosotros/page.tsx"],
 ["servicios","src/app/servicios/page.tsx"],
 ["contacto","src/app/contacto/page.tsx"]
];
const motion=readFileSync("src/components/nexus-inner-motion.tsx","utf8");
const style=readFileSync("src/app/styles/templates/nexus-inner-motion.css","utf8");
const layout=readFileSync("src/app/layout.tsx","utf8");
const home=readFileSync("src/components/templates/real-estate-home.tsx","utf8");
const pkg=JSON.parse(readFileSync("package.json","utf8"));
for(const [name,path] of pages){
 const source=readFileSync(path,"utf8");
 assert.ok(source.includes('data-nexus-inner-motion="'+name+'"')&&source.includes("<NexusInnerMotion/>"),"Motion missing "+name);
 assert.ok(source.includes("PublicFrame"),"Page frame changed: "+name);
}
assert.ok(home.includes("<NexusHomeMotion/>")&&home.includes("nexus-hero-layout-simple"),"Classic Home must be unchanged");
assert.ok(!home.includes("NexusInnerMotion"),"Do not double-animate Home");
assert.ok(layout.includes('import "./styles/templates/nexus-inner-motion.css";'),"Inner-page CSS is not loaded");
assert.ok(layout.indexOf("nexus-home-motion.css")<layout.indexOf("nexus-inner-motion.css"),"Keep original motion CSS before inner-page CSS");
assert.ok(motion.includes('"use client"')&&motion.includes("IntersectionObserver")&&motion.includes("element.animate("),"Use the browser animation API without new libraries");
assert.ok(motion.includes('reduced.matches')&&motion.includes("observer.disconnect()")&&motion.includes("return null;"),"Reduced motion, cleanup, no-JS fallback required");
assert.ok(!motion.includes('window.addEventListener("scroll"'),"Avoid scroll listeners");
assert.ok(!motion.includes(".property-gallery")&&!motion.includes("nexus-contact-form-card")&&!motion.includes("nexus-catalog-filter-card"),"Do not apply JS reveal to interactive forms or galleries");
assert.ok(style.includes("prefers-reduced-motion:reduce")&&style.includes("prefers-reduced-motion:no-preference"));
assert.ok(style.includes("[data-nexus-inner-motion]"),"Motion must stay within intended pages");
assert.ok(!style.includes("transition:all")&&!style.includes("background-position:"),"Avoid costly animation properties");
assert.equal((style.match(/{/g)||[]).length,(style.match(/}/g)||[]).length,"Unbalanced CSS blocks");
for(const name of ["framer-motion","motion","gsap","aos"])assert.ok(!Object.prototype.hasOwnProperty.call(pkg.dependencies||{},name),"No dependency: "+name);
console.log("NEXUS inner pages motion: five original routes, preserved CMS, no form/gallery animation, reduced motion and no new dependencies.");
