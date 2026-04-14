window.makeUI = function () {
        if (!__debugAllowed) return;
        const e = document.getElementById("debug-menu-box");
        if (e)
          return void (e.style.display =
            "none" === e.style.display ? "block" : "none");
        const n = document.createElement("div");
        ((n.id = "debug-menu-box"),
          (n.style.cssText =
            "\n    position:fixed; top:10px; left:10px; z-index:2147483647;\n    background:rgba(0,0,0,.85); color:#0f0; font:12px monospace;\n    padding:8px; border:1px solid #0f0;\n  "));
        ((n.innerHTML =
          '\n    <div>POV: <span id="pov">?</span></div>\n    <div>MODE: <span id="mode">?</span></div>\n    <div>SEQ: <span id="seq">?</span></div>\n    <div style="margin-top:6px">\n      <button id="prev">◀</button>\n      <select id="sel">\n        <option value="1">1: City</option>\n        <option value="2">2: Fractal</option>\n        <option value="3">3: BH</option>\n        <option value="4">4: Mirror</option>\n        <option value="5">5: Ocean</option>\n        <option value="6">6: Earth</option>\n        <option value="7">7: Deadcity</option>\n        <option value="8">8: Goreville</option>\n        <option value="9">9: Plane</option>\n        <option value="97">97: Back</option>\n        <option value="96">96: Door</option>\n        <option value="98">98: Left Room</option>\n        <option value="99">99: Right Room</option>\n      </select>\n      <button id="next">▶</button>\n    </div>\n    <div style="margin-top:6px;border-top:1px solid #0f0;padding-top:4px;">\n      <div style="color:#0ff;margin-bottom:3px;">ZONE SKIP:</div>\n      <button id="z2hall">Z2 Hall</button>\n      <button id="z2bath">Z2 Bath</button>\n      <button id="z2bed">Z2 Bed</button><br>\n      <button id="z3bath">Z3 Bath</button>\n      <button id="z3hall">Z3 Hall</button>\n      <button id="z3cabin">Z3 Cabin</button><br>\n      <button id="z3bbed">Z3b Bed</button>\n      <button id="z3bvoid">Z3b Void</button>\n      <button id="z3besc">Z3b Esc</button>\n    </div>\n    <div style="margin-top:6px;border-top:1px solid #0f0;padding-top:4px;">\n      <div style="color:#ff0;margin-bottom:3px;">Z4 / ROUTE 3:</div>\n      <button id="z2r3">Z2 R3 Bath</button>\n      <button id="z1door">Z1 Door</button><br>\n      <button id="z4elev">Z4 Elevator</button>\n      <button id="z4bay">Z4 Bay</button>\n      <button id="z4hall">Z4 Hall</button>\n      <button id="z4ring">Z4 Ring</button>\n    </div>\n  '),
          document.body.appendChild(n),
          n
            .querySelectorAll("button")
            .forEach(
              (e) =>
                (e.style.cssText =
                  "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;cursor:pointer;margin:1px;padding:2px 6px;"),
            ));
        const t = n.querySelector("#sel");
        t.style.cssText =
          "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;";
        const o = n.querySelector("#prev"),
          i = n.querySelector("#next");
        function r() {
          ((window.isEngine1Dead = !0),
            "undefined" != typeof currentEngine &&
              currentEngine &&
              (currentEngine.destroy(), (currentEngine = null)),
            "undefined" != typeof leftEngine &&
              leftEngine &&
              (leftEngine.destroy(), (leftEngine = null)),
            "undefined" != typeof rightEngine &&
              rightEngine &&
              (rightEngine.destroy(), (rightEngine = null)),
            "undefined" != typeof backEngine &&
              backEngine &&
              (backEngine.destroy(), (backEngine = null)),
            window.currentZone2 &&
              (window.currentZone2.destroy(), (window.currentZone2 = null)),
            window.currentZone3 &&
              (window.currentZone3.destroy(), (window.currentZone3 = null)));
          const e = document.getElementById("pov-fader");
          e && (e.style.opacity = "0");
        }
        function c(e) {
          (r(),
            (window.isEngine1Dead = !1),
            97 !== (e = parseInt(e)) &&
              96 !== e &&
              98 !== e &&
              99 !== e &&
              (e = Math.max(1, Math.min(9, 0 | e))),
            "undefined" != typeof phase && (phase = "open"),
            "undefined" != typeof blink && (blink = 0),
            "undefined" != typeof timer && (timer = performance.now()),
            "undefined" != typeof lastMode &&
              "undefined" != typeof mode &&
              (lastMode = mode),
            (mode = e),
            modeSeed++,
            (t.value = String(mode)),
            (activePOV =
              97 === e
                ? "back"
                : 96 === e
                  ? "door"
                  : 98 === e
                    ? "left"
                    : 99 === e
                      ? "right"
                      : "center"),
            (currentEngine = new ActiveMode(mode)),
            "function" == typeof initSideEngines && initSideEngines(),
            "undefined" != typeof __lastFrameTime && (__lastFrameTime = 0),
            "function" == typeof __frameGovernor &&
              requestAnimationFrame(__frameGovernor));
        }
        function d(e, n) {
          setTimeout(n, e);
        }
        ((t.onchange = () => c(+t.value)),
          (o.onclick = () => {
            let e = mode - 1;
            (e < 1 && (e = 9),
              (97 !== mode && 98 !== mode && 99 !== mode) || (e = 9),
              c(e));
          }),
          (i.onclick = () => {
            let e = mode + 1;
            (e > 9 && (e = 1),
              (97 !== mode && 98 !== mode && 99 !== mode) || (e = 1),
              c(e));
          }));
        const a = {
          1: "city",
          2: "fractal",
          3: "bh",
          4: "mirror",
          5: "ocean",
          6: "earth",
          7: "deadcity",
          8: "goreville",
          9: "plane",
          97: "back",
          96: "door",
          98: "left",
          99: "right",
        };
        (setInterval(() => {
          try {
            const e = document.getElementById("pov"),
              n = document.getElementById("mode"),
              t = document.getElementById("seq");
            if (
              (e &&
                (e.innerText =
                  "undefined" != typeof activePOV ? activePOV : "?"),
              n &&
                (n.innerText =
                  "undefined" != typeof mode
                    ? mode + " (" + (a[mode] || "?") + ")"
                    : "?"),
              t)
            ) {
              const e = window.currentZone2,
                n = window.currentZone3;
              if (n) {
                let e =
                  (n.isAltRoute ? "z3b " : "z3 ") +
                  n.centerPhase +
                  "/" +
                  n.cabinState;
                ((e += " pov:" + n.activePOV),
                  "hallway" === n.centerPhase
                    ? (e += " hallZ:" + n.camZ.toFixed(1))
                    : (e +=
                        " walk:" +
                        (n.cabinProgress || n.fallProgress || 0).toFixed(2)),
                  n.bhEscapePhase && "none" !== n.bhEscapePhase
                    ? (e +=
                        " ESC:" +
                        n.bhEscapePhase +
                        "(" +
                        n.bhEscapeBlinkCount +
                        ")")
                    : n.bhEscapeArmed && (e += " ARM:" + n.bhEscapeBlinkCount),
                  (t.innerText = e));
              } else
                t.innerText = e
                  ? "z2 " + (e.seqState || "?") + " pov:" + e.activePOV
                  : "engine1";
            }
          } catch (e) {}
        }, 500),
          (n.querySelector("#z2hall").onclick = () => {
            (r(),
              window.startZone2(),
              d(50, () => {
                const e = window.currentZone2;
                e &&
                  ((e.activePOV = "center"),
                  (e.intersectionReached = !1),
                  (e.camZ = e.START_Z),
                  (e.seqState = "initial"));
              }));
          }),
          (n.querySelector("#z2bath").onclick = () => {
            (r(),
              window.startZone2(),
              d(50, () => {
                const e = window.currentZone2;
                e &&
                  ((e.activePOV = "left"),
                  (e.seqState = "blood"),
                  e.leftRoom && (e.leftRoom.tex = e.texBathroomBlood));
              }));
          }),
          (n.querySelector("#z2bed").onclick = () => {
            (r(),
              window.startZone2(),
              d(50, () => {
                const e = window.currentZone2;
                e &&
                  ((e.activePOV = "right"), (e.seqState = "bedroom_visited"));
              }));
          }),
          (n.querySelector("#z3bath").onclick = () => {
            (r(),
              window.startZone3("z3"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "left"),
                  (e.centerPhase = "hallway"),
                  (e.camZ = e.HALL_START_Z));
              }));
          }),
          (n.querySelector("#z3hall").onclick = () => {
            (r(),
              window.startZone3("z3"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "center"),
                  (e.centerPhase = "hallway"),
                  (e.camZ = e.HALL_START_Z));
              }));
          }),
          (n.querySelector("#z3cabin").onclick = () => {
            (r(),
              window.startZone3("z3"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "center"),
                  (e.centerPhase = "cabin"),
                  (e.cabinState = "forward"),
                  (e.camZ = e.HALL_END_Z + 0.25));
              }));
          }),
          (n.querySelector("#z3bbed").onclick = () => {
            (r(),
              window.startZone3("z3b"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "right"),
                  (e.centerPhase = "hallway"),
                  (e.camZ = e.HALL_START_Z));
              }));
          }),
          (n.querySelector("#z3bvoid").onclick = () => {
            (r(),
              window.startZone3("z3b"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "center"),
                  (e.centerPhase = "void"),
                  (e.voidStart = performance.now()),
                  (e.camZ = e.HALL_END_Z));
              }));
          }),
          (n.querySelector("#z3besc").onclick = () => {
            (r(),
              window.startZone3("z3b"),
              d(50, () => {
                const e = window.currentZone3;
                e &&
                  ((e.activePOV = "center"),
                  (e.centerPhase = "void"),
                  (e.voidStart = performance.now()),
                  (e.camZ = e.HALL_END_Z),
                  (e.bhEscapeArmed = !0),
                  (e.bhEscapeBlinkCount = 2),
                  (e.bhEscapePhase = "rising"),
                  (e.bhEscapeStart = performance.now()));
              }));
          }),
          (n.querySelector("#z2r3").onclick = () => {
            (r(),
              window.startZone2(),
              d(50, () => {
                const e = window.currentZone2;
                e &&
                  ((e.activePOV = "left"),
                  (e.facing = "W"),
                  (e.intersectionReached = true),
                  (e.camZ = e.INTERSECTION_Z),
                  (e.seqState = "z4_bathroom"),
                  (e.z4RouteActive = true),
                  (e.z4RouteStep = 4),
                  (e.z4LeftBlinkCount = 0),
                  (e.zone3Route = "z4"),
                  e.leftRoom && (e.leftRoom.tex = e.texBathroomBlood));
              }));
          }),
          (n.querySelector("#z1door").onclick = () => {
            window.__z4Route = true;
            c(96);
          }),
          (n.querySelector("#z4elev").onclick = () => {
            (r(),
              window.startZone4 && window.startZone4(),
              d(50, () => {
                const e = window.currentZone4;
                if (e) {
                  e.phase = "ascent";
                  e.ascentStart = performance.now();
                  e.progress = 0;
                  e._setFog(0, 0);
                }
              }));
          }),
          (n.querySelector("#z4bay").onclick = () => {
            (r(),
              window.startZone4 && window.startZone4(),
              d(50, () => {
                const e = window.currentZone4;
                if (e) {
                  e.phase = "bay";
                  e.phaseStart = performance.now();
                  e.progress = 1;
                  e.phaseFogArmed = true;
                  e.walkoff = 0;
                  e.hallwayT = 0;
                  e.shakeIntensity = 0;
                  e._setFog(0, 0);
                }
              }));
          }),
          (n.querySelector("#z4hall").onclick = () => {
            (r(),
              window.startZone4 && window.startZone4(),
              d(50, () => {
                const e = window.currentZone4;
                if (e) {
                  e.phase = "hallway";
                  e.phaseStart = performance.now();
                  e.progress = 1;
                  e.phaseFogArmed = true;
                  e.walkoff = 1;
                  e.hallwayT = 0;
                  e.shakeIntensity = 0;
                  e._setFog(0, 0);
                }
              }));
          }),
          (n.querySelector("#z4ring").onclick = () => {
            (r(),
              window.startZone4 && window.startZone4(),
              d(50, () => {
                const e = window.currentZone4;
                if (e) {
                  e.phase = "ring";
                  e.phaseStart = performance.now();
                  e.progress = 1;
                  e.phaseFogArmed = true;
                  e.walkoff = 1;
                  e.hallwayT = 1;
                  e.shakeIntensity = 0;
                  e.ringDirection = 1;
                  e.turnAnimating = false;
                  e._setFog(0, 0);
                }
              }));
          }));
      };