// build-blog.mjs — pause-paw 博客数据驱动生成器
// 读取 public/blog/posts.mjs（单一数据源），全量生成：
//   1. public/blog.html        （紧凑索引：标题+日期+摘要卡片按 date 倒序，链接到详情页 + Blog JSON-LD）
//   2. public/blog/postN.html  （每篇详情页：Article/可选 FAQPage JSON-LD）
//   3. public/i18n.js          （注入 bl_<key>_t / bl_<key>_d 中英键）
// 用法：node build-blog.mjs            （写回 public/）
//       node build-blog.mjs --dry     （写到 /c/worktmp/paw-build 对比，不碰 public/）
import fs from "node:fs";
import path from "node:path";
import { posts as ALL_POSTS } from "./public/blog/posts.mjs";

const ROOT = path.resolve(".");
const DRY = process.argv.includes("--dry");
const OUT = DRY ? "C:/worktmp/paw-build" : ROOT;
const PUB = path.join(OUT, "public");
const BLOG = path.join(PUB, "blog");
if (DRY) fs.mkdirSync(BLOG, { recursive: true });

// 按 date 倒序（最新最前）
const posts = [...ALL_POSTS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

function indent(html, n) {
  const pad = " ".repeat(n);
  // 首行补缩进，其余行保留原层级缩进（10/12 分层），避免破坏嵌套结构
  return String(html).split("\n").map((l, i) => (i === 0 ? pad + l.trim() : l)).join("\n");
}

// ---------- 详情页链接：postN → /blog/postN.html；day001 无独立页 → 锚点 ----------
function detailHref(p) {
  return p.id.startsWith("post") ? `/blog/${p.id}.html` : `/blog.html#${p.id}`;
}

// ---------- article 块（仅详情页 postN.html 使用，全文，固定 6/8/10 缩进）----------
function articleBlock(p) {
  return `      <article class="post" id="${p.id}">
        <h1 data-i18n="${p.key}_t">${p.zh.title}</h1>
        <time datetime="${p.date}">${p.date}</time>
        <p data-i18n="${p.key}_d">${p.zh.desc}</p>
        <div class="post-body" lang="zh">
${indent(p.zh.body, 10)}
        </div>
        <div class="post-body" lang="en" hidden>
${indent(p.en.body, 10)}
        </div>
      </article>`;
}

// ---------- 列表页紧凑卡片（标题 + 日期 + 摘要 + 阅读全文，链接到详情页）----------
function listItem(p) {
  const href = detailHref(p);
  return `      <article class="post-preview" id="${p.id}">
        <a class="post-link" href="${href}">
          <h2 data-i18n="${p.key}_t">${p.zh.title}</h2>
          <time datetime="${p.date}">${p.date}</time>
          <p class="excerpt" data-i18n="${p.key}_d">${p.zh.desc}</p>
          <span class="read-more" data-i18n="bl_readmore">阅读全文 →</span>
        </a>
      </article>`;
}

// ---------- Blog 列表 JSON-LD ----------
function blogJsonLd() {
  const items = posts
    .map(
      (p) => `      {
        "@type": "BlogPosting",
        "headline": ${JSON.stringify(p.en.title)},
        "alternativeHeadline": ${JSON.stringify(p.zh.title)},
        "datePublished": "${p.date}",
        "author": { "@type": "Organization", "name": "PausePaw" },
        "publisher": { "@type": "Organization", "name": "PausePaw" },
        "inLanguage": "en",
        "url": "%%SITE_URL%%${detailHref(p)}"
      }`
    )
    .join(",\n");
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "PausePaw Blog",
    "url": "%%SITE_URL%%/blog.html",
    "inLanguage": ["zh", "en"],
    "blogPost": [
${items}
    ]
  }
  </script>`;
}

// ---------- i18n 博客键片段 ----------
function i18nFragment(lang) {
  return posts
    .map((p) => {
      const t = (p[lang].title || "").replace(/\n/g, " ");
      const d = (p[lang].desc || "").replace(/\n/g, " ");
      return `    "${p.key}_t": ${JSON.stringify(t)}, "${p.key}_d": ${JSON.stringify(d)},`;
    })
    .join("\n");
}

// ---------- 详情页 ----------
function faqJsonLd(p) {
  if (!p.faq || !p.faq.length) return "";
  const items = p.faq
    .map(
      (f) => `    {
      "@type": "Question",
      "name": ${JSON.stringify(f.q)},
      "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a)} }
    }`
    )
    .join(",\n");
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${items}
  ]
}
  </script>`;
}

