// i18n.js — 中英文文案（PRD F-I18N）。扩展：登录/注册/扩展设备 token 相关 key。
window.I18N = {
  zh: {
    "brand": "暂停爪 PausePaw",
    "nav_features": "功能", "nav_how": "怎么用",
    "cta_start": "开始使用", "cta_install": "安装插件",
    "hero_title": "一只让你主动休息的萌系伙伴",
    "hero_sub": "在 X、YouTube、TikTok 上刷太久？你的伙伴会温柔地接管屏幕，强制你喘口气。",
    "hero_cta": "免费开始",
    "feat1_t": "可爱，不羞辱", "feat1_d": "用萌系伙伴代替冷冰冰的“已屏蔽”，降低抵触。",
    "feat2_t": "不可规避", "feat2_d": "全屏遮罩 + 倒计时，没有关闭键，时间到才放行。",
    "feat3_t": "云端同步", "feat3_d": "登录后规则云端保存，插件自动拉取，多设备一致。",
    "tab_adopt": "领养伙伴", "tab_rules": "休息规则", "tab_dash": "看板", "tab_acct": "账户", "tab_ext": "扩展",
    "adopt_title": "领养你的伙伴", "adopt_name_ph": "给伙伴起个名字（1-16 字）",
    "adopt_btn": "领养它", "adopt_hi": "你好，我是", "adopt_empty": "先给伙伴起个名字吧～",
    "rules_title": "设置休息规则",
    "rules_domains": "要管住的网站（每行一个，如 youtube.com）",
    "rules_domains_ph": "youtube.com\ntiktok.com\nx.com",
    "rules_threshold": "单次可刷时长", "rules_break": "强制休息时长",
    "rules_whitelist": "免打扰站点（可选，每行一个）", "rules_whitelist_ph": "docs.google.com",
    "rules_save": "保存规则",
    "rules_hint": "保存后云端立即生效，插件会自动拉取（无需再复制 JSON）。演示建议时长选“秒”、设为 10。",
    "dash_title": "你的休息看板", "dash_blocks": "今日拦截", "dash_saved": "累计省下",
    "dash_streak": "连续守规", "dash_unit_min": "分钟", "dash_unit_day": "天",
    "dash_goal": "已配置规则",
    "acct_title": "账户", "acct_name": "显示名称", "acct_lang": "界面语言",
    "acct_plan": "会员", "acct_plan_free": "免费版（核心强制永久免费）",
    "acct_logout": "退出登录",
    "ext_title": "连接浏览器插件",
    "ext_token": "你的设备 Token（粘贴到插件即可云端同步）",
    "ext_copy": "复制 Token", "ext_copied": "已复制",
    "ext_hint": "安装插件后，把此 Token 粘贴进插件弹窗，规则与拦截数据就会云端同步到这里。",
    "auth_login": "登录", "auth_register": "注册", "auth_email": "邮箱", "auth_password": "密码（≥6 位）",
    "auth_to_login": "已有账号？去登录", "auth_to_register": "没有账号？去注册",
    "auth_submit": "提交", "auth_err": "出错了", "common_min": "分钟", "common_sec": "秒",
    "auth_google": "使用 Google 登录", "auth_or": "或", "auth_google_off": "Google 登录未启用",
    "tab_plan": "会员",
    "plan_title": "升级会员", "plan_off": "支付功能尚未启用（需在后端配置 PayPal 凭据）。",
    "plan_month": "月", "plan_subscribe": "订阅", "plan_current": "当前方案",
    "plan_hint": "免费版核心防沉迷永久可用；会员解锁多设备陪伴与家庭版管理。",
    "plan_active_hint": "感谢支持！会员权益已生效。",
    "plan_err": "发起订阅失败，请稍后再试",
    "plan_f_pro1": "全部核心防沉迷功能", "plan_f_pro2": "无限设备云端同步", "plan_f_pro3": "伙伴皮肤与陪伴模式",
    "plan_f_fam1": "含 5 个家庭成员席位", "plan_f_fam2": "家庭看板与周报", "plan_f_fam3": "儿童设备远程规则",
    "f_privacy": "隐私政策", "f_terms": "服务条款", "f_faq": "常见问题", "f_blog": "博客", "f_contact": "联系我们",
    "pg_back": "返回首页", "pg_updated": "最后更新",
    "pr_t": "隐私政策", "pr_intro": "PausePaw（以下简称“我们”）重视你的隐私。本政策说明我们收集哪些数据、如何使用以及你的权利。",
    "pr_collect_h": "我们收集的数据",
    "pr_collect_1": "账户信息：注册邮箱（用于登录与找回）。",
    "pr_collect_2": "凭证：密码以 scrypt 哈希存储，我们无法还原明文。",
    "pr_collect_3": "配置：你设置的休息规则、免打扰站点。",
    "pr_collect_4": "使用数据：设备 Token、插件上报的访问/拦截事件（用于看板统计）。",
    "pr_use_h": "我们如何使用",
    "pr_use_1": "在不同设备间云端同步你的规则。",
    "pr_use_2": "生成你的休息看板与连续守规统计。",
    "pr_use_3": "改进产品（匿名聚合，不关联个人）。",
    "pr_share_h": "我们不会出售你的数据",
    "pr_share_1": "我们不向第三方出售或出租个人信息。仅在支付（PayPal）、分析（Google Analytics / Microsoft Clarity，需你同意）等必要服务中共享最少数据。",
    "pr_cookie_h": "Cookie 与分析",
    "pr_cookie_1": "登录会话使用 HttpOnly Cookie。分析工具仅在获得你同意、且处于生产环境时加载。欧盟用户适用 GDPR。",
    "pr_rights_h": "你的权利",
    "pr_rights_1": "你可随时导出或删除账户与数据。删除后 30 天内彻底清除。",
    "pr_contact_h": "联系我们",
    "pr_contact_1": "关于隐私的任何问题，请通过“联系我们”页面与我们联系。",
    "tm_t": "服务条款", "tm_intro": "使用 PausePaw 即表示你同意以下条款。",
    "tm_elig_h": "使用资格", "tm_elig_1": "你须年满 13 岁（或所在地法定年龄）方可注册。",
    "tm_sub_h": "会员订阅",
    "tm_sub_1": "Pro / Family 为按月订阅，通过 PayPal 自动续费。",
    "tm_sub_2": "可随时在 PayPal 或本平台取消，取消后当前计费周期结束即停止。",
    "tm_sub_3": "价格以结算时显示为准，税费另计。",
    "tm_disclaimer_h": "免责声明",
    "tm_disclaimer_1": "本工具旨在帮助你自我管理，不保证 100% 阻断或改善任何健康问题。",
    "tm_disclaimer_2": "因使用或无法使用本服务导致的任何损失，我们不承担法律责任。",
    "tm_aup_h": "可接受使用", "tm_aup_1": "不得用于任何违法目的，不得逆向工程或干扰服务。",
    "tm_term_h": "条款变更", "tm_term_1": "我们可能更新本条款，重大变更将提前通知。",
    "fa_t": "常见问题",
    "fa_q1": "PausePaw 是什么？", "fa_a1": "一只萌系数字健康伙伴：在你刷太久时温柔地强制休息，规则云端同步到浏览器插件。",
    "fa_q2": "免费吗？", "fa_a2": "核心防沉迷永久免费。Pro / Family 会员解锁多设备陪伴与家庭管理。",
    "fa_q3": "支持哪些浏览器？", "fa_a3": "当前为 Chrome（Manifest V3）扩展，后续计划支持 Edge / Firefox。",
    "fa_q4": "怎么安装？", "fa_a4": "在控制台复制设备 Token，加载插件后粘贴即可云端同步。",
    "fa_q5": "我的数据安全吗？", "fa_a5": "密码以 scrypt 哈希存储，不出售数据，详见隐私政策。",
    "fa_q6": "如何退款？", "fa_a6": "会员通过 PayPal 订阅，可在 PayPal 内管理或取消；如有争议请联系我们。",
    "bl_t": "博客 — 数字健康与屏幕时间", "bl_intro": "关于数字健康、屏幕时间管理与自律的小文章。聊聊暑期屏幕时间翻倍、The Power of Pause 与如何培养健康用机习惯。",
    "bl_post1_t": "为什么“可爱”比“封锁”更有效", "bl_post1_d": "冷冰冰的“已屏蔽”容易激起逆反；一只会卖萌的伙伴降低了心理抵触，让人更愿意配合休息。",
    "bl_post2_t": "5 分钟法则：用小中断打断无意识刷屏", "bl_post2_d": "无意识刷屏往往源于习惯回路。一个温柔的强制休息，能打断回路、把控制权交还给你。",
    "bl_post3_t": "暑期屏幕时间翻倍？用“Pause”把控制权拿回来", "bl_post3_d": "研究显示暑期孩子每日娱乐屏幕时间从 3.8 小时飙到 7.2 小时。与其硬堵，不如用温柔的强制休息打断无意识刷屏——这正是 PausePaw 的“Pause 之力”：到点就停，可爱不羞辱，习惯自然松动。",
    "co_t": "联系我们", "co_intro": "有问题、建议或隐私请求？随时找我们。",
    "co_email_h": "邮箱", "co_email": "ahmedlzany423@gmail.com",
    "co_form_h": "给我们留言", "co_name_ph": "你的称呼", "co_msg_ph": "想说点什么…", "co_send": "发送",
    "co_note": "本表单为演示，提交后会打开你的邮件客户端。正式版本将直接送达。",
    "footer": "PausePaw · 数字健康陪伴"
  },
  en: {
    "brand": "PausePaw",
    "nav_features": "Features", "nav_how": "How it works",
    "cta_start": "Get started", "cta_install": "Install extension",
    "hero_title": "A cute companion that makes you take a break",
    "hero_sub": "Spending too long on X, YouTube, TikTok? Your buddy gently takes over the screen and forces a breather.",
    "hero_cta": "Start free",
    "feat1_t": "Cute, not shaming", "feat1_d": "A friendly mascot instead of a cold “Blocked” screen lowers resistance.",
    "feat2_t": "Can't be skipped", "feat2_d": "Full-screen overlay + countdown, no close button, releases only when time's up.",
    "feat3_t": "Cloud sync", "feat3_d": "Rules saved in the cloud after login; the extension pulls them automatically, consistent across devices.",
    "tab_adopt": "Adopt", "tab_rules": "Rules", "tab_dash": "Dashboard", "tab_acct": "Account", "tab_ext": "Extension",
    "adopt_title": "Adopt your buddy", "adopt_name_ph": "Name your buddy (1-16 chars)",
    "adopt_btn": "Adopt it", "adopt_hi": "Hi, I'm", "adopt_empty": "Name your buddy first ~",
    "rules_title": "Set break rules",
    "rules_domains": "Sites to manage (one per line, e.g. youtube.com)",
    "rules_domains_ph": "youtube.com\ntiktok.com\nx.com",
    "rules_threshold": "Max session time", "rules_break": "Forced break time",
    "rules_whitelist": "Do-not-disturb sites (optional, one per line)", "rules_whitelist_ph": "docs.google.com",
    "rules_save": "Save rules",
    "rules_hint": "Saved to the cloud instantly; the extension pulls it automatically (no more copying JSON). For demo, pick “seconds” and set 10.",
    "dash_title": "Your rest dashboard", "dash_blocks": "Blocks today", "dash_saved": "Time saved",
    "dash_streak": "Streak", "dash_unit_min": "min", "dash_unit_day": "days",
    "dash_goal": "Configured rules",
    "acct_title": "Account", "acct_name": "Display name", "acct_lang": "Interface language",
    "acct_plan": "Plan", "acct_plan_free": "Free (core enforcement always free)",
    "acct_logout": "Log out",
    "ext_title": "Connect the browser extension",
    "ext_token": "Your device token (paste into the extension to sync from cloud)",
    "ext_copy": "Copy token", "ext_copied": "Copied",
    "ext_hint": "After installing the extension, paste this token into its popup — your rules and block data sync to here from the cloud.",
    "auth_login": "Log in", "auth_register": "Sign up", "auth_email": "Email", "auth_password": "Password (≥6 chars)",
    "auth_to_login": "Have an account? Log in", "auth_to_register": "No account? Sign up",
    "auth_submit": "Submit", "auth_err": "Something went wrong", "common_min": "min", "common_sec": "sec",
    "auth_google": "Continue with Google", "auth_or": "or", "auth_google_off": "Google sign-in is not enabled",
    "tab_plan": "Plans",
    "plan_title": "Upgrade", "plan_off": "Payments are not enabled yet (PayPal credentials must be configured on the server).",
    "plan_month": "mo", "plan_subscribe": "Subscribe", "plan_current": "Current plan",
    "plan_hint": "Core enforcement is always free. Membership unlocks multi-device companion and Family management.",
    "plan_active_hint": "Thanks for your support! Membership is active.",
    "plan_err": "Failed to start subscription, please retry",
    "plan_f_pro1": "All core focus features", "plan_f_pro2": "Unlimited devices cloud sync", "plan_f_pro3": "Buddy skins & companion mode",
    "plan_f_fam1": "Up to 5 family seats", "plan_f_fam2": "Family dashboard & weekly report", "plan_f_fam3": "Remote rules for kids' devices",
    "f_privacy": "Privacy Policy", "f_terms": "Terms of Service", "f_faq": "FAQ", "f_blog": "Blog", "f_contact": "Contact Us",
    "pg_back": "Back to home", "pg_updated": "Last updated",
    "pr_t": "Privacy Policy", "pr_intro": "PausePaw (“we”) respects your privacy. This policy explains what data we collect, how we use it, and your rights.",
    "pr_collect_h": "What we collect",
    "pr_collect_1": "Account: your registration email (for login and recovery).",
    "pr_collect_2": "Credentials: passwords are stored as scrypt hashes; we cannot recover plaintext.",
    "pr_collect_3": "Configuration: the break rules and allow-list sites you set.",
    "pr_collect_4": "Usage data: device token and visit/block events reported by the extension (for dashboard stats).",
    "pr_use_h": "How we use it",
    "pr_use_1": "To sync your rules across devices via the cloud.",
    "pr_use_2": "To build your rest dashboard and streak statistics.",
    "pr_use_3": "To improve the product (anonymized aggregates, never tied to you).",
    "pr_share_h": "We don't sell your data",
    "pr_share_1": "We never sell or rent personal information. We share the minimum necessary only with essential services such as payments (PayPal) and analytics (Google Analytics / Microsoft Clarity, with your consent).",
    "pr_cookie_h": "Cookies & analytics",
    "pr_cookie_1": "Login sessions use HttpOnly cookies. Analytics load only with your consent and in production. EU users are covered by GDPR.",
    "pr_rights_h": "Your rights",
    "pr_rights_1": "You can export or delete your account and data at any time. Deleted data is purged within 30 days.",
    "pr_contact_h": "Contact us",
    "pr_contact_1": "For any privacy questions, reach us via the Contact page.",
    "tm_t": "Terms of Service", "tm_intro": "By using PausePaw you agree to the following terms.",
    "tm_elig_h": "Eligibility", "tm_elig_1": "You must be at least 13 (or the legal age in your region) to register.",
    "tm_sub_h": "Membership",
    "tm_sub_1": "Pro / Family are monthly subscriptions billed automatically via PayPal.",
    "tm_sub_2": "Cancel anytime in PayPal or here; access continues until the end of the current period.",
    "tm_sub_3": "Prices shown at checkout apply; taxes are additional.",
    "tm_disclaimer_h": "Disclaimer",
    "tm_disclaimer_1": "This tool helps you self-manage; it does not guarantee 100% blocking or any health outcome.",
    "tm_disclaimer_2": "We are not liable for any loss arising from use or inability to use the service.",
    "tm_aup_h": "Acceptable use", "tm_aup_1": "No unlawful use, reverse engineering, or interference with the service.",
    "tm_term_h": "Changes", "tm_term_1": "We may update these terms; material changes are announced in advance.",
    "fa_t": "FAQ",
    "fa_q1": "What is PausePaw?", "fa_a1": "A cute digital-wellness buddy that gently enforces a break when you've scrolled too long, syncing rules to your browser extension.",
    "fa_q2": "Is it free?", "fa_a2": "Core enforcement is free forever. Pro / Family unlock multi-device companion and family management.",
    "fa_q3": "Which browsers?", "fa_a3": "Chrome (Manifest V3) today; Edge / Firefox planned.",
    "fa_q4": "How do I install it?", "fa_a4": "Copy your device token from the dashboard, then paste it into the extension popup to sync from the cloud.",
    "fa_q5": "Is my data safe?", "fa_a5": "Passwords are stored as scrypt hashes; we don't sell data. See our Privacy Policy.",
    "fa_q6": "How do I get a refund?", "fa_a6": "Membership is via PayPal; manage or cancel there. For disputes, contact us.",
    "bl_t": "Blog — Digital Wellbeing & Screen Time Tips", "bl_intro": "Short reads on digital wellness, screen time control, and self-management. Summer screen-time spikes, the power of pause, phone-addiction recovery, and focus tips for 2026.",
    "bl_post1_t": "Why “cute” beats “blocked”", "bl_post1_d": "A cold “Blocked” screen triggers resistance; a buddy that plays cute lowers that wall and makes people willing to take a break.",
    "bl_post2_t": "The 5-minute rule: small interruptions break mindless scrolling", "bl_post2_d": "Mindless scrolling runs on habit loops. A gentle forced break interrupts the loop and hands control back to you.",
    "bl_post3_t": "Summer screen time doubles? Take control back with a Pause", "bl_post3_d": "Studies show kids' daily recreational screen time jumps from 3.8 to 7.2 hours over summer. Instead of hard blocking, use a gentle forced break to interrupt mindless scrolling — that's the power of pause: stop on schedule, cute not shaming, and the habit loosens on its own.",
    "co_t": "Contact Us", "co_intro": "Questions, ideas, or privacy requests? Reach us anytime.",
    "co_email_h": "Email", "co_email": "ahmedlzany423@gmail.com",
    "co_form_h": "Send us a message", "co_name_ph": "Your name", "co_msg_ph": "Say something…", "co_send": "Send",
    "co_note": "This form is a demo; submitting opens your mail client. The production version will deliver directly.",
    "footer": "PausePaw · Digital wellness companion"
  }
};
window.getLang = function () {
  // 提示语默认中文；用户可在右上角切换英文
  return localStorage.getItem("pp_locale") || "zh";
};
window.setLang = function (lang) {
  localStorage.setItem("pp_locale", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en-US";
  if (window.__authed && typeof api === "function") api("POST", "/api/locale", { locale: lang }).catch(() => {});
  applyI18n();
  window.trackEvent("locale_switch", { lang: lang });
};
window.applyI18n = function () {
  const lang = window.getLang();
  const dict = window.I18N[lang];
  document.querySelectorAll("[data-i18n]").forEach(el => { const k = el.getAttribute("data-i18n"); if (dict[k] != null) el.textContent = dict[k]; });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { const k = el.getAttribute("data-i18n-ph"); if (dict[k] != null) el.placeholder = dict[k]; });
  document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.getAttribute("data-lang") === lang));
  updateThemeBtn();
};

/* ---------- 分析埋点（项 7：GA4 + Clarity，仅在已注入脚本时触发）---------- */
window.trackEvent = function (name, params) {
  try {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    if (typeof window.clarity === "function") window.clarity("event", name, params || {});
  } catch (e) {}
};

/* ---------- 主题（亮 / 暗） ---------- */
window.getTheme = function () {
  return localStorage.getItem("pp_theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
};
window.setTheme = function (theme) {
  localStorage.setItem("pp_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeBtn();
};
window.toggleTheme = function () { window.setTheme(window.getTheme() === "dark" ? "light" : "dark"); window.trackEvent("theme_toggle", { theme: window.getTheme() }); };
function updateThemeBtn() {
  const b = document.getElementById("themeBtn");
  if (b) b.textContent = window.getTheme() === "dark" ? "☀️" : "🌙";
}
