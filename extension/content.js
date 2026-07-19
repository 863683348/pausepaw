// content.js — PausePaw 执法核心（PRD F-PL）
// 信任底线：仅"页面可见 + 有焦点 + 遮罩未激活"才累计计时；切走/最小化/失焦即重置。
// 达阈值 -> 注入全屏遮罩（吉祥物 + 倒计时 + 双语），无关闭键，时间到才移除。

let config = null;
let elapsed = 0;          // 秒
let overlayActive = false;
let tick = null;

const MASCOT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="160" height="160">
  <circle cx="100" cy="105" r="72" fill="#FCD9B6"/>
  <circle cx="46" cy="52" r="20" fill="#FCD9B6"/>
  <circle cx="154" cy="52" r="20" fill="#FCD9B6"/>
  <circle cx="46" cy="52" r="10" fill="#F7B98A"/>
  <circle cx="154" cy="52" r="10" fill="#F7B98A"/>
  <circle cx="74" cy="100" r="11" fill="#4A2E12"/>
  <circle cx="126" cy="100" r="11" fill="#4A2E12"/>
  <circle cx="78" cy="96" r="3.5" fill="#fff"/>
  <circle cx="130" cy="96" r="3.5" fill="#fff"/>
  <circle cx="60" cy="120" r="9" fill="#FFB3B3" opacity="0.75"/>
  <circle cx="140" cy="120" r="9" fill="#FFB3B3" opacity="0.75"/>
  <path d="M86 122 Q100 134 114 122" stroke="#4A2E12" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M100 126 v8" stroke="#4A2E12" stroke-width="3" stroke-linecap="round"/>
</svg>`;

function norm(host) {
  return (host || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function hostIn(list) {
  const h = norm(location.hostname);
  return (list || []).some(d => norm(d) === h || h.endsWith("." + norm(d)));
}

function loadConfig(cb) {
  chrome.storage.local.get(["pp_config"], (res) => {
    if (res.pp_config) { try { config = JSON.parse(res.pp_config); } catch (e) { config = null; } }
    else config = null;
    cb && cb();
  });
}

function onManagedSite() {
  if (!config) return false;
  if (hostIn(config.whitelist)) return false;   // 白名单免打扰
  return hostIn(config.domains);
}

function isActive() {
  return !document.hidden && document.hasFocus() && !overlayActive;
}

function thresholdSec() {
  const t = parseFloat(config.threshold_min) || 20;
  return config.threshold_unit === "sec" ? t : t * 60;
}
function breakSec() {
  const b = parseFloat(config.break_min) || 5;
  return config.break_unit === "sec" ? b : b * 60;
}

function overlayText() {
  const zh = (config.locale || "zh") === "zh";
  const name = (config.mascot && config.mascot.name) || "Buddy";
  if (zh) return { title: "该休息一下啦～", sub: name + " 在等你喘口气 🐾" };
  return { title: "Time for a breather 🐾", sub: name + " is waiting for you to rest" };
}

function buildOverlay() {
  const t = overlayText();
  const ov = document.createElement("div");
  ov.id = "pp-overlay";
  ov.innerHTML = `
    <style>
      #pp-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;
        align-items:center;justify-content:center;background:rgba(255,247,237,0.86);
        backdrop-filter:blur(2px);font-family:system-ui,"PingFang SC",sans-serif;color:#4A2E12;}
      #pp-overlay .ring{width:150px;height:150px;border-radius:50%;background:conic-gradient(#FB923C calc(var(--p)*1%),#FFE8D2 0);
        display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;margin:14px 0;}
      #pp-overlay h1{font-size:26px;margin:6px 0 2px;}
      #pp-overlay p{color:#9A7B5A;margin:0;}
    </style>
    ${MASCOT_SVG}
    <h1>${t.title}</h1>
    <p>${t.sub}</p>
    <div class="ring" id="pp-ring" style="--p:100">${breakSec()}</div>
  `;
  document.body.appendChild(ov);

  let remain = breakSec();
  const ring = ov.querySelector("#pp-ring");
  const total = remain;
  const cd = setInterval(() => {
    remain -= 1;
    ring.textContent = Math.max(remain, 0);
    ring.style.setProperty("--p", (remain / total) * 100);
    if (remain <= 0) {
      clearInterval(cd);
      ov.style.transition = "opacity .5s";
      ov.style.opacity = "0";
      setTimeout(() => ov.remove(), 500);
      overlayActive = false;
      elapsed = 0;
    }
  }, 1000);
}

function reportEvent() {
  // 本地兜底统计
  chrome.storage.local.get(["pp_stats"], (res) => {
    const s = res.pp_stats || { blocks: 0, saved: 0 };
    s.blocks += 1;
    s.saved += (config.break_unit === "sec" ? parseFloat(config.break_min) : (parseFloat(config.break_min) || 5));
    chrome.storage.local.set({ pp_stats: s });
  });
  // 上报云端（设备 Token + API base 来自 popup 连接时保存）
  chrome.storage.local.get(["pp_token", "pp_base"], (res) => {
    const tok = res.pp_token;
    if (!tok) return;
    const API = (res.pp_base || "http://localhost:3000").replace(/\/$/, "");
    fetch(API + "/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: tok,
        domain: location.hostname,
        elapsed_min: (config.threshold_unit === "sec" ? config.threshold_min : config.threshold_min * 60),
        break_min: (config.break_unit === "sec" ? config.break_min : config.break_min * 60)
      })
    }).catch(() => {});
  });
}

function triggerOverlay() {
  if (overlayActive) return;
  overlayActive = true;
  elapsed = 0;
  buildOverlay();
  reportEvent();
}

function start() {
  if (tick) return;
  tick = setInterval(() => {
    if (!config || !onManagedSite()) return;
    if (isActive()) {
      elapsed += 1;
      if (elapsed >= thresholdSec()) triggerOverlay();
    } else {
      elapsed = 0; // 信任底线：中断即重置
    }
  }, 1000);
}

// 信任底线：切走/失焦立即重置
document.addEventListener("visibilitychange", () => { if (document.hidden) elapsed = 0; });
window.addEventListener("blur", () => { elapsed = 0; });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "CONFIG_UPDATED") { loadConfig(); elapsed = 0; }
});

loadConfig(start);
