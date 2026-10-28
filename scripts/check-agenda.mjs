import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Agenda integration tests require an isolated localhost server.");

async function login(email,password){
 const form=new FormData();form.set("email",email);form.set("password",password);
 const res=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:form,redirect:"manual"});
 assert.equal(res.status,303);
 const cookie=res.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="));
 assert.ok(cookie,"Missing authentication cookie");
 return cookie.split(";")[0];
}
async function post(path,body,cookie,requestOrigin=origin){
 return fetch(origin+path,{method:"POST",headers:{Origin:requestOrigin,Cookie:cookie},body,redirect:"manual"});
}
async function get(path,cookie){
 return fetch(origin+path,{headers:cookie?{Cookie:cookie}:{},redirect:"manual"});
}
const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
const before=await get("/admin/agenda",admin);
assert.equal(before.status,200);
const startText=await before.text();
if(startText.includes("Activar agenda comercial")){
 const anonymous=await post("/api/admin/agenda/activate",new FormData(),"");
 assert.notEqual(anonymous.status,200);
 const activate=await post("/api/admin/agenda/activate",new FormData(),admin);
 assert.equal(activate.status,303);
 assert.match(activate.headers.get("location")||"",/activated=1/);
}
const monthReady=await get("/admin/agenda",admin);
assert.equal(monthReady.status,200);
assert.match(await monthReady.text(),/Programar nueva actividad/);

const stamp=Date.now().toString(36);
const leadForm=new FormData();
leadForm.set("name","Prospecto agenda CI "+stamp);
leadForm.set("phone","88887777");
leadForm.set("source","telefono");
leadForm.set("consent","on");
const leadResponse=await post("/api/admin/crm/leads",leadForm,admin);
assert.equal(leadResponse.status,303);
const leadId=new URL(leadResponse.headers.get("location"),origin).pathname.split("/").at(-1);
assert.ok(/^[a-z0-9]{20,40}$/.test(leadId));
const startsAt=new Date(Date.now()+3*864e5).toISOString();
const month=startsAt.slice(0,7);
function appointment(leadId,title){
 const f=new FormData();
 f.set("leadId",leadId);f.set("type","visita");f.set("title",title);
 f.set("startsAt",startsAt);f.set("durationMinutes","60");
 f.set("location","Visita en propiedad de pruebas");f.set("notes","Activación controlada para pruebas de agenda");
 return f;
}
const title="Visita comercial CI "+stamp;
const saved=await post("/api/admin/agenda",appointment(leadId,title),admin);
assert.equal(saved.status,303);
assert.match(saved.headers.get("location")||"",/created=1/);
const display=await get("/admin/agenda?mes="+month,admin);
assert.equal(display.status,200);
const html=await display.text();
assert.ok(html.includes(title),"Saved event absent from commercial calendar.");
const found=html.match(/id="agenda-([a-z0-9]{20,40})"/);
assert.ok(found,"Agenda event identifier missing.");
const id=found[1];
const meeting=appointment(leadId,"Reunión con enlace de prueba "+stamp);
meeting.set("type","reunion");meeting.set("meetingUrl","https://meet.google.com/abc-defg-hij");
const meetingSaved=await post("/api/admin/agenda",meeting,admin);
assert.match(meetingSaved.headers.get("location")||"",/created=1/);
const meetingHtml=await (await get("/admin/agenda?mes="+month,admin)).text();
assert.ok(meetingHtml.includes("https://meet.google.com/abc-defg-hij"),"Videoconference URL missing from calendar.");
const insecure=appointment(leadId,"Reunión con enlace inválido");
insecure.set("type","reunion");insecure.set("meetingUrl","http://example.com/meeting");
const insecureResult=await post("/api/admin/agenda",insecure,admin);
assert.match(insecureResult.headers.get("location")||"",/error=datos/,"Only HTTPS meeting URLs are allowed.");
const nonmeeting=appointment(leadId,"Visita con enlace");
nonmeeting.set("meetingUrl","https://meet.google.com/abc-defg-hij");
const nonmeetingResult=await post("/api/admin/agenda",nonmeeting,admin);
assert.match(nonmeetingResult.headers.get("location")||"",/error=datos/,"Only meetings may contain video links.");
const foreignOrigin=await post("/api/admin/agenda/"+id,new FormData(),admin,"https://other.invalid");
assert.match(foreignOrigin.headers.get("location")||"",/error=origen/);
const done=new FormData();
done.set("intent","status");done.set("status","realizada");
const marked=await post("/api/admin/agenda/"+id,done,admin);
assert.match(marked.headers.get("location")||"",/updated=1/);
const afterDone=await (await get("/admin/agenda?mes="+month,admin)).text();
assert.match(afterDone,/Realizada/);
const move=new FormData();move.set("intent","reschedule");
move.set("startsAt",new Date(Date.now()+5*864e5).toISOString());
move.set("durationMinutes","90");
const moved=await post("/api/admin/agenda/"+id,move,admin);
assert.match(moved.headers.get("location")||"",/updated=1/);
const afterMove=await (await get("/admin/agenda?mes="+month,admin)).text();
assert.match(afterMove,/Pendiente/);
const invalid=new FormData();
invalid.set("leadId","not-in-tenant");invalid.set("type","llamada");
invalid.set("title","Entrada incorrecta");invalid.set("startsAt",startsAt);
invalid.set("durationMinutes","30");invalid.set("location","");invalid.set("notes","");
const denied=await post("/api/admin/agenda",invalid,admin);
assert.match(denied.headers.get("location")||"",/error=prospecto/);

