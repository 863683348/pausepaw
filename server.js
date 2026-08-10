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
import zlib from "node:zlib";

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

// ---------- Google AdSense（项 8：Auto Ads，仅生产加载；需在 AdSense 后台拿到 ca-pub ID）----------
// 仅当设置了 ADSENSE_CLIENT_ID 且处于生产环境才注入广告脚本。
// 用 Auto Ads（page-level ads）模式：只需客户端 ID，Google 审核通过后自动在页面投放，
// 不依赖具体的广告单元 Slot ID，最适合 MVP 阶段先接入、后精修。
const ADSENSE_CLIENT_ID = process.env.ADSENSE_CLIENT_ID || "";
const ADSENSE_ENABLED = IS_PROD && /^ca-pub-\d+$/.test(ADSENSE_CLIENT_ID);

// ---------- 欧盟 CMP：Google 官方 Funding Choices（AdSense 在 EEA/UK/CH 合规投放的必需项）----------
// Funding Choices 是 Google 认证的 CMP，自动向欧盟/英国/瑞士用户弹同意横幅（geo 自动识别，非欧盟用户无感）。
// 启用条件：AdSense 已开 + 配置了 FUNDING_CHOICES_CLIENT_ID（来自 AdSense 后台「隐私与消息 → EU 用户同意」的 data-client 值）。
// 注意：这是「认证 CMP」方案；自建非认证横幅无法满足 Google 对 EEA 流量的政策要求。
const FUNDING_CHOICES_CLIENT_ID = process.env.FUNDING_CHOICES_CLIENT_ID || "";
const FUNDING_CHOICES_ENABLED = IS_PROD && ADSENSE_ENABLED && /^\d+$/.test(FUNDING_CHOICES_CLIENT_ID);

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
  // 角色采用「计数制」：免费仅可领 1 个，收费不限（用 99 表示不限）
  free:  { key: "free",  name: "Free",     price: 0,    interval: "month", max_characters: 1, paypal_plan_id: "" },
  pro:   { key: "pro",   name: "Pro",      price: 3.99, interval: "month", max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_PRO || "" },
  pro_y: { key: "pro_y", name: "Pro Annual", price: 38.99, interval: "year", max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_PRO_YEAR || "", yearly_equivalent: "pro" },
  family:{ key: "family",name: "Family",   price: 7.99, interval: "month", max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_FAMILY || "" }
};

// 角色目录（卡通动画形象，可领宠物）。cat 为默认免费宠物，其余均可选。
const CHARACTER_CATALOG = [
  { id: "cat",      name_zh: "橘猫",     name_en: "Cat",           color: "#FB923C", is_default: true },
  { id: "doraemon", name_zh: "机器猫",   name_en: "Doraemon",      color: "#4285F4" },
  { id: "panda",    name_zh: "功夫熊猫", name_en: "Kung Fu Panda", color: "#1F2937" },
  { id: "nezha",    name_zh: "哪吒",     name_en: "Nezha",         color: "#EF4444" },
  { id: "aorun",    name_zh: "敖润",     name_en: "Ao Run",        color: "#14B8A6" }
];
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

// Auto Ads 脚本：仅注入客户端 ID；具体广告位由 Google 自动匹配页面布局投放。
// 欧洲用户需配合同意管理平台（CMP / Funding Choices），详见隐私政策披露与 README。
function buildAdsenseSnippet() {
  if (!ADSENSE_ENABLED) return "";
  const id = ADSENSE_CLIENT_ID;
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}" crossorigin="anonymous"></script>\n` +
    `<script>(adsbygoogle=window.adsbygoogle||[]).push({google_ad_client:"${id}",enable_page_level_ads:true});</script>\n`;
}

// Funding Choices 同意横幅加载器（欧盟 CMP）。必须位于广告脚本之前、<head 内。
function buildFundingChoicesSnippet() {
  if (!FUNDING_CHOICES_ENABLED) return "";
  return `<script async src="https://fundingchoices.google.com/static/loader_client.js" data-client="${FUNDING_CHOICES_CLIENT_ID}" data-lc="en"></script>\n`;
}

