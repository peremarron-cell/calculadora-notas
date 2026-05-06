import { useState, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════
   CSS GLOBAL
═══════════════════════════════════════════ */
const CSS = `
  :root {
    --bg0:#f4f3ef;--bg1:#ffffff;--bg2:#f0efea;--bg3:#e8e7e1;
    --tx1:#1a1a1a;--tx2:#666660;--bd:rgba(0,0,0,0.11);--bd2:rgba(0,0,0,0.2);
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    --pass:5;
  }
  .dark {
    --bg0:#141414;--bg1:#1e1e1e;--bg2:#252525;--bg3:#2e2e2e;
    --tx1:#f0f0f0;--tx2:#999;--bd:rgba(255,255,255,0.09);--bd2:rgba(255,255,255,0.18);
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg0);min-height:100vh;font-family:var(--font);color:var(--tx1);}
  input,select,textarea{font-family:var(--font);}
  input[type=number]::-webkit-inner-spin-button{opacity:.4;}
  input[type=range]{width:100%;cursor:pointer;}
  button:active{transform:scale(.97);}
  ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:3px;}
  @media print {
    .no-print{display:none!important;}
    body{background:#fff;color:#000;}
    .print-area{display:block!important;}
  }
`;

/* ═══════════════════════════════════════════
   CONSTANTES Y HELPERS
═══════════════════════════════════════════ */
const QC = [
  {id:"slate",main:"#5B7FA6"},{id:"sage",main:"#5A8A6A"},{id:"rose",main:"#A6606A"},
  {id:"amber",main:"#A07830"},{id:"plum",main:"#7A5FA6"},{id:"teal",main:"#3A8A8A"},
  {id:"brick",main:"#A06040"},{id:"pine",main:"#4A7A60"},
];
const SC = [
  {id:"purple",main:"#7F77DD"},{id:"teal",main:"#1D9E75"},{id:"coral",main:"#D85A30"},
  {id:"blue",main:"#378ADD"},{id:"pink",main:"#D4537E"},{id:"amber",main:"#BA7517"},
];
const EVAL_TYPES = ["Examen","Parcial","Final","Práctica","Entrega","Trabajo","Presentación","Otro"];
const getQC = id => QC.find(c=>c.id===id)||QC[0];
const getSC = id => SC.find(c=>c.id===id)||SC[0];
const P = {teal:"#1D9E75",coral:"#D85A30",amber:"#BA7517",green:"#4E8A1A",red:"#D94040",blue:"#378ADD",gray:"#888780",purple:"#7F77DD"};
function uid(){ return Math.random().toString(36).slice(2,9); }
function today(){ return new Date().toISOString().slice(0,10); }
function daysUntil(dateStr){
  if(!dateStr) return null;
  const d = Math.ceil((new Date(dateStr)-new Date(today()))/(1000*60*60*24));
  return d;
}
function urgencyColor(days){
  if(days===null) return P.gray;
  if(days<0) return "#aaa";
  if(days<=3) return P.red;
  if(days<=10) return P.amber;
  return P.teal;
}
function makeSub(name,colorIdx,credits){
  return{id:uid(),name,colorId:SC[colorIdx%SC.length].id,credits:credits||6,evals:[]};
}
function makeDefaultQuarters(){
  return[
    {id:uid(),name:"Q1",colorId:"slate",year:"",subjects:[
      makeSub("Expressió Gràfica en Enginyeria",0,6),makeSub("Física I",1,6),
      makeSub("Mètodes Matemàtics I",2,6),makeSub("Química",3,6),
      makeSub("Tecnologies Ambientals i Sostenibilitat",4,4),
    ]},
    {id:uid(),name:"Q2",colorId:"sage",year:"",subjects:[
      makeSub("Mètodes Matemàtics II",0,6),makeSub("Fonaments d'Informàtica",1,6),
      makeSub("Física II",2,6),makeSub("Economia i Gestió d'Empresa",3,6),
      makeSub("Ciència i Tecnologia dels Materials",4,6),
    ]},
    {id:uid(),name:"Q3",colorId:"plum",year:"",subjects:[
      makeSub("Sistemes Mecànics",0,6),makeSub("Sistemes Elèctrics",1,6),
      makeSub("Mètodes Matemàtics III",2,6),makeSub("Mecànica de Fluids",3,6),
      makeSub("Organització de la Producció",4,6),
    ]},
    {id:uid(),name:"Q4",colorId:"teal",year:"",subjects:[]},
  ];
}
function calcSubject(evals, passGrade=5){
  let wd=0,pd=0,pp=0;
  evals.forEach(e=>{
    const pct=parseFloat(e.pct)||0;
    if(e.grade!==""){wd+=parseFloat(e.grade)*(pct/100);pd+=pct;}
    else pp+=pct;
  });
  const current=pd>0?wd/(pd/100):null;
  const needed=pp>0?(passGrade-wd)/(pp/100):null;
  return{current,weighted:wd,pctDone:pd,pctPending:pp,needed};
}
function calcQuarter(subjects, passGrade=5){
  const gs=subjects.map(s=>calcSubject(s.evals,passGrade).current).filter(g=>g!==null);
  return gs.length?gs.reduce((a,b)=>a+b,0)/gs.length:null;
}
function creditsInfo(subjects, passGrade=5){
  let total=0,approved=0;
  subjects.forEach(s=>{
    const cr=parseFloat(s.credits)||0; total+=cr;
    const{current,pctPending}=calcSubject(s.evals,passGrade);
    if(pctPending===0&&current!==null&&current>=passGrade) approved+=cr;
  });
  return{total,approved};
}
function gradeColor(g){
  if(g===null)return P.gray;
  if(g<3.5)return P.red;if(g<5)return P.coral;
  if(g<7)return P.amber;if(g<9)return P.teal;return P.green;
}
function riskColor(n){
  if(n===null)return P.gray;
  if(n<=0)return P.green;if(n<=5)return P.teal;
  if(n<=7)return P.amber;if(n<=9)return P.coral;return P.red;
}
function riskLabel(n,pp){
  if(pp===0)return"Completada";if(n===null)return"Sin notas";
  if(n<=0)return"Aprobada";if(n<=5)return"Tranquilo";
  if(n<=7)return"Atención";if(n<=9)return"En riesgo";return"Crítico";
}
function riskLevel(n){
  if(n===null||n<=0)return"Bajo";
  if(n<=7)return"Medio";return"Alto";
}

/* ═══════════════════════════════════════════
   ESTILOS COMPARTIDOS
═══════════════════════════════════════════ */
const T={
  page:{fontFamily:"var(--font)",color:"var(--tx1)",maxWidth:760,margin:"0 auto",paddingBottom:90},
  hdr:{padding:"20px 18px 0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},
  card:{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderRadius:12,padding:"1rem 1.1rem",marginBottom:12},
  inp:{border:"0.5px solid var(--bd2)",borderRadius:8,padding:"8px 10px",fontSize:16,background:"var(--bg1)",color:"var(--tx1)",width:"100%",outline:"none"},
  sel:{border:"0.5px solid var(--bd2)",borderRadius:8,padding:"8px 10px",fontSize:15,background:"var(--bg1)",color:"var(--tx1)",width:"100%",outline:"none"},
  btn:(c)=>({border:`0.5px solid ${c||"var(--bd2)"}`,background:"transparent",borderRadius:8,padding:"8px 14px",fontSize:14,cursor:"pointer",color:c||"var(--tx1)"}),
  btnP:(bg)=>({background:bg||P.purple,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:500,cursor:"pointer"}),
  metric:{background:"var(--bg2)",borderRadius:8,padding:"11px 12px",flex:1,minWidth:72},
  tag:(c)=>({background:c+"22",color:c,fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:20,display:"inline-block",whiteSpace:"nowrap"}),
  sec:{fontSize:11,fontWeight:600,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:"0.07em",margin:"20px 18px 8px"},
  back:{background:"none",border:"none",cursor:"pointer",color:P.purple,fontSize:15,padding:"0 0 2px",display:"flex",alignItems:"center",gap:4},
};

/* ═══════════════════════════════════════════
   COMPONENTES BASE
═══════════════════════════════════════════ */
function ConfirmDialog({message,onConfirm,onCancel}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{...T.card,width:"min(360px,92vw)",margin:0,textAlign:"center",padding:"28px 24px"}}>
        <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
        <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>¿Estás seguro?</div>
        <div style={{fontSize:14,color:"var(--tx2)",marginBottom:24}}>{message}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button style={T.btn()} onClick={onCancel}>Cancelar</button>
          <button style={T.btnP(P.red)} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Donut({value,color,size=54}){
  const r=22,circ=2*Math.PI*r,p=Math.min(Math.max(value||0,0),10)/10;
  return(
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--bd)" strokeWidth={7}/>
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${p*circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" style={{transition:"stroke-dasharray .35s"}}/>
      <text x={28} y={33} textAnchor="middle" fontSize={12} fontWeight={600} fill={color}>
        {value!==null?value.toFixed(1):"—"}
      </text>
    </svg>
  );
}

function BarChart({evals,simGrades}){
  const maxH=90,n=evals.length,bw=Math.max(18,Math.min(38,Math.floor(480/Math.max(n,1))-12));
  if(n===0) return <div style={{fontSize:13,color:"var(--tx2)",padding:"8px 0"}}>Sin evaluaciones</div>;
  return(
    <svg viewBox={`0 0 ${Math.max(n*(bw+12)+28,200)} ${maxH+48}`} width="100%" style={{overflow:"visible"}}>
      {[0,2.5,5,7.5,10].map(v=>{
        const y=maxH-(v/10)*maxH;
        return(<g key={v}><line x1={14} x2={n*(bw+12)+14} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/><text x={10} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text></g>);
      })}
      {evals.map((e,i)=>{
        const g=simGrades?simGrades[e.id]:(e.grade!==""?parseFloat(e.grade):null);
        const h=g!==null?(g/10)*maxH:4,x=20+i*(bw+12),col=g!==null?gradeColor(g):"var(--bd)";
        const lbl=e.name.length>7?e.name.slice(0,6)+"…":e.name;
        return(<g key={e.id}>
          <rect x={x} y={maxH-h} width={bw} height={h} rx={3} fill={col} fillOpacity={g!==null?0.85:0.25} style={{transition:"height .2s,y .2s"}}/>
          {g!==null&&<text x={x+bw/2} y={maxH-h-4} textAnchor="middle" fontSize={10} fontWeight={600} fill={col}>{g.toFixed(1)}</text>}
          <text x={x+bw/2} y={maxH+13} textAnchor="middle" fontSize={9} fill="var(--tx2)">{lbl}</text>
          <text x={x+bw/2} y={maxH+25} textAnchor="middle" fontSize={8} fill="var(--tx2)" fillOpacity={0.7}>{parseFloat(e.pct)}%</text>
        </g>);
      })}
      <line x1={14} x2={n*(bw+12)+14} y1={maxH-(5/10)*maxH} y2={maxH-(5/10)*maxH} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════
   MODALES
═══════════════════════════════════════════ */
function AddQuarterModal({onAdd,onClose}){
  const [name,setName]=useState("");const [colorId,setColorId]=useState("slate");const [year,setYear]=useState("");
  const col=getQC(colorId);
  function handle(){ if(!name.trim())return; onAdd({id:uid(),name:name.trim(),colorId,year:year.trim(),subjects:[]}); }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"min(420px,95vw)",margin:0,borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:600,fontSize:16}}>Nuevo cuatrimestre</span>
          <button style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)"}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:4,marginBottom:12}} placeholder="Ej: Q5" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        <label style={{fontSize:13,color:"var(--tx2)"}}>Año académico</label>
        <input style={{...T.inp,marginTop:4,marginBottom:16}} placeholder="Ej: 2025–2026" value={year} onChange={e=>setYear(e.target.value)}/>
        <label style={{fontSize:13,color:"var(--tx2)"}}>Color</label>
        <div style={{display:"flex",gap:8,marginTop:6,marginBottom:20,flexWrap:"wrap"}}>
          {QC.map(c=><button key={c.id} onClick={()=>setColorId(c.id)} style={{width:30,height:30,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0}}/>)}
        </div>
        <button style={{...T.btnP(col.main),width:"100%",opacity:name.trim()?1:0.4}} onClick={handle} disabled={!name.trim()}>Crear cuatrimestre</button>
      </div>
    </div>
  );
}

