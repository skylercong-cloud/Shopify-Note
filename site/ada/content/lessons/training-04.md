<h1><span><strong>第 4 课：常见 UI 组件无障碍整改实战</strong></span></h1>

<span><span>建议时长：60 分钟</span></span>

<p><span>这一课不要求员工从零开发所有组件，而是需要学会判断现有组件存在哪些问题，以及应该如何整改。</span></p>

<p><span>对于复杂组件，推荐参考 W3C 的 </span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/?utm_source=chatgpt.com"><span><span>ARIA Authoring Practices Guide（APG）</span></span></a></span><span>，其中提供了常见组件的语义与键盘交互模式。</span> <a class="training-source" href="https://www.w3.org/WAI/ARIA/apg/patterns/" aria-label="W3C：ARIA Authoring Practices Guide · Patterns"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>ARIA Authoring Practices Guide · Patterns</strong><small>www.w3.org</small></span></a></p>

<h2><span><strong>4.1 Modal / Drawer 弹窗组件</strong></span></h2>

<div class="training-rich"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 3);"><div class="training-rich-box"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:var(--training-rich-soft);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M3 8a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"></path></svg> <span>STORE</span> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9996 2C14.6707 2 15.9996 4.13291 15.9996 6H16.3151C18.2197 6.0001 19.8234 7.42953 20.0328 9.32324L20.9772 17.8574C21.222 20.0708 19.4836 22 17.2584 22H6.74085C4.50633 21.9998 2.76501 20.0551 3.02503 17.834L4.02503 9.2998C4.24557 7.41662 5.84443 6.00024 7.73988 6H7.99964C7.99964 4.13299 9.32883 2.00019 11.9996 2ZM7.73988 8C6.85459 8.00024 6.11338 8.66112 6.01136 9.53223L5.01136 18.0664C4.8912 19.0927 5.69678 19.9998 6.74085 20H17.2584C18.2982 20 19.102 19.0999 18.9889 18.0771L18.0446 9.54297C17.9476 8.66709 17.2047 8.0001 16.3151 8H15.9996V9C15.9996 9.55228 15.5519 10 14.9996 10C14.4475 9.9998 13.9996 9.55216 13.9996 9V8H9.99964V9C9.99964 9.55228 9.55193 10 8.99964 10C8.44753 9.9998 7.99964 9.55216 7.99964 9V8H7.73988ZM11.9996 4C10.6709 4.00018 9.99964 4.98402 9.99964 6H13.9996C13.9996 4.98393 13.3286 4 11.9996 4Z" fill="currentColor"></path></svg></p></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:var(--panel);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span><span><strong>Size guide</strong></span></span> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></p></div><p><span>Find your perfect fit.</span></p><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">Close</div></div><div class="training-rich-box" style="border:2px solid rgb(185, 87, 87);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">Add to cart</div></div><span class="training-rich-caption"><span>错误：焦点仍然能够进入背景页面。</span></span></div><div class="training-rich-box"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:var(--training-rich-soft);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:var(--muted);--rich-icon-size:14;"><path d="M3 8a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"></path></svg> <p style="color:var(--muted);"><span>STORE</span></p> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:var(--muted);--rich-icon-size:14;"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9996 2C14.6707 2 15.9996 4.13291 15.9996 6H16.3151C18.2197 6.0001 19.8234 7.42953 20.0328 9.32324L20.9772 17.8574C21.222 20.0708 19.4836 22 17.2584 22H6.74085C4.50633 21.9998 2.76501 20.0551 3.02503 17.834L4.02503 9.2998C4.24557 7.41662 5.84443 6.00024 7.73988 6H7.99964C7.99964 4.13299 9.32883 2.00019 11.9996 2ZM7.73988 8C6.85459 8.00024 6.11338 8.66112 6.01136 9.53223L5.01136 18.0664C4.8912 19.0927 5.69678 19.9998 6.74085 20H17.2584C18.2982 20 19.102 19.0999 18.9889 18.0771L18.0446 9.54297C17.9476 8.66709 17.2047 8.0001 16.3151 8H15.9996V9C15.9996 9.55228 15.5519 10 14.9996 10C14.4475 9.9998 13.9996 9.55216 13.9996 9V8H9.99964V9C9.99964 9.55228 9.55193 10 8.99964 10C8.44753 9.9998 7.99964 9.55216 7.99964 9V8H7.73988ZM11.9996 4C10.6709 4.00018 9.99964 4.98402 9.99964 6H13.9996C13.9996 4.98393 13.3286 4 11.9996 4Z" fill="currentColor"></path></svg></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:var(--panel);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span><span><strong>Size guide</strong></span></span> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></p></div><p><span>Find your perfect fit.</span></p><div class="training-rich-box" style="border:2px solid rgb(57, 120, 188);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">Close</div></div><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:var(--training-rich-soft);align-items:center;"><p style="color:var(--muted);"><span>Add to cart</span></p></div></div><span class="training-rich-caption"><span>正确：焦点位于当前活动弹窗内部。</span></span></div></div></div>

