// app.js — 前端逻辑（真实后端 API 调用）。PRD F-AC/F-ON/F-RU/F-SYNC/F-DA + 扩展 Token。
const $ = (id) => document.getElementById(id);
let TOKEN = localStorage.getItem("pp_token") || "";
let ME = null;
let MODE = "login"; // login | register
let EXT_TRACKED = false; // 确保 extension_connected 仅上报一次

function t(key) { return (window.I18N[window.getLang()] || {})[key] || key; }
function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }

async function api(method, path, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  if (TOKEN) opt.headers["Authorization"] = "Bearer " + TOKEN;
  const r = await fetch(path, opt);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || t("auth_err"));
  return data;
}

/* ---------- 渲染：认证门 ---------- */
function renderAuth() {
  window.__authed = false;
  $("root").innerHTML = `
  <header class="bar">
    <div class="logo"><span class="dot"></span><span data-i18n="brand">PausePaw</span></div>
    <div class="topuser">
      <button class="btn-google small" id="googleBtn" onclick="startGoogle()">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.01C43.93 39.05 46.98 33.15 46.98 24.55z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span data-i18n="auth_google">使用 Google 登录</span>
      </button>
    </div>
  </header>
  <div class="auth-wrap">
    <h2 data-i18n="brand">PausePaw</h2>
    <p class="hint" id="authTitle"></p>
    <div class="auth-divider"><span data-i18n="auth_or">或</span></div>
    <label data-i18n="auth_email">邮箱</label>
    <input type="email" id="email" placeholder="you@example.com" />
    <label data-i18n="auth_password">密码</label>
    <input type="password" id="password" placeholder="••••••" />
    <div class="auth-err" id="authErr"></div>
    <button class="btn" style="width:100%" id="authSubmit" data-i18n="auth_submit">提交</button>
    <div class="auth-switch" id="authSwitch"></div>
  </div>`;
  $("authTitle").textContent = MODE === "login" ? t("auth_login") : t("auth_register");
  $("authSwitch").textContent = MODE === "login" ? t("auth_to_register") : t("auth_to_login");
  $("authSwitch").onclick = () => { MODE = MODE === "login" ? "register" : "login"; renderAuth(); };
  $("authSubmit").onclick = submitAuth;
  // 谷歌按钮默认显示在右上角（未配凭据也可见，点击会提示去配置）
  window.applyI18n();
}

async function startGoogle() {
  try {
    const r = await fetch("/api/auth/google", { redirect: "manual" });
    const url = r.headers.get("Location");
    if (!url) { const m = t("auth_google_off"); if ($("authErr")) $("authErr").textContent = m; else toast(m); return; }
    window.location = url;
  } catch (e) { const m = e.message; if ($("authErr")) $("authErr").textContent = m; else toast(m); }
}

async function submitAuth() {
  const email = $("email").value.trim(), pw = $("password").value;
  $("authErr").textContent = "";
  try {
    const data = await api("POST", "/api/auth/" + (MODE === "login" ? "login" : "register"), { email, password: pw });
    TOKEN = data.token; localStorage.setItem("pp_token", TOKEN); ME = data.user;
    window.trackEvent(MODE === "register" ? "sign_up" : "login", { method: "email" });
    renderApp();
  } catch (e) { $("authErr").textContent = e.message; }
}

