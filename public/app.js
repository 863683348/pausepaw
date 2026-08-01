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
  if (!r.ok) { const e = new Error(data.error || t("auth_err")); e.status = r.status; e.data = data; throw e; }
  return data;
}

/* ---------- 渲染：认证门（仅 Google 登录） ---------- */
function renderAuth() {
  window.__authed = false;
  $("root").innerHTML = `
  <div class="auth-wrap" style="text-align:center;max-width:380px;margin:8vh auto 0;padding:40px 28px">
    <div style="margin-bottom:24px"><span class="dot" style="width:32px;height:32px;border-radius:50%;background:#f5a623;display:inline-block;vertical-align:middle;margin-right:10px"></span><span data-i18n="brand" style="font-size:22px;font-weight:700;color:#333">PausePaw</span></div>
    <p class="hint" data-i18n="auth_login">登录</p>
    <button class="btn-google" id="googleBtn" onclick="startGoogle()" style="width:100%;padding:12px 20px;font-size:15px;margin-top:16px">
      <svg viewBox="0 0 48 48" aria-hidden="true" width="18" height="18">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.01C43.93 39.05 46.98 33.15 46.98 24.55z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span data-i18n="auth_google">使用 Google 登录</span>
    </button>
  </div>`;
  window.applyI18n();
}

async function startGoogle() {
  // 直接用浏览器原生跳转：server 会 302 到 Google 同意屏。
  // 不能用 fetch(redirect:'manual')：同源下返回 opaqueredirect，headers 不可读，拿不到 Location。
  window.location.href = "/api/auth/google";
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
      <button class="theme-btn" id="themeBtn" onclick="toggleTheme()" title="切换亮/暗色" aria-label="切换主题"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
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
      <div class="adopt-header">
        <h2 data-i18n="adopt_title">领养你的伙伴</h2>
        <p class="adopt-sub" data-i18n="adopt_sub">选择一只卡通伙伴，每次休息时它会出现陪你放松</p>
      </div>
      <div class="upgrade-banner" id="upgradeBanner" style="display:none">
        <div class="upgrade-banner-inner">
          <div class="upgrade-banner-text">
            <strong data-i18n="adopt_banner_title">解锁全部伙伴</strong>
            <span data-i18n="adopt_banner_desc">升级 Pro / Family，领养全部 5 只角色，休息时随心切换</span>
          </div>
          <button class="btn" onclick="showTab('plan')" data-i18n="adopt_banner_cta">查看套餐</button>
        </div>
      </div>
      <div class="char-grid" id="charGrid"></div>
      <div class="buddy-name" id="buddyName"></div>
      <div class="hint" id="adoptHint"></div>
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
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn ghost small" onclick="copyToken()" data-i18n="ext_copy">复制 Token</button>
        <a class="btn ghost small" href="/downloads/pausepaw-extension-v0.2.0.zip" download data-i18n="ext_download">下载插件</a>
      </div>
      <div class="hint" data-i18n="ext_hint">安装插件后粘贴此 Token，规则与拦截数据云端同步。</div>
    </section>

    <section class="panel" id="tab-plan">
      <h2 data-i18n="plan_title">升级会员</h2>
      <div class="billing-toggle"><span data-i18n="plan_toggle_month" class="toggle-opt active" data-val="month" onclick="setBillingCycle('month')">月付</span><span data-i18n="plan_toggle_year" class="toggle-opt" data-val="year" onclick="setBillingCycle('year')">年付<span class="save-badge">省20%</span></span></div>
      <div class="plans-grid" id="planCards"></div>
      <div class="hint" id="planHint"></div>
      <div class="char-preview-section" id="charPreviewSection" style="display:none">
        <h3 data-i18n="plan_char_preview">套餐包含角色</h3>
        <div class="char-preview-grid" id="charPreviewGrid"></div>
      </div>
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
  if (name === "ext") $("tokenBox").textContent = ME.device_token || "\u2014";
  if (name === "plan") { loadPlans(); loadCharacters(); }
  if (name === "adopt") { loadCharacters(); }
}

