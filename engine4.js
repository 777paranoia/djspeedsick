(function () {
  function z4ResolveSources() {
    if (window.Zone4StationSources && typeof window.Zone4StationSources.resolveSources === "function") {
      return window.Zone4StationSources.resolveSources();
    }
    return { stationBgCombined: "", stationMeshFrag: "" };
  }
  function z4BuildPsychStationShader() {
    return window.Zone4StationSources && typeof window.Zone4StationSources.buildPsychStationShader === "function"
      ? window.Zone4StationSources.buildPsychStationShader()
      : "";
  }
  function z4BuildPostProcessShader() {
    return window.Zone4StationSources && typeof window.Zone4StationSources.buildPostProcessShader === "function"
      ? window.Zone4StationSources.buildPostProcessShader()
      : "";
  }
  function z4Ready() {
    return (
      typeof gl !== "undefined" &&
      typeof canvas !== "undefined" &&
      typeof compile === "function" &&
      typeof loadStaticTex === "function" &&
      window.GLSL &&
      window.GLSL.modules
    );
  }
  let z4SpaceHeld = window.z4SpaceHeld || false;
  let z4TouchHeld = window.z4TouchHeld || false;
  function checkZ4Touch(ev) {
    if (!ev.touches) return;
    let held = false;
    const contains =
      typeof window.__mobileWalkZoneContains === "function"
        ? window.__mobileWalkZoneContains
        : function (x, y) {
            const w = window.innerWidth;
            return y >= 0.68 * window.innerHeight && x >= 0.3 * w && x <= 0.7 * w;
          };
    for (let i = 0; i < ev.touches.length; i++) {
      const t = ev.touches[i];
      if (contains(t.clientX, t.clientY)) {
        held = true;
        break;
      }
    }
    z4TouchHeld = held;
    window.z4TouchHeld = held;
  }
  function z4AltMouseSandboxActive() {
    const z4 = window.currentZone4;
    return !!(
      z4 &&
      !z4.isDead &&
      window.__z4AltAnnexMouseSandbox !== false &&
      typeof z4._isAltAnnexLocked === "function" &&
      z4._isAltAnnexLocked()
    );
  }
  function z4ClampMouse(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function z4ApplyAltAnnexMouseSandbox(ev) {
    if (!z4AltMouseSandboxActive()) return;
    const w = Math.max(1, window.innerWidth || 1);
    const h = Math.max(1, window.innerHeight || 1);
    window.mx = z4ClampMouse(((ev.clientX / w) - 0.5) * 0.72, -0.24, 0.24);
    window.my = z4ClampMouse(((ev.clientY / h) - 0.5) * 0.48, -0.15, 0.15);
  }
  if (!window.__z4InputInstalled) {
    window.__z4InputInstalled = true;
    window.__z4AltAnnexMouseSandbox = true;
    window.addEventListener("mousemove", z4ApplyAltAnnexMouseSandbox, { passive: true });
    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
        z4SpaceHeld = true;
        window.z4SpaceHeld = true;
      }
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        const z4 = window.currentZone4;
        if (z4 && !z4.isDead && z4.phase === "ring") {
          window.__z4TurnRequested = e.code === "ArrowLeft" ? -1 : 1;
        } else if (z4 && !z4.isDead && z4.phase === "annex_room") {
          window.__z4AnnexTurnRequested = e.code === "ArrowLeft" ? -1 : 1;
        }
      }
    });
    window.addEventListener("keyup", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
        z4SpaceHeld = false;
        window.z4SpaceHeld = false;
      }
    });
    window.addEventListener("touchstart", checkZ4Touch, { passive: false });
    window.addEventListener("touchmove", checkZ4Touch, { passive: false });
    window.addEventListener("touchend", checkZ4Touch, { passive: false });
    window.addEventListener("touchcancel", function () {
      z4TouchHeld = false;
      window.z4TouchHeld = false;
    });
  }
  class Zone4Engine {
    constructor() {
      const src = z4ResolveSources();
      if (
        !src.elevatorVert ||
        !src.elevatorFrag ||
        !src.stationVertMesh ||
        !src.stationVertScreen ||
        !src.stationBgCore ||
        !src.stationBgFrag ||
        !src.stationMeshFrag
      ) {
        console.error("[Zone4] Missing shader modules.", src);
        this.isDead = true;
        return;
      }
      this.src = src;
      this.isDead = false;
      this.lastRenderTime = performance.now();
      this.cx = 0;
      this.cy = 0;
      this.phase = "ascent";
      this.phaseStart = performance.now();
      this.ascentStart = performance.now();
      this.ascentDuration = 48000;
      this.dockingShakeDuration = 1500;
      this.fogInDuration = 2200;
      this.fogOutDuration = 2600;
      this.progress = 0;
      this.walkAngle = 0;
      this.rBlink = 0;
      this.lastBlinkTime = performance.now();
      this.nextBlinkInterval = 4000 + Math.random() * 7000;
      this.blinking = false;
      this.blinkStart = 0;
      this.stationSection = 8;
      this.ringU = (this.stationSection + 0.5) * (Math.PI * 2 / 16);
      this.walkoff = 0;
      this.hallwayT = 0;
      this.enterRingT = 0;
      this.phaseFogArmed = false;
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.ringDirection = 1;
      this.ringView = "window";
      this.ringWindowSide = 1;
      this.turnAnimating = false;
      this.turnStart = 0;
      this.turnTo = -1;
      this.turnSpin = 1;
      this.turnAngle = Math.PI;
      this.turnViewTo = null;
      this.turnDirectionTo = null;
      this.turnWindowSideTo = null;
      this.turnDuration = 420;
      this.turnInputLatch = 0;
      this.turnLookX = 0;
      this.turnLookY = 0;
      this.lapCount = 0;
      this.lastRingU = this.ringU;
      this.ringTravel = 0;
      this.signedRingTravel = 0;
      this.lapCrossings = 0;
      this.clockwiseLapCount = 0;
      this.counterClockwiseLapCount = 0;
      this.totalClockwiseTravel = 0;
      this.totalCounterClockwiseTravel = 0;
      this.totalClockwiseLapCount = 0;
      this.totalCounterClockwiseLapCount = 0;
      this.altAnnexPatternStage = 0;
      this.altAnnexCwTravel = 0;
      this.altAnnexCcwTravel = 0;
      this.altAnnexCwLapCount = 0;
      this.altAnnexCcwLapCount = 0;
      this.altAnnexClockwiseReady = false;
      this.altAnnexCounterClockwiseReady = false;
      this.altAnnexDoorOpen = false;
      this.altAnnexRouteActive = false;
      this.altAnnexZone2ReturnActive = false;
      this.altAnnexZone2Returned = false;
      this.annexAltBasementActive = false;
      this.annexBasementVariant = "normal";
      this.altAnnexLastLog = 0;
      this.annexDoorOpen = false;
      this.annexSection = 0;
      this.annexEntryU = this.ringU;
      this.annexTargetU = this.ringU;
      this.annexTurnT = 0;
      this.annexHallT = 0;
      this.annexRoomT = 0;
      this.annexExitT = 0;
      this.annexRoomDir = 1;
      this.annexRoomView = "path";
      this.annexTurnInputLatch = 0;
      this.annexDjBlinkCount = 0;
      this.annexSequenceActive = false;
      this.annexSequenceStart = 0;
      this.annexStrobe = 0;
      this.annexTripFX = 0.0;
      this.annexTripFXTarget = 0.0;
      this.annexTripFXLast = performance.now();
      this.annexTripOverlay = null;
      this.annexTripBlurOverlay = null;
      this.annexTripRedOverlay = null;
      this.annexTripDarkOverlay = null;
      this.__boothTripFXPatch = true;
      this.z4bStopAtCockpit = false;
      this.annexExitFading = false;
      this.blackholeVisible = false;
      this.blackholeIntensity = 0;
      this.descentProgress = 1;
      this.descentStart = 0;
      this.descentDuration = 38000;
      this.fallProgress = 0;
      this.fallStart = 0;
      this.fallDuration = 32000;
      this.neuralIntensity = 0.75;
      this.z4Trip = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4ModeTime = 0.0;
      this.z4IsOOB = 1.0;
      this.z4FractalSeed = Math.random() * 1000.0;
      this.z4BlinkPeakTime = performance.now();
      this.altAnnexNffAudio = null;
      this.altAnnexNffCtx = null;
      this.altAnnexNffSource = null;
      this.altAnnexNffFilter = null;
      this.altAnnexNffGain = null;
      this.altAnnexNffPlaying = false;
      this.altAnnexNffTargetGain = 0.0;
      this.altAnnexMainAudioDucked = false;
      this.altAnnexMainAudioPrevVolume = 1.0;
      this.altAnnexMainAudioPrevMuted = false;
      src.stationBgCombined = z4BuildPsychStationShader();
      src.stationMeshFrag = this._patchAnnexBasementShader(src.stationMeshFrag);
      this.elevatorProg = this._buildRawProgram(src.elevatorVert, src.elevatorFrag);
      this.stationBgProg = this._buildRawProgram(
        src.stationVertScreen,
        src.stationBgCombined
      );
      this.stationMeshProg = this._buildRawProgram(
        src.stationVertMesh,
        src.stationMeshFrag
      );
      this.postProcessProg = this._buildRawProgram(
        "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }",
        z4BuildPostProcessShader()
      );
      this.overlayProg = this._buildOverlayProgram();
      this.altAnnexFXProg = (typeof this._buildAltAnnexFXProgram === "function") ? this._buildAltAnnexFXProgram() : null;
      this.fallProg = null;
      this._fallShaderBuilt = false;
      this.fboTexture = gl.createTexture();
      this.fboDepth = gl.createRenderbuffer();
      this.fbo = gl.createFramebuffer();
      this.fboWidth = 0;
      this.fboHeight = 0;
      this.z4bCabinProg = null;
      this.cabinPortalFBO = null;
      this.cabinPortalTexture = null;
      this.cabinPortalWidth = 0;
      this.cabinPortalHeight = 0;
      this.z4bVoidFBO = null;
      this.z4bVoidTexture = null;
      this.z4bVoidWidth = 0;
      this.z4bVoidHeight = 0;
      this.z4Mode4OceanProg = null;
      this.z4Mode4OceanEnvTex = null;
      this.z4Mode4OceanWindowTex = null;
      this.z4bVoidMode = null;
      this.z4bVoidMaskTex = null;
      this.z4bCabinState = "idle";
      this.z4bCabinStart = 0;
      this.z4bCabinCrashStart = 0;
      this.z4bCabinCamZ = 12.0;
      this.z4bCabinCamX = 0.0;
      this.z4bCabinYaw = 0.0;
      this.z4bCabinZoom = 1.0;
      this.z4bCabinShake = 0;
      this.z4bCabinFlash = 0;
      this.z4bCabinWalking = false;
      this.z4bIslandStarted = false;
      try {
        if (typeof ActiveMode !== "undefined") {
          this.z4bVoidMode = new ActiveMode(5);
          this.z4bVoidMaskTex = this._makeSolidTexture(0, 0, 0, 0);
          this.z4bVoidMode.maskTex = this.z4bVoidMaskTex;
        }
      } catch (e) {
        this.z4bVoidMode = null;
        this.z4bVoidMaskTex = null;
      }
      this.fullTri = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );
      this.screenQuad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.stationTextures = this._initStationTextures();
      this.stationMeshes = [];
      this._buildStationMeshes();
      this.fogOverlay = this._getFogOverlay();
      this._setFog(0, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    }
    _patchAnnexBasementShader(fsSource) {
      if (!fsSource) return fsSource;
      if (fsSource.indexOf("u_tileTex") === -1) {
        fsSource = fsSource.replace(
          "uniform float u_useTexAlpha;\n",
          "uniform float u_useTexAlpha;\nuniform float u_tileTex;\n"
        );
      }
      if (fsSource.indexOf("z4TexUV") === -1) {
        fsSource = fsSource.replace(
          "  vec4 sampled = texture2D(u_tex, v_uv);",
          "  vec2 z4TexUV = mix(v_uv, fract(v_uv), u_tileTex);\n  vec4 sampled = texture2D(u_tex, z4TexUV);"
        );
      }
      if (fsSource.indexOf("u_annexStageRedLight") !== -1 && fsSource.indexOf("u_annexStageWhiteStrobe") !== -1 && fsSource.indexOf("u_annexLightCol0") !== -1) return fsSource;
      if (fsSource.indexOf("u_annexLighting") !== -1) {
        fsSource = fsSource.replace(
          "uniform vec3 u_annexLight2;\\n",
          "uniform vec3 u_annexLight2;\\nuniform vec3 u_annexStageRedLight;\\nuniform float u_annexStageRedGlow;\\nuniform vec3 u_annexStageWhiteLight;\\nuniform float u_annexStageWhiteStrobe;\\n"
        );
        fsSource = fsSource.replace(
          "    direct += bulbSum * (1.55 + u_annexStrobe * 4.80);",
          "    direct += bulbSum * 1.15;"
        );
        fsSource = fsSource.replace(
          "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    amb *= mix(1.0, 0.42, u_annexStrobe);",
          "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    vec3 RS = u_annexStageRedLight - v_wpos;\\n    float rdist = dot(RS, RS);\\n    vec3 RSdir = normalize(RS);\\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\\n    float rsoft = smoothstep(0.0, 0.85, rfall);\\n    direct += vec3(0.88, 0.035, 0.020) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\\n    amb += vec3(0.070, 0.008, 0.006) * rsoft * u_annexStageRedGlow;\\n    float roomFlash = clamp(u_annexStageWhiteStrobe * 0.22, 0.0, 1.0);\n    amb += vec3(0.84, 0.80, 0.72) * roomFlash;\n    direct += vec3(1.55, 1.45, 1.28) * roomFlash;\n    spec += roomFlash * 0.22;\n    float annexBlackout = mix(1.0, 0.14, u_annexStrobe);\\n    amb *= annexBlackout;\\n    direct *= annexBlackout;\\n    spec *= mix(1.0, 0.20, u_annexStrobe);"
        );
        return fsSource;
      }
      fsSource = fsSource
        .replace(
          "uniform float u_greenKey;\n",
          "uniform float u_greenKey;\nuniform float u_annexLighting;\nuniform float u_annexStrobe;\nuniform float u_annexExitGlow;\nuniform vec3 u_annexExitLight;\nuniform vec3 u_annexLight0;\nuniform vec3 u_annexLight1;\nuniform vec3 u_annexLight2;\nuniform vec3 u_annexLightCol0;\nuniform vec3 u_annexLightCol1;\nuniform vec3 u_annexLightCol2;\nuniform vec3 u_annexStageRedLight;\nuniform float u_annexStageRedGlow;\nuniform vec3 u_annexStageWhiteLight;\nuniform float u_annexStageWhiteStrobe;\n"
        )
        .replace(
          "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 col=base*(amb + diff*vec3(0.52, 0.56, 0.62));\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;",
          "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 direct = diff*vec3(0.52, 0.56, 0.62);\n  if(u_annexLighting > 0.5){\n    float emitter = step(1.25, max(max(u_flatCol.r, u_flatCol.g), u_flatCol.b));\n    amb = mix(vec3(0.026, 0.027, 0.030), amb, emitter);\n    direct *= mix(0.11, 0.80, emitter);\n    spec *= mix(0.12, 1.00, emitter);\n    vec3 bulbSum = vec3(0.0);\n    vec3 L0 = u_annexLight0 - v_wpos;\n    vec3 L1 = u_annexLight1 - v_wpos;\n    vec3 L2 = u_annexLight2 - v_wpos;\n    vec3 D0 = normalize(v_wpos - u_annexLight0);\n    vec3 D1 = normalize(v_wpos - u_annexLight1);\n    vec3 D2 = normalize(v_wpos - u_annexLight2);\n    float c0 = smoothstep(0.64, 0.975, dot(D0, vec3(0.0,-1.0,0.0)));\n    float c1 = smoothstep(0.64, 0.975, dot(D1, vec3(0.0,-1.0,0.0)));\n    float c2 = smoothstep(0.64, 0.975, dot(D2, vec3(0.0,-1.0,0.0)));\n    float f0 = c0 / (1.0 + dot(L0,L0) * 1.35);\n    float f1 = c1 / (1.0 + dot(L1,L1) * 1.35);\n    float f2 = c2 / (1.0 + dot(L2,L2) * 1.35);\n    bulbSum += u_annexLightCol0 * f0 * (0.25 + 0.75 * max(dot(n, normalize(L0)), 0.0));\n    bulbSum += u_annexLightCol1 * f1 * (0.25 + 0.75 * max(dot(n, normalize(L1)), 0.0));\n    bulbSum += u_annexLightCol2 * f2 * (0.25 + 0.75 * max(dot(n, normalize(L2)), 0.0));\n    direct += bulbSum * 1.15;\n    vec3 GE = u_annexExitLight - v_wpos;\n    float gdist = dot(GE, GE);\n    float gcone = smoothstep(0.18, 0.82, dot(normalize(GE), n));\n    float gfall = u_annexExitGlow / (1.0 + gdist * 0.34);\n    direct += vec3(0.00, 1.55, 0.12) * gfall * (0.32 + 1.40 * gcone);\n    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\n    vec3 RS = u_annexStageRedLight - v_wpos;\n    float rdist = dot(RS, RS);\n    vec3 RSdir = normalize(RS);\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\n    float rsoft = smoothstep(0.0, 0.85, rfall);\n    direct += vec3(0.88, 0.035, 0.020) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\n    amb += vec3(0.070, 0.008, 0.006) * rsoft * u_annexStageRedGlow;\n    float roomFlash = clamp(u_annexStageWhiteStrobe * 0.22, 0.0, 1.0);\n    amb += vec3(0.84, 0.80, 0.72) * roomFlash;\n    direct += vec3(1.55, 1.45, 1.28) * roomFlash;\n    spec += roomFlash * 0.22;\n    float annexBlackout = mix(1.0, 0.14, u_annexStrobe);\n    amb *= annexBlackout;\n    direct *= annexBlackout;\n    spec *= mix(1.0, 0.20, u_annexStrobe);\n  }\n  vec3 col=base*(amb + direct);\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;"
        )
        .replace(
          "  float fog=1.0-exp(-dist*0.045);",
          "  float fog=1.0-exp(-dist*mix(0.045, 0.085, step(0.5, u_annexLighting)));"
        )
        .replace(
          "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  col=mix(col, fogCol, fog * 0.32);",
          "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  if(u_annexLighting > 0.5) fogCol = mix(fogCol, vec3(0.020, 0.026, 0.034), 0.66);\n  if(u_annexExitGlow > 0.01) fogCol += vec3(0.0, 0.18, 0.025) * u_annexExitGlow;\n  if(u_annexLighting > 0.5) fogCol *= mix(1.0, 0.18, u_annexStrobe);\n  col=mix(col, fogCol, fog * mix(0.32, 0.34, step(0.5, u_annexLighting)));"
        );
      return fsSource;
    }
    _buildRawProgram(vsSource, fsSource) {
      const prog = gl.createProgram();
      const vs = compile(
        gl.VERTEX_SHADER,
        IS_MOBILE ? "#define MOBILE\n" + vsSource : vsSource
      );
      const fs = compile(
        gl.FRAGMENT_SHADER,
        IS_MOBILE ? "#define MOBILE\n" + fsSource : fsSource
      );
      if (!vs || !fs) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[Zone4] Link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
      }
      return prog;
    }
    _buildOverlayProgram() {
      const prog = gl.createProgram();
      const vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }"
      );
      const fs = compile(
        gl.FRAGMENT_SHADER,
        "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }"
      );
      if (!vs || !fs) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog);
        return null;
      }
      return {
        prog: prog,
        p: gl.getAttribLocation(prog, "p"),
        col: gl.getUniformLocation(prog, "u_col")
      };
    }
    _getFogOverlay() {
      let ov = document.getElementById("z4-fog-overlay");
      if (!ov) {
        ov = document.createElement("div");
        ov.id = "z4-fog-overlay";
        ov.style.cssText =
          "position:fixed;inset:0;pointer-events:none;z-index:99998;opacity:0;" +
          "background:radial-gradient(circle at 50% 50%, rgba(245,247,252,0.96) 0%, rgba(226,231,239,0.94) 38%, rgba(198,205,215,0.96) 68%, rgba(165,174,186,0.98) 100%);" +
          "transition:opacity 0ms linear;";
        document.body.appendChild(ov);
      }
      return ov;
    }
    _setFog(alpha, durationMs) {
      if (!this.fogOverlay) return;
      this.fogOverlay.style.transition =
        "opacity " + Math.max(0, durationMs | 0) + "ms ease";
      this.fogOverlay.style.opacity = String(alpha);
    }
    _makeSolidTexture(r, g, b, a) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([r, g, b, a])
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }
    _claimLoopingVideo(path) {
      let vid = window.__claimPoolVid ? window.__claimPoolVid(path) : null;
      if (vid) {
        vid.loop = true;
        try {
          const p = vid.play();
          p && p.catch && p.catch(function () {});
        } catch (e) {}
        return vid;
      }
      vid = document.createElement("video");
      vid.muted = true;
      vid.playsInline = true;
      vid.loop = true;
      vid.preload = "auto";
      vid.autoplay = true;
      vid.setAttribute("playsinline", "");
      vid.setAttribute("webkit-playsinline", "");
      vid.src = path;
      if (window.__registerVideo) window.__registerVideo(vid);
      try {
        const p = vid.play();
        p && p.catch && p.catch(function () {});
      } catch (e) {}
      return vid;
    }
    _loadCrowdCutoutTexture(path, keyLightBg) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const img = new Image();
      tex._w = 1;
      tex._h = 1;
      img.onload = function () {
        tex._w = img.naturalWidth || img.width || 1;
        tex._h = img.naturalHeight || img.height || 1;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (!keyLightBg) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          return;
        }
        try {
          const cnv = document.createElement("canvas");
          cnv.width = tex._w;
          cnv.height = tex._h;
          const ctx = cnv.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, cnv.width, cnv.height);
          const px = data.data;
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i];
            const g = px[i + 1];
            const b = px[i + 2];
            const hi = Math.max(r, g, b);
            const lo = Math.min(r, g, b);
            if (hi > 212 && hi - lo < 24) px[i + 3] = 0;
          }
          ctx.putImageData(data, 0, 0);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
        } catch (e) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        }
      };
      img.src = path;
      return tex;
    }
    _initStationTextures() {
      const base = "files/img/rooms/z4/";
      const tex = {
        floor: loadStaticTex(base + "SPACE-FLOOR.png"),
        floorGlass: loadStaticTex(base + "SPACE-FLOOR-GLASS.png"),
        ceil: loadStaticTex(base + "SPACE-CEILING.png"),
        lp1: loadStaticTex(base + "SPACE-LP1.png"),
        lp2: loadStaticTex(base + "SPACE-LP2.png"),
        lp3: loadStaticTex(base + "SPACE-LP3.png"),
        rp1: loadStaticTex(base + "SPACE-RP1.png"),
        rp2: loadStaticTex(base + "SPACE-RP2.png"),
        rp3: loadStaticTex(base + "SPACE-RP3.png"),
        winT: loadStaticTex(base + "SPACE-RP1.png"),
        winC: loadStaticTex(base + "SPACE-RP2.png"),
        winB: loadStaticTex(base + "SPACE-RP3.png"),
        door: loadStaticTex(base + "SPACE-DOOR.png"),
        spaceHallDoor: loadStaticTex(base + "basement/ALT-HALL-DOOR.png"),
        exitWall: loadStaticTex(base + "WALL-EXIT.png"),
        basementWallExit: loadStaticTex(base + "basement/WALL-EXIT.png"),
        basementWall: loadStaticTex(base + "basement/BASEMENT-WALL.png"),
        basementAltWall: loadStaticTex(base + "basement/ALT-WALL.png"),
        basementBackWall: loadStaticTex(base + "basement/BACKWALL.png"),
        basementBathroomClub: loadStaticTex(base + "basement/BATHROOM-CLUB.png"),
        basementBathroomClubWall: loadStaticTex(base + "basement/BATHROOM-CLUB-WALL.PNG"),
        basementBathroomFloor: loadStaticTex(base + "basement/BASEMENT-BATHROOM-FLOOR.png"),
        basementAltDoorHall: loadStaticTex(base + "basement/ALT-HALL-DOOR.png"),
        basementCeil: loadStaticTex(base + "basement/BASEMENT-CEILING.png"),
        basementFloor: loadStaticTex(base + "basement/BASEMENT-FLOOR.png"),
        stairWall: loadStaticTex(base + "basement/STAIR-WALL.png"),
        speakerFront: loadStaticTex(base + "basement/SPEAKERS-FRONT.png"),
        speakerLeft: loadStaticTex(base + "basement/SPEAKERS-LEFT.png"),
        speakerRight: loadStaticTex(base + "basement/SPEAKERS-RIGHT.png"),
        speaker1: loadStaticTex(base + "basement/SPEAKER-1.png"),
        speaker2: loadStaticTex(base + "basement/SPEAKER-2.png"),
        speaker3: loadStaticTex(base + "basement/SPEAKER-3.png"),
        cabinDoorClosed: loadStaticTex("files/img/rooms/z3/door-closed.png"),
        cabinDoorOpen: loadStaticTex("files/img/rooms/z3/door-open.png"),
        cabinCockpit: loadStaticTex("files/img/rooms/z3/cockpit.png"),
        cabinHallLeft: loadStaticTex("files/img/rooms/z2/hallway/RIGHTWALL.png"),
        cabinHallRight: loadStaticTex("files/img/rooms/z2/hallway/LEFTWALL_B.png"),
        cabinHallTop: loadStaticTex("files/img/rooms/z2/hallway/TOP.png"),
        cabinHallBottom: loadStaticTex("files/img/rooms/z2/hallway/GROUND.png"),
        black: this._makeSolidTexture(10, 10, 12, 255),
        earth: this._makeSolidTexture(0, 0, 0, 255),
        crywolf: this._makeSolidTexture(0, 0, 0, 255),
        bh2: this._makeSolidTexture(0, 0, 0, 255)
      };
      tex.annexCrowdBack = [];
      tex.annexCrowdSide = [];
      for (let i = 1; i <= 14; i++) {
        tex.annexCrowdBack.push(this._loadCrowdCutoutTexture(
          base + "basement/crowd2/backs/" + String(i).padStart(2, "0") + "b.png",
          true
        ));
      }
      for (let i = 1; i <= 16; i++) {
        tex.annexCrowdSide.push(this._loadCrowdCutoutTexture(
          base + "basement/crowd2/side/" + String(i).padStart(2, "0") + "s.png",
          false
        ));
      }
      this.earthVideo = this._claimLoopingVideo("files/mov/earth.mp4");
      this.crywolfVideo = this._claimLoopingVideo("files/mov/mapped/crywolf.mp4");
      this.bh2Video = this._claimLoopingVideo("files/mov/bh2.mp4");
      return tex;
    }
    _updateVideoTexture(tex, video) {
      if (!tex || !video || video.readyState < 2) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } catch (e) {}
    }
    _makeMesh(data, tex, flatCol, texMix, blend) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      return {
        buf: buf,
        count: data.length / 8,
        tex: tex,
        flatCol: flatCol || [1, 1, 1],
        texMix: typeof texMix === "number" ? texMix : 1,
        blend: !!blend
      };
    }
    _buildStationMeshes() {
      if (!window.Zone4Annex || typeof window.Zone4Annex.buildStationMeshes !== "function") {
        throw new Error("Zone4Annex.buildStationMeshes missing");
      }
      return window.Zone4Annex.buildStationMeshes.call(this);
    }
    _smooth01(t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    }
    _isAltAnnexNffActive() {
      return !!(
        (
          this.annexAltBasementActive ||
          this.annexBasementVariant === "alt" ||
          this.altAnnexRouteActive ||
          this._altAnnexCleanView ||
          (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
        ) &&
        (
          this.phase === "annex_turn_in" ||
          this.phase === "annex_hallway" ||
          this.phase === "annex_turn_in" ||          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
    }
    _altAnnexNffFocus() {
      if (this.phase === "annex_turn_in") return 0.06 + this._smooth01(this.annexTurnT || 0) * 0.12;
      if (this.phase === "annex_hallway") {
        const t = Math.max(0, Math.min(1, this.annexHallT || 0));
        const top = this._smooth01(Math.min(1, t / 0.38));
        const stairs = this._smooth01(Math.max(0, (t - 0.28) / 0.72));
        return 0.12 + top * 0.16 + stairs * 0.46;
      }
      if (this.phase === "annex_room") return 0.64 + this._smooth01(this.annexRoomT || 0) * 0.30;
      if (this.phase === "annex_exit_door") return 0.84;
      return 0.0;
    }
    _ensureAltAnnexNffAudio() {
      if (this.altAnnexNffAudio) return true;
      const a = new Audio("files/aud/nff.mp3");
      a.loop = true;
      a.preload = "auto";
      a.volume = 0.0;
      a.setAttribute("playsinline", "");
      a.setAttribute("webkit-playsinline", "");
      this.altAnnexNffAudio = a;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = window.__z4NffAudioContext || (window.__z4NffAudioContext = new AC());
          const src = ctx.createMediaElementSource(a);
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          filter.type = "lowpass";
          filter.frequency.value = 520;
          filter.Q.value = 0.82;
          gain.gain.value = 0.0;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.altAnnexNffCtx = ctx;
          this.altAnnexNffSource = src;
          this.altAnnexNffFilter = filter;
          this.altAnnexNffGain = gain;
          a.volume = 1.0;
        }
      } catch (e) {
        this.altAnnexNffCtx = null;
        this.altAnnexNffSource = null;
        this.altAnnexNffFilter = null;
        this.altAnnexNffGain = null;
      }
      return true;
    }
    _duckAltAnnexMainAudio(active) {
      const main = document.getElementById("audioPlayer") || window.audioPlayer || null;
      if (!main || main === this.altAnnexNffAudio) return;
      if (active) {
        if (!this.altAnnexMainAudioDucked) {
          this.altAnnexMainAudioDucked = true;
          this.altAnnexMainAudioPrevVolume = typeof main.volume === "number" ? main.volume : 1.0;
          this.altAnnexMainAudioPrevMuted = !!main.muted;
        }
        try {
          main.volume += (0.0 - main.volume) * 0.18;
          if (main.volume < 0.015) main.volume = 0.0;
        } catch (e) {}
      } else if (this.altAnnexMainAudioDucked) {
        const target = typeof this.altAnnexMainAudioPrevVolume === "number" ? this.altAnnexMainAudioPrevVolume : 1.0;
        try {
          main.muted = !!this.altAnnexMainAudioPrevMuted;
          main.volume += (target - main.volume) * 0.12;
          if (Math.abs(main.volume - target) < 0.02) {
            main.volume = target;
            this.altAnnexMainAudioDucked = false;
          }
        } catch (e) {
          this.altAnnexMainAudioDucked = false;
        }
      }
    }
    _updateAltAnnexNffAudio(now) {
      const active = this._isAltAnnexNffActive();
      if (!active) {
        this._duckAltAnnexMainAudio(false);
        if (this.altAnnexNffAudio) {
          if (this.altAnnexNffGain && this.altAnnexNffCtx) {
            try {
              const t = this.altAnnexNffCtx.currentTime;
              this.altAnnexNffGain.gain.setTargetAtTime(0.0, t, 0.35);
            } catch (e) {}
          } else {
            this.altAnnexNffAudio.volume += (0.0 - this.altAnnexNffAudio.volume) * 0.08;
            if (this.altAnnexNffAudio.volume < 0.004) {
              try { this.altAnnexNffAudio.pause(); } catch (e) {}
              this.altAnnexNffPlaying = false;
            }
          }
        }
        return;
      }
      this._ensureAltAnnexNffAudio();
      this._duckAltAnnexMainAudio(true);
      const a = this.altAnnexNffAudio;
      if (!a) return;
      const focus = this._altAnnexNffFocus();
      const distant = 1.0 - focus;
      const targetGain = 0.045 + focus * 0.42;
      const targetFreq = 430 + focus * 3100;
      const targetQ = 0.70 + distant * 0.45;
      this.altAnnexNffTargetGain = targetGain;
      if (this.altAnnexNffCtx && this.altAnnexNffGain && this.altAnnexNffFilter) {
        try {
          if (this.altAnnexNffCtx.state === "suspended") this.altAnnexNffCtx.resume();
          const t = this.altAnnexNffCtx.currentTime;
          this.altAnnexNffGain.gain.setTargetAtTime(targetGain, t, 0.18);
          this.altAnnexNffFilter.frequency.setTargetAtTime(targetFreq, t, 0.22);
          this.altAnnexNffFilter.Q.setTargetAtTime(targetQ, t, 0.28);
          a.volume = 1.0;
        } catch (e) {}
      } else {
        a.volume += (targetGain - a.volume) * 0.08;
      }
      try {
        if (a.paused || !this.altAnnexNffPlaying) {
          const pr = a.play();
          if (pr && pr.catch) pr.catch(function () {});
          this.altAnnexNffPlaying = true;
        }
      } catch (e) {}
    }
    _forceAnnexSequenceAudio() {
      const path = "files/aud/053.mp3";
      try {
        window.audioTracks = window.audioTracks || [];
        if (window.audioTracks.indexOf(path) < 0) window.audioTracks.push(path);
      } catch (e) {}
      try {
        const a =
          document.getElementById("audioPlayer") ||
          window.audioPlayer ||
          document.querySelector("audio");
        if (!a) return;
        const current = a.currentSrc || a.src || "";
        if (current.indexOf(path) < 0) {
          a.pause();
          a.src = path;
          a.currentTime = 0;
          a.loop = true;
          if (a.load) a.load();
        } else {
          a.currentTime = 0;
        }
        a.volume = 1.0;
        const p = a.play();
        p && p.catch && p.catch(function () {});
      } catch (e) {}
    }
    _triggerAnnexDjSequence(now) {
      if (this.annexSequenceActive) return;
      this.annexSequenceActive = true;
      this.annexSequenceStart = now;
      this.annexDjBlinkCount = 2;
      this.annexStrobe = 1;
      this.annexTripFX = 1.0;
      this.annexTripFXTarget = 1.0;
      this._annexRedWash = 0.62;
      this._annexRedGlow = 0.85;
      this._annexWhiteStrobe = 0.0;
      this._annexDarkPulse = 0.35;
      this.z4Trip = Math.max(this.z4Trip || 1.0, 1.18);
      this.z4IsOOB = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4FractalSeed = this.z4ModeSeed;
      this.blinking = true;
      this.blinkStart = now - 210;
      this.lastBlinkTime = now;
      this.nextBlinkInterval = 2300 + Math.random() * 2400;
      this.z4BlinkPeakTime = now;
      this._forceAnnexSequenceAudio();
      try {
        if (this.crywolfVideo) {
          this.crywolfVideo.currentTime = 0;
          const vp = this.crywolfVideo.play();
          vp && vp.catch && vp.catch(function () {});
        }
        if (this.bh2Video) {
          this.bh2Video.currentTime = 0;
          const bp = this.bh2Video.play();
          bp && bp.catch && bp.catch(function () {});
        }
      } catch (e) {}
    }
    _hardShiftAudioForZone2Return() {
      try {
        if (this.altAnnexNffGain && this.altAnnexNffCtx) {
          this.altAnnexNffGain.gain.setValueAtTime(0.0, this.altAnnexNffCtx.currentTime);
        }
        if (this.altAnnexNffAudio) {
          this.altAnnexNffAudio.pause();
          this.altAnnexNffAudio.currentTime = 0;
          this.altAnnexNffPlaying = false;
        }
      } catch (e) {}
      try {
        const main = document.getElementById("audioPlayer") || window.audioPlayer || document.querySelector("audio");
        if (!main || main === this.altAnnexNffAudio) return;
        const tracks = Array.isArray(window.audioTracks) ? window.audioTracks : [];
        let pick = "files/aud/011.mp3";
        for (let i = 0; i < tracks.length; i++) {
          const t = tracks[(i + 3) % tracks.length];
          if (typeof t === "string" && t.indexOf("nff.mp3") < 0 && t.indexOf("053.mp3") < 0) {
            pick = t;
            break;
          }
        }
        main.pause();
        main.muted = false;
        main.volume = typeof this.altAnnexMainAudioPrevVolume === "number"
          ? Math.max(0.65, this.altAnnexMainAudioPrevVolume)
          : 1.0;
        main.src = pick;
        main.currentTime = 0;
        if (main.load) main.load();
        const pr = main.play();
        pr && pr.catch && pr.catch(function () {});
        this.altAnnexMainAudioDucked = false;
      } catch (e) {}
    }
    _altAnnexZone2Cover(on) {
      let ov = document.getElementById("z4-alt-annex-zone2-cover");
      if (!ov) {
        ov = document.createElement("div");
        ov.id = "z4-alt-annex-zone2-cover";
        ov.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:2147483647",
          "pointer-events:none",
          "opacity:0",
          "transition:opacity 360ms ease",
          "background:rgba(0,0,0,0.96)",
          "will-change:opacity"
        ].join(";");
        document.body.appendChild(ov);
      }
      requestAnimationFrame(function () {
        ov.style.opacity = on ? "1" : "0";
      });
      if (!on) {
        setTimeout(function () {
          const kill = document.getElementById("z4-alt-annex-zone2-cover");
          if (kill && kill.parentNode) kill.parentNode.removeChild(kill);
        }, 440);
      }
      return ov;
    }
    _scrubZone2FromAltAnnex() {
      const z2 = window.currentZone2;
      if (!z2) return false;
      z2.activePOV = "center";
      z2.pendingPOV = null;
      z2.slideState = "idle";
      z2.slideOffset = 0;
      z2.slideDir = 0;
      z2.povSwitchTime = performance.now();
      z2.facing = "S";
      z2.hallwayYaw = Math.PI;
      z2.hallwayYawTarget = Math.PI;
      z2.camZ = typeof z2.INTERSECTION_Z === "number" ? z2.INTERSECTION_Z - 0.75 : 1.65;
      z2.intersectionReached = true;
      z2.seqState = "initial";
      z2.z4RouteActive = false;
      z2.z4RouteStep = 0;
      z2.z4LeftBlinkCount = 0;
      z2.z4TransitionStarted = false;
      z2.z4RouteTriggered = false;
      z2.route3Active = false;
      z2.route3Step = 0;
      z2.readyForZone3 = false;
      z2.z3TransitionStarted = false;
      z2.z2ExitStarted = false;
      z2.z2ExitTime = 0;
      z2.zone3Route = "z3";
      z2.__fromAltAnnexDoor = true;
      z2.__z4RouteDisabledUntil = performance.now() + 12000;
      window.__z4Route = false;
      window.__z4RouteActive = false;
      window.mx = 0;
      window.my = 0;
      window.z2SpaceHeld = false;
      window.z2TouchHeld = false;
      return true;
    }
    _returnAltAnnexToZone2() {
      if (this.altAnnexZone2Returned) return true;
      this.altAnnexZone2Returned = true;
      this._hardShiftAudioForZone2Return();
      window.__z4Route = false;
      window.__z4RouteActive = false;
      window.__z4AltAnnexZone2ReturnActive = true;
      window.__z4AltAnnexZone2ReturnBlockUntil = performance.now() + 12000;
      window.isEngine1Dead = true;
      window.isEngine4Dead = true;
      window.__z4LoopToken = (window.__z4LoopToken || 0) + 1;
      window.__zone2Governor = null;
      if (
        typeof window.startZone4 === "function" &&
        window.__z4AltAnnexStartZone4GuardInstalled !== true
      ) {
        window.__z4AltAnnexStartZone4GuardInstalled = true;
        window.__z4AltAnnexStartZone4Base = window.startZone4;
        window.startZone4 = function () {
          if (
            typeof window.__z4AltAnnexZone2ReturnBlockUntil === "number" &&
            performance.now() < window.__z4AltAnnexZone2ReturnBlockUntil
          ) {
            return false;
          }
          return window.__z4AltAnnexStartZone4Base.apply(this, arguments);
        };
      }
      if (typeof window.startZone2 !== "function") {
        this._altAnnexZone2Cover(false);
        return false;
      }
      try {
        window.startZone2({ fromZ4AltAnnexDoor: true });
      } catch (e) {
        console.error("[Zone4] Alt-Annex Zone2 start failed:", e);
        this._altAnnexZone2Cover(false);
        return false;
      }
      try { this._scrubZone2FromAltAnnex(); } catch (e) { console.error("[Zone4] Alt-Annex scrub failed:", e); }
      setTimeout(this._scrubZone2FromAltAnnex.bind(this), 30);
      setTimeout(this._scrubZone2FromAltAnnex.bind(this), 90);
      setTimeout(this._scrubZone2FromAltAnnex.bind(this), 180);
      setTimeout(this._scrubZone2FromAltAnnex.bind(this), 420);
      setTimeout(() => {
        try {
          if (window.currentZone4 === this) window.currentZone4 = null;
          this.destroy();
        } catch (e) {
          this.isDead = true;
        }
      }, 80);
      setTimeout(() => {
        window.__z4AltAnnexZone2ReturnActive = false;
        this._altAnnexZone2Cover(false);
      }, 360);
      return true;
    }
    _beginAltAnnexZone2Return(now) {
      if (this.altAnnexZone2ReturnActive || this.altAnnexZone2Returned) return true;
      this.altAnnexZone2ReturnActive = true;
      this.altAnnexZone2ReturnStart = now;
      this.annexRoomT = 1;
      this.annexRoomDir = 1;
      this.annexRoomView = "path";
      this.turnAnimating = false;
      this.turnInputLatch = 0;
      this.annexTurnInputLatch = 0;
      window.__z4AnnexTurnRequested = 0;
      window.__z4AltAnnexZone2ReturnActive = true;
      this._altAnnexZone2Cover(true);
      setTimeout(this._returnAltAnnexToZone2.bind(this), 430);
      return true;
    }
    _beginZ3BBlackHoleFromAltAnnex(now) {
    }
    _beginZ4BCabin(now) {
      const fromAnnexSequence = !!this.annexSequenceActive;
      this.phase = "z4b_cabin";
      this.phaseStart = now;
      this.z4bCabinState = fromAnnexSequence ? "side_entry" : "entry";
      this.z4bCabinStart = now;
      this.z4bCabinCrashStart = 0;
      this.z4bCabinCamZ = 12.0;
      this.z4bCabinCamX = fromAnnexSequence ? -1.42 : 0.0;
      this.z4bCabinYaw = fromAnnexSequence ? -Math.PI * 0.5 : 0.0;
      this.z4bCabinZoom = 1.0;
      this.z4bCabinShake = 0;
      this.z4bCabinFlash = 0;
      this.z4bCabinWalking = true;
      this.z4bCabinFractalActive = fromAnnexSequence;
      this.z4bStopAtCockpit = fromAnnexSequence || !!this.z4bStopAtCockpit;
      this.cx = 0;
      this.cy = 0;
      if (typeof window.mx === "number") window.mx = 0;
      if (typeof window.my === "number") window.my = 0;
    }
    _installZ4BIslandLogoTextureHook() {
      if (window.Zone4IslandBridge && typeof window.Zone4IslandBridge.installLogoTextureHook === "function") {
        return window.Zone4IslandBridge.installLogoTextureHook(this);
      }
    }
    _startZ4BIslandWake(now) {
      if (window.Zone4IslandBridge && typeof window.Zone4IslandBridge.startWake === "function") {
        return window.Zone4IslandBridge.startWake(this, now);
      }
      console.error("[Zone4] Zone4IslandBridge.startWake is missing");
    }
    _resetAltAnnexLapPattern() {
      this.totalClockwiseTravel = 0;
      this.totalCounterClockwiseTravel = 0;
      this.totalClockwiseLapCount = 0;
      this.totalCounterClockwiseLapCount = 0;
      this.altAnnexPatternStage = 0;
      this.altAnnexCwTravel = 0;
      this.altAnnexCcwTravel = 0;
      this.altAnnexCwLapCount = 0;
      this.altAnnexCcwLapCount = 0;
      this.altAnnexClockwiseReady = false;
      this.altAnnexCounterClockwiseReady = false;
      this.altAnnexDoorOpen = false;
      this.altAnnexRouteActive = false;
      this.annexAltBasementActive = false;
      this.annexBasementVariant = "normal";
      this._publishAltAnnexState();
    }
    _publishAltAnnexState() {
      window.__z4AltAnnex = {
        stage: this.altAnnexPatternStage || 0,
        cw: this.altAnnexCwLapCount || 0,
        ccw: this.altAnnexCcwLapCount || 0,
        cwReady: !!this.altAnnexClockwiseReady,
        ccwReady: !!this.altAnnexCounterClockwiseReady,
        doorOpen: !!this.altAnnexDoorOpen,
        routeActive: !!this.altAnnexRouteActive,
        basementVariant: this.annexBasementVariant || "normal",
        cwProgress: Math.max(0, Math.min(1, (this.altAnnexCwTravel || 0) / (Math.PI * 2))),
        ccwProgress: Math.max(0, Math.min(1, (this.altAnnexCcwTravel || 0) / (Math.PI * 2))),
        totalCW: this.totalClockwiseLapCount || 0,
        totalCCW: this.totalCounterClockwiseLapCount || 0,
        netCW: this.clockwiseLapCount || 0,
        netCCW: this.counterClockwiseLapCount || 0
      };
    }
    _updateAltAnnexLapPattern(deltaU, now) {
      const TAU = Math.PI * 2;
      if (!isFinite(deltaU) || Math.abs(deltaU) < 0.000001) {
        this._publishAltAnnexState();
        return;
      }
      if (deltaU > 0) this.totalClockwiseTravel += deltaU;
      else this.totalCounterClockwiseTravel += -deltaU;
      this.totalClockwiseLapCount = Math.floor(this.totalClockwiseTravel / TAU);
      this.totalCounterClockwiseLapCount = Math.floor(this.totalCounterClockwiseTravel / TAU);
      if (this.altAnnexPatternStage >= 2) {
        this.altAnnexCwLapCount = 1;
        this.altAnnexCcwLapCount = 1;
        this.altAnnexClockwiseReady = true;
        this.altAnnexCounterClockwiseReady = true;
        this.altAnnexDoorOpen = true;
        this._publishAltAnnexState();
        return;
      }
      if (this.altAnnexPatternStage === 0) {
        if (deltaU > 0) {
          this.altAnnexCwTravel += deltaU;
          this.altAnnexCwLapCount = Math.floor(this.altAnnexCwTravel / TAU);
          if (this.altAnnexCwLapCount >= 1) {
            this.altAnnexCwLapCount = 1;
            this.altAnnexClockwiseReady = true;
            this.altAnnexPatternStage = 1;
            this.altAnnexCcwTravel = 0;
            this.altAnnexCcwLapCount = 0;
            if (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) {
              console.log("[Zone4] ALT annex: clockwise lap complete. Reverse and complete one counterclockwise lap.");
              this.altAnnexLastLog = now;
            }
          }
        } else if (!this.altAnnexClockwiseReady) {
          this.altAnnexCwTravel = 0;
          this.altAnnexCwLapCount = 0;
        }
      } else if (this.altAnnexPatternStage === 1) {
        this.altAnnexCwLapCount = 1;
        this.altAnnexClockwiseReady = true;
        if (deltaU < 0) {
          this.altAnnexCcwTravel += -deltaU;
          this.altAnnexCcwLapCount = Math.floor(this.altAnnexCcwTravel / TAU);
          if (this.altAnnexCcwLapCount >= 1) {
            this.altAnnexCcwLapCount = 1;
            this.altAnnexCounterClockwiseReady = true;
            this.altAnnexPatternStage = 2;
            this.altAnnexDoorOpen = true;
            if (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) {
              console.log("[Zone4] ALT annex: one clockwise + one counterclockwise complete. Annex doorway is now open.");
              this.altAnnexLastLog = now;
            }
          }
        }
      }
      this.altAnnexDoorOpen = !!(this.altAnnexClockwiseReady && this.altAnnexCounterClockwiseReady);
      this._publishAltAnnexState();
    }
    _updateBlink(now) {
      const facingDjBooth =
        this.phase === "annex_room" &&
        (this.annexRoomView || "path") === "stage" &&
        !this.turnAnimating &&
        !this.annexSequenceActive;
      if (!facingDjBooth && !this.annexSequenceActive) {
        this.annexDjBlinkCount = 0;
      }
      if (now - this.lastBlinkTime > this.nextBlinkInterval) {
        this.blinking = true;
        this.blinkStart = now;
        this.lastBlinkTime = now;
        this.nextBlinkInterval = this.annexSequenceActive
          ? 2400 + Math.random() * 3200
          : 4000 + Math.random() * 7000;
        this.z4ModeSeed = Math.random() * 1000.0;
        this.z4FractalSeed = this.z4ModeSeed;
        this.z4BlinkPeakTime = now;
        if (facingDjBooth) {
          this.annexDjBlinkCount = (this.annexDjBlinkCount || 0) + 1;
          if (this.annexDjBlinkCount >= 2) this._triggerAnnexDjSequence(now);
        }
      }
      this.rBlink = 0;
      if (this.blinking) {
        const e = now - this.blinkStart;
        const slowBlink = !!this.annexSequenceActive;
        const closeMs = slowBlink ? 260 : 120;
        const holdMs = slowBlink ? 190 : 100;
        const openMs = slowBlink ? 360 : 120;
        if (e < closeMs) {
          this.rBlink = e / closeMs;
        } else if (e < closeMs + holdMs) {
          this.rBlink = 1;
        } else if (e < closeMs + holdMs + openMs) {
          this.rBlink = 1 - (e - closeMs - holdMs) / openMs;
        } else {
          this.rBlink = 0;
          this.blinking = false;
        }
      }
    }
    _updatePhase(now, dt) {
      const moving = z4SpaceHeld || z4TouchHeld;
      if (this.shakeIntensity > 0) {
        if (
          this.annexSequenceActive &&
          (
            this.phase === "annex_room" ||
            this.phase === "annex_exit_door" ||
            this.phase === "z4b_cabin"
          )
        ) {
          this.shakeOffsetX = Math.sin(now * 0.0017) * this.shakeIntensity * 0.42;
          this.shakeOffsetY = Math.cos(now * 0.0013 + 1.7) * this.shakeIntensity * 0.30;
        } else {
          this.shakeOffsetX = Math.sin(now * 0.037) * Math.cos(now * 0.029) * this.shakeIntensity;
          this.shakeOffsetY = Math.cos(now * 0.031) * Math.sin(now * 0.043) * this.shakeIntensity;
        }
      } else {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
      if (this.phase === "ascent") {
        this.progress = Math.min(1, (now - this.ascentStart) / this.ascentDuration);
        if (moving) this.walkAngle += dt * 0.42;
        this.neuralIntensity = 0.7 + this.progress * 1.2;
        if (this.progress >= 1 && !this.phaseFogArmed) {
          this.phaseFogArmed = true;
          this.phase = "docking_shake";
          this.phaseStart = now;
          this.shakeIntensity = 0.025;
        }
      } else if (this.phase === "docking_shake") {
        this.progress = 1;
        this.neuralIntensity = 2.0;
        var elapsed = now - this.phaseStart;
        this.shakeIntensity = 0.025 + 0.035 * Math.min(1, elapsed / 800);
        if (elapsed >= this.dockingShakeDuration) {
          this.phase = "fog_in";
          this.phaseStart = now;
          this.shakeIntensity = 0;
          this._setFog(1, this.fogInDuration);
        }
      } else if (this.phase === "fog_in") {
        this.progress = 1;
        this.neuralIntensity = 2.0;
        if (now - this.phaseStart >= this.fogInDuration) {
          this.phase = "bay";
          this.phaseStart = now;
          this._setFog(0, this.fogOutDuration);
        }
      } else if (this.phase === "bay") {
        if (moving) {
          this.walkoff = Math.min(1, this.walkoff + dt * 0.30);
        }
        if (this.walkoff >= 1) {
          this.phase = "hallway";
          this.phaseStart = now;
        }
        this.neuralIntensity = 1.4 + this.walkoff * 1.2;
      } else if (this.phase === "hallway") {
        if (moving) {
          this.hallwayT = Math.min(1, this.hallwayT + dt * 0.28);
        }
        if (this.hallwayT >= 1) {
          this.phase = "entering_ring";
          this.phaseStart = now;
          this.enterRingT = 0;
        }
        this.neuralIntensity = 2.0 + this.hallwayT * 0.3;
      } else if (this.phase === "entering_ring") {
        this.enterRingT = Math.min(1, this.enterRingT + dt * 0.9);
        if (this.enterRingT >= 1) {
          this.phase = "ring";
          this.phaseStart = now;
          this.ringView = "window";
          this.ringWindowSide = 1;
          this.turnInputLatch = 0;
        }
        this.neuralIntensity = 2.3;
      } else if (this.phase === "ring") {
        if (this.turnAnimating) {
          var turnElapsed = now - this.turnStart;
          if (turnElapsed >= this.turnDuration) {
            if (typeof this.turnDirectionTo === "number") this.ringDirection = this.turnDirectionTo;
            else this.ringDirection = this.turnTo;
            if (this.turnViewTo) this.ringView = this.turnViewTo;
            if (typeof this.turnWindowSideTo === "number") this.ringWindowSide = this.turnWindowSideTo;
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
            this.cx = 0;
            this.cy = 0;
            if (typeof window.mx === "number") window.mx = 0;
            if (typeof window.my === "number") window.my = 0;
          }
        }
        if (window.__z4TurnRequested && !this.turnAnimating) {
          const turnReq = typeof window.__z4TurnRequested === "number"
            ? window.__z4TurnRequested
            : 1;
          window.__z4TurnRequested = false;
          if (this.ringView === "window") {
            const windowSide = this.ringWindowSide || 1;
            this._startStationViewTurn(
              now,
              -turnReq * Math.PI * 0.5,
              "path",
              windowSide * turnReq,
              windowSide
            );
          } else {
            const windowSide = this._stationWindowSideAtRingU();
            const requestedWindowSide = -(this.ringDirection || 1) * turnReq;
            if (windowSide && windowSide === requestedWindowSide) {
              this._startStationViewTurn(
                now,
                -turnReq * Math.PI * 0.5,
                "window",
                this.ringDirection,
                windowSide
              );
            } else {
              this.turnTo = this.ringDirection > 0 ? -1 : 1;
              this.turnSpin = -turnReq;
              this._startStationViewTurn(
                now,
                this.turnSpin * Math.PI,
                "path",
                this.turnTo,
                this.ringWindowSide
              );
            }
          }
        }
        window.__z4TurnRequested = false;
        if (moving && !this.turnAnimating && this.ringView === "path") {
          this.ringU = (this.ringU + dt * 0.26 * this.ringDirection) % (Math.PI * 2);
        }
        if (this.ringU < 0) this.ringU += Math.PI * 2;
        var prevU = this.lastRingU;
        var currU = this.ringU;
        var deltaU = currU - prevU;
        if (deltaU > Math.PI) deltaU -= Math.PI * 2;
        if (deltaU < -Math.PI) deltaU += Math.PI * 2;
        this.ringTravel += Math.abs(deltaU);
        this.signedRingTravel += deltaU;
        this.lapCrossings = Math.floor(Math.abs(this.signedRingTravel) / Math.PI);
        this.lastRingU = currU;
        this.clockwiseLapCount = Math.floor(Math.max(0, this.signedRingTravel) / (Math.PI * 2));
        this.counterClockwiseLapCount = Math.floor(Math.max(0, -this.signedRingTravel) / (Math.PI * 2));
        this.lapCount = Math.max(this.clockwiseLapCount, this.counterClockwiseLapCount);
        this._updateAltAnnexLapPattern(deltaU, now);
        var normalAnnexDoorOpen = this.counterClockwiseLapCount >= 3;
        this.annexDoorOpen = normalAnnexDoorOpen || this.altAnnexDoorOpen;
        if (this.lapCount >= 99) {
          this.blackholeIntensity = 1;
          this.blackholeVisible = true;
        }
        var SECTION_ANGLE_LAP = (Math.PI * 2) / 16;
        if (this.annexDoorOpen && moving && this.ringView === "path") {
          var annexU = (this.annexSection + 0.5) * SECTION_ANGLE_LAP;
          var annexDist = Math.abs(this.ringU - annexU);
          if (annexDist > Math.PI) annexDist = Math.PI * 2 - annexDist;
          if (annexDist <= SECTION_ANGLE_LAP * 0.5) {
            this.annexEntryU = annexU;
            this.annexTargetU = annexU;
            this.ringU = annexU;
            this.lastRingU = annexU;
            this.phase = "annex_turn_in";
            this.phaseStart = now;
            this.annexTurnT = 0;
            this.annexHallT = 0;
            this.annexRoomT = 0;
            this.annexExitT = 0;
            this.annexRoomDir = 1;
            this.annexRoomView = "path";
            this.annexTurnInputLatch = 0;
            this.altAnnexRouteActive = !!this.altAnnexDoorOpen;
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this._publishAltAnnexState();
            console.log("[Zone4] annex entry variant:", this.annexBasementVariant);
            this.ringView = "path";
            this.turnAnimating = false;
            this.turnInputLatch = 0;
          }
        } else if (this.clockwiseLapCount >= 3) {
          var entranceU = (this.stationSection + 0.5) * SECTION_ANGLE_LAP;
          var angDist = Math.abs(this.ringU - entranceU);
          if (angDist > Math.PI) angDist = Math.PI * 2 - angDist;
          if (angDist <= SECTION_ANGLE_LAP * 0.5) {
            this.ringU = entranceU;
            this.lastRingU = entranceU;
            this.phase = "reverse_entering_ring";
            this.phaseStart = now;
            this.enterRingT = 1;
          }
        }
        this.neuralIntensity = 2.2 + this.lapCount * 0.65;
      } else if (this.phase === "annex_turn_in") {
        if (moving) this.annexTurnT = Math.min(1, this.annexTurnT + dt * 0.95);
        if (this.annexTurnT >= 1) {
          this.phase = "annex_hallway";
          this.phaseStart = now;
          this.annexHallT = 0;
        }
        this.neuralIntensity = 3.0;
      } else if (this.phase === "annex_hallway") {
        if (moving) this.annexHallT = Math.min(1, this.annexHallT + dt * 0.17);
        if (this.annexHallT >= 1) {
          this.phase = "annex_room";
          this.phaseStart = now;
          this.annexRoomT = 0;
          this.annexRoomDir = 1;
          this.annexRoomView = "path";
          this.annexTurnInputLatch = 0;
        }
        this.neuralIntensity = 3.1;
      } else if (this.phase === "annex_room") {
        const altAnnexLocked = typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked();
        const altAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();
        if (altAnnexLocked) {
          this.annexRoomView = "path";
          this.annexRoomDir = 1;
          this.annexTurnInputLatch = 0;
          this.turnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
          if (this.turnAnimating) {
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
          }
        }
        const turnReq = altAnnexLocked ? 0 : (window.__z4AnnexTurnRequested || 0);
        const centerZone = this.annexRoomT >= 0.34 && this.annexRoomT <= 0.72;
        const farZone = this.annexRoomT >= 0.965;
        const entranceZone = this.annexRoomT <= 0.025;
        if (this.turnAnimating) {
          var annexTurnElapsed = now - this.turnStart;
          if (annexTurnElapsed >= this.turnDuration) {
            if (this.turnViewTo === "annex_stage") this.annexRoomView = "stage";
            else if (this.turnViewTo === "annex_path") this.annexRoomView = "path";
            if (typeof this.turnDirectionTo === "number") this.annexRoomDir = this.turnDirectionTo;
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
            this.cx = 0;
            this.cy = 0;
            this.annexTurnInputLatch = 0;
            window.__z4AnnexTurnRequested = 0;
            if (typeof window.mx === "number") window.mx = 0;
            if (typeof window.my === "number") window.my = 0;
          }
        }
        if (!this.turnAnimating && entranceZone && (this.annexRoomDir || 1) < 0) {
          this.annexRoomT = 0;
          this.annexRoomView = "path";
          this.annexTurnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
          this._startStationViewTurn(now, Math.PI, "annex_path", 1, null);
        }
        if (turnReq && !this.turnAnimating) {
          window.__z4AnnexTurnRequested = 0;
          const dirNow = this.annexRoomDir || 1;
          const stageReq = dirNow >= 0 ? -1 : 1;
          const pathReq = dirNow >= 0 ? 1 : -1;
          const toStageAngle = dirNow >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          const toPathAngle = dirNow >= 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
          if ((this.annexRoomView || "path") === "stage") {
            if (centerZone && turnReq === pathReq) {
              this._startStationViewTurn(now, toPathAngle, "annex_path", dirNow, null);
            }
          } else if (!altAnnexRouteNow && farZone && !this.annexSequenceActive) {
            this.annexRoomT = 1;
            this._startStationViewTurn(now, turnReq * Math.PI, "annex_path", -1, null);
          } else if (centerZone && turnReq === stageReq) {
            this._startStationViewTurn(now, toStageAngle, "annex_stage", dirNow, null);
          }
          this.annexTurnInputLatch = 0;
        } else if (!turnReq && Math.abs(this.cx) < 0.48) {
          this.annexTurnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
        }
        if (
          this.annexSequenceActive &&
          !altAnnexRouteNow &&
          moving &&
          !this.turnAnimating &&
          (this.annexRoomView || "path") === "path" &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.955
        ) {
          this.annexRoomT = 1;
          this.annexExitT = 0;
          this.phase = "annex_exit_door";
          this.phaseStart = now;
          this.neuralIntensity = 3.9;
          return;
        }
        const z4AltAnnexDoorStopT = 1.0; 
        if (moving && !this.turnAnimating && (this.annexRoomView || "path") === "path") {
          const dir = this.annexRoomDir || 1;
          const roomSpeed = altAnnexRouteNow ? 0.16 : 0.13;
          const roomMaxT = altAnnexRouteNow ? z4AltAnnexDoorStopT : 1;
          this.annexRoomT = Math.max(0, Math.min(roomMaxT, this.annexRoomT + dt * roomSpeed * dir));
        } else if (this.annexRoomT >= 1) this.annexRoomT = 1;
        if (this.annexRoomT <= 0) this.annexRoomT = 0;
        if (
          altAnnexRouteNow &&
          !this.altAnnexZone2ReturnActive &&
          !this.altAnnexZone2Returned &&
          !this.turnAnimating &&
          (this.annexRoomView || "path") === "path" &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.985
        ) {
          this._beginAltAnnexZone2Return(now);
          return;
        }
        this.neuralIntensity = altAnnexLocked ? 3.55 : (this.annexSequenceActive ? 2.25 : 3.25);
      } else if (this.phase === "annex_exit_door") {
        if (moving) this.annexExitT = Math.min(1, (this.annexExitT || 0) + dt * 0.42);
        if (this.annexExitT >= 1) {
          this.annexExitT = 1;
          this._beginZ4BCabin(now);
return;
        }
        this.neuralIntensity = 3.95;
      } else if (this.phase === "z4b_cabin") {
        this.neuralIntensity = 3.45;
        this.z4bCabinWalking = false;
        this.z4bCabinFlash = 0;
        function smoothZ4B(t) {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        }
        if (this.z4bCabinState === "side_entry") {
          var sideAge = now - this.z4bCabinStart;
          var sideRaw = Math.max(0, Math.min(1, sideAge / 2550));
          var sideMoveT = smoothZ4B((sideRaw - 0.02) / 0.62);
          var sideTurnT = smoothZ4B((sideRaw - 0.18) / 0.72);
          var sideSettleT = smoothZ4B((sideRaw - 0.70) / 0.30);
          this.z4bCabinCamX = -1.42 * (1.0 - sideMoveT);
          this.z4bCabinCamZ = 12.0 + 0.22 * sideSettleT;
          this.z4bCabinYaw = -Math.PI * 0.5 * (1.0 - sideTurnT);
          this.z4bCabinZoom = 0.985 + 0.015 * sideTurnT;
          this.z4bCabinShake = 0.0;
          this.z4bCabinFlash = 0.0;
          this.z4bCabinWalking = sideRaw < 0.84;
          this.neuralIntensity = 3.75 - 0.14 * sideTurnT;
          if (sideRaw >= 1) {
            this.z4bCabinState = "side_settle";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0.0;
            this.z4bCabinCamZ = 12.22;
            this.z4bCabinYaw = 0.0;
            this.z4bCabinZoom = 1.0;
            this.z4bCabinWalking = false;
          }
        } else if (this.z4bCabinState === "side_turn") {
          this.z4bCabinState = "side_settle";
          this.z4bCabinStart = now;
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.22;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = false;
        } else if (this.z4bCabinState === "side_settle") {
          var settleAge = now - this.z4bCabinStart;
          var settleT = smoothZ4B(settleAge / 520);
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.22 + 0.08 * settleT;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.0;
          this.z4bCabinFlash = 0.0;
          this.neuralIntensity = 3.48;
          if (settleT >= 1) {
            this.z4bCabinState = "forward";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0.0;
            this.z4bCabinCamZ = 12.30;
            this.z4bCabinYaw = 0.0;
            this.z4bCabinZoom = 1.0;
          }
        } else if (this.z4bCabinState === "entry") {
          var entryAge = now - this.z4bCabinStart;
          var entryT = smoothZ4B(entryAge / 900);
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.0 + 0.25 * entryT;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = true;
          if (entryT >= 1) {
            this.z4bCabinState = "forward";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0;
            this.z4bCabinYaw = 0;
            this.z4bCabinZoom = 1;
          }
        } else if (this.z4bCabinState === "forward") {
          this.z4bCabinCamX = 0.0;
          this.z4bCabinYaw = 0.0;
          if (moving) {
            this.z4bCabinCamZ = Math.min(19.7, this.z4bCabinCamZ + dt * 1.55);
            this.z4bCabinWalking = true;
          }
          if (this.z4bCabinCamZ >= 19.7) {
            if (this.z4bStopAtCockpit) {
              this.z4bCabinState = "hold_cockpit";
              this.z4bCabinStart = now;
              this.z4bCabinCamZ = 19.7;
              this.z4bCabinCamX = 0.0;
              this.z4bCabinYaw = 0.0;
              this.z4bCabinWalking = false;
              this.z4bCabinShake = 0;
              this.z4bCabinFlash = 0;
            } else {
              this.z4bCabinState = "turbulence";
              this.z4bCabinStart = now;
              this.z4bCabinCrashStart = 0;
              this.z4bCabinWalking = false;
            }
          }
        } else if (this.z4bCabinState === "hold_cockpit") {
          var holdAge = now - this.z4bCabinStart;
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.004 + 0.006 * Math.sin(holdAge * 0.006);
          this.z4bCabinFlash = 0;
          this.z4bCabinZoom = 1.0;
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 0;
          this.neuralIntensity = 3.35;
          if (holdAge >= 1500) {
            this.z4bCabinState = "turbulence";
            this.z4bCabinStart = now;
            this.z4bCabinWalking = false;
          }
        } else if (this.z4bCabinState === "turbulence") {
          var turbAge = now - this.z4bCabinStart;
          var turbT = Math.min(1, turbAge / 9200);
          var turbEase = turbT * turbT * (3.0 - 2.0 * turbT);
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.012 + 0.23 * Math.pow(turbT, 1.85);
          this.z4bCabinFlash = turbAge > 1100 && Math.random() > 0.94 - turbT * 0.42 ? 0.18 + 0.70 * turbT : 0;
          this.z4bCabinZoom = 1.0 + 0.075 * turbEase + 0.010 * Math.sin(turbAge * 0.010);
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 0;
          this.neuralIntensity = 3.55 + turbEase * 2.25;
          if (turbAge >= 9200) {
            this.z4bCabinState = "crash";
            this.z4bCabinCrashStart = now;
            this.z4bCabinFlash = 1.0;
            this.z4bCabinShake = 0.30;
          }
        } else if (this.z4bCabinState === "crash") {
          var crashAge = now - (this.z4bCabinCrashStart || now);
          var redT = Math.max(0, Math.min(1, (crashAge - 650) / 2300));
          var blackT = Math.max(0, Math.min(1, (crashAge - 3300) / 2300));
          var impactT = Math.min(1, crashAge / 5600);
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.25 + 0.17 * Math.sin(crashAge * 0.027) + 0.15 * impactT;
          this.z4bCabinFlash =
            crashAge < 280
              ? 1.0
              : Math.max(0, 0.45 * (1.0 - blackT)) * (Math.random() > 0.66 ? 1.0 : 0.0);
          this.z4bCabinZoom = 1.10 + 0.16 * impactT + 0.020 * Math.sin(crashAge * 0.018);
          this.z4bCrashRedAlpha = redT * (1.0 - blackT * 0.35);
          this.z4bCrashBlackAlpha = blackT;
          this.neuralIntensity = 5.3;
          if (crashAge >= 5900) {
            this.z4bCabinState = "black_hold";
            this.z4bCabinStart = now;
            this.z4bCabinFlash = 0;
            this.z4bCabinShake = 0;
            this.z4bCrashRedAlpha = 0;
            this.z4bCrashBlackAlpha = 1;
          }
        } else if (this.z4bCabinState === "black_hold") {
          var blackAge = now - this.z4bCabinStart;
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0;
          this.z4bCabinFlash = 0;
          this.z4bCabinZoom = 1.0;
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 1;
          this.neuralIntensity = 0.0;
          if (blackAge >= 3200) this._startZ4BIslandWake(now);
        }
      } else if (this.phase === "reverse_entering_ring") {
        this.enterRingT = Math.max(0, this.enterRingT - dt * 0.7);
        if (this.enterRingT <= 0) {
          this.phase = "reverse_hallway";
          this.phaseStart = now;
          this.hallwayT = 1;
        }
        this.neuralIntensity = 2.5;
      } else if (this.phase === "reverse_hallway") {
        this.hallwayT = Math.max(0, this.hallwayT - dt * 0.35);
        if (this.hallwayT <= 0) {
          this.phase = "reverse_bay";
          this.phaseStart = now;
          this.walkoff = 1;
        }
        this.neuralIntensity = 2.4;
      } else if (this.phase === "reverse_bay") {
        this.walkoff = Math.max(0, this.walkoff - dt * 0.30);
        if (this.walkoff <= 0) {
          this.phase = "fog_in_descent";
          this.phaseStart = now;
          this._setFog(1, this.fogInDuration);
        }
        this.neuralIntensity = 2.2;
      } else if (this.phase === "fog_in_descent") {
        if (now - this.phaseStart >= this.fogInDuration) {
          this.phase = "descent";
          this.phaseStart = now;
          this.descentStart = now;
          this.descentProgress = 1;
          this._setFog(0, this.fogOutDuration);
        }
        this.neuralIntensity = 2.0;
      } else if (this.phase === "descent") {
        var elapsed = now - this.descentStart;
        this.descentProgress = Math.max(0, 1 - elapsed / this.descentDuration);
        this.progress = this.descentProgress;
        if (moving) this.walkAngle -= dt * 0.42;
        var descentT = 1 - this.descentProgress; 
        this.shakeIntensity = descentT * descentT * 0.08;
        if (descentT >= 0.6) {
          this.phase = "descent_shake";
          this.phaseStart = now;
        }
        this.neuralIntensity = 2.0 - descentT * 0.5;
      } else if (this.phase === "descent_shake") {
        var elapsed = now - this.phaseStart;
        var shakeT = Math.min(1, elapsed / 4000); 
        this.shakeIntensity = 0.05 + shakeT * 0.25;
        this.progress = Math.max(0, this.descentProgress - (elapsed / this.descentDuration) * 0.4);
        if (Math.random() < shakeT * 0.05) {
          this.shakeOffsetX += (Math.random() - 0.5) * 0.3;
          this.shakeOffsetY += (Math.random() - 0.5) * 0.3;
        }
        if (shakeT >= 1) {
          this.phase = "fall";
          this.phaseStart = now;
          this.fallStart = now;
          this.fallProgress = 0;
          this.shakeIntensity = 0;
        }
        this.neuralIntensity = 2.5 + shakeT;
      } else if (this.phase === "fall") {
        this.fallProgress = Math.min(1, (now - this.fallStart) / this.fallDuration);
        if (this.fallProgress >= 1) {
          this.phase = "impact";
          this.phaseStart = now;
        }
        this.neuralIntensity = 3.0;
      } else if (this.phase === "impact") {
        var elapsed = now - this.phaseStart;
        if (elapsed > 2500) {
          this.destroy();
          setTimeout(function() {
            window.location.reload();
          }, 200);
        }
      }
    }
    _buildAltAnnexFXProgram() {
      const prog = gl.createProgram();
      const vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv=p*0.5+0.5; gl_Position=vec4(p,0.0,1.0); }"
      );
      const fs = compile(
        gl.FRAGMENT_SHADER,
        "precision mediump float; varying vec2 v_uv; uniform vec2 u_res; uniform float u_time; uniform float u_strobe; uniform float u_fogPulse; float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);} float noise2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),u.x),mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),u.x),u.y);} float fbm(vec2 p){float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise2(p);p=p*2.07+vec2(31.7,12.4);a*=0.5;} return v;} void main(){ vec2 uv=(v_uv-0.5)*vec2(u_res.x/u_res.y,1.0); float left=1.0-smoothstep(-0.62,0.06,uv.x); float wall=1.0-smoothstep(-0.20,-0.03,uv.x); float hang=smoothstep(-0.34,0.22,uv.y)*smoothstep(0.96,0.18,uv.y); float n=fbm(uv*vec2(1.65,3.70)+vec2(u_time*0.030,-u_time*0.020)); n+=0.44*fbm(uv*vec2(5.8,2.1)+vec2(-u_time*0.018,u_time*0.040)); n+=0.18*fbm(uv*vec2(10.0,4.2)+vec2(u_time*0.012,u_time*0.016)); float fog=smoothstep(0.37,0.86,n)*left*hang; vec2 sp=uv-vec2(-0.80,0.04); float cone=smoothstep(0.88,0.06,length(sp*vec2(0.66,1.08))); float slash=smoothstep(0.22,0.0,abs(sp.y+sp.x*0.52)); float st=clamp(max(cone,slash*left)*wall*u_strobe,0.0,1.0); vec3 fogCol=mix(vec3(0.36,0.025,0.018),vec3(0.68,0.40,0.32),smoothstep(0.62,1.0,n)); vec3 col=fogCol*fog*(0.86+u_fogPulse*0.58)+vec3(1.0,0.94,0.76)*st*2.2; float a=clamp(fog*(0.20+u_fogPulse*0.10)+st*0.40,0.0,0.72); gl_FragColor=vec4(col,a); }"
      );
      if (!vs || !fs) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[Zone4] Alt annex FX link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
      }
      return {
        prog: prog,
        p: gl.getAttribLocation(prog, "p"),
        res: gl.getUniformLocation(prog, "u_res"),
        time: gl.getUniformLocation(prog, "u_time"),
        strobe: gl.getUniformLocation(prog, "u_strobe"),
        fogPulse: gl.getUniformLocation(prog, "u_fogPulse")
      };
    }
    _drawOverlay(r, g, b, a) {
      if (!this.overlayProg || a <= 0.001) return;
      gl.useProgram(this.overlayProg.prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      gl.enableVertexAttribArray(this.overlayProg.p);
      gl.vertexAttribPointer(this.overlayProg.p, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform4f(this.overlayProg.col, r, g, b, a);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    }
    _drawAltAnnexFX(now) {
      if (!this._altAnnexCleanView) return;
      if (!(this.phase === "annex_room" || this.phase === "annex_exit_door")) return;
      this._drawOverlay(0.0, 0.0, 0.0, 0.035);
    }
    _renderElevator(now) {
      if (!this.elevatorProg) return;
      gl.disable(gl.DEPTH_TEST);
      for (var ai = 0; ai < 8; ai++) gl.disableVertexAttribArray(ai);
      gl.useProgram(this.elevatorProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.elevatorProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(this.elevatorProg, "u_resolution"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.elevatorProg, "u_time"), now * 0.001);
      gl.uniform2f(gl.getUniformLocation(this.elevatorProg, "u_mouse"),
        this.cx + this.shakeOffsetX,
        this.cy + this.shakeOffsetY);
      gl.uniform1f(gl.getUniformLocation(this.elevatorProg, "u_progress"), this.progress);
      gl.uniform1f(gl.getUniformLocation(this.elevatorProg, "u_walk_angle"), this.walkAngle);
      gl.uniform1f(gl.getUniformLocation(this.elevatorProg, "u_blink"), this.rBlink);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    _stationFrame(angle) {
      const radial = this._normalize([Math.cos(angle), 0, Math.sin(angle)]);
      const tangent = this._normalize([-Math.sin(angle), 0, Math.cos(angle)]);
      const center = [Math.cos(angle) * 15.5, 0, Math.sin(angle) * 15.5];
      return { center: center, radial: radial, tangent: tangent, up: [0, 1, 0] };
    }
    _normalize(v) {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    }
    _add(a, b) {
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }
    _sub(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }
    _mul(v, s) {
      return [v[0] * s, v[1] * s, v[2] * s];
    }
    _mix3(a, b, t) {
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
    }
    _cross(a, b) {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
    }
    _rotateAroundAxis(v, axis, ang) {
      const a = this._normalize(axis);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const dot = v[0] * a[0] + v[1] * a[1] + v[2] * a[2];
      return [
        v[0] * c + (a[1] * v[2] - a[2] * v[1]) * s + a[0] * dot * (1 - c),
        v[1] * c + (a[2] * v[0] - a[0] * v[2]) * s + a[1] * dot * (1 - c),
        v[2] * c + (a[0] * v[1] - a[1] * v[0]) * s + a[2] * dot * (1 - c),
      ];
    }
    _perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2);
      const nf = 1 / (near - far);
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0,
      ]);
    }
    _lookAt(eye, center, up) {
      const z = this._normalize(this._sub(eye, center));
      const x = this._normalize(this._cross(up, z));
      const y = this._cross(z, x);
      return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
        -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
        -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
        1,
      ]);
    }
    _angleDistance(a, b) {
      var d = Math.abs(a - b);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d;
    }
    _stationWindowSideAtRingU() {
      const sectionAngle = (Math.PI * 2) / 16;
      const outerU = (this.stationSection + 0.5) * sectionAngle;
      const innerU = (outerU + Math.PI) % (Math.PI * 2);
      const groupHalfWidth = sectionAngle * 1.5;
      if (this._angleDistance(this.ringU, outerU) <= groupHalfWidth) return 1;
      if (this._angleDistance(this.ringU, innerU) <= groupHalfWidth) return -1;
      return 0;
    }
    _startStationViewTurn(now, angle, viewTo, directionTo, windowSideTo) {
      if (this.turnAnimating) return false;
      this.turnAnimating = true;
      this.turnStart = now;
      this.turnAngle = angle;
      this.turnViewTo = viewTo || null;
      this.turnDirectionTo = typeof directionTo === "number" ? directionTo : null;
      this.turnWindowSideTo = typeof windowSideTo === "number" ? windowSideTo : null;
      this.turnLookX = this.cx;
      this.turnLookY = this.cy;
      return true;
    }
    _isAltAnnexRoute() {
      return !!(
        this.annexAltBasementActive ||
        this.annexBasementVariant === "alt" ||
        this.altAnnexRouteActive
      );
    }
    _isAltAnnexLocked() {
      return !!(
        (this.annexAltBasementActive || this.annexBasementVariant === "alt" || this.altAnnexRouteActive) &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
    }
    _checkStationTurnThreshold(now) {
      const inAnnexRoom = this.phase === "annex_room";
      const inRing = this.phase === "ring";
      if (inAnnexRoom && this._isAltAnnexLocked()) {
        this.turnInputLatch = 0;
        this.annexTurnInputLatch = 0;
        window.__z4AnnexTurnRequested = 0;
        return;
      }
      if (!inRing && !inAnnexRoom) {
        if (Math.abs(this.cx) < 0.34) {
          this.turnInputLatch = 0;
          this.annexTurnInputLatch = 0;
          window.__z4TurnRequested = 0;
          window.__z4AnnexTurnRequested = 0;
        }
        return;
      }
      if (this.turnAnimating) return;
      let dir = 0;
      if (this.cx >= 0.76) dir = 1;
      else if (this.cx <= -0.76) dir = -1;
      else if (Math.abs(this.cx) < 0.30) {
        this.turnInputLatch = 0;
        this.annexTurnInputLatch = 0;
        if (inRing) window.__z4TurnRequested = 0;
        if (inAnnexRoom) window.__z4AnnexTurnRequested = 0;
      }
      if (!dir) return;
      if (inAnnexRoom) {
        if (this.annexTurnInputLatch === dir && window.__z4AnnexTurnRequested === dir) return;
        this.annexTurnInputLatch = dir;
        window.__z4AnnexTurnRequested = dir;
        return;
      }
      if (this.turnInputLatch === dir && window.__z4TurnRequested === dir) return;
      this.turnInputLatch = dir;
      window.__z4TurnRequested = dir;
    }
    _ensureAnnexTripOverlay() {
      if (this.annexTripOverlay) return;
      const root = document.createElement("div");
      root.id = "z4-annex-trip-overlay";
      root.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:99997;opacity:0;" +
        "transition:opacity 80ms linear;overflow:hidden;";
      const blur = document.createElement("div");
      blur.style.cssText =
        "position:absolute;inset:-5%;pointer-events:none;" +
        "-webkit-backdrop-filter:blur(0px) saturate(1.0) contrast(1.0);" +
        "backdrop-filter:blur(0px) saturate(1.0) contrast(1.0);" +
        "-webkit-mask-image:radial-gradient(circle at 50% 50%, transparent 0%, transparent 32%, rgba(0,0,0,0.65) 57%, black 100%);" +
        "mask-image:radial-gradient(circle at 50% 50%, transparent 0%, transparent 32%, rgba(0,0,0,0.65) 57%, black 100%);";
      const red = document.createElement("div");
      red.style.cssText =
        "position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;" +
        "background:radial-gradient(circle at 50% 44%, rgba(255,24,0,0.08) 0%, rgba(210,0,0,0.18) 42%, rgba(95,0,0,0.34) 100%);";
      const dark = document.createElement("div");
      dark.style.cssText =
        "position:absolute;inset:0;pointer-events:none;opacity:0;" +
        "background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.12) 42%, rgba(0,0,0,0.82) 100%);";
      root.appendChild(blur);
      root.appendChild(red);
      root.appendChild(dark);
      document.body.appendChild(root);
      this.annexTripOverlay = root;
      this.annexTripBlurOverlay = blur;
      this.annexTripRedOverlay = red;
      this.annexTripDarkOverlay = dark;
    }
    _updateAnnexTripOverlay(now, active) {
      this._ensureAnnexTripOverlay();
      const last = this.annexTripFXLast || now;
      const dt = Math.max(0.0, Math.min(0.1, (now - last) * 0.001));
      this.annexTripFXLast = now;
      const target = active ? 1.0 : 0.0;
      const speed = active ? 10.0 : 2.6;
      this.annexTripFX += (target - (this.annexTripFX || 0.0)) * Math.min(1.0, dt * speed);
      const fx = Math.max(0.0, Math.min(1.0, this.annexTripFX || 0.0));
      if (!this.annexTripOverlay) return;
      const beatMs = 60000.0 / 140.0;
      const phase = active
        ? ((((now - (this.annexSequenceStart || now)) % beatMs) + beatMs) % beatMs) / beatMs
        : 1.0;
      const flash = active ? Math.pow(Math.max(0.0, 1.0 - phase / 0.18), 2.10) : 0.0;
      const blackout = active ? Math.pow(1.0 - flash, 0.12) : 0.0;
      const wob = active ? (0.5 + 0.5 * Math.sin(now * 0.001 * 0.13 + Math.sin(now * 0.001 * 0.07) * 0.75)) : 0.0;
      this.annexTripOverlay.style.opacity = String(Math.max(0.0, Math.min(0.22, fx * (0.08 + blackout * 0.12))));
      this.annexTripBlurOverlay.style.webkitBackdropFilter =
        "blur(" + (fx * (0.45 + wob * 0.75)).toFixed(2) + "px) saturate(" + (1.0 + fx * 0.22).toFixed(2) + ") contrast(" + (1.0 + fx * 0.06).toFixed(2) + ")";
      this.annexTripBlurOverlay.style.backdropFilter = this.annexTripBlurOverlay.style.webkitBackdropFilter;
      this.annexTripRedOverlay.style.opacity = String(Math.max(0.0, Math.min(0.18, fx * (0.020 + wob * 0.020 + flash * 0.14))));
      this.annexTripDarkOverlay.style.opacity = String(Math.max(0.0, Math.min(0.26, fx * (0.015 + blackout * 0.18 - flash * 0.06))));
    }
    _stationBayPath(t) {
      function smooth(a, b, x) {
        var v = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return v * v * (3 - 2 * v);
      }
      function point(u) {
        var bayBackX = -13.5;
        var bayDoorX = -8.0;
        var x = bayBackX + (bayDoorX - bayBackX) * u;
        var sideStep = smooth(0.02, 0.28, u) * (1 - smooth(0.70, 0.96, u));
        return { x: x, z: sideStep * 1.08 };
      }
      t = Math.max(0, Math.min(1, t));
      var p = point(t);
      var d = 0.015;
      var a = point(Math.max(0, t - d));
      var b = point(Math.min(1, t + d));
      p.dx = b.x - a.x;
      p.dz = b.z - a.z;
      return p;
    }
    _computeStationCamera() {
      const angle = this.ringU;
      const frame = this._stationFrame(angle);
      const SECTION_ANGLE = (Math.PI * 2) / 16;
      let eye;
      let baseForward;
      if (this.phase === "bay" || this.phase === "reverse_bay" || this.phase === "fog_in_descent") {
        const y = -0.02;
        const bayPath = this._stationBayPath(this.walkoff);
        eye = this._add(
          frame.center,
          this._add(
            this._add(this._mul(frame.radial, bayPath.x), this._mul(frame.tangent, bayPath.z)),
            [0, y, 0]
          )
        );
        const pathForward = this._normalize(this._add(
          this._mul(frame.radial, bayPath.dx || 1),
          this._mul(frame.tangent, bayPath.dz || 0)
        ));
        baseForward = (this.phase === "reverse_bay" || this.phase === "fog_in_descent")
          ? this._mul(pathForward, -1)
          : pathForward;
      } else if (this.phase === "hallway" || this.phase === "reverse_hallway") {
        const hallStart = -8.0;
        const hallEnd = -2.33;
        const y = -0.02;
        const walkX = hallStart + (hallEnd - hallStart) * this.hallwayT;
        eye = this._add(frame.center, this._add(this._mul(frame.radial, walkX), [0, y, 0]));
        baseForward = this.phase === "reverse_hallway"
          ? this._mul(frame.radial, -1)
          : frame.radial.slice();
      } else if (this.phase === "entering_ring" || this.phase === "reverse_entering_ring") {
        var t = this.enterRingT;
        t = t * t * (3 - 2 * t);
        var hallEye = this._add(frame.center, this._add(this._mul(frame.radial, -2.33), [0, -0.02, 0]));
        var ringEye = this._add(frame.center, [0, -0.02, 0]);
        eye = this._mix3(hallEye, ringEye, t);
        if (this.phase === "reverse_entering_ring") {
          var negRadial = this._mul(frame.radial, -1);
          var ringFwd2 = this._mul(frame.tangent, typeof this.ringDirection === "number" ? this.ringDirection : 1);
          baseForward = this._normalize(this._mix3(negRadial, ringFwd2, t));
        } else {
          baseForward = frame.radial.slice();
        }
      } else if (
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door"
      ) {
        const annexAngle = (this.annexSection + 0.5) * SECTION_ANGLE;
        const entryAngle = typeof this.annexEntryU === "number" ? this.annexEntryU : annexAngle;
        const targetAngle = typeof this.annexTargetU === "number" ? this.annexTargetU : annexAngle;
        let activeFrame = this._stationFrame(annexAngle);
        const hallEntryX = 2.70;
        const hallEndX = 7.55;
        const stairEndX = 15.35;
        const roomEndX = 23.08;
        const annexDrop = 3.80;
        const altAnnexLocked = typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked();
        const altAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();
        const altAnnexLaneZ = 0.0;
        let localX = 0.0;
        let localY = -0.02;
        let localZ = 0.0;
        function smooth(t) {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        }
        function mixAngle(a, b, t) {
          let d = b - a;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          return a + d * t;
        }
        if (this.phase === "annex_turn_in") {
          const rawTurnT = Math.max(0, Math.min(1, this.annexTurnT));
          const yawT = smooth(rawTurnT / 0.46);
          const moveT = smooth((rawTurnT - 0.18) / 0.82);
          activeFrame = this._stationFrame(mixAngle(entryAngle, targetAngle, yawT));
          localX = hallEntryX * moveT;
          localZ = 0.0;
          const pathForward = this._mul(activeFrame.tangent, this.ringDirection || -1);
          baseForward = this._normalize(this._mix3(pathForward, activeFrame.radial, yawT));
        } else if (this.phase === "annex_hallway") {
          const rawT = Math.max(0, Math.min(1, this.annexHallT));
          if (rawT < 0.38) {
            let walkT = smooth(rawT / 0.38);
            localX = hallEntryX + (hallEndX - hallEntryX) * walkT;
            localY = -0.02;
          } else {
            let stairT = smooth((rawT - 0.38) / 0.62);
            localX = hallEndX + (stairEndX - hallEndX) * stairT;
            localY = -0.02 - annexDrop * stairT;
            if (altAnnexLocked) localZ = 0.0;
          }
          baseForward = activeFrame.radial.slice();
        } else if (this.phase === "annex_room") {
          let roomT = smooth(this.annexRoomT);
          localX = stairEndX + (roomEndX - stairEndX) * roomT;
          localY = -0.02 - annexDrop;
          if (altAnnexLocked) {
            localZ = 0.0;
            baseForward = activeFrame.radial.slice();
          } else {
            localZ = altAnnexRouteNow ? 0.0 : Math.sin(roomT * Math.PI) * 0.18;
            if ((this.annexRoomView || "path") === "stage") {
              baseForward = this._mul(activeFrame.tangent, -1);
            } else {
              baseForward = this._mul(activeFrame.radial, this.annexRoomDir || 1);
            }
          }
        } else {
          let exitT = smooth(this.annexExitT);
          localX = roomEndX + 1.72 * exitT;
          localY = -0.02 - annexDrop;
          localZ = 0.0;
          baseForward = activeFrame.radial.slice();
        }
        eye = this._add(
          activeFrame.center,
          this._add(
            this._add(this._mul(activeFrame.radial, localX), this._mul(activeFrame.tangent, localZ)),
            [0, localY, 0]
          )
        );
      } else {
        eye = this._add(frame.center, [0, -0.02, 0]);
        var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
        baseForward = this.ringView === "window"
          ? this._mul(frame.radial, this.ringWindowSide || 1)
          : this._mul(frame.tangent, dir);
      }
      let lookX = this.cx;
      let lookY = this.cy;
      let fwd = baseForward.slice();
      if (typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked()) {
        lookX = Math.max(-0.24, Math.min(0.24, lookX));
        lookY = Math.max(-0.15, Math.min(0.15, lookY));
      }
      if (this.turnAnimating) {
        const turnElapsed = this.lastRenderTime - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        fwd = this._rotateAroundAxis(fwd, [0, 1, 0], (this.turnAngle || Math.PI) * turnT);
        lookX = this.turnLookX * (1 - turnT);
        lookY = this.turnLookY * (1 - turnT);
      }
      fwd = this._rotateAroundAxis(fwd, [0, 1, 0], -lookX * 1.0);
      let right = this._normalize(this._cross(fwd, [0, 1, 0]));
      const pitchReach = this.phase === "ring" ? 0.95 : 0.6;
      fwd = this._rotateAroundAxis(fwd, right, -lookY * pitchReach);
      right = this._normalize(this._cross(fwd, [0, 1, 0]));
      let up = this._normalize(this._cross(right, fwd));
      const moveHeld = z4SpaceHeld || z4TouchHeld;
      let moveAmp = 0.0;
      if (this.phase === "bay" || this.phase === "hallway" || (this.phase === "ring" && this.ringView === "path")) {
        moveAmp = moveHeld ? 1.0 : 0.0;
      } else if (
        this.phase === "reverse_bay" ||
        this.phase === "reverse_hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "fog_in_descent"
      ) {
        moveAmp = 0.55;
      } else if (
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door"
      ) {
        moveAmp = (moveHeld && !(this.phase === "annex_room" && (this.annexRoomView || "path") !== "path")) ? 0.55 : 0.0;
      }
      if (this.turnAnimating) moveAmp = 0.0;
      if (moveAmp > 0.001) {
        const moveTime = this.lastRenderTime * 0.001;
        const stride = this.phase === "ring" ? 4.4 : 5.2;
        const bob = Math.sin(moveTime * stride);
        const sway = Math.cos(moveTime * stride * 2.0);
        eye = this._add(eye, this._mul(up, sway * 0.006 * moveAmp));
        eye = this._add(eye, this._mul(right, bob * 0.0035 * moveAmp));
        eye = this._add(eye, this._mul(fwd, (sway * 0.010 + 0.004) * moveAmp));
        right = this._normalize(this._rotateAroundAxis(right, fwd, bob * 0.010 * moveAmp));
        up = this._normalize(this._cross(right, fwd));
      }
      if (this.shakeIntensity > 0) {
        eye = this._add(eye, this._mul(right, this.shakeOffsetX));
        eye = this._add(eye, this._mul(up, this.shakeOffsetY));
      }
      if (
        this.annexSequenceActive &&
        (
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door" ||
          this.phase === "z4b_cabin"
        )
      ) {
        const tripTime = this.lastRenderTime * 0.001;
        const ramp = 1.0;
        const pulse = 0.78 + 0.22 * Math.sin(tripTime * 0.13 + Math.sin(tripTime * 0.07) * 0.85);
        const wooze = ramp * pulse * 0.92;
        const yaw = (Math.sin(tripTime * 0.16) * 0.018 + Math.sin(tripTime * 0.07 + 1.9) * 0.010) * wooze;
        const pitch = (Math.sin(tripTime * 0.12 + 1.8) * 0.010 + Math.sin(tripTime * 0.055) * 0.006) * wooze;
        const roll = Math.sin(tripTime * 0.10 + 0.7) * 0.016 * wooze;
        fwd = this._rotateAroundAxis(fwd, [0, 1, 0], yaw);
        right = this._normalize(this._cross(fwd, [0, 1, 0]));
        fwd = this._rotateAroundAxis(fwd, right, pitch);
        right = this._normalize(this._cross(fwd, [0, 1, 0]));
        up = this._normalize(this._cross(right, fwd));
        right = this._normalize(this._rotateAroundAxis(right, fwd, roll));
        up = this._normalize(this._cross(right, fwd));
        eye = this._add(eye, this._mul(right, Math.sin(tripTime * 0.11) * 0.013 * wooze));
        eye = this._add(eye, this._mul(up, Math.sin(tripTime * 0.09 + 2.4) * 0.008 * wooze));
      }
      return {
        eye: eye,
        forward: this._normalize(fwd),
        right: right,
        up: up
      };
    }
    _bindStationMesh(mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      const stride = 8 * 4;
      const aPos = gl.getAttribLocation(this.stationMeshProg, "a_pos");
      const aNor = gl.getAttribLocation(this.stationMeshProg, "a_nor");
      const aUv = gl.getAttribLocation(this.stationMeshProg, "a_uv");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aNor);
      gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, stride, 3 * 4);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 6 * 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mesh.tex);
      gl.uniform1i(gl.getUniformLocation(this.stationMeshProg, "u_tex"), 0);
      let z4MeshTexMix = mesh.texMix;
      let z4MeshFlatCol = mesh.flatCol;
      if (mesh.backWallBathroomClub) {
        const z4StopT = 0.895;
        let z4BathroomApproach = 0.0;
        if (this.phase === "annex_room") {
          z4BathroomApproach = Math.max(0, Math.min(1, ((this.annexRoomT || 0) - 0.66) / (z4StopT - 0.66)));
          z4BathroomApproach = z4BathroomApproach * z4BathroomApproach * (3 - 2 * z4BathroomApproach);
        }
        const z4Bright = 1.0 + z4BathroomApproach * 1.15;
        z4MeshFlatCol = [z4Bright, z4Bright, z4Bright];
        z4MeshTexMix = Math.max(0.70, Math.min(1.0, 1.0 - z4BathroomApproach * 0.20));
      }
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_texMix"), z4MeshTexMix);
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_useTexAlpha"), (mesh.useTexAlpha || mesh.blend) ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_tileTex"), mesh.tileTex ? 1.0 : 0.0);
      gl.uniform3f(
        gl.getUniformLocation(this.stationMeshProg, "u_flatCol"),
        z4MeshFlatCol[0], z4MeshFlatCol[1], z4MeshFlatCol[2]
      );
      const crowdDanceOn = !!(
        this.annexSequenceActive &&
        mesh.annexCrowd2 &&
        (
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
      const crowdDanceLoc = gl.getUniformLocation(this.stationMeshProg, "u_crowdDance");
      if (crowdDanceLoc !== null) gl.uniform1f(crowdDanceLoc, crowdDanceOn ? (mesh.crowdDanceAmp || 1.0) : 0.0);
      const crowdDanceSeedLoc = gl.getUniformLocation(this.stationMeshProg, "u_crowdDanceSeed");
      if (crowdDanceSeedLoc !== null) gl.uniform1f(crowdDanceSeedLoc, mesh.crowdDanceSeed || 0.0);
      const meshTimeLoc = gl.getUniformLocation(this.stationMeshProg, "u_time");
      if (meshTimeLoc !== null) gl.uniform1f(meshTimeLoc, this.lastRenderTime * 0.001);
      gl.uniform2f(gl.getUniformLocation(this.stationMeshProg, "u_screen"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_screenSample"), (mesh.screenSample ? 1.0 : 0.0));
      gl.uniform1f(
        gl.getUniformLocation(this.stationMeshProg, "u_greenKey"),
        mesh.greenKey ? 1.0 : 0.0
      );
      const annexLightingLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexLighting");
      if (annexLightingLoc !== null) gl.uniform1f(annexLightingLoc, this._annexLightingActive ? 1.0 : 0.0);
      const annexStrobeLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexStrobe");
      if (annexStrobeLoc !== null) gl.uniform1f(annexStrobeLoc, this._annexStrobe || 0.0);
      const annexExitGlowLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexExitGlow");
      if (annexExitGlowLoc !== null) gl.uniform1f(annexExitGlowLoc, this._annexExitGlow || 0.0);
      const annexExitLight = this.annexExitLightWorld || [0, 0, 0];
      const annexExitLightLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexExitLight");
      if (annexExitLightLoc !== null) gl.uniform3f(annexExitLightLoc, annexExitLight[0], annexExitLight[1], annexExitLight[2]);
      const annexLights = this.annexLightWorld || [[0,0,0],[0,0,0],[0,0,0]];
      const annexLight0 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight0");
      const annexLight1 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight1");
      const annexLight2 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight2");
      if (annexLight0 !== null) gl.uniform3f(annexLight0, annexLights[0][0], annexLights[0][1], annexLights[0][2]);
      if (annexLight1 !== null) gl.uniform3f(annexLight1, annexLights[1][0], annexLights[1][1], annexLights[1][2]);
      if (annexLight2 !== null) gl.uniform3f(annexLight2, annexLights[2][0], annexLights[2][1], annexLights[2][2]);
      const annexLightCols = this.annexLightColorWorld || [[0.62, 0.72, 0.88], [1.30, 0.06, 0.03], [1.30, 0.06, 0.03]];
      const annexLightCol0 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol0");
      const annexLightCol1 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol1");
      const annexLightCol2 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol2");
      if (annexLightCol0 !== null) gl.uniform3f(annexLightCol0, annexLightCols[0][0], annexLightCols[0][1], annexLightCols[0][2]);
      if (annexLightCol1 !== null) gl.uniform3f(annexLightCol1, annexLightCols[1][0], annexLightCols[1][1], annexLightCols[1][2]);
      if (annexLightCol2 !== null) gl.uniform3f(annexLightCol2, annexLightCols[2][0], annexLightCols[2][1], annexLightCols[2][2]);
      const annexTripRedActive = !!(this.annexSequenceActive && (this._annexRedWash || 0.0) > 0.0);
      const redStageActive = !!((this._altAnnexCleanView && this.altAnnexStageRedLightWorld) || annexTripRedActive);
      const redStageLight = annexTripRedActive
        ? (this.annexLightWorld && this.annexLightWorld[1] ? this.annexLightWorld[1] : (this.annexExitLightWorld || [999.0, 999.0, 999.0]))
        : (redStageActive ? this.altAnnexStageRedLightWorld : [999.0, 999.0, 999.0]);
      const annexStageRedLight = gl.getUniformLocation(this.stationMeshProg, "u_annexStageRedLight");
      const annexStageRedGlow = gl.getUniformLocation(this.stationMeshProg, "u_annexStageRedGlow");
      if (annexStageRedLight !== null) gl.uniform3f(annexStageRedLight, redStageLight[0], redStageLight[1], redStageLight[2]);
      if (annexStageRedGlow !== null) gl.uniform1f(annexStageRedGlow, annexTripRedActive ? (this._annexRedGlow || 0.0) : (redStageActive ? 0.62 : 0.0));
      const whiteStageLight = annexTripRedActive
        ? redStageLight
        : (this.altAnnexStageWhiteLightWorld || this.altAnnexStageRedLightWorld || [999.0, 999.0, 999.0]);
      const annexStageWhiteLight = gl.getUniformLocation(this.stationMeshProg, "u_annexStageWhiteLight");
      const annexStageWhiteStrobe = gl.getUniformLocation(this.stationMeshProg, "u_annexStageWhiteStrobe");
      if (annexStageWhiteLight !== null) gl.uniform3f(annexStageWhiteLight, whiteStageLight[0], whiteStageLight[1], whiteStageLight[2]);
      if (annexStageWhiteStrobe !== null) gl.uniform1f(annexStageWhiteStrobe, Math.max(this._altAnnexWhiteStrobe || 0.0, this._annexWhiteStrobe || 0.0));
    }
    _ensureMode4VoidTarget() {
      const w = canvas.width;
      const h = canvas.height;
      if (!this.z4bVoidFBO) this.z4bVoidFBO = gl.createFramebuffer();
      if (!this.z4bVoidTexture) {
        this.z4bVoidTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      if (this.z4bVoidWidth !== w || this.z4bVoidHeight !== h) {
        this.z4bVoidWidth = w;
        this.z4bVoidHeight = h;
        gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      return true;
    }
    _renderMode4VoidFBO(now) {
      if (!this.z4bVoidMode) {
        try {
          if (typeof ActiveMode !== "undefined") {
            this.z4bVoidMode = new ActiveMode(5);
            this.z4bVoidMaskTex = this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0);
            this.z4bVoidMode.maskTex = this.z4bVoidMaskTex;
          }
        } catch (e) {
          this.z4bVoidMode = null;
        }
      }
      if (!this.z4bVoidMode) return false;
      if (!this._ensureMode4VoidTarget()) return false;
      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const prevViewport = gl.getParameter(gl.VIEWPORT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.z4bVoidFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.z4bVoidTexture, 0);
      gl.viewport(0, 0, this.z4bVoidWidth, this.z4bVoidHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      try {
        this.z4bVoidMode.maskTex = this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0);
        this.z4bVoidMode.render(now, 0, 0, 0, 0, 0, 0, 1.0, 0);
      } catch (e) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO);
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
      return true;
    }
    _ensureCabinPortalTarget() {
      const w = canvas.width;
      const h = canvas.height;
      if (!this.cabinPortalFBO) this.cabinPortalFBO = gl.createFramebuffer();
      if (!this.cabinPortalTexture) {
        this.cabinPortalTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      if (this.cabinPortalWidth !== w || this.cabinPortalHeight !== h) {
        this.cabinPortalWidth = w;
        this.cabinPortalHeight = h;
        gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      return true;
    }
    _renderCabinPortalFBO(now) {
      if (!this._ensureZ4BCabinProgram()) return false;
      if (!this._ensureCabinPortalTarget()) return false;
      this._renderMode4VoidFBO(now);

      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const prevViewport = gl.getParameter(gl.VIEWPORT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.cabinPortalFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cabinPortalTexture, 0);
      gl.viewport(0, 0, this.cabinPortalWidth, this.cabinPortalHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0.005, 0.006, 0.010, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      gl.useProgram(this.z4bCabinProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.z4bCabinProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(this.z4bCabinProg, "u_resolution"), this.cabinPortalWidth, this.cabinPortalHeight);
      gl.uniform2f(gl.getUniformLocation(this.z4bCabinProg, "u_mouse"), 0.0, 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_time"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_blink"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_wake"), 1.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camZ"), 12.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camX"), -1.30);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_yawOffset"), -Math.PI * 0.5);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpen"), 1.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorSwitched"), 1.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_isWalking"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_shake"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_flash"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_suctionFade"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_zoom"), 0.92);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_trip"), this.z4Trip);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_isOOB"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_fractalActive"), 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_blinkAge"), 999.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_altRoute"), 0.0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture || this.stationTextures.black);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_voidTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_doorClosedTex"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpenTex"), 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texLeft"), 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texRight"), 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texTop"), 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texBottom"), 6);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_cockpitTex"), 7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO);
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
      return true;
    }
    _patchZ4BCockpitVoidUV() {
      if (!window.GLSL || !window.GLSL.modules || !window.GLSL.modules.z3_merged) return;
      let src = window.GLSL.modules.z3_merged;
      if (src.indexOf("z4bCockpitVoidOffset") >= 0) return;
      const rawScreen =
        'vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';
      const rawFixed =
        'vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9, 0.0, 1.0));\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';
      const shifted =
        'vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9 + 0.18, 0.0, 1.0)); \n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';
      if (src.indexOf(rawFixed) >= 0) {
        src = src.replace(rawFixed, shifted);
      } else if (src.indexOf(rawScreen) >= 0) {
        src = src.replace(rawScreen, shifted);
      } else {
        throw new Error("cockpit windshield void sample line not found");
      }
      window.GLSL.modules.z3_merged = src;
    }
    _ensureZ4BCabinProgram() {
      if (this.z4bCabinProg) return true;
      this._patchZ4BCockpitVoidUV();
      const src =
        (window.GLSL && window.GLSL.modules && window.GLSL.modules.z3_merged) ||
        null;
      if (!src) return false;
      this.z4bCabinProg = this._buildRawProgram(
        "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }",
        src
      );
      return !!this.z4bCabinProg;
    }
    _renderZ4BCabin(now) {
      if (!this._ensureZ4BCabinProgram()) return;
      this._renderMode4VoidFBO(now);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0.005, 0.006, 0.010, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      gl.useProgram(this.z4bCabinProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.z4bCabinProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(this.z4bCabinProg, "u_resolution"), canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(this.z4bCabinProg, "u_mouse"), this.cx, this.cy);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_time"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_wake"), 1);
      var cabinOOB =
        this.z4bCabinFractalActive ||
        this.z4bCabinState === "turbulence" ||
        this.z4bCabinState === "crash" ||
        this.z4bCabinState === "side_entry" ||
        this.z4bCabinState === "side_turn" ||
        this.z4bCabinState === "side_settle"
          ? 1.0
          : 0.0;
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camZ"), this.z4bCabinCamZ);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camX"), this.z4bCabinCamX);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_yawOffset"), this.z4bCabinYaw);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpen"), 1);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorSwitched"), 1);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_isWalking"), this.z4bCabinWalking ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_shake"), this.z4bCabinShake);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_flash"), this.z4bCabinFlash);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_suctionFade"), 0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_zoom"), this.z4bCabinZoom);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_trip"), this.z4Trip);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_isOOB"), cabinOOB);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_fractalActive"), this.z4bCabinFractalActive ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_blinkAge"), 0.001 * (now - (this.z4BlinkPeakTime || now)));
      gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_altRoute"), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture || this.stationTextures.black);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_voidTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_doorClosedTex"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpenTex"), 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texLeft"), 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texRight"), 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texTop"), 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texBottom"), 6);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit);
      gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_cockpitTex"), 7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    _drawZ4BCrashOverlays(now) {
      if (this.phase !== "z4b_cabin") return;
      var red = this.z4bCrashRedAlpha || 0;
      var black = this.z4bCrashBlackAlpha || 0;
      if (red > 0.001) {
        var pulse = 0.88 + 0.12 * Math.sin(now * 0.021);
        this._drawOverlay(0.95, 0.0, 0.0, Math.min(1, red * pulse));
      }
      if (black > 0.001) {
        this._drawOverlay(0.0, 0.0, 0.0, Math.min(1, black));
      }
    }
    _renderFall(now) {
      if (!this._fallShaderBuilt) {
        this._fallShaderBuilt = true;
        var src = (window.GLSL && GLSL.modules && GLSL.modules.z4_fall) || null;
        if (!src) { console.error("[Zone4] GLSL.modules.z4_fall not found"); }
        if (src) {
          var vsSrc = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
          var vs = compile(gl.VERTEX_SHADER, (typeof IS_MOBILE !== "undefined" && IS_MOBILE) ? "#define MOBILE\n" + vsSrc : vsSrc);
          var fs = compile(gl.FRAGMENT_SHADER, (typeof IS_MOBILE !== "undefined" && IS_MOBILE) ? "#define MOBILE\n" + src : src);
          if (vs && fs) {
            this.fallProg = gl.createProgram();
            gl.attachShader(this.fallProg, vs);
            gl.attachShader(this.fallProg, fs);
            gl.linkProgram(this.fallProg);
            if (!gl.getProgramParameter(this.fallProg, gl.LINK_STATUS)) {
              console.error("[Zone4] Fall link:", gl.getProgramInfoLog(this.fallProg));
              gl.deleteProgram(this.fallProg);
              this.fallProg = null;
            } else {
              console.log("[Zone4] z4_fall compiled OK");
            }
          }
        }
      }
      if (!this.fallProg) {
        console.error("[Zone4] fallProg is null — z4_fall shader missing or failed to compile");
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.5, 0.0, 0.0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.01, 0.02, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      for (var ai = 0; ai < 8; ai++) gl.disableVertexAttribArray(ai);
      gl.useProgram(this.fallProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.fallProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(this.fallProg, "u_resolution"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_time"), now * 0.001);
      gl.uniform2f(gl.getUniformLocation(this.fallProg, "u_mouse"), this.cx, this.cy);
      gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_fallProgress"), this.fallProgress);
      gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_blink"), this.rBlink);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    _renderStation(now) {
      if (!this.stationBgProg || !this.stationMeshProg || !this.postProcessProg) return;
      this._updateVideoTexture(this.stationTextures.earth, this.earthVideo);
      if (this.annexSequenceActive) this._updateVideoTexture(this.stationTextures.crywolf, this.crywolfVideo);
      if (this.annexSequenceActive || this.annexAltBasementActive || this.phase === "z4b_cabin") this._updateVideoTexture(this.stationTextures.bh2, this.bh2Video);
      const cam = this._computeStationCamera();
      const eye = cam.eye;
      const fwd = cam.forward;
      const right = cam.right;
      const up = cam.up;
      const proj = this._perspective(Math.PI / 2.65, canvas.width / canvas.height, 0.05, 220.0);
      const view = this._lookAt(eye, this._add(eye, fwd), [0, 1, 0]);
      if (this.fboWidth !== canvas.width || this.fboHeight !== canvas.height) {
        this.fboWidth = canvas.width;
        this.fboHeight = canvas.height;
        gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.fboDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fboDepth);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.01, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const suppressStationBg = !!(
        this.annexSequenceActive &&
        (
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
      if (suppressStationBg) {
        gl.clearColor(0.004, 0.004, 0.006, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      } else {
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this.stationBgProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);
        const bgPos = gl.getAttribLocation(this.stationBgProg, "a_pos");
        gl.enableVertexAttribArray(bgPos);
        gl.vertexAttribPointer(bgPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(gl.getUniformLocation(this.stationBgProg, "u_res"), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_time"), now * 0.001);
        gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_blink"), this.rBlink);
        gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_trip"), this._altAnnexCleanView ? 0.0 : this.z4Trip);
        gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_eye"), eye[0], eye[1], eye[2]);
        gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_forward"), fwd[0], fwd[1], fwd[2]);
        gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_right"), right[0], right[1], right[2]);
        gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_up"), up[0], up[1], up[2]);
        const earthFrame = this._stationFrame(this.ringU);
        const earthSide = this.ringView === "window"
          ? (this.ringWindowSide || 1)
          : (this._stationWindowSideAtRingU() || 1);
        const earthTarget = this._normalize(this._add(
          this._mul(earthFrame.radial, earthSide),
          [0, -0.48, 0]
        ));
        gl.uniform3f(
          gl.getUniformLocation(this.stationBgProg, "u_targetDir"),
          earthTarget[0], earthTarget[1], earthTarget[2]
        );
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.earth);
        gl.uniform1i(gl.getUniformLocation(this.stationBgProg, "u_env"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (this._altAnnexCleanView) {
        gl.clearColor(0.030, 0.026, 0.028, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.stationMeshProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_eye"), eye[0], eye[1], eye[2]);
      const inAnnexInterior =
        (this.phase === "annex_turn_in" && (this.annexTurnT || 0) >= 0.34) ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door";
      this._annexLightingActive = inAnnexInterior;
      this._annexStrobe = 0.0;
      this._annexWhiteStrobe = 0.0;
      this._annexRedWash = 0.0;
      this._annexRedGlow = 0.0;
      this._annexDarkPulse = 0.0;
      this._annexExitGlow = (this.annexSequenceActive && inAnnexInterior) ? 1.0 : 0.0;
      this._altAnnexWhiteStrobe = 0.0;
      this._altAnnexFogPulse = 0.0;
      this._updateAnnexTripOverlay(now, !!(this.annexSequenceActive && inAnnexInterior));
      if (this._altAnnexCleanView && inAnnexInterior) {
        const strobeRate = 9.75;
        const strobePhase = ((now * 0.001 * strobeRate) % 1.0 + 1.0) % 1.0;
        const strobeSlot = Math.floor(now * 0.001 * strobeRate);
        const sr = Math.sin(strobeSlot * 127.1 + 31.7) * 43758.5453123;
        const strobeRnd = sr - Math.floor(sr);
        const sp = Math.sin(strobeSlot * 53.7 + 9.91) * 43758.5453123;
        const strobePow = sp - Math.floor(sp);
        if (strobeRnd > 0.28 && strobePhase < 0.165) {
          this._altAnnexWhiteStrobe = (1.0 - strobePhase / 0.165) * (2.40 + strobePow * 3.20);
        }
        this._altAnnexFogPulse = 0.72 + 0.28 * Math.sin(now * 0.001 * 0.58 + Math.sin(now * 0.001 * 0.17) * 1.55);
      }
      if (this.annexSequenceActive && inAnnexInterior) {
        const beatMs = 60000.0 / 140.0;
        const strobePhase =
          (((now - (this.annexSequenceStart || now)) % beatMs) + beatMs) %
          beatMs / beatMs;
        const raveHit = Math.pow(Math.max(0.0, 1.0 - strobePhase / 0.18), 2.10);
        const blackout = Math.pow(1.0 - raveHit, 0.12);
        this._annexWhiteStrobe = raveHit * 5.25;
        this._annexStrobe = Math.max(0.0, Math.min(1.0, blackout));
        this._annexDarkPulse = this._annexStrobe;
        this._annexRedWash = 0.62;
        this._annexRedGlow = (0.18 + raveHit * 0.74) * (1.0 - this._annexStrobe * 0.78);
        this.z4Trip = Math.max(this.z4Trip || 1.0, 1.18);
        this.z4IsOOB = 1.0;
        this.shakeIntensity = 0.0012 + raveHit * 0.0018;
      }
      if (this.annexSequenceActive && inAnnexInterior) {
        this._renderCabinPortalFBO(now);
        gl.enable(gl.DEPTH_TEST);
        gl.useProgram(this.stationMeshProg);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
        gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);
        gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_eye"), eye[0], eye[1], eye[2]);
      }
      const shouldDrawStationMesh = (mesh) => {
        const altRoomVisualBlocked =
          (
            this.annexAltBasementActive ||
            this.annexBasementVariant === "alt" ||
            this.altAnnexRouteActive ||
            (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
          ) &&
          !(this.phase === "annex_room" || this.phase === "annex_exit_door");
        if (
          altRoomVisualBlocked &&
          (
            mesh.annexAltCrowdVisual ||
            mesh.annexAltCrowd ||
            mesh.altAnnexCrowd ||
            mesh.annexCrowd ||
            mesh.crowdPerson ||
            mesh.annexAltFog ||
            mesh.annexAltFogWisp ||
            mesh.dynamicFogWisp ||
            mesh.altAnnexFogMachine ||
            mesh.annexAltStrobeBeam ||
            mesh.altAnnexStrobeBeam ||
            (mesh.annexAltOnly && mesh.blend && !mesh.annexAltDoorScene && !mesh.annexAltDoorBulb && !mesh.annexTopDoorBulb)
          )
        ) return false;
        if (mesh.altAnnexFogMachine && !mesh.annexAltFogWisp && !mesh.dynamicFogWisp) return false;
        const z4AltAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();
        if (mesh.annexAltOnly && !z4AltAnnexRouteNow) return false;
        if (mesh.annexNormalOnly && z4AltAnnexRouteNow) return false;
        if (mesh.annexBaseExitWall && z4AltAnnexRouteNow) return false;
        if (mesh.annexBaseExitWall && this.annexAltBasementActive) return false;
        if (mesh.annexEventExitWall && !this.annexSequenceActive) return false;
        if (mesh.annexCabinPortalWall && !this.annexSequenceActive) return false;
        if (mesh.annexBaseExitWall && this.annexSequenceActive) return false;
        if (mesh.annexCrywolfWall && !this.annexSequenceActive) return false;
        if (mesh.annexCrowd2 && !this.annexSequenceActive) return false;
        const annexCrowdView =
          this.turnAnimating && this.turnViewTo === "annex_stage" ? "stage" :
          this.turnAnimating && this.turnViewTo === "annex_path" ? "path" :
          (this.annexRoomView || "path");
        if (mesh.annexCrowdBack && annexCrowdView !== "stage") return false;
        if (mesh.annexCrowdSide && annexCrowdView === "stage") return false;
        if (mesh.annexInterior && !inAnnexInterior) return false;
        if (mesh.annexExterior && inAnnexInterior) return false;
        if (mesh.annexEntranceDoor && this.annexDoorOpen) return false;
        return true;
      };
      const drawStationMesh = (mesh) => {
        const noDepth = !!mesh.annexAltDoorSceneNoDepth;
        const depthWasEnabled = noDepth ? gl.isEnabled(gl.DEPTH_TEST) : false;
        if (noDepth) gl.disable(gl.DEPTH_TEST);
        if (mesh.annexCabinPortalWall) {
          mesh.tex = this.cabinPortalTexture || this.stationTextures.black;
          mesh.screenSample = true;
          mesh.texMix = 1.0;
        }
        this._bindStationMesh(mesh);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
        if (noDepth && depthWasEnabled) gl.enable(gl.DEPTH_TEST);
      };
      if (this._altAnnexCleanView) {
        for (let i = 0; i < this.stationMeshes.length; i++) {
          const mesh = this.stationMeshes[i];
          if (mesh && typeof mesh.altFogUpdater === "function" && shouldDrawStationMesh(mesh)) {
            mesh.altFogUpdater(now);
          }
        }
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        if (!shouldDrawStationMesh(mesh)) continue;
        if (mesh.blend) continue;
        drawStationMesh(mesh);
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        if (!shouldDrawStationMesh(mesh)) continue;
        if (!mesh.blend) continue;
        drawStationMesh(mesh);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.postProcessProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);
      const ppPos = gl.getAttribLocation(this.postProcessProg, "p");
      gl.enableVertexAttribArray(ppPos);
      gl.vertexAttribPointer(ppPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
      gl.uniform1i(gl.getUniformLocation(this.postProcessProg, "u_sceneTex"), 0);
      gl.uniform2f(gl.getUniformLocation(this.postProcessProg, "u_res"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_time"), now * 0.001);
      const annexTripPostFX = (this.annexSequenceActive && inAnnexInterior) ? Math.max(0.0, Math.min(1.0, this.annexTripFX || 1.0)) : 0.0;
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_trip"), Math.max(this.z4Trip, annexTripPostFX > 0.0 ? 1.18 : this.z4Trip));
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_annexTripFX"), annexTripPostFX);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_blinkAge"), 0.001 * (now - this.z4BlinkPeakTime));
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_isOOB"), this.z4IsOOB);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexPeripheral"), this._altAnnexCleanView ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexWhiteStrobe"), this._altAnnexWhiteStrobe || 0.0);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexFogPulse"), this._altAnnexFogPulse || 0.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    render(now, mx, my) {
      if (window.isEngine4Dead || this.isDead) return;
      window.isEngine1Dead = true;
      if (typeof currentEngine !== "undefined" && currentEngine) {
        try { currentEngine.destroy(); } catch(e) {}
        currentEngine = null;
      }
      if (typeof leftEngine !== "undefined" && leftEngine) {
        try { leftEngine.destroy(); } catch(e) {}
        leftEngine = null;
      }
      if (typeof rightEngine !== "undefined" && rightEngine) {
        try { rightEngine.destroy(); } catch(e) {}
        rightEngine = null;
      }
      if (typeof backEngine !== "undefined" && backEngine) {
        try { backEngine.destroy(); } catch(e) {}
        backEngine = null;
      }
      let dt = now - this.lastRenderTime;
      if (dt > 250 || dt <= 0) dt = 33.33;
      this.lastRenderTime = now;
      const step = dt / (IS_MOBILE ? 50 : 33.33);
      if (typeof mx !== "number") mx = typeof window.mx === "number" ? window.mx : this.cx;
      if (typeof my !== "number") my = typeof window.my === "number" ? window.my : this.cy;
      const altAnnexHardLookClamp = !!(
        typeof this._isAltAnnexLocked === "function" &&
        this._isAltAnnexLocked()
      );
      if (altAnnexHardLookClamp) {
        mx = Math.max(-0.24, Math.min(0.24, mx));
        my = Math.max(-0.15, Math.min(0.15, my));
        if (typeof window.mx === "number") window.mx = mx;
        if (typeof window.my === "number") window.my = my;
      }
      const stickyLook = this.phase === "z4b_cabin";
      if (stickyLook) {
        const lx = typeof window.__z4bIslandLookX === "number" ? window.__z4bIslandLookX : this.cx;
        const ly = typeof window.__z4bIslandLookY === "number" ? window.__z4bIslandLookY : this.cy;
        if (Math.abs(mx) < 0.0005 && Math.abs(my) < 0.0005 && (Math.abs(lx) > 0.0005 || Math.abs(ly) > 0.0005 || Math.abs(this.cx) > 0.0005 || Math.abs(this.cy) > 0.0005)) {
          mx = lx;
          my = ly;
        }
      }
      if (!this.turnAnimating) {
        this.cx += (mx - this.cx) * Math.min(1, 0.12 * step);
        this.cy += (my - this.cy) * Math.min(1, 0.12 * step);
      } else {
        const turnElapsed = now - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        this.cx = this.turnLookX * (1 - turnT);
        this.cy = this.turnLookY * (1 - turnT);
      }
      const altAnnexHardLookClampAfterSmooth = !!(
        typeof this._isAltAnnexLocked === "function" &&
        this._isAltAnnexLocked()
      );
      if (altAnnexHardLookClampAfterSmooth) {
        this.cx = Math.max(-0.24, Math.min(0.24, this.cx));
        this.cy = Math.max(-0.15, Math.min(0.15, this.cy));
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      }
      if (stickyLook) {
        window.__z4bIslandLookX = this.cx;
        window.__z4bIslandLookY = this.cy;
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      } else if (this.turnAnimating) {
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      }
      this._checkStationTurnThreshold(now);
      this._updateBlink(now);
      this._updatePhase(now, dt * 0.001);
      if (this.isDead) return;
      this.z4ModeTime += dt * 0.001;
      this._altAnnexCleanView = !!(
        (
          this.annexAltBasementActive ||
          this.annexBasementVariant === "alt" ||
          this.altAnnexRouteActive ||
          this.altAnnexDoorOpen ||
          this.altAnnexCounterClockwiseReady ||
          (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
        ) &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
      if (this._altAnnexCleanView) {
        this.neuralIntensity = 0;
        this.rBlink = 0;
        this.blinking = false;
        this.blackholeVisible = false;
        this.blackholeIntensity = 0;
        this.hallucinationIntensity = 0;
        this.hallucinationLevel = 0;
        this.glitchIntensity = 0;
        this.glitchAmount = 0;
        this.chromaticAberration = 0;
        this.vignetteIntensity = 0;
        this.noiseIntensity = 0;
        this.scanlineIntensity = 0;
        this.warpIntensity = 0;
        this.distortionIntensity = 0;
      }
      this.z4Trip = this._altAnnexCleanView ? 0.58 : Math.max(0.18, Math.min(1.4, this.neuralIntensity / 3.6));
      this.z4IsOOB = this._altAnnexCleanView ? 1.0 : (this.phase === "bay" ||
        this.phase === "hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "ring" ||
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door" ||
        this.phase === "z4b_cabin" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "reverse_hallway" ||
        this.phase === "reverse_bay"
          ? 1.0
          : 0.0)
      if (typeof this._updateAltAnnexNffAudio === "function") {
        this._updateAltAnnexNffAudio(now);
      }
      if (this.phase === "ascent" || this.phase === "docking_shake" || this.phase === "fog_in") {
        this._renderElevator(now);
      } else if (this.phase === "descent" || this.phase === "descent_shake") {
        this._renderElevator(now);
      } else if (this.phase === "fall") {
        this._renderFall(now);
      } else if (this.phase === "impact") {
        var impactElapsed = now - this.phaseStart;
        var flashT = Math.min(1, impactElapsed / 400);
        this._drawOverlay(1, 1, 1, flashT > 0.5 ? 1 - (flashT - 0.5) * 2 : flashT * 2);
        if (impactElapsed > 800) this._drawOverlay(0, 0, 0, Math.min(1, (impactElapsed - 800) / 1200));
      } else if (this.phase === "z4b_cabin") {
        this._renderZ4BCabin(now);
        this._drawZ4BCrashOverlays(now);
      } else {
        this._renderStation(now);
        if (
          this._altAnnexCleanView &&
          (
            this.phase === "annex_hallway" ||            this.phase === "annex_room" ||
            this.phase === "annex_exit_door"
          )
        ) {
          this._drawAltAnnexFX(now);
        }
      }
      if (
        !this._altAnnexCleanView &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      ) {
        var hazeBase =
          this.phase === "annex_hallway" ? 0.12 :
          this.phase === "annex_room" ? 0.24 :
          0.28;
        if (this.annexSequenceActive && this.phase === "annex_room") hazeBase = 0.030;
        var hazePulse = 0.010 * (0.5 + 0.5 * Math.sin(now * 0.0009));
        this._drawOverlay(0.18, 0.035, 0.0, hazeBase + hazePulse);
        this._drawOverlay(0.42, 0.03, 0.0, (this.annexSequenceActive && this.phase === "annex_room" ? 0.010 : 0.045) + hazePulse * 0.20);
        if (this.annexSequenceActive && this.phase === "annex_room") {
          var annexBeatFlash = Math.max(0, Math.min(1, (this._annexWhiteStrobe || 0) / 5.25));
          var annexBlackout = Math.max(0, Math.min(1, this._annexStrobe || 0));
          this._drawOverlay(0.0, 0.0, 0.0, Math.min(0.46, annexBlackout * 0.34));
          this._drawOverlay(1.0, 0.96, 0.88, Math.min(0.34, annexBeatFlash * 0.34));
        }
        if (this.phase === "annex_exit_door") {
          var exitFade = Math.max(0, Math.min(1, this.annexExitT || 0));
          this._drawOverlay(0.00, 0.85, 0.10, 0.07 + exitFade * 0.20);
          this._drawOverlay(0.00, 0.00, 0.00, Math.max(0, (exitFade - 0.72) / 0.28) * 0.82);
        }
      }
      if (this.phase === "docking_shake") {
        var shakeAlpha = this.shakeIntensity * 3.0;
        this._drawOverlay(0.02, 0.0, 0.0, Math.min(0.15, shakeAlpha));
      }
      if (this.phase === "descent_shake") {
        var shakeAlpha = this.shakeIntensity * 2.0;
        this._drawOverlay(0.15, 0.0, 0.0, Math.min(0.4, shakeAlpha));
      }
      if (this.phase === "fall") {
        var fallElapsed = now - this.phaseStart;
        if (fallElapsed < 500) {
          var fA = fallElapsed < 80
            ? fallElapsed / 80
            : Math.max(0, 1 - (fallElapsed - 80) / 420);
          this._drawOverlay(1.0, 0.92, 0.82, fA * 0.95);
        }
      }
      if (this.rBlink > 0.001) {
        this._drawOverlay(0, 0, 0, this.rBlink);
      }
    }
    destroy() {
      this.isDead = true;
      if (this.fogOverlay) this.fogOverlay.style.opacity = "0";
      if (this.earthVideo) {
        try {
          this.earthVideo.pause();
        } catch (e) {}
      }
      try { this._duckAltAnnexMainAudio(false); } catch (e) {}
      if (this.altAnnexNffAudio) {
        try { this.altAnnexNffAudio.pause(); } catch (e) {}
        try { this.altAnnexNffAudio.removeAttribute("src"); this.altAnnexNffAudio.load(); } catch (e) {}
      }
      try {
        if (this.altAnnexNffSource) this.altAnnexNffSource.disconnect();
        if (this.altAnnexNffFilter) this.altAnnexNffFilter.disconnect();
        if (this.altAnnexNffGain) this.altAnnexNffGain.disconnect();
      } catch (e) {}
      if (this.elevatorProg) gl.deleteProgram(this.elevatorProg);
      if (this.stationBgProg) gl.deleteProgram(this.stationBgProg);
      if (this.stationMeshProg) gl.deleteProgram(this.stationMeshProg);
      if (this.z4bCabinProg) gl.deleteProgram(this.z4bCabinProg);
      if (this.overlayProg && this.overlayProg.prog) gl.deleteProgram(this.overlayProg.prog);
      if (this.altAnnexFXProg && this.altAnnexFXProg.prog) gl.deleteProgram(this.altAnnexFXProg.prog);
      if (this.postProcessProg) gl.deleteProgram(this.postProcessProg);
      if (this.fallProg) gl.deleteProgram(this.fallProg);
      if (this.fbo) gl.deleteFramebuffer(this.fbo);
      if (this.cabinPortalFBO) gl.deleteFramebuffer(this.cabinPortalFBO);
      if (this.fboTexture) gl.deleteTexture(this.fboTexture);
      if (this.cabinPortalTexture) gl.deleteTexture(this.cabinPortalTexture);
      if (this.fboDepth) gl.deleteRenderbuffer(this.fboDepth);
      if (this.fullTri) gl.deleteBuffer(this.fullTri);
      if (this.screenQuad) gl.deleteBuffer(this.screenQuad);
      if (this.stationTextures) {
        for (const k in this.stationTextures) {
          const tex = this.stationTextures[k];
          if (Array.isArray(tex)) {
            for (let i = 0; i < tex.length; i++) {
              if (tex[i]) gl.deleteTexture(tex[i]);
            }
          } else if (tex) {
            gl.deleteTexture(tex);
          }
        }
      }
      if (this.stationMeshes) {
        for (let i = 0; i < this.stationMeshes.length; i++) {
          if (this.stationMeshes[i].buf) gl.deleteBuffer(this.stationMeshes[i].buf);
        }
      }
    }
  }
  window.startZone4 = function () {
    window.isEngine4Dead = false;
    window.__z4RenderLogged = false;
    if (!z4Ready()) {
      console.error("[Zone4] Missing shared engine globals.");
      return;
    }
    if (window.currentZone4 && !window.currentZone4.isDead) {
      window.currentZone4.destroy();
    }
    window.currentZone4 = new Zone4Engine();
    if (!window.currentZone4 || window.currentZone4.isDead) return;
    if (window.__unlockAllVideos) {
      window.__unlockAllVideos();
    }
    window.__z4LoopToken = (window.__z4LoopToken || 0) + 1;
    const token = window.__z4LoopToken;
    const frameBudget =
      1000 /
      (
        /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
          ? 20
          : 30
      );
    let last = 0;
    function loop(t) {
      if (token !== window.__z4LoopToken) return;
      requestAnimationFrame(loop);
      if (t - last < frameBudget) return;
      last = t;
      if (window.currentZone4 && !window.currentZone4.isDead) {
        window.currentZone4.render(t, window.mx || 0, window.my || 0);
        if (!window.__z4RenderLogged) { window.__z4RenderLogged = true; console.log("[Zone4] render loop active, phase:", window.currentZone4.phase, "fallProg:", !!window.currentZone4.fallProg); }
      }
    }
    requestAnimationFrame(loop);
  };
  window.Zone4Engine = Zone4Engine;
})();
