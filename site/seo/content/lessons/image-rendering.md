# 浏览器图片加载、解码与渲染

> 浏览器解析 HTML 时遇到 `<img>`，会不会像遇到普通同步 `<script>` 一样，停止解析，等待图片下载完成？

**普通 `<img>` 是非解析阻塞资源。浏览器发现图片后，可以启动下载，同时继续解析后面的 HTML。**

但这只是第一步。

图片下载完成，不代表它会立即显示到屏幕上。它还需要经过解码、布局和渲染等处理。

我们从头把整个过程讲清楚。

## 一、浏览器遇到 img 标签后究竟发生什么？

先看一段完整的 HTML：

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <h1>商品详情</h1>

  <img
    src="product.jpg"
    width="400"
    height="400"
    alt="商品主图"
  >

  <p>商品价格：¥299</p>

  <button>加入购物车</button>

</body>
</html>
```

假设：

- HTML 加载很快。
- `style.css` 需要 800ms。
- `product.jpg` 需要 2000ms。

我们暂时忽略网络请求的细小开销。

### 1. 浏览器执行过程

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 360" width="100%">
    {#each [
      {y:5,title:"解析 HTML",sub:"读取 h1，创建标题 DOM",color:"#64748b"},
      {y:69,title:"遇到 <img>",sub:"创建 HTMLImageElement 节点",color:"#3b82f6"},
      {y:133,title:"发现图片 URL",sub:"发起或安排图片请求",color:"#3b82f6"},
      {y:197,title:"继续解析 HTML",sub:"创建 p、button 等后续节点",color:"#0d9488"},
      {y:261,title:"图片独立下载与解码",sub:"不要求主 HTML 解析器等待",color:"#d97706"}
    ] as x,i}
      <rect x="27" y={x.y} width="286" height="50" rx="8" fill={x.color} fillOpacity=".1" stroke={x.color} strokeOpacity=".45"/>
      <text x="170" y={x.y+20} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600">{x.title}</text>
      <text x="170" y={x.y+36} textAnchor="middle" fill="currentColor" fontSize="10.5" opacity=".7">{x.sub}</text>
      {#if i<4}
        <path d={`M170 ${x.y+50} v12 m-4 -4 l4 4 4 -4`} fill="none" stroke="currentColor" strokeOpacity=".4"/>
      {/if}
    {/each}
    <text x="170" y="339" fontSize="10.5" fill="currentColor" opacity=".65" textAnchor="middle">图片加载和后续 HTML 解析可以重叠进行</text>
  </svg>
  <caption>这是逻辑说明，并不是严格串行的执行过程。图片下载可能早在 DOM 节点正式构建之前就由预加载扫描器启动。</caption>
</box>

也就是说，当浏览器解析到：

```html
<img src="product.jpg">
```

通常会做以下事情：

1. 创建对应的 DOM 元素（`HTMLImageElement`）。
2. 识别 `src` 等图片资源信息。
3. 根据资源策略发起或调度图片请求。
4. 继续解析 HTML 后面的内容。
5. 当图片资源可用时，再安排相应的图片呈现工作。

**不会因为图片要下载两秒，就让后面的 `<p>` 和 `<button>` 等待两秒才能进入 DOM。**

MDN 对浏览器工作原理的说明也明确指出：遇到图片等非阻塞资源时，浏览器会请求资源并继续解析 HTML。

---

## 二、图片下载需要两秒，页面会不会等两秒才显示？

通常不会。

这就是图片和普通 CSS 的一个重要区别。

我们来看一个模拟时间线。

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">图片下载与 HTML 解析、页面渲染的关系</text>
  <svg viewBox="0 0 340 225" width="100%">
    <g fill="currentColor" fontSize="10" opacity=".7">
      <text x="101" y="15">0s</text>
      <text x="156" y="15">0.5s</text>
      <text x="205" y="15">1s</text>
      <text x="291" y="15">2s</text>
    </g>
    <g stroke="currentColor" strokeOpacity=".12">
      {#each [104,156,208,312] as x}
        <line x1={x} y1="21" x2={x} y2="179" strokeDasharray="3 3"/>
      {/each}
    </g>
    <g fill="currentColor" fontSize="10.5">
      <text x="3" y="48">HTML 解析</text>
      <text x="3" y="82">CSS 下载</text>
      <text x="3" y="116">图片下载</text>
      <text x="3" y="150">其他内容绘制</text>
      <text x="3" y="184">图片绘制</text>
    </g>
    <rect x="105" y="33" width="28" height="21" rx="3" fill="#64748b"/>
    <rect x="105" y="67" width="83" height="21" rx="3" fill="#3b82f6"/>
    <rect x="122" y="101" width="190" height="21" rx="3" fill="#d97706"/>
    <rect x="190" y="135" width="27" height="21" rx="3" fill="#0d9488"/>
    <rect x="315" y="169" width="19" height="21" rx="3" fill="#0d9488"/>
    <path d="M190 25 V160" stroke="#0d9488" strokeDasharray="3 3" strokeWidth="1.5"/>
    <text x="192" y="208" textAnchor="middle" fontSize="10.5" fill="currentColor">CSS 就绪后，其他内容可以先显示</text>
    <text x="192" y="220" textAnchor="middle" fontSize="9.5" fill="currentColor" opacity=".65">图片稍后下载、解码并绘制</text>
  </svg>
  <caption>示意数据：CSS 约 800ms 完成、图片约 2s 完成。图片首次呈现时间还取决于解码与渲染调度。</caption>
</box>

实际可能出现：

**约 0.1 秒：** HTML 已经解析完成，标题、图片节点、价格、按钮都已经存在于 DOM 中。

**约 0.8 秒：** CSS 下载完成，浏览器能够完成相关内容的首次绘制。

此时用户可以看到标题、价格和按钮，图片所在区域可能仍然是空白的。

**约 2 秒：** 图片下载完成，浏览器在解码并完成必要的渲染后，将图片绘制出来。

因此：

**浏览器完全可以先显示文字和其他内容，再把下载完成的图片补充显示出来。**

这也是为什么你有时打开一个网站，会先看到页面骨架和文字，稍后图片才逐渐出现。

Google 的关键渲染路径文档也明确指出，浏览器通常不需要等待全部图片加载完成才进行首次绘制。

---

## 三、img 是一个普通 DOM 节点吗？图片本身也是 DOM 吗？



我们要严格区分：

**`<img>` 元素、图片资源、图片最终显示出的像素，是三个不同概念。**

例如：

```html
<img src="cat.jpg" width="400" height="300">
```

### 1. img 是 DOM 元素

浏览器会创建一个 `HTMLImageElement` 对象。

你可以用 JavaScript 操作它：

```js
const img = document.querySelector("img");

