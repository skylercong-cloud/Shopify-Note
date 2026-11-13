# Product Media Gallery：深入商品媒体画廊的实现


上一课完成了购买流程：

```text
选择 Variant
    ↓
更新商品信息
    ↓
点击 Add to Cart
    ↓
POST /cart/add.js
    ↓
更新 Cart Drawer
```

今天我们换一条线，研究商品详情页中另一个非常重要的模块：**商品媒体画廊（Product Media Gallery）**。

它看起来只是一个图片轮播组件，但 Dawn 实际上要处理很多事情：

- 商品图片的展示和切换。
- 缩略图与主图的同步。
- 图片懒加载和响应式图片。
- 视频、外部视频和 3D Model。
- 图片放大和 Modal。
- 切换 Variant 后自动切换商品图片。
- 移动端与桌面端不同的媒体布局。

尤其是图片加载策略，这一课也会联系到我们之前学习的网站性能优化。

本课按照 Shopify Dawn 官方仓库当前 `main` 分支分析，实际项目中要注意对照自己使用的 Dawn 版本。

---

## 一、先建立整体架构

先看涉及的几个核心文件。

| 文件 | 职责 |
|---|---|
| `sections/main-product.liquid` | 商品详情页入口 |
| `snippets/product-media-gallery.liquid` | 生成整个媒体画廊 |
| `snippets/product-thumbnail.liquid` | 生成单个媒体项 |
| `assets/media-gallery.js` | 媒体切换、缩略图同步 |
| `assets/global.js` | Slider、DeferredMedia、Modal 等基础组件 |
| `assets/product-info.js` | Variant 切换时同步媒体 |
| `snippets/product-media-modal.liquid` | 图片放大 Modal 的 HTML |
| `assets/product-modal.js` | Modal 内部媒体切换 |

源码：

- <Link url="https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid" title="main-product.liquid"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-media-gallery.liquid" title="product-media-gallery.liquid"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/media-gallery.js" title="media-gallery.js"/>

整个架构可以理解为：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **main-product.liquid**
    <text size="xs" color="secondary">商品详情页组装入口</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **product-media-gallery.liquid**
    <text size="xs" color="secondary">遍历 product.media，生成媒体列表和缩略图</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        **product-thumbnail**
        <text color="secondary" size="xs">单个媒体的 HTML</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        **media-gallery.js**
        <text color="secondary" size="xs">媒体交互逻辑</text>
      </box>
    </grid-item>
  </grid>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={3} gap={2}>
    <grid-item>
      <box border radius="md" padding={2} align="center">
        <icon name="image" size="xl"/>
        **图片**
      </box>
    </grid-item>
    <grid-item>
      <box border radius="md" padding={2} align="center">
        <icon name="video" size="xl"/>
        **视频**
      </box>
    </grid-item>
    <grid-item>
      <box border radius="md" padding={2} align="center">
        <icon name="box" size="xl"/>
        **3D Model**
      </box>
    </grid-item>
  </grid>
</box>

注意：这里的图片、视频和 3D Model 并不是三套完全独立的组件，而是通过 Shopify 的统一媒体对象 `product.media` 进行组织。

这是我们首先需要理解的概念。

## 二、Shopify 的 product.media 到底是什么？

之前学习 Shopify 数据模型时，我们已经接触过：

```liquid
product.images
product.media
```

这两个属性并不完全相同。

`product.images` 主要提供商品图片集合。

而 `product.media` 是更完整的商品媒体集合，可以包含：

| media_type | 含义 |
|---|---|
| `image` | 商品图片 |
| `video` | Shopify 托管视频 |
| `external_video` | 外部视频，例如 YouTube |
| `model` | 3D 模型 |

例如，一个商品可能有：

```text
product.media

[
  {
    id: 1001,
    media_type: "image"
  },
  {
    id: 1002,
    media_type: "image"
  },
  {
    id: 1003,
    media_type: "video"
  },
  {
    id: 1004,
    media_type: "model"
  }
]
```

这是示意结构，不是完整的 Shopify Liquid 对象输出。

每种媒体还有自己的属性，例如：

```liquid
media.id
media.media_type
media.preview_image
media.aspect_ratio
media.alt
```

其中 `preview_image` 非常重要。

为什么？

因为视频和 3D 模型也可以有预览图片。

所以 Dawn 可以先展示预览图片，用户真正点击播放时，再加载实际的视频或模型。

这就引出了后面非常重要的 Deferred Media 机制。

---

## 三、深入 product-media-gallery.liquid

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-media-gallery.liquid" title="product-media-gallery.liquid"/>

首先看：

```liquid
<media-gallery
  id="MediaGallery-{{ section.id }}"
  role="region"
  data-desktop-layout="{{ section.settings.gallery_layout }}"
>
```

又是一个 Custom Element：

```html
<media-gallery>
```

它对应：

```js
customElements.define(
  'media-gallery',
  class MediaGallery extends HTMLElement {
    // ...
  }
);
```

Dawn 使用 Liquid 负责生成初始 HTML，JavaScript 负责媒体交互。

### 1. 先看主图列表

源码：

