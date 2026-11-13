# 网站性能优化进阶主题

## 后续学习路线

| 课程 | 主题 | 核心学习内容 |
|---|---|---|
| **第 10 课** | CSS 深度性能优化 | CSS 选择器性能、样式计算、`contain`、`content-visibility`、CSS 动画与渲染成本 |
| **第 11 课** | 图片与字体深度优化 | WebP / AVIF、响应式图片、`srcset` / `sizes`、DPR、图片解码、字体加载与 CLS |
| **第 12 课** | 页面渲染架构与性能 | CSR、SSR、SSG、Streaming SSR、Hydration、Partial Hydration、Islands Architecture |
| **第 13 课** | 浏览器导航与页面恢复 | SPA 导航、MPA 导航、bfcache、Speculation Rules、预加载与预渲染 |
| **第 14 课** | 大型页面与列表性能 | 大量 DOM 节点、虚拟列表、分页、IntersectionObserver、复杂筛选与排序 |
| **第 15 课** | 内存管理与性能 | JavaScript 内存模型、垃圾回收、内存泄漏、Detached DOM、事件监听器清理 |
| **第 16 课** | Shopify Theme 高级性能优化 | Section Rendering、Theme Editor 生命周期、Liquid 数据输出策略、集合页性能、App 性能 |

## 我特别推荐深入的三个方向

<box gap={3}>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-07.jpg" alt="CSS web design browser developer tools colorful code editor CSS layout modern workstation"/>
    <box flex="1" gap={1}>
      **方向 A：浏览器渲染机制继续深入**

      主要学习第 10、11、15 课。

      适合希望真正搞懂浏览器如何处理样式、图像、字体和内存，以及复杂页面为什么卡顿的开发者。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-08.jpg" alt="web application frontend architecture abstract diagram server client components interconnected"/>
    <box flex="1" gap={1}>
      **方向 B：现代前端架构与性能**

      主要学习第 12、13、14 课。

      深入研究 SSR 和 CSR 为什么有不同的性能表现、Hydration 为什么可能造成主线程阻塞、SPA 与传统多页面网站在导航性能上有什么区别。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-09.jpg" alt="modern ecommerce website storefront product collection catalog grid desktop mockup"/>
    <box flex="1" gap={1}>
      **方向 C：Shopify Theme 性能专项**

      重点学习第 16 课，并扩展集合页、商品变体和购物车的复杂场景。

      例如一个集合页展示几百个商品时，Liquid、HTML DOM、筛选和排序应该如何设计才能保证性能。
    </box>
  </row>
</box>
