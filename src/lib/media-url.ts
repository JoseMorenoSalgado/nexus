export type MediaVariant="card"|"thumb";
export function mediaVariantUrl(url:string,variant:MediaVariant){
 return /^\/api\/media\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(url)?url+"?variant="+variant:url;
}
