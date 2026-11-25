<h1><span><strong>第 5 课：Shopify 电商网站无障碍整改实战</strong></span></h1>

<span><span>建议时长：50 分钟</span></span>

<p><span>前四课已经介绍了日常无障碍整改需要的主要技术。本课将这些知识应用到公司实际的 Shopify 电商项目中。</span></p>

<p><span>Shopify 官方也提供了 </span><span><a href="https://shopify.dev/docs/storefronts/themes/best-practices/accessibility?utm_source=chatgpt.com"><span><span>Theme Accessibility Best Practices</span></span></a></span><span>，可以作为日常开发的参考。</span> <a class="training-source" href="https://shopify.dev/docs/storefronts/themes/best-practices/accessibility" aria-label="Shopify：Accessibility best practices for Shopify themes"><img src="content/training-assets/image-e02bfd934cc3.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>Shopify</span><span class="training-source-preview" aria-hidden="true"><small>Shopify</small><strong>Accessibility best practices for Shopify themes</strong><small>shopify.dev</small></span></a></p>

<h2><span><strong>5.1 Header 与导航</strong></span></h2>

<div class="training-box"><div class="training-box"><p><span>Skip to content</span></p></div><div class="training-box"><p><span>Free shipping on eligible orders</span></p></div><div class="training-box"><p class="training-example-heading"><strong><span><strong>STORE</strong></span></strong></p></div><div class="training-box"><p><span>Home</span></p><div class="training-box"><p><span>Clothing</span></p></div><p><span>Accessories</span></p><p><span>Sale</span></p></div><hr><div class="training-box"><p class="training-example-heading"><strong><span><strong>Summer collection</strong></span></strong></p><p><span>Discover our new arrivals.</span></p><div class="training-box"><div class="training-box"><p><span>Shop now</span></p></div></div></div></div>

<h3><span><strong>Header 整改重点</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="Header 整改重点"><table><tbody><tr><th scope="row"><p><span>元素</span></p></th><th scope="row"><p><span>检查内容</span></p></th></tr><tr><td><p><span>Skip Link</span></p></td><td><p><span>是否能够跳过重复导航</span></p></td></tr><tr><td><p><span>Logo</span></p></td><td><p><span>图片 alt、首页链接名称</span></p></td></tr><tr><td><p><span>Navigation</span></p></td><td><p><span>nav 语义、当前页面状态</span></p></td></tr><tr><td><p><span>Mega Menu</span></p></td><td><p><span>键盘操作、展开状态</span></p></td></tr><tr><td><p><span>Search</span></p></td><td><p><span>按钮名称、搜索弹窗焦点</span></p></td></tr><tr><td><p><span>Account</span></p></td><td><p><span>链接名称</span></p></td></tr><tr><td><p><span>Cart Icon</span></p></td><td><p><span>按钮名称、购物车数量</span></p></td></tr><tr><td><p><span>Announcement Bar</span></p></td><td><p><span>对比度、自动滚动控制</span></p></td></tr></tbody></table></div></div></div>

<h3><span><strong>实战一：Skip Link</strong></span></h3>

<p><span>Skip Link 可以帮助键盘用户跳过 Header，直接进入页面主要内容。</span></p>

<p><span>在 </span><code><span>layout/theme.liquid</span></code><span> 中：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;a class="skip-link" href="#MainContent"&gt;
  Skip to content
&lt;/a&gt;

{% sections 'header-group' %}

&lt;main id="MainContent" tabindex="-1"&gt;
  {{ content_for_layout }}
&lt;/main&gt;

{% sections 'footer-group' %}</code></pre>

<p><span>CSS：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 9999;
  padding: 12px 20px;
  background: #fff;
  color: #222;
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: translateY(0);
  outline: 2px solid #005fcc;
}</code></pre>

<p><span>正常浏览时隐藏，用户通过 Tab 聚焦时显示。</span></p>

<h3><span><strong>实战二：当前导航页面</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">{% for link in section.settings.menu.links %}

  &lt;a
    href="{{ link.url }}"
    {% if link.current %}
      aria-current="page"
    {% endif %}
  &gt;
    {{ link.title | escape }}
  &lt;/a&gt;

{% endfor %}</code></pre>