```liquid
<slider-component
  id="GalleryViewer-{{ section.id }}"
>
  <ul
    id="Slider-Gallery-{{ section.id }}"
    class="product__media-list
           contains-media
           grid
           grid--peek
           list-unstyled
           slider
           slider--mobile"
    role="list"
  >
    ...
  </ul>
</slider-component>
```

这里最核心的是：

```html
<ul>
  <li>图片1</li>
  <li>图片2</li>
  <li>视频</li>
  <li>3D Model</li>
</ul>
```

每一个 `li` 就是一个媒体项。

例如：

```liquid
<li
  id="Slide-{{ section.id }}-{{ media.id }}"
  class="product__media-item grid__item slider__slide"
  data-media-id="{{ section.id }}-{{ media.id }}"
>
  {% render 'product-thumbnail', media: media %}
</li>
```

这里的：

```liquid
data-media-id="{{ section.id }}-{{ media.id }}"
```

非常关键。

Dawn 使用它作为媒体项的唯一标识。

为什么要拼接 `section.id`？

因为一个页面可能存在多个商品 Section，甚至有多个商品组件。

仅仅使用 `media.id`，不一定能保证整个页面中的 DOM 标识不会发生冲突。

因此它使用：

```text
Section ID + Media ID
```

例如：

```text
template--123456__main-1001
```

后面 JavaScript 会大量使用这个属性定位媒体。

### 2. 为什么第一个媒体项要特殊处理？

看这段：

```liquid
{% if product.selected_or_first_available_variant.featured_media != null %}

  {% assign featured_media =
    product.selected_or_first_available_variant.featured_media
  %}

  <li
    class="product__media-item
           slider__slide
           is-active"
    data-media-id="{{ section.id }}-{{ featured_media.id }}"
  >
    {% render 'product-thumbnail',
      media: featured_media,
      lazy_load: false
    %}
  </li>

{% endif %}
```

这里有两个非常重要的信息。

第一：

```liquid
product.selected_or_first_available_variant.featured_media
```

Dawn 优先展示当前选中 Variant 关联的媒体。

第二：

```liquid
is-active
```

表示这个媒体项是当前激活的媒体。

所以默认情况下，商品详情页并不一定展示商品上传列表中的第一张图片，而是优先展示当前 Variant 关联的图片。

这对有颜色选项的商品非常有用。

例如：

```text
商品：T-Shirt

Black Variant → 黑色图片
White Variant → 白色图片
Blue Variant  → 蓝色图片
```

当用户选择 White 时，Dawn 可以让白色图片成为当前展示媒体。

---

## 四、hide_variants：为什么有些商品图片会被隐藏？

接着看 `sections/main-product.liquid`：

```liquid
{% assign variant_images =
  product.images
  | where: 'attached_to_variant?', true
  | map: 'src'
%}

{% render 'product-media-gallery',
  variant_images: variant_images
%}
```

这里得到的是与 Variant 关联的图片 URL 集合。

然后在 `product-media-gallery.liquid` 中：

```liquid
if section.settings.hide_variants
  and variant_images contains media.src

  continue

endif
```

这个逻辑很值得理解。

假设商品有：

```text
商品图片：

1. 黑色正面
2. 黑色背面
3. 白色正面
4. 白色背面
5. 商品细节
```

如果开启隐藏 Variant 图片：

- 当前 Black Variant：显示黑色正面和商品细节等公共媒体。
- 当前 White Variant：显示白色正面和商品细节等公共媒体。

它不会把所有颜色对应的图片都堆在画廊中。

注意，这不是 Shopify API 自动帮你隐藏的，而是 Dawn Theme 根据商品媒体关联关系实现的展示逻辑。

---

## 五、深入 product-thumbnail.liquid：单个媒体是如何渲染的？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-thumbnail.liquid" title="product-thumbnail.liquid"/>

这个文件非常重要。

因为不管是图片、视频还是 3D Model，最终都会通过它渲染。

### 1. 先看图片的 HTML 结构

核心代码：

```liquid
<div class="product-media-container">

  <modal-opener
    class="product__modal-opener"
    data-modal="#ProductModal-{{ modal_id }}"
  >

    <div class="product__media media">

      {{
        media.preview_image
        | image_url: width: 1946
        | image_tag:
          loading: lazy,
          sizes: sizes,
          widths: '246, 493, 600, 713,
                   823, 990, 1100, 1206,
                   1346, 1426, 1646, 1946'
      }}

    </div>

    <button
      class="product__media-toggle"
      type="button"
      data-media-id="{{ media.id }}"
    >
    </button>

  </modal-opener>

</div>
```

这里涉及几个重要知识点。

#### ① image_url

```liquid
media.preview_image | image_url: width: 1946
```

它的作用是生成 Shopify CDN 上的图片 URL。

例如可以理解为：

```text
https://cdn.shopify.com/.../image.jpg?width=1946
```

这里指定了一个图片宽度。

#### ② image_tag

```liquid
| image_tag:
  widths: '246, 493, 600, 713, 823, ...',
  sizes: sizes
```

它会生成 HTML 图片标签，并根据配置生成响应式图片相关属性。

最终类似：

```html
<img
  src="...width=1946"
  srcset="
    ...width=493 493w,
    ...width=990 990w,
    ...width=1946 1946w
  "
  sizes="..."
  loading="lazy"
  width="..."
  height="..."
>
```

这里我想重点讲一个非常重要的性能知识。

