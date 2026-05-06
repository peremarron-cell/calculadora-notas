import { useState, useEffect, useCallback, useMemo } from "react";

/* ── CSS ── */
const CSS = `
  :root {
    --bg0:#f2f2f7;--bg1:#ffffff;--bg2:#f2f2f7;--bg3:#e5e5ea;
    --tx1:#1c1c1e;--tx2:#6b6b72;--bd:rgba(0,0,0,0.08);--bd2:rgba(0,0,0,0.15);
    --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
    --radius:12px;--radius-sm:8px;
  }
  .dark{--bg0:#000000;--bg1:#1c1c1e;--bg2:#2c2c2e;--bg3:#3a3a3c;--tx1:#ffffff;--tx2:#8e8e93;--bd:rgba(255,255,255,0.08);--bd2:rgba(255,255,255,0.15);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg0);min-height:100vh;font-family:var(--font);color:var(--tx1);-webkit-font-smoothing:antialiased;}
  input,select{font-family:var(--font);}
  input[type=number]::-webkit-inner-spin-button{opacity:.35;}
  input[type=range]{width:100%;cursor:pointer;}
  button{font-family:var(--font);}
  button:active{opacity:.75;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px;}
`;

const PASS_DEFAULT = 5;
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
const P = {teal:"#1D9E75",coral:"#D85A30",amber:"#BA7517",green:"#34C759",red:"#FF3B30",blue:"#007AFF",gray:"#8E8E93",purple:"#7F77DD"};

