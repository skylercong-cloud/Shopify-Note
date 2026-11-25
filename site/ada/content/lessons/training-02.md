<h1><span><strong>第 2 课：HTML、CSS 常见无障碍问题与修复</strong></span></h1>

<span><span>建议时长：55 分钟</span></span>

<p><span>这一课是日常 ADA 整改的基础。很多项目问题只需要修改 HTML 和 CSS 就可以解决。</span></p>

<h2><span><strong>2.1 图片：正确使用 alt</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>image-alt</span></code></p>

<p><span>alt 的作用是提供图片的文字替代信息。</span></p>

<div class="training-box"><div class="training-box"><div class="training-box"><div><img src="content/training-assets/image-8ab6cdedfc2f.jpg" alt="Standard Crew Neck T-Shirt 3-Pack  – TheClassicFit" class="training-product-image" loading="lazy" decoding="async"></div></div><div class="training-box"><p><span><span><strong>有意义的商品图片</strong></span></span> <code><span>alt="Black cotton T-shirt"</span></code></p><span><span>让无法看到图片的用户了解商品。</span></span></div></div><hr><div class="training-box"><div class="training-box"><img src="content/training-assets/image-b8ab8b8f12ae.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div class="training-box"><p><span><span><strong>纯装饰图片</strong></span></span> <code><span>alt=""</span></code></p><span><span>没有额外信息价值，不需要播报。</span></span></div></div><hr><div class="training-box"><div class="training-box"><p><span><span><strong>功能性图片</strong></span></span> <code><span>alt="Search"</span></code></p><span><span>如果图片是按钮或链接的唯一内容，应表达操作用途。</span></span></div></div></div>

<p><span>错误代码：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;img src="product.jpg"&gt;</code></pre>

<p><span>正确代码：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;img src="product.jpg" alt="Black cotton T-shirt"&gt;

&lt;!-- 装饰性图片 --&gt;
&lt;img src="decoration.jpg" alt=""&gt;</code></pre>

<p><span>Shopify Liquid：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">{{
  product.featured_image
  | image_url: width: 600
  | image_tag: alt: product.featured_image.alt
}}</code></pre>

<p><span>实际项目中，应在 Shopify 后台维护准确的商品图片 alt。</span></p>

<p><span><span><strong>注意：</strong></span></span><span> 不要为了消除检测报告，将所有图片设置为 </span><code><span>alt=""</span></code><span>，也不要全部填写 </span><code><span>alt="image"</span></code><span>。</span></p>

<p><span>验证方式：重新执行 axe 检测，并通过屏幕阅读器确认图片信息是否合理。</span></p>

<h2><span><strong>2.2 按钮和链接：提供准确的可访问名称</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>button-name</span></code><span>、</span><code><span>link-name</span></code></p>

<h3><span><strong>纯图标按钮</strong></span></h3>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button&gt;
  &lt;svg&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>修复：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button type="button" aria-label="Close cart"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>常用图标按钮名称：</span></p>

<div class="training-grid"><div class="training-box"><div class="training-box"><p><span>Search</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Open cart</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Open menu</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Close dialog</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Previous slide</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Remove item</span></p></div></div></div>

<h3><span><strong>已有文字的按钮</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button type="submit"&gt;Add to cart&lt;/button&gt;</code></pre>

<p><span>原生按钮的文字通常已经可以提供 Accessible Name，不需要重复设置 aria-label。</span></p>

<p><span>如果页面有多个相同的 Quick Add 按钮，可以补充对应商品信息：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button
  type="button"
  aria-label="Quick add: {{ product.title | escape }}"
&gt;
  Quick add
&lt;/button&gt;</code></pre>

<p><span>无障碍名称应包含视觉上显示的按钮文字，方便语音控制用户通过可见文字激活控件。</span></p>

<h3><span><strong>链接</strong></span></h3>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;a href="/collections/summer"&gt;Click here&lt;/a&gt;</code></pre>

<p><span>推荐：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;a href="/collections/summer"&gt;
  Shop summer collection
&lt;/a&gt;</code></pre>

<p><span>链接用途应能够通过链接文字或适当的上下文理解。</span></p>

<h2><span><strong>2.3 不要使用 div 模拟原生交互控件</strong></span></h2>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div class="button" onclick="addToCart()"&gt;
  Add to cart
&lt;/div&gt;</code></pre>

<p><span>正确：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button type="button" onclick="addToCart()"&gt;
  Add to cart