## 六、深入 srcset 和 sizes：浏览器如何选择图片？

这是本课和网站性能优化联系最紧密的部分。

假设你上传了一张 3000 × 3000 的商品图片。

如果所有设备都直接下载这张原图，会怎样？

- 手机只需要显示 350px 宽的图片，却下载 3000px 图片。
- 普通桌面只需要 700px 宽的图片，却下载 3000px 图片。
- 高分辨率屏幕又可能需要更大的图片。

这显然不合理。

所以 Dawn 使用：

```html
srcset
sizes
```

### 1. srcset 是什么？

`srcset` 告诉浏览器：

我为同一张图片准备了多个不同尺寸的版本，你可以自行选择。

例如：

```html
<img
  src="image-1200.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-2000.jpg 2000w
  "
>
```

浏览器拥有了四个候选资源。

### 2. sizes 是什么？

`sizes` 告诉浏览器：

这张图片在当前页面布局中，预计会占据多大的 CSS 显示宽度。

例如：

```html
<img
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="
    (min-width: 1200px) 600px,
    (min-width: 750px) 45vw,
    100vw
  "
>
```

含义：

| 屏幕 | 预计图片显示宽度 |
|---|---:|
| 大于等于 1200px | 600px |
| 大于等于 750px | 45vw |
| 手机 | 100vw |

浏览器根据：

1. 当前视口尺寸。
2. `sizes` 推算的显示宽度。
3. 屏幕设备像素比 DPR。
4. `srcset` 中可用的候选图片。

选择合适的资源。

例如：

<box border radius="lg" padding={3} gap={3}>
  **响应式图片选择示意**
  <grid columns={3} gap={2}>
    <grid-item>
      <LessonImage src="assets/fill/img-24.jpg" alt="minimal black t shirt product photography white background"/>
      **手机**
      <text size="xs" color="secondary">350 CSS px</text>
      <badge color="success">约 700px 候选</badge>
    </grid-item>
    <grid-item>
      <LessonImage src="assets/fill/img-24-2.jpg" alt="minimal black t shirt product photography white background"/>
      **桌面**
      <text size="xs" color="secondary">700 CSS px</text>
      <badge color="success">约 1400px 候选</badge>
    </grid-item>
    <grid-item>
      <LessonImage src="assets/fill/img-24-3.jpg" alt="minimal black t shirt product photography white background"/>
      **高分屏**
      <text size="xs" color="secondary">700 CSS px，DPR 3</text>
      <badge color="success">约 2000px 候选</badge>
    </grid-item>
  </grid>
  <text color="secondary" size="xs">示意数据：实际选取由浏览器根据候选资源、DPR 和加载策略决定，并不保证一定选择上述尺寸。</text>
</box>

比如图片显示宽度是 700 CSS px：

- DPR 1：理论上需要约 700px。
- DPR 2：理论上需要约 1400px。
- DPR 3：理论上需要约 2100px。

这就是为什么高分辨率屏幕有时候会下载明显大于 CSS 显示尺寸的图片。

### 3. Dawn 的 sizes 是动态计算的

回到 `product-thumbnail.liquid`：

```liquid
{%- capture sizes -%}
  (min-width: {{ settings.page_width }}px)
  {{ settings.page_width | minus: 100
    | times: media_width
    | divided_by: desktop_columns
    | round }}px,

  (min-width: 990px)
  calc(
    {{ media_width | times: 100
      | divided_by: desktop_columns }}vw - 10rem
  ),

  (min-width: 750px)
  calc((100vw - 11.5rem) / 2),

  calc(100vw / {{ mobile_columns }} - 4rem)
{%- endcapture -%}
```

你会发现它不是简单地写一个：

```html
sizes="100vw"
```

而是结合：

- 页面最大宽度。
- 商品媒体区域宽度。
- 桌面列数。
- 移动端列数。
- 当前视口宽度。

计算实际图片显示尺寸。

这就是比较成熟的 Theme 图片优化方式。

**一个重要结论：srcset 决定有哪些图片可以选择，sizes 帮助浏览器判断应该选择多大的图片。**

如果 sizes 写错了，即使 srcset 准备得很充分，也可能下载过大的图片。

---

## 七、Dawn 如何实现图片懒加载？

现在看另一个非常重要的地方。

在 `product-media-gallery.liquid` 中：

第一个媒体项：

```liquid
{% render 'product-thumbnail',
  media: featured_media,
  lazy_load: false
%}
```

后续媒体项：

```liquid
assign lazy_load = false

if media_position > 1
  assign lazy_load = true
endif
```

再传给：

```liquid
{% render 'product-thumbnail',
  media: media,
  lazy_load: lazy_load
%}
```

然后 `product-thumbnail.liquid`：

```liquid
unless lazy_load == false
  assign lazy = 'lazy'
endunless
```

最后：

```liquid
image_tag:
  loading: lazy
```

所以它的策略是：

