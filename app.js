import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import{getFirestore,collection,getDocs,addDoc,updateDoc,deleteDoc,doc,query,orderBy,limit,where,Timestamp,getDoc,setDoc}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ════════════════════════════
// FIREBASE CONFIG
// ════════════════════════════
const FB={
  apiKey:"AIzaSyDnwaq5pBCbmdIvKSSyQCQvxGxZZw7ikCI",
  authDomain:"power-sms-88a0d.firebaseapp.com",
  projectId:"power-sms-88a0d",
  storageBucket:"power-sms-88a0d.firebasestorage.app",
  messagingSenderId:"702990685390",
  appId:"1:702990685390:web:a5e50bcb83911ba2036c9f"
};
const app=initializeApp(FB);
const db=getFirestore(app);
const auth=getAuth(app);

// ════════════════════════════
// GLOBALS
// ════════════════════════════
let CU=null,SETT={},allRanges=[],CAP=0,INV_TOKEN=null,INV_ROLE=null,CLI_LINK='',appInited=false;

// ════════════════════════════
// HELPERS
// ════════════════════════════
async function sha256(m){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}

function toast(msg,t='s'){const e=document.createElement('div');e.className=`tm ${t}`;const i=t==='s'?'check-circle-fill':t==='e'?'exclamation-triangle-fill':'exclamation-circle-fill';e.innerHTML=`<i class="bi bi-${i}"></i> ${msg}`;document.getElementById('tc').appendChild(e);setTimeout(()=>{e.style.animation='sli .3s ease reverse';setTimeout(()=>e.remove(),300);},3200);}
window.toast=toast;

function msg(id,txt,t='d'){document.getElementById(id).innerHTML=txt?`<div class="amsg ${t}">${txt}</div>`:'';};

function showSc(n){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById('sc-'+n);
  if(el){el.classList.add('active');}
  // Update URL
  if(n==='login') history.replaceState(null,'',window.location.pathname);
  else if(n==='setup') history.replaceState(null,'','?page=setup');
  else if(n==='register') history.replaceState(null,'',window.location.search);
}
window.showSc=showSc;

window.tEye=function(pi,ii){const p=document.getElementById(pi),i=document.getElementById(ii);p.type=p.type==='password'?'text':'password';i.className=p.type==='password'?'bi bi-eye-slash':'bi bi-eye';};

