/* מומנטום · the hero globe (Matan, 4.10.2026: "an impressive animation at the top instead of the stock list"; Liav chose the
   dot globe). The land of the world as blue dots (data/globe.json, from Natural Earth via world-atlas, computed once), turning
   slowly, and arcs of light that leave Tel Aviv for the markets: "לראות רחוק" in Matan's own words. Plain canvas 2D, no
   library, no third party. It pauses off screen, draws one still frame in reduced motion, and the page reads without it. */
(function () {
  "use strict";
  var box = document.querySelector("[data-globe]"); if (!box || !box.getContext) return;
  var ctx = box.getContext("2d"), doc = document.documentElement;
  var still = function () { return matchMedia("(prefers-reduced-motion: reduce)").matches || doc.classList.contains("a11y-still"); };
  var D2R = Math.PI / 180, TLV = [32.08, 34.78];
  var HUBS = [[40.71, -74.0], [51.51, -0.13], [50.11, 8.68], [47.37, 8.54], [35.68, 139.69], [22.32, 114.17], [1.35, 103.82], [25.2, 55.27], [37.77, -122.42]];
  var pts = null, W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0, rot = -35, tilt = 40, t0 = 0, raf = 0, on = false, mx = 0, arcs = [];

  function size() {
    var r = box.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; box.width = Math.round(W * dpr); box.height = Math.round(H * dpr);
    // the canvas runs on below the hero into the next section (the seam); the globe sits by the hero's own bottom
    var phone = W < 768, h = box.parentNode.getBoundingClientRect().height || H;
    R = phone ? W * 0.82 : Math.min(W * 0.46, h * 0.92);
    cx = W / 2; cy = h + R * (phone ? 0.26 : 0.36);
  }
  // orthographic projection with a turn around the axis (rot) and a tilt towards the viewer (tilt)
  function proj(lat, lon, alt) {
    var la = lat * D2R, lo = (lon + rot) * D2R, k = 1 + (alt || 0);
    var x = Math.cos(la) * Math.sin(lo) * k, y = Math.sin(la) * k, z = Math.cos(la) * Math.cos(lo) * k;
    var t = tilt * D2R, y2 = y * Math.cos(t) - z * Math.sin(t), z2 = y * Math.sin(t) + z * Math.cos(t);
    return [cx + R * x, cy - R * y2, z2];
  }
  // a point along the great circle between two places, lifted off the surface in the middle
  function along(a, b, f) {
    var la1 = a[0] * D2R, lo1 = a[1] * D2R, la2 = b[0] * D2R, lo2 = b[1] * D2R;
    var p1 = [Math.cos(la1) * Math.cos(lo1), Math.cos(la1) * Math.sin(lo1), Math.sin(la1)], p2 = [Math.cos(la2) * Math.cos(lo2), Math.cos(la2) * Math.sin(lo2), Math.sin(la2)];
    var d = Math.acos(Math.max(-1, Math.min(1, p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2]))), s = Math.sin(d) || 1;
    var A = Math.sin((1 - f) * d) / s, B = Math.sin(f * d) / s, v = [A * p1[0] + B * p2[0], A * p1[1] + B * p2[1], A * p1[2] + B * p2[2]];
    return [Math.atan2(v[2], Math.hypot(v[0], v[1])) / D2R, Math.atan2(v[1], v[0]) / D2R, Math.sin(Math.PI * f) * d * 0.13];
  }
  function spawn(now, i) {
    var to = HUBS[(Math.random() * HUBS.length) | 0];
    arcs[i] = { to: to, start: now + Math.random() * 900, dur: 1700 + Math.random() * 900 };
  }
  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    // the halo behind the sphere: the light comes from below, the page stays white above
    var g = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.18);
    g.addColorStop(0, "rgba(141,184,255,0.16)"); g.addColorStop(1, "rgba(141,184,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, 6.2832); ctx.fill();
    // the land, nearer dots larger and darker
    var dot = W < 768 ? 1.05 : 1.25;
    for (var i = 0; i < pts.length; i += 2) {
      var p = proj(pts[i], pts[i + 1]); if (p[2] <= 0.02) continue;
      ctx.fillStyle = "rgba(29,95,209," + (0.16 + p[2] * 0.62).toFixed(3) + ")";
      var s = dot * (0.55 + p[2] * 0.75); ctx.fillRect(p[0] - s, p[1] - s, s * 2, s * 2);
    }
    // the arcs: a head that travels, a tail that follows, a ring where it lands
    var home = proj(TLV[0], TLV[1]);
    for (var a = 0; a < arcs.length; a++) {
      var A = arcs[a], f = (now - A.start) / A.dur; if (f < 0) continue;
      if (f > 1.6) { spawn(now, a); continue; }
      var head = Math.min(1, f), tail = Math.max(0, f - 0.45), steps = 34, prev = null;
      ctx.lineWidth = 1.6; ctx.lineCap = "round";
      for (var k = 0; k <= steps; k++) {
        var u = tail + (head - tail) * (k / steps), q = along(TLV, A.to, u), P = proj(q[0], q[1], q[2]);
        if (prev && P[2] > -0.05 && prev[2] > -0.05) {
          ctx.strokeStyle = "rgba(29,95,209," + (0.15 + 0.75 * (k / steps)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(P[0], P[1]); ctx.stroke();
        }
        prev = P;
      }
      if (f >= 1 && f < 1.6) {
        var T = proj(A.to[0], A.to[1]); if (T[2] > 0) {
          var e = (f - 1) / 0.6; ctx.strokeStyle = "rgba(29,95,209," + (0.6 * (1 - e)).toFixed(3) + ")";
          ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(T[0], T[1], 3 + e * 14, 0, 6.2832); ctx.stroke();
        }
      }
    }
    // home: Tel Aviv, a steady point with a slow pulse
    if (home[2] > 0) {
      var pu = (now % 2400) / 2400;
      ctx.fillStyle = "rgba(29,95,209," + (0.35 * (1 - pu)).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(home[0], home[1], 4 + pu * 12, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#1D5FD1"; ctx.beginPath(); ctx.arc(home[0], home[1], 3.6, 0, 6.2832); ctx.fill();
    }
  }
  function frame(now) {
    raf = 0; if (!on) return;
    if (!t0) t0 = now;
    // Israel stays in front: the globe sways 30 degrees each way around it, slowly; the pointer leans it a little
    rot = -35 + Math.sin((now - t0) / 9000) * 30 + mx * 8;
    draw(now); raf = requestAnimationFrame(frame);
  }
  function start() { if (on || still()) return; on = true; t0 = 0; if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  fetch("data/globe.json").then(function (r) { return r.json(); }).then(function (d) {
    var phone = innerWidth < 768;
    pts = phone ? d.filter(function (v, i) { return (i >> 1) % 2 === 0; }) : d;   // half the dots on a phone
    for (var i = 0; i < (phone ? 4 : 6); i++) spawn(performance.now(), i);
    size(); draw(performance.now() + 1200); box.classList.add("on");
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(box);
    else start();
    addEventListener("resize", function () { size(); if (!on) draw(performance.now()); });
    addEventListener("pointermove", function (e) { mx = (e.clientX / innerWidth - 0.5); }, { passive: true });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  }).catch(function () { /* the hero reads without the globe */ });
})();
