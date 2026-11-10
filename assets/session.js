import {createClient} from '../vendor/supabase.js';
import {PUBLIC_CONFIG} from './config.js';
export const baseURL=new URL('../',import.meta.url);
export const pageURL=(path='')=>new URL(path,baseURL).href;
export const client=createClient(PUBLIC_CONFIG.supabaseUrl,PUBLIC_CONFIG.publishableKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'amz-board-auth-v1'},
  global:{fetch:(input,options={})=>fetch(input,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)})}
});
export const $=id=>document.getElementById(id);
export function message(id,text,type='info'){const el=$(id);el.textContent=text;el.className='message '+type;el.hidden=!text;}
export function errorText(error){
  const code=error?.code||'',text=String(error?.message||'');
  if(code==='invalid_credentials'||/Invalid login credentials/i.test(text))return '邮箱或密码不对，请检查后重试。';
  if(code==='email_not_confirmed')return '邮箱还没有确认，请先点击注册邮件里的确认链接。';
  if(code==='user_already_exists'||/already registered/i.test(text))return '这个邮箱已注册，请切换到登录。';
  if(code==='weak_password'||/Password should/i.test(text))return '密码强度不足，请设置至少 12 位的专用密码。';
  if(/rate|too many/i.test(code+' '+text)||error?.status===429)return '请求有些频繁，请稍后再试。';
  if(/signup_disabled|email_provider_disabled/.test(code))return '目前暂未开放注册，请联系工具管理员。';
  if(/invalid.*email|email.*invalid/i.test(code+' '+text))return '邮箱格式不正确，请重新填写。';
  if(/fetch|network|timeout|abort/i.test(text)||error?.name==='AbortError'||error?.name==='TimeoutError')return '网络连接暂时不稳定，请检查网络后重试。';
  if(error?.status===401||code==='PGRST301')return '登录已过期，请退出后重新登录。';
  return '暂时无法完成操作，请稍后重试。';
}
export async function requireUser(){
  const {data:{session},error}=await client.auth.getSession();
  if(error)throw error;
  if(!session){location.replace(pageURL());return null;}
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError)throw userError;
  if(!user){location.replace(pageURL());return null;}
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace(pageURL());});
  const logout=$('logout');if(logout){logout.disabled=false;logout.addEventListener('click',async()=>{
    logout.disabled=true;const {error}=await client.auth.signOut({scope:'local'});
    if(error){logout.disabled=false;logout.textContent='退出失败，请重试';return;}
    location.replace(pageURL());
  });}
  return user;
}
export function dateLabel(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date):'时间未知';}
export function pageFailure(text){$('page-loading').textContent=text;const a=document.createElement('a');a.href=pageURL();a.textContent=' 返回登录';$('page-loading').append(a);}
