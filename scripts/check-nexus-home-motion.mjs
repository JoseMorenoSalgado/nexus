import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const home=readFileSync("src/components/templates/real-estate-home.tsx","utf8");
const motion=readFileSync("src/components/nexus-home-motion.tsx","utf8");
const css=readFileSync("src/app/styles/templates/nexus-home-motion.css","utf8");
const layout=readFileSync("src/app/layout.tsx","utf8");
const classic=readFileSync("src/app/styles/templates/nexus-classic-polish.css","utf8");
const packageJson=JSON.parse(readFileSync("package.json","utf8"));

assert.ok(home.includes('data-nexus-home-motion')&&home.includes('<NexusHomeMotion/>'),"Home motion must mount only in real-estate homepage");
assert.ok(home.includes('className="container nexus-hero-layout nexus-hero-layout-simple"'),"Do not replace the restored classic photo hero");
assert.ok(home.includes('settings.heroHeading')&&home.includes('settings.heroHighlight')&&home.includes('settings.featuredIds'),"Hero settings and featured listings must remain dynamic");
assert.ok(home.includes('method="get" action="/propiedades"')&&home.includes("ContactForm")&&home.includes("PageExtraSections"),"Keep search, contact and CMS extras");
assert.ok(layout.includes('import "./styles/templates/nexus-home-motion.css";'),"Animation stylesheet must load");
assert.ok(layout.indexOf("nexus-classic-polish.css")<layout.indexOf("nexus-home-motion.css"),"Motion must load after classic layout");
assert.ok(classic.includes(".nexus-hero-layout.nexus-hero-layout-simple"),"Preserve approved classic visual baseline");
assert.ok(css.includes("[data-nexus-home-motion]"),"Animations must be scoped only to Home");
assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"),"Animations must respect reduced motion");
assert.ok(css.includes("nexus-home-arrive")&&css.includes("nexus-home-search-arrive"),"Hero and search animations absent");
assert.ok(!css.includes("transition:all")&&!css.includes("background-position:"),"Avoid expensive broad or background animations");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"Unbalanced CSS rules");
assert.ok(motion.includes('"use client"')&&motion.includes("IntersectionObserver")&&motion.includes(".animate("),"Need progressive one-time reveal without dependency");
assert.ok(motion.includes("reduced.matches")&&motion.includes("observer.disconnect()"),"Motion reduction and cleanup required");
assert.ok(motion.includes("return null;")&&motion.includes("fill:\"none\""),"Server content must always be visible without JS");
for(const dep of ["framer-motion","motion","gsap","aos"]){
 assert.ok(!Object.prototype.hasOwnProperty.call(packageJson.dependencies||{},dep),"No animation libraries should be added: "+dep);
}
console.log("NEXUS Home motion: classic design, scoped animations, reduced motion, no dependencies or data regressions.");