<box border radius="lg" padding={3} gap={3}>
  **商品媒体加载策略**
  <row align="center" justify="between">
    **第一个主图**
    <badge color="success">不使用 lazy</badge>
  </row>
  <text color="secondary" size="xs">优先让首个商品媒体尽早加载，避免被懒加载推迟。</text>
  <divider color="subtle"/>
  <row align="center" justify="between">
    **后续媒体图片**
    <badge color="info">lazy</badge>
  </row>
  <text color="secondary" size="xs">通过浏览器原生懒加载减少非首屏资源竞争。</text>
  <divider color="subtle"/>
  <row align="center" justify="between">
    **缩略图**
    <badge color="info">lazy</badge>
  </row>
  <text color="secondary" size="xs">缩略图使用独立的小尺寸候选资源。</text>
  <divider color="subtle"/>
  <row align="center" justify="between">
    **视频和 3D 模型**
    <badge color="success">延迟实例化</badge>
  </row>
  <text color="secondary" size="xs">实际媒体内容放在 template 中，不在初始页面直接创建。</text>
</box>

这里有一个值得注意的细节：

不使用 `loading="lazy"` 不等于一定会获得最高网络优先级。

Dawn 这段主图代码没有显式设置 `fetchpriority="high"`。

如果你在实际项目中发现商品首图是 LCP 元素，可以结合 Performance 和 Network 面板，进一步评估是否需要提升其加载优先级。

但不要对所有商品图片都设置高优先级，否则反而会造成资源竞争。

---

## 八、视频和 3D Model：DeferredMedia 是什么？

这部分是 Dawn 媒体系统中非常优秀的设计。

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-thumbnail.liquid" title="product-thumbnail.liquid"/>

找到：

```liquid
{%- if media.media_type != 'image' -%}

  <deferred-media
    class="deferred-media media media--transparent"
    data-media-id="{{ media.id }}"
  >

    <button class="deferred-media__poster">
      {{
        media.preview_image
        | image_url: width: 1946
        | image_tag: loading: lazy
      }}
    </button>

    <template>
      ...
    </template>

  </deferred-media>

{%- endif -%}
```

这里出现了一个新的 HTML 标签：

```html
<deferred-media>
```

它的作用是延迟加载真正的媒体内容。

### 1. 为什么需要它？

假设一个商品有：

- 5 张商品图片。
- 2 个视频。
- 1 个 3D 模型。

如果页面刚打开就把所有视频 iframe、video、model-viewer 全部初始化，会发生什么？

- 增加初始网络请求。
- 增加 JavaScript 执行成本。
- 增加 DOM 节点和内存占用。
- 可能占用较多主线程及 GPU 资源。

但用户可能只看图片，根本不会播放视频。

因此 Dawn 不会直接把真正的视频放入页面，而是：

```html
<deferred-media>

  <button>
    <img src="视频封面">
  </button>

  <template>
    <video ...></video>
  </template>

</deferred-media>
```

这里的 `<template>` 有一个非常重要的特性：

**template 中的内容不会作为正常的活动 DOM 内容直接渲染。**

也就是说，视频并没有在初始页面中真正创建出来。

### 2. 点击视频时发生什么？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="assets/global.js"/>

找到：

```js
class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    const poster = this.querySelector(
      '[id^="Deferred-Poster-"]'
    );

    if (!poster) return;

    poster.addEventListener(
      'click',
      this.loadContent.bind(this)
    );
  }

  loadContent(focus = true) {
    window.pauseAllMedia();

    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');

      content.appendChild(
        this.querySelector('template')
          .content
          .firstElementChild
          .cloneNode(true)
      );

      this.setAttribute('loaded', true);

      const deferredElement =
        this.appendChild(
          content.querySelector('video, model-viewer, iframe')
        );

      if (focus) deferredElement.focus();

      // ...
    }
  }
}
```

我们把它拆成几个步骤：

<list connector="solid" marker="number" gap={3}>
  <list-item>
    **用户点击视频封面**

    触发 `loadContent()`。
  </list-item>
  <list-item>
    **暂停其他媒体**

    ```js
    window.pauseAllMedia();
    ```
  </list-item>
  <list-item>
    **从 template 克隆真实媒体**

    ```js
    template.content.firstElementChild.cloneNode(true)
    ```
  </list-item>
  <list-item>
    **插入当前 DOM**

    创建真正的 video、iframe 或 model-viewer。
  </list-item>
  <list-item>
    **播放或初始化媒体**

    用户开始观看视频或操作 3D 模型。
  </list-item>
</list>

这是一种典型的按需加载策略。

它的价值不只是减少图片加载，而是避免不必要的媒体实例化。

### 3. 为什么要 pauseAllMedia？

Dawn 还实现了一个全局函数：

```js
function pauseAllMedia() {
  document.querySelectorAll('.js-youtube')
    .forEach((video) => {
      video.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        '*'
      );
    });

  document.querySelectorAll('.js-vimeo')
    .forEach((video) => {
      video.contentWindow.postMessage(
        '{"method":"pause"}',
        '*'
      );
    });

  document.querySelectorAll('video')
    .forEach((video) => video.pause());

  document.querySelectorAll('product-model')
    .forEach((model) => {
      if (model.modelViewerUI) {
        model.modelViewerUI.pause();
      }
    });
}
```

这意味着：

当用户切换媒体时，Dawn 会尽量确保之前播放的视频或模型停止活动。

避免出现多个视频同时播放的问题。

**这也是为什么 Dawn 的媒体系统不是简单的图片轮播，而是一个统一的媒体管理器。**

---

