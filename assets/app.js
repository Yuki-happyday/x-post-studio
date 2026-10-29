/* =========================================================
   X Post Studio
   纯前端 · 本地渲染 · 无任何数据上传
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 图标 ---------------- */
  const I_REPLY = '<svg width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.5 8.4 8.4 0 0 1 9 8.5z"/></svg>';
  const I_RT = '<svg width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1.2l3.9 3.9L17 9"/><path d="M3 10.6V9a3.9 3.9 0 0 1 3.9-3.9h13"/><path d="M7 22.8l-3.9-3.9L7 15"/><path d="M21 13.4V15a3.9 3.9 0 0 1-3.9 3.9h-13"/></svg>';
  const I_HEART = '<svg width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  const I_VIEW = '<svg width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 20v-9"/><path d="M10 20V4"/><path d="M15.5 20v-6"/><path d="M21 20v-3.5"/></svg>';
  const I_BADGE = '<svg width="18.75" height="18.75" viewBox="0 0 24 24" aria-label="认证账号"><path fill="#1d9bf0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/><path fill="#fff" d="M10.2 15.6l-3.3-3.3 1.15-1.15 2.15 2.15 4.75-4.75 1.15 1.15z"/></svg>';

  /* ---------------- 工具 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /**
   * 把正文里的 @用户名、#话题、链接标成 X 的蓝色。
   * 顺序：先 esc 再打标，所以不会引入注入风险——匹配到的内容本身已经转义。
   */
  function linkify(raw) {
    let s = esc(raw);

    // 链接优先，避免里面的字符被后面的规则切碎
    s = s.replace(/(https?:\/\/[^\s<>]+)/g, '<span class="x-lnk">$1</span>');

    // @用户名：前面不能紧贴字母数字，免得把邮箱 a@b.com 里的部分误标
    s = s.replace(
      /(^|[^A-Za-z0-9_&;])@([A-Za-z0-9_]{1,20})/g,
      '$1<span class="x-lnk">@$2</span>'
    );

    // #话题：到空格或中英文标点为止
    s = s.replace(
      /(^|[^A-Za-z0-9_&;])#([^\s#@<，。！？、；：,.!?;:）)】"'&]{1,40})/g,
      '$1<span class="x-lnk">#$2</span>'
    );

    return s;
  }

  const PALETTE = ['#e0838c', '#7fa8d4', '#9a8cd0', '#6fbda3', '#d19a63', '#c180a8', '#6f9dc4', '#b3a86a'];
  function hashColor(name) {
    let n = 0;
    const s = String(name || 'x');
    for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 9973;
    return PALETTE[n % PALETTE.length];
  }

  function trimZero(s) { return String(s).replace(/\.0+$/, ''); }

  /** 纯数字自动换算成 X 的中文计数写法；含单位或非数字则原样保留 */
  function fmtNum(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return '';
    if (!/^\d+$/.test(s)) return s;
    const n = Number(s);
    if (!isFinite(n)) return s;
    if (n < 10000) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (n < 100000000) {
      const w = n / 10000;
      return trimZero(w >= 100 ? w.toFixed(0) : w.toFixed(1)) + '万';
    }
    return trimZero((n / 100000000).toFixed(1)) + '亿';
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('err', !!isErr);
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
  }

  /* ---------------- 状态 ---------------- */
  const DEMO_COMMENTS = [
    {
      id: 'c1', name: '阿 May', handle: 'amay_builds', verified: false, avatar: '',
      text: '「先找到一个反复发生的动作，再看能不能把它做快一点」——这句太扎心了。我们团队去年一直在做「我能做什么」。',
      time: '2小时', likes: '326', reposts: '12', replies: '8'
    },
    {
      id: 'c2', name: '产品小队长', handle: 'pm_captain', verified: true, avatar: '',
      text: '补一个反例：工具类最适合这套逻辑，内容类反而完全相反。内容的价值在「看到」的那一秒就兑现完了，不需要被做快。',
      time: '1小时', likes: '1180', reposts: '64', replies: '23'
    },
    {
      id: 'c3', name: '不吃香菜的 K', handle: 'no_cilantro_k', verified: false, avatar: '',
      text: '所以「整理收藏夹」注定做不成，因为那个动作一年才发生一次。',
      time: '38分钟', likes: '87', reposts: '', replies: '3'
    }
  ];

  const DEFAULTS = {
    name: '硅谷王川',
    handle: 'wangchuan',
    verified: true,
    avatar: '',
    text: '大多数人做产品的顺序是错的：\n\n先想「我能做什么」，再找「谁需要」。\n\n正确的顺序是反过来——先找到一个具体的、反复发生的、有人愿意付钱的动作，再看自己能不能把它做快一点。\n\n工具从来不是目的，省下来的那点时间才是。',
    time: '下午3:24',
    date: '2026年10月29日',
    showMeta: true,
    replies: '1208',
    reposts: '3412',
    likes: '28000',
    views: '124000',
    theme: 'light',
    width: 600,
    showComments: true,
    comments: DEMO_COMMENTS,
    media: [],
    // 引用转发：在主帖正文下方嵌套一张带边框的帖子卡片
    quote: {
      enabled: false,
      name: '',
      handle: '',
      verified: false,
      avatar: '',
      text: '',
      time: ''
    }
  };

  const clone = v => JSON.parse(JSON.stringify(v));

  const SAVE_KEY = 'x-post-studio-v1';
  const model = clone(DEFAULTS);

  (function restore() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      Object.keys(DEFAULTS).forEach(k => {
        if (saved[k] !== undefined && saved[k] !== null) model[k] = saved[k];
      });
    } catch (e) { /* 忽略损坏的草稿 */ }
  })();

  /** 补齐字段，容忍老草稿与手改过的数据 */
  function normalizeComments() {
    if (!Array.isArray(model.comments)) model.comments = clone(DEMO_COMMENTS);
    if (!Array.isArray(model.media)) model.media = [];
    model.comments = model.comments
      .filter(c => c && typeof c === 'object')
      .map((c, i) => ({
        id: c.id ? String(c.id) : 'c' + i + '_' + Date.now().toString(36),
        name: c.name == null ? '' : String(c.name),
        handle: c.handle == null ? '' : String(c.handle).replace(/^@+/, ''),
        verified: !!c.verified,
        avatar: typeof c.avatar === 'string' ? c.avatar : '',
        text: c.text == null ? '' : String(c.text),
        time: c.time == null ? '' : String(c.time),
        likes: c.likes == null ? '' : String(c.likes),
        reposts: c.reposts == null ? '' : String(c.reposts),
        replies: c.replies == null ? '' : String(c.replies)
      }));
  }
  normalizeComments();

  /** 引用转发同样要能容忍缺字段的老草稿 */
  function normalizeQuote() {
    const q = (model.quote && typeof model.quote === 'object') ? model.quote : {};
    model.quote = {
      enabled: !!q.enabled,
      name: q.name == null ? '' : String(q.name),
      handle: q.handle == null ? '' : String(q.handle).replace(/^@+/, ''),
      verified: !!q.verified,
      avatar: typeof q.avatar === 'string' ? q.avatar : '',
      text: q.text == null ? '' : String(q.text),
      time: q.time == null ? '' : String(q.time)
    };
  }
  normalizeQuote();

  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // 配图体积大，不写草稿；否则几张图就会撑爆 localStorage 配额
      const slim = Object.assign({}, model, { media: [] });
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
      } catch (e) {
        // 仍然超限：再丢头像，保住文字内容
        const lean = Object.assign({}, slim, { avatar: '' });
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(lean)); } catch (e2) {}
      }
    }, 320);
  }

  /* ---------------- 渲染 ---------------- */
  const postEl = $('#post');

  /**
   * 头像统一在 DOM 上赋值，不参与 innerHTML 拼接。
   * 原因：data URL 里的双引号会提前终止 style 属性，导致整段被浏览器丢弃。
   */
  function applyAvatar() {
    const box = postEl.querySelector('.p-avatar');
    const prev = $('#avatarPreview');
    const name = (model.name || '').trim();
    if (!box) return;

    if (model.avatar) {
      box.textContent = '';
      box.style.background = '';
      // 复用同一节点，避免每次输入都重建 img（会闪白）
      let img = box.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.decoding = 'sync';
        img.onload = measureStage;
        box.appendChild(img);
      }
      if (img.getAttribute('src') !== model.avatar) img.src = model.avatar;

      prev.style.backgroundColor = 'transparent';
      prev.style.backgroundImage = 'url("' + model.avatar + '")';
      prev.textContent = '';
    } else {
      const old = box.querySelector('img');
      if (old) old.remove();
      box.style.background = hashColor(name);
      box.textContent = name.charAt(0) || '?';

      prev.style.backgroundImage = 'none';
      prev.style.backgroundColor = hashColor(name);
      prev.textContent = name.charAt(0) || '?';
    }
  }

  function measureStage() {
    requestAnimationFrame(() => {
      const w = postEl.offsetWidth, h = postEl.offsetHeight;
      const sc = Number($('#scaleSel').value) || 3;
      $('#stageSize').textContent = w + ' × ' + h + '  →  导出 ' + (w * sc) + ' × ' + (h * sc);
    });
  }

  /* ---------------- 评论区：卡片渲染 ---------------- */
  function actsHtml(o) {
    return [
      { icon: I_REPLY, val: fmtNum(o.replies) },
      { icon: I_RT, val: fmtNum(o.reposts) },
      { icon: I_HEART, val: fmtNum(o.likes) },
      { icon: I_VIEW, val: '' }
    ].map(a =>
      '<div class="p-act' + (a.val ? '' : ' empty') + '">' + a.icon +
      (a.val ? '<span>' + esc(a.val) + '</span>' : '') + '</div>'
    ).join('');
  }

  function commentsHtml() {
    if (!model.showComments || !model.comments.length) return '';
    const items = model.comments.map(c => {
      const head = [
        '<span class="c-name">' + esc(c.name || '匿名用户') + '</span>',
        c.verified ? '<span class="p-badge">' + I_BADGE + '</span>' : '',
        '<span class="c-handle">@' + esc(c.handle || 'user') + '</span>',
        c.time ? '<span class="c-dot">·</span><span class="c-time">' + esc(c.time) + '</span>' : ''
      ].join('');

      return '<div class="c-item">' +
        '<div class="c-avatar" data-caid="' + esc(c.id) + '"></div>' +
        '<div class="c-main">' +
          '<div class="c-head">' + head + '</div>' +
          (c.text ? '<div class="c-text">' + linkify(c.text) + '</div>' : '') +
          '<div class="c-acts">' + actsHtml(c) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="p-comments">' + items + '</div>';
  }

  /** 评论头像同样只在 DOM 上赋值，避免 data URL 破坏属性解析 */
  function applyCommentAvatars() {
    $$('.c-avatar', postEl).forEach(box => {
      const c = model.comments.find(x => x.id === box.dataset.caid);
      if (!c) return;
      if (c.avatar) {
        let img = box.querySelector('img');
        if (!img) {
          box.textContent = '';
          img = document.createElement('img');
          img.alt = '';
          img.decoding = 'sync';
          img.onload = measureStage;
          box.appendChild(img);
        }
        if (img.getAttribute('src') !== c.avatar) img.src = c.avatar;
        box.style.background = '';
      } else {
        const old = box.querySelector('img');
        if (old) old.remove();
        box.style.background = hashColor(c.name);
        box.textContent = (c.name || '').trim().charAt(0) || '?';
      }
    });
  }

  /* ---------------- 引用转发：卡片渲染 ---------------- */
  function quoteHtml() {
    const q = model.quote;
    if (!q || !q.enabled) return '';

    const head = [
      q.name ? '<span class="q-name">' + esc(q.name) + '</span>' : '',
      q.verified ? '<span class="q-badge">' + I_BADGE + '</span>' : '',
      q.handle ? '<span class="q-handle">@' + esc(q.handle) + '</span>' : '',
      q.time ? '<span class="q-dot">·</span><span class="q-time">' + esc(q.time) + '</span>' : ''
    ].join('');

    const hasHead = head.length > 0;

    return '<div class="p-quote">' +
      (hasHead
        ? '<div class="q-head">' +
            '<div class="q-avatar"></div>' +
            '<div class="q-headline">' + head + '</div>' +
          '</div>'
        : '') +
      (q.text ? '<div class="q-text">' + linkify(q.text) + '</div>' : '') +
      (!hasHead && !q.text ? '<div class="q-empty">在左侧填写被引用帖子的内容</div>' : '') +
    '</div>';
  }

  /** 引用帖头像同样只在 DOM 上赋值 */
  function applyQuoteAvatar() {
    const box = postEl.querySelector('.q-avatar');
    if (!box) return;
    const q = model.quote;
    if (q.avatar) {
      let img = box.querySelector('img');
      if (!img) {
        box.textContent = '';
        img = document.createElement('img');
        img.alt = '';
        img.decoding = 'sync';
        img.onload = measureStage;
        box.appendChild(img);
      }
      if (img.getAttribute('src') !== q.avatar) img.src = q.avatar;
      box.style.background = '';
    } else {
      const old = box.querySelector('img');
      if (old) old.remove();
      box.style.background = hashColor(q.name || '');
      box.textContent = (q.name || '').trim().charAt(0) || '?';
    }
  }

  function render() {
    const headBits = [
      '<span class="p-name">' + esc(model.name || '显示名称') + '</span>',
      model.verified ? '<span class="p-badge">' + I_BADGE + '</span>' : '',
      '<span class="p-handle">@' + esc(model.handle || 'username') + '</span>'
    ].join('');

    const metaBits = [];
    if (model.showMeta) {
      if (model.time) metaBits.push(esc(model.time));
      if (model.date) metaBits.push(esc(model.date));
    }
    if (model.views) metaBits.push('<b>' + esc(fmtNum(model.views)) + '</b> 查看');
    const meta = metaBits.length ? '<div class="p-meta">' + metaBits.join(' · ') + '</div>' : '';

    const acts = actsHtml(model);

    postEl.dataset.theme = model.theme;
    postEl.style.width = model.width + 'px';
    document.querySelector('.card-shadow').classList.toggle('is-dark', model.theme !== 'light');

    // 卡片头像 + 编辑器里的预览，统一走 DOM 赋值
    postEl.innerHTML =
      '<div class="p-row">' +
        '<div class="p-avatar"></div>' +
        '<div class="p-main">' +
          '<div class="p-head">' + headBits + '</div>' +
          '<div class="p-text">' + linkify(model.text) + '</div>' +
          mediaHtml() +
          quoteHtml() +
          meta +
          '<div class="p-actions">' + acts + '</div>' +
        '</div>' +
      '</div>' +
      commentsHtml();

    applyAvatar();
    applyMediaImages();
    applyCommentAvatars();
    applyQuoteAvatar();

    $('#charCount').textContent = String((model.text || '').length);
    $('#widthVal').textContent = String(model.width);

    measureStage();

    persist();
  }

  /* ---------------- 表单绑定 ---------------- */
  function syncInputsFromModel() {
    $$('[data-model]').forEach(el => {
      const k = el.dataset.model;
      if (el.type === 'checkbox') el.checked = !!model[k];
      else el.value = model[k] == null ? '' : model[k];
    });
    $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.theme === model.theme));
    $('#widthRange').value = model.width;
  }

  function bindInputs() {
    $$('[data-model]').forEach(el => {
      const k = el.dataset.model;
      const evt = (el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(evt, () => {
        model[k] = (el.type === 'checkbox') ? el.checked : el.value;
        if (k === 'handle') model[k] = String(model[k]).replace(/^@+/, '');
        render();
        if (k === 'handle') {
          const pos = el.selectionStart;
          if (el.value !== model[k]) el.value = model[k];
          if (pos != null) el.setSelectionRange(pos, pos);
        }
      });
    });

    $('#themeSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-theme]');
      if (!b) return;
      model.theme = b.dataset.theme;
      $$('#themeSeg button').forEach(x => x.classList.toggle('on', x === b));
      render();
    });

    $('#widthRange').addEventListener('input', e => {
      model.width = Number(e.target.value);
      render();
    });

    $('#scaleSel').addEventListener('change', render);
  }

  /* ---------------- 头像 ---------------- */
  function setAvatar(dataUrl) {
    model.avatar = dataUrl;
    $('#avatarClear').hidden = !dataUrl;
    render();
  }

  /** 居中裁成方图并压到 320px，避免原图 base64 撑爆 localStorage，也能修掉超大图卡顿 */
  /** 居中等比裁成正方形，压到 320px。返回体积很小的 data URL */
  function squareDataUrl(img) {
    const OUT = 320;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) throw new Error('empty');
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) / 2;

    const cv = document.createElement('canvas');
    cv.width = cv.height = OUT;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, OUT, OUT);
    if (g.imageSmoothingQuality) g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);

    let out = cv.toDataURL('image/webp', 0.92);
    if (out.indexOf('data:image/webp') !== 0) out = cv.toDataURL('image/jpeg', 0.9);
    return out;
  }

  function normalizeImage(file) {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        try { resolve(squareDataUrl(img)); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('decode')); };
      img.src = blobUrl;
    });
  }

  /** 老草稿里可能存着几 MB 的原图 base64，启动时顺手压一遍 */
  function shrinkStoredAvatar() {
    const url = model.avatar;
    if (!url || url.length < 120000) return;
    const img = new Image();
    img.onload = () => {
      try {
        const small = squareDataUrl(img);
        if (small && small.length < url.length) {
          model.avatar = small;
          render();
        }
      } catch (e) {}
    };
    img.src = url;
  }

  async function readImageFile(file) {
    if (!file) return;
    if (file.type && file.type.indexOf('image/') !== 0) {
      toast('请选择图片文件', true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('图片超过 20MB，请先压缩再上传', true);
      return;
    }
    try {
      setAvatar(await normalizeImage(file));
      toast('头像已更新');
    } catch (e) {
      toast('这张图浏览器读不了（iPhone 的 HEIC 常见），先另存为 JPG 或截图后再上传', true);
    }
  }

  /* ---------------- 配图：编辑器 ---------------- */
  const I_XS = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';

  /** 保持原比例，长边压到 1600px，兼顾 3× 导出的清晰度和内存占用 */
  function mediaDataUrl(img) {
    const MAX = 1600;
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale = Math.min(1, MAX / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    if (g.imageSmoothingQuality) g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);

    let out = cv.toDataURL('image/webp', 0.9);
    if (out.indexOf('data:image/webp') !== 0) out = cv.toDataURL('image/jpeg', 0.88);
    return out;
  }

  function loadMediaFile(file) {
    return new Promise(resolve => {
      if (!file || (file.type && file.type.indexOf('image/') !== 0)) return resolve(null);
      if (file.size > 30 * 1024 * 1024) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try { resolve(mediaDataUrl(img)); } catch (e) { resolve(null); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  async function readMediaFiles(files) {
    if (!files || !files.length) return;
    const room = 4 - model.media.length;
    if (room <= 0) { toast('最多 4 张图片', true); return; }

    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast('只取前 ' + room + ' 张，最多 4 张', true);

    const urls = await Promise.all(picked.map(loadMediaFile));
    const ok = urls.filter(Boolean);
    if (!ok.length) {
      toast('这些图片读不了，先另存为 JPG 或截图后再传', true);
      return;
    }
    model.media.push.apply(model.media, ok);
    renderMediaEditor();
    render();
    if (ok.length < picked.length) toast('有 ' + (picked.length - ok.length) + ' 张读取失败', true);
  }

  function renderMediaEditor() {
    const grid = $('#mediaGrid');
    grid.innerHTML = model.media.map((_, i) =>
      '<div class="media-cell">' +
        '<img alt="">' +
        '<span class="media-idx">' + (i + 1) + '</span>' +
        '<button type="button" class="media-del" data-mdel="' + i + '" title="移除这张">' + I_XS + '</button>' +
      '</div>'
    ).join('');
    // data URL 通过属性赋值，不参与 innerHTML 解析
    $$('.media-cell img', grid).forEach((img, i) => { img.src = model.media[i]; });
    $('#btnAddMedia').style.display = model.media.length >= 4 ? 'none' : '';
  }

  function bindMedia() {
    const grid = $('#mediaGrid');
    const file = $('#mediaFile');

    grid.addEventListener('click', e => {
      const del = e.target.closest('[data-mdel]');
      if (!del) return;
      model.media.splice(Number(del.dataset.mdel), 1);
      renderMediaEditor();
      render();
    });

    $('#btnAddMedia').addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      readMediaFiles(file.files);
      file.value = '';
    });
  }

  function bindAvatar() {
    const pick = $('#avatarPick');
    const file = $('#avatarFile');

    pick.addEventListener('click', () => file.click());
    pick.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
    });
    file.addEventListener('change', () => {
      if (file.files && file.files[0]) readImageFile(file.files[0]);
      file.value = '';
    });

    ['dragenter', 'dragover'].forEach(t => pick.addEventListener(t, e => {
      e.preventDefault(); pick.style.borderColor = '#1d9bf0';
    }));
    ['dragleave', 'dragend'].forEach(t => pick.addEventListener(t, e => {
      e.preventDefault(); pick.style.borderColor = '';
    }));
    pick.addEventListener('drop', e => {
      e.preventDefault();
      pick.style.borderColor = '';
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readImageFile(f);
    });

    $('#avatarClear').addEventListener('click', e => {
      e.stopPropagation();
      setAvatar('');
    });

    // 直接粘贴图片
    document.addEventListener('paste', e => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.indexOf('image/') === 0) {
          const f = it.getAsFile();
          if (f) { readImageFile(f); e.preventDefault(); }
          return;
        }
      }
    });
  }

  /* ---------------- 配图：卡片渲染 ---------------- */
  function mediaHtml() {
    const n = model.media.length;
    if (!n) return '';
    if (n === 1) return '<div class="p-media one"></div>';
    return '<div class="p-media multi m' + Math.min(n, 4) + '"></div>';
  }

  function applyMediaImages() {
    const box = postEl.querySelector('.p-media');
    if (!box) return;
    model.media.forEach((src, i) => {
      let img = box.children[i];
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.decoding = 'sync';
        img.onload = measureStage;
        box.appendChild(img);
      }
      if (img.getAttribute('src') !== src) img.src = src;
    });
    while (box.children.length > model.media.length) box.lastElementChild.remove();
  }

  /* ---------------- 评论区：编辑器 ---------------- */
  const openIds = new Set();
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const findComment = id => model.comments.find(x => x.id === id);

  const I_DEL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
  const I_CHEV = '<svg class="cmt-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  function commentField(label, key, c, ph) {
    return '<label class="field"><span>' + label + '</span>' +
      '<input type="text" data-cf="' + key + '" value="' + esc(c[key]) + '" placeholder="' + esc(ph || '') + '"></label>';
  }

  function commentEditorHtml(c) {
    return '<div class="cmt-item' + (openIds.has(c.id) ? ' open' : '') + '" data-cid="' + esc(c.id) + '">' +
      '<div class="cmt-row" data-act="toggle">' +
        '<div class="cmt-thumb" data-thumb></div>' +
        '<div class="cmt-meta"><b></b><span></span></div>' +
        '<button type="button" class="cmt-btn del" data-act="del" title="删除这条">' + I_DEL + '</button>' +
        I_CHEV +
      '</div>' +
      '<div class="cmt-body">' +
        '<div class="cmt-av">' +
          '<div class="cmt-thumb" data-avp title="点击上传头像"></div>' +
          '<div class="cmt-av-links">' +
            '<button type="button" class="link" data-act="avatar">上传头像</button>' +
            '<button type="button" class="link" data-act="avatar-clear">清除头像</button>' +
          '</div>' +
        '</div>' +
        '<div class="field-row">' +
          commentField('名称', 'name', c, '阿 May') +
          commentField('用户名', 'handle', c, 'amay_builds') +
        '</div>' +
        '<label class="field"><span>正文</span>' +
          '<textarea data-cf="text" rows="3" placeholder="这条评论说了什么">' + esc(c.text) + '</textarea></label>' +
        '<div class="field-row">' +
          commentField('时间', 'time', c, '2小时') +
          commentField('点赞数', 'likes', c, '326') +
        '</div>' +
        '<div class="field-row">' +
          commentField('转发数', 'reposts', c, '12') +
          commentField('回复数', 'replies', c, '8') +
        '</div>' +
        '<label class="switch"><input type="checkbox" data-cf="verified"' + (c.verified ? ' checked' : '') + '>' +
          '<span class="track"><i></i></span><span class="switch-txt">认证标识</span></label>' +
        '<input type="file" accept="image/*" hidden data-file>' +
      '</div>' +
    '</div>';
  }

  /** 缩略图：有图用图，没图用首字母色块 */
  function paintThumb(el, c) {
    if (!el) return;
    el.textContent = '';
    const old = el.querySelector('img');
    if (old) old.remove();
    if (c.avatar) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = c.avatar;
      el.style.background = '';
      el.appendChild(img);
    } else {
      el.style.background = hashColor(c.name);
      el.textContent = (c.name || '').trim().charAt(0) || '?';
    }
  }

  function updateCommentRow(id) {
    const item = $('.cmt-item[data-cid="' + id + '"]', $('#cmtList'));
    const c = findComment(id);
    if (!item || !c) return;
    item.querySelector('.cmt-meta b').textContent = c.name || '未命名';
    item.querySelector('.cmt-meta span').textContent = c.text || '（空正文）';
    paintThumb(item.querySelector('[data-thumb]'), c);
    paintThumb(item.querySelector('[data-avp]'), c);
  }

  function rebuildCommentEditor() {
    const list = $('#cmtList');
    list.innerHTML = model.comments.map(commentEditorHtml).join('');
    model.comments.forEach(c => updateCommentRow(c.id));
  }

  function toggleComment(id) {
    const item = $('.cmt-item[data-cid="' + id + '"]', $('#cmtList'));
    if (!item) return;
    openIds.has(id) ? openIds.delete(id) : openIds.add(id);
    item.classList.toggle('open', openIds.has(id));
  }

  function addComment() {
    snapshot();
    const n = model.comments.length + 1;
    const c = {
      id: uid(), name: '新用户 ' + n, handle: 'user' + n, verified: false, avatar: '',
      text: '', time: '刚刚', likes: '', reposts: '', replies: ''
    };
    model.comments.push(c);
    openIds.add(c.id);
    rebuildCommentEditor();
    render();
    const el = $('.cmt-item[data-cid="' + c.id + '"]', $('#cmtList'));
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const ta = el.querySelector('[data-cf="text"]');
      if (ta) ta.focus();
    }
    toast('已添加一条评论');
  }

  function removeComment(id) {
    snapshot();
    model.comments = model.comments.filter(x => x.id !== id);
    openIds.delete(id);
    rebuildCommentEditor();
    render();
  }

  function bindComments() {
    const list = $('#cmtList');

    list.addEventListener('click', e => {
      const item = e.target.closest('.cmt-item');
      if (!item) return;
      const id = item.dataset.cid;
      const actEl = e.target.closest('[data-act]');
      const act = actEl ? actEl.dataset.act : '';

      if (act === 'del') { e.stopPropagation(); removeComment(id); return; }
      if (act === 'avatar-clear') {
        e.stopPropagation();
        const c = findComment(id);
        if (c) { c.avatar = ''; updateCommentRow(id); render(); }
        return;
      }
      if (act === 'avatar' || e.target.closest('[data-avp]')) {
        e.stopPropagation();
        const f = item.querySelector('[data-file]');
        if (f) f.click();
        return;
      }
      if (act === 'toggle' || !e.target.closest('.cmt-body')) toggleComment(id);
    });

    list.addEventListener('input', e => {
      const t = e.target;
      const key = t.dataset.cf;
      if (!key || t.type === 'checkbox' || t.type === 'file') return;
      const item = t.closest('.cmt-item');
      const c = item && findComment(item.dataset.cid);
      if (!c) return;

      let v = t.value;
      if (key === 'handle') {
        v = v.replace(/^@+/, '');
        if (t.value !== v) {
          const pos = t.selectionStart;
          t.value = v;
          if (pos != null) t.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
        }
      }
      c[key] = v;
      updateCommentRow(item.dataset.cid);
      render();
    });

    list.addEventListener('change', e => {
      const t = e.target;
      const item = t.closest('.cmt-item');
      if (!item) return;
      const c = findComment(item.dataset.cid);
      if (!c) return;

      if (t.dataset.cf === 'verified') {
        c.verified = t.checked;
        render();
        return;
      }
      if (t.matches('[data-file]') && t.files && t.files[0]) {
        const file = t.files[0];
        normalizeImage(file)
          .then(url => { c.avatar = url; updateCommentRow(c.id); render(); })
          .catch(() => toast('这张图浏览器读不了，先另存为 JPG 或截图后再传', true));
        t.value = '';
      }
    });

    $('#btnAddComment').addEventListener('click', addComment);
  }

  /* ---------------- 引用转发：编辑器 ---------------- */
  function syncQuoteFields() {
    $$('[data-qf]').forEach(el => {
      const k = el.dataset.qf;
      if (el.type === 'checkbox') el.checked = !!model.quote[k];
      else el.value = model.quote[k] == null ? '' : model.quote[k];
    });
    $('#quoteToggle').checked = !!model.quote.enabled;
    $('#quoteBox').hidden = !model.quote.enabled;
  }

  function paintQuoteThumb() {
    const el = $('#quoteAvatarPick');
    if (!el) return;
    if (model.quote.avatar) {
      el.style.backgroundImage = 'url("' + model.quote.avatar + '")';
      el.textContent = '';
    } else {
      el.style.backgroundImage = 'none';
      el.textContent = (model.quote.name || '').trim().charAt(0) || '+';
    }
    $('#quoteAvatarClear').hidden = !model.quote.avatar;
  }

  function bindQuote() {
    $('#quoteToggle').addEventListener('change', e => {
      snapshot();
      model.quote.enabled = e.target.checked;
      $('#quoteBox').hidden = !e.target.checked;
      render();
    });

    // 用事件委托，避免引用区重建后要重新绑定
    $('#quoteBox').addEventListener('input', e => {
      const k = e.target.dataset.qf;
      if (!k) return;
      let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (k === 'handle') {
        v = String(v).replace(/^@+/, '');
        const pos = e.target.selectionStart;
        if (e.target.value !== v) e.target.value = v;
        if (pos != null) e.target.setSelectionRange(pos, pos);
      }
      model.quote[k] = v;
      if (k === 'name') paintQuoteThumb();
      render();
    });

    const pick = $('#quoteAvatarPick');
    const file = $('#quoteAvatarFile');
    pick.addEventListener('click', () => file.click());
    pick.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
    });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      if (f.type && f.type.indexOf('image/') !== 0) { toast('请选择图片文件', true); return; }
      if (f.size > 20 * 1024 * 1024) { toast('图片超过 20MB，请先压缩再上传', true); return; }
      try {
        model.quote.avatar = await normalizeImage(f);
        paintQuoteThumb();
        render();
      } catch (err) {
        toast('这张图浏览器读不了（iPhone 的 HEIC 常见），先另存为 JPG 或截图后再上传', true);
      }
    });
    $('#quoteAvatarClear').addEventListener('click', () => {
      model.quote.avatar = '';
      paintQuoteThumb();
      render();
    });
  }

  /* ---------------- 撤销 / 清空 ---------------- */
  const undoStack = [];
  const UNDO_MAX = 40;

  /**
   * 记录一次可撤销的状态。
   * 不存配图（几张 base64 就有几 MB，堆 40 份会直接吃光内存），撤销时保留当前配图。
   */
  function snapshot() {
    const s = JSON.stringify(Object.assign({}, model, { media: [] }));
    if (undoStack[undoStack.length - 1] === s) return;
    undoStack.push(s);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    updateUndoBtn();
  }

  function updateUndoBtn() {
    const b = $('#btnUndo');
    if (b) b.disabled = undoStack.length === 0;
  }

  /** 把 model 整体同步回 UI，供撤销/清空/恢复示例共用 */
  function applyModelToUI() {
    syncInputsFromModel();
    syncQuoteFields();
    paintQuoteThumb();
    $('#avatarClear').hidden = !model.avatar;
    openIds.clear();
    rebuildCommentEditor();
    renderMediaEditor();
    render();
  }

  function undo() {
    if (!undoStack.length) { toast('没有可撤销的操作'); return; }
    const prev = JSON.parse(undoStack.pop());
    Object.keys(prev).forEach(k => {
      if (k === 'media') return;
      model[k] = prev[k];
    });
    normalizeComments();
    normalizeQuote();
    applyModelToUI();
    updateUndoBtn();
    toast('已撤销');
  }

  function clearAll() {
    snapshot();
    Object.assign(model, {
      name: '', handle: '', verified: false, avatar: '',
      text: '', time: '', date: '',
      replies: '', reposts: '', likes: '', views: '',
      media: [], comments: [],
      quote: { enabled: false, name: '', handle: '', verified: false, avatar: '', text: '', time: '' }
    });
    applyModelToUI();
    toast('已清空，可点「撤销」恢复');
  }

  /* ---------------- 导出 ---------------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  let libPromise = null;
  function ensureCaptureLib() {
    if (window.html2canvas) return Promise.resolve(true);
    if (libPromise) return libPromise;
    const sources = [
      './assets/vendor/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
    ];
    libPromise = (async () => {
      for (const src of sources) {
        try {
          await loadScript(src);
          if (window.html2canvas) return true;
        } catch (e) { /* 换下一个源 */ }
      }
      return false;
    })();
    return libPromise;
  }

  /** 兜底：把节点序列化进 SVG foreignObject 再画到 canvas（无需外部库） */
  async function captureBySvg(node, bg, scale) {
    const rect = node.getBoundingClientRect();
    const w = Math.ceil(rect.width), h = Math.ceil(rect.height);

    let css = '';
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) css += rule.cssText + '\n';
      } catch (e) { /* 跨域样式表跳过 */ }
    }

    const clone = node.cloneNode(true);
    clone.style.margin = '0';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;background:' + bg + '">' +
      '<style>' + css + '</style>' + clone.outerHTML +
      '</div></foreignObject></svg>';

    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const cv = document.createElement('canvas');
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }

  /** 导出前确保卡内的头像已解码完成，否则会截出空白圆 */
  function waitLocalImages() {
    const imgs = [].slice.call(postEl.querySelectorAll('img'));
    return Promise.all(imgs.map(im => {
      if (im.complete && im.naturalWidth) return Promise.resolve();
      return new Promise(res => {
        const done = () => res();
        im.addEventListener('load', done, { once: true });
        im.addEventListener('error', done, { once: true });
        setTimeout(done, 800);
      });
    }));
  }

  /* 浏览器 canvas 有硬上限：单边约 16384px、总面积约 1.6 亿像素。
     长正文 + 4 张图 + 多条评论在 4× 下很容易撞上限，撞上之后不会报错，
     而是给你一张空白图或者直接崩掉。所以导出前先算一遍，超了就自动降倍。 */
  const CANVAS_MAX_SIDE = 16384;
  const CANVAS_MAX_AREA = 160000000;
  let scaleNote = '';

  function safeScale(el, asked) {
    const w = Math.max(1, el.offsetWidth), h = Math.max(1, el.offsetHeight);
    let s = asked;
    if (w * s > CANVAS_MAX_SIDE) s = CANVAS_MAX_SIDE / w;
    if (h * s > CANVAS_MAX_SIDE) s = Math.min(s, CANVAS_MAX_SIDE / h);
    if (w * h * s * s > CANVAS_MAX_AREA) s = Math.sqrt(CANVAS_MAX_AREA / (w * h));
    return Math.max(1, Math.floor(s * 100) / 100);
  }

  async function capture() {
    const asked = Number($('#scaleSel').value) || 3;
    const scale = safeScale(postEl, asked);
    scaleNote = scale < asked
      ? '（内容太长，已从 ' + asked + '× 自动降到 ' + scale + '× 以避开浏览器上限）'
      : '';
    const bg = getComputedStyle(postEl).backgroundColor || '#ffffff';
    await waitLocalImages();
    const hasLib = await ensureCaptureLib();

    if (hasLib) {
      try {
        return await window.html2canvas(postEl, {
          scale: scale,
          backgroundColor: bg,
          useCORS: true,
          allowTaint: false,
          logging: false,
          width: postEl.offsetWidth,
          height: postEl.offsetHeight
        });
      } catch (e) {
        console.warn('[xps] html2canvas 失败，改用 SVG 兜底', e);
      }
    }
    return captureBySvg(postEl, bg, scale);
  }

  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  async function download() {
    const btn = $('#btnDownload');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '导出中…';
    try {
      const cv = await capture();
      // 用 Blob + objectURL 而不是超长 dataURL：Safari 对 a[download] 的 dataURL 有长度上限，
      // 图大了会静默失败，而 Blob 不受这个限制。
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('图片过大，请把清晰度调低一档再试');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'x-post-' + stamp() + '.png';
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('已保存 ' + cv.width + ' × ' + cv.height + ' PNG' + scaleNote);
    } catch (e) {
      console.error(e);
      toast('导出失败：' + (e && e.message ? e.message : '未知错误'), true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  async function copyImage() {
    try {
      const cv = await capture();
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (!blob || !navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('图片已复制，可直接粘贴');
    } catch (e) {
      toast('当前浏览器不支持复制，请用「下载 PNG」', true);
    }
  }

  /* ---------------- 其他 ---------------- */
  function bindMisc() {
    $('#btnDownload').addEventListener('click', download);
    $('#btnCopy').addEventListener('click', copyImage);

    $('#btnReset').addEventListener('click', () => {
      snapshot();
      Object.assign(model, clone(DEFAULTS));
      normalizeComments();
      normalizeQuote();
      applyModelToUI();
      toast('已恢复示例内容');
    });

    $('#btnClear').addEventListener('click', clearAll);
    $('#btnUndo').addEventListener('click', undo);

    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea';

      // 在输入框里交给浏览器原生撤销，别抢
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        download();
      }
    });

    if (/Mac|iPhone|iPad/.test(navigator.platform)) {
      $('#kbdKey').textContent = '⌘';
    }
  }

  /* ---------------- 启动 ---------------- */
  syncInputsFromModel();
  syncQuoteFields();
  paintQuoteThumb();
  $('#avatarClear').hidden = !model.avatar;
  bindInputs();
  bindAvatar();
  bindMedia();
  bindComments();
  bindQuote();
  bindMisc();
  rebuildCommentEditor();
  renderMediaEditor();
  render();
  updateUndoBtn();
  shrinkStoredAvatar();

  // 调试/二次开发入口
  window.XPostStudio = {
    capture: capture,
    render: render,
    undo: undo,
    clearAll: clearAll,
    snapshot: snapshot,
    get model() { return model; }
  };
})();
