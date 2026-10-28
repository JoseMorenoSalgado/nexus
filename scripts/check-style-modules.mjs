import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=readFileSync("src/app/layout.tsx","utf8");
const admin=readFileSync("src/app/admin/layout.tsx","utf8");
const publicFiles=[
 "globals.css",
 "styles/legacy/admin-shell.css",
 "styles/templates/nexus-public.css",
 "styles/templates/nexus-property.css",
 "styles/legacy/agent-admin.css",
 "styles/templates/nexus-property-cover.css",
 "home-tidy.css",
 "page-content.css",
 "cms-extras.css",
 "mobile-native.css",
 "styles/templates/nexus-classic-polish.css",
 "styles/templates/nexus-home-motion.css",
 "styles/templates/nexus-inner-motion.css",
 "styles/templates/nexus-advisory.css"
];
const adminFiles=[
 "styles/legacy/real-estate-admin.css",
 "styles/legacy/cms.css",
 "styles/legacy/commercial-workflows.css",
 "admin-tidy.css",
 "inventory-tidy.css",
 "editor-tidy.css",
 "cms-tidy.css",
 "template-editor.css",
 "page-editor-blocks.css"
];
const check=(files,layout,prefix)=>{
 let last=-1;
 for(const file of files){
  const content=readFileSync("src/app/"+file,"utf8");
  assert.ok(content.length>400,"Incomplete CSS: "+file);
  assert.equal((content.match(/{/g)||[]).length,(content.match(/}/g)||[]).length,"Unbalanced CSS: "+file);
  const importLine='import "'+prefix+file+'";';
  const at=layout.indexOf(importLine);
  assert.ok(at>last,"Missing or out-of-order CSS import: "+file);
  last=at;
 }
};
check(publicFiles,root,"./");
check(adminFiles,admin,"../");
for(const file of adminFiles){
 assert.ok(!root.includes('import "./'+file+'";'),"Private CSS leaked into public root layout: "+file);
}
const shared=readFileSync("src/app/globals.css","utf8");
assert.ok(shared.includes("@tailwind base")&&shared.includes("@tailwind utilities"));
assert.ok(!shared.includes("/* NEXUS public design:"),"Sector CSS must remain separated");
const brand=readFileSync("src/app/styles/templates/nexus-public.css","utf8");
assert.ok(brand.includes(".public-site"));
console.log("NEXUS CSS: public/admin chunk boundaries and style import orders verified.");
