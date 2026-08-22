#!/usr/bin/env node
/**
 * build-vercel.cjs — Vercel 构建脚本
 * 
 * 功能：
 * 1. 替换 server.js 中的占位符
 * 2. 生成静态 sitemap.xml 和 robots.txt
 * 3. 预处理前端资源
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const OUTPUT_DIR = path.join(PROJECT_ROOT, '.vercel', 'output');

// 创建输出目录
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'public'), { recursive: true });

// 复制 public 目录
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');
      // 替换占位符
      if (process.env.SITE_URL) {
        content = content.replace(/%%SITE_URL%%/g, process.env.SITE_URL);
      }
      if (process.env.GA4_MEASUREMENT_ID) {
        content = content.replace(/%%GA4%%/g, buildAnalyticsSnippet(process.env.GA4_MEASUREMENT_ID));
      }
      if (process.env.ADSENSE_CLIENT_ID) {
        content = content.replace(/%%ADSENSE%%/g, buildAdsenseSnippet(process.env.ADSENSE_CLIENT_ID));
      }
      fs.writeFileSync(destPath, content);
    }
  }
}

function buildAnalyticsSnippet(ga4Id) {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}',{send_page_view:true});</script>`;
}

function buildAdsenseSnippet(clientId) {
  return `<script async src="https://pagead2.googletagmanager.com/gtag/js?id=${clientId}"></script>
<script>(adsbygoogle=window.adsbygoogle||[]).push({google_ad_client:"${clientId}",enable_page_level_ads:true});</script>`;
}

// 复制 public 目录
copyDir(PUBLIC_DIR, path.join(OUTPUT_DIR, 'public'));

// 生成静态 sitemap.xml
const SITE_URL = process.env.SITE_URL || 'https://pause-paw.shop';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/features</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/how</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE_URL}/app</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/faq</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'public', 'sitemap.xml'), sitemap);

// 生成静态 robots.txt
const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'public', 'robots.txt'), robots);

console.log('✅ Vercel 构建完成');
console.log(`📁 输出目录: ${OUTPUT_DIR}`);