## 九、SliderComponent：Dawn 如何实现轮播？

现在进入：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="assets/global.js"/>

找到：

```js
class SliderComponent extends HTMLElement
```

这个类是 Dawn 很多轮播组件的基础。

包括：

- 商品媒体画廊。
- 商品缩略图。
- 商品推荐。
- 集合列表。
- Slideshow。

### 1. 它如何找到轮播元素？

```js
constructor() {
  super();

  this.slider =
    this.querySelector('[id^="Slider-"]');

  this.sliderItems =
    this.querySelectorAll('[id^="Slide-"]');

  this.prevButton =
    this.querySelector('button[name="previous"]');

  this.nextButton =
    this.querySelector('button[name="next"]');

  if (!this.slider || !this.nextButton) return;

  this.initPages();
}
```

它通过约定的 ID 前缀定位：

```text
Slider-
Slide-
```

例如：

```html
<slider-component>

  <ul id="Slider-Gallery-123">

    <li id="Slide-123-1001">...</li>

    <li id="Slide-123-1002">...</li>

    <li id="Slide-123-1003">...</li>

  </ul>

  <button name="previous">...</button>
  <button name="next">...</button>

</slider-component>
```

这意味着 SliderComponent 并不需要知道自己管理的是商品图片还是商品推荐。

它只需要遵循约定的 DOM 结构。

### 2. 它如何计算当前页？

核心代码：

```js
initPages() {
  this.sliderItemsToShow =
    Array.from(this.sliderItems)
      .filter((element) => element.clientWidth > 0);

  if (this.sliderItemsToShow.length < 2) return;

  this.sliderItemOffset =
    this.sliderItemsToShow[1].offsetLeft -
    this.sliderItemsToShow[0].offsetLeft;

  this.slidesPerPage = Math.floor(
    (this.slider.clientWidth -
      this.sliderItemsToShow[0].offsetLeft) /
      this.sliderItemOffset
  );

  this.totalPages =
    this.sliderItemsToShow.length -
    this.slidesPerPage + 1;

  this.update();
}
```

举个例子：

假设：

```text
Slider 宽度：1000px

每个 Slide 宽度：500px

总共有 5 个 Slide
```

那么：

```text
每页可以显示 2 个 Slide
```

总页数：

```js
5 - 2 + 1 = 4
```

所以它会计算出：

```text
第 1 页：Slide 1、Slide 2
第 2 页：Slide 2、Slide 3
第 3 页：Slide 3、Slide 4
第 4 页：Slide 4、Slide 5
```

这就是 `slidesPerPage` 和 `totalPages` 的用途。

### 3. 它如何检测用户滑动？

```js
this.slider.addEventListener(
  'scroll',
  this.update.bind(this)
);
```

当用户滑动时：

```js
update() {
  const previousPage = this.currentPage;

  this.currentPage =
    Math.round(
      this.slider.scrollLeft /
      this.sliderItemOffset
    ) + 1;

  if (this.currentPage != previousPage) {
    this.dispatchEvent(
      new CustomEvent('slideChanged', {
        detail: {
          currentPage: this.currentPage,
          currentElement:
            this.sliderItemsToShow[
              this.currentPage - 1
            ],
        },
      })
    );
  }
}
```

它会计算当前滚动位置，得出当前页，然后派发：

```js
slideChanged
```

注意：

Dawn 没有直接让 SliderComponent 操作商品缩略图。

它只是发出事件。

具体如何处理，由上层的 `MediaGallery` 决定。

这就是组件解耦。

### 4. 移动端和桌面端有什么不同？

这是一个很容易误解的地方。

Dawn 并不是所有设备都使用同样的轮播布局。

例如：

- 移动端通常通过横向滚动和 Scroll Snap 实现媒体滑动。
- 桌面端可以采用 stacked、columns、thumbnail、thumbnail_slider 等不同布局。

在 `component-slider.css` 中可以看到：

```css
@media screen and (max-width: 749px) {
  .slider.slider--mobile {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
  }
}
```

而在 `section-main-product.css` 中：

```css
@media screen and (min-width: 750px) {
  .product--thumbnail .product__media-item:not(.is-active),
  .product--thumbnail_slider .product__media-item:not(.is-active) {
    display: none;
  }
}
```

所以桌面端的缩略图布局中，通常只显示当前激活的主媒体。

而 columns、stacked 等布局可以同时展示多个媒体。

也就是说：

**SliderComponent 提供通用滑动能力，CSS 和 Liquid 决定不同屏幕下的具体展示形式。**

---

## 十、深入 media-gallery.js：缩略图如何控制主图？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/media-gallery.js" title="assets/media-gallery.js"/>

我们来看核心逻辑。

### 1. 初始化

```js
constructor() {
  super();

  this.elements = {
    liveRegion:
      this.querySelector('[id^="GalleryStatus"]'),

    viewer:
      this.querySelector('[id^="GalleryViewer"]'),

    thumbnails:
      this.querySelector('[id^="GalleryThumbnails"]'),
  };

  this.mql =
    window.matchMedia('(min-width: 750px)');

  if (!this.elements.thumbnails) return;

  this.elements.viewer.addEventListener(
    'slideChanged',
    debounce(this.onSlideChanged.bind(this), 500)
  );

  this.elements.thumbnails
    .querySelectorAll('[data-target]')
    .forEach((mediaToSwitch) => {
      mediaToSwitch
        .querySelector('button')
        .addEventListener(
          'click',
          this.setActiveMedia.bind(
            this,
            mediaToSwitch.dataset.target,
            false
          )
        );
    });
}
```