&lt;/button&gt;</code></pre>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>能力</span></p></th><th scope="row"><p><span>原生 button</span></p></th><th scope="row"><p><span>普通 div</span></p></th></tr><tr><td><p><span>具有按钮语义</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>可以通过 Tab 聚焦</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>Enter 激活</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>Space 激活</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>支持原生 disabled</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr></tbody></table></div></div>

<p><span>日常开发应优先使用合适的原生 HTML 元素。</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>业务用途</span></p></th><th scope="row"><p><span>推荐元素</span></p></th></tr><tr><td><p><span>跳转页面</span></p></td><td><p><code><span>&lt;a href="..."&gt;</span></code></p></td></tr><tr><td><p><span>执行操作</span></p></td><td><p><code><span>&lt;button&gt;</span></code></p></td></tr><tr><td><p><span>单选</span></p></td><td><p><code><span>&lt;input type="radio"&gt;</span></code></p></td></tr><tr><td><p><span>多选</span></p></td><td><p><code><span>&lt;input type="checkbox"&gt;</span></code></p></td></tr><tr><td><p><span>下拉选择</span></p></td><td><p><code><span>&lt;select&gt;</span></code></p></td></tr><tr><td><p><span>展开折叠</span></p></td><td><p><code><span>&lt;details&gt;</span></code><span>、</span><code><span>&lt;summary&gt;</span></code></p></td></tr><tr><td><p><span>模态弹窗</span></p></td><td><p><code><span>&lt;dialog&gt;</span></code></p></td></tr></tbody></table></div></div>

<p><span><span><strong>不要因为设计稿中的按钮看起来像 div，就使用 div 实现按钮。</strong></span></span><span> CSS 完全可以修改原生控件的视觉样式。</span></p>

<h2><span><strong>2.4 表单：每个输入框都要有明确的名称</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>label</span></code></p>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;input type="email" placeholder="Enter email"&gt;</code></pre>

<p><span>正确：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="email"&gt;Email address&lt;/label&gt;

&lt;input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  placeholder="you@example.com"
&gt;</code></pre>

<p><span>placeholder 可以作为输入示例，但不应该代替 label。</span></p>

<p><span>如果设计稿确实不显示标签，可以使用视觉隐藏的 label：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="search" class="visually-hidden"&gt;
  Search products
&lt;/label&gt;

&lt;input id="search" type="search"&gt;</code></pre>

<p><span>推荐同时在表单中提供明确的必填说明、输入规则和错误反馈。</span></p>

<h2><span><strong>2.5 表单错误：不能只改变边框颜色</strong></span></h2>

<div class="training-grid"><div class="training-box"><div class="training-box"><div class="training-box"><p> <span><span><strong>整改前</strong></span></span></p></div><span><span>Email address</span></span><div class="training-box">example</div><span><span>只有红色边框，没有说明问题。</span></span></div></div><div class="training-box"><div class="training-box"><div class="training-box"><p> <span><span><strong>整改后</strong></span></span></p></div><span><span>Email address</span></span><div class="training-box">example</div><p><span>Please enter a valid email address.</span></p><span><span>错误原因清晰，并与输入框关联。</span></span></div></div></div>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="email"&gt;Email address&lt;/label&gt;

&lt;input
  id="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
&gt;

&lt;p id="email-error"&gt;
  Please enter a valid email address.
&lt;/p&gt;</code></pre>

<p><span>其中 aria-invalid 表示输入存在错误，aria-describedby 将错误说明与输入框关联。</span></p>

<p><span>错误修复之后，应移除错误状态及相关错误说明。</span></p>

<p><span>如果需要主动通知刚刚发生的错误，可以使用提前存在的 </span><code><span>role="alert"</span></code><span> 区域。</span></p>

<h2><span><strong>2.6 标题与页面语义</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>heading-order</span></code><span>、</span><code><span>region</span></code><span>、</span><code><span>landmark-one-main</span></code></p>

<p><span>标题应按照内容层级组织，而不是根据字体大小决定使用 H1 还是 H3。</span></p>

<div class="training-grid"><div class="training-box"><div class="training-box"><p><span>不合理的结构</span></p><p><span>H1 · Cotton T-shirt</span></p><div class="training-box"><p><span>H4 · Product details</span></p></div><p><span>H1 · Shipping</span></p><div class="training-box"><p><span>H5 · Returns</span></p></div></div></div><div class="training-box"><div class="training-box"><p><span>推荐结构</span></p><p><span>H1 · Cotton T-shirt</span></p><div class="training-box"><p><span>H2 · Product details</span></p><p><span>H2 · Shipping</span></p><div class="training-box"><p><span>H3 · Returns</span></p></div></div></div></div></div>

