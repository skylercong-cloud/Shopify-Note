# 从输入 URL 到页面完整渲染，浏览器到底经历了什么？


页面导航包括 DNS 查询、连接建立、资源加载、HTML 解析和渲染。理解各阶段的依赖关系，有助于定位以下性能问题：

1. 为什么网络很快，页面仍然加载缓慢？
2. 为什么 HTML 已经下载完成，用户却仍然看到白屏？
3. 为什么图片已经下载完，页面却迟迟没有显示图片？
4. 为什么 JS 文件只有几十 KB，却能让页面卡顿数秒？
5. 为什么有些页面看起来加载完成了，却依然无法流畅交互？

---

### 一、先看整个浏览器加载流程

假设用户在 Chrome 地址栏输入：

`https://shop.example.com/products/shoes`

并按下回车。

在一次普通的、没有命中现成页面恢复或预渲染的完整导航中，可以把过程抽象成下面这条链路：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 588" width="100%" xmlns="http://www.w3.org/2000/svg">
    {#each [
      {y:8,t:"1. 导航与 DNS 解析",s:"确定要访问的服务器",c:"#64748b"},
      {y:80,t:"2. 建立网络连接",s:"TCP / QUIC、TLS",c:"#64748b"},
      {y:152,t:"3. HTTP 请求与响应",s:"CDN、服务器、HTML",c:"#64748b"},
      {y:224,t:"4. HTML / CSS / JS 解析",s:"构建 DOM 和 CSSOM",c:"#3b82f6"},
      {y:296,t:"5. 资源加载与调度",s:"样式、脚本、图片、字体",c:"#3b82f6"},
      {y:368,t:"6. 浏览器渲染",s:"Style → Layout → Paint → Composite",c:"#3b82f6"},
      {y:440,t:"7. JavaScript 执行",s:"事件绑定、页面更新、主线程任务",c:"#0d9488"},
      {y:512,t:"8. 页面稳定且流畅可交互",s:"处理输入、响应交互、持续渲染",c:"#0d9488"}
    ] as n,i}
      <rect x="32" y={n.y} width="276" height="56" rx="9" fill={n.c} fillOpacity=".09" stroke={n.c} strokeOpacity=".32"/>
      <rect x="32" y={n.y} width="4" height="56" rx="2" fill={n.c}/>
      <text x="170" y={n.y+23} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">{n.t}</text>
      <text x="170" y={n.y+41} textAnchor="middle" fontSize="10.5" fill="currentColor" opacity=".68">{n.s}</text>
      {#if i<7}
        <path d={`M 170 ${n.y+56} v 12 m -4 -4 l 4 4 4 -4`} fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5"/>
      {/if}
    {/each}
  </svg>
  <caption>这是帮助理解的逻辑分层，而不是严格串行的执行顺序。实际浏览器会并行下载资源，解析、脚本执行与渲染也会交错发生。</caption>
</box>

这里最重要的一点是：

**页面加载速度不是一个单一问题，而是网络、服务器、资源调度、浏览器渲染和 JavaScript 执行共同作用的结果。**

因此，性能优化首先要能够识别：到底是哪一层拖慢了页面。

---

## 二、第一阶段：URL 解析与 DNS 查询

### 1. 浏览器如何理解一个 URL？

我们把 URL 拆开：

<box background="surface-secondary" radius="lg" padding={3} gap={2}>
  <row justify="center" align="baseline" wrap="wrap" gap={0}>
    <text weight="medium" color="secondary">https://</text>
    <text weight="medium" color="info">shop.example.com</text>
    <text weight="medium" color="success">/products/shoes</text>
  </row>
  <grid columns={3} gap={1}>
    <grid-item>
      <text size="xs" color="secondary" textAlign="center">协议</text>
      <text size="xs" textAlign="center">HTTPS</text>
    </grid-item>
    <grid-item>
      <text size="xs" color="secondary" textAlign="center">域名</text>
      <text size="xs" textAlign="center">DNS 查询目标</text>
    </grid-item>
    <grid-item>
      <text size="xs" color="secondary" textAlign="center">路径</text>
      <text size="xs" textAlign="center">服务器中的资源</text>
    </grid-item>
  </grid>
</box>

浏览器会先判断这次导航能不能使用已有资源或连接，例如已有页面的历史恢复、缓存、Service Worker、预渲染结果等。

如果需要进行新的网络请求，就要确定目标服务器的网络地址。

### 2. DNS 是什么？

DNS（Domain Name System）负责将域名解析为 IP 地址。

浏览器不能仅凭 `shop.example.com` 直接完成网络通信。它通常需要找到对应的 IP。

例如：

```text
shop.example.com
       ↓
      DNS
       ↓
203.0.113.10（示意地址）
```

一次典型的 DNS 解析可能涉及：

- 浏览器和操作系统的 DNS 缓存。
- 本地配置的递归 DNS 解析器。
- DNS 解析器向相关权威 DNS 服务器查询。
- 返回 A、AAAA 等记录，最终得到可用地址。

并不是每次打开页面都要经历完整的递归 DNS 查询。

#### DNS 为什么影响性能？

假设 DNS 查询用了 180ms。

这 180ms 可能发生在建立目标网络连接之前，导致主文档请求开始得更晚。

即使服务器非常快，也不能完全抵消前面发生的等待。

#### DNS 优化手段

**① 减少不必要的域名**

例如某页面依赖：

```text
shop.example.com
cdn-a.example.net
analytics.example.org
fonts.example.net
ads.example.org
```

不同域名可能产生额外的 DNS、连接和 TLS 成本。

但也不要因此认为所有资源必须放在同一个域名下。CDN、连接复用和缓存的收益也需要综合考虑。

**② dns-prefetch**

```html
<link
  rel="dns-prefetch"
  href="//fonts.example.net"
>
```

提示浏览器提前解析后续可能使用的域名。

**③ preconnect**

```html
<link
  rel="preconnect"
  href="https://fonts.example.net"
>
```

它比 `dns-prefetch` 更进一步：浏览器可以提前进行 DNS 查询以及必要的连接建立。

但 `preconnect` 会消耗连接资源，不适合给所有第三方域名都添加。

<text color="secondary" size="sm">第一阶段结论：DNS 优化的核心是减少关键请求开始前的等待。</text>

---

## 三、第二阶段：建立网络连接

浏览器得到了目标 IP 后，通常还需要建立安全网络连接。

这一步我们重点理解三个概念：

**RTT、TCP/QUIC、TLS。**

### 1. RTT：网络延迟的基本单位

RTT（Round Trip Time）指数据从一端到另一端，再返回所经历的往返时间。

例如：

<box border radius="lg" padding={3} gap={1}>
  <svg viewBox="0 0 340 104" width="100%">
    <rect x="6" y="10" width="94" height="74" rx="8" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <rect x="240" y="10" width="94" height="74" rx="8" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <text x="53" y="41" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">浏览器</text>
    <text x="53" y="59" textAnchor="middle" fontSize="10" fill="currentColor">客户端</text>
    <text x="287" y="41" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">服务器</text>
    <text x="287" y="59" textAnchor="middle" fontSize="10" fill="currentColor">服务端</text>
    <path d="M 105 26 H 232 l -6 -4 m 6 4 -6 4" fill="none" stroke="#3b82f6" strokeWidth="2"/>
    <path d="M 235 66 H 108 l 6 -4 m -6 4 6 4" fill="none" stroke="#0d9488" strokeWidth="2"/>
    <text x="170" y="20" textAnchor="middle" fontSize="10" fill="#3b82f6">请求方向</text>
    <text x="170" y="60" textAnchor="middle" fontSize="10" fill="#0d9488">返回方向</text>
    <text x="170" y="99" textAnchor="middle" fontSize="10" fill="currentColor">示例：RTT = 100ms</text>
  </svg>
</box>

这里有一个容易混淆的概念：

- **带宽**：单位时间内能传输多少数据。
- **延迟**：数据在网络中往返需要多长时间。

一个网络可以拥有 500Mbps 的带宽，但 RTT 仍然达到 150ms。

所以，网速快不代表网页一定加载快。

网页尤其容易受到延迟影响，因为关键资源之间可能存在依赖关系。

### 2. TCP 三次握手

在使用 HTTP/1.1 或 HTTP/2 的普通 HTTPS 连接中，通常先建立 TCP 连接。

典型的 TCP 三次握手是：

```text
客户端                   服务器
  |                        |
  | ------ SYN ----------> |
  |                        |
  | <---- SYN + ACK ------ |
  |                        |
  | ------ ACK ----------> |
  |                        |
  |      连接建立          |
```

建立新的 TCP 连接通常需要约 1 个 RTT（不考虑特殊情况）。

浏览器和服务器之间距离越远、网络越拥塞，握手所需时间就可能越大。

### 3. TLS：HTTPS 为什么需要握手？

TCP 建立之后，HTTPS 还需要协商加密连接。

TLS 会完成包括服务器身份验证、密钥协商在内的操作。

以 TLS 1.3 为例，完整的首次握手通常需要约 1 个额外 RTT，之后才能正常发送应用层数据；连接恢复可能减少这部分开销。

因此，使用 HTTP/2 + TLS 1.3 的典型新建连接，可以粗略理解为：

```text
DNS 查询
   ↓
TCP 握手：约 1 RTT
   ↓
TLS 1.3 握手：约 1 RTT
   ↓
HTTP 请求
```

这里说的只是连接阶段，不包含随后 HTTP 请求与响应自身的网络往返，也不是所有协议的固定耗时。

### 4. HTTP/3 为什么可能更快？

HTTP/3 使用 QUIC，而不是传统的 TCP 作为底层传输协议。

QUIC 基于 UDP 实现可靠传输，并集成了 TLS 1.3 的安全握手。

<box border radius="lg" padding={3} gap={2}>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3} gap={1} height="100%">
        **HTTP/2**

        <text size="xs" color="secondary">HTTP</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">TLS</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">TCP</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">IP</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3} gap={1} height="100%">
        **HTTP/3**

        <text size="xs" color="secondary">HTTP</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">QUIC + TLS</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">UDP</text>
        <divider color="subtle"/>
        <text weight="medium" size="sm">IP</text>
      </box>
    </grid-item>
  </grid>