这里做了两件事情：

1. 监听主图轮播变化。
2. 给每个缩略图绑定点击事件。

缩略图中：

```html
<li data-target="section-id-media-id">
  <button>
    <img src="thumbnail.jpg">
  </button>
</li>
```

点击缩略图时，执行：

```js
setActiveMedia(mediaId, false)
```

### 2. setActiveMedia 是核心

```js
setActiveMedia(mediaId, prepend) {
  const activeMedia =
    this.elements.viewer.querySelector(
      `[data-media-id="${mediaId}"]`
    ) ||
    this.elements.viewer.querySelector(
      '[data-media-id]'
    );

  if (!activeMedia) return;

  this.elements.viewer
    .querySelectorAll('[data-media-id]')
    .forEach((element) => {
      element.classList.remove('is-active');
    });

  activeMedia.classList.add('is-active');

  // ...
}
```

这里做的事情：

- 根据媒体 ID 找到目标媒体。
- 移除所有媒体的 `is-active`。
- 给目标媒体添加 `is-active`。

然后：

```js
this.playActiveMedia(activeMedia);
```

如果是图片，不需要做什么特别处理。

如果是视频或者 3D Model，就会触发前面讲过的 DeferredMedia 逻辑。

最后：

```js
const activeThumbnail =
  this.elements.thumbnails.querySelector(
    `[data-target="${mediaId}"]`
  );

this.setActiveThumbnail(activeThumbnail);
```

更新缩略图。

### 3. setActiveThumbnail 做了什么？

```js
setActiveThumbnail(thumbnail) {
  if (!this.elements.thumbnails || !thumbnail) return;

  this.elements.thumbnails
    .querySelectorAll('button')
    .forEach((element) => {
      element.removeAttribute('aria-current');
    });

  thumbnail.querySelector('button')
    .setAttribute('aria-current', true);

  if (
    this.elements.thumbnails.isSlideVisible(
      thumbnail,
      10
    )
  ) return;

  this.elements.thumbnails.slider.scrollTo({
    left: thumbnail.offsetLeft
  });
}
```

它不仅仅是修改样式。

还会：

- 更新 `aria-current`，让辅助技术知道当前缩略图。
- 如果当前缩略图不在可见区域，自动滚动到它。

这样主图与缩略图就保持同步了。

---

## 十一、最重要的部分：切换 Variant 时，Dawn 如何更新媒体画廊？



因为它将前面学过的 Variant 更新机制与今天的媒体画廊联系起来。

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/product-info.js" title="assets/product-info.js"/>

找到：

```js
updateMedia(html, variantFeaturedMediaId)
```

它的调用来自 Variant 更新流程。

例如：

```text
当前 Variant：Black
    ↓
用户选择 White
    ↓
请求 Shopify Section HTML
    ↓
得到 White 对应的新媒体数据
    ↓
updateMedia()
```

### 1. 为什么不能简单替换整个 Gallery？

你可能会想到：

```js
mediaGallery.innerHTML =
  newMediaGallery.innerHTML;
```

这样不是最简单吗？

但 Dawn 没有这么做。

它采用的是基于 `data-media-id` 的差异更新。

核心代码：

```js
const mediaGallerySource =
  this.querySelector('media-gallery ul');

const mediaGalleryDestination =
  html.querySelector('media-gallery ul');
```

分别代表：

- Source：当前页面中的媒体列表。
- Destination：Shopify 新返回 HTML 中的媒体列表。

### 2. 第一步：建立当前媒体集合

```js
const mediaGallerySourceItems =
  Array.from(
    mediaGallerySource.querySelectorAll(
      'li[data-media-id]'
    )
  );

const sourceSet = new Set(
  mediaGallerySourceItems.map(
    (item) => item.dataset.mediaId
  )
);
```

例如当前页面：

```text
[
  image-1001,
  image-1002,
  image-1003
]
```

转换为 Set：

```js
new Set([
  'section-1001',
  'section-1002',
  'section-1003'
]);
```

### 3. 第二步：添加新媒体

假设新 Variant 对应的媒体列表：

```text
[
  image-1004,
  image-1001,
  image-1003
]
```

当前列表：

```text
[
  image-1001,
  image-1002,
  image-1003
]
```

那么：

```text
image-1004
```

是新出现的媒体。

源码：

```js
for (
  let i = mediaGalleryDestinationItems.length - 1;
  i >= 0;
  i--
) {
  if (
    !sourceSet.has(
      mediaGalleryDestinationItems[i].dataset.mediaId
    )
  ) {
    mediaGallerySource.prepend(
      mediaGalleryDestinationItems[i]
    );
  }
}
```

它会把新媒体插入当前 DOM。

### 4. 第三步：删除不再需要的媒体

源码：

```js
for (
  let i = 0;
  i < mediaGallerySourceItems.length;
  i++
) {
  if (
    !destinationSet.has(
      mediaGallerySourceItems[i].dataset.mediaId
    )
  ) {
    mediaGallerySourceItems[i].remove();
  }
}
```

