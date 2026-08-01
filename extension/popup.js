// popup.js — PausePaw 守护弹窗
// 状态驱动：已登录 → 显示绿色卡片 + 统计；未登录 → 显示登录/手动连接区
const $ = (id) => document.getElementById(id);
const DEFAULT_BASE = "https://pause-paw.shop";

function apiBase(cb) {
  chrome.storage.local.get(["pp_base"], (res) => cb((res.pp_base || DEFAULT_BASE).replace(/\/$/, "")));
}

// ── 切换视图：已登录 / 未登录 ──
function showLoggedIn(email) {
  $("loginArea").style.display = "none";
  $("loggedIn").style.display = "block";
  $("disconnect").style.display = "block";
  $("gEmail").textContent = email || "已连接";
}

function showLoginArea() {
  $("loginArea").style.display = "block";
  $("loggedIn").style.display = "none";
  $("disconnect").style.display = "none";
}

// ── 数据拉取 ──
function refreshStats() {
  chrome.storage.local.get(["pp_token"], (res) => {
    const tok = res.pp_token;
    if (!tok) return;
    apiBase((API) => {
      fetch(API + "/api/stats", { headers: { Authorization: "Bearer " + tok } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { $("sBlocks").textContent = d.blocks_today; $("sSaved").textContent = d.saved_total; } })
        .catch(() => {});
    });
  });
}

function pullConfig() {
  chrome.storage.local.get(["pp_token"], (res) => {
    const tok = res.pp_token;
    if (!tok) return;
    apiBase((API) => {
      fetch(API + "/api/config?token=" + encodeURIComponent(tok))
        .then(r => r.ok ? r.json() : null)
        .then(cfg => {
          if (!cfg) return;
          chrome.storage.local.set({ pp_config: JSON.stringify(cfg) }, () => {
            chrome.tabs.query({}, (tabs) => tabs.forEach(t => { try { chrome.tabs.sendMessage(t.id, { type: "CONFIG_UPDATED" }); } catch (e) {} }));
            chrome.runtime.sendMessage({ type: "CONFIG_UPDATED" });
          });
        })
        .catch(() => {});
    });
  });
}

function startSync() {
  pullConfig(); refreshStats();
  if (window.__sync) clearInterval(window.__sync);
  window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
}

// ── 手动 Token 连接 ──
$("connect").addEventListener("click", () => {
  const tok = $("token").value.trim();
  if (!tok) return;
  const base = $("base").value.trim() || DEFAULT_BASE;
  chrome.storage.local.set({ pp_base: base, pp_token: tok, pp_email: "" }, () => {
    showLoggedIn("");
    startSync();
  });
});

// ── 断开连接 ──
$("disconnect").addEventListener("click", () => {
  chrome.storage.local.remove(["pp_token", "pp_config", "pp_email"]);
  showLoginArea();
  $("token").value = "";
  $("gErr").style.display = "none";
  if (window.__sync) clearInterval(window.__sync);
});

// ── 登录弹框辅助 ──
function okIcon() { return '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'; }
function failIcon() { return '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'; }
function showGModal(icon, title, text, btn) {
  $("gModalIcon").innerHTML = icon || "";
  $("gModalTitle").textContent = title || "";
  $("gModalText").textContent = text || "";
  const b = $("gModalClose");
  if (btn) { b.style.display = "block"; b.textContent = btn; } else { b.style.display = "none"; }
  $("gModal").style.display = "flex";
}
function hideGModal() { $("gModal").style.display = "none"; }

// ── 一键 Google 登录（委托后台执行，弹框反馈）──
$("googleLogin").addEventListener("click", () => {
  const errEl = $("gErr");
  errEl.style.display = "none";
  showGModal('<div class="spinner"></div>', "正在登录", "即将打开 Google 授权窗口，请完成登录…", "");
  apiBase((API) => chrome.runtime.sendMessage({ type: "START_GOOGLE_AUTH", api: API }));
});

// 后台回传登录结果
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "GOOGLE_AUTH_RESULT") return;
  if (msg.ok) {
    showLoggedIn(msg.email || "");
    startSync();
    showGModal(okIcon(), "登录成功", "已保存你的账号。点击下面按钮关闭本弹窗，再重新点击扩展图标即可刷新生效。", "关闭并刷新插件");
  } else {
    showGModal(failIcon(), "登录失败", msg.error || "请重试", "关闭");
  }
});

// 弹框按钮：成功→关闭弹窗（重开扩展即刷新）；失败→回到登录区
$("gModalClose").addEventListener("click", () => {
  if ($("gModalTitle").textContent === "登录成功") window.close();
  else hideGModal();
});

// ── 启动：根据存储状态决定显示哪个视图 ──
chrome.storage.local.get(["pp_token", "pp_email"], (res) => {
  if (res.pp_token) {
    // 已有 token → 显示已登录状态
    showLoggedIn(res.pp_email || "");
    startSync();
  } else {
    // 未登录 → 显示登录区
    showLoginArea();
    $("base").value = DEFAULT_BASE;
  }
});
