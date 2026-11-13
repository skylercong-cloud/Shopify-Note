# ProductForm 与 CartDrawer：从点击加购到购物车抽屉更新


前面三课，我们已经把商品详情页的核心链路打通了：

- 第 1 课：`main-product.liquid`，商品详情页如何组装。
- 第 2 课：`product-variant-picker.liquid`，用户如何选择 Variant。
- 第 3 课：`product-info.js`，如何通过 Section Rendering 更新商品信息。

今天我们继续沿着用户的购买行为往下走。

假设用户正在浏览一件 T 恤：

```text
商品：Classic T-Shirt

Color: Black
Size: M
Quantity: 2

用户点击：Add to Cart
```

我们要研究的是：

**点击按钮之后，Dawn 如何将商品提交给 Shopify、处理加购结果、更新购物车数据，并最终打开 Cart Drawer？**

今天会涉及五个核心文件：

| 文件 | 职责 |
|---|---|
| `snippets/buy-buttons.liquid` | 输出商品购买表单 |
| `assets/product-form.js` | 拦截表单提交、执行 Ajax 加购 |
| `sections/cart-drawer.liquid` | 购物车抽屉 Section 入口 |
| `snippets/cart-drawer.liquid` | 购物车抽屉 HTML |
| `assets/cart-drawer.js` | 购物车抽屉交互与内容更新 |
| `assets/cart.js` | 购物车商品数量修改、删除和事件订阅 |

源码以 Shopify Dawn 官方仓库当前 `main` 分支为研究对象：

<Link url="https://github.com/Shopify/dawn" title="Shopify / Dawn"/>

---

## 一、先看整个加购流程

先建立一个全局认知。

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Dawn 加购完整执行链</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **用户点击 Add to Cart**
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **buy-buttons.liquid**
    <text color="secondary" size="xs">生成 product form</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **product-form.js**
    <text color="secondary" size="xs">拦截 submit，构造 FormData</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify Cart Ajax API**
    <text color="secondary" size="xs">POST /cart/add.js</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **Shopify 返回加购结果**
    <text color="secondary" size="xs">商品行数据 + 请求的 Section HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **cart-drawer.js**
    <text color="secondary" size="xs">renderContents() 更新购物车 DOM</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **CartDrawer.open()**
    <text color="secondary" size="xs">打开抽屉、动画、焦点管理</text>
  </box>
</box>

这里有一个需要特别注意的设计：

Dawn 并没有自己维护一份完整的购物车业务数据，再用 JavaScript 计算商品总价、折扣、税费等。

它主要依赖 Shopify 的 Cart API 和 Liquid 服务端渲染结果。

这和我们上一课研究的 Variant 更新机制是一脉相承的。

---

## 二、第一步：buy-buttons.liquid 如何输出购买表单？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/buy-buttons.liquid" title="snippets/buy-buttons.liquid"/>

找到：

```liquid
<product-form
  class="product-form"
  data-hide-errors="{{ gift_card_recipient_feature_active }}"
  data-section-id="{{ section.id }}"
>
```

你会发现，这里又出现了一个 Custom Element：

```html
<product-form>
```

它对应：

```js
customElements.define(
  'product-form',
  class ProductForm extends HTMLElement {
    // ...
  }
);
```

所以我们已经见过三个重要的 Web Component：

| Custom Element | 职责 |
|---|---|
| `product-info` | 商品信息管理 |
| `variant-selects` | 商品选项选择 |
| `product-form` | 商品购买表单 |

Dawn 通过这种方式把不同业务职责拆分成独立组件。

### 1. 真正的表单在哪里？

继续看：

```liquid
{%- form 'product',
  product,
  id: product_form_id,
  class: 'form',
  novalidate: 'novalidate',
  data-type: 'add-to-cart-form'
-%}
```

这是 Shopify Liquid 的原生 Form Tag。

它最终会生成一个 HTML `<form>`。

核心内容：

```liquid
<input
  type="hidden"
  name="id"
  value="{{ product.selected_or_first_available_variant.id }}"
  class="product-variant-id"
>
```

这里的 `name="id"` 非常重要。

