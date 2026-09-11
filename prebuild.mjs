#!/usr/bin/env node
/**
 * prebuild.mjs — 构建前占位符替换
 *
 * Vercel 以静态方式托管 public/（vercel.json 路由 /public/$1），
 * 不经过 server.js 的运行时替换，因此必须在提交前把占位符写死：
 *   %%SITE_URL%%  -> https://pause-paw.shop
 *   %%ANALYTICS%% -> GA4/Clarity 片段（未配置则空串）
 *   %%ADSENSE%%   -> AdSense 片段（未配置则空串）
 * 用法：node prebuild.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.SITE_URL || "https://pause-paw.shop";
const GA4_ID = process.env.GA4_MEASUREMENT_ID || "";
const CLARITY_ID = process.env.CLARITY_ID || "";
const ADSENSE_CLIENT_ID = process.env.ADSENSE_CLIENT_ID || "";
const PUBLIC_DIR = path.join(__dirname, "public");

const ANALYTICS = GA4_ID
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:true});</script>` +
    (CLARITY_ID
      ? `\n<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");</script>`
      : "")
  : "";

const ADSENSE = /^ca-pub-\d+$/.test(ADSENSE_CLIENT_ID)
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>
<script>(adsbygoogle=window.adsbygoogle||[]).push({google_ad_client:"${ADSENSE_CLIENT_ID}",enable_page_level_ads:true});</script>`
  : "";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk(PUBLIC_DIR)) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("%%")) continue;
  const next = src
    .replace(/%%SITE_URL%%/g, SITE_URL)
    .replace(/%%ANALYTICS%%/g, ANALYTICS)
    .replace(/%%ADSENSE%%/g, ADSENSE);
  if (next !== src) {
    fs.writeFileSync(file, next, "utf8");
    changed++;
  }
}
console.log(`prebuild 完成：替换 ${changed} 个文件（SITE_URL=${SITE_URL}）`);
