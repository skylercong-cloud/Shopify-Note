# Theme Editor 与 Section 生命周期：动态渲染、组件初始化和资源清理


这一课与前面的商品页、购物车和导航系统有一个明显区别：我们不再只研究一个具体功能，而是研究**如何让自己开发的 Shopify Theme 组件在 Theme Editor 中稳定运行**。

先看一个实际问题。

你开发了一个自定义轮播 Section，正常访问商店时一切正常：

- 自动轮播正常。
- 左右箭头正常。
- 点击圆点可以切换图片。

但商家进入 Shopify Theme Editor，修改轮播设置以后，发现左右箭头突然失效。再修改几次，甚至出现一次点击触发多次事件的问题。

这通常不是 Liquid 或 CSS 的问题，而是 **Section 动态更新与 JavaScript 生命周期没有正确配合**。

本课围绕五个核心问题展开：Theme Editor 如何更新 DOM、`block.shopify_attributes` 的作用、编辑器事件机制、Dawn 的真实处理方式，以及如何编写能够安全初始化和销毁的自定义组件。

## 一、首先理解：Theme Editor 不是普通的页面加载过程

在普通商店页面中，初始化流程一般是：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **浏览器请求页面**
    <text color="secondary" size="xs">Shopify 执行 Liquid</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **HTML / CSS / JS 加载**
    <text color="secondary" size="xs">解析 DOM、注册 Web Components</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **DOMContentLoaded / connectedCallback**
    <text color="secondary" size="xs">完成组件初始化</text>
  </box>
</box>

但是 Theme Editor 不是每修改一次配置就刷新整个预览页面。

例如商家在编辑器中修改：

```text
Slideshow
  Auto rotate: true → false
```

Shopify 可以重新渲染对应 Section，并把新的 HTML 替换进现有页面，而不会完整刷新浏览器。

因此可能发生：

```text
初始页面加载
    ↓
DOMContentLoaded
    ↓
初始化轮播组件
    ↓
商家修改 Section 配置
    ↓
旧 Section DOM 被移除
    ↓
新 Section DOM 被插入
    ↓
DOMContentLoaded 不会再次触发
```

**这里就是问题的根源。**

如果你的 JavaScript 只写了：

```js
document.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
});
```

第一次加载时正常。

但后续 Shopify 替换 Section 后，这个回调不会自动再次运行。

因此，新插入的 HTML 可能没有绑定任何交互事件。

Shopify 官方文档明确要求 Theme 开发者处理 Section 动态加载、移除、选择和重新排序的情况。

### 1. Section 重渲染与 Section Rendering API 是不是同一个东西？

这一点需要区分。

| 机制 | 触发方 | 典型场景 |
|---|---|---|
| Theme Editor 动态重渲染 | Shopify 编辑器 | 修改 Section 配置 |
| Section Rendering API | Theme 自己的 JavaScript | Variant 切换、筛选、购物车更新 |

它们可以都涉及服务端 Liquid 渲染和客户端 HTML 替换，但不是同一个接口调用流程。

例如我们之前研究的 Variant 切换：

```js
fetch(
  '/products/t-shirt?section_id=main&option_values=111,222'
)
```

是 Theme 自己发起的 Ajax 请求。

而 Theme Editor 修改配置时，Shopify 编辑器负责更新对应 DOM，并触发编辑器事件。

**不要误以为自己调用 Section Rendering API 替换 HTML 后，Shopify 就一定会自动触发 `shopify:section:load`。**

如果是你自己写的 DOM 更新逻辑，就应该由你的代码负责相关组件的初始化和清理。

---

## 二、Theme Editor 提供了哪些 JavaScript 事件？

这部分建议你真正记下来，因为以后开发自定义 Section 会经常用到。

Shopify 编辑器主要提供以下事件：

| 事件 | 什么时候触发 | 开发者通常做什么 |
|---|---|---|
| `shopify:section:load` | Section 新增或重新渲染 | 初始化相关功能 |
| `shopify:section:unload` | Section 删除或即将重渲染 | 清理监听器、Observer 等 |
| `shopify:section:select` | 商家选中某个 Section | 保持该 Section 可见 |
| `shopify:section:deselect` | 取消选中 Section | 恢复正常交互状态 |
| `shopify:section:reorder` | Section 顺序变化 | 重新计算位置或布局 |
| `shopify:block:select` | 商家选中某个 Block | 展示或定位对应 Block |
| `shopify:block:deselect` | 取消选中 Block | 恢复对应状态 |

此外还有 `shopify:inspector:activate` 和 `shopify:inspector:deactivate`，用于编辑器预览检查模式的切换。

