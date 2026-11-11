import {validateSettings} from './settings-schema.js';
import {client,$,message,errorText,dateLabel} from './session.js';
let selected=null,busy=false,requestVersion=0,refreshTasks=async()=>{};
const dialog=$('budget-dialog');
function budgetError(error){
  const text=String(error?.message||'');
  const errors={BUDGET_OPERATOR_REQUIRED:'当前账号未获得本工具的费用使用权限，请使用项目所有者账号。',TASK_NOT_FOUND:'任务不存在或不属于当前账号。',TASK_NOT_PENDING:'任务已开始或已结束，请刷新列表查看。',BUDGET_CONFIRM_REQUIRED:'费用方案已更新，请关闭窗口后重新查看并确认。',EXPORT_DATE_INVALID:'请选择有效的报表导出日期，不能晚于今天。',ATTRIBUTION_INVALID:'请选择报表归因方式。'};
  for(const [key,value] of Object.entries(errors))if(text.includes(key))return value;
  if(['PGRST202','PGRST205'].includes(error?.code))return '预算服务尚未完成初始化，请稍后刷新。';
  return errorText(error)+' 如确认结果不确定，请刷新任务列表；重复确认不会创建第二个任务。';
}
function toggleDate(){$('export-date-field').hidden=$('attribution-mode').value!=='export_date';}
export function configureBudget(refresh){refreshTasks=refresh;}
export async function openBudget(task){
  if(busy||dialog.open)return;
  const version=++requestVersion;
  selected=null;$('budget-task').textContent=task.asin+' · '+dateLabel(task.created_at);
  $('budget-form').reset();toggleDate();$('budget-confirm').disabled=true;$('budget-options').hidden=true;
  message('budget-message','正在读取本次费用方案…');dialog.showModal();
  try{
    const {data,error}=await client.rpc('amz_budget_quote',{p_task_id:task.id});if(error)throw error;
    if(!dialog.open||version!==requestVersion)return;
    if(!['20words-v1','configured-v1'].includes(data.policy_version)||(data.policy_version==='20words-v1'&&(data.keyword_limit!==20||data.max_credits!==200||Number(data.max_model_cny)!==0.5))){message('budget-message','费用方案已更新，请刷新网页后重新查看。','error');return;}
    if(data.status!=='待处理'){message('budget-message','任务已开始或已结束，请关闭窗口后刷新列表。');return;}
    if(!data.can_approve){message('budget-message','当前账号未获得本工具的费用使用权限，请使用项目所有者账号。','error');return;}
    if(data.approval&&Date.parse(data.approval.expires_at)>Date.now()){
      message('budget-message','这条任务的预算已经确认，后台会自动处理，无需再次批准。','success');await refreshTasks();return;
    }
    if(data.policy_version==='configured-v1'){const c=validateSettings(data.config);if(c.keywordLimit!==data.keyword_limit||c.maxCredits!==data.max_credits||c.maxModelCny!==Number(data.max_model_cny))throw Error('费用报价与配置不一致');}
    const costs=document.querySelectorAll('.budget-costs strong');costs[0].textContent=`美国站 · 最多${data.keyword_limit}词`;costs[1].textContent=data.max_credits+' Credits';costs[2].textContent='¥'+Number(data.max_model_cny).toFixed(2);
    $('budget-scope-note').textContent=`按实际使用计费，并非扣满预算。仅分析西柚流量前${data.keyword_limit}词；趋势${data.config?.trendWeeks??13}周。02${data.config?.organicEnabled?'开启，每词最多'+data.config.organicMaxAsins+'个ASIN':'关闭'}。配置版本${data.settings_version??'旧版'}。OSS存储和访问另计，不自动充值。`;
    selected={id:task.id,version:data.policy_version,settingsVersion:data.settings_version};$('budget-options').hidden=false;
    $('budget-accept').checked=false;$('budget-confirm').disabled=true;message('budget-message','');
  }catch(error){if(dialog.open&&version===requestVersion)message('budget-message',budgetError(error),'error');}
}
dialog.addEventListener('close',()=>{requestVersion++;selected=null;});
$('budget-cancel').addEventListener('click',()=>{if(!busy)dialog.close();});
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('attribution-mode').addEventListener('change',()=>{toggleDate();message('budget-message','');});
$('export-date').addEventListener('input',()=>message('budget-message',''));
$('budget-accept').addEventListener('change',()=>{$('budget-confirm').disabled=busy||!selected||!$('budget-accept').checked;});
$('budget-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!selected||!$('budget-accept').checked)return;
  const mode=$('attribution-mode').value,date=mode==='export_date'?$('export-date').value:null;
  if(mode==='export_date'&&(!date||Date.parse(date)>Date.now())){message('budget-message','请填写有效的报表导出日期，不能晚于今天。','error');return;}
  busy=true;$('budget-confirm').disabled=true;$('budget-cancel').disabled=true;$('budget-confirm').textContent='正在确认…';
  $('attribution-mode').disabled=true;$('export-date').disabled=true;$('budget-accept').disabled=true;
  try{
    const {error}=await client.rpc(selected.version==='configured-v1'?'amz_approve_configured_task':'amz_approve_task',{p_task_id:selected.id,p_policy_version:selected.version,p_accept_budget:true,p_attribution_mode:mode,p_exported_at:date,...(selected.version==='configured-v1'?{p_settings_version:selected.settingsVersion}:{})});
    if(error)throw error;
    dialog.close();message('submit-message','预算已确认，任务已进入自动处理队列。可关闭网页，后台会继续运行；稍后在任务列表查看报告。','success');
    await refreshTasks();
  }catch(error){message('budget-message',budgetError(error),'error');}
  finally{busy=false;$('budget-confirm').disabled=!$('budget-accept').checked;$('budget-cancel').disabled=false;$('budget-confirm').textContent='确认预算并开始';$('attribution-mode').disabled=false;$('export-date').disabled=false;$('budget-accept').disabled=false;}
});
