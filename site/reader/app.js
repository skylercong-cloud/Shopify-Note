(() => {
  const currentArea = document.documentElement.dataset.course;
  const areas = {
    shopify: {
      label: 'Shopify 笔记',
      title: 'Shopify 网站开发系统教程',
      description: '从认识平台开始，逐步掌握 Theme、前端交互、数据模型、App 与 Headless。',
    },
    seo: {
      label: 'SEO 学习',
      title: 'SEO 学习',
      description: '学习网站性能优化、Dawn 源码与结构化数据。',
    },
  };
  const area = areas[currentArea];
  const courseUrl = (name, lesson, hash = '') => {
    const path = name === currentArea ? location.pathname : '../' + name + '/';
    return path + (lesson ? '?lesson=' + encodeURIComponent(lesson) : '') + hash;
  };

  document.body.insertAdjacentHTML('afterbegin', `
    <header class="topbar">
      <a class="brand" href="../">开发知识笔记</a>
      <div class="top-actions">
        <button id="menu-toggle" type="button" aria-expanded="false" aria-controls="course-sidebar">目录</button>
        <button id="search-toggle" type="button" aria-label="搜索全部课程" aria-haspopup="dialog">⌕ 搜索</button>
        <button id="theme-toggle" type="button" aria-label="深色模式" aria-pressed="false">◐</button>
      </div>
    </header>
    <div class="layout">
      <aside id="course-sidebar" class="sidebar" aria-label="课程导航">
        <div class="sidebar-inner">
          <nav id="toc" aria-label="全部课程"></nav>
        </div>
      </aside>
      <main class="reading" id="reading">
        <article id="article" class="article" tabindex="-1"><p class="loading">正在加载课程…</p></article>
        <footer id="lesson-footer" hidden></footer>
      </main>
      <aside id="page-toc" aria-label="本课目录"></aside>
    </div>
    <button class="backtop" id="backtop" aria-label="返回顶部">↑</button>
    <dialog class="search-dialog" id="search-dialog" aria-labelledby="search-title">
      <div class="search-head">
        <label id="search-title" for="search">搜索全部课程</label>
        <form method="dialog"><button type="submit">关闭</button></form>
      </div>
      <input id="search" type="search" placeholder="输入标题或正文关键词" autocomplete="off">
      <div id="search-results" role="region" aria-label="搜索结果" aria-live="polite"></div>
    </dialog>
  `);

  const query = selector => document.querySelector(selector);
  const article = query('#article');
  const toc = query('#toc');
  const pageToc = query('#page-toc');
  const sidebar = query('#course-sidebar');
  const menu = query('#menu-toggle');
  const search = query('#search');
  const searchDialog = query('#search-dialog');
  const results = query('#search-results');
  const footer = query('#lesson-footer');
  const catalogs = new Map();
  const contentCache = new Map();
  let course, current, observer, diagramLibrary, renderVersion = 0, searchVersion = 0, searchTimer;
  let completed = new Set();

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  try {
    const saved = JSON.parse(readStorage('shopify-completed') || '[]');
    if (Array.isArray(saved)) completed = new Set(saved);
  } catch {}

  const slug = text => text.toLowerCase().trim().replace(/<[^>]*>/g, '').replace(/[^\u4e00-\u9fff\w\s-]/g, '').replace(/\s+/g, '-') || 'section';
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function link(text, id, className, name = currentArea) {
    const el = node('a', text, className);
    el.href = courseUrl(name, id);
    return el;
  }

  function fetchAsset(url, type) {
    return fetch(url).then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response[type]();
    });
  }

  function catalog(name) {
    if (!catalogs.has(name)) {
      catalogs.set(name, fetchAsset('../' + name + '/content/course.json', 'json').catch(error => {
        catalogs.delete(name);
        throw error;
      }));
    }
    return catalogs.get(name);
  }

  function content(name, lesson) {
    const url = '../' + name + '/' + lesson.file;
    if (!contentCache.has(url)) {
      contentCache.set(url, fetchAsset(url, 'text').catch(error => {
        contentCache.delete(url);
        throw error;
      }));
    }
    return contentCache.get(url);
  }

  const lessonTitle = lesson => [lesson.label, lesson.title].filter(Boolean).join(' ');
  const groupTitle = (group, name = currentArea) => name === 'shopify' && group.id !== 'reference'
    ? 'Level ' + group.id + ' · ' + group.title
    : group.title;

  function updateCompletion() {
    for (const entry of toc.querySelectorAll('[data-area="shopify"] a[data-lesson]')) {
      const done = completed.has(entry.dataset.lesson);
      entry.classList.toggle('completed', done);
      entry.setAttribute('aria-label', entry.textContent + (done ? '，已学完' : ''));
    }
  }

  function buildNav() {
    for (const [name, info] of Object.entries(areas)) {
      const section = node('section', undefined, 'course-section');
      section.dataset.area = name;
      const overview = link(info.label, 'overview', 'overview-link', name);
      overview.dataset.lesson = 'overview';
      const title = node('h2');
      title.append(overview);
      section.append(title);
      toc.append(section);
      catalog(name).then(data => {
        for (const group of data.groups) {
          const details = node('details');
          details.append(node('summary', groupTitle(group, name)));
          for (const lesson of data.lessons.filter(item => item.level === group.id)) {
            const entry = link(lessonTitle(lesson), lesson.id, undefined, name);
            entry.dataset.lesson = lesson.id;
            details.append(entry);
          }
          section.append(details);
        }
        updateCompletion();
        updateActiveNav();
      }).catch(() => {
        section.append(node('p', '暂时无法加载目录', 'muted'));
      });
    }
  }

  function updateActiveNav() {
    const section = toc.querySelector('[data-area="' + currentArea + '"]');
    section.querySelector('.overview-link').classList.toggle('current-area', Boolean(current));
    for (const entry of section.querySelectorAll('a[data-lesson]')) {
      const active = entry.dataset.lesson === (current?.id || 'overview');
      entry.classList.toggle('active', active);
      if (active) {
        entry.setAttribute('aria-current', 'page');
        const group = entry.closest('details');
        if (group) group.open = true;
      } else entry.removeAttribute('aria-current');
    }
  }

  function localToc() {
    const headings = [...article.querySelectorAll('h1,h2,h3')].filter(heading => !heading.closest('[data-d-component]'));
    const seen = new Map();
    const byId = new Map();
    pageToc.append(node('h2', '本课目录'));
    for (const heading of headings) {
      const base = slug(heading.textContent);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      heading.id = count ? base + '-' + (count + 1) : base;
      if (heading.tagName === 'H1') continue;
      const entry = node('a', heading.textContent, 'level-' + heading.tagName.slice(1));
      entry.href = courseUrl(currentArea, current.id, '#' + encodeURIComponent(heading.id));
      pageToc.append(entry);
      byId.set(heading.id, entry);
    }
    if (!byId.size) pageToc.replaceChildren();
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !byId.has(entry.target.id)) continue;
        pageToc.querySelector('.active')?.classList.remove('active');
        byId.get(entry.target.id).classList.add('active');
      }
    }, { rootMargin: '-80px 0px -65%' });
    for (const heading of headings) observer.observe(heading);
  }

  function showOverview() {
    article.replaceChildren(node('h1', area.title), node('p', area.description, 'lead'));
    if (currentArea === 'shopify') {
      const note = node('div', undefined, 'course-note');
      note.append(node('strong', '如何使用'), node('p', '每课先读目标，再理解原理和示例，最后完成练习。点击“标记已学完”记录进度，记录仅保存在当前浏览器。高级章节中的概念示例不等于已经运行验证的完整工程。'));
      const main = course.lessons.filter(lesson => lesson.kind !== 'reference');
      const count = main.filter(lesson => completed.has(lesson.id)).length;
      const progress = node('progress');
      progress.max = main.length;
      progress.value = count;
      progress.setAttribute('aria-label', '已学完课程');
      const progressRow = node('p', undefined, 'overview-progress');
      progressRow.append(node('span', '已学完课程 ' + count + '/' + main.length), progress);
      note.append(progressRow);
      article.append(note);
    }
    for (const group of course.groups) {
      const section = node('section', undefined, 'level-card');
      section.append(node('h2', groupTitle(group)), node('p', group.description));
      const list = node('ul');
      for (const lesson of course.lessons.filter(item => item.level === group.id)) {
        const li = node('li');
        li.append(link(lessonTitle(lesson), lesson.id));
        list.append(li);
      }
      section.append(list);
      article.append(section);
    }
    if (course.version) article.append(node('p', '课程整理版本：' + course.version, 'muted'));
  }

  function loadMermaid() {
    if (!diagramLibrary) {
      diagramLibrary = new Promise((resolve, reject) => {
        const script = node('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
        script.onload = () => resolve(window.mermaid);
        script.onerror = reject;
        document.head.append(script);
      }).catch(error => {
        diagramLibrary = undefined;
        throw error;
      });
    }
    return diagramLibrary;
  }

  async function renderDiagrams(version) {
    let index = 0;
    for (const code of article.querySelectorAll('pre code.language-mermaid')) {
      try {
        const mermaid = await loadMermaid();
        if (version !== renderVersion) return;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: document.body.classList.contains('dark') ? 'dark' : 'neutral' });
        const { svg } = await mermaid.render('diagram-' + version + '-' + index++, code.textContent);
        if (version !== renderVersion) return;
        const box = node('div', undefined, 'mermaid');
        box.innerHTML = svg;
        code.parentElement.replaceWith(box);
      } catch {
        if (version !== renderVersion) return;
        code.parentElement.prepend(node('p', '图示未能渲染，以下保留流程源码。', 'muted'));
      }
    }
  }

  function decodedHash() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  }

  function scrollToHeading() {
    document.getElementById(decodedHash())?.scrollIntoView();
  }

  async function showRoute() {
    const version = ++renderVersion;
    let id = new URL(location.href).searchParams.get('lesson');
    if (!id && location.hash) {
      const hash = decodedHash();
      id = course.lessons.find(lesson => [].concat(lesson.legacy || []).includes(hash))?.id;
      if (id) history.replaceState(null, '', courseUrl(currentArea, id));
    }
    current = course.lessons.find(lesson => lesson.id === id);
    observer?.disconnect();
    pageToc.replaceChildren();
    footer.hidden = true;
    updateActiveNav();
    closeMenu();
    if (!current) {
      showOverview();
      if (id && id !== 'overview') article.prepend(node('p', '该课程链接不存在。', 'course-note'));
      document.title = area.title + ' · 开发知识笔记';
    } else {
      const lesson = current;
      article.replaceChildren(node('p', '正在加载课程…', 'loading'));
      try {
        const text = await content(currentArea, lesson);
        if (version !== renderVersion) return;
        if (currentArea === 'seo') {
          article.innerHTML = CourseRenderer.render(text);
        } else {
          article.innerHTML = marked.parse(text);
        }
        document.title = lesson.title + ' · ' + area.label;
        localToc();
        setupFooter(lesson);
        if (location.hash) scrollToHeading();
        else scrollTo({ top: 0, behavior: 'instant' });
        await renderDiagrams(version);
      } catch (error) {
        if (version !== renderVersion) return;
        article.replaceChildren(node('h1', '课程加载失败'), node('p', error.message), link('返回学习路线', 'overview'));
      }
    }
    if (version !== renderVersion) return;
    article.focus({ preventScroll: true });
    if (location.hash) scrollToHeading();
    else scrollTo({ top: 0, behavior: 'instant' });
  }

  function setupFooter(lesson) {
    footer.replaceChildren();
    footer.hidden = false;
    if (currentArea === 'shopify' && lesson.kind !== 'reference') {
      const done = node('button', completed.has(lesson.id) ? '已学完 · 取消标记' : '标记已学完', 'complete-button');
      done.type = 'button';
      done.setAttribute('aria-pressed', String(completed.has(lesson.id)));
      done.addEventListener('click', () => {
        if (completed.has(lesson.id)) completed.delete(lesson.id);
        else completed.add(lesson.id);
        writeStorage('shopify-completed', JSON.stringify([...completed]));
        updateCompletion();
        setupFooter(lesson);
        footer.querySelector('button').focus();
      });
      footer.append(done);
    }
    const sequence = course.lessons.filter(item => currentArea === 'shopify'
      ? (item.kind === 'reference') === (lesson.kind === 'reference')
      : item.level === lesson.level);
    const index = sequence.findIndex(item => item.id === lesson.id);
    const nav = node('nav', undefined, 'lesson-pager');
    nav.setAttribute('aria-label', '前后课导航');
    if (index > 0) nav.append(link('← ' + sequence[index - 1].title, sequence[index - 1].id));
    if (index < sequence.length - 1) nav.append(link(sequence[index + 1].title + ' →', sequence[index + 1].id));
    footer.append(nav);
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
  }

  menu.addEventListener('click', () => {
    menu.setAttribute('aria-expanded', String(sidebar.classList.toggle('is-open')));
  });

  function openSearch() {
    closeMenu();
    if (!searchDialog.open) searchDialog.showModal();
    search.focus();
    search.select();
  }

  query('#search-toggle').addEventListener('click', openSearch);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape' && searchDialog.open) {
      event.preventDefault();
      searchDialog.close();
    } else if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      closeMenu();
      menu.focus();
    }
  });

  search.addEventListener('input', () => {
    const version = ++searchVersion;
    clearTimeout(searchTimer);
    const term = search.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (term) searchTimer = setTimeout(() => runSearch(term, version), 160);
  });

  async function runSearch(term, version) {
    results.replaceChildren(node('p', '正在搜索全文…', 'muted'));
    const entries = await Promise.allSettled(Object.keys(areas).map(async name => {
      const { lessons } = await catalog(name);
      return Promise.all(lessons.map(async lesson => {
        try {
          const text = (await content(name, lesson))
            .split(/\r?\n## 参考资料\r?\n/)[0]
            .replace(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>\n]*>/g, ' ')
            .replace(/[\x60*#>]+/g, '')
            .replace(/\s+/g, ' ');
          return { name, lesson, text };
        } catch {
          return { name, lesson, text: null };
        }
      }));
    }));
    if (version !== searchVersion) return;
    const documents = entries.flatMap(entry => entry.status === 'fulfilled' ? entry.value : []);
    const hits = documents.flatMap(doc => {
      const titleHit = doc.lesson.title.toLocaleLowerCase().includes(term);
      const position = doc.text?.toLocaleLowerCase().indexOf(term) ?? -1;
      return titleHit || position >= 0 ? [{ ...doc, titleHit, position }] : [];
    });
    hits.sort((a, b) => Number(b.titleHit) - Number(a.titleHit));
    const incomplete = entries.some(entry => entry.status === 'rejected') || documents.some(doc => doc.text === null);
    results.replaceChildren(node('p', hits.length + ' 个结果' + (incomplete ? '，部分课程暂时无法检索' : ''), 'muted'));
    for (const { name, lesson, text, position } of hits) {
      const card = node('div', undefined, 'search-result');
      const entry = link(lessonTitle(lesson), lesson.id, undefined, name);
      if (name === currentArea) entry.addEventListener('click', event => {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) searchDialog.close();
      });
      card.append(node('small', areas[name].label), entry);
      if (position >= 0) {
        const snippet = node('p');
        const start = Math.max(0, position - 30);
        const end = Math.min(text.length, position + term.length + 80);
        snippet.append((start ? '…' : '') + text.slice(start, position),
          node('mark', text.slice(position, position + term.length)),
          text.slice(position + term.length, end) + (end < text.length ? '…' : ''));
        card.append(snippet);
      }
      results.append(card);
    }
  }

  document.addEventListener('click', event => {
    const entry = event.target.closest('a[href]');
    if (!entry || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const url = new URL(entry.href);
    if (!course || url.origin !== location.origin || url.pathname !== location.pathname || !url.searchParams.has('lesson')) return;
    event.preventDefault();
    const sameLesson = url.search === location.search;
    history.pushState(null, '', url);
    if (sameLesson && url.hash) {
      scrollToHeading();
      closeMenu();
    } else showRoute();
  });

  article.addEventListener('click', async event => {
    const button = event.target.closest('.dil-copy');
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.closest('.dil-code').querySelector('code').textContent);
      button.textContent = '已复制';
    } catch {
      button.textContent = '复制失败';
    }
    setTimeout(() => { button.textContent = '复制'; }, 1600);
  });

  addEventListener('popstate', () => { if (course) showRoute(); });
  const themeToggle = query('#theme-toggle');
  function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    themeToggle.setAttribute('aria-pressed', String(dark));
  }
  setTheme((readStorage('theme') ?? readStorage('pc-theme')) === 'dark');
  themeToggle.addEventListener('click', () => {
    const dark = !document.body.classList.contains('dark');
    setTheme(dark);
    writeStorage('theme', dark ? 'dark' : 'light');
  });
  const backtop = query('#backtop');
  backtop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  addEventListener('scroll', () => backtop.classList.toggle('show', scrollY > 500), { passive: true });

  buildNav();
  catalog(currentArea).then(data => {
    course = data;
    return showRoute();
  }).catch(error => {
    article.replaceChildren(node('h1', '课程目录加载失败'), node('p', error.message));
  });
})();
