# Product Card & Quick Add：商品卡片与快速加购机制


上一课研究了 Dawn 的 Product Recommendations，理解了 Shopify 如何生成推荐商品 HTML，以及 Dawn 如何通过 `IntersectionObserver` 实现异步加载。

今天我们进入一个非常重要的模块：**商品卡片（Product Card）和快速加购（Quick Add）**。

这部分值得深入研究，因为它会把我们之前学过的多个知识点串联起来：

- Liquid Snippet 组件化。
- Product Variant 数据模型。
- Web Components。
- 商品表单 ProductForm。
- Shopify Ajax Cart API。
- Section Rendering。
- Cart Drawer 动态更新。

先看一下我们要研究的实际交互。

### 一、先建立整体架构：商品卡片有三种 Quick Add 模式

Dawn 并不是所有商品卡片都使用同一种快速加购方式。

首先打开：

[sections/main-collection-product-grid.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-collection-product-grid.liquid)

在它的 Schema 中，可以看到：

```json
{
  "type": "select",
  "id": "quick_add",
  "default": "none",
  "options": [
    { "value": "none" },
    { "value": "standard" },
    { "value": "bulk" }
  ]
}
```

这意味着你可以在 Shopify Theme Editor 中配置商品列表的 Quick Add 行为。

<box border radius="lg" padding={3} gap={3}>
  **Dawn 的三种模式**
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-28.jpg" alt="minimal ecommerce product card sneakers with no add to cart button"/>
    <box flex="1" gap={1}>
      **None：不启用快速加购**
      <text color="secondary" size="sm">商品卡片只展示商品信息，用户需要进入商品详情页购买。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-29.jpg" alt="ecommerce product card sneaker with add to cart button UI"/>
    <box flex="1" gap={1}>
      **Standard：标准快速加购**
      <text color="secondary" size="sm">单 Variant 商品可以直接加购；多 Variant 商品先弹出商品选项窗口。</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-30.jpg" alt="ecommerce wholesale bulk order product quantity selector grid UI"/>
    <box flex="1" gap={1}>
      **Bulk：批量加购**
      <text color="secondary" size="sm">适合一次购买多个商品或多个 Variant 的场景，提供数量输入和批量更新购物车的能力。</text>
    </box>
  </row>
</box>

这三种模式最终都通过同一个商品卡片 Snippet 实现：

```liquid
{% render 'card-product',
  card_product: product,
  quick_add: section.settings.quick_add,
  section_id: section.id
%}
```

也就是说，`card-product.liquid` 并不关心自己是在 Collection 页面还是 Featured Collection 页面。

它只需要接收调用方传递的参数，然后决定生成什么样的 HTML。

这也是 Dawn 非常值得学习的组件化设计。

---

### 二、深入 card-product.liquid：商品卡片是怎么组织的？

源码：

