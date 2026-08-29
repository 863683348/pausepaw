// build-blog-internal-links.mjs — 为每篇博客详情页补「相关文章」内链 + FAQPage 结构化数据
// 插入点：related-posts 放在 </article> 之前（中英双语都可见）；FAQ JSON-LD 放在 </head> 之前。
// 用法：node scripts/build-blog-internal-links.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, "..", "public", "blog");

// 读取文章标题（用于内链锚文本）
const files = fs.readdirSync(BLOG_DIR).filter((f) => /^post\d+\.html$/.test(f));
const nums = files.map((f) => Number(f.match(/post(\d+)\.html/)[1])).sort((a, b) => a - b);

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (m) return m[1].replace(/<[^>]+>/g, "").trim();
  const t = html.match(/<title>([\s\S]*?)<\/title>/);
  return t ? t[1].split(" · ")[0].trim() : "";
}

const titles = {};
for (const n of nums) {
  const p = path.join(BLOG_DIR, `post${n}.html`);
  titles[n] = extractTitle(fs.readFileSync(p, "utf8"));
}

function relatedSection(n) {
  const idx = nums.indexOf(n);
  const pick = [];
  // 前两篇 + 后一篇（环形取，保证每篇 3 条内链）
  for (const off of [-1, -2, 1]) {
    const t = nums[(idx + off + nums.length) % nums.length];
    if (t !== n && !pick.includes(t)) pick.push(t);
  }
  // 不足 3 条用 hub 页补
  const hubs = [];
  if (pick.length < 3) hubs.push({ href: "/blog.html", text: "查看更多博客文章" });
  const links = [
    ...pick.map((t) => ({ href: `/blog/post${t}.html`, text: titles[t] })),
    ...hubs,
  ];
  const items = links
    .map((l) => `        <div class="related-link"><a href="${l.href}">${l.text}</a></div>`)
    .join("\n");
  return `      <section class="related-posts" aria-label="相关文章">
        <h3>相关文章</h3>
${items}
      </section>
`;
}

function faqSchema(n) {
  const title = titles[n];
  const faqs = [
    {
      q: `这篇文章讲了什么？`,
      a: `《${title}》是 PausePaw 关于数字健康与屏幕时间管理的一篇文章，提供可落地的做法与数据参考。`,
    },
    {
      q: `PausePaw 能帮我吗？`,
      a: `可以。PausePaw 用温和的打断代替生硬的封锁，到点用可爱伙伴提醒你放下手机，帮你建立健康的屏幕习惯。`,
    },
    {
      q: `还有其他相关文章吗？`,
      a: `有，查看 <a href="/blog.html">博客首页</a> 可以浏览全部文章。`,
    },
  ];
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${faqs
  .map(
    (f) => `    {
      "@type": "Question",
      "name": ${JSON.stringify(f.q)},
      "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a)} }
    }`
  )
  .join(",\n")}
  ]
}
  </script>
`;
}

let rel = 0;
let faq = 0;
for (const n of nums) {
  const p = path.join(BLOG_DIR, `post${n}.html`);
  let html = fs.readFileSync(p, "utf8");
  const before = html;

  if (!html.includes('class="related-posts"')) {
    html = html.replace(/(\s*)(<\/article>)/, (_, sp, tag) => `\n${relatedSection(n)}${sp}${tag}`);
    if (html !== before) rel++;
  }
  if (!html.includes('"@type": "FAQPage"')) {
    html = html.replace(/(<\/head>)/, (m) => `${faqSchema(n)}${m}`);
    if (html !== before) faq++;
  }
  if (html !== before) fs.writeFileSync(p, html, "utf8");
}
console.log(`内链补 ${rel} 篇 | FAQ schema 补 ${faq} 篇 | 总计 ${nums.length} 篇`);