它代表要加入购物车的 Variant ID。

例如：

```html
<input
  type="hidden"
  name="id"
  value="123456789"
>
```

当用户选择新 Variant 时，上一课的 `product-info.js` 会更新这个隐藏输入框。

所以加购时，ProductForm 不需要重新计算 Variant ID，只需要读取表单中的最新值。

### 2. 为什么这里使用原生 Form？

你可能还记得我们之前讨论过：

Shopify 是否提供现成的加购表单？

答案是肯定的。

```liquid
{% form 'product', product %}
```

Shopify 会生成符合商品购买流程要求的表单结构。

Dawn 再通过 JavaScript 拦截提交行为，实现 Ajax 加购。

这是一种非常值得借鉴的方式：

- HTML Form 负责表达提交数据。
- Liquid 负责输出服务端数据。
- JavaScript 负责增强交互。
- Shopify Cart API 负责实际修改购物车。

### 3. FormData 不只是 Variant ID 和数量

接下来是一个很重要的知识点。

Dawn 并没有手动构造：

```js
{
  id: variantId,
  quantity: quantity
}
```

而是：

```js
const formData = new FormData(this.form);
```

这意味着它会收集表单中符合规则的表单控件。

除了：

```text
id
quantity
```

还可能包含：

```text
properties[Custom Name]
properties[Custom Message]
selling_plan
gift_card_recipient[email]
gift_card_recipient[name]
```

这就意味着 Dawn 的 ProductForm 可以兼容：

- 商品自定义属性。
- 订阅购买。
- 礼品卡收件人信息。
- 其他通过表单传递的购买参数。

这也是为什么我们不应该在自定义 Theme 中轻易抛弃原生 Product Form。

---

## 三、第二步：product-form.js 如何拦截提交？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/product-form.js" title="assets/product-form.js"/>

找到构造函数：

```js
constructor() {
  super();

  this.form = this.querySelector('form');

  this.variantIdInput.disabled = false;

  this.form.addEventListener(
    'submit',
    this.onSubmitHandler.bind(this)
  );

  this.cart =
    document.querySelector('cart-notification') ||
    document.querySelector('cart-drawer');

  this.submitButton =
    this.querySelector('[type="submit"]');

  this.submitButtonText =
    this.submitButton.querySelector('span');

  if (document.querySelector('cart-drawer')) {
    this.submitButton.setAttribute(
      'aria-haspopup',
      'dialog'
    );
  }

  this.hideErrors =
    this.dataset.hideErrors === 'true';
}
```

这里有几个值得注意的设计。

#### 1. 为什么监听 form 的 submit，而不是 button 的 click？

```js
this.form.addEventListener(
  'submit',
  this.onSubmitHandler.bind(this)
);
```

因为表单提交可能来自：

- 点击提交按钮。
- 用户按 Enter。
- 其他程序调用表单提交。

监听 `submit` 比监听某个按钮的 `click` 更完整。

这也是原生 HTML Form 的优势。

#### 2. 为什么要将 variantIdInput.disabled 设置为 false？

```js
this.variantIdInput.disabled = false;
```

因为 HTML 中被禁用的表单控件不会被 `FormData` 收集。

Dawn 需要确保 Variant ID 输入框可以进入提交数据。

至于当前 Variant 是否可购买，仍然通过购买按钮的禁用状态等逻辑进行控制。

#### 3. 为什么要查找 cart-drawer 或 cart-notification？

```js
this.cart =
  document.querySelector('cart-notification') ||
  document.querySelector('cart-drawer');
```

因为 Dawn 支持不同的加购反馈 UI。

- Cart Drawer：侧边购物车抽屉。
- Cart Notification：加购成功通知。

两者都提供类似的接口，例如：

```js
getSectionsToRender()
renderContents()
setActiveElement()
```

这意味着 ProductForm 不需要关心具体采用哪一种购物车 UI。

它只需要知道当前的购物车展示组件。

这是一种非常典型的面向接口编程思想。

---

## 四、第三步：真正执行 Ajax 加购

进入：