</box>

QUIC 的主要优势包括：

- 首次建立安全连接通常可以在 1 RTT 内完成。
- 恢复连接时，在满足条件的情况下可以使用 0-RTT 数据。
- 避免 TCP 层丢包造成的跨 HTTP 流队头阻塞。
- 支持连接迁移，例如移动设备切换网络。

不过，**HTTP/3 不意味着所有网页一定比 HTTP/2 快**。实际效果依赖网络质量、服务器配置、缓存和请求结构。

#### 这一阶段的优化重点

- 通过 CDN 或边缘节点缩短网络距离。
- 尽可能复用已有连接。
- 避免无意义的跨域连接。
- 让服务端支持合适的现代协议。
- 谨慎对关键跨域资源使用 `preconnect`。

<text color="secondary" size="sm">第二阶段结论：网络性能不仅取决于下载速度，也取决于建立连接需要多少次等待。</text>

---

## 四、第三阶段：发送 HTTP 请求，服务器生成 HTML

假设网络连接已经建立，浏览器开始请求商品页：

```http
GET /products/shoes HTTP/2
Host: shop.example.com
Accept: text/html
```

服务器收到请求后，并不是简单地返回一个文件就结束了。

不同技术架构的处理过程可能完全不同。

### 1. 静态网站与动态网站的区别

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">静态页面（例如预生成 HTML）</text>
  <box background="surface-secondary" padding={3} radius="md">
    <text size="sm" textAlign="center">请求 → CDN / 静态文件 → HTML 响应</text>
  </box>
  <divider color="subtle"/>
  <text weight="medium" size="sm">动态服务端渲染页面（以 Shopify Theme 为例）</text>
  <box background="surface-secondary" padding={3} radius="md" gap={1}>
    <text size="sm" textAlign="center">请求 → CDN / 边缘层 → Shopify 服务端</text>
    <row justify="center">
      <icon name="arrow-down" color="tertiary"/>
    </row>
    <text size="sm" textAlign="center">读取产品数据 → 执行 Liquid → 生成 HTML</text>
    <row justify="center">
      <icon name="arrow-down" color="tertiary"/>
    </row>
    <text size="sm" textAlign="center">返回浏览器</text>
  </box>
  <caption>实际请求是否命中缓存、需要哪些内部数据访问，由平台和请求条件决定。</caption>
