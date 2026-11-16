// NextLab 复刻版 — 单页应用：路由、全局组件、运行逻辑
// 设计目标：按 2026-11-16 对 labs.openai-next.com 的公开盘点复刻页面结构、按钮与交互。
// API Key 只存 localStorage，只发往 api.openai-next.com，与原站说明一致。
const D = window.NL_DATA;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const modelById = id => D.models.find(m => m[0] === id);
const grad = n => `linear-gradient(135deg,hsl(${(n*47)%360} 45% 32%),hsl(${(n*47+70)%360} 55% 18%))`;
const store = {
  get k(){ return localStorage.getItem("nl_key") || ""; }, set k(v){ v ? localStorage.setItem("nl_key", v) : localStorage.removeItem("nl_key"); },
  get works(){ try { return JSON.parse(localStorage.getItem("nl_works") || "[]"); } catch { return []; } },
  set works(v){ localStorage.setItem("nl_works", JSON.stringify(v)); }
};
const maskKey = k => k ? k.slice(0,3) + "…" + k.slice(-4) : "API Key";
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
function copyText(t, msg="已复制"){ navigator.clipboard?.writeText(t).then(()=>toast(msg)); }

/* ---------- 全局组件 ---------- */
const NAV = [["工作台","#/play"],["画廊","#/gallery"],["范式","#/recipes"],["文档","#/docs"],["模型","#/models"],["更新","#/updates"],["编年史","#/chronicle"]];
function topbar(active){
  return `<header class="topbar"><a class="logo" href="#/">NextLabs</a>
  <nav class="topnav">${NAV.map(([t,h])=>`<a href="${h}" class="${active===t?"on":""}">${t}</a>`).join("")}</nav>
  <button class="btn-ghost" data-act="cmdk">搜索页面和模型 <span class="kbd">⌘K</span></button>
  <a href="https://github.com/xiaoqianran/NextLab" target="_blank" rel="noopener">GitHub</a>
  <button class="btn-ghost" data-act="lang">EN / Switch to English</button>
  <button class="btn-ghost" data-act="theme">${document.body.classList.contains("light")?"切换到深色":"切换到浅色"}</button>
  <button class="btn-ghost" data-act="account">账户</button></header>`;
}
function footer(){
  return `<footer class="site"><div class="foot-in">
  <div><div class="logo">NextLabs</div><p class="muted">OpenAI Next 上每个多模态模型的开放实验室。跑一跑，比一比，留下好用的。</p>
  <p><a class="pill" href="#/status"><span class="dot"></span>一切正常&nbsp;<span class="muted">api.openai-next.com 224 ms</span></a></p>
  <p class="muted small">© 2026 NextLabs · MIT 许可 · <a href="https://api.openai-next.com" target="_blank" rel="noopener">基于 OpenAI Next</a></p></div>
  <div><h4>工具</h4><a href="#/play">工作台</a><a href="#/compare">对比</a><a href="#/chat">对话</a><a href="#/agent">Agent</a><a href="#/draw">NextDraw</a></div>
  <div><h4>探索</h4><a href="#/gallery">画廊</a><a href="#/recipes">范式</a><a href="#/updates">模型更新</a><a href="#/chronicle">编年史</a></div>
  <div><h4>参考</h4><a href="#/docs">快速开始</a><a href="#/models">模型与接口</a><a href="#/errors">错误码</a><a href="#/status">状态</a></div>
  </div></footer>`;
}
const SIDE = [["工作台","#/play","G P"],["对比","#/compare","G C"],["对话","#/chat","G H"],["Agent","#/agent","G A"],["NextDraw","#/draw","G D"]];
function sidebar(active){
  return `<aside class="sidebar"><a class="logo" href="#/">NextLabs 首页</a>
  <div style="margin-top:14px">${SIDE.map(([t,h,k])=>`<a href="${h}" class="${active===t?"on":""}"><span>${t}</span><span class="kbd">${k}</span></a>`).join("")}</div>
  <h5>文档</h5><a href="#/docs" class="${active==="文档"?"on":""}">快速开始</a><a href="#/models">模型与接口</a><a href="#/status">状态</a>
  <h5>作品</h5><a href="#/works" class="${active==="我的作品"?"on":""}"><span>我的作品</span><span class="kbd">G W</span></a>
  <h5>账户</h5><a href="#/notifications">通知</a><a href="#/settings" class="${active==="设置"?"on":""}">设置</a><a href="#/u">我的主页</a>
  <div style="margin-top:22px"><button class="btn-ghost" data-act="collapse">收起 [</button> <button class="btn-ghost" data-act="account">账户</button></div></aside>`;
}
function shell(active, inner){ return `<div class="shell">${sidebar(active)}<div class="main">${inner}</div></div>`; }

/* ---------- 弹窗：命令菜单 / API Key / 账户 ---------- */
function openLayer(html){ $("#layer").innerHTML = `<div class="overlay" data-act="overlay">${html}</div>`; }
function closeLayer(){ $("#layer").innerHTML=""; }
function cmdK(){
  const pages = [["工作台","#/play"],["对比","#/compare"],["对话","#/chat"],["Agent","#/agent"],["NextDraw","#/draw"],["画廊","#/gallery"],["范式","#/recipes"],["快速开始","#/docs"],["接入地址与鉴权","#/docs/platforms"],["接入编程 Agent","#/docs/agents"],["异步任务","#/docs/tasks"],["输入文件","#/docs/files"],["模型与接口","#/models"],["模型更新","#/updates"],["编年史","#/chronicle"],["我的作品","#/works"],["通知","#/notifications"],["我的主页","#/u"],["设置","#/settings"],["错误码","#/errors"],["状态","#/status"]];
  openLayer(`<div class="modal wide"><input id="ckq" placeholder="找页面、模型，或者直接说想做什么" autocomplete="off">
  <div id="cklist" style="margin-top:12px"></div><p class="muted small">↑↓ 选择 · Enter 打开 · Esc 关闭</p></div>`);
  const render = q => {
    const pl = pages.filter(p=>p[0].includes(q)); const ml = D.models.filter(m=>m[1].toLowerCase().includes(q.toLowerCase())||m[0].includes(q.toLowerCase())).slice(0,12);
    $("#cklist").innerHTML =
      (pl.length?`<h5 class="muted">页面</h5>`+pl.map(p=>`<a class="modelitem" href="${p[1]}">${p[0]}</a>`).join(""):"") +
      (ml.length?`<h5 class="muted">模型（在工作台里打开）</h5>`+ml.map(m=>`<a class="modelitem" href="#/play?model=${m[0]}">${esc(m[1])} <span class="muted small">${esc(m[2])} · ${esc(m[3])}</span></a>`).join(""):"") +
      `<h5 class="muted">主题 / 语言</h5><button class="modelitem" data-act="theme">切换到深色 / 浅色 / 跟随系统</button><button class="modelitem" data-act="lang">简体中文 / English</button>`;
  };
  render(""); const inp=$("#ckq"); inp.focus(); inp.addEventListener("input",()=>render(inp.value.trim()));
}
function apiKeyModal(){
  const k = store.k;
  openLayer(`<div class="modal"><div class="row" style="justify-content:space-between"><h3 style="margin:0">你的 OpenAI Next API Key</h3><button class="btn-ghost" data-act="close">✕</button></div>
  <p class="muted">从 api.openai-next.com 获取的 API Key。它只保存在这个浏览器里，由 NextLabs 原样转发到那里——只转发，不保存、不记录。</p>
  <p><a href="https://api.openai-next.com" target="_blank" rel="noopener" style="color:var(--link)">获取 API Key</a></p>
  <input id="keyin" type="password" placeholder="${k?"已保存："+esc(maskKey(k))+"，粘贴新的即可替换":"粘贴你的 API Key"}" autocomplete="off">
  <div class="row" style="margin-top:14px">${k?`<button data-act="forgetkey">忘记 ${esc(maskKey(k))}</button>`:""}<button class="btn-primary" data-act="savekey">保存 API Key</button><button data-act="close">关闭</button></div></div>`);
}
function accountPop(){
  openLayer(`<div class="modal"><div class="row" style="justify-content:space-between"><h3 style="margin:0">本地账户</h3><button class="btn-ghost" data-act="close">✕</button></div>
  <p class="muted">复刻版不设登录：作品与设置只保存在这个浏览器里。</p>
  <p class="muted small">已存 ${Math.round((localStorage.getItem("nl_works")||"").length/102.4)/10} KB / 5 GB · 文件保留 24 小时</p>
  <a class="modelitem" href="#/notifications">通知</a><a class="modelitem" href="#/works">我的作品</a><a class="modelitem" href="#/u">我的主页</a><a class="modelitem" href="#/settings">设置</a>
  <div class="row" style="margin-top:12px"><button data-act="close">关闭</button></div></div>`);
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if(!el) return; const act = el.dataset.act;
  if(act==="cmdk") cmdK();
  if(act==="close") closeLayer();
  if(act==="overlay" && e.target===el) closeLayer();
  if(act==="theme"){ document.body.classList.toggle("light"); localStorage.setItem("nl_theme", document.body.classList.contains("light")?"light":"dark"); closeLayer(); render(); }
  if(act==="lang") toast("English 界面为占位：复刻版以简体中文为主");
  if(act==="account") accountPop();
  if(act==="apikey") apiKeyModal();
  if(act==="collapse") toast("侧栏收起为占位交互");
  if(act==="savekey"){ const v=$("#keyin").value.trim(); if(!v){ toast("先粘贴 API Key"); return; } store.k=v; closeLayer(); toast("API Key 已保存在本浏览器"); render(); }
  if(act==="forgetkey"){ store.k=""; closeLayer(); toast("已忘记 API Key"); render(); }
});
document.addEventListener("keydown", e => {
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); cmdK(); }
  if(e.key==="Escape") closeLayer();
  if(e.key==="Enter" && (e.metaKey||e.ctrlKey)){ const b=$("#runbtn"); if(b && !b.disabled) b.click(); }
  if(e.target.matches("input,textarea,select")) return;
  if(lastG && Date.now()-lastG<900){ const map={p:"#/play",c:"#/compare",h:"#/chat",a:"#/agent",d:"#/draw",w:"#/works"}; const h=map[e.key.toLowerCase()]; if(h){ location.hash=h; } lastG=0; }
  else if(e.key.toLowerCase()==="g") lastG=Date.now();
});
let lastG = 0;
if(localStorage.getItem("nl_theme")==="light") document.body.classList.add("light");

