// break.js — 全屏硬锁页逻辑（真猫视频版 v2）
// 对标参考站：自动播放猫视频 + 全屏锁定 + 倒计时 + 确认按钮
(function(){
  const MSG_ZH = {
    bar: "休息中 · 时间到后可确认完成",
    confirm: "确认完成休息",
    done: "已确认 · 即将恢复浏览"
  };
  const MSG_EN = {
    bar: "Resting · Confirm when done",
    confirm: "Confirm break complete",
    done: "Confirmed · Resuming shortly"
  };
  const t = (navigator.language || "zh").startsWith("zh") ? MSG_ZH : MSG_EN;

  const countEl     = document.getElementById("count");
  const barEl       = document.getElementById("barText");
  const confirmBtn  = document.getElementById("confirmBtn");
  const confirmText = document.getElementById("confirmText");
  const videoEl     = document.getElementById("catVid");

  barEl.textContent = t.bar;
  confirmText.textContent = t.confirm;

  // ====== 视频播放保障 ======
  function ensureVideoPlaying() {
    if (!videoEl) return;
    // 尝试自动播放（用户交互后或 autoplay 策略允许时）
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // autoplay 被策略阻止 — 静音已设，大部分浏览器允许
        console.log("[PausePaw] Video autoplay blocked, will retry on interaction");
        // 监听首次任意交互后重试
        const tryPlay = () => {
          videoEl.play().catch(() => {});
          document.removeEventListener("click", tryPlay);
          document.removeEventListener("touchstart", tryPlay);
        };
        document.addEventListener("click", tryPlay, { once: true });
        document.addEventListener("touchstart", tryPlay, { once: true });
      });
    }
  }

  // 页面加载后立即尝试播放
  ensureVideoPlaying();

  // ====== 倒计时逻辑 ======
  let countdownDone = false;

  chrome.storage.local.get(["pp_break"], (res) => {
    const b = res.pp_break;
    if (!b || !b.until || Date.now() >= b.until) {
      countEl.textContent = "00:00";
      showConfirm();
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
        countdownDone = true;
        showConfirm();
        try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
        return 0;
      }
      return remain;
    }

    upd();
    const timer = setInterval(() => {
      if (upd() <= 0) clearInterval(timer);
    }, 250);
  }

  // ====== 确认按钮 ======
  function showConfirm() {
    confirmBtn.classList.add("visible");
    confirmText.textContent = t.confirm;
  }

  confirmBtn.addEventListener("click", () => {
    if (countdownDone) {
      confirmText.textContent = t.done;
      confirmBtn.style.background = "rgba(74,222,128,.15)";
      confirmBtn.querySelector(".check").style.background = "rgba(74,222,128,.4)";
      // 通知 background 结束休息
      try { chrome.runtime.sendMessage({ type: "BREAK_DONE" }); } catch(e) {}
      // 延迟关闭（让用户看到确认反馈）
      setTimeout(() => {
        window.close(); // 尝试关闭 tab（如果是扩展打开的）
      }, 800);
    }
  });

  // ====== 安全：阻止键盘快捷键关闭 ======
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && [87, 116, 82, 70].indexOf(e.keyCode) >= 0) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.key === "Escape" || e.key === "F11" || e.key === "F4") {
      e.preventDefault(); e.stopPropagation(); return false;
    }
  });

  // 阻止右键菜单
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); });

  // 阻止拖拽
  document.addEventListener("dragstart", (e) => { e.preventDefault(); });
})();