function uid(){ return Math.random().toString(36).slice(2,9); }
function today(){ return new Date().toISOString().slice(0,10); }
function daysUntil(dateStr){
  if(!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date(today()))/(1000*60*60*24));
}
function urgencyColor(d){
  if(d===null) return P.gray;
  if(d<0) return P.gray;
  if(d<=3) return P.red;
  if(d<=10) return P.amber;
  return P.teal;
}
function makeSub(name,ci,credits){
  return{id:uid(),name,colorId:SC[ci%SC.length].id,credits:credits||6,evals:[]};
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
function calcSubject(evals,pg=PASS_DEFAULT){
  let wd=0,pd=0,pp=0;
  evals.forEach(e=>{
    const pct=parseFloat(e.pct)||0;
    if(e.grade!==""){wd+=parseFloat(e.grade)*(pct/100);pd+=pct;}
    else pp+=pct;
  });
  const current=pd>0?wd/(pd/100):null;
  const needed=pp>0?(pg-wd)/(pp/100):null;
  return{current,weighted:wd,pctDone:pd,pctPending:pp,needed};
}
function calcQuarter(subjects,pg=PASS_DEFAULT){
  const gs=subjects.map(s=>calcSubject(s.evals,pg).current).filter(g=>g!==null);
  return gs.length?gs.reduce((a,b)=>a+b,0)/gs.length:null;
}
function creditsInfo(subjects,pg=PASS_DEFAULT){
  let total=0,approved=0;
  subjects.forEach(s=>{
    const cr=parseFloat(s.credits)||0;total+=cr;
    const{current,pctPending}=calcSubject(s.evals,pg);
    if(pctPending===0&&current!==null&&current>=pg) approved+=cr;
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
  if(n===null||n<=0)return"Bajo";if(n<=7)return"Medio";return"Alto";
}

/* ── Shared styles ── */
const T={
  page:{fontFamily:"var(--font)",color:"var(--tx1)",maxWidth:760,margin:"0 auto",paddingBottom:90},
  card:{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderRadius:"var(--radius)",padding:"1rem",marginBottom:10},
  inp:{border:"0.5px solid var(--bd2)",borderRadius:"var(--radius-sm)",padding:"10px 12px",fontSize:16,background:"var(--bg1)",color:"var(--tx1)",width:"100%",outline:"none"},
  sel:{border:"0.5px solid var(--bd2)",borderRadius:"var(--radius-sm)",padding:"10px 12px",fontSize:15,background:"var(--bg1)",color:"var(--tx1)",width:"100%",outline:"none"},
  btn:(c)=>({border:`0.5px solid ${c||"var(--bd2)"}`,background:"transparent",borderRadius:"var(--radius-sm)",padding:"9px 16px",fontSize:14,cursor:"pointer",color:c||"var(--tx1)"}),
  btnP:(bg,c)=>({background:bg||P.purple,color:c||"#fff",border:"none",borderRadius:"var(--radius-sm)",padding:"12px 20px",fontSize:15,fontWeight:600,cursor:"pointer",width:"100%"}),
  metric:{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px",flex:1,minWidth:72},
  tag:(c)=>({background:c+"20",color:c,fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:20,display:"inline-block",whiteSpace:"nowrap",letterSpacing:"0.01em"}),
  sec:{fontSize:11,fontWeight:600,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:"0.08em",margin:"20px 18px 8px"},
  back:{background:"none",border:"none",cursor:"pointer",color:P.blue,fontSize:15,padding:"0 0 2px",display:"flex",alignItems:"center",gap:4},
  hdr:{padding:"16px 18px 0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},
};

/* ── SVG Icons ── */
function Icon({name,size=22,color="currentColor",strokeWidth=1.6}){
  const s={stroke:color,strokeWidth,fill:"none",strokeLinecap:"round",strokeLinejoin:"round"};
  const paths={
    home:[<path key="a" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" {...s}/>,<path key="b" d="M9 21V12h6v9" {...s}/>],
    calendar:[<rect key="a" x="3" y="4" width="18" height="18" rx="3" {...s}/>,<path key="b" d="M3 9h18M8 2v4M16 2v4" {...s}/>,<circle key="c" cx="8" cy="14" r="1" fill={color}/>,<circle key="d" cx="12" cy="14" r="1" fill={color}/>,<circle key="e" cx="16" cy="14" r="1" fill={color}/>],
    stats:[<path key="a" d="M4 20V14M9 20V8M14 20V12M19 20V4" {...s}/>],
    ai:[<path key="a" d="M12 2a9 9 0 019 9 9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9z" {...s}/>,<path key="b" d="M8 12h8M12 8v8" {...s}/>],
    settings:[<circle key="a" cx="12" cy="12" r="3" {...s}/>,<path key="b" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" {...s}/>],
    bell:[<path key="a" d="M6 10a6 6 0 0112 0v4l2 2H4l2-2v-4z" {...s}/>,<path key="b" d="M10 20a2 2 0 004 0" {...s}/>],
    chevron:[<path key="a" d="M9 6l6 6-6 6" {...s}/>],
    back:[<path key="a" d="M15 6l-6 6 6 6" {...s}/>],
    lock:[<rect key="a" x="5" y="11" width="14" height="10" rx="2" {...s}/>,<path key="b" d="M8 11V7a4 4 0 018 0v4" {...s}/>],
    unlock:[<rect key="a" x="5" y="11" width="14" height="10" rx="2" {...s}/>,<path key="b" d="M8 11V7a4 4 0 017.43-1" {...s}/>],
  };
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display:"block",flexShrink:0}}>
      {paths[name]||null}
    </svg>
  );
}

/* ── Confirm ── */
function ConfirmDialog({message,onConfirm,onCancel}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"0 20px"}}>
      <div style={{...T.card,width:"100%",maxWidth:340,margin:0,textAlign:"center",padding:"28px 24px"}}>
        <div style={{fontSize:30,marginBottom:12}}>⚠️</div>
        <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>¿Estás seguro?</div>
        <div style={{fontSize:14,color:"var(--tx2)",marginBottom:24,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button style={{...T.btn(),flex:1}} onClick={onCancel}>Cancelar</button>
          <button style={{background:P.red,color:"#fff",border:"none",borderRadius:"var(--radius-sm)",padding:"9px 16px",fontSize:14,fontWeight:600,cursor:"pointer",flex:1}} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Donut ── */
function Donut({value,color,size=54}){
  const r=22,circ=2*Math.PI*r,p=Math.min(Math.max(value||0,0),10)/10;
  return(
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--bg3)" strokeWidth={7}/>
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${p*circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" style={{transition:"stroke-dasharray .4s"}}/>
      <text x={28} y={33} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>
        {value!==null?value.toFixed(1):"—"}
      </text>
    </svg>
  );
}

/* ── BarChart ── */
function BarChart({evals,simGrades}){
  const maxH=80,n=evals.length,bw=Math.max(16,Math.min(36,Math.floor(460/Math.max(n,1))-14));
  if(n===0)return null;
  return(
    <svg viewBox={`0 0 ${Math.max(n*(bw+14)+28,180)} ${maxH+46}`} width="100%" style={{overflow:"visible"}}>
      {[0,5,10].map(v=>{const y=maxH-(v/10)*maxH;return(<g key={v}><line x1={12} x2={n*(bw+14)+12} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/><text x={8} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text></g>);})}
      {evals.map((e,i)=>{
        const g=simGrades?simGrades[e.id]:(e.grade!==""?parseFloat(e.grade):null);
        const h=g!==null?(g/10)*maxH:3,x=18+i*(bw+14),col=g!==null?gradeColor(g):"var(--bg3)";
        const lbl=e.name.length>7?e.name.slice(0,6)+"…":e.name;
        return(<g key={e.id}>
          <rect x={x} y={maxH-h} width={bw} height={h} rx={4} fill={col} fillOpacity={g!==null?0.9:0.3} style={{transition:"height .25s,y .25s"}}/>
          {g!==null&&<text x={x+bw/2} y={maxH-h-5} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>{g.toFixed(1)}</text>}
          <text x={x+bw/2} y={maxH+13} textAnchor="middle" fontSize={9} fill="var(--tx2)">{lbl}</text>
          <text x={x+bw/2} y={maxH+24} textAnchor="middle" fontSize={8} fill="var(--tx2)" opacity={0.7}>{parseFloat(e.pct)}%</text>
        </g>);
      })}
      <line x1={12} x2={n*(bw+14)+12} y1={maxH-(5/10)*maxH} y2={maxH-(5/10)*maxH} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3" opacity={0.6}/>
    </svg>
  );
}

/* ══════════════════ ONBOARDING ══════════════════ */
function OnboardingScreen({onDone}){
  const [name,setName]=useState("");
  const valid=name.trim().length>0;
  function handle(){
    if(!valid)return;
    onDone(name.trim());
  }
  return(
    <div style={{minHeight:"100vh",background:"var(--bg0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:56,marginBottom:20}}>👋</div>
          <div style={{fontSize:28,fontWeight:700,letterSpacing:"-0.5px",marginBottom:10}}>Bienvenido</div>
          <div style={{fontSize:16,color:"var(--tx2)",lineHeight:1.5}}>¿Cómo quieres que<br/>te llamemos?</div>
        </div>
        <input
          autoFocus
          style={{...T.inp,textAlign:"center",fontSize:20,padding:"16px",borderRadius:"var(--radius)",marginBottom:16,fontWeight:500}}
          placeholder="Tu nombre"
          value={name}
          onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handle()}
        />
        <button
          style={{...T.btnP(valid?P.purple:"var(--bg3)",valid?"#fff":"var(--tx2)"),borderRadius:"var(--radius)",fontSize:17,padding:"15px",transition:"background .2s"}}
          onClick={handle}
          disabled={!valid}
        >
          Continuar
        </button>
        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:"var(--tx2)"}}>
          Podrás cambiarlo después en Ajustes
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ HEADER ══════════════════ */
function AppHeader({quarters,settings,passGrade,bellOpen,onBellClick,onCloseBell}){
  const firstName=(settings.studentName||"").trim().split(" ")[0]||null;

  const activeQuarters=useMemo(()=>
    quarters.filter(q=>q.subjects.some(s=>calcSubject(s.evals,passGrade).pctPending>0))
  ,[quarters,passGrade]);

  const activeSubs=useMemo(()=>
    activeQuarters.reduce((s,q)=>s+q.subjects.filter(sub=>calcSubject(sub.evals,passGrade).pctPending>0).length,0)
  ,[activeQuarters,passGrade]);

  const qLabel=activeQuarters.length===0?"Sin asignaturas activas"
    :activeQuarters.length===1?`${activeQuarters[0].name} · ${activeSubs} asignatura${activeSubs!==1?"s":""} activa${activeSubs!==1?"s":""}`
    :activeQuarters.length===2?`${activeQuarters[0].name} y ${activeQuarters[1].name} · ${activeSubs} asignaturas activas`
    :`${activeQuarters.length} cuatrimestres · ${activeSubs} asignaturas activas`;

  // Próximo evento (el más cercano con fecha futura)
  const nextEvent=useMemo(()=>{
    let best=null;
    quarters.forEach(q=>q.subjects.forEach(s=>s.evals.forEach(e=>{
      if(e.date&&e.grade===""){const d=daysUntil(e.date);if(d!==null&&d>=0&&(best===null||d<best.days)) best={subName:s.name,evalName:e.name,type:e.type||"Examen",days:d,color:getSC(s.colorId).main};}
    })));
    return best;
  },[quarters]);

  // Todos los próximos eventos para el panel
  const upcomingEvents=useMemo(()=>{
    const evs=[];
    quarters.forEach(q=>q.subjects.forEach(s=>s.evals.forEach(e=>{
      if(e.date&&e.grade===""){const d=daysUntil(e.date);if(d!==null&&d>=0) evs.push({subName:s.name,evalName:e.name,type:e.type||"Examen",days:d,date:e.date,color:getSC(s.colorId).main});}
    })));
    return evs.sort((a,b)=>a.days-b.days).slice(0,8);
  },[quarters]);

  const urgentCount=upcomingEvents.filter(e=>e.days<=7).length;

  return(
    <div style={{position:"sticky",top:0,zIndex:90,background:"var(--bg1)",borderBottom:"0.5px solid var(--bd)"}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:"16px 18px 14px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          {/* Left: greeting + info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.4px",lineHeight:1.2}}>
              {firstName?`Hola, ${firstName} 👋`:"Bienvenido 👋"}
            </div>
            <div style={{fontSize:13,color:"var(--tx2)",marginTop:4}}>{qLabel}</div>
          </div>

          {/* Right: next event card + bell */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {nextEvent&&(
              <div style={{background:nextEvent.color+"15",border:`0.5px solid ${nextEvent.color}30`,borderRadius:"var(--radius-sm)",padding:"7px 10px",textAlign:"right",maxWidth:120}}>
                <div style={{fontSize:10,color:nextEvent.color,fontWeight:700,letterSpacing:"0.03em",textTransform:"uppercase",marginBottom:2}}>{nextEvent.type}</div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--tx1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nextEvent.subName.split(" ").slice(0,2).join(" ")}</div>
                <div style={{fontSize:11,color:urgencyColor(nextEvent.days),fontWeight:600,marginTop:1}}>{nextEvent.days===0?"¡Hoy!":`en ${nextEvent.days}d`}</div>
              </div>
            )}
            <div style={{position:"relative"}}>
              <button onClick={onBellClick} style={{background:"var(--bg2)",border:"0.5px solid var(--bd)",borderRadius:10,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <Icon name="bell" size={18} color={bellOpen?P.purple:"var(--tx2)"}/>
                {urgentCount>0&&<div style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:P.red,border:"1.5px solid var(--bg1)"}}/>}
              </button>
              {bellOpen&&(
                <div style={{position:"absolute",right:0,top:46,width:"min(300px,85vw)",background:"var(--bg1)",border:"0.5px solid var(--bd)",borderRadius:"var(--radius)",boxShadow:"0 12px 40px rgba(0,0,0,0.18)",zIndex:200,overflow:"hidden"}}>
                  <div style={{padding:"12px 14px 10px",borderBottom:"0.5px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:700}}>Próximos eventos</span>
                    <button onClick={onCloseBell} style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:18}}>×</button>
                  </div>
                  {upcomingEvents.length===0?(
                    <div style={{padding:"20px 16px",textAlign:"center",color:"var(--tx2)",fontSize:13}}>Sin eventos próximos</div>
                  ):(
                    <div style={{maxHeight:260,overflowY:"auto"}}>
                      {upcomingEvents.map((ev,i)=>(
                        <div key={i} style={{padding:"10px 14px",borderBottom:i<upcomingEvents.length-1?"0.5px solid var(--bd)":"none",display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:3,height:32,borderRadius:2,background:urgencyColor(ev.days),flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:ev.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.subName}</div>
                            <div style={{fontSize:12,color:"var(--tx1)",marginTop:1}}>{ev.evalName}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:urgencyColor(ev.days)}}>{ev.days===0?"Hoy":`${ev.days}d`}</div>
                            <div style={{fontSize:10,color:"var(--tx2)",marginTop:1}}>{ev.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ MODALES ══════════════════ */
function AddQuarterModal({onAdd,onClose}){
  const [name,setName]=useState("");const [colorId,setColorId]=useState("slate");const [year,setYear]=useState("");
  const col=getQC(colorId);
  function handle(){if(!name.trim())return;onAdd({id:uid(),name:name.trim(),colorId,year:year.trim(),subjects:[]});}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"100%",maxWidth:760,margin:0,borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:700,fontSize:17}}>Nuevo cuatrimestre</span>
          <button style={{background:"var(--bg2)",border:"none",cursor:"pointer",width:30,height:30,borderRadius:"50%",fontSize:18,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:6,marginBottom:14}} placeholder="Ej: Q5" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Año académico</label>
        <input style={{...T.inp,marginTop:6,marginBottom:16}} placeholder="Ej: 2025–2026" value={year} onChange={e=>setYear(e.target.value)}/>
        <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Color</label>
        <div style={{display:"flex",gap:10,marginTop:8,marginBottom:22}}>
          {QC.map(c=><button key={c.id} onClick={()=>setColorId(c.id)} style={{width:32,height:32,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0,transition:"border .15s"}}/>)}
        </div>
        <button style={{...T.btnP(col.main),borderRadius:"var(--radius)",fontSize:16,padding:"14px",opacity:name.trim()?1:0.4}} onClick={handle} disabled={!name.trim()}>Crear cuatrimestre</button>
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
    onAdd({id:uid(),name:name.trim(),colorId,credits:parseFloat(credits)||6,evals:evals.map(e=>({...e,pct:parseFloat(e.pct),grade:""}))});
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999}}>
      <div style={{...T.card,width:"100%",maxWidth:760,margin:0,borderRadius:"20px 20px 0 0",maxHeight:"92vh",overflowY:"auto",padding:"24px 20px 36px",borderTop:`3px solid ${col.main}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontWeight:700,fontSize:17}}>Nueva asignatura</span>
          <button style={{background:"var(--bg2)",border:"none",cursor:"pointer",width:30,height:30,borderRadius:"50%",fontSize:18,color:"var(--tx2)"}} onClick={onClose}>×</button>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Nombre</label>
        <input autoFocus style={{...T.inp,marginTop:6,marginBottom:14}} placeholder="Ej: Cálculo II" value={name} onChange={e=>setName(e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Créditos ECTS</label>
            <input style={{...T.inp,marginTop:6}} type="number" min={1} max={30} step={0.5} value={credits} onChange={e=>setCredits(e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Color</label>
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
              {SC.map(c=><button key={c.id} onClick={()=>setColorId(c.id)} style={{width:26,height:26,borderRadius:"50%",background:c.main,border:`3px solid ${colorId===c.id?"var(--tx1)":"transparent"}`,cursor:"pointer",padding:0}}/>)}
            </div>
          </div>
        </div>
        <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Evaluaciones</label>
        <div style={{marginTop:8}}>
          {evals.map((ev,idx)=>(
            <div key={ev.id} style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:8}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input style={{...T.inp,flex:2,fontSize:14}} placeholder="Nombre" value={ev.name} onChange={e=>updEval(ev.id,"name",e.target.value)}/>
                <input style={{...T.inp,width:70,textAlign:"center"}} type="number" min={0.1} max={100} step={0.1} placeholder="%" value={ev.pct} onChange={e=>updEval(ev.id,"pct",e.target.value)}/>
                <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:22,padding:0,flexShrink:0,lineHeight:1}} onClick={()=>setEvals(p=>p.filter(e=>e.id!==ev.id))}>×</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <select style={{...T.sel,fontSize:13}} value={ev.type} onChange={e=>updEval(ev.id,"type",e.target.value)}>
                  {EVAL_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
                <input style={{...T.inp,fontSize:13}} type="date" value={ev.date||""} onChange={e=>updEval(ev.id,"date",e.target.value)}/>
              </div>
            </div>
          ))}
          <button style={{...T.btn(),width:"100%",marginTop:4,fontSize:14}} onClick={()=>setEvals(p=>[...p,{id:uid(),name:"",pct:"",type:"Examen",date:""}])}>+ Añadir evaluación</button>
        </div>
        <div style={{margin:"12px 0 16px",padding:"10px 12px",borderRadius:"var(--radius-sm)",background:pctOk?"#E1F5EE":pctSum>100?"#FCEBEB":"#FAEEDA"}}>
          <span style={{fontSize:13,color:pctOk?P.teal:pctSum>100?P.red:P.amber}}>
            Suma: <strong>{pctSum.toFixed(1)}%</strong>{pctOk?" ✓":pctSum>100?` — ${(pctSum-100).toFixed(1)}% de más`:`— faltan ${(100-pctSum).toFixed(1)}%`}
          </span>
        </div>
        <button style={{...T.btnP(col.main),borderRadius:"var(--radius)",fontSize:16,padding:"14px",opacity:valid?1:0.4}} onClick={handle} disabled={!valid}>Crear asignatura</button>
      </div>
    </div>
  );
}

/* ══════════════════ SIMULADOR ══════════════════ */
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
      <div style={{padding:"16px 18px 8px"}}>
        <button style={T.back} onClick={onBack}><Icon name="back" size={18} color={P.blue}/>Volver</button>
        <h1 style={{fontSize:17,fontWeight:700,marginTop:4}}>{sub.name}</h1>
        <div style={{fontSize:13,color:"var(--tx2)"}}>Simulador de notas</div>
      </div>
      <div style={{margin:"8px 18px 12px",padding:"16px",borderRadius:"var(--radius)",background:`${fc}12`,border:`0.5px solid ${fc}30`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:11,color:"var(--tx2)",marginBottom:4,fontWeight:500}}>NOTA FINAL SIMULADA</div>
          <div style={{fontSize:44,fontWeight:700,color:fc,lineHeight:1}}>{finalNote.toFixed(2)}</div>
          <div style={{fontSize:13,marginTop:6,color:finalNote>=passGrade?P.green:P.red,fontWeight:600}}>
            {finalNote>=passGrade?"✓ Aprobado":"✗ Suspenso"} · {finalNote>=passGrade?"+":""}{(finalNote-passGrade).toFixed(2)} respecto al aprobado
          </div>
        </div>
        <Donut value={finalNote} color={fc} size={80}/>
      </div>
      {sub.evals.length>0&&<><div style={T.sec}>Evaluaciones</div><div style={{padding:"0 18px 8px"}}><BarChart evals={sub.evals} simGrades={sg}/></div></>}
      <div style={T.sec}>Ajusta las notas</div>
      <div style={{padding:"0 18px"}}>
        {sub.evals.map(ev=>{
          const g=sg[ev.id],lk=locked[ev.id],gc=gradeColor(g);
          return(
            <div key={ev.id} style={{...T.card,marginBottom:8,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div><span style={{fontSize:14,fontWeight:600}}>{ev.name}</span><span style={{fontSize:12,color:"var(--tx2)",marginLeft:8}}>{parseFloat(ev.pct)}%</span>
                  {ev.grade!==""&&<span style={{...T.tag(P.blue),marginLeft:8,fontSize:10}}>real: {ev.grade}</span>}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"var(--tx2)"}}>+{(g*parseFloat(ev.pct)/100).toFixed(2)}</span>
                  <button onClick={()=>setLocked(p=>({...p,[ev.id]:!p[ev.id]}))} style={{background:lk?col.main+"20":"var(--bg2)",border:"none",borderRadius:8,cursor:"pointer",padding:"6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Icon name={lk?"lock":"unlock"} size={16} color={lk?col.main:"var(--tx2)"}/>
                  </button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <input type="range" min={0} max={10} step={0.1} value={g} disabled={lk} style={{flex:1,accentColor:gc,opacity:lk?0.4:1}} onChange={e=>setSg(p=>({...p,[ev.id]:parseFloat(e.target.value)}))}/>
                <div style={{width:36,textAlign:"center",fontSize:20,fontWeight:700,color:gc}}>{g.toFixed(1)}</div>
              </div>
              <div style={{height:4,borderRadius:2,marginTop:8,background:"var(--bg3)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${g*10}%`,background:gc,transition:"width .15s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={T.sec}>Calculadora de objetivo</div>
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Mi objetivo:</span>
          <input type="range" min={passGrade} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,accentColor:col.main}}/>
          <span style={{fontSize:20,fontWeight:700,color:col.main,minWidth:32}}>{target.toFixed(1)}</span>
        </div>
        {nt!==null?(
          <div style={{padding:"10px 12px",borderRadius:"var(--radius-sm)",background:riskColor(nt)+"15",borderLeft:`3px solid ${riskColor(nt)}`}}>
            {nt>10?<span style={{fontSize:13,color:P.red}}>No es posible llegar a {target}</span>
            :nt<=0?<span style={{fontSize:13,color:P.green}}>Ya alcanzas {target}</span>
            :<span style={{fontSize:13,color:riskColor(nt)}}>Necesitas un <strong>{nt.toFixed(2)}</strong> de media en las desbloqueadas</span>}
          </div>
        ):<div style={{fontSize:13,color:"var(--tx2)"}}>Desbloquea evaluaciones para calcular</div>}
      </div>
      <div style={T.sec}>Escenarios</div>
      <div style={{padding:"0 18px",display:"flex",flexWrap:"wrap",gap:8}}>
        {[5,7,9,10].map(v=><button key={v} style={T.btn()} onClick={()=>setAll(v)}>Todo a {v}</button>)}
        <button style={T.btn(P.coral)} onClick={reset}>Resetear</button>
      </div>
    </div>
  );
}

/* ══════════════════ VISTA ASIGNATURA ══════════════════ */
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
      <div style={{padding:"16px 18px 8px"}}>
        <button style={T.back} onClick={onBack}><Icon name="back" size={18} color={P.blue}/>Volver</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginTop:6}}>
          <div><h1 style={{fontSize:18,fontWeight:700,color:col.main,lineHeight:1.2}}>{sub.name}</h1><div style={{fontSize:13,color:"var(--tx2)",marginTop:3}}>{sub.credits} créditos ECTS</div></div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...T.btnP(col.main),width:"auto",padding:"8px 14px",fontSize:13}} onClick={onOpenSim}>Simulador</button>
            <button style={{...T.btn(P.red),padding:"8px 12px"}} onClick={()=>setConfirm(true)}>Eliminar</button>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"8px 18px 4px"}}>
        {[
          {label:"Nota actual",val:current!==null?current.toFixed(2):"—",c:current!==null?(current>=passGrade?P.teal:P.red):"var(--tx2)"},
          {label:"Puntos",val:weighted.toFixed(2),c:col.main},
          {label:"Evaluado",val:pctDone.toFixed(0)+"%",c:"var(--tx1)"},
          {label:"Pendiente",val:pctPending.toFixed(0)+"%",c:"var(--tx2)"},
        ].map(m=>(
          <div key={m.label} style={T.metric}><div style={{fontSize:10,color:"var(--tx2)",marginBottom:3,fontWeight:500}}>{m.label}</div><div style={{fontSize:16,fontWeight:700,color:m.c}}>{m.val}</div></div>
        ))}
      </div>
      {needed!==null&&pctPending>0&&(
        <div style={{margin:"8px 18px",padding:"10px 14px",borderRadius:"var(--radius-sm)",background:rc+"15",borderLeft:`3px solid ${rc}`}}>
          <span style={{fontSize:13,color:rc,fontWeight:600}}>
            {needed>10?"Imposible aprobar con las notas actuales":needed<=0?"Aprobado asegurado ✓":`Necesitas un ${needed.toFixed(2)} de media en lo pendiente`}
          </span>
        </div>
      )}
      {sub.evals.length>0&&<><div style={T.sec}>Notas</div><div style={{padding:"0 18px 8px"}}><BarChart evals={sub.evals}/></div></>}
      <div style={T.sec}>Evaluaciones</div>
      {!pctOk&&sub.evals.length>0&&<div style={{margin:"-4px 18px 8px",fontSize:12,color:pctSum>100?P.red:P.amber}}>Porcentajes: {pctSum.toFixed(1)}% (deben sumar 100%)</div>}
      <div style={{padding:"0 18px"}}>
        {sub.evals.map(ev=>(
          <div key={ev.id} style={{...T.card,padding:"12px",marginBottom:8}}>
            <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
              <input style={{...T.inp,flex:2,fontSize:14}} value={ev.name} onChange={e=>updateEval(ev.id,"name",e.target.value)}/>
              <input style={{...T.inp,width:64,textAlign:"center",flexShrink:0}} type="number" min={0.1} max={100} step={0.1} value={ev.pct} onChange={e=>updateEval(ev.id,"pct",e.target.value)}/>
              <input style={{...T.inp,width:72,textAlign:"center",flexShrink:0,borderColor:ev.grade!==""?(parseFloat(ev.grade)>=passGrade?P.teal+"80":P.red+"80"):"var(--bd2)"}}
                type="number" min={0} max={10} step={0.1} placeholder="—" value={ev.grade} onChange={e=>updateEval(ev.id,"grade",e.target.value)}/>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--tx2)",fontSize:22,padding:0,lineHeight:1,flexShrink:0}} onClick={()=>delEval(ev.id)}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <select style={{...T.sel,fontSize:13}} value={ev.type||"Examen"} onChange={e=>updateEval(ev.id,"type",e.target.value)}>
                {EVAL_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <input style={{...T.inp,fontSize:13}} type="date" value={ev.date||""} onChange={e=>updateEval(ev.id,"date",e.target.value)}/>
            </div>
          </div>
        ))}
        <button style={{...T.btn(),width:"100%",marginTop:4}} onClick={addEval}>+ Añadir evaluación</button>
      </div>
      <div style={T.sec}>¿Qué necesito para llegar a…?</div>
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--tx2)",minWidth:100}}>Quiero sacar:</span>
          <input type="range" min={passGrade} max={10} step={0.5} value={target} onChange={e=>setTarget(parseFloat(e.target.value))} style={{flex:1,accentColor:col.main}}/>
          <span style={{fontSize:20,fontWeight:700,color:col.main,minWidth:32}}>{target.toFixed(1)}</span>
        </div>
        {nt!==null?(
          <div style={{padding:"10px 12px",borderRadius:"var(--radius-sm)",background:riskColor(nt)+"15"}}>
            {nt>10?<span style={{fontSize:13,color:P.red}}>Ya no es posible llegar a {target.toFixed(1)}</span>
            :nt<=0?<span style={{fontSize:13,color:P.green}}>Ya alcanzas {target.toFixed(1)}</span>
            :<span style={{fontSize:13,color:riskColor(nt)}}>Necesitas un <strong>{nt.toFixed(2)}</strong> en lo que queda</span>}
          </div>
        ):<div style={{fontSize:13,color:"var(--tx2)"}}>Introduce notas para activar</div>}
      </div>
    </div>
  );
}

