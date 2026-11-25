<h1><span><strong>第 4 课：常见 UI 组件无障碍整改实战</strong></span></h1>

<span><span>建议时长：60 分钟</span></span>

<p><span>这一课不要求员工从零开发所有组件，而是需要学会判断现有组件存在哪些问题，以及应该如何整改。</span></p>

<p><span>对于复杂组件，推荐参考 W3C 的 </span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/?utm_source=chatgpt.com"><span><span>ARIA Authoring Practices Guide（APG）</span></span></a></span><span>，其中提供了常见组件的语义与键盘交互模式。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<h2><span><strong>4.1 Modal / Drawer 弹窗组件</strong></span></h2>

<div class="training-grid"><div class="training-box"><div class="training-box"><div class="training-box"><p><span>STORE</span></p></div><div class="training-box"><div class="training-box"><p><span><span><strong>Size guide</strong></span></span></p></div><p><span>Find your perfect fit.</span></p><div class="training-box">Close</div></div><div class="training-box">Add to cart</div></div><span><span>错误：焦点仍然能够进入背景页面。</span></span></div><div class="training-box"><div class="training-box"><div class="training-box"><p><span>STORE</span></p></div><div class="training-box"><div class="training-box"><p><span><span><strong>Size guide</strong></span></span></p></div><p><span>Find your perfect fit.</span></p><div class="training-box">Close</div></div><div class="training-box"><p><span>Add to cart</span></p></div></div><span><span>正确：焦点位于当前活动弹窗内部。</span></span></div></div>

<h3><span><strong>常见问题</strong></span></h3>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>整改方式</span></p></th></tr><tr><td><p><span>弹窗没有 Dialog 语义</span></p></td><td><p><span>使用原生 dialog 或正确的 role</span></p></td></tr><tr><td><p><span>弹窗没有名称</span></p></td><td><p><span>aria-labelledby</span></p></td></tr><tr><td><p><span>打开后焦点仍停留在背景</span></p></td><td><p><span>设置初始焦点</span></p></td></tr><tr><td><p><span>Tab 可以进入背景页面</span></p></td><td><p><span>模态隔离及焦点管理</span></p></td></tr><tr><td><p><span>Esc 无法关闭</span></p></td><td><p><span>提供合理的键盘退出机制</span></p></td></tr><tr><td><p><span>关闭后焦点丢失</span></p></td><td><p><span>恢复到触发控件</span></p></td></tr><tr><td><p><span>关闭后内部元素仍可访问</span></p></td><td><p><span>hidden、inert 等</span></p></td></tr></tbody></table></div></div>

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

<p><span>推荐使用 button 控制普通链接列表的显示和隐藏。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

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

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>属性或行为</span></p></th><th scope="row"><p><span>当前 Tab</span></p></th><th scope="row"><p><span>非当前 Tab</span></p></th></tr><tr><td><p><span>aria-selected</span></p></td><td><p><span>true</span></p></td><td><p><span>false</span></p></td></tr><tr><td><p><span>对应 Panel</span></p></td><td><p><span>显示</span></p></td><td><p><span>隐藏</span></p></td></tr><tr><td><p><span>常规 Tab 入口</span></p></td><td><p><span>tabindex="0"</span></p></td><td><p><span>tabindex="-1"</span></p></td></tr><tr><td><p><span>视觉选中样式</span></p></td><td><p><span>有</span></p></td><td><p><span>无</span></p></td></tr></tbody></table></div></div>

<p><span>以上 Tab 入口对应自动激活的常见实现。手动激活模式还需区分当前焦点与实际选中项。</span></p>

<p><span>Tabs 应支持组内方向键导航。手动激活模式下，使用 Enter 或 Space 激活当前焦点 Tab。</span></p>

<p><span>上面的 HTML 只是语义结构，必须配合对应的 JavaScript 行为才能形成完整组件。</span></p>

<p><span>相关实现参考：</span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/?utm_source=chatgpt.com"><span><span>W3C Tabs Pattern</span></span></a></span></p>

<h2><span><strong>4.5 Carousel 轮播组件</strong></span></h2>

<div class="training-box"><div class="training-box"><span><span>SUMMER COLLECTION</span></span><p class="training-example-heading"><strong><span><strong>Discover your style</strong></span></strong></p><div class="training-box"><div class="training-box"><p><span>Shop now</span></p></div></div></div><span><span>轮播应具有可访问的切换控件，以及适用的暂停自动播放能力。</span></span></div>

