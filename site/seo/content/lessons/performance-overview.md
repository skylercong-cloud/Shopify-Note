# 网站性能优化的方法与指标

网站性能优化以测量为起点，通过定位瓶颈、分析原因和对比验证来评估改动。

## 一、先建立网站性能优化的整体知识体系

网站性能优化可以按六个方向展开。

<box border radius="xl" padding={3} gap={3}>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="gauge" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **01 · 性能指标与测量**

      <text color="secondary" size="sm">LCP、FCP、INP、CLS、TTFB、Lighthouse、Chrome DevTools</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="network" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **02 · 网络与资源加载优化**

      <text color="secondary" size="sm">DNS、TCP、TLS、HTTP/2、HTTP/3、CDN、缓存、预加载、请求优先级</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="code-2" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **03 · 浏览器渲染与 JS 性能**

      <text color="secondary" size="sm">关键渲染路径、DOM、CSSOM、Layout、Paint、长任务、主线程、事件循环</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="images" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **04 · 页面资源优化**

      <text color="secondary" size="sm">图片格式与尺寸、响应式图片、字体、CSS、Tree Shaking、Code Splitting</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="server" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **05 · 服务端与架构优化**

      <text color="secondary" size="sm">CSR、SSR、SSG、流式渲染、缓存策略、接口优化、服务端响应</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="lg" padding={3}>
      <icon name="shopping-bag" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **06 · Shopify 电商网站专项优化**

      <text color="secondary" size="sm">Liquid 渲染效率、Section、商品图片、第三方 App、购物车交互、Theme 性能</text>
    </box>
  </row>
</box>

## 二、性能优化首先要明确优化什么

网站的性能并不是单纯的“页面加载耗时”。

Google 目前的三个核心 Web Vitals 指标是：

<box border radius="xl" padding={3} gap={3}>
  <grid columns={3} gap={2}>
    <grid-item>
      <box gap={1} align="center">
        <text color="secondary" weight="medium" size="xs">LCP</text>
        <title size="xl" color="success" tabularNums>≤2.5s</title>
        <caption textAlign="center">主要内容加载</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1} align="center">
        <text color="secondary" weight="medium" size="xs">INP</text>
        <title size="xl" color="success" tabularNums>≤200ms</title>
        <caption textAlign="center">交互响应</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1} align="center">
        <text color="secondary" weight="medium" size="xs">CLS</text>
        <title size="xl" color="success" tabularNums>≤0.1</title>
        <caption textAlign="center">视觉稳定性</caption>
      </box>
    </grid-item>
  </grid>
  <caption>以上为“良好”标准，通常依据真实用户数据的第 75 百分位进行评估。</caption>
</box>

还有两个非常重要的辅助指标：

- **TTFB**：从导航请求开始到收到 HTML 响应第一个字节的时间。
- **FCP**：浏览器首次将文本、图片等内容绘制到页面上的时间。

## 三、举个电商网站的实际案例

假设一个 Shopify 商品详情页有以下问题：

用户进入页面后：

- 0.8 秒：收到 HTML。
- 1.5 秒：页面出现导航栏。
- 4.2 秒：商品主图终于显示。
- 5.0 秒：用户点击加入购物车，但页面明显卡顿。
- 5.5 秒：购物车弹窗出现。

这时候我们应该怎么优化？

很多开发者第一反应是：

“压缩 JS、图片懒加载、减少 HTTP 请求。”

但这些措施不一定能解决真正的问题。

例如，商品主图是 LCP 元素，如果把它设置成 `loading="lazy"`，反而可能让 LCP 更差。

而加入购物车卡顿，可能是 JavaScript 长任务阻塞主线程，或者购物车抽屉更新时产生大量 DOM 操作。

Shopify 官方同样强调，首屏关键图片不应该懒加载，Liquid 嵌套循环和第三方 JavaScript 也需要重点排查。

所以，**性能优化的正确流程是：测量 → 定位瓶颈 → 分析原因 → 实施优化 → 对比验证。**

