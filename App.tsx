
import React, { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { AppState, Semester, Subject, Assignment, Literature, User } from './types';
import * as gemini from './services/gemini';
import { Send, FileText, Settings, Bot, Plus, X, Trash2, ChevronRight, ChevronDown, Check, Folder, Calendar, BookOpen } from 'lucide-react';
import SubjectDashboard from './components/dashboard/SubjectDashboard';
import AppSettings from './components/settings/AppSettings';

/* ── CONSTANTS & HELPERS ─────────────────────────────────────────────────── */
const COLORS = ["#f472b6","#e879f9","#a78bfa","#60a5fa","#34d399","#fbbf24","#fb923c","#f87171","#38bdf8"];
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
const PC: Record<string, any> = {high:{bg:"rgba(251,113,133,0.15)",c:"#fb7185"},medium:{bg:"rgba(251,191,36,0.15)",c:"#fbbf24"},low:{bg:"rgba(52,211,153,0.15)",c:"#34d399"}};

// Markdown renderer helper
const md = (text: string) => {
  if(!text) return "";
  let h = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/^- (.+)$/gm,"<li>$1</li>");
  return h.split("\n\n").map(p => {
    if(/^<(h[1-3]|pre|ul|li)/.test(p.trim())) return p;
    const wrapped = p.replace(/(<li>[\s\S]*?<\/li>)/g,"<ul>$1</ul>");
    return `<p>${wrapped.replace(/\n/g,"<br/>")}</p>`;
  }).join("");
};

const INIT_STATE: AppState = { semesters: [] };

/* ── REDUCER ─────────────────────────────────────────────────────────────── */
type Action = 
  | { type: "INIT", data: AppState }
  | { type: "TOGGLE_SEM", sid: string }
  | { type: "TOGGLE_SUB", sid: string, subid: string }
  | { type: "TOGGLE_ASGN", sid: string, subid: string, aid: string }
  | { type: "TOGGLE_LIT", sid: string, subid: string, lid: string }
  | { type: "ADD_LIT", sid: string, subid: string, lit: Literature }
  | { type: "DELETE_LIT", sid: string, subid: string, lid: string }
  | { type: "ADD_ASGN", sid: string, subid: string, asgn: Assignment }
  | { type: "DELETE_ASGN", sid: string, subid: string, aid: string }
  | { type: "ADD_SEM", sem: Semester }
  | { type: "DELETE_SEM", sid: string }
  | { type: "ADD_SUB", sid: string, sub: Subject }
  | { type: "DELETE_SUB", sid: string, subid: string }
  | { type: "RENAME_SEM", sid: string, label: string }
  | { type: "RENAME_SUB", sid: string, subid: string, fields: Partial<Subject> }
  | { type: "UPDATE_NOTES", sid: string, subid: string, notes: string };

function reduce(state: AppState, a: Action): AppState {
  const ms  = (fn: (s: Semester) => Semester) => ({...state, semesters: state.semesters.map(fn)});
  const msb = (sid: string, fn: (s: Subject) => Subject) => ms(s => s.id===sid ? {...s,subjects:s.subjects.map(fn)} : s);
  const mo  = (sid: string, subid: string, fn: (s: Subject) => Subject) => msb(sid, s => s.id===subid ? fn(s) : s);

  switch(a.type) {
    case "INIT":           return a.data;
    case "TOGGLE_SEM":     return ms(s => s.id===a.sid ? {...s,open:!s.open} : s);
    case "TOGGLE_SUB":     return msb(a.sid, s => s.id===a.subid ? {...s,open:!s.open} : s);
    case "TOGGLE_ASGN":    return mo(a.sid,a.subid, s=>({...s,assignments:s.assignments.map(x=>x.id===a.aid?{...x,done:!x.done}:x)}));
    case "TOGGLE_LIT":     return mo(a.sid,a.subid, s=>({...s,literature:s.literature.map(x=>x.id===a.lid?{...x,done:!x.done}:x)}));
    case "ADD_LIT":        return mo(a.sid,a.subid, s=>({...s,literature:[...s.literature,a.lit]}));
    case "DELETE_LIT":     return mo(a.sid,a.subid, s=>({...s,literature:s.literature.filter(x=>x.id!==a.lid)}));
    case "ADD_ASGN":       return mo(a.sid,a.subid, s=>({...s,assignments:[...s.assignments,a.asgn]}));
    case "DELETE_ASGN":    return mo(a.sid,a.subid, s=>({...s,assignments:s.assignments.filter(x=>x.id!==a.aid)}));
    case "ADD_SEM":        return {...state,semesters:[...state.semesters,a.sem]};
    case "DELETE_SEM":     return {...state,semesters:state.semesters.filter(s=>s.id!==a.sid)};
    case "ADD_SUB":        return ms(s => s.id===a.sid ? {...s,subjects:[...s.subjects,a.sub]} : s);
    case "DELETE_SUB":     return ms(s => s.id===a.sid ? {...s, subjects: s.subjects.filter(sub => sub.id !== a.subid)} : s);
    case "RENAME_SEM":     return ms(s => s.id===a.sid ? {...s,label:a.label} : s);
    case "RENAME_SUB":     return msb(a.sid, s => s.id===a.subid ? {...s,...a.fields} : s);
    case "UPDATE_NOTES":   return mo(a.sid,a.subid, s=>({...s,notes:a.notes}));
    default: return state;
  }
}

