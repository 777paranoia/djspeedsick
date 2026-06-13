!(function () {
  let z4SpaceHeld = window.z4SpaceHeld || !1,
    z4TouchHeld = window.z4TouchHeld || !1;
  function checkZ4Touch(ev) {
    if (!ev.touches) return;
    let held = !1;
    const contains =
      "function" == typeof window.__mobileWalkZoneContains
        ? window.__mobileWalkZoneContains
        : function (x, y) {
            const w = window.innerWidth;
            return (
              y >= 0.68 * window.innerHeight && x >= 0.3 * w && x <= 0.7 * w
            );
          };
    for (let i = 0; i < ev.touches.length; i++) {
      const t = ev.touches[i];
      if (contains(t.clientX, t.clientY)) {
        held = !0;
        break;
      }
    }
    ((z4TouchHeld = held), (window.z4TouchHeld = held));
  }
  function z4ClampMouse(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  window.__z4InputInstalled ||
    ((window.__z4InputInstalled = !0),
    (window.__z4AltAnnexMouseSandbox = !0),
    window.addEventListener(
      "mousemove",
      function (ev) {
        if (
          !(function () {
            const z4 = window.currentZone4;
            return !(
              !z4 ||
              z4.isDead ||
              !1 === window.__z4AltAnnexMouseSandbox ||
              "function" != typeof z4._isAltAnnexLocked ||
              !z4._isAltAnnexLocked()
            );
          })()
        )
          return;
        const w = Math.max(1, window.innerWidth || 1),
          h = Math.max(1, window.innerHeight || 1),
          nx = (w / 2 - ev.clientX) / (w / 2),
          ny = (h / 2 - ev.clientY) / (h / 2);
        ((window.mx = z4ClampMouse(nx * 0.24, -0.24, 0.24)),
          (window.my = z4ClampMouse(ny * 0.15, -0.15, 0.15)));
      },
      { passive: !0 },
    ),
    window.addEventListener("keydown", function (e) {
      if (
        ("Space" === e.code &&
          (e.preventDefault(), (z4SpaceHeld = !0), (window.z4SpaceHeld = !0)),
        "ArrowLeft" === e.code || "ArrowRight" === e.code)
      ) {
        const z4 = window.currentZone4;
        z4 && !z4.isDead && "ring" === z4.phase
          ? (window.__z4TurnRequested = "ArrowLeft" === e.code ? -1 : 1)
          : z4 &&
            !z4.isDead &&
            "annex_room" === z4.phase &&
            (window.__z4AnnexTurnRequested = "ArrowLeft" === e.code ? -1 : 1);
      }
    }),
    window.addEventListener("keyup", function (e) {
      "Space" === e.code &&
        (e.preventDefault(), (z4SpaceHeld = !1), (window.z4SpaceHeld = !1));
    }),
    window.addEventListener("touchstart", checkZ4Touch, { passive: !1 }),
    window.addEventListener("touchmove", checkZ4Touch, { passive: !1 }),
    window.addEventListener("touchend", checkZ4Touch, { passive: !1 }),
    window.addEventListener("touchcancel", function () {
      ((z4TouchHeld = !1), (window.z4TouchHeld = !1));
    }));
  class Zone4Engine {
    constructor() {
      const src =
        window.Zone4StationSources &&
        "function" == typeof window.Zone4StationSources.resolveSources
          ? window.Zone4StationSources.resolveSources()
          : { stationBgCombined: "", stationMeshFrag: "" };
      if (
        !(
          src.elevatorVert &&
          src.elevatorFrag &&
          src.stationVertMesh &&
          src.stationVertScreen &&
          src.stationBgCore &&
          src.stationBgFrag &&
          src.stationMeshFrag
        )
      )
        return (
          console.error("[Zone4] Missing shader modules.", src),
          void (this.isDead = !0)
        );
      ((this.src = src),
        (this.isDead = !1),
        (this.lastRenderTime = performance.now()),
        (this.cx = 0),
        (this.cy = 0),
        (this.phase = "ascent"),
        (this.phaseStart = performance.now()),
        (this.ascentStart = performance.now()),
        (this.ascentDuration = 48e3),
        (this.dockingShakeDuration = 1500),
        (this.fogInDuration = 2200),
        (this.fogOutDuration = 2600),
        (this.progress = 0),
        (this.walkAngle = 0),
        (this.rBlink = 0),
        (this.lastBlinkTime = performance.now()),
        (this.nextBlinkInterval = 4e3 + 7e3 * Math.random()),
        (this.blinking = !1),
        (this.blinkStart = 0),
        (this.stationSection = 8),
        (this.ringU = (this.stationSection + 0.5) * ((2 * Math.PI) / 16)),
        (this.walkoff = 0),
        (this.hallwayT = 0),
        (this.enterRingT = 0),
        (this.phaseFogArmed = !1),
        (this.shakeIntensity = 0),
        (this.shakeOffsetX = 0),
        (this.shakeOffsetY = 0),
        (this.ringDirection = 1),
        (this.ringView = "window"),
        (this.ringWindowSide = 1),
        (this.turnAnimating = !1),
        (this.turnStart = 0),
        (this.turnTo = -1),
        (this.turnSpin = 1),
        (this.turnAngle = Math.PI),
        (this.turnViewTo = null),
        (this.turnDirectionTo = null),
        (this.turnWindowSideTo = null),
        (this.turnDuration = 420),
        (this.turnInputLatch = 0),
        (this.turnLookX = 0),
        (this.turnLookY = 0),
        (this.lapCount = 0),
        (this.lastRingU = this.ringU),
        (this.ringTravel = 0),
        (this.signedRingTravel = 0),
        (this.lapCrossings = 0),
        (this.clockwiseLapCount = 0),
        (this.counterClockwiseLapCount = 0),
        (this.totalClockwiseTravel = 0),
        (this.totalCounterClockwiseTravel = 0),
        (this.totalClockwiseLapCount = 0),
        (this.totalCounterClockwiseLapCount = 0),
        (this.altAnnexPatternStage = 0),
        (this.altAnnexCwTravel = 0),
        (this.altAnnexCcwTravel = 0),
        (this.altAnnexCwLapCount = 0),
        (this.altAnnexCcwLapCount = 0),
        (this.altAnnexClockwiseReady = !1),
        (this.altAnnexCounterClockwiseReady = !1),
        (this.altAnnexDoorOpen = !1),
        (this.altAnnexRouteActive = !1),
        (this.altAnnexZone2ReturnActive = !1),
        (this.altAnnexZone2Returned = !1),
        (this.annexAltBasementActive = !1),
        (this.annexBasementVariant = "normal"),
        (this.altAnnexLastLog = 0),
        (this.annexDoorOpen = !1),
        (this.annexSection = 0),
        (this.annexEntryU = this.ringU),
        (this.annexTargetU = this.ringU),
        (this.annexTurnT = 0),
        (this.annexHallT = 0),
        (this.annexRoomT = 0),
        (this.annexExitT = 0),
        (this.annexRoomDir = 1),
        (this.annexRoomView = "path"),
        (this.annexTurnInputLatch = 0),
        (this.annexDjBlinkCount = 0),
        (this.annexSequenceActive = !1),
        (this.annexSequenceStart = 0),
        (this.annexStrobe = 0),
        (this.annexTripFX = 0),
        (this.annexTripFXTarget = 0),
        (this.annexTripFXLast = performance.now()),
        (this.annexTripOverlay = null),
        (this.annexTripBlurOverlay = null),
        (this.annexTripRedOverlay = null),
        (this.annexTripDarkOverlay = null),
        (this.__boothTripFXPatch = !0),
        (this.z4bStopAtCockpit = !1),
        (this.annexExitFading = !1),
        (this.blackholeVisible = !1),
        (this.blackholeIntensity = 0),
        (this.descentProgress = 1),
        (this.descentStart = 0),
        (this.descentDuration = 38e3),
        (this.fallProgress = 0),
        (this.fallStart = 0),
        (this.fallDuration = 32e3),
        (this.neuralIntensity = 0.75),
        (this.z4Trip = 1),
        (this.z4ModeSeed = 1e3 * Math.random()),
        (this.z4ModeTime = 0),
        (this.z4IsOOB = 1),
        (this.z4FractalSeed = 1e3 * Math.random()),
        (this.z4BlinkPeakTime = performance.now()),
        (this.altAnnexNffAudio = null),
        (this.altAnnexNffCtx = null),
        (this.altAnnexNffSource = null),
        (this.altAnnexNffFilter = null),
        (this.altAnnexNffGain = null),
        (this.altAnnexNffPlaying = !1),
        (this.altAnnexNffTargetGain = 0),
        (this.altAnnexMainAudioDucked = !1),
        (this.altAnnexMainAudioPrevVolume = 1),
        (this.altAnnexMainAudioPrevMuted = !1),
        (src.stationBgCombined =
          window.Zone4StationSources &&
          "function" ==
            typeof window.Zone4StationSources.buildPsychStationShader
            ? window.Zone4StationSources.buildPsychStationShader()
            : ""),
        (src.stationMeshFrag = this._patchAnnexBasementShader(
          src.stationMeshFrag,
        )),
        (this.elevatorProg = this._buildRawProgram(
          src.elevatorVert,
          src.elevatorFrag,
        )),
        (this.stationBgProg = this._buildRawProgram(
          src.stationVertScreen,
          src.stationBgCombined,
        )),
        (this.stationMeshProg = this._buildRawProgram(
          src.stationVertMesh,
          src.stationMeshFrag,
        )),
        (this.postProcessProg = this._buildRawProgram(
          "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }",
          window.Zone4StationSources &&
            "function" ==
              typeof window.Zone4StationSources.buildPostProcessShader
            ? window.Zone4StationSources.buildPostProcessShader()
            : "",
        )),
        (this.overlayProg = this._buildOverlayProgram()),
        (this.altAnnexFXProg =
          "function" == typeof this._buildAltAnnexFXProgram
            ? this._buildAltAnnexFXProgram()
            : null),
        (this.fallProg = null),
        (this._fallShaderBuilt = !1),
        (this.fboTexture = gl.createTexture()),
        (this.fboDepth = gl.createRenderbuffer()),
        (this.fbo = gl.createFramebuffer()),
        (this.fboWidth = 0),
        (this.fboHeight = 0),
        (this.z4bCabinProg = null),
        (this.cabinPortalFBO = null),
        (this.cabinPortalTexture = null),
        (this.cabinPortalWidth = 0),
        (this.cabinPortalHeight = 0),
        (this.z4bVoidFBO = null),
        (this.z4bVoidTexture = null),
        (this.z4bVoidWidth = 0),
        (this.z4bVoidHeight = 0),
        (this.z4Mode4OceanProg = null),
        (this.z4Mode4OceanEnvTex = null),
        (this.z4Mode4OceanWindowTex = null),
        (this.z4bVoidMode = null),
        (this.z4bVoidMaskTex = null),
        (this.z4bCabinState = "idle"),
        (this.z4bCabinStart = 0),
        (this.z4bCabinCrashStart = 0),
        (this.z4bCabinCamZ = 12),
        (this.z4bCabinCamX = 0),
        (this.z4bCabinYaw = 0),
        (this.z4bCabinZoom = 1),
        (this.z4bCabinShake = 0),
        (this.z4bCabinFlash = 0),
        (this.z4bCabinWalking = !1),
        (this.z4bIslandStarted = !1));
      try {
        "undefined" != typeof ActiveMode &&
          ((this.z4bVoidMode = new ActiveMode(5)),
          (this.z4bVoidMaskTex = this._makeSolidTexture(0, 0, 0, 0)),
          (this.z4bVoidMode.maskTex = this.z4bVoidMaskTex));
      } catch (e) {
        ((this.z4bVoidMode = null), (this.z4bVoidMaskTex = null));
      }
      ((this.fullTri = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ),
        (this.screenQuad = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        ),
        (this.stationTextures = this._initStationTextures()),
        (this.stationMeshes = []),
        this._buildStationMeshes(),
        (this.fogOverlay = this._getFogOverlay()),
        this._setFog(0, 0),
        gl.enable(gl.DEPTH_TEST),
        gl.disable(gl.CULL_FACE));
    }
    _patchAnnexBasementShader(fsSource) {
      return fsSource
        ? (-1 === fsSource.indexOf("u_tileTex") &&
            (fsSource = fsSource.replace(
              "uniform float u_useTexAlpha;\n",
              "uniform float u_useTexAlpha;\nuniform float u_tileTex;\n",
            )),
          -1 === fsSource.indexOf("z4TexUV") &&
            (fsSource = fsSource.replace(
              "  vec4 sampled = texture2D(u_tex, v_uv);",
              "  vec2 z4TexUV = mix(v_uv, fract(v_uv), u_tileTex);\n  vec4 sampled = texture2D(u_tex, z4TexUV);",
            )),
          -1 !== fsSource.indexOf("u_annexStageRedLight") &&
          -1 !== fsSource.indexOf("u_annexStageWhiteStrobe") &&
          -1 !== fsSource.indexOf("u_annexLightCol0")
            ? fsSource
            : (fsSource =
                -1 !== fsSource.indexOf("u_annexLighting")
                  ? (fsSource = (fsSource = fsSource.replace(
                      "uniform vec3 u_annexLight2;\\n",
                      "uniform vec3 u_annexLight2;\\nuniform vec3 u_annexStageRedLight;\\nuniform float u_annexStageRedGlow;\\nuniform vec3 u_annexStageWhiteLight;\\nuniform float u_annexStageWhiteStrobe;\\n",
                    )).replace(
                      "    direct += bulbSum * (1.55 + u_annexStrobe * 4.80);",
                      "    direct += bulbSum * 1.15;",
                    )).replace(
                      "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    amb *= mix(1.0, 0.42, u_annexStrobe);",
                      "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    vec3 RS = u_annexStageRedLight - v_wpos;\\n    float rdist = dot(RS, RS);\\n    vec3 RSdir = normalize(RS);\\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\\n    float rsoft = smoothstep(0.0, 0.85, rfall);\\n    direct += vec3(0.88, 0.035, 0.020) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\\n    amb += vec3(0.070, 0.008, 0.006) * rsoft * u_annexStageRedGlow;\\n    float roomFlash = clamp(u_annexStageWhiteStrobe * 0.22, 0.0, 1.0);\n    amb += vec3(0.84, 0.80, 0.72) * roomFlash;\n    direct += vec3(1.55, 1.45, 1.28) * roomFlash;\n    spec += roomFlash * 0.22;\n    float annexBlackout = mix(1.0, 0.14, u_annexStrobe);\\n    amb *= annexBlackout;\\n    direct *= annexBlackout;\\n    spec *= mix(1.0, 0.20, u_annexStrobe);",
                    )
                  : fsSource
                      .replace(
                        "uniform float u_greenKey;\n",
                        "uniform float u_greenKey;\nuniform float u_annexLighting;\nuniform float u_annexStrobe;\nuniform float u_annexExitGlow;\nuniform vec3 u_annexExitLight;\nuniform vec3 u_annexLight0;\nuniform vec3 u_annexLight1;\nuniform vec3 u_annexLight2;\nuniform vec3 u_annexLightCol0;\nuniform vec3 u_annexLightCol1;\nuniform vec3 u_annexLightCol2;\nuniform vec3 u_annexStageRedLight;\nuniform float u_annexStageRedGlow;\nuniform vec3 u_annexStageWhiteLight;\nuniform float u_annexStageWhiteStrobe;\n",
                      )
                      .replace(
                        "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 col=base*(amb + diff*vec3(0.52, 0.56, 0.62));\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;",
                        "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 direct = diff*vec3(0.52, 0.56, 0.62);\n  if(u_annexLighting > 0.5){\n    float emitter = step(1.25, max(max(u_flatCol.r, u_flatCol.g), u_flatCol.b));\n    amb = mix(vec3(0.026, 0.027, 0.030), amb, emitter);\n    direct *= mix(0.11, 0.80, emitter);\n    spec *= mix(0.12, 1.00, emitter);\n    vec3 bulbSum = vec3(0.0);\n    vec3 L0 = u_annexLight0 - v_wpos;\n    vec3 L1 = u_annexLight1 - v_wpos;\n    vec3 L2 = u_annexLight2 - v_wpos;\n    vec3 D0 = normalize(v_wpos - u_annexLight0);\n    vec3 D1 = normalize(v_wpos - u_annexLight1);\n    vec3 D2 = normalize(v_wpos - u_annexLight2);\n    float c0 = smoothstep(0.64, 0.975, dot(D0, vec3(0.0,-1.0,0.0)));\n    float c1 = smoothstep(0.64, 0.975, dot(D1, vec3(0.0,-1.0,0.0)));\n    float c2 = smoothstep(0.64, 0.975, dot(D2, vec3(0.0,-1.0,0.0)));\n    float f0 = c0 / (1.0 + dot(L0,L0) * 1.35);\n    float f1 = c1 / (1.0 + dot(L1,L1) * 1.35);\n    float f2 = c2 / (1.0 + dot(L2,L2) * 1.35);\n    bulbSum += u_annexLightCol0 * f0 * (0.25 + 0.75 * max(dot(n, normalize(L0)), 0.0));\n    bulbSum += u_annexLightCol1 * f1 * (0.25 + 0.75 * max(dot(n, normalize(L1)), 0.0));\n    bulbSum += u_annexLightCol2 * f2 * (0.25 + 0.75 * max(dot(n, normalize(L2)), 0.0));\n    direct += bulbSum * 1.15;\n    vec3 GE = u_annexExitLight - v_wpos;\n    float gdist = dot(GE, GE);\n    float gcone = smoothstep(0.18, 0.82, dot(normalize(GE), n));\n    float gfall = u_annexExitGlow / (1.0 + gdist * 0.34);\n    direct += vec3(0.00, 1.55, 0.12) * gfall * (0.32 + 1.40 * gcone);\n    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\n    vec3 RS = u_annexStageRedLight - v_wpos;\n    float rdist = dot(RS, RS);\n    vec3 RSdir = normalize(RS);\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\n    float rsoft = smoothstep(0.0, 0.85, rfall);\n    direct += vec3(0.88, 0.035, 0.020) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\n    amb += vec3(0.070, 0.008, 0.006) * rsoft * u_annexStageRedGlow;\n    float roomFlash = clamp(u_annexStageWhiteStrobe * 0.22, 0.0, 1.0);\n    amb += vec3(0.84, 0.80, 0.72) * roomFlash;\n    direct += vec3(1.55, 1.45, 1.28) * roomFlash;\n    spec += roomFlash * 0.22;\n    float annexBlackout = mix(1.0, 0.14, u_annexStrobe);\n    amb *= annexBlackout;\n    direct *= annexBlackout;\n    spec *= mix(1.0, 0.20, u_annexStrobe);\n  }\n  vec3 col=base*(amb + direct);\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;",
                      )
                      .replace(
                        "  float fog=1.0-exp(-dist*0.045);",
                        "  float fog=1.0-exp(-dist*mix(0.045, 0.085, step(0.5, u_annexLighting)));",
                      )
                      .replace(
                        "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  col=mix(col, fogCol, fog * 0.32);",
                        "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  if(u_annexLighting > 0.5) fogCol = mix(fogCol, vec3(0.020, 0.026, 0.034), 0.66);\n  if(u_annexExitGlow > 0.01) fogCol += vec3(0.0, 0.18, 0.025) * u_annexExitGlow;\n  if(u_annexLighting > 0.5) fogCol *= mix(1.0, 0.18, u_annexStrobe);\n  col=mix(col, fogCol, fog * mix(0.32, 0.34, step(0.5, u_annexLighting)));",
                      )))
        : fsSource;
    }
    _buildRawProgram(vsSource, fsSource) {
      const prog = gl.createProgram(),
        vs = compile(
          gl.VERTEX_SHADER,
          IS_MOBILE ? "#define MOBILE\n" + vsSource : vsSource,
        ),
        fs = compile(
          gl.FRAGMENT_SHADER,
          IS_MOBILE ? "#define MOBILE\n" + fsSource : fsSource,
        );
      return vs && fs
        ? (gl.attachShader(prog, vs),
          gl.attachShader(prog, fs),
          gl.linkProgram(prog),
          gl.getProgramParameter(prog, gl.LINK_STATUS)
            ? prog
            : (console.error("[Zone4] Link error:", gl.getProgramInfoLog(prog)),
              gl.deleteProgram(prog),
              null))
        : null;
    }
    _buildOverlayProgram() {
      const prog = gl.createProgram(),
        vs = compile(
          gl.VERTEX_SHADER,
          "attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }",
        ),
        fs = compile(
          gl.FRAGMENT_SHADER,
          "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }",
        );
      return vs && fs
        ? (gl.attachShader(prog, vs),
          gl.attachShader(prog, fs),
          gl.linkProgram(prog),
          gl.getProgramParameter(prog, gl.LINK_STATUS)
            ? {
                prog: prog,
                p: gl.getAttribLocation(prog, "p"),
                col: gl.getUniformLocation(prog, "u_col"),
              }
            : (gl.deleteProgram(prog), null))
        : null;
    }
    _getFogOverlay() {
      let ov = document.getElementById("z4-fog-overlay");
      return (
        ov ||
          ((ov = document.createElement("div")),
          (ov.id = "z4-fog-overlay"),
          (ov.style.cssText =
            "position:fixed;inset:0;pointer-events:none;z-index:99998;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(245,247,252,0.96) 0%, rgba(226,231,239,0.94) 38%, rgba(198,205,215,0.96) 68%, rgba(165,174,186,0.98) 100%);transition:opacity 0ms linear;"),
          document.body.appendChild(ov)),
        ov
      );
    }
    _setFog(alpha, durationMs) {
      this.fogOverlay &&
        ((this.fogOverlay.style.transition =
          "opacity " + Math.max(0, 0 | durationMs) + "ms ease"),
        (this.fogOverlay.style.opacity = String(alpha)));
    }
    _makeSolidTexture(r, g, b, a) {
      const tex = gl.createTexture();
      return (
        gl.bindTexture(gl.TEXTURE_2D, tex),
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([r, g, b, a]),
        ),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
        tex
      );
    }
    _claimLoopingVideo(path) {
      let vid = window.__claimPoolVid ? window.__claimPoolVid(path) : null;
      if (vid) {
        vid.loop = !0;
        try {
          const p = vid.play();
          p && p.catch && p.catch(function () {});
        } catch (e) {}
        return vid;
      }
      ((vid = document.createElement("video")),
        (vid.muted = !0),
        (vid.playsInline = !0),
        (vid.loop = !0),
        (vid.preload = "auto"),
        (vid.autoplay = !0),
        vid.setAttribute("playsinline", ""),
        vid.setAttribute("webkit-playsinline", ""),
        (vid.src = path),
        window.__registerVideo && window.__registerVideo(vid));
      try {
        const p = vid.play();
        p && p.catch && p.catch(function () {});
      } catch (e) {}
      return vid;
    }
    _loadCrowdCutoutTexture(path, keyLightBg) {
      const tex = gl.createTexture();
      (gl.bindTexture(gl.TEXTURE_2D, tex),
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 0]),
        ),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR));
      const img = new Image();
      return (
        (tex._w = 1),
        (tex._h = 1),
        (img.onload = function () {
          if (
            ((tex._w = img.naturalWidth || img.width || 1),
            (tex._h = img.naturalHeight || img.height || 1),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, tex),
            keyLightBg)
          )
            try {
              const cnv = document.createElement("canvas");
              ((cnv.width = tex._w), (cnv.height = tex._h));
              const ctx = cnv.getContext("2d", { willReadFrequently: !0 });
              ctx.drawImage(img, 0, 0);
              const data = ctx.getImageData(0, 0, cnv.width, cnv.height),
                px = data.data;
              for (let i = 0; i < px.length; i += 4) {
                const r = px[i],
                  g = px[i + 1],
                  b = px[i + 2],
                  hi = Math.max(r, g, b),
                  lo = Math.min(r, g, b);
                hi > 212 && hi - lo < 24 && (px[i + 3] = 0);
              }
              (ctx.putImageData(data, 0, 0),
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  cnv,
                ));
            } catch (e) {
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img,
              );
            }
          else
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              img,
            );
        }),
        (img.src = path),
        tex
      );
    }
    _initStationTextures() {
      const base = "files/img/rooms/z4/",
        tex = {
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
          spaceHallDoor: loadStaticTex(base + "SPACE-HALL-DOOR.png"),
          exitWall: loadStaticTex(base + "WALL-EXIT.png"),
          basementWallExit: loadStaticTex(base + "basement/WALL-EXIT.png"),
          basementWall: loadStaticTex(base + "basement/BASEMENT-WALL.png"),
          basementAltWall: loadStaticTex(base + "basement/ALT-WALL.png"),
          basementBackWall: loadStaticTex(base + "basement/BACKWALL.png"),
          basementBathroomClub: loadStaticTex(
            "files/img/rooms/z2/bathroom-club-noref-blur.png",
          ),
          basementBathroomClubWall: loadStaticTex(
            base + "basement/BATHROOM-CLUB-WALL.PNG",
          ),
          basementBathroomFloor: loadStaticTex(
            base + "basement/BASEMENT-BATHROOM-FLOOR.png",
          ),
          basementAltDoorHall: loadStaticTex(
            base + "basement/ALT-HALL-DOOR.png",
          ),
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
          cabinHallLeft: loadStaticTex(
            "files/img/rooms/z2/hallway/RIGHTWALL.png",
          ),
          cabinHallRight: loadStaticTex(
            "files/img/rooms/z2/hallway/LEFTWALL_B.png",
          ),
          cabinHallTop: loadStaticTex("files/img/rooms/z2/hallway/TOP.png"),
          cabinHallBottom: loadStaticTex(
            "files/img/rooms/z2/hallway/GROUND.png",
          ),
          black: this._makeSolidTexture(10, 10, 12, 255),
          earth: this._makeSolidTexture(0, 0, 0, 255),
          crywolf: this._makeSolidTexture(0, 0, 0, 255),
          bh2: this._makeSolidTexture(0, 0, 0, 255),
        };
      (window.__z2ClubPlatesPreloaded ||
        ((window.__z2ClubPlatesPreloaded = !0),
        ["bathroom-club-ref.png", "bathroom-club-noref.png"].forEach(
          function (p) {
            new Image().src = "files/img/rooms/z2/" + p;
          },
        )),
        (tex.annexCrowdBack = []),
        (tex.annexCrowdSide = []));
      for (let i = 1; i <= 14; i++)
        tex.annexCrowdBack.push(
          this._loadCrowdCutoutTexture(
            base +
              "basement/crowd2/backs/" +
              String(i).padStart(2, "0") +
              "b.png",
            !0,
          ),
        );
      for (let i = 1; i <= 16; i++)
        tex.annexCrowdSide.push(
          this._loadCrowdCutoutTexture(
            base +
              "basement/crowd2/side/" +
              String(i).padStart(2, "0") +
              "s.png",
            !1,
          ),
        );
      return (
        (this.earthVideo = this._claimLoopingVideo("files/mov/earth.mp4")),
        (this.crywolfVideo = this._claimLoopingVideo(
          "files/mov/mapped/crywolf.mp4",
        )),
        (this.bh2Video = this._claimLoopingVideo("files/mov/bh2.mp4")),
        tex
      );
    }
    _updateVideoTexture(tex, video) {
      if (tex && video && !(video.readyState < 2)) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
          );
        } catch (e) {}
      }
    }
    _makeMesh(data, tex, flatCol, texMix, blend) {
      const buf = gl.createBuffer();
      return (
        gl.bindBuffer(gl.ARRAY_BUFFER, buf),
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW),
        {
          buf: buf,
          count: data.length / 8,
          tex: tex,
          flatCol: flatCol || [1, 1, 1],
          texMix: "number" == typeof texMix ? texMix : 1,
          blend: !!blend,
        }
      );
    }
    _buildStationMeshes() {
      if (
        !window.Zone4Annex ||
        "function" != typeof window.Zone4Annex.buildStationMeshes
      )
        throw new Error("Zone4Annex.buildStationMeshes missing");
      return window.Zone4Annex.buildStationMeshes.call(this);
    }
    _smooth01(t) {
      return (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t);
    }
    _hallucinationTripForLevel(level) {
      return "function" == typeof window.__hallucinationTripForLevel
        ? window.__hallucinationTripForLevel(level)
        : 0.32 * Math.max(0, Math.min(5, level));
    }
    _hallucinationLevelForScene() {
      const phase = this.phase;
      return "z4b_cabin" === phase
        ? "crash" === this.z4bCabinState || "turbulence" === this.z4bCabinState
          ? 5
          : 4
        : "ascent" === phase ||
            "docking_shake" === phase ||
            "fog_in" === phase ||
            "descent" === phase ||
            "descent_shake" === phase ||
            "fog_in_descent" === phase
          ? 2
          : "ring" === phase
            ? (this.lapCount || 0) >= 1
              ? 3
              : 2
            : "bay" === phase ||
                "hallway" === phase ||
                "entering_ring" === phase ||
                "reverse_entering_ring" === phase ||
                "reverse_hallway" === phase ||
                "reverse_bay" === phase
              ? 2
              : "annex_turn_in" === phase ||
                  "annex_hallway" === phase ||
                  "annex_room" === phase ||
                  "annex_exit_door" === phase
                ? "function" == typeof this._isAltAnnexRoute &&
                  this._isAltAnnexRoute()
                  ? "annex_turn_in" === phase ||
                    ("annex_hallway" === phase && (this.annexHallT || 0) < 0.38)
                    ? 3
                    : 4
                  : this.annexSequenceActive
                    ? 5
                    : 3
                : "fall" === phase
                  ? 3
                  : 2;
    }
    _isAltAnnexNffActive() {
      return !(
        !(
          this.annexAltBasementActive ||
          "alt" === this.annexBasementVariant ||
          this.altAnnexRouteActive ||
          this._altAnnexCleanView ||
          ("function" == typeof this._isAltAnnexRoute &&
            this._isAltAnnexRoute())
        ) ||
        ("annex_turn_in" !== this.phase &&
          "annex_hallway" !== this.phase &&
          "annex_turn_in" !== this.phase &&
          "annex_room" !== this.phase &&
          "annex_exit_door" !== this.phase)
      );
    }
    _altAnnexNffFocus() {
      if ("annex_turn_in" === this.phase)
        return 0.06 + 0.12 * this._smooth01(this.annexTurnT || 0);
      if ("annex_hallway" === this.phase) {
        const t = Math.max(0, Math.min(1, this.annexHallT || 0));
        return (
          0.12 +
          0.16 * this._smooth01(Math.min(1, t / 0.38)) +
          0.46 * this._smooth01(Math.max(0, (t - 0.28) / 0.72))
        );
      }
      return "annex_room" === this.phase
        ? 0.64 + 0.3 * this._smooth01(this.annexRoomT || 0)
        : "annex_exit_door" === this.phase
          ? 0.84
          : 0;
    }
    _ensureAltAnnexNffAudio() {
      if (this.altAnnexNffAudio) return !0;
      const a = new Audio("files/aud/nff.mp3");
      ((a.loop = !0),
        (a.preload = "auto"),
        (a.volume = 0),
        a.setAttribute("playsinline", ""),
        a.setAttribute("webkit-playsinline", ""),
        (this.altAnnexNffAudio = a));
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx =
              window.__z4NffAudioContext ||
              (window.__z4NffAudioContext = new AC()),
            src = ctx.createMediaElementSource(a),
            filter = ctx.createBiquadFilter(),
            gain = ctx.createGain();
          ((filter.type = "lowpass"),
            (filter.frequency.value = 520),
            (filter.Q.value = 0.82),
            (gain.gain.value = 0),
            src.connect(filter),
            filter.connect(gain),
            gain.connect(ctx.destination),
            (this.altAnnexNffCtx = ctx),
            (this.altAnnexNffSource = src),
            (this.altAnnexNffFilter = filter),
            (this.altAnnexNffGain = gain),
            (a.volume = 1));
        }
      } catch (e) {
        ((this.altAnnexNffCtx = null),
          (this.altAnnexNffSource = null),
          (this.altAnnexNffFilter = null),
          (this.altAnnexNffGain = null));
      }
      return !0;
    }
    _duckAltAnnexMainAudio(active) {
      const main =
        document.getElementById("audioPlayer") || window.audioPlayer || null;
      if (main && main !== this.altAnnexNffAudio)
        if (active) {
          this.altAnnexMainAudioDucked ||
            ((this.altAnnexMainAudioDucked = !0),
            (this.altAnnexMainAudioPrevVolume =
              "number" == typeof main.volume ? main.volume : 1),
            (this.altAnnexMainAudioPrevMuted = !!main.muted));
          try {
            ((main.volume += 0.18 * (0 - main.volume)),
              main.volume < 0.015 && (main.volume = 0));
          } catch (e) {}
        } else if (this.altAnnexMainAudioDucked) {
          const target =
            "number" == typeof this.altAnnexMainAudioPrevVolume
              ? this.altAnnexMainAudioPrevVolume
              : 1;
          try {
            ((main.muted = !!this.altAnnexMainAudioPrevMuted),
              (main.volume += 0.12 * (target - main.volume)),
              Math.abs(main.volume - target) < 0.02 &&
                ((main.volume = target), (this.altAnnexMainAudioDucked = !1)));
          } catch (e) {
            this.altAnnexMainAudioDucked = !1;
          }
        }
    }
    _updateAltAnnexNffAudio(now) {
      if (!this._isAltAnnexNffActive()) {
        if ((this._duckAltAnnexMainAudio(!1), this.altAnnexNffAudio))
          if (this.altAnnexNffGain && this.altAnnexNffCtx)
            try {
              const t = this.altAnnexNffCtx.currentTime;
              this.altAnnexNffGain.gain.setTargetAtTime(0, t, 0.35);
            } catch (e) {}
          else if (
            ((this.altAnnexNffAudio.volume +=
              0.08 * (0 - this.altAnnexNffAudio.volume)),
            this.altAnnexNffAudio.volume < 0.004)
          ) {
            try {
              this.altAnnexNffAudio.pause();
            } catch (e) {}
            this.altAnnexNffPlaying = !1;
          }
        return;
      }
      (this._ensureAltAnnexNffAudio(), this._duckAltAnnexMainAudio(!0));
      const a = this.altAnnexNffAudio;
      if (!a) return;
      const focus = this._altAnnexNffFocus(),
        targetGain = 0.045 + 0.42 * focus,
        targetFreq = 430 + 3100 * focus,
        targetQ = 0.7 + 0.45 * (1 - focus);
      if (
        ((this.altAnnexNffTargetGain = targetGain),
        this.altAnnexNffCtx && this.altAnnexNffGain && this.altAnnexNffFilter)
      )
        try {
          "suspended" === this.altAnnexNffCtx.state &&
            this.altAnnexNffCtx.resume();
          const t = this.altAnnexNffCtx.currentTime;
          (this.altAnnexNffGain.gain.setTargetAtTime(targetGain, t, 0.18),
            this.altAnnexNffFilter.frequency.setTargetAtTime(
              targetFreq,
              t,
              0.22,
            ),
            this.altAnnexNffFilter.Q.setTargetAtTime(targetQ, t, 0.28),
            (a.volume = 1));
        } catch (e) {}
      else a.volume += 0.08 * (targetGain - a.volume);
      try {
        if (a.paused || !this.altAnnexNffPlaying) {
          const pr = a.play();
          (pr && pr.catch && pr.catch(function () {}),
            (this.altAnnexNffPlaying = !0));
        }
      } catch (e) {}
    }
    _forceAnnexSequenceAudio() {
      const path = "files/aud/053.mp3";
      try {
        ((window.audioTracks = window.audioTracks || []),
          window.audioTracks.indexOf(path) < 0 &&
            window.audioTracks.push(path));
      } catch (e) {}
      try {
        const a =
          document.getElementById("audioPlayer") ||
          window.audioPlayer ||
          document.querySelector("audio");
        if (!a) return;
        ((a.currentSrc || a.src || "").indexOf(path) < 0
          ? (a.pause(),
            (a.src = path),
            (a.currentTime = 0),
            (a.loop = !0),
            a.load && a.load())
          : (a.currentTime = 0),
          (a.volume = 1));
        const p = a.play();
        p && p.catch && p.catch(function () {});
      } catch (e) {}
    }
    _triggerAnnexDjSequence(now) {
      if (!this.annexSequenceActive) {
        ((this.annexSequenceActive = !0),
          (this.annexSequenceStart = now),
          (this.annexDjBlinkCount = 2),
          (this.annexStrobe = 1),
          (this.annexTripFX = 1),
          (this.annexTripFXTarget = 1),
          (this._annexRedWash = 0.62),
          (this._annexRedGlow = 0.85),
          (this._annexWhiteStrobe = 0),
          (this._annexDarkPulse = 0.35),
          (this.z4Trip = Math.max(this.z4Trip || 1, 1.18)),
          (this.z4IsOOB = 1),
          (this.z4ModeSeed = 1e3 * Math.random()),
          (this.z4FractalSeed = this.z4ModeSeed),
          (this.blinking = !0),
          (this.blinkStart = now - 210),
          (this.lastBlinkTime = now),
          (this.nextBlinkInterval = 2300 + 2400 * Math.random()),
          (this.z4BlinkPeakTime = now),
          this._forceAnnexSequenceAudio());
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
    }
    _hardShiftAudioForZone2Return() {
      try {
        if (this.altAnnexNffAudio) {
          if (
            ((this.__altAnnexNffHandedToZone2 = !0),
            (window.__z4NffZone2Handoff = {
              audio: this.altAnnexNffAudio,
              ctx: this.altAnnexNffCtx,
              gain: this.altAnnexNffGain,
              filter: this.altAnnexNffFilter,
              source: this.altAnnexNffSource,
              main:
                document.getElementById("audioPlayer") ||
                window.audioPlayer ||
                document.querySelector("audio"),
              mainPrevVolume:
                "number" == typeof this.altAnnexMainAudioPrevVolume
                  ? this.altAnnexMainAudioPrevVolume
                  : 1,
              mainPrevMuted: !!this.altAnnexMainAudioPrevMuted,
            }),
            this.altAnnexNffGain && this.altAnnexNffCtx)
          ) {
            const t = this.altAnnexNffCtx.currentTime;
            (this.altAnnexNffGain.gain.setTargetAtTime(0.46, t, 0.08),
              this.altAnnexNffFilter &&
                this.altAnnexNffFilter.frequency.setTargetAtTime(
                  3300,
                  t,
                  0.12,
                ));
          } else this.altAnnexNffAudio.volume = 1;
          if (this.altAnnexNffAudio.paused) {
            const keepPlaying = this.altAnnexNffAudio.play();
            keepPlaying &&
              keepPlaying.catch &&
              keepPlaying.catch(function () {});
          }
        }
      } catch (e) {}
      const keepNffThroughZone2Blink = !!window.__z4NffZone2Handoff;
      try {
        const main =
          document.getElementById("audioPlayer") ||
          window.audioPlayer ||
          document.querySelector("audio");
        if (!main || main === this.altAnnexNffAudio) return;
        const tracks = Array.isArray(window.audioTracks)
          ? window.audioTracks
          : [];
        let pick = "files/aud/011.mp3";
        for (let i = 0; i < tracks.length; i++) {
          const t = tracks[(i + 3) % tracks.length];
          if (
            "string" == typeof t &&
            t.indexOf("nff.mp3") < 0 &&
            t.indexOf("053.mp3") < 0
          ) {
            pick = t;
            break;
          }
        }
        (main.pause(),
          (main.muted = !!keepNffThroughZone2Blink),
          (main.volume = keepNffThroughZone2Blink
            ? 0
            : "number" == typeof this.altAnnexMainAudioPrevVolume
              ? Math.max(0.65, this.altAnnexMainAudioPrevVolume)
              : 1),
          (main.src = pick),
          (main.currentTime = 0),
          main.load && main.load());
        const pr = main.play();
        (pr && pr.catch && pr.catch(function () {}),
          (this.altAnnexMainAudioDucked = !1));
      } catch (e) {}
    }
    _altAnnexZone2Cover(on) {
      let ov = document.getElementById("z4-alt-annex-zone2-cover");
      return (
        ov ||
          ((ov = document.createElement("div")),
          (ov.id = "z4-alt-annex-zone2-cover"),
          (ov.style.cssText = [
            "position:fixed",
            "inset:0",
            "z-index:2147483647",
            "pointer-events:none",
            "opacity:0",
            "transition:opacity 140ms ease",
            "background:rgba(0,0,0,0.96)",
            "will-change:opacity",
          ].join(";")),
          document.body.appendChild(ov)),
        requestAnimationFrame(function () {
          ov.style.opacity = on ? "1" : "0";
        }),
        on ||
          setTimeout(function () {
            const kill = document.getElementById("z4-alt-annex-zone2-cover");
            kill && kill.parentNode && kill.parentNode.removeChild(kill);
          }, 190),
        ov
      );
    }
    _scrubZone2FromAltAnnex() {
      const z2 = window.currentZone2;
      return (
        !!z2 &&
        ("function" == typeof z2._enterAltAnnexBathroomTurnLanding
          ? (z2._enterAltAnnexBathroomTurnLanding(),
            (window.__z4Route = !1),
            (window.__z4RouteActive = !1),
            !0)
          : ((z2.activePOV = "center"),
            (z2.pendingPOV = null),
            (z2.slideState = "idle"),
            (z2.slideOffset = 0),
            (z2.slideDir = 0),
            (z2.povSwitchTime = performance.now()),
            (z2.facing = "S"),
            (z2.hallwayYaw = Math.PI),
            (z2.hallwayYawTarget = Math.PI),
            (z2.camZ =
              "number" == typeof z2.INTERSECTION_Z
                ? z2.INTERSECTION_Z - 0.75
                : 1.65),
            (z2.intersectionReached = !0),
            (z2.seqState = "initial"),
            (z2.z4RouteActive = !1),
            (z2.z4RouteStep = 0),
            (z2.z4LeftBlinkCount = 0),
            (z2.z4TransitionStarted = !1),
            (z2.z4RouteTriggered = !1),
            (z2.route3Active = !1),
            (z2.route3Step = 0),
            (z2.readyForZone3 = !1),
            (z2.z3TransitionStarted = !1),
            (z2.z2ExitStarted = !1),
            (z2.z2ExitTime = 0),
            (z2.zone3Route = "z3"),
            (z2.__fromAltAnnexDoor = !0),
            (z2.__z4RouteDisabledUntil = performance.now() + 12e3),
            (window.__z4Route = !1),
            (window.__z4RouteActive = !1),
            (window.mx = 0),
            (window.my = 0),
            (window.z2SpaceHeld = !1),
            (window.z2TouchHeld = !1),
            !0))
      );
    }
    _returnAltAnnexToZone2() {
      if (this.altAnnexZone2Returned) return !0;
      if (
        ((this.altAnnexZone2Returned = !0),
        this._hardShiftAudioForZone2Return(),
        (window.__z4Route = !1),
        (window.__z4RouteActive = !1),
        (window.__z4AltAnnexZone2ReturnActive = !0),
        (window.__z4AltAnnexZone2ReturnBlockUntil = performance.now() + 12e3),
        (window.isEngine1Dead = !0),
        (window.isEngine4Dead = !0),
        (window.__z4LoopToken = (window.__z4LoopToken || 0) + 1),
        (window.__zone2Governor = null),
        "function" == typeof window.startZone4 &&
          !0 !== window.__z4AltAnnexStartZone4GuardInstalled &&
          ((window.__z4AltAnnexStartZone4GuardInstalled = !0),
          (window.__z4AltAnnexStartZone4Base = window.startZone4),
          (window.startZone4 = function () {
            return (
              !(
                "number" == typeof window.__z4AltAnnexZone2ReturnBlockUntil &&
                performance.now() < window.__z4AltAnnexZone2ReturnBlockUntil
              ) && window.__z4AltAnnexStartZone4Base.apply(this, arguments)
            );
          })),
        "function" != typeof window.startZone2)
      )
        return (this._altAnnexZone2Cover(!1), !1);
      try {
        window.startZone2({
          fromZ4AltAnnexDoor: !0,
          altBathroomTurn: !0,
          framedKitchenForward: !0,
        });
      } catch (e) {
        return (
          console.error("[Zone4] Alt-Annex Zone2 start failed:", e),
          this._altAnnexZone2Cover(!1),
          !1
        );
      }
      return (
        setTimeout(() => {
          try {
            (window.currentZone4 === this && (window.currentZone4 = null),
              this.destroy());
          } catch (e) {
            this.isDead = !0;
          }
        }, 80),
        setTimeout(() => {
          ((window.__z4AltAnnexZone2ReturnActive = !1),
            this._altAnnexZone2Cover(!1));
        }, 105),
        !0
      );
    }
    _beginAltAnnexZone2Return(now) {
      return (
        this.altAnnexZone2ReturnActive ||
          this.altAnnexZone2Returned ||
          ((this.altAnnexZone2ReturnActive = !0),
          (this.altAnnexZone2ReturnStart = now),
          (this.annexRoomT = 1),
          (this.annexRoomDir = 1),
          (this.annexRoomView = "path"),
          (this.turnAnimating = !1),
          (this.turnInputLatch = 0),
          (this.annexTurnInputLatch = 0),
          (window.__z4AnnexTurnRequested = 0),
          (window.__z4AltAnnexZone2ReturnActive = !0),
          setTimeout(this._returnAltAnnexToZone2.bind(this), 30)),
        !0
      );
    }
    _beginZ3BBlackHoleFromAltAnnex(now) {}
    _beginZ4BCabin(now) {
      const fromAnnexSequence = !!this.annexSequenceActive;
      ((this.phase = "z4b_cabin"),
        (this.phaseStart = now),
        (this.z4bCabinState = fromAnnexSequence ? "side_entry" : "entry"),
        (this.z4bCabinStart = now),
        (this.z4bCabinCrashStart = 0),
        (this.z4bCabinCamZ = 12),
        (this.z4bCabinCamX = fromAnnexSequence ? -1.42 : 0),
        (this.z4bCabinYaw = fromAnnexSequence ? 0.5 * -Math.PI : 0),
        (this.z4bCabinZoom = 1),
        (this.z4bCabinShake = 0),
        (this.z4bCabinFlash = 0),
        (this.z4bCabinWalking = !0),
        (this.z4bCabinFractalActive = fromAnnexSequence),
        (this.z4bStopAtCockpit = fromAnnexSequence || !!this.z4bStopAtCockpit),
        (this.cx = 0),
        (this.cy = 0),
        "number" == typeof window.mx && (window.mx = 0),
        "number" == typeof window.my && (window.my = 0));
    }
    _installZ4BIslandLogoTextureHook() {
      if (
        window.Zone4IslandBridge &&
        "function" == typeof window.Zone4IslandBridge.installLogoTextureHook
      )
        return window.Zone4IslandBridge.installLogoTextureHook(this);
    }
    _startZ4BIslandWake(now) {
      if (
        window.Zone4IslandBridge &&
        "function" == typeof window.Zone4IslandBridge.startWake
      )
        return window.Zone4IslandBridge.startWake(this, now);
      console.error("[Zone4] Zone4IslandBridge.startWake is missing");
    }
    _resetAltAnnexLapPattern() {
      ((this.totalClockwiseTravel = 0),
        (this.totalCounterClockwiseTravel = 0),
        (this.totalClockwiseLapCount = 0),
        (this.totalCounterClockwiseLapCount = 0),
        (this.altAnnexPatternStage = 0),
        (this.altAnnexCwTravel = 0),
        (this.altAnnexCcwTravel = 0),
        (this.altAnnexCwLapCount = 0),
        (this.altAnnexCcwLapCount = 0),
        (this.altAnnexClockwiseReady = !1),
        (this.altAnnexCounterClockwiseReady = !1),
        (this.altAnnexDoorOpen = !1),
        (this.altAnnexRouteActive = !1),
        (this.annexAltBasementActive = !1),
        (this.annexBasementVariant = "normal"),
        this._publishAltAnnexState());
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
        cwProgress: Math.max(
          0,
          Math.min(1, (this.altAnnexCwTravel || 0) / (2 * Math.PI)),
        ),
        ccwProgress: Math.max(
          0,
          Math.min(1, (this.altAnnexCcwTravel || 0) / (2 * Math.PI)),
        ),
        totalCW: this.totalClockwiseLapCount || 0,
        totalCCW: this.totalCounterClockwiseLapCount || 0,
        netCW: this.clockwiseLapCount || 0,
        netCCW: this.counterClockwiseLapCount || 0,
      };
    }
    _updateAltAnnexLapPattern(deltaU, now) {
      const TAU = 2 * Math.PI;
      if (!isFinite(deltaU) || Math.abs(deltaU) < 1e-6)
        this._publishAltAnnexState();
      else {
        if (
          (deltaU > 0
            ? (this.totalClockwiseTravel += deltaU)
            : (this.totalCounterClockwiseTravel += -deltaU),
          (this.totalClockwiseLapCount = Math.floor(
            this.totalClockwiseTravel / TAU,
          )),
          (this.totalCounterClockwiseLapCount = Math.floor(
            this.totalCounterClockwiseTravel / TAU,
          )),
          this.altAnnexPatternStage >= 2)
        )
          return (
            (this.altAnnexCwLapCount = 1),
            (this.altAnnexCcwLapCount = 1),
            (this.altAnnexClockwiseReady = !0),
            (this.altAnnexCounterClockwiseReady = !0),
            (this.altAnnexDoorOpen = !0),
            void this._publishAltAnnexState()
          );
        (0 === this.altAnnexPatternStage
          ? deltaU > 0
            ? ((this.altAnnexCwTravel += deltaU),
              (this.altAnnexCwLapCount = Math.floor(
                this.altAnnexCwTravel / TAU,
              )),
              this.altAnnexCwLapCount >= 1 &&
                ((this.altAnnexCwLapCount = 1),
                (this.altAnnexClockwiseReady = !0),
                (this.altAnnexPatternStage = 1),
                (this.altAnnexCcwTravel = 0),
                (this.altAnnexCcwLapCount = 0),
                (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) &&
                  (console.log(
                    "[Zone4] ALT annex: clockwise lap complete. Reverse and complete one counterclockwise lap.",
                  ),
                  (this.altAnnexLastLog = now))))
            : this.altAnnexClockwiseReady ||
              ((this.altAnnexCwTravel = 0), (this.altAnnexCwLapCount = 0))
          : 1 === this.altAnnexPatternStage &&
            ((this.altAnnexCwLapCount = 1),
            (this.altAnnexClockwiseReady = !0),
            deltaU < 0 &&
              ((this.altAnnexCcwTravel += -deltaU),
              (this.altAnnexCcwLapCount = Math.floor(
                this.altAnnexCcwTravel / TAU,
              )),
              this.altAnnexCcwLapCount >= 1 &&
                ((this.altAnnexCcwLapCount = 1),
                (this.altAnnexCounterClockwiseReady = !0),
                (this.altAnnexPatternStage = 2),
                (this.altAnnexDoorOpen = !0),
                (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) &&
                  (console.log(
                    "[Zone4] ALT annex: one clockwise + one counterclockwise complete. Annex doorway is now open.",
                  ),
                  (this.altAnnexLastLog = now))))),
          (this.altAnnexDoorOpen = !(
            !this.altAnnexClockwiseReady || !this.altAnnexCounterClockwiseReady
          )),
          this._publishAltAnnexState());
      }
    }
    _updateBlink(now) {
      const facingDjBooth =
        "annex_room" === this.phase &&
        "stage" === (this.annexRoomView || "path") &&
        !this.turnAnimating &&
        !this.annexSequenceActive;
      if (
        (facingDjBooth ||
          this.annexSequenceActive ||
          (this.annexDjBlinkCount = 0),
        now - this.lastBlinkTime > this.nextBlinkInterval &&
          ((this.blinking = !0),
          (this.blinkStart = now),
          (this.lastBlinkTime = now),
          (this.nextBlinkInterval = this.annexSequenceActive
            ? 2400 + 3200 * Math.random()
            : 4e3 + 7e3 * Math.random()),
          (this.z4ModeSeed = 1e3 * Math.random()),
          (this.z4FractalSeed = this.z4ModeSeed),
          (this.z4BlinkPeakTime = now),
          facingDjBooth &&
            ((this.annexDjBlinkCount = (this.annexDjBlinkCount || 0) + 1),
            this.annexDjBlinkCount >= 2 && this._triggerAnnexDjSequence(now))),
        (this.rBlink = 0),
        this.blinking)
      ) {
        const e = now - this.blinkStart,
          slowBlink = !!this.annexSequenceActive,
          closeMs = slowBlink ? 260 : 120,
          holdMs = slowBlink ? 190 : 100,
          openMs = slowBlink ? 360 : 120;
        e < closeMs
          ? (this.rBlink = e / closeMs)
          : e < closeMs + holdMs
            ? (this.rBlink = 1)
            : e < closeMs + holdMs + openMs
              ? (this.rBlink = 1 - (e - closeMs - holdMs) / openMs)
              : ((this.rBlink = 0), (this.blinking = !1));
      }
    }
    _updatePhase(now, dt) {
      const moving = z4SpaceHeld || z4TouchHeld;
      if (
        (this.shakeIntensity > 0
          ? !this.annexSequenceActive ||
            ("annex_room" !== this.phase &&
              "annex_exit_door" !== this.phase &&
              "z4b_cabin" !== this.phase)
            ? ((this.shakeOffsetX =
                Math.sin(0.037 * now) *
                Math.cos(0.029 * now) *
                this.shakeIntensity),
              (this.shakeOffsetY =
                Math.cos(0.031 * now) *
                Math.sin(0.043 * now) *
                this.shakeIntensity))
            : ((this.shakeOffsetX =
                Math.sin(0.0017 * now) * this.shakeIntensity * 0.42),
              (this.shakeOffsetY =
                Math.cos(0.0013 * now + 1.7) * this.shakeIntensity * 0.3))
          : ((this.shakeOffsetX = 0), (this.shakeOffsetY = 0)),
        "ascent" === this.phase)
      )
        ((this.progress = Math.min(
          1,
          (now - this.ascentStart) / this.ascentDuration,
        )),
          moving && (this.walkAngle += 0.42 * dt),
          (this.neuralIntensity = 0.7 + 1.2 * this.progress),
          this.progress >= 1 &&
            !this.phaseFogArmed &&
            ((this.phaseFogArmed = !0),
            (this.phase = "docking_shake"),
            (this.phaseStart = now),
            (this.shakeIntensity = 0.025)));
      else if ("docking_shake" === this.phase) {
        ((this.progress = 1), (this.neuralIntensity = 2));
        var elapsed = now - this.phaseStart;
        ((this.shakeIntensity = 0.025 + 0.035 * Math.min(1, elapsed / 800)),
          elapsed >= this.dockingShakeDuration &&
            ((this.phase = "fog_in"),
            (this.phaseStart = now),
            (this.shakeIntensity = 0),
            this._setFog(1, this.fogInDuration)));
      } else if ("fog_in" === this.phase)
        ((this.progress = 1),
          (this.neuralIntensity = 2),
          now - this.phaseStart >= this.fogInDuration &&
            ((this.phase = "bay"),
            (this.phaseStart = now),
            this._setFog(0, this.fogOutDuration)));
      else if ("bay" === this.phase)
        (moving && (this.walkoff = Math.min(1, this.walkoff + 0.3 * dt)),
          this.walkoff >= 1 &&
            ((this.phase = "hallway"), (this.phaseStart = now)),
          (this.neuralIntensity = 1.4 + 1.2 * this.walkoff));
      else if ("hallway" === this.phase)
        (moving && (this.hallwayT = Math.min(1, this.hallwayT + 0.28 * dt)),
          this.hallwayT >= 1 &&
            ((this.phase = "entering_ring"),
            (this.phaseStart = now),
            (this.enterRingT = 0)),
          (this.neuralIntensity = 2 + 0.3 * this.hallwayT));
      else if ("entering_ring" === this.phase)
        ((this.enterRingT = Math.min(1, this.enterRingT + 0.9 * dt)),
          this.enterRingT >= 1 &&
            ((this.phase = "ring"),
            (this.phaseStart = now),
            (this.ringView = "window"),
            (this.ringWindowSide = 1),
            (this.turnInputLatch = 0)),
          (this.neuralIntensity = 2.3));
      else if ("ring" === this.phase) {
        if (
          (this.turnAnimating &&
            now - this.turnStart >= this.turnDuration &&
            ("number" == typeof this.turnDirectionTo
              ? (this.ringDirection = this.turnDirectionTo)
              : (this.ringDirection = this.turnTo),
            this.turnViewTo && (this.ringView = this.turnViewTo),
            "number" == typeof this.turnWindowSideTo &&
              (this.ringWindowSide = this.turnWindowSideTo),
            (this.turnAnimating = !1),
            (this.turnViewTo = null),
            (this.turnDirectionTo = null),
            (this.turnWindowSideTo = null),
            (this.cx = 0),
            (this.cy = 0),
            "number" == typeof window.mx && (window.mx = 0),
            "number" == typeof window.my && (window.my = 0)),
          window.__z4TurnRequested && !this.turnAnimating)
        ) {
          const turnReq =
            "number" == typeof window.__z4TurnRequested
              ? window.__z4TurnRequested
              : 1;
          if (((window.__z4TurnRequested = !1), "window" === this.ringView)) {
            const windowSide = this.ringWindowSide || 1;
            this._startStationViewTurn(
              now,
              -turnReq * Math.PI * 0.5,
              "path",
              windowSide * turnReq,
              windowSide,
            );
          } else {
            const windowSide = this._stationWindowSideAtRingU(),
              requestedWindowSide = -(this.ringDirection || 1) * turnReq;
            windowSide && windowSide === requestedWindowSide
              ? this._startStationViewTurn(
                  now,
                  -turnReq * Math.PI * 0.5,
                  "window",
                  this.ringDirection,
                  windowSide,
                )
              : ((this.turnTo = this.ringDirection > 0 ? -1 : 1),
                (this.turnSpin = -turnReq),
                this._startStationViewTurn(
                  now,
                  this.turnSpin * Math.PI,
                  "path",
                  this.turnTo,
                  this.ringWindowSide,
                ));
          }
        }
        ((window.__z4TurnRequested = !1),
          moving &&
            !this.turnAnimating &&
            "path" === this.ringView &&
            (this.ringU =
              (this.ringU + 0.26 * dt * this.ringDirection) % (2 * Math.PI)),
          this.ringU < 0 && (this.ringU += 2 * Math.PI));
        var prevU = this.lastRingU,
          currU = this.ringU,
          deltaU = currU - prevU;
        (deltaU > Math.PI && (deltaU -= 2 * Math.PI),
          deltaU < -Math.PI && (deltaU += 2 * Math.PI),
          (this.ringTravel += Math.abs(deltaU)),
          (this.signedRingTravel += deltaU),
          (this.lapCrossings = Math.floor(
            Math.abs(this.signedRingTravel) / Math.PI,
          )),
          (this.lastRingU = currU),
          (this.clockwiseLapCount = Math.floor(
            Math.max(0, this.signedRingTravel) / (2 * Math.PI),
          )),
          (this.counterClockwiseLapCount = Math.floor(
            Math.max(0, -this.signedRingTravel) / (2 * Math.PI),
          )),
          (this.lapCount = Math.max(
            this.clockwiseLapCount,
            this.counterClockwiseLapCount,
          )),
          this._updateAltAnnexLapPattern(deltaU, now));
        var normalAnnexDoorOpen = this.counterClockwiseLapCount >= 2;
        ((this.annexDoorOpen = normalAnnexDoorOpen || this.altAnnexDoorOpen),
          this.lapCount >= 99 &&
            ((this.blackholeIntensity = 1), (this.blackholeVisible = !0)));
        var SECTION_ANGLE_LAP = (2 * Math.PI) / 16;
        if (this.annexDoorOpen && moving && "path" === this.ringView) {
          var annexU = (this.annexSection + 0.5) * SECTION_ANGLE_LAP,
            annexDist = Math.abs(this.ringU - annexU);
          (annexDist > Math.PI && (annexDist = 2 * Math.PI - annexDist),
            annexDist <= 0.5 * SECTION_ANGLE_LAP &&
              ((this.annexEntryU = annexU),
              (this.annexTargetU = annexU),
              (this.ringU = annexU),
              (this.lastRingU = annexU),
              (this.phase = "annex_turn_in"),
              (this.phaseStart = now),
              (this.annexTurnT = 0),
              (this.annexHallT = 0),
              (this.annexRoomT = 0),
              (this.annexExitT = 0),
              (this.annexRoomDir = 1),
              (this.annexRoomView = "path"),
              (this.annexTurnInputLatch = 0),
              (this.altAnnexRouteActive = !!this.altAnnexDoorOpen),
              (this.annexAltBasementActive = !!this.altAnnexRouteActive),
              (this.annexBasementVariant = this.annexAltBasementActive
                ? "alt"
                : "normal"),
              this._publishAltAnnexState(),
              console.log(
                "[Zone4] annex entry variant:",
                this.annexBasementVariant,
              ),
              (this.ringView = "path"),
              (this.turnAnimating = !1),
              (this.turnInputLatch = 0)));
        } else if (this.clockwiseLapCount >= 2) {
          var entranceU = (this.stationSection + 0.5) * SECTION_ANGLE_LAP,
            angDist = Math.abs(this.ringU - entranceU);
          (angDist > Math.PI && (angDist = 2 * Math.PI - angDist),
            angDist <= 0.5 * SECTION_ANGLE_LAP &&
              ((this.ringU = entranceU),
              (this.lastRingU = entranceU),
              (this.phase = "reverse_entering_ring"),
              (this.phaseStart = now),
              (this.enterRingT = 1)));
        }
        this.neuralIntensity = 2.2 + 0.65 * this.lapCount;
      } else if ("annex_turn_in" === this.phase)
        (moving && (this.annexTurnT = Math.min(1, this.annexTurnT + 0.95 * dt)),
          this.annexTurnT >= 1 &&
            ((this.phase = "annex_hallway"),
            (this.phaseStart = now),
            (this.annexHallT = 0),
            (this.cx = 0),
            (this.cy = 0)),
          (this.neuralIntensity = 3));
      else if ("annex_hallway" === this.phase)
        (moving && (this.annexHallT = Math.min(1, this.annexHallT + 0.17 * dt)),
          this.annexHallT >= 1 &&
            ((this.phase = "annex_room"),
            (this.phaseStart = now),
            (this.annexRoomT = 0),
            (this.annexRoomDir = 1),
            (this.annexRoomView = "path"),
            (this.annexTurnInputLatch = 0)),
          (this.neuralIntensity = 3.1));
      else if ("annex_room" === this.phase) {
        const altAnnexLocked =
            "function" == typeof this._isAltAnnexLocked &&
            this._isAltAnnexLocked(),
          altAnnexRouteNow =
            "function" == typeof this._isAltAnnexRoute &&
            this._isAltAnnexRoute();
        altAnnexLocked &&
          ((this.annexRoomView = "path"),
          (this.annexRoomDir = 1),
          (this.annexTurnInputLatch = 0),
          (this.turnInputLatch = 0),
          (window.__z4AnnexTurnRequested = 0),
          this.turnAnimating &&
            ((this.turnAnimating = !1),
            (this.turnViewTo = null),
            (this.turnDirectionTo = null),
            (this.turnWindowSideTo = null)));
        const turnReq = altAnnexLocked ? 0 : window.__z4AnnexTurnRequested || 0,
          centerZone = this.annexRoomT >= 0.34 && this.annexRoomT <= 0.72,
          farZone = this.annexRoomT >= 0.965,
          entranceZone = this.annexRoomT <= 0.025;
        if (
          (this.turnAnimating &&
            now - this.turnStart >= this.turnDuration &&
            ("annex_stage" === this.turnViewTo
              ? (this.annexRoomView = "stage")
              : "annex_path" === this.turnViewTo &&
                (this.annexRoomView = "path"),
            "number" == typeof this.turnDirectionTo &&
              (this.annexRoomDir = this.turnDirectionTo),
            (this.turnAnimating = !1),
            (this.turnViewTo = null),
            (this.turnDirectionTo = null),
            (this.turnWindowSideTo = null),
            (this.cx = 0),
            (this.cy = 0),
            (this.annexTurnInputLatch = 0),
            (window.__z4AnnexTurnRequested = 0),
            "number" == typeof window.mx && (window.mx = 0),
            "number" == typeof window.my && (window.my = 0)),
          !this.turnAnimating &&
            entranceZone &&
            (this.annexRoomDir || 1) < 0 &&
            ((this.annexRoomT = 0),
            (this.annexRoomView = "path"),
            (this.annexTurnInputLatch = 0),
            (window.__z4AnnexTurnRequested = 0),
            this._startStationViewTurn(now, Math.PI, "annex_path", 1, null)),
          turnReq && !this.turnAnimating)
        ) {
          window.__z4AnnexTurnRequested = 0;
          const dirNow = this.annexRoomDir || 1,
            stageReq = dirNow >= 0 ? -1 : 1,
            pathReq = dirNow >= 0 ? 1 : -1,
            toStageAngle = dirNow >= 0 ? 0.5 * Math.PI : 0.5 * -Math.PI,
            toPathAngle = dirNow >= 0 ? 0.5 * -Math.PI : 0.5 * Math.PI;
          ("stage" === (this.annexRoomView || "path")
            ? centerZone &&
              turnReq === pathReq &&
              this._startStationViewTurn(
                now,
                toPathAngle,
                "annex_path",
                dirNow,
                null,
              )
            : altAnnexRouteNow || !farZone || this.annexSequenceActive
              ? centerZone &&
                turnReq === stageReq &&
                this._startStationViewTurn(
                  now,
                  toStageAngle,
                  "annex_stage",
                  dirNow,
                  null,
                )
              : ((this.annexRoomT = 1),
                this._startStationViewTurn(
                  now,
                  turnReq * Math.PI,
                  "annex_path",
                  -1,
                  null,
                )),
            (this.annexTurnInputLatch = 0));
        } else
          !turnReq &&
            Math.abs(this.cx) < 0.48 &&
            ((this.annexTurnInputLatch = 0),
            (window.__z4AnnexTurnRequested = 0));
        if (
          this.annexSequenceActive &&
          !altAnnexRouteNow &&
          moving &&
          !this.turnAnimating &&
          "path" === (this.annexRoomView || "path") &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.955
        )
          return (
            (this.annexRoomT = 1),
            (this.annexExitT = 0),
            (this.phase = "annex_exit_door"),
            (this.phaseStart = now),
            void (this.neuralIntensity = 3.9)
          );
        const z4AltAnnexDoorStopT = 1;
        if (
          moving &&
          !this.turnAnimating &&
          "path" === (this.annexRoomView || "path")
        ) {
          const dir = this.annexRoomDir || 1,
            roomSpeed = altAnnexRouteNow ? 0.16 : 0.13,
            roomMaxT = altAnnexRouteNow ? z4AltAnnexDoorStopT : 1;
          this.annexRoomT = Math.max(
            0,
            Math.min(roomMaxT, this.annexRoomT + dt * roomSpeed * dir),
          );
        } else this.annexRoomT >= 1 && (this.annexRoomT = 1);
        if (
          (this.annexRoomT <= 0 && (this.annexRoomT = 0),
          altAnnexRouteNow &&
            !this.altAnnexZone2ReturnActive &&
            !this.altAnnexZone2Returned &&
            !this.turnAnimating &&
            "path" === (this.annexRoomView || "path") &&
            (this.annexRoomDir || 1) > 0 &&
            this.annexRoomT >= 0.985)
        )
          return void this._beginAltAnnexZone2Return(now);
        this.neuralIntensity = altAnnexLocked
          ? 3.55
          : this.annexSequenceActive
            ? 2.25
            : 3.25;
      } else if ("annex_exit_door" === this.phase) {
        if (
          (moving &&
            (this.annexExitT = Math.min(1, (this.annexExitT || 0) + 0.42 * dt)),
          this.annexExitT >= 1)
        )
          return ((this.annexExitT = 1), void this._beginZ4BCabin(now));
        this.neuralIntensity = 3.95;
      } else if ("z4b_cabin" === this.phase) {
        function smoothZ4B(t) {
          return (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t);
        }
        if (
          ((this.neuralIntensity = 3.45),
          (this.z4bCabinWalking = !1),
          (this.z4bCabinFlash = 0),
          "side_entry" === this.z4bCabinState)
        ) {
          var sideAge = now - this.z4bCabinStart,
            sideRaw = Math.max(0, Math.min(1, sideAge / 2550)),
            sideMoveT = smoothZ4B((sideRaw - 0.02) / 0.62),
            sideTurnT = smoothZ4B((sideRaw - 0.18) / 0.72),
            sideSettleT = smoothZ4B((sideRaw - 0.7) / 0.3);
          ((this.z4bCabinCamX = -1.42 * (1 - sideMoveT)),
            (this.z4bCabinCamZ = 12 + 0.22 * sideSettleT),
            (this.z4bCabinYaw = 0.5 * -Math.PI * (1 - sideTurnT)),
            (this.z4bCabinZoom = 0.985 + 0.015 * sideTurnT),
            (this.z4bCabinShake = 0),
            (this.z4bCabinFlash = 0),
            (this.z4bCabinWalking = sideRaw < 0.84),
            (this.neuralIntensity = 3.75 - 0.14 * sideTurnT),
            sideRaw >= 1 &&
              ((this.z4bCabinState = "side_settle"),
              (this.z4bCabinStart = now),
              (this.z4bCabinCamX = 0),
              (this.z4bCabinCamZ = 12.22),
              (this.z4bCabinYaw = 0),
              (this.z4bCabinZoom = 1),
              (this.z4bCabinWalking = !1)));
        } else if ("side_turn" === this.z4bCabinState)
          ((this.z4bCabinState = "side_settle"),
            (this.z4bCabinStart = now),
            (this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 12.22),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinZoom = 1),
            (this.z4bCabinWalking = !1));
        else if ("side_settle" === this.z4bCabinState) {
          var settleT = smoothZ4B((now - this.z4bCabinStart) / 520);
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 12.22 + 0.08 * settleT),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinZoom = 1),
            (this.z4bCabinWalking = !1),
            (this.z4bCabinShake = 0),
            (this.z4bCabinFlash = 0),
            (this.neuralIntensity = 3.48),
            settleT >= 1 &&
              ((this.z4bCabinState = "forward"),
              (this.z4bCabinStart = now),
              (this.z4bCabinCamX = 0),
              (this.z4bCabinCamZ = 12.3),
              (this.z4bCabinYaw = 0),
              (this.z4bCabinZoom = 1)));
        } else if ("entry" === this.z4bCabinState) {
          var entryT = smoothZ4B((now - this.z4bCabinStart) / 900);
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 12 + 0.25 * entryT),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinZoom = 1),
            (this.z4bCabinWalking = !0),
            entryT >= 1 &&
              ((this.z4bCabinState = "forward"),
              (this.z4bCabinStart = now),
              (this.z4bCabinCamX = 0),
              (this.z4bCabinYaw = 0),
              (this.z4bCabinZoom = 1)));
        } else if ("forward" === this.z4bCabinState)
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinYaw = 0),
            moving &&
              ((this.z4bCabinCamZ = Math.min(
                19.7,
                this.z4bCabinCamZ + 1.55 * dt,
              )),
              (this.z4bCabinWalking = !0)),
            this.z4bCabinCamZ >= 19.7 &&
              (this.z4bStopAtCockpit
                ? ((this.z4bCabinState = "hold_cockpit"),
                  (this.z4bCabinStart = now),
                  (this.z4bCabinCamZ = 19.7),
                  (this.z4bCabinCamX = 0),
                  (this.z4bCabinYaw = 0),
                  (this.z4bCabinWalking = !1),
                  (this.z4bCabinShake = 0),
                  (this.z4bCabinFlash = 0))
                : ((this.z4bCabinState = "turbulence"),
                  (this.z4bCabinStart = now),
                  (this.z4bCabinCrashStart = 0),
                  (this.z4bCabinWalking = !1))));
        else if ("hold_cockpit" === this.z4bCabinState) {
          var holdAge = now - this.z4bCabinStart;
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 19.7),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinWalking = !1),
            (this.z4bCabinShake = 0.004 + 0.006 * Math.sin(0.006 * holdAge)),
            (this.z4bCabinFlash = 0),
            (this.z4bCabinZoom = 1),
            (this.z4bCrashRedAlpha = 0),
            (this.z4bCrashBlackAlpha = 0),
            (this.neuralIntensity = 3.35),
            holdAge >= 1500 &&
              ((this.z4bCabinState = "turbulence"),
              (this.z4bCabinStart = now),
              (this.z4bCabinWalking = !1)));
        } else if ("turbulence" === this.z4bCabinState) {
          var turbAge = now - this.z4bCabinStart,
            turbT = Math.min(1, turbAge / 9200),
            turbEase = turbT * turbT * (3 - 2 * turbT);
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 19.7),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinWalking = !1),
            (this.z4bCabinShake = 0.012 + 0.23 * Math.pow(turbT, 1.85)),
            (this.z4bCabinFlash =
              turbAge > 1100 && Math.random() > 0.94 - 0.42 * turbT
                ? 0.18 + 0.7 * turbT
                : 0),
            (this.z4bCabinZoom =
              1 + 0.075 * turbEase + 0.01 * Math.sin(0.01 * turbAge)),
            (this.z4bCrashRedAlpha = 0),
            (this.z4bCrashBlackAlpha = 0),
            (this.neuralIntensity = 3.55 + 2.25 * turbEase),
            turbAge >= 9200 &&
              ((this.z4bCabinState = "crash"),
              (this.z4bCabinCrashStart = now),
              (this.z4bCabinFlash = 1),
              (this.z4bCabinShake = 0.3)));
        } else if ("crash" === this.z4bCabinState) {
          var crashAge = now - (this.z4bCabinCrashStart || now),
            redT = Math.max(0, Math.min(1, (crashAge - 650) / 2300)),
            blackT = Math.max(0, Math.min(1, (crashAge - 3300) / 2300)),
            impactT = Math.min(1, crashAge / 5600);
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 19.7),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinWalking = !1),
            (this.z4bCabinShake =
              0.25 + 0.17 * Math.sin(0.027 * crashAge) + 0.15 * impactT),
            (this.z4bCabinFlash =
              crashAge < 280
                ? 1
                : Math.max(0, 0.45 * (1 - blackT)) *
                  (Math.random() > 0.66 ? 1 : 0)),
            (this.z4bCabinZoom =
              1.1 + 0.16 * impactT + 0.02 * Math.sin(0.018 * crashAge)),
            (this.z4bCrashRedAlpha = redT * (1 - 0.35 * blackT)),
            (this.z4bCrashBlackAlpha = blackT),
            (this.neuralIntensity = 5.3),
            crashAge >= 5900 &&
              ((this.z4bCabinState = "black_hold"),
              (this.z4bCabinStart = now),
              (this.z4bCabinFlash = 0),
              (this.z4bCabinShake = 0),
              (this.z4bCrashRedAlpha = 0),
              (this.z4bCrashBlackAlpha = 1)));
        } else if ("black_hold" === this.z4bCabinState) {
          var blackAge = now - this.z4bCabinStart;
          ((this.z4bCabinCamX = 0),
            (this.z4bCabinCamZ = 19.7),
            (this.z4bCabinYaw = 0),
            (this.z4bCabinWalking = !1),
            (this.z4bCabinShake = 0),
            (this.z4bCabinFlash = 0),
            (this.z4bCabinZoom = 1),
            (this.z4bCrashRedAlpha = 0),
            (this.z4bCrashBlackAlpha = 1),
            (this.neuralIntensity = 0),
            blackAge >= 3200 && this._startZ4BIslandWake(now));
        }
      } else if ("reverse_entering_ring" === this.phase)
        ((this.enterRingT = Math.max(0, this.enterRingT - 0.7 * dt)),
          this.enterRingT <= 0 &&
            ((this.phase = "reverse_hallway"),
            (this.phaseStart = now),
            (this.hallwayT = 1)),
          (this.neuralIntensity = 2.5));
      else if ("reverse_hallway" === this.phase)
        ((this.hallwayT = Math.max(0, this.hallwayT - 0.35 * dt)),
          this.hallwayT <= 0 &&
            ((this.phase = "reverse_bay"),
            (this.phaseStart = now),
            (this.walkoff = 1)),
          (this.neuralIntensity = 2.4));
      else if ("reverse_bay" === this.phase)
        ((this.walkoff = Math.max(0, this.walkoff - 0.3 * dt)),
          this.walkoff <= 0 &&
            ((this.phase = "fog_in_descent"),
            (this.phaseStart = now),
            this._setFog(1, this.fogInDuration)),
          (this.neuralIntensity = 2.2));
      else if ("fog_in_descent" === this.phase)
        (now - this.phaseStart >= this.fogInDuration &&
          ((this.phase = "descent"),
          (this.phaseStart = now),
          (this.descentStart = now),
          (this.descentProgress = 1),
          this._setFog(0, this.fogOutDuration)),
          (this.neuralIntensity = 2));
      else if ("descent" === this.phase) {
        ((elapsed = now - this.descentStart),
          (this.descentProgress = Math.max(
            0,
            1 - elapsed / this.descentDuration,
          )),
          (this.progress = this.descentProgress),
          moving && (this.walkAngle -= 0.42 * dt));
        var descentT = 1 - this.descentProgress;
        ((this.shakeIntensity = descentT * descentT * 0.08),
          descentT >= 0.6 &&
            ((this.phase = "descent_shake"), (this.phaseStart = now)),
          (this.neuralIntensity = 2 - 0.5 * descentT));
      } else if ("descent_shake" === this.phase) {
        elapsed = now - this.phaseStart;
        var shakeT = Math.min(1, elapsed / 4e3);
        ((this.shakeIntensity = 0.05 + 0.25 * shakeT),
          (this.progress = Math.max(
            0,
            this.descentProgress - (elapsed / this.descentDuration) * 0.4,
          )),
          Math.random() < 0.05 * shakeT &&
            ((this.shakeOffsetX += 0.3 * (Math.random() - 0.5)),
            (this.shakeOffsetY += 0.3 * (Math.random() - 0.5))),
          shakeT >= 1 &&
            ((this.phase = "fall"),
            (this.phaseStart = now),
            (this.fallStart = now),
            (this.fallProgress = 0),
            (this.shakeIntensity = 0)),
          (this.neuralIntensity = 2.5 + shakeT));
      } else
        "fall" === this.phase
          ? ((this.fallProgress = Math.min(
              1,
              (now - this.fallStart) / this.fallDuration,
            )),
            this.fallProgress >= 1 &&
              ((this.phase = "impact"), (this.phaseStart = now)),
            (this.neuralIntensity = 3))
          : "impact" === this.phase &&
            (elapsed = now - this.phaseStart) > 2500 &&
            (this.destroy(),
            setTimeout(function () {
              window.location.reload();
            }, 200));
    }
    _buildAltAnnexFXProgram() {
      const prog = gl.createProgram(),
        vs = compile(
          gl.VERTEX_SHADER,
          "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv=p*0.5+0.5; gl_Position=vec4(p,0.0,1.0); }",
        ),
        fs = compile(
          gl.FRAGMENT_SHADER,
          "precision mediump float; varying vec2 v_uv; uniform vec2 u_res; uniform float u_time; uniform float u_strobe; uniform float u_fogPulse; float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);} float noise2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),u.x),mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),u.x),u.y);} float fbm(vec2 p){float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise2(p);p=p*2.07+vec2(31.7,12.4);a*=0.5;} return v;} void main(){ vec2 uv=(v_uv-0.5)*vec2(u_res.x/u_res.y,1.0); float left=1.0-smoothstep(-0.62,0.06,uv.x); float wall=1.0-smoothstep(-0.20,-0.03,uv.x); float hang=smoothstep(-0.34,0.22,uv.y)*smoothstep(0.96,0.18,uv.y); float n=fbm(uv*vec2(1.65,3.70)+vec2(u_time*0.030,-u_time*0.020)); n+=0.44*fbm(uv*vec2(5.8,2.1)+vec2(-u_time*0.018,u_time*0.040)); n+=0.18*fbm(uv*vec2(10.0,4.2)+vec2(u_time*0.012,u_time*0.016)); float fog=smoothstep(0.37,0.86,n)*left*hang; vec2 sp=uv-vec2(-0.80,0.04); float cone=smoothstep(0.88,0.06,length(sp*vec2(0.66,1.08))); float slash=smoothstep(0.22,0.0,abs(sp.y+sp.x*0.52)); float st=clamp(max(cone,slash*left)*wall*u_strobe,0.0,1.0); vec3 fogCol=mix(vec3(0.36,0.025,0.018),vec3(0.68,0.40,0.32),smoothstep(0.62,1.0,n)); vec3 col=fogCol*fog*(0.86+u_fogPulse*0.58)+vec3(1.0,0.94,0.76)*st*2.2; float a=clamp(fog*(0.20+u_fogPulse*0.10)+st*0.40,0.0,0.72); gl_FragColor=vec4(col,a); }",
        );
      return vs && fs
        ? (gl.attachShader(prog, vs),
          gl.attachShader(prog, fs),
          gl.linkProgram(prog),
          gl.getProgramParameter(prog, gl.LINK_STATUS)
            ? {
                prog: prog,
                p: gl.getAttribLocation(prog, "p"),
                res: gl.getUniformLocation(prog, "u_res"),
                time: gl.getUniformLocation(prog, "u_time"),
                strobe: gl.getUniformLocation(prog, "u_strobe"),
                fogPulse: gl.getUniformLocation(prog, "u_fogPulse"),
              }
            : (console.error(
                "[Zone4] Alt annex FX link error:",
                gl.getProgramInfoLog(prog),
              ),
              gl.deleteProgram(prog),
              null))
        : null;
    }
    _drawOverlay(r, g, b, a) {
      !this.overlayProg ||
        a <= 0.001 ||
        (gl.useProgram(this.overlayProg.prog),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri),
        gl.enableVertexAttribArray(this.overlayProg.p),
        gl.vertexAttribPointer(this.overlayProg.p, 2, gl.FLOAT, !1, 0, 0),
        gl.enable(gl.BLEND),
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
        gl.uniform4f(this.overlayProg.col, r, g, b, a),
        gl.drawArrays(gl.TRIANGLES, 0, 3),
        gl.disable(gl.BLEND));
    }
    _drawAltAnnexFX(now) {
      this._altAnnexCleanView &&
        (("annex_room" !== this.phase && "annex_exit_door" !== this.phase) ||
          this._drawOverlay(0, 0, 0, 0.035));
    }
    _renderElevator(now) {
      if (!this.elevatorProg) return;
      gl.disable(gl.DEPTH_TEST);
      for (var ai = 0; ai < 8; ai++) gl.disableVertexAttribArray(ai);
      (gl.useProgram(this.elevatorProg),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri));
      const pLoc = gl.getAttribLocation(this.elevatorProg, "p");
      (gl.enableVertexAttribArray(pLoc),
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, !1, 0, 0),
        gl.uniform2f(
          gl.getUniformLocation(this.elevatorProg, "u_resolution"),
          canvas.width,
          canvas.height,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.elevatorProg, "u_time"),
          0.001 * now,
        ),
        gl.uniform2f(
          gl.getUniformLocation(this.elevatorProg, "u_mouse"),
          this.cx + this.shakeOffsetX,
          this.cy + this.shakeOffsetY,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.elevatorProg, "u_progress"),
          this.progress,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.elevatorProg, "u_walk_angle"),
          this.walkAngle,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.elevatorProg, "u_blink"),
          this.rBlink,
        ),
        gl.drawArrays(gl.TRIANGLES, 0, 3));
    }
    _stationFrame(angle) {
      const radial = this._normalize([Math.cos(angle), 0, Math.sin(angle)]),
        tangent = this._normalize([-Math.sin(angle), 0, Math.cos(angle)]);
      return {
        center: [15.5 * Math.cos(angle), 0, 15.5 * Math.sin(angle)],
        radial: radial,
        tangent: tangent,
        up: [0, 1, 0],
      };
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
      const a = this._normalize(axis),
        c = Math.cos(ang),
        s = Math.sin(ang),
        dot = v[0] * a[0] + v[1] * a[1] + v[2] * a[2];
      return [
        v[0] * c + (a[1] * v[2] - a[2] * v[1]) * s + a[0] * dot * (1 - c),
        v[1] * c + (a[2] * v[0] - a[0] * v[2]) * s + a[1] * dot * (1 - c),
        v[2] * c + (a[0] * v[1] - a[1] * v[0]) * s + a[2] * dot * (1 - c),
      ];
    }
    _perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
      return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) * nf,
        -1,
        0,
        0,
        2 * far * near * nf,
        0,
      ]);
    }
    _lookAt(eye, center, up) {
      const z = this._normalize(this._sub(eye, center)),
        x = this._normalize(this._cross(up, z)),
        y = this._cross(z, x);
      return new Float32Array([
        x[0],
        y[0],
        z[0],
        0,
        x[1],
        y[1],
        z[1],
        0,
        x[2],
        y[2],
        z[2],
        0,
        -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
        -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
        -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
        1,
      ]);
    }
    _angleDistance(a, b) {
      var d = Math.abs(a - b);
      return (d > Math.PI && (d = 2 * Math.PI - d), d);
    }
    _stationWindowSideAtRingU() {
      const sectionAngle = (2 * Math.PI) / 16,
        outerU = (this.stationSection + 0.5) * sectionAngle,
        innerU = (outerU + Math.PI) % (2 * Math.PI),
        groupHalfWidth = 1.5 * sectionAngle;
      return this._angleDistance(this.ringU, outerU) <= groupHalfWidth
        ? 1
        : this._angleDistance(this.ringU, innerU) <= groupHalfWidth
          ? -1
          : 0;
    }
    _startStationViewTurn(now, angle, viewTo, directionTo, windowSideTo) {
      return (
        !this.turnAnimating &&
        ((this.turnAnimating = !0),
        (this.turnStart = now),
        (this.turnAngle = angle),
        (this.turnViewTo = viewTo || null),
        (this.turnDirectionTo =
          "number" == typeof directionTo ? directionTo : null),
        (this.turnWindowSideTo =
          "number" == typeof windowSideTo ? windowSideTo : null),
        (this.turnLookX = this.cx),
        (this.turnLookY = this.cy),
        !0)
      );
    }
    _isAltAnnexRoute() {
      return !(
        !this.annexAltBasementActive &&
        "alt" !== this.annexBasementVariant &&
        !this.altAnnexRouteActive
      );
    }
    _isAltAnnexLocked() {
      return !(
        (!this.annexAltBasementActive &&
          "alt" !== this.annexBasementVariant &&
          !this.altAnnexRouteActive) ||
        ("annex_hallway" !== this.phase &&
          "annex_room" !== this.phase &&
          "annex_exit_door" !== this.phase)
      );
    }
    _checkStationTurnThreshold(now) {
      // Drag/mouselook no longer drives station or annex-room turns — those
      // are arrow-key only now (engine4 keydown handler sets
      // window.__z4TurnRequested / __z4AnnexTurnRequested directly, and the
      // ring/annex phase code in _updatePhase consumes them). We only clear
      // the latch fields when a turn animation completes; do NOT clear the
      // pending request from cx position or fresh arrow presses get clobbered.
      if (this.turnAnimating) return;
      if (!window.__z4TurnRequested) this.turnInputLatch = 0;
      if (!window.__z4AnnexTurnRequested) this.annexTurnInputLatch = 0;
    }
    _ensureAnnexTripOverlay() {
      if (this.annexTripOverlay) return;
      const root = document.createElement("div");
      ((root.id = "z4-annex-trip-overlay"),
        (root.style.cssText =
          "position:fixed;inset:0;pointer-events:none;z-index:99997;opacity:0;transition:opacity 80ms linear;overflow:hidden;"));
      const blur = document.createElement("div");
      blur.style.cssText =
        "position:absolute;inset:-5%;pointer-events:none;-webkit-backdrop-filter:blur(0px) saturate(1.0) contrast(1.0);backdrop-filter:blur(0px) saturate(1.0) contrast(1.0);-webkit-mask-image:radial-gradient(circle at 50% 50%, transparent 0%, transparent 32%, rgba(0,0,0,0.65) 57%, black 100%);mask-image:radial-gradient(circle at 50% 50%, transparent 0%, transparent 32%, rgba(0,0,0,0.65) 57%, black 100%);";
      const red = document.createElement("div");
      red.style.cssText =
        "position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;background:radial-gradient(circle at 50% 44%, rgba(255,24,0,0.08) 0%, rgba(210,0,0,0.18) 42%, rgba(95,0,0,0.34) 100%);";
      const dark = document.createElement("div");
      ((dark.style.cssText =
        "position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.12) 42%, rgba(0,0,0,0.82) 100%);"),
        root.appendChild(blur),
        root.appendChild(red),
        root.appendChild(dark),
        document.body.appendChild(root),
        (this.annexTripOverlay = root),
        (this.annexTripBlurOverlay = blur),
        (this.annexTripRedOverlay = red),
        (this.annexTripDarkOverlay = dark));
    }
    _updateAnnexTripOverlay(now, active) {
      this._ensureAnnexTripOverlay();
      const last = this.annexTripFXLast || now,
        dt = Math.max(0, Math.min(0.1, 0.001 * (now - last)));
      this.annexTripFXLast = now;
      const target = active ? 1 : 0,
        speed = active ? 10 : 2.6;
      this.annexTripFX +=
        (target - (this.annexTripFX || 0)) * Math.min(1, dt * speed);
      const fx = Math.max(0, Math.min(1, this.annexTripFX || 0));
      if (!this.annexTripOverlay) return;
      const beatMs = 6e4 / 140,
        phase = active
          ? ((((now - (this.annexSequenceStart || now)) % beatMs) + beatMs) %
              beatMs) /
            beatMs
          : 1,
        flash = active ? Math.pow(Math.max(0, 1 - phase / 0.18), 2.1) : 0,
        blackout = active ? Math.pow(1 - flash, 0.12) : 0,
        wob = active
          ? 0.5 +
            0.5 *
              Math.sin(0.001 * now * 0.13 + 0.75 * Math.sin(0.001 * now * 0.07))
          : 0;
      ((this.annexTripOverlay.style.opacity = String(
        Math.max(0, Math.min(0.22, fx * (0.08 + 0.12 * blackout))),
      )),
        (this.annexTripBlurOverlay.style.webkitBackdropFilter =
          "blur(" +
          (fx * (0.45 + 0.75 * wob)).toFixed(2) +
          "px) saturate(" +
          (1 + 0.22 * fx).toFixed(2) +
          ") contrast(" +
          (1 + 0.06 * fx).toFixed(2) +
          ")"),
        (this.annexTripBlurOverlay.style.backdropFilter =
          this.annexTripBlurOverlay.style.webkitBackdropFilter),
        (this.annexTripRedOverlay.style.opacity = String(
          Math.max(0, Math.min(0.18, fx * (0.02 + 0.02 * wob + 0.14 * flash))),
        )),
        (this.annexTripDarkOverlay.style.opacity = String(
          Math.max(
            0,
            Math.min(0.26, fx * (0.015 + 0.18 * blackout - 0.06 * flash)),
          ),
        )));
    }
    _stationBayPath(t) {
      function smooth(a, b, x) {
        var v = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return v * v * (3 - 2 * v);
      }
      function point(u) {
        return {
          x: 5.5 * u - 13.5,
          z: smooth(0.02, 0.28, u) * (1 - smooth(0.7, 0.96, u)) * 1.08,
        };
      }
      var p = point((t = Math.max(0, Math.min(1, t)))),
        a = point(Math.max(0, t - 0.015)),
        b = point(Math.min(1, t + 0.015));
      return ((p.dx = b.x - a.x), (p.dz = b.z - a.z), p);
    }
    _computeStationCamera() {
      const angle = this.ringU,
        frame = this._stationFrame(angle),
        SECTION_ANGLE = (2 * Math.PI) / 16;
      let eye, baseForward;
      if (
        "bay" === this.phase ||
        "reverse_bay" === this.phase ||
        "fog_in_descent" === this.phase
      ) {
        const y = -0.02,
          bayPath = this._stationBayPath(this.walkoff);
        eye = this._add(
          frame.center,
          this._add(
            this._add(
              this._mul(frame.radial, bayPath.x),
              this._mul(frame.tangent, bayPath.z),
            ),
            [0, y, 0],
          ),
        );
        const pathForward = this._normalize(
          this._add(
            this._mul(frame.radial, bayPath.dx || 1),
            this._mul(frame.tangent, bayPath.dz || 0),
          ),
        );
        baseForward =
          "reverse_bay" === this.phase || "fog_in_descent" === this.phase
            ? this._mul(pathForward, -1)
            : pathForward;
      } else if ("hallway" === this.phase || "reverse_hallway" === this.phase) {
        const hallStart = -8,
          y = -0.02,
          walkX = hallStart + (-2.33 - hallStart) * this.hallwayT;
        ((eye = this._add(
          frame.center,
          this._add(this._mul(frame.radial, walkX), [0, y, 0]),
        )),
          (baseForward =
            "reverse_hallway" === this.phase
              ? this._mul(frame.radial, -1)
              : frame.radial.slice()));
      } else if (
        "entering_ring" === this.phase ||
        "reverse_entering_ring" === this.phase
      ) {
        var t = this.enterRingT;
        t = t * t * (3 - 2 * t);
        var hallEye = this._add(
            frame.center,
            this._add(this._mul(frame.radial, -2.33), [0, -0.02, 0]),
          ),
          ringEye = this._add(frame.center, [0, -0.02, 0]);
        if (
          ((eye = this._mix3(hallEye, ringEye, t)),
          "reverse_entering_ring" === this.phase)
        ) {
          var negRadial = this._mul(frame.radial, -1),
            ringFwd2 = this._mul(
              frame.tangent,
              "number" == typeof this.ringDirection ? this.ringDirection : 1,
            );
          baseForward = this._normalize(this._mix3(negRadial, ringFwd2, t));
        } else baseForward = frame.radial.slice();
      } else if (
        "annex_turn_in" === this.phase ||
        "annex_hallway" === this.phase ||
        "annex_room" === this.phase ||
        "annex_exit_door" === this.phase
      ) {
        const annexAngle = (this.annexSection + 0.5) * SECTION_ANGLE,
          entryAngle =
            "number" == typeof this.annexEntryU ? this.annexEntryU : annexAngle,
          targetAngle =
            "number" == typeof this.annexTargetU
              ? this.annexTargetU
              : annexAngle;
        let activeFrame = this._stationFrame(annexAngle);
        const hallEntryX = 2.7,
          hallEndX = 7.55,
          stairEndX = 15.35,
          roomEndX = 23.08,
          annexDrop = 3.8,
          altAnnexLocked =
            "function" == typeof this._isAltAnnexLocked &&
            this._isAltAnnexLocked(),
          altAnnexRouteNow =
            "function" == typeof this._isAltAnnexRoute &&
            this._isAltAnnexRoute();
        let localX = 0,
          localY = -0.02,
          localZ = 0;
        function smooth(t) {
          return (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t);
        }
        function mixAngle(a, b, t) {
          let d = b - a;
          return (
            d > Math.PI && (d -= 2 * Math.PI),
            d < -Math.PI && (d += 2 * Math.PI),
            a + d * t
          );
        }
        if ("annex_turn_in" === this.phase) {
          const rawTurnT = Math.max(0, Math.min(1, this.annexTurnT)),
            yawT = smooth(rawTurnT / 0.46),
            moveT = smooth((rawTurnT - 0.18) / 0.82);
          ((activeFrame = this._stationFrame(
            mixAngle(entryAngle, targetAngle, yawT),
          )),
            (localX = hallEntryX * moveT),
            (localZ = 0));
          const pathForward = this._mul(
            activeFrame.tangent,
            this.ringDirection || -1,
          );
          baseForward = this._normalize(
            this._mix3(pathForward, activeFrame.radial, yawT),
          );
        } else if ("annex_hallway" === this.phase) {
          const rawT = Math.max(0, Math.min(1, this.annexHallT));
          if (rawT < 0.38)
            ((localX =
              hallEntryX + (hallEndX - hallEntryX) * smooth(rawT / 0.38)),
              (localY = -0.02));
          else {
            let stairT = smooth((rawT - 0.38) / 0.62);
            ((localX = hallEndX + (stairEndX - hallEndX) * stairT),
              (localY = -0.02 - annexDrop * stairT),
              altAnnexLocked && (localZ = 0));
          }
          baseForward = activeFrame.radial.slice();
        } else if ("annex_room" === this.phase) {
          let roomT = smooth(this.annexRoomT);
          ((localX = stairEndX + (roomEndX - stairEndX) * roomT),
            (localY = -0.02 - annexDrop),
            altAnnexLocked
              ? ((localZ = 0), (baseForward = activeFrame.radial.slice()))
              : ((localZ = altAnnexRouteNow
                  ? 0
                  : 0.18 * Math.sin(roomT * Math.PI)),
                (baseForward =
                  "stage" === (this.annexRoomView || "path")
                    ? this._mul(activeFrame.tangent, -1)
                    : this._mul(activeFrame.radial, this.annexRoomDir || 1))));
        } else
          ((localX = roomEndX + 1.72 * smooth(this.annexExitT)),
            (localY = -0.02 - annexDrop),
            (localZ = 0),
            (baseForward = activeFrame.radial.slice()));
        eye = this._add(
          activeFrame.center,
          this._add(
            this._add(
              this._mul(activeFrame.radial, localX),
              this._mul(activeFrame.tangent, localZ),
            ),
            [0, localY, 0],
          ),
        );
      } else {
        eye = this._add(frame.center, [0, -0.02, 0]);
        var dir =
          "number" == typeof this.ringDirection ? this.ringDirection : 1;
        baseForward =
          "window" === this.ringView
            ? this._mul(frame.radial, this.ringWindowSide || 1)
            : this._mul(frame.tangent, dir);
      }
      let lookX = this.cx,
        lookY = this.cy,
        fwd = baseForward.slice();
      if (
        ("function" == typeof this._isAltAnnexLocked &&
          this._isAltAnnexLocked() &&
          ((lookX = Math.max(-0.24, Math.min(0.24, lookX))),
          (lookY = Math.max(-0.15, Math.min(0.15, lookY)))),
        this.turnAnimating)
      ) {
        const turnElapsed = this.lastRenderTime - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        ((turnT = turnT * turnT * (3 - 2 * turnT)),
          (fwd = this._rotateAroundAxis(
            fwd,
            [0, 1, 0],
            (this.turnAngle || Math.PI) * turnT,
          )),
          (lookX = this.turnLookX * (1 - turnT)),
          (lookY = this.turnLookY * (1 - turnT)));
      }
      if ("annex_turn_in" === this.phase) {
        const rawT = Math.max(0, Math.min(1, this.annexTurnT || 0)),
          lookFade = 1 - rawT * rawT * (3 - 2 * rawT);
        ((lookX *= lookFade), (lookY *= lookFade));
      }
      // In bay/hallway and the auto-motion transition phases between hallway
      // and ring, any residual lookX/lookY from a prior mouse position reads
      // as a "stuck drag-turn" — the camera path is on rails, so leftover
      // mouselook just rotates the view weirdly. Force zero for these phases.
      if (
        "bay" === this.phase ||
        "hallway" === this.phase ||
        "entering_ring" === this.phase ||
        "reverse_entering_ring" === this.phase ||
        "reverse_hallway" === this.phase ||
        "reverse_bay" === this.phase ||
        "fog_in_descent" === this.phase ||
        "ascent" === this.phase ||
        "descent" === this.phase ||
        "docking_shake" === this.phase ||
        "descent_shake" === this.phase ||
        "fog_in" === this.phase ||
        "fall" === this.phase
      ) {
        ((lookX = 0), (lookY = 0));
      }
      fwd = this._rotateAroundAxis(fwd, [0, 1, 0], 1 * -lookX);
      let right = this._normalize(this._cross(fwd, [0, 1, 0]));
      const pitchReach = "ring" === this.phase ? 0.95 : 0.6;
      ((fwd = this._rotateAroundAxis(fwd, right, lookY * pitchReach)),
        (right = this._normalize(this._cross(fwd, [0, 1, 0]))));
      let up = this._normalize(this._cross(right, fwd));
      const moveHeld = z4SpaceHeld || z4TouchHeld;
      let moveAmp = 0;
      if (
        ("bay" === this.phase ||
        "hallway" === this.phase ||
        ("ring" === this.phase && "path" === this.ringView)
          ? (moveAmp = moveHeld ? 1 : 0)
          : "reverse_bay" === this.phase ||
              "reverse_hallway" === this.phase ||
              "entering_ring" === this.phase ||
              "reverse_entering_ring" === this.phase ||
              "fog_in_descent" === this.phase
            ? (moveAmp = 0.55)
            : ("annex_turn_in" !== this.phase &&
                "annex_hallway" !== this.phase &&
                "annex_room" !== this.phase &&
                "annex_exit_door" !== this.phase) ||
              (moveAmp =
                !moveHeld ||
                ("annex_room" === this.phase &&
                  "path" !== (this.annexRoomView || "path"))
                  ? 0
                  : 0.55),
        this.turnAnimating && (moveAmp = 0),
        moveAmp > 0.001)
      ) {
        const moveTime = 0.001 * this.lastRenderTime,
          stride = "ring" === this.phase ? 4.4 : 5.2,
          bob = Math.sin(moveTime * stride),
          sway = Math.cos(moveTime * stride * 2);
        ((eye = this._add(eye, this._mul(up, 0.006 * sway * moveAmp))),
          (eye = this._add(eye, this._mul(right, 0.0035 * bob * moveAmp))),
          (eye = this._add(
            eye,
            this._mul(fwd, (0.01 * sway + 0.004) * moveAmp),
          )),
          (right = this._normalize(
            this._rotateAroundAxis(right, fwd, 0.01 * bob * moveAmp),
          )),
          (up = this._normalize(this._cross(right, fwd))));
      }
      if (
        (this.shakeIntensity > 0 &&
          ((eye = this._add(eye, this._mul(right, this.shakeOffsetX))),
          (eye = this._add(eye, this._mul(up, this.shakeOffsetY)))),
        this.annexSequenceActive &&
          ("annex_room" === this.phase ||
            "annex_exit_door" === this.phase ||
            "z4b_cabin" === this.phase))
      ) {
        const tripTime = 0.001 * this.lastRenderTime,
          wooze =
            1 *
            (0.78 +
              0.22 *
                Math.sin(0.13 * tripTime + 0.85 * Math.sin(0.07 * tripTime))) *
            0.92,
          yaw =
            (0.018 * Math.sin(0.16 * tripTime) +
              0.01 * Math.sin(0.07 * tripTime + 1.9)) *
            wooze,
          pitch =
            (0.01 * Math.sin(0.12 * tripTime + 1.8) +
              0.006 * Math.sin(0.055 * tripTime)) *
            wooze,
          roll = 0.016 * Math.sin(0.1 * tripTime + 0.7) * wooze;
        ((fwd = this._rotateAroundAxis(fwd, [0, 1, 0], yaw)),
          (right = this._normalize(this._cross(fwd, [0, 1, 0]))),
          (fwd = this._rotateAroundAxis(fwd, right, pitch)),
          (right = this._normalize(this._cross(fwd, [0, 1, 0]))),
          (up = this._normalize(this._cross(right, fwd))),
          (right = this._normalize(this._rotateAroundAxis(right, fwd, roll))),
          (up = this._normalize(this._cross(right, fwd))),
          (eye = this._add(
            eye,
            this._mul(right, 0.013 * Math.sin(0.11 * tripTime) * wooze),
          )),
          (eye = this._add(
            eye,
            this._mul(up, 0.008 * Math.sin(0.09 * tripTime + 2.4) * wooze),
          )));
      }
      return { eye: eye, forward: this._normalize(fwd), right: right, up: up };
    }
    _bindStationMesh(mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      const aPos = gl.getAttribLocation(this.stationMeshProg, "a_pos"),
        aNor = gl.getAttribLocation(this.stationMeshProg, "a_nor"),
        aUv = gl.getAttribLocation(this.stationMeshProg, "a_uv");
      (gl.enableVertexAttribArray(aPos),
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, !1, 32, 0),
        gl.enableVertexAttribArray(aNor),
        gl.vertexAttribPointer(aNor, 3, gl.FLOAT, !1, 32, 12),
        gl.enableVertexAttribArray(aUv),
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, !1, 32, 24),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(gl.TEXTURE_2D, mesh.tex),
        gl.uniform1i(gl.getUniformLocation(this.stationMeshProg, "u_tex"), 0));
      let z4MeshTexMix = mesh.texMix,
        z4MeshFlatCol = mesh.flatCol;
      if (mesh.backWallBathroomClub) {
        const z4StopT = 0.895;
        let z4BathroomApproach = 0;
        "annex_room" === this.phase &&
          ((z4BathroomApproach = Math.max(
            0,
            Math.min(1, ((this.annexRoomT || 0) - 0.66) / (z4StopT - 0.66)),
          )),
          (z4BathroomApproach =
            z4BathroomApproach *
            z4BathroomApproach *
            (3 - 2 * z4BathroomApproach)));
        const z4Bright = 1 + 1.15 * z4BathroomApproach;
        ((z4MeshFlatCol = [z4Bright, z4Bright, z4Bright]),
          (z4MeshTexMix = Math.max(
            0.7,
            Math.min(1, 1 - 0.2 * z4BathroomApproach),
          )));
      }
      (gl.uniform1f(
        gl.getUniformLocation(this.stationMeshProg, "u_texMix"),
        z4MeshTexMix,
      ),
        gl.uniform1f(
          gl.getUniformLocation(this.stationMeshProg, "u_useTexAlpha"),
          mesh.useTexAlpha || mesh.blend ? 1 : 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.stationMeshProg, "u_tileTex"),
          mesh.tileTex ? 1 : 0,
        ),
        gl.uniform3f(
          gl.getUniformLocation(this.stationMeshProg, "u_flatCol"),
          z4MeshFlatCol[0],
          z4MeshFlatCol[1],
          z4MeshFlatCol[2],
        ));
      const crowdDanceOn = !(
          !this.annexSequenceActive ||
          !mesh.annexCrowd2 ||
          ("annex_room" !== this.phase && "annex_exit_door" !== this.phase)
        ),
        crowdDanceLoc = gl.getUniformLocation(
          this.stationMeshProg,
          "u_crowdDance",
        );
      null !== crowdDanceLoc &&
        gl.uniform1f(crowdDanceLoc, crowdDanceOn ? mesh.crowdDanceAmp || 1 : 0);
      const crowdDanceSeedLoc = gl.getUniformLocation(
        this.stationMeshProg,
        "u_crowdDanceSeed",
      );
      null !== crowdDanceSeedLoc &&
        gl.uniform1f(crowdDanceSeedLoc, mesh.crowdDanceSeed || 0);
      const meshTimeLoc = gl.getUniformLocation(this.stationMeshProg, "u_time");
      (null !== meshTimeLoc &&
        gl.uniform1f(meshTimeLoc, 0.001 * this.lastRenderTime),
        gl.uniform2f(
          gl.getUniformLocation(this.stationMeshProg, "u_screen"),
          canvas.width,
          canvas.height,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.stationMeshProg, "u_screenSample"),
          mesh.screenSample ? 1 : 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.stationMeshProg, "u_greenKey"),
          mesh.greenKey ? 1 : 0,
        ));
      const annexLightingLoc = gl.getUniformLocation(
        this.stationMeshProg,
        "u_annexLighting",
      );
      null !== annexLightingLoc &&
        gl.uniform1f(annexLightingLoc, this._annexLightingActive ? 1 : 0);
      const annexStrobeLoc = gl.getUniformLocation(
        this.stationMeshProg,
        "u_annexStrobe",
      );
      null !== annexStrobeLoc &&
        gl.uniform1f(annexStrobeLoc, this._annexStrobe || 0);
      const annexExitGlowLoc = gl.getUniformLocation(
        this.stationMeshProg,
        "u_annexExitGlow",
      );
      null !== annexExitGlowLoc &&
        gl.uniform1f(annexExitGlowLoc, this._annexExitGlow || 0);
      const annexExitLight = this.annexExitLightWorld || [0, 0, 0],
        annexExitLightLoc = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexExitLight",
        );
      null !== annexExitLightLoc &&
        gl.uniform3f(
          annexExitLightLoc,
          annexExitLight[0],
          annexExitLight[1],
          annexExitLight[2],
        );
      const annexLights = this.annexLightWorld || [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        annexLight0 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLight0",
        ),
        annexLight1 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLight1",
        ),
        annexLight2 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLight2",
        );
      (null !== annexLight0 &&
        gl.uniform3f(
          annexLight0,
          annexLights[0][0],
          annexLights[0][1],
          annexLights[0][2],
        ),
        null !== annexLight1 &&
          gl.uniform3f(
            annexLight1,
            annexLights[1][0],
            annexLights[1][1],
            annexLights[1][2],
          ),
        null !== annexLight2 &&
          gl.uniform3f(
            annexLight2,
            annexLights[2][0],
            annexLights[2][1],
            annexLights[2][2],
          ));
      const annexLightCols = this.annexLightColorWorld || [
          [0.62, 0.72, 0.88],
          [1.3, 0.06, 0.03],
          [1.3, 0.06, 0.03],
        ],
        annexLightCol0 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLightCol0",
        ),
        annexLightCol1 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLightCol1",
        ),
        annexLightCol2 = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexLightCol2",
        );
      (null !== annexLightCol0 &&
        gl.uniform3f(
          annexLightCol0,
          annexLightCols[0][0],
          annexLightCols[0][1],
          annexLightCols[0][2],
        ),
        null !== annexLightCol1 &&
          gl.uniform3f(
            annexLightCol1,
            annexLightCols[1][0],
            annexLightCols[1][1],
            annexLightCols[1][2],
          ),
        null !== annexLightCol2 &&
          gl.uniform3f(
            annexLightCol2,
            annexLightCols[2][0],
            annexLightCols[2][1],
            annexLightCols[2][2],
          ));
      const annexTripRedActive = !!(
          this.annexSequenceActive && (this._annexRedWash || 0) > 0
        ),
        redStageActive = !!(
          (this._altAnnexCleanView && this.altAnnexStageRedLightWorld) ||
          annexTripRedActive
        ),
        redStageLight = annexTripRedActive
          ? this.annexLightWorld && this.annexLightWorld[1]
            ? this.annexLightWorld[1]
            : this.annexExitLightWorld || [999, 999, 999]
          : redStageActive
            ? this.altAnnexStageRedLightWorld
            : [999, 999, 999],
        annexStageRedLight = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexStageRedLight",
        ),
        annexStageRedGlow = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexStageRedGlow",
        );
      (null !== annexStageRedLight &&
        gl.uniform3f(
          annexStageRedLight,
          redStageLight[0],
          redStageLight[1],
          redStageLight[2],
        ),
        null !== annexStageRedGlow &&
          gl.uniform1f(
            annexStageRedGlow,
            annexTripRedActive
              ? this._annexRedGlow || 0
              : redStageActive
                ? 0.62
                : 0,
          ));
      const whiteStageLight = annexTripRedActive
          ? redStageLight
          : this.altAnnexStageWhiteLightWorld ||
            this.altAnnexStageRedLightWorld || [999, 999, 999],
        annexStageWhiteLight = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexStageWhiteLight",
        ),
        annexStageWhiteStrobe = gl.getUniformLocation(
          this.stationMeshProg,
          "u_annexStageWhiteStrobe",
        );
      (null !== annexStageWhiteLight &&
        gl.uniform3f(
          annexStageWhiteLight,
          whiteStageLight[0],
          whiteStageLight[1],
          whiteStageLight[2],
        ),
        null !== annexStageWhiteStrobe &&
          gl.uniform1f(
            annexStageWhiteStrobe,
            Math.max(
              this._altAnnexWhiteStrobe || 0,
              this._annexWhiteStrobe || 0,
            ),
          ));
    }
    _ensureMode4VoidTarget() {
      const w = canvas.width,
        h = canvas.height;
      return (
        this.z4bVoidFBO || (this.z4bVoidFBO = gl.createFramebuffer()),
        this.z4bVoidTexture ||
          ((this.z4bVoidTexture = gl.createTexture()),
          gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)),
        (this.z4bVoidWidth === w && this.z4bVoidHeight === h) ||
          ((this.z4bVoidWidth = w),
          (this.z4bVoidHeight = h),
          gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture),
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            w,
            h,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          )),
        !0
      );
    }
    _renderMode4VoidFBO(now) {
      if (!this.z4bVoidMode)
        try {
          "undefined" != typeof ActiveMode &&
            ((this.z4bVoidMode = new ActiveMode(5)),
            (this.z4bVoidMaskTex =
              this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0)),
            (this.z4bVoidMode.maskTex = this.z4bVoidMaskTex));
        } catch (e) {
          this.z4bVoidMode = null;
        }
      if (!this.z4bVoidMode) return !1;
      if (!this._ensureMode4VoidTarget()) return !1;
      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING),
        prevViewport = gl.getParameter(gl.VIEWPORT);
      (gl.bindFramebuffer(gl.FRAMEBUFFER, this.z4bVoidFBO),
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          this.z4bVoidTexture,
          0,
        ),
        gl.viewport(0, 0, this.z4bVoidWidth, this.z4bVoidHeight),
        gl.disable(gl.DEPTH_TEST),
        gl.disable(gl.BLEND),
        gl.clearColor(0, 0, 0, 1),
        gl.clear(gl.COLOR_BUFFER_BIT));
      try {
        ((this.z4bVoidMode.maskTex =
          this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0)),
          this.z4bVoidMode.render(now, 0, 0, 0, 0, 0, 0, 1, 0));
      } catch (e) {
        (gl.clearColor(0, 0, 0, 1), gl.clear(gl.COLOR_BUFFER_BIT));
      }
      return (
        gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO),
        gl.viewport(
          prevViewport[0],
          prevViewport[1],
          prevViewport[2],
          prevViewport[3],
        ),
        !0
      );
    }
    _ensureCabinPortalTarget() {
      const w = canvas.width,
        h = canvas.height;
      return (
        this.cabinPortalFBO || (this.cabinPortalFBO = gl.createFramebuffer()),
        this.cabinPortalTexture ||
          ((this.cabinPortalTexture = gl.createTexture()),
          gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)),
        (this.cabinPortalWidth === w && this.cabinPortalHeight === h) ||
          ((this.cabinPortalWidth = w),
          (this.cabinPortalHeight = h),
          gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture),
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            w,
            h,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          )),
        !0
      );
    }
    _renderCabinPortalFBO(now) {
      if (!this._ensureZ4BCabinProgram()) return !1;
      if (!this._ensureCabinPortalTarget()) return !1;
      this._renderMode4VoidFBO(now);
      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING),
        prevViewport = gl.getParameter(gl.VIEWPORT);
      (gl.bindFramebuffer(gl.FRAMEBUFFER, this.cabinPortalFBO),
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          this.cabinPortalTexture,
          0,
        ),
        gl.viewport(0, 0, this.cabinPortalWidth, this.cabinPortalHeight),
        gl.disable(gl.DEPTH_TEST),
        gl.disable(gl.BLEND),
        gl.clearColor(0.005, 0.006, 0.01, 1),
        gl.clear(gl.COLOR_BUFFER_BIT));
      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      (gl.useProgram(this.z4bCabinProg),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri));
      const pLoc = gl.getAttribLocation(this.z4bCabinProg, "p");
      return (
        gl.enableVertexAttribArray(pLoc),
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, !1, 0, 0),
        gl.uniform2f(
          gl.getUniformLocation(this.z4bCabinProg, "u_resolution"),
          this.cabinPortalWidth,
          this.cabinPortalHeight,
        ),
        gl.uniform2f(gl.getUniformLocation(this.z4bCabinProg, "u_mouse"), 0, 0),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_time"),
          0.001 * now,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_blink"), 0),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_wake"), 1),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camZ"), 12),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_camX"), -1.3),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_yawOffset"),
          0.5 * -Math.PI,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpen"), 1),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorSwitched"),
          1,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_isWalking"),
          0,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_shake"), 0),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_flash"), 0),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_suctionFade"),
          0,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_zoom"), 0.92),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_trip"),
          this.z4Trip,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_modeSeed"),
          this.z4ModeSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_modeTime"),
          this.z4ModeTime,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_isOOB"), 0),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_fractalActive"),
          0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_fractalSeed"),
          this.z4FractalSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_blinkAge"),
          999,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_altRoute"), 0),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_oceanOutside"),
          1,
        ),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(
          gl.TEXTURE_2D,
          this.z4bVoidTexture || this.stationTextures.black,
        ),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_voidTex"), 0),
        gl.activeTexture(gl.TEXTURE1),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorClosedTex"),
          1,
        ),
        gl.activeTexture(gl.TEXTURE2),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorOpenTex"),
          2,
        ),
        gl.activeTexture(gl.TEXTURE3),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texLeft"), 3),
        gl.activeTexture(gl.TEXTURE4),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texRight"), 4),
        gl.activeTexture(gl.TEXTURE5),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texTop"), 5),
        gl.activeTexture(gl.TEXTURE6),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_texBottom"),
          6,
        ),
        gl.activeTexture(gl.TEXTURE7),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_cockpitTex"),
          7,
        ),
        gl.drawArrays(gl.TRIANGLES, 0, 3),
        gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO),
        gl.viewport(
          prevViewport[0],
          prevViewport[1],
          prevViewport[2],
          prevViewport[3],
        ),
        !0
      );
    }
    _patchZ4BCockpitVoidUV() {
      if (
        !window.GLSL ||
        !window.GLSL.modules ||
        !window.GLSL.modules.z3_merged
      )
        return;
      let src = window.GLSL.modules.z3_merged;
      if (src.indexOf("z4bCockpitVoidOffset") >= 0) return;
      const rawScreen =
          "vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;",
        rawFixed =
          "vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9, 0.0, 1.0));\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;",
        shifted =
          "vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9 + 0.18, 0.0, 1.0)); \n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;";
      if (src.indexOf(rawFixed) >= 0) src = src.replace(rawFixed, shifted);
      else {
        if (!(src.indexOf(rawScreen) >= 0))
          throw new Error("cockpit windshield void sample line not found");
        src = src.replace(rawScreen, shifted);
      }
      window.GLSL.modules.z3_merged = src;
    }
    _ensureZ4BCabinProgram() {
      if (this.z4bCabinProg) return !0;
      this._patchZ4BCockpitVoidUV();
      const src =
        (window.GLSL && window.GLSL.modules && window.GLSL.modules.z3_merged) ||
        null;
      return (
        !!src &&
        ((this.z4bCabinProg = this._buildRawProgram(
          "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }",
          src,
        )),
        !!this.z4bCabinProg)
      );
    }
    _renderZ4BCabin(now) {
      if (!this._ensureZ4BCabinProgram()) return;
      (this._renderMode4VoidFBO(now),
        gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.viewport(0, 0, canvas.width, canvas.height),
        gl.disable(gl.DEPTH_TEST),
        gl.disable(gl.BLEND),
        gl.clearColor(0.005, 0.006, 0.01, 1),
        gl.clear(gl.COLOR_BUFFER_BIT));
      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      (gl.useProgram(this.z4bCabinProg),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri));
      const pLoc = gl.getAttribLocation(this.z4bCabinProg, "p");
      (gl.enableVertexAttribArray(pLoc),
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, !1, 0, 0),
        gl.uniform2f(
          gl.getUniformLocation(this.z4bCabinProg, "u_resolution"),
          canvas.width,
          canvas.height,
        ),
        gl.uniform2f(
          gl.getUniformLocation(this.z4bCabinProg, "u_mouse"),
          this.cx,
          this.cy,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_time"),
          0.001 * now,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_blink"),
          this.rBlink,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_wake"), 1));
      var cabinOOB =
        this.z4bCabinFractalActive ||
        "turbulence" === this.z4bCabinState ||
        "crash" === this.z4bCabinState ||
        "side_entry" === this.z4bCabinState ||
        "side_turn" === this.z4bCabinState ||
        "side_settle" === this.z4bCabinState
          ? 1
          : 0;
      (gl.uniform1f(
        gl.getUniformLocation(this.z4bCabinProg, "u_camZ"),
        this.z4bCabinCamZ,
      ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_camX"),
          this.z4bCabinCamX,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_yawOffset"),
          this.z4bCabinYaw,
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_doorOpen"), 1),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorSwitched"),
          1,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_isWalking"),
          this.z4bCabinWalking ? 1 : 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_shake"),
          this.z4bCabinShake,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_flash"),
          this.z4bCabinFlash,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_suctionFade"),
          0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_zoom"),
          this.z4bCabinZoom,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_trip"),
          this.z4Trip,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_modeSeed"),
          this.z4ModeSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_modeTime"),
          this.z4ModeTime,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_isOOB"),
          cabinOOB,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_fractalActive"),
          this.z4bCabinFractalActive ? 1 : 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_fractalSeed"),
          this.z4FractalSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_blinkAge"),
          0.001 * (now - (this.z4BlinkPeakTime || now)),
        ),
        gl.uniform1f(gl.getUniformLocation(this.z4bCabinProg, "u_altRoute"), 0),
        gl.uniform1f(
          gl.getUniformLocation(this.z4bCabinProg, "u_oceanOutside"),
          1,
        ),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(
          gl.TEXTURE_2D,
          this.z4bVoidTexture || this.stationTextures.black,
        ),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_voidTex"), 0),
        gl.activeTexture(gl.TEXTURE1),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorClosedTex"),
          1,
        ),
        gl.activeTexture(gl.TEXTURE2),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_doorOpenTex"),
          2,
        ),
        gl.activeTexture(gl.TEXTURE3),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texLeft"), 3),
        gl.activeTexture(gl.TEXTURE4),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texRight"), 4),
        gl.activeTexture(gl.TEXTURE5),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop),
        gl.uniform1i(gl.getUniformLocation(this.z4bCabinProg, "u_texTop"), 5),
        gl.activeTexture(gl.TEXTURE6),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_texBottom"),
          6,
        ),
        gl.activeTexture(gl.TEXTURE7),
        gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit),
        gl.uniform1i(
          gl.getUniformLocation(this.z4bCabinProg, "u_cockpitTex"),
          7,
        ),
        gl.drawArrays(gl.TRIANGLES, 0, 3));
    }
    _drawZ4BCrashOverlays(now) {
      if ("z4b_cabin" === this.phase) {
        var red = this.z4bCrashRedAlpha || 0,
          black = this.z4bCrashBlackAlpha || 0;
        if (red > 0.001) {
          var pulse = 0.88 + 0.12 * Math.sin(0.021 * now);
          this._drawOverlay(0.95, 0, 0, Math.min(1, red * pulse));
        }
        black > 0.001 && this._drawOverlay(0, 0, 0, Math.min(1, black));
      }
    }
    _renderFall(now) {
      if (!this._fallShaderBuilt) {
        this._fallShaderBuilt = !0;
        var src = (window.GLSL && GLSL.modules && GLSL.modules.z4_fall) || null;
        if (
          (src || console.error("[Zone4] GLSL.modules.z4_fall not found"), src)
        ) {
          var vsSrc =
              "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }",
            vs = compile(
              gl.VERTEX_SHADER,
              "undefined" != typeof IS_MOBILE && IS_MOBILE
                ? "#define MOBILE\n" + vsSrc
                : vsSrc,
            ),
            fs = compile(
              gl.FRAGMENT_SHADER,
              "undefined" != typeof IS_MOBILE && IS_MOBILE
                ? "#define MOBILE\n" + src
                : src,
            );
          vs &&
            fs &&
            ((this.fallProg = gl.createProgram()),
            gl.attachShader(this.fallProg, vs),
            gl.attachShader(this.fallProg, fs),
            gl.linkProgram(this.fallProg),
            gl.getProgramParameter(this.fallProg, gl.LINK_STATUS)
              ? console.log("[Zone4] z4_fall compiled OK")
              : (console.error(
                  "[Zone4] Fall link:",
                  gl.getProgramInfoLog(this.fallProg),
                ),
                gl.deleteProgram(this.fallProg),
                (this.fallProg = null)));
        }
      }
      if (!this.fallProg)
        return (
          console.error(
            "[Zone4] fallProg is null — z4_fall shader missing or failed to compile",
          ),
          gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          gl.viewport(0, 0, canvas.width, canvas.height),
          gl.clearColor(0.5, 0, 0, 1),
          void gl.clear(gl.COLOR_BUFFER_BIT)
        );
      (gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.viewport(0, 0, canvas.width, canvas.height),
        gl.clearColor(0.01, 0.01, 0.02, 1),
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
        gl.disable(gl.DEPTH_TEST));
      for (var ai = 0; ai < 8; ai++) gl.disableVertexAttribArray(ai);
      (gl.useProgram(this.fallProg),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri));
      const pLoc = gl.getAttribLocation(this.fallProg, "p");
      (gl.enableVertexAttribArray(pLoc),
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, !1, 0, 0),
        gl.uniform2f(
          gl.getUniformLocation(this.fallProg, "u_resolution"),
          canvas.width,
          canvas.height,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.fallProg, "u_time"),
          0.001 * now,
        ),
        gl.uniform2f(
          gl.getUniformLocation(this.fallProg, "u_mouse"),
          this.cx,
          this.cy,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.fallProg, "u_fallProgress"),
          this.fallProgress,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.fallProg, "u_blink"),
          this.rBlink,
        ),
        gl.drawArrays(gl.TRIANGLES, 0, 3));
    }
    _renderStation(now) {
      if (!this.stationBgProg || !this.stationMeshProg || !this.postProcessProg)
        return;
      (this._updateVideoTexture(this.stationTextures.earth, this.earthVideo),
        this.annexSequenceActive &&
          this._updateVideoTexture(
            this.stationTextures.crywolf,
            this.crywolfVideo,
          ),
        (this.annexSequenceActive ||
          this.annexAltBasementActive ||
          "z4b_cabin" === this.phase) &&
          this._updateVideoTexture(this.stationTextures.bh2, this.bh2Video));
      const cam = this._computeStationCamera(),
        eye = cam.eye,
        fwd = cam.forward,
        right = cam.right,
        up = cam.up,
        proj = this._perspective(
          Math.PI / 2.65,
          canvas.width / canvas.height,
          0.05,
          220,
        ),
        view = this._lookAt(eye, this._add(eye, fwd), [0, 1, 0]);
      if (
        ((this.fboWidth === canvas.width && this.fboHeight === canvas.height) ||
          ((this.fboWidth = canvas.width),
          (this.fboHeight = canvas.height),
          gl.bindTexture(gl.TEXTURE_2D, this.fboTexture),
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            canvas.width,
            canvas.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          ),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
          gl.bindRenderbuffer(gl.RENDERBUFFER, this.fboDepth),
          gl.renderbufferStorage(
            gl.RENDERBUFFER,
            gl.DEPTH_COMPONENT16,
            canvas.width,
            canvas.height,
          )),
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo),
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          this.fboTexture,
          0,
        ),
        gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          this.fboDepth,
        ),
        gl.viewport(0, 0, canvas.width, canvas.height),
        gl.clearColor(0.01, 0.01, 0.015, 1),
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo),
        gl.viewport(0, 0, canvas.width, canvas.height),
        !this.annexSequenceActive ||
          ("annex_room" !== this.phase && "annex_exit_door" !== this.phase))
      ) {
        (gl.disable(gl.DEPTH_TEST),
          gl.useProgram(this.stationBgProg),
          gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad));
        const bgPos = gl.getAttribLocation(this.stationBgProg, "a_pos");
        (gl.enableVertexAttribArray(bgPos),
          gl.vertexAttribPointer(bgPos, 2, gl.FLOAT, !1, 0, 0),
          gl.uniform2f(
            gl.getUniformLocation(this.stationBgProg, "u_res"),
            canvas.width,
            canvas.height,
          ),
          gl.uniform1f(
            gl.getUniformLocation(this.stationBgProg, "u_time"),
            0.001 * now,
          ),
          gl.uniform1f(
            gl.getUniformLocation(this.stationBgProg, "u_blink"),
            this.rBlink,
          ),
          gl.uniform1f(
            gl.getUniformLocation(this.stationBgProg, "u_trip"),
            this.z4Trip,
          ),
          gl.uniform3f(
            gl.getUniformLocation(this.stationBgProg, "u_eye"),
            eye[0],
            eye[1],
            eye[2],
          ),
          gl.uniform3f(
            gl.getUniformLocation(this.stationBgProg, "u_forward"),
            fwd[0],
            fwd[1],
            fwd[2],
          ),
          gl.uniform3f(
            gl.getUniformLocation(this.stationBgProg, "u_right"),
            right[0],
            right[1],
            right[2],
          ),
          gl.uniform3f(
            gl.getUniformLocation(this.stationBgProg, "u_up"),
            up[0],
            up[1],
            up[2],
          ));
        const earthFrame = this._stationFrame(this.ringU),
          earthSide =
            "window" === this.ringView
              ? this.ringWindowSide || 1
              : this._stationWindowSideAtRingU() || 1,
          earthTarget = this._normalize(
            this._add(this._mul(earthFrame.radial, earthSide), [0, -0.48, 0]),
          );
        (gl.uniform3f(
          gl.getUniformLocation(this.stationBgProg, "u_targetDir"),
          earthTarget[0],
          earthTarget[1],
          earthTarget[2],
        ),
          gl.activeTexture(gl.TEXTURE0),
          gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.earth),
          gl.uniform1i(gl.getUniformLocation(this.stationBgProg, "u_env"), 0),
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4));
      } else
        (gl.clearColor(0.004, 0.004, 0.006, 1),
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT));
      (this._altAnnexCleanView &&
        (gl.clearColor(0.03, 0.026, 0.028, 1),
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)),
        gl.enable(gl.DEPTH_TEST),
        gl.useProgram(this.stationMeshProg),
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.stationMeshProg, "u_proj"),
          !1,
          proj,
        ),
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.stationMeshProg, "u_view"),
          !1,
          view,
        ),
        gl.uniform3f(
          gl.getUniformLocation(this.stationMeshProg, "u_lightDir"),
          0.3,
          0.9,
          -0.4,
        ),
        gl.uniform3f(
          gl.getUniformLocation(this.stationMeshProg, "u_eye"),
          eye[0],
          eye[1],
          eye[2],
        ));
      const inAnnexInterior =
        ("annex_turn_in" === this.phase && (this.annexTurnT || 0) >= 0.34) ||
        "annex_hallway" === this.phase ||
        "annex_room" === this.phase ||
        "annex_exit_door" === this.phase;
      if (
        ((this._annexLightingActive = inAnnexInterior),
        (this._annexStrobe = 0),
        (this._annexWhiteStrobe = 0),
        (this._annexRedWash = 0),
        (this._annexRedGlow = 0),
        (this._annexDarkPulse = 0),
        (this._annexExitGlow =
          this.annexSequenceActive && inAnnexInterior ? 1 : 0),
        (this._altAnnexWhiteStrobe = 0),
        (this._altAnnexFogPulse = 0),
        this._updateAnnexTripOverlay(
          now,
          !(!this.annexSequenceActive || !inAnnexInterior),
        ),
        this._altAnnexCleanView && inAnnexInterior)
      ) {
        const strobeRate = 9.75,
          strobePhase = (((0.001 * now * strobeRate) % 1) + 1) % 1,
          strobeSlot = Math.floor(0.001 * now * strobeRate),
          sr = 43758.5453123 * Math.sin(127.1 * strobeSlot + 31.7),
          strobeRnd = sr - Math.floor(sr),
          sp = 43758.5453123 * Math.sin(53.7 * strobeSlot + 9.91),
          strobePow = sp - Math.floor(sp);
        (strobeRnd > 0.28 &&
          strobePhase < 0.165 &&
          (this._altAnnexWhiteStrobe =
            (1 - strobePhase / 0.165) * (2.4 + 3.2 * strobePow)),
          (this._altAnnexFogPulse =
            0.72 +
            0.28 *
              Math.sin(
                0.001 * now * 0.58 + 1.55 * Math.sin(0.001 * now * 0.17),
              )));
      }
      if (this.annexSequenceActive && inAnnexInterior) {
        const beatMs = 6e4 / 140,
          strobePhase =
            ((((now - (this.annexSequenceStart || now)) % beatMs) + beatMs) %
              beatMs) /
            beatMs,
          raveHit = Math.pow(Math.max(0, 1 - strobePhase / 0.18), 2.1),
          blackout = Math.pow(1 - raveHit, 0.12);
        ((this._annexWhiteStrobe = 5.25 * raveHit),
          (this._annexStrobe = Math.max(0, Math.min(1, blackout))),
          (this._annexDarkPulse = this._annexStrobe),
          (this._annexRedWash = 0.62),
          (this._annexRedGlow =
            (0.18 + 0.74 * raveHit) * (1 - 0.78 * this._annexStrobe)),
          (this.z4Trip = Math.max(this.z4Trip || 1, 1.18)),
          (this.z4IsOOB = 1),
          (this.shakeIntensity = 0.0012 + 0.0018 * raveHit));
      }
      this.annexSequenceActive &&
        inAnnexInterior &&
        (this._renderCabinPortalFBO(now),
        gl.enable(gl.DEPTH_TEST),
        gl.useProgram(this.stationMeshProg),
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.stationMeshProg, "u_proj"),
          !1,
          proj,
        ),
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.stationMeshProg, "u_view"),
          !1,
          view,
        ),
        gl.uniform3f(
          gl.getUniformLocation(this.stationMeshProg, "u_lightDir"),
          0.3,
          0.9,
          -0.4,
        ),
        gl.uniform3f(
          gl.getUniformLocation(this.stationMeshProg, "u_eye"),
          eye[0],
          eye[1],
          eye[2],
        ));
      const shouldDrawStationMesh = (mesh) => {
          if (
            (this.annexAltBasementActive ||
              "alt" === this.annexBasementVariant ||
              this.altAnnexRouteActive ||
              ("function" == typeof this._isAltAnnexRoute &&
                this._isAltAnnexRoute())) &&
            "annex_room" !== this.phase &&
            "annex_exit_door" !== this.phase &&
            (mesh.annexAltCrowdVisual ||
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
              (mesh.annexAltOnly &&
                mesh.blend &&
                !mesh.annexAltDoorScene &&
                !mesh.annexAltDoorBulb &&
                !mesh.annexTopDoorBulb))
          )
            return !1;
          if (
            mesh.altAnnexFogMachine &&
            !mesh.annexAltFogWisp &&
            !mesh.dynamicFogWisp
          )
            return !1;
          const z4AltAnnexRouteNow =
            "function" == typeof this._isAltAnnexRoute &&
            this._isAltAnnexRoute();
          if (mesh.annexAltOnly && !z4AltAnnexRouteNow) return !1;
          if (mesh.annexNormalOnly && z4AltAnnexRouteNow) return !1;
          if (
            mesh.annexAltDoorScene &&
            z4AltAnnexRouteNow &&
            !(
              "annex_room" === this.phase ||
              "annex_exit_door" === this.phase ||
              ("annex_hallway" === this.phase && (this.annexHallT || 0) >= 0.88)
            )
          )
            return !1;
          if (mesh.annexBaseExitWall && z4AltAnnexRouteNow) return !1;
          if (mesh.annexBaseExitWall && this.annexAltBasementActive) return !1;
          if (mesh.annexEventExitWall && !this.annexSequenceActive) return !1;
          if (mesh.annexCabinPortalWall && !this.annexSequenceActive) return !1;
          if (mesh.annexBaseExitWall && this.annexSequenceActive) return !1;
          if (mesh.annexCrywolfWall && !this.annexSequenceActive) return !1;
          if (mesh.annexCrowd2 && !this.annexSequenceActive) return !1;
          const annexCrowdView =
            this.turnAnimating && "annex_stage" === this.turnViewTo
              ? "stage"
              : this.turnAnimating && "annex_path" === this.turnViewTo
                ? "path"
                : this.annexRoomView || "path";
          return !(
            (mesh.annexCrowdBack && "stage" !== annexCrowdView) ||
            (mesh.annexCrowdSide && "stage" === annexCrowdView) ||
            (mesh.annexInterior && !inAnnexInterior) ||
            (mesh.annexExterior && inAnnexInterior) ||
            (mesh.annexEntranceDoor && this.annexDoorOpen)
          );
        },
        drawStationMesh = (mesh) => {
          const noDepth = !!mesh.annexAltDoorSceneNoDepth,
            depthWasEnabled = !!noDepth && gl.isEnabled(gl.DEPTH_TEST);
          (noDepth && gl.disable(gl.DEPTH_TEST),
            mesh.annexCabinPortalWall &&
              ((mesh.tex =
                this.cabinPortalTexture || this.stationTextures.black),
              (mesh.screenSample = !0),
              (mesh.texMix = 1)),
            this._bindStationMesh(mesh),
            gl.drawArrays(gl.TRIANGLES, 0, mesh.count),
            noDepth && depthWasEnabled && gl.enable(gl.DEPTH_TEST));
        };
      if (this._altAnnexCleanView)
        for (let i = 0; i < this.stationMeshes.length; i++) {
          const mesh = this.stationMeshes[i];
          mesh &&
            "function" == typeof mesh.altFogUpdater &&
            shouldDrawStationMesh(mesh) &&
            mesh.altFogUpdater(now);
        }
      (gl.disable(gl.BLEND), gl.depthMask(!0));
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        shouldDrawStationMesh(mesh) && (mesh.blend || drawStationMesh(mesh));
      }
      (gl.enable(gl.BLEND),
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
        gl.depthMask(!1));
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        shouldDrawStationMesh(mesh) && mesh.blend && drawStationMesh(mesh);
      }
      (gl.depthMask(!0),
        gl.disable(gl.BLEND),
        gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.disable(gl.DEPTH_TEST),
        gl.useProgram(this.postProcessProg),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad));
      const ppPos = gl.getAttribLocation(this.postProcessProg, "p");
      (gl.enableVertexAttribArray(ppPos),
        gl.vertexAttribPointer(ppPos, 2, gl.FLOAT, !1, 0, 0),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(gl.TEXTURE_2D, this.fboTexture),
        gl.uniform1i(
          gl.getUniformLocation(this.postProcessProg, "u_sceneTex"),
          0,
        ),
        gl.uniform2f(
          gl.getUniformLocation(this.postProcessProg, "u_res"),
          canvas.width,
          canvas.height,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_time"),
          0.001 * now,
        ));
      const annexTripPostFX =
        this.annexSequenceActive && inAnnexInterior
          ? Math.max(0, Math.min(1, this.annexTripFX || 1))
          : 0;
      (gl.uniform1f(
        gl.getUniformLocation(this.postProcessProg, "u_trip"),
        Math.max(this.z4Trip, annexTripPostFX > 0 ? 1.18 : this.z4Trip),
      ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_annexTripFX"),
          annexTripPostFX,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_fractalSeed"),
          this.z4FractalSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_blinkAge"),
          0.001 * (now - this.z4BlinkPeakTime),
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_blink"),
          this.rBlink,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_modeSeed"),
          this.z4ModeSeed,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_modeTime"),
          this.z4ModeTime,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_isOOB"),
          this.z4IsOOB,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_altAnnexPeripheral"),
          this._altAnnexCleanView ? 1 : 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_altAnnexWhiteStrobe"),
          this._altAnnexWhiteStrobe || 0,
        ),
        gl.uniform1f(
          gl.getUniformLocation(this.postProcessProg, "u_altAnnexFogPulse"),
          this._altAnnexFogPulse || 0,
        ),
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4));
    }
    render(now, mx, my) {
      if (window.isEngine4Dead || this.isDead) return;
      if (
        ((window.isEngine1Dead = !0),
        "undefined" != typeof currentEngine && currentEngine)
      ) {
        try {
          currentEngine.destroy();
        } catch (e) {}
        currentEngine = null;
      }
      if ("undefined" != typeof leftEngine && leftEngine) {
        try {
          leftEngine.destroy();
        } catch (e) {}
        leftEngine = null;
      }
      if ("undefined" != typeof rightEngine && rightEngine) {
        try {
          rightEngine.destroy();
        } catch (e) {}
        rightEngine = null;
      }
      if ("undefined" != typeof backEngine && backEngine) {
        try {
          backEngine.destroy();
        } catch (e) {}
        backEngine = null;
      }
      let dt = now - this.lastRenderTime;
      ((dt > 250 || dt <= 0) && (dt = 33.33), (this.lastRenderTime = now));
      const step = dt / (IS_MOBILE ? 50 : 33.33);
      ("number" != typeof mx &&
        (mx = "number" == typeof window.mx ? window.mx : this.cx),
        "number" != typeof my &&
          (my = "number" == typeof window.my ? window.my : this.cy),
        "function" == typeof this._isAltAnnexLocked &&
          this._isAltAnnexLocked() &&
          ((mx = Math.max(-0.24, Math.min(0.24, mx))),
          (my = Math.max(-0.15, Math.min(0.15, my))),
          "number" == typeof window.mx && (window.mx = mx),
          "number" == typeof window.my && (window.my = my)));
      const stickyLook = "z4b_cabin" === this.phase;
      if (stickyLook) {
        const lx =
            "number" == typeof window.__z4bIslandLookX
              ? window.__z4bIslandLookX
              : this.cx,
          ly =
            "number" == typeof window.__z4bIslandLookY
              ? window.__z4bIslandLookY
              : this.cy;
        Math.abs(mx) < 5e-4 &&
          Math.abs(my) < 5e-4 &&
          (Math.abs(lx) > 5e-4 ||
            Math.abs(ly) > 5e-4 ||
            Math.abs(this.cx) > 5e-4 ||
            Math.abs(this.cy) > 5e-4) &&
          ((mx = lx), (my = ly));
      }
      if (this.turnAnimating) {
        const turnElapsed = now - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        ((turnT = turnT * turnT * (3 - 2 * turnT)),
          (this.cx = this.turnLookX * (1 - turnT)),
          (this.cy = this.turnLookY * (1 - turnT)));
      } else
        ((this.cx += (mx - this.cx) * Math.min(1, 0.12 * step)),
          (this.cy += (my - this.cy) * Math.min(1, 0.12 * step)));
      if (
        (!(
          "function" != typeof this._isAltAnnexLocked ||
          !this._isAltAnnexLocked()
        ) &&
          ((this.cx = Math.max(-0.24, Math.min(0.24, this.cx))),
          (this.cy = Math.max(-0.15, Math.min(0.15, this.cy))),
          "number" == typeof window.mx && (window.mx = this.cx),
          "number" == typeof window.my && (window.my = this.cy)),
        stickyLook
          ? ((window.__z4bIslandLookX = this.cx),
            (window.__z4bIslandLookY = this.cy),
            "number" == typeof window.mx && (window.mx = this.cx),
            "number" == typeof window.my && (window.my = this.cy))
          : this.turnAnimating &&
            ("number" == typeof window.mx && (window.mx = this.cx),
            "number" == typeof window.my && (window.my = this.cy)),
        this._checkStationTurnThreshold(now),
        this._updateBlink(now),
        this._updatePhase(now, 0.001 * dt),
        !this.isDead)
      ) {
        if (
          ((this.z4ModeTime += 0.001 * dt),
          (this._altAnnexCleanView = !(
            !(
              this.annexAltBasementActive ||
              "alt" === this.annexBasementVariant ||
              this.altAnnexRouteActive ||
              this.altAnnexDoorOpen ||
              this.altAnnexCounterClockwiseReady ||
              ("function" == typeof this._isAltAnnexRoute &&
                this._isAltAnnexRoute())
            ) ||
            ("annex_hallway" !== this.phase &&
              "annex_room" !== this.phase &&
              "annex_exit_door" !== this.phase)
          )),
          this._altAnnexCleanView &&
            ((this.neuralIntensity = 0),
            (this.rBlink = 0),
            (this.blinking = !1),
            (this.blackholeVisible = !1),
            (this.blackholeIntensity = 0),
            (this.hallucinationIntensity = 0),
            (this.hallucinationLevel = 0),
            (this.glitchIntensity = 0),
            (this.glitchAmount = 0),
            (this.chromaticAberration = 0),
            (this.vignetteIntensity = 0),
            (this.noiseIntensity = 0),
            (this.scanlineIntensity = 0),
            (this.warpIntensity = 0),
            (this.distortionIntensity = 0)),
          (this.hallucinationLevel = this._hallucinationLevelForScene()),
          (this.z4Trip = this._hallucinationTripForLevel(
            this.hallucinationLevel,
          )),
          (this.z4IsOOB =
            this._altAnnexCleanView ||
            "bay" === this.phase ||
            "hallway" === this.phase ||
            "entering_ring" === this.phase ||
            "ring" === this.phase ||
            "annex_turn_in" === this.phase ||
            "annex_hallway" === this.phase ||
            "annex_room" === this.phase ||
            "annex_exit_door" === this.phase ||
            "z4b_cabin" === this.phase ||
            "reverse_entering_ring" === this.phase ||
            "reverse_hallway" === this.phase ||
            "reverse_bay" === this.phase
              ? 1
              : 0),
          "function" == typeof this._updateAltAnnexNffAudio &&
            this._updateAltAnnexNffAudio(now),
          "ascent" === this.phase ||
            "docking_shake" === this.phase ||
            "fog_in" === this.phase)
        )
          (this._renderElevator(now),
            "function" == typeof drawHallucinationOverlay &&
              drawHallucinationOverlay(
                now,
                this.z4Trip,
                this.z4FractalSeed,
                0.001 * (now - this.z4BlinkPeakTime),
                4,
              ));
        else if ("descent" === this.phase || "descent_shake" === this.phase)
          (this._renderElevator(now),
            "function" == typeof drawHallucinationOverlay &&
              drawHallucinationOverlay(
                now,
                this.z4Trip,
                this.z4FractalSeed,
                0.001 * (now - this.z4BlinkPeakTime),
                4,
              ));
        else if ("fall" === this.phase) this._renderFall(now);
        else if ("impact" === this.phase) {
          var impactElapsed = now - this.phaseStart,
            flashT = Math.min(1, impactElapsed / 400);
          (this._drawOverlay(
            1,
            1,
            1,
            flashT > 0.5 ? 1 - 2 * (flashT - 0.5) : 2 * flashT,
          ),
            impactElapsed > 800 &&
              this._drawOverlay(
                0,
                0,
                0,
                Math.min(1, (impactElapsed - 800) / 1200),
              ));
        } else
          "z4b_cabin" === this.phase
            ? (this._renderZ4BCabin(now), this._drawZ4BCrashOverlays(now))
            : (this._renderStation(now),
              !this._altAnnexCleanView ||
                ("annex_hallway" !== this.phase &&
                  "annex_room" !== this.phase &&
                  "annex_exit_door" !== this.phase) ||
                this._drawAltAnnexFX(now));
        if (
          !this._altAnnexCleanView &&
          ("annex_hallway" === this.phase ||
            "annex_room" === this.phase ||
            "annex_exit_door" === this.phase)
        ) {
          var hazeBase =
            "annex_hallway" === this.phase
              ? 0.12
              : "annex_room" === this.phase
                ? 0.24
                : 0.28;
          this.annexSequenceActive &&
            "annex_room" === this.phase &&
            (hazeBase = 0.03);
          var hazePulse = 0.01 * (0.5 + 0.5 * Math.sin(9e-4 * now));
          if (
            (this._drawOverlay(0.18, 0.035, 0, hazeBase + hazePulse),
            this._drawOverlay(
              0.42,
              0.03,
              0,
              (this.annexSequenceActive && "annex_room" === this.phase
                ? 0.01
                : 0.045) +
                0.2 * hazePulse,
            ),
            this.annexSequenceActive && "annex_room" === this.phase)
          ) {
            var annexBeatFlash = Math.max(
                0,
                Math.min(1, (this._annexWhiteStrobe || 0) / 5.25),
              ),
              annexBlackout = Math.max(0, Math.min(1, this._annexStrobe || 0));
            (this._drawOverlay(0, 0, 0, Math.min(0.46, 0.34 * annexBlackout)),
              this._drawOverlay(
                1,
                0.96,
                0.88,
                Math.min(0.34, 0.34 * annexBeatFlash),
              ));
          }
          if ("annex_exit_door" === this.phase) {
            var exitFade = Math.max(0, Math.min(1, this.annexExitT || 0));
            (this._drawOverlay(0, 0.85, 0.1, 0.07 + 0.2 * exitFade),
              this._drawOverlay(
                0,
                0,
                0,
                0.82 * Math.max(0, (exitFade - 0.72) / 0.28),
              ));
          }
        }
        if ("docking_shake" === this.phase) {
          var shakeAlpha = 3 * this.shakeIntensity;
          this._drawOverlay(0.02, 0, 0, Math.min(0.15, shakeAlpha));
        }
        if (
          ("descent_shake" === this.phase &&
            ((shakeAlpha = 2 * this.shakeIntensity),
            this._drawOverlay(0.15, 0, 0, Math.min(0.4, shakeAlpha))),
          "fall" === this.phase)
        ) {
          var fallElapsed = now - this.phaseStart;
          if (fallElapsed < 500) {
            var fA =
              fallElapsed < 80
                ? fallElapsed / 80
                : Math.max(0, 1 - (fallElapsed - 80) / 420);
            this._drawOverlay(1, 0.92, 0.82, 0.95 * fA);
          }
        }
        if (
          "annex_room" === this.phase &&
          "function" == typeof this._isAltAnnexRoute &&
          this._isAltAnnexRoute()
        ) {
          var approachT = Math.max(
              0,
              Math.min(1, ((this.annexRoomT || 0) - 0.625) / 0.375),
            ),
            approachFade = approachT * approachT * (3 - 2 * approachT);
          approachFade > 0.001 && this._drawOverlay(0, 0, 0, approachFade);
        }
        this.rBlink > 0.001 && this._drawOverlay(0, 0, 0, this.rBlink);
      }
    }
    destroy() {
      if (
        ((this.isDead = !0),
        this.fogOverlay && (this.fogOverlay.style.opacity = "0"),
        this.earthVideo)
      )
        try {
          this.earthVideo.pause();
        } catch (e) {}
      if (!this.__altAnnexNffHandedToZone2)
        try {
          this._duckAltAnnexMainAudio(!1);
        } catch (e) {}
      if (this.altAnnexNffAudio && !this.__altAnnexNffHandedToZone2) {
        try {
          this.altAnnexNffAudio.pause();
        } catch (e) {}
        try {
          (this.altAnnexNffAudio.removeAttribute("src"),
            this.altAnnexNffAudio.load());
        } catch (e) {}
      }
      if (!this.__altAnnexNffHandedToZone2)
        try {
          (this.altAnnexNffSource && this.altAnnexNffSource.disconnect(),
            this.altAnnexNffFilter && this.altAnnexNffFilter.disconnect(),
            this.altAnnexNffGain && this.altAnnexNffGain.disconnect());
        } catch (e) {}
      if (
        (this.elevatorProg && gl.deleteProgram(this.elevatorProg),
        this.stationBgProg && gl.deleteProgram(this.stationBgProg),
        this.stationMeshProg && gl.deleteProgram(this.stationMeshProg),
        this.z4bCabinProg && gl.deleteProgram(this.z4bCabinProg),
        this.overlayProg &&
          this.overlayProg.prog &&
          gl.deleteProgram(this.overlayProg.prog),
        this.altAnnexFXProg &&
          this.altAnnexFXProg.prog &&
          gl.deleteProgram(this.altAnnexFXProg.prog),
        this.postProcessProg && gl.deleteProgram(this.postProcessProg),
        this.fallProg && gl.deleteProgram(this.fallProg),
        this.fbo && gl.deleteFramebuffer(this.fbo),
        this.cabinPortalFBO && gl.deleteFramebuffer(this.cabinPortalFBO),
        this.fboTexture && gl.deleteTexture(this.fboTexture),
        this.cabinPortalTexture && gl.deleteTexture(this.cabinPortalTexture),
        this.fboDepth && gl.deleteRenderbuffer(this.fboDepth),
        this.fullTri && gl.deleteBuffer(this.fullTri),
        this.screenQuad && gl.deleteBuffer(this.screenQuad),
        this.stationTextures)
      )
        for (const k in this.stationTextures) {
          const tex = this.stationTextures[k];
          if (Array.isArray(tex))
            for (let i = 0; i < tex.length; i++)
              tex[i] && gl.deleteTexture(tex[i]);
          else tex && gl.deleteTexture(tex);
        }
      if (this.stationMeshes)
        for (let i = 0; i < this.stationMeshes.length; i++)
          this.stationMeshes[i].buf &&
            gl.deleteBuffer(this.stationMeshes[i].buf);
    }
  }
  ((window.startZone4 = function () {
    if (
      ((window.isEngine4Dead = !1),
      (window.__z4RenderLogged = !1),
      "undefined" == typeof gl ||
        "undefined" == typeof canvas ||
        "function" != typeof compile ||
        "function" != typeof loadStaticTex ||
        !window.GLSL ||
        !window.GLSL.modules)
    )
      return void console.error("[Zone4] Missing shared engine globals.");
    if (
      (window.currentZone4 &&
        !window.currentZone4.isDead &&
        window.currentZone4.destroy(),
      (window.currentZone4 = new Zone4Engine()),
      !window.currentZone4 || window.currentZone4.isDead)
    )
      return;
    (window.__unlockAllVideos && window.__unlockAllVideos(),
      (window.__z4LoopToken = (window.__z4LoopToken || 0) + 1));
    const token = window.__z4LoopToken,
      frameBudget =
        1e3 /
        (/Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
          ? 20
          : 30);
    let last = 0;
    requestAnimationFrame(function loop(t) {
      token === window.__z4LoopToken &&
        (requestAnimationFrame(loop),
        t - last < frameBudget ||
          ((last = t),
          window.currentZone4 &&
            !window.currentZone4.isDead &&
            (window.currentZone4.render(t, window.mx || 0, window.my || 0),
            window.__z4RenderLogged ||
              ((window.__z4RenderLogged = !0),
              console.log(
                "[Zone4] render loop active, phase:",
                window.currentZone4.phase,
                "fallProg:",
                !!window.currentZone4.fallProg,
              )))));
    });
  }),
    (window.Zone4Engine = Zone4Engine));
})();
