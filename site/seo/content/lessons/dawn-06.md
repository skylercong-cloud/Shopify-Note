# Product Recommendations：商品推荐与异步 Section 加载


上一课深入研究了 Product Media Gallery，理解了 Dawn 如何处理商品图片、视频、3D Model、懒加载以及 Variant 切换时的 DOM 更新。

今天我们继续研究商品详情页的另一个重要模块：**商品推荐（Product Recommendations）**。

先思考一个实际场景：

用户正在浏览一款运动鞋，商品详情页底部有一个区域：

<box border radius="lg" padding={3} gap={3}>
  **You may also like**
  <text color="secondary" size="xs">推荐给你的商品</text>
  <grid columns={3} gap={2}>
    <grid-item>
      <LessonImage src="assets/fill/img-25.jpg" alt="white minimalist running shoes product photography"/>
      <text weight="medium" size="sm">Running Shoes</text>
      <text color="secondary" size="xs">$89.00</text>
    </grid-item>
    <grid-item>
      <LessonImage src="assets/fill/img-26.jpg" alt="black sports running socks product photography"/>
      <text weight="medium" size="sm">Sports Socks</text>
      <text color="secondary" size="xs">$15.00</text>
    </grid-item>
    <grid-item>
      <LessonImage src="assets/fill/img-27.jpg" alt="black sports gym bag product photography"/>
      <text weight="medium" size="sm">Gym Bag</text>
      <text color="secondary" size="xs">$45.00</text>
    </grid-item>
  </grid>
</box>

这里有几个值得研究的问题：

1. 推荐商品由谁决定？Shopify 还是 Theme？
2. 为什么不直接在 Liquid 中遍历推荐商品？
3. 页面打开时就请求推荐商品，还是滚动到附近才请求？
4. 推荐商品请求回来后，Dawn 如何将 HTML 插入页面？
5. 这套机制如何减少首屏资源竞争？

这节课我们主要研究后面四个问题。

## 一、先区分两种商品推荐

Dawn 实际上有两种商品推荐场景，而且它们使用的是同一套 Shopify 推荐机制。

另外，先纠正一下上一课预告中的文件路径：当前 Dawn 的相关文件是 `sections/related-products.liquid`，不是 `sections/product-recommendations.liquid`。

### 1. Related Products：相关商品

通常出现在商品详情页的底部：

```text
You may also like

商品 A    商品 B    商品 C    商品 D
```

对应源码：

