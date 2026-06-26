/* ============================================================
 * H5 视觉规范预览工具 · 交互逻辑
 * ============================================================ */

console.log("[H5预览] app.js v6 已加载");

// ============================================================
// 启动前检测：必须通过 HTTP 服务访问，不能 file:// 直接打开
// ============================================================
(function checkProtocol() {
  if (location.protocol === "file:") {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1A1E24;color:#E5E6EB;font-family:-apple-system,'PingFang SC',sans-serif;padding:24px;z-index:99999;">
          <div style="max-width:560px;background:#1F2329;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;line-height:1.7;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#FF6B6B;">⚠ 不能用浏览器直接打开 index.html</h2>
            <p style="margin:0 0 16px;color:#E5E6EB;">检测到当前是 <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#FF85B3;">file://</code> 协议，浏览器会因安全策略屏蔽资源加载，导致控制台 / 图标 / 导出全部失效。</p>
            <h3 style="margin:0 0 8px;font-size:15px;color:#4A8BFF;">✅ 正确启动方式（任选其一）：</h3>
            <p style="margin:0 0 8px;color:#8C92A4;font-size:13px;">在当前目录（<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#FF85B3;">preview-template/</code>）打开终端 / PowerShell，运行：</p>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;margin-bottom:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">macOS / Linux：</div>
              <div>双击 <strong style="color:#4A8BFF;">start-mac.command</strong> 或在终端运行 <code style="color:#FFD666;">bash start.sh</code></div>
            </div>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;margin-bottom:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">Windows：</div>
              <div>双击 <strong style="color:#4A8BFF;">start-windows.bat</strong></div>
            </div>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">手动方式（任意系统）：</div>
              <div style="color:#FFD666;">python3 -m http.server 5520</div>
              <div style="color:#8C92A4;font-size:12px;margin-top:6px;">然后访问 <span style="color:#4A8BFF;">http://localhost:5520/index.html</span></div>
            </div>
            <p style="margin:16px 0 0;color:#6C7280;font-size:12px;">需要先安装 Python 3。Windows 可从 <a href="https://www.python.org/downloads/" style="color:#4A8BFF;" target="_blank">python.org</a> 下载并勾选「Add to PATH」。</p>
          </div>
        </div>
      `;
    });
    // 阻止后续脚本执行
    throw new Error("[H5预览] 必须通过 HTTP 服务访问。请使用 start-mac.command / start-windows.bat / python3 -m http.server 启动");
  }
})();

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// 银行高亮色对照表（来自 credit-card-ops SKILL §3.4）
// 选择银行后，渐变主色自动切换到该银行品牌色
// ============================================================
const BANK_COLORS = {
  cmb:   { name: "招商银行",     color: "#C42D32" },
  ceb:   { name: "光大银行",     color: "#843CC4" },
  hxb:   { name: "华夏银行",     color: "#DB4C40" },
  icbc:  { name: "工商银行",     color: "#BD3338" },
  cibf:  { name: "广发银行",     color: "#D43D40" },
  ccb:   { name: "建设银行",     color: "#2F6CB8" },
  bcm:   { name: "交通银行",     color: "#0B6BD5" },
  cmbc:  { name: "民生银行",     color: "#2E7BD9" },
  abc:   { name: "农业银行",     color: "#009583" },
  pab:   { name: "平安银行",     color: "#EA5404" },
  spdb:  { name: "浦发银行",     color: "#2662AB" },
  cib:   { name: "兴业银行",     color: "#0054A3" },
  psbc:  { name: "邮政储蓄银行", color: "#14634A" },
  boc:   { name: "中国银行",     color: "#B6002A" },
  citic: { name: "中信银行",     color: "#D91920" },
  custom:  { name: "自定义",     color: null },
};

// ============================================================
// Logo 配置：业务主题 → logo 路径（自有品牌 logo）
// ============================================================
const LOGO_PRESETS = {
  // 主题联动默认值（路径指向 assets/logos/own/）
  themeMap: {
    "telecom":      "assets/logos/own/通讯.svg",
    "cross-border": "assets/logos/own/跨境.svg",
    "credit-card":  "assets/logos/own/信用卡.svg",
    "zhibie":       "assets/logos/own/腾讯智慧鹅.svg",
  },
  // QA 头像图标：根据业务类型选择 partner 图标
  qaPartnerMap: {
    "credit-card":  "assets/icons/partner/图标_微信信用卡.png",
    "telecom":      "assets/icons/partner/图标_腾讯手机充值.png",
    "cross-border": "assets/icons/partner/微信logo.svg",
    "zhibie":       "assets/icons/partner/图标_微信信用卡.png",
  },
};

// ============================================================
// 资产 Manifest（自动加载本地资产清单）
// ============================================================
let _manifest = null;
async function loadManifest() {
  if (_manifest) return _manifest;
  try {
    const res = await fetch("assets/manifest.json");
    if (!res.ok) throw new Error("manifest 加载失败 " + res.status);
    _manifest = await res.json();
    return _manifest;
  } catch (err) {
    console.warn("manifest 加载失败，资产下拉无法填充：", err);
    _manifest = { logos: { own: [], bank: [] }, icons: { own: [], common: [], bank: [], partner: [] } };
    return _manifest;
  }
}

// 文件名 → 显示名（去扩展名 + 下划线转 ·）
function fileToLabel(name) {
  return name.replace(/\.(svg|png|jpe?g)$/i, "").replace(/_/g, " · ");
}

// 用 manifest 填充 Logo 下拉（自有品牌 + 银行）
function populateLogoSelect(manifest) {
  const sel = $("#ctrlLogoSelect");
  if (!sel) return;
  // 删除已有 optgroup（防重复填充）
  sel.querySelectorAll("optgroup[data-auto]").forEach(g => g.remove());

  const customOpt = sel.querySelector('option[value="custom"]');

  // 自有品牌 logo
  if (manifest.logos.own.length) {
    const og = document.createElement("optgroup");
    og.label = "自有品牌";
    og.dataset.auto = "1";
    manifest.logos.own.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/own/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.insertBefore(og, customOpt);
  }
  // 银行 logo（PNG，不支持反白）
  if (manifest.logos.bank.length) {
    const og = document.createElement("optgroup");
    og.label = "银行 logo";
    og.dataset.auto = "1";
    manifest.logos.bank.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/bank/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.insertBefore(og, customOpt);
  }

  // 同时填充次 Logo 下拉（联合/背书时使用）
  populateLogo2Select(manifest);
}

// 次 Logo 下拉填充：自有品牌 + 银行 logo + 合作方图标（PNG）
function populateLogo2Select(manifest) {
  const sel = $("#ctrlLogo2Select");
  if (!sel) return;
  sel.innerHTML = "";

  // 自有品牌
  if (manifest.logos.own.length) {
    const og = document.createElement("optgroup");
    og.label = "自有品牌";
    manifest.logos.own.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/own/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  // 银行
  if (manifest.logos.bank.length) {
    const og = document.createElement("optgroup");
    og.label = "银行 logo";
    manifest.logos.bank.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/bank/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  // 合作方
  if (manifest.icons.partner.length) {
    const og = document.createElement("optgroup");
    og.label = "合作方";
    manifest.icons.partner.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/icons/partner/${f}`;
      o.textContent = fileToLabel(f).replace(/^图标 · /, "");
      og.appendChild(o);
    });
    sel.appendChild(og);
  }

  // 默认选中第一个
  if (!state.header.logoSecond && sel.options.length) {
    state.header.logoSecond = sel.options[0].value;
  }
  sel.value = state.header.logoSecond || "";
}

// ============================================================
// TDesign 图标加载（线性 SVG，统一 2px 线宽）
// 用于：白底卡片图标 / Header 装饰图标 等需要"线条统一"的场景
// 文档：https://tdesign.tencent.com/icons
// ============================================================
const TD_ICON_BASE = "https://unpkg.com/tdesign-icons-svg@0.4.2/src";
const TD_ICON_STROKE_WIDTH = 2; // TDesign 默认线宽 2px
const _tdIconCache = new Map();

async function loadTdIcon(name) {
  if (_tdIconCache.has(name)) return _tdIconCache.get(name);
  try {
    const res = await fetch(`${TD_ICON_BASE}/${name}.svg`);
    if (!res.ok) throw new Error("404");
    let svg = await res.text();
    // TDesign 用非标准 view-box（连字符），浏览器不识别 → 改为标准 viewBox
    svg = svg.replace(/\bview-box=/gi, 'viewBox=');
    // 统一线宽
    svg = svg.replace(/stroke-width="[^"]*"/gi, `stroke-width="${TD_ICON_STROKE_WIDTH}"`);
    // 移除固定 1em 尺寸，让父容器控制
    svg = svg.replace(/\s(width|height)="[^"]*"/g, "");
    _tdIconCache.set(name, svg);
    return svg;
  } catch (err) {
    console.warn("TDesign 图标加载失败：", name, err);
    return null;
  }
}

// 渲染页面内所有 [data-td-icon] 的图标
async function renderTdIcons() {
  const targets = $$("[data-td-icon]");
  await Promise.all(targets.map(async el => {
    const name = el.dataset.tdIcon;
    if (!name || el.dataset.tdLoaded === name) return;
    const svg = await loadTdIcon(name);
    if (svg) {
      el.innerHTML = svg;
      el.dataset.tdLoaded = name;
    }
  }));
}

// ============================================================
// 本地资源加载（仅用于 Logo PNG / SVG）
// ============================================================
const _iconCache = new Map();
async function loadLocalIcon(url) {
  if (_iconCache.has(url)) return _iconCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("404");
    let svg = await res.text();
    // 去掉 xml 声明
    svg = svg.replace(/<\?xml[^>]*\?>/, "").trim();
    // 兼容性：少数 SVG 用 view-box，统一改为 viewBox
    svg = svg.replace(/\bview-box=/gi, 'viewBox=');
    // 移除 svg 根节点上的 width/height（让父容器控制尺寸）
    svg = svg.replace(/<svg([^>]*)\s(width|height)="[^"]*"/gi, "<svg$1");
    // ★ 关键：把所有硬编码黑色 fill 替换为 currentColor，让图标跟随主题色
    //   常见值：black / #000 / #000000 / rgb(0,0,0) / #1A1A1A 等
    //   保留 fill="none"（描边图标）
    svg = svg
      .replace(/fill="(?!none\b)#?(?:000(?:000)?|black|1[Aa]1[Aa]1[Aa]|111|222|333)"/gi, 'fill="currentColor"')
      .replace(/fill="rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)"/gi, 'fill="currentColor"')
      .replace(/fill="rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[^)]+\)"/gi, 'fill="currentColor"');
    // 同时把硬编码黑色 stroke 也替换为 currentColor
    svg = svg
      .replace(/stroke="(?!none\b)#?(?:000(?:000)?|black|1[Aa]1[Aa]1[Aa]|111|222|333)"/gi, 'stroke="currentColor"')
      .replace(/stroke="rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)"/gi, 'stroke="currentColor"');
    // 如果整个 svg 没有任何 fill，给根节点加 fill=currentColor 兜底
    if (!/\sfill=/i.test(svg)) {
      svg = svg.replace(/<svg/, '<svg fill="currentColor"');
    }
    _iconCache.set(url, svg);
    return svg;
  } catch (err) {
    console.warn("本地图标加载失败：", url, err);
    return null;
  }
}

// 渲染页面内所有 [data-icon-src] 的本地图标
async function renderLocalIcons() {
  const targets = $$("[data-icon-src]");
  await Promise.all(targets.map(async el => {
    const src = el.dataset.iconSrc;
    if (!src || el.dataset.iconLoaded === src) return;
    // PNG 直接用 <img>
    if (/\.(png|jpe?g)$/i.test(src)) {
      el.innerHTML = `<img src="${src}" alt="" />`;
      el.dataset.iconLoaded = src;
      return;
    }
    // SVG 内联（便于 currentColor 跟随主题）
    const svg = await loadLocalIcon(src);
    if (svg) {
      el.innerHTML = svg;
      el.dataset.iconLoaded = src;
    }
  }));
}

// SVG 反白：把所有彩色 fill 替换为白色（保留 fill="none"）
function invertSvgFills(svgText) {
  return svgText.replace(/fill="(?!none\b|"#fff"i)([^"]+)"/gi, 'fill="#FFFFFF"');
}

// 加载 SVG 内联（带反白选项）
async function loadSvgInline(url, invert = false) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    let svg = await res.text();
    // 去掉 xml 声明
    svg = svg.replace(/<\?xml[^>]*\?>/, "").trim();
    if (invert) svg = invertSvgFills(svg);
    return svg;
  } catch (err) {
    console.warn("加载 logo 失败：", url, err);
    return null;
  }
}

// ============================================================
// 状态
// ============================================================
// ⚠️ 重要提醒：
// 1. 字符串中禁止出现英文双引号 " 和 "，必须用中文引号 「」或转义 \" 
//    → 否则会导致整个 JS SyntaxError，页面空白
// 2. 同一内容禁止在多个模块重复出现（如 header.title 和 titleText.title 只留一个）
// 3. 修改 state 后必须升级 index.html 中的 ?v= 版本号，否则浏览器缓存不更新
// ⚠️ 重要提醒（续）：
// 4. QA / phone-flow 默认关闭（false），避免 AI 捏造内容
//    用户明确要求时才设为 true
// ============================================================
const state = {
  theme: "credit-card",
  bg: "light-gradient",
  gradientColor: "auto",
  bankColor: "auto",
  bankCustomColor: "#007AFF",
  qaStyle: "default",
  header: {
    form: "text-only",
    title: "年中资金早安排",
    sub: "信用卡现金分期来帮忙",
    showTag: true,
    tag: "银行官方服务",
    invert: { tag: false, text: false, logo: false },
    align: "left",
    logoMode: "default",
    logoCustomDataUrl: null,
    logoLayout: "single",
    logoSecond: null,
    bannerDataUrl: null,
    illuDataUrl: null,
    phoneDataUrl: null,
    phonePlaceholder: false,
  },
  // ⚠️ 核心原则：同一内容只在一个模块出现，禁止跨模块重复
  // ⚠️ 字符串中禁止用英文双引号 "，必须用中文引号「」或 \u201C\u201D，否则会导致 SyntaxError
  showFooter: false,
  modules: {
    "title-text":  true,
    "coupon":      false,
    "table":       false,
    "qa":          true,
    "phone-flow":  true,
    "input":       false,
    "white-cards": true,
    "button":      true,
  },
  modulesList: [
    { id: "m1", type: "white-cards", visible: true },
    { id: "m2", type: "title-text",   visible: true },
    { id: "m3", type: "phone-flow",  visible: true },
    { id: "m4", type: "qa",           visible: true },
    { id: "m5", type: "button",       visible: true },
    { id: "m6", type: "rules",        visible: true },
  ],
  couponTitle: "",
  coupons: [],
  qa: [
    { q: "办理后资金如何到账", a: "提交申请后，银行审核通过，资金通常转入本人借记卡账户。\n实际到账：银行审核通过后秒级到账。" },
    { q: "办理后如何还款", a: "分期成功后，按约定还款计划按期还款。\n每期应还金额、还款日期、手续费/利息等，以页面及银行账单为准。\n\n可订阅公众号消息提醒，及时关注还款日期和账单动态。" }
  ],
  phoneSteps: 4,
  phoneStepLabels: [
    "进入微信信用卡还款服务-借款页面",
    "选择信用卡，即可查看可借额度",
    "点击借款，选择金额、期数，确认费率/优惠",
    "按页面提示完成申请"
  ],
  titleText: {
    title: "信用卡现金分期小课堂",
    iconStats: [],
    image: "",
    subTitle: "",
    note: "信用卡现金分期是银行为符合条件的信用卡用户提供的资金周转服务。\n可将信用卡额度转为现金，转入借记卡账户，后续按期还款。\n\n现在办理还有机会享受利率优惠。\n具体额度、期数、费率及到账时间，以页面展示和银行审批结果为准。",
  },
  whiteCardsTitle: "",
  whiteCards: [
    { style: "icon", layout: "horizontal", columns: 1, iconSource: "preset", icon: "discount", title: "", main: "利率低至2折", sub: "年中资金周转更轻松", logos: [], image: "", imagePlaceholder: false, mergeWithPrev: false },
    { style: "icon", layout: "horizontal", columns: 1, iconSource: "preset", icon: "notification", title: "", main: "全线上申请 最快1秒放款", sub: "申请方便，到账快", logos: [], image: "", imagePlaceholder: false, mergeWithPrev: false },
  ],
  // 输入框
  inputBox: {
    title: "立即咨询",
    hasPlaceholder: true,
    placeholderText: "请输入您的手机号",
    style: "default",
    iconText: ">",
  },
  // ⑨ 按钮
  buttonText: "去办理",
  buttonLinkText: "15元/月，随时可退订",
  footerForm: "info",
  // A 机构信息卡
  footerName: "中国电信",
  footerPhone: "4008308100",
  footerCopy: "",
  // B 推广跳转卡
  promoTitle: "",
  promoDesc: "",
  // C 免责声明卡
  disclaimerTitle: "",
  disclaimerText: "",
  // D 图片卡
  footerImageDataUrl: null,
  footerImageCaption: "",
  // E 名片卡
  cardQrDataUrl: null,
  cardQrNote: "",
  cardName: "",
  cardTitle: "",
  cardPhone: "",
  cardWechat: "",
  // QR 二维码卡
  qrCodeDataUrl: null,
  qrTitle: "",
  qrManagerName: "",
  qrNote: "",
  platforms: [],
  // ⚠️ 禁止在下方字符串中使用英文双引号 " 和 "，必须用中文引号「」或转义
  rulesText: $("#rulesText") ? $("#rulesText").value : "一、信用卡现金分期服务由银行提供，具体额度、期数、费率等以页面展示和银行审批结果为准。\n\n二、符合条件的现金分期业务有机会享财政贴息，最高补贴3000元，具体以银行审核和页面展示为准。\n\n三、请根据自身资金需求和还款能力合理申请，按时还款，避免逾期。",
};