<p><span>通过 aria-current 表达当前页面，而不是只依赖 active CSS class。</span></p>

<hr>

<h2><span><strong>5.2 Homepage 首页</strong></span></h2>

<p><span>首页通常存在大量营销图片、Banner、Carousel 和动态公告。</span></p>

<p><span>重点整改：</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="5.2 Homepage 首页"><table><tbody><tr><th scope="row"><p><span>常见问题</span></p></th><th scope="row"><p><span>修复方案</span></p></th></tr><tr><td><p><span>Banner 中的促销信息只有图片</span></p></td><td><p><span>提供等效文字信息</span></p></td></tr><tr><td><p><span>白色文字覆盖浅色图片</span></p></td><td><p><span>调整文字、背景或遮罩</span></p></td></tr><tr><td><p><span>Shop now 链接没有明确上下文</span></p></td><td><p><span>补充目的地信息</span></p></td></tr><tr><td><p><span>自动轮播无法暂停</span></p></td><td><p><span>提供暂停控制</span></p></td></tr><tr><td><p><span>轮播隐藏内容仍可聚焦</span></p></td><td><p><span>隔离非活动内容</span></p></td></tr><tr><td><p><span>自动播放视频</span></p></td><td><p><span>提供适用的媒体控制及字幕</span></p></td></tr></tbody></table></div></div></div>

<p><span>例如商家上传了一张带有文字的促销 Banner：</span></p>

<div class="training-box"><p><span>SUMMER SALE</span></p><p class="training-example-heading"><strong><span><strong>UP TO 50% OFF</strong></span></strong></p><p><span>Selected styles</span></p><div class="training-box"><div class="training-box"><p><span>Shop the sale</span></p></div></div></div>

<p><span>如果这些信息全部位于图片内部，则需要提供相应的文字替代。</span></p>

<p><span>更推荐使用真实 HTML 文字叠加在图片上，而不是把所有营销信息制作成一张图片。这样也有利于响应式布局、多语言和文字缩放。</span></p>

<h2><span><strong>5.3 Collection 商品列表页</strong></span></h2>

<div class="training-box"><p class="training-example-heading"><strong><span><strong>Clothing</strong></span></strong></p><div class="training-box"><span><span>24 products</span></span><div class="training-box"><div class="training-box"><p><span>Sort by: Best selling</span></p></div></div></div><div class="training-box"><div class="training-box"><p><span><span><strong>Filters</strong></span></span></p><hr><p><span>Color</span></p><div class="training-box"><p><span>Black</span></p></div><div class="training-box"><p><span>White</span></p></div><div class="training-box"><p><span>Blue</span></p></div><hr><p><span>Price</span></p><div class="training-box"><span><span>$0</span></span></div><div class="training-box"><span><span>$100</span></span></div></div><div class="training-box"><div class="training-grid"><div class="training-box"><div class="training-box"><div class="training-box"><img src="content/training-assets/image-908157996b87.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><p><span>Cotton T-shirt</span></p><span><span>$29.99</span></span><div class="training-box"><p><span>Quick add</span></p></div></div></div><div class="training-box"><div class="training-box"><div class="training-box"><img src="content/training-assets/image-f26b1ddc300f.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><p><span>Classic shirt</span></p><span><span>$39.99</span></span><div class="training-box"><p><span>Quick add</span></p></div></div></div><div class="training-box"><div class="training-box"><div class="training-box"><img src="content/training-assets/image-34ea1288f371.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><p><span>Linen top</span></p><span><span>$49.99</span></span><div class="training-box"><p><span>Quick add</span></p></div></div></div><div class="training-box"><div class="training-box"><div class="training-box"><img src="content/training-assets/image-11ba7de7cb27.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><p><span>Casual jacket</span></p><span><span>$89.99</span></span><div class="training-box"><p><span>Quick add</span></p></div></div></div></div></div></div><hr><div class="training-box"><p><span><span><strong>1</strong></span></span><span>2 3</span></p></div></div>

<h3><span><strong>实战一：商品卡片</strong></span></h3>

<p><span>推荐使用普通列表结构，不要因为视觉采用 CSS Grid，就给商品列表设置 role="grid"。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;ul class="product-grid" role="list"&gt;
  {% for product in collection.products %}
    &lt;li&gt;
      {% render 'card-product', card_product: product %}
    &lt;/li&gt;
  {% endfor %}
