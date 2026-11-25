<h1><span><strong>第 3 课：常用 ARIA、键盘交互与焦点管理</strong></span></h1>

<span><span>建议时长：55 分钟</span></span>

<p><span>前一课主要解决 HTML 和 CSS 层面的问题。这一课开始解决 JavaScript 交互组件中的无障碍问题。</span></p>

<p><span>对于日常开发而言，ARIA、Keyboard、Focus 和 Live Region 是最需要掌握的四项技术。</span></p>

<h2><span><strong>3.1 什么是 ARIA？</strong></span></h2>

<p><span>ARIA（Accessible Rich Internet Applications）主要用于向辅助技术补充元素的角色、名称、状态以及元素之间的关系。</span></p>

<p><span>例如一个展开按钮：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button
  type="button"
  aria-expanded="false"
  aria-controls="ProductDetails"
&gt;
  Product details
&lt;/button&gt;

&lt;div id="ProductDetails" hidden&gt;
  Product information...
&lt;/div&gt;</code></pre>

<p><span>通过 ARIA，屏幕阅读器可以知道：</span></p>

<ul><li><div><div><p><span>这是一个按钮。</span></p></div></div></li><li><div><div><p><span>按钮名称是 Product details。</span></p></div></div></li><li><div><div><p><span>当前处于折叠状态。</span></p></div></div></li><li><div><div><p><span>它与 ProductDetails 区域存在控制关系。</span></p></div></div></li></ul>

<p><span>但是 ARIA 并不会自动实现展开和折叠功能，仍然需要 JavaScript 控制。</span></p>

<p><span><span><strong>ARIA 负责表达语义，JavaScript 负责实现行为。</strong></span></span></p>

<h2><span><strong>3.2 常用 ARIA 属性速查表</strong></span></h2>

<p><span>以下属性足以覆盖大量日常项目整改场景。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="3.2 常用 ARIA 属性速查表"><table><tbody><tr><th scope="row"><p><span>属性</span></p></th><th scope="row"><p><span>作用</span></p></th><th scope="row"><p><span>常见使用场景</span></p></th></tr><tr><td><p><code><span>role</span></code></p></td><td><p><span>指定语义角色</span></p></td><td><p><span>Dialog、Tabs</span></p></td></tr><tr><td><p><code><span>aria-label</span></code></p></td><td><p><span>提供名称</span></p></td><td><p><span>搜索、删除等图标按钮</span></p></td></tr><tr><td><p><code><span>aria-labelledby</span></code></p></td><td><p><span>引用其他元素作为名称</span></p></td><td><p><span>弹窗标题</span></p></td></tr><tr><td><p><code><span>aria-describedby</span></code></p></td><td><p><span>引用补充说明</span></p></td><td><p><span>输入规则、错误提示</span></p></td></tr><tr><td><p><code><span>aria-hidden</span></code></p></td><td><p><span>从无障碍树中隐藏</span></p></td><td><p><span>装饰性 SVG</span></p></td></tr><tr><td><p><code><span>aria-expanded</span></code></p></td><td><p><span>表示展开或折叠</span></p></td><td><p><span>Dropdown、Accordion</span></p></td></tr><tr><td><p><code><span>aria-controls</span></code></p></td><td><p><span>指明控制的元素</span></p></td><td><p><span>下拉菜单、Tabs</span></p></td></tr><tr><td><p><code><span>aria-selected</span></code></p></td><td><p><span>表示选中状态</span></p></td><td><p><span>Tabs、Listbox</span></p></td></tr><tr><td><p><code><span>aria-checked</span></code></p></td><td><p><span>表示勾选状态</span></p></td><td><p><span>自定义 Checkbox、Radio</span></p></td></tr><tr><td><p><code><span>aria-pressed</span></code></p></td><td><p><span>表示切换按钮的按下状态</span></p></td><td><p><span>收藏按钮</span></p></td></tr><tr><td><p><code><span>aria-current</span></code></p></td><td><p><span>表示当前项目</span></p></td><td><p><span>导航、分页</span></p></td></tr><tr><td><p><code><span>aria-disabled</span></code></p></td><td><p><span>表示不可操作</span></p></td><td><p><span>Loading 按钮</span></p></td></tr><tr><td><p><code><span>aria-invalid</span></code></p></td><td><p><span>表示输入无效</span></p></td><td><p><span>表单校验</span></p></td></tr><tr><td><p><code><span>aria-live</span></code></p></td><td><p><span>通知动态内容变化</span></p></td><td><p><span>商品筛选、加购</span></p></td></tr><tr><td><p><code><span>aria-modal</span></code></p></td><td><p><span>表示模态状态</span></p></td><td><p><span>自定义 Modal</span></p></td></tr><tr><td><p><code><span>aria-haspopup</span></code></p></td><td><p><span>提示存在特定类型的弹出组件</span></p></td><td><p><span>Dialog、Menu</span></p></td></tr></tbody></table></div></div></div>

