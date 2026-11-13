# 图片与字体深度优化：DPR、响应式图片、解码与字体渲染


这一课我们要解决三个真正影响前端页面表现的问题。

**第一个问题：** 为什么一张宽度为 800px 的商品图片，显示在宽度只有 400px 的容器中，仍然可能不够清晰？

**第二个问题：** 浏览器面对一组不同尺寸、不同格式的图片时，究竟如何决定下载哪一张？

**第三个问题：** 为什么一个字体文件下载完成后，商品标题可能突然换行，导致下方购买按钮移动？

这些问题涉及图片像素密度、浏览器资源选择、图像解码和文字布局。

我们依然以 Shopify 商品详情页和集合页为主要场景。

---

## 一、先理解 CSS 像素与图片像素不是同一个概念

假设你在页面上写：

```html
<img src="product.jpg" alt="商品图片">
```

CSS：

```css
.product-image {
  width: 400px;
  height: 400px;
}
```

这意味着图片在页面布局中占据一个 **400 × 400 CSS 像素**的区域。

但这不代表屏幕上只使用 400 × 400 个物理像素显示它。

这是理解响应式图片的第一步。

### 1. CSS 像素与物理像素

在普通 DPR = 1 的环境下，可以近似理解为：

```text
1 CSS 像素 ≈ 1 设备物理像素
```

但在高密度屏幕上，例如 DPR = 2：

```text
1 CSS 像素 ≈ 2 × 2 设备物理像素
```