&lt;/ul&gt;</code></pre>

<p><span>商品卡片中的图片链接、标题链接和 Quick Add 应具有明确的语义。</span></p>

<p><span>Quick Add 按钮示例：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button
  type="button"
  aria-label="Quick add: {{ product.title | escape }}"
&gt;
  Quick add
&lt;/button&gt;</code></pre>

<p><span>不要将 Quick Add 按钮放在商品链接内部。</span></p>

<h3><span><strong>实战二：筛选器</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;fieldset&gt;
  &lt;legend&gt;Color&lt;/legend&gt;

  &lt;label&gt;
    &lt;input type="checkbox" name="color" value="Black"&gt;
    Black
  &lt;/label&gt;

  &lt;label&gt;
    &lt;input type="checkbox" name="color" value="White"&gt;
    White
  &lt;/label&gt;
&lt;/fieldset&gt;</code></pre>

<p><span>使用原生 Checkbox，浏览器自动提供选中状态和键盘操作。</span></p>

<p><span>实际 Shopify 项目中，应使用 Filter Value 提供的 name、value 和 active 数据生成对应控件。</span></p>

<h3><span><strong>实战三：商品结果数量</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;p id="ProductCount" role="status"&gt;
  {{ collection.products_count }} products found.
&lt;/p&gt;</code></pre>

<p><span>筛选完成后更新该区域。</span></p>

<p><span>尽量保留原有的 ProductCount 节点，而不是每次整体重新创建 Live Region。</span></p>

<h3><span><strong>Collection 整改重点</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="Collection 整改重点"><table><tbody><tr><th scope="row"><p><span>模块</span></p></th><th scope="row"><p><span>检查内容</span></p></th></tr><tr><td><p><span>Product Card</span></p></td><td><p><span>链接名称、图片 alt、Quick Add 名称</span></p></td></tr><tr><td><p><span>Filter</span></p></td><td><p><span>Checkbox、分组名称、键盘操作</span></p></td></tr><tr><td><p><span>Price Range</span></p></td><td><p><span>输入框标签、拖拽替代操作</span></p></td></tr><tr><td><p><span>Sort By</span></p></td><td><p><span>原生 Select、明确名称</span></p></td></tr><tr><td><p><span>Active Filter</span></p></td><td><p><span>删除操作名称、删除后焦点</span></p></td></tr><tr><td><p><span>Filter Drawer</span></p></td><td><p><span>模态隔离、焦点恢复</span></p></td></tr><tr><td><p><span>Product Count</span></p></td><td><p><span>动态结果通知</span></p></td></tr><tr><td><p><span>Pagination</span></p></td><td><p><span>链接语义、aria-current</span></p></td></tr></tbody></table></div></div></div>

<hr>

<h2><span><strong>5.4 PDP 商品详情页</strong></span></h2>

<div class="training-box"><div class="training-grid"><div class="training-box"><div class="training-box"><img src="content/training-assets/image-b0641a28f470.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div class="training-box"><div class="training-box"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div class="training-box"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div class="training-box"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div></div></div><div class="training-box"><div class="training-box"><p class="training-example-heading"><strong><span><strong>Cotton T-shirt</strong></span></strong></p><div class="training-box"><p><span>4.8 / 5 (128)</span></p></div><div class="training-box"><p><span><span><strong>$29.99</strong></span></span><span><span><del>$49.99</del></span></span></p></div><span><span>Color: Black</span></span><span><span>Size: M</span></span><div class="training-box"><div class="training-box"><p><span>S</span></p></div><div class="training-box"><p><span>M</span></p></div><div class="training-box"><p><span>L</span></p></div><div class="training-box"><p><span>XL</span></p></div></div><div class="training-box"><p><span>In stock</span></p></div><div class="training-box"><div class="training-box"><p><span>1</span></p></div></div><div class="training-box"><p><span>Add to cart</span></p></div></div></div></div><hr><div class="training-box"><p><span>Product details</span></p></div><hr><div class="training-box"><p><span>Shipping &amp; Returns</span></p></div></div>

<h3><span><strong>实战一：Variant Picker</strong></span></h3>

