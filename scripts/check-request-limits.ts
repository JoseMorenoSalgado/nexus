import assert from "node:assert/strict";
import {readJsonObjectLimited,RequestPayloadError} from "../src/lib/limited-json";

async function failure(request:Request,maximum:number,status:400|413){
 await assert.rejects(()=>readJsonObjectLimited(request,maximum),error=>error instanceof RequestPayloadError&&error.status===status);
}
async function main(){
const json=(body:string,extra:Record<string,string>={})=>new Request("http://localhost/api/events",{
 method:"POST",headers:{"content-type":"application/json",...extra},body
});
assert.deepEqual(await readJsonObjectLimited(json('{"kind":"view","path":"/"}'),1024),{kind:"view",path:"/"});
await failure(json('{"x":"'+ "x".repeat(1000) +'"}'),128,413);
await failure(json('{"x":1}',{"content-length":"999999"}),128,413);
await failure(json("not-json"),128,400);
await failure(json("[]"),128,400);
await failure(json("null"),128,400);
await failure(json(""),128,400);
await failure(json('{"x":1}',{"content-length":"abc"}),128,400);
const unicode=json(JSON.stringify({nombre:"á".repeat(200)}));
await failure(unicode,250,413);
const pieces=[new TextEncoder().encode('{"x":"'),new TextEncoder().encode("A".repeat(140)),new TextEncoder().encode('"}')];
const streamed=new ReadableStream<Uint8Array>({
 pull(controller){const next=pieces.shift();if(next)controller.enqueue(next);else controller.close();}
});
await failure(new Request("http://localhost/api/leads",{
 method:"POST",body:streamed,duplex:"half"
} as RequestInit&{duplex:"half"}),128,413);
console.log("Request limits: advertised, streamed, malformed and Unicode JSON safely rejected.");

}
void main().catch(error=>{console.error(error);process.exitCode=1;});