```js
onSubmitHandler(evt) {
  evt.preventDefault();

  if (
    this.submitButton.getAttribute('aria-disabled') === 'true'
  ) return;

  this.handleErrorMessage();

  this.submitButton.setAttribute('aria-disabled', true);
  this.submitButton.classList.add('loading');

  this.querySelector('.loading__spinner')
    .classList.remove('hidden');

  // ...
}
```

### 1. 为什么 preventDefault？

```js
evt.preventDefault();
```

正常情况下，浏览器提交表单后会导航到表单 action 对应的 URL。

但 Dawn 想要的是：

```text
点击加购
  ↓
发送 Ajax 请求
  ↓
更新购物车
  ↓
留在当前商品页面
```

因此必须阻止浏览器默认提交行为。

### 2. 为什么要设置 Loading 状态？

```js
this.submitButton.setAttribute('aria-disabled', true);
this.submitButton.classList.add('loading');

this.querySelector('.loading__spinner')
  .classList.remove('hidden');
```

主要有三个目的：

1. 告诉用户请求正在处理。
2. 防止重复提交。
3. 提供辅助技术可识别的交互状态。

这里有一个小细节：

`aria-disabled` 是无障碍语义属性，不等同于 HTML 原生的 `disabled`。

Dawn 在自己的提交处理函数中也检查了它。

### 3. 构造请求配置

```js
const config = fetchConfig('javascript');

config.headers['X-Requested-With'] =
  'XMLHttpRequest';

delete config.headers['Content-Type'];
```

这里为什么删除 Content-Type？

因为接下来使用：

```js
config.body = formData;
```

浏览器会自动生成：

```http
Content-Type: multipart/form-data; boundary=...
```

如果手动指定一个不带正确 boundary 的 Content-Type，服务器可能无法正确解析 FormData。

所以让浏览器自动处理更合适。

### 4. 构造完整请求数据

```js
const formData = new FormData(this.form);
```

接下来：

```js
if (this.cart) {
  formData.append(
    'sections',
    this.cart
      .getSectionsToRender()
      .map((section) => section.id)
  );

  formData.append(
    'sections_url',
    window.location.pathname
  );

  this.cart.setActiveElement(
    document.activeElement
  );
}
```

这段代码非常重要。

我们前面已经学过 Section Rendering API，现在它再次出现。

假设 Cart Drawer 的：

```js
getSectionsToRender() {
  return [
    {
      id: 'cart-drawer',
      selector: '#CartDrawer',
    },
    {
      id: 'cart-icon-bubble',
    },
  ];
}
```

那么：

```js
.map((section) => section.id)
```

得到：

```js
[
  'cart-drawer',
  'cart-icon-bubble'
]
```

最终传递给 Shopify：

```text
sections=cart-drawer,cart-icon-bubble

sections_url=/products/classic-t-shirt
```

这就是上一课讲的 Bundled Section Rendering。

注意两个参数的区别：

- `sections`：告诉 Shopify 需要重新渲染哪些 Section。
- `sections_url`：告诉 Shopify 使用哪个页面上下文来渲染这些 Section。

还有：

```js
this.cart.setActiveElement(
  document.activeElement
);
```

这是为了记录用户触发加购的元素。

后续关闭 Cart Drawer 时，可以将焦点还给原来的元素。

这是无障碍交互中很重要的设计。

## 五、第四步：向 Shopify 发送真正的加购请求

继续看 `product-form.js`：

```js
config.body = formData;

const variantId = formData.get('id');
const quantity = parseInt(formData.get('quantity')) || 1;

fetch(`${routes.cart_add_url}`, config)
  .then((response) => response.json())
  .then((response) => {
    // ...
  });
```

这里：

```js
routes.cart_add_url
```

对应 Shopify 的 Ajax Cart API 加购地址，通常是：

```text
/cart/add.js
```

最终请求可以理解为：

```http
POST /cart/add.js
Content-Type: multipart/form-data
X-Requested-With: XMLHttpRequest
```

请求数据：

```text
id=123456789
quantity=2
sections=cart-drawer,cart-icon-bubble
sections_url=/products/classic-t-shirt
```

Shopify 收到请求后，会完成真正的购物车修改。

