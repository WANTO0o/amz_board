export const settingsFields=[
  {
    "key": "targetAcos",
    "label": "目标 ACOS",
    "group": "判断规则",
    "default": 0.3,
    "min": 0.01,
    "max": 1,
    "step": 0.01,
    "scale": 100,
    "unit": "%",
    "hint": "控制成本与超目标花费的判断目标。"
  },
  {
    "key": "targetCpa",
    "label": "可接受 CPA",
    "group": "判断规则",
    "default": null,
    "min": 0.01,
    "max": 1000,
    "step": 0.01,
    "scale": 1,
    "unit": "USD",
    "hint": "可留空；未设置时不启用零订单 CPA 止损。"
  },
  {
    "key": "minClicks",
    "label": "最低点击样本",
    "group": "判断规则",
    "default": 20,
    "min": 1,
    "max": 1000,
    "step": 1,
    "scale": 1,
    "unit": "次",
    "hint": "样本不足的词先观察。"
  },
  {
    "key": "minOrders",
    "label": "最低订单样本",
    "group": "判断规则",
    "default": 3,
    "min": 1,
    "max": 100,
    "step": 1,
    "scale": 1,
    "unit": "单",
    "hint": "达到门槛后再按 ACOS 判断。"
  },
  {
    "key": "stopLossMultiplier",
    "label": "零订单止损花费倍数",
    "group": "判断规则",
    "default": 2,
    "min": 1,
    "max": 10,
    "step": 0.1,
    "scale": 1,
    "unit": "倍 CPA",
    "hint": "仅归因完成且达到点击门槛时应用。"
  },
  {
    "key": "concentration",
    "label": "头部点击集中阈值",
    "group": "判断规则",
    "default": 0.7,
    "min": 0.1,
    "max": 1,
    "step": 0.01,
    "scale": 100,
    "unit": "%",
    "hint": "前三点击份额达到阈值时提示长尾机会。"
  },
  {
    "key": "keywordLimit",
    "label": "分析关键词数",
    "group": "抓取范围",
    "default": 20,
    "min": 1,
    "max": 200,
    "step": 1,
    "scale": 1,
    "unit": "词",
    "hint": "从该商品流量排序取词；增加范围会增加费用。"
  },
  {
    "key": "trendWeeks",
    "label": "搜索量趋势窗口",
    "group": "抓取范围",
    "default": 13,
    "min": 1,
    "max": 13,
    "step": 1,
    "scale": 1,
    "unit": "周",
    "hint": "只使用已发布的完整周，不补零。"
  },
  {
    "key": "maxCredits",
    "label": "西柚额度上限",
    "group": "预算",
    "default": 200,
    "min": 1,
    "max": 5000,
    "step": 1,
    "scale": 1,
    "unit": "Credits",
    "hint": "每个任务仍需确认预算；不足时停止，不自动充值。"
  },
  {
    "key": "maxModelCny",
    "label": "DeepSeek 预算上限",
    "group": "预算",
    "default": 0.5,
    "min": 0.03,
    "max": 10,
    "step": 0.01,
    "scale": 1,
    "unit": "元",
    "hint": "每条建议保守预留0.025元；不足时停止。"
  },
  {
    "key": "taskTimeoutMinutes",
    "label": "任务处理时限",
    "group": "任务运行",
    "default": 40,
    "min": 5,
    "max": 120,
    "step": 1,
    "scale": 1,
    "unit": "分钟",
    "hint": "超时停止并保留缓存。"
  },
  {
    "key": "requestIntervalMs",
    "label": "西柚最小请求间隔",
    "group": "任务运行",
    "default": 1200,
    "min": 1200,
    "max": 10000,
    "step": 100,
    "scale": 1,
    "unit": "毫秒",
    "hint": "不允许低于现有1.2秒限流保护。"
  },
  {
    "key": "requestTimeoutMs",
    "label": "西柚请求超时",
    "group": "任务运行",
    "default": 90000,
    "min": 30000,
    "max": 180000,
    "step": 1000,
    "scale": 1,
    "unit": "毫秒",
    "hint": "结果不确定时不自动重试付费请求。"
  },
  {
    "key": "organicEnabled",
    "label": "新任务生成02模块",
    "group": "02 自然位标杆",
    "default": 0,
    "min": 0,
    "max": 1,
    "step": 1,
    "scale": 1,
    "unit": "",
    "hint": "关闭时仅生成01；开启后按配置补抓，费用仍需任务审批。"
  },
  {
    "key": "organicPageSize",
    "label": "02每页 ASIN 数",
    "group": "02 自然位标杆",
    "default": 100,
    "min": 20,
    "max": 1000,
    "step": 1,
    "scale": 1,
    "unit": "条",
    "hint": "每次请求的条数；按实际返回ASIN数量收费。"
  },
  {
    "key": "organicMaxAsins",
    "label": "02每词抓取上限",
    "group": "02 自然位标杆",
    "default": 100,
    "min": 20,
    "max": 10000,
    "step": 1,
    "scale": 1,
    "unit": "条",
    "hint": "必须是每页条数的整数倍；未抓全会显示覆盖范围。"
  },
  {
    "key": "negativeClicks",
    "label": "03零订单点击门槛",
    "group": "03 规则草稿",
    "default": 15,
    "min": 1,
    "max": 1000,
    "step": 1,
    "scale": 1,
    "unit": "次",
    "hint": "起草值；03尚未实现，保存不会启用分析。"
  },
  {
    "key": "negativeCvr",
    "label": "03低转化率线",
    "group": "03 规则草稿",
    "default": 0.02,
    "min": 0.001,
    "max": 1,
    "step": 0.001,
    "scale": 100,
    "unit": "%",
    "hint": "起草值；03尚未实现。"
  },
  {
    "key": "negativeSpendTop",
    "label": "03高花费前列比例",
    "group": "03 规则草稿",
    "default": 0.2,
    "min": 0.01,
    "max": 1,
    "step": 0.01,
    "scale": 100,
    "unit": "%",
    "hint": "起草值；03尚未实现。"
  }
];
export const defaultSettings=Object.fromEntries(settingsFields.map(f=>[f.key,f.default]));
export function validateSettings(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(defaultSettings,k)))throw Error('配置字段不受支持');
 const out={...defaultSettings,...value};
 for(const f of settingsFields){const n=out[f.key];if(n===null&&f.key==='targetCpa')continue;if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))throw Error(f.label+'超出允许范围');}
 if(out.organicMaxAsins%out.organicPageSize!==0)throw Error('02抓取上限必须是每页条数的整数倍');
 if(out.organicMaxAsins<out.organicPageSize)throw Error('02每词抓取上限不能小于每页条数');
 return out;
}
