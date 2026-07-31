// content.js — 页面内硬锁遮罩（防绕过强化 + 自绘 SVG 猫动画版）
// 由 background.js 的 TRIGGER_BREAK / END_BREAK 消息驱动。
// 休息期间：全屏遮罩覆盖页面，显示大猫(SVG动画)+超大倒计时，无法关闭/滚动/交互。
//
// 防绕过 v2：background 会在新 tab 创建、页面导航完成时重新注入本脚本；
//            本脚本启动时也主动读 storage 防刷新绕过；遮罩拦截所有鼠标事件。

(function(){
  "use strict";

  // 自绘 SVG 猫（结构化：耳/尾带 class 供 CSS 动画）。P0-1 合规：纯 SVG，无 emoji。
  const CAT_SVG = `
<svg class="pp-cat" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <path class="pp-tail" d="M196 172 q42 2 36 -46" fill="none" stroke="#E8A06A" stroke-width="15" stroke-linecap="round"/>
  <ellipse cx="120" cy="178" rx="64" ry="52" fill="#FCD9B6"/>
  <path class="pp-ear-l" d="M72 96 L58 44 L106 84 Z" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3" stroke-linejoin="round"/>
  <path class="pp-ear-r" d="M168 96 L182 44 L134 84 Z" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3" stroke-linejoin="round"/>
  <path d="M76 92 L70 62 L94 84 Z" fill="#FFB3B3"/>
  <path d="M164 92 L170 62 L146 84 Z" fill="#FFB3B3"/>
  <circle cx="120" cy="112" r="66" fill="#FCD9B6" stroke="#E8A06A" stroke-width="3"/>
  <circle cx="97" cy="108" r="10" fill="#4A2E12"/>
  <circle cx="143" cy="108" r="10" fill="#4A2E12"/>
  <circle cx="100" cy="105" r="3" fill="#fff"/>
  <circle cx="146" cy="105" r="3" fill="#fff"/>
  <circle cx="82" cy="128" r="9" fill="#FFB3B3" opacity="0.7"/>
  <circle cx="158" cy="128" r="9" fill="#FFB3B3" opacity="0.7"/>
  <path d="M114 124 L126 124 L120 131 Z" fill="#E8746B"/>
  <path d="M120 131 q-7 9 -14 4 M120 131 q7 9 14 4" stroke="#4A2E12" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M70 120 h-26 M72 130 h-23 M170 120 h26 M168 130 h23" stroke="#E8A06A" stroke-width="2" stroke-linecap="round"/>
</svg>`;

  let ov = null;
  let tickTimer = null;
  let untilTime = 0;

  function texts() {
    const zh = !config || (config.locale || "zh") === "zh";
    const name = (config && config.mascot && config.mascot.name) || "Buddy";
    return zh
      ? { title: "该休息一下啦", sub: name + " 在等你喘口气", bar: "休息中 · 时间到自动恢复" }
      : { title: "Time for a breather", sub: name + " is waiting for you to rest", bar: "Resting · Auto-resumes when done" };
  }

  function showOverlay(until) {
    if (ov) { ov.remove(); ov = null; }
    untilTime = until || 0;
    const t = texts();

    ov = document.createElement("div");
    ov.id = "pp-overlay";
    ov.innerHTML = `
<style>
#pp-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;
  grid-template-columns:1fr 1.1fr;grid-template-rows:1fr auto;gap:0;
  background:rgba(15,12,10,0.92);font-family:system-ui,"PingFang SC",sans-serif;
  color:#fff;text-align:center;user-select:none;-webkit-user-select:none;}
.pp-left{grid-row:1/span 2;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:6vh 4vw;z-index:2;position:relative;}
.pp-right{grid-row:1/span 2;position:relative;overflow:hidden;
  display:flex;align-items:flex-end;justify-content:center;}
.pp-fade{position:absolute;inset:0;background:
  linear-gradient(to right, rgba(15,12,10,.78) 0%, rgba(15,12,10,.35) 50%, transparent 100%);
  pointer-events:none;z-index:1;}
.pp-cat-wrap{width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;
  transform-origin:50% 100%;animation:pp-catSlide 1s ease-out .15s backwards;z-index:2;position:relative;}
@keyframes pp-catSlide{from{transform:translateX(42vw) scale(.9);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}
.pp-cat{width:min(92%,640px);height:auto;transform-origin:50% 100%;
  animation:pp-catBreathe 3s ease-in-out infinite 1s;
  filter:drop-shadow(0 20px 40px rgba(0,0,0,.35));}
@keyframes pp-catBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.pp-cat .pp-ear-l,.pp-cat .pp-ear-r{transform-box:fill-box;transform-origin:50% 100%;
  animation:pp-catEar 2.4s ease-in-out infinite;}
.pp-cat .pp-ear-r{animation-direction:reverse;}
.pp-cat .pp-tail{transform-box:fill-box;transform-origin:100% 100%;
  animation:pp-catTail 2.6s ease-in-out infinite;}
@keyframes pp-catEar{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}
@keyframes pp-catTail{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
.pp-count-wrap{text-align:center;opacity:0;animation:pp-fadeUp .7s ease-out .4s forwards;}
@keyframes pp-fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
#pp-count{font-size:clamp(80px,18vw,220px);font-weight:900;line-height:.95;
  letter-spacing:-.03em;color:#fff;text-shadow:0 2px 40px rgba(0,0,0,.6),0 0 80px rgba(0,0,0,.3);
  font-variant-numeric:tabular-nums;transition:color .3s,transform .15s;}
#pp-count.warn{color:#FF6B6B;transform:scale(1.04)}
#pp-count.danger{color:#FF3860;animation:pp-pulse .5s ease-in-out infinite}
@keyframes pp-pulse{0%,100%{transform:scale(1.04)}50%{transform:scale(1.1)}}
.pp-msg{margin-top:2vh;font-size:clamp(16px,2.2vw,26px);font-weight:700;color:#f0e6dc;
  letter-spacing:.02em;opacity:0;animation:pp-fadeUp .7s ease-out .6s forwards;}
.pp-sub{margin-top:1vh;font-size:clamp(13px,1.5vw,18px);color:#a89888;opacity:0;
  animation:pp-fadeUp .7s ease-out .8s forwards;}
.pp-bar{grid-column:1/-1;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);padding:1.2vh 3vw;display:flex;align-items:center;
  justify-content:center;z-index:3;border-top:1px solid rgba(255,255,255,.06);}
.pp-bar span{font-size:clamp(11px,1.3vw,15px);color:#8c7e70;display:flex;align-items:center;gap:.5vw;}
.pp-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;
  animation:pp-blink 1.6s ease-in-out infinite}
@keyframes pp-blink{50%{opacity:.25}}
@media(max-width:768px){
  #pp-overlay{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}
  .pp-left{grid-row:1;padding:4vh 5vw}
  .pp-right{grid-row:2;max-height:42vh}
  .pp-cat{width:min(80%,420px)}
  .pp-bar{grid-row:3}
  #pp-count{font-size:clamp(56px,22vw,120px)}
}
</style>
<div class="pp-left">
  <div class="pp-count-wrap">
    <div id="pp-count">--:--</div>
    <div class="pp-msg">${t.title}</div>
    <div class="pp-sub">${t.sub}</div>
  </div>
</div>
<div class="pp-right">
  <div class="pp-fade"></div>
  <div class="pp-cat-wrap">${CAT_SVG}</div>
</div>
<div class="pp-bar"><span><i class="pp-dot"></i> ${t.bar}</span></div>`;

    document.documentElement.appendChild(ov);

    // 暂停页面的 video/audio
    document.querySelectorAll("video, audio").forEach(el => { try { el.pause(); } catch(e) {} });

    // 开始倒计时
    startCount();
  }

  function hideOverlay() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (ov) { ov.remove(); ov = null; }
    untilTime = 0;
  }

  function startCount() {
    const countEl = ov && ov.querySelector("#pp-count");
    if (!countEl) return;

    const upd = () => {
      const remain = untilTime ? Math.max(0, Math.ceil((untilTime - Date.now()) / 1000)) : 0;
      const m = String(Math.floor(remain / 60)).padStart(2, "0");
      const s = String(remain % 60).padStart(2, "0");
      countEl.textContent = m + ":" + s;

      countEl.classList.remove("warn", "danger");
      if (remain <= 3) countEl.classList.add("danger");
      else if (remain <= 30) countEl.classList.add("warn");

      return remain;
    };

    upd();
    tickTimer = setInterval(() => {
      if (upd() <= 0 && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
        hideOverlay();
      }
    }, 250);
  }

  // ====== 消息监听 ======
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "TRIGGER_BREAK") {
      showOverlay(msg.until);
      sendResponse({ ok: true });
    } else if (msg.type === "END_BREAK") {
      hideOverlay();
      sendResponse({ ok: true });
    }
    return false;
  });

  // 页面加载时检查是否已在休息中（防止刷新绕过）
  setTimeout(() => {
    chrome.storage.local.get(["pp_break"], (res) => {
      const b = res.pp_break;
      if (b && b.until && Date.now() < b.until) {
        showOverlay(b.until);
      }
    });
  }, 300);
})();