/* ---------- 渲染：主应用 ---------- */
function renderApp() {
  window.__authed = true;
  const L = window.getLang();
  $("root").innerHTML = `
  <header class="bar">
    <div class="logo"><span class="dot"></span><span data-i18n="brand">PausePaw</span></div>
    <div class="topuser">
      <span class="who-email" id="who"></span>
      <button class="theme-btn" id="themeBtn" onclick="toggleTheme()" title="切换亮/暗色" aria-label="切换主题">🌙</button>
      <div class="lang-switch">
        <button data-lang="zh" onclick="setLang('zh')">中文</button>
        <button data-lang="en" onclick="setLang('en')">EN</button>
      </div>
      <button class="btn ghost small" onclick="logout()" data-i18n="acct_logout">退出</button>
    </div>
  </header>
  <div class="appwrap">
    <div class="tabs">
      <button class="active" data-tab="adopt" onclick="showTab('adopt')" data-i18n="tab_adopt">领养伙伴</button>
      <button data-tab="rules" onclick="showTab('rules')" data-i18n="tab_rules">休息规则</button>
      <button data-tab="dash" onclick="showTab('dash')" data-i18n="tab_dash">看板</button>
      <button data-tab="ext" onclick="showTab('ext')" data-i18n="tab_ext">扩展</button>
      <button data-tab="plan" onclick="showTab('plan')" data-i18n="tab_plan">会员</button>
    </div>

    <section class="panel active" id="tab-adopt">
      <h2 data-i18n="adopt_title">领养你的伙伴</h2>
      <div class="mascot-show"><img src="mascot.svg" alt="mascot" /></div>
      <div class="buddy-name" id="buddyName"></div>
      <label data-i18n="adopt_name_ph">名字</label>
      <input type="text" id="nameInput" maxlength="16" />
      <div style="margin-top:14px"><button class="btn" onclick="adopt()" data-i18n="adopt_btn">领养它</button></div>
    </section>

    <section class="panel" id="tab-rules">
      <h2 data-i18n="rules_title">设置休息规则</h2>
      <label data-i18n="rules_domains">网站</label>
      <textarea id="domains" data-i18n-ph="rules_domains_ph"></textarea>
      <div class="row">
        <div><label data-i18n="rules_threshold">时长</label><input type="number" id="threshold" value="20" min="0.1" step="0.1" /></div>
        <div style="flex:0 0 110px"><label>&nbsp;</label><select id="thresholdUnit"><option value="min" data-i18n="common_min">分钟</option><option value="sec">秒</option></select></div>
      </div>
      <div class="row">
        <div><label data-i18n="rules_break">休息</label><input type="number" id="break" value="5" min="1" step="1" /></div>
        <div style="flex:0 0 110px"><label>&nbsp;</label><select id="breakUnit"><option value="min" data-i18n="common_min">分钟</option><option value="sec">秒</option></select></div>
      </div>
      <label data-i18n="rules_whitelist">免打扰</label>
      <textarea id="whitelist" data-i18n-ph="rules_whitelist_ph"></textarea>
      <div style="margin-top:16px"><button class="btn" onclick="saveRules()" data-i18n="rules_save">保存规则</button></div>
      <div class="hint" data-i18n="rules_hint">保存后云端立即生效，插件会自动拉取。</div>
    </section>

    <section class="panel" id="tab-dash">
      <h2 data-i18n="dash_title">看板</h2>
      <div class="stats">
        <div class="stat"><div class="num" id="stBlocks">0</div><div class="lab" data-i18n="dash_blocks">今日拦截</div></div>
        <div class="stat"><div class="num" id="stSaved">0</div><div class="lab" data-i18n="dash_saved">累计省下</div></div>
        <div class="stat"><div class="num" id="stStreak">0</div><div class="lab" data-i18n="dash_streak">连续守规</div></div>
      </div>
      <div class="goal-box" id="goalBox"></div>
    </section>

    <section class="panel" id="tab-ext">
      <h2 data-i18n="ext_title">连接插件</h2>
      <label data-i18n="ext_token">Token</label>
      <div class="token-box" id="tokenBox">—</div>
      <div style="margin-top:10px"><button class="btn ghost small" onclick="copyToken()" data-i18n="ext_copy">复制 Token</button></div>
      <div class="hint" data-i18n="ext_hint">安装插件后粘贴此 Token，规则与拦截数据云端同步。</div>
    </section>

    <section class="panel" id="tab-plan">
      <h2 data-i18n="plan_title">升级会员</h2>
      <div class="plans" id="planCards"></div>
      <div class="hint" id="planHint"></div>
    </section>
  </div>`;
  $("who").textContent = ME.email;
  window.applyI18n();
  loadProfile();
  loadRules();
}

/* ---------- 操作 ---------- */
function logout() { TOKEN = ""; ME = null; localStorage.removeItem("pp_token"); renderAuth(); }

function showTab(name) {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "dash") { loadStats(); window.trackEvent("view_dashboard"); }
  if (name === "ext") $("tokenBox").textContent = ME.device_token || "—";
  if (name === "plan") loadPlans();
}

