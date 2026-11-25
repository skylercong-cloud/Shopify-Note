<h1><span><strong>第 6 课：无障碍检测、整改与验收完整流程</strong></span></h1>

<span><span>建议时长：40 分钟</span></span>

<p><span>最后一课不再增加太多技术知识，而是帮助员工掌握公司日常 ADA 整改的标准工作方式。</span></p>

<p><span>假设项目经理给你一份包含几十条无障碍问题的报告，你应该如何开始工作？</span></p>

<h2><span><strong>6.1 标准整改工作流程</strong></span></h2>

<div class="training-box"><div class="training-box"><p><span><span><strong>01 · 阅读报告</strong></span></span></p><span><span>确定错误类型、页面、元素及适用准则。</span></span></div><div class="training-box"><p><span><span><strong>02 · 复现问题</strong></span></span></p><span><span>使用检测工具或人工操作确认真实表现。</span></span></div><div class="training-box"><p><span><span><strong>03 · 定位源码</strong></span></span></p><span><span>找到对应的 Liquid、CSS、JavaScript 或第三方 App。</span></span></div><div class="training-box"><p><span><span><strong>04 · 修改代码</strong></span></span></p><span><span>从根本原因修复，不盲目堆砌 ARIA 属性。</span></span></div><div class="training-box"><p><span><span><strong>05 · 自动检测</strong></span></span></p><span><span>重新运行 axe，确认对应错误消失。</span></span></div><div class="training-box"><p><span><span><strong>06 · 人工验证</strong></span></span></p><span><span>检查键盘、焦点、语义、播报和业务功能。</span></span></div><div class="training-box"><p><span><span><strong>07 · 回归测试</strong></span></span></p><span><span>检查同类组件及不同页面状态。</span></span></div><div class="training-box"><p><span><span><strong>08 · 提交验收</strong></span></span></p><span><span>记录修改结果、测试证据及未解决问题。</span></span></div></div>

<h2><span><strong>6.2 如何看懂 axe 检测报告？</strong></span></h2>

<p><span>下面是一份模拟检测报告。</span></p>

<div class="training-card training-box"><div class="training-box"><p><span><span><strong>Accessibility Scan</strong></span></span> <span><span>教学示例</span></span></p></div><div class="training-grid"><div class="training-box"><div class="training-box"><span><span>确定的问题节点条目</span></span><p class="training-example-heading"><strong><span><strong>19</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>失败规则</span></span><p class="training-example-heading"><strong><span><strong>5</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>待人工检查</span></span><p class="training-example-heading"><strong><span><strong>4</strong></span></strong></p></div></div></div><hr><div class="training-box"><div class="training-box"><p><span>button-name</span></p><span><span>按钮缺少名称</span></span></div><p><span><span><strong>4</strong></span></span></p></div><div class="training-box"><div class="training-box"><p><span>color-contrast</span></p><span><span>文字对比度不足</span></span></div><p><span><span><strong>8</strong></span></span></p></div><div class="training-box"><div class="training-box"><p><span>image-alt</span></p><span><span>图片缺少替代文本</span></span></div><p><span><span><strong>3</strong></span></span></p></div><div class="training-box"><div class="training-box"><p><span>aria-hidden-focus</span></p><span><span>隐藏区域包含可聚焦元素</span></span></div><p><span><span><strong>2</strong></span></span></p></div><div class="training-box"><div class="training-box"><p><span>label</span></p><span><span>表单控件缺少名称</span></span></div><p><span><span><strong>2</strong></span></span></p></div><span><span>检测节点条目可能重复涉及同一个元素，不一定等于独立代码问题数量。</span></span></div>

