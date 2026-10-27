"use client";
import {ResponsiveContainer,CartesianGrid,XAxis,YAxis,Tooltip,Legend,AreaChart,Area,PieChart,Pie,Cell} from "recharts";
export type MetricDay={day:string;visitas:number;leads:number;whatsapp:number};
export function TrafficChart({data}:{data:MetricDay[]}){
 return <div className="responsive-chart"><ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data} margin={{left:-24,right:8,top:7,bottom:0}}>
   <defs><linearGradient id="redfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cf202b" stopOpacity={.17}/><stop offset="100%" stopColor="#cf202b" stopOpacity={0}/></linearGradient></defs>
   <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" vertical={false}/>
   <XAxis dataKey="day" minTickGap={22} interval="preserveStartEnd" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
   <YAxis allowDecimals={false} tick={{fontSize:11}} axisLine={false} tickLine={false}/>
   <Tooltip/><Legend iconType="circle" wrapperStyle={{fontSize:12}}/>
   <Area name="Visitas" dataKey="visitas" type="monotone" stroke="#cf202b" fill="url(#redfill)" strokeWidth={2.4}/>
   <Area name="Leads" dataKey="leads" type="monotone" stroke="#0fa768" fill="transparent" strokeWidth={2}/>
   <Area name="WhatsApp" dataKey="whatsapp" type="monotone" stroke="#fd831d" fill="transparent" strokeWidth={2}/>
  </AreaChart></ResponsiveContainer></div>;
}
const colors=["#cf202b","#0ea66b","#ff8224","#8756d7","#a9b1c1"];
export function TypesChart({data}:{data:{name:string;value:number}[]}){
 if(!data.length)return <p className="admin-empty">Todavía no hay propiedades para mostrar.</p>;
 return <div><div className="responsive-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={2}>{data.map((d,i)=><Cell key={d.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="donut-list">{data.map((d,i)=><div key={d.name}><span><span style={{color:colors[i%colors.length]}}>●</span> {d.name}</span><strong>{d.value}</strong></div>)}</div></div>;
}
