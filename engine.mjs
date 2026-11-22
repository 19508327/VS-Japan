// VS Japan · pure comparison engine; all values are observed, never imputed.
export const WEIGHTS = Object.freeze({
  stock12:{label:"股市 · 12个月涨跌幅",w:25,scale:30,unit:"%",group:"market"},
  stock6:{label:"股市 · 6个月涨跌幅",w:12,scale:20,unit:"%",group:"market"},
  fx12:{label:"每美元本币数量 · 12个月变化",w:25,scale:16,unit:"%",group:"market"},
  rate:{label:"商业银行贷款利率",w:12,scale:5,unit:"%",group:"macro"},
  youth:{label:"15–24岁失业率（ILO估计）",w:11,scale:9,unit:"%",group:"jobs"},
  money:{label:"广义货币增速",w:7,scale:15,unit:"%",group:"macro"},
  inflation:{label:"CPI通胀",w:5,scale:6,unit:"%",group:"macro"},
  gdp:{label:"实际GDP增速",w:3,scale:6,unit:"%",group:"macro"}
});
export const LENSES = {
  all:{keys:Object.keys(WEIGHTS),minimum:4,required:["stock12","fx12"]},
  market:{keys:["stock12","stock6","fx12"],minimum:2,required:["stock12","fx12"]},
  jobs:{keys:["youth","rate","money","gdp","inflation"],minimum:2,required:["youth"]}
};
export function shiftMonth(period, delta) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null;
  const [year,month]=period.split("-").map(Number);
  const d=new Date(Date.UTC(year,month-1+delta,1));
  return d.toISOString().slice(0,7);
}
export function percentChange(now,before) {
  return Number.isFinite(now)&&Number.isFinite(before)&&before>0
   ? (now/before-1)*100 : null;
}
export function numeric(x) {return typeof x==="number"&&Number.isFinite(x)?x:null;}
export function countrySeries(data,id,country) {
  return data?.[id]?.data?.find(row=>row.country===country)?.series||[];
}
export function yearPoint(data,id,country,year) {
  const p=countrySeries(data,id,country).find(x=>x.year===year);
  return numeric(p?.value);
}
export function monthPoint(data,id,country,year,month=12) {
  const series=countrySeries(data,id,country);
  const ceiling=year+"-"+String(month).padStart(2,"0");
  // Reject older years; do not silently treat previous year's value as current.
  return series.filter(x=>x.month>=year+"-01"&&x.month<=ceiling&&Number.isFinite(x.value))
    .sort((a,b)=>b.month.localeCompare(a.month))[0]||null;
}
export function monthlyGrowth(data,id,country,year,month=12,lag=12) {
  const point=monthPoint(data,id,country,year,month);
  if(!point) return {value:null,period:null};
  const base=shiftMonth(point.month,-lag);
  const before=countrySeries(data,id,country).find(x=>x.month===base);
  return {value:percentChange(point.value,numeric(before?.value)),period:point.month};
}
export function snapshot(data,country,year,month=12) {
  const stock12=monthlyGrowth(data,"stock",country,year,month,12);
  const stock6=monthlyGrowth(data,"stock",country,year,month,6);
  const fx12=monthlyGrowth(data,"fx",country,year,month,12);
  const values={stock12:stock12.value,stock6:stock6.value,fx12:fx12.value};
  const periods={stock12:stock12.period,stock6:stock6.period,fx12:fx12.period};
  for(const key of ["rate","youth","money","inflation","gdp"]) {
    values[key]=yearPoint(data,key,country,year);
    periods[key]=values[key]===null?null:String(year);
  }
  return {country,year,values,periods};
}
export function rankJapan(data,chinaYear,lens="all",month=12) {
  const config=LENSES[lens]||LENSES.all;
  const china=snapshot(data,"CHN",chinaYear,month);
  const records=[];
  for(let year=1985;year<=2025;year++){
    const japan=snapshot(data,"JPN",year,month);
    const available=config.keys.filter(k=>china.values[k]!==null&&japan.values[k]!==null);
    if(available.length<config.minimum||!config.required.every(k=>available.includes(k))) continue;
    const wsum=available.reduce((sum,k)=>sum+WEIGHTS[k].w,0);
    const distance=available.reduce((sum,k)=>sum+WEIGHTS[k].w*Math.min(3,Math.abs(china.values[k]-japan.values[k])/WEIGHTS[k].scale),0)/wsum;
    const coverage=available.reduce((sum,k)=>sum+WEIGHTS[k].w,0)/config.keys.reduce((sum,k)=>sum+WEIGHTS[k].w,0);
    records.push({year,distance:distance+0.18*(1-coverage),coverage,available,comparison:japan});
  }
  records.sort((a,b)=>a.distance-b.distance||b.coverage-a.coverage||a.year-b.year);
  return {china,ranked:records.slice(0,5),candidateCount:records.length,lens};
}
export function monthStreak(data,id,country,year,month=12) {
  const p=monthPoint(data,id,country,year,month); if(!p)return null;
  const series=countrySeries(data,id,country);
  let current=p.month,sign=0,count=0;
  for(let n=0;n<36;n++) {
    const a=series.find(x=>x.month===current);
    const b=series.find(x=>x.month===shiftMonth(current,-1));
    if(!a||!b||b.value<=0)break;
    const delta=a.value-b.value;
    const next=delta>0?1:delta<0?-1:0;
    if(!next||(sign&&sign!==next))break;
    sign=next;count++;current=shiftMonth(current,-1);
  }
  return count?{months:count,direction:sign>0?"上涨":"下跌",period:p.month}:null;
}