// ============================================================
// 渲染
// ============================================================
function render() {
  applyHeaderBgConstraint();
  renderCanvas();
  renderHeader();
  renderModules();
  renderCoupons();
  renderQA();
  renderPhoneFlow();
  renderRules();
  renderFooter();
  renderTdIcons();    // 加载 TDesign 图标（白底卡片等）
  renderLocalIcons(); // 加载本地图标（Logo PNG 等）
  // 同步外层 wrap 高度（让缩放后画布占据正确的滚动空间）
  syncCanvasWrapHeight();
}

// 缩放后画布在 layout 上仍占原高度，wrap 需要用 JS 同步真实高度
function syncCanvasWrapHeight() {
  requestAnimationFrame(() => {
    const wrap = document.querySelector(".h5-canvas-wrap");
    const canvas = document.getElementById("h5Canvas");
    if (!wrap || !canvas) return;
    const h = canvas.offsetHeight * 0.5; // scale(0.5)
    wrap.style.height = h + "px";
  });
}
// 观察画布内容变化触发同步
if (typeof ResizeObserver !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("h5Canvas");
    if (!canvas) return;
    const ro = new ResizeObserver(syncCanvasWrapHeight);
    ro.observe(canvas);
  });
}

/**
 * 形态 A（全幅 banner）只能搭配浅色页面底色
 * 自动锁定 bg=solid，并禁用 bg 选择器
 */
function applyHeaderBgConstraint() {
  const bgSelect = $("#bgSelect");
  if (!bgSelect) return;
  if (state.header.form === "image") {
    state.bg = "solid";
    bgSelect.value = "solid";
    bgSelect.disabled = true;
    bgSelect.title = "形态 A（全幅 banner 图）仅支持浅色底";
  } else {
    bgSelect.disabled = false;
    bgSelect.title = "";
    // 若当前被锁定为 solid，且之前不是用户主动选的，恢复为 light-gradient
    if (state.bg === "solid") {
      state.bg = "light-gradient";
      bgSelect.value = "light-gradient";
    }
  }

  // 联动 Header 形态 → 显隐 Banner / 插图 上传栏
  const bannerRow = $("#ctrlBannerRow");
  const illuRow = $("#ctrlIlluRow");
  if (bannerRow) {
    bannerRow.style.display = state.header.form === "image" ? "" : "none";
  }
  if (illuRow) {
    // 仅形态 B（solid） 显示插图；text-only 不需要插图
    illuRow.style.display = state.header.form === "solid" ? "" : "none";
  }
}

// 把 hex 颜色解析为 [r,g,b]，失败返回 null
function hexToRgb(hex) {
  if (!hex) return null;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// hex + alpha → rgba 字符串
function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// 通用：接受 hex（"#FFCF00"）或 rgb 字符串（"rgb(120, 95, 0)"），返回 rgba(..., alpha)
function colorWithAlpha(color, alpha) {
  if (!color) return color;
  // hex
  if (color.startsWith("#")) return rgbaFromHex(color, alpha);
  // rgb(...) / rgba(...)
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return color;
}

function renderCanvas() {
  const c = $("#h5Canvas");
  c.dataset.theme = state.theme;
  c.dataset.bg = state.bg;

  // 渐变主色联动：银行选择 → 自动设定渐变主色
  // bankColor !== auto 时，gradientColor 由银行表驱动
  const bankKey = state.bankColor;
  if (bankKey && bankKey !== "auto" && bankKey !== "custom") {
    const bankInfo = BANK_COLORS[bankKey];
    if (bankInfo && bankInfo.color && state.gradientColor !== bankInfo.color) {
      state.gradientColor = bankInfo.color;
    }
  } else if (bankKey === "custom" && state.bankCustomColor) {
    state.gradientColor = state.bankCustomColor;
  }

  // 自定义品牌色：只要用户选了非 auto 色（来自渐变色块/银行/自定义输入），
  // 就在任意 bg 模式下覆盖整套 brand 变量（高亮/Tag/icon/优惠券/coupon/icon-stats 等）
  // 渐变专属变量（--gradient-color、--brand-30、--brand-0）仅在 bg=gradient 时设置
  const hasCustomBrand = state.gradientColor && state.gradientColor !== "auto";
  const isGradientBg = state.bg === "light-gradient" || state.bg === "dark-gradient" || state.bg === "gradient";

  // 跟随主题时，获取当前业务主题对应的品牌色
  const THEME_COLORS = {
    telecom: "#11C16E",
    "cross-border": "#1A6BFF",
    "credit-card": "#11C16E",
    zhibie: "#FADB14"
  };
  const themeBrand = THEME_COLORS[state.theme] || "#1A6BFF";

  if (hasCustomBrand) {
    const hex = state.gradientColor;
    c.style.setProperty("--brand", hex);
    c.style.setProperty("--brand-light", rgbaFromHex(hex, 0.5));
    c.style.setProperty("--brand-soft", rgbaFromHex(hex, 0.08));
    c.style.setProperty("--brand-16", rgbaFromHex(hex, 0.16));
    c.style.setProperty("--brand-18", rgbaFromHex(hex, 0.18));
    c.style.setProperty("--brand-32", rgbaFromHex(hex, 0.32));
    c.style.setProperty("--brand-20", rgbaFromHex(hex, 0.20));
    // 图标圆角矩形弱底：黄/橙系用 20%（亮色需要更明显），其他色相用 12%（避免过重）
    const iconBgAlpha = getIconBgAlpha(hex);
    c.style.setProperty("--brand-icon-bg", rgbaFromHex(hex, iconBgAlpha));
    c.dataset.gc = hex;

    // 渐变专属变量：仅在 gradient 底色模式下生效；solid 模式下移除避免干扰
    if (isGradientBg) {
      // --gradient-start: 渐变起始色，按底色类型决定透明度
      //   light-gradient: 50% 透明度（浅色渐变）
      //   dark-gradient:  不透明（深色渐变）
      //   gradient:       不透明（兼容旧值）
      const startColor = state.bg === "light-gradient"
        ? rgbaFromHex(hex, 0.5)
        : hex;
      c.style.setProperty("--gradient-start", startColor);
      c.style.setProperty("--gradient-end", "#F1F1F1");
      // 兼容旧版 CSS（如有外部样式依赖 --gradient-color）
      c.style.setProperty("--gradient-color", hex);
    } else {
      c.style.removeProperty("--gradient-start");
      c.style.removeProperty("--gradient-end");
      c.style.removeProperty("--gradient-color");
    }

    // ===== --brand-text 智能可读色 =====
    // 原则：所有"作文字色 / 线性图标 stroke"的高亮场景都用 --brand-text，
    //       它的色调与品牌色保持一致，但当品牌色亮到在白底上对比度 < 4.5:1（WCAG AA）
    //       时，自动按相同色相递减亮度直到达标。
    // 覆盖：黄(#FFCF00)、橙(#FA9116)、淡绿(#0CBD6A)、其它任何亮色
    const brandText = computeBrandText(hex);
    // 补充规则：品牌色相对亮度 ≥ 0.45 时，在高亮色基础上增加50%的黑（变暗50%）
    let finalBrandText = brandText;
    const origRgb = hexToRgb(hex);
    if (origRgb) {
      const origLum = relativeLuminance(origRgb[0], origRgb[1], origRgb[2]);
      if (origLum >= 0.45) {
        finalBrandText = darkenColor(brandText, 0.5);
      }
    }
    c.style.setProperty("--brand-text", finalBrandText);
    // --brand-text-20：在高亮色基础上增加20%的黑（变暗20%），用于 CTA link、优惠券高亮文字、Tag 反色文字
    const brandText20 = darkenColor(brandText, 0.8);
    c.style.setProperty("--brand-text-20", brandText20);
    // brand-text-16：同色系深色的 16% 透明版，用于图标圆角矩形弱底
    c.style.setProperty("--brand-text-16", colorWithAlpha(finalBrandText, 0.16));
    // --brand-on: 品牌"底色上的文字色"，亮品牌(黄/橙)→深色，暗品牌→白色
    const brandOn = isLightBrand(hex) ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.88)";
    c.style.setProperty("--brand-on", brandOn);
  } else {
    c.style.removeProperty("--gradient-color");
    c.style.removeProperty("--brand");
    c.style.removeProperty("--brand-text");
    c.style.removeProperty("--brand-text-16");
    c.style.removeProperty("--brand-light");
    c.style.removeProperty("--brand-soft");
    c.style.removeProperty("--brand-16");
    c.style.removeProperty("--brand-18");
    c.style.removeProperty("--brand-32");
    c.style.removeProperty("--brand-20");
    c.style.removeProperty("--brand-icon-bg");
    c.style.removeProperty("--brand-30");
    c.style.removeProperty("--brand-50");
    c.style.removeProperty("--brand-70");
    c.style.removeProperty("--brand-0");
    c.style.removeProperty("--brand-top");
    c.style.removeProperty("--brand-on");
    delete c.dataset.gc;

    // 跟随主题(auto)时：用 themeBrand 设置 --brand 及相关变量
    // 渐变专属变量仅在 isGradientBg 时设置
    if (isGradientBg) {
      const startColor = state.bg === "light-gradient"
        ? rgbaFromHex(themeBrand, 0.5)
        : themeBrand;
      c.style.setProperty("--gradient-start", startColor);
      c.style.setProperty("--gradient-end", "#F1F1F1");
      c.style.setProperty("--gradient-color", themeBrand);
    } else {
      c.style.removeProperty("--gradient-start");
      c.style.removeProperty("--gradient-end");
      c.style.removeProperty("--gradient-color");
    }
    // ===== 无论是否渐变，auto 模式都要设置 --brand 全套 + --brand-text(含变暗20%) =====
    c.style.setProperty("--brand", themeBrand);
    c.style.setProperty("--brand-light", rgbaFromHex(themeBrand, 0.5));
    c.style.setProperty("--brand-soft", rgbaFromHex(themeBrand, 0.08));
    c.style.setProperty("--brand-16", rgbaFromHex(themeBrand, 0.16));
    c.style.setProperty("--brand-18", rgbaFromHex(themeBrand, 0.18));
    c.style.setProperty("--brand-20", rgbaFromHex(themeBrand, 0.20));
    c.style.setProperty("--brand-32", rgbaFromHex(themeBrand, 0.32));
    const iconBgAlpha2 = getIconBgAlpha(themeBrand);
    c.style.setProperty("--brand-icon-bg", rgbaFromHex(themeBrand, iconBgAlpha2));
    // --brand-text 智能可读色（含变暗50%补充规则）
    const bt = computeBrandText(themeBrand);
    let fbt = bt;
    const tRgb = hexToRgb(themeBrand);
    if (tRgb && relativeLuminance(tRgb[0], tRgb[1], tRgb[2]) >= 0.45) {
      fbt = darkenColor(bt, 0.5);
    }
    c.style.setProperty("--brand-text", fbt);
    // --brand-text-20：在高亮色基础上增加20%的黑（变暗20%），用于 CTA link、优惠券高亮文字、Tag 反色文字
    const bt20 = darkenColor(bt, 0.8);
    c.style.setProperty("--brand-text-20", bt20);
    c.style.setProperty("--brand-text-16", colorWithAlpha(fbt, 0.16));
    // --brand-on
    c.style.setProperty("--brand-on", isLightBrand(themeBrand) ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.88)");
    c.dataset.gc = themeBrand;
  }

  // 联动：仅渐变底时显示色块行
  const gcRow = $("#ctrlGradientColorRow");
  if (gcRow) gcRow.style.display = isGradientBg ? "" : "none";
  // 同步色块选中态
  $$("#gradientSwatches .gs-item").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.gc === state.gradientColor ? "true" : "false");
  });
}

function renderHeader() {
  const h = $("#h5Header");
  const form = state.header.form === "text-only" ? "solid" : state.header.form;
  h.dataset.form = form;
  h.dataset.align = state.header.align;

  $("#headerTitle").innerHTML = highlightText(state.header.title);
  $("#headerSub").textContent = state.header.sub;
  $("#headerSub").style.display = state.header.showTag ? "none" : "";
  const tagEl = $("#headerTag");
  tagEl.hidden = !state.header.showTag;
  tagEl.textContent = state.header.tag;
  tagEl.dataset.invert = state.header.invert.tag ? "1" : "0";

  // 文字反色
  h.dataset.textInvert = state.header.invert.text ? "1" : "0";

  // 手机号图片 + 占位
  const phoneEl = $("#headerPhone");
  if (state.header.phoneDataUrl) {
    phoneEl.hidden = false;
    phoneEl.innerHTML = `<img src="${escapeAttr(state.header.phoneDataUrl)}" alt="phone" />`;
  } else if (state.header.phonePlaceholder) {
    phoneEl.hidden = false;
    phoneEl.innerHTML = `<div class="header-phone-placeholder"></div>`;
  } else {
    phoneEl.hidden = true;
    phoneEl.innerHTML = "";
  }

  // 插图：仅 solid 形态（带插图）时显示；text-only 和 image 形态都不显示
  const illu = $("#headerIllu");
  illu.hidden = state.header.form !== "solid";
  if (state.header.illuDataUrl) {
    illu.dataset.hasImg = "1";
    illu.innerHTML = `<img src="${state.header.illuDataUrl}" alt="illustration" />`;
  } else {
    delete illu.dataset.hasImg;
    illu.innerHTML = "";
  }

  // Banner 图（形态 A，作为画布全局背景）
  const banner = $("#headerBannerImg");
  const fade = $("#headerFade");
  if (state.header.form === "image" && state.header.bannerDataUrl) {
    banner.src = state.header.bannerDataUrl;
    banner.hidden = false;
    if (fade) fade.hidden = false;
    // banner 加载后，根据真实尺寸动态设置 fade 高度（与 banner 等高）+ 渐隐分布
    banner.onload = () => {
      if (!fade) return;
      // banner 按 750 宽展示，等比换算真实展示高度
      const displayH = banner.naturalHeight * (750 / banner.naturalWidth);
      fade.style.height = `${displayH}px`;
      // 顶部 60% 完全透明（banner 完整可见），60%-100% 渐隐到页面底色
      fade.style.background = `linear-gradient(180deg,
        rgba(244,244,246,0) 0%,
        rgba(244,244,246,0) 60%,
        var(--color-bg-page) 100%)`;
    };
    // 若 src 已缓存（onload 不再触发），手动调用一次
    if (banner.complete && banner.naturalWidth) banner.onload();
  } else {
    banner.hidden = true;
    banner.removeAttribute("src");
    if (fade) fade.hidden = true;
  }

  // Logo 图（异步加载内联 SVG，支持反白）
  renderLogo();
}

