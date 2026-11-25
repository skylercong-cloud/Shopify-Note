<h1><span><strong>第 1 课：快速认识 ADA 与无障碍检测</strong></span></h1>

<span><span>建议时长：40 分钟</span></span>

<h2><span><strong>1.1 什么是网站无障碍？</strong></span></h2>

<p><span>网站无障碍（Web Accessibility，简称 A11y），简单来说，就是让具有不同身体条件和操作能力的用户，都能够正常获取网站信息、使用网站功能。</span></p>

<p><span>例如，一个普通用户可以看到商品图片、使用鼠标选择颜色、点击加购按钮并完成购买。但并不是所有用户都能采用这种方式操作网站。</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>用户类型</span></p></th><th scope="row"><p><span>可能遇到的问题</span></p></th><th scope="row"><p><span>网站需要提供的支持</span></p></th></tr><tr><td><p><span>视力障碍用户</span></p></td><td><p><span>无法看到图片和文字</span></p></td><td><p><span>屏幕阅读器、替代文本</span></p></td></tr><tr><td><p><span>低视力用户</span></p></td><td><p><span>文字太小、颜色太浅</span></p></td><td><p><span>缩放、足够的对比度</span></p></td></tr><tr><td><p><span>色觉障碍用户</span></p></td><td><p><span>无法区分部分颜色</span></p></td><td><p><span>文字及其他状态标记</span></p></td></tr><tr><td><p><span>肢体障碍用户</span></p></td><td><p><span>无法使用鼠标</span></p></td><td><p><span>键盘及替代操作</span></p></td></tr><tr><td><p><span>听力障碍用户</span></p></td><td><p><span>无法听到视频声音</span></p></td><td><p><span>字幕及文字说明</span></p></td></tr><tr><td><p><span>认知障碍用户</span></p></td><td><p><span>难以理解复杂操作</span></p></td><td><p><span>清晰、一致的交互设计</span></p></td></tr></tbody></table></div></div>

<p><span>无障碍不仅服务于永久性残障用户，也能够帮助暂时受伤、处于强光环境、无法使用鼠标等情况下的普通用户。</span></p>

<p><span>对于电商网站，最终目标是让这些用户能够独立完成浏览、搜索、商品选择、加购和结账。</span></p>

<h2><span><strong>1.2 ADA、WCAG、ARIA 有什么区别？</strong></span></h2>

<p><span>这是员工必须首先理解的三个概念。</span></p>

<div class="training-box"><div class="training-box"><p><span><span><strong>ADA — 法律层面</strong></span></span></p><span><span>Americans with Disabilities Act</span></span><p><span>美国残障人士法案，涉及残障人士平等获得商品、服务等权利。</span></p></div><div class="training-box"><p><span><span><strong>WCAG — 技术标准层面</strong></span></span></p><span><span>Web Content Accessibility Guidelines</span></span><p><span>提供衡量网站内容是否具备无障碍能力的技术准则。</span></p></div><div class="training-box"><p><span><span><strong>HTML / CSS / JavaScript / WAI-ARIA — 技术实现层面</strong></span></span> <span>开发人员使用这些技术解决具体的无障碍问题。</span></p></div></div>

<p><span>公司日常所说的「ADA 整改」，通常就是依据约定的 WCAG 技术标准，对网站存在的无障碍问题进行修复。</span></p>

<p><span>需要注意，WCAG 技术符合性与 ADA 法律合规并不完全等同，检测工具通过也不是法律合规证明。</span></p>

<h2><span><strong>1.3 WCAG：日常开发需要满足什么标准？</strong></span></h2>

<p><span>WCAG 将无障碍要求划分为三个符合性级别。</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>级别</span></p></th><th scope="row"><p><span>含义</span></p></th></tr><tr><td><p><span>Level A</span></p></td><td><p><span>基础无障碍要求</span></p></td></tr><tr><td><p><span>Level AA</span></p></td><td><p><span>更进一步的无障碍要求，本课程的技术整改目标</span></p></td></tr><tr><td><p><span>Level AAA</span></p></td><td><p><span>更高的无障碍要求</span></p></td></tr></tbody></table></div></div>

<p><span>达到 AA 需要满足所有适用的 A 和 AA 准则。</span></p>

<p><span>WCAG 还有四个基本原则，简称 POUR。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-b85f2b7b5066.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>W3C</span></span></span></div></span></span></span></p>

