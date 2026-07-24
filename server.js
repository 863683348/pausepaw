// server.js — PausePaw 后端（零外部依赖，仅 Node 内置模块）
// 技术栈：node:http + node:sqlite(DatabaseSync) + node:crypto
// 对应 PRD：F-AC(账号) / F-ON(领养) / F-RU(规则) / F-SYNC(云端配置) / F-DA(统计) / F-PRO 预留
// 部署：任何 Node >= 22.5 环境 `node server.js`；见 Dockerfile。
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 零依赖读取 .env（若存在）：在读取其他环境变量之前执行；已有 process.env 不覆盖。
(function loadDotEnv() {
  let txt;
  try { txt = fs.readFileSync(path.join(__dirname, ".env"), "utf8"); } catch { return; }
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
})();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "app.db");
const PUBLIC_DIR = path.join(__dirname, "public");
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

// ---------- 分析（项 7：GA4 + 热力，仅生产加载）----------
// GA4_MEASUREMENT_ID: 形如 G-XXXXXXXXXX；CLARITY_ID: Microsoft Clarity 项目 ID。
// 二者任一设置且处于生产（NODE_ENV=production 或 SITE_URL 非 localhost）才注入，
// 避免 localhost 开发环境污染真实数据。
const GA4_ID = process.env.GA4_MEASUREMENT_ID || "";
const CLARITY_ID = process.env.CLARITY_ID || "";
const IS_PROD = process.env.NODE_ENV === "production" || !/localhost|127\.0\.0\.1/.test(SITE_URL);
const ANALYTICS_ENABLED = IS_PROD && Boolean(GA4_ID || CLARITY_ID);