async function loadProfile() {
  try { const d = await api("GET", "/api/me"); ME = d.user; $("who").textContent = ME.email; if ($("tokenBox")) $("tokenBox").textContent = ME.device_token || "—";
    if (ME.device_token && !EXT_TRACKED) { EXT_TRACKED = true; window.trackEvent("extension_connected"); }
  } catch (e) { if (/401|expired/.test(e.message)) logout(); }
}
async function adopt() {
  const name = $("nameInput").value.trim();
  if (!name) { toast(t("adopt_empty")); return; }
  try { await api("POST", "/api/mascot", { name }); ME.mascot_name = name; renderBuddy(); toast(name); } catch (e) { toast(e.message); }
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
  try { await api("POST", "/api/rules", payload); toast(t("rules_save")); window.trackEvent("save_rules", { domains: domains.length }); } catch (e) { toast(e.message); }
}
async function loadStats() {
  try {
    const s = await api("GET", "/api/stats");
    $("stBlocks").textContent = s.blocks_today;
    // saved_total 已是分钟整数，格式化：>=60 时转为"X小时Y分"更直观
    const totalMin = Math.round(s.saved_total) || 0;
    if (totalMin >= 60) {
      const h = Math.floor(totalMin / 60), m = totalMin % 60;
      $("stSaved").textContent = h + "h" + (m > 0 ? " " + m + t("dash_unit_min") : "");
    } else {
      $("stSaved").textContent = totalMin + " " + t("dash_unit_min");
    }
    $("stStreak").textContent = s.streak;
    const r = await api("GET", "/api/rules");
    $("goalBox").textContent = t("dash_goal") + "：\n" + (r.domains.join(", ") || "—") + "\n" + r.threshold_min + (r.threshold_unit === "sec" ? "s" : "m") + " → " + t("dash_saved") + " " + r.break_min + (r.break_unit === "sec" ? "s" : "m");
  } catch (e) { toast(e.message); }
}
function copyToken() {
  if (!ME || !ME.device_token) return;
  navigator.clipboard.writeText(ME.device_token).then(() => toast(t("ext_copied")));
}

