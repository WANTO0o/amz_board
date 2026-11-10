import {client,$,message,errorText,requireUser,dateLabel,pageFailure} from './session.js';
import {PUBLIC_CONFIG} from './config.js';
import {parseReport,renderTable,groups} from './report-renderer.js';
function element(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}
async function load(){
  const user=await requireUser();if(!user)return;$('report-content').hidden=false;$('page-loading').hidden=true;
  const id=new URL(location.href).searchParams.get('task');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id||'')){message('report-message','报告地址缺少有效任务编号，请从工作台重新打开。','error');return;}
  const {data:task,error}=await client.from('amz_tasks').select('id,asin,status,created_at,report_url,failure_reason').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(error)throw error;if(!task){message('report-message','没有找到这条任务，或它不属于当前账号。','error');return;}
  $('report-title').textContent=task.asin+' · 关键词作战总表';document.title=task.asin+' · 作战报告';$('report-subtitle').textContent='提交于 '+dateLabel(task.created_at)+' · 先处理浪费广告费的词';
  if(task.status!=='已完成'||!task.report_url){message('report-message',task.status==='失败'?'任务处理失败：'+(task.failure_reason||'请返回工作台核对。'):task.status==='已完成'?'这条测试任务没有生成业务报告，请返回工作台选择其他任务。':'报告还未生成，请返回工作台查看进度。',task.status==='失败'?'error':'info');return;}
  if(!/^https:\/\/tools-amz-board\.oss-cn-shenzhen\.aliyuncs\.com\/amz-board\/reports\/[a-f0-9]{48,128}\.html$/.test(task.report_url)){message('report-message','报告地址不符合本工具的格式，已停止读取。','error');return;}
  message('report-message','正在加载报告数据…');
  const localPreview=['127.0.0.1','localhost'].includes(location.hostname)&&PUBLIC_CONFIG.reportProxy;
  const url=localPreview?PUBLIC_CONFIG.reportProxy+'?url='+encodeURIComponent(task.report_url):task.report_url;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),credentials:'omit',redirect:'error',cache:'no-store'});if(!response.ok)throw new Error('REPORT_FETCH');
  if(Number(response.headers.get('content-length'))>2*1024*1024)throw new Error('REPORT_SIZE');
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw new Error('REPORT_SIZE');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  const report=parseReport(new TextDecoder().decode(data));
  for(const group of groups){const count=report.rows.filter(r=>r.group===group.label).length;const card=element('div','','summary-item'),label=element('div','','summary-label'),dot=element('span','','status-dot '+group.color);label.append(dot,document.createTextNode(group.label));const number=element('p',String(count),'summary-number');number.append(element('small','个词'));card.append(label,number);$('report-summary').append(card);}
  function selectFilter(label){$('report-frame').srcdoc=renderTable(report,label);for(const button of $('report-filters').children)button.setAttribute('aria-pressed',String(button.dataset.filter===label));}
  for(const label of ['全部',...groups.map(g=>g.label)]){const count=label==='全部'?report.rows.length:report.rows.filter(r=>r.group===label).length;const button=element('button',`${label} ${count}`,'filter-button');button.type='button';button.dataset.filter=label;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>selectFilter(label));$('report-filters').append(button);}
  for(const note of report.notes)$('report-context-text').append(element('p',note));
  const warnings=[];
  if(report.notes.some(n=>n.includes('演示报表')))warnings.push('演示报表用于验证规则。');
  if(report.notes.some(n=>n.includes('CPA 未设置')))warnings.push('CPA 尚未设置，零订单止损条件暂未启用。');
  message('report-message',warnings.join(''));
  $('report-view').hidden=false;selectFilter('全部');
}
load().catch(error=>{const text=error?.message?.startsWith('REPORT_')?'报告暂时无法读取或格式不受支持，请稍后重试。':errorText(error);if($('report-content').hidden)pageFailure(text);else message('report-message',text,'error');});