function AddSubjectModal({onAdd,onClose}){
  const [name,setName]=useState("");const [colorId,setColorId]=useState("purple");
  const [credits,setCredits]=useState("6");
  const [evals,setEvals]=useState([{id:uid(),name:"",pct:"",type:"Examen",date:""}]);
  const pctSum=evals.reduce((s,e)=>s+(parseFloat(e.pct)||0),0);
  const pctOk=Math.abs(pctSum-100)<0.01;
  const valid=name.trim()&&pctOk&&evals.every(e=>e.name.trim()&&parseFloat(e.pct)>0);
  const col=getSC(colorId);
  function updEval(id,f,v){setEvals(p=>p.map(e=>e.id!==id?e:{...e,[f]:v}));}
  function handle(){
    if(!valid)return;
    onAdd({id:uid(),name:name.trim(),colorId,credits:parseFloat(credits)||6,
      evals:evals.map(e=>({...e,pct:parseFloat(e.pct),grade:""}))});
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"min(500px,95vw)",maxHeight:"90vh",overflowY:"auto",margin:0,borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontWeight:600,fontSize:16}}>Nueva asignatura</span>
          <button style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)"}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:4,marginBottom:12}} placeholder="Ej: Cálculo II" value={name} onChange={e=>setName(e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <label style={{fontSize:13,color:"var(--tx2)"}}>Créditos ECTS</label>
            <input style={{...T.inp,marginTop:4}} type="number" min={1} max={30} step={0.5} value={credits} onChange={e=>setCredits(e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:13,color:"var(--tx2)"}}>Color</label>
            <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
              {SC.map(c=><button key={c.id} onClick={()=>setColorId(c.id)} style={{width:26,height:26,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0}}/>)}
            </div>
          </div>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)"}}>Evaluaciones</label>
        <div style={{marginTop:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:5,marginBottom:5}}>
            <span style={{fontSize:11,color:"var(--tx2)"}}>Nombre</span>
            <span style={{fontSize:11,color:"var(--tx2)"}}>Peso %</span>
            <span style={{fontSize:11,color:"var(--tx2)"}}>Tipo</span>
            <span/>
          </div>
          {evals.map(ev=>(
            <div key={ev.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:5,marginBottom:7}}>
              <input style={T.inp} placeholder="Ej: Parcial 1" value={ev.name} onChange={e=>updEval(ev.id,"name",e.target.value)}/>
              <input style={{...T.inp,textAlign:"center"}} type="number" min={0.1} max={100} step={0.1} placeholder="%" value={ev.pct} onChange={e=>updEval(ev.id,"pct",e.target.value)}/>
              <select style={T.sel} value={ev.type} onChange={e=>updEval(ev.id,"type",e.target.value)}>
                {EVAL_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:20,padding:0}} onClick={()=>setEvals(p=>p.filter(e=>e.id!==ev.id))}>×</button>
            </div>
          ))}
          <button style={{...T.btn(),width:"100%",marginTop:4}} onClick={()=>setEvals(p=>[...p,{id:uid(),name:"",pct:"",type:"Examen",date:""}])}>+ Añadir evaluación</button>
        </div>
        <div style={{margin:"12px 0 14px",padding:"9px 12px",borderRadius:8,background:pctOk?"#E1F5EE":pctSum>100?"#FCEBEB":"#FAEEDA"}}>
          <span style={{fontSize:13,color:pctOk?P.teal:pctSum>100?P.red:P.amber}}>
            Suma: <strong>{pctSum.toFixed(1)}%</strong>{pctOk?" ✓":pctSum>100?` — ${(pctSum-100).toFixed(1)}% de más`:`— faltan ${(100-pctSum).toFixed(1)}%`}
          </span>
        </div>
        <button style={{...T.btnP(col.main),width:"100%",opacity:valid?1:0.4}} onClick={handle} disabled={!valid}>Crear asignatura</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SIMULADOR