[snippets/card-product.liquid](https://github.com/Shopify/dawn/blob/main/snippets/card-product.liquid)

我们先看它的整体结构：

```text
product-component
└── card-wrapper
    └── card
        ├── card__inner
        │   ├── card__media
        │   │   ├── 商品主图
        │   │   └── 商品第二张图片
        │   ├── card__content
        │   │   ├── 商品标题
        │   │   └── 商品 Badge
        │   └── ...
        │
        └── card__content
            ├── card__information
            │   ├── 商品标题
            │   ├── Vendor
            │   ├── Rating
            │   └── Price
            │
            ├── Quick Add
            │
            └── card__badge
```

其中有一个值得注意的自定义元素：

```html
<product-component
  view-event-payload="..."
>
  ...
</product-component>
```

它是 Dawn 用于商品浏览事件处理的组件。

这说明 Dawn 不只是把商品卡片当成一段静态 HTML，还将它作为商品交互和事件追踪的一个边界。

#### 1. 为什么 card-product 使用大量参数？

例如：

```liquid
{% render 'card-product',
  card_product: product,
  media_aspect_ratio: 'square',
  image_shape: 'default',
  show_secondary_image: true,
  show_vendor: false,
  show_rating: true,
  quick_add: 'standard',
  section_id: section.id
%}
```

这些参数实际上将商品数据与展示策略分离了。

例如：

同一个商品，在 Collection 页面可能是：

```liquid
show_vendor: true
show_rating: true
quick_add: 'standard'
```

而在推荐商品区域可能是：

```liquid
show_vendor: false
show_rating: false
quick_add: 'none'
```

商品数据完全相同，但展示行为不同。

#### 2. 商品图片 Hover 是怎么实现的？

源码中有这样一段：

```liquid
<div class="media media--transparent media--hover-effect">

  <img
    src="{{ card_product.featured_media | image_url: width: 533 }}"
    ...
  >

  {% if card_product.media[1] != null
    and show_secondary_image
  %}
    <img
      src="{{ card_product.media[1] | image_url: width: 533 }}"
      ...
    >
  {% endif %}

</div>
```

它实际上渲染了两张图片：

- 第一张：商品主图。
- 第二张：商品的第二个 Media。

通过 CSS 的 Hover 效果切换图片，而不是用户 Hover 时再去请求第二张图片。

这里的性能取舍是：

**提前在 DOM 中准备第二张图片，换取 Hover 时更加即时的交互。**

同时图片还使用：

```liquid
srcset="..."
sizes="..."
width="..."
height="..."
loading="lazy"
```

其中：

- `srcset`：提供不同尺寸的候选图片。
- `sizes`：告诉浏览器图片在当前布局中大概占多宽。
- `width`、`height`：帮助浏览器提前确定图片比例，减少 CLS。
- `loading="lazy"`：延迟加载非关键图片。

这部分与你之前学习的浏览器图片加载和关键渲染路径直接相关。

---

### 三、Standard Quick Add：先理解两种完全不同的加购路径

这是今天的重点。

打开 `card-product.liquid`，搜索：

```liquid
{% if quick_add == 'standard' %}
```

你会看到 Dawn 并没有直接执行加购，而是先判断：

```liquid
card_product.variants_count > 1 or qty_rules
```

其中：

`qty_rules` 表示商品存在数量规则，例如：

- 最小购买数量大于 1。
- 最大购买数量有限制。
- 购买数量必须满足指定增量。

所以 Standard 模式又分为两种情况。

<box border radius="lg" padding={3} gap={3}>
  **Standard Quick Add 判断流程**
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **用户点击商品卡片的 Quick Add**
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **商品是否有多个 Variant，或存在数量规则？**
  </box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box align="center" gap={2}>
        <badge color="success">是</badge>
        **打开 Quick Add Modal**
        <text color="secondary" size="xs" textAlign="center">加载商品详情，选择 Variant 和数量</text>
      </box>
    </grid-item>
    <grid-item>
      <box align="center" gap={2}>
        <badge color="info">否</badge>
        **直接提交 ProductForm**
        <text color="secondary" size="xs" textAlign="center">使用默认可购买 Variant 加购</text>
      </box>
    </grid-item>
  </grid>
</box>

我们分别研究。

#### 路径 A：单 Variant 商品，直接加购

假设商品：

```text
Basic T-Shirt

只有一个 Variant：
Black / M
```

没有特殊数量规则。

Dawn 会直接生成：

```liquid
<product-form data-section-id="{{ section.id }}">

  {% form 'product',
    card_product,
    id: product_form_id,
    class: 'form',
    data-type: 'add-to-cart-form'
  %}

    <input
      type="hidden"
      name="id"
      value="{{ card_product.selected_or_first_available_variant.id }}"
    >

    <button type="submit" name="add">
      Add to cart
    </button>

  {% endform %}

</product-form>
```

这里有几个非常重要的细节。

**第一：为什么直接使用 hidden input？**

因为只有一个 Variant，不需要让用户选择。

所以直接把：

```liquid
card_product.selected_or_first_available_variant.id
```

放入表单。

提交时，Shopify 就知道用户购买哪个 Variant。

**第二：为什么还是使用 product-form？**

注意这里：

```html
<product-form>
```

它不是原生 HTML 标签，而是 Dawn 自己定义的 Web Component。

它与商品详情页使用的 ProductForm 是同一个组件。

这就意味着：

商品详情页加购和商品卡片加购，可以复用同一套加购逻辑。

**第三：为什么不直接给按钮绑定 click 事件？**

因为 Dawn 选择保留标准的 HTML Form 语义：

```html
<form>
  <input name="id">
  <button type="submit">
</form>
```

再由 `product-form.js` 监听表单的 `submit` 事件。

这样既保留了表单的语义，也可以通过 JavaScript 实现 Ajax 加购。

这是非常值得借鉴的开发方式。

---

#### 路径 B：多 Variant 商品，打开 Quick Add Modal

假设商品：

```text
Running Shoes

Color:
  Black
  White

Size:
  39
  40
  41
  42
```

显然不能直接加购，因为用户还没有选择 Variant。

Dawn 生成的结构是：

```liquid
<modal-opener
  data-modal="#QuickAdd-{{ card_product.id }}"
>
  <button
    data-product-url="{{ card_product.url }}"
    aria-haspopup="dialog"
  >
    Choose options
  </button>
</modal-opener>

<quick-add-modal
  id="QuickAdd-{{ card_product.id }}"
  class="quick-add-modal"
>
  <div
    role="dialog"
    aria-modal="true"
  >
    <div
      id="QuickAddInfo-{{ card_product.id }}"
    ></div>
  </div>
</quick-add-modal>
```

注意：

**这里的 Modal 内容一开始是空的！**

只有：

```html
<div id="QuickAddInfo-..."></div>
```

没有商品标题、价格、Variant 选择器和购买表单。

为什么？

因为 Dawn 不希望在 Collection 页面初始化时，就把每个商品的完整详情都渲染到 DOM 中。

假设一个集合页有 48 个商品。

如果每个商品卡片都包含一套完整的商品详情、Variant 选择器、数量选择器和表单，那么页面 HTML 会非常臃肿。

所以 Dawn 采用了按需加载：

```text
页面初始化
    ↓
只渲染商品卡片和空 Modal
    ↓
用户点击 Choose options
    ↓
请求当前商品详情 HTML
    ↓
提取商品详情内容
    ↓
插入 Modal
    ↓
展示商品选项
```

这是一种很典型的延迟加载策略。

### 四、quick-add.js：Modal 是如何动态加载商品详情的？

现在进入 JavaScript。

源码：

[assets/quick-add.js](https://github.com/Shopify/dawn/blob/main/assets/quick-add.js)

首先看组件定义：

```js
if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      // ...
    }
  );
}
```

注意它继承了：

```js
ModalDialog
```

这个父类定义在：

```text
assets/global.js
```

也就是说，Dawn 已经有一个通用的 Modal 实现，QuickAddModal 只需要继承它，再增加商品详情的加载逻辑。

#### 1. ModalOpener 如何打开 Modal？

在 `global.js` 中：

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

      if (modal) modal.show(button);
    });
  }
}
```

当用户点击：

```html
<modal-opener data-modal="#QuickAdd-123">
  <button>Choose options</button>
