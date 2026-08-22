import { readFileSync, writeFileSync } from "node:fs";

const TOKEN_PATH = "C:/Users/l'x/WorkBuddy/2026-07-15-01-50-53/.workbuddy/gh-token.txt";
const REPO = "863683348/pausepaw";
const BRANCH = "main";
const API = "https://api.github.com";

const token = readFileSync(TOKEN_PATH, "utf8").trim();
const auth = { Authorization: `Bearer ${token}`, "User-Agent": "seo-publish-bot", Accept: "application/vnd.github+json" };

const files = [
  { path: "public/blog.html", local: "C:/Users/l'x/WorkBuddy/2026-08-04-13-14-21/pause-paw/public/blog.html" },
  { path: "public/blog/post13.html", local: "C:/Users/l'x/WorkBuddy/2026-08-04-13-14-21/pause-paw/public/blog/post13.html" },
];

async function getSha(path) {
  const r = await fetch(`${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers: auth });
  if (r.status === 200) return (await r.json()).sha;
  if (r.status === 404) return null;
  throw new Error(`getSha ${path} -> ${r.status} ${await r.text()}`);
}

async function put(path, content, sha) {
  const body = { message: `feat(blog): day 11 add post13 phone addiction signs`, content, branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status >= 200 && r.status < 300) {
    return { ok: true, sha: j.commit && j.commit.sha };
  }
  throw new Error(`put ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
}

let allOk = true;
for (const f of files) {
  try {
    const raw = readFileSync(f.local, "utf8");
    const b64 = Buffer.from(raw, "utf8").toString("base64");
    const sha = await getSha(f.path);
    const res = await put(f.path, b64, sha);
    console.log(`OK ${f.path} sha=${res.sha}`);
  } catch (e) {
    allOk = false;
    console.error(`FAIL ${f.path}: ${e.message}`);
  }
}
process.exit(allOk ? 0 : 1);
