# 新增 Tab 与页面扩展设计指南（V2）

本文沉淀自 `探索（SIDE C）` 模块的完整落地经验，供后续在 `v2` 中新增独立 Tab 或扩展新页面形态时直接对照排查。

---

## 一、模块划分与状态路由（先定边界，再写结构）

1. **独立模块用 `body[data-section="<name>"]` 隔离**
   - 在 `index.html` 中新增独立 `<section>`（如 `.explore-section`），通过 `body[data-section="..."]` 控制显示与隐藏，避免污染 `作品（磁带架 / 作品目录）` 的现有视图状态（`body[data-layout="shelf" | "index"]`）。
   - 在 `app.js` 同步维护 `history.state`（如 `{ portfolioSection: '<name>' }`）与 URL `#hash`（如 `#explore`），并确保详情弹窗关闭或浏览器前进/后退（`popstate`）能恢复到原 Tab 而不是跳回默认 `作品` 页。

2. **全局持久组件不要按 Tab 随意隐藏**
   - 底部播放条 `.archive-player`（`archive-player.js` / `archive-player.css`）及顶部主导航 `.site-header` 应在全站所有 Tab（`作品` / `探索` / `关于` / `联系` / 详情页）保持一致存在，页面底部需预留 `--archive-player-height` 安全空间避免内容被遮挡。

3. **次级切换栏位置与结构复用**
   - 新 Tab 如有子分类（如 `全部 / 分享 / 工具`），直接复用 `.collection-topline` 左侧计数器 + 右侧切换栏的同款位置与下划线激活态，保持跨 Tab 的阅读节奏一致。

---

## 二、顶部导航与 Airbnb 风格微图标规范

1. **为新 Tab 单独配置微图标**
   - 在 `micro-objects-source.js`（及打包产物 `micro-objects.js`）、`nav-objects.js` 与 `nav-objects.css` 中为新 Tab 注册独立微图标（如 `explore` 指南针），并保持 4 个导航图标的视觉外框尺寸、重心与线宽比重一致。
2. **激活状态联动**
   - `nav-objects.js` 监听 `body` 的 `data-section` 属性变化，切入新 Tab 时自动将对应图标设为当前激活态，并把 `作品` 恢复常态。

---

## 三、卡片 / 实体物件与详情页联动（以 CD 盒为例）

1. **共用同一套主题与渲染模板**
   - 将各条目的色板（盒底、腰封、文字、分割线、贴纸、详情页纸张）集中在 `app.js` 的配置对象（如 `cdThemes`）中，外层列表与详情页共用 `cdJewelMarkup()` 与 `bindCd3d()`。
   - 详情页若使用独立背景色，需与外层 `#E8E7E3` 维持相近亮度与柔和色温过渡（如 `C-01` 使用 `#e6e7e6`），避免从暖灰纸面点击进入时出现刺眼冷蓝或过白跳变。

2. **交互音效与 3D 手感对齐**
   - 在 `sound-effects.js` 为新实体补充匹配的声学反馈（悬停、点击入壳/开合、360° 拖拽 45° 棘轮 tick 声）。
   - 3D 变换容器需避免上层节点使用 `overflow: hidden`，否则会破坏 `transform-style: preserve-3d` 并裁剪厚度层或倒角高光。
   - 动态阴影应随 `cos(yaw)` 收窄（如 `.jewel-shadow`），防止旋转 90°～180° 时矩形底影滑出物体边缘。

3. **正反面统一与内容克制**
   - 列表页只展示精简的封面符号信息（腰封标题 + 核心标签），完整长文、章节与演示放到详情页呈现。
   - 卡片背面底卡复用 `--obi-bg` / `--obi-ink` / `--obi-rule`，保证旋转 180° 后正反视觉属于同一套实体设计。

---

## 四、字体、排版与多端适配（最容易踩坑的地方）

1. **中英文字体统一使用最小化静态 WOFF2 子集**
   - 中文：`MiSans`（`~/Library/Fonts/MiSans-*.ttf.ttf`）；英文 / 数字 / 标点：`Montserrat`（`~/Library/Fonts/Montserrat-*.ttf`）。
   - **关键检查**：每次新增文案、标题或数据指标单位（如新增数字 `9` 或单位汉字 `页 / 段 / 主 / 人`）后，务必同步检查 `explore-fonts.css` 与 `profile-fonts.css` 的 `unicode-range` 和对应 `.woff2` 子集，**不要让中文单位或缺失数字回退到 `Georgia, serif`（宋体）**。
   - 在 `site-details.css` 中，`.metric-value` 的字体回退链需显式落在 `"SimoExploreMiSans", "SimoMiSans", sans-serif`，保证「大数字 Montserrat + 小单位 MiSans」与磁带项目完全统一。

2. **竖排文字（`writing-mode: vertical-rl`）注意点**
   - 中文竖排时字形按全正方形 `vmtx` 步进，视觉上会比横排略宽散；若使用横排/竖排混排，需同时核对标点（`·`、`（）`、`+`）占位。
   - 长标题（如 `C-02`）在 `1440px`、`820px`、`496px`、`390px` 四个断点下都必须实测 `scrollHeight <= clientHeight` 与左对齐误差为 `0`，不能只在桌面端目测。

3. **移动端小尺寸物件优先「整盒等比缩放」**
   - 当详情页顶部等位置需要把 248px 级复杂 3D 物件缩放到 `94px`～`110px` 缩略位时，**不要逐项写 `3.5px` / `4px` 的微型字号覆盖**（容易触发浏览器最小字号限制并导致脊边、边框、背面列表比例失调或溢出）。
   - 正确做法：外层定好目标占位宽高（如 `110px × 96.25px` / `94px × 82.25px`），内部保持 `248px` 完整桌面尺寸布局，通过 `transform-origin: 0 0; transform: scale(...)` 整盒等比缩放，并将移动端列表专用的小字号样式限定在列表容器选择器（如 `.cd-desk-grid`）下。

---

## 五、富媒体与上线前自检清单

- **图文/视频混合演示**：若幻灯片中含实机手机视频，尽量提取干净带透明/扣像遮罩的底层框架图，在 DOM 中按百分比定位 `<video autoplay loop muted playsinline>` 并叠在底层，避免出现边缘锯齿或黑点毛刺。
- **缓存版本号**：每次改动 CSS / JS / WOFF2 后，同步更新 `index.html` 与 `*-fonts.css` 的 `?v=...` 查询参数，防止内嵌浏览器或 CDN 命中旧缓存。
- **四端回归必测项**：
  1. Playwright 无头校验 `1440×900`、`820×1024`、`496×822`、`390×844`；
  2. `console.error` 与 `pageerror` 为零；
  3. 切换 `作品` / `探索` / `关于` / `联系` 与打开详情页时 `.archive-player` 均正常显示且可联动；
  4. 3D 物件悬停、正反 180° 旋转、移动端小图套壳/背面旋转均无裁切或错位。
