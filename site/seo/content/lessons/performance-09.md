# Shopify 商品详情页性能优化综合实战


这节课我们不再孤立地学习某个 API，而是模拟接手一个真实的 Shopify 商店，从发现性能问题到完成优化，把前八课的知识全部用起来。

我们要优化的页面包含：

- 商品主图和图片画廊。
- 商品标题、价格、库存、变体选择器。
- 加入购物车按钮和 Cart Drawer。
- 尺码指南、商品评论和相关推荐。
- 第三方营销和分析脚本。

我们的目标是同时优化两个维度：

**加载性能：** 用户能不能更快地看到商品内容？

**交互性能：** 用户切换变体、加入购物车时，页面能不能及时响应？

这两个目标必须同时考虑。仅仅为了提高 LCP 而延迟加载所有 JS，可能让用户第一次点击购买按钮时反而需要额外等待。

---

## 一、先看待优化的商品详情页

<box border radius="xl" padding={3} gap={3}>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <LessonImage src="assets/fill/img-03.jpg" alt="white modern running sneaker e-commerce product main image on plain warm white background studio photo"/>
        <grid columns={3} gap={1}>
          <grid-item>
            <LessonImage src="assets/fill/img-04.jpg" alt="white running sneaker product side view white studio background"/>
          </grid-item>
          <grid-item>
            <LessonImage src="assets/fill/img-05.jpg" alt="white sneaker outsole close up product studio photography"/>
          </grid-item>
          <grid-item>
            <LessonImage src="assets/fill/img-06.jpg" alt="white running sneaker product top view white background"/>
          </grid-item>
        </grid>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <text size="2xs" color="secondary">PRODUCT DETAIL · DEMO</text>
        <title size="md">轻量运动跑鞋</title>
        <title size="lg">¥499</title>
        <text color="secondary" size="xs">颜色：米白色</text>
        <row gap={1}>
          {#each ["#e7dfce","#3f4448","#a8b4b7"] as c,i}
            <box size="22px" radius="full" background={c} border={{size:i===0?2:1,color:i===0?"strong":"subtle"}}/>
          {/each}
        </row>
        <text color="secondary" size="xs">选择尺码</text>
        <grid columns={3} gap={1}>
          {#each ["39","40","41","42","43","44"] as sz,i}
            <grid-item>
              <box border radius="sm" padding={2} align="center" background={i===1?"surface-tertiary":undefined}>
                <text size="xs">{sz}</text>
              </box>
            </grid-item>
          {/each}
        </grid>
        <box background="#171717" radius="md" padding={2} align="center">
          <text color="#ffffff" weight="medium" size="xs">加入购物车</text>
        </box>
        <text color="secondary" size="xs">尺码指南 · 商品评价</text>
      </box>
    </grid-item>
  </grid>
  <caption>用于讲解页面结构的商品页示意，不是实际待优化网站，也不代表真实测量数据。</caption>
</box>

假设我们用 Chrome Performance 和 Shopify Theme Inspector 得到以下数据：

<box border radius="xl" padding={3} gap={2}>
  <text color="secondary" weight="medium" size="xs">优化前 · 模拟测试结果</text>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text size="xs" color="secondary">LCP</text>
        <title size="xl" color="danger" tabularNums>4.2s</title>
        <text color="secondary" size="xs">商品主图显示慢</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text size="xs" color="secondary">FCP</text>
        <title size="xl" tabularNums>2.1s</title>
        <text color="secondary" size="xs">页面首次内容出现</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text size="xs" color="secondary">交互延迟</text>
        <title size="xl" color="danger" tabularNums>420ms</title>
        <text color="secondary" size="xs">一次变体选择的呈现延迟</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text size="xs" color="secondary">初始 JS</text>
        <title size="xl" tabularNums>520KB</title>
        <text color="secondary" size="xs">模拟传输总量</text>
      </box>
    </grid-item>
  </grid>
  <caption>本课所有优化前后数值均为教学模拟数据，不是某个实际 Shopify 商店的测试结果。</caption>
</box>

你现在已经掌握足够多的浏览器知识，应该不会立即去压缩所有图片或给所有脚本加 `async`。

而是先确定：**哪些环节实际位于关键路径上？**

---

## 二、第一步：建立完整性能诊断链路

一次 Shopify 商品页导航可以拆成三条需要分别测量的路径。

<box border radius="xl" padding={3} gap={3}>
  <box gap={1}>
    **路径 A：服务端 Liquid**

    <row align="center" gap={1}>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">请求 HTML</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">Liquid 渲染</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">HTML 返回</text>
      </box>
    </row>
    <text color="secondary" size="xs">重点观察：主文档完整响应时间、Liquid Profile。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **路径 B：浏览器首次渲染**

    <row align="center" gap={1}>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">解析 HTML</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">请求关键资源</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">绘制 LCP</text>
      </box>
    </row>
    <text color="secondary" size="xs">重点观察：FCP、LCP Breakdown、图片请求和主线程。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **路径 C：用户交互**

    <row align="center" gap={1}>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">点击变体</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">更新状态</text>
      </box>
      <icon name="arrow-right" size="sm" color="tertiary"/>
      <box flex="1" background="surface-secondary" radius="sm" padding={2}>
        <text size="xs" textAlign="center">下一帧反馈</text>
      </box>
    </row>
    <text color="secondary" size="xs">重点观察：Input Delay、JS 执行、Layout、Presentation Delay。</text>
  </box>
</box>

这三条路径虽然相互影响，但分析工具不同。

例如，Chrome 的 Main Thread 可以告诉我们 JS 执行慢，却不能直接告诉我们 Liquid 的哪一行在 Shopify 服务端花了 200ms。

为此，Shopify 官方提供了 Theme Inspector，能够将 Section、Snippet、Liquid 过滤器等服务端执行开销显示为火焰图。

**这节课的优化顺序是：先优化服务器与首屏关键路径，再优化 JavaScript 和用户交互。**

---

## 三、第二步：优化 Liquid 服务端渲染

先来看一段可能存在问题的商品 Section。

假设我们希望输出商品的所有变体，每个变体都包含名称、价格、图片和自定义属性。

代码如下：

```liquid
{% for variant in product.variants %}

  <div class="variant">
    <span>{{ variant.title }}</span>

    <span>{{ variant.price | money }}</span>

    {% if variant.metafields.custom.label.value %}
      <span>
        {{ variant.metafields.custom.label.value }}
      </span>
    {% endif %}

    {{
      variant.image
      | image_url: width: 600
      | image_tag
    }}
  </div>

{% endfor %}
```

假设这个产品有大量变体。

这段代码可能带来两个问题。

#### 问题一：初始 HTML 输出太多

用户刚打开页面时，实际上只需要：

- 当前选中变体的价格。
- 当前库存状态。
- 当前变体的主图。
- 可选的颜色和尺寸信息。

但代码在服务端输出每个变体完整的 DOM 和图片标签。

这会增加 HTML 生成、传输、浏览器 DOM 构建及后续布局成本。

#### 问题二：重复进行不必要的 Liquid 操作

在循环中重复读取变体 Metafield、处理图片或嵌套渲染 Snippet，可能增加服务端渲染成本。

Shopify 当前的性能指南特别强调避免昂贵的嵌套循环、循环内重复 Metafield 访问和不必要的变体数据获取。

### 优化思路：只输出首屏真正需要的数据和内容

我们可以把渲染策略改成：

```text
服务端初始渲染
   ├── 当前商品标题
   ├── 当前变体价格
   ├── 当前变体主图
   └── 购买表单

用户后续操作
   ├── 选择其他变体
   ├── 更新价格与库存
   └── 必要时切换图片或更新 Section
```

比如首先输出选中变体：

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}

<div class="product-info">

  <h1>{{ product.title | escape }}</h1>

  <span data-product-price>
    {{ current_variant.price | money }}
  </span>

  <span data-product-availability>
    {% if current_variant.available %}
      有货
    {% else %}
      暂时缺货
    {% endif %}
  </span>

</div>
```

这里的关键不是说所有变体数据都应该删除。

而是根据页面所需功能，选择合适的数据策略：

- 变体较少时，可以在页面中提供经过精简的变体数据，便于客户端快速切换。
- 变体很多时，可以根据当前选项按需获取所需数据或局部 HTML。
- 如果价格展示依赖复杂促销、市场或应用逻辑，可以考虑 Shopify 服务端生成的最新 HTML，而不是让客户端独立重新计算所有规则。

**不要为了减少 Liquid 代码，就把本来可以由 Shopify 直接输出的首屏商品信息全部改成 JS 请求。**

这样可能只是在把服务端工作转移为浏览器的额外请求，反而推迟 FCP 或 LCP。

### 怎么证明 Liquid 优化有效？

先使用 Shopify Theme Inspector：

1. 对当前商品页生成 Liquid Profile。
2. 查看哪个 Section 或 Snippet 占用了最多时间。
3. 检查循环次数、重复过滤器及 Metafield 读取。
4. 修改后对同一页面重复测量。

特别注意 Shopify 的**流式 HTML**。

某些情况下，TTFB 很低，但 Section 的 HTML 仍在后续持续输出。

所以应该同时观察 Network 中主文档的完整响应时间，而不是仅凭 TTFB 判断 Liquid 是否优化成功。

---

## 四、第三步：优化首屏商品主图，解决 LCP

假设 Performance 显示：

<box border radius="xl" padding={3} gap={2}>
  **商品主图 LCP：4,200ms**
  <box direction="row" height="30px" gap="1px" radius="sm" clip>
    <box flex={650} background="#64748b" align="center" justify="center"><text color="#ffffff" size="2xs">650</text></box>
    <box flex={1200} background="#d97706" align="center" justify="center"><text color="#ffffff" size="2xs">1200</text></box>
    <box flex={1550} background="#3b82f6" align="center" justify="center"><text color="#ffffff" size="2xs">1550</text></box>
    <box flex={800} background="#0d9488" align="center" justify="center"><text color="#ffffff" size="2xs">800</text></box>
  </box>
  <table>
    <table-row><table-cell>TTFB</table-cell><table-cell align="end">650ms</table-cell></table-row>
    <table-row><table-cell>Resource Load Delay</table-cell><table-cell align="end">1,200ms</table-cell></table-row>
    <table-row><table-cell>Resource Load Duration</table-cell><table-cell align="end">1,550ms</table-cell></table-row>
    <table-row><table-cell>Element Render Delay</table-cell><table-cell align="end">800ms</table-cell></table-row>
  </table>
  <caption>教学模拟数据。</caption>
</box>

我们可以明确定位出三个问题。

### 问题一：图片被浏览器发现得太晚

假设原 Theme 使用了：

```liquid
<div class="product-image"
  style="
    background-image: url(
      '{{ product.featured_image | image_url: width: 1600 }}'
    )
  ">
</div>
```

如果这个背景图片 URL 直接出现在 HTML 的内联样式中，浏览器可以在样式解析时发现它；如果它被写在外部 CSS 或由 JS 生成，发现时间可能更晚。

对于商品主图，更建议使用真正的 `<img>` 元素。

这不仅便于提前发现，还支持响应式图片、尺寸信息和资源优先级提示。

### 问题二：商品主图被懒加载了

假设原代码：

```liquid
{{
  product.featured_image
  | image_url: width: 1600
  | image_tag: loading: 'lazy'
}}
```

但这张图片就在首屏，而且是 LCP 元素。

这时 `loading="lazy"` 可能推迟图片请求的发起时机。

所以应该调整为 eager。

### 问题三：图片加载后还需要等待动画

例如：

```css
.product-main-image {
  opacity: 0;
  transition: opacity 800ms;
}

.product-main-image.loaded {
  opacity: 1;
}
```

如果 LCP 元素直到动画结束或可见状态变化后才被计入 LCP，就可能出现很高的 Element Render Delay。

对于首屏主图，没有充分理由时不建议添加延迟显现的动画。

### 改造后的 Shopify Liquid

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}

{% assign main_image = current_variant.featured_image
  | default: product.featured_image
%}

{% if main_image %}
  {{
    main_image
    | image_url: width: 1600
    | image_tag:
      class: 'product-main-image',
      loading: 'eager',
      fetchpriority: 'high',
      widths: '360, 540, 720, 900, 1200, 1600',
      sizes: '(min-width: 990px) 50vw, 100vw'
  }}
{% endif %}
```

现在浏览器能够获得：

- 可直接发现的图片 URL。
- `srcset` 图片宽度候选。
- 根据实际布局设置的 `sizes`。
- 正确的图片宽高与纵横比信息。
- `eager` 加载策略。
- `fetchpriority="high"` 优先级提示。

对于页面中的其他商品细节图，我们可以考虑：

```liquid
{{
  media.preview_image
  | image_url: width: 1000
  | image_tag:
    loading: 'lazy',
    widths: '300, 500, 700, 1000',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

但不要把所有其他图片都无条件 lazy-load。

比如桌面端商品画廊可能在首屏同时显示三张图片，这三张都属于当前视口内容；加载策略需要以实际布局为准。

#### 什么时候还需要 preload？

如果主图已经出现在很早的 HTML 中，浏览器能够快速发现它，未必需要额外 `preload`。

如果图片地址在流式 HTML 中出现得较晚，或者实测发现 Resource Load Delay 明显偏高，可以测试 Shopify `image_tag: preload: true`。

Shopify 官方当前的建议是谨慎使用 preload，将资源预算集中在极少数真正关键的资源上。

---

## 五、第四步：优化 JavaScript 加载架构

现在商品主图的 LCP 问题已经有了明确方向。

接下来查看我们模拟商店的 JavaScript。

原来：

```liquid
<!-- layout/theme.liquid -->

<script src="{{ 'theme.js' | asset_url }}"></script>

<script src="{{ 'product.js' | asset_url }}"></script>

<script src="{{ 'reviews.js' | asset_url }}"></script>

<script src="{{ 'recommendation.js' | asset_url }}"></script>

<script src="{{ 'size-guide.js' | asset_url }}"></script>
```

有三个问题：

首先，普通同步脚本可能阻塞 HTML 主解析器。

其次，评论、推荐和尺码指南未必需要在页面初始阶段加载。

最后，这些代码的执行可能和商品主图下载、解码及首次渲染发生竞争。

### 优化后的加载策略

<box border radius="lg" padding={3} gap={2}>
  <table>
    <table-row>
      <table-cell width="43%"><text weight="medium">功能</text></table-cell>
      <table-cell><text weight="medium">加载策略</text></table-cell>
    </table-row>
    <table-row><table-cell>Header、基础页面交互</table-cell><table-cell>全站轻量入口脚本</table-cell></table-row>
    <table-row><table-cell>商品变体、购买表单</table-cell><table-cell>商品页尽早加载</table-cell></table-row>
    <table-row><table-cell>购物车抽屉</table-cell><table-cell>基础交互及时准备，复杂增强可按需加载</table-cell></table-row>
    <table-row><table-cell>尺码指南</table-cell><table-cell>按点击或使用意图加载</table-cell></table-row>
    <table-row><table-cell>商品评论</table-cell><table-cell>接近视口时加载</table-cell></table-row>
    <table-row><table-cell>推荐商品</table-cell><table-cell>优先服务端输出必要内容，复杂交互延迟初始化</table-cell></table-row>
  </table>
</box>

可以在 `theme.liquid` 中按页面类型加载：

```liquid
<script
  src="{{ 'theme.js' | asset_url }}"
  defer
></script>

{% if request.page_type == 'product' %}
  <script
    src="{{ 'product.js' | asset_url }}"
    defer
  ></script>
{% endif %}
```

这样商品页至少不会加载集合筛选等无关功能。

对于尺码指南这样非关键的模块，再进一步使用上一课介绍的 `import()`。

#### 评论模块怎么做到接近视口再加载？

假设评论区域：

```html
<section id="product-reviews">
  <!-- 评论内容 -->
</section>
```

可以采用 `IntersectionObserver`：

```js
const reviews = document.querySelector("#product-reviews");

if (reviews) {
  const observer = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      observer.disconnect();

      try {
        const { initReviews } = await import("./reviews.js");
        initReviews(reviews);
      } catch (error) {
        console.error("评论模块加载失败", error);
      }
    },
    {
      rootMargin: "300px 0px"
    }
  );

  observer.observe(reviews);
}
```

`rootMargin: "300px 0px"` 可以让评论模块在进入视口前约 300px 时就开始加载。

这是一种**提前但不过早**的加载策略。

不过，只有当 `reviews.js` 是实际可由浏览器解析的 ES Module URL 时，上述原生相对路径才成立；在 Shopify 生产 Theme 中，应使用 Liquid 生成的版本化资源地址或 Import Map，避免硬编码无效的资源路径。

Shopify 官方也推荐通过用户交互或接近可见区域等信号加载非关键 JavaScript。

---

## 六、第五步：优化商品变体切换

现在进入交互性能。

假设用户从红色商品切换到蓝色商品。

系统需要：

- 更新价格。
- 更新库存状态。
- 更新购买按钮。
- 切换主图。
- 可能更新 SKU、URL、销售计划和其他商品信息。

原来的实现是：

```js
variantSelector.addEventListener("change", () => {
  recalculateAllProductData();

  rebuildProductInformationDOM();

  rebuildEntireGallery();

  reinitializeAllEventListeners();
});
```

这种写法可能做了大量不必要的工作。

**即使用户只切换一个尺码，也重新创建整个商品区域。**

会有什么后果？

```text
切换变体
   ↓
