import { useState, useEffect, useCallback } from "react";

/* ── CSS global ── */
const CSS = `
  :root {
    --bg0:#f4f3ef; --bg1:#ffffff; --bg2:#f0efea; --bg3:#e8e7e1;
    --tx1:#1a1a1a; --tx2:#666660; --bd:rgba(0,0,0,0.11); --bd2:rgba(0,0,0,0.2);
    --r8:8px; --r12:12px; --font:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }
  @media(prefers-color-scheme:dark){
    :root{--bg0:#141414;--bg1:#1e1e1e;--bg2:#252525;--bg3:#2e2e2e;--tx1:#f0f0f0;--tx2:#999;--bd:rgba(255,255,255,0.09);--bd2:rgba(255,255,255,0.18);}
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg0);min-height:100vh;font-family:var(--font);}
  input{font-family:var(--font);}
  input[type=number]::-webkit-inner-spin-button{opacity:.4;}
  input[type=range]{width:100%;cursor:pointer;accent-color:currentColor;}
  button:active{transform:scale(.97);}
  ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:3px;}
`;

const PASS = 5;
const QUARTER_COLORS = [
  {id:"slate", main:"#5B7FA6", light:"#E8EFF6"},
  {id:"sage",  main:"#5A8A6A", light:"#E4F0E8"},
  {id:"rose",  main:"#A6606A", light:"#F5E8EA"},
  {id:"amber", main:"#A07830", light:"#F5EEE0"},
  {id:"plum",  main:"#7A5FA6", light:"#EEE8F5"},
  {id:"teal",  main:"#3A8A8A", light:"#E0F0F0"},
  {id:"brick", main:"#A06040", light:"#F5EBE4"},
  {id:"pine",  main:"#4A7A60", light:"#E2F0EA"},
];
const SUB_COLORS = [
  {id:"purple",main:"#7F77DD"},{id:"teal",main:"#1D9E75"},{id:"coral",main:"#D85A30"},
  {id:"blue",main:"#378ADD"},{id:"pink",main:"#D4537E"},{id:"amber",main:"#BA7517"},
];
const getQC = id => QUARTER_COLORS.find(c=>c.id===id)||QUARTER_COLORS[0];
const getSC = id => SUB_COLORS.find(c=>c.id===id)||SUB_COLORS[0];

const P = { teal:"#1D9E75",coral:"#D85A30",amber:"#BA7517",green:"#4E8A1A",red:"#D94040",blue:"#378ADD",gray:"#888780" };

function uid(){ return Math.random().toString(36).slice(2,9); }

// Porcentajes decimales: parseFloat en vez de parseInt
function calcSubject(evals){
  let wd=0, pd=0, pp=0;
  evals.forEach(e=>{
    if(e.grade!==""){
      wd += parseFloat(e.grade)*(parseFloat(e.pct)/100);
      pd += parseFloat(e.pct);
    } else {
      pp += parseFloat(e.pct);
    }
  });
  const current = pd>0 ? wd/(pd/100) : null;
  const needed  = pp>0 ? (PASS - wd)/(pp/100) : null;
  return { current, weighted:wd, pctDone:pd, pctPending:pp, needed };
}

function calcQuarter(subjects){
  const grades = subjects.map(s=>calcSubject(s.evals).current).filter(g=>g!==null);
  return grades.length ? grades.reduce((a,b)=>a+b,0)/grades.length : null;
}

function gradeColor(g){
  if(g===null) return P.gray;
  if(g<3.5) return P.red; if(g<5) return P.coral;
  if(g<7)   return P.amber; if(g<9) return P.teal;
  return P.green;
}
function riskColor(n){
  if(n===null) return P.gray;
  if(n<=0) return P.green; if(n<=5) return P.teal;
  if(n<=7) return P.amber; if(n<=9) return P.coral;
  return P.red;
}
function riskLabel(n,pp){
  if(pp===0) return "Completada"; if(n===null) return "Sin notas";
  if(n<=0) return "Aprobada"; if(n<=5) return "Tranquilo";
  if(n<=7) return "Atención"; if(n<=9) return "En riesgo"; return "Crítico";
}