/* ---------- 计费 / PayPal 会员（4档：Free/Pro月/Pro年/Family） ---------- */
let billingCycle = "month"; // "month" | "year"
function setBillingCycle(c) {
  billingCycle = c;
  document.querySelectorAll(".billing-toggle .toggle-opt").forEach(b => b.classList.toggle("active", b.dataset.val === c));
  loadPlans();
}
async function loadPlans() {
  try {
    const cfg = await api("GET", "/api/billing/config");
    const wrap = $("planCards");
    if (!cfg.enabled) { $("planHint").textContent = t("plan_off"); wrap.innerHTML = ""; return; }
    const cur = cfg.current.plan;
    const chars = cfg.characters || [];
    // 按当前周期过滤：year 模式下只显示年度套餐，month 下显示月度
    const showAnnual = billingCycle === "year";
    const visible = cfg.plans.filter(p => showAnnual ? p.interval === "year" : p.interval === "month");
    wrap.innerHTML = visible.map(p => {
      const isCur = (p.key === cur) || (showAnnual && p.key === "pro_y" && cur === "pro") || (!showAnnual && p.key === "pro" && cur === "pro_y");
      const saveTag = p.yearly_savings ? `<div class="save-tag">省 ${p.yearly_savings}%</div>` : "";
      const popular = p.key === "pro" ? `<div class="popular-tag" data-i18n="plan_popular">最受欢迎</div>` : "";
      return `
      <div class="plan-card ${isCur ? "current" : ""} ${p.key === "pro" || p.key === "pro_y" ? "featured" : ""}">
        ${popular}${saveTag}
        <div class="plan-name">${p.name}</div>
        <div class="plan-price">$${p.price}<span>/${p.interval === "year" ? t("plan_year") : t("plan_month")}</span></div>
        <div class="plan-chars"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> ${t("plan_chars")} ${p.max_characters}</div>
        <ul class="plan-feat">${planFeatures(p.key)}</ul>
        ${isCur
          ? `<div class="plan-badge" data-i18n="plan_current">当前方案</div>`
          : `<button class="btn" style="width:100%" onclick="subscribe('${p.key}')" data-i18n="plan_subscribe">订阅</button>`}
      </div>`}).join("");
    $("planHint").textContent = cur !== "free" ? t("plan_active_hint") : t("plan_hint");
    // 角色预览
    renderCharPreview(chars, visible);
    window.applyI18n();
  } catch (e) { toast(e.message); }
}
function renderCharPreview(characters, plans) {
  const section = $("charPreviewSection");
  const grid = $("charPreviewGrid");
  if (!characters.length || !plans.length) { section.style.display = "none"; return; }
  section.style.display = "";
  const maxChars = Math.max(...plans.map(p => p.max_characters || 0));
  const showChars = characters.slice(0, maxChars);
  grid.innerHTML = showChars.map(ch => `
    <div class="char-preview-card" style="--char-color:${ch.color}">
      <div class="char-avatar">${charAvatarSVG(ch.id)}</div>
      <div class="char-name">${ch.name_zh || ch.name_en}</div>
    </div>`).join("");
}
function charAvatarSVG(id) {
  const svgs = {
    cat: '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="34" r="22" fill="#FCD9B6" stroke="#E8A06A" stroke-width="2"/><ellipse cx="32" cy="50" rx="16" ry="10" fill="#FCD9B6"/><circle cx="25" cy="30" r="3" fill="#4A2E12"/><circle cx="39" cy="30" r="3" fill="#4A2E12"/><path d="M28 36 Q32 40 36 36" stroke="#E8746B" stroke-width="2" fill="none"/><path d="M20 18 L24 26 M44 18 L40 26" stroke="#E8A06A" stroke-width="3" stroke-linecap="round"/></svg>',
    doraemon: '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="34" r="23" fill="#4285F4" stroke="#2B6FE0" stroke-width="2"/><ellipse cx="32" cy="41" rx="17" ry="14" fill="#fff"/><circle cx="24" cy="33" r="3.2" fill="#1F2937"/><circle cx="40" cy="33" r="3.2" fill="#1F2937"/><circle cx="32" cy="41" r="3" fill="#E8443B"/><path d="M21 39 H43 M23 44 H41" stroke="#1F2937" stroke-width="1.4"/><rect x="30" y="9" width="4" height="7" rx="2" fill="#E8443B"/><circle cx="32" cy="9" r="2.6" fill="#FBBC05"/></svg>',
    panda: '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="34" r="22" fill="#FFF" stroke="#1F2937" stroke-width="2"/><ellipse cx="18" cy="18" rx="8" ry="10" fill="#1F2937"/><ellipse cx="46" cy="18" rx="8" ry="10" fill="#1F2937"/><circle cx="25" cy="32" r="4" fill="#1F2937"/><circle cx="39" cy="32" r="4" fill="#1F2937"/><ellipse cx="32" cy="40" rx="5" ry="3" fill="#1F2937"/></svg>',
    nezha: '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="34" r="22" fill="#FEE2E2" stroke="#EF4444" stroke-width="2"/><path d="M22 16 L28 28 L16 28 Z" fill="#EF4444"/><path d="M42 16 L36 28 L48 28 Z" fill="#EF4444"/><circle cx="25" cy="32" r="3" fill="#4A2E12"/><circle cx="39" cy="32" r="3" fill="#4A2E12"/><path d="M26 38 Q32 44 38 38" stroke="#EF4444" stroke-width="2" fill="none"/><path d="M32 10 L32 18" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>',
    aorun: '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="36" r="21" fill="#D1FAE5" stroke="#14B8A6" stroke-width="2"/><path d="M22 18 Q26 8 32 14 Q38 8 42 18" fill="none" stroke="#14B8A6" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="34" r="3" fill="#0F766E"/><circle cx="39" cy="34" r="3" fill="#0F766E"/><path d="M27 43 Q32 47 37 43" stroke="#0F766E" stroke-width="2" fill="none"/><circle cx="32" cy="43" r="2" fill="#EF4444"/><path d="M30 30 q2 -3 4 0" stroke="#14B8A6" stroke-width="1.5" fill="none"/></svg>'
  };
  return svgs[id] || svgs.cat;
}
function planFeatures(key) {
  const f = {
    pro:   [t("plan_f_pro1"), t("plan_f_pro2"), t("plan_f_pro3"), t("plan_f_pro_chars")],
    pro_y: [t("plan_f_pro1"), t("plan_f_pro2"), t("plan_f_pro3"), t("plan_f_proy_chars"), t("plan_f_proy_save")],
    family:[t("plan_f_fam1"), t("plan_f_fam2"), t("plan_f_fam3"), t("plan_f_fam_chars")]
  };
  return (f[key] || []).map(x => `<li>${x}</li>`).join("");
}

