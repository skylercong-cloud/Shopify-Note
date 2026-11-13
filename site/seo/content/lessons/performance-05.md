# Chrome DevTools Performance 性能诊断实战


前四课，我们已经建立了完整的浏览器性能知识体系：

- 网络：DNS、TCP、TLS、HTTP、资源下载。
- 加载：HTML、CSS、JavaScript 之间的阻塞关系。
- 渲染：Style、Layout、Paint、Composite。
- 交互：Event Loop、Long Task、主线程调度。

现在进入真正的性能排查。

**这一课的目标，是让你能够独立回答：一个网站为什么慢，慢在哪里，具体是哪段代码导致的，应该怎样优化，以及怎么证明优化有效。**

我们会用一个模拟的 Shopify 商品详情页贯穿整个分析过程。

---

## 一、首先明确：性能诊断不是看 Lighthouse 分数

假设有一个商品详情页：

`https://shop.example.com/products/shoes`

它的性能表现如下（全部是教学模拟数据）：

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <box gap="2px">
      <text color="secondary" weight="medium" size="xs">模拟 Shopify 商品详情页</text>
      <text weight="medium">Performance Overview</text>
    </box>
    <icon name="activity" color="secondary" size="lg"/>
  </row>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">TTFB</text>
        <title size="xl" tabularNums>650ms</title>
        <text color="secondary" size="xs">首字节响应</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">FCP</text>
        <title size="xl" tabularNums>1.7s</title>
        <text color="secondary" size="xs">首次内容绘制</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">LCP</text>
        <title size="xl" color="danger" tabularNums>3.45s</title>
        <text color="secondary" size="xs">最大内容绘制偏慢</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">一次点击交互</text>
        <title size="xl" color="danger" tabularNums>380ms</title>
        <text color="secondary" size="xs">操作响应偏慢</text>
      </box>
    </grid-item>
  </grid>
  <caption>数据仅用于课程演示，不代表真实商店或实际测量结果。</caption>
</box>

看到这些数据，一个普通开发者可能马上想到：

“压缩图片，减少 JavaScript，优化服务器。”

但有经验的性能工程师会先提出几个问题：

1. LCP 元素到底是什么？商品主图，还是标题？
2. 商品主图是下载慢，还是下载完成后迟迟没有被绘制？
3. TTFB 的 650ms 中，有多少是网络时间，有多少是服务器处理时间？
4. 380ms 的交互延迟，到底是请求 API 慢、JS 长任务，还是 Layout 太耗时？

你会发现，我们现在需要的是**定位瓶颈的证据**，而不只是知道一些优化技巧。

### 1. 三类性能工具分别解决什么问题？

| 工具 | 最擅长解决的问题 |
|---|---|
| Lighthouse | 页面有哪些潜在性能问题，整体表现如何 |
| Chrome Network | 哪些资源慢，慢在网络请求的哪个阶段 |
| Chrome Performance | 主线程在做什么，哪些任务影响了绘制和交互 |

此外，Shopify Theme 还有一个特殊需求：定位服务端 Liquid 代码的性能瓶颈。这个我们后面用 Shopify Theme Inspector 来分析。

注意，Lighthouse 的一次页面加载审计不能直接测出真实用户的 INP，因为 INP 需要实际交互；它的 Total Blocking Time（TBT）可以作为相关的实验室诊断指标。

---

## 二、第一步：正确录制性能数据

我们先打开 Chrome DevTools。

在最新的 Chrome DevTools 中，应该主要使用 **Performance 面板里的 Insights**。旧的独立 `Performance insights` 面板已经从 Chrome 132 起移除，不要按照旧教程去寻找独立面板。

### 1. 准备录制环境

在 Chrome 中打开需要分析的商品详情页。

按 `F12` 或 `Ctrl + Shift + I`（macOS 可以使用 `Cmd + Option + I`），进入 Performance 面板。

录制之前，建议按下面的方式设置：

- 保持固定的浏览器窗口和视口大小。
- 选择一套固定的 Network throttling 条件。
- 选择固定的 CPU throttling 倍率。
- 初次排查冷加载时，勾选 Disable cache。
- 开启 Screenshots，以便将渲染事件和真实画面对应起来。

这里有一个非常重要的细节：

**模拟 4× CPU slowdown，不等于真实模拟某一部低端手机。**

DevTools 的 CPU 降速是相对于当前设备执行能力进行模拟的。不同开发电脑上的 4× 降速结果可能差异很大。

### 2. 两种录制方式有什么区别？

<box gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="refresh-cw" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Record and reload（录制页面加载）**

      用于分析从导航开始到页面完成加载的过程。适合查找 TTFB、FCP、LCP、关键资源下载和首次渲染问题。
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="mouse-pointer-click" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Record（录制运行时交互）**

      先开始录制，再手动执行商品变体切换、加入购物车、打开筛选面板等操作，最后停止录制。适合分析交互延迟、长任务、布局和动画问题。
    </box>
  </row>
