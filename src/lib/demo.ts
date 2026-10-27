export type PublicProperty = {
  id:string;slug:string;refCode:string;title:string;description:string;
  city:string;neighborhood:string;type:string;operation:"venta"|"alquiler";
  price:number;bedrooms:number;bathrooms:number;areaM2:number;image:string;photos:string[];
};
export type PublicTenant = {id:string;name:string;tagline:string;whatsapp:string;logoUrl:string;contactEmail:string;primaryColor:string};
export const demoTenant:PublicTenant={id:"demo",name:"Nexus Real Estate",tagline:"Pensando en tu futuro",whatsapp:"",logoUrl:"",contactEmail:"",primaryColor:"#CB2027"};
export const demoProperties:PublicProperty[]=[
 {id:"demo1",slug:"casa-zona-ejecutiva",refCode:"NX-102",title:"Casa moderna en Zona Ejecutiva",description:"Amplia residencia con ambientes luminosos y espacios de convivencia. Propiedad de muestra: precio y características ilustrativos.",city:"Managua",neighborhood:"Zona Ejecutiva",type:"Casa",operation:"venta",price:250000,bedrooms:4,bathrooms:3,areaM2:320,image:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1100",photos:[]},
 {id:"demo2",slug:"apartamento-torre-norte",refCode:"NX-205",title:"Apartamento Torre Norte",description:"Residencia urbana con vistas amplias y buena distribución. Propiedad y precio demostrativos.",city:"Managua",neighborhood:"Centro",type:"Apartamento",operation:"alquiler",price:1200,bedrooms:3,bathrooms:2,areaM2:180,image:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1100",photos:[]},
 {id:"demo3",slug:"casa-las-colinas",refCode:"NX-301",title:"Casa familiar en Las Colinas",description:"Casa de espacios confortables ideal para familias. Datos ilustrativos hasta cargar inmuebles reales.",city:"Managua",neighborhood:"Las Colinas",type:"Casa",operation:"venta",price:180000,bedrooms:3,bathrooms:2,areaM2:250,image:"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1100",photos:[]}
];
export function formatPrice(p:PublicProperty){return "US$ "+new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(p.price)+(p.operation==="alquiler"?"/mes":"");}
/** WhatsApp contact links are property-specific or real-estate general. */
export function contactUrl(t:PublicTenant,p?:PublicProperty){
 const phone=t.whatsapp.replace(/\D/g,"");
 if(!phone)return "/contacto";
 const msg=p?`Hola, estoy interesado en la propiedad Ref: ${p.refCode} en ${p.neighborhood}, ${p.city}. Quisiera recibir más información.`:
  `Hola, deseo información sobre las propiedades disponibles de ${t.name}.`;
 return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
