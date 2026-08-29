// add-blog-cards.mjs — 把缺失的详情页（postN.html）内容以卡片形式追加到 blog.html（人工 card-style 索引）
// 同时追加 Blog JSON-LD 的 BlogPosting 条目。幂等：已存在 id="postN" 则跳过。
// 用法：node scripts/add-blog-cards.mjs [n1 n2 ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG = path.join(ROOT, "public", "blog.html");
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["24", "25"];

let html = fs.readFileSync(BLOG, "utf8");

function extract(n) {
  const file = path.join(ROOT, "public", "blog", `post${n}.html`);
  if (!fs.existsSync(file)) return null;
  const s = fs.readFileSync(file, "utf8");
  const title = ((s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "").trim();
  const date = (s.match(/<time datetime="([^"]+)"/) || [])[1] || "";
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const zh = (s.match(/<div class="post-body" lang="zh">([\s\S]*?)<\/div>\s*<div class="post-body" lang="en"/) || [])[1] || "";
  const en = (s.match(/<div class="post-body" lang="en"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/) || [])[1] || "";
  const enTitle = ((s.match(/"headline": "([^"]*)"/) || [])[1] || title);
  return { title, date, desc, zh, en, enTitle };
}

function indentBlock(block, pad) {
  return block
    .trim()
    .split("\n")
    .map((l, i) => (i === 0 ? pad + l.trim() : l.trim() ? pad + l : ""))
    .join("\n");
}

let added = 0;
for (const n of targets) {
  if (html.includes('id="post' + n + '"')) {
    console.log("post" + n + ": 已存在，跳过");
    continue;
  }
  const p = extract(n);
  if (!p || !p.title) {
    console.log("post" + n + ": 无内容，跳过");
    continue;
  }
  const card =
    '      <article class="post" id="post' + n + '">\n' +
    '        <h2 data-i18n="bl_post' + n + '_t">' + p.title + "</h2>\n" +
    '        <time datetime="' + p.date + '">' + p.date + "</time>\n" +
    '        <p data-i18n="bl_post' + n + '_d">' + p.desc + "</p>\n" +
    '        <div class="post-body" lang="zh">\n' +
    indentBlock(p.zh, "          ") + "\n" +
    "        </div>\n" +
    '        <div class="post-body" lang="en" hidden>\n' +
    indentBlock(p.en, "          ") + "\n" +
    "        </div>\n" +
    "      </article>\n";

  const beforeMain = html;
  html = html.replace(/(\n\s*)(<\/main>)/, function (m, sp, tag) {
    return "\n" + card + sp + tag;
  });
  if (html === beforeMain) {
    console.log("post" + n + ": 未找到 </main>，跳过");
    continue;
  }

  // JSON-LD BlogPosting 追加（在 blogPost 数组最后一项后补）
  const ldAnchor = /(\n      \}\n    \]\n  \}\n  <\/script>)/;
  if (ldAnchor.test(html)) {
    const entry =
      ",\n      {\n" +
      '        "@type": "BlogPosting",\n' +
      '        "headline": ' + JSON.stringify(p.enTitle) + ",\n" +
      '        "alternativeHeadline": ' + JSON.stringify(p.title) + ",\n" +
      '        "datePublished": "' + p.date + '",\n' +
      '        "author": { "@type": "Organization", "name": "PausePaw" },\n' +
      '        "publisher": { "@type": "Organization", "name": "PausePaw" },\n' +
      '        "inLanguage": "en",\n' +
      '        "url": "https://pause-paw.shop/blog.html?lang=en#post' + n + '"\n' +
      "      }\n    ]\n  }\n  </script>";
    html = html.replace(ldAnchor, entry);
  }
  added++;
  console.log("post" + n + ": 卡片 + JSON-LD 已追加（" + p.date + " " + p.title + "）");
}

fs.writeFileSync(BLOG, html, "utf8");
console.log("blog.html 更新完成，新增 " + added + " 篇");