</modal-opener>
```

它会找到：

```js
document.querySelector('#QuickAdd-123')
```

然后调用：

```js
modal.show(button);
```

这里有个非常重要的设计：

ModalOpener 不需要知道 Modal 里面展示什么内容。

它只负责打开指定的 Modal。

至于商品详情的加载，则交给 QuickAddModal 自己处理。

这就是职责分离。

#### 2. QuickAddModal.show() 才是真正的核心

看源码：

```js
show(opener) {
  opener.setAttribute('aria-disabled', true);
  opener.classList.add('loading');

  opener.querySelector(
    '.loading__spinner'
  ).classList.remove('hidden');

  fetch(opener.getAttribute('data-product-url'))
    .then((response) => response.text())
    .then((responseText) => {

      const responseHTML =
        new DOMParser().parseFromString(
          responseText,
          'text/html'
        );

      const productElement =
        responseHTML.querySelector('product-info');

      this.preprocessHTML(productElement);

      HTMLUpdateUtility.setInnerHTML(
        this.modalContent,
        productElement.outerHTML
      );

      super.show(opener);
    })
    .finally(() => {
      opener.removeAttribute('aria-disabled');
      opener.classList.remove('loading');

      opener.querySelector(
        '.loading__spinner'
      ).classList.add('hidden');
    });
}
```

这段代码很值得研究。

我们一步一步分析。

**第一步：请求商品详情页**

```js
fetch(opener.getAttribute('data-product-url'))
```

注意这里请求的不是：

```text
/products/xxx.json
```

也不是 Shopify 的 Ajax Cart API。

而是普通商品详情页 URL：

```text
/products/running-shoes
```

为什么？

因为 Dawn 想复用商品详情页已经存在的 Liquid 模板。

商品详情页原本就有：

- 商品图片。
- 商品标题。
- 商品价格。
- Variant 选择器。
- 数量选择器。
- ProductForm。

这些东西没有必要重新开发一遍。

**第二步：解析返回的 HTML**

```js
const responseHTML =
  new DOMParser().parseFromString(
    responseText,
    'text/html'
  );
```

`DOMParser` 可以把 HTML 字符串解析成一个独立的 Document。

例如：

```js
const doc = new DOMParser().parseFromString(
  htmlString,
  'text/html'
);

const productInfo = doc.querySelector('product-info');
```

这里的 Document 还不是当前页面真实 DOM 的一部分。

所以它不会因为解析这段 HTML，就直接把商品详情显示在页面中。

**第三步：只提取 product-info**

```js
const productElement =
  responseHTML.querySelector('product-info');
```

这里非常重要。

Dawn 没有把整个商品详情页插入 Modal。

而是只取出：

```html
<product-info>
  <!-- 商品详情主体 -->
