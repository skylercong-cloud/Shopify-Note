const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site');
const course=JSON.parse(fs.readFileSync(path.join(root,'content/course.json'),'utf8'));
assert.deepEqual(course.groups.map(g=>g.id),['0','1','2','3','4','5','6','reference']);
const ids=new Set(), counts={};
let imageLinks=0;
for(const lesson of course.lessons) {
  assert(!ids.has(lesson.id),`Duplicate ID: ${lesson.id}`); ids.add(lesson.id);
  assert(course.groups.some(g=>g.id===lesson.level),`Unknown group: ${lesson.id}`);
  const text=fs.readFileSync(path.join(root,lesson.file),'utf8');
  let fenced=false; const headings=[];
  for(const line of text.split('\n')) {
    if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;continue;}
    if(!fenced && /^#{1,6} /.test(line)) headings.push(line);
  }
  assert(!fenced,`Unclosed code fence: ${lesson.id}`);
  assert.equal(headings.filter(h=>/^# /.test(h)).length,1,`Invalid title hierarchy: ${lesson.id}`);
  assert(!headings.some(h=>/^#{1,6} .*?(?:Part \d|第 \d+ 课|\d+\.\d+)/.test(h)),`Stale numbering: ${lesson.id}`);
  assert(text.includes('本课目标'),`Missing goal: ${lesson.id}`);
  if(lesson.kind!=='reference') assert(text.includes('## 练习与验收'),`Missing exercise: ${lesson.id}`);
  for(const match of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    if(!/^https?:/.test(match[1])) assert(fs.existsSync(path.join(root,match[1])),`Missing image ${match[1]} in ${lesson.id}`);
    imageLinks++;
  }
  counts[lesson.level]=(counts[lesson.level]||0)+1;
}
for(const [level,count] of Object.entries(counts)) for(let i=1;i<=count;i++) assert(ids.has(`${level==='reference'?'ref':`l${level}`}-${String(i).padStart(2,'0')}`),`Gap in ${level}: ${i}`);
const skeleton=course.lessons.find(l=>l.title==='Variant Selector：骨架、初始化与排错');
assert(fs.readFileSync(path.join(root,skeleton.file),'utf8').includes('\nhandleOptionChange();'),'Variant skeleton must initialize first-render state');
console.log(JSON.stringify({pages:ids.size,mainLessons:course.lessons.filter(l=>l.kind!=='reference').length,imageLinks,groups:counts,integrity:'passed'},null,2));
