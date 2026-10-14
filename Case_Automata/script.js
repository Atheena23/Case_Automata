const LEVELS = [
  {
    title:"LOCK 01",
    story:"The first terminal is almost embarrassingly simple. It only cares whether a number has appeared.",
    clue:"Contains at least one number.",
    instruction:"Select every password that contains a digit. Then guide the machine through the chosen password.",
    passwords:["coffee","coffee7","night2","moon"],
    accepted:[false,true,true,false],
    input:"coffee7",
    states:[
      {id:"q0",x:190,y:150,sub:"waiting"},
      {id:"q1",x:520,y:150,sub:"accept",accept:true}
    ],
    transitions:[
      {from:"q0",to:"q0",label:"letter"},
      {from:"q0",to:"q1",label:"number"},
      {from:"q1",to:"q1",label:"any"}
    ]
  },
  {
    title:"LOCK 02",
    story:"The second lock checks the first thing it sees. Numbers at the door are not welcome.",
    clue:"Starts with a letter.",
    instruction:"Find the passwords that begin with a letter. Then predict each machine move.",
    passwords:["7cloud","cloud7","night","2night"],
    accepted:[false,true,true,false],
    input:"cloud7",
    states:[
      {id:"q0",x:160,y:150,sub:"start"},
      {id:"q1",x:440,y:90,sub:"valid",accept:true},
      {id:"q2",x:440,y:215,sub:"trap"}
    ],
    transitions:[
      {from:"q0",to:"q1",label:"letter"},
      {from:"q0",to:"q2",label:"number"},
      {from:"q1",to:"q1",label:"letter / number"},
      {from:"q2",to:"q2",label:"any"}
    ]
  },
  {
    title:"LOCK 03",
    story:"A small green light blinks behind the terminal. This machine only trusts the final symbol.",
    clue:"Ends with a number.",
    instruction:"Pick strings whose final character is a number. Watch how q1 changes when a letter arrives.",
    passwords:["room9","room","42a","case8"],
    accepted:[true,false,false,true],
    input:"room9",
    states:[
      {id:"q0",x:190,y:150,sub:"last = letter"},
      {id:"q1",x:520,y:150,sub:"last = number",accept:true}
    ],
    transitions:[
      {from:"q0",to:"q0",label:"letter"},
      {from:"q0",to:"q1",label:"number"},
      {from:"q1",to:"q0",label:"letter"},
      {from:"q1",to:"q1",label:"number"}
    ]
  },
  {
    title:"LOCK 04",
    story:"Someone left an @ symbol scratched onto the case file. The terminal knows exactly what it means.",
    clue:"Contains the symbol @.",
    instruction:"Find passwords containing @. Then move through q0 until the special symbol sends you to q1.",
    passwords:["mira@7","mira7","night@","@case"],
    accepted:[true,false,true,true],
    input:"mira@7",
    states:[
      {id:"q0",x:190,y:150,sub:"not found"},
      {id:"q1",x:520,y:150,sub:"found @",accept:true}
    ],
    transitions:[
      {from:"q0",to:"q0",label:"not @"},
      {from:"q0",to:"q1",label:"@"},
      {from:"q1",to:"q1",label:"any"}
    ]
  },
  {
    title:"LOCK 05",
    story:"Final lock. The archive wants a password that enters correctly and leaves correctly.",
    clue:"Starts with a letter AND ends with a number.",
    instruction:"This is the final case. Pick valid strings, then guide the full password through the DFA.",
    passwords:["agent7","7agent","agent","night2"],
    accepted:[true,false,false,true],
    input:"agent7",
    states:[
      {id:"q0",x:150,y:150,sub:"start"},
      {id:"q1",x:360,y:90,sub:"started"},
      {id:"q2",x:570,y:150,sub:"valid",accept:true},
      {id:"q3",x:360,y:215,sub:"trap"}
    ],
    transitions:[
      {from:"q0",to:"q1",label:"letter"},
      {from:"q0",to:"q3",label:"number"},
      {from:"q1",to:"q1",label:"letter"},
      {from:"q1",to:"q2",label:"number"},
      {from:"q2",to:"q2",label:"number"},
      {from:"q2",to:"q1",label:"letter"},
      {from:"q3",to:"q3",label:"any"}
    ]
  }
];

const state = {
  screen:"title",
  level:0,
  score:0,
  lives:3,
  selected:new Set(),
  machineState:"q0",
  inputIndex:0,
  trace:[],
  patternChecked:false
};

