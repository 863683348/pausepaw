// build-blog.mjs — 从 scripts/blog-data.cjs 生成 public/blog.html（pause-paw 静态博客）
// 用法: node scripts/build-blog.mjs
// 新增文章流程: ① blog-data.cjs 数组末尾追加一条 → ② 补 public/i18n.js 的 bl_postN_t/d 翻译(zh+en)
//               → ③ 运行本脚本 → ④ 提交 public/blog.html + scripts/blog-data.cjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS = require("./blog-data.cjs");

// 显示顺序：数组顺序即最新在前（blog-data.cjs 约定新文章插入数组开头 index 0）
const DISPLAY = POSTS;

const HEAD = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title data-i18n="bl_t">博客</title>
  <meta name="description" content="PausePaw Blog — digital wellbeing, screen time control, and healthy digital habits. 2026 average screen time data, the summer screen-time spike, the power of pause, phone-addiction recovery, and focus tips." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="%%SITE_URL%%/blog.html" />
  <link rel="alternate" hreflang="zh" href="%%SITE_URL%%/blog.html" />
  <link rel="alternate" hreflang="en" href="%%SITE_URL%%/blog.html?lang=en" />
  <link rel="alternate" hreflang="x-default" href="%%SITE_URL%%/blog.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="PausePaw Blog — Digital Wellbeing & Screen Time" />
  <meta property="og:description" content="2026 average screen time data, why 'cute' beats 'blocked', the 5-minute rule for mindless scrolling, and how to take back control of summer screen time." />
  <meta property="og:url" content="%%SITE_URL%%/blog.html" />
  <link rel="stylesheet" href="styles.css" />
  <link rel="icon" href="mascot.svg" />
  <script>
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
        <a class="btn small" href="app.html" data-i18n="cta_start">开始使用</a>
      </nav>
    </header>
    <main class="legal">
      <a class="back" href="/" data-i18n="pg_back">返回首页</a>
      <h1 data-i18n="bl_t">博客</h1>
      <p class="lead" data-i18n="bl_intro"></p>
`;

const FOOT = `
  </main>
  </div>

  <footer class="site-footer">
    <nav class="foot-links">
      <a href="extension.html" data-i18n="f_extension">下载插件</a>
      <a href="privacy.html" data-i18n="f_privacy">隐私政策</a>
      <a href="terms.html" data-i18n="f_terms">服务条款</a>
      <a href="faq.html" data-i18n="f_faq">常见问题</a>
      <a href="contact.html" data-i18n="f_contact">联系我们</a>
    </nav>
    <p class="copy" data-i18n="footer">PausePaw · 数字健康陪伴</p>
  </footer>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "PausePaw Blog",
    "url": "%%SITE_URL%%/blog.html",
    "inLanguage": ["zh", "en"],
    "blogPost": [
${POSTS.map(jsonld).join(",\n")}
    ]
  }
  </script>

  <script src="i18n.js"></script>
  <script>
    // 语言切换：显示对应语言的正文块（默认中文，?lang=en 或 localStorage 决定）
    (function () {
      function syncArticleLang() {
        var lang = window.getLang();
        document.querySelectorAll('.post-body').forEach(function (el) {
          el.hidden = (el.getAttribute('lang') !== lang);
        });
      }
      window.addEventListener('DOMContentLoaded', syncArticleLang);
      var _origApply = window.applyI18n;
      window.applyI18n = function () { _origApply(); syncArticleLang(); };
    })();
  </script>
  <script>window.applyI18n();</script>
</body>
</html>
`;

function article(p) {
  return `      <article class="post" id="${p.id}">
        <h2 data-i18n="${p.titleKey}">${p.title}</h2>
        <p data-i18n="${p.descKey}">${p.desc}</p>
        <div class="post-body" lang="zh">
          ${p.zhBody}
        </div>
        <div class="post-body" lang="en" hidden>
          ${p.enBody}
        </div>
      </article>`;
}

function jsonld(p) {
  return `      {
        "@type": "BlogPosting",
        "headline": ${JSON.stringify(p.enTitle)},
        "alternativeHeadline": ${JSON.stringify(p.title)},
        "datePublished": "${p.date}",
        "author": { "@type": "Organization", "name": "PausePaw" },
        "publisher": { "@type": "Organization", "name": "PausePaw" },
        "inLanguage": "en",
        "url": "%%SITE_URL%%/blog.html?lang=en#${p.id}"
      }`;
}

const articles = DISPLAY.map(article).join("\n");
const html = HEAD + articles + FOOT;
const dest = path.join(ROOT, "public/blog.html");
fs.writeFileSync(dest, html, "utf8");
console.log(`✅ 已生成 ${dest}`);
console.log(`   文章 ${POSTS.length} 篇，显示顺序: ${DISPLAY.map((p) => p.id).join(" → ")}`);
console.log(`   JSON-LD blogPost: ${POSTS.length} 条`);