<p><span>需要注意，这些属性并不是可以任意添加到任何元素上的。应该根据实际元素角色和业务用途选择。</span></p>

<p><span>例如普通按钮不能随意使用 aria-selected，原生 Checkbox 也通常不需要重复添加 aria-checked。</span></p>

<h2><span><strong>3.3 三种常用的名称与描述设置方式</strong></span></h2>

<h3><span><strong>aria-label：直接提供名称</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button aria-label="Search"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>适合没有可见文字的图标按钮。</span></p>

<h3><span><strong>aria-labelledby：引用其他元素作为名称</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;dialog aria-labelledby="dialog-title"&gt;
  &lt;h2 id="dialog-title"&gt;Size guide&lt;/h2&gt;
&lt;/dialog&gt;</code></pre>

<p><span>适合页面上已经存在可见标题的组件。</span></p>

<h3><span><strong>aria-describedby：引用其他元素作为补充说明</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;label for="password"&gt;Password&lt;/label&gt;

&lt;input
  id="password"
  type="password"
  aria-describedby="password-rule"
&gt;

&lt;p id="password-rule"&gt;
  Use at least 8 characters.
&lt;/p&gt;</code></pre>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><span class="training-rich-caption"><span>浏览器计算结果示意</span></span><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span><span>Role</span></span> <span>textbox</span></p></div><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span><span>Name</span></span> <span>Password</span></p></div><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Description</span></p> <p><span>Use at least 8 characters.</span></p></div></div></div>

<p><span>简单记忆：label 是名称，description 是补充说明。</span></p>

<p><span>当原生 HTML 已经提供了正确名称、角色或状态时，不需要重复添加 ARIA。</span></p>