<h3><span><strong>常见问题</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="常见问题"><table><tbody><tr><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>整改方式</span></p></th></tr><tr><td><p><span>弹窗没有 Dialog 语义</span></p></td><td><p><span>使用原生 dialog 或正确的 role</span></p></td></tr><tr><td><p><span>弹窗没有名称</span></p></td><td><p><span>aria-labelledby</span></p></td></tr><tr><td><p><span>打开后焦点仍停留在背景</span></p></td><td><p><span>设置初始焦点</span></p></td></tr><tr><td><p><span>Tab 可以进入背景页面</span></p></td><td><p><span>模态隔离及焦点管理</span></p></td></tr><tr><td><p><span>Esc 无法关闭</span></p></td><td><p><span>提供合理的键盘退出机制</span></p></td></tr><tr><td><p><span>关闭后焦点丢失</span></p></td><td><p><span>恢复到触发控件</span></p></td></tr><tr><td><p><span>关闭后内部元素仍可访问</span></p></td><td><p><span>hidden、inert 等</span></p></td></tr></tbody></table></div></div></div>

<h3><span><strong>推荐方案：原生 dialog</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button
  id="OpenSizeGuide"
  type="button"
  aria-haspopup="dialog"
&gt;
  Size guide
&lt;/button&gt;

&lt;dialog
  id="SizeGuide"
  aria-labelledby="SizeGuideTitle"
&gt;
  &lt;h2 id="SizeGuideTitle"&gt;Size guide&lt;/h2&gt;

  &lt;button id="CloseSizeGuide"
          type="button"
          autofocus&gt;
    Close
  &lt;/button&gt;

  &lt;p&gt;Product size information...&lt;/p&gt;
&lt;/dialog&gt;</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">const trigger = document.querySelector('#OpenSizeGuide');
const dialog = document.querySelector('#SizeGuide');
const closeButton = document.querySelector('#CloseSizeGuide');

trigger.addEventListener('click', () =&gt; {
  dialog.showModal();
});

closeButton.addEventListener('click', () =&gt; {
  dialog.close();
});

dialog.addEventListener('close', () =&gt; {
  if (trigger.isConnected) {
    trigger.focus();
  }
});</code></pre>

<p><span>原生 showModal() 可以提供模态背景隔离和基础焦点管理，通常比自行实现 div 弹窗更简单。</span></p>

<p><span>如果项目已经使用自定义 Drawer，不一定需要全面重构，但必须确保它具备同等的实际无障碍行为。</span></p>

<p><span>仅添加下面两个属性是不够的：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div role="dialog" aria-modal="true"&gt;
  ...
&lt;/div&gt;</code></pre>

<p><span>这些属性不会自动实现 Focus Trap 或背景隔离。</span></p>

<h3><span><strong>验收方法</strong></span></h3>

<p><span>打开弹窗，连续按 Tab 和 Shift + Tab，确认不会意外进入背景页面；按 Esc 关闭弹窗，确认焦点回到触发按钮。</span></p>

<p><span>相关规范：</span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/?utm_source=chatgpt.com"><span><span>Modal Dialog Pattern</span></span></a></span></p>

<h2><span><strong>4.2 Dropdown / Mega Menu</strong></span></h2>

<p><span>普通网站导航的下拉菜单，通常不需要使用复杂的 ARIA Menu 模式。</span></p>

<p><span>推荐使用 button 控制普通链接列表的显示和隐藏。</span> <a class="training-source" href="https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/" aria-label="W3C：Example Disclosure Navigation Menu"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>Example Disclosure Navigation Menu</strong><small>www.w3.org</small></span></a></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;nav aria-label="Main navigation"&gt;
  &lt;button
    id="MenuButton"
    type="button"
    aria-expanded="false"
    aria-controls="SubMenu"
  &gt;
    Clothing
  &lt;/button&gt;

  &lt;ul id="SubMenu" hidden&gt;
    &lt;li&gt;&lt;a href="/collections/shirts"&gt;Shirts&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="/collections/jackets"&gt;Jackets&lt;/a&gt;&lt;/li&gt;
  &lt;/ul&gt;