// 渐变背景顶部的品牌色透明度（与 CSS 中保持一致）
// 黄/橙色相：0.70（亮色需深一点才看得见）
// 其他色相（蓝/绿/红/紫等）：0.40（避免顶部太厚重）
const GRADIENT_TOP_OPACITY_YELLOW = 0.70;
const GRADIENT_TOP_OPACITY_OTHER  = 0.40;
function getGradientTopAlphaFromRgb(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  return isYellowOrangeHue(hsl[0]) ? GRADIENT_TOP_OPACITY_YELLOW : GRADIENT_TOP_OPACITY_OTHER;
}
function getGradientTopAlpha(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return GRADIENT_TOP_OPACITY_OTHER;
  return getGradientTopAlphaFromRgb(rgb[0], rgb[1], rgb[2]);
}

// 图标圆角矩形弱底透明度（与 CSS 默认保持一致）
// 黄/橙色相：0.20（亮色需要更明显的底）
// 其他色相（蓝/绿/红/紫等）：0.12（避免过重）
const ICON_BG_OPACITY_YELLOW = 0.20;
const ICON_BG_OPACITY_OTHER  = 0.12;
function getIconBgAlpha(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return ICON_BG_OPACITY_OTHER;
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return isYellowOrangeHue(hsl[0]) ? ICON_BG_OPACITY_YELLOW : ICON_BG_OPACITY_OTHER;
}

// ============================================================
// Logo 反白判断：基于 logo 实际落点的背景亮度
// ============================================================
// WCAG 相对亮度公式：返回 0~1，0=纯黑 1=纯白
// 阈值 0.5：< 0.5 视为深底（反白），≥ 0.5 视为浅底（彩色）
const LUMINANCE_THRESHOLD = 0.45;        // 品牌色文字色判断：≥0.45 走黑字
const LOGO_INVERT_THRESHOLD = 0.35;       // Logo 反白判断：<0.35 反白（暗底），保持原有行为

function relativeLuminance(r, g, b) {
  const f = c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// ============================================================
// computeBrandText：基于 WCAG 对比度 + 同色相迭代加深
// 输入品牌色 hex，返回可在白底（卡片底色）上达到 4.5:1 对比度的"同色系"颜色
//
// 核心算法：
//   1) 已达标 → 直接返回原色
//   2) 不达标 → 转 HSL，保留色相，循环降亮度 L 直到达标
//   3) 黄/橙色系特殊（H ∈ [25°, 70°]）：降亮度同时同步降饱和度
//      原因：纯黄/纯橙在大字号上呈"老油漆黄"廉价感；
//            降饱和后变成"高级金"（如 #FFCF00 → 古铜金 #B5862F）
// ============================================================

// 颜色变暗：在每个通道上乘以 factor (0~1)，factor=0.9 表示变暗10%
// 支持 hex(#RRGGBB) 和 rgb(r,g,b) 两种输入格式
function darkenColor(color, factor = 0.9) {
  let r, g, b;
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    r = rgb[0]; g = rgb[1]; b = rgb[2];
  } else if (color.startsWith("rgb(")) {
    const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!m) return color;
    r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
  } else {
    return color;
  }
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}
const BRAND_TEXT_BG = [255, 255, 255];  // 文字承载底色：白底卡片
const BRAND_TEXT_MIN_CONTRAST = 4.5;     // WCAG AA 正文标准

// 判断色相是否落在"黄/橙系"区间（HSL.h 单位 0~1，对应 0°~360°）
// 黄系 H≈49°/360°≈0.136；橙系 H≈30°/360°≈0.083；金/橙红 H≈40°
// 区间 [25°, 70°] → [0.069, 0.194]
function isYellowOrangeHue(h) {
  return h >= 25 / 360 && h <= 70 / 360;
}

// 判断品牌色是否为"亮底色"：在品牌色背景上需用深色(黑)文字
// 通用规则：不论色相，相对亮度 ≥ 0.45 时返回 true（走黑字），否则走白字
function isLightBrand(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // 通用亮度判断：相对亮度 ≥ 0.45 走黑字
  const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
  return lum >= 0.45;
}

function computeBrandText(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  // 1) 先算原色对比度，达标就直接用
  const bgLum = relativeLuminance(...BRAND_TEXT_BG);
  const curLum = relativeLuminance(...rgb);
  const ratio = (Math.max(bgLum, curLum) + 0.05) / (Math.min(bgLum, curLum) + 0.05);
  if (ratio >= BRAND_TEXT_MIN_CONTRAST) return hex;
  // 2) 不达标 → 转 HSL，保留色相，逐步降亮度直到达标
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const isYellow = isYellowOrangeHue(hsl[0]);
  let l = hsl[2];
  let s = hsl[1];
  while (l > 0.05) {
    l -= 0.05;
    // 黄/橙色系：每降 5% 亮度，同步降 3% 饱和度（下限 50%），模拟"高级金"
    if (isYellow) {
      s = Math.max(0.50, s - 0.03);
    }
    const [r, g, b] = hslToRgb(hsl[0], s, l);
    const lum = relativeLuminance(r, g, b);
    const r2 = (Math.max(bgLum, lum) + 0.05) / (Math.min(bgLum, lum) + 0.05);
    if (r2 >= BRAND_TEXT_MIN_CONTRAST) {
      return `rgb(${r},${g},${b})`;
    }
  }
  // 3) 极端兜底
  const dr = Math.round(rgb[0] * 0.20);
  const dg = Math.round(rgb[1] * 0.20);
  const db = Math.round(rgb[2] * 0.20);
  return `rgb(${dr},${dg},${db})`;
}

// RGB ↔ HSL 互转（保留色相、调整亮度用）
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 解析 CSS color 字符串为 [r,g,b,a]
function parseRgba(str) {
  // 创建临时元素借浏览器解析
  const el = document.createElement("div");
  el.style.color = str;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = computed.match(/\d+(\.\d+)?/g);
  if (!m) return null;
  return [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1];
}

// alpha 合成到背景：上层 [r,g,b,a] over 下层 [r,g,b]
function compositeOver(top, bottomRGB) {
  const a = top[3];
  return [
    top[0] * a + bottomRGB[0] * (1 - a),
    top[1] * a + bottomRGB[1] * (1 - a),
    top[2] * a + bottomRGB[2] * (1 - a),
  ];
}

// 计算 Logo 落点（距顶 ~72px 区域）的实际背景色与亮度
function getLogoAreaLuminance() {
  // 页面底色（默认浅灰 #f4f4f6）
  const pageRGB = [244, 244, 246];

  // Header banner 图存在 → 假设 logo 区域是图片中部，无法采样图片像素（异步），
  // 但用户上传的设计稿一般顶部是深色，所以默认反白
  if (state.header.form === "image" && state.header.bannerDataUrl) {
    return 0.2; // 模拟深底
  }

  // 渐变底：计算 logo 落点（顶部 72px）的实际渐变颜色
  if (state.bg === "light-gradient" || state.bg === "dark-gradient" || state.bg === "gradient") {
    const canvas = document.getElementById("h5Canvas");
    if (!canvas) return 0.95;
    // 优先用用户自选的渐变主色，否则用业务主题 brand
    let gradientRGB;
    if (state.gradientColor && state.gradientColor !== "auto") {
      gradientRGB = parseRgba(state.gradientColor) || [17, 193, 110];
    } else {
      const computed = getComputedStyle(canvas);
      const brandStr = computed.getPropertyValue("--brand").trim();
      gradientRGB = parseRgba(brandStr) || [17, 193, 110];
    }

    // 起始色 alpha：light-gradient 为 0.5（50% 透明），其他为 1.0（不透明）
    const startAlpha = state.bg === "light-gradient" ? 0.5 : 1.0;
    // 结束色：#F1F1F1 (241,241,241)，不透明
    const endRGBA = [241, 241, 241, 1.0];

    // logo 在距顶 72px 位置；渐变总高 880px → t ≈ 72/880 ≈ 0.082
    const t = 72 / 880;
    // 对每个通道（含 alpha）线性插值，模拟 CSS linear-gradient 渲染
    const r = gradientRGB[0] * (1 - t) + endRGBA[0] * t;
    const g = gradientRGB[1] * (1 - t) + endRGBA[1] * t;
    const b = gradientRGB[2] * (1 - t) + endRGBA[2] * t;
    const a = startAlpha * (1 - t) + endRGBA[3] * t;

    // 将插值后的颜色合成到页面底色 #F1F1F1 上
    const composited = compositeOver([r, g, b, a], [241, 241, 241]);
    return relativeLuminance(...composited);
  }

  // 浅色底
  return relativeLuminance(...pageRGB);
}

// 判断当前 Header 是否需要反白 logo
function isHeaderDarkBg() {
  // 用户手动勾选 logo 反白 → 强制反白
  if (state.header.invert && state.header.invert.logo) return true;
  // 形态 A 下默认不反白（由用户手动控制）
  if (state.header.form === "image") {
    return false;
  }
  // 其他形态走默认亮度判断
  const lum = getLogoAreaLuminance();
  return lum < LOGO_INVERT_THRESHOLD;
}

let _logoRenderToken = 0;

// 加载单个 logo 到一个临时元素（返回 HTML 片段字符串），同时返回是否被反白
async function buildLogoFragment(url, dark) {
  if (!url) return "";
  // PNG / JPG → <img>（不反白）
  if (/\.(png|jpe?g)$/i.test(url)) {
    return `<img src="${url}" alt="logo" />`;
  }
  // SVG → 内联，支持反白
  const svg = await loadSvgInline(url, dark);
  if (!svg) return "";
  // 包一层 span 便于约束尺寸
  return `<span class="logo-piece">${svg}</span>`;
}

// 主 Logo 路径（基于当前模式）
function resolveMainLogoUrl() {
  const mode = state.header.logoMode;
  if (mode === "auto" || mode === "default") return LOGO_PRESETS.themeMap[state.theme] || null;
  if (mode === "custom") return null; // 自定义走 dataURL 分支
  if (mode === "none") return null;
  if (mode && mode.startsWith("assets/logos/")) return mode;
  return null;
}

async function renderLogo() {
  const logo = $("#headerLogo");
  const mode = state.header.logoMode;
  const layout = state.header.logoLayout || "single";
  const myToken = ++_logoRenderToken;

  // 重置
  logo.innerHTML = "";
  logo.style.backgroundImage = "";
  delete logo.dataset.hasImg;
  delete logo.dataset.invert;
  logo.style.width = "";

  // 同步 layout 给 CSS 使用（控制单/联合的高度差）
  logo.dataset.layout = layout;

  if (layout === "none" || mode === "none") {
    logo.style.display = "none";
    return;
  }
  logo.style.display = "";

  const dark = isHeaderDarkBg();
  logo.dataset.invert = dark ? "1" : "0";

  // 处理自定义上传（仅单 Logo 模式）
  if (mode === "custom") {
    if (state.header.logoCustomDataUrl) {
      logo.innerHTML = `<img src="${state.header.logoCustomDataUrl}" alt="logo" />`;
      logo.dataset.hasImg = "1";
      logo.style.width = "auto";
    }
    return;
  }

  // 主 Logo
  const mainUrl = resolveMainLogoUrl();
  if (!mainUrl) return;

  const mainFrag = await buildLogoFragment(mainUrl, dark);
  if (myToken !== _logoRenderToken) return;

  if (layout === "single") {
    logo.innerHTML = mainFrag;
  } else {
    // 联合展示 / 品牌背书：主 Logo + 连接符 + 次 Logo
    const secondUrl = state.header.logoSecond;
    const secondFrag = await buildLogoFragment(secondUrl, dark);
    if (myToken !== _logoRenderToken) return;

    const sep = layout === "combined-x"
      ? `<span class="logo-sep-x">${closeIconSvg()}</span>`
      : `<span class="logo-sep-bar"></span>`;
    logo.innerHTML = mainFrag + sep + secondFrag;
  }

  logo.dataset.hasImg = "1";
  // 让所有内联 SVG 的尺寸由 CSS 接管（不再写 inline style，便于联合时降到 32px）
  logo.querySelectorAll("svg").forEach(svgEl => {
    if (svgEl.closest(".logo-sep-x")) {
      // 连接符 svg 标记一下，CSS 选择器排除
      svgEl.classList.add("logo-sep-svg");
      return;
    }
    svgEl.style.display = "block";
    svgEl.style.height = "";
    svgEl.style.width = "";
  });
  logo.style.width = "auto";
}