const $ = (id)=>document.getElementById(id);
const screens = {
  title:$("titleScreen"), intro:$("introScreen"), game:$("gameScreen"), ending:$("endingScreen")
};
const stages = {pattern:$("stagePattern"), dfa:$("stageDfa"), result:$("stageResult")};

function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
  state.screen=name;
}
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove("show"),1800);
}
function scoreText(n){ return String(Math.max(0,n)).padStart(4,"0"); }

function renderProgress(){
  $("progressList").innerHTML=LEVELS.map((l,i)=>{
    const cls=i<state.level?"done":i===state.level?"active":"";
    return `<div class="progress-item ${cls}"><span class="dot"></span>${l.title}</div>`;
  }).join("");
}
function renderLevel(){
  const l=LEVELS[state.level];
  $("levelLabel").textContent=String(state.level+1).padStart(2,"0");
  $("scoreLabel").textContent=scoreText(state.score);
  $("livesLabel").textContent="♥ ".repeat(state.lives).trim() || "—";
  $("levelTitle").textContent=l.title;
  $("storyText").textContent=l.story;
  $("clueText").textContent=l.clue;
  $("instructionText").textContent=l.instruction;
  renderProgress();
  state.selected.clear(); state.patternChecked=false; state.machineState="q0"; state.inputIndex=0; state.trace=[];
  renderPasswords();
  showStage("pattern");
}
function showStage(name){
  Object.values(stages).forEach(s=>s.classList.add("hidden"));
  stages[name].classList.remove("hidden");
  if(name==="dfa") renderDfa();
  if(name==="result") renderResult();
}
function renderPasswords(){
  const l=LEVELS[state.level];
  $("passwordGrid").innerHTML=l.passwords.map((p,i)=>`
    <button type="button" class="password-card ${state.selected.has(i)?"selected":""}" data-index="${i}">
      <span>${escapeHtml(p)}</span><span class="mark">${state.selected.has(i)?"◆":"◇"}</span>
    </button>`).join("");
  $("passwordGrid").querySelectorAll(".password-card").forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(state.patternChecked)return;
      const i=Number(btn.dataset.index);
      state.selected.has(i)?state.selected.delete(i):state.selected.add(i);
      renderPasswords();
      $("selectionCount").textContent=`${state.selected.size} selected`;
    });
  });
  $("selectionCount").textContent=`${state.selected.size} selected`;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

$("checkPatternBtn").addEventListener("click",()=>{
  const l=LEVELS[state.level];
  const expected=l.accepted.map((v,i)=>v?i:null).filter(v=>v!==null);
  const chosen=[...state.selected].sort((a,b)=>a-b);
  const ok=JSON.stringify(expected)===JSON.stringify(chosen);
  state.patternChecked=true;
  document.querySelectorAll(".password-card").forEach((card)=>{
    const i=Number(card.dataset.index);
    card.classList.remove("selected");
    if(l.accepted[i])card.classList.add("correct");
    else if(state.selected.has(i))card.classList.add("wrong");
  });
  if(ok){
    state.score+=100;
    $("scoreLabel").textContent=scoreText(state.score);
    $("terminalStatus").textContent="PATTERN FOUND";
    toast("Pattern identified. The machine is ready.");
    setTimeout(()=>startDfa(),650);
  }else{
    state.lives--;
    $("livesLabel").textContent="♥ ".repeat(state.lives).trim()||"—";
    $("terminalStatus").textContent="PATTERN MISMATCH";
    if(state.lives<=0){ state.lives=3; toast("The case reset your field notes. Try again."); setTimeout(()=>renderLevel(),900); }
    else toast("Not quite. Check the clue and try again.");
  }
});