刚才的：

```text
image-1002
```

已经不在新列表中。

所以会被删除。

### 5. 第四步：重新排序

源码：

```js
mediaGalleryDestinationItems.forEach(
  (destinationItem, destinationIndex) => {

    const sourceData =
      sourceMap.get(destinationItem.dataset.mediaId);

    if (
      sourceData &&
      sourceData.index !== destinationIndex
    ) {
      mediaGallerySource.insertBefore(
        sourceData.item,
        mediaGallerySource.querySelector(
          `li:nth-of-type(${destinationIndex + 1})`
        )
      );
    }

  }
);
```

最终得到：

```text
[
  image-1004,
  image-1001,
  image-1003
]
```

和服务端返回的新媒体顺序一致。

<box border radius="lg" padding={3} gap={3}>
  **Variant 切换时的媒体 DOM 差异更新**
  <box gap={1}>
    **旧媒体列表**
    <row gap={1}>
      <box flex="1" background="surface-secondary" radius="md" padding={2} align="center">
        1001
      </box>
      <box flex="1" background="surface-secondary" radius="md" padding={2} align="center">
        1002
      </box>
      <box flex="1" background="surface-secondary" radius="md" padding={2} align="center">
        1003
      </box>
    </row>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
    <text size="xs" color="secondary">对比服务端返回的新列表</text>
  </box>
  <box gap={1}>
    **新媒体列表**
    <row gap={1}>
      <box flex="1" border={{size:1,color:"#16A34A"}} radius="md" padding={2} align="center">
        <badge color="success">新增</badge>
        1004
      </box>
      <box flex="1" background="surface-secondary" radius="md" padding={2} align="center">
        1001
      </box>
      <box flex="1" background="surface-secondary" radius="md" padding={2} align="center">
        1003
      </box>
    </row>
    <text size="xs" color="danger">1002 被移除</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **最终 DOM**
    <text color="success" weight="medium">1004 → 1001 → 1003</text>
    <text color="secondary" size="xs">顺序与 Shopify 返回的媒体顺序一致</text>
  </box>
</box>

为什么要这么做？

因为对于没有变化的媒体项，Dawn 可以保留原来的 DOM 节点，而不是全部销毁重新创建。

这有几个好处：

- 减少不必要的 DOM 操作。
- 保留已经加载的图片节点。
- 避免重建整个媒体画廊。
- 减少重新绑定交互的工作。

这是一种非常值得学习的 DOM Diff 思路。

### 6. 最后激活 Variant 对应的主图

```js
this.querySelector('media-gallery')
  ?.setActiveMedia?.(
    `${this.dataset.section}-${variantFeaturedMediaId}`,
    true
  );
```

注意第二个参数：

```js
true
```

这次不是普通的缩略图点击，而是 Variant 切换。

因此它会执行：

```js
if (prepend) {
  activeMedia.parentElement.prepend(activeMedia);

  // 缩略图也移动到最前面

  if (this.elements.viewer.slider) {
    this.elements.viewer.resetPages();
  }
}
```

也就是说，切换 Variant 后，当前 Variant 的主图会被移动到媒体列表最前面。

这样就能保证：

```text
切换到 White Variant
       ↓
白色商品图移动到第一位
       ↓
自动激活白色商品图
       ↓
缩略图也同步到第一位
```

最后，`updateMedia()` 还会更新 Modal 内的媒体内容：

```js
const modalContent =
  this.productModal?.querySelector(
    '.product-media-modal__content'
  );

const newModalContent =
  html.querySelector(
    'product-modal .product-media-modal__content'
  );

if (modalContent && newModalContent) {
  modalContent.innerHTML = newModalContent.innerHTML;
}
```

为什么这里直接替换 Modal 内容，而主画廊却采用 Diff？

因为两者的使用场景不同。

主画廊需要保持当前媒体状态和滑动组件的连续性；Modal 内容则是另一个独立的媒体展示区域。

---

## 十二、图片放大 Modal 是如何实现的？

最后我们看看用户点击商品图片后，为什么会出现全屏放大效果。

涉及三个文件：

- <Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-media-modal.liquid" title="product-media-modal.liquid"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/product-modal.js" title="product-modal.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="global.js"/>

### 1. 图片如何关联 Modal？

在 `product-thumbnail.liquid`：

```liquid
<modal-opener
  data-modal="#ProductModal-{{ modal_id }}"
>
  <button
    type="button"
    data-media-id="{{ media.id }}"
  >
  </button>
</modal-opener>
```

它的意思是：

点击这个按钮，打开：

```text
#ProductModal-当前SectionID
```

同时告诉 Modal：

当前点击的是哪个 Media ID。

### 2. Modal 如何打开？

`global.js`：

```js
class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;

    button.addEventListener('click', () => {
      const modal = document.querySelector(
        this.getAttribute('data-modal')
      );

      if (modal) {
        modal.show(button);
      }
    });
  }
}
```

然后 `product-modal.js`：

```js
class ProductModal extends ModalDialog {
  show(opener) {
    super.show(opener);
    this.showActiveMedia();
  }
}
```

这里使用了继承。

`ProductModal` 继承 `ModalDialog`，所以它复用了基础 Modal 的：

