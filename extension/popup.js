// popup.js — 设备 Token 连接云端：拉配置(每30s) + 拉统计 + 上报由 background 完成
// 存储统一走 chrome.storage.local（与 content/background 同源），默认生产域名。
const $ = (id) => document.getElementById(id);
const DEFAULT_BASE = "https://pause-paw.shop";

function apiBase(cb) {
  chrome.storage.local.get(["pp_base"], (res) => cb((res.pp_base || DEFAULT_BASE).replace(/\/$/, "")));
}

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

$("connect").addEventListener("click", () => {
  const tok = $("token").value.trim();
  if (!tok) return;
  const base = $("base").value.trim() || DEFAULT_BASE;
  chrome.storage.local.set({ pp_base: base, pp_token: tok }, () => {
    $("ok").style.display = "block";
    pullConfig();
    refreshStats();
    if (window.__sync) clearInterval(window.__sync);
    window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
  });
});

$("disconnect").addEventListener("click", () => {
  chrome.storage.local.remove(["pp_token", "pp_config", "pp_email"]);
  $("ok").style.display = "none";
  $("gOk").style.display = "none";
  if (window.__sync) clearInterval(window.__sync);
  $("token").value = "";
});

// 一键 Google 登录：launchWebAuthFlow 走后端既有 Google OAuth（复用同一 redirect_uri，无需改 Google Console）
// 拿到 JWT 后调 /api/me 换 device_token，存为 pp_token 供 /api/config、/api/events 使用。
$("googleLogin").addEventListener("click", () => {
  $("gErr").style.display = "none";
  apiBase((API) => {
    const url = API + "/api/auth/google?ext=1";
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (respUrl) => {
      if (chrome.runtime.lastError || !respUrl) {
        $("gErr").textContent = "登录已取消或失败";
        $("gErr").style.display = "block";
        return;
      }
      const m = respUrl.match(/[#&]token=([^&]+)/);
      if (!m) {
        $("gErr").textContent = "未能获取登录凭证";
        $("gErr").style.display = "block";
        return;
      }
      const jwt = decodeURIComponent(m[1]);
      fetch(API + "/api/me", { headers: { Authorization: "Bearer " + jwt } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d || !d.user || !d.user.device_token) {
            $("gErr").textContent = "获取设备令牌失败";
            $("gErr").style.display = "block";
            return;
          }
          chrome.storage.local.set({ pp_base: API, pp_token: d.user.device_token, pp_email: d.user.email || "" }, () => {
            $("ok").style.display = "block";
            $("gOk").textContent = "已用 Google 登录" + (d.user.email ? "：" + d.user.email : "");
            $("gOk").style.display = "block";
            pullConfig(); refreshStats();
            if (window.__sync) clearInterval(window.__sync);
            window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
          });
        })
        .catch(() => {
          $("gErr").textContent = "网络错误，请重试";
          $("gErr").style.display = "block";
        });
    });
  });
});

// 启动
chrome.storage.local.get(["pp_token", "pp_base"], (res) => {
  if (res.pp_token) {
    $("base").value = res.pp_base || DEFAULT_BASE;
    $("token").value = res.pp_token;
    $("ok").style.display = "block";
    pullConfig(); refreshStats();
    window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
  } else {
    $("base").value = DEFAULT_BASE;
  }
});
