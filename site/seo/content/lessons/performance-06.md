# 浏览器资源加载、请求优先级与首屏性能优化


前五课，我们已经解决了三个核心问题：

1. 浏览器如何从 HTML 构建 DOM，再经过 Layout、Paint、Composite 显示页面。
2. CSS、JavaScript 为什么会阻塞解析、渲染和交互。
3. 如何使用 Chrome DevTools 定位真正的性能瓶颈。

今天进入一个极其重要的性能优化领域：

**资源加载策略（Resource Loading Strategy）。**

假设一个 Shopify 商品详情页有以下资源：

- 1 个 HTML 文档
- 4 个 CSS 文件
- 8 个 JavaScript 文件
- 12 张商品图片
- 2 个 Web Font 字体
- 3 个第三方 App 脚本

这些资源究竟按照什么顺序下载？

它们可以同时下载吗？

如果全部同时下载，会不会反而让网站变慢？

为什么主图只有 100KB，却比一张 500KB 的非关键图片显示得还晚？

这一课我们要真正理解这些问题。

---

## 一、先建立核心认知：资源不是越早下载越好

这是今天最重要的思想。

假设浏览器需要下载三种资源：

| 资源 | 大小 | 用途 |
|---|---:|---|
| `hero.webp` | 200KB | 商品首屏主图 |
| `review.js` | 300KB | 页面底部评论交互 |
| `recommendations.webp` | 400KB | 底部推荐商品图片 |

如果网络带宽有限，应该优先下载哪个？

显然，通常应该优先确保 `hero.webp` 完成。

因为用户进入商品页，首先需要看到商品主图。

但如果我们让这三种资源都拥有最高优先级，就可能出现：

```text
可用网络带宽
      ↓
  ┌───┼───┐
  ↓   ↓   ↓
主图  评论JS  推荐图
```

它们之间就会竞争网络资源。

即使浏览器能够并发下载，也不代表网络带宽无限。

因此，**资源加载优化不是单纯减少请求数量或缩小文件，而是让关键资源尽早被发现、获得合适的优先级，并减少非关键资源的竞争。**

Google 的 LCP 优化文档也强调了资源发现延迟、请求优先级和网络竞争对首屏性能的影响。

---

## 二、浏览器如何决定一个资源什么时候下载？

我们先来看浏览器资源请求的五个关键因素。