// Page cookies (24hr, per-page)
function setCk(n,v){const d=new Date();d.setTime(d.getTime()+86400000);document.cookie=`${n}=${v};expires=${d.toUTCString()};path=/;SameSite=Lax`;}
function getCk(n){const c=document.cookie.split(';').find(r=>r.trim().startsWith(n+'='));return c?c.split('=')[1]:null;}
function delCk(n){document.cookie=`${n}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;}
const PAGES=['dash','ranges','anums','mynums','clinums','agents','myclients','invite','apisrc','settings','payment','news','live','test','crapi','bulk','clients','cdr-sms','cdr-stat','cdr-cli','cdr-rng','cdr-num','credit','stmt-usd','stmt-eur','stmt-gbp'];
function setPageCk(pg){PAGES.forEach(p=>delCk('psms_pg_'+p));if(CU)setCk('psms_pg_'+pg,btoa(JSON.stringify({pg,uid:CU.id,ts:Date.now()})));}

// ════════════════════════════
// CAPTCHA
// ════════════════════════════
function initCap(){const n1=Math.floor(Math.random()*9)+1,n2=Math.floor(Math.random()*9)+1;CAP=n1+n2;document.getElementById('lcap').textContent=`${n1} + ${n2} = ?`;}

// ════════════════════════════
// LOGIN
// ════════════════════════════
window.doLogin=async function(){
  const u=document.getElementById('lu').value.trim(),p=document.getElementById('lp').value,c=parseInt(document.getElementById('lcans').value);
  msg('lmsg','');
  if(!u||!p){msg('lmsg','Username and Password are required');return;}
  if(isNaN(c)||c!==CAP){msg('lmsg','Wrong verification answer!');initCap();document.getElementById('lcans').value='';return;}
  const btn=document.getElementById('lbtn');btn.disabled=true;btn.innerHTML='<span class="sp me-2"></span>Signing in...';
  try{
    // Generate email from username (same format used during registration)
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    // Login with Firebase Auth directly — no Firestore read needed before auth
    let firebaseUser;
    try{
      const cred=await signInWithEmailAndPassword(auth,email,p);
      firebaseUser=cred.user;
    }catch(authErr){
      if(authErr.code==='auth/user-not-found'||authErr.code==='auth/invalid-credential'||authErr.code==='auth/wrong-password'){
        msg('lmsg','Username or Password is incorrect!');
      }else{
        msg('lmsg','Login failed: '+authErr.message);
      }
      initCap();document.getElementById('lcans').value='';
      btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
      return;
    }
    // Now authenticated — read user doc from Firestore
    const snap=await getDoc(doc(db,'users',firebaseUser.uid));
    if(!snap.exists()){
      await signOut(auth);
      msg('lmsg','Username or Password is incorrect!');
      initCap();document.getElementById('lcans').value='';
      btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
      return;
    }
    const ud={id:snap.id,...snap.data()};
    if(ud.status==='inactive'){
      await signOut(auth);
      msg('lmsg','This account is inactive. Please contact the Admin.');
      btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
      return;
    }
    // ✅ Admin secret URL check
    const isAdminUrl=window.location.search.includes('adminloginsadhin6145');
    if(ud.role==='admin'&&!isAdminUrl){
      await signOut(auth);
      msg('lmsg','Access denied from this page!');
      initCap();document.getElementById('lcans').value='';
      btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
      return;
    }
    if(ud.role!=='admin'&&isAdminUrl){
      await signOut(auth);
      msg('lmsg','Access denied!');
      initCap();document.getElementById('lcans').value='';
      btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
      return;
    }
    appInited=true;
    await initApp(ud);
  }catch(e){msg('lmsg','Error: '+e.message);initCap();document.getElementById('lcans').value='';}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
};

// ════════════════════════════
// SETUP
// ════════════════════════════
window.doSetup=async function(){
  const u=document.getElementById('su').value.trim(),p=document.getElementById('sp').value,p2=document.getElementById('sp2').value;
  msg('smsg','');
  if(!u||!p){msg('smsg','Username and Password are required');return;}
  if(p.length<6){msg('smsg','Password must be at least 6 characters!');return;}
  if(p!==p2){msg('smsg','Passwords do not match!');return;}
  const btn=document.getElementById('sbtn');btn.disabled=true;btn.innerHTML='<span class="sp me-2"></span>Creating...';
  try{
    const snap=await getDocs(collection(db,'users'));
    if(!snap.empty){msg('smsg','Account already exists! Please login.','s');setTimeout(()=>window.location.href='/login',2000);return;}
    // Create Firebase Auth account using username@powersms.app format
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    const cred=await createUserWithEmailAndPassword(auth,email,p);
    const tok=btoa(u+':'+Date.now()+':'+Math.random());
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email,username:u,name:u,role:'admin',status:'active',apiToken:tok,balance:0,totalOTP:0,totalEarning:0,paidOut:0,createdAt:Timestamp.now()});
    await setDoc(doc(db,'settings','main'),{setupDone:true,otpRate:0.50,minWithdrawal:500,dailyLimit:50,siteName:'Power SMS',contact:'',bkash:'',nagad:'',usdt:'',siteUrl:'',updatedAt:Timestamp.now()});
    msg('smsg',`✅ Super Admin "${u}" created successfully!`,'s');
    await signOut(auth);
    setTimeout(()=>window.location.href='/login',2000);
  }catch(e){msg('smsg','Error: '+e.message);console.error(e);}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-person-plus me-2"></i>Create Super Admin';
};

// ════════════════════════════
// REGISTER
// ════════════════════════════
window.doRegister=async function(){
  const u=document.getElementById('ru').value.trim(),n=document.getElementById('rn').value.trim(),p=document.getElementById('rp').value,p2=document.getElementById('rp2').value;
  msg('rmsg','');
  if(!u||!p){msg('rmsg','Username and Password are required');return;}
  if(p.length<6){msg('rmsg','Password must be at least 6 characters!');return;}
  if(p!==p2){msg('rmsg','Passwords do not match!');return;}
  if(!INV_TOKEN){msg('rmsg','Invalid invite link!');return;}
  const btn=document.getElementById('rbtn');btn.disabled=true;btn.innerHTML='<span class="sp me-2"></span>Creating...';
  try{
    const usnap=await getDocs(query(collection(db,'users'),where('username','==',u)));
    if(!usnap.empty){msg('rmsg','This username is already taken!');btn.disabled=false;btn.innerHTML='<i class="bi bi-person-check me-2"></i>Create Account';return;}
    const invDoc=await getDoc(doc(db,'invite_links',INV_TOKEN));
    const agentId=invDoc.data()?.agentId||null;
    // Create Firebase Auth account
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    const cred=await createUserWithEmailAndPassword(auth,email,p);
    const tok=btoa(u+':'+Date.now()+':'+Math.random());
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email,username:u,name:n||u,role:INV_ROLE||'agent',status:'active',apiToken:tok,balance:0,totalOTP:0,totalEarning:0,paidOut:0,agentId,dailyTaken:{date:'',count:0},createdAt:Timestamp.now()});
    await updateDoc(doc(db,'invite_links',INV_TOKEN),{status:'used',usedBy:u,usedAt:Timestamp.now()});
    msg('rmsg',`✅ Account "${u}" created! Please login.`,'s');
    await signOut(auth);
    setTimeout(()=>window.location.href='/login',2000);
  }catch(e){msg('rmsg','Error: '+e.message);console.error(e);}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-person-check me-2"></i>Create Account';
};

// ════════════════════════════
// LOGOUT
// ════════════════════════════
window.doLogout=async function(){
  appInited=false;
  try{await signOut(auth);}catch(e){}
  CU=null;
  window.location.href='/login';
};

// ════════════════════════════
// INIT APP
// ════════════════════════════
async function initApp(ud){
  CU=ud;
  try{const s=await getDoc(doc(db,'settings','main'));if(s.exists())SETT=s.data();}catch(e){}
  const role=CU.role;
  const init=CU.username.charAt(0).toUpperCase();
  const roleMap={admin:'Super Admin',agent:'Agent',client:'Client'};
  const roleLabel=roleMap[role]||role;
  const setEl=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  const setStyle=(id,val)=>{const el=document.getElementById(id);if(el)el.style.display=val;};
  const setHTML=(id,val)=>{const el=document.getElementById(id);if(el)el.innerHTML=val;};
  ['hdav','sbav'].forEach(id=>setEl(id,init));
  setEl('hdun',CU.username);setEl('hdrole',roleLabel);setEl('sbnm',CU.name||CU.username);setEl('sbrl',roleLabel);
  setEl('ftyr',new Date().getFullYear());
  setEl('dashdate',new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
  setEl('dashgreet','Welcome, '+(CU.name||CU.username)+'!');
  setStyle('nav-admin',role==='admin'?'block':'none');
  setStyle('nav-agent',role==='agent'?'block':'none');
  setStyle('nav-client',role==='client'?'block':'none');
  setStyle('dash-admin',role==='admin'?'block':'none');
  setStyle('dash-agent',role==='agent'?'block':'none');
  setStyle('dash-client',role==='client'?'block':'none');
  setEl('chart-title',role==='client'?'SMS Statistics Last 7 Days':'Weekly OTP Statistics');
  const wdArea=document.getElementById('wd-btn-area');
  if(wdArea&&role==='agent')wdArea.innerHTML='<button class="btn-p" onclick="openWd()"><i class="bi bi-cash-coin me-1"></i>Withdraw Submit</button>';
  setStyle('wd-admin-filter',role==='admin'?'flex':'none');
  setHTML('news-add-btn',role==='admin'?'<button class="btn-p" onclick="openAddNews()"><i class="bi bi-plus-circle me-1"></i>Add News</button>':'');
  setHTML('range-add-btn',role==='admin'?'<button class="btn-p" onclick="openAddRange()"><i class="bi bi-plus-circle me-1"></i>Add Range</button>':'');
  setEl('my-api-token',CU.apiToken||'No token');
  if(document.getElementById('cdr-d1'))document.getElementById('cdr-d1').value=new Date().toISOString().slice(0,16);
  if(document.getElementById('cdr-d2'))document.getElementById('cdr-d2').value=new Date().toISOString().slice(0,16);
  if(document.getElementById('stat-d1'))document.getElementById('stat-d1').value=new Date().toISOString().slice(0,10);
  if(document.getElementById('stat-d2'))document.getElementById('stat-d2').value=new Date().toISOString().slice(0,10);
  const appEl=document.getElementById('sc-app');
  if(appEl){appEl.classList.add('active');appEl.style.display='block';}
  await loadRanges();
  await loadClients2();
  const urlParams=new URLSearchParams(window.location.search);
  const urlPage=urlParams.get('page');
  go(urlPage&&PAGES.includes(urlPage)?urlPage:'dash');
}

// ════════════════════════════
// SIDEBAR
// ════════════════════════════
let sbOpen=true;
window.toggleSb=function(){
  const sb=document.getElementById('sb'),mn=document.getElementById('main'),ov=document.getElementById('ov');
  if(window.innerWidth<=768){sb.classList.toggle('mob-open');ov.classList.toggle('show');}
  else{sbOpen=!sbOpen;sb.classList.toggle('closed',!sbOpen);mn.classList.toggle('full',!sbOpen);}
};
window.closeSb=function(){document.getElementById('sb').classList.remove('mob-open');document.getElementById('ov').classList.remove('show');};
window.togM=function(k){document.getElementById('nc-'+k).classList.toggle('open');document.getElementById('np-'+k).classList.toggle('open');};

// ════════════════════════════
// NAVIGATION
// ════════════════════════════
const SECMAP={
  'dash':'dash','ranges':'ranges','anums':'anums','mynums':'mynums','clinums':'clinums',
  'agents':'agents','myclients':'myclients','invite':'invite','apisrc':'apisrc','settings':'settings',
  'payment':'payment','news':'news','live':'live','test':'test','crapi':'crapi',
  'bulk':'bulk','clients':'clients','cdr-sms':'cdr-sms','cdr-stat':'cdr-stat',
  'cdr-cli':'cdr-cli','cdr-rng':'cdr-rng','cdr-num':'cdr-num','credit':'credit',
  'stmt-usd':'stmt-usd','stmt-eur':'stmt-eur','stmt-gbp':'stmt-gbp'
};
const ADMIN_ONLY=['agents','invite','apisrc','settings','anums'];
const AGENT_ONLY=['mynums','myclients','bulk'];
const CLIENT_ONLY=['clinums'];

window.go=function(name){
  if(!CU) return;
  if(ADMIN_ONLY.includes(name)&&CU.role!=='admin'){toast('Permission denied!','e');return;}
  if(AGENT_ONLY.includes(name)&&CU.role==='admin'){return;}
  if(CLIENT_ONLY.includes(name)&&CU.role!=='client'){return;}
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  const sec=document.getElementById('sec-'+SECMAP[name]);
  if(sec) sec.classList.add('active');
  document.querySelectorAll('.ni,.nci').forEach(n=>n.classList.remove('active'));
  const ni=document.getElementById('ni-'+name)||document.getElementById('ni-'+name+'-ag')||document.getElementById('ni-cli-'+name);
  if(ni) ni.classList.add('active');
  setPageCk(name);
  // Update URL - use replaceState to avoid history clutter
  const newUrl=window.location.pathname+'?page='+name;
  if(window.location.search!=='?page='+name) history.pushState({page:name},'',newUrl);
  if(window.innerWidth<=768) closeSb();
  const loaders={'dash':loadDash,'ranges':loadRanges,'anums':loadAdminNums,'mynums':loadMyNums,'clinums':loadCliNums,'agents':loadAgents,'myclients':loadMyClients,'invite':loadInvites,'apisrc':loadApiSrc,'settings':loadSettings,'payment':loadWithdrawals,'news':loadNews,'live':loadLive,'test':loadTestPanel,'crapi':()=>{},'bulk':loadBulkPage,'clients':loadClients2,'cdr-sms':loadCDR,'cdr-stat':loadSMSStats};
  if(loaders[name]) loaders[name]();
};

// ════════════════════════════
// SETTINGS TABS
// ════════════════════════════
window.showStab=function(t,el){
  document.querySelectorAll('.stab').forEach(s=>s.classList.remove('active'));
  ['general','pmt','sec'].forEach(id=>{const el2=document.getElementById('stab-'+id);if(el2)el2.style.display='none';});
  el.classList.add('active');
  document.getElementById('stab-'+t).style.display='block';
};

// ════════════════════════════
// DASHBOARD
// ════════════════════════════
async function loadDash(){
  const role=CU.role;
  try{
    if(role==='admin'){
      const [agSnap,rnSnap,numSnap,apiSnap,wdSnap]=await Promise.all([
        getDocs(query(collection(db,'users'),where('role','==','agent'))),
        getDocs(query(collection(db,'sms_ranges'),where('status','==','active'))),
        getDocs(collection(db,'sms_numbers')),
        getDocs(query(collection(db,'api_sources'),where('status','==','active'))),
        getDocs(query(collection(db,'withdrawals'),where('status','==','pending')))
      ]);
      document.getElementById('a-agents').textContent=agSnap.size;
      document.getElementById('a-ranges').textContent=rnSnap.size;
      document.getElementById('a-nums').textContent=numSnap.size;
      document.getElementById('a-apis').textContent=apiSnap.size;
      document.getElementById('a-pwd').textContent=wdSnap.size;
      // OTP stats
      const otpSnap=await getDocs(query(collection(db,'otp_logs'),orderBy('createdAt','desc'),limit(1000)));
      const today=new Date();today.setHours(0,0,0,0);
      const yest=new Date(today);yest.setDate(yest.getDate()-1);
      const m30=new Date(today);m30.setDate(m30.getDate()-30);
      let tO=0,yO=0,mO=0;const cd={};
      otpSnap.forEach(d=>{const dt=d.data().createdAt?.toDate?.()??new Date();if(dt>=today)tO++;else if(dt>=yest)yO++;if(dt>=m30)mO++;const k=dt.toISOString().split('T')[0];cd[k]=(cd[k]||0)+1;});
      const rate=SETT.otpRate||0.50;
      document.getElementById('a-today').textContent=tO;document.getElementById('a-today-e').textContent=`৳${(tO*rate).toFixed(2)}`;
      document.getElementById('a-yest').textContent=yO;document.getElementById('a-yest-e').textContent=`৳${(yO*rate).toFixed(2)}`;
      document.getElementById('a-month').textContent=mO;document.getElementById('a-month-e').textContent=`৳${(mO*rate).toFixed(2)}`;
      renderChart(cd,'OTP');
    }
    else if(role==='agent'){
      const agDoc=await getDoc(doc(db,'users',CU.id));const ag=agDoc.data();
      const rate=SETT.otpRate||0.50;
      const today=new Date();today.setHours(0,0,0,0);
      const otpSnap=await getDocs(query(collection(db,'otp_logs'),where('agentId','==',CU.id),limit(500)));
      let tO=0;const cd={};
      otpSnap.forEach(d=>{const dt=d.data().createdAt?.toDate?.()??new Date();if(dt>=today)tO++;const k=dt.toISOString().split('T')[0];cd[k]=(cd[k]||0)+1;});
      const numSnap=await getDocs(query(collection(db,'sms_numbers'),where('agentId','==',CU.id)));
      const cliSnap=await getDocs(query(collection(db,'users'),where('agentId','==',CU.id))).then(s=>({docs:s.docs.filter(d=>d.data().role==='client'),size:s.docs.filter(d=>d.data().role==='client').length}));
      const wdSnap=await getDocs(query(collection(db,'withdrawals'),where('agentId','==',CU.id))).then(s=>({docs:s.docs.filter(d=>d.data().status==='pending'),size:s.docs.filter(d=>d.data().status==='pending').length}));
      let pendAmt=0;wdSnap.forEach(d=>pendAmt+=d.data().amount||0);
      document.getElementById('ag-today').textContent=tO;document.getElementById('ag-today-e').textContent=`৳${(tO*rate).toFixed(2)}`;
      document.getElementById('ag-earn').textContent=`৳${(ag.totalEarning||0).toFixed(2)}`;
      document.getElementById('ag-pend').textContent=`৳${pendAmt.toFixed(2)}`;
      document.getElementById('ag-nums').textContent=numSnap.size;
      document.getElementById('ag-paid').textContent=`৳${(ag.paidOut||0).toFixed(2)}`;
      document.getElementById('ag-clis').textContent=cliSnap.size;
      const todayStr=today.toISOString().split('T')[0];
      const taken=ag.dailyTaken?.date===todayStr?ag.dailyTaken.count:0;
      document.getElementById('ag-taken').textContent=taken;
      renderChart(cd,'OTP');
    }
    else if(role==='client'){
      const today=new Date();today.setHours(0,0,0,0);
      const yest=new Date(today);yest.setDate(yest.getDate()-1);
      const w7=new Date(today);w7.setDate(w7.getDate()-7);
      const otpSnap=await getDocs(query(collection(db,'otp_logs'),where('clientId','==',CU.id),limit(500)));
      let tO=0,yO=0,wO=0;const cd={};
      otpSnap.forEach(d=>{const dt=d.data().createdAt?.toDate?.()??new Date();if(dt>=today)tO++;else if(dt>=yest)yO++;if(dt>=w7)wO++;const k=dt.toISOString().split('T')[0];cd[k]=(cd[k]||0)+1;});
      const rate=SETT.otpRate||0.50;
      document.getElementById('cl-today').textContent=tO;document.getElementById('cl-today-r').textContent=(tO*rate).toFixed(2);
      document.getElementById('cl-yest').textContent=yO;document.getElementById('cl-yest-r').textContent=(yO*rate).toFixed(2);
      document.getElementById('cl-week').textContent=wO;document.getElementById('cl-week-r').textContent=(wO*rate).toFixed(2);
      renderChart(cd,'SMS');
    }
    // Recent ranges for all
    const rnSnap=await getDocs(query(collection(db,'sms_ranges'),limit(15)));
    const drTb=document.getElementById('dash-ranges');
    drTb.innerHTML=rnSnap.empty?'<tr><td colspan="2" style="text-align:center;color:#bbb;padding:18px;">No ranges yet</td></tr>':rnSnap.docs.map(d=>{const r=d.data();return`<tr><td style="font-size:11.5px;">${r.range||'-'}</td><td style="font-size:11px;color:#aaa;white-space:nowrap;">${r.payterm||''}</td></tr>`;}).join('');
  }catch(e){console.error('Dash:',e);}
}

function renderChart(cd,label){
  if(window._ch){window._ch.destroy();}
  const today=new Date();today.setHours(0,0,0,0);
  const cats=[],vals=[];
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().split('T')[0];cats.push(k.slice(5));vals.push(cd[k]||0);}
  window._ch=new ApexCharts(document.getElementById('main-chart'),{
    series:[{name:label,data:vals}],
    chart:{type:'bar',height:250,toolbar:{show:false},fontFamily:'Noto Sans Bengali,sans-serif'},
    colors:['#6f42c1'],plotOptions:{bar:{borderRadius:7,columnWidth:'45%',dataLabels:{position:'top'}}},
    dataLabels:{enabled:true,style:{fontSize:'11px',colors:['#666']},offsetY:-18},
    xaxis:{categories:cats,labels:{style:{colors:'#999',fontSize:'11px'}}},
    yaxis:{labels:{show:false}},grid:{borderColor:'#f5f3ff'},tooltip:{theme:'light'}
  });
  window._ch.render();
}

// ════════════════════════════
// SMS RANGES
// ════════════════════════════
async function loadRanges(){
  const tb=document.getElementById('ranges-tb');
  if(tb)tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(collection(db,'sms_ranges'));
    allRanges=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderRanges(allRanges);
    // Populate range dropdowns
    const rangeOpts=allRanges.map(r=>`<option value="${r.id}">${r.range}</option>`).join('');
    ['nf-range','an-range','agn-range','testf-range','test-range','cdr-range','bulk-ranges'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      const isF=id.startsWith('nf-')||id==='testf-range'||id==='cdr-range';
      const isMulti=el.multiple;
      el.innerHTML=(isF?'<option value="">All Ranges</option>':isMulti?'':'<option value="">Select Range</option>')+rangeOpts;
    });
    await populateApiDd();
  }catch(e){if(tb)tb.innerHTML=`<tr><td colspan="9" style="text-align:center;color:#ef4444;padding:28px;">Error</td></tr>`;console.error(e);}
}

async function populateApiDd(){
  const el=document.getElementById('rm-api');if(!el)return;
  try{const snap=await getDocs(query(collection(db,'api_sources'),where('status','==','active')));el.innerHTML='<option value="">None</option>'+snap.docs.map(d=>`<option value="${d.id}">${d.data().name}</option>`).join('');}catch(e){}
}

function renderRanges(list){
  const tb=document.getElementById('ranges-tb');if(!tb)return;
  document.getElementById('ranges-cnt').textContent=`${list.length} records`;
  if(!list.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;color:#bbb;padding:28px;">No ranges yet</td></tr>';return;}
  const isAdmin=CU.role==='admin';
  tb.innerHTML=list.map((r,i)=>`<tr>
    <td style="color:#bbb;font-size:11px;">${i+1}</td>
    <td><strong style="font-size:12.5px;">${r.range||'-'}</strong></td>
    <td style="font-size:11.5px;color:#888;">${r.prefix||'-'}</td>
    <td style="font-size:11.5px;color:#888;">${r.testNumber||'-'}</td>
    <td style="font-size:11.5px;">${r.currency||'USD'}</td>
    <td style="font-size:11.5px;">${r.payterm||'-'}</td>
    <td style="font-size:11.5px;">$${r.payout||'0.012'}</td>
    <td><span class="${r.status==='active'?'ba':'bi2'}">${r.status||'active'}</span></td>
    <td>${isAdmin
      ?`<button class="bsm be" onclick="openEditRange('${r.id}')"><i class="bi bi-pencil"></i></button><button class="bsm bd" onclick="confirmDel('Range delete Are you sure?',()=>delRange('${r.id}'))"><i class="bi bi-trash"></i></button>`
      :`<button class="btn-p" style="padding:4px 14px;font-size:11.5px;" onclick="openReq('${r.id}')">REQUEST</button>`}
    </td></tr>`).join('');
}

window.filterRanges=function(){const q=document.getElementById('rq').value.toLowerCase();renderRanges(q?allRanges.filter(r=>(r.range||'').toLowerCase().includes(q)):allRanges);};

window.openAddRange=function(){
  document.getElementById('rm-id').value='';document.getElementById('rm-t').textContent='Add Range';document.getElementById('rm-slbl').textContent='Save Range';
  ['rm-name','rm-prefix','rm-test','rm-payout','rm-memo'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rm-cur').value='USD';document.getElementById('rm-payterm').value='Weekly 7/1';document.getElementById('rm-status').value='active';document.getElementById('rm-api').value='';
  new bootstrap.Modal(document.getElementById('rangeModal')).show();
};

window.openEditRange=function(id){
  const r=allRanges.find(x=>x.id===id);if(!r)return;
  document.getElementById('rm-id').value=id;document.getElementById('rm-t').textContent='Edit Range';document.getElementById('rm-slbl').textContent='Update';
  document.getElementById('rm-name').value=r.range||'';document.getElementById('rm-prefix').value=r.prefix||'';document.getElementById('rm-test').value=r.testNumber||'';
  document.getElementById('rm-cur').value=r.currency||'USD';document.getElementById('rm-payterm').value=r.payterm||'Weekly 7/1';
  document.getElementById('rm-payout').value=r.payout||'';document.getElementById('rm-memo').value=r.memo||'';document.getElementById('rm-status').value=r.status||'active';
  if(document.getElementById('rm-api').querySelector(`option[value="${r.apiSourceId||''}"]`)) document.getElementById('rm-api').value=r.apiSourceId||'';
  new bootstrap.Modal(document.getElementById('rangeModal')).show();
};

window.saveRange=async function(){
  const nm=document.getElementById('rm-name').value.trim();if(!nm){toast('Range Name required!','e');return;}
  const eid=document.getElementById('rm-id').value;
  const data={range:nm,prefix:document.getElementById('rm-prefix').value.trim(),testNumber:document.getElementById('rm-test').value.trim(),currency:document.getElementById('rm-cur').value,payterm:document.getElementById('rm-payterm').value,payout:document.getElementById('rm-payout').value||'0.012',memo:document.getElementById('rm-memo').value.trim(),status:document.getElementById('rm-status').value,apiSourceId:document.getElementById('rm-api').value};
  try{
    if(eid){await updateDoc(doc(db,'sms_ranges',eid),data);toast('Range updated!');}
    else{data.createdAt=Timestamp.now();await addDoc(collection(db,'sms_ranges'),data);toast('Range added!');}
    bootstrap.Modal.getInstance(document.getElementById('rangeModal'))?.hide();loadRanges();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.delRange=async function(id){await deleteDoc(doc(db,'sms_ranges',id));toast('Deleted!');loadRanges();}

// ════════════════════════════
// REQUEST NUMBERS (Agent)
// ════════════════════════════
window.openReq=async function(rid){
  if(CU.role==='admin') return;
  const r=allRanges.find(x=>x.id===rid);if(!r)return;
  document.getElementById('req-rid').value=rid;
  document.getElementById('req-rname').value=r.range||'';
  document.getElementById('req-payterm').value=`${r.payterm||''} (Payout - $${r.payout||'0.012'})`;
  const agDoc=await getDoc(doc(db,'users',CU.id));
  const ag=agDoc.data();
  const lim=SETT.dailyLimit||50;
  const todayStr=new Date().toISOString().split('T')[0];
  const taken=ag.dailyTaken?.date===todayStr?ag.dailyTaken.count:0;
  const rem=lim-taken;
  document.getElementById('req-info').textContent=`Taken Today: ${taken}/${lim} • Remaining: ${rem}`;
  const warn=document.getElementById('req-warn'),btn=document.getElementById('req-btn');
  const qtyEl=document.getElementById('req-qty');
  if(rem<=0){
    warn.style.display='block';warn.innerHTML=`⚠️ Daily limit (${lim}) limit reached! Contact Admin: <strong>${SETT.contact||'Admin'}</strong>`;
    btn.disabled=true;
  }else{
    warn.style.display='none';btn.disabled=false;
    qtyEl.innerHTML=[5,10,15,20,25,30,35,40,45,50].filter(v=>v<=rem).map(v=>`<option value="${v}">${v}</option>`).join('');
  }
  new bootstrap.Modal(document.getElementById('reqModal')).show();
};

window.submitRequest=async function(){
  const rid=document.getElementById('req-rid').value,qty=parseInt(document.getElementById('req-qty').value);
  const r=allRanges.find(x=>x.id===rid);if(!r)return;
  try{
    const numSnap=await getDocs(query(collection(db,'sms_numbers'),where('rangeId','==',rid))).then(s=>({docs:s.docs.filter(d=>d.data().status==='available').slice(0,qty)}));
    if(numSnap.size<qty){toast(`Only ${numSnap.size} numbers available!`,'w');return;}
    await Promise.all(numSnap.docs.slice(0,qty).map(d=>updateDoc(doc(db,'sms_numbers',d.id),{status:'assigned',agentId:CU.id,agentName:CU.username,assignedAt:Timestamp.now()})));
    const agDoc=await getDoc(doc(db,'users',CU.id));const ag=agDoc.data();
    const todayStr=new Date().toISOString().split('T')[0];
    const taken=ag.dailyTaken?.date===todayStr?ag.dailyTaken.count:0;
    await updateDoc(doc(db,'users',CU.id),{dailyTaken:{date:todayStr,count:taken+qty}});
    bootstrap.Modal.getInstance(document.getElementById('reqModal'))?.hide();
    toast(`✅ ${qty} number(s) assigned successfully!`);loadDash();
  }catch(e){toast('Error: '+e.message,'e');}
};

// ════════════════════════════
// ADMIN: ALL NUMBERS
// ════════════════════════════
async function loadAdminNums(){
  const tb=document.getElementById('anums-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const rangeF=document.getElementById('nf-range')?.value,statusF=document.getElementById('nf-status')?.value;
    let cons=[orderBy('createdAt','desc')];
    if(rangeF) cons=[where('rangeId','==',rangeF),...cons];
    if(statusF) cons=[where('status','==',statusF),...cons];
    const snap=await getDocs(query(collection(db,'sms_numbers'),...cons));
    document.getElementById('anums-cnt').textContent=`${snap.size} numbers`;
    if(!snap.empty){
      tb.innerHTML=snap.docs.map((d,i)=>{
        const n=d.data(),r=allRanges.find(x=>x.id===n.rangeId);
        return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td style="font-family:monospace;font-size:12px;">${n.number}</td><td style="font-size:11.5px;">${r?.range||'-'}</td><td style="font-size:11.5px;color:#888;">${n.agentName||'-'}</td><td style="font-size:11.5px;color:#888;">${n.clientName||'-'}</td><td><span class="${n.status==='available'?'ba':n.status==='assigned'?'bb':'bi2'}">${n.status}</span></td><td><button class="bsm bd" onclick="confirmDel('Number delete Are you sure?',()=>delNum('${d.id}'))"><i class="bi bi-trash"></i></button></td></tr>`;
      }).join('');
    }else tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#bbb;padding:28px;">No numbers found</td></tr>';
  }catch(e){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:28px;">Error</td></tr>';console.error(e);}
}

