import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const nav=read("src/components/site-customizer-nav.tsx");
for(const href of ["/admin/personalizar/paginas","/admin/personalizar/menu","/admin/personalizar/identidad"]){
 assert.ok(nav.includes(href),"Falta navegación: "+href);
}
for(const [file,current] of [
 ["src/app/admin/(panel)/personalizar/paginas/page.tsx",'current="pages"'],
 ["src/app/admin/(panel)/personalizar/menu/page.tsx",'current="menu"'],
 ["src/app/admin/(panel)/personalizar/identidad/page.tsx",'current="identity"']
]){
 assert.ok(read(file).includes(current),"Navegación independiente incompleta: "+file);
}
const pageData=read("src/lib/site-pages.ts");
assert.ok(pageData.includes('getPageDefinitions(tenantId,{includeSummary:false})'),
 "Public site navigation must avoid loading all custom page content");
assert.ok(pageData.includes('select:{slug:true,title:true,published:true}'),
 "Public menu lookup must select only metadata");
const pages=read("src/app/admin/(panel)/personalizar/paginas/page.tsx");
assert.ok(pages.includes("tabHref(t.id)"),"Los filtros deben conservar la búsqueda");
assert.ok(!pages.includes("getSiteMenu("),"Evitar leer el menú desde el índice de páginas");
const legacy=read("src/app/admin/(panel)/personalizar/contenido/page.tsx");
assert.ok(legacy.includes('redirect("/admin/personalizar/inicio")'),"Editor antiguo debe abrir el sitio web");
assert.ok(!legacy.includes('action="/api/admin/site-settings"'),"Editor duplicado aún puede modificar todo el sitio");
const menu=read("src/components/site-menu-editor.tsx");
assert.match(menu,/cms-menu-preview-collapsible/);
assert.match(menu,/cms-menu-remove/);
const media=read("src/components/site-asset-manager.tsx");
assert.ok(!media.includes('Logo predeterminado de NEXUS'),"La interfaz debe ser multicliente");
const css=read("src/app/cms-tidy.css");
assert.match(css,/\.site-menu-edit-row\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(css,/@media\(max-width:620px\)/);
console.log("Personalizador: navegación única, búsqueda, menú, responsividad e independencia verificados.");