// ---------- 安全响应头（P0：上线前必须）----------
function setSecurityHeaders(res) {
  // CSP：默认严格 self；仅当分析/广告启用时放开对应外部域名。
  let csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";
  if (ANALYTICS_ENABLED) csp += " https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://go.clarity.ms";
  if (ADSENSE_ENABLED) csp += " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://fundingchoices.google.com";
  csp += "; style-src 'self' 'unsafe-inline'; img-src 'self' data:";
  if (ANALYTICS_ENABLED) csp += " https://www.google-analytics.com https://*.clarity.ms";
  if (ADSENSE_ENABLED) csp += " https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://adservice.google.com https://*.doubleclick.net";
  csp += "; connect-src 'self'";
  if (ANALYTICS_ENABLED) csp += " https://www.google-analytics.com https://region1.google-analytics.com https://*.clarity.ms";
  if (ADSENSE_ENABLED) csp += " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net";
  csp += "; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
}

// ---------- 边缘缓存策略（降低 Fast Origin Transfer 源站流量）----------
// s-maxage 供 Cloudflare 等共享缓存使用；immutable 资源长期缓存不重验证。
const CACHE_BY_EXT = {
  ".html": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  ".js":   "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  ".css":  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  ".json": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  ".svg":  "public, max-age=86400, s-maxage=604800, immutable",
  ".png":  "public, max-age=86400, s-maxage=604800, immutable",
  ".jpg":  "public, max-age=86400, s-maxage=604800, immutable",
  ".jpeg": "public, max-age=86400, s-maxage=604800, immutable",
  ".gif":  "public, max-age=86400, s-maxage=604800, immutable",
  ".webp": "public, max-age=86400, s-maxage=604800, immutable",
  ".ico":  "public, max-age=86400, s-maxage=604800, immutable",
  ".mp4":  "public, max-age=604800, s-maxage=2592000, immutable",
  ".webm": "public, max-age=604800, s-maxage=2592000, immutable",
  ".zip":  "public, max-age=604800, s-maxage=2592000, immutable",
  ".woff": "public, max-age=604800, s-maxage=2592000, immutable",
  ".woff2":"public, max-age=604800, s-maxage=2592000, immutable",
  ".ttf":  "public, max-age=604800, s-maxage=2592000, immutable"
};
function setCacheHeaders(res, ext) {
  const cc = CACHE_BY_EXT[ext.toLowerCase()] || "public, max-age=300, s-maxage=3600";
  res.setHeader("Cache-Control", cc);
}

// 文本类响应按需 gzip 压缩（进一步降低 源站→边缘 的传输体积）
const TEXT_CT = /^(text\/|application\/(javascript|json|xml)|image\/svg\+xml)/;
function sendBody(req, res, body, contentType) {
  let out = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  const ae = req.headers["accept-encoding"] || "";
  if (TEXT_CT.test(contentType) && ae.includes("gzip") && out.length > 1024) {
    const gz = zlib.gzipSync(out, { level: 6 });
    if (gz.length < out.length) { res.setHeader("Content-Encoding", "gzip"); out = gz; }
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", out.length);
  res.end(out);
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
    created_at INTEGER NOT NULL,
    client_date TEXT
  );
  CREATE TABLE IF NOT EXISTS user_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    unlocked_at INTEGER NOT NULL,
    UNIQUE(user_id, character_id)
  );
  CREATE INDEX IF NOT EXISTS idx_characters_user ON user_characters(user_id);
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
  CREATE TABLE IF NOT EXISTS billing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE,
    event_type TEXT,
    handled_at INTEGER,
    created_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_be_event ON billing_events(event_id);
