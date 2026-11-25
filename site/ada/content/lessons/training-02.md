<h1><span><strong>第 2 课：HTML、CSS 常见无障碍问题与修复</strong></span></h1>

<span><span>建议时长：55 分钟</span></span>

<p><span>这一课是日常 ADA 整改的基础。很多项目问题只需要修改 HTML 和 CSS 就可以解决。</span></p>

<h2><span><strong>2.1 图片：正确使用 alt</strong></span></h2>

<p><span><span><strong>常见检测规则：</strong></span></span> <code><span>image-alt</span></code></p>

<p><span>alt 的作用是提供图片的文字替代信息。</span></p>

<div class="training-image-examples"><div class="training-image-example"><div class="training-example-media"><img src="content/training-assets/image-8ab6cdedfc2f.jpg" alt="Standard Crew Neck T-Shirt 3-Pack  – TheClassicFit" class="training-product-image" loading="lazy" decoding="async"></div><div><p><strong>有意义的商品图片</strong></p><p><code>alt=&quot;Black cotton T-shirt&quot;</code></p><p class="training-figure-caption">让无法看到图片的用户了解商品。</p></div></div><div class="training-image-example"><div class="training-example-media"><img src="content/training-assets/image-b8ab8b8f12ae.svg" alt="" class="training-product-image" loading="lazy" decoding="async"></div><div><p><strong>纯装饰图片</strong></p><p><code>alt=&quot;&quot;</code></p><p class="training-figure-caption">没有额外信息价值，不需要播报。</p></div></div><div class="training-image-example"><div class="training-example-media"><svg class="training-figure-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.875 4.5C7.35418 4.5 4.5 7.35418 4.5 10.875C4.5 14.3958 7.35418 17.25 10.875 17.25C14.3958 17.25 17.25 14.3958 17.25 10.875C17.25 7.35418 14.3958 4.5 10.875 4.5ZM2.5 10.875C2.5 6.24962 6.24962 2.5 10.875 2.5C15.5004 2.5 19.25 6.24962 19.25 10.875C19.25 12.8273 18.582 14.6236 17.462 16.0478L21.2071 19.7929C21.5976 20.1834 21.5976 20.8166 21.2071 21.2071C20.8166 21.5976 20.1834 21.5976 19.7929 21.2071L16.0478 17.462C14.6236 18.582 12.8273 19.25 10.875 19.25C6.24962 19.25 2.5 15.5004 2.5 10.875Z" fill="currentColor"></path></svg></div><div><p><strong>功能性图片</strong></p><p><code>alt=&quot;Search&quot;</code></p><p class="training-figure-caption">如果图片是按钮或链接的唯一内容，应表达操作用途。</p></div></div></div>

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

