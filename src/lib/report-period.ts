export function reportPeriod(raw:string|null|undefined){
 const days=raw==="7"?7:raw==="90"?90:30;
 const from=new Date();
 from.setUTCHours(0,0,0,0);
 from.setUTCDate(from.getUTCDate()-(days-1));
 return {days,from};
}