</box>

你之前学习过 Shopify Liquid，现在应该能更直观地理解它的位置了。

例如：

```liquid
<h1>{{ product.title }}</h1>

<p>
  {{ product.price | money }}
</p>
```

这段 Liquid 通常是在 Shopify 服务端完成渲染的。

浏览器最终拿到的可能是：

```html
<h1>Running Shoes</h1>

<p>$99.00</p>
```

**浏览器不需要执行 Liquid，也不需要理解 `product` 对象是什么。**

它只需要解析服务端已经生成好的 HTML。

### 2. TTFB：服务器响应速度的重要指标

TTFB（Time to First Byte）表示从导航开始，到浏览器收到主文档响应第一个字节的时间。

可以简化理解成：

\[
TTFB \approx T_{\text{重定向}}+T_{\text{建连}}+T_{\text{请求传输}}+T_{\text{服务端处理}}+T_{\text{首字节返回}}
\]

因此，TTFB 并不等于纯粹的服务器执行时间。

假设：

| 阶段 | 耗时（示例） |
|---|---:|
| DNS | 40ms |
| TCP + TLS | 180ms |
| 请求发送及传播 | 80ms |
| 服务端处理 | 400ms |
| 首字节返回传播 | 80ms |
| **TTFB** | **780ms** |

这是用于说明概念的示例，不代表任何真实网站的测量数据。

这里可以得出第一个非常重要的结论：

**即使 HTML 只有 20KB，如果服务器迟迟不开始返回，浏览器也无法及时发现 HTML 内部的 CSS、图片和 JS 资源。**

### 3. 如何优化这个阶段？

从前端和架构两方面考虑：

- **减少重定向**：避免用户先经历多次 301/302 才进入最终页面。
- **使用 CDN 缓存**：让可缓存响应尽可能从靠近用户的节点返回。
- **优化服务端处理**：减少慢查询、重复计算、不必要的同步依赖。
- **利用流式 HTML**：在适合的 SSR 架构下，先输出可以提前生成的 HTML，而不是必须等所有数据准备好。
- **合理设计缓存策略**：区分公共页面、个性化内容和敏感数据，不要盲目缓存整个 HTML。

对于 Shopify Theme 开发者来说，服务器底层和平台缓存策略往往不是完全可控的，但仍可以避免不必要的 Liquid 计算，并减少 Theme 对额外客户端请求的依赖。

<text color="secondary" size="sm">第三阶段结论：TTFB 越高，通常意味着后续关键资源被发现和页面开始呈现的时间也越晚。</text>

---

## 五、第四阶段：浏览器解析 HTML，构建 DOM 和 CSSOM

这是前端性能优化中最值得深入理解的一部分。

当浏览器开始收到 HTML，它**不需要等整个 HTML 下载完成才开始解析**。只要数据陆续到达，浏览器就可以逐步解析，并发现更多资源。

### 1. HTML 是怎么变成 DOM 的？

假设浏览器收到以下代码：

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>商品详情</h1>
    <div class="product">
      <img src="shoes.jpg">
      <p>售价：¥299</p>
    </div>
  </body>
</html>
```

浏览器的 HTML 解析器会对输入进行分词、树构建，最终形成 DOM（Document Object Model）。

概念上类似：

<box border radius="lg" padding={3}>
  <svg viewBox="0 0 340 246" width="100%">
    {#each [
      {x:132,y:6,w:76,t:"Document"},
      {x:132,y:48,w:76,t:"html"},
      {x:46,y:96,w:85,t:"head"},
      {x:209,y:96,w:85,t:"body"},
      {x:12,y:146,w:100,t:"link"},
      {x:128,y:146,w:78,t:"h1"},
      {x:232,y:146,w:97,t:"div.product"},
      {x:210,y:198,w:54,t:"img"},
      {x:277,y:198,w:54,t:"p"}
    ] as n}
      <rect x={n.x} y={n.y} width={n.w} height="32" rx="7" fill="#3b82f6" fillOpacity=".10" stroke="#3b82f6" strokeOpacity=".45"/>
      <text x={n.x+n.w/2} y={n.y+20} textAnchor="middle" fontSize="11" fontWeight="500" fill="currentColor">{n.t}</text>
    {/each}
    <g stroke="currentColor" strokeOpacity=".38" strokeWidth="1.5" fill="none">
      <path d="M170 38 V48 M170 80 V88 H88 V96 M170 88 H251 V96 M88 128 V138 H62 V146 M251 128 V138 H167 V146 M251 138 H280 V146 M280 178 V190 H237 V198 M280 190 H304 V198"/>
    </g>
  </svg>
  <caption>简化 DOM 树。实际 DOM 还包括文本节点等。</caption>
</box>

DOM 可以理解为浏览器对 HTML 文档建立的结构化对象模型。

JavaScript 里的：

```js
document.querySelector(".product");
```

实际上就是在这个 DOM 树中查找对应的元素。

#### DOM 构建会慢吗？

会，但不能简单认为 DOM 节点越多，HTML 解析就一定是最大的瓶颈。

大量节点更明显的影响可能出现在后续的样式计算、布局、绘制、内存占用以及 JavaScript 操作中。

对于电商网站尤其需要注意：一个集合页如果一次渲染几百张商品卡片，每张卡片又包含几十个节点，最终 DOM 数量可能非常庞大。

因此，优化集合页的 DOM 结构、合理分页或渐进渲染，有时比单纯压缩 HTML 更有效。

### 2. CSS 如何变成 CSSOM？

浏览器发现：

```html
<link rel="stylesheet" href="style.css">
```

它会请求 CSS 文件并解析样式规则，形成 CSSOM（CSS Object Model）。

例如：

```css
.product {
  display: flex;
  gap: 24px;
}