<div class="training-grid"><div class="training-box"><div class="training-box"><p><span><span><strong>Perceivable · 可感知</strong></span></span></p><span><span>用户能够获取信息，例如图片 alt、文字对比度。</span></span></div></div><div class="training-box"><div class="training-box"><p><span><span><strong>Operable · 可操作</strong></span></span></p><span><span>用户能够操作网站，例如键盘导航、暂停轮播。</span></span></div></div><div class="training-box"><div class="training-box"><p><span><span><strong>Understandable · 可理解</strong></span></span></p><span><span>用户能够理解内容及操作，例如表单错误说明。</span></span></div></div><div class="training-box"><div class="training-box"><p><span><span><strong>Robust · 健壮性</strong></span></span></p><span><span>网站能够被浏览器和辅助技术正确识别。</span></span></div></div></div>

<p><span>不需要背诵所有准则。实际工作中遇到问题，再根据检测报告中的 WCAG 编号查询对应要求即可。</span></p>

<h2><span><strong>1.4 屏幕阅读器与 Accessibility Tree</strong></span></h2>

<p><span>屏幕阅读器（Screen Reader）是一种辅助技术，能够将网页中的内容、控件名称和状态等信息转换为语音或盲文。</span></p>

<p><span>常见屏幕阅读器：</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>工具</span></p></th><th scope="row"><p><span>平台</span></p></th></tr><tr><td><p><span>NVDA</span></p></td><td><p><span>Windows，免费开源</span></p></td></tr><tr><td><p><span>JAWS</span></p></td><td><p><span>Windows</span></p></td></tr><tr><td><p><span>VoiceOver</span></p></td><td><p><span>macOS、iPhone</span></p></td></tr><tr><td><p><span>TalkBack</span></p></td><td><p><span>Android</span></p></td></tr></tbody></table></div></div>

<p><span>浏览器会根据 HTML、CSS、ARIA 等信息构建 Accessibility Tree（无障碍树），供辅助技术获取相关语义信息。</span></p>

<div class="training-box"><div class="training-box"><p><span><span><strong>HTML DOM</strong></span></span> <code><span>&lt;button aria-label="Search"&gt;...&lt;/button&gt;</span></code></p></div><div class="training-box"><p><span><span><strong>Accessibility Tree</strong></span></span></p><div class="training-box"><p><span><span>Role（角色）</span></span><span>button</span></p></div><div class="training-box"><p><span><span>Name（名称）</span></span><span>Search</span></p></div><div class="training-box"><p><span><span>Focusable（可聚焦）</span></span><span>true</span></p></div></div><div class="training-box"><div class="training-box"><p><span><span><strong>Search, button</strong></span></span></p><span><span>屏幕阅读器可能的播报结果</span></span></div></div></div>

<p><span>日常开发只需要重点关注以下信息：</span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>属性</span></p></th><th scope="row"><p><span>含义</span></p></th><th scope="row"><p><span>示例</span></p></th></tr><tr><td><p><span>Role</span></p></td><td><p><span>元素是什么</span></p></td><td><p><span>button、link、checkbox</span></p></td></tr><tr><td><p><span>Name</span></p></td><td><p><span>元素叫什么</span></p></td><td><p><span>Search、Add to cart</span></p></td></tr><tr><td><p><span>State</span></p></td><td><p><span>当前状态是什么</span></p></td><td><p><span>checked、expanded</span></p></td></tr><tr><td><p><span>Value</span></p></td><td><p><span>当前值是什么</span></p></td><td><p><span>Quantity: 2</span></p></td></tr><tr><td><p><span>Description</span></p></td><td><p><span>补充说明</span></p></td><td><p><span>Please enter a valid email</span></p></td></tr></tbody></table></div></div>

<p><span>例如：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>普通用户可以根据图标判断这是搜索按钮，但屏幕阅读器可能只能获取 button 角色，无法获得按钮名称。</span></p>

<p><span>修复：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;button type="button" aria-label="Search"&gt;
  &lt;svg aria-hidden="true"&gt;...&lt;/svg&gt;
&lt;/button&gt;</code></pre>

<p><span>这就是一个最典型的 ADA 无障碍整改任务。</span></p>

<h2><span><strong>1.5 必须掌握的四个检测工具</strong></span></h2>

<div class="training-box"><div class="training-box"><p><span><span><strong>Lighthouse</strong></span></span></p><p><span>Chrome DevTools 内置工具，用于快速了解页面整体无障碍质量。</span></p><span><span>使用频率：页面初步检测、整改前后对比</span></span><p><span><a href="https://developer.chrome.com/docs/lighthouse/accessibility/scoring/?utm_source=chatgpt.com"><span><span>官方使用说明</span></span></a></span></p></div></div>

<hr>

<div class="training-box"><div class="training-box"><p><span><span><strong>axe DevTools</strong></span></span></p><p><span>浏览器扩展，用于检测具体错误、定位 DOM 元素及获取修复建议。</span></p><span><span>使用频率：日常整改的主要检测工具</span></span><p><span><a href="https://www.deque.com/axe/devtools/?utm_source=chatgpt.com"><span><span>官方网站</span></span></a></span></p></div></div>

