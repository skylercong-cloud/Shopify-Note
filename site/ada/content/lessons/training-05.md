<h1><span><strong>第 5 课：Shopify 电商网站无障碍整改实战</strong></span></h1>

<span><span>建议时长：50 分钟</span></span>

<p><span>前四课已经介绍了日常无障碍整改需要的主要技术。本课将这些知识应用到公司实际的 Shopify 电商项目中。</span></p>

<p><span>Shopify 官方也提供了 </span><span><a href="https://shopify.dev/docs/storefronts/themes/best-practices/accessibility?utm_source=chatgpt.com"><span><span>Theme Accessibility Best Practices</span></span></a></span><span>，可以作为日常开发的参考。</span> <a class="training-source" href="https://shopify.dev/docs/storefronts/themes/best-practices/accessibility" aria-label="Shopify：Accessibility best practices for Shopify themes"><img src="content/training-assets/image-e02bfd934cc3.png" alt="" class="training-source-icon" loading="lazy" decoding="async"><span>Shopify</span><span class="training-source-preview" aria-hidden="true"><small>Shopify</small><strong>Accessibility best practices for Shopify themes</strong><small>shopify.dev</small></span></a></p>

<h2><span><strong>5.1 Header 与导航</strong></span></h2>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:start;"><p><span>Skip to content</span></p></div><div class="training-rich-box" style="padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:var(--training-rich-soft);align-items:center;"><p><span>Free shipping on eligible orders</span></p></div><div class="training-rich-box training-rich-row" style="padding-block:calc(4px * 2);padding-inline:calc(4px * 2);gap:8px;align-items:center;"><p class="training-rich-title" style="font-weight:600;"><span><strong>STORE</strong></span></p> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:18;"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.875 4.5C7.35418 4.5 4.5 7.35418 4.5 10.875C4.5 14.3958 7.35418 17.25 10.875 17.25C14.3958 17.25 17.25 14.3958 17.25 10.875C17.25 7.35418 14.3958 4.5 10.875 4.5ZM2.5 10.875C2.5 6.24962 6.24962 2.5 10.875 2.5C15.5004 2.5 19.25 6.24962 19.25 10.875C19.25 12.8273 18.582 14.6236 17.462 16.0478L21.2071 19.7929C21.5976 20.1834 21.5976 20.8166 21.2071 21.2071C20.8166 21.5976 20.1834 21.5976 19.7929 21.2071L16.0478 17.462C14.6236 18.582 12.8273 19.25 10.875 19.25C6.24962 19.25 2.5 15.5004 2.5 10.875Z" fill="currentColor"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:18;"><path d="M12 4C10.3431 4 9 5.34315 9 7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7C15 5.34315 13.6569 4 12 4ZM7 7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7C17 9.76142 14.7614 12 12 12C9.23858 12 7 9.76142 7 7ZM12.0001 15C8.3441 15 5.5 17.7501 5.5 20.9999C5.5 21.5522 5.05228 21.9999 4.5 21.9999C3.94772 21.9999 3.5 21.5522 3.5 20.9999C3.5 16.5178 7.37176 13 12.0001 13C16.6283 13 20.5 16.5179 20.5 20.9999C20.5 21.5522 20.0523 21.9999 19.5 21.9999C18.9477 21.9999 18.5 21.5522 18.5 20.9999C18.5 17.7502 15.656 15 12.0001 15Z" fill="currentColor"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:18;"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9996 2C14.6707 2 15.9996 4.13291 15.9996 6H16.3151C18.2197 6.0001 19.8234 7.42953 20.0328 9.32324L20.9772 17.8574C21.222 20.0708 19.4836 22 17.2584 22H6.74085C4.50633 21.9998 2.76501 20.0551 3.02503 17.834L4.02503 9.2998C4.24557 7.41662 5.84443 6.00024 7.73988 6H7.99964C7.99964 4.13299 9.32883 2.00019 11.9996 2ZM7.73988 8C6.85459 8.00024 6.11338 8.66112 6.01136 9.53223L5.01136 18.0664C4.8912 19.0927 5.69678 19.9998 6.74085 20H17.2584C18.2982 20 19.102 19.0999 18.9889 18.0771L18.0446 9.54297C17.9476 8.66709 17.2047 8.0001 16.3151 8H15.9996V9C15.9996 9.55228 15.5519 10 14.9996 10C14.4475 9.9998 13.9996 9.55216 13.9996 9V8H9.99964V9C9.99964 9.55228 9.55193 10 8.99964 10C8.44753 9.9998 7.99964 9.55216 7.99964 9V8H7.73988ZM11.9996 4C10.6709 4.00018 9.99964 4.98402 9.99964 6H13.9996C13.9996 4.98393 13.3286 4 11.9996 4Z" fill="currentColor"></path></svg></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 4);justify-content:center;"><p><span>Home</span></p><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><p><span>Clothing</span></p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:12;"><path fill-rule="evenodd" d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div><p><span>Accessories</span></p><p><span>Sale</span></p></div><hr class="training-rich-divider"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 5);padding-inline:calc(4px * 5);background-color:rgb(228, 220, 208);gap:calc(4px * 2);"><p class="training-rich-title" style="color:rgb(51, 51, 51);font-weight:600;"><span><strong>Summer collection</strong></span></p><p style="color:rgb(51, 51, 51);"><span>Discover our new arrivals.</span></p><div class="training-rich-box" style="align-items:start;"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(51, 51, 51);"><p style="color:rgb(255, 255, 255);"><span>Shop now</span></p></div></div></div></div></div>

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