复杂 JavaScript 计算
   ↓
删除大量旧 DOM
   ↓
创建大量新 DOM
   ↓
重新计算样式
   ↓
Layout / Paint
   ↓
页面反馈
```

问题可能出现在 JS 执行阶段，也可能出现在渲染阶段。

### 优化一：把需要更新的状态与 DOM 范围缩小

对于简单商品，我们可以直接利用 Liquid 提供变体信息。

例如，教学中使用一个原生变体下拉框：

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}

<form data-product-form>

  <select name="id" data-variant-selector>
    {% for variant in product.variants %}
      <option
        value="{{ variant.id }}"
        data-price="{{ variant.price | money | escape }}"
        data-available="{{ variant.available }}"
        {% if variant.id == current_variant.id %}
          selected
        {% endif %}
      >
        {{ variant.title | escape }}
      </option>
    {% endfor %}
  </select>

  <p data-product-price>
    {{ current_variant.price | money }}
  </p>

  <button
    type="submit"
    data-add-to-cart
    {% unless current_variant.available %}disabled{% endunless %}
  >
    加入购物车
  </button>

</form>
```

这只是一个简化的变体选择器，适合理解性能优化原理。实际商城的颜色、尺码等多个 Option 需要正确映射到变体，还要处理销售计划、库存限制和变体数量等情况。