也就是说，一个 400 × 400 CSS 像素的图片区域，在 DPR = 2 的显示条件下，大致对应 800 × 800 的物理像素网格。

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">相同的 CSS 像素，不同的物理像素密度</text>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2} align="center">
        <title size="md">DPR = 1</title>
        <svg viewBox="0 0 128 128" width="100%">
          <rect x="14" y="14" width="100" height="100" rx="2" fill="#3b82f6" fillOpacity=".07" stroke="#3b82f6" strokeWidth="1.5"/>
          {#each [0,1,2,3,4] as n}
            <path d={`M${14+n*20} 14 V114 M14 ${14+n*20} H114`} stroke="#3b82f6" strokeOpacity=".55" strokeWidth="1"/>
          {/each}
        </svg>
        <text color="secondary" size="xs" textAlign="center">一个 CSS 单位约对应一个物理像素</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2} align="center">
        <title size="md">DPR = 2</title>
        <svg viewBox="0 0 128 128" width="100%">
          <rect x="14" y="14" width="100" height="100" rx="2" fill="#0d9488" fillOpacity=".07" stroke="#0d9488" strokeWidth="1.5"/>
          {#each Array.from({length:11},(_,i)=>i) as n}
            <path d={`M${14+n*10} 14 V114 M14 ${14+n*10} H114`} stroke="#0d9488" strokeOpacity=".55" strokeWidth=".7"/>
          {/each}
        </svg>
        <text color="secondary" size="xs" textAlign="center">一个 CSS 单位约对应 2×2 个物理像素</text>
      </box>
    </grid-item>
  </grid>
  <caption>网格为概念示意；浏览器缩放、系统缩放、合成和显示方式也会影响实际像素映射。</caption>
</box>

DPR 的英文是：

**Device Pixel Ratio（设备像素比）**

在浏览器中可以通过：

```js
console.log(window.devicePixelRatio);
```

查看当前有效的设备像素比。

注意：它并不纯粹等于显示屏硬件的固定参数。浏览器页面缩放等因素也可能改变这个值。

### 2. DPR 为什么影响图片清晰度？

假设图片的原始像素尺寸是：

```text
400 × 400
```

而页面上的显示尺寸也是：

```text
400 × 400 CSS px
```

在 DPR = 1 的环境中，这张图片通常已经具备足够的像素密度。

但在 DPR = 2 的环境中，如果希望每个物理像素附近都有对应的源图像采样信息，理想的资源尺寸通常接近：

\[
400\times2=800
\]

即：

```text
800 × 800 图片像素
```

而 DPR = 3 时：

\[
400\times3=1200
\]

理想尺寸可能接近 1200 × 1200。

| CSS 显示宽度 | DPR | 参考图片资源宽度 |
|---|---:|---:|
| 400px | 1 | 400px |
| 400px | 2 | 800px |
| 400px | 3 | 1200px |
| 600px | 2 | 1200px |

不过“DPR × 显示尺寸”只是用于理解清晰度需求的参考值，并不是必须下载的精确宽度。网络状况、压缩质量、内容细节、浏览器缓存和用户体验都会影响最终取舍。

这也意味着：

**一张 800px 的商品图，在某些 400px 宽的高密度屏幕上仍然可能被放大，导致清晰度不理想。**

---

## 二、srcset：让浏览器根据设备选择不同图片

现在假设 Shopify CDN 可以提供同一商品图片的多个尺寸：

```text
product-400.jpg
product-800.jpg
product-1200.jpg
product-1600.jpg
```

如果我们只写：

```html
<img src="product-1600.jpg">
```

那么即使图片只显示 200 CSS px，浏览器也可能下载这张 1600px 的大图。

这样会浪费传输字节、解码资源和内存。

HTML 提供了 `srcset` 来解决这个问题。

### 1. 第一种写法：x 描述符

```html
<img
  src="product-400.jpg"
  srcset="
    product-400.jpg 1x,
    product-800.jpg 2x,
    product-1200.jpg 3x
  "
  width="400"
  height="400"
  alt="商品主图"
>
```

这里的：

```text
1x
2x
3x
```

表示资源对应的像素密度。

假设这张图片始终以 400 CSS px 宽显示：

- DPR = 1：浏览器可能选择 400px 图片。
- DPR = 2：可能选择 800px 图片。
- DPR = 3：可能选择 1200px 图片。

这种写法适合**图片布局尺寸相对固定，主要需要适配屏幕密度**的场景。

### 2. 第二种写法：w 描述符

例如：

```html
<img
  src="product-800.jpg"
  srcset="
    product-400.jpg 400w,
    product-800.jpg 800w,
    product-1200.jpg 1200w,
    product-1600.jpg 1600w
  "
  sizes="400px"
  alt="商品主图"
>
```

这里的 `400w`、`800w` 并不是 CSS 显示宽度。

它们表示候选图片文件的**固有像素宽度**。

例如：

```text
product-800.jpg 800w
```

意思是：

这个资源宽度是 800 个图像像素。

浏览器会结合 `sizes` 和 DPR 等条件来选择候选图片。

MDN 对响应式图片的说明明确区分了宽度描述符 `w` 与像素密度描述符 `x`。

### 3. 那么，sizes 又是什么？

很多前端开发者知道 `srcset`，却不理解 `sizes`。

这是响应式图片中最关键、也最容易出错的属性。

假设：

```html
<img
  src="product-800.jpg"
  srcset="
    product-400.jpg 400w,
    product-800.jpg 800w,
    product-1200.jpg 1200w,
    product-1600.jpg 1600w
  "
  sizes="(min-width: 990px) 50vw, 100vw"
  alt="商品主图"
>
```

我们逐段分析：

```text
(min-width: 990px) 50vw
```

意思是：

当视口宽度至少为 990 CSS px 时，告诉浏览器图片的预计布局宽度为视口宽度的 50%。

后面的：

```text
100vw
```

是默认值：

当上面的条件不满足时，预计图片宽度为整个视口宽度。

现在假设用户访问商品页：

**手机：** 视口宽度 390 CSS px，DPR = 3。

根据 `sizes`，预计图片布局宽度：

\[
390\times100\%=390px
\]

目标资源宽度参考值：

\[
390\times3=1170px
\]

因此浏览器通常会倾向于选择大约 1200px 的候选图片。

**桌面：** 视口宽度 1440 CSS px，DPR = 2。

根据 `sizes`，预计图片布局宽度：

\[
1440\times50\%=720px
\]

目标资源宽度参考值：

\[
720\times2=1440px
\]

如果候选列表是 400、800、1200、1600，浏览器可能选择 1600px 图片。

注意，这只是理想密度下的一种常见选择。浏览器拥有最终决策权，可以考虑网络、缓存或其他启发式规则，并不保证一定选择按照公式最接近的那张图片。

---

## 三、交互实验：浏览器如何选择 srcset 候选图片？

你可以修改下面的视口宽度和 DPR，理解选择逻辑。

{@body const [viewport,setViewport] = DIL.useState(390)}
{@body const [dpr,setDpr] = DIL.useState(3)}
{@body const slot = viewport >= 990 ? viewport * 0.5 : viewport}
{@body const target = slot * dpr}
{@body const candidates = [400,800,1200,1600]}
{@body const chosen = candidates.find(w=>w>=target) || 1600}
<box border radius="xl" padding={3} gap={3}>
  <row justify="between" align="center">
    <text weight="medium">响应式图片选择模拟器</text>
    <badge>理论模型</badge>
  </row>
  <box gap={1}>
    <row justify="between" align="center">
      <label>浏览器视口宽度</label>
      <title size="md" tabularNums>{viewport}px</title>
    </row>
    <slider min={320} max={1600} step={10} value={viewport} onChange={setViewport}/>
    <row justify="between">
      <text color="secondary" size="xs">320px</text>
      <text color="secondary" size="xs">1600px</text>
    </row>
  </box>
  <box gap={1}>
    <row justify="between" align="center">
      <label>DPR（设备像素比）</label>
      <title size="md" tabularNums>{dpr}x</title>
    </row>
    <slider min={1} max={3} step={1} value={dpr} onChange={setDpr} marks={[{value:1,label:"1x"},{value:2,label:"2x"},{value:3,label:"3x"}]}/>
  </box>
  <box background="surface-secondary" radius="lg" padding={3} gap={2}>
    <text color="secondary" size="xs">HTML 中声明的 sizes</text>
    <text size="sm" weight="medium">`(min-width: 990px) 50vw, 100vw`</text>
    <divider color="subtle"/>
    <grid columns={2} gap={2}>
      <grid-item>
        <text color="secondary" size="xs">预计布局宽度</text>
        <title size="lg" tabularNums>{Math.round(slot)}px</title>
      </grid-item>
      <grid-item>
        <text color="secondary" size="xs">参考资源宽度</text>
        <title size="lg" tabularNums>{Math.round(target)}px</title>
      </grid-item>
    </grid>
  </box>
  <box gap={2}>
    <text weight="medium" size="sm">srcset 候选资源</text>
    <grid columns={4} gap={1}>
      {#each candidates as w}
        <grid-item>
          <box border={{size:w===chosen?2:1,color:w===chosen?"#0d9488":"subtle"}} background={w===chosen?"rgba(13,148,136,0.08)":undefined} radius="md" padding={{x:1,y:3}} gap={1} align="center">
            <text weight="medium" size="sm">{w}w</text>
            {#if w===chosen}
              <icon name="check-circle" color="success" size="sm"/>
            {:else}
              <text color="tertiary" size="xs">候选</text>
            {/if}
          </box>
        </grid-item>
      {/each}
    </grid>
  </box>
  <row gap={2} align="start">
    <icon name="check-circle-2" color="success"/>
    <box flex="1" gap={1}>
      <text weight="medium">理论选择：{chosen}px 宽图片</text>
      <text color="secondary" size="sm">按最小且不低于参考宽度的候选值选取；若所有候选值都偏小，则选最大值。实际浏览器还可能考虑网络、缓存等因素。</text>
    </box>
  </row>
</box>

这个模拟器反映了 `sizes + DPR + srcset` 的核心关系。

真正的浏览器行为还可以通过：

```js
const img = document.querySelector(".product-image");

console.log({
  currentSrc: img.currentSrc,
  devicePixelRatio: window.devicePixelRatio,
  renderedWidth: img.getBoundingClientRect().width,
  naturalWidth: img.naturalWidth
});
```

观察。

其中 `currentSrc` 非常有用，它返回浏览器当前选择的图片 URL，而不一定是 HTML 中写的 `src`。

特别注意：

**`sizes` 是提供给浏览器的布局宽度提示，不是设置图片实际 CSS 宽度的属性。**

真正控制图片如何布局的，仍然是 CSS。

这意味着，如果你写：

```css
.product-image {
  width: 300px;
}
```

但写：

```html
<img sizes="100vw">
```

浏览器可能误以为图片会占满整个视口，从而选择远大于实际需要的文件。

所以：

**`sizes` 必须尽可能准确地描述 CSS 布局中的图片宽度。**

---

## 四、picture：当移动端和桌面端需要不同构图时怎么办？

`srcset` 和 `sizes` 已经能解决大部分图片尺寸选择问题。

但还有一种情况，它们解决不了。

假设 Shopify 首页有一张 Banner：

- 桌面端希望显示横向照片，人物在画面右侧。
- 移动端希望使用专门设计的竖向照片，人物居中。

这不是简单的尺寸问题，而是**构图差异（Art Direction）**。

<grid columns={2} gap={3}>
  <grid-item>
    <LessonImage src="assets/fill/img-10.jpg" alt="editorial outdoor fashion campaign banner wide landscape composition woman wearing hiking jacket mountain scenery horizontal"/>
    <text color="secondary" size="xs" textAlign="center">桌面端：横向构图</text>
  </grid-item>
  <grid-item>
    <LessonImage src="assets/fill/img-11.jpg" alt="editorial outdoor fashion portrait campaign woman wearing hiking jacket mountain scenery vertical composition"/>
    <text color="secondary" size="xs" textAlign="center">移动端：竖向构图</text>
  </grid-item>
</grid>

如果我们只把桌面端横图缩小到手机宽度，主体可能非常小。

所以我们可以使用 `<picture>`：

```html
<picture>
  <source
    media="(max-width: 767px)"
    srcset="
      hero-mobile-600.jpg 600w,
      hero-mobile-900.jpg 900w,
      hero-mobile-1200.jpg 1200w
    "
    sizes="100vw"
  >

  <source
    media="(min-width: 768px)"
    srcset="
      hero-desktop-1200.jpg 1200w,
      hero-desktop-1800.jpg 1800w,
      hero-desktop-2400.jpg 2400w
    "
    sizes="100vw"
  >

  <img
    src="hero-desktop-1200.jpg"
    alt="户外服装系列"
    width="1200"
    height="675"
  >
</picture>
```

浏览器会根据匹配的 `<source>` 条件选择资源，最终仍然通过内部的 `<img>` 元素呈现图片。

注意：`<source>` 本身不会生成一个独立的可见图片元素。

在实际项目中，如果移动端和桌面端图片的纵横比不同，还需要为不同媒体条件设置合适的宽高或 CSS `aspect-ratio`，防止切换视口时布局异常。

### picture 还可以做格式回退

例如：

```html
<picture>
  <source srcset="product.avif" type="image/avif">
  <source srcset="product.webp" type="image/webp">

  <img
    src="product.jpg"
    width="800"
    height="800"
    alt="商品图片"
  >
</picture>
```

浏览器会选择自己支持的图片格式。

一般优先尝试 AVIF，然后 WebP，最后回退到 JPEG。

这和根据视口切换构图是同一套 `<picture>` 机制的两种常见用途。

---

## 五、JPEG、PNG、WebP、AVIF、SVG 应该如何选择？

到这里你可能会问：

**既然 AVIF 通常压缩率更高，是不是以后所有图片都转成 AVIF 就行了？**

不是。

图片格式不只影响网络下载，还影响图像质量、编码处理、解码成本与显示特性。

我们先看它们的主要差别。

| 格式 | 特点 | 典型使用场景 |
|---|---|---|
| JPEG | 有损压缩，兼容性极广 | 商品照片、普通摄影图片 |
| PNG | 无损压缩，支持透明通道 | 需要像素精确保留的图像 |
| WebP | 支持有损、无损、透明与动画 | 商品图片、Banner、网页图像 |
| AVIF | 压缩效率通常较高，支持透明与 HDR 等 | 对文件大小和画质要求较高的照片 |
| SVG | 矢量图形，基于图形描述 | Logo、图标、简单插画 |

### 1. 为什么 AVIF 通常比 JPEG 更小？

不同图片格式采用不同编码和压缩算法。

对于大量自然照片，AVIF 往往能够在相近感知质量下，用更少的字节保存图片信息。

例如，假设同一张商品图片在视觉质量相近时：

| 格式 | 模拟文件大小 |
|---|---:|
| JPEG | 320KB |
| WebP | 230KB |
| AVIF | 170KB |

这些数据仅是示例，不能视为每张图片都可以达到的压缩比例。

Google 的图像性能指南也指出，WebP 和 AVIF 经常能提供比传统 JPEG、PNG 更好的压缩表现。

### 2. 为什么图片更小，不一定显示更快？

因为图片的完整呈现链路大致包括：

```text
资源发现
   ↓
网络下载
   ↓
图片解码
   ↓
纹理或绘制数据准备
   ↓
Paint / Composite
   ↓
屏幕呈现
```

网络下载只是其中一个阶段。

假设有两种资源：

| 指标 | WebP | AVIF |
|---|---:|---:|
| 文件大小 | 220KB | 150KB |
| 网络下载 | 180ms | 125ms |
| 图片解码 | 15ms | 65ms |

这些是教学假设。

AVIF 节省了网络时间，但在这个例子里解码时间更长，因此整体优势未必有文件大小比例那么明显。

具体解码性能取决于浏览器实现、设备硬件、图片像素量和编码特性，不能概括为所有 AVIF 一定比所有 WebP 慢。

### 3. 图片的内存占用不能只看文件大小

这是一个非常重要但经常被忽略的性能问题。

假设一张商品主图：

```text
文件大小：200KB
像素尺寸：2000 × 2000
```

200KB 是压缩后的网络资源大小。

但假设图片解码后使用常见的每像素 4 字节 RGBA 缓冲区，那么仅这一份像素缓冲区就需要：

\[
2000 \times 2000 \times 4
=16{,}000{,}000\text{ bytes}
\]

约等于 15.3 MiB。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">压缩文件大小 ≠ 解码后像素占用</text>
  <box gap={1}>
    <row align="center" justify="between">
      <text size="sm">网络传输文件</text>
      <text weight="medium" size="sm">200KB</text>
    </row>
    <box background="surface-tertiary" height="16px" radius="sm" clip>
      <box background="#3b82f6" width="1.25%" height="100%" minWidth="5px"/>
    </box>
  </box>
  <box gap={1}>
    <row align="center" justify="between">
      <text size="sm">假设的 RGBA 像素缓冲区</text>
      <text weight="medium" size="sm">约 15.3MiB</text>
    </row>
    <box background="#d97706" height="16px" radius="sm"/>
  </box>
  <caption>只作数量级说明。真实浏览器可能使用不同像素格式、缩放解码、共享缓冲区和 GPU 纹理，实际内存不一定等于该估算，也可能存在多份副本。</caption>
</box>

那么问题来了：

如果 Shopify 集合页有 100 张 2000 × 2000 的商品图，即使网络资源总量经过压缩，浏览器也可能面临较高的解码与内存压力。

这也是为什么商品卡片应该使用合适的实际图片尺寸，而不只是将大图通过 CSS 缩小显示。

### 4. SVG 为什么特别适合图标？

SVG 主要通过路径、形状和其他图形描述表示内容。

对于简洁 Logo 和线条图标，不需要像普通位图那样，为每个目标尺寸准备大量像素数据。

例如一个购物车图标，可以在不同尺寸上保持清晰。

但 SVG 也不是零成本：

- 非常复杂的路径可能造成额外绘制开销。
- 过多的滤镜、渐变或动画可能影响性能。
- SVG 作为独立 `<img>` 资源和内联 SVG 的行为、样式控制能力并不完全相同。

在 Shopify Theme 中，一般建议小型 UI 图标优先评估 SVG，而不是为每个图标加载不同尺寸的 PNG。

---

## 六、图片下载结束后，浏览器到底做什么？

这一节和你之前单独问过的图片渲染过程直接相关，我们再向深处讲一点。

假设图片标签：

```html
<img
  src="product.webp"
  width="800"
  height="800"
  decoding="async"
  alt="商品主图"
>
```

图片下载完成后，浏览器可能还需要进行必要的解码和绘制工作。

但这里要避免一个误区：

**图片下载、图片解码和页面 Layout，并不是必须严格按照顺序执行的三件事。**

浏览器可能在图片完成下载之前，就利用 `width`、`height` 和 CSS 为图片预留空间。

某些格式还可以逐步获得解码信息。

浏览器也可能在后台线程进行图片解码。

### 1. decoding="async" 到底优化什么？

```html
<img src="product.webp" decoding="async">
```

它告诉浏览器：

可以考虑将这张图片的解码与其他内容的呈现分开处理。

这样有机会减少一张较大的图片对其他视觉内容呈现的影响。

但它不意味着：

- 图片下载会更快。
- 浏览器一定创建一个新的专用线程。
- LCP 一定改善。
- 图片必然在某个特定时间点显示。

这个属性是调度提示，默认值 `auto` 也是一个合理的选择。

### 2. 商品变体切图时，可以使用 decode()

假设用户从白色跑鞋切换到黑色跑鞋。

一种简单实现：

```js
mainImage.src = blackImageUrl;
```

这会让浏览器开始处理新图片。

但如果新图尚未准备好，画面可能存在等待或过渡问题。

可以考虑先加载并解码，再切换：

```js
let imageVersion = 0;

async function changeProductImage(img, url) {
  const version = ++imageVersion;

  const next = new Image();
  next.src = url;

  try {
    await next.decode();

    // 防止较早的图片请求覆盖最新选择
    if (version !== imageVersion) return;

    img.src = next.currentSrc || next.src;
  } catch (error) {
    console.error("图片准备失败", error);
  }
}
```

这里有两个设计点：

第一，`decode()` 允许我们在新图片准备好后再替换原图片。

第二，`imageVersion` 避免用户连续选择颜色时，之前加载较慢的旧图片覆盖最新选择。

这是一种实用的异步状态竞争处理方式。

不过，正式 Shopify Theme 中还需要考虑 `srcset` 和 `sizes`：如果主图采用响应式图片，不应该只更换 `src`，却保留来自旧商品图的 `srcset`。

此外，如果两张图片纵横比不同，还应该为图片容器设置稳定的尺寸或纵横比，以免发生 CLS。

---

## 七、Shopify 图片优化：最重要的 Liquid 写法

现在结合 Shopify 官方 API，把前面的原理真正用于 Theme。

假设商品主图：

```liquid
{{ product.featured_image }}
```

这里拿到的是 Shopify 的 Image 对象。

通过 `image_url` 可以生成指定尺寸的 CDN 图片 URL。

通过 `image_tag` 可以生成具备响应式属性的 `<img>`。

### 1. 商品主图：清晰度与首屏性能平衡

```liquid
{% assign main_image = product.featured_image %}

{% if main_image %}
  {{
    main_image
    | image_url: width: 1800
    | image_tag:
      class: 'product-main-image',
      widths: '360, 540, 720, 900, 1200, 1600, 1800',
      sizes: '(min-width: 990px) 50vw, 100vw',
      loading: 'eager',
      fetchpriority: 'high',
      decoding: 'async'
  }}
{% endif %}
```

我们逐个分析：

| 参数 | 作用 |
|---|---|
| `image_url: width: 1800` | 生成最大请求宽度为 1800px 的 CDN URL |
| `widths` | 提供不同的响应式图片候选宽度 |
| `sizes` | 告诉浏览器在不同视口下预计占据多少 CSS 宽度 |
| `loading: 'eager'` | 避免首屏主图因懒加载而被延后 |
| `fetchpriority: 'high'` | 提示提高主图获取优先级 |
| `decoding: 'async'` | 提供图片解码调度提示 |

这里有一个 Shopify 特有细节：

`widths` 指定的候选值不能无限超出 `image_url` 所生成的图片宽度范围；Shopify 会筛掉超过输出尺寸的候选宽度。

此外，`image_tag` 默认可以根据图片比例添加 `width`、`height` 属性，帮助浏览器提前预留空间。

### 2. 为什么不直接写 format: 'webp'？

你可能会想到：

```liquid
{{ product.featured_image | image_url: width: 800, format: 'webp' }}
```

但这里要特别小心。

**Shopify `image_url` 的 `format` 参数并不支持直接传入 `webp` 或 `avif` 作为有效的显式格式值。**

当前文档列出的有效显式值是：

```text
jpg
pjpg
```

而 WebP、AVIF 等现代格式的选择，主要由 Shopify CDN 根据客户端支持情况进行自动协商。

所以通常不应该为了 WebP 或 AVIF 转码，在 Liquid 中自己拼接格式参数。

例如：

```liquid
{{ product.featured_image | image_url: width: 800 }}
```

Shopify CDN 可以根据浏览器能力选择适合的实际响应格式。

开发时你可以打开 Chrome Network：

检查图片响应的 `Content-Type`，例如：

```http
Content-Type: image/avif
```

或者：

```http
Content-Type: image/webp
```

不要仅仅根据 URL 后缀推断最终传输格式。

### 3. 集合页商品卡片应该怎么写？

假设集合页桌面端四列，移动端两列。

可以先采用这样的结构：

```liquid
{{
  product.featured_image
  | image_url: width: 900
  | image_tag:
    class: 'product-card__image',
    widths: '180, 270, 360, 540, 720, 900',
    sizes: '(min-width: 1200px) 25vw, 50vw',
    loading: 'lazy'
}}
```

这里的 `sizes` 是用于理解原理的简化例子。实际网格还存在左右容器宽度、边距、间隙，因此更准确的写法需要根据真实布局计算。

例如，四列网格不是每张卡片严格占整个视口的 25%，还要扣除页面左右边距和列间距。

另外，**集合页首屏的第一排商品卡片并不应该无条件使用 `loading="lazy"`**。应根据实际视口、可见元素和 Shopify 的默认加载策略决定。

一般原则是：首屏主图保证及时获取，屏幕外商品图片适当延后。

---

## 八、字体也是资源，为什么它会影响页面渲染？

现在进入第 11 课的第二个大主题：Web Font。

这部分和图片有相似之处。

图片需要：

```text
发现资源 → 下载 → 解码 → 绘制
```

Web Font 则需要：

```text
发现 CSS 中的字体声明
        ↓
判断页面是否实际需要该字体
        ↓
请求字体文件
        ↓
加载和解析字体
        ↓
使用字体进行文本布局与绘制
```

但字体比图片多一个很重要的布局问题：

**不同字体不仅视觉效果不同，字形宽度、字高、行距也可能不同。**

所以字体切换可能让整段文字重新排版。

### 1. 为什么字体请求通常比 CSS 请求发现得晚？

看下面的代码：

```html
<link rel="stylesheet" href="theme.css">

<h1 class="product-title">Lightweight Running Shoes</h1>
```

`theme.css`：

```css
@font-face {
  font-family: "BrandFont";
  src: url("/fonts/brand.woff2") format("woff2");
}

.product-title {
  font-family: "BrandFont", sans-serif;
}
```

浏览器一般需要先获取和解析 CSS，知道某个元素需要 `BrandFont`，才会发起对应的字体请求。

这就形成了依赖链：

```text
HTML
  ↓
theme.css
  ↓
@font-face + 元素实际字体需求
  ↓
brand.woff2
  ↓
文字使用该字体绘制
```

因此，字体可能比 HTML 中直接出现的商品主图更晚被发现。

这也是为什么有时标题已经存在于 DOM 中，却迟迟无法以预期字体显示。

---

## 九、FOIT 与 FOUT：字体加载期间的两种常见现象

假设标题采用自定义字体。

当这个字体还没下载完成时，浏览器应该怎么办？

常见表现分为两种。

### 1. FOIT：Flash of Invisible Text

即文字暂时不可见。

```text
页面开始渲染
      ↓
自定义字体未就绪
      ↓
文字暂时不可见
      ↓
字体加载完成
      ↓
文字显示
```

它的问题是用户可能会看到一个没有标题的页面。

### 2. FOUT：Flash of Unstyled Text

即先用后备字体显示，随后切换为自定义字体。

```text
页面开始渲染
      ↓
先显示系统后备字体
      ↓
自定义字体下载完成
      ↓
文字切换字体
```

它的优点是文字可以更早被看到。

缺点是如果两种字体的字形指标差异明显，就可能造成布局偏移。

例如：

<box border radius="lg" padding={3} gap={3}>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <text color="secondary" size="xs">后备字体状态</text>
        <box border radius="md" padding={2} gap={2}>
          <text weight="medium" size="sm">Lightweight Running Shoes</text>
          <divider color="subtle"/>
          <text size="sm">¥499</text>
          <box background="surface-secondary" padding={2} radius="sm">
            <text textAlign="center" size="xs">Add to cart</text>
          </box>
        </box>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <text color="secondary" size="xs">自定义字体加载后</text>
        <box border radius="md" padding={2} gap={2}>
          <title size="lg" weight="bold">Lightweight Running Shoes</title>
          <divider color="subtle"/>
          <text size="sm">¥499</text>
          <box background="surface-secondary" padding={2} radius="sm">
            <text textAlign="center" size="xs">Add to cart</text>
          </box>
        </box>
      </box>
    </grid-item>
  </grid>
  <caption>示意不同字形宽度或字高可能改变标题换行和下方内容位置。实际变化取决于具体字体及 CSS。</caption>
</box>

即使文字在字体下载期间不可见，浏览器仍可能利用后备字体的指标为它计算布局。

所以 FOIT 也不保证不会产生布局偏移。

---

## 十、font-display：控制字体加载期间如何显示文字

CSS 提供了：

```css
@font-face {
  font-family: "BrandFont";
  src: url("/fonts/brand.woff2") format("woff2");
  font-display: swap;
}
```

不同值会影响字体的阻塞期与交换期。

| font-display | 常见行为 | 主要取舍 |
|---|---|---|
| `auto` | 浏览器决定 | 默认策略 |
| `block` | 短时间允许文字不可见，随后显示后备字体 | 倾向等待自定义字体 |
| `swap` | 很快显示后备字体，字体可用后替换 | 更早可见，但可能发生字体切换 |
| `fallback` | 很短的阻塞期，有限的交换期 | 平衡可见性与字体一致性 |
| `optional` | 极短的阻塞期，浏览器可以决定本次导航继续使用后备字体 | 减少后续字体切换风险 |

这里需要注意：具体阻塞期与交换期由浏览器实现定义，并不是每种浏览器都严格采用同一个毫秒值。

### 那么电商网站应该用哪个？

对于重要的商品标题：

```css
font-display: swap;
```

通常是一个值得测试的起点，因为让用户及时看到商品信息很重要。

对于普通正文，如果自定义字体不是必须立即使用，也可以评估：

```css
font-display: optional;
```

但 `optional` 有一个代价：部分用户在当前导航中可能不会看到品牌自定义字体。

如果品牌字体对视觉一致性非常重要，就需要权衡。

**没有一个 font-display 值适合所有网站、所有字体和所有文本。**

---

## 十一、如何避免字体切换引起 CLS？

我们之前已经知道，图片可以通过预留宽高避免一部分 Layout Shift。

字体则需要另一套方法。

问题出在字体的**度量指标（Font Metrics）**。

例如，不同字体可能具有不同的：

- 字形前进宽度。
- 上升部（Ascent）。
- 下降部（Descent）。
- 行间距（Line Gap）。

这些信息会影响文字的布局。

### 1. 选择接近的后备字体

例如：

```css
.product-title {
  font-family:
    "BrandFont",
    Arial,
    sans-serif;
}
```

如果实际品牌字体是无衬线字体，那么选择接近的无衬线后备字体，通常比任意使用一个衬线字体更有利于减少文字布局差异。

当然，最理想的后备字体取决于品牌字体本身。

### 2. 使用 size-adjust 等字体指标调整

CSS 还提供了更深入的控制。

例如：

```css
@font-face {
  font-family: "BrandFontFallback";
  src: local("Arial");

  size-adjust: 104%;
  ascent-override: 91%;
  descent-override: 23%;
  line-gap-override: 0%;
}

.product-title {
  font-family:
    "BrandFont",
    "BrandFontFallback",
    sans-serif;
}
```

这里的数值仅用于讲解，不能直接视为适合某个真实品牌字体的配置。

它们的作用是调整后备字体的字形尺寸及垂直指标，让它的布局表现尽量接近最终字体。

**注意：这些参数应基于真实字体的度量指标进行计算和验证，不是每个项目都可以统一设置为 104%。**

正确调整后，有可能减少字体切换时标题换行和周围元素移动的情况。

---

## 十二、字体文件越少、越小，页面就一定越快吗？

通常减少无用字体资源有帮助，但同样不能只看数量。

假设一个 Shopify 品牌商店使用：

```text
Brand-Regular.woff2
Brand-Medium.woff2
Brand-Semibold.woff2
Brand-Bold.woff2
Brand-Black.woff2
```

如果整个网站实际上只使用 Regular 和 Bold，却下载了五个字重，就可能浪费网络与字体处理成本。

优化方向包括：

**第一，删除不用的字重。**

**第二，考虑 Variable Font（可变字体）。**

例如一个可变字体覆盖：

```css
@font-face {
  font-family: "BrandVariable";
  src: url("/fonts/brand-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}
```

这种方式允许一个字体资源覆盖一系列字重。

不过可变字体不保证一定比只使用一个或两个静态字重的总文件更小，需要比较实际资源大小。

**第三，考虑字体子集化（Subsetting）。**

例如通过 `unicode-range` 表明某个字体文件覆盖的字符范围：

```css
@font-face {
  font-family: "BrandFont";
  src: url("/fonts/brand-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF;
}
```

它告诉浏览器这个字体资源用于指定范围内的字符。

但是要特别注意：

`unicode-range` 不会自动把字体文件里的其他字形删除。

真正的文件体积缩减，需要在生成字体资源时完成相应的子集化处理。

对于中文站点尤其重要：完整 CJK 字符集非常庞大，字体文件可能明显大于仅包含拉丁字符的字体。

但如果对中文字体过度细分，也可能产生大量额外请求，应该综合考虑文字分布、缓存和 CDN。

`@font-face` 的 `unicode-range`、字重范围及字体度量指标都属于标准 CSS 字体机制。

---

## 十三、Shopify Theme 字体应该怎么优化？

Shopify Theme 有一套官方字体 API。

假设主题设置中已经定义：

```liquid
settings.type_header_font
settings.type_body_font
```

它们是 Shopify Font 对象。

你可以通过 Liquid 生成 `@font-face`。

### 1. 使用 font_face

例如在 `theme.liquid` 中：

```liquid
<style>
  {{
    settings.type_header_font
    | font_face: font_display: 'swap'
  }}

  {{
    settings.type_body_font
    | font_face: font_display: 'swap'
  }}

  .product-title {
    font-family:
      {{ settings.type_header_font.family | json }},
      sans-serif;
  }

  body {
    font-family:
      {{ settings.type_body_font.family | json }},
      sans-serif;
  }
</style>
```

`font_face` 可以生成相关 `@font-face` 规则，并支持 `font_display` 参数。

但这个例子只声明了设置中选定的字体样式。如果你还使用不同的粗细、斜体等字形，需要检查 Shopify Font 对象及其相关变体，确保正确声明所需字重，而不是让浏览器不必要地合成全部字重。

### 2. 如何预加载关键字体？

如果你确定某个标题字体确实位于首屏关键路径上，可以使用 `font_url`：

```liquid
<link
  rel="preload"
  href="{{ settings.type_header_font | font_url }}"
  as="font"
  type="font/woff2"
  crossorigin
>
```

这里有几个重要细节。

**`font_url`** 生成 Shopify 托管字体的 CDN URL，默认是 WOFF2 格式。

**`as="font"`** 表明预加载资源类型。

**`crossorigin`** 保证预加载请求与字体获取模式正确协调，减少因请求模式不匹配而无法复用的风险。

Shopify `font_url` 和 `font_face` 都是官方提供的 Liquid 过滤器。

但是不要给所有字体都添加 preload。

如果首屏只需要一个标题字体的 Regular 字重，就不要无条件预加载四个不一定会使用的其他字重。

Shopify 官方也明确建议谨慎使用资源预加载，将其留给确实处于首屏关键路径上的资源。

---

## 十四、图片和字体优化，最终应该怎么验证？

我们需要把这一课的知识落到 Chrome DevTools 上。

### 图片诊断

打开 Chrome DevTools → Network → Img。

重点检查：

| 检查项 | 想确认什么 |
|---|---|
| `currentSrc` | 实际选择了哪个图片 URL |
| 请求尺寸 | 是否下载了远大于显示需求的图片 |
| Transfer Size | 实际网络传输了多少数据 |
| Content-Type | 实际返回 JPEG、WebP 还是 AVIF |
| Priority | 首屏关键图是否获得合理优先级 |
| Initiator | 图片是 HTML、CSS 还是 JS 发现的 |
| LCP Breakdown | 图片慢在发现、下载还是呈现 |

例如可以在商品页控制台运行：

```js
const img = document.querySelector(".product-main-image");

const rect = img.getBoundingClientRect();

console.table({
  currentSrc: img.currentSrc,
  cssWidth: rect.width,
  cssHeight: rect.height,
  naturalWidth: img.naturalWidth,
  naturalHeight: img.naturalHeight,
  dpr: window.devicePixelRatio,
  referenceWidth: rect.width * window.devicePixelRatio
});
```

这里有一个特别值得关注的现象：

如果 `cssWidth = 300`，`DPR = 2`，参考资源宽度大约 600px，但浏览器却实际请求了 2000px 的图片，就值得继续检查 `sizes` 是否正确。

不过，浏览器缓存、响应式选择策略及图片自身编码仍可能影响资源选择，不应仅凭一个数值立即断言有 Bug。

### 字体诊断

打开 Chrome DevTools → Network → Font。

重点观察：

- 字体是什么时候开始请求的？
- 是否下载了没有用到的字重？
- 是否存在多个重复字体资源？
- 字体是否明显晚于首屏 CSS 被发现？
- 是否因字体切换导致布局偏移？

再在 Performance 中查看 Layout Shifts。

如果商品标题在字体加载完成之后发生重新换行，并推动购买按钮移动，就可以进一步优化后备字体与字体度量指标。

---

## 十五、完整 Shopify 商品页图片与字体策略

我们最后把这节课的知识总结到一个电商页面中。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">商品详情页资源策略</text>
  <table>
    <table-row>
      <table-cell width="36%"><text weight="medium">资源</text></table-cell>
      <table-cell><text weight="medium">建议策略</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>首屏商品主图</table-cell>
      <table-cell>准确 `sizes`、多尺寸 `srcset`、`eager`，必要时 `fetchpriority=high`</table-cell>
    </table-row>
    <table-row>
      <table-cell>首屏可见缩略图</table-cell>
      <table-cell>根据显示尺寸提供合理候选，避免过大的图片</table-cell>
    </table-row>
    <table-row>
      <table-cell>屏幕外细节图片</table-cell>
      <table-cell>Lazy Loading、合理尺寸与纵横比</table-cell>
    </table-row>
    <table-row>
      <table-cell>颜色变体图片</table-cell>
      <table-cell>正确处理异步切换、解码和旧请求覆盖新状态</table-cell>
    </table-row>
    <table-row>
      <table-cell>商品标题字体</table-cell>
      <table-cell>合理 `font-display`、后备字体与必要时的 preload</table-cell>
    </table-row>
    <table-row>
      <table-cell>正文和辅助字体</table-cell>
      <table-cell>减少字重、合理子集化、避免无意义的预加载</table-cell>
    </table-row>
    <table-row>
      <table-cell>图标</table-cell>
      <table-cell>优先考虑 SVG，避免额外的大型图标字体</table-cell>
    </table-row>
  </table>
</box>



**图片的优化目标不只是“文件更小”，而是让浏览器下载合适的像素数量，并尽早准备真正需要显示的图像。**

**字体的优化目标也不只是“文件更小”，而是让文字尽早可见，并尽量不因为字体替换而破坏原有布局。**

---

## 十六、第 11 课总结

今天我们学习的知识可以分为三个层次。

**第一层：图片选择。**

CSS 像素、DPR、`srcset`、`sizes` 决定了浏览器如何根据显示环境选择图像资源。

**第二层：图片处理。**

JPEG、WebP、AVIF 等格式影响传输量、解码与质量。图片文件大小并不等于解码后的内存占用，也不代表最终渲染成本。

**第三层：字体渲染。**

Web Font 加载会影响文字何时可见，而不同字体的字形指标差异可能触发重新布局和 CLS。

最关键的几个知识点如下：

| 概念 | 一句话理解 |
|---|---|
| DPR | CSS 像素和设备物理像素之间的比例 |
| `srcset` | 提供不同密度或尺寸的图片候选 |
| `sizes` | 描述图片在布局中预计占据的 CSS 宽度 |
| `<picture>` | 根据格式支持或媒体条件选择不同资源 |
| Image Decode | 将编码后的图片数据准备成可绘制的图像 |
| `decoding` | 图片解码与呈现方式的提示 |
| `font-display` | 控制字体等待期间的文字显示策略 |
| FOIT / FOUT | 字体加载期间不可见或使用后备字体的现象 |
| `size-adjust` | 调整字体指标，减小字体替换引起的布局差异 |
| Shopify `image_tag` | 生成图片元素、响应式候选及尺寸信息 |
| Shopify `font_face` | 生成 Shopify 字体的 `@font-face` 声明 |

## 参考资料

- [Liquid filters: image_tag](https://shopify.dev/docs/api/liquid/filters/image_tag)
- [Liquid filters: image_url](https://shopify.dev/docs/api/liquid/filters/image_url)
- [Liquid filters: font_face](https://shopify.dev/docs/api/liquid/filters/font_face)
- [Liquid filters: preload_tag](https://shopify.dev/docs/api/liquid/filters/preload_tag)
- [Liquid filters: font_url](https://shopify.dev/docs/api/liquid/filters/font_url)
- [Use Liquid filter chains instead of manual URL construction](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-filter-chains)
- [Use preload resource hints sparingly](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-preload-resource-hints-sparingly)
- [Optimize web fonts | web.dev](https://web.dev/learn/performance/optimize-web-fonts?hl=en)
- [Optimize Cumulative Layout Shift | Articles | web.dev](https://web.dev/articles/optimize-cls)
- [Reduce web font size | Articles | web.dev](https://web.dev/articles/reduce-webfont-size?authuser=6)
- [Best practices for fonts | Articles | web.dev](https://web.dev/articles/font-best-practices)
- [Optimize web fonts | web.dev](https://web.dev/learn/performance/optimize-web-fonts?authuser=4)
- [Image performance | web.dev](https://web.dev/learn/performance/image-performance?authuser=56)
- [Image performance | web.dev](https://web.dev/learn/performance/image-performance)
- [Choose the right image format | Articles | web.dev](https://web.dev/articles/choose-the-right-image-format?authuser=6)
- [Choose the right image format | Articles | web.dev](https://web.dev/articles/choose-the-right-image-format?authuser=211)
- [Image performance | web.dev](https://web.dev/learn/performance/image-performance?authuser=710678596)
- [HTMLImageElement - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement)
- [<picture> HTML picture element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
- [Using responsive images in HTML - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [HTMLImageElement: sizes property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes)
- [<img> HTML image embed element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [@font-face CSS at-rule - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40font-face)
- [Image file type and format guide - Media | MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
- [size-adjust CSS at-rule descriptor - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40font-face/size-adjust)
- [web.dev/src/site/content/en/blog/optimize-cls/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/optimize-cls/index.md)
- [content/files/en-us/web/html/guides/responsive_images/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/html/guides/responsive_images/index.md?plain=1)
- [content/files/en-us/web/html/reference/elements/picture/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/picture/index.md)
