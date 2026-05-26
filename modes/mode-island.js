((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (function () {
    if (!window.__z4bIslandRuntimeInstalled) {
      window.__z4bIslandRuntimeInstalled = !0;
      var TAU = 2 * Math.PI,
        texSpecs = [
          {
            key: "moai1",
            path: "files/img/rooms/z4/island/etc/MOAI-1.png",
            names: ["u_z4bMoaiFace1"],
            unit: 0,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moai2",
            path: "files/img/rooms/z4/island/etc/MOAI-2.png",
            names: ["u_z4bMoaiFace2"],
            unit: 1,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moai3",
            path: "files/img/rooms/z4/island/etc/MOAI-3.png",
            names: ["u_z4bMoaiFace3"],
            unit: 2,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moai4",
            path: "files/img/rooms/z4/island/etc/MOAI-4.png",
            names: ["u_z4bMoaiFace4"],
            unit: 3,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moai5",
            path: "files/img/rooms/z4/island/etc/MOAI-5.png",
            names: ["u_z4bMoaiFace5"],
            unit: 4,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moaiSide",
            path: "files/img/rooms/z4/island/etc/MOAI-SIDE.png",
            names: ["u_z4bMoaiSide"],
            unit: 5,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "moaiBack",
            path: "files/img/rooms/z4/island/etc/MOAI-BACK.png",
            names: ["u_z4bMoaiBack"],
            unit: 6,
            pixel: [72, 70, 66, 255],
          },
          {
            key: "wing",
            path: "files/img/rooms/z4/island/wing.png",
            names: ["u_z4bWingTex"],
            ready: "u_z4bWingReady",
            unit: 7,
            pixel: [0, 0, 0, 0],
          },
        ],
        textures = {},
        ready = {},
        locNames = new WeakMap(),
        islandPointerDown = (new WeakMap(), !1),
        islandLookX =
          "number" == typeof window.__z4bIslandLookX
            ? window.__z4bIslandLookX
            : 0,
        islandLookY =
          "number" == typeof window.__z4bIslandLookY
            ? window.__z4bIslandLookY
            : 0,
        islandTargetLookX = islandLookX,
        islandTargetLookY = islandLookY,
        islandLookReady = !1,
        islandLookLastT = 0,
        islandLastClientX = 0,
        islandLastClientY = 0,
        islandHasLastClient = !1;
      (window.__z4bIslandRelativeLookV2Installed ||
        ((window.__z4bIslandRelativeLookV2Installed = !0),
        window.addEventListener(
          "mousedown",
          function (e) {
            (!0 === window.__z4bIslandActive || z4bCurrentProgramIsIsland()) &&
              ((islandPointerDown = !0),
              (islandHasLastClient = !0),
              (islandLastClientX = e.clientX),
              (islandLastClientY = e.clientY));
          },
          !0,
        ),
        window.addEventListener(
          "mousemove",
          function (e) {
            if (!0 === window.__z4bIslandActive && islandPointerDown) {
              var dx =
                  "number" == typeof e.movementX
                    ? e.movementX
                    : e.clientX - islandLastClientX,
                dy =
                  "number" == typeof e.movementY
                    ? e.movementY
                    : e.clientY - islandLastClientY;
              ((islandLastClientX = e.clientX),
                (islandLastClientY = e.clientY),
                (islandHasLastClient = !0),
                (Math.abs(dx) > 0 || Math.abs(dy) > 0) &&
                  islandDragDelta(dx, dy));
            }
          },
          !0,
        ),
        window.addEventListener(
          "mouseup",
          function () {
            !0 === window.__z4bIslandActive &&
              ((islandPointerDown = !1), (islandHasLastClient = !1));
          },
          !0,
        ),
        window.addEventListener(
          "touchstart",
          function (e) {
            !0 === window.__z4bIslandActive &&
              e.touches &&
              e.touches.length &&
              ((islandPointerDown = !0),
              (islandHasLastClient = !0),
              (islandLastClientX = e.touches[0].clientX),
              (islandLastClientY = e.touches[0].clientY));
          },
          !0,
        ),
        window.addEventListener(
          "touchmove",
          function (e) {
            if (
              !0 === window.__z4bIslandActive &&
              islandPointerDown &&
              e.touches &&
              e.touches.length
            ) {
              var x = e.touches[0].clientX,
                y = e.touches[0].clientY;
              (islandHasLastClient &&
                islandDragDelta(x - islandLastClientX, y - islandLastClientY),
                (islandLastClientX = x),
                (islandLastClientY = y),
                (islandHasLastClient = !0));
            }
          },
          !0,
        ),
        window.addEventListener(
          "touchend",
          function () {
            !0 === window.__z4bIslandActive &&
              ((islandPointerDown = !1), (islandHasLastClient = !1));
          },
          !0,
        ),
        window.addEventListener(
          "touchcancel",
          function () {
            !0 === window.__z4bIslandActive &&
              ((islandPointerDown = !1), (islandHasLastClient = !1));
          },
          !0,
        ),
        window.addEventListener(
          "blur",
          function () {
            ((islandPointerDown = !1), (islandHasLastClient = !1));
          },
          !0,
        )),
        window.__z4bIslandShiftGuideInstalled ||
          ((window.__z4bIslandShiftGuideInstalled = !0),
          (window.__z4bIslandGuideShiftHeld = !1),
          (window.__z4bIslandForceGuide = !1),
          (window.__z4bIslandDebugGuideActive = !1)));
      var escapeState = window.__z4bIslandEscapeState || {
          walk: 0,
          mouseX: 0,
          mouseY: 0,
          blink: 0,
          blinks: 0,
          escape: !1,
          escapeWalk0: 0,
          flashStart: -1,
          lastStare: 0,
          stareStarted: 0,
          autoBlinkStage: 0,
        },
        blinkState = window.__z4bIslandBlinkState || {
          next: 0,
          start: -1,
          active: !1,
          value: 0,
        };
      ((window.__z4bIslandEscapeState = escapeState),
        (window.__z4bIslandBlinkState = blinkState));
      var z4bIslandLevelToken = 0,
        z4bIslandLevelSpaceHeld = !1,
        z4bIslandLevelProgram = null,
        z4bIslandLevelQuad = null,
        z4bIslandLevelBlackTex = null,
        z4bIslandLevelUniforms = null;
      (window.__z4bIslandLevelInputInstalled ||
        ((window.__z4bIslandLevelInputInstalled = !0),
        window.addEventListener(
          "keydown",
          function (e) {
            !0 === window.__z4bIslandActive &&
              z4bIslandLevelSpaceKey(e) &&
              ((z4bIslandLevelSpaceHeld = !0),
              e.preventDefault && e.preventDefault());
          },
          !0,
        ),
        window.addEventListener(
          "keyup",
          function (e) {
            z4bIslandLevelSpaceKey(e) &&
              ((z4bIslandLevelSpaceHeld = !1),
              !0 === window.__z4bIslandActive &&
                e.preventDefault &&
                e.preventDefault());
          },
          !0,
        ),
        window.addEventListener(
          "blur",
          function () {
            z4bIslandLevelSpaceHeld = !1;
          },
          !0,
        )),
        (window.startZ4BIsland = function (opts) {
          opts = opts || {};
          var targetCanvas = null;
          try {
            targetCanvas =
              "undefined" != typeof canvas && canvas
                ? canvas
                : document.getElementById("c");
          } catch (e) {
            targetCanvas = null;
          }
          if ("undefined" == typeof gl || !targetCanvas)
            return (
              console.error(
                "[Z4B Island] no WebGL context/canvas; island draw aborted",
              ),
              !1
            );
          ((targetCanvas.width && targetCanvas.height) ||
            ((targetCanvas.width = Math.max(
              1,
              targetCanvas.clientWidth || window.innerWidth || 1280,
            )),
            (targetCanvas.height = Math.max(
              1,
              targetCanvas.clientHeight || window.innerHeight || 720,
            ))),
            install());
          var prog,
            token = ++z4bIslandLevelToken;
          if (
            ((function () {
              try {
                (window.currentZone2 &&
                  window.currentZone2.destroy &&
                  window.currentZone2.destroy(),
                  (window.currentZone2 = null));
              } catch (e) {}
              try {
                (window.currentZone3 &&
                  window.currentZone3.destroy &&
                  window.currentZone3.destroy(),
                  (window.currentZone3 = null));
              } catch (e) {}
              try {
                (window.currentZone4 &&
                  window.currentZone4.destroy &&
                  window.currentZone4.destroy(),
                  (window.currentZone4 = null));
              } catch (e) {}
              try {
                "undefined" != typeof currentEngine &&
                  currentEngine &&
                  currentEngine.destroy &&
                  currentEngine.destroy();
              } catch (e) {}
              try {
                "undefined" != typeof leftEngine &&
                  leftEngine &&
                  leftEngine.destroy &&
                  leftEngine.destroy();
              } catch (e) {}
              try {
                "undefined" != typeof rightEngine &&
                  rightEngine &&
                  rightEngine.destroy &&
                  rightEngine.destroy();
              } catch (e) {}
              try {
                "undefined" != typeof backEngine &&
                  backEngine &&
                  backEngine.destroy &&
                  backEngine.destroy();
              } catch (e) {}
              try {
                "undefined" != typeof doorEngine &&
                  doorEngine &&
                  doorEngine.destroy &&
                  doorEngine.destroy();
              } catch (e) {}
              try {
                "undefined" != typeof laptopEngine &&
                  laptopEngine &&
                  laptopEngine.destroy &&
                  laptopEngine.destroy();
              } catch (e) {}
              try {
                ((currentEngine = null),
                  (leftEngine = null),
                  (rightEngine = null),
                  (backEngine = null),
                  (doorEngine = null),
                  (laptopEngine = null));
              } catch (e) {}
              try {
                window.__z4LoopToken && window.__z4LoopToken++;
              } catch (e) {}
            })(),
            (window.isEngine1Dead = !0),
            (window.__z4bIslandActive = !0),
            (window.__z4bIslandEscapeActive = !1),
            (window.__z4bIslandReturnToZone2 = !1),
            (window.__z4bIslandMoaiBlinkArmed = !1),
            (window.__lastOOB = !1),
            (escapeState.walk =
              "number" == typeof opts.walk && isFinite(opts.walk)
                ? opts.walk
                : 0),
            (escapeState.mouseX =
              "number" == typeof opts.lookX && isFinite(opts.lookX)
                ? opts.lookX
                : 0),
            (escapeState.mouseY =
              "number" == typeof opts.lookY && isFinite(opts.lookY)
                ? opts.lookY
                : 0),
            (escapeState.blink = 0),
            (escapeState.blinks = 0),
            (escapeState.escape = !1),
            (escapeState.escapeWalk0 = 0),
            (escapeState.flashStart = -1),
            (escapeState.lastStare = 0),
            (escapeState.stareStarted = 0),
            (escapeState.sequenceLocked = !1),
            (escapeState.sequenceStart = 0),
            (escapeState.autoBlinkStage = 0),
            (escapeState.stareBlinkCount = 0),
            (escapeState._escapeQueued = !1),
            (escapeState.returnedToZone2 = !1),
            (window.__z4bIslandEscapeState = escapeState),
            (window.__z4bIslandRawWalk = escapeState.walk),
            (window.__z4bIslandLookX = escapeState.mouseX),
            (window.__z4bIslandLookY = escapeState.mouseY),
            lockLook(escapeState.mouseX, escapeState.mouseY),
            z4bIslandLevelProgram)
          ) {
            try {
              gl.deleteProgram(z4bIslandLevelProgram);
            } catch (e) {}
            z4bIslandLevelProgram = null;
          }
          if (
            ((z4bIslandLevelProgram = (function () {
              if ("undefined" == typeof gl) return null;
              if (
                !(
                  window.GLSL &&
                  GLSL.vert &&
                  GLSL.core &&
                  GLSL.modules &&
                  GLSL.modules.z4b_island
                )
              )
                return null;
              var vs = z4bIslandLevelCompile(gl.VERTEX_SHADER, GLSL.vert),
                fsSrc = GLSL.core + "\n" + (GLSL.hallucinationFn || "") + "\n" + GLSL.modules.z4b_island;
              "undefined" != typeof IS_MOBILE &&
                IS_MOBILE &&
                (fsSrc = "#define MOBILE\n" + fsSrc);
              var fs = z4bIslandLevelCompile(gl.FRAGMENT_SHADER, fsSrc);
              if (!vs || !fs) return null;
              var prog = gl.createProgram();
              return (
                gl.attachShader(prog, vs),
                gl.attachShader(prog, fs),
                gl.linkProgram(prog),
                gl.getProgramParameter(prog, gl.LINK_STATUS)
                  ? prog
                  : (console.error(
                      "[Z4B Island] program link error:",
                      gl.getProgramInfoLog(prog),
                    ),
                    gl.deleteProgram(prog),
                    null)
              );
            })()),
            !z4bIslandLevelProgram)
          )
            return !1;
          ((prog = z4bIslandLevelProgram),
            (z4bIslandLevelUniforms = {
              p: gl.getAttribLocation(prog, "p"),
              res: gl.getUniformLocation(prog, "u_resolution"),
              time: gl.getUniformLocation(prog, "u_time"),
              mouse: gl.getUniformLocation(prog, "u_mouse"),
              mode: gl.getUniformLocation(prog, "u_mode"),
              blink: gl.getUniformLocation(prog, "u_blink"),
              flash: gl.getUniformLocation(prog, "u_flash"),
              shake: gl.getUniformLocation(prog, "u_shake"),
              wake: gl.getUniformLocation(prog, "u_wake"),
              modeSeed: gl.getUniformLocation(prog, "u_modeSeed"),
              audio: gl.getUniformLocation(prog, "u_audio"),
              texSize: gl.getUniformLocation(prog, "u_texSize"),
              modeTime: gl.getUniformLocation(prog, "u_modeTime"),
              trip: gl.getUniformLocation(prog, "u_trip"),
              walk: gl.getUniformLocation(prog, "u_walk"),
              isOOB: gl.getUniformLocation(prog, "u_isOOB"),
            }),
            z4bIslandLevelQuad ||
              ((z4bIslandLevelQuad = gl.createBuffer()),
              gl.bindBuffer(gl.ARRAY_BUFFER, z4bIslandLevelQuad),
              gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 3, -1, -1, 3]),
                gl.STATIC_DRAW,
              )),
            gl.useProgram(z4bIslandLevelProgram),
            (function (prog) {
              var tex,
                maxUnits = 8;
              try {
                maxUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8;
              } catch (e) {}
              z4bIslandLevelBlackTex ||
                ((tex = gl.createTexture()),
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
                  new Uint8Array([0, 0, 0, 255]),
                ),
                gl.texParameteri(
                  gl.TEXTURE_2D,
                  gl.TEXTURE_MIN_FILTER,
                  gl.LINEAR,
                ),
                gl.texParameteri(
                  gl.TEXTURE_2D,
                  gl.TEXTURE_MAG_FILTER,
                  gl.LINEAR,
                ),
                gl.texParameteri(
                  gl.TEXTURE_2D,
                  gl.TEXTURE_WRAP_S,
                  gl.CLAMP_TO_EDGE,
                ),
                gl.texParameteri(
                  gl.TEXTURE_2D,
                  gl.TEXTURE_WRAP_T,
                  gl.CLAMP_TO_EDGE,
                ),
                (z4bIslandLevelBlackTex = tex));
              for (var i = 0; i < maxUnits; i++)
                (gl.activeTexture(gl.TEXTURE0 + i),
                  gl.bindTexture(gl.TEXTURE_2D, z4bIslandLevelBlackTex));
              var names = [
                "u_texB1",
                "u_texB2",
                "u_texB3",
                "u_texB4",
                "u_texB5",
                "u_texB6",
                "u_water",
                "u_texWindow",
                "u_texEnv1",
                "u_texEnv2",
                "u_texEnv3",
                "u_texEnv4",
                "u_texEnv5",
                "u_texEnv6",
                "u_voidTex",
              ];
              for (i = 0; i < names.length; i++) {
                var loc = null;
                try {
                  loc = gl.getUniformLocation(prog, names[i]);
                } catch (e) {}
                loc && gl.uniform1i(loc, Math.min(i, maxUnits - 1));
              }
            })(z4bIslandLevelProgram));
          var startT = performance.now(),
            lastT = startT,
            lastDraw = 0,
            seed = 1e3 * Math.random();
          return (
            requestAnimationFrame(function frame(now) {
              if (
                token === z4bIslandLevelToken &&
                !0 === window.__z4bIslandActive &&
                !0 !== window.__z4bIslandReturnToZone2 &&
                (requestAnimationFrame(frame),
                !(now - lastDraw < 33.333333333333336))
              ) {
                var dt = now - lastT;
                if (
                  ((dt > 250 || dt < 0) && (dt = 33.33),
                  (lastT = now),
                  (lastDraw = now),
                  "number" == typeof window.__z4bIslandDebugWalkTarget &&
                  isFinite(window.__z4bIslandDebugWalkTarget)
                    ? ((escapeState.walk = window.__z4bIslandDebugWalkTarget),
                      (window.__z4bIslandRawWalk = escapeState.walk),
                      delete window.__z4bIslandDebugWalk,
                      delete window.__z4bIslandDebugWalkTarget,
                      delete window.__z4bIslandDebugWalkBase)
                    : z4bIslandLevelSpaceHeld &&
                      (escapeState.walk +=
                        0.001 *
                        dt *
                        (escapeState.escape ||
                        !0 === window.__z4bIslandEscapeActive
                          ? 0.28
                          : 0.92)),
                  (window.__z4bIslandRawWalk = escapeState.walk),
                  gl.bindFramebuffer(gl.FRAMEBUFFER, null),
                  gl.viewport(0, 0, targetCanvas.width, targetCanvas.height),
                  gl.clearColor(0, 0, 0, 1),
                  gl.clear(gl.COLOR_BUFFER_BIT),
                  gl.useProgram(z4bIslandLevelProgram),
                  gl.bindBuffer(gl.ARRAY_BUFFER, z4bIslandLevelQuad),
                  z4bIslandLevelUniforms.p >= 0 &&
                    (gl.enableVertexAttribArray(z4bIslandLevelUniforms.p),
                    gl.vertexAttribPointer(
                      z4bIslandLevelUniforms.p,
                      2,
                      gl.FLOAT,
                      !1,
                      0,
                      0,
                    )),
                  z4bIslandLevelUniforms.res &&
                    gl.uniform2f(
                      z4bIslandLevelUniforms.res,
                      targetCanvas.width,
                      targetCanvas.height,
                    ),
                  z4bIslandLevelUniforms.time &&
                    gl.uniform1f(z4bIslandLevelUniforms.time, 0.001 * now),
                  z4bIslandLevelUniforms.mouse &&
                    gl.uniform2f(
                      z4bIslandLevelUniforms.mouse,
                      window.__z4bIslandLookX || 0,
                      window.__z4bIslandLookY || 0,
                    ),
                  z4bIslandLevelUniforms.mode &&
                    gl.uniform1i(z4bIslandLevelUniforms.mode, 0),
                  z4bIslandLevelUniforms.blink &&
                    gl.uniform1f(z4bIslandLevelUniforms.blink, 0),
                  z4bIslandLevelUniforms.flash &&
                    gl.uniform1f(z4bIslandLevelUniforms.flash, 0),
                  z4bIslandLevelUniforms.shake &&
                    gl.uniform1f(z4bIslandLevelUniforms.shake, 0),
                  z4bIslandLevelUniforms.wake &&
                    gl.uniform1f(
                      z4bIslandLevelUniforms.wake,
                      (function (now) {
                        var start = window.__z4bIslandWakeStart,
                          dur = window.__z4bIslandWakeDuration;
                        if (
                          "number" != typeof start ||
                          !isFinite(start) ||
                          "number" != typeof dur ||
                          !isFinite(dur) ||
                          dur <= 0
                        )
                          return 1;
                        var t = islandClamp((now - start) / dur, 0, 1);
                        return (
                          t >= 1 &&
                            ((window.__z4bIslandWakeStart = 0),
                            (window.__z4bIslandWakeDuration = 0)),
                          t
                        );
                      })(now),
                    ),
                  z4bIslandLevelUniforms.modeSeed &&
                    gl.uniform1f(z4bIslandLevelUniforms.modeSeed, seed),
                  z4bIslandLevelUniforms.audio &&
                    gl.uniform1f(z4bIslandLevelUniforms.audio, 0),
                  z4bIslandLevelUniforms.texSize &&
                    gl.uniform2f(z4bIslandLevelUniforms.texSize, 1, 1),
                  z4bIslandLevelUniforms.modeTime &&
                    gl.uniform1f(
                      z4bIslandLevelUniforms.modeTime,
                      0.001 * (now - startT),
                    ),
                  z4bIslandLevelUniforms.trip)
                ) {
                  var islandMoved = Math.max(
                      0,
                      escapeState.walk - (escapeState.escapeWalk0 || 0),
                    ),
                    islandLevel = escapeState.escape
                      ? islandMoved >= 4.8
                        ? 5
                        : 4
                      : 2,
                    islandTrip =
                      "function" == typeof window.__hallucinationTripForLevel
                        ? window.__hallucinationTripForLevel(islandLevel)
                        : 0.32 * islandLevel;
                  gl.uniform1f(z4bIslandLevelUniforms.trip, islandTrip);
                }
                (z4bIslandLevelUniforms.walk &&
                  gl.uniform1f(z4bIslandLevelUniforms.walk, escapeState.walk),
                  z4bIslandLevelUniforms.isOOB &&
                    gl.uniform1f(z4bIslandLevelUniforms.isOOB, 0),
                  bindIslandRuntime(),
                  gl.drawArrays(gl.TRIANGLES, 0, 3));
              }
            }),
            !0
          );
        }),
        (window.__z4bIslandGoPlaneDoor = function () {
          var now = performance.now();
          return (
            (escapeState.escape = !0),
            (escapeState.escapeWalk0 = escapeState.walk - 2.75),
            (escapeState.flashStart = now),
            (escapeState.stareStarted = 0),
            (escapeState.autoBlinkStage = 3),
            (escapeState.blinks = 2),
            (escapeState.stareBlinkCount = 2),
            (window.__z4bIslandMoaiBlinkArmed = !1),
            (window.__z4bIslandEscapeActive = !0),
            (window.__z4bIslandEscapeWalk0 = escapeState.escapeWalk0),
            (window.__z4bIslandEscapeFlashStart = escapeState.flashStart),
            !0
          );
        }),
        (window.__z4bIslandGoPlaneCabin = function () {
          var now = performance.now();
          return (
            (escapeState.escape = !0),
            (escapeState.escapeWalk0 = escapeState.walk - 5.2),
            (escapeState.flashStart = now),
            (escapeState.stareStarted = 0),
            (escapeState.autoBlinkStage = 3),
            (escapeState.blinks = 2),
            (escapeState.stareBlinkCount = 2),
            (window.__z4bIslandMoaiBlinkArmed = !1),
            (window.__z4bIslandEscapeActive = !0),
            (window.__z4bIslandEscapeWalk0 = escapeState.escapeWalk0),
            (window.__z4bIslandEscapeFlashStart = escapeState.flashStart),
            !0
          );
        }),
        (window.__z4bIslandForceBlink = forceBlink),
        (window.__z4bIslandEscapeActivate = activateEscape),
        (window.__z4bIslandEscapeIsStaring = isStaringAtSelfMoai),
        (window.__z4bIslandLockLook = lockLook),
        (window.__z4bInstallIslandRuntime = install),
        install());
    }
    function islandClamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }
    function islandDragDelta(dx, dy) {
      (("number" == typeof dx && isFinite(dx)) || (dx = 0),
        ("number" == typeof dy && isFinite(dy)) || (dy = 0));
      var w = Math.max(1, window.innerWidth || 1),
        sy = 2.7 / Math.max(1, window.innerHeight || 1);
      ((islandTargetLookX = islandClamp(
        islandTargetLookX + dx * (3.8 / w),
        -1.65,
        1.65,
      )),
        (islandTargetLookY = islandClamp(
          islandTargetLookY - dy * sy,
          -0.95,
          0.95,
        )),
        performance.now(),
        (islandLookReady = !0));
    }
    function num(v) {
      return "number" == typeof v && isFinite(v);
    }
    function len(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    function norm(v) {
      var l = len(v) || 1;
      return {
        x: v.x / l,
        y: v.y / l,
      };
    }
    function dot(a, b) {
      return a.x * b.x + a.y * b.y;
    }
    function boundaryAt(a) {
      var r = (function (a) {
        return (
          1 +
          0.075 * Math.sin(2 * a + 0.4) +
          0.055 * Math.sin(5 * a - 1.6) +
          0.04 * Math.sin(9 * a + 2.1)
        );
      })(a);
      return {
        x: 30 * Math.cos(a) * r,
        y: 17 * Math.sin(a) * r,
      };
    }
    function outDir(a) {
      var b = boundaryAt(a);
      return norm({
        x: b.x + 0.001,
        y: b.y,
      });
    }
    function pathPoint(a) {
      var b = boundaryAt(a),
        o = outDir(a),
        wob = 0.42 * Math.sin(3 * a + 1.1) + 0.22 * Math.sin(7 * a - 0.3);
      return {
        x: b.x - o.x * (3.4 + wob),
        y: b.y - o.y * (3.4 + wob),
      };
    }
    function makeTexture(spec) {
      if ("undefined" == typeof gl) return null;
      if (textures[spec.key]) return textures[spec.key];
      var tex = gl.createTexture();
      ((textures[spec.key] = tex),
        (ready[spec.key] = !1),
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
          new Uint8Array(spec.pixel),
        ),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE));
      var img = new Image();
      return (
        (img.crossOrigin = "anonymous"),
        (img.onload = function () {
          (gl.bindTexture(gl.TEXTURE_2D, tex),
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !1),
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              img,
            ),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
            (ready[spec.key] = !0),
            console.log(
              "[mode-island] loaded:",
              spec.path,
              img.width,
              img.height,
            ));
        }),
        (img.onerror = function () {
          ((ready[spec.key] = !1),
            console.error("[mode-island] failed:", spec.path));
        }),
        (img.src = spec.path + "?z4bMoai=" + Date.now()),
        tex
      );
    }
    function z4bCurrentProgramIsIsland() {
      if ("undefined" == typeof gl) return !1;
      var prog = null;
      try {
        prog = gl.getParameter(gl.CURRENT_PROGRAM);
      } catch (e) {
        return !1;
      }
      if (!prog) return !1;
      try {
        return !!(
          gl.getUniformLocation(prog, "u_z4bMoaiReady") ||
          gl.getUniformLocation(prog, "u_z4bWingReady") ||
          gl.getUniformLocation(prog, "u_z4bPalmLeafReady") ||
          gl.getUniformLocation(prog, "u_z4bIslandEscape")
        );
      } catch (e) {
        return !1;
      }
    }
    function islandBlinkEase(t) {
      return (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t);
    }
    function islandBlinkValue(t) {
      ("number" == typeof t && isFinite(t)) || (t = performance.now());
      var ov,
        start = -1,
        v = 0;
      if (
        ("number" == typeof blinkState.forceStart && blinkState.forceStart > 0
          ? (start = blinkState.forceStart)
          : (blinkState.next ||
              (function (t) {
                blinkState.next = t + 6500 + 9e3 * Math.random();
              })(t),
            !blinkState.active &&
              t >= blinkState.next &&
              ((blinkState.active = !0),
              (blinkState.start = t),
              (blinkState.next = t + 6500 + 9e3 * Math.random())),
            blinkState.active && (start = blinkState.start)),
        start >= 0)
      ) {
        var age = t - start;
        age < 135
          ? (v = islandBlinkEase(age / 135))
          : age < 220
            ? (v = 1)
            : age < 370
              ? (v = 1 - islandBlinkEase((age - 135 - 85) / 150))
              : ((v = 0),
                (blinkState.active = !1),
                (blinkState.start = -1),
                (blinkState.forceStart = 0));
      }
      return (
        (v = Math.max(0, Math.min(1, v))),
        (blinkState.value = v),
        (escapeState.blink = v),
        (window.__z4bIslandBlinkValue = v),
        (ov = document.getElementById("z4b-island-blink-overlay")) &&
          ov.parentNode &&
          ov.parentNode.removeChild(ov),
        v
      );
    }
    function isStaringAtSelfMoai() {
      if (!0 !== window.__z4bIslandActive && !z4bCurrentProgramIsIsland())
        return !1;
      if (escapeState.escape) return !1;
      var mx = escapeState.mouseX,
        my = escapeState.mouseY;
      (num(window.__z4bIslandLookX) && (mx = window.__z4bIslandLookX),
        num(window.__z4bIslandLookY) && (my = window.__z4bIslandLookY));
      var p,
        o,
        a = (function (a, b) {
          return ((a % b) + b) % b;
        })(0.235 * escapeState.walk, TAU),
        p0 = pathPoint(a - 0.035),
        p1 = pathPoint(a + 0.035),
        pathT = norm({
          x: p1.x - p0.x,
          y: p1.y - p0.y,
        }),
        shoreD = outDir(a),
        cam = pathPoint(a),
        look = (function (v, a) {
          var c = Math.cos(a),
            s = Math.sin(a);
          return {
            x: c * v.x - s * v.y,
            y: s * v.x + c * v.y,
          };
        })(
          norm({
            x: pathT.x + 0.95 * shoreD.x,
            y: pathT.y + 0.95 * shoreD.y,
          }),
          2.05 * mx + Math.PI,
        ),
        self =
          ((p = pathPoint(3.72)),
          (o = outDir(3.72)),
          {
            x: p.x - 8.8 * o.x,
            y: p.y - 8.8 * o.y,
          }),
        faceDir = norm({
          x: Math.cos(-2.787223),
          y: Math.sin(-2.787223),
        }),
        faceSide = {
          x: -faceDir.y,
          y: faceDir.x,
        },
        eyeTarget = {
          x: self.x + 1.1 * faceDir.x,
          y: self.y + 1.1 * faceDir.y,
        },
        rel = {
          x: cam.x - eyeTarget.x,
          y: cam.y - eyeTarget.y,
        },
        guideForward = dot(rel, faceDir),
        guideAcross = dot(rel, faceSide),
        nearStatue =
          len({
            x: cam.x - self.x,
            y: cam.y - self.y,
          }) < 9.25,
        halfWidth =
          0.72 + 0.86 * Math.max(0, Math.min(1, (guideForward - 0.05) / 8.85)),
        standingInFront =
          nearStatue &&
          guideForward > 0.05 &&
          guideForward < 8.9 &&
          Math.abs(guideAcross) < halfWidth,
        toEye = {
          x: eyeTarget.x - cam.x,
          y: eyeTarget.y - cam.y,
        },
        d = len(toEye),
        aim = dot(look, norm(toEye)),
        ahead = dot(toEye, look),
        perpx = toEye.x - look.x * ahead,
        perpy = toEye.y - look.y * ahead,
        miss = Math.sqrt(perpx * perpx + perpy * perpy),
        pitchOK = Math.abs(my) < 0.92,
        distanceOK = d > 0.35 && d < 9.6,
        facingMoai =
          ahead > -0.08 && aim > 0.3 && miss < Math.max(1.18, 0.68 * d),
        ok = standingInFront && pitchOK && distanceOK && facingMoai;
      return (
        (escapeState.lastAim = aim),
        (escapeState.lastDistance = d),
        (escapeState.lastRayMiss = miss),
        (escapeState.lastForwardDist = ahead),
        (escapeState.lastGuideForward = guideForward),
        (escapeState.lastGuideAcross = guideAcross),
        (escapeState.lastStandingInGuide = standingInFront),
        (escapeState.lastPitchOK = pitchOK),
        (escapeState.lastDistanceOK = distanceOK),
        (escapeState.lastFacingMoaiOK = facingMoai),
        (escapeState.lastTightFacingOK = facingMoai),
        (escapeState.lastMoaiEyeTargetX = eyeTarget.x),
        (escapeState.lastMoaiEyeTargetY = eyeTarget.y),
        (escapeState.lastMouseX = mx),
        (escapeState.lastMouseY = my),
        (escapeState.lastGuideFrontMin = 0.05),
        (escapeState.lastGuideFrontMax = 8.9),
        (escapeState.lastGuideHalfWidth = halfWidth),
        (escapeState.lastMoaiFaceDirX = faceDir.x),
        (escapeState.lastMoaiFaceDirY = faceDir.y),
        (escapeState.lastStareCheck = performance.now()),
        (window.__z4bIslandSelfMoaiStaring = ok),
        (window.__z4bIslandEscapeDebug = escapeState),
        ok
      );
    }
    function countIslandBlink(v) {
      (("number" == typeof v && isFinite(v)) || (v = 0),
        (escapeState.blink = v),
        (window.__z4bIslandBlinkValue = v),
        v > 0.55 &&
          !0 !== escapeState._moaiBlinkHigh &&
          ((escapeState._moaiBlinkHigh = !0),
          (escapeState.lastBlinkPeak = performance.now())),
        v < 0.18 && (escapeState._moaiBlinkHigh = !1));
    }
    function bindIslandRuntime() {
      if ("undefined" != typeof gl && z4bCurrentProgramIsIsland()) {
        !(function () {
          for (var i = 0; i < texSpecs.length; i++) makeTexture(texSpecs[i]);
        })();
        var prog = null;
        try {
          prog = gl.getParameter(gl.CURRENT_PROGRAM);
        } catch (e) {
          return;
        }
        if (prog) {
          !(function () {
            if (
              !0 === window.__z4bIslandActive ||
              z4bCurrentProgramIsIsland()
            ) {
              var t = performance.now(),
                staring = isStaringAtSelfMoai();
              if (
                ((window.__z4bIslandSelfMoaiStaring = staring),
                (window.__z4bIslandEscapeDebug = escapeState),
                !escapeState.escape)
              ) {
                if (
                  (staring && (escapeState.lastValidStare = t),
                  !staring && !escapeState.sequenceLocked)
                )
                  return (
                    (escapeState.stareStarted = 0),
                    (escapeState.sequenceStart = 0),
                    (escapeState.autoBlinkStage = 0),
                    (escapeState.blinks = 0),
                    (escapeState.stareBlinkCount = 0),
                    (escapeState._moaiBlinkHigh = !1),
                    (escapeState._escapeQueued = !1),
                    void (window.__z4bIslandMoaiBlinkArmed = !1)
                  );
                if (
                  (staring &&
                    !escapeState.stareStarted &&
                    ((escapeState.stareStarted = t),
                    (escapeState.lastValidStare = t),
                    (escapeState.sequenceLocked = !1),
                    (escapeState.sequenceStart = 0),
                    (escapeState.autoBlinkStage = 0),
                    (escapeState.blinks = 0),
                    (escapeState.stareBlinkCount = 0),
                    (escapeState._moaiBlinkHigh = !1),
                    (escapeState._escapeQueued = !1),
                    (blinkState.active = !1),
                    (blinkState.start = -1),
                    (blinkState.forceStart = 0),
                    (blinkState.next = t + 9e3),
                    (window.__z4bIslandMoaiBlinkArmed = !1)),
                  escapeState.sequenceLocked)
                ) {
                  var lastGood =
                    "number" == typeof escapeState.lastValidStare
                      ? escapeState.lastValidStare
                      : 0;
                  if (!staring && (!lastGood || t - lastGood > 1200))
                    return (
                      (escapeState.stareStarted = 0),
                      (escapeState.sequenceLocked = !1),
                      (escapeState.sequenceStart = 0),
                      (escapeState.autoBlinkStage = 0),
                      (escapeState.blinks = 0),
                      (escapeState.stareBlinkCount = 0),
                      (escapeState._moaiBlinkHigh = !1),
                      (escapeState._escapeQueued = !1),
                      (blinkState.forceStart = 0),
                      void (window.__z4bIslandMoaiBlinkArmed = !1)
                    );
                }
                var age = t - escapeState.stareStarted;
                if (
                  (!escapeState.sequenceLocked &&
                    staring &&
                    age > 240 &&
                    ((escapeState.sequenceLocked = !0),
                    (escapeState.sequenceStart = t),
                    (escapeState.autoBlinkStage = 0),
                    (blinkState.active = !1),
                    (blinkState.start = -1),
                    (blinkState.forceStart = 0),
                    (blinkState.next = t + 9e3)),
                  escapeState.sequenceLocked)
                ) {
                  var seqAge = t - escapeState.sequenceStart;
                  (seqAge > 360 &&
                    escapeState.autoBlinkStage < 1 &&
                    ((escapeState.autoBlinkStage = 1),
                    (escapeState.blinks = 1),
                    (escapeState.stareBlinkCount = 1),
                    forceBlink()),
                    seqAge > 1420 &&
                      escapeState.autoBlinkStage < 2 &&
                      ((escapeState.autoBlinkStage = 2),
                      (escapeState.blinks = 2),
                      (escapeState.stareBlinkCount = 2),
                      forceBlink()),
                    seqAge > 1780 &&
                      escapeState.autoBlinkStage >= 2 &&
                      !escapeState.escape &&
                      ((window.__z4bIslandMoaiBlinkArmed = !0),
                      (window.__z4bIslandMoaiBlinkArmedAt = t),
                      activateEscape(!0)));
                }
              }
            }
          })();
          var now = performance.now(),
            flash =
              escapeState.escape && escapeState.flashStart > 0
                ? Math.max(0, 1 - (now - escapeState.flashStart) / 620)
                : 0,
            age =
              escapeState.escape && escapeState.flashStart > 0
                ? Math.max(0, 0.001 * (now - escapeState.flashStart))
                : 0;
          !escapeState.escape ||
            escapeState.returnedToZone2 ||
            (escapeState.walk - (escapeState.escapeWalk0 || 0) >= 12.1 &&
              (escapeState.returnedToZone2 ||
                !0 === window.__z4bIslandCabinHandoffActive ||
                ((window.__z4bIslandCabinHandoffActive = !0),
                (window.__z4bIslandCabinHandoffStartedAt = performance.now()),
                (z4bIslandLevelSpaceHeld = !1),
                z4bIslandSetHandoffFog(!0),
                setTimeout(function () {
                  !(function () {
                    if (escapeState.returnedToZone2) return !0;
                    (!(function () {
                      if (!0 === window.__z4bZone2ControlsSuppressorInstalled)
                        return !0;
                      window.__z4bZone2ControlsSuppressorInstalled = !0;
                      var install = function () {
                        if (
                          "function" != typeof window.showTransientCenterOverlay
                        )
                          return !1;
                        if (
                          !0 ===
                          window.showTransientCenterOverlay.__z4bSuppressWrapped
                        )
                          return !0;
                        var base = window.showTransientCenterOverlay;
                        return (
                          (window.showTransientCenterOverlay = function (src) {
                            var now = performance.now(),
                              suppressUntil =
                                "number" ==
                                typeof window.__z4bSuppressZone2ControlsUntil
                                  ? window.__z4bSuppressZone2ControlsUntil
                                  : 0,
                              img = String(src || "");
                            return (
                              !(
                                (img.indexOf("ctrls.png") >= 0 ||
                                  img.indexOf("ctrl.png") >= 0 ||
                                  img.indexOf("/ctrls") >= 0 ||
                                  img.indexOf("/ctrl") >= 0) &&
                                now < suppressUntil
                              ) && base.apply(this, arguments)
                            );
                          }),
                          (window.showTransientCenterOverlay.__z4bSuppressWrapped =
                            !0),
                          (window.showTransientCenterOverlay.__z4bBase = base),
                          !0
                        );
                      };
                      if (!install())
                        var tries = 0,
                          timer = setInterval(function () {
                            (tries++,
                              (install() || tries > 40) &&
                                clearInterval(timer));
                          }, 50);
                    })(),
                      (window.__z4bSuppressZone2ControlsUntil =
                        performance.now() + 3600),
                      (escapeState.returnedToZone2 = !0),
                      (window.__z4bIslandReturnToZone2 = !0),
                      (window.__z4bIslandRouteBlockUntil =
                        performance.now() + 12e3),
                      (window.__z4Route = !1),
                      (window.__z4RouteActive = !1),
                      (window.__z4bIslandActive = !1),
                      (window.__z4bIslandEscapeActive = !1),
                      (window.__z4bIslandMoaiBlinkArmed = !1),
                      z4bIslandSetHandoffFog(!0),
                      "function" == typeof window.startZone4 &&
                        !0 !== window.__z4bIslandStartZone4GuardInstalled &&
                        ((window.__z4bIslandStartZone4GuardInstalled = !0),
                        (window.__z4bIslandStartZone4Base = window.startZone4),
                        (window.startZone4 = function () {
                          return (
                            !(
                              "number" ==
                                typeof window.__z4bIslandRouteBlockUntil &&
                              performance.now() <
                                window.__z4bIslandRouteBlockUntil
                            ) &&
                            window.__z4bIslandStartZone4Base.apply(
                              this,
                              arguments,
                            )
                          );
                        })));
                    try {
                      ((window.isEngine1Dead = !0),
                        "undefined" != typeof currentEngine &&
                          currentEngine &&
                          (currentEngine.destroy && currentEngine.destroy(),
                          (currentEngine = null)),
                        "undefined" != typeof leftEngine &&
                          leftEngine &&
                          (leftEngine.destroy && leftEngine.destroy(),
                          (leftEngine = null)),
                        "undefined" != typeof rightEngine &&
                          rightEngine &&
                          (rightEngine.destroy && rightEngine.destroy(),
                          (rightEngine = null)),
                        "undefined" != typeof backEngine &&
                          backEngine &&
                          (backEngine.destroy && backEngine.destroy(),
                          (backEngine = null)),
                        window.currentZone3 &&
                          (window.currentZone3.destroy &&
                            window.currentZone3.destroy(),
                          (window.currentZone3 = null)),
                        window.currentZone4 &&
                          (window.currentZone4.destroy &&
                            window.currentZone4.destroy(),
                          (window.currentZone4 = null)));
                    } catch (e) {}
                    var canvas = document.getElementById("c");
                    (canvas && (canvas.style.transform = ""),
                      "function" != typeof window.startZone2
                        ? z4bIslandSetHandoffFog(!1)
                        : (window.startZone2({
                            fromIslandCrashReturn: !0,
                            framedKitchenForward: !0,
                          }),
                          z4bIslandScrubZone2FromCabin(),
                          setTimeout(z4bIslandScrubZone2FromCabin, 30),
                          setTimeout(z4bIslandScrubZone2FromCabin, 90),
                          setTimeout(z4bIslandScrubZone2FromCabin, 180),
                          setTimeout(z4bIslandScrubZone2FromCabin, 420),
                          setTimeout(function () {
                            ((window.__z4bIslandCabinHandoffActive = !1),
                              z4bIslandSetHandoffFog(!1));
                          }, 360)));
                  })();
                }, 430))));
          var bv = islandBlinkValue(now);
          countIslandBlink(bv);
          var blinkLoc = null,
            escapeLoc = null,
            flashLoc = null,
            ageLoc = null,
            walk0Loc = null,
            guideLoc = null,
            guideOKLoc = null;
          try {
            blinkLoc = gl.getUniformLocation(prog, "u_blink");
          } catch (e) {}
          try {
            escapeLoc = gl.getUniformLocation(prog, "u_z4bIslandEscape");
          } catch (e) {}
          try {
            flashLoc = gl.getUniformLocation(prog, "u_z4bIslandEscapeFlash");
          } catch (e) {}
          try {
            ageLoc = gl.getUniformLocation(prog, "u_z4bIslandEscapeAge");
          } catch (e) {}
          try {
            walk0Loc = gl.getUniformLocation(prog, "u_z4bIslandEscapeWalk0");
          } catch (e) {}
          try {
            guideLoc = gl.getUniformLocation(prog, "u_z4bIslandDebugGuide");
          } catch (e) {}
          try {
            guideOKLoc = gl.getUniformLocation(prog, "u_z4bIslandDebugGuideOK");
          } catch (e) {}
          (blinkLoc && gl.uniform1f(blinkLoc, bv),
            escapeLoc && gl.uniform1f(escapeLoc, escapeState.escape ? 1 : 0),
            flashLoc && gl.uniform1f(flashLoc, flash),
            ageLoc && gl.uniform1f(ageLoc, age),
            walk0Loc && gl.uniform1f(walk0Loc, escapeState.escapeWalk0 || 0),
            guideLoc && gl.uniform1f(guideLoc, 0),
            guideOKLoc && gl.uniform1f(guideOKLoc, 0));
          var maxUnits = 8;
          try {
            maxUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8;
          } catch (e) {}
          for (var i = 0; i < texSpecs.length; i++) {
            var spec = texSpecs[i];
            if (!(spec.unit >= maxUnits)) {
              var tex = makeTexture(spec);
              if (tex) {
                (gl.activeTexture(gl.TEXTURE0 + spec.unit),
                  gl.bindTexture(gl.TEXTURE_2D, tex));
                for (var j = 0; j < spec.names.length; j++) {
                  var loc = null;
                  try {
                    loc = gl.getUniformLocation(prog, spec.names[j]);
                  } catch (e) {}
                  loc && gl.uniform1i(loc, spec.unit);
                }
                if (spec.ready) {
                  var readyLoc = null;
                  try {
                    readyLoc = gl.getUniformLocation(prog, spec.ready);
                  } catch (e) {}
                  readyLoc && gl.uniform1f(readyLoc, ready[spec.key] ? 1 : 0);
                }
              }
            }
          }
          var moaiReadyLoc = null;
          try {
            moaiReadyLoc = gl.getUniformLocation(prog, "u_z4bMoaiReady");
          } catch (e) {}
          moaiReadyLoc && gl.uniform1f(moaiReadyLoc, 1);
        }
      }
    }
    function lockLook(x, y) {
      (!(function (x, y) {
        (("number" == typeof x && isFinite(x)) || (x = islandLookX),
          ("number" == typeof y && isFinite(y)) || (y = islandLookY),
          (islandLookX = islandClamp(x, -1.65, 1.65)),
          (islandLookY = islandClamp(y, -0.95, 0.95)),
          (islandTargetLookX = islandLookX),
          (islandTargetLookY = islandLookY),
          (islandLookReady = !0),
          (islandLookLastT = performance.now()),
          (window.__z4bIslandLookX = islandLookX),
          (window.__z4bIslandLookY = islandLookY));
      })(x, y),
        (escapeState.mouseX = islandLookX),
        (escapeState.mouseY = islandLookY),
        (window.__z4bIslandLookX = islandLookX),
        (window.__z4bIslandLookY = islandLookY));
    }
    function forceBlink() {
      var t = performance.now();
      return (
        (blinkState.forceStart = t),
        (blinkState.active = !1),
        (blinkState.start = -1),
        (blinkState.value = 0),
        (blinkState.next = t + 9e3),
        (window.__z4bIslandBlinkPulseTime = t),
        !0
      );
    }
    function activateEscape(force) {
      return (
        (!0 === force || !0 === window.__z4bIslandMoaiBlinkArmed) &&
        (escapeState.escape ||
          ((escapeState.escape = !0),
          (escapeState.escapeWalk0 = escapeState.walk),
          (escapeState.flashStart = performance.now()),
          (escapeState.stareStarted = 0),
          (escapeState.sequenceLocked = !1),
          (escapeState.sequenceStart = 0),
          (escapeState.autoBlinkStage = 3),
          (escapeState.blinks = 2),
          (escapeState.stareBlinkCount = 2),
          (escapeState._escapeQueued = !1),
          (escapeState.returnedToZone2 = !1),
          (window.__z4bIslandMoaiBlinkArmed = !1),
          (window.__z4bIslandEscapeActive = !0),
          (window.__z4bIslandEscapeWalk0 = escapeState.escapeWalk0),
          (window.__z4bIslandEscapeFlashStart = escapeState.flashStart),
          (window.__z4bIslandReturnToZone2 = !1)),
        !0)
      );
    }
    function z4bIslandSetHandoffFog(on) {
      var ov = (function () {
          var ov = document.getElementById("z4b-island-cabin-handoff-fog");
          return (
            ov ||
              (((ov = document.createElement("div")).id =
                "z4b-island-cabin-handoff-fog"),
              (ov.style.cssText = [
                "position:fixed",
                "inset:0",
                "z-index:2147483647",
                "pointer-events:none",
                "opacity:0",
                "transition:opacity 420ms ease",
                "background:",
                "radial-gradient(circle at 50% 54%, rgba(190,230,255,0.92) 0%, rgba(90,150,205,0.74) 32%, rgba(8,18,38,0.96) 78%),",
                "linear-gradient(180deg, rgba(120,190,255,0.26), rgba(0,8,28,0.90))",
                ";",
                "backdrop-filter:blur(13px) saturate(1.30) brightness(1.12)",
                "-webkit-backdrop-filter:blur(13px) saturate(1.30) brightness(1.12)",
                "will-change:opacity",
              ].join(";")),
              document.body.appendChild(ov)),
            ov
          );
        })(),
        canvas = document.getElementById("c");
      return (
        canvas &&
          ((canvas.style.transition = "filter 420ms ease"),
          (canvas.style.filter = on
            ? "blur(7px) saturate(1.28) brightness(1.16)"
            : "")),
        requestAnimationFrame(function () {
          ov.style.opacity = on ? "1" : "0";
        }),
        on ||
          setTimeout(function () {
            var kill = document.getElementById("z4b-island-cabin-handoff-fog");
            kill && kill.parentNode && kill.parentNode.removeChild(kill);
            var c = document.getElementById("c");
            c && ((c.style.filter = ""), (c.style.transition = ""));
          }, 520),
        ov
      );
    }
    function z4bIslandScrubZone2FromCabin() {
      ((window.__z4Route = !1),
        (window.__z4RouteActive = !1),
        (window.__z4bIslandActive = !1),
        (window.__z4bIslandEscapeActive = !1),
        (window.__z4bIslandMoaiBlinkArmed = !1));
      var z2 = window.currentZone2;
      return (
        !!z2 &&
        ((z2.activePOV = "center"),
        (z2.pendingPOV = null),
        (z2.slideState = "idle"),
        (z2.slideOffset = 0),
        (z2.slideDir = 0),
        (z2.povSwitchTime = performance.now()),
        (z2.facing = "S"),
        (z2.hallwayYaw = Math.PI),
        (z2.hallwayYawTarget = Math.PI),
        "number" == typeof z2.INTERSECTION_Z
          ? (z2.camZ = z2.INTERSECTION_Z - 0.75)
          : (z2.camZ = 1.65),
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
        (z2.__fromIslandCabin = !0),
        z2.enableFramedKitchenForwardWall &&
          z2.enableFramedKitchenForwardWall(),
        (z2.__z4RouteDisabledUntil = performance.now() + 12e3),
        (window.mx = 0),
        (window.my = 0),
        (window.z2SpaceHeld = !1),
        (window.z2TouchHeld = !1),
        !0)
      );
    }
    function install() {
      if ("undefined" != typeof gl) {
        if (!gl.__z4bIslandRuntimeDrawHookInstalled) {
          gl.__z4bIslandRuntimeDrawHookInstalled = !0;
          var baseGet = gl.getUniformLocation.bind(gl),
            base1f = gl.uniform1f.bind(gl),
            base2f = gl.uniform2f.bind(gl),
            baseDrawArrays = gl.drawArrays.bind(gl),
            baseDrawElements = gl.drawElements
              ? gl.drawElements.bind(gl)
              : null;
          ((gl.getUniformLocation = function (prog, name) {
            var loc = baseGet(prog, name);
            if (loc && "string" == typeof name)
              try {
                locNames.set(loc, name);
              } catch (e) {}
            return loc;
          }),
            (gl.uniform1f = function (loc, value) {
              var name = null;
              try {
                name = locNames.get(loc);
              } catch (e) {}
              if (
                ("u_walk" === name &&
                  ((window.__z4bIslandRawWalk = value),
                  "number" == typeof window.__z4bIslandDebugWalkTarget &&
                    isFinite(window.__z4bIslandDebugWalkTarget) &&
                    (("number" == typeof window.__z4bIslandDebugWalkBase &&
                      isFinite(window.__z4bIslandDebugWalkBase)) ||
                      (window.__z4bIslandDebugWalkBase = value),
                    (value +=
                      window.__z4bIslandDebugWalkTarget -
                      window.__z4bIslandDebugWalkBase)),
                  (escapeState.walk = value)),
                "u_blink" === name &&
                  (!0 === window.__z4bIslandActive ||
                    z4bCurrentProgramIsIsland()))
              ) {
                var bv = islandBlinkValue(performance.now());
                return (countIslandBlink(bv), base1f(loc, bv));
              }
              return (
                "u_blink" === name && (escapeState.blink = value),
                base1f(loc, value)
              );
            }),
            (gl.uniform2f = function (loc, x, y) {
              var name = null;
              try {
                name = locNames.get(loc);
              } catch (e) {}
              if (
                "u_mouse" === name &&
                (!0 === window.__z4bIslandActive || z4bCurrentProgramIsIsland())
              ) {
                var rel = (function () {
                  islandLookReady ||
                    ("number" == typeof window.__z4bIslandLookX &&
                      (islandLookX = window.__z4bIslandLookX),
                    "number" == typeof window.__z4bIslandLookY &&
                      (islandLookY = window.__z4bIslandLookY),
                    (islandTargetLookX = islandLookX),
                    (islandTargetLookY = islandLookY),
                    (islandLookReady = !0),
                    (islandLookLastT = performance.now()));
                  var now = performance.now(),
                    dt = now - islandLookLastT;
                  ((dt > 250 || dt <= 0) && (dt = 33.33),
                    (islandLookLastT = now));
                  var step =
                      dt /
                      ("undefined" != typeof IS_MOBILE && IS_MOBILE
                        ? 50
                        : 33.33),
                    k = Math.min(1, 0.22 * step);
                  return (
                    (islandLookX += (islandTargetLookX - islandLookX) * k),
                    (islandLookY += (islandTargetLookY - islandLookY) * k),
                    (escapeState.mouseX = islandLookX),
                    (escapeState.mouseY = islandLookY),
                    (window.__z4bIslandLookX = islandLookX),
                    (window.__z4bIslandLookY = islandLookY),
                    [islandLookX, islandLookY]
                  );
                })();
                return base2f(loc, rel[0], rel[1]);
              }
              return (
                "u_mouse" === name &&
                  ((escapeState.mouseX = x),
                  (escapeState.mouseY = y),
                  (window.__z4bIslandLookX = x),
                  (window.__z4bIslandLookY = y)),
                base2f(loc, x, y)
              );
            }),
            (gl.drawArrays = function () {
              return (
                z4bCurrentProgramIsIsland() && bindIslandRuntime(),
                baseDrawArrays.apply(gl, arguments)
              );
            }),
            baseDrawElements &&
              (gl.drawElements = function () {
                return (
                  z4bCurrentProgramIsIsland() && bindIslandRuntime(),
                  baseDrawElements.apply(gl, arguments)
                );
              }));
        }
      } else requestAnimationFrame(install);
    }
    function z4bIslandLevelSpaceKey(e) {
      return e && ("Space" === e.code || " " === e.key || "Spacebar" === e.key);
    }
    function z4bIslandLevelCompile(type, source) {
      var sh = gl.createShader(type);
      return (
        gl.shaderSource(sh, source),
        gl.compileShader(sh),
        gl.getShaderParameter(sh, gl.COMPILE_STATUS)
          ? sh
          : (console.error(
              "[Z4B Island] shader compile error:",
              gl.getShaderInfoLog(sh),
            ),
            gl.deleteShader(sh),
            null)
      );
    }
  })(),
  (GLSL.modules.z4b_island = `
uniform float u_walk;
uniform float u_z4bIslandEscape;
uniform float u_z4bIslandEscapeFlash;
uniform float u_z4bIslandEscapeAge;
uniform float u_z4bIslandEscapeWalk0;
uniform float u_z4bIslandDebugGuide;
uniform float u_z4bIslandDebugGuideOK;
uniform sampler2D u_z4bWingTex;
uniform float u_z4bWingReady;
uniform sampler2D u_z4bPalmLeafTex;
uniform float u_z4bPalmLeafReady;
uniform sampler2D u_z4bMoaiFace1;
uniform sampler2D u_z4bMoaiFace2;
uniform sampler2D u_z4bMoaiFace3;
uniform sampler2D u_z4bMoaiFace4;
uniform sampler2D u_z4bMoaiFace5;
uniform sampler2D u_z4bMoaiSide;
uniform sampler2D u_z4bMoaiBack;
uniform float u_z4bMoaiReady;
#ifdef MOBILE
#define u_texEnv3 u_texEnv1
#else
uniform sampler2D u_texEnv3;
#endif

const float ISLE_PI = 3.14159265359;
const float ISLE_TAU = 6.28318530718;
const float ISLE_RX = 30.0;
const float ISLE_RZ = 17.0;
const float ISLE_BEACH_INSET = 3.4;
const float ISLE_PATH_SPEED = 0.235;
const float ISLE_WATER_Y = -0.075;

const float ISLAND_CAB_HALF_LEN   = 11.0;
const float ISLAND_CAB_FUSE_R     = 1.72;
const float ISLAND_CAB_FLOOR_Y    = -0.82;
const float ISLAND_CAB_AISLE_W    = 0.32;
const float ISLAND_CAB_SEAT_PITCH = 0.79;
const float ISLAND_CAB_ROW_START  = -11.0 + 1.8;
const float ISLAND_CAB_EXIT_ROW_Z = -11.0 + 1.8 + 13.0 * 0.79;

float islandCabinDreamEnd(){
  return 72.0;
}

float islandCabinDepthT(float z){
  return clamp((z + ISLAND_CAB_HALF_LEN) / (islandCabinDreamEnd() + ISLAND_CAB_HALF_LEN), 0.0, 1.0);
}

float islandCabinInteriorMask(float z){
  return smoothstep(-ISLAND_CAB_HALF_LEN - 0.30, -ISLAND_CAB_HALF_LEN + 1.05, z) *
         (1.0 - smoothstep(islandCabinDreamEnd() + 1.60, islandCabinDreamEnd() + 4.40, z));
}

mat2 islandRot(float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float islandHash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float islandNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(islandHash(i), islandHash(i + vec2(1.0, 0.0)), u.x),
    mix(islandHash(i + vec2(0.0, 1.0)), islandHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float islandFbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for(int i = 0; i < 4; i++){
    v += islandNoise(p) * a;
    p = islandRot(0.53) * p * 2.02 + vec2(17.7, 11.3);
    a *= 0.5;
  }
  return v;
}

float islandAngle(vec2 p){
  return atan(p.y / ISLE_RZ, p.x / ISLE_RX);
}

float islandRadiusBump(float a){
  return 1.0 + 0.075 * sin(a * 2.0 + 0.4) + 0.055 * sin(a * 5.0 - 1.6) + 0.040 * sin(a * 9.0 + 2.1);
}

vec2 islandBoundaryAt(float a){
  float r = islandRadiusBump(a);
  return vec2(cos(a) * ISLE_RX * r, sin(a) * ISLE_RZ * r);
}

vec2 islandOutDir(float a){
  vec2 b = islandBoundaryAt(a);
  return normalize(b + vec2(0.001, 0.0));
}

vec2 islandPathPoint(float a){
  vec2 b = islandBoundaryAt(a);
  vec2 o = islandOutDir(a);
  float wob = sin(a * 3.0 + 1.1) * 0.42 + sin(a * 7.0 - 0.3) * 0.22;
  return b - o * (ISLE_BEACH_INSET + wob);
}

void islandFrame(float a, out vec2 tangent, out vec2 shoreDir){
  vec2 p0 = islandPathPoint(a - 0.035);
  vec2 p1 = islandPathPoint(a + 0.035);
  tangent = normalize(p1 - p0);
  shoreDir = islandOutDir(a);
}

float islandLandSigned(vec2 xz){
  float a = islandAngle(xz);
  float rb = islandRadiusBump(a);
  float er = length(vec2(xz.x / (ISLE_RX * rb), xz.y / (ISLE_RZ * rb)));
  float rag = (islandFbm(vec2(cos(a), sin(a)) * 4.2 + vec2(3.0, 8.0)) - 0.5) * 1.2;
  return (1.0 - er) * 15.4 + rag;
}

vec3 islandSky(vec3 rd, vec3 sunDir){
  vec3 zenith = vec3(0.14, 0.19, 0.21);
  vec3 horizon = vec3(0.43, 0.49, 0.49);
  float y = smoothstep(-0.08, 0.76, rd.y);
  vec3 sky = mix(horizon, zenith, y);
  float sun = max(0.0, dot(rd, sunDir));
  sky += vec3(0.70, 0.48, 0.29) * pow(sun, 48.0) * 0.38;
  sky += vec3(0.25, 0.20, 0.17) * pow(sun, 4.0) * 0.14;
  float lowMist = smoothstep(-0.18, 0.10, rd.y) * (1.0 - smoothstep(0.08, 0.42, rd.y));
  return mix(sky, vec3(0.48, 0.52, 0.51), lowMist * 0.40);
}

vec3 islandSand(vec2 xz){
  float n1 = islandFbm(xz * 0.18);
  float n2 = islandFbm(xz * 0.62 + vec2(4.7, -2.1));
  float n3 = islandNoise(xz * 1.75);

  vec3 dryA = vec3(0.62, 0.49, 0.32);
  vec3 dryB = vec3(0.78, 0.66, 0.43);
  vec3 grit = vec3(0.38, 0.31, 0.22);

  vec3 col = mix(dryA, dryB, n1);
  col = mix(col, grit, smoothstep(0.74, 0.96, n2) * 0.22);
  col *= 0.88 + 0.12 * n3;

  return col;
}

vec3 islandWater(vec3 p, vec3 rd, vec3 sky, vec3 sunDir, float dist){
  vec2 q = p.xz;
  float w0 = islandFbm(q * 0.060 + vec2(u_time * 0.040, -u_time * 0.028));
  float wx = islandFbm((q + vec2(0.70, 0.0)) * 0.060 + vec2(u_time * 0.040, -u_time * 0.028));
  float wz = islandFbm((q + vec2(0.0, 0.70)) * 0.060 + vec2(u_time * 0.040, -u_time * 0.028));
  vec3 n = normalize(vec3((w0 - wx) * 0.28, 1.0, (w0 - wz) * 0.28));
  vec3 deep = vec3(0.006, 0.025, 0.042);
  vec3 shallow = vec3(0.028, 0.085, 0.090);
  float shore = islandLandSigned(q);
  vec3 water = mix(shallow, deep, smoothstep(6.0, 65.0, dist));
  vec3 refl = islandSky(reflect(rd, n), sunDir);
  float fres = pow(1.0 - max(0.0, dot(-rd, n)), 4.0);
  vec3 col = mix(water, refl, 0.18 + fres * 0.54);
  float spec = pow(max(0.0, dot(reflect(-sunDir, n), -rd)), 72.0);
  col += vec3(0.72, 0.62, 0.45) * spec * 0.40;
  float foam = (1.0 - smoothstep(0.1, 2.6, abs(shore))) * smoothstep(-2.8, 0.8, shore);
  foam *= 0.45 + 0.55 * islandNoise(q * 0.85 + vec2(u_time * 0.25, 0.0));
  col = mix(col, vec3(0.56, 0.60, 0.57), foam * 0.36);
  float fog = 1.0 - exp(-dist * 0.0080);
  return mix(col, sky, fog * 0.62);
}

float islandRaySphere(vec3 ro, vec3 rd, vec3 c, float r, out float t){
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - dot(oc, oc) + r * r;
  if(h < 0.0) return 0.0;
  h = sqrt(h);
  t = -b - h;
  if(t < 0.04) t = -b + h;
  return t > 0.04 ? 1.0 : 0.0;
}

bool islandOBB(vec3 ro, vec3 rd, vec3 center, vec3 right, vec3 up, vec3 fwd, vec3 he, out float tHit, out vec3 nHit, out vec3 localHit){
  vec3 d = ro - center;
  vec3 lro = vec3(dot(d, right), dot(d, up), dot(d, fwd));
  vec3 lrd = vec3(dot(rd, right), dot(rd, up), dot(rd, fwd));
  vec3 sgn = sign(lrd);
  sgn += vec3(1.0) - abs(sgn);
  vec3 invD = 1.0 / (lrd + sgn * 1e-6);
  vec3 t1v = (-he - lro) * invD;
  vec3 t2v = ( he - lro) * invD;
  vec3 tmn = min(t1v, t2v);
  vec3 tmx = max(t1v, t2v);
  float tmin = max(max(tmn.x, tmn.y), tmn.z);
  float tmax = min(min(tmx.x, tmx.y), tmx.z);
  if(tmin > tmax || tmax < 0.04) return false;
  float t = tmin > 0.04 ? tmin : tmax;
  vec3 hl = lro + lrd * t;
  vec3 ah = abs(hl);
  vec3 nL = vec3(0.0);
  if(ah.x >= ah.y && ah.x >= ah.z) nL.x = sign(hl.x);
  else if(ah.y >= ah.z) nL.y = sign(hl.y);
  else nL.z = sign(hl.z);
  tHit = t;
  nHit = normalize(nL.x * right + nL.y * up + nL.z * fwd);
  localHit = hl;
  return true;
}

bool islandCylinderHit(vec3 ro, vec3 rd, vec2 c, float y0, float y1, float r, out float tHit, out vec3 nHit){
  vec2 oc = ro.xz - c;
  vec2 d = rd.xz;
  float a = dot(d, d);
  float b = dot(oc, d);
  float cc = dot(oc, oc) - r * r;
  float h = b * b - a * cc;
  if(h < 0.0 || a < 0.00001) return false;
  h = sqrt(h);
  float t = (-b - h) / a;
  if(t < 0.04) t = (-b + h) / a;
  float y = ro.y + rd.y * t;
  if(t < 0.04 || y < y0 || y > y1) return false;
  tHit = t;
  nHit = normalize(vec3((ro.x + rd.x * t) - c.x, 0.0, (ro.z + rd.z * t) - c.y));
  return true;
}

bool islandRayCapsule(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float r, out float tHit, out vec3 nHit){
  vec3 ba = pb - pa;
  vec3 oa = ro - pa;
  float baba = dot(ba,ba);
  float bard = dot(ba,rd);
  float baoa = dot(ba,oa);
  float rdoa = dot(rd,oa);
  float oaoa = dot(oa,oa);
  float a = baba - bard*bard;
  float b = baba*rdoa - baoa*bard;
  float c = baba*oaoa - baoa*baoa - r*r*baba;
  float h = b*b - a*c;
  if(h >= 0.0){
    float t = (-b-sqrt(h))/a;
    float y = baoa + t*bard;
    if(y > 0.0 && y < baba){
      tHit = t; nHit = normalize(oa + t*rd - ba*y/baba); return true;
    }
    vec3 oc = (y <= 0.0) ? oa : ro - pb;
    b = dot(rd,oc); c = dot(oc,oc) - r*r; h = b*b - c;
    if(h > 0.0){
      tHit = -b - sqrt(h); nHit = normalize(oc + tHit*rd); return true;
    }
  }
  return false;
}

vec2 islandPalmPlace(float ang, float inward){
  vec2 path = islandPathPoint(ang);
  vec2 outv = islandOutDir(ang);
  return path - outv * inward;
}

bool islandPalmLeafHit(vec3 ro, vec3 rd, vec3 center, vec3 longAxis, vec3 upAxis, vec3 wideAxis, float len, float wid, out float tHit, out vec3 colHit, out vec3 nHit){
  float t;
  vec3 n;
  vec3 hl;

  if(!islandOBB(ro, rd, center, longAxis, upAxis, wideAxis, vec3(len, 0.030, wid), t, n, hl)) return false;
  if(t < 0.04 || t > 120.0) return false;

  vec2 uv = vec2(
    (hl.x + len) / (len * 2.0),
    1.0 - ((hl.z + wid) / (wid * 2.0))
  );

  vec4 tex = texture2D(u_z4bPalmLeafTex, clamp(uv, 0.0, 1.0));

  float rgbMax = max(max(tex.r, tex.g), tex.b);
  float texMask = tex.a * smoothstep(0.018, 0.075, rgbMax);
  float ready = clamp(u_z4bPalmLeafReady, 0.0, 1.0);
  float mask = mix(1.0, texMask, ready);

  if(mask < 0.030) return false;

  vec3 proc = mix(
    vec3(0.030, 0.145, 0.038),
    vec3(0.105, 0.275, 0.060),
    islandNoise(center.xz * 0.18 + uv * 2.0)
  );

  vec3 base = mix(proc, tex.rgb, ready);
  base *= 0.84 + 0.16 * islandNoise(center.xz * 0.75 + uv * 8.0);

  tHit = t;
  colHit = base * mask;
  nHit = n;

  return true;
}

bool islandPalmHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  bool hit = false;

  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);

  for(int i = 0; i < 10; i++){
    float fi = float(i);
    vec2 p2 = vec2(0.0);

    float height = 5.6;
    float leanA = 0.0;
    float leanAmt = 0.45;
    float trunkR = 0.17;
    float crownScale = 1.0;

    if(i == 0){
      p2 = islandPalmPlace(2.80, 8.9);
      height = 5.8;
      leanA = -0.55;
      leanAmt = 0.52;
      trunkR = 0.17;
      crownScale = 1.05;
    } else if(i == 1){
      p2 = islandPalmPlace(2.36, 10.8);
      height = 6.6;
      leanA = 0.18;
      leanAmt = 0.70;
      trunkR = 0.19;
      crownScale = 1.18;
    } else if(i == 2){
      p2 = islandPalmPlace(1.78, 10.7);
      height = 5.2;
      leanA = 1.10;
      leanAmt = 0.42;
      trunkR = 0.15;
      crownScale = 0.92;
    } else if(i == 3){
      p2 = islandPalmPlace(1.28, 11.9);
      height = 6.2;
      leanA = 2.20;
      leanAmt = 0.62;
      trunkR = 0.18;
      crownScale = 1.10;
    } else if(i == 4){
      p2 = islandPalmPlace(0.80, 10.6);
      height = 5.5;
      leanA = -1.00;
      leanAmt = 0.48;
      trunkR = 0.16;
      crownScale = 0.98;
    } else if(i == 5){
      p2 = islandPalmPlace(-0.36, 12.0);
      height = 6.8;
      leanA = 2.95;
      leanAmt = 0.74;
      trunkR = 0.19;
      crownScale = 1.20;
    } else if(i == 6){
      p2 = islandPalmPlace(-1.26, 12.8);
      height = 5.7;
      leanA = -2.40;
      leanAmt = 0.56;
      trunkR = 0.16;
      crownScale = 1.00;
    } else if(i == 7){
      p2 = islandPalmPlace(4.05, 17.5);
      height = 6.0;
      leanA = 0.72;
      leanAmt = 0.58;
      trunkR = 0.17;
      crownScale = 1.08;
    } else if(i == 8){
      p2 = islandPalmPlace(4.46, 13.0);
      height = 5.3;
      leanA = -1.75;
      leanAmt = 0.46;
      trunkR = 0.15;
      crownScale = 0.94;
    } else {
      p2 = islandPalmPlace(5.18, 10.4);
      height = 6.4;
      leanA = 1.55;
      leanAmt = 0.66;
      trunkR = 0.18;
      crownScale = 1.12;
    }

    if(islandLandSigned(p2) < 4.0) continue;
    if(length(p2 - vec2(1.8, -1.25)) < 10.5) continue;
    if(length(p2 - vec2(13.8, -1.9)) < 7.0) continue;

    vec3 base = vec3(p2.x, 0.0, p2.y);
    vec3 top = base + vec3(cos(leanA) * leanAmt, height, sin(leanA) * leanAmt);

    float tCull;

    if(islandRaySphere(ro, rd, (base + top) * 0.5, height * 0.58 + 2.6 * crownScale, tCull) < 0.5) continue;

    float t;
    vec3 n;

    if(islandRayCapsule(ro, rd, base, top, trunkR, t, n) && t < tHit && t > 0.04){
      vec3 hp = ro + rd * t;
      float barkN = islandFbm(hp.xz * 1.4 + vec2(fi * 2.1, 4.0));
      float rings = 0.78 + 0.22 * sin((hp.y + barkN) * 8.0);

      vec3 bark = mix(
        vec3(0.19, 0.115, 0.055),
        vec3(0.43, 0.285, 0.135),
        barkN
      );

      bark *= rings;

      tHit = t;
      nHit = n;
      colHit = bark;
      hit = true;
    }

    float baseRot = islandHash(p2 * 0.31 + 1.7) * ISLE_TAU;

    for(int j = 0; j < 10; j++){
      float fj = float(j);
      float la = baseRot + fj * 0.6283185307;
      float droop = -0.18 - 0.10 * islandHash(p2 + fj * 2.7);

      vec3 leafDir = normalize(vec3(cos(la), droop, sin(la)));
      vec3 longAxis = leafDir;
      vec3 wideAxis = normalize(cross(vec3(0.0, 1.0, 0.0), longAxis));
      vec3 upAxis = normalize(cross(longAxis, wideAxis));

      float len = crownScale * (1.18 + 0.34 * islandHash(p2 + fj * 1.13));
      float wid = crownScale * (0.26 + 0.07 * islandHash(p2 + fj * 3.21));
      vec3 lc = top + leafDir * len * 0.82 + vec3(0.0, -0.05 * fj, 0.0);

      float tL;
      vec3 cL;
      vec3 nL;

      if(islandPalmLeafHit(ro, rd, lc, longAxis, upAxis, wideAxis, len, wid, tL, cL, nL) && tL < tHit){
        float shade = 0.74 + 0.26 * max(0.0, dot(nL, normalize(vec3(-0.45, 0.70, 0.25))));

        tHit = tL;
        nHit = nL;
        colHit = cL * shade;
        hit = true;
      }
    }
  }

  return hit;
}

float islandCrashScorchField(vec2 xz){
  float f = 0.0;
  vec2 q;

  q = (xz - vec2(13.8, -1.9)) * vec2(1.55, 1.80);
  f += exp(-dot(q, q)) * 0.72;

  q = (xz - vec2(7.6, -7.4)) * vec2(1.35, 1.55);
  f += exp(-dot(q, q)) * 0.42;

  q = (xz - vec2(4.3, -5.7)) * vec2(1.45, 1.60);
  f += exp(-dot(q, q)) * 0.34;

  q = (xz - vec2(11.0, -3.6)) * vec2(1.20, 1.35);
  f += exp(-dot(q, q)) * 0.28;

  return clamp(f, 0.0, 1.0);
}

vec3 islandSmallEmberColor(vec2 seed, float mask){
  float flick = 0.60 + 0.40 * sin(u_time * 8.5 + seed.x * 2.2 + seed.y * 1.4);
  float lick = smoothstep(0.66, 0.96, islandNoise(seed * 4.7 + vec2(u_time * 0.72, -u_time * 0.28)));
  float core = mask * flick * lick;
  return vec3(0.92, 0.12, 0.018) * core * 0.30 + vec3(1.00, 0.54, 0.08) * core * core * 0.14;
}

float islandSdBox3(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float islandSdRBox3(vec3 p, vec3 b, float r){
  return islandSdBox3(p, b - vec3(r)) - r;
}

float islandCrashOpenTube(vec3 p){
  const float R  = ISLAND_CAB_FUSE_R;
  const float T  = 0.060;
  const float Z0 = -ISLAND_CAB_HALF_LEN;
  const float Z1 =  ISLAND_CAB_HALF_LEN;
  float tube = abs(length(p.xy) - R) - T;
  float cap = max(Z0 - p.z, p.z - Z1);
  if(cap > 0.0) return length(vec2(max(tube, 0.0), cap));
  return tube;
}

float islandCrashFloor(vec3 p){
  if(p.z < -ISLAND_CAB_HALF_LEN + 2.20 || p.z > ISLAND_CAB_HALF_LEN - 0.82) return 40.0;

  float inside = length(p.xy) - (ISLAND_CAB_FUSE_R - 0.22);
  float d = islandSdBox3(
    p - vec3(0.0, ISLAND_CAB_FLOOR_Y - 0.045, -0.20),
    vec3(ISLAND_CAB_FUSE_R - 0.42, 0.040, ISLAND_CAB_HALF_LEN - 1.25)
  );

  return max(d, inside);
}

float islandCrashOneExitRowDoor(vec3 p, float side){
  return 40.0;
}

float islandCrashExitRowDoors(vec3 p){
  return 40.0;
}

float islandCrashOneExitDoor(vec3 p, float side){
  return 40.0;
}

float islandCrashExitDoorMask(vec3 lp){
  float dz = lp.z - ISLAND_CAB_EXIT_ROW_Z;
  float dy = lp.y - (ISLAND_CAB_FLOOR_Y + 0.75);
  float sideBand = smoothstep(ISLAND_CAB_FUSE_R - 0.34, ISLAND_CAB_FUSE_R - 0.06, abs(lp.x));
  float zIn = smoothstep(-0.43, -0.32, dz) * (1.0 - smoothstep(0.32, 0.43, dz));
  float yIn = smoothstep(-0.68, -0.54, dy) * (1.0 - smoothstep(0.54, 0.68, dy));
  return sideBand * zIn * yIn;
}

float islandCrashHallwayPortal(vec3 p){
  return 40.0;
}

float islandCabinPhase(float z, float a, float b){
  return clamp(u_z4bIslandEscape, 0.0, 1.0) * smoothstep(a, b, islandCabinDepthT(z));
}

float islandCabinLatePhase(float z){
  return islandCabinPhase(z, 0.66, 0.96);
}

float islandCabinStrobe(float z){
  float late = islandCabinLatePhase(z);
  float slowArm = smoothstep(0.72, 0.90, islandCabinDepthT(z));
  float beat = smoothstep(0.86, 0.99, 0.5 + 0.5 * sin(u_time * 10.8));
  float doubleBeat = smoothstep(0.90, 0.995, 0.5 + 0.5 * sin(u_time * 21.6 + z * 0.11));
  return late * slowArm * max(beat, doubleBeat * 0.42);
}

float islandCabinTunnelGlow(float z){
  float dreamEnd = islandCabinDreamEnd();
  return smoothstep(dreamEnd - 36.0, dreamEnd - 12.0, z) *
         (1.0 - smoothstep(dreamEnd + 4.0, dreamEnd + 16.0, z));
}

float islandCabinSpiralTurns(float z){
  float t = islandCabinDepthT(z);
  float p1 = smoothstep(0.22, 0.42, t);
  float p2 = smoothstep(0.44, 0.68, t);
  float p3 = smoothstep(0.70, 0.96, t);
  float turns = 0.22 * p1 + 0.68 * p2 + 1.08 * p3;
  return -clamp(u_z4bIslandEscape, 0.0, 1.0) * ISLE_TAU * turns;
}

float islandCabinFunnelScale(float z){
  float t = islandCabinDepthT(z);
  float p1 = smoothstep(0.18, 0.42, t);
  float p2 = smoothstep(0.42, 0.70, t);
  float p3 = smoothstep(0.68, 1.00, t);
  float wave = sin(t * ISLE_TAU * 1.0 + 0.25) * 0.055 * p1;
  wave += sin(t * ISLE_TAU * 2.0 - 0.70) * 0.125 * p2;
  wave += sin(t * ISLE_TAU * 3.0 + 1.10) * 0.185 * p3;
  return 1.0 + clamp(u_z4bIslandEscape, 0.0, 1.0) * (wave - 0.055 * p3);
}

vec2 islandCabinPathOffset(float z){
  float e = clamp(u_z4bIslandEscape, 0.0, 1.0);
  float t = islandCabinDepthT(z);
  float p1 = smoothstep(0.24, 0.46, t);
  float p2 = smoothstep(0.46, 0.72, t);
  float p3 = smoothstep(0.72, 1.00, t);
  float theta = islandCabinSpiralTurns(z);
  float breathe = 0.5 + 0.5 * sin(t * ISLE_TAU * 2.0 - 0.45);
  float radius = e * (0.10 * p1 + 0.34 * p2 + (0.50 + 0.22 * breathe) * p3);

  return vec2(-sin(theta) * radius, cos(theta) * radius * 0.30);
}

float islandCabinPathRoll(float z){
  float t = islandCabinDepthT(z);
  float theta = islandCabinSpiralTurns(z);
  return -sin(theta) * smoothstep(0.36, 1.0, t);
}

vec3 islandCabinPathPoint(float z){
  vec2 off = islandCabinPathOffset(z);
  return vec3(off.x, ISLAND_CAB_FLOOR_Y + 0.94 + off.y, z);
}

vec3 islandCabinWarp(vec3 p){
  float e = clamp(u_z4bIslandEscape, 0.0, 1.0);
  float zt = islandCabinDepthT(p.z);

  vec2 path = islandCabinPathOffset(p.z);
  float twist = islandCabinSpiralTurns(p.z);
  float funnel = max(0.42, islandCabinFunnelScale(p.z));

  vec2 qxy = p.xy - path;
  float liquid = e * smoothstep(0.40, 0.82, zt) * 0.020 * sin(p.z * 0.40 - u_time * 0.38);
  qxy.x += liquid * sin(qxy.y * 2.0 + p.z * 0.11);

  p.xy = islandRot(-twist) * (qxy / funnel);
  return p;
}

float islandCabinSdRBox(vec3 p, vec3 b, float r){
  return islandSdBox3(p, b - r) - r;
}

float islandCrashFractalCore(vec3 z){
  float scale = 1.0;
  for(int i = 0; i < 6; i++){
    z = abs(z);
    if(z.x < z.y) z.xy = z.yx;
    if(z.x < z.z) z.xz = z.zx;
    if(z.y < z.z) z.yz = z.zy;
    z = z * 2.0 - vec3(0.8);
    scale *= 2.0;
  }
  return (length(z) - 0.12) / scale;
}

float islandCrashOneFractal(vec3 p, vec3 center, vec3 spin, float scale){
  vec3 z = (p - center) / scale;
  z.xy *= islandRot(u_time * spin.x + center.z * 0.02);
  z.yz *= islandRot(u_time * spin.y - center.x * 0.11);
  z.xz *= islandRot(u_time * spin.z + center.y * 0.35);
  return islandCrashFractalCore(z) * scale;
}

float islandCrashSdFractal(vec3 p){
  return 40.0;
}

float islandCrashSeat(vec3 p){
  float fy = ISLAND_CAB_FLOOR_Y;

  float cushion = islandSdBox3(p - vec3(0.0, fy + 0.24, 0.0), vec3(0.20, 0.045, 0.20));
  float back    = islandSdBox3(p - vec3(0.0, fy + 0.54, -0.20), vec3(0.20, 0.24, 0.025));
  float head    = islandCabinSdRBox(p - vec3(0.0, fy + 0.86, -0.20), vec3(0.12, 0.07, 0.03), 0.01);
  float armL    = islandSdBox3(p - vec3(-0.22, fy + 0.32, -0.04), vec3(0.02, 0.055, 0.17));
  float armR    = islandSdBox3(p - vec3( 0.22, fy + 0.32, -0.04), vec3(0.02, 0.055, 0.17));
  float legs    = islandSdBox3(p - vec3(0.0, fy + 0.11, 0.08), vec3(0.16, 0.11, 0.025));

  return min(min(min(cushion, back), min(head, legs)), min(armL, armR));
}

float islandCrashSeatRows(vec3 p){
  float rowStart = ISLAND_CAB_ROW_START;
  float rowEnd = ISLAND_CAB_ROW_START + 26.0 * ISLAND_CAB_SEAT_PITCH - 0.70;

  if(p.z < rowStart - 0.5 || p.z > rowEnd + 0.5) return 40.0;
  if(abs(p.z - ISLAND_CAB_EXIT_ROW_Z) < ISLAND_CAB_SEAT_PITCH * 2.2) return 40.0;

  float cellZ = mod(p.z - rowStart, ISLAND_CAB_SEAT_PITCH) - ISLAND_CAB_SEAT_PITCH * 0.5;
  vec3 lp = vec3(p.x, p.y, cellZ);

  float d = islandCrashSeat(lp - vec3(-ISLAND_CAB_AISLE_W - 0.25, 0.0, 0.0));
  d = min(d, islandCrashSeat(lp - vec3(-ISLAND_CAB_AISLE_W - 0.69, 0.0, 0.0)));
  d = min(d, islandCrashSeat(lp - vec3( ISLAND_CAB_AISLE_W + 0.25, 0.0, 0.0)));
  d = min(d, islandCrashSeat(lp - vec3( ISLAND_CAB_AISLE_W + 0.69, 0.0, 0.0)));

  d = max(d, length(p.xy) - (ISLAND_CAB_FUSE_R - 0.22));

  return d;
}

float islandCrashOverheadBins(vec3 p){
  if(p.z < -ISLAND_CAB_HALF_LEN + 2.80 || p.z > ISLAND_CAB_HALF_LEN - 1.05) return 40.0;
  if(abs(p.z - ISLAND_CAB_EXIT_ROW_Z) < ISLAND_CAB_SEAT_PITCH * 2.0) return 40.0;

  float halfZ = (ISLAND_CAB_HALF_LEN - 1.05 - (-ISLAND_CAB_HALF_LEN + 2.80)) * 0.5;
  float midZ = (-ISLAND_CAB_HALF_LEN + 2.80) + halfZ;

  float binL = islandSdBox3(p - vec3(-1.03, 0.72, midZ), vec3(0.22, 0.115, halfZ));
  float binR = islandSdBox3(p - vec3( 1.03, 0.72, midZ), vec3(0.22, 0.115, halfZ));

  float d = min(binL, binR);
  d = max(d, length(p.xy) - (ISLAND_CAB_FUSE_R - 0.30));

  return d;
}

float islandCrashCockpitWall(vec3 p){
  float wallZ = ISLAND_CAB_HALF_LEN - 0.6;

  float wall = islandSdBox3(
    p - vec3(0.0, 0.25, wallZ),
    vec3(ISLAND_CAB_FUSE_R, ISLAND_CAB_FUSE_R, 0.04)
  );

  wall = max(wall, length(p.xy) - ISLAND_CAB_FUSE_R);
  wall = max(wall, -(p.y - ISLAND_CAB_FLOOR_Y));

  float door = islandSdBox3(
    p - vec3(0.05, ISLAND_CAB_FLOOR_Y + 0.62, wallZ),
    vec3(0.28, 0.56, 0.09)
  );

  wall = max(wall, -door);

  return wall;
}

float islandCrashExitDoor(vec3 p){
  float doorH = 1.3;
  float doorD = 0.65;

  vec3 doorPos = vec3(
    -ISLAND_CAB_FUSE_R - 0.02,
    ISLAND_CAB_FLOOR_Y + doorH * 0.5 + 0.1,
    ISLAND_CAB_EXIT_ROW_Z
  );

  if(u_z4bIslandEscape > 0.5) return 40.0;

  float door = islandSdBox3(p - doorPos, vec3(0.10, doorH * 0.5, doorD * 0.5));
  float recess = islandSdBox3(
    p - (doorPos + vec3(0.05, 0.0, 0.0)),
    vec3(0.10, doorH * 0.42, doorD * 0.42)
  );

  door = max(door, -recess);

  vec3 handlePos = doorPos + vec3(0.08, 0.0, doorD * 0.3);

  float handle = islandSdBox3(p - handlePos, vec3(0.05, 0.15, 0.02));
  float ribL = islandSdBox3(
    p - (doorPos + vec3(0.06, 0.0, -doorD * 0.45)),
    vec3(0.04, doorH * 0.48, 0.03)
  );
  float ribR = islandSdBox3(
    p - (doorPos + vec3(0.06, 0.0, doorD * 0.45)),
    vec3(0.04, doorH * 0.48, 0.03)
  );

  return min(min(door, handle), min(ribL, ribR));
}

bool islandCrashInExitHole(vec3 p){
  if(u_z4bIslandEscape < 0.5) return false;

  return abs(p.z - ISLAND_CAB_EXIT_ROW_Z) < 0.28 &&
         p.y > ISLAND_CAB_FLOOR_Y + 0.05 &&
         p.y < ISLAND_CAB_FLOOR_Y + 0.90 &&
         p.x < -ISLAND_CAB_FUSE_R + 0.15 &&
         abs(length(p.xy) - ISLAND_CAB_FUSE_R) < 0.12;
}

bool islandCrashIsWindowHit(vec3 p){
  float distToShell = abs(length(p.xy) - ISLAND_CAB_FUSE_R);

  if(distToShell > 0.08) return false;

  float rowEnd = ISLAND_CAB_ROW_START + 26.0 * ISLAND_CAB_SEAT_PITCH;

  if(p.z < ISLAND_CAB_ROW_START || p.z > rowEnd) return false;

  float localZ = mod(p.z - ISLAND_CAB_ROW_START, ISLAND_CAB_SEAT_PITCH);
  float winCenter = ISLAND_CAB_SEAT_PITCH * 0.5;
  float winH = abs(p.y - 0.18);

  return abs(localZ - winCenter) < 0.07 && winH < 0.11;
}

float islandCrashInteriorClip(vec3 p){
  float radial = length(p.xy) - (ISLAND_CAB_FUSE_R - 0.18);
  float belowFloor = (ISLAND_CAB_FLOOR_Y - 0.10) - p.y;
  float aboveCeiling = p.y - (ISLAND_CAB_FUSE_R - 0.14);
  float rearMouth = (-ISLAND_CAB_HALF_LEN + 2.35) - p.z;
  float frontWall = p.z - (ISLAND_CAB_HALF_LEN - 0.72);

  return max(max(radial, belowFloor), max(aboveCeiling, max(rearMouth, frontWall)));
}

vec2 islandCrashPlaneMap(vec3 lp){
  vec3 wp = lp;

  float shell = islandCrashOpenTube(wp);
  float d = shell;
  float id = 31.0;

  float doorH = 1.35;
  float doorD = 0.70;
  float doorCut = islandSdBox3(
    wp - vec3(-ISLAND_CAB_FUSE_R, ISLAND_CAB_FLOOR_Y + doorH * 0.5 + 0.1, ISLAND_CAB_EXIT_ROW_Z),
    vec3(0.20, doorH * 0.5, doorD * 0.5)
  );

  if(u_z4bIslandEscape > 0.5){
    d = max(d, -doorCut);
    if(islandCrashInExitHole(wp)) d = max(d, 0.01);
  }

  float clip = islandCrashInteriorClip(wp);

  float floorD = max(islandCrashFloor(wp), clip);
  if(floorD < d){
    d = floorD;
    id = 32.0;
  }

  float seats = max(islandCrashSeatRows(wp), clip);
  if(seats < d){
    d = seats;
    id = 33.0;
  }

  float bins = max(islandCrashOverheadBins(wp), clip);
  if(bins < d){
    d = bins;
    id = 34.0;
  }

  float cockpit = max(islandCrashCockpitWall(wp), clip);
  if(cockpit < d){
    d = cockpit;
    id = 35.0;
  }

  float exitDoor = max(islandCrashExitDoor(wp), clip);
  if(exitDoor < d){
    d = exitDoor;
    id = 39.0;
  }

  float frac = max(islandCrashSdFractal(wp), clip);
  if(u_z4bIslandEscape > 0.5 && frac < d){
    d = frac;
    id = 37.0;
  }

  return vec2(d, id);
}

void islandCrashFrame(out vec3 center, out vec3 right, out vec3 up, out vec3 fwd){
  center = vec3(1.8, 1.26, -1.25);
  fwd = normalize(vec3(1.0, 0.0, 0.10));
  right = normalize(vec3(-fwd.z, 0.0, fwd.x));
  up = vec3(0.0, 1.0, 0.0);
}

vec3 islandCrashToLocal(vec3 p){
  vec3 center; vec3 right; vec3 up; vec3 fwd;
  islandCrashFrame(center, right, up, fwd);
  vec3 d = p - center;
  return vec3(dot(d, right), dot(d, up), dot(d, fwd));
}

vec3 islandCrashNormalLocal(vec3 p){
  const float e = 0.010;
  float d = islandCrashPlaneMap(p).x;
  return normalize(vec3(islandCrashPlaneMap(p + vec3(e, 0.0, 0.0)).x - d, islandCrashPlaneMap(p + vec3(0.0, e, 0.0)).x - d, islandCrashPlaneMap(p + vec3(0.0, 0.0, e)).x - d));
}

vec3 islandCrashColor(vec3 lp, vec3 nL, float id){
  float shade = 0.18 + 0.56 * max(0.0, dot(nL, normalize(vec3(-0.35, 0.55, -0.42))));
  float flicker = 0.78 + 0.22 * sin(u_time * 3.9) * sin(u_time * 5.7 + 1.4);

if(id > 38.5 && id < 39.5){
    float doorH = 1.3;
    float doorD = 0.65;

    vec3 doorPos = vec3(
      -ISLAND_CAB_FUSE_R - 0.02,
      ISLAND_CAB_FLOOR_Y + doorH * 0.5 + 0.1,
      ISLAND_CAB_EXIT_ROW_Z
    );

    vec3 q = lp - doorPos;

    float ribZ = max(
      1.0 - smoothstep(0.018, 0.060, abs(abs(q.z) - doorD * 0.45)),
      1.0 - smoothstep(0.018, 0.060, abs(abs(q.z) - doorD * 0.28))
    );

    float ribY = max(
      1.0 - smoothstep(0.018, 0.060, abs(abs(q.y) - doorH * 0.40)),
      1.0 - smoothstep(0.018, 0.060, abs(abs(q.y) - doorH * 0.23))
    );

    float recess = smoothstep(0.50, 0.12, abs(q.y)) * smoothstep(0.31, 0.06, abs(q.z));
    float handle = smoothstep(0.13, 0.0, length(vec2(q.y + 0.02, q.z - doorD * 0.30)));
    float label = smoothstep(0.11, 0.0, abs(q.y - 0.18)) * smoothstep(0.25, 0.0, abs(q.z + 0.02));

    vec3 doorCol = mix(vec3(0.20, 0.21, 0.22), vec3(0.46, 0.47, 0.47), recess);
    doorCol = mix(doorCol, vec3(0.050, 0.050, 0.055), max(ribZ, ribY) * 0.52);
    doorCol += vec3(0.74, 0.72, 0.64) * handle * 0.64;
    doorCol += vec3(0.95, 0.10, 0.035) * label * (0.55 + 0.25 * sin(u_time * 5.0));

    return doorCol * (0.44 + shade);
  }

  if(id > 36.5 && id < 37.5){
    float pulse = 0.5 + 0.5 * sin(u_time * 3.0 + length(lp) * 2.0);
    vec3 fracCol = mix(vec3(0.10, 0.10, 0.30), vec3(0.80, 0.10, 0.20), pulse);
    return fracCol * (max(dot(nL, normalize(vec3(1.0, 1.0, 1.0))), 0.0) * 0.8 + 0.2);
  }

  if(id > 34.5 && id < 35.5){
    vec3 wall = vec3(0.10, 0.12, 0.15) * (0.30 + shade);
    float doorway = smoothstep(0.32, 0.0, abs(lp.x - 0.05)) *
                    smoothstep(0.62, 0.0, abs(lp.y - (ISLAND_CAB_FLOOR_Y + 0.62)));
    wall = mix(wall, vec3(0.015, 0.014, 0.020), doorway * 0.70);
    return wall;
  }

  if(id > 33.5 && id < 34.5){
    vec3 binCol = vec3(0.22, 0.23, 0.25) * (0.46 + shade);
    float seam = 1.0 - smoothstep(0.012, 0.040, abs(fract((lp.z + ISLAND_CAB_HALF_LEN) / ISLAND_CAB_SEAT_PITCH) - 0.5));
    binCol *= 0.95 + 0.04 * seam;
    return binCol;
  }

  if(id > 32.5 && id < 33.5){
    vec3 fabric = vec3(0.15, 0.17, 0.32);
    fabric += 0.035 * islandNoise(vec2(lp.z * 8.0, lp.y * 12.0));
    return fabric * (0.28 + shade * 0.85);
  }

  if(id > 31.5 && id < 32.5){
    vec3 floorCol = vec3(0.14, 0.14, 0.16) + islandHash(floor(lp.xz * 18.0)) * 0.04;
    float stripEdge = abs(abs(lp.x) - ISLAND_CAB_AISLE_W);
    float onStrip = smoothstep(0.06, 0.0, stripEdge) * smoothstep(ISLAND_CAB_FLOOR_Y + 0.06, ISLAND_CAB_FLOOR_Y + 0.005, lp.y);
    float seg = smoothstep(0.15, 0.0, abs(mod(lp.z * 1.7, 1.0) - 0.5));
    floorCol += vec3(0.95, 0.12, 0.04) * onStrip * seg * (0.55 + 0.45 * sin(u_time * 1.3 + lp.z * 0.4)) * 2.0;
    return floorCol * (0.35 + shade);
  }

  vec3 shell = vec3(0.34, 0.36, 0.39) * (0.36 + shade);

  if(islandCrashIsWindowHit(lp)){
    vec2 vuv = vec2(
      fract(lp.z * 0.055 + sign(lp.x) * 0.18 + 0.012 * sin(u_time * 0.08)),
      clamp(0.52 + lp.y * 0.38 + sign(lp.x) * 0.04, 0.0, 1.0)
    );

    vec3 voidCol = texture2D(u_texEnv3, vuv).rgb;
    vec3 glass = mix(vec3(0.010, 0.014, 0.020), voidCol * 0.42, 0.35);

    return mix(shell, glass, 0.92);
  }

  float grime = 0.78 + 0.22 * islandNoise(lp.xz * 11.0 + lp.yy * 0.6);
  shell *= grime;

  float rib = 1.0 - smoothstep(0.010, 0.050, abs(fract((lp.z + ISLAND_CAB_HALF_LEN) * 0.28) - 0.5));
  shell *= 0.94 + rib * 0.025;

  if(id > 37.5 && id < 38.5){
    shell *= 0.42;
  }

  return shell * flicker;
}

float islandCrashDreamInteriorClip(vec3 p){
  vec3 q = islandCabinWarp(p);
  float dreamEnd = islandCabinDreamEnd();
  float zt = islandCabinDepthT(p.z);
  float endT = smoothstep(dreamEnd - 34.0, dreamEnd + 8.0, p.z);
  float r = mix(ISLAND_CAB_FUSE_R - 0.20, ISLAND_CAB_FUSE_R * 0.60, smoothstep(0.70, 1.0, zt));
  r = mix(r, 0.24, endT);

  float radial = length(q.xy) - r;
  float belowFloor = (ISLAND_CAB_FLOOR_Y - 0.12) - q.y;
  float aboveCeiling = q.y - (r - 0.08);
  float rearMouth = (-ISLAND_CAB_HALF_LEN + 0.92) - p.z;

  /*
    Do not cap at islandCabinDreamEnd(). The visible flat black wall was this
    front cap/tube cap. Keep the tunnel open far beyond the handoff zone.
  */
  float farSafetyCap = p.z - (dreamEnd + 38.0);

  return max(max(radial, belowFloor), max(aboveCeiling, max(rearMouth, farSafetyCap)));
}

float islandCrashDreamTube(vec3 p){
  vec3 q = islandCabinWarp(p);
  float dreamEnd = islandCabinDreamEnd();
  float zt = islandCabinDepthT(p.z);
  float rBase = mix(ISLAND_CAB_FUSE_R, ISLAND_CAB_FUSE_R * 0.63, smoothstep(0.70, 1.0, zt));
  float funnel = islandCabinFunnelScale(p.z);
  float endT = smoothstep(dreamEnd - 34.0, dreamEnd + 8.0, p.z);
  float r = mix(rBase * funnel, 0.22, endT);
  float wall = mix(0.055, 0.080, endT);

  float tube = abs(length(q.xy) - r) - wall;

  float back = (-ISLAND_CAB_HALF_LEN) - p.z;
  float farSafetyCap = p.z - (dreamEnd + 38.0);
  float caps = max(back, farSafetyCap);

  if(caps > 0.0) return length(vec2(max(tube, 0.0), caps));
  return tube;
}

float islandCrashDreamFloor(vec3 p){
  vec3 q = islandCabinWarp(p);
  float dreamEnd = islandCabinDreamEnd();
  float zt = islandCabinDepthT(p.z);
  float endT = smoothstep(dreamEnd - 34.0, dreamEnd + 8.0, p.z);
  float width = mix(ISLAND_CAB_FUSE_R - 0.44, ISLAND_CAB_FUSE_R * 0.44, zt);
  width = mix(width, 0.18, endT);

  float z0 = -ISLAND_CAB_HALF_LEN;
  float z1 = dreamEnd + 34.0;
  float midZ = (z1 + z0) * 0.5;
  float halfZ = (z1 - z0) * 0.5;

  float d = islandSdBox3(q - vec3(0.0, ISLAND_CAB_FLOOR_Y - 0.045, midZ), vec3(width, 0.040, halfZ));
  return max(d, islandCrashDreamInteriorClip(p));
}

float islandCrashDreamSeatRows(vec3 p){
  if(p.z < ISLAND_CAB_ROW_START - 0.50 || p.z > islandCabinDreamEnd() - 2.60) return 40.0;

  vec3 q = islandCabinWarp(p);
  float zt = islandCabinDepthT(p.z);
  float pitch = mix(ISLAND_CAB_SEAT_PITCH, ISLAND_CAB_SEAT_PITCH * 0.66, smoothstep(0.20, 1.0, zt));
  float cellZ = mod(q.z - ISLAND_CAB_ROW_START, pitch) - pitch * 0.5;
  vec3 lp = vec3(q.x, q.y, cellZ);

  float aisle = mix(ISLAND_CAB_AISLE_W, ISLAND_CAB_AISLE_W * 0.68, zt);
  float spread = mix(0.69, 0.48, zt);
  float d = islandCrashSeat(lp - vec3(-aisle - 0.25, 0.0, 0.0));
  d = min(d, islandCrashSeat(lp - vec3(-aisle - spread, 0.0, 0.0)));
  d = min(d, islandCrashSeat(lp - vec3( aisle + 0.25, 0.0, 0.0)));
  d = min(d, islandCrashSeat(lp - vec3( aisle + spread, 0.0, 0.0)));

  return max(d, islandCrashDreamInteriorClip(p));
}

float islandCrashDreamOverheadBins(vec3 p){
  if(p.z < -ISLAND_CAB_HALF_LEN + 2.40 || p.z > islandCabinDreamEnd() - 1.50) return 40.0;

  vec3 q = islandCabinWarp(p);
  float zt = islandCabinDepthT(p.z);
  float midZ = (islandCabinDreamEnd() - ISLAND_CAB_HALF_LEN) * 0.5;
  float halfZ = (islandCabinDreamEnd() + ISLAND_CAB_HALF_LEN) * 0.5 - 1.55;
  float x = mix(1.03, 0.68, zt);
  float y = mix(0.72, 0.55, zt);
  float binL = islandSdBox3(q - vec3(-x, y, midZ), vec3(0.20, 0.105, halfZ));
  float binR = islandSdBox3(q - vec3( x, y, midZ), vec3(0.20, 0.105, halfZ));
  return max(min(binL, binR), islandCrashDreamInteriorClip(p));
}

vec2 islandCrashDreamPlaneMap(vec3 p){
  vec3 q = islandCabinWarp(p);
  float d = islandCrashDreamTube(p);
  float id = 31.0;

  float floorD = islandCrashDreamFloor(p);
  if(floorD < d){ d = floorD; id = 32.0; }

  float seats = islandCrashDreamSeatRows(p);
  if(seats < d){ d = seats; id = 33.0; }

  float bins = islandCrashDreamOverheadBins(p);
  if(bins < d){ d = bins; id = 34.0; }
return vec2(d, id);
}

vec3 islandCrashDreamNormalLocal(vec3 p){
  const float e = 0.012;
  float d = islandCrashDreamPlaneMap(p).x;
  return normalize(vec3(
    islandCrashDreamPlaneMap(p + vec3(e, 0.0, 0.0)).x - d,
    islandCrashDreamPlaneMap(p + vec3(0.0, e, 0.0)).x - d,
    islandCrashDreamPlaneMap(p + vec3(0.0, 0.0, e)).x - d
  ));
}

float islandCrashPocketGate(vec3 lro){
  if(u_z4bIslandEscape < 0.5) return 0.0;

  float zEnter = smoothstep(-ISLAND_CAB_HALF_LEN + 0.72, -ISLAND_CAB_HALF_LEN + 1.32, lro.z);
  float zExit = 1.0 - smoothstep(islandCabinDreamEnd() + 1.90, islandCabinDreamEnd() + 30.0, lro.z);
  float xIn = 1.0 - smoothstep(ISLAND_CAB_FUSE_R * 0.92, ISLAND_CAB_FUSE_R * 1.24, abs(lro.x));
  float yLow = smoothstep(ISLAND_CAB_FLOOR_Y - 0.36, ISLAND_CAB_FLOOR_Y + 0.12, lro.y);
  float yHigh = 1.0 - smoothstep(ISLAND_CAB_FUSE_R * 0.90, ISLAND_CAB_FUSE_R * 1.20, lro.y);

  return clamp(zEnter * zExit * xIn * yLow * yHigh, 0.0, 1.0);
}

bool islandCrashPlaneHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  vec3 lro = islandCrashToLocal(ro);
  vec3 center; vec3 right; vec3 up; vec3 fwd;
  islandCrashFrame(center, right, up, fwd);
  vec3 lrd = vec3(dot(rd, right), dot(rd, up), dot(rd, fwd));

  float pocket = islandCrashPocketGate(lro);
  float dreamEnd = islandCabinDreamEnd();
  float zMax = mix(ISLAND_CAB_HALF_LEN + 1.35, dreamEnd + 34.0, pocket);
  float xMax = mix(ISLAND_CAB_FUSE_R + 1.55, ISLAND_CAB_FUSE_R + 2.85, pocket);
  float yMin = -2.90;
  float yMax = 4.25;

  tHit = 1e9;
  float t = 0.045;
  bool hit = false;
  float hitID = -1.0;
  vec3 hitP = vec3(0.0);

  for(int i = 0; i < 196; i++){
    vec3 p = lro + lrd * t;

    if(p.z < -ISLAND_CAB_HALF_LEN - 2.15 || p.z > zMax || abs(p.x) > xMax || p.y < yMin || p.y > yMax){
      t += 0.58;
    } else {
      vec2 d = pocket > 0.5 ? islandCrashDreamPlaneMap(p) : islandCrashPlaneMap(p);

      if(d.x < 0.010){
        hit = true;
        hitID = d.y;
        hitP = p;
        break;
      }

      t += clamp(d.x * 0.78, 0.018, 0.58);
    }

    if(t > 128.0) break;
  }

  if(!hit) return false;

  vec3 nL = pocket > 0.5 ? islandCrashDreamNormalLocal(hitP) : islandCrashNormalLocal(hitP);
  vec3 shadeP = pocket > 0.5 ? islandCabinWarp(hitP) : hitP;

  tHit = t;
  nHit = normalize(right * nL.x + up * nL.y + fwd * nL.z);
  colHit = islandCrashColor(shadeP, nL, hitID);
  return true;
}

vec3 islandCrashCabinFog(vec3 col, vec3 ro, vec3 rd, float dist){
  vec3 lp = islandCrashToLocal(ro + rd * dist);
  float e = clamp(u_z4bIslandEscape, 0.0, 1.0);
  float zt = islandCabinDepthT(lp.z);
  float interior = islandCabinInteriorMask(lp.z) * e;

  float phaseA = smoothstep(0.12, 0.40, zt);
  float phaseB = smoothstep(0.40, 0.72, zt);
  float phaseC = smoothstep(0.70, 1.00, zt);

  float pulse = 0.5 + 0.5 * sin(u_time * 0.42 + lp.z * 0.12);
  float density = mix(0.026, 0.108, zt);
  float fog = (1.0 - exp(-dist * density)) * interior;
  fog += interior * (0.055 + 0.090 * phaseA + 0.120 * phaseB + 0.080 * phaseC * pulse);
  fog = clamp(fog, 0.0, 0.66);

  vec3 fogCol = mix(vec3(0.018, 0.020, 0.026), vec3(0.036, 0.041, 0.050), zt);
  fogCol += vec3(0.006, 0.020, 0.016) * phaseB;
  fogCol += vec3(0.030, 0.008, 0.036) * phaseC * pulse * 0.45;
  fogCol += vec3(0.22, 0.08, 0.06) * islandCabinStrobe(lp.z) * 0.16;

  return mix(col, fogCol, fog);
}

vec3 islandCrashCabinHallucination(vec3 col, vec3 ro, vec3 rd, float dist){
  vec3 lp = islandCrashToLocal(ro + rd * dist);
  float e = clamp(u_z4bIslandEscape, 0.0, 1.0);
  float zt = islandCabinDepthT(lp.z);
  float interior = islandCabinInteriorMask(lp.z) * e;

  if(interior < 0.001) return col;

  float phaseA = smoothstep(0.24, 0.46, zt);
  float phaseB = smoothstep(0.46, 0.72, zt);
  float phaseC = smoothstep(0.72, 1.00, zt);

  float spin = 0.5 + 0.5 * sin(atan(lp.y, lp.x) * 5.5 + lp.z * 0.42 - u_time * 0.36);
  float liquid = 0.5 + 0.5 * sin(lp.z * 0.92 + length(lp.xy) * 3.2 - u_time * 0.42);
  float strobe = islandCabinStrobe(lp.z);

  float amt = interior * (0.025 * phaseA + 0.060 * phaseB + 0.090 * phaseC);
  vec3 aura = mix(vec3(0.030, 0.115, 0.145), vec3(0.145, 0.035, 0.120), spin);
  aura = mix(aura, vec3(0.025, 0.140, 0.075), liquid * 0.28);

  col = mix(col, col.bgr * vec3(1.018, 0.990, 1.028), amt * 0.060);
  col += aura * amt * (0.22 + 0.18 * liquid);
  col += vec3(0.34, 0.075, 0.040) * strobe * interior * 0.16;
  col *= 1.0 + strobe * interior * 0.10;

  return col;
}

vec3 islandCrashCabinVoid(vec3 col, vec3 ro, vec3 rd){
  vec3 lro = islandCrashToLocal(ro);
  float e = clamp(u_z4bIslandEscape, 0.0, 1.0);

  float zMask = smoothstep(-ISLAND_CAB_HALF_LEN + 0.34, -ISLAND_CAB_HALF_LEN + 1.22, lro.z) *
                (1.0 - smoothstep(islandCabinDreamEnd() + 2.0, islandCabinDreamEnd() + 12.0, lro.z));
  float rMask = 1.0 - smoothstep(ISLAND_CAB_FUSE_R * 0.52, ISLAND_CAB_FUSE_R * 1.42, length(lro.xy));
  float yMask = smoothstep(ISLAND_CAB_FLOOR_Y - 0.42, ISLAND_CAB_FLOOR_Y + 0.18, lro.y) *
                (1.0 - smoothstep(ISLAND_CAB_FUSE_R * 1.00, ISLAND_CAB_FUSE_R * 1.42, lro.y));

  float inside = e * zMask * rMask * yMask;
  if(inside < 0.001) return col;

  vec3 p0 = islandCrashToLocal(ro + rd * 3.0);
  vec3 p1 = islandCrashToLocal(ro + rd * 9.0);
  vec3 p2 = islandCrashToLocal(ro + rd * 18.0);
  vec3 p3 = islandCrashToLocal(ro + rd * 32.0);

  float dreamEnd = islandCabinDreamEnd();
  float maxZ = max(max(p0.z, p1.z), max(p2.z, p3.z));
  float zt = islandCabinDepthT(max(lro.z, maxZ));

  float phaseA = smoothstep(0.18, 0.42, zt);
  float phaseB = smoothstep(0.42, 0.70, zt);
  float phaseC = smoothstep(0.66, 1.00, zt);

  float centerY = ISLAND_CAB_FLOOR_Y + 0.62;

  float a1 = atan(p1.y - centerY, p1.x);
  float a2 = atan(p2.y - centerY, p2.x);
  float a3 = atan(p3.y - centerY, p3.x);

  float r1 = length(vec2(p1.x, p1.y - centerY));
  float r2 = length(vec2(p2.x, p2.y - centerY));
  float r3 = length(vec2(p3.x, p3.y - centerY));

  float spiral =
    0.34 * sin(a1 * 5.4 + p1.z * 0.30 - u_time * 0.35) +
    0.33 * sin(a2 * 6.1 + p2.z * 0.24 - u_time * 0.28) +
    0.33 * sin(a3 * 4.7 + p3.z * 0.18 - u_time * 0.22);
  spiral = 0.5 + 0.5 * spiral;

  float ribs =
    0.34 * sin(p1.z * 0.74 + r1 * 3.2 - u_time * 0.18) +
    0.33 * sin(p2.z * 0.58 + r2 * 2.6 - u_time * 0.15) +
    0.33 * sin(p3.z * 0.42 + r3 * 2.0 - u_time * 0.12);
  ribs = 0.5 + 0.5 * ribs;

  float pulse = 0.5 + 0.5 * sin(u_time * 0.85 + maxZ * 0.10);
  float aisle = 1.0 - smoothstep(0.10, 1.40, abs(p1.x));

  float g0 = islandCabinTunnelGlow(p0.z);
  float g1 = islandCabinTunnelGlow(p1.z);
  float g2 = islandCabinTunnelGlow(p2.z);
  float g3 = islandCabinTunnelGlow(p3.z);
  float throat = clamp(max(max(g0 * 0.28, g1 * 0.52), max(g2 * 0.76, g3)), 0.0, 1.0);

  float taperT = smoothstep(dreamEnd - 34.0, dreamEnd + 8.0, maxZ);

  float sx1 = mix(2.55, 0.88, taperT);
  float sy1 = mix(1.95, 0.74, taperT);
  float sx2 = mix(2.25, 0.62, taperT);
  float sy2 = mix(1.72, 0.54, taperT);
  float sx3 = mix(2.00, 0.42, taperT);
  float sy3 = mix(1.54, 0.38, taperT);

  float soft1 = 1.0 - smoothstep(0.35, 1.95, length(vec2(p1.x / sx1, (p1.y - centerY) / sy1)));
  float soft2 = 1.0 - smoothstep(0.30, 1.80, length(vec2(p2.x / sx2, (p2.y - centerY) / sy2)));
  float soft3 = 1.0 - smoothstep(0.25, 1.65, length(vec2(p3.x / sx3, (p3.y - centerY) / sy3)));

  float volume = throat * clamp(0.26 * soft1 + 0.36 * soft2 + 0.52 * soft3, 0.0, 1.0);
  float redWash = throat * (0.20 + 0.36 * soft1 + 0.46 * soft2 + 0.58 * soft3);
  float depthDark = throat * smoothstep(0.72, 1.0, taperT) * 0.22;

  vec3 tunnel = mix(vec3(0.016, 0.018, 0.024), vec3(0.038, 0.044, 0.054), smoothstep(-0.22, 0.52, rd.y));
  tunnel += mix(vec3(0.004, 0.026, 0.022), vec3(0.046, 0.008, 0.048), spiral) *
            (0.050 * phaseA + 0.112 * phaseB + 0.155 * phaseC);
  tunnel += vec3(0.034, 0.020, 0.012) * ribs * aisle * (0.030 + 0.066 * phaseB);
  tunnel += vec3(0.018, 0.028, 0.034) * pulse * (0.048 * phaseB + 0.080 * phaseC);

  vec3 redFogCol = vec3(0.30, 0.026, 0.014) * (0.80 + 0.36 * ribs + 0.20 * pulse);
  vec3 deepRedCol = vec3(0.095, 0.010, 0.006);

  tunnel = mix(tunnel, redFogCol, clamp(volume * 0.58, 0.0, 0.62));
  tunnel += redFogCol * redWash * 0.11;
  tunnel = mix(tunnel, deepRedCol, depthDark);

  tunnel += vec3(0.50, 0.10, 0.060) * islandCabinStrobe(p2.z) * inside * 0.07;

  float ahead = max(islandCabinInteriorMask(p0.z), islandCabinInteriorMask(p2.z));
  float amount = inside * max(0.26, ahead);
  amount *= 0.24 + 0.09 * phaseA + 0.14 * phaseB + 0.28 * max(phaseC, throat);
  amount = clamp(amount, 0.0, 0.68);

  vec3 mixed = mix(col, tunnel, amount);
  mixed += redFogCol * inside * volume * 0.08;
  mixed += tunnel * inside * (0.040 + 0.065 * max(phaseC, throat));

  return mixed;
}

bool islandWreckHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  bool hit = false;
  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);

  vec3 globalUp = vec3(0.0, 1.0, 0.0);
  float t;
  vec3 n;
  vec3 hl;

  
  {
    float yaw = -0.82;
    float pitch = 0.16;
    vec3 fwd = vec3(cos(yaw) * cos(pitch), sin(pitch), sin(yaw) * cos(pitch));
    vec3 right = normalize(cross(globalUp, fwd));
    vec3 obbUp = cross(fwd, right);
    vec3 center = vec3(11.0, 1.55, -3.6);

    if(islandOBB(ro, rd, center, right, obbUp, fwd, vec3(3.6, 1.40, 1.30), t, n, hl) && t < tHit && t < 110.0){
      float band = (1.0 - smoothstep(0.12, 0.28, abs(hl.y - 0.55))) *
                   smoothstep(-3.4, -1.4, hl.x) *
                   (1.0 - smoothstep(2.4, 3.4, hl.x));
      float winRow = 1.0 - smoothstep(0.020, 0.060, abs(hl.y - 0.10));
      float winRep = step(0.55, mod(hl.x * 1.4 + 0.2, 1.0));
      float windows = winRow * winRep;
      float grime = islandFbm(hl.xy * 1.1);
      float rust = smoothstep(0.55, 0.92, islandFbm(hl.xy * 1.7 + vec2(2.3, 0.0)));

      vec3 metal = mix(vec3(0.42, 0.43, 0.40), vec3(0.62, 0.55, 0.45), grime);
      metal = mix(metal, vec3(0.42, 0.20, 0.10), rust * 0.55);
      metal = mix(metal, vec3(0.65, 0.07, 0.04), band * 0.92);
      metal = mix(metal, vec3(0.04, 0.05, 0.07), windows * 0.85);

      if(hl.x > 3.35){
        float jag = step(0.55, islandHash(floor(hl.yz * 7.0 + 1.7)));
        metal = mix(metal, vec3(0.04, 0.04, 0.04), jag * 0.75);
      }

      colHit = metal;
      nHit = n;
      tHit = t;
      hit = true;
    }
  }

  
  {
    float yaw = -0.82;
    vec3 fwd = vec3(cos(yaw), 0.03, sin(yaw));
    vec3 right = normalize(cross(globalUp, fwd));
    vec3 up = normalize(cross(fwd, right));
    vec3 center = vec3(5.2, 1.35, -7.8);

    if(islandOBB(ro, rd, center, right, up, fwd, vec3(2.15, 1.05, 0.22), t, n, hl) && t < tHit && t < 110.0){
      vec3 metal = mix(vec3(0.38, 0.39, 0.37), vec3(0.55, 0.50, 0.43), islandFbm(hl.xy * 1.4));
      float burn = smoothstep(0.45, 0.95, islandFbm(hl.xz * 2.1 + vec2(4.0, -1.3)));
      metal = mix(metal, vec3(0.065, 0.055, 0.050), burn * 0.42);
      colHit = metal;
      nHit = n;
      tHit = t;
      hit = true;
    }
  }

  
  {
    float yaw = -0.65;
    vec3 fwd = vec3(cos(yaw), 0.0, sin(yaw));
    vec3 right = normalize(cross(globalUp, fwd));
    vec3 center = vec3(13.8, 0.60, -1.9);

    if(islandOBB(ro, rd, center, right, globalUp, fwd, vec3(1.10, 0.60, 0.85), t, n, hl) && t < tHit && t < 110.0){
      vec3 metal = mix(vec3(0.22, 0.22, 0.22), vec3(0.36, 0.32, 0.28), islandFbm(hl.xz * 1.3));
      float soot = smoothstep(0.40, 1.05, hl.x) * (1.0 - smoothstep(0.50, 0.85, length(hl.yz)));
      float ember = smoothstep(0.22, 0.78, hl.x) *
                    (1.0 - smoothstep(0.20, 0.60, length(hl.yz))) *
                    (0.58 + 0.42 * sin(u_time * 9.0 + hl.z * 4.0));
      metal = mix(metal, vec3(0.05, 0.05, 0.05), soot * 0.85);
      metal += vec3(0.90, 0.14, 0.020) * ember * 0.20;
      colHit = metal;
      nHit = n;
      tHit = t;
      hit = true;
    }
  }

  
  for(int i = 0; i < 4; i++){
    float fi = float(i);
    vec3 c = vec3(6.0 + fi * 2.2, 0.34 + 0.06 * sin(fi), -8.4 + fi * 1.25);
    vec3 r = normalize(vec3(cos(fi * 1.7), 0.0, sin(fi * 1.7)));
    vec3 f = normalize(vec3(-r.z, 0.08 * sin(fi + 0.4), r.x));
    vec3 u = normalize(cross(f, r));

    if(islandOBB(ro, rd, c, r, u, f, vec3(0.92, 0.05, 0.42), t, n, hl) && t < tHit && t < 110.0){
      vec3 metal = mix(vec3(0.25, 0.26, 0.25), vec3(0.48, 0.44, 0.36), islandFbm(hl.xz * 2.0 + fi));
      colHit = metal;
      nHit = n;
      tHit = t;
      hit = true;
    }
  }

  return hit;
}

bool islandWingHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);

  float wingA = 0.18;
  vec2 shore = islandOutDir(wingA);
  vec2 p0 = islandBoundaryAt(wingA) + shore * 2.85;

  float bob = sin(u_time * 0.72 + 1.8) * 0.030;
  vec3 center = vec3(p0.x, ISLE_WATER_Y + 0.105 + bob, p0.y);

  vec2 pA = islandPathPoint(wingA - 0.20);
  vec2 pB = islandPathPoint(wingA + 0.20);
  vec2 long2 = normalize(pB - pA);

  vec3 longAxis = normalize(vec3(long2.x, 0.035, long2.y));
  vec3 upAxis = normalize(vec3(-0.020, 0.995, 0.050));
  vec3 wideAxis = normalize(cross(upAxis, longAxis));
  upAxis = normalize(cross(longAxis, wideAxis));

  float t;
  vec3 n;
  vec3 hl;

  if(!islandOBB(ro, rd, center, longAxis, upAxis, wideAxis, vec3(6.15, 0.045, 1.92), t, n, hl)) return false;
  if(t < 0.04 || t > 130.0) return false;

  vec2 uv = vec2(
    (hl.x + 6.15) / 12.30,
    1.0 - ((hl.z + 1.92) / 3.84)
  );

  vec4 tex = texture2D(u_z4bWingTex, clamp(uv, 0.0, 1.0));
  float rgbMax = max(max(tex.r, tex.g), tex.b);

  
  float mask = u_z4bWingReady * tex.a * smoothstep(0.018, 0.070, rgbMax);
  if(mask < 0.020) return false;

  float wet = 0.62 + 0.38 * islandNoise(center.xz * 0.24 + vec2(u_time * 0.05, -u_time * 0.04));
  vec3 base = mix(vec3(0.42, 0.44, 0.43), tex.rgb, 0.92);
  base = mix(base, vec3(0.06, 0.09, 0.10), (1.0 - smoothstep(0.025, 0.090, abs(hl.y))) * 0.10);
  base += vec3(0.05, 0.08, 0.09) * wet * 0.18;

  tHit = t;
  colHit = base * mask;
  nHit = n;
  return true;
}

vec4 islandMoaiSampleFace(float idx, vec2 uv){
  if(idx < 0.5) return texture2D(u_z4bMoaiFace1, uv);
  if(idx < 1.5) return texture2D(u_z4bMoaiFace2, uv);
  if(idx < 2.5) return texture2D(u_z4bMoaiFace3, uv);
  if(idx < 3.5) return texture2D(u_z4bMoaiFace4, uv);
  return texture2D(u_z4bMoaiFace5, uv);
}














































float islandMoaiLocalMap(vec3 p, vec3 he, vec4 p0, vec4 p1){
  float ny = clamp((p.y + he.y) / (2.0 * he.y), 0.0, 1.0);

  float lower = smoothstep(0.02, 0.30, ny);
  float upper = smoothstep(0.66, 1.0, ny);

  float sideW = mix(p0.x, p0.y, lower);
  sideW *= mix(1.0, p1.x, upper);
  sideW *= mix(0.88, 1.04, smoothstep(0.35, 0.58, ny));

  float sideD = mix(p0.z, p0.w, smoothstep(0.08, 0.58, ny));
  sideD *= mix(1.0, p1.y, upper);

  vec3 q = vec3(p.x / max(sideW, 0.08), p.y, p.z / max(sideD, 0.08));

  float head = islandSdRBox3(q, he, 0.13);
  head = max(head, p.y - he.y * p1.z);

  vec3 neckP = p - vec3(0.0, -he.y * 0.88, -he.z * 0.02);
  float neck = islandSdRBox3(neckP, vec3(he.x * 0.64, he.y * 0.18, he.z * 0.70), 0.060);

  vec3 shoulderP = p - vec3(0.0, -he.y * 1.07, -he.z * 0.04);
  float shoulder = islandSdRBox3(shoulderP, vec3(he.x * 0.86, he.y * 0.18, he.z * 0.78), 0.075);

  vec3 earL = p - vec3(-he.x * 0.70, -he.y * 0.03, he.z * 0.10);
  vec3 earR = p - vec3( he.x * 0.70, -he.y * 0.03, he.z * 0.10);
  float ears = min(
    islandSdRBox3(earL, vec3(he.x * 0.12, he.y * 0.55, he.z * 0.18), 0.040),
    islandSdRBox3(earR, vec3(he.x * 0.12, he.y * 0.55, he.z * 0.18), 0.040)
  );

  vec3 browP = p - vec3(0.0, he.y * 0.25, he.z * 1.02);
  float brow = islandSdRBox3(browP, vec3(he.x * mix(0.52, 0.68, p1.w), he.y * 0.095, he.z * 0.21), 0.035);

  vec3 noseP = p - vec3(0.0, -he.y * 0.04, he.z * 1.14);
  float nose = islandSdRBox3(noseP, vec3(he.x * 0.145, he.y * mix(0.34, 0.50, p1.w), he.z * mix(0.30, 0.44, p1.w)), 0.045);

  vec3 bridgeP = p - vec3(0.0, he.y * 0.12, he.z * 1.10);
  float bridge = islandSdRBox3(bridgeP, vec3(he.x * 0.19, he.y * 0.24, he.z * 0.22), 0.038);

  vec3 cheekL = p - vec3(-he.x * 0.34, -he.y * 0.17, he.z * 0.92);
  vec3 cheekR = p - vec3( he.x * 0.34, -he.y * 0.17, he.z * 0.92);
  float cheeks = min(
    islandSdRBox3(cheekL, vec3(he.x * 0.20, he.y * 0.33, he.z * 0.16), 0.040),
    islandSdRBox3(cheekR, vec3(he.x * 0.20, he.y * 0.33, he.z * 0.16), 0.040)
  );

  vec3 lipP = p - vec3(0.0, -he.y * 0.52, he.z * 1.08);
  float lip = islandSdRBox3(lipP, vec3(he.x * mix(0.32, 0.45, p1.w), he.y * 0.052, he.z * 0.13), 0.026);

  vec3 chinP = p - vec3(0.0, -he.y * 0.72, he.z * 0.83);
  float chin = islandSdRBox3(chinP, vec3(he.x * mix(0.45, 0.62, p1.w), he.y * 0.15, he.z * 0.24), 0.052);

  float d = min(head, neck);
  d = min(d, shoulder);
  d = min(d, ears);
  d = min(d, brow);
  d = min(d, nose);
  d = min(d, bridge);
  d = min(d, cheeks);
  d = min(d, lip);
  d = min(d, chin);

  vec3 eyeCut = p - vec3(0.0, he.y * 0.135, he.z * 1.19);
  float eyes = islandSdRBox3(eyeCut, vec3(he.x * 0.47, he.y * 0.030, he.z * 0.030), 0.006);

  vec3 mouthCut = p - vec3(0.0, -he.y * 0.610, he.z * 1.215);
  float mouth = islandSdRBox3(mouthCut, vec3(he.x * 0.30, he.y * 0.018, he.z * 0.026), 0.005);

  d = max(d, -eyes);
  d = max(d, -mouth);

  return d;
}

vec3 islandMoaiNormalLocal(vec3 p, vec3 he, vec4 p0, vec4 p1){
  const float e = 0.008;
  float d = islandMoaiLocalMap(p, he, p0, p1);

  return normalize(vec3(
    islandMoaiLocalMap(p + vec3(e, 0.0, 0.0), he, p0, p1) - d,
    islandMoaiLocalMap(p + vec3(0.0, e, 0.0), he, p0, p1) - d,
    islandMoaiLocalMap(p + vec3(0.0, 0.0, e), he, p0, p1) - d
  ));
}

vec3 islandMoaiShade(vec3 baseCol, vec3 n, vec3 rd, float dist, vec3 sky, vec3 sunDir){
  float diff = max(0.0, dot(n, sunDir));
  float rim = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
  float light = 0.34 + 0.58 * diff + 0.030 * rim;
  vec3 col = baseCol * light;
  float fog = 1.0 - exp(-dist * 0.010);
  return mix(col, sky, fog * 0.18);
}


vec2 islandMoaiPlace(float ang, float inward){
  vec2 path = islandPathPoint(ang);
  vec2 outv = islandOutDir(ang);
  return path - outv * inward;
}

bool islandMoaiHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  bool hit = false;
  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);

  for(int i = 0; i < 5; i++){
    /* escape mode reuses all five original Moai; none are skipped */

    float fi = float(i);
    vec2 pos = vec2(0.0);
    float yaw = 0.0;
    vec3 he = vec3(0.74, 1.88, 0.92);
    vec4 p0 = vec4(0.46, 0.94, 0.74, 1.16);
    vec4 p1 = vec4(0.76, 0.82, 0.94, 0.52);

    if(i == 0){
      pos = islandMoaiPlace(2.08, 8.2);
      yaw = 1.08;
      he = vec3(0.66, 1.78, 0.88);
      p0 = vec4(0.44, 0.90, 0.72, 1.12);
      p1 = vec4(0.70, 0.78, 0.92, 0.38);
    } else if(i == 1){
      pos = islandMoaiPlace(1.10, 8.4);
      yaw = -0.76;
      he = vec3(0.86, 2.20, 1.06);
      p0 = vec4(0.58, 1.05, 0.82, 1.25);
      p1 = vec4(0.86, 0.94, 0.97, 0.76);
    } else if(i == 2){
      pos = islandMoaiPlace(0.55, 8.4);
      yaw = 0.0;
      he = vec3(0.58, 1.52, 0.84);
      p0 = vec4(0.36, 0.74, 0.74, 1.18);
      p1 = vec4(0.62, 0.98, 0.90, 0.24);
    } else if(i == 3){
      pos = islandMoaiPlace(-0.86, 8.8);
      yaw = -1.570796;
      he = vec3(0.78, 2.00, 0.94);
      p0 = vec4(0.52, 0.98, 0.76, 1.16);
      p1 = vec4(0.74, 0.80, 0.95, 0.60);
    } else {
      pos = islandMoaiPlace(3.72, 8.8);
      yaw = -2.787223;
      he = vec3(0.70, 1.86, 1.12);
      p0 = vec4(0.46, 0.92, 0.92, 1.38);
      p1 = vec4(0.66, 1.06, 0.91, 0.44);
    }


    if(u_z4bIslandEscape > 0.5){
      float eA = mod(u_z4bIslandEscapeWalk0 * ISLE_PATH_SPEED, ISLE_TAU);
      vec2 eStart = islandPathPoint(eA);

      vec3 planeCenter;
      vec3 planeRight;
      vec3 planeUp;
      vec3 planeFwd;
      islandCrashFrame(planeCenter, planeRight, planeUp, planeFwd);

      vec3 doorWorld =
        planeCenter +
        planeRight * 0.0 +
        planeUp * (ISLAND_CAB_FLOOR_Y + 1.12) +
        planeFwd * (-ISLAND_CAB_HALF_LEN + 0.55);

      vec2 eDoor = doorWorld.xz;
      vec2 route = normalize(eDoor - eStart + vec2(0.0001, 0.0));
      vec2 side = normalize(vec2(-route.y, route.x));

      vec2 clusterCenter = mix(eStart, eDoor, 0.42);
      float alongOffset = (fi - 2.0) * 1.42;

      pos = clusterCenter + route * alongOffset + side * 4.65;
      yaw = atan(-side.y, -side.x);
    }

    vec3 center = vec3(pos.x, he.y + 0.02, pos.y);
    vec3 fwd = normalize(vec3(cos(yaw), 0.0, sin(yaw)));
    vec3 right = normalize(vec3(-fwd.z, 0.0, fwd.x));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 bound = he + vec3(0.58, 0.26, 0.66);

    float tBox;
    vec3 nBox;
    vec3 hlBox;

    if(!islandOBB(ro, rd, center, right, up, fwd, bound, tBox, nBox, hlBox)) continue;

    vec3 d0 = ro - center;
    vec3 lro = vec3(dot(d0, right), dot(d0, up), dot(d0, fwd));
    vec3 lrd = vec3(dot(rd, right), dot(rd, up), dot(rd, fwd));

    float t = max(0.04, tBox);
    bool got = false;
    vec3 lp = vec3(0.0);

    for(int k = 0; k < 132; k++){
      lp = lro + lrd * t;

      if(abs(lp.x) > bound.x + 0.34 || abs(lp.y) > bound.y + 0.28 || abs(lp.z) > bound.z + 0.36){
        if(t > tBox + 7.0) break;
      }

      float d = islandMoaiLocalMap(lp, he, p0, p1);

      if(d < 0.006){
        got = true;
        break;
      }

      t += clamp(d * 0.66, 0.007, 0.18);
      if(t > 150.0) break;
    }

    if(!got || t >= tHit) continue;

    vec3 nL = islandMoaiNormalLocal(lp, he, p0, p1);

    vec2 uv = vec2(0.0);
    vec4 tex = vec4(0.0);
    float useTex = 0.0;

    if(abs(nL.z) >= abs(nL.x) && abs(nL.z) >= abs(nL.y)){
      uv = vec2((lp.x / he.x) * 0.5 + 0.5, 1.0 - ((lp.y / he.y) * 0.5 + 0.5));

      if(nL.z > 0.0){
        tex = islandMoaiSampleFace(fi, clamp(uv, 0.0, 1.0));
      } else {
        tex = texture2D(u_z4bMoaiBack, clamp(vec2(1.0 - uv.x, uv.y), 0.0, 1.0));
      }

      useTex = 1.0;
    } else if(abs(nL.x) >= abs(nL.y)){
      uv = vec2((lp.z / he.z) * 0.5 + 0.5, 1.0 - ((lp.y / he.y) * 0.5 + 0.5));

      if(nL.x < 0.0) uv.x = 1.0 - uv.x;

      tex = texture2D(u_z4bMoaiSide, clamp(uv, 0.0, 1.0));
      useTex = 0.95;
    }

    vec3 texCol = clamp(tex.rgb, 0.0, 1.0);
    float grain = islandFbm(lp.xy * 1.20 + pos * 0.08);
    float baseV = mix(0.20, 0.38, islandFbm(pos * 0.11 + lp.xz * 0.22));
    vec3 baseCol = vec3(baseV);
    vec3 col = mix(baseCol, texCol, clamp(u_z4bMoaiReady * tex.a * useTex, 0.0, 1.0));

    col *= 0.90 + 0.10 * grain;
    col = mix(col * 0.64, col, smoothstep(-he.y, -he.y + 0.62, lp.y));

    float grime = islandFbm(lp.xz * 1.55 + pos * 0.09);
    col = mix(col, col * 0.60, smoothstep(0.74, 0.96, grime) * 0.14);

    tHit = t;
    colHit = clamp(col, 0.0, 1.0);
    nHit = normalize(right * nL.x + up * nL.y + fwd * nL.z);
    hit = true;
  }

  return hit;
}

vec3 islandCrashWorldFromLocal(vec3 p){
  vec3 center;
  vec3 right;
  vec3 up;
  vec3 fwd;
  islandCrashFrame(center, right, up, fwd);
  return center + right * p.x + up * p.y + fwd * p.z;
}

vec2 islandEscapeSelfMoaiPos(){
  return islandMoaiPlace(3.72, 8.8);
}

vec2 islandEscapeCabinDoorXZ(){
  vec3 p = islandCrashWorldFromLocal(vec3(0.0, ISLAND_CAB_FLOOR_Y + 1.12, -ISLAND_CAB_HALF_LEN + 0.55));
  return p.xz;
}

float islandEscapeSegmentDist(vec2 p, vec2 a, vec2 b){
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  return length(p - (a + ab * h));
}
float islandEscapePathMask(vec2 xz){
  float eA = mod(u_z4bIslandEscapeWalk0 * ISLE_PATH_SPEED, ISLE_TAU);
  vec2 p0 = islandPathPoint(eA);
  vec2 p2 = islandEscapeCabinDoorXZ();
  vec2 chord = p2 - p0;
  vec2 side = normalize(vec2(-chord.y, chord.x));
  vec2 p1 = mix(p0, p2, 0.48) + side * 1.85;

  float d0 = islandEscapeSegmentDist(xz, p0, p1);
  float d1 = islandEscapeSegmentDist(xz, p1, p2);
  float d = min(d0, d1);

  float body = 1.0 - smoothstep(0.54, 1.18, d);
  float rim = smoothstep(1.28, 0.78, d) - smoothstep(0.42, 0.22, d);

  return clamp(body * 0.82 + rim * 0.34, 0.0, 1.0);
}
vec2 islandTorchAt(int idx){
  return vec2(99999.0, 99999.0);
}
float islandTorchSdf(vec3 p, vec2 base, float flick){
  return 1e9;
}
bool islandTorchHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);
  return false;
}
vec3 islandTorchGroundGlow(vec2 xz){
  return vec3(0.0);
}
bool islandEscapeMoaiRowHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  tHit = 1e9;
  colHit = vec3(0.0);
  nHit = vec3(0.0, 1.0, 0.0);
  return false;
}

vec3 islandNightSky(vec3 rd){
  vec3 top = vec3(0.005, 0.009, 0.018);
  vec3 low = vec3(0.030, 0.040, 0.050);
  float h = smoothstep(-0.08, 0.80, rd.y);
  vec3 sky = mix(low, top, h);
  float stars = step(0.9965, islandHash(floor(rd.xz * 620.0) + floor(rd.y * 240.0)));
  sky += vec3(0.42, 0.50, 0.62) * stars * smoothstep(0.05, 0.65, rd.y);
  return sky;
}

vec3 islandGroundColor(vec3 p){
  vec2 xz = p.xz;
  float shore = islandLandSigned(xz);

  vec3 sand = islandSand(xz) * vec3(0.72, 0.62, 0.48);
  float inner = smoothstep(2.8, 7.0, shore);
  vec3 grass = mix(vec3(0.03, 0.07, 0.03), vec3(0.09, 0.13, 0.05), islandFbm(xz * 0.05));
  vec3 col = mix(sand, grass, inner);
  col = mix(col, sand, (1.0 - smoothstep(2.2, 5.3, shore)) * smoothstep(-0.7, 0.9, shore) * 0.96);

  float scorch = islandCrashScorchField(xz);
  float soot = smoothstep(0.58, 0.92, islandFbm(xz * 0.72 + vec2(2.1, -4.0)));
  float ember = smoothstep(0.90, 0.990, islandNoise(xz * 6.6 + vec2(u_time * 0.55, -u_time * 0.14)));

  col = mix(col, vec3(0.10, 0.075, 0.055), scorch * 0.30);
  col = mix(col, vec3(0.040, 0.035, 0.030), scorch * soot * 0.20);
  col += vec3(0.48, 0.075, 0.012) * scorch * ember * 0.10;

  float escapePath = islandEscapePathMask(xz) * clamp(u_z4bIslandEscape, 0.0, 1.0);
  col = mix(col, vec3(0.018, 0.014, 0.018), escapePath * 0.72);
  col += vec3(0.95, 0.035, 0.12) * escapePath * (0.18 + 0.12 * sin(u_time * 5.0));
  col += vec3(0.0);

  return col * (0.82 + 0.18 * islandNoise(xz * 0.58));
}

vec3 islandShade(vec3 baseCol, vec3 n, vec3 rd, float dist, vec3 sky, vec3 sunDir){
  float diff = max(0.0, dot(n, sunDir));
  vec3 col = baseCol * (vec3(0.18) + vec3(0.76, 0.59, 0.38) * diff);
  return mix(col + vec3(0.11, 0.09, 0.07) * pow(1.0 - max(0.0, dot(n, -rd)), 3.0) * 0.2, sky, 1.0 - exp(-dist * 0.01));
}


float islandGuideLine(vec2 p, vec2 a, vec2 b, float w){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return 1.0 - smoothstep(w, w * 2.4, length(pa - ba * h));
}

vec3 islandApplySelfMoaiActivationGuide(vec3 col, vec3 ro, vec3 rd){
  if(u_z4bIslandDebugGuide < 0.5 || u_z4bIslandEscape > 0.5) return col;
  if(abs(rd.y) < 0.0001) return col;

  float t = (0.060 - ro.y) / rd.y;
  if(t <= 0.0 || t > 180.0) return col;

  vec2 xz = (ro + rd * t).xz;
  vec2 self = islandMoaiPlace(3.72, 8.8);
  float selfYaw = -2.787223;
  vec2 faceDir = normalize(vec2(cos(selfYaw), sin(selfYaw)));
  vec2 faceSide = vec2(-faceDir.y, faceDir.x);
  vec2 eyeTarget = self + faceDir * 1.10;

  float frontMin = 0.05;
  float frontMax = 8.90;
  vec2 rel = xz - eyeTarget;
  float front = dot(rel, faceDir);
  float across = dot(rel, faceSide);
  float laneT = clamp((front - frontMin) / max(frontMax - frontMin, 0.0001), 0.0, 1.0);
  float halfWidth = 0.72 + 0.86 * laneT;

  float insideForward = smoothstep(frontMin - 0.10, frontMin + 0.10, front) * smoothstep(frontMax + 0.10, frontMax - 0.10, front);
  float insideAcross = smoothstep(halfWidth + 0.12, halfWidth - 0.12, abs(across));
  float inside = insideForward * insideAcross;

  float edgeSide = (1.0 - smoothstep(0.030, 0.105, abs(abs(across) - halfWidth))) * insideForward;
  float edgeFront = (1.0 - smoothstep(0.035, 0.125, min(abs(front - frontMin), abs(front - frontMax)))) * step(abs(across), halfWidth + 0.18);
  float centerLine = islandGuideLine(xz, eyeTarget + faceDir * frontMin, eyeTarget + faceDir * frontMax, 0.040) * step(abs(across), halfWidth + 0.18);

  vec3 fillCol = mix(vec3(1.00, 0.75, 0.02), vec3(0.00, 1.00, 0.24), clamp(u_z4bIslandDebugGuideOK, 0.0, 1.0));
  vec3 edgeCol = mix(vec3(1.00, 0.10, 0.85), vec3(0.00, 1.00, 0.95), clamp(u_z4bIslandDebugGuideOK, 0.0, 1.0));

  col = mix(col, fillCol, inside * 0.34);
  col += edgeCol * clamp(max(edgeSide, edgeFront) * 0.90 + centerLine * 0.38, 0.0, 1.0);

  return col;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  vec3 sunDir = normalize(vec3(0.38, 0.56, -0.43));
  float a = mod(u_walk * ISLE_PATH_SPEED, ISLE_TAU);
  float z4bWakeT = clamp(u_wake, 0.0, 1.0); 
  z4bWakeT = z4bWakeT * z4bWakeT * (3.0 - 2.0 * z4bWakeT);

  vec2 cam2 = islandPathPoint(a), pathT, shoreD;
  islandFrame(a, pathT, shoreD);

  float z4bStandY = 1.46 + sin(u_time * 1.45 + a * 2.3) * 0.01;
  float z4bEscape = clamp(u_z4bIslandEscape, 0.0, 1.0);
  float z4bEscMove = max(0.0, u_walk - u_z4bIslandEscapeWalk0);
  float z4bRouteEscape = z4bEscape;
  float z4bWorldEscape = z4bEscape;
  float z4bRouteT = clamp(z4bEscMove * 0.42, 0.0, 1.0);
  float z4bCabT = z4bEscape * clamp((z4bEscMove - 1.05) / 12.40, 0.0, 1.0);
  float z4bInsideCabin = 0.0;
vec3 ro = vec3(cam2.x, mix(0.085, z4bStandY, z4bWakeT), cam2.y);
  vec2 look2 = islandRot(u_mouse.x * 2.05 + (1.0 - z4bWakeT) * -0.88) * normalize(pathT + shoreD * 0.95);
  float z4bBasePitch = clamp(u_mouse.y, -1.0, 1.0) * 0.66;
  float z4bCameraRoll = 0.0;

  if(z4bEscape > 0.5){
    float eA = mod(u_z4bIslandEscapeWalk0 * ISLE_PATH_SPEED, ISLE_TAU);
    vec2 eStart = islandPathPoint(eA);
    vec2 eDoor = islandEscapeCabinDoorXZ();
    vec2 eChord = eDoor - eStart;
    vec2 eSide = normalize(vec2(-eChord.y, eChord.x));
    vec2 eMid = mix(eStart, eDoor, 0.52) + eSide * 1.05;

    float routeT = clamp(z4bEscMove * 0.82, 0.0, 1.0);
    float rt0 = smoothstep(0.0, 1.0, clamp(routeT * 2.0, 0.0, 1.0));
    float rt1 = smoothstep(0.0, 1.0, clamp((routeT - 0.5) * 2.0, 0.0, 1.0));

    vec2 routeA = mix(eStart, eMid, rt0);
    vec2 routeB = mix(eMid, eDoor, rt1);
    cam2 = mix(routeA, routeB, step(0.5, routeT));

    float approachY = mix(z4bStandY, 1.04, smoothstep(0.76, 1.0, routeT));
    ro = vec3(cam2.x, approachY, cam2.y);

    vec2 routeTarget = mix(eMid, eDoor, smoothstep(0.10, 1.0, routeT));
    look2 = normalize(routeTarget - cam2 + vec2(0.001, 0.0));
    look2 = islandRot(u_mouse.x * 0.24) * look2;
    z4bBasePitch = clamp(u_mouse.y, -1.0, 1.0) * 0.28;

    vec2 routeLookBeforeCabin = look2;
    float routePitchBeforeCabin = z4bBasePitch;
    vec3 routeRoBeforeCabin = ro;

    float cabT = z4bEscape * clamp((z4bEscMove - 1.05) / 12.40, 0.0, 1.0);
    if(cabT > 0.0){
      float dreamEnd = islandCabinDreamEnd();

      /*
        Seamless step-up:
        Do not jump from the island route to a hardcoded doorway point.
        Start from the already-rendered island camera position, then ease onto
        the cabin rail with a small vertical arc.
      */
      float entryT = smoothstep(0.000, 0.220, cabT);
      entryT = entryT * entryT * (3.0 - 2.0 * entryT);

      float viewT = smoothstep(0.035, 0.260, cabT);
      viewT = viewT * viewT * (3.0 - 2.0 * viewT);

      float walkT = smoothstep(0.050, 1.000, cabT);
      float cabZ = mix(-ISLAND_CAB_HALF_LEN + 0.55, dreamEnd - 0.70, walkT);
      float cabZT = islandCabinDepthT(cabZ);

      z4bInsideCabin = smoothstep(0.055, 0.180, cabT);

      vec3 center;
      vec3 right;
      vec3 up;
      vec3 fwd;
      islandCrashFrame(center, right, up, fwd);

      vec3 cabinLocal = islandCabinPathPoint(cabZ);
      vec3 cabinEye = islandCrashWorldFromLocal(cabinLocal);

      float liftArc = sin(clamp(entryT, 0.0, 1.0) * ISLE_PI) * 0.115;
      ro = mix(routeRoBeforeCabin, cabinEye, entryT);
      ro.y += liftArc;

      float railStep = mix(0.14, 0.40, smoothstep(0.12, 1.0, cabZT));
      vec3 railBack = islandCabinPathPoint(max(cabZ - railStep, -ISLAND_CAB_HALF_LEN + 0.55));
      vec3 railAhead = islandCabinPathPoint(min(cabZ + railStep, dreamEnd - 0.20));
      vec3 railTangent = normalize(railAhead - railBack + vec3(0.001, 0.0, 0.001));

      vec3 railWorld = normalize(
        right * railTangent.x +
        up    * railTangent.y +
        fwd   * railTangent.z
      );

      vec2 cabinLook = normalize(railWorld.xz + vec2(0.001, 0.0));
      cabinLook = islandRot(u_mouse.x * 0.050) * cabinLook;

      float turnBank = clamp(railTangent.x * 0.52, -0.48, 0.48);
      float rollIn = smoothstep(0.18, 0.46, cabZT) * z4bInsideCabin;
      z4bCameraRoll = turnBank * rollIn;

      float cabinPathPitch = clamp(railWorld.y * 0.76, -0.32, 0.32);

      look2 = normalize(mix(routeLookBeforeCabin, cabinLook, viewT) + vec2(0.001, 0.0));
      z4bBasePitch = mix(
        routePitchBeforeCabin,
        cabinPathPitch + clamp(u_mouse.y, -1.0, 1.0) * 0.12,
        viewT
      );
    }
  }

  if(z4bEscape > 0.5){
    vec3 z4bEyeLocal = islandCrashToLocal(ro);
    z4bInsideCabin = max(z4bInsideCabin, islandCrashPocketGate(z4bEyeLocal));
  }

  float z4bWakePitch = mix(-1.08, z4bBasePitch, z4bWakeT);
  vec3 z4bFwdFlat = normalize(vec3(look2.x, 0.0, look2.y));
  vec3 z4bRightBase = normalize(cross(z4bFwdFlat, vec3(0.0, 1.0, 0.0)));
  vec3 z4bUpBase = normalize(cross(z4bRightBase, z4bFwdFlat));
  float z4bRollC = cos(z4bCameraRoll);
  float z4bRollS = sin(z4bCameraRoll);
  vec3 z4bRight = normalize(z4bRightBase * z4bRollC + z4bUpBase * z4bRollS);
  vec3 z4bUp = normalize(-z4bRightBase * z4bRollS + z4bUpBase * z4bRollC);
  vec3 z4bFwd = normalize(vec3(look2.x, z4bWakePitch, look2.y));
  vec2 z4bRayUV = uv;
  vec3 rd = normalize(z4bFwd * 1.06 + z4bRayUV.x * z4bRight + z4bRayUV.y * z4bUp);

  float z4bEscapeVisual = clamp(u_z4bIslandEscape, 0.0, 1.0);
  vec3 z4bOpenSky = mix(islandSky(rd, sunDir), islandNightSky(rd), z4bEscapeVisual);
  vec3 z4bCabinSky = mix(vec3(0.010, 0.012, 0.016), vec3(0.028, 0.031, 0.038), smoothstep(-0.25, 0.55, rd.y));
  z4bCabinSky += vec3(0.010, 0.012, 0.014) * smoothstep(0.15, 1.0, z4bCabT);
  vec3 sky = mix(z4bOpenSky, z4bCabinSky, z4bInsideCabin);
  vec3 col = sky;
  float tG = z4bInsideCabin > 0.05 ? -1.0 : -ro.y / rd.y;
  float tW = z4bInsideCabin > 0.05 ? -1.0 : (ISLE_WATER_Y - ro.y) / rd.y;
  float tPlane = 1e9, tWreck = 1e9, tWing = 1e9, tMoai = 1e9, tPalm = 1e9, tTorch = 1e9;
  vec3 cPl, nPl, cWr, nWr, cWi, nWi, cMo, nMo, cPa, nPa, cTo, nTo;

  bool z4bSuppressLooseWreck = z4bEscape > 0.5 && z4bRouteT > 0.08;
  bool z4bCabinOccludeOutside = z4bInsideCabin > 0.08;
  bool hPl = islandCrashPlaneHit(ro, rd, tPlane, cPl, nPl);
  bool hWr = (z4bCabinOccludeOutside || z4bSuppressLooseWreck) ? false : islandWreckHit(ro, rd, tWreck, cWr, nWr);
  bool hWi = (z4bCabinOccludeOutside || z4bSuppressLooseWreck) ? false : islandWingHit(ro, rd, tWing, cWi, nWi);
  bool hMo = z4bCabinOccludeOutside ? false : islandMoaiHit(ro, rd, tMoai, cMo, nMo);
  bool hPa = z4bCabinOccludeOutside ? false : islandPalmHit(ro, rd, tPalm, cPa, nPa);
  bool hTo = false;

  float tSc = min(tG > 0.0 ? tG : 1e9, tW > 0.0 ? tW : 1e9);
  if(hTo && tTorch < min(tSc, min(tPlane, min(tWreck, min(tWing, min(tMoai, tPalm)))))) col = cTo;
  else if(hPa && tPalm < min(tSc, min(tPlane, min(tWreck, min(tWing, tMoai))))) col = islandShade(cPa, nPa, rd, tPalm, sky, sunDir);
  else if(hMo && tMoai < min(tSc, min(tPlane, min(tWreck, min(tWing, tPalm))))) col = islandMoaiShade(cMo, nMo, rd, tMoai, sky, sunDir);
  else if(hPl && tPlane < min(tSc, min(tWreck, min(tWing, tMoai)))){
    col = islandShade(cPl, nPl, rd, tPlane, sky, sunDir);
    if(z4bEscapeVisual > 0.5 && z4bCabT > 0.0){
      col = islandCrashCabinFog(col, ro, rd, tPlane);
      col = islandCrashCabinHallucination(col, ro, rd, tPlane);
    }
  }
  else if(hWr && tWreck < min(tSc, min(tWing, tMoai))) col = islandShade(cWr, nWr, rd, tWreck, sky, sunDir);
  else if(hWi && tWing < min(tSc, tMoai)) col = islandShade(cWi, nWi, rd, tWing, sky, sunDir);
  else if(tG > 0.0){
    vec3 gp = ro + rd * tG;
    if(islandLandSigned(gp.xz) > -0.65) col = islandShade(islandGroundColor(gp), normalize(vec3(0,1,0)), rd, tG, sky, sunDir);
    else if(tW > 0.0) col = islandWater(ro + rd * tW, rd, sky, sunDir, tW);
  } else if(tW > 0.0) col = islandWater(ro + rd * tW, rd, sky, sunDir, tW);

  if(z4bEscapeVisual > 0.5 && z4bInsideCabin > 0.0){
    col = islandCrashCabinVoid(col, ro, rd);
    float z4bSceneDist = min(tPlane, min(tSc, min(tMoai, min(tPalm, min(tWreck, tWing)))));
    if(z4bSceneDist < 1e8) col = islandCrashCabinHallucination(col, ro, rd, z4bSceneDist);
    col = col * mix(1.0, 1.12, z4bInsideCabin) + vec3(0.004, 0.005, 0.006) * z4bInsideCabin;
  }
  vec3 z4bFinalCol = (1.0 - exp(-col * 1.04)) * (1.0 - u_blink);
  z4bFinalCol = applyHallucination(z4bFinalCol, uv, u_modeSeed, 8.0, u_trip, u_time);
  z4bFinalCol *= smoothstep(0.03, 0.76, z4bWakeT);
  z4bFinalCol = mix(z4bFinalCol, vec3(1.0), clamp(u_z4bIslandEscapeFlash, 0.0, 1.0));
  gl_FragColor = vec4(z4bFinalCol, 1.0);
  gl_FragColor.rgb = islandApplySelfMoaiActivationGuide(gl_FragColor.rgb, ro, rd);
}
`),
  (function () {
    function installLogoTextureHook() {
      return (
        (window.__z4bInstallIslandLogoTextureHook = function () {
          return !0;
        }),
        !0
      );
    }
    function startWake(now) {
      if (!this.z4bIslandStarted) {
        ((this.z4bIslandStarted = !0),
          cleanupWakeBits(),
          this._installZ4BIslandLogoTextureHook(),
          makeBlackOverlay(),
          (window.__z4bIslandActive = !0),
          (window.__z4bIslandWakeStart = 0),
          (window.__z4bIslandWakeDuration = 0),
          (window.__z4bIslandLookX = 0),
          (window.__z4bIslandLookY = 0));
        try {
          this._setFog && this._setFog(0, 0);
        } catch (e) {}
        (this.destroy(),
          setTimeout(function () {
            (cleanupWakeBits(),
              window.__z4bInstallIslandLogoTextureHook &&
                window.__z4bInstallIslandLogoTextureHook());
            const ov = makeBlackOverlay(),
              fadeStart = performance.now();
            ((window.__z4bIslandWakeStart = fadeStart + 650),
              (window.__z4bIslandWakeDuration = 3600),
              "function" == typeof window.startZ4BIsland
                ? (window.startZ4BIsland(),
                  window.__z4bInstallIslandLogoTextureHook &&
                    window.__z4bInstallIslandLogoTextureHook(),
                  requestAnimationFrame(function frame() {
                    const fadeT =
                      ((t = (performance.now() - fadeStart - 650) / 2600),
                      (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t));
                    var t;
                    ((ov.style.opacity = String(1 - fadeT)),
                      fadeT < 1
                        ? requestAnimationFrame(frame)
                        : ov && ov.parentNode && ov.parentNode.removeChild(ov));
                  }))
                : console.error("[Zone4] startZ4BIsland is missing"));
          }, 120));
      }
      function cleanupWakeBits() {
        const old = document.getElementById("z4b-island-wake-overlay");
        old && old.parentNode && old.parentNode.removeChild(old);
        const canvases = Array.prototype.slice.call(
            document.querySelectorAll("canvas"),
          ),
          c = document.getElementById("c");
        (c && canvases.indexOf(c) < 0 && canvases.unshift(c),
          canvases.forEach(function (el) {
            (el.dataset &&
              el.dataset.z4bWakeTransforming &&
              delete el.dataset.z4bWakeTransforming,
              (el.style.transition = ""),
              (el.style.transformOrigin = ""),
              (el.style.transform = ""),
              (el.style.filter = ""),
              (el.style.willChange = ""));
          }));
      }
      function makeBlackOverlay() {
        let ov = document.getElementById("z4b-island-wake-overlay");
        return (
          ov ||
            ((ov = document.createElement("div")),
            (ov.id = "z4b-island-wake-overlay"),
            document.body.appendChild(ov)),
          (ov.style.cssText =
            "position:fixed;inset:0;background:#000;opacity:1;z-index:2147483647;pointer-events:none;transition:none;"),
          ov
        );
      }
    }
    window.Zone4IslandBridge = {
      installLogoTextureHook: function (engine) {
        return installLogoTextureHook.call(engine);
      },
      startWake: function (engine, now) {
        return startWake.call(engine, now);
      },
    };
  })());