function startDfa(){
  state.machineState="q0"; state.inputIndex=0; state.trace=["q0"];
  showStage("dfa");
}
function getTransition(l,from,ch){
  const isNum=/[0-9]/.test(ch), isLetter=/[A-Za-z]/.test(ch);
  return l.transitions.find(t=>{
    if(t.from!==from)return false;
    if(t.label==="number")return isNum;
    if(t.label==="letter")return isLetter;
    if(t.label==="any")return true;
    if(t.label==="not @")return ch!=="@";
    if(t.label==="@" )return ch==="@";
    if(t.label==="letter / number")return isNum||isLetter;
    if(t.label==="any")return true;
    return false;
  }) || null;
}
function renderInput(){
  const input=LEVELS[state.level].input;
  $("inputStrip").innerHTML=[...input].map((ch,i)=>`<span class="char-chip ${i<state.inputIndex?"done":""} ${i===state.inputIndex?"current":""}">${escapeHtml(ch)}</span>`).join("");
  $("currentSymbol").textContent=state.inputIndex<input.length?input[state.inputIndex]:"✓";
  $("currentState").textContent=state.machineState;
}
function renderDfa(){
  const l=LEVELS[state.level];
  renderInput();
  drawDfa(l);
  $("stateChoices").innerHTML=l.states.map(s=>`<button type="button" class="state-choice" data-state="${s.id}">${s.id}</button>`).join("");
  $("stateChoices").querySelectorAll(".state-choice").forEach(btn=>{
    btn.addEventListener("click",()=>chooseState(btn.dataset.state));
  });
  $("machineMessage").textContent=state.inputIndex>=l.input.length?"Machine finished.":"Choose the next state.";
  $("machineMessage").className="machine-message";
  $("dfaStatus").textContent="READY";
}
function drawDfa(l,pulseFrom=null,pulseTo=null){
  const svg=$("dfaSvg");
  const defs=`<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" class="edge-arrow"/></marker></defs>`;
  let out=defs;
  const byId=Object.fromEntries(l.states.map(s=>[s.id,s]));
  const edgeKey=new Set();
  l.transitions.forEach((t,idx)=>{
    const a=byId[t.from],b=byId[t.to];
    if(!a||!b)return;
    const key=`${t.from}-${t.to}`;
    if(edgeKey.has(key))return;
    edgeKey.add(key);
    if(t.from===t.to){
      const x=a.x,y=a.y;
      out+=`<path d="M ${x-27} ${y-22} C ${x-95} ${y-95}, ${x+95} ${y-95}, ${x+27} ${y-22}" class="edge" marker-end="url(#arrow)"/>`;
      const labels=l.transitions.filter(x=>x.from===t.from&&x.to===t.to).map(x=>x.label).join(" / ");
      out+=`<text x="${x}" y="${y-78}" class="edge-label" text-anchor="middle">${escapeHtml(labels)}</text>`;
    }else{
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
      const nx=-dy/len*28,ny=dx/len*28;
      out+=`<path d="M ${a.x+dx/len*30} ${a.y+dy/len*30} Q ${mx+nx} ${my+ny} ${b.x-dx/len*30} ${b.y-dy/len*30}" class="edge" marker-end="url(#arrow)"/>`;
      const labels=l.transitions.filter(x=>x.from===t.from&&x.to===t.to).map(x=>x.label).join(" / ");
      out+=`<text x="${mx+nx*1.15}" y="${my+ny*1.15}" class="edge-label" text-anchor="middle">${escapeHtml(labels)}</text>`;
    }
  });
  if(l.states[0]){
    const s=l.states[0];
    out+=`<path d="M 48 ${s.y} L ${s.x-36} ${s.y}" class="start-line" marker-end="url(#arrow)"/><text x="42" y="${s.y-10}" class="edge-label" text-anchor="end">START</text>`;
  }
  l.states.forEach(s=>{
    const active=s.id===state.machineState;
    const current=s.id===state.machineState;
    out+=`<g class="state-node ${active?"active":""} ${current?"current":""} ${s.accept?"accept":""}">
      <circle cx="${s.x}" cy="${s.y}" r="31" class="state-circle"/>
      ${s.accept?`<circle cx="${s.x}" cy="${s.y}" r="25" fill="none" stroke="#5c9b73" stroke-width="1"/>`:""}
      <text x="${s.x}" y="${s.y+4}" class="state-label">${s.id}</text>
      <text x="${s.x}" y="${s.y+48}" class="state-sub">${escapeHtml(s.sub)}</text>
    </g>`;
  });
  if(pulseFrom&&pulseTo&&byId[pulseFrom]&&byId[pulseTo]){
    const a=byId[pulseFrom],b=byId[pulseTo];
    if(a.id===b.id){
      out+=`<path d="M ${a.x-27} ${a.y-22} C ${a.x-95} ${a.y-95}, ${a.x+95} ${a.y-95}, ${a.x+27} ${a.y-22}" class="transition-pulse"/>`;
    }else{
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len*28,ny=dx/len*28,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      out+=`<path d="M ${a.x+dx/len*30} ${a.y+dy/len*30} Q ${mx+nx} ${my+ny} ${b.x-dx/len*30} ${b.y-dy/len*30}" class="transition-pulse"/>`;
    }
  }
  svg.innerHTML=out;
}
function chooseState(chosen){
  const l=LEVELS[state.level];
  if(state.inputIndex>=l.input.length){return}
  const ch=l.input[state.inputIndex];
  const transition=getTransition(l,state.machineState,ch);
  if(!transition){failChoice("No transition for this symbol.");return}
  if(chosen!==transition.to){
    state.lives--;
    $("livesLabel").textContent="♥ ".repeat(state.lives).trim()||"—";
    failChoice(`Not quite. ${ch} sends ${state.machineState} to ${transition.to}.`);
    if(state.lives<=0){toast("Too many mistakes — restarting this lock.");setTimeout(()=>startDfa(),800);}
    return;
  }
  const from=state.machineState;
  state.machineState=chosen;
  state.trace.push(chosen);
  state.inputIndex++;
  state.score+=25;
  $("scoreLabel").textContent=scoreText(state.score);
  $("machineMessage").textContent=`Correct. ${ch} → ${chosen}.`;
  $("machineMessage").className="machine-message good";
  $("dfaStatus").textContent="TRANSITION";
  renderInput();
  drawDfa(l,from,chosen);
  setTimeout(()=>{
    if(state.inputIndex>=l.input.length){
      finishDfa();
    }else{
      $("machineMessage").textContent="Choose the next state.";
      $("machineMessage").className="machine-message";
      $("dfaStatus").textContent="READING";
    }
  },450);
}
function failChoice(msg){
  $("machineMessage").textContent=msg;
  $("machineMessage").className="machine-message bad";
  $("dfaStatus").textContent="CHECK AGAIN";
  document.querySelectorAll(".state-choice").forEach(b=>{b.animate([{transform:"translateX(-3px)"},{transform:"translateX(3px)"},{transform:"translateX(0)"}],{duration:180})});
}
function finishDfa(){
  const l=LEVELS[state.level];
  const accepted=l.states.find(s=>s.id===state.machineState)?.accept;
  if(accepted){
    state.score+=100;
    $("scoreLabel").textContent=scoreText(state.score);
    setTimeout(()=>showStage("result"),350);
  }else{
    state.lives--;
    $("livesLabel").textContent="♥ ".repeat(state.lives).trim()||"—";
    $("machineMessage").textContent="The machine stopped in a non-accepting state. Try the path again.";
    $("machineMessage").className="machine-message bad";
    if(state.lives<=0){toast("The lock reset your attempt.");setTimeout(()=>startDfa(),800)}
  }
}
function renderResult(){
  const l=LEVELS[state.level];
  $("resultStamp").textContent="LOCK SOLVED";
  $("resultTitle").textContent=state.level===LEVELS.length-1?"ARCHIVE OPEN":"LOCK OPEN";
  $("resultText").textContent=`${l.input} was accepted. The machine moved through ${state.trace.join(" → ")} and finished in an accepting state.`;
  $("traceBox").innerHTML=state.trace.map((s,i)=>`${i?'<span class="trace-arrow">→</span>':''}<span class="trace-state ${i===state.trace.length-1?'final':''}">${s}</span>`).join("");
  $("nextLevelBtn").textContent=state.level===LEVELS.length-1?"OPEN THE ARCHIVE →":"OPEN NEXT CASE →";
}

$("nextLevelBtn").addEventListener("click",()=>{
  if(state.level===LEVELS.length-1){$("finalScore").textContent=scoreText(state.score);showScreen("ending");return}
  state.level++; renderLevel();
});
$("startBtn").addEventListener("click",()=>{state.level=0;state.score=0;state.lives=3;showScreen("intro")});
$("enterTerminalBtn").addEventListener("click",()=>{showScreen("game");renderLevel()});
$("playAgainBtn").addEventListener("click",()=>{state.level=0;state.score=0;state.lives=3;showScreen("intro")});
$("restartBtn").addEventListener("click",()=>{state.lives=3;renderLevel();toast("Current case restarted.")});
$("howBtn").addEventListener("click",()=>{$("modal").classList.remove("hidden")});
$("closeModal").addEventListener("click",()=>{$("modal").classList.add("hidden")});
$("modal").addEventListener("click",(e)=>{if(e.target===$("modal"))$("modal").classList.add("hidden")});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape")$("modal").classList.add("hidden");
});

showScreen("title");