<p><span>实际项目中的常见问题：</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>整改方法</span></p></th></tr><tr><td><p><span>上一张、下一张没有名称</span></p></td><td><p><span>添加准确的 Accessible Name</span></p></td></tr><tr><td><p><span>只能通过滑动或拖拽切换</span></p></td><td><p><span>提供按钮等替代操作</span></p></td></tr><tr><td><p><span>自动轮播无法暂停</span></p></td><td><p><span>提供暂停、停止等机制</span></p></td></tr><tr><td><p><span>隐藏 Slide 仍可被 Tab 访问</span></p></td><td><p><span>hidden 或适当的 inert 隔离</span></p></td></tr><tr><td><p><span>分页圆点没有名称</span></p></td><td><p><span>Show slide 1 等</span></p></td></tr><tr><td><p><span>自动轮播不断打断阅读</span></p></td><td><p><span>避免持续 Live Region 播报</span></p></td></tr></tbody></table></div></div>

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

<p><span>对于自动开始、持续超过 5 秒、与其他内容同时呈现的非必要运动内容，WCAG 2.2.2 要求提供暂停、停止或隐藏机制。自动更新内容还有相应要求，不能一律套用五秒条件。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<p><span>推荐在键盘焦点进入轮播时停止自动播放，用户明确请求后再恢复；鼠标悬停时也应暂停。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<p><span>如果使用 Swiper 等组件库，不要只开启 A11y 配置就认为整改已经完成。仍然需要测试隐藏 Slide、循环节点、键盘操作和暂停功能。</span></p>

<h2><span><strong>4.6 Search / Combobox 搜索建议组件</strong></span></h2>

<p><span>搜索建议组件相对复杂，不建议新员工在没有充分理解交互模式的情况下，从零重新实现。</span></p>

<div class="training-box"><div class="training-box"><p><span>Cotton</span></p></div><div class="training-box"><div class="training-box">Cotton T-shirt</div><div class="training-box">Cotton shirt</div><div class="training-box">Cotton trousers</div></div><span><span>用户可以输入关键词，通过方向键选择建议，并通过 Enter 确认。</span></span></div>

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

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>按键</span></p></th><th scope="row"><p><span>行为</span></p></th></tr><tr><td><p><span>ArrowDown</span></p></td><td><p><span>选择下一条建议</span></p></td></tr><tr><td><p><span>ArrowUp</span></p></td><td><p><span>选择上一条建议</span></p></td></tr><tr><td><p><span>Enter</span></p></td><td><p><span>确认当前建议</span></p></td></tr><tr><td><p><span>Esc</span></p></td><td><p><span>关闭建议列表</span></p></td></tr><tr><td><p><span>Tab</span></p></td><td><p><span>离开当前组件</span></p></td></tr></tbody></table></div></div>

<p><span>DOM 焦点可以保留在输入框，通过 aria-activedescendant 指向当前活动建议。</span></p>

<p><span>关闭列表后，应同步 aria-expanded，并清除不再有效的 aria-activedescendant。</span></p>

<p><span>注意：如果搜索结果是包含商品链接、价格、加购按钮等多个交互控件的复杂区域，就不应该直接将整个区域强行套用 Listbox 模式。</span></p>

<p><span>详细交互参考：</span><span><a href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/?utm_source=chatgpt.com"><span><span>Combobox Pattern</span></span></a></span><span>。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<h2><span><strong>4.7 公共组件整改速查表</strong></span></h2>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>组件</span></p></th><th scope="row"><p><span>核心整改重点</span></p></th></tr><tr><td><p><span>Modal / Drawer</span></p></td><td><p><span>名称、模态隔离、焦点恢复</span></p></td></tr><tr><td><p><span>Dropdown</span></p></td><td><p><span>展开状态、键盘进入、关闭</span></p></td></tr><tr><td><p><span>Accordion</span></p></td><td><p><span>展开状态、隐藏内容</span></p></td></tr><tr><td><p><span>Tabs</span></p></td><td><p><span>角色、选中状态、方向键</span></p></td></tr><tr><td><p><span>Carousel</span></p></td><td><p><span>切换按钮、暂停、隐藏内容</span></p></td></tr><tr><td><p><span>Combobox</span></p></td><td><p><span>输入名称、建议状态、键盘交互</span></p></td></tr><tr><td><p><span>Tooltip</span></p></td><td><p><span>Hover、Focus、Esc、描述关联</span></p></td></tr><tr><td><p><span>Quantity Selector</span></p></td><td><p><span>控件名称、数值限制</span></p></td></tr></tbody></table></div></div>

<h2><span><strong>4.8 本课实操任务</strong></span></h2>

<p><span>从公司现有项目中选择一个 Modal 或 Drawer，完成以下整改：</span></p>

<p><span>确保弹窗名称正确，打开时焦点进入弹窗，关闭时恢复焦点，键盘可以退出，关闭状态下内部元素无法被意外聚焦。</span></p>

<p><span>完成后分别在弹窗打开和关闭两种状态运行 axe，并用 NVDA 进行实际操作。</span></p>

<hr>