console.log(img.src);
console.log(img.width);
console.log(img.height);
```

它拥有普通 DOM 元素的许多能力。

例如：

- 具有 DOM 父子关系。
- 可以添加 class。
- 可以设置 CSS。
- 可以注册事件。
- 可以通过 JS 修改属性。

### 2. 图片文件不是 DOM

`cat.jpg` 是一份独立的二进制图片资源。

它包含经过 JPEG 格式编码的数据。

浏览器下载 JPEG 数据之后，必须通过图片解码器，把压缩数据转换为能够用于绘制的图像表示。

所以，不是浏览器把 JPG 文件直接当成一个 DOM 节点插入页面。

而是：

```text
<img> 元素
    │
    ├── DOM：元素位置、属性和结构
    │
    ├── CSS：样式、宽高、object-fit 等
    │
    └── Image Resource：图片二进制数据
                   ↓
                图片解码
                   ↓
          参与后续绘制与合成
```

### 3. 最终如何显示？

可以将它理解为以下流程：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 288" width="100%">
    <rect x="6" y="7" width="156" height="48" rx="8" fill="#3b82f6" fillOpacity=".10" stroke="#3b82f6" strokeOpacity=".6"/>
    <rect x="178" y="7" width="156" height="48" rx="8" fill="#d97706" fillOpacity=".10" stroke="#d97706" strokeOpacity=".6"/>
    <text x="84" y="27" fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">DOM / CSS</text>
    <text x="84" y="44" fontSize="10" fill="currentColor" textAnchor="middle">元素样式和尺寸</text>
    <text x="256" y="27" fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">图片资源</text>
    <text x="256" y="44" fontSize="10" fill="currentColor" textAnchor="middle">下载 JPG / PNG / WebP</text>
    <path d="M256 55 V72" stroke="currentColor" strokeOpacity=".5" fill="none"/>
    <rect x="178" y="73" width="156" height="43" rx="8" fill="#d97706" fillOpacity=".08" stroke="#d97706" strokeOpacity=".5"/>
    <text x="256" y="90" fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">Decode</text>
    <text x="256" y="106" fontSize="10" fill="currentColor" textAnchor="middle">解码图像数据</text>
    <path d="M84 55 V135 H170 V153 M256 116 V135 H170" stroke="currentColor" strokeOpacity=".45" fill="none" strokeWidth="1.5"/>
    <rect x="65" y="153" width="210" height="40" rx="8" fill="#0d9488" fillOpacity=".1" stroke="#0d9488" strokeOpacity=".55"/>
    <text x="170" y="170" fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">Layout / Paint</text>
    <text x="170" y="185" fontSize="10" fill="currentColor" textAnchor="middle">放置图片，绘制需要显示的内容</text>
    <path d="M170 193 V211" stroke="currentColor" strokeOpacity=".45" fill="none"/>
    <rect x="65" y="211" width="210" height="40" rx="8" fill="#8b5cf6" fillOpacity=".1" stroke="#8b5cf6" strokeOpacity=".55"/>
    <text x="170" y="228" fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">Composite</text>
    <text x="170" y="243" fontSize="10" fill="currentColor" textAnchor="middle">合成最终屏幕画面</text>
    <text x="170" y="276" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".65">图片下载与布局计算并不必须严格串行</text>
  </svg>
</box>

图片元素和图片资源分别参与不同阶段：

**`<img>` 会作为元素参与样式计算、布局、绘制和合成，但它比一个普通文字元素多了一项重要工作：获取和解码外部图像数据。**

这里还有一个细节：图片不一定总是先完全解码，然后才进行第一次布局。浏览器可以在图片下载、解码的同时计算页面布局，只要已经有足够的信息确定图片显示尺寸。

接下来这个问题就很重要了。

---

## 四、图片还没下载完成，浏览器怎么计算 Layout？

这是图片与布局之间最关键的联系。

假设：

```html
<div class="product">
  <h1>商品标题</h1>

  <img src="product.jpg">

  <p>商品价格：¥299</p>