<p><span>推荐页面结构：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;header&gt;
  &lt;nav aria-label="Main navigation"&gt;
    &lt;!-- 主导航 --&gt;
  &lt;/nav&gt;
&lt;/header&gt;

&lt;main id="MainContent"&gt;
  &lt;h1&gt;Collection&lt;/h1&gt;
  &lt;!-- 页面主要内容 --&gt;
&lt;/main&gt;

&lt;footer&gt;
  &lt;!-- 页脚 --&gt;
&lt;/footer&gt;</code></pre>

<p><span>通常为页面设置一个明确的主要 H1，并维护合理的标题层级。标题跳级或多个 H1 不一定直接构成 WCAG 违规，但应该检查其实际结构是否合理。</span></p>

<h2><span><strong>2.7 颜色对比度</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>color-contrast</span></code></p>

<p><span>WCAG AA 中常用的对比度要求：</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>内容</span></p></th><th scope="row"><p><span>最低对比度</span></p></th></tr><tr><td><p><span>普通文字</span></p></td><td><p><span>4.5:1</span></p></td></tr><tr><td><p><span>大字号文字</span></p></td><td><p><span>3:1</span></p></td></tr><tr><td><p><span>适用的控件边界、状态指示及必要图形</span></p></td><td><p><span>3:1</span></p></td></tr></tbody></table></div></div>

<p><span>大字号通常指至少 24 CSS px 的普通文字，或约 18.67 CSS px 的粗体文字。部分内容存在适用例外。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span><span><span><span>+1</span></span></span></div></span></span></span></p>

<section class="training-demo" data-training="contrast" aria-label="颜色对比度实操工具"><p><strong>颜色对比度实操工具</strong></p><div class="training-contrast-sample" data-contrast-sample style="color:#999999;background:#FFFFFF">Shipping calculated at checkout.<br><strong>$29.99</strong></div><fieldset><legend>文字颜色</legend><div class="training-swatches"><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#CCCCCC"><span style="--swatch:#CCCCCC"></span>#CCCCCC</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#999999" checked><span style="--swatch:#999999"></span>#999999</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#767676"><span style="--swatch:#767676"></span>#767676</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#595959"><span style="--swatch:#595959"></span>#595959</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#333333"><span style="--swatch:#333333"></span>#333333</label></div></fieldset><fieldset><legend>背景颜色</legend><div class="training-swatches"><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#FFFFFF" checked><span style="--swatch:#FFFFFF"></span>#FFFFFF</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#FFFFFF" checked><span style="--swatch:#FFFFFF"></span>#FFFFFF</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#F5F5F5"><span style="--swatch:#F5F5F5"></span>#F5F5F5</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#E5D8C6"><span style="--swatch:#E5D8C6"></span>#E5D8C6</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#333333"><span style="--swatch:#333333"></span>#333333</label></div></fieldset><p aria-live="polite">当前对比度 <strong data-contrast-ratio>2.85 : 1</strong> <span data-contrast-result>普通文字 AA 不通过</span></p><p data-contrast-values>文字：#999999　背景：#FFFFFF</p><button type="button" data-training-action="contrast-copy">复制 CSS 配色</button><p data-training-feedback role="status"></p></section>

<p><span>实际项目中常见的问题位置包括商品原价、Footer 文字、Placeholder、库存信息、筛选数量和 Banner。</span></p>

<p><span>建议优先修改公共颜色变量，避免在多个组件中重复修复相同问题。</span></p>

<p><span>在线工具：</span><span><a href="https://webaim.org/resources/contrastchecker/?utm_source=chatgpt.com"><span><span>WebAIM Contrast Checker</span></span></a></span></p>

<h2><span><strong>2.8 不要只依靠颜色表达状态</strong></span></h2>

<p><span>例如商品 Color Swatch。</span></p>

<div class="training-box"><p><span><span><strong>整改前：只有颜色</strong></span></span></p><span><span>用户无法仅凭文字或其他标记确认颜色及选择状态。</span></span><hr><p><span><span><strong>整改后：颜色、文字和选中标记</strong></span></span></p><div class="training-box"><div class="training-box"><p><span>Black</span></p></div><div class="training-box"><p><span>White</span></p></div><div class="training-box"><p><span>Blue</span></p></div><div class="training-box"><p><span>Red</span></p></div></div><span><span>通过文字说明颜色，通过边框或勾号表达选中状态。</span></span></div>

<p><span>同样的原则也适用于错误提示、库存状态、促销价格和筛选条件。</span></p>

