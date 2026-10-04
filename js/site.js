/* מומנטום · the shared layer: the floating capsule (MV:hd3 + headroom) with its expertise submenu, the drawer, the
   windows (native <dialog>), reveal, the phone bar (b03), the TradingView widgets (loaded when they come near), the
   portfolio illustration and the form, which opens WhatsApp with a ready message (as in Matan's own sketch: nothing is
   stored on a server, so there is nothing to steal). Everything degrades to a readable page: content is visible without it. */
(function () {
  "use strict";
  var doc = document.documentElement, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var still = function () { return reduced || doc.classList.contains("a11y-still"); };
  var WA = "972542908737";

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- MV:hd3 headroom: the capsule leaves on the way down, back on the first move up ---------- */
  var hd = $("#hd");
  if (hd) (function () {
    var tol = 6, last = scrollY, raf = 0;
    function upd() {
      raf = 0;
      var y = scrollY, d = y - last, top = hd.offsetHeight + 24;
      hd.classList.toggle("is-scrolled", y > 8);
      var hold = hd.classList.contains("menu-open") || !!hd.querySelector(":focus-visible") || hd.querySelector('[aria-expanded="true"]');
      if (y <= top || hold) { hd.classList.remove("is-hidden"); last = y; return; }
      if (Math.abs(d) < tol) return;
      hd.classList.toggle("is-hidden", d > 0); last = y;
    }
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    hd.addEventListener("focusin", upd); upd();
  })();

  /* ---------- the expertise submenu: a disclosure (button + list), Escape and a click outside close it ---------- */
  $$("[data-sub]").forEach(function (sub) {
    var btn = $("button", sub), list = $("ul", sub);
    function set(o) { btn.setAttribute("aria-expanded", String(o)); sub.classList.toggle("open", o); }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("click", function (e) { if (!sub.contains(e.target)) set(false); });
    sub.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); btn.focus(); } });
    sub.addEventListener("focusout", function (e) { if (!sub.contains(e.relatedTarget)) set(false); });
    $$("a", list).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
  });

  /* ---------- the drawer: html scroll lock, focus trap, Escape ---------- */
  (function () {
    var root = $("#md"), burger = $(".burger"); if (!root || !burger) return;
    var panel = $(".md-panel", root), scrim = $(".md-scrim", root), closeBtn = $(".md-close", root), last = null;
    $$(".md-item", root).forEach(function (el, i) { el.style.setProperty("--i", i); });
    panel.inert = true;
    function set(open) {
      root.classList.toggle("open", open); panel.inert = !open;
      burger.setAttribute("aria-expanded", String(open));
      if (hd) hd.classList.toggle("menu-open", open);
      doc.style.scrollbarGutter = open ? "stable" : ""; doc.style.overflow = open ? "hidden" : "";
      if (open) { last = document.activeElement; setTimeout(function () { closeBtn.focus(); }, 120); }
      else { var to = (last && last !== document.body) ? last : burger; to.focus({ preventScroll: true }); }
    }
    burger.addEventListener("click", function () { set(!root.classList.contains("open")); });
    closeBtn.addEventListener("click", function () { set(false); });
    scrim.addEventListener("click", function () { set(false); });
    $$("a", root).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    addEventListener("keydown", function (e) {
      if (!root.classList.contains("open")) return;
      if (e.key === "Escape") { set(false); return; }
      if (e.key !== "Tab") return;
      var f = $$("a, button", panel).filter(function (x) { return x.offsetParent !== null; });
      var i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[n].focus();
    });
  })();

  var skip = $(".hskip"); if (skip) skip.addEventListener("click", function () { var m = $("#main"); if (m) setTimeout(function () { m.focus({ preventScroll: true }); }, 0); });

  /* ---------- the windows: one opener attribute, native <dialog> (focus, Escape, the top layer); the scroll lock on html.
     A link that opens a window from another page (the header on an inner page) lands here with #expertise and the id ---------- */
  var opener = null;
  function openDlg(id, from) {
    var d = document.getElementById(id); if (!d || !d.showModal) return false;
    opener = from || document.activeElement;
    d.showModal(); doc.classList.add("lock"); d.scrollTop = 0;
    var b = $(".dlg-body", d); if (b) b.scrollTop = 0;
    return true;
  }
  $$("dialog.dlg").forEach(function (d) {
    d.addEventListener("close", function () { doc.classList.remove("lock"); if (opener && opener.focus) opener.focus({ preventScroll: true }); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    $$("[data-close-dlg]", d).forEach(function (b) { b.addEventListener("click", function () { d.close(); }); });
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-open-dlg]"); if (!t) return;
    // a menu link lands on its section first (the window opens over it), so the page behind the window is the right one
    var h = t.getAttribute("href"), tgt = h && h.charAt(0) === "#" && document.getElementById(h.slice(1));
    if (tgt) tgt.scrollIntoView({ block: "start" });
    if (openDlg(t.getAttribute("data-open-dlg"), t)) e.preventDefault();
  });

  /* ---------- reveal (engine/motion.md 2): keyframes, 16px, 0.5s, once ---------- */
  var reveals = $$(".reveal");
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- MV:b03 the phone bar: only while no call to action, no form and no footer is on the screen ---------- */
  (function () {
    var bar = $("[data-bar]"); if (!bar || !("IntersectionObserver" in window)) return;
    var seen = new Set(), focusIn = false, mq = matchMedia("(max-width: 1023px)");
    var targets = $$('main [data-cta], main a[href="#contact"].btn, form[data-form], footer').filter(function (el) { return !el.closest("[data-bar]"); });
    function upd() { doc.classList.toggle("bar-on", mq.matches && seen.size === 0 && !focusIn && scrollY > 120); }
    var o = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); }); upd(); });
    targets.forEach(function (t) { o.observe(t); });
    document.addEventListener("focusin", function (e) { if (e.target.matches && e.target.matches("input, select, textarea")) { focusIn = true; upd(); } });
    document.addEventListener("focusout", function (e) { if (e.target.matches && e.target.matches("input, select, textarea")) { focusIn = false; upd(); } });
    addEventListener("scroll", upd, { passive: true });
    if (mq.addEventListener) mq.addEventListener("change", upd);
  })();

  /* ---------- TradingView: the market map in the hero, the tape and the market overview. Each is loaded when it comes
     near the screen (the map only after the page has loaded), each with a reserved height so nothing below it moves ---------- */
  var TV = {
    heatmap: { src: "embed-widget-stock-heatmap.js", cfg: { exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", locale: "he_IL", symbolUrl: "", colorTheme: "light", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false, width: "100%", height: "100%" } },
    tape: { src: "embed-widget-ticker-tape.js", cfg: { symbols: [{ proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" }, { proName: "TASE:TA35", title: "ת\"א 35" }, { proName: "FX_IDC:USDILS", title: "דולר/שקל" }, { proName: "TVC:GOLD", title: "זהב" }], showSymbolLogo: true, isTransparent: true, displayMode: "adaptive", colorTheme: "light", locale: "he_IL" } },
    overview: { src: "embed-widget-market-overview.js", cfg: { colorTheme: "light", dateRange: "12M", showChart: true, locale: "he_IL", largeChartUrl: "", isTransparent: true, showSymbolLogo: true, showFloatingTooltip: false, width: "100%", height: "100%",
      tabs: [{ title: "מדדים", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "TASE:TA35", d: "ת\"א 35" }, { s: "FOREXCOM:DJI", d: "Dow 30" }] },
             { title: "מטבעות וסחורות", symbols: [{ s: "FX_IDC:USDILS", d: "דולר/שקל" }, { s: "FX_IDC:EURILS", d: "אירו/שקל" }, { s: "TVC:GOLD", d: "זהב" }, { s: "TVC:USOIL", d: "נפט" }] }] } }
  };
  function loadTV(box) {
    if (box.getAttribute("data-tv-on")) return; box.setAttribute("data-tv-on", "1");
    var k = TV[box.getAttribute("data-tv")], c = $(".tradingview-widget-container", box); if (!k || !c) return;
    var s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/" + k.src; s.async = true; s.type = "text/javascript";
    s.textContent = JSON.stringify(k.cfg);
    c.appendChild(s);
    // the fallback line stays until the widget has drawn an iframe
    var t0 = Date.now(), iv = setInterval(function () { if ($("iframe", c)) { box.classList.add("tv-ready"); clearInterval(iv); } else if (Date.now() - t0 > 15000) clearInterval(iv); }, 400);
  }
  var tvs = $$("[data-tv]");
  if (tvs.length) {
    var near = function (el) { var r = el.getBoundingClientRect(); return r.top < innerHeight * 1.6 && r.bottom > -200; };
    var chk = function () { tvs.forEach(function (b) { if (!b.getAttribute("data-tv-on") && near(b)) loadTV(b); }); };
    var go = function () { chk(); addEventListener("scroll", chk, { passive: true }); };
    if (document.readyState === "complete") setTimeout(go, 200); else addEventListener("load", function () { setTimeout(go, 200); });
  }

  /* ---------- 03 the portfolio illustration: three mixes from Matan's sketch, the donut redrawn by its stroke dashes ---------- */
  (function () {
    var box = $("[data-alloc]"), R = window.RankCore; if (!box) return;
    var A = R ? R.ALLOC : null, LBL = R ? R.ALLOC_LABELS : null; if (!A) return;
    var svg = $("[data-donut]", box), leg = $("[data-legend]", box), note = $("[data-anote]", box), bs = $$("[data-a]", box);
    function draw(key) {
      var v = A[key].values, off = 0;
      $$("circle.dn", svg).forEach(function (c, i) { c.setAttribute("stroke-dasharray", (v[i] - 0.8).toFixed(1) + " " + (100 - v[i] + 0.8).toFixed(1)); c.setAttribute("stroke-dashoffset", String(-off)); off += v[i]; });
      $("title", svg).textContent = v.map(function (x, i) { return LBL[i] + " " + x + "%"; }).join(", ");
      leg.innerHTML = v.map(function (x, i) { return '<li><i class="dn' + i + '"></i>' + LBL[i] + " " + x + "%</li>"; }).join("");
      note.textContent = A[key].note;
      bs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-a") === key)); });
    }
    bs.forEach(function (b) { b.addEventListener("click", function () { draw(b.getAttribute("data-a")); }); });
  })();

  /* ---------- the form: a name is the only must; it opens WhatsApp with the message ready, and lands on thanks ---------- */
  var form = $('form[data-form="lead"]');
  if (form) {
    var alertBox = $("[data-alert]", form), nameI = $("#f-name"), topicI = $("#f-topic"), msgI = $("#f-msg"), KEY = "momentum-draft";
    try { var dr = JSON.parse(localStorage.getItem(KEY) || "null"); if (dr) { nameI.value = dr.name || ""; if (dr.topic) topicI.value = dr.topic; msgI.value = dr.msg || ""; } } catch (e) {}
    var ok = function () { return nameI.value.trim().length >= 2; };
    function mark(good) { var f = nameI.closest(".fld"); if (f) f.classList.toggle("err", !good); nameI.setAttribute("aria-invalid", String(!good)); }
    nameI.addEventListener("blur", function () { if (nameI.value) mark(ok()); });
    [nameI, topicI, msgI].forEach(function (el) { el.addEventListener("input", function () { if (nameI.getAttribute("aria-invalid") === "true") mark(ok()); try { localStorage.setItem(KEY, JSON.stringify({ name: nameI.value, topic: topicI.value, msg: msgI.value })); } catch (e) {} }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!ok()) { mark(false); alertBox.textContent = "חסר פרט אחד כדי להמשיך: השם שלכם."; nameI.focus(); return; }
      alertBox.textContent = "";
      var name = nameI.value.trim(), detail = msgI.value.trim();
      var text = "שלום מתן, שמי " + name + ". אשמח לתאם שיחת היכרות בנושא " + topicI.value + "." + (detail ? "\n" + detail : "");
      try { sessionStorage.setItem("lead-name", name); localStorage.removeItem(KEY); } catch (e2) {}
      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      setTimeout(function () { location.href = "thanks.html"; }, 300);
    });
  }

  /* a link that asks for a topic (Reuven's button) opens the form with it chosen */
  $$("[data-topic]").forEach(function (a) { a.addEventListener("click", function () { var t = $("#f-topic"); if (t) t.value = a.getAttribute("data-topic"); }); });

  /* the opening is over: drop the gate so nothing waits on it (the keyframes already ended) */
  if (doc.classList.contains("open-anim")) setTimeout(function () { doc.classList.remove("open-anim"); }, 1900);
})();
