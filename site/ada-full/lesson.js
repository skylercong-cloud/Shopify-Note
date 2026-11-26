(() => {
  'use strict';
  const html = (value) => String(value ?? '').replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
  const attrs = (object) => Object.entries(object).filter(([,value]) => value !== undefined && value !== null && value !== false)
    .map(([key,value]) => ' ' + key + (value === true ? '' : '="' + html(value) + '"')).join('');
  const allowedLink = (href) => {
    try {
      const url = new URL(href);
      return ['https:','http:','mailto:'].includes(url.protocol) ? url.href : '';
    } catch {
      return typeof href === 'string' && href.startsWith('#') ? href : '';
    }
  };
  const colors = { surface:'var(--surface)', 'surface-secondary':'var(--surface)', 'surface-tertiary':'var(--accent-soft)', primary:'var(--accent)',secondary:'var(--muted)', success:'#257044',
    danger:'#ad3a37', warning:'#8b560c', info:'#285e94', default:'var(--ink)', muted:'var(--muted)', background:'var(--bg)' };
  const isColor = /^#[\da-f]{3,8}$|^rgba?\([\d.,% /]+\)$|^hsla?\([\d.,% /-]+\)$|^(?:white|black|transparent|currentColor)$/i;
  const color = val => colors[val] || (isColor.test(String(val)) ? val : undefined);
  const length = (val, unit = 'px') => typeof val === 'number' && Number.isFinite(val) ? val + unit :
    /^(?:\d*\.?\d+(?:px|rem|em|%|ch|vw|vh|fr)|0|auto|fit-content|max-content|min-content)$/.test(val) ? val : undefined;
  const scale = val => typeof val === 'number' ? val * 4 + 'px' : length(val) || ({xs:'4px',sm:'8px',md:'12px',lg:'16px',xl:'24px'})[val];
  const radii = { xs:'4px',sm:'5px',md:'8px',lg:'12px',xl:'16px',full:'999px',pill:'999px' };
  const fonts = { xs:'.75rem',sm:'.87rem',md:'1rem',lg:'1.15rem',xl:'1.33rem','2xl':'1.55rem' };
  const layoutTags = {box:'div',row:'div',card:'div',grid:'div','grid-item':'div',caption:'span',text:'span',title:'div',
    list:'ul','list-item':'li',table:'table','table-row':'tr','table-cell':'td',label:'label',progress:'progress',badge:'span',dialog:'div'};
  const blockTags = new Set(['box','row','card','grid','grid-item','list','list-item','table','table-row','table-cell','dialog']);
  const textTags = new Set(['text','caption','title','badge','label','button','pressable','checkbox','radio','option']);
  const svgAttrs = new Set(('viewBox xmlns id x y x1 x2 y1 y2 x2 y2 d points cx cy r rx ry width height fill fillOpacity fillRule clipRule stroke strokeWidth strokeLinecap strokeLinejoin strokeDasharray strokeOpacity opacity vectorEffect transform dominantBaseline textAnchor fontSize fontWeight fontFamily preserveAspectRatio clipPath gradientUnits gradientTransform offset stopColor stopOpacity role aria-label aria-hidden').split(' '));
  const renderer = new marked.Renderer();
  const tokenizer = new marked.Tokenizer();
  tokenizer.code = () => undefined;
  renderer.html = (source) => /^<!--ada-component-\d+-->$/.test(source.trim()) ? source : html(source);
  renderer.link = function(href, title, body) {
    const url = allowedLink(href);
    if (!url) return body;
    return '<a' + attrs({href:url,title,target:url.startsWith('#') ? undefined : '_blank',rel:'noopener noreferrer'}) + '>' + body + '</a>';
  };
  renderer.image = function(href, title, alt) {
    const url = allowedLink(href);
    return url ? renderer.link(url,title,html(alt || '原文图片')) : html(alt);
  };

  function style(name, p) {
    const rules = {};
    const set = (key, val) => { if (val !== undefined) rules[key]=val; };
    set('background-color', color(p.background));
    set('color', color(p.color));
    set('border-radius', radii[p.radius] ?? length(p.radius));
    set('gap', scale(p.gap));
    if (p.border) {
      const border = typeof p.border === 'object' ? p.border : {};
      rules.border = (length(border.size) || '1px') + ' solid ' + (color(border.color) || 'var(--line)');
    }
    if (p.padding && typeof p.padding === 'object') {
      for (const direction of ['top','bottom','left','right']) {
        set('padding-' + direction,scale(p.padding[direction] ?? p.padding[['top','bottom'].includes(direction) ? 'y':'x']));
      }
    } else set('padding', scale(p.padding));
    if (p.margin && typeof p.margin !== 'object') set('margin', scale(p.margin));
    for (const [prop, css] of [['width','width'],['height','height'],['minWidth','min-width'],['maxWidth','max-width'],['minHeight','min-height'],['maxHeight','max-height']]) {
      set(css, length(p[prop]));
    }
    if (p.size && !textTags.has(name) && length(p.size)) {
      set('width',length(p.size)); set('height',length(p.size));
    }
    if (Array.isArray(p.columns)) rules['grid-template-columns'] = p.columns.map(value => length(value,'fr') || '1fr').join(' ');
    else if (Number.isInteger(p.columns) && p.columns > 0 && p.columns <= 12) rules['--columns'] = p.columns;
    const align = {center:'center',start:'flex-start',end:'flex-end',stretch:'stretch',baseline:'baseline'};
    const justify = {...align, between:'space-between',around:'space-around',evenly:'space-evenly'};
    set('align-items',align[p.align]);
    set('justify-content',justify[p.justify]);
    if (['left','right','center','start','end'].includes(p.textAlign)) set('text-align',p.textAlign);
    if (p.wrap === true || p.wrap === 'wrap') rules['flex-wrap'] = 'wrap';
    if (p.direction === 'row' || p.direction === 'col') rules['flex-direction'] = p.direction === 'col' ? 'column' : 'row';
    if (p.flex === true || p.flex === 1) rules.flex = '1';
    if (typeof p.opacity === 'number' && p.opacity >= 0 && p.opacity <= 1) set('opacity',p.opacity);
    if (textTags.has(name)) {
      set('font-size',fonts[p.size] || length(p.fontSize ?? p.size));
      set('font-weight', {normal:400,medium:500,semibold:600,bold:700}[p.weight] || (/^[1-9]00$/.test(p.weight) ? p.weight : undefined));
      if (p.family === 'mono' || p.font === 'mono' || p.monospace) set('font-family','var(--mono)');
    }
    return Object.entries(rules).map(([name,val])=>name+':'+val).join(';') || undefined;
  }

  function markdown(items, inline = false, svg = false) {
    if (svg) return items.map(item => typeof item === 'string' ? html(item) : item.markup).join('');
    const rendered = [];
    const source = items.map(item => {
      if (typeof item === 'string') return item;
      if (inline || !item.block) {
        return '\uE010' + (rendered.push(item.markup) - 1) + '\uE011';
      }
      return '\n\n<!--ada-component-' + (rendered.push(item.markup) - 1) + '-->\n\n';
    }).join('');
    const options = { renderer, tokenizer };
    const parsed = inline ? marked.parseInline(source.trim(), options) : marked.parse(source.trim(), options);
    return parsed.replace(/<!--ada-component-(\d+)-->|\uE010(\d+)\uE011/g,
      (_, block, embedded) => rendered[block ?? embedded] ?? '');
  }

  function createRuntime(onUpdate) {
    const state = [];
    const handlers = [];
    let cursor = 0;
    let sources = [];
    let unitIndex = 0;
    const newPart = (markup, block = false) => ({markup,block});
    const element = (name, props, body='') => '<' + name + attrs(props) + '>' + body + '</' + name + '>';
    const d = {
      useState(initial) {
        const key = cursor++;
        if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial;
        return [state[key], update => {
          const next = typeof update === 'function' ? update(state[key]) : update;
          if (!Object.is(next,state[key])) { state[key] = next; onUpdate(); }
        }];
      },
    };
    function behavior(props, callbacks) {
      const events = Object.entries(callbacks).filter(([,v])=>typeof v === 'function');
      if (events.length) {
        props['data-event'] = handlers.push(Object.fromEntries(events)) - 1;
      }
      return props;
    }
    function optionList(options) {
      return Array.isArray(options) ? options.map(item => typeof item === 'object' ? item : {value:item,label:item}) : [];
    }
    function common(name,p) {
      const props = {class:'demo-' + name,style:style(name,p),title:typeof p.title === 'string' ? p.title : undefined};
      for (const key of ['id','role','for','hidden','disabled','tabindex','aria-label','aria-pressed','aria-expanded','aria-selected','aria-checked','aria-hidden','aria-controls','aria-live','aria-describedby']) {
        if (key in p) props[key] = key.startsWith('aria-') && typeof p[key] === 'boolean' ? String(p[key]) : p[key];
      }
      return props;
    }
    function tag(name,p,children,svg,block) {
      const props = common(name,p);
      // Source produces SVG geometry directly. Keep SVG text and attribute semantics.
      if (svg) {
        const names = {strokeWidth:'stroke-width',strokeLinecap:'stroke-linecap',strokeLinejoin:'stroke-linejoin',strokeDasharray:'stroke-dasharray',strokeOpacity:'stroke-opacity',fillOpacity:'fill-opacity',fillRule:'fill-rule',clipRule:'clip-rule',textAnchor:'text-anchor',dominantBaseline:'dominant-baseline',fontSize:'font-size',fontWeight:'font-weight',fontFamily:'font-family',stopColor:'stop-color',stopOpacity:'stop-opacity',clipPath:'clip-path',vectorEffect:'vector-effect'};
        const fields = Object.fromEntries(Object.entries(p).filter(([key])=>svgAttrs.has(key)).map(([key,val])=>[names[key] || key,val]));
        if (name === 'svg') {
          fields.class = 'demo-svg';
          fields.style = props.style;
          fields['aria-hidden'] = p['aria-label'] ? undefined : 'true';
        }
        return newPart(element(name,fields,markdown(children(),true,true)),block);
      }
      if (name === 'icon') {
        const markup = window.adaIcons[p.name] || '';
        const size = ({xs:'14px',sm:'16px',md:'20px',lg:'24px',xl:'30px'})[p.size] || length(p.size);
        return newPart(element('span',{class:'demo-icon','aria-hidden':'true',style:'--icon-size:'+(size || '1em')+';color:'+(color(p.color) || 'inherit')},markup));
      }
      if (name === 'AsyncImage') {
        const recovered = window.adaImages[p.query];
        if (!recovered) return newPart(element('span',{class:'demo-missing'},html(p.query)));
        const [file,alt] = recovered;
        return newPart('<img' + attrs({src:'../../assets/media/'+file,alt,class:'demo-photo',
          decoding:'async',style:[length(p.maxWidth) && 'max-width:'+length(p.maxWidth),
            ['cover','contain'].includes(p.fit) && 'object-fit:'+p.fit,
            /^\d+:\d+$/.test(p.aspectRatio) && 'aspect-ratio:'+p.aspectRatio.replace(':','/')].filter(Boolean).join(';')})+'>',block);
      }
      if (name === 'spacer') return newPart('<span class="demo-spacer" aria-hidden="true"></span>',block);
      if (name === 'divider') return newPart('<hr class="demo-divider">',true);
      if (name === 'Cite') {
        return sources.length ? newPart(element('a',{class:'demo-cite',href:'#sources-'+unitIndex,
          'aria-label':'查看这段回复的参考资料'},'↗ 参考资料')) : newPart('');
      }
      if (name === 'Entity') {
        return newPart(element('span',{class:'demo-badge',title:p.disambig},markdown(children(),true) || html(p.value || p.name || p.text || p.title || p.label)));
      }
      if (name === 'Chart') return newPart(chart(p.content || p),true);
      const items = children();
      const body = markdown(items,textTags.has(name));
      if (name === 'button' || name === 'pressable') {
        props.type = 'button';
        props['data-variant'] = typeof p.variant === 'string' ? p.variant : undefined;
        props['data-color'] = typeof p.color === 'string' ? p.color : undefined;
        const native = behavior(props,{click:p.onClick || p.onPress,keydown:p.onKeyDown,focus:p.onFocus,blur:p.onBlur});
        return newPart(element('button',native,body));
      }
      if (name === 'input' || name === 'textarea' || name === 'slider') {
        props.type = name === 'slider' ? 'range' : ['text','email','number','color','password','search','url','tel','checkbox','range'].includes(p.type) ? p.type : 'text';
        for (const key of ['value','placeholder','min','max','step','checked','required','name']) if (key in p) props[key]=p[key];
        props['aria-label'] ||= p.label || p.placeholder || (name === 'slider' ? '调整示例数值' : '示例输入');
        const input = behavior(props,{keydown:p.onKeyDown, input:p.onInput || (typeof p.onChange === 'function' ?
          event => p.onChange(props.type === 'range' || props.type === 'number' ? +event.target.value : event.target.value) : undefined),
          focus:p.onFocus,blur:p.onBlur});
        if (name === 'textarea') {
          delete input.type; delete input.value;
          return newPart(element('textarea', input,html(p.value) || body));
        }
        return newPart('<input' + attrs(input) + '>');
      }
      if (name === 'checkbox' || name === 'radio') {
        const input = behavior({type:name,value:p.value,checked:p.checked,disabled:p.disabled,
          'data-radio':name === 'radio' ? '' : undefined,'aria-label':body && body.trim() ? undefined : p.label || '示例选项'},
          {change:typeof p.onChange === 'function' ? event=>p.onChange(event.target.checked) : undefined});
        return newPart(element('label',props,'<input' + attrs(input) + '>' + body));
      }
      if (name === 'radio-group') {
        props.role='radiogroup';
        props['aria-label']=p.label || '示例选项组';
        return newPart(element('div',behavior(props,{change:typeof p.onChange === 'function' ? e=>p.onChange(e.target.value) : undefined}),
          body.replace(/data-radio=""/g, 'name="radios-' + handlers.length + '"').replace(/(type="radio" value="([^"]*)")/g,
            (_, value, id)=>value+(id===html(p.value) ? ' checked':''))),true);
      }
      if (name === 'select' || name === 'segmented-control') {
        const options = optionList(p.options);
        if (name === 'select') {
          props['aria-label'] ||= p.label || '选择示例状态';
          const optionHtml=options.map(item=>element('option',{value:item.value,selected:item.value===p.value},html(item.label))).join('');
          return newPart(element('select',behavior(props,{change:typeof p.onChange === 'function' ? e=>p.onChange(e.target.value) : undefined}),optionHtml || body));
        }
        const buttons = options.map(item => element('button',behavior({type:'button','aria-pressed':String(item.value === p.value)},
          {click:typeof p.onChange === 'function' ? ()=>p.onChange(item.value) : undefined}),html(item.label))).join('');
        return newPart(element('div',{...props,role:'group','aria-label':p.label || '切换示例状态'},buttons),true);
      }
      if (name === 'option') return newPart(element('option',{value:p.value, selected:p.selected},body));
      const actual = layoutTags[name];
      if (!actual) return newPart(body,block);
      if (name === 'table-cell' && (p.header || p.as === 'th')) return newPart(element('th',{...props,scope:'col'},body),block);
      if (name === 'table') return newPart('<div class="demo-table-wrap">' + element('table',props,body) + '</div>',true);
      if (name === 'dialog') {
        props.role ||= 'dialog';
        if ('open' in p && !p.open) props.hidden = true;
      }
      if (name === 'progress') { props.value=p.value; props.max=p.max; }
      return newPart(element(actual,props,body),block && blockTags.has(name));
    }
    function chart(p) {
      const data = Array.isArray(p.data) ? p.data : [];
      const series = Array.isArray(p.series) ? p.series : [];
      if (!data.length || !series.length) return '';
      const highest = Math.max(1,...data.flatMap(row=>series.map(s=>Number(row[s.dataKey]) || 0)));
      const palette = ['#237c74','#78558b','#ab581f'];
      const values = series.map(s=>data.map(row=>Number(row[s.dataKey]) || 0));
      const x = index=>44+(index+.5)*530/data.length;
      const y = value=>200-160*value/highest;
      const plot = values.map((nums,i)=>{
        const fill=palette[i%palette.length];
        if(p.chartType === 'line') {
          const points=nums.map((value,j)=>x(j)+','+y(value)).join(' ');
          return '<polyline points="'+html(points)+'" fill="none" stroke="'+fill+'" stroke-width="3"/>'+
            nums.map((value,j)=>'<circle cx="'+x(j)+'" cy="'+y(value)+'" r="4" fill="'+fill+'"/>').join('');
        }
        const w=Math.min(40,440/(data.length*series.length));
        return nums.map((value,j)=>'<rect x="'+(x(j)+(i-series.length/2)*w)+'" y="'+y(value)+'" width="'+(w-2)+'" height="'+(200-y(value))+'" rx="3" fill="'+fill+'"/>').join('');
      }).join('');
      const labels = data.map((row,i)=>'<text x="'+x(i)+'" y="222" text-anchor="middle" font-size="12" fill="currentColor">'+html(row[p.xKey])+'</text>').join('');
      const rows = data.map(row=>'<tr><th scope="row">'+html(row[p.xKey])+'</th>'+series.map(s=>'<td>'+html(row[s.dataKey])+'</td>').join('')+'</tr>').join('');
      const head = series.map(s=>'<th scope="col">'+html(s.label || s.dataKey)+'</th>').join('');
      return '<figure class="demo-chart"><svg aria-hidden="true" viewBox="0 0 600 235" class="demo-svg">'+
        '<path d="M44 35V200H574" fill="none" stroke="currentColor" opacity=".35"/>'+plot+labels+'</svg>'+
        '<div class="demo-table-wrap"><table><thead><tr><th scope="col">分类</th>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div></figure>';
    }
    return {
      d, handlers, tag,
      reset(){cursor=0;handlers.length=0;},
      setup(unit,idx){sources=unit.sources;unitIndex=idx;},
      value:value=>newPart(html(value)),
      spacing: (enabled,clipped) => newPart(
        '<div class="demo-spacing"><div aria-label="文字间距布局测试" class="demo-spacing-sample'+
        (enabled?' increased':'')+(clipped?' clipped':'')+'"><strong>订单配送说明</strong><p>订单将在 2–4 个工作日内发出。节假日及偏远地区可能需要额外配送时间。</p><p>如需修改地址，请联系客户支持。</p></div></div>',true),
    };
  }

  function citations(entries, idx) {
    if (!entries.length) return '';
    const links = [...new Map(entries.map(item=>[item.url,item])).values()].map(({url,title}) =>
      '<li><a href="'+html(allowedLink(url))+'" target="_blank" rel="noopener noreferrer">'+html(title || url)+'</a></li>').join('');
    return '<details class="demo-sources" id="sources-'+idx+'"><summary>本段参考资料</summary><ul>'+links+'</ul></details>';
  }

  window.AdaCourse = { start(id,title,units) {
    const root = document.getElementById('lesson');
    if (self.origin !== 'null' || parent === self) {
      root.innerHTML='<p><a href="../../?lesson='+html(id)+'">在课程阅读器中打开本课</a></p>';
      return;
    }
    const channel = new URLSearchParams(location.search).get('channel');
    let scheduled = false;
    let changing = false;
    function send(payload) {
      if (channel && parent !== window) parent.postMessage({adaLesson:id,channel,...payload},'*');
    }
    function dimensions() {
      send({height:Math.ceil(root.getBoundingClientRect().bottom + 6)});
    }
    const R = createRuntime(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(()=>{scheduled=false;render(true);});
    });
    function render(restoreFocus = false) {
      const active = document.activeElement;
      const eventId = active?.dataset.event;
      const selection = active && ['INPUT','TEXTAREA'].includes(active.tagName) && active.selectionStart !== null ?
        [active.selectionStart,active.selectionEnd] : null;
      const openSources = [...root.querySelectorAll('.demo-sources[open]')].map(elem=>elem.id);
      const parts = [];
      R.reset();
      for (const [idx,unit] of units.entries()) {
        R.setup(unit,idx);
        try {
          let part = markdown(unit.render(R,R.d));
          if (part.includes('class="demo-cite"')) part += citations(unit.sources,idx);
          parts.push(part);
        } catch (error) {
          console.error('ADA lesson rendering failed',id,idx,error);
          parts.push('<p>这段课程的富文本加载失败。<a href="../../content/lessons/'+html(id)+'.txt" target="_blank" rel="noopener">查看课程原文</a></p>');
        }
      }
      changing=true;
      root.innerHTML = parts.join('\n');
      if (!root.querySelector('h1')) root.insertAdjacentHTML('afterbegin','<h1>'+html(title)+'</h1>');
      for (const [index,heading] of [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].entries()) {
        heading.id = 'section-' + (index + 1);
        if (heading.tagName === 'H1' && index > 0) {
          const replacement = document.createElement('h2');
          replacement.innerHTML=heading.innerHTML;
          replacement.id=heading.id;
          heading.replaceWith(replacement);
        }
      }
      for (const table of root.querySelectorAll('table')) {
        if (table.parentElement.classList.contains('demo-table-wrap')) continue;
        const wrapper=document.createElement('div');
        wrapper.className='demo-table-wrap';
        table.before(wrapper);
        wrapper.append(table);
      }
      for (const sourceId of openSources) document.getElementById(sourceId)?.setAttribute('open','');
      if (restoreFocus && eventId !== undefined) {
        const focus = root.querySelector('[data-event="'+eventId+'"]');
        focus?.focus({preventScroll:true});
        if (selection && focus?.setSelectionRange && focus.selectionStart !== null) focus.setSelectionRange(...selection);
      }
      changing=false;
      dimensions();
    }
    function eventHandler(event) {
      if (changing) return;
      for (const element of event.composedPath()) {
        const key = element?.dataset?.event;
        if (key === undefined) continue;
        try {
          R.handlers[key]?.[event.type]?.(event);
        } catch (error) {
          console.error('ADA demo interaction failed',id,event.type,error);
        }
        if (event.cancelBubble) break;
      }
    }
    for (const event of ['click','input','change','keydown','focus','blur']) root.addEventListener(event,eventHandler,event==='focus'||event==='blur');
    root.addEventListener('click', (event) => {
      const link=event.target.closest('.demo-cite');
      if (!link) return;
      event.preventDefault();
      const source=document.getElementById(link.hash.slice(1));
      if (source) {source.open=true;source.scrollIntoView({block:'start'});source.querySelector('summary')?.focus();}
    });
    addEventListener('message',event=>{
      if (event.source !== parent || event.data?.channel !== channel) return;
      if ('dark' in event.data) document.documentElement.classList.toggle('dark',Boolean(event.data.dark));
      if (/^section-\d+$/.test(event.data.section)) {
        const heading=document.getElementById(event.data.section);
        if (heading) send({offset:heading.getBoundingClientRect().top});
      }
    });
    render();
    send({ headings:[...root.querySelectorAll('h2,h3')].map(node=>({id:node.id,title:node.textContent,depth:+node.tagName.slice(1)})) });
    new ResizeObserver(dimensions).observe(root);
  }};
})();
