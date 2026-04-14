!(function () {
        var t,
          n,
          a = !1,
          e = [],
          o = [],
          r = 0,
          i = [],
          h = 0,
          s = 0,
          d =
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints > 1 && window.innerWidth < 1024),
          m = d ? 150 : 400,
          u = d ? 30 : 60,
          l = [
            function () {
              return (
                "Серотонин 5-HT2A: " +
                (72 + 15 * Math.random()).toFixed(1) +
                "%"
              );
            },
            function () {
              return (
                "ニューロン同期: " + (0.82 + 0.12 * Math.random()).toFixed(2)
              );
            },
            function () {
              return "དབངས་རྐྱེན སྐྱེད: སྐྱེད་ཀྱི";
            },
            function () {
              return "Таламический шлюз: НОРМА";
            },
            function () {
              return "視覚ストリーム: 完全";
            },
            function () {
              return (
                "Энтропия: " + (4.1 + 0.8 * Math.random()).toFixed(2) + " бит"
              );
            },
            function () {
              return (
                "སེམས་ཀྱི་རྒྱུན: " +
                (9.2 + 2 * Math.random()).toFixed(1) +
                " Hz"
              );
            },
            function () {
              return "デフォルトネット: 整合性";
            },
            function () {
              return (
                "GABA тонус: " + (88 + 8 * Math.random()).toFixed(1) + " мВ"
              );
            },
            function () {
              return (
                "དབངས་རྐྱེན NMDA: " +
                (12 + 5 * Math.random()).toFixed(1) +
                " pA"
              );
            },
          ],
          f = [
            function () {
              return (
                "!! НАСЫЩЕНИЕ 5-HT2A: " +
                (94 + 6 * Math.random()).toFixed(1) +
                "%"
              );
            },
            function () {
              return "!! デフォルトネット: 崩壊";
            },
            function () {
              return "!! སྒོ་རིམ དབངས: བརལགས";
            },
            function () {
              return (
                "!! Энтропия ВСПЛЕСК: " + (7.2 + 3 * Math.random()).toFixed(2)
              );
            },
            function () {
              return "!! 視覚: クロスモーダル";
            },
            function () {
              return "!! བདག་གི་མཚ་མས: བརལགས";
            },
            function () {
              return "!! ЭГО-ГРАНИЦА: НЕ ОПРЕДЕЛЕНА";
            },
            function () {
              return "!! 扁桃体 オーバーライド";
            },
            function () {
              return "!! དངོས་ཀྱི་བརྟག་དཔཡད: བརལགས";
            },
            function () {
              return "!! フラクタル V1/V2 検出";
            },
            function () {
              return "!! БАЙЕСОВСКИЙ ПРИОР: ПОВРЕЖДЕН";
            },
            function () {
              return "!! DMN-TPN クロストーク 検出";
            },
            function () {
              return (
                "!! СЕРОТОНИНОВЫЙ ШТОРМ: ФАЗА " +
                (Math.floor(4 * Math.random()) + 1)
              );
            },
          ];
        function c(t, n, a, e, o, r, i) {
          for (
            var h = [],
              s = 35 + Math.floor(25 * Math.random()),
              d = e.x + (Math.random() - 0.5) * o,
              m = e.y + (Math.random() - 0.5) * o,
              u = a + 0.5 * (Math.random() - 0.5),
              l = 3.5 + 4 * Math.random(),
              f = 0.48 * t,
              c = 0.42 * n,
              p = 0.38 * t,
              M = 0.35 * n,
              g = 0.06 * (Math.random() - 0.5),
              w = 0;
            w < s;
            w++
          ) {
            (h.push({ x: d, y: m }), (u += g + 0.1 * (Math.random() - 0.5)));
            var v = (d - f) / p,
              y = (m - c) / M,
              x = Math.sqrt(v * v + y * y);
            if (x > 0.7)
              u += (Math.atan2(c - m, f - d) - u) * (0.08 * (x - 0.7));
            ((d += Math.cos(u) * l),
              (m += Math.sin(u) * l),
              (l *= 0.985 + 0.03 * Math.random()));
          }
          return {
            points: h,
            hue: r + 25 * (Math.random() - 0.5),
            saturation: 65 + 35 * Math.random(),
            thickness: 0.5 + 2 * Math.random(),
            alpha: 0.25 + 0.5 * Math.random(),
            growProgress: 0,
            growSpeed: 0.006 + 0.01 * Math.random() + 0.004 * i,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmp: 0.2 + 0.8 * Math.random(),
            fireTimer: 0,
            age: 0,
          };
        }
        function p(t, n, a) {
          if (!(e.length >= m)) {
            var o,
              r,
              i,
              h,
              s,
              d,
              u = 6 + Math.floor(10 * Math.random() + 3 * a),
              l = 0.48 * t,
              f = 0.42 * n,
              p = 0.38 * t,
              M = 0.35 * n,
              g = Math.floor(6 * Math.random());
            if (0 === g)
              ((o = l - p * (0.3 + 0.5 * Math.random())),
                (r = f - M * (0.2 + 0.4 * Math.random())),
                (i = 0.6 * Math.random() - 0.3),
                (h = 350 + 25 * Math.random()),
                (s = 8 + 12 * Math.random()),
                (d = 0.03 + 0.02 * Math.random()));
            else if (1 === g)
              ((o = l + (Math.random() - 0.5) * p * 0.3),
                (r = f + M * (0.4 + 0.3 * Math.random())),
                (i = -Math.PI / 2 + 0.4 * (Math.random() - 0.5)),
                (h = 220 + 60 * Math.random()),
                (s = 6 + 10 * Math.random()),
                (d = 0.01 + 0.02 * Math.random()));
            else if (2 === g)
              ((o = l - p * (0.1 + 0.3 * Math.random())),
                (r = f + (Math.random() - 0.5) * M * 0.4),
                (i = 0.3 + 0.8 * Math.random()),
                (h = 100 + 60 * Math.random()),
                (s = 10 + 15 * Math.random()),
                (d = 0.04 + 0.03 * Math.random()));
            else if (3 === g) {
              var w = Math.random() * Math.PI;
              ((o = l + Math.cos(w) * p * 0.6),
                (r = f - Math.sin(w) * M * 0.6),
                (i = w + Math.PI / 2 + 0.3 * (Math.random() - 0.5)),
                (h = 30 + 40 * Math.random()),
                (s = 5 + 8 * Math.random()),
                (d = 0.05 + 0.02 * Math.random()));
            } else
              4 === g
                ? ((o = l - p * (0.2 + 0.2 * Math.random())),
                  (r = f - 0.1 * M),
                  (i = 0.6 * Math.PI + 0.4 * (Math.random() - 0.5)),
                  (h = 300 + 40 * Math.random()),
                  (s = 8 + 10 * Math.random()),
                  (d = 0.06 + 0.03 * Math.random()))
                : ((o = l + (Math.random() - 0.5) * p * 0.2),
                  (r = f + (Math.random() - 0.5) * M * 0.2),
                  (i = Math.random() * Math.PI * 2),
                  (h = 360 * Math.random()),
                  (s = 12 + 18 * Math.random()),
                  (d = 0.02 + 0.04 * Math.random()));
            a > 0.7 && Math.random() < 0.3 && (h = 280 + 80 * Math.random());
            for (var v = 0; v < u && !(e.length >= m); v++) {
              var y = c(t, n, i, { x: o, y: r }, s, h, a);
              ((y._curveStrength = d),
                (y._brainCX = l),
                (y._brainCY = f),
                (y._brainRX = p),
                (y._brainRY = M),
                e.push(y));
            }
          }
        }
        function M() {
          if (a && t && n) {
            var d = performance.now(),
              c = 0.001 * d,
              g = t._lw,
              w = t._lh,
              v = (function () {
                var t = window.currentZone3;
                if (t)
                  return {
                    trip: t.neuralIntensity || t.z3Trip || 0.5,
                    zone: 3,
                  };
                var n = window.currentZone2;
                return n
                  ? { trip: n.neuralIntensity || n.z2Trip || 0.3, zone: 2 }
                  : "undefined" != typeof tripIntensity
                    ? { trip: tripIntensity, zone: 1 }
                    : { trip: 0.2, zone: 0 };
              })(),
              y = v.trip;
            (n.clearRect(0, 0, g, w), s++);
            var x = 8 + Math.floor(20 / (1 + y));
            (s % x === 0 &&
              (!(function () {
                if (!(e.length < 0.9 * m)) {
                  for (
                    var t = Math.floor(0.15 * m), n = [], a = 0;
                    a < e.length;
                    a++
                  )
                    e[a].growProgress >= 1 && n.push(a);
                  n.sort(function (t, n) {
                    return e[n].age - e[t].age;
                  });
                  var o = {};
                  for (a = 0; a < Math.min(t, n.length); a++) o[n[a]] = !0;
                  e = e.filter(function (t, n) {
                    return !o[n];
                  });
                }
              })(),
              p(g, w, y)),
              (function (t, a) {
                for (var o = 0; o < e.length; o++) {
                  var r = e[o];
                  ((r.growProgress = Math.min(1, r.growProgress + r.growSpeed)),
                    r.age++);
                  var i = Math.max(
                      2,
                      Math.floor(r.points.length * r.growProgress),
                    ),
                    h = Math.sin(0.3 * t + r.swayPhase) * r.swayAmp,
                    s =
                      Math.cos(0.25 * t + 1.3 * r.swayPhase) * r.swayAmp * 0.7;
                  ((h *= 1 + 0.8 * a),
                    (s *= 1 + 0.8 * a),
                    (r.fireTimer = Math.max(0, r.fireTimer - 0.01)));
                  var d = r.fireTimer,
                    m = r.hue + 5 * Math.sin(0.2 * t + 0.1 * o),
                    u = r.saturation,
                    l = 45 + 35 * d,
                    f =
                      r.alpha * (0.85 + 0.15 * Math.sin(0.5 * t + r.swayPhase));
                  (r.growProgress < 0.3 && (f *= r.growProgress / 0.3),
                    n.beginPath(),
                    n.moveTo(r.points[0].x + h, r.points[0].y + s));
                  for (var c = 1; c < i; c++) {
                    var p = c / r.points.length,
                      M =
                        h +
                        Math.sin(0.8 * t + 0.3 * c + r.swayPhase) *
                          p *
                          2 *
                          (1 + a),
                      g =
                        s +
                        Math.cos(0.6 * t + 0.4 * c + r.swayPhase) *
                          p *
                          1.5 *
                          (1 + a);
                    if (c < i - 1) {
                      var w = r.points[c + 1],
                        v = r.points[c].x + M,
                        y = r.points[c].y + g,
                        x =
                          h +
                          Math.sin(0.8 * t + 0.3 * (c + 1) + r.swayPhase) *
                            ((c + 1) / r.points.length) *
                            2 *
                            (1 + a),
                        b =
                          s +
                          Math.cos(0.6 * t + 0.4 * (c + 1) + r.swayPhase) *
                            ((c + 1) / r.points.length) *
                            1.5 *
                            (1 + a),
                        P = 0.5 * (v + w.x + x),
                        _ = 0.5 * (y + w.y + b);
                      n.quadraticCurveTo(v, y, P, _);
                    } else n.lineTo(r.points[c].x + M, r.points[c].y + g);
                  }
                  ((n.strokeStyle =
                    "hsla(" +
                    (0 | m) +
                    "," +
                    (0 | u) +
                    "%," +
                    (0 | l) +
                    "%," +
                    f.toFixed(3) +
                    ")"),
                    (n.lineWidth = r.thickness + 2 * d),
                    (n.lineCap = "round"),
                    (n.lineJoin = "round"),
                    n.stroke(),
                    d > 0.1 &&
                      ((n.strokeStyle =
                        "hsla(" +
                        (0 | m) +
                        ",100%,70%," +
                        (0.3 * d).toFixed(3) +
                        ")"),
                      (n.lineWidth = r.thickness + 5 * d),
                      n.stroke()));
                }
              })(c, y),
              (function (t, a) {
                if (
                  o.length < u &&
                  e.length > 0 &&
                  Math.random() < 0.04 + 0.06 * a
                ) {
                  var r = Math.floor(Math.random() * e.length);
                  e[r].growProgress > 0.5 &&
                    o.push({
                      fiberIdx: r,
                      progress: 0,
                      speed: 0.008 + 0.006 * a + 0.005 * Math.random(),
                      size: 2 + 1.5 * a,
                    });
                }
                for (var i = o.length - 1; i >= 0; i--) {
                  var h = o[i];
                  if (((h.progress += h.speed), h.progress >= 1))
                    (e[h.fiberIdx] && (e[h.fiberIdx].fireTimer = 1),
                      o.splice(i, 1));
                  else {
                    var s = e[h.fiberIdx];
                    if (s) {
                      var d = Math.floor(
                        h.progress * (s.points.length - 1) * s.growProgress,
                      );
                      d = Math.min(d, s.points.length - 1);
                      var m = s.points[d];
                      if (m) {
                        var l =
                            Math.sin(0.3 * t + s.swayPhase) *
                            s.swayAmp *
                            (1 + 0.8 * a),
                          f =
                            Math.cos(0.25 * t + 1.3 * s.swayPhase) *
                            s.swayAmp *
                            0.7 *
                            (1 + 0.8 * a),
                          c = d / s.points.length,
                          p =
                            m.x +
                            l +
                            Math.sin(0.8 * t + 0.3 * d + s.swayPhase) *
                              c *
                              2 *
                              (1 + a),
                          M =
                            m.y +
                            f +
                            Math.cos(0.6 * t + 0.4 * d + s.swayPhase) *
                              c *
                              1.5 *
                              (1 + a),
                          g = n.createRadialGradient(p, M, 0, p, M, 4 * h.size);
                        (g.addColorStop(
                          0,
                          "hsla(" + (0 | s.hue) + ", 100%, 90%, 0.95)",
                        ),
                          g.addColorStop(
                            0.3,
                            "hsla(" + (0 | s.hue) + ", 100%, 70%, 0.4)",
                          ),
                          g.addColorStop(
                            1,
                            "hsla(" + (0 | s.hue) + ", 80%, 50%, 0)",
                          ),
                          n.beginPath(),
                          n.arc(p, M, 4 * h.size, 0, 2 * Math.PI),
                          (n.fillStyle = g),
                          n.fill());
                      }
                    } else o.splice(i, 1);
                  }
                }
              })(c, y),
              (function (t, n) {
                if (!(t - h < 2200)) {
                  var a;
                  ((h = t),
                    (a =
                      Math.random() < Math.min(0.9, 0.5 * n)
                        ? f[Math.floor(Math.random() * f.length)]()
                        : l[Math.floor(Math.random() * l.length)]()));
                  var e = ((t - r) / 1e3).toFixed(1);
                  (i.unshift("[T+" + e + "s] " + a), i.length > 6 && i.pop());
                  var o = document.getElementById("brain-readout");
                  o &&
                    (o.innerHTML = i
                      .map(function (t, n) {
                        var a = t.indexOf("!!") >= 0;
                        return (
                          '<div style="opacity:' +
                          (1 - 0.12 * n) +
                          ";color:" +
                          (a ? "#ff2040" : "#ff00ff") +
                          ";" +
                          (a ? "font-weight:bold;" : "") +
                          '">' +
                          t +
                          "</div>"
                        );
                      })
                      .join(""));
                }
              })(d, y, v.zone),
              (function (t, n) {
                var a = document.getElementById("brain-header");
                if (a) {
                  var r,
                    i,
                    h = (3.8 * o.length).toFixed(0),
                    s = Math.floor(Date.now() / 4e3) % 3;
                  (t < 0.3
                    ? ((i = "#00cc88"),
                      (r = ["БАЗОВЫЙ", "基準値", "སྐྱེད་ཀྱི"][s]))
                    : t < 0.7
                      ? ((i = "#ffaa00"),
                        (r = ["ПОВЫШЕН", "上昇", "མཐོ་བསྐྱེད"][s]))
                      : t < 1.2
                        ? ((i = "#ff4400"),
                          (r = ["АНОМАЛИЯ", "異常", "མི་རུང་བ"][s]))
                        : ((i = "#ff0040"),
                          (r = ["КРИТИЧЕСКИЙ", "臨界", "ཉེན་ཀེན"][s])),
                    (a.innerHTML =
                      '<span style="color:' +
                      i +
                      ';font-weight:bold;">' +
                      r +
                      "</span> Z" +
                      n +
                      " | " +
                      e.length +
                      " | " +
                      h +
                      " Hz"));
                }
              })(y, v.zone),
              requestAnimationFrame(M));
          }
        }
        ((window.initBrainMonitor = function () {
          var m = document.getElementById("brain-monitor-wrap");
          if (
            (m ||
              (((m = document.createElement("div")).id = "brain-monitor-wrap"),
              (m.style.cssText =
                'position:fixed;bottom:clamp(30px, 4vh, 60px);right:clamp(20px, 2vw, 50px);width:clamp(280px, 28vw, 440px);z-index:700;pointer-events:auto;cursor:crosshair;font-family:"Courier New",monospace;color:#ff00ff;text-shadow:0 0 5px rgba(255,0,255,0.6);font-size:clamp(8px, 0.7vw, 11px);border:1px solid rgba(255,0,255,0.15);padding:6px;'),
              (m.innerHTML =
                '<div id="brain-header" style="margin-bottom:3px;line-height:1.3;"></div><canvas id="brain-canvas" style="width:100%;display:block;"></canvas><div id="brain-readout" style="line-height:1.3;margin-top:3px;max-height:7em;overflow:hidden;"></div>'),
              document.body.appendChild(m)),
            (m.style.display = "block"),
            (t = document.getElementById("brain-canvas")))
          ) {
            var u = m.getBoundingClientRect(),
              l = d ? 1 : Math.min(2, window.devicePixelRatio || 1),
              f = Math.max(300, u.width),
              c = Math.floor(0.65 * f);
            ((t.width = Math.floor(f * l)),
              (t.height = Math.floor(c * l)),
              (t.style.height = c + "px"),
              (t._lw = f),
              (t._lh = c),
              (n = t.getContext("2d")).scale(l, l),
              (e = []),
              (o = []),
              (i = []),
              (h = 0),
              (s = 0),
              (r = performance.now()));
            for (var g = d ? 6 : 16, w = 0; w < g; w++) p(f, c, 0.3);
            a || ((a = !0), requestAnimationFrame(M));
          }
        }),
          (window.stopBrainMonitor = function () {
            a = !1;
            var t = document.getElementById("brain-monitor-wrap");
            t && (t.style.display = "none");
          }),
          (function () {
            var t = null,
              n = !1,
              a = null,
              e = "";
            function o() {
              var o,
                r,
                i =
                  ((o = window.currentZone3),
                  (r = window.currentZone2),
                  o && "cabin" === o.centerPhase
                    ? "files/img/h/h5.png"
                    : o && o.isAltRoute
                      ? "files/img/h/h4.png"
                      : !r ||
                          ("bedroom_2" !== r.seqState &&
                            "z3b_turbulence" !== r.seqState &&
                            "z3b_red" !== r.seqState)
                        ? !r ||
                          ("blood" !== r.seqState &&
                            "hole" !== r.seqState &&
                            "red" !== r.seqState)
                          ? !r ||
                            ("initial" !== r.seqState &&
                              "bedroom_visited" !== r.seqState)
                            ? r || o
                              ? o && !o.isAltRoute
                                ? "files/img/h/h3.png"
                                : ""
                              : "files/img/h/h1.png"
                            : "files/img/h/h2.png"
                          : "files/img/h/h3.png"
                        : "files/img/h/h4.png");
              if (i) {
                var h =
                  t ||
                  (((t = document.createElement("img")).id =
                    "__rss-hint-overlay"),
                  (t.style.cssText = [
                    "position:fixed",
                    "top:22px",
                    "right:22px",
                    "max-width:clamp(420px, 48vw, 800px)",
                    "max-height:clamp(320px, 38vh, 620px)",
                    "width:auto",
                    "height:auto",
                    "opacity:0",
                    "pointer-events:none",
                    "z-index:760",
                    "transition:opacity 0.15s ease-in",
                    "image-rendering:auto",
                    "filter:drop-shadow(0 0 6px rgba(255,0,255,0.25))",
                  ].join(";")),
                  document.body.appendChild(t),
                  t);
                (e !== i && ((e = i), (h.src = i)),
                  (h.style.display = "block"),
                  (h.style.transition = "opacity 0.15s ease-in"),
                  cancelAnimationFrame(a),
                  (a = requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                      h.style.opacity = "0.85";
                    });
                  })),
                  (n = !0));
              }
            }
            function r() {
              t &&
                ((t.style.transition = "opacity 0.45s ease-out"),
                (t.style.opacity = "0"),
                (n = !1),
                setTimeout(function () {
                  !n && t && (t.style.display = "none");
                }, 500));
            }
            new MutationObserver(function () {
              var t = document.getElementById("brain-monitor-wrap");
              t &&
                !t.__hintBound &&
                ((t.__hintBound = !0),
                t.addEventListener("mousedown", function (t) {
                  (t.stopPropagation(), o());
                }),
                t.addEventListener(
                  "touchstart",
                  function (t) {
                    o();
                  },
                  { passive: !0 },
                ),
                window.addEventListener("mouseup", r),
                window.addEventListener("touchend", r),
                window.addEventListener("touchcancel", r));
            }).observe(document.body, { childList: !0, subtree: !0 });
            var i = document.getElementById("brain-monitor-wrap");
            i &&
              !i.__hintBound &&
              ((i.__hintBound = !0),
              i.addEventListener("mousedown", function (t) {
                (t.stopPropagation(), o());
              }),
              i.addEventListener(
                "touchstart",
                function (t) {
                  o();
                },
                { passive: !0 },
              ),
              window.addEventListener("mouseup", r),
              window.addEventListener("touchend", r),
              window.addEventListener("touchcancel", r));
          })());
      })();
