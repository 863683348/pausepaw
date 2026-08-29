// build-sitemap.mjs — 按 public/ 实际存在的 HTML 文件生成 sitemap.xml（含 hreflang 三件套）
// 用法：node scripts/build-sitemap.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
const SITE = process.env.SITE_URL || "https://pause-paw.shop";

function walk(dir, base = "", out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + "/" + e.name : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["images", "videos", "downloads"].includes(e.name)) continue;
      walk(full, rel, out);
    } else if (e.name.endsWith(".html")) {
      out.push(rel);
    }
  }
  return out;
}

const PRIORITY = {
  "index.html": ["1.0", "weekly"],
  "blog.html": ["0.9", "weekly"],
  "extension.html": ["0.8", "monthly"],
  "features.html": ["0.7", "monthly"],
  "faq.html": ["0.7", "monthly"],
  "how.html": ["0.6", "monthly"],
  "contact.html": ["0.5", "monthly"],
  "privacy.html": ["0.3", "yearly"],
  "terms.html": ["0.3", "yearly"],
  "app.html": ["0.7", "monthly"],
};

const files = walk(PUB).filter((f) => f !== "ext-done.html").sort();

function lastmod(rel) {
  const st = fs.statSync(path.join(PUB, rel));
  return st.mtime.toISOString().slice(0, 10);
}

const urls = files
  .map((rel) => {
    const isHome = rel === "index.html";
    const loc = SITE + "/" + (isHome ? "" : rel);
    const key = rel.includes("/") ? rel.split("/").pop() : rel;
    const [pr, cf] = PRIORITY[key] || ["0.8", "monthly"];
    const en = loc + (isHome ? "?lang=en" : "?lang=en");
    return (
      "  <url>\n" +
      "    <loc>" + loc + "</loc>\n" +
      "    <lastmod>" + lastmod(rel) + "</lastmod>\n" +
      "    <changefreq>" + cf + "</changefreq>\n" +
      "    <priority>" + pr + "</priority>\n" +
      '    <xhtml:link rel="alternate" hreflang="zh" href="' + loc + '"/>\n' +
      '    <xhtml:link rel="alternate" hreflang="en" href="' + en + '"/>\n' +
      '    <xhtml:link rel="alternate" hreflang="x-default" href="' + loc + '"/>\n' +
      "  </url>"
    );
  })
  .join("\n");

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  urls +
  "\n</urlset>\n";

fs.writeFileSync(path.join(PUB, "sitemap.xml"), xml, "utf8");
console.log("sitemap.xml 生成完成：" + files.length + " 条 URL");
