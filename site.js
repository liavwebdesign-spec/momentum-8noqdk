/* Momentum. One file for every page; each block checks that its element exists. The data, the terminal and the
   calculator are in terminal.js. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  if (G && window.DrawSVGPlugin) G.registerPlugin(window.DrawSVGPlugin);
  if (G && window.Flip) G.registerPlugin(window.Flip);
  var still = function () { return reduced || html.classList.contains("a11y-still"); };

  // a direct check on scroll and resize: IntersectionObserver alone was throttled in some tabs and entrances never fired
  function inView(el, fn, at) {
    at = at || 0.88;
    function chk() { var r = el.getBoundingClientRect(); if (r.top < innerHeight * at && r.bottom > 0) { off(); fn(); } }
    function off() { removeEventListener("scroll", chk); removeEventListener("resize", chk); }
    addEventListener("scroll", chk, { passive: true }); addEventListener("resize", chk); requestAnimationFrame(chk); setTimeout(chk, 300);
  }

  $$("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); });

  /* ---------- the page opening: once, about a second and a half. The headline rises line by line from a mask, and the
     real trend line draws itself behind the glass with its dot riding the tip (MV:g126, from export/g126.html) ---------- */
  (function () {
    var items = $$("[data-open]"), line = $(".hc-line"), fill = $(".hc-fill"), dot = $(".hc-dot"), gain = dot && $(".hc-tag b", dot);
    var done = function () { html.classList.remove("open-anim"); };
    if (!html.classList.contains("open-anim")) return;
    if (!G || !items.length || html.classList.contains("a11y-still")) return done();
    var SHUT = "inset(125% -6% -25% -6%)", OPEN = "inset(-20% -6% -25% -6%)";
    var tl = G.timeline({ defaults: { ease: "power3.out" }, onComplete: function () { done(); G.set(items, { clearProps: "opacity,transform,clipPath" }); } });
    items.forEach(function (el, i) {
      var at = Math.min(i, 6) * 0.09;
      if (el.matches("h1")) {
        var lines = el.hasAttribute("data-lines") ? $$(":scope > span", el) : [el];
        tl.set(el, { opacity: 1 }, at).fromTo(lines, { clipPath: SHUT, y: 28 }, { clipPath: OPEN, y: 0, duration: 0.9, stagger: 0.12, clearProps: "clipPath,transform" }, at);
      } else tl.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, at + 0.1);
    });
    if (line && window.DrawSVGPlugin) {
      var L = line.getTotalLength(), end = gain ? parseFloat(gain.textContent.replace("+", "")) : 0, o = { p: 0 };
      var paint = function () {
        var pt = line.getPointAtLength(L * o.p);
        dot.style.setProperty("--x", (pt.x / 16).toFixed(2) + "%"); dot.style.setProperty("--y", (pt.y / 6).toFixed(2) + "%");
        if (gain) { var v = end * Math.pow(o.p, 1.4); gain.textContent = (v >= 0 ? "+" : "") + v.toFixed(1) + "%"; }
      };
      G.set(line, { drawSVG: "0%", opacity: 1 }); G.set(fill, { opacity: 0 }); G.set(dot, { opacity: 1 }); paint();
      tl.to(line, { drawSVG: "100%", duration: 1.8, ease: "power2.inOut" }, 0.2)
        .to(o, { p: 1, duration: 1.8, ease: "power2.inOut", onUpdate: paint }, 0.2)
        .to(fill, { opacity: 1, duration: 0.8, ease: "power2.out" }, 1.4);
    } else if (line) G.set([line, fill, dot], { opacity: 1 });
    // GSAP runs on requestAnimationFrame. Where frames do not come (a throttled tab, an automation pane), the opening would
    // leave the headline clipped: a timer that does not depend on frames finishes it
    setTimeout(function () { if (html.classList.contains("open-anim")) tl.progress(1); }, 3200);
  })();

  /* ---------- reveal: groups stagger 70ms inside themselves only ---------- */
  $$(".rv").forEach(function (el) {
    var sibs = $$(":scope > .rv", el.parentElement), i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--i", Math.min(i, 5));
    inView(el, function () { el.classList.add("is-in"); });
  });

  /* ---------- header: headroom (leaves on scroll down, back on the first move up) ---------- */
  var hd = $("#hd");
  if (hd) {
    var last = scrollY, tol = 6, raf = 0;
    var hold = function () { return html.classList.contains("lock") || (hd.contains(document.activeElement) && hd.querySelector(":focus-visible")); };
    var upd = function () {
      raf = 0; var y = scrollY, d = y - last, top = hd.offsetHeight + 24;
      if (y <= top || hold()) { hd.classList.remove("is-hidden"); last = y; return; }
      if (Math.abs(d) < tol) return;
      hd.classList.toggle("is-hidden", d > 0); last = y;
    };
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    hd.addEventListener("focusin", upd); upd();
  }

  /* ---------- drawer: the scroll lock is on html, never body + padding (headers.md) ---------- */
  var drawer = $("#drawer"), burger = $(".burger");
  if (drawer && burger) {
    var setDrawer = function (o) {
      drawer.classList.toggle("open", o); burger.setAttribute("aria-expanded", String(o)); html.classList.toggle("lock", o);
      if (o) { drawer.removeAttribute("inert"); setTimeout(function () { var f = $(".drawer-x", drawer); if (f) f.focus(); }, 60); }
      else { drawer.setAttribute("inert", ""); burger.focus({ preventScroll: true }); }
    };
    burger.addEventListener("click", function () { setDrawer(true); });
    $$("[data-close]", drawer).forEach(function (b) { b.addEventListener("click", function () { setDrawer(false); }); });
    $$(".drawer-list a, .drawer-foot a", drawer).forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) setDrawer(false); });
  }

  /* ---------- the service drawers: one native dialog, filled from the button that opened it ---------- */
  var SVC = {
    pension: { k: "תכנון פנסיוני, גמל והשתלמות", h: "כל הכסף הפנסיוני שלכם, על שולחן אחד.",
      p: "רוב האנשים מחזיקים כמה קופות אצל כמה חברות, וכל אחת שולחת דוח משלה. דרך המסלקה הפנסיונית רואים את כולן יחד, ומשם מתחילים לשאול את השאלות הנכונות.",
      l: ["באיזה מסלול כל קופה נמצאת, והאם הוא מתאים לגיל ולסיכון שלכם", "כמה דמי ניהול אתם משלמים בפועל, ועל מה אפשר להתמקח", "האם הכיסויים הביטוחיים בקרן הפנסיה נכונים לכם, בלי כפל ובלי חור", "קופות ישנות ששכחתם, ואיחוד שלהן כשזה משתלם"] },
    hedge: { k: "קרנות גידור בנאמנות", h: "אסטרטגיות של משקיעים מוסדיים, לתיק פרטי.",
      p: "קרן גידור מנסה להרוויח גם כשהשוק לא עולה, בכלים שקרן רגילה לא משתמשת בהם. ההשקעה מיועדת למי שעומד בתנאים שהחוק קובע, ונבחנת כחלק מהתיק כולו ולא לבד.",
      l: ["מה האסטרטגיה של הקרן, ואיך היא התנהגה בירידות", "לכמה זמן הכסף נעול, ומתי אפשר למשוך", "איך היא משתלבת עם שאר התיק, ומה החשיפה הכוללת"] },
    structure: { k: "מוצרים מובנים (Structure)", h: "יודעים מראש מה קורה בכל תרחיש.",
      p: "מוצר מובנה קובע מראש את כללי המשחק: לאיזה נכס הוא צמוד, לכמה זמן, כמה משתתפים ברווח, ומה קורה אם הנכס יורד. זה כלי למי שרוצה חשיפה לשוק עם גבולות ברורים.",
      l: ["מול איזה מדד או נכס המוצר עובד, ולכמה זמן", "איך נראה הרווח בעלייה, ומה ההגנה בירידה", "מי המנפיק, ומה הסיכון שלו"] },
    retire: { k: "תכנון וליווי לפרישה", h: "פרישה היא החלטה אחת עם הרבה מספרים.",
      p: "מתי לפרוש, מה לעשות עם מענקי הפרישה, איך לקבע זכויות, ואיך לסדר את המשיכות כך שיישאר אצלכם יותר אחרי מס. כל אלה נבדקים יחד, לפני שחותמים על משהו.",
      l: ["קיבוע זכויות וטופס 161", "קצבה או משיכה הונית, ובאיזה סדר", "תכנון המס של המענקים ושל הקצבה"] },
    portfolio: { k: "ניהול עושר ותיק השקעות", h: "כל ההון על מפה אחת, וכל שקל עם תפקיד.",
      p: "לכסף שלא מיועד לפנסיה יש כמה בתים טובים: תיק השקעות מנוהל על שמכם, קופת גמל להשקעה עם הטבות המס שלה, ולמי שמתאים גם קרנות גידור ומוצרים מובנים. ניהול עושר מתחיל בשאלה מה כל חלק בכסף אמור לעשות, ומתי.",
      l: ["מפה אחת של כל הנכסים הפיננסיים, גם אלה שמחוץ לפנסיה", "תיק מנוהל על שמכם, נזיל בכל רגע", "קופת גמל להשקעה: נזילה, ומגיל 60 אפשר להפוך אותה לקצבה פטורה ממס"] }
  };
  var dlg = $("[data-dlg-box]"), opener = null;
  if (dlg && dlg.showModal) {
    var go = $("[data-dlg-go]", dlg), base = go.getAttribute("href").split("?")[0];
    $$("[data-dlg]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = SVC[b.getAttribute("data-dlg")]; if (!s) return; opener = b;
        $("[data-dlg-k]", dlg).textContent = s.k; $("[data-dlg-h]", dlg).textContent = s.h; $("[data-dlg-p]", dlg).textContent = s.p;
        var ul = $("[data-dlg-list]", dlg); ul.textContent = "";
        s.l.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
        go.href = base + "?text=" + encodeURIComponent("שלום מתן, קראתי באתר על " + s.k + " ואשמח לשיחה.");
        dlg.showModal(); html.classList.add("lock");
      });
    });
    dlg.addEventListener("close", function () { html.classList.remove("lock"); if (opener) opener.focus({ preventScroll: true }); });
    $("[data-dlg-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- MV:g48, from export/g48.html: the statement is painted word by word as it is read. Split into words only
     (never letters: Hebrew and screen readers), the emphasised words keep their em. The words start in the muted colour
     that already passes AA, so the paragraph is readable at every point of the scroll. Not in site-edit ---------- */
  var say = $(".say");
  if (say && G && ST && !reduced && !/[?&]edit=1/.test(location.search)) {
    var words = [], split = function (node, into) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return; if (/^\s+$/.test(t)) { into.appendChild(document.createTextNode(t)); return; }
            var w = document.createElement("span"); w.className = "w"; w.textContent = t; into.appendChild(w); words.push(w);
          });
        } else { var c = n.cloneNode(false); into.appendChild(c); split(n, c); }
      });
    };
    var frag = document.createDocumentFragment(); split(say, frag); say.textContent = ""; say.appendChild(frag);
    say.classList.add("is-split"); say.classList.remove("rv");
    G.timeline({ scrollTrigger: { trigger: say, start: "top 78%", end: "bottom 50%", scrub: 0.4 } })
      .to(words, { color: function (i, el) { return el.closest("em") ? "#EEF3F0" : "rgba(238, 243, 240, .9)"; }, duration: 0.4, stagger: 0.35, ease: "none" }, 0);
  }

  /* ---------- the moves that follow the scroll: without GSAP, or with reduced motion, every final state is in the markup ---------- */
  if (G && ST && !reduced) {
    // the peek rises like a curtain as the hero leaves
    var peekEl = $("[data-peek]");
    if (peekEl) G.to(peekEl, { y: -140, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } });
    // MV:g125, from export/g125.html: Matan's business card tilts and the light crosses it
    var card = $("[data-bcard]");
    if (card) {
      var k = matchMedia("(max-width: 767px)").matches ? 0.5 : 1;
      G.timeline({ scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: 0.6 } })
        .fromTo(card, { rotateX: 16 * k, rotateY: -20 * k }, { rotateX: -12 * k, rotateY: 20 * k, ease: "none", duration: 1 }, 0)
        .fromTo(card, { "--shine": "120%" }, { "--shine": "-20%", ease: "none", duration: 1 }, 0);
    }
  }
  /* ---------- MV:g86, from export/g86.html: the four small charts of the services draw themselves as they arrive ---------- */
  var charts = $$(".svc-v");
  if (charts.length && G && ST && window.DrawSVGPlugin && !reduced && !html.classList.contains("a11y-still")) {
    charts.forEach(function (svg) {
      G.set($$("path", svg), { drawSVG: "0%" }); G.set($$("circle", svg), { scale: 0, transformOrigin: "50% 50%" });
      G.set($$("rect", svg), { scaleX: 0, transformOrigin: "100% 50%" });
    });
    // entered by the page's own scroll check, not a ScrollTrigger: a one-time entrance does not need to be re-measured
    charts.forEach(function (svg, i) {
      inView(svg, function () {
        var d = (i % 4) * 0.15;
        G.timeline({ delay: d })
          .to($$("path", svg), { drawSVG: "100%", duration: 0.9, ease: "power2.inOut", stagger: 0.15 }, 0)
          .to($$("rect", svg), { scaleX: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }, 0)
          .to($$("circle", svg), { scale: 1, duration: 0.35, ease: "power3.out" }, 0.7);
      }, 0.85);
    });
  }

  // MV:b35, from export/b35.html: the process line fills with the scroll and each step lights as it passes
  var vt = $(".vt");
  if (vt) {
    var fillEl = $(".vt-fill", vt), steps = $$(".vt-step", vt);
    if (G && ST && !reduced) {
      G.fromTo(fillEl, { "--fill": 0 }, { "--fill": 1, ease: "none", scrollTrigger: { trigger: vt, start: "top 62%", end: "bottom 72%", scrub: 0.6 } });
      steps.forEach(function (s) { ST.create({ trigger: s, start: "top 66%", onEnter: function () { s.classList.add("on"); }, onLeaveBack: function () { s.classList.remove("on"); } }); });
    } else { fillEl.style.setProperty("--fill", 1); steps.forEach(function (s) { s.classList.add("on"); }); }
  }

  // the terminal and the ticker arrive after the first layout: every trigger is measured again once they are in
  if (ST) { document.addEventListener("mm:data", function () { requestAnimationFrame(function () { ST.refresh(); }); setTimeout(function () { ST.refresh(); }, 400); }); addEventListener("load", function () { ST.refresh(); }); }

  /* ---------- MV:b02, the count-up: once, when the number is on screen. It waits for the data when the number comes from it ---------- */
  function countUp(el) {
    var to = +(el.getAttribute("data-to") || el.textContent.replace(/[^0-9.]/g, "")); if (!to) return;
    if (still() || !G) { el.textContent = Math.round(to); return; }
    var o = { v: 0 }; G.to(o, { v: to, duration: 1.2, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v); } });
  }
  var counters = $$("[data-count]");
  var arm = function () { counters.forEach(function (el) { inView(el, function () { countUp(el); }, 0.9); }); };
  if (counters.length) { if ($("#terminal")) document.addEventListener("mm:data", arm, { once: true }); else arm(); }

  /* ---------- the market band: TradingView's ticker (Matan asked for its widgets), loaded only when the band comes near ---------- */
  var tv = $("[data-tv] .tradingview-widget-container");
  if (tv) inView(tv, function () {
    var s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"; s.async = true;
    s.textContent = JSON.stringify({
      symbols: [{ proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" }, { proName: "TASE:TA35", title: "ת\"א 35" },
        { proName: "FX_IDC:USDILS", title: "דולר/שקל" }, { proName: "TVC:GOLD", title: "זהב" }],
      showSymbolLogo: false, isTransparent: true, displayMode: "compact", colorTheme: "dark", locale: "he_IL"
    });
    tv.appendChild(s);
  }, 1.4);

  /* ---------- mobile action bar (MV:cv1): after the hero's own buttons, never beside a form, never over the keyboard ---------- */
  var bar = $("[data-mbar]");
  if (bar) {
    var origin = $("[data-cta-origin]"), ends = $$("[data-cta-end]"), typing = false;
    var place = function () {
      var o = origin && origin.getBoundingClientRect();
      var nearEnd = ends.some(function (e) { var r = e.getBoundingClientRect(); return r.top < innerHeight * 0.7 && r.bottom > 0; });
      var on = (!o || o.bottom < 8) && !nearEnd && !typing && innerWidth < 768 && !(dlg && dlg.open);
      if (on !== bar.classList.contains("is-on")) {
        bar.classList.toggle("is-on", on); html.classList.toggle("bar-on", on);
        if (on) bar.removeAttribute("inert"); else bar.setAttribute("inert", "");
      }
    };
    bar.setAttribute("inert", "");
    addEventListener("scroll", function () { requestAnimationFrame(place); }, { passive: true }); addEventListener("resize", place);
    document.addEventListener("focusin", function (e) { if (e.target.matches("input, textarea, select")) { typing = true; place(); } });
    document.addEventListener("focusout", function (e) { if (e.target.matches("input, textarea, select")) { typing = false; setTimeout(place, 160); } });
    place(); setTimeout(place, 300);
  }

  /* ---------- the form: validation at the right moment (MV:cv9) and a send that never loses the lead (MV:cv8) ---------- */
  var digits = function (v) { return v.replace(/[^0-9]/g, ""); };
  var norm = function (v) { var d = digits(v); if (d.indexOf("972") === 0) d = "0" + d.slice(3); return d; };
  // mobile (05x) and VoIP (07x) are ten digits; landlines (02, 03, 04, 08, 09) are nine
  var fmt = function (d) { if (/^0[57][0-9]{8}$/.test(d)) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6); if (/^0[2-489][0-9]{7}$/.test(d)) return d.slice(0, 2) + "-" + d.slice(2, 5) + "-" + d.slice(5); return null; };
  var RULES = {
    name: function (v) { v = v.trim(); if (!v) return "איך לפנות אליכם? חסר שם"; if (v.length < 2) return "שם של אות אחת? כתבו לפחות שתיים"; return ""; },
    phone: function (v) { var d = norm(v), miss; if (!d) return "חסר מספר טלפון";
      if (/^0[57]/.test(d)) { if (d.length < 10) { miss = 10 - d.length; return (miss === 1 ? "חסרה ספרה אחת" : "חסרות " + miss + " ספרות") + ": מספר נייד הוא 10 ספרות"; }
        if (d.length > 10) return "יש ספרות מיותרות: מספר נייד הוא 10 ספרות"; }
      return fmt(d) ? "" : "המספר לא נראה כמו טלפון ישראלי"; },
    consent: function (v, el) { return el.checked ? "" : "צריך לאשר כדי שנוכל לחזור אליכם"; }
  };
  var ENDPOINT = ""; // the sketch has no server yet: the flow is real, the request is not (stage 4 wires the database)

  $$(".lead-form").forEach(function (form) {
    var which = form.getAttribute("data-form"), box = form.closest(".form-card");
    var sum = $("[data-summary]", form), panel = $("[data-panel]", form), btn = $(".send", form), lab = $("[data-lab]", btn);
    var label0 = lab.textContent, touched = {}, KEY = "momentum-draft-" + which, tries = 0, timer = 0, busy = false, waiting = false;
    var inputs = $$("[data-v]", form);
    var fields = [].slice.call(form.elements).filter(function (f) { return f.name && f.type !== "checkbox" && f.type !== "radio"; });
    try { var dr = JSON.parse(localStorage.getItem(KEY) || "{}"); fields.forEach(function (f) { if (dr[f.name]) f.value = dr[f.name]; }); } catch (e) {}
    var st0 = 0; form.addEventListener("input", function () { clearTimeout(st0); st0 = setTimeout(function () { var o = {}; fields.forEach(function (f) { o[f.name] = f.value; }); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }, 300); });

    var errOf = function (inp) { return inp.getAttribute("data-v") === "consent" ? $(".consent-err", form) : inp.closest(".f"); };
    var check = function (inp, show) {
      var k = inp.getAttribute("data-v"), m = RULES[k](inp.value || "", inp), wrapEl = errOf(inp);
      if (show || touched[k]) {
        if (k === "consent") { wrapEl.classList.toggle("is-on", !!m); $("p", wrapEl).textContent = m; }
        else { wrapEl.classList.toggle("is-bad", !!m); wrapEl.classList.toggle("is-ok", !m && inp.value.trim() !== ""); if (m) $(".f-err p", wrapEl).textContent = m; }
        inp.setAttribute("aria-invalid", m ? "true" : "false");
      }
      return m;
    };
    inputs.forEach(function (inp) {
      var k = inp.getAttribute("data-v");
      if (k === "consent") { inp.addEventListener("change", function () { touched[k] = true; check(inp, true); summary(false); }); return; }
      inp.addEventListener("blur", function () {
        if (inp.value.trim() === "" && !touched[k]) return;
        if (k === "phone") { var f = fmt(norm(inp.value)); if (f) inp.value = f; }
        touched[k] = true; check(inp, true);
      });
      // after the first mistake it re-checks while typing: the error leaves the moment it is fixed, never arrives mid-word
      inp.addEventListener("input", function () { if (touched[k]) check(inp, true); });
    });
    var nameOf = function (inp) { return inp.getAttribute("data-v") === "consent" ? "האישור" : inp.closest(".f").querySelector("label").textContent.trim(); };
    var summary = function (focus) {
      if (!sum.classList.contains("is-open") && !focus) return 0;
      var bad = inputs.filter(function (inp) { return RULES[inp.getAttribute("data-v")](inp.value || "", inp); }), ul = $("ul", sum); ul.textContent = "";
      bad.forEach(function (inp) {
        var li = document.createElement("li"), a = document.createElement("a");
        a.href = "#" + (inp.id || ""); a.textContent = nameOf(inp) + ": " + RULES[inp.getAttribute("data-v")](inp.value || "", inp);
        a.addEventListener("click", function (ev) { ev.preventDefault(); inp.focus(); }); li.appendChild(a); ul.appendChild(li);
      });
      $("[data-sum-count]", sum).textContent = bad.length === 1 ? "שדה אחד צריך תיקון" : bad.length + " שדות צריכים תיקון";
      sum.classList.toggle("is-open", bad.length > 0);
      if (focus && bad.length) { sum.focus({ preventScroll: true }); sum.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); }
      return bad.length;
    };
    form.addEventListener("input", function () { summary(false); });

    // sending: the button keeps its width, the label changes in place, a failure retries by itself
    var state = function (s) { box.setAttribute("data-state", s); };
    var setLab = function (t) { lab.classList.remove("in"); void lab.offsetWidth; lab.textContent = t; lab.classList.add("in"); };
    var msg = $("[data-msg]", panel), sub = $("[data-sub]", panel), ring = $(".ring-cd", panel);
    var show = function (kind, m, s) { panel.setAttribute("data-kind", kind); msg.textContent = m; sub.textContent = s || ""; panel.classList.add("is-open"); };
    var data = function () { var o = { form: which }; fields.forEach(function (f) { o[f.name] = f.value.trim(); }); var t = $('input[name="topic"]:checked', form); if (t) o.topic = t.value; return o; };
    var send = function (o) {
      if (!ENDPOINT) return new Promise(function (res) { setTimeout(res, 800); });
      return fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(function (r) { if (!r.ok) throw new Error(r.status); });
    };
    var countdown = function (sec) {
      clearInterval(timer); var left = sec; ring.style.setProperty("--t", sec + "s"); ring.classList.remove("run"); void ring.getBoundingClientRect(); ring.classList.add("run");
      sub.textContent = "ננסה שוב לבד בעוד " + left + " שניות";
      timer = setInterval(function () { left--; if (left <= 0) { clearInterval(timer); submit(); } else sub.textContent = "ננסה שוב לבד בעוד " + left + " שניות"; }, 1000);
    };
    var submit = function () {
      if (busy) return; busy = true; clearInterval(timer); btn.style.minWidth = btn.offsetWidth + "px";
      var o = data();
      if (navigator.onLine === false) { busy = false; waiting = true; state("offline"); setLab("ממתין לחיבור"); show("offline", "אין חיבור לאינטרנט. הפרטים שמורים.", "הטופס יישלח לבד ברגע שהחיבור יחזור."); return; }
      state("sending"); setLab("שולח"); panel.classList.remove("is-open"); btn.setAttribute("aria-busy", "true");
      send(o).then(function () {
        var first = (o.name || "").split(" ")[0];
        try { localStorage.removeItem(KEY); sessionStorage.setItem("lead-name", first); } catch (e) {}
        location.href = "thanks.html?name=" + encodeURIComponent(first);
      }, function () {
        busy = false; tries++; btn.removeAttribute("aria-busy"); state("error"); setLab(label0);
        if (tries < 3) { panel.classList.remove("is-final"); show("error", "לא הצלחנו לשלוח. הפרטים שמורים אצלכם.", ""); countdown(tries === 1 ? 5 : 10); }
        else { panel.classList.add("is-final"); show("error", "השרת לא עונה כרגע. הפרטים שמורים.", "אפשר לנסות שוב בעוד כמה דקות, או לכתוב למתן בוואטסאפ."); }
      });
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      inputs.forEach(function (inp) { var k = inp.getAttribute("data-v"); touched[k] = true; if (k === "phone") { var f = fmt(norm(inp.value)); if (f) inp.value = f; } check(inp, true); });
      if (summary(true)) return;
      tries = 0; submit();
    });
    addEventListener("online", function () { if (waiting) { waiting = false; submit(); } });
  });

  /* ---------- thank-you page (MV:cv3): the name, the time, one conversion per session ---------- */
  var ty = $("[data-thanks]");
  if (ty) {
    var q = new URLSearchParams(location.search), nm = "";
    try { nm = q.get("name") || sessionStorage.getItem("lead-name") || ""; } catch (e) {}
    nm = nm.trim().split(" ")[0];
    if (nm) $("[data-name]", ty).textContent = nm; else $("[data-name-wrap]", ty).remove();
    var d = new Date(), two = function (n) { return (n < 10 ? "0" : "") + n; }, hm = two(d.getHours()) + ":" + two(d.getMinutes());
    $$("[data-now]", ty).forEach(function (e) { e.textContent = hm; });
    inView(ty, function () {
      ty.classList.add("is-in");
      // a refresh or the back button is not a second lead
      try { if (sessionStorage.getItem("lead-fired")) return; sessionStorage.setItem("lead-fired", "1"); } catch (e) {}
      (window.dataLayer = window.dataLayer || []).push({ event: "generate_lead", form: "talk" });
    });
  }

  /* ---------- 404 (MV:cv6): guess the page from the broken address, and search the site ---------- */
  var nf = $("[data-404]");
  if (nf) {
    var PAGES = [
      { t: "עמוד הבית", u: "index.html", k: "בית ראשי home" },
      { t: "איפה הקופה שלכם עומדת: דירוג הקופות", u: "index.html#terminal", k: "terminal rank דירוג קופות השוואה גמל השתלמות תשואות" },
      { t: "שירותים", u: "index.html#services", k: "services שירותים פנסיה גמל השתלמות קרנות גידור מובנים structure פרישה תיק השקעות" },
      { t: "מי אנחנו: מתן משה", u: "index.html#about", k: "about אודות מתן ראובן בול סטריט" },
      { t: "מחשבון החיסכון", u: "index.html#calc", k: "calc calculator מחשבון דמי ניהול" },
      { t: "איך עובדים", u: "index.html#process", k: "process תהליך מסלקה" },
      { t: "יצירת קשר", u: "index.html#contact", k: "contact צור קשר טלפון וואטסאפ" },
      { t: "הצהרת נגישות", u: "accessibility.html", k: "accessibility נגישות" },
      { t: "מדיניות פרטיות", u: "privacy.html", k: "privacy פרטיות" },
      { t: "תנאי שימוש", u: "terms.html", k: "terms תנאים" }];
    var SLUG = { "terminal": "index.html#terminal", "rank": "index.html#terminal", "compare": "index.html#terminal", "services": "index.html#services", "about": "index.html#about", "calc": "index.html#calc", "calculator": "index.html#calc", "process": "index.html#process", "contact": "index.html#contact", "privacy": "privacy.html", "terms": "terms.html", "accessibility": "accessibility.html" };
    var path = decodeURIComponent(location.pathname).split("/").filter(Boolean).pop() || "";
    path = path.replace(/[.]html$/, "").toLowerCase();
    $("[data-shown]", nf).textContent = "/" + path;
    var levd = function (a, b) { var m = a.length, n = b.length, dd = [], i, j; for (i = 0; i <= m; i++) dd[i] = [i]; for (j = 0; j <= n; j++) dd[0][j] = j; for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) dd[i][j] = Math.min(dd[i - 1][j] + 1, dd[i][j - 1] + 1, dd[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return dd; };
    var best = null, bs = 1;
    Object.keys(SLUG).forEach(function (s) { if (!path) return; var dd = levd(path, s), r = dd[path.length][s.length] / Math.max(path.length, s.length); if (r < bs) { bs = r; best = s; } });
    var guess = $("[data-guess]", nf);
    if (best && bs <= 0.45 && path !== "404") {
      guess.hidden = false; guess.href = SLUG[best];
      var hit = PAGES.filter(function (p) { return p.u === SLUG[best]; })[0] || { t: best };
      $("[data-gt]", nf).textContent = hit.t;
      var gu = $("[data-gu]", nf), dd = levd(path, best), i = path.length, j = best.length, out = [];
      while (j > 0) { if (i > 0 && path[i - 1] === best[j - 1] && dd[i][j] === dd[i - 1][j - 1]) { out.unshift([best[j - 1], 0]); i--; j--; } else if (i > 0 && dd[i][j] === dd[i - 1][j - 1] + 1) { out.unshift([best[j - 1], 1]); i--; j--; } else if (dd[i][j] === dd[i][j - 1] + 1) { out.unshift([best[j - 1], 1]); j--; } else i--; }
      gu.textContent = "/"; out.forEach(function (c) { if (c[1]) { var mk = document.createElement("mark"); mk.textContent = c[0]; gu.appendChild(mk); } else gu.appendChild(document.createTextNode(c[0])); });
      $("[data-h]", nf).textContent = "הכתובת הזו לא קיימת, אבל נראה שחיפשתם משהו קרוב";
    }
    // results are text nodes only: the query is the visitor's input and never becomes HTML
    var qi = $("[data-q]", nf), list = $("[data-list]", nf), empty = $("[data-empty]", nf);
    var filter = function () {
      var v = qi.value.trim().toLowerCase(), n = 0; list.textContent = "";
      PAGES.forEach(function (p) {
        var hay = (p.t + " " + p.k).toLowerCase(); if (v && hay.indexOf(v) < 0) return; if (!v && n >= 6) return; n++;
        var li = document.createElement("li"), a = document.createElement("a"), s = document.createElement("span"), at = p.t.toLowerCase().indexOf(v);
        a.href = p.u;
        if (v && at > -1) { s.appendChild(document.createTextNode(p.t.slice(0, at))); var m = document.createElement("mark"); m.textContent = p.t.slice(at, at + v.length); s.appendChild(m); s.appendChild(document.createTextNode(p.t.slice(at + v.length))); }
        else s.textContent = p.t;
        a.appendChild(s); li.appendChild(a); list.appendChild(li);
      });
      empty.hidden = n > 0;
    };
    qi.addEventListener("input", filter);
    qi.addEventListener("keydown", function (e) { if (e.key === "ArrowDown") { var a = $("a", list); if (a) { e.preventDefault(); a.focus(); } } });
    list.addEventListener("keydown", function (e) { var all = $$("a", list), k = all.indexOf(document.activeElement); if (e.key === "ArrowDown" && k < all.length - 1) { e.preventDefault(); all[k + 1].focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); (k > 0 ? all[k - 1] : qi).focus(); } else if (e.key === "Escape") qi.focus(); });
    filter();
  }
})();