## 参考资料

- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance?utm_source=chatgpt.com)
- [Liquid performance optimization patterns](https://shopify.dev/docs/storefronts/themes/best-practices/performance/liquid-performance-patterns?utm_source=chatgpt.com)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform?utm_source=chatgpt.com)
- [Testing for performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance?utm_source=chatgpt.com)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps?utm_source=chatgpt.com)
- [Render essential content in Liquid and HTML, not JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/render-essential-content-server-side?utm_source=chatgpt.com)
- [Storefront performance](https://shopify.dev/docs/apps/build/performance/storefront?utm_source=chatgpt.com)
- [Performance best practices for Hydrogen storefronts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/hydrogen-performance?utm_source=chatgpt.com)
- [Defer render-blocking CSS and JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-non-critical-resources?utm_source=chatgpt.com)
- [Shopify Help Center | Improving your online store performance](https://help.shopify.com/en/manual/online-store/web-performance/improving-web-performance?utm_source=chatgpt.com)
- [Website Performance: Metrics, Tools, and Tips (2026) - Shopify](https://www.shopify.com/enterprise/blog/website-performance?utm_source=chatgpt.com)
- [Shopify Help Center | Improving your online store performance](https://help.shopify.com/en/manual/online-store/web-performance/improving-web-performance?trk=article-ssr-frontend-pulse_little-text-block&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=1&hl=en&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=29&utm_source=chatgpt.com)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?authuser=108&hl=en&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=20&utm_source=chatgpt.com)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?authuser=4&utm_source=chatgpt.com)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals/?authuser=384&utm_source=chatgpt.com)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?authuser=115&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=80&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=6&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?hl=en&utm_source=chatgpt.com)
- [Largest Contentful Paint (LCP) | Articles | web.dev](https://web.dev/articles/lcp?authuser=00&utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=993749347&utm_source=chatgpt.com)
- [Largest Contentful Paint (LCP) | Articles | web.dev](https://web.dev/articles/lcp?authuser=80&utm_source=chatgpt.com)
- [Optimize Core Web Vitals for business decision makers | Articles | web.dev](https://web.dev/articles/optimize-cwv-business?hl=en&utm_source=chatgpt.com)
- [Best practices for measuring Web Vitals in the field | Articles | web.dev](https://web.dev/articles/vitals-field-measurement-best-practices?authuser=2&utm_source=chatgpt.com)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?via=topaitools&utm_source=chatgpt.com)
- [Optimize Core Web Vitals for business decision makers | Articles | web.dev](https://web.dev/articles/optimize-cwv-business?authuser=10&utm_source=chatgpt.com)
- [Core Web Vitals workflows with Google tools | Articles | web.dev](https://web.dev/articles/vitals-tools?authuser=795198429&utm_source=chatgpt.com)
- [The most effective ways to improve Core Web Vitals | Articles | web.dev](https://web.dev/articles/top-cwv?authuser=68&utm_source=chatgpt.com)
- [web.dev/src/site/content/en/blog/defining-core-web-vitals-thresholds/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/defining-core-web-vitals-thresholds/index.md?utm_source=chatgpt.com)
- [web.dev/src/site/content/en/vitals/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/vitals/index.md?utm_source=chatgpt.com)
- [Core Web Vitals: LCP, INP, CLS thresholds (2026)](https://www.web-perf.com/en/core-web-vitals/?utm_source=chatgpt.com)
- [Core web vitals guide · Unlighthouse](https://unlighthouse.dev/learn-lighthouse/core-web-vitals?utm_source=chatgpt.com)
- [Core Web Vitals Explained: LCP, INP and CLS — dotvitals](https://www.dotvitals.com/guides/core-web-vitals-explained/?utm_source=chatgpt.com)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev for China](https://web.developers.google.cn/articles/defining-core-web-vitals-thresholds?hl=en&utm_source=chatgpt.com)