<h2><span><strong>3.4 如何区分几个容易混淆的状态？</strong></span></h2>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>aria-expanded</strong></span></span></p><span class="training-rich-caption"><span>控制的内容是否展开</span></span></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Details</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></p></div></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>aria-selected</strong></span></span></p><span class="training-rich-caption"><span>复合组件中哪个项目被选中</span></span></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);"><p style="font-weight:500;"><span>Details</span></p><p><span>Reviews</span></p></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>checked / aria-checked</strong></span></span></p><span class="training-rich-caption"><span>复选框、单选框的选择状态</span></span></div><div class="training-rich-box training-rich-row" style="gap:8px;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:16;"><path d="M8.7587 3H15.2413C16.0463 2.99999 16.7106 2.99998 17.2518 3.04419C17.8139 3.09012 18.3306 3.18868 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C20.8113 5.66937 20.9099 6.18608 20.9558 6.74817C21 7.28936 21 7.95372 21 8.75868V15.2413C21 16.0463 21 16.7106 20.9558 17.2518C20.9099 17.8139 20.8113 18.3306 20.564 18.816C20.1805 19.5686 19.5686 20.1805 18.816 20.564C18.3306 20.8113 17.8139 20.9099 17.2518 20.9558C16.7106 21 16.0463 21 15.2413 21H8.75868C7.95372 21 7.28936 21 6.74817 20.9558C6.18608 20.9099 5.66937 20.8113 5.18404 20.564C4.43139 20.1805 3.81947 19.5686 3.43597 18.816C3.18868 18.3306 3.09012 17.8139 3.04419 17.2518C2.99998 16.7106 2.99999 16.0463 3 15.2413V8.7587C2.99999 7.95373 2.99998 7.28937 3.04419 6.74817C3.09012 6.18608 3.18868 5.66937 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C5.66937 3.18868 6.18608 3.09012 6.74817 3.04419C7.28937 2.99998 7.95373 2.99999 8.7587 3ZM6.91104 5.03755C6.47262 5.07337 6.24842 5.1383 6.09202 5.21799C5.7157 5.40973 5.40973 5.7157 5.21799 6.09202C5.1383 6.24842 5.07337 6.47262 5.03755 6.91104C5.00078 7.36113 5 7.94342 5 8.8V15.2C5 16.0566 5.00078 16.6389 5.03755 17.089C5.07337 17.5274 5.1383 17.7516 5.21799 17.908C5.40973 18.2843 5.7157 18.5903 6.09202 18.782C6.24842 18.8617 6.47262 18.9266 6.91104 18.9624C7.36113 18.9992 7.94342 19 8.8 19H15.2C16.0566 19 16.6389 18.9992 17.089 18.9624C17.5274 18.9266 17.7516 18.8617 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C18.8617 17.7516 18.9266 17.5274 18.9624 17.089C18.9992 16.6389 19 16.0566 19 15.2V8.8C19 7.94342 18.9992 7.36113 18.9624 6.91104C18.9266 6.47262 18.8617 6.24842 18.782 6.09202C18.5903 5.7157 18.2843 5.40973 17.908 5.21799C17.7516 5.1383 17.5274 5.07337 17.089 5.03755C16.6389 5.00078 16.0566 5 15.2 5H8.8C7.94342 5 7.36113 5.00078 6.91104 5.03755ZM16.3255 7.93219C16.7772 8.25003 16.8856 8.87383 16.5678 9.32549L11.8178 16.0755C11.6431 16.3237 11.3652 16.4792 11.0623 16.4981C10.7593 16.517 10.4642 16.3973 10.2601 16.1727L7.76006 13.4227C7.38855 13.014 7.41867 12.3816 7.82733 12.0101C8.23599 11.6386 8.86843 11.6687 9.23994 12.0773L10.9004 13.9039L14.9322 8.17451C15.25 7.72285 15.8738 7.61436 16.3255 7.93219Z" fill="currentColor"></path></svg><p><span>In stock</span></p></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>aria-pressed</strong></span></span></p><span class="training-rich-caption"><span>切换按钮是否处于按下状态</span></span></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:rgb(189, 83, 83);--rich-icon-size:16;"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7065 5.08876C15.4684 4.81932 14.0054 5.13654 12.7035 6.42541C12.3138 6.81124 11.6861 6.81124 11.2964 6.42541C9.99459 5.13654 8.53151 4.81932 7.29343 5.08877C6.03256 5.36318 4.93053 6.26056 4.39835 7.55581C3.40533 9.97264 4.28865 14.4771 12 18.8553C19.7113 14.4771 20.5946 9.97263 19.6016 7.55581C19.0694 6.26055 17.9674 5.36317 16.7065 5.08876ZM21.4515 6.7957C23.0618 10.7149 20.9413 16.2482 12.48 20.8773C12.1809 21.0409 11.8191 21.0409 11.5201 20.8773C3.05865 16.2483 0.938114 10.7149 2.54841 6.79572C3.328 4.89834 4.95885 3.55004 6.86812 3.13451C8.54925 2.76864 10.3911 3.13647 12 4.38547C13.6088 3.13647 15.4507 2.76864 17.1318 3.13451C19.0411 3.55003 20.6719 4.89833 21.4515 6.7957Z" fill="currentColor"></path></svg></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>aria-current</strong></span></span></p><span class="training-rich-caption"><span>当前位置，例如当前分页</span></span></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);"><p><span>1 </span><span style="font-weight:700;"><span><strong>2</strong></span></span><span> 3</span></p></div></div></div></div>