</product-info>
```

这样可以复用商品详情页的主体结构，而不需要把 Header、Footer 等内容也加载进来。

**第四步：处理 HTML**

```js
this.preprocessHTML(productElement);
```

我们马上深入这个方法。

**第五步：插入 Modal**

```js
HTMLUpdateUtility.setInnerHTML(
  this.modalContent,
  productElement.outerHTML
);
```

把处理后的商品详情 HTML 插入：

```html
<div id="QuickAddInfo-123"></div>
```

**第六步：真正打开 Modal**

```js
super.show(opener);
```

这时才调用父类的 Modal 展示逻辑。

所以整个过程实际上是：

```text
点击 Choose options
        ↓
ModalOpener.show()
        ↓
QuickAddModal.show()
        ↓
请求商品详情页 HTML
        ↓
DOMParser 解析
        ↓
提取 product-info
        ↓
处理 HTML
        ↓
插入 Modal
        ↓
ModalDialog.show()
```

这里有一个很重要的性能优化：

**商品详情的完整 HTML 不是在 Collection 页面初始化时加载，而是在用户主动点击时才请求。**

对于包含几十个商品的集合页，这可以避免提前加载几十份完整商品详情。

#### 3. preprocessHTML：为什么插入前要处理 HTML？

我们来看：

```js
preprocessHTML(productElement) {
  productElement.classList.forEach((classApplied) => {
    if (
      classApplied.startsWith('color-') ||
      classApplied === 'gradient'
    ) {
      this.modalContent.classList.add(classApplied);
    }
  });

  this.preventDuplicatedIDs(productElement);

  this.removeDOMElements(productElement);

  this.removeGalleryListSemantic(productElement);

  this.updateImageSizes(productElement);

  this.preventVariantURLSwitching(productElement);
}
```

这里包含五个处理。

| 方法 | 作用 |
|---|---|
| preventDuplicatedIDs | 避免页面 ID 冲突 |
| removeDOMElements | 删除不需要的组件 |
| removeGalleryListSemantic | 调整图片 Gallery 的语义 |
| updateImageSizes | 根据 Modal 布局调整图片尺寸 |
| preventVariantURLSwitching | 禁止 Variant 切换修改浏览器 URL |

我们重点看前三个。

**A. preventDuplicatedIDs**

商品详情页中的 DOM ID 通常包含 Section ID。

但现在我们把商品详情插入另一个页面，如果直接使用原来的 ID，可能和页面已有的 ID 冲突。

Dawn 的处理：

```js
const sectionId = productElement.dataset.section;

const oldId = sectionId;
const newId = `quickadd-${sectionId}`;

productElement.innerHTML =
  productElement.innerHTML.replaceAll(
    oldId,
    newId
  );
```

同时还会处理 `product-info` 自身的属性。

例如：

```text
原来的 ID：

price-template--123

插入 Modal 后：

price-quickadd-template--123
```

为什么需要这么做？

因为 HTML 中 ID 应该保持唯一。

如果商品详情页的价格组件和 Modal 中的价格组件拥有相同 ID，那么后续 JavaScript 使用：

```js
document.getElementById(...)
```

就可能找到错误的元素。

这是动态插入 HTML 时必须考虑的问题。

**B. removeDOMElements**

```js
removeDOMElements(productElement) {
  const pickupAvailability =
    productElement.querySelector('pickup-availability');

  if (pickupAvailability) {
    pickupAvailability.remove();
  }

  const productModal =
    productElement.querySelector('product-modal');

  if (productModal) {
    productModal.remove();
  }

  const modalDialog =
    productElement.querySelectorAll('modal-dialog');

  if (modalDialog) {
    modalDialog.forEach((modal) => modal.remove());
  }
}
```

为什么要删除这些元素？

因为 Quick Add Modal 不需要再嵌套一个商品图片 Modal，也不需要取货地点库存查询组件。

这些内容要么不是当前交互所必需的，要么可能产生重复的弹窗和额外的 DOM 复杂度。

**C. preventVariantURLSwitching**

```js
preventVariantURLSwitching(productElement) {
  productElement.setAttribute(
    'data-update-url',
    'false'
  );
}
```

正常商品详情页选择 Variant 时，Dawn 可能会更新浏览器 URL 中的 `variant` 参数。

但在 Quick Add Modal 中，用户只是在集合页快速选择商品规格。

不应该因此改变当前页面的 URL。

所以这里关闭 URL 更新。

这就是复用商品详情页组件时，需要针对使用场景做适配的原因。

---

### 五、最关键的设计：Quick Add 为什么能够复用 ProductForm？

现在终于进入我们之前学习过的核心模块：

[assets/product-form.js](https://github.com/Shopify/dawn/blob/main/assets/product-form.js)

Dawn 定义：

```js
customElements.define(
  'product-form',
  class ProductForm extends HTMLElement {
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
    }
  }
);
```

这里有一个非常值得注意的事实：

商品详情页的购买表单：

```html
<product-form>
  <form>
    ...
  </form>