<div data-rich-example="icon-labels" class="training-rich"><div data-columns="3" class="training-grid training-rich-grid" style="gap:calc(4px * 2);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.875 4.5C7.35418 4.5 4.5 7.35418 4.5 10.875C4.5 14.3958 7.35418 17.25 10.875 17.25C14.3958 17.25 17.25 14.3958 17.25 10.875C17.25 7.35418 14.3958 4.5 10.875 4.5ZM2.5 10.875C2.5 6.24962 6.24962 2.5 10.875 2.5C15.5004 2.5 19.25 6.24962 19.25 10.875C19.25 12.8273 18.582 14.6236 17.462 16.0478L21.2071 19.7929C21.5976 20.1834 21.5976 20.8166 21.2071 21.2071C20.8166 21.5976 20.1834 21.5976 19.7929 21.2071L16.0478 17.462C14.6236 18.582 12.8273 19.25 10.875 19.25C6.24962 19.25 2.5 15.5004 2.5 10.875Z" fill="currentColor"></path></svg><p style="text-align:center;"><span>Search</span></p></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9996 2C14.6707 2 15.9996 4.13291 15.9996 6H16.3151C18.2197 6.0001 19.8234 7.42953 20.0328 9.32324L20.9772 17.8574C21.222 20.0708 19.4836 22 17.2584 22H6.74085C4.50633 21.9998 2.76501 20.0551 3.02503 17.834L4.02503 9.2998C4.24557 7.41662 5.84443 6.00024 7.73988 6H7.99964C7.99964 4.13299 9.32883 2.00019 11.9996 2ZM7.73988 8C6.85459 8.00024 6.11338 8.66112 6.01136 9.53223L5.01136 18.0664C4.8912 19.0927 5.69678 19.9998 6.74085 20H17.2584C18.2982 20 19.102 19.0999 18.9889 18.0771L18.0446 9.54297C17.9476 8.66709 17.2047 8.0001 16.3151 8H15.9996V9C15.9996 9.55228 15.5519 10 14.9996 10C14.4475 9.9998 13.9996 9.55216 13.9996 9V8H9.99964V9C9.99964 9.55228 9.55193 10 8.99964 10C8.44753 9.9998 7.99964 9.55216 7.99964 9V8H7.73988ZM11.9996 4C10.6709 4.00018 9.99964 4.98402 9.99964 6H13.9996C13.9996 4.98393 13.3286 4 11.9996 4Z" fill="currentColor"></path></svg><p style="text-align:center;"><span>Open cart</span></p></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path d="M3 8a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"></path></svg><p style="text-align:center;"><span>Open menu</span></p></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path fill-rule="evenodd" d="M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg><p style="text-align:center;"><span>Close dialog</span></p></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path fill-rule="evenodd" d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"></path></svg><p style="text-align:center;"><span>Previous slide</span></p></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:20;"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5555 4C10.099 4 9.70052 4.30906 9.58693 4.75114L9.29382 5.8919H14.715L14.4219 4.75114C14.3083 4.30906 13.9098 4 13.4533 4H10.5555ZM16.7799 5.8919L16.3589 4.25342C16.0182 2.92719 14.8226 2 13.4533 2H10.5555C9.18616 2 7.99062 2.92719 7.64985 4.25342L7.22886 5.8919H4C3.44772 5.8919 3 6.33961 3 6.8919C3 7.44418 3.44772 7.8919 4 7.8919H4.10069L5.31544 19.3172C5.47763 20.8427 6.76455 22 8.29863 22H15.7014C17.2354 22 18.5224 20.8427 18.6846 19.3172L19.8993 7.8919H20C20.5523 7.8919 21 7.44418 21 6.8919C21 6.33961 20.5523 5.8919 20 5.8919H16.7799ZM17.888 7.8919H6.11196L7.30423 19.1057C7.3583 19.6142 7.78727 20 8.29863 20H15.7014C16.2127 20 16.6417 19.6142 16.6958 19.1057L17.888 7.8919ZM10 10C10.5523 10 11 10.4477 11 11V16C11 16.5523 10.5523 17 10 17C9.44772 17 9 16.5523 9 16V11C9 10.4477 9.44772 10 10 10ZM14 10C14.5523 10 15 10.4477 15 11V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16V11C13 10.4477 13.4477 10 14 10Z"></path></svg><p style="text-align:center;"><span>Remove item</span></p></div></div></div></div>

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

<div class="training-table"><div><div class="training-table-scroll" data-table-label="2.3 不要使用 div 模拟原生交互控件"><table><tbody><tr><th scope="row"><p><span>能力</span></p></th><th scope="row"><p><span>原生 button</span></p></th><th scope="row"><p><span>普通 div</span></p></th></tr><tr><td><p><span>具有按钮语义</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>可以通过 Tab 聚焦</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>Enter 激活</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>Space 激活</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr><tr><td><p><span>支持原生 disabled</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr></tbody></table></div></div></div>