<p><span>例如分页组件使用：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;span aria-current="page"&gt;2&lt;/span&gt;</code></pre>

<p><span>而不是：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;span aria-selected="true"&gt;2&lt;/span&gt;</code></pre>

<p><span>不要为了表达视觉上的 active 状态，就随意选择一个 ARIA 属性。</span></p>

<h2><span><strong>3.5 ARIA 状态必须与实际行为同步</strong></span></h2>

<p><span>错误代码：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button aria-expanded="false"&gt;
  Product details
&lt;/button&gt;

&lt;div class="content"&gt;
  Product information...
&lt;/div&gt;</code></pre>

<p><span>如果 content 实际已经展开，那么 aria-expanded=false 就是错误的状态。</span></p>

<p><span>正确实现：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">button.addEventListener('click', () =&gt; {
  const expanded =
    button.getAttribute('aria-expanded') === 'true';

  button.setAttribute(
    'aria-expanded',
    String(!expanded)
  );

  content.hidden = expanded;
});</code></pre>

<section class="training-demo" data-training="disclosure" aria-label="ARIA 状态同步演示"><p><strong>ARIA 状态同步演示</strong></p><button type="button" data-training-action="disclosure" aria-expanded="false" aria-controls="ada-training-disclosure">Product details</button><div id="ada-training-disclosure" hidden><p>Made from 100% cotton. Machine washable.</p></div><dl class="training-state"><dt>aria-expanded</dt><dd data-disclosure-expanded>false</dd><dt>content.hidden</dt><dd data-disclosure-hidden>true</dd></dl><p data-demo-announcement role="status">Product details, button, collapsed</p><p>点击标题，观察视觉状态、隐藏状态和 ARIA 状态的同步变化。播报内容为示意。</p></section>

<p><span>以后开发任何具有展开、选中、禁用状态的组件，都应该检查这三者是否一致：</span></p>

<p><span><span><strong>业务状态 → 视觉状态 → 无障碍状态。</strong></span></span></p>

<h2><span><strong>3.6 键盘交互</strong></span></h2>

<p><span>所有适用的网站功能都应该能够通过键盘操作。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="3.6 键盘交互"><table><tbody><tr><th scope="row"><p><span>按键</span></p></th><th scope="row"><p><span>常见用途</span></p></th></tr><tr><td><p><span>Tab</span></p></td><td><p><span>聚焦下一个交互控件</span></p></td></tr><tr><td><p><span>Shift + Tab</span></p></td><td><p><span>反向移动焦点</span></p></td></tr><tr><td><p><span>Enter</span></p></td><td><p><span>激活链接、按钮</span></p></td></tr><tr><td><p><span>Space</span></p></td><td><p><span>激活按钮、选择 Checkbox</span></p></td></tr><tr><td><p><span>Esc</span></p></td><td><p><span>关闭适用的弹窗</span></p></td></tr><tr><td><p><span>方向键</span></p></td><td><p><span>Radio、Tabs、Combobox 内部导航</span></p></td></tr></tbody></table></div></div></div>

<p><span>并不是所有组件都需要支持全部按键，应遵循对应组件的交互模式。</span></p>

<p><span>例如原生 button 已经支持 Enter 和 Space，不需要额外手动监听 keydown 来重复触发 click。</span></p>

