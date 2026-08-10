// 基于远程 main tree，用本地文件覆盖指定改动文件，创建 commit 并推到 main（Git Data API）
// 用法: GITHUB_TOKEN=ghp_xxx node _push_day001.cjs
const fs = require("fs");
const path = require("path");
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error("GITHUB_TOKEN env missing"); process.exit(1); }
const REPO = "863683348/pausepaw";
const BASE = "https://api.github.com/repos/" + REPO;
const H = {
  Authorization: "token " + TOKEN,
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
  "User-Agent": "mvp-push-day001",
};

async function gh(method, url, body) {
  const r = await fetch(BASE + url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  if (!r.ok) throw new Error(method + " " + url + " -> " + r.status + ": " + txt.slice(0, 600));
  return txt ? JSON.parse(txt) : {};
}

async function main() {
  const files = [
    "server.js",
    "public/blog.html",
    "public/i18n.js",
    "SEO_100天博客规划.md",
    "blog-publish/day-001/pausepaw-day-001-en.md",
    "blog-publish/day-001/PUBLISH_TODAY.md",
  ];

  // 1. 当前 main ref 与 commit
  const ref = await gh("GET", "/git/ref/heads/main");
  const headSha = ref.object.sha;
  console.log("remote main HEAD:", headSha);

  // 2. 读取本地文件，统一 \r\n -> \n
  const blobs = {};
  for (const f of files) {
    const full = path.join(__dirname, f);
    if (!fs.existsSync(full)) { console.error("missing local file:", f); process.exit(1); }
    let content = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
    const b = await gh("POST", "/git/blobs", { content, encoding: "utf-8" });
    blobs[f] = b.sha;
    console.log("blob ok:", f, b.sha.slice(0, 7));
  }

  // 3. 取当前 tree，替换这些路径
  const headCommit = await gh("GET", "/git/commits/" + headSha);
  const baseTreeSha = headCommit.tree.sha;
  const treeItems = files.map(f => ({ path: f, mode: "100644", type: "blob", sha: blobs[f] }));
  const newTree = await gh("POST", "/git/trees", { base_tree: baseTreeSha, tree: treeItems });
  console.log("new tree:", newTree.sha.slice(0, 7));

  // 4. 创建 commit
  const commit = await gh("POST", "/git/commits", {
    message: "blog: Day 001 screen-time data post (bilingual) + sitemap lastmod + fix google-callback brace",
    tree: newTree.sha,
    parents: [headSha],
    author: { name: "PausePaw Dev", email: "dev@pausepaw.local" },
    committer: { name: "PausePaw Dev", email: "dev@pausepaw.local" },
  });
  console.log("commit:", commit.sha);

  // 5. 更新 ref
  await gh("PATCH", "/git/refs/heads/main", { sha: commit.sha, force: false });
  console.log("PUSHED main ->", commit.sha);
}

main().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
