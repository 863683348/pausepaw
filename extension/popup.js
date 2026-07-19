// popup.js — 设备 Token 连接云端：拉配置(每30s) + 拉统计 + 上报由 content.js 完成
const $ = (id) => document.getElementById(id);
function getAPI() { return (localStorage.getItem("pp_base") || "http://localhost:3000").replace(/\/$/, ""); }

function refreshStats() {
  const tok = localStorage.getItem("pp_token");
  if (!tok) return;
  fetch(getAPI() + "/api/stats", { headers: { Authorization: "Bearer " + tok } })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d) { $("sBlocks").textContent = d.blocks_today; $("sSaved").textContent = d.saved_total; } })
    .catch(() => {});
}

function pullConfig() {
  const tok = localStorage.getItem("pp_token");
  if (!tok) return;
  fetch(getAPI() + "/api/config?token=" + encodeURIComponent(tok))
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (!cfg) return;
      chrome.storage.local.set({ pp_config: JSON.stringify(cfg) }, () => {
        // 通知所有 tab 配置已更新
        chrome.tabs.query({}, (tabs) => tabs.forEach(t => { try { chrome.tabs.sendMessage(t.id, { type: "CONFIG_UPDATED" }); } catch (e) {} }));
      });
    })
    .catch(() => {});
}

$("connect").addEventListener("click", () => {
  const tok = $("token").value.trim();
  if (!tok) return;
  localStorage.setItem("pp_base", $("base").value.trim() || "http://localhost:3000");
  localStorage.setItem("pp_token", tok);
  $("ok").style.display = "block";
  pullConfig();
  refreshStats();
  if (window.__sync) clearInterval(window.__sync);
  window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
});

$("disconnect").addEventListener("click", () => {
  localStorage.removeItem("pp_token");
  chrome.storage.local.remove(["pp_config"]);
  $("ok").style.display = "none";
  if (window.__sync) clearInterval(window.__sync);
  $("token").value = "";
});

// 启动
const saved = localStorage.getItem("pp_token");
if (saved) {
  $("base").value = localStorage.getItem("pp_base") || "http://localhost:3000";
  $("token").value = saved;
  $("ok").style.display = "block";
  pullConfig(); refreshStats();
  window.__sync = setInterval(() => { pullConfig(); refreshStats(); }, 30000);
} else {
  $("base").value = localStorage.getItem("pp_base") || "http://localhost:3000";
}