// × 连接符 SVG（24×24，currentColor）
function closeIconSvg() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>`;
}
// ============================================================
// Content 模块编排：按 state.modulesList 顺序克隆模板 → 注入 #h5Content
// 同类型多实例共享同一份 state（重复展示同份内容，便于在不同位置插入）
// ============================================================
const MODULE_TYPE_LABELS = {
  "title-text":  "标题 + 文案",
  "coupon":      "优惠券",
  "table":       "表格",
  "qa":          "QA 问答",
  "phone-flow":  "手机界面流程",
  "input":       "输入框",
  "white-cards": "白底卡片",
  "button":      "按钮",
};

function renderContentList() {
  const container = $("#h5Content");
  const tplRoot = $("#moduleTemplates");
  if (!container || !tplRoot) return;
  container.innerHTML = "";

  state.modulesList.forEach(inst => {
    if (!inst.visible) return;
    // 找到对应类型的模板（按 data-module 匹配）
    const tplBlock = tplRoot.content.querySelector(`.content-block[data-module="${inst.type}"]`);
    if (!tplBlock) return;
    const node = tplBlock.cloneNode(true);
    node.dataset.instanceId = inst.id;
    container.appendChild(node);
    // 按类型注入数据
    fillModuleContent(node, inst.type);
  });

  // 模块异步图标（td-icon）注入完毕后刷新
  if (typeof renderTdIcons === "function") renderTdIcons();
}

// 把 state 数据填充到指定模块 DOM 块
function fillModuleContent(node, type) {
  switch (type) {
    case "title-text":   fillTitleText(node);   break;
    case "coupon":       fillCoupon(node);      break;
    case "qa":           fillQA(node);          break;
    case "phone-flow":   fillPhoneFlow(node);   break;
    case "white-cards":  fillWhiteCards(node);  break;
    case "table":        /* 静态内容，无需填充 */ break;
    case "input":        fillInputBox(node);    break;
    case "button":       fillButton(node);      break;
  }
}

function fillButton(node) {
  const btn = node.querySelector('[data-role="ctaButton"]');
  if (btn) btn.textContent = state.buttonText || "立即参与";
  const link = node.querySelector('[data-role="ctaLink"]');
  if (link) {
    if (state.buttonLinkText && state.buttonLinkText.trim()) {
      link.textContent = state.buttonLinkText;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  }
}

function fillTitleText(node) {
  const t = state.titleText || {};
  const titleEl = node.querySelector('[data-role="title"]');
  if (titleEl) titleEl.innerHTML = highlightText(t.title || "");
  const subTitleEl = node.querySelector('[data-role="subTitle"]');
  if (subTitleEl) {
    subTitleEl.innerHTML = escapeHtml(t.subTitle || "");
    subTitleEl.style.display = t.subTitle ? "" : "none";
  }
  const imageWrap = node.querySelector('[data-role="imageWrap"]');
  const imageEl = node.querySelector('[data-role="image"]');
  if (imageWrap && imageEl) {
    if (t.image) {
      imageEl.src = t.image;
      imageWrap.style.display = "";
    } else {
      imageWrap.style.display = "none";
    }
  }
  const noteEl = node.querySelector('[data-role="note"]');
  if (noteEl) {
    // 支持 \n 换行
    noteEl.innerHTML = escapeHtml(t.note || "").replace(/\n/g, "<br/>");
  }
  const grid = node.querySelector('[data-role="iconStats"]');
  if (grid) {
    grid.innerHTML = "";
    const stats = (t.iconStats || []).slice(0, 3);
    if (stats.length === 0) {
      grid.style.display = "none";
    } else {
      grid.style.display = "";
      stats.forEach(s => {
        const div = document.createElement("div");
        div.className = "icon-stat";
        div.innerHTML = `
          <div class="is-icon" data-td-icon="${escapeAttr(s.icon || "")}"></div>
          <div class="is-body">
            <div class="is-num">${escapeHtml(s.num || "")}</div>
            <div class="is-label">${escapeHtml(s.label || "")}</div>
          </div>`;
        grid.appendChild(div);
      });
    }
  }
}

function fillCoupon(node) {
  // 填充标题
  const titleEl = node.querySelector('[data-role="couponTitle"]');
  if (titleEl) titleEl.innerHTML = highlightText(state.couponTitle || "");

  const grid = node.querySelector('[data-role="couponGrid"]');
  if (!grid) return;
  grid.innerHTML = "";
  state.coupons.slice(0, 4).forEach(c => {
    const card = document.createElement("div");
    card.className = "coupon";
    card.innerHTML = `
      <div class="coupon-amount">${escapeHtml(c.amount)}</div>
      <div class="coupon-name">${escapeHtml(c.name)}</div>
      <div class="coupon-cond">${escapeHtml(c.cond)}</div>
    `;
    grid.appendChild(card);
  });
}

function fillQA(node) {
  const list = node.querySelector('[data-role="qaList"]');
  if (!list) return;
  list.dataset.style = state.qaStyle || "qa-chat";
  list.innerHTML = "";
  if (state.qaStyle === "default") {
    state.qa.slice(0, 4).forEach(item => {
      const wrap = document.createElement("div");
      wrap.className = "qa-default-item";
      wrap.innerHTML = `
        <div class="qa-default-q">${escapeHtml(item.q)}</div>
        <div class="qa-default-a">${escapeHtml(item.a)}</div>`;
      list.appendChild(wrap);
    });
  } else {
    state.qa.slice(0, 4).forEach(item => {
      list.appendChild(buildQAItem("q", item.q));
      list.appendChild(buildQAItem("a", item.a));
    });
  }
}

function fillPhoneFlow(node) {
  const wrap = node.querySelector('[data-role="phoneFlow"]');
  if (!wrap) return;
  wrap.innerHTML = "";
  const n = state.phoneSteps;
  if (n === 1) {
    wrap.classList.remove("phone-flow--multi");
    wrap.classList.add("phone-flow--single");
    wrap.appendChild(buildPhoneCard("single", null, state.phoneStepLabels[0] || "单页流程引导文案，最多 40 字"));
  } else {
    wrap.classList.remove("phone-flow--single");
    wrap.classList.add("phone-flow--multi");
    for (let i = 0; i < n; i++) {
      wrap.appendChild(buildPhoneCard("multi", i + 1, state.phoneStepLabels[i] || `步骤${i + 1}`));
    }
  }
}

function fillInputBox(node) {
  const titleEl = node.querySelector('[data-role="inputBoxTitle"]');
  if (titleEl) {
    if (state.inputBox.title && state.inputBox.title.trim()) {
      titleEl.textContent = state.inputBox.title;
      titleEl.style.display = "";
    } else {
      titleEl.style.display = "none";
    }
  }
  const group = node.querySelector('[data-role="inputBoxGroup"]');
  if (!group) return;
  const style = state.inputBox.style || "default";
  const hasPlaceholder = state.inputBox.hasPlaceholder;
  const placeholder = hasPlaceholder ? (state.inputBox.placeholderText || "") : "";
  const demoValue = hasPlaceholder ? "" : "13800138000";
  let fieldClass = "input-field";
  let extraHtml = "";
  if (style === "with-action") {
    fieldClass = "input-field input-field--with-action";
    extraHtml = '<span class="input-divider"></span><button class="input-action">获取验证码</button>';
  } else if (style === "with-icon") {
    fieldClass = "input-field input-field--with-icon";
    const iconText = state.inputBox.iconText || ">";
    extraHtml = `<span class="input-icon-btn">${escapeHtml(iconText)}</span>`;
  }
  group.innerHTML = `
    <div class="${fieldClass}">
      <input type="text" placeholder="${escapeAttr(placeholder)}" value="${escapeAttr(demoValue)}" readonly />
      ${extraHtml}
    </div>`;
}

function fillWhiteCards(node) {
  // 填充/隐藏模块标题
  const titleEl = node.querySelector('[data-role="whiteCardsTitle"]');
  if (titleEl) {
    if (state.whiteCardsTitle && state.whiteCardsTitle.trim()) {
      titleEl.textContent = state.whiteCardsTitle;
      titleEl.style.display = "";
    } else {
      titleEl.style.display = "none";
    }
  }

  const grid = node.querySelector('[data-role="whiteCardsGrid"]');
  if (!grid) return;
  grid.innerHTML = "";
  grid.className = "white-cards-grid";

  const cards = state.whiteCards;
  if (cards.length === 0) return;

  // 按列数分组：连续相同列数的卡片放入同一组
  const groups = [];
  let currentGroup = null;
  cards.forEach((card) => {
    const cols = card.columns || 1;
    if (!currentGroup || currentGroup.cols !== cols) {
      currentGroup = { cols, cards: [] };
      groups.push(currentGroup);
    }
    currentGroup.cards.push(card);
  });

  // 渲染每个分组
  groups.forEach((group) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "white-cards-group"
      + (group.cols === 2 ? " white-cards-group--2col" : "")
      + (group.cols === 3 ? " white-cards-group--3col" : "");

    group.cards.forEach((card, idx) => {
      const isLogoGrid = card.style === "logo-grid";
      const isNoIcon = card.style === "no-icon";
      const isPromoText = card.style === "promo-text";
      const isIcon = card.style === "icon";
      const isGift = card.icon === "gift" || /新客|福利|礼/.test(card.main || "");
      const isVertical = card.layout === "vertical";

      const div = document.createElement("div");
      div.className = "white-card"
        + (isGift ? " white-card--gift" : "")
        + (isLogoGrid ? " white-card--logo-grid" : "")
        + (isNoIcon ? " white-card--no-icon" : "")
        + (isPromoText ? " white-card--promo-text" : "")
        + (isVertical ? " white-card--vertical" : " white-card--horizontal");

      // 多卡片合并（仅在同一组内生效）
      if (card.mergeWithPrev && idx > 0) {
        div.dataset.mergeTop = "1";
        const prevDom = groupDiv.lastElementChild;
        if (prevDom) prevDom.dataset.mergeBottom = "1";
      }

      // 标题/主文案/副文案/图片（按需生成）
      const hasTitle = !!(card.title && card.title.trim());
      const hasMain = !!(card.main && card.main.trim());
      const hasSub  = !!(card.sub  && card.sub.trim());
      const hasImage = !!(card.image && card.image.trim());
      let bodyInner = "";
      if (hasTitle) bodyInner += `<div class="wc-title">${renderTitleNum(card.title)}</div>`;
      if (hasMain) bodyInner += `<div class="wc-main">${escapeHtml(card.main)}</div>`;
      if (hasSub)  bodyInner += `<div class="wc-sub">${highlightText(card.sub)}</div>`;
      if (hasImage) {
        bodyInner += `<div class="wc-image-wrap"><img class="wc-image" src="${escapeAttr(card.image)}" alt="" /></div>`;
      }

      // Logo 网格（仅 logo-grid 形态）
      if (isLogoGrid) {
        const logos = (card.logos || []).slice(0, 10);
        const logosHtml = logos.map(lg => {
          if (lg.src) {
            return `<div class="wc-lg-cell"><img src="${escapeAttr(lg.src)}" alt="${escapeAttr(lg.name || "")}" /><span class="wc-lg-name">${escapeHtml(lg.name || "")}</span></div>`;
          }
          return `<div class="wc-lg-cell"><div class="wc-lg-cell--placeholder" title="${escapeAttr(lg.name || "")}"></div><span class="wc-lg-name">${escapeHtml(lg.name || "")}</span></div>`;
        }).join("");
        bodyInner += `<div class="wc-logo-grid" data-count="${logos.length}">${logosHtml}</div>`;
      }

      let leftHtml = "";
      if (isPromoText) {
        leftHtml = `<div class="wc-promo-text">${escapeHtml(card.promoText || "")}</div>`;
      } else if (isIcon) {
        const src = card.iconSource || "preset";
        if (src === "upload-image" && card.uploadedImage) {
          leftHtml = `<div class="wc-icon wc-icon--uploaded-image"><img src="${escapeAttr(card.uploadedImage)}" alt="" /></div>`;
        } else if (src === "upload-icon" && card.uploadedIcon) {
          leftHtml = `<div class="wc-icon wc-icon--uploaded-icon"><img src="${escapeAttr(card.uploadedIcon)}" alt="" /></div>`;
        } else {
          leftHtml = `<div class="wc-icon" data-td-icon="${escapeAttr(card.icon || "")}"></div>`;
        }
      } else if (!isNoIcon && !isLogoGrid) {
        leftHtml = `<div class="wc-icon" data-td-icon="${escapeAttr(card.icon || "")}"></div>`;
      }
      div.innerHTML = `${leftHtml}<div class="wc-body">${bodyInner}</div>`;
      groupDiv.appendChild(div);
    });

    grid.appendChild(groupDiv);
  });
}

// 兼容旧调用：renderModules / 各类 render 中"刷新预览"的部分统一走 renderContentList
function renderModules() {
  renderContentList();
}

// 白底卡片可选图标列表（中文标签 + TDesign 图标名）
const WC_ICON_OPTIONS = [
  { label: "无图标",        value: "" },
  { label: "🔒 安全锁",    value: "secured" },
  { label: "💰 折扣",      value: "discount" },
  { label: "📱 手机",       value: "mobile" },
  { label: "💳 钱包/支付",   value: "wallet" },
  { label: "⚡ 闪电/快捷",  value: "flash" },
  { label: "✓ 对勾/完成",   value: "check" },
  { label: "★ 星标/收藏",   value: "star" },
  { label: "❤ 爱心/喜爱",   value: "heart" },
  { label: "🏠 首页",       value: "home" },
  { label: "👤 用户/账号",  value: "user" },
  { label: "⚙ 设置/齿轮",   value: "setting" },
  { label: "🔔 通知/铃铛",  value: "notification" },
  { label: "ℹ 信息/说明",   value: "info-circle" },
  { label: "📊 图表/统计",  value: "chart-bar" },
  { label: "🛡 盾牌/保护",   value: "shield" },
  { label: "🎁 礼品/礼物",   value: "gift" },
  { label: "🌐 地球/全球",   value: "globe" },
  { label: "🔍 搜索/放大镜", value: "search" },
];

// 渲染白底卡片：①预览交给 renderContentList（多实例统一）+ ②编辑器（操作台 ⑧ 区）
// 数据来源：state.whiteCards = [{ style, layout, columns, iconSource, icon, uploadedIcon, uploadedImage, title, main, sub, image, logos, promoText, mergeWithPrev }]
function renderWhiteCards() {
  // ===== 预览渲染（统一交给 renderContentList，遍历 modulesList 中所有 white-cards 实例）=====
  renderContentList();

  // ===== 编辑器渲染（⑧ 区）=====
  const editor = $("#whiteCardsEditor");
  if (!editor) return;

  // 标题输入框同步
  const titleInput = $("#ctrlWhiteCardsTitle");
  if (titleInput && titleInput.value !== (state.whiteCardsTitle || "")) {
    titleInput.value = state.whiteCardsTitle || "";
  }

  const optionsHtml = WC_ICON_OPTIONS.map(opt =>
    `<option value="${escapeAttr(opt.value)}">${opt.label}</option>`
  ).join("");

  editor.innerHTML = "";
  state.whiteCards.forEach((card, i) => {
    const style = card.style === "logo-grid" ? "logo-grid" : (card.style === "no-icon" ? "no-icon" : (card.style === "promo-text" ? "promo-text" : "icon"));
    const layout = card.layout === "vertical" ? "vertical" : "horizontal";
    const columns = card.columns || 1;
    const iconSource = card.iconSource || "preset";
    const item = document.createElement("div");
    item.className = "sub-item";

    // 头部
    let html = `
      <div style="display:flex;align-items:center;">
        <strong>卡片 ${i + 1}</strong>
        <button class="sub-del" data-del="${i}">删除</button>
      </div>`;

    // 列数 + 排版方向
    html += `
      <div class="sub-row">
        <label>列数</label>
        <select data-i="${i}" data-k="columns">
          <option value="1"${columns === 1 ? " selected" : ""}>单列</option>
          <option value="2"${columns === 2 ? " selected" : ""}>双列</option>
          <option value="3"${columns === 3 ? " selected" : ""}>三列</option>
        </select>
      </div>
      <div class="sub-row">
        <label>排版</label>
        <select data-i="${i}" data-k="layout">
          <option value="horizontal"${layout === "horizontal" ? " selected" : ""}>左右排版</option>
          <option value="vertical"${layout === "vertical" ? " selected" : ""}>上下排版</option>
        </select>
      </div>`;

    // 样式切换
    html += `
      <div class="sub-row">
        <label>样式</label>
        <select data-i="${i}" data-k="style">
          <option value="icon"${style === "icon" ? " selected" : ""}>图标</option>
          <option value="no-icon"${style === "no-icon" ? " selected" : ""}>纯文字</option>
          <option value="logo-grid"${style === "logo-grid" ? " selected" : ""}>Logo 网格</option>
          <option value="promo-text"${style === "promo-text" ? " selected" : ""}>文字优惠</option>
        </select>
      </div>`;

    // 非首卡显示"与上方卡合并"开关
    if (i > 0) {
      html += `
      <div class="sub-row">
        <label>合并</label>
        <label style="width:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dark-ui-88);">
          <input type="checkbox" data-i="${i}" data-k="mergeWithPrev" ${card.mergeWithPrev ? "checked" : ""} />
          与上方卡合并（去除中间圆角，视觉合并成大卡）
        </label>
      </div>`;
    }

    // 图标卡片：图标来源选择
    if (style === "icon") {
      html += `
      <div class="sub-row">
        <label>图标来源</label>
        <select data-i="${i}" data-k="iconSource">
          <option value="preset"${iconSource === "preset" ? " selected" : ""}>已有图标</option>
          <option value="upload-icon"${iconSource === "upload-icon" ? " selected" : ""}>上传图标</option>
          <option value="upload-image"${iconSource === "upload-image" ? " selected" : ""}>上传图片</option>
        </select>
      </div>`;
      if (iconSource === "preset") {
        html += `
      <div class="sub-row">
        <label>图标</label>
        <select data-i="${i}" data-k="icon">${optionsHtml}</select>
      </div>`;
      }
      if (iconSource === "upload-icon") {
        html += `
      <div class="sub-row">
        <label>上传图标</label>
        <input type="file" data-i="${i}" data-k="uploadIconFile" accept="image/*" />
        <button class="btn-mini" data-i="${i}" data-k="uploadIconClear" type="button" style="margin:0;">清除</button>
      </div>`;
      }
      if (iconSource === "upload-image") {
        html += `
      <div class="sub-row">
        <label>上传图片</label>
        <input type="file" data-i="${i}" data-k="uploadImageFile" accept="image/*" />
        <button class="btn-mini" data-i="${i}" data-k="uploadImageClear" type="button" style="margin:0;">清除</button>
      </div>`;
      }
    }

    // 文字优惠卡片显示优惠文字输入
    if (style === "promo-text") {
      html += `
      <div class="sub-row">
        <label>优惠文字</label>
        <input type="text" data-i="${i}" data-k="promoText" value="${escapeAttr(card.promoText || "")}" placeholder="如：2GB、¥10" />
      </div>`;
    }

    // 通用字段：小标题、主标题、副文案、图片
    html += `
      <div class="sub-row"><label>小标题</label><input type="text" data-i="${i}" data-k="title" value="${escapeAttr(card.title || "")}" placeholder="如：¥10元（留空则不显示）" /></div>
      <div class="sub-row"><label>主标题</label><input type="text" data-i="${i}" data-k="main" value="${escapeAttr(card.main || "")}" /></div>
      <div class="sub-row"><label>副文案</label><input type="text" data-i="${i}" data-k="sub" value="${escapeAttr(card.sub || "")}" /></div>
      <div class="sub-row"><label>图片</label><input type="file" data-i="${i}" data-k="imageFile" accept="image/*" /><button class="btn-mini" data-i="${i}" data-k="imageClear" type="button" style="margin:0;">清除</button></div>`;

    // logo-grid 模式：显示 Logo 子项编辑（可折叠）
    if (style === "logo-grid") {
      const logos = card.logos || [];
      const partnerFiles = (_manifest?.icons?.partner || []).filter(f => f.endsWith(".png"));
      const partnerOptionsHtml = partnerFiles.map(f => {
        const display = f.replace(/^图标_/, "").replace(/\.png$/, "");
        const src = `assets/icons/partner/${f}`;
        return `<option value="${escapeAttr(display + "|" + src)}">${escapeAttr(display)}</option>`;
      }).join("");
      const logosHtml = logos.map((lg, j) => `
        <div class="sub-logo-row">
          <select data-i="${i}" data-lg-j="${j}" data-lg-k="logoSelect">
            <option value="">-- 选择 Logo --</option>
            ${partnerOptionsHtml}
          </select>
          <input type="text" data-i="${i}" data-lg-j="${j}" data-lg-k="logoName" value="${escapeAttr(lg.name || "")}" placeholder="APP 名称" style="flex:1;min-width:0;" />
          <button class="sub-del-mini" data-del-lg="${i}-${j}" title="删除">×</button>
        </div>
      `).join("");
      const collapsed = card._logosCollapsed ? "collapsed" : "";
      html += `
        <div class="sub-row wc-logo-editor ${collapsed}" style="display:block;margin-top:8px;">
          <div class="wc-logo-editor-header" data-toggle-lg="${i}">
            <label style="width:auto;color:rgba(255,255,255,0.5);font-size:11px;">Logo 列表（${logos.length}/10，每行 5 个，最多 2 排）</label>
            <span class="collapse-arrow" style="color:var(--dark-ui-64);font-size:12px;">▼</span>
          </div>
          <div class="wc-logo-editor-body" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">${logosHtml}</div>
          <button class="btn-mini" data-add-lg="${i}" style="margin-top:6px;${logos.length >= 10 ? "opacity:0.4;pointer-events:none;" : ""}">+ 添加 Logo</button>
        </div>`;
    }

    item.innerHTML = html;

    // 同步下拉选中值
    if (style === "icon" && iconSource === "preset") {
      const sel = item.querySelector('select[data-k="icon"]');
      if (sel) sel.value = card.icon || "";
    }
    if (style === "logo-grid") {
      item.querySelectorAll('select[data-lg-k="logoSelect"]').forEach((sel, j) => {
        const lg = card.logos[j];
        sel.value = (lg && lg.src) ? `${lg.name}|${lg.src}` : "";
      });
    }
    editor.appendChild(item);
  });
}

// 兼容旧调用名（其它地方引用了 renderWcIconEditor）
const renderWcIconEditor = renderWhiteCards;

function renderInputBox() {
  renderContentList();
  const editor = $("#inputBoxEditor");
  if (!editor) return;
  const cfg = state.inputBox || {};
  const hasPh = cfg.hasPlaceholder !== false;
  const isWithIcon = (cfg.style || "") === "with-icon";
  editor.innerHTML = `
    <div class="ctrl-row">
      <label>标题</label>
      <input type="text" id="ctrlInputBoxTitle" value="${escapeAttr(cfg.title || "")}" placeholder="留空则不显示标题" />
    </div>
    <div class="ctrl-row">
      <label>占位符</label>
      <select id="ctrlInputBoxHasPlaceholder">
        <option value="true"${hasPh ? " selected" : ""}>未输入</option>
        <option value="false"${!hasPh ? " selected" : ""}>输入</option>
      </select>
    </div>
    ${hasPh ? `<div class="ctrl-row">
      <label>提示文字</label>
      <input type="text" id="ctrlInputBoxPlaceholderText" value="${escapeAttr(cfg.placeholderText || "")}" placeholder="请输入提示文字" />
    </div>` : ""}
    <div class="ctrl-row">
      <label>样式</label>
      <select id="ctrlInputBoxStyle">
        <option value="default"${(cfg.style || "default") === "default" ? " selected" : ""}>默认（纯输入框）</option>
        <option value="with-action"${(cfg.style || "") === "with-action" ? " selected" : ""}>带操作按钮（获取验证码）</option>
        <option value="with-icon"${isWithIcon ? " selected" : ""}>带 > 图标</option>
      </select>
    </div>
    ${isWithIcon ? `<div class="ctrl-row">
      <label>图标文案</label>
      <input type="text" id="ctrlInputBoxIconText" value="${escapeAttr(cfg.iconText || ">")}" placeholder="如：> 或 更多" />
    </div>` : ""}`;
}

// 仅刷新预览（输入时调用，避免编辑器 DOM 重建导致输入框失焦）
function renderTitleTextView() {
  // 多实例统一刷新
  renderContentList();
}

// 全量渲染：预览 + 编辑器（首次或结构变化时调用）
function renderTitleText() {
  renderTitleTextView();

  // ===== 编辑器 ④ =====
  const titleInput = $("#ctrlTitleTextTitle");
  if (titleInput && titleInput.value !== (state.titleText.title || "")) titleInput.value = state.titleText.title || "";
  const noteInput = $("#ctrlTitleTextNote");
  if (noteInput && noteInput.value !== (state.titleText.note || "")) noteInput.value = state.titleText.note || "";

  const editor = $("#iconStatsEditor");
  if (!editor) return;
  const optionsHtml = WC_ICON_OPTIONS.map(opt =>
    `<option value="${escapeAttr(opt.value)}">${opt.label}</option>`
  ).join("");
  editor.innerHTML = "";
  (state.titleText.iconStats || []).forEach((s, i) => {
    const item = document.createElement("div");
    item.className = "sub-item";
    item.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <strong>徽章 ${i + 1}</strong>
        <button class="sub-del" data-del-its="${i}">删除</button>
      </div>
      <div class="sub-row"><label>图标</label><select data-its-i="${i}" data-its-k="icon">${optionsHtml}</select></div>
      <div class="sub-row"><label>数字</label><input type="text" data-its-i="${i}" data-its-k="num" value="${escapeAttr(s.num || "")}" /></div>
      <div class="sub-row"><label>标签</label><input type="text" data-its-i="${i}" data-its-k="label" value="${escapeAttr(s.label || "")}" /></div>
    `;
    item.querySelector("select").value = s.icon || "";
    editor.appendChild(item);
  });

  // 添加徽章按钮（最多3个）
  const addBtn = document.createElement("button");
  addBtn.className = "btn-mini";
  addBtn.id = "addIconStat";
  addBtn.textContent = "+ 添加徽章";
  const count = (state.titleText.iconStats || []).length;
  if (count >= 3) {
    addBtn.disabled = true;
    addBtn.style.opacity = "0.4";
    addBtn.style.pointerEvents = "none";
  }
  editor.appendChild(addBtn);
}

