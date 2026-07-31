// background.js — 连续计时 + 阈值判定 + 全局硬锁（防绕过强化版）
// 信任模型：累计「被管域名」总时长（跨标签/窗口在后台聚合），不因子页失焦而重置。
// 达阈值 -> 打开全屏 break 页 + 对所有被管 tab 注入遮罩 + 拦截新开 tab/导航。
//
// 防绕过 v2：
//   - chrome.tabs.onCreated   → 新开 tab 也注入遮罩
//   - chrome.webNavigation.onCompleted → 任何被管域名页面加载完也检查
//   - break 页被关 → 立即重开
//   - 休息期间无法通过开新标签/输地址绕过

const TICK_SEC = 5;
const DEFAULT_BASE = "https://pause-paw.shop";

let config = null;
let usage = {};        // { domain: seconds }
let breaking = null;   // { domain, until(ms), tabId }

const STORE_KEYS = ["pp_config", "pp_usage", "pp_break", "pp_token", "pp_base"];

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

function normHost(host) {
  return (host || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function hostIn(list, host) {
  const h = normHost(host);
  return (list || []).some(d => { const n = normHost(d); return n === h || h.endsWith("." + n); });
}

function activeDomain(cb) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const t = tabs && tabs[0];
    if (!t || !t.url) return cb(null);
    try { cb(new URL(t.url).hostname); } catch (e) { cb(null); }
  });
}

function thresholdSec() {
  if (!config) return Infinity;
  const t = parseFloat(config.threshold_min) || 20;
  return config.threshold_unit === "sec" ? t : t * 60;
}
function breakSec() {
  if (!config) return 5;
  const b = parseFloat(config.break_min) || 5;
  return config.break_unit === "sec" ? b : b * 60;
}

function onManaged(host) {
  if (!config) return false;
  if (hostIn(config.whitelist, host)) return false;
  return hostIn(config.domains, host);
}

function loadState(cb) {
  chrome.storage.local.get(STORE_KEYS, (res) => {
    config = safeParse(res.pp_config);
    usage = res.pp_usage || {};
    if (res.pp_break) breaking = res.pp_break;
    cb && cb();
  });
}

function reportEvent(domain) {
  if (!config) return;
  chrome.storage.local.get(["pp_token", "pp_base"], (res) => {
    const tok = res.pp_token;
    if (!tok) return;
    const API = (res.pp_base || DEFAULT_BASE).replace(/\/$/, "");
    fetch(API + "/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: tok,
        domain: domain,
        // 统一以「分钟」为单位上报（与字段名 break_min/elapsed_min 一致）
        elapsed_min: config.threshold_unit === "sec"
          ? Math.round((parseFloat(config.threshold_min) || 20) / 60)
          : (parseFloat(config.threshold_min) || 20),
        break_min: config.break_unit === "sec"
          ? Math.round((parseFloat(config.break_min) || 5) / 60)
          : (parseFloat(config.break_min) || 5),
        // 附带客户端本地日期（YYYY-MM-DD），解决服务器 UTC 时区导致「今日」偏移问题
        client_date: new Date().toISOString().slice(0, 10)
      })
    }).catch(() => {});
  });
}

// 向所有被管域名的 tab 广播消息
function broadcast(type, payload) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(t => {
      try {
        const host = t.url ? new URL(t.url).hostname : null;
        if (host && config && hostIn(config.domains, host)) {
          chrome.tabs.sendMessage(t.id, Object.assign({ type }, payload || {}));
        }
      } catch (e) {}
    });
  });
}

// 向指定 tab 注入遮罩（用于新创建的 tab）
function injectOverlay(tabId) {
  if (!breaking || Date.now() >= breaking.until) return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    // 不对 break.html 自身、chrome://、扩展页注入
    if (tab.url.startsWith("chrome://") || tab.url.startsWith(chrome.runtime.getURL(""))) return;
    try {
      const host = new URL(tab.url).hostname;
      if (hostIn(config.domains, host)) {
        chrome.tabs.sendMessage(tabId, {
          type: "TRIGGER_BREAK",
          until: breaking.until,
          breakTotal: breaking.breakTotal
        }).catch(() => {
          // content script 可能还没加载，用 scripting API 注入
          chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {
                type: "TRIGGER_BREAK",
                until: breaking.until,
                breakTotal: breaking.breakTotal
              }).catch(() => {});
            }, 300);
          }).catch(() => {});
        });
      }
    } catch (e) {}
  });
}

function startBreak(key, host) {
  breaking = { domain: key, until: Date.now() + breakSec() * 1000, tabId: null, breakTotal: breakSec() };
  chrome.storage.local.set({ pp_break: breaking });

  // 1. 广播给所有现有被管 tab
  broadcast("TRIGGER_BREAK", { until: breaking.until, breakTotal: breakSec() });

  // 2. 打开全屏 break 页
  chrome.tabs.create({ url: chrome.runtime.getURL("break.html") }, (tab) => {
    if (breaking) { breaking.tabId = tab.id; chrome.storage.local.set({ pp_break: breaking }); }
  });
  reportEvent(host);
}

function endBreak() {
  const ended = breaking;
  breaking = null;
  chrome.storage.local.remove(["pp_break"]);
  if (ended && ended.domain) usage[ended.domain] = 0;
  chrome.storage.local.set({ pp_usage: usage });
  broadcast("END_BREAK");
  if (ended && ended.tabId) chrome.tabs.remove(ended.tabId).catch(() => {});
}

function tick() {
  if (breaking) {
    if (Date.now() >= breaking.until) endBreak();
    return;
  }
  if (!config) return;
  activeDomain((host) => {
    if (!host || !onManaged(host)) return;
    const key = normHost(host);
    usage[key] = (usage[key] || 0) + TICK_SEC;
    chrome.storage.local.set({ pp_usage: usage });
    if (usage[key] >= thresholdSec()) startBreak(key, host);
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === "BREAK_DONE") endBreak();
  else if (msg.type === "CONFIG_UPDATED") loadState();
});

// ====== 防绕过：拦截新开标签页 ======
chrome.tabs.onCreated.addListener((tab) => {
  if (!breaking || !tab || !tab.id) return;
  // 等 tab 加载完 URL 后再判断是否注入
  setTimeout(() => injectOverlay(tab.id), 500);
});

// ====== 防绕过：拦截页面导航（在已有 tab 里输入新地址/跳转） ======
chrome.webNavigation.onCompleted.addListener((details) => {
  if (!breaking || !details.frameId || details.frameId !== 0) return;
  // 排除 break 页自身
  if (details.url && details.url.startsWith(chrome.runtime.getURL(""))) return;
  injectOverlay(details.tabId);
}, { url: [{ urlPrefix: "http://" }, { urlPrefix: "https://" }] });

// ====== 休息中若 break 页被关 -> 重开（关不掉） ======
chrome.tabs.onRemoved.addListener((tabId) => {
  if (breaking && breaking.tabId === tabId && Date.now() < breaking.until) {
    chrome.tabs.create({ url: chrome.runtime.getURL("break.html") }, (tab) => {
      breaking.tabId = tab.id;
      chrome.storage.local.set({ pp_break: breaking });
    });
  }
});

chrome.alarms.create("pp_tick", { periodInMinutes: TICK_SEC / 60 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "pp_tick") tick(); });

loadState();