<hr>

<div class="training-box"><div class="training-box"><p><span><span><strong>Chrome Accessibility 面板</strong></span></span></p><p><span>查看浏览器计算后的 Role、Name、Description 和 ARIA 状态。</span></p><span><span>使用频率：定位错误的具体技术原因</span></span></div></div>

<hr>

<div class="training-box"><div class="training-box"><p><span><span><strong>NVDA</strong></span></span></p><p><span>验证真实屏幕阅读器用户能否理解内容并完成操作。</span></p><span><span>使用频率：交互组件整改后的验收</span></span><p><span><a href="https://www.nvaccess.org/download/?utm_source=chatgpt.com"><span><span>免费下载</span></span></a></span></p></div></div>

<h3><span><strong>Lighthouse 使用方法</strong></span></h3>

<ol><li><div><div><p><span>使用 Chrome 打开需要检测的页面。</span></p></div></div></li><li><div><div><p><span>按 F12，打开 DevTools。</span></p></div></div></li><li><div><div><p><span>切换至 Lighthouse 面板。</span></p></div></div></li><li><div><div><p><span>勾选 Accessibility，运行检测。</span></p></div></div></li><li><div><div><p><span>展开失败项目，查看涉及的元素。</span></p></div></div></li></ol>

<h3><span><strong>axe DevTools 使用方法</strong></span></h3>

<p><span>安装扩展后，在 DevTools 中找到 axe DevTools 面板，运行扫描。</span></p>

<p><span>下面是一条模拟检测报告。</span></p>

<div class="training-box"><div class="training-box"><p><span><span><strong>axe DevTools</strong></span></span> <span><span>示例检测报告</span></span></p></div><hr><p><span>Buttons must have discernible text</span></p><div class="training-box"><div>Critical</div><span><span>WCAG 4.1.2</span></span></div><span><span>Rule ID</span></span><p><code><span>button-name</span></code></p><span><span>Element location</span></span><p><code><span>#HeaderSearchButton</span></code></p><span><span>Element source</span></span><div class="training-box"><p><span>&lt;button id="HeaderSearchButton"&gt; &lt;svg&gt;...&lt;/svg&gt; &lt;/button&gt;</span></p></div><span><span>How to fix</span></span><p><span>为按钮提供能够说明其功能的可访问名称。</span></p></div>

<p><span>员工需要能够从报告中获取四项信息：错误类型、涉及元素、问题原因、修复建议。</span></p>

<h3><span><strong>Chrome Accessibility 面板使用方法</strong></span></h3>

<p><span>在 Elements 面板中选中元素，找到 Accessibility 面板，查看 Computed Properties。</span></p>

<p><span>修改代码前后分别观察 Name、Role 等属性是否发生了预期变化。</span></p>

<h2><span><strong>1.6 Lighthouse 100 分就代表整改完成了吗？</strong></span></h2>

<p><span>不是。</span></p>

<p><span>Lighthouse 的无障碍评分不包含人工检查项目。</span><span><span><span><div><span><div class="training-box"><img src="content/training-assets/image-2ef5eab39f17.png" alt="" class="training-source-icon" loading="lazy" decoding="async"></div></span><span><span><span>Chrome for Developers</span></span></span></div></span></span></span></p>

<div class="training-table"><div><table><tbody><tr><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>自动检测能否充分判断</span></p></th></tr><tr><td><p><span>按钮缺少名称</span></p></td><td><p><span>通常可以</span></p></td></tr><tr><td><p><span>图片缺少 alt</span></p></td><td><p><span>通常可以</span></p></td></tr><tr><td><p><span>alt 内容描述错误</span></p></td><td><p><span>难以判断</span></p></td></tr><tr><td><p><span>弹窗关闭后焦点丢失</span></p></td><td><p><span>难以完整判断</span></p></td></tr><tr><td><p><span>加购成功后是否真实播报</span></p></td><td><p><span>难以判断</span></p></td></tr><tr><td><p><span>用户能否完成整个购买流程</span></p></td><td><p><span>不能完整判断</span></p></td></tr></tbody></table></div></div>

<p><span>因此，项目整改至少需要三种验证方式：</span><span><span><strong>自动化工具检测 + 键盘操作 + 必要的屏幕阅读器测试。</strong></span></span></p>

<h2><span><strong>1.7 课堂实操</strong></span></h2>

<p><span>打开公司测试店铺，执行一次 Lighthouse 和 axe 检测，找到一个没有可访问名称的图标按钮。使用 Chrome Accessibility 面板查看其 Name，临时增加正确的 aria-label，再重新检查。</span></p>

<p><span>通过这次操作，员工应该能够完成最简单的一次问题发现、修复和验证。</span></p>

<hr>