function renderCoupons() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 同步优惠券标题输入框
  if ($("#ctrlCouponTitle")) $("#ctrlCouponTitle").value = state.couponTitle;

  // 同时刷新优惠券编辑器
  const editor = $("#couponEditor");
  editor.innerHTML = "";
  state.coupons.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "sub-item";
    item.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong>优惠券 ${i + 1}</strong>
        <button class="sub-del" data-del="${i}">删除</button>
      </div>
      <div class="sub-row"><label>金额</label><input type="text" data-i="${i}" data-k="amount" value="${escapeAttr(c.amount)}" /></div>
      <div class="sub-row"><label>名称</label><input type="text" data-i="${i}" data-k="name" value="${escapeAttr(c.name)}" /></div>
      <div class="sub-row"><label>条件</label><input type="text" data-i="${i}" data-k="cond" value="${escapeAttr(c.cond)}" /></div>
    `;
    editor.appendChild(item);
  });
}

function renderQA() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 编辑器
  const editor = $("#qaEditor");
  editor.innerHTML = "";
  state.qa.forEach((item, i) => {
    const wrap = document.createElement("div");
    wrap.className = "sub-item";
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong>QA ${i + 1}</strong>
        <button class="sub-del" data-del-qa="${i}">删除</button>
      </div>
      <div class="sub-row"><label>问题</label><textarea data-i="${i}" data-k="q" rows="2">${escapeHtml(item.q)}</textarea></div>
      <div class="sub-row"><label>回答</label><textarea data-i="${i}" data-k="a" rows="2">${escapeHtml(item.a)}</textarea></div>
    `;
    editor.appendChild(wrap);
  });
}

function buildQAItem(type, text) {
  const div = document.createElement("div");
  div.className = `qa-item qa-item--${type}`;
  // 不再设置内联 flex 兜底——交给 CSS 控制（align-self 推到对侧）
  // 根据业务类型决定是否显示背景框
  const isNoBg = type === "q" && (state.theme === "credit-card" || state.theme === "telecom");
  const avatarClass = `qa-avatar${isNoBg ? " qa-avatar--no-bg" : ""}`;
  const avatar = type === "q"
    ? `<div class="${avatarClass}">${qLogoSvg()}</div>`
    : `<div class="qa-avatar">A</div>`;
  div.innerHTML = `
    ${avatar}
    <div class="qa-bubble">
      ${escapeHtml(text)}
      ${qaTailSvg(type)}
    </div>
  `;
  return div;
}

function qLogoSvg() {
  // 根据当前业务主题选择 partner 图标
  const key = state.theme || "credit-card";
  const src = LOGO_PRESETS.qaPartnerMap[key] || LOGO_PRESETS.qaPartnerMap["credit-card"];
  
  // 信用卡和通讯业务：去掉背景框，图标尺寸56×56px，圆角8px
  if (key === "credit-card" || key === "telecom") {
    return `<img src="${src}" alt="Q-logo" class="qa-avatar__img--no-bg" style="width:56px;height:56px;object-fit:contain;border-radius:8px;">`;
  }
  
  // 其他业务类型：保持圆角矩形背景+图标
  return `<div class="qa-avatar__bg"><img src="${src}" alt="Q-logo" style="width:40px;height:40px;object-fit:contain;"></div>`;
}

function qaTailSvg(type) {
  // 等边三角形 高 16px，顶点带 2px 圆角，颜色等于气泡背景色
  const fill = type === "q" ? "#EAEAEA" : "#FFFFFF";
  // 等边三角形：高 16，对应底边宽 ≈ 18.5
  return `<svg class="qa-tail" viewBox="0 0 16 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0 L16 18 L2 10 Q0 9 2 8 Z" fill="${fill}"/>
  </svg>`;
}

function renderPhoneFlow() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 编辑器
  const n = state.phoneSteps;
  const editor = $("#phoneFlowEditor");
  editor.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const div = document.createElement("div");
    div.className = "sub-item";
    div.innerHTML = `
      <div class="sub-row">
        <label>步骤 ${i + 1}</label>
        <input type="text" data-phone-i="${i}" value="${escapeAttr(state.phoneStepLabels[i] || "")}" maxlength="${n === 1 ? 40 : 13}" />
      </div>
    `;
    editor.appendChild(div);
  }
}

/**
 * 构建手机界面卡片（对齐 credit-card-ops flow-phone 规范）
 * 单步结构：.phone-card > .phone-phone > .phone-screen > (.phone-img + .phone-caption)
 * 多步结构：.phone-card > .phone-step-tag + .phone-phone > .phone-screen > (.phone-img + .phone-caption)
 */
function buildPhoneCard(type, stepNum, info) {
  const div = document.createElement("div");
  div.className = "phone-card";

  // 角标（仅多步）
  const stepTag = stepNum ? `<div class="phone-step-tag">${stepNum}</div>` : "";

  // 手机壳 + 屏幕 + 内容
  div.innerHTML = `
    ${stepTag}
    <div class="phone-phone">
      <div class="phone-screen">
        <div class="phone-img">界面截图</div>
      </div>
    </div>
    <p class="phone-caption--${type}">${escapeHtml(info)}</p>
  `;
  return div;
}

function renderRules() {
  const ctrl = $("#ctrlShowRules");
  const showRules = ctrl ? ctrl.checked : true;
  const root = $("#h5Rules");

  // 如果开关关闭，隐藏规则区域并停止渲染
  if (!showRules) {
    root.style.display = "none";
    return;
  }
  root.style.display = "";

  const lines = state.rulesText.split(/\n/);
  // 保留标题
  root.innerHTML = `<h2 class="content-title">活动规则</h2><div class="rules-block" id="rulesBlock"></div>`;
  const block = $("#rulesBlock");

  let currentList = null;
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { currentList = null; return; }

    // 二级标题：以"一、二、三、..."开头
    if (/^[一二三四五六七八九十]+、/.test(line)) {
      const h = document.createElement("div");
      h.className = "rules-h2";
      h.textContent = line;
      block.appendChild(h);
      currentList = null;
      return;
    }

    // 编号项 1. / 1、 / 1)
    const numMatch = line.match(/^(\d+)[\.、\)]\s*(.+)$/);
    if (numMatch) {
      if (!currentList) {
        currentList = document.createElement("ol");
        currentList.className = "rules-ol";
        block.appendChild(currentList);
      }
      const li = document.createElement("li");
      li.textContent = numMatch[2];
      currentList.appendChild(li);
      return;
    }

    // 普通段落
    const p = document.createElement("p");
    p.className = "rules-p";
    p.textContent = line;
    block.appendChild(p);
    currentList = null;
  });
}

