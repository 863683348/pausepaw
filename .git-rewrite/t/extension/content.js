// content.js — 页面内硬锁遮罩（Shadow DOM 隔离版 v3）
// 由 background.js 的 TRIGGER_BREAK / END_BREAK 消息驱动。
//
// 🔒 核心防护：Shadow DOM 隔离
//   页面只能看到一个空壳 <div id="pp-sd">，所有遮罩内容（视频/倒计时/按钮）
//   全部藏在 Shadow Root 内部。X/Twitter 等站点的反扩展检测脚本无法窥探、无法删除。
//
// 休息期间：真猫视频全屏覆盖 + 左上角倒计时 + 确认按钮，无法关闭/滚动/交互。
// 防绕过 v3：background 新开 tab / 导航完成时重新注入；启动时读 storage 防刷新。

(function(){
  "use strict";

  // 视频源（Pexels 免费）
  const VIDEO_SRC_MP4 = "https://videos.pexels.com/video-files/15624035/15624035-uhd_1440_960_30fps.mp4";
  const VIDEO_SRC_WEBM = "https://videos.pexels.com/video-files/15624035/15624035-uhd_1440_960_30fps.webm";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1400&q=80&auto=format&fit=crop";

  // Shadow Host — 页面上唯一可见的元素（空壳，看起来无害）
  let host = null;
  let shadow = null;    // ShadowRoot (closed mode)
  let tickTimer = null;
  let untilTime = 0;
  let countdownDone = false;

  function texts() {
    const zh = !config || (config.locale || "zh") === "zh";
    return zh
      ? { bar: "休息中 · 时间到后可确认完成", confirm: "确认完成休息", done: "已确认" }
      : { bar: "Resting · Confirm when done", confirm: "Confirm break complete", done: "Confirmed" };
  }

  function showOverlay(until) {
    // 清理旧的
    if (host) { host.remove(); host = null; shadow = null; }
    untilTime = until || 0;
    countdownDone = false;
    const t = texts();

    // === Step 1: 创建空壳 host（页面只能看到这个）===
    host = document.createElement("div");
    host.id = "pp-sd";
    // 让它看起来像页面自身的一个普通容器，不引人注目
    host.setAttribute("data-pp", "1");
    host.style.cssText = "all:unset;display:contents;";

    // === Step 2: 挂载 Closed Shadow DOM（外部 JS 无法访问内部）===
    shadow = host.attachShadow({ mode: "closed" });

    // === Step 3: 所有遮罩内容放进 Shadow Root 内 ===
    shadow.innerHTML =
`<style>
:host{all:initial;display:block;position:fixed;inset:0;z-index:2147483647;}
.pp-stage{
  position:fixed;inset:0;z-index:1;
  display:flex;align-items:center;justify-content:center;
  background:#000;font-family:system-ui,"PingFang SC","Noto Sans SC",sans-serif;
  color:#fff;user-select:none;-webkit-user-select:none;
}
/* 视频 */
.pp-cat-video{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center;
  animation:pp-vidIn .8s ease-out;}
@keyframes pp-vidIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
/* 倒计时框 */
.pp-timer{position:absolute;top:24px;left:24px;z-index:10;
  background:rgba(0,0,0,0.65);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-radius:20px;padding:18px 28px;
  display:flex;align-items:center;gap:16px;
  animation:pp-timerIn .4s ease-out .2s backwards;
  box-shadow:0 12px 40px rgba(0,0,0,.5);
  border:1px solid rgba(255,255,255,.1);}
@keyframes pp-timerIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
#pp-count{font-size:clamp(52px,12vw,110px);font-weight:800;line-height:1;
  letter-spacing:-.03em;color:#fff;font-variant-numeric:tabular-nums;
  min-width:180px;text-align:center;
  transition:color .3s, transform .15s;}
#pp-count.warn{color:#fbbf24;transform:scale(1.02)}
#pp-count.danger{color:#f87171;animation:pp-pulse .5s ease-in-out infinite}
@keyframes pp-pulse{0%,100%{transform:scale(1.02)}50%{transform:scale(1.06)}}
/* 确认按钮 */
.pp-confirm{position:absolute;bottom:80px;right:32px;z-index:10;
  background:rgba(0,0,0,0.6);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;padding:14px 22px;
  display:flex;align-items:center;gap:10px;
  color:#ccc;font-size:14px;cursor:default;
  opacity:0;pointer-events:none;
  transition:opacity .4s, background .2s, color .2s;
  animation:pp-confIn .4s ease-out;}
.pp-confirm.visible{opacity:1;pointer-events:auto;}
.pp-confirm:hover{background:rgba(255,255,255,.1);color:#fff;}
.pp-check{width:22px;height:22px;border-radius:50%;
  background:rgba(74,222,128,.2);color:#4ade80;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;flex-shrink:0;}
@keyframes pp-confIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
/* 底部状态条 */
.pp-bar{position:absolute;bottom:0;left:0;right:0;z-index:10;
  background:rgba(0,0,0,.5);backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  padding:14px 28px;display:flex;align-items:center;
  justify-content:center;gap:8px;
  border-top:1px solid rgba(255,255,255,.08);
  animation:pp-barIn .5s ease-out .3s backwards;}
@keyframes pp-barIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.pp-bar span{font-size:13px;color:#aaa;display:flex;align-items:center;gap:6px;}
.pp-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;
  display:inline-block;animation:pp-blink 1.6s ease-in-out infinite}
@keyframes pp-blink{50%opacity:.25}
@media(max-width:768px){
  .pp-timer{top:14px;left:14px;padding:12px 18px;border-radius:14px;gap:12px;}
  #pp-count{font-size:clamp(40px,16vw,72px);min-width:120px;}
  .pp-confirm{bottom:60px;right:16px;padding:10px 16px;font-size:13px;}
  .pp-bar{padding:10px 16px;}
  .pp-bar span{font-size:11px;}
}
</style>
<div class="pp-stage">
<video class="pp-cat-video" id="pp-vid" autoplay loop muted playsinline
  poster="${FALLBACK_IMG}">
  <source src="${VIDEO_SRC_MP4}" type="video/mp4" />
  <source src="${VIDEO_SRC_WEBM}" type="video/webm" />
</video>
<div class="pp-timer">
  <div id="pp-count">--:--</div>
</div>
<button class="pp-confirm" id="pp-confirm">
  <span class="pp-check">&#10003;</span>
  <span id="pp-cftxt">${t.confirm}</span>
</button>
<div class="pp-bar"><span><i class="pp-dot"></i> ${t.bar}</span></div>
</div>`;

    // 挂载到页面
    document.documentElement.appendChild(host);

    // 暂停页面的 video/audio（从主文档查询，排除 shadow 内的）
    document.querySelectorAll("video, audio").forEach(el => { try { el.pause(); } catch(e) {} });

    // 尝试播放视频（在 shadow root 内查询）
    const vid = shadow.querySelector("#pp-vid");
    if (vid) {
      vid.play().catch(() => {
        const retry = () => { vid.play().catch(() => {}); };
        document.addEventListener("click", retry, { once: true });
        document.addEventListener("touchstart", retry, { once: true });
      });
    }

    startCount();

    // 绑定确认按钮（shadow root 内事件）
    const cfBtn = shadow.querySelector("#pp-confirm");
    if (cfBtn) {
      cfBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (countdownDone) {
          const txt = shadow.querySelector("#pp-cftxt");
          if (txt) txt.textContent = t.done;
          cfBtn.style.background = "rgba(74,222,128,.15)";
          const chk = cfBtn.querySelector(".pp-check");
          if (chk) chk.style.background = "rgba(74,222,128,.4)";
          try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
          setTimeout(() => hideOverlay(), 800);
        }
      });
    }
  }

  function hideOverlay() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (host) { host.remove(); host = null; shadow = null; }
    untilTime = 0;
    countdownDone = false;
  }

  function startCount() {
    // 在 shadow root 内查询元素
    const countEl = shadow && shadow.querySelector("#pp-count");
    const cfBtn = shadow && shadow.querySelector("#pp-confirm");
    if (!countEl) return;

    const upd = () => {
      const remain = untilTime ? Math.max(0, Math.ceil((untilTime - Date.now()) / 1000)) : 0;
      const m = String(Math.floor(remain / 60)).padStart(2, "0");
      const s = String(remain % 60).padStart(2, "0");
      countEl.textContent = m + ":" + s;

      countEl.classList.remove("warn", "danger");
      if (remain <= 3) countEl.classList.add("danger");
      else if (remain <= 30) countEl.classList.add("warn");

      if (remain <= 0) {
        countdownDone = true;
        if (cfBtn) cfBtn.classList.add("visible");
        try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
        return 0;
      }
      return remain;
    };

    upd();
    tickTimer = setInterval(() => {
      if (upd() <= 0 && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
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
