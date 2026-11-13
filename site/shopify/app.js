(() => {
  const article = document.querySelector('#article');
  const toc = document.querySelector('#toc');
  const search = document.querySelector('#search');
  const results = document.querySelector('#search-results');
  const pageToc = document.querySelector('#page-toc');
  const sidebar = document.querySelector('.sidebar');
  const menu = document.querySelector('#menu-toggle');
  const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const writeStorage = (key,value) => { try { localStorage.setItem(key,value); } catch {} };
  let completed;
  try { const saved=JSON.parse(readStorage('shopify-completed') || '[]'); completed=new Set(Array.isArray(saved)?saved:[]); } catch { completed=new Set(); }
  let course, current, renderVersion=0, observer, searchVersion=0;
  const cache = new Map();
  const slug = text => text.toLowerCase().trim().replace(/<[^>]*>/g,'').replace(/[^\u4e00-\u9fff\w\s-]/g,'').replace(/\s+/g,'-') || 'section';
  const node = (tag, text, className) => { const el=document.createElement(tag); if(text!==undefined) el.textContent=text; if(className) el.className=className; return el; };
  const href = (id,hash='') => `?lesson=${encodeURIComponent(id)}${hash}`;
  const link = (text,id,className) => { const el=node('a',text,className); el.href=href(id); return el; };
  const content = lesson => {
    if(!cache.has(lesson.id)) cache.set(lesson.id,fetch(lesson.file).then(res=>{ if(!res.ok) throw new Error(`无法加载 ${lesson.label}（HTTP ${res.status}）`); return res.text(); }).catch(err=>{cache.delete(lesson.id); throw err;}));
    return cache.get(lesson.id);
  };
  function updateCompletion() {
    const main=course.lessons.filter(l=>l.kind!=='reference');
    const count=main.filter(l=>completed.has(l.id)).length;
    document.querySelector('#progress-text').textContent=`${count}/${main.length}`;
    document.querySelector('#progress-bar').style.width=`${Math.round(count/main.length*100)}%`;
    toc.querySelectorAll('a[data-lesson]').forEach(a=>{
      const done=completed.has(a.dataset.lesson);
      a.classList.toggle('completed',done);
      a.setAttribute('aria-label',`${a.textContent}${done?'，已学完':''}`);
    });
  }
  function buildNav() {
    toc.replaceChildren();
    toc.append(link('学习路线', 'overview', 'overview-link'));
    for(const group of course.groups) {
      const details=node('details'); details.dataset.level=group.id;
      details.append(node('summary',group.id==='reference'?'开发参考':`Level ${group.id} · ${group.title}`));
      for(const lesson of course.lessons.filter(l=>l.level===group.id)) {
        const a=link(`${lesson.label} ${lesson.title}`,lesson.id);
        a.dataset.lesson=lesson.id; details.append(a);
      }
      toc.append(details);
    }
    updateCompletion();
  }
  function localToc() {
    observer?.disconnect();
    pageToc.replaceChildren(node('h2','本课目录'));
    const headings=[...article.querySelectorAll('h1,h2,h3')];
    const seen=new Map();
    headings.forEach(h=>{
      const base=slug(h.textContent), n=seen.get(base)||0; seen.set(base,n+1);
      h.id=n?`${base}-${n+1}`:base;
      if(h.tagName==='H1') return;
      const a=node('a',h.textContent,`level-${h.tagName.slice(1)}`);
      a.href=href(current.id,`#${encodeURIComponent(h.id)}`); pageToc.append(a);
    });
    observer=new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting) pageToc.querySelectorAll('a').forEach(a=>a.classList.toggle('active',decodeURIComponent(a.hash.slice(1))===entry.target.id));
    },{rootMargin:'-80px 0px -65%'});
    headings.forEach(h=>observer.observe(h));
  }
  function showOverview() {
    current={id:'overview'}; observer?.disconnect(); pageToc.replaceChildren();
    article.replaceChildren(node('p','面向有前端经验的 Shopify 初学者','eyebrow'),node('h1','Shopify 网站开发系统教程'),node('p','从认识平台开始，逐步掌握 Theme、前端交互、数据模型、App 与 Headless。按课程学习，需要时再查开发参考。','lead'));
    const notice=node('div',undefined,'course-note');
    notice.append(node('strong','如何使用'),node('p','每课先读目标，再理解原理和示例，最后完成练习。点击“标记已学完”记录进度，记录仅保存在当前浏览器。高级章节中的概念示例不等于已经运行验证的完整工程。'));
    article.append(notice);
    for(const g of course.groups) {
      const section=node('section',undefined,'level-card');
      section.append(node('h2',g.id==='reference'?'开发参考':`Level ${g.id} · ${g.title}`),node('p',g.description));
      const list=node('ol');
      for(const l of course.lessons.filter(l=>l.level===g.id)) { const li=node('li'); li.append(link(`${l.label} ${l.title}`,l.id)); list.append(li); }
      section.append(list); article.append(section);
    }
    article.append(node('p',`课程整理版本：${course.version}。开发参考保留较详细的属性和接口说明，与主线有概念交集，按需查阅即可。`,'muted'));
  }
  async function showRoute() {
    const version=++renderVersion;
    let id=new URL(location.href).searchParams.get('lesson');
    if(!id && location.hash) {
      let hash; try { hash=decodeURIComponent(location.hash.slice(1)); } catch { hash=''; }
      id=course.lessons.find(l=>l.legacy===hash)?.id;
      if(id) history.replaceState(null,'',href(id));
    }
    current=course.lessons.find(l=>l.id===id);
    const unknown=!!id&&id!=='overview'&&!current;
    document.querySelector('#lesson-footer').hidden=true;
    if(!current) {
      showOverview();
      if(unknown) article.prepend(node('p','该课程链接不存在，下面是完整学习路线。','course-note'));
      document.title='学习路线 · Shopify Dev Notes';
    } else {
      const lesson=current;
      article.replaceChildren(node('p','正在加载课程…','loading'));
      try {
        const md=await content(lesson);
        if(version!==renderVersion) return;
        article.innerHTML=marked.parse(md,{mangle:false,headerIds:false});
        document.title=`${lesson.label} ${lesson.title} · Shopify Dev Notes`;
        localToc();
        for(const code of article.querySelectorAll('pre code.language-mermaid')) {
          if(version!==renderVersion) return;
          try {
            const {svg}=await mermaid.render(`diagram-${version}-${Math.random().toString(36).slice(2)}`,code.textContent);
            if(version!==renderVersion) return;
            const box=node('div',undefined,'mermaid'); box.innerHTML=svg; code.parentElement.replaceWith(box);
          } catch { code.parentElement.prepend(node('p','图示未能渲染，以下保留流程源码。','muted')); }
        }
        if(version!==renderVersion) return;
        setupFooter(lesson);
      } catch(err) {
        if(version!==renderVersion) return;
        article.replaceChildren(node('h1','课程加载失败'),node('p',err.message),link('返回学习路线','overview'));
        pageToc.replaceChildren();
      }
    }
    toc.querySelectorAll('a').forEach(a=>{
      const active=new URL(a.href).searchParams.get('lesson')===current.id;
      a.classList.toggle('active',active);
      if(active) { a.setAttribute('aria-current','page'); if(a.parentElement.tagName==='DETAILS') a.parentElement.open=true; }
      else a.removeAttribute('aria-current');
    });
    closeMenu();
    article.setAttribute('tabindex','-1');
    article.focus({preventScroll:true});
    if(location.hash) { try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch {} }
    else scrollTo(0,0);
  }
  function setupFooter(lesson) {
    const footer=document.querySelector('#lesson-footer'); footer.replaceChildren(); footer.hidden=false;
    if(lesson.kind!=='reference') {
      const done=node('button',completed.has(lesson.id)?'已学完 · 取消标记':'标记已学完','complete-button'); done.type='button';
      done.setAttribute('aria-pressed',String(completed.has(lesson.id)));
      done.addEventListener('click',()=>{
        if(completed.has(lesson.id)) completed.delete(lesson.id); else completed.add(lesson.id);
        writeStorage('shopify-completed',JSON.stringify([...completed])); updateCompletion(); setupFooter(lesson);
      }); footer.append(done);
    }
    const sequence=course.lessons.filter(l=>(l.kind==='reference')===(lesson.kind==='reference'));
    const index=sequence.findIndex(l=>l.id===lesson.id), nav=node('nav',undefined,'lesson-pager'); nav.setAttribute('aria-label','前后课导航');
    if(index>0) nav.append(link(`← ${sequence[index-1].title}`,sequence[index-1].id));
    if(index<sequence.length-1) nav.append(link(`${sequence[index+1].title} →`,sequence[index+1].id));
    footer.append(nav);
  }
  function closeMenu() { sidebar.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); }
  menu.addEventListener('click',()=>{ const open=sidebar.classList.toggle('is-open'); menu.setAttribute('aria-expanded',String(open)); });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('is-open')) {closeMenu();menu.focus();}});
  search.addEventListener('input',async()=>{
    const version=++searchVersion, q=search.value.trim().toLocaleLowerCase(); results.replaceChildren();
    if(!q || !course) { results.hidden=true; toc.hidden=false; return; }
    results.hidden=false; toc.hidden=true; results.append(node('p','正在搜索全文…','muted'));
    const documents=await Promise.all(course.lessons.map(async l=>{try {return {l,text:await content(l)};} catch {return {l,text:null};}}));
    if(version!==searchVersion) return;
    results.replaceChildren();
    let count=0;
    for(const {l,text} of documents) {
      if(text===null || !(`${l.title}\n${text}`).toLocaleLowerCase().includes(q)) continue;
      const card=node('div',undefined,'search-result'); card.append(link(`${l.label} ${l.title}`,l.id));
      const pos=text.toLocaleLowerCase().indexOf(q);
      card.append(node('p',pos<0?l.goal:text.slice(Math.max(0,pos-40),pos+120).replace(/[#*`>]/g,''))); results.append(card); count++;
    }
    const failures=documents.filter(d=>d.text===null).length;
    results.prepend(node('p',`${count} 个结果${failures?`；${failures} 页暂时未能检索，可稍后重试`:''}`,'muted'));
  });
  document.addEventListener('click',e=>{
    const a=e.target.closest('a'); if(!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button!==0) return;
    const url=new URL(a.href);
    if(url.origin!==location.origin || url.pathname!==location.pathname || !url.searchParams.has('lesson')) return;
    e.preventDefault();
    if(url.search===location.search && url.hash) { history.pushState(null,'',url); try { document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView(); } catch {} closeMenu(); return; }
    history.pushState(null,'',url); showRoute();
  });
  addEventListener('popstate',()=>{if(course) showRoute();});
  document.querySelector('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('dark'); writeStorage('theme',document.body.classList.contains('dark')?'dark':'light');});
  if(readStorage('theme')==='dark') document.body.classList.add('dark');
  document.querySelector('#backtop').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  addEventListener('scroll',()=>document.querySelector('#backtop').classList.toggle('show',scrollY>500),{passive:true});
  (async()=>{
    try {
      const res=await fetch('content/course.json'); if(!res.ok) throw new Error(`HTTP ${res.status}`);
      course=await res.json();
      if(typeof marked==='undefined') throw new Error('Markdown 渲染资源未加载，请检查网络后刷新。');
      if(typeof mermaid!=='undefined') mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:document.body.classList.contains('dark')?'dark':'neutral'});
      buildNav(); await showRoute();
    } catch(err) { article.replaceChildren(node('h1','教程加载失败'),node('p',err.message),node('p','请通过静态服务器打开网站，并检查网络连接。')); }
  })();
})();
