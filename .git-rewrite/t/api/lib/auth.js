/**
 * 认证工具函数
 */
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function b64u(s) {
  return Buffer.from(s).toString('base64url');
}

export function signJWT(payload) {
  const p = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.createHmac('sha256', JWT_SECRET).update(p).digest());
  return p + '.' + sig;
}

export function verifyJWT(tok) {
  const [p, sig] = (tok || '').split('.');
  if (!p || !sig) throw new Error('bad token');
  const exp = b64u(crypto.createHmac('sha256', JWT_SECRET).update(p).digest());
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp)))
    throw new Error('bad sig');
  const obj = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (obj.exp && obj.exp < Date.now()) throw new Error('expired');
  return obj;
}

export function hashPassword(pw, salt) {
  return crypto.scryptSync(pw, salt, 64).toString('hex');
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    mascot_name: u.mascot_name,
    locale: u.locale,
    plan: u.plan,
    plan_expires: u.plan_expires,
    created_at: u.created_at
  };
}

export function authUser(req, db) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('unauthorized');
  const payload = verifyJWT(token);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!u) throw new Error('user not found');
  return u;
}

export function getUserByDevice(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM users WHERE device_token = ?').get(token);
}