### 1. Shopify 返回什么？

假设加购成功，返回数据可以概念化为：

```json
{
  "id": 123456789,
  "quantity": 2,
  "variant_id": 123456789,
  "product_id": 987654321,
  "title": "Classic T-Shirt",
  "price": 12900,
  "sections": {
    "cart-drawer": "<div>...</div>",
    "cart-icon-bubble": "<div>...</div>"
  }
}
```

这里是简化示意，不是完整的真实响应结构。

特别注意：

`/cart/add.js` 返回的主体通常是本次添加的商品行数据，而不是完整的购物车对象。

`sections` 则是根据请求参数额外返回的 Section HTML。

官方文档：

<Link url="https://shopify.dev/docs/api/ajax/reference/cart" title="Ajax Cart API - Add to cart"/>

### 2. 加购失败怎么处理？

Dawn 不是简单地认为 HTTP 请求成功就代表加购成功。

它还会检查：

```js
if (response.status) {
  publish(PUB_SUB_EVENTS.cartError, {
    source: 'product-form',
    productVariantId: variantId,
    errors: response.errors || response.description,
    message: response.message,
  });

  this.handleErrorMessage(response.description);

  this.dispatchCartErrorEvent(
    response.description || response.message,
    'INVALID'
  );

  // ...
}
```

这里的 `response.status` 是 Shopify 返回的业务错误状态字段，不是 HTTP Response 的 `status` 属性。

例如：

- 商品库存不足。
- Variant 不可购买。
- 数量不符合购买规则。
- 商品购买条件不满足。

Dawn 会将错误展示给用户，而不是直接刷新页面。

还有一个细节：

```js
this.dispatchCartErrorEvent(...)
```

除了更新当前页面的错误提示，还会发布标准化的购物车错误事件，供其他集成监听。

### 3. 如果没有 Cart Drawer 呢？

源码：

```js
} else if (!this.cart) {
  this.resolveCartLinesUpdate(linesUpdateDeferred);
  window.location = window.routes.cart_url;
  return;
}
```

这意味着：

如果页面没有配置 Cart Drawer 或 Cart Notification，那么加购成功后就直接跳转购物车页面。

所以 ProductForm 并不强依赖某一种购物车 UI。

---

## 六、第五步：为什么加购成功后还要 publish cartUpdate？

继续看成功分支：

```js
publish(PUB_SUB_EVENTS.cartUpdate, {
  source: 'product-form',
  productVariantId: variantId,
  cartData: response,
});
```

这个事件非常重要。

因为购物车发生变化，不只是 Cart Drawer 需要知道。

其他组件也可能需要响应：

- Header 购物车数量。
- 购物车页面。
- 购物车相关扩展。
- 其他依赖购物车状态的组件。

Dawn 使用发布订阅模式，避免 ProductForm 直接依赖所有这些组件。

你可以把它理解成：

```text
ProductForm
    │
    │ publish cartUpdate
    ▼
   事件总线
    │
    ├── CartItems
    │
    ├── 其他购物车订阅者
    │
    └── 其他扩展组件
```

但这里有一个值得注意的源码细节。

当前 Dawn `main` 分支的 `assets/cart.js` 中，`CartItems` 也订阅了 `cartUpdate`：

```js
connectedCallback() {
  super.connectedCallback();

  this.cartUpdateUnsubscriber = subscribe(
    PUB_SUB_EVENTS.cartUpdate,
    (event) => {
      if (event.source === 'cart-items') return;

      return this.onCartUpdate();
    }
  );
}
```

当事件来源不是 `cart-items` 时，它会调用：

```js
this.onCartUpdate();
```

对于购物车抽屉，这个方法还可能发起一次：

```js
fetch(`${routes.cart_url}?section_id=cart-drawer`)
```

这意味着一个很容易忽略的情况：

**虽然 Bundled Section Rendering 已经能让 `/cart/add.js` 返回购物车抽屉 HTML，但当前源码还有事件订阅触发的额外刷新路径。**

因此不能仅凭使用了 Bundled Section Rendering，就断言整个加购流程一定只有一个网络请求。