<h2><span><strong>3.7 tabindex 的三个常用取值</strong></span></h2>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="3.7 tabindex 的三个常用取值"><table><tbody><tr><th scope="row"><p><span>设置</span></p></th><th scope="row"><p><span>含义</span></p></th></tr><tr><td><p><span>不设置</span></p></td><td><p><span>使用元素原本的焦点行为</span></p></td></tr><tr><td><p><code><span>tabindex="0"</span></code></p></td><td><p><span>加入正常 Tab 导航顺序</span></p></td></tr><tr><td><p><code><span>tabindex="-1"</span></code></p></td><td><p><span>不参与正常 Tab 导航，但可以通过 JS 聚焦</span></p></td></tr><tr><td><p><code><span>tabindex="1"</span></code><span> 等正数</span></p></td><td><p><span>人为改变焦点顺序，通常应避免</span></p></td></tr></tbody></table></div></div></div>

<p><span>例如需要通过 JavaScript 聚焦某个标题：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;h2 id="ResultsTitle" tabindex="-1"&gt;
  Search results
&lt;/h2&gt;</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">document.querySelector('#ResultsTitle').focus();</code></pre>

<p><span>注意，给 div 添加 tabindex="0" 只会使它可以聚焦，不会自动获得按钮语义和按钮交互能力。</span></p>

<h2><span><strong>3.8 Focus Management：焦点管理</strong></span></h2>

<p><span>在整改复杂组件时，通常需要处理以下五种场景。</span></p>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><p class="training-rich-title" style="color:var(--muted);font-weight:600;"><span><strong>01</strong></span></p><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>Initial Focus</strong></span></span><span class="training-rich-caption"><span>打开弹窗时，将焦点移入弹窗。</span></span></p></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><p class="training-rich-title" style="color:var(--muted);font-weight:600;"><span><strong>02</strong></span></p><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>Focus Trap / Isolation</strong></span></span><span class="training-rich-caption"><span>模态弹窗打开时，焦点不能意外进入背景页面。</span></span></p></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><p class="training-rich-title" style="color:var(--muted);font-weight:600;"><span><strong>03</strong></span></p><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>Focus Restoration</strong></span></span><span class="training-rich-caption"><span>关闭弹窗时，恢复到合理的原触发控件。</span></span></p></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><p class="training-rich-title" style="color:var(--muted);font-weight:600;"><span><strong>04</strong></span></p><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>Focus Preservation</strong></span></span><span class="training-rich-caption"><span>异步更新 DOM 时，保留用户当前操作位置。</span></span></p></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><p class="training-rich-title" style="color:var(--muted);font-weight:600;"><span><strong>05</strong></span></p><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 1);"><p><span><span><strong>Focus Fallback</strong></span></span><span class="training-rich-caption"><span>原焦点元素被删除时，找到新的合理焦点。</span></span></p></div></div></div></div>

<h3><span><strong>如何查看当前焦点？</strong></span></h3>

<p><span>在浏览器 Console 中执行：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">document.activeElement</code></pre>

<p><span>也可以实时监听：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">document.addEventListener('focusin', event =&gt; {
  console.log('Current focus:', event.target);
});</code></pre>

<p><span>这两个方法在排查购物车、商品筛选、弹窗及 Section Rendering 问题时非常实用。</span></p>

<h3><span><strong>DOM 更新为什么会导致焦点丢失？</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">container.innerHTML = newHTML;</code></pre>

<p><span>如果焦点原本位于 container 内部，更新之后原节点可能已经被销毁。</span></p>

<p><span>即使新节点的 ID 完全相同，也不是之前的 DOM 节点。</span></p>

<p><span>通常应优先保留原节点；无法保留时，在更新前记录焦点标识，更新后找到对应的新控件并恢复焦点。</span></p>

<h2><span><strong>3.9 disabled 与 aria-disabled</strong></span></h2>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="3.9 disabled 与 aria-disabled"><table><tbody><tr><th scope="row"><p><span>对比</span></p></th><th scope="row"><p><span>disabled</span></p></th><th scope="row"><p><span>aria-disabled="true"</span></p></th></tr><tr><td><p><span>阻止原生按钮激活</span></p></td><td><p><span>是</span></p></td><td><p><span>否</span></p></td></tr><tr><td><p><span>通常可以继续聚焦</span></p></td><td><p><span>否</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><span>表达不可操作状态</span></p></td><td><p><span>是</span></p></td><td><p><span>是</span></p></td></tr><tr><td><p><span>需要 JS 阻止操作</span></p></td><td><p><span>通常不需要</span></p></td><td><p><span>需要</span></p></td></tr></tbody></table></div></div></div>