<h2><span><strong>2.9 保留键盘焦点样式</strong></span></h2>

<p><span>错误：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">*:focus {
  outline: none;
}</code></pre>

<p><span>正确：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 3px;
}</code></pre>

<div class="training-grid"><div class="training-box"><div class="training-box"><div class="training-box"><p><span>Add to cart</span></p></div><span><span>焦点不可见</span></span></div></div><div class="training-box"><div class="training-box"><div class="training-box"><div class="training-box"><p><span>Add to cart</span></p></div></div><span><span>焦点清晰可见</span></span></div></div></div>

<p><span>焦点样式需要结合不同背景验证，不能认为固定使用某种蓝色就一定合格。</span></p>

<p><span>验证方式：放下鼠标，连续按 Tab，检查每次焦点移动是否能够被清楚看见。</span></p>

<h2><span><strong>2.10 正确隐藏页面元素</strong></span></h2>

<p><span>这一点在 Modal、Drawer、Carousel 中特别常见。</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>隐藏方式</span></p></th><th scope="row"><p><span>视觉不可见</span></p></th><th scope="row"><p><span>从无障碍树排除</span></p></th><th scope="row"><p><span>阻止键盘聚焦</span></p></th></tr><tr><td><p><code><span>display: none</span></code></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>visibility: hidden</span></code></p></td><td><p><span>是</span></p></td><td><p><span>通常是</span></p></td><td><p><span>通常是</span></p></td></tr><tr><td><p><code><span>hidden</span></code></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>opacity: 0</span></code></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>transform</span></code><span> 移出视口</span></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>aria-hidden="true"</span></code></p></td><td><p><span>否</span></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>inert</span></code></p></td><td><p><span>否</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>pointer-events: none</span></code></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr></tbody></table></div></div>

<p><span>表格描述的是普通元素在常规样式下的行为。</span></p>

<p><span>核心问题：</span><span><span><strong>视觉隐藏不等于无障碍隐藏。</strong></span></span></p>

<p><span>例如关闭的购物车：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;!-- 错误：内部按钮仍可能被 Tab 访问 --&gt;
&lt;div class="drawer" aria-hidden="true"&gt;
  &lt;button&gt;Close cart&lt;/button&gt;
&lt;/div&gt;</code></pre>

<p><span>可以使用：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div class="drawer" hidden&gt;
  &lt;button&gt;Close cart&lt;/button&gt;
&lt;/div&gt;</code></pre>

<p><span>如果 Drawer 需要保留滑动动画，可以结合 CSS 使用 inert：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">// 打开
drawer.inert = false;

// 关闭：先将焦点移至外部合理位置
trigger.focus();
drawer.inert = true;</code></pre>

<p><span>如果原有 aria-hidden 属性仍然存在，也要同步更新。inert 不负责视觉隐藏，仍需 CSS 控制。</span></p>

<h3><span><strong>visually-hidden 的作用</strong></span></h3>

<p><span>有些文字只需要提供给辅助技术，不希望显示在视觉界面中。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
  &lt;span class="visually-hidden"&gt;Search&lt;/span&gt;
&lt;/button&gt;</code></pre>

<p><span>不要使用 display:none 隐藏这类需要被辅助技术读取的文字。</span></p>

<h2><span><strong>2.11 响应式布局与点击区域</strong></span></h2>

<p><span>实际整改需要检查 200% 文字缩放、等效 320 CSS px 宽度下的页面重排，以及控件点击区域。</span></p>

<p><span>WCAG 2.2 AA 的 2.5.8 对目标尺寸提出至少 24×24 CSS px 的要求，同时允许特定间距或其他例外。日常组件设计可以优先采用 44×44 CSS px，以提供更加充足的操作空间。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">.icon-button {
  min-width: 44px;
  min-height: 44px;
}

.add-to-cart {
  min-height: 44px;
  padding: 12px 16px;
  white-space: normal;
  overflow-wrap: anywhere;
}</code></pre>

<p><span>避免固定高度导致文字被截断，也不要通过 </span><code><span>overflow-x: hidden</span></code><span> 简单掩盖页面布局问题。</span></p>

<h2><span><strong>2.12 本课实操任务</strong></span></h2>

<p><span>在测试页面中制造并修复以下问题：无名称的搜索按钮、缺少 alt 的商品图片、无 label 的输入框、颜色过浅的价格、不可见的焦点样式、关闭后仍可聚焦的 Drawer。</span></p>

<p><span>每完成一个问题，使用 axe 和键盘重新验证。</span></p>

<hr>