.product img {
  width: 300px;
}
```

CSSOM 包含浏览器用于确定元素样式的信息。

最终 DOM 与样式信息会共同参与渲染树的构建。

但问题来了：

**如果 CSS 还没有下载完成，浏览器能不能显示页面？**

通常情况下，普通匹配当前设备条件的外部样式表是渲染阻塞资源。

原因很容易理解。

如果 HTML 已经出现：

```html
<h1>商品标题</h1>
```

但 CSS 尚未加载，而它随后可能定义：

```css
h1 {
  display: none;
}
```

浏览器不能保证此时直接绘制的结果就是正确的最终样式。

所以关键 CSS 可能会阻止首次内容绘制，但这不等于它一定会停止 HTML 解析。

MDN 对这条关键渲染路径的解释也强调了 DOM、CSSOM、Render Tree 和 Layout 之间的依赖关系。

#### CSS 的优化思路

首先是减少首屏必须等待的 CSS 总量。

例如，整个网站有 300KB CSS，其中只有 20KB 用于首屏。

让浏览器为了显示首屏内容而等待所有 CSS，并不总是合理。

一种可选方案是内联少量关键 CSS：

```html
<style>
  .header {
    height: 64px;
  }

  .hero {
    min-height: 500px;
  }
</style>
```

再让非关键样式采用合适的延后加载策略。

不过不能盲目把所有 CSS 都改成异步，因为这可能导致样式闪烁、布局偏移和更复杂的依赖问题。

---

## 六、第五阶段：JavaScript、CSS、图片的加载顺序

这是最容易产生性能问题的阶段之一。

**同样的资源，仅仅改变它在 HTML 中的位置或加载方式，就可能明显改变页面显示时间。**

### 1. 为什么普通 script 会阻塞 HTML 解析？

考虑这段代码：

```html
<body>
  <h1>商品标题</h1>

  <script src="app.js"></script>

  <div class="product-detail">
    商品详情
  </div>
</body>
```

当 HTML 解析器遇到没有 `async`、`defer` 等特殊处理的经典脚本时，通常会暂停继续构建后面的 DOM。

如果 `app.js` 还没下载，浏览器需要等待它。

文件下载完成后，还需要执行 JavaScript，然后才能继续正常解析后面的 HTML。

为什么？

因为 JS 可以修改 HTML 解析结果。

例如脚本可以调用：

```js
document.write("<p>插入的内容</p>");
```

因此，解析器不能总是假设脚本与后续 HTML 互不影响。

这就是所谓的**解析阻塞（Parser Blocking）**。

另外，如果脚本之前存在尚未就绪、会阻塞脚本执行的样式表，脚本执行还可能继续等待 CSS。

### 2. async 和 defer 究竟有什么区别？

这两个属性你可能经常使用，但它们真正解决的是不同的问题。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">简化时间线：HTML 解析与脚本下载、执行</text>
  <svg viewBox="0 0 342 200" width="100%">
    <g fontSize="10.5" fill="currentColor">
      <text x="3" y="26">普通</text>
      <text x="3" y="82">async</text>
      <text x="3" y="138">defer</text>
    </g>
    {#each [14,70,126] as y}
      <line x1="60" y1={y+16} x2="332" y2={y+16} stroke="currentColor" strokeOpacity=".13"/>
    {/each}
    <g>
      <rect x="62" y="14" width="68" height="18" rx="3" fill="#3b82f6"/>
      <rect x="130" y="14" width="54" height="18" rx="3" fill="#94a3b8"/>
      <rect x="184" y="14" width="39" height="18" rx="3" fill="#ef9761"/>
      <rect x="223" y="14" width="107" height="18" rx="3" fill="#3b82f6"/>
      <text x="157" y="26" textAnchor="middle" fontSize="9" fill="#fff">下载</text>
      <text x="203.5" y="26" textAnchor="middle" fontSize="9" fill="#fff">执行</text>
    </g>
    <g>
      <rect x="62" y="70" width="120" height="18" rx="3" fill="#3b82f6"/>
      <rect x="182" y="70" width="39" height="18" rx="3" fill="#ef9761"/>
      <rect x="221" y="70" width="109" height="18" rx="3" fill="#3b82f6"/>
      <rect x="130" y="96" width="52" height="10" rx="2" fill="#94a3b8"/>
      <text x="156" y="104" textAnchor="middle" fontSize="8" fill="#fff">下载</text>
    </g>
    <g>
      <rect x="62" y="126" width="268" height="18" rx="3" fill="#3b82f6"/>
      <rect x="130" y="152" width="100" height="10" rx="2" fill="#94a3b8"/>
      <rect x="291" y="152" width="39" height="10" rx="2" fill="#ef9761"/>
    </g>
    <g fontSize="10" fill="currentColor">
      <rect x="37" y="181" width="9" height="9" rx="1" fill="#3b82f6"/>
      <text x="51" y="189">HTML 解析</text>
      <rect x="132" y="181" width="9" height="9" rx="1" fill="#94a3b8"/>
      <text x="146" y="189">脚本下载</text>
      <rect x="223" y="181" width="9" height="9" rx="1" fill="#ef9761"/>
      <text x="237" y="189">脚本执行</text>
    </g>
  </svg>
  <caption>示意图，不按实际时间比例。async 的下载可与 HTML 解析并行，但脚本实际执行时仍可能占用主线程。</caption>
</box>

| 加载方式 | 下载 | 执行时机 | 典型用途 |
|---|---|---|---|
| 普通 `script` | 遇到标签时发起 | 通常阻塞解析并执行 | 必须同步运行的脚本 |
| `async` | 与解析并行 | 下载就绪后尽快执行，可能打断解析 | 独立统计、第三方脚本 |
| `defer` | 与解析并行 | HTML 解析完成后、DOMContentLoaded 前，按顺序执行 | 依赖 DOM 的页面逻辑 |
| `type="module"` | 通常并行加载模块依赖 | 默认具有类似 defer 的行为 | 模块化应用代码 |

要特别注意：

`defer` 不意味着 JavaScript 不消耗执行时间，它只是改变了脚本何时执行。

例如：

```html
<script src="product.js" defer></script>
```

这样能避免脚本下载过程阻塞 HTML 解析，但如果脚本本身执行了 800ms，主线程仍然可能被它占用。

### 3. 浏览器会不会同时下载多个资源？

会。

现代浏览器有资源加载与调度机制，并不是遇到一个资源就必须等它完成再下载下一个。

它还有预加载扫描器（Preload Scanner），能够提前发现 HTML 中的一些资源引用。

比如：

```html
<link rel="stylesheet" href="main.css">

