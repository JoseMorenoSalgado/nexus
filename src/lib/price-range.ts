/** Shared strict USD range parser for public home and catalog searches. */
const price=/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
function getPrice(value:unknown){
 if(value===undefined||value==="")return {valid:true,value:undefined as number|undefined,input:""};
 if(typeof value!=="string"||!price.test(value)||Number(value)>9999999999)return {valid:false,value:undefined as number|undefined,input:""};
 return {valid:true,value:Number(value),input:value};
}
export function parsePriceRange(params:Record<string,unknown>){
 const minimum=getPrice(params.precioMin),maximum=getPrice(params.precioMax);
 return {
  min:minimum.value,max:maximum.value,
  minInput:minimum.input,maxInput:maximum.input,
  valid:minimum.valid&&maximum.valid&&(minimum.value===undefined||maximum.value===undefined||minimum.value<=maximum.value)
 };
}