<p><span>商品颜色和尺寸通常属于单组选一的场景，应该优先使用原生 Radio。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;fieldset&gt;
  &lt;legend&gt;Size&lt;/legend&gt;

  &lt;input type="radio"
         id="size-s"
         name="size"
         class="variant-input visually-hidden"
         value="S"&gt;

  &lt;label for="size-s"&gt;S&lt;/label&gt;

  &lt;input type="radio"
         id="size-m"
         name="size"
         class="variant-input visually-hidden"
         value="M"
         checked&gt;

  &lt;label for="size-m"&gt;M&lt;/label&gt;
&lt;/fieldset&gt;</code></pre>

<p><span>CSS：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">.variant-input:checked + label {
  border: 2px solid currentColor;
  font-weight: bold;
}

.variant-input:focus-visible + label {
  outline: 2px solid #005fcc;
  outline-offset: 3px;
}</code></pre>

<p><span>注意不能使用 display:none 隐藏需要通过键盘操作的 Radio。</span></p>

<p><span>如果某个尺寸已经售罄，但业务允许用户选择该尺寸查看信息，则不要直接将 Radio 标记为禁用。应该提供售罄说明，并禁止购买该变体。</span></p>

<h3><span><strong>实战二：商品原价与促销价</strong></span></h3>

<p><span>删除线不一定能让辅助技术理解价格的业务含义。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;span class="visually-hidden"&gt;
  Sale price:
&lt;/span&gt;

&lt;span&gt;
  {{ variant.price | money }}
&lt;/span&gt;

&lt;span class="visually-hidden"&gt;
  Regular price:
&lt;/span&gt;

&lt;s&gt;
  {{ variant.compare_at_price | money }}
&lt;/s&gt;</code></pre>

<p><span>实际项目应先判断该商品是否确实处于促销状态。</span></p>

<h3><span><strong>实战三：商品评分</strong></span></h3>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div&gt;★★★★★ (128)&lt;/div&gt;</code></pre>

<p><span>推荐：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;span aria-hidden="true"&gt;★★★★★&lt;/span&gt;

&lt;span&gt;4.8 out of 5 stars&lt;/span&gt;

&lt;a href="#ProductReviews"&gt;
  128 reviews
&lt;/a&gt;</code></pre>

<h3><span><strong>实战四：商品数量</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="quantity"&gt;Quantity&lt;/label&gt;

&lt;button type="button"
        aria-label="Decrease quantity"&gt;
  −
&lt;/button&gt;

&lt;input id="quantity"
       name="quantity"
       type="number"
       min="1"
       value="1"&gt;

&lt;button type="button"
        aria-label="Increase quantity"&gt;
  +
&lt;/button&gt;</code></pre>

<p><span>这里使用原生 number 输入框，不需要手动添加 role="spinbutton"。实际增减逻辑应遵守 Shopify 对应变体的数量规则。</span></p>

<h3><span><strong>PDP 整改重点</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="PDP 整改重点"><table><tbody><tr><th scope="row"><p><span>模块</span></p></th><th scope="row"><p><span>检查内容</span></p></th></tr><tr><td><p><span>Product Gallery</span></p></td><td><p><span>图片 alt、缩略图名称</span></p></td></tr><tr><td><p><span>Image Zoom</span></p></td><td><p><span>Modal 焦点管理</span></p></td></tr><tr><td><p><span>Price</span></p></td><td><p><span>原价、现价的文字含义</span></p></td></tr><tr><td><p><span>Rating</span></p></td><td><p><span>评分数值及评论数量</span></p></td></tr><tr><td><p><span>Color Swatch</span></p></td><td><p><span>颜色名称、选中状态</span></p></td></tr><tr><td><p><span>Variant Picker</span></p></td><td><p><span>单选语义、键盘操作</span></p></td></tr><tr><td><p><span>Inventory</span></p></td><td><p><span>库存说明、变化通知</span></p></td></tr><tr><td><p><span>Quantity</span></p></td><td><p><span>标签、范围限制</span></p></td></tr><tr><td><p><span>Add to cart</span></p></td><td><p><span>加购状态、错误反馈</span></p></td></tr></tbody></table></div></div></div>

<hr>