/* ---------- 首页 ---------- */
function workCard(w, i){
  return `<a class="wcard" href="#/w/${i}"><div class="thumb" style="background:${grad(w[3])};height:130px"><span class="tbadge">${w[2]==="video"?"视频":w[2]==="audio"?"音频":"图片"}</span></div>
  <div class="meta"><div class="small" style="min-height:40px">${esc(w[0])}</div><div class="muted small">${esc(w[1])} · @openai-next</div>
  <div class="row" style="justify-content:space-between"><span class="muted small">点赞</span><span class="muted small">♡ <span data-likes="${i}">0</span></span></div></div></a>`;
}
function pageHome(){
  const demoModels = [["gpt-image-2.5","GPT Image 2.5","A night market in the rain, neon signs on wet stone, 35mm film"],["seedance-2.0","Seedance 2.0","陶土爷爷吹生日蜡烛"],["seedream-5.0-pro","Seedream 5.0 Pro","红裙舞者火圈"],["gemini-3-pro-image-preview","Nano Banana Pro","浣熊咖啡师"],["minimax-h3","MiniMax H3","五名沙色西装男子"],["gpt-image-2","GPT Image 2","山顶摩天轮"],["seedance-2.0-mini","Seedance 2.0 Mini","温室清晨推镜"]];
  const featured = ["gpt-image-2","seedance-2.0","gemini-3-pro-image-preview","gpt-image-2.5","gemini-3.1-flash-image-preview","seedance-2.5"].map(modelById);
  const recent = D.updates[0][2].concat(D.updates[2][2]);
  const chronoHome = [["11月12日",""],["11月10日",""],["11月9日","Claude Fable 5.2"],["11月9日","Muse Ember"],["11月5日","Gemini Omni 1.2 Flash"],["10月27日","Genie 4"]];
  return topbar("") + `<div class="wrap">
  <div class="hero"><span class="badge">开源 MIT · 为 OpenAI Next 的每个模型而做</span>
  <h1><em>每个会创作的模型，</em>都在一间开放实验室。</h1>
  <p>试用、对比、调用模型，生成视频。API Key 只留在你的浏览器里，每次运行都连同请求一起留下。</p>
  <div class="row"><a href="#/play"><button class="btn-primary">打开工作台</button></a><a href="#/gallery"><button>逛逛画廊</button></a><a href="https://github.com/xiaoqianran/NextLab" target="_blank" rel="noopener"><button>GitHub</button></a></div></div>

  <div class="strip">${D.works.slice(0,16).map((w,i)=>workCard(w,i)).join("")}</div>
  <div class="cloud">${D.vendorCloud.join("　")}</div>

  <section class="blk"><h2><span class="serif">界面克制，</span><span class="g">工作区该密就密</span></h2>
  <p class="muted">键盘优先：⌘K 找任何页面或模型，按 G 再按一个字母，在工具之间跳转。</p>
  <div class="card"><div class="row" style="justify-content:space-between"><b id="demo-name">GPT Image 2.5</b><span class="seg"><button class="on">结果</button><button data-act="democode">代码</button></span></div>
  <div class="thumb" style="background:${grad(6)};height:220px;border-radius:10px;margin:12px 0"></div>
  <p id="demo-prompt">A night market in the rain, neon signs on wet stone, 35mm film</p>
  <p class="muted small">16:9 · 24.5s · $0.020 · 已存入我的作品 · api.openai-next.com · 你的 API Key ≈ $0.020</p>
  <div class="row">${demoModels.map((m,i)=>`<button data-demo="${i}" data-name="${esc(m[1])}" data-prompt="${esc(m[2])}">${esc(m[1])}</button>`).join("")}</div>
  <div class="row" style="margin-top:10px"><a href="#/play"><button class="btn-primary">运行 ⌘↵</button></a></div></div></section>

  <section class="blk"><h2><span class="serif">工具，</span><span class="g">六个入口</span></h2><div class="grid" style="gap:10px">
  ${[["工作台","G P","选一个模型，调好参数，运行。这张表单本身就是 API 参考。","#/play"],["对比","G C","一条提示词，最多四个模型并排跑，请求一一对照。","#/compare"],["对话","G H","多轮对话是一棵树：改写、重新生成，哪条分支都不丢。","#/chat"],["Agent","G A","会调用工具的模型：生成媒体、读网页，直到把事办完。","#/agent"],["范式","","按场景看什么好用：哪个模型、什么设置、花多少钱。","#/recipes"],["模型与接口","","每个模型的接口、参数和真实响应，附可复制的代码。","#/models"]].map(t=>`<a class="card toolcard" href="${t[3]}"><span><b>${t[0]}</b> ${t[1]?`<span class="kbd">${t[1]}</span>`:""}<br><span class="muted">${t[2]}</span></span><span>→</span></a>`).join("")}
  </div></section>

  <section class="blk"><h2><span class="serif">一次运行，</span><span class="g">一张图</span></h2>
  <p class="muted">请求带着你自己的 API Key，经 NextLabs 原样转发给 OpenAI Next——只转发，不保存、不记录。返回的结果和发出它的请求存在一起。</p>
  <div class="flow"><div class="card node"><b>你的提示词</b><br><span class="muted">和参数</span></div><div class="arr">→</div>
  <div class="card node"><b>你的浏览器</b><br><span class="muted">保管你的 API Key</span></div><div class="arr">→</div>
  <div class="card node"><b>OpenAI Next</b><br><span class="muted">api.openai-next.com</span></div><div class="arr">→</div>
  <div class="card node"><b>结果</b><br><span class="muted">GPT Image 2.5 图片 · Seedance 2.0 视频 · Suno v5 音乐</span></div><div class="arr">→</div>
  <div class="card node"><b>我的作品</b><br><span class="muted">和画廊</span></div></div>
  <div class="stats" style="margin-top:26px">
  <div><div class="num">${D.stats.models}</div><div class="muted">目录中的模型</div></div>
  <div><div class="num">${D.stats.tested}</div><div class="muted">实测跑通</div></div>
  <div><div class="num">${D.stats.vendors}</div><div class="muted">厂商</div></div>
  <div><div class="num">${D.stats.chronicle.toLocaleString()}</div><div class="muted">编年史收录的模型</div></div></div></section>

  <section class="blk"><h2><span class="serif">每个模型，</span><span class="g">各有各的手笔</span></h2>
  <p class="muted">每个模型都带着真实参数收进目录，上架前都真跑过一遍。</p>
  <div class="grid c3">${featured.map(m=>`<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(m[1])}</b><span class="badge">api · ${m[6]} 件作品</span></div>
  <p class="muted">${esc(m[4])}</p><p class="muted small">${esc(m[2])} · ${esc(m[5].slice(5))} 实测</p>
  <div class="row"><a href="#/play?model=${m[0]}"><button class="btn-primary">试一下</button></a><a href="#/models/${m[0]}"><button>API</button></a></div></div>`).join("")}</div></section>

  <section class="blk"><h2><span class="serif">不只是图片，</span><span class="g">来自画廊</span></h2>
  <p><a href="#/gallery">去画廊看看 →</a></p>
  <div class="grid c4">${D.works.slice(16,24).map((w,j)=>workCard(w,j+16)).join("")}</div>
  <div class="card" style="margin-top:16px"><b>Late studio, felt piano</b> <span class="muted">· Suno v4 · 音频卡（复刻版为占位播放器）</span>
  <div class="row" style="margin-top:8px"><button data-act="fakeplay">▶ 播放</button><span class="muted small">0:00 / 1:00</span><input type="range" value="0" style="max-width:220px"><button class="btn-ghost">静音</button><input type="range" value="70" style="max-width:110px"></div></div></section>

  <section class="blk"><h2><span class="serif">最近上新</span> <span class="g" style="font-size:20px">OpenAI Next 最近上新</span></h2>
  <p><a href="#/updates">全部 →</a></p>
  ${recent.map((u,i)=>{const m=modelById(u[1]);return `<div class="listrow"><div><b>${i+1}. <a href="#/models/${u[1]}">${esc(u[0])}</a></b> <span class="muted small">${i<2?"11月13日":"11月11日"}</span><p class="muted" style="margin:4px 0">${esc(u[2])}</p></div>
  <div class="row" style="flex:none"><a href="#/play?model=${u[1]}"><button>试一试</button></a><a href="#/models/${u[1]}"><button>接口</button></a></div></div>`}).join("")}</section>

  <section class="blk"><h2><span class="serif">编年史</span> <span class="g" style="font-size:20px">行业最近发布</span></h2>
  ${chronoHome.map(c=>`<div class="listrow"><span>${c[0]}</span><span class="muted">${esc(c[1])} 发布</span></div>`).join("")}
  <p class="muted">各家厂商的发布、价格，以及哪些能在这里运行——每天同步。</p>
  <div class="row"><a href="#/chronicle"><button class="btn-primary">打开编年史</button></a><a class="pill" href="#/status"><span class="dot"></span>一切正常 api.openai-next.com 224 ms</a></div></section>

  <section class="blk"><h2><span class="serif">粘贴一个 API Key，</span><span class="g">每个模型都只差一次点击</span></h2>
  <p class="muted">粘贴一个 OpenAI Next 的 API Key，平台上的每个模型都只差一次点击。它只存在这个浏览器里。</p>
  <div class="row"><input id="homekey" type="password" placeholder="你的 OpenAI Next API Key" style="max-width:420px"><button class="btn-primary" data-act="homekey">开始</button></div>
  <p class="muted small">API Key 只存在这个浏览器里，只发往 OpenAI Next。</p></section>

  <section class="blk"><h2><span class="serif">开源，</span><span class="g">MIT 许可。</span></h2>
  <p class="muted">自己部署一套 NextLabs，或者看看每个请求是怎么拼出来的。</p>
  <div class="row"><a href="https://github.com/xiaoqianran/NextLab" target="_blank" rel="noopener"><button>GitHub</button></a><button data-act="copycmd">复制命令</button></div>
  <pre>$ git clone https://github.com/xiaoqianran/NextLab && cd NextLab
Cloning into 'NextLab'… done.
$ bun install
✓ dependencies installed
$ bun run stack:up
✓ postgres ✓ storage ✓ temporal ✓ server ✓ poster ✓ caddy
The Lab's API is on http://localhost:8080</pre></section>
  </div>` + footer();
}
document.addEventListener("click", e => {
  const demo = e.target.closest("[data-demo]");
  if(demo){ $("#demo-name").textContent = demo.dataset.name; $("#demo-prompt").textContent = demo.dataset.prompt; }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if(act==="democode") toast("代码标签：见工作台的「代码」页，请求随参数实时生成");
  if(act==="fakeplay") toast("复刻版占位：原站此处为 Suno v4 音频");
  if(act==="copycmd") copyText("git clone https://github.com/xiaoqianran/NextLab && cd NextLab", "命令已复制");
  if(act==="homekey"){ const v=$("#homekey").value.trim(); if(!v){ toast("先粘贴 API Key"); return; } store.k=v; toast("已保存到本浏览器，去工作台试一试"); }
});

