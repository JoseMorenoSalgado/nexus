export type MetricDay={day:string;visitas:number;leads:number;whatsapp:number};
type Activity={kind:string;createdAt:Date};
type LeadCreated={createdAt:Date};
/**
 * Index data once rather than filtering all events for every day and KPI.
 * All boundaries are UTC, matching timestamps written by the database.
 */
export function makeDailyMetrics(events:Activity[],leads:LeadCreated[],days=14,now=new Date()):MetricDay[]{
 const length=Math.max(1,Math.min(days,90));
 const midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 const first=new Date(midnight-(length-1)*86400000);
 const iso=(d:Date)=>d.toISOString().slice(0,10);
 const dates=Array.from({length},(_,i)=>new Date(first.getTime()+i*86400000));
 const buckets=new Map(dates.map(date=>[iso(date),{visitas:0,leads:0,whatsapp:0}]));
 for(const event of events){
  const b=buckets.get(iso(event.createdAt));
  if(!b)continue;
  if(event.kind==="view")b.visitas++;
  if(event.kind==="whatsapp")b.whatsapp++;
 }
 for(const lead of leads){
  const b=buckets.get(iso(lead.createdAt));
  if(b)b.leads++;
 }
 return dates.map(date=>{
  const metrics=buckets.get(iso(date))!;
  return {day:date.toLocaleDateString("es",{day:"2-digit",month:"short",timeZone:"UTC"}),...metrics};
 });
}
export function firstDayOfSeries(days=14,now=new Date()){
 const length=Math.max(1,Math.min(days,90));
 return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-(length-1)));
}