<box border radius="xl" padding={3} gap={2}>
  {#each [
    {n:"01",title:"Resource Discovery",desc:"浏览器什么时候发现资源地址？"},
    {n:"02",title:"Resource Priority",desc:"浏览器认为这个资源有多重要？"},
    {n:"03",title:"Network Scheduling",desc:"浏览器什么时候实际启动和调度请求？"},
    {n:"04",title:"Resource Transfer",desc:"连接、带宽、缓存、资源大小等如何影响传输？"},
    {n:"05",title:"Resource Consumption",desc:"资源下载后何时被解析、执行或用于渲染？"}
  ] as item,i}
    <row align="start" gap={3}>
      <box background="surface-secondary" radius="lg" size="38px" align="center" justify="center">
        <text weight="medium" color="secondary">{item.n}</text>
      </box>
      <box flex="1" gap={1}>
        **{item.title}**
        <text size="sm" color="secondary">{item.desc}</text>
      </box>
    </row>
    {#if i<4}<divider color="subtle"/>{/if}
  {/each}
</box>

注意，这五个因素不是简单串行执行的五个阶段。浏览器可以同时发现、下载、解析和执行不同资源。

其中最容易被前端开发者忽略的，是前两个：

**资源发现时间和资源优先级。**

### 1. Resource Discovery：资源什么时候被发现？

先看三个例子。

#### 方式 A：直接写在 HTML 中

```html
<img src="/images/hero.webp" alt="商品主图">
```

浏览器在扫描 HTML 时就有机会发现图片 URL。

即使后面存在一些解析阻塞脚本，预加载扫描器也可能提前发现该资源。

#### 方式 B：通过 JavaScript 动态创建

```html
<div id="hero"></div>

<script src="/scripts/product.js" defer></script>
```

`product.js`：

```js
const image = new Image();

image.src = "/images/hero.webp";

document.querySelector("#hero").append(image);
```

这时图片依赖 JavaScript 的执行。

它的请求可能必须等到：

```text
HTML 到达
   ↓
发现 product.js
   ↓
下载 JavaScript
   ↓
解析并执行 JavaScript
   ↓
发现 hero.webp
   ↓
开始下载主图
```

这就是额外的**资源发现依赖链**。

#### 方式 C：CSS 背景图

```html
<div class="hero"></div>
```

```css
.hero {
  background-image: url("/images/hero.webp");
}
```

浏览器可能需要先发现并下载 CSS，然后解析、匹配样式，才知道这张背景图需要加载。

所以，三种方式虽然显示的是同一张图片，但图片请求的开始时间可能完全不同。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">三种图片发现方式的时间线</text>
  <svg viewBox="0 0 342 168" width="100%">
    <g fontSize="10" fill="currentColor" opacity=".65">
      <text x="115" y="14">早</text>
      <text x="302" y="14">晚</text>
      <path d="M110 21 H330" stroke="currentColor" strokeOpacity=".25"/>
    </g>
    {#each [
      {y:34,label:"HTML img",start:111,delay:14},
      {y:77,label:"CSS 背景图",start:111,delay:95},
      {y:120,label:"JS 动态创建",start:111,delay:149}
    ] as item}
      <text x="5" y={item.y+13} fontSize="10.5" fill="currentColor">{item.label}</text>
      <rect x={item.start} y={item.y} width={item.delay} height="23" rx="3" fill="#94a3b8" fillOpacity=".35"/>
      <rect x={item.start+item.delay} y={item.y} width={330-item.start-item.delay} height="23" rx="3" fill="#0d9488"/>
      <text x={item.start+item.delay/2} y={item.y+15} fontSize="9" textAnchor="middle" fill="currentColor">等待</text>
      {#if item.delay<130}
        <text x={item.start+item.delay+5} y={item.y+15} fontSize="9" fill="#fff">图片下载</text>
      {/if}
    {/each}
    <text x="170" y="162" fontSize="9.5" textAnchor="middle" fill="currentColor" opacity=".7">灰色：尚未发起图片请求；绿色：开始请求</text>
  </svg>
  <caption>概念示意，不代表固定下载顺序。CSS 与 JS 可以并行获取，具体发现时间取决于文档结构、缓存、执行时机和浏览器调度。</caption>
</box>

这里可以得到第一个非常重要的优化原则：

**对首屏关键图片，优先让浏览器通过 HTML 直接发现资源地址。**

这也是 Shopify 官方现在明确推荐使用 `<img>` 而不是 CSS `background-image` 承载 LCP 主图的原因。

---

## 三、Resource Priority：浏览器如何分配请求优先级？

接下来研究一个更复杂的问题。

假设 HTML 中有这些资源：

```html
<head>
  <link rel="stylesheet" href="main.css">

  <script src="analytics.js" async></script>
</head>

<body>
  <img src="hero.webp">
  <img src="detail.webp">
</body>
```

浏览器会给不同请求分配相应的优先级。

在 Chrome Network 面板中，通常可以看到类似这些优先级：

- Highest
- High
- Medium
- Low
- Lowest

浏览器会根据资源类型、解析方式、位置以及是否进入视口等信息进行判断。

例如：

- 关键、渲染阻塞的 CSS 通常拥有较高优先级。
- 图片的初始优先级可能比关键 CSS 低。
- 图片被判断为首屏重要元素后，优先级可能提高。
- 带有 `fetchpriority` 的资源可以影响浏览器的优先级判断。

Chrome 也可能根据自己的资源加载策略，在请求过程中动态调整优先级。

### 1. 优先级不是按 HTML 顺序简单决定的

例如：

```html
<img src="thumbnail.webp">

<link rel="stylesheet" href="important.css">
```

不能仅仅因为图片先出现，就断言它一定先完成下载。

浏览器会综合判断请求的重要程度。

并且高优先级不意味着“必须等它下载完成后才能下载低优先级资源”。

多个请求可能并发执行，优先级主要影响请求调度和资源分配。

### 2. fetchpriority 能做什么？

例如：

```html
<img
  src="hero.webp"
  fetchpriority="high"
  alt="商品主图"
>
```

`fetchpriority="high"` 向浏览器表达：

**这项资源比你根据默认规则判断的更重要，请尽可能优先获取。**

它可以使用三个值：

| 值 | 含义 |
|---|---|
| `high` | 提示提高相对获取优先级 |
| `low` | 提示降低相对获取优先级 |
| `auto` | 由浏览器自行决定，默认值 |

但必须注意：

`fetchpriority` 是**提示（Hint）**，不是绝对命令。

浏览器仍然可以根据自己的策略安排请求。

例如，它不会因为你对非关键图片设置了 `high`，就自动取消 CSS 重要性、带宽限制或其他调度规则。

### 3. fetchpriority 不会主动发现资源

这是个非常重要的细节。

假设：

```html
<img
  src="hero.webp"
  fetchpriority="high"
>
```

浏览器先要发现这张图片，随后优先级提示才有意义。

如果图片本身是通过一个 2 秒后才执行的 JavaScript 动态创建的，那么即使添加 `fetchpriority="high"`，也不能让浏览器在这段 JavaScript 执行之前凭空知道图片 URL。

因此：

**Resource Discovery 解决“什么时候知道要下载”，Fetch Priority 解决“知道之后有多重视”。**

两者不能相互代替。

---

---

## 四、preload、prefetch、preconnect、dns-prefetch 到底有什么区别？

这是前端性能优化中最容易混淆的一组技术。

先给你一张总表：

| 技术 | 主要作用 | 面向什么 |
|---|---|---|
| `dns-prefetch` | 提前解析域名 | DNS |
| `preconnect` | 提前建立网络连接 | 目标 Origin |
| `preload` | 提前请求当前页面需要的资源 | 当前页面 |
| `prefetch` | 提前获取未来可能需要的资源 | 后续页面 |
| `fetchpriority` | 调整资源获取的相对优先级 | 请求调度 |

它们虽然经常一起讨论，但解决的是不同的问题。

### 1. dns-prefetch：提前解析 DNS

例如：

```html
<link
  rel="dns-prefetch"
  href="//static.example-cdn.com"
>
```

它向浏览器表达：

“这个域名之后可能会用到，可以提前做 DNS 解析。”

如果之后确实需要请求这个域名下的资源，就可能省去一部分 DNS 等待。

但它并不负责建立完整的 HTTPS 连接，也不会下载资源本身。

### 2. preconnect：提前建立连接

```html
<link
  rel="preconnect"
  href="https://static.example-cdn.com"
>
```

这比 `dns-prefetch` 更进一步。

在适用情况下，浏览器可以提前进行：

```text
DNS 查询
   ↓
TCP / QUIC 连接建立
   ↓
TLS 握手
   ↓
等待后续资源请求
```

例如，页面后面才会加载某个重要的第三方字体资源。

如果你提前建立连接，后续的字体请求就可能更快发出。

但是这里有两个注意点。

**第一，preconnect 通常主要用于重要的跨源请求。**

如果浏览器已经有可以复用的连接，额外执行 preconnect 未必有收益。

**第二，preconnect 不是越多越好。**

如果页面需要访问 15 个第三方域名，你给全部域名添加 preconnect，就可能提前建立大量实际上不需要立即使用的连接。

这些连接会消耗网络、内存等资源。

MDN 建议只对少量关键源使用 preconnect，其余源可以视情况使用成本较低的 `dns-prefetch`。

### 3. preload：提前下载当前页面的关键资源

这是本课最重要的资源提示。

例如：

```html
<link
  rel="preload"
  href="/images/hero.webp"
  as="image"
>
```

注意这里有两个属性：

- `rel="preload"`：告诉浏览器提前请求。
- `as="image"`：告诉浏览器资源的类型。

对于一张首屏图片，即使浏览器还没解析到真正的 `<img>` 标签，预加载提示也可以让请求更早开始。

#### preload 和正常资源加载有什么区别？

普通加载：

```text
浏览器解析 HTML
       ↓
发现 img 标签
       ↓
请求图片
```

添加 preload：

```text
浏览器较早发现 preload
       ↓
提前请求图片
       ↓
稍后解析到 img
       ↓
使用已获取或正在获取的资源
```

这样就缩短了图片请求的发现延迟。

不过你要注意：

**preload 只是提前获取资源，不代表立刻执行 JavaScript 或将图片绘制到屏幕上。**

例如：

```html
<link
  rel="preload"
  href="/scripts/product.js"
  as="script"
>
```

这会提示浏览器提前获取脚本，但它本身不会执行脚本。

后面还需要真正的脚本引用：

```html
<script src="/scripts/product.js" defer></script>
```

这和上一课讲的 `defer` 完全不是一回事。

`preload` 解决下载时机，`defer` 解决脚本执行时机及 HTML 解析阻塞。

#### preload 最容易犯的三个错误

**错误一：把所有图片都 preload。**

```html
<link rel="preload" as="image" href="product-1.webp">
<link rel="preload" as="image" href="product-2.webp">
<link rel="preload" as="image" href="product-3.webp">
<link rel="preload" as="image" href="product-4.webp">
```

如果只有第一张图片属于首屏重要资源，那么后面三张可能反而与第一张竞争带宽。

**错误二：资源本来就能被很早发现，却盲目添加 preload。**

如果 LCP 图片已经直接出现在早期 HTML 中，请求优先级也合理，额外添加 preload 可能没有明显收益。

但如果 preload 是通过服务器的 HTTP 响应头或 HTTP 103 Early Hints 提前发送，情况会不同。稍后我们会结合 Shopify 专门讨论。

**错误三：预加载的 URL、请求模式与实际使用不一致。**

假设你有一个响应式图片：

```html
<img
  src="hero-800.webp"
  srcset="
    hero-400.webp 400w,
    hero-800.webp 800w,
    hero-1200.webp 1200w
  "
  sizes="50vw"
>
```

浏览器可能根据当前视口和 DPR 选择下载 `hero-400.webp` 或其他候选资源。

如果你只预加载了 `hero-1200.webp`，却发现实际 `<img>` 选中了另一张资源，就可能造成不必要的重复传输。

正确的做法是在需要预加载响应式图片时，确保 preload 的 `imagesrcset`、`imagesizes` 与实际图片选择策略协调一致。

这也是 Shopify 内置 `image_tag` 和 `preload` 参数有价值的原因。

---

### 4. prefetch：提前准备下一次导航

例如用户当前在集合页：

`/collections/shoes`

下一步很可能点击某个商品详情页：

`/products/running-shoes`

你可以考虑：

```html
<link
  rel="prefetch"
  href="/products/running-shoes"
>
```

这表示：

“这个页面可能在未来的导航中使用，可以尝试提前获取。”

但注意，它并不是为当前页面的首屏提供关键资源。

对当前页面来说，`prefetch` 的重要性通常应该低于 `preload`。

两者区别可以这样理解：

<box border radius="lg" padding={3} gap={2}>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <box background="surface-secondary" radius="lg" padding={3} align="center" gap={2}>
          <icon name="download" size="xl"/>
          **preload**
          <text color="secondary" size="xs" textAlign="center">当前页即将使用</text>
        </box>
        <text size="sm">例如：当前商品页的 LCP 主图</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <box background="surface-secondary" radius="lg" padding={3} align="center" gap={2}>
          <icon name="arrow-right-circle" size="xl"/>
          **prefetch**
          <text color="secondary" size="xs" textAlign="center">未来可能使用</text>
        </box>
        <text size="sm">例如：用户可能打开的下一个商品页</text>
      </box>
    </grid-item>
  </grid>
</box>

不过，`rel="prefetch"` 的跨浏览器支持和行为存在差异。MDN 目前仍将其标记为 Limited availability，并建议在支持的环境中考虑 Speculation Rules API 进行文档预取。

此外，预取不是免费的。

如果在集合页预取 100 个商品详情页，但用户只点击其中一个，就可能产生大量无用请求。

对于包含用户个性化信息的页面，也必须考虑缓存、请求副作用及隐私问题。

因此实际工程中应当：

- 只选择高概率的下一跳页面。
- 控制预取数量。
- 避免预取存在副作用的 URL。
- 尊重网络和数据节省条件。
- 测试目标浏览器是否真正复用了预取结果。

---

## 五、HTTP/2 多路复用：请求数量还重要吗？

接下来回答一个非常容易被误解的问题：

**HTTP/2 支持多路复用，是不是意味着无论页面发起多少个请求，性能都不会受影响？**

答案是否定的。

### 1. 先理解 HTTP/1.1 的限制

传统 HTTP/1.1 在没有使用 HTTP pipelining 的常见场景中，一个连接通常不能同时传输多个响应。

浏览器可以通过建立多个连接来提高并发能力，但这会产生额外连接管理成本。

HTTP/2 引入了多路复用。

多个 HTTP 请求和响应可以通过同一个连接上的不同流交错传输。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">HTTP/1.1 与 HTTP/2 请求传输示意</text>
  <box gap={1}>
    <text color="secondary" size="xs">HTTP/1.1 · 单连接请求/响应顺序示意</text>
    <row gap="1px" height="30px">
      <box flex="3" background="#64748b" align="center" radius={{topLeft:"sm",bottomLeft:"sm"}}>
        <text size="2xs" color="#fff">CSS</text>
      </box>
      <box flex="2" background="#d97706" align="center">
        <text size="2xs" color="#fff">JS</text>
      </box>
      <box flex="4" background="#0d9488" align="center" radius={{topRight:"sm",bottomRight:"sm"}}>
        <text size="2xs" color="#fff">IMG</text>
      </box>
    </row>
  </box>
  <box gap={1}>
    <text color="secondary" size="xs">HTTP/2 · 不同 Stream 的数据可以交错传输</text>
    <row gap="1px" height="30px">
      {#each ["CSS","IMG","JS","IMG","CSS","JS","IMG","IMG","JS"] as name,i}
        <box flex="1" background={name==="CSS"?"#64748b":name==="JS"?"#d97706":"#0d9488"} align="center" justify="center" radius={i===0?{topLeft:"sm",bottomLeft:"sm"}:i===8?{topRight:"sm",bottomRight:"sm"}:"none"}>
          <text size="2xs" color="#ffffff">{name}</text>
        </box>
      {/each}
    </row>
  </box>
  <caption>此图只展示单连接下的数据交错传输，不表示实际浏览器一定采用相同顺序。HTTP/1.1 也可以通过多个连接并行请求。</caption>
</box>

多路复用减少了很多旧式连接管理问题，但没有消除所有性能瓶颈。

### 2. 为什么请求过多仍然可能慢？

因为底层物理资源仍然有限。

例如用户的实际下载带宽只有 2Mbps。

浏览器在同一时间请求：

```text
CSS        100KB
JS         300KB
主图       200KB
评论图     500KB
推荐图     700KB
```

HTTP/2 可以让多个流共享连接，但不能凭空增加可用带宽。

它仍然需要考虑：

- 资源之间的带宽竞争。
- 请求与响应头部开销。
- 连接、服务端和浏览器自身的流处理能力。
- 优先级和服务器调度。
- TCP 连接上的丢包与拥塞控制。

HTTP/3 通过 QUIC 改善了传输层的某些队头阻塞问题，但也没有消除带宽和 CPU 的限制。

MDN 对 HTTP 连接管理的说明同样强调，多路复用能改善请求并发，但不会消除网络物理条件的影响。

### 3. 那么，是不是仍然应该把所有 JS 合并成一个文件？

也不一定。

以前 HTTP/1.1 时代，把多个小文件合并，有时能减少明显的请求与连接管理开销。

但在现代 HTTP/2、HTTP/3 环境下，你需要综合考虑：

**文件拆分的优势：**

- 可以按页面按需加载。
- 可以延迟下载非关键代码。
- 公共依赖可以独立缓存。
- 不必为了一个功能下载整个巨型 Bundle。

**过度拆分的劣势：**

- 更多请求与调度开销。
- 更多模块解析与初始化工作。
- 可能形成较长的动态导入依赖链。
- 加载时机和缓存管理更复杂。

因此，现代资源优化并不是简单地追求：

“请求越少越好。”

而是追求：

**关键路径短、非关键资源少、依赖关系合理、缓存和调度高效。**

这一点在 Shopify Theme 的 JavaScript 架构设计中尤其重要。

---

## 六、结合 Shopify Theme，设计真正合理的资源加载策略

前面的知识，现在可以应用到 Shopify 商品详情页。

我们先分析页面上的资源。

假设一个商品页包含：

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">商品详情页的资源优先级规划</text>
  <table>
    <table-row>
      <table-cell width="39%"><text color="secondary" weight="medium" size="xs">资源</text></table-cell>
      <table-cell><text color="secondary" weight="medium" size="xs">推荐策略</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>首屏关键 CSS</table-cell>
      <table-cell>尽早加载，保持正常样式依赖</table-cell>
    </table-row>
    <table-row>
      <table-cell>商品主图（LCP）</table-cell>
      <table-cell>`eager` + `fetchpriority="high"`</table-cell>
    </table-row>
    <table-row>
      <table-cell>首屏可见缩略图</table-cell>
      <table-cell>`eager`，通常保持默认优先级</table-cell>
    </table-row>
    <table-row>
      <table-cell>屏幕外商品图片</table-cell>
      <table-cell>`loading="lazy"`</table-cell>
    </table-row>
    <table-row>
      <table-cell>商品交互 JS</table-cell>
      <table-cell>`defer` / 模块化加载，确保及时可用</table-cell>
    </table-row>
    <table-row>
      <table-cell>评论区域 JS</table-cell>
      <table-cell>非关键时延后或按需加载</table-cell>
    </table-row>
    <table-row>
      <table-cell>第三方分析脚本</table-cell>
      <table-cell>按业务和隐私要求异步、延后加载</table-cell>
    </table-row>
  </table>
  <caption>这是一般商品详情页的起点，最终应以实际视口、LCP 元素和业务交互需求为准。</caption>
</box>

注意：加载策略不是简单地以资源类型划分。

同样都是图片，首屏主图与底部推荐图的策略完全不同。

同样都是 JavaScript，商品购买相关逻辑与评论区功能的加载时机也可能不同。

### 1. 优化商品主图

先看一个常见但不够理想的写法：

```liquid
<img
  src="{{ product.featured_image | image_url: width: 2000 }}"
  loading="lazy"
  alt="{{ product.title | escape }}"
>
```

主要问题包括：

- LCP 图片不应该使用懒加载。
- 没有通过 `srcset`、`sizes` 表达响应式图片尺寸。
- 没有明确告知浏览器这是一张重要图片。

我们可以改成：

```liquid
{% if product.featured_image %}
  {{
    product.featured_image
    | image_url: width: 1600
    | image_tag:
      loading: 'eager',
      fetchpriority: 'high',
      widths: '360, 540, 720, 900, 1200, 1600',
      sizes: '(min-width: 990px) 50vw, 100vw',
      class: 'product__main-image'
  }}
{% endif %}
```

这里逐个解释。

`image_url: width: 1600`：指定图片 URL 的目标最大请求宽度。

`image_tag`：让 Shopify 生成图片 HTML，并处理 `srcset` 等属性。

`widths`：为浏览器提供多个图片宽度候选。

`sizes`：表达图片在不同视口条件下的预期布局宽度。

`loading: 'eager'`：避免将首屏关键图片延迟到懒加载阶段。

`fetchpriority: 'high'`：提示浏览器尽早优先获取这张图片。

在这个例子中，桌面端图片布局宽度假设约为视口的 50%，移动端约为整个视口。具体宽度需要按 Theme 实际布局调整。

Shopify 官方推荐使用 `image_url` 和 `image_tag`，而不是手工拼接一大批图片 URL。这样有助于减少重复的 Liquid 处理，并充分使用 Shopify CDN 图片能力。

### 2. 什么时候使用 Shopify 的 preload: true？

Shopify 还有一个很有意思的能力：

```liquid
{{
  product.featured_image
  | image_url: width: 1600
  | image_tag:
    preload: true,
    loading: 'eager',
    fetchpriority: 'high',
    widths: '360, 540, 720, 900, 1200, 1600',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

这里的：

```liquid
preload: true
```

不只是简单在 HTML 中多输出一个 `<link rel="preload">`。

根据 Shopify 当前官方文档，它会为资源生成相应的 HTTP `Link` preload 提示，平台还可以通过 HTTP 103 Early Hints 提前传递资源信息。

#### 什么是 HTTP 103 Early Hints？

这是个非常值得理解的机制。

一般情况下：

```text
浏览器发送请求
        ↓
Shopify 生成 HTML
        ↓
浏览器收到 HTML
        ↓
发现图片地址
        ↓
开始请求图片
```

但如果服务器能更早提供相关资源提示：

```text
浏览器发送请求
        ↓
Shopify 开始生成 HTML
        ↓
返回 103 Early Hints
        ↓
浏览器有机会提前请求主图
        │
        ├─────────────┐
        ↓             ↓
   图片资源下载    Shopify 继续处理页面
        │             │
        └──────┬──────┘
               ↓
          HTML 正式返回
               ↓
           页面渲染
```

这样，浏览器就有机会让图片下载与服务端 HTML 生成过程重叠。

对于 HTML 在服务端渲染过程中较晚才包含图片地址的场景，可能很有价值。

#### 那是不是所有商品主图都应该 preload: true？

也不是。

Shopify 官方建议谨慎使用 preload，通常只考虑一到两个真正关键、需要提前发现的资源。

因为：

- 浏览器可能已经能够很早发现主图。
- 不必要的 preload 会和其他关键资源竞争。
- Shopify 平台本身也可能生成部分资源提示。
- 不同页面的 LCP 资源可能不同。

因此，实际建议是：

**先确保主图 `eager`、合适的 `fetchpriority` 和正确的响应式尺寸，再测量是否需要额外 preload。**

Shopify 的 HTTP 103 支持使 `preload: true` 在特定情况下具有额外价值，但是否有效仍然应该通过 Network 时间线验证。

---

## 七、Shopify 的 section.index 如何帮助决定加载策略？

这是 Shopify Theme 特有的一个很实用的能力。

假设你正在开发一个支持很多 Section 的商品页。

页面结构可能是：

```text
Header
  ↓
Product Main
  ↓
Product Benefits
  ↓
Product Details
  ↓
Reviews
  ↓
Recommendations
  ↓
Footer
```

不同 Section 的图片加载优先级显然不同。

Shopify 提供了：

```liquid
{{ section.index }}
{{ section.index0 }}
{{ section.location }}
```

可以帮助你判断 Section 在某个渲染位置中的顺序。

例如：

```liquid
{% liquid
  assign image_loading = 'eager'

  if section.index > 3
    assign image_loading = 'lazy'
  endif
%}

{% if section.settings.image %}
  {{
    section.settings.image
    | image_url: width: 1400
    | image_tag:
      loading: image_loading,
      widths: '400, 600, 900, 1200, 1400',
      sizes: '100vw'
  }}
{% endif %}
```

这个示例表达的策略是：

- 前三个 Section：优先采用 eager。
- 第四个及后续 Section：考虑 lazy。
- `section.index` 为空时：保守地使用 eager。

但是这里存在一个非常重要的细节：

**`section.index` 不是整个页面的全局序号。**

它按照 Section 所在的渲染位置计数。

Header Group 的第一个 Section 和商品 Template 的第一个 Section，都可能拥有 `section.index == 1`。

而且在 Theme Editor、静态 Section 或 Section Rendering API 等上下文中，这个属性可能为 `nil`。

因此，不能简单地认为：

```liquid
{% if section.index == 1 %}
```

就一定意味着“全页面第一个可见 Section”或者“这张图片就是 LCP”。

对于商品详情页，最可靠的方法仍然是识别真正的主图，以及该图片是否处于初始视口。

Shopify 官方专门说明了 `section.index` 的这些限制与安全的条件写法。

---

## 八、字体加载：一个容易被忽略的资源优先级问题

前面主要讨论图片，但字体也可能影响 FCP、LCP 和 CLS。

假设你的商品标题使用自定义字体：

```css
@font-face {
  font-family: "BrandFont";
  src: url("/fonts/brand.woff2") format("woff2");
}

.product-title {
  font-family: "BrandFont", sans-serif;
}
```

浏览器可能需要：

```text
下载 HTML
   ↓
下载 CSS
   ↓
解析 CSS
   ↓
发现字体需求
   ↓
下载字体
   ↓
渲染或替换文本
```

如果字体下载时间过长，首屏文本显示可能受到影响。

### 1. font-display

例如：

```css
@font-face {
  font-family: "BrandFont";
  src: url("/fonts/brand.woff2") format("woff2");
  font-display: swap;
}
```

`font-display: swap` 通常允许浏览器先使用后备字体显示文本，等自定义字体可用后再替换。

这样可以降低文本长时间不可见的风险。

但也可能出现字体替换导致布局偏移的问题。

所以在优化字体时，要同时考虑：

- 是否阻塞文字可见性。
- 后备字体与正式字体的字形尺寸差异。
- 是否出现字体切换引发的 CLS。
- 是否有必要提前下载某个关键字体。

Shopify 官方建议使用后备字体，并可通过 `size-adjust` 等字体指标调整方式减小字体切换导致的布局偏移。

### 2. Shopify 中如何预加载字体？

如果这是一个已放在 Theme assets 中的关键 WOFF2 字体，可以采用：

```liquid
{{
  'brand-regular.woff2'
  | asset_url
  | preload_tag:
    as: 'font',
    type: 'font/woff2'
}}
```

这会使用 Shopify 的资源预加载能力。

字体的 preload 需要正确的 CORS 请求模式，以便被后续字体请求复用。Shopify 的 `preload_tag` 在 `as: 'font'` 时会处理相关匿名跨源属性。

但和图片一样，不建议预加载所有字重、所有语言子集以及用户不一定会使用的字体。

例如有 Regular、Medium、Bold、Black 四个字重，但首屏只需要 Regular，通常没有必要同时 preload 四个字体文件。

---

## 九、案例：如何一步步把商品页 LCP 从 3.8 秒优化到 2 秒以内？

现在我们将这一课所有知识组合起来。

假设某个商品详情页的模拟加载过程是：

<box border radius="xl" padding={3} gap={3}>
  <title size="md">优化前：LCP = 3.8s</title>
  <box direction="row" height="30px" gap="1px" clip radius="sm">
    <box flex={700} background="#64748b" align="center" justify="center"><text color="#fff" size="2xs">700</text></box>
    <box flex={1300} background="#d97706" align="center" justify="center"><text color="#fff" size="2xs">1300</text></box>
    <box flex={1100} background="#3b82f6" align="center" justify="center"><text color="#fff" size="2xs">1100</text></box>
    <box flex={700} background="#0d9488" align="center" justify="center"><text color="#fff" size="2xs">700</text></box>
  </box>
  <text color="secondary" size="xs">TTFB 700ms · 资源发现延迟 1300ms · 下载 1100ms · 渲染延迟 700ms</text>
  <divider color="subtle"/>
  <title size="md">优化后：LCP = 1.9s</title>
  <box direction="row" height="30px" gap="1px" clip radius="sm">
    <box flex={680} background="#64748b" align="center" justify="center"><text color="#fff" size="2xs">680</text></box>
    <box flex={120} background="#d97706" align="center" justify="center"><text color="#fff" size="2xs">120</text></box>
    <box flex={900} background="#3b82f6" align="center" justify="center"><text color="#fff" size="2xs">900</text></box>
    <box flex={200} background="#0d9488" align="center" justify="center"><text color="#fff" size="2xs">200</text></box>
  </box>
  <text color="secondary" size="xs">TTFB 680ms · 资源发现延迟 120ms · 下载 900ms · 渲染延迟 200ms</text>
  <divider color="subtle"/>
  <grid columns={2} gap={2}>
    <grid-item>
      <box gap={1}>
        <text color="secondary" size="xs">LCP 总体改善</text>
        <title size="xl" color="success">-1.9s</title>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <text color="secondary" size="xs">最大改善来源</text>
        <title size="md">资源发现延迟</title>
      </box>
    </grid-item>
  </grid>
  <caption>全部为用于说明优化过程的模拟数据，不是实际 Shopify 商店的测量结果。</caption>
</box>

现在分析我们究竟做了什么。

#### 优化一：让主图直接出现在 HTML 中

原来图片由 JavaScript 动态插入，必须等待相关脚本下载与执行。

优化后，Liquid 直接生成 `<img>` 标签，让浏览器更早发现它。

这主要改善 Resource Load Delay。

#### 优化二：提高主图获取优先级

给真正的 LCP 主图添加：

```html
fetchpriority="high"
```

并避免：

```html
loading="lazy"
```

这样可以改善图片请求在资源竞争中的调度位置，避免懒加载带来的不必要等待。

#### 优化三：让非关键资源不竞争首屏带宽

将不可见的评论图片、推荐商品图片设置为合适的懒加载策略。

让非关键 JS 延后或按需加载，减少首屏网络竞争和主线程工作。

#### 优化四：合理设置响应式图片

通过 `widths` 和 `sizes`，让移动设备不必下载远大于布局所需的图片。

这主要改善 Resource Load Duration。

#### 优化五：消除主图显示延迟

避免在主图下载完成之后，还让它等待一段不必要的 fade-in 动画。

同时减少主线程上的长任务。

这主要改善 Element Render Delay。

这一系列优化体现了我们前面一直强调的思路：

**识别关键路径上的等待，逐项消除，而不是盲目应用性能技巧。**

---

## 十、如何在 Chrome DevTools 验证资源优先级？

最后再把这些知识落到性能分析工具中。

### 1. Network：检查 Priority

进入 Chrome DevTools → Network。

右键请求列表的表头，选择显示 **Priority** 列。

现在就能查看不同请求的优先级。

你可以重点观察：

- 商品主图是不是 High？
- 主图什么时候开始下载？
- 关键 CSS 是否及时被获取？
- 第三方脚本是否与主图竞争？
- 图片优先级有没有在加载过程中变化？

Chrome DevTools 可以显示请求的初始优先级和最终优先级；在相关显示设置中，也可以通过悬停或展开请求行观察。

### 2. Initiator：请求是由谁发起的？

这个字段非常重要。

例如你发现：

```text
product.webp
    Initiator: product.js
```

这就说明图片请求由 JavaScript 发起。

你应该进一步检查：

为什么商品主图不是由初始 HTML 直接提供？

另一个例子：

```text
banner.webp
    Initiator: theme.css
```

这可能意味着图片来自 CSS 背景图。

这种信息能够直接帮助我们找到资源发现依赖。

### 3. Performance Insights：检查请求发现问题

在 Performance 面板录制页面加载后，重点看：

- **LCP request discovery**：LCP 资源为何发现得晚。
- **LCP breakdown**：LCP 的主要耗时落在哪个部分。
- **Network dependency tree**：哪些资源组成了较长的关键请求依赖链。
- **Render blocking requests**：哪些资源阻碍了首次渲染。

这些都是 Chrome 当前 Performance Insights 提供的诊断方向。

### 4. 做一个实战对比实验

你可以在自己开发的 Shopify Theme 中选择一张首屏商品主图。

先用普通方式加载，并录制一次：

```liquid
{{
  product.featured_image
  | image_url: width: 1200
  | image_tag: loading: 'eager'
}}
```

然后在测试版本中添加：

```liquid
{{
  product.featured_image
  | image_url: width: 1200
  | image_tag:
    loading: 'eager',
    fetchpriority: 'high'
}}
```

对比两次 Network 与 Performance 结果，重点观察：

1. 主图请求开始时间有没有变化？
2. 请求的初始优先级有没有变化？
3. 主图下载完成时间有没有提前？
4. LCP 有没有实际改善？
5. 其他关键资源有没有受到不利影响？

这会帮助你理解：

**优化代码只是提出假设，性能录制才是检验假设的证据。**

---

## 十一、本课总结

这节课我们学习了网站资源加载策略的核心知识。

| 知识点 | 关键结论 |
|---|---|
| Resource Discovery | 关键资源应该尽早被浏览器发现 |
| Fetch Priority | 决定资源请求的相对调度重要性 |
| `dns-prefetch` | 提前解析域名 |
| `preconnect` | 提前建立网络连接 |
| `preload` | 提前获取当前页面需要的资源 |
| `prefetch` | 提前准备未来导航可能需要的资源 |
| HTTP/2 多路复用 | 改善并发传输，但不能消除带宽竞争 |
| `loading="lazy"` | 适合非首屏资源，不适合 LCP 主图 |
| `srcset` / `sizes` | 帮助浏览器选择合适的图片尺寸 |
| Shopify Early Hints | 有机会在完整 HTML 返回前提供资源提示 |

选择资源加载策略时，先回答以下三个问题。

以后优化任何一个网站的资源加载，都先问：

**第一，这个资源是不是当前页面真正需要的？**

如果不是，就考虑不加载、按需加载或延后加载。

**第二，这个资源什么时候被浏览器发现？**

如果是关键资源却发现得很晚，就要优化 HTML、CSS、JS 的资源发现依赖。

**第三，它和其他资源相比应该拥有怎样的优先级？**

如果重要性明确而浏览器无法提前判断，就可以适当使用 `fetchpriority`、`preload` 或连接预热。

只要掌握这三个问题，你就不再是机械地给图片添加 `lazy`、给脚本添加 `async`，而是能够从浏览器资源调度角度设计性能策略。

## 参考资料

- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Liquid filters: image_tag](https://shopify.dev/docs/api/liquid/filters/image_tag)
- [Use preload resource hints sparingly](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-preload-resource-hints-sparingly)
- [Don't use CSS background-image for LCP content](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-background-images-hero)
- [Use image_url and image_tag instead of manual CDN URLs](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-shopify-image-filters-efficiently)
- [Serve correctly sized images with srcset and sizes](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-responsive-images)
- [Mark the LCP image with fetchpriority="high"](https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Load above-the-fold and below-the-fold sections differently with section.index](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-index)
- [Reduce CLS from font swapping](https://shopify.dev/docs/storefronts/themes/best-practices/performance/reduce-cls-font-swapping)
- [Self-host web fonts on Shopify CDN](https://shopify.dev/docs/storefronts/themes/best-practices/performance/self-host-web-fonts)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp/)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?hl=en)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp)
- [Optimize resource loading with the Fetch Priority API | Articles | web.dev](https://web.dev/articles/fetch-priority)
- [rel="preconnect" HTML attribute value - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect)
- [fetchpriority HTML attribute - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
- [rel="preload" HTML attribute value - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload)
- [Using dns-prefetch - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/dns-prefetch)
- [rel="prefetch" HTML attribute value - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch)
- [Connection management in HTTP/1.x - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x)
- [rel HTML attribute - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/)