</div>
```

注意，这里的 `<img>` 没有指定 `width` 和 `height`。

浏览器解析到图片标签时，可能还不知道图片的实际宽高。

而图片是一个具有固有尺寸的替换元素（Replaced Element）。

浏览器在确定布局时可能需要利用图片的固有尺寸或纵横比。

这时会出现什么问题？

### 情况 A：没有指定图片尺寸

先看页面在图片加载前后的变化。

<grid columns={2} gap={3}>
  <grid-item>
    <box border radius="lg" padding={2} gap={2}>
      <text weight="medium" size="xs" color="secondary" textAlign="center">图片加载前</text>
      <box background="surface-secondary" radius="md" padding={2} gap={2}>
        <text weight="medium" size="sm">商品标题</text>
        <box border={{size:1,color:"subtle",style:"dashed"}} height="16px" radius="xs"/>
        <text size="sm">价格 ¥299</text>
        <box background="surface-tertiary" padding={2} radius="sm">
          <text size="xs" textAlign="center">加入购物车</text>
        </box>
      </box>
    </box>
  </grid-item>
  <grid-item>
    <box border radius="lg" padding={2} gap={2}>
      <text weight="medium" size="xs" color="secondary" textAlign="center">图片加载后</text>
      <box background="surface-secondary" radius="md" padding={2} gap={2}>
        <text weight="medium" size="sm">商品标题</text>
        <LessonImage src="assets/cached/cached-03.jpg" alt="single brown leather sneaker product photograph on neutral beige studio background"/>
        <text size="sm">价格 ¥299</text>
        <box background="surface-tertiary" padding={2} radius="sm">
          <text size="xs" textAlign="center">加入购物车</text>
        </box>
      </box>
    </box>
  </grid-item>
</grid>

如果浏览器原来没有为图片预留足够的空间，图片固有尺寸确定后，可能需要重新计算布局。

于是价格和购买按钮被向下推。

这个现象就是 **Layout Shift（布局偏移）** 的典型来源。

浏览器可能先根据已有 CSS 和占位信息完成一次布局，之后再根据图片的实际尺寸更新布局。

注意，图片文件不一定必须完整下载才能知道尺寸，某些格式可以在读取部分文件信息后获得图片宽高。

### 情况 B：提前指定宽高

```html
<img
  src="product.jpg"
  width="800"
  height="600"
  alt="商品主图"