<h2><span><strong>5.5 Cart Drawer 与 Cart Page</strong></span></h2>

<div class="training-box"><div class="training-box"><p class="training-example-heading"><strong><span><strong>Your cart</strong></span></strong></p></div><hr><div class="training-box"><div class="training-box"><img src="content/training-assets/image-00041917f412.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div class="training-box"><p><span><span><strong>Cotton T-shirt</strong></span></span></p><span><span>Black / M</span></span><div class="training-box"><div class="training-box"><div class="training-box"><p><span>2</span></p></div></div><p><span><span><strong>$59.98</strong></span></span></p></div></div></div><hr><div class="training-box"><p><span>Estimated total</span></p><p class="training-example-heading"><strong><span><strong>$59.98</strong></span></strong></p></div><span><span>Shipping and applicable taxes calculated at checkout.</span></span><div class="training-box"><p><span>Checkout</span></p></div></div>

<h3><span><strong>实战一：删除按钮名称</strong></span></h3>

<p><span>如果购物车中有多个商品，删除按钮应该包含对应商品信息。</span></p>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button aria-label="Remove"&gt;
  &lt;svg&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>推荐：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button
  type="button"
  aria-label="Remove {{ item.title | escape }}"
&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>当购物车中存在同一个 Variant 的不同定制商品时，名称还应包含必要的区分信息。</span></p>

<h3><span><strong>实战二：加购通知</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;p role="status"
   id="CartStatus"
   class="visually-hidden"&gt;&lt;/p&gt;</code></pre>

<p><span>加购成功：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">cartStatus.textContent =
  'Cotton T-shirt added to your cart.';</code></pre>

<p><span>加购失败：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">cartError.textContent =
  'The requested quantity is unavailable.';</code></pre>

<p><span>通知应根据服务器实际返回结果生成，而不是点击按钮之后立即显示成功。</span></p>

<h3><span><strong>实战三：删除商品后的焦点</strong></span></h3>

<section class="training-demo" data-training="cart" aria-label="购物车焦点恢复演示"><p><strong>购物车焦点恢复演示</strong></p><ul data-cart-items><li><span>Cotton T-shirt</span> <button type="button" aria-label="Remove Cotton T-shirt" data-training-action="cart-remove" data-item="Cotton T-shirt">Remove</button></li><li><span>Linen shirt</span> <button type="button" aria-label="Remove Linen shirt" data-training-action="cart-remove" data-item="Linen shirt">Remove</button></li><li><span>Classic jacket</span> <button type="button" aria-label="Remove Classic jacket" data-training-action="cart-remove" data-item="Classic jacket">Remove</button></li></ul><p data-cart-empty tabindex="-1" hidden>购物车为空。</p><p>模拟焦点位置 <strong data-cart-focus>Linen shirt</strong></p><p role="status" data-cart-status>等待删除操作。</p><button type="button" data-training-action="cart-reset">重置演示</button><p>蓝框表示教学模拟焦点，删除商品后优先寻找下一项，其次上一项，购物车为空时寻找合理的空状态入口。</p></section>

<p><span>对于真实项目，应在 DOM 替换前记录当前焦点和购物车行标识，更新完成后查找对应的新控件。</span></p>

<p><span>不要仅根据 Variant ID 恢复焦点，因为同一个 Variant 可能对应多条购物车商品行。</span></p>

<h3><span><strong>Cart 整改重点</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="Cart 整改重点"><table><tbody><tr><th scope="row"><p><span>模块</span></p></th><th scope="row"><p><span>检查内容</span></p></th></tr><tr><td><p><span>Cart Drawer</span></p></td><td><p><span>Dialog 语义、焦点隔离</span></p></td></tr><tr><td><p><span>Close Button</span></p></td><td><p><span>名称、焦点恢复</span></p></td></tr><tr><td><p><span>Quantity</span></p></td><td><p><span>名称、限制、错误反馈</span></p></td></tr><tr><td><p><span>Remove</span></p></td><td><p><span>商品上下文、删除后焦点</span></p></td></tr><tr><td><p><span>Cart Total</span></p></td><td><p><span>金额含义、重要变化通知</span></p></td></tr><tr><td><p><span>Empty Cart</span></p></td><td><p><span>明确空状态及后续入口</span></p></td></tr><tr><td><p><span>Checkout</span></p></td><td><p><span>键盘操作、更新完成后提交</span></p></td></tr></tbody></table></div></div></div>