/* ── Estilos ── */
const T = {
  page:{ fontFamily:"var(--font)", color:"var(--tx1)", maxWidth:760, margin:"0 auto", paddingBottom:70 },
  hdr:{ padding:"24px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 },
  card:{ background:"var(--bg1)", border:"0.5px solid var(--bd)", borderRadius:12, padding:"1.1rem 1.25rem", marginBottom:12 },
  inp:{ border:"0.5px solid var(--bd2)", borderRadius:8, padding:"7px 10px", fontSize:14, background:"var(--bg1)", color:"var(--tx1)", width:"100%", outline:"none" },
  btn:(c)=>({ border:`0.5px solid ${c||"var(--bd2)"}`, background:"transparent", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", color:c||"var(--tx1)" }),
  btnP:(bg)=>({ background:bg||"#7F77DD", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:500, cursor:"pointer" }),
  metric:{ background:"var(--bg2)", borderRadius:8, padding:"12px 14px", flex:1, minWidth:80 },
  tag:(c)=>({ background:c+"22", color:c, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:20, display:"inline-block", whiteSpace:"nowrap" }),
  sec:{ fontSize:11, fontWeight:600, color:"var(--tx2)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"22px 24px 10px" },
  back:{ background:"none", border:"none", cursor:"pointer", color:"#7F77DD", fontSize:14, padding:"0 0 2px", display:"flex", alignItems:"center", gap:4 },
};

/* ── Donut ── */
function Donut({value, color, size=54}){
  const r=22, c=2*Math.PI*r, p=Math.min(Math.max(value||0,0),10)/10;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--bd)" strokeWidth={7}/>
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${p*c} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{transition:"stroke-dasharray .35s"}}/>
      <text x={28} y={33} textAnchor="middle" fontSize={12} fontWeight={600} fill={color}>
        {value!==null?value.toFixed(1):"—"}
      </text>
    </svg>
  );
}

/* ── BarChart ── */
function BarChart({evals, simGrades}){
  const maxH=90, n=evals.length, bw=Math.max(18,Math.min(38,Math.floor(480/Math.max(n,1))-12));
  return (
    <svg viewBox={`0 0 ${Math.max(n*(bw+12)+28,200)} ${maxH+48}`} width="100%" style={{overflow:"visible"}}>
      {[0,2.5,5,7.5,10].map(v=>{
        const y=maxH-(v/10)*maxH;
        return <g key={v}>
          <line x1={14} x2={n*(bw+12)+14} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/>
          <text x={10} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text>
        </g>;
      })}
      {evals.map((e,i)=>{
        const g=simGrades?simGrades[e.id]:(e.grade!==""?parseFloat(e.grade):null);
        const h=g!==null?(g/10)*maxH:4, x=20+i*(bw+12), c=g!==null?gradeColor(g):"var(--bd)";
        const lbl=e.name.length>7?e.name.slice(0,6)+"…":e.name;
        return <g key={e.id}>
          <rect x={x} y={maxH-h} width={bw} height={h} rx={3} fill={c} fillOpacity={g!==null?.85:.25} style={{transition:"height .2s,y .2s"}}/>
          {g!==null&&<text x={x+bw/2} y={maxH-h-4} textAnchor="middle" fontSize={10} fontWeight={600} fill={c}>{g.toFixed(1)}</text>}
          <text x={x+bw/2} y={maxH+13} textAnchor="middle" fontSize={9} fill="var(--tx2)">{lbl}</text>
          <text x={x+bw/2} y={maxH+25} textAnchor="middle" fontSize={8} fill="var(--tx2)" fillOpacity={.7}>{parseFloat(e.pct)}%</text>
        </g>;
      })}
      <line x1={14} x2={n*(bw+12)+14} y1={maxH-(PASS/10)*maxH} y2={maxH-(PASS/10)*maxH} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3"/>
      <text x={n*(bw+12)+18} y={maxH-(PASS/10)*maxH+4} fontSize={9} fill={P.teal}>5</text>
    </svg>
  );
}

/* ── Modal añadir cuatrimestre ── */
function AddQuarterModal({onAdd, onClose}){
  const [name,setName]=useState(""); const [colorId,setColorId]=useState("slate"); const [year,setYear]=useState("");
  const col=getQC(colorId);
  function handle(){ if(!name.trim()) return; onAdd({id:uid(),name:name.trim(),colorId,year:year.trim(),subjects:[]}); }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"min(420px,95vw)",margin:0,borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:600,fontSize:16}}>Nuevo cuatrimestre</span>
          <button style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:4,marginBottom:12}} placeholder="Ej: Q1 — Primer curso"
          value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&handle()}/>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Año académico (opcional)</label>
        <input style={{...T.inp,marginTop:4,marginBottom:16}} placeholder="Ej: 2024–2025" value={year} onChange={e=>setYear(e.target.value)}/>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Color</label>
        <div style={{display:"flex",gap:8,marginTop:6,marginBottom:20,flexWrap:"wrap"}}>
          {QUARTER_COLORS.map(c=>(
            <button key={c.id} title={c.id} onClick={()=>setColorId(c.id)}
              style={{width:28,height:28,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0}}/>
          ))}
        </div>
        <button style={{...T.btnP(col.main),width:"100%",opacity:name.trim()?1:.4,cursor:name.trim()?"pointer":"not-allowed"}}
          onClick={handle} disabled={!name.trim()}>Crear cuatrimestre</button>
      </div>
    </div>
  );
}