### 1. 事件如何监听？

和普通 DOM 事件一样：

```js
document.addEventListener(
  'shopify:section:load',
  (event) => {
    console.log('Section loaded', event);
  }
);
```

例如商家修改 Slideshow 设置时，你可以观察到 `shopify:section:load`。

这个事件的 `detail` 中包含：

```js
event.detail.sectionId
```

表示当前涉及的 Section ID。

例如：

```js
{
  sectionId: "template--123456__slideshow"
}
```

这里的 ID 只是示意。

### 2. 为什么要使用 event.target？

看：

```js
document.addEventListener(
  'shopify:section:load',
  (event) => {
    const sectionElement = event.target;

    console.log(sectionElement);
  }
);
```

`event.target` 指向对应的 Section 元素。

例如：

```html
<div
  id="shopify-section-template--123456__slideshow"
  class="shopify-section"
>
  ...
</div>
```

这就意味着你可以直接针对当前 Section 初始化：

```js
initializeSlideshow(event.target);
```

而不是每次都执行：

```js
document.querySelectorAll('.slideshow');
```

重新扫描整个页面。

这两种写法有明显区别：

**针对 event.target 初始化，能够限制操作范围，避免重复处理页面上其他正常工作的组件。**

### 3. 为什么事件监听可以放在 document 上？

因为 Shopify 编辑器事件会冒泡。

所以：

```js
document.addEventListener(
  'shopify:section:load',
  handler
);
```

可以接收到当前页面各个 Section 的加载事件。

但这并不意味着所有自定义事件都会冒泡。自己派发 CustomEvent 时，需要根据情况明确配置 `bubbles: true`。

### 4. event.detail.load 代表什么？

对于 Section 和 Block 的 `select` 事件，Shopify 还可能提供：

```js
event.detail.load
```

其含义是：这次选择是否由 Section 重渲染引起。

例如：

```js
document.addEventListener(
  'shopify:block:select',
  (event) => {
    if (event.detail.load) {
      console.log('重渲染后的 Block 选择');
    } else {
      console.log('用户主动选择 Block');
    }
  }
);
```

这个区分很有价值。

因为商家修改 Block 配置后，编辑器可能需要重新选中对应 Block，而你不一定希望每次都重复播放一个复杂的动画。

---

## 三、block.shopify_attributes 究竟是干什么的？

现在研究本课最重要的 Liquid 属性之一：

```liquid
{{ block.shopify_attributes }}
```

你之前在 Dawn 源码中应该已经看到它很多次。

例如：

`sections/slideshow.liquid`

```liquid
{% for block in section.blocks %}

  <div
    class="slideshow__slide"
    id="Slide-{{ section.id }}-{{ forloop.index }}"
    {{ block.shopify_attributes }}
  >

    <!-- Slide 内容 -->

  </div>

{% endfor %}
```

为什么一定要加这个属性？

### 1. 它是 Theme Editor 识别 Block 的重要依据

Shopify Theme Editor 需要知道：

```text
左侧编辑面板中的 Block A
```

对应页面预览中的：

```text
哪一个 DOM 元素？
```

`block.shopify_attributes` 会在编辑器环境中输出编辑器用于识别 Block 的数据属性。

例如可以理解为：

```html
<div
  class="slideshow__slide"
  data-shopify-editor-block="..."
>
  ...
</div>
```

这里省略属性的完整内部数据格式。

因此，当商家在左侧选择一个 Block 时，编辑器可以定位其对应的 DOM 元素，并派发 `shopify:block:select`。

官方文档明确说明：Section 的外层标识由 Shopify 默认生成，而 Block 则需要开发者使用 `block.shopify_attributes` 输出对应属性。

### 2. 为什么通常不应该直接写死 Block ID？

例如：

```liquid
<div id="my-block-1">
```

这种方式存在问题。

因为一个 Section 可以拥有多个同类型 Block：

```text
Slide A
Slide B
Slide C
```

如果每个 Block 都写：

```html
id="my-block-1"
```

就会发生 ID 冲突。

即使你使用：

```liquid
id="block-{{ block.id }}"
```

也不意味着 Shopify 编辑器会自动使用这个属性来识别 Block。

因为 `block.shopify_attributes` 是专门用于编辑器识别的。

两者可以同时存在：

```liquid
<div
  id="block-{{ block.id }}"
  {{ block.shopify_attributes }}
>
```

前者用于自己的 DOM 查询，后者用于编辑器识别。

### 3. 在正常商店页面，它会输出什么？

根据 Shopify 官方文档：

**非 Theme Editor 环境中，`block.shopify_attributes` 不会返回属性值。**