对应 JS：

```js
const form = document.querySelector("[data-product-form]");

if (form) {
  const selector = form.querySelector("[data-variant-selector]");
  const price = form.querySelector("[data-product-price]");
  const button = form.querySelector("[data-add-to-cart]");

  selector.addEventListener("change", () => {
    const option = selector.selectedOptions[0];

    price.textContent = option.dataset.price;

    const available = option.dataset.available === "true";

    button.disabled = !available;
    button.textContent = available ? "加入购物车" : "暂时缺货";
  });
}
```

这段代码的特点是：

**用户改变变体时，只更新真正发生变化的几个 DOM 节点。**

不需要重新创建整个商品详情页。

也不需要为每次简单切换都重新请求完整 HTML。

当然，如果业务涉及复杂定价、库存或动态优惠，则还需要从 Shopify 获取权威数据并同步状态，不能仅依赖初次页面中的静态 `data-*` 属性。

### 优化二：商品图片不要每次重建整个画廊

假设当前页面已经有多个商品媒体元素：

```text
Product Gallery
  ├── Media 1001
  ├── Media 1002
  ├── Media 1003
  └── Media 1004
```

某个变体关联 Media 1003。

那么可以优先考虑激活已有的 Media 1003，而不是：

```js
gallery.innerHTML = newGalleryHTML;
```