&lt;/nav&gt;</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">const button = document.querySelector('#MenuButton');
const menu = document.querySelector('#SubMenu');

function setOpen(open) {
  button.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
}

button.addEventListener('click', () =&gt; {
  setOpen(menu.hidden);
});

button.closest('nav').addEventListener('keydown', event =&gt; {
  if (event.key === 'Escape' &amp;&amp; !menu.hidden) {
    event.preventDefault();
    button.focus();
    setOpen(false);
  }
});</code></pre>

<p><span>常见错误是只使用 CSS hover 实现下拉菜单。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">.menu:hover .submenu {
  display: block;
}</code></pre>

<p><span>这种方式可能导致键盘用户无法进入下拉内容。</span></p>

<p><span>对于支持鼠标 Hover 的 Mega Menu，也应提供键盘可操作的展开方式。悬浮内容还需要检查是否能够被移入、合理关闭，以及是否会意外消失。</span></p>

<p><span>验收方法：使用 Tab 找到菜单按钮，通过 Enter 展开，通过 Tab 进入链接，通过 Esc 关闭。</span></p>

<h2><span><strong>4.3 Accordion 折叠组件</strong></span></h2>

<p><span>推荐优先使用原生 details 和 summary。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;details&gt;
  &lt;summary&gt;Product details&lt;/summary&gt;
  &lt;p&gt;Made from 100% cotton.&lt;/p&gt;
&lt;/details&gt;

&lt;details&gt;
  &lt;summary&gt;Shipping &amp; Returns&lt;/summary&gt;
  &lt;p&gt;Returns accepted within 30 days.&lt;/p&gt;
&lt;/details&gt;</code></pre>

<section class="training-demo" data-training="accordion" aria-label="折叠组件示例"><details open><summary>Product details</summary><p>Made from 100% cotton. Machine washable.</p></details><details><summary>Shipping &amp; Returns</summary><p>Shipping &amp; Returns</p></details><p>原生 details 可以提供基础展开、折叠及键盘交互能力。</p></section>

<p><span>如果项目采用自定义 Accordion，就需要使用 button、aria-expanded、aria-controls，并同步控制内容的隐藏状态。</span></p>

<p><span>验收时重点检查：</span></p>

<ul><li><div><div><p><span>键盘可以展开和折叠。</span></p></div></div></li><li><div><div><p><span>展开状态能够被辅助技术识别。</span></p></div></div></li><li><div><div><p><span>折叠内容不会继续参与 Tab 导航。</span></p></div></div></li></ul>

<h2><span><strong>4.4 Tabs 标签页</strong></span></h2>

<p><span>Tabs 常见于商品描述、商品参数和评论区域。</span></p>

<section class="training-demo" data-training="tabs" aria-label="标签页状态演示"><div class="training-tabs" role="tablist" aria-label="Product information"><button type="button" role="tab" id="ada-training-tab-details" aria-controls="ada-training-panel-details" aria-selected="true" tabindex="0" data-training-action="tab" data-tab-key="details">Details</button><button type="button" role="tab" id="ada-training-tab-shipping" aria-controls="ada-training-panel-shipping" aria-selected="false" tabindex="-1" data-training-action="tab" data-tab-key="shipping">Shipping</button><button type="button" role="tab" id="ada-training-tab-reviews" aria-controls="ada-training-panel-reviews" aria-selected="false" tabindex="-1" data-training-action="tab" data-tab-key="reviews">Reviews</button></div><div id="ada-training-panel-details" role="tabpanel" aria-labelledby="ada-training-tab-details" tabindex="0"><p>Made from 100% cotton.</p></div><div id="ada-training-panel-shipping" role="tabpanel" aria-labelledby="ada-training-tab-shipping" tabindex="0" hidden><p>Shipping information.</p></div><div id="ada-training-panel-reviews" role="tabpanel" aria-labelledby="ada-training-tab-reviews" tabindex="0" hidden><p>Customer reviews.</p></div><p data-tab-status>当前选中：details　aria-selected=true</p><p>此处仅演示 Tab 状态，实际组件需实现对应键盘交互。</p></section>

