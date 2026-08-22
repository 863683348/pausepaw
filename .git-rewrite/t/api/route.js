/**
 * Vercel Serverless API 入口
 * 从 server.js 迁移，使用 Turso (libSQL) 替代 SQLite
 */
import { getDb } from './lib/turso.js';
import { signJWT, verifyJWT, hashPassword, publicUser, authUser, getUserByDevice } from './lib/auth.js';
import { CHARACTER_CATALOG, BILLING_PLANS } from './lib/const.js';

// PayPal 配置
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || (PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
const PAYPAL_RETURN_URL = process.env.SITE_URL + '/api/billing/success';
const PAYPAL_CANCEL_URL = process.env.SITE_URL + '/api/billing/cancel';

// Google OAuth 配置
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || (process.env.SITE_URL + '/api/auth/google/callback');
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// PayPal Token 缓存
let _ppToken = null, _ppTokenExp = 0;

export async function paypalReq(method, path, body) {
  const token = await getPaypalToken();
  const opt = { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } };
  if (body !== undefined) opt.body = JSON.stringify(body);
  const r = await fetch(PAYPAL_API_BASE + path, opt);
  const raw = await r.text();
  let j = {}; try { j = JSON.parse(raw); } catch (_) {}
  return { status: r.status, json: j, raw };
}

export async function getPaypalToken() {
  const now = Date.now();
  if (_ppToken && now < _ppTokenExp) return _ppToken;
  const basic = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_CLIENT_SECRET).toString('base64');
  const r = await fetch(PAYPAL_API_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('paypal token failed');
  _ppToken = j.access_token;
  _ppTokenExp = now + (parseInt(j.expires_in, 10) || 3600) * 1000 - 300000;
  return _ppToken;
}

export function billingPlansPublic() {
  return Object.values(BILLING_PLANS).filter(p => p.key !== 'free').map(p => ({
    key: p.key, name: p.name, price: p.price, interval: p.interval,
    currency: 'USD', max_characters: p.max_characters || 0,
    yearly_savings: p.interval === 'year' ? Math.round((1 - p.price / 12 / (BILLING_PLANS[p.yearly_equivalent] || {}).price || 0) * 100) : null
  }));
}

export function intervalMs(interval) {
  return interval === 'year' ? 365 * 864e5 : interval === 'week' ? 7 * 864e5 : 30 * 864e5;
}

export function applySubscription(db, paypalSubId, status, expiresMs) {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE paypal_subscription_id = ?').get(paypalSubId);
  if (!sub) return { applied: false };
  const now = Date.now();
  const planKey = sub.plan_key;
  const active = status === 'ACTIVE' || status === 'APPROVED';
  if (active) {
    const exp = expiresMs || (now + intervalMs(BILLING_PLANS[planKey]?.interval || 'month'));
    db.prepare('UPDATE subscriptions SET status=?, updated_at=? WHERE id=?').run(status, now, sub.id);
    db.prepare('UPDATE users SET plan=?, plan_expires=? WHERE id=?').run(planKey, exp, sub.user_id);
    return { applied: true, plan: planKey };
  }
  db.prepare('UPDATE subscriptions SET status=?, updated_at=? WHERE id=?').run(status, now, sub.id);
  const u = db.prepare('SELECT plan FROM users WHERE id=?').get(sub.user_id);
  if (u && u.plan === planKey) db.prepare('UPDATE users SET plan=\'free\', plan_expires=0 WHERE id=?').run(sub.user_id);
  return { applied: false };
}