实际开发时，要结合具体 Dawn 版本和 Network 面板判断。

这个细节也说明：阅读成熟开源项目时，不能只看单个函数，必须追踪事件订阅者。

---

## 七、第六步：CartDrawer 如何更新内容？

现在进入真正的购物车抽屉组件。

先看 Section 入口：

<Link url="https://github.com/Shopify/dawn/blob/main/sections/cart-drawer.liquid" title="sections/cart-drawer.liquid"/>

它实际上非常简单：

```liquid
{% render 'cart-drawer' %}
```

真正的 HTML 在：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/cart-drawer.liquid" title="snippets/cart-drawer.liquid"/>

我们来看它的结构。

### 1. Cart Drawer 的 DOM 结构

源码中：

```liquid
<cart-drawer
  class="drawer{% if cart == empty %} is-empty{% endif %}"
>
  <div id="CartDrawer" class="cart-drawer">

    <div id="CartDrawer-Overlay"></div>

    <div class="drawer__inner">

      <div class="drawer__header">
        ...
      </div>

      <cart-drawer-items>

        <form id="CartDrawer-Form">
          ...
        </form>

      </cart-drawer-items>

      <div class="drawer__footer">
        ...
      </div>

    </div>
  </div>
</cart-drawer>
```

这里又出现了两个 Custom Element：

```html
<cart-drawer>
<cart-drawer-items>
```

对应的职责不同：

| 组件 | 职责 |
|---|---|
| `cart-drawer` | 抽屉打开、关闭、遮罩、焦点管理 |
| `cart-drawer-items` | 购物车商品列表、数量修改、删除 |

你可以把它们理解为：

- CartDrawer 是容器组件。
- CartDrawerItems 是业务数据交互组件。

这是一种很清晰的职责划分。

### 2. cart-drawer.js 如何获得加购结果？

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/cart-drawer.js" title="assets/cart-drawer.js"/>

找到：

```js
renderContents(parsedState) {
  this.querySelector('.drawer__inner').classList.contains('is-empty') &&
    this.querySelector('.drawer__inner').classList.remove('is-empty');

  this.productId = parsedState.id;

  this.getSectionsToRender().forEach((section) => {
    const sectionElement = section.selector
      ? document.querySelector(section.selector)
      : document.getElementById(section.id);

    if (!sectionElement) return;

    sectionElement.innerHTML = this.getSectionInnerHTML(
      parsedState.sections[section.id],
      section.selector
    );
  });

  setTimeout(() => {
    this.querySelector('#CartDrawer-Overlay')
      .addEventListener('click', this.close.bind(this));

    this.open();
  });
}
```

这是整个 Cart Drawer 更新的核心。

我们逐段看。

#### 第一步：确定需要更新哪些 Section

```js
getSectionsToRender() {
  return [
    {
      id: 'cart-drawer',
      selector: '#CartDrawer',
    },
    {
      id: 'cart-icon-bubble',
    },
  ];
}
```

这意味着加购成功后，需要更新两个区域：

<grid columns={2} gap={2}>
  <grid-item>
    <box border radius="lg" padding={2} gap={2}>
      <LessonImage src="assets/fill/img-22.jpg" alt="ecommerce website slide out shopping cart drawer UI white background"/>
      **Cart Drawer**
      <text color="secondary" size="xs">商品列表、数量、总价、结算按钮</text>
    </box>
  </grid-item>
  <grid-item>
    <box border radius="lg" padding={2} gap={2}>
      <LessonImage src="assets/fill/img-23.jpg" alt="minimal ecommerce header shopping cart icon with quantity badge"/>
      **Cart Icon Bubble**
      <text color="secondary" size="xs">Header 中的购物车数量</text>
    </box>
  </grid-item>
</grid>

这里有一个值得注意的设计：

Cart Drawer 和 Header 的购物车数量不是通过 JavaScript 分别计算出来的，而是分别请求 Shopify 重新渲染对应 Section。

这样，数量、折扣、总价等展示都可以使用 Shopify Liquid 的真实购物车数据。

#### 第二步：找到当前页面需要更新的 DOM

