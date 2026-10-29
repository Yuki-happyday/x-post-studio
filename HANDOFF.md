# HANDOFF · X Post Studio

> 交接文档。给下一个接手这个项目的人（或 AI 会话）看，读完应该能直接改代码，不用重新摸一遍。
> 最后更新：2026-10-29

## 0. 三十秒进状态

| 项 | 值 |
|---|---|
| 线上地址 | https://yuki-happyday.github.io/x-post-studio/ |
| 仓库 | https://github.com/Yuki-happyday/x-post-studio |
| 本地路径 | `D:\AppData\wrobuddy-cunchu\杂\x-post-studio` |
| 技术栈 | 纯静态 HTML + CSS + 原生 JS，零框架零构建 |
| 部署方式 | `git push` 到 `main`，GitHub Pages 约 1 分钟后自动重建 |
| 凭据 | 已存入 Windows 凭据管理器，push 不需要再输密码 |

改代码只需要动三个文件：`index.html`、`assets/style.css`、`assets/app.js`。

## 1. 功能现状

已实现：完整字段编辑（头像/昵称/用户名/认证/正文/时间日期/评论/转发/点赞/浏览）、1–4 张配图（X 的多图网格）、引用转发卡片、任意条评论区、`@提及` `#话题` `链接` 品牌蓝高亮（邮箱不误标）、三种官方配色、数字自动换算（28000→2.8万）、画布宽度 420–820、导出 2/3/4 倍 PNG、复制图片到剪贴板、localStorage 自动存草稿、撤销（40 步）、清空与恢复示例。

未实现：见第 9 节待办。

## 2. 文件与职责

```
index.html              265 行   编辑器表单骨架 + 顶栏按钮，全部 id 由 app.js 抓取
assets/style.css        477 行   两套体系：编辑器 UI（深色固定）+ 帖子卡片（三主题变量）
assets/app.js          1235 行   状态、渲染、图片处理、导出，单个 IIFE
assets/vendor/
  html2canvas.min.js             本地副本，导出主路径，离线可用
assets/screenshot.png            README 首图
assets/og-cover.png              分享卡片 1200×630
```

`app.js` 内部结构（按出现顺序）：

| 区域 | 关键函数 | 作用 |
|---|---|---|
| 工具 | `esc` `linkify` `hashColor` `fmtNum` | 转义、正文高亮、默认头像取色、数字换算 |
| 状态 | `DEFAULTS` `model` `persist` `snapshot`/`undo` | 默认值、当前数据、320ms 防抖存草稿、撤销栈 |
| 渲染 | `render` `actsHtml` `commentsHtml` `quoteHtml` `mediaHtml` | 拼 HTML 字符串写进 `#post` |
| 头像/图片 | `squareDataUrl` `shrinkStoredAvatar` `normalizeImage` `mediaDataUrl` | 裁方形、压 320px、配图压长边 1600px |
| 编辑器 | `bindInputs` `renderMediaEditor` `rebuildCommentEditor` `bindComments` | 表单双向绑定、评论条目增删 |
| 导出 | `capture` `safeScale` `captureBySvg` `download` `copyImage` | 导出主链路与兜底 |

对外测试入口（故意暴露，别删）：

```js
window.XPostStudio = { capture, render, undo, clearAll, snapshot, get model() {} }
```

## 3. 两条不能破的约束

这两条是踩过坑之后立的规矩，改动时不要绕开：

1. **编辑现有内容时不要重建 DOM。** 只有「增删评论 / 增删配图」才允许 `rebuild*`。输入框里每敲一个字都重建的话，光标会跳到末尾、中文输入法会打断。
2. **头像一律用 `<img>` 元素 + DOM 属性赋值，绝不拼进 `innerHTML` 字符串。** 早期用 `style="background-image:url(data:...)"` 时，base64 里的双引号会把 HTML 属性截断成 `url(`，头像直接不显示。这个 bug 排查了很久。

## 4. 数据模型

