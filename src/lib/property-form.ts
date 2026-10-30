export type PropertyValues={
 title:string;city:string;neighborhood:string;type:string;operation:string;price:number;
 bedrooms:number;bathrooms:number;areaM2:number;description:string;published:boolean;featured:boolean;
};
export class PropertyFormError extends Error{constructor(public readonly code:string){super(code);}}
const allowedTypes=new Set(["Casa","Apartamento","Terreno","Local","Otro"]);
const read=(form:FormData,name:string,max:number)=>{
 const value=form.get(name);
 if(typeof value!=="string"||value.length>max+20)throw new PropertyFormError("datos");
 const clean=value.trim();
 if(clean.length>max)throw new PropertyFormError("datos");
 return clean;
};
const whole=(form:FormData,name:string)=>{
 const raw=read(form,name,12);
 if(!/^\d+$/.test(raw))throw new PropertyFormError("datos");
 const n=Number(raw);
 if(!Number.isSafeInteger(n)||n>10000000)throw new PropertyFormError("datos");
 return n;
};
export function parseProperty(form:FormData):PropertyValues{
 const title=read(form,"title",140);
 const city=read(form,"city",80);
 const neighborhood=read(form,"neighborhood",80);
 const description=read(form,"description",8000);
 const type=read(form,"type",40),operation=read(form,"operation",20);
 const rawPrice=read(form,"price",24);
 const price=Number(rawPrice);
 if(title.length<5||city.length<2||description.length<10)throw new PropertyFormError("datos");
 if(!allowedTypes.has(type)||!["venta","alquiler"].includes(operation))throw new PropertyFormError("datos");
 if(!/^\d{1,11}(\.\d{1,2})?$/.test(rawPrice)||!Number.isFinite(price)||price<=0)throw new PropertyFormError("precio");
 return {
  title,city,neighborhood,description,type,operation,price,
  bedrooms:whole(form,"bedrooms"),bathrooms:whole(form,"bathrooms"),areaM2:whole(form,"areaM2"),
  published:form.get("published")==="on",featured:form.get("featured")==="on"
 };
}
export function propertySlug(title:string,refCode:string){
 const prefix=title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,75);
 return (prefix||"propiedad")+"-"+refCode.toLowerCase();
}