<h3><span><strong>报告结果分类</strong></span></h3>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="报告结果分类"><table><tbody><tr><th scope="row"><p><span>类型</span></p></th><th scope="row"><p><span>含义</span></p></th><th scope="row"><p><span>处理方式</span></p></th></tr><tr><td><p><span>Violations</span></p></td><td><p><span>工具确定的规则失败</span></p></td><td><p><span>检查并修复</span></p></td></tr><tr><td><p><span>Incomplete</span></p></td><td><p><span>工具无法自动判断</span></p></td><td><p><span>人工确认</span></p></td></tr><tr><td><p><span>Passes</span></p></td><td><p><span>当前检测状态下通过</span></p></td><td><p><span>无需针对该结果修改</span></p></td></tr><tr><td><p><span>Inapplicable</span></p></td><td><p><span>当前页面没有适用元素</span></p></td><td><p><span>无需处理</span></p></td></tr></tbody></table></div></div></div>

<p><span>工具还可能将问题划分为 Critical、Serious、Moderate、Minor 等影响等级。</span></p>

<p><span>这些等级不是 WCAG 的 A、AA、AAA，也不能直接作为法律风险等级。</span></p>

<h2><span><strong>6.3 常见 axe 错误与修复速查表</strong></span></h2>

<p><span>这是员工日常工作时最值得收藏的一份表格。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="6.3 常见 axe 错误与修复速查表"><table><tbody><tr><th scope="row"><p><span>Rule ID</span></p></th><th scope="row"><p><span>问题</span></p></th><th scope="row"><p><span>优先检查的解决方案</span></p></th></tr><tr><td><p><code><span>button-name</span></code></p></td><td><p><span>按钮没有名称</span></p></td><td><p><span>按钮文字、aria-label</span></p></td></tr><tr><td><p><code><span>link-name</span></code></p></td><td><p><span>链接没有名称</span></p></td><td><p><span>链接文字、图片 alt</span></p></td></tr><tr><td><p><code><span>image-alt</span></code></p></td><td><p><span>图片缺少替代文本</span></p></td><td><p><span>根据图片用途设置 alt</span></p></td></tr><tr><td><p><code><span>label</span></code></p></td><td><p><span>表单控件缺少名称</span></p></td><td><p><span>label、for、id</span></p></td></tr><tr><td><p><code><span>color-contrast</span></code></p></td><td><p><span>文字对比度不足</span></p></td><td><p><span>修改文字或背景颜色</span></p></td></tr><tr><td><p><code><span>aria-hidden-focus</span></code></p></td><td><p><span>隐藏区域存在可聚焦元素</span></p></td><td><p><span>hidden、inert、焦点管理</span></p></td></tr><tr><td><p><code><span>aria-valid-attr</span></code></p></td><td><p><span>ARIA 属性不合法</span></p></td><td><p><span>检查属性拼写</span></p></td></tr><tr><td><p><code><span>aria-valid-attr-value</span></code></p></td><td><p><span>ARIA 属性值错误</span></p></td><td><p><span>检查值及 ID 引用</span></p></td></tr><tr><td><p><code><span>aria-allowed-attr</span></code></p></td><td><p><span>当前角色不支持该属性</span></p></td><td><p><span>修改角色或移除错误属性</span></p></td></tr><tr><td><p><code><span>aria-required-attr</span></code></p></td><td><p><span>缺少必需的 ARIA 属性</span></p></td><td><p><span>补充并同步对应状态</span></p></td></tr><tr><td><p><code><span>aria-required-children</span></code></p></td><td><p><span>缺少必要的子角色</span></p></td><td><p><span>修复组件语义结构</span></p></td></tr><tr><td><p><code><span>aria-required-parent</span></code></p></td><td><p><span>缺少必要的父角色</span></p></td><td><p><span>修复组件语义结构</span></p></td></tr><tr><td><p><code><span>nested-interactive</span></code></p></td><td><p><span>交互控件嵌套</span></p></td><td><p><span>调整 HTML 结构</span></p></td></tr><tr><td><p><code><span>aria-dialog-name</span></code></p></td><td><p><span>弹窗缺少名称</span></p></td><td><p><span>aria-labelledby 或 aria-label</span></p></td></tr><tr><td><p><code><span>html-has-lang</span></code></p></td><td><p><span>HTML 缺少语言声明</span></p></td><td><p><span>设置正确的 lang</span></p></td></tr><tr><td><p><code><span>heading-order</span></code></p></td><td><p><span>标题层级不合理</span></p></td><td><p><span>调整 H1～H6</span></p></td></tr><tr><td><p><code><span>landmark-one-main</span></code></p></td><td><p><span>main 地标相关问题</span></p></td><td><p><span>检查页面主要内容结构</span></p></td></tr><tr><td><p><code><span>region</span></code></p></td><td><p><span>内容未合理组织在地标中</span></p></td><td><p><span>检查页面语义区域</span></p></td></tr></tbody></table></div></div></div>

