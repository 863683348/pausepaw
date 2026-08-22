#!/usr/bin/env node
/**
 * Vercel 部署脚本
 * 用法: node scripts/deploy-vercel.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = 'team_FK7okQmzrFfa4uB9f14CGA8X';

console.log('🚀 开始部署 pause-paw 到 Vercel...');

// 1. 验证环境
if (!VERCEL_TOKEN) {
  console.error('❌ 请设置 VERCEL_TOKEN 环境变量');
  process.exit(1);
}

// 2. 安装依赖
console.log('📦 安装依赖...');
try {
  execSync('npm install', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('❌ 依赖安装失败', e.message);
  process.exit(1);
}

// 3. 运行构建脚本
console.log('🔨 运行构建脚本...');
try {
  execSync('node scripts/build-vercel.cjs', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('❌ 构建失败', e.message);
  process.exit(1);
}

// 4. 提交代码
console.log('📝 提交代码...');
try {
  execSync('git add -A', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync('git commit -m "feat: migrate to Vercel with Turso DB" --no-verify', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (e) {
  console.log('⚠️ 无代码变更或提交失败，继续部署...');
}

// 5. 推送到 GitHub
console.log('📤 推送代码到 GitHub...');
try {
  execSync('git push origin main', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('❌ 推送失败', e.message);
  process.exit(1);
}

console.log('✅ 代码已推送到 GitHub');
console.log('🔗 Vercel 将自动触发部署');
console.log('📋 下一步：在 Vercel Dashboard 注入环境变量并部署');
