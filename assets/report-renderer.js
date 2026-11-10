const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const groups=[{label:'优先止损',color:'red'},{label:'控成本',color:'amber'},{label:'观察/待核查',color:'blue'},{label:'有效词',color:'green'},{label:'无投放',color:'gray'}];
const lines=node=>[...node.childNodes].map(n=>n.nodeName==='BR'?'\n':n.textContent).join('').split('\n').map(t=>t.trim()).filter(Boolean);
const safeImage=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/(^|\.)(media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)$/.test(u.hostname)?u.href:null;}catch{return null;}};
export function parseReport(html){
  const doc=new DOMParser().parseFromString(html,'text/html'),table=doc.querySelector('table');
  if(!table)throw new Error('REPORT_FORMAT');
  const headers=[...table.querySelectorAll('thead th')].map(t=>t.textContent.trim());
  if(headers.length!==16||headers[0]!=='搜索词'||headers[15]!=='打法建议')throw new Error('REPORT_FORMAT');
  const rawRows=[...table.querySelectorAll('tbody tr')];if(!rawRows.length||rawRows.length>200)throw new Error('REPORT_FORMAT');
  const rows=rawRows.map(tr=>{
    const cells=[...tr.children];if(cells.length!==16)throw new Error('REPORT_FORMAT');
    const label=cells[15].querySelector('strong')?.textContent.trim()||'观察/待核查';
    const group=groups.find(g=>g.label===label)||groups[2];
    const trends=lines(cells[4]).map(text=>{const m=text.match(/^(\d{4}-\d{2}-\d{2})[–—-](\d{4}-\d{2}-\d{2})[：:]\s*([\d,.]+|—)$/);return m?{from:m[1],to:m[2],value:m[3]==='—'?null:Number(m[3].replace(/,/g,'')),text}:null;}).filter(Boolean);
    const products=[...cells[5].querySelectorAll('.product')].slice(0,3).map(product=>({image:safeImage(product.querySelector('img')?.getAttribute('src')),text:product.textContent.trim()}));
    return {keyword:cells[0].textContent.trim(),cells:cells.map(lines),group:group.label,color:group.color,trends,products,suggestion:cells[15].querySelector('p')?.textContent.trim()||'',note:cells[15].querySelector('small')?.textContent.trim()||''};
  });
  return {headers,rows,notes:[...doc.body.children].filter(n=>n.tagName==='P').map(p=>p.textContent.trim())};
}
function sparkline(trends){
  const values=trends.map(t=>t.value).filter(n=>n!==null&&Number.isFinite(n));
  if(values.length<2)return '<span class="muted">趋势数据不足</span>';
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=[];let current=[];
  trends.forEach((t,i)=>{if(t.value===null||!Number.isFinite(t.value)){if(current.length)points.push(current);current=[];return;}current.push(`${(4+i*144/Math.max(1,trends.length-1)).toFixed(1)},${(35-(t.value-min)/range*28).toFixed(1)}`);});if(current.length)points.push(current);
  return `<svg viewBox="0 0 152 42" width="152" height="42" role="img" aria-label="${e(trends.length)}周搜索量趋势"><line x1="4" x2="148" y1="37" y2="37" stroke="#e7edf7"/>${points.map(p=>p.length>1?`<polyline points="${p.join(' ')}" fill="none" stroke="#4b79da" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`:p.map(pt=>{const [x,y]=pt.split(',');return `<circle cx="${x}" cy="${y}" r="2" fill="#4b79da"/>`;})).join('')}</svg>`;
}
function trendCell(row){return `${sparkline(row.trends)}<details><summary>${row.trends.length} 周明细</summary><div class="trend-detail">${row.trends.map(t=>`<div><span>${e(t.from)}<small>至 ${e(t.to)}</small></span><strong>${t.value===null?'—':e(t.value.toLocaleString('en-US'))}</strong></div>`).join('')}</div></details>`;}
function productCell(row){return row.products.length?row.products.map(p=>`<div class="product">${p.image?`<img loading="eager" src="${e(p.image)}" referrerpolicy="no-referrer" alt="暂无图">`:'<span class="image-placeholder">暂无图</span>'}<span>${e(p.text).replace(/点击\s*/,'<br><small>点击 ')}${p.text.includes('点击')?'</small>':''}</span></div>`).join(''):'<span class="muted">数据缺失</span>';}
const breakLines=values=>values.map(e).join('<br>');
export function renderTable(report,filter='全部'){
  const rows=filter==='全部'?report.rows:report.rows.filter(r=>r.group===filter);
  const content=rows.map(r=>'<tr>'+r.cells.map((cell,i)=>{
    let text=breakLines(cell);
    if(i===4)text=trendCell(r);else if(i===5)text=productCell(r);else if(i===15)text=`<span class="badge ${r.color}">${e(r.group)}</span><p>${e(r.suggestion)}</p><small>${e(r.note)}</small>`;
    else if([1,6,7].includes(i))text=cell.map((line,j)=>j===0?e(line):`<small>${e(line)}</small>`).join('<br>');
    return `<td${i===0?' class="keyword"':''}>${text}</td>`;
  }).join('')+'</tr>').join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://*.media-amazon.com https://*.ssl-images-amazon.com https://*.images-amazon.com; base-uri 'none'; form-action 'none'"><style>
  *{box-sizing:border-box}body{margin:0;color:#31435f;background:white;font:12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif}table{border-collapse:separate;border-spacing:0;table-layout:fixed;width:2280px;font-variant-numeric:tabular-nums}th{text-align:left;font-size:10px;font-weight:600;color:#8390a4;background:#f7f9fc;position:sticky;top:0;z-index:3;border-bottom:1px solid #e8edf5;padding:12px 15px}td{padding:14px 15px;border-bottom:1px solid #edf1f6;vertical-align:top;overflow-wrap:anywhere;background:white}tbody tr:nth-child(even) td{background:#fcfdff}tbody tr:hover td{background:#f3f7ff}th:first-child,td:first-child{position:sticky;left:0;border-right:1px solid #e9eef5;box-shadow:4px 0 8px #21395e04}th:first-child{z-index:4}td:first-child{z-index:2;font-weight:600;color:#273d60}small,.muted{color:#8b98ad;font-size:10px}small{line-height:1.6}svg{display:block;max-width:100%;height:42px}summary{color:#7e94b7;font-size:10px;cursor:pointer;margin-top:4px}summary:focus-visible{outline:2px solid #a5bfff}details[open]{min-width:160px}.trend-detail{margin-top:8px;max-height:210px;overflow-y:auto;border-top:1px solid #edf1f7;padding-top:5px}.trend-detail>div{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;padding:4px 0;border-bottom:1px solid #f0f3f8}.trend-detail small{display:block;font-size:9px}.trend-detail strong{font-size:10px;font-weight:500}.product{display:flex;gap:9px;align-items:center;margin-bottom:6px;font-size:10px}.product:last-child{margin-bottom:0}.product img,.image-placeholder{width:29px;height:29px;object-fit:contain;flex:0 0 29px;font-size:8px;color:#9eabbc;border:1px solid #eef1f5;border-radius:4px}.image-placeholder{display:grid;place-items:center;background:#f5f7fa}.badge{display:inline-block;font-weight:600;padding:2px 7px;border-radius:5px;font-size:10px}.red{background:#fff0ef;color:#b7463d}.amber{background:#fff4df;color:#a36b10}.blue{background:#eef3ff;color:#4775bf}.green{background:#eaf7f0;color:#2c8058}.gray{background:#f0f3f7;color:#8794a7}p{margin:6px 0 5px;line-height:1.7}.empty{text-align:center;padding:50px;color:#93a0b3}::-webkit-scrollbar{height:9px;width:9px}::-webkit-scrollbar-thumb{background:#cad4e3;border:2px solid #f7f9fc;border-radius:8px}::-webkit-scrollbar-track{background:#f7f9fc}
  </style></head><body><table><colgroup>${[190,135,65,140,180,185,100,145,90,75,100,70,110,80,115,400].map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${report.headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${content||'<tr><td colspan="16" class="empty">没有属于这个分类的关键词。</td></tr>'}</tbody></table></body></html>`;
}