因此你不需要手动写：

```liquid
{% if request.design_mode %}
  {{ block.shopify_attributes }}
{% endif %}
```

直接使用即可。

### 4. 为什么应该将它放在 Block 的外层元素上？

假设你的 Block 结构是：

```liquid
<div class="faq-item">

  <h3>{{ block.settings.question }}</h3>

  <p>{{ block.settings.answer }}</p>

</div>
```

正确做法：

```liquid
<div
  class="faq-item"
  {{ block.shopify_attributes }}
>
```

而不是仅仅放在：

```liquid
<h3 {{ block.shopify_attributes }}>
```

因为通常你希望商家选择这个 Block 时，对应的是整个 FAQ 项目，而不只是标题。

这也方便你的 JavaScript 根据 `event.target` 找到完整的 Block 容器。

---

## 四、深入 Dawn：theme-editor.js 如何处理这些事件？

现在打开官方源码：

[assets/theme-editor.js](https://github.com/Shopify/dawn/blob/main/assets/theme-editor.js)

这个文件只有几十行，但非常值得研究。

它主要处理 Slideshow 的 Block 选择、商品媒体弹窗的关闭，以及 Section 重新加载时的部分兼容逻辑。

### 1. 首先看 Slideshow 如何加载编辑器脚本

打开：

[sections/slideshow.liquid](https://github.com/Shopify/dawn/blob/main/sections/slideshow.liquid)

你会看到：

```liquid
{%- if request.design_mode -%}
  <script
    src="{{ 'theme-editor.js' | asset_url }}"
    defer="defer"
  ></script>
{%- endif -%}
```

这里使用的是：

```liquid
request.design_mode
```

它表示当前页面是否处于 Theme Editor 环境。

在 JavaScript 中，对应的是：

```js
Shopify.designMode
```

例如：

```js
if (window.Shopify?.designMode) {
  console.log('当前处于 Theme Editor');
}
```

这两个变量不要混淆：

| 环境 | 判断方式 |
|---|---|
| Liquid | `request.design_mode` |
| JavaScript | `Shopify.designMode` |

还要注意，Dawn 的 `theme-editor.js` 是由 Slideshow Section 有条件加载的，并不是所有编辑器事件都由它负责。其他组件，例如动画模块，也会单独监听编辑器事件。

### 2. 选中轮播 Block 后，Dawn 做了什么？

这是 `theme-editor.js` 中的真实源码：

```js
document.addEventListener(
  'shopify:block:select',
  function (event) {
    hideProductModal();

    const blockSelectedIsSlide =
      event.target.classList.contains(
        'slideshow__slide'
      );

    if (!blockSelectedIsSlide) return;

    const parentSlideshowComponent =
      event.target.closest(
        'slideshow-component'
      );

    parentSlideshowComponent.pause();

    setTimeout(function () {
      parentSlideshowComponent.slider.scrollTo({
        left: event.target.offsetLeft,
      });
    }, 200);
  }
);
```

我们拆开分析。

**第一步：判断选中的 Block 是不是轮播图。**

```js
event.target.classList.contains(
  'slideshow__slide'
);
```

因为整个 Theme Editor 中可能有很多 Block：

```text
Rich Text Block
Product Title Block
Image Block
Slideshow Block
```

不能所有 Block 的选择事件都执行轮播逻辑。

**第二步：找到当前轮播组件。**

```js
event.target.closest(
  'slideshow-component'
);
```

注意这里使用的是 `closest()`，而不是：

```js
document.querySelector(
  'slideshow-component'
);
```

为什么？

因为一个页面可能有多个 Slideshow Section。

`closest()` 可以从当前选中的 Slide 向上找到它所属的轮播组件。

这样就不会操作错误的 Slideshow。

**第三步：停止自动播放。**

```js
parentSlideshowComponent.pause();
```

这是一个非常重要的编辑器体验细节。

假设商家选中了第三张轮播图，正在修改标题。

如果轮播还在自动播放：

```text
第 3 张 → 第 4 张 → 第 1 张
```

那么商家正在编辑的内容可能突然从预览区域消失。

所以 Dawn 在编辑器选择某个 Slide 时，先暂停轮播。

**第四步：滚动到选中的 Slide。**

```js
parentSlideshowComponent.slider.scrollTo({
  left: event.target.offsetLeft
});
```

这样即使选中的是第 5 张 Slide，编辑器也能自动展示对应内容。

这就是 Shopify 官方强调的原则：

**在 Theme Editor 中选中某个 Block 时，应该让它保持可见。**

### 3. 取消选中后，Dawn 如何恢复自动播放？

源码：

```js
document.addEventListener(
  'shopify:block:deselect',
  function (event) {
    const blockDeselectedIsSlide =
      event.target.classList.contains(
        'slideshow__slide'
      );

    if (!blockDeselectedIsSlide) return;

    const parentSlideshowComponent =
      event.target.closest(
        'slideshow-component'
      );

    if (parentSlideshowComponent.autoplayButtonIsSetToPlay) {
      parentSlideshowComponent.play();
    }
  }
);
```

这里又有一个值得学习的细节：

```js
if (parentSlideshowComponent.autoplayButtonIsSetToPlay)
```

为什么不直接：

```js
parentSlideshowComponent.play();
```

因为用户原本可能已经手动暂停了轮播。

如果取消选中就强制自动播放，会覆盖用户之前的操作状态。

因此，Dawn 只在轮播原本应该自动播放的情况下恢复播放。

这是一种非常好的状态保持设计。

---

## 五、Section 被替换或删除时，Dawn 怎么清理旧组件？

继续看 `theme-editor.js`。

它监听：

```js
document.addEventListener(
  'shopify:section:unload',
  (event) => {
    document
      .querySelectorAll(
        `[data-section="${event.detail.sectionId}"]`
      )
      .forEach((element) => {
        element.remove();
        document.body.classList.remove(
          'overflow-hidden'
        );
      });
  }
);
```

这段代码有一个很有意思的地方：

它不是简单地删除 `event.target`。

而是根据：

```js
event.detail.sectionId
```

查找页面中所有：

```html
data-section="对应 Section ID"
```

的元素。

为什么 Dawn 要额外清理这些元素？

因为有些组件在初始化过程中，可能会将内容移动到原本 Section 之外。

例如：

- 商品媒体弹窗。
- 需要放在 `body` 下的浮层。
- 与当前 Section 关联的其他 DOM。

当 Section 被删除或重渲染时，这些额外生成的元素可能不会随着原有 Section 自动消失。

所以需要额外清理。

这里应该注意：

`theme-editor.js` 的这个清理方式是 Dawn 的具体实现，并不是 Shopify 强制规定所有 Theme 都要这样写。

如果你自己的组件没有把 DOM 移动到 Section 外部，就不一定需要这样做。

### 1. Dawn 还会主动关闭商品媒体弹窗

`theme-editor.js` 开头：

```js
function hideProductModal() {
  const productModal =
    document.querySelectorAll(
      'product-modal[open]'
    );

  productModal.forEach((modal) => {
    modal.hide();
  });
}
```

这个方法会在多个编辑器事件中调用：

```js
shopify:block:select
shopify:section:load
shopify:section:reorder
shopify:section:select
shopify:section:deselect
shopify:inspector:activate
shopify:inspector:deactivate
```

为什么？

因为商品媒体 Modal 是一个覆盖页面的浮层。

如果商家正在使用 Theme Editor 操作不同 Section，弹窗可能挡住当前需要编辑的内容。

因此，Dawn 在编辑器结构发生变化或用户切换选择时，主动关闭这个浮层。

这不是业务数据逻辑，而是**编辑器交互协调逻辑**。

---

## 六、Web Components 为什么特别适合 Shopify Theme Editor？

这是本课技术上最重要的部分之一。

你应该还记得我们之前研究的：

```js
class ProductInfo extends HTMLElement
```

```js
class CartItems extends HTMLElement
```

```js
class PricePerItem extends HTMLElement
```

它们都使用了 Web Components。

现在从 Theme Editor 生命周期的角度重新理解这种设计。

### 1. connectedCallback 与 disconnectedCallback

Web Components 有两个重要的生命周期方法：

```js
connectedCallback() {
  // 当元素连接到文档时执行
}
```

```js
disconnectedCallback() {
  // 当元素从文档中断开时执行
}
```

想象 Shopify 编辑器替换了一个 Section：

```text
旧 Section
    ↓
旧 Web Component 从 DOM 移除
    ↓
disconnectedCallback()
    ↓
新 Section 插入 DOM
    ↓
新 Web Component
    ↓
connectedCallback()
```

只要自定义元素已经通过：

```js
customElements.define(...)
```

注册，当新的对应元素插入页面后，浏览器就会自动调用其生命周期方法。

因此，它不需要依赖另一次 `DOMContentLoaded`。

这正是 Web Components 在 Shopify Theme 中非常有价值的原因。

### 2. Dawn ProductInfo 的真实示例

打开：

[assets/product-info.js](https://github.com/Shopify/dawn/blob/main/assets/product-info.js)

可以看到：

```js
connectedCallback() {
  this.initializeProductSwapUtility();

  this.onVariantChangeUnsubscriber = subscribe(
    PUB_SUB_EVENTS.optionValueSelectionChange,
    this.handleOptionValueChange.bind(this)
  );

  this.initQuantityHandlers();

  this.dispatchEvent(
    new CustomEvent(
      'product-info:loaded',
      { bubbles: true }
    )
  );
}
```

当 `<product-info>` 连接到 DOM 时：

- 初始化商品切换逻辑。
- 订阅 Variant 选择事件。
- 初始化数量规则相关逻辑。
- 派发组件已加载事件。

然后看：

```js
disconnectedCallback() {
  this.onVariantChangeUnsubscriber();
  this.cartUpdateUnsubscriber?.();
}
```

它在组件被移除时取消订阅。

为什么需要取消订阅？

因为 Pub/Sub 内部保存了回调引用。

如果旧组件已经从 DOM 中移除，但它的回调还留在订阅列表中，那么以后其他商品改变 Variant 时，旧组件仍可能执行逻辑。

可能出现：

```text
第 1 次进入编辑器：
1 个 ProductInfo
1 个事件订阅

修改 Section 后：
新的 ProductInfo
旧事件订阅没有清理

再次修改：
又一个 ProductInfo
旧事件订阅继续保留
```

最终就可能出现：

- 重复请求。
- 旧 DOM 被操作。
- 不必要的内存占用。
- 难以定位的状态异常。

而正确地实现 `disconnectedCallback()`，就可以避免这类问题。

### 3. 这里还有一个生命周期细节

需要特别注意：

`connectedCallback()` **并不保证一个组件实例只执行一次**。

如果你把同一个元素：

```js
element.remove();
```

之后又重新插入：

```js
parent.appendChild(element);
```

`connectedCallback()` 可能再次执行。

因此，下面的写法就可能有问题：

```js
connectedCallback() {
  document.addEventListener(
    'click',
    this.handleClick.bind(this)
  );
}
```

如果同一个实例反复连接：

- 每次都会生成新的绑定函数。
- 可能重复注册监听器。
- 如果没有保留函数引用，也很难正确移除。

所以，对需要反复连接和断开的组件，要设计可重复初始化的生命周期逻辑。

这也是我们下一部分要实际编写的内容。

---

## 七、实战：开发一个完全兼容 Theme Editor 的 FAQ Section

现在我们自己设计一个自定义 Section。

需求很简单，但要把工程细节做正确：

- 商家可以添加多个 FAQ Block。
- 点击问题可以展开答案。
- 在 Theme Editor 中选择某个 FAQ Block 时，自动展开对应内容。
- 编辑器重新渲染 Section 后，组件仍然正常工作。
- 删除 Section 后，不留下事件监听器。
- 同一个页面可以放多个 FAQ Section，互不干扰。

我们创建两个文件：

```text
sections/
  editor-faq.liquid

assets/
  editor-faq.js
```

### 1. Liquid：editor-faq.liquid

以下是一份可以作为起点使用的完整实现：

```liquid
{{ 'editor-faq.js' | asset_url | script_tag }}

<editor-faq
  class="editor-faq page-width"
  data-section-id="{{ section.id }}"
>
  <h2>{{ section.settings.heading | escape }}</h2>

  <div class="editor-faq__items">
    {% for block in section.blocks %}

      <details
        class="editor-faq__item"
        {{ block.shopify_attributes }}
      >
        <summary>
          {{ block.settings.question | escape }}
        </summary>

        <div class="editor-faq__answer">
          {{ block.settings.answer }}
        </div>
      </details>

    {% endfor %}
  </div>
</editor-faq>

{% schema %}
{
  "name": "Editor FAQ",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Frequently asked questions"
    }
  ],
  "blocks": [
    {
      "type": "faq",
      "name": "FAQ",
      "settings": [
        {
          "type": "text",
          "id": "question",
          "label": "Question",
          "default": "What is your return policy?"
        },
        {
          "type": "richtext",
          "id": "answer",
          "label": "Answer",
          "default": "<p>Enter your answer here.</p>"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Editor FAQ",
      "blocks": [
        {
          "type": "faq"
        }
      ]
    }
  ]
}
{% endschema %}
```

这里特意使用：

```html
<details>
```

作为每个 FAQ 的容器。

这样即使 JavaScript 还没有加载，用户也可以正常展开答案。

这是渐进增强设计。

另外：

```liquid
{{ block.shopify_attributes }}
```

放在 details 上。

因此编辑器选择 FAQ Block 时，对应的 `event.target` 就可以定位到这个 details。

### 2. JavaScript：editor-faq.js

```js
if (!customElements.get('editor-faq')) {
  customElements.define(
    'editor-faq',
    class EditorFaq extends HTMLElement {
      constructor() {
        super();

        this.onBlockSelect =
          this.onBlockSelect.bind(this);
      }

      connectedCallback() {
        if (this.isConnectedToEditorEvents) return;

        this.isConnectedToEditorEvents = true;

        if (window.Shopify?.designMode) {
          document.addEventListener(
            'shopify:block:select',
            this.onBlockSelect
          );
        }
      }

      disconnectedCallback() {
        document.removeEventListener(
          'shopify:block:select',
          this.onBlockSelect
        );

        this.isConnectedToEditorEvents = false;
      }

      onBlockSelect(event) {
        // 只处理属于当前 FAQ Section 的 Block
        if (!this.contains(event.target)) return;

        const details =
          event.target.closest('details');

        if (!details || !this.contains(details)) return;

        // 确保当前 Block 在编辑器中可见
        details.open = true;

        details.scrollIntoView({
          block: 'nearest',
          behavior: 'auto'
        });
      }
    }
  );
}
```

这份 JavaScript 不需要监听 `DOMContentLoaded`。

为什么？

因为：

```js
customElements.define(
  'editor-faq',
  ...
);
```

注册之后，浏览器会自动升级对应的自定义元素。

当元素连接到 DOM 时：

```js
connectedCallback()
```

就会执行。

### 3. 为什么不需要专门监听 section:load？

这一点非常重要。

假设商家修改了 FAQ 的标题。

Theme Editor 替换了整个 FAQ Section。

旧的：

```html
<editor-faq>
```

从 DOM 移除。

浏览器调用：

```js
disconnectedCallback()
```

从而移除编辑器事件监听。

新的：

```html
<editor-faq>
```

被插入页面。

由于 `editor-faq` 已经注册为 Web Component，浏览器会调用新元素的：

```js
connectedCallback()
```

重新注册所需的监听器。

因此，这类组件不需要额外写：

```js
document.addEventListener(
  'shopify:section:load',
  () => {
    initFaq();
  }
);
```

否则如果没有处理好重复初始化，反而容易造成重复监听。

**这里有一个前提：自定义元素定义脚本必须已经被正确加载和执行。**

我们不能假设 Shopify 动态插入 HTML 时，HTML 中的 `<script>` 标签一定会再次执行。更稳妥的生产实践，是通过主题的公共脚本加载机制注册组件，或确保所需 JS 在 Section 动态插入之前已经注册。官方 Section Rendering 文档也提醒了动态插入脚本不会自动执行的问题。

### 4. 为什么在 constructor 中 bind？

看：

```js
this.onBlockSelect =
  this.onBlockSelect.bind(this);
```

这样同一个组件实例始终保留同一个函数引用。

所以：

```js
document.addEventListener(
  'shopify:block:select',
  this.onBlockSelect
);
```

和：

```js
document.removeEventListener(
  'shopify:block:select',
  this.onBlockSelect
);
```

操作的是同一个函数。

如果每次注册都写：

```js
this.onBlockSelect.bind(this)
```

就会生成不同的函数对象。

这会导致事件移除失败。

这是非常典型的 JavaScript 事件管理问题。

### 5. 为什么要检查 this.contains(event.target)？

因为一个页面可能存在两个 FAQ Section：

```text
FAQ Section A
  Block A1
  Block A2

FAQ Section B
  Block B1
  Block B2
```

两个 Section 都会监听：

```text
shopify:block:select
```

如果不限制事件范围，当商家选择 Block B1 时，FAQ Section A 也可能执行处理。

这里：

```js
if (!this.contains(event.target)) return;
```

确保每个组件只处理属于自己的 Block。

这与我们之前研究的 ProductInfo 监听 Variant 变化时检查事件来源，是同一种设计思路。

---

## 八、如果使用普通 JavaScript，而不是 Web Components，应该怎么办？

Web Components 并不是唯一方案。

如果你不想使用自定义元素，也可以自己编写初始化和销毁函数。

不过需要建立一套明确的生命周期管理机制。

例如：

```js
const instances = new WeakMap();

function initSection(section) {
  const root = section.querySelector(
    '[data-custom-widget]'
  );

  if (!root) return;

  // 防止重复初始化
  if (instances.has(root)) return;

  const controller = new AbortController();

  root.addEventListener(
    'click',
    handleClick,
    { signal: controller.signal }
  );

  instances.set(root, controller);
}

function destroySection(section) {
  const root = section.querySelector(
    '[data-custom-widget]'
  );

  if (!root) return;

  const controller = instances.get(root);

  if (!controller) return;

  controller.abort();
  instances.delete(root);
}

function handleClick(event) {
  // 自定义交互
}
```

然后监听 Shopify 编辑器事件：

```js
document.addEventListener(
  'shopify:section:load',
  (event) => {
    initSection(event.target);
  }
);

document.addEventListener(
  'shopify:section:unload',
  (event) => {
    destroySection(event.target);
  }
);
```

注意，上面只展示了编辑器生命周期，普通商店初次加载仍需要执行一次：

```js
document.addEventListener(
  'DOMContentLoaded',
  () => {
    document
      .querySelectorAll('.shopify-section')
      .forEach(initSection);
  }
);
```

如果脚本可能在 DOM 加载完成后才执行，还需要检查 `document.readyState`，不能完全依赖未来会发生一次 `DOMContentLoaded`。

这里使用：

```js
new WeakMap()
```

记录当前初始化过的元素。

使用：

```js
AbortController
```

统一清理绑定到 DOM 的事件监听器。

注意，这里的 AbortController 是用于移除事件监听器，与我们之前使用它取消 Fetch 请求，是同一个 API 的两种不同应用。

它并不能自动清理所有资源，例如定时器、第三方实例和 Pub/Sub 订阅，其他资源仍需要手动销毁。

---

## 九、动态 Section 中常见的五类资源泄漏

这一部分尤其适合你之后自己开发复杂 Theme 时参考。

| 资源 | 初始化方式 | 正确清理方式 |
|---|---|---|
| 事件监听器 | `addEventListener` | `removeEventListener` 或 AbortController |
| 定时器 | `setInterval` | `clearInterval` |
| IntersectionObserver | `observer.observe()` | `observer.disconnect()` |
| ResizeObserver | `observer.observe()` | `observer.disconnect()` |
| Pub/Sub 订阅 | `subscribe()` | 调用返回的 `unsubscribe()` |

还有 Fetch 请求。

例如组件发起请求：

```js
this.controller = new AbortController();

fetch(url, {
  signal: this.controller.signal
});
```

组件被删除时：

```js
disconnectedCallback() {
  this.controller?.abort();
}
```

为什么有必要？

因为 Section 可能已经被删除，但旧请求仍然在网络中。

如果请求回来后，继续试图更新已经失效的 DOM，轻则产生无意义的工作，重则引发错误。

所以，一个成熟的组件应该尽量做到：

```text
connectedCallback
    ↓
创建所需资源
    ↓
正常交互
    ↓
disconnectedCallback
    ↓
释放所拥有的资源
```

如果组件可能反复连接，还应确保每次初始化不会累积旧状态。

---

## 十、Theme Editor 还有哪些特殊环境？

除了：

```js
Shopify.designMode
```

Shopify 还有以下环境变量：

| Liquid | JavaScript | 用途 |
|---|---|---|
| `request.design_mode` | `Shopify.designMode` | 判断是否处于 Theme Editor |
| — | `Shopify.inspectMode` | 判断预览检查器是否启用 |
| `request.visual_preview_mode` | `Shopify.visualPreviewMode` | 判断是否处于可视化预览模式 |

例如：

```liquid
{% if request.visual_preview_mode %}
  <!-- 可视化预览所需的内容 -->
{% endif %}
```

官方文档对这几个状态进行了区分。

不过我想强调：

**不要因为处于 Theme Editor，就让商家看到一套与真实店铺完全不同的页面。**

编辑器预览的价值正是尽可能接近真实商店。

只有当某种行为会阻碍编辑、产生不必要的追踪数据，或者需要让被选中的内容保持可见时，才需要针对编辑器额外处理。

---

## 十一、动手实验：用 DevTools 观察编辑器的真实生命周期

建议你打开 Shopify Admin → Online Store → Themes → Customize。

然后在预览页面对应的 DevTools Console 中执行：

```js
[
  'shopify:section:load',
  'shopify:section:unload',
  'shopify:section:select',
  'shopify:section:deselect',
  'shopify:section:reorder',
  'shopify:block:select',
  'shopify:block:deselect'
].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (event) => {
      console.log(
        event.type,
        event.detail,
        event.target
      );
    }
  );
});
```

然后依次进行这些操作：

1. 添加一个新的 Slideshow Section。
2. 修改它的标题或其他设置。
3. 选择某张 Slide。
4. 取消选择。
5. 调整 Slide 顺序。
6. 删除整个 Slideshow Section。

重点观察：

| 操作 | 预期事件 |
|---|---|
| 添加 Section | `shopify:section:load` |
| 修改 Section 设置 | `unload`、`load`，具体行为随编辑操作变化 |
| 选择 Slide | `shopify:block:select` |
| 取消选择 | `shopify:block:deselect` |
| 调整 Section 顺序 | `shopify:section:reorder` |
| 删除 Section | `shopify:section:unload` |

再去 `assets/theme-editor.js` 对应事件回调处打断点。

你应该能观察到 Dawn 如何让轮播停止、滚动到目标 Slide，以及如何在编辑器结构变化时关闭商品媒体弹窗。

这些操作比只阅读源码更能帮助你理解整个机制。

---

## 十二、本课总结

这节课最重要的不是记住几个事件名称，而是建立三个工程思维。

**第一：Section 的 HTML 可以在不刷新页面的情况下被替换。**

所以不能假设所有组件只需要初始化一次。

**第二：组件初始化和销毁必须成对设计。**

例如 `connectedCallback` / `disconnectedCallback`，或者 `initSection` / `destroySection`。

**第三：Theme Editor 的用户操作和普通商城用户操作不完全相同。**

例如编辑器选择 Slide 时，应该暂停轮播并将当前 Slide 显示出来，而不是继续自动播放。

### 本课自测

{@body const qs=[{q:"Theme Editor 中修改 Section 后，为什么只依赖 DOMContentLoaded 初始化组件不可靠？",opts:["因为 Liquid 不支持 JavaScript","因为 Section 可以局部重渲染，而 DOMContentLoaded 不会再次触发","因为编辑器禁止所有 JS"],a:1,why:"Shopify 编辑器可以动态替换 Section HTML，因此需要处理新组件的初始化。"},{"q":"block.shopify_attributes 的主要作用是什么？",opts:["让 Shopify 编辑器识别对应 Block DOM 元素","让商品价格自动刷新","将 Block 的所有 settings 序列化为 JSON"],a:0,why:"它输出编辑器识别 Block 所需的数据属性，普通 storefront 环境不会输出这些属性。"},{"q":"如果使用 Web Components，Section 被替换后应该重点依靠哪些生命周期方法？",opts:["DOMContentLoaded 和 window.onload","connectedCallback 和 disconnectedCallback","click 和 submit"],a:1,why:"新元素连接到 DOM 时可自动初始化，旧元素断开时可以进行资源清理。"},{"q":"Dawn 的 Slideshow 为什么在 shopify:block:select 时暂停自动播放？",opts:["为了减少 Shopify API 请求","为了让正在编辑的 Slide 保持可见","为了永久禁用轮播"],a:1,why:"商家选中的 Block 应该保持可见，避免自动轮播切换走正在编辑的内容。"}]}
{@body const [ans,setAns]=DIL.useState({})}
{@body const [checked,setChecked]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row align="center" justify="between">
    **第 15 课知识检查**
    <text color="secondary" size="xs">{Object.keys(ans).length}/4 已完成</text>
  </row>
  {#each qs as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={ans[i]===undefined?"":String(ans[i])} disabled={checked} onChange={v=>setAns(p=>({...p,[i]:Number(v)}))}>
        {#each q.opts as o,j}
          <radio value={String(j)}>{o}</radio>
        {/each}
      </radio-group>
      {#if checked}
        <row gap={2} align="start">
          <icon name={ans[i]===q.a?"check-circle":"x-circle"} color={ans[i]===q.a?"success":"danger"}/>
          <box flex="1" gap={1}>
            <text weight="medium" size="sm">{ans[i]===q.a?"正确":`正确答案：${q.opts[q.a]}`}</text>
            <text color="secondary" size="sm">{q.why}</text>
          </box>
        </row>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if checked}
    **得分：{qs.filter((q,i)=>ans[i]===q.a).length}/4**
    <button block color="secondary" variant="outline" onClick={()=>{setAns({});setChecked(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(ans).length!==4} onClick={()=>setChecked(true)}>提交答案</button>
  {/if}
</box>

## 参考资料

- [Integrate sections and blocks with the theme editor](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Theme editor best practices](https://shopify.dev/docs/storefronts/themes/best-practices/editor)
- [Liquid objects: block](https://shopify.dev/docs/api/liquid/objects/block)
- [Use the Section Rendering API for dynamic updates](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [The theme editor](https://shopify.dev/docs/storefronts/themes/tools/online-editor)
- [Theme architecture](https://shopify.dev/docs/storefronts/themes/architecture)
- [Sections best practices](https://shopify.dev/docs/storefronts/themes/architecture/sections/best-practices)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Render essential content in Liquid and HTML, not JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/render-essential-content-server-side)
- [Building with sections and blocks](https://shopify.dev/docs/storefronts/themes/best-practices/templates-sections-blocks)