function detailPage(p) {
  const faq = faqJsonLd(p);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${p.zh.title} · PausePaw Blog</title>
  <meta name="description" content="${p.zh.desc.replace(/"/g, "&quot;")}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="%%SITE_URL%%/blog/${p.id}.html" />
  <link rel="alternate" hreflang="zh" href="%%SITE_URL%%/blog/${p.id}.html" />
  <link rel="alternate" hreflang="en" href="%%SITE_URL%%/blog/${p.id}.html?lang=en" />
  <link rel="alternate" hreflang="x-default" href="%%SITE_URL%%/blog/${p.id}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${p.zh.title} / ${p.en.title}" />
  <meta property="og:description" content="${p.zh.desc.replace(/"/g, "&quot;")}" />
  <meta property="og:url" content="%%SITE_URL%%/blog/${p.id}.html" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${p.zh.title} / ${p.en.title}" />
  <meta name="twitter:description" content="${p.zh.desc.replace(/"/g, "&quot;")}" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="icon" href="../mascot.svg" />
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(p.en.title)},
  "alternativeHeadline": ${JSON.stringify(p.zh.title)},
  "datePublished": "${p.date}",
  "dateModified": "${p.date}",
  "author": { "@type": "Organization", "name": "PausePaw" },
  "publisher": { "@type": "Organization", "name": "PausePaw", "url": "https://pause-paw.shop" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://pause-paw.shop/blog/${p.id}.html" },
  "description": ${JSON.stringify(p.en.desc)}
}
  </script>
${faq}  <script>
    (function () { try { var t = localStorage.getItem("pp_theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); document.documentElement.setAttribute("data-theme", t); } catch (e) {} })();
  </script>
  %%ADSENSE%%
  %%ANALYTICS%%
</head>
<body>
  <div class="container">
    <header class="bar page-bar">
      <div class="logo"><span class="dot"></span><a href="/" data-i18n="brand">PausePaw</a></div>
      <nav class="nav">
        <button class="theme-btn" id="themeBtn" onclick="toggleTheme()" title="切换亮/暗色" aria-label="切换主题"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
        <div class="lang-switch">
          <button data-lang="zh" onclick="setLang('zh')">中文</button>
          <button data-lang="en" onclick="setLang('en')">EN</button>
        </div>
        <a class="btn small" href="/app.html" data-i18n="cta_start">开始使用</a>
      </nav>
    </header>
    <main class="legal">
      <a class="back" href="/blog.html">← 返回博客</a>
${articleBlock(p)}
    </main>
    <script src="../i18n.js"></script>
    <script src="../app.js"></script>
  </div>
</body>
</html>`;
}

// ================= 主流程 =================
// 读取始终用真实 public/，写入才用 OUT（dry 时指向临时目录）
// 1. blog.html：替换文章区 + JSON-LD
const blogPath = path.join(PUB, "blog.html");
let blogHtml = fs.readFileSync(path.join(ROOT, "public", "blog.html"), "utf8");
blogHtml = blogHtml.replace(
  /<article\b[\s\S]*<\/article>\s*<\/main>/,
  posts.map(listItem).join("\n") + "\n  </main>"
);
blogHtml = blogHtml.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  blogJsonLd()
);
fs.writeFileSync(blogPath, blogHtml, "utf8");

// 2. i18n.js：zh/en 段博客键区域整体替换
const i18nPath = path.join(PUB, "i18n.js");
let i18n = fs.readFileSync(path.join(ROOT, "public", "i18n.js"), "utf8");
const zhFrag = i18nFragment("zh");
const enFrag = i18nFragment("en");
i18n = i18n.replace(
  /("bl_related": "相关阅读",)[\s\S]*?(\n    "co_t")/,
  `$1\n${zhFrag}\n    "bl_readmore": "阅读全文 →",$2`
);
i18n = i18n.replace(
  /("bl_related": "Related reading",)[\s\S]*?(\n    "co_t")/,
  `$1\n${enFrag}\n    "bl_readmore": "Read more →",$2`
);
fs.writeFileSync(i18nPath, i18n, "utf8");

// 3. 详情页（id 以 post 开头的才生成独立页；day001 保持 blog.html 锚点访问）
let detailCount = 0;
for (const p of posts) {
  if (!p.id.startsWith("post")) continue;
  fs.writeFileSync(path.join(BLOG, `${p.id}.html`), detailPage(p), "utf8");
  detailCount++;
}

console.log(`build 完成（${DRY ? "DRY → " + OUT : "已写回 public/"}）`);
console.log(`  列表文章: ${posts.length} 篇 | 详情页: ${detailCount} 个 | i18n 博客键: ${posts.length} ×2`);
