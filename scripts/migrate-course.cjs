// One-time, repeatable migration. The original remains the source of this migration.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const archive = path.join(root, 'archive/tutorial-2026-09.md');
fs.mkdirSync(path.dirname(archive), { recursive: true });
if (!fs.existsSync(archive)) fs.copyFileSync(path.join(root, 'site/content/tutorial.md'), archive);
const lines = fs.readFileSync(archive, 'utf8').replace(/\r/g, '').split('\n');
const slice = (start, end) => lines.slice(start - 1, end - 1).join('\n').trim();
const groups = [
  ['0', '认识 Shopify', '理解平台、后台、店面与数据的关系。'],
  ['1', 'Theme 开发基础', '准备环境，理解渲染与配置，走通开发和发布流程。'],
  ['2', 'Shopify 前端开发', '从商品选择到购物车，再到搜索、性能与完整项目。'],
  ['3', 'Shopify 数据模型', '理解对象关系、自定义数据与交易生命周期。'],
  ['4', 'Shopify App 开发', '理解应用、认证、后台 API、事件同步与扩展边界。'],
  ['5', 'Headless Shopify', '理解自定义店面与 Shopify 商业能力的连接。'],
  ['6', '企业级 Shopify', '理解市场、价格、企业扩展与系统架构。'],
  ['reference', '开发参考', '需要时查阅，不作为重复的必读课程。']
].map(([id, title, description]) => ({ id, title, description }));
// [level, title, start, end, goal, exercise, kind]
const specs = [
 ['0','平台全局地图',98,215,'分清 Store、Theme、App、Admin 与 Storefront。','把“运营修改商品价”“前端修改按钮”“订单同步 ERP”分别放到正确层级。'],
 ['1','Theme 结构与 Liquid 渲染',215,611,'解释 Layout、Template、Section、Block、Snippet 和 Assets 的职责。','在你的主题中找到商品页模板、主 Section 和价格 Snippet，画出调用关系。'],
 ['2','Product、Option 与 Variant 基础',611,988,'理解商品、选项维度与实际可购买规格。','画出两个 Option 的规格组合，找到 Product ID、Variant ID 和 SKU。'],
 ['2','Variant Selector：从选项找到规格',988,1484,'从服务端首屏逐步建立规格选择状态。','测试未选完整、不存在的组合和售罄规格，记录按钮状态的区别。'],
 ['2','Variant Selector：同步 UI、URL 与媒体',1484,1876,'将规格状态同步到商品页相关组件。','切换规格，核对隐藏 ID、价格、媒体、可售状态和 URL。'],
 ['2','Variant Selector：骨架、初始化与排错',1876,2137,'理解代码骨架的适用范围并补上首次状态同步。','使用两个 Option、一个售罄组合测试首次加载、切换、隐藏 ID 与按钮状态。'],
 ['1','Metafield 入门：给商品补充字段',2137,2449,'给已有商品资源增加有类型的自定义字段。','创建材质字段，为两个商品设置不同值，在页面验证空值和有值的表现。'],
 ['2','加购：从 Variant ID 到真实 Cart',6079,6542,'解释表单、异步请求、loading 与错误反馈。','模拟售罄、断网和连续点击，确认失败提示可见且按钮可以恢复。'],
 ['2','Cart Drawer 与 Section Rendering',6542,6859,'分清购物车数据、服务端 HTML 与抽屉交互。','记录真实 section ID，测试打开、关闭、Escape、焦点返回和加购后金额更新。'],
 ['2','Cart API 与购物车行操作',6859,7005,'区分 add、change、update、clear 与 line key。','把同一 Variant 以不同 properties 加入两行，只修改其中一行数量。'],
 ['2','活动价与可信业务规则',7005,7120,'分清展示价格、活动来源和实际折扣执行。','尝试修改浏览器中的活动参数，解释为什么它不能成为折扣授权依据。'],
 ['2','Collection 与商品卡片',7120,7261,'理解商品集合、卡片复用和分页。','让一个商品属于两个集合，验证两个集合都能展示它，并测试下一页。'],
 ['2','Product Media 与 Gallery',7261,7383,'按媒体类型渲染，并同步 Variant 关联媒体。','测试图片、视频、无关联媒体以及切换规格后的首屏主图。'],
 ['2','Search：完整搜索页面',7383,7499,'把搜索词、结果类型和分页表达在 URL 中。','分别搜索商品与文章，测试空关键词和无结果页面。'],
 ['2','Predictive Search：防抖与竞态',7499,7661,'解释 debounce、AbortController 与键盘体验。','在慢网下快速输入并清空，确认旧结果不会覆盖最新状态。'],
 ['2','Collection Filtering',7661,7824,'理解 Filter 配置、类型与组合逻辑。','配置颜色与材质筛选，验证同组多选和跨组组合，并清空全部条件。'],
 ['2','排序、分页、URL 与局部更新',7824,8028,'让 URL 成为可分享、可回退的列表状态。','筛选后排序，再前进/后退和刷新，核对控件、结果与 URL 是否一致。'],
 ['2','Theme SEO',8028,8155,'理解标题、Canonical、结构化数据与页面语义。','查看页面源代码中的 title、h1、canonical 与 JSON-LD，检查它们是否描述同一商品。'],
 ['2','Theme 性能',8155,8309,'根据 LCP、CLS、INP 找到实际瓶颈。','记录一次性能基线，只优化一个瓶颈后复测，并说明测量环境。'],
 ['3','Product / Variant 的身份与关系',8309,8394,'区分 Product ID、Variant ID 和 SKU。','画出一个两种颜色、三种尺码商品的对象关系，说明加购传哪一个 ID。'],
 ['3','Collection 数据模型',8394,8455,'理解集合关系与人工排序的作用。','设计“新品”和“活动精选”两个集合，说明成员与排序分别由谁控制。'],
 ['3','Inventory / Location',8455,8571,'理解库存商品、地点和库存关系。','画出两个仓库、一个 Variant 的库存关系，解释 available 为什么不是现货数字。'],
 ['3','Cart / Checkout / Order 生命周期',8571,8658,'理解购买意图、交易确认和购买结果。','列出从选择规格到生成订单的各阶段，标出行项目身份发生变化的位置。'],
 ['3','Metafield 的建模与类型',8658,8845,'区分 Definition、Value、Owner、Namespace、Key 和 Type。','为商品设计产地、材质与护理说明字段，并解释各自类型选择。'],
 ['3','Metaobject、动态来源与完整建模',5549,5749,'把结构化的可复用内容建模为对象。','把多个商品复用的设计师介绍建模成 Metaobject，并说明引用关系。'],
 ['3','Customer、订单与履约',5307,5405,'分清顾客资料、账户、订单、交易和履约。','用一次部分退款、分批发货的案例说明这些资源为什么不能合为一个状态。'],
 ['4','App 架构与认证',9762,10265,'理解 Embedded UI、后端、令牌和权限的边界。','画出安装、进入嵌入页和调用 Admin API 的链路，标出令牌保存位置。'],
 ['4','Admin GraphQL API',10265,10888,'理解 Query、Mutation、GID、分页和成本。','写出商品列表分页查询的设计，区分 HTTP 错误、GraphQL errors 与 userErrors。'],
 ['4','Webhooks 与事件驱动同步',10888,11340,'理解验签、幂等、队列和最终一致性。','设计同一事件重复投递三次的处理方式，说明何时返回响应、何时执行同步。'],
 ['4','Shopify Functions',11340,11809,'理解 Shopify 内部执行逻辑与 App 后端的区别。','列出函数输入、输出、适用目标和计划限制，解释为什么不能信任浏览器价格。'],
 ['2','完整 Theme 的职责划分与重构',11809,12264,'按服务端渲染、组件、浏览器状态与平台能力分层。','选择商品页模块，写出文件职责、组件生命周期和一次局部更新的调用链。'],
 ['5','Headless、Storefront API 与 Hydrogen',12264,12643,'理解自定义店面如何连接 Shopify 商业能力。','对比 Theme 与 Headless 的路由、数据加载、购物车和部署职责，评估迁移成本。'],
 ['6','Markets、价格与 Discount 数据模型',8913,9762,'区分基础价格、市场上下文、展示价和实际折扣。','选择两个市场，画出价格解析过程，记录货币、税费与折扣的验证位置。'],
 ['6','Plus、企业扩展与架构决策',12643,12948,'按能力边界评估 Checkout、B2B 与外部系统集成。','为 ERP 库存同步设计数据所有权、重试、幂等和对账流程。'],
 ['reference','核心对象与后台入口速查',5749,5867,'快速定位对象入口与获取方式。','遇到具体问题时查阅。','reference'],
 ['reference','技术选型决策表',5867,5908,'比较相邻概念与实现位置。','用一个实际需求说明选择依据。','reference'],
 ['reference','商品页集成示意',5908,6073,'理解知识如何组合；代码是示意，需要适配主题。','对照你的主题验证 section ID 与 DOM 替换位置。','reference'],
 ['reference','Theme / App / Function / Headless 职责表',13031,13069,'查阅不同实现层的职责边界。','结合技术选型决策表使用。','reference'],
 ['reference','Shopify 官方文档索引',13069,13168,'查阅各主题的官方定义。','版本与能力变化以官方资料为准。','reference']
];
const lessons = [];
const counts = {};
const clean = (source) => {
 let fenced = false;
 return source.split('\n').map(line => {
   if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
   if (fenced) return line;
   if (/^#{1,6} /.test(line)) return line.replace(/^(#{1,6})\s+(?:(?:第\s*\d+(?:[–—-]\d+)?\s*课|Part\s+\d+)\s*[：:]\s*|\d+(?:\.\d+)*\s+)/, '$1 ').replace(/第\s*\d+\s*课[：:]\s*/g,'').replace(/^# /, '## ');
   return line.replace(/这一 Part/g, '本课').replace(/前面的 Part 0–16/g, '前面的基础课程').replace(/第\s*29\s*课/g,'Markets 与价格课程');
 }).join('\n');
};
function add(level, title, body, goal, exercise, kind='lesson', source=null) {
 const num = counts[level] = (counts[level] || 0) + 1;
 const id = level === 'reference' ? `ref-${String(num).padStart(2,'0')}` : `l${level}-${String(num).padStart(2,'0')}`;
 const label = level === 'reference' ? `参考 ${num}` : `L${level}-${String(num).padStart(2,'0')}`;
 const file = `content/lessons/${id}.md`;
 const text = `# ${label} ${title}\n\n> **本课目标：** ${goal}\n\n${body.trim()}\n\n---\n\n## ${kind==='reference'?'使用提示':'练习与验收'}\n\n${exercise}\n\n${kind==='reference'?'':'验收时记录：操作步骤、预期结果、实际结果，以及出现问题时检查的数据和文件。不要只以“页面看起来正常”作为通过依据。\n'}`;
 fs.writeFileSync(path.join(root,'site',file), text);
 const oldTitle = source ? lines[source.start-1].replace(/^#+\s*/, '') : '';
 const legacy = oldTitle.toLowerCase().trim().replace(/<[^>]*>/g,'').replace(/[^\u4e00-\u9fff\w\s-]/g,'').replace(/\s+/g,'-');
 lessons.push({id,label,level,title,goal,file,kind,source,legacy});
}
fs.mkdirSync(path.join(root,'site/content/lessons'),{recursive:true});
// New foundations are inserted at deliberate points rather than appended after advanced topics.
const additions = require('./new-lessons.cjs');
add('0', additions.platform.title, additions.platform.body, additions.platform.goal, additions.platform.exercise);
for(const [level,title,start,end,goal,exercise,kind] of specs) {
 if(level==='1' && start===215) {
   const a=additions.workflow; add('1',a.title,a.body,a.goal,a.exercise);
 }
 let body=clean(slice(start,end).replace(/^# .*\n/,''));
 if(start===1876) {
   body=body.replace("input.addEventListener('change', handleOptionChange);\n  });", "input.addEventListener('change', handleOptionChange);\n  });\n\n// 首屏也需要将服务端已经选中的选项同步到 JS 状态。\nhandleOptionChange();");
   body='> 本课示例面向单个、规格规模较小的商品组件。它不包含价格、媒体与完整加购；后续购买链路课程继续补充。多实例与高规格商品不能直接照搬。\n\n'+body;
 }
 if(start===5908) body='> 集成示意：以下硬编码 section ID 与 DOM 替换方式需要按实际 Theme 适配，不应直接作为通用生产实现。\n\n'+body;
 add(level,title,body,goal,exercise,kind,{start,end:end-1});
 if(start===215) { const a=additions.editor; add('1',a.title,a.body,a.goal,a.exercise); }
 if(start===11809) { const a=additions.project; add('2',a.title,a.body,a.goal,a.exercise); }
}
// Keep secondary details from the old reference chapters available without a second required course.
for (const [title,start,end] of [
 ['Cart 与 Checkout 补充参考',2449,2942],['活动价与折扣补充参考',2942,3153],
 ['Collection 实现补充参考',3153,3416],['Product Media 补充参考',3416,3561],
 ['Search API 补充参考',3561,3769],['Filter / Sort API 补充参考',3769,4306],
 ['SEO 排查与标签参考',4306,4549],['性能排查参考',4549,4860],
 ['商品与库存属性参考',4860,5307],['自定义数据补充参考',5405,5549]
]) add('reference',title,clean(slice(start,end).replace(/^# .*\n/,'')),'按需查询属性、接口和原始案例。','此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。','reference',{start,end:end-1});
const sort = new Map(groups.map((g,i)=>[g.id,i]));
lessons.sort((a,b)=>sort.get(a.level)-sort.get(b.level)||a.id.localeCompare(b.id));
fs.writeFileSync(path.join(root,'site/content/course.json'),JSON.stringify({version:'2026-10-08',groups,lessons},null,2));
fs.writeFileSync(path.join(root,'site/content/tutorial.md'),'# 教程已按 Level 0–6 重整\n\n请从网站首页进入学习路线。课程源文件位于 `site/content/lessons/`，目录位于 `site/content/course.json`。\n\n旧稿完整保存在仓库的 `archive/tutorial-2026-09.md`，用于核对与追溯。\n');
fs.writeFileSync(path.join(root,'COURSE-MIGRATION.md'), '# 课程迁移记录\n\n原稿：`archive/tutorial-2026-09.md`，保留用于核对。主线采用 Level 0–6，旧 Part 17 已按主题并入主线；旧参考章节放入“开发参考”，不计入主线学习顺序。\n\n| 新课 | 标题 | 旧稿行号 |\n| --- | --- | --- |\n'+lessons.map(l=>`| ${l.label} | ${l.title} | ${l.source?`${l.source.start}–${l.source.end}`:'新增'} |`).join('\n')+'\n\n高级课程保留概念与工程案例定位，尚不等同于完整 App / Headless 可运行工程。\n');
console.log(`Generated ${lessons.length} pages (${lessons.filter(l=>l.kind!=='reference').length} lessons).`);