例如：

```js
function activateMedia(gallery, mediaId) {
  const items = gallery.querySelectorAll("[data-media-id]");

  for (const item of items) {
    item.hidden = item.dataset.mediaId !== String(mediaId);
  }
}
```

这个例子表达的是“更新已有媒体节点”的思路，不是说所有图片画廊都应该使用 `hidden`。

对于缩略图列表、横向滚动 Gallery、Swiper 类组件，可能更适合改变活动索引或滚动到目标媒体。

而且切换图片时仍然要考虑加载、解码和可能的布局偏移。

真正的优化目标是：

**减少无意义的 DOM 重建，同时保证状态正确。**

---

## 七、第六步：优化加入购物车与 Cart Drawer

这是 Shopify Theme 中非常值得深入的性能优化场景。

你之前已经学习过：

- Cart Ajax API。
- Section Rendering API。
- 加购和立即购买的区别。
- Cart Drawer 及局部 HTML 更新。

现在把这些知识和性能优化结合起来。

### 1. 先看一个低效的购物车更新方式

```js
async function addToCart(variantId) {
  await fetch("/cart/add.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: [{ id: variantId, quantity: 1 }]
    })
  });

  window.location.reload();
}
```

这段代码有两个明显问题。

首先，它没有检查请求是否成功。

