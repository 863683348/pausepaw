// content.js — PausePaw 页面内硬锁遮罩（接收 background 指令）
// 计时由 background.service_worker 连续累计（跨标签/窗口聚合，不因子页失焦重置）。
// 本文件仅负责视觉：收到 TRIGGER_BREAK -> 注入全屏遮罩（大萌宠 + 大倒计时 + 模糊锁死）。

let config = null;
let overlayActive = false;
let tickTimer = null;
let scrollBlocker = null;

// 自绘 SVG 猫（结构化：耳/尾带 class 供 CSS 动画）。P0-1 合规：纯 SVG，无 emoji。
const CAT_SVG = `
<svg class="pp-cat" viewBox="0 0 240 240" width="360" height="360" xmlns="http://www.w3.org/2000/svg">
  <path class="pp-tail" d="M198 170 q40 4 34 -40" fill="none" stroke="#E8A06A" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="120" cy="176" rx="60" ry="48" fill="#FCD9B6"/>
  <path class="pp-ear-l" d="M74 98 L62 50 L108 86 Z" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3" stroke-linejoin="round"/>
  <path class="pp-ear-r" d="M166 98 L178 50 L132 86 Z" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="120" cy="114" r="62" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3"/>
  <path d="M78 92 L72 66 L96 84 Z" fill="#FFB3B3"/>
  <path d="M162 92 L168 66 L144 84 Z" fill="#FFB3B3"/>
  <circle cx="99" cy="110" r="9" fill="#4A2E12"/>
  <circle cx="141" cy="110" r="9" fill="#4A2E12"/>
  <circle cx="102" cy="107" r="3" fill="#fff"/>
  <circle cx="144" cy="107" r="3" fill="#fff"/>
  <circle cx="85" cy="128" r="8" fill="#FFB3B3" opacity="0.7"/>
  <circle cx="155" cy="128" r="8" fill="#FFB3B3" opacity="0.7"/>
  <path d="M114 126 L126 126 L120 133 Z" fill="#E8746B"/>
  <path d="M120 133 q-7 9 -14 4 M120 133 q7 9 14 4" stroke="#4A2E12" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M70 122 h-26 M72 132 h-23 M170 122 h26 M168 132 h23" stroke="#E8A06A" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

function loadConfig(cb) {
  chrome.storage.local.get(["pp_config"], (res) => {
    config = safeParse(res.pp_config);
    cb && cb();
  });
}

function texts() {
  const zh = !config || (config.locale || "zh") === "zh";
  const name = (config && config.mascot && config.mascot.name) || "Buddy";
  return zh
    ? { title: "该休息一下啦", sub: name + " 在等你喘口气", tip: "放下屏幕，时间到自动恢复" }
    : { title: "Time for a breather", sub: name + " is waiting for you to rest", tip: "Step away until the timer ends" };
}

function buildOverlay(until) {
  const t = texts();
  const ov = document.createElement("div");
  ov.id = "pp-overlay";
  ov.innerHTML = `
    <style>
      #pp-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:6px;
        background:rgba(26,20,16,0.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
        font-family:system-ui,"PingFang SC",sans-serif;color:#fff;text-align:center;user-select:none;}
      .pp-cat,.pp-ear-l,.pp-ear-r,.pp-tail{transform-box:fill-box;}
      .pp-cat{transform-origin:50% 92%;animation:pp-slide 1s ease-out,pp-breathe 2.8s ease-in-out infinite 1s;}
      .pp-ear-l,.pp-ear-r{transform-origin:50% 100%;animation:pp-ear 2.4s ease-in-out infinite;}
      .pp-ear-r{animation-direction:reverse;}
      .pp-tail{transform-origin:100% 100%;animation:pp-tail 2.6s ease-in-out infinite;}
      @keyframes pp-slide{from{transform:translateX(60vw)}to{transform:translateX(0)}}
      @keyframes pp-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
      @keyframes pp-ear{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}
      @keyframes pp-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
      #pp-overlay h1{font-size:34px;margin:10px 0 0;font-weight:800;letter-spacing:1px;}
      #pp-overlay p{color:#E9D5C2;margin:2px 0 0;font-size:16px;}
      #pp-count{margin-top:10px;font-size:140px;font-weight:800;line-height:1;color:#fff;
        background:rgba(0,0,0,0.5);border-radius:26px;padding:6px 34px;font-variant-numeric:tabular-nums;}
      #pp-overlay .tip{margin-top:14px;font-size:14px;color:#C9B59C;}
      .pp-zzz{position:absolute;top:14%;right:16%;font-size:40px;font-weight:800;color:#fff;opacity:0;animation:pp-zzz 2.8s ease-in-out infinite;}
      @keyframes pp-zzz{0%{opacity:0;transform:translateY(0) scale(.8)}30%{opacity:.9}100%{opacity:0;transform:translateY(-46px) scale(1.1)}}
    </style>
    <div class="pp-zzz">Z</div>
    ${CAT_SVG}
    <h1>${t.title}</h1>
    <p>${t.sub}</p>
    <div id="pp-count">--</div>
    <div class="tip">${t.tip}</div>
  `;
  document.body.appendChild(ov);

  // 暂停页面其他媒体（猫不依赖页面视频）
  document.querySelectorAll("video, audio").forEach(v => { try { v.pause(); } catch (e) {} });

  // 挡滚动（参考站同款，增强锁死感）
  const block = (e) => e.preventDefault();
  document.addEventListener("wheel", block, { passive: false });
  document.addEventListener("touchmove", block, { passive: false });
  document.documentElement.style.overflow = "hidden";
  scrollBlocker = block;

  // 倒计时（用 background 传来的 until）
  const countEl = ov.querySelector("#pp-count");
  const upd = () => {
    const remain = until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0;
    countEl.textContent = remain;
    return remain;
  };
  upd();
  tickTimer = setInterval(() => {
    if (upd() <= 0 && tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }, 1000);

  // 拦站内链接点击（明显跳出）
  ov._click = (e) => { const a = e.target.closest("a"); if (a) { e.preventDefault(); e.stopPropagation(); } };
  document.addEventListener("click", ov._click, true);
  ov._before = (e) => { e.preventDefault(); e.returnValue = ""; };
  window.addEventListener("beforeunload", ov._before);
}

function removeOverlay() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  const ov = document.getElementById("pp-overlay");
  if (ov) {
    if (ov._click) document.removeEventListener("click", ov._click, true);
    if (ov._before) window.removeEventListener("beforeunload", ov._before);
    ov.remove();
  }
  if (scrollBlocker) {
    document.removeEventListener("wheel", scrollBlocker, { passive: false });
    document.removeEventListener("touchmove", scrollBlocker, { passive: false });
    scrollBlocker = null;
  }
  document.documentElement.style.overflow = "";
  overlayActive = false;
}

function triggerOverlay(msg) {
  if (overlayActive) return;
  if (!document.body) return;
  overlayActive = true;
  buildOverlay(msg && msg.until);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === "TRIGGER_BREAK") triggerOverlay(msg);
  else if (msg.type === "END_BREAK") removeOverlay();
  else if (msg.type === "CONFIG_UPDATED") loadConfig();
});

loadConfig();
