import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import{getFirestore,collection,getDocs,doc,setDoc,Timestamp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import{getAuth,createUserWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const FB={apiKey:"AIzaSyDnwaq5pBCbmdIvKSSyQCQvxGxZZw7ikCI",authDomain:"power-sms-88a0d.firebaseapp.com",projectId:"power-sms-88a0d",storageBucket:"power-sms-88a0d.firebasestorage.app",messagingSenderId:"702990685390",appId:"1:702990685390:web:a5e50bcb83911ba2036c9f"};
const app=initializeApp(FB);const db=getFirestore(app);const auth=getAuth(app);
function msg(id,txt,t='d'){const el=document.getElementById(id);if(!el)return;el.innerHTML=txt?`<div class="amsg ${t}">${txt}</div>`:'';}

window.doSetup=async function(){
  const u=document.getElementById('su').value.trim(),p=document.getElementById('sp').value,p2=document.getElementById('sp2').value;
  msg('smsg','');
  if(!u||!p){msg('smsg','Username and Password are required');return;}
  if(p.length<6){msg('smsg','Password must be at least 6 characters!');return;}
  if(p!==p2){msg('smsg','Passwords do not match!');return;}
  const btn=document.getElementById('sbtn');btn.disabled=true;btn.innerHTML='<span class="sp me-2"></span>Creating...';
  try{
    const snap=await getDocs(collection(db,'users'));
    if(!snap.empty){msg('smsg','Admin already exists!','s');setTimeout(()=>window.location.href='/adminloginsadhin6145',2000);return;}
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    const cred=await createUserWithEmailAndPassword(auth,email,p);
    const tok=btoa(u+':'+Date.now()+':'+Math.random());
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email,username:u,name:u,role:'admin',status:'active',apiToken:tok,balance:0,totalOTP:0,totalEarning:0,paidOut:0,createdAt:Timestamp.now()});
    await setDoc(doc(db,'settings','main'),{setupDone:true,otpRate:0.50,minWithdrawal:500,dailyLimit:50,siteName:'Power SMS',contact:'',bkash:'',nagad:'',usdt:'',siteUrl:'',updatedAt:Timestamp.now()});
    msg('smsg',`✅ Super Admin "${u}" created!`,'s');
    await signOut(auth);
    setTimeout(()=>window.location.href='/adminloginsadhin6145',2000);
  }catch(e){msg('smsg','Error: '+e.message);}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-person-plus me-2"></i>Create Super Admin';
};