```js
const sectionElement = section.selector
  ? document.querySelector(section.selector)
  : document.getElementById(section.id);
```

例如：

```js
{
  id: 'cart-drawer',
  selector: '#CartDrawer'
}
```

得到：

```js
document.querySelector('#CartDrawer');
```

而：

```js
{
  id: 'cart-icon-bubble'
}
```

得到：

```js
document.getElementById('cart-icon-bubble');
```

这里的 `selector` 是当前浏览器中要更新的目标元素，不是 Shopify 的 Section ID。

#### 第三步：解析 Shopify 返回的 HTML

```js
getSectionInnerHTML(
  html,
  selector = '.shopify-section'
) {
  return new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector(selector)
    .innerHTML;
}
```

这段代码和上一课讲的 DOMParser 完全一致。

例如 Shopify 返回：

```html
<div id="shopify-section-cart-drawer">

  <div id="CartDrawer">

    <div class="drawer__inner">
      <!-- 最新购物车内容 -->
    </div>

  </div>

</div>
```

Dawn 通过：

```js
getSectionInnerHTML(
  html,
  '#CartDrawer'
);
```

得到的是：

```html
<div class="drawer__inner">
  <!-- 最新购物车内容 -->
</div>
```

#### 第四步：更新 DOM

```js
sectionElement.innerHTML = this.getSectionInnerHTML(
  parsedState.sections[section.id],
  section.selector
);
```

这里最终只替换目标节点内部的 HTML。

注意：

它没有替换最外层的：

```html
<cart-drawer>
```

所以 `CartDrawer` 这个 Web Component 实例仍然存在。

但是它内部的部分 DOM 被重新创建了。

这也意味着，内部依赖直接 DOM 事件监听的元素，需要考虑重新绑定事件。

Dawn 就在下面处理了这个问题。

---

## 八、第七步：CartDrawer 如何打开？

当内容更新完毕：

```js
setTimeout(() => {
  this.querySelector('#CartDrawer-Overlay')
    .addEventListener(
      'click',
      this.close.bind(this)
    );

  this.open();
});
```

这里为什么重新给 Overlay 绑定事件？

因为刚才 `renderContents()` 已经替换了 `#CartDrawer` 的内部 HTML。

原来的 Overlay DOM 节点已经被替换，新 Overlay 必须重新绑定点击事件。

接下来进入：

```js
open(triggeredBy) {
  if (this.classList.contains('active')) return;

  if (triggeredBy) {
    this.setActiveElement(triggeredBy);
  }

  // ...

  setTimeout(() => {
    this.classList.add('animate', 'active');
  });

  // ...

  document.body.classList.add('overflow-hidden');
}
```

主要做三件事：

1. 添加 `active` 和 `animate`，触发 CSS 动画。
2. 锁定页面滚动。
3. 管理焦点，保证用户在抽屉中正常操作。

### 1. 为什么还要管理焦点？

继续看：

```js
this.addEventListener(
  'transitionend',
  () => {
    const containerToTrapFocusOn =
      this.classList.contains('is-empty')
        ? this.querySelector('.drawer__inner-empty')
        : document.getElementById('CartDrawer');

    const focusElement =
      this.querySelector('.drawer__inner') ||
      this.querySelector('.drawer__close');

    trapFocus(
      containerToTrapFocusOn,
      focusElement
    );
  },
  { once: true }
);
```

`trapFocus()` 是 Dawn 的一个无障碍工具。

它的作用是：

当购物车抽屉打开时，用户按 Tab 键，只能在抽屉内部的可聚焦元素之间移动。

不能让焦点跑到被遮挡的页面内容中。

关闭时：

```js
close() {
  this.classList.remove('active');

  removeTrapFocus(this.activeElement);

  document.body.classList.remove('overflow-hidden');
}
```

恢复焦点，并解除页面滚动锁定。

这也是为什么加购之前，`product-form.js` 会执行：

```js
this.cart.setActiveElement(
  document.activeElement
);
```

整个交互就形成了一个闭环：

```text
用户点击加购按钮
       ↓
记录当前焦点元素
       ↓
打开 Cart Drawer
       ↓
将焦点限制在抽屉中
       ↓
用户关闭抽屉
       ↓
恢复之前的焦点
```

