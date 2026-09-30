/* Momentum: the data layer, the terminal and the calculator.
   The data is gemelnet, the Ministry of Finance's open register of every provident and study fund track, read live from
   data.gov.il (open CORS, updated every morning). When the source does not answer (a corporate network, an outage) the
   page falls back to data/gemelnet.json, a copy of the latest month, and says so. Nothing here is invented: every number
   on the page comes from one of the two. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var API = "https://data.gov.il/api/3/action/datastore_search", RID = "a30dcbea-a1d2-482c-ae29-8f781f5025fb";
  var FIELDS = ["FUND_ID", "FUND_NAME", "FUND_CLASSIFICATION", "SPECIALIZATION", "SUB_SPECIALIZATION", "MANAGING_CORPORATION", "TARGET_POPULATION", "REPORT_PERIOD",
    "YEAR_TO_DATE_YIELD", "AVG_ANNUAL_YIELD_TRAILING_3YRS", "AVG_ANNUAL_YIELD_TRAILING_5YRS", "AVG_ANNUAL_MANAGEMENT_FEE", "TOTAL_ASSETS", "SHARPE_RATIO", "STOCK_MARKET_EXPOSURE"];
  var MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  var KIND = { hish: "קרנות השתלמות", gemel: "תגמולים ואישית לפיצויים", invest: "קופת גמל להשקעה" };
  var BONDS = ["אשראי ואג\"ח", "אג\"ח סחיר", "עוקב מדדי אג\"ח", "אג\"ח ממשלות"];
  var TRACK = {
    general: function (r) { return r.SPECIALIZATION === "כללי" && r.SUB_SPECIALIZATION === "כללי"; },
    sp: function (r) { return (r.SUB_SPECIALIZATION || "").toLowerCase() === "עוקב מדד s&p 500"; },
    stocks: function (r) { return r.SUB_SPECIALIZATION === "מניות" || r.SUB_SPECIALIZATION === "מניות סחיר"; },
    bonds: function (r) { return BONDS.indexOf(r.SUB_SPECIALIZATION) > -1; }
  };
  var TRACK_T = { general: "במסלול הכללי", sp: "במסלול S&P 500", stocks: "במסלולי המניות", bonds: "במסלולי האג״ח" };
  var PERIOD = {
    ytd: { f: "YEAR_TO_DATE_YIELD", t: "תשואה מתחילת השנה", col: "מתחילת השנה" },
    y3: { f: "AVG_ANNUAL_YIELD_TRAILING_3YRS", t: "ממוצע שנתי, 3 שנים", col: "ממוצע שנתי" },
    y5: { f: "AVG_ANNUAL_YIELD_TRAILING_5YRS", t: "ממוצע שנתי, 5 שנים", col: "ממוצע שנתי" }
  };

  var num = function (v) { if (v === null || v === undefined || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; };
  // a negative number keeps the plain hyphen-minus, inside an LTR run (the cells are dir=ltr)
  var pct = function (v, d) { return v === null ? "-" : v.toFixed(d === undefined ? 2 : d) + "%"; };
  var ils = function (v) { return Math.round(v).toLocaleString("he-IL") + " ₪"; };
  var month = function (p) { p = String(p); return MONTHS[+p.slice(4, 6) - 1] + " " + p.slice(0, 4); };
  var co = function (s) { return String(s || "").replace(/\s*בע"?מ\.?$/, "").replace(/\s+/g, " ").trim(); };

  /* ---------- load: live first, the saved copy second ---------- */
  function timed(url, ms) {
    var c = "AbortController" in window ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, ms);
    return fetch(url, c ? { signal: c.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function live() {
    var q = function (p) { return API + "?resource_id=" + RID + "&" + Object.keys(p).map(function (k) { return k + "=" + encodeURIComponent(p[k]); }).join("&"); };
    return timed(q({ limit: 1, sort: "REPORT_PERIOD desc", fields: "REPORT_PERIOD" }), 7000).then(function (j) {
      var per = j.result.records[0].REPORT_PERIOD;
      return timed(q({ limit: 3000, filters: JSON.stringify({ REPORT_PERIOD: per }), fields: FIELDS.join(",") }), 9000).then(function (k) {
        if (!k.result.records.length) throw new Error("empty");
        return { period: per, records: k.result.records, live: true };
      });
    });
  }
  function load() {
    var KEY = "mm-gemelnet-v2", cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
    if (cached && cached.records) return Promise.resolve(cached);
    return live().then(function (d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} return d; }, function () {
      return fetch("data/gemelnet.json").then(function (r) { return r.json(); }).then(function (d) { return { period: d.period, records: d.records, live: false }; });
    });
  }

  /* ---------- the ranking ---------- */
  // a fund of a sector or an employer (lawyers, doctors, a company) is real data, but most visitors cannot join it
  var PUBLIC = function (r) { return r.TARGET_POPULATION === "כלל האוכלוסיה"; };
  function rank(all, kind, track, period, closed) {
    var f = PERIOD[period].f;
    var rows = all.filter(function (r) { return r.FUND_CLASSIFICATION === KIND[kind] && TRACK[track](r) && (closed || PUBLIC(r)); });
    var ranked = rows.filter(function (r) { return num(r[f]) !== null; }).map(function (r) { return Object.assign({}, r, { _v: num(r[f]) }); })
      .sort(function (a, b) { return b._v - a._v || (num(b.TOTAL_ASSETS) || 0) - (num(a.TOTAL_ASSETS) || 0); });
    ranked.forEach(function (r, i) { r._rank = i + 1; });
    return { list: ranked, young: rows.length - ranked.length };
  }

  /* ---------- MV:g100, ported from export/g100.html: the split-flap board ---------- */
  function Flap(el) {
    var tiles = [], cur = "";
    function size(n) {
      while (tiles.length < n) { var t = document.createElement("span"); t.className = "sf-t"; t.textContent = " "; el.appendChild(t); tiles.push(t); }
      while (tiles.length > n) el.removeChild(tiles.pop());
    }
    return function (text) {
      if (text === cur) return; cur = text; size(text.length);
      var G = window.gsap, still = reduced || document.documentElement.classList.contains("a11y-still");
      tiles.forEach(function (t, i) {
        var ch = text[i] === " " ? " " : text[i];
        if ((t._to || t.textContent) === ch) return;
        t._to = ch;
        if (still || !G) { t.textContent = ch; return; }
        G.killTweensOf(t); G.set(t, { rotateX: 0 });
        G.timeline({ delay: i * 0.04 })
          .to(t, { rotateX: -90, duration: 0.18, ease: "power2.in", onComplete: function () { t.textContent = ch; } })
          .set(t, { rotateX: 90 })
          .to(t, { rotateX: 0, duration: 0.28, ease: "power3.out" });
      });
    };
  }

  function terminal(all, meta) {
    var root = $("#terminal"); if (!root) return;
    var S = { kind: "hish", track: "general", period: "y5", pick: null, chosen: false, q: "", open: false, closed: false };
    var list = $("[data-tl]", root), more = $("[data-tl-more]", root), empty = $("[data-tl-empty]", root), qi = $("[data-tl-q]", root);
    var rankFlap = Flap($('[data-sf="rank"]', root)), pub = $("[data-public]", root);
    var B = function (k) { return $("[data-b-" + k + "]", root); };
    var dist = B("dist");

    // search hits are marked with text nodes only: the query is the visitor's input and never becomes HTML
    function hl(parent, text, q) {
      var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
      if (i < 0) { parent.textContent = text; return; }
      parent.appendChild(document.createTextNode(text.slice(0, i)));
      var m = document.createElement("mark"); m.textContent = text.slice(i, i + q.length); parent.appendChild(m);
      parent.appendChild(document.createTextNode(text.slice(i + q.length)));
    }
    function row(r, digits) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "tl-row"; b.setAttribute("aria-pressed", String(S.pick === r.FUND_ID)); b.setAttribute("data-flip-id", "f" + r.FUND_ID);
      var n = document.createElement("span"); n.className = "tl-n"; n.textContent = String(r._rank).padStart(digits, "0");
      var t = document.createElement("span"); t.className = "tl-t";
      var nb = document.createElement("b"); hl(nb, r.FUND_NAME, S.q.trim());
      var cs = document.createElement("small"); hl(cs, co(r.MANAGING_CORPORATION), S.q.trim());
      t.appendChild(nb); t.appendChild(cs);
      var v = document.createElement("span"); v.className = "tl-v"; v.textContent = pct(r._v);
      var f = document.createElement("span"); f.className = "tl-f"; f.textContent = pct(num(r.AVG_ANNUAL_MANAGEMENT_FEE));
      [n, t, v, f].forEach(function (x) { b.appendChild(x); });
      b.addEventListener("click", function () {
        S.pick = r.FUND_ID; S.chosen = true; draw();
        // on a phone the board sits above the list: bring it up so the flip is seen
        if (innerWidth < 1024) { var bd = $("[data-board]", root), top = bd.getBoundingClientRect().top; if (top < 0 || top > innerHeight * 0.6) scrollBy({ top: top - 96, behavior: reduced ? "auto" : "smooth" }); }
      });
      li.appendChild(b); return li;
    }
    function draw(reorder) {
      var res = rank(all, S.kind, S.track, S.period, S.closed), L = res.list;
      if (!L.length) { list.textContent = ""; empty.hidden = false; more.hidden = true; return; }
      if (!S.pick || !L.some(function (r) { return r.FUND_ID === S.pick; })) { S.pick = L[0].FUND_ID; S.chosen = false; }
      var sel = L.filter(function (r) { return r.FUND_ID === S.pick; })[0], digits = L.length >= 100 ? 3 : 2;

      // the list: the first ten, or all, or what the search found; the chosen fund is always in it
      var q = S.q.trim().toLowerCase();
      var shown = q ? L.filter(function (r) { return (r.FUND_NAME + " " + r.MANAGING_CORPORATION).toLowerCase().indexOf(q) > -1; }) : (S.open ? L : L.slice(0, 10));
      // MV:g23, from export/g23.html: when the track, the type or the period changes, every fund slides to its new place
      // instead of the list being swapped at once. Flip keys the old and the new rows by the fund's id
      var G = window.gsap, F = window.Flip, move = reorder && G && F && !reduced && !document.documentElement.classList.contains("a11y-still");
      var before = move ? F.getState(list.querySelectorAll(".tl-row")) : null;
      list.textContent = "";
      shown.forEach(function (r) { list.appendChild(row(r, digits)); });
      if (!q && !S.open && sel._rank > 10) { var g = document.createElement("li"); g.className = "tl-gap"; g.setAttribute("aria-hidden", "true"); g.textContent = "⋮"; list.appendChild(g); list.appendChild(row(sel, digits)); }
      if (before) F.from(before, { targets: list.querySelectorAll(".tl-row"), duration: 0.6, ease: "power2.inOut", stagger: 0.012,
        onEnter: function (els) { return G.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", delay: 0.2, clearProps: "opacity,transform" }); } });
      empty.hidden = shown.length > 0;
      more.hidden = !!q || L.length <= 10;
      more.textContent = S.open ? "להציג רק את העשר הראשונות" : "להציג את כל " + L.length + " הקופות במסלול";
      $("[data-tl-col]", root).textContent = PERIOD[S.period].col;
      $("[data-tl-note]", root).textContent = "מקור: גמל נט, רשות שוק ההון, ביטוח וחיסכון, נתוני " + month(meta.period) + (meta.live ? "" : " (עותק שמור)") + "." +
        (S.closed ? "" : " מוצגות קופות שפתוחות לכולם.") + (res.young ? " " + res.young + " מסלולים צעירים מדי לתקופה הזו לא נכנסו לדירוג." : "") + " תשואות עבר אינן מבטיחות תשואות בעתיד, והדירוג אינו המלצה או ייעוץ.";

      // the board
      B("lab").textContent = S.chosen ? "הקופה שבחרתם" : "המקום הראשון " + TRACK_T[S.track];
      rankFlap(String(sel._rank).padStart(digits, "0"));
      B("total").textContent = L.length;
      B("name").textContent = sel.FUND_NAME;
      B("co").textContent = co(sel.MANAGING_CORPORATION);
      var yv = B("y"); if (yv.textContent !== pct(sel._v)) { yv.textContent = pct(sel._v); yv.classList.remove("is-new"); void yv.offsetWidth; yv.classList.add("is-new"); }
      B("ylab").textContent = PERIOD[S.period].t;
      B("fee").textContent = pct(num(sel.AVG_ANNUAL_MANAGEMENT_FEE));
      var sh = num(sel.SHARPE_RATIO); B("sharpe").textContent = sh === null ? "-" : sh.toFixed(2);
      var a = num(sel.TOTAL_ASSETS); B("assets").textContent = a === null ? "-" : (a >= 1000 ? (a / 1000).toFixed(1) + " מיליארד" : Math.round(a) + " מיליון");
      B("sr").textContent = sel.FUND_NAME + ": מקום " + sel._rank + " מתוך " + L.length + ", " + PERIOD[S.period].t + " " + pct(sel._v) + ".";
      // the spread: every fund of the track on one line, low to high, the chosen one lit
      var lo = L[L.length - 1]._v, hi = L[0]._v, span = hi - lo || 1;
      dist.textContent = "";
      L.slice().reverse().forEach(function (r) { var i = document.createElement("i"); i.style.setProperty("--p", ((r._v - lo) / span * 100).toFixed(2) + "%"); if (r.FUND_ID === S.pick) i.className = "on"; dist.appendChild(i); });
    }
    $$(".seg", $(".term-controls", root)).forEach(function (seg) {
      var key = seg.getAttribute("data-seg"), btns = $$("button", seg);
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          btns.forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
          S[key] = b.getAttribute("data-v"); S.open = false;
          draw(true);
        });
        // a radiogroup moves with the arrow keys (RTL: left is forward)
        b.addEventListener("keydown", function (e) {
          var i = btns.indexOf(b), n = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0; if (!n) return;
          e.preventDefault(); var nx = btns[(i + n + btns.length) % btns.length]; nx.focus(); nx.click();
        });
      });
    });
    pub.addEventListener("click", function () { S.closed = !S.closed; pub.setAttribute("aria-pressed", String(!S.closed)); S.open = false; draw(true); });
    more.addEventListener("click", function () { S.open = !S.open; draw(); if (!S.open) root.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); });
    var qt = 0; qi.addEventListener("input", function () { clearTimeout(qt); qt = setTimeout(function () { S.q = qi.value; draw(); }, 120); });
    draw();
  }

  /* ---------- the hero peek: the top three of the default view, from the same data ---------- */
  function peek(all, meta) {
    var box = $("[data-peek-rows]"); if (!box) return;
    var L = rank(all, "hish", "general", "y5", false).list.slice(0, 3);
    box.textContent = "";
    L.forEach(function (r) {
      var li = document.createElement("li");
      [["pr-n", String(r._rank).padStart(2, "0")], ["pr-name", r.FUND_NAME], ["pr-v", pct(r._v)]].forEach(function (c) { var s = document.createElement("span"); s.className = c[0]; s.textContent = c[1]; li.appendChild(s); });
      box.appendChild(li);
    });
    var src = $("[data-peek-src]"); if (src) src.textContent = "גמל נט · " + month(meta.period);
  }

  /* ---------- MV:b43, ported from export/b43.html: the calculator, on the real averages of the tracks ---------- */
  function calc(all) {
    var form = $("[data-calc]"); if (!form) return;
    var out = function (k) { return $('[data-o="' + k + '"]'); };
    var inp = function (k) { return $('[data-c="' + k + '"]', form); };
    var trackBtns = $$('[data-seg="ctrack"] button'), bars = $("[data-bars]"), T = "general";
    // the asset-weighted 5-year average of each track in the study funds open to everyone, and the lowest fee reported in it (funds over 100M)
    var stats = {};
    Object.keys(TRACK).forEach(function (k) {
      var rows = all.filter(function (r) { return r.FUND_CLASSIFICATION === KIND.hish && TRACK[k](r) && PUBLIC(r) && num(r.AVG_ANNUAL_YIELD_TRAILING_5YRS) !== null; });
      var w = 0, s = 0, minFee = null;
      rows.forEach(function (r) { var a = num(r.TOTAL_ASSETS) || 0, f = num(r.AVG_ANNUAL_MANAGEMENT_FEE); w += a; s += a * num(r.AVG_ANNUAL_YIELD_TRAILING_5YRS); if (f !== null && f > 0 && a >= 100 && (minFee === null || f < minFee)) minFee = f; });
      stats[k] = { rate: w ? s / w : 0, minFee: minFee };
    });
    var fv = function (bal, dep, yrs, annual) {
      var m = Math.pow(1 + annual / 100, 1 / 12) - 1, n = Math.round(yrs * 12), g = Math.pow(1 + m, n);
      return bal * g + (m ? dep * (g - 1) / m : dep * n);
    };
    var BARS = 8;
    for (var i = 0; i < BARS; i++) {
      var b = document.createElement("div"), st0 = document.createElement("div"), gn = document.createElement("div"), dp = document.createElement("div"), yr = document.createElement("span");
      b.className = "co-bar"; st0.className = "co-stack"; gn.className = "co-gain"; dp.className = "co-dep"; yr.className = "co-yr";
      st0.appendChild(gn); st0.appendChild(dp); b.appendChild(st0); b.appendChild(yr); bars.appendChild(b);
    }
    var fill = function (el) { var p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty("--p", p.toFixed(1) + "%"); };
    var raf = 0;
    function render() {
      raf = 0;
      var bal = +inp("bal").value, dep = +inp("dep").value, yrs = +inp("yrs").value, fee = +inp("fee").value, st = stats[T], R = st.rate;
      $$('input[type="range"]', form).forEach(fill);
      out("bal").textContent = ils(bal); out("dep").textContent = ils(dep);
      out("yrs").textContent = yrs === 1 ? "שנה אחת" : yrs + " שנים"; out("yrs2").textContent = yrs === 1 ? "שנה" : yrs + " שנים";
      out("fee").textContent = fee.toFixed(2) + "%";
      var net = fv(bal, dep, yrs, R - fee), gross = fv(bal, dep, yrs, R);
      out("sum").textContent = ils(net);
      out("rate").textContent = pct(R);
      out("feecost").textContent = ils(gross - net);
      var best = out("best");
      if (st.minFee !== null && fee > st.minFee + 0.001) best.textContent = "בדמי ניהול של " + st.minFee.toFixed(2) + "%, הנמוכים שדווחו היום במסלול בקופות שפתוחות לכולם, הייתם מסיימים עם עוד " + ils(fv(bal, dep, yrs, R - st.minFee) - net) + ".";
      else best.textContent = "אלה דמי הניהול הנמוכים שדווחו היום במסלול הזה.";
      // the bars: the total at eight points on the way, the deposits under the growth
      var pts = [], k; for (k = 1; k <= BARS; k++) pts.push(Math.max(1, Math.round(yrs * k / BARS)));
      var top = net || 1;
      $$(".co-bar", bars).forEach(function (el, j) {
        var t = pts[j], tot = fv(bal, dep, t, R - fee), put = bal + dep * 12 * t;
        $(".co-stack", el).style.transform = "scaleY(" + Math.max(0.03, tot / top).toFixed(3) + ")";
        $(".co-dep", el).style.flexGrow = Math.max(0, Math.min(put, tot)).toFixed(0);
        $(".co-gain", el).style.flexGrow = Math.max(0, tot - put).toFixed(0);
        $(".co-yr", el).textContent = t;
      });
    }
    var go = function () { if (!raf) raf = requestAnimationFrame(render); };
    $$("input", form).forEach(function (el) { el.addEventListener("input", go); });
    trackBtns.forEach(function (b) {
      b.addEventListener("click", function () { trackBtns.forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); T = b.getAttribute("data-v"); render(); });
      b.addEventListener("keydown", function (e) { var i = trackBtns.indexOf(b), n = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0; if (!n) return; e.preventDefault(); var nx = trackBtns[(i + n + trackBtns.length) % trackBtns.length]; nx.focus(); nx.click(); });
    });
    render();
  }

  /* ---------- the counts that come from the data ---------- */
  function counts(all) {
    var cos = {}; all.forEach(function (r) { cos[co(r.MANAGING_CORPORATION)] = 1; });
    $$("[data-count-funds]").forEach(function (e) { e.textContent = all.length; e.setAttribute("data-to", all.length); });
    $$("[data-count-cos]").forEach(function (e) { e.textContent = Object.keys(cos).length; });
  }

  load().then(function (d) {
    var all = d.records;
    counts(all); peek(all, d); terminal(all, d); calc(all);
    document.dispatchEvent(new CustomEvent("mm:data", { detail: { period: d.period, live: d.live, funds: all.length } }));
  }).catch(function () {
    var n = $("[data-tl-note]"); if (n) n.textContent = "הנתונים לא נטענו כרגע. נסו לרענן את העמוד בעוד רגע.";
  });
})();