其次，完成加购后直接刷新整个页面。

这样用户可能需要重新加载主文档、重新执行页面脚本、重新构建 DOM，并经历新一轮渲染。

即使静态资源命中缓存，整个导航也不是零成本。

更合理的方式通常是：

**通过 Cart Ajax API 更新购物车，然后只刷新需要变化的购物车区域。**

### 2. 利用 Bundled Section Rendering

Shopify 支持在 Cart Ajax API 的一次操作中，请求返回需要更新的 Section HTML。

例如：

```js
const response = await fetch(
  window.Shopify.routes.root + "cart/add.js",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: [
        {
          id: selectedVariantId,
          quantity: 1
        }
      ],
      sections: [
        "cart-drawer",
        "cart-icon-bubble"
      ],
      sections_url: window.location.pathname
    })
  }
);

const data = await response.json();
```

假设这两个 Section ID 在当前 Theme 中确实存在。

响应可以包含：

```json
{
  "items": [
    {
      "id": 123456,
      "quantity": 1
    }
  ],
  "sections": {
    "cart-drawer": "<div>购物车抽屉 HTML...</div>",
    "cart-icon-bubble": "<div>购物车数量 HTML...</div>"
  }
}
```

这样就不需要先调用一次加购 API，再为了购物车抽屉单独调用一次 Section Rendering API。

但这里有一个非常重要的 Shopify 细节：

**加购成功，不代表请求返回的每一个 Section HTML 一定成功渲染。**

官方文档明确说明，Section 是在购物车修改之后渲染的。某个 Section 渲染失败时，其值可能为 `null`，而购物车修改本身已经成功。

所以真实项目不能简单写成：

```js
drawer.innerHTML = data.sections["cart-drawer"];
```

然后认为一定不会出错。

### 3. 一种更可靠的更新实现

下面给出购物车核心流程的简化版本。

假设 Theme 中存在两个静态 Section，其外层 ID 分别是：

`shopify-section-cart-drawer` 和 `shopify-section-cart-icon-bubble`。

