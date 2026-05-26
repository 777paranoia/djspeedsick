(() => {
  "use strict";
  const IS_MOBILE =
      /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024),
    CONFIG = {
      canvasId: "tutorial-canvas",
      engineCanvasId: "c",
      textureRoot: window.TUTORIAL_TEXTURE_ROOT || "files/img/rooms/tutorial/",
      mode2Path: window.TUTORIAL_MODE2_PATH || "modes/mode2.js",
      corePath: window.TUTORIAL_CORE_PATH || "glsl-core.js",
      returnUrl: window.TUTORIAL_RETURN_URL || "index.html",
      navigateOnExit: !1 !== window.TUTORIAL_NAVIGATE_ON_EXIT,
      room: { width: 8, height: 3.6, depth: 8 },
      tv: {
        enabled: !0,
        wallInset: 0.08,
        z: 0,
        bottom: 0,
        height: 1.82,
        frontAspect: 1244 / 2048,
        sideAspect: 812 / 2048,
        zoom: {
          triggerFacing: "E",
          targetFov: 32,
          stopDistance: 1.05,
          screenCenterV: 0.738,
          engageThreshold: 0.985,
        },
      },
      camera: { x: 0, y: 1.62, z: 0, fov: 72 },
      look: {
        dragScaleX: 3,
        dragScaleY: 3,
        mxClamp: 1.35,
        myClamp: 0.5,
        turnThreshold: 1.14,
        pitchAmount: 0.28,
      },
      turn: { cooldownMs: 600, durationMs: 420 },
      movement: {
        exitFacing: "S",
        startZ: 0,
        exitZ: -3.45,
        stepPerFrameAt30: 0.045,
        exitHoldMs: 700,
      },
      overlays: { opacity: 0.42, holdMs: 2200, fadeMs: 700 },
      clearColor: [0.005, 0.005, 0.007, 1],
    },
    TEXTURES_frontWall = ["wall2.png"],
    TEXTURES_leftWall = ["wall1.png"],
    TEXTURES_backDoor = ["wall3.png"],
    TEXTURES_rightWall = ["wall4.png", "wall4png"],
    TEXTURES_ceiling = ["ceiling.png"],
    TEXTURES_floor = ["floor.png"],
    TEXTURES_tvFront = ["tv-F.png"],
    TEXTURES_tvLeft = ["tv-L.png"],
    TEXTURES_tvRight = ["tv-R.png"],
    YAW_FOR_FACING =
      (Array.from(
        { length: 99 },
        (_, i) => "FRAMES/tv-" + String(i).padStart(3, "0") + ".png",
      ),
      { N: 0, W: 0.5 * -Math.PI, S: Math.PI, E: 0.5 * Math.PI }),
    TURN_LEFT = { N: "W", W: "S", S: "E", E: "N" },
    TURN_RIGHT = { N: "E", E: "S", S: "W", W: "N" },
    MODE_VS =
      "\n    attribute vec2 p;\n    void main() {\n      gl_Position = vec4(p, 0.0, 1.0);\n    }\n  ";
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function compileShader(gl, type, source, label) {
    const shader = gl.createShader(type);
    if (
      (gl.shaderSource(shader, source),
      gl.compileShader(shader),
      !gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    ) {
      const msg = gl.getShaderInfoLog(shader) || "unknown shader error";
      throw (
        gl.deleteShader(shader),
        new Error((label || "shader") + " compile error:\n" + msg)
      );
    }
    return shader;
  }
  function createProgram(gl, vsSource, fsSource, label) {
    const vs = compileShader(
        gl,
        gl.VERTEX_SHADER,
        vsSource,
        (label || "program") + " vertex",
      ),
      fs = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fsSource,
        (label || "program") + " fragment",
      ),
      program = gl.createProgram();
    if (
      (gl.attachShader(program, vs),
      gl.attachShader(program, fs),
      gl.linkProgram(program),
      gl.deleteShader(vs),
      gl.deleteShader(fs),
      !gl.getProgramParameter(program, gl.LINK_STATUS))
    ) {
      const msg = gl.getProgramInfoLog(program) || "unknown program link error";
      throw (
        gl.deleteProgram(program),
        new Error((label || "program") + " link error:\n" + msg)
      );
    }
    return program;
  }
  function makeFallbackTexture(gl, color) {
    const tex = gl.createTexture();
    return (
      (tex._w = 1),
      (tex._h = 1),
      gl.bindTexture(gl.TEXTURE_2D, tex),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array(color),
      ),
      tex
    );
  }
  function expandTextureCandidates(names) {
    const root = CONFIG.textureRoot.replace(/\/?$/, "/"),
      out = [];
    for (const name of names)
      (out.push(root + name),
        out.push("files/img/rooms/tutorial/" + name),
        out.push("files/img/rooms/" + name),
        out.push(name),
        out.push("./" + name));
    return out;
  }
  function loadTexture(gl, names, fallbackColor) {
    const tex = makeFallbackTexture(gl, fallbackColor),
      candidates = expandTextureCandidates(names);
    let i = 0;
    return (
      (function tryNext() {
        if (i >= candidates.length) return;
        const src = candidates[i++],
          img = new Image();
        ((img.onload = () => {
          (gl.bindTexture(gl.TEXTURE_2D, tex),
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0),
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
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              img,
            ),
            (tex._w = img.naturalWidth || img.width || 1),
            (tex._h = img.naturalHeight || img.height || 1),
            (tex._src = src),
            (tex._loaded = !0));
        }),
          (img.onerror = tryNext),
          (img.src = src));
      })(),
      tex
    );
  }
  function loadVideoTexture(gl, names, fallbackColor) {
    const tex = makeFallbackTexture(gl, fallbackColor),
      candidates = expandTextureCandidates(names);
    ((tex._videoReady = !1), (tex._allocated = !1));
    let i = 0;
    return (
      (function tryNext() {
        if (i >= candidates.length) return;
        const src = candidates[i++],
          video = document.createElement("video");
        ((video.muted = !0),
          (video.loop = !0),
          (video.autoplay = !0),
          (video.playsInline = !0),
          (video.preload = "auto"),
          video.setAttribute("playsinline", ""),
          video.setAttribute("webkit-playsinline", ""),
          video.setAttribute("aria-hidden", "true"),
          (video.style.cssText =
            "position:fixed;left:-10000px;top:0;width:2px;height:2px;pointer-events:none;opacity:0.01;"),
          video.addEventListener("loadedmetadata", () => {
            ((tex._w = video.videoWidth || 1),
              (tex._h = video.videoHeight || 1));
          }),
          video.addEventListener(
            "canplay",
            () => {
              ((tex._video = video), (tex._src = src), (tex._videoReady = !0));
              const play = video.play();
              play && play.catch && play.catch(() => {});
            },
            { once: !0 },
          ),
          video.addEventListener(
            "error",
            () => {
              (video.parentNode && video.parentNode.removeChild(video),
                tryNext());
            },
            { once: !0 },
          ),
          document.body.appendChild(video),
          (video.src = src),
          video.load());
      })(),
      tex
    );
  }
  function createPlane(gl, verts) {
    const data = new Float32Array(verts),
      buffer = gl.createBuffer();
    return (
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer),
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW),
      { buffer: buffer, count: data.length / 5 }
    );
  }
  function loadScriptOnce(src) {
    return new Promise((resolve) => {
      if (document.querySelector('script[data-tutorial-loader="' + src + '"]'))
        return void resolve();
      const s = document.createElement("script");
      ((s.src = src),
        (s.async = !0),
        (s.dataset.tutorialLoader = src),
        (s.onload = () => resolve()),
        (s.onerror = () => resolve()),
        document.head.appendChild(s));
    });
  }
  class Mode2Renderer {
    constructor(gl) {
      ((this.gl = gl),
        (this.size = IS_MOBILE ? 512 : 1024),
        (this.fbo = (function (gl, w, h) {
          const tex = gl.createTexture();
          (gl.bindTexture(gl.TEXTURE_2D, tex),
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
            ));
          const fbo = gl.createFramebuffer();
          return (
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo),
            gl.framebufferTexture2D(
              gl.FRAMEBUFFER,
              gl.COLOR_ATTACHMENT0,
              gl.TEXTURE_2D,
              tex,
              0,
            ),
            gl.bindFramebuffer(gl.FRAMEBUFFER, null),
            { tex: tex, fbo: fbo, w: w, h: h }
          );
        })(gl, this.size, this.size)),
        (this.program = null),
        (this.usingFallback = !0),
        (this.ready = !1),
        (this.textures = this.createModeTextures()),
        (this.quadBuffer = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ),
        this.setFallbackProgram(),
        loadScriptOnce(CONFIG.corePath)
          .then(() => loadScriptOnce(CONFIG.mode2Path))
          .then(() => {
            this.tryBuildMode2Program();
          }));
    }
    createModeTextures() {
      const gl = this.gl;
      return {
        b1: loadTexture(
          gl,
          ["files/img/void/building01.png"],
          [12, 13, 15, 255],
        ),
        b2: loadTexture(
          gl,
          ["files/img/void/building09.png"],
          [12, 13, 15, 255],
        ),
        b3: loadTexture(
          gl,
          ["files/img/void/building08.png"],
          [12, 13, 15, 255],
        ),
        b4: loadTexture(
          gl,
          ["files/img/void/building07.png"],
          [12, 13, 15, 255],
        ),
        b5: loadTexture(
          gl,
          ["files/img/void/building06.png"],
          [12, 13, 15, 255],
        ),
        b6: loadTexture(
          gl,
          ["files/img/void/building05.png"],
          [12, 13, 15, 255],
        ),
        water: makeFallbackTexture(gl, [0, 0, 0, 255]),
        windowMask: loadTexture(
          gl,
          ["files/img/void/canalport-mask.png"],
          [0, 0, 0, 0],
        ),
        env1: loadTexture(gl, ["files/img/void/skyline.png"], [4, 6, 8, 255]),
      };
    }
    setFallbackProgram() {
      try {
        ((this.program = createProgram(
          this.gl,
          MODE_VS,
          "\n    precision mediump float;\n\n    uniform vec2 u_resolution;\n    uniform float u_time;\n\n    float hash(vec2 p) {\n      p = fract(p * vec2(127.1, 311.7));\n      p += dot(p, p + 19.19);\n      return fract(p.x * p.y);\n    }\n\n    float noise(vec2 p) {\n      vec2 i = floor(p);\n      vec2 f = fract(p);\n      vec2 u = f * f * (3.0 - 2.0 * f);\n\n      float a = hash(i);\n      float b = hash(i + vec2(1.0, 0.0));\n      float c = hash(i + vec2(0.0, 1.0));\n      float d = hash(i + vec2(1.0, 1.0));\n\n      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n    }\n\n    void main() {\n      vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));\n      vec2 p = uv * 2.0 - 1.0;\n      p.x *= u_resolution.x / max(1.0, u_resolution.y);\n\n      float n = noise(p * 3.0 + vec2(u_time * 0.035, -u_time * 0.025));\n      float n2 = noise(p * 8.0 - vec2(u_time * 0.050, u_time * 0.030));\n\n      float haze = smoothstep(1.4, 0.1, length(p));\n      vec3 col = mix(vec3(0.018, 0.020, 0.030), vec3(0.18, 0.20, 0.24), n);\n      col += vec3(0.06, 0.07, 0.08) * n2;\n      col *= haze;\n\n      gl_FragColor = vec4(col, 1.0);\n    }\n  ",
          "fallback mode2",
        )),
          (this.usingFallback = !0),
          (this.ready = !0));
      } catch (err) {
        console.warn("[tutorial] fallback mode2 failed", err);
      }
    }
    tryBuildMode2Program() {
      const gl = this.gl,
        raw = (function () {
          const modules =
            window.GLSL && window.GLSL.modules ? window.GLSL.modules : null;
          return (
            (modules &&
              (modules.mode2 ||
                modules.mode2 ||
                modules["mode2.js"] ||
                modules["mode.2"] ||
                modules["mode-2"] ||
                modules["mode-2.js"] ||
                modules.room_mode2 ||
                modules.room_mode2 ||
                modules.fractal)) ||
            ""
          );
        })();
      if (!raw || "string" != typeof raw)
        return void console.warn(
          "[tutorial] modes/mode2.js did not register a recognized GLSL.modules key; using fallback window shader",
        );
      const candidates = [],
        mobilePrefix = IS_MOBILE ? "#define MOBILE\n" : "";
      (candidates.push(mobilePrefix + raw),
        window.GLSL &&
          "string" == typeof window.GLSL.core &&
          candidates.push(mobilePrefix + window.GLSL.core + raw),
        /precision\s+(lowp|mediump|highp)\s+float/.test(raw) ||
          candidates.push(mobilePrefix + "precision mediump float;\n" + raw),
        window.GLSL &&
          "string" == typeof window.GLSL.core &&
          !/precision\s+(lowp|mediump|highp)\s+float/.test(raw) &&
          candidates.push(
            mobilePrefix +
              "precision mediump float;\n" +
              window.GLSL.core +
              raw,
          ));
      for (let i = 0; i < candidates.length; i++)
        try {
          const p = createProgram(gl, MODE_VS, candidates[i], "modes/mode2.js");
          return (
            this.program && gl.deleteProgram(this.program),
            (this.program = p),
            (this.usingFallback = !1),
            (this.ready = !0),
            void console.log(
              "[tutorial] rendering modes/mode2.js behind wall2 green-screen window",
            )
          );
        } catch (err) {
          i === candidates.length - 1 &&
            console.warn(
              "[tutorial] could not compile mode2 module; using fallback window shader",
              err,
            );
        }
    }
    uniform1f(names, value) {
      const gl = this.gl;
      for (let i = 0; i < names.length; i++) {
        const loc = gl.getUniformLocation(this.program, names[i]);
        null !== loc && gl.uniform1f(loc, value);
      }
    }
    uniform2f(names, x, y) {
      const gl = this.gl;
      for (let i = 0; i < names.length; i++) {
        const loc = gl.getUniformLocation(this.program, names[i]);
        null !== loc && gl.uniform2f(loc, x, y);
      }
    }
    uniform1i(names, value) {
      const gl = this.gl;
      for (let i = 0; i < names.length; i++) {
        const loc = gl.getUniformLocation(this.program, names[i]);
        null !== loc && gl.uniform1i(loc, value);
      }
    }
    bindModeTextures() {
      const gl = this.gl,
        units = [
          ["u_texB1", this.textures.b1],
          ["u_texB2", this.textures.b2],
          ["u_texB3", this.textures.b3],
          ["u_texB4", this.textures.b4],
          ["u_texB5", this.textures.b5],
          ["u_texB6", this.textures.b6],
          ["u_water", this.textures.water],
          ["u_texWindow", this.textures.windowMask],
          ["u_texEnv1", this.textures.env1],
          ["u_texEnv2", this.textures.env1],
        ];
      for (let i = 0; i < units.length; i++) {
        const loc = gl.getUniformLocation(this.program, units[i][0]);
        null !== loc &&
          (gl.activeTexture(gl.TEXTURE0 + i),
          gl.bindTexture(gl.TEXTURE_2D, units[i][1]),
          gl.uniform1i(loc, i));
      }
    }
    render(now, mx, my) {
      if (!this.program || !this.ready) return this.fbo.tex;
      const gl = this.gl;
      (gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.fbo),
        gl.viewport(0, 0, this.fbo.w, this.fbo.h),
        gl.clearColor(0, 0, 0, 1),
        gl.clear(gl.COLOR_BUFFER_BIT),
        gl.useProgram(this.program),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
      const pLoc = gl.getAttribLocation(this.program, "p"),
        posLoc = gl.getAttribLocation(this.program, "a_position");
      (pLoc >= 0 &&
        (gl.enableVertexAttribArray(pLoc),
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, !1, 0, 0)),
        posLoc >= 0 &&
          (gl.enableVertexAttribArray(posLoc),
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, !1, 0, 0)));
      const t = 0.001 * now;
      return (
        this.bindModeTextures(),
        this.uniform2f(
          ["u_resolution", "resolution", "iResolution"],
          this.fbo.w,
          this.fbo.h,
        ),
        this.uniform2f(["u_mouse", "mouse", "iMouse"], mx || 0, my || 0),
        this.uniform1f(["u_time", "time", "iTime"], t),
        this.uniform1f(["u_modeTime", "modeTime"], t),
        this.uniform1f(["u_blink", "blink"], 0),
        this.uniform1f(["u_flash", "flash"], 0),
        this.uniform1f(["u_shake", "shake"], 0),
        this.uniform1f(["u_wake", "wake"], 1),
        this.uniform1f(["u_trip", "trip"], 0.35),
        this.uniform1f(["u_audio", "audio"], 0),
        this.uniform1f(["u_modeSeed", "modeSeed"], 2),
        this.uniform1i(["u_mode", "mode"], 2),
        gl.drawArrays(gl.TRIANGLES, 0, 3),
        gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        this.fbo.tex
      );
    }
    destroy() {
      const gl = this.gl;
      if (
        (this.program && gl.deleteProgram(this.program),
        this.quadBuffer && gl.deleteBuffer(this.quadBuffer),
        this.fbo &&
          (gl.deleteTexture(this.fbo.tex), gl.deleteFramebuffer(this.fbo.fbo)),
        this.textures)
      )
        for (const key of Object.keys(this.textures))
          gl.deleteTexture(this.textures[key]);
    }
  }
  class TutorialRoom {
    constructor() {
      if (
        ((this.canvas = (function () {
          let canvas = document.getElementById(CONFIG.canvasId);
          return (
            canvas ||
              ((canvas = document.createElement("canvas")),
              (canvas.id = CONFIG.canvasId),
              document.body.appendChild(canvas)),
            Object.assign(canvas.style, {
              position: "fixed",
              inset: "0",
              width: "100vw",
              height: "100vh",
              display: "block",
              background: "#000",
              zIndex: "650",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              transform: "",
              transition: "none",
            }),
            canvas
          );
        })()),
        (this.gl =
          this.canvas.getContext("webgl", {
            antialias: !1,
            alpha: !1,
            depth: !0,
            preserveDrawingBuffer: !0,
          }) || this.canvas.getContext("experimental-webgl")),
        !this.gl)
      )
        throw new Error("WebGL is not available.");
      ((this.program = createProgram(
        this.gl,
        "\n    attribute vec3 a_pos;\n    attribute vec2 a_uv;\n\n    uniform mat4 u_proj;\n    uniform mat4 u_view;\n\n    varying vec2 v_uv;\n    varying vec3 v_world;\n    varying float v_depthShade;\n\n    void main() {\n      vec4 worldPos = vec4(a_pos, 1.0);\n      vec4 viewPos = u_view * worldPos;\n\n      gl_Position = u_proj * viewPos;\n\n      v_uv = a_uv;\n      v_world = a_pos;\n      v_depthShade = clamp(1.0 - length(viewPos.xyz) * 0.032, 0.58, 1.0);\n    }\n  ",
        "\n    precision mediump float;\n\n    uniform sampler2D u_tex;\n    uniform sampler2D u_mode2Tex;\n    uniform sampler2D u_tvTex;\n\n    uniform float u_time;\n    uniform float u_light;\n    uniform float u_surfaceKind;\n    uniform float u_isWalking;\n    uniform float u_exitProg;\n    uniform vec2 u_resolution;\n\n    varying vec2 v_uv;\n    varying vec3 v_world;\n    varying float v_depthShade;\n\n    float hash(vec2 p) {\n      p = fract(p * vec2(123.34, 456.21));\n      p += dot(p, p + 45.32);\n      return fract(p.x * p.y);\n    }\n\n    float noise(vec2 p) {\n      vec2 i = floor(p);\n      vec2 f = fract(p);\n\n      float a = hash(i);\n      float b = hash(i + vec2(1.0, 0.0));\n      float c = hash(i + vec2(0.0, 1.0));\n      float d = hash(i + vec2(1.0, 1.0));\n\n      vec2 u = f * f * (3.0 - 2.0 * f);\n\n      return mix(a, b, u.x) +\n        (c - a) * u.y * (1.0 - u.x) +\n        (d - b) * u.x * u.y;\n    }\n\n    float fbm(vec2 p) {\n      float v = 0.0;\n      float a = 0.5;\n\n      for (int i = 0; i < 5; i++) {\n        v += noise(p) * a;\n        p *= 2.04;\n        a *= 0.5;\n      }\n\n      return v;\n    }\n\n    float greenKey(vec3 c) {\n      float greenDominance = c.g - max(c.r, c.b);\n      float chroma = smoothstep(0.07, 0.32, greenDominance);\n      float brightness = smoothstep(0.16, 0.52, c.g);\n      float notWhite = 1.0 - smoothstep(0.70, 0.94, min(min(c.r, c.g), c.b));\n      return clamp(chroma * brightness * notWhite, 0.0, 1.0);\n    }\n\n    vec3 fallbackWindow(vec2 uv, float t) {\n      vec2 p = uv * 2.0 - 1.0;\n      p.x *= 1.35;\n\n      float drift = t * 0.035;\n      float n1 = fbm(p * 2.8 + vec2(drift, -drift * 0.7));\n      float n2 = fbm(p * 7.5 - vec2(drift * 2.2, drift * 1.1));\n\n      float horizon = smoothstep(-0.15, 0.65, p.y + n1 * 0.18);\n      float distant = smoothstep(0.2, 1.0, n1);\n      float cloud = smoothstep(0.46, 0.86, n2 + p.y * 0.14);\n\n      vec3 low = vec3(0.015, 0.018, 0.028);\n      vec3 mid = vec3(0.075, 0.085, 0.105);\n      vec3 high = vec3(0.23, 0.25, 0.25);\n\n      vec3 col = mix(low, mid, horizon);\n      col = mix(col, high, cloud * 0.45);\n      col += distant * vec3(0.035, 0.045, 0.052);\n      col += sin((uv.y + t * 0.012) * 520.0) * 0.018;\n      col += hash(uv * 900.0 + floor(t * 24.0)) * 0.035;\n      col *= 0.72 + 0.28 * smoothstep(1.35, 0.15, length(p));\n\n      return clamp(col, 0.0, 1.0);\n    }\n\n    vec2 frontWindowUv(vec2 wallUv) {\n      const vec2 minUv = vec2(0.038, 0.248);\n      const vec2 maxUv = vec2(0.302, 0.836);\n      return clamp((wallUv - minUv) / (maxUv - minUv), 0.0, 1.0);\n    }\n\n    vec2 tvScreenUv(vec2 wallUv) {\n      const vec2 minUv = vec2(0.100, 0.551);\n      const vec2 maxUv = vec2(0.908, 0.925);\n      return clamp((wallUv - minUv) / (maxUv - minUv), 0.0, 1.0);\n    }\n\n    vec3 hazyExit(vec2 uv, float t) {\n      vec2 p = uv * 2.0 - 1.0;\n      p.x *= 1.15;\n\n      float r = length(p);\n      float core = smoothstep(0.95, 0.08, r);\n      float haze = smoothstep(1.35, 0.18, r);\n      float n = fbm(p * 3.2 + vec2(t * 0.045, -t * 0.025));\n      float pulse = 0.72 + 0.28 * sin(t * 1.7 + n * 4.5);\n\n      vec3 base = vec3(0.20, 0.28, 0.29);\n      vec3 fog = vec3(0.58, 0.68, 0.64);\n      vec3 whiteHot = vec3(0.88, 0.96, 0.88);\n\n      vec3 col = mix(base, fog, haze * 0.75);\n      col = mix(col, whiteHot, core * pulse);\n      col += n * 0.12 * haze;\n      col += vec3(0.12, 0.18, 0.14) * u_exitProg;\n\n      return clamp(col, 0.0, 1.0);\n    }\n\n    void main() {\n      vec2 uv = clamp(v_uv, 0.0, 1.0);\n\n      vec4 tex = texture2D(u_tex, uv);\n\n      if (tex.a < 0.02) {\n        discard;\n      }\n\n      float key = greenKey(tex.rgb);\n\n      vec3 col = tex.rgb;\n\n      if (u_surfaceKind > 0.5 && u_surfaceKind < 1.5) {\n        vec3 modeCol = texture2D(u_mode2Tex, frontWindowUv(uv)).rgb;\n        col = mix(col, modeCol, key);\n      }\n\n      if (u_surfaceKind > 2.5 && u_surfaceKind < 3.5) {\n        vec2 screenUv = tvScreenUv(uv);\n        vec3 tvCol = texture2D(u_tvTex, screenUv).rgb;\n        col = mix(col, tvCol, key);\n      }\n\n      if (u_surfaceKind > 1.5 && u_surfaceKind < 2.5) {\n        col = mix(col, hazyExit(uv, u_time), key);\n      }\n\n      col *= u_light * v_depthShade;\n\n      vec2 suv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));\n      vec2 p = suv * 2.0 - 1.0;\n      p.x *= u_resolution.x / max(1.0, u_resolution.y);\n\n      float vign = smoothstep(1.20, 0.25, length(p));\n      col *= 0.58 + vign * 0.42;\n      col += sin(u_time * 5.0) * 0.018 * u_isWalking;\n\n      gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);\n    }\n  ",
        "tutorial room",
      )),
        (this.locations = this.getLocations()),
        (this.textures = this.createTextures()),
        (this.surfaces = (function (gl) {
          const w = 0.5 * CONFIG.room.width,
            h = CONFIG.room.height,
            d = 0.5 * CONFIG.room.depth;
          function quad(a, b, c, d0) {
            return [
              a[0],
              a[1],
              a[2],
              0,
              0,
              b[0],
              b[1],
              b[2],
              1,
              0,
              c[0],
              c[1],
              c[2],
              1,
              1,
              a[0],
              a[1],
              a[2],
              0,
              0,
              c[0],
              c[1],
              c[2],
              1,
              1,
              d0[0],
              d0[1],
              d0[2],
              0,
              1,
            ];
          }
          const tv = CONFIG.tv || {},
            tvEnabled = !1 !== tv.enabled,
            tvHeight = tv.height || 1.82,
            tvBottom = tv.bottom || 0,
            tvTop = tvBottom + tvHeight,
            tvWidth = tvHeight * (tv.frontAspect || 0.607),
            tvDepth = tvHeight * (tv.sideAspect || 0.397),
            tvBackX = w - (tv.wallInset || 0.08),
            tvFrontX = tvBackX - tvDepth,
            tvCenterZ = tv.z || 0,
            tvLeftZ = tvCenterZ - 0.5 * tvWidth,
            tvRightZ = tvCenterZ + 0.5 * tvWidth;
          return [
            {
              name: "frontWall",
              texName: "frontWall",
              surfaceKind: 1,
              light: 0.82,
              mesh: createPlane(
                gl,
                quad([w, 0, d], [-w, 0, d], [-w, h, d], [w, h, d]),
              ),
            },
            {
              name: "backDoor",
              texName: "backDoor",
              surfaceKind: 2,
              light: 0.8,
              mesh: createPlane(
                gl,
                quad([-w, 0, -d], [w, 0, -d], [w, h, -d], [-w, h, -d]),
              ),
            },
            {
              name: "leftWall",
              texName: "leftWall",
              surfaceKind: 1,
              light: 0.74,
              mesh: createPlane(
                gl,
                quad([-w, 0, d], [-w, 0, -d], [-w, h, -d], [-w, h, d]),
              ),
            },
            {
              name: "rightWall",
              texName: "rightWall",
              surfaceKind: 0,
              light: 0.68,
              mesh: createPlane(
                gl,
                quad([w, 0, -d], [w, 0, d], [w, h, d], [w, h, -d]),
              ),
            },
            ...(tvEnabled
              ? [
                  {
                    name: "tvFront",
                    texName: "tvFront",
                    surfaceKind: 3,
                    light: 0.94,
                    mesh: createPlane(
                      gl,
                      quad(
                        [tvFrontX, tvBottom, tvLeftZ],
                        [tvFrontX, tvBottom, tvRightZ],
                        [tvFrontX, tvTop, tvRightZ],
                        [tvFrontX, tvTop, tvLeftZ],
                      ),
                    ),
                  },
                  {
                    name: "tvLeft",
                    texName: "tvLeft",
                    surfaceKind: 0,
                    light: 0.78,
                    mesh: createPlane(
                      gl,
                      quad(
                        [tvBackX, tvBottom, tvLeftZ],
                        [tvFrontX, tvBottom, tvLeftZ],
                        [tvFrontX, tvTop, tvLeftZ],
                        [tvBackX, tvTop, tvLeftZ],
                      ),
                    ),
                  },
                  {
                    name: "tvRight",
                    texName: "tvRight",
                    surfaceKind: 0,
                    light: 0.78,
                    mesh: createPlane(
                      gl,
                      quad(
                        [tvFrontX, tvBottom, tvRightZ],
                        [tvBackX, tvBottom, tvRightZ],
                        [tvBackX, tvTop, tvRightZ],
                        [tvFrontX, tvTop, tvRightZ],
                      ),
                    ),
                  },
                ]
              : []),
            {
              name: "floor",
              texName: "floor",
              surfaceKind: 0,
              light: 0.72,
              mesh: createPlane(
                gl,
                quad([-w, 0, d], [w, 0, d], [w, 0, -d], [-w, 0, -d]),
              ),
            },
            {
              name: "ceiling",
              texName: "ceiling",
              surfaceKind: 0,
              light: 0.55,
              mesh: createPlane(
                gl,
                quad([-w, h, -d], [w, h, -d], [w, h, d], [-w, h, d]),
              ),
            },
          ];
        })(this.gl)),
        (this.mode2 = new Mode2Renderer(this.gl)),
        (this.overlay = this.createOverlayResources()),
        (this.mx = 0),
        (this.my = 0),
        (this.cx = 0),
        (this.cy = 0),
        (this.isDragging = !1),
        (this.lastDragX = 0),
        (this.lastDragY = 0),
        (this.facing = "N"),
        (this.yaw = YAW_FOR_FACING[this.facing]),
        (this.turnAnimating = !1),
        (this.turnStart = 0),
        (this.turnStartYaw = this.yaw),
        (this.turnTargetYaw = this.yaw),
        (this.turnLookX = 0),
        (this.turnLookY = 0),
        (this.pendingFacing = null),
        (this.lastTurnTime = -9999),
        (this.camZ = CONFIG.movement.startZ),
        (this.walking = 0),
        (this.tvZoom = 0),
        (this.tvZoomTarget = 0),
        (this.returning = !1),
        (this.lastNow = performance.now()),
        (this.startTime = performance.now()),
        (this.running = !0),
        (window.z2SpaceHeld = !1),
        (window.z2TouchHeld = !1),
        (window.mx = 0),
        (window.my = 0),
        (window.currentTutorialRoom = this),
        (window.__tutorialFacing = this.facing),
        (window.__tutorialTvZoom = 0),
        (this.bound = {
          resize: this.resize.bind(this),
          keydown: this.onKeyDown.bind(this),
          keyup: this.onKeyUp.bind(this),
          mousedown: this.onMouseDown.bind(this),
          mousemove: this.onMouseMove.bind(this),
          mouseup: this.onMouseUp.bind(this),
          touchstart: this.onTouchStart.bind(this),
          touchmove: this.onTouchMove.bind(this),
          touchend: this.onTouchEnd.bind(this),
          touchcancel: this.onTouchCancel.bind(this),
        }),
        this.bindEvents(),
        this.resize(),
        requestAnimationFrame(this.frame.bind(this)));
    }
    getLocations() {
      const gl = this.gl,
        p = this.program;
      return {
        aPos: gl.getAttribLocation(p, "a_pos"),
        aUv: gl.getAttribLocation(p, "a_uv"),
        uProj: gl.getUniformLocation(p, "u_proj"),
        uView: gl.getUniformLocation(p, "u_view"),
        uTex: gl.getUniformLocation(p, "u_tex"),
        uMode2Tex: gl.getUniformLocation(p, "u_mode2Tex"),
        uTvTex: gl.getUniformLocation(p, "u_tvTex"),
        uTime: gl.getUniformLocation(p, "u_time"),
        uLight: gl.getUniformLocation(p, "u_light"),
        uSurfaceKind: gl.getUniformLocation(p, "u_surfaceKind"),
        uIsWalking: gl.getUniformLocation(p, "u_isWalking"),
        uExitProg: gl.getUniformLocation(p, "u_exitProg"),
        uResolution: gl.getUniformLocation(p, "u_resolution"),
      };
    }
    createTextures() {
      const gl = this.gl;
      return {
        frontWall: loadTexture(gl, TEXTURES_frontWall, [110, 115, 108, 255]),
        leftWall: loadTexture(gl, TEXTURES_leftWall, [110, 115, 108, 255]),
        backDoor: loadTexture(gl, TEXTURES_backDoor, [95, 100, 96, 255]),
        rightWall: loadTexture(gl, TEXTURES_rightWall, [118, 118, 112, 255]),
        ceiling: loadTexture(gl, TEXTURES_ceiling, [145, 150, 148, 255]),
        floor: loadTexture(gl, TEXTURES_floor, [112, 78, 48, 255]),
        tvFront: loadTexture(gl, TEXTURES_tvFront, [0, 0, 0, 0]),
        tvLeft: loadTexture(gl, TEXTURES_tvLeft, [0, 0, 0, 0]),
        tvRight: loadTexture(gl, TEXTURES_tvRight, [0, 0, 0, 0]),
        tvScreen: loadVideoTexture(gl, ["tv.mp4"], [5, 5, 5, 255]),
      };
    }
    createOverlayResources() {
      const gl = this.gl,
        program = createProgram(
          gl,
          MODE_VS,
          "\n    precision mediump float;\n\n    uniform sampler2D u_tex;\n    uniform vec2 u_resolution;\n    uniform vec2 u_texSize;\n    uniform float u_opacity;\n\n    void main() {\n      vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));\n      float screenAspect = u_resolution.x / max(1.0, u_resolution.y);\n      float texAspect = u_texSize.x / max(1.0, u_texSize.y);\n      vec2 sampleUv = uv;\n\n      if (screenAspect > texAspect) {\n        float scale = screenAspect / texAspect;\n        sampleUv.x = (uv.x - 0.5) * scale + 0.5;\n      } else {\n        float scale = texAspect / screenAspect;\n        sampleUv.y = (uv.y - 0.5) * scale + 0.5;\n      }\n\n      if (\n        sampleUv.x < 0.0 ||\n        sampleUv.x > 1.0 ||\n        sampleUv.y < 0.0 ||\n        sampleUv.y > 1.0\n      ) {\n        discard;\n      }\n\n      vec4 tex = texture2D(u_tex, sampleUv);\n      gl_FragColor = vec4(tex.rgb, tex.a * u_opacity);\n    }\n  ",
          "tutorial overlays",
        ),
        buffer = gl.createBuffer();
      return (
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ),
        {
          program: program,
          buffer: buffer,
          textures: [
            loadTexture(gl, ["overlay1.png"], [0, 0, 0, 0]),
            loadTexture(gl, ["overlay2.png"], [0, 0, 0, 0]),
            loadTexture(gl, ["overlay3.png"], [0, 0, 0, 0]),
            loadTexture(gl, ["overlay4.png"], [0, 0, 0, 0]),
          ],
          aPos: gl.getAttribLocation(program, "p"),
          uTex: gl.getUniformLocation(program, "u_tex"),
          uResolution: gl.getUniformLocation(program, "u_resolution"),
          uTexSize: gl.getUniformLocation(program, "u_texSize"),
          uOpacity: gl.getUniformLocation(program, "u_opacity"),
        }
      );
    }
    bindEvents() {
      (window.addEventListener("resize", this.bound.resize, { passive: !0 }),
        window.addEventListener("keydown", this.bound.keydown, { passive: !1 }),
        window.addEventListener("keyup", this.bound.keyup, { passive: !1 }),
        window.addEventListener("mousedown", this.bound.mousedown),
        window.addEventListener("mousemove", this.bound.mousemove),
        window.addEventListener("mouseup", this.bound.mouseup),
        window.addEventListener("touchstart", this.bound.touchstart, {
          passive: !1,
        }),
        window.addEventListener("touchmove", this.bound.touchmove, {
          passive: !1,
        }),
        window.addEventListener("touchend", this.bound.touchend, {
          passive: !1,
        }),
        window.addEventListener("touchcancel", this.bound.touchcancel, {
          passive: !1,
        }));
    }
    unbindEvents() {
      (window.removeEventListener("resize", this.bound.resize),
        window.removeEventListener("keydown", this.bound.keydown),
        window.removeEventListener("keyup", this.bound.keyup),
        window.removeEventListener("mousedown", this.bound.mousedown),
        window.removeEventListener("mousemove", this.bound.mousemove),
        window.removeEventListener("mouseup", this.bound.mouseup),
        window.removeEventListener("touchstart", this.bound.touchstart),
        window.removeEventListener("touchmove", this.bound.touchmove),
        window.removeEventListener("touchend", this.bound.touchend),
        window.removeEventListener("touchcancel", this.bound.touchcancel));
    }
    resize() {
      const dpr = IS_MOBILE
          ? Math.min(1, devicePixelRatio || 1)
          : Math.min(2, devicePixelRatio || 1),
        w = Math.max(1, Math.floor(innerWidth * dpr)),
        h = Math.max(1, Math.floor(innerHeight * dpr));
      ((this.canvas.width === w && this.canvas.height === h) ||
        ((this.canvas.width = w), (this.canvas.height = h)),
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height));
    }
    onKeyDown(e) {
      "Space" === e.code && (e.preventDefault(), (window.z2SpaceHeld = !0));
    }
    onKeyUp(e) {
      "Space" === e.code && (e.preventDefault(), (window.z2SpaceHeld = !1));
    }
    mobileWalkZoneContains(x, y) {
      if ("function" == typeof window.__mobileWalkZoneContains)
        return window.__mobileWalkZoneContains(x, y);
      const i = window.innerWidth;
      return y >= 0.68 * window.innerHeight && x >= 0.3 * i && x <= 0.7 * i;
    }
    startDrag(event, x, y) {
      (event &&
        event.target &&
        ("secret-button" === event.target.id ||
          event.target.closest("#conky-sidebar") ||
          event.target.closest("#aboutOverlay"))) ||
        (window.audioCtx &&
          "suspended" === window.audioCtx.state &&
          window.audioCtx.resume(),
        (this.isDragging = !0),
        (this.lastDragX = x),
        (this.lastDragY = y),
        (this.canvas.style.cursor = "grabbing"));
    }
    doDrag(x, y) {
      this.isDragging &&
        !this.returning &&
        ((this.mx -=
          ((x - this.lastDragX) / innerWidth) * CONFIG.look.dragScaleX),
        (this.my -=
          ((y - this.lastDragY) / innerHeight) * CONFIG.look.dragScaleY),
        (this.lastDragX = x),
        (this.lastDragY = y),
        (this.mx = clamp(this.mx, -CONFIG.look.mxClamp, CONFIG.look.mxClamp)),
        (this.my = clamp(this.my, -CONFIG.look.myClamp, CONFIG.look.myClamp)),
        (window.mx = this.mx),
        (window.my = this.my));
    }
    endDrag() {
      ((this.isDragging = !1),
        (this.mx = 0),
        (this.my = 0),
        (window.mx = 0),
        (window.my = 0),
        (this.canvas.style.cursor = "grab"));
    }
    onMouseDown(e) {
      this.startDrag(e, e.clientX, e.clientY);
    }
    onMouseMove(e) {
      this.doDrag(e.clientX, e.clientY);
    }
    onMouseUp() {
      this.endDrag();
    }
    onTouchStart(e) {
      if (!e.touches || !e.touches.length) return;
      let walkingTouch = !1;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        this.mobileWalkZoneContains(t.clientX, t.clientY) &&
          (walkingTouch = !0);
      }
      if (((window.z2TouchHeld = walkingTouch), !walkingTouch)) {
        const t = e.touches[0];
        this.startDrag(e, t.clientX, t.clientY);
      }
      e.preventDefault();
    }
    onTouchMove(e) {
      if (!e.touches || !e.touches.length) return;
      let walkingTouch = !1;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        this.mobileWalkZoneContains(t.clientX, t.clientY) &&
          (walkingTouch = !0);
      }
      if (((window.z2TouchHeld = walkingTouch), !walkingTouch)) {
        const t = e.touches[0];
        this.doDrag(t.clientX, t.clientY);
      }
      e.preventDefault();
    }
    onTouchEnd(e) {
      (this.endDrag(), this.checkTouchWalk(e), e.preventDefault());
    }
    onTouchCancel(e) {
      (this.endDrag(), (window.z2TouchHeld = !1), e.preventDefault());
    }
    checkTouchWalk(e) {
      if (!e.touches || !e.touches.length)
        return void (window.z2TouchHeld = !1);
      let held = !1;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        this.mobileWalkZoneContains(t.clientX, t.clientY) && (held = !0);
      }
      window.z2TouchHeld = held;
    }
    commitFacing(facing, now) {
      ((this.facing = facing),
        (this.yaw = this.turnTargetYaw),
        (this.lastTurnTime = now),
        (this.mx = 0),
        (this.my = 0),
        (this.cx = 0),
        (this.cy = 0),
        (window.mx = 0),
        (window.my = 0),
        (window.__tutorialFacing = this.facing));
    }
    beginTurn(facing, turnDir, now) {
      this.turnAnimating ||
        facing === this.facing ||
        ((this.pendingFacing = facing),
        (this.turnAnimating = !0),
        (this.turnStart = now),
        (this.turnStartYaw = this.yaw),
        (this.turnTargetYaw = this.yaw + turnDir * Math.PI * 0.5),
        (this.turnLookX = this.cx),
        (this.turnLookY = this.cy),
        (this.lastTurnTime = now));
    }
    turnLeft(now) {
      this.beginTurn(TURN_LEFT[this.facing], -1, now);
    }
    turnRight(now) {
      this.beginTurn(TURN_RIGHT[this.facing], 1, now);
    }
    getTurnT(now) {
      if (!this.turnAnimating) return 1;
      const p = clamp((now - this.turnStart) / CONFIG.turn.durationMs, 0, 1);
      return p * p * (3 - 2 * p);
    }
    tickTurn(now) {
      if (!this.turnAnimating) return;
      const turnT = this.getTurnT(now);
      ((this.yaw =
        this.turnStartYaw + (this.turnTargetYaw - this.turnStartYaw) * turnT),
        (this.cx = this.turnLookX * (1 - turnT)),
        (this.cy = this.turnLookY * (1 - turnT)),
        turnT >= 1 &&
          ((this.turnAnimating = !1),
          this.commitFacing(this.pendingFacing, now),
          (this.pendingFacing = null),
          window.dispatchEvent(new Event("mouseup")),
          window.dispatchEvent(new Event("touchend"))));
    }
    checkTurnThreshold(now) {
      this.isDragging &&
        (this.tvZoom > 0.08 ||
          this.turnAnimating ||
          now - this.lastTurnTime < CONFIG.turn.cooldownMs ||
          (this.mx >= CONFIG.look.turnThreshold
            ? this.turnRight(now)
            : this.mx <= -CONFIG.look.turnThreshold && this.turnLeft(now)));
    }
    updateMovement(frameScale) {
      const wantsWalk = !(!window.z2SpaceHeld && !window.z2TouchHeld),
        tvZoomCfg = (CONFIG.tv && CONFIG.tv.zoom) || {},
        canTvZoom =
          CONFIG.tv &&
          !1 !== CONFIG.tv.enabled &&
          this.facing === (tvZoomCfg.triggerFacing || "E") &&
          !this.returning &&
          !this.turnAnimating;
      this.tvZoomTarget = wantsWalk && canTvZoom ? 1 : 0;
      const tvEaseBase = this.tvZoomTarget > this.tvZoom ? 0.035 : 0.18;
      ((this.tvZoom +=
        (this.tvZoomTarget - this.tvZoom) *
        clamp(tvEaseBase * frameScale, 0, 1)),
        Math.abs(this.tvZoom - this.tvZoomTarget) < 5e-4 &&
          (this.tvZoom = this.tvZoomTarget),
        (window.__tutorialTvZoom = this.tvZoom));
      const canWalk =
        this.facing === CONFIG.movement.exitFacing &&
        !this.returning &&
        !this.turnAnimating &&
        this.tvZoom < 0.05;
      ((this.walking = 0),
        wantsWalk &&
          canWalk &&
          ((this.camZ = Math.max(
            CONFIG.movement.exitZ,
            this.camZ - CONFIG.movement.stepPerFrameAt30 * frameScale,
          )),
          (this.walking = 1),
          this.camZ <= CONFIG.movement.exitZ + 1e-4 && this.returnToEngine1()));
    }
    update(now) {
      let dtMs = now - this.lastNow;
      (dtMs > 250 || dtMs <= 0) && (dtMs = 33.33);
      const frameScale = dtMs / (IS_MOBILE ? 50 : 33.33);
      ((window.lastNow = now),
        this.checkTurnThreshold(now),
        this.tickTurn(now),
        this.turnAnimating ||
          ((this.cx += 0.12 * (this.mx - this.cx)),
          (this.cy += 0.12 * (this.my - this.cy))),
        this.updateMovement(frameScale),
        (this.lastNow = now));
    }
    returnToEngine1() {
      if (this.returning) return;
      this.returning = !0;
      const fadeEl = (function () {
        let overlay = document.getElementById("zone-fade-overlay");
        return (
          overlay ||
            ((overlay = document.createElement("div")),
            (overlay.id = "zone-fade-overlay"),
            (overlay.style.cssText =
              "position:fixed;inset:0;background:black;opacity:0;pointer-events:none;transition:opacity 0.7s ease-in-out;z-index:99999;"),
            document.body.appendChild(overlay)),
          overlay
        );
      })();
      (setTimeout(() => {
        fadeEl.style.opacity = "1";
      }, 20),
        (window.__tutorialReturningToEngine1 = !0),
        (window.__tutorialRoomExited = !0),
        setTimeout(() => {
          (this.stop(),
            (window.currentTutorialRoom = null),
            (window.z2SpaceHeld = !1),
            (window.z2TouchHeld = !1),
            (window.mx = 0),
            (window.my = 0));
          let resumed = !1;
          try {
            ((window.isEngine1Dead = !1),
              "undefined" != typeof phase && (phase = "open"),
              "undefined" != typeof blink && (blink = 0),
              "undefined" != typeof timer && (timer = performance.now()),
              "undefined" != typeof activePOV && (activePOV = "center"),
              "undefined" != typeof mx && (mx = 0),
              "undefined" != typeof my && (my = 0),
              "undefined" != typeof cx && (cx = 0),
              "undefined" != typeof cy && (cy = 0),
              "undefined" != typeof currentEngine &&
                "undefined" != typeof ActiveMode &&
                (currentEngine &&
                  currentEngine.destroy &&
                  currentEngine.destroy(),
                (currentEngine = new ActiveMode(
                  ("undefined" != typeof mode && mode) || 1,
                )),
                "function" == typeof initSideEngines && initSideEngines(),
                "undefined" != typeof __lastFrameTime && (__lastFrameTime = 0),
                "function" == typeof __frameGovernor &&
                  requestAnimationFrame(__frameGovernor),
                (resumed = !0)));
          } catch (err) {
            console.warn("[tutorial] engine1 resume failed", err);
          }
          const engineCanvas = document.getElementById(CONFIG.engineCanvasId);
          (engineCanvas &&
            ((engineCanvas.style.display = "block"),
            (engineCanvas.style.opacity = "1"),
            (engineCanvas.style.transform = ""),
            (engineCanvas.style.pointerEvents = "auto"),
            (resumed = !0)),
            resumed || !CONFIG.navigateOnExit
              ? setTimeout(() => {
                  fadeEl.style.opacity = "0";
                }, 100)
              : (window.location.href = CONFIG.returnUrl));
        }, CONFIG.movement.exitHoldMs));
    }
    draw(now) {
      const gl = this.gl,
        t = 0.001 * (now - this.startTime),
        mode2Tex = this.mode2.render(now, this.cx, this.cy);
      (gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.viewport(0, 0, this.canvas.width, this.canvas.height),
        gl.clearColor(
          CONFIG.clearColor[0],
          CONFIG.clearColor[1],
          CONFIG.clearColor[2],
          CONFIG.clearColor[3],
        ),
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
        gl.enable(gl.DEPTH_TEST),
        gl.depthFunc(gl.LEQUAL),
        gl.disable(gl.CULL_FACE),
        gl.enable(gl.BLEND),
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
        gl.useProgram(this.program));
      const aspect = this.canvas.width / Math.max(1, this.canvas.height),
        tvZoomCfg = (CONFIG.tv && CONFIG.tv.zoom) || {},
        tvT = (function (edge0, edge1, x) {
          const t = clamp((x - 0) / Math.max(1e-6, 1), 0, 1);
          return t * t * (3 - 2 * t);
        })(0, 0, this.tvZoom),
        proj = (function (fovy, aspect) {
          const f = 1 / Math.tan(0.5 * fovy),
            nf = 1 / -79.98;
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
            80.02 * nf,
            -1,
            0,
            0,
            3.2 * nf,
            0,
          ]);
        })(
          (lerp(CONFIG.camera.fov, tvZoomCfg.targetFov || 32, tvT) * Math.PI) /
            180,
          aspect,
        ),
        yaw = this.yaw + 0.35 * this.cx * (1 - 0.92 * tvT),
        pitch = lerp(this.cy * CONFIG.look.pitchAmount, 0, tvT),
        bobX = 0.018 * Math.sin(2.5 * t) * this.walking,
        bobY = 0.024 * Math.cos(5 * t) * this.walking,
        tvMetrics = (function () {
          const w = 0.5 * CONFIG.room.width,
            tv = CONFIG.tv || {},
            zoom = tv.zoom || {},
            tvHeight = tv.height || 1.82,
            tvBottom = tv.bottom || 0,
            tvWidth = tvHeight * (tv.frontAspect || 0.607),
            tvDepth = tvHeight * (tv.sideAspect || 0.397),
            tvBackX = w - (tv.wallInset || 0.08),
            tvFrontX = tvBackX - tvDepth,
            centerZ = tv.z || 0,
            screenCenterY = tvBottom + tvHeight * (zoom.screenCenterV || 0.738);
          return {
            backX: tvBackX,
            frontX: tvFrontX,
            cameraX: tvFrontX - (zoom.stopDistance || 1.05),
            centerZ: centerZ,
            screenCenterY: screenCenterY,
            width: tvWidth,
            height: tvHeight,
          };
        })(),
        camX = lerp(CONFIG.camera.x + bobX, tvMetrics.cameraX, tvT),
        camY = lerp(CONFIG.camera.y + bobY, tvMetrics.screenCenterY, tvT),
        camZ = lerp(this.camZ, tvMetrics.centerZ, tvT),
        cp = Math.cos(pitch),
        view = (function (eye, center, up) {
          let zx = eye[0] - center[0],
            zy = eye[1] - center[1],
            zz = eye[2] - center[2],
            len = Math.hypot(zx, zy, zz) || 1;
          ((zx /= len), (zy /= len), (zz /= len));
          let xx = up[1] * zz - up[2] * zy,
            xy = up[2] * zx - up[0] * zz,
            xz = up[0] * zy - up[1] * zx;
          ((len = Math.hypot(xx, xy, xz) || 1),
            (xx /= len),
            (xy /= len),
            (xz /= len));
          const yx = zy * xz - zz * xy,
            yy = zz * xx - zx * xz,
            yz = zx * xy - zy * xx;
          return new Float32Array([
            xx,
            yx,
            zx,
            0,
            xy,
            yy,
            zy,
            0,
            xz,
            yz,
            zz,
            0,
            -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
            -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
            -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
            1,
          ]);
        })(
          [camX, camY, camZ],
          [
            camX + Math.sin(yaw) * cp,
            camY + Math.sin(pitch),
            camZ + Math.cos(yaw) * cp,
          ],
          [0, 1, 0],
        ),
        exitProg = clamp(
          (CONFIG.movement.startZ - this.camZ) /
            Math.max(0.001, CONFIG.movement.startZ - CONFIG.movement.exitZ),
          0,
          1,
        );
      (gl.uniformMatrix4fv(this.locations.uProj, !1, proj),
        gl.uniformMatrix4fv(this.locations.uView, !1, view),
        gl.uniform1i(this.locations.uTex, 0),
        gl.uniform1i(this.locations.uMode2Tex, 1),
        gl.uniform1i(this.locations.uTvTex, 2),
        gl.uniform1f(this.locations.uTime, t),
        gl.uniform1f(this.locations.uIsWalking, this.walking),
        gl.uniform1f(this.locations.uExitProg, exitProg),
        gl.uniform2f(
          this.locations.uResolution,
          this.canvas.width,
          this.canvas.height,
        ),
        gl.activeTexture(gl.TEXTURE2),
        (function (gl, tex) {
          const video = tex && tex._video;
          !video ||
            !tex._videoReady ||
            video.readyState < 2 ||
            (gl.bindTexture(gl.TEXTURE_2D, tex),
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0),
            tex._allocated
              ? gl.texSubImage2D(
                  gl.TEXTURE_2D,
                  0,
                  0,
                  0,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  video,
                )
              : (gl.texParameteri(
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
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  video,
                ),
                (tex._allocated = !0)));
        })(gl, this.textures.tvScreen),
        gl.bindTexture(gl.TEXTURE_2D, this.textures.tvScreen),
        gl.activeTexture(gl.TEXTURE1),
        gl.bindTexture(gl.TEXTURE_2D, mode2Tex));
      for (const surface of this.surfaces) {
        const mesh = surface.mesh;
        (gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer),
          gl.enableVertexAttribArray(this.locations.aPos),
          gl.vertexAttribPointer(this.locations.aPos, 3, gl.FLOAT, !1, 20, 0),
          gl.enableVertexAttribArray(this.locations.aUv),
          gl.vertexAttribPointer(this.locations.aUv, 2, gl.FLOAT, !1, 20, 12),
          gl.activeTexture(gl.TEXTURE0),
          gl.bindTexture(gl.TEXTURE_2D, this.textures[surface.texName]),
          gl.uniform1f(this.locations.uLight, surface.light),
          gl.uniform1f(this.locations.uSurfaceKind, surface.surfaceKind),
          gl.drawArrays(gl.TRIANGLES, 0, mesh.count));
      }
      this.drawOverlays(now);
    }
    drawOverlayTexture(tex, opacity) {
      if (!this.overlay || !tex || opacity <= 0.001) return;
      const gl = this.gl,
        ov = this.overlay;
      (gl.useProgram(ov.program),
        gl.bindBuffer(gl.ARRAY_BUFFER, ov.buffer),
        ov.aPos >= 0 &&
          (gl.enableVertexAttribArray(ov.aPos),
          gl.vertexAttribPointer(ov.aPos, 2, gl.FLOAT, !1, 0, 0)),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(gl.TEXTURE_2D, tex),
        gl.uniform1i(ov.uTex, 0),
        gl.uniform2f(ov.uResolution, this.canvas.width, this.canvas.height),
        gl.uniform2f(ov.uTexSize, tex._w || 1, tex._h || 1),
        gl.uniform1f(ov.uOpacity, opacity),
        gl.drawArrays(gl.TRIANGLES, 0, 3));
    }
    drawOverlays(now) {
      const textures = this.overlay && this.overlay.textures;
      if (!textures || !textures.length) return;
      const gl = this.gl,
        cycleMs = CONFIG.overlays.holdMs + CONFIG.overlays.fadeMs,
        elapsed = Math.max(0, now - this.startTime),
        step = Math.floor(elapsed / cycleMs),
        localMs = elapsed - step * cycleMs,
        current = step % textures.length,
        next = (current + 1) % textures.length,
        fadeRaw = clamp(
          (localMs - CONFIG.overlays.holdMs) / CONFIG.overlays.fadeMs,
          0,
          1,
        ),
        fade = fadeRaw * fadeRaw * (3 - 2 * fadeRaw),
        opacity =
          CONFIG.overlays.opacity * (1 - clamp(1.25 * this.tvZoom, 0, 1));
      (gl.disable(gl.DEPTH_TEST),
        gl.depthMask(!1),
        gl.enable(gl.BLEND),
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
        this.drawOverlayTexture(textures[current], opacity * (1 - fade)),
        this.drawOverlayTexture(textures[next], opacity * fade),
        gl.disable(gl.BLEND),
        gl.depthMask(!0));
    }
    frame(now) {
      this.running &&
        (this.update(now),
        this.draw(now),
        requestAnimationFrame(this.frame.bind(this)));
    }
    stop() {
      ((this.running = !1),
        this.unbindEvents(),
        (window.z2SpaceHeld = !1),
        (window.z2TouchHeld = !1),
        (window.mx = 0),
        (window.my = 0),
        (window.__tutorialTvZoom = 0),
        this.canvas &&
          ((this.canvas.style.display = "none"),
          (this.canvas.style.pointerEvents = "none"),
          (this.canvas.style.transform = "")));
    }
    destroy() {
      this.stop();
      const gl = this.gl;
      if ((this.mode2 && this.mode2.destroy(), this.surfaces))
        for (const surface of this.surfaces)
          surface.mesh &&
            surface.mesh.buffer &&
            gl.deleteBuffer(surface.mesh.buffer);
      if (this.textures)
        for (const key of Object.keys(this.textures)) {
          const video = this.textures[key] && this.textures[key]._video;
          if (video) {
            try {
              video.pause();
            } catch (e) {}
            video.parentNode && video.parentNode.removeChild(video);
          }
          gl.deleteTexture(this.textures[key]);
        }
      if (
        this.overlay &&
        (this.overlay.program && gl.deleteProgram(this.overlay.program),
        this.overlay.buffer && gl.deleteBuffer(this.overlay.buffer),
        this.overlay.textures)
      )
        for (const tex of this.overlay.textures) gl.deleteTexture(tex);
      (this.program && gl.deleteProgram(this.program),
        this.canvas &&
          this.canvas.parentNode &&
          this.canvas.parentNode.removeChild(this.canvas));
    }
  }
  function startTutorialRoom() {
    return (
      window.__tutorialRoom &&
        window.__tutorialRoom.destroy &&
        window.__tutorialRoom.destroy(),
      (window.__tutorialRoomExited = !1),
      (window.__tutorialReturningToEngine1 = !1),
      (window.__tutorialRoom = new TutorialRoom()),
      window.__tutorialRoom
    );
  }
  ((window.TutorialRoom = {
    start: startTutorialRoom,
    get instance() {
      return window.__tutorialRoom || null;
    },
  }),
    window.TUTORIAL_MANUAL_START ||
      ("loading" === document.readyState
        ? document.addEventListener("DOMContentLoaded", startTutorialRoom, {
            once: !0,
          })
        : startTutorialRoom()));
})();