<p><span>其中部分规则属于最佳实践，不一定直接对应 WCAG 违规。应结合报告中的规则详情和实际页面判断。</span></p>

<p><span>完整规则说明：</span><span><a href="https://dequeuniversity.com/rules/axe/?utm_source=chatgpt.com"><span><span>Deque University axe Rules</span></span></a></span></p>

<h2><span><strong>6.4 常用 WCAG 准则速查表</strong></span></h2>

<p><span>不需要背诵，遇到问题时查询即可。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="6.4 常用 WCAG 准则速查表"><table><tbody><tr><th scope="row"><p><span>WCAG 编号</span></p></th><th scope="row"><p><span>名称</span></p></th><th scope="row"><p><span>常见整改场景</span></p></th></tr><tr><td><p><span>1.1.1</span></p></td><td><p><span>Non-text Content</span></p></td><td><p><span>图片 alt、图标替代文本</span></p></td></tr><tr><td><p><span>1.3.1</span></p></td><td><p><span>Info and Relationships</span></p></td><td><p><span>标题、列表、表单关系</span></p></td></tr><tr><td><p><span>1.4.1</span></p></td><td><p><span>Use of Color</span></p></td><td><p><span>不能只用颜色表达信息</span></p></td></tr><tr><td><p><span>1.4.3</span></p></td><td><p><span>Contrast (Minimum)</span></p></td><td><p><span>文字对比度</span></p></td></tr><tr><td><p><span>1.4.4</span></p></td><td><p><span>Resize Text</span></p></td><td><p><span>200% 文字缩放</span></p></td></tr><tr><td><p><span>1.4.10</span></p></td><td><p><span>Reflow</span></p></td><td><p><span>窄视口布局</span></p></td></tr><tr><td><p><span>1.4.11</span></p></td><td><p><span>Non-text Contrast</span></p></td><td><p><span>控件及状态对比度</span></p></td></tr><tr><td><p><span>1.4.12</span></p></td><td><p><span>Text Spacing</span></p></td><td><p><span>文字间距</span></p></td></tr><tr><td><p><span>1.4.13</span></p></td><td><p><span>Content on Hover or Focus</span></p></td><td><p><span>Tooltip、悬浮菜单</span></p></td></tr><tr><td><p><span>2.1.1</span></p></td><td><p><span>Keyboard</span></p></td><td><p><span>键盘操作</span></p></td></tr><tr><td><p><span>2.1.2</span></p></td><td><p><span>No Keyboard Trap</span></p></td><td><p><span>键盘陷阱</span></p></td></tr><tr><td><p><span>2.2.2</span></p></td><td><p><span>Pause, Stop, Hide</span></p></td><td><p><span>自动轮播、滚动公告</span></p></td></tr><tr><td><p><span>2.4.1</span></p></td><td><p><span>Bypass Blocks</span></p></td><td><p><span>Skip Link</span></p></td></tr><tr><td><p><span>2.4.3</span></p></td><td><p><span>Focus Order</span></p></td><td><p><span>焦点顺序</span></p></td></tr><tr><td><p><span>2.4.4</span></p></td><td><p><span>Link Purpose</span></p></td><td><p><span>链接用途</span></p></td></tr><tr><td><p><span>2.4.7</span></p></td><td><p><span>Focus Visible</span></p></td><td><p><span>焦点样式</span></p></td></tr><tr><td><p><span>2.4.11</span></p></td><td><p><span>Focus Not Obscured</span></p></td><td><p><span>Sticky Header 遮挡焦点</span></p></td></tr><tr><td><p><span>2.5.3</span></p></td><td><p><span>Label in Name</span></p></td><td><p><span>可访问名称包含可见标签</span></p></td></tr><tr><td><p><span>2.5.7</span></p></td><td><p><span>Dragging Movements</span></p></td><td><p><span>拖拽替代操作</span></p></td></tr><tr><td><p><span>2.5.8</span></p></td><td><p><span>Target Size</span></p></td><td><p><span>点击区域</span></p></td></tr><tr><td><p><span>3.1.1</span></p></td><td><p><span>Language of Page</span></p></td><td><p><span>页面语言</span></p></td></tr><tr><td><p><span>3.2.2</span></p></td><td><p><span>On Input</span></p></td><td><p><span>控件变化后的意外上下文变化</span></p></td></tr><tr><td><p><span>3.3.1</span></p></td><td><p><span>Error Identification</span></p></td><td><p><span>表单错误说明</span></p></td></tr><tr><td><p><span>3.3.2</span></p></td><td><p><span>Labels or Instructions</span></p></td><td><p><span>表单标签和说明</span></p></td></tr><tr><td><p><span>3.3.4</span></p></td><td><p><span>Error Prevention</span></p></td><td><p><span>交易等重要提交的错误预防</span></p></td></tr><tr><td><p><span>4.1.2</span></p></td><td><p><span>Name, Role, Value</span></p></td><td><p><span>控件名称、角色、状态</span></p></td></tr><tr><td><p><span>4.1.3</span></p></td><td><p><span>Status Messages</span></p></td><td><p><span>动态业务通知</span></p></td></tr></tbody></table></div></div></div>

