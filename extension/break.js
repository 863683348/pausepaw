// break.js — 全屏硬锁休息页（extension page）。倒计时结束自关并通知 background。
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

function finish() {
  chrome.runtime.sendMessage({ type: "BREAK_DONE" }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) chrome.tabs.remove(tabs[0].id).catch(() => {});
    });
  });
}

function render() {
  chrome.storage.local.get(["pp_break", "pp_config"], (res) => {
    const cfg = safeParse(res.pp_config);
    const zh = !cfg || (cfg.locale || "zh") === "zh";
    const name = (cfg && cfg.mascot && cfg.mascot.name) || "Buddy";
    document.getElementById("mascot").innerHTML = CAT_SVG;
    document.getElementById("title").textContent = zh ? "该休息一下啦" : "Time for a breather";
    document.getElementById("sub").textContent = zh ? (name + " 在等你喘口气") : (name + " is waiting for you to rest");
    const br = res.pp_break;
    if (!br) return;
    const until = br.until;
    const count = document.getElementById("count");
    const tick = () => {
      const remain = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      count.textContent = remain;
      if (remain <= 0) { finish(); return; }
      setTimeout(tick, 250);
    };
    tick();
  });
}

render();