</product-form>
```

商品卡片单 Variant 快速加购：

```html
<product-form>
  <form>
    ...
  </form>
</product-form>
```

Quick Add Modal 中的购买表单：

```html
<product-form>
  <form>
    ...
  </form>
</product-form>
```

它们使用的是同一个 ProductForm 组件。

这意味着 Dawn 并没有为快速加购重新开发一套购物车逻辑。

**它把购买行为抽象成一个统一的 ProductForm。**

#### 1. ProductForm 如何拦截表单提交？

```js
onSubmitHandler(evt) {
  evt.preventDefault();

  if (
    this.submitButton.getAttribute('aria-disabled') === 'true'
  ) return;

  // ...
}
```

`preventDefault()` 阻止浏览器默认提交表单。

否则浏览器可能会进行普通页面跳转。

接下来：

```js
const config = fetchConfig('javascript');

config.headers['X-Requested-With'] =
  'XMLHttpRequest';

delete config.headers['Content-Type'];

const formData = new FormData(this.form);

config.body = formData;
```

Dawn 将表单数据转换成 `FormData`。

这里的 FormData 不只是 Variant ID。

它可以包含：

- `id`：Variant ID。
- `quantity`：购买数量。
- `properties[...]`：商品自定义属性。
- `selling_plan`：订阅计划。
- 其他表单中存在的购买参数。

所以即使 Quick Add Modal 中有 Variant 选择、数量选择或者其他购买选项，也可以统一通过 FormData 提交。

#### 2. 为什么要传递 sections 参数？

这是整个加购流程中非常重要的知识点。

源码：

```js
const formData = new FormData(this.form);

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
}
```

你应该还记得我们之前学过 Shopify Section Rendering API。

这里又用到了相同的机制。

假设购物车使用 Cart Drawer。

Dawn 需要更新：

```text
cart-drawer
cart-icon-bubble
```

于是将需要更新的 Section ID 一起传给 Shopify。

接下来发送请求：

```js
fetch(`${routes.cart_add_url}`, config)
```

这就是 Shopify Ajax Cart API 的加购请求。

可以理解为：

```http
POST /cart/add.js
```

Shopify 收到请求后：

1. 将 Variant 加入购物车。
2. 更新购物车数据。
3. 根据传入的 sections 参数生成对应的 HTML。
4. 将购物车数据和 Section HTML 一起返回。

这就避免了加购完成后，再额外请求一次购物车数据和一次 Section HTML。

#### 3. 请求成功后，如何更新 Cart Drawer？

核心代码：

```js
.then((response) => {
  if (response.status) {
    // 处理错误
    return;
  }

  publish(PUB_SUB_EVENTS.cartUpdate, {
    source: 'product-form',
    productVariantId: variantId,
    cartData: response,
  });

  const quickAddModal =
    this.closest('quick-add-modal');

  if (quickAddModal) {
    document.body.addEventListener(
      'modalClosed',
      () => {
        setTimeout(() => {
          this.cart.renderContents(response);
        });
      },
      { once: true }
    );

    quickAddModal.hide(true);
  } else {
    this.cart.renderContents(response);
  }
});
```

这里有两个值得深入理解的点。

**第一：发布购物车更新事件。**

```js
publish(PUB_SUB_EVENTS.cartUpdate, {
  source: 'product-form',
  productVariantId: variantId,
  cartData: response,
});
```

Dawn 使用发布订阅模式处理购物车更新。

其他组件可以订阅：

```js
subscribe(PUB_SUB_EVENTS.cartUpdate, callback);
```

当购物车发生变化时，它们就可以得到通知。

这比在 ProductForm 中直接操作页面上所有购物车相关组件更灵活。

**第二：为什么 Quick Add Modal 要先关闭，再更新 Cart Drawer？**

你看到了：

```js
quickAddModal.hide(true);
```

然后监听：

```js
modalClosed
```

等 Modal 关闭之后再执行：

```js
this.cart.renderContents(response);
```

为什么？

因为用户刚刚处于 Quick Add Modal 中。

如果此时立即打开 Cart Drawer，就会出现两个弹窗交替显示的问题。

Dawn 的处理顺序是：

```text
加购成功
   ↓
关闭 Quick Add Modal
   ↓
触发 modalClosed
   ↓
更新 Cart Drawer HTML
   ↓