<script src="app.js" defer></script>

<img src="hero.webp">
```

在合适条件下，三个资源可以并行下载。

但是并行不等于速度完全不受影响。

网络带宽、协议、连接限制、资源优先级都会影响它们的实际加载顺序和完成时间。

### 4. 为什么要区分 preload、prefetch 和 lazy loading？

因为它们服务于不同的场景。

| 技术 | 核心意图 |
|---|---|
| `preload` | 当前页面很快就要用的关键资源，提前下载 |
| `prefetch` | 未来可能使用的资源，提前低优先级获取 |
| `preconnect` | 提前与目标源建立连接 |
| `loading="lazy"` | 推迟加载暂时不需要的资源 |
| `fetchpriority="high"` | 提示浏览器提高某项资源的获取优先级 |

这里出现了一个关键的性能优化思想：

**真正重要的不是让所有资源都尽快加载，而是让影响首屏的关键资源优先完成。**

举个例子。

Shopify 商品详情页有 10 张图片。

如果第一张商品主图是首屏最大的元素，我们希望它尽快下载。

```html
<img
  src="main.webp"
  width="800"
  height="800"
  loading="eager"
  fetchpriority="high"
  alt="商品主图"
>
```

而下面几张当前屏幕不可见的图片，可以考虑：

```html
<img
  src="detail-5.webp"
  width="800"
  height="800"
  loading="lazy"
  alt="商品细节"
>
```

对 LCP 资源而言，尽早被发现、尽快开始下载，比盲目减少所有图片数量更直接。

Google 对 LCP 的官方拆解也强调了资源发现延迟和元素渲染延迟的重要性。

---

## 七、第六阶段：浏览器真正把页面绘制到屏幕上

这是整节课的核心。

当浏览器完成必要的资源解析后，HTML 和 CSS 并不会直接变成像素。

它们还需要经过一条关键渲染路径：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 270" width="100%">
    <rect x="6" y="6" width="146" height="42" rx="7" fill="#3b82f6" fillOpacity=".13" stroke="#3b82f6" strokeOpacity=".5"/>
    <rect x="188" y="6" width="146" height="42" rx="7" fill="#3b82f6" fillOpacity=".13" stroke="#3b82f6" strokeOpacity=".5"/>
    <text x="79" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">DOM</text>
    <text x="261" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">CSSOM</text>
    <path d="M79 48 V62 H170 V76 M261 48 V62 H170" stroke="currentColor" strokeOpacity=".5" fill="none" strokeWidth="1.5"/>
    {#each [
      {y:76,t:"Style / Render Tree",s:"计算样式、确定参与渲染的对象"},
      {y:139,t:"Layout",s:"计算元素几何尺寸与位置"},
      {y:202,t:"Paint → Composite",s:"绘制内容、合成并显示"}
    ] as n,i}
      <rect x="57" y={n.y} width="226" height="51" rx="8" fill={i===2?"#0d9488":"#64748b"} fillOpacity=".11" stroke={i===2?"#0d9488":"#94a3b8"} strokeOpacity=".6"/>
      <text x="170" y={n.y+21} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">{n.t}</text>
      <text x="170" y={n.y+37} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".68">{n.s}</text>
      {#if i<2}
        <path d={`M170 ${n.y+51} v12 m-4 -4 l4 4 4 -4`} stroke="currentColor" strokeOpacity=".45" fill="none"/>
      {/if}
    {/each}
  </svg>
</box>

我们逐一理解。

### 1. Style：计算样式

假设：

```html
<div class="box">Hello</div>
```

CSS：

```css
.box {
  width: 200px;
  padding: 20px;
  background: red;
}
```

浏览器需要计算最终生效的样式。

这会涉及 CSS 选择器匹配、层叠规则、继承、样式计算等。

如果 JS 修改了一个影响大量元素的类：

```js
document.body.classList.add("dark");
```

浏览器可能需要重新计算多个元素的样式。

这就是常见的 Recalculate Style。

### 2. Layout：计算布局

浏览器接下来要确定每个参与布局的元素：

- 宽度是多少？
- 高度是多少？
- 在页面中哪个位置？
- 与相邻元素的关系是什么？

例如：

```css
.box {
  width: 300px;
  height: 200px;
  margin-top: 20px;
}
```

浏览器需要计算这个盒子的几何信息。

这就是 Layout，有时也被称为 Reflow。

#### 为什么频繁修改宽度会影响性能？

例如：

```js
const box = document.querySelector(".box");

box.style.width = "400px";
```

修改宽度后，浏览器可能需要重新计算受影响元素的布局。

如果大量元素相互依赖，布局计算的成本可能很高。

还有一种更容易出现的性能问题：**强制同步布局（Forced Synchronous Layout）**。

看下面的代码：

```js
const boxes = document.querySelectorAll(".box");