```js
const sectionIds = [
  "cart-drawer",
  "cart-icon-bubble"
];

function replaceSection(sectionId, html) {
  if (!html) return false;

  const current = document.getElementById(
    `shopify-section-${sectionId}`
  );

  const doc = new DOMParser().parseFromString(
    html,
    "text/html"
  );

  const next = doc.getElementById(
    `shopify-section-${sectionId}`
  );

  if (!current || !next) return false;

  current.replaceWith(next);

  return true;
}

async function fetchCartSections() {
  const url = new URL(window.location.href);

  url.searchParams.set(
    "sections",
    sectionIds.join(",")
  );

  const response = await fetch(url, {
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error("购物车区域刷新失败");
  }

  return response.json();
}

async function addToCart(variantId, quantity = 1) {
  const response = await fetch(
    window.Shopify.routes.root + "cart/add.js",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{ id: variantId, quantity }],
        sections: sectionIds,
        sections_url: window.location.pathname
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.description || "加入购物车失败"
    );
  }

  let sections = data.sections;

  // Section 渲染不完整时，单独获取最新 HTML
  if (
    !sections ||
    sectionIds.some((id) => !sections[id])
  ) {
    sections = await fetchCartSections();
  }

  for (const id of sectionIds) {
    if (!replaceSection(id, sections?.[id])) {
      console.warn("Section 更新失败:", id);
    }
  }

  return data;
}
```

这段代码的重点不在于复制到任意 Theme 就能直接运行，而在于设计思路。

它做了几件重要的事情：

- 使用 locale-aware 的 Shopify Cart API 路径。
- 尝试在一次加购请求中获取需要的 Section HTML。
- 检查加购请求是否成功。
- 处理 Section HTML 缺失的情况。
- 不因为 Section 渲染失败就重复提交加购请求。
- 只替换购物车相关的 Section，而不是刷新整页。

真实 Theme 中的 Section ID 可能是动态的。完整项目还需要适配真实 DOM、抽屉打开状态、焦点管理、错误提示及重复提交控制。

特别是 `replaceWith()` 会移除原有节点，因此若原节点绑定了事件或保存了组件实例状态，需要在更新后正确重新初始化，或通过事件委托等方式管理。

### 4. 购物车响应快，不代表 INP 一定好

假设加购 API 需要 500ms。

点击之后，如果我们只是：

```js
await addToCart(variantId);
```

用户可能在等待期间看不到任何变化。

更好的交互流程是：

```text
用户点击加入购物车
       ↓
立即禁用重复提交并显示 Loading
       ↓
发起 Ajax 请求
       ↓
等待过程中保持页面可交互
       ↓
取得最新 Cart Section HTML
       ↓
更新购物车相关 DOM
       ↓
打开抽屉并恢复合理的焦点状态
```

需要注意：

API 网络耗时不直接等于 INP。

如果点击后及时显示反馈，初始交互的响应可能很好，但最终购物车的更新仍需要等待网络和服务器。

更进一步，还可以采用乐观更新：

在服务器确认之前，使用当前商品信息暂时显示新增的购物车项，然后用 Shopify 实际返回的数据校正。

不过乐观更新必须考虑库存失败、促销价格、重复点击和回滚，不能将客户端猜测的价格视为最终成交价格。

Shopify 官方性能指南也讨论了局部 Section 更新及乐观购物车渲染的适用场景。

---

## 八、第七步：优化第三方 App 对页面的影响

假设我们已经：

- 优化了 Liquid。
- 让商品主图更早下载。
- 拆分了 JavaScript。
- 减少了不必要的 DOM 更新。

但 Performance 仍然发现首屏有一个持续 450ms 的 JavaScript 长任务。

打开调用栈，发现它来自一个第三方营销 App。

这时继续压缩你自己写的 `product.js`，很可能不是最佳选择。

### 如何评估第三方脚本？

先区分两件事：

**网络成本**：脚本下载了多少 KB，占用了多少带宽？

**执行成本**：脚本下载完成后，实际占用了多少主线程时间？

假设三个 App 的测量结果如下：

| App | JS 传输 | 主线程耗时 |
|---|---:|---:|
| 评论 App | 90KB | 45ms |
| 营销弹窗 App | 45KB | 280ms |
| 在线客服 App | 150KB | 75ms |

这些都是模拟数据。

虽然营销弹窗的 JS 文件最小，但它的主线程执行成本最大。

如果这项执行发生在 LCP 前，它就可能是比其他脚本更重要的优化目标。

#### 可以采用哪些措施？

第一，检查 App 是否还有业务价值。

第二，检查它是否必须在所有页面加载。

第三，检查是否可以通过 App Embed 设置限制加载范围，或通过应用提供的设置调整执行时机。

第四，如果需要首屏运行，检查是否有更轻量的替代方案。

第五，优化后重新测量功能正确性和转化相关指标。

Shopify 官方也将第三方 App 注入的同步脚本和阻塞 CSS 列为影响 FCP、LCP 的常见原因。