打开 Cart Drawer
```

这个交互顺序很值得借鉴。

#### 4. Cart Drawer 如何真正更新 HTML？

源码：

[assets/cart-drawer.js](https://github.com/Shopify/dawn/blob/main/assets/cart-drawer.js)

其中：

```js
renderContents(parsedState) {
  this.productId = parsedState.id;

  this.getSectionsToRender().forEach((section) => {
    const sectionElement = section.selector
      ? document.querySelector(section.selector)
      : document.getElementById(section.id);

    if (!sectionElement) return;

    sectionElement.innerHTML =
      this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
  });

  setTimeout(() => {
    this.open();
  });
}
```

它从 Ajax 加购接口返回的数据中读取：

```js
parsedState.sections
```

然后替换对应的 DOM。

最后：

```js
this.open();
```

打开 Cart Drawer。

所以我们可以把整个加购流程总结为：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **ProductForm**
    <text color="secondary" size="xs">监听 submit，生成 FormData</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **Shopify Ajax Cart API**
    <text color="secondary" size="xs">POST /cart/add.js</text>
    <text color="secondary" size="xs">加购并返回购物车数据及 Section HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **Publish cartUpdate**
    <text color="secondary" size="xs">通知其他购物车相关组件</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **CartDrawer.renderContents()**
    <text color="secondary" size="xs">替换购物车 HTML，更新购物车数量</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <badge color="success">打开购物车抽屉</badge>
</box>

至此，Standard Quick Add 的核心链路就完整了。

---

### 六、Bulk Quick Add：批量加购是怎么实现的？

前面的 Standard 模式主要解决的是：

> 用户从商品卡片中快速购买一个商品。

但假设我们面对的是 B2B 批发商城：

```text
商品 A       数量：10
商品 B       数量：20
商品 C       数量：5
商品 D       数量：0
```

用户希望直接在商品列表中修改数量，而不是每次都打开商品详情页。

这就是 Bulk 模式的用途。

对应源码：

- [assets/quick-add-bulk.js](https://github.com/Shopify/dawn/blob/main/assets/quick-add-bulk.js)
- [assets/global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js)

#### 1. 单 Variant 商品：直接展示数量输入框

在 `card-product.liquid` 中：

```liquid
{% elsif quick_add == 'bulk' %}

  {% if card_product.variants_count == 1 %}

    <quick-add-bulk
      data-min="..."
      data-index="..."
    >
      {% render 'quantity-input',
        variant: card_product.selected_or_first_available_variant,
        min: 0
      %}
    </quick-add-bulk>

  {% endif %}

{% endif %}
```

这里不再是 Add to cart 按钮，而是一个数量输入框。

用户可以直接输入：

```text
0 → 10
10 → 20
20 → 5
```

然后 Dawn 自动更新购物车。

#### 2. 为什么 quick-add-bulk 要继承 BulkAdd？

```js
customElements.define(
  'quick-add-bulk',
  class QuickAddBulk extends BulkAdd {
    constructor() {
      super();

      this.quantity =
        this.querySelector('quantity-input');

      // ...
    }
  }
);
```

你会发现：

```js
class QuickAddBulk extends BulkAdd
```

它继承了 `global.js` 中的 `BulkAdd`。

这意味着批量更新购物车的通用逻辑都放在父类中。

子类只负责：

- 监听数量输入变化。
- 验证数量规则。
- 监听购物车更新事件。
- 更新当前商品卡片。

这是很典型的继承复用。

#### 3. 多个数量修改如何合并请求？

这里有一段非常值得研究的代码。

`global.js`：

```js
class BulkAdd extends HTMLElement {
  static ASYNC_REQUEST_DELAY = 250;

  constructor() {
    super();
    this.queue = [];
    this.setRequestStarted(false);
  }

  startQueue(id, quantity) {
    this.queue.push({ id, quantity });

    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue);
        }
      } else {
        clearInterval(interval);
      }
    }, BulkAdd.ASYNC_REQUEST_DELAY);
  }
}
```

核心是：

```js
this.queue
```

假设用户短时间内修改了三个商品：

```js
[
  { id: 111, quantity: 10 },
  { id: 222, quantity: 20 },
  { id: 333, quantity: 5 }
]
```

Dawn 不需要每次修改都立即发送独立请求。

它通过队列收集修改，再批量处理。

另外，`quick-add-bulk.js` 对 change 事件还使用了 debounce。

所以实际上存在两层节奏控制：

1. 输入变化防抖。
2. BulkAdd 请求队列调度。

这可以减少用户连续修改数量时产生的大量网络请求。

#### 4. 为什么 Bulk 使用 cart/update，而不是 cart/add？

这是一个非常重要的区别。

Standard 模式：

```text
我要再加购 2 件商品
```

这是一个增加操作，因此使用：

```http
POST /cart/add.js
```

Bulk 模式：

```text
我希望这个 Variant 在购物车中的总数量变成 10
```

这是一个数量更新操作，因此使用：

```http
POST /cart/update.js
```

Dawn 的实现甚至比简单传递 Variant ID 更严谨。

它会先获取当前购物车：

```js
const cartResponse = await fetch(
  `${routes.cart_url}.js`,
  { cache: 'no-store' }
);

