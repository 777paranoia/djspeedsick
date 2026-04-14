const IS_MOBILE =
          /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ) ||
          (navigator.maxTouchPoints > 1 && window.innerWidth < 1024),
        canvas = document.getElementById("c"),
        gl = canvas.getContext("webgl", {
          antialias: !1,
          alpha: !1,
          preserveDrawingBuffer: !0,
        });
      (gl.getExtension("OES_texture_float") ||
        gl.getExtension("OES_texture_half_float"),
        canvas.addEventListener(
          "webglcontextlost",
          function (e) {
            (e.preventDefault(), console.warn("[GL] Context lost"));
          },
          !1,
        ),
        (window.__ALL_VIDEOS = window.__ALL_VIDEOS || []),
        (new Image().src = "files/img/void/skyline.png"),
        (function () {
          function e() {
            let e = document.getElementById("__video_bin");
            return (
              e ||
              (document.body
                ? ((e = document.createElement("div")),
                  (e.id = "__video_bin"),
                  (e.style.cssText =
                    "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;"),
                  document.body.appendChild(e),
                  e)
                : null)
            );
          }
          function t(t, i) {
            const n = document.createElement("video");
            ((n.muted = !0),
              (n.playsInline = !0),
              (n.loop = !!i),
              (n.preload = "auto"),
              (n.autoplay = !0),
              n.setAttribute("playsinline", ""),
              n.setAttribute("webkit-playsinline", ""),
              (n.src = t));
            const l = e();
            l && l.appendChild(n);
            const o = n.play();
            return (
              o && o.catch && o.catch(() => {}),
              window.__ALL_VIDEOS.push(n),
              n
            );
          }
          ((window.__primeVideoPool = function () {
            const e = { fixed: {}, mapped: [] };
            ((e.fixed["files/mov/bh2.mp4"] = [
              t("files/mov/bh2.mp4", !0),
              t("files/mov/bh2.mp4", !0),
              t("files/mov/bh2.mp4", !0),
            ]),
              (e.fixed["files/mov/earth.mp4"] = [
                t("files/mov/earth.mp4", !0),
              ]));
            const i = window.MAPPED_VIDEOS || [];
            if (i.length && !IS_MOBILE) {
              let n = [...i].sort(() => Math.random() - 0.5);
              for (let i = 0; i < 4; i++) {
                const l = "files/mov/mapped/" + n[i % n.length];
                e.mapped.push(t(l, !0));
              }
            }
            window.__videoPool = e;
          }),
            (window.__claimPoolVid = function (e) {
              const t = window.__videoPool;
              if (!t) return null;
              const i = t.fixed[e];
              return i && i.length ? i.shift() : null;
            }),
            (window.__claimMappedPoolVid = function () {
              const e = window.__videoPool;
              return e && e.mapped.length ? e.mapped.shift() : null;
            }),
            (window.__registerVideo = function (t) {
              try {
                ((t.muted = !0),
                  (t.playsInline = !0),
                  t.setAttribute("playsinline", ""),
                  t.setAttribute("webkit-playsinline", ""),
                  (t.preload = "auto"),
                  (t.autoplay = !0));
                const i = e();
                if (
                  (i && t.parentNode !== i && i.appendChild(t),
                  window._siteEntered)
                ) {
                  const e = t.play();
                  e && e.catch && e.catch(() => {});
                }
              } catch (e) {}
              return (window.__ALL_VIDEOS.push(t), t);
            }),
            (window.__unlockAllVideos = function () {
              const e = window.__ALL_VIDEOS || [];
              for (let t = 0; t < e.length; t++) {
                const i = e[t];
                if (i)
                  try {
                    ((i.muted = !0),
                      (i.playsInline = !0),
                      i.setAttribute("playsinline", ""),
                      i.setAttribute("webkit-playsinline", ""));
                    const e = i.play();
                    e && e.catch && e.catch(() => {});
                  } catch (e) {}
              }
            }));
        })());
      const fit = () => {
        const e = IS_MOBILE
          ? Math.min(1, devicePixelRatio || 1)
          : Math.min(2, devicePixelRatio || 1);
        ((canvas.width = Math.floor(innerWidth * e)),
          (canvas.height = Math.floor(innerHeight * e)),
          gl.viewport(0, 0, canvas.width, canvas.height));
      };
      let lastWidth = innerWidth,
        __resizeTimer = null;
      (window.addEventListener("resize", () => {
        if ((fit(), innerWidth !== lastWidth))
          return ((lastWidth = innerWidth), void rebuildFBOs());
        (clearTimeout(__resizeTimer),
          (__resizeTimer = setTimeout(() => {
            (fit(), rebuildFBOs());
          }, 200)));
      }),
        fit());
      const staticAssets = {};
      function loadStaticTex(e) {
        const t = gl.createTexture();
        (gl.bindTexture(gl.TEXTURE_2D, t),
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
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR));
        const i = new Image();
        return (
          (i.crossOrigin = "anonymous"),
          (t._w = 1),
          (t._h = 1),
          (i.onload = () => {
            ((t._w = i.naturalWidth || i.width || 1),
              (t._h = i.naturalHeight || i.height || 1),
              gl.activeTexture(gl.TEXTURE0),
              gl.bindTexture(gl.TEXTURE_2D, t),
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                i,
              ));
          }),
          (i.src = e),
          t
        );
      }
      (IS_MOBILE
        ? ((staticAssets.b1 = loadStaticTex("files/img/void/building01.png")),
          (staticAssets.b2 = loadStaticTex("files/img/void/building09.png")),
          (staticAssets.b3 = loadStaticTex("files/img/void/building08.png")),
          (staticAssets.b4 = staticAssets.b1),
          (staticAssets.b5 = staticAssets.b2),
          (staticAssets.b6 = staticAssets.b3))
        : ((staticAssets.b1 = loadStaticTex("files/img/void/building01.png")),
          (staticAssets.b2 = loadStaticTex("files/img/void/building09.png")),
          (staticAssets.b3 = loadStaticTex("files/img/void/building08.png")),
          (staticAssets.b4 = loadStaticTex("files/img/void/building07.png")),
          (staticAssets.b5 = loadStaticTex("files/img/void/building06.png")),
          (staticAssets.b6 = loadStaticTex("files/img/void/building05.png"))),
        (staticAssets.windowMask = loadStaticTex(
          "files/img/void/canalport-mask.png",
        )),
        (staticAssets.oobMask = loadStaticTex("files/img/void/oob-mask.png")));
      const DUMMY_BLACK = (() => {
          const e = gl.createTexture();
          return (
            gl.bindTexture(gl.TEXTURE_2D, e),
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
            e
          );
        })(),
        compile = (e, t) => {
          const i = gl.createShader(e);
          if (
            (gl.shaderSource(i, t),
            gl.compileShader(i),
            !gl.getShaderParameter(i, gl.COMPILE_STATUS))
          ) {
            const t = gl.getShaderInfoLog(i),
              n = e === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";
            return (
              console.error(`[GLSL] ${n} shader compile error:\n${t}`),
              gl.deleteShader(i),
              null
            );
          }
          return i;
        },
        PROGRAM_CACHE = {};
      function buildProgram(e) {
        if (PROGRAM_CACHE[e]) return PROGRAM_CACHE[e];
        if (!GLSL.modules[e] && "zone2_hallway" !== e && "z2_composite" !== e)
          return null;
        const t = gl.createProgram(),
          i = compile(gl.VERTEX_SHADER, GLSL.vert);
        if (!i) return null;
        gl.attachShader(t, i);
        let n =
          "room_left" === e ||
          "room_right" === e ||
          "room_back" === e ||
          "room_door" === e ||
          "zone2_hallway" === e ||
          "z2_composite" === e
            ? GLSL.modules[e]
            : GLSL.core + GLSL.modules[e];        
            if (!n || n.includes("undefined")) return null;
        IS_MOBILE && (n = "#define MOBILE\n" + n);
        const l = compile(gl.FRAGMENT_SHADER, n);
        return l
          ? (gl.attachShader(t, l),
            gl.linkProgram(t),
            gl.getProgramParameter(t, gl.LINK_STATUS)
              ? ((PROGRAM_CACHE[e] = t), t)
              : (console.error(
                  `[GLSL] PROGRAM link error (${e}):\n${gl.getProgramInfoLog(t)}`,
                ),
                null))
          : null;
      }
      function warmPrograms() {
        const e = [
          "city",
          "fractal",
          "bh",
          "mirror",
          "ocean",
          "earth",
          "deadcity",
          "goreville",
          "plane",
          "room_left",
          "room_right",
          "room_back",
          "room_door",
        ];
        for (let t = 0; t < e.length; t++)
          GLSL.modules[e[t]] && buildProgram(e[t]);
      }
      var simProg = null;
      IS_MOBILE ||
        ((simProg = gl.createProgram()),
        gl.attachShader(simProg, compile(gl.VERTEX_SHADER, GLSL.vert)),
        gl.attachShader(simProg, compile(gl.FRAGMENT_SHADER, GLSL.sim)),
        gl.linkProgram(simProg),
        gl.useProgram(simProg),
        gl.uniform1i(gl.getUniformLocation(simProg, "u_window"), 7),
        gl.uniform1i(gl.getUniformLocation(simProg, "u_prev"), 6));
      let fbos = [],
        texs = [],
        mirrorFBO = null,
        windowFBO = null;
      function makeFBO() {
        const e = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, e);
        var t = IS_MOBILE ? Math.floor(0.5 * canvas.width) : canvas.width,
          i = IS_MOBILE ? Math.floor(0.5 * canvas.height) : canvas.height;
        (gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          t,
          i,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        ),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR));
        const n = gl.createFramebuffer();
        return (
          gl.bindFramebuffer(gl.FRAMEBUFFER, n),
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            e,
            0,
          ),
          gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          { fbo: n, tex: e }
        );
      }
      function rebuildFBOs() {
        if (IS_MOBILE) {
          var e = gl.createTexture();
          return (
            gl.bindTexture(gl.TEXTURE_2D, e),
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
            (texs = [e, e]),
            void (fbos = [
              { fbo: null, tex: e },
              { fbo: null, tex: e },
            ])
          );
        }
        ((fbos = [makeFBO(), makeFBO()]),
          (texs = [fbos[0].tex, fbos[1].tex]),
          (mirrorFBO = makeFBO()),
          (windowFBO = makeFBO()));
      }
      (rebuildFBOs(), IS_MOBILE || warmPrograms());
      let ping = 0;
      const buf = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, buf),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ));
      const BACKLIGHT = (() => {
        const e = gl.createProgram();
        return (
          gl.attachShader(e, compile(gl.VERTEX_SHADER, GLSL.vert)),
          gl.attachShader(
            e,
            compile(
              gl.FRAGMENT_SHADER,
              "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }",
            ),
          ),
          gl.linkProgram(e),
          { prog: e, Ucol: gl.getUniformLocation(e, "u_col") }
        );
      })();
      function drawBacklight(e, t, i) {
        if (t <= 5e-4) return;
        gl.useProgram(BACKLIGHT.prog);
        const n = gl.getAttribLocation(BACKLIGHT.prog, "p");
        (gl.enableVertexAttribArray(n),
          gl.vertexAttribPointer(n, 2, gl.FLOAT, !1, 0, 0));
        const l = 0.001 * e,
          o = Math.max(0, Math.min(1, t + 0.08 * i)),
          r = 0.35 + 0.25 * Math.sin(0.7 * l),
          a = 0.3 + 0.25 * Math.sin(0.55 * l + 2.1),
          g = 0.4 + 0.25 * Math.sin(0.6 * l + 4.2);
        (gl.enable(gl.BLEND),
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE),
          gl.uniform4f(BACKLIGHT.Ucol, r, a, g, o),
          gl.drawArrays(gl.TRIANGLES, 0, 3),
          gl.disable(gl.BLEND));
      }
      class ActiveMode {
        constructor(e) {
          this.id = e;
          let t = {
            0: "city",
            1: "city",
            2: "fractal",
            3: "bh",
            4: "mirror",
            5: "ocean",
            6: "earth",
            7: "deadcity",
            8: "goreville",
            9: "plane",
            98: "room_left",
            99: "room_right",
            97: "room_back",
            96: "room_door",
          }[this.id];
          if (
            ("mirror" === t ||
            "room_left" === t ||
            "room_right" === t ||
            "room_back" === t ||
            "room_door" === t
              ? (this.isOOB = !1)
              : (window.__lastOOB
                  ? (this.isOOB = !1)
                  : (this.isOOB = Math.random() < 0.25),
                (window.__lastOOB = this.isOOB)),
            (this.maskTex = this.isOOB
              ? staticAssets.oobMask
              : staticAssets.windowMask),
            (this.textures = []),
            (this.vidObjs = []),
            (this.startTime = -1),
            (this.prog = buildProgram(t)),
            this.prog)
          )
            if (
              (gl.useProgram(this.prog),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB1"), 0),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB2"), 1),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB3"), 2),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB4"), 3),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB5"), 4),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texB6"), 5),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_water"), 6),
              gl.uniform1i(gl.getUniformLocation(this.prog, "u_texWindow"), 7),
              IS_MOBILE
                ? (gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv1"),
                    7,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv2"),
                    7,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv3"),
                    7,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv4"),
                    7,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv6"),
                    7,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv5"),
                    7,
                  ))
                : (gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv1"),
                    8,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv2"),
                    9,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv3"),
                    10,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv4"),
                    11,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv6"),
                    12,
                  ),
                  gl.uniform1i(
                    gl.getUniformLocation(this.prog, "u_texEnv5"),
                    13,
                  )),
              (this.U = {
                res: gl.getUniformLocation(this.prog, "u_resolution"),
                time: gl.getUniformLocation(this.prog, "u_time"),
                mouse: gl.getUniformLocation(this.prog, "u_mouse"),
                mode: gl.getUniformLocation(this.prog, "u_mode"),
                blink: gl.getUniformLocation(this.prog, "u_blink"),
                flash: gl.getUniformLocation(this.prog, "u_flash"),
                shake: gl.getUniformLocation(this.prog, "u_shake"),
                wake: gl.getUniformLocation(this.prog, "u_wake"),
                modeSeed: gl.getUniformLocation(this.prog, "u_modeSeed"),
                audio: gl.getUniformLocation(this.prog, "u_audio"),
                texSize: gl.getUniformLocation(this.prog, "u_texSize"),
                modeTime: gl.getUniformLocation(this.prog, "u_modeTime"),
                trip: gl.getUniformLocation(this.prog, "u_trip"),
              }),
              "room_left" === t)
            )
              ((this.env1 = loadStaticTex(
                "files/img/rooms/z1/left-mobile.png",
              )),
                this.textures.push(this.env1),
                (this.galleryTex = [0, 1, 2, 3].map(() =>
                  this._makeBlackTex(),
                )),
                this.galleryTex.forEach((e) => this.textures.push(e)),
                [0, 1, 2].forEach((e) => this._loadGallerySlot(e)));
            else if ("room_back" === t)
              ((this.env1 = loadStaticTex("files/img/rooms/z1/back.png")),
                this.textures.push(this.env1),
                (this.bcTex = this._makeBlackTex()),
                this.textures.push(this.bcTex));
            else if ("room_door" === t)
              ((this.env1 = loadStaticTex("files/img/rooms/z1/door.png")),
                this.textures.push(this.env1),
                (this.bcTex = loadStaticTex("files/img/rooms/z1/platform.png")),
                this.textures.push(this.bcTex));
            else if ("room_right" === t)
              ((this.env1 = loadStaticTex(
                "files/img/rooms/z1/right-mobile.png",
              )),
                this.textures.push(this.env1),
                (this.vidTexs = [0, 1, 2, 3].map(() => this._makeBlackTex())),
                (this.vidObjs = [0, 1, 2, 3].map(() =>
                  this._makeMappedVideo(),
                )),
                this.vidTexs.forEach((e) => this.textures.push(e)));
            else {
              if ("city" === t || "fractal" === t || "plane" === t)
                this.env1 = loadStaticTex("files/img/void/skyline.png");
              else if ("mirror" === t) {
                this.env1 = loadStaticTex(
                  window.__mirrorVariants
                    ? window.__mirrorVariants[0]
                    : "files/img/rooms/z1/mirror-b.png",
                );
                const e = [
                  "files/img/rooms/z1/mirror-v1.png",
                  "files/img/rooms/z1/mirror-v2.png",
                  "files/img/rooms/z1/mirror-v3.png",
                ];
                ((this.env2 = loadStaticTex(
                  window.__mirrorOverlay ||
                    e[Math.floor(Math.random() * e.length)],
                )),
                  this.textures.push(this.env2),
                  (this.bcTex = this._makeBlackTex()),
                  this.textures.push(this.bcTex));
              } else
                "goreville" === t
                  ? ((this.env1 = loadStaticTex("files/img/void/goresky.png")),
                    (this.env2 = loadStaticTex(
                      "files/img/void/gorebuilding01.png",
                    )),
                    (this.env3 = loadStaticTex(
                      "files/img/void/gorebuilding02.png",
                    )),
                    (this.env4 = loadStaticTex(
                      "files/img/void/gorebuilding03.png",
                    )),
                    (this.env5 = loadStaticTex("files/img/void/gorewater.png")),
                    this.textures.push(
                      this.env1,
                      this.env2,
                      this.env3,
                      this.env4,
                      this.env5,
                    ))
                  : "ocean" === t
                    ? (this.env1 = loadStaticTex(
                        "files/img/rooms/z1/ocean.png",
                      ))
                    : "deadcity" === t
                      ? ((this.env1 = this.loadVideo("files/mov/bh2.mp4")),
                        (this.env2 = loadStaticTex(
                          "files/img/rooms/z1/deadcity.png",
                        )),
                        this.textures.push(this.env2))
                      : "bh" === t
                        ? (this.env1 = this.loadVideo("files/mov/bh2.mp4"))
                        : "earth" === t &&
                          (this.env1 = this.loadVideo("files/mov/earth.mp4"));
              this.env1 &&
                !["deadcity", "bh", "earth", "goreville"].includes(t) &&
                this.textures.push(this.env1);
            }
        }
        _makeBlackTex() {
          const e = gl.createTexture();
          return (
            gl.bindTexture(gl.TEXTURE_2D, e),
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
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
            e
          );
        }
        _makeMappedVideo() {
          const e =
            window.__claimMappedPoolVid && window.__claimMappedPoolVid();
          if (e) return e;
          const t = window.MAPPED_VIDEOS || [],
            i = "files/mov/mapped/" + t[Math.floor(Math.random() * t.length)],
            n = document.createElement("video");
          return (
            (n.muted = !0),
            (n.playsInline = !0),
            (n.loop = !0),
            (n.src = i),
            window.__registerVideo && window.__registerVideo(n),
            n
          );
        }
        _loadGallerySlot(e) {
          const t = window.galleryImages || [],
            i = "files/img/gallery/" + t[Math.floor(Math.random() * t.length)],
            n = new Image();
          ((n.crossOrigin = "anonymous"),
            (n.onload = () => {
              (gl.activeTexture(gl.TEXTURE0),
                gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[e]),
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  n,
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
                ));
            }),
            (n.src = i));
        }
        loadVideo(e) {
          const t = gl.createTexture();
          (gl.bindTexture(gl.TEXTURE_2D, t),
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
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR));
          let i = window.__claimPoolVid && window.__claimPoolVid(e);
          if (i) i.loop = !0;
          else {
            ((i = document.createElement("video")),
              (i.muted = !0),
              (i.playsInline = !0),
              (i.loop = !0));
            const t = document.createElement("source");
            ((t.src = e),
              (t.type = "video/webm"),
              i.appendChild(t),
              window.__registerVideo && window.__registerVideo(i));
          }
          return ((this.videoObj = i), this.textures.push(t), t);
        }
        render(e, t, i, n, l, o, r, a, g) {
          if (!this.prog) return;
          this.startTime < 0 && (this.startTime = e);
          let s = 0.001 * (e - this.startTime);
          gl.useProgram(this.prog);
          const c = gl.getAttribLocation(this.prog, "p");
          (gl.enableVertexAttribArray(c),
            gl.vertexAttribPointer(c, 2, gl.FLOAT, !1, 0, 0),
            !IS_MOBILE &&
              this.videoObj &&
              this.videoObj.readyState >= 2 &&
              (gl.activeTexture(gl.TEXTURE8),
              gl.bindTexture(gl.TEXTURE_2D, this.env1),
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.videoObj,
              )),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b1),
            gl.activeTexture(gl.TEXTURE1),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b2),
            gl.activeTexture(gl.TEXTURE2),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b3),
            gl.activeTexture(gl.TEXTURE3),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b4),
            gl.activeTexture(gl.TEXTURE4),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b5),
            gl.activeTexture(gl.TEXTURE5),
            gl.bindTexture(gl.TEXTURE_2D, staticAssets.b6),
            gl.activeTexture(gl.TEXTURE6),
            gl.bindTexture(gl.TEXTURE_2D, texs[ping]),
            gl.activeTexture(gl.TEXTURE7),
            !IS_MOBILE || (98 !== this.id && 99 !== this.id && 97 !== this.id && 96 !== this.id)
              ? gl.bindTexture(gl.TEXTURE_2D, this.maskTex)
              : gl.bindTexture(gl.TEXTURE_2D, this.env1),
            IS_MOBILE ||
              (this.env1 &&
                (gl.activeTexture(gl.TEXTURE8),
                gl.bindTexture(gl.TEXTURE_2D, this.env1)),
              gl.activeTexture(gl.TEXTURE9),
              gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK),
              gl.activeTexture(gl.TEXTURE10),
              gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK),
              gl.activeTexture(gl.TEXTURE11),
              gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK),
              gl.activeTexture(gl.TEXTURE12),
              gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK),
              gl.activeTexture(gl.TEXTURE13),
              gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK),
              7 === this.id &&
                this.env2 &&
                (gl.activeTexture(gl.TEXTURE9),
                gl.bindTexture(gl.TEXTURE_2D, this.env2)),
              8 === this.id &&
                this.env2 &&
                (gl.activeTexture(gl.TEXTURE9),
                gl.bindTexture(gl.TEXTURE_2D, this.env2),
                gl.activeTexture(gl.TEXTURE10),
                gl.bindTexture(gl.TEXTURE_2D, this.env3 || DUMMY_BLACK),
                gl.activeTexture(gl.TEXTURE11),
                gl.bindTexture(gl.TEXTURE_2D, this.env4 || DUMMY_BLACK),
                gl.activeTexture(gl.TEXTURE13),
                gl.bindTexture(gl.TEXTURE_2D, this.env5 || DUMMY_BLACK)),
              4 === this.id &&
                (window.butterchurnVisualizer &&
                  window.bcCanvas &&
                  (gl.activeTexture(gl.TEXTURE9),
                  gl.bindTexture(gl.TEXTURE_2D, this.bcTex || DUMMY_BLACK),
                  gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    window.bcCanvas,
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
                  gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR,
                  )),
                this.env2 &&
                  (gl.activeTexture(gl.TEXTURE10),
                  gl.bindTexture(gl.TEXTURE_2D, this.env2))),
              98 === this.id &&
                this.galleryTex &&
                (gl.activeTexture(gl.TEXTURE9),
                gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[0]),
                gl.activeTexture(gl.TEXTURE10),
                gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[1]),
                gl.activeTexture(gl.TEXTURE11),
                gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[2]),
                gl.activeTexture(gl.TEXTURE12),
                gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[3]),
                window.butterchurnVisualizer &&
                  window.bcCanvas &&
                  gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    window.bcCanvas,
                  )),
              97 === this.id &&
                window.butterchurnVisualizer &&
                window.bcCanvas &&
                (gl.activeTexture(gl.TEXTURE9),
                gl.bindTexture(gl.TEXTURE_2D, this.bcTex || DUMMY_BLACK),
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !1),
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  window.bcCanvas,
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
                )),
              96 === this.id &&
                this.bcTex &&
                (gl.activeTexture(gl.TEXTURE9),
                gl.bindTexture(gl.TEXTURE_2D, this.bcTex)),
              (99 !== this.id && 97 !== this.id) ||
                (99 === this.id &&
                  this.vidObjs.forEach((e, t) => {
                    e.readyState >= 2 &&
                      (gl.activeTexture(gl.TEXTURE9 + t),
                      gl.bindTexture(gl.TEXTURE_2D, this.vidTexs[t]),
                      gl.texImage2D(
                        gl.TEXTURE_2D,
                        0,
                        gl.RGBA,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        e,
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
                      gl.texParameteri(
                        gl.TEXTURE_2D,
                        gl.TEXTURE_MIN_FILTER,
                        gl.LINEAR,
                      ));
                  }),
                gl.activeTexture(gl.TEXTURE13),
                gl.bindTexture(
                  gl.TEXTURE_2D,
                  mirrorFBO ? mirrorFBO.tex : DUMMY_BLACK,
                ))),
            gl.uniform1f(this.U.audio, n),
            gl.uniform2f(this.U.res, canvas.width, canvas.height),
            gl.uniform1f(this.U.time, 0.001 * e),
            gl.uniform2f(this.U.mouse, t, i),
            gl.uniform1i(this.U.mode, this.id),
            gl.uniform1f(this.U.blink, l),
            gl.uniform1f(this.U.flash, o),
            gl.uniform1f(this.U.shake, r),
            gl.uniform1f(this.U.wake, a),
            gl.uniform1f(this.U.modeSeed, g),
            null !== this.U.isOOB &&
              gl.uniform1f(this.U.isOOB, this.isOOB ? 1 : 0),
            null !== this.U.modeTime && gl.uniform1f(this.U.modeTime, s),
            null !== this.U.trip && gl.uniform1f(this.U.trip, tripIntensity),
            gl.drawArrays(gl.TRIANGLES, 0, 3));
        }
        setZoom(e) {
          if (!this.prog) return;
          const t = gl.getUniformLocation(this.prog, "u_zoom");
          t && (gl.useProgram(this.prog), gl.uniform1f(t, e));
        }
        destroy() {
          const e = (e) => {
            if (e) {
              for (e.pause(); e.firstChild; ) e.removeChild(e.firstChild);
              e.removeAttribute("src");
              try {
                e.load();
              } catch (e) {}
            }
          };
          (this.videoObj && e(this.videoObj),
            this.vidObjs && this.vidObjs.forEach(e));
          for (let e of this.textures) gl.deleteTexture(e);
        }
      }
      var currentEngine = null,
        mx = 0,
        my = 0,
        cx = 0,
        cy = 0,
        mode = 1,
        blink = 0,
        flash = 0,
        shake = 0,
        phase = "sleeping",
        timer = -9999,
        start = 0,
        lastNow = 0,
        blinkCount = 0,
        targetBlinks = 1,
        modeSeed = 0,
        lastMode = -1,
        tripIntensity = 1,
        leftEngine = null,
        rightEngine = null,
        backEngine = null,
        doorEngine = null,
        activePOV = "center",
        backZoom = 0,
        backZoomTarget = 0,
        doorZoom = 0,
        doorZoomTarget = 0,
        fractalSeed = 100 * Math.random(),
        blinkPeakTime = performance.now(),
        hallucinationProg = null,
        hallucinationQuadBuf = null,
        hallucinationU = null,
        _tripAccum = 0;
      function initHallucinationOverlay() {
        const e = compile(gl.VERTEX_SHADER, GLSL.vert);
        var t =
          '\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\nuniform vec2  u_resolution;\nuniform float u_time;\nuniform float u_trip;        // current zone trip intensity\nuniform float u_tripAccum;   // session accumulator — only grows\nuniform float u_fractalSeed;\nuniform float u_blinkAge;    // seconds since last blink peak\nuniform float u_zone;        // 1.0, 2.0, or 3.0 — controls decay rate\n\n// ── HASHES ──\nfloat hh(float x){ return fract(sin(x*127.1)*43758.5453); }\nfloat hh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat noise(vec2 p){\n    vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);\n    return mix(mix(hh2(i),hh2(i+vec2(1,0)),u.x),\n               mix(hh2(i+vec2(0,1)),hh2(i+vec2(1,1)),u.x),u.y);\n}\n\n// ── BURNING SHIP FRACTAL ──\n// z_{n+1} = (|Re(z)| + i|Im(z)|)^2 + c\n// Produces inverted cityscapes / melting buildings — fits the void city aesthetic\nfloat burningShip(vec2 c){\n    vec2 z = vec2(0.0);\n    float escaped = 0.0;\n    float smooth_i = 0.0;\n    for(int n=0; n<48; n++){\n        z = vec2(abs(z.x), abs(z.y));\n        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;\n        // WebGL1-safe: no break — accumulate with step\n        float esc = step(4.0, dot(z,z));\n        smooth_i += (1.0 - esc);  // count pre-escape iterations\n    }\n    return smooth_i / 48.0;\n}\n\n// ── JULIA SET ──\nfloat julia(vec2 z, vec2 c){\n    float smooth_i = 0.0;\n    for(int n=0; n<40; n++){\n        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;\n        smooth_i += (1.0 - step(4.0, dot(z,z)));\n    }\n    return smooth_i / 40.0;\n}\n\n// ── PALETTE — sickly neon with seed-driven hue ──\nvec3 sickPal(float t, float seed){\n    // Horror palette: shifted toward reds/magentas/acid greens\n    vec3 a = vec3(0.5, 0.4, 0.45);\n    vec3 b = vec3(0.5, 0.35, 0.5);\n    vec3 c = vec3(1.0, 0.8, 1.0);\n    vec3 d = vec3(hh(seed)*0.5, hh(seed+1.0)*0.3 + 0.1, hh(seed+2.0)*0.4 + 0.3);\n    return a + b * cos(6.28318*(c*t + d));\n}\n\nvoid main(){\n    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;\n    vec2 screenUV = gl_FragCoord.xy / u_resolution;\n    float r = length(uv);\n    float t = u_time;\n    float trip = clamp(u_trip, 0.0, 2.0);\n    float accum = clamp(u_tripAccum, 0.0, 8.0);\n\n    // Base intensity: grows with accumulator, scaled by zone\n    // Z1/Z2: base is subtle, effects come from blink surges\n    // Z3: base is always present and thick\n    float zoneBase = (u_zone < 2.5) ? 0.04 : 0.12;\n    float baseStrength = trip * zoneBase + accum * 0.025;\n\n    // Blink surge: snaps in at blink, decay time varies by zone\n    // Z1: 1.8s — sharp flash then gone. Z2: 2.8s — lingers a beat. Z3: 6s — persistent\n    float decayTime = (u_zone < 1.5) ? 1.8 : ((u_zone < 2.5) ? 2.8 : 6.0);\n    float surge = smoothstep(decayTime, 0.0, u_blinkAge) * trip * 0.4;\n\n    // Z1/Z2: random intermittent gate — effects only fire ~40% of blinks\n    float blinkGate = 1.0;\n    if(u_zone < 2.5) {\n        blinkGate = step(0.55, hh(floor(u_fractalSeed * 7.0 + u_blinkAge)));\n    }\n    surge *= blinkGate;\n\n    float totalStrength = baseStrength + surge;\n\n    if(totalStrength < 0.008){ gl_FragColor = vec4(0.0); return; }\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 1: FILM GRAIN — always on, scales with trip\n    //  Survival horror film stock damage\n    // ════════════════════════════════════════════════════════\n    float grainSeed = floor(t * 24.0); // 24fps grain refresh\n    float grain = hh2(screenUV * u_resolution * 0.5 + grainSeed * 7.3) - 0.5;\n    // Heavier grain in dark areas (shadow noise) — peripheral weighting\n    float grainAmt = totalStrength * 0.12 * (1.0 + r * 0.6);\n    // Occasional heavy grain bursts\n    float grainBurst = step(0.92, hh(grainSeed * 3.1 + u_fractalSeed)) * trip;\n    grainAmt += grainBurst * 0.25;\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 2: VHS SCANLINE CORRUPTION\n    //  Horizontal bands that tear/shift — PT hallway vibes\n    // ════════════════════════════════════════════════════════\n    float scanY = screenUV.y * u_resolution.y;\n    float scanBand = floor(scanY / 3.0); // 3px band height\n    float scanRoll = hh(scanBand * 7.7 + floor(t * 6.0));\n    // Tear probability increases with trip\n    float tearProb = 0.985 - totalStrength * 0.06;\n    float isTear = step(tearProb, scanRoll);\n    // Tear color: dark desaturated band or bright white flash\n    float tearBright = step(0.7, hh(scanBand * 13.3 + floor(t * 12.0)));\n    vec3 tearColor = mix(vec3(0.0, 0.0, 0.02), vec3(0.9, 0.85, 0.95), tearBright);\n    float tearAlpha = isTear * totalStrength * 0.5;\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 3: FRACTAL PERIPHERAL BLEED\n    //  Burning Ship + Julia sets in the outer vision\n    //  Like seeing geometry that shouldn\'t exist\n    // ════════════════════════════════════════════════════════\n    float periph = smoothstep(0.20, 0.95, r);\n    float fracAlpha = 0.0;\n    vec3 fracCol = vec3(0.0);\n\n#ifndef MOBILE\n    if(periph * totalStrength > 0.01) {\n        // Seed picks fractal type and region\n        float typeRoll = hh(u_fractalSeed * 3.7);\n        float zoom = mix(0.6, 3.0, hh(u_fractalSeed * 1.3));\n\n        // Slow drift — fractal region crawls over time\n        vec2 drift = vec2(\n            sin(t * 0.03 + u_fractalSeed) * 0.2,\n            cos(t * 0.02 + u_fractalSeed * 1.7) * 0.2\n        );\n\n        vec2 sampleUV = uv / zoom + drift;\n        float val = 0.0;\n\n        if(typeRoll < 0.4) {\n            // Burning Ship — melting cityscape structures\n            vec2 region = vec2(-1.76, -0.028) + vec2(hh(u_fractalSeed*5.1)-0.5, hh(u_fractalSeed*7.3)-0.5) * 0.3;\n            val = burningShip(sampleUV * 0.5 + region);\n        } else if(typeRoll < 0.7) {\n            // Julia set — organic/alien tendrils\n            vec2 jc = vec2(\n                -0.8 + sin(t * 0.015 + u_fractalSeed) * 0.15,\n                 0.156 + cos(t * 0.012 + u_fractalSeed * 2.0) * 0.1\n            );\n            val = julia(sampleUV * 0.8, jc);\n        } else {\n            // Burning Ship zoomed into the "mast" — tower structures\n            vec2 region = vec2(-1.755, -0.022);\n            float deepZoom = mix(2.0, 8.0, hh(u_fractalSeed * 9.1));\n            val = burningShip(sampleUV * 0.15 / deepZoom + region);\n        }\n\n        // Animate color cycling — slow, nauseous\n        val = fract(val * 3.5 + t * 0.04 * (0.3 + hh(u_fractalSeed * 9.0)));\n        fracCol = sickPal(val, u_fractalSeed * 11.3);\n        // Kill deep interior (val near 1.0 = never escaped = boring)\n        fracCol *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);\n\n        float fracPulse = 0.6 + 0.4 * sin(t * (0.8 + hh(u_fractalSeed*4.0)) + u_fractalSeed);\n        fracAlpha = periph * totalStrength * 0.22 * fracPulse;\n    }\n#endif\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 4: HORROR VIGNETTE — dark red peripheral creep\n    //  The edges of vision darken and pulse, like blood pressure\n    // ════════════════════════════════════════════════════════\n    float vignPulse = 0.5 + 0.5 * sin(t * 0.7 + sin(t * 0.3) * 2.0);\n    float vignStrength = smoothstep(0.35, 1.1, r) * totalStrength * 0.28 * vignPulse;\n    // Asymmetric — heavier at bottom (gravity, blood pooling)\n    vignStrength *= 1.0 + max(0.0, -uv.y) * 0.8;\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 5: DATAMOSH BLOCKS — random rectangles of wrong color\n    //  Like frame buffer corruption / Enter the Void blink cuts\n    // ════════════════════════════════════════════════════════\n    float moshAlpha = 0.0;\n    vec3 moshCol = vec3(0.0);\n#ifndef MOBILE\n    float moshTrigger = step(0.96, hh(floor(t * 8.0) * 13.7 + u_fractalSeed));\n    if(moshTrigger > 0.5 && totalStrength > 0.15) {\n        float blockSize = mix(32.0, 128.0, hh(floor(t*8.0)*5.3));\n        vec2 blockID = floor(gl_FragCoord.xy / blockSize);\n        float blockRnd = hh2(blockID + floor(t * 4.0));\n        float isCorrupt = step(0.88, blockRnd);\n        vec3 corruptCol = sickPal(blockRnd * 3.0 + t * 0.1, u_fractalSeed * 7.0);\n        float invertRoll = hh(blockRnd * 17.0);\n        if(invertRoll > 0.6) corruptCol = 1.0 - corruptCol;\n        else if(invertRoll > 0.3) corruptCol = vec3(dot(corruptCol, vec3(0.299, 0.587, 0.114)));\n        moshAlpha = isCorrupt * totalStrength * 0.4;\n        moshCol = corruptCol;\n    }\n#endif\n\n    // ════════════════════════════════════════════════════════\n    //  LAYER 6: AFTERIMAGE GHOST — faint echo of fractal from\n    //  previous blink, still fading. Creates persistence of vision.\n    // ════════════════════════════════════════════════════════\n    float ghostAge = u_blinkAge + 4.0;\n    float ghostAlpha = 0.0;\n    vec3 ghostCol = vec3(0.0);\n#ifndef MOBILE\n    if(ghostAge < 10.0 && accum > 0.5) {\n        float ghostEnv = smoothstep(10.0, 4.0, ghostAge) * 0.08 * accum;\n        float ghostSeed = u_fractalSeed + 50.0;\n        vec2 ghostUV = uv / 1.5 + vec2(sin(t*0.02)*0.3, cos(t*0.015)*0.3);\n        float gVal = burningShip(ghostUV * 0.4 + vec2(-1.76, -0.03));\n        gVal = fract(gVal * 2.0 + t * 0.02);\n        ghostCol = sickPal(gVal, ghostSeed * 7.0) * smoothstep(0.0, 0.15, gVal);\n        ghostAlpha = smoothstep(0.3, 0.8, r) * ghostEnv;\n    }\n#endif\n\n    // ════════════════════════════════════════════════════════\n    //  COMPOSITE — premultiplied alpha\n    //  Grain: additive noise\n    //  Tears: replace bands\n    //  Fractals: additive glow in periphery\n    //  Vignette: darken edges\n    //  Mosh: color replacement blocks\n    //  Ghost: faint additive persistence\n    // ════════════════════════════════════════════════════════\n\n    vec3 outRGB = vec3(0.0);\n    float outA = 0.0;\n\n    // Grain — additive, very subtle\n    outRGB += vec3(grain * grainAmt);\n\n    // Fractal glow — additive peripheral\n    outRGB += fracCol * fracAlpha;\n    outA = max(outA, fracAlpha * 0.5); // slight background darken behind fractals\n\n    // Tears — opaque bands\n    outRGB = mix(outRGB, tearColor * tearAlpha, tearAlpha);\n    outA = max(outA, tearAlpha);\n\n    // Horror vignette — darkening\n    outA = max(outA, vignStrength);\n    outRGB = mix(outRGB, vec3(0.03, 0.0, 0.0), vignStrength); // dark red-black\n\n    // Mosh blocks\n    outRGB = mix(outRGB, moshCol * moshAlpha, moshAlpha);\n    outA = max(outA, moshAlpha);\n\n    // Ghost afterimage\n    outRGB += ghostCol * ghostAlpha;\n\n    // Premultiplied output\n    gl_FragColor = vec4(outRGB, outA);\n}';
        IS_MOBILE && (t = "#define MOBILE\n" + t);
        const i = compile(gl.FRAGMENT_SHADER, t);
        if (e && i) {
          if (
            ((hallucinationProg = gl.createProgram()),
            gl.attachShader(hallucinationProg, e),
            gl.attachShader(hallucinationProg, i),
            gl.linkProgram(hallucinationProg),
            !gl.getProgramParameter(hallucinationProg, gl.LINK_STATUS))
          )
            return (
              console.error(
                "[HALLUCINATION] link error:",
                gl.getProgramInfoLog(hallucinationProg),
              ),
              void (hallucinationProg = null)
            );
          ((hallucinationQuadBuf = gl.createBuffer()),
            gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationQuadBuf),
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 3, -1, -1, 3]),
              gl.STATIC_DRAW,
            ),
            (hallucinationU = {
              res: gl.getUniformLocation(hallucinationProg, "u_resolution"),
              time: gl.getUniformLocation(hallucinationProg, "u_time"),
              trip: gl.getUniformLocation(hallucinationProg, "u_trip"),
              tripAccum: gl.getUniformLocation(
                hallucinationProg,
                "u_tripAccum",
              ),
              seed: gl.getUniformLocation(hallucinationProg, "u_fractalSeed"),
              age: gl.getUniformLocation(hallucinationProg, "u_blinkAge"),
              zone: gl.getUniformLocation(hallucinationProg, "u_zone"),
            }),
            console.log("[HALLUCINATION] overlay initialized OK"));
        } else console.error("[HALLUCINATION] shader compile failed");
      }
      function drawHallucinationOverlay(e, t, i, n, l) {
        if (!hallucinationProg) return;
        const o = void 0 !== n ? n : 0.001 * (e - blinkPeakTime),
          r = void 0 !== t ? t : tripIntensity,
          a = void 0 !== i ? i : fractalSeed,
          g = void 0 !== l ? l : 1;
        if (((_tripAccum += 8e-5 * r), r < 0.02 && _tripAccum < 0.1)) return;
        (gl.useProgram(hallucinationProg),
          gl.enable(gl.BLEND),
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA),
          gl.uniform2f(hallucinationU.res, canvas.width, canvas.height),
          gl.uniform1f(hallucinationU.time, 0.001 * e),
          gl.uniform1f(hallucinationU.trip, r),
          gl.uniform1f(hallucinationU.tripAccum, _tripAccum),
          gl.uniform1f(hallucinationU.seed, a),
          gl.uniform1f(hallucinationU.age, o),
          gl.uniform1f(hallucinationU.zone, g),
          gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationQuadBuf));
        const s = gl.getAttribLocation(hallucinationProg, "p");
        (gl.enableVertexAttribArray(s),
          gl.vertexAttribPointer(s, 2, gl.FLOAT, !1, 0, 0),
          gl.drawArrays(gl.TRIANGLES, 0, 3),
          gl.disable(gl.BLEND));
      }
      var slideState = "idle",
        slideStart = 0,
        slideDir = 0,
        slideOffset = 0,
        pendingPOV = null,
        povSwitchTime = -9999,
        isDragging = !1,
        lastDragX = 0,
        lastDragY = 0;
      const BLINK_CLOSE_MS = 140,
        BLINK_HOLD_MS = 80,
        BLINK_OPEN_MS = 200;
      var blinkTransitionAlpha = 0;
      function beginSlide(e, t) {
        "idle" === slideState &&
          ((pendingPOV = e),
          (slideDir = t),
          (slideState = "out"),
          (slideStart = lastNow));
      }
      function tickSlide(e) {
        if ("idle" === slideState) {
          slideOffset = 0;
          const e = document.getElementById("c");
          return void (e && (e.style.transform = ""));
        }
        const t = e - slideStart;
        if ("out" === slideState) {
          const i = Math.min(t / 340, 1);
          ((slideOffset = i * i * window.innerWidth * slideDir),
            i >= 1 &&
              ((slideOffset = window.innerWidth * slideDir),
              (slideState = "black"),
              (slideStart = e),
              (activePOV = pendingPOV),
              (mx = 0),
              (my = 0),
              (cx = 0),
              (cy = 0),
              (povSwitchTime = e),
              window.dispatchEvent(new Event("mouseup")),
              window.dispatchEvent(new Event("touchend"))));
        } else if ("black" === slideState)
          t >= 40 &&
            ((slideOffset = -window.innerWidth * slideDir),
            (slideState = "in"),
            (slideStart = e));
        else if ("in" === slideState) {
          const e = Math.min(t / 340, 1),
            i = 1 - (1 - e) * (1 - e);
          ((slideOffset = -window.innerWidth * slideDir * (1 - i)),
            e >= 1 &&
              ((slideOffset = 0), (slideState = "idle"), (pendingPOV = null)));
        }
        const i = document.getElementById("c");
        i &&
          (i.style.transform =
            0 !== slideOffset ? `translateX(${slideOffset.toFixed(1)}px)` : "");
      }
      function checkPOVThreshold() {
        "idle" === slideState &&
          (lastNow - povSwitchTime < 600 ||
            (isDragging &&
              ("center" === activePOV
                ? mx >= 1.24
                  ? beginSlide("left", 1)
                  : mx <= -1.24 && beginSlide("right", -1)
                : "left" === activePOV
                  ? mx <= -1.14 && beginSlide("center", -1)
                  : "right" === activePOV
                    ? mx >= 1.14
                      ? beginSlide("center", 1)
                      : mx <= -1.24 && beginSlide("back", -1)
                    : "back" === activePOV
                      ? mx >= 1.14
                        ? beginSlide("right", 1)
                        : mx <= -1.24 && window.__z4Route && beginSlide("door", -1)
                      : "door" === activePOV &&
                        mx >= 1.14 &&
                        beginSlide("back", 1))));
      }
      window.isEngine1Dead = !1;
      const startDrag = (e, t, i) => {
          (window.audioCtx &&
            "suspended" === window.audioCtx.state &&
            window.audioCtx.resume(),
            (e &&
              ("secret-button" === e.target.id ||
                e.target.closest("#conky-sidebar") ||
                e.target.closest("#aboutOverlay"))) ||
              ((isDragging = !0), (lastDragX = t), (lastDragY = i)));
        },
        doDrag = (e, t) => {
          isDragging &&
            ((mx -= ((e - lastDragX) / innerWidth) * 3),
            (my -= ((t - lastDragY) / innerHeight) * 3),
            (lastDragX = e),
            (lastDragY = t),
            (mx = Math.max(-1.35, Math.min(1.35, mx))),
            (my = Math.max(-0.5, Math.min(0.5, my))),
            (window.mx = mx),
            (window.my = my));
        },
        endDrag = () => {
          ((isDragging = !1),
            (mx = 0),
            (my = 0),
            (window.mx = 0),
            (window.my = 0));
        };
      function simStep(e) {
        if (IS_MOBILE) return;
        (gl.activeTexture(gl.TEXTURE6),
          gl.bindTexture(gl.TEXTURE_2D, texs[ping]),
          gl.activeTexture(gl.TEXTURE7),
          gl.bindTexture(gl.TEXTURE_2D, staticAssets.windowMask));
        const t = 1 - ping;
        (gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[t].fbo),
          gl.viewport(0, 0, canvas.width, canvas.height),
          gl.useProgram(simProg));
        const i = gl.getAttribLocation(simProg, "p");
        (gl.enableVertexAttribArray(i),
          gl.vertexAttribPointer(i, 2, gl.FLOAT, !1, 0, 0),
          gl.uniform2f(
            gl.getUniformLocation(simProg, "u_resolution"),
            canvas.width,
            canvas.height,
          ),
          gl.uniform1f(gl.getUniformLocation(simProg, "u_time"), 0.001 * e),
          gl.uniform1f(
            gl.getUniformLocation(simProg, "u_dt"),
            Math.min(0.001 * (e - lastNow), 0.05),
          ),
          gl.drawArrays(gl.TRIANGLES, 0, 3),
          gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          (ping = t));
      }
      function advanceMode() {
        let e = mode;
        for (; e === mode; ) e = Math.floor(9 * Math.random()) + 1;
        ((lastMode = mode),
          (mode = e),
          modeSeed++,
          (tripIntensity = 0.2 + 1.5 * Math.random()),
          (fractalSeed = 100 * Math.random()),
          (blinkPeakTime = performance.now()),
          currentEngine && currentEngine.destroy(),
          (currentEngine = new ActiveMode(mode)));
      }
      function initSideEngines() {
        (leftEngine || (leftEngine = new ActiveMode(98)),
          rightEngine || (rightEngine = new ActiveMode(99)),
          backEngine || (backEngine = new ActiveMode(97)),
          window.__z4Route && !doorEngine && (doorEngine = new ActiveMode(96)));
      }
      function render(e) {
        window.butterchurnVisualizer && window.butterchurnVisualizer.render();
        let t = e - lastNow;
        (t > 250 || t <= 0) && (t = 33.33);
        let i = t / (IS_MOBILE ? 50 : 33.33),
          n = 0;
        if (window.audioAnalyser) {
          window.audioAnalyser.getByteFrequencyData(window.audioData);
          let e = 0;
          for (let t = 0; t < 6; t++) e += window.audioData[t];
          n = e / 1530;
        }
        let l = 1;
        if ("sleeping" === phase)
          ((l = 0),
            window.startWakeSequence && !currentEngine
              ? ((phase = "waking"),
                (start = e),
                (currentEngine = new ActiveMode((mode = 1))),
                initSideEngines())
              : window.startTestSequence &&
                !currentEngine &&
                ((phase = "open"),
                (start = e),
                (timer = e),
                (l = 1),
                (currentEngine = new ActiveMode((mode = 1))),
                initSideEngines()));
        else if ("suspended" === phase) l = 0;
        else if ("waking" === phase) {
          let t = Math.min((e - start) / 3e3, 1);
          ((l = 1 - Math.pow(1 - t, 3)),
            t >= 1 && ((phase = "open"), (timer = e)));
        }
        if (
          ("center" === activePOV &&
            ((9 === mode &&
              "open" === phase &&
              !window.__mobileDebug &&
              currentEngine &&
              currentEngine.startTime > 0 &&
              0.001 * (e - currentEngine.startTime) >= 4.4) ||
              ("open" === phase &&
                !window.__mobileDebug &&
                e - timer > 9e3 &&
                "center" === activePOV)) &&
            ((phase = "closing_switch"), (start = e), (timer = e)),
          "closing_blink" === phase
            ? (blink = Math.min((e - start) / 160, 1)) >= 1 &&
              ((phase = "black_blink"), (start = e))
            : "black_blink" === phase && e - start > 120
              ? ((phase = "opening_blink"),
                (start = e),
                (fractalSeed = 100 * Math.random()),
                (blinkPeakTime = e))
              : "opening_blink" === phase
                ? (blink = 1 - Math.min((e - start) / 160, 1)) <= 0 &&
                  ((phase = "open"), (timer = e), (blink = 0))
                : "closing_switch" === phase
                  ? (blink = Math.min((e - start) / 160, 1)) >= 1 &&
                    ((phase = "black_switch"), (start = e), advanceMode())
                  : "black_switch" === phase && e - start > 200
                    ? ((phase = "opening_switch"), (start = e))
                    : "opening_switch" === phase &&
                      (blink = 1 - Math.min((e - start) / 160, 1)) <= 0 &&
                      ((phase = "open"), (timer = e), (blink = 0)),
          ("open" !== phase && "center" === activePOV) || checkPOVThreshold(),
          tickSlide(e),
          (cx += (mx - cx) * Math.min(1, 0.12 * i)),
          (cy += (my - cy) * Math.min(1, 0.12 * i)),
          (backZoomTarget =
            "back" === activePOV && __e1SpaceHeld
              ? Math.min(1, backZoomTarget + 0.025 * i)
              : 0),
          (backZoom += (backZoomTarget - backZoom) * Math.min(1, (__e1SpaceHeld ? 0.06 : 0.18) * i)),
          "back" === activePOV && backZoom > 0.88)
        ) {
          const e = document.getElementById("loading-screen");
          e && (e.style.display = "none");
          let t = document.getElementById("zone-fade-overlay");
          return (
            t ||
              ((t = document.createElement("div")),
              (t.id = "zone-fade-overlay"),
              (t.style.cssText =
                "position:fixed;inset:0;background:black;opacity:0;pointer-events:none;transition:opacity 1.0s ease-in-out;z-index:99999;"),
              document.body.appendChild(t)),
            setTimeout(() => {
              t.style.opacity = "1";
            }, 10),
            (window.isEngine1Dead = !0),
            void setTimeout(() => {
              (currentEngine &&
                (currentEngine.destroy(), (currentEngine = null)),
                leftEngine && (leftEngine.destroy(), (leftEngine = null)),
                rightEngine && (rightEngine.destroy(), (rightEngine = null)),
                backEngine && (backEngine.destroy(), (backEngine = null)),
                doorEngine && (doorEngine.destroy(), (doorEngine = null)),
                (activePOV = "center"),
                (mx = 0),
                (my = 0),
                (cx = 0),
                (cy = 0),
                (backZoom = 0),
                (backZoomTarget = 0),
                "function" == typeof window.startZone2 && window.startZone2(),
                setTimeout(() => {
                  t.style.opacity = "0";
                }, 200));
            }, 1e3)
          );
        }
        if (
          ("center" === activePOV
            ? (gl.bindFramebuffer(gl.FRAMEBUFFER, null),
              gl.clearColor(0, 0, 0, 1),
              gl.clear(gl.COLOR_BUFFER_BIT),
              drawBacklight(e, 0.35, n),
              simStep(e),
              3 === mode || 9 === mode
                ? (Math.random() < 0.08 && (flash = 1.2),
                  (flash *= Math.pow(0.86, i)),
                  (shake = Math.max(flash, 0.07 * n)))
                : ((flash *= Math.pow(0.8, i)), (shake = 0.1 * n)),
              currentEngine &&
                currentEngine.render(
                  e,
                  cx,
                  cy,
                  n,
                  blink,
                  flash,
                  shake,
                  l,
                  modeSeed,
                ),
              drawHallucinationOverlay(e))
            : "left" === activePOV
              ? (gl.clearColor(0, 0, 0, 1),
                gl.clear(gl.COLOR_BUFFER_BIT),
                leftEngine &&
                  leftEngine.render(
                    e,
                    cx,
                    cy,
                    n,
                    blink,
                    flash,
                    shake,
                    l,
                    modeSeed,
                  ),
                drawHallucinationOverlay(e))
              : "right" === activePOV &&
                (gl.clearColor(0, 0, 0, 1),
                gl.clear(gl.COLOR_BUFFER_BIT),
                simStep(e),
                currentEngine &&
                  mirrorFBO &&
                  (gl.bindFramebuffer(gl.FRAMEBUFFER, mirrorFBO.fbo),
                  gl.viewport(0, 0, canvas.width, canvas.height),
                  currentEngine.render(e, 0, 0, n, 0, 0, 0, l, modeSeed),
                  gl.bindFramebuffer(gl.FRAMEBUFFER, null),
                  gl.viewport(0, 0, canvas.width, canvas.height)),
                rightEngine &&
                  rightEngine.render(
                    e,
                    cx,
                    cy,
                    n,
                    blink,
                    flash,
                    shake,
                    l,
                    modeSeed,
                  ),
                drawHallucinationOverlay(e)),
          "back" === activePOV)
        ) {
          if (
            (gl.clearColor(0, 0, 0, 1),
            gl.clear(gl.COLOR_BUFFER_BIT),
            simStep(e),
            currentEngine &&
              mirrorFBO &&
              (gl.bindFramebuffer(gl.FRAMEBUFFER, mirrorFBO.fbo),
              gl.viewport(0, 0, canvas.width, canvas.height),
              currentEngine.render(e, 0, 0, n, 0, 0, 0, l, modeSeed),
              gl.bindFramebuffer(gl.FRAMEBUFFER, null),
              gl.viewport(0, 0, canvas.width, canvas.height)),
            backEngine &&
              (backEngine.render(
                e,
                cx,
                cy,
                n,
                blink,
                flash,
                shake,
                l,
                modeSeed,
              ),
              backEngine.setZoom(backZoom),
              window.bcCanvas))
          ) {
            const e = gl.getUniformLocation(backEngine.prog, "u_bcResolution");
            e &&
              (gl.useProgram(backEngine.prog),
              gl.uniform2f(e, window.bcCanvas.width, window.bcCanvas.height));
          }
          drawHallucinationOverlay(e);
        }
        if ("door" === activePOV) {
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          if (doorEngine) {
            doorEngine.render(e, cx, cy, n, blink, flash, shake, l, modeSeed);
            doorZoomTarget = __e1SpaceHeld
              ? Math.min(1, doorZoomTarget + 0.025 * i)
              : 0;
            doorZoom += (doorZoomTarget - doorZoom) * Math.min(1, (__e1SpaceHeld ? 0.06 : 0.18) * i);
            doorEngine.setZoom(doorZoom);
          }
          if (doorZoom > 0.88) {
            var doorFade = document.getElementById("zone-fade-overlay");
            if (!doorFade) {
              doorFade = document.createElement("div");
              doorFade.id = "zone-fade-overlay";
              doorFade.style.cssText = "position:fixed;inset:0;background:black;opacity:0;pointer-events:none;transition:opacity 1.0s ease-in-out;z-index:99999;";
              document.body.appendChild(doorFade);
            }
            setTimeout(function() { doorFade.style.opacity = "1"; }, 10);
            window.isEngine1Dead = true;
            setTimeout(function() {
              currentEngine && (currentEngine.destroy(), currentEngine = null);
              leftEngine && (leftEngine.destroy(), leftEngine = null);
              rightEngine && (rightEngine.destroy(), rightEngine = null);
              backEngine && (backEngine.destroy(), backEngine = null);
              doorEngine && (doorEngine.destroy(), doorEngine = null);
              activePOV = "center";
              mx = 0; my = 0; cx = 0; cy = 0;
              doorZoom = 0; doorZoomTarget = 0;
              if (typeof window.startZone4 === "function") window.startZone4();
              setTimeout(function() { doorFade.style.opacity = "0"; }, 200);
            }, 1000);
            return;
          }
          drawHallucinationOverlay(e);
        }
        if (blinkTransitionAlpha > 0.001) {
          gl.useProgram(BACKLIGHT.prog);
          const e = gl.getAttribLocation(BACKLIGHT.prog, "p");
          (gl.enableVertexAttribArray(e),
            gl.vertexAttribPointer(e, 2, gl.FLOAT, !1, 0, 0),
            gl.enable(gl.BLEND),
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
            gl.uniform4f(BACKLIGHT.Ucol, 0, 0, 0, blinkTransitionAlpha),
            gl.drawArrays(gl.TRIANGLES, 0, 3),
            gl.disable(gl.BLEND));
        }
        lastNow = e;
      }
      var __e1SpaceHeld = false;
      window.addEventListener("keydown", function(ev) {
        if (ev.code === "Space") { ev.preventDefault(); __e1SpaceHeld = true; }
      });
      window.addEventListener("keyup", function(ev) {
        if (ev.code === "Space") { ev.preventDefault(); __e1SpaceHeld = false; }
      });
      (window.addEventListener("mousedown", (e) =>
        startDrag(e, e.clientX, e.clientY),
      ),
        window.addEventListener("mousemove", (e) =>
          doDrag(e.clientX, e.clientY),
        ),
        window.addEventListener("mouseup", endDrag),
        window.addEventListener(
          "touchstart",
          (e) => startDrag(e, e.touches[0].clientX, e.touches[0].clientY),
          { passive: !0 },
        ),
        window.addEventListener(
          "touchmove",
          (e) => {
            e.touches.length > 0 &&
              doDrag(e.touches[0].clientX, e.touches[0].clientY);
          },
          { passive: !0 },
        ),
        window.addEventListener("touchend", endDrag),
        canvas.addEventListener("pointerup", function (e) {
          window.__mobileDebug &&
            "open" === phase &&
            e.target === canvas &&
            ((phase = "closing_switch"),
            (start = performance.now()),
            (timer = performance.now()));
        }),
        IS_MOBILE || initHallucinationOverlay());
      const TARGET_FPS = IS_MOBILE ? 20 : 30,
        FRAME_INTERVAL = 1e3 / TARGET_FPS;
      let __lastFrameTime = 0;
      function __frameGovernor(e) {
        window.isEngine1Dead ||
          (e - __lastFrameTime >= FRAME_INTERVAL &&
            ((__lastFrameTime = e), render(e)),
          requestAnimationFrame(__frameGovernor));
      }
      requestAnimationFrame(__frameGovernor);