boxes.forEach((box, index) => {
  box.style.width = `${200 + index}px`;

  // 紧接着读取几何信息
  console.log(box.offsetWidth);
});
```

当样式更新使布局失效后，读取 `offsetWidth` 等布局属性可能迫使浏览器提前计算布局。

如果在循环中反复交替写入和读取，容易产生 Layout Thrashing（布局抖动）。

更合理的方式是在业务允许时批量读取，再批量修改，减少不必要的同步布局计算。

### 3. Paint：绘制

布局完成之后，浏览器还要决定如何绘制。

例如：

```css
.card {
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 4px 12px #0002;
}
```

绘制阶段需要处理背景、边框、文本、阴影等视觉内容。

某些 CSS 属性变化不需要重新布局，却仍然可能触发重新绘制。

例如改变背景颜色：

```js
card.style.backgroundColor = "red";
```

通常不会影响元素的几何尺寸，但可能需要重新 Paint。

### 4. Composite：合成

现代浏览器可以将部分内容放入不同的合成层中处理。

一些效果，例如适当条件下的 `transform` 和 `opacity` 动画，可以通过合成阶段更新，避免反复进行主线程布局和绘制。

这就是为什么下面两种动画在很多场景下性能不同。

<box gap={2}>
  <text weight="medium" size="sm">实际体验：两种横向移动方式</text>
  {@body const [animate,setAnimate] = DIL.useState(false)}
  <box border radius="lg" padding={3} gap={2}>
    <row justify="between" align="center">
      <text size="xs" color="secondary">修改布局位置（left）</text>
      <badge color="secondary">可能触发 Layout</badge>
    </row>
    <box background="surface-tertiary" radius="md" height="36px" justify="center" padding={{x:2}}>
      <box width="34px" height="20px" radius="sm" background="#d97706"/>
    </box>
    <row justify="between" align="center">
      <text size="xs" color="secondary">合成友好（transform）</text>
      <badge color="success">通常无需 Layout</badge>
    </row>
    <box background="surface-tertiary" radius="md" height="36px" justify="center" padding={{x:2}}>
      <box width="34px" height="20px" radius="sm" background="#0d9488"/>
    </box>
    <caption>这里是结构示意。真正的成本差异要以 Chrome Performance 录制结果为准，并非所有 transform 动画都一定零开销。</caption>
  </box>
</box>

对应的代码：

```css
/* 容易引发布局更新 */
.box {
  position: relative;
  transition: left 300ms;
}

.box.move {
  left: 100px;
}

/* 通常更适合合成 */
.box {
  transition: transform 300ms;
}

.box.move {
  transform: translateX(100px);
}
```

但也不能无限制地给元素增加合成层，因为额外图层可能占用大量内存。

**这一阶段最重要的知识点：**

DOM 或 CSS 发生变化，不意味着每次都必须完整经历 Layout、Paint 和 Composite 的所有步骤。

浏览器会根据具体属性和影响范围尽可能复用已有结果。

优化的关键是减少不必要的计算，并尽可能缩小每次更新波及的范围。

---

## 八、第七阶段：JavaScript 执行与页面交互

现在我们假设商品详情页已经显示出来了。

商品图片能看到，标题也能看到。

但用户点击「加入购物车」时，按钮过了将近一秒才有反应。

为什么？

因为**页面能够显示和页面能够流畅交互，是两件不同的事情。**

### 1. 浏览器主线程到底负责什么？

在典型浏览器中，页面主线程要处理很多重要工作，包括 JavaScript 执行、部分 DOM 和样式操作、布局、绘制准备及用户事件的处理。

如果 JavaScript 长时间占用主线程，就可能影响其他工作。

例如：

```js
const start = performance.now();

while (performance.now() - start < 1000) {
  // 模拟耗时计算
}
```

这个任务会持续占用主线程大约一秒。

假设用户在它运行期间点击按钮。

即使按钮已经绑定了 `click` 事件，相关事件处理也可能需要等待主线程空闲。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">主线程任务阻塞示意</text>
  <svg viewBox="0 0 340 125" width="100%">
    <line x1="15" y1="82" x2="327" y2="82" stroke="currentColor" strokeOpacity=".3"/>
    <rect x="15" y="33" width="228" height="36" rx="5" fill="#e07a5f" fillOpacity=".25" stroke="#e07a5f"/>
    <text x="129" y="54" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">JavaScript 长任务</text>
    <rect x="245" y="33" width="75" height="36" rx="5" fill="#0d9488" fillOpacity=".18" stroke="#0d9488"/>
    <text x="282" y="54" textAnchor="middle" fontSize="10" fill="currentColor">处理点击</text>
    <path d="M100 8 V30" stroke="#e07a5f" strokeWidth="2" strokeDasharray="3 2"/>
    <circle cx="100" cy="8" r="4" fill="#e07a5f"/>
    <text x="109" y="13" fontSize="10" fill="currentColor">用户点击</text>
    <path d="M100 91 H245" stroke="#e07a5f" strokeWidth="1.5" strokeDasharray="4 3"/>
    <text x="172" y="104" textAnchor="middle" fontSize="10" fill="currentColor">等待主线程空闲</text>
    <text x="15" y="120" fontSize="9" fill="currentColor" opacity=".65">时间向右 →</text>
  </svg>
</box>

用户感受到的就是：点击了，但没有立即响应。

### 2. 什么是 Long Task？

通常，当主线程上的某个任务持续执行超过 50ms，就会被认为是 Long Task（长任务）。

长任务本身不是唯一问题，真正重要的是它有没有影响用户输入和页面更新。

例如一个耗时 300ms 的任务可能完全阻塞后面的交互处理。

#### 怎么优化？

假设我们需要处理 10,000 条数据：

```js
function processItems(items) {
  items.forEach((item) => {
    heavyCalculation(item);
  });
}
```

如果全部同步执行，可能出现长任务。

一种思路是将工作拆成小批次，让主线程有机会处理输入和渲染。

另外也可以考虑 Web Worker，把适合的 CPU 密集型计算放在工作线程中执行。

需要注意，Web Worker 不能像主线程一样直接操作 DOM。

### 3. INP 为什么不只是事件处理耗时？

INP（Interaction to Next Paint）测量交互响应表现。

一次交互的延迟可以拆成：

\[
INP_{\text{交互}} =
T_{\text{输入等待}}+
T_{\text{事件处理}}+
T_{\text{呈现延迟}}
\]

其中最后一部分非常容易被忽略。

例如：

```js
button.addEventListener("click", () => {
  drawer.classList.add("open");
});
```

事件处理函数可能只用了 2ms。

但如果打开弹窗引发大量布局计算、绘制或者其他主线程工作，用户仍然可能等待很久才看到结果。

所以优化 INP 时，要同时关注事件处理前的等待、事件处理本身以及下一帧呈现的时间。

#### Shopify 中的典型案例

用户点击加入购物车后：

```text
点击加入购物车
       ↓