但不建议在 Theme 中直接用不可靠的方法拦截或删除 App 的所有脚本请求。这可能破坏支付、合规或商店必要功能。

---

## 九、第八步：用真实测量验证优化效果

到这里，我们已经对商品详情页的几个主要部分做了优化。

但是现在还不能直接得出“网站性能已经改善”的结论。

我们必须重新测量。

### 1. 建立优化前后对比

假设在相同测试条件下，我们获得以下结果：

| 性能指标 | 优化前 | 优化后 |
|---|---:|---:|
| TTFB | 650ms | 590ms |
| FCP | 2.1s | 1.4s |
| LCP | 4.2s | 2.1s |
| CLS | 0.18 | 0.04 |
| 初始 JS 传输量 | 520KB | 210KB |
| 最长 JS 任务 | 450ms | 90ms |
| 某次变体交互延迟 | 420ms | 110ms |

<Chart content={{"chartType":"bar","meta":{"title":"模拟商品页优化前后关键指标","description":"单位：毫秒。数值仅用于解释分析方法。"},"xKey":"metric","series":[{"dataKey":"before","label":"优化前"},{"dataKey":"after","label":"优化后"}],"yAxisMin":0,"data":[{"metric":"TTFB","before":650,"after":590},{"metric":"FCP","before":2100,"after":1400},{"metric":"LCP","before":4200,"after":2100},{"metric":"变体交互延迟","before":420,"after":110}]}}/>

我们应该怎样分析结果？

#### 首先看 TTFB

650ms → 590ms，仅仅减少了 60ms。

这意味着服务器与网络到首字节阶段的改善相对较小。

但如果 Shopify 采用了流式 HTML，Liquid 优化带来的收益也可能表现为主文档后续内容更早到达，不能只看 TTFB。

#### 然后看 FCP

2.1s → 1.4s，明显改善。

这可能与提前加载关键 CSS、减少同步 JavaScript 和缩短 HTML 关键内容输出时间有关。

#### 最后看 LCP

4.2s → 2.1s，改善最明显。

但我们不能仅凭这一组数字就断定原因。

应重新打开 LCP Breakdown，确认究竟是：

- 图片发现延迟缩短。
- 图片下载时间减少。
- 图片解码和渲染更及时。
- 还是上述几项共同改善。

**优化前后的指标变化告诉我们结果，Performance 调用栈和请求时间线帮助我们确定原因。**

---

## 十、一个完整的 Shopify 性能排查工具链

现在你应该拥有一套可以实际应用的诊断方法。

<box border radius="xl" padding={3} gap={3}>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="file-code" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Shopify Theme Check**

      用来检查代码中的可识别问题，例如部分解析阻塞脚本、缺失图片尺寸及不推荐的 Theme 写法。

      ```bash
      shopify theme check
      ```
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="flame" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Shopify Theme Inspector**

      分析 Liquid 服务端渲染，找出耗时最高的 Section、Snippet、循环和过滤器。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="network" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Chrome Network**

      查看 HTML 完整响应、关键资源发起时间、缓存、传输大小及请求优先级。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="activity" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Chrome Performance**

      分析 LCP Breakdown、主线程长任务、JavaScript 调用栈和交互呈现延迟。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="chart-no-axes-column" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Lighthouse + 真实用户监控**

      通过可重复的实验室测试以及真实用户的 LCP、INP、CLS 数据，验证优化是否真正有效。
    </box>
  </row>
</box>

Theme Check 已集成 Shopify CLI 和 Shopify Liquid VS Code 扩展，而 Theme Inspector 则主要用于 Liquid 服务端性能分析。两者解决不同问题。

---

## 十一、实战练习：尝试自己诊断一个问题

假设你打开另一个 Shopify 商品页，获得以下数据。

<box border radius="xl" padding={3} gap={2}>
  **性能录制结果（模拟）**

  <table>
    <table-row><table-cell>TTFB</table-cell><table-cell align="end">450ms</table-cell></table-row>
    <table-row><table-cell>HTML 完整接收</table-cell><table-cell align="end">1,800ms</table-cell></table-row>
    <table-row><table-cell>商品主图请求开始</table-cell><table-cell align="end">1,850ms</table-cell></table-row>
    <table-row><table-cell>商品主图下载完成</table-cell><table-cell align="end">2,600ms</table-cell></table-row>
    <table-row><table-cell>LCP</table-cell><table-cell align="end">2,750ms</table-cell></table-row>
  </table>
</box>