/* ---------- 角色收集系统 ---------- */
let allCharacters = [];
async function loadCharacters() {
  try {
    const d = await api("GET", "/api/characters");
    allCharacters = d.characters || [];
    renderCharGrid(d);
    $("buddyName").textContent = d.active_character ? (allCharacters.find(c => c.id === d.active_character)?.name_zh || "") : "";
    // adopt tab 提示
    const hint = $("adoptHint");
    if (hint) hint.textContent = t("adopt_hint_chars").replace("{n}", String(d.plan_max || 1)).replace("{c}", String(d.claimed_count || 0));
  } catch (e) { /* not logged in yet */ }
}
function renderCharGrid(d) {
  const grid = $("charGrid");
  if (!grid || !d.characters) return;
  const atLimit = (d.claimed_count || 0) >= (d.plan_max || 1);
  // 显示/隐藏升级横幅
  const banner = $("upgradeBanner");
  if (banner) banner.style.display = atLimit && (d.plan_max || 1) < 5 ? "" : "none";
  grid.innerHTML = d.characters.map(ch => {
    const isLocked = !ch.claimed && atLimit;
    const cls = ["char-card", ch.is_active ? "active" : "", (ch.claimed && !ch.is_active) ? "claimed" : "", isLocked ? "locked" : ""].filter(Boolean).join(" ");
    const onclick = isLocked ? `showUpgrade()` : `selectCharacter('${ch.id}')`;
    return `
    <div class="${cls}" onclick="${onclick}" data-char="${ch.id}">
      ${isLocked ? `<div class="card-pro-badge" data-i18n="char_pro_badge">PRO</div>` : ""}
      <div class="card-avatar" style="--char-color:${ch.color}">${charAvatarSVG(ch.id)}</div>
      <div class="card-name">${ch.name_zh || ch.name_en}</div>
      ${ch.is_active ? `<div class="card-active-badge" data-i18n="char_active">使用中</div>` : ""}
      ${ch.claimed && !ch.is_active ? `<div class="card-claimed-badge" data-i18n="char_claimed">已拥有</div>` : ""}
      ${isLocked ? `<div class="card-lock-overlay">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <span data-i18n="char_unlock_cta">升级解锁</span>
      </div>` : ""}
    </div>`;
  }).join("");
}
async function selectCharacter(charId) {
  try {
    const d = await api("POST", "/api/characters/activate", { character_id: charId });
    toast((d.name || "") + " " + t("char_activated"));
    loadCharacters();
  } catch (e) {
    if (e && e.status === 409) { toast(t("char_limit_reached")); showUpgrade(); }
    else toast(e.message);
  }
}
function showUpgrade() {
  showTab("plan");
  toast(t("char_need_upgrade"));
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