// ---------- Google OAuth（项 5：零依赖 authorization code 流程，复用自签 JWT）----------
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || (SITE_URL + "/api/auth/google/callback");
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = process.env.GOOGLE_USERINFO_URL || "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// ---------- PayPal 支付（项 6：订阅模式，零依赖 fetch 调 PayPal REST）----------
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE ||
  (PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_RETURN_URL = SITE_URL + "/api/billing/success";
const PAYPAL_CANCEL_URL = SITE_URL + "/api/billing/cancel";
// 计划：在 PayPal 后台建 Product + Plan 后，把 Plan ID 填进对应环境变量。
const BILLING_PLANS = {
  pro: { key: "pro", name: "Pro", price: 4.99, interval: "month", paypal_plan_id: process.env.PAYPAL_PLAN_PRO || "" },
  family: { key: "family", name: "Family", price: 9.99, interval: "month", paypal_plan_id: process.env.PAYPAL_PLAN_FAMILY || "" }
};
const PAYPAL_ENABLED = Boolean(
  PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET &&
  Object.values(BILLING_PLANS).some(p => p.paypal_plan_id)
);

function buildAnalyticsSnippet() {
  if (!ANALYTICS_ENABLED) return "";
  let s = "";
  if (GA4_ID) {
    s += `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>\n`;
    s += `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:true});</script>\n`;
  }
  if (CLARITY_ID) {
    s += `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");</script>\n`;
  }
  return s;
}

// ---------- 安全响应头（P0：上线前必须）----------
function setSecurityHeaders(res) {
  // CSP：默认严格 self；仅当分析启用时放开 GA4 / Clarity 外部域名。
  let csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";
  if (ANALYTICS_ENABLED) csp += " https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://go.clarity.ms";
  csp += "; style-src 'self' 'unsafe-inline'; img-src 'self' data:";
  if (ANALYTICS_ENABLED) csp += " https://www.google-analytics.com https://*.clarity.ms";
  csp += "; connect-src 'self'";
  if (ANALYTICS_ENABLED) csp += " https://www.google-analytics.com https://region1.google-analytics.com https://*.clarity.ms";
  csp += "; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ---------- 数据库 ----------
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    pw_hash TEXT NOT NULL,
    pw_salt TEXT NOT NULL,
    mascot_name TEXT,
    locale TEXT DEFAULT 'zh',
    device_token TEXT UNIQUE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rules (
    user_id INTEGER PRIMARY KEY,
    domains_json TEXT NOT NULL DEFAULT '[]',
    threshold_min REAL NOT NULL DEFAULT 20,
    threshold_unit TEXT NOT NULL DEFAULT 'min',
    break_min REAL NOT NULL DEFAULT 5,
    break_unit TEXT NOT NULL DEFAULT 'min',
    whitelist_json TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    domain TEXT,
    elapsed_min REAL,
    break_min REAL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, created_at);
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    paypal_subscription_id TEXT,
    plan_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sub_pp ON subscriptions(paypal_subscription_id);
`);

// 兼容旧库：补 google_sub 列（OAuth 用户标识；邮箱密码用户为 NULL）
try { db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT"); } catch (_) {}
// 兼容旧库：补会员计划列
try { db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN plan_expires INTEGER DEFAULT 0"); } catch (_) {}

// ---------- 工具 ----------
const b64u = (s) => Buffer.from(s).toString("base64url");
function signJWT(payload) {
  const p = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.createHmac("sha256", JWT_SECRET).update(p).digest());
  return p + "." + sig;
}
function verifyJWT(tok) {
  const [p, sig] = (tok || "").split(".");
  if (!p || !sig) throw new Error("bad token");
  const exp = b64u(crypto.createHmac("sha256", JWT_SECRET).update(p).digest());
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp)))
    throw new Error("bad sig");
  const obj = JSON.parse(Buffer.from(p, "base64url").toString());
  if (obj.exp && obj.exp < Date.now()) throw new Error("expired");
  return obj;
}
function hashPassword(pw, salt) {
  return crypto.scryptSync(pw, salt, 64).toString("hex");
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  setSecurityHeaders(res);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}
// 简单 HTML 页面（PayPal 回跳成功/取消页；CSP 已含 inline style，无需脚本）
function sendHtml(res, title, ok, plan) {
  setSecurityHeaders(res);
  const color = ok ? "#EA7A1F" : "#9A7B5A";
  const body = ok
    ? `<p style="color:#9A7B5A;font-size:14px;margin:6px 0 18px">${plan ? "当前会员：" + plan : ""}</p>
       <a href="/app.html" style="display:inline-block;background:#FB923C;color:#fff;border-radius:999px;padding:11px 22px;font-weight:700;text-decoration:none">返回控制台</a>`
    : `<a href="/app.html" style="display:inline-block;background:#FB923C;color:#fff;border-radius:999px;padding:11px 22px;font-weight:700;text-decoration:none">返回控制台</a>`;
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PausePaw · ${title}</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#FFF7ED;color:#4A2E12;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;background:#fff;border:1px solid #F1E2CE;border-radius:18px;padding:40px 48px;box-shadow:0 10px 30px rgba(234,122,31,.12);max-width:420px">
<div style="font-size:44px">${ok ? "🐾" : "⚠️"}</div>
<h2 style="margin:10px 0 6px;color:${color}">${title}</h2>
${body}
</div></body></html>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}
function authUser(req) {
  const h = req.headers["authorization"] || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null;
  const payload = verifyJWT(tok);
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
  if (!u) throw new Error("no user");
  return u;
}
function getUserByDevice(token) {
  if (!token) return null;
  return db.prepare("SELECT * FROM users WHERE device_token = ?").get(token);
}
function getRules(uid) {
  return db.prepare("SELECT * FROM rules WHERE user_id = ?").get(uid) || null;
}
function ensureRules(uid) {
  let r = getRules(uid);
  if (!r) {
    db.prepare("INSERT INTO rules(user_id, updated_at) VALUES(?,?)").run(uid, Date.now());
    r = getRules(uid);
  }
  return r;
}
function publicUser(u) {
  return { id: u.id, email: u.email, mascot_name: u.mascot_name, locale: u.locale, device_token: u.device_token, plan: u.plan || "free", plan_expires: u.plan_expires || 0 };
}

// ---------- Cookie 工具（谷歌 OAuth state 校验用）----------
function setCookie(res, name, value, { maxAge = 600, httpOnly = true, sameSite = "Lax" } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}`;
  if (httpOnly) c += "; HttpOnly";
  if (IS_PROD) c += "; Secure";
  res.setHeader("Set-Cookie", c);
}
function parseCookies(req) {
  const h = req.headers.cookie || "";
  const out = {};
  h.split(";").map(s => s.trim()).filter(Boolean).forEach(s => {
    const i = s.indexOf("=");
    if (i > 0) out[s.slice(0, i)] = decodeURIComponent(s.slice(i + 1));
  });
  return out;
}

// 谷歌用户：按 sub 命中；否则按邮箱关联（回填 google_sub）；都没有则新建（无密码）
function findOrCreateGoogleUser(profile) {
  let u = db.prepare("SELECT * FROM users WHERE google_sub = ?").get(profile.sub);
  if (!u && profile.email) {
    u = db.prepare("SELECT * FROM users WHERE email = ?").get(profile.email.toLowerCase());
    if (u && !u.google_sub) db.prepare("UPDATE users SET google_sub = ? WHERE id = ?").run(profile.sub, u.id);
  }
  if (!u) {
    const device = crypto.randomBytes(24).toString("hex");
    const r = db.prepare("INSERT INTO users(email,pw_hash,pw_salt,google_sub,device_token,created_at) VALUES(?,?,?,?,?,?)")
      .run(profile.email.toLowerCase(), "", "", profile.sub, device, Date.now());
    u = db.prepare("SELECT * FROM users WHERE id=?").get(r.lastInsertRowid);
    db.prepare("INSERT INTO rules(user_id, updated_at) VALUES(?,?)").run(u.id, Date.now());
  }
  return u;
}

// ---------- PayPal 助手（零依赖 fetch）----------
let _ppToken = null, _ppTokenExp = 0;
async function getPaypalToken() {
  const now = Date.now();
  if (_ppToken && now < _ppTokenExp) return _ppToken;
  const basic = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET).toString("base64");
  const r = await fetch(PAYPAL_API_BASE + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("paypal token failed");
  _ppToken = j.access_token;
  _ppTokenExp = now + (parseInt(j.expires_in, 10) || 3600) * 1000 - 300000; // 提前 5 分钟失效
  return _ppToken;
}
async function paypalReq(method, path, body) {
  const token = await getPaypalToken();
  const opt = { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } };
  if (body !== undefined) opt.body = JSON.stringify(body);
  const r = await fetch(PAYPAL_API_BASE + path, opt);
  const raw = await r.text();
  let j = {}; try { j = JSON.parse(raw); } catch (_) {}
  return { status: r.status, json: j, raw };
}
function billingPlansPublic() {
  return Object.values(BILLING_PLANS).filter(p => p.paypal_plan_id).map(p => ({
    key: p.key, name: p.name, price: p.price, interval: p.interval, currency: "USD"
  }));
}
function intervalMs(interval) {
  return interval === "year" ? 365 * 864e5 : interval === "week" ? 7 * 864e5 : 30 * 864e5;
}
// 依据 PayPal 订阅状态应用 / 撤销用户会员权益
function applySubscription(paypalSubId, status, expiresMs) {
  const sub = db.prepare("SELECT * FROM subscriptions WHERE paypal_subscription_id = ?").get(paypalSubId);
  if (!sub) return { applied: false };
  const now = Date.now();
  const planKey = sub.plan_key;
  const active = status === "ACTIVE" || status === "APPROVED";
  if (active) {
    const exp = expiresMs || (now + intervalMs(BILLING_PLANS[planKey]?.interval || "month"));
    db.prepare("UPDATE subscriptions SET status=?, updated_at=? WHERE id=?").run(status, now, sub.id);
    db.prepare("UPDATE users SET plan=?, plan_expires=? WHERE id=?").run(planKey, exp, sub.user_id);
    return { applied: true, plan: planKey };
  }
  db.prepare("UPDATE subscriptions SET status=?, updated_at=? WHERE id=?").run(status, now, sub.id);
  const u = db.prepare("SELECT plan FROM users WHERE id=?").get(sub.user_id);
  if (u && u.plan === planKey) db.prepare("UPDATE users SET plan='free', plan_expires=0 WHERE id=?").run(sub.user_id);
  return { applied: false };
}