export default async function handler(req, res) {
  const url = new URL(req.url || '/', process.env.SITE_URL || 'http://localhost:3000');
  const p = url.pathname;
  const method = req.method;
  let body = {};
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await req.json();
    } catch (_) {}
  }

  const db = getDb();

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }

  // 注册
  if (p === '/api/auth/register' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase();
    const pw = body.password || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.json({ error: 'invalid email' }, 400);
    if (pw.length < 6) return res.json({ error: 'password too short' }, 400);
    const exist = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exist) return res.json({ error: 'email exists' }, 409);
    const salt = crypto.randomUUID();
    const hash = hashPassword(pw, salt);
    const device = crypto.randomUUID();
    const r = db.prepare('INSERT INTO users(email,pw_hash,pw_salt,device_token,created_at) VALUES(?,?,?,?,?)')
      .run(email, hash, salt, device, Date.now());
    const uid = r.lastInsertRowid;
    db.prepare('INSERT INTO rules(user_id, updated_at) VALUES(?,?)').run(uid, Date.now());
    const token = signJWT({ sub: uid, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    return res.json({ token, user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(uid)) });
  }

  // 登录
  if (p === '/api/auth/login' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase();
    const pw = body.password || '';
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!u) return res.json({ error: 'invalid credentials' }, 401);
    const hash = hashPassword(pw, u.pw_salt);
    if (hash !== u.pw_hash) return res.json({ error: 'invalid credentials' }, 401);
    const token = signJWT({ sub: u.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    return res.json({ token, user: publicUser(u) });
  }

  // 谷歌登录配置
  if (p === '/api/auth/config' && method === 'GET') {
    return res.json({ google: GOOGLE_ENABLED });
  }

  // 谷歌登录发起
  if (p === '/api/auth/google' && method === 'GET') {
    if (!GOOGLE_ENABLED) return res.json({ error: 'google_oauth_not_configured' }, 400);
    const state = crypto.randomUUID();
    const ext = url.searchParams.get('ext') === '1';
    res.setHeader('Set-Cookie', `pp_gstate=${encodeURIComponent(JSON.stringify({ s: state, ext }))}; Path=/; Max-Age=600; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    const authUrl = GOOGLE_AUTH_URL + '?' + new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account'
    }).toString();
    return res.redirect(authUrl);
  }

  // 谷歌登录回调
  if (p === '/api/auth/google/callback' && method === 'GET') {
    try {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
        const [k, ...v] = c.trim().split('=');
        acc[k] = decodeURIComponent(v.join('='));
        return acc;
      }, {});
      let cookieState = null, ext = false;
      try { const o = JSON.parse(cookies.pp_gstate); cookieState = o.s; ext = !!o.ext; } catch (_) { cookieState = cookies.pp_gstate; }
      if (!code) return res.json({ error: 'missing code' }, 400);
      if (!state || !cookieState || state !== cookieState) return res.json({ error: 'state mismatch' }, 400);
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }).toString()
      });
      const tokenJson = await tokenResp.json();
      if (!tokenJson.access_token) return res.json({ error: 'google token exchange failed' }, 400);
      const uinfo = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: 'Bearer ' + tokenJson.access_token } });
      const profile = await uinfo.json();
      if (!profile.email) return res.json({ error: 'google email missing' }, 400);
      
      // 查找或创建用户
      let u = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(profile.sub);
      if (!u && profile.email) {
        u = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email.toLowerCase());
        if (u && !u.google_sub) db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(profile.sub, u.id);
      }
      if (!u) {
        const device = crypto.randomUUID();
        db.prepare('INSERT INTO users(email,pw_hash,pw_salt,google_sub,device_token,created_at) VALUES(?,?,?,?,?,?)')
          .run(profile.email.toLowerCase(), '', '', profile.sub, device, Date.now());
        u = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email.toLowerCase());
        db.prepare('INSERT INTO rules(user_id, updated_at) VALUES(?,?)').run(u.id, Date.now());
      }
      
      const token = signJWT({ sub: u.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
      res.setHeader('Set-Cookie', 'pp_gstate=; Path=/; Max-Age=0');
      const landing = ext ? '/ext-done.html' : '/app.html';
      return res.redirect(landing + '#token=' + encodeURIComponent(token));
    } catch (e) {
      return res.json({ error: e.message || 'google callback failed' }, 400);
    }
  }

  // 设备配置
  if (p === '/api/config' && method === 'GET') {
    const u = getUserByDevice(db, url.searchParams.get('token'));
    if (!u) return res.json({ error: 'invalid device token' }, 401);
    const r = db.prepare('SELECT * FROM rules WHERE user_id = ?').get(u.id);
    const cfg = {
      version: 1,
      locale: u.locale || 'zh',
      mascot: { name: u.mascot_name || 'Buddy', type: 'blob' },
      domains: JSON.parse(r?.domains_json || '[]'),
      threshold_min: r?.threshold_min || 20,
      threshold_unit: r?.threshold_unit || 'min',
      break_min: r?.break_min || 5,
      break_unit: r?.break_unit || 'min',
      whitelist: JSON.parse(r?.whitelist_json || '[]')
    };
    return res.json(cfg);
  }

  // 记录事件
  if (p === '/api/events' && method === 'POST') {
    const u = getUserByDevice(db, body.token);
    if (!u) return res.json({ error: 'invalid device token' }, 401);
    db.prepare('INSERT INTO events(user_id,domain,elapsed_min,break_min,created_at,client_date) VALUES(?,?,?,?,?,?)')
      .run(u.id, body.domain || '', parseFloat(body.elapsed_min) || 0, parseFloat(body.break_min) || 0, Date.now(), body.client_date || new Date().toISOString().slice(0, 10));
    return res.json({ ok: true });
  }

  // 计费配置
  if (p === '/api/billing/config' && method === 'GET') {
    const cfg = { enabled: Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET), mode: PAYPAL_MODE, plans: billingPlansPublic(), current: { plan: 'free', plan_expires: 0 }, characters: CHARACTER_CATALOG };
    try { const uu = authUser(req, db); cfg.current = { plan: uu.plan || 'free', plan_expires: uu.plan_expires || 0 }; } catch (_) {}
    return res.json(cfg);
  }

  // 角色列表
  if (p === '/api/characters' && method === 'GET') {
    const uu = authUser(req, db);
    const planKey = uu.plan || 'free';
    const plan = BILLING_PLANS[planKey] || BILLING_PLANS.free;
    let claimedRows = db.prepare('SELECT character_id, is_active FROM user_characters WHERE user_id=?').all(uu.id)
      .map(r => ({ character_id: r.character_id === 'buddy' ? 'cat' : r.character_id, is_active: r.is_active }));
    const seen = new Set();
    claimedRows = claimedRows.filter(r => seen.has(r.character_id) ? false : (seen.add(r.character_id), true));
    if (claimedRows.length === 0) {
      db.prepare('INSERT OR IGNORE INTO user_characters(user_id,character_id,is_active,unlocked_at) VALUES(?,?,1,?)').run(uu.id, 'cat', Date.now());
      claimedRows.push({ character_id: 'cat', is_active: 1 });
    }
    const claimedSet = new Set(claimedRows.map(r => r.character_id));
    const activeId = claimedRows.find(r => r.is_active)?.character_id || 'cat';
    return res.json({
      characters: CHARACTER_CATALOG.map(ch => ({
        id: ch.id, name_zh: ch.name_zh, name_en: ch.name_en, color: ch.color,
        claimed: claimedSet.has(ch.id), is_active: ch.id === activeId, is_default: Boolean(ch.is_default)
      })),
      active_character: activeId,
      plan_max: plan.max_characters,
      claimed_count: claimedRows.length
    });
  }

  // 激活角色
  if (p === '/api/characters/activate' && method === 'POST') {
    const uu = authUser(req, db);
    const charId = (body.character_id || '').trim();
    if (!charId) return res.json({ error: 'character_id required' }, 400);
    const exists = CHARACTER_CATALOG.find(c => c.id === charId);
    if (!exists) return res.json({ error: 'unknown character' }, 404);
    const plan = BILLING_PLANS[uu.plan || 'free'] || BILLING_PLANS.free;
    const claimedRows = db.prepare('SELECT character_id FROM user_characters WHERE user_id=?').all(uu.id);
    const alreadyClaimed = claimedRows.some(r => r.character_id === charId);
    if (!alreadyClaimed && claimedRows.length >= plan.max_characters) {
      return res.json({ error: 'limit_reached', need_upgrade: true, plan_max: plan.max_characters }, 409);
    }
    db.prepare('UPDATE user_characters SET is_active=0 WHERE user_id=?').run(uu.id);
    db.prepare('INSERT OR IGNORE INTO user_characters(user_id,character_id,is_active,unlocked_at) VALUES(?,?,1,?)').run(uu.id, charId, Date.now());
    db.prepare('UPDATE user_characters SET is_active=1 WHERE user_id=? AND character_id=?').run(uu.id, charId);
    db.prepare('UPDATE users SET mascot_name=? WHERE id=?').run(exists.name_zh, uu.id);
    return res.json({ ok: true, active_character: charId, name: exists.name_zh });
  }

  // 订阅发起
  if (p === '/api/billing/subscribe' && method === 'POST') {
    const uu = authUser(req, db);
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) return res.json({ error: 'paypal_not_configured' }, 400);
    const plan = BILLING_PLANS[body.plan_key];
    if (!plan || !plan.paypal_plan_id) return res.json({ error: 'invalid plan' }, 400);
    const pp = await paypalReq('POST', '/v1/billing/subscriptions', {
      plan_id: plan.paypal_plan_id,
      application_context: {
        brand_name: 'PausePaw',
        locale: 'en-US',
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: PAYPAL_RETURN_URL,
        cancel_url: PAYPAL_CANCEL_URL
      }
    });
    if (!pp.json?.approve_url) return res.json({ error: 'paypal subscription failed' }, 400);
    return res.json({ approve_url: pp.json.approve_url, subscription_id: pp.json.id });
  }

  // 订阅成功回调
  if (p === '/api/billing/success' && method === 'GET') {
    const subscriptionId = url.searchParams.get('subscriptionId');
    const token = url.searchParams.get('token');
    if (!subscriptionId || !token) return res.json({ error: 'missing parameters' }, 400);
    try {
      const uu = authUser(req, db);
      const pp = await paypalReq('GET', '/v1/billing/subscriptions/' + subscriptionId);
      const status = pp.json?.status || 'UNKNOWN';
      applySubscription(db, subscriptionId, status, null);
      return res.json({ ok: true, status, plan: uu.plan || 'free' });
    } catch (e) {
      return res.json({ error: e.message }, 500);
    }
  }

  // 取消订阅
  if ((p === '/api/billing/cancel' || p === '/api/billing/cancel/') && ['GET', 'POST'].includes(method)) {
    const subscriptionId = body.subscription_id || url.searchParams.get('subscription_id');
    if (!subscriptionId) return res.json({ error: 'subscription_id required' }, 400);
    try {
      const uu = authUser(req, db);
      await paypalReq('DELETE', '/v1/billing/subscriptions/' + subscriptionId);
      applySubscription(db, subscriptionId, 'CANCELLED', null);
      return res.json({ ok: true });
    } catch (e) {
      return res.json({ error: e.message }, 500);
    }
  }

  // PayPal webhook
  if (p === '/api/billing/webhook' && method === 'POST') {
    try {
      const event = body;
      const eventType = event.event_type;
      const eventId = event.id;
      // 幂等检查
      const existing = db.prepare('SELECT id FROM billing_events WHERE event_id = ?').get(eventId);
      if (existing) return res.json({ received: true });
      const resource = event.resource;
      if (eventType === 'PAYMENT.SUBSCRIPTION.ACTIVATED' || eventType === 'PAYMENT.SUBSCRIPTION.CREATED') {
        applySubscription(db, resource.id, 'ACTIVE', null);
      } else if (eventType === 'PAYMENT.SUBSCRIPTION.CANCELLED') {
        applySubscription(db, resource.id, 'CANCELLED', null);
      }
      db.prepare('INSERT INTO billing_events(event_id,event_type,handled_at,created_at) VALUES(?,?,?,?)').run(eventId, eventType, Date.now(), Date.now());
      return res.json({ received: true });
    } catch (e) {
      return res.json({ error: e.message }, 500);
    }
  }

  // 统计数据
  if (p === '/api/stats' && method === 'GET') {
    const uu = authUser(req, db);
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_events,
        AVG(elapsed_min) as avg_session_min,
        AVG(break_min) as avg_break_min,
        MAX(created_at) as last_event
      FROM events WHERE user_id = ?
    `).get(uu.id);
    const characterCount = db.prepare('SELECT COUNT(*) as cnt FROM user_characters WHERE user_id = ?').get(uu.id);
    return res.json({
      ...stats,
      characters: characterCount.cnt,
      plan: uu.plan || 'free'
    });
  }

  // 当前用户
  if (p === '/api/me' && method === 'GET') {
    const uu = authUser(req, db);
    return res.json({ user: publicUser(uu) });
  }

  // 吉祥物设置
  if (p === '/api/mascot' && method === 'POST') {
    const uu = authUser(req, db);
    const name = (body.name || '').slice(0, 30);
    db.prepare('UPDATE users SET mascot_name=? WHERE id=?').run(name, uu.id);
    return res.json({ ok: true, mascot: name });
  }

  // 语言设置
  if (p === '/api/locale' && method === 'POST') {
    const uu = authUser(req, db);
    const locale = body.locale === 'zh' ? 'zh' : 'en';
    db.prepare('UPDATE users SET locale=? WHERE id=?').run(locale, uu.id);
    return res.json({ ok: true, locale });
  }

  // 休息规则
  if (p === '/api/rules' && method === 'GET') {
    const uu = authUser(req, db);
    const r = db.prepare('SELECT * FROM rules WHERE user_id = ?').get(uu.id);
    return res.json({
      domains: JSON.parse(r?.domains_json || '[]'),
      threshold_min: r?.threshold_min || 20,
      threshold_unit: r?.threshold_unit || 'min',
      break_min: r?.break_min || 5,
      break_unit: r?.break_unit || 'min',
      whitelist: JSON.parse(r?.whitelist_json || '[]')
    });
  }

  if (p === '/api/rules' && method === 'POST') {
    const uu = authUser(req, db);
    const { domains, threshold_min, threshold_unit, break_min, break_unit, whitelist } = body;
    db.prepare('INSERT OR REPLACE INTO rules(user_id, domains_json, threshold_min, threshold_unit, break_min, break_unit, whitelist_json, updated_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(uu.id, JSON.stringify(domains || []), parseFloat(threshold_min) || 20, threshold_unit || 'min', parseFloat(break_min) || 5, break_unit || 'min', JSON.stringify(whitelist || []), Date.now());
    return res.json({ ok: true });
  }

  // 404
  return res.json({ error: 'not found' }, 404);
}
