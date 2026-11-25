(() => {
  const copyText = async (content, status) => {
    try {
      await navigator.clipboard.writeText(content);
      status.textContent = '已复制';
    } catch {
      status.textContent = '请选中下方文本手动复制。';
      const fallback = document.createElement('textarea');
      fallback.readOnly = true;
      fallback.rows = 7;
      fallback.setAttribute('aria-label', '待复制的文本');
      fallback.value = content;
      status.after(fallback);
      fallback.focus();
      fallback.select();
      fallback.addEventListener('blur', () => fallback.remove(), { once: true });
    }
  };

  function luminance(color) {
    const channels = color.slice(1).match(/../g).map(value => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function colors(demo) {
    return ['fg', 'bg'].map(key => demo.querySelector('[data-contrast="' + key + '"]:checked').value);
  }

  function renderContrast(demo) {
    const [fg, bg] = colors(demo);
    const contrast = (Math.max(luminance(fg), luminance(bg)) + 0.05) /
      (Math.min(luminance(fg), luminance(bg)) + 0.05);
    const sample = demo.querySelector('[data-contrast-sample]');
    sample.style.color = fg;
    sample.style.backgroundColor = bg;
    demo.querySelector('[data-contrast-ratio]').textContent = contrast.toFixed(2) + ' : 1';
    demo.querySelector('[data-contrast-result]').textContent = '普通文字 AA ' + (contrast >= 4.5 ? '通过' : '不通过');
    demo.querySelector('[data-contrast-values]').textContent = '文字：' + fg + '　背景：' + bg;
  }

  function toggleDisclosure(demo, button) {
    const expanded = button.getAttribute('aria-expanded') === 'false';
    button.setAttribute('aria-expanded', String(expanded));
    demo.querySelector('#ada-training-disclosure').hidden = !expanded;
    demo.querySelector('[data-disclosure-expanded]').textContent = String(expanded);
    demo.querySelector('[data-disclosure-hidden]').textContent = String(!expanded);
    demo.querySelector('[data-demo-announcement]').textContent = 'Product details, button, ' + (expanded ? 'expanded' : 'collapsed');
  }

  function selectTab(demo, selected) {
    for (const tab of demo.querySelectorAll('[role="tab"]')) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    demo.querySelector('[data-tab-status]').textContent =
      '当前选中：' + selected.dataset.tabKey + '　aria-selected=true';
  }

  function focusCartItem(demo, item) {
    for (const button of demo.querySelectorAll('[data-item]')) {
      button.closest('li').classList.toggle('training-simulated-focus', button === item);
    }
    demo.querySelector('[data-cart-focus]').textContent = item ? item.dataset.item : '购物车为空';
  }

  function removeCartItem(demo, button) {
    const rows = [...demo.querySelectorAll('[data-cart-items] li:not([hidden])')];
    const row = button.closest('li');
    const index = rows.indexOf(row);
    const next = (rows[index + 1] || rows[index - 1])?.querySelector('button');
    const empty = demo.querySelector('[data-cart-empty]');
    row.hidden = true;
    empty.hidden = Boolean(next);
    focusCartItem(demo, next);
    (next || empty).focus();
    demo.querySelector('[data-cart-status]').textContent = '已移除 ' + button.dataset.item + '。';
  }

  function resetCart(demo) {
    for (const row of demo.querySelectorAll('[data-cart-items] li')) row.hidden = false;
    demo.querySelector('[data-cart-empty]').hidden = true;
    const initial = demo.querySelector('[data-item="Linen shirt"]');
    focusCartItem(demo, initial);
    initial.focus();
    demo.querySelector('[data-cart-status]').textContent = '等待删除操作。';
  }

  function checklistStatus(demo) {
    const total = demo.querySelectorAll('[data-checklist-row]').length;
    const passed = demo.querySelectorAll('[data-checklist-pass]:checked').length;
    const skipped = demo.querySelectorAll('[data-training-action="checklist-na"][aria-pressed="true"]').length;
    demo.querySelector('[data-checklist-status]').textContent =
      passed + ' / ' + total + '　已通过 ' + passed + '　不适用 ' + skipped + '　待处理 ' + (total - passed - skipped);
  }

  function checklistToggle(demo, button) {
    const skipped = button.getAttribute('aria-pressed') === 'false';
    button.setAttribute('aria-pressed', String(skipped));
    const checkbox = button.closest('[data-checklist-row]').querySelector('input');
    if (skipped) checkbox.checked = false;
    checklistStatus(demo);
  }

  function resetChecklist(demo) {
    for (const checkbox of demo.querySelectorAll('[data-checklist-pass]')) checkbox.checked = false;
    for (const button of demo.querySelectorAll('[data-training-action="checklist-na"]')) button.setAttribute('aria-pressed', 'false');
    checklistStatus(demo);
  }

  function checklistMarkdown(demo) {
    const lines = ['# Shopify Accessibility Checklist'];
    for (const group of demo.querySelectorAll('fieldset')) {
      lines.push('', '## ' + group.querySelector('legend').textContent);
      for (const row of group.querySelectorAll('[data-checklist-row]')) {
        const pass = row.querySelector('input').checked;
        const na = row.querySelector('button').getAttribute('aria-pressed') === 'true';
        lines.push('- [' + (pass ? 'x' : ' ') + '] ' + row.querySelector('label span').textContent + (na ? '（不适用）' : ''));
      }
    }
    return lines.join('\n');
  }

  document.addEventListener('click', event => {
    const copy = event.target.closest('[data-training-copy]');
    if (copy) {
      const block = copy.closest('.training-code-bar').nextElementSibling;
      copyText(block.querySelector('code').textContent, copy);
      return;
    }
    const button = event.target.closest('[data-training-action]');
    if (!button) return;
    const demo = button.closest('[data-training]');
    if (!demo) return;
    switch (button.dataset.trainingAction) {
      case 'disclosure': toggleDisclosure(demo, button); break;
      case 'tab': selectTab(demo, button); break;
      case 'cart-remove': removeCartItem(demo, button); break;
      case 'cart-reset': resetCart(demo); break;
      case 'checklist-na': checklistToggle(demo, button); break;
      case 'checklist-reset': resetChecklist(demo); break;
      case 'checklist-copy': copyText(checklistMarkdown(demo), demo.querySelector('[data-training-feedback]')); break;
      case 'contrast-copy': {
        const [fg, bg] = colors(demo);
        copyText('color: ' + fg + ';\nbackground-color: ' + bg + ';', demo.querySelector('[data-training-feedback]'));
        break;
      }
    }
  });

  document.addEventListener('change', event => {
    const control = event.target;
    const demo = control.closest('[data-training]');
    if (!demo) return;
    if (control.matches('[data-contrast]')) renderContrast(demo);
    if (control.matches('[data-checklist-pass]')) {
      if (control.checked) control.closest('[data-checklist-row]').querySelector('button').setAttribute('aria-pressed', 'false');
      checklistStatus(demo);
    }
  });

  document.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-training-action="tab"]');
    if (!tab) return;
    const demo = tab.closest('[data-training]');
    const tabs = [...demo.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(tab);
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(demo, tabs[next]);
    tabs[next].focus();
  });
})();