/* ---------- 工作台 / 对比 / 对话 / Agent / NextDraw ---------- */
const TYPES = [["image","图片"],["video","视频"],["audio","音频"],["text","文本"]];
function typeSeg(cur, base){ return `<span class="seg">${TYPES.map(([t,n])=>`<button class="${cur===t?"on":""}" data-typeseg="${t}" data-base="${base}">${n}</button>`).join("")}</span>`; }
function modelListHTML(type, curId){
  const list = D.models.filter(m=>m[3]===type);
  const groups = {}; list.forEach(m=>{ (groups[m[2]] ||= []).push(m); });
  return `<input placeholder="搜索${list.length}个模型 /" data-filter="models">
  <div class="row" style="margin:10px 0"><button class="btn-ghost" data-chip>已实测</button><button class="btn-ghost" data-chip>看图</button><button class="btn-ghost" data-chip>工具调用</button></div>
  <select data-filter="vendor"><option>全部厂商</option>${Object.keys(groups).map(g=>`<option>${esc(g)} ${groups[g].length}</option>`).join("")}</select>
  <div style="margin-top:10px">${Object.entries(groups).map(([g,ms])=>`<h5 class="muted" style="margin:12px 0 4px">${esc(g)}</h5>` + ms.map(m=>`<button class="modelitem ${m[0]===curId?"on":""}" data-model="${m[0]}">${esc(m[1])} ${m[5]>="2026-11-06"?'<span class="badge new">新</span>':""} <span class="muted small">4条提示</span></button>`).join("")).join("")}</div>`;
}
function paramsHTML(m){
  if(m[3]==="image") return `<h3 style="margin-top:0">参数</h3>
  <p class="muted small">尺寸 size</p><span class="seg" data-param="size">${["1:1","3:2","2:3","自动"].map((v,i)=>`<button class="${i===3?"on":""}" data-seg>${v}</button>`).join("")}</span>
  <p class="muted small">质量 quality</p><span class="seg" data-param="quality">${["自动","低","中","高"].map((v,i)=>`<button class="${i===0?"on":""}" data-seg>${v}</button>`).join("")}</span>
  ${m[1].includes("Nano Banana")?`<p class="muted small">宽高比 aspect_ratio</p><span class="seg" data-param="aspect_ratio">${["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9","自动"].map((v,i)=>`<button class="${i===10?"on":""}" data-seg>${v}</button>`).join("")}</span>
  <p class="muted small">图片尺寸 image_size</p><span class="seg" data-param="image_size">${["1K","2K","4K","自动"].map((v,i)=>`<button class="${i===3?"on":""}" data-seg>${v}</button>`).join("")}</span>`:""}
  <p class="muted small">参考图 reference_image</p><div class="row"><button data-up>上传</button><button data-up>我的上传</button></div>
  <input placeholder="粘贴链接，按 ~ 添加" style="margin-top:8px">
  <details style="margin-top:14px"><summary>高级 · 2</summary>
  <p class="muted small">背景 background</p><span class="seg" data-param="background">${["自动","透明","不透明"].map((v,i)=>`<button class="${i===0?"on":""}" data-seg>${v}</button>`).join("")}</span>
  <p class="muted small">输出格式 output_format</p><span class="seg" data-param="output_format">${["PNG","JPEG","WEBP"].map((v,i)=>`<button class="${i===0?"on":""}" data-seg>${v}</button>`).join("")}</span></details>`;
  if(m[3]==="text") return `<h3 style="margin-top:0">参数</h3>` + D.textParams.slice(3).map(p=>`<p class="muted small"><code>${p[0]}</code> ${p[1]} — ${p[2]} <span class="badge">${p[3]||"可选"}</span></p>`).join("");
  return `<h3 style="margin-top:0">参数</h3><p class="muted small">画幅 size</p><span class="seg" data-param="size">${["16:9","9:16","1:1","自动"].map((v,i)=>`<button class="${i===3?"on":""}" data-seg>${v}</button>`).join("")}</span>
  <p class="muted small">时长 duration（秒）</p><input type="number" value="5" data-param-num="duration">
  <p class="muted small">参考图 / 首帧</p><div class="row"><button data-up>上传</button><button data-up>我的上传</button></div><input placeholder="粘贴链接，按 ~ 添加" style="margin-top:8px">`;
}
function buildRequest(m, prompt, root){
  const body = { model: m[0], prompt };
  $$("[data-param]", root||document).forEach(seg=>{ const on = seg.querySelector("[data-seg].on"); if(on) body[seg.dataset.param] = on.textContent.trim(); });
  $$("[data-param-num]", root||document).forEach(inp=>{ body[inp.dataset.paramNum] = Number(inp.value); });
  const ep = m[3]==="image" ? "/v1/images/generations" : m[3]==="text" ? "/v1/chat/completions" : "/v1/tasks";
  if(m[3]==="text"){ delete body.prompt; body.messages = [{role:"user", content:prompt}]; }
  return { ep, body };
}
function codeFor(m, prompt, lang, root){
  const {ep, body} = buildRequest(m, prompt||"描述你想要的…", root);
  if(lang==="curl") return `curl https://api.openai-next.com${ep} \\\n  -H "Authorization: Bearer $OPENAI_NEXT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body,null,2)}'`;
  if(lang==="python") return `import requests\nr = requests.post("https://api.openai-next.com${ep}",\n  headers={"Authorization": "Bearer $OPENAI_NEXT_API_KEY"},\n  json=${JSON.stringify(body,null,2).replace(/\n/g,"\n  ")})\nprint(r.json())`;
  return `const r = await fetch("https://api.openai-next.com${ep}", {\n  method: "POST",\n  headers: { Authorization: "Bearer $OPENAI_NEXT_API_KEY", "Content-Type": "application/json" },\n  body: JSON.stringify(${JSON.stringify(body,null,2)})\n});\nconsole.log(await r.json());`;
}
const EXAMPLES = [["浣熊咖啡师","一只浣熊咖啡师正在萃取浓缩咖啡，清晨的光，35mm 胶片质感"],["中文字海报","茶饮店的极简海报，标题「春茶上新」，毛笔书法字"],["等距实验室","等距视角的剖面图：一间小小的温室实验室，柔和的粉彩光"]];
function pagePlay(q){
  const m = modelById(q.get("model")) || modelById("gpt-image-2.5");
  const inner = `<div class="cols3">
  <div>${typeSeg(m[3],"play")}<div style="margin-top:12px" id="modellist">${modelListHTML(m[3], m[0])}</div>
  <p class="muted small" style="margin-top:16px">${m[0]} · ${esc(m[2])} / ${esc(m[5])} 在 OpenAI Next 实测过</p></div>
  <div><h1 style="margin:0">${esc(m[1])} <button class="btn-ghost small" data-collapse>4条提示</button></h1>
  <p><code>${m[0]}</code> <button class="btn-ghost small" data-copy="${m[0]}">复制模型 ID</button> <span class="muted">· ${esc(m[2])}</span> <span class="badge">已在 api 站实测 ${esc(m[5])}</span></p>
  <div class="tabs"><button class="on" data-tab="result">结果</button><button data-tab="req">请求</button><button data-tab="code">代码</button><button data-tab="resp">响应</button></div>
  <div id="tab-result"><div class="thumb" style="background:${grad(m[1].length*3)};height:260px;border-radius:12px"></div><p class="muted">自动</p>
  <div>${EXAMPLES.map(x=>`<button class="chip" data-example="${esc(x[1])}">${x[0]}：${esc(x[1])}</button>`).join("")}</div></div>
  <div id="tab-req" style="display:none"><pre id="reqjson"></pre></div>
  <div id="tab-code" style="display:none"><div class="tabs"><button class="on" data-lang="curl">cURL</button><button data-lang="python">Python</button><button data-lang="js">JavaScript</button><button class="btn-ghost" data-copycode>复制</button></div><pre id="codebox"></pre></div>
  <div id="tab-resp" style="display:none"><pre id="respbox">还没有运行过。填提示词、贴 API Key、点运行，结果和响应会出现在这里。</pre></div>
  <textarea id="prompt" placeholder="描述你想要的…"></textarea>
  <div class="row" style="margin-top:10px"><button data-act="apikey">API Key ${esc(maskKey(store.k))}</button><button class="btn-ghost" title="费用估算">${esc(m[7])}</button>
  <button class="btn-primary" id="runbtn" disabled>运行 ⌘↵</button><span class="muted small" id="runhint">还没填：提示词</span></div></div>
  <div id="params">${paramsHTML(m)}</div></div>`;
  return shell("工作台", inner);
}
async function runCurrent(){
  const hash = location.hash; const q = new URLSearchParams(hash.split("?")[1]||"");
  const m = modelById(q.get("model")) || modelById("gpt-image-2.5");
  const prompt = $("#prompt").value.trim(); if(!prompt) return;
  if(!store.k){ apiKeyModal(); toast("先贴 API Key 才能运行"); return; }
  const {ep, body} = buildRequest(m, prompt);
  $("#respbox").textContent = "请求中…（由你的浏览器直发 api.openai-next.com）";
  $$(".tabs [data-tab]").forEach(b=>b.classList.toggle("on", b.dataset.tab==="resp"));
  ["result","req","code","resp"].forEach(t=>{ const el=$("#tab-"+t); if(el) el.style.display = t==="resp"?"":"none"; });
  try{
    const r = await fetch("https://api.openai-next.com"+ep, { method:"POST", headers:{Authorization:"Bearer "+store.k, "Content-Type":"application/json"}, body: JSON.stringify(body) });
    const txt = await r.text();
    $("#respbox").textContent = "HTTP " + r.status + "\n" + txt.slice(0, 4000);
    const w = store.works; w.unshift({ prompt, model: m[1], id: m[0], at: new Date().toISOString(), status: r.ok?"完成":"失败 "+r.status }); store.works = w.slice(0,100);
    toast(r.ok ? "运行完成，已存入我的作品" : "请求返回 "+r.status+"，详情见响应页");
  }catch(err){ $("#respbox").textContent = "请求失败：" + err.message + "\n（慢请求超时可改用美国节点 https://us.api.openai-next.com，见文档「接入地址与鉴权」）"; }
}
function pageCompare(){
  const ids = ["gpt-image-2.5","gemini-3-pro-image-preview","gemini-3.1-flash-image-preview"];
  const inner = `<div style="padding:4px 0">${typeSeg("image","compare")}
  <span style="margin-left:12px"><button data-act="addmodel">+ 添加</button> <button data-act="clearmodels">清空模型</button></span></div>
  <div class="grid c3" style="margin-top:14px">${ids.map(id=>{const m=modelById(id);return `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(m[1])}</b><button class="btn-ghost" data-act="clearmodels">✕</button></div>
  <p><code>${m[0]}</code> <button class="btn-ghost small" data-copy="${m[0]}">复制模型 ID</button></p><p class="muted small">${esc(m[2])} · ${esc(m[5])} 在 OpenAI Next 实测过 · 4条提示</p>${paramsHTML(m)}</div>`}).join("")}</div>
  <div style="margin-top:16px"><textarea id="prompt" placeholder="描述你想要的…"></textarea>
  <div class="row" style="margin-top:10px"><button data-act="apikey">API Key ${esc(maskKey(store.k))}</button><span class="muted">≈ $0.040</span><button class="btn-primary" id="runbtn" disabled>运行 ⌘↵</button></div></div>`;
  return shell("对比", inner);
}
function chatPage(kind){
  const isAgent = kind==="agent", isDraw = kind==="draw";
  const model = isDraw ? modelById("gpt-image-2.5") : modelById("deepseek-v4-flash");
  const examples = isAgent ? ["查查 GPT-5.5 到底支持哪些参数","帮我写个 NextDraw 画布","给我画张 GPT Image 2.5"] : isDraw ? ["角色立绘（正侧背三视图）","电影感夜市雨景","画一只小狗"] : ["讲讲扩散模型","API 风格对比表","限流俳句"];
  const empty = isAgent ? `和 ${esc(model[1])} 开始对话<br><span class="muted">Agent 能查 API、读写文件、搜集资料、生成媒体、画 NextDraw 画布，再按结果行动。</span>`
    : isDraw ? `和 ${esc(model[1])} 开始对话<br><span class="muted">画画、改图、做贴纸、生成角色立绘，都在这张画布上。</span>`
    : `和 ${esc(model[1])} 开始对话<br><span class="muted">任何消息都能改写，任何回答都能重新生成：每次都会成为一个新分支，所有分支都会保留。</span>`;
  const left = `<input placeholder="搜索${isDraw?"画布和对话":isAgent?"Agent 对话":"对话"}"><div class="row" style="margin:10px 0"><button data-act="newchat">+ ${isDraw?"新建项目":"新对话"}</button></div>
  <h5 class="muted">今天</h5><p class="muted small">（复刻版：本地会话会出现在这里）</p><div id="convlist"></div>`;
  const mid = `<div class="row"><button data-act="pickmodel">${esc(model[1])} ▾</button></div>
  <div id="msgs" style="margin:26px 0"><div class="card" style="text-align:center;padding:38px">${empty}</div>
  <div style="margin-top:14px">${examples.map(x=>`<button class="chip" data-example="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>
  <textarea id="prompt" placeholder="给 ${esc(model[1])} 发消息${isAgent?"（工具会按需调用）":""}"></textarea>
  <div class="row" style="margin-top:10px"><button data-act="apikey">API Key ${esc(maskKey(store.k))}</button><span class="muted">≈ ${isDraw?"$0.020":"$0.0020"}</span><button class="btn-primary" id="sendbtn" disabled>发送</button></div>
  ${isAgent?`<p class="muted small">Agent 模型需要有工具调用（tool_choice）支持，你要的模型没有时可以换个试试。可用模型：GPT-6.1 Sol、GPT-6.1、GPT-6、GPT-5.5 X、Claude Fable 5.2、Claude Opus 4.6、Gemini 4 Hydrogen、Gemini 4 Carbon、Kimi K3、Qwen3-Max、DeepSeek V4 Flash（选中）、Grok 4.2。</p>`:""}`;
  if(isDraw){
    const inner = `<div class="cols3"><div>${left}</div><div>${mid}</div>
    <div><div class="row"><button data-drawtool="select">选择</button><button data-drawtool="image">图片</button><button data-drawtool="shape">形状</button><button data-drawtool="text">文本</button><button data-act="drawimport">导入</button><button data-act="drawexport">导出</button><button data-act="theme">主题</button></div>
    <canvas class="draw" id="drawcanvas" width="600" height="480"></canvas><p class="muted" style="text-align:center">画布为空<br>在对话中生成图片，或从左边导入文件。</p>
    <p class="muted small">导入图片或上传文件到画布上 · 画布工具条 1 / 画布工具条 2</p></div></div>`;
    return shell("NextDraw", inner);
  }
  const right = isAgent ? "" : `<div><h3 style="margin-top:0">新对话</h3><p class="muted small">系统提示词 system</p><textarea id="system" placeholder=""></textarea>
  <details style="margin-top:12px"><summary>高级 · 13</summary>${D.textParams.slice(3).map(p=>`<p class="muted small"><code>${p[0]}</code> ${p[1]} — ${p[2]}</p>`).join("")}
  <p class="muted small">温度 temperature <input type="range" min="0" max="2" step="0.1" value="0"> 流式 stream <label class="switch"><input type="checkbox" checked><i></i></label></p></details></div>`;
  const inner = `<div class="cols3"><div>${left}</div><div>${mid}</div>${right||"<div></div>"}</div>`;
  return shell(isAgent?"Agent":"对话", inner);
}
async function sendChat(kind){
  const ta = $("#prompt"); const text = ta.value.trim(); if(!text) return;
  const box = $("#msgs"); const card = box.querySelector(".card"); if(card) card.remove();
  box.insertAdjacentHTML("beforeend", `<div class="card" style="margin-bottom:10px"><b>你</b><p style="margin:4px 0">${esc(text)}</p></div>`);
  ta.value=""; $("#sendbtn").disabled = true;
  if(!store.k){ box.insertAdjacentHTML("beforeend", `<div class="card"><b>NextLabs</b><p class="muted">还没有 API Key。点下方「API Key」贴上你的 Key 再发送——它只存在这个浏览器里。</p></div>`); apiKeyModal(); return; }
  const model = kind==="draw" ? "gpt-image-2.5" : "deepseek-v4-flash";
  const id = "m"+Date.now();
  box.insertAdjacentHTML("beforeend", `<div class="card" id="${id}"><b>${esc(model)}</b><p class="muted">请求中…</p></div>`);
  try{
    const r = await fetch("https://api.openai-next.com/v1/chat/completions", { method:"POST", headers:{Authorization:"Bearer "+store.k,"Content-Type":"application/json"}, body: JSON.stringify({ model, messages:[{role:"user",content:text}], stream:false }) });
    const j = await r.json().catch(()=>({}));
    $("#"+id).innerHTML = `<b>${esc(model)}</b><p>${esc(j.choices?.[0]?.message?.content || ("HTTP "+r.status+" "+JSON.stringify(j).slice(0,600)))}</p><div class="row"><button class="btn-ghost small" data-act="regen">重新生成</button><button class="btn-ghost small" data-act="editmsg">改写</button></div>`;
  }catch(err){ $("#"+id).innerHTML = `<b>${esc(model)}</b><p class="muted">请求失败：${esc(err.message)}</p>`; }
}
document.addEventListener("click", e => {
  const ts = e.target.closest("[data-typeseg]"); if(ts){ location.hash = "#/"+ts.dataset.base+"?type="+ts.dataset.typeseg; }
  const mi = e.target.closest("[data-model]"); if(mi){ location.hash = "#/play?model="+mi.dataset.model; }
  const sg = e.target.closest("[data-seg]"); if(sg){ $$("[data-seg]", sg.parentElement).forEach(b=>b.classList.remove("on")); sg.classList.add("on"); refreshCode(); }
  const ex = e.target.closest("[data-example]"); if(ex){ const p=$("#prompt"); if(p){ p.value = ex.dataset.example; p.dispatchEvent(new Event("input")); p.focus(); } }
  const cp = e.target.closest("[data-copy]"); if(cp) copyText(cp.dataset.copy, "模型 ID 已复制");
  if(e.target.closest("[data-copycode]")) copyText($("#codebox")?.textContent||"", "代码已复制");
  if(e.target.closest("[data-up]")) toast("上传为占位：复刻版未接入文件存储，可粘贴链接");
  if(e.target.closest("[data-chip]")) toast("筛选为占位：列表已按类型分组展示");
  if(e.target.closest("[data-collapse]")) toast("4 条提示：见下方示例提示按钮");
  const tb = e.target.closest("[data-tab]"); if(tb){ $$("[data-tab]").forEach(b=>b.classList.toggle("on", b===tb)); ["result","req","code","resp"].forEach(t=>{ const el=$("#tab-"+t); if(el) el.style.display = t===tb.dataset.tab?"":"none"; }); refreshCode(); }
  const lg = e.target.closest("[data-lang]"); if(lg){ $$("[data-lang]").forEach(b=>b.classList.toggle("on", b===lg)); refreshCode(); }
  if(e.target.id==="runbtn") runCurrent();
  if(e.target.id==="sendbtn"){ const kind = location.hash.includes("agent")?"agent":location.hash.includes("draw")?"draw":"chat"; sendChat(kind); }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if(act==="addmodel") toast("对比最多四个模型：复刻版固定展示三个代表模型");
  if(act==="clearmodels") toast("已清空为占位交互，刷新恢复默认三模型");
  if(act==="newchat") toast("新对话已开始（本地）");
  if(act==="pickmodel") cmdK();
  if(act==="regen") toast("重新生成会产生一个新分支（占位）");
  if(act==="editmsg") toast("改写：直接修改输入框再发送即可");
  if(act==="drawimport") toast("导入为占位：可使用「形状 / 文本」工具在画布上添加");
  if(act==="drawexport"){ const c=$("#drawcanvas"); if(c){ const a=document.createElement("a"); a.href=c.toDataURL("image/png"); a.download="nextdraw.png"; a.click(); } }
  const dt = e.target.closest("[data-drawtool]");
  if(dt){ const c=$("#drawcanvas"); if(!c) return; const ctx=c.getContext("2d"); ctx.fillStyle="#8ab4ff";
    if(dt.dataset.drawtool==="shape"){ ctx.fillRect(60+Math.random()*300, 60+Math.random()*200, 120, 80); }
    if(dt.dataset.drawtool==="text"){ ctx.font="22px sans-serif"; ctx.fillText("NextDraw", 80+Math.random()*200, 120+Math.random()*200); }
    if(dt.dataset.drawtool==="image"){ ctx.fillStyle="#f5a97f"; ctx.beginPath(); ctx.arc(200+Math.random()*200,200,46,0,7); ctx.fill(); }
    toast("已在画布上添加（本地画布）"); }
});
document.addEventListener("input", e => {
  if(e.target.id==="prompt"){ const b=$("#runbtn")||$("#sendbtn"); const hint=$("#runhint"); const has=e.target.value.trim().length>0;
    if(b) b.disabled=!has; if(hint) hint.textContent = has?"":"还没填：提示词"; refreshCode(); }
  if(e.target.matches("[data-filter='models']")){ const q=e.target.value.toLowerCase(); $$("#modellist .modelitem").forEach(b=>{ b.style.display = b.textContent.toLowerCase().includes(q)?"":"none"; }); }
});
function refreshCode(){
  const cb=$("#codebox"), rj=$("#reqjson"); if(!cb && !rj) return;
  const q=new URLSearchParams(location.hash.split("?")[1]||""); const m=modelById(q.get("model"))||modelById("gpt-image-2.5");
  const prompt=$("#prompt")?.value||""; const lang=$("[data-lang].on")?.dataset.lang||"curl";
  if(cb) cb.textContent = codeFor(m, prompt, lang);
  if(rj) rj.textContent = JSON.stringify(buildRequest(m, prompt||"描述你想要的…"), null, 2);
}

/* ---------- 画廊 / 作品详情 / 范式 ---------- */
function pageGallery(q){
  const sort = q.get("sort")||"new", type = q.get("type")||"all";
  let list = D.works.map((w,i)=>[w,i]); if(type!=="all") list = list.filter(([w])=>w[2]===type);
  const inner = `<h1 style="margin:0">画廊</h1><p class="muted">在实验室里做，和大家分享。每件作品都带着它的模型、参数和请求，打开就能再跑一次。点赞最多的排在前面。</p>
  <input id="gq" placeholder="搜索提示词、标题、模型 /">
  <div class="row" style="margin:14px 0"><span class="seg">${[["new","最新"],["top","最热"],["pick","精选"]].map(([v,n])=>`<button class="${sort===v?"on":""}" data-gsort="${v}">${n}</button>`).join("")}</span>
  <span class="seg">${[["all","全部"],["image","图片"],["video","视频"],["audio","音频"],["text","文本"]].map(([v,n])=>`<button class="${type===v?"on":""}" data-gtype="${v}">${n}</button>`).join("")}</span>
  <span class="muted">${list.length} 件作品</span></div>
  <div class="grid c5" id="ggrid">${list.map(([w,i])=>workCard(w,i)).join("")}</div>`;
  return topbar("画廊") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageWork(idx){
  const w = D.works[idx]; if(!w) return page404();
  const mid = [...D.models].find(m=>m[1]===w[1]); const seed = "e9521717-6544-4128-a760-dd62edbbebef";
  const inner = `<p><a href="#/gallery">← 返回画廊</a></p>
  <div class="grid c2" style="grid-template-columns:1.6fr 1fr;align-items:start">
  <div><div class="thumb" style="background:${grad(w[3])};height:420px;border-radius:14px"><span class="tbadge">${w[2]==="video"?"▶ 视频":w[2]==="audio"?"♪ 音频":"图片"}</span></div>
  <div class="tabs" style="margin-top:18px"><button class="on">请求</button><button>响应</button><button>参数</button></div>
  <pre>${esc(JSON.stringify({ model: mid?mid[0]:"—", prompt: w[0], size:"16:9", duration:5 }, null, 2))}</pre></div>
  <div class="card"><h3 style="margin-top:0">${esc(w[0])}</h3>
  <p>模型 <a href="#/models/${mid?mid[0]:""}" style="color:var(--link)">${esc(w[1])}</a></p>
  <p class="muted">作者 @openai-next<br>模式 ${w[2]==="video"?"文生视频":w[2]==="audio"?"文生音频":"文生图"} · 尺寸 16:9 · 时长 5 秒<br>价格 $0.020 · 创建时间 2026-11-15 11:03<br><span class="mono small">ID ${seed}</span></p>
  <div class="row"><button data-like="${idx}">♡ 点赞 <span data-likes="${idx}">0</span></button><button data-act="copywork">复制提示词</button><button data-act="dlwork">下载</button>
  <a href="#/play?model=${mid?mid[0]:""}"><button class="btn-primary">再跑一次</button></a></div></div></div>
  <section class="blk"><h2>相关作品</h2><div class="grid c5">${D.works.filter(x=>x[1]===w[1] && x!==w).slice(0,5).map(x=>workCard(x, D.works.indexOf(x))).join("") || '<p class="muted">暂无同模型作品。</p>'}</div></section>`;
  return topbar("画廊") + `<div class="wrap" style="padding-top:24px">${inner}</div>` + footer();
}
function pageRecipes(){
  const inner = `<h1 style="margin:0">范式</h1><p class="muted">按场景看什么好用：哪个模型、什么设置、花多少钱。</p>
  <div class="row"><input id="rq" placeholder="搜索场景、模型、提示词" style="max-width:420px"><button data-act="recipefilter">按需求找</button><button class="btn-primary" data-act="newrecipe">+ 新建范式</button></div>
  <div id="rfilter" style="display:none" class="card"><h3>按需求找</h3>
  <label><input type="checkbox" style="width:auto"> 能写中文</label> <label><input type="checkbox" style="width:auto"> 用参考图</label> <label><input type="checkbox" style="width:auto"> 带声音</label>
  <p class="muted small">最短边 <input type="number" value="2048" style="width:110px;display:inline"> px · 最短时长 <input type="number" value="5" style="width:80px;display:inline"> 秒 · 预算 $ <input type="number" value="0.20" step="0.01" style="width:90px;display:inline"></p>
  <div class="row"><button data-act="recipefilter">清除筛选</button><button class="btn-primary" data-act="recipeapply">应用筛选</button></div></div>
  <div class="card" style="text-align:center;padding:52px;margin-top:20px"><div style="font-size:38px">▦</div><h3>还没有范式</h3><p class="muted">试试换个筛选条件，或者新建一个范式。</p><button class="btn-primary" data-act="newrecipe">新建范式</button></div>
  <h3 style="margin-top:28px">热门场景</h3><div>${D.scenes.map(s=>`<button class="chip" data-example-scene="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
  return topbar("范式") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
document.addEventListener("click", e => {
  const gs=e.target.closest("[data-gsort]"); if(gs) location.hash="#/gallery?sort="+gs.dataset.gsort+"&type="+(new URLSearchParams(location.hash.split("?")[1]||"").get("type")||"all");
  const gt=e.target.closest("[data-gtype]"); if(gt) location.hash="#/gallery?type="+gt.dataset.gtype;
  const lk=e.target.closest("[data-like]"); if(lk){ e.preventDefault(); const s=$(`[data-likes="${lk.dataset.like}"]`); if(s) s.textContent = Number(s.textContent)+1; }
  const act=e.target.closest("[data-act]")?.dataset.act;
  if(act==="copywork") copyText($("h3")?.textContent||"", "提示词已复制");
  if(act==="dlwork") toast("下载为占位：复刻版画廊视觉为本地渐变占位图");
  if(act==="recipefilter"){ const f=$("#rfilter"); if(f) f.style.display = f.style.display==="none"?"":"none"; }
  if(act==="recipeapply") toast("筛选已应用（当前仍为空态，与原站一致）");
  if(act==="newrecipe") toast("新建范式为占位交互");
});
document.addEventListener("input", e => {
  if(e.target.id==="gq"){ const q=e.target.value.toLowerCase(); $$("#ggrid .wcard").forEach(c=>{ c.style.display = c.textContent.toLowerCase().includes(q)?"":"none"; }); }
});

/* ---------- 文档 / 模型 ---------- */
const DOCS_SIDE = `<input placeholder="筛选目录"><h5 class="muted">上手</h5>
<a class="modelitem" href="#/docs">快速开始</a><a class="modelitem" href="#/docs/platforms">接入地址与鉴权</a><a class="modelitem" href="#/docs/agents">接入编程 Agent</a>
<a class="modelitem" href="#/docs/tasks">异步任务</a><a class="modelitem" href="#/docs/files">输入文件</a><a class="modelitem" href="#/errors">错误码</a><a class="modelitem" href="#/status">状态</a>
<h5 class="muted">按厂商</h5>${D.vendors.map(v=>`<a class="modelitem" href="#/models?vendor=${v[1]}">${esc(v[0])} <span class="muted small">${v[2]}</span></a>`).join("")}`;
function docsShell(title, body, anchors){
  return topbar("文档") + `<div class="cols3" style="min-height:auto"><div>${DOCS_SIDE}</div><div style="max-width:720px"><p class="muted small">文档 / ${esc(title)}</p><h1 style="margin-top:0">${esc(title)}</h1>${body}</div>
  <div><h5 class="muted">本页</h5>${anchors.map(a=>`<a class="modelitem" href="javascript:void 0">${esc(a)}</a>`).join("")}</div></div>` + footer();
}
function pageDocs(){
  const body = `<p class="muted">NextLabs 是 OpenAI Next 的开放实验室：每个模型都能在这里跑一遍——跑通的，才会写进文档。</p>
  <h2>三步跑起来</h2>
  <div class="listrow"><div><b>1. 准备一个 API Key</b><p class="muted">去 api.openai-next.com 的令牌页创建一个 API Key。</p></div><a href="https://api.openai-next.com" target="_blank" rel="noopener"><button>创建 API Key</button></a></div>
  <div class="listrow"><div><b>2. 贴到这个浏览器里</b><p class="muted">粘贴到工作台右上角，或下面的输入框。</p><div class="row"><input id="homekey" type="password" placeholder="你的 OpenAI Next API Key" style="max-width:340px"><button data-act="homekey">保存</button></div></div></div>
  <div class="listrow"><div><b>3. 选一个模型，运行</b><p class="muted">工作台里选一个模型，填好提示词，点运行。</p></div><a href="#/play"><button class="btn-primary">打开工作台</button></a></div>
  <h2>在这里跑过</h2><p>22 个图像模型、23 个视频模型、24 个音频模型、200 个文本模型。<a href="#/docs/platforms" style="color:var(--link)">接入地址 →</a></p>
  <h2>模型页都写了什么</h2><p class="muted">每个模型页分三部分——接口（这个模型能调哪些接口）、参数（每个参数的选项和默认值）、代码（能直接跑的 cURL、Python、JavaScript）。每个模型页都能直接跑：填上 API Key，点运行。</p>
  <p><a href="#/models" style="color:var(--link)">模型与接口</a> · <a href="#/status" style="color:var(--link)">状态</a> · <a href="#/errors" style="color:var(--link)">错误码</a></p>
  <h2>试试这些模型</h2>${["gpt-6.1-sol","gpt-6.1","gpt-6","gpt-5.5-x","claude-fable-5.2","claude-opus-4.6","gemini-4-hydrogen","gemini-4-carbon","kimi-k3","qwen3-max","deepseek-v4-flash","grok-4.2"].map(id=>{const m=modelById(id);return m?`<div class="listrow"><div><b>${esc(m[1])}</b><p class="muted" style="margin:2px 0">${esc(m[4])}</p></div><div class="row"><a href="#/play?model=${id}"><button>试一试</button></a><a href="#/models/${id}"><button>接口</button></a></div></div>`:""}).join("")}
  <p class="muted">下一页：<a href="#/docs/platforms" style="color:var(--link)">接入地址与鉴权 →</a></p>`;
  return docsShell("快速开始", body, ["三步跑起来","在这里跑过","模型页都写了什么","试试这些模型"]);
}
function pagePlatforms(){
  const body = `<p class="muted">所有请求都发到 api.openai-next.com，API Key 作为 Bearer 令牌带在请求头里。API Key 创建时选的分组，决定它的倍率和能调用的模型。</p>
  <table><tr><th>项</th><th>值</th></tr>
  <tr><td>Base URL</td><td><code>https://api.openai-next.com</code></td></tr>
  <tr><td>鉴权头</td><td><code>Authorization: Bearer $OPENAI_NEXT_API_KEY</code></td></tr>
  <tr><td>美国节点</td><td><code>https://us.api.openai-next.com</code></td></tr>
  <tr><td>在这里跑过</td><td>22 个图像模型、23 个视频模型、24 个音频模型、200 个文本模型</td></tr></table>
  <p class="muted">美国节点的路由和 API Key 与主地址完全相同，前面没有 Cloudflare，没有 100 秒的限制。生图、生视频这类慢请求遇到 HTTP 524 超时，换成它即可。</p>
  <h2>鉴权</h2><pre>curl https://api.openai-next.com/v1/models \\
  -H "Authorization: Bearer $OPENAI_NEXT_API_KEY"</pre>
  <h2>API Key 与分组</h2><p class="muted">分组决定倍率与可调模型；模型不在分组里会报「no channel」。可设消费上限、过期时间。NextLabs 不保存你的 API Key；Agent 运行和 NextDraw 需要时会单独、每次都征得你同意，并说明用途。</p>
  <h2>计费</h2><p class="muted">对话按 token 计费；媒体按次或按 token。平台已经接受的任务，不管你取不取结果都会计费。被拒绝的请求通常不计费，但有些上游失败了也收费。</p>
  <h2>限制与错误</h2><p class="muted">无公布的速率限制；429 退避重试；主地址 Cloudflare 100 秒断开返回 HTTP 524，换美国节点。</p>
  <h2>请求格式</h2><table><tr><th>格式</th><th>接口</th><th>验证所用模型</th></tr>
  ${[["OpenAI Chat","POST /v1/chat/completions","Nano Banana Pro · 2026-10-22"],["OpenAI Responses","POST /v1/responses","GPT-6.1 Sol · 2026-10-20"],["Anthropic Messages","POST /v1/messages","Claude Fable 5.2 · 2026-11-10"],["Gemini","POST /v1beta/models/{model}:generateContent","Nano Banana 2 · 2026-10-11"],["OpenAI Images","POST /v1/images/generations","GPT Image 2.6 · 2026-11-10"],["OpenAI Speech","POST /v1/audio/speech","TTS-1 · 2026-10-29"]].map(r=>`<tr><td>${r[0]}</td><td><code>${r[1]}</code></td><td>${r[2]}</td></tr>`).join("")}</table>
  <p class="muted">视频和音乐以任务方式工作，见<a href="#/docs/tasks" style="color:var(--link)">异步任务</a>页。</p>
  <h2>你自己的网关</h2><p class="muted">可用自己的 New API / One Hub / ShellAPI 网关，在设置里添加；媒体运行仍走 OpenAI Next。</p>
  <h2>另一个站点</h2><p class="muted">draw.openai-next.com 与本站账号、API Key 分开，一站的 Key 在另一站返回 401。</p>
  <p class="muted">上一页：<a href="#/docs" style="color:var(--link)">快速开始</a> · 下一页：<a href="#/docs/agents" style="color:var(--link)">接入编程 Agent</a></p>`;
  return docsShell("接入地址与鉴权", body, ["接入地址","鉴权","API Key 与分组","计费","限制与错误","请求格式","你自己的网关","另一个站点"]);
}
function pageDocSimple(kind){
  const conf = {
    agents: ["接入编程 Agent","把 OpenAI Next 的接入地址与 API Key 配进编程 Agent（Cursor、Claude Code 等 OpenAI 兼容客户端）：Base URL 填 https://api.openai-next.com，API Key 填你的令牌，模型名用模型页上的 ID。慢请求超时改用美国节点。"],
    tasks: ["异步任务","视频和音乐以任务方式工作：提交任务 → 轮询查询状态 → 取结果。平台已经接受的任务，不管取不取结果都会计费；失败任务按协议区分提交、查询、取消、结果四个阶段，见错误码页的协议表。"],
    files: ["输入文件","图片、音频等输入文件可通过上传或链接提供；文件在运行后保留 24 小时。文件太大会返回 413，见错误码页。"]
  }[kind];
  const body = `<p class="muted">${esc(conf[1])}</p><p><a href="#/docs/platforms" style="color:var(--link)">先看接入地址与鉴权 →</a></p>`;
  return docsShell(conf[0], body, [conf[0]]);
}
function pageModels(q){
  const vendor = q.get("vendor");
  if(vendor){
    const v = D.vendors.find(x=>x[1]===vendor); const list = D.models.filter(m=>m[2]===(v?v[0]:""));
    const wide = D.models.filter(m=>vendor==="google" ? m[2]==="Google" : false);
    const rows = (list.length?list:wide);
    return topbar("模型") + `<div class="wrap" style="padding-top:28px"><p><a href="#/models">← 全部厂商</a></p><h1>${esc(v?v[0]:vendor)}</h1>
    ${rows.length?rows.map(m=>`<div class="listrow"><div><b><a href="#/models/${m[0]}">${esc(m[1])}</a></b><p class="muted" style="margin:2px 0">${esc(m[4])}</p></div><div class="row"><a href="#/play?model=${m[0]}"><button>试一试</button></a><a href="#/models/${m[0]}"><button>接口</button></a></div></div>`).join(""):'<p class="muted">该厂商的完整模型清单在原站目录中（共 '+(v?v[2]:0)+' 个），复刻版收录了其中代表型号，见上方列表与其他厂商页。</p>'}</div>` + footer();
  }
  const inner = `<h1 style="margin:0">模型与 API</h1><p class="muted">每个模型都能在这里跑一遍，跑通的才写进文档。</p>
  <div class="row"><input id="mq" placeholder="搜索 436 个模型" style="max-width:420px">
  <span class="seg">${[["all","全部"],["image","图像"],["video","视频"],["audio","音频"],["text","文本"]].map(([v,n],i)=>`<button class="${i===0?"on":""}" data-mtype="${v}">${n}</button>`).join("")}</span>
  <button class="btn-ghost" data-chip>已实测</button><button class="btn-ghost" data-chip>看图</button><button class="btn-ghost" data-chip>工具调用</button></div>
  <div class="grid c4" style="margin-top:20px" id="vgrid">${D.vendors.map(v=>`<a class="card" href="#/models?vendor=${v[1]}"><b>${esc(v[0])}</b> <span class="badge">${v[2]}</span><p class="muted small">代表：${esc(v[3])}</p><span class="muted small">展开 →</span></a>`).join("")}</div>
  <div id="mresults" style="margin-top:10px"></div>
  <section class="blk"><h2>已下线的模型</h2><p class="muted">平台上已经跑不了的模型。页面留着，供对照以前的请求和作品；新的运行请改用右边的型号。</p>
  ${D.retired.map(r=>`<div class="listrow"><div><b>${esc(r[0])}</b> <span class="muted small">${r[1]}</span></div><span class="muted">改用 ${esc(r[2])}</span></div>`).join("")}</section>`;
  return topbar("模型") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageModelDetail(id){
  const m = modelById(id); if(!m) return page404();
  const sibs = D.models.filter(x=>x[2]===m[2] && x[3]===m[3]).slice(0,9);
  const isText = m[3]==="text";
  const body = `<p class="muted small">模型与接口 / ${esc(m[2])} / ${esc(m[1])}</p>
  <span class="badge">${TYPES.find(t=>t[0]===m[3])[1]}</span> <span class="badge">${esc(m[2])}</span> <span class="badge">${esc(m[5])} 在 OpenAI Next 实测过</span>
  <p>${esc(m[4])}</p>
  ${sibs.length>1?`<div class="row">${sibs.map(s=>`<a href="#/models/${s[0]}"><button class="${s[0]===id?"btn-primary":""}">${esc(s[1])}</button></a>`).join("")}</div>`:""}
  <h2>接口</h2><p class="muted">${isText?"POST /v1/chat/completions（OpenAI 格式）":"POST /v1/images/generations"} · 改一个值，下面的请求就跟着变。</p>
  ${isText?`<table><tr><th>参数</th><th>说明</th><th>默认</th></tr>${D.textParams.map(p=>`<tr><td><code>${p[0]}</code>${p[3]==="必填"?"*":""}</td><td><b>${p[1]}</b> · ${p[2]}</td><td>${p[3]||"—"}</td></tr>`).join("")}</table>`
  :`<h3>价格</h3><p class="muted">按次计费。价格按官方价目换算，实际以你的 API Key 分组倍率为准。一次一张图，不支持并行出图。</p>
  <table><tr><th>画幅</th><th>低</th><th>中</th><th>高</th></tr><tr><td>1:1</td><td>$0.012</td><td>$0.020</td><td>$0.036</td></tr><tr><td>3:2 / 2:3</td><td>$0.012</td><td>$0.020</td><td>$0.036</td></tr><tr><td>自动（长边 1024）</td><td>$0.009</td><td>$0.016</td><td>$0.030</td></tr></table>
  <h3>参数</h3><div id="params">${paramsHTML(m)}</div>`}
  <h3>代码</h3><div class="tabs"><button class="on" data-lang="curl">cURL</button><button data-lang="python">Python</button><button data-lang="js">JavaScript</button><button class="btn-ghost" data-copycode>复制</button></div>
  <textarea id="prompt" style="display:none"></textarea><pre id="codebox"></pre>
  <div class="row"><a href="#/play?model=${m[0]}"><button class="btn-primary">在工作台里运行</button></a><a href="https://api.openai-next.com" target="_blank" rel="noopener"><button>厂商文档</button></a></div>
  <p class="muted small">新手引导（原站 3 步浮层）：1/3 这张参数表就能跑。参数表就是请求：能填的都是选项，右边是它发出的代码。填上 API Key，点运行。<button class="btn-ghost" data-act="guide">跳过 Esc</button> <button class="btn-ghost" data-act="guide">下一步 →</button></p>`;
  setTimeout(refreshCode, 0);
  return topbar("模型") + `<div class="wrap" style="padding-top:24px;max-width:900px">${body}</div>` + footer();
}
document.addEventListener("click", e => {
  if(e.target.closest("[data-act='guide']")) toast("引导为说明性复刻，未做全屏浮层");
  const mt=e.target.closest("[data-mtype]"); if(mt){ $$("[data-mtype]").forEach(b=>b.classList.toggle("on",b===mt));
    const t=mt.dataset.mtype; const list = t==="all"?[]:D.models.filter(m=>m[3]===t);
    $("#mresults").innerHTML = list.map(m=>`<div class="listrow"><div><b><a href="#/models/${m[0]}">${esc(m[1])}</a></b> <span class="muted small">${esc(m[2])}</span></div><div class="row"><a href="#/play?model=${m[0]}"><button>试一试</button></a><a href="#/models/${m[0]}"><button>接口</button></a></div></div>`).join(""); }
});
document.addEventListener("input", e => {
  if(e.target.id==="mq"){ const q=e.target.value.toLowerCase();
    $("#mresults").innerHTML = !q ? "" : D.models.filter(m=>m[1].toLowerCase().includes(q)||m[0].includes(q)).map(m=>`<div class="listrow"><div><b><a href="#/models/${m[0]}">${esc(m[1])}</a></b> <span class="muted small">${esc(m[2])} · ${esc(m[3])}</span></div><div class="row"><a href="#/play?model=${m[0]}"><button>试一试</button></a></div></div>`).join(""); }
});

/* ---------- 更新 / 编年史 / 作品 / 状态 / 错误码 / 设置 / 通知 / 主页 ---------- */
function pageUpdates(){
  const inner = `<h1 style="margin:0">模型更新</h1><p class="muted">OpenAI Next 最近上新：新模型、新功能、新价格。每个新模型都附带试一试和接口。</p>
  <div class="row"><input id="uq" placeholder="搜索模型、厂商、版本" style="max-width:380px">
  <span class="seg">${["全部","图像","视频","音频","文本"].map((n,i)=>`<button class="${i===0?"on":""}">${n}</button>`).join("")}</span>
  <select style="width:auto"><option>全部版本</option>${[...new Set(D.updates.map(u=>u[1]))].map(v=>`<option>${v}</option>`).join("")}</select></div>
  <div id="ulist">${D.updates.map(g=>`<section class="blk" style="margin-top:44px"><h2 style="font-size:24px">${g[0]} <span class="badge">${g[1]}</span></h2>
  ${g[2].map((u,i)=>`<div class="listrow"><div><b>${i+1}. <a href="#/models/${u[1]}">${esc(u[0])}</a></b><p class="muted" style="margin:4px 0">${esc(u[2])}</p><span class="muted small">实录 · API · 2026-${g[0].startsWith("11")?"11":"11"}</span></div>
  <div class="row" style="flex:none"><a href="#/play?model=${u[1]}"><button>试一试</button></a><a href="#/models/${u[1]}"><button>接口</button></a></div></div>`).join("")}</section>`).join("")}</div>
  <p class="muted">页脚：<a href="#/chronicle" style="color:var(--link)">编年史 →</a></p>`;
  return topbar("更新") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageChronicle(){
  const inner = `<h1 style="margin:0">编年史</h1><p class="muted">每个模型，按它到来的顺序。各家厂商的发布、价格，以及哪些能在这里运行——每天同步；日期一律是官方发布日。</p>
  <div class="row"><span class="pill"><span class="dot"></span>30 分钟内上线</span><span class="pill">1,426 个模型</span><span class="pill">42 家厂商</span><span class="muted small">上次同步 2026/11/16 12:23:20</span></div>
  <div class="row" style="margin-top:14px"><span class="seg"><button class="on">时间线</button><button data-act="chronmodels">模型</button></span>
  <span class="seg">${["2026","2025","2024","2023","2022","2021","2020","2019","2018"].map((y,i)=>`<button class="${i===0?"on":""}">${y}</button>`).join("")}</span></div>
  <div class="row" style="margin-top:12px"><input id="cq" placeholder="搜索模型、厂商、事件" style="max-width:360px">
  <span class="seg">${["全部类型","发布","下架","价格","功能"].map((n,i)=>`<button class="${i===0?"on":""}">${n}</button>`).join("")}</span></div>
  <div id="clist">${D.chronicle.map((c,i)=>`<div class="listrow"><div><b><a href="javascript:void 0" data-chron="${i}">${esc(c[0])}</a></b> <span class="badge">${esc(c[3])}</span>
  <p class="muted" style="margin:2px 0">${esc(c[1])} · ${esc(c[5]||"")} ${c[4]?`· 官方价 ${esc(c[4])} · API/LAB 可用`:""}</p></div><span class="muted">${esc(c[2])}</span></div>`).join("")}</div>
  <div id="ctable" style="display:none"><table><tr><th>模型</th><th>类型</th><th>发布</th><th>上下文</th><th>官方价 $/百万</th><th>可用</th></tr>
  ${D.chronicle.slice(0,8).map(c=>`<tr><td>${esc(c[0])}</td><td>${c[6]?(modelById(c[6])?.[3]==="text"?"语言":modelById(c[6])?.[3]==="video"?"视频":"—"):"—"}</td><td>${esc(c[2])}</td><td>${esc(c[5].includes("105")||esc(c[5]).includes("100")?"1M":"")}</td><td>${esc(c[4]||"")}</td><td>${c[6]?"API LAB":"LAB"}</td></tr>`).join("")}</table></div>
  <p class="muted small" style="margin-top:26px">数据来源：Model data from models.dev (MIT)、Epoch AI CC BY 4.0、Availability/prices from api.openai-next.com / draw.openai-next.com · 上次同步 2026/11/16 12:23:20</p>`;
  return topbar("编年史") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageWorks(){
  const mine = store.works;
  const inner = `<h1 style="margin:0">我的作品</h1>
  <div class="row" style="margin:14px 0"><input id="wq" placeholder="搜索提示词和标题" style="max-width:360px">
  <span class="seg">${["全部","图片","视频","音频","文本"].map((n,i)=>`<button class="${i===0?"on":""}">${n}</button>`).join("")}</span>
  <select style="width:auto"><option>全部状态</option><option>完成</option><option>已删除</option></select><button data-act="trash">回收站</button></div>
  <div id="wlist">${mine.length ? mine.map((w,i)=>`<div class="listrow"><div><b>${esc(w.prompt)}</b><p class="muted small" style="margin:2px 0">${esc(w.model)} · ${esc(w.status)} · ${esc(w.at.slice(0,16).replace("T"," "))}</p></div>
  <div class="row"><a href="#/play?model=${w.id}"><button>用这组设置再跑一次</button></a><button data-delwork="${i}">移到回收站</button></div></div>`).join("")
  : `<div class="card" style="text-align:center;padding:44px"><h3>还没有作品</h3><p class="muted">在工作台运行一次，结果会存到这里。</p><a href="#/play"><button class="btn-primary">去工作台</button></a></div>`}</div>
  <p class="muted small">文件在运行后保留 24 小时，想留的就下载下来。（复刻版：作品只存于本浏览器 localStorage）</p>`;
  return shell("我的作品", inner);
}
function pageStatus(){
  const inner = `<h1 style="margin:0">状态</h1><p class="muted">每个模型在真实运行中的成功率和延迟。更新于 ${new Date().toLocaleTimeString("zh-CN")}</p>
  <span class="seg">${["1小时","24小时","7天"].map((n,i)=>`<button class="${i===1?"on":""}">${n}</button>`).join("")}</span>
  <table style="margin-top:16px"><tr><th></th><th>模型</th><th>平台</th><th>状态</th><th>成功率</th><th>p50</th><th>运行</th><th>最近的错误</th></tr>
  ${D.statusRows.map(r=>`<tr><td>›</td><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td style="color:${r[2]==="正常"?"var(--green)":"var(--yellow)"}">${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td><td>${esc(r[6])}</td></tr>`).join("")}</table>
  <h3 style="margin-top:30px">过去 90 天</h3><p class="muted">（复刻版为静态快照，数据为盘点时所见）</p>`;
  return topbar("文档") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageErrors(){
  const inner = `<h1 style="margin:0">错误码</h1><p class="muted">NextLabs 见过的每一种错误响应：是谁那边的问题，该怎么办。</p>
  <div class="row"><input id="eq" placeholder="搜索错误码、错误信息" style="max-width:380px">
  <span class="seg">${["全部","网关错误","上游错误","内容拦截","客户端错误"].map((n,i)=>`<button class="${i===0?"on":""}">${n}</button>`).join("")}</span></div>
  <h2>网关错误</h2><div id="elist">${D.errors.map(er=>`<div class="listrow"><div><b><code>${esc(er[0])}</code> ${esc(er[1])}</b> <span class="badge">${esc(er[3])}</span> <span class="badge">重试可能有用</span><p class="muted" style="margin:2px 0">${esc(er[2])}</p></div></div>`).join("")}</div>
  <h2>失败的任务，按协议</h2><table><tr><th>协议</th><th>提交</th><th>查询</th><th>取消</th><th>结果</th></tr>
  ${["OpenAI Images","OpenAI Responses","OpenAI Speech","OpenAI Chat","Anthropic Messages","Gemini","Seedance","Seedream","Veo","Sora","Suno","ElevenLabs","Kling","Wan","Hailuo","Pika","Luma","Runway","MiniMax","Grok Imagine"].map(p=>`<tr><td>${p}</td><td>任务接口提交</td><td>按任务 ID 查询</td><td>视协议支持</td><td>完成后取结果文件</td></tr>`).join("")}</table>
  <p class="muted">上一页：<a href="#/docs/files" style="color:var(--link)">输入文件</a> · 下一页：<a href="#/status" style="color:var(--link)">状态</a></p>`;
  return topbar("文档") + `<div class="wrap" style="padding-top:28px">${inner}</div>` + footer();
}
function pageSettings(){
  const inner = `<h1 style="margin-top:0">设置</h1>
  <h3>API Key</h3><p class="muted">${store.k?"已保存："+esc(maskKey(store.k)):"API Key 未添加"} · API Key 只存在这个浏览器里，由 NextLabs 原样转发给 OpenAI Next——只转发，不保存、不记录。<a href="https://api.openai-next.com" target="_blank" rel="noopener" style="color:var(--link)">获取 API Key</a></p>
  <button data-act="apikey">${store.k?"更换 API Key":"添加 API Key"}</button>
  <h3>语言</h3><span class="seg"><button class="on">简体中文</button><button data-act="lang">English</button></span>
  <h3>主题</h3><span class="seg"><button data-act="theme">深色</button><button data-act="theme">浅色</button><button>跟随系统</button></span>
  <h3>你自己的网关</h3><p class="muted">可用自己的 New API / One Hub / ShellAPI 网关；媒体运行仍然走 OpenAI Next。</p>
  <div class="grid c3" style="grid-template-columns:1fr 1fr 1fr"><input placeholder="网关地址"><input placeholder="API Key" type="password"><select><option>New API</option><option>One Hub</option><option>ShellAPI</option></select></div>
  <p><button data-act="addgw">添加网关</button></p>
  <h3>通知</h3>${["新模型上线","模型下架","价格变动","状态异常"].map((n,i)=>`<p class="row" style="justify-content:space-between;max-width:420px"><span>${n}</span><label class="switch"><input type="checkbox" ${i<2?"checked":""}><i></i></label></p>`).join("")}
  <h3>数据</h3><p class="muted">已存于本浏览器（作品 ${store.works.length} 条）· 文件保留 24 小时</p><button data-act="cleardata">清空本地数据</button>
  <h3>关于</h3><p class="muted">版本 v0.13.8 · <a href="https://github.com/xiaoqianran/NextLab" target="_blank" rel="noopener" style="color:var(--link)">GitHub</a> · MIT 许可</p>`;
  return shell("设置", `<div class="grid" style="grid-template-columns:1fr 200px;gap:30px"><div>${inner}</div><div><h5 class="muted">本页</h5>${["API Key","语言","主题","你自己的网关","通知","数据","关于"].map(a=>`<a class="modelitem" href="javascript:void 0">${a}</a>`).join("")}</div></div>`);
}
function pageNotifications(){
  const inner = `<h1 style="margin-top:0">通知</h1><p class="muted">新模型、价格变动、状态异常，都在这里。</p>
  <span class="seg">${["全部","新模型","价格","状态"].map((n,i)=>`<button class="${i===0?"on":""}">${n}</button>`).join("")}</span>
  <div class="card" style="text-align:center;padding:44px;margin-top:18px"><h3>还没有通知</h3><p class="muted">新模型上线、价格变动、状态异常出现时，这里会有提醒。</p></div>
  <p class="muted small">通知设置在<a href="#/settings" style="color:var(--link)">设置</a>里改。</p>`;
  return shell("通知", inner);
}
function pageProfile(){
  const inner = `<div class="row"><span class="pill" style="font-size:20px;padding:10px 16px">访</span><div><h1 style="margin:0">本地访客</h1><p class="muted">这个人很懒，什么都没写。· 本地加入（复刻版无登录）</p></div></div>
  <p class="muted">分享 ${store.works.length} · 获赞 0</p>
  <div class="card" style="text-align:center;padding:44px"><h3>还没有公开的作品</h3><p class="muted">当你把作品公开到画廊，它们会出现在这里。</p></div>`;
  return shell("我的主页", inner);
}
function page404(){
  return topbar("") + `<div class="wrap" style="padding-top:70px;text-align:center"><h1 style="font-size:56px">404</h1><p class="muted">这个页面不存在</p>
  <p>试试这些：<a href="#/play" style="color:var(--link)">工作台</a>、<a href="#/gallery" style="color:var(--link)">画廊</a>、<a href="#/docs" style="color:var(--link)">文档</a>、<a href="#/chronicle" style="color:var(--link)">编年史</a></p>
  <a href="#/"><button class="btn-primary">返回首页</button></a></div>` + footer();
}
document.addEventListener("click", e => {
  const ch=e.target.closest("[data-chron]"); if(ch){ const c=D.chronicle[Number(ch.dataset.chron)];
    openLayer(`<div class="modal"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(c[0])}</h3><button class="btn-ghost" data-act="close">✕</button></div>
    <p class="muted">${esc(c[1])} · 2026-${esc(c[2])} · ${esc(c[3])}</p><p>${esc(c[5]||"")}</p>${c[4]?`<p>价格 ${esc(c[4])}（输入/输出，$/百万 token）</p>`:""}
    <div class="row">${c[6]?`<a href="#/play?model=${c[6]}"><button class="btn-primary">在工作台里打开</button></a><a href="#/models/${c[6]}"><button>查看接口</button></a>`:""}</div></div>`); }
  const dw=e.target.closest("[data-delwork]"); if(dw){ const w=store.works; w.splice(Number(dw.dataset.delwork),1); store.works=w; render(); toast("已移到回收站（本地）"); }
  const act=e.target.closest("[data-act]")?.dataset.act;
  if(act==="chronmodels"){ const t=$("#ctable"), l=$("#clist"); if(t&&l){ t.style.display=""; l.style.display="none"; } }
  if(act==="trash") toast("回收站为占位：本地删除即移除");
  if(act==="addgw") toast("网关添加为占位：复刻版运行仍走 OpenAI Next");
  if(act==="cleardata"){ localStorage.removeItem("nl_works"); localStorage.removeItem("nl_key"); toast("本地数据已清空"); render(); }
});
document.addEventListener("input", e => {
  if(e.target.id==="uq"){ const q=e.target.value.toLowerCase(); $$("#ulist .listrow").forEach(r=>{ r.style.display=r.textContent.toLowerCase().includes(q)?"":"none"; }); }
  if(e.target.id==="cq"){ const q=e.target.value.toLowerCase(); $$("#clist .listrow").forEach(r=>{ r.style.display=r.textContent.toLowerCase().includes(q)?"":"none"; }); }
  if(e.target.id==="eq"){ const q=e.target.value.toLowerCase(); $$("#elist .listrow").forEach(r=>{ r.style.display=r.textContent.toLowerCase().includes(q)?"":"none"; }); }
  if(e.target.id==="wq"){ const q=e.target.value.toLowerCase(); $$("#wlist .listrow").forEach(r=>{ r.style.display=r.textContent.toLowerCase().includes(q)?"":"none"; }); }
});

/* ---------- 路由 ---------- */
function render(){
  closeLayer();
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?"); const q = new URLSearchParams(qs||"");
  const app = $("#app"); let html, title = "NextLabs";
  const seg = path.split("/").filter(Boolean);
  if(path==="/"){ html = pageHome(); }
  else if(path==="/play"){ html = pagePlay(q); title="工作台 · NextLabs"; if(q.get("type")){ const t=q.get("type"); const first=D.models.find(m=>m[3]===t); if(first) setTimeout(()=>{ location.hash="#/play?model="+first[0]; },0); } }
  else if(path==="/compare"){ html = pageCompare(); title="对比 · NextLabs"; }
  else if(path==="/chat"){ html = chatPage("chat"); title="对话 · NextLabs"; }
  else if(path==="/agent"){ html = chatPage("agent"); title="Agent · NextLabs"; }
  else if(path==="/draw"){ html = chatPage("draw"); title="NextDraw · NextLabs"; }
  else if(path==="/gallery"){ html = pageGallery(q); title="画廊 · NextLabs"; }
  else if(seg[0]==="w" && seg[1]!==undefined){ html = pageWork(Number(seg[1])); title="作品 · NextLabs"; }
  else if(path==="/recipes"){ html = pageRecipes(); title="范式 · NextLabs"; }
  else if(path==="/docs"){ html = pageDocs(); title="快速开始 · NextLabs"; }
  else if(path==="/docs/platforms"){ html = pagePlatforms(); title="接入地址与鉴权 · NextLabs"; }
  else if(path==="/docs/agents"){ html = pageDocSimple("agents"); title="接入编程 Agent · NextLabs"; }
  else if(path==="/docs/tasks"){ html = pageDocSimple("tasks"); title="异步任务 · NextLabs"; }
  else if(path==="/docs/files"){ html = pageDocSimple("files"); title="输入文件 · NextLabs"; }
  else if(path==="/models"){ html = pageModels(q); title="模型与 API · NextLabs"; }
  else if(seg[0]==="models" && seg[1]){ html = pageModelDetail(seg[1]); title=(modelById(seg[1])?.[1]||"模型")+" API · NextLabs"; }
  else if(path==="/updates"){ html = pageUpdates(); title="模型更新 · NextLabs"; }
  else if(path==="/chronicle"){ html = pageChronicle(); title="编年史 · NextLabs"; }
  else if(path==="/works"){ html = pageWorks(); title="我的作品 · NextLabs"; }
  else if(seg[0]==="u"){ html = pageProfile(); title="主页 · NextLabs"; }
  else if(path==="/status"){ html = pageStatus(); title="状态 · NextLabs"; }
  else if(path==="/errors"){ html = pageErrors(); title="错误码 · NextLabs"; }
  else if(path==="/settings"){ html = pageSettings(); title="设置 · NextLabs"; }
  else if(path==="/notifications"){ html = pageNotifications(); title="通知 · NextLabs"; }
  else { html = page404(); title="404 · NextLabs"; }
  document.title = title; app.innerHTML = html; window.scrollTo(0,0);
}
window.addEventListener("hashchange", render);
render();