const cart = await cartResponse.json();
```

然后通过：

```js
buildCartUpdates(items, cart.items)
```

计算应该更新哪些购物车行。

为什么不直接用 Variant ID？

因为购物车中可能存在多个具有不同属性、销售计划或折扣拆分的行项目。

所以 Dawn 使用购物车行的 `key` 来定位已有行，避免错误地修改其他行。

最后调用：

```js
fetch(routes.cart_update_url, {
  ...fetchConfig(),
  body: JSON.stringify({
    updates,
    sections,
    sections_url: sectionsUrl
  })
});
```

请求完成后，再更新商品卡片、Cart Drawer 和购物车数量图标。

这部分可以理解为：

**Standard 是提交购买行为，Bulk 是同步商品的目标购买数量。**

---

#### 5. 多 Variant 商品的 Bulk 模式

如果一个商品有多个 Variant，显然不能直接展示一个数量输入框。

例如：

```text
T-Shirt

Black / S
Black / M
Black / L

White / S
White / M
White / L
```

Dawn 会打开一个批量订购 Modal。

这里使用了另一个组件：

```html
<bulk-modal
  data-url="{{ card_product.url }}"
  data-section-id="{{ section_id }}"
  data-product-id="{{ card_product.id }}"
>
</bulk-modal>
```

对应 `global.js` 中的：

```js
class BulkModal extends HTMLElement {
  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;

      observer.unobserve(this);

      if (this.innerHTML.trim() === '') {
        const productUrl =
          this.dataset.url.split('?')[0];

        fetch(
          `${productUrl}?section_id=bulk-quick-order-list`
        )
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser()
              .parseFromString(responseText, 'text/html');

            const sourceQty = html.querySelector(
              '.quick-order-list-container'
            ).parentNode;

            this.innerHTML = sourceQty.innerHTML;
          });
      }
    };

    new IntersectionObserver(
      handleIntersection.bind(this)
    ).observe(
      document.querySelector(
        `#QuickBulk-${this.dataset.productId}-${this.dataset.sectionId}`
      )
    );
  }
}
```

注意这里又出现了一个熟悉的技术：

`IntersectionObserver`。

但这次用途不是等待用户点击，而是提前加载批量订购内容。

当对应商品卡片的 Quick Add 触发元素进入视口时，就请求：

```text
/products/xxx?section_id=bulk-quick-order-list
```

Shopify 服务端渲染批量订购 Section，然后 Dawn 把对应 HTML 插入 Modal。

这与上一课的 Product Recommendations 有相似之处：

- 都利用 Shopify 服务端生成 HTML。
- 都使用 Section Rendering。
- 都使用 IntersectionObserver 控制加载时机。

不同的是：

| Product Recommendations | Bulk Modal |
|---|---|
| 请求推荐商品 Section | 请求批量订购 Section |
| 插入推荐商品卡片 | 插入 Variant 数量表格 |
| 进入视口附近时请求 | 商品卡片进入视口时请求 |

---

## 七、从性能角度总结 Dawn 的设计

现在我们把整个 Quick Add 模块放在性能优化的角度来看。

| 优化手段 | 解决的问题 |
|---|---|
| 延迟请求商品详情 | 避免页面初始化时请求大量商品详情 |
| 按需生成 Modal 内容 | 减少初始 DOM 体积 |
| 复用 ProductForm | 避免重复实现加购逻辑 |
| 条件加载 JS/CSS | 不使用 Quick Add 时不加载相关资源 |
| IntersectionObserver | 控制批量订购内容的加载时机 |
| BulkAdd 队列 | 减少连续修改数量时的请求次数 |
| Ajax 返回 Section HTML | 避免加购后额外请求购物车各个展示模块 |

特别值得研究的是 `main-collection-product-grid.liquid` 中的资源加载：

```liquid
{% unless section.settings.quick_add == 'none' %}
  {{ 'quick-add.css' | asset_url | stylesheet_tag }}
{% endunless %}

{% if section.settings.quick_add == 'standard' %}
  <script src="{{ 'quick-add.js' | asset_url }}" defer></script>
  <script src="{{ 'product-form.js' | asset_url }}" defer></script>
{% endif %}