[sections/related-products.liquid](https://github.com/Shopify/dawn/blob/main/sections/related-products.liquid)

它的推荐意图是 `related`，也就是推荐与当前商品相关的商品，可能是相似商品，也可能是互补商品。

### 2. Complementary Products：互补商品

通常出现在商品详情页的商品信息区域：

```text
商品名称
商品价格
Variant 选择器
加购按钮

Pair it with

配套商品 A
配套商品 B
```

对应源码：

[sections/main-product.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid)

它的推荐意图是 `complementary`，例如：

- 买运动鞋，推荐运动袜。
- 买手机，推荐手机壳。
- 买相机，推荐存储卡。

两者最大的区别不只是展示位置，而是推荐策略和数据配置方式。

| 对比 | Related | Complementary |
|---|---|---|
| 推荐策略 | 相似或相关商品 | 配套商品 |
| Shopify 自动生成 | 支持 | 不自动生成 |
| 手动配置 | 可通过 Search & Discovery 影响结果 | 需要配置 |
| Dawn 文件 | related-products.liquid | main-product.liquid |
| 展示方式 | 商品网格 | 横向商品推荐轮播 |

Shopify 的相关商品推荐可以基于销售数据、商品描述、集合关系等生成；互补商品则需要通过 Search & Discovery 应用配置。

这说明一个重要的架构原则：

**Shopify 负责推荐数据，Theme 负责推荐数据的展示。**

Theme 不需要自己开发一套商品推荐算法。

---

## 二、先看 Liquid：推荐商品是怎么进入页面的？

打开：

[sections/related-products.liquid](https://github.com/Shopify/dawn/blob/main/sections/related-products.liquid)

找到核心代码：

```liquid
<product-recommendations
  class="related-products page-width"
  data-url="{{ routes.product_recommendations_url }}?limit={{ section.settings.products_to_show }}"
  data-section-id="{{ section.id }}"
  data-product-id="{{ product.id }}"
>
  {% if recommendations.performed
    and recommendations.products_count > 0
  %}

    <h2>
      {{ section.settings.heading }}
    </h2>

    <ul class="grid product-grid">

      {% for recommendation in recommendations.products %}

        <li class="grid__item">

          {% render 'card-product',
            card_product: recommendation,
            media_aspect_ratio: section.settings.image_ratio,
            show_secondary_image: section.settings.show_secondary_image,
            show_vendor: section.settings.show_vendor,
            show_rating: section.settings.show_rating,
            product_view_context: 'recommendation'
          %}

        </li>

      {% endfor %}

    </ul>

  {% endif %}
</product-recommendations>
```

我们逐个分析。

### 1. recommendations.products 是什么？

你之前已经学习过 Shopify Liquid 对象。

这里出现了一个新的对象：

```liquid
recommendations
```

它提供推荐结果。

重点属性：

```liquid
recommendations.performed
recommendations.products_count
recommendations.products
recommendations.intent
```

其中：

| 属性 | 含义 |
|---|---|
| `performed` | 推荐请求是否已经执行 |
| `products_count` | 推荐商品数量 |
| `products` | 推荐商品集合 |
| `intent` | 推荐意图 |

注意，这里有一个非常重要的事情：

**普通商品详情页第一次由 Shopify 渲染时，推荐请求还没有执行，因此通常没有推荐商品可以遍历。**

这就解释了为什么 Dawn 使用：

```liquid
{% if recommendations.performed
  and recommendations.products_count > 0 %}
```

只有真正获得推荐结果后，才渲染商品卡片。

### 2. 为什么使用 product-recommendations 标签？

```html
<product-recommendations>
```

这不是 HTML 原生标签，而是 Dawn 自定义的 Web Component。

它对应：

```js
customElements.define(
  'product-recommendations',
  ProductRecommendations
);
```

定义位置：

[assets/global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js)

也就是说：

- Liquid 创建组件的 HTML。
- HTML 通过 `data-*` 属性传递参数。
- JavaScript 负责请求推荐数据。
- Shopify 返回 HTML。
- JavaScript 把 HTML 插入组件。

这套设计我们后面会详细拆解。

---

## 三、最重要的知识：Shopify 推荐商品接口

现在看这段：

```liquid
data-url="{{ routes.product_recommendations_url }}?limit={{ section.settings.products_to_show }}"
data-section-id="{{ section.id }}"
data-product-id="{{ product.id }}"
```

Dawn 把三个参数放进了 HTML。

| 参数 | 示例 | 用途 |
|---|---|---|
| `data-url` | `/recommendations/products?limit=4` | 推荐接口地址及参数 |
| `data-section-id` | `template--123__related-products` | 指定需要渲染的 Section |
| `data-product-id` | `123456789` | 指定当前商品 |

这里最重要的是：

```liquid
routes.product_recommendations_url
```

这是 Shopify 提供的商品推荐路由。

Shopify 提供两种主要接口：

<box border radius="lg" padding={3} gap={3}>
  **接口 A：返回 JSON**
  <badge color="info">JSON API</badge>
  ```http
  GET /recommendations/products.json
  ```
  返回推荐商品的数据，前端需要自己生成商品卡片 HTML。
  <divider color="subtle"/>
  **接口 B：返回 Section HTML**
  <badge color="success">Dawn 使用</badge>
  ```http
  GET /recommendations/products
  ```
  Shopify 使用指定 Section 的 Liquid 模板生成 HTML，前端只需要将结果插入页面。
</box>

官方文档：

<Link url="https://shopify.dev/docs/api/ajax/reference/product-recommendations" title="Shopify Product Recommendations API"/>

我们重点看第二种。

它支持这些参数：

| 参数 | 是否必填 | 作用 |
|---|---|---|
| `product_id` | 是 | 当前商品 ID |
| `section_id` | 是 | 要渲染的 Section ID |
| `limit` | 否 | 推荐商品数量，1～10 |
| `intent` | 否 | `related` 或 `complementary` |



例如：

```http
/recommendations/products
  ?limit=4
  &product_id=123456
  &section_id=template--123__related-products
  &intent=related
```

这次请求不是简单地返回四个商品的 JSON 数据。

而是让 Shopify：

1. 根据 `product_id` 获取当前商品。
2. 根据 `intent` 确定推荐策略。
3. 生成推荐商品集合。
4. 使用 `section_id` 指定的 Theme Section 进行 Liquid 渲染。
5. 返回渲染后的 HTML。

这就是本节最重要的知识点：

**Shopify 不仅可以返回数据，还可以根据指定的 Theme Section，在服务端直接生成 HTML。**

这和我们之前学习的 Section Rendering 思想是一脉相承的。

---

## 四、Dawn 如何做到滚动到附近才请求？

现在进入真正的 JavaScript 实现。

打开：

[assets/global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js)

搜索：

```js
class ProductRecommendations
```

当前 Dawn 的实现：

```js
class ProductRecommendations extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeRecommendations(
      this.dataset.productId
    );
  }

  initializeRecommendations(productId) {
    this.observer?.unobserve(this);

    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;

        observer.unobserve(this);

        this.loadRecommendations(productId);
      },
      {
        rootMargin: '0px 0px 400px 0px'
      }
    );

    this.observer.observe(this);
  }

  // ...
}
```

这段代码值得深入理解。

### 1. connectedCallback 是什么？

```js
connectedCallback() {
  this.initializeRecommendations(
    this.dataset.productId
  );
}
```

这是 Web Components 的生命周期方法。

当一个自定义元素被插入到 DOM 中时，浏览器会调用它。

例如：

```html
<product-recommendations
  data-product-id="123456"
>
</product-recommendations>
```

当这个元素进入文档并完成自定义元素升级后，就会执行：

```js
connectedCallback()
```

所以 Dawn 不需要在其他地方手动调用：

```js
new ProductRecommendations()
```

也不需要专门初始化每个推荐组件。

这是 Web Components 很有价值的地方。

### 2. 为什么使用 IntersectionObserver？

核心代码：

```js
this.observer = new IntersectionObserver(
  (entries, observer) => {
    if (!entries[0].isIntersecting) return;

    observer.unobserve(this);

    this.loadRecommendations(productId);
  },
  {
    rootMargin: '0px 0px 400px 0px'
  }
);
```

我们先理解 `rootMargin`。

它的值是：

```js
'0px 0px 400px 0px'
```

分别代表：

```text
上   右   下   左
0    0    400  0
```

也就是把 IntersectionObserver 的观察区域向下扩展 400px。

假设商品推荐模块距离当前视口底部还有 350px。

虽然用户还没有真正滚动到推荐模块，但它已经进入扩展后的观察区域了。

于是：

```js
entries[0].isIntersecting === true
```

然后开始请求推荐数据。

<box border radius="lg" padding={3} gap={3}>
  **IntersectionObserver 触发示意**
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    <box border radius="md" padding={2} align="center">
      **浏览器当前可视区域**
      <text color="secondary" size="xs">Viewport</text>
    </box>
    <box align="center">
      <icon name="arrow-down" color="secondary"/>
      <text size="xs" color="secondary">向下扩展 400px</text>
    </box>
    <box border={{size:1,color:"#16A34A"}} radius="md" padding={2} align="center">
      <badge color="success">提前进入观察区域</badge>
      **商品推荐组件**
      <text color="secondary" size="xs">即使尚未真正进入屏幕，也可以触发请求</text>
    </box>
  </box>
  <text color="secondary" size="xs">简化示意：实际判断还取决于组件和扩展观察区域的相交关系。</text>
</box>

为什么不等用户真正滚动到组件时才请求？

因为网络请求需要时间。

如果等到用户已经看到推荐区域才开始请求，用户可能会先看到一片空白，然后才看到商品。

提前 400px 请求，可以给网络加载预留时间。

### 3. 为什么请求前先 unobserve？

```js
observer.unobserve(this);
```

这个细节也非常重要。

假设不执行这一步，用户滚动时可能多次触发观察回调。

虽然浏览器的 IntersectionObserver 并不是每次 scroll 都必然执行回调，但这里的目标很明确：

**一个推荐组件只需要请求一次。**

所以：

```text
进入观察区域
    ↓
停止观察
    ↓
发送请求
```

这样就避免了重复请求。

---

## 五、真正发送请求：loadRecommendations()

继续看 `assets/global.js`。

```js
loadRecommendations(productId) {
  fetch(
    `${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`
  )
    .then((response) => response.text())
    .then((text) => {
      const html = document.createElement('div');
      html.innerHTML = text;

      const recommendations =
        html.querySelector('product-recommendations');

      if (recommendations?.innerHTML.trim().length) {
        this.innerHTML = recommendations.innerHTML;
      }

      if (
        !this.querySelector('slideshow-component') &&
        this.classList.contains('complementary-products')
      ) {
        this.remove();
      }

      if (html.querySelector('.grid__item')) {
        this.classList.add('product-recommendations--loaded');
      }
    })
    .catch((e) => {
      console.error(e);
    });
}
```

这段代码就是整个推荐模块的核心。

我们逐步拆解。

### 1. 拼接请求 URL

```js
fetch(
  `${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`
)
```

假设 HTML 中的数据是：

```html
<product-recommendations
  data-url="/recommendations/products?limit=4"
  data-section-id="template--123__related-products"
  data-product-id="888888"
>
</product-recommendations>
```

那么最终请求：

```http
GET /recommendations/products
    ?limit=4
    &product_id=888888
    &section_id=template--123__related-products
```

这里需要注意：

Dawn 并没有把推荐数量、商品 ID、Section ID 写死在 JS 中。

而是由 Liquid 在服务端生成 HTML 时，通过 `data-*` 属性传递。

这样同一个 JavaScript 组件就可以服务不同的商品和 Section。

### 2. 为什么使用 response.text() 而不是 response.json()？

```js
.then((response) => response.text())
```

因为我们请求的是：

```http
/recommendations/products
```

而不是：

```http
/recommendations/products.json
```

前者返回 HTML，后者返回 JSON。

假设 Shopify 返回：

```html
<product-recommendations>

  <h2>You may also like</h2>

  <ul>
    <li>
      <div class="card-wrapper">
        商品 A
      </div>
    </li>

    <li>
      <div class="card-wrapper">
        商品 B
      </div>
    </li>
  </ul>

</product-recommendations>
```

Dawn 不需要自己处理 JSON，也不需要在浏览器中重新拼装商品卡片。

因为 Shopify 已经通过 Liquid 帮我们完成了这些工作。

这就是选择 HTML Section 接口的原因。

### 3. 为什么创建一个临时 div？

```js
const html = document.createElement('div');

html.innerHTML = text;
```

这里的 `html` 只是一个临时容器。

它并没有插入真实页面。

Dawn 将 Shopify 返回的 HTML 放进这个临时容器，然后使用：

```js
const recommendations =
  html.querySelector('product-recommendations');
```

找到推荐组件。

这里有个值得注意的地方：

它并没有直接把整个返回 HTML 插入页面。

而是只取出：

```html
<product-recommendations>
  <!-- 里面的内容 -->
</product-recommendations>
```

的内部内容。

### 4. 为什么使用 this.innerHTML？

```js
this.innerHTML = recommendations.innerHTML;
```

这是一个很有意思的设计。

注意，它替换的是：

```js
this.innerHTML
```

而不是：

```js
this.outerHTML
```

也就是说，它保留了原来的：

```html
<product-recommendations
  data-url="..."
  data-section-id="..."
  data-product-id="..."
>
```

只替换内部子节点。

为什么这样做？

因为原来的 `<product-recommendations>` 已经是一个初始化完成的 Web Component。

它已经：

- 执行过 `connectedCallback()`。
- 创建了 IntersectionObserver。
- 完成了推荐请求。
- 停止了对自身的观察。

如果连外层元素一起替换，就可能导致组件被重新创建和初始化。

保留外层元素，可以让组件的生命周期更清晰。

这也是一种很值得学习的组件更新思路。

---

## 六、一个非常重要的问题：Shopify 返回的 HTML 到底是谁渲染的？

这里需要把刚才的流程再深入一层。

假设我们请求：

```http
/recommendations/products
?product_id=888888
&section_id=template--123__related-products
```

Shopify 服务端会根据指定的 Section ID，使用对应的 Theme Section 进行渲染。

对于 Related Products：

```text
sections/related-products.liquid
```

在这个请求上下文中，Liquid 可以访问：

```liquid
recommendations.performed
recommendations.products_count
recommendations.products
```

于是原来无法渲染推荐商品的：

```liquid
{% if recommendations.performed
  and recommendations.products_count > 0 %}
```

现在就可以成立了。

然后：

```liquid
{% for recommendation in recommendations.products %}
  {% render 'card-product',
    card_product: recommendation
  %}
{% endfor %}
```

服务端把商品卡片全部生成。

整个流程：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **浏览器**
    <text size="xs" color="secondary">发送 Product Recommendations 请求</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **Shopify 推荐服务**
    <text size="xs" color="secondary">根据商品 ID 和推荐意图获取商品集合</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **Shopify Theme 渲染引擎**
    <text size="xs" color="secondary">执行 related-products.liquid</text>
    <text size="xs" color="secondary">生成 recommendations.products 对应的商品卡片</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **返回 HTML**
    <text size="xs" color="secondary">浏览器解析并插入 product-recommendations</text>
  </box>
</box>

这也是 Shopify Theme 开发中非常重要的一种开发模式：

**服务端负责数据和 HTML 生成，浏览器负责请求时机和 DOM 更新。**

你不需要为了异步加载一个商品推荐模块，就自己建立一套前端商品数据模型和模板渲染系统。

不过还有一个细节值得注意：

对于 `related-products.liquid`，请求渲染的是独立的 Related Products Section。

而对于 `main-product.liquid` 中的 Complementary Products Block，`data-section-id` 使用的是主商品 Section 的 ID。

因此，不能想当然地认为 Complementary 请求只会在服务端生成那个小组件。它指定的渲染范围是主商品 Section，Dawn 再从响应中提取对应的 `product-recommendations`。可以在 Network 中观察实际响应体大小。

官方文档明确说明了 Section Recommendations 接口返回的是指定 Section 渲染后的 HTML。

---

## 七、Dawn 如何处理没有推荐商品的情况？

继续看：

```js
if (
  !this.querySelector('slideshow-component') &&
  this.classList.contains('complementary-products')
) {
  this.remove();
}
```

这里处理的是 Complementary Products。

为什么？

因为 Complementary Products 的 HTML 结构中，只有存在推荐商品时，才会生成：

```html
<slideshow-component>
  ...
</slideshow-component>
```

如果没有推荐结果：

```js
this.querySelector('slideshow-component')
```

就会返回 `null`。

同时它又判断：

```js
this.classList.contains('complementary-products')
```

确认这是互补商品模块。

于是直接删除整个模块：

```js
this.remove();
```

为什么要这样？

想象一下：

```text
商品详情页

商品价格
Variant 选择器
加购按钮

Pair it with

（这里什么商品都没有）
```

这会留下一个没有实际意义的空模块。

Dawn 选择直接移除它。

而 Related Products 没有这段删除逻辑。

如果没有推荐商品，Related Products 的自定义元素就会保持空状态，不会生成商品卡片。

---

## 八、商品卡片复用：为什么推荐商品不需要自己写 HTML？

你应该还记得我们之前研究过：

```text
snippets/card-product.liquid
```

这是 Dawn 最核心的商品卡片组件之一。

无论是在：

- Collection 商品列表。
- 搜索结果。
- 推荐商品。
- 其他商品展示区域。

都可以复用它。

Related Products 中：

```liquid
{% render 'card-product',
  card_product: recommendation,
  media_aspect_ratio: section.settings.image_ratio,
  image_shape: section.settings.image_shape,
  show_secondary_image: section.settings.show_secondary_image,
  show_vendor: section.settings.show_vendor,
  show_rating: section.settings.show_rating,
  product_view_context: 'recommendation'
%}
```

Complementary Products 中也复用：

```liquid
{% render 'card-product',
  card_product: product,
  media_aspect_ratio: block.settings.image_ratio,
  show_secondary_image: false,
  lazy_load: false,
  quick_add: quick_add,
  section_id: section.id,
  horizontal_class: true
%}
```

你会发现，二者调用同一个 Snippet，但是传递不同的参数。

这就是 Dawn 的组件化设计：

**数据来源不同、展示场景不同，但商品卡片的基础结构可以复用。**

另外还有一个容易忽略的细节：

```liquid
product_view_context: 'recommendation'
```

Dawn 在推荐商品卡片中明确传递了推荐场景上下文。

而且 Shopify 返回的推荐商品 URL 本身可能包含：

```text
?pr_choice=default
&pr_prod_strat=copurchase
&pr_rec_pid=...
&pr_ref_pid=...
&pr_seq=alternating
```

这些参数用于推荐商品的转化归因。

因此，如果你自己改造推荐商品卡片，应该保留：

```liquid
{{ card_product.url }}
```

不要随意将其替换成自行拼接的商品 URL，否则可能丢失推荐转化跟踪信息。

---

## 九、从性能角度深入：Dawn 实际上用了两层懒加载

这一点尤其值得注意。

我们前面学习了：

```html
<img loading="lazy">
```

但 Dawn 的商品推荐还有一层更外部的懒加载。

### 第一层：推荐模块的懒加载

```js
new IntersectionObserver(
  callback,
  {
    rootMargin: '0px 0px 400px 0px'
  }
);
```

控制：

```text
什么时候请求推荐商品 HTML？
```

### 第二层：商品图片的懒加载

打开：

[snippets/card-product.liquid](https://github.com/Shopify/dawn/blob/main/snippets/card-product.liquid)

可以看到：

```liquid
{% unless lazy_load == false %}
  loading="lazy"
{% endunless %}
```

Related Products 调用 `card-product` 时没有传入 `lazy_load: false`，因此商品卡片图片默认使用懒加载。

控制：

```text
什么时候下载推荐商品图片？
```

所以整个流程是：

<box border radius="lg" padding={3} gap={2}>
  **第一阶段：页面初始化**
  <badge color="success">不请求推荐数据</badge>
  <text color="secondary" size="xs">仅保留推荐组件的 HTML 外壳。</text>
  <divider color="subtle"/>
  **第二阶段：距离视口底部 400px**
  <badge color="info">开始请求</badge>
  <text color="secondary" size="xs">IntersectionObserver 触发，异步获取推荐 HTML。</text>
  <divider color="subtle"/>
  **第三阶段：插入商品卡片**
  <badge color="info">图片按需加载</badge>
  <text color="secondary" size="xs">Related Products 中的商品图片使用 loading="lazy"。</text>
  <divider color="subtle"/>
  **第四阶段：用户真正看到推荐商品**
  <badge color="success">完成展示</badge>
  <text color="secondary" size="xs">商品信息和图片逐步呈现。</text>
</box>

这里有个非常有意思的区别。

Dawn 在 Complementary Products 中传递了：

```liquid
lazy_load: false
```

而 Related Products 没有。

为什么？

因为 Complementary Products 通常位于商品信息区域，可能离首屏比较近；Related Products 通常在商品详情页下方，更适合使用原生图片懒加载。

这说明 Dawn 并不是无脑地给所有图片设置 `loading="lazy"`，而是根据使用场景决定加载策略。

---

## 十、这套实现还有哪些性能问题值得注意？

Dawn 的设计已经相当成熟，但我们不能只会阅读源码，还要学会从源码中发现可以改进的地方。

### 1. 400px 是否一定是最佳值？

```js
rootMargin: '0px 0px 400px 0px'
```

这个值不是固定的性能最优解。

假设：

- 用户滚动很快。
- 网络速度比较慢。
- 推荐接口响应时间比较长。

那么用户可能已经滚动到推荐区域，商品还没有加载完成。

反过来，如果设置成 1500px：

- 推荐商品请求会更早发生。
- 更多图片可能提前开始下载。
- 可能与主商品图片、CSS、JavaScript 争抢网络资源。

因此，400px 是一个提前加载和资源竞争之间的折中。

### 2. 动态插入 HTML 会不会产生 CLS？

看看：

```js
this.innerHTML = recommendations.innerHTML;
```

原本推荐区域没有商品卡片。

请求完成后，突然插入了四张商品卡片。

这会增加页面高度。

如果此时推荐区域处于用户当前视口中，或者内容插入导致可视区域内其他元素移动，就可能产生布局偏移。

因此，如果你自己开发类似模块，可以考虑：

- 预留推荐区域的最小高度。
- 使用 Skeleton 占位。
- 预先确定商品卡片的图片宽高比。
- 避免图片加载完成后再改变卡片尺寸。

注意：Dawn 的 `card-product` 已经通过图片宽高和比例容器帮助减少图片加载导致的布局偏移，但它没有在推荐模块中完整预留所有动态内容的高度。

### 3. Dawn 的请求错误处理是否完善？

注意：

```js
fetch(url)
  .then((response) => response.text())
  .catch((e) => console.error(e));
```

这里有一个细节。

`fetch()` 遇到 HTTP 404、500 时，通常不会自动进入 `catch`。

它只会在网络请求失败等情况下 reject。

因此，如果你自己开发这个组件，更严谨的写法应该是：

```js
fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error(
        `HTTP Error: ${response.status}`
      );
    }

    return response.text();
  })
  .then((html) => {
    // 解析并插入推荐商品
  })
  .catch((error) => {
    console.error(error);
  });
```

这是我们阅读源码时应该培养的习惯：

不仅理解作者为什么这样写，也要思考异常情况下会发生什么。

## 十一、实际调试：自己验证这套异步加载机制

现在建议你打开一个使用 Dawn 的真实商品详情页。

我们做三个实验。

### 实验 1：观察推荐接口什么时候发起

打开 Chrome DevTools：

1. Network。
2. 勾选 Preserve log。
3. 选择 Fetch/XHR。
4. 刷新商品详情页。
5. 不要立即向下滚动。

观察：

<box border radius="lg" padding={3} gap={2}>
  **预期现象**
  <row align="center" justify="between">
    页面刚打开
    <badge color="success">没有推荐请求</badge>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    滚动到推荐区域附近
    <badge color="info">开始请求</badge>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    请求完成
    <badge color="success">商品卡片出现</badge>
  </row>
</box>

在 Network 中找到：

```text
recommendations/products
```

重点检查 Request URL：

```text
product_id
section_id
limit
intent
```

然后打开 Response。

你应该能看到 Shopify 返回的 HTML，而不是 JSON。

### 实验 2：观察 DOM 前后的变化

在页面刚打开时执行：

```js
const el = document.querySelector(
  'product-recommendations'
);

console.log({
  productId: el.dataset.productId,
  sectionId: el.dataset.sectionId,
  url: el.dataset.url,
  cards: el.querySelectorAll('.grid__item').length
});
```

然后滚动到推荐区域附近，再执行一次。

观察：

```js
cards
```

是否从 0 变成了大于 0。

### 实验 3：观察两种推荐模块的区别

分别找到：

```js
document.querySelectorAll(
  'product-recommendations'
);
```

你可能会发现商品详情页中存在两个推荐组件：

- `related-products`
- `complementary-products`

分别检查：

```js
[...document.querySelectorAll(
  'product-recommendations'
)].map((el) => ({
  className: el.className,
  url: el.dataset.url,
  productId: el.dataset.productId,
  sectionId: el.dataset.sectionId
}));
```

你会发现两者的 URL 参数不同。

特别是：

```text
intent=complementary
```

这就是两种推荐策略的区别。

---

## 十二、再总结一下 Dawn 的架构设计

这一课我们实际上学到了五个非常值得掌握的设计思想。

| 设计思想 | Dawn 的实现 |
|---|---|
| 服务端数据驱动 | Shopify 提供 recommendations 对象 |
| 服务端 HTML 渲染 | Product Recommendations Section API |
| 按需加载 | IntersectionObserver |
| 组件化 | Web Components |
| 组件复用 | card-product Snippet |

另外需要注意：

Dawn 并不是简单地：

```text
请求 JSON
    ↓
JS 遍历商品
    ↓
JS 拼接 HTML
    ↓
插入页面
```

它采用的是：

```text
请求推荐接口
    ↓
Shopify 获取推荐商品
    ↓
Shopify 执行 Liquid
    ↓
Shopify 返回 HTML
    ↓
浏览器解析 HTML
    ↓
更新组件 DOM
```

这就是 Shopify Theme 开发区别于普通纯前端 SPA 开发的一个重要特点。

你需要同时理解：

- Shopify 服务端的 Liquid 渲染。
- Shopify Ajax API。
- 浏览器 DOM。
- Web Components。
- 异步加载与性能优化。

---

## 十三、本课练习题

我想用一个实际开发场景检验一下你是否真正理解了。

假设现在让你开发一个新的商品推荐模块，要求：

- 商品详情页底部展示 8 个相关商品。
- 首次打开页面不请求推荐数据。
- 距离视口底部 600px 时开始请求。
- Shopify 服务端生成商品卡片 HTML。
- 请求完成后插入页面。
- 如果没有推荐商品，就隐藏整个模块。

**问题：你会如何设计这套实现？**

我特别想知道你是否能讲清楚：

1. Liquid 中应该如何定义这个组件？
2. 如何通过 `data-*` 传递参数？
3. 如何使用 IntersectionObserver？
4. 应该调用 Shopify 的哪个接口？
5. 为什么选择 HTML 接口而不是 JSON 接口？
6. 没有推荐结果时如何处理？



## 参考资料

- [Product Recommendations API reference](https://shopify.dev/docs/api/ajax/reference/product-recommendations)
- [ProductRecommendationIntent - Storefront API](https://shopify.dev/docs/api/storefront/latest/enums/ProductRecommendationIntent)
- [productRecommendations - Storefront API](https://shopify.dev/docs/api/storefront/latest/queries/productRecommendations)
- [ProductRecommendationIntent - Storefront API](https://shopify.dev/docs/api/storefront/latest/enums/productrecommendationintent)
- [ProductRecommendationIntent - Storefront API](https://shopify.dev/docs/api/storefront/2026-07/enums/ProductRecommendationIntent)
- [productRecommendations - Storefront API](https://shopify.dev/docs/api/storefront/2027-01/queries/productRecommendations)
- [productRecommendations - Storefront API](https://shopify.dev/docs/api/storefront/latest/queries/productrecommendations)
- [productRecommendations - Storefront API](https://shopify.dev/docs/api/storefront/2026-01/queries/productRecommendations)
- [ProductRecommendationIntent - Storefront API](https://shopify.dev/docs/api/storefront/unstable/enums/productRecommendationIntent)
- [Product recommendations](https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations)
- [Product Recommendations API reference](https://shopify-dev.shopifycloud.com/docs/api/ajax/reference/product-recommendations)
- [productRecommendations - Storefront API](https://shopify-dev.shopifycloud.com/docs/api/storefront/2026-04/queries/productRecommendations)