<div class="training-rich"><div class="training-rich-box" style="border-radius:8px;padding-block:calc(4px * 5);padding-inline:calc(4px * 5);background-color:rgb(232, 220, 208);gap:calc(4px * 2);"><p style="color:rgb(89, 74, 64);font-weight:500;"><span>SUMMER SALE</span></p><p class="training-rich-title" style="color:rgb(51, 51, 51);font-weight:600;"><span><strong>UP TO 50% OFF</strong></span></p><p style="color:rgb(89, 74, 64);"><span>Selected styles</span></p><div class="training-rich-box" style="align-items:start;"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(51, 51, 51);"><p style="color:rgb(255, 255, 255);"><span>Shop the sale</span></p></div></div></div></div>

<p><span>如果这些信息全部位于图片内部，则需要提供相应的文字替代。</span></p>

<p><span>更推荐使用真实 HTML 文字叠加在图片上，而不是把所有营销信息制作成一张图片。这样也有利于响应式布局、多语言和文字缩放。</span></p>

<h2><span><strong>5.3 Collection 商品列表页</strong></span></h2>

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><p class="training-rich-title" style="font-weight:600;"><span><strong>Clothing</strong></span></p><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><span class="training-rich-caption"><span>24 products</span></span> <div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Sort by: Best selling</span></p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:12;"><path fill-rule="evenodd" d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div></div></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);align-items:start;"><div class="training-rich-box" style="gap:calc(4px * 2);width:92px;"><p><span><span><strong>Filters</strong></span></span></p><hr class="training-rich-divider"><p style="font-weight:500;"><span>Color</span></p><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M8.7587 3H15.2413C16.0463 2.99999 16.7106 2.99998 17.2518 3.04419C17.8139 3.09012 18.3306 3.18868 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C20.8113 5.66937 20.9099 6.18608 20.9558 6.74817C21 7.28936 21 7.95372 21 8.75868V15.2413C21 16.0463 21 16.7106 20.9558 17.2518C20.9099 17.8139 20.8113 18.3306 20.564 18.816C20.1805 19.5686 19.5686 20.1805 18.816 20.564C18.3306 20.8113 17.8139 20.9099 17.2518 20.9558C16.7106 21 16.0463 21 15.2413 21H8.75868C7.95372 21 7.28936 21 6.74817 20.9558C6.18608 20.9099 5.66937 20.8113 5.18404 20.564C4.43139 20.1805 3.81947 19.5686 3.43597 18.816C3.18868 18.3306 3.09012 17.8139 3.04419 17.2518C2.99998 16.7106 2.99999 16.0463 3 15.2413V8.7587C2.99999 7.95373 2.99998 7.28937 3.04419 6.74817C3.09012 6.18608 3.18868 5.66937 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C5.66937 3.18868 6.18608 3.09012 6.74817 3.04419C7.28937 2.99998 7.95373 2.99999 8.7587 3ZM6.91104 5.03755C6.47262 5.07337 6.24842 5.1383 6.09202 5.21799C5.7157 5.40973 5.40973 5.7157 5.21799 6.09202C5.1383 6.24842 5.07337 6.47262 5.03755 6.91104C5.00078 7.36113 5 7.94342 5 8.8V15.2C5 16.0566 5.00078 16.6389 5.03755 17.089C5.07337 17.5274 5.1383 17.7516 5.21799 17.908C5.40973 18.2843 5.7157 18.5903 6.09202 18.782C6.24842 18.8617 6.47262 18.9266 6.91104 18.9624C7.36113 18.9992 7.94342 19 8.8 19H15.2C16.0566 19 16.6389 18.9992 17.089 18.9624C17.5274 18.9266 17.7516 18.8617 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C18.8617 17.7516 18.9266 17.5274 18.9624 17.089C18.9992 16.6389 19 16.0566 19 15.2V8.8C19 7.94342 18.9992 7.36113 18.9624 6.91104C18.9266 6.47262 18.8617 6.24842 18.782 6.09202C18.5903 5.7157 18.2843 5.40973 17.908 5.21799C17.7516 5.1383 17.5274 5.07337 17.089 5.03755C16.6389 5.00078 16.0566 5 15.2 5H8.8C7.94342 5 7.36113 5.00078 6.91104 5.03755ZM16.3255 7.93219C16.7772 8.25003 16.8856 8.87383 16.5678 9.32549L11.8178 16.0755C11.6431 16.3237 11.3652 16.4792 11.0623 16.4981C10.7593 16.517 10.4642 16.3973 10.2601 16.1727L7.76006 13.4227C7.38855 13.014 7.41867 12.3816 7.82733 12.0101C8.23599 11.6386 8.86843 11.6687 9.23994 12.0773L10.9004 13.9039L14.9322 8.17451C15.25 7.72285 15.8738 7.61436 16.3255 7.93219Z" fill="currentColor"></path></svg><p><span>Black</span></p></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M8.7587 3H15.2413C16.0463 2.99999 16.7106 2.99998 17.2518 3.04419C17.8139 3.09012 18.3306 3.18868 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C20.8113 5.66937 20.9099 6.18608 20.9558 6.74817C21 7.28936 21 7.95372 21 8.75868V15.2413C21 16.0463 21 16.7106 20.9558 17.2518C20.9099 17.8139 20.8113 18.3306 20.564 18.816C20.1805 19.5686 19.5686 20.1805 18.816 20.564C18.3306 20.8113 17.8139 20.9099 17.2518 20.9558C16.7106 21 16.0463 21 15.2413 21H8.75868C7.95372 21 7.28936 21 6.74817 20.9558C6.18608 20.9099 5.66937 20.8113 5.18404 20.564C4.43139 20.1805 3.81947 19.5686 3.43597 18.816C3.18868 18.3306 3.09012 17.8139 3.04419 17.2518C2.99998 16.7106 2.99999 16.0463 3 15.2413V8.7587C2.99999 7.95373 2.99998 7.28937 3.04419 6.74817C3.09012 6.18608 3.18868 5.66937 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C5.66937 3.18868 6.18608 3.09012 6.74817 3.04419C7.28937 2.99998 7.95373 2.99999 8.7587 3ZM6.91104 5.03755C6.47262 5.07337 6.24842 5.1383 6.09202 5.21799C5.7157 5.40973 5.40973 5.7157 5.21799 6.09202C5.1383 6.24842 5.07337 6.47262 5.03755 6.91104C5.00078 7.36113 5 7.94342 5 8.8V15.2C5 16.0566 5.00078 16.6389 5.03755 17.089C5.07337 17.5274 5.1383 17.7516 5.21799 17.908C5.40973 18.2843 5.7157 18.5903 6.09202 18.782C6.24842 18.8617 6.47262 18.9266 6.91104 18.9624C7.36113 18.9992 7.94342 19 8.8 19H15.2C16.0566 19 16.6389 18.9992 17.089 18.9624C17.5274 18.9266 17.7516 18.8617 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C18.8617 17.7516 18.9266 17.5274 18.9624 17.089C18.9992 16.6389 19 16.0566 19 15.2V8.8C19 7.94342 18.9992 7.36113 18.9624 6.91104C18.9266 6.47262 18.8617 6.24842 18.782 6.09202C18.5903 5.7157 18.2843 5.40973 17.908 5.21799C17.7516 5.1383 17.5274 5.07337 17.089 5.03755C16.6389 5.00078 16.0566 5 15.2 5H8.8C7.94342 5 7.36113 5.00078 6.91104 5.03755Z" fill="currentColor"></path></svg><p><span>White</span></p></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M8.7587 3H15.2413C16.0463 2.99999 16.7106 2.99998 17.2518 3.04419C17.8139 3.09012 18.3306 3.18868 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C20.8113 5.66937 20.9099 6.18608 20.9558 6.74817C21 7.28936 21 7.95372 21 8.75868V15.2413C21 16.0463 21 16.7106 20.9558 17.2518C20.9099 17.8139 20.8113 18.3306 20.564 18.816C20.1805 19.5686 19.5686 20.1805 18.816 20.564C18.3306 20.8113 17.8139 20.9099 17.2518 20.9558C16.7106 21 16.0463 21 15.2413 21H8.75868C7.95372 21 7.28936 21 6.74817 20.9558C6.18608 20.9099 5.66937 20.8113 5.18404 20.564C4.43139 20.1805 3.81947 19.5686 3.43597 18.816C3.18868 18.3306 3.09012 17.8139 3.04419 17.2518C2.99998 16.7106 2.99999 16.0463 3 15.2413V8.7587C2.99999 7.95373 2.99998 7.28937 3.04419 6.74817C3.09012 6.18608 3.18868 5.66937 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C5.66937 3.18868 6.18608 3.09012 6.74817 3.04419C7.28937 2.99998 7.95373 2.99999 8.7587 3ZM6.91104 5.03755C6.47262 5.07337 6.24842 5.1383 6.09202 5.21799C5.7157 5.40973 5.40973 5.7157 5.21799 6.09202C5.1383 6.24842 5.07337 6.47262 5.03755 6.91104C5.00078 7.36113 5 7.94342 5 8.8V15.2C5 16.0566 5.00078 16.6389 5.03755 17.089C5.07337 17.5274 5.1383 17.7516 5.21799 17.908C5.40973 18.2843 5.7157 18.5903 6.09202 18.782C6.24842 18.8617 6.47262 18.9266 6.91104 18.9624C7.36113 18.9992 7.94342 19 8.8 19H15.2C16.0566 19 16.6389 18.9992 17.089 18.9624C17.5274 18.9266 17.7516 18.8617 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C18.8617 17.7516 18.9266 17.5274 18.9624 17.089C18.9992 16.6389 19 16.0566 19 15.2V8.8C19 7.94342 18.9992 7.36113 18.9624 6.91104C18.9266 6.47262 18.8617 6.24842 18.782 6.09202C18.5903 5.7157 18.2843 5.40973 17.908 5.21799C17.7516 5.1383 17.5274 5.07337 17.089 5.03755C16.6389 5.00078 16.0566 5 15.2 5H8.8C7.94342 5 7.36113 5.00078 6.91104 5.03755Z" fill="currentColor"></path></svg><p><span>Blue</span></p></div><hr class="training-rich-divider"><p style="font-weight:500;"><span>Price</span></p><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);"><span class="training-rich-caption"><span>$0</span></span></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);"><span class="training-rich-caption"><span>$100</span></span></div></div><div class="training-rich-box" style="flex:1 1 0%;"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 2);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="gap:calc(4px * 1);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);"><img src="content/training-assets/image-908157996b87.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 80 / 84;color:var(--ink);width:100%;"></div><p><span>Cotton T-shirt</span></p><span class="training-rich-caption"><span>$29.99</span></span><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);align-items:center;"><p><span>Quick add</span></p></div></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="gap:calc(4px * 1);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);"><img src="content/training-assets/image-f26b1ddc300f.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 80 / 84;color:var(--ink);width:100%;"></div><p><span>Classic shirt</span></p><span class="training-rich-caption"><span>$39.99</span></span><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);align-items:center;"><p><span>Quick add</span></p></div></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="gap:calc(4px * 1);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);"><img src="content/training-assets/image-34ea1288f371.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 80 / 84;color:var(--ink);width:100%;"></div><p><span>Linen top</span></p><span class="training-rich-caption"><span>$49.99</span></span><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);align-items:center;"><p><span>Quick add</span></p></div></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="gap:calc(4px * 1);"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);"><img src="content/training-assets/image-11ba7de7cb27.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 80 / 84;color:var(--ink);width:100%;"></div><p><span>Casual jacket</span></p><span class="training-rich-caption"><span>$89.99</span></span><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);align-items:center;"><p><span>Quick add</span></p></div></div></div></div></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:calc(4px * 4);justify-content:center;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"></path></svg><span style="font-weight:700;"><span><strong>1</strong></span></span><span>2 3</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M8.293 4.293a1 1 0 0 1 1.414 0l7 7a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></p></div></div></div>

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

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 3);"><div class="training-rich-box"><div class="training-rich-box" style="border-radius:8px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:rgb(229, 222, 211);"><img src="content/training-assets/image-b0641a28f470.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 120 / 145;color:var(--ink);width:100%;"></div><div class="training-rich-box training-rich-row" style="gap:calc(4px * 2);justify-content:center;"><div class="training-rich-box" style="border:2px solid rgb(57, 120, 188);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);flex:1 1 0%;"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 40 / 44;color:var(--ink);width:100%;"></div><div class="training-rich-box" style="border:1px solid rgba(136, 136, 136, 0.376);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);flex:1 1 0%;"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 40 / 44;color:var(--ink);width:100%;"></div><div class="training-rich-box" style="border:1px solid rgba(136, 136, 136, 0.376);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);flex:1 1 0%;"><img src="content/training-assets/image-c29dfe70e365.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 40 / 44;color:var(--ink);width:100%;"></div></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="gap:calc(4px * 2);"><p class="training-rich-title" style="font-weight:600;"><span><strong>Cotton T-shirt</strong></span></p><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:rgb(157, 117, 44);--rich-icon-size:14;"><path d="M7.61252 21.925C7.04585 22.1667 6.51668 22.225 6.02502 22.1C5.53335 21.975 5.15418 21.6958 4.88752 21.2625C4.62085 20.8375 4.52085 20.3167 4.58752 19.7L5.08752 14.9625L1.87502 11.4125C1.46668 10.9458 1.24585 10.4583 1.21252 9.95C1.18752 9.44167 1.34168 8.99583 1.67502 8.6125C2.00835 8.22917 2.47918 7.975 3.08752 7.85L7.72502 6.8375L10.125 2.7125C10.4417 2.17083 10.8333 1.80417 11.3 1.6125C11.7667 1.42083 12.2333 1.42083 12.7 1.6125C13.1667 1.80417 13.5583 2.17083 13.875 2.7125L16.275 6.8375L20.9125 7.85C21.5209 7.975 21.9917 8.22917 22.325 8.6125C22.6584 8.99583 22.8083 9.44167 22.775 9.95C22.75 10.4583 22.5333 10.9458 22.125 11.4125L18.9125 14.9625L19.4125 19.7C19.4792 20.3167 19.3792 20.8375 19.1125 21.2625C18.8459 21.6958 18.4667 21.975 17.975 22.1C17.4833 22.225 16.9542 22.1667 16.3875 21.925L12 19.9875L7.61252 21.925ZM17.175 20.1125C17.225 20.1375 17.2709 20.1458 17.3125 20.1375C17.3542 20.1292 17.3834 20.1042 17.4 20.0625C17.425 20.0208 17.4334 19.9667 17.425 19.9L16.95 15.2C16.9167 14.8833 16.9375 14.5958 17.0125 14.3375C17.0958 14.0792 17.2417 13.8375 17.45 13.6125L20.625 10.0875C20.6667 10.0458 20.6875 10.0042 20.6875 9.9625C20.6959 9.9125 20.6833 9.87083 20.65 9.8375C20.625 9.80417 20.5834 9.78333 20.525 9.775L15.8625 8.775C15.5459 8.70833 15.2792 8.6 15.0625 8.45C14.8542 8.29167 14.6708 8.075 14.5125 7.8L12.1625 3.7125C12.1375 3.67083 12.1042 3.64167 12.0625 3.625C12.0208 3.60833 11.9792 3.60833 11.9375 3.625C11.8959 3.64167 11.8625 3.67083 11.8375 3.7125L9.48752 7.8C9.32918 8.075 9.14168 8.29167 8.92502 8.45C8.71668 8.6 8.45418 8.70833 8.13752 8.775L3.47502 9.775C3.41668 9.78333 3.37085 9.80417 3.33752 9.8375C3.31252 9.87083 3.30002 9.9125 3.30002 9.9625C3.30835 10.0042 3.33335 10.0458 3.37502 10.0875L6.55002 13.6125C6.75835 13.8375 6.90002 14.0792 6.97502 14.3375C7.05835 14.5958 7.08335 14.8833 7.05002 15.2L6.57502 19.9C6.56668 19.9667 6.57085 20.0208 6.58752 20.0625C6.61252 20.1042 6.64585 20.1292 6.68752 20.1375C6.72918 20.1458 6.77502 20.1375 6.82502 20.1125L11.175 18.175C11.45 18.0417 11.725 17.975 12 17.975C12.275 17.975 12.55 18.0417 12.825 18.175L17.175 20.1125Z" fill="currentColor"></path></svg><p><span>4.8 / 5 (128)</span></p></div><div class="training-rich-box training-rich-row training-rich-wrap" style="gap:8px;"><p><span><span><strong>$29.99</strong></span></span><span style="color:var(--muted);"><span><del>$49.99</del></span></span></p></div><span class="training-rich-caption"><span>Color: Black</span></span><div class="training-rich-box training-rich-row" style="gap:calc(4px * 2);"><div class="training-rich-box" style="border:2px solid rgb(57, 120, 188);border-radius:9999px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex-shrink:0;height:28px;width:28px;"><div class="training-rich-box" style="border-radius:9999px;background-color:rgb(51, 51, 51);flex-shrink:0;height:100%;width:100%;"></div></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(238, 233, 224);flex-shrink:0;height:28px;width:28px;"></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:9999px;background-color:rgb(132, 153, 170);flex-shrink:0;height:28px;width:28px;"></div></div><span class="training-rich-caption"><span>Size: M</span></span><div class="training-rich-box training-rich-row" style="gap:calc(4px * 1);"><div class="training-rich-box" style="border:1px solid rgba(136, 136, 136, 0.376);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex:1 1 0%;align-items:center;"><p><span>S</span></p></div><div class="training-rich-box" style="border:2px solid rgb(57, 120, 188);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex:1 1 0%;align-items:center;"><p><span>M</span></p></div><div class="training-rich-box" style="border:1px solid rgba(136, 136, 136, 0.376);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex:1 1 0%;align-items:center;"><p><span>L</span></p></div><div class="training-rich-box" style="border:1px solid rgba(136, 136, 136, 0.376);border-radius:6px;padding-block:calc(4px * 1);padding-inline:calc(4px * 1);flex:1 1 0%;align-items:center;"><p><span>XL</span></p></div></div><div class="training-rich-box training-rich-row" style="gap:8px;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="color:var(--training-rich-success);--rich-icon-size:14;"><path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C16.5272 8.25003 16.6356 8.87383 16.3178 9.32549L11.5678 16.0755C11.3931 16.3237 11.1152 16.4792 10.8123 16.4981C10.5093 16.517 10.2142 16.3973 10.0101 16.1727L7.51006 13.4227C7.13855 13.014 7.16867 12.3816 7.57733 12.0101C7.98598 11.6386 8.61843 11.6687 8.98994 12.0773L10.6504 13.9039L14.6822 8.17451C15 7.72284 15.6238 7.61436 16.0755 7.93219Z" fill="currentColor"></path></svg><p><span>In stock</span></p></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:8px;justify-content:space-between;"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M6 12C6 11.4477 6.44772 11 7 11H17C17.5523 11 18 11.4477 18 12C18 12.5523 17.5523 13 17 13H7C6.44772 13 6 12.5523 6 12Z" fill="currentColor"></path></svg><span>1</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" clip-rule="evenodd"></path></svg></p></div></div><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);background-color:rgb(51, 51, 51);align-items:center;"><p style="color:rgb(255, 255, 255);"><span>Add to cart</span></p></div></div></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Product details</span></p> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Shipping &amp; Returns</span></p> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div></div></div>

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

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 3);"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><p class="training-rich-title" style="font-weight:600;"><span><strong>Your cart</strong></span></p> <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:16;"><path fill-rule="evenodd" d="M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"></path></svg></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;align-items:start;"><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);background-color:rgb(229, 222, 211);width:80px;"><img src="content/training-assets/image-00041917f412.svg" alt="" loading="lazy" decoding="async" class="training-rich-image" style="aspect-ratio:auto 80 / 90;color:var(--ink);width:100%;"></div><div class="training-rich-box" style="flex:1 1 0%;gap:calc(4px * 2);"><p><span><span><strong>Cotton T-shirt</strong></span></span></p><span class="training-rich-caption"><span>Black / M</span></span><div class="training-rich-box training-rich-row" style="gap:8px;align-items:center;"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);"><div class="training-rich-box training-rich-row" style="gap:calc(4px * 3);"><p><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path d="M6 12C6 11.4477 6.44772 11 7 11H17C17.5523 11 18 11.4477 18 12C18 12.5523 17.5523 13 17 13H7C6.44772 13 6 12.5523 6 12Z" fill="currentColor"></path></svg><span>2</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" clip-rule="evenodd"></path></svg></p></div></div><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5555 4C10.099 4 9.70052 4.30906 9.58693 4.75114L9.29382 5.8919H14.715L14.4219 4.75114C14.3083 4.30906 13.9098 4 13.4533 4H10.5555ZM16.7799 5.8919L16.3589 4.25342C16.0182 2.92719 14.8226 2 13.4533 2H10.5555C9.18616 2 7.99062 2.92719 7.64985 4.25342L7.22886 5.8919H4C3.44772 5.8919 3 6.33961 3 6.8919C3 7.44418 3.44772 7.8919 4 7.8919H4.10069L5.31544 19.3172C5.47763 20.8427 6.76455 22 8.29863 22H15.7014C17.2354 22 18.5224 20.8427 18.6846 19.3172L19.8993 7.8919H20C20.5523 7.8919 21 7.44418 21 6.8919C21 6.33961 20.5523 5.8919 20 5.8919H16.7799ZM17.888 7.8919H6.11196L7.30423 19.1057C7.3583 19.6142 7.78727 20 8.29863 20H15.7014C16.2127 20 16.6417 19.6142 16.6958 19.1057L17.888 7.8919ZM10 10C10.5523 10 11 10.4477 11 11V16C11 16.5523 10.5523 17 10 17C9.44772 17 9 16.5523 9 16V11C9 10.4477 9.44772 10 10 10ZM14 10C14.5523 10 15 10.4477 15 11V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16V11C13 10.4477 13.4477 10 14 10Z"></path></svg> <p><span><span><strong>$59.98</strong></span></span></p></div></div></div><hr class="training-rich-divider"><div class="training-rich-box training-rich-row" style="gap:8px;"><p><span>Estimated total</span> </p><p class="training-rich-title" style="font-weight:600;"><span><strong>$59.98</strong></span></p></div><span class="training-rich-caption"><span>Shipping and applicable taxes calculated at checkout.</span></span><div class="training-rich-box" style="border-radius:6px;padding-block:calc(4px * 4);padding-inline:calc(4px * 4);background-color:rgb(51, 51, 51);align-items:center;"><p style="color:rgb(255, 255, 255);font-weight:500;"><span>Checkout</span></p></div></div></div>

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

