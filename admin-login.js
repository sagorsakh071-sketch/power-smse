import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import{getFirestore,doc,getDoc}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const FB={apiKey:"AIzaSyDnwaq5pBCbmdIvKSSyQCQvxGxZZw7ikCI",authDomain:"power-sms-88a0d.firebaseapp.com",projectId:"power-sms-88a0d",storageBucket:"power-sms-88a0d.firebasestorage.app",messagingSenderId:"702990685390",appId:"1:702990685390:web:a5e50bcb83911ba2036c9f"};
const app=initializeApp(FB);const db=getFirestore(app);const auth=getAuth(app);

function msg(id,txt,t='d'){const el=document.getElementById(id);if(!el)return;el.innerHTML=txt?`<div class="amsg ${t}">${txt}</div>`:'';}

window.doLogin=async function(){
  const u=document.getElementById('lu').value.trim(),p=document.getElementById('lp').value;
  msg('lmsg','');
  if(!u||!p){msg('lmsg','Username and Password are required');return;}
  if(window.checkCap&&!window.checkCap()){
    msg('lmsg','Wrong verification answer!');
    if(window.resetCap)window.resetCap();return;
  }
  const btn=document.getElementById('lbtn');btn.disabled=true;btn.innerHTML='<span class="sp me-2"></span>Signing in...';
  try{
    const email=u.toLowerCase().replace(/[^a-z0-9]/g,'')+'@powersms.app';
    let firebaseUser;
    try{const cred=await signInWithEmailAndPassword(auth,email,p);firebaseUser=cred.user;}
    catch(e){msg('lmsg','Username or Password is incorrect!');if(window.resetCap)window.resetCap();btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';return;}
    const snap=await getDoc(doc(db,'users',firebaseUser.uid));
    if(!snap.exists()){await signOut(auth);msg('lmsg','Access denied!');if(window.resetCap)window.resetCap();btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';return;}
    const ud=snap.data();
    if(ud.role!=='admin'){await signOut(auth);msg('lmsg','Access denied!');if(window.resetCap)window.resetCap();btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';return;}
    if(ud.status==='inactive'){await signOut(auth);msg('lmsg','Account is inactive!');btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';return;}
    msg('lmsg','✅ Login successful!','s');
    setTimeout(()=>{window.location.href='/dashboard';},1000);
  }catch(e){msg('lmsg','Error: '+e.message);if(window.resetCap)window.resetCap();}
  btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
};

onAuthStateChanged(auth,async(user)=>{
  if(user){
    try{
      const snap=await getDoc(doc(db,'users',user.uid));
      if(snap.exists()&&snap.data().status==='active'&&snap.data().role==='admin'){
        window.location.href='/dashboard';return;
      }else{await signOut(auth);}
    }catch(e){}
  }
});