</box>

官方 Chrome Performance 文档也明确区分这两种录制场景。

**建议不要把首次页面加载和后续交互混在同一次很长的录制中。**

先分析加载，再分析交互，问题会更容易定位。

---

## 三、第二步：先看 Network Waterfall，找到关键资源

假设我们录制了商品详情页的加载过程。

Network Waterfall（网络请求瀑布图）是整个诊断过程的起点。

下面是一张我们模拟出来的时间线：

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">商品页网络请求与关键事件（模拟）</text>
  <svg viewBox="0 0 346 244" width="100%">
    <g fontSize="9.5" fill="currentColor" opacity=".7">
      {#each [0,1,2,3,4] as t}
        <text x={97+t*58.5} y="14" textAnchor="middle">{t}s</text>
        <line x1={97+t*58.5} y1="22" x2={97+t*58.5} y2="191" stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 3"/>
      {/each}
    </g>
    <g fontSize="10.5" fill="currentColor">
      <text x="5" y="47">HTML</text>
      <text x="5" y="78">main.css</text>
      <text x="5" y="109">theme.js</text>
      <text x="5" y="140">product.webp</text>
      <text x="5" y="171">JS 长任务</text>
    </g>
    <rect x="97" y="32" width="38" height="21" rx="3" fill="#64748b"/>
    <rect x="135" y="32" width="67" height="21" rx="3" fill="#94a3b8"/>
    <rect x="138" y="63" width="44" height="21" rx="3" fill="#3b82f6"/>
    <rect x="147" y="94" width="29" height="21" rx="3" fill="#3b82f6" fillOpacity=".65"/>
    <rect x="185" y="125" width="62" height="21" rx="3" fill="#0d9488"/>
    <rect x="252" y="156" width="35" height="21" rx="3" fill="#e07a5f"/>
    <line x1="196.5" y1="23" x2="196.5" y2="193" stroke="#c58a21" strokeWidth="1.6" strokeDasharray="3 2"/>
    <line x1="299" y1="23" x2="299" y2="193" stroke="#db5f56" strokeWidth="1.6" strokeDasharray="3 2"/>
    <g fontSize="9" fill="currentColor">
      <text x="135" y="47" textAnchor="middle" fill="#fff">首字节</text>
      <text x="196" y="205" textAnchor="middle">FCP 1.7s</text>
      <text x="299" y="218" textAnchor="middle">LCP 3.45s</text>
    </g>
    <g fontSize="9.5" fill="currentColor">
      <rect x="9" y="228" width="10" height="10" rx="2" fill="#3b82f6"/>
      <text x="24" y="237">下载资源</text>
      <rect x="106" y="228" width="10" height="10" rx="2" fill="#0d9488"/>
      <text x="121" y="237">图片下载</text>
      <rect x="209" y="228" width="10" height="10" rx="2" fill="#e07a5f"/>
      <text x="224" y="237">主线程长任务</text>
    </g>
  </svg>
  <caption>主线程任务与资源下载被合并到一张图中方便讲解；真实 DevTools 的 Network 和 Main 轨道是分开显示的。</caption>
</box>

从这张图，我们可以先观察到：

**HTML：** 650ms 收到首字节，但后面的 HTML 仍持续传输。

**CSS：** 大约 0.7 秒开始下载，1.45 秒完成。

**商品主图：** 到 1.5 秒才开始下载，2.55 秒完成。

**长任务：** 2.65 秒到 3.25 秒之间，主线程被一段很长的 JavaScript 任务占用。

**LCP：** 最后到 3.45 秒才完成。

这一眼就能看出：

商品主图并不是加载完成后立即显示。

它在 2.55 秒下载完成，却直到 3.45 秒才成为已绘制的 LCP 元素。

也就是说，还有大约 900ms 被耗费在下载完成后的阶段。

但此时我们仍然不能直接断言“是这个 JS 长任务造成了全部 900ms 延迟”。

它只是一个值得继续调查的嫌疑点。

### 为什么 Network 看请求完成时间还不够？

因为资源下载完成，只表示浏览器拥有了资源的数据。

接下来可能还需要：

- 图片解码。
- CSS 样式计算。
- Layout。
- Paint 和 Composite。
- 等待正在执行的 JavaScript 任务结束。
- 等待隐藏动画或其他视觉逻辑。

这就需要进入 Performance 时间线，将网络事件和主线程活动关联起来。

---

## 四、第三步：使用 LCP Breakdown 精确定位问题

这是我认为目前 Chrome Performance 中最值得掌握的诊断能力之一。

LCP（Largest Contentful Paint）不是简单的“某张图片下载用了多久”。

对于需要加载外部资源的 LCP 元素，Chrome 可以将其拆分成四个部分。

在 Performance 面板录制完成后，打开 **Insights → LCP breakdown**。

我们继续使用上面的模拟案例。

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">LCP = 3,450ms</text>
  <box direction="row" height="32px" gap="1px" radius="md" clip>
    <box flex={650} background="#64748b" align="center" justify="center">
      <text color="#ffffff" size="2xs">650</text>
    </box>
    <box flex={850} background="#d97706" align="center" justify="center">
      <text color="#ffffff" size="2xs">850</text>
    </box>
    <box flex={1050} background="#3b82f6" align="center" justify="center">
      <text color="#ffffff" size="2xs">1050</text>
    </box>
    <box flex={900} background="#0d9488" align="center" justify="center">
      <text color="#ffffff" size="2xs">900</text>
    </box>
  </box>
  <table>
    <table-row>
      <table-cell width="54%">
        <row align="center" gap={2}>
          <box background="#64748b" size="9px" radius="sm"/>
          <text size="sm">TTFB</text>
        </row>
      </table-cell>
      <table-cell align="end"><text size="sm" tabularNums>650ms</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>
        <row align="center" gap={2}>
          <box background="#d97706" size="9px" radius="sm"/>
          <text size="sm">Resource Load Delay</text>
        </row>
      </table-cell>
      <table-cell align="end"><text size="sm" tabularNums>850ms</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>
        <row align="center" gap={2}>
          <box background="#3b82f6" size="9px" radius="sm"/>
          <text size="sm">Resource Load Duration</text>
        </row>
      </table-cell>
      <table-cell align="end"><text size="sm" tabularNums>1050ms</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>
        <row align="center" gap={2}>
          <box background="#0d9488" size="9px" radius="sm"/>
          <text size="sm">Element Render Delay</text>
        </row>
      </table-cell>
      <table-cell align="end"><text size="sm" tabularNums>900ms</text></table-cell>
    </table-row>
  </table>
</box>

这四个部分相加，正好等于 3450ms。

我们逐个分析。

### 1. TTFB 高：服务器和网络问题

如果 TTFB 很高，说明浏览器收到 HTML 首字节之前消耗了较长时间。

要查看：

Network → 点击主文档请求 → Timing。

重点区分：

- DNS Lookup
- Initial Connection
- SSL
- Waiting for server response

如果 DNS 和连接时间都不高，但等待响应很长，服务端处理就值得重点检查。

不过 Shopify 有一个特殊情况：服务端可能流式返回 HTML。

如果最初的 `<head>` 很快返回，而商品 Section 在后面较慢才输出，就可能出现：

**TTFB 看起来不高，但主文档 Content Download 很长。**

这种情况不能仅凭 TTFB 判断 Liquid 渲染速度。Shopify 官方也明确建议检查完整文档请求耗时，并通过 Theme Inspector 进一步定位 Liquid。

### 2. Resource Load Delay 高：图片被发现得太晚

我们的主图从 1.5 秒才开始下载。

TTFB 是 650ms。

这意味着：

\[
1500-650=850ms
\]

在收到首字节之后，又过了 850ms，浏览器才开始加载商品主图。

这时需要检查的不是图片文件有多大，而是：

**为什么浏览器没有更早地发现这张图片？**

常见原因包括：

- 图片地址通过 JavaScript 动态生成。
- 图片标签使用了不合适的 `loading="lazy"`。
- 商品 Section 的 HTML 到达较晚。
- 图片被定义在 CSS `background-image` 中，需要先发现和处理样式表。
- 浏览器发现了资源，但请求优先级或资源调度导致启动时间偏晚。

#### Shopify 中的错误示例

```liquid
<img
  src="{{ product.featured_image | image_url: width: 1000 }}"
  loading="lazy"
  alt="{{ product.title | escape }}"
>
```

如果这是首屏最大的商品图片，设置 `loading="lazy"` 通常不合适。

更合理的是：

```liquid
{{
  product.featured_image
  | image_url: width: 1000
  | image_tag:
    loading: 'eager',
    fetchpriority: 'high',
    widths: '360, 540, 720, 900, 1000',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

这里的 `sizes` 只是一个示例：假定桌面端图片占一半视口宽度，移动端基本占满视口。实际项目必须按照 Theme 布局调整。

Shopify 的 `image_tag` 能帮助生成响应式图片所需属性，官方也明确建议为真正的 LCP 图片采用优先加载策略。

### 3. Resource Load Duration 高：图片下载太慢

我们的主图下载用了 1050ms。

接下来才需要重点研究文件本身：

- 浏览器下载的是不是一张远大于显示尺寸的图片？
- 是否使用了合理的现代图片格式？
- `srcset` 和 `sizes` 是否正确？
- 是否存在其他资源竞争带宽？
- 图片是否来自预期的 CDN？
- 浏览器是否复用了连接？

例如，一个实际只显示 400px 宽的商品图，如果始终下载 2400px 的大图，就可能产生不必要的传输和解码开销。

这里要注意：网络下载耗时和图片解码耗时不是一回事，后者也可能影响随后的元素渲染。

### 4. Element Render Delay 高：图片下载完了，为什么还没显示？

这是最容易被忽略的 LCP 问题。

我们的商品主图在 2.55 秒下载完，但 LCP 在 3.45 秒。

说明下载完成之后，又经历了 900ms 才绘制出来。

这时就应该将 Network 与 Main 轨道关联起来。

例如：

```text
2.55s 商品主图下载完成
  ↓
2.65s 开始执行 JavaScript 长任务
  ↓
3.25s JavaScript 结束
  ↓
浏览器进行必要的样式和渲染工作
  ↓
3.45s LCP
```

这里的 JavaScript 长任务可能是重要原因之一，但还需要看实际调用栈、样式和渲染事件。

另外，如果商品图初始被设置为：

```css
.product-image {
  opacity: 0;
}
```

然后在延迟后才显示：

```js
setTimeout(() => {
  image.style.opacity = "1";
}, 800);
```

这也可能导致图片已经下载完成，却仍然迟迟没有成为可见的 LCP 元素。

#### 交互式诊断练习

选择一个 LCP 瓶颈，看看应该从哪里开始排查：

{@body const [lcpPart,setLcpPart] = DIL.useState("delay")}
{@body const diagnoses = {
ttfb:{title:"TTFB：浏览器迟迟收不到 HTML",where:"Network → Document → Timing",why:"检查 DNS、建连、重定向、Waiting；在 Shopify 还要考虑流式 HTML 的完整请求耗时。",fix:"优先排查重定向、网络路径、服务端 Liquid 和缓存，不要先去压缩商品图片。"},
delay:{title:"Resource Load Delay：LCP 图片请求启动太晚",where:"Performance → Insights → LCP request discovery",why:"检查主图从何处被发现，是 HTML、CSS 还是 JavaScript；同时查看实际请求发起时间和优先级。",fix:"优先让图片地址出现在 HTML 中，避免错误懒加载，必要时使用 fetchpriority=\"high\"。"},
download:{title:"Resource Load Duration：图片传输耗时过长",where:"Network → Img → Size / Timing / Priority",why:"检查传输字节、响应尺寸、实际显示尺寸、缓存、带宽及其他资源竞争。",fix:"修正 srcset/sizes、图片压缩策略、CDN 资源与缓存，避免下载不必要的大尺寸图片。"},
render:{title:"Element Render Delay：图片已下载却没有绘制",where:"Performance → Main + Screenshots + LCP marker",why:"检查 JS 长任务、解码、样式计算、隐藏状态、布局与渲染工作。",fix:"缩减主线程任务，移除不必要的 LCP 显示延迟，并优化首屏相关渲染逻辑。"}
}}
<box border radius="xl" padding={3} gap={3}>
  <radio-group direction="col" value={lcpPart} onChange={setLcpPart}>
    <radio value="ttfb">TTFB 高</radio>
    <radio value="delay">Resource Load Delay 高</radio>
    <radio value="download">Resource Load Duration 高</radio>
    <radio value="render">Element Render Delay 高</radio>
  </radio-group>
  <divider color="subtle"/>
  <box gap={2}>
    **{diagnoses[lcpPart].title}**
    <row gap={2} align="start">
      <icon name="search" color="secondary"/>
      <box flex="1" gap={1}>
        <text weight="medium" size="sm">到哪里检查</text>
        <text size="sm">{diagnoses[lcpPart].where}</text>
      </box>
    </row>
    <row gap={2} align="start">
      <icon name="scan-search" color="secondary"/>
      <box flex="1" gap={1}>
        <text weight="medium" size="sm">主要检查内容</text>
        <text size="sm">{diagnoses[lcpPart].why}</text>
      </box>
    </row>
    <row gap={2} align="start">
      <icon name="wrench" color="secondary"/>
      <box flex="1" gap={1}>
        <text weight="medium" size="sm">优先优化方向</text>
        <text size="sm">{diagnoses[lcpPart].fix}</text>
      </box>
    </row>
  </box>
</box>

这也是为什么我一直强调：

**不要看到 LCP 慢，就直接去压缩图片。**

如果真正的问题是 900ms 的 Element Render Delay，即使将图片下载时间缩短一半，仍然可能保留很大的性能问题。

---

## 五、第四步：深入 Main Thread，定位具体 JavaScript 函数

现在我们解决另一个问题：

假设 `theme.js` 有 300KB，Performance 发现 JavaScript 执行占用了 600ms。

我们应该怎么知道到底是哪段代码慢？

答案是分析 **Flame Chart（火焰图）与调用栈**。

### 1. Performance 的 Main 轨道

在 Performance 录制中展开 Main 轨道。

你可能会看到类似：

```text
Task (600ms)
│
├── Function Call
│   └── initializeProductPage()
│       ├── setupVariantPicker()       20ms
│       ├── initializeGallery()         80ms
│       └── buildRecommendations()     430ms
│
└── 其他浏览器内部工作
```

上面的函数名与时间都是模拟数据。

火焰图的一般阅读方式：

- 横向宽度表示时间跨度。
- 上下层级表示函数调用关系。
- 一段调用越宽，说明它覆盖的时间范围越长。
- 父函数的时间可能包含其子函数的时间。

这里有一个很重要的概念：**Total Time 与 Self Time。**

### 2. Total Time 和 Self Time 有什么区别？

假设：

```js
function A() {
  B();
  C();
}

function B() {
  // 耗时 80ms
}

function C() {
  // 耗时 20ms
}
```

简化假设，忽略 A 本身的微小执行开销：

| 函数 | Total Time | Self Time |
|---|---:|---:|
| A | 100ms | 接近 0ms |
| B | 80ms | 80ms |
| C | 20ms | 20ms |

因此，火焰图里看到 `A()` 很宽，不意味着 A 函数自己的代码耗时最多。

真正需要排查的可能是它调用的 `B()`。

#### Call Tree 与 Bottom-Up

Chrome Performance 中还有两个很有用的视图。

**Call Tree**：从调用关系出发，查看某个函数调用了哪些函数，以及整体时间如何分布。

**Bottom-Up**：从消耗时间的活动出发，聚合所选时间范围内的开销，更容易识别最昂贵的操作。

例如，商品页面有 20 个不同函数都调用了 `calculateProductPrice()`。

在火焰图中，这些调用可能分散在不同位置。

Bottom-Up 可以帮助你看到这个计算函数的累计耗时，从而识别重复计算的问题。

Chrome 官方文档提供了这些视图以及调用栈分析方法。

### 3. 如何定位到源代码？

建议采用以下步骤：

1. 在 Main 中放大一个明显的长任务。
2. 展开 JavaScript 调用栈。
3. 观察哪个函数的执行跨度最大。
4. 点击对应活动，查看详细信息和源文件位置。
5. 如果使用了打包工具，确保构建时生成可用 Source Map，方便映射到原始代码。

如果页面使用 Shopify Theme，而你发现主要耗时来自某个第三方 App 的 JavaScript，接下来就需要分析该 App 是否必须在首屏执行。

注意：第三方脚本文件很大，并不代表它就是主要问题。应该先找到真实的执行耗时和影响链路。

---

## 六、第五步：分析 INP，为什么点击购物车按钮会卡顿？

现在我们已经掌握了如何诊断加载问题。

接下来换一个场景：

用户打开商品详情页后，点击「加入购物车」，感觉按钮反应很慢。

这不是典型的 LCP 问题，而是交互性能问题。

### 1. 先录制一次真实点击

操作步骤：

1. 打开 Chrome Performance。
2. 点击 Record 开始录制运行时性能。
3. 在页面中点击加入购物车按钮。
4. 等待操作完成后停止录制。
5. 找到 **Interactions** 轨道中的对应点击交互。

Chrome 可以将交互耗时拆解为 Input Delay、Processing Duration 和 Presentation Delay，帮助区分事件排队、处理和呈现阶段。

假设得到以下模拟结果：

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">购物车按钮点击：380ms</text>
  <box direction="row" gap="1px" height="30px" radius="md" clip>
    <box flex={110} background="#64748b" align="center" justify="center">
      <text color="#ffffff" size="2xs">110ms</text>
    </box>
    <box flex={120} background="#d97706" align="center" justify="center">
      <text color="#ffffff" size="2xs">120ms</text>
    </box>
    <box flex={150} background="#0d9488" align="center" justify="center">
      <text color="#ffffff" size="2xs">150ms</text>
    </box>
  </box>
  <table>
    <table-row>
      <table-cell>Input Delay</table-cell>
      <table-cell align="end"><text tabularNums>110ms</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>Processing Duration</table-cell>
      <table-cell align="end"><text tabularNums>120ms</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>Presentation Delay</table-cell>
      <table-cell align="end"><text tabularNums>150ms</text></table-cell>
    </table-row>
  </table>
</box>

这三个阶段分别意味着什么？

#### Input Delay：为什么事件没有立即开始执行？

用户点击时，主线程可能正在执行某个第三方脚本。

例如：

```text
用户点击
    ↓
营销脚本还在执行
    ↓
主线程无法及时处理输入
    ↓
开始执行点击回调
```

这时你优化加入购物车回调自身，可能无法解决全部问题。

真正拖慢它的是**点击之前已经占用主线程的其他任务**。

#### Processing Duration：点击回调是不是做了太多事？

例如：

```js
button.addEventListener("click", () => {
  calculateDiscounts();
  calculateRecommendations();
  updateProductUI();
  openCartDrawer();
});
```

如果 `calculateRecommendations()` 是很昂贵的同步计算，就可能导致处理时间过长。

这时可以考虑：

- 删除不必要的同步计算。
- 把非关键计算延后或分片。
- 减少事件处理期间的 DOM 操作。
- 将适合的 CPU 密集型计算转移到 Worker。

#### Presentation Delay：JS 执行完成，为什么还没有画面？

例如点击回调修改了大量节点：

```js
drawer.innerHTML = newHTML;
```

浏览器可能还需要解析新节点、计算样式、执行 Layout 和 Paint。

即使 JS 回调本身已经结束，画面仍然可能晚些出现。

这时要特别关注 Performance 里的 Layout、Recalculate Style 和 Paint 事件。

### 2. 一个容易误解的 Shopify 问题

假设购物车 Ajax API 的响应耗时为 800ms。

那么这次点击的 INP 是否必然至少为 800ms？

**不一定。**

INP 衡量的是交互发生后到下一次呈现相关视觉反馈的延迟，并不直接等于整个异步业务流程的完成时间。

如果点击后立刻显示 Loading 状态，然后异步等待 800ms 的 API 返回，那么点击交互的 INP 可能很好。

但用户仍然需要等待 800ms 才能看到最终购物车结果。

因此要区分：

- **INP**：交互的可见响应是否及时。
- **异步业务完成耗时**：例如加入购物车请求何时完成、抽屉最终何时更新。

实际开发应该同时关注两者，避免为了让指标好看而只显示一个 Loading，却不优化真正缓慢的业务链路。

---

## 七、动手实验：制造一个真实的长任务

接下来给你一个可以直接放到本地 HTML 页面里的实验。

它有两个按钮：

- 第一个按钮会连续执行 CPU 计算，形成长任务。
- 第二个按钮会把计算拆分成多个任务。

你可以通过 Performance 面板分别录制两次点击，对比 Main 轨道。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Performance Demo</title>
</head>
<body>
  <button id="slow">同步执行</button>
  <button id="optimized">分片执行</button>
  <button id="ping">测试页面响应</button>

  <p id="status">尚未开始</p>

  <script>
    const status = document.querySelector("#status");

    function calculate(index) {
      let result = 0;

      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i + index);
      }

      return result;
    }

    // 原始方案
    document.querySelector("#slow").onclick = () => {
      status.textContent = "同步计算中";

      let result = 0;

      for (let i = 0; i < 500; i++) {
        result += calculate(i);
      }

      status.textContent = `完成：${result.toFixed(2)}`;
    };

    function yieldToMain() {
      if (globalThis.scheduler?.yield) {
        return globalThis.scheduler.yield();
      }

      return new Promise((resolve) => setTimeout(resolve, 0));
    }

    // 优化方案
    document.querySelector("#optimized").onclick = async () => {
      status.textContent = "分片计算中";

      let result = 0;
      let sliceStart = performance.now();

      for (let i = 0; i < 500; i++) {
        result += calculate(i);

        if (performance.now() - sliceStart >= 8) {
          await yieldToMain();
          sliceStart = performance.now();
        }
      }

      status.textContent = `完成：${result.toFixed(2)}`;
    };

    document.querySelector("#ping").onclick = () => {
      console.log("页面响应：", performance.now());
    };
  </script>
</body>
</html>
```

#### 实验过程

首先点击「同步执行」，计算尚未结束时尝试点击「测试页面响应」。

在计算持续占用主线程期间，第二个按钮的事件可能无法及时处理。

接下来刷新页面，点击「分片执行」，同样尝试在计算过程中点击「测试页面响应」。

如果计算足够耗时，你通常会发现分片方案为其他事件提供了更多执行机会。

然后在 Performance 中比较：

| 观察项目 | 同步版本 | 分片版本 |
|---|---|---|
| JS 任务 | 可能出现很长的连续任务 | 更容易分成短任务 |
| 其他点击事件 | 需要等待长任务结束 | 有机会在分片之间执行 |
| 页面渲染 | 可能长时间无法更新 | 有更多渲染机会 |
| 整体计算耗时 | 可能更短 | 可能略长 |

这里使用的是可重复执行的真实代码，但具体耗时取决于设备、浏览器 JIT 优化和运行环境，不应预设一定能达到某个固定数字。

这项实验可以让你直观看到：

**任务拆分的目标不是让 CPU 计算本身凭空消失，而是减少主线程连续被占用的时间。**

---

## 八、Shopify 特别篇：浏览器慢与 Liquid 慢必须分开分析

这是 Shopify Theme 开发与普通前端项目之间一个重要的区别。

你之前学习过 Liquid、Section、Snippet 和 Shopify 数据模型。

现在可以把这些知识用到性能分析中。

假设某个集合页需要渲染大量商品：

```liquid
{% for product in collection.products %}
  {% for variant in product.variants %}
    {% render 'variant-card',
      product: product,
      variant: variant
    %}
  {% endfor %}
{% endfor %}
```

这段代码的开销主要发生在 Shopify 服务端的 Liquid 渲染阶段。

而不是浏览器 JavaScript 主线程中。

因此：

**Chrome Performance 无法直接告诉你具体是哪一行 Liquid 花费了最多的服务端渲染时间。**

你需要另外的工具。

### Shopify Theme Inspector for Chrome

Shopify 官方提供了 <Entity category="software" value="Shopify Theme Inspector for Chrome" disambig="用于分析 Shopify Liquid 渲染性能的 Chrome 扩展"/>。

它可以将 Liquid 渲染过程显示成 Flame Graph（火焰图），帮助你识别耗时较高的 Section、Snippet 和 Liquid 操作。

<text size="sm"><Link url="https://shopify.dev/docs/storefronts/themes/tools/theme-inspector" title="Shopify Theme Inspector 官方文档"/></text>

基本使用流程是安装扩展、登录具有商店访问权限的 Shopify 账号、打开 DevTools 中的 Shopify 标签，再加载对应页面的 Liquid 性能 Profile。

于是，我们就得到一套更完整的 Shopify 性能诊断工具组合：

| 性能问题 | 首选工具 |
|---|---|
| DNS、连接、HTTP 请求慢 | Network |
| 图片下载慢 | Network + Performance |
| CSS、JS 阻塞渲染 | Performance Insights |
| JavaScript 长任务 | Performance Main / Bottom-Up |
| 购物车交互卡顿 | Performance Interactions |
| Liquid 渲染慢 | Shopify Theme Inspector |
| 实际用户体验不佳 | CrUX / 真实用户监控（RUM） |

注意，Shopify 流式 HTML 的存在意味着：即使 TTFB 较低，Section 的服务端渲染仍可能比较慢。

**因此，Shopify 项目中不能只比较 TTFB，还要观察完整 HTML 响应耗时、FCP 和 LCP。**

---

## 九、优化完成后，怎样进行科学的前后对比？

性能优化并不是修改代码之后 Lighthouse 分数高了一次，就可以宣布完成。

应该控制测试条件，尽可能降低偶然因素。

可采用以下诊断流程：

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">一个可重复的性能优化实验</text>
  <list marker="number" gap={2}>
    <list-item>固定同一商品页、同一视口、同一网络和 CPU 模拟条件。</list-item>
    <list-item>优化之前录制至少 5 次，记录 LCP、FCP 和关键资源时间。</list-item>
    <list-item>只修改一个明确的性能瓶颈，避免同时更改大量代码。</list-item>
    <list-item>在相同条件下再次录制，比较中位数与结果波动。</list-item>
    <list-item>最后用真实设备或真实用户数据确认优化是否有效。</list-item>
  </list>
</box>

例如，我们在模拟商品页中调整了主图资源发现策略，并减少了导致图片渲染延迟的 JS 长任务。

假设前后获得以下结果：

| 指标 | 优化前 | 优化后 |
|---|---:|---:|
| TTFB | 650ms | 640ms |
| FCP | 1.70s | 1.52s |
| 主图请求开始时间 | 1.50s | 0.82s |
| 主图请求完成时间 | 2.55s | 1.60s |
| LCP | 3.45s | 1.94s |
| 最长 JS 任务 | 600ms | 85ms |

<Chart content={{"chartType":"bar","meta":{"title":"优化前后的页面加载指标","description":"示例数据，单位：毫秒；数值越低通常越好。"},"xKey":"metric","series":[{"dataKey":"before","label":"优化前"},{"dataKey":"after","label":"优化后"}],"yAxisMin":0,"data":[{"metric":"TTFB","before":650,"after":640},{"metric":"FCP","before":1700,"after":1520},{"metric":"LCP","before":3450,"after":1940}]}}/>

这个结果的重点在哪里？

TTFB 几乎没有变化。

但 LCP 从 3.45 秒降低到 1.94 秒。

所以这次性能提升主要来自**浏览器侧的资源发现、下载与渲染路径**，而不是服务器更快地生成 HTML。

但这些模拟数据并不能证明某个单独改动贡献了多少毫秒。真实项目中还需要通过逐项实验和可重复测量来区分不同改动的贡献。

此外，实验室测试和真实用户体验可能不同。例如缓存命中、低端设备、实际移动网络、地区差异都会影响结果。Google 官方也强调，实验室数据不能取代真实用户数据。

---

## 十、本课最重要的：建立一套可复用的排查顺序

以后你遇到一个网站性能问题，可以按照下面这张诊断路线图进行分析。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 293" width="100%">
    <rect x="107" y="5" width="126" height="38" rx="8" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <text x="170" y="28" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">网站性能问题</text>
    <path d="M170 43 V59 H84 V75 M170 59 H257 V75" stroke="currentColor" strokeOpacity=".45" fill="none" strokeWidth="1.5"/>
    <rect x="9" y="75" width="150" height="47" rx="8" fill="#3b82f6" fillOpacity=".1" stroke="#3b82f6"/>
    <rect x="181" y="75" width="150" height="47" rx="8" fill="#d97706" fillOpacity=".1" stroke="#d97706"/>
    <text x="84" y="94" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">页面加载慢</text>
    <text x="84" y="110" textAnchor="middle" fontSize="10" fill="currentColor">FCP / LCP</text>
    <text x="256" y="94" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">点击与滚动卡顿</text>
    <text x="256" y="110" textAnchor="middle" fontSize="10" fill="currentColor">INP / 主线程</text>
    <path d="M84 122 V143 M256 122 V143" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5"/>
    <rect x="9" y="143" width="150" height="59" rx="8" fill="#3b82f6" fillOpacity=".07" stroke="#3b82f6" strokeOpacity=".5"/>
    <rect x="181" y="143" width="150" height="59" rx="8" fill="#d97706" fillOpacity=".07" stroke="#d97706" strokeOpacity=".5"/>
    <g fill="currentColor" fontSize="10.5" textAnchor="middle">
      <text x="84" y="159">Network</text>
      <text x="84" y="174">LCP Breakdown</text>
      <text x="84" y="189">Main / Screenshots</text>
      <text x="256" y="159">Interactions</text>
      <text x="256" y="174">Main / Bottom-Up</text>
      <text x="256" y="189">Layout / Paint</text>
    </g>
    <path d="M84 202 V217 H170 V233 M256 202 V217 H170" stroke="currentColor" strokeOpacity=".45" fill="none" strokeWidth="1.5"/>
    <rect x="54" y="233" width="232" height="48" rx="8" fill="#0d9488" fillOpacity=".1" stroke="#0d9488"/>
    <text x="170" y="251" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">定位具体瓶颈 → 修改代码</text>
    <text x="170" y="268" fontSize="10" textAnchor="middle" fill="currentColor">重复测量 → 验证性能变化</text>
  </svg>
</box>

最后强调一个很重要的观念：

**Chrome DevTools 的价值不是给出一个“慢”的结论，而是帮助你将抽象的用户体验问题，定位到具体的资源、时间段、浏览器任务和代码。**

例如：

不是说“商品主图加载慢”，而是说：

> 商品主图直到 TTFB 之后 850ms 才开始请求；图片在 2.55s 完成下载，但 LCP 到 3.45s 才发生。应该先排查资源发现时间和下载完成后的渲染延迟。

也不是说“购物车卡顿”，而是说：

> 本次点击交互延迟 380ms，其中输入等待 110ms、事件处理 120ms、呈现延迟 150ms。下一步分别检查点击前的长任务、回调开销与 DOM 更新引起的渲染成本。

这样才能提出有证据支撑的优化方案。

## 参考资料

- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Liquid performance optimization patterns](https://shopify.dev/docs/storefronts/themes/best-practices/performance/liquid-performance-patterns)
- [Shopify Theme Inspector for Chrome](https://shopify.dev/docs/storefronts/themes/tools/theme-inspector)
- [Testing for performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance)
- [Identify Liquid render issues using Shopify Theme Inspector](https://shopify.dev/docs/storefronts/themes/tools/theme-inspector/using-the-theme-inspector)
- [LCP breakdown | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/lcp-breakdown?authuser=68)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights/)
- [Performance panel: Analyze your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/overview)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference/)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/)
- [Render-blocking requests | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/render-blocking?authuser=921975487)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights?authuser=2&hl=en)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference?authuser=531874696)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights?hl=en)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference?authuser=384)
- [Network dependency tree | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/network-dependency-tree?authuser=303)
- [Network dependency tree | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/network-dependency-tree?authuser=921975487)
- [Insights sidebar in the DevTools Performance panel | Blog | Chrome for Developers](https://developer.chrome.com/blog/devtools-insights-sidebar?authuser=23)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights?authuser=531874696)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights?authuser=48)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights?trk=article-ssr-frontend-pulse_little-text-block)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?authuser=1)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?authuser=4)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?via=topaitools)
- [Web Vitals | Articles | web.dev](https://web.dev/articles/vitals?authuser=5&hl=en)
