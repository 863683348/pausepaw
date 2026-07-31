// background.js — 连续计时 + 阈值判定 + 硬锁触发（PRD F-PL 强化版）
// 信任模型：累计「被管域名」总时长（跨标签/窗口在后台聚合），不因子页失焦而重置。
// 达阈值 -> 打开全屏 break 页（最稳的锁，关不掉）+ 通知命中页注入页面内硬锁遮罩。

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
        elapsed_min: (config.threshold_unit === "sec" ? config.threshold_min : config.threshold_min * 60),
        break_min: (config.break_unit === "sec" ? config.break_min : config.break_min * 60)
      })
    }).catch(() => {});
  });
}

function broadcast(type, payload) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(t => {
      try {
        const host = t.url ? new URL(t.url).hostname : null;
        if (host && config && hostIn(config.domains, host)) chrome.tabs.sendMessage(t.id, Object.assign({ type }, payload || {}));
      } catch (e) {}
    });
  });
}

function startBreak(key, host) {
  breaking = { domain: key, until: Date.now() + breakSec() * 1000, tabId: null, breakTotal: breakSec() };
  chrome.storage.local.set({ pp_break: breaking });
  broadcast("TRIGGER_BREAK", { until: breaking.until, breakTotal: breakSec() });
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

// 休息中若 break 页被关 -> 重开（关不掉）
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
