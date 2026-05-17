import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import{getFirestore,collection,getDocs,doc,setDoc,getDoc,updateDoc,query,where,Timestamp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import{getAuth,createUserWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const FB={apiKey:"AIzaSyDnwaq5pBCbmdIvKSSyQCQvxGxZZw7ikCI",authDomain:"power-sms-88a0d.firebaseapp.com",projectId:"power-sms-88a0d",storageBucket:"power-sms-88a0d.firebasestorage.app",messagingSenderId:"702990685390",appId:"1:702990685390:web:a5e50bcb83911ba2036c9f"};
const app=initializeApp(FB);const db=getFirestore(app);const auth=getAuth(app);

let INV_TOKEN=null,INV_ROLE='agent';
function msg(id,txt,t='d'){const el=document.getElementById(id);if(!el)return;el.innerHTML=txt?`<div class="amsg ${t}">${txt}</div>`:'';}

if(invId){
  (async()=>{
    try{
      const invDoc=await getDoc(doc(db,'invite_links',invId));
      if(invDoc.exists()&&invDoc.data().status==='active'){
        // Check expiry only if expiresAt exists
        const expAt=invDoc.data().expiresAt?.toDate?.();
        if(expAt&&expAt<new Date()){
          msg('rmsg','This invite link has expired!');
          document.getElementById('rform').style.display='none';return;
        }
        INV_TOKEN=invId;INV_ROLE=invDoc.data().role||'agent';
        const badge=document.getElementById('reg-role-badge');
        if(INV_ROLE==='client'){badge.innerHTML='<i class="bi bi-person-fill me-1"></i>Client Registration';badge.style.background='#dbeafe';badge.style.color='#1e40af';}
      }else{msg('rmsg','Invalid or expired invite link!');document.getElementById('rform').style.display='none';}
    }catch(e){window.location.href='/login';}
  })();
}else{window.location.href='/login';}

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
    if(!usnap.empty){msg('rmsg','Username already taken!');btn.disabled=false;btn.innerHTML='<i class="bi bi-person-check me-2"></i>Create Account';return;}
    const invDoc=await getDoc(doc(db,'invite_links',INV_TOKEN));
    const agentId=invDoc.data()?.agentId||null;
    const agentName=invDoc.data()?.agentName||null;
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    const cred=await createUserWithEmailAndPassword(auth,email,p);
    const tok=btoa(u+':'+Date.now()+':'+Math.random());
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email,username:u,name:n||u,role:INV_ROLE||'agent',status:'active',apiToken:tok,balance:0,totalOTP:0,totalEarning:0,paidOut:0,agentId,agentName,dailyTaken:{date:'',count:0},createdAt:Timestamp.now()});
    await updateDoc(doc(db,'invite_links',INV_TOKEN),{status:'used',usedBy:u,usedAt:Timestamp.now()});
    msg('rmsg',`✅ Account "${u}" created! Please login.`,'s');
    await signOut(auth);
    setTimeout(()=>window.location.href='/login',2000);
  }catch(e){msg('rmsg','Error: '+e.message);}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-person-check me-2"></i>Create Account';
};