`);

// 兼容已有库：加 client_date 列
try { db.prepare("ALTER TABLE events ADD COLUMN client_date TEXT").run(); } catch(e) {}

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
<div style="font-size:24px;font-weight:800;color:${color}">${ok ? "成功" : "注意"}</div>
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
  let subscription_status = "none";
  try {
    const sub = db.prepare("SELECT status FROM subscriptions WHERE user_id=? ORDER BY updated_at DESC LIMIT 1").get(u.id);
    if (sub) subscription_status = sub.status;
  } catch (_) {}
  return { id: u.id, email: u.email, mascot_name: u.mascot_name, locale: u.locale, device_token: u.device_token, plan: u.plan || "free", plan_expires: u.plan_expires || 0, subscription_status };
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
  return Object.values(BILLING_PLANS).filter(p => p.key !== "free").map(p => ({
    key: p.key, name: p.name, price: p.price, interval: p.interval,
    currency: "USD", max_characters: p.max_characters || 0,
    yearly_savings: p.interval === "year" ? Math.round((1 - p.price / 12 / (BILLING_PLANS[p.yearly_equivalent] || {}).price || 0) * 100) : null
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
        db.prepare("INSERT INTO events(user_id,domain,elapsed_min,break_min,created_at,client_date) VALUES(?,?,?,?,?,?)")
          .run(u.id, body.domain || "", parseFloat(body.elapsed_min) || 0, breakMin, Date.now(), body.client_date || new Date().toISOString().slice(0, 10));
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
        const ext = url.searchParams.get("ext") === "1";
        setCookie(res, "pp_gstate", JSON.stringify({ s: state, ext }), { maxAge: 600 });
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
          const ckRaw = parseCookies(req).pp_gstate;
          let cookieState = null, ext = false;
          try { const o = JSON.parse(ckRaw); cookieState = o.s; ext = !!o.ext; } catch (_) { cookieState = ckRaw; }
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
          const landing = ext ? "/ext-done.html" : "/app.html";
          return res.writeHead(302, { Location: landing + "#token=" + encodeURIComponent(token) }).end();
        } catch (e) {
          // e.message 在 undici 上是 "fetch failed" 太模糊；带出底层 cause（DNS / TLS / 阻塞）
          const cause = e.cause ? { code: e.cause.code, message: e.cause.message, addr: e.cause.address } : null;
          console.log("[google callback] err:", e.message, cause);
          return send(res, 400, { error: e.message || "google callback failed", cause });
        }
      }

      // ---------- 计费（项 6：PayPal 订阅） ----------
      // 配置 + 当前计划（公开，带 JWT 则回显当前会员）
      if (p === "/api/billing/config" && req.method === "GET") {
        const cfg = { enabled: PAYPAL_ENABLED, mode: PAYPAL_MODE, plans: billingPlansPublic(), current: { plan: "free", plan_expires: 0 }, characters: CHARACTER_CATALOG };
        try { const uu = authUser(req); cfg.current = { plan: uu.plan || "free", plan_expires: uu.plan_expires || 0 }; } catch (_) {}
        return send(res, 200, cfg);
      }
      // 角色收集（需 JWT）：返回用户已领角色 + 计数制上限
      if (p === "/api/characters" && req.method === "GET") {
        const uu = authUser(req);
        const planKey = uu.plan || "free";
        const plan = BILLING_PLANS[planKey] || BILLING_PLANS.free;
        // 兼容旧数据：buddy 重命名为 cat
        let claimedRows = db.prepare("SELECT character_id, is_active FROM user_characters WHERE user_id=?").all(uu.id)
          .map(r => ({ character_id: r.character_id === "buddy" ? "cat" : r.character_id, is_active: r.is_active }));
        // 去重（若 buddy 与 cat 并存）
        const seen = new Set();
        claimedRows = claimedRows.filter(r => seen.has(r.character_id) ? false : (seen.add(r.character_id), true));
        // 新用户默认自动领养橘猫
        if (claimedRows.length === 0) {
          db.prepare("INSERT OR IGNORE INTO user_characters(user_id,character_id,is_active,unlocked_at) VALUES(?,?,1,?)")
            .run(uu.id, "cat", Date.now());
          claimedRows.push({ character_id: "cat", is_active: 1 });
        }
        const claimedSet = new Set(claimedRows.map(r => r.character_id));
        const activeId = claimedRows.find(r => r.is_active)?.character_id || "cat";
        const claimedCount = claimedRows.length;
        const characters = CHARACTER_CATALOG.map(ch => ({
          id: ch.id, name_zh: ch.name_zh, name_en: ch.name_en, color: ch.color,
          claimed: claimedSet.has(ch.id),
          is_active: ch.id === activeId,
          is_default: Boolean(ch.is_default)
        }));
        return send(res, 200, { characters, active_character: activeId, plan_max: plan.max_characters, claimed_count: claimedCount });
      }
      // 选择/领养角色（需 JWT）：免费限 1 个，收费不限
      if (p === "/api/characters/activate" && req.method === "POST") {
        const uu = authUser(req);
        const charId = (body.character_id || "").trim();
        if (!charId) return send(res, 400, { error: "character_id required" });
        const exists = CHARACTER_CATALOG.find(c => c.id === charId);
        if (!exists) return send(res, 404, { error: "unknown character" });
        const plan = BILLING_PLANS[uu.plan || "free"] || BILLING_PLANS.free;
        const claimedRows = db.prepare("SELECT character_id FROM user_characters WHERE user_id=?").all(uu.id);
        const alreadyClaimed = claimedRows.some(r => r.character_id === charId);
        // 免费版最多领 1 个：未领过且已达上限 -> 拦截
        if (!alreadyClaimed && claimedRows.length >= plan.max_characters) {
          return send(res, 409, { error: "limit_reached", need_upgrade: true, plan_max: plan.max_characters });
        }
        db.prepare("UPDATE user_characters SET is_active=0 WHERE user_id=?").run(uu.id);
        db.prepare("INSERT OR IGNORE INTO user_characters(user_id,character_id,is_active,unlocked_at) VALUES(?,?,1,?)")
          .run(uu.id, charId, Date.now());
        // 无论是否新插入，都把该角色置为 active（node:sqlite 无 db.changes() 方法，直接兜底 UPDATE）
        db.prepare("UPDATE user_characters SET is_active=1 WHERE user_id=? AND character_id=?").run(uu.id, charId);
        // 同步更新 users.mascot_name
        const chName = exists.name_zh;
        db.prepare("UPDATE users SET mascot_name=? WHERE id=?").run(chName, uu.id);
        return send(res, 200, { ok: true, active_character: charId, name: chName });
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
      // 取消自动续费（需 JWT）：调用 PayPal 取消订阅 + 本地标记；当前周期结束前仍可用
      if (p === "/api/billing/cancel" && req.method === "POST") {
        const uu = authUser(req);
        const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id=? AND status IN ('ACTIVE','APPROVED','PENDING') ORDER BY updated_at DESC LIMIT 1").get(uu.id);
        if (!sub || !sub.paypal_subscription_id) return send(res, 400, { error: "no_active_subscription" });
        const r = await paypalReq("PATCH", "/v1/billing/subscriptions/" + encodeURIComponent(sub.paypal_subscription_id), [{ op: "replace", path: "/status", value: "CANCELLED" }]);
        if (r.status < 200 || r.status >= 300) return send(res, 502, { error: "paypal_cancel_failed", detail: r.raw });
        db.prepare("UPDATE subscriptions SET status='CANCELLED', updated_at=? WHERE id=?").run(Date.now(), sub.id);
        return send(res, 200, { ok: true, status: "CANCELLED" });
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
        // 幂等：PayPal 可能重发同一事件，按 event_id 去重
        const eventId = body.id || (body.resource && body.resource.id) || "";
        if (eventId) {
          const dup = db.prepare("SELECT 1 FROM billing_events WHERE event_id=?").get(eventId);
          if (dup) return send(res, 200, { ok: true, duplicated: true });
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
        if (eventId) {
          try { db.prepare("INSERT OR IGNORE INTO billing_events(event_id,event_type,handled_at,created_at) VALUES(?,?,?,?)").run(eventId, ev, Date.now(), Date.now()); } catch (_) {}
        }
        return send(res, 200, { ok: true });
      }

      // ── 统计（支持 JWT 或 device_token 两种认证）──
      if (p === "/api/stats" && req.method === "GET") {
        let u;
        try { u = authUser(req); } catch (_) {
          const h = (req.headers["authorization"] || "").replace(/^Bearer /, "");
          u = getUserByDevice(h);
          if (!u) return send(res, 401, { error: "unauthorized" });
        }
        const todayLocal = new Date().toISOString().slice(0, 10);
        const row = db.prepare(
          "SELECT COUNT(*) c, COALESCE(SUM(break_min),0) s FROM events WHERE user_id=? AND (client_date=? OR (client_date IS NULL AND created_at>=?))"
        ).get(u.id, todayLocal, new Date(todayLocal).getTime());
        const total = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(break_min),0) s FROM events WHERE user_id=?").get(u.id);
        const days = db.prepare(
          "SELECT DISTINCT COALESCE(client_date, date(created_at/1000,'unixepoch')) d FROM events WHERE user_id=? ORDER BY d DESC LIMIT 30"
        ).all(u.id);
        let streak = 0;
        let cursor = todayLocal;
        const set = new Set(days.map(x => x.d));
        while (set.has(cursor)) { streak++; cursor = new Date(new Date(cursor).getTime() - 864e5).toISOString().slice(0, 10); }
        return send(res, 200, {
          blocks_today: row.c,
          saved_today: Math.round(row.s),
          blocks_total: total.c,
          saved_total: Math.round(total.s),
          streak
        });
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

      return send(res, 404, { error: "not found" });
    }

    // ---- SEO ----
    if (p === "/robots.txt") {
      setSecurityHeaders(res);
      setCacheHeaders(res, ".txt");
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("User-agent: *\nAllow: /\nSitemap: " + SITE_URL + "/sitemap.xml\n");
      return;
    }
    if (p === "/sitemap.xml") {
      setSecurityHeaders(res);
      setCacheHeaders(res, ".xml");
      const pages = ["/", "/app.html", "/extension.html", "/blog.html", "/blog/post1.html", "/blog/post2.html", "/blog/post3.html", "/blog/day001.html", "/blog/post4.html", "/blog/post5.html", "/blog/post6.html", "/blog/post7.html", "/faq.html", "/privacy.html", "/terms.html", "/contact.html"];
      const alt = (loc, lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/>`;
      const lastmod = "2026-08-04";
      const urls = pages.map(loc => {
        const zh = SITE_URL + loc;
        const en = SITE_URL + loc + "?lang=en";
        return `  <url>\n    <loc>${zh}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alt(zh, "zh")}\n${alt(en, "en")}\n${alt(zh, "x-default")}\n  </url>`;
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
      const ct = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".txt": "text/plain; charset=utf-8" }[ext] || "application/octet-stream";
      setCacheHeaders(res, ext);
      if (ext === ".html") {
        let html = data.toString("utf8").replace(/%%SITE_URL%%/g, SITE_URL).replace(/%%ANALYTICS%%/g, buildAnalyticsSnippet()).replace(/%%ADSENSE%%/g, buildFundingChoicesSnippet() + buildAdsenseSnippet());
        const EN_META = {
          "/index.html": { title: "PausePaw — Digital Wellness Companion", description: "A cute digital-wellness companion that gently enforces screen breaks. Free core, with Pro and Family plans.", ogTitle: "PausePaw — Digital Wellness Companion", ogDesc: "A cute digital-wellness companion that gently enforces screen breaks. Free core, with Pro and Family plans." },
          "/blog.html": { title: "PausePaw Blog — Digital Wellbeing and Screen Time", description: "2026 average screen time data, why cute beats blocked, the 5-minute rule for mindless scrolling, and how to take back control of summer screen time.", ogTitle: "PausePaw Blog — Digital Wellbeing and Screen Time", ogDesc: "2026 average screen time data, why cute beats blocked, the 5-minute rule for mindless scrolling, and how to take back control of summer screen time." },
          "/faq.html": { title: "PausePaw FAQ — Install, Safety, Refunds", description: "What PausePaw is, whether it is free, which browsers it supports, how to install, data safety and refunds.", ogTitle: "PausePaw FAQ — Install, Safety, Refunds", ogDesc: "What PausePaw is, whether it is free, which browsers it supports, how to install, data safety and refunds." },
          "/privacy.html": { title: "PausePaw Privacy Policy", description: "How PausePaw protects your data: scrypt-hashed passwords, no selling, aggregated events only.", ogTitle: "PausePaw Privacy Policy", ogDesc: "How PausePaw protects your data: scrypt-hashed passwords, no selling, aggregated events only." },
          "/terms.html": { title: "PausePaw Terms of Service", description: "The terms governing your use of PausePaw digital-wellness companion and subscription plans.", ogTitle: "PausePaw Terms of Service", ogDesc: "The terms governing your use of PausePaw digital-wellness companion and subscription plans." },
          "/contact.html": { title: "Contact PausePaw", description: "Get in touch with the PausePaw team for support, billing, or partnership questions.", ogTitle: "Contact PausePaw", ogDesc: "Get in touch with the PausePaw team for support, billing, or partnership questions." },
          "/extension.html": { title: "PausePaw — Download the Browser Extension", description: "Download the PausePaw browser extension for Chrome / Edge, then load it unpacked and connect your token to sync break rules from the cloud.", ogTitle: "PausePaw — Download the Browser Extension", ogDesc: "Download the PausePaw browser extension for Chrome / Edge, then load it unpacked and connect your token to sync break rules from the cloud." }
        };
        const reqLang = (req.url.match(/[?&]lang=(zh|en)/) || [])[1];
        if (reqLang === "en" && EN_META[rel]) {
          const m = EN_META[rel];
          html = html
            .replace('<html lang="zh-CN"', '<html lang="en-US"')
            .replace(/(<link rel="canonical" href=")([^"]*)(")/, '$1$2?lang=en$3')
            .replace(/<title[^>]*>.*?<\/title>/, '<title>' + m.title + '</title>')
            .replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="' + m.description + '"')
            .replace(/<meta property="og:title" content="[^"]*"/, '<meta property="og:title" content="' + m.ogTitle + '"')
            .replace(/<meta property="og:description" content="[^"]*"/, '<meta property="og:description" content="' + m.ogDesc + '"');
        }
        sendBody(req, res, html, "text/html; charset=utf-8");
      } else sendBody(req, res, data, ct);
    });
  } catch (e) {
    send(res, 401, { error: e.message || "error" });
  }
});

server.listen(PORT, () => {
  console.log(`PausePaw server on http://localhost:${PORT}  (DB: ${DB_PATH})`);
});
