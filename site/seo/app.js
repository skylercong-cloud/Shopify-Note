/* Course archive UI: lazy rendering, lesson focus, offline search,
   citation sources, image fill channel and responsive drawer. */
(function () {
  'use strict';
  var D = window.COURSE_DATA;
  var R = window.CourseRenderer;
  var CACHED = window.CACHED_IMAGES || [];
  if (!D || !R) return;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var thread = $('thread'), threadWrap = $('threadWrap'), sidebar = $('sidebar'), scrim = $('scrim');
  var allIndices = D.turns.map(function (t, i) { return i; });
  var slotMap = R.buildSlotMap(D.turns.map(function (t) { return t.a; }));
  var turnEls = {}, rendered = {}, mode = 'all', activeLesson = null;
  var AVATAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 014 4v1a4 4 0 01-8 0V7a4 4 0 014-4zM5 20a7 7 0 0114 0M4 9l2-1m12 1 2-1"/></svg>';

  // Precompute a searchable plain-text index once (83 万字符).
  var plain = D.turns.map(function (t) { return t.q + '\n' + R.plainText(t.a); });
  var plainLower = plain.map(function (s) { return s.toLowerCase(); });

  /* ---------- header / sidebar ---------- */
  $('brandMeta').textContent = D.meta.turnCount + ' 轮对话 · ' + D.lessons.length + ' 课 · ' +
    Math.round(D.meta.charCount / 10000) + ' 万字符 · ' + D.meta.model + ' · ' + D.meta.startedAt;

  function lessonLabel(i) {
    var hit = D.lessons.filter(function (l) { return l.turn === i; })[0];
    return hit ? hit.series + ' ' + hit.title : '';
  }
  function buildLessons() {
    var groups = {}, order = [];
    D.lessons.forEach(function (l) {
      if (!groups[l.series]) { groups[l.series] = []; order.push(l.series); }
      groups[l.series].push(l);
    });
    $('lessonList').innerHTML = order.map(function (s) {
      return '<div class="lesson-group"><div class="lesson-group-head">' + esc(s) + '</div>' +
        groups[s].map(function (l) {
          return '<button class="lesson-item" data-turn="' + l.turn + '" data-series="' + esc(l.series) +
            '" data-no="' + l.no + '"><span class="li-no">第 ' + l.no + ' 课</span>' +
            '<span class="li-sub">' + esc(l.sub) + '</span></button>';
        }).join('') + '</div>';
    }).join('');
    $('lessonList').addEventListener('click', function (e) {
      var b = e.target.closest('.lesson-item');
      if (!b) return;
      var turn = +b.dataset.turn;
      var lesson = D.lessons.filter(function (l) {
        return l.turn === turn && l.series === b.dataset.series && l.no === +b.dataset.no;
      })[0];
      if (lesson) focusLesson(lesson);
    });
  }
  function markActive() {
    var items = document.querySelectorAll('.lesson-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    if (!activeLesson) return;
    var target = document.querySelector('.lesson-item[data-turn="' + activeLesson.turn +
      '"][data-series="' + activeLesson.series + '"][data-no="' + activeLesson.no + '"]');
    if (target) target.classList.add('active');
  }

  $('cachedList').innerHTML = CACHED.length ? CACHED.map(function (c) {
    return '<div class="cached-item"><img src="' + esc(c.file) + '" alt=""><span>' +
      esc((c.alt || '缓存图片').slice(0, 68)) + '</span></div>';
  }).join('') : '<div class="side-note">没有缓存到原图</div>';

  /* ---------- thread ---------- */
  function thinkingHtml(t) {
    if (!t.recap && !t.thoughts.length) return '';
    var head = esc(t.recap || '思考过程');
    return '<details class="thinking"><summary>' + head + '</summary>' +
      (t.thoughts.length ? '<ul>' + t.thoughts.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' :
        '<ul><li>导出只包含思考摘要，正文未保存</li></ul>') + '</details>';
  }
  function skeleton(i) {
    var t = D.turns[i], lab = lessonLabel(i);
    return (lab ? '<div class="turn-anchor">' + esc(lab) + '</div>' : '') +
      '<div class="msg-user"><div class="bubble">' + esc(t.q) + '</div></div>' +
      '<div class="msg-ai"><div class="avatar">' + AVATAR + '</div><div class="ai-body">' +
      '<div class="msg-meta"><span>' + esc(t.aTime || t.qTime) + '</span><span>' + esc(t.model || '') + '</span></div>' +
      thinkingHtml(t) + '<div class="ai-content is-placeholder">正在渲染课程内容…</div></div></div>';
  }
  function fallbackHtml(text) {
    return '<p>这一段组件渲染失败，已降级为原文：</p><pre style="white-space:pre-wrap;font-size:12px;color:var(--pc-muted)">' +
      esc(String(text).slice(0, 20000)) + '</pre>';
  }
  function renderTurn(i) {
    if (rendered[i]) return;
    var el = turnEls[i];
    if (!el) return;
    var box = el.querySelector('.ai-content');
    if (!box) return;
    var t = D.turns[i];
    try {
      box.innerHTML = R.render(t.a, { slotMap: slotMap, turnIndex: i });
      box.classList.remove('is-placeholder');
    } catch (err) {
      box.innerHTML = fallbackHtml(t.a);
      box.classList.remove('is-placeholder');
      console.warn('render failed at turn', i, err);
    }
    rendered[i] = true;
    bindTurn(el, i);
    fillImages(el);
  }
  function bindTurn(el, i) {
    el.addEventListener('click', function (e) {
      var cite = e.target.closest('.cite-mark');
      if (cite) { openSources(i); return; }
      var copy = e.target.closest('.dil-copy');
      if (copy) {
        var code = copy.closest('.dil-code').querySelector('code');
        if (code) copyText(code.textContent, copy);
      }
    });
  }
  function copyText(text, btn) {
    function done() { var old = btn.textContent; btn.textContent = '已复制'; setTimeout(function () { btn.textContent = old; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacy(); });
    } else legacy();
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          renderTurn(+e.target.dataset.index);
          io.unobserve(e.target);
        }
      });
    }, { root: threadWrap, rootMargin: '700px 0px' });
  }
  function buildThread(indices) {
    if (io) io.disconnect();
    thread.innerHTML = '';
    turnEls = {}; rendered = {};
    var frag = document.createDocumentFragment();
    indices.forEach(function (i) {
      var el = document.createElement('section');
      el.className = 'turn'; el.id = 'turn-' + i; el.dataset.index = i;
      el.innerHTML = skeleton(i);
      frag.appendChild(el);
      turnEls[i] = el;
    });
    thread.appendChild(frag);
    Object.keys(turnEls).forEach(function (k) { if (io) io.observe(turnEls[k]); });
    indices.slice(0, 2).forEach(renderTurn);
    $('threadFoot').textContent = indices.length === allIndices.length
      ? '已到底 · 共 ' + D.meta.turnCount + ' 轮 · 图片可放入 assets/fill/ 回填'
      : '单课阅读 · 点击右上角「显示全部」返回完整对话';
  }

  /* ---------- focus mode ---------- */
  function focusLesson(l) {
    mode = 'lesson'; activeLesson = l;
    var next = D.lessons.filter(function (x) { return x.turn > l.turn; })[0];
    var end = next ? next.turn : D.turns.length;
    var idx = [];
    for (var i = l.turn; i < end; i++) idx.push(i);
    buildThread(idx);
    $('allBtn').hidden = false;
    $('brandMeta').textContent = l.series + ' · ' + l.title + (l.sub ? ' · ' + l.sub : '');
    markActive(); closeSidebar();
    threadWrap.scrollTop = 0;
  }
  function showAll() {
    mode = 'all'; activeLesson = null;
    buildThread(allIndices);
    $('allBtn').hidden = true;
    $('brandMeta').textContent = D.meta.turnCount + ' 轮对话 · ' + D.lessons.length + ' 课 · ' +
      Math.round(D.meta.charCount / 10000) + ' 万字符 · ' + D.meta.model + ' · ' + D.meta.startedAt;
    markActive(); threadWrap.scrollTop = 0;
  }
  $('allBtn').addEventListener('click', showAll);

  /* ---------- image fill channel ----------
     CACHE_HINTS: the 3 real JPEGs the browser had downloaded into the
     "Save page as" _files folder. `occurrence` picks the Nth slot sharing
     the same id (the same query appears twice in turn 7). */
  var CACHE_HINTS = [
    { file: 'assets/cached/cached-01.jpg', match: 'chrome devtools network timing' },
    /* DOM order in the saved page: Leather Jacket is image #2, sneakers #3. */
    { file: 'assets/cached/cached-03.jpg', match: 'brown leather sneaker', occurrence: 0 },
    { file: 'assets/cached/cached-02.jpg', match: 'brown leather sneaker', occurrence: 1 }
  ];
  function fillImages(el) {
    var slots = el.querySelectorAll('.img-slot[data-slot]');
    var seen = {};
    for (var i = 0; i < slots.length; i++) {
      var id = slots[i].dataset.slot;
      var occ = seen[id] || 0;
      seen[id] = occ + 1;
      attempt(slots[i], occ);
    }
  }
  function attempt(slot, occ) {
    var id = slot.dataset.slot;
    var q = (slot.querySelector('.img-slot-query') || {}).textContent || '';
    var list = ['assets/fill/' + id + '.jpg', 'assets/fill/' + id + '.png', 'assets/fill/' + id + '.webp'];
    /* An optional second image for the Nth repeated slot: img-02-2.jpg etc. */
    if (occ > 0) {
      list.unshift('assets/fill/' + id + '-' + (occ + 1) + '.png');
      list.unshift('assets/fill/' + id + '-' + (occ + 1) + '.webp');
      list.unshift('assets/fill/' + id + '-' + (occ + 1) + '.jpg');
    }
    var extra = [];
    CACHE_HINTS.forEach(function (h) {
      if (q.toLowerCase().indexOf(h.match) < 0) return;
      if (h.occurrence === undefined || h.occurrence === occ) extra.unshift(h.file);
    });
    tryNext(slot, extra.concat(list), 0);
  }
  function tryNext(slot, list, k) {
    if (k >= list.length) return;
    var probe = new Image();
    probe.onload = function () {
      if (!slot.isConnected || slot.classList.contains('has-image')) return;
      var img = document.createElement('img');
      img.src = list[k]; img.className = 'filled'; img.alt = '补回的图片';
      slot.appendChild(img); slot.classList.add('has-image');
    };
    probe.onerror = function () { tryNext(slot, list, k + 1); };
    probe.src = list[k];
  }

  /* ---------- search ---------- */
  var searchPanel = $('searchPanel'), searchInput = $('searchInput');
  var timer = null;
  function openSearch() { searchPanel.hidden = false; searchInput.focus(); runSearch(searchInput.value); }
  function closeSearch() { searchPanel.hidden = true; }
  $('searchBtn').addEventListener('click', openSearch);
  $('searchClose').addEventListener('click', closeSearch);
  searchInput.addEventListener('input', function () {
    clearTimeout(timer); timer = setTimeout(function () { runSearch(searchInput.value); }, 220);
  });
  function markFragment(frag, q) {
    var lower = frag.toLowerCase(), lq = q.toLowerCase(), out = '', last = 0, p;
    while ((p = lower.indexOf(lq, last)) >= 0) {
      out += esc(frag.slice(last, p)) + '<mark>' + esc(frag.slice(p, p + q.length)) + '</mark>';
      last = p + q.length;
    }
    return out + esc(frag.slice(last));
  }
  function runSearch(q) {
    var box = $('searchResults'), sum = $('searchSummary');
    q = (q || '').trim();
    if (!q) { box.innerHTML = '<div class="search-empty">输入关键词，搜索全部 ' + D.meta.turnCount + ' 轮课程内容</div>'; sum.textContent = ''; return; }
    var lq = q.toLowerCase(), hits = [];
    for (var i = 0; i < plainLower.length && hits.length < 60; i++) {
      var from = 0, p, count = 0;
      while ((p = plainLower[i].indexOf(lq, from)) >= 0 && count < 2) {
        var s = Math.max(0, p - 55), e = Math.min(plain[i].length, p + q.length + 85);
        hits.push({ turn: i, frag: plain[i].slice(s, e).replace(/\s+/g, ' '), q: q });
        from = p + q.length; count++;
      }
    }
    sum.textContent = '找到 ' + hits.length + ' 处匹配' + (hits.length >= 60 ? '（已截断）' : '');
    box.innerHTML = hits.length ? hits.map(function (h) {
      var lab = lessonLabel(h.turn) || ('第 ' + (h.turn + 1) + ' 轮');
      return '<button class="search-hit" data-turn="' + h.turn + '"><div class="sh-top">' +
        esc(lab) + ' · ' + esc(D.turns[h.turn].aTime || '') + '</div><div class="sh-text">' +
        (h.frag.length > 55 ? '…' : '') + markFragment(h.frag, h.q) + '…</div></button>';
    }).join('') : '<div class="search-empty">没有匹配的课程内容</div>';
  }
  $('searchResults').addEventListener('click', function (e) {
    var b = e.target.closest('.search-hit');
    if (!b) return;
    var turn = +b.dataset.turn;
    closeSearch();
    if (!turnEls[turn]) showAll();
    renderTurn(turn);
    var el = turnEls[turn];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.outline = '2px solid var(--pc-accent)';
    el.style.outlineOffset = '6px';
    el.style.borderRadius = '10px';
    setTimeout(function () { el.style.outline = ''; el.style.outlineOffset = ''; }, 2000);
  });

  /* ---------- sources ---------- */
  var sourcesPanel = $('sourcesPanel');
  function openSources(i) {
    var src = D.turns[i].sources || [];
    $('sourcesList').innerHTML = src.length ? src.map(function (s) {
      return '<a class="source-item" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
        '<div class="si-title">' + esc(s.title) + '</div><div class="si-domain">' + esc(s.domain) + '</div>' +
        (s.snippet ? '<div class="si-snippet">' + esc(s.snippet) + '</div>' : '') + '</a>';
    }).join('') : '<div class="search-empty">这一轮没有导出参考来源</div>';
    sourcesPanel.hidden = false;
  }
  $('sourcesClose').addEventListener('click', function () { sourcesPanel.hidden = true; });

  /* ---------- theme / drawer / shortcuts ---------- */
  try {
    var saved = localStorage.getItem('pc-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
  $('themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('pc-theme', next); } catch (e) {}
  });
  function openSidebar() { sidebar.classList.add('open'); scrim.classList.add('show'); $('menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeSidebar() { sidebar.classList.remove('open'); scrim.classList.remove('show'); $('menuBtn').setAttribute('aria-expanded', 'false'); }
  $('menuBtn').addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  scrim.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); sourcesPanel.hidden = true; closeSidebar(); }
  });

  buildLessons();
  buildThread(allIndices);

  // #turn-N gives every lesson round a shareable deep link.
  function gotoHash() {
    var m = /^#turn-(\d+)$/.exec(location.hash || '');
    if (!m) return;
    var i = +m[1];
    if (!turnEls[i]) return;
    renderTurn(i);
    var el = turnEls[i], wrap = threadWrap;
    var top = el.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop;
    var prev = wrap.style.scrollBehavior;
    wrap.style.scrollBehavior = 'auto';
    wrap.scrollTop = Math.max(0, top - 16);
    wrap.style.scrollBehavior = prev;
  }
  window.addEventListener('hashchange', gotoHash);
  gotoHash();
  setTimeout(gotoHash, 400);
})();
