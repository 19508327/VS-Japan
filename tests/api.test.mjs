import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/indicators.js";
function reply() {
 const out={statusCode:200,headers:{},body:null};
 return {
  out,
  res:{
   setHeader(k,v){out.headers[k]=v;},
   status(n){out.statusCode=n;return this;},
   json(value){out.body=value;return this;}
  }
 };
}
async function run(req) {
 const {out,res}=reply();
 await handler(req,res);
 return out;
}
test("unknown identifiers are rejected without requesting upstream data",async()=>{
 const response=await run({method:"GET",query:{id:"random"}});
 assert.equal(response.statusCode,400);
});
test("WDI parser respects zero readings and year ordering",async()=>{
 const prev=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify([{},[
   {date:"2025",value:"3.7"},{date:"2024",value:0},{date:"2023",value:null}
 ]])});
 try{
  const r=await run({method:"GET",query:{id:"gdp"}});
  assert.equal(r.statusCode,200);
  assert.deepEqual(r.body.data[0].series,[{year:2024,value:0},{year:2025,value:3.7}]);
 }finally{globalThis.fetch=prev;}
});
test("FRED observations collapse daily timestamps to latest day each month",async()=>{
 const prev=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,text:async()=>[
  "observation_date,VALUE","2025-01-01,100","2025-01-25,105","2025-02-01,.","2025-02-28,102"
 ].join("\n")});
 try{
  const r=await run({method:"GET",query:{id:"stock"}});
  assert.equal(r.statusCode,200);
  assert.deepEqual(r.body.data[0].series,[{month:"2025-01",value:105},{month:"2025-02",value:102}]);
 }finally{globalThis.fetch=prev;}
});
test("failed upstream source returns 503 instead of invented observations",async()=>{
 const prev=globalThis.fetch;
 globalThis.fetch=async()=>({ok:false,status:502,text:async()=>""});
 const prevError=console.error;console.error=()=>{};
 try{
  const r=await run({method:"GET",query:{id:"rate"}});
  assert.equal(r.statusCode,503);
  assert.equal(r.out?.body?.data,undefined);
 }finally{globalThis.fetch=prev;console.error=prevError;}
});