发送 Cart Ajax API
       ↓
获取购物车数据或新的 Section HTML
       ↓
更新 Cart Drawer DOM
       ↓
重新计算样式与布局
       ↓
显示购物车弹窗
```

这里可能存在不同的性能瓶颈。

接口请求慢属于网络与服务端问题；事件回调计算量大属于 JS 问题；更新上千个 DOM 节点导致卡顿属于渲染问题。

而用户看到购物车弹窗的整体等待时间，还可能包含异步请求的耗时，这与单次交互的 INP 测量范围并不完全相同。

---

## 九、页面究竟什么时候才算加载完成？

这是前端开发中一个经常被混淆的问题。

浏览器没有一个能够代表所有用户体验都已准备就绪的统一时间点。

我们需要区分几个概念。

| 事件或指标 | 代表什么 |
|---|---|
| TTFB | 收到 HTML 响应首字节 |
| FCP | 首次绘制可见文本、图片等内容 |
| DOMContentLoaded | HTML 解析完成，defer 和普通模块脚本已执行 |
| LCP | 视口内最大合格内容元素完成绘制 |
| load | 文档及参与该事件等待的依赖资源加载完成 |
| INP | 用户交互的响应性指标，不是页面加载里程碑 |

特别注意，`DOMContentLoaded` 不会等待普通图片全部下载，`load` 也不代表用户后续的异步请求或懒加载已经全部结束。

举个假设的例子：

<Chart content={{"chartType":"bar","meta":{"title":"某商品页的加载里程碑（模拟数据）","description":"单位：秒。不同事件可以交错，INP 不在该加载时间线上。"},"xKey":"stage","series":[{"dataKey":"time","label":"导航开始后的时间","valueSuffix":"s"}],"yAxisMin":0,"yAxisMax":5,"data":[{"stage":"TTFB","time":0.8},{"stage":"FCP","time":1.3},{"stage":"DOMContentLoaded","time":1.8},{"stage":"LCP","time":3.1},{"stage":"load","time":4.5}]}}/>

这个例子说明，用户可能在 1.3 秒就看到一些内容，但直到 3.1 秒才看到商品主图。

`load` 事件更晚，并不意味着页面在这之前完全不可用。

---

## 十、把所有知识串起来：分析一个真实类型的问题

假设某 Shopify 商品详情页的 LCP 是 4 秒。

现在我们知道，应该如何逐步分析。

Google 将具有外部加载资源的 LCP 拆分为四个部分：TTFB、资源加载延迟、资源加载时间和元素渲染延迟。

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">LCP = 4,000ms（模拟案例）</text>
  <box direction="row" height="30px" radius="sm" clip gap="1px">
    <box background="#64748b" flex={800} justify="center" align="center">
      <text color="#ffffff" weight="medium" size="2xs">800</text>
    </box>
    <box background="#d97706" flex={1000} justify="center" align="center">
      <text color="#ffffff" weight="medium" size="2xs">1000</text>
    </box>
    <box background="#3b82f6" flex={1200} justify="center" align="center">
      <text color="#ffffff" weight="medium" size="2xs">1200</text>
    </box>
    <box background="#0d9488" flex={1000} justify="center" align="center">
      <text color="#ffffff" weight="medium" size="2xs">1000</text>
    </box>
  </box>
  <box gap={2}>
    {#each [
      {name:"TTFB",ms:"800ms",color:"#64748b",desc:"网络和服务器响应耗时"},
      {name:"Resource Load Delay",ms:"1,000ms",color:"#d97706",desc:"浏览器收到 HTML 后，延迟开始下载主图"},
      {name:"Resource Load Duration",ms:"1,200ms",color:"#3b82f6",desc:"主图本身的下载耗时"},
      {name:"Element Render Delay",ms:"1,000ms",color:"#0d9488",desc:"主图已下载，但还没完成显示"}
    ] as x}
      <row align="start" gap={2}>
        <box background={x.color} size="10px" radius="sm"/>
        <box flex="1" gap="2px">
          <row justify="between">
            <text weight="medium" size="sm">{x.name}</text>
            <text weight="medium" size="sm" tabularNums>{x.ms}</text>
          </row>
          <text color="secondary" size="xs">{x.desc}</text>
        </box>
      </row>
    {/each}
  </box>
</box>

接下来我们就能有针对性地优化。

**如果主要瓶颈是 TTFB：** 排查重定向、服务器响应、Liquid 执行以及缓存情况。

**如果主要瓶颈是 Resource Load Delay：** 检查主图是否通过 JavaScript 延迟插入、是否不正确地设置了懒加载，以及资源发现和优先级。

**如果主要瓶颈是 Resource Load Duration：** 检查图片是否过大、是否根据设备提供合理尺寸、CDN 和网络传输效率如何。

**如果主要瓶颈是 Element Render Delay：** 排查阻塞渲染的 CSS、同步脚本、主线程长任务、隐藏动画等。

对 Shopify 还有一个特别值得注意的细节：平台可能流式返回 HTML，因此 TTFB 只反映最早返回的文档部分，后续 Liquid 渲染耗时也可能表现为主文档下载时间，而不只是 TTFB。Shopify 官方性能指南对此有专门说明。

---

## 十一、如何在 Chrome DevTools 中观察整个过程？

现在给你一个实际操作方法。

### 第一步：观察 Network 请求瀑布图

打开任意网站，按 F12，然后进入 **Network**。

建议先勾选 Disable cache（仅在 DevTools 打开期间有效），然后刷新页面。

点击最上方的主文档请求，再选择 Timing。

<LessonImage src="assets/cached/cached-01.jpg" alt="Chrome DevTools Network Timing tab waterfall request timing breakdown DNS Lookup Initial connection Waiting for server response Content Download screenshot"/>

你会看到与这些阶段相关的信息：

| DevTools 项目 | 对应我们学过的阶段 |
|---|---|
| Queueing / Stalled | 资源调度与等待 |
| DNS Lookup | DNS 解析 |
| Initial connection | 建立连接 |
| SSL | TLS 握手 |
| Request sent | 发送请求 |
| Waiting for server response | 等待响应首字节 |
| Content Download | 接收响应内容 |

它们不一定每次都会出现。例如复用已有连接时，DNS 或建连阶段可能为零。

### 第二步：观察浏览器渲染过程

切换到 DevTools 的 **Performance** 面板。

点击录制并刷新页面。

你可以重点查看：

- Network：资源是什么时候发起、什么时候下载完成的。
- Timings / Insights：FCP、LCP 等关键节点。
- Main：JavaScript 执行、样式计算、Layout 和 Paint 相关任务。
- Screenshots：页面在各个时刻实际显示成什么样。

尤其要观察有没有特别长的主线程任务，以及 LCP 资源加载完成后是否还经历了很长的渲染等待。

### 第三步：在控制台直接查看导航耗时

浏览器提供了 Performance API。

你可以直接执行：

```js
const nav = performance.getEntriesByType("navigation")[0];

