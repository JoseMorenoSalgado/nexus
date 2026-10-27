import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const layout=readFileSync("src/app/layout.tsx","utf8");
const modules=["src/app/globals.css","src/app/styles/legacy/admin-shell.css","src/app/styles/legacy/real-estate-admin.css","src/app/styles/templates/nexus-public.css","src/app/styles/legacy/cms.css","src/app/styles/templates/nexus-property.css","src/app/styles/legacy/agent-admin.css","src/app/styles/templates/nexus-property-cover.css","src/app/styles/legacy/commercial-workflows.css","src/app/styles/templates/nexus-classic-polish.css","src/app/styles/templates/nexus-home-motion.css","src/app/styles/templates/nexus-inner-motion.css","src/app/styles/templates/nexus-advisory.css"];
let last=-1;
for(const file of modules){
 const content=readFileSync(file,"utf8");
 assert.ok(content.length>400,"Módulo incompleto: "+file);
 assert.equal((content.match(/{/g)||[]).length,(content.match(/}/g)||[]).length,"Bloques CSS desbalanceados: "+file);
 const importLine='import "./'+file.replace("src/app/","")+'";';
 const at=layout.indexOf(importLine);
 assert.ok(at>last,"CSS importado fuera del orden original: "+file);
 last=at;
}
const shared=readFileSync("src/app/globals.css","utf8");
assert.ok(shared.includes("@tailwind base")&&shared.includes("@tailwind utilities"));
assert.ok(!shared.includes("/* NEXUS public design:"),"Estilos sectoriales deben permanecer separados");
const brand=readFileSync("src/app/styles/templates/nexus-public.css","utf8");
assert.ok(brand.includes(".public-site"));
console.log("CSS modular: import order, rule boundaries and template scoping checked.");
