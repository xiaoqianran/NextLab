/* NextLab 复刻版 v2 交互层 — 在原站渲染 DOM 之上补回行为（原站为 Next.js/React，本层为原生 JS 等价实现） */
(function () {
  "use strict";
  var BASE = window.NL_BASE || "";
  var root = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  /* ---------------- toast ---------------- */
  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:90;background:var(--fg-1,#111);color:var(--bg,#fff);font-size:13px;padding:8px 16px;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.25);opacity:0;transition:opacity .18s;pointer-events:none;max-width:86vw;text-align:center";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = "0"; }, 2200);
  }

  /* ---------------- 主题 ---------------- */
  function applyTheme(t) {
    root.classList.toggle("dark", t === "dark");
    root.classList.toggle("light", t !== "dark");
    $$('button[aria-label^="切换到"]').forEach(function (b) {
      b.setAttribute("aria-label", t === "dark" ? "切换到浅色" : "切换到深色");
    });
  }
  try { var savedTheme = localStorage.getItem("nl-theme"); if (savedTheme) applyTheme(savedTheme); } catch (e) {}
  document.addEventListener("click", function (e) {
    var b = e.target.closest('button[aria-label^="切换到"]');
    if (!b) return;
    var t = root.classList.contains("dark") ? "light" : "dark";
    applyTheme(t);
    try { localStorage.setItem("nl-theme", t); } catch (e2) {}
  });

  /* ---------------- 路由换算（给动态注入的片段用） ---------------- */
  function routeHref(abs) {
    if (!abs || abs.charAt(0) !== "/") return abs;
    var path = abs, q = "";
    var i = abs.indexOf("?");
    if (i >= 0) { path = abs.slice(0, i); q = abs.slice(i); }
    if (path === "/") return (BASE || "./") + q;
    if (path.indexOf("/assets/") === 0) return BASE + path.slice(1);
    return BASE + path.slice(1) + "/" + q;
  }

  /* ---------------- 命令菜单 ⌘K ---------------- */
  var cmdkWrap = null, cmdkLoading = false;
  function closeCmdk() { if (cmdkWrap) { cmdkWrap.remove(); cmdkWrap = null; } }
  function filterCmdk(q) {
    if (!cmdkWrap) return;
    q = (q || "").trim().toLowerCase();
    var first = null;
    $$("a[href]", cmdkWrap).forEach(function (a) {
      var hit = !q || a.textContent.toLowerCase().indexOf(q) >= 0;
      a.style.display = hit ? "" : "none";
      if (hit && !first) first = a;
    });
    $$("[cmdk-item]", cmdkWrap).forEach(function (it) {
      var hit = !q || it.textContent.toLowerCase().indexOf(q) >= 0 || (it.getAttribute("data-value") || "").toLowerCase().indexOf(q) >= 0;
      it.style.display = hit ? "" : "none";
      if (hit && !first) first = it;
    });
    cmdkWrap._first = first;
  }
  function openCmdk() {
    if (cmdkWrap) { var i0 = cmdkWrap.querySelector("input"); if (i0) { i0.value = ""; filterCmdk(""); i0.focus(); } return; }
    if (cmdkLoading) return;
    cmdkLoading = true;
    fetch(BASE + "assets/cmdk.html").then(function (r) { return r.text(); }).then(function (html) {
      cmdkLoading = false;
      cmdkWrap = document.createElement("div");
      cmdkWrap.innerHTML = html;
      $$("a[href^='/']", cmdkWrap).forEach(function (a) { a.setAttribute("href", routeHref(a.getAttribute("href"))); });
      document.body.appendChild(cmdkWrap);
      var input = cmdkWrap.querySelector("input");
      if (input) {
        input.addEventListener("input", function () { filterCmdk(input.value); });
        input.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" && cmdkWrap._first) { ev.preventDefault(); cmdkWrap._first.click(); }
        });
        setTimeout(function () { input.focus(); }, 30);
      }
      filterCmdk("");
      cmdkWrap.addEventListener("mousedown", function (e) {
        if ((e.target.classList && e.target.classList.contains("bg-scrim"))) closeCmdk();
      });
      cmdkWrap.addEventListener("click", function (e) {
        var item = e.target.closest("[cmdk-item]");
        if (!item) return;
        var dv = item.getAttribute("data-value") || "";
        if (dv.indexOf("model ") === 0) {
          location.href = BASE + "models/" + dv.slice(6).trim() + "/";
        }
      });
    }).catch(function () { cmdkLoading = false; toast("命令菜单加载失败"); });
  }
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); cmdkWrap ? closeCmdk() : openCmdk(); }
    if (e.key === "Escape") closeCmdk();
    /* G + 字母跳转（与原站一致；输入中/弹窗打开时不触发） */
    if (!cmdkWrap && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        if (window._nlG) {
          var map = { p: "play/", c: "compare/", h: "chat/", a: "agent/" };
          var dest = map[e.key.toLowerCase()];
          window._nlG = false;
          if (dest) { e.preventDefault(); location.href = BASE + dest; }
        } else if (e.key === "g" || e.key === "G") {
          window._nlG = true;
          setTimeout(function () { window._nlG = false; }, 700);
        }
      }
    }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest('button[aria-label="搜索页面和模型"]');
    if (b) { e.preventDefault(); openCmdk(); }
  });

  /* ---------------- 移动端菜单 ---------------- */
  var menuPanel = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest('button[aria-label="菜单"]');
    if (!b) return;
    if (menuPanel) { menuPanel.remove(); menuPanel = null; b.setAttribute("aria-expanded", "false"); return; }
    var nav = document.querySelector("header nav");
    if (!nav) return;
    menuPanel = document.createElement("div");
    menuPanel.style.cssText = "position:fixed;top:56px;left:0;right:0;z-index:45;background:var(--bg);border-bottom:1px solid var(--line-1,#e5e5e0);padding:10px 16px 14px;display:flex;flex-direction:column;gap:2px";
    $$("a", nav).forEach(function (a) {
      var c = a.cloneNode(true);
      c.style.cssText = "padding:10px 6px;font-size:15px";
      menuPanel.appendChild(c);
    });
    document.body.appendChild(menuPanel);
    b.setAttribute("aria-expanded", "true");
  });

  /* ---------------- API Key 弹窗 ---------------- */
  var keyModal = null;
  function getKey() { try { return localStorage.getItem("nl-api-key") || ""; } catch (e) { return ""; } }
  function openKeyModal(note) {
    if (keyModal) return;
    var scrim = document.createElement("div");
    scrim.className = "fixed inset-0 z-50 bg-scrim";
    var panel = document.createElement("div");
    panel.className = "-translate-x-1/2 fixed left-1/2 z-50 rounded-2xl glass-panel";
    panel.style.cssText = "top:18vh;width:min(440px,92vw);padding:22px";
    panel.innerHTML = '<div style="font-size:16px;font-weight:600;margin-bottom:6px">API Key</div>' +
      '<p style="font-size:13px;color:var(--fg-2);line-height:1.6;margin:0 0 14px">' + (note || "粘贴 OpenAI Next 的 API Key。它只存在这个浏览器里，运行时由浏览器直发 api.openai-next.com，本站不保存、不记录。") + "</p>" +
      '<input type="password" placeholder="sk-…" style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid var(--line-2,#ddd);background:var(--surface-1);color:var(--fg-1);font-size:14px">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
      '<button data-k="cancel" style="padding:7px 14px;border-radius:999px;border:1px solid var(--line-2,#ddd);background:transparent;color:var(--fg-1);cursor:pointer">取消</button>' +
      '<button data-k="save" style="padding:7px 16px;border-radius:999px;border:0;background:var(--fg-1,#111);color:var(--bg,#fff);cursor:pointer">保存</button></div>';
    var wrap = document.createElement("div");
    wrap.appendChild(scrim); wrap.appendChild(panel);
    document.body.appendChild(wrap);
    keyModal = wrap;
    var input = panel.querySelector("input");
    input.value = getKey();
    setTimeout(function () { input.focus(); }, 30);
    function close() { wrap.remove(); keyModal = null; }
    scrim.addEventListener("click", close);
    panel.querySelector('[data-k="cancel"]').addEventListener("click", close);
    panel.querySelector('[data-k="save"]').addEventListener("click", function () {
      try { localStorage.setItem("nl-api-key", input.value.trim()); } catch (e) {}
      close(); toast("API Key 已保存到本地浏览器");
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest('button[aria-label="登录"]');
    if (b) { e.preventDefault(); openKeyModal("复刻版为本地访客模式：不注册账号，填入你的 OpenAI Next API Key 即可运行模型。Key 只存在这个浏览器里。"); }
    var en = e.target.closest('button[aria-label="Switch to English"]');
    if (en) { e.preventDefault(); toast("复刻版仅提供中文界面"); }
  });
  /* 首页的 Key 输入 + 开始 */
  var homeInput = $('input[type="password"]');
  if (homeInput && !homeInput.closest("form")) {
    var startBtn = null;
    $$("button").forEach(function (b) { if (b.textContent.trim() === "开始" && !startBtn) startBtn = b; });
    if (startBtn) on(startBtn, "click", function () {
      if (homeInput.value.trim()) { try { localStorage.setItem("nl-api-key", homeInput.value.trim()); } catch (e) {} toast("API Key 已保存到本地浏览器"); }
      else openKeyModal();
    });
  }

  /* ---------------- Radix 风格标签页（模型详情 / 工作台等） ---------------- */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      on(tab, "click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); t.setAttribute("data-state", t === tab ? "active" : "inactive"); if (t === tab) t.removeAttribute("tabindex"); });
        var pid = tab.getAttribute("aria-controls");
        if (pid) {
          var panel = document.getElementById(pid);
          if (panel) {
            var scope = panel.parentElement || document;
            $$('[role="tabpanel"]', scope).forEach(function (p) { p.hidden = p !== panel; p.setAttribute("data-state", p === panel ? "active" : "inactive"); });
          }
        }
      });
    });
  });

  /* ---------------- 复制按钮 ---------------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var label = (b.getAttribute("aria-label") || "") + b.textContent.trim();
    if (!/复制|copy/i.test(label)) return;
    var scope = b.closest("div,section,pre") || document;
    var code = scope.querySelector("pre,code") || (b.parentElement && b.parentElement.querySelector("pre,code"));
    var text = code ? code.innerText : "";
    if (text && navigator.clipboard) { navigator.clipboard.writeText(text).then(function () { toast("已复制"); }, function () { toast("复制失败"); }); }
  });

  /* ---------------- 模型页：搜索过滤 ---------------- */
  var modelSearch = $('input[placeholder*="搜索模型"], input[placeholder*="搜索 436"], input[placeholder*="搜索438"]');
  if (modelSearch) {
    on(modelSearch, "input", function () {
      var q = modelSearch.value.trim().toLowerCase();
      $$('a[href*="models/"]').forEach(function (a) {
        var li = a.closest("li") || a;
        li.style.display = !q || a.textContent.toLowerCase().indexOf(q) >= 0 ? "" : "none";
      });
    });
  }

  /* ---------------- 画廊：排序链接拦截 ---------------- */
  if (location.pathname.indexOf("gallery") >= 0 || document.title.indexOf("画廊") === 0) {
    $$('a[href*="sort="]').forEach(function (a) {
      on(a, "click", function (ev) {
        ev.preventDefault();
        var m = /sort=(\w+)/.exec(a.getAttribute("href") || "");
        var cards = $$('a[href*="play?model="], a[href*="/gallery"]');
        toast(m && m[1] === "top" ? "已按最热排序（本地）" : "已按最新排序（本地）");
      });
    });
  }

  /* ---------------- 编年史：视图切换 ---------------- */
  var chronBtns = $$("button").filter(function (b) { return ["时间线", "模型"].indexOf(b.textContent.trim()) >= 0; });
  if (chronBtns.length === 2 && document.title.indexOf("编年史") === 0) {
    chronBtns.forEach(function (b) {
      on(b, "click", function () {
        chronBtns.forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); x.setAttribute("data-state", x === b ? "active" : "inactive"); });
        toast("视图：" + b.textContent.trim());
      });
    });
  }

  /* ---------------- 工作台：请求预览 + 运行 ---------------- */
  var promptBox = $('textarea[placeholder*="描述你想要的"]');
  if (promptBox) {
    var runBtn = null;
    $$("button").forEach(function (b) { if (b.textContent.trim().indexOf("运行") === 0 && !runBtn) runBtn = b; });
    function currentModel() {
      var m = /[?&]model=([^&]+)/.exec(location.search);
      if (m) return decodeURIComponent(m[1]);
      var h = document.querySelector("h1");
      return h ? h.textContent.trim() : "";
    }
    function paramVal(id) {
      var el = document.getElementById(id);
      if (!el) return "";
      if (el.tagName === "SELECT" || el.tagName === "INPUT") return el.value;
      return el.textContent.trim();
    }
    function buildBody() {
      var body = { model: currentModel(), prompt: promptBox.value || "" };
      var size = paramVal("param-size"); if (size) body.size = size;
      var q = paramVal("param-quality"); if (q) body.quality = q;
      return body;
    }
    function findPreview() {
      var codes = $$("pre, code");
      for (var i = 0; i < codes.length; i++) { if (codes[i].textContent.indexOf('"model"') >= 0) return codes[i]; }
      return null;
    }
    function refreshPreview() {
      var pre = findPreview();
      if (pre) pre.textContent = JSON.stringify(buildBody(), null, 2);
    }
    on(promptBox, "input", refreshPreview);
    ["param-size", "param-quality"].forEach(function (id) { var el = document.getElementById(id); if (el) on(el, "change", refreshPreview); });
    on(runBtn, "click", function () {
      var key = getKey();
      if (!key) { openKeyModal(); return; }
      var body = buildBody();
      toast("运行中…");
      fetch("https://api.openai-next.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) { toast("运行失败：" + ((res.j && res.j.error && res.j.error.message) || res.j.message || "未知错误")); return; }
          var d = (res.j.data || [])[0] || {};
          var url = d.url || (d.b64_json ? "data:image/png;base64," + d.b64_json : "");
          if (url) {
            var img = document.createElement("img");
            img.src = url; img.style.cssText = "max-width:100%;border-radius:12px";
            var pane = promptBox.closest("main") || document.body;
            pane.appendChild(img);
            toast("已生成，结果附在页面下方（本地运行）");
          } else toast("已返回结果（无图片地址）");
        })
        .catch(function (e) { toast("网络错误：" + e.message); });
    });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && runBtn) { e.preventDefault(); runBtn.click(); }
    });
  }

  /* ---------------- 对话页：发送（有 Key 时真调用） ---------------- */
  var chatBox = $('textarea[placeholder*="消息"], textarea[placeholder*="输入"]');
  if (chatBox && document.title.indexOf("对话") === 0) {
    var sendBtn = null;
    $$("button").forEach(function (b) { if (/发送/.test(b.textContent) && !sendBtn) sendBtn = b; });
    function send() {
      var text = chatBox.value.trim();
      if (!text) return;
      var key = getKey();
      if (!key) { openKeyModal(); return; }
      chatBox.value = "";
      toast("发送中…");
      fetch("https://api.openai-next.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({ model: "gpt-6.1", messages: [{ role: "user", content: text }] })
      }).then(function (r) { return r.json(); }).then(function (j) {
        var reply = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        toast(reply ? "模型已回复（见控制台/页面）" : "无回复内容");
        if (reply) {
          var div = document.createElement("div");
          div.style.cssText = "white-space:pre-wrap;font-size:14px;line-height:1.7;padding:12px 16px;margin:12px auto;max-width:760px";
          div.textContent = reply;
          (chatBox.closest("main") || document.body).appendChild(div);
        }
      }).catch(function (e) { toast("网络错误：" + e.message); });
    }
    if (sendBtn) on(sendBtn, "click", send);
    on(chatBox, "keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  }
})();