if (nav) {
  console.table({
    DNS: nav.domainLookupEnd - nav.domainLookupStart,
    TCP连接: nav.connectEnd - nav.connectStart,
    TTFB: nav.responseStart - nav.startTime,
    HTML响应读取: nav.responseEnd - nav.responseStart,
    DOMContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    Load: nav.loadEventEnd - nav.startTime,
  });
}
```

单位是毫秒。

注意，这些数据来自浏览器的导航计时记录。TLS 可能包含在连接阶段中，缓存或连接复用也会改变测量结果，且这里的 `TTFB` 指导航开始到首字节，并非纯服务器处理时间。

---

## 十二、本课总结：性能优化的本质

到这里，我们已经完整走过一次典型的网站加载与渲染流程。

把整节课压缩成一张表：

| 阶段 | 主要瓶颈 | 优化方向 |
|---|---|---|
| DNS | 域名解析慢 | 缓存、减少关键域名 |
| 建立连接 | 高 RTT、重复握手 | CDN、连接复用、现代协议 |
| 服务端响应 | 慢查询、模板渲染、重定向 | 缓存、优化服务端逻辑 |
| HTML 解析 | 阻塞脚本、复杂 DOM | 改善脚本加载、精简 DOM |
| 资源加载 | 阻塞 CSS、错误优先级 | 关键资源优先、延后非关键资源 |
| Layout / Paint | 大量布局、绘制计算 | 减少布局抖动和重绘 |
| JS 执行 | 长任务、主线程阻塞 | 拆分任务、减少 JS、Worker |
| 用户交互 | 输入等待、执行和呈现延迟 | 优化 INP 和交互链路 |

这里我最希望你建立的不是对某项具体技术的记忆，而是这样一个性能优化思维：

**网站性能优化，就是识别关键路径上的等待，尽可能让必须进行的工作提前、并行或更高效地完成，同时减少非必要工作对浏览器主线程和网络资源的占用。**

对于你后续开发 Shopify Theme 来说，这套原理会直接影响你怎么组织 `theme.liquid`、怎么引入 CSS 和 JavaScript、什么时候渲染 Section、什么时候懒加载图片、如何管理第三方 App 脚本。

## 参考资料

- [Navigation and resource timings - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Navigation_and_resource_timings)
- [Critical rendering path - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [Populating the page: how browsers work - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [Document: DOMContentLoaded event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [Window: load event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event)
- [Window: load event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event?from=20423&from_column=20423)
- [Document: readyState property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState)
- [LCP breakdown | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/lcp-breakdown?authuser=68)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/network/reference)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/network/reference/?authuser=53)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/network/reference/?trk=article-ssr-frontend-pulse_little-text-block)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/network/reference?authuser=0&hl=en)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp/)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?hl=en)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?from=dout.dev)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?authuser=115)
- [Optimize Interaction to Next Paint | web.dev](https://web.dev/articles/optimize-inp)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=80)
- [How the Core Web Vitals metrics thresholds were defined | Articles | web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?authuser=1&hl=en)
- [chrome-devtools-mcp/skills/debug-optimize-lcp/references/lcp-breakdown.md at main · ChromeDevTools/chrome-devtools-mcp · GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/skills/debug-optimize-lcp/references/lcp-breakdown.md)
- [content/files/en-us/learn_web_development/extensions/performance/html/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/learn_web_development/extensions/performance/html/index.md)
- [devtools-docs/docs/network.md at master · GoogleChrome/devtools-docs · GitHub](https://github.com/GoogleChrome/devtools-docs/blob/master/docs/network.md)
- [content/files/en-us/web/api/document/domcontentloaded_event/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/document/domcontentloaded_event/index.md?plain=1)
- [content/files/en-us/web/api/window/load_event/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/load_event/index.md?plain=1)
- [web.dev/src/site/content/en/blog/defining-core-web-vitals-thresholds/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/defining-core-web-vitals-thresholds/index.md)
- [web.dev/src/site/content/en/vitals/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/vitals/index.md)
- [Populating the page: how browsers work - Web Performance | MDN](https://ptacts.uspto.gov/ptacts/public-informations/petitions/1548238/download-documents?artifactId=3sunBXd81DOrU-JwODjqykXa-kBLttqIyylQXdaazkuF-3ieyHlXDDM)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Use image_url and image_tag instead of manual CDN URLs](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-shopify-image-filters-efficiently)
- [Use preload resource hints sparingly](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-preload-resource-hints-sparingly)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/network/reference?hl=en)
- [Network features reference - Microsoft Edge Developer documentation | Microsoft Learn](https://learn.microsoft.com/th-th/microsoft-edge/devtools/network/reference)
- [Understanding Core Web Vitals and Google search results | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Document: DOMContentLoaded event - 网络 API | MDN Web 中文网](https://web.nodejs.cn/en-us/docs/web/api/document/domcontentloaded_event/)
- [Core web vitals guide · Unlighthouse](https://unlighthouse.dev/learn-lighthouse/core-web-vitals)