function renderFooter() {
  const footerEl = $("#h5Footer");
  if (!state.showFooter) {
    footerEl.style.display = "none";
    return;
  }
  footerEl.style.display = "";
  footerEl.dataset.form = state.footerForm;

  // 通用 footer-card 内容
  const fcName = $("#fcName");
  const fcPhone = $("#fcPhone");
  const fcCopy = $("#fcCopy");

  // A 机构信息卡：使用 footerName / footerPhone / footerCopy
  if (state.footerForm === "info") {
    if (fcName) fcName.textContent = state.footerName || "";
    if (fcPhone) fcPhone.textContent = state.footerPhone || "";
    if (fcCopy) fcCopy.textContent = state.footerCopy || "";
  }

  // B 推广跳转卡：使用 promoTitle / promoDesc
  if (state.footerForm === "promo") {
    if (fcName) fcName.textContent = state.promoTitle || "立即参与活动";
    if (fcPhone) fcPhone.textContent = state.promoDesc || "点击了解更多优惠详情";
    if (fcCopy) fcCopy.textContent = "";
  }

  // C 免责声明卡：使用 disclaimerTitle / disclaimerText
  if (state.footerForm === "disclaimer") {
    if (fcName) fcName.textContent = state.disclaimerTitle || "温馨提示";
    if (fcPhone) fcPhone.textContent = "";
    if (fcCopy) fcCopy.textContent = state.disclaimerText || "";
  }

  // D 图片卡：渲染上传的图片
  if (state.footerForm === "image") {
    const imgEl = $("#fcImageImg");
    const placeholder = $(".fc-image-placeholder");
    if (imgEl) {
      if (state.footerImageDataUrl) {
        imgEl.src = state.footerImageDataUrl;
        imgEl.hidden = false;
        if (placeholder) placeholder.style.display = "none";
      } else {
        imgEl.hidden = true;
        if (placeholder) placeholder.style.display = "";
      }
    }
  }

  // E 名片卡：渲染名片内容
  if (state.footerForm === "card") {
    // 右栏：二维码 + 角注
    const qrNoteEl = $("#cardQrNoteEl");
    if (qrNoteEl) qrNoteEl.textContent = state.cardQrNote || "";

    const cardQrBox = $("#cardQrBox");
    if (cardQrBox) {
      if (state.cardQrDataUrl) {
        cardQrBox.innerHTML = `<img src="${state.cardQrDataUrl}" alt="qr" />`;
        cardQrBox.dataset.hasImg = "1";
      } else {
        cardQrBox.innerHTML = `<span class="card-qr-placeholder">请上传<br>二维码</span>`;
        delete cardQrBox.dataset.hasImg;
      }
    }
    // 左栏：姓名 / 职位 / 电话 / 微信
    const nameEl = $("#cardNameEl");
    const titleEl = $("#cardTitleEl");
    const phoneEl = $("#cardPhoneEl");
    const wechatEl = $("#cardWechatEl");
    if (nameEl) nameEl.textContent = state.cardName || "";
    if (titleEl) titleEl.textContent = state.cardTitle || "";
    if (phoneEl) phoneEl.textContent = state.cardPhone || "";
    if (wechatEl) wechatEl.textContent = state.cardWechat || "";
  }

  // QR 形态：渲染客户经理名 + 二维码 + 平台 chips
  if (state.footerForm === "qr") {
    const titleEl = $("#qrBlockTitle");
    if (titleEl) titleEl.innerHTML = highlightText(state.qrTitle || "扫码联系 / 专属客户经理");

    const noteEls = document.querySelectorAll(".qr-block-note");
    noteEls.forEach(el => el.textContent = state.qrNote || "");

    const nameEl = $("#qrManagerNameSlot");
    if (nameEl) nameEl.textContent = state.qrManagerName || "客户经理";

    const qrBox = $("#qrBox");
    if (qrBox) {
      if (state.qrCodeDataUrl) {
        qrBox.innerHTML = `<img src="${state.qrCodeDataUrl}" alt="qr" />`;
        qrBox.dataset.hasImg = "1";
      } else {
        qrBox.innerHTML = `<span class="qr-placeholder">请上传<br>二维码</span>`;
        delete qrBox.dataset.hasImg;
      }
    }

    const chips = $("#platformLogos");
    if (chips) {
      chips.innerHTML = state.platforms
        .map(p => `<span class="platform-chip">${escapeHtml(p)}</span>`)
        .join("");
    }
  }
}

// ============================================================
// 工具
// ============================================================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) { return escapeHtml(s); }
// 标题数字/英文放大渲染：将连续的数字、货币符号、英文单词用 span 包裹为 64px
// 例外：数字/货币后紧跟中文（如"¥10元"）时不放大，保持与普通文字同字号
function renderTitleNum(text) {
  if (!text) return "";
  const parts = String(text).split(/([¥$€£\d.,%]+|[A-Za-z]+)/);
  return parts.map((part, i, arr) => {
    if (/^[¥$€£\d.,%]+$/.test(part) || /^[A-Za-z]+$/.test(part)) {
      // 检查下一个 part 是否以中文开头（紧跟中文时不放大）
      const next = arr[i + 1] || "";
      if (/^[\u4e00-\u9fff]/.test(next)) {
        return escapeHtml(part);
      }
      return `<span class="wc-title-num">${escapeHtml(part)}</span>`;
    }
    return escapeHtml(part);
  }).join("");
}

function highlightText(s) {
  // 处理顺序：先 / → <br/>，再 [...] → <span>，否则 </span> 中的 / 会被误匹配换行
  // 1. 转义 HTML
  // 2. /  → 换行（用户手动控制）
  // 3. [xxx] → 高亮（品牌色）
  return escapeHtml(s)
    .replace(/\s*\/\s*/g, '<br/>')
    .replace(/\[([^\]]+)\]/g, '<span class="hl">$1</span>');
}

// ============================================================
// 事件绑定
// ============================================================
function bindFileUpload(inputId, clearId, stateKey, onSuccess, onClear) {
  const input = $(`#${inputId}`);
  const clear = $(`#${clearId}`);
  if (!input) return;
  input.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.header[stateKey] = ev.target.result;
      if (typeof onSuccess === "function") onSuccess();
      renderHeader();
    };
    reader.readAsDataURL(file);
  });
  if (clear) {
    clear.addEventListener("click", () => {
      state.header[stateKey] = null;
      input.value = "";
      if (typeof onClear === "function") onClear();
      renderHeader();
    });
  }
}