window.openAddNums=function(){document.getElementById('an-nums').value='';new bootstrap.Modal(document.getElementById('addNumModal')).show();};

window.saveNumbers=async function(){
  const rid=document.getElementById('an-range').value,raw=document.getElementById('an-nums').value;
  if(!rid){toast('Range select required!','e');return;}
  const nums=raw.split('\n').map(n=>n.trim()).filter(n=>n.length>0);
  if(!nums.length){toast('Numbers required!','e');return;}
  const r=allRanges.find(x=>x.id===rid);
  try{
    for(const num of nums) await addDoc(collection(db,'sms_numbers'),{number:num,rangeId:rid,rangeName:r?.range||'',status:'available',agentId:null,agentName:null,clientId:null,clientName:null,createdAt:Timestamp.now()});
    bootstrap.Modal.getInstance(document.getElementById('addNumModal'))?.hide();
    toast(`✅ ${nums.length} number(s) added successfully!`);loadAdminNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.delNum=async function(id){await deleteDoc(doc(db,'sms_numbers',id));toast('Deleted!');loadAdminNums();}

window.bulkDelNums=async function(){
  const checked=[...document.querySelectorAll('.num-chk:checked')].map(c=>c.value);
  if(!checked.length){toast('কোনো number select করুন!','w');return;}
  if(!confirm(`${checked.length} টা number delete করবেন?`))return;
  try{
    for(const id of checked) await deleteDoc(doc(db,'sms_numbers',id));
    toast(`✅ ${checked.length} numbers deleted!`);loadAdminNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.selectAllNums=function(chk){
  document.querySelectorAll('.num-chk').forEach(c=>c.checked=chk.checked);
};

// ════════════════════════════
// AGENT: MY NUMBERS
// ════════════════════════════
// ════ MY NUMBERS DATA STORE ════
let MN_ALL=[];  // all numbers cache

async function loadMyNums(){
  const tb=document.getElementById('mynums-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const [numSnap,cliSnap]=await Promise.all([
      getDocs(query(collection(db,'sms_numbers'),where('agentId','==',CU.id))),
      getDocs(query(collection(db,'users'),where('agentId','==',CU.id))).then(s=>({docs:s.docs.filter(d=>d.data().role==='client'),size:s.docs.filter(d=>d.data().role==='client').length}))
    ]);
    MN_ALL=numSnap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('mynums-cnt').textContent=`${MN_ALL.length} total numbers`;
    // Populate range filter
    const ranges=[...new Set(MN_ALL.map(n=>n.rangeId).filter(Boolean))];
    const rfEl=document.getElementById('mn-frange');
    if(rfEl){rfEl.innerHTML='<option value="">All Ranges</option>'+ranges.map(rid=>{const r=allRanges.find(x=>x.id===rid);return`<option value="${rid}">${r?.range||rid}</option>`;}).join('');}
    // Populate client filter & bulk assign dropdown
    const clients=cliSnap.docs.filter(d=>d.data().status!=='inactive').map(d=>({id:d.id,...d.data()}));
    const cfEl=document.getElementById('mn-fclient');
    if(cfEl){cfEl.innerHTML='<option value="">All Clients</option><option value="unassigned">Unassigned</option>'+clients.map(c=>`<option value="${c.id}">${c.username}</option>`).join('');}
    const bcEl=document.getElementById('mn-bulk-client');
    if(bcEl){bcEl.innerHTML='<option value="">Select Client to Assign</option>'+clients.map(c=>`<option value="${c.id}">${c.username}</option>`).join('');}
    // Also update single assign modal client list
    const cnEl=document.getElementById('cn-client');
    if(cnEl){cnEl.innerHTML='<option value="">Select Client</option>'+clients.map(c=>`<option value="${c.id}">${c.username}</option>`).join('');}
    filterMyNums();
  }catch(e){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:28px;">Error: '+e.message+'</td></tr>';console.error(e);}
}

window.filterMyNums=function(){
  const tb=document.getElementById('mynums-tb');if(!tb)return;
  const frange=document.getElementById('mn-frange')?.value||'';
  const fclient=document.getElementById('mn-fclient')?.value||'';
  const fsearch=(document.getElementById('mn-fsearch')?.value||'').toLowerCase();
  let filtered=MN_ALL.filter(n=>{
    if(frange&&n.rangeId!==frange)return false;
    if(fclient==='unassigned'&&n.clientId)return false;
    if(fclient&&fclient!=='unassigned'&&n.clientId!==fclient)return false;
    if(fsearch&&!n.number.toLowerCase().includes(fsearch))return false;
    return true;
  });
  document.getElementById('mn-showing').textContent=`Showing ${filtered.length} of ${MN_ALL.length} numbers`;
  if(!filtered.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#bbb;padding:28px;">No numbers found</td></tr>';return;}
  tb.innerHTML=filtered.map((n,i)=>{
    const r=allRanges.find(x=>x.id===n.rangeId);
    const statusCls=n.clientId?'bb':'ba';
    const statusTxt=n.clientId?'assigned':'available';
    return`<tr>
      <td><input type="checkbox" class="mn-chk" value="${n.id}" onchange="onNumCheck()"></td>
      <td style="color:#bbb;font-size:11px;">${i+1}</td>
      <td style="font-family:monospace;font-size:12px;">${n.number}</td>
      <td style="font-size:11.5px;">${r?.range||'-'}</td>
      <td style="font-size:11.5px;color:#888;">${n.clientName||'<span style="color:#ccc;">—</span>'}</td>
      <td><span class="${statusCls}">${statusTxt}</span></td>
      <td>
        ${!n.clientId?`<button class="bsm be" onclick="openCliAssign('${n.id}','${n.number}')" title="Assign to Client"><i class="bi bi-person-plus"></i></button>`:''}
        ${n.clientId?`<button class="bsm bd" onclick="unassignNum('${n.id}')" title="Unassign"><i class="bi bi-x-circle"></i></button>`:''}
      </td>
    </tr>`;
  }).join('');
};

window.toggleAllNums=function(chk){
  document.querySelectorAll('.mn-chk').forEach(c=>c.checked=chk.checked);
  // sync both checkboxes
  document.getElementById('mn-chk-all').checked=chk.checked;
  document.getElementById('mn-chk-all2').checked=chk.checked;
  onNumCheck();
};

window.onNumCheck=function(){
  const checked=document.querySelectorAll('.mn-chk:checked');
  const bar=document.getElementById('mn-bulk-bar');
  if(bar){
    if(checked.length>0){bar.style.display='flex';}
    else{bar.style.display='none';}
    document.getElementById('mn-sel-cnt').textContent=`${checked.length} selected`;
  }
};

window.openCliAssign=function(nid,num){
  document.getElementById('cn-nid').value=nid;
  document.getElementById('cn-num').value=num;
  new bootstrap.Modal(document.getElementById('cliNumModal')).show();
};

window.assignToClient=async function(){
  const nid=document.getElementById('cn-nid').value,cid=document.getElementById('cn-client').value;
  if(!cid){toast('Please select a client!','e');return;}
  try{
    const cDoc=await getDoc(doc(db,'users',cid));
    await updateDoc(doc(db,'sms_numbers',nid),{clientId:cid,clientName:cDoc.data().username,assignedAt:Timestamp.now()});
    bootstrap.Modal.getInstance(document.getElementById('cliNumModal'))?.hide();
    toast('✅ Number assigned to client!');loadMyNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.unassignNum=async function(nid){
  try{
    await updateDoc(doc(db,'sms_numbers',nid),{clientId:null,clientName:null});
    toast('Number unassigned!');loadMyNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.bulkAssignToClient=async function(){
  const cid=document.getElementById('mn-bulk-client').value;
  if(!cid){toast('Please select a client first!','e');return;}
  const checked=[...document.querySelectorAll('.mn-chk:checked')].map(c=>c.value);
  if(!checked.length){toast('No numbers selected!','e');return;}
  try{
    const cDoc=await getDoc(doc(db,'users',cid));
    const cName=cDoc.data().username;
    await Promise.all(checked.map(nid=>updateDoc(doc(db,'sms_numbers',nid),{clientId:cid,clientName:cName,assignedAt:Timestamp.now()})));
    toast(`✅ ${checked.length} numbers assigned to ${cName}!`);loadMyNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.bulkUnassign=async function(){
  const checked=[...document.querySelectorAll('.mn-chk:checked')].map(c=>c.value);
  if(!checked.length){toast('No numbers selected!','e');return;}
  try{
    await Promise.all(checked.map(nid=>updateDoc(doc(db,'sms_numbers',nid),{clientId:null,clientName:null})));
    toast(`✅ ${checked.length} numbers unassigned!`);loadMyNums();
  }catch(e){toast('Error: '+e.message,'e');}
};

// ════════════════════════════
// CLIENT: MY NUMBERS
// ════════════════════════════
async function loadCliNums(){
  const tb=document.getElementById('clinums-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(query(collection(db,'sms_numbers'),where('clientId','==',CU.id)));
    document.getElementById('clinums-cnt').textContent=`${snap.size} numbers`;
    if(!snap.empty){
      tb.innerHTML=snap.docs.map((d,i)=>{
        const n=d.data(),r=allRanges.find(x=>x.id===n.rangeId);
        return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td style="font-family:monospace;font-size:12.5px;">${n.number}</td><td style="font-size:11.5px;">${r?.range||'-'}</td><td><span class="ba">Active</span></td></tr>`;
      }).join('');
    }else tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:#bbb;padding:28px;">No numbers assigned yet.</td></tr>';
  }catch(e){console.error(e);}
}

// ════════════════════════════
// AGENTS (Admin)
// ════════════════════════════
async function loadAgents(){
  const tb=document.getElementById('agents-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(query(collection(db,'users'),where('role','==','agent')));
    if(snap.empty){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#bbb;padding:28px;">No agents yet</td></tr>';return;}
    const sorted=snap.docs.slice().sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
    const rows=await Promise.all(sorted.map(async(d,i)=>{
      const ag=d.data();
      const [numSnap,cliSnapAll]=await Promise.all([getDocs(query(collection(db,'sms_numbers'),where('agentId','==',d.id))),getDocs(query(collection(db,'users'),where('agentId','==',d.id)))]);
      const cliSnap={size:cliSnapAll.docs.filter(x=>x.data().role==='client').length};
      return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td><strong>${ag.username}</strong></td><td style="font-size:12.5px;">${ag.name||'-'}</td><td style="font-size:12.5px;">${cliSnap.size}</td><td style="font-size:12.5px;">${numSnap.size}</td><td style="font-size:12.5px;font-weight:600;color:var(--p);">৳${(ag.balance||0).toFixed(2)}</td><td><span class="${ag.status==='active'?'ba':'bi2'}">${ag.status||'active'}</span></td><td><button class="bsm be" onclick="openAgNums('${d.id}','${ag.username}')" title="Assign Numbers"><i class="bi bi-plus-circle"></i></button><button class="bsm bo" onclick="toggleAgent('${d.id}','${ag.status||'active'}')" title="Toggle"><i class="bi bi-toggle-on"></i></button><button class="bsm bd" onclick="confirmDel('Agent delete Are you sure?',()=>delAgent('${d.id}'))"><i class="bi bi-trash"></i></button></td></tr>`;
    }));
    tb.innerHTML=rows.join('');
  }catch(e){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:28px;">Error</td></tr>';console.error(e);}
}

window.openAgNums=function(uid,un){
  document.getElementById('agn-uid').value=uid;document.getElementById('agn-uname').value=un;document.getElementById('agn-qty').value='';document.getElementById('agn-avail').textContent='';
  new bootstrap.Modal(document.getElementById('agNumModal')).show();
};

window.checkAvail=async function(){
  const rid=document.getElementById('agn-range').value;if(!rid)return;
  const snap=await getDocs(query(collection(db,'sms_numbers'),where('rangeId','==',rid))).then(s=>({docs:s.docs.filter(d=>d.data().status==='available'),size:s.docs.filter(d=>d.data().status==='available').length}));
  document.getElementById('agn-avail').textContent=`Available: ${snap.size} numbers`;
};

window.assignNums=async function(){
  const uid=document.getElementById('agn-uid').value,rid=document.getElementById('agn-range').value,qty=parseInt(document.getElementById('agn-qty').value);
  if(!rid||!qty){toast('Range and Quantity are required!','e');return;}
  try{
    const snap=await getDocs(query(collection(db,'sms_numbers'),where('rangeId','==',rid))).then(s=>({docs:s.docs.filter(d=>d.data().status==='available').slice(0,qty)}));
    if(snap.size<qty){toast(`Only ${snap.size} available!`,'w');return;}
    const agDoc=await getDoc(doc(db,'users',uid));const agName=agDoc.data().username;
    await Promise.all(snap.docs.slice(0,qty).map(d=>updateDoc(doc(db,'sms_numbers',d.id),{status:'assigned',agentId:uid,agentName:agName,assignedAt:Timestamp.now()})));
    bootstrap.Modal.getInstance(document.getElementById('agNumModal'))?.hide();
    toast(`✅ ${qty} number(s) "${agName}"-assigned successfully!`);loadAgents();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.toggleAgent=async function(uid,cur){
  const ns=cur==='active'?'inactive':'active';
  await updateDoc(doc(db,'users',uid),{status:ns});toast(`Agent ${ns} updated successfully!`);loadAgents();
};
window.delAgent=async function(uid){await updateDoc(doc(db,'users',uid),{status:'deleted'});toast('Agent removed!');loadAgents();}

// ════════════════════════════
// MY CLIENTS (Agent)
// ════════════════════════════
async function loadMyClients(){
  const tb=document.getElementById('myclients-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(query(collection(db,'users'),where('agentId','==',CU.id))).then(s=>({docs:s.docs.filter(d=>d.data().role==='client'),size:s.docs.filter(d=>d.data().role==='client').length}));
    if(snap.empty){tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#bbb;padding:28px;">No clients yet. Generate an invite link.</td></tr>';return;}
    const sorted=snap.docs.slice().sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
    const rows=await Promise.all(sorted.map(async(d,i)=>{
      const c=d.data();const numSnap=await getDocs(query(collection(db,'sms_numbers'),where('clientId','==',d.id)));
      return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td><strong>${c.username}</strong></td><td style="font-size:12.5px;">${c.name||'-'}</td><td style="font-size:12.5px;">${numSnap.size}</td><td><span class="${c.status==='active'?'ba':'bi2'}">${c.status}</span></td><td><button class="bsm bo" onclick="toggleClient('${d.id}','${c.status||'active'}')"><i class="bi bi-toggle-on"></i></button></td></tr>`;
    }));
    tb.innerHTML=rows.join('');
  }catch(e){console.error(e);}
}
window.openAddClient=function(){document.getElementById('cli-link-box').style.display='none';document.getElementById('cli-link-url').textContent='';CLI_LINK='';new bootstrap.Modal(document.getElementById('addCliModal')).show();};
window.genClientInvite=async function(){
  try{
    const exp=new Date();exp.setHours(exp.getHours()+24);
    const ref=await addDoc(collection(db,'invite_links'),{role:'client',agentId:CU.id,status:'active',createdAt:Timestamp.now(),expiresAt:Timestamp.fromDate(exp),usedBy:null});
    CLI_LINK=(SETT.siteUrl||window.location.origin+window.location.pathname)+'?invite='+ref.id;
    document.getElementById('cli-link-url').textContent=CLI_LINK;document.getElementById('cli-link-box').style.display='block';
  }catch(e){toast('Error: '+e.message,'e');}
};
window.copyCliLink=function(){navigator.clipboard.writeText(CLI_LINK).then(()=>toast('Link copied!'));};
window.toggleClient=async function(uid,cur){const ns=cur==='active'?'inactive':'active';await updateDoc(doc(db,'users',uid),{status:ns});toast(`Client ${ns}!`);loadMyClients();};

// ════════════════════════════
// INVITE LINKS (Admin)
// ════════════════════════════
async function loadInvites(){
  const wrap=document.getElementById('invite-cards');if(!wrap)return;
  const warnEl=document.getElementById('invite-url-warn');
  if(warnEl)warnEl.style.display=(!SETT.siteUrl||SETT.siteUrl.includes('localhost'))?'block':'none';
  wrap.innerHTML='<div style="text-align:center;padding:28px;"><div class="spp" style="display:inline-block;"></div></div>';
  try{
    const snap=await getDocs(collection(db,'invite_links'));
    if(snap.empty){wrap.innerHTML='<div style="text-align:center;color:#bbb;padding:28px;">No links yet</div>';return;}
    const baseUrl=SETT.siteUrl||(window.location.origin+window.location.pathname.replace(/\/$/,''));
    wrap.innerHTML=snap.docs.map((d,i)=>{
      const inv=d.data(),exp=inv.expiresAt?.toDate?.()??new Date(),isExp=exp<new Date();
      const status=inv.status==='used'?'used':isExp?'expired':'active';
      const link=baseUrl+'?invite='+d.id;
      const statusCls=status==='active'?'ba':status==='used'?'bb':'bi2';
      const roleCls=inv.role==='client'?'bb':'ba';
      return`<div style="border:1px solid #f0ecff;border-radius:12px;padding:14px;margin-bottom:10px;background:#fdfcff;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="${roleCls}" style="font-size:11px;">${inv.role||'agent'}</span>
            <span class="${statusCls}" style="font-size:11px;">${status}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="bsm be" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('Link copied!','s'))" title="Copy Link"><i class="bi bi-copy"></i> Copy</button>
            <button class="bsm bd" onclick="confirmDel('Delete this invite link?',()=>delInvite('${d.id}'))" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <div style="font-family:monospace;font-size:11px;color:#7c3aed;background:#f0ecff;padding:8px 10px;border-radius:8px;word-break:break-all;">${link}</div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#aaa;">
          <span><i class="bi bi-clock me-1"></i>Expires: ${exp.toLocaleDateString()}</span>
          <span><i class="bi bi-person me-1"></i>Used by: ${inv.usedBy||'—'}</span>
        </div>
      </div>`;
    }).join('');
  }catch(e){wrap.innerHTML='<div style="text-align:center;color:#ef4444;padding:28px;">Error loading links</div>';console.error(e);}
}

window.genInvite=async function(role){
  try{
    const exp=new Date();exp.setHours(exp.getHours()+24);
    const ref=await addDoc(collection(db,'invite_links'),{role,agentId:null,status:'active',createdAt:Timestamp.now(),expiresAt:Timestamp.fromDate(exp),usedBy:null});
    const baseUrl=SETT.siteUrl||(window.location.origin+window.location.pathname.replace(/\/$/,''));
    const link=baseUrl+'?invite='+ref.id;
    await navigator.clipboard.writeText(link);
    toast(`✅ New ${role} invite link created & copied!`);loadInvites();
  }catch(e){toast('Error: '+e.message,'e');}
};
window.delInvite=async function(id){await deleteDoc(doc(db,'invite_links',id));toast('Deleted!');loadInvites();};

// ════════════════════════════
// API SOURCES (Admin)
// ════════════════════════════
async function loadApiSrc(){
  const tb=document.getElementById('apisrc-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(collection(db,'api_sources'));
    if(snap.empty){tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#bbb;padding:28px;">No API sources yet</td></tr>';return;}
    tb.innerHTML=snap.docs.map((d,i)=>{
      const a=d.data(),mk=a.token?a.token.substring(0,8)+'...'+a.token.slice(-4):'';
      return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td><strong>${a.name}</strong></td><td style="font-family:monospace;font-size:11px;color:#777;">${(a.baseUrl||'').substring(0,35)}...</td><td style="font-family:monospace;font-size:11px;color:#888;">${mk}</td><td><span class="${a.status==='active'?'ba':'bi2'}">${a.status}</span></td><td><button class="bsm be" onclick="openEditApi('${d.id}')"><i class="bi bi-pencil"></i></button><button class="bsm bd" onclick="confirmDel('API Source delete Are you sure?',()=>delApiSrc('${d.id}'))"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join('');
  }catch(e){console.error(e);}
}

window.openAddApi=function(){
  document.getElementById('api-id').value='';document.getElementById('api-t').textContent='Add API Source';document.getElementById('api-slbl').textContent='Save';
  ['api-name','api-url','api-token'].forEach(id=>document.getElementById(id).value='');document.getElementById('api-status').value='active';
  new bootstrap.Modal(document.getElementById('apiModal')).show();
};

window.openEditApi=async function(id){
  const snap=await getDoc(doc(db,'api_sources',id));if(!snap.exists())return;const a=snap.data();
  document.getElementById('api-id').value=id;document.getElementById('api-t').textContent='Edit API Source';document.getElementById('api-slbl').textContent='Update';
  document.getElementById('api-name').value=a.name||'';document.getElementById('api-url').value=a.baseUrl||'';document.getElementById('api-token').value=a.token||'';document.getElementById('api-status').value=a.status||'active';
  new bootstrap.Modal(document.getElementById('apiModal')).show();
};

window.saveApi=async function(){
  const nm=document.getElementById('api-name').value.trim(),url=document.getElementById('api-url').value.trim(),tok=document.getElementById('api-token').value.trim();
  if(!nm||!url||!tok){toast('Please fill in all fields!','e');return;}
  const eid=document.getElementById('api-id').value;const data={name:nm,baseUrl:url,token:tok,status:document.getElementById('api-status').value};
  try{
    if(eid){await updateDoc(doc(db,'api_sources',eid),data);toast('Updated!');}
    else{data.createdAt=Timestamp.now();await addDoc(collection(db,'api_sources'),data);toast('API Source added!');}
    bootstrap.Modal.getInstance(document.getElementById('apiModal'))?.hide();loadApiSrc();await populateApiDd();
  }catch(e){toast('Error: '+e.message,'e');}
};
window.delApiSrc=async function(id){await deleteDoc(doc(db,'api_sources',id));toast('Deleted!');loadApiSrc();}

// ════════════════════════════
// SETTINGS (Admin)
// ════════════════════════════
async function loadSettings(){
  try{
    const snap=await getDoc(doc(db,'settings','main'));
    if(snap.exists()){const s=snap.data();SETT=s;
      document.getElementById('set-rate').value=s.otpRate||0.50;document.getElementById('set-minwd').value=s.minWithdrawal||500;document.getElementById('set-dlimit').value=s.dailyLimit||50;
      document.getElementById('set-sitename').value=s.siteName||'';document.getElementById('set-contact').value=s.contact||'';
      document.getElementById('set-siteurl').value=s.siteUrl||'';
      document.getElementById('set-bkash').value=s.bkash||'';document.getElementById('set-nagad').value=s.nagad||'';document.getElementById('set-usdt').value=s.usdt||'';
    }
  }catch(e){console.error(e);}
}

window.saveSettings=async function(){
  try{
    const data={otpRate:parseFloat(document.getElementById('set-rate').value)||0.50,minWithdrawal:parseFloat(document.getElementById('set-minwd').value)||500,dailyLimit:parseInt(document.getElementById('set-dlimit').value)||50,siteName:document.getElementById('set-sitename').value.trim()||'Power SMS',contact:document.getElementById('set-contact').value.trim(),siteUrl:document.getElementById('set-siteurl').value.trim().replace(/\/$/,''),bkash:document.getElementById('set-bkash').value.trim(),nagad:document.getElementById('set-nagad').value.trim(),usdt:document.getElementById('set-usdt').value.trim(),updatedAt:Timestamp.now()};
    await setDoc(doc(db,'settings','main'),data,{merge:true});SETT=data;toast('Settings saved!');
  }catch(e){toast('Error: '+e.message,'e');}
};

window.changePass=async function(){
  const old=document.getElementById('set-oldp').value,nw=document.getElementById('set-newp').value,nw2=document.getElementById('set-newp2').value;
  if(!old||!nw){toast('Please fill in all fields!','e');return;}
  if(nw.length<6){toast('New password must be at least 6 characters!','e');return;}
  if(nw!==nw2){toast('New passwords do not match!','e');return;}
  try{
    // Re-authenticate then update password via Firebase Auth
    const {updatePassword,reauthenticateWithCredential,EmailAuthProvider}=await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const firebaseUser=auth.currentUser;
    if(!firebaseUser){toast('Not authenticated!','e');return;}
    const credential=EmailAuthProvider.credential(firebaseUser.email,old);
    await reauthenticateWithCredential(firebaseUser,credential);
    await updatePassword(firebaseUser,nw);
    toast('Password changed successfully!');
    ['set-oldp','set-newp','set-newp2'].forEach(id=>document.getElementById(id).value='');
  }catch(e){
    if(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'){toast('Current password is incorrect!','e');}
    else{toast('Error: '+e.message,'e');}
  }
};

// ════════════════════════════
// WITHDRAWAL
// ════════════════════════════
async function loadWithdrawals(){
  const tb=document.getElementById('wd-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const isAdmin=CU.role==='admin';
    let cons=[orderBy('createdAt','desc')];
    if(!isAdmin) cons=[where('agentId','==',CU.id),...cons];
    const statusF=document.getElementById('wdf-status')?.value;if(statusF) cons=[where('status','==',statusF),...cons];
    const snap=await getDocs(query(collection(db,'withdrawals'),...cons));
    let list=snap.docs.map(d=>({id:d.id,...d.data()}));
    const mF=document.getElementById('wdf-method')?.value;if(mF) list=list.filter(x=>x.method===mF);
    document.getElementById('wd-cnt').textContent=`${list.length} requests`;
    if(!list.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#bbb;padding:28px;">No requests</td></tr>';return;}
    tb.innerHTML=list.map((w,i)=>`<tr>
      <td style="color:#bbb;font-size:11px;">${i+1}</td>
      <td style="font-size:12.5px;">${w.agentName||'-'}</td>
      <td style="font-size:12.5px;font-weight:600;">৳${w.amount||0}</td>
      <td><span class="bb">${(w.method||'-').toUpperCase()}</span></td>
      <td style="font-family:monospace;font-size:11.5px;">${w.account||'-'}</td>
      <td><span class="${w.status==='pending'?'bp':w.status==='approved'?'ba':'bi2'}">${w.status}</span></td>
      <td style="font-size:11px;color:#aaa;">${w.createdAt?.toDate?.()?.toLocaleDateString()||'-'}</td>
      <td>${isAdmin&&w.status==='pending'?`<button class="bsm bg3" onclick="openWdApp('${w.id}','${w.agentId}','${w.agentName}',${w.amount})">✅</button><button class="bsm br2" onclick="rejectWd('${w.id}','${w.agentId}',${w.amount})">❌</button>`:''}</td>
    </tr>`).join('');
  }catch(e){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:28px;">Error</td></tr>';console.error(e);}
}

window.openWd=async function(){
  const agDoc=await getDoc(doc(db,'users',CU.id));const ag=agDoc.data();
  const bal=ag.balance||0,minWd=SETT.minWithdrawal||500;
  document.getElementById('wd-bal-info').innerHTML=`💰 Balance: <strong>৳${bal.toFixed(2)}</strong> &nbsp;|&nbsp; Min: <strong>৳${minWd}</strong>`;
  const mts=[];if(SETT.bkash)mts.push(`bKash: ${SETT.bkash}`);if(SETT.nagad)mts.push(`Nagad: ${SETT.nagad}`);if(SETT.usdt)mts.push(`USDT: ${SETT.usdt}`);
  document.getElementById('wd-pmtinfo').textContent=mts.length?'Admin payment info: '+mts.join(' | '):'';
  ['wd-method','wd-account','wd-amount'].forEach(id=>document.getElementById(id).value='');
  new bootstrap.Modal(document.getElementById('wdModal')).show();
};

window.updWdMethod=function(){const m=document.getElementById('wd-method').value;const lbl=document.getElementById('wd-acc-lbl');lbl.textContent=m==='usdt'?'USDT Wallet Address *':'Phone Number *';};

window.submitWd=async function(){
  const m=document.getElementById('wd-method').value,acc=document.getElementById('wd-account').value.trim(),amt=parseFloat(document.getElementById('wd-amount').value);
  if(!m||!acc||!amt){toast('Please fill in all fields!','e');return;}
  const minWd=SETT.minWithdrawal||500;if(amt<minWd){toast(`Minimum ৳${minWd}!`,'e');return;}
  try{
    const agDoc=await getDoc(doc(db,'users',CU.id));const bal=agDoc.data().balance||0;
    if(bal<amt){toast('Balance Insufficient balance!','e');return;}
    await addDoc(collection(db,'withdrawals'),{agentId:CU.id,agentName:CU.username,amount:amt,method:m,account:acc,status:'pending',createdAt:Timestamp.now()});
    await updateDoc(doc(db,'users',CU.id),{balance:bal-amt});
    bootstrap.Modal.getInstance(document.getElementById('wdModal'))?.hide();
    toast('✅ Withdrawal request submitted!');loadWithdrawals();
  }catch(e){toast('Error: '+e.message,'e');}
};

window.openWdApp=function(wid,agId,agName,amt){
  document.getElementById('wdapp-info').innerHTML=`Agent: <strong>${agName}</strong><br>Amount: <strong>৳${amt}</strong>`;
  document.getElementById('wdapp-app').onclick=async function(){
    try{
      await updateDoc(doc(db,'withdrawals',wid),{status:'approved',approvedAt:Timestamp.now(),by:CU.username});
      const agDoc=await getDoc(doc(db,'users',agId));
      await updateDoc(doc(db,'users',agId),{paidOut:(agDoc.data().paidOut||0)+amt});
      bootstrap.Modal.getInstance(document.getElementById('wdAppModal'))?.hide();
      toast('✅ Approved!');loadWithdrawals();
    }catch(e){toast('Error','e');}
  };
  new bootstrap.Modal(document.getElementById('wdAppModal')).show();
};

window.rejectWd=async function(wid,agId,amt){
  try{
    await updateDoc(doc(db,'withdrawals',wid),{status:'rejected',rejectedAt:Timestamp.now()});
    const agDoc=await getDoc(doc(db,'users',agId));
    await updateDoc(doc(db,'users',agId),{balance:(agDoc.data().balance||0)+amt});
    toast('Rejected, balance refunded!','w');loadWithdrawals();
  }catch(e){toast('Error','e');}
};

// ════════════════════════════
// NEWS
// ════════════════════════════
async function loadNews(){
  const tb=document.getElementById('news-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const snap=await getDocs(collection(db,'news'));
    if(snap.empty){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#bbb;padding:28px;">No news yet</td></tr>';return;}
    const isAdmin=CU.role==='admin';
    tb.innerHTML=snap.docs.map((d,i)=>{const n=d.data();return`<tr><td style="color:#bbb;font-size:11px;">${i+1}</td><td style="font-size:12.5px;font-weight:600;">${n.title}</td><td style="font-size:11.5px;color:#777;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.content}</td><td style="font-size:11px;color:#aaa;">${n.createdAt?.toDate?.()?.toLocaleDateString()||'-'}</td><td>${isAdmin?`<button class="bsm be" onclick="openEditNews('${d.id}')"><i class="bi bi-pencil"></i></button><button class="bsm bd" onclick="confirmDel('News delete Are you sure?',()=>delNews('${d.id}'))"><i class="bi bi-trash"></i></button>`:''}</td></tr>`;}).join('');
  }catch(e){console.error(e);}
}

window.openAddNews=function(){document.getElementById('nm-id').value='';document.getElementById('nm-t').textContent='Add News';document.getElementById('nm-slbl').textContent='Save';document.getElementById('nm-title').value='';document.getElementById('nm-content').value='';new bootstrap.Modal(document.getElementById('newsModal')).show();};
window.openEditNews=async function(id){const snap=await getDoc(doc(db,'news',id));if(!snap.exists())return;const n=snap.data();document.getElementById('nm-id').value=id;document.getElementById('nm-t').textContent='Edit News';document.getElementById('nm-slbl').textContent='Update';document.getElementById('nm-title').value=n.title||'';document.getElementById('nm-content').value=n.content||'';new bootstrap.Modal(document.getElementById('newsModal')).show();};
window.saveNews=async function(){const t=document.getElementById('nm-title').value.trim(),c=document.getElementById('nm-content').value.trim();if(!t||!c){toast('Please fill in all fields!','e');return;}const eid=document.getElementById('nm-id').value;const data={title:t,content:c};try{if(eid){await updateDoc(doc(db,'news',eid),data);toast('Updated!');}else{data.createdAt=Timestamp.now();data.by=CU.username;await addDoc(collection(db,'news'),data);toast('News added!');}bootstrap.Modal.getInstance(document.getElementById('newsModal'))?.hide();loadNews();}catch(e){toast('Error: '+e.message,'e');}};
window.delNews=async function(id){await deleteDoc(doc(db,'news',id));toast('Deleted!');loadNews();}

// ════════════════════════════
// LIVE ACCESS
// ════════════════════════════
async function loadLive(){
  const tb=document.getElementById('live-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const apiSnap=await getDocs(query(collection(db,'api_sources'),where('status','==','active')));
    if(apiSnap.empty){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#bbb;padding:28px;">No active API sources configured</td></tr>';return;}
    const apiSrc=apiSnap.docs[0].data();
    document.getElementById('live-cnt').textContent='Source: '+apiSrc.name;
    const today=new Date().toISOString().split('T')[0];
    const url=`${apiSrc.baseUrl}?token=${apiSrc.token}&date_start=${today} 00:00:00&date_end=${today} 23:59:59&records=100`;
    try{
      const resp=await fetch(url);
      if(resp.ok){const data=await resp.json();
        if(data?.data?.length){
          document.getElementById('live-cnt').textContent=`${data.data.length} records • Source: ${apiSrc.name}`;
          tb.innerHTML=data.data.map(row=>`<tr><td style="font-size:11px;color:#aaa;">${row.date||'-'}</td><td style="font-size:11.5px;">${row.range||'-'}</td><td style="font-family:monospace;font-size:11.5px;">${(row.number||'-').replace(/\d(?=\d{4})/g,'*')}</td><td style="font-size:11.5px;">${row.cli||'-'}</td><td style="font-size:11.5px;color:#888;">${row.message?'•'.repeat(Math.min(row.message.length,20)):'-'}</td></tr>`).join('');return;
        }
      }
    }catch(corsErr){}
    tb.innerHTML=`<tr><td colspan="5" style="padding:24px;"><div class="infob"><strong>⚠️ CORS Note</strong><br>API: <code>${apiSrc.name}</code><br>Direct browser call blocked by CORS. Netlify Function proxy setup to view live data.</div></td></tr>`;
  }catch(e){console.error(e);}
}

// ════════════════════════════
// SMS TEST PANEL
// ════════════════════════════
async function loadTestPanel(){
  try{
    const snap=await getDocs(query(collection(db,'sms_ranges'),where('status','==','active')));
    const ranges=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.testNumber);
    const tb=document.getElementById('testnums-tb');
    tb.innerHTML=ranges.length?ranges.map(r=>`<tr><td style="font-size:11.5px;">${r.range}</td><td style="font-size:11.5px;">${r.prefix||'-'}</td><td style="font-family:monospace;font-size:11.5px;">${r.testNumber}</td><td style="font-size:11.5px;">$${r.payout||'-'}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#bbb;padding:18px;">No test numbers</td></tr>';
    document.getElementById('test-range').innerHTML='<option value="">Select Range</option>'+snap.docs.map(d=>`<option value="${d.id}">${d.data().range}</option>`).join('');
    document.getElementById('testf-range').innerHTML='<option value="">All Ranges</option>'+snap.docs.map(d=>`<option value="${d.id}">${d.data().range}</option>`).join('');
  }catch(e){console.error(e);}
}

window.loadTestNums=async function(){
  const rid=document.getElementById('testf-range').value;
  const snap=await getDocs(rid?query(collection(db,'sms_ranges'),where('status','==','active')):query(collection(db,'sms_ranges'),where('status','==','active')));
  const ranges=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.testNumber&&(!rid||r.id===rid));
  const tb=document.getElementById('testnums-tb');
  tb.innerHTML=ranges.length?ranges.map(r=>`<tr><td style="font-size:11.5px;">${r.range}</td><td style="font-size:11.5px;">${r.prefix||'-'}</td><td style="font-family:monospace;font-size:11.5px;">${r.testNumber}</td><td style="font-size:11.5px;">$${r.payout||'-'}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#bbb;padding:18px;">No results</td></tr>';
};

window.fetchTestOTP=async function(){
  const num=document.getElementById('test-num').value.trim(),rid=document.getElementById('test-range').value,res=document.getElementById('test-result');
  if(!num){toast('Please enter a number!','e');return;}
  res.style.display='block';res.innerHTML='<div class="spp" style="display:block;margin:10px auto;"></div>';
  try{
    const r=allRanges.find(x=>x.id===rid);
    if(!r?.apiSourceId){res.innerHTML='<div class="amsg d">No API Source found for this range.</div>';return;}
    const apiDoc=await getDoc(doc(db,'api_sources',r.apiSourceId));if(!apiDoc.exists()){res.innerHTML='<div class="amsg d">API Source not found.</div>';return;}
    const api=apiDoc.data();
    try{
      const resp=await fetch(`${api.baseUrl}?token=${api.token}&number=${num}&records=5`);
      const data=await resp.json();
      if(data?.data?.length){res.innerHTML=data.data.map(row=>`<div class="otpb"><div class="otpc">${row.message||'****'}</div><div class="otpt">📞 ${row.number||num} &bull; ${row.date||'Just now'}</div></div>`).join('');}
      else res.innerHTML='<div class="amsg d">No OTP found.</div>';
    }catch(corsErr){res.innerHTML='<div class="amsg d">CORS Error: Netlify Function proxy required.</div>';}
  }catch(e){res.innerHTML='<div class="amsg d">Error: '+e.message+'</div>';}
};

// ════════════════════════════
// CR API
// ════════════════════════════
window.copyToken=function(){navigator.clipboard.writeText(CU.apiToken||'').then(()=>toast('Token copied!'));};
window.previewApi=function(){
  const res=document.getElementById('api-result');res.style.display='block';
  res.textContent=JSON.stringify({token:CU.apiToken,dateStart:document.getElementById('api-d1').value,dateEnd:document.getElementById('api-d2').value,number:document.getElementById('api-num').value,records:document.getElementById('api-rec').value,note:'API call via server proxy'},null,2);
};

// ════════════════════════════
// DELETE CONFIRM
// ════════════════════════════
// ════════════════════════════
// CLIENTS (Full CRUD)
// ════════════════════════════
let allClients2=[];
async function loadClients2(){
  const tb=document.getElementById('clients2-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="10" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    // Load based on role
    let snap;
    if(CU.role==='admin'){
      snap=await getDocs(query(collection(db,'users'),where('role','==','client')));
    }else{
      snap=await getDocs(query(collection(db,'users'),where('agentId','==',CU.id))).then(s=>({docs:s.docs.filter(d=>d.data().role==='client')}));
    }
    allClients2=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderClients2(allClients2);
    // Populate client dropdowns
    const cliOpts=allClients2.map(c=>`<option value="${c.id}">${c.username}${c.name?' - '+c.name:''}</option>`).join('');
    ['bulk-clients','cdr-client'].forEach(id=>{const el=document.getElementById(id);if(el){const isMulti=el.multiple;el.innerHTML=(isMulti?'':'<option value="">All Clients</option>')+cliOpts;}});
  }catch(e){if(tb)tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#ef4444;padding:28px;">Error loading clients</td></tr>';console.error(e);}
}

function renderClients2(list){
  const tb=document.getElementById('clients2-tb');if(!tb)return;
  document.getElementById('clients2-cnt').textContent=`${list.length} records`;
  if(!list.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#bbb;padding:28px;">No clients yet</td></tr>';return;}
  tb.innerHTML=list.map((c,i)=>`<tr>
    <td style="color:#bbb;font-size:11px;">${i+1}</td>
    <td><strong>${c.username}</strong></td>
    <td style="font-size:12.5px;">${c.name||'-'}</td>
    <td style="font-size:12px;">${c.company||'-'}</td>
    <td style="font-size:12px;">${c.email||'-'}</td>
    <td style="font-size:12px;">${c.contact||'-'}</td>
    <td style="font-size:12px;">${c.country||'-'}</td>
    <td style="font-size:12px;" id="cli-nums-${c.id}">-</td>
    <td><span class="${c.status==='active'?'ba':'bi2'}">${c.status||'active'}</span></td>
    <td>
      <button class="bsm be" onclick="viewClient('${c.id}')" title="View"><i class="bi bi-eye"></i></button>
      <button class="bsm be" onclick="openEditClient('${c.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
      <button class="bsm bo" onclick="toggleClientStatus('${c.id}','${c.status||'active'}')" title="Toggle"><i class="bi bi-toggle-on"></i></button>
      <button class="bsm bd" onclick="confirmDel('Delete client?',()=>delClient('${c.id}'))"><i class="bi bi-trash"></i></button>
    </td>
  </tr>`).join('');
  list.forEach(async(c)=>{
    try{const ns=await getDocs(query(collection(db,'sms_numbers'),where('clientId','==',c.id)));const el=document.getElementById('cli-nums-'+c.id);if(el)el.textContent=ns.size;}catch(e){}
  });
}

window.filterClients=function(){const q=document.getElementById('cli-q')?.value.toLowerCase();renderClients2(q?allClients2.filter(c=>(c.username||'').toLowerCase().includes(q)||(c.name||'').toLowerCase().includes(q)||(c.company||'').toLowerCase().includes(q)):allClients2);};

window.openAddClient2=function(){
  document.getElementById('cm-id').value='';document.getElementById('cm-t').textContent='Add Client';document.getElementById('cm-slbl').textContent='Save Client';
  ['cm-user','cm-pass','cm-email','cm-skype','cm-contact','cm-name','cm-company','cm-address'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cm-country').value='';document.getElementById('cm-status').value='active';
  new bootstrap.Modal(document.getElementById('clientModal')).show();
};

window.openEditClient=function(id){
  const c=allClients2.find(x=>x.id===id);if(!c)return;
  document.getElementById('cm-id').value=id;document.getElementById('cm-t').textContent='Edit Client';document.getElementById('cm-slbl').textContent='Update Client';
  document.getElementById('cm-user').value=c.username||'';document.getElementById('cm-pass').value='';
  document.getElementById('cm-email').value=c.email||'';document.getElementById('cm-skype').value=c.skype||'';
  document.getElementById('cm-contact').value=c.contact||'';document.getElementById('cm-name').value=c.name||'';
  document.getElementById('cm-company').value=c.company||'';document.getElementById('cm-address').value=c.address||'';
  document.getElementById('cm-country').value=c.country||'';document.getElementById('cm-status').value=c.status||'active';
  new bootstrap.Modal(document.getElementById('clientModal')).show();
};

window.saveClient2=async function(){
  const user=document.getElementById('cm-user').value.trim();
  const pass=document.getElementById('cm-pass').value;
  if(!user){toast('Username দিন!','e');return;}
  if(user.length<6){toast('Username কমপক্ষে 6 character!','e');return;}
  const eid=document.getElementById('cm-id').value;
  const data={
    username:user,name:document.getElementById('cm-name').value.trim(),
    email:document.getElementById('cm-email').value.trim(),skype:document.getElementById('cm-skype').value.trim(),
    contact:document.getElementById('cm-contact').value.trim(),company:document.getElementById('cm-company').value.trim(),
    address:document.getElementById('cm-address').value.trim(),country:document.getElementById('cm-country').value,
    status:document.getElementById('cm-status').value,role:'client',agentId:CU.id
  };
  try{
    if(eid){
      // Update existing client profile only (password change via Firebase console)
      await updateDoc(doc(db,'users',eid),data);
      toast('Client updated!');
    }else{
      if(!pass){toast('Please enter a password!','e');return;}
      const usnap=await getDocs(query(collection(db,'users'),where('username','==',user)));
      if(!usnap.empty){toast('This username already exists!','e');return;}
      // Create Firebase Auth account for client
      const email=user.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
      const cred=await createUserWithEmailAndPassword(auth,email,pass);
      data.uid=cred.user.uid;data.email=email;
      data.balance=0;data.totalOTP=0;data.totalEarning=0;data.paidOut=0;
      data.apiToken=btoa(user+':'+Date.now());data.createdAt=Timestamp.now();
      await setDoc(doc(db,'users',cred.user.uid),data);
      toast('Client added!');
    }
    bootstrap.Modal.getInstance(document.getElementById('clientModal'))?.hide();
    loadClients2();
  }catch(e){toast('Error: '+e.message,'e');console.error(e);}
};

window.viewClient=async function(id){
  const c=allClients2.find(x=>x.id===id);if(!c)return;
  const numSnap=await getDocs(query(collection(db,'sms_numbers'),where('clientId','==',id)));
  document.getElementById('view-cli-body').innerHTML=`
    <div class="row g-3">
      <div class="col-md-6">
        <div style="background:#f8f5ff;border-radius:10px;padding:14px;">
          <div style="font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;margin-bottom:10px;">Account Info</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Username:</span><br><strong>${c.username}</strong></div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Email:</span><br>${c.email||'-'}</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Skype:</span><br>${c.skype||'-'}</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Contact:</span><br>${c.contact||'-'}</div>
          <div><span style="font-size:11.5px;color:#777;">Status:</span><br><span class="${c.status==='active'?'ba':'bi2'}">${c.status}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div style="background:#f8f5ff;border-radius:10px;padding:14px;">
          <div style="font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;margin-bottom:10px;">Company Info</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Name:</span><br>${c.name||'-'}</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Company:</span><br>${c.company||'-'}</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Country:</span><br>${c.country||'-'}</div>
          <div style="margin-bottom:8px;"><span style="font-size:11.5px;color:#777;">Address:</span><br>${c.address||'-'}</div>
          <div><span style="font-size:11.5px;color:#777;">Numbers:</span><br><strong style="color:var(--p);">${numSnap.size}</strong></div>
        </div>
      </div>
    </div>`;
  new bootstrap.Modal(document.getElementById('viewCliModal')).show();
};

window.toggleClientStatus=async function(id,cur){const ns=cur==='active'?'inactive':'active';await updateDoc(doc(db,'users',id),{status:ns});toast(`Client ${ns}!`);loadClients2();};
async function delClient(id){await updateDoc(doc(db,'users',id),{status:'deleted'});toast('Client removed!');loadClients2();}

// ════════════════════════════
// BULK ALLOCATION
// ════════════════════════════
async function loadBulkPage(){
  // Populate ranges multi-select
  const rangeEl=document.getElementById('bulk-ranges');
  if(rangeEl&&allRanges.length){
    rangeEl.innerHTML=allRanges.map(r=>`<option value="${r.id}">${r.range}</option>`).join('');
  }
  // Populate clients
  await loadClients2();
  // Load recent allocations
  loadRecentAllocations();
}

async function loadRecentAllocations(){
  const tb=document.getElementById('bulk-tb');if(!tb)return;
  try{
    const snap=await getDocs(query(collection(db,'bulk_allocations'),orderBy('createdAt','desc'),limit(50)));
    if(snap.empty){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#bbb;padding:25px;">No allocations yet</td></tr>';return;}
    tb.innerHTML=snap.docs.map((d,i)=>{const a=d.data();return`<tr>
      <td style="font-size:11.5px;">${a.createdAt?.toDate?.()?.toLocaleString()||'-'}</td>
      <td style="font-size:12px;">${a.clientNames||'-'}</td>
      <td style="font-size:12px;">${(a.rangeNames||[]).join(', ')||'-'}</td>
      <td style="font-size:12px;">${a.qtyPerRange||0}</td>
      <td style="font-size:12px;font-weight:600;color:var(--p);">${a.totalNumbers||0}</td>
      <td style="font-size:12px;">${a.payterm||'-'}</td>
      <td style="font-size:12px;">$${a.payout||0}</td>
    </tr>`;}).join('');
  }catch(e){console.error(e);}
}

window.doBulkAllocate=async function(){
  const rangeEl=document.getElementById('bulk-ranges');
  const clientEl=document.getElementById('bulk-clients');
  const payterm=document.getElementById('bulk-payterm').value;
  const payout=parseFloat(document.getElementById('bulk-payout').value)||0;
  const qty=parseInt(document.getElementById('bulk-qty').value)||0;
  const selectedRanges=Array.from(rangeEl.selectedOptions).map(o=>o.value).filter(v=>v);
  const selectedClients=Array.from(clientEl.selectedOptions).map(o=>({id:o.value,name:o.text})).filter(v=>v.id);
  if(!payterm){toast('Payterm select করুন!','e');return;}
  if(!qty||qty<1){toast('Quantity দিন!','e');return;}
  if(!selectedClients.length){toast('কমপক্ষে একটি Client select করুন!','e');return;}
  if(!confirm(`Are you sure you want to allocate ${qty} numbers per range to ${selectedClients.length} client(s)?`))return;
  try{
    let totalAllocated=0;
    const rangeNames=selectedRanges.map(rid=>{const r=allRanges.find(x=>x.id===rid);return r?.range||rid;});
    for(const client of selectedClients){
      for(const rid of selectedRanges){
        const numSnap=await getDocs(query(collection(db,'sms_numbers'),where('rangeId','==',rid))).then(s=>({docs:s.docs.filter(d=>d.data().status==='available').slice(0,qty)}));
        const toAssign=numSnap.docs.slice(0,qty);
        await Promise.all(toAssign.map(d=>updateDoc(doc(db,'sms_numbers',d.id),{status:'assigned',agentId:CU.id,agentName:CU.username,clientId:client.id,clientName:client.name,assignedAt:Timestamp.now()})));
        totalAllocated+=toAssign.length;
      }
    }
    // Save allocation record
    await addDoc(collection(db,'bulk_allocations'),{
      agentId:CU.id,agentName:CU.username,
      clientIds:selectedClients.map(c=>c.id),clientNames:selectedClients.map(c=>c.name).join(', '),
      rangeIds:selectedRanges,rangeNames,
      qtyPerRange:qty,totalNumbers:totalAllocated,
      payterm,payout,createdAt:Timestamp.now()
    });
    toast(`✅ ${totalAllocated} numbers allocated successfully!`);
    loadRecentAllocations();
  }catch(e){toast('Error: '+e.message,'e');console.error(e);}
};

// ════════════════════════════
// CDR REPORTS
// ════════════════════════════
async function loadCDR(){
  const tb=document.getElementById('cdr-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="10" style="text-align:center;padding:28px;"><div class="spp"></div></td></tr>';
  try{
    const d1=document.getElementById('cdr-d1').value;
    const d2=document.getElementById('cdr-d2').value;
    const rangeF=document.getElementById('cdr-range').value;
    const clientF=document.getElementById('cdr-client').value;
    const numF=document.getElementById('cdr-num').value.trim();
    const cliF=document.getElementById('cdr-cli').value.trim();
    let cons=[orderBy('createdAt','desc'),limit(500)];
    if(CU.role!=='admin') cons=[where('agentId','==',CU.id),...cons];
    if(rangeF) cons=[where('rangeId','==',rangeF),...cons];
    if(clientF) cons=[where('clientId','==',clientF),...cons];
    const snap=await getDocs(query(collection(db,'otp_logs'),...cons));
    let logs=snap.docs.map(d=>({id:d.id,...d.data()}));
    // Client-side filters
    if(d1) logs=logs.filter(l=>{const dt=l.createdAt?.toDate?.();return dt&&dt>=new Date(d1);});
    if(d2) logs=logs.filter(l=>{const dt=l.createdAt?.toDate?.();return dt&&dt<=new Date(d2);});
    if(numF) logs=logs.filter(l=>(l.number||'').includes(numF));
    if(cliF) logs=logs.filter(l=>(l.cli||'').includes(cliF));
    document.getElementById('cdr-cnt').textContent=`${logs.length} records`;
    // Calculate totals
    let totSMS=logs.length,totIn=0,totOut=0,totProfit=0;
    logs.forEach(l=>{
      const pout=parseFloat(l.myPayout||l.payout||SETT.otpRate||0.50);
      const cout=parseFloat(l.clientPayout||0);
      totIn+=pout;totOut+=cout;totProfit+=pout-cout;
    });
    // Show totals
    document.getElementById('cdr-totals').style.display='flex';
    document.getElementById('cdr-tot-sms').textContent=totSMS;
    document.getElementById('cdr-tot-in').textContent='$'+totIn.toFixed(4);
    document.getElementById('cdr-tot-out').textContent='$'+totOut.toFixed(4);
    document.getElementById('cdr-tot-profit').textContent='$'+totProfit.toFixed(4);
    document.getElementById('cdr-foot-totals').style.display='block';
    document.getElementById('cdr-f-sms').textContent=totSMS;
    document.getElementById('cdr-f-usdin').textContent='$'+totIn.toFixed(4);
    document.getElementById('cdr-f-usdout').textContent='$'+totOut.toFixed(4);
    document.getElementById('cdr-f-usdprofit').textContent='$'+totProfit.toFixed(4);
    if(!logs.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#bbb;padding:28px;">No records found</td></tr>';return;}
    const rate=SETT.otpRate||0.50;
    tb.innerHTML=logs.map((l,i)=>{
      const dt=l.createdAt?.toDate?.()?.toLocaleString()||'-';
      const r=allRanges.find(x=>x.id===l.rangeId);
      const mp=parseFloat(l.myPayout||rate).toFixed(4);
      const cp=parseFloat(l.clientPayout||0).toFixed(4);
      const pft=(parseFloat(mp)-parseFloat(cp)).toFixed(4);
      return`<tr>
        <td style="font-size:11px;">${dt}</td>
        <td style="font-size:11.5px;">${r?.range||l.rangeName||'-'}</td>
        <td style="font-family:monospace;font-size:11.5px;">${(l.number||'-').replace(/\d(?=\d{4})/g,'*')}</td>
        <td style="font-size:11.5px;">${l.cli||'-'}</td>
        <td style="font-size:11.5px;">${l.clientName||'-'}</td>
        <td style="font-size:11.5px;text-align:center;">1</td>
        <td style="font-size:11.5px;">${l.currency||'USD'}</td>
        <td style="font-size:11.5px;color:#10b981;">$${mp}</td>
        <td style="font-size:11.5px;color:#f59e0b;">$${cp}</td>
        <td style="font-size:11.5px;font-weight:600;color:var(--p);">$${pft}</td>
      </tr>`;
    }).join('');
  }catch(e){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#ef4444;padding:28px;">Error loading CDR</td></tr>';console.error(e);}
}
window.loadCDR=loadCDR;

window.exportCDR=function(){toast('Export feature - coming soon!','w');};

// ════════════════════════════
// SMS STATS
// ════════════════════════════
async function loadSMSStats(){
  const tb=document.getElementById('stat-tb');if(!tb)return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:25px;"><div class="spp"></div></td></tr>';
  try{
    const groupBy=document.getElementById('stat-group')?.value||'day';
    const d1=document.getElementById('stat-d1')?.value;
    const d2=document.getElementById('stat-d2')?.value;
    let cons=[orderBy('createdAt','desc'),limit(1000)];
    if(CU.role!=='admin') cons=[where('agentId','==',CU.id),...cons];
    const snap=await getDocs(query(collection(db,'otp_logs'),...cons));
    let logs=snap.docs.map(d=>d.data());
    if(d1) logs=logs.filter(l=>{const dt=l.createdAt?.toDate?.();return dt&&dt>=new Date(d1);});
    if(d2) logs=logs.filter(l=>{const dt=l.createdAt?.toDate?.();return dt&&dt<=new Date(d2);});
    const rate=SETT.otpRate||0.50;
    const grouped={};
    logs.forEach(l=>{
      const dt=l.createdAt?.toDate?.()??new Date();
      let key;
      if(groupBy==='day') key=dt.toISOString().split('T')[0];
      else if(groupBy==='month') key=dt.toISOString().substring(0,7);
      else if(groupBy==='range') key=l.rangeName||l.rangeId||'Unknown';
      else if(groupBy==='client') key=l.clientName||'Unknown';
      if(!grouped[key]) grouped[key]={count:0,myPayout:0,clientPayout:0};
      grouped[key].count++;
      grouped[key].myPayout+=parseFloat(l.myPayout||rate);
      grouped[key].clientPayout+=parseFloat(l.clientPayout||0);
    });
    const rows=Object.entries(grouped).sort((a,b)=>b[1].count-a[1].count);
    if(!rows.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#bbb;padding:25px;">No data</td></tr>';return;}
    tb.innerHTML=rows.map(([k,v])=>`<tr>
      <td style="font-size:12.5px;font-weight:600;">${k}</td>
      <td style="font-size:12.5px;text-align:center;">${v.count}</td>
      <td style="font-size:12px;color:#10b981;">$${v.myPayout.toFixed(4)}</td>
      <td style="font-size:12px;color:#f59e0b;">$${v.clientPayout.toFixed(4)}</td>
      <td style="font-size:12px;font-weight:600;color:var(--p);">$${(v.myPayout-v.clientPayout).toFixed(4)}</td>
    </tr>`).join('');
    // Render chart
    if(window._statCh){window._statCh.destroy();}
    const top10=rows.slice(0,10);
    window._statCh=new ApexCharts(document.getElementById('stat-chart'),{
      series:[{name:'SMS',data:top10.map(r=>r[1].count)}],
      chart:{type:'bar',height:260,toolbar:{show:false}},
      colors:['#6f42c1'],
      plotOptions:{bar:{borderRadius:6,columnWidth:'50%'}},
      xaxis:{categories:top10.map(r=>r[0].length>15?r[0].substring(0,15)+'...':r[0]),labels:{style:{fontSize:'10px'}}},
      yaxis:{labels:{show:false}},grid:{borderColor:'#f5f3ff'},tooltip:{theme:'light'}
    });
    window._statCh.render();
  }catch(e){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:25px;">Error</td></tr>';console.error(e);}
}
window.loadSMSStats=loadSMSStats;

window.confirmDel=function(msg2,cb){
  document.getElementById('del-msg').textContent=msg2;
  document.getElementById('del-ok').onclick=function(){bootstrap.Modal.getInstance(document.getElementById('delModal'))?.hide();cb();};
  new bootstrap.Modal(document.getElementById('delModal')).show();
};

// ════════════════════════════
// STARTUP
// ════════════════════════════
async function startup(){
  const ftyr=document.getElementById('ftyr');
  if(ftyr)ftyr.textContent=new Date().getFullYear();
  onAuthStateChanged(auth,async(firebaseUser)=>{
    if(appInited)return;
    if(firebaseUser){
      try{
        let snap=await getDoc(doc(db,'users',firebaseUser.uid));
        if(!snap.exists()){
          const qSnap=await getDocs(query(collection(db,'users'),where('email','==',firebaseUser.email)));
          if(!qSnap.empty){snap={id:qSnap.docs[0].id,exists:()=>true,data:()=>qSnap.docs[0].data()};}
        }
        if(snap.exists()&&snap.data().status==='active'){
          appInited=true;
          await initApp({id:snap.id,...snap.data()});
        }else{
          await signOut(auth);
          window.location.href='/login';
        }
      }catch(e){
        console.error('Auth error:',e);
        setTimeout(()=>{if(!appInited)window.location.href='/login';},3000);
      }
    }else{
      window.location.href='/login';
    }
  });
}

startup();

window.addEventListener('popstate',function(){
  if(!CU)return;
  const params=new URLSearchParams(window.location.search);
  const pg=params.get('page');
  if(pg)go(pg);
});

// Copy protection
(function(){
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('selectstart',function(e){const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;e.preventDefault();return false;});
  document.addEventListener('copy',function(e){const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;e.preventDefault();return false;});
  document.addEventListener('keydown',function(e){
    const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;
    if(e.ctrlKey&&['u','s','a','c','p'].includes(e.key)){e.preventDefault();return false;}
    if(e.key==='F12'){e.preventDefault();return false;}
    if(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key)){e.preventDefault();return false;}
  });
})();

// ════════════════════
// PAGINATION & EXPORT
// ════════════════════
function pgRender(containerId,total,cur,per,fn){
  const el=document.getElementById(containerId);if(!el)return;
  const totalPg=per==='all'?1:Math.ceil(total/per);
  if(totalPg<=1){el.innerHTML=`<div style="padding:8px 14px;font-size:11.5px;color:#aaa;">Total: ${total} records</div>`;return;}
  let h=`<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:10px 14px;">`;
  const btn=(lbl,pg,dis,act)=>`<button class="pgbtn${act?' pgact':''}${dis?' pgdis':''}" onclick="${fn}(${pg})" ${dis?'disabled':''}>${lbl}</button>`;
  h+=btn('First',1,cur===1,false);h+=btn('Prev',cur-1,cur===1,false);
  const s=Math.max(1,cur-2),e=Math.min(totalPg,cur+2);
  for(let i=s;i<=e;i++)h+=btn(i,i,false,i===cur);
  h+=btn('Next',cur+1,cur===totalPg,false);h+=btn('Last',totalPg,cur===totalPg,false);
  h+=`<span style="font-size:11px;color:#aaa;margin-left:8px;">Page ${cur}/${totalPg} • ${total} records</span></div>`;
  el.innerHTML=h;
}
function exportCSV(data,filename){if(!data.length){toast('No data!','w');return;}const keys=Object.keys(data[0]);const csv=[keys.join(','),...data.map(r=>keys.map(k=>'"'+(String(r[k]||'').replace(/"/g,'""'))+'"').join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=filename+'.csv';a.click();toast('CSV downloaded! ✅');}
function exportExcel(data,filename){if(!data.length){toast('No data!','w');return;}const keys=Object.keys(data[0]);let h='<table><tr>'+keys.map(k=>`<th>${k}</th>`).join('')+'</tr>';h+=data.map(r=>'<tr>'+keys.map(k=>`<td>${r[k]||''}</td>`).join('')+'</tr>').join('')+'</table>';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'application/vnd.ms-excel'}));a.download=filename+'.xls';a.click();toast('Excel downloaded! ✅');}

// Copy protection
(function(){
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('selectstart',function(e){const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;e.preventDefault();return false;});
  document.addEventListener('copy',function(e){const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;e.preventDefault();return false;});
  document.addEventListener('keydown',function(e){
    const t=e.target.tagName.toLowerCase();if(t==='input'||t==='textarea')return true;
    if(e.ctrlKey&&['u','s','a','c','p'].includes(e.key)){e.preventDefault();return false;}
    if(e.key==='F12'){e.preventDefault();return false;}
    if(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key)){e.preventDefault();return false;}
  });
})();