<p><span>推荐语义结构：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div role="tablist" aria-label="Product information"&gt;

  &lt;button
    id="details-tab"
    role="tab"
    aria-selected="true"
    aria-controls="details-panel"
  &gt;
    Details
  &lt;/button&gt;

  &lt;button
    id="reviews-tab"
    role="tab"
    aria-selected="false"
    aria-controls="reviews-panel"
    tabindex="-1"
  &gt;
    Reviews
  &lt;/button&gt;

&lt;/div&gt;

&lt;div
  id="details-panel"
  role="tabpanel"
  aria-labelledby="details-tab"
  tabindex="0"
&gt;
  Product details...
&lt;/div&gt;

&lt;div
  id="reviews-panel"
  role="tabpanel"
  aria-labelledby="reviews-tab"
  tabindex="0"
  hidden
&gt;
  Customer reviews...
&lt;/div&gt;</code></pre>

<p><span>JavaScript 切换 Tab 时，需要同时更新：</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="4.4 Tabs 标签页"><table><tbody><tr><th scope="row"><p><span>属性或行为</span></p></th><th scope="row"><p><span>当前 Tab</span></p></th><th scope="row"><p><span>非当前 Tab</span></p></th></tr><tr><td><p><span>aria-selected</span></p></td><td><p><span>true</span></p></td><td><p><span>false</span></p></td></tr><tr><td><p><span>对应 Panel</span></p></td><td><p><span>显示</span></p></td><td><p><span>隐藏</span></p></td></tr><tr><td><p><span>常规 Tab 入口</span></p></td><td><p><span>tabindex="0"</span></p></td><td><p><span>tabindex="-1"</span></p></td></tr><tr><td><p><span>视觉选中样式</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr></tbody></table></div></div></div>

<p><span>以上 Tab 入口对应自动激活的常见实现。手动激活模式还需区分当前焦点与实际选中项。</span></p>

<p><span>Tabs 应支持组内方向键导航。手动激活模式下，使用 Enter 或 Space 激活当前焦点 Tab。</span></p>

<p><span>上面的 HTML 只是语义结构，必须配合对应的 JavaScript 行为才能形成完整组件。</span></p>

<p><span>相关实现参考：</span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/?utm_source=chatgpt.com"><span><span>W3C Tabs Pattern</span></span></a></span></p>

<h2><span><strong>4.5 Carousel 轮播组件</strong></span></h2>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><div class="training-rich-box" style="border-radius:8px;padding-block:calc(4px * 4);padding-inline:calc(4px * 4);background-color:rgb(228, 220, 208);gap:calc(4px * 2);"><span class="training-rich-caption" style="color:rgb(89, 89, 89);"><span>SUMMER COLLECTION</span></span><p class="training-rich-title" style="color:rgb(51, 51, 51);font-weight:600;"><span><strong>Discover your style</strong></span></p><div class="training-rich-box" style="align-items:start;"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(51, 51, 51);"><p style="color:rgb(255, 255, 255);"><span>Shop now</span></p></div></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 4);align-items:center;justify-content:center;"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:16;"><path d="M12.75 9.50001C12.75 9.08579 13.0858 8.75001 13.5 8.75001H14.5C14.9142 8.75001 15.25 9.08579 15.25 9.50001V14.5C15.25 14.9142 14.9142 15.25 14.5 15.25H13.5C13.0858 15.25 12.75 14.9142 12.75 14.5V9.50001Z" fill="currentColor"></path><path d="M9.50001 8.75001C9.08579 8.75001 8.75001 9.08579 8.75001 9.50001V14.5C8.75001 14.9142 9.08579 15.25 9.50001 15.25H10.5C10.9142 15.25 11.25 14.9142 11.25 14.5V9.50001C11.25 9.08579 10.9142 8.75001 10.5 8.75001H9.50001Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M1.97144 12C1.97144 6.46138 6.46138 1.97144 12 1.97144C17.5386 1.97144 22.0286 6.46138 22.0286 12C22.0286 17.5386 17.5386 22.0286 12 22.0286C6.46138 22.0286 1.97144 17.5386 1.97144 12ZM12 4.02858C7.59751 4.02858 4.02858 7.59751 4.02858 12C4.02858 16.4025 7.59751 19.9714 12 19.9714C16.4025 19.9714 19.9714 16.4025 19.9714 12C19.9714 7.59751 16.4025 4.02858 12 4.02858Z" fill="currentColor"></path></svg></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:16;"><path fill-rule="evenodd" d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"></path></svg></div><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(57, 120, 188);flex-shrink:0;height:9px;width:9px;"></div><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(153, 153, 153);flex-shrink:0;height:9px;width:9px;"></div><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(153, 153, 153);flex-shrink:0;height:9px;width:9px;"></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:16;"><path fill-rule="evenodd" d="M8.293 4.293a1 1 0 0 1 1.414 0l7 7a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div></div><span class="training-rich-caption"><span>轮播应具有可访问的切换控件，以及适用的暂停自动播放能力。</span></span></div></div>

