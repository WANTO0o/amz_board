import {client,$,message,errorText} from './session.js';
import {settingsFields,defaultSettings,validateSettings} from './settings-schema.js';
export async function loadSettingsSummary(){
 const {data,error}=await client.rpc('amz_get_settings');if(error)return;
 const c=validateSettings(data.config),summary=document.querySelector('.rule-summary');
 summary.querySelector('strong').textContent=`ACOS ≤ ${(c.targetAcos*100).toFixed(1)}%`;
 summary.querySelector('p').textContent=`最低${c.minClicks}次点击 / ${c.minOrders}单；CPA ${c.targetCpa===null?'未设置':c.targetCpa+' USD'}。`;
 document.querySelector('.submission-card .pill').textContent=`最多 ${c.keywordLimit} 词`;
}
export async function openSettings(){
 const workspace=$('workspace');[...workspace.children].forEach(n=>n.hidden=true);
 document.querySelectorAll('.header-inner nav a').forEach(a=>{const active=a.href.includes('view=settings');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.title='参数配置 · 关键词作战台';
 const panel=document.createElement('section');panel.id='settings-panel';
 panel.innerHTML=`<div class="page-heading"><div><p class="eyebrow">SETTINGS / 我的参数</p><h1>参数配置</h1><p class="muted">仅作用于你的新任务；已创建任务保留创建时的参数。</p></div><a href="./" class="button secondary">返回工作台</a></div><div id="settings-message" class="message" role="status" hidden></div><div class="settings-layout"><nav id="settings-tabs" aria-label="参数分类"></nav><form id="settings-form"><div id="settings-fields"></div><div class="settings-summary"><h3>修改摘要</h3><p id="settings-version"></p><ul id="settings-diff"></ul><p>保存不会启动任务，也不会自动批准费用。02开关只影响新任务；03草稿不会启用分析。</p></div><div class="settings-actions"><button id="settings-save" class="button primary" type="submit" disabled>保存配置</button><button id="settings-defaults" class="button secondary" type="button" disabled>载入默认值</button><button id="settings-cancel" class="text-button" type="button" disabled>取消修改</button></div></form></div>`;
 workspace.append(panel);
 const inputs=new Map();let saved=null,version=0,busy=false;
 const groups=[...new Set(settingsFields.map(f=>f.group)),'固定口径与系统设置'];
 groups.forEach((group,i)=>{
  const tab=document.createElement('button');tab.type='button';tab.textContent=group;tab.setAttribute('aria-pressed',String(i===0));$('settings-tabs').append(tab);
  const section=document.createElement('section');section.className='settings-group';section.hidden=i!==0;
  const heading=document.createElement('h2');heading.textContent=group;section.append(heading);$('settings-fields').append(section);
  tab.addEventListener('click',()=>{[...$('settings-tabs').children].forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));[...$('settings-fields').children].forEach(n=>n.hidden=n!==section);});
  if(group==='固定口径与系统设置'){
   const notes=['美国站 / USD；其他站点尚未接入。','02标杆限点击前三竞对；自然位or、广告位sp/sb/sbv；缺失显示—。','任务轮询30秒，为全项目运行设置，不按账号修改。','DeepSeek deepseek-flash，输出上限256 tokens；新增型号须先核对计价。','连续失败两次停止；不自动重试结果不明的付费请求。','保留原始报表和缓存；图片只保存URL。','密钥和服务器凭据不在浏览器展示或修改。'];
   notes.forEach(t=>{const p=document.createElement('p');p.className='settings-fixed';p.textContent=t;section.append(p);});return;
  }
  settingsFields.filter(f=>f.group===group).forEach(f=>{
   const label=document.createElement('label');label.className='settings-field';label.htmlFor='setting-'+f.key;
   const name=document.createElement('span');name.textContent=f.label+(group.includes('草稿')?' · 尚未启用':'');
   const box=document.createElement('span');box.className='settings-input';const input=document.createElement(f.key==='organicEnabled'?'select':'input');input.id=label.htmlFor;if(f.key==='organicEnabled'){for(const [v,t] of [['0','关闭'],['1','开启']]){const option=document.createElement('option');option.value=v;option.textContent=t;input.append(option);}}else input.type='number';input.min=f.min*f.scale;input.max=f.max*f.scale;input.step=f.step*f.scale;input.required=f.key!=='targetCpa';input.disabled=true;
   const unit=document.createElement('span');unit.textContent=f.unit;box.append(input,unit);
   const hint=document.createElement('small');hint.textContent=f.hint+(f.key==='organicEnabled'?' 默认关闭。':` 范围 ${f.min*f.scale}—${f.max*f.scale}；默认 ${f.default===null?'留空':f.default*f.scale}。`);
   label.append(name,box,hint);section.append(label);inputs.set(f.key,input);input.addEventListener('input',update);
  });
 });
 function read(){return validateSettings(Object.fromEntries(settingsFields.map(f=>[f.key,inputs.get(f.key).value===''&&f.key==='targetCpa'?null:Number(inputs.get(f.key).value)/f.scale])));}
 function fill(c){settingsFields.forEach(f=>inputs.get(f.key).value=c[f.key]===null?'':Number((c[f.key]*f.scale).toFixed(6)));update();}
 function display(n,f){if(f.key==='organicEnabled')return n?'开启':'关闭';return n===null?'未设置':Number((n*f.scale).toFixed(6))+' '+f.unit;}
 function update(){if(!saved)return;$('settings-diff').replaceChildren();let c;try{c=read();}catch(e){const li=document.createElement('li');li.textContent=e.message;$('settings-diff').append(li);$('settings-save').disabled=true;return;}
  let changed=0;for(const f of settingsFields)if(c[f.key]!==saved[f.key]){changed++;const li=document.createElement('li');li.textContent=`${f.label}：${display(saved[f.key],f)} → ${display(c[f.key],f)}`;$('settings-diff').append(li);}
  if(!changed){const li=document.createElement('li');li.textContent='没有未保存的修改';$('settings-diff').append(li);}
  if(c.organicEnabled&&c.maxCredits<c.keywordLimit*Math.ceil(c.organicMaxAsins/20)){const li=document.createElement('li');li.textContent='提示：西柚预算低于02抓取上限估算，且还需计入01费用。';$('settings-diff').append(li);}
  if(c.maxModelCny<c.keywordLimit*.025){const li=document.createElement('li');li.textContent='提示：模型预算不足以预留全部关键词建议，任务可能提前停止。';$('settings-diff').append(li);}
  $('settings-save').disabled=busy||!changed;
 }
 function enabled(value){for(const input of inputs.values())input.disabled=!value;$('settings-defaults').disabled=!value;$('settings-cancel').disabled=!value;}
 $('settings-defaults').addEventListener('click',()=>fill(defaultSettings));$('settings-cancel').addEventListener('click',()=>{fill(saved);message('settings-message','');});
 $('settings-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!saved||!$('settings-form').reportValidity())return;let config;try{config=read();}catch(e){message('settings-message',e.message,'error');return;}
  busy=true;enabled(false);$('settings-save').disabled=true;
  try{const {data,error}=await client.rpc('amz_save_settings',{p_config:config,p_expected_version:version});if(error)throw error;saved=validateSettings(data.config);version=data.version;fill(saved);$('settings-version').textContent='已保存 · 版本 '+version;message('settings-message','配置已保存；下一次新建任务使用此版本，历史任务不变。','success');}
  catch(e){message('settings-message',String(e.message).includes('SETTINGS_CONFLICT')?'配置已被其他窗口修改，请刷新后重新编辑。':errorText(e),'error');}
  finally{busy=false;enabled(true);update();}
 });
 try{const {data,error}=await client.rpc('amz_get_settings');if(error)throw error;saved=validateSettings(data.config);version=data.version;fill(saved);enabled(true);$('settings-version').textContent='当前配置版本 '+version;}
 catch(e){message('settings-message',['PGRST202','PGRST205'].includes(e.code)?'参数存储尚未初始化，暂不能保存。请完成项目数据库初始化后刷新。':errorText(e),'error');}
}