const agentEmail="agenda-agent-"+stamp+"@example.test";
const password="CI-agenda-agent-password-2026-123";
const createUser=new FormData();
createUser.set("intent","create");createUser.set("name","Agente Agenda CI");createUser.set("email",agentEmail);
createUser.set("password",password);createUser.append("roles","agente");
const created=await post("/api/admin/users",createUser,admin);
assert.match(created.headers.get("location")||"",/status=creado/);
const usersPage=await (await get("/admin/clientes-agentes",admin)).text();
const index=usersPage.indexOf(agentEmail);
assert.ok(index>=0);
const idMatch=usersPage.slice(index,index+1600).match(/href="\/admin\/clientes-agentes\/agentes\/([a-z0-9]{20,40})"/);
assert.ok(idMatch);
const ownerId=idMatch[1];
const assign=new FormData();assign.set("intent","assign");assign.set("assignedAgentId",ownerId);
const assigned=await post("/api/admin/crm/leads/"+leadId,assign,admin);
assert.match(assigned.headers.get("location")||"",/assigned=1/);
const agent=await login(agentEmail,password);
const own=await (await get("/admin/agenda?mes="+month,agent)).text();
assert.ok(own.includes(title),"Agenda event did not follow lead assignment.");
const otherLead=new FormData();otherLead.set("name","Otro prospecto privado "+stamp);
otherLead.set("phone","87776666");otherLead.set("source","telefono");otherLead.set("consent","on");
const newOther=await post("/api/admin/crm/leads",otherLead,admin);
const otherId=new URL(newOther.headers.get("location"),origin).pathname.split("/").at(-1);
const cross=await post("/api/admin/agenda",appointment(otherId,"Actividad ajena CI"),agent);
assert.match(cross.headers.get("location")||"",/error=prospecto/);
const lose=new FormData();lose.set("intent","assign");lose.set("assignedAgentId","");
await post("/api/admin/crm/leads/"+leadId,lose,admin);
const lost=await (await get("/admin/agenda?mes="+month,agent)).text();
assert.ok(!lost.includes(title),"Agent can read agenda after losing prospect ownership.");
const unauthorizedUpdate=await post("/api/admin/agenda/"+id,done,agent);
assert.match(unauthorizedUpdate.headers.get("location")||"",/error=noexiste/);
console.log("Commercial agenda: activation, scheduling, status, rescheduling, tenant scope, and agent transfer permissions passed.");