- 打开和关闭。
- Escape 键处理。
- 焦点管理。
- 页面滚动锁定。

自己只需要处理商品媒体相关的逻辑。

### 3. 为什么 Modal 还要知道当前点击的是哪个媒体？

看：

```js
showActiveMedia() {
  this.querySelectorAll(
    `[data-media-id]:not(
      [data-media-id="${this.openedBy.getAttribute('data-media-id')}"]
    )`
  ).forEach((element) => {
    element.classList.remove('active');
  });

  const activeMedia = this.querySelector(
    `[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`
  );

  activeMedia.classList.add('active');

  activeMedia.scrollIntoView();
}
```

它会根据点击按钮的 `data-media-id`，定位 Modal 中对应的媒体。

因此：

```text
用户点击第 3 张商品图
       ↓
传递 Media ID
       ↓
打开 Modal
       ↓
定位第 3 张媒体
       ↓
滚动到第 3 张媒体
```

而且 Modal 中也可以包含视频和 3D Model。

所以它不是单纯的图片放大组件，而是一个完整的媒体展示组件。

---

## 十三、从性能优化角度总结整个媒体系统

现在我们把今天学到的东西放到性能优化视角下。

| 优化策略 | Dawn 的实现 | 解决的问题 |
|---|---|---|
| 响应式图片 | `srcset + sizes` | 避免下载过大的图片 |
| 首图优先加载 | 首个媒体 `lazy_load: false` | 避免首屏主图被懒加载延迟 |
| 图片懒加载 | `loading="lazy"` | 减少非首屏资源竞争 |
| 缩略图优化 | 独立宽度候选 | 避免缩略图下载大图 |
| 视频延迟加载 | `DeferredMedia + template` | 减少初始网络请求 |
| 3D Model 延迟初始化 | DeferredMedia | 减少初始计算和资源开销 |
| 媒体 DOM Diff | `updateMedia()` | 减少 Variant 切换时的 DOM 重建 |
| 比例预留 | `aspect_ratio` 和 CSS | 减少 CLS |
| Slider 事件解耦 | `slideChanged` | 降低组件之间的依赖 |

媒体系统还涉及三个性能原理。

**第一，图片优化不只是压缩图片。**

更重要的是根据设备实际显示尺寸，加载合适的图片资源。

**第二，懒加载不只是图片的懒加载。**

视频、iframe、3D Model 等资源的延迟实例化，有时候能带来更明显的性能收益。

**第三，DOM 更新不一定要全部替换。**

如果新旧内容中有大量相同节点，基于稳定 ID 的 Diff 更新可以保留已经加载的资源和现有节点状态。

---

## 十四、动手调试：自己验证 Dawn 的媒体加载机制

这部分建议你实际操作，不要只看代码。

打开一个包含多张图片和视频的 Dawn 商品页面。

### 实验 1：观察图片加载

打开 Chrome DevTools：

Network → Img。

然后刷新页面。

观察：

- 第一张主图是否没有 `loading="lazy"`。
- 后续图片是否使用 `loading="lazy"`。
- 缩略图是否使用较小的图片资源。
- 图片请求实际下载的尺寸。

在 Console 中执行：

```js
const img = document.querySelector(
  '.product__media img'
);

console.log({
  src: img.src,
  currentSrc: img.currentSrc,
  srcset: img.srcset,
  sizes: img.sizes,
  loading: img.loading,
  width: img.width,
  height: img.height,
});
```

特别关注：

```js
img.currentSrc
```

它表示浏览器最终选择并使用的图片 URL。

### 实验 2：观察视频延迟加载

刷新页面，不点击视频。

检查：

```js
const media = document.querySelector(
  'deferred-media'
);

console.log(media.hasAttribute('loaded'));
```

然后点击视频封面，再执行一次。

观察它是否变成：

```js
true
```

再检查：

```js
media.querySelector('video, iframe, model-viewer');
```

你会看到真正的媒体元素是在需要时才被创建出来的。

### 实验 3：观察 Variant 对媒体的影响

选择不同颜色的 Variant。

在 Console 中执行：

```js
const items = [
  ...document.querySelectorAll(
    'media-gallery .product__media-list > li'
  )
];

console.log(
  items.map((item) => ({
    id: item.dataset.mediaId,
    active: item.classList.contains('is-active'),
  }))
);
```

观察：

- 是否新增了媒体。
- 是否删除了媒体。
- 是否改变了媒体顺序。
- 当前激活的媒体是否变成新 Variant 对应的图片。

---

## 十五、本课思考题

今天的内容比较多，我想让你重点思考一个问题。

假设你自己开发一个 Shopify Theme，有一个商品包含：

```text
20 张图片
3 个视频
2 个 3D Model
```

现在用户打开商品详情页。

**问题：你会如何设计媒体加载策略，尽量保证首屏 LCP，同时减少初始网络请求和浏览器主线程开销？**

从以下几个角度分析：

1. 首屏哪些图片应该优先加载？
2. 其他图片应该如何加载？
3. 视频和 3D Model 应该在什么时候初始化？
4. `srcset` 和 `sizes` 应该如何设计？
5. 用户切换 Variant 时，应该整体替换 Gallery，还是只更新变化的媒体？

你可以先自己思考，不必马上给出完整方案。