<p><span>正式标准查询：</span><span><a href="https://www.w3.org/WAI/WCAG22/quickref/?utm_source=chatgpt.com"><span><span>WCAG 2.2 Quick Reference</span></span></a></span></p>

<h2><span><strong>6.5 实际整改案例：aria-hidden-focus</strong></span></h2>

<p><span>假设收到如下问题报告。</span></p>

<div class="training-box"><span><span>A11Y-001</span></span><p><span><span><strong>关闭的 Cart Drawer 中存在可聚焦元素</strong></span></span></p><hr><div class="training-table"><div><div class="training-table-scroll" data-table-label="6.5 实际整改案例：aria-hidden-focus"><table><tbody><tr><th scope="row"><p><span>字段</span></p></th><th scope="row"><p><span>内容</span></p></th></tr><tr><td><p><span>Rule</span></p></td><td><p><span>aria-hidden-focus</span></p></td></tr><tr><td><p><span>Component</span></p></td><td><p><span>Cart Drawer</span></p></td></tr><tr><td><p><span>Element</span></p></td><td><p><code><span>#CartDrawer</span></code></p></td></tr><tr><td><p><span>Impact</span></p></td><td><p><span>可能影响键盘及辅助技术用户</span></p></td></tr><tr><td><p><span>Actual</span></p></td><td><p><span>Drawer 关闭后仍可 Tab 进入</span></p></td></tr><tr><td><p><span>Expected</span></p></td><td><p><span>关闭区域不可被意外访问</span></p></td></tr></tbody></table></div></div></div></div>

<h3><span><strong>第一步：复现</strong></span></h3>

<p><span>打开商品详情页，不打开购物车，连续按 Tab，检查是否能够进入不可见的购物车按钮。</span></p>

<p><span>通过 Console 查看：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">document.activeElement</code></pre>

<h3><span><strong>第二步：定位原因</strong></span></h3>

