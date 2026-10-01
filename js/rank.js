/* מומנטום · 02 the comparison: every fund open to the public in one table, from gemelnet (data/funds.json, the Ministry
   of Finance register). The default view is in the HTML already (build.mjs); this makes it live: the product, the track and
   the period re-rank it, a row or the list marks "yours", the rows glide to their new places (MV:g23, Flip) and the place
   number turns over like a trading board (MV:g100, from export/g100.html). Then 09, the calculator of Matan's sketch with
   its chart redrawn live (MV:b43). */
(function () {
  "use strict";
  var R = window.RankCore; if (!R) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var doc = document.documentElement, reduced = matchMedia("(prefers-reduced-motion: reduce)");
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var still = function () { return reduced.matches || doc.classList.contains("a11y-still"); };
  var moving = function () { return !still() && window.gsap && window.Flip; };
  if (window.gsap && window.Flip) window.gsap.registerPlugin(window.Flip);

  /* ---------- MV:g100 the split-flap board: each tile remembers where it is going (t._to), so fast clicks land right ---------- */
  function Flap(el) {
    var tiles = $$(".sf-t", el);
    function size(n) {
      while (tiles.length < n) { var t = document.createElement("span"); t.className = "sf-t"; t.textContent = "0"; el.appendChild(t); tiles.push(t); }
      while (tiles.length > n) el.removeChild(tiles.pop());
    }
    return function (text) {
      size(text.length);
      var G = window.gsap;
      tiles.forEach(function (t, i) {
        var ch = text[i];
        if ((t._to || t.textContent) === ch) return;
        t._to = ch;
        if (still() || !G) { t.textContent = ch; return; }
        G.killTweensOf(t); G.set(t, { rotateX: 0 });
        G.timeline({ delay: i * 0.05 })
          .to(t, { rotateX: -90, duration: 0.18, ease: "power2.in", onComplete: function () { t.textContent = ch; } })
          .set(t, { rotateX: 90 })
          .to(t, { rotateX: 0, duration: 0.3, ease: "power3.out" });
      });
    };
  }

  var root = $("[data-rank]");
  var all = null, S = { kind: "hish", track: "general", period: "y5", pick: null, open: false };
  var list = root && $("[data-list]", root), more = root && $("[data-more]", root), pick = root && $("[data-pick]", root);
  var flap = root && Flap($("[data-r-flap]", root));

  function label(r) { return "מקום " + r.rank + ": " + r.name + ", " + r.co + ". " + R.PERIOD[S.period].col + " " + R.pct(r.v) + (r.fee !== null ? ", דמי ניהול " + R.pct(r.fee) : ""); }
  function rowEl(r) {
    var li = document.createElement("li"); li.setAttribute("data-flip-id", r.id);
    li.innerHTML = '<button class="rk-row" type="button" data-id="' + r.id + '"><span class="r"></span><span class="n"><b><span class="nm"></span><span class="mine">שלכם</span></b><small></small></span><span class="v"></span><span class="f"></span></button>';
    return li;
  }
  function fillRow(li, r) {
    var b = li.firstChild;
    b.setAttribute("aria-pressed", String(S.pick === r.id));
    b.setAttribute("aria-label", label(r));
    $(".r", b).textContent = r.rank;
    $(".nm", b).textContent = r.brand;
    $("small", b).textContent = r.name;
    $(".v", b).textContent = R.pct(r.v);
    $(".f", b).textContent = r.fee === null ? "-" : R.pct(r.fee);
  }
  function render(animate) {
    if (!all || !list) return;
    var L = R.rank(all, S.kind, S.track, S.period).list;
    if (S.pick && !L.some(function (r) { return r.id === S.pick; })) S.pick = null;
    var many = L.length > 12, show = (!many || S.open) ? L : L.slice(0, 10);
    var mine = S.pick && L.filter(function (r) { return r.id === S.pick; })[0];
    if (mine && show.indexOf(mine) < 0) show = show.concat([null, mine]);

    var state = animate && moving() ? window.Flip.getState($$("li[data-flip-id]", list)) : null;
    var old = {}; $$("li[data-flip-id]", list).forEach(function (li) { old[li.getAttribute("data-flip-id")] = li; });
    var frag = document.createDocumentFragment();
    show.forEach(function (r) {
      if (!r) { var g = document.createElement("li"); g.className = "rk-gap"; g.setAttribute("aria-hidden", "true"); g.textContent = "···"; frag.appendChild(g); return; }
      var li = old[r.id] || rowEl(r); delete old[r.id]; fillRow(li, r); frag.appendChild(li);
    });
    list.textContent = ""; list.appendChild(frag);
    if (state) window.Flip.from(state, { duration: 0.55, ease: "power2.inOut", absolute: false, nested: false,
      onEnter: function (els) { return window.gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.03 }); } });

    $("[data-col]", root).textContent = R.PERIOD[S.period].col;
    if (more) {
      more.hidden = !many;
      more.setAttribute("aria-expanded", String(S.open));
      more.textContent = S.open ? "להציג רק את העשר הראשונות" : "להציג את כל " + L.length + " הקופות";
    }
    if (pick) {
      var cur = S.pick || "";
      pick.innerHTML = '<option value="">לבחור מהרשימה</option>' + L.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "he"); })
        .map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("");
      pick.value = cur;
    }
    var who = mine || L[0];
    var of = $("[data-r-of]", root), wh = $("[data-r-who]", root), note = $("[data-note]", root);
    if (!who) { flap("00"); of.textContent = "אין עדיין קופות עם נתונים לתקופה הזו"; wh.textContent = ""; note.textContent = ""; return; }
    flap(String(who.rank).padStart(2, "0"));
    of.textContent = (mine ? "מקום " + who.rank : "מקום ראשון") + " מתוך " + L.length + " " + R.TRACK[S.track].in;
    wh.textContent = who.name;
    var gapTo = L[0].v - who.v;
    note.innerHTML = (S.period === "ytd" ? "תשואה מתחילת השנה: <b>" : "ממוצע שנתי של <b>") + R.pct(who.v) + "</b>" + (S.period === "ytd" ? "" : " ב" + (S.period === "y3" ? "שלוש" : "חמש") + " השנים האחרונות") +
      (who.fee !== null ? ", דמי ניהול <b>" + R.pct(who.fee) + "</b>" : "") + "." +
      (mine && who.rank > 1 ? " הפער מהראשונה: <b>" + gapTo.toFixed(2) + "%</b>" + (S.period === "ytd" ? "." : " בשנה.") : mine ? " זו הראשונה במסלול." : " בחרו את הקופה שלכם ברשימה או בטבלה.");
  }
  function seg(name, on) {
    var g = $('[data-seg="' + name + '"]'); if (!g) return;
    var bs = $$("button", g);
    bs.forEach(function (b, i) {
      b.addEventListener("click", function () { bs.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); on(b.getAttribute("data-v")); });
      b.addEventListener("keydown", function (e) { var n = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0; if (!n) return; e.preventDefault(); var nx = bs[(i + n + bs.length) % bs.length]; nx.focus(); nx.click(); });
    });
  }
  if (root) {
    seg("kind", function (v) { S.kind = v; S.open = false; render(true); });
    seg("track", function (v) { S.track = v; S.open = false; render(true); });
    seg("period", function (v) { S.period = v; render(true); });
    list.addEventListener("click", function (e) {
      var b = e.target.closest(".rk-row"); if (!b) return;
      var id = b.getAttribute("data-id"); S.pick = S.pick === id ? null : id; render(true);
      var nb = $('.rk-row[data-id="' + id + '"]', list); if (nb) nb.focus({ preventScroll: true });
      // on a phone and a tablet the big number sits above the list: bring it into view so the flip is seen
      if (innerWidth < 1024) { var ro = $("[data-readout]", root), top = ro.getBoundingClientRect().top; if (top < 0 || top > innerHeight * 0.6) scrollBy({ top: top - 96, behavior: still() ? "auto" : "smooth" }); }
    });
    if (pick) pick.addEventListener("change", function () { S.pick = pick.value || null; render(true); });
    if (more) more.addEventListener("click", function () { S.open = !S.open; render(true); });
    fetch("data/funds.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { all = d.records; render(false); })
      .catch(function () { /* the table in the HTML stays: the default view, already ranked */ });
  }

  /* ---------- 09 the calculator (MV:b43): every change redraws the three lines, the sums and the scenario cards ---------- */
  var calc = $("[data-calc]");
  if (calc) {
    var ins = $$("[data-c]", calc), real = $("[data-c-real]", calc), err = $("[data-c-err]", calc), M = window.MOMENTUM || {};
    var out = { main: $("[data-c-main]", calc), dep: $("[data-c-dep]", calc), gain: $("[data-c-gain]", calc), gainl: $("[data-c-gainl]", calc), chart: $("[data-c-chart]", calc), scen: $("[data-c-scen]", calc) };
    var title = out.chart.querySelector("title");
    var draw = function () {
      if (ins.some(function (i) { return i.value === "" || !i.validity.valid; })) {
        err.textContent = "יש להזין ערכים תקינים בכל השדות, בטווחים המותרים.";
        ins.forEach(function (i) { i.setAttribute("aria-invalid", String(i.value === "" || !i.validity.valid)); });
        return;
      }
      err.textContent = ""; ins.forEach(function (i) { i.removeAttribute("aria-invalid"); });
      var p = { real: real.checked }; ins.forEach(function (i) { p[i.getAttribute("data-c")] = +i.value; });
      var C = R.scenarios(p);
      out.main.textContent = R.ils(C.rows[1].value);
      out.dep.textContent = R.ils(C.deposits);
      out.gainl.textContent = p.real ? "שינוי מעבר להפקדות במחירי היום" : "שינוי מעבר להפקדות";
      out.gain.textContent = R.ils(C.gain);
      out.chart.innerHTML = R.chart(C, p.years); out.chart.insertBefore(title, out.chart.firstChild);
      out.scen.innerHTML = R.scenCards(C);
    };
    ins.forEach(function (i) { i.addEventListener("input", draw); });
    real.addEventListener("change", draw);
    var fillBtn = $("[data-c-gemel]", calc);
    if (fillBtn && M.rateGeneral) fillBtn.addEventListener("click", function () { var r = $('[data-c="rate"]', calc); r.value = M.rateGeneral.toFixed(1); draw(); r.focus({ preventScroll: true }); });
  }
})();
