// break.js — 全屏硬锁页逻辑（视觉升级版）
(function(){
  const MSG_ZH = { title: "该休息一下了", sub: "放下屏幕，让眼睛歇会儿", bar: "休息中 · 时间到自动恢复 · 无法关闭此页面" };
  const MSG_EN = { title: "Time for a break", sub: "Step away from the screen", bar: "Resting · Auto-resumes when done · Cannot be closed" };
  const t = (navigator.language || "zh").startsWith("zh") ? MSG_ZH : MSG_EN;

  const countEl = document.getElementById("count");
  const msgEl   = document.getElementById("msg");
  const subEl   = document.getElementById("subMsg");
  const barEl   = document.getElementById("barText");

  msgEl.textContent = t.title;
  subEl.textContent = t.sub;
  barEl.textContent = t.bar;

  // 从 storage 获取休息结束时间
  chrome.storage.local.get(["pp_break"], (res) => {
    const b = res.pp_break;
    if (!b || !b.until || Date.now() >= b.until) {
      // 已结束，通知 background 关闭
      countEl.textContent = "00:00";
      try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
      return;
    }
    startCountdown(b.until);
  });

  function startCountdown(untilMs) {
    function upd() {
      if (!untilMs) return 0;
      const remain = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
      const m = String(Math.floor(remain / 60)).padStart(2, "0");
      const s = String(remain % 60).padStart(2, "0");
      countEl.textContent = m + ":" + s;

      // 最后 30 秒变色警告
      countEl.classList.remove("warn", "danger");
      if (remain <= 3) countEl.classList.add("danger");
      else if (remain <= 30) countEl.classList.add("warn");

      if (remain <= 0) {
        try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
        return 0;
      }
      return remain;
    }

    upd();
    const timer = setInterval(() => {
      if (upd() <= 0) clearInterval(timer);
    }, 250); // 高频刷新，数字变化更流畅
  }

  // 阻止键盘快捷键关闭
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && [87, 116, 82, 70].indexOf(e.keyCode) >= 0) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.key === "Escape" || e.key === "F11" || e.key === "F4") {
      e.preventDefault(); e.stopPropagation(); return false;
    }
  });

  // 阻止右键
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); });
})();