function bindEvents() {
  // 主题
  $("#themeSelect").value = state.theme;
  $("#themeSelect").addEventListener("change", e => {
    state.theme = e.target.value;
    // 切主题时重置渐变主色为"跟随主题"
    state.gradientColor = "auto";
    // 若品牌色为跟随主题，同步更新预览色块
    if (state.bankColor === "auto") {
      updateBankColorUI();
    }
    renderCanvas();
    renderLogo(); // 主题变 → logo 跟随
  });

  $("#bgSelect").value = state.bg;
  $("#bgSelect").addEventListener("change", e => {
    state.bg = e.target.value;
    renderCanvas();
    renderLogo(); // 底色变 → logo 反白判断变
  });

  // 渐变主色色块
  const gradientSwatches = $("#gradientSwatches");
  if (gradientSwatches) {
    gradientSwatches.addEventListener("click", e => {
      const btn = e.target.closest(".gs-item");
      if (!btn) return;
      const gc = btn.dataset.gc;
      state.gradientColor = gc;
      // 手动选色时，银行选择器切换到"自定义"，并同步自定义色值
      state.bankColor = "custom";
      state.bankCustomColor = gc;
      const bankSel = $("#bankColorSelect");
      if (bankSel) bankSel.value = "custom";
      updateBankColorUI();
      renderCanvas();
      renderLogo(); // 渐变色变 → logo 反白判断变
    });
  }

  // 银行高亮色选择器 + 自定义色值输入 + 拾色器（三控件在一排）
  const bankSel = $("#bankColorSelect");
  const bankCustomInput = $("#bankCustomColorInput");
  const bankCustomPicker = $("#bankCustomColorPicker");
  function updateBankColorUI() {
    const bankKey = state.bankColor;
    const themeBrand = {
      telecom: "#11C16E",
      "cross-border": "#1A6BFF",
      "credit-card": "#11C16E"
    }[state.theme] || "#1A6BFF";

    if (bankKey === "auto") {
      bankCustomInput.value = "AUTO";
      bankCustomInput.readOnly = true;
      bankCustomPicker.value = themeBrand;
    } else if (bankKey === "custom") {
      const hex = state.bankCustomColor || "#007AFF";
      bankCustomInput.value = hex;
      bankCustomInput.readOnly = false;
      bankCustomPicker.value = hex;
    } else {
      const bankInfo = BANK_COLORS[bankKey];
      const hex = bankInfo ? bankInfo.color : themeBrand;
      bankCustomInput.value = hex;
      bankCustomInput.readOnly = true;
      bankCustomPicker.value = hex;
    }
  }

  if (bankSel) {
    bankSel.value = state.bankColor || "auto";
    bankSel.addEventListener("change", e => {
      state.bankColor = e.target.value;
      if (e.target.value === "auto") {
        state.gradientColor = "auto";
      } else if (e.target.value === "custom") {
        // 自定义：用 bankCustomColor 或保持当前
        if (state.bankCustomColor) state.gradientColor = state.bankCustomColor;
      } else {
        const bankInfo = BANK_COLORS[e.target.value];
        if (bankInfo && bankInfo.color) state.gradientColor = bankInfo.color;
      }
      updateBankColorUI();
      renderCanvas();
      renderLogo();
    });
  }
  // 自定义银行颜色输入（拾色器：文本 + color picker 双向同步）
  function isValidHex(hex) {
    return /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex);
  }
  function normalizeHex(hex) {
    if (!hex) return "";
    hex = hex.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    // 3位转6位
    if (/^#([0-9A-Fa-f]{3})$/.test(hex)) {
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex.toUpperCase();
  }
  function applyCustomColor(hex) {
    const normalized = normalizeHex(hex);
    state.bankCustomColor = normalized;
    if (state.bankColor === "custom" && isValidHex(normalized)) {
      state.gradientColor = normalized;
      renderCanvas();
      renderLogo();
    }
    // 同步各控件值
    if (bankCustomInput && bankCustomInput.value !== normalized) bankCustomInput.value = normalized;
    if (bankCustomPicker && bankCustomPicker.value !== normalized) bankCustomPicker.value = normalized;
  }

  if (bankCustomInput) {
    bankCustomInput.value = state.bankCustomColor || "";
    bankCustomInput.addEventListener("input", e => {
      let val = e.target.value;
      // 实时输入时只做基本补#，不强制大写（失焦后再格式化）
      if (val && !val.startsWith("#")) val = "#" + val;
      state.bankCustomColor = val;
      if (bankCustomPicker && isValidHex(val)) bankCustomPicker.value = normalizeHex(val);
      if (state.bankColor === "custom" && isValidHex(val)) {
        state.gradientColor = normalizeHex(val);
        renderCanvas();
        renderLogo();
      }
    });
    bankCustomInput.addEventListener("blur", e => {
      applyCustomColor(e.target.value);
    });
  }

  if (bankCustomPicker) {
    bankCustomPicker.value = state.bankCustomColor || "#007AFF";
    bankCustomPicker.addEventListener("input", e => {
      applyCustomColor(e.target.value);
    });
  }

  // 初始化 UI
  updateBankColorUI();

  // QA 样式切换
  const qaStyleSel = $("#qaStyleSelect");
  if (qaStyleSel) {
    qaStyleSel.value = state.qaStyle || "qa-chat";
    qaStyleSel.addEventListener("change", e => {
      state.qaStyle = e.target.value;
      renderQA();
    });
  }

  // Header
  $("#headerForm").value = state.header.form;
  $("#headerForm").addEventListener("change", e => {
    state.header.form = e.target.value;
    applyHeaderBgConstraint();
    renderCanvas();
    renderHeader();
  });
  $("#ctrlTitle").value = state.header.title;
  $("#ctrlTitle").addEventListener("input", e => { state.header.title = e.target.value; renderHeader(); });
  $("#ctrlSub").value = state.header.sub;
  $("#ctrlSub").addEventListener("input", e => { state.header.sub = e.target.value; renderHeader(); });
  $("#ctrlShowTag").checked = state.header.showTag;
  $("#ctrlShowTag").addEventListener("change", e => { state.header.showTag = e.target.checked; renderHeader(); });
  $("#ctrlTag").value = state.header.tag;
  $("#ctrlTag").addEventListener("input", e => { state.header.tag = e.target.value; renderHeader(); });
  // 反色复选框：Tag / 文字 / logo
  const invertTag = $("#ctrlInvertTag");
  const invertText = $("#ctrlInvertText");
  const invertLogo = $("#ctrlInvertLogo");
  if (invertTag) {
    invertTag.checked = !!(state.header.invert && state.header.invert.tag);
    invertTag.addEventListener("change", e => {
      if (!state.header.invert) state.header.invert = {};
      state.header.invert.tag = e.target.checked;
      renderHeader();
    });
  }
  if (invertText) {
    invertText.checked = !!(state.header.invert && state.header.invert.text);
    invertText.addEventListener("change", e => {
      if (!state.header.invert) state.header.invert = {};
      state.header.invert.text = e.target.checked;
      renderHeader();
    });
  }
  if (invertLogo) {
    invertLogo.checked = !!(state.header.invert && state.header.invert.logo);
    invertLogo.addEventListener("change", e => {
      if (!state.header.invert) state.header.invert = {};
      state.header.invert.logo = e.target.checked;
      renderHeader();
    });
  }
  $("#ctrlHeaderAlign").value = state.header.align;
  $("#ctrlHeaderAlign").addEventListener("change", e => { state.header.align = e.target.value; renderHeader(); });

  // 图片上传：Banner / 插图 / 手机号图
  bindFileUpload("ctrlBannerFile", "ctrlBannerClear", "bannerDataUrl");
  bindFileUpload("ctrlIlluFile",   "ctrlIlluClear",   "illuDataUrl");
  bindFileUpload("ctrlPhoneFile", "ctrlPhoneClear", "phoneDataUrl",
    () => { state.header.phonePlaceholder = false; },  // onSuccess：上传成功后取消占位
    () => { state.header.phonePlaceholder = false; }   // onClear：清除后取消占位
  );
  // 手机号图：占位按钮
  const phonePlaceholderBtn = $("#ctrlPhonePlaceholder");
  if (phonePlaceholderBtn) {
    phonePlaceholderBtn.addEventListener("click", () => {
      state.header.phoneDataUrl = "";
      state.header.phonePlaceholder = true;
      renderHeader();
    });
  }

  // Logo 选择（下拉 + 自定义上传）
  const logoSelect = $("#ctrlLogoSelect");
  const logoCustomRow = $("#ctrlLogoCustomRow");
  logoSelect.value = state.header.logoMode;
  logoCustomRow.style.display = state.header.logoMode === "custom" ? "" : "none";
  logoSelect.addEventListener("change", e => {
    state.header.logoMode = e.target.value;
    logoCustomRow.style.display = e.target.value === "custom" ? "" : "none";
    renderLogo();
  });
  $("#ctrlLogoFile").addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.header.logoCustomDataUrl = ev.target.result;
      renderLogo();
    };
    reader.readAsDataURL(file);
  });
  $("#ctrlLogoClear").addEventListener("click", () => {
    state.header.logoCustomDataUrl = null;
    $("#ctrlLogoFile").value = "";
    renderLogo();
  });

  // Logo 样式（单 / 联合 X / 品牌背书 ｜）
  const logoLayoutSel = $("#ctrlLogoLayout");
  const logo2Row = $("#ctrlLogo2Row");
  const logo2Sel = $("#ctrlLogo2Select");
  const logoLabel = $("#ctrlLogoLabel");

  const logoSelectRow = $("#ctrlLogoSelectRow");
  function applyLogoLayoutUI() {
    const layout = state.header.logoLayout || "single";
    logoLayoutSel.value = layout;
    const isNone = layout === "none";
    const isPair = !isNone && layout !== "single";
    if (logoSelectRow) logoSelectRow.style.display = isNone ? "none" : "";
    logo2Row.style.display = isPair ? "" : "none";
    // 联合/背书时把"Logo 图"改称"主 Logo"提示用户
    if (logoLabel) logoLabel.textContent = isPair ? "主 Logo" : "Logo 图";
  }
  applyLogoLayoutUI();

  logoLayoutSel.addEventListener("change", e => {
    state.header.logoLayout = e.target.value;
    applyLogoLayoutUI();
    renderLogo();
  });
  if (logo2Sel) {
    if (state.header.logoSecond) logo2Sel.value = state.header.logoSecond;
    logo2Sel.addEventListener("change", e => {
      state.header.logoSecond = e.target.value;
      renderLogo();
    });
  }

  // ===========================================================
  // ③ Content 模块编排：拖拽排序 + 显隐 + 添加/删除（多实例共享 state）
  // ===========================================================
  // 模块类型 → 对应操作面板 fieldset 选择器
  const MOD_TO_PANEL = {
    "title-text":  "#ctrlTitleTextFieldset", // ④ 标题 + 文案
    "coupon":      "#ctrlCouponFieldset",     // ⑤ 优惠券
    "qa":          "#ctrlQAFieldset",         // ⑥ QA 问答
    "phone-flow":  "#ctrlPhoneFlowFieldset",  // ⑦ 手机界面流程
    "white-cards": "#ctrlWhiteCardsFieldset", // ⑧ 白底卡片
    "input":       "#ctrlInputBoxFieldset",   // ⑧ 输入框
    "button":      "#ctrlButtonFieldset",     // ⑨ 按钮
  };

  // 同步操作面板 fieldset 显隐：
  // 只要 modulesList 中存在该 type 的可见实例（visible=true），就显示对应 fieldset；否则隐藏
  function syncAllControlPanels() {
    Object.keys(MOD_TO_PANEL).forEach(type => {
      const el = $(MOD_TO_PANEL[type]);
      if (!el) return;
      const exists = state.modulesList.some(m => m.type === type && m.visible);
      el.style.display = exists ? "" : "none";
    });
  }

  // 同步操作面板 fieldset 顺序：按 modulesList 中可见模块的顺序排列 ④~⑧
  function syncControlPanelOrder() {
    const container = $(".control-scroll");
    const mod3 = $("#contentModulesArea")?.closest("fieldset");
    if (!container || !mod3) return;

    // 按 modulesList 顺序收集首次出现的可见类型
    const seen = new Set();
    const orderedTypes = [];
    state.modulesList.forEach(m => {
      if (m.visible && !seen.has(m.type) && MOD_TO_PANEL[m.type]) {
        seen.add(m.type);
        orderedTypes.push(m.type);
      }
    });

    let ref = mod3;
    orderedTypes.forEach(type => {
      const el = $(MOD_TO_PANEL[type]);
      if (el && el.parentElement === container) {
        ref.after(el);
        ref = el;
      }
    });
  }

  function uidGen(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8);
  }

  // 渲染 ③ 操作面板的模块编排列表
  function renderModuleList() {
    const list = $("#moduleList");
    if (!list) return;
    list.innerHTML = "";
    state.modulesList.forEach((inst, idx) => {
      const li = document.createElement("li");
      li.className = "module-item";
      li.draggable = true;
      li.dataset.id = inst.id;
      li.dataset.idx = String(idx);
      li.innerHTML = `
        <span class="mi-drag" title="拖拽排序">⋮⋮</span>
        <span class="mi-index">${idx + 1}</span>
        <span class="mi-name">${MODULE_TYPE_LABELS[inst.type] || inst.type}</span>
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dark-ui-64);">
          <input type="checkbox" class="mi-vis" ${inst.visible ? "checked" : ""} />
          显示
        </label>
        <button class="mi-del" title="删除" data-del-id="${inst.id}">×</button>
      `;
      list.appendChild(li);
    });
    bindModuleListDnD();
  }

  // 拖拽排序（HTML5 drag/drop）
  function bindModuleListDnD() {
    const list = $("#moduleList");
    if (!list) return;
    let draggingEl = null;

    list.querySelectorAll(".module-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        draggingEl = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", item.dataset.id); } catch (_) {}
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        list.querySelectorAll(".module-item").forEach(el => {
          el.classList.remove("drop-before", "drop-after");
        });
        draggingEl = null;
      });
      item.addEventListener("dragover", e => {
        e.preventDefault();
        if (!draggingEl || draggingEl === item) return;
        const rect = item.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;
        item.classList.toggle("drop-before", !isAfter);
        item.classList.toggle("drop-after",  isAfter);
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("drop-before", "drop-after");
      });
      item.addEventListener("drop", e => {
        e.preventDefault();
        if (!draggingEl || draggingEl === item) return;
        const fromId = draggingEl.dataset.id;
        const toId   = item.dataset.id;
        const rect = item.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;
        const fromIdx = state.modulesList.findIndex(m => m.id === fromId);
        let   toIdx   = state.modulesList.findIndex(m => m.id === toId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = state.modulesList.splice(fromIdx, 1);
        // 重算 toIdx：删除 fromIdx 后，若 toIdx > fromIdx 需要 -1
        if (toIdx > fromIdx) toIdx -= 1;
        const insertIdx = isAfter ? toIdx + 1 : toIdx;
        state.modulesList.splice(insertIdx, 0, moved);
        renderModuleList();
        renderContentList();
        syncControlPanelOrder();
      });
    });
  }

  // 初始化 ③：渲染列表 + 同步操作面板
  renderModuleList();
  syncAllControlPanels();

  // 显隐勾选
  $("#moduleList")?.addEventListener("change", e => {
    if (!e.target.classList.contains("mi-vis")) return;
    const li = e.target.closest(".module-item");
    if (!li) return;
    const inst = state.modulesList.find(m => m.id === li.dataset.id);
    if (!inst) return;
    inst.visible = e.target.checked;
    renderContentList();
    syncAllControlPanels();
    syncControlPanelOrder();
  });

  // 删除按钮
  $("#moduleList")?.addEventListener("click", e => {
    const btn = e.target.closest(".mi-del");
    if (!btn) return;
    const id = btn.dataset.delId;
    const idx = state.modulesList.findIndex(m => m.id === id);
    if (idx === -1) return;
    state.modulesList.splice(idx, 1);
    renderModuleList();
    renderContentList();
    syncAllControlPanels();
    syncControlPanelOrder();
  });

  // 添加模块按钮
  $("#moduleAddBtn")?.addEventListener("click", () => {
    const sel = $("#moduleAddType");
    if (!sel) return;
    const type = sel.value;
    state.modulesList.push({ id: uidGen("m"), type, visible: true });
    renderModuleList();
    renderContentList();
    syncAllControlPanels();
    syncControlPanelOrder();
  });

  // 标题 + 文案编辑器（④ 区）：渲染 + 双向绑定
  renderTitleText();
  $("#ctrlTitleTextTitle")?.addEventListener("input", e => {
    state.titleText.title = e.target.value;
    renderTitleTextView();
  });
  $("#ctrlTitleTextNote")?.addEventListener("input", e => {
    state.titleText.note = e.target.value;
    renderTitleTextView();
  });
  const iconStatsEditorEl = $("#iconStatsEditor");
  if (iconStatsEditorEl) {
    iconStatsEditorEl.addEventListener("input", e => {
      const i = e.target.dataset.itsI, k = e.target.dataset.itsK;
      if (i != null && k && k !== "icon") {
        state.titleText.iconStats[+i][k] = e.target.value;
        renderTitleTextView();
      }
    });
    iconStatsEditorEl.addEventListener("change", e => {
      const i = e.target.dataset.itsI, k = e.target.dataset.itsK;
      if (i != null && k === "icon") {
        state.titleText.iconStats[+i].icon = e.target.value;
        renderTitleTextView();
      }
    });
    iconStatsEditorEl.addEventListener("click", e => {
      // 删除徽章
      const delIdx = e.target.dataset.delIts;
      if (delIdx != null) {
        state.titleText.iconStats.splice(+delIdx, 1);
        renderTitleText();
        return;
      }
      // 添加徽章
      if (e.target.id === "addIconStat") {
        if (state.titleText.iconStats.length >= 3) { alert("最多 3 个徽章"); return; }
        state.titleText.iconStats.push({ icon: "", num: "", label: "" });
        renderTitleText();
      }
    });
  }

  // 白底卡片编辑器（⑧ 区）：渲染 + 双向绑定 + 添加/删除 + Logo 网格子项
  renderWhiteCards();

  // 白底卡片标题输入框事件绑定
  const wcTitleInput = $("#ctrlWhiteCardsTitle");
  if (wcTitleInput) {
    wcTitleInput.addEventListener("input", e => {
      state.whiteCardsTitle = e.target.value;
      renderContentList();
    });
  }

  const whiteCardsEditorEl = $("#whiteCardsEditor");
  if (whiteCardsEditorEl) {
    // input：主标题 / 副文案 / Logo 名称 / Logo URL
    whiteCardsEditorEl.addEventListener("input", e => {
      // Logo 子项输入（名称编辑）
      const lgJ = e.target.dataset.lgJ;
      const lgK = e.target.dataset.lgK;
      if (lgJ != null && lgK) {
        if (lgK === "logoSelect") return; // 在 change 中统一处理
        const i = +e.target.dataset.i;
        const card = state.whiteCards[i];
        if (!card.logos) card.logos = [];
        if (!card.logos[+lgJ]) card.logos[+lgJ] = { name: "", src: "" };
        card.logos[+lgJ][lgK] = e.target.value;
        renderContentList();
        return;
      }
      // 普通字段（main/sub/promoText/title）
      const i = e.target.dataset.i, k = e.target.dataset.k;
      if (i != null && k && !["icon", "style", "mergeWithPrev", "columns", "layout", "iconSource"].includes(k)) {
        state.whiteCards[+i][k] = e.target.value;
        renderContentList();
      }
    });
    // change：下拉选择 / 合并勾选 / 文件上传
    whiteCardsEditorEl.addEventListener("change", e => {
      // Logo 下拉选择
      const lgJ = e.target.dataset.lgJ;
      const lgK = e.target.dataset.lgK;
      if (lgJ != null && lgK === "logoSelect") {
        const i = +e.target.dataset.i;
        const card = state.whiteCards[i];
        if (!card.logos) card.logos = [];
        if (!card.logos[+lgJ]) card.logos[+lgJ] = { name: "", src: "" };
        const val = e.target.value;
        if (val) {
          const [name, src] = val.split("|");
          card.logos[+lgJ] = { name, src };
        } else {
          card.logos[+lgJ] = { name: "", src: "" };
        }
        renderContentList();
        renderWhiteCards();
        return;
      }

      const i = e.target.dataset.i, k = e.target.dataset.k;
      if (i == null) return;

      if (k === "columns") {
        state.whiteCards[+i].columns = +e.target.value;
        renderContentList();
      } else if (k === "layout") {
        state.whiteCards[+i].layout = e.target.value;
        renderContentList();
      } else if (k === "icon") {
        state.whiteCards[+i].icon = e.target.value;
        renderContentList();
      } else if (k === "iconSource") {
        state.whiteCards[+i].iconSource = e.target.value;
        renderWhiteCards(); // 全量重渲染（编辑器结构变化）
      } else if (k === "style") {
        state.whiteCards[+i].style = e.target.value;
        if (e.target.value === "logo-grid" && !state.whiteCards[+i].logos) {
          state.whiteCards[+i].logos = [];
        }
        renderWhiteCards(); // 全量重渲染（编辑器结构变化）
      } else if (k === "mergeWithPrev") {
        state.whiteCards[+i].mergeWithPrev = e.target.checked;
        renderContentList();
      } else if (k === "imageFile") {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            state.whiteCards[+i].image = ev.target.result;
            renderContentList();
          };
          reader.readAsDataURL(file);
        }
      } else if (k === "uploadIconFile") {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            state.whiteCards[+i].uploadedIcon = ev.target.result;
            renderContentList();
            renderWhiteCards();
          };
          reader.readAsDataURL(file);
        }
      } else if (k === "uploadImageFile") {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            state.whiteCards[+i].uploadedImage = ev.target.result;
            renderContentList();
            renderWhiteCards();
          };
          reader.readAsDataURL(file);
        }
      }
    });
    // click：删除卡片 / 删除 Logo / 添加 Logo / 清除图片 / 清除上传图标 / 清除上传图片 / Logo列表折叠
    whiteCardsEditorEl.addEventListener("click", e => {
      // Logo 列表折叠/展开
      const toggleLg = e.target.closest("[data-toggle-lg]");
      if (toggleLg) {
        const i = +toggleLg.dataset.toggleLg;
        const card = state.whiteCards[i];
        card._logosCollapsed = !card._logosCollapsed;
        renderWhiteCards();
        return;
      }
      // 添加 Logo
      const addLg = e.target.dataset.addLg;
      if (addLg != null) {
        const i = +addLg;
        const card = state.whiteCards[i];
        if (!card.logos) card.logos = [];
        if (card.logos.length >= 10) { alert("最多 10 个 Logo（每行 5 个 × 2 排）"); return; }
        card.logos.push({ name: "", src: "" });
        renderWhiteCards();
        return;
      }
      // 删除 Logo
      const delLg = e.target.dataset.delLg;
      if (delLg != null) {
        const [i, j] = delLg.split("-").map(Number);
        state.whiteCards[i].logos.splice(j, 1);
        renderWhiteCards();
        return;
      }
      // 删除卡片
      const idx = e.target.dataset.del;
      if (idx != null) {
        state.whiteCards.splice(+idx, 1);
        renderWhiteCards();
        return;
      }
      // 清除图片
      const clearImg = e.target.dataset.k;
      if (clearImg === "imageClear") {
        const i = +e.target.dataset.i;
        state.whiteCards[i].image = "";
        renderContentList();
        renderWhiteCards();
        return;
      }
      // 清除上传图标
      if (clearImg === "uploadIconClear") {
        const i = +e.target.dataset.i;
        state.whiteCards[i].uploadedIcon = "";
        renderContentList();
        renderWhiteCards();
        return;
      }
      // 清除上传图片
      if (clearImg === "uploadImageClear") {
        const i = +e.target.dataset.i;
        state.whiteCards[i].uploadedImage = "";
        renderContentList();
        renderWhiteCards();
        return;
      }
    });
  }
  $("#addWhiteCard")?.addEventListener("click", () => {
    state.whiteCards.push({ style: "no-icon", layout: "horizontal", columns: 1, iconSource: "preset", icon: "", title: "", main: "新卡片", sub: "副文案描述", image: "", logos: [] });
    renderWhiteCards();
  });

  // 输入框编辑
  renderInputBox();
  const inputBoxEditorEl = $("#inputBoxEditor");
  if (inputBoxEditorEl) {
    inputBoxEditorEl.addEventListener("input", e => {
      if (e.target.id === "ctrlInputBoxTitle") {
        state.inputBox.title = e.target.value;
        renderContentList();
      }
      if (e.target.id === "ctrlInputBoxPlaceholderText") {
        state.inputBox.placeholderText = e.target.value;
        renderContentList();
      }
      if (e.target.id === "ctrlInputBoxIconText") {
        state.inputBox.iconText = e.target.value;
        renderContentList();
      }
    });
    inputBoxEditorEl.addEventListener("change", e => {
      if (e.target.id === "ctrlInputBoxStyle") {
        state.inputBox.style = e.target.value;
        renderInputBox();
        renderContentList();
      }
      if (e.target.id === "ctrlInputBoxHasPlaceholder") {
        state.inputBox.hasPlaceholder = e.target.value === "true";
        renderInputBox();
        renderContentList();
      }
    });
  }

  // 按钮编辑（⑨ 区）
  if ($("#ctrlButtonText")) {
    $("#ctrlButtonText").value = state.buttonText;
    $("#ctrlButtonText").addEventListener("input", e => {
      state.buttonText = e.target.value;
      renderContentList();
    });
  }
  if ($("#ctrlButtonLinkText")) {
    $("#ctrlButtonLinkText").value = state.buttonLinkText;
    $("#ctrlButtonLinkText").addEventListener("input", e => {
      state.buttonLinkText = e.target.value;
      renderContentList();
    });
  }

  // 优惠券标题编辑
  if ($("#ctrlCouponTitle")) {
    $("#ctrlCouponTitle").value = state.couponTitle;
    $("#ctrlCouponTitle").addEventListener("input", e => {
      state.couponTitle = e.target.value;
      renderContentList();
    });
  }

  // 优惠券编辑
  $("#couponEditor").addEventListener("input", e => {
    const i = e.target.dataset.i, k = e.target.dataset.k;
    if (i != null && k) {
      state.coupons[+i][k] = e.target.value;
      renderCouponsView();
    }
  });
  $("#couponEditor").addEventListener("click", e => {
    const idx = e.target.dataset.del;
    if (idx != null) {
      state.coupons.splice(+idx, 1);
      renderCoupons();
    }
  });
  $("#addCoupon").addEventListener("click", () => {
    if (state.coupons.length >= 4) { alert("最多 4 个优惠券"); return; }
    state.coupons.push({ amount: "¥10", name: "立减券", cond: "新条件" });
    renderCoupons();
  });

  // QA 编辑
  $("#qaEditor").addEventListener("input", e => {
    const i = e.target.dataset.i, k = e.target.dataset.k;
    if (i != null && k) {
      state.qa[+i][k] = e.target.value;
      renderQA();
    }
  });
  $("#qaEditor").addEventListener("click", e => {
    const idx = e.target.dataset.delQa;
    if (idx != null) {
      state.qa.splice(+idx, 1);
      renderQA();
    }
  });
  $("#addQA").addEventListener("click", () => {
    if (state.qa.length >= 4) { alert("最多 4 组 QA"); return; }
    state.qa.push({ q: "新问题？", a: "新回答内容。" });
    renderQA();
  });

  // 手机流程
  $("#phoneSteps").value = state.phoneSteps;
  $("#phoneSteps").addEventListener("change", e => {
    state.phoneSteps = +e.target.value;
    renderPhoneFlow();
  });
  $("#phoneFlowEditor").addEventListener("input", e => {
    const i = e.target.dataset.phoneI;
    if (i != null) {
      state.phoneStepLabels[+i] = e.target.value;
      renderPhoneFlow();
    }
  });

  // Footer
  $("#footerForm").value = state.footerForm;
  $("#footerForm").addEventListener("change", e => {
    state.footerForm = e.target.value;
    syncFooterFormRows();
    renderFooter();
  });

  // 形态 A: 机构信息卡 输入框绑定
  if ($("#ctrlFooterName")) {
    $("#ctrlFooterName").value = state.footerName;
    $("#ctrlFooterName").addEventListener("input", e => {
      state.footerName = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlFooterPhone")) {
    $("#ctrlFooterPhone").value = state.footerPhone;
    $("#ctrlFooterPhone").addEventListener("input", e => {
      state.footerPhone = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlFooterCopy")) {
    $("#ctrlFooterCopy").value = state.footerCopy;
    $("#ctrlFooterCopy").addEventListener("input", e => {
      state.footerCopy = e.target.value;
      renderFooter();
    });
  }

  // 形态 B: 推广跳转卡 输入框绑定
  if ($("#ctrlPromoTitle")) {
    $("#ctrlPromoTitle").value = state.promoTitle;
    $("#ctrlPromoTitle").addEventListener("input", e => {
      state.promoTitle = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlPromoDesc")) {
    $("#ctrlPromoDesc").value = state.promoDesc;
    $("#ctrlPromoDesc").addEventListener("input", e => {
      state.promoDesc = e.target.value;
      renderFooter();
    });
  }

  // 形态 C: 免责声明卡 输入框绑定
  if ($("#ctrlDisclaimerTitle")) {
    $("#ctrlDisclaimerTitle").value = state.disclaimerTitle;
    $("#ctrlDisclaimerTitle").addEventListener("input", e => {
      state.disclaimerTitle = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlDisclaimerText")) {
    $("#ctrlDisclaimerText").value = state.disclaimerText;
    $("#ctrlDisclaimerText").addEventListener("input", e => {
      state.disclaimerText = e.target.value;
      renderFooter();
    });
  }

  // 形态 D: 图片卡 输入框绑定
  if ($("#ctrlFooterImageFile")) {
    $("#ctrlFooterImageFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.footerImageDataUrl = ev.target.result;
        renderFooter();
      };
      reader.readAsDataURL(file);
    });
  }
  if ($("#ctrlFooterImageClear")) {
    $("#ctrlFooterImageClear").addEventListener("click", () => {
      state.footerImageDataUrl = null;
      $("#ctrlFooterImageFile").value = "";
      renderFooter();
    });
  }
  if ($("#ctrlFooterImageCaption")) {
    $("#ctrlFooterImageCaption").value = state.footerImageCaption;
    $("#ctrlFooterImageCaption").addEventListener("input", e => {
      state.footerImageCaption = e.target.value;
      renderFooter();
    });
  }

  // 形态 E: 名片卡 输入框绑定
  // 二维码上传
  if ($("#ctrlCardQrFile")) {
    $("#ctrlCardQrFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.cardQrDataUrl = ev.target.result;
        renderFooter();
      };
      reader.readAsDataURL(file);
    });
  }
  if ($("#ctrlCardQrClear")) {
    $("#ctrlCardQrClear").addEventListener("click", () => {
      state.cardQrDataUrl = null;
      $("#ctrlCardQrFile").value = "";
      renderFooter();
    });
  }
  if ($("#ctrlCardName")) {
    $("#ctrlCardName").value = state.cardName;
    $("#ctrlCardName").addEventListener("input", e => {
      state.cardName = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlCardTitle")) {
    $("#ctrlCardTitle").value = state.cardTitle;
    $("#ctrlCardTitle").addEventListener("input", e => {
      state.cardTitle = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlCardPhone")) {
    $("#ctrlCardPhone").value = state.cardPhone;
    $("#ctrlCardPhone").addEventListener("input", e => {
      state.cardPhone = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlCardWechat")) {
    $("#ctrlCardWechat").value = state.cardWechat;
    $("#ctrlCardWechat").addEventListener("input", e => {
      state.cardWechat = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlCardQrNote")) {
    $("#ctrlCardQrNote").value = state.cardQrNote;
    $("#ctrlCardQrNote").addEventListener("input", e => {
      state.cardQrNote = e.target.value;
      renderFooter();
    });
  }

  // 根据 Footer 形态切换显示/隐藏对应的输入框行
  function syncFooterFormRows() {
    const form = state.footerForm;
    const allRows = {
      info:        ["#ctrlFooterNameRow", "#ctrlFooterPhoneRow", "#ctrlFooterCopyRow"],
      promo:       ["#ctrlPromoTitleRow", "#ctrlPromoDescRow"],
      disclaimer:  ["#ctrlDisclaimerTitleRow", "#ctrlDisclaimerTextRow"],
      image:       ["#ctrlFooterImageRow", "#ctrlFooterImageCaptionRow"],
      card:        ["#ctrlCardNameRow", "#ctrlCardTitleRow", "#ctrlCardPhoneRow", "#ctrlCardWechatRow", "#ctrlCardQrRow", "#ctrlCardQrNoteRow"],
      qr:          ["#ctrlQrRow", "#ctrlQrTitleRow", "#ctrlQrNameRow", "#ctrlQrNoteRow", "#ctrlPlatformsRow"],
    };
    Object.entries(allRows).forEach(([key, rows]) => {
      rows.forEach(sel => {
        const el = $(sel);
        if (el) el.style.display = form === key ? "" : "none";
      });
    });
  }
  syncFooterFormRows(); // 初始同步

  // ---- 区域显示/隐藏联动开关 ----
  // Footer 底部卡片
  const ctrlShowFooter = $("#ctrlShowFooter");
  if (ctrlShowFooter) {
    ctrlShowFooter.checked = !!state.showFooter;
    const syncFooter = () => {
      state.showFooter = ctrlShowFooter.checked;
      $("#footerFormArea").style.display = state.showFooter ? "" : "none";
      renderFooter();
    };
    ctrlShowFooter.addEventListener("change", syncFooter);
    if (!state.showFooter) syncFooter();
  }

  // contentModulesArea 默认始终显示，无需总开关控制
  // #h5Content 默认始终显示（通过各模块的 visible 控制）
  syncAllControlPanels();
  syncControlPanelOrder();

  // 活动规则
  const ctrlShowRules = $("#ctrlShowRules");
  if (ctrlShowRules) {
    // 初始化：根据 rulesText 是否有内容设置开关默认状态
    const hasRules = state.rulesText && state.rulesText.trim().length > 0;
    ctrlShowRules.checked = hasRules;
    $("#rulesArea").style.display = hasRules ? "" : "none";
    const h5Rules = $("#h5Rules");
    if (h5Rules) h5Rules.style.display = hasRules ? "" : "none";

    ctrlShowRules.addEventListener("change", () => {
      $("#rulesArea").style.display = ctrlShowRules.checked ? "" : "none";
      const rulesEl = $("#h5Rules");
      if (rulesEl) rulesEl.style.display = ctrlShowRules.checked ? "" : "none";
    });
  }

  // QR 二维码上传
  if ($("#ctrlQrFile")) {
    $("#ctrlQrFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.qrCodeDataUrl = ev.target.result;
        renderFooter();
      };
      reader.readAsDataURL(file);
    });
  }
  if ($("#ctrlQrClear")) {
    $("#ctrlQrClear").addEventListener("click", () => {
      state.qrCodeDataUrl = null;
      $("#ctrlQrFile").value = "";
      renderFooter();
    });
  }
  if ($("#ctrlQrTitle")) {
    $("#ctrlQrTitle").value = state.qrTitle;
    $("#ctrlQrTitle").addEventListener("input", e => {
      state.qrTitle = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlQrName")) {
    $("#ctrlQrName").value = state.qrManagerName;
    $("#ctrlQrName").addEventListener("input", e => {
      state.qrManagerName = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlQrNote")) {
    $("#ctrlQrNote").value = state.qrNote;
    $("#ctrlQrNote").addEventListener("input", e => {
      state.qrNote = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlPlatforms")) {
    $("#ctrlPlatforms").value = state.platforms.join(", ");
    $("#ctrlPlatforms").addEventListener("input", e => {
      state.platforms = e.target.value.split(/[,，、]\s*/).filter(Boolean);
      renderFooter();
    });
  }

  // 规则
  $("#rulesText").addEventListener("input", e => {
    state.rulesText = e.target.value;
    const hasContent = state.rulesText.trim().length > 0;
    const ctrl = $("#ctrlShowRules");
    if (ctrl) {
      // 内容从空变有：自动开启开关；从有变空：自动关闭开关
      if (hasContent !== ctrl.checked) {
        ctrl.checked = hasContent;
        $("#rulesArea").style.display = hasContent ? "" : "none";
      }
    }
    renderRules();
  });

  // 折叠/展开 fieldset：点击箭头 或 点击 legend 空白区域
  document.querySelectorAll(".ctrl-group > legend").forEach(legend => {
    const fs = legend.closest(".ctrl-group");
    const arrow = legend.querySelector(".collapse-arrow");

    // 点击箭头
    if (arrow) {
      arrow.addEventListener("click", e => {
        e.stopPropagation();
        const collapsed = fs.dataset.collapsed === "true";
        fs.dataset.collapsed = String(!collapsed);
      });
    }

    // 点击 legend 标题行（排除内部交互元素）
    legend.addEventListener("click", e => {
      if (e.target.closest("select, input, a, button, label, .collapse-arrow")) return;
      const collapsed = fs.dataset.collapsed === "true";
      fs.dataset.collapsed = String(!collapsed);
    });
  });

  // 导出
  $("#btnExport").addEventListener("click", exportPNG);
}

// 仅刷新优惠券预览（不刷编辑器，避免输入失焦）
function renderCouponsView() {
  const grid = $("#couponGrid");
  grid.innerHTML = "";
  state.coupons.slice(0, 4).forEach(c => {
    const card = document.createElement("div");
    card.className = "coupon";
    card.innerHTML = `
      <div class="coupon-amount">${escapeHtml(c.amount)}</div>
      <div class="coupon-name">${escapeHtml(c.name)}</div>
      <div class="coupon-cond">${escapeHtml(c.cond)}</div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// 导出 PNG
// ============================================================
async function exportPNG() {
  const btn = $("#btnExport");
  const status = $("#exportStatus");
  const scale = +$("#exportScale").value;

  btn.disabled = true;
  status.textContent = `正在生成 ${scale}× 截图，请稍候...`;

  // 等待字体加载完成，避免导出时字体未渲染导致模糊
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // 临时取消缩放，让 html2canvas 拍到原尺寸
  const canvas = $("#h5Canvas");
  const wrap = canvas.parentElement; // .h5-canvas-wrap
  const originalTransform = canvas.style.transform;
  const originalMargin = canvas.style.marginBottom;
  const originalWrapW = wrap.style.width;
  const originalWrapH = wrap.style.height;
  canvas.style.transform = "none";
  canvas.style.marginBottom = "0";
  wrap.style.width = "750px";
  wrap.style.height = "auto";

  // 等待一帧，确保样式已应用
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    const result = await html2canvas(canvas, {
      scale: scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      width: 750,
      windowWidth: 750,
      letterRendering: true,        // 改善文字渲染，避免模糊
      logging: false,               // 关闭控制台日志
      removeContainer: true,         // 导出后清理临时 DOM
      onclone: (clonedDoc) => {
        // 字体抗锯齿增强
        const clonedCanvas = clonedDoc.getElementById("h5Canvas");
        if (clonedCanvas) {
          clonedCanvas.style.webkitFontSmoothing = "antialiased";
          clonedCanvas.style.textRendering = "geometricPrecision";
          clonedCanvas.style.fontSmooth = "always";
        }
      },
    });

    // 使用 toBlob 替代 toDataURL，减少内存占用
    result.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `H5预览_${state.theme}_${scale}x_${ts}.png`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url); // 释放内存

      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      status.textContent = `✓ 导出完成（${scale}× ${result.width}×${result.height}px，${sizeMB}MB）`;

      // 导出完成后恢复画布样式
      canvas.style.transform = originalTransform;
      canvas.style.marginBottom = originalMargin;
      wrap.style.width = originalWrapW;
      wrap.style.height = originalWrapH;
      syncCanvasWrapHeight();
      btn.disabled = false;
    }, "image/png");

  } catch (err) {
    console.error(err);
    status.textContent = "✗ 导出失败：" + err.message;
    // 出错时也恢复画布样式
    canvas.style.transform = originalTransform;
    canvas.style.marginBottom = originalMargin;
    wrap.style.width = originalWrapW;
    wrap.style.height = originalWrapH;
    syncCanvasWrapHeight();
    btn.disabled = false;
  }
}

// ============================================================
// 初始化
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[H5预览] DOMContentLoaded，开始初始化");
  try {
    // 先加载资产清单 → 填充 logo 下拉
    const manifest = await loadManifest();
    populateLogoSelect(manifest);
    bindEvents();
    console.log("[H5预览] 事件绑定完成");
    render();
    console.log("[H5预览] 初次渲染完成");
  } catch (err) {
    console.error("[H5预览] 初始化失败：", err);
    alert("初始化失败：" + err.message);
  }
});