<p><span>商品售罄时，可以直接使用：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button disabled&gt;Sold out&lt;/button&gt;</code></pre>

<p><span>而异步加购期间，为了避免突然丢失焦点，可以考虑：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button aria-disabled="true"&gt;
  Adding to cart...
&lt;/button&gt;</code></pre>

<p><span>但必须同时在业务逻辑中阻止重复提交。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">form.addEventListener('submit', async event =&gt; {
  event.preventDefault();

  if (isSubmitting) return;

  isSubmitting = true;

  try {
    await addToCart();
  } finally {
    isSubmitting = false;
  }
});</code></pre>

<p><span>不要认为设置 aria-disabled 就能够自动禁止操作。</span></p>

<h2><span><strong>3.10 Live Region：动态内容通知</strong></span></h2>

<p><span>普通用户能够看到页面上的价格、库存、购物车数量发生变化，但屏幕阅读器不一定主动通知这些变化。</span></p>

<p><span>因此，对于重要的动态状态，需要提供 Live Region。</span></p>

<h3><span><strong>常用通知方式</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="常用通知方式"><table><tbody><tr><th scope="row"><p><span>方式</span></p></th><th scope="row"><p><span>用途</span></p></th></tr><tr><td><p><code><span>role="status"</span></code></p></td><td><p><span>普通业务状态通知</span></p></td></tr><tr><td><p><code><span>aria-live="polite"</span></code></p></td><td><p><span>在合适时机播报</span></p></td></tr><tr><td><p><code><span>role="alert"</span></code></p></td><td><p><span>需要及时感知的重要错误</span></p></td></tr><tr><td><p><code><span>aria-live="assertive"</span></code></p></td><td><p><span>可能打断当前播报，应谨慎使用</span></p></td></tr></tbody></table></div></div></div>

<h3><span><strong>加购成功</strong></span></h3>

<p><span>提前在 HTML 中建立通知节点：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;p id="CartStatus"
   role="status"
   class="visually-hidden"&gt;&lt;/p&gt;</code></pre>

<p><span>服务器确认加购成功后：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">document.querySelector('#CartStatus').textContent =
  'Cotton T-shirt added to your cart.';</code></pre>

<h3><span><strong>商品筛选</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">status.textContent = '18 products found.';</code></pre>

<h3><span><strong>库存错误</strong></span></h3>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;p id="CartError" role="alert"&gt;&lt;/p&gt;</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">cartError.textContent =
  'Only 3 items are available.';</code></pre>

<p><span>注意事项：</span></p>

<ul><li><div><div><p><span>尽量提前创建 Live Region，再更新其文字。</span></p></div></div></li><li><div><div><p><span>不要对整个商品列表或整个购物车设置 aria-live。</span></p></div></div></li><li><div><div><p><span>不要让多个区域重复播报同一条信息。</span></p></div></div></li><li><div><div><p><span>不要将通知区域设置为 display:none。</span></p></div></div></li><li><div><div><p><span>模态弹窗打开时，相关通知通常应放在弹窗内部。</span></p></div></div></li></ul>

<p><span>是否实际播报成功，需要使用真实屏幕阅读器验证。</span></p>

<h2><span><strong>3.11 本课实操任务</strong></span></h2>

<p><span>开发一个可展开的商品描述组件，要求使用原生 button，正确同步 aria-expanded，通过 Enter 和 Space 操作，关闭时内容不可被 Tab 访问。</span></p>

<p><span>然后增加一个模拟加购按钮，在点击成功后通过 role="status" 通知用户。</span></p>

<p><span>验收时检查组件视觉表现、Accessibility Tree、键盘操作及 NVDA 播报。</span></p>

<hr>