<p><span>发现 Drawer 使用了以下代码：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div id="CartDrawer" aria-hidden="true"&gt;
  &lt;button&gt;Close cart&lt;/button&gt;
  &lt;button&gt;Remove item&lt;/button&gt;
&lt;/div&gt;</code></pre>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">#CartDrawer {
  transform: translateX(100%);
}</code></pre>

<p><span>transform 只负责视觉移动，aria-hidden 只负责无障碍语义隐藏，都不能单独阻止键盘访问。</span></p>

<h3><span><strong>第三步：修复</strong></span></h3>

<p><span>如果原有组件已经实现打开状态下的模态管理，可以增加关闭状态下的交互隔离。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">&lt;div id="CartDrawer" inert&gt;
  &lt;button&gt;Close cart&lt;/button&gt;
  &lt;button&gt;Remove item&lt;/button&gt;
&lt;/div&gt;</code></pre>

<p><span>打开时移除 inert，关闭时恢复合理的焦点位置并重新设置 inert。</span></p>

<p><span>如果存在旧的 aria-hidden 属性，也应移除或同步管理。</span></p>

<h3><span><strong>第四步：验证</strong></span></h3>

<p><span>分别检测 Drawer 关闭和打开两种状态。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="第四步：验证"><table><tbody><tr><th scope="row"><p><span>测试项目</span></p></th><th scope="row"><p><span>验收结果</span></p></th></tr><tr><td><p><span>Drawer 关闭</span></p></td><td><p><span>内部元素不可通过 Tab 访问</span></p></td></tr><tr><td><p><span>Drawer 打开</span></p></td><td><p><span>内部控件正常访问</span></p></td></tr><tr><td><p><span>打开后焦点</span></p></td><td><p><span>位于合理的弹窗内部位置</span></p></td></tr><tr><td><p><span>Tab 导航</span></p></td><td><p><span>模态背景不会被意外访问</span></p></td></tr><tr><td><p><span>Esc 关闭</span></p></td><td><p><span>正常关闭</span></p></td></tr><tr><td><p><span>关闭后焦点</span></p></td><td><p><span>恢复到合理的触发控件</span></p></td></tr><tr><td><p><span>axe 检测</span></p></td><td><p><span>对应违规已解决</span></p></td></tr><tr><td><p><span>NVDA</span></p></td><td><p><span>能够理解和操作购物车</span></p></td></tr></tbody></table></div></div></div>

<p><span>只有完成相关状态的回归测试，才能认为这项问题已经完成整改。</span></p>

<hr>

<h2><span><strong>6.6 如何使用 NVDA 进行简单测试？</strong></span></h2>

<p><span>对于企业快速培训，不需要员工熟练掌握屏幕阅读器的全部功能，只需要掌握基础导航即可。</span></p>

<h3><span><strong>安装及启动</strong></span></h3>

<p><span>Windows 用户从 </span><span><a href="https://www.nvaccess.org/download/?utm_source=chatgpt.com"><span><span>NVDA 官网</span></span></a></span><span> 下载并安装。</span></p>

<p><span>启动 NVDA 后，推荐打开 Speech Viewer：</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">NVDA + N
→ Tools
→ Speech Viewer</code></pre>

<p><span>Speech Viewer 能够显示屏幕阅读器的语音输出文本，方便开发人员分析和记录。</span> <a class="training-source" href="https://download.nvaccess.org/documentation/userGuide.html#SpeechViewer" aria-label="NVAccess Downloads：NVDA User Guide · Speech Viewer"><img src="content/training-assets/image-59bfe9bc385a.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>NVAccess Downloads</span><span class="training-source-preview" aria-hidden="true"><small>NVAccess Downloads</small><strong>NVDA User Guide · Speech Viewer</strong><small>download.nvaccess.org</small></span></a></p>

<h3><span><strong>常用快捷键</strong></span></h3>

