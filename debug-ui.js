window.makeUI = function () {
  if (typeof __debugAllowed !== "undefined" && !__debugAllowed) return;

  const existing = document.getElementById("debug-menu-box");
  if (existing) {
    existing.style.display = existing.style.display === "none" ? "block" : "none";
    return;
  }

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
    96: "door",
    97: "back",
    98: "left",
    99: "right",
  };

  const box = document.createElement("div");
  box.id = "debug-menu-box";
  box.style.cssText = [
    "position:fixed",
    "top:10px",
    "right:10px",
    "z-index:2147483647",
    "background:rgba(0,0,0,.85)",
    "color:#0f0",
    "font:12px monospace",
    "padding:8px",
    "border:1px solid #0f0",
  ].join(";");

  box.innerHTML = `
    <div>POV: <span id="pov">?</span></div>
    <div>MODE: <span id="mode">?</span></div>
    <div>SEQ: <span id="seq">?</span></div>
    <div style="margin-top:6px">
      <button id="prev">◀</button>
      <select id="sel">
        <option value="1">1: City</option>
        <option value="2">2: Fractal</option>
        <option value="3">3: BH</option>
        <option value="4">4: Mirror</option>
        <option value="5">5: Ocean</option>
        <option value="6">6: Earth</option>
        <option value="7">7: Deadcity</option>
        <option value="8">8: Goreville</option>
        <option value="9">9: Plane</option>
        <option value="96">96: Door</option>
        <option value="97">97: Back</option>
        <option value="98">98: Left Room</option>
        <option value="99">99: Right Room</option>
      </select>
      <button id="next">▶</button>
    </div>
    <div class="dbg-section">
      <div style="color:#0ff;margin-bottom:3px;">ZONE SKIP:</div>
      <button id="z2hall">Z2 Hall</button>
      <button id="z2bath">Z2 Bath</button>
      <button id="z2bed">Z2 Bed</button><br>
      <button id="z3bath">Z3 Bath</button>
      <button id="z3hall">Z3 Hall</button>
      <button id="z3cabin">Z3 Cabin</button><br>
      <button id="z3bbed">Z3b Bed</button>
      <button id="z3bvoid">Z3b Void</button>
      <button id="z3besc">Z3b Esc</button>
    </div>
    <div class="dbg-section">
      <div style="color:#ff0;margin-bottom:3px;">Z4 / ROUTE 3:</div>
      <button id="z2r3">Z2 R3 Bath</button>
      <button id="z1door">Z1 Door</button><br>
      <button id="z4elev">Z4 Elevator</button>
      <button id="z4bay">Z4 Bay</button>
      <button id="z4hall">Z4 Hall</button>
      <button id="z4ring">Z4 Ring</button><br>
      <button id="z4lap3">Z4 CW Lap3</button>
      <button id="z4ccw">Z4 CCW Door</button>
      <button id="z4annex">Z4 Annex</button><br>
      <button id="z4altdoor">Z4 ALT Door</button>
      <button id="z4altannex">Z4 ALT Annex</button>
      <button id="z4altroom">Z4 ALT Room</button><br>
      <button id="z4altbh">Z4 ALT BH</button>
      <button id="z4bcabin">Z4B Cabin</button>
      <button id="z4bisland">Z4B Island</button>
      <button id="z4bmoai">Z4B Moai</button>
      <button id="z4bdream">Z4B Dream</button><br>
      <button id="z4desc">Z4 Descent</button>
      <button id="z4fall">Z4 Fall</button>
    </div>
  `;

  document.body.appendChild(box);
  box.querySelectorAll(".dbg-section").forEach((section) => {
    section.style.cssText = "margin-top:6px;border-top:1px solid #0f0;padding-top:4px;";
  });
  let __debugLastButtonClick = 0;

  box.querySelectorAll("button").forEach((button) => {
    button.type = "button";
    button.tabIndex = -1;
    button.style.cssText =
      "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;cursor:pointer;margin:1px;padding:2px 6px;";

    button.addEventListener("pointerdown", () => {
      requestAnimationFrame(() => button.blur());
    }, true);

    button.addEventListener("click", (ev) => {
      const now = performance.now();

      if (now - __debugLastButtonClick < 140) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        button.blur();
        return;
      }

      __debugLastButtonClick = now;
      requestAnimationFrame(() => button.blur());
    }, true);

    button.addEventListener("keydown", (ev) => {
      if (
        ev.code === "Space" ||
        ev.key === " " ||
        ev.key === "Spacebar" ||
        ev.code === "Enter" ||
        ev.key === "Enter"
      ) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        button.blur();
      }
    }, true);
  });

  box.addEventListener("keydown", (ev) => {
    const tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";

    if (
      tag === "button" &&
      (
        ev.code === "Space" ||
        ev.key === " " ||
        ev.key === "Spacebar" ||
        ev.code === "Enter" ||
        ev.key === "Enter"
      )
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      if (ev.target && typeof ev.target.blur === "function") {
        ev.target.blur();
      }
    }
  }, true);

  const sel = box.querySelector("#sel");
  sel.style.cssText = "background:#111;color:#0f0;border:1px solid #0f0;font:11px monospace;";

  const $ = (id) => box.querySelector("#" + id);
  const delay = (fn) => setTimeout(fn, 50);

  function destroyActiveEngines() {
    window.isEngine1Dead = true;
    if (typeof currentEngine !== "undefined" && currentEngine) {
      currentEngine.destroy();
      currentEngine = null;
    }
    if (typeof leftEngine !== "undefined" && leftEngine) {
      leftEngine.destroy();
      leftEngine = null;
    }
    if (typeof rightEngine !== "undefined" && rightEngine) {
      rightEngine.destroy();
      rightEngine = null;
    }
    if (typeof backEngine !== "undefined" && backEngine) {
      backEngine.destroy();
      backEngine = null;
    }
    if (window.currentZone2) {
      window.currentZone2.destroy();
      window.currentZone2 = null;
    }
    if (window.currentZone3) {
      window.currentZone3.destroy();
      window.currentZone3 = null;
    }
    if (window.currentZone4) {
      window.currentZone4.destroy();
      window.currentZone4 = null;
    }
    if (window.__z4LoopToken) window.__z4LoopToken++;

    const fader = document.getElementById("pov-fader");
    if (fader) fader.style.opacity = "0";
    const canvas = document.getElementById("c");
    if (canvas) canvas.style.transform = "";
  }

  function startEngine1Mode(nextMode) {
    nextMode = parseInt(nextMode, 10);

    destroyActiveEngines();
    window.isEngine1Dead = false;
    if (![96, 97, 98, 99].includes(nextMode)) nextMode = Math.max(1, Math.min(9, nextMode | 0));

    if (typeof phase !== "undefined") phase = "open";
    if (typeof blink !== "undefined") blink = 0;
    if (typeof timer !== "undefined") timer = performance.now();
    if (typeof lastMode !== "undefined" && typeof mode !== "undefined") lastMode = mode;

    mode = nextMode;
    modeSeed++;
    sel.value = String(mode);
    activePOV =
      nextMode === 97 ? "back" :
      nextMode === 96 ? "door" :
      nextMode === 98 ? "left" :
      nextMode === 99 ? "right" :
      "center";

    currentEngine = new ActiveMode(mode);
    if (typeof initSideEngines === "function") initSideEngines();
    if (typeof __lastFrameTime !== "undefined") __lastFrameTime = 0;
    if (typeof __frameGovernor === "function") requestAnimationFrame(__frameGovernor);
  }

  function startZone2(mutator) {
    destroyActiveEngines();
    if (typeof window.startZone2 !== "function") return;
    window.startZone2();
    delay(() => {
      const z2 = window.currentZone2;
      if (z2 && mutator) mutator(z2);
    });
  }

  function startZone3(route, mutator) {
    destroyActiveEngines();
    if (typeof window.startZone3 !== "function") return;
    window.startZone3(route);
    delay(() => {
      const z3 = window.currentZone3;
      if (z3 && mutator) mutator(z3);
    });
  }

  function prepZ4(z4) {
    z4.progress = 1;
    z4.phaseFogArmed = true;
    z4.shakeIntensity = 0;
    z4.turnAnimating = false;
    z4._setFog(0, 0);
  }

  function startZone4(mutator) {
    destroyActiveEngines();
    if (typeof window.startZone4 !== "function") return;
    window.startZone4();
    delay(() => {
      const z4 = window.currentZone4;
      if (!z4) return;
      prepZ4(z4);
      if (mutator) mutator(z4);
    });
  }

  function forceZ4AltAnnexState(z4) {
    z4.altAnnexDoorOpen = true;
    z4.altAnnexCounterClockwiseReady = true;
    z4.altAnnexRouteActive = true;
    z4.annexAltBasementActive = true;
    z4.annexBasementVariant = "alt";
    z4.annexDoorOpen = true;
    z4.annexSequenceActive = false;
    z4.annexDjBlinkCount = 0;
    if (typeof z4._publishAltAnnexState === "function") z4._publishAltAnnexState();
  }

  function armZ4AltAnnexDebug(z4) {
    z4.altAnnexClockwiseReady = true;
    z4.altAnnexCounterClockwiseReady = true;
    z4.altAnnexDoorOpen = true;
    z4.altAnnexRouteActive = true;
    z4.annexAltBasementActive = true;
    z4.annexBasementVariant = "alt";
    z4.annexDoorOpen = true;
    z4.annexSequenceActive = false;
    z4.annexDjBlinkCount = 0;
    z4.annexExitFading = false;
    z4.blackholeVisible = false;
    z4.blackholeIntensity = 0;

    if (typeof z4._publishAltAnnexState === "function") {
      z4._publishAltAnnexState();
    } else {
      window.__z4AltAnnex = {
        clockwiseReady: true,
        counterClockwiseReady: true,
        doorOpen: true,
        routeActive: true,
        basementVariant: "alt",
        debugForced: true
      };
    }
  }

  function setZ4AltDoorDebug(z4) {
    const sectionAngle = Math.PI * 2 / 16;
    const annexU = ((z4.annexSection || 0) + 0.5) * sectionAngle;

    z4.phase = "ring";
    z4.phaseStart = performance.now();
    z4.walkoff = 1;
    z4.hallwayT = 1;
    z4.ringU = annexU + sectionAngle * 0.7;
    z4.lastRingU = z4.ringU;
    z4.ringDirection = -1;
    z4.ringView = "path";
    z4.turnAnimating = false;
    z4.turnInputLatch = 0;
    z4.ringTravel = Math.PI * 2 * 2;
    z4.signedRingTravel = 0;
    z4.clockwiseLapCount = 1;
    z4.counterClockwiseLapCount = 1;
    z4.lapCount = 1;

    armZ4AltAnnexDebug(z4);
  }

  function setZ4AltAnnexHallDebug(z4) {
    const u = ((z4.annexSection || 0) + 0.5) * (Math.PI * 2 / 16);

    z4.phase = "annex_hallway";
    z4.phaseStart = performance.now();
    z4.ringU = u;
    z4.lastRingU = u;
    z4.ringDirection = -1;
    z4.ringView = "path";
    z4.annexHallT = 0;
    z4.annexRoomT = 0;
    z4.annexExitT = 0;
    z4.annexRoomDir = 1;
    z4.annexRoomView = "path";
    z4.turnAnimating = false;
    z4.annexTurnInputLatch = 0;

    armZ4AltAnnexDebug(z4);
  }

  function setZ4AltAnnexRoomDebug(z4) {
    const u = ((z4.annexSection || 0) + 0.5) * (Math.PI * 2 / 16);

    z4.phase = "annex_room";
    z4.phaseStart = performance.now();
    z4.ringU = u;
    z4.lastRingU = u;
    z4.ringDirection = -1;
    z4.ringView = "path";
    z4.annexHallT = 1;
    z4.annexRoomT = 0.12;
    z4.annexExitT = 0;
    z4.annexRoomDir = 1;
    z4.annexRoomView = "path";
    z4.turnAnimating = false;
    z4.annexTurnInputLatch = 0;
    z4.neuralIntensity = 3.25;

    armZ4AltAnnexDebug(z4);
  }

  function setZ4AltBlackHoleDebug(z4) {
    armZ4AltAnnexDebug(z4);

    if (typeof z4._beginZ4BAltBlackHole === "function") {
      z4._beginZ4BAltBlackHole(performance.now());
      return;
    }

    z4.phase = "z4b_alt_blackhole";
    z4.phaseStart = performance.now();
    z4.z4bAltBlackHoleStart = performance.now();
    z4.z4bAltBlackHoleFade = 0;
    z4.z4Trip = 1.75;
    z4.z4IsOOB = 1.0;
    z4.z4ModeSeed = Math.random() * 1000.0;
    z4.z4FractalSeed = z4.z4ModeSeed;
    z4.z4BlinkPeakTime = performance.now();
    z4.blackholeVisible = true;
    z4.blackholeIntensity = 1.0;

    try {
      if (z4.bh2Video) {
        z4.bh2Video.currentTime = 0;
        const p = z4.bh2Video.play();
        p && p.catch && p.catch(function () {});
      }
    } catch (e) {}
  }

  sel.onchange = () => startEngine1Mode(sel.value);
  $("prev").onclick = () => startEngine1Mode(mode <= 1 || mode > 10 ? 10 : mode - 1);
  $("next").onclick = () => startEngine1Mode(mode >= 10 || mode > 10 ? 1 : mode + 1);

  $("z2hall").onclick = () => startZone2((z2) => {
    z2.activePOV = "center";
    z2.intersectionReached = false;
    z2.camZ = z2.START_Z;
    z2.seqState = "initial";
  });
  $("z2bath").onclick = () => startZone2((z2) => {
    z2.activePOV = "left";
    z2.seqState = "blood";
    if (z2.leftRoom) z2.leftRoom.tex = z2.texBathroomBlood;
  });
  $("z2bed").onclick = () => startZone2((z2) => {
    z2.activePOV = "right";
    z2.seqState = "bedroom_visited";
  });
  $("z2r3").onclick = () => startZone2((z2) => {
    z2.activePOV = "left";
    z2.facing = "W";
    z2.intersectionReached = true;
    z2.camZ = z2.INTERSECTION_Z;
    z2.seqState = "z4_bathroom";
    z2.z4RouteActive = true;
    z2.z4RouteStep = 4;
    z2.z4LeftBlinkCount = 0;
    z2.zone3Route = "z4";
    if (z2.leftRoom) z2.leftRoom.tex = z2.texBathroomBlood;
  });

  $("z3bath").onclick = () => startZone3("z3", (z3) => {
    z3.activePOV = "left";
    z3.centerPhase = "hallway";
    z3.camZ = z3.HALL_START_Z;
  });
  $("z3hall").onclick = () => startZone3("z3", (z3) => {
    z3.activePOV = "center";
    z3.centerPhase = "hallway";
    z3.camZ = z3.HALL_START_Z;
  });
  $("z3cabin").onclick = () => startZone3("z3", (z3) => {
    z3.activePOV = "center";
    z3.centerPhase = "cabin";
    z3.cabinState = "forward";
    z3.camZ = z3.HALL_END_Z + 0.25;
  });
  $("z3bbed").onclick = () => startZone3("z3b", (z3) => {
    z3.activePOV = "right";
    z3.centerPhase = "hallway";
    z3.camZ = z3.HALL_START_Z;
  });
  $("z3bvoid").onclick = () => startZone3("z3b", (z3) => {
    z3.activePOV = "center";
    z3.centerPhase = "void";
    z3.voidStart = performance.now();
    z3.camZ = z3.HALL_END_Z;
  });
  $("z3besc").onclick = () => startZone3("z3b", (z3) => {
    z3.activePOV = "center";
    z3.centerPhase = "void";
    z3.voidStart = performance.now();
    z3.camZ = z3.HALL_END_Z;
    z3.bhEscapeArmed = true;
    z3.bhEscapeBlinkCount = 2;
    z3.bhEscapePhase = "rising";
    z3.bhEscapeStart = performance.now();
  });

  $("z1door").onclick = () => {
    window.__z4Route = true;
    startEngine1Mode(96);
  };
  $("z4elev").onclick = () => startZone4((z4) => {
    z4.phase = "ascent";
    z4.phaseStart = performance.now();
    z4.ascentStart = performance.now();
    z4.progress = 0;
    z4.phaseFogArmed = false;
  });
  $("z4bay").onclick = () => startZone4((z4) => {
    z4.phase = "bay";
    z4.phaseStart = performance.now();
    z4.walkoff = 0;
    z4.hallwayT = 0;
  });
  $("z4hall").onclick = () => startZone4((z4) => {
    z4.phase = "hallway";
    z4.phaseStart = performance.now();
    z4.walkoff = 1;
    z4.hallwayT = 0;
  });
  $("z4ring").onclick = () => startZone4((z4) => {
    const u = (z4.stationSection + 0.5) * (Math.PI * 2 / 16);
    z4.phase = "ring";
    z4.phaseStart = performance.now();
    z4.walkoff = 1;
    z4.hallwayT = 1;
    z4.ringU = u;
    z4.lastRingU = u;
    z4.ringDirection = 1;
    z4.ringView = "path";
    z4.ringTravel = 0;
    z4.signedRingTravel = 0;
    z4.lapCount = 0;
    z4.clockwiseLapCount = 0;
    z4.counterClockwiseLapCount = 0;
    z4.annexDoorOpen = false;
  });
  $("z4lap3").onclick = () => startZone4((z4) => {
    const u = (z4.stationSection + 0.5) * (Math.PI * 2 / 16);
    z4.phase = "ring";
    z4.phaseStart = performance.now();
    z4.walkoff = 1;
    z4.hallwayT = 1;
    z4.ringU = u;
    z4.lastRingU = u;
    z4.ringDirection = 1;
    z4.ringView = "path";
    z4.signedRingTravel = Math.PI * 2 * 3;
    z4.ringTravel = Math.abs(z4.signedRingTravel);
    z4.clockwiseLapCount = 3;
    z4.counterClockwiseLapCount = 0;
    z4.lapCount = 3;
    z4.annexDoorOpen = false;
  });
  $("z4ccw").onclick = () => startZone4((z4) => {
    const sectionAngle = Math.PI * 2 / 16;
    const annexU = (z4.annexSection + 0.5) * sectionAngle;
    z4.phase = "ring";
    z4.phaseStart = performance.now();
    z4.walkoff = 1;
    z4.hallwayT = 1;
    z4.ringU = annexU + sectionAngle * 0.7;
    z4.lastRingU = z4.ringU;
    z4.ringDirection = -1;
    z4.ringView = "path";
    z4.signedRingTravel = -Math.PI * 2 * 3;
    z4.ringTravel = Math.abs(z4.signedRingTravel);
    z4.clockwiseLapCount = 0;
    z4.counterClockwiseLapCount = 3;
    z4.lapCount = 3;
    z4.annexDoorOpen = true;
  });
  $("z4annex").onclick = () => startZone4((z4) => {
    const u = (z4.annexSection + 0.5) * (Math.PI * 2 / 16);
    z4.phase = "annex_hallway";
    z4.phaseStart = performance.now();
    z4.ringU = u;
    z4.lastRingU = u;
    z4.ringDirection = -1;
    z4.annexDoorOpen = true;
    z4.annexHallT = 0;
    z4.annexRoomT = 0;
  });
  $("z4altdoor").onclick = () => startZone4(setZ4AltDoorDebug);
  $("z4altannex").onclick = () => startZone4(setZ4AltAnnexHallDebug);
  $("z4altroom").onclick = () => startZone4(setZ4AltAnnexRoomDebug);
  $("z4altbh").onclick = () => startZone3("z3b", (z3) => {
    z3.route = "z3b";
    z3.isAltRoute = true;
    z3.isZ4BRoute = false;
    z3.activePOV = "center";
    z3.centerPhase = "void";
    z3.voidStart = performance.now();
    z3.camZ = z3.HALL_END_Z;
    z3.camX = 0;
    z3.cx = 0;
    z3.cy = 0;
    z3.bhEscapeArmed = false;
    z3.bhEscapeBlinkCount = 0;
    z3.bhEscapePhase = "none";
    z3.bhEscapeStart = 0;
    if (typeof z3._resetBlackholeStart === "function") {
      try { z3._resetBlackholeStart(); } catch (e) {}
    }
  });
  $("z4bcabin").onclick = () => startZone3("z4b");

  function resetZ4BIslandTestState(walk, lookX, lookY, useWalk, resetBase) {
    delete window.__z4bIslandDebugWalk;

    if (useWalk) {
      window.__z4bIslandDebugWalkTarget = walk;
      if (resetBase) delete window.__z4bIslandDebugWalkBase;
    } else {
      delete window.__z4bIslandDebugWalkTarget;
      delete window.__z4bIslandDebugWalkBase;
    }

    window.__z4bIslandLookX = lookX;
    window.__z4bIslandLookY = lookY;
    window.__z4bIslandActive = true;
    window.__z4bIslandActive = true;
    window.__z4bIslandActive = true;
    window.__z4bIslandEscapeActive = false;
    window.__z4bIslandEscapeWalk0 = 0;
    window.__z4bIslandEscapeFlashStart = -1;

    if (!window.__z4bIslandEscapeState) window.__z4bIslandEscapeState = {};

    window.__z4bIslandEscapeState.walk = useWalk ? walk : 0;
    window.__z4bIslandWalk = useWalk ? walk : 0;
    window.__z4bIslandLastWalkT = performance.now();
    window.__z4bIslandWalk = useWalk ? walk : 0;
    window.__z4bIslandLastWalkT = performance.now();
    window.__z4bIslandWalk = useWalk ? walk : 0;
    window.__z4bIslandLastWalkT = performance.now();
    window.__z4bIslandActive = true;
    window.__z4bIslandEscapeState.mouseX = lookX;
    window.__z4bIslandEscapeState.mouseY = lookY;
    window.__z4bIslandEscapeState.blink = 0;
    window.__z4bIslandEscapeState.blinks = 0;
    window.__z4bIslandEscapeState.escape = false;
    window.__z4bIslandEscapeState.escapeWalk0 = 0;
    window.__z4bIslandEscapeState.flashStart = -1;
    window.__z4bIslandEscapeState.lastStare = 0;
    window.__z4bIslandEscapeState.stareStarted = 0;
    window.__z4bIslandEscapeState.autoBlinkStage = 0;
    window.__z4bIslandEscapeState.stareBlinkCount = 0;

    if (window.__z4bIslandBlinkState) {
      window.__z4bIslandBlinkState.start = -1;
      window.__z4bIslandBlinkState.active = false;
      window.__z4bIslandBlinkState.value = 0;
      window.__z4bIslandBlinkState.forceStart = 0;
      window.__z4bIslandBlinkState.next = performance.now() + 1800;
    }
  }

  $("z4bisland").onclick = () => {
    resetZ4BIslandTestState(0, 0, 0, false, true);
    destroyActiveEngines();
    if (typeof window.startZ4BIsland !== "function") throw new Error("startZ4BIsland missing");
    window.startZ4BIsland();
    setTimeout(() => resetZ4BIslandTestState(0, 0, 0, false, true), 80);
    setTimeout(() => resetZ4BIslandTestState(0, 0, 0, false, true), 220);
  };

  $("z4bmoai").onclick = () => {
    const moaiWalk = 15.829787234042556;
    const moaiLookX = -0.6310131183762295;
    const moaiLookY = 0.0;

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    const resetMoaiBlinkState = () => {
      if (window.__z4bIslandBlinkState) {
        window.__z4bIslandBlinkState.start = -1;
        window.__z4bIslandBlinkState.active = false;
        window.__z4bIslandBlinkState.value = 0;
        window.__z4bIslandBlinkState.forceStart = 0;
        window.__z4bIslandBlinkState.next = performance.now() + 1800;
      }
    };

    const setMoaiLook = () => {
      window.__z4bIslandLookX = moaiLookX;
      window.__z4bIslandLookY = moaiLookY;

      if (window.__z4bIslandEscapeState) {
        window.__z4bIslandEscapeState.mouseX = moaiLookX;
        window.__z4bIslandEscapeState.mouseY = moaiLookY;
      }

      if (typeof window.__z4bIslandLockLook === "function") {
        window.__z4bIslandLockLook(moaiLookX, moaiLookY);
      }
    };

    const resetMoaiEscapeState = () => {
      window.__z4bIslandActive = true;
      window.__z4bIslandEscapeActive = false;
      window.__z4bIslandEscapeWalk0 = 0;
      window.__z4bIslandEscapeFlashStart = -1;
      window.__z4bIslandMoaiBlinkArmed = true;

      if (!window.__z4bIslandEscapeState) window.__z4bIslandEscapeState = {};

      window.__z4bIslandEscapeState.blink = 0;
      window.__z4bIslandEscapeState.blinks = 0;
      window.__z4bIslandEscapeState.escape = false;
      window.__z4bIslandEscapeState.escapeWalk0 = 0;
      window.__z4bIslandEscapeState.flashStart = -1;
      window.__z4bIslandEscapeState.lastStare = 0;
      window.__z4bIslandEscapeState.stareStarted = 0;
      window.__z4bIslandEscapeState.autoBlinkStage = 0;
      window.__z4bIslandEscapeState.stareBlinkCount = 0;
    };

    const armMoaiTeleport = () => {
      delete window.__z4bIslandDebugWalk;
      delete window.__z4bIslandDebugWalkBase;

      window.__z4bIslandDebugWalkTarget = moaiWalk;
      setMoaiLook();
      resetMoaiEscapeState();
      resetMoaiBlinkState();
    };

    const commitMoaiTeleport = () => {
      delete window.__z4bIslandDebugWalk;
      delete window.__z4bIslandDebugWalkTarget;
      delete window.__z4bIslandDebugWalkBase;

      window.__z4bIslandWalk = moaiWalk;
      window.__z4bIslandRawWalk = moaiWalk;
      window.__z4bIslandLastWalkT = performance.now();
      window.__z4bIslandActive = true;

      if (!window.__z4bIslandEscapeState) window.__z4bIslandEscapeState = {};

      window.__z4bIslandEscapeState.walk = moaiWalk;
      window.__z4bIslandEscapeState.mouseX = moaiLookX;
      window.__z4bIslandEscapeState.mouseY = moaiLookY;

      setMoaiLook();
      resetMoaiEscapeState();
      resetMoaiBlinkState();
    };

    const alreadyOnIsland = window.__z4bIslandActive === true;

    if (alreadyOnIsland) {
      armMoaiTeleport();
      setTimeout(commitMoaiTeleport, 70);
      setTimeout(commitMoaiTeleport, 180);
      return;
    }

    armMoaiTeleport();
    destroyActiveEngines();

    if (typeof window.startZ4BIsland !== "function") {
      throw new Error("startZ4BIsland missing");
    }

    window.startZ4BIsland();

    setTimeout(armMoaiTeleport, 60);
    setTimeout(commitMoaiTeleport, 180);
    setTimeout(commitMoaiTeleport, 360);
  };

  $("z4bdream").onclick = () => {
    const dreamWalk = 6.15;
    const dreamLookX = 0.0;
    const dreamLookY = 0.0;

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    const resetDreamBlinkState = () => {
      if (window.__z4bIslandBlinkState) {
        window.__z4bIslandBlinkState.start = -1;
        window.__z4bIslandBlinkState.active = false;
        window.__z4bIslandBlinkState.value = 0;
        window.__z4bIslandBlinkState.forceStart = 0;
        window.__z4bIslandBlinkState.next = performance.now() + 1800;
      }
    };

    const forceDreamCabinState = () => {
      resetZ4BIslandTestState(dreamWalk, dreamLookX, dreamLookY, true, true);

      window.__z4bIslandActive = true;
      window.__z4bIslandEscapeActive = true;
      window.__z4bIslandEscapeWalk0 = 0;
      window.__z4bIslandEscapeFlashStart = -1;
      window.__z4bIslandMoaiBlinkArmed = false;
      window.__z4bIslandReturnToZone2 = false;
      window.__z4bIslandCabinHandoffActive = false;

      window.__z4bIslandWalk = dreamWalk;
      window.__z4bIslandRawWalk = dreamWalk;
      window.__z4bIslandLastWalkT = performance.now();
      window.__z4bIslandLookX = dreamLookX;
      window.__z4bIslandLookY = dreamLookY;

      if (!window.__z4bIslandEscapeState) window.__z4bIslandEscapeState = {};

      window.__z4bIslandEscapeState.walk = dreamWalk;
      window.__z4bIslandEscapeState.mouseX = dreamLookX;
      window.__z4bIslandEscapeState.mouseY = dreamLookY;
      window.__z4bIslandEscapeState.blink = 0;
      window.__z4bIslandEscapeState.blinks = 0;
      window.__z4bIslandEscapeState.escape = true;
      window.__z4bIslandEscapeState.escapeWalk0 = 0;
      window.__z4bIslandEscapeState.flashStart = -1;
      window.__z4bIslandEscapeState.returnedToZone2 = false;
      window.__z4bIslandEscapeState.lastStare = 0;
      window.__z4bIslandEscapeState.stareStarted = 0;
      window.__z4bIslandEscapeState.autoBlinkStage = 0;
      window.__z4bIslandEscapeState.stareBlinkCount = 0;

      if (typeof window.__z4bIslandLockLook === "function") {
        window.__z4bIslandLockLook(dreamLookX, dreamLookY);
      }

      resetDreamBlinkState();
    };

    const alreadyOnIsland = window.__z4bIslandActive === true;

    if (alreadyOnIsland) {
      forceDreamCabinState();
      setTimeout(forceDreamCabinState, 70);
      setTimeout(forceDreamCabinState, 180);
      return;
    }

    forceDreamCabinState();
    destroyActiveEngines();

    if (typeof window.startZ4BIsland !== "function") {
      throw new Error("startZ4BIsland missing");
    }

    window.startZ4BIsland();

    setTimeout(forceDreamCabinState, 60);
    setTimeout(forceDreamCabinState, 180);
    setTimeout(forceDreamCabinState, 360);
  };

  $("z4desc").onclick = () => startZone4((z4) => {
    z4.phase = "descent";
    z4.phaseStart = performance.now();
    z4.descentStart = performance.now();
    z4.descentProgress = 1;
  });
  $("z4fall").onclick = () => startZone4((z4) => {
    z4.phase = "fall";
    z4.phaseStart = performance.now();
    z4.fallStart = performance.now();
    z4.fallProgress = 0;
  });

  setInterval(() => {
    try {
      const povEl = $("pov");
      const modeEl = $("mode");
      const seqEl = $("seq");
      if (povEl) povEl.innerText = typeof activePOV !== "undefined" ? activePOV : "?";
      if (modeEl) modeEl.innerText = typeof mode !== "undefined" ? mode + " (" + (modeNames[mode] || "?") + ")" : "?";
      if (!seqEl) return;

      const z4 = window.currentZone4;
      const z3 = window.currentZone3;
      const z2 = window.currentZone2;
      if (z4) {
        let info = "z4 " + z4.phase;
        if (z4.phase === "ring") {
          const alt = window.__z4AltAnnex || {};
          const totalCW = typeof z4.totalClockwiseLapCount === "number" ? z4.totalClockwiseLapCount : 0;
          const totalCCW = typeof z4.totalCounterClockwiseLapCount === "number" ? z4.totalCounterClockwiseLapCount : 0;
          const altCW = typeof z4.altAnnexCwLapCount === "number" ? z4.altAnnexCwLapCount : (alt.cw || 0);
          const altCCW = typeof z4.altAnnexCcwLapCount === "number" ? z4.altAnnexCcwLapCount : (alt.ccw || 0);
          info += " dir:" + (z4.ringDirection > 0 ? "cw" : "ccw");
          info += " net:" + (z4.clockwiseLapCount || 0) + "/" + (z4.counterClockwiseLapCount || 0);
          info += " total:" + totalCW + "/" + totalCCW;
          info += " alt:" + altCW + "/" + altCCW;
          info += " door:" + (z4.annexDoorOpen ? "open" : "shut");
        } else if (z4.phase.indexOf("annex") === 0) {
          info += " hall:" + (z4.annexHallT || 0).toFixed(2);
          info += " room:" + (z4.annexRoomT || 0).toFixed(2);
          if (z4.annexAltBasementActive || z4.annexBasementVariant === "alt") info += " portal:open";
          if (z4.annexAltBasementActive || z4.annexBasementVariant === "alt") info += " lock:straight";
          info += " variant:" + (z4.annexBasementVariant || "normal");
        } else if (z4.phase === "z4b_alt_blackhole") {
          info += " altBH";
        }
        if (z4.annexBasementVariant === "alt" || z4.annexAltBasementActive) {
          info += " ALT";
        }
        seqEl.innerText = info;
      } else if (z3) {
        let info = (z3.route || (z3.isAltRoute ? "z3b" : "z3")) + " " + z3.centerPhase + "/" + z3.cabinState;
        info += " pov:" + z3.activePOV;
        info += z3.centerPhase === "hallway"
          ? " hallZ:" + z3.camZ.toFixed(1)
          : " walk:" + (z3.cabinProgress || z3.fallProgress || 0).toFixed(2);
        if (z3.bhEscapePhase && z3.bhEscapePhase !== "none") info += " ESC:" + z3.bhEscapePhase + "(" + z3.bhEscapeBlinkCount + ")";
        else if (z3.bhEscapeArmed) info += " ARM:" + z3.bhEscapeBlinkCount;
        seqEl.innerText = info;
      } else if (z2) {
        seqEl.innerText = "z2 " + (z2.seqState || "?") + " pov:" + z2.activePOV;
      } else {
        seqEl.innerText = "engine1";
      }
    } catch (e) {}
  }, 500);
};
