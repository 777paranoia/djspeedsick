window.makeUI = function () {
  if ("undefined" != typeof __debugAllowed && !__debugAllowed) return;
  const existing = document.getElementById("debug-menu-box");
  if (existing)
    return void (existing.style.display =
      "none" === existing.style.display ? "block" : "none");
  const modeNames = {
      1: "city",
      2: "fractal",
      3: "bh",
      4: "mirror",
      5: "ocean",
      6: "earth",
      7: "deadcity",
      8: "goreville",
      9: "plane",
      10: "neighborhood",
      96: "door",
      97: "back",
      98: "left",
      99: "right",
    },
    box = document.createElement("div");
  ((box.id = "debug-menu-box"),
    (box.style.cssText = [
      "position:fixed",
      "top:10px",
      "right:10px",
      "z-index:2147483647",
      "background:rgba(0,0,0,.85)",
      "color:#0f0",
      "font:12px monospace",
      "padding:8px",
      "border:1px solid #0f0",
    ].join(";")),
    (box.innerHTML =
      '\n    <div>POV: <span id="pov">?</span></div>\n    <div>MODE: <span id="mode">?</span></div>\n    <div>SEQ: <span id="seq">?</span></div>\n    <div style="margin-top:6px">\n      <button id="prev">◀</button>\n      <select id="sel">\n        <option value="1">1: City</option>\n        <option value="2">2: Fractal</option>\n        <option value="3">3: BH</option>\n        <option value="4">4: Mirror</option>\n        <option value="5">5: Ocean</option>\n        <option value="6">6: Earth</option>\n        <option value="7">7: Deadcity</option>\n        <option value="8">8: Goreville</option>\n        <option value="9">9: Plane</option>\n        <option value="10">10: Neighborhood</option>\n        <option value="96">96: Door</option>\n        <option value="97">97: Back</option>\n        <option value="98">98: Left Room</option>\n        <option value="99">99: Right Room</option>\n      </select>\n      <button id="next">▶</button>\n    </div>\n    <div class="dbg-section">\n      <div style="color:#0ff;margin-bottom:3px;">ZONE SKIP:</div>\n      <button id="z2hall">Z2 Hall</button>\n      <button id="z2bath">Z2 Bath</button>\n      <button id="z2bed">Z2 Bed</button><br>\n      <button id="z3bath">Z3 Bath</button>\n      <button id="z3hall">Z3 Hall</button>\n      <button id="z3cabin">Z3 Cabin</button><br>\n      <button id="z3bbed">Z3b Bed</button>\n      <button id="z3bvoid">Z3b Void</button>\n      <button id="z3besc">Z3b Esc</button>\n    </div>\n    <div class="dbg-section">\n      <div style="color:#ff0;margin-bottom:3px;">Z4 / ROUTE 3:</div>\n      <button id="z2r3">Z2 R3 Bath</button>\n      <button id="z1door">Z1 Door</button><br>\n      <button id="z4elev">Z4 Elevator</button>\n      <button id="z4bay">Z4 Bay</button>\n      <button id="z4hall">Z4 Hall</button>\n      <button id="z4ring">Z4 Ring</button><br>\n      <button id="z4lap3">Z4 CW Lap3</button>\n      <button id="z4ccw">Z4 CCW Door</button>\n      <button id="z4annex">Z4 Annex</button><br>\n      <button id="z4altdoor">Z4 ALT Door</button>\n      <button id="z4altannex">Z4 ALT Annex</button>\n      <button id="z4altroom">Z4 ALT Room</button><br>\n      <button id="z4altbh">Z4 ALT BH</button>\n      <button id="z4bcabin">Z4B Cabin</button>\n      <button id="z4bisland">Z4B Island</button>\n      <button id="z4bmoai">Z4B Moai</button>\n      <button id="z4bdream">Z4B Dream</button><br>\n      <button id="z4desc">Z4 Descent</button>\n      <button id="z4fall">Z4 Fall</button>\n    </div>\n    <div class="dbg-section">\n      <div style="color:#f6f;margin-bottom:3px;">THEATER:</div>\n      <button id="thtop">Top</button>\n      <button id="thfoot">Foot of Stage</button>\n      <button id="thstage">On Stage</button><br>\n      <button id="thwake">Impact &rarr; Laptop</button>\n    </div>\n  '),
    document.body.appendChild(box),
    box.querySelectorAll(".dbg-section").forEach((section) => {
      section.style.cssText =
        "margin-top:6px;border-top:1px solid #0f0;padding-top:4px;";
    }));
  let __debugLastButtonClick = 0;
  (box.querySelectorAll("button").forEach((button) => {
    ((button.type = "button"),
      (button.tabIndex = -1),
      (button.style.cssText =
        "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;cursor:pointer;margin:1px;padding:2px 6px;"),
      button.addEventListener(
        "pointerdown",
        () => {
          requestAnimationFrame(() => button.blur());
        },
        !0,
      ),
      button.addEventListener(
        "click",
        (ev) => {
          const now = performance.now();
          if (now - __debugLastButtonClick < 140)
            return (
              ev.preventDefault(),
              ev.stopImmediatePropagation(),
              void button.blur()
            );
          ((__debugLastButtonClick = now),
            requestAnimationFrame(() => button.blur()));
        },
        !0,
      ),
      button.addEventListener(
        "keydown",
        (ev) => {
          ("Space" !== ev.code &&
            " " !== ev.key &&
            "Spacebar" !== ev.key &&
            "Enter" !== ev.code &&
            "Enter" !== ev.key) ||
            (ev.preventDefault(), ev.stopImmediatePropagation(), button.blur());
        },
        !0,
      ));
  }),
    box.addEventListener(
      "keydown",
      (ev) => {
        "button" !==
          (ev.target && ev.target.tagName
            ? ev.target.tagName.toLowerCase()
            : "") ||
          ("Space" !== ev.code &&
            " " !== ev.key &&
            "Spacebar" !== ev.key &&
            "Enter" !== ev.code &&
            "Enter" !== ev.key) ||
          (ev.preventDefault(),
          ev.stopImmediatePropagation(),
          ev.target && "function" == typeof ev.target.blur && ev.target.blur());
      },
      !0,
    ));
  const sel = box.querySelector("#sel");
  sel.style.cssText =
    "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;";
  const $ = (id) => box.querySelector("#" + id),
    delay = (fn) => setTimeout(fn, 50);
  function destroyActiveEngines() {
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
        (window.currentZone3.destroy(), (window.currentZone3 = null)),
      window.currentZone4 &&
        (window.currentZone4.destroy(), (window.currentZone4 = null)),
      window.__z4LoopToken && window.__z4LoopToken++);
    const fader = document.getElementById("pov-fader");
    fader && (fader.style.opacity = "0");
    const canvas = document.getElementById("c");
    canvas && (canvas.style.transform = "");
  }
  function startEngine1Mode(nextMode) {
    ((nextMode = parseInt(nextMode, 10)),
      destroyActiveEngines(),
      (window.isEngine1Dead = !1),
      [96, 97, 98, 99].includes(nextMode) ||
        (nextMode = Math.max(1, Math.min(9, 0 | nextMode))),
      "undefined" != typeof phase && (phase = "open"),
      "undefined" != typeof blink && (blink = 0),
      "undefined" != typeof timer && (timer = performance.now()),
      "undefined" != typeof lastMode &&
        "undefined" != typeof mode &&
        (lastMode = mode),
      (mode = nextMode),
      modeSeed++,
      (sel.value = String(mode)),
      (activePOV =
        97 === nextMode
          ? "back"
          : 96 === nextMode
            ? "door"
            : 98 === nextMode
              ? "left"
              : 99 === nextMode
                ? "right"
                : "center"),
      (currentEngine = new ActiveMode(mode)),
      "function" == typeof initSideEngines && initSideEngines(),
      "undefined" != typeof __lastFrameTime && (__lastFrameTime = 0),
      "function" == typeof __frameGovernor &&
        requestAnimationFrame(__frameGovernor));
  }
  function startZone2(mutator) {
    (destroyActiveEngines(),
      "function" == typeof window.startZone2 &&
        (window.startZone2(),
        delay(() => {
          const z2 = window.currentZone2;
          z2 && mutator && mutator(z2);
        })));
  }
  function startZone3(route, mutator) {
    (destroyActiveEngines(),
      "function" == typeof window.startZone3 &&
        (window.startZone3(route),
        delay(() => {
          const z3 = window.currentZone3;
          z3 && mutator && mutator(z3);
        })));
  }
  function startZone4(mutator) {
    (destroyActiveEngines(),
      "function" == typeof window.startZone4 &&
        (window.startZone4(),
        delay(() => {
          const z4 = window.currentZone4;
          z4 &&
            ((function (z4) {
              ((z4.progress = 1),
                (z4.phaseFogArmed = !0),
                (z4.shakeIntensity = 0),
                (z4.turnAnimating = !1),
                z4._setFog(0, 0));
            })(z4),
            mutator && mutator(z4));
        })));
  }
  function armZ4AltAnnexDebug(z4) {
    ((z4.altAnnexClockwiseReady = !0),
      (z4.altAnnexCounterClockwiseReady = !0),
      (z4.altAnnexDoorOpen = !0),
      (z4.altAnnexRouteActive = !0),
      (z4.annexAltBasementActive = !0),
      (z4.annexBasementVariant = "alt"),
      (z4.annexDoorOpen = !0),
      (z4.annexSequenceActive = !1),
      (z4.annexDjBlinkCount = 0),
      (z4.annexExitFading = !1),
      (z4.blackholeVisible = !1),
      (z4.blackholeIntensity = 0),
      "function" == typeof z4._publishAltAnnexState
        ? z4._publishAltAnnexState()
        : (window.__z4AltAnnex = {
            clockwiseReady: !0,
            counterClockwiseReady: !0,
            doorOpen: !0,
            routeActive: !0,
            basementVariant: "alt",
            debugForced: !0,
          }));
  }
  function setZ4AltDoorDebug(z4) {
    const sectionAngle = (2 * Math.PI) / 16,
      annexU = ((z4.annexSection || 0) + 0.5) * sectionAngle;
    ((z4.phase = "ring"),
      (z4.phaseStart = performance.now()),
      (z4.walkoff = 1),
      (z4.hallwayT = 1),
      (z4.ringU = annexU + 0.7 * sectionAngle),
      (z4.lastRingU = z4.ringU),
      (z4.ringDirection = -1),
      (z4.ringView = "path"),
      (z4.turnAnimating = !1),
      (z4.turnInputLatch = 0),
      (z4.ringTravel = 2 * Math.PI * 2),
      (z4.signedRingTravel = 0),
      (z4.clockwiseLapCount = 1),
      (z4.counterClockwiseLapCount = 1),
      (z4.lapCount = 1),
      armZ4AltAnnexDebug(z4));
  }
  function setZ4AltAnnexHallDebug(z4) {
    const u = ((z4.annexSection || 0) + 0.5) * ((2 * Math.PI) / 16);
    ((z4.phase = "annex_hallway"),
      (z4.phaseStart = performance.now()),
      (z4.ringU = u),
      (z4.lastRingU = u),
      (z4.ringDirection = -1),
      (z4.ringView = "path"),
      (z4.annexHallT = 0),
      (z4.annexRoomT = 0),
      (z4.annexExitT = 0),
      (z4.annexRoomDir = 1),
      (z4.annexRoomView = "path"),
      (z4.turnAnimating = !1),
      (z4.annexTurnInputLatch = 0),
      armZ4AltAnnexDebug(z4));
  }
  function setZ4AltAnnexRoomDebug(z4) {
    const u = ((z4.annexSection || 0) + 0.5) * ((2 * Math.PI) / 16);
    ((z4.phase = "annex_room"),
      (z4.phaseStart = performance.now()),
      (z4.ringU = u),
      (z4.lastRingU = u),
      (z4.ringDirection = -1),
      (z4.ringView = "path"),
      (z4.annexHallT = 1),
      (z4.annexRoomT = 0.12),
      (z4.annexExitT = 0),
      (z4.annexRoomDir = 1),
      (z4.annexRoomView = "path"),
      (z4.turnAnimating = !1),
      (z4.annexTurnInputLatch = 0),
      (z4.neuralIntensity = 3.25),
      armZ4AltAnnexDebug(z4));
  }
  function resetZ4BIslandTestState(walk, lookX, lookY, useWalk, resetBase) {
    (delete window.__z4bIslandDebugWalk,
      useWalk
        ? ((window.__z4bIslandDebugWalkTarget = walk),
          resetBase && delete window.__z4bIslandDebugWalkBase)
        : (delete window.__z4bIslandDebugWalkTarget,
          delete window.__z4bIslandDebugWalkBase),
      (window.__z4bIslandLookX = lookX),
      (window.__z4bIslandLookY = lookY),
      (window.__z4bIslandActive = !0),
      (window.__z4bIslandActive = !0),
      (window.__z4bIslandActive = !0),
      (window.__z4bIslandEscapeActive = !1),
      (window.__z4bIslandEscapeWalk0 = 0),
      (window.__z4bIslandEscapeFlashStart = -1),
      window.__z4bIslandEscapeState || (window.__z4bIslandEscapeState = {}),
      (window.__z4bIslandEscapeState.walk = useWalk ? walk : 0),
      (window.__z4bIslandWalk = useWalk ? walk : 0),
      (window.__z4bIslandLastWalkT = performance.now()),
      (window.__z4bIslandWalk = useWalk ? walk : 0),
      (window.__z4bIslandLastWalkT = performance.now()),
      (window.__z4bIslandWalk = useWalk ? walk : 0),
      (window.__z4bIslandLastWalkT = performance.now()),
      (window.__z4bIslandActive = !0),
      (window.__z4bIslandEscapeState.mouseX = lookX),
      (window.__z4bIslandEscapeState.mouseY = lookY),
      (window.__z4bIslandEscapeState.blink = 0),
      (window.__z4bIslandEscapeState.blinks = 0),
      (window.__z4bIslandEscapeState.escape = !1),
      (window.__z4bIslandEscapeState.escapeWalk0 = 0),
      (window.__z4bIslandEscapeState.flashStart = -1),
      (window.__z4bIslandEscapeState.lastStare = 0),
      (window.__z4bIslandEscapeState.stareStarted = 0),
      (window.__z4bIslandEscapeState.autoBlinkStage = 0),
      (window.__z4bIslandEscapeState.stareBlinkCount = 0),
      window.__z4bIslandBlinkState &&
        ((window.__z4bIslandBlinkState.start = -1),
        (window.__z4bIslandBlinkState.active = !1),
        (window.__z4bIslandBlinkState.value = 0),
        (window.__z4bIslandBlinkState.forceStart = 0),
        (window.__z4bIslandBlinkState.next = performance.now() + 1800)));
  }
  ((sel.onchange = () => startEngine1Mode(sel.value)),
    ($("prev").onclick = () =>
      startEngine1Mode(mode <= 1 || mode > 10 ? 10 : mode - 1)),
    ($("next").onclick = () =>
      startEngine1Mode(mode >= 10 || mode > 10 ? 1 : mode + 1)),
    ($("z2hall").onclick = () =>
      startZone2((z2) => {
        ((z2.activePOV = "center"),
          (z2.intersectionReached = !1),
          (z2.camZ = z2.START_Z),
          (z2.seqState = "initial"));
      })),
    ($("z2bath").onclick = () =>
      startZone2((z2) => {
        ((z2.activePOV = "left"),
          (z2.seqState = "blood"),
          z2.leftRoom && (z2.leftRoom.tex = z2.texBathroomBlood));
      })),
    ($("z2bed").onclick = () =>
      startZone2((z2) => {
        ((z2.activePOV = "right"), (z2.seqState = "bedroom_visited"));
      })),
    ($("z2r3").onclick = () =>
      startZone2((z2) => {
        ((z2.activePOV = "left"),
          (z2.facing = "W"),
          (z2.intersectionReached = !0),
          (z2.camZ = z2.INTERSECTION_Z),
          (z2.seqState = "z4_bathroom"),
          (z2.z4RouteActive = !0),
          (z2.z4RouteStep = 4),
          (z2.z4LeftBlinkCount = 0),
          (z2.zone3Route = "z4"),
          z2.leftRoom && (z2.leftRoom.tex = z2.texBathroomBlood));
      })),
    ($("z3bath").onclick = () =>
      startZone3("z3", (z3) => {
        ((z3.activePOV = "left"),
          (z3.centerPhase = "hallway"),
          (z3.camZ = z3.HALL_START_Z));
      })),
    ($("z3hall").onclick = () =>
      startZone3("z3", (z3) => {
        ((z3.activePOV = "center"),
          (z3.centerPhase = "hallway"),
          (z3.camZ = z3.HALL_START_Z));
      })),
    ($("z3cabin").onclick = () =>
      startZone3("z3", (z3) => {
        ((z3.activePOV = "center"),
          (z3.centerPhase = "cabin"),
          (z3.cabinState = "forward"),
          (z3.camZ = z3.HALL_END_Z + 0.25));
      })),
    ($("z3bbed").onclick = () =>
      startZone3("z3b", (z3) => {
        ((z3.activePOV = "right"),
          (z3.centerPhase = "hallway"),
          (z3.camZ = z3.HALL_START_Z));
      })),
    ($("z3bvoid").onclick = () =>
      startZone3("z3b", (z3) => {
        ((z3.activePOV = "center"),
          (z3.centerPhase = "void"),
          (z3.voidStart = performance.now()),
          (z3.camZ = z3.HALL_END_Z));
      })),
    ($("z3besc").onclick = () =>
      startZone3("z3b", (z3) => {
        ((z3.activePOV = "center"),
          (z3.centerPhase = "void"),
          (z3.voidStart = performance.now()),
          (z3.camZ = z3.HALL_END_Z),
          (z3.bhEscapeArmed = !0),
          (z3.bhEscapeBlinkCount = 2),
          (z3.bhEscapePhase = "rising"),
          (z3.bhEscapeStart = performance.now()));
      })),
    ($("z1door").onclick = () => {
      ((window.__z4Route = !0), startEngine1Mode(96));
    }),
    ($("z4elev").onclick = () =>
      startZone4((z4) => {
        ((z4.phase = "ascent"),
          (z4.phaseStart = performance.now()),
          (z4.ascentStart = performance.now()),
          (z4.progress = 0),
          (z4.phaseFogArmed = !1));
      })),
    ($("z4bay").onclick = () =>
      startZone4((z4) => {
        ((z4.phase = "bay"),
          (z4.phaseStart = performance.now()),
          (z4.walkoff = 0),
          (z4.hallwayT = 0));
      })),
    ($("z4hall").onclick = () =>
      startZone4((z4) => {
        ((z4.phase = "hallway"),
          (z4.phaseStart = performance.now()),
          (z4.walkoff = 1),
          (z4.hallwayT = 0));
      })),
    ($("z4ring").onclick = () =>
      startZone4((z4) => {
        const u = (z4.stationSection + 0.5) * ((2 * Math.PI) / 16);
        ((z4.phase = "ring"),
          (z4.phaseStart = performance.now()),
          (z4.walkoff = 1),
          (z4.hallwayT = 1),
          (z4.ringU = u),
          (z4.lastRingU = u),
          (z4.ringDirection = 1),
          (z4.ringView = "path"),
          (z4.ringTravel = 0),
          (z4.signedRingTravel = 0),
          (z4.lapCount = 0),
          (z4.clockwiseLapCount = 0),
          (z4.counterClockwiseLapCount = 0),
          (z4.annexDoorOpen = !1));
      })),
    ($("z4lap3").onclick = () =>
      startZone4((z4) => {
        const u = (z4.stationSection + 0.5) * ((2 * Math.PI) / 16);
        ((z4.phase = "ring"),
          (z4.phaseStart = performance.now()),
          (z4.walkoff = 1),
          (z4.hallwayT = 1),
          (z4.ringU = u),
          (z4.lastRingU = u),
          (z4.ringDirection = 1),
          (z4.ringView = "path"),
          (z4.signedRingTravel = 2 * Math.PI * 3),
          (z4.ringTravel = Math.abs(z4.signedRingTravel)),
          (z4.clockwiseLapCount = 3),
          (z4.counterClockwiseLapCount = 0),
          (z4.lapCount = 3),
          (z4.annexDoorOpen = !1));
      })),
    ($("z4ccw").onclick = () =>
      startZone4((z4) => {
        const sectionAngle = (2 * Math.PI) / 16,
          annexU = (z4.annexSection + 0.5) * sectionAngle;
        ((z4.phase = "ring"),
          (z4.phaseStart = performance.now()),
          (z4.walkoff = 1),
          (z4.hallwayT = 1),
          (z4.ringU = annexU + 0.7 * sectionAngle),
          (z4.lastRingU = z4.ringU),
          (z4.ringDirection = -1),
          (z4.ringView = "path"),
          (z4.signedRingTravel = 2 * -Math.PI * 3),
          (z4.ringTravel = Math.abs(z4.signedRingTravel)),
          (z4.clockwiseLapCount = 0),
          (z4.counterClockwiseLapCount = 3),
          (z4.lapCount = 3),
          (z4.annexDoorOpen = !0));
      })),
    ($("z4annex").onclick = () =>
      startZone4((z4) => {
        const u = (z4.annexSection + 0.5) * ((2 * Math.PI) / 16);
        ((z4.phase = "annex_hallway"),
          (z4.phaseStart = performance.now()),
          (z4.ringU = u),
          (z4.lastRingU = u),
          (z4.ringDirection = -1),
          (z4.annexDoorOpen = !0),
          (z4.annexHallT = 0),
          (z4.annexRoomT = 0));
      })),
    ($("z4altdoor").onclick = () => startZone4(setZ4AltDoorDebug)),
    ($("z4altannex").onclick = () => startZone4(setZ4AltAnnexHallDebug)),
    ($("z4altroom").onclick = () => startZone4(setZ4AltAnnexRoomDebug)),
    ($("z4altbh").onclick = () =>
      startZone3("z3b", (z3) => {
        if (
          ((z3.route = "z3b"),
          (z3.isAltRoute = !0),
          (z3.isZ4BRoute = !1),
          (z3.activePOV = "center"),
          (z3.centerPhase = "void"),
          (z3.voidStart = performance.now()),
          (z3.camZ = z3.HALL_END_Z),
          (z3.camX = 0),
          (z3.cx = 0),
          (z3.cy = 0),
          (z3.bhEscapeArmed = !1),
          (z3.bhEscapeBlinkCount = 0),
          (z3.bhEscapePhase = "none"),
          (z3.bhEscapeStart = 0),
          "function" == typeof z3._resetBlackholeStart)
        )
          try {
            z3._resetBlackholeStart();
          } catch (e) {}
      })),
    ($("z4bcabin").onclick = () => startZone3("z4b")),
    ($("z4bisland").onclick = () => {
      if (
        (resetZ4BIslandTestState(0, 0, 0, !1, !0),
        destroyActiveEngines(),
        "function" != typeof window.startZ4BIsland)
      )
        throw new Error("startZ4BIsland missing");
      (window.startZ4BIsland(),
        setTimeout(() => resetZ4BIslandTestState(0, 0, 0, !1, !0), 80),
        setTimeout(() => resetZ4BIslandTestState(0, 0, 0, !1, !0), 220));
    }),
    ($("z4bmoai").onclick = () => {
      const moaiWalk = 15.829787234042556,
        moaiLookX = -0.6310131183762295;
      document.activeElement &&
        "function" == typeof document.activeElement.blur &&
        document.activeElement.blur();
      const resetMoaiBlinkState = () => {
          window.__z4bIslandBlinkState &&
            ((window.__z4bIslandBlinkState.start = -1),
            (window.__z4bIslandBlinkState.active = !1),
            (window.__z4bIslandBlinkState.value = 0),
            (window.__z4bIslandBlinkState.forceStart = 0),
            (window.__z4bIslandBlinkState.next = performance.now() + 1800));
        },
        setMoaiLook = () => {
          ((window.__z4bIslandLookX = moaiLookX),
            (window.__z4bIslandLookY = 0),
            window.__z4bIslandEscapeState &&
              ((window.__z4bIslandEscapeState.mouseX = moaiLookX),
              (window.__z4bIslandEscapeState.mouseY = 0)),
            "function" == typeof window.__z4bIslandLockLook &&
              window.__z4bIslandLockLook(moaiLookX, 0));
        },
        resetMoaiEscapeState = () => {
          ((window.__z4bIslandActive = !0),
            (window.__z4bIslandEscapeActive = !1),
            (window.__z4bIslandEscapeWalk0 = 0),
            (window.__z4bIslandEscapeFlashStart = -1),
            (window.__z4bIslandMoaiBlinkArmed = !0),
            window.__z4bIslandEscapeState ||
              (window.__z4bIslandEscapeState = {}),
            (window.__z4bIslandEscapeState.blink = 0),
            (window.__z4bIslandEscapeState.blinks = 0),
            (window.__z4bIslandEscapeState.escape = !1),
            (window.__z4bIslandEscapeState.escapeWalk0 = 0),
            (window.__z4bIslandEscapeState.flashStart = -1),
            (window.__z4bIslandEscapeState.lastStare = 0),
            (window.__z4bIslandEscapeState.stareStarted = 0),
            (window.__z4bIslandEscapeState.autoBlinkStage = 0),
            (window.__z4bIslandEscapeState.stareBlinkCount = 0));
        },
        armMoaiTeleport = () => {
          (delete window.__z4bIslandDebugWalk,
            delete window.__z4bIslandDebugWalkBase,
            (window.__z4bIslandDebugWalkTarget = moaiWalk),
            setMoaiLook(),
            resetMoaiEscapeState(),
            resetMoaiBlinkState());
        },
        commitMoaiTeleport = () => {
          (delete window.__z4bIslandDebugWalk,
            delete window.__z4bIslandDebugWalkTarget,
            delete window.__z4bIslandDebugWalkBase,
            (window.__z4bIslandWalk = moaiWalk),
            (window.__z4bIslandRawWalk = moaiWalk),
            (window.__z4bIslandLastWalkT = performance.now()),
            (window.__z4bIslandActive = !0),
            window.__z4bIslandEscapeState ||
              (window.__z4bIslandEscapeState = {}),
            (window.__z4bIslandEscapeState.walk = moaiWalk),
            (window.__z4bIslandEscapeState.mouseX = moaiLookX),
            (window.__z4bIslandEscapeState.mouseY = 0),
            setMoaiLook(),
            resetMoaiEscapeState(),
            resetMoaiBlinkState());
        };
      if (!0 === window.__z4bIslandActive)
        return (
          armMoaiTeleport(),
          setTimeout(commitMoaiTeleport, 70),
          void setTimeout(commitMoaiTeleport, 180)
        );
      if (
        (armMoaiTeleport(),
        destroyActiveEngines(),
        "function" != typeof window.startZ4BIsland)
      )
        throw new Error("startZ4BIsland missing");
      (window.startZ4BIsland(),
        setTimeout(armMoaiTeleport, 60),
        setTimeout(commitMoaiTeleport, 180),
        setTimeout(commitMoaiTeleport, 360));
    }),
    ($("z4bdream").onclick = () => {
      document.activeElement &&
        "function" == typeof document.activeElement.blur &&
        document.activeElement.blur();
      const forceDreamCabinState = () => {
        (resetZ4BIslandTestState(6.15, 0, 0, !0, !0),
          (window.__z4bIslandActive = !0),
          (window.__z4bIslandEscapeActive = !0),
          (window.__z4bIslandEscapeWalk0 = 0),
          (window.__z4bIslandEscapeFlashStart = -1),
          (window.__z4bIslandMoaiBlinkArmed = !1),
          (window.__z4bIslandReturnToZone2 = !1),
          (window.__z4bIslandCabinHandoffActive = !1),
          (window.__z4bIslandWalk = 6.15),
          (window.__z4bIslandRawWalk = 6.15),
          (window.__z4bIslandLastWalkT = performance.now()),
          (window.__z4bIslandLookX = 0),
          (window.__z4bIslandLookY = 0),
          window.__z4bIslandEscapeState || (window.__z4bIslandEscapeState = {}),
          (window.__z4bIslandEscapeState.walk = 6.15),
          (window.__z4bIslandEscapeState.mouseX = 0),
          (window.__z4bIslandEscapeState.mouseY = 0),
          (window.__z4bIslandEscapeState.blink = 0),
          (window.__z4bIslandEscapeState.blinks = 0),
          (window.__z4bIslandEscapeState.escape = !0),
          (window.__z4bIslandEscapeState.escapeWalk0 = 0),
          (window.__z4bIslandEscapeState.flashStart = -1),
          (window.__z4bIslandEscapeState.returnedToZone2 = !1),
          (window.__z4bIslandEscapeState.lastStare = 0),
          (window.__z4bIslandEscapeState.stareStarted = 0),
          (window.__z4bIslandEscapeState.autoBlinkStage = 0),
          (window.__z4bIslandEscapeState.stareBlinkCount = 0),
          "function" == typeof window.__z4bIslandLockLook &&
            window.__z4bIslandLockLook(0, 0),
          window.__z4bIslandBlinkState &&
            ((window.__z4bIslandBlinkState.start = -1),
            (window.__z4bIslandBlinkState.active = !1),
            (window.__z4bIslandBlinkState.value = 0),
            (window.__z4bIslandBlinkState.forceStart = 0),
            (window.__z4bIslandBlinkState.next = performance.now() + 1800)));
      };
      if (!0 === window.__z4bIslandActive)
        return (
          forceDreamCabinState(),
          setTimeout(forceDreamCabinState, 70),
          void setTimeout(forceDreamCabinState, 180)
        );
      if (
        (forceDreamCabinState(),
        destroyActiveEngines(),
        "function" != typeof window.startZ4BIsland)
      )
        throw new Error("startZ4BIsland missing");
      (window.startZ4BIsland(),
        setTimeout(forceDreamCabinState, 60),
        setTimeout(forceDreamCabinState, 180),
        setTimeout(forceDreamCabinState, 360));
    }),
    ($("z4desc").onclick = () =>
      startZone4((z4) => {
        ((z4.phase = "descent"),
          (z4.phaseStart = performance.now()),
          (z4.descentStart = performance.now()),
          (z4.descentProgress = 1));
      })),
    ($("z4fall").onclick = () =>
      startZone4((z4) => {
        ((z4.phase = "fall"),
          (z4.phaseStart = performance.now()),
          (z4.fallStart = performance.now()),
          (z4.fallProgress = 0));
      })));
  const theaterGoto = (p) => {
    "function" == typeof window.startModeTheater
      ? (window.startModeTheater({ progress: p }),
        "function" == typeof window.__theaterDebugGoto &&
          window.__theaterDebugGoto(p))
      : "function" == typeof window.__theaterDebugGoto
        ? window.__theaterDebugGoto(p)
        : console.error("[debug] mode-theater not loaded");
  };
  (($("thtop").onclick = () => theaterGoto(0.2)),
    ($("thfoot").onclick = () => theaterGoto(0.82)),
    ($("thstage").onclick = () => theaterGoto(1.2)),
    ($("thwake").onclick = () => {
      "function" == typeof window.__wakeToLaptopFromTheater
        ? window.__wakeToLaptopFromTheater()
        : console.error("[debug] __wakeToLaptopFromTheater not available");
    }),
    setInterval(() => {
      try {
        const povEl = $("pov"),
          modeEl = $("mode"),
          seqEl = $("seq");
        if (
          (povEl &&
            (povEl.innerText =
              "undefined" != typeof activePOV ? activePOV : "?"),
          modeEl &&
            (modeEl.innerText =
              "undefined" != typeof mode
                ? mode + " (" + (modeNames[mode] || "?") + ")"
                : "?"),
          !seqEl)
        )
          return;
        const z4 = window.currentZone4,
          z3 = window.currentZone3,
          z2 = window.currentZone2;
        if (z4) {
          let info = "z4 " + z4.phase;
          if ("ring" === z4.phase) {
            const alt = window.__z4AltAnnex || {},
              totalCW =
                "number" == typeof z4.totalClockwiseLapCount
                  ? z4.totalClockwiseLapCount
                  : 0,
              totalCCW =
                "number" == typeof z4.totalCounterClockwiseLapCount
                  ? z4.totalCounterClockwiseLapCount
                  : 0,
              altCW =
                "number" == typeof z4.altAnnexCwLapCount
                  ? z4.altAnnexCwLapCount
                  : alt.cw || 0,
              altCCW =
                "number" == typeof z4.altAnnexCcwLapCount
                  ? z4.altAnnexCcwLapCount
                  : alt.ccw || 0;
            ((info += " dir:" + (z4.ringDirection > 0 ? "cw" : "ccw")),
              (info +=
                " net:" +
                (z4.clockwiseLapCount || 0) +
                "/" +
                (z4.counterClockwiseLapCount || 0)),
              (info += " total:" + totalCW + "/" + totalCCW),
              (info += " alt:" + altCW + "/" + altCCW),
              (info += " door:" + (z4.annexDoorOpen ? "open" : "shut")));
          } else
            0 === z4.phase.indexOf("annex")
              ? ((info += " hall:" + (z4.annexHallT || 0).toFixed(2)),
                (info += " room:" + (z4.annexRoomT || 0).toFixed(2)),
                (z4.annexAltBasementActive ||
                  "alt" === z4.annexBasementVariant) &&
                  (info += " portal:open"),
                (z4.annexAltBasementActive ||
                  "alt" === z4.annexBasementVariant) &&
                  (info += " lock:straight"),
                (info += " variant:" + (z4.annexBasementVariant || "normal")))
              : "z4b_alt_blackhole" === z4.phase && (info += " altBH");
          (("alt" === z4.annexBasementVariant || z4.annexAltBasementActive) &&
            (info += " ALT"),
            (seqEl.innerText = info));
        } else if (z3) {
          let info =
            (z3.route || (z3.isAltRoute ? "z3b" : "z3")) +
            " " +
            z3.centerPhase +
            "/" +
            z3.cabinState;
          ((info += " pov:" + z3.activePOV),
            (info +=
              "hallway" === z3.centerPhase
                ? " hallZ:" + z3.camZ.toFixed(1)
                : " walk:" +
                  (z3.cabinProgress || z3.fallProgress || 0).toFixed(2)),
            z3.bhEscapePhase && "none" !== z3.bhEscapePhase
              ? (info +=
                  " ESC:" +
                  z3.bhEscapePhase +
                  "(" +
                  z3.bhEscapeBlinkCount +
                  ")")
              : z3.bhEscapeArmed && (info += " ARM:" + z3.bhEscapeBlinkCount),
            (seqEl.innerText = info));
        } else
          seqEl.innerText = z2
            ? "z2 " + (z2.seqState || "?") + " pov:" + z2.activePOV
            : "engine1";
      } catch (e) {}
    }, 500));
};