<p><span>NVDA 键通常为 Insert，也可以配置为 Caps Lock。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="常用快捷键"><table><tbody><tr><th scope="row"><p><span>快捷键</span></p></th><th scope="row"><p><span>用途</span></p></th></tr><tr><td><p><span>Tab</span></p></td><td><p><span>下一个可聚焦控件</span></p></td></tr><tr><td><p><span>Shift + Tab</span></p></td><td><p><span>上一个可聚焦控件</span></p></td></tr><tr><td><p><span>H</span></p></td><td><p><span>浏览下一个标题</span></p></td></tr><tr><td><p><span>B</span></p></td><td><p><span>浏览下一个按钮</span></p></td></tr><tr><td><p><span>K</span></p></td><td><p><span>浏览下一个链接</span></p></td></tr><tr><td><p><span>D</span></p></td><td><p><span>浏览下一个 Landmark</span></p></td></tr><tr><td><p><span>NVDA + F7</span></p></td><td><p><span>打开元素列表</span></p></td></tr><tr><td><p><span>NVDA + Space</span></p></td><td><p><span>切换浏览模式和焦点模式</span></p></td></tr><tr><td><p><span>NVDA + Tab</span></p></td><td><p><span>读取当前焦点</span></p></td></tr><tr><td><p><span>NVDA + Q</span></p></td><td><p><span>退出 NVDA</span></p></td></tr></tbody></table></div></div></div>

<p><span>其中单字母导航通常在 Browse Mode 下使用。</span></p>

<h3><span><strong>观察播报内容</strong></span></h3>

<div class="training-box"><div class="training-box"><p> <span><span><strong>NVDA Speech Viewer</strong></span></span></p></div><div class="training-box"><p><span>Cotton T-shirt, heading level 1</span></p><p><span>Color, grouping</span></p><p><span>Black, radio button, checked</span></p><p><span>Size, grouping</span></p><p><span>Medium, radio button, checked</span></p><p><span>Quantity, spin button, 2</span></p><p><span>Add to cart, button</span></p><p><span>Cotton T-shirt added to your cart.</span></p></div><span><span>模拟播报内容。实际措辞取决于浏览器、NVDA 版本及配置。</span></span></div>

<p><span>测试时重点关注：</span></p>

<p><span>是否能够理解控件名称、角色、当前状态，以及执行操作后发生了什么变化。</span></p>

<p><span>不需要要求所有屏幕阅读器逐字播报一致。</span></p>

<h3><span><strong>iPhone VoiceOver</strong></span></h3>

<p><span>通过设置 → 辅助功能 → VoiceOver 开启。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="iPhone VoiceOver"><table><tbody><tr><th scope="row"><p><span>手势</span></p></th><th scope="row"><p><span>用途</span></p></th></tr><tr><td><p><span>单指轻点</span></p></td><td><p><span>选择并朗读元素</span></p></td></tr><tr><td><p><span>单指双击</span></p></td><td><p><span>激活选中元素</span></p></td></tr><tr><td><p><span>单指左右轻扫</span></p></td><td><p><span>移动到上一个或下一个元素</span></p></td></tr><tr><td><p><span>三指轻扫</span></p></td><td><p><span>滚动页面</span></p></td></tr></tbody></table></div></div></div>

<p><span>对于日常 Shopify 项目，可以优先采用 Windows + Chrome + NVDA，以及 iPhone + Safari + VoiceOver 两种组合进行基础验收。</span></p>

<h2><span><strong>6.7 不要只检测页面的初始状态</strong></span></h2>

<div class="training-grid" data-columns="3" data-training-cards><div class="training-box"><div class="training-box"><p><span>初始页面</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Mega Menu</span></p></div></div><div class="training-box"><div class="training-box"><p><span>搜索建议</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Filter Drawer</span></p></div></div><div class="training-box"><div class="training-box"><p><span>Cart Drawer</span></p></div></div><div class="training-box"><div class="training-box"><p><span>表单错误</span></p></div></div></div>

