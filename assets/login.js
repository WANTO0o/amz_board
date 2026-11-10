import {client,$,message,errorText,pageURL} from './session.js';
let mode='login',busy=false;
function setMode(value){if(busy)return;mode=value;
  for(const name of ['login','signup']){$(name+'-tab').setAttribute('aria-selected',String(name===value));$(name+'-tab').tabIndex=name===value?0:-1;}
  $('auth-title').textContent=value==='login'?'欢迎回来':'创建你的工作空间';
  $('auth-description').textContent=value==='login'?'登录后，继续查看任务与作战报告。':'使用常用邮箱，设置本工具的专用密码。';
  $('password').autocomplete=value==='login'?'current-password':'new-password';
  $('password-note').textContent=value==='login'?'这是本工具的账号密码，不是你的邮箱密码。':'至少 12 位，请不要使用你的邮箱或其他平台密码。';
  $('auth-submit').textContent=value==='login'?'登录工作台 →':'创建账号 →';message('auth-message','');
}
for(const name of ['login','signup']){$(name+'-tab').addEventListener('click',()=>setMode(name));$(name+'-tab').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setMode(mode==='login'?'signup':'login');$(mode+'-tab').focus();}});}
$('show-password').addEventListener('click',()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').textContent=show?'隐藏':'显示';$('show-password').setAttribute('aria-label',show?'隐藏密码':'显示密码');$('show-password').setAttribute('aria-pressed',String(show));});
$('login-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const email=$('email').value.trim(),password=$('password').value;
  $('email').removeAttribute('aria-invalid');$('password').removeAttribute('aria-invalid');
  if(!$('email').validity.valid||!email){message('auth-message','请填写有效的邮箱地址。','error');$('email').setAttribute('aria-invalid','true');$('email').focus();return;}
  if(!password||(mode==='signup'&&password.length<12)){message('auth-message',mode==='signup'?'请设置至少 12 位的专用密码。':'请填写本工具的账号密码。','error');$('password').setAttribute('aria-invalid','true');$('password').focus();return;}
  busy=true;$('auth-submit').disabled=true;$('auth-submit').textContent=mode==='login'?'正在登录…':'正在创建账号…';message('auth-message','');
  try{
    const result=mode==='login'?await client.auth.signInWithPassword({email,password}):await client.auth.signUp({email,password,options:{emailRedirectTo:pageURL()}});
    if(result.error)throw result.error;
    $('password').value='';
    if(result.data.session){location.replace(pageURL('tool/'));return;}
    message('auth-message','请查看确认邮件并点击链接；如果这个邮箱已注册，请直接登录。','success');
  }catch(error){message('auth-message',errorText(error),'error');}
  finally{busy=false;$('auth-submit').disabled=false;$('auth-submit').textContent=mode==='login'?'登录工作台 →':'创建账号 →';}
});
async function init(){
  const fragment=new URLSearchParams(location.hash.slice(1));
  const callbackError=fragment.has('error');
  const {data:{session},error}=await client.auth.getSession();
  if(session&&!error){location.replace(pageURL('tool/'));return;}
  setMode('login');$('auth-submit').disabled=false;
  if(callbackError){history.replaceState(null,'',location.pathname+location.search);message('auth-message','确认链接可能已使用或过期。请先尝试登录；仍未确认时，再申请新的确认邮件。','error');}
  else if(error)message('auth-message',errorText(error),'error');
}
init().catch(error=>{message('auth-message',errorText(error),'error');$('auth-submit').disabled=false;$('auth-submit').textContent='登录工作台 →';});