<div class="training-rich"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:12px;padding-block:calc(4px * 3);padding-inline:calc(4px * 3);gap:calc(4px * 2);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">用户勾选 Black 筛选项</div><div class="training-rich-box" style="align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M12.707 18.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 15.586V6a1 1 0 1 1 2 0v9.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5Z" clip-rule="evenodd"></path></svg></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">请求 Shopify Section HTML</div><div class="training-rich-box" style="align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M12.707 18.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 15.586V6a1 1 0 1 1 2 0v9.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5Z" clip-rule="evenodd"></path></svg></div><div class="training-rich-box" style="border:1px solid var(--line);border-radius:6px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);align-items:center;">JavaScript 替换商品和筛选器 DOM</div><div class="training-rich-box" style="align-items:center;"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" class="training-rich-icon" style="--rich-icon-size:14;"><path fill-rule="evenodd" d="M12.707 18.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 15.586V6a1 1 0 1 1 2 0v9.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5Z" clip-rule="evenodd"></path></svg></div><div data-columns="2" class="training-grid training-rich-grid" style="gap:calc(4px * 2);"><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);gap:calc(4px * 1);"><p style="color:var(--training-rich-danger);font-weight:500;"><span>未处理焦点</span></p><span class="training-rich-caption"><span>原 Checkbox 被销毁，用户可能失去操作位置。</span></span></div></div><div class="training-rich-box" style="gap:calc(4px * 0);"><div class="training-rich-box" style="border:1px solid var(--line);border-radius:8px;padding-block:calc(4px * 2);padding-inline:calc(4px * 2);gap:calc(4px * 1);"><p style="color:var(--training-rich-success);font-weight:500;"><span>正确处理焦点</span></p><span class="training-rich-caption"><span>找到对应的新 Checkbox，继续原来的操作。</span></span></div></div></div></div></div>

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