<p><span>实际项目中的常见问题：</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="4.5 Carousel 轮播组件"><table><tbody><tr><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>整改方法</span></p></th></tr><tr><td><p><span>上一张、下一张没有名称</span></p></td><td><p><span>添加准确的 Accessible Name</span></p></td></tr><tr><td><p><span>只能通过滑动或拖拽切换</span></p></td><td><p><span>提供按钮等替代操作</span></p></td></tr><tr><td><p><span>自动轮播无法暂停</span></p></td><td><p><span>提供暂停、停止等机制</span></p></td></tr><tr><td><p><span>隐藏 Slide 仍可被 Tab 访问</span></p></td><td><p><span>hidden 或适当的 inert 隔离</span></p></td></tr><tr><td><p><span>分页圆点没有名称</span></p></td><td><p><span>Show slide 1 等</span></p></td></tr><tr><td><p><span>自动轮播不断打断阅读</span></p></td><td><p><span>避免持续 Live Region 播报</span></p></td></tr></tbody></table></div></div></div>

<h3><span><strong>常见代码修改</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button type="button" aria-label="Previous slide"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;

&lt;button type="button" aria-label="Next slide"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;

&lt;button type="button" aria-label="Show slide 1"
        aria-current="true"&gt;
&lt;/button&gt;

&lt;button type="button" aria-label="Pause slideshow"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>实际 JavaScript 需要同步控制当前 Slide、分页状态和自动播放定时器。</span></p>

<p><span>对于自动开始、持续超过 5 秒、与其他内容同时呈现的非必要运动内容，WCAG 2.2.2 要求提供暂停、停止或隐藏机制。自动更新内容还有相应要求，不能一律套用五秒条件。</span> <a class="training-source" href="https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html" aria-label="W3C：Understanding 2.2.2: Pause, Stop, Hide"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>Understanding 2.2.2: Pause, Stop, Hide</strong><small>www.w3.org</small></span></a></p>

<p><span>推荐在键盘焦点进入轮播时停止自动播放，用户明确请求后再恢复；鼠标悬停时也应暂停。</span> <a class="training-source" href="https://www.w3.org/WAI/ARIA/apg/patterns/carousel/" aria-label="W3C：APG · Carousel Pattern"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>APG · Carousel Pattern</strong><small>www.w3.org</small></span></a></p>

<p><span>如果使用 Swiper 等组件库，不要只开启 A11y 配置就认为整改已经完成。仍然需要测试隐藏 Slide、循环节点、键盘操作和暂停功能。</span></p>

<h2><span><strong>4.6 Search / Combobox 搜索建议组件</strong></span></h2>

<p><span>搜索建议组件相对复杂，不建议新员工在没有充分理解交互模式的情况下，从零重新实现。</span></p>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="border:2px solid rgb(57, 120, 188);border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:8px;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.875 4.5C7.35418 4.5 4.5 7.35418 4.5 10.875C4.5 14.3958 7.35418 17.25 10.875 17.25C14.3958 17.25 17.25 14.3958 17.25 10.875C17.25 7.35418 14.3958 4.5 10.875 4.5ZM2.5 10.875C2.5 6.24962 6.24962 2.5 10.875 2.5C15.5004 2.5 19.25 6.24962 19.25 10.875C19.25 12.8273 18.582 14.6236 17.462 16.0478L21.2071 19.7929C21.5976 20.1834 21.5976 20.8166 21.2071 21.2071C20.8166 21.5976 20.1834 21.5976 19.7929 21.2071L16.0478 17.462C14.6236 18.582 12.8273 19.25 10.875 19.25C6.24962 19.25 2.5 15.5004 2.5 10.875Z" fill="currentColor"></path></svg><span>Cotton</span> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></p></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);gap:calc(4px * 2);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:var(--training-rich-soft);">Cotton T-shirt</div><div class="training-rich-box" style="padding-block:calc(4px * 2);padding-inline:calc(4px * 2);">Cotton shirt</div><div class="training-rich-box" style="padding-block:calc(4px * 2);padding-inline:calc(4px * 2);">Cotton trousers</div></div><span class="training-rich-caption"><span>用户可以输入关键词，通过方向键选择建议，并通过 Enter 确认。</span></span></div></div>

