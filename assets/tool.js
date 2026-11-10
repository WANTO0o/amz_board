import {client,$,message,errorText,pageURL,requireUser,dateLabel,pageFailure} from './session.js';
import {configureBudget,openBudget} from './budget.js';
let user,page=0,total=0,listBusy=false,submitBusy=false,selectedFile=null,pending=null;
const statuses={'待处理':'neutral','进行中':'blue','已完成':'green','失败':'red'};
const fileLimit=20*1024*1024;
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function validateFile(file){if(!file)return '请先选择一份广告报表。';if(!/\.(xlsx|csv)$/i.test(file.name))return '只支持 .xlsx 或 .csv 报表。';if(file.size===0)return '文件是空的，请重新导出报表。';if(file.size>fileLimit)return '文件超过 20 MB，请缩小报表日期范围后再上传。';return null;}
function pick(file){if(submitBusy||pending)return;const error=validateFile(file);if(error){selectedFile=null;$('report-file').value='';message('submit-message',error,'error');return;}
  selectedFile=file;$('file-title').textContent=file.name;$('file-note').textContent=`${(file.size/1024/1024).toFixed(2)} MB · 已选择`;message('submit-message','');}
$('report-file').addEventListener('change',()=>pick($('report-file').files[0]));
for(const type of ['dragenter','dragover'])$('drop-zone').addEventListener(type,e=>{e.preventDefault();$('drop-zone').classList.add('dragover');});
for(const type of ['dragleave','drop'])$('drop-zone').addEventListener(type,e=>{e.preventDefault();$('drop-zone').classList.remove('dragover');if(type==='drop'){if(e.dataTransfer.files.length!==1){message('submit-message','每次请选择一份报表。','error');return;}pick(e.dataTransfer.files[0]);}});
$('asin').addEventListener('input',()=>{$('asin').value=$('asin').value.toUpperCase().replace(/\s/g,'');$('asin').removeAttribute('aria-invalid');});
function savePending(){sessionStorage.setItem('amz-pending-'+user.id,JSON.stringify(pending));}
function unlock(){pending=null;sessionStorage.removeItem('amz-pending-'+user.id);$('asin').disabled=false;$('report-file').disabled=false;$('submit-task').textContent='提交分析任务 ↗';}
async function reconcile(){
  const {data,error}=await client.from('amz_tasks').select('id').eq('id',pending.id).eq('user_id',user.id).maybeSingle();if(error)throw error;
  if(data){unlock();message('submit-message','任务已提交。请在下方点击“确认预算并开始”，之后后台会自动分析。','success');page=0;await refresh();return true;}return false;
}
async function finishInsert(){
  if(await reconcile())return;
  const {error}=await client.from('amz_tasks').insert({id:pending.id,user_id:user.id,asin:pending.asin,report_file_path:pending.path,status:'待处理'});
  if(error){if(await reconcile())return;throw error;}
  unlock();selectedFile=null;$('report-file').value='';$('file-title').textContent='点击选择，或拖拽报表到这里';$('file-note').textContent='支持 .xlsx / .csv，最大 20 MB';message('submit-message','任务已提交。请在下方点击“确认预算并开始”，之后后台会自动分析。','success');page=0;await refresh();
}
$('task-form').addEventListener('submit',async e=>{
  e.preventDefault();if(submitBusy)return;message('submit-message','');
  if(!pending){const asin=$('asin').value.trim().toUpperCase();if(!/^B0[A-Z0-9]{8}$/.test(asin)){message('submit-message','ASIN 应为 B0 开头的 10 位字母或数字。','error');$('asin').setAttribute('aria-invalid','true');$('asin').focus();return;}
    const error=validateFile(selectedFile);if(error){message('submit-message',error,'error');$('report-file').focus();return;}
    const id=crypto.randomUUID();pending={id,userId:user.id,asin,path:`${user.id}/${id}.${selectedFile.name.split('.').pop().toLowerCase()}`,phase:'uploading'};savePending();}
  submitBusy=true;$('submit-task').disabled=true;$('asin').disabled=true;$('report-file').disabled=true;
  try{
    if(pending.phase==='uploading'){
      if(!selectedFile){message('submit-message','上次上传结果尚未确认。请刷新页面核对恢复提示，避免重复提交。','error');return;}
      $('submit-task').textContent='正在上传报表…';
      const {error}=await client.storage.from('amz-inbox').upload(pending.path,selectedFile,{upsert:false,contentType:pending.path.endsWith('.csv')?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      if(error){pending.phase='uncertainUpload';savePending();throw error;}
      pending.phase='uploaded';savePending();
    }
    if(pending.phase==='uncertainUpload'){
      $('submit-task').textContent='正在核对上传…';
      const {data,error}=await client.storage.from('amz-inbox').list(user.id,{search:pending.id,limit:10});if(error)throw error;
      const fileName=pending.path.split('/').pop();
      if(!data.some(item=>item.name===fileName)){unlock();message('submit-message','没有找到上次上传的文件。请重新选择报表后提交。','error');return;}
      pending.phase='uploaded';savePending();
    }
    $('submit-task').textContent='正在提交任务…';await finishInsert();
  }catch(error){message('submit-message',errorText(error)+' 上传或提交结果可能尚未确认，请点击“核对并继续提交”，不要重复新建。','error');}
  finally{submitBusy=false;$('submit-task').disabled=false;if(pending)$('submit-task').textContent='核对并继续提交';}
});
async function refresh(){
  if(listBusy)return;listBusy=true;$('refresh').disabled=true;
  try{
    let {data,error,count}=await client.from('amz_tasks').select('id,asin,status,created_at,failure_reason,report_url,progress_message,completed_keywords,total_keywords,credits_used,model_calls,amz_task_approvals(approved_at,expires_at)',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*10,page*10+9);
    if(error&&['PGRST200','PGRST204','42703'].includes(error.code)){
      ({data,error,count}=await client.from('amz_tasks').select('id,asin,status,created_at,failure_reason,report_url',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*10,page*10+9));
    }
    if(error)throw error;total=count??0;$('task-rows').replaceChildren();
    if(!data.length){const tr=el('tr'),td=el('td',page===0?'还没有分析任务。从上方上传第一份报表开始。':'这一页没有任务，请返回上一页。','table-message');td.colSpan=4;tr.append(td);$('task-rows').append(tr);}
    for(const task of data){const tr=el('tr'),state=el('td'),report=el('td');state.append(el('span',task.status,'pill '+(statuses[task.status]||'neutral')));
      if(task.status==='失败'&&task.failure_reason)state.append(el('p',task.failure_reason,'task-error'));
      if(task.status==='待处理'){
        const approval=Array.isArray(task.amz_task_approvals)?task.amz_task_approvals[0]:task.amz_task_approvals;
        if(approval&&Date.parse(approval.expires_at)>Date.now())state.append(el('p','预算已确认 · 排队中','task-note'));
        else{state.append(el('p',approval?'预算已过期，请重新确认':'确认本次预算后自动开始','task-note'));
          const button=el('button',approval?'重新确认预算':'确认预算并开始','button secondary small-button budget-trigger');button.type='button';button.addEventListener('click',()=>openBudget(task));state.append(button);}
      }
      if(task.status==='进行中')state.append(el('p',(task.progress_message||'正在处理')+(task.total_keywords?' · '+(task.completed_keywords||0)+'/'+task.total_keywords+'词':''),'task-note'));
      if(task.status==='已完成'&&task.credits_used!==null&&task.credits_used!==undefined)state.append(el('p','西柚 '+task.credits_used+' Credits · 模型 '+(task.model_calls||0)+'次','task-note'));
      if(task.status==='已完成'&&task.report_url){const a=el('a','查看报告 ↗','report-link');a.href=pageURL('report/?task='+encodeURIComponent(task.id));report.append(a);}else report.append(el('span',task.status==='已完成'?'暂无报告':'—','muted small'));
      tr.append(el('td',task.asin,'asin-cell'),el('td',dateLabel(task.created_at),'task-time'),state,report);$('task-rows').append(tr);}
    $('task-total').textContent=`共 ${total} 条任务`;$('page-number').textContent=`第 ${page+1} / ${Math.max(1,Math.ceil(total/10))} 页`;$('previous').disabled=page===0;$('next').disabled=(page+1)*10>=total;$('last-updated').textContent='更新于 '+new Date().toLocaleTimeString('zh-CN',{hour12:false});message('list-message','');
  }catch(error){message('list-message',errorText(error)+' 当前列表暂未更新。','error');}
  finally{listBusy=false;$('refresh').disabled=false;}
}
configureBudget(refresh);
$('refresh').addEventListener('click',refresh);$('previous').addEventListener('click',()=>{if(page>0&&!listBusy){page--;refresh();}});$('next').addEventListener('click',()=>{if(!listBusy&&(page+1)*10<total){page++;refresh();}});
async function init(){user=await requireUser();if(!user)return;$('account-email').textContent=user.email||'';$('workspace').hidden=false;$('page-loading').hidden=true;$('submit-task').disabled=false;
  try{const saved=JSON.parse(sessionStorage.getItem('amz-pending-'+user.id)||'null');if(saved?.userId===user.id&&/^[0-9a-f-]{36}$/.test(saved.id)&&/^B0[A-Z0-9]{8}$/.test(saved.asin)&&['xlsx','csv'].some(ext=>saved.path===`${user.id}/${saved.id}.${ext}`))pending=saved;}catch{}
  if(pending){if(pending.phase==='uploading')pending.phase='uncertainUpload';savePending();$('asin').value=pending.asin;$('asin').disabled=true;$('report-file').disabled=true;$('submit-task').textContent='核对并继续提交';message('submit-message','检测到上次未完成的提交，点击按钮核对并继续；会沿用原任务编号，避免重复任务。');}
  await refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
init().catch(error=>pageFailure(errorText(error)));
