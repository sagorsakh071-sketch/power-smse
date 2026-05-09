<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Power SMS</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body style="min-height:100vh;background:linear-gradient(135deg,#4a1f8c 0%,#6f42c1 60%,#9b59b6 100%);display:flex;align-items:center;justify-content:center;padding:20px;">
<div class="tc" id="tc"></div>
<div class="bubbles"><div class="bubble b1"></div><div class="bubble b2"></div><div class="bubble b3"></div><div class="bubble b4"></div><div class="bubble b5"></div></div>
<div class="aw"><div class="ac">
  <div class="bb-box"><div class="bb-icon">⚡</div><div class="bb-name">Power <em>SMS</em></div><div class="bb-sub">POWER SMS &bull; PREMIUM PANEL</div></div>
  <div id="lmsg"></div>
  <div class="mbf"><label class="fl"><i class="bi bi-person me-1"></i>Username</label><input type="text" id="lu" class="fc" placeholder="Username" autocomplete="username"></div>
  <div class="mbf"><label class="fl"><i class="bi bi-lock me-1"></i>Password</label><div class="ig"><input type="password" id="lp" class="fc" placeholder="Password"><button class="eyebtn" onclick="tEye('lp','lei')"><i class="bi bi-eye-slash" id="lei"></i></button></div></div>
  <button class="btn-auth" id="lbtn" onclick="doLogin()"><i class="bi bi-box-arrow-in-right me-2"></i>Sign In</button>
  <div class="afoot">Power SMS &copy; <span id="lyr"></span></div>
</div></div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
window.tEye=function(pi,ii){const p=document.getElementById(pi),i=document.getElementById(ii);if(!p||!i)return;p.type=p.type==='password'?'text':'password';i.className=p.type==='password'?'bi bi-eye-slash':'bi bi-eye';};
window.onload=function(){const lyr=document.getElementById('lyr');if(lyr)lyr.textContent=new Date().getFullYear();};
</script>
<script type="module" src="/login.js"></script>
</body></html>