// ---------- 路由 ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const p = url.pathname;
    // CORS 预检（供插件跨域）
    if (req.method === "OPTIONS") {
      setSecurityHeaders(res);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" });
      return res.end();
    }

    // ---- API ----
    if (p.startsWith("/api/")) {
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};

      // 注册
      if (p === "/api/auth/register" && req.method === "POST") {
        const email = (body.email || "").trim().toLowerCase();
        const pw = body.password || "";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: "invalid email" });
        if (pw.length < 6) return send(res, 400, { error: "password too short" });
        const exist = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (exist) return send(res, 409, { error: "email exists" });
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = hashPassword(pw, salt);
        const device = crypto.randomBytes(24).toString("hex");
        const r = db.prepare("INSERT INTO users(email,pw_hash,pw_salt,device_token,created_at) VALUES(?,?,?,?,?)")
          .run(email, hash, salt, device, Date.now());
        const uid = r.lastInsertRowid;
        db.prepare("INSERT INTO rules(user_id, updated_at) VALUES(?,?)").run(uid, Date.now());
        const token = signJWT({ sub: uid, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
        return send(res, 200, { token, user: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(uid)) });
      }

      // 登录
      if (p === "/api/auth/login" && req.method === "POST") {
        const email = (body.email || "").trim().toLowerCase();
        const pw = body.password || "";
        const u = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!u) return send(res, 401, { error: "invalid credentials" });
        const hash = hashPassword(pw, u.pw_salt);
        if (hash !== u.pw_hash) return send(res, 401, { error: "invalid credentials" });
        const token = signJWT({ sub: u.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
        return send(res, 200, { token, user: publicUser(u) });
      }

      // 插件按 device token 拉配置（无需 JWT，跨域可用）
      if (p === "/api/config" && req.method === "GET") {
        const u = getUserByDevice(url.searchParams.get("token"));
        if (!u) return send(res, 401, { error: "invalid device token" });
        const r = ensureRules(u.id);
        const cfg = {
          version: 1,
          locale: u.locale || "zh",
          mascot: { name: u.mascot_name || "Buddy", type: "blob" },
          domains: JSON.parse(r.domains_json || "[]"),
          threshold_min: r.threshold_min,
          threshold_unit: r.threshold_unit,
          break_min: r.break_min,
          break_unit: r.break_unit,
          whitelist: JSON.parse(r.whitelist_json || "[]")
        };
        return send(res, 200, cfg);
      }

      // 插件上报拦截事件
      if (p === "/api/events" && req.method === "POST") {
        const u = getUserByDevice(body.token);
        if (!u) return send(res, 401, { error: "invalid device token" });
        const breakMin = parseFloat(body.break_min) || 0;
        db.prepare("INSERT INTO events(user_id,domain,elapsed_min,break_min,created_at) VALUES(?,?,?,?,?)")
          .run(u.id, body.domain || "", parseFloat(body.elapsed_min) || 0, breakMin, Date.now());
        return send(res, 200, { ok: true });
      }

      // 谷歌登录：是否启用（前端据此显示/隐藏按钮）
      if (p === "/api/auth/config" && req.method === "GET") {
        return send(res, 200, { google: GOOGLE_ENABLED });
      }

      // 谷歌登录：发起授权，重定向到 Google 同意屏（state 防 CSRF，存于 HttpOnly cookie）
      if (p === "/api/auth/google" && req.method === "GET") {
        if (!GOOGLE_ENABLED) return send(res, 400, { error: "google_oauth_not_configured" });
        const state = crypto.randomBytes(16).toString("hex");
        setCookie(res, "pp_gstate", state, { maxAge: 600 });
        const authUrl = GOOGLE_AUTH_URL + "?" + new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: GOOGLE_REDIRECT_URI,
          response_type: "code",
          scope: "openid email profile",
          state,
          access_type: "offline",
          prompt: "select_account"
        }).toString();
        setSecurityHeaders(res);
        return res.writeHead(302, { Location: authUrl }).end();
      }

      // 谷歌登录：回调（Google 回跳携带 code + state）
      if (p === "/api/auth/google/callback" && req.method === "GET") {
        try {
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const cookieState = parseCookies(req).pp_gstate;
          if (!code) return send(res, 400, { error: "missing code" });
          if (!state || !cookieState || state !== cookieState) return send(res, 400, { error: "state mismatch" });
          const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
              redirect_uri: GOOGLE_REDIRECT_URI, grant_type: "authorization_code"
            }).toString()
          });
          const tokenJson = await tokenResp.json();
          if (!tokenJson.access_token) return send(res, 400, { error: "google token exchange failed" });
          const uinfo = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: "Bearer " + tokenJson.access_token } });
          const p0 = await uinfo.json();
          if (!p0.email) return send(res, 400, { error: "google email missing" });
          const u = findOrCreateGoogleUser({ sub: p0.sub, email: p0.email, name: p0.name, picture: p0.picture });
          const token = signJWT({ sub: u.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
          setCookie(res, "pp_gstate", "", { maxAge: 0 });
          setSecurityHeaders(res);
          return res.writeHead(302, { Location: "/app.html#token=" + encodeURIComponent(token) }).end();
        } catch (e) {
          return send(res, 400, { error: e.message || "google callback failed" });
        }
      }

      // ---------- 计费（项 6：PayPal 订阅） ----------
      // 配置 + 当前计划（公开，带 JWT 则回显当前会员）
      if (p === "/api/billing/config" && req.method === "GET") {
        const cfg = { enabled: PAYPAL_ENABLED, mode: PAYPAL_MODE, plans: billingPlansPublic(), current: { plan: "free", plan_expires: 0 } };
        try { const uu = authUser(req); cfg.current = { plan: uu.plan || "free", plan_expires: uu.plan_expires || 0 }; } catch (_) {}
        return send(res, 200, cfg);
      }
      // 发起订阅（需 JWT）
      if (p === "/api/billing/subscribe" && req.method === "POST") {
        const uu = authUser(req);
        if (!PAYPAL_ENABLED) return send(res, 400, { error: "paypal_not_configured" });
        const plan = BILLING_PLANS[body.plan_key];
        if (!plan || !plan.paypal_plan_id) return send(res, 400, { error: "invalid plan" });
        const pp = await paypalReq("POST", "/v1/billing/subscriptions", {
          plan_id: plan.paypal_plan_id,
          application_context: {
            brand_name: "PausePaw",
            locale: "en-US",
            user_action: "SUBSCRIBE_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: PAYPAL_RETURN_URL,
            cancel_url: PAYPAL_CANCEL_URL
          }
        });
        if (pp.status !== 201 || !pp.json.id) return send(res, 502, { error: "paypal_create_failed", detail: pp.raw });
        const approve = (pp.json.links || []).find(l => l.rel === "approve");
        if (!approve) return send(res, 502, { error: "paypal_no_approve_link" });
        db.prepare("INSERT INTO subscriptions(user_id,plan_key,paypal_subscription_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?)")
          .run(uu.id, body.plan_key, pp.json.id, "PENDING", Date.now(), Date.now());
        return send(res, 200, { approve_url: approve.href });
      }
      // PayPal 回跳（成功页，公开）
      if (p === "/api/billing/success" && req.method === "GET") {
        const subId = url.searchParams.get("subscription_id");
        if (!subId) return sendHtml(res, "缺少订阅参数", false);
        if (!PAYPAL_ENABLED) return sendHtml(res, "PayPal 未配置", false);
        const info = await paypalReq("GET", "/v1/billing/subscriptions/" + encodeURIComponent(subId));
        const status = info.json.status || "UNKNOWN";
        let exp = 0;
        try { exp = info.json.billing_info && info.json.billing_info.next_billing_time ? new Date(info.json.billing_info.next_billing_time).getTime() : 0; } catch (_) {}
        const r = applySubscription(subId, status, exp);
        return sendHtml(res, r.applied ? "订阅成功！" : ("订阅状态：" + status), r.applied, r.applied ? r.plan : null);
      }
      // PayPal 回跳（取消页，公开）
      if (p === "/api/billing/cancel" && req.method === "GET") {
        return sendHtml(res, "已取消订阅流程", false);
      }
      // PayPal Webhook（公开；生产建议配置 PAYPAL_WEBHOOK_ID 校验签名）
      if (p === "/api/billing/webhook" && req.method === "POST") {
        if (PAYPAL_WEBHOOK_ID) {
          const v = await paypalReq("POST", "/v1/notifications/verify-webhook-signature", {
            auth_algo: req.headers["paypal-auth-algo"] || "",
            cert_url: req.headers["paypal-cert-url"] || "",
            transmission_id: req.headers["paypal-transmission-id"] || "",
            transmission_sig: req.headers["paypal-transmission-sig"] || "",
            transmission_time: req.headers["paypal-transmission-time"] || "",
            webhook_id: PAYPAL_WEBHOOK_ID,
            webhook_event: body
          }).catch(() => ({ status: 0, json: {} }));
          if (v.status !== 200 || v.json.verification_status !== "SUCCESS") return send(res, 400, { error: "webhook verification failed" });
        }
        const ev = body.event_type || "";
        const resource = body.resource || {};
        if (ev === "PAYMENT.SALE.COMPLETED") {
          const sid = resource.billing_agreement_id || resource.id;
          if (sid) applySubscription(sid, "ACTIVE", 0);
        } else {
          const statusMap = {
            "BILLING.SUBSCRIPTION.ACTIVATED": "ACTIVE",
            "BILLING.SUBSCRIPTION.CANCELLED": "CANCELLED",
            "BILLING.SUBSCRIPTION.EXPIRED": "EXPIRED",
            "BILLING.SUBSCRIPTION.SUSPENDED": "SUSPENDED",
            "BILLING.SUBSCRIPTION.PAYMENT_FAILED": "PAYMENT_FAILED"
          };
          const status = statusMap[ev];
          if (status && resource.id) {
            let exp = 0;
            try { exp = resource.billing_info && resource.billing_info.next_billing_time ? new Date(resource.billing_info.next_billing_time).getTime() : 0; } catch (_) {}
            applySubscription(resource.id, status, exp);
          }
        }
        return send(res, 200, { ok: true });
      }

      // 以下接口需 JWT ----
      const u = authUser(req);

      if (p === "/api/me" && req.method === "GET") {
        return send(res, 200, { user: publicUser(u) });
      }
      if (p === "/api/mascot" && req.method === "POST") {
        const name = (body.name || "").trim().slice(0, 16);
        if (!name) return send(res, 400, { error: "empty name" });
        db.prepare("UPDATE users SET mascot_name = ? WHERE id = ?").run(name, u.id);
        return send(res, 200, { ok: true, mascot_name: name });
      }
      if (p === "/api/locale" && req.method === "POST") {
        const loc = body.locale === "en" ? "en" : "zh";
        db.prepare("UPDATE users SET locale = ? WHERE id = ?").run(loc, u.id);
        return send(res, 200, { ok: true, locale: loc });
      }
      if (p === "/api/rules" && req.method === "GET") {
        const r = ensureRules(u.id);
        return send(res, 200, {
          domains: JSON.parse(r.domains_json || "[]"),
          threshold_min: r.threshold_min, threshold_unit: r.threshold_unit,
          break_min: r.break_min, break_unit: r.break_unit,
          whitelist: JSON.parse(r.whitelist_json || "[]")
        });
      }
      if (p === "/api/rules" && req.method === "POST") {
        const domains = JSON.stringify(Array.isArray(body.domains) ? body.domains : []);
        const whitelist = JSON.stringify(Array.isArray(body.whitelist) ? body.whitelist : []);
        const threshold_min = parseFloat(body.threshold_min) || 20;
        const threshold_unit = body.threshold_unit === "sec" ? "sec" : "min";
        const break_min = parseFloat(body.break_min) || 5;
        const break_unit = body.break_unit === "sec" ? "sec" : "min";
        db.prepare(`INSERT INTO rules(user_id,domains_json,threshold_min,threshold_unit,break_min,break_unit,whitelist_json,updated_at)
          VALUES(?,?,?,?,?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET
          domains_json=excluded.domains_json, threshold_min=excluded.threshold_min, threshold_unit=excluded.threshold_unit,
          break_min=excluded.break_min, break_unit=excluded.break_unit, whitelist_json=excluded.whitelist_json, updated_at=excluded.updated_at`)
          .run(u.id, domains, threshold_min, threshold_unit, break_min, break_unit, whitelist, Date.now());
        return send(res, 200, { ok: true });
      }
      if (p === "/api/stats" && req.method === "GET") {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const t0 = startOfToday.getTime();
        const row = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(break_min),0) s FROM events WHERE user_id=? AND created_at>=?").get(u.id, t0);
        const total = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(break_min),0) s FROM events WHERE user_id=?").get(u.id);
        // 连续守规：最近 N 天是否有拦截（简化：以自然日计）
        const days = db.prepare("SELECT DISTINCT date(created_at/1000,'unixepoch') d FROM events WHERE user_id=? ORDER BY d DESC LIMIT 30").all(u.id);
        let streak = 0;
        const today = new Date().toISOString().slice(0, 10);
        let cursor = today;
        const set = new Set(days.map(x => x.d));
        while (set.has(cursor)) { streak++; cursor = new Date(new Date(cursor).getTime() - 864e5).toISOString().slice(0, 10); }
        return send(res, 200, {
          blocks_today: row.c, saved_today: Math.round(row.s),
          blocks_total: total.c, saved_total: Math.round(total.s),
          streak
        });
      }

      return send(res, 404, { error: "not found" });
    }

    // ---- SEO ----
    if (p === "/robots.txt") {
      setSecurityHeaders(res);
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("User-agent: *\nAllow: /\nSitemap: " + SITE_URL + "/sitemap.xml\n");
      return;
    }
    if (p === "/sitemap.xml") {
      setSecurityHeaders(res);
      const pages = ["/", "/app.html", "/blog.html", "/faq.html", "/privacy.html", "/terms.html", "/contact.html"];
      const alt = (loc, lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/>`;
      const urls = pages.map(loc => {
        const zh = SITE_URL + loc;
        const en = SITE_URL + loc + "?lang=en";
        return `  <url>\n    <loc>${zh}</loc>\n${alt(zh, "zh")}\n${alt(en, "en")}\n${alt(SITE_URL + "/", "x-default")}\n  </url>`;
      }).join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      res.end(xml);
      return;
    }

    // ---- 静态文件 ----
    let rel = decodeURIComponent(p);
    if (rel === "/") rel = "/index.html";
    const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "forbidden" });
    fs.readFile(filePath, (err, data) => {
      setSecurityHeaders(res);
      if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }
      const ext = path.extname(filePath);
      const ct = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" }[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": ct });
      if (ext === ".html") res.end(data.toString("utf8").replace(/%%SITE_URL%%/g, SITE_URL).replace(/%%ANALYTICS%%/g, buildAnalyticsSnippet()));
      else res.end(data);
    });
  } catch (e) {
    send(res, 401, { error: e.message || "error" });
  }
});

server.listen(PORT, () => {
  console.log(`PausePaw server on http://localhost:${PORT}  (DB: ${DB_PATH})`);
});