/* ── Modal añadir asignatura ── */
function AddSubjectModal({onAdd, onClose}){
  const [name,setName]=useState(""); const [colorId,setColorId]=useState("purple");
  const [evals,setEvals]=useState([{id:uid(),name:"",pct:""}]);
  // Permitir decimales: parseFloat
  const pctSum=evals.reduce((s,e)=>s+(parseFloat(e.pct)||0),0);
  const pctOk=Math.abs(pctSum-100)<0.001;
  const valid=name.trim()&&pctOk&&evals.every(e=>e.name.trim()&&parseFloat(e.pct)>0);
  const col=getSC(colorId);
  function upd(id,f,v){setEvals(p=>p.map(e=>e.id!==id?e:{...e,[f]:v}));}
  function handle(){ if(!valid) return; onAdd({id:uid(),name:name.trim(),colorId,evals:evals.map(e=>({...e,pct:parseFloat(e.pct),grade:""}))}); }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"min(480px,95vw)",maxHeight:"88vh",overflowY:"auto",margin:0,borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:600,fontSize:16}}>Nueva asignatura</span>
          <button style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:4,marginBottom:14}} placeholder="Ej: Cálculo II"
          value={name} onChange={e=>setName(e.target.value)}/>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Color</label>
        <div style={{display:"flex",gap:8,marginTop:6,marginBottom:16,flexWrap:"wrap"}}>
          {SUB_COLORS.map(c=>(
            <button key={c.id} onClick={()=>setColorId(c.id)}
              style={{width:26,height:26,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0}}/>
          ))}
        </div>
        <label style={{fontSize:12,color:"var(--tx2)"}}>Evaluaciones y pesos</label>
        <div style={{marginTop:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 90px 28px",gap:6,marginBottom:5}}>
            <span style={{fontSize:11,color:"var(--tx2)"}}>Nombre</span>
            <span style={{fontSize:11,color:"var(--tx2)"}}>Peso (%)</span>
            <span/>
          </div>
          {evals.map(ev=>(
            <div key={ev.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 28px",gap:6,marginBottom:7}}>
              <input style={T.inp} placeholder="Ej: Parcial 1" value={ev.name} onChange={e=>upd(ev.id,"name",e.target.value)}/>
              {/* step=0.1 para decimales */}
              <input style={{...T.inp,textAlign:"center"}} type="number" min={0.1} max={100} step={0.1} placeholder="%" value={ev.pct} onChange={e=>upd(ev.id,"pct",e.target.value)}/>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:20,padding:0,lineHeight:1}} onClick={()=>setEvals(p=>p.filter(e=>e.id!==ev.id))}>×</button>
            </div>
          ))}
          <button style={{...T.btn(),width:"100%",marginTop:2,fontSize:13}} onClick={()=>setEvals(p=>[...p,{id:uid(),name:"",pct:""}])}>+ Añadir evaluación</button>
        </div>
        <div style={{margin:"12px 0 16px",padding:"9px 12px",borderRadius:8,
          background:pctOk?"#E1F5EE":pctSum>100?"#FCEBEB":"#FAEEDA"}}>
          <span style={{fontSize:13,color:pctOk?P.teal:pctSum>100?P.red:P.amber}}>
            Suma: <strong>{pctSum.toFixed(1)}%</strong>
            {pctOk?" ✓":pctSum>100?` — ${(pctSum-100).toFixed(1)}% de más`:`— faltan ${(100-pctSum).toFixed(1)}%`}
          </span>
        </div>
        <button style={{...T.btnP(col.main),width:"100%",opacity:valid?1:.4,cursor:valid?"pointer":"not-allowed"}}
          onClick={handle} disabled={!valid}>Crear asignatura</button>
      </div>
    </div>
  );
}