<p><span>日常开发应优先使用合适的原生 HTML 元素。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="2.3 不要使用 div 模拟原生交互控件"><table><tbody><tr><th scope="row"><p><span>业务用途</span></p></th><th scope="row"><p><span>推荐元素</span></p></th></tr><tr><td><p><span>跳转页面</span></p></td><td><p><code><span>&lt;a href="..."&gt;</span></code></p></td></tr><tr><td><p><span>执行操作</span></p></td><td><p><code><span>&lt;button&gt;</span></code></p></td></tr><tr><td><p><span>单选</span></p></td><td><p><code><span>&lt;input type="radio"&gt;</span></code></p></td></tr><tr><td><p><span>多选</span></p></td><td><p><code><span>&lt;input type="checkbox"&gt;</span></code></p></td></tr><tr><td><p><span>下拉选择</span></p></td><td><p><code><span>&lt;select&gt;</span></code></p></td></tr><tr><td><p><span>展开折叠</span></p></td><td><p><code><span>&lt;details&gt;</span></code><span>、</span><code><span>&lt;summary&gt;</span></code></p></td></tr><tr><td><p><span>模态弹窗</span></p></td><td><p><code><span>&lt;dialog&gt;</span></code></p></td></tr></tbody></table></div></div></div>

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

<div data-rich-example="form-error" class="training-rich"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 3);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:var(--training-rich-danger);--rich-icon-size:14;"><path d="M10.207 8.793a1 1 0 0 0-1.414 1.414L10.586 12l-1.793 1.793a1 1 0 1 0 1.414 1.414L12 13.414l1.793 1.793a1 1 0 0 0 1.414-1.414L13.414 12l1.793-1.793a1 1 0 0 0-1.414-1.414L12 10.586l-1.793-1.793Z"></path><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2ZM4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" clip-rule="evenodd"></path></svg> <span><span><strong>整改前</strong></span></span></p></div><span class="training-rich-caption"><span>Email address</span></span><div class="training-rich-box" style="border:2px solid rgb(180, 35, 24);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);">example</div><span class="training-rich-caption"><span>只有红色边框，没有说明问题。</span></span></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:var(--training-rich-success);--rich-icon-size:14;"><path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C16.5272 8.25003 16.6356 8.87383 16.3178 9.32549L11.5678 16.0755C11.3931 16.3237 11.1152 16.4792 10.8123 16.4981C10.5093 16.517 10.2142 16.3973 10.0101 16.1727L7.51006 13.4227C7.13855 13.014 7.16867 12.3816 7.57733 12.0101C7.98598 11.6386 8.61843 11.6687 8.98994 12.0773L10.6504 13.9039L14.6822 8.17451C15 7.72284 15.6238 7.61436 16.0755 7.93219Z" fill="currentColor"></path></svg> <span><span><strong>整改后</strong></span></span></p></div><span class="training-rich-caption"><span>Email address</span></span><div class="training-rich-box" style="border:2px solid rgb(180, 35, 24);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);">example</div><p style="color:var(--training-rich-danger);"><span>Please enter a valid email address.</span></p><span class="training-rich-caption"><span>错误原因清晰，并与输入框关联。</span></span></div></div></div></div>

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

<div data-rich-example="heading-levels" class="training-rich"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 3);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><p style="color:var(--training-rich-danger);font-weight:500;"><span>不合理的结构</span></p><p><span>H1 · Cotton T-shirt</span></p><div class="training-rich-box" style="padding-inline-start:calc(4px * 3);"><p><span>H4 · Product details</span></p></div><p><span>H1 · Shipping</span></p><div class="training-rich-box" style="padding-inline-start:calc(4px * 3);"><p><span>H5 · Returns</span></p></div></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><p style="color:var(--training-rich-success);font-weight:500;"><span>推荐结构</span></p><p><span>H1 · Cotton T-shirt</span></p><div class="training-rich-box" style="padding-inline-start:calc(4px * 3);gap:calc(4px * 2);"><p><span>H2 · Product details</span></p><p><span>H2 · Shipping</span></p><div class="training-rich-box" style="padding-inline-start:calc(4px * 3);"><p><span>H3 · Returns</span></p></div></div></div></div></div></div>

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

<div class="training-table"><div><div class="training-table-scroll" data-table-label="2.7 颜色对比度"><table><tbody><tr><th scope="row"><p><span>内容</span></p></th><th scope="row"><p><span>最低对比度</span></p></th></tr><tr><td><p><span>普通文字</span></p></td><td><p><span>4.5:1</span></p></td></tr><tr><td><p><span>大字号文字</span></p></td><td><p><span>3:1</span></p></td></tr><tr><td><p><span>适用的控件边界、状态指示及必要图形</span></p></td><td><p><span>3:1</span></p></td></tr></tbody></table></div></div></div>