═══════════════════════════════════════════ */
function SimulatorView({sub,onBack,passGrade}){
  const col=getSC(sub.colorId);
  const [sg,setSg]=useState(()=>{const m={};sub.evals.forEach(e=>{m[e.id]=e.grade!==""?parseFloat(e.grade):5;});return m;});
  const [locked,setLocked]=useState(()=>{const m={};sub.evals.forEach(e=>{m[e.id]=e.grade!=="";});return m;});
  const [target,setTarget]=useState(passGrade);
  const finalNote=sub.evals.reduce((s,e)=>s+(sg[e.id]*(parseFloat(e.pct)/100)),0);
  const fc=gradeColor(finalNote);
  function neededForTarget(t){const pp=sub.evals.filter(e=>!locked[e.id]).reduce((s,e)=>s+parseFloat(e.pct),0);if(!pp)return null;const lp=sub.evals.filter(e=>locked[e.id]).reduce((s,e)=>s+(sg[e.id]*(parseFloat(e.pct)/100)),0);return(t-lp)/(pp/100);}
  const nt=neededForTarget(target);
  function setAll(v){setSg(p=>{const n={...p};sub.evals.forEach(e=>{if(!locked[e.id])n[e.id]=v;});return n;});}
  function reset(){setSg(()=>{const n={};sub.evals.forEach(e=>{n[e.id]=e.grade!==""?parseFloat(e.grade):5;});return n;});}
  return(
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:17,fontWeight:600,margin:0}}>{sub.name} — Simulador</h1></div>
      </div>
      <div style={{margin:"14px 18px 10px",padding:"16px 18px",borderRadius:12,background:`${fc}12`,border:`0.5px solid ${fc}44`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4}}>Nota final simulada</div>
          <div style={{fontSize:42,fontWeight:600,color:fc,lineHeight:1}}>{finalNote.toFixed(2)}</div>
          <div style={{fontSize:13,marginTop:6,color:finalNote>=passGrade?P.teal:P.red,fontWeight:500}}>
            {finalNote>=passGrade?"✓ Aprobado":"✗ Suspenso"} · {finalNote>=passGrade?"+":""}{(finalNote-passGrade).toFixed(2)} respecto al aprobado
          </div>
        </div>
        <Donut value={finalNote} color={fc} size={78}/>
      </div>
      {sub.evals.length>0&&<><div style={T.sec}>Visualización</div><div style={{padding:"0 18px 4px"}}><BarChart evals={sub.evals} simGrades={sg}/></div></>}
      <div style={T.sec}>Ajusta las notas</div>
      <div style={{padding:"0 18px"}}>
        {sub.evals.map(ev=>{
          const g=sg[ev.id],lk=locked[ev.id],gc=gradeColor(g);
          return(
            <div key={ev.id} style={{...T.card,marginBottom:8,padding:"11px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div><span style={{fontSize:14,fontWeight:500}}>{ev.name}</span><span style={{fontSize:12,color:"var(--tx2)",marginLeft:8}}>{parseFloat(ev.pct)}%</span>
                  {ev.grade!==""&&<span style={{...T.tag(P.blue),marginLeft:6,fontSize:10}}>real: {ev.grade}</span>}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"var(--tx2)"}}>+{(g*parseFloat(ev.pct)/100).toFixed(2)}</span>
                  <button onClick={()=>setLocked(p=>({...p,[ev.id]:!p[ev.id]}))} style={{background:lk?col.main+"22":"none",border:`0.5px solid ${lk?col.main:P.gray}55`,borderRadius:6,cursor:"pointer",padding:"3px 8px",fontSize:13,color:lk?col.main:P.gray}}>{lk?"🔒":"🔓"}</button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <input type="range" min={0} max={10} step={0.1} value={g} disabled={lk} style={{flex:1,accentColor:gc,opacity:lk?0.4:1}} onChange={e=>setSg(p=>({...p,[ev.id]:parseFloat(e.target.value)}))}/>
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
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Mi objetivo:</span>
          <input type="range" min={passGrade} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,accentColor:col.main}}/>
          <span style={{fontSize:20,fontWeight:600,color:col.main,minWidth:32}}>{target.toFixed(1)}</span>
        </div>
        {nt!==null?(
          <div style={{padding:"10px 12px",borderRadius:8,background:riskColor(nt)+"18",borderLeft:`3px solid ${riskColor(nt)}`}}>
            {nt>10?<span style={{fontSize:13,color:P.red}}>No es posible llegar a {target}</span>
            :nt<=0?<span style={{fontSize:13,color:P.teal}}>Ya alcanzas {target}</span>
            :<span style={{fontSize:13,color:riskColor(nt)}}>Necesitas un <strong>{nt.toFixed(2)}</strong> de media en las desbloqueadas</span>}
          </div>
        ):<div style={{fontSize:13,color:"var(--tx2)"}}>Desbloquea evaluaciones para calcular</div>}
      </div>
      <div style={T.sec}>Escenarios rápidos</div>
      <div style={{padding:"0 18px",display:"flex",flexWrap:"wrap",gap:8}}>
        {[5,7,9,10].map(v=><button key={v} style={T.btn()} onClick={()=>setAll(v)}>Todo a {v}</button>)}
        <button style={T.btn(P.coral)} onClick={reset}>Resetear</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VISTA ASIGNATURA
═══════════════════════════════════════════ */
function SubjectView({sub,onBack,onDelete,onUpdate,onOpenSim,passGrade}){
  const col=getSC(sub.colorId);
  const {current,weighted,pctDone,pctPending,needed}=calcSubject(sub.evals,passGrade);
  const rc=riskColor(needed);
  const pctSum=sub.evals.reduce((s,e)=>s+(parseFloat(e.pct)||0),0);
  const pctOk=Math.abs(pctSum-100)<0.01;
  const [target,setTarget]=useState(passGrade);
  const [confirm,setConfirm]=useState(false);
  function updateEval(eid,f,v){onUpdate({...sub,evals:sub.evals.map(e=>e.id!==eid?e:{...e,[f]:v})});}
  function addEval(){onUpdate({...sub,evals:[...sub.evals,{id:uid(),name:"Nueva evaluación",pct:0,grade:"",type:"Examen",date:""}]});}
  function delEval(eid){onUpdate({...sub,evals:sub.evals.filter(e=>e.id!==eid)});}
  function neededForTarget(t){const pp=sub.evals.filter(e=>e.grade==="").reduce((s,e)=>s+parseFloat(e.pct),0);if(!pp)return null;const dp=sub.evals.filter(e=>e.grade!=="").reduce((s,e)=>s+(parseFloat(e.grade)*(parseFloat(e.pct)/100)),0);return(t-dp)/(pp/100);}
  const nt=neededForTarget(target);
  return(
    <div style={T.page}>
      {confirm&&<ConfirmDialog message={`¿Eliminar "${sub.name}"?`} onConfirm={onDelete} onCancel={()=>setConfirm(false)}/>}
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:col.main}}>{sub.name}</h1>
          <div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{sub.credits} créditos ECTS</div></div>
        <div style={{display:"flex",gap:8}}>
          <button style={T.btnP(col.main)} onClick={onOpenSim}>Simulador →</button>
          <button style={T.btn(P.red)} onClick={()=>setConfirm(true)}>Eliminar</button>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 18px"}}>
        {[
          {label:"Nota actual",val:current!==null?current.toFixed(2):"—",c:current!==null?(current>=passGrade?P.teal:P.red):"var(--tx2)"},
          {label:"Puntos acumulados",val:weighted.toFixed(2)+"/"+((pctDone/100)*10).toFixed(1),c:col.main},
          {label:"% evaluado",val:pctDone.toFixed(1)+"%",c:"var(--tx1)"},
          {label:"% pendiente",val:pctPending.toFixed(1)+"%",c:"var(--tx2)"},
        ].map(m=>(
          <div key={m.label} style={T.metric}><div style={{fontSize:10,color:"var(--tx2)",marginBottom:3}}>{m.label}</div><div style={{fontSize:16,fontWeight:600,color:m.c}}>{m.val}</div></div>
        ))}
      </div>
      {needed!==null&&pctPending>0&&(
        <div style={{margin:"0 18px 12px",padding:"10px 14px",borderRadius:8,background:rc+"18",borderLeft:`3px solid ${rc}`}}>
          <span style={{fontSize:13,color:rc,fontWeight:500}}>
            {needed>10?"Imposible aprobar con las notas actuales":needed<=0?"Aprobado asegurado ✓":`Necesitas un ${needed.toFixed(2)} de media en lo pendiente`}
          </span>
        </div>
      )}
      {sub.evals.length>0&&<><div style={T.sec}>Notas por evaluación</div><div style={{padding:"0 18px 4px"}}><BarChart evals={sub.evals}/></div></>}
      <div style={T.sec}>Evaluaciones</div>
      {!pctOk&&sub.evals.length>0&&<div style={{margin:"-4px 18px 8px",fontSize:12,color:pctSum>100?P.red:P.amber}}>Los porcentajes suman {pctSum.toFixed(1)}% — deben sumar 100%</div>}
      <div style={{padding:"0 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 28px",gap:5,marginBottom:6}}>
          {["Evaluación","Peso%","Nota","Fecha",""].map(h=><div key={h} style={{fontSize:11,color:"var(--tx2)"}}>{h}</div>)}
        </div>
        {sub.evals.map(ev=>(
          <div key={ev.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 28px",gap:5,alignItems:"center",marginBottom:6}}>
            <input style={{...T.inp,fontSize:13}} value={ev.name} onChange={e=>updateEval(ev.id,"name",e.target.value)}/>
            <input style={{...T.inp,textAlign:"center"}} type="number" min={0.1} max={100} step={0.1} value={ev.pct} onChange={e=>updateEval(ev.id,"pct",e.target.value)}/>
            <input style={{...T.inp,textAlign:"center",borderColor:ev.grade!==""?(parseFloat(ev.grade)>=passGrade?P.teal+"99":P.red+"99"):"var(--bd2)"}}
              type="number" min={0} max={10} step={0.1} placeholder="—" value={ev.grade} onChange={e=>updateEval(ev.id,"grade",e.target.value)}/>
            <input style={{...T.inp,fontSize:12,padding:"7px 6px"}} type="date" value={ev.date||""} onChange={e=>updateEval(ev.id,"date",e.target.value)}/>
            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:20,padding:0,lineHeight:1}} onClick={()=>delEval(ev.id)}>×</button>
          </div>
        ))}
        <button style={{...T.btn(),marginTop:4,width:"100%"}} onClick={addEval}>+ Añadir evaluación</button>
      </div>
      <div style={T.sec}>¿Qué necesito para llegar a…?</div>
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Quiero sacar:</span>
          <input type="range" min={passGrade} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,accentColor:col.main}}/>
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