{% if section.settings.quick_add == 'bulk' %}
  <script src="{{ 'quick-add-bulk.js' | asset_url }}" defer></script>
  <script src="{{ 'quantity-popover.js' | asset_url }}" defer></script>
  <script src="{{ 'price-per-item.js' | asset_url }}" defer></script>
  <script src="{{ 'quick-order-list.js' | asset_url }}" defer></script>
{% endif %}
```

这就是一种按功能加载资源的思路。

如果用户没有开启 Quick Add，就不需要加载这些专用脚本和样式。

这对 Theme 开发尤其重要：不要让一个功能模块的 JS 成为所有页面的额外负担。

---

## 八、实际调试：建议你自己验证三个请求链路

这一部分最好亲自在 Dawn 主题中操作。

打开 Chrome DevTools → Network → Fetch/XHR。

<box border radius="lg" padding={3} gap={3}>
  **实验 A：Standard + 单 Variant**

  预期：

  1. 页面加载时没有商品详情请求。
  2. 点击 Add。
  3. 直接发送 `/cart/add.js`。
  4. 返回购物车数据和 Section HTML。
  5. Cart Drawer 更新并打开。

  <divider color="subtle"/>
  **实验 B：Standard + 多 Variant**

  预期：

  1. 页面加载时 Modal 内容为空。
  2. 点击 Choose options。
  3. 发送商品详情页 GET 请求。
  4. 将 `product-info` 插入 Modal。
  5. 选择 Variant。
  6. 点击 Add，发送 `/cart/add.js`。
  7. Modal 关闭，Cart Drawer 打开。

  <divider color="subtle"/>
  **实验 C：Bulk**

  预期：

  1. 单 Variant 商品显示数量输入框。
  2. 修改数量，观察请求队列。
  3. 观察 `/cart/update.js`。
  4. 检查商品卡片与购物车展示是否同步更新。
</box>

---

## 九、本课知识检验

这次我想重点考察你对 Dawn 架构的理解，而不只是记住源码。

{@body const questions = [{q:"一个只有一个 Variant、没有特殊数量规则的商品，Standard Quick Add 为什么不需要打开 Modal？",opts:["因为 Shopify 自动帮它选择了商品图片","因为可以直接使用 selected_or_first_available_variant.id 生成 ProductForm","因为 Ajax API 不支持多 Variant"],a:1,why:"只有一个可选 Variant 时无需用户选择，直接将 Variant ID 放入表单即可。"},{"q":"多 Variant 商品点击 Choose options 后，Dawn 为什么请求商品详情页 HTML，而不是请求商品 JSON？",opts:["因为要复用商品详情页的 Liquid 和 ProductForm 结构","因为 Shopify 不支持 JSON","因为浏览器不能解析商品 JSON"],a:0,why:"Dawn 通过 DOMParser 提取 product-info，复用原有的商品详情、Variant 选择和购买表单。"},{"q":"Standard Quick Add 加购成功后，为什么 Cart Drawer 不需要再单独请求一次 Section HTML？",opts:["因为 Cart Drawer 不需要更新","因为加购请求已经通过 sections 参数要求 Shopify 返回对应 HTML","因为浏览器自动同步了购物车 DOM"],a:1,why:"cart_add 请求中传入 sections 和 sections_url，响应中包含需要更新的 Section HTML。"},{"q":"Bulk 模式为什么主要使用 cart/update.js？",opts:["因为它只支持删除商品","因为用户输入的是 Variant 在购物车中的目标总数量，而不只是增加数量","因为 cart/add.js 已经废弃"],a:1,why:"Bulk 的数量输入代表目标数量，需要根据购物车当前行项目计算 updates。"}]}
{@body const [answers,setAnswers] = DIL.useState({})}
{@body const [showResult,setShowResult] = DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row justify="between" align="center">
    **第 7 课自测**
    <badge color="info">{Object.keys(answers).length}/4 已作答</badge>
  </row>
  {#each questions as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i]===undefined?"":String(answers[i])} disabled={showResult} onChange={v=>setAnswers(p=>({...p,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if showResult}
        <box background="surface-secondary" radius="md" padding={2} gap={1}>
          <row align="center" gap={2}>
            {#if answers[i]===q.a}
              <icon name="check-circle-filled" color="success"/>
              <text color="success" weight="medium" size="sm">回答正确</text>
            {:else}
              <icon name="x-circle" color="danger"/>
              <text color="danger" weight="medium" size="sm">回答错误，正确答案：{q.opts[q.a]}</text>
            {/if}
          </row>
          <text size="sm">{q.why}</text>
        </box>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if showResult}
    **得分：{questions.filter((q,i)=>answers[i]===q.a).length}/4**
    <button block variant="outline" onClick={()=>{setAnswers({});setShowResult(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setShowResult(true)}>提交答案</button>
  {/if}
</box>
