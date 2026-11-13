# Dawn 源码研读的进阶主题

## 后续 6 课安排

<box border radius="lg" padding={3} gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">15</title>
    </box>
    <box flex="1" gap={1}>
      **Theme Editor 与 Section 生命周期**
      <badge color="success">下一课</badge>
      <text color="secondary" size="sm">`shopify:section:load/unload`、`shopify:block:select`、`block.shopify_attributes`、动态 DOM 初始化、事件清理和内存泄漏。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">16</title>
    </box>
    <box flex="1" gap={1}>
      **多语言、多货币与 Shopify Markets**
      <text color="secondary" size="sm">`localization` 对象、`localization-form.js`、语言和国家选择器、货币格式化、Locale JSON 及国际化 URL 的源码实现。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">17</title>
    </box>
    <box flex="1" gap={1}>
      **Dawn SEO 与结构化数据源码**
      <text color="secondary" size="sm">`theme.liquid`、`meta-tags.liquid`、`canonical_url`、`content_for_header`、JSON-LD、商品结构化数据与 SEO 最佳实践。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">18</title>
    </box>
    <box flex="1" gap={1}>
      **Dawn JavaScript 架构与组件工程化**
      <text color="secondary" size="sm">系统梳理 Web Components、Pub/Sub、生命周期、事件清理、焦点管理、ARIA，以及如何开发可复用的自定义组件。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">19</title>
    </box>
    <box flex="1" gap={1}>
      **Dawn 性能分析与源码级优化实战**
      <text color="secondary" size="sm">不再重复性能理论，而是结合真实 Dawn 文件，用 DevTools 诊断 LCP、CLS、INP、资源加载、异步请求竞态及 Section 重渲染开销。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" size="48px" align="center" justify="center">
      <title size="lg" color="default">20</title>
    </box>
    <box flex="1" gap={1}>
      **综合实战：基于 Dawn 开发完整自定义功能**
      <badge>毕业实战</badge>
      <text color="secondary" size="sm">从需求设计开始，完整实现一个自定义 Section，涵盖 Schema、Liquid、JavaScript、CSS、Ajax、Theme Editor 兼容、测试与发布。</text>
    </box>
  </row>
</box>

## 学习目标





| 阶段 | 目标 |
|---|---|
| 理解 Dawn | 能快速定位功能涉及的 Liquid、JS 和 CSS |
| 修改 Dawn | 能独立改造商品页、集合页、购物车和 Header |
| 扩展 Dawn | 能开发完整功能模块，并处理性能、兼容性与 Theme Editor 生命周期 |
