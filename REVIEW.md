# 教程审查与网站化建议

审查对象：`Downloads/Shopify网站开发系统教程-平台开发者阶段/Shopify网站开发系统教程.md`

## 已确认的优点

- 不是零散笔记，而是从 Shopify 平台、Theme、Commerce 数据模型一直覆盖到 App、Function、Headless 和 Enterprise 的完整教程。
- 核心对象大多同时讲了定义、Admin 位置、数据关系、Liquid/API 属性、示例和易混淆对比，适合前端开发者建立推理模型。
- 有 21 张架构图，覆盖平台地图、Theme 渲染、Variant、购物生命周期、库存、Section Rendering、SEO、性能、App、Webhook、Hydrogen 和 Plus。
- 已经包含大量 Shopify 官方文档链接，适合作为长期参考资料。

## 结构上建议优化

### 1. 网站导航改成 Level 路线 + Reference 参考

当前 Markdown 使用 `Part 0–18` 和 `第 8–36 课` 混合编号。内容本身没有缺失，但读者会疑惑学习顺序。网站导航建议分成：

- Learning path：Level 0–6 的循序学习路线。
- Reference：对象速查、决策表、官方文档索引。
- Deep dives：Part 17 的逐步推导和完整实战。

### 2. Part 17 不要继续使用重复的课程编号

Part 17 中重新出现“第 8 课 Add to Cart”“第 9 课 Cart Drawer”等内容，适合作为复习与逐步推导，但不适合和主目录并列。建议统一改名为：

> 实战推导篇：从商品页到 Cart Drawer

并在目录中标记为“可选复习路径”。

### 3. 修正课程编号缺口

目前课程标题跳过了第 24、26、28 课。建议二选一：

- 补齐缺少的编号；或
- 删除“第 N 课”编号，改成主题标题，避免让读者误以为内容丢失。

网站化时我建议采用第二种，使用稳定的主题 slug，未来新增章节不会导致全站重编号。

### 4. Level 0 需要在网站首页单独突出

当前 Part 0 已经覆盖平台地图、商业生命周期和改哪一层的判断，但网站首页应该额外提供一页“从 0 开始”的入口，先解释：

`Store → Admin → Storefront → Theme → App → API → Checkout`

这样初学者不会直接落入 Product、Variant 或 Liquid 细节。

## 内容上建议补充

- 增加“版本与时效”提示：哪些是稳定概念，哪些字段、API 版本、计划限制会变化。
- 增加“Theme / App / Function / Headless 选型流程图”，将已有决策表变成可点击练习。
- 每个 Level 增加一个可验收项目，例如：Level 1 完成一个可配置 Section，Level 2 完成 Variant + Ajax Cart，Level 4 完成订单同步 App。
- 将“代码示例”统一标注运行位置：Liquid 服务端、浏览器 JavaScript、App 后端、Shopify Function。
- 将示例中的占位域名 `https://my-api.com/check-price` 明确改为 `https://your-api.example/check-price`，避免读者误以为存在真实接口。
- 增加“先看什么、可以跳过什么”的阅读提示，降低 13,000 多行长文的首次阅读压力。

## 网站工程上已处理

当前 `site/` 已包含：

- Markdown 教程和 21 张图片的可发布副本。
- 响应式布局、左侧目录、章节高亮、阅读进度、关键词过滤、深色模式和返回顶部。
- Mermaid 图表渲染预留位置。
- GitHub Pages Actions 工作流。
- 本地预览说明。

## 当前验证边界

- 已验证图片资源已经复制到 `site/content/assets/`，Markdown 中的图片路径已改为网站路径。
- 已检查源文档共有 518 个标题、21 个图片引用和 1,730 个代码围栏标记。
- 还没有推送到 GitHub，也没有进行真实 GitHub Pages 部署；部署需要仓库地址和 GitHub 权限。