这里可以看出，Dawn 不仅关注功能能否实现，还考虑了键盘用户和辅助技术用户的体验。

---

## 九、第八步：购物车中的数量修改和删除是如何实现的？

到这里，我们已经完成了：

```text
商品详情页
    ↓
Add to Cart
    ↓
Cart API
    ↓
Cart Drawer 更新
    ↓
Cart Drawer 打开
```

但是购物车抽屉不是静态展示。

用户还可以：

- 增加商品数量。
- 减少商品数量。
- 删除商品。

这部分不是 `product-form.js` 负责的，而是：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/cart.js" title="assets/cart.js"/>

其中的：

```js
class CartItems extends HTMLElement
```

在当前 Dawn 代码中，`CartItems` 通过标准事件相关的基类创建，但我们先聚焦业务逻辑。

### 1. 为什么数量修改使用 debounce？

构造函数：

```js
this.debouncedOnChange = debounce(
  (event) => {
    this.onChange(event);
  },
  ON_CHANGE_DEBOUNCE_TIMER
);

this.addEventListener(
  'change',
  this.debouncedOnChange
);
```

假设用户快速输入：

```text
1 → 12 → 123
```

如果每次输入都请求 Shopify：

```text
请求 A：quantity = 1
请求 B：quantity = 12
请求 C：quantity = 123
```

就会产生大量不必要的请求。

所以 Dawn 使用 debounce。

它会等待用户停止输入一段时间，再执行真正的更新。

这与我们之前学习的 Variant 请求竞争问题有关，但解决的问题不同：

| 技术 | 主要目的 |
|---|---|
| debounce | 减少高频操作产生的请求 |
| AbortController | 取消已经发出的过期请求 |

### 2. 数量更新调用哪个 API？

源码：

```js
const body = JSON.stringify({
  line,
  quantity,
  sections: sectionsToRender.map(
    (section) => section.section
  ),
  sections_url: window.location.pathname,
});
```

然后：

```js
fetch(
  `${routes.cart_change_url}`,
  {
    ...fetchConfig(),
    body,
  }
);
```

对应 Shopify Ajax Cart API：

```text
POST /cart/change.js
```

它负责修改购物车某一行商品的数量。

例如：

```json
{
  "line": 1,
  "quantity": 3,
  "sections": [
    "cart-drawer",
    "cart-icon-bubble"
  ],
  "sections_url": "/products/classic-t-shirt"
}
```

注意这里的 `line` 和 `quantity`：

- `line`：购物车中商品行的位置。
- `quantity`：修改后的目标数量，不是增加多少。

例如原来数量为 2，现在希望变成 5：

```json
{
  "line": 1,
  "quantity": 5
}
```

而不是：

```json
{
  "line": 1,
  "quantity": 3
}
```

后者会把数量修改成 3，而不是增加 3 件。

### 3. 为什么还要传 sections？

因为修改数量之后：

- 商品小计需要更新。
- 购物车总价需要更新。
- 折扣金额可能变化。
- Header 数量需要更新。
- 商品数量规则提示可能变化。

所以 Dawn 仍然使用 Bundled Section Rendering。

不过这里有一个很有意思的细节。

`CartDrawerItems` 继承了 `CartItems`，它重写了：

```js
getSectionsToRender() {
  return [
    {
      id: 'CartDrawer',
      section: 'cart-drawer',
      selector: '.drawer__inner',
    },
    {
      id: 'cart-icon-bubble',
      section: 'cart-icon-bubble',
      selector: '.shopify-section',
    },
  ];
}
```

你会发现它同时存在：

```js
id
section
selector
```

它们分别表示：

| 属性 | 含义 |
|---|---|
| `id` | 当前页面中目标 DOM 的 ID |
| `section` | Shopify 服务端 Section 的 ID |
| `selector` | 从返回 HTML 中提取哪个节点 |

例如：

```js
{
  id: 'CartDrawer',
  section: 'cart-drawer',
  selector: '.drawer__inner'
}
```

这意味着：