<p><span>大字号通常指至少 24 CSS px 的普通文字，或约 18.67 CSS px 的粗体文字。部分内容存在适用例外。</span> <a class="training-source" href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" aria-label="W3C：Understanding 1.4.3: Contrast (Minimum)"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>Understanding 1.4.3: Contrast (Minimum)</strong><small>www.w3.org</small></span></a></p>

<section class="training-demo" data-training="contrast" aria-label="颜色对比度实操工具"><p><strong>颜色对比度实操工具</strong></p><div class="training-contrast-sample" data-contrast-sample style="color:#999999;background:#FFFFFF">Shipping calculated at checkout.<br><strong>$29.99</strong></div><fieldset><legend>文字颜色</legend><div class="training-swatches"><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#CCCCCC"><span style="--swatch:#CCCCCC"></span>#CCCCCC</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#999999" checked><span style="--swatch:#999999"></span>#999999</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#767676"><span style="--swatch:#767676"></span>#767676</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#595959"><span style="--swatch:#595959"></span>#595959</label><label class="training-swatch"><input type="radio" name="ada-contrast-fg" data-contrast="fg" value="#333333"><span style="--swatch:#333333"></span>#333333</label></div></fieldset><fieldset><legend>背景颜色</legend><div class="training-swatches"><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#FFFFFF" checked><span style="--swatch:#FFFFFF"></span>#FFFFFF</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#FFFFFF" checked><span style="--swatch:#FFFFFF"></span>#FFFFFF</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#F5F5F5"><span style="--swatch:#F5F5F5"></span>#F5F5F5</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#E5D8C6"><span style="--swatch:#E5D8C6"></span>#E5D8C6</label><label class="training-swatch"><input type="radio" name="ada-contrast-bg" data-contrast="bg" value="#333333"><span style="--swatch:#333333"></span>#333333</label></div></fieldset><p aria-live="polite">当前对比度 <strong data-contrast-ratio>2.85 : 1</strong> <span data-contrast-result>普通文字 AA 不通过</span></p><p data-contrast-values>文字：#999999　背景：#FFFFFF</p><button type="button" data-training-action="contrast-copy">复制 CSS 配色</button><p data-training-feedback role="status"></p></section>

<p><span>实际项目中常见的问题位置包括商品原价、Footer 文字、Placeholder、库存信息、筛选数量和 Banner。</span></p>

<p><span>建议优先修改公共颜色变量，避免在多个组件中重复修复相同问题。</span></p>

<p><span>在线工具：</span><span><a href="https://webaim.org/resources/contrastchecker/?utm_source=chatgpt.com"><span><span>WebAIM Contrast Checker</span></span></a></span></p>

<h2><span><strong>2.8 不要只依靠颜色表达状态</strong></span></h2>

<p><span>例如商品 Color Swatch。</span></p>