{@body const [answer,setAnswer]=DIL.useState("server")}
{@body const [revealed,setRevealed]=DIL.useState(false)}
<box border radius="xl" padding={3} gap={3}>
  **你认为最应该优先排查什么？**

  <radio-group direction="col" value={answer} onChange={(v)=>{setAnswer(v);setRevealed(false);}}>
    <radio value="image">图片文件太大，应该先压缩图片</radio>
    <radio value="server">HTML 后续输出较慢，导致图片发现较晚</radio>
    <radio value="js">主线程 JS 长任务导致图片渲染缓慢</radio>
    <radio value="cache">浏览器缓存配置有问题</radio>
  </radio-group>
  <button block onClick={()=>setRevealed(true)}>查看诊断分析</button>
  {#if revealed}
    <divider color="subtle"/>
    {#if answer==="server"}
      <row align="center" gap={2}>
        <icon name="check-circle" color="success"/>
        **这是当前最值得优先验证的方向。**
      </row>
    {:else}
      <row align="center" gap={2}>
        <icon name="info" color="secondary"/>
        **这个方向不能排除，但不是当前最明显的线索。**
      </row>
    {/if}
    <text size="sm">TTFB 只有 450ms，但完整 HTML 到 1,800ms 才接收完成。主图到 1,850ms 才发起请求，而且下载完成后仅约 150ms 就发生 LCP。这提示我们应重点检查 Shopify 流式 HTML 中商品 Section 的输出时机、图片 URL 的发现链路，以及服务端 Liquid 渲染是否导致等待。</text>
    <text size="sm" color="secondary">下一步使用 Shopify Theme Inspector 检查 Liquid，并结合 Network 的主文档 Timing、主图 Initiator 和 LCP Breakdown 验证，而不是直接认定某一个原因。</text>
  {/if}
</box>

这个案例非常适合检验你有没有真正理解前面八课的知识。

---

## 十二、第 9 课总结：形成完整的性能工程思维

经过这次实战，我们把 Shopify 商品详情页的性能优化串成了一条完整链路：

```text
一次商品详情页访问
        │
        ├── Shopify 服务端
        │     ├── Liquid 循环和数据访问
        │     ├── Section / Snippet 渲染
        │     └── HTML 流式响应
        │
        ├── 浏览器页面加载
        │     ├── CSS、JS 解析阻塞关系
        │     ├── 商品主图请求优先级
        │     ├── 图片下载及解码
        │     └── Layout / Paint / Composite
        │
        ├── JavaScript 运行
        │     ├── 全局初始化
        │     ├── 非关键模块按需加载
        │     └── 第三方 App 运行开销
        │
        └── 用户操作
              ├── 商品变体切换
              ├── 购物车 Ajax 请求
              ├── Section 局部更新
              └── DOM 更新与交互呈现
```

这里我最希望你记住的是：

**性能优化不是一组固定的技巧，而是一种基于证据识别瓶颈、控制关键路径、减少不必要工作的工程方法。**

对于 Shopify Theme 开发，尤其要区分三个层次：

**Shopify 服务端性能**：Liquid 和 Section 是否高效生成 HTML。

**浏览器加载性能**：CSS、JS、图片是否以正确的顺序和优先级加载。

**运行时交互性能**：JavaScript 是否产生长任务、是否不必要地重建 DOM，以及 Ajax 和 Section 更新是否高效。

这三者都会影响用户体验，但采用的测量方法和优化手段不同。

## 参考资料

- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Shopify Theme Inspector for Chrome](https://shopify.dev/docs/storefronts/themes/tools/theme-inspector)
- [Liquid filters: image_tag](https://shopify.dev/docs/api/liquid/filters/image_tag)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [Identify Liquid render issues using Shopify Theme Inspector](https://shopify.dev/docs/storefronts/themes/tools/theme-inspector/using-the-theme-inspector)
- [Use the Section Rendering API for dynamic updates](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api)
- [Testing for performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Finding and ranking your worst JavaScript offenders](https://shopify.dev/docs/storefronts/themes/best-practices/performance/finding-worst-offenders)
- [Tools for building Shopify themes](https://shopify.dev/docs/storefronts/themes/tools)
- [Avoid request proxies](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-request-proxies)
- [Load JavaScript on user interaction](https://shopify.dev/docs/storefronts/themes/best-practices/performance/load-javascript-on-user-interaction)
- [Load above-the-fold and below-the-fold sections differently with section.index](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-index)
- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check)
- [Theme Check commands](https://shopify.dev/docs/storefronts/themes/tools/theme-check/commands)
- [Mark the LCP image with fetchpriority="high"](https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image)
- [Remove or optimize apps causing render-blocking issues](https://shopify.dev/docs/storefronts/themes/best-practices/performance/remove-render-blocking-apps)
- [Use preload resource hints sparingly](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-preload-resource-hints-sparingly)
- [Don't use CSS background-image for LCP content](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-background-images-hero)
- [Sections API is sometimes returning null - Shopify App Store - Shopify Developer Community Forums](https://community.shopify.dev/t/sections-api-is-sometimes-returning-null/39219)
