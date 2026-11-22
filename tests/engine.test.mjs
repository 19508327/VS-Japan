import test from "node:test";
import assert from "node:assert/strict";
import {percentChange,shiftMonth,monthStreak,rankJapan,monthlyGrowth,snapshot} from "../engine.mjs";

const mini={
 stock:{data:[
  {country:"CHN",series:[{month:"2024-11",value:100},{month:"2025-10",value:110},{month:"2025-11",value:120},{month:"2025-12",value:130}]},
  {country:"JPN",series:[{month:"1990-11",value:100},{month:"1991-11",value:120},{month:"1991-12",value:130},{month:"1990-12",value:100}]}]},
 fx:{data:[
  {country:"CHN",series:[{month:"2024-12",value:7},{month:"2025-12",value:7.5}]},
  {country:"JPN",series:[{month:"1990-12",value:100},{month:"1991-12",value:110}]}]},
 gdp:{data:[{country:"CHN",series:[{year:2025,value:4}]},{country:"JPN",series:[{year:1991,value:4}]}]}
};
test("month calculations handle year boundaries",()=>{
 assert.equal(shiftMonth("2025-01",-1),"2024-12");
 assert.equal(shiftMonth("2025-12",-12),"2024-12");
 assert.equal(shiftMonth("2025-13",-1),null);
});
test("missing denominators cannot produce an invented 0",()=>{
 assert.equal(percentChange(5,null),null);
 assert.equal(percentChange(5,0),null);
 assert.equal(percentChange(120,100),20);
});
test("FX compares currency units per USD, not absolute currency price",()=>{
 assert.ok(monthlyGrowth(mini,"fx","CHN",2025,12).value>7);
});
test("annual observations do not silently carry forward",()=>{
 assert.equal(snapshot(mini,"CHN",2024).values.gdp,null);
});
test("score is withheld if mandatory market indicators are missing",()=>{
 const r=rankJapan({gdp:mini.gdp},"2025","all");
 assert.equal(r.ranked.length,0);
});
test("market comparison has candidate with transparent coverage",()=>{
 const r=rankJapan(mini,2025,"market");
 assert.ok(r.ranked.some(x=>x.year===1991));
 assert.ok(r.ranked[0].coverage>0.5);
});
test("monthly rising streak requires adjacent months",()=>{
 const result=monthStreak(mini,"stock","CHN",2025,12);
 assert.deepEqual(result,{months:2,direction:"上涨",period:"2025-12"});
});
