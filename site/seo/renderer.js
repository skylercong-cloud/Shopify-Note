/* DIL -> DOM renderer.
   The export keeps ChatGPT's Intelligent UI markup verbatim in message parts.
   This renderer expands the Svelte-like logic to a static snapshot, then emits
   the same data-d-component DOM the official client produces. */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(v, d) {
    var n = parseFloat(v);
    return isNaN(n) ? (d || 0) : n;
  }
  function v(name, fallback) { return 'var(' + name + ',' + fallback + ')'; }

  /* ---------- brace / block scanning ---------- */
  function braceEnd(s, start) {
    var depth = 0, quote = null, bs = false;
    // Guard against an unmatched '{' in prose scanning the rest of the message.
    var limit = Math.min(s.length, start + 40000);
    for (var i = start; i < limit; i++) {
      var c = s[i];
      if (quote) {
        if (bs) { bs = false; continue; }
        if (c === '\\') { bs = true; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
  }

  // One malformed export contains `{"q:"为什么…` (a missing quote), which
  // desynchronises quote tracking and makes braceEnd scan past the statement
  // into following lines. Falling back to the line end keeps the damage local.
  function braceEndSafe(s, start) {
    var e = braceEnd(s, start);
    if (e >= 0) return e;
    var nl = s.indexOf('\n', start);
    if (nl > start) {
      var q = nl;
      while (q > start && /\s/.test(s[q - 1])) q--;
      return q - 1;
    }
    return -1;
  }

  function logicBlock(s, openEnd) {
    var depth = 1, i = openEnd + 1, elseAt = -1, elseEnd = -1, closeAt = -1, closeEnd = -1;
    while (i < s.length) {
      var j = s.indexOf('{', i);
      if (j < 0) break;
      var e = braceEnd(s, j);
      if (e < 0) break;
      var inner = s.slice(j + 1, e).trim();
      if (/^#(if|each)\b/.test(inner)) depth++;
      else if (/^\/(if|each)\b/.test(inner)) {
        depth--;
        if (depth === 0) { closeAt = j; closeEnd = e; break; }
      } else if (depth === 1 && /^:else/.test(inner) && elseAt < 0) {
        elseAt = j; elseEnd = e;
      }
      i = e + 1;
    }
    return {
      bodyStart: openEnd + 1,
      bodyEnd: elseAt >= 0 ? elseAt : (closeAt >= 0 ? closeAt : s.length),
      elseStart: elseEnd + 1,
      elseEnd: closeAt >= 0 ? closeAt : s.length,
      elseInner: elseAt >= 0 ? s.slice(elseAt + 1, elseEnd).trim() : '',
      hasElse: elseAt >= 0,
      closeEnd: closeEnd >= 0 ? closeEnd : s.length
    };
  }

  /* ---------- model-written JS: static evaluation ---------- */
  var DIL_STUB = {
    useState: function (init) { return [init, function () {}]; },
    useConstants: function () { return {}; },
    useAppData: function () { return {}; },
    render: function () {}, jsx: function () { return null; }, Fragment: null
  };

  function collectStatements(s) {
    var stmts = [], names = [], i = 0;
    while ((i = s.indexOf('{@body', i)) >= 0) {
      var end = braceEndSafe(s, i);
      if (end < 0) break;
      // Repair exported blocks where a quote after an object key was lost:
      // {"q:"题意" -> {"q":"题意"  (a plain {"q":"..." stays untouched).
      var stmt = s.slice(i + 6, end).trim()
        .replace(/\{"([A-Za-z_$][\w$]*):"(?!")/g, '{"$1":"');
      if (stmt) {
        stmts.push(stmt);
        var dm = /^\s*(?:const|let|var)\s*\[([^\]]+)\]\s*=/.exec(stmt);
        if (dm) dm[1].split(',').forEach(function (n) { if (n.trim()) names.push(n.trim()); });
        else {
          var vm = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(stmt);
          if (vm) names.push(vm[1]);
        }
      }
      i = end + 1;
    }
    return { stmts: stmts, names: names.filter(function (n, k, a) { return a.indexOf(n) === k; }) };
  }

  function buildScope(s) {
    var info = collectStatements(s);
    if (info.stmts.length) {
      try {
        var body = info.stmts.join('\n') + '\nreturn {' +
          info.names.map(function (n) { return JSON.stringify(n) + ':' + n; }).join(',') + '};';
        return new Function('DIL', body)(DIL_STUB);
      } catch (err) { /* fall through */ }
    }
    // Degraded path: recover just the useState initial values.
    var scope = {};
    info.stmts.forEach(function (stmt) {
      var m = /\[\s*([A-Za-z_$][\w$]*)\s*,[^=\]]*\]\s*=\s*DIL\.useState\(([\s\S]*)\)\s*$/.exec(stmt);
      if (m) {
        try { scope[m[1]] = new Function('return (' + m[2] + ')')(); } catch (e) {}
      }
    });
    return scope;
  }

  var fnCache = {};
  function evalValue(expr, scope) {
    try {
      var keys = Object.keys(scope);
      var ck = expr + '|' + keys.join(',');
      var fn = fnCache[ck];
      if (!fn) {
        fn = new Function(keys, 'return (' + expr + ');');
        if (Object.keys(fnCache).length < 4000) fnCache[ck] = fn;
      }
      return fn.apply(null, keys.map(function (k) { return scope[k]; }));
    } catch (e) { return undefined; }
  }
  function evalText(expr, scope) {
    var val = evalValue(expr, scope);
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return val.map(String).join(',');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  /* ---------- logic expansion ---------- */
  function expand(s, scope, svgMode) {
    var out = '', i = 0;
    while (i < s.length) {
      if (s[i] !== '{') { out += s[i]; i++; continue; }
      var end = braceEnd(s, i);
      if (end < 0) {
        // A broken {@body ...} must be skipped as a whole; emitting '{' would
        // leak the JS source into the article and swallow following paragraphs.
        if (/^@body/.test(s.slice(i + 1, i + 12))) {
          var nl = s.indexOf('\n', i);
          if (nl > i) { i = nl + 1; continue; }
        }
        out += '{'; i++; continue;
      }
      var inner = s.slice(i + 1, end).trim();

      if (/^@body/.test(inner)) { i = end + 1; continue; }

      if (/^#each\b/.test(inner)) {
        var blk = logicBlock(s, end);
        var m = /^#each\s+([\s\S]+?)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?\s*$/.exec(inner);
        if (m) {
          var body = s.slice(blk.bodyStart, blk.bodyEnd);
          var arr = evalValue(m[1], scope);
          if (arr && typeof arr.length === 'number') {
            for (var k = 0; k < arr.length; k++) {
              var child = {};
              for (var key in scope) child[key] = scope[key];
              child[m[2]] = arr[k];
              if (m[3]) child[m[3]] = k;
              out += expand(body, child, svgMode);
            }
          }
        }
        i = blk.closeEnd + 1; continue;
      }

      if (/^#if\b/.test(inner)) {
        var b2 = logicBlock(s, end);
        var cond = inner.slice(3).trim();
        var yes = s.slice(b2.bodyStart, b2.bodyEnd);
        if (evalValue(cond, scope)) {
          out += expand(yes, scope, svgMode);
        } else if (b2.hasElse && b2.elseStart <= b2.elseEnd) {
          var no = s.slice(b2.elseStart, b2.elseEnd);
          var ei = /^:else\s+if\s+([\s\S]+)$/.exec(b2.elseInner);
          if (ei) {
            if (evalValue(ei[1], scope)) out += expand(no, scope, svgMode);
          } else out += expand(no, scope, svgMode);
        }
        i = b2.closeEnd + 1; continue;
      }

      if (/^(:else|\/(if|each))/.test(inner)) { i = end + 1; continue; }
      var val = esc(evalText(inner, scope));
      // DIL writes SVG attributes as `y={n.y}` (no quotes). Emit real quotes so
      // multi-word values such as path `d="M 170 64 v 12 ..."` survive parsing.
      out += (svgMode && i > 0 && s[i - 1] === '=') ? '"' + val + '"' : val;
      i = end + 1;
    }
    return out;
  }

  /* ---------- code protection ---------- */
  var F_RE = /\u0001F(\d+)\u0001/g;
  function protect(text) {
    var stash = { fenced: [], inline: [], svg: [], charts: [], math: [] };
    var t = text.replace(/```([\w+#.-]*)\s*\n([\s\S]*?)```/g, function (m, lang, code) {
      var id = stash.fenced.push({ lang: lang || '', code: code }) - 1;
      return '\u0001F' + id + '\u0001';
    });
    // LaTeX display math must be isolated BEFORE DIL expansion: braces such as
    // {\text{重定向}} would otherwise be read as a DIL {expression}, evaluated
    // to nothing, and leave `TTFB \approx T_+T_+...` as plain text.
    t = t.replace(/\\\[([\s\S]*?)\\\]/g, function (m, tex) {
      var id = stash.math.push(tex) - 1;
      return '\u0002M' + id + '\u0002';
    });
    // <Chart content={{...}}/> carries a real dataset; keep its object intact.
    t = t.replace(/<Chart\b[^>]*?\/>/g, function (m) {
      var k = m.indexOf('content=');
      if (k >= 0) {
        var st = m.indexOf('{', k) + 1;
        var e = braceEnd(m, st);
        if (e > st) {
          var id = stash.charts.push(m.slice(st, e + 1)) - 1;
          return '\u0001C' + id + '\u0001';
        }
      }
      return m;
    });
    // SVG must be isolated BEFORE inline-code protection: DIL writes path data
    // as d={`M 170 ${n.y+56} ...`}, and the backticks would otherwise be
    // mistaken for Markdown inline code, leaving `d=""` in the output.
    t = t.replace(/<svg\b[\s\S]*?<\/svg>/gi, function (m) {
      var id = stash.svg.push(m) - 1;
      return '\u0002S' + id + '\u0002';
    });
    t = t.replace(/`([^`\n]+)`/g, function (m, code) {
      var id = stash.inline.push(code) - 1;
      return '\u0001I' + id + '\u0001';
    });
    return { text: t, stash: stash };
  }

  /* DIL SVG uses JSX attribute names (textAnchor / fontSize / fillOpacity ...).
     HTML only auto-corrects a small whitelist (viewBox, preserveAspectRatio…),
     so the rest must be converted to kebab-case or the browser silently ignores
     them: text overflows its box, fills render fully opaque, font sizes inflate. */
  var SVG_ATTR = {
    textAnchor: 'text-anchor', fontSize: 'font-size', fontFamily: 'font-family',
    fontWeight: 'font-weight', fontStyle: 'font-style', letterSpacing: 'letter-spacing',
    fillOpacity: 'fill-opacity', fillRule: 'fill-rule', strokeOpacity: 'stroke-opacity',
    strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap',
    strokeLinejoin: 'stroke-linejoin', strokeDasharray: 'stroke-dasharray',
    strokeDashoffset: 'stroke-dashoffset', strokeMiterlimit: 'stroke-miterlimit',
    dominantBaseline: 'dominant-baseline', alignmentBaseline: 'alignment-baseline',
    baselineShift: 'baseline-shift', clipPath: 'clip-path', clipRule: 'clip-rule',
    stopColor: 'stop-color', stopOpacity: 'stop-opacity',
    markerEnd: 'marker-end', markerStart: 'marker-start',
    transformOrigin: 'transform-origin', vectorEffect: 'vector-effect'
  };
  function normalizeSvg(raw, scope) {
    var s = expand(raw, scope, true);
    s = s.replace(/<([A-Za-z][\w:.-]*)([\s\S]*?)>/g, function (m, tag, rest) {
      return '<' + tag + rest.replace(/(\s)([A-Za-z][A-Za-z0-9]*)(?=\s*=)/g, function (mm, sp, name) {
        return sp + (SVG_ATTR[name] || name);
      }) + '>';
    });
    // strip any unparsed logic leftovers so they never show up as literal text
    s = s.replace(/\{@(?:body|const)[^}]*\}/g, '')
         .replace(/\{[#:/](?:if|each|else)[^}]*\}/g, '');
    return s;
  }

  /* ---------- lightweight, fully offline markdown ---------- */
  var KW = /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|new|try|catch|throw|true|false|null|undefined|this|def|elif|self|public|private|static|void|await|yield|typeof|instanceof|in|of)\b/;
  function highlightPlain(seg) {
    var out = '', last = 0, m, kre = new RegExp(KW.source, 'g');
    while ((m = kre.exec(seg))) {
      out += esc(seg.slice(last, m.index)) + '<span class="tk-k">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(seg.slice(last));
  }
  function highlight(src) {
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += highlightPlain(src.slice(last, m.index));
      out += '<span class="tk-' + (m[1] ? 'c' : m[2] ? 's' : 'n') + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + highlightPlain(src.slice(last));
  }

  function codeBlock(item) {
    var lang = esc(item.lang || 'text');
    return '<div data-client-defined-widget="code_block"><div class="CodeBlock-zu1QM3">' +
      '<div data-code-block="true" class="dil-code"><div class="dil-code-head">' +
      '<span>' + lang + '</span><button type="button" class="dil-copy" aria-label="复制代码">复制</button>' +
      '</div><pre><code>' + highlight(item.code.replace(/\n$/, '')) + '</code></pre></div></div></div>';
  }

  function renderChart(objText) {
    var spec;
    try { spec = new Function('return (' + objText + ')')(); } catch (e) { spec = null; }
    if (!spec || !spec.data || !spec.data.length) {
      return '<div class="dil-chart dil-chart-empty" data-d-component="chart">图表数据未随导出完整保存</div>';
    }
    var meta = spec.meta || {}, rows = spec.data, series = spec.series || [], keys = [];
    series.forEach(function (s) { if (s.dataKey) keys.push(s.dataKey); });
    if (!keys.length) {
      Object.keys(rows[0]).forEach(function (k) {
        if (k !== spec.xKey && typeof rows[0][k] === 'number') keys.push(k);
      });
    }
    if (!keys.length) keys = [Object.keys(rows[0]).filter(function (k) { return k !== spec.xKey; })[0]];
    var max = Number(spec.yAxisMax) || 0;
    if (!max) rows.forEach(function (r) {
      keys.forEach(function (k) { max = Math.max(max, Number(r[k]) || 0); });
    });
    if (!max) max = 1;
    var cols = rows.map(function (r) {
      var label = r[spec.xKey] !== undefined ? r[spec.xKey] : '';
      var bars = keys.map(function (k) {
        var val = Number(r[k]) || 0;
        var h = Math.max(2, Math.round(val / max * 100));
        return '<div class="chart-bar" style="height:' + h + '%" title="' + esc(k) + ': ' + esc(val) +
          '"><span>' + esc(val) + '</span></div>';
      }).join('');
      return '<div class="chart-col"><div class="chart-bars">' + bars + '</div>' +
        '<div class="chart-label">' + esc(label) + '</div></div>';
    }).join('');
    var legend = series.map(function (s) {
      return '<span class="chart-key"><i></i>' + esc(s.label || s.dataKey) + '</span>';
    }).join('');
    return '<div class="dil-chart" data-d-component="chart">' +
      (meta.title ? '<div class="chart-title">' + esc(meta.title) + '</div>' : '') +
      (meta.description ? '<div class="chart-desc">' + esc(meta.description) + '</div>' : '') +
      '<div class="chart-cols">' + cols + '</div>' +
      (legend ? '<div class="chart-legend">' + legend + '</div>' : '') + '</div>';
  }

  /* ---------- tiny offline LaTeX renderer ----------
     The export contains 21 display formulas using a small command subset
     (\text \frac \approx \times \% \lceil \rceil, sub/superscripts). A full
     KaTeX build would break the zero-dependency / file:// constraint, so we
     typeset just this subset with HTML + CSS. */
  function renderMath(tex) {
    var s = String(tex).replace(/\\\[|\\\]/g, '').trim(), i = 0;

    function rawGroup() { // read {…} verbatim (for \text{中文})
      if (s[i] !== '{') return '';
      var start = ++i, depth = 1;
      while (i < s.length && depth) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') { depth--; if (!depth) break; }
        i++;
      }
      var out = s.slice(start, i); i++;
      return out;
    }
    function seq(stopBrace) {
      var out = '';
      while (i < s.length) {
        var c = s[i];
        if (stopBrace && c === '}') { i++; break; }
        if (c === '{') { i++; out += '<span class="mgroup">' + seq(true) + '</span>'; continue; }
        if (c === '_' || c === '^') {
          i++;
          var tag = c === '_' ? 'sub' : 'sup';
          out += '<' + tag + '>' + atom() + '</' + tag + '>';
          continue;
        }
        if (c === '\\') { out += command(); continue; }
        var word = /^[A-Za-z]+/.exec(s.slice(i));
        if (word) {
          i += word[0].length;
          // Single letters are variables (italic); multi-letter words are
          // units / labels / prose and stay upright, as KaTeX would.
          out += word[0].length === 1
            ? '<i class="mi">' + esc(word[0]) + '</i>'
            : '<span class="mtext">' + esc(word[0]) + '</span>';
          continue;
        }
        var number = /^[0-9][0-9.,]*/.exec(s.slice(i));
        if (number) { i += number[0].length; out += '<span class="mn">' + esc(number[0]) + '</span>'; continue; }
        i++;
        if (/\s/.test(c)) { out += ' '; continue; }
        if (/[+\-=<>|]/.test(c)) { out += '<span class="mop"> ' + esc(c) + ' </span>'; continue; }
        out += '<span class="mpunc">' + esc(c) + '</span>';
      }
      return out;
    }
    function parsedGroup() {
      if (s[i] !== '{') return atom();
      i++;
      return seq(true);
    }
    function atom() {
      if (i >= s.length) return '';
      if (s[i] === '{') { i++; return seq(true); }
      if (s[i] === '\\') return command();
      return esc(s[i++]);
    }
    function command() {
      i++; // consume backslash
      if (i >= s.length) return '';
      var d = s[i];
      if (!/[A-Za-z]/.test(d)) {
        i++;
        if (/\s/.test(d)) return ' ';
        return '<span class="mpunc">' + esc(d) + '</span>';
      }
      var m = /^[A-Za-z]+/.exec(s.slice(i));
      i += m[0].length;
      var name = m[0];
      switch (name) {
        case 'text': return '<span class="mtext">' + esc(rawGroup()) + '</span>';
        case 'frac': {
          var num = parsedGroup(), den = parsedGroup();
          return '<span class="mfrac"><span class="mnum">' + num +
            '</span><span class="mden">' + den + '</span></span>';
        }
        case 'approx': return '<span class="mop">≈</span>';
        case 'times': return '<span class="mop">×</span>';
        case 'cdot': return '<span class="mop">·</span>';
        case 'leq': return '<span class="mop">≤</span>';
        case 'geq': return '<span class="mop">≥</span>';
        case 'neq': return '<span class="mop">≠</span>';
        case 'pm': return '<span class="mop">±</span>';
        case 'lceil': return '<span class="mdelim">⌈</span>';
        case 'rceil': return '<span class="mdelim">⌉</span>';
        case 'lfloor': return '<span class="mdelim">⌊</span>';
        case 'rfloor': return '<span class="mdelim">⌋</span>';
        case 'left': case 'right': return '';
        case 'quad': case 'qquad': return '&nbsp;&nbsp;';
        default: return '<span class="mtext">' + esc(name) + '</span>';
      }
    }
    return '<span class="mrow">' + seq(false) + '</span>';
  }
  function mathBlock(tex) {
    return '<div class="dil-math-block" data-d-component="math">' + renderMath(tex) + '</div>';
  }

  function inlineMd(s) {
    var t = esc(s);
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t;
  }

  function blockMd(s) {
    var lines = s.split('\n'), out = '', para = [], list = null, table = [];
    function flushPara() {
      if (para.length) {
        var joined = para.join('\n');
        out += ONLY_TOKENS.test(joined)
          ? joined.trim()
          : '<p>' + inlineMd(joined).replace(/\n/g, '<br>') + '</p>';
        para = [];
      }
    }
    function flushList() {
      if (list) { out += '</' + list + '>'; list = null; }
    }
    function flushTable() {
      if (!table.length) return;
      var rows = table.filter(function (l) { return !/^\s*\|?[\s:|-]+\|?\s*$/.test(l) || !/-/.test(l); });
      var head = [];
      var sepIndex = -1;
      for (var q = 0; q < table.length; q++) if (/^\s*\|?[\s:|-]+\|?\s*$/.test(table[q]) && /-/.test(table[q])) { sepIndex = q; break; }
      var html = '<div class="dil-md-table"><table><thead><tr>';
      var split = function (l) { return l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (x) { return x.trim(); }); };
      var bodyRows = table.filter(function (l, q) { return q !== sepIndex; });
      if (bodyRows.length) {
        head = split(bodyRows[0]);
        head.forEach(function (c) { html += '<th>' + inlineMd(c) + '</th>'; });
        html += '</tr></thead><tbody>';
        bodyRows.slice(1).forEach(function (l) {
          html += '<tr>';
          split(l).forEach(function (c) { html += '<td>' + inlineMd(c) + '</td>'; });
          html += '</tr>';
        });
        html += '</tbody>';
      }
      out += html + '</table></div>';
      table = [];
    }
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^\s*\|.*\|\s*$/.test(l)) { flushPara(); flushList(); table.push(l); continue; }
      flushTable();
      var h = /^(#{1,6})\s+(.+)$/.exec(l);
      if (h) { flushPara(); flushList(); out += '<h' + h[1].length + '>' + inlineMd(h[2]) + '</h' + h[1].length + '>'; continue; }
      if (/^\s*(---|___|\*\*\*)\s*$/.test(l)) { flushPara(); flushList(); out += '<hr>'; continue; }
      var ul = /^\s*[-*+]\s+(.+)$/.exec(l);
      var ol = /^\s*\d+[.)]\s+(.+)$/.exec(l);
      if (ul || ol) {
        flushPara();
        var want = ol ? 'ol' : 'ul';
        if (list !== want) { flushList(); out += '<' + want + '>'; list = want; }
        out += '<li>' + inlineMd((ul || ol)[1]) + '</li>';
        continue;
      }
      flushList();
      if (/^\s*&gt;\s?/.test(l)) { flushPara(); out += '<blockquote>' + inlineMd(l.replace(/^\s*&gt;\s?/, '')) + '</blockquote>'; continue; }
      if (!l.trim()) { flushPara(); continue; }
      para.push(l);
    }
    flushPara(); flushList(); flushTable();
    return out;
  }

  var PLACE = /\u0001F(\d+)\u0001|\u0001I(\d+)\u0001|\u0001C(\d+)\u0001|\u0002S(\d+)\u0002|\u0002M(\d+)\u0002/g;
  var TOKEN = /\u0003F(\d+)\u0003|\u0003I(\d+)\u0003|\u0003C(\d+)\u0003|\u0003S(\d+)\u0003|\u0003M(\d+)\u0003/g;
  var ONLY_TOKENS = /^\s*(?:\u0003[FISCM]\d+\u0003\s*)+$/;
  function markTokens(s) {
    return s.replace(PLACE, function (m, a, b, c, d, e) {
      return '\u0003' + (a !== undefined ? 'F' + a : b !== undefined ? 'I' + b :
        c !== undefined ? 'C' + c : d !== undefined ? 'S' + d : 'M' + e) + '\u0003';
    });
  }
  function restoreTokens(html, stash) {
    return html.replace(TOKEN, function (m, a, b, c, d, e) {
      if (a !== undefined) return codeBlock(stash.fenced[+a]);
      if (b !== undefined) return '<code class="InlineCode-Cddi3Y">' + esc(stash.inline[+b]) + '</code>';
      if (c !== undefined) return renderChart(stash.charts[+c]);
      if (d !== undefined) return '<div class="dil-svg-wrap">' + stash.svg[+d] + '</div>';
      return mathBlock(stash.math[+e]);
    });
  }
  function renderText(s, inComp, stash) {
    return restoreTokens(plain(markTokens(s), inComp), stash);
  }
  function plain(s, inComp) {
    if (!s.trim()) return '';
    if (ONLY_TOKENS.test(s)) return s.trim();
    return inComp
      ? '<span class="dil-inline">' + inlineMd(s.trim()).replace(/\n/g, '<br>') + '</span>'
      : blockMd(s);
  }

  /* ---------- tags ---------- */
  function parseAttrs(s) {
    var a = {}, re = /([A-Za-z_$][\w$\-.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, m;
    while ((m = re.exec(s || ''))) {
      a[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : true;
    }
    return a;
  }
  function parseTree(s) {
    var root = { children: [] }, stack = [root];
    var re = /<(\/?)([A-Za-z][\w:.-]*)((?:\s[^<>]*?)?)(\/?)>/g, m, last = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) stack[stack.length - 1].children.push({ t: 'text', v: s.slice(last, m.index) });
      if (m[1]) {
        for (var k = stack.length - 1; k > 0; k--) {
          if (stack[k].tag === m[2].toLowerCase()) { stack.length = k; break; }
        }
      } else {
        var node = { t: 'tag', tag: m[2].toLowerCase(), attrs: parseAttrs(m[3]), children: [], self: !!m[4] };
        stack[stack.length - 1].children.push(node);
        if (!m[4]) stack.push(node);
      }
      last = re.lastIndex;
    }
    if (last < s.length) stack[stack.length - 1].children.push({ t: 'text', v: s.slice(last) });
    return root;
  }

  /* ---------- component styles ---------- */
  var RADIUS = { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px' };
  var SIZE = { '2xs': '11px', xs: '12px', sm: '13px', base: '15px', md: '15px', lg: '18px', xl: '22px', '2xl': '26px' };
  var TITLE_SIZE = { '2xs': '12px', xs: '14px', sm: '16px', base: '18px', md: '18px', lg: '21px', xl: '24px', '2xl': '28px' };
  function radius(x) { return RADIUS[x] || (/^\d/.test(String(x)) ? x + 'px' : v('--dil-radius-lg', '16px')); }
  /* gap/padding accept both DIL spacing units (gap={3}) and literal CSS (gap="1px") */
  function spacing(x) {
    if (x === true || x === undefined || x === '') return '';
    if (/^-?[\d.]+(px|rem|em|%|vh|vw)$/.test(String(x))) return String(x);
    return 'calc(' + v('--spacing', '0.25rem') + ' * ' + num(x, 0) + ')';
  }
  function flexVal(f) {
    var s = String(f);
    return /^[\d.]+$/.test(s) ? s + ' 1 0%' : s;
  }
  function bg(x) {
    if (!x || x === true) return '';
    if (String(x).indexOf('surface') === 0 || String(x).indexOf('background') === 0)
      return v('--color-' + x, '#f4f4f4');
    return x;
  }
  function align(x) { return { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', stretch: 'stretch' }[x] || x; }
  function textColor(c) {
    var s = c === undefined || c === true || c === '' ? '' : String(c);
    if (!s) return v('--color-text-primary', '#0d0d0d');
    /* Some official theme vars use Lightning CSS two-value syntax
       (light dark) which CSS cannot resolve into a single color. Use our own
       theme tokens / explicit colors for those semantic values instead. */
    if (s === 'danger') return '#d92d20';
    if (s === 'success') return '#16803c';
    if (s === 'warning') return '#b45309';
    if (s === 'secondary') return v('--pc-muted', '#666666');
    if (s === 'tertiary' || s === 'muted') return v('--pc-muted', '#8f8f8f');
    if (s === 'link') return v('--pc-accent', '#2563eb');
    if (s === 'primary') return v('--pc-text', '#0d0d0d');
    return s;
  }
  function boxStyle(a, dir) {
    var st = ['display:flex', 'flex-direction:' + (dir || 'column')];
    if (a.gap !== undefined) st.push('gap:' + spacing(a.gap));
    if (a.padding !== undefined) st.push('padding:' + spacing(a.padding));
    if (a.border) st.push('border:1px solid ' + v('--color-border', '#e3e3e3'));
    if (a.radius) st.push('border-radius:' + radius(a.radius));
    if (a.background) st.push('background:' + bg(a.background));
    if (a.align) st.push('align-items:' + align(a.align));
    if (a.justify) st.push('justify-content:' + align(a.justify));
    if (a.flex) st.push('flex:' + flexVal(a.flex));
    if (a.width) st.push('width:' + String(a.width));
    if (a.height) st.push('height:' + String(a.height));
    /* size="10px" is the legend dot / square used by the timing breakdown cards */
    if (a.size) st.push('width:' + String(a.size), 'height:' + String(a.size), 'flex-shrink:0');
    if (a.clip) st.push('overflow:hidden');
    return st.join(';');
  }

  /* Icon shapes. ChatGPT ships Heroicons-style 24x24 glyphs; the three arrow
     paths below were lifted verbatim from the official saved-page DOM. */
  var SOLID_ICONS = {
    'arrow-down': 'M12.707 18.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 15.586V6a1 1 0 1 1 2 0v9.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5Z',
    'chevron-right': 'M8.293 4.293a1 1 0 0 1 1.414 0l7 7a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414Z',
    'arrow-right': 'M18.707 12.707a1 1 0 0 0 0-1.414l-5-5a1 1 0 1 0-1.414 1.414L15.586 11H6a1 1 0 1 0 0 2h9.586l-3.293 3.293a1 1 0 0 0 1.414 1.414l5-5Z'
  };
  var SOLID_ROTATE = {
    'arrow-up': ['arrow-down', 180], 'arrow-left': ['arrow-right', 180],
    'arrow-up-right': ['arrow-right', -45], 'arrow-down-right': ['arrow-right', 45],
    'arrow-up-left': ['arrow-right', -135], 'chevron-down': ['chevron-right', 90],
    'chevron-left': ['chevron-right', 180], 'chevron-up': ['chevron-right', -90]
  };
  var ICONS = {
    gauge: 'M12 14a2 2 0 100-4 2 2 0 000 4zm0 0l4-4M4.2 17.8a9 9 0 1115.6 0',
    network: 'M12 3v6m0 0l-6 6m6-6l6 6M4 19h4m8 0h4M2 21h20',
    'code-2': 'm8 8-4 4 4 4m8-8 4 4-4 4m-2-12-4 16',
    images: 'M3 7h14v10H3zM7 21h10a2 2 0 002-2V9',
    image: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
    'scan-search': 'M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3m-8 0H5a1 1 0 01-1-1v-3m5.5-3a3 3 0 106 0 3 3 0 00-6 0zm3 3 2 2',
    server: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
    'shopping-bag': 'M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2',
    'shopping-cart': 'M3 4h2l2 11h10l2-7H6m3 12h.01M16 20h.01',
    'package-open': 'M3 8l9-5 9 5v9l-9 4-9-4zM3 8l9 5 9-5M12 13v9',
    box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 5 9-5M12 12v9',
    blocks: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    zap: 'm13 2-9 12h7l-1 8 9-12h-7l1-8z',
    flame: 'M12 22a7 7 0 007-7c0-5-4-6-4-11-4 2-4 6-4 6-1-2-2-3-2-3 0 3-4 4-4 8a7 7 0 007 7z',
    clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2',
    'clock-3': 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5h4',
    check: 'm5 13 4 4L19 7',
    'check-circle': 'M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z',
    'check-circle-2': 'M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z',
    'check-circle-filled': 'M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z',
    'x-circle': 'M15 9l-6 6m0-6 6 6M12 3a9 9 0 100 18 9 9 0 000-18z',
    'arrow-right-circle': 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 12h6m-3-3 3 3-3 3',
    'arrow-down-up': 'M8 4v16m0-16L4 8m4-4 4 4M16 20V4m0 16 4-4m-4 4-4-4',
    'corner-down-right': 'M5 4v8a4 4 0 004 4h10m-4-4 4 4-4 4',
    alert: 'M12 3 2 20h20L12 3zm0 7v5m0 3h.01',
    chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
    'chart-no-axes-column': 'M4 20v-8m5 8V6m5 14v-9m5 9V4M2 20h20',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm5 12 5 5',
    cpu: 'M6 6h12v12H6zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',
    layers: 'm12 2 9 5-9 5-9-5 9-5zm-9 10 9 5 9-5M3 17l9 5 9-5',
    database: 'M3 6c0 2 4 3 9 3s9-1 9-3-4-3-9-3-9 1-9 3zm0 0v12c0 2 4 3 9 3s9-1 9-3V6M3 12c0 2 4 3 9 3s9-1 9-3',
    'file-code': 'M6 3h8l4 4v14H6zM14 3v4h4M10 12l-2 2 2 2m4-4 2 2-2 2',
    monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
    video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
    copy: 'M8 8h11v11H8zM5 16H4V5h11v1',
    'refresh-cw': 'M20 7a8 8 0 00-14-2L4 7m0-4v4h4M4 17a8 8 0 0014 2l2-2m0 4v-4h-4',
    wrench: 'M15 5a4 4 0 00-5 5l-6 6 4 4 6-6a4 4 0 005-5l-3 3-3-3z',
    download: 'M12 3v12m-4-4 4 4 4-4M4 19h16',
    'trash-2': 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5',
    'mouse-pointer-click': 'M9 3v3M5 7l2 1m10-1-2 1M5 9l3 10 2-4 4 2-1-9z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    house: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
    info: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 6v6m0 3h.01'
  };
  function icon(name, color) {
    var c = color === undefined || color === true || color === '' ? 'tertiary' : String(color);
    var cssColor = textColor(c);
    var head = '<svg width="1em" height="1em" viewBox="0 0 24 24" data-d-component="icon" ' +
      'aria-hidden="true" style="color:' + cssColor + ';font-size:16px;flex:none;vertical-align:-0.15em"';
    var solid = SOLID_ICONS[name], rot = SOLID_ROTATE[name];
    if (!solid && rot) { solid = SOLID_ICONS[rot[0]]; }
    if (solid) {
      var p = '<path fill-rule="evenodd" clip-rule="evenodd" d="' + solid + '"/>';
      if (rot) p = '<g transform="rotate(' + rot[1] + ' 12 12)">' + p + '</g>';
      return head + ' fill="currentColor">' + p + '</svg>';
    }
    var d = ICONS[name] || 'M12 4a8 8 0 100 16 8 8 0 000-16z';
    return head + ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ' +
      'stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  var slotSeq = 0;
  function slotId(query, ratio, slotMap) {
    var key = query + '|' + ratio;
    if (slotMap && slotMap[key]) return slotMap[key];
    var id = 'img-' + String(++slotSeq).padStart(2, '0');
    if (slotMap) slotMap[key] = id;
    return id;
  }

  function imgSlot(a, ctx) {
    var q = String(a.query || '');
    var r = String(a.aspectRatio || '16:9').replace(':', '/').replace(/\s/g, '');
    var id = slotId(q, a.aspectRatio || '16:9', ctx.slotMap);
    return '<div class="img-slot" data-slot="' + esc(id) + '" style="aspect-ratio:' + esc(r) + '">' +
      '<div class="img-slot-inner"><span class="img-slot-badge">' + esc(id) + '</span>' +
      '<span class="img-slot-query">' + esc(q) + '</span>' +
      '<span class="img-slot-note">原图未随导出保存 · 放入 assets/fill/' + esc(id) + '.jpg 即可回填</span>' +
      '</div></div>';
  }

  function component(tag, a, inner, ctx) {
    var comp = ' data-d-component="' + tag + '"';
    switch (tag) {
      case 'box': {
        var bdir = a.direction === 'row' ? 'row' : 'column';
        return '<div class="Box-qIMv6G"' + comp + ' data-d-direction="' + (bdir === 'row' ? 'row' : 'col') + '"' +
          (a.border ? ' data-d-has-border=""' : '') +
          (a.clip ? ' data-d-clip="true"' : '') +
          (a.height || a.size ? ' data-d-has-height=""' : '') +
          (a.size ? ' data-d-has-width=""' : '') +
          ' style="' + boxStyle(a, bdir) + '">' + inner + '</div>';
      }
      case 'row': case 'col':
        return '<div class="Box-qIMv6G"' + comp.replace(tag, tag === 'row' ? 'row' : 'col') +
          ' data-d-direction="' + (tag === 'row' ? 'row' : 'column') + '"' +
          (a.align ? ' data-d-align="' + esc(a.align) + '"' : '') +
          ' style="' + boxStyle(a, tag === 'row' ? 'row' : 'column') + '">' + inner + '</div>';
      case 'grid':
        return '<div class="Box-qIMv6G"' + comp + ' style="display:grid;grid-template-columns:repeat(' +
          num(a.columns, 1) + ',minmax(0,1fr));gap:' + (a.gap !== undefined ? spacing(a.gap) : '12px') + '">' + inner + '</div>';
      case 'grid-item':
        return '<div class="Box-qIMv6G"' + comp + ' style="min-width:0">' + inner + '</div>';
      case 'text': {
        var tst = ['margin:0', 'font-size:' + (SIZE[a.size] || '15px'), 'color:' + textColor(a.color),
          'font-weight:' + (/^(bold|semibold)$/.test(String(a.weight)) ? 600 : a.weight === 'medium' ? 500 : 400)];
        if (a.textAlign) tst.push('text-align:' + a.textAlign);
        if (a.tabularNums) tst.push('font-variant-numeric:tabular-nums');
        var ta = ' data-d-text-flow=""' +
          (a.size ? ' data-d-size="' + esc(a.size) + '"' : '') +
          (a.weight ? ' data-d-weight="' + esc(a.weight) + '"' : '') +
          (a.textAlign ? ' data-d-text-align="' + esc(a.textAlign) + '"' : '') +
          (a.tabularNums ? ' data-d-tabular-nums="true"' : '');
        return '<p class="TextBase-hXhSqg Text-lIMP0_"' + comp + ta + ' style="' + tst.join(';') + '">' + inner + '</p>';
      }
      case 'title': {
        var titst = ['margin:0', 'font-size:' + (TITLE_SIZE[a.size] || '18px'),
          'color:' + textColor(a.color), 'font-weight:600', 'line-height:1.35'];
        if (a.tabularNums) titst.push('font-variant-numeric:tabular-nums');
        return '<h2 class="TextBase-hXhSqg Title-HRvkwB"' + comp +
          ' data-d-size="' + esc(a.size || 'base') + '" data-d-weight="semibold"' +
          (a.tabularNums ? ' data-d-tabular-nums="true"' : '') +
          ' style="' + titst.join(';') + '">' + inner + '</h2>';
      }
      case 'caption':
        return '<span class="TextBase-hXhSqg Caption-VSNpzV dil-caption"' + comp +
          ' data-d-text-flow="" data-d-size="lg" data-d-weight="normal">' + inner + '</span>';
      case 'badge':
        return '<span class="Pill-yeX30z"' + comp + ' data-pill="" data-variant="soft" data-size="' +
          esc(a.size || 'sm') + '" data-color="' + esc(a.color || 'secondary') + '" style="background:' +
          v('--gray-75', '#ececec') + '">' + inner + '</span>';
      case 'divider':
        return '<div class="Divider-WkGDyu"' + comp + ' style="--divider-color:' +
          v('--pc-border', '#e5e5e5') + ';--divider-size:1px"></div>';
      case 'icon':
        return icon(String(a.name || ''), a.color);
      case 'table':
        return '<div class="dil-table"' + comp + '>' + inner + '</div>';
      case 'table-row':
        return '<div class="dil-table-row"' + comp + '>' + inner + '</div>';
      case 'table-cell':
        return '<div class="dil-table-cell"' + comp + '>' + inner + '</div>';
      case 'list':
        return '<div class="dil-list"' + comp + '>' + inner + '</div>';
      case 'list-item':
        return '<div class="dil-list-item"' + comp + '>' + inner + '</div>';
      case 'slider':
        return '<input type="range" class="dil-slider"' + comp + ' min="' + num(a.min, 0) +
          '" max="' + num(a.max, 100) + '" step="' + num(a.step, 1) + '" value="' + num(a.value, 0) +
          '" disabled title="静态快照：导出未保存交互状态">';
      case 'radio-group': {
        var gv = String(a.value === undefined ? '' : a.value);
        var radios = inner.replace(/data-radio-value="([^"]*)"/g, function (m0, val) {
          return m0 + (val === gv ? ' checked' : '');
        });
        return '<div class="dil-radio-group"' + comp + '>' + radios + '</div>';
      }
      case 'radio':
        return '<label class="dil-radio"' + comp + '><input type="radio" disabled data-radio-value="' +
          esc(a.value === undefined ? '' : a.value) + '"><span>' + inner + '</span></label>';
      case 'pressable':
        /* Official DOM: <button class="Box-qIMv6G Pressable-KyqH6M" data-d-direction="col"> */
        return '<button type="button" class="Box-qIMv6G Pressable-KyqH6M"' + comp +
          ' data-d-direction="col"' + (a.border ? ' data-d-has-border=""' : '') +
          ' style="' + boxStyle(a, 'column') +
          ';width:100%;box-sizing:border-box;text-align:left;background:transparent;color:inherit;font:inherit;cursor:default">' +
          inner + '</button>';
      case 'button':
        return '<button type="button" class="dil-button"' + comp + '>' + inner + '</button>';
      case 'form':
        return '<div class="dil-form"' + comp + '>' + inner + '</div>';
      case 'input':
        return '<input class="dil-input"' + comp + ' value="' + esc(a.value === true ? '' : (a.value || '')) + '" disabled>';
      case 'label':
        return '<label class="dil-label"' + comp + '>' + inner + '</label>';
      case 'chart':
        return '<div class="dil-chart dil-chart-empty" data-d-component="chart">图表数据未随导出完整保存</div>';
      case 'entity':
        return '<span class="dil-entity" data-d-component="entity" title="' + esc(a.disambig || '') + '">' +
          esc(a.value || '') + (a.category ? '<span class="dil-entity-cat">' + esc(a.category) + '</span>' : '') + '</span>';
      case 'memorycite':
        return '<span class="dil-memory" data-d-component="memorycite" title="本段引用了对话记忆">记忆</span>';
      case 'spacer':
        return '<div class="dil-spacer" data-d-component="spacer"></div>';
      case 'asyncimagegroup': {
        var gq = String(a.query || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        var gr = String(a.aspectRatio || '5:4').replace(':', '/').replace(/\s/g, '');
        return '<div class="img-slot img-group" data-d-component="asyncimagegroup" style="aspect-ratio:' + esc(gr) +
          '"><div class="img-slot-inner"><span class="img-slot-badge">图片组 · ' + gq.length + ' 张</span>' +
          gq.map(function (q) { return '<span class="img-slot-query">' + esc(q) + '</span>'; }).join('') +
          '<span class="img-slot-note">原图未随导出保存</span></div></div>';
      }
      case 'asyncimage':
        return imgSlot(a, ctx);
      case 'image':
        return '<div class="img-slot img-slot-plain"' + comp + ' style="aspect-ratio:' +
          esc(String(a.aspectRatio || '16:9').replace(':', '/')) + '">' + inner + '</div>';
      case 'cite': {
        var refs = String(a.refs || a.ref || '').split(',').filter(Boolean).length || 1;
        return '<sup class="cite-mark"' + comp + ' data-cite="' + esc(a.refs || a.ref || '') +
          '" title="查看参考来源">' + refs + '</sup>';
      }
      case 'link':
        return '<a class="dil-link"' + comp + ' href="' + esc(a.href || a.url || '#') +
          '" target="_blank" rel="noopener">' + inner + '</a>';
      case 'code':
        return '<code class="InlineCode-Cddi3Y"' + comp + '>' + inner + '</code>';
      case 'math':
        return '<span class="dil-math"' + comp + '>' + inner + '</span>';
      case 'blockquote':
        return '<blockquote class="dil-quote"' + comp + '>' + inner + '</blockquote>';
      case 'favicon': case 'popover-trigger': case 'loading-block':
      case 'segmented-control': case 'details': case 'summary':
        return '<span class="dil-minor"' + comp + '>' + inner + '</span>';
      case 'svg': case 'rect': case 'path': case 'g': case 'line': case 'circle':
        return inner;
      default:
        return '<div class="dil-unknown"' + comp + ' data-tag="' + esc(tag) + '">' + inner + '</div>';
    }
  }

  function renderNode(n, ctx, inComp, stash) {
    if (n.t === 'text') return renderText(n.v, inComp, stash);
    var inner = n.children.map(function (c) { return renderNode(c, ctx, true, stash); }).join('');
    return component(n.tag, n.attrs, inner, ctx);
  }

  /* ---------- public API ---------- */
  var CourseRenderer = {
    buildSlotMap: function (texts) {
      var map = {}, seq = 0;
      texts.forEach(function (t) {
        var re = /<AsyncImage\b([^>]*?)\/?>/g, m;
        while ((m = re.exec(t))) {
          var q = /query="([^"]*)"/.exec(m[1]);
          var r = /aspectRatio="([^"]*)"/.exec(m[1]);
          var key = (q ? q[1] : '') + '|' + (r ? r[1] : '16:9');
          if (!map[key]) map[key] = 'img-' + String(++seq).padStart(2, '0');
        }
      });
      return map;
    },
    render: function (text, opts) {
      opts = opts || {};
      var p = protect(text || '');
      var scope = buildScope(p.text);
      p.stash.svg = p.stash.svg.map(function (raw) { return normalizeSvg(raw, scope); });
      var expanded = expand(p.text, scope);
      var tree = parseTree(expanded);
      var ctx = { slotMap: opts.slotMap || {}, turnIndex: opts.turnIndex || 0 };
      var html = tree.children.map(function (c) { return renderNode(c, ctx, false, p.stash); }).join('');
      return html;
    },
    plainText: function (text) {
      return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\{@body[^}]*\}/g, ' ').replace(/\{#(if|each)[\s\S]*?\}/g, ' ')
        .replace(/\\\[|\\\]/g, ' ').replace(/\\[A-Za-z]+/g, ' ')
        .replace(/<\/?[A-Za-z][^>]*>/g, ' ').replace(/[{}]/g, ' ')
        .replace(/[*#|>`_]/g, ' ').replace(/\s+/g, ' ');
    }
  };

  window.CourseRenderer = CourseRenderer;
})();