/* ═══════════════════════════════════════════
   VISTA CUATRIMESTRE
═══════════════════════════════════════════ */
function QuarterView({quarter,onBack,onUpdate,onDelete,passGrade}){
  const col=getQC(quarter.colorId);
  const [showAdd,setShowAdd]=useState(false);
  const [activeSubId,setActiveSubId]=useState(null);
  const [subView,setSubView]=useState("list");
  const [confirm,setConfirm]=useState(false);
  const activeSub=quarter.subjects.find(s=>s.id===activeSubId);
  const quarterNote=calcQuarter(quarter.subjects,passGrade);
  const stats=quarter.subjects.map(s=>calcSubject(s.evals,passGrade));
  const passed=stats.filter(c=>c.pctPending===0&&c.weighted>=passGrade).length;
  const{total:totalCr,approved:approvedCr}=creditsInfo(quarter.subjects,passGrade);
  function updSubs(fn){onUpdate({...quarter,subjects:fn(quarter.subjects)});}
  function openSub(id){setActiveSubId(id);setSubView("subject");}
  function closeSub(){setActiveSubId(null);setSubView("list");}
  if(subView==="subject"&&activeSub) return(
    <SubjectView sub={activeSub} onBack={closeSub}
      onDelete={()=>{updSubs(p=>p.filter(s=>s.id!==activeSubId));closeSub();}}
      onUpdate={s=>updSubs(p=>p.map(x=>x.id===s.id?s:x))}
      onOpenSim={()=>setSubView("sim")} passGrade={passGrade}/>
  );
  if(subView==="sim"&&activeSub) return(
    <SimulatorView sub={activeSub} onBack={()=>setSubView("subject")} passGrade={passGrade}/>
  );
  return(
    <div style={T.page}>
      {showAdd&&<AddSubjectModal onAdd={s=>{updSubs(p=>[...p,s]);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
      {confirm&&<ConfirmDialog message={`¿Eliminar el cuatrimestre "${quarter.name}"?`} onConfirm={onDelete} onCancel={()=>setConfirm(false)}/>}
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><button style={T.back} onClick={onBack}>← Volver</button>
          <h1 style={{fontSize:19,fontWeight:600,margin:0,color:col.main}}>{quarter.name}</h1>
          {quarter.year&&<div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{quarter.year}</div>}</div>
        <div style={{display:"flex",gap:8}}>
          <button style={T.btnP(col.main)} onClick={()=>setShowAdd(true)}>+ Asignatura</button>
          <button style={T.btn(P.red)} onClick={()=>setConfirm(true)}>Eliminar</button>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 18px"}}>
        {[
          {label:"Media cuatrimestre",val:quarterNote!==null?quarterNote.toFixed(2):"—",c:quarterNote!==null?(quarterNote>=passGrade?P.teal:P.red):P.gray},
          {label:"Créditos aprobados",val:`${approvedCr}/${totalCr}`,c:approvedCr>0?P.teal:P.gray},
          {label:"Asignaturas",val:quarter.subjects.length,c:col.main},
          {label:"Aprobadas",val:passed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={T.metric}><div style={{fontSize:10,color:"var(--tx2)",marginBottom:3}}>{m.label}</div><div style={{fontSize:16,fontWeight:600,color:m.c}}>{m.val}</div></div>
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
      <div style={{padding:"0 18px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:12}}>
        {quarter.subjects.map((sub,i)=>{
          const{current,pctDone,pctPending,needed}=stats[i];
          const sc=getSC(sub.colorId),rc=riskColor(needed),rl=riskLabel(needed,pctPending);
          return(
            <div key={sub.id} onClick={()=>openSub(sub.id)} style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`3px solid ${sc.main}`,borderRadius:12,padding:"1rem",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:sc.main,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{sub.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>{sub.credits} ECTS · {sub.evals.length} eval.</div>
                </div>
                <Donut value={current} color={current!==null?(current>=passGrade?P.teal:P.red):P.gray} size={48}/>
              </div>
              <div style={{height:4,borderRadius:2,background:"var(--bd)",overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${pctDone}%`,background:sc.main,borderRadius:2}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--tx2)"}}>{pctDone.toFixed(0)}% eval.</span>
                <span style={T.tag(rc)}>{rl}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INICIO (DASHBOARD)
═══════════════════════════════════════════ */
function HomeView({quarters,onOpenQuarter,onAddQuarter,passGrade}){
  const qNotes=quarters.map(q=>calcQuarter(q.subjects,passGrade)).filter(n=>n!==null);
  const careerAvg=qNotes.length?qNotes.reduce((a,b)=>a+b,0)/qNotes.length:null;
  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const totalPassed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted>=passGrade;}).length;
  return(
    <div style={T.page}>
      <div style={T.hdr}>
        <div><h1 style={{fontSize:21,fontWeight:700,margin:0}}>Calculadora de notas</h1><p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Gestor académico · UPC</p></div>
        <button style={T.btnP()} onClick={onAddQuarter}>+ Cuatrimestre</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"14px 18px 4px"}}>
        {[
          {label:"Media de carrera",val:careerAvg!==null?careerAvg.toFixed(2):"—",c:careerAvg!==null?(careerAvg>=passGrade?P.teal:P.red):P.gray,big:true},
          {label:"Créditos aprobados",val:`${approvedCr}/${totalCr}`,c:approvedCr>0?P.teal:P.gray},
          {label:"Cuatrimestres",val:quarters.length,c:P.purple},
          {label:"Asig. aprobadas",val:totalPassed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={{...T.metric,minWidth:m.big?130:72}}>
            <div style={{fontSize:10,color:"var(--tx2)",marginBottom:3}}>{m.label}</div>
            <div style={{fontSize:m.big?26:20,fontWeight:700,color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>
      {quarters.filter(q=>calcQuarter(q.subjects,passGrade)!==null).length>1&&(
        <>
          <div style={T.sec}>Progresión</div>
          <div style={{padding:"0 18px 4px"}}>
            <svg viewBox={`0 0 ${Math.max(quarters.length*80+40,300)} 120`} width="100%" style={{overflow:"visible"}}>
              {[0,5,10].map(v=>{const y=100-(v/10)*80;return(<g key={v}><line x1={30} x2={quarters.length*80+10} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/><text x={26} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text></g>);}) }
              <line x1={30} x2={quarters.length*80+10} y1={100-(5/10)*80} y2={100-(5/10)*80} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3"/>
              {quarters.map((q,i)=>{
                const note=calcQuarter(q.subjects,passGrade);if(note===null)return null;
                const x=50+i*80,y=100-(note/10)*80,c=getQC(q.colorId).main;
                let px=null,py=null;
                for(let j=i-1;j>=0;j--){const pn=calcQuarter(quarters[j].subjects,passGrade);if(pn!==null){px=50+j*80;py=100-(pn/10)*80;break;}}
                return(<g key={q.id}>{px!==null&&<line x1={px} y1={py} x2={x} y2={y} stroke={c} strokeWidth={2} strokeOpacity={0.5}/>}<circle cx={x} cy={y} r={6} fill={c}/><text x={x} y={y-10} textAnchor="middle" fontSize={10} fontWeight={600} fill={c}>{note.toFixed(1)}</text><text x={x} y={114} textAnchor="middle" fontSize={9} fill="var(--tx2)">{q.name.slice(0,5)}</text></g>);
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
          <div style={{fontSize:13,color:"var(--tx2)",marginBottom:20}}>Crea tu primer cuatrimestre</div>
          <button style={T.btnP()} onClick={onAddQuarter}>+ Añadir cuatrimestre</button>
        </div>
      )}
      <div style={{padding:"0 18px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,paddingBottom:20}}>
        {quarters.map(q=>{
          const col=getQC(q.colorId),note=calcQuarter(q.subjects,passGrade),nc=gradeColor(note);
          const subStats=q.subjects.map(s=>calcSubject(s.evals,passGrade));
          const pct=q.subjects.length>0?(subStats.reduce((s,c)=>s+c.pctDone,0)/q.subjects.length):0;
          const{total:tc,approved:ac}=creditsInfo(q.subjects,passGrade);
          return(
            <div key={q.id} onClick={()=>onOpenQuarter(q.id)} style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`4px solid ${col.main}`,borderRadius:12,padding:"1.1rem",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:16,color:col.main}}>{q.name}</div>
                  {q.year&&<div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{q.year}</div>}
                  <div style={{fontSize:12,color:"var(--tx2)",marginTop:4}}>{q.subjects.length} asignatura{q.subjects.length!==1?"s":""}</div>
                  <div style={{fontSize:12,color:ac>0?P.teal:P.gray,marginTop:2}}>{ac}/{tc} créditos aprobados</div>
                </div>
                <div style={{textAlign:"center"}}><Donut value={note} color={nc} size={58}/><div style={{fontSize:10,color:"var(--tx2)",marginTop:2}}>media</div></div>
              </div>
              <div style={{height:5,borderRadius:3,background:"var(--bd)",overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${pct}%`,background:col.main,borderRadius:3}}/>
              </div>
              <div style={{fontSize:11,color:"var(--tx2)"}}>{pct.toFixed(0)}% evaluado</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CALENDARIO
═══════════════════════════════════════════ */
function CalendarView({quarters,passGrade}){
  // Recopilar todos los eventos con fecha
  const events=useMemo(()=>{
    const evs=[];
    quarters.forEach(q=>{
      q.subjects.forEach(s=>{
        s.evals.forEach(e=>{
          if(e.date){
            const days=daysUntil(e.date);
            evs.push({qName:q.name,qColor:getQC(q.colorId).main,subName:s.name,subColor:getSC(s.colorId).main,
              evalName:e.name,type:e.type||"Examen",pct:e.pct,grade:e.grade,date:e.date,days,
              needed:calcSubject(s.evals,passGrade).needed});
          }
        });
      });
    });
    return evs.sort((a,b)=>new Date(a.date)-new Date(b.date));
  },[quarters,passGrade]);

  const upcoming=events.filter(e=>e.days!==null&&e.days>=0);
  const past=events.filter(e=>e.days!==null&&e.days<0);

  function EventCard({ev}){
    const uc=urgencyColor(ev.days);
    return(
      <div style={{...T.card,borderLeft:`4px solid ${uc}`,marginBottom:10,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:14,color:ev.subColor,marginBottom:2}}>{ev.subName}</div>
            <div style={{fontSize:13,fontWeight:500}}>{ev.evalName}</div>
            <div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{ev.qName} · {ev.type} · {ev.pct}%</div>
          </div>
          <div style={{textAlign:"right",minWidth:80}}>
            {ev.days===0?<div style={{fontSize:13,fontWeight:700,color:P.red}}>¡Hoy!</div>
            :ev.days>0?<div style={{fontSize:13,fontWeight:700,color:uc}}>en {ev.days}d</div>
            :<div style={{fontSize:12,color:"#aaa"}}>hace {Math.abs(ev.days)}d</div>}
            <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{ev.date}</div>
            {ev.grade!==""?<span style={T.tag(gradeColor(parseFloat(ev.grade)))}>{parseFloat(ev.grade).toFixed(1)}</span>
            :<span style={T.tag(P.gray)}>Pendiente</span>}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Calendario</h1>
          <p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Exámenes y entregas</p></div>
      </div>
      {events.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📅</div>
          <div style={{fontWeight:600,marginBottom:6}}>Sin fechas asignadas</div>
          <div style={{fontSize:13,color:"var(--tx2)"}}>Añade fechas a las evaluaciones desde la vista de cada asignatura</div>
        </div>
      ):(
        <>
          {upcoming.length>0&&(
            <>
              <div style={T.sec}>Próximos ({upcoming.length})</div>
              <div style={{padding:"0 18px"}}>
                {upcoming.map((ev,i)=><EventCard key={i} ev={ev}/>)}
              </div>
            </>
          )}
          {past.length>0&&(
            <>
              <div style={T.sec}>Pasados ({past.length})</div>
              <div style={{padding:"0 18px"}}>
                {past.map((ev,i)=><EventCard key={i} ev={ev}/>)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ESTADÍSTICAS
═══════════════════════════════════════════ */
function StatsView({quarters,settings,passGrade}){
  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const totalCareer=settings.totalCredits||240;
  const subGrades=allSubs.map(s=>{const c=calcSubject(s.evals,passGrade);return{name:s.name,grade:c.current};}).filter(s=>s.grade!==null);
  const sorted=[...subGrades].sort((a,b)=>b.grade-a.grade);
  const best=sorted.slice(0,3);
  const worst=sorted.slice(-3).reverse();
  const passed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted>=passGrade;}).length;
  const failed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted<passGrade;}).length;
  // Distribución por rangos
  const ranges=[{label:"9–10",min:9,max:10,color:P.green},{label:"7–9",min:7,max:9,color:P.teal},{label:"5–7",min:5,max:7,color:P.amber},{label:"<5",min:0,max:5,color:P.red}];
  const dist=ranges.map(r=>({...r,count:subGrades.filter(s=>s.grade>=r.min&&s.grade<(r.max===10?10.01:r.max)).length}));
  const maxDist=Math.max(...dist.map(d=>d.count),1);

  return(
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Estadísticas</h1>
          <p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Rendimiento académico global</p></div>
      </div>

      {/* Progreso créditos */}
      <div style={T.sec}>Progreso de créditos</div>
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:600}}>{approvedCr} / {totalCareer} ECTS</span>
          <span style={{fontSize:14,color:P.teal,fontWeight:600}}>{((approvedCr/totalCareer)*100).toFixed(1)}%</span>
        </div>
        <div style={{height:14,borderRadius:7,background:"var(--bg3)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min((approvedCr/totalCareer)*100,100)}%`,background:P.teal,borderRadius:7,transition:"width .4s"}}/>
        </div>
        <div style={{fontSize:12,color:"var(--tx2)",marginTop:6}}>
          Créditos matriculados: {totalCr} · Meta: {totalCareer} ECTS totales de carrera
        </div>
      </div>

      {/* Asignaturas aprobadas/suspendidas */}
      <div style={T.sec}>Resumen de asignaturas</div>
      <div style={{display:"flex",gap:8,padding:"0 18px"}}>
        {[
          {label:"Aprobadas",val:passed,c:P.green,icon:"✓"},
          {label:"Suspendidas",val:failed,c:P.red,icon:"✗"},
          {label:"En curso",val:allSubs.length-passed-failed,c:P.amber,icon:"…"},
          {label:"Total",val:allSubs.length,c:P.purple,icon:"∑"},
        ].map(m=>(
          <div key={m.label} style={{...T.metric,textAlign:"center"}}>
            <div style={{fontSize:20,color:m.c}}>{m.icon}</div>
            <div style={{fontSize:22,fontWeight:700,color:m.c}}>{m.val}</div>
            <div style={{fontSize:10,color:"var(--tx2)"}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Distribución de notas */}
      <div style={T.sec}>Distribución de notas</div>
      <div style={{...T.card,margin:"0 18px"}}>
        {dist.map(d=>(
          <div key={d.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:12,color:"var(--tx2)",minWidth:32}}>{d.label}</span>
            <div style={{flex:1,background:"var(--bg3)",borderRadius:4,height:18,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(d.count/maxDist)*100}%`,background:d.color,borderRadius:4,transition:"width .3s"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:d.color,minWidth:20,textAlign:"right"}}>{d.count}</span>
          </div>
        ))}
      </div>

      {/* Progresión por cuatrimestre */}
      {quarters.filter(q=>calcQuarter(q.subjects,passGrade)!==null).length>0&&(
        <>
          <div style={T.sec}>Media por cuatrimestre</div>
          <div style={{...T.card,margin:"0 18px"}}>
            {quarters.map(q=>{
              const note=calcQuarter(q.subjects,passGrade);
              const col=getQC(q.colorId).main;
              if(note===null) return null;
              return(
                <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{fontSize:12,color:col,fontWeight:600,minWidth:32}}>{q.name}</span>
                  <div style={{flex:1,background:"var(--bg3)",borderRadius:4,height:18,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(note/10)*100}%`,background:col,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:gradeColor(note),minWidth:30,textAlign:"right"}}>{note.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Mejores y peores */}
      {subGrades.length>0&&(
        <>
          <div style={T.sec}>Mejores asignaturas</div>
          <div style={{padding:"0 18px"}}>
            {best.map((s,i)=>(
              <div key={i} style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:8}}>
                <div><span style={{fontSize:13,fontWeight:500,marginRight:8}}>🏅</span><span style={{fontSize:13}}>{s.name}</span></div>
                <span style={{fontSize:16,fontWeight:700,color:gradeColor(s.grade)}}>{s.grade.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={T.sec}>Asignaturas con más riesgo</div>
          <div style={{padding:"0 18px"}}>
            {worst.filter(s=>s.grade<passGrade+1).map((s,i)=>(
              <div key={i} style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:8}}>
                <div><span style={{fontSize:13,marginRight:8}}>⚠️</span><span style={{fontSize:13}}>{s.name}</span></div>
                <span style={{fontSize:16,fontWeight:700,color:gradeColor(s.grade)}}>{s.grade.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DATOS
═══════════════════════════════════════════ */
function DataView({quarters,settings,passGrade,onReset}){
  const [confirmReset,setConfirmReset]=useState(false);
  const [pdfSelected,setPdfSelected]=useState({});
  const [tab,setTab]=useState("summary"); // summary | ia | backup

  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const careerNotes=quarters.map(q=>calcQuarter(q.subjects,passGrade)).filter(n=>n!==null);
  const careerAvg=careerNotes.length?careerNotes.reduce((a,b)=>a+b,0)/careerNotes.length:null;

  // Asignaturas válidas para PDF IA (tienen al menos una fecha futura)
  const validForIA=useMemo(()=>{
    const res=[];
    quarters.forEach(q=>{
      q.subjects.forEach(s=>{
        const futureEvals=s.evals.filter(e=>e.date&&daysUntil(e.date)>=0);
        const{current,needed}=calcSubject(s.evals,passGrade);
        if(futureEvals.length>0){
          const minDays=Math.min(...futureEvals.map(e=>daysUntil(e.date)));
          res.push({sub:s,qName:q.name,futureEvals,minDays,current,needed,valid:true});
        } else {
          res.push({sub:s,qName:q.name,futureEvals:[],minDays:null,current,needed,valid:false});
        }
      });
    });
    return res.sort((a,b)=>(a.minDays??9999)-(b.minDays??9999));
  },[quarters,passGrade]);

  function toggleSel(id){setPdfSelected(p=>({...p,[id]:!p[id]}));}

  function exportJSON(){
    const data={quarters,settings,exportDate:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="calculadora_notas_backup.json";a.click();
  }

  function importJSON(){
    const input=document.createElement("input");input.type="file";input.accept=".json";
    input.onchange=e=>{
      const file=e.target.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        try{
          const data=JSON.parse(ev.target.result);
          if(data.quarters){localStorage.setItem("calc_notas_v5",JSON.stringify(data.quarters));window.location.reload();}
          else alert("Archivo no válido");
        }catch{alert("Error al leer el archivo");}
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Generar texto del PDF resumen
  function printSummary(){
    const lines=[];
    lines.push("CALCULADORA DE NOTAS — RESUMEN ACADÉMICO");
    lines.push(`Estudiante: ${settings.studentName||"No especificado"}`);
    lines.push(`Fecha: ${new Date().toLocaleDateString("es-ES")}`);
    lines.push(`Media de carrera: ${careerAvg!==null?careerAvg.toFixed(2):"—"}`);
    lines.push(`Créditos aprobados: ${approvedCr} / ${settings.totalCredits||240}`);
    lines.push("─".repeat(50));
    quarters.forEach(q=>{
      const note=calcQuarter(q.subjects,passGrade);
      lines.push(`\nCUATRIMESTRE: ${q.name}${q.year?" ("+q.year+")":""}`);
      lines.push(`Media: ${note!==null?note.toFixed(2):"Sin notas"}`);
      q.subjects.forEach(s=>{
        const{current,pctDone,pctPending,needed}=calcSubject(s.evals,passGrade);
        lines.push(`  • ${s.name} (${s.credits} ECTS)`);
        lines.push(`    Nota actual: ${current!==null?current.toFixed(2):"—"} | Evaluado: ${pctDone.toFixed(0)}%`);
        if(needed!==null&&pctPending>0) lines.push(`    Necesita: ${needed>10?"Imposible":needed<=0?"Ya aprobado":needed.toFixed(2)+" para aprobar"}`);
        s.evals.forEach(e=>{
          lines.push(`    — ${e.name}: ${e.grade!==""?e.grade:"pendiente"} (${e.pct}%)${e.date?" · "+e.date:""}`);
        });
      });
    });
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>Resumen Académico</title><style>body{font-family:monospace;white-space:pre;padding:20px;font-size:13px;}</style></head><body>${lines.join("\n")}</body></html>`);
    win.document.close();win.print();
  }

  // Generar PDF para IA
  function printIA(){
    const selected=validForIA.filter(item=>item.valid&&pdfSelected[item.sub.id]);
    if(selected.length===0){alert("Selecciona al menos una asignatura");return;}
    const prompt=`Eres un asistente experto en planificación académica universitaria. Tu objetivo es crear un plan de estudio realista, eficiente y adaptado a la situación del estudiante usando la información proporcionada a continuación.

Analiza cuidadosamente cada asignatura teniendo en cuenta la fecha del examen o entrega, el tiempo disponible hasta esa fecha, la nota actual del estudiante, el peso de las evaluaciones pendientes, el nivel de riesgo y la carga global de trabajo entre asignaturas.

A partir de esto, genera un plan de estudio organizado por días desde hoy hasta el último examen o entrega. Indica qué asignatura estudiar cada día, durante cuánto tiempo y con qué prioridad.

Prioriza las asignaturas con fecha más cercana, mayor riesgo de suspenso y mayor peso pendiente. El plan debe ser realista, no superar una carga razonable de estudio diaria, incluir descansos, combinar asignaturas cuando sea útil para evitar fatiga mental y reservar momentos de repaso antes de cada examen.

Resume al inicio la estrategia general, señala los riesgos principales y, si detectas que no es posible llegar a todo, indica qué debería priorizarse. El resultado debe ser claro, estructurado y fácil de seguir.`;

    const lines=[];
    lines.push("═══════════════════════════════════════");
    lines.push("INSTRUCCIONES PARA LA IA");
    lines.push("═══════════════════════════════════════");
    lines.push(prompt);
    lines.push("\n═══════════════════════════════════════");
    lines.push("DATOS DEL ESTUDIANTE");
    lines.push("═══════════════════════════════════════");
    lines.push(`Nombre: ${settings.studentName||"No especificado"}`);
    lines.push(`Fecha actual: ${new Date().toLocaleDateString("es-ES")}`);
    lines.push(`Nota mínima de aprobado: ${passGrade}`);
    lines.push("\n═══════════════════════════════════════");
    lines.push("ASIGNATURAS SELECCIONADAS");
    lines.push("═══════════════════════════════════════");
    selected.forEach(item=>{
      const{sub,qName,futureEvals,current,needed}=item;
      const risk=riskLevel(needed);
      lines.push(`\n▸ ${sub.name} (${qName})`);
      lines.push(`  Nota actual: ${current!==null?current.toFixed(2):"Sin notas"}`);
      lines.push(`  Nota necesaria para aprobar: ${needed!==null?(needed<=0?"Ya aprobado":needed>10?"Imposible":needed.toFixed(2)):"—"}`);
      lines.push(`  Nivel de riesgo: ${risk}`);
      lines.push(`  Créditos: ${sub.credits} ECTS`);
      lines.push(`  Evaluaciones realizadas:`);
      sub.evals.filter(e=>e.grade!=="").forEach(e=>{lines.push(`    ✓ ${e.name}: ${e.grade} (${e.pct}%)`);});
      lines.push(`  Evaluaciones pendientes con fecha:`);
      futureEvals.forEach(e=>{const d=daysUntil(e.date);lines.push(`    ◉ ${e.name} — ${e.date} (en ${d} días) — peso: ${e.pct}%`);});
      sub.evals.filter(e=>e.grade===""&&(!e.date||daysUntil(e.date)<0)).forEach(e=>{lines.push(`    ○ ${e.name} — sin fecha asignada — peso: ${e.pct}%`);});
    });
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>Plan de estudio IA</title><style>body{font-family:monospace;white-space:pre;padding:20px;font-size:12px;}</style></head><body>${lines.join("\n")}</body></html>`);
    win.document.close();win.print();
  }

  const tabs=[{id:"summary",label:"Resumen PDF"},{id:"ia",label:"PDF para IA"},{id:"backup",label:"Copia de seguridad"}];

  return(
    <div style={T.page}>
      {confirmReset&&<ConfirmDialog message="¿Resetear TODOS los datos? Esta acción no se puede deshacer." onConfirm={onReset} onCancel={()=>setConfirmReset(false)}/>}
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Datos</h1><p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Exportar y gestionar</p></div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,padding:"12px 18px 0",borderBottom:"0.5px solid var(--bd)",marginBottom:16}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"var(--tx1)":"transparent",color:tab===t.id?"var(--bg1)":"var(--tx2)",border:"0.5px solid var(--bd2)",borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",fontWeight:tab===t.id?600:400}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {tab==="summary"&&(
        <div style={{padding:"0 18px"}}>
          <div style={{...T.card,marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Resumen académico completo</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:16}}>Genera un documento imprimible con todas tus asignaturas, notas y evaluaciones.</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:4}}>Vista previa:</div>
            <div style={{background:"var(--bg2)",borderRadius:8,padding:"12px",fontSize:12,color:"var(--tx2)",fontFamily:"monospace",marginBottom:16}}>
              <div>Estudiante: {settings.studentName||"—"}</div>
              <div>Media de carrera: {careerAvg!==null?careerAvg.toFixed(2):"—"}</div>
              <div>Créditos: {approvedCr}/{settings.totalCredits||240}</div>
              <div>Cuatrimestres: {quarters.length}</div>
            </div>
            <button style={{...T.btnP(),width:"100%"}} onClick={printSummary}>🖨️ Generar e imprimir resumen</button>
          </div>
        </div>
      )}

      {/* Tab: PDF IA */}
      {tab==="ia"&&(
        <div style={{padding:"0 18px"}}>
          <div style={{...T.card,marginBottom:12,background:"var(--bg2)"}}>
            <div style={{fontSize:13,color:"var(--tx2)"}}>Selecciona las asignaturas que quieres incluir. Solo puedes elegir asignaturas con exámenes o entregas futuras.</div>
          </div>
          {validForIA.map(item=>{
            const{sub,qName,minDays,valid}=item;
            const sel=pdfSelected[sub.id]||false;
            return(
              <div key={sub.id} onClick={()=>valid&&toggleSel(sub.id)}
                style={{...T.card,display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:8,opacity:valid?1:0.45,cursor:valid?"pointer":"not-allowed",border:`0.5px solid ${sel?"var(--tx1)":"var(--bd)"}`}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${sel?"var(--tx1)":"var(--bd2)"}`,background:sel?"var(--tx1)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {sel&&<span style={{color:"var(--bg1)",fontSize:14}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{qName}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {valid?<span style={{...T.tag(urgencyColor(minDays)),fontSize:11}}>en {minDays}d</span>
                  :<span style={{...T.tag(P.gray),fontSize:11}}>sin fechas</span>}
                </div>
              </div>
            );
          })}
          <button style={{...T.btnP(P.purple),width:"100%",marginTop:8}} onClick={printIA}>🤖 Generar PDF para IA</button>
        </div>
      )}

      {/* Tab: Backup */}
      {tab==="backup"&&(
        <div style={{padding:"0 18px"}}>
          <div style={{...T.card,marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>💾 Exportar copia de seguridad</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:14}}>Descarga todos tus datos en formato JSON. Guárdalo en un lugar seguro.</div>
            <button style={{...T.btnP(P.teal),width:"100%"}} onClick={exportJSON}>Exportar JSON</button>
          </div>
          <div style={{...T.card,marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>📂 Importar copia de seguridad</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:14}}>Restaura tus datos desde un archivo JSON exportado anteriormente.</div>
            <button style={{...T.btnP(P.amber),width:"100%"}} onClick={importJSON}>Importar JSON</button>
          </div>
          <div style={{...T.card,borderColor:P.red+"44"}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6,color:P.red}}>⚠️ Resetear todos los datos</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:14}}>Elimina todos los cuatrimestres, asignaturas y notas. No se puede deshacer.</div>
            <button style={{...T.btn(P.red),width:"100%"}} onClick={()=>setConfirmReset(true)}>Resetear todo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AJUSTES
═══════════════════════════════════════════ */
function SettingsView({settings,onUpdate,darkMode,onToggleDark}){
  const [s,setS]=useState(settings);
  function upd(k,v){const n={...s,[k]:v};setS(n);onUpdate(n);}
  return(
    <div style={T.page}>
      <div style={{...T.hdr,paddingBottom:8}}>
        <div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Ajustes</h1><p style={{fontSize:13,color:"var(--tx2)",margin:"2px 0 0"}}>Preferencias personales</p></div>
      </div>

      <div style={T.sec}>Perfil</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card}}>
          <label style={{fontSize:13,color:"var(--tx2)"}}>Nombre del estudiante</label>
          <input style={{...T.inp,marginTop:6}} placeholder="Tu nombre completo" value={s.studentName||""} onChange={e=>upd("studentName",e.target.value)}/>
        </div>
      </div>

      <div style={T.sec}>Académico</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,marginBottom:12}}>
          <label style={{fontSize:13,color:"var(--tx2)"}}>Total de créditos de la carrera</label>
          <input style={{...T.inp,marginTop:6}} type="number" min={30} max={500} step={1} placeholder="240" value={s.totalCredits||""} onChange={e=>upd("totalCredits",parseInt(e.target.value)||240)}/>
          <div style={{fontSize:12,color:"var(--tx2)",marginTop:6}}>Usado para calcular el progreso total en estadísticas</div>
        </div>
        <div style={{...T.card}}>
          <label style={{fontSize:13,color:"var(--tx2)"}}>Nota mínima de aprobado</label>
          <input style={{...T.inp,marginTop:6}} type="number" min={1} max={9} step={0.5} placeholder="5" value={s.passGrade||""} onChange={e=>upd("passGrade",parseFloat(e.target.value)||5)}/>
          <div style={{fontSize:12,color:"var(--tx2)",marginTop:6}}>Afecta a todos los cálculos de la app</div>
        </div>
      </div>

      <div style={T.sec}>Apariencia</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>Modo oscuro</div>
            <div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{darkMode?"Activado":"Desactivado"}</div>
          </div>
          <button onClick={onToggleDark} style={{background:darkMode?"var(--tx1)":"var(--bd2)",border:"none",borderRadius:30,padding:"3px",cursor:"pointer",width:52,height:30,position:"relative",transition:"background .2s"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:"var(--bg1)",position:"absolute",top:3,left:darkMode?25:3,transition:"left .2s"}}/>
          </button>
        </div>
      </div>

      <div style={T.sec}>Información</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,fontSize:13,color:"var(--tx2)"}}>
          <div style={{marginBottom:4}}>Calculadora de notas UPC · v6</div>
          <div>Datos guardados localmente en tu dispositivo</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   BARRA DE NAVEGACIÓN INFERIOR
═══════════════════════════════════════════ */
function NavBar({active,onChange}){
  const items=[
    {id:"home",icon:"🏠",label:"Inicio"},
    {id:"calendar",icon:"📅",label:"Calendario"},
    {id:"stats",icon:"📊",label:"Estadísticas"},
    {id:"data",icon:"💾",label:"Datos"},
    {id:"settings",icon:"⚙️",label:"Ajustes"},
  ];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--bg1)",borderTop:"0.5px solid var(--bd)",display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {items.map(it=>(
        <button key={it.id} onClick={()=>onChange(it.id)}
          style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 4px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{fontSize:20}}>{it.icon}</span>
          <span style={{fontSize:10,color:active===it.id?"var(--tx1)":P.gray,fontWeight:active===it.id?700:400}}>{it.label}</span>
          {active===it.id&&<div style={{width:18,height:3,background:P.purple,borderRadius:2}}/>}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
const DEFAULT_SETTINGS={studentName:"",totalCredits:240,passGrade:5};

export default function App(){
  const [quarters,setQuarters]=useState(null);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [tab,setTab]=useState("home");
  const [darkMode,setDarkMode]=useState(false);
  const [activeQId,setActiveQId]=useState(null);
  const [showAddQ,setShowAddQ]=useState(false);

  // CSS + viewport
  useEffect(()=>{
    const sty=document.createElement("style");sty.textContent=CSS;document.head.appendChild(sty);
    let meta=document.querySelector('meta[name="viewport"]');
    if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
    meta.content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no";
    return()=>document.head.removeChild(sty);
  },[]);

  // Dark mode en el DOM
  useEffect(()=>{
    document.body.classList.toggle("dark",darkMode);
  },[darkMode]);

  // Cargar datos
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("calc_notas_v5");
      setQuarters(raw?JSON.parse(raw):makeDefaultQuarters());
      const rawS=localStorage.getItem("calc_settings");
      if(rawS) setSettings(JSON.parse(rawS));
      const dm=localStorage.getItem("calc_dark");
      if(dm) setDarkMode(dm==="1");
    }catch{setQuarters(makeDefaultQuarters());}
  },[]);

  const save=useCallback(d=>{try{localStorage.setItem("calc_notas_v5",JSON.stringify(d));}catch{}},[]);
  const saveSettings=useCallback(s=>{try{localStorage.setItem("calc_settings",JSON.stringify(s));}catch{}},[]);
  const upd=fn=>setQuarters(p=>{const n=fn(p);save(n);return n;});

  function handleSettingsUpdate(s){setSettings(s);saveSettings(s);}
  function handleToggleDark(){setDarkMode(p=>{const n=!p;localStorage.setItem("calc_dark",n?"1":"0");return n;});}
  function handleReset(){
    localStorage.removeItem("calc_notas_v5");
    setQuarters(makeDefaultQuarters());
    setTab("home");
  }

  const passGrade=settings.passGrade||5;
  const activeQ=quarters?.find(q=>q.id===activeQId);

  if(quarters===null) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--tx2)",fontFamily:"sans-serif"}}>Cargando…</div>
  );

  // Si estamos dentro de un cuatrimestre, mostramos esa vista
  if(tab==="home"&&activeQId&&activeQ){
    return(
      <>
        {showAddQ&&<AddQuarterModal onAdd={q=>{upd(p=>[...p,q]);setShowAddQ(false);}} onClose={()=>setShowAddQ(false)}/>}
        <QuarterView quarter={activeQ}
          onBack={()=>{setActiveQId(null);}}
          onDelete={()=>{upd(p=>p.filter(q=>q.id!==activeQId));setActiveQId(null);}}
          onUpdate={q=>upd(p=>p.map(x=>x.id===q.id?q:x))}
          passGrade={passGrade}/>
        <NavBar active={tab} onChange={id=>{setTab(id);setActiveQId(null);}}/>
      </>
    );
  }

  return(
    <>
      {showAddQ&&<AddQuarterModal onAdd={q=>{upd(p=>[...p,q]);setShowAddQ(false);}} onClose={()=>setShowAddQ(false)}/>}
      {tab==="home"&&<HomeView quarters={quarters} onOpenQuarter={id=>{setActiveQId(id);}} onAddQuarter={()=>setShowAddQ(true)} passGrade={passGrade}/>}
      {tab==="calendar"&&<CalendarView quarters={quarters} passGrade={passGrade}/>}
      {tab==="stats"&&<StatsView quarters={quarters} settings={settings} passGrade={passGrade}/>}
      {tab==="data"&&<DataView quarters={quarters} settings={settings} passGrade={passGrade} onReset={handleReset}/>}
      {tab==="settings"&&<SettingsView settings={settings} onUpdate={handleSettingsUpdate} darkMode={darkMode} onToggleDark={handleToggleDark}/>}
      <NavBar active={tab} onChange={id=>{setTab(id);setActiveQId(null);}}/>
    </>
  );
}