// Public-data adapter. No credentials; official WDI and FRED-hosted OECD series.
const WDI={
 gdp:"NY.GDP.MKTP.KD.ZG",
 inflation:"FP.CPI.TOTL.ZG",
 youth:"SL.UEM.1524.ZS",
 rate:"FR.INR.LEND",
 money:"FM.LBL.BMNY.ZG"
};
const FRED={
 stock:{CHN:"SPASTT01CNM661N",JPN:"SPASTT01JPM661N"},
 fx:{CHN:"DEXCHUS",JPN:"DEXJPUS"}
};
async function getText(url) {
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),11000);
 try {
  const r=await fetch(url,{signal:ctrl.signal,headers:{"Accept":"application/json,text/csv,*/*","User-Agent":"VS-Japan-Research/2.1"}});
  if(!r.ok)throw Error("HTTP "+r.status);
  return await r.text();
 } finally {clearTimeout(timer);}
}
function parseFred(text) {
 const rows=text.replace(/^\uFEFF/,"").trim().split(/\r?\n/).slice(1);
 const result=new Map();
 for(const line of rows){
  const [date,raw]=line.replace(/"/g,"").split(",");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))continue;
  const n=Number(raw); if(!Number.isFinite(n)||n<=0||raw===".")continue;
  const month=date.slice(0,7),prior=result.get(month);
  if(!prior||date>prior.date)result.set(month,{date,value:n});
 }
 return [...result].sort((a,b)=>a[0].localeCompare(b[0]))
   .filter(([month])=>month>="1960-01")
   .map(([month,item])=>({month,value:item.value}));
}
async function worldBank(id) {
 const code=WDI[id];
 const data=await Promise.all(["CHN","JPN"].map(async country=>{
  const url="https://api.worldbank.org/v2/country/"+country+"/indicator/"+code+"?format=json&per_page=120&date=1985:2026";
  const json=JSON.parse(await getText(url));
  if(!Array.isArray(json)||!Array.isArray(json[1]))throw Error("Invalid WDI response");
  const series=json[1].filter(p=>p.value!==null&&Number.isFinite(Number(p.value)))
    .map(p=>({year:Number(p.date),value:Number(p.value)}))
    .sort((a,b)=>a.year-b.year);
  return {country,series,last:series.at(-1)?.year??null};
 }));
 return {code,frequency:"annual",source:"https://data.worldbank.org/indicator/"+code,retrievedAt:new Date().toISOString(),data};
}
async function fred(id){
 const data=await Promise.all(Object.entries(FRED[id]).map(async([country,code])=>{
  const url="https://fred.stlouisfed.org/graph/fredgraph.csv?id="+encodeURIComponent(code);
  const series=parseFred(await getText(url));
  if(!series.length)throw Error("No valid FRED observations for "+code);
  return {country,series,last:series.at(-1)?.month??null,code};
 }));
 return {code:Object.values(FRED[id]).join(" / "),frequency:"monthly",source:"https://fred.stlouisfed.org/series/"+FRED[id].CHN,
   sources:Object.fromEntries(Object.entries(FRED[id]).map(([country,code])=>[country,"https://fred.stlouisfed.org/series/"+code])),
   retrievedAt:new Date().toISOString(),data};
}
export default async function handler(req,res) {
 res.setHeader("Access-Control-Allow-Origin","*");
 res.setHeader("X-Content-Type-Options","nosniff");
 const id=String(req.query?.id||"");
 if(req.method!=="GET")return res.status(405).json({error:"Only GET is supported"});
 if(!Object.hasOwn(WDI,id)&&!Object.hasOwn(FRED,id))return res.status(400).json({error:"Unknown indicator"});
 try{
  const payload=Object.hasOwn(WDI,id)?await worldBank(id):await fred(id);
  res.setHeader("Cache-Control","public,s-maxage=21600,stale-while-revalidate=86400");
  return res.status(200).json(payload);
 }catch(err){
  console.error("series source failure",id,String(err?.message||err).slice(0,120));
  res.setHeader("Cache-Control","no-store");
  return res.status(503).json({error:"上游数据暂不可用",indicator:id});
 }
}