```js
{
  name, handle, verified, avatar,            // 账号
  text, time, date, showMeta,                 // 正文与时间
  replies, reposts, likes, views,             // 数据（字符串，允许 "2.8万"）
  theme: 'light'|'dim'|'dark', width: 420-820,
  comments: [{ id, name, handle, verified, avatar, text, time, likes, replies, reposts }],
  media: [{ src, w, h }],                     // 最多 4，不写草稿
  quote: { enabled, name, handle, verified, avatar, text, time },
  showComments
}
```

草稿存 `localStorage['x-post-studio-v1']`，**配图与撤销快照都不含 base64 图片**（几个 base64 就撑爆 5MB 配额，会导致整份草稿存不进去）。

主题切换靠 `#post` 上的 `data-theme` 属性，卡片颜色全部走 CSS 变量 `--tx`（主文字）`--mu`（次要）`--bd`（边框）`--bg`（背景）`--qb`（引用卡片边框）。新增主题只需加一条 `[data-theme="xxx"]` 规则。

## 5. 渲染与导出链路

```
用户输入 → bindInputs 写 model → render() 拼 HTML → 写 #post
                                              ↓
                                      applyAvatar / applyMediaImages / applyCommentAvatars
                                        （图片必须走 img.src 赋值，不能在 HTML 里）
导出：capture() → safeScale 算安全倍数 → html2canvas → 失败则 captureBySvg 兜底 → Blob → 下载
```

`captureBySvg` 是把 `#post` 序列化进 SVG `foreignObject` 再用 canvas 画，断网或 html2canvas 崩了才走这条路，保真度略低但不会白屏。

## 6. 已知坑（别再踩）

| 现象 | 根因 | 现在怎么处理的 |
|---|---|---|
| 头像不显示 | base64 里的引号截断了 `background-image` 属性 | 改 `<img>` + 属性赋值 |
| 刷新后头像消失 | 原图 base64 超 localStorage 5MB，静默失败 | canvas 裁方形压到 320px WebP |
| 三图网格错乱、容器被撑高 | Grid `1fr` 最小尺寸是内容高度 | 改 `minmax(0,1fr)` + 图片 `min-height:0` |
| 导出看似全白 | 单点采样误判，字间本来就是白色 | 改区域统计（120×120 块算非白占比）验证 |
| 长内容导出得白图 | canvas 单边上限 16384px、总面积约 1.6 亿像素，超限不报错 | `safeScale` 导出前估算，超了自动降倍并提示 |
| Safari 存不下图 | `a.href = toDataURL()` 的长度限制 | 改 `toBlob` + `createObjectURL` |
| 390px 手机宽度测不准 | Chrome headless 有最小窗口宽度（实际 518px） | 用 iframe 设 390px 再测 |
| headless 截图失败 | 中文路径要 URL 编码 | 路径里的「杂」写成 `%E6%9D%82` |
| headless `--screenshot` 报找不到路径 | 相对路径不按当前目录解析 | 一律给绝对路径 |

## 7. 怎么验证改动（照抄即可）

起本地服务（不要直接双击 `file://`，localStorage 行为会和线上不一致）：

```bash
cd "D:/AppData/wrobuddy-cunchu/杂/x-post-studio" && python -m http.server 8000
```

**逻辑探针**——复制一份 HTML，注入测试脚本，读 DOM：

```bash
# 把 index.html 复制成 _test.html，在 </body> 前插入一段 script，
# 里面调 window.XPostStudio.xxx()，结果写进 <div id="probe">
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --user-data-dir=/tmp/probe --virtual-time-budget=20000 --dump-dom \
  "file:///D:/AppData/wrobuddy-cunchu/%E6%9D%82/x-post-studio/_test.html" | grep -o 'id="probe">[^<]*'
```

**目视验证**——截图后自己看一眼（比采样可靠）：

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --window-size=1400,860 \
  --screenshot="D:/绝对路径/_shot.png" --user-data-dir=/tmp/shot \
  "file:///D:/AppData/wrobuddy-cunchu/%E6%9D%82/x-post-studio/index.html"
