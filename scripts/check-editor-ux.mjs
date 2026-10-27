import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const fields=readFileSync("src/components/admin-property-fields.tsx","utf8");
for(const field of ["refCode","title","city","type","operation","price","description","areaM2","bedrooms","bathrooms","published","assignedAgentId","featured"]){
 assert.match(fields,new RegExp('name="'+field+'"'),"No se debe perder el campo "+field);
}
const optionalIndex=fields.indexOf('<details className="editor-disclosure');
assert.ok(optionalIndex>0);
for(const required of ["refCode","title","city","price","description","bedrooms","bathrooms","areaM2"]){
 const pos=fields.indexOf('name="'+required+'"');
 assert.ok(pos>0&&pos<optionalIndex,"Campo obligatorio oculto en sección plegada: "+required);
}
assert.match(fields,/name="published".*defaultChecked=\{Boolean\(property\?\.published\)\}/);
assert.match(fields,/name="featured".*defaultChecked=\{Boolean\(property\?\.featured\)\}/);
const edit=readFileSync("src/app/admin/(panel)/propiedades/[id]/editar/page.tsx","utf8");
assert.match(edit,/id="editar-fotos"/);
assert.match(edit,/id="editar-pdf"/);
assert.match(edit,/className="admin-panel property-photo-panel editor-media-panel"/);
assert.match(edit,/property-danger/);
const lead=readFileSync("src/app/admin/(panel)/leads/[id]/page.tsx","utf8");
assert.match(lead,/crm-detail-simplified/);
assert.match(lead,/Próxima acción/);
assert.match(lead,/Historial de notas/);
assert.match(lead,/Historial de asignaciones/);
assert.match(lead,/name="nextContactAt"/);
assert.match(lead,/name="assignedAgentId"/);
const style=readFileSync("src/app/editor-tidy.css","utf8");
assert.match(style,/\.crm-detail-simplified \.crm-followup-panel\{grid-row:1\}/);
console.log("Edición de propiedades y seguimiento CRM: campos, jerarquía y accesos conservados.");