- 请求 Shopify 的 `cart-drawer` Section。
- 从响应中找到 `.drawer__inner`。
- 更新当前页面中 `#CartDrawer` 内部的 `.drawer__inner`。

**这里的 `id` 和 `section` 不一定相同。**

这是阅读 Dawn 源码时非常容易忽略的细节。

---

## 十、把整个购买流程串起来

现在我们可以画出 Dawn 商品购买的完整架构。

<box border radius="xl" padding={3} gap={2}>
  <title size="lg">Dawn 商品购买完整架构</title>
  <box background="surface-secondary" radius="md" padding={3}>
    **商品详情页**
    <text color="secondary" size="xs">main-product.liquid</text>
    <box background="surface" radius="md" padding={2} gap={1}>
      <text weight="medium" size="sm">variant-selects</text>
      <text color="secondary" size="xs">用户选择颜色、尺码</text>
    </box>
    <box background="surface" radius="md" padding={2} gap={1}>
      <text weight="medium" size="sm">product-info</text>
      <text color="secondary" size="xs">更新价格、库存、Variant ID</text>
    </box>
    <box background="surface" radius="md" padding={2} gap={1}>
      <text weight="medium" size="sm">product-form</text>
      <text color="secondary" size="xs">提交商品购买表单</text>
    </box>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
    <text size="xs" color="secondary">POST /cart/add.js</text>
  </box>
  <box border radius="md" padding={3}>
    **Shopify Cart API**
    <text color="secondary" size="xs">修改购物车，返回商品行数据和指定 Section HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    **购物车交互层**
    <box background="surface" radius="md" padding={2}>
      **cart-drawer.js**
      <text size="xs" color="secondary">更新抽屉和购物车数量图标</text>
    </box>
    <box background="surface" radius="md" padding={2}>
      **cart.js**
      <text size="xs" color="secondary">数量修改、删除、购物车事件</text>
    </box>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **最终 UI**
    <text color="secondary" size="xs">购物车抽屉打开，显示最新商品、数量和总价</text>
  </box>
</box>

---

## 十一、从工程设计角度总结 Dawn 的几个优秀设计



| 设计 | 解决的问题 |
|---|---|
| 原生 Product Form | 统一收集购买参数 |
| Custom Element | 购买逻辑组件化 |
| FormData | 避免手动拼装复杂表单数据 |
| Ajax Cart API | 不刷新页面完成购物车修改 |
| Bundled Section Rendering | 一次购物车请求可以同时返回多个 UI 区域 |
| Pub/Sub | 解耦购物车更新的通知关系 |
| DOM 局部替换 | 避免整个页面重新渲染 |
| Debounce | 减少数量修改产生的高频请求 |
| Focus Management | 保证抽屉交互的可访问性 |

还有两个值得你以后自己开发 Theme 时注意的地方：

**第一，服务端负责业务数据，前端负责交互。**

价格、折扣、库存、购物车总价等，不要轻易在浏览器中自己维护一套计算规则。

**第二，组件之间不要互相强依赖。**

ProductForm 不需要知道 CartDrawer 内部有多少个商品行，也不需要知道总价如何计算。

它只需要调用购物车 UI 提供的接口。

这就是成熟 Theme 与简单 Liquid 页面之间很大的区别。

---

## 十二、本课源码阅读练习

建议你自己打开以下三个文件，尝试回答一个问题：

- [product-form.js](https://github.com/Shopify/dawn/blob/main/assets/product-form.js)
- [cart-drawer.js](https://github.com/Shopify/dawn/blob/main/assets/cart-drawer.js)
- [cart.js](https://github.com/Shopify/dawn/blob/main/assets/cart.js)

**假设用户点击加购后，Shopify 已经成功返回了 `cart-drawer` 和 `cart-icon-bubble` 两个 Section 的 HTML。**

为什么 Dawn 还需要 `cartUpdate` 发布订阅机制？

如果 ProductForm 已经能直接调用：

```js
this.cart.renderContents(response);
```

为什么还要通知其他组件？

这个问题实际上涉及一个非常重要的架构概念：

**命令式更新与事件驱动更新之间的区别。**