<p><span>如果采用 Combobox + Listbox 模式，应重点检查这些属性：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="SearchInput"&gt;Search products&lt;/label&gt;

&lt;input
  id="SearchInput"
  type="text"
  role="combobox"
  aria-autocomplete="list"
  aria-expanded="true"
  aria-controls="SearchResults"
  aria-activedescendant="result-1"
&gt;

&lt;ul id="SearchResults" role="listbox"&gt;
  &lt;li id="result-1" role="option"
      aria-selected="true"&gt;
    Cotton T-shirt
  &lt;/li&gt;

  &lt;li id="result-2" role="option"
      aria-selected="false"&gt;
    Cotton shirt
  &lt;/li&gt;
&lt;/ul&gt;</code></pre>

<p><span>此示例表示列表已经展开，第一条建议处于活动状态。</span></p>

<p><span>需要实现的实际行为：</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="4.6 Search / Combobox 搜索建议组件"><table><tbody><tr><th scope="row"><p><span>按键</span></p></th><th scope="row"><p><span>行为</span></p></th></tr><tr><td><p><span>ArrowDown</span></p></td><td><p><span>选择下一条建议</span></p></td></tr><tr><td><p><span>ArrowUp</span></p></td><td><p><span>选择上一条建议</span></p></td></tr><tr><td><p><span>Enter</span></p></td><td><p><span>确认当前建议</span></p></td></tr><tr><td><p><span>Esc</span></p></td><td><p><span>关闭建议列表</span></p></td></tr><tr><td><p><span>Tab</span></p></td><td><p><span>离开当前组件</span></p></td></tr></tbody></table></div></div></div>

<p><span>DOM 焦点可以保留在输入框，通过 aria-activedescendant 指向当前活动建议。</span></p>

<p><span>关闭列表后，应同步 aria-expanded，并清除不再有效的 aria-activedescendant。</span></p>

<p><span>注意：如果搜索结果是包含商品链接、价格、加购按钮等多个交互控件的复杂区域，就不应该直接将整个区域强行套用 Listbox 模式。</span></p>

<p><span>详细交互参考：</span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/?utm_source=chatgpt.com"><span><span>Combobox Pattern</span></span></a></span><span>。</span> <a class="training-source" href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/" aria-label="W3C：APG · Combobox Pattern"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>W3C</span><span class="training-source-preview" aria-hidden="true"><small>W3C</small><strong>APG · Combobox Pattern</strong><small>www.w3.org</small></span></a></p>

<h2><span><strong>4.7 公共组件整改速查表</strong></span></h2>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="4.7 公共组件整改速查表"><table><tbody><tr><th scope="row"><p><span>组件</span></p></th><th scope="row"><p><span>核心整改重点</span></p></th></tr><tr><td><p><span>Modal / Drawer</span></p></td><td><p><span>名称、模态隔离、焦点恢复</span></p></td></tr><tr><td><p><span>Dropdown</span></p></td><td><p><span>展开状态、键盘进入、关闭</span></p></td></tr><tr><td><p><span>Accordion</span></p></td><td><p><span>展开状态、隐藏内容</span></p></td></tr><tr><td><p><span>Tabs</span></p></td><td><p><span>角色、选中状态、方向键</span></p></td></tr><tr><td><p><span>Carousel</span></p></td><td><p><span>切换按钮、暂停、隐藏内容</span></p></td></tr><tr><td><p><span>Combobox</span></p></td><td><p><span>输入名称、建议状态、键盘交互</span></p></td></tr><tr><td><p><span>Tooltip</span></p></td><td><p><span>Hover、Focus、Esc、描述关联</span></p></td></tr><tr><td><p><span>Quantity Selector</span></p></td><td><p><span>控件名称、数值限制</span></p></td></tr></tbody></table></div></div></div>

<h2><span><strong>4.8 本课实操任务</strong></span></h2>

<p><span>从公司现有项目中选择一个 Modal 或 Drawer，完成以下整改：</span></p>

<p><span>确保弹窗名称正确，打开时焦点进入弹窗，关闭时恢复焦点，键盘可以退出，关闭状态下内部元素无法被意外聚焦。</span></p>

<p><span>完成后分别在弹窗打开和关闭两种状态运行 axe，并用 NVDA 进行实际操作。</span></p>

<hr>