async function loadProfile() {
  try { const d = await api("GET", "/api/me"); ME = d.user; $("who").textContent = ME.email; if ($("tokenBox")) $("tokenBox").textContent = ME.device_token || "—";
    if (ME.device_token && !EXT_TRACKED) { EXT_TRACKED = true; window.trackEvent("extension_connected"); }
  } catch (e) { if (/401|expired/.test(e.message)) logout(); }
}
async function adopt() {
  const name = $("nameInput").value.trim();
  if (!name) { toast(t("adopt_empty")); return; }
  try { await api("POST", "/api/mascot", { name }); ME.mascot_name = name; renderBuddy(); toast("🐾 " + name); } catch (e) { toast(e.message); }
}
function renderBuddy() {
  const name = (ME && ME.mascot_name) || "";
  $("buddyName").textContent = name ? t("adopt_hi") + " " + name : "";
  if (name) $("nameInput").value = name;
}
async function loadRules() {
  try {
    const r = await api("GET", "/api/rules");
    $("domains").value = (r.domains || []).join("\n");
    $("threshold").value = r.threshold_min; $("thresholdUnit").value = r.threshold_unit;
    $("break").value = r.break_min; $("breakUnit").value = r.break_unit;
    $("whitelist").value = (r.whitelist || []).join("\n");
    renderBuddy();
  } catch (e) { toast(e.message); }
}
async function saveRules() {
  const domains = $("domains").value.split(/\r?\n/).map(s => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")).filter(Boolean);
  const whitelist = $("whitelist").value.split(/\r?\n/).map(s => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")).filter(Boolean);
  const payload = {
    domains, whitelist,
    threshold_min: parseFloat($("threshold").value) || 20, threshold_unit: $("thresholdUnit").value,
    break_min: parseFloat($("break").value) || 5, break_unit: $("breakUnit").value
  };
  try { await api("POST", "/api/rules", payload); toast("✅ " + t("rules_save")); window.trackEvent("save_rules", { domains: domains.length }); } catch (e) { toast(e.message); }
}
async function loadStats() {
  try {
    const s = await api("GET", "/api/stats");
    $("stBlocks").textContent = s.blocks_today;
    $("stSaved").textContent = s.saved_total + " " + t("dash_unit_min");
    $("stStreak").textContent = s.streak;
    const r = await api("GET", "/api/rules");
    $("goalBox").textContent = t("dash_goal") + "：\n" + (r.domains.join(", ") || "—") + "\n" + r.threshold_min + (r.threshold_unit === "sec" ? "s" : "m") + " → " + t("dash_saved") + " " + r.break_min + (r.break_unit === "sec" ? "s" : "m");
  } catch (e) { toast(e.message); }
}
function copyToken() {
  if (!ME || !ME.device_token) return;
  navigator.clipboard.writeText(ME.device_token).then(() => toast(t("ext_copied")));
}

/* ---------- 计费 / PayPal 会员 ---------- */
async function loadPlans() {
  try {
    const cfg = await api("GET", "/api/billing/config");
    const wrap = $("planCards");
    if (!cfg.enabled) { $("planHint").textContent = t("plan_off"); wrap.innerHTML = ""; return; }
    const cur = cfg.current.plan;
    wrap.innerHTML = cfg.plans.map(p => `
      <div class="plan-card ${p.key === cur ? "current" : ""}">
        <div class="plan-name">${p.name}</div>
        <div class="plan-price">$${p.price}<span>/${p.interval === "month" ? t("plan_month") : p.interval}</span></div>
        <ul class="plan-feat">${planFeatures(p.key)}</ul>
        ${p.key === cur
          ? `<div class="plan-badge" data-i18n="plan_current">当前方案</div>`
          : `<button class="btn" style="width:100%" onclick="subscribe('${p.key}')" data-i18n="plan_subscribe">订阅</button>`}
      </div>`).join("");
    $("planHint").textContent = cur !== "free" ? t("plan_active_hint") : t("plan_hint");
    window.applyI18n();
  } catch (e) { toast(e.message); }
}
function planFeatures(key) {
  const f = {
    pro: [t("plan_f_pro1"), t("plan_f_pro2"), t("plan_f_pro3")],
    family: [t("plan_f_fam1"), t("plan_f_fam2"), t("plan_f_fam3")]
  };
  return (f[key] || []).map(x => `<li>${x}</li>`).join("");
}
async function subscribe(planKey) {
  try {
    const d = await api("POST", "/api/billing/subscribe", { plan_key: planKey });
    if (!d.approve_url) { toast(t("plan_err")); return; }
    window.trackEvent("begin_checkout", { plan: planKey });
    window.location = d.approve_url;
  } catch (e) { toast(e.message); }
}

/* ---------- 启动 ---------- */
window.addEventListener("DOMContentLoaded", () => {
  window.applyI18n();
  // 谷歌登录回跳：URL 片段携带 token
  const hm = location.hash.match(/token=([^&]+)/);
  if (hm) {
    TOKEN = decodeURIComponent(hm[1]);
    localStorage.setItem("pp_token", TOKEN);
    history.replaceState(null, "", location.pathname + location.search); // 清掉地址栏里的 token 痕迹
    window.trackEvent("login", { method: "google" });
    api("GET", "/api/me").then(d => { ME = d.user; renderApp(); }).catch(() => { TOKEN = ""; localStorage.removeItem("pp_token"); renderAuth(); });
    return;
  }
  if (TOKEN) {
    api("GET", "/api/me").then(d => { ME = d.user; renderApp(); }).catch(() => { TOKEN = ""; localStorage.removeItem("pp_token"); renderAuth(); });
  } else {
    renderAuth();
  }
});