<hr>

<h2><span><strong>5.6 Shopify 特有问题：Section Rendering</strong></span></h2>

<p><span>这是公司 Shopify 项目整改时尤其需要掌握的知识。</span></p>

<p><span>Shopify Section Rendering API 可以返回服务器渲染后的 HTML，供前端局部更新页面，无需整个浏览器页面刷新。</span> <a class="training-source" href="https://shopify.dev/docs/api/ajax/section-rendering" aria-label="Shopify：Section Rendering API"><img src="content/training-assets/image-e02bfd934cc3.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>Shopify</span><span class="training-source-preview" aria-hidden="true"><small>Shopify</small><strong>Section Rendering API</strong><small>shopify.dev</small></span></a></p>

<div class="training-box"><div class="training-box">用户勾选 Black 筛选项</div><div class="training-box">请求 Shopify Section HTML</div><div class="training-box">JavaScript 替换商品和筛选器 DOM</div><div class="training-grid"><div class="training-box"><div class="training-box"><p><span>未处理焦点</span></p><span><span>原 Checkbox 被销毁，用户可能失去操作位置。</span></span></div></div><div class="training-box"><div class="training-box"><p><span>正确处理焦点</span></p><span><span>找到对应的新 Checkbox，继续原来的操作。</span></span></div></div></div></div>

<p><span>简单修复示例：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">function updateSection(container, newHTML) {
  const active = document.activeElement;

  const focusKey = container.contains(active)
    ? active.dataset.focusKey
    : null;

  container.innerHTML = newHTML;

  if (focusKey) {
    const next = [
      ...container.querySelectorAll('[data-focus-key]')
    ].find(el =&gt; el.dataset.focusKey === focusKey);

    if (next &amp;&amp; !next.matches(':disabled')) {
      next.focus();
    }
  }
}</code></pre>

<p><span>Liquid 中可以提供稳定的业务标识：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">data-focus-key="{{ value.param_name | escape }}:{{ value.value | escape }}"</code></pre>

<p><span>这是焦点恢复的基础示例。正式项目还需要处理目标元素不存在、处于隐藏状态、重复标识等情况，并选择合理的备用焦点。</span></p>

<p><span>员工只需要重点掌握三个原则：</span></p>

<p><span><span><strong>能不替换原节点，就尽量不替换；必须替换时，考虑焦点恢复；用户已经移到其他位置时，不要擅自抢回焦点。</strong></span></span></p>

<h2><span><strong>5.7 Checkout 与第三方 Shopify App</strong></span></h2>

<p><span>Checkout 由 Shopify 提供核心结账能力，普通 Theme 不能任意修改托管结账页面的 HTML 和 JavaScript。</span></p>

<p><span>但员工仍然需要测试完整结账流程，以及项目中使用的 Checkout Extensions。</span></p>

<p><span>对于第三方 App，例如评论插件、客服插件、订阅插件、促销弹窗和 Cookie Banner，也需要纳入实际页面的无障碍检查。</span></p>

<p><span>如果问题无法从 Theme 层解决，应记录问题、联系供应商，必要时评估替代方案，而不是直接从检测报告中排除。</span></p>

<h2><span><strong>5.8 本课实操任务</strong></span></h2>

<p><span>在公司测试店铺完成以下完整操作：</span></p>

<ol><li><div><div><p><span>使用键盘打开网站导航。</span></p></div></div></li><li><div><div><p><span>进入 Collection 并选择筛选条件。</span></p></div></div></li><li><div><div><p><span>进入 PDP，选择颜色和尺寸。</span></p></div></div></li><li><div><div><p><span>修改商品数量并加购。</span></p></div></div></li><li><div><div><p><span>打开购物车，修改数量及删除商品。</span></p></div></div></li><li><div><div><p><span>进入 Checkout，验证相关表单及配送操作。</span></p></div></div></li></ol>

<p><span>记录无法通过键盘完成的操作、焦点丢失的场景、缺少名称的控件和无法感知的动态信息。</span></p>

<p><span>支付相关测试应在测试环境中进行。</span></p>

<hr>