/* ── Simulador ── */
function SimulatorView({sub, onBack}){
  const col=getSC(sub.colorId);
  const [sg,setSg]=useState(()=>{ const m={}; sub.evals.forEach(e=>{m[e.id]=e.grade!==""?parseFloat(e.grade):5;}); return m; });
  const [locked,setLocked]=useState(()=>{ const m={}; sub.evals.forEach(e=>{m[e.id]=e.grade!==""}); return m; });
  const [target,setTarget]=useState(5);
  const fn=sub.evals.reduce((s,e)=>s+(sg[e.id]*(parseFloat(e.pct)/100)),0);
  const fc=gradeColor(fn);
  function neededT(t){ const pp=sub.evals.filter(e=>!locked[e.id]).reduce((s,e)=>s+parseFloat(e.pct),0); if(!pp) return null; const lp=sub.evals.filter(e=>locked[e.id]).reduce((s,e)=>s+(sg[e.id]*(parseFloat(e.pct)/100)),0); return (t-lp)/(pp/100); }
  const nt=neededT(target);
  return (
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:17,fontWeight:600,margin:0}}>{sub.name} — Simulador</h1></div>
      </div>
      <div style={{margin:"14px 24px 10px",padding:"18px 20px",borderRadius:12,background:`${fc}12`,border:`0.5px solid ${fc}44`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4}}>Nota final simulada</div>
          <div style={{fontSize:44,fontWeight:600,color:fc,lineHeight:1}}>{fn.toFixed(2)}</div>
          <div style={{fontSize:13,marginTop:6,color:fn>=PASS?P.teal:P.red,fontWeight:500}}>
            {fn>=PASS?"✓ Aprobado":"✗ Suspenso"} · {fn>=PASS?"+":""}{(fn-PASS).toFixed(2)} respecto al aprobado
          </div>
        </div>
        <Donut value={fn} color={fc} size={80}/>
      </div>
      <div style={T.sec}>Visualización por evaluación</div>
      <div style={{padding:"0 24px 4px"}}><BarChart evals={sub.evals} simGrades={sg}/></div>
      <div style={T.sec}>Ajusta las notas</div>
      <div style={{padding:"0 24px"}}>
        {sub.evals.map(ev=>{
          const g=sg[ev.id],lk=locked[ev.id],gc=gradeColor(g);
          return (
            <div key={ev.id} style={{...T.card,marginBottom:8,padding:"11px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div><span style={{fontSize:14,fontWeight:500}}>{ev.name}</span>
                  <span style={{fontSize:12,color:"var(--tx2)",marginLeft:8}}>peso {parseFloat(ev.pct)}%</span>
                  {ev.grade!==""&&<span style={{...T.tag(P.blue),marginLeft:6,fontSize:10}}>real: {ev.grade}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"var(--tx2)"}}>+{(g*parseFloat(ev.pct)/100).toFixed(2)} pts</span>
                  <button onClick={()=>setLocked(p=>({...p,[ev.id]:!p[ev.id]}))}
                    style={{background:lk?col.main+"22":"none",border:`0.5px solid ${lk?col.main:P.gray}55`,borderRadius:6,cursor:"pointer",padding:"2px 7px",fontSize:12,color:lk?col.main:P.gray}}>
                    {lk?"🔒":"🔓"}</button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <input type="range" min={0} max={10} step={0.1} value={g} disabled={lk} style={{flex:1,color:gc,accentColor:gc,opacity:lk?.4:1}}
                  onChange={e=>setSg(p=>({...p,[ev.id]:parseFloat(e.target.value)}))}/>
                <div style={{width:36,textAlign:"center",fontSize:20,fontWeight:600,color:gc}}>{g.toFixed(1)}</div>
              </div>
              <div style={{height:4,borderRadius:2,marginTop:8,background:"var(--bd)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${g*10}%`,background:gc,transition:"width .15s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={T.sec}>Calculadora de objetivo</div>
      <div style={{...T.card,margin:"0 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Mi objetivo:</span>
          <input type="range" min={5} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,color:col.main,accentColor:col.main}}/>
          <span style={{fontSize:20,fontWeight:600,color:col.main,minWidth:32}}>{target.toFixed(1)}</span>
        </div>
        {nt!==null?(
          <div style={{padding:"10px 12px",borderRadius:8,background:riskColor(nt)+"18",borderLeft:`3px solid ${riskColor(nt)}`}}>
            {nt>10?<span style={{fontSize:13,color:P.red}}>No es posible llegar a {target} con lo fijado</span>
            :nt<=0?<span style={{fontSize:13,color:P.teal}}>Ya alcanzas {target} con las notas fijadas</span>
            :<span style={{fontSize:13,color:riskColor(nt)}}>Necesitas un <strong>{nt.toFixed(2)}</strong> en las desbloqueadas</span>}
          </div>
        ):<div style={{fontSize:13,color:"var(--tx2)"}}>Desbloquea evaluaciones para calcular</div>}
      </div>
      <div style={T.sec}>Escenarios rápidos</div>
      <div style={{padding:"0 24px",display:"flex",flexWrap:"wrap",gap:8}}>
        {[["Todo 5",5],["Todo 7",7],["Todo 9",9],["Todo 10",10]].map(([l,v])=>(
          <button key={l} style={T.btn()} onClick={()=>setSg(p=>{const n={...p};sub.evals.forEach(e=>{if(!locked[e.id])n[e.id]=v;});return n;})}>{l}</button>
        ))}
        <button style={T.btn(P.coral)} onClick={()=>setSg(()=>{const n={};sub.evals.forEach(e=>{n[e.id]=e.grade!==""?parseFloat(e.grade):5;});return n;})}>Resetear</button>
      </div>
    </div>
  );
}

/* ── Vista asignatura ── */
function SubjectView({sub, onBack, onDelete, onUpdate, onOpenSim}){
  const col=getSC(sub.colorId);
  const {current,weighted,pctDone,pctPending,needed}=calcSubject(sub.evals);
  const rc=riskColor(needed);
  const pctSum=sub.evals.reduce((s,e)=>s+(parseFloat(e.pct)||0),0);
  const pctOk=Math.abs(pctSum-100)<0.001;
  const [target,setTarget]=useState(5);
  function updateEval(eid,f,v){onUpdate({...sub,evals:sub.evals.map(e=>e.id!==eid?e:{...e,[f]:v})});}
  function addEval(){onUpdate({...sub,evals:[...sub.evals,{id:uid(),name:"Nueva evaluación",pct:0,grade:""}]});}
  function delEval(eid){onUpdate({...sub,evals:sub.evals.filter(e=>e.id!==eid)});}
  function neededForTarget(t){const pp=sub.evals.filter(e=>e.grade==="").reduce((s,e)=>s+parseFloat(e.pct),0);if(!pp)return null;const dp=sub.evals.filter(e=>e.grade!=="").reduce((s,e)=>s+(parseFloat(e.grade)*(parseFloat(e.pct)/100)),0);return(t-dp)/(pp/100);}
  const nt=neededForTarget(target);
  return (
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:18,fontWeight:600,margin:0,color:col.main}}>{sub.name}</h1></div>
        <div style={{display:"flex",gap:8}}>
          <button style={T.btnP(col.main)} onClick={onOpenSim}>Simulador →</button>
          <button style={T.btn(P.red)} onClick={onDelete}>Eliminar</button>
        </div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"14px 24px"}}>
        {[
          {label:"Nota actual",val:current!==null?current.toFixed(2):"—",c:current!==null?(current>=PASS?P.teal:P.red):"var(--tx2)"},
          {label:"Puntos acumulados",val:weighted.toFixed(2)+"/"+((pctDone/100)*10).toFixed(1),c:col.main},
          {label:"% evaluado",val:pctDone.toFixed(1)+"%",c:"var(--tx1)"},
          {label:"% pendiente",val:pctPending.toFixed(1)+"%",c:"var(--tx2)"},
        ].map(m=>(
          <div key={m.label} style={T.metric}>
            <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:17,fontWeight:600,color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>
      {needed!==null&&pctPending>0&&(
        <div style={{margin:"0 24px 12px",padding:"10px 14px",borderRadius:8,background:rc+"18",borderLeft:`3px solid ${rc}`}}>
          <span style={{fontSize:13,color:rc,fontWeight:500}}>
            {needed>10?"Imposible aprobar con las notas actuales":needed<=0?"Aprobado asegurado ✓":`Necesitas un ${needed.toFixed(2)} de media en lo pendiente`}
          </span>
        </div>
      )}
      {sub.evals.length>0&&<><div style={T.sec}>Notas por evaluación</div><div style={{padding:"0 24px 4px"}}><BarChart evals={sub.evals}/></div></>}
      <div style={T.sec}>Evaluaciones</div>
      {!pctOk&&sub.evals.length>0&&<div style={{margin:"-6px 24px 10px",fontSize:12,color:pctSum>100?P.red:P.amber}}>
        Los porcentajes suman {pctSum.toFixed(1)}% — deben sumar 100%
      </div>}
      <div style={{padding:"0 24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 80px 78px 28px",gap:6,marginBottom:6}}>
          {["Evaluación","Peso (%)","Nota",""].map(h=><div key={h} style={{fontSize:11,color:"var(--tx2)"}}>{h}</div>)}
        </div>
        {sub.evals.map(ev=>(
          <div key={ev.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 78px 28px",gap:6,alignItems:"center",marginBottom:6}}>
            <input style={{...T.inp,fontSize:13}} value={ev.name} onChange={e=>updateEval(ev.id,"name",e.target.value)}/>
            <input style={{...T.inp,textAlign:"center"}} type="number" min={0.1} max={100} step={0.1} value={ev.pct} onChange={e=>updateEval(ev.id,"pct",e.target.value)}/>
            <input style={{...T.inp,textAlign:"center",borderColor:ev.grade!==""?(parseFloat(ev.grade)>=PASS?P.teal+"99":P.red+"99"):"var(--bd2)"}}
              type="number" min={0} max={10} step={0.1} placeholder="—" value={ev.grade} onChange={e=>updateEval(ev.id,"grade",e.target.value)}/>
            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:20,padding:0,lineHeight:1}} onClick={()=>delEval(ev.id)}>×</button>
          </div>
        ))}
        <button style={{...T.btn(),marginTop:4,width:"100%",textAlign:"center"}} onClick={addEval}>+ Añadir evaluación</button>
      </div>
      <div style={T.sec}>¿Qué necesito para llegar a…?</div>
      <div style={{...T.card,margin:"0 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Quiero sacar un:</span>
          <input type="range" min={1} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,color:col.main,accentColor:col.main}}/>
          <span style={{fontSize:20,fontWeight:600,color:col.main,minWidth:32}}>{target.toFixed(1)}</span>
        </div>
        {nt!==null?(
          <div style={{padding:"10px 12px",borderRadius:8,background:riskColor(nt)+"18"}}>
            {nt>10?<span style={{fontSize:13,color:P.red}}>Ya no es posible llegar a {target.toFixed(1)}</span>
            :nt<=0?<span style={{fontSize:13,color:P.teal}}>Ya alcanzas o superas el {target.toFixed(1)}</span>
            :<span style={{fontSize:13,color:riskColor(nt)}}>Necesitas un <strong>{nt.toFixed(2)}</strong> en lo que queda</span>}
          </div>
        ):<div style={{fontSize:13,color:"var(--tx2)"}}>Introduce notas para activar</div>}
      </div>
    </div>
  );
}

/* ── Vista cuatrimestre ── */
function QuarterView({quarter, onBack, onUpdate, onDelete}){
  const col=getQC(quarter.colorId);
  const [showAdd,setShowAdd]=useState(false);
  const [activeSubId,setActiveSubId]=useState(null);
  const [subView,setSubView]=useState("list"); // list | subject | sim
  const activeSub=quarter.subjects.find(s=>s.id===activeSubId);
  const quarterNote=calcQuarter(quarter.subjects);
  const stats=quarter.subjects.map(s=>calcSubject(s.evals));
  const atRisk=stats.filter(c=>c.needed!==null&&c.needed>7).length;
  const passed=stats.filter(c=>c.pctPending===0&&c.weighted>=PASS).length;

  function updSubs(fn){onUpdate({...quarter,subjects:fn(quarter.subjects)});}

  if(subView==="subject"&&activeSub) return (
    <SubjectView sub={activeSub} onBack={()=>{setSubView("list");setActiveSubId(null);}}
      onDelete={()=>{updSubs(p=>p.filter(s=>s.id!==activeSubId));setSubView("list");setActiveSubId(null);}}
      onUpdate={s=>updSubs(p=>p.map(x=>x.id===s.id?s:x))}
      onOpenSim={()=>setSubView("sim")}/>
  );
  if(subView==="sim"&&activeSub) return (
    <SimulatorView sub={activeSub} onBack={()=>setSubView("subject")}/>
  );

  return (
    <div style={T.page}>
      {showAdd&&<AddSubjectModal onAdd={s=>{updSubs(p=>[...p,s]);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
      <div style={{...T.hdr,paddingBottom:8}}>
        <div>
          <button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:19,fontWeight:600,margin:0,color:col.main}}>{quarter.name}</h1>
          {quarter.year&&<div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{quarter.year}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={T.btnP(col.main)} onClick={()=>setShowAdd(true)}>+ Asignatura</button>
          <button style={T.btn(P.red)} onClick={onDelete}>Eliminar</button>
        </div>
      </div>

      {/* Métricas del cuatrimestre */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"14px 24px"}}>
        {[
          {label:"Media del cuatrimestre",val:quarterNote!==null?quarterNote.toFixed(2):"—",c:quarterNote!==null?(quarterNote>=PASS?P.teal:P.red):P.gray},
          {label:"Asignaturas",val:quarter.subjects.length,c:col.main},
          {label:"En riesgo",val:atRisk,c:atRisk>0?P.red:P.teal},
          {label:"Aprobadas",val:passed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={T.metric}>
            <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:17,fontWeight:600,color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={T.sec}>Asignaturas</div>
      {quarter.subjects.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:32,marginBottom:10}}>📖</div>
          <div style={{fontWeight:600,marginBottom:6}}>Sin asignaturas</div>
          <div style={{fontSize:13,color:"var(--tx2)",marginBottom:18}}>Añade las asignaturas de este cuatrimestre</div>
          <button style={T.btnP(col.main)} onClick={()=>setShowAdd(true)}>+ Añadir asignatura</button>
        </div>
      )}
      <div style={{padding:"0 24px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {quarter.subjects.map((sub,i)=>{
          const {current,pctDone,pctPending,needed}=stats[i];
          const sc=getSC(sub.colorId), rc=riskColor(needed), rl=riskLabel(needed,pctPending);
          return (
            <div key={sub.id} onClick={()=>{setActiveSubId(sub.id);setSubView("subject");}}
              style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`3px solid ${sc.main}`,borderRadius:12,padding:"1rem 1.1rem",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,color:sc.main,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{sub.evals.length} evaluaciones</div>
                </div>
                <Donut value={current} color={current!==null?(current>=PASS?P.teal:P.red):P.gray} size={50}/>
              </div>
              <div style={{height:4,borderRadius:2,background:"var(--bd)",overflow:"hidden",marginBottom:7}}>
                <div style={{height:"100%",width:`${pctDone}%`,background:sc.main,borderRadius:2,transition:"width .3s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--tx2)"}}>{pctDone.toFixed(0)}% evaluado</span>
                <span style={T.tag(rc)}>{rl}</span>
              </div>
              {needed!==null&&needed>0&&pctPending>0&&<div style={{marginTop:7,fontSize:11,color:rc}}>Necesitas {needed.toFixed(2)} en lo pendiente</div>}
              {needed!==null&&needed<=0&&<div style={{marginTop:7,fontSize:11,color:P.teal,fontWeight:500}}>Aprobado asegurado ✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Dashboard principal ── */
function Dashboard({quarters, onOpen, onAddClick}){
  // Media de carrera = media de medias de cuatrimestres con nota
  const qNotes=quarters.map(q=>calcQuarter(q.subjects)).filter(n=>n!==null);
  const careerAvg=qNotes.length?qNotes.reduce((a,b)=>a+b,0)/qNotes.length:null;
  const totalSubs=quarters.reduce((s,q)=>s+q.subjects.length,0);
  const totalPassed=quarters.reduce((s,q)=>s+q.subjects.filter(sub=>{ const c=calcSubject(sub.evals); return c.pctPending===0&&c.weighted>=PASS; }).length,0);

  return (
    <div style={T.page}>
      {/* Cabecera */}
      <div style={{...T.hdr, flexDirection:"column", alignItems:"stretch", gap:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Calculadora de notas</h1>
            <p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Gestor académico · UPC</p>
          </div>
          <button style={T.btnP()} onClick={onAddClick}>+ Cuatrimestre</button>
        </div>
      </div>

      {/* Estadísticas globales */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"16px 24px 4px"}}>
        {[
          {label:"Media de carrera",val:careerAvg!==null?careerAvg.toFixed(2):"—",c:careerAvg!==null?(careerAvg>=PASS?P.teal:P.red):P.gray,big:true},
          {label:"Cuatrimestres",val:quarters.length,c:"#7F77DD"},
          {label:"Asignaturas",val:totalSubs,c:"var(--tx1)"},
          {label:"Aprobadas",val:totalPassed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={{...T.metric,minWidth:m.big?140:80}}>
            <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:m.big?28:22,fontWeight:700,color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de progresión de cuatrimestres */}
      {quarters.length>1&&(
        <>
          <div style={T.sec}>Progresión por cuatrimestre</div>
          <div style={{padding:"0 24px 4px"}}>
            <svg viewBox={`0 0 ${Math.max(quarters.length*80+40,300)} 120`} width="100%" style={{overflow:"visible"}}>
              {[0,5,10].map(v=>{
                const y=100-(v/10)*80;
                return <g key={v}>
                  <line x1={30} x2={quarters.length*80+10} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/>
                  <text x={26} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text>
                </g>;
              })}
              {/* línea de 5 */}
              <line x1={30} x2={quarters.length*80+10} y1={100-(5/10)*80} y2={100-(5/10)*80} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3"/>
              {quarters.map((q,i)=>{
                const note=calcQuarter(q.subjects);
                if(note===null) return null;
                const x=50+i*80, y=100-(note/10)*80, c=getQC(q.colorId).main;
                return <g key={q.id}>
                  {i>0&&(()=>{ const prev=quarters.slice(0,i).map(qq=>calcQuarter(qq.subjects)).reverse().find(n=>n!==null); if(prev===null) return null; const px=50+(i-1)*80,py=100-(prev/10)*80; return <line x1={px} y1={py} x2={x} y2={y} stroke={c} strokeWidth={2} strokeOpacity={0.5}/>; })()}
                  <circle cx={x} cy={y} r={6} fill={c}/>
                  <text x={x} y={y-10} textAnchor="middle" fontSize={10} fontWeight={600} fill={c}>{note.toFixed(1)}</text>
                  <text x={x} y={114} textAnchor="middle" fontSize={9} fill="var(--tx2)">{q.name.slice(0,6)}</text>
                </g>;
              })}
            </svg>
          </div>
        </>
      )}

      <div style={T.sec}>Cuatrimestres</div>
      {quarters.length===0&&(
        <div style={{textAlign:"center",padding:"56px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>🎓</div>
          <div style={{fontWeight:600,fontSize:16,marginBottom:6}}>Empieza aquí</div>
          <div style={{fontSize:13,color:"var(--tx2)",marginBottom:20}}>Crea tu primer cuatrimestre para organizar tu carrera</div>
          <button style={T.btnP()} onClick={onAddClick}>+ Añadir cuatrimestre</button>
        </div>
      )}

      <div style={{padding:"0 24px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {quarters.map(q=>{
          const col=getQC(q.colorId);
          const note=calcQuarter(q.subjects);
          const nc=gradeColor(note);
          const subStats=q.subjects.map(s=>calcSubject(s.evals));
          const atRisk=subStats.filter(c=>c.needed!==null&&c.needed>7).length;
          const pct=q.subjects.length>0?(subStats.reduce((s,c)=>s+c.pctDone,0)/q.subjects.length):0;
          return (
            <div key={q.id} onClick={()=>onOpen(q.id)}
              style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`4px solid ${col.main}`,borderRadius:12,padding:"1.1rem 1.25rem",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:16,color:col.main}}>{q.name}</div>
                  {q.year&&<div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{q.year}</div>}
                  <div style={{fontSize:12,color:"var(--tx2)",marginTop:4}}>{q.subjects.length} asignatura{q.subjects.length!==1?"s":""}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <Donut value={note} color={nc} size={60}/>
                  <div style={{fontSize:10,color:"var(--tx2)",marginTop:2}}>media</div>
                </div>
              </div>
              {/* Barra de progreso del cuatrimestre */}
              <div style={{height:5,borderRadius:3,background:"var(--bd)",overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${pct}%`,background:col.main,borderRadius:3,transition:"width .3s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--tx2)"}}>
                <span>{pct.toFixed(0)}% evaluado</span>
                {atRisk>0&&<span style={{color:P.red}}>⚠ {atRisk} en riesgo</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Root ── */
export default function App(){
  const [quarters,setQuarters]=useState([]);
  const [view,setView]=useState("home"); // home | quarter
  const [activeQId,setActiveQId]=useState(null);
  const [showAddQ,setShowAddQ]=useState(false);

  useEffect(()=>{
    const sty=document.createElement("style");
    sty.textContent=CSS;
    document.head.appendChild(sty);
    return ()=>document.head.removeChild(sty);
  },[]);

  useEffect(()=>{
    try{ const raw=localStorage.getItem("calc_notas_v4"); if(raw) setQuarters(JSON.parse(raw)); }catch{}
  },[]);

  const save=useCallback(d=>{ try{localStorage.setItem("calc_notas_v4",JSON.stringify(d));}catch{} },[]);
  const upd=fn=>setQuarters(p=>{const n=fn(p);save(n);return n;});
  const activeQ=quarters.find(q=>q.id===activeQId);

  return (
    <>
      {showAddQ&&<AddQuarterModal onAdd={q=>{upd(p=>[...p,q]);setShowAddQ(false);}} onClose={()=>setShowAddQ(false)}/>}
      {view==="home"&&<Dashboard quarters={quarters}
        onOpen={id=>{setActiveQId(id);setView("quarter");}}
        onAddClick={()=>setShowAddQ(true)}/>}
      {view==="quarter"&&activeQ&&<QuarterView quarter={activeQ}
        onBack={()=>{setView("home");setActiveQId(null);}}
        onDelete={()=>{upd(p=>p.filter(q=>q.id!==activeQId));setView("home");setActiveQId(null);}}
        onUpdate={q=>upd(p=>p.map(x=>x.id===q.id?q:x))}/>}
    </>
  );
}