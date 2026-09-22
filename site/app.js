(() => {
  const article = document.querySelector('#article');
  const toc = document.querySelector('#toc');
  const search = document.querySelector('#search');
  const progressBar = document.querySelector('#progress-bar');
  const progressText = document.querySelector('#progress-text');
  const backtop = document.querySelector('#backtop');
  const slug = (text) => text.toLowerCase().trim().replace(/<[^>]*>/g,'').replace(/[^\u4e00-\u9fff\w\s-]/g,'').replace(/\s+/g,'-');
  const buildToc = () => {
    const headings = [...article.querySelectorAll('h1, h2')];
    const seen = new Map();
    headings.forEach((h) => { let id = slug(h.textContent) || 'section'; const n = seen.get(id) || 0; seen.set(id,n+1); if(n) id += `-${n+1}`; h.id=id; });
    toc.innerHTML = headings.map((h) => `<a class="level-${h.tagName.slice(1)}" href="#${h.id}">${h.textContent}</a>`).join('');
    const observer = new IntersectionObserver((entries) => entries.forEach(e => { if(e.isIntersecting){ document.querySelectorAll('#toc a').forEach(a=>a.classList.toggle('active',a.hash === '#'+e.target.id)); }}), {rootMargin:'-80px 0px -70%'});
    headings.forEach(h=>observer.observe(h));
  };
  const updateProgress = () => { const max=document.documentElement.scrollHeight-innerHeight; const pct=max>0?Math.round(scrollY/max*100):0; progressBar.style.width=`${pct}%`; progressText.textContent=`${pct}%`; backtop.classList.toggle('show',scrollY>500); };
  const load = async () => { try { const res=await fetch('content/tutorial.md'); if(!res.ok) throw new Error(`HTTP ${res.status}`); const md=await res.text(); article.innerHTML=marked.parse(md,{mangle:false,headerIds:false}); if(window.mermaid){mermaid.initialize({startOnLoad:false,theme:document.body.classList.contains('dark')?'dark':'neutral'}); const diagrams=[...article.querySelectorAll('pre code.language-mermaid')]; for(const code of diagrams){const source=code.textContent; const box=document.createElement('div'); box.className='mermaid'; box.textContent=source; code.parentElement.replaceWith(box); try { await mermaid.run({nodes:[box]}); } catch (diagramError) { const fallback=document.createElement('pre'); const fallbackCode=document.createElement('code'); fallbackCode.className='language-mermaid'; fallbackCode.textContent=source; fallback.appendChild(fallbackCode); box.replaceWith(fallback); } }} buildToc(); } catch (e) { article.innerHTML=`<div class="error"><h2>教程加载失败</h2><p>请通过本地静态服务器打开此网站（例如 <code>npx serve site</code>），或直接访问 GitHub Pages。</p><p>${e.message}</p></div>`; } };
  search.addEventListener('input', () => { const q=search.value.trim().toLowerCase(); document.querySelectorAll('#toc a').forEach(a=>a.hidden=!!q&&!a.textContent.toLowerCase().includes(q)); });
  document.querySelector('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('dark'); localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light');});
  if(localStorage.getItem('theme')==='dark') document.body.classList.add('dark');
  backtop.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'})); addEventListener('scroll',updateProgress,{passive:true}); load();
})();

