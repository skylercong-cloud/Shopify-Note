<h1><span><strong>附录一：ADA 日常开发知识速查手册</strong></span></h1>

<p><span>这一部分可以独立作为员工培训后的日常参考资料。</span></p>

<h2><span><strong>A. 原生 HTML 优先</strong></span></h2>

<div class="training-table"><div><div class="training-table-scroll" data-table-label="A. 原生 HTML 优先"><table><tbody><tr><th scope="row"><p><span>需要实现的功能</span></p></th><th scope="row"><p><span>优先使用</span></p></th></tr><tr><td><p><span>页面跳转</span></p></td><td><p><code><span>a[href]</span></code></p></td></tr><tr><td><p><span>点击操作</span></p></td><td><p><code><span>button</span></code></p></td></tr><tr><td><p><span>文字输入</span></p></td><td><p><code><span>input</span></code></p></td></tr><tr><td><p><span>多行输入</span></p></td><td><p><code><span>textarea</span></code></p></td></tr><tr><td><p><span>多选</span></p></td><td><p><span>Checkbox</span></p></td></tr><tr><td><p><span>单选</span></p></td><td><p><span>Radio</span></p></td></tr><tr><td><p><span>下拉选择</span></p></td><td><p><code><span>select</span></code></p></td></tr><tr><td><p><span>折叠组件</span></p></td><td><p><code><span>details</span></code></p></td></tr><tr><td><p><span>弹窗</span></p></td><td><p><code><span>dialog</span></code></p></td></tr><tr><td><p><span>商品列表</span></p></td><td><p><code><span>ul</span></code><span>、</span><code><span>li</span></code></p></td></tr><tr><td><p><span>页面导航</span></p></td><td><p><code><span>nav</span></code></p></td></tr></tbody></table></div></div></div>

<h2><span><strong>B. 常用数值标准</strong></span></h2>

<div class="training-grid" data-columns="2" data-training-cards><div class="training-box"><div class="training-box"><span><span>普通文字对比度</span></span><p class="training-example-heading"><strong><span><strong>4.5 : 1</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>大字号文字对比度</span></span><p class="training-example-heading"><strong><span><strong>3 : 1</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>适用的非文本对比度</span></span><p class="training-example-heading"><strong><span><strong>3 : 1</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>WCAG AA 目标尺寸</span></span><p class="training-example-heading"><strong><span><strong>24 × 24</strong></span></strong></p><span><span>CSS px，存在适用例外</span></span></div></div><div class="training-box"><div class="training-box"><span><span>文字缩放</span></span><p class="training-example-heading"><strong><span><strong>200%</strong></span></strong></p></div></div><div class="training-box"><div class="training-box"><span><span>纵向内容重排宽度</span></span><p class="training-example-heading"><strong><span><strong>320 px</strong></span></strong></p><span><span>等效 CSS 视口宽度</span></span></div></div></div>

<p><span>以上数值应结合对应 WCAG 准则的适用条件及例外使用。</span></p>

<h2><span><strong>C. 常用 CSS 基础代码</strong></span></h2>

<p><span>建议沉淀到公司的公共样式文件中。</span></p>

<div class="training-code-bar"><span>plain text</span><button type="button" data-training-copy>复制代码</button></div>

<pre class="training-snippet"><code class="language-plain-text">/* 仅视觉隐藏，保留无障碍语义 */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* 确保普通 hidden 内容不被组件样式覆盖 */
[hidden]:not([hidden="until-found"]) {
  display: none !important;
}

/* 键盘焦点样式 */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 3px;
}

/* 推荐的图标按钮操作尺寸 */
.icon-button {
  min-width: 44px;
  min-height: 44px;
}

/* 减少非必要动画 */
@media (prefers-reduced-motion: reduce) {
  .animated-component {
    animation: none;
    transition: none;
  }
}

/* 高对比度模式 */
@media (forced-colors: active) {
  :focus-visible {
    outline-color: Highlight;
  }
}</code></pre>

<p><span>公共 CSS 应结合实际 Theme 验证，特别是隐藏状态是否影响动画，以及减少运动是否影响依赖 transitionend 的 JavaScript 逻辑。</span></p>

<hr>
