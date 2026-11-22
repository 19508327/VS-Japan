import {rankJapan,snapshot,WEIGHTS,LENSES,monthStreak} from "./engine.mjs";
const $=id=>document.getElementById(id);
const metricIds=["stock","fx","rate","youth","money","inflation","gdp"];
const names={stock:"股票价格趋势",fx:"美元汇率",rate:"贷款利率",youth:"青年失业率",money:"广义货币增长",inflation:"通胀",gdp:"GDP增长"};
const state={data:{},error:{},loading:false,latest:null};
const fmt=(n,suffix="%")=>Number.isFinite(n)?n.toFixed(1)+suffix:"—";
const available=key=>Boolean(state.data[key]?.data?.some(row=>row.series?.length));
const pill=(text,bad=false)=>`<span class="tag ${bad?"bad":""}">${text}</span>`;
function updateStatus(){
 const successful=metricIds.filter(available).length;
 $("sourceStatus").textContent=`已读取 ${successful}/${metricIds.length} 组公开指标 · 部分月度/年度数据存在发布滞后`;
 const wrap=$("sourceItems");wrap.replaceChildren();
 for(const id of metricIds) {
  const obj=state.data[id],el=document.createElement("div");el.className="source-row";
  const a=document.createElement("a");a.href=obj?.source||({stock:"https://fred.stlouisfed.org/",fx:"https://fred.stlouisfed.org/"}[id]||"https://data.worldbank.org/");a.target="_blank";a.rel="noopener noreferrer";
  a.textContent=names[id]+" ↗";
  const c=document.createElement("span");c.textContent=obj?.data?.map(x=>x.country+": "+(x.last||"无记录")).join(" · ")||"尚未取得";
  el.append(a,c);wrap.append(el);
 }
}
function render(){
 const y=Number($("year").value),month=Number($("month").value),lens=$("lens").value;
 const result=rankJapan(state.data,y,lens,month);state.latest=result;
 const cn=result.china,top=result.ranked[0];
 const box=$("result"),sub=$("resultSub"),comp=$("comparison");
 box.textContent=top?`日本 ${top.year} 年附近`:"暂无法可靠匹配";
 sub.textContent=top?`基于 ${top.available.length} 项可比指标 · 有效覆盖权重 ${Math.round(top.coverage*100)}% · 历史候选 ${result.candidateCount} 年`:
 "缺少关键指标的中日同期历史数据。请切换到“市场视角”或更早年份，不会用人口指标代替。";
 comp.replaceChildren();
 const keys=LENSES[lens].keys;
 const jp=top?.comparison;
 for(const k of keys){
  const row=document.createElement("div");row.className="metric-row";
  const label=document.createElement("div");label.className="metric-name";label.textContent=WEIGHTS[k].label;
  const value=document.createElement("div");value.className="metric-pair";
  const lhs=document.createElement("span"),rhs=document.createElement("span");
  lhs.innerHTML=`<small>中国 ${y}</small><b>${fmt(cn.values[k])}</b>`;
  rhs.innerHTML=`<small>日本 ${top?.year??"—"}</small><b>${jp?fmt(jp.values[k]):"—"}</b>`;
  value.append(lhs,rhs);row.append(label,value);comp.append(row);
 }
 const streak=monthStreak(state.data,"stock","CHN",y,month);
 $("trend").textContent=streak?`股票月度连续${streak.direction} ${streak.months} 个月（截至 ${streak.period}）`:"股票月度趋势暂无连续观测";
 $("caveat").textContent="匹配衡量指标差异，不等于制度、人口结构、债务结构或政策传导相似；历史相似不代表未来会重复。";
 const items=result.ranked.slice(1,4);
 $("alternatives").textContent=items.length?`其他候选：${items.map(x=>x.year+" 年").join("、")}`:"";
}
async function refresh() {
 if(state.loading)return;state.loading=true;
 $("run").disabled=true;$("run").textContent="读取中日公开数据…";
 const settled=await Promise.allSettled(metricIds.map(async id=>{
  const response=await fetch("/api/indicators?id="+encodeURIComponent(id),{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.data))throw Error("Unexpected source format");
  state.data[id]=data;delete state.error[id];
 }));
 settled.forEach((r,i)=>{if(r.status==="rejected")state.error[metricIds[i]]=String(r.reason)});
 try{localStorage.setItem("vs-japan-cache",JSON.stringify({date:new Date().toISOString(),data:state.data}));}catch{}
 state.loading=false;$("run").disabled=false;$("run").textContent="重新获取最新数据";
 updateStatus();render();
 const count=Object.keys(state.error).length;
 $("loadStatus").textContent=count?`${count} 组数据源获取失败；保留其他已获取数据。请稍后重试。`:"本次请求完成。历史数据可能滞后于实时行情。";
}
function init(){
 for(let y=2026;y>=1990;y--){
  const opt=document.createElement("option");opt.value=String(y);opt.textContent=y+" 年";$("year").append(opt);
 }
 $("year").value="2025";$("month").value="12";
 for(const id of ["year","month","lens"])$(id).addEventListener("change",render);
 $("run").addEventListener("click",refresh);
 $("ask").addEventListener("click",()=>{
  const r=state.latest,y=$("year").value,m=$("month").value;
  const details=LENSES[$("lens").value].keys.map(k=>WEIGHTS[k].label+"："+fmt(r?.china?.values[k])).join("；");
  const msg=`请作为经济史研究助手，以原始统计来源解释中国${y}年${m}月与日本历史阶段的联系和区别。当前观察：${details}。候选年份：${r?.ranked?.[0]?.year??"数据不足"}。请核对最新数据，分析股市收益趋势、人民币/日元兑美元变动、利率、货币、就业，以及制度口径差异，列出正反证据，不要把历史匹配当投资建议。`;
  navigator.clipboard?.writeText(msg).then(()=>{$("ask").textContent="已复制，可到 ChatGPT 粘贴";}).catch(()=>window.prompt("复制问题到 ChatGPT",msg));
 });
 try{
  const saved=JSON.parse(localStorage.getItem("vs-japan-cache")||"null");
  if(saved?.data&&typeof saved.data==="object"){state.data=saved.data;updateStatus();render();$("loadStatus").textContent="显示本机上次缓存；正在尝试更新。";}
 }catch{}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
 refresh();
}
init();