<p><span>同一个页面，打开弹窗、展开菜单、执行商品筛选之后，DOM 和无障碍状态都会发生变化。</span></p>

<p><span>因此需要在不同业务状态下重复运行 axe。</span></p>

<p><span>例如 Cart Drawer 至少应检查关闭、打开、修改数量、出现错误以及空购物车状态。</span></p>

<p><span>这是动态网站检测中最容易遗漏的一点。</span></p>

<h2><span><strong>6.8 如何提交整改结果？</strong></span></h2>

<p><span>推荐团队统一使用以下格式记录整改结果。</span></p>

<div class="training-box"><span><span>ADA Issue Report · 示例</span></span><p><span><span><strong>A11Y-002：Header 搜索按钮缺少 Accessible Name</strong></span></span></p><hr><div class="training-table"><div><div class="training-table-scroll" data-table-label="6.8 如何提交整改结果？"><table><tbody><tr><th scope="row"><p><span>字段</span></p></th><th scope="row"><p><span>内容</span></p></th></tr><tr><td><p><span>页面</span></p></td><td><p><span>所有 Storefront 页面</span></p></td></tr><tr><td><p><span>组件</span></p></td><td><p><span>Header</span></p></td></tr><tr><td><p><span>Rule ID</span></p></td><td><p><span>button-name</span></p></td></tr><tr><td><p><span>WCAG</span></p></td><td><p><span>4.1.2</span></p></td></tr><tr><td><p><span>代码位置</span></p></td><td><p><span>sections/header.liquid</span></p></td></tr><tr><td><p><span>优先级</span></p></td><td><p><span>P1（示例内部评级）</span></p></td></tr><tr><td><p><span>整改状态</span></p></td><td><p><span>已修复，待验收</span></p></td></tr></tbody></table></div></div></div><hr><p><span><span><strong>问题描述</strong></span></span></p><p><span>屏幕阅读器无法识别搜索按钮的具体用途。</span></p><p><span><span><strong>修改内容</strong></span></span></p><p><span>为纯图标按钮提供 Search 名称，并隐藏装饰性 SVG 的无障碍语义。</span></p><p><span><span><strong>验证结果</strong></span></span></p><p><span>axe 对应问题消失；键盘操作正常；NVDA 可正确识别按钮名称及角色。</span></p><p><span><span><strong>测试环境</strong></span></span></p><p><span>记录浏览器、屏幕阅读器版本、设备、Theme 版本和测试日期。</span></p></div>

<p><span>这比单纯回复「ADA 问题已修复」更有价值，也方便其他同事进行验收和后续维护。</span></p>

<h2><span><strong>6.9 最终实操考核</strong></span></h2>

<p><span>建议在测试 Theme 中准备一组真实的无障碍问题，让员工独立完成整改。</span></p>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="6.9 最终实操考核"><table><tbody><tr><th scope="row"><p><span>考核内容</span></p></th><th scope="row"><p><span>分值</span></p></th></tr><tr><td><p><span>修复图片 alt 问题</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>修复图标按钮名称</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>修复表单 Label</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>修复颜色对比度</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>修复键盘及焦点样式</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>修复 Drawer 关闭后的焦点隔离</span></p></td><td><p><span>15</span></p></td></tr><tr><td><p><span>修复 Modal 焦点恢复</span></p></td><td><p><span>15</span></p></td></tr><tr><td><p><span>增加加购动态通知</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>提交检测与整改结果</span></p></td><td><p><span>10</span></p></td></tr><tr><td><p><span>合计</span></p></td><td><p><span>100</span></p></td></tr></tbody></table></div></div></div>

<p><span>建议以 80 分作为内部培训考核的参考通过线，同时要求不能遗留阻断核心购物流程的严重问题。</span></p>

<p><span>考核不要求员工解释复杂的 ARIA 底层原理，重点看能否正确定位、修改和验证代码。</span></p>

<hr>
