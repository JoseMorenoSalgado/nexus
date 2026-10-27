import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Test only the ephemeral CI server.");
const url="/propiedades/casa-zona-ejecutiva";
const response=await fetch(origin+url);
assert.equal(response.status,200,"Property detail must be publicly accessible");
const html=await response.text();

for(const marker of [
 "property-detail-layout","property-detail-header","property-detail-main","property-detail-sidebar",
 "property-contact-card","property-gallery-viewport","property-gallery-stage",
 "property-gallery-expand","property-detail-stats",
 "property-detail-documents","Descargar ficha automática","NX-102",
 "Consultar por WhatsApp"
]){
 if(marker==="Consultar por WhatsApp")continue; // Preview intentionally has no configured WhatsApp.
 assert.ok(html.includes(marker),"Missing property feature: "+marker);
}
assert.ok(html.indexOf("property-detail-layout")<html.indexOf("property-detail-sidebar"),
 "Contact sidebar must share the property detail grid");
assert.ok(html.indexOf("property-gallery-viewport")<html.indexOf("Detalles de la propiedad"),
 "Gallery should precede technical details");
const css=[
 "src/app/styles/templates/nexus-property.css",
 "src/app/styles/templates/nexus-property-cover.css"
].map(file=>readFileSync(file,"utf8")).join("\n");
assert.match(css,/\.public-site \.property-detail-layout\{display:grid;grid-template-columns:/,
 "Desktop property page should use compact two-column layout");
assert.match(css,/\.public-site \.property-detail-sidebar\{[^}]*position:sticky/,
 "Contact card should remain visible on desktop");
assert.match(css,/\.public-site \.property-gallery-photo\{[^}]*width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important/,
 "Gallery must not stretch the original photo or crop it");
assert.match(css,/@media\(max-width:820px\)\{[^}]*\.public-site \.property-detail-layout\{grid-template-columns:minmax\(0,1fr\)/,
 "Contact panel should stack below image on mobile");
assert.match(css,/\.public-site \.property-card>\.property-photo>img\{[^}]*object-fit:cover!important/s,
 "Featured home cards must fill their photo frame instead of showing empty sidebars");
const gallery=readFileSync("src/components/property-gallery.tsx","utf8");
assert.ok(gallery.includes('useEmblaCarousel')&&gallery.includes('emblaApi?.scrollNext()'),
 "Swipe carousel must use Embla");
assert.ok(gallery.includes('yet-another-react-lightbox')&&gallery.includes('plugins={[Zoom]}'),
 "Full-screen viewer must support zoom");
assert.ok(gallery.includes("dimensions.width/photo.clientWidth<1.35"),
 "Hover must not zoom low-resolution photographs artificially");
assert.ok(gallery.includes('aria-label={"Ampliar fotografía'),
 "Zoom control must be accessible");
console.log("Property detail: responsive two-column composition, Embla, guarded hover and lightbox zoom verified.");