/* ── COMPONENTS ──────────────────────────────────────────────────────────── */

const InlineEdit = ({value, onSave, className="", style={}, inputStyle={}, placeholder="Click to edit"}: any) => {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(()=>{ if(editing) { setDraft(value); ref.current?.focus(); ref.current?.select(); } },[editing]);
  const save = () => { const v=draft.trim(); if(v&&v!==value) onSave(v); setEditing(false); };
  if(editing) return <input ref={ref} className="editable-input" style={inputStyle} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==="Enter")save(); if(e.key==="Escape")setEditing(false);}}/>;
  return <span className={`editable ${className}`} style={style} onClick={()=>setEditing(true)} title="Click to edit">{value||placeholder}</span>;
};

const Modal = ({title, onClose, children, footer}: any) => {
  useEffect(()=>{
    const h = (e: KeyboardEvent) => { if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

/* ── SUB-COMPONENTS ──────────────────────────────────────────────────────── */

function StatsBar({data}: {data: AppState}) {
  const subs=data.semesters.flatMap(s=>s.subjects);
  const allA=subs.flatMap(s=>s.assignments);
  const ects=subs.reduce((n,s)=>n+(s.ects||0),0);
  const stats=[
    {v:`${allA.filter(a=>a.done).length}/${allA.length}`, l:"Tasks Done", c:"var(--pink)"},
    {v:ects, l:"Total ECTS", c:"var(--amber)"},
    {v:subs.length, l:"Classes", c:"var(--text-2)"},
  ];
  return (
    <div className="stats-bar">
      {stats.map((s,i)=><React.Fragment key={s.l}>
        {i>0&&<div className="stat-sep"/>}
        <div className="stat-item"><span className="stat-val" style={{color:s.c}}>{s.v}</span><span className="stat-label">{s.l}</span></div>
      </React.Fragment>)}
    </div>
  );
}

/* ── MODALS ──────────────────────────────────────────────────────────────── */

function AddSemModal({onClose, onAdd}: any) {
  const [label,setLabel]=useState("");
  const submit = () => { if(label.trim()){onAdd({id:uid(),label:label.trim(),open:true,subjects:[]});onClose();} };
  return (
    <Modal title="Add Semester" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!label.trim()} onClick={submit}>Add Semester</button></>}>
      <div className="field"><label>Semester Name <span className="req">*</span></label><input className="fi" placeholder="e.g. Fall 2025" value={label} onChange={e=>setLabel(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
    </Modal>
  );
}

function AddClassModal({onClose, onAdd}: any) {
  const [title,setTitle]=useState("");
  const [code,setCode]=useState("");
  const [professor,setProfessor]=useState("");
  const [email,setEmail]=useState("");
  const [ects,setEcts]=useState("5");
  const [finDate,setFinDate]=useState("");
  const [color,setColor]=useState(COLORS[0]);
  const valid = title.trim();

  const submit = () => {
    if(!valid) return;
    onAdd({
      id:uid(),
      title:title.trim(),
      code:code.trim(),
      professor: professor.trim(),
      professorEmail: email.trim(),
      color,
      ects:parseInt(ects)||5,
      open:false,
      assignments:[],
      finals:{date:finDate||"2025-12-31",room: "TBD"},
      literature:[],
      notes:`## ${title.trim()}\n\nAdd your notes here.`
    });
    onClose();
  };

  return (
    <Modal title="Add New Class" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={submit}>Add Class</button></>}>
      
      <div className="field"><label>Class Name <span className="req">*</span></label><input className="fi" placeholder="e.g. Criminal Law" value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></div>
      
      <div className="field-row">
        <div className="field" style={{flex:1}}><label>Professor Name</label><input className="fi" placeholder="Dr. Smith" value={professor} onChange={e=>setProfessor(e.target.value)}/></div>
        <div className="field" style={{flex:1}}><label>Email</label><input className="fi" placeholder="prof@uni.edu" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      </div>

      <div className="field-row">
        <div className="field" style={{flex:1}}><label>Code (Optional)</label><input className="fi" placeholder="LAW 101" value={code} onChange={e=>setCode(e.target.value)}/></div>
        <div className="field" style={{flex:1}}><label>ECTS</label><input className="fi" type="number" min="1" max="30" value={ects} onChange={e=>setEcts(e.target.value)}/></div>
        <div className="field" style={{flex:1}}><label>Finals Date</label><input className="fi" type="date" value={finDate} onChange={e=>setFinDate(e.target.value)}/></div>
      </div>

      <div className="field"><label>Accent Color</label>
        <div className="color-grid">{COLORS.map(c=><button key={c} className={`color-swatch${color===c?" sel":""}`} style={{background:c,"--sw-color":c} as any} onClick={()=>setColor(c)}/>)}</div>
      </div>
    </Modal>
  );
}

/* ── AI PANEL ────────────────────────────────────────────────────────────── */

function AIPanel() {
  const [msgs,setMsgs]=useState([{role:"ai",id:"init",content:"Hello! I'm your Academic Tracker AI. Ask me anything about your documents, case law, or study schedule."}]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false);
  const [ctx,setCtx]=useState(""); const [showSettings,setShowSettings]=useState(false);
  const [key,setKey]=useState(()=>localStorage.getItem("LL_GEMINI_KEY")||"");
  const endRef=useRef<HTMLDivElement>(null); const fileRef=useRef<HTMLInputElement>(null);
  
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send = async () => {
    if(!input.trim()||loading) return;
    const um={role:"user",id:uid(),content:input};
    setMsgs(p=>[...p,um] as any); setInput(""); setLoading(true);
    try {
      const text = await gemini.sendChatMessage(um.content, msgs as any, ctx);
      setMsgs(p=>[...p,{role:"ai",id:uid(),content:text}]);
    } catch(err: any) { setMsgs(p=>[...p,{role:"ai",id:uid(),content:`⚠️ ${err.message}`,error:true}]); }
    finally { setLoading(false); }
  };

  return (
    <div className="ai-wrap">
      <div className="ai-panel">
        <div className="ai-topbar">
          <div className="ai-titlerow">🧠 AI Notebook Lab {ctx&&<span className="ctx-badge">📎 Context loaded</span>}</div>
          <div className="ai-actions">
            <button className="btn btn-sm btn-ghost" onClick={()=>fileRef.current?.click()}>📎 Upload context</button>
            <button className="btn btn-sm btn-ghost" onClick={()=>setShowSettings(!showSettings)}>{showSettings?"✕ Close":"⚙ API Key"}</button>
          </div>
          <input ref={fileRef} type="file" accept=".txt,.md,.pdf" style={{display:"none"}} onChange={async e=>{
            const f=e.target.files?.[0]; if(!f)return;
            const r=new FileReader(); r.onload=ev=>setCtx(ev.target?.result?.slice(0,10000) as string); r.readAsText(f);
          }}/>
        </div>
        {showSettings&&(
          <div className="ai-settings-body" style={{borderBottom:"1px solid var(--border)",maxHeight:240,flexShrink:0}}>
            <div className="field"><label>Gemini API Key</label><input type="password" className="fi" value={key} onChange={e=>setKey(e.target.value)} placeholder="AIza..."/></div>
            <button className="btn btn-primary" style={{alignSelf:"flex-start"}} onClick={()=>{localStorage.setItem("LL_GEMINI_KEY",key);setShowSettings(false);}}>Save Key</button>
          </div>
        )}
        <div className="chat-scroll">
          {msgs.map(m=>(
            <div key={m.id} className={`chat-msg ${m.role}${(m as any).error?" err":""}`}>
              <div className="msg-label">{m.role==="user"?"YOU":"ACADEMIC AI"}</div>
              <div className="msg-bubble" dangerouslySetInnerHTML={{__html:md(m.content)}}/>
            </div>
          ))}
          {loading&&<div className="chat-msg ai"><div className="msg-label">ACADEMIC AI</div><div className="msg-bubble"><div className="typing-dots"><span/><span/><span/></div></div></div>}
          <div ref={endRef}/>
        </div>
        <div className="chat-input-bar">
          <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything... (Enter to send)" onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}/>
          <button className="send-btn" onClick={send} disabled={loading||!input.trim()}>➤</button>
        </div>
      </div>
    </div>
  );
}

/* ── APP ROOT ─────────────────────────────────────────────────────────────── */

const App: React.FC = () => {
  const [data, dispatch] = useReducer(reduce, INIT_STATE);
  const [tab, setTab] = useState("explore");
  const [showAddSem, setShowAddSem] = useState(false);
  const [showAddCls, setShowAddCls] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    const s = localStorage.getItem("sf_v5");
    if (s) dispatch({type: "INIT", data: JSON.parse(s)});
  }, []);

  useEffect(() => {
    if (data.semesters.length > 0) localStorage.setItem("sf_v5", JSON.stringify(data));
  }, [data]);

  // Mock user for dashboard compatibility
  const mockUser: User = {
    id: 'user_1',
    firstName: 'Student',
    major: 'General Studies',
    university: 'University',
    themePref: 'academic',
    quoteSource: 'stoic',
    agentEnabled: true
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-left">
          <div className="logo"><span className="logo-icon">📜</span><span className="logo-name">Academic Tracker</span><span className="logo-ver">v2.1</span></div>
          <nav className="nav">
            <button className={`nav-btn${tab==="explore"?" active":""}`} onClick={()=>setTab("explore")}><Folder size={16}/> Explorer</button>
            <button className={`nav-btn${tab==="ai"?" active":""}`} onClick={()=>setTab("ai")}><Bot size={16}/> AI Lab</button>
          </nav>
        </div>
        <div className="hdr-right">
          <div className="hdr-pulse"/>
        </div>
      </header>

      <StatsBar data={data}/>

      <main className="main">
        {tab==="explore" && (
          <div className="content-wrap">
            <div className="top-bar">
              <div className="page-title">
                <span className="page-icon">📂</span>
                <div><div className="page-h1">Academic Explorer</div><div className="page-sub">All your semesters and subjects in one place</div></div>
              </div>
              <button className="btn btn-pink" onClick={()=>setShowAddSem(true)}><Plus size={16}/> Add Semester</button>
            </div>
            
            {data.semesters.map(sem => (
              <div key={sem.id} className="sem-block">
                <div className="sem-header" onClick={()=>dispatch({type:"TOGGLE_SEM",sid:sem.id})}>
                  <ChevronRight size={14} className={`sem-chevron${sem.open?" open":""}`}/>
                  <span className="sem-title">
                    <InlineEdit value={sem.label} onSave={(v:string)=>dispatch({type:"RENAME_SEM",sid:sem.id,label:v})} style={{fontWeight:700}}/>
                  </span>
                  <span className="sem-ects-pill">★ {sem.subjects.reduce((n,s)=>n+s.ects,0)} ECTS</span>
                  <button className="sem-add-btn" onClick={e=>{e.stopPropagation();setShowAddCls(sem.id)}}><Plus size={14}/> Add Class</button>
                </div>
                {sem.open && (
                  <div className="sem-body">
                    <div className="sem-connector">
                      {sem.subjects.map(sub => (
                        <div key={sub.id} className="subj-card" style={{marginBottom:10}}>
                          <div className={`subj-header${sub.open?" open":""}`} onClick={()=>dispatch({type:"TOGGLE_SUB",sid:sem.id,subid:sub.id})}>
                            <span className="subj-dot" style={{background:sub.color}}/>
                            <span className="subj-name" style={{color:sub.color}}>
                              <InlineEdit value={sub.title} onSave={(v:string)=>dispatch({type:"RENAME_SUB",sid:sem.id,subid:sub.id,fields:{title:v}})} style={{fontWeight:700}}/>
                            </span>
                            <span className="subj-code">{sub.code}</span>
                            <ChevronRight size={13} className={`subj-chev${sub.open?" open":""}`}/>
                          </div>
                          {sub.open && (
                            <div className="subj-body">
                              <SubjectDashboard
                                variant="inline"
                                user={mockUser}
                                subject={sub}
                                onDeleteSubject={(id) => dispatch({type: "DELETE_SUB", sid: sem.id, subid: id})}
                                onThemeChange={()=>{}}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {data.semesters.length===0 && <div className="empty-msg" style={{textAlign:"center",marginTop:40}}>No semesters. Add one to start.</div>}
          </div>
        )}
        {tab==="ai" && <AIPanel/>}
      </main>

      {showAddSem && <AddSemModal onClose={()=>setShowAddSem(false)} onAdd={(sem:Semester)=>dispatch({type:"ADD_SEM",sem})}/>}
      {showAddCls && <AddClassModal onClose={()=>setShowAddCls(null)} onAdd={(sub:Subject)=>dispatch({type:"ADD_SUB",sid:showAddCls,sub})}/>}
      {/* Hidden Settings loader to sync with legacy */}
      <AppSettings isOpen={false} onClose={() => {}} /> 
    </div>
  );
};

export default App;
