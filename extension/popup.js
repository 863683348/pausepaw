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

// ── 一键 Google 登录 ──
$("googleLogin").addEventListener("click", () => {
  const btn = $("googleLogin");
  const btnText = $("gBtnText");
  const errEl = $("gErr");

  // loading 状态
  btn.disabled = true;
  btnText.textContent = "正在跳转 Google ...";
  errEl.style.display = "none";

  apiBase((API) => {
    const url = API + "/api/auth/google?ext=1";
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (respUrl) => {
      // 恢复按钮（无论成功失败）
      btn.disabled = false;
      btnText.textContent = "使用 Google 登录";

      if (chrome.runtime.lastError || !respUrl) {
        errEl.textContent = chrome.runtime.lastError?.message || "登录已取消或超时";
        errEl.style.display = "block";
        return;
      }

      const m = respUrl.match(/[#&]token=([^&]+)/);
      if (!m) {
        errEl.textContent = "未能获取登录凭证（回调地址无 token）";
        errEl.style.display = "block";
        return;
      }

      const jwt = decodeURIComponent(m[1]);
      btnText.textContent = "验证中 ...";
      btn.disabled = true;

      fetch(API + "/api/me", { headers: { Authorization: "Bearer " + jwt } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          btn.disabled = false;
          btnText.textContent = "使用 Google 登录";
          if (!d || !d.user || !d.user.device_token) {
            errEl.textContent = "获取设备令牌失败（后端可能未配置 OAuth）";
            errEl.style.display = "block";
            return;
          }
          const email = d.user.email || "";
          chrome.storage.local.set({ pp_base: API, pp_token: d.user.device_token, pp_email: email }, () => {
            showLoggedIn(email);
            startSync();
          });
        })
        .catch(() => {
          btn.disabled = false;
          btnText.textContent = "使用 Google 登录";
          errEl.textContent = "网络错误，请检查后端地址是否可达";
          errEl.style.display = "block";
        });
    });
  });
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
