import {renderTable,parseReport,trendCell} from './report-renderer.js';
const titles=['关键词作战总表','自然位标杆','否定词清单','竞对对比','图片与卖点诊断','广告诊断与优化'];
const policy="default-src 'none'; style-src 'unsafe-inline'; img-src https://*.media-amazon.com https://*.ssl-images-amazon.com https://*.images-amazon.com; base-uri 'none'; form-action 'none'; object-src 'none'";
const allowed=new Set('HTML HEAD BODY TITLE STYLE DIV SPAN P H1 H2 H3 H4 HEADER NAV MAIN SECTION FOOTER SMALL STRONG B EM BR HR TABLE COLGROUP COL THEAD TBODY TFOOT TR TH TD UL OL LI LABEL INPUT TEXTAREA DETAILS SUMMARY SVG POLYLINE LINE CIRCLE'.split(' '));
const attrs=new Set('id class title lang role aria-label aria-hidden aria-labelledby aria-current for type name checked disabled readonly rows cols width height colspan rowspan loading referrerpolicy alt viewBox points fill stroke stroke-width stroke-linejoin stroke-linecap x1 x2 y1 y2 cx cy r hidden'.toLowerCase().split(' '));
export function hasModuleLayout(html){const doc=new DOMParser().parseFromString(html,'text/html');return Boolean(doc.querySelector('.module-menu')&&doc.querySelector('#section-01'));}
// Keep layout and CSS controls, but never enable executable content or arbitrary navigation.
export function sanitizeReportDocument(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  // The worker's module HTML contains raw weekly values. Reuse the original chart
  // renderer only inside module 01; preserve all other cells and modules.
  const table=doc.querySelector('#section-01 table');
  if(table&&doc.querySelector('.module-menu')&&[...table.querySelectorAll('tbody tr')].some(row=>row.children.length===16&&!row.children[4].querySelector('details')&&/\d{4}-\d{2}-\d{2}[–—-]/.test(row.children[4].textContent))){
    const report=parseReport(html);
    const rows=[...table.querySelectorAll('tbody tr')];
    rows.forEach((row,i)=>{
      const cell=row.children[4];
      if(!cell.querySelector('details')&&report.rows[i]?.trends.length){
        cell.classList.add('restored-trend');cell.innerHTML=trendCell(report.rows[i]);
      }
    });
    if(!doc.querySelector('#restored-trend-style')){
      const style=doc.createElement('style');style.id='restored-trend-style';
      style.textContent=`#section-01 .restored-trend svg{display:block;max-width:100%;height:42px}#section-01 .restored-trend summary{color:#7e94b7;font-size:10px;cursor:pointer;margin-top:4px}#section-01 .restored-trend summary:focus-visible{outline:2px solid #a5bfff}#section-01 .restored-trend .trend-detail{margin-top:8px;max-height:210px;overflow-y:auto;border-top:1px solid #edf1f7;padding-top:5px}#section-01 .restored-trend .trend-detail>div{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;padding:4px 0;border-bottom:1px solid #f0f3f8}#section-01 .restored-trend .trend-detail small{display:block;font-size:9px}#section-01 .restored-trend .trend-detail strong{font-size:10px;font-weight:500}`;
      doc.head.append(style);
    }
  }
  for(const node of [...doc.querySelectorAll('*')]){
    if(node.tagName==='IMG'){
      const src=node.getAttribute('src');let safe=false;
      try{const u=new URL(src);safe=u.protocol==='https:'&&!u.username&&!u.password&&/(^|\.)(media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)$/.test(u.hostname);}catch{}
      if(!safe){node.replaceWith(doc.createTextNode('暂无主图'));continue;}
    }else if(!allowed.has(node.tagName.toUpperCase())){node.remove();continue;}
    const columnWidth=node.tagName==='COL'?node.style.width:'';
    for(const attr of [...node.attributes])if(!(attrs.has(attr.name.toLowerCase())||(node.tagName==='IMG'&&attr.name==='src')))node.removeAttribute(attr.name);
    if(node.tagName==='COL'&&/^\d+(?:\.\d+)?px$/.test(columnWidth))node.style.width=columnWidth;
    if(node.tagName==='INPUT'&&node.getAttribute('type')!=='radio'){node.remove();continue;}
    if(node.tagName==='TEXTAREA')node.setAttribute('readonly','');
    if(node.tagName==='IMG')node.setAttribute('referrerpolicy','no-referrer');
  }
  const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content=policy;doc.head.prepend(csp);
  const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';doc.head.append(viewport);
  const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');doc.head.prepend(charset);
  return '<!doctype html>'+doc.documentElement.outerHTML;
}
export function renderLegacyModules(report,filter='全部'){
  const doc=new DOMParser().parseFromString(renderTable(report,filter),'text/html');
  const style=doc.createElement('style');style.textContent=`
  body{margin:0;background:#f5f7fb}.module-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:16px;padding:16px}.module-menu{align-self:start;background:#fff;border:1px solid #e4eaf3;border-radius:10px;padding:10px}.module-menu div{padding:13px 10px;margin:4px 0;border-radius:7px;color:#95a2b7;font-weight:600}.module-menu .active{background:#eaf0ff;color:#365fa8}.module-menu small{display:block;font-weight:400}.module-content{min-width:0;background:white;border:1px solid #e4eaf3;border-radius:10px;padding:16px}.module-content h2{margin:0 0 12px;font-size:18px}.module-section{display:none}#section-01{display:block}.table-scroll{overflow-x:auto;max-width:100%}th{text-align:center}td{text-align:left}.module-note{color:#8390a4;font-size:11px;margin-bottom:12px}
  @media(max-width:700px){.module-layout{grid-template-columns:minmax(0,1fr);padding:10px;gap:10px}.module-menu{display:flex;overflow-x:auto;gap:8px;padding:8px}.module-menu div{flex:0 0 165px;margin:0}.module-content{padding:12px}}
  `;doc.head.append(style);
  const layout=doc.createElement('div');layout.className='module-layout';
  const menu=doc.createElement('nav');menu.className='module-menu';menu.setAttribute('aria-label','报告模块');
  titles.forEach((title,i)=>{const item=doc.createElement('div');item.textContent=String(i+1).padStart(2,'0')+' '+title;if(i===0){item.className='active';item.setAttribute('aria-current','page');}else{const note=doc.createElement('small');note.textContent='即将上线';item.append(note);}menu.append(item);});
  const main=doc.createElement('main');main.className='module-content';
  titles.forEach((title,i)=>{const section=doc.createElement('section');section.className='module-section';section.id='section-'+String(i+1).padStart(2,'0');if(i===0){const heading=doc.createElement('h2');heading.textContent='01 '+title;section.append(heading);const note=doc.createElement('p');note.className='module-note';note.textContent='历史报告 · 数据保持原样，其他模块尚未生成。';section.append(note);const scroll=doc.createElement('div');scroll.className='table-scroll';scroll.append(doc.querySelector('table'));section.append(scroll);}main.append(section);});
  layout.append(menu,main);doc.body.replaceChildren(layout);
  return sanitizeReportDocument(doc.documentElement.outerHTML);
}