<div data-rich-example="color-state" class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><p><span><span><strong>整改前：只有颜色</strong></span></span></p><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(51, 51, 51);flex-shrink:0;height:36px;width:36px;"></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(244, 241, 233);flex-shrink:0;height:36px;width:36px;"></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(130, 153, 179);flex-shrink:0;height:36px;width:36px;"></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(171, 104, 104);flex-shrink:0;height:36px;width:36px;"></div></div><span class="training-rich-caption"><span>用户无法仅凭文字或其他标记确认颜色及选择状态。</span></span><hr class="training-rich-divider"><p><span><span><strong>整改后：颜色、文字和选中标记</strong></span></span></p><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);"><div class="training-rich-box" style="gap:calc(4px * 1);align-items:center;"><div class="training-rich-box" style="border:2px solid rgb(0, 95, 204);border-radius:9999px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex-shrink:0;height:38px;width:38px;"><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(51, 51, 51);flex-shrink:0;height:100%;width:100%;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:rgb(255, 255, 255);--rich-icon-size:16;"><path fill-rule="evenodd" d="M18.063 5.674a1 1 0 0 1 .263 1.39l-7.5 11a1 1 0 0 1-1.533.143l-4.5-4.5a1 1 0 1 1 1.414-1.414l3.647 3.647 6.82-10.003a1 1 0 0 1 1.39-.263Z" clip-rule="evenodd"></path></svg></div></div><p><span>Black</span></p></div><div class="training-rich-box" style="gap:calc(4px * 1);align-items:center;"><div class="training-rich-box" style="border:1px solid rgb(136, 136, 136);border-radius:9999px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex-shrink:0;height:38px;width:38px;"><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(244, 241, 233);flex-shrink:0;height:100%;width:100%;align-items:center;justify-content:center;"></div></div><p><span>White</span></p></div><div class="training-rich-box" style="gap:calc(4px * 1);align-items:center;"><div class="training-rich-box" style="border:1px solid rgb(136, 136, 136);border-radius:9999px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex-shrink:0;height:38px;width:38px;"><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(130, 153, 179);flex-shrink:0;height:100%;width:100%;align-items:center;justify-content:center;"></div></div><p><span>Blue</span></p></div><div class="training-rich-box" style="gap:calc(4px * 1);align-items:center;"><div class="training-rich-box" style="border:1px solid rgb(136, 136, 136);border-radius:9999px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex-shrink:0;height:38px;width:38px;"><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(171, 104, 104);flex-shrink:0;height:100%;width:100%;align-items:center;justify-content:center;"></div></div><p><span>Red</span></p></div></div><span class="training-rich-caption"><span>通过文字说明颜色，通过边框或勾号表达选中状态。</span></span></div></div>

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

<div class="training-rich"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 3);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:rgb(51, 51, 51);"><p style="color:rgb(255, 255, 255);"><span>Add to cart</span></p></div><span class="training-rich-caption"><span>焦点不可见</span></span></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);align-items:center;"><div class="training-rich-box" style="border:2px solid rgb(0, 95, 204);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:rgb(51, 51, 51);"><p style="color:rgb(255, 255, 255);"><span>Add to cart</span></p></div></div><span class="training-rich-caption"><span>焦点清晰可见</span></span></div></div></div></div>

<p><span>焦点样式需要结合不同背景验证，不能认为固定使用某种蓝色就一定合格。</span></p>

<p><span>验证方式：放下鼠标，连续按 Tab，检查每次焦点移动是否能够被清楚看见。</span></p>

<h2><span><strong>2.10 正确隐藏页面元素</strong></span></h2>

<p><span>这一点在 Modal、Drawer、Carousel 中特别常见。</span></p>

<div class="training-table"><div><div class="training-table-scroll training-table-wide" data-table-label="2.10 正确隐藏页面元素"><table><tbody><tr><th scope="row"><p><span>隐藏方式</span></p></th><th scope="row"><p><span>视觉不可见</span></p></th><th scope="row"><p><span>从无障碍树排除</span></p></th><th scope="row"><p><span>阻止键盘聚焦</span></p></th></tr><tr><td><p><code><span>display: none</span></code></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>visibility: hidden</span></code></p></td><td><p><span>是</span></p></td><td><p><span>通常是</span></p></td><td><p><span>通常是</span></p></td></tr><tr><td><p><code><span>hidden</span></code></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>opacity: 0</span></code></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>transform</span></code><span> 移出视口</span></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>aria-hidden="true"</span></code></p></td><td><p><span>否</span></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><code><span>inert</span></code></p></td><td><p><span>否</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><code><span>pointer-events: none</span></code></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td><td><p><span>否</span></p></td></tr></tbody></table></div></div></div>

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

<p><span>WCAG 2.2 AA 的 2.5.8 对目标尺寸提出至少 24×24 CSS px 的要求，同时允许特定间距或其他例外。日常组件设计可以优先采用 44×44 CSS px，以提供更加充足的操作空间。</span> <a class="training-source" href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" aria-label="W3C：Understanding 2.5.8: Target Size (Minimum)"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>Understanding 2.5.8: Target Size (Minimum)</strong><small>www.w3.org</small></span></a></p>

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