>
```

配合：

```css
img {
  max-width: 100%;
  height: auto;
}
```

浏览器在获得图片像素数据之前，就可以根据 HTML 声明的纵横比和 CSS 约束，为图片计算合理的显示空间。

<box border radius="lg" padding={3} gap={2}>
  <grid columns={2} gap={2}>
    <grid-item>
      <box gap={1}>
        <text size="xs" weight="medium" textAlign="center">加载前</text>
        <box aspectRatio="4/3" background="surface-secondary" border={{size:1,color:"subtle",style:"dashed"}} radius="md" align="center" justify="center">
          <icon name="image" color="tertiary" size="xl"/>
          <text size="xs" color="secondary">图片占位空间</text>
        </box>
        <text size="xs" textAlign="center">价格 ¥299</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <text size="xs" weight="medium" textAlign="center">加载后</text>
        <LessonImage src="assets/cached/cached-02.jpg" alt="single brown leather sneaker product photograph on neutral beige studio background"/>
        <text size="xs" textAlign="center">价格 ¥299</text>
      </box>
    </grid-item>
  </grid>
  <caption>前后图片区域保持相同尺寸，避免因为图片本身突然占据空间而推动下方元素。其他动态内容仍可能造成布局偏移。</caption>
</box>

这里有一个很重要的结论：

**图片晚下载，不一定意味着 Layout 必须等图片下载完成。浏览器只要提前知道图片应该占据的空间，就可以先安排其他元素的布局。**

这也是为什么我们在开发 Shopify Theme 时，应该为商品图片提供正确的尺寸和纵横比。

例如：

```liquid
{{
  product.featured_image
  | image_url: width: 1000
  | image_tag:
    loading: 'eager',
    widths: '400, 600, 800, 1000',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

Shopify 的 `image_tag` 通常能够根据图片数据生成 `width`、`height` 等相关属性。

但仍然需要检查 Theme CSS 是否正确保留图片纵横比。

---

## 五、图片下载完成后，会马上显示吗？



假设：

```html
<img src="product.jpg" width="400" height="300">
```

在某个时刻，Network 面板显示：

`product.jpg — Finished`

是不是就意味着浏览器已经把图片显示到屏幕上？

**不一定。**

我们需要区分四件事情：

1. 图片文件下载完成。
2. 图片数据完成必要的解码。
3. 浏览器完成相关渲染工作。
4. 画面真正被呈现出来。

### 1. 什么是图片解码（Image Decoding）？

图片文件通常是经过压缩编码的。

例如：

- JPEG
- PNG
- WebP
- AVIF

浏览器获取图片文件后，需要将其中的编码数据处理成可用于绘制的图像数据。

以 JPEG 为例，浏览器不能简单地把网络收到的 JPEG 字节当作屏幕像素原封不动显示。

需要解码。

而图片解码也会消耗 CPU 和内存资源。

需要注意：现代浏览器可能在后台线程执行部分解码工作，还可能渐进解码、缓存解码后的数据或按需解码，不是所有图片都在主线程上完整同步解码。

### 2. decoding 属性

HTML 允许我们给图片指定解码提示：

```html
<img
  src="product.jpg"
  decoding="async"
  width="400"
  height="300"
>
```

有三种值：

| 值 | 含义 |
|---|---|
| `auto` | 交给浏览器决定，默认值 |
| `async` | 允许图片解码与其他内容的呈现分开进行 |
| `sync` | 提示浏览器将图片解码和其他内容更新协调呈现 |

例如：

```html
<img src="product.jpg" decoding="async">
```

可以表达：

如果图片解码尚未完成，不必为了这张图片而延迟其他内容的呈现。

而：

```html
<img src="product.jpg" decoding="sync">
```

表达了更倾向于同步呈现相关内容的意图。

但必须强调：

**`decoding` 是提示，不是强制指令，也不保证图片会更快下载或者更早显示。**

MDN 指出，对于普通静态 HTML 图片，改变 `decoding` 属性带来的效果有时并不明显；动态插入和切换图片时，差异可能更加容易观察。

### 3. 图片完成下载，但 JS 正在执行怎么办？

假设：

```text
2000ms：图片下载完成
2050ms：JavaScript 长任务开始
2500ms：JavaScript 长任务结束
2520ms：浏览器完成必要的绘制
```

即使图片在 2000ms 已经下载完毕，如果浏览器主线程被后续 JavaScript 长任务占用，图片的首次呈现仍可能被延迟。

但这也不是说每张图片都必须等待所有 JavaScript 执行完。实际取决于图片解码、当前渲染状态、主线程任务、合成器工作和浏览器的调度。

这就是我们前面学习的 LCP Breakdown 中：

**Resource Load Duration 与 Element Render Delay 是两个不同的阶段。**

### 4. 用 JavaScript 提前解码图片

假设你正在开发 Shopify 的商品变体切换。

用户从红色商品切换成蓝色商品。

如果直接修改：

```js
image.src = blueImageUrl;
```

浏览器会去获取或读取缓存中的蓝色图片，并在适当时机解码和显示。

如果你希望在蓝色图片准备好之后再替换，可以利用：

```js
async function changeImage(imageElement, url) {
  const nextImage = new Image();

  nextImage.src = url;

  try {
    await nextImage.decode();

    imageElement.src = url;
  } catch (error) {
    console.error("图片加载或解码失败", error);
  }
}
```

`decode()` 返回一个 Promise，在图片解码完成后 resolve。

这可以减少动态替换图片时出现空白或解码等待的风险。

不过实际项目还要处理两个问题：

- 用户连续切换变体时，防止旧图片覆盖新选择。
- 如果新旧图片尺寸或纵横比不同，要避免布局跳动。

另外，提前解码后修改另一个 `<img>` 的 `src`，并不绝对保证下一帧就能呈现；资源缓存复用、渲染调度和图片状态仍然会产生影响。

---

## 六、img 与 CSS、JavaScript 究竟如何相互影响？

到这里我们已经了解了图片自己的生命周期。

接下来把三者放在同一个 HTML 中，分析真正的相互依赖关系。

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
  <script src="app.js"></script>
</head>
<body>
  <h1>商品详情</h1>
  <img src="product.jpg" width="400" height="400">
  <p>售价：¥299</p>
</body>
</html>
```

假设：

- CSS 需要 1 秒下载。
- JS 需要 0.3 秒下载。
- 图片需要 2 秒下载。

### 1. CSS 和 JS 之间的关系

HTML 解析器先遇到：

```html
<link rel="stylesheet" href="style.css">
```

浏览器启动 CSS 下载，并继续解析。

随后遇到：

```html
<script src="app.js"></script>
```

这是普通同步脚本。

因此 HTML 主解析器暂停，等待脚本执行。

但脚本前面还有尚未就绪的阻塞脚本样式表，所以 JavaScript 还需要等待 CSS。

假设 CSS 在 1 秒完成，那么 JS 才能继续执行，之后 HTML 主解析器才能处理 `body`。

### 2. JS 和 img 之间的关系

HTML 主解析器最终遇到：

```html
<img src="product.jpg">
```

浏览器构建图片 DOM 元素，并安排图片下载。

但要注意：

现代浏览器的**预加载扫描器**可能早于 HTML 主解析器发现 `product.jpg`，并提前下载。

因此：

- 同步 JS 可以阻止主解析器继续构建后面的 DOM。
- 但不代表一定能阻止后面图片的网络请求被提前发现。

如果图片不是写在 HTML 中，而是通过 JS 动态创建，那么图片资源的发现就可能真正依赖 JS 执行。

### 3. CSS 和 img 之间的关系

CSS 主要影响图片怎样显示，而不是普通 `<img>` 是否能够开始下载。

例如：

```css
img {
  width: 400px;
  height: 300px;
  object-fit: cover;
}
```

图片仍然可以独立请求。

但 CSS 会影响它的：

- 显示尺寸。
- 布局位置。
- 裁切方式。
- 透明度。
- 显示与隐藏。
- 变换和动画。

比如：

```css
img {
  display: none;
}
```

即使图片下载完成，也不会正常显示出来。

而且 `display: none` 可能影响图片是否需要被获取，具体与资源引用方式和浏览器行为有关，不能将它当作可靠的网络加载控制手段。

如果是：

```css
img {
  opacity: 0;
}
```

图片可以下载、解码和参与布局，但视觉上是完全透明的。

另外，CSS 本身也可能延迟页面的首次渲染。

所以：

**图片不会像关键 CSS 那样默认阻塞首屏渲染，但关键 CSS 仍然可以影响图片首次显示的时间。**

### 4. 这四种资源的阻塞关系总结

| 资源 | 会阻塞 HTML 解析吗？ | 会阻塞首次渲染吗？ | 会影响页面布局吗？ |
|---|---|---|---|
| 普通 `<img>` | 不会 | 通常不会阻塞其他内容 | 会，尤其尺寸不明确时 |
| 普通 head CSS | 通常不会 | 通常会 | 会 |
| 同步经典 JS | 会 | 可能延迟 | 如果修改 DOM/CSS，会 |
| `defer` JS | 不会阻塞 HTML 主解析器 | 执行或造成的工作可能延迟绘制 | 取决于执行内容 |

普通图片通常也不会阻止 `DOMContentLoaded` 触发，但默认 eager 图片的加载通常会影响文档的 `window.load` 事件；懒加载图片则不按同样方式阻塞 `load`。

---

## 七、通过一个实际案例理解完整时间线

我们用下面这段代码：

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <h1>商品详情</h1>

  <img
    src="product.jpg"
    width="400"
    height="300"
    loading="eager"
    decoding="async"
  >

  <p>售价：¥299</p>
</body>
</html>
```

假设所有资源都可以正常加载。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">资源下载与渲染完整时间线（教学模拟）</text>
  <svg viewBox="0 0 342 248" width="100%">
    <g fill="currentColor" fontSize="9.5" opacity=".65">
      {#each [0,0.5,1,1.5,2] as t}
        <text x={108+t*102} y="14" textAnchor="middle">{t}s</text>
        <line x1={108+t*102} y1="23" x2={108+t*102} y2="190" stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 3"/>
      {/each}
    </g>
    <g fill="currentColor" fontSize="10.5">
      <text x="5" y="47">HTML 解析</text>
      <text x="5" y="76">CSS 下载</text>
      <text x="5" y="105">JS 下载</text>
      <text x="5" y="134">图片下载</text>
      <text x="5" y="163">JS 执行</text>
      <text x="5" y="192">首次绘制</text>
    </g>
    <rect x="108" y="33" width="27" height="18" rx="3" fill="#64748b"/>
    <rect x="108" y="62" width="102" height="18" rx="3" fill="#3b82f6"/>
    <rect x="114" y="91" width="34" height="18" rx="3" fill="#94a3b8"/>
    <rect x="121" y="120" width="191" height="18" rx="3" fill="#d97706"/>
    <rect x="211" y="149" width="10" height="18" rx="3" fill="#8b5cf6"/>
    <rect x="223" y="178" width="17" height="18" rx="3" fill="#0d9488"/>
    <text x="119" y="224" fontSize="10" fill="currentColor">图片下载与 CSS、HTML、JS 工作并行</text>
    <text x="119" y="238" fontSize="10" fill="currentColor" opacity=".7">图片完成后再安排解码及呈现</text>
  </svg>
  <caption>此图并不要求 defer 脚本一定先于首次绘制，具体顺序由浏览器调度决定；仅演示一种可能发生的执行时间线。</caption>
</box>

可以这样理解：

**第一个阶段：** 浏览器收到 HTML，发现 CSS、JS、图片资源，并安排下载。

**第二个阶段：** HTML 解析完成。因为使用了 `defer`，JS 下载没有阻止后续 DOM 的构建。

**第三个阶段：** 当关键 CSS 已经就绪、浏览器有合适的渲染机会时，可以先显示标题、价格和图片占位区域。

**第四个阶段：** 图片继续下载，它不需要阻塞整个页面已经可以显示的内容。

**第五个阶段：** 图片下载完成，经过必要的解码和渲染工作后显示到页面中。

因为提前指定了图片宽高，图片出现时通常不需要再把下方价格推开。

---

## 八、最后用 JavaScript 验证图片的不同状态

你可以在一个实际网站的控制台运行下面这段代码。

```js
const img = document.querySelector("img");

console.log({
  complete: img.complete,
  naturalWidth: img.naturalWidth,
  naturalHeight: img.naturalHeight,
  width: img.width,
  height: img.height,
});
```

这里有四个容易混淆的属性：

| 属性 | 代表什么 |
|---|---|
| `complete` | 当前图片请求是否处于完成状态，也可能是空资源或失败状态 |
| `naturalWidth` | 图片的固有宽度（以 CSS 像素表示，可能受浏览器处理影响） |
| `width` | 元素当前的表示宽度 |
| `height` | 元素当前的表示高度 |

一个很实用的判断：

```js
if (img.complete && img.naturalWidth > 0) {
  console.log("图片已经成功加载");
}
```

如果需要等待图片解码完成：

```js
await img.decode();

console.log("图片解码完成");
```

但是，**`decode()` 完成也不代表浏览器一定已经把图片呈现到屏幕上**。它表示图像数据已经准备好供呈现使用，实际绘制仍然由浏览器安排。

你还可以观察图片的 `load` 事件：

```js
img.addEventListener("load", () => {
  console.log("图片 load 事件触发");
});
```

注意：如果图片已经完成加载，之后才添加监听器，就不会补发之前的 `load` 事件。

这也是为什么实际代码通常要结合 `complete` 和 `naturalWidth` 判断加载状态。

---

## 九、图片加载常见问题

| 问题 | 答案 |
|---|---|
| img 是像普通 DOM 一样渲染的吗？ | 是。`img` 元素参与 DOM、Style、Layout、Paint 和 Composite，但图像资源还需要下载、解码。 |
| 浏览器遇到 img 会停止 HTML 解析吗？ | **不会。** 普通 img 不阻塞 HTML 解析。 |
| 图片下载完成后马上显示吗？ | **不一定。** 还需要必要的解码和渲染工作，并等待合适的呈现时机。 |
| 图片会影响后面的 HTML 解析和渲染吗？ | 通常不影响后续 HTML 解析，但可能通过布局尺寸、解码或资源竞争影响渲染。 |
| 图片与 CSS、JS 怎么相互影响？ | CSS 决定图片如何布局和显示；JS 可以创建、修改、隐藏图片，也可能通过长任务延迟图片呈现。 |

图片渲染过程可以概括为：

**图片有两条相互关联、但可以并行推进的工作路径。**

<box border radius="lg" padding={3} gap={2}>
  <svg viewBox="0 0 340 202" width="100%">
    <text x="84" y="18" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">元素布局路径</text>
    <text x="255" y="18" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">图像资源路径</text>
    {#each [
      {x:14,y:33,w:142,t:"解析 img → DOM",c:"#3b82f6"},
      {x:14,y:83,w:142,t:"CSS → Layout",c:"#3b82f6"},
      {x:184,y:33,w:142,t:"请求 → 下载图片",c:"#d97706"},
      {x:184,y:83,w:142,t:"Image Decode",c:"#d97706"}
    ] as n}
      <rect x={n.x} y={n.y} width={n.w} height="35" rx="7" fill={n.c} fillOpacity=".1" stroke={n.c} strokeOpacity=".55"/>
      <text x={n.x+n.w/2} y={n.y+22} textAnchor="middle" fontSize="11" fill="currentColor">{n.t}</text>
    {/each}
    <path d="M85 68 V83 M255 68 V83 M85 118 V137 H170 V151 M255 118 V137 H170" stroke="currentColor" strokeOpacity=".4" strokeWidth="1.5" fill="none"/>
    <rect x="64" y="151" width="212" height="38" rx="7" fill="#0d9488" fillOpacity=".1" stroke="#0d9488" strokeOpacity=".6"/>
    <text x="170" y="174" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">Paint / Composite → 屏幕</text>
  </svg>
</box>

左侧负责确定图片**显示在哪里、占多少空间**。

右侧负责准备图片**实际要显示的像素内容**。

两条路径不需要完全串行。等图片数据就绪、相关渲染条件满足后，浏览器就可以将图片呈现在对应位置。

这也是为什么：

- 图片没下载完，页面仍然可以先显示。
- 图片没下载完，浏览器仍然可以提前布局。
- 图片下载完了，也不一定马上绘制。
- 图片出现时可能产生 Layout Shift。
- 首屏商品主图应该尽早下载，但不能为了它阻塞整张页面。

## 参考资料

- [HTMLElement: load event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/load_event)
- [<img> HTML image embed element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [HTMLImageElement: decode() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)
- [HTMLImageElement: decoding property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding)
- [Document: DOMContentLoaded event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [Populating the page: how browsers work - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [Critical rendering path - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [Understand the critical path | web.dev](https://web.dev/learn/performance/understanding-the-critical-path)
- [Understand the critical path | web.dev](https://web.dev/learn/performance/understanding-the-critical-path?authuser=10)
- [Optimize resource loading with the Fetch Priority API | Articles | web.dev](https://web.dev/articles/fetch-priority?hl=en)
- [Understand the critical path | web.dev](https://web.dev/learn/performance/understanding-the-critical-path?authuser=131)
- [content/files/en-us/web/html/reference/elements/img/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/img/index.md?plain=1)
- [HTML Standard](https://html.spec.whatwg.org/multipage/images.html)