/* ══════════════════ VISTA CUATRIMESTRE ══════════════════ */
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
      {confirm&&<ConfirmDialog message={`¿Eliminar "${quarter.name}"? Se perderán todas sus asignaturas.`} onConfirm={onDelete} onCancel={()=>setConfirm(false)}/>}
      <div style={{padding:"16px 18px 8px"}}>
        <button style={T.back} onClick={onBack}><Icon name="back" size={18} color={P.blue}/>Inicio</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginTop:6}}>
          <div><h1 style={{fontSize:20,fontWeight:700,color:col.main}}>{quarter.name}</h1>{quarter.year&&<div style={{fontSize:13,color:"var(--tx2)",marginTop:2}}>{quarter.year}</div>}</div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...T.btnP(col.main),width:"auto",padding:"8px 14px",fontSize:13}} onClick={()=>setShowAdd(true)}>+ Asignatura</button>
            <button style={{...T.btn(P.red),padding:"8px 10px"}} onClick={()=>setConfirm(true)}>Eliminar</button>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"8px 18px 4px"}}>
        {[
          {label:"Media",val:quarterNote!==null?quarterNote.toFixed(2):"—",c:quarterNote!==null?(quarterNote>=passGrade?P.teal:P.red):P.gray},
          {label:"Créditos",val:`${approvedCr}/${totalCr}`,c:approvedCr>0?P.teal:P.gray},
          {label:"Asignaturas",val:quarter.subjects.length,c:col.main},
          {label:"Aprobadas",val:passed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={T.metric}><div style={{fontSize:10,color:"var(--tx2)",marginBottom:3,fontWeight:500}}>{m.label}</div><div style={{fontSize:16,fontWeight:700,color:m.c}}>{m.val}</div></div>
        ))}
      </div>
      <div style={T.sec}>Asignaturas</div>
      {quarter.subjects.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:36,marginBottom:10}}>📖</div>
          <div style={{fontWeight:700,marginBottom:6,fontSize:16}}>Sin asignaturas</div>
          <div style={{fontSize:14,color:"var(--tx2)",marginBottom:20}}>Añade las asignaturas de este cuatrimestre</div>
          <button style={{...T.btnP(col.main),width:"auto",display:"inline-block",padding:"12px 24px"}} onClick={()=>setShowAdd(true)}>+ Añadir asignatura</button>
        </div>
      )}
      <div style={{padding:"0 18px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
        {quarter.subjects.map((sub,i)=>{
          const{current,pctDone,pctPending,needed}=stats[i];
          const sc=getSC(sub.colorId),rc=riskColor(needed),rl=riskLabel(needed,pctPending);
          return(
            <div key={sub.id} onClick={()=>{setActiveSubId(sub.id);setSubView("subject");}}
              style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`3px solid ${sc.main}`,borderRadius:"var(--radius)",padding:"14px",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,minWidth:0,paddingRight:8}}>
                  <div style={{fontWeight:700,fontSize:13,color:sc.main,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.3}}>{sub.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",marginTop:4}}>{sub.credits} ECTS · {sub.evals.length} eval.</div>
                </div>
                <Donut value={current} color={current!==null?(current>=passGrade?P.teal:P.red):P.gray} size={46}/>
              </div>
              <div style={{height:4,borderRadius:2,background:"var(--bg3)",overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${pctDone}%`,background:sc.main,borderRadius:2,transition:"width .3s"}}/>
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

/* ══════════════════ HOME ══════════════════ */
function HomeView({quarters,onOpenQuarter,onAddQuarter,passGrade}){
  const qNotes=quarters.map(q=>calcQuarter(q.subjects,passGrade)).filter(n=>n!==null);
  const careerAvg=qNotes.length?qNotes.reduce((a,b)=>a+b,0)/qNotes.length:null;
  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const totalPassed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted>=passGrade;}).length;
  return(
    <div style={T.page}>
      <div style={{padding:"16px 18px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:600,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Mis cuatrimestres</span>
        <button style={{...T.btnP(P.purple),width:"auto",padding:"8px 14px",fontSize:13}} onClick={onAddQuarter}>+ Cuatrimestre</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"8px 18px 4px"}}>
        {[
          {label:"Media carrera",val:careerAvg!==null?careerAvg.toFixed(2):"—",c:careerAvg!==null?(careerAvg>=passGrade?P.teal:P.red):P.gray,big:true},
          {label:"Créditos",val:`${approvedCr}/${totalCr}`,c:approvedCr>0?P.teal:P.gray},
          {label:"Cuatrimestres",val:quarters.length,c:P.purple},
          {label:"Aprobadas",val:totalPassed,c:P.green},
        ].map(m=>(
          <div key={m.label} style={{...T.metric,minWidth:m.big?120:72}}>
            <div style={{fontSize:10,color:"var(--tx2)",marginBottom:3,fontWeight:500}}>{m.label}</div>
            <div style={{fontSize:m.big?24:18,fontWeight:700,color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>
      {quarters.filter(q=>calcQuarter(q.subjects,passGrade)!==null).length>1&&(
        <>
          <div style={T.sec}>Progresión</div>
          <div style={{padding:"0 18px 4px"}}>
            <svg viewBox={`0 0 ${Math.max(quarters.length*80+40,300)} 110`} width="100%" style={{overflow:"visible"}}>
              {[0,5,10].map(v=>{const y=90-(v/10)*70;return(<g key={v}><line x1={28} x2={quarters.length*80+8} y1={y} y2={y} stroke="var(--bd)" strokeWidth={0.5}/><text x={24} y={y+4} textAnchor="end" fontSize={9} fill="var(--tx2)">{v}</text></g>);})}
              <line x1={28} x2={quarters.length*80+8} y1={90-(5/10)*70} y2={90-(5/10)*70} stroke={P.teal} strokeWidth={1} strokeDasharray="4 3" opacity={0.6}/>
              {quarters.map((q,i)=>{
                const note=calcQuarter(q.subjects,passGrade);if(note===null)return null;
                const x=48+i*80,y=90-(note/10)*70,c=getQC(q.colorId).main;
                let px=null,py=null;for(let j=i-1;j>=0;j--){const pn=calcQuarter(quarters[j].subjects,passGrade);if(pn!==null){px=48+j*80;py=90-(pn/10)*70;break;}}
                return(<g key={q.id}>{px!==null&&<line x1={px} y1={py} x2={x} y2={y} stroke={c} strokeWidth={2} strokeOpacity={0.5}/>}<circle cx={x} cy={y} r={6} fill={c}/><text x={x} y={y-10} textAnchor="middle" fontSize={10} fontWeight={700} fill={c}>{note.toFixed(1)}</text><text x={x} y={104} textAnchor="middle" fontSize={9} fill="var(--tx2)">{q.name.slice(0,5)}</text></g>);
              })}
            </svg>
          </div>
        </>
      )}
      {quarters.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>🎓</div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Empieza aquí</div>
          <div style={{fontSize:14,color:"var(--tx2)",marginBottom:24}}>Crea tu primer cuatrimestre</div>
          <button style={{...T.btnP(),width:"auto",display:"inline-block",padding:"13px 28px",fontSize:16}} onClick={onAddQuarter}>+ Añadir cuatrimestre</button>
        </div>
      ):(
        <div style={{padding:"0 18px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10,paddingBottom:16}}>
          {quarters.map(q=>{
            const col=getQC(q.colorId),note=calcQuarter(q.subjects,passGrade),nc=gradeColor(note);
            const subStats=q.subjects.map(s=>calcSubject(s.evals,passGrade));
            const pct=q.subjects.length>0?(subStats.reduce((s,c)=>s+c.pctDone,0)/q.subjects.length):0;
            const{total:tc,approved:ac}=creditsInfo(q.subjects,passGrade);
            return(
              <div key={q.id} onClick={()=>onOpenQuarter(q.id)} style={{background:"var(--bg1)",border:"0.5px solid var(--bd)",borderTop:`4px solid ${col.main}`,borderRadius:"var(--radius)",padding:"14px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:16,color:col.main}}>{q.name}</div>
                    {q.year&&<div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{q.year}</div>}
                    <div style={{fontSize:12,color:"var(--tx2)",marginTop:4}}>{q.subjects.length} asignatura{q.subjects.length!==1?"s":""}</div>
                    <div style={{fontSize:12,color:ac>0?P.teal:P.gray,marginTop:2}}>{ac}/{tc} créditos</div>
                  </div>
                  <div style={{textAlign:"center"}}><Donut value={note} color={nc} size={56}/><div style={{fontSize:10,color:"var(--tx2)",marginTop:2}}>media</div></div>
                </div>
                <div style={{height:4,borderRadius:2,background:"var(--bg3)",overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${pct}%`,background:col.main,borderRadius:2}}/>
                </div>
                <div style={{fontSize:11,color:"var(--tx2)"}}>{pct.toFixed(0)}% evaluado</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ CALENDARIO VISUAL ══════════════════ */
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WDAYS=["L","M","X","J","V","S","D"];
const TYPE_COLOR={Examen:P.red,Parcial:P.coral,Final:P.red,Práctica:P.teal,Entrega:P.amber,Trabajo:P.blue,Presentación:P.purple,Otro:P.gray};

function CalendarView({quarters,passGrade}){
  const now=new Date();
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth());
  const [selectedDay,setSelectedDay]=useState(null);

  // Construir mapa de eventos por fecha
  const eventsByDate=useMemo(()=>{
    const map={};
    quarters.forEach(q=>q.subjects.forEach(s=>s.evals.forEach(e=>{
      if(e.date){
        if(!map[e.date]) map[e.date]=[];
        map[e.date].push({
          qName:q.name,subName:s.name,subColor:getSC(s.colorId).main,
          evalName:e.name,type:e.type||"Examen",pct:e.pct,
          grade:e.grade,days:daysUntil(e.date),
          typeColor:TYPE_COLOR[e.type||"Examen"]||P.gray,
        });
      }
    })));
    return map;
  },[quarters]);

  // Días del mes
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const firstDow=(new Date(viewYear,viewMonth,1).getDay()+6)%7; // 0=Mon
  const todayStr=today();

  function prevMonth(){
    if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}
    else setViewMonth(m=>m-1);
    setSelectedDay(null);
  }
  function nextMonth(){
    if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}
    else setViewMonth(m=>m+1);
    setSelectedDay(null);
  }
  function padZ(n){return String(n).padStart(2,"0");}
  function dateStr(d){return `${viewYear}-${padZ(viewMonth+1)}-${padZ(d)}`;}

  const selectedEvents=selectedDay?eventsByDate[dateStr(selectedDay)]||[]:[];

  // Total events this month for header
  const monthEvents=Object.entries(eventsByDate).filter(([d])=>d.startsWith(`${viewYear}-${padZ(viewMonth+1)}`));
  const totalMonth=monthEvents.reduce((s,[,evs])=>s+evs.length,0);

  // Ancho del grid: se calcula una sola vez y no cambia al seleccionar día
  const GRID_COLS = "repeat(7,1fr)";

  return(
    <div style={{...T.page, overflowX:"hidden", width:"100%"}}>

      {/* Header */}
      <div style={{padding:"16px 18px 8px"}}>
        <h1 style={{fontSize:20,fontWeight:700}}>Calendario</h1>
        <div style={{fontSize:13,color:"var(--tx2)",marginTop:2}}>
          {totalMonth>0?`${totalMonth} evento${totalMonth!==1?"s":""} este mes`:"Sin eventos este mes"}
        </div>
      </div>

      {/* Nav mes */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px 12px"}}>
        <button onClick={prevMonth} style={{background:"var(--bg2)",border:"none",borderRadius:"var(--radius-sm)",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="back" size={18} color="var(--tx1)"/>
        </button>
        <span style={{fontSize:17,fontWeight:700,letterSpacing:"-0.2px"}}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{background:"var(--bg2)",border:"none",borderRadius:"var(--radius-sm)",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="chevron" size={18} color="var(--tx1)"/>
        </button>
      </div>

      {/* Bloque calendario con tamaño estable — no se ve afectado por el panel de abajo */}
      <div style={{display:"block",width:"100%",paddingLeft:12,paddingRight:12,boxSizing:"border-box"}}>
        {/* Cabecera días */}
        <div style={{display:"grid",gridTemplateColumns:GRID_COLS,width:"100%",marginBottom:4}}>
          {WDAYS.map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:"var(--tx2)",padding:"4px 0",letterSpacing:"0.05em"}}>{d}</div>
          ))}
        </div>
        {/* Celdas — altura mínima fija para que el grid nunca cambie de tamaño */}
        <div style={{display:"grid",gridTemplateColumns:GRID_COLS,gap:2,width:"100%"}}>
          {Array.from({length:firstDow}).map((_,i)=>(
            <div key={`e${i}`} style={{minHeight:50}}/>
          ))}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const d=i+1;
            const ds=dateStr(d);
            const evs=eventsByDate[ds]||[];
            const isToday=ds===todayStr;
            const isSel=selectedDay===d;
            const isPast=new Date(ds)<new Date(todayStr);
            const dots=evs.slice(0,3);
            return(
              <button key={d}
                onClick={()=>setSelectedDay(isSel?null:d)}
                style={{
                  background:isSel?P.purple:isToday?P.purple+"18":"transparent",
                  border:isToday&&!isSel?`1.5px solid ${P.purple}`:"1.5px solid transparent",
                  borderRadius:10,
                  padding:"6px 2px 5px",
                  cursor:"pointer",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  justifyContent:"flex-start",
                  gap:3,
                  minHeight:50,
                  width:"100%",
                  boxSizing:"border-box",
                  transition:"background .12s",
                }}>
                <span style={{fontSize:14,fontWeight:isToday||isSel?700:400,color:isSel?"#fff":isToday?P.purple:isPast?"var(--tx2)":"var(--tx1)",lineHeight:1.2}}>{d}</span>
                <div style={{display:"flex",gap:2,justifyContent:"center",height:6,flexWrap:"nowrap"}}>
                  {dots.map((ev,j)=>(
                    <div key={j} style={{width:5,height:5,borderRadius:"50%",flexShrink:0,background:isSel?"rgba(255,255,255,0.8)":ev.typeColor}}/>
                  ))}
                  {evs.length>3&&<div style={{width:5,height:5,borderRadius:"50%",flexShrink:0,background:"var(--tx2)",opacity:0.5}}/>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Separador */}
      <div style={{height:1,background:"var(--bd)",margin:"16px 18px 0"}}/>

      {/* Panel del día seleccionado — completamente fuera del grid */}
      {selectedDay?(
        <div style={{padding:"14px 18px 0"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>
            {WDAYS[(new Date(viewYear,viewMonth,selectedDay).getDay()+6)%7]} · {selectedDay} {MONTHS[viewMonth]}
          </div>
          {selectedEvents.length===0?(
            <div style={{...T.card,textAlign:"center",padding:"24px 16px",color:"var(--tx2)",fontSize:14}}>
              Sin eventos este día
            </div>
          ):(
            selectedEvents.map((ev,i)=>{
              const uc=urgencyColor(ev.days);
              return(
                <div key={i} style={{...T.card,padding:"13px 14px",marginBottom:8,borderLeft:`3px solid ${ev.typeColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:ev.subColor,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.subName}</div>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{ev.evalName}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span style={T.tag(ev.typeColor)}>{ev.type}</span>
                        <span style={T.tag(P.gray)}>{ev.pct}%</span>
                        {ev.grade!==""&&<span style={T.tag(gradeColor(parseFloat(ev.grade)))}>{parseFloat(ev.grade).toFixed(1)}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {ev.days===0?<div style={{fontSize:13,fontWeight:700,color:P.red}}>¡Hoy!</div>
                      :ev.days>0?<div style={{fontSize:13,fontWeight:700,color:uc}}>en {ev.days}d</div>
                      :<div style={{fontSize:12,color:"var(--tx2)"}}>hace {Math.abs(ev.days)}d</div>}
                      {ev.grade===""&&ev.days!==null&&ev.days>0&&<div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>Pendiente</div>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ):(
        /* Lista próximos eventos cuando no hay día seleccionado */
        (()=>{
          const upcoming=Object.entries(eventsByDate)
            .flatMap(([date,evs])=>evs.map(ev=>({...ev,date})))
            .filter(ev=>ev.days!==null&&ev.days>=0)
            .sort((a,b)=>a.days-b.days)
            .slice(0,5);
          if(upcoming.length===0) return(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>📅</div>
              <div style={{fontWeight:700,marginBottom:6}}>Sin eventos próximos</div>
              <div style={{fontSize:13,color:"var(--tx2)"}}>Añade fechas en las evaluaciones de cada asignatura</div>
            </div>
          );
          return(
            <>
              <div style={T.sec}>Próximos eventos</div>
              <div style={{padding:"0 18px"}}>
                {upcoming.map((ev,i)=>(
                  <div key={i}
                    style={{...T.card,display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:8,cursor:"pointer"}}
                    onClick={()=>{
                      const evDate=new Date(ev.date);
                      setViewYear(evDate.getFullYear());
                      setViewMonth(evDate.getMonth());
                      setSelectedDay(evDate.getDate());
                    }}>
                    <div style={{width:40,height:40,borderRadius:10,background:ev.typeColor+"18",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{fontSize:9,fontWeight:700,color:ev.typeColor,textTransform:"uppercase",letterSpacing:"0.05em"}}>{MONTHS[new Date(ev.date).getMonth()].slice(0,3)}</div>
                      <div style={{fontSize:16,fontWeight:700,color:ev.typeColor,lineHeight:1}}>{new Date(ev.date).getDate()}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.subName}</div>
                      <div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{ev.evalName} · {ev.type}</div>
                    </div>
                    <div style={{flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:urgencyColor(ev.days)}}>{ev.days===0?"Hoy":`${ev.days}d`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

/* ══════════════════ ESTADÍSTICAS ══════════════════ */
function StatsView({quarters,settings,passGrade}){
  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const totalCareer=settings.totalCredits||240;
  const subGrades=allSubs.map(s=>{const c=calcSubject(s.evals,passGrade);return{name:s.name,grade:c.current};}).filter(s=>s.grade!==null);
  const sorted=[...subGrades].sort((a,b)=>b.grade-a.grade);
  const best=sorted.slice(0,3);
  const worst=[...subGrades].sort((a,b)=>a.grade-b.grade).slice(0,3);
  const passed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted>=passGrade;}).length;
  const failed=allSubs.filter(s=>{const c=calcSubject(s.evals,passGrade);return c.pctPending===0&&c.weighted<passGrade;}).length;
  const ranges=[{label:"9–10",min:9,max:10.01,color:P.green},{label:"7–9",min:7,max:9,color:P.teal},{label:"5–7",min:5,max:7,color:P.amber},{label:"<5",min:0,max:5,color:P.red}];
  const dist=ranges.map(r=>({...r,count:subGrades.filter(s=>s.grade>=r.min&&s.grade<r.max).length}));
  const maxDist=Math.max(...dist.map(d=>d.count),1);
  return(
    <div style={T.page}>
      <div style={{padding:"16px 18px 8px"}}><h1 style={{fontSize:20,fontWeight:700}}>Estadísticas</h1><div style={{fontSize:13,color:"var(--tx2)",marginTop:2}}>Rendimiento académico</div></div>
      <div style={T.sec}>Progreso de créditos</div>
      <div style={{...T.card,margin:"0 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:700}}>{approvedCr} / {totalCareer} ECTS</span>
          <span style={{fontSize:14,color:P.teal,fontWeight:700}}>{((approvedCr/totalCareer)*100).toFixed(1)}%</span>
        </div>
        <div style={{height:12,borderRadius:6,background:"var(--bg3)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min((approvedCr/totalCareer)*100,100)}%`,background:P.teal,borderRadius:6,transition:"width .4s"}}/>
        </div>
      </div>
      <div style={T.sec}>Resumen</div>
      <div style={{display:"flex",gap:8,padding:"0 18px"}}>
        {[{label:"Aprobadas",val:passed,c:P.green},{label:"Suspendidas",val:failed,c:P.red},{label:"En curso",val:allSubs.length-passed-failed,c:P.amber},{label:"Total",val:allSubs.length,c:P.purple}].map(m=>(
          <div key={m.label} style={{...T.metric,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:m.c}}>{m.val}</div>
            <div style={{fontSize:10,color:"var(--tx2)",marginTop:2,fontWeight:500}}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={T.sec}>Distribución de notas</div>
      <div style={{...T.card,margin:"0 18px"}}>
        {dist.map(d=>(
          <div key={d.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:12,color:"var(--tx2)",minWidth:32,fontWeight:500}}>{d.label}</span>
            <div style={{flex:1,background:"var(--bg3)",borderRadius:4,height:16,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(d.count/maxDist)*100}%`,background:d.color,borderRadius:4}}/>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:d.color,minWidth:20,textAlign:"right"}}>{d.count}</span>
          </div>
        ))}
      </div>
      {quarters.length>0&&<><div style={T.sec}>Media por cuatrimestre</div><div style={{...T.card,margin:"0 18px"}}>{quarters.map(q=>{const note=calcQuarter(q.subjects,passGrade);const col=getQC(q.colorId).main;if(note===null)return null;return(<div key={q.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:12,color:col,fontWeight:700,minWidth:32}}>{q.name}</span><div style={{flex:1,background:"var(--bg3)",borderRadius:4,height:16,overflow:"hidden"}}><div style={{height:"100%",width:`${(note/10)*100}%`,background:col,borderRadius:4}}/></div><span style={{fontSize:13,fontWeight:700,color:gradeColor(note),minWidth:30,textAlign:"right"}}>{note.toFixed(2)}</span></div>);})}</div></>}
      {best.length>0&&<><div style={T.sec}>Mejores asignaturas</div><div style={{padding:"0 18px"}}>{best.map((s,i)=><div key={i} style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",marginBottom:8}}><div style={{fontSize:13,fontWeight:500,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div><span style={{fontSize:16,fontWeight:700,color:gradeColor(s.grade),marginLeft:12}}>{s.grade.toFixed(2)}</span></div>)}</div></>}
      {worst.length>0&&<><div style={T.sec}>Más bajas</div><div style={{padding:"0 18px"}}>{worst.map((s,i)=><div key={i} style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",marginBottom:8}}><div style={{fontSize:13,fontWeight:500,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div><span style={{fontSize:16,fontWeight:700,color:gradeColor(s.grade),marginLeft:12}}>{s.grade.toFixed(2)}</span></div>)}</div></>}
    </div>
  );
}

/* ══════════════════ PLAN IA ══════════════════ */
function PlanIAView({quarters,settings,passGrade,onReset}){
  const [confirmReset,setConfirmReset]=useState(false);
  const [pdfSel,setPdfSel]=useState({});
  const [section,setSection]=useState("ia");
  // Fix overflow: contenedor con overflow hidden
  const wrapStyle={width:"100%",maxWidth:"100%",overflowX:"hidden",boxSizing:"border-box"};

  const allSubs=quarters.flatMap(q=>q.subjects);
  const{total:totalCr,approved:approvedCr}=creditsInfo(allSubs,passGrade);
  const careerNotes=quarters.map(q=>calcQuarter(q.subjects,passGrade)).filter(n=>n!==null);
  const careerAvg=careerNotes.length?careerNotes.reduce((a,b)=>a+b,0)/careerNotes.length:null;

  const validForIA=useMemo(()=>{
    const res=[];
    quarters.forEach(q=>q.subjects.forEach(s=>{
      const futureEvals=s.evals.filter(e=>e.date&&e.grade===""&&daysUntil(e.date)>=0);
      const{current,needed}=calcSubject(s.evals,passGrade);
      const minDays=futureEvals.length>0?Math.min(...futureEvals.map(e=>daysUntil(e.date))):null;
      res.push({sub:s,qName:q.name,futureEvals,minDays,current,needed,valid:futureEvals.length>0});
    }));
    return res.sort((a,b)=>(a.minDays??9999)-(b.minDays??9999));
  },[quarters,passGrade]);

  function toggleSel(id){setPdfSel(p=>({...p,[id]:!p[id]}));}

  function exportJSON(){
    const data={quarters,settings,exportDate:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="notas_backup.json";a.click();
  }
  function importJSON(){
    const input=document.createElement("input");input.type="file";input.accept=".json";
    input.onchange=e=>{
      const file=e.target.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(data.quarters){localStorage.setItem("calc_notas_v5",JSON.stringify(data.quarters));window.location.reload();}else alert("Archivo no válido");}catch{alert("Error al leer el archivo");}};
      reader.readAsText(file);
    };
    input.click();
  }

  function printSummary(){
    const lines=[];
    lines.push("RESUMEN ACADÉMICO");
    lines.push(`Estudiante: ${settings.studentName||"—"}`);
    lines.push(`Fecha: ${new Date().toLocaleDateString("es-ES")}`);
    lines.push(`Media de carrera: ${careerAvg!==null?careerAvg.toFixed(2):"—"}`);
    lines.push(`Créditos: ${approvedCr} / ${settings.totalCredits||240}`);
    lines.push("─".repeat(40));
    quarters.forEach(q=>{
      const note=calcQuarter(q.subjects,passGrade);
      lines.push(`\n${q.name}${q.year?" ("+q.year+")":""} — Media: ${note!==null?note.toFixed(2):"Sin notas"}`);
      q.subjects.forEach(s=>{
        const{current,pctDone,pctPending,needed}=calcSubject(s.evals,passGrade);
        lines.push(`  ${s.name} (${s.credits} ECTS)`);
        lines.push(`    Nota: ${current!==null?current.toFixed(2):"—"} | ${pctDone.toFixed(0)}% evaluado`);
        if(needed!==null&&pctPending>0) lines.push(`    Necesita: ${needed>10?"Imposible":needed<=0?"Ya aprobado":needed.toFixed(2)}`);
        s.evals.forEach(e=>lines.push(`    · ${e.name}: ${e.grade||"pendiente"} (${e.pct}%)`));
      });
    });
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>Resumen</title><style>body{font-family:monospace;white-space:pre;padding:24px;font-size:13px;line-height:1.6;}</style></head><body>${lines.join("\n")}</body></html>`);
    win.document.close();win.print();
  }

  function printIA(){
    const selected=validForIA.filter(item=>item.valid&&pdfSel[item.sub.id]);
    if(selected.length===0){alert("Selecciona al menos una asignatura válida");return;}
    const prompt=`Eres un asistente experto en planificación académica universitaria. Tu objetivo es crear un plan de estudio realista, eficiente y adaptado a la situación del estudiante usando la información proporcionada a continuación.

Analiza cuidadosamente cada asignatura teniendo en cuenta la fecha del examen o entrega, el tiempo disponible hasta esa fecha, la nota actual del estudiante, el peso de las evaluaciones pendientes, el nivel de riesgo y la carga global de trabajo entre asignaturas.

A partir de esto, genera un plan de estudio organizado por días desde hoy hasta el último examen o entrega. Indica qué asignatura estudiar cada día, durante cuánto tiempo y con qué prioridad.

Prioriza las asignaturas con fecha más cercana, mayor riesgo de suspenso y mayor peso pendiente. El plan debe ser realista, no superar una carga razonable de estudio diaria, incluir descansos, combinar asignaturas cuando sea útil para evitar fatiga mental y reservar momentos de repaso antes de cada examen.

Resume al inicio la estrategia general, señala los riesgos principales y, si detectas que no es posible llegar a todo, indica qué debería priorizarse. El resultado debe ser claro, estructurado y fácil de seguir.`;
    const lines=[];
    lines.push("════════════════════════════════════");
    lines.push("INSTRUCCIONES PARA LA IA");
    lines.push("════════════════════════════════════");
    lines.push(prompt);
    lines.push("\n════════════════════════════════════");
    lines.push("DATOS DEL ESTUDIANTE");
    lines.push("════════════════════════════════════");
    lines.push(`Nombre: ${settings.studentName||"—"}`);
    lines.push(`Fecha actual: ${new Date().toLocaleDateString("es-ES")}`);
    lines.push(`Nota mínima de aprobado: ${passGrade}`);
    lines.push("\n════════════════════════════════════");
    lines.push("ASIGNATURAS");
    lines.push("════════════════════════════════════");
    selected.forEach(item=>{
      const{sub,qName,futureEvals,current,needed}=item;
      lines.push(`\n▸ ${sub.name} (${qName})`);
      lines.push(`  Nota actual: ${current!==null?current.toFixed(2):"Sin notas"}`);
      lines.push(`  Para aprobar necesita: ${needed!==null?(needed<=0?"Ya aprobado":needed>10?"Imposible":needed.toFixed(2)):"—"}`);
      lines.push(`  Nivel de riesgo: ${riskLevel(needed)}`);
      lines.push(`  Créditos: ${sub.credits} ECTS`);
      lines.push(`  Realizadas: ${sub.evals.filter(e=>e.grade!=="").map(e=>`${e.name} (${e.grade}, ${e.pct}%)`).join(", ")||"Ninguna"}`);
      lines.push(`  Pendientes con fecha:`);
      futureEvals.forEach(e=>lines.push(`    ◉ ${e.name} — ${e.date} (en ${daysUntil(e.date)} días) — ${e.pct}%`));
      sub.evals.filter(e=>e.grade===""&&(!e.date||daysUntil(e.date)<0)).forEach(e=>lines.push(`    ○ ${e.name} — sin fecha — ${e.pct}%`));
    });
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>Plan IA</title><style>body{font-family:monospace;white-space:pre;padding:24px;font-size:12px;line-height:1.7;}</style></head><body>${lines.join("\n")}</body></html>`);
    win.document.close();win.print();
  }

  return(
    <div style={{...T.page,...wrapStyle}}>
      {confirmReset&&<ConfirmDialog message="¿Resetear TODOS los datos? Esta acción no se puede deshacer." onConfirm={onReset} onCancel={()=>setConfirmReset(false)}/>}

      <div style={{padding:"16px 18px 8px"}}>
        <h1 style={{fontSize:20,fontWeight:700}}>Plan IA</h1>
        <div style={{fontSize:13,color:"var(--tx2)",marginTop:2}}>Exportar y gestionar datos</div>
      </div>

      {/* Tabs — scroll horizontal propio, no desborda */}
      <div style={{padding:"8px 18px 0",marginBottom:4}}>
        <div style={{display:"flex",gap:0,width:"100%"}}>
          {[{id:"ia",label:"PDF para IA"},{id:"summary",label:"Resumen"},{id:"backup",label:"Backup"}].map((t,i,arr)=>(
            <button key={t.id} onClick={()=>setSection(t.id)}
              style={{flex:1,minWidth:0,background:section===t.id?"var(--tx1)":"var(--bg2)",color:section===t.id?"var(--bg1)":"var(--tx2)",border:"0.5px solid var(--bd2)",
                borderRadius:i===0?"var(--radius-sm) 0 0 var(--radius-sm)":i===arr.length-1?"0 var(--radius-sm) var(--radius-sm) 0":"0",
                padding:"9px 4px",fontSize:13,cursor:"pointer",fontWeight:section===t.id?700:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* PDF IA */}
      {section==="ia"&&(
        <div style={{padding:"8px 18px 0"}}>
          <div style={{...T.card,background:P.purple+"12",border:`0.5px solid ${P.purple}30`,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:P.purple}}>🤖 Crear plan de estudio con IA</div>
            <div style={{fontSize:13,color:"var(--tx2)",lineHeight:1.6}}>
              Genera un documento optimizado para <strong>ChatGPT o Claude</strong>. Incluirá notas, riesgo, fechas y evaluaciones pendientes.
            </div>
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
              {["📊 Notas","⚠️ Riesgo","📅 Fechas","⏱ Días","🎯 Pendientes"].map(tag=>(
                <span key={tag} style={{fontSize:12,background:"var(--bg1)",border:"0.5px solid var(--bd)",borderRadius:20,padding:"3px 9px",color:"var(--tx2)",whiteSpace:"nowrap"}}>{tag}</span>
              ))}
            </div>
          </div>

          <div style={{fontSize:11,color:"var(--tx2)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,marginTop:14}}>Selecciona asignaturas</div>

          {validForIA.length===0&&(
            <div style={{...T.card,textAlign:"center",padding:"28px 16px",color:"var(--tx2)",fontSize:14}}>
              Añade fechas a las evaluaciones para poder seleccionarlas
            </div>
          )}

          {validForIA.map(item=>{
            const{sub,qName,minDays,valid}=item;
            const sel=pdfSel[sub.id]||false;
            return(
              <div key={sub.id} onClick={()=>valid&&toggleSel(sub.id)}
                style={{background:"var(--bg1)",border:`0.5px solid ${sel?P.purple:"var(--bd)"}`,borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:8,
                  display:"flex",alignItems:"center",gap:10,opacity:valid?1:0.4,cursor:valid?"pointer":"not-allowed",
                  background:sel?P.purple+"0a":"var(--bg1)"}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${sel?P.purple:"var(--bd2)"}`,
                  background:sel?P.purple:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {sel&&<span style={{color:"#fff",fontSize:13,lineHeight:1}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{qName}</div>
                </div>
                <div style={{flexShrink:0}}>
                  {valid
                    ?<span style={T.tag(urgencyColor(minDays))}>{minDays}d</span>
                    :<span style={T.tag(P.gray)}>sin fechas</span>}
                </div>
              </div>
            );
          })}

          <button style={{...T.btnP(P.purple),borderRadius:"var(--radius)",fontSize:15,padding:"14px",marginTop:8,marginBottom:4}}
            onClick={printIA}>
            🤖 Generar PDF para IA
          </button>
        </div>
      )}

      {/* Resumen */}
      {section==="summary"&&(
        <div style={{padding:"8px 18px 0"}}>
          <div style={T.card}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>📄 Resumen académico</div>
            <div style={{fontSize:13,color:"var(--tx2)",lineHeight:1.6,marginBottom:14}}>Documento imprimible con todos tus cuatrimestres, asignaturas y notas.</div>
            <div style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {l:"Estudiante",v:settings.studentName||"—"},
                  {l:"Media",v:careerAvg!==null?careerAvg.toFixed(2):"—"},
                  {l:"Créditos",v:`${approvedCr}/${settings.totalCredits||240}`},
                  {l:"Cuatrimestres",v:quarters.length},
                ].map(r=>(
                  <div key={r.l}>
                    <div style={{fontSize:11,color:"var(--tx2)",fontWeight:500}}>{r.l}</div>
                    <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <button style={{...T.btnP(),borderRadius:"var(--radius)",padding:"13px"}} onClick={printSummary}>🖨️ Imprimir resumen</button>
          </div>
        </div>
      )}

      {/* Backup */}
      {section==="backup"&&(
        <div style={{padding:"8px 18px 0"}}>
          <div style={{...T.card,marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>💾 Exportar copia de seguridad</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:12}}>Descarga todos tus datos en formato JSON.</div>
            <button style={{...T.btnP(P.teal),borderRadius:"var(--radius)",padding:"12px"}} onClick={exportJSON}>Exportar JSON</button>
          </div>
          <div style={{...T.card,marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>📂 Importar copia de seguridad</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:12}}>Restaura desde un JSON anterior.</div>
            <button style={{...T.btnP(P.amber),borderRadius:"var(--radius)",padding:"12px"}} onClick={importJSON}>Importar JSON</button>
          </div>
          <div style={{...T.card,border:`0.5px solid ${P.red}30`}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:P.red}}>⚠️ Resetear todos los datos</div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:12}}>Elimina todo. No se puede deshacer.</div>
            <button style={{...T.btn(P.red),width:"100%",padding:"12px",fontSize:14}} onClick={()=>setConfirmReset(true)}>Resetear todo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ AJUSTES ══════════════════ */
function SettingsView({settings,onUpdate,darkMode,onToggleDark}){
  const [s,setS]=useState(settings);
  function upd(k,v){const n={...s,[k]:v};setS(n);onUpdate(n);}
  return(
    <div style={T.page}>
      <div style={{padding:"16px 18px 8px"}}><h1 style={{fontSize:20,fontWeight:700}}>Ajustes</h1><div style={{fontSize:13,color:"var(--tx2)",marginTop:2}}>Preferencias personales</div></div>
      <div style={T.sec}>Perfil</div>
      <div style={{padding:"0 18px"}}>
        <div style={T.card}>
          <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Nombre del estudiante</label>
          <input style={{...T.inp,marginTop:8}} placeholder="Tu nombre completo" value={s.studentName||""} onChange={e=>upd("studentName",e.target.value)}/>
        </div>
      </div>
      <div style={T.sec}>Académico</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,marginBottom:10}}>
          <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Total de créditos de la carrera</label>
          <input style={{...T.inp,marginTop:8}} type="number" min={30} max={500} step={1} placeholder="240" value={s.totalCredits||""} onChange={e=>upd("totalCredits",parseInt(e.target.value)||240)}/>
          <div style={{fontSize:12,color:"var(--tx2)",marginTop:6}}>Usado para el progreso en Estadísticas</div>
        </div>
        <div style={T.card}>
          <label style={{fontSize:13,color:"var(--tx2)",fontWeight:500}}>Nota mínima de aprobado</label>
          <input style={{...T.inp,marginTop:8}} type="number" min={1} max={9} step={0.5} placeholder="5" value={s.passGrade||""} onChange={e=>upd("passGrade",parseFloat(e.target.value)||5)}/>
          <div style={{fontSize:12,color:"var(--tx2)",marginTop:6}}>Afecta a todos los cálculos de la app</div>
        </div>
      </div>
      <div style={T.sec}>Apariencia</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:600}}>Modo oscuro</div><div style={{fontSize:12,color:"var(--tx2)",marginTop:2}}>{darkMode?"Activado":"Desactivado"}</div></div>
          <button onClick={onToggleDark} style={{background:darkMode?P.purple:"var(--bg3)",border:"none",borderRadius:30,padding:"3px",cursor:"pointer",width:50,height:28,position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:darkMode?25:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </button>
        </div>
      </div>
      <div style={T.sec}>Información</div>
      <div style={{padding:"0 18px"}}>
        <div style={{...T.card,fontSize:13,color:"var(--tx2)"}}>
          <div style={{marginBottom:4,fontWeight:500}}>Calculadora de notas UPC · v7</div>
          <div>Datos guardados localmente en tu dispositivo</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ NAVBAR ══════════════════ */
function NavBar({active,onChange}){
  const items=[
    {id:"home",label:"Inicio"},
    {id:"calendar",label:"Calendario"},
    {id:"stats",label:"Estadísticas"},
    {id:"plan",label:"Plan IA"},
    {id:"settings",label:"Ajustes"},
  ];
  const icons={
    home:(c)=><svg width={22} height={22} viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth={active==="home"?2:1.5} fill={active==="home"?c+"22":"none"} strokeLinejoin="round"/><path d="M9 21V12h6v9" stroke={c} strokeWidth={1.6} strokeLinecap="round"/></svg>,
    calendar:(c)=><svg width={22} height={22} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke={c} strokeWidth={1.6} fill={active==="calendar"?c+"15":"none"}/><path d="M3 9h18M8 2v4M16 2v4" stroke={c} strokeWidth={1.6} strokeLinecap="round"/><circle cx="8" cy="14" r="1.2" fill={c}/><circle cx="12" cy="14" r="1.2" fill={c}/></svg>,
    stats:(c)=><svg width={22} height={22} viewBox="0 0 24 24" fill="none"><path d="M4 20V14M9 20V8M14 20V12M19 20V4" stroke={c} strokeWidth={active==="stats"?2.2:1.6} strokeLinecap="round"/></svg>,
    plan:(c)=><svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.6} fill={active==="plan"?c+"15":"none"}/><path d="M8 12h8M12 8v8" stroke={c} strokeWidth={1.8} strokeLinecap="round"/></svg>,
    settings:(c)=><svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={3} stroke={c} strokeWidth={1.6}/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={c} strokeWidth={1.5} strokeLinecap="round"/></svg>,
  };
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--bg1)",borderTop:"0.5px solid var(--bd)",display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {items.map(it=>{
        const isActive=active===it.id;
        const col=isActive?P.purple:"var(--tx2)";
        return(
          <button key={it.id} onClick={()=>onChange(it.id)}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 2px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:34,height:26,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:isActive?P.purple+"18":"transparent",transition:"background .15s"}}>
              {icons[it.id](col)}
            </div>
            <span style={{fontSize:9,color:col,fontWeight:isActive?700:400,letterSpacing:"0.01em",lineHeight:1}}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════ ROOT ══════════════════ */
const DEFAULT_SETTINGS={studentName:"",totalCredits:240,passGrade:5};

export default function App(){
  const [quarters,setQuarters]=useState(null);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [tab,setTab]=useState("home");
  const [darkMode,setDarkMode]=useState(false);
  const [activeQId,setActiveQId]=useState(null);
  const [showAddQ,setShowAddQ]=useState(false);
  const [bellOpen,setBellOpen]=useState(false);
  const [onboarded,setOnboarded]=useState(null); // null=loading

  useEffect(()=>{
    const sty=document.createElement("style");sty.textContent=CSS;document.head.appendChild(sty);
    let meta=document.querySelector('meta[name="viewport"]');
    if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
    meta.content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no";
    return()=>document.head.removeChild(sty);
  },[]);

  useEffect(()=>{
    document.body.classList.toggle("dark",darkMode);
  },[darkMode]);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("calc_notas_v5");
      setQuarters(raw?JSON.parse(raw):makeDefaultQuarters());
      const rawS=localStorage.getItem("calc_settings");
      const s=rawS?JSON.parse(rawS):DEFAULT_SETTINGS;
      setSettings(s);
      const dm=localStorage.getItem("calc_dark");
      if(dm) setDarkMode(dm==="1");
      // Onboarding: si ya tiene nombre guardado, skip
      const hasName=s.studentName&&s.studentName.trim().length>0;
      setOnboarded(hasName);
    }catch{
      setQuarters(makeDefaultQuarters());
      setOnboarded(false);
    }
  },[]);

  const save=useCallback(d=>{try{localStorage.setItem("calc_notas_v5",JSON.stringify(d));}catch{}},[]);
  const saveSettings=useCallback(s=>{try{localStorage.setItem("calc_settings",JSON.stringify(s));}catch{}},[]);
  const upd=fn=>setQuarters(p=>{const n=fn(p);save(n);return n;});

  function handleSettingsUpdate(s){setSettings(s);saveSettings(s);}
  function handleToggleDark(){setDarkMode(p=>{const n=!p;localStorage.setItem("calc_dark",n?"1":"0");return n;});}
  function handleReset(){localStorage.removeItem("calc_notas_v5");setQuarters(makeDefaultQuarters());setTab("home");}
  function handleOnboardingDone(name){
    const ns={...DEFAULT_SETTINGS,studentName:name};
    setSettings(ns);saveSettings(ns);setOnboarded(true);
  }

  const passGrade=settings.passGrade||PASS_DEFAULT;
  const activeQ=quarters?.find(q=>q.id===activeQId);

  // Loading
  if(onboarded===null||quarters===null){
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--tx2)",fontFamily:"sans-serif",background:"var(--bg0)"}}>Cargando…</div>;
  }
  // Onboarding
  if(!onboarded){
    return <OnboardingScreen onDone={handleOnboardingDone}/>;
  }

  const showHeader=!activeQId||(tab!=="home");

  return(
    <>
      {showAddQ&&<AddQuarterModal onAdd={q=>{upd(p=>[...p,q]);setShowAddQ(false);}} onClose={()=>setShowAddQ(false)}/>}
      {bellOpen&&<div style={{position:"fixed",inset:0,zIndex:89}} onClick={()=>setBellOpen(false)}/>}

      {/* Header solo en vistas principales */}
      {showHeader&&(
        <AppHeader quarters={quarters} settings={settings} passGrade={passGrade}
          bellOpen={bellOpen} onBellClick={()=>setBellOpen(p=>!p)} onCloseBell={()=>setBellOpen(false)}/>
      )}

      {/* Contenido */}
      {tab==="home"&&!activeQId&&(
        <HomeView quarters={quarters} onOpenQuarter={id=>{setActiveQId(id);}} onAddQuarter={()=>setShowAddQ(true)} passGrade={passGrade}/>
      )}
      {tab==="home"&&activeQId&&activeQ&&(
        <QuarterView quarter={activeQ}
          onBack={()=>setActiveQId(null)}
          onDelete={()=>{upd(p=>p.filter(q=>q.id!==activeQId));setActiveQId(null);}}
          onUpdate={q=>upd(p=>p.map(x=>x.id===q.id?q:x))}
          passGrade={passGrade}/>
      )}
      {tab==="calendar"&&<CalendarView quarters={quarters} passGrade={passGrade}/>}
      {tab==="stats"&&<StatsView quarters={quarters} settings={settings} passGrade={passGrade}/>}
      {tab==="plan"&&<PlanIAView quarters={quarters} settings={settings} passGrade={passGrade} onReset={handleReset}/>}
      {tab==="settings"&&<SettingsView settings={settings} onUpdate={handleSettingsUpdate} darkMode={darkMode} onToggleDark={handleToggleDark}/>}

      <NavBar active={tab} onChange={id=>{setTab(id);if(id!=="home")setActiveQId(null);}}/>
    </>
  );
}