/* The ranking: every provident and study fund track open to the public, from gemelnet (the Ministry of Finance's open
   register, data.gov.il). Shared by the page (window.RankCore) and by build.mjs, which pre-renders the default table so the
   page reads right without scripts. No numbers here are invented: every figure is a field of the register or arithmetic on it. */
(function (root) {
  "use strict";
  var KIND = {
    hish: { f: "קרנות השתלמות", t: "קרנות השתלמות", one: "קרן השתלמות" },
    gemel: { f: "תגמולים ואישית לפיצויים", t: "קופות גמל", one: "קופת גמל" },
    invest: { f: "קופת גמל להשקעה", t: "גמל להשקעה", one: "קופת גמל להשקעה" }
  };
  var BONDS = ["אשראי ואג\"ח", "אג\"ח סחיר", "עוקב מדדי אג\"ח", "אג\"ח ממשלות"];
  var TRACK = {
    general: { t: "כללי", in: "במסלול הכללי", is: function (r) { return r.SPECIALIZATION === "כללי" && r.SUB_SPECIALIZATION === "כללי"; } },
    stocks: { t: "מניות", in: "במסלולי המניות", is: function (r) { return r.SUB_SPECIALIZATION === "מניות" || r.SUB_SPECIALIZATION === "מניות סחיר"; } },
    sp: { t: "S&P 500", in: "במסלול S&P 500", is: function (r) { return String(r.SUB_SPECIALIZATION || "").toLowerCase() === "עוקב מדד s&p 500"; } },
    bonds: { t: "אג\"ח", in: "במסלולי האג\"ח", is: function (r) { return BONDS.indexOf(r.SUB_SPECIALIZATION) > -1; } }
  };
  var PERIOD = {
    ytd: { f: "YEAR_TO_DATE_YIELD", t: "מתחילת השנה", col: "מתחילת השנה" },
    y3: { f: "AVG_ANNUAL_YIELD_TRAILING_3YRS", t: "3 שנים", col: "ממוצע שנתי" },
    y5: { f: "AVG_ANNUAL_YIELD_TRAILING_5YRS", t: "5 שנים", col: "ממוצע שנתי" }
  };
  var MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  var num = function (v) { if (v === null || v === undefined || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; };
  // a fund of a sector or one employer is real data, but most visitors cannot join it; a self-managed (IRA) track has no
  // single return (the register prints 0 for it), so neither is ranked
  var PUBLIC = function (r) { return r.TARGET_POPULATION === "כלל האוכלוסיה" && !/בניהול אישי|IRA/i.test(r.FUND_NAME || ""); };
  var co = function (s) { return String(s || "").replace(/\s*בע"?מ\.?$/, "").replace(/\s+/g, " ").trim(); };
  var name = function (s) { return String(s || "").replace(/\s+/g, " ").trim(); };
  // the short brand of the managing company, as in Matan's sketch ("כלל", "מגדל"): the full name stays on the line under it
  var BRANDS = ["אלטשולר שחם", "ילין לפידות", "אינפיניטי", "אנליסט", "הפניקס", "מנורה", "הראל", "מגדל", "מיטב", "מור", "כלל", "איילון", "אקסלנס", "פסגות", "סלייס", "ספקטרום"];
  var brand = function (s) { s = co(s); for (var i = 0; i < BRANDS.length; i++) if (s.indexOf(BRANDS[i]) > -1) return BRANDS[i]; return s; };
  var pct = function (v, d) { return v === null ? "-" : v.toFixed(d === undefined ? 2 : d) + "%"; };
  var month = function (p) { p = String(p); return MONTHS[+p.slice(4, 6) - 1] + " " + p.slice(0, 4); };
  var ils = function (v) { return Math.round(v).toLocaleString("he-IL") + " ₪"; };

  function rank(all, kind, track, period) {
    var f = PERIOD[period].f;
    var rows = all.filter(function (r) { return r.FUND_CLASSIFICATION === KIND[kind].f && TRACK[track].is(r) && PUBLIC(r); });
    var ranked = rows.filter(function (r) { return num(r[f]) !== null; })
      .map(function (r) { return { id: String(r.FUND_ID), name: name(r.FUND_NAME), co: co(r.MANAGING_CORPORATION), brand: brand(r.MANAGING_CORPORATION), v: num(r[f]), fee: num(r.AVG_ANNUAL_MANAGEMENT_FEE), assets: num(r.TOTAL_ASSETS) || 0 }; })
      .sort(function (a, b) { return b.v - a.v || b.assets - a.assets; });
    ranked.forEach(function (r, i) { r.rank = i + 1; });
    return { list: ranked, young: rows.length - ranked.length };
  }
  // the asset-weighted 5-year average of a track in the study funds open to the public (the calculator's rates)
  function trackRate(all, track) {
    var f = PERIOD.y5.f, s = 0, w = 0;
    all.forEach(function (r) {
      if (r.FUND_CLASSIFICATION !== KIND.hish.f || !TRACK[track].is(r) || !PUBLIC(r)) return;
      var v = num(r[f]), a = num(r.TOTAL_ASSETS); if (v === null || !a) return; s += v * a; w += a;
    });
    return w ? s / w : null;
  }
  // future value: today's sum and a monthly deposit, compounded monthly at an annual rate
  function grow(start, monthly, years, rate) {
    var m = Math.pow(1 + rate / 100, 1 / 12) - 1, n = Math.round(years * 12), fv = start * Math.pow(1 + m, n);
    fv += m ? monthly * (Math.pow(1 + m, n) - 1) / m : monthly * n;
    return fv;
  }
  // the gap: first minus last of one ranking, and what it means on a sum over ten years if the returns held
  function gap(all, kind, track, sum, years) {
    var L = rank(all, kind, track, "y5").list; if (L.length < 2) return null;
    var a = L[0], z = L[L.length - 1];
    return { first: a, last: z, n: L.length, gap: a.v - z.v, money: sum * (Math.pow(1 + a.v / 100, years) - Math.pow(1 + z.v / 100, years)) };
  }

  /* ---------- 03 the portfolio mixes of Matan's sketch (illustration only: stocks, bonds, cash) ---------- */
  var ALLOC_LABELS = ["מניות", "אג\"ח", "מזומן"];
  var ALLOC = {
    liquid: { values: [20, 40, 40], note: "דוגמה לחלק גדול יותר של מזומן, לצד אג\"ח ומניות. גם אג\"ח ומניות עשויים לרדת; זמינות הכסף תלויה בנכסים ובמוצרים בפועל." },
    balanced: { values: [50, 40, 10], note: "דוגמה לשילוב מניות, אג\"ח ומזומן. החלוקה אינה מספרת לבדה את כל הסיכון: חשוב להבין ענפים, מטבעות, מח\"מ ואיכות אשראי." },
    equity: { values: [80, 15, 5], note: "דוגמה לחשיפה מנייתית גדולה יותר, העלולה להיות כרוכה בתנודתיות ובהפסד משמעותי. זו המחשת מבנה בלבד." }
  };

  /* ---------- 09 the calculator: the model of Matan's sketch, kept as it is. A constant effective annual rate after
     the fee from the balance, compounded monthly, the deposit at the end of each month; in today's prices the balance is
     divided by inflation. Three scenarios: the rate entered, two points below and two above ---------- */
  function project(p, rate) {
    var f = Math.pow((1 + rate / 100) * (1 - p.fee / 100), 1 / 12), b = p.principal, pts = [p.principal];
    for (var m = 1; m <= p.years * 12; m++) { b = b * f + p.monthly; if (m % 12 === 0) pts.push(p.real ? b / Math.pow(1 + p.inflation / 100, m / 12) : b); }
    return { value: pts[pts.length - 1], points: pts };
  }
  function scenarios(p) {
    var rates = [p.rate - 2, p.rate, p.rate + 2], rows = rates.map(function (r) { return project(p, r); });
    var deposits = p.principal + p.monthly * p.years * 12, comparable = deposits;
    if (p.real) { comparable = p.principal; for (var m = 1; m <= p.years * 12; m++) comparable += p.monthly / Math.pow(1 + p.inflation / 100, m / 12); }
    return { rates: rates, rows: rows, deposits: deposits, gain: rows[1].value - comparable, real: !!p.real };
  }
  var compact = function (n) { var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M" : a >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n)); };
  // the chart as SVG markup (the page redraws it with the same function): three lines over four grid lines
  function chart(C, years) {
    var W = 600, H = 260, L = 64, T = 12, Rr = 16, B = 34, max = Math.max.apply(null, C.rows.reduce(function (a, r) { return a.concat(r.points); }, [1])) * 1.1;
    var x = function (i) { return L + i / years * (W - L - Rr); }, y = function (n) { return H - B - n / max * (H - T - B); };
    var s = "";
    for (var i = 0; i < 4; i++) { var v = max * i / 3; s += '<line class="gl" x1="' + L + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + y(v).toFixed(1) + '"/><text class="tk" x="' + (L - 10) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + compact(v) + "</text>"; }
    ["lo", "base", "hi"].forEach(function (k, j) { s += '<path class="ln ' + k + '" d="' + C.rows[j].points.map(function (v, n) { return (n ? "L" : "M") + x(n).toFixed(1) + "," + y(v).toFixed(1); }).join(" ") + '"/>'; });
    s += '<text class="tk" x="' + L + '" y="' + (H - 8) + '" text-anchor="start">היום</text><text class="tk" x="' + (W - Rr) + '" y="' + (H - 8) + '" text-anchor="end">בעוד ' + years + " שנים</text>";
    return s;
  }
  function scenCards(C) {
    return C.rows.map(function (r, i) { return '<div class="sc' + (i === 1 ? " base" : "") + '"><span>תשואה של ' + C.rates[i].toFixed(1) + "% בשנה</span><b>" + ils(r.value) + "</b></div>"; }).join("");
  }

  var api = { KIND: KIND, TRACK: TRACK, PERIOD: PERIOD, rank: rank, trackRate: trackRate, grow: grow, gap: gap, num: num, pct: pct, month: month, ils: ils,
    ALLOC: ALLOC, ALLOC_LABELS: ALLOC_LABELS, scenarios: scenarios, chart: chart, scenCards: scenCards };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RankCore = api;
})(typeof window !== "undefined" ? window : this);