```

改完 CSS 记得同时看一眼三种 `data-theme`，卡片配色是三套独立变量。

## 8. 提交与发布

```bash
cd "D:/AppData/wrobuddy-cunchu/杂/x-post-studio"
git add -A && git commit -m "说明改了什么" && git push
```

Pages 会自动重建，约 1 分钟生效。查状态：`https://github.com/Yuki-happyday/x-post-studio/deployments`。

`index.html` 里的 `og:image` 已是正式域名 `https://yuki-happyday.github.io/x-post-studio/assets/og-cover.png`，**换域名时必须同步改这两处**，否则分享出去没有缩略图。

## 9. 待办

按「值得做」排序：

1. **「正在回复 @xxx」行** — 在主帖上方加一行灰字，模仿回复详情页。改动小，只需在 `render` 的卡片头部前插一个 div + 加个输入框，约半小时。
2. **配图拖拽排序** — 目前只能删了重加。用 HTML5 draggable 或指针事件交换 `media` 数组下标即可，注意别触发 `rebuild` 打断其他输入。
3. **适配小红书 3:4 输出** — 架构影响最大，见第 10 节。
4. **小红书 / 微博皮肤** — 影响范围大，建议独立目录，见第 10 节。

不建议做：内容生成（AI 写文案）、伪造证据级还原（聊天记录、转账截图）。这是排版工具，红线是不产出「看起来像真的但其实不是」的证据。

## 10. 如果要做小红书 / 微博版本

**不要 fork 成三份互不相干的代码。** 最贵的三块——导出管线（html2canvas + canvas 上限保护 + 兜底）、图片压缩、草稿存储——重写三遍纯属浪费，而且以后改一个 bug 要改三处。

建议结构：

```
x-post-studio/
├── assets/core.js        共享：状态机、导出、图片压缩、撤销、草稿
├── assets/vendor/
├── index.html            X 版
├── xhs/index.html        小红书版（自带 skin.css + template.js）
└── weibo/index.html      微博版
```

三个平台各自的差异，落到实现上是：

| | X（已做） | 小红书 | 微博 |
|---|---|---|---|
| 画布 | 宽度固定、**高度自适应** | **固定 3:4**（如 1080×1440） | 宽度固定、高度自适应 |
| 主体 | 文字为主 | 图片为主，文字是配文 | 文字为主，转发会带原帖 |
| 特有元素 | 浏览量大眼睛图标 | 点赞/收藏/评论三栏、话题标签堆在正文末尾 | 黄V/红V、转发链、「热门评论」样式 |
| 时间格式 | 下午3:24 · 日期 | 编辑于 xx-xx 或「x天前」 | 「今天 12:30」「x分钟前」 |
| 头图 | 圆形 | 圆形（更小） | 方形圆角 |

**小红书最关键的一条：它是固定画布。** X 版是内容撑多高就多高，小红书必须把内容塞进 1080×1440 里再导出——文字超了就截断或缩字号。这决定了 `render` 之后要多一步「装订」逻辑（测量内容高度 → 若超限则缩字号 / 截断加省略号），不能照搬 X 的自适应思路。

## 11. 新会话开场建议

新开对话做小红书/微博时，把这段直接发过去：

> 我在 `D:\AppData\wrobuddy-cunchu\杂\x-post-studio` 有一个已上线的 X 帖子截图生成器（纯静态，零框架）。现在要做小红书 3:4 卡片版和微博版。请先读同目录下的 `HANDOFF.md`，特别是第 3 节的两条约束、第 6 节的坑、第 10 节的架构建议，然后我们再讨论怎么拆分共享代码。

## 12. 一句话总结

这东西的本质是「HTML 照着官方 UI 排一遍 + html2canvas 截图」。UI 保真靠对着真实截图调 CSS，功能靠极简状态机。所有复杂度都在图片处理和导出这两块，其余都是体力活。
