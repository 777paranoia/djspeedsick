!(function () {
  ((window.GLSL = window.GLSL || {}),
    (window.GLSL.modules = window.GLSL.modules || {}));
  const fallbackShader =
    "\nprecision highp float;\nuniform vec2 resolution;\nuniform float time;\nuniform float progress;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / max(resolution, vec2(1.0));\n  vec3 col = vec3(0.010, 0.012, 0.014);\n  float aisle = 1.0 - smoothstep(0.03, 0.25, abs(uv.x - 0.5) * (1.0 + uv.y * 3.0));\n  float rows = 1.0 - smoothstep(0.02, 0.05, abs(fract((uv.y + progress * 0.18) * 88.0) - 0.5));\n  col += rows * vec3(0.035, 0.038, 0.040);\n  col += aisle * vec3(0.09, 0.08, 0.045);\n  gl_FragColor = vec4(col, 1.0);\n}\n";
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function mix(a, b, t) {
    return a + (b - a) * t;
  }
  function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function v3(x, y, z) {
    return [x, y, z];
  }
  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function norm(a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function makeProgram(gl, vertexSource, fragmentSource) {
    function shader(type, source) {
      const sh = gl.createShader(type);
      if (
        (gl.shaderSource(sh, source),
        gl.compileShader(sh),
        !gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      )
        throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
      return sh;
    }
    const vs = shader(gl.VERTEX_SHADER, vertexSource),
      fs = shader(gl.FRAGMENT_SHADER, fragmentSource),
      pr = gl.createProgram();
    if (
      (gl.attachShader(pr, vs),
      gl.attachShader(pr, fs),
      gl.linkProgram(pr),
      !gl.getProgramParameter(pr, gl.LINK_STATUS))
    )
      throw new Error(gl.getProgramInfoLog(pr) || "program link failed");
    return pr;
  }
  function createBuilder() {
    const data = [];
    function tri(a, b, c, n, color) {
      data.push(
        a[0],
        a[1],
        a[2],
        n[0],
        n[1],
        n[2],
        color[0],
        color[1],
        color[2],
        b[0],
        b[1],
        b[2],
        n[0],
        n[1],
        n[2],
        color[0],
        color[1],
        color[2],
        c[0],
        c[1],
        c[2],
        n[0],
        n[1],
        n[2],
        color[0],
        color[1],
        color[2],
      );
    }
    function quad(a, b, c, d, color) {
      const n = norm(cross(sub(b, a), sub(c, a)));
      (tri(a, b, c, n, color), tri(a, c, d, n, color));
    }
    return {
      data: data,
      quad: quad,
      box: function (min, max, color) {
        const x0 = min[0],
          y0 = min[1],
          z0 = min[2],
          x1 = max[0],
          y1 = max[1],
          z1 = max[2],
          p000 = v3(x0, y0, z0),
          p001 = v3(x0, y0, z1),
          p010 = v3(x0, y1, z0),
          p011 = v3(x0, y1, z1),
          p100 = v3(x1, y0, z0),
          p101 = v3(x1, y0, z1),
          p110 = v3(x1, y1, z0),
          p111 = v3(x1, y1, z1);
        (quad(p001, p101, p111, p011, color),
          quad(p100, p000, p010, p110, color),
          quad(p000, p001, p011, p010, color),
          quad(p101, p100, p110, p111, color),
          quad(p010, p011, p111, p110, color),
          quad(p000, p100, p101, p001, color));
      },
      beam: function (a, b, radius, color) {
        const d = sub(b, a);
        if (Math.hypot(d[0], d[1], d[2]) < 0.001) return;
        const dir = norm(d),
          side = norm(
            Math.abs(dir[1]) > 0.9
              ? cross(dir, [1, 0, 0])
              : cross(dir, [0, 1, 0]),
          ),
          up = norm(cross(side, dir)),
          s = radius,
          pointsA = [
            [
              a[0] + side[0] * s + up[0] * s,
              a[1] + side[1] * s + up[1] * s,
              a[2] + side[2] * s + up[2] * s,
            ],
            [
              a[0] - side[0] * s + up[0] * s,
              a[1] - side[1] * s + up[1] * s,
              a[2] - side[2] * s + up[2] * s,
            ],
            [
              a[0] - side[0] * s - up[0] * s,
              a[1] - side[1] * s - up[1] * s,
              a[2] - side[2] * s - up[2] * s,
            ],
            [
              a[0] + side[0] * s - up[0] * s,
              a[1] + side[1] * s - up[1] * s,
              a[2] + side[2] * s - up[2] * s,
            ],
          ],
          pointsB = pointsA.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
        for (let i = 0; i < 4; i++)
          quad(
            pointsA[i],
            pointsA[(i + 1) % 4],
            pointsB[(i + 1) % 4],
            pointsB[i],
            color,
          );
      },
    };
  }
  ((window.GLSL.modules.room_theater = fallbackShader),
    (window.GLSL.modules["mode.theater"] = fallbackShader),
    (window.GLSL.modules["mode-theater"] = fallbackShader),
    (window.GLSL.modules["mode-theater.js"] = fallbackShader),
    (window.createTheaterGeometryScene = function (canvas, options) {
      const fail =
          options && options.fail
            ? options.fail
            : function (msg) {
                throw new Error(msg);
              },
        gl =
          canvas.getContext("webgl", {
            alpha: !1,
            antialias: !0,
            depth: !0,
            stencil: !1,
            preserveDrawingBuffer: !1,
          }) || canvas.getContext("experimental-webgl");
      if (!gl) return (fail("WebGL is not available."), null);
      let theaterEntryCameraZ = 552.1,
        theaterTunnelInnerZ = 286.1,
        theaterTunnelMouthZ = 512.1,
        theaterHallBackZ = 560.1,
        theaterTunnelFloorY = 0,
        theaterTunnelCeilY = 5,
        theaterTunnelHalfFloor = 1.65,
        theaterTunnelHalfWall = 1.95;
      function makeStaticTexture(src) {
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
            new Uint8Array([3, 4, 5, 255]),
          ),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR));
        const img = new Image();
        return (
          (img.crossOrigin = "anonymous"),
          (img.onload = function () {
            try {
              (gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !1),
                gl.activeTexture(gl.TEXTURE0),
                gl.bindTexture(gl.TEXTURE_2D, tex),
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  img,
                ));
            } catch (e) {}
          }),
          (img.src = src),
          tex
        );
      }
      function texturedBuffer(vertices, tex, tint) {
        const buf = gl.createBuffer();
        return (
          gl.bindBuffer(gl.ARRAY_BUFFER, buf),
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW),
          {
            buffer: buf,
            count: vertices.length / 5,
            tex: tex,
            tint: tint,
          }
        );
      }
      const program = makeProgram(
          gl,
          "\nattribute vec3 a_position;\nattribute vec3 a_normal;\nattribute vec3 a_color;\nuniform mat4 u_viewProj;\nuniform vec3 u_camera;\nuniform float u_houseLights;\nvarying vec3 v_color;\nvarying float v_fog;\nvarying float v_light;\nvoid main() {\n  vec4 world = vec4(a_position, 1.0);\n  gl_Position = u_viewProj * world;\n  vec3 N = normalize(a_normal);\n  float key = max(dot(N, normalize(vec3(-0.22, 0.66, -0.54))), 0.0);\n  float fill = max(dot(N, normalize(vec3(0.18, 0.10, 0.95))), 0.0);\n  float hemi = 0.5 + 0.5 * N.y;\n  float rim = pow(max(1.0 - abs(dot(N, normalize(u_camera - a_position))), 0.0), 2.0);\n  float night = 0.105 + hemi * 0.105 + key * 0.46 + fill * 0.095 + rim * 0.17;\n  float show = 0.25 + hemi * 0.22 + key * 0.78 + fill * 0.20 + rim * 0.24;\n  v_light = mix(night, show, u_houseLights);\n  v_color = a_color;\n  v_fog = clamp(length(u_camera - a_position) / 330.0, 0.0, 1.0);\n}\n",
          "\nprecision highp float;\nuniform float u_exposure;\nvarying vec3 v_color;\nvarying float v_fog;\nvarying float v_light;\nvoid main() {\n  vec3 fog = mix(vec3(0.012, 0.015, 0.021), vec3(0.040, 0.046, 0.055), u_exposure * 0.45);\n  vec3 col = v_color * (v_light + 0.07);\n  col = mix(col, fog, v_fog * 0.52);\n  col += pow(max(v_color - vec3(0.46), vec3(0.0)), vec3(1.10)) * 0.16;\n  gl_FragColor = vec4(col * u_exposure, 1.0);\n}\n",
        ),
        screenProgram = makeProgram(
          gl,
          "\nattribute vec3 a_position;\nattribute vec2 a_uv;\nuniform mat4 u_viewProj;\nvarying vec2 v_uv;\nvoid main() {\n  v_uv = a_uv;\n  gl_Position = u_viewProj * vec4(a_position, 1.0);\n}\n",
          "\nprecision highp float;\nuniform sampler2D u_tex;\nuniform float u_exposure;\nvarying vec2 v_uv;\nvoid main() {\n  vec3 col = texture2D(u_tex, v_uv).rgb;\n  col = pow(col, vec3(0.85)) * 1.25;\n  gl_FragColor = vec4(col * u_exposure, 1.0);\n}\n",
        ),
        fireProgram = makeProgram(
          gl,
          "\nattribute vec3 a_origin;\nattribute vec3 a_axis;\nattribute vec2 a_local;\nattribute vec4 a_params;\nuniform mat4 u_viewProj;\nuniform float u_time;\nvarying vec2 v_local;\nvarying float v_heat;\nvarying float v_flicker;\nvoid main() {\n  float y = clamp(a_local.y, 0.0, 1.0);\n  float flicker = 0.78 + 0.15 * sin(u_time * 7.1 + a_params.z) + 0.09 * sin(u_time * 13.7 + a_params.z * 1.83);\n  float taper = mix(1.0, 0.16, y);\n  float sway = (sin(u_time * 3.0 + a_params.z) * 0.20 + sin(u_time * 8.9 + a_params.z * 0.41) * 0.07) * y;\n  vec3 pos = a_origin + a_axis * (a_local.x * a_params.x * taper + sway * 0.18);\n  pos += vec3(0.15 * sway, y * a_params.y * flicker, -0.24 * y * y);\n  gl_Position = u_viewProj * vec4(pos, 1.0);\n  v_local = a_local;\n  v_heat = a_params.w;\n  v_flicker = flicker;\n}\n",
          "\nprecision highp float;\nuniform float u_time;\nuniform float u_fade;\nvarying vec2 v_local;\nvarying float v_heat;\nvarying float v_flicker;\nfloat hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nvoid main() {\n  float y = clamp(v_local.y, 0.0, 1.0);\n  float edge = abs(v_local.x) + y * 0.30;\n  float body = (1.0 - smoothstep(0.18, 1.03, edge)) * smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.82, 1.02, y));\n  float lick = 0.72 + 0.28 * sin(u_time * 18.0 + v_local.x * 8.0 + y * 11.0 + v_heat * 5.0);\n  float grain = 0.78 + 0.22 * hash(gl_FragCoord.xy * 0.45 + vec2(floor(u_time * 22.0), v_heat * 31.0));\n  float core = (1.0 - smoothstep(0.0, 0.30, abs(v_local.x) + y * 0.12)) * (1.0 - smoothstep(0.45, 0.88, y));\n  float alpha = body * lick * grain * u_fade * (0.68 + 0.52 * v_heat);\n  if (alpha < 0.012) discard;\n  vec3 outer = vec3(0.96, 0.13, 0.015);\n  vec3 mid = vec3(1.00, 0.42, 0.035);\n  vec3 inner = vec3(1.00, 0.86, 0.30);\n  vec3 col = mix(outer, mid, smoothstep(0.12, 0.72, 1.0 - y));\n  col = mix(col, inner, core * 0.86);\n  col *= 1.12 + v_flicker * 0.34;\n  gl_FragColor = vec4(col, alpha);\n}\n",
        ),
        fogProgram = makeProgram(
          gl,
          "\nattribute vec3 a_position;\nattribute vec2 a_uv;\nattribute float a_alpha;\nuniform mat4 u_viewProj;\nvarying vec2 v_uv;\nvarying float v_alpha;\nvoid main() {\n  v_uv = a_uv;\n  v_alpha = a_alpha;\n  gl_Position = u_viewProj * vec4(a_position, 1.0);\n}\n",
          "\nprecision highp float;\nuniform float u_time;\nuniform float u_fade;\nvarying vec2 v_uv;\nvarying float v_alpha;\nfloat hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 27583.123); }\nvoid main() {\n  float r = length(v_uv);\n  float disk = 1.0 - smoothstep(0.58, 1.08, r);\n  float wisp = 0.78 + 0.22 * sin(v_uv.x * 9.0 + v_uv.y * 5.0 + u_time * 0.9);\n  float grain = 0.82 + 0.18 * hash(gl_FragCoord.xy * 0.18 + floor(u_time * 5.0));\n  float a = disk * wisp * grain * v_alpha * u_fade;\n  if (a < 0.01) discard;\n  gl_FragColor = vec4(0.0, 0.0, 0.0, a);\n}\n",
        ),
        bedroomOverlayProgram = makeProgram(
          gl,
          "\nattribute vec2 a_position;\nvarying vec2 v_uv;\nvoid main() {\n  v_uv = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}\n",
          "\nprecision mediump float;\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform sampler2D u_texEnv1;\nuniform float u_blink;\nuniform float u_wake;\nuniform float u_alpha;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution;\n  uv.y = 1.0 - uv.y;\n  float screenAspect = u_resolution.x / u_resolution.y;\n  float imgAspect = 1080.0 / 1920.0;\n  float visibleAspect = mix(imgAspect, 0.62, smoothstep(0.7, 2.0, screenAspect));\n  float panRangeX = mix(0.06, 0.10, smoothstep(0.7, 1.4, screenAspect));\n  float panRangeY = mix(0.06, 0.28, smoothstep(0.7, 1.4, screenAspect));\n  vec2 tuv;\n  if (screenAspect > visibleAspect) {\n    float scale = visibleAspect / screenAspect;\n    tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);\n  } else {\n    float scale = screenAspect / visibleAspect;\n    tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);\n  }\n  tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;\n  tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;\n  tuv = clamp(tuv, 0.0, 1.0);\n  vec4 room = texture2D(u_texEnv1, tuv);\n  vec3 col = room.rgb;\n  gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), u_alpha);\n}\n",
        ),
        hallucinationProgram = makeProgram(
          gl,
          "\nattribute vec2 a_position;\nvarying vec2 v_uv;\nvoid main() {\n  v_uv = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}\n",
          "\nprecision highp float;\nuniform vec2 u_resolution;\nuniform float u_time;\nuniform float u_trip;\nuniform float u_seed;\nvarying vec2 v_uv;\nfloat hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat noise(vec2 p){\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);\n}\nvoid main() {\n  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;\n  float r = length(uv);\n  float periph = smoothstep(0.30, 1.05, r);\n  float weave = noise(uv * (7.0 + u_trip * 5.0) + vec2(u_time * 0.06, -u_time * 0.04 + u_seed));\n  float grain = hash(gl_FragCoord.xy + floor(u_time * 20.0)) - 0.5;\n  float pulse = 0.65 + 0.35 * sin(u_time * 0.78 + u_seed);\n  vec3 col = mix(vec3(0.30, 0.04, 0.10), vec3(0.04, 0.20, 0.30), weave);\n  col += vec3(grain) * 0.10;\n  float a = periph * pulse * min(0.20, u_trip * 0.075);\n  gl_FragColor = vec4(col * a, a);\n}\n",
        ),
        data = (function () {
          const b = createBuilder(),
            concrete = [0.135, 0.13, 0.12],
            darkConcrete = [0.085, 0.084, 0.078],
            landingCol = [0.165, 0.153, 0.132],
            aisleCol = [0.145, 0.128, 0.1],
            stairFaceCol = [0.095, 0.088, 0.076],
            centerAisleCol = [0.112, 0.111, 0.105],
            centerLandingCol = [0.132, 0.13, 0.122],
            centerEdgeCol = [0.168, 0.165, 0.15],
            seatA = [0.055, 0.07, 0.092],
            seatB = [0.038, 0.048, 0.065],
            seatHi = [0.085, 0.102, 0.13],
            lawnCol = [0.035, 0.064, 0.031],
            black = [0.006, 0.007, 0.009],
            steel = [0.07, 0.074, 0.084],
            screenBack = [0.008, 0.009, 0.011];
          (b.box([-126, -1.4, -64], [126, -1.1, 340], [0.018, 0.019, 0.018]),
            b.box([-32, -1, -58], [-9, 2.4, -30], [0.075, 0.072, 0.068]),
            b.box([9, -1, -58], [32, 2.4, -30], [0.075, 0.072, 0.068]),
            b.box([-9, -1, -44.5], [9, 2.4, -30], [0.075, 0.072, 0.068]),
            b.box([-34, 2.4, -58], [-10, 3, -30], [0.115, 0.105, 0.086]),
            b.box([10, 2.4, -58], [34, 3, -30], [0.115, 0.105, 0.086]),
            b.box([-10, 2.4, -44.5], [10, 3, -30], [0.115, 0.105, 0.086]),
            b.box([-54, 1, -64], [-12, 46, -58], [0.045, 0.048, 0.056]),
            b.box([12, 1, -64], [54, 46, -58], [0.045, 0.048, 0.056]),
            b.box([-12, 11, -64], [12, 46, -58], [0.045, 0.048, 0.056]),
            b.box([-58, 46, -64], [58, 49, -30], steel),
            b.box([-58, 1, -64], [-54, 46, -58], steel),
            b.box([54, 1, -64], [58, 46, -58], steel),
            b.box([-52, 11, -57], [-33, 36, -56], screenBack),
            b.box([33, 11, -57], [52, 36, -56], screenBack));
          for (const sx of [-50, 50])
            for (let k = 0; k < 7; k++) {
              const ly = 50 - 2.4 * k;
              b.box(
                [sx - 2.2, ly - 1, -34],
                [sx + 2.2, ly + 1, -30],
                [0.01, 0.011, 0.013],
              );
            }
          (b.beam([-56, 42, -28], [56, 42, -28], 0.45, steel),
            b.beam([-56, 38, -22], [56, 38, -22], 0.36, steel));
          for (let k = 0; k < 9; k++) {
            const x0 = 1.22 * k - 42,
              y0 = 0.36 * k - 0.52;
            (b.box([x0, y0, -43.5], [x0 + 1.22, y0 + 0.34, -35], aisleCol),
              b.box(
                [x0, y0 - 0.28, -35.15],
                [x0 + 1.22, y0 + 0.04, -35],
                stairFaceCol,
              ));
          }
          function obox(c, side, up, fwd, hs, hu, hf, color) {
            function P(a, e, d) {
              return [
                c[0] + side[0] * a + up[0] * e + fwd[0] * d,
                c[1] + side[1] * a + up[1] * e + fwd[1] * d,
                c[2] + side[2] * a + up[2] * e + fwd[2] * d,
              ];
            }
            const p000 = P(-hs, -hu, -hf),
              p100 = P(hs, -hu, -hf),
              p110 = P(hs, hu, -hf),
              p010 = P(-hs, hu, -hf),
              p001 = P(-hs, -hu, hf),
              p101 = P(hs, -hu, hf),
              p111 = P(hs, hu, hf),
              p011 = P(-hs, hu, hf);
            (b.quad(p001, p101, p111, p011, color),
              b.quad(p100, p000, p010, p110, color),
              b.quad(p000, p001, p011, p010, color),
              b.quad(p101, p100, p110, p111, color),
              b.quad(p010, p011, p111, p110, color),
              b.quad(p000, p100, p101, p001, color));
          }
          const A = 1.18,
            sectionAisles = [-0.88, -0.58, -0.28, 0.28, 0.58, 0.88],
            UP = [0, 1, 0];
          function inCenterAisle(theta, radius) {
            const halfAngle = Math.asin(
              clamp(3.35 / Math.max(8, radius), 0.015, 0.42),
            );
            return Math.abs(theta) < halfAngle;
          }
          function isSeatBlock(theta, radius) {
            return (
              !inCenterAisle(theta, radius) &&
              !(function (theta, radius) {
                for (const aisleTheta of sectionAisles) {
                  const halfAngle = Math.asin(
                    clamp(2.2 / Math.max(8, radius), 0.012, 0.22),
                  );
                  if (Math.abs(theta - aisleTheta) < halfAngle) return !0;
                }
                return !1;
              })(theta, radius)
            );
          }
          function offset(c, axis, amount) {
            return [
              c[0] + axis[0] * amount,
              c[1] + axis[1] * amount,
              c[2] + axis[2] * amount,
            ];
          }
          function radialPoint(theta, radius, y) {
            return [
              0 + Math.sin(theta) * radius,
              y,
              Math.cos(theta) * radius - 6,
            ];
          }
          function buildRadialAisle(theta, r0, r1, y0, y1, width) {
            const tangent = [Math.cos(theta), 0, -Math.sin(theta)],
              a0 = radialPoint(theta, r0, y0),
              a1 = radialPoint(theta, r1, y1),
              half = 0.5 * width;
            (b.quad(
              offset(a0, tangent, -half),
              offset(a1, tangent, -half),
              offset(a1, tangent, half),
              offset(a0, tangent, half),
              aisleCol,
            ),
              b.beam(
                offset(a0, tangent, -half - 0.18),
                offset(a1, tangent, -half - 0.18),
                0.045,
                [0.12, 0.11, 0.09],
              ),
              b.beam(
                offset(a0, tangent, half + 0.18),
                offset(a1, tangent, half + 0.18),
                0.045,
                [0.12, 0.11, 0.09],
              ));
          }
          function buildCenterStep(R, tread, y, rise) {
            const z0 = -6 + R + 0.05,
              z1 = -6 + R + tread - 0.05;
            (b.box(
              [-3.35, y + 0.015, z0],
              [3.35, y + 0.11, z1],
              centerAisleCol,
            ),
              b.box(
                [-3.35, y - rise + 0.02, z0 - 0.06],
                [3.35, y + 0.04, z0 + 0.06],
                [0.078, 0.078, 0.074],
              ),
              b.box(
                [-3.35, y + 0.12, z0 + 0.08],
                [3.35, y + 0.17, z0 + 0.18],
                centerEdgeCol,
              ),
              b.box(
                [-3.59, y + 0.02, z0],
                [-3.37, y + 0.22, z1],
                [0.04, 0.04, 0.038],
              ),
              b.box(
                [3.37, y + 0.02, z0],
                [3.59, y + 0.22, z1],
                [0.04, 0.04, 0.038],
              ));
          }
          function buildCenterLanding(R, depth, y) {
            const z0 = -6 + R + 0.05,
              z1 = -6 + R + depth - 0.05;
            (b.box(
              [-3.35, y + 0.015, z0],
              [3.35, y + 0.11, z1],
              centerLandingCol,
            ),
              b.box(
                [-3.35, y + 0.12, z0 + 0.12],
                [3.35, y + 0.17, z0 + 0.26],
                centerEdgeCol,
              ),
              b.box(
                [-3.35, y + 0.12, z1 - 0.26],
                [3.35, y + 0.17, z1 - 0.12],
                centerEdgeCol,
              ));
          }
          function buildCenterHandrail(z0, z1, y0, y1) {
            for (const sx of [-1, 1]) {
              const x = 4.25 * sx;
              b.beam(
                [x, y0 + 1.35, z0],
                [x, y1 + 1.35, z1],
                0.055,
                [0.3, 0.28, 0.22],
              );
              for (let z = z0 + 1.5; z < z1 - 0.5; z += 8.5) {
                const yy = mix(y0, y1, (z - z0) / Math.max(1, z1 - z0));
                b.box(
                  [x - 0.06, yy + 0.05, z - 0.06],
                  [x + 0.06, yy + 1.35, z + 0.06],
                  [0.11, 0.1, 0.08],
                );
              }
            }
          }
          function buildArcRow(R, tread, y, rise, color, putSeats, riserCol) {
            const rc = riserCol || [0.1, 0.1, 0.11];
            for (let s = 0; s < 84; s++) {
              const t0 = (s / 84) * 2 * A - A,
                t1 = ((s + 1) / 84) * 2 * A - A;
              if (!isSeatBlock(0.5 * (t0 + t1), R + 0.5 * tread)) continue;
              const i0 = [0 + Math.sin(t0) * R, y, Math.cos(t0) * R - 6],
                o0 = [
                  0 + Math.sin(t0) * (R + tread),
                  y,
                  Math.cos(t0) * (R + tread) - 6,
                ],
                i1 = [0 + Math.sin(t1) * R, y, Math.cos(t1) * R - 6],
                o1 = [
                  0 + Math.sin(t1) * (R + tread),
                  y,
                  Math.cos(t1) * (R + tread) - 6,
                ];
              b.quad(i0, o0, o1, i1, color);
              const ib0 = [i0[0], y - rise, i0[2]],
                ib1 = [i1[0], y - rise, i1[2]];
              b.quad(ib0, i0, i1, ib1, rc);
            }
            if (!putSeats) return;
            const Rs = R + 0.5 * tread,
              count = Math.max(
                8,
                Math.min(240, Math.floor((2 * Rs * A) / 0.66)),
              );
            for (let i = 0; i < count; i++) {
              const th = ((i + 0.5) / count) * 2 * A - A;
              if (!isSeatBlock(th, Rs)) continue;
              const st = Math.sin(th),
                ct = Math.cos(th),
                px = 0 + st * Rs,
                pz = ct * Rs - 6,
                fwd = [-st, 0, -ct],
                side = [ct, 0, -st],
                code = Math.floor(1.3 * px) + Math.floor(1.3 * pz) + i,
                col = code % 4 == 0 ? seatB : code % 5 == 0 ? seatHi : seatA,
                backUp = norm([-0.22 * fwd[0], 1, -0.22 * fwd[2]]),
                pan = offset([px, y + 0.28, pz], fwd, 0.06);
              (obox(
                offset([px, y + 0.58, pz], fwd, -0.26),
                side,
                backUp,
                fwd,
                0.36,
                0.42,
                0.075,
                col,
              ),
                obox(pan, side, UP, fwd, 0.34, 0.075, 0.3, col),
                obox(
                  offset(pan, side, -0.42),
                  side,
                  UP,
                  fwd,
                  0.035,
                  0.115,
                  0.28,
                  [0.01, 0.011, 0.013],
                ),
                obox(
                  offset(pan, side, 0.42),
                  side,
                  UP,
                  fwd,
                  0.035,
                  0.115,
                  0.28,
                  [0.01, 0.011, 0.013],
                ));
            }
          }
          function buildArcLanding(R, depth, y, color) {
            for (let s = 0; s < 84; s++) {
              const t0 = (s / 84) * 2 * A - A,
                t1 = ((s + 1) / 84) * 2 * A - A;
              if (!isSeatBlock(0.5 * (t0 + t1), R + 0.5 * depth)) continue;
              const i0 = [0 + Math.sin(t0) * R, y, Math.cos(t0) * R - 6],
                o0 = [
                  0 + Math.sin(t0) * (R + depth),
                  y,
                  Math.cos(t0) * (R + depth) - 6,
                ],
                i1 = [0 + Math.sin(t1) * R, y, Math.cos(t1) * R - 6],
                o1 = [
                  0 + Math.sin(t1) * (R + depth),
                  y,
                  Math.cos(t1) * (R + depth) - 6,
                ];
              b.quad(i0, o0, o1, i1, color);
              const fb0 = [i0[0], y - 2.2, i0[2]],
                fb1 = [i1[0], y - 2.2, i1[2]];
              if ((b.quad(fb0, i0, i1, fb1, [0.16, 0.16, 0.17]), s % 4 == 0)) {
                const rx = 0 + Math.sin(t0) * (R + 0.5),
                  rz = Math.cos(t0) * (R + 0.5) - 6;
                b.quad(
                  [rx - 0.05, y, rz],
                  [rx + 0.05, y, rz],
                  [rx + 0.05, y + 1.05, rz],
                  [rx - 0.05, y + 1.05, rz],
                  steel,
                );
              }
            }
          }
          const tierPlan = [
            { rows: 14, rise: 0.3 },
            { rows: 13, rise: 0.42 },
            { rows: 12, rise: 0.54 },
            { rows: 12, rise: 0.66 },
            { rows: 11, rise: 0.8 },
            { rows: 10, rise: 0.96 },
            { rows: 10, rise: 1.12 },
          ];
          let R = 22,
            y = 0;
          for (let ti = 0; ti < tierPlan.length; ti++) {
            const p = tierPlan[ti],
              color = ti % 2 == 0 ? concrete : darkConcrete,
              tierStartR = R,
              tierStartY = y;
            for (let r = 0; r < p.rows; r++)
              ((y += p.rise),
                buildArcRow(R, 2.05, y, p.rise, color, !0),
                buildCenterStep(R, 2.05, y, p.rise),
                (R += 2.05));
            buildCenterHandrail(
              -6 + tierStartR,
              -6 + R,
              tierStartY + p.rise,
              y,
            );
            for (const theta of sectionAisles)
              buildRadialAisle(
                theta,
                tierStartR,
                R,
                tierStartY + p.rise + 0.04,
                y + 0.04,
                2.2 * 1.72,
              );
            if (ti < tierPlan.length - 1) {
              const landDepth = 9 + 1.6 * ti;
              ((y += 0.25),
                buildArcLanding(R, landDepth, y, landingCol),
                buildCenterLanding(R, landDepth, y));
              for (const theta of sectionAisles)
                buildRadialAisle(
                  theta,
                  R,
                  R + landDepth,
                  y + 0.05,
                  y + 0.05,
                  2.2 * 1.72,
                );
              R += landDepth;
            }
          }
          const Rback = R,
            backY = y,
            backZ = -6 + Rback,
            roofY = backY + 24;
          for (let lr = 0; lr < 12; lr++)
            buildArcRow(
              Rback + 4 + 4 * lr,
              4,
              backY + 0.5 * lr,
              0.5,
              lawnCol,
              !1,
              lawnCol,
            );
          for (const cr of [0.5 * Rback, 0.82 * Rback, Rback]) {
            const ncol = 10;
            for (let i = 0; i <= ncol; i++) {
              const th = (i / ncol) * 2 * A - A;
              if (inCenterAisle(th, cr)) continue;
              const cxp = 0 + Math.sin(th) * cr,
                czp = Math.cos(th) * cr - 6;
              b.box(
                [cxp - 0.8, -1, czp - 0.8],
                [cxp + 0.8, roofY, czp + 0.8],
                black,
              );
            }
          }
          const roofHW = Rback + 18;
          b.box(
            [-roofHW, roofY + 6, -70],
            [roofHW, roofY + 7.8, backZ + 30],
            [0.012, 0.014, 0.016],
          );
          for (let z = -60; z <= backZ + 24; z += 18) {
            (b.beam(
              [5 - roofHW, roofY + 5.5, z],
              [roofHW - 5, roofY + 5.5, z],
              0.5,
              steel,
            ),
              b.beam(
                [5 - roofHW, roofY - 2, z],
                [roofHW - 5, roofY - 2, z],
                0.7,
                steel,
              ));
            for (let x = 12 - roofHW; x <= roofHW - 12; x += 22)
              b.beam([x, roofY - 2, z], [x + 11, roofY + 5.5, z], 0.18, steel);
          }
          for (let x = 8 - roofHW; x <= roofHW - 8; x += 26)
            b.beam(
              [x, roofY + 3.5, -64],
              [x, roofY + 3.5, backZ + 25],
              0.3,
              steel,
            );
          for (const sx of [-46, 46])
            b.box(
              [sx - 5, roofY - 12, 60],
              [sx + 5, roofY - 4, 66],
              [0.006, 0.007, 0.01],
            );
          const tunnelEndZ = backZ + 24,
            tunnelStartZ = backZ + 150,
            // hallway proper: ~12 units long, just enough to read as a
            // hall and present the bedroom-POV moment + turn-right.
            // entry-cam sits inside it; far end opens out (camera never
            // walks past tunnelStartZ headed away from the stage).
            hallBackZ = tunnelStartZ + 12,
            tunnelEntryZ = tunnelStartZ + 6,
            tunnelFloorY = backY + 0.02,
            tunnelCeilY = tunnelFloorY + 5,
            bowlHalfFloor = 3.35,
            bowlHalfWall = 3.9,
            tunnelHalfFloor = 1.65,
            tunnelHalfWall = 1.95,
            throatFloorY = tunnelFloorY + 0.1,
            floorSlabCol = centerLandingCol,
            floorUnderCol = [0.046, 0.048, 0.052],
            wallInnerCol = [0.02, 0.022, 0.027],
            wallOuterCol = [0.014, 0.016, 0.02],
            ceilCol = [0.015, 0.017, 0.021],
            N_THROAT = 10;
          (theaterEntryCameraZ = tunnelStartZ),
            (theaterTunnelInnerZ = tunnelEndZ + 10),
            (theaterTunnelMouthZ = tunnelStartZ),
            (theaterTunnelFloorY = tunnelFloorY),
            (theaterTunnelCeilY = tunnelCeilY),
            (theaterTunnelHalfFloor = tunnelHalfFloor),
            (theaterTunnelHalfWall = tunnelHalfWall);
          // threshold curb at the theater rim — keeps the centerEdge accent
          b.box(
            [-bowlHalfFloor, throatFloorY + 0.01, backZ + 0.2],
            [bowlHalfFloor, throatFloorY + 0.06, backZ + 0.38],
            centerEdgeCol,
          );
          // flared throat: trapezoidal segments easing center landing out to
          // the full-width tunnel cross-section so floor, walls, and ceiling
          // meet the theater rim without a step or gap
          for (let i = 0; i < N_THROAT; i++) {
            const t0 = i / N_THROAT,
              t1 = (i + 1) / N_THROAT,
              s0 = smoothstep(0, 1, t0),
              s1 = smoothstep(0, 1, t1),
              z0 = mix(backZ, tunnelEndZ, t0),
              z1 = mix(backZ, tunnelEndZ, t1),
              fhw0 = mix(bowlHalfFloor, tunnelHalfFloor, s0),
              fhw1 = mix(bowlHalfFloor, tunnelHalfFloor, s1),
              whw0 = mix(bowlHalfWall, tunnelHalfWall, s0),
              whw1 = mix(bowlHalfWall, tunnelHalfWall, s1),
              fy0 = mix(throatFloorY, tunnelFloorY, s0),
              fy1 = mix(throatFloorY, tunnelFloorY, s1),
              fb0 = fy0 - 0.28,
              fb1 = fy1 - 0.28;
            // floor top (normal up)
            b.quad(
              [-fhw0, fy0, z0],
              [fhw0, fy0, z0],
              [fhw1, fy1, z1],
              [-fhw1, fy1, z1],
              floorSlabCol,
            );
            // floor underside (normal down)
            b.quad(
              [-fhw1, fb1, z1],
              [fhw1, fb1, z1],
              [fhw0, fb0, z0],
              [-fhw0, fb0, z0],
              floorUnderCol,
            );
            // floor sloped sides
            b.quad(
              [-fhw0, fy0, z0],
              [-fhw1, fy1, z1],
              [-fhw1, fb1, z1],
              [-fhw0, fb0, z0],
              floorUnderCol,
            );
            b.quad(
              [fhw0, fb0, z0],
              [fhw1, fb1, z1],
              [fhw1, fy1, z1],
              [fhw0, fy0, z0],
              floorUnderCol,
            );
            // left wall — inner face (normal +x)
            b.quad(
              [-fhw0, fy0, z0],
              [-fhw1, fy1, z1],
              [-fhw1, tunnelCeilY, z1],
              [-fhw0, tunnelCeilY, z0],
              wallInnerCol,
            );
            // left wall — outer face (normal -x)
            b.quad(
              [-whw0, tunnelCeilY, z0],
              [-whw1, tunnelCeilY, z1],
              [-whw1, fb1, z1],
              [-whw0, fb0, z0],
              wallOuterCol,
            );
            // left wall — top cap (closes seam under ceiling)
            b.quad(
              [-whw0, tunnelCeilY, z0],
              [-fhw0, tunnelCeilY, z0],
              [-fhw1, tunnelCeilY, z1],
              [-whw1, tunnelCeilY, z1],
              wallInnerCol,
            );
            // right wall — inner face (normal -x)
            b.quad(
              [fhw0, tunnelCeilY, z0],
              [fhw1, tunnelCeilY, z1],
              [fhw1, fy1, z1],
              [fhw0, fy0, z0],
              wallInnerCol,
            );
            // right wall — outer face (normal +x)
            b.quad(
              [whw0, fb0, z0],
              [whw1, fb1, z1],
              [whw1, tunnelCeilY, z1],
              [whw0, tunnelCeilY, z0],
              wallOuterCol,
            );
            // right wall — top cap
            b.quad(
              [fhw0, tunnelCeilY, z0],
              [whw0, tunnelCeilY, z0],
              [whw1, tunnelCeilY, z1],
              [fhw1, tunnelCeilY, z1],
              wallInnerCol,
            );
          }
          b.box(
            [-tunnelHalfFloor, tunnelFloorY - 0.28, tunnelEndZ],
            [tunnelHalfFloor, tunnelFloorY, tunnelStartZ],
            floorUnderCol,
          );
          b.box(
            [-tunnelHalfWall, tunnelFloorY, tunnelEndZ],
            [-tunnelHalfFloor, tunnelCeilY, tunnelStartZ],
            wallInnerCol,
          );
          b.box(
            [tunnelHalfFloor, tunnelFloorY, tunnelEndZ],
            [tunnelHalfWall, tunnelCeilY, tunnelStartZ],
            wallInnerCol,
          );
          b.box(
            [-tunnelHalfWall, tunnelCeilY, tunnelEndZ],
            [tunnelHalfWall, tunnelCeilY + 0.42, tunnelStartZ],
            ceilCol,
          );
          // Hallway phase is rendered via zone2_hallway GLSL shader (see hallway
          // phase logic in the render loop). No 3-D geometry hall needed here.
          for (let z = backZ + 6; z < tunnelStartZ - 8; z += 13.5)
            (b.beam(
              [-(tunnelHalfWall - 0.12), tunnelCeilY - 0.2, z],
              [tunnelHalfWall - 0.12, tunnelCeilY - 0.2, z],
              0.08,
              [0.22, 0.2, 0.14],
            ),
              b.box(
                [-0.45, tunnelCeilY - 0.34, z - 0.14],
                [0.45, tunnelCeilY - 0.18, z + 0.14],
                [0.8, 0.66, 0.34],
              ));
          return (
            b.beam(
              [-(tunnelHalfFloor - 0.7), tunnelFloorY + 1, tunnelEndZ + 4],
              [-(tunnelHalfFloor - 0.7), tunnelFloorY + 1, tunnelStartZ - 4],
              0.055,
              [0.19, 0.17, 0.12],
            ),
            b.beam(
              [tunnelHalfFloor - 0.7, tunnelFloorY + 1, tunnelEndZ + 4],
              [tunnelHalfFloor - 0.7, tunnelFloorY + 1, tunnelStartZ - 4],
              0.055,
              [0.19, 0.17, 0.12],
            ),
            new Float32Array(b.data)
          );
        })(),
        buffer = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, buffer),
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW));
      const escapeData = (function () {
          const b = createBuilder(),
            CAB_HALF = 11.0,
            CAB_R = 1.72,
            CAB_FLOOR_Y = -0.82,
            CAB_AISLE_W = 0.32,
            CAB_SEAT_PITCH = 0.79,
            ROW_START = -9.2,
            Z_SCALE = 1.45,
            R_SCALE = 2.25,
            pitch = 0.5235987756,
            fwd = norm([0, -Math.sin(pitch), -Math.cos(pitch)]),
            right = norm(cross(fwd, [0, 1, 0])),
            up = norm(cross(right, fwd)),
            mouth = [0, 7.35, -47.0],
            center = [
              mouth[0] + fwd[0] * CAB_HALF * Z_SCALE,
              mouth[1] + fwd[1] * CAB_HALF * Z_SCALE,
              mouth[2] + fwd[2] * CAB_HALF * Z_SCALE,
            ],
            shell = [0.55, 0.57, 0.57],
            shellLight = [0.74, 0.75, 0.72],
            soot = [0.025, 0.024, 0.023],
            black = [0.006, 0.006, 0.007],
            floorCol = [0.14, 0.14, 0.16],
            seatCol = [0.12, 0.14, 0.28],
            binCol = [0.22, 0.23, 0.25],
            rimCol = [0.02, 0.02, 0.021],
            scorch = [0.014, 0.012, 0.01],
            ember = [0.9, 0.12, 0.018],
            ringSteps = 46,
            zSteps = 28;
          function W(x, y, z) {
            return [
              center[0] + right[0] * x * R_SCALE + up[0] * y * R_SCALE + fwd[0] * z * Z_SCALE,
              center[1] + right[1] * x * R_SCALE + up[1] * y * R_SCALE + fwd[1] * z * Z_SCALE,
              center[2] + right[2] * x * R_SCALE + up[2] * y * R_SCALE + fwd[2] * z * Z_SCALE,
            ];
          }
          function P(z, a, r) {
            const rr = CAB_R * (r || 1);
            return W(Math.cos(a) * rr, Math.sin(a) * rr, z);
          }
          function shellColor(z, a) {
            const row = Math.abs(Math.sin((z + CAB_HALF) * 1.76)) > 0.985 ? 0.1 : 0,
              belly = smoothstep(-0.12, -0.9, Math.sin(a)),
              mouthSoot = (1 - smoothstep(-10.85, -8.9, z)) * smoothstep(-0.2, -0.95, Math.sin(a)),
              k = clamp(row + belly * 0.18 + mouthSoot * 0.82, 0, 1);
            return [
              mix(shellLight[0], soot[0], k),
              mix(shellLight[1], soot[1], k),
              mix(shellLight[2], soot[2], k),
            ];
          }
          function addLocalBox(cx, cy, cz, hx, hy, hz, color) {
            const p000 = W(cx - hx, cy - hy, cz - hz),
              p100 = W(cx + hx, cy - hy, cz - hz),
              p110 = W(cx + hx, cy + hy, cz - hz),
              p010 = W(cx - hx, cy + hy, cz - hz),
              p001 = W(cx - hx, cy - hy, cz + hz),
              p101 = W(cx + hx, cy - hy, cz + hz),
              p111 = W(cx + hx, cy + hy, cz + hz),
              p011 = W(cx - hx, cy + hy, cz + hz);
            b.quad(p001, p101, p111, p011, color);
            b.quad(p100, p000, p010, p110, color);
            b.quad(p000, p001, p011, p010, color);
            b.quad(p101, p100, p110, p111, color);
            b.quad(p010, p011, p111, p110, color);
            b.quad(p000, p100, p101, p001, color);
          }
          function addRing(z, radius, color, scale) {
            for (let i = 0; i < ringSteps; i++) {
              const a0 = (i / ringSteps) * 6.283185307,
                a1 = ((i + 1) / ringSteps) * 6.283185307;
              b.beam(P(z, a0, scale || 1), P(z, a1, scale || 1), radius, color);
            }
          }
          function addStageDamage() {
            b.box([-15.0, 2.86, -78.0], [-9.4, 3.08, -44.8], scorch);
            b.box([9.4, 2.86, -78.0], [15.0, 3.08, -44.8], scorch);
            b.box([-9.4, 2.86, -44.8], [9.4, 3.08, -38.8], scorch);
            b.box([-10.8, 3.05, -72.8], [-8.8, 3.2, -50.0], [0.026, 0.022, 0.019]);
            b.box([8.8, 3.05, -72.8], [10.8, 3.2, -50.0], [0.026, 0.022, 0.019]);
            b.box([-8.8, 3.05, -50.0], [8.8, 3.2, -44.8], [0.026, 0.022, 0.019]);
            for (let i = 0; i < 34; i++) {
              const a = i * 2.399963229,
                r = 1.3 + (i % 9) * 0.58,
                x = Math.cos(a) * r * 1.7,
                z = -60.4 + Math.sin(a) * (4.4 + (i % 6) * 1.0),
                p0 = [x, 3.21, z],
                p1 = [x + Math.cos(a + 0.45) * (0.8 + 0.25 * (i % 3)), 3.24, z + Math.sin(a + 0.45) * (0.8 + 0.18 * (i % 4))];
              b.beam(p0, p1, 0.043, 0 == i % 6 ? ember : [0.27, 0.27, 0.26]);
            }
          }
          function addShell() {
            for (let s = 0; s < zSteps; s++) {
              const z0 = mix(-CAB_HALF, CAB_HALF, s / zSteps),
                z1 = mix(-CAB_HALF, CAB_HALF, (s + 1) / zSteps),
                zm = 0.5 * (z0 + z1);
              for (let i = 0; i < ringSteps; i++) {
                const a0 = (i / ringSteps) * 6.283185307,
                  a1 = ((i + 1) / ringSteps) * 6.283185307,
                  am = 0.5 * (a0 + a1);
                b.quad(P(z0, a0, 1), P(z1, a0, 1), P(z1, a1, 1), P(z0, a1, 1), shellColor(zm, am));
              }
            }
            addRing(-CAB_HALF, 0.11, rimCol, 1.01);
            addRing(-CAB_HALF + 0.28, 0.026, [0.2, 0.2, 0.2], 0.87);
            for (let i = 0; i < ringSteps; i += 3) {
              const a = (i / ringSteps) * 6.283185307,
                tear = 0.2 + 0.11 * ((i % 5) / 4);
              b.beam(P(-CAB_HALF, a, 1.02), P(-CAB_HALF + tear, a + 0.05 * Math.sin(i), 0.92), 0.03, i % 2 ? soot : [0.35, 0.35, 0.34]);
            }
          }
          function addInterior() {
            addLocalBox(0, CAB_FLOOR_Y - 0.045, -0.2, CAB_R - 0.42, 0.045, CAB_HALF - 1.25, floorCol);
            addLocalBox(-1.03, 0.72, -0.15, 0.22, 0.115, CAB_HALF - 2.8, binCol);
            addLocalBox(1.03, 0.72, -0.15, 0.22, 0.115, CAB_HALF - 2.8, binCol);
            addLocalBox(0, 0.25, CAB_HALF - 0.6, CAB_R * 0.94, CAB_R * 0.72, 0.05, [0.1, 0.12, 0.15]);
            for (let z = ROW_START; z < ROW_START + 15 * CAB_SEAT_PITCH; z += CAB_SEAT_PITCH) {
              if (Math.abs(z - (-11 + 1.8 + 13 * CAB_SEAT_PITCH)) < CAB_SEAT_PITCH * 2.2) continue;
              for (const x of [-CAB_AISLE_W - 0.69, -CAB_AISLE_W - 0.25, CAB_AISLE_W + 0.25, CAB_AISLE_W + 0.69]) {
                addLocalBox(x, CAB_FLOOR_Y + 0.24, z, 0.2, 0.045, 0.2, seatCol);
                addLocalBox(x, CAB_FLOOR_Y + 0.54, z - 0.2, 0.2, 0.24, 0.026, seatCol);
                addLocalBox(x, CAB_FLOOR_Y + 0.86, z - 0.2, 0.12, 0.07, 0.032, [0.1, 0.11, 0.2]);
              }
            }
            for (const z of [-1.8, 0.7, 3.2, 5.7]) addRing(z, 0.02, soot, 0.96);
          }
          function addWindowsAndSkinDetails() {
            for (const side of [-1, 1]) {
              const a = side < 0 ? Math.PI - 0.1 : 0.1;
              for (let z = ROW_START; z < ROW_START + 19 * CAB_SEAT_PITCH; z += CAB_SEAT_PITCH) {
                b.quad(P(z - 0.075, a - 0.055, 1.015), P(z + 0.075, a - 0.055, 1.015), P(z + 0.075, a + 0.055, 1.015), P(z - 0.075, a + 0.055, 1.015), [0.012, 0.016, 0.022]);
              }
            }
            for (const a of [Math.PI - 0.34, Math.PI + 0.34, -0.34, 0.34]) b.beam(P(-10.4, a, 1.01), P(8.5, a, 1.01), 0.012, shell);
            for (const z of [-8.8, -6.9, -5.0, -2.9, -0.7, 1.5, 3.6, 5.9, 8.0]) addRing(z, 0.009, [0.45, 0.46, 0.45], 1.006);
          }
          addStageDamage();
          addShell();
          addInterior();
          addWindowsAndSkinDetails();
          return new Float32Array(b.data);
        })(),
        escapeBuffer = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, escapeBuffer),
        gl.bufferData(gl.ARRAY_BUFFER, escapeData, gl.STATIC_DRAW));
      function makeFireData() {
        const CAB_HALF = 11.0,
          CAB_R = 1.72,
          Z_SCALE = 1.45,
          R_SCALE = 2.25,
          pitch = 0.5235987756,
          fwd = norm([0, -Math.sin(pitch), -Math.cos(pitch)]),
          right = norm(cross(fwd, [0, 1, 0])),
          up = norm(cross(right, fwd)),
          mouth = [0, 7.35, -47.0],
          center = [
            mouth[0] + fwd[0] * CAB_HALF * Z_SCALE,
            mouth[1] + fwd[1] * CAB_HALF * Z_SCALE,
            mouth[2] + fwd[2] * CAB_HALF * Z_SCALE,
          ],
          verts = [];
        function cabinW(x, y, z) {
          return [
            center[0] + right[0] * x * R_SCALE + up[0] * y * R_SCALE + fwd[0] * z * Z_SCALE,
            center[1] + right[1] * x * R_SCALE + up[1] * y * R_SCALE + fwd[1] * z * Z_SCALE,
            center[2] + right[2] * x * R_SCALE + up[2] * y * R_SCALE + fwd[2] * z * Z_SCALE,
          ];
        }
        function rnd(n) {
          const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
          return v - Math.floor(v);
        }
        function pushFlame(x, y, z, axisAngle, width, height, phase, heat) {
          const axis = [Math.cos(axisAngle), 0, Math.sin(axisAngle)],
            origin = [x, y, z],
            params = [width, height, phase, heat],
            local = [
              [-1, 0],
              [1, 0],
              [1, 1],
              [-1, 0],
              [1, 1],
              [-1, 1],
            ];
          for (const uv of local)
            verts.push(
              origin[0],
              origin[1],
              origin[2],
              axis[0],
              axis[1],
              axis[2],
              uv[0],
              uv[1],
              params[0],
              params[1],
              params[2],
              params[3],
            );
        }
        for (let i = 0; i < 150; i++) {
          const side = i % 2 ? -1 : 1,
            a = rnd(i + 1.7),
            b = rnd(i + 9.1),
            c = rnd(i + 17.4),
            band = i % 5,
            clear = 4.4 + 3.6 * c;
          let x, z, h, w, axisAngle;
          if (band < 3) {
            x = side * clear;
            z = -47.8 - 27.5 * a;
            h = 2.7 + 5.2 * b;
            w = 0.52 + 0.86 * c;
            axisAngle = band % 2 ? Math.PI * 0.5 : 0;
          } else if (band === 3) {
            x = side * (6.6 + 7.5 * a);
            z = -45.1 - 5.4 * b;
            h = 1.8 + 3.6 * c;
            w = 0.42 + 0.64 * a;
            axisAngle = 0.08 * side;
          } else {
            x = (a - 0.5) * 17.5;
            if (Math.abs(x) < 4.2) x += side * 4.2;
            z = -70.5 - 7.2 * b;
            h = 2.9 + 6.0 * c;
            w = 0.58 + 0.88 * a;
            axisAngle = Math.PI * (0.18 + 0.64 * b);
          }
          pushFlame(x, 3.16 + 0.34 * rnd(i + 22.0), z, axisAngle, w, h, i * 1.913 + c * 9.0, 0.74 + 0.44 * b);
        }
        for (let i = 0; i < 46; i++) {
          const side = i % 2 ? -1 : 1,
            r = rnd(i + 101.0),
            x = side * (3.9 + 2.8 * r),
            z = -45.4 - 3.4 * rnd(i + 118.0);
          pushFlame(x, 3.45 + 0.7 * rnd(i + 133.0), z, 0, 0.38 + 0.35 * r, 1.8 + 2.4 * rnd(i + 151.0), i * 2.31, 1.0);
        }
        for (let i = 0; i < 58; i++) {
          const side = i % 2 ? -1 : 1,
            a = rnd(i + 211.0),
            b = rnd(i + 223.0),
            localX = side * (0.54 + 0.70 * a),
            localZ = -10.2 + 8.7 * rnd(i + 239.0),
            base = cabinW(localX, -0.72 + 0.12 * b, localZ);
          pushFlame(
            base[0],
            base[1],
            base[2],
            Math.PI * (0.15 + 0.7 * a),
            0.34 + 0.42 * rnd(i + 251.0),
            1.45 + 2.9 * rnd(i + 263.0),
            i * 2.07 + b * 6.0,
            0.86 + 0.38 * b,
          );
        }
        return new Float32Array(verts);
      }
      const fireData = makeFireData(),
        fireBuffer = gl.createBuffer(),
        fireVertexCount = fireData.length / 12;
      (gl.bindBuffer(gl.ARRAY_BUFFER, fireBuffer),
        gl.bufferData(gl.ARRAY_BUFFER, fireData, gl.STATIC_DRAW));
      function makeCabinFogData() {
        const CAB_HALF = 11.0,
          CAB_R = 1.72,
          Z_SCALE = 1.45,
          R_SCALE = 2.25,
          pitch = 0.5235987756,
          fwd = norm([0, -Math.sin(pitch), -Math.cos(pitch)]),
          right = norm(cross(fwd, [0, 1, 0])),
          up = norm(cross(right, fwd)),
          mouth = [0, 7.35, -47.0],
          center = [
            mouth[0] + fwd[0] * CAB_HALF * Z_SCALE,
            mouth[1] + fwd[1] * CAB_HALF * Z_SCALE,
            mouth[2] + fwd[2] * CAB_HALF * Z_SCALE,
          ],
          verts = [];
        function W(x, y, z) {
          return [
            center[0] + right[0] * x * R_SCALE + up[0] * y * R_SCALE + fwd[0] * z * Z_SCALE,
            center[1] + right[1] * x * R_SCALE + up[1] * y * R_SCALE + fwd[1] * z * Z_SCALE,
            center[2] + right[2] * x * R_SCALE + up[2] * y * R_SCALE + fwd[2] * z * Z_SCALE,
          ];
        }
        function pushFog(z, radius, alpha) {
          const local = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, -1],
            [1, 1],
            [-1, 1],
          ];
          for (const uv of local) {
            const p = W(uv[0] * radius, uv[1] * radius, z);
            verts.push(p[0], p[1], p[2], uv[0], uv[1], alpha);
          }
        }
        for (let i = 0; i < 24; i++) {
          const t = i / 23,
            z = mix(-8.9, 8.4, t),
            alpha = mix(0.08, 0.64, smoothstep(0.12, 0.72, t));
          pushFog(z, CAB_R * mix(0.72, 1.04, smoothstep(0, 1, t)), alpha);
        }
        for (const z of [-5.8, -3.4, -0.8, 1.8]) pushFog(z, CAB_R * 1.08, 0.32);
        return new Float32Array(verts);
      }
      const fogData = makeCabinFogData(),
        fogBuffer = gl.createBuffer(),
        fogVertexCount = fogData.length / 6;
      (gl.bindBuffer(gl.ARRAY_BUFFER, fogBuffer),
        gl.bufferData(gl.ARRAY_BUFFER, fogData, gl.STATIC_DRAW));
      const locPos = gl.getAttribLocation(program, "a_position"),
        locNormal = gl.getAttribLocation(program, "a_normal"),
        locColor = gl.getAttribLocation(program, "a_color"),
        locViewProj = gl.getUniformLocation(program, "u_viewProj"),
        locCamera = gl.getUniformLocation(program, "u_camera"),
        locHouseLights = gl.getUniformLocation(program, "u_houseLights"),
        locExposure = gl.getUniformLocation(program, "u_exposure"),
        screenData = new Float32Array([
          -52, 11, -55.82, 0, 0, -33, 11, -55.82, 1, 0, -33, 36, -55.82, 1, 1,
          -52, 11, -55.82, 0, 0, -33, 36, -55.82, 1, 1, -52, 36, -55.82, 0, 1,
          33, 11, -55.82, 0, 0, 52, 11, -55.82, 1, 0, 52, 36, -55.82, 1, 1, 33,
          11, -55.82, 0, 0, 52, 36, -55.82, 1, 1, 33, 36, -55.82, 0, 1,
        ]),
        screenBuffer = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer),
        gl.bufferData(gl.ARRAY_BUFFER, screenData, gl.STATIC_DRAW));
      const hallucinationBuffer = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ));
      // ─── Z2 Hallway Phase (theater route entry) ──────────────────────────
      // Duplicate the Z2 hallway camera path here: start at the intersection,
      // walk south to the normal BACK.png plane, then continue into theater.
      const HALL_PHASE_START_Z = 2.4,
        HALL_PHASE_EXIT_Z = -3.4,
        HALL_PHASE_YAW = Math.PI, // facing south
        HALL_PHASE_SPEED = 1.2;
      const STAGE_ESCAPE_PROGRESS = 0.95,
        CRASH_TURN_PROGRESS = 1.05,
        CRASH_ENTRY_PROGRESS = 1.12,
        THEATER_ROUTE_MAX_PROGRESS = 1,
        POST_CRASH_ROUTE_MAX_PROGRESS = 1.28,
        CABIN_FOG_HANDOFF_PROGRESS = 1.235,
        CRASH_TURN_GATE_EPS = 0.0015,
        ESCAPE_RED_FADE_SECONDS = 3.2;
      const hallwayProgram = (function () {
        if (!window.GLSL || !window.GLSL.modules || !window.GLSL.modules.zone2_hallway)
          return null;
        try {
          // South face is transparent — the 3D theater tunnel renders behind the
          // hallway overlay. Hallway walls/floor/ceiling stay opaque (alpha=1).
          let src = window.GLSL.modules.zone2_hallway;
          src = src.replace(
            '  vec3 finalCol = hallTex.rgb;',
            `  // South-face: transparent — 3D theater shows through.
  if (wallID == 3.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }
  vec3 finalCol = hallTex.rgb;`
          );
          return makeProgram(
            gl,
            "attribute vec2 a_position;\nvoid main(){gl_Position=vec4(a_position,0.0,1.0);}",
            src,
          );
        } catch (e) {
          console.error("[mode-theater] hallway shader compile failed:", e);
          return null;
        }
      })();
      const texHallFront = makeStaticTexture("files/img/rooms/z2/hallway/FORWARD-MASK.png"),
        texHallBack  = makeStaticTexture("files/img/rooms/z2/hallway/BACK.png"),
        texHallLeft  = makeStaticTexture("files/img/rooms/z2/hallway/LEFTWALL.png"),
        texHallRight = makeStaticTexture("files/img/rooms/z2/hallway/RIGHTWALL.png"),
        texHallTop   = makeStaticTexture("files/img/rooms/z2/hallway/TOP.png"),
        texHallFloor = makeStaticTexture("files/img/rooms/z2/hallway/GROUND.png"),
        texHallBlank = (function () {
          const t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          return t;
        })();
      if (hallwayProgram) {
        gl.useProgram(hallwayProgram);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texFront"), 0);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texBack"), 1);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texLeft"), 2);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texRight"), 3);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texTop"), 4);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texBottom"), 5);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_voidVid"), 6);
        gl.uniform1i(gl.getUniformLocation(hallwayProgram, "u_texDoorLeft"), 7);
        const _rLoc = gl.getUniformLocation(hallwayProgram, "u_texDoorRight");
        if (_rLoc !== null) gl.uniform1i(_rLoc, 7);
      }
      const hallLoc = hallwayProgram ? {
        pos:          gl.getAttribLocation(hallwayProgram, "a_position"),
        res:          gl.getUniformLocation(hallwayProgram, "u_resolution"),
        time:         gl.getUniformLocation(hallwayProgram, "u_time"),
        mouse:        gl.getUniformLocation(hallwayProgram, "u_mouse"),
        camZ:         gl.getUniformLocation(hallwayProgram, "u_camZ"),
        yawOffset:    gl.getUniformLocation(hallwayProgram, "u_yawOffset"),
        blink:        gl.getUniformLocation(hallwayProgram, "u_blink"),
        shake:        gl.getUniformLocation(hallwayProgram, "u_shake"),
        isWalking:    gl.getUniformLocation(hallwayProgram, "u_isWalking"),
        trip:         gl.getUniformLocation(hallwayProgram, "u_trip"),
        framedKitchen: gl.getUniformLocation(hallwayProgram, "u_framedKitchen"),
      } : null;
      // ─────────────────────────────────────────────────────────────────────
      const locHallucinationPos = gl.getAttribLocation(
          hallucinationProgram,
          "a_position",
        ),
        locHallucinationRes = gl.getUniformLocation(
          hallucinationProgram,
          "u_resolution",
        ),
        locHallucinationTime = gl.getUniformLocation(
          hallucinationProgram,
          "u_time",
        ),
        locHallucinationTrip = gl.getUniformLocation(
          hallucinationProgram,
          "u_trip",
        ),
        locHallucinationSeed = gl.getUniformLocation(
          hallucinationProgram,
          "u_seed",
        ),
        locScreenPos = gl.getAttribLocation(screenProgram, "a_position"),
        locScreenUv = gl.getAttribLocation(screenProgram, "a_uv"),
        locScreenViewProj = gl.getUniformLocation(screenProgram, "u_viewProj"),
        locScreenTex = gl.getUniformLocation(screenProgram, "u_tex"),
        locScreenExposure = gl.getUniformLocation(screenProgram, "u_exposure"),
        locFireOrigin = gl.getAttribLocation(fireProgram, "a_origin"),
        locFireAxis = gl.getAttribLocation(fireProgram, "a_axis"),
        locFireLocal = gl.getAttribLocation(fireProgram, "a_local"),
        locFireParams = gl.getAttribLocation(fireProgram, "a_params"),
        locFireViewProj = gl.getUniformLocation(fireProgram, "u_viewProj"),
        locFireTime = gl.getUniformLocation(fireProgram, "u_time"),
        locFireFade = gl.getUniformLocation(fireProgram, "u_fade"),
        locFogPos = gl.getAttribLocation(fogProgram, "a_position"),
        locFogUv = gl.getAttribLocation(fogProgram, "a_uv"),
        locFogAlpha = gl.getAttribLocation(fogProgram, "a_alpha"),
        locFogViewProj = gl.getUniformLocation(fogProgram, "u_viewProj"),
        locFogTime = gl.getUniformLocation(fogProgram, "u_time"),
        locFogFade = gl.getUniformLocation(fogProgram, "u_fade"),
        locBedroomPos = gl.getAttribLocation(bedroomOverlayProgram, "a_position"),
        locBedroomRes = gl.getUniformLocation(bedroomOverlayProgram, "u_resolution"),
        locBedroomMouse = gl.getUniformLocation(bedroomOverlayProgram, "u_mouse"),
        locBedroomTex = gl.getUniformLocation(bedroomOverlayProgram, "u_texEnv1"),
        locBedroomBlink = gl.getUniformLocation(bedroomOverlayProgram, "u_blink"),
        locBedroomWake = gl.getUniformLocation(bedroomOverlayProgram, "u_wake"),
        locBedroomAlpha = gl.getUniformLocation(bedroomOverlayProgram, "u_alpha");
      function makeMappedVideo(src) {
        let video = null;
        src
          ? ((video = document.createElement("video")),
            (video.src = src),
            (video.muted = !0),
            (video.loop = !0),
            (video.autoplay = !0),
            (video.playsInline = !0),
            (video.preload = "auto"),
            video.setAttribute("playsinline", ""),
            video.setAttribute("webkit-playsinline", ""),
            window.__registerVideo
              ? window.__registerVideo(video)
              : ((window.__ALL_VIDEOS = window.__ALL_VIDEOS || []),
                window.__ALL_VIDEOS.push(video)))
          : window.__claimMappedPoolVid &&
            (video = window.__claimMappedPoolVid());
        const play = video.play && video.play();
        return (play && play.catch && play.catch(() => {}), video);
      }
      const screenSources = (function () {
          const list = (window.MAPPED_VIDEOS || []).slice();
          for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)),
              tmp = list[i];
            ((list[i] = list[j]), (list[j] = tmp));
          }
          if (!list.length)
            return [
              "files/mov/mapped/crywolf.mp4",
              "files/mov/mapped/grate.mp4",
            ];
          const picked = [];
          for (let i = 0; i < 2; i++)
            picked.push("files/mov/mapped/" + list[i % list.length]);
          return picked;
        })(),
        screenVideos = [
          makeMappedVideo(screenSources[0]),
          makeMappedVideo(screenSources[1]),
        ],
        screenTextures = screenVideos.map(() => {
          const tex = gl.createTexture();
          return (
            gl.bindTexture(gl.TEXTURE_2D, tex),
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
              1,
              1,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              new Uint8Array([4, 4, 5, 255]),
            ),
            tex
          );
        }),
        jetBuffer = gl.createBuffer();
      let jetVertexCount = 0;
      (gl.enableVertexAttribArray(locPos),
        gl.vertexAttribPointer(locPos, 3, gl.FLOAT, !1, 36, 0),
        gl.enableVertexAttribArray(locNormal),
        gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, !1, 36, 12),
        gl.enableVertexAttribArray(locColor),
        gl.vertexAttribPointer(locColor, 3, gl.FLOAT, !1, 36, 24));
      const state = {
        progress: 0,
        space: !!(options && options.walkHeld),
        lookX: 0,
        lookY: 0,
        targetLookX: 0,
        targetLookY: 0,
        forwardKeys: {
          Space: !!(options && options.walkHeld),
          ArrowUp: !1,
          KeyW: !1,
          KeyK: !1,
        },
        walkPointerId: null,
        carryWalk: !!(options && options.touchHeld),
        blinkClock: 0,
        stageActive: !1,
        stageStartBlinkIndex: 0,
        stageBeat: 0,
        impactOutcome: "",
        escapeActive: !1,
        escapeImpactCamera: null,
        handoffDone: !1,
        handoffTransitioning: !1,
        last: performance.now(),
        routeDir: 1,
        turnYaw: 0,
        turnYawTarget: 0,
        lastTurnSign: 1,
        crashTurned: !1,
        crashTurn: 0,
        // hallway phase (theater route from Z2)
        hallPhase: !!(options && options.fromZone2),
        hallCamZ: HALL_PHASE_START_Z,
        hallWakeIn: 0,
      };
      function atCrashTurnGate() {
        return (
          state.escapeActive &&
          !state.crashTurned &&
          state.progress >= CRASH_TURN_PROGRESS - CRASH_TURN_GATE_EPS
        );
      }
      function canTurnAround() {
        if (state.escapeActive) return atCrashTurnGate();
        if (state.hallPhase)
          return (
            !state.handoffDone &&
            state.hallCamZ < HALL_PHASE_START_Z - 0.01
          );
        return (
          !state.handoffDone &&
          state.impactOutcome !== "escaped-red" &&
          state.progress > 0.002
        );
      }
      function turnAround(sign) {
        if (atCrashTurnGate()) {
          if (sign < 0) {
            ((state.crashTurned = !0),
              (state.routeDir = 1));
            updateTheaterNav();
          }
          return;
        }
        if (!canTurnAround()) return;
        const turnSign = sign < 0 ? -1 : 1;
        ((state.lastTurnSign = turnSign),
          (state.turnYawTarget += turnSign * Math.PI),
          (state.routeDir = -state.routeDir),
          updateTheaterNav());
      }
      function updateTheaterNav() {
        const canControl =
            (!state.handoffDone || state.handoffTransitioning) &&
            state.impactOutcome !== "escaped-red",
          blockedAtCrashGate =
            state.escapeActive &&
            state.routeDir > 0 &&
            state.progress >= CRASH_TURN_PROGRESS - CRASH_TURN_GATE_EPS &&
            (!state.crashTurned || state.crashTurn < 0.985),
          canWalk =
            canControl &&
            !blockedAtCrashGate &&
            (state.hallPhase ||
              (state.routeDir > 0
                ? state.progress <
                  (state.escapeActive
                    ? POST_CRASH_ROUTE_MAX_PROGRESS
                    : THEATER_ROUTE_MAX_PROGRESS)
                : state.progress > 0.002));
        window.__modeTheaterNav = {
          forward: canWalk,
          back: canControl && canTurnAround(),
          hallPhase: !!state.hallPhase,
          escapeActive: !!state.escapeActive,
          turnLeft: canControl && atCrashTurnGate(),
          progress: state.progress,
          routeDir: state.routeDir,
        };
      }
      updateTheaterNav();
      function theaterLeftKey(event) {
        return (
          event &&
          ("ArrowLeft" === event.code ||
            "KeyA" === event.code ||
            "KeyH" === event.code)
        );
      }
      function theaterRightKey(event) {
        return (
          event &&
          ("ArrowRight" === event.code ||
            "KeyD" === event.code ||
            "KeyL" === event.code)
        );
      }
      function theaterForwardKey(event) {
        return !!(event && event.code in state.forwardKeys);
      }
      function syncTheaterForward() {
        state.space =
          state.forwardKeys.Space ||
          state.forwardKeys.ArrowUp ||
          state.forwardKeys.KeyW ||
          state.forwardKeys.KeyK ||
          !!state.carryWalk ||
          "number" == typeof state.walkPointerId;
      }
      function setTheaterForward(event, held) {
        if (!theaterForwardKey(event)) return !1;
        state.forwardKeys[event.code] = held;
        syncTheaterForward();
        return !0;
      }
      syncTheaterForward();
      updateTheaterNav();
      function release(event) {
        if (
          "number" == typeof state.walkPointerId &&
          (!event || event.pointerId === state.walkPointerId)
        )
          state.walkPointerId = null;
        state.carryWalk && (state.carryWalk = !1);
        syncTheaterForward();
      }
      function isWalkPointer(event) {
        return (
          "function" == typeof window.__mobileWalkZoneContains &&
          window.__mobileWalkZoneContains(event.clientX, event.clientY)
        );
      }
      (window.addEventListener(
        "keydown",
        (event) => {
          if (disposed) return;
          if (theaterLeftKey(event) || theaterRightKey(event)) {
            event.preventDefault();
            event.stopPropagation();
            event.repeat || turnAround(theaterLeftKey(event) ? -1 : 1);
            return;
          }
          if (setTheaterForward(event, !0)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        { passive: !1, capture: !0 },
      ),
        window.addEventListener(
        "keyup",
        (event) => {
          if (disposed) return;
          if (setTheaterForward(event, !1)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
          { passive: !1, capture: !0 },
        ),
        canvas.addEventListener(
          "pointerdown",
          (event) => {
            if (disposed) return;
            if (!isWalkPointer(event)) return;
            (event.preventDefault(),
              (state.walkPointerId = event.pointerId),
              syncTheaterForward(),
              canvas.setPointerCapture(event.pointerId));
          },
          { passive: !1 },
        ),
        canvas.addEventListener(
          "pointermove",
          (event) => {
            if (disposed) return;
            if (event.pointerId === state.walkPointerId)
              return void (
                event.preventDefault(),
                ((state.walkPointerId = isWalkPointer(event)
                  ? event.pointerId
                  : null),
                syncTheaterForward())
              );
            event.preventDefault();
            // Free mouse-look identical to engine1: cursor position drives look
            // directly, no click required. Mouse-right/up produce positive values.
            const w = window.innerWidth || 1,
              h = window.innerHeight || 1,
              nx = (event.clientX - w / 2) / (w / 2),
              ny = (h / 2 - event.clientY) / (h / 2);
            ((state.targetLookX = clamp(nx * 1.1, -1.1, 1.1)),
              (state.targetLookY = clamp(ny * 0.45, -0.45, 0.45)));
          },
          { passive: !1 },
        ),
        canvas.addEventListener("pointerup", release),
        canvas.addEventListener("pointercancel", release),
        canvas.addEventListener("lostpointercapture", release),
        window.addEventListener("pointerup", release),
        window.addEventListener("pointercancel", release));
      const aisleProfile = [
        [16, 0.3],
        [44.7, 4.2],
        [53.7, 4.45],
        [80.4, 9.91],
        [91, 10.16],
        [115.6, 16.64],
        [127.8, 16.89],
        [152.4, 24.81],
        [166.2, 25.06],
        [188.7, 33.86],
        [204.1, 34.11],
        [224.6, 43.71],
        [241.6, 43.96],
        [262.1, 55.16],
      ];
      function aisleYAtZ(z) {
        if (z <= aisleProfile[0][0]) return aisleProfile[0][1];
        for (let i = 1; i < aisleProfile.length; i++) {
          const prev = aisleProfile[i - 1],
            next = aisleProfile[i];
          if (z <= next[0])
            return mix(prev[1], next[1], (z - prev[0]) / (next[0] - prev[0]));
        }
        return aisleProfile[aisleProfile.length - 1][1];
      }
      function distance3(a, b) {
        return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }
      function descentXAt(t) {
        return mix(0, -1.45, smoothstep(0, 1, clamp(t / 0.22, 0, 1)));
      }
      function tunnelApproachEyeY(t, topLandingY) {
        const floorEyeY = theaterTunnelFloorY + 2.25,
          dip =
            0.38 *
            smoothstep(0.56, 0.74, t) *
            (1 - smoothstep(0.86, 1, t)),
          rise = smoothstep(0.68, 1, t);
        return mix(floorEyeY, topLandingY, rise) - dip;
      }
      function sampledApproachLength(topLandingY) {
        let total = 0,
          prev = [
            0,
            tunnelApproachEyeY(0, topLandingY),
            theaterEntryCameraZ,
          ];
        for (let i = 1; i <= 48; i++) {
          const t = i / 48,
            p = [
              0,
              tunnelApproachEyeY(t, topLandingY),
              mix(theaterEntryCameraZ, theaterTunnelInnerZ, t),
            ];
          ((total += distance3(prev, p)), (prev = p));
        }
        return total;
      }
      function sampledDescentLength() {
        let total = 0,
          prev = [0, aisleYAtZ(262.1) + 2.25, 262.1];
        for (let i = 1; i <= 48; i++) {
          const t = i / 48,
            z = mix(262.1, -22, t),
            p = [descentXAt(t), aisleYAtZ(z) + 2.25, z];
          ((total += distance3(prev, p)), (prev = p));
        }
        return total;
      }
      function theaterRouteBreaks(stairBaseY, topLandingY) {
        const turnWeight = 5.5,
          weights = [
            sampledApproachLength(topLandingY),
            distance3(
              [0, topLandingY, theaterTunnelInnerZ],
              [0, topLandingY, 262.1],
            ),
            sampledDescentLength(),
            turnWeight,
            distance3([-1.45, stairBaseY, -22], [-43.25, stairBaseY, -22]),
            turnWeight,
            distance3([-43.25, stairBaseY, -22], [-43.25, stairBaseY, -39.25]),
            turnWeight,
            distance3([-43.25, stairBaseY, -39.25], [-31, 6.05, -39.25]),
            distance3([-31, 6.05, -39.25], [0, 6.05, -39.25]),
            turnWeight,
          ],
          total = weights.reduce((sum, weight) => sum + weight, 0);
        let acc = 0;
        return weights.map((weight) => ((acc += weight), acc / total));
      }
      function crashEntryCamera(progress, lookX, lookY, turnAmount) {
        const CAB_HALF = 11.0,
          Z_SCALE = 1.45,
          R_SCALE = 2.25,
          pitch = 0.5235987756,
          crashFwd = norm([0, -Math.sin(pitch), -Math.cos(pitch)]),
          cabinRight = norm(cross(crashFwd, [0, 1, 0])),
          cabinUp = norm(cross(cabinRight, crashFwd)),
          cabinMouth = [0, 7.35, -47.0],
          cabinCenter = [
            cabinMouth[0] + crashFwd[0] * CAB_HALF * Z_SCALE,
            cabinMouth[1] + crashFwd[1] * CAB_HALF * Z_SCALE,
            cabinMouth[2] + crashFwd[2] * CAB_HALF * Z_SCALE,
          ],
          flatTunnelDir = norm([0, -0.03, -1]),
          stageStart = [-22.7, 6.05, -39.25],
          frontHold = [0, 6.05, -39.25],
          mouthHold = cabinPoint(0, -0.05, -10.9),
          insideCabin = cabinPoint(0, -0.05, -1.6),
          p = clamp(progress, STAGE_ESCAPE_PROGRESS, POST_CRASH_ROUTE_MAX_PROGRESS),
          turn = smoothstep(0, 1, clamp(turnAmount || 0, 0, 1));
        function cabinPoint(x, y, z) {
          return [
            cabinCenter[0] +
              cabinRight[0] * x * R_SCALE +
              cabinUp[0] * y * R_SCALE +
              crashFwd[0] * z * Z_SCALE,
            cabinCenter[1] +
              cabinRight[1] * x * R_SCALE +
              cabinUp[1] * y * R_SCALE +
              crashFwd[1] * z * Z_SCALE,
            cabinCenter[2] +
              cabinRight[2] * x * R_SCALE +
              cabinUp[2] * y * R_SCALE +
              crashFwd[2] * z * Z_SCALE,
          ];
        }
        function cameraFrom(eye, dir, lookSideScale, lookUpScale) {
          const side = norm(cross(dir, [0, 1, 0])),
            d = norm(dir);
          return {
            eye: eye,
            target: [
              eye[0] + d[0] * 34 + side[0] * lookX * lookSideScale,
              eye[1] + d[1] * 34 + lookY * lookUpScale,
              eye[2] + d[2] * 34 + side[2] * lookX * lookSideScale,
            ],
            finalLook: 1,
          };
        }
        if (p <= CRASH_TURN_PROGRESS) {
          const t = smoothstep(
              0,
              1,
              (p - STAGE_ESCAPE_PROGRESS) /
                (CRASH_TURN_PROGRESS - STAGE_ESCAPE_PROGRESS),
            ),
            eye = [
              mix(stageStart[0], frontHold[0], t),
              mix(stageStart[1], frontHold[1], t),
              mix(stageStart[2], frontHold[2], t),
            ],
            stageDir = [1, -0.03, 0],
            dir = norm([
              mix(stageDir[0], flatTunnelDir[0], turn),
              mix(stageDir[1], flatTunnelDir[1], turn),
              mix(stageDir[2], flatTunnelDir[2], turn),
            ]);
          return cameraFrom(eye, dir, mix(12, 7, turn), mix(5, 2.4, turn));
        }
        if (p < CRASH_ENTRY_PROGRESS) {
          const t = smoothstep(
              0,
              1,
                (p - CRASH_TURN_PROGRESS) /
                (CRASH_ENTRY_PROGRESS - CRASH_TURN_PROGRESS),
            ),
            eye = [
              mix(frontHold[0], mouthHold[0], t),
              mix(frontHold[1], mouthHold[1], t),
              mix(frontHold[2], mouthHold[2], t),
            ];
          return cameraFrom(eye, flatTunnelDir, 7, 2.4);
        }
        {
          const t = smoothstep(
              0,
              1,
              (p - CRASH_ENTRY_PROGRESS) /
                (POST_CRASH_ROUTE_MAX_PROGRESS - CRASH_ENTRY_PROGRESS),
            ),
            eye = [
              mix(mouthHold[0], insideCabin[0], t),
              mix(mouthHold[1], insideCabin[1], t),
              mix(mouthHold[2], insideCabin[2], t),
            ],
            pitch = smoothstep(0, 0.42, t),
            dir = norm([
              mix(flatTunnelDir[0], crashFwd[0], pitch),
              mix(flatTunnelDir[1], crashFwd[1], pitch),
              mix(flatTunnelDir[2], crashFwd[2], pitch),
            ]);
          return cameraFrom(eye, dir, mix(7, 3, t), mix(2.4, 1.4, t));
        }
      }
      function normalBlink() {
        return (
          smoothstep(0, 0.075, (t = state.blinkClock % 3.35)) *
          (1 - smoothstep(0.13, 0.23, t))
        );
        var t;
      }
      let rafId = 0,
        disposed = !1;
      function beginDesertDreamHandoff() {
        if (state.handoffDone) return;
        state.handoffDone = !0;
        state.handoffTransitioning = !0;
        updateTheaterNav();
        const handoffForwardKeys = {
            Space: !!state.forwardKeys.Space,
            ArrowUp: !!state.forwardKeys.ArrowUp,
            KeyW: !!state.forwardKeys.KeyW,
            KeyK: !!state.forwardKeys.KeyK,
          },
          walkHeld = !!(
            handoffForwardKeys.Space ||
            handoffForwardKeys.ArrowUp ||
            handoffForwardKeys.KeyW ||
            handoffForwardKeys.KeyK
          ),
          theaterScene = window.__modeTheaterScene;
        let tornDown = !1,
          fallbackTimer = 0;
        function teardownTheater() {
          if (tornDown) return;
          tornDown = !0;
          state.handoffTransitioning = !1;
          fallbackTimer && clearTimeout(fallbackTimer);
          ((window.__modeTheaterActive = !1), (window.isEngine1Dead = !0));
          try {
            if (theaterScene && "function" == typeof theaterScene.destroy)
              theaterScene.destroy();
            else if (((disposed = !0), rafId)) {
              try {
                cancelAnimationFrame(rafId);
              } catch (e) {}
              rafId = 0;
            }
          } catch (e) {
            console.error("[mode-theater] theater teardown before desert dream failed", e);
            ((disposed = !0), rafId && cancelAnimationFrame(rafId), (rafId = 0));
          }
          (window.__modeTheaterScene === theaterScene &&
            (window.__modeTheaterScene = null),
            (window.__modeTheaterActive = !1),
            (window.isEngine1Dead = !0));
          try {
            canvas && (canvas.style.transform = "");
          } catch (e) {}
        }
        try {
          if ("function" == typeof window.startDesertDreamTunnel) {
            window.startDesertDreamTunnel({
              fromTheater: !0,
              walkHeld: walkHeld,
              forwardKeys: handoffForwardKeys,
              startZ: 168,
              // Skip the blue setup throat and land inside the established
              // cabin fog while preserving forward motion from the theater.
              progress: 0.18,
              desertAt: 0.58,
              fadeMs: 720,
              fadeInMs: 260,
              mouseX: state.lookX,
              mouseY: state.lookY,
              onIntroOpaque: teardownTheater,
            });
            fallbackTimer = setTimeout(teardownTheater, 650);
          } else if ("function" == typeof window.startModeDesertRoad) {
            window.startModeDesertRoad({
              fromTheater: !0,
              emergeIntro: !0,
              startWithCabinTunnel: !0,
              walkHeld: walkHeld,
              startZ: 168,
            });
            teardownTheater();
          } else {
            console.error(
              "[mode-theater] desert dream tunnel entrypoint not available at crash handoff",
            );
            teardownTheater();
          }
        } catch (e) {
          console.error("[mode-theater] desert dream handoff failed", e);
          teardownTheater();
        }
      }
      return (
        (rafId = requestAnimationFrame(function frame(now) {
          if (disposed) return;
          !(function () {
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
              w = Math.floor(window.innerWidth * dpr),
              h = Math.floor(window.innerHeight * dpr);
            ((canvas.width === w && canvas.height === h) ||
              ((canvas.width = w), (canvas.height = h)),
              gl.viewport(0, 0, canvas.width, canvas.height));
          })();
          const dt = Math.min(0.05, Math.max(0, 0.001 * (now - state.last)));
          (state.last = now), (state.blinkClock += dt);
          // ─── Hallway phase state update (render happens below with hallway overlay)
          if (state.hallPhase) {
            state.hallWakeIn = Math.min(1, state.hallWakeIn + dt * 2.5);
            if (state.space)
              state.hallCamZ -= HALL_PHASE_SPEED * dt * state.routeDir;
            if (state.routeDir < 0 && state.hallCamZ >= HALL_PHASE_START_Z) {
              ((state.hallCamZ = HALL_PHASE_START_Z),
                (state.routeDir = 1),
                (state.turnYawTarget += state.lastTurnSign * Math.PI));
            }
            if (
              (state.routeDir > 0 && state.hallCamZ <= HALL_PHASE_EXIT_Z) ||
              !hallwayProgram ||
              !hallLoc
            ) {
              state.hallPhase = false;
              state.progress = 0;
              state.routeDir = 1;
              state.turnYaw = 0;
              state.turnYawTarget = 0;
              state.lastTurnSign = 1;
            }
            // Fall through: 3D theater renders at progress=0 (tunnel entry camera),
            // then hallway overlay draws on top with transparent south face.
          }
          // ─────────────────────────────────────────────────────────────────
          // Walk advances progress. No look recenter — engine1's free mouse-look
          // never snaps back to center, so neither do we.
          if (
            state.space &&
            !state.hallPhase &&
            (!state.handoffDone || state.handoffTransitioning) &&
            state.impactOutcome !== "escaped-red"
          ) {
            const routeMax =
              state.escapeActive &&
              state.routeDir > 0 &&
              (!state.crashTurned || state.crashTurn < 0.985)
                ? Math.min(POST_CRASH_ROUTE_MAX_PROGRESS, CRASH_TURN_PROGRESS)
                : state.escapeActive
                  ? POST_CRASH_ROUTE_MAX_PROGRESS
                  : THEATER_ROUTE_MAX_PROGRESS;
            state.progress = clamp(
              state.progress + 0.026 * dt * state.routeDir,
              0,
              routeMax,
            );
          }
          // After escaping the red, reaching the crash gate while walking forward
          // auto-initiates the turn toward the tunnel, so forward keeps flowing
          // into the desert handoff instead of dead-stopping at the gate waiting
          // for a separate turn input.
          if (
            state.escapeActive &&
            state.routeDir > 0 &&
            !state.crashTurned &&
            state.progress >= CRASH_TURN_PROGRESS - CRASH_TURN_GATE_EPS
          ) {
            ((state.crashTurned = !0), updateTheaterNav());
          }
          if (
            state.escapeActive &&
            state.routeDir > 0 &&
            state.progress >= CABIN_FOG_HANDOFF_PROGRESS &&
            !state.handoffDone
          )
            beginDesertDreamHandoff();
          if (
            !state.hallPhase &&
            state.routeDir < 0 &&
            state.progress <= 0.002
          ) {
            ((state.routeDir = 1),
              (state.turnYawTarget += state.lastTurnSign * Math.PI));
          }
          const turnDelta = state.turnYawTarget - state.turnYaw,
            turnStep = Math.PI * dt * 3.6;
          if (Math.abs(turnDelta) <= turnStep)
            state.turnYaw = state.turnYawTarget;
          else state.turnYaw += Math.sign(turnDelta) * turnStep;
          if (
            Math.abs(state.turnYawTarget - state.turnYaw) < 1e-5 &&
            Math.abs(state.turnYawTarget) >= Math.PI * 2
          ) {
            const normalizedYaw = Math.atan2(
              Math.sin(state.turnYawTarget),
              Math.cos(state.turnYawTarget),
            );
            ((state.turnYaw = normalizedYaw),
              (state.turnYawTarget = normalizedYaw));
          }
          const targetCrashTurn = state.crashTurned ? 1 : 0,
            crashTurnStep = dt * 3.2;
          state.crashTurn =
            state.crashTurn < targetCrashTurn
              ? Math.min(targetCrashTurn, state.crashTurn + crashTurnStep)
              : Math.max(targetCrashTurn, state.crashTurn - crashTurnStep);
          const follow = 1 - Math.pow(2e-4, dt);
          ((state.lookX += (state.targetLookX - state.lookX) * follow),
            (state.lookY += (state.targetLookY - state.lookY) * follow));
          // Keep one smoothed look value and feed it to both the cloned hallway
          // shader and the real theater tunnel camera behind it.
          const camLookX = state.lookX,
            camLookY = state.lookY;
          let cam = (function (progress) {
            const stairBaseY = aisleYAtZ(-22) + 2.25,
              topLandingY = aisleYAtZ(262.1) + 2.25,
              routeBreaks = theaterRouteBreaks(stairBaseY, topLandingY);
            function seg(a, b) {
              return clamp((routeProgress - a) / (b - a), 0, 1);
            }
            let x = 0,
              z = theaterEntryCameraZ,
              y = theaterTunnelFloorY + 2.25,
              yaw = 0,
              finalLook = 0,
              routeProgress = clamp(progress, 0, 1);
            const b0 = routeBreaks[0],
              b1 = routeBreaks[1],
              b2 = routeBreaks[2],
              b3 = routeBreaks[3],
              b4 = routeBreaks[4],
              b5 = routeBreaks[5],
              b6 = routeBreaks[6],
              b7 = routeBreaks[7],
              b8 = routeBreaks[8],
              b9 = routeBreaks[9],
              b10 = routeBreaks[10];
            if (routeProgress < b0) {
              const t = seg(0, b0);
              ((x = 0),
                (z = mix(theaterEntryCameraZ, theaterTunnelInnerZ, t)),
                (y = tunnelApproachEyeY(t, topLandingY)),
                (yaw = 0));
            } else if (routeProgress < b1)
              ((x = 0),
                (z = mix(theaterTunnelInnerZ, 262.1, seg(b0, b1))),
                (y = topLandingY),
                (yaw = 0));
            else if (routeProgress < b2) {
              const t = seg(b1, b2);
              ((x = descentXAt(t)),
                (z = mix(262.1, -22, t)),
                (y = aisleYAtZ(z) + 2.25),
                (yaw = 0));
            } else if (routeProgress < b3) {
              ((x = -1.45), (z = -22), (y = stairBaseY));
              const t = smoothstep(0, 1, seg(b2, b3));
              yaw = mix(0, 0.5 * -Math.PI, t);
            } else if (routeProgress < b4)
              ((x = mix(-1.45, -43.25, seg(b3, b4))),
                (z = -22),
                (y = stairBaseY),
                (yaw = 0.5 * -Math.PI));
            else if (routeProgress < b5) {
              ((x = -43.25), (z = -22), (y = stairBaseY));
              const t = smoothstep(0, 1, seg(b4, b5));
              yaw = mix(0.5 * -Math.PI, 0, t);
            } else if (routeProgress < b6)
              ((x = -43.25),
                (z = mix(-22, -39.25, seg(b5, b6))),
                (y = stairBaseY),
                (yaw = 0));
            else if (routeProgress < b7) {
              ((x = -43.25), (z = -39.25), (y = stairBaseY));
              const t = smoothstep(0, 1, seg(b6, b7));
              yaw = mix(0, 0.5 * Math.PI, t);
            } else if (routeProgress < b8) {
              const t = seg(b7, b8);
              ((x = mix(-43.25, -31, t)),
                (z = -39.25),
                (y = mix(stairBaseY, 6.05, t)),
                (yaw = 0.5 * Math.PI));
            } else if (routeProgress < b9)
              ((x = mix(-31, 0, seg(b8, b9))),
                (z = -39.25),
                (y = 6.05),
                (yaw = 0.5 * Math.PI));
            else {
              const t = smoothstep(0, 1, seg(b9, b10));
              ((x = 0),
                (z = -39.25),
                (y = 6.05),
                (yaw = mix(0.5 * Math.PI, Math.PI, t)),
                (finalLook = t));
            }
            const eye = [x, y, z],
              lookDist = mix(34, 48, finalLook),
              lookSideX = Math.cos(yaw),
              lookSideZ = Math.sin(yaw),
              lookKX = routeProgress < b0 ? -18 : 18;
            return {
              eye: eye,
              target: [
                eye[0] +
                  Math.sin(yaw) * lookDist +
                  lookSideX * camLookX * lookKX,
                mix(eye[1] - 1, 18, finalLook) + 8 * camLookY,
                eye[2] -
                  Math.cos(yaw) * lookDist +
                  lookSideZ * camLookX * lookKX,
              ],
              finalLook: finalLook,
            };
          })(state.progress);
          if (state.escapeActive) {
            const routeCam = crashEntryCamera(
              state.progress,
              camLookX,
              camLookY,
              state.crashTurn,
            );
            if (state.escapeImpactCamera) {
              const resume = smoothstep(
                STAGE_ESCAPE_PROGRESS,
                CRASH_TURN_PROGRESS,
                state.progress,
              );
              cam = {
                eye: [
                  mix(state.escapeImpactCamera.eye[0], routeCam.eye[0], resume),
                  mix(state.escapeImpactCamera.eye[1], routeCam.eye[1], resume),
                  mix(state.escapeImpactCamera.eye[2], routeCam.eye[2], resume),
                ],
                target: [
                  mix(state.escapeImpactCamera.target[0], routeCam.target[0], resume),
                  mix(state.escapeImpactCamera.target[1], routeCam.target[1], resume),
                  mix(state.escapeImpactCamera.target[2], routeCam.target[2], resume),
                ],
                finalLook: 1,
              };
              // routeCam only contributes `resume` worth of mouse-look, so the
              // pinned impact-recovery camera (resume≈0 right after the red)
              // would ignore the mouse. Add the remaining (1-resume) of look on
              // top so free-look stays responsive the whole time.
              const lookFill = 1 - resume,
                eFwd = norm(sub(cam.target, cam.eye)),
                eSide = norm(cross(eFwd, [0, 1, 0]));
              ((cam.target[0] += eSide[0] * camLookX * 12 * lookFill),
                (cam.target[1] += camLookY * 5 * lookFill),
                (cam.target[2] += eSide[2] * camLookX * 12 * lookFill));
              resume >= 0.999 && (state.escapeImpactCamera = null);
            } else cam = routeCam;
          }
          // During hallPhase, the cloned Z2 hallway and the 3D theater tunnel
          // share one camera path. hallCamZ maps directly onto the tunnel entry:
          // 2.4 starts at the intersection, -3.4 lands at the BACK.png plane.
          if (state.hallPhase) {
            const hallEyeZ = theaterEntryCameraZ + (state.hallCamZ + 3.4);
            const eyeY = theaterTunnelFloorY + 2.25,
              hallLookY = camLookY * 0.25;
            cam.eye = [0, eyeY, hallEyeZ];
            cam.target = [
              -camLookX * 18,
              eyeY - 1 + 8 * hallLookY,
              hallEyeZ - 34,
            ];
            cam.finalLook = 0;
          }
          if (Math.abs(state.turnYaw) > 0.001) {
            const f = sub(cam.target, cam.eye),
              c = Math.cos(state.turnYaw),
              s = Math.sin(state.turnYaw),
              rx = f[0] * c - f[2] * s,
              rz = f[0] * s + f[2] * c;
            cam.target = [cam.eye[0] + rx, cam.eye[1] + f[1], cam.eye[2] + rz];
          }
          const stageReady =
            !state.escapeActive &&
            !state.impactOutcome &&
            state.routeDir > 0 &&
            !state.hallPhase &&
            cam.finalLook >= 0.999;
          stageReady &&
            !state.stageActive &&
            ((state.stageActive = !0),
            (state.stageStartBlinkIndex = Math.floor(state.blinkClock / 3.35)),
            (state.stageBeat = 0));
          state.stageActive ? (state.stageBeat += dt) : (state.stageBeat = 0);
          updateTheaterNav();
          const reveal = (function () {
            if (!state.stageActive)
              return {
                exposure: mix(1, 0.015, normalBlink()),
                lights: 0,
                plane: 0,
                impactAge: -1,
              };
            const blinksAfterStage = Math.max(
                0,
                Math.floor(state.blinkClock / 3.35) -
                  state.stageStartBlinkIndex,
              ),
              afterSecondBlink =
                state.blinkClock - 3.35 * (state.stageStartBlinkIndex + 2),
              lights = smoothstep(0.18, 0.95, afterSecondBlink),
              plane = smoothstep(0.42, 5.9, afterSecondBlink),
              impactAge = afterSecondBlink - 4.6;
            return {
              exposure: mix(1, 0.015, normalBlink()),
              lights: blinksAfterStage >= 2 ? lights : 0,
              plane: blinksAfterStage >= 2 ? plane : 0,
              impactAge: blinksAfterStage >= 2 ? impactAge : -1,
            };
          })();
          !(function (reveal) {
            if (reveal.plane <= 0) return void (jetVertexCount = 0);
            const t = reveal.plane,
              start = [0, aisleYAtZ(262.1) + 7.5, 262.1],
              end = [0, 7.25, -36.5],
              jetData = (function (center, fwd, scale, flare) {
                const b = createBuilder();
                let side = norm(cross([0, 1, 0], fwd));
                Math.hypot(side[0], side[1], side[2]) < 0.001 &&
                  (side = [1, 0, 0]);
                const up = norm(cross(fwd, side)),
                  fuselage = [
                    0.8 + 0.12 * flare,
                    0.82 + 0.12 * flare,
                    0.87 + 0.12 * flare,
                  ],
                  belly = [0.68, 0.55, 0.38],
                  metal = [0.65, 0.7, 0.85],
                  finMetal = [0.7, 0.72, 0.78],
                  engineMetal = [0.6, 0.62, 0.68],
                  dark = [0.035, 0.038, 0.045],
                  windowGlow = [0.9, 0.78, 0.45],
                  stripe = [0.1, 0.18, 0.42],
                  engineHot = [0.7, 0.35, 0.08];
                function P(x, y, z) {
                  return [
                    center[0] + (side[0] * x + up[0] * y + fwd[0] * z) * scale,
                    center[1] + (side[1] * x + up[1] * y + fwd[1] * z) * scale,
                    center[2] + (side[2] * x + up[2] * y + fwd[2] * z) * scale,
                  ];
                }
                function obox(cx, cy, cz, hx, hy, hz, color) {
                  const c = P(cx, cy, cz),
                    ax = [side[0] * scale, side[1] * scale, side[2] * scale],
                    ay = [up[0] * scale, up[1] * scale, up[2] * scale],
                    az = [fwd[0] * scale, fwd[1] * scale, fwd[2] * scale];
                  function Q(x, y, z) {
                    return [
                      c[0] + ax[0] * x + ay[0] * y + az[0] * z,
                      c[1] + ax[1] * x + ay[1] * y + az[1] * z,
                      c[2] + ax[2] * x + ay[2] * y + az[2] * z,
                    ];
                  }
                  const p000 = Q(-hx, -hy, -hz),
                    p100 = Q(hx, -hy, -hz),
                    p110 = Q(hx, hy, -hz),
                    p010 = Q(-hx, hy, -hz),
                    p001 = Q(-hx, -hy, hz),
                    p101 = Q(hx, -hy, hz),
                    p111 = Q(hx, hy, hz),
                    p011 = Q(-hx, hy, hz);
                  (b.quad(p001, p101, p111, p011, color),
                    b.quad(p100, p000, p010, p110, color),
                    b.quad(p000, p001, p011, p010, color),
                    b.quad(p101, p100, p110, p111, color),
                    b.quad(p010, p011, p111, p110, color),
                    b.quad(p000, p100, p101, p001, color));
                }
                function mixColor(a, c, k) {
                  return [
                    mix(a[0], c[0], k),
                    mix(a[1], c[1], k),
                    mix(a[2], c[2], k),
                  ];
                }
                function avgAxis(points, axis) {
                  let total = 0;
                  for (const p of points) total += p[axis];
                  return total / points.length;
                }
                function quadLocal(a, c, d, e, color) {
                  b.quad(
                    P(a[0], a[1], a[2]),
                    P(c[0], c[1], c[2]),
                    P(d[0], d[1], d[2]),
                    P(e[0], e[1], e[2]),
                    color,
                  );
                }
                function fuselageColor(points) {
                  const y = avgAxis(points, 1),
                    bottom = clamp((-y - 0.08) / 0.42, 0, 1),
                    top = clamp((y - 0.18) / 0.48, 0, 1);
                  return mixColor(
                    mixColor(fuselage, belly, 0.4 * bottom),
                    metal,
                    0.1 * top,
                  );
                }
                function cylinderZ(cx, cy, z0, z1, radius, colorFn, steps) {
                  const sides = steps || 24;
                  for (let i = 0; i < sides; i++) {
                    const a0 = (i / sides) * Math.PI * 2,
                      a1 = ((i + 1) / sides) * Math.PI * 2,
                      p00 = [cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius, z0],
                      p10 = [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, z0],
                      p11 = [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, z1],
                      p01 = [cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius, z1],
                      color = colorFn([p00, p10, p11, p01]);
                    quadLocal(p00, p10, p11, p01, color);
                  }
                }
                function hemisphereZ(cx, cy, cz, radius, dir, colorFn) {
                  const rows = 6,
                    sides = 24;
                  for (let r = 0; r < rows; r++) {
                    const t0 = (r / rows) * 0.5 * Math.PI,
                      t1 = ((r + 1) / rows) * 0.5 * Math.PI;
                    for (let i = 0; i < sides; i++) {
                      const a0 = (i / sides) * Math.PI * 2,
                        a1 = ((i + 1) / sides) * Math.PI * 2,
                        ring0 = Math.cos(t0) * radius,
                        ring1 = Math.cos(t1) * radius,
                        p00 = [
                          cx + Math.cos(a0) * ring0,
                          cy + Math.sin(a0) * ring0,
                          cz + dir * Math.sin(t0) * radius,
                        ],
                        p10 = [
                          cx + Math.cos(a1) * ring0,
                          cy + Math.sin(a1) * ring0,
                          cz + dir * Math.sin(t0) * radius,
                        ],
                        p11 = [
                          cx + Math.cos(a1) * ring1,
                          cy + Math.sin(a1) * ring1,
                          cz + dir * Math.sin(t1) * radius,
                        ],
                        p01 = [
                          cx + Math.cos(a0) * ring1,
                          cy + Math.sin(a0) * ring1,
                          cz + dir * Math.sin(t1) * radius,
                        ],
                        color = colorFn([p00, p10, p11, p01]);
                      dir > 0
                        ? quadLocal(p00, p10, p11, p01, color)
                        : quadLocal(p00, p01, p11, p10, color);
                    }
                  }
                }
                function capsuleZ(cx, cy, z0, z1, radius, colorFn, steps) {
                  (cylinderZ(cx, cy, z0, z1, radius, colorFn, steps),
                    hemisphereZ(cx, cy, z1, radius, 1, colorFn),
                    hemisphereZ(cx, cy, z0, radius, -1, colorFn));
                }
                function ellipsoid(cx, cy, cz, rx, ry, rz, colorFn) {
                  const rows = 12,
                    sides = 24;
                  for (let r = 0; r < rows; r++) {
                    const t0 = -0.5 * Math.PI + (r / rows) * Math.PI,
                      t1 = -0.5 * Math.PI + ((r + 1) / rows) * Math.PI;
                    for (let i = 0; i < sides; i++) {
                      const a0 = (i / sides) * Math.PI * 2,
                        a1 = ((i + 1) / sides) * Math.PI * 2;
                      function E(t, a) {
                        return [
                          cx + Math.cos(t) * Math.cos(a) * rx,
                          cy + Math.sin(t) * ry,
                          cz + Math.cos(t) * Math.sin(a) * rz,
                        ];
                      }
                      const p00 = E(t0, a0),
                        p10 = E(t0, a1),
                        p11 = E(t1, a1),
                        p01 = E(t1, a0),
                        color = colorFn([p00, p10, p11, p01]);
                      quadLocal(p00, p01, p11, p10, color);
                    }
                  }
                }
                function axesForPlane(plane, angle) {
                  const c = Math.cos(-angle),
                    s = Math.sin(-angle);
                  if ("xy" === plane)
                    return [
                      [c, -s, 0],
                      [s, c, 0],
                      [0, 0, 1],
                    ];
                  if ("yz" === plane)
                    return [
                      [1, 0, 0],
                      [0, c, -s],
                      [0, s, c],
                    ];
                  return [
                    [c, 0, -s],
                    [0, 1, 0],
                    [s, 0, c],
                  ];
                }
                function mirrorXAxes(axes, sign) {
                  return axes.map((axis) => [axis[0] * sign, axis[1], axis[2]]);
                }
                function oboxRot(cx, cy, cz, hx, hy, hz, color, axes) {
                  const ax = axes[0],
                    ay = axes[1],
                    az = axes[2];
                  function Q(x, y, z) {
                    return [
                      cx + ax[0] * x + ay[0] * y + az[0] * z,
                      cy + ax[1] * x + ay[1] * y + az[1] * z,
                      cz + ax[2] * x + ay[2] * y + az[2] * z,
                    ];
                  }
                  const p000 = Q(-hx, -hy, -hz),
                    p100 = Q(hx, -hy, -hz),
                    p110 = Q(hx, hy, -hz),
                    p010 = Q(-hx, hy, -hz),
                    p001 = Q(-hx, -hy, hz),
                    p101 = Q(hx, -hy, hz),
                    p111 = Q(hx, hy, hz),
                    p011 = Q(-hx, hy, hz);
                  (quadLocal(p001, p101, p111, p011, color),
                    quadLocal(p100, p000, p010, p110, color),
                    quadLocal(p000, p001, p011, p010, color),
                    quadLocal(p101, p100, p110, p111, color),
                    quadLocal(p010, p011, p111, p110, color),
                    quadLocal(p000, p100, p101, p001, color));
                }
                function discZ(cx, cy, cz, radius, color) {
                  const sides = 24,
                    centerLocal = [cx, cy, cz];
                  for (let i = 0; i < sides; i++) {
                    const a0 = (i / sides) * Math.PI * 2,
                      a1 = ((i + 1) / sides) * Math.PI * 2,
                      p0 = [cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius, cz],
                      p1 = [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, cz];
                    quadLocal(centerLocal, p0, p1, centerLocal, color);
                  }
                }
                function addSideQuad(sx, y, z, width, height, color) {
                  const x = sx * 0.407,
                    p0 = [x, y - 0.5 * height, z - 0.5 * width],
                    p1 = [x, y + 0.5 * height, z - 0.5 * width],
                    p2 = [x, y + 0.5 * height, z + 0.5 * width],
                    p3 = [x, y - 0.5 * height, z + 0.5 * width];
                  sx > 0
                    ? quadLocal(p0, p1, p2, p3, color)
                    : quadLocal(p0, p3, p2, p1, color);
                }
                function addMarkings() {
                  for (const sx of [-1, 1]) {
                    addSideQuad(sx, 0.01, -1.65, 6.35, 0.035, stripe);
                    for (let z = -4.5; z < 2.1; z += 0.38) {
                      const f = ((z * 2.6 + 0.12) % 1 + 1) % 1;
                      f > 0.5 &&
                        addSideQuad(
                          sx,
                          0.065,
                          z,
                          0.14,
                          0.082,
                          mixColor(dark, windowGlow, 0.34),
                        );
                    }
                  }
                  quadLocal(
                    [-0.27, 0.23, 2.72],
                    [-0.08, 0.27, 3.4],
                    [-0.03, 0.2, 3.7],
                    [-0.22, 0.17, 3.08],
                    mixColor(dark, windowGlow, 0.18),
                  );
                  quadLocal(
                    [0.27, 0.23, 2.72],
                    [0.22, 0.17, 3.08],
                    [0.03, 0.2, 3.7],
                    [0.08, 0.27, 3.4],
                    mixColor(dark, windowGlow, 0.18),
                  );
                  obox(0, 0.18, 3.58, 0.22, 0.16, 0.28, [1.25, 1.05, 0.6]);
                }
                function wing(sign) {
                  const dih = 0.11;
                  // wP: jet-local coords with dihedral baked into y
                  function wP(x, y, z) { return P(sign * x, y + x * dih, z); }
                  // Corners derived analytically from mode9's sdBox wA/wB/wC geometry
                  // Section A – inner panel (wA: center 0.5,0.025,0.25 sweep -0.06 hx0.40 hy0.052 hz0.78)
                  const aLE0=wP(0.054,0.077,1.004), aLE1=wP(0.852,0.077,1.052),
                        aTE1=wP(0.946,0.077,-0.504), aTE0=wP(0.148,0.077,-0.552),
                        aLE0b=wP(0.054,-0.027,1.004), aLE1b=wP(0.852,-0.027,1.052),
                        aTE1b=wP(0.946,-0.027,-0.504), aTE0b=wP(0.148,-0.027,-0.552);
                  (b.quad(aLE0,aLE1,aTE1,aTE0,metal), b.quad(aTE0b,aTE1b,aLE1b,aLE0b,belly),
                   b.quad(aLE0,aLE0b,aLE1b,aLE1,metal), b.quad(aTE1,aTE1b,aTE0b,aTE0,dark),
                   b.quad(aLE1,aLE1b,aTE1b,aTE1,dark), b.quad(aTE0,aTE0b,aLE0b,aLE0,dark));
                  // Section B – mid panel (wB: center 1.9,0.159,-0.25 sweep -0.16 hx1.18 hy0.038 hz0.60)
                  const bLE0=wP(0.640,0.197,0.154), bLE1=wP(2.970,0.197,0.530),
                        bTE1=wP(3.160,0.197,-0.654), bTE0=wP(0.830,0.197,-1.030),
                        bLE0b=wP(0.640,0.121,0.154), bLE1b=wP(2.970,0.121,0.530),
                        bTE1b=wP(3.160,0.121,-0.654), bTE0b=wP(0.830,0.121,-1.030);
                  (b.quad(bLE0,bLE1,bTE1,bTE0,metal), b.quad(bTE0b,bTE1b,bLE1b,bLE0b,belly),
                   b.quad(bLE0,bLE0b,bLE1b,bLE1,metal), b.quad(bTE1,bTE1b,bTE0b,bTE0,dark),
                   b.quad(bLE1,bLE1b,bTE1b,bTE1,dark), b.quad(bTE0,bTE0b,bLE0b,bLE0,dark));
                  // Section C – outer panel (wC: center 4.0,0.370,-1.05 sweep -0.25 hx0.98 hy0.024 hz0.40)
                  const cLE0=wP(2.951,0.394,-0.904), cLE1=wP(4.851,0.394,-0.420),
                        cTE1=wP(5.049,0.394,-1.196), cTE0=wP(3.149,0.394,-1.680),
                        cLE0b=wP(2.951,0.346,-0.904), cLE1b=wP(4.851,0.346,-0.420),
                        cTE1b=wP(5.049,0.346,-1.196), cTE0b=wP(3.149,0.346,-1.680);
                  (b.quad(cLE0,cLE1,cTE1,cTE0,metal), b.quad(cTE0b,cTE1b,cLE1b,cLE0b,belly),
                   b.quad(cLE0,cLE0b,cLE1b,cLE1,metal), b.quad(cTE1,cTE1b,cTE0b,cTE0,dark),
                   b.quad(cLE1,cLE1b,cTE1b,cTE1,dark), b.quad(cTE0,cTE0b,cLE0b,cLE0,dark));
                  // Winglet (mode9: x=5.0, y_dih=0.39, z=-1.30, half-extents 0.028×0.26×0.20)
                  oboxRot(
                    sign * 5.0,
                    0.39,
                    -1.30,
                    0.028,
                    0.26,
                    0.20,
                    metal,
                    mirrorXAxes(axesForPlane("xy", 0.20), sign),
                  );
                }
                (capsuleZ(0, 0, -5.6, 3.0, 0.40, fuselageColor),
                  ellipsoid(0, 0.02, 3.0, 0.24, 0.28, 1.60, fuselageColor),
                  ellipsoid(0, 0.06, -5.6, 0.28, 0.25, 1.20, fuselageColor),
                  wing(-1),
                  wing(1),
                  addMarkings());
                for (const sx of [-1, 1])
                  // engine nacelle (mode9: eY = -0.36 - 1.90*0.11 = -0.569 world-y)
                  (capsuleZ(1.90 * sx, -0.569, 0.28, 0.80, 0.26, () => engineMetal, 20),
                    capsuleZ(1.90 * sx, -0.569, -0.52, 0.28, 0.20, () => engineMetal, 20),
                    ellipsoid(1.90 * sx, -0.569, 0.85, 0.29, 0.29, 0.09, () => engineMetal),
                    discZ(1.90 * sx, -0.569, 0.88, 0.19, dark),
                    discZ(1.90 * sx, -0.569, -0.72, 0.13, engineHot),
                    // pylon (mode9: pY = -0.19 - 1.90*0.11 = -0.399 world-y)
                    obox(1.90 * sx, -0.399, -0.12, 0.052, 0.16, 0.50, [0.50, 0.52, 0.58]),
                    // horizontal stabilizer (mode9: x=±0.88, y=0.13, z=-5.0, hx0.76 hy0.028 hz0.34)
                    oboxRot(
                      0.88 * sx,
                      0.13,
                      -5.00,
                      0.76,
                      0.028,
                      0.34,
                      finMetal,
                      mirrorXAxes(axesForPlane("xz", -0.13), sx),
                    ));
                return (
                  // vertical fin (mode9: x=0, y=0.54, z=-4.5, hx0.034 hy0.70 hz0.80)
                  oboxRot(
                    0,
                    0.54,
                    -4.50,
                    0.034,
                    0.70,
                    0.80,
                    finMetal,
                    axesForPlane("yz", -0.09),
                  ),
                  new Float32Array(b.data)
                );
              })(
                [
                  mix(start[0], end[0], t),
                  mix(start[1], end[1], smoothstep(0, 1, t)),
                  mix(start[2], end[2], t),
                ],
                norm(sub(end, start)),
                mix(1.65, 2.95, t),
                reveal.lights,
              );
            ((jetVertexCount = jetData.length / 9),
              gl.bindBuffer(gl.ARRAY_BUFFER, jetBuffer),
              gl.bufferData(gl.ARRAY_BUFFER, jetData, gl.DYNAMIC_DRAW));
          })(reveal);
          const vp = (function (a, b) {
            const out = new Array(16);
            for (let c = 0; c < 4; c++)
              for (let r = 0; r < 4; r++)
                out[4 * c + r] =
                  a[0 + r] * b[4 * c + 0] +
                  a[4 + r] * b[4 * c + 1] +
                  a[8 + r] * b[4 * c + 2] +
                  a[12 + r] * b[4 * c + 3];
            return out;
          })(
            (function (fovy, aspect) {
              const f = 1 / Math.tan(0.5 * fovy),
                nf = 1 / -559.92;
              return [
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
                560.08 * nf,
                -1,
                0,
                0,
                1120 * 0.08 * nf,
                0,
              ];
            })((58 * Math.PI) / 180, canvas.width / canvas.height),
            (function (eye, target) {
              const z = norm(sub(eye, target)),
                x = norm(cross([0, 1, 0], z)),
                y = cross(z, x);
              return [
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
                -dot(x, eye),
                -dot(y, eye),
                -dot(z, eye),
                1,
              ];
            })(cam.eye, cam.target),
          );
          if (
            (gl.enable(gl.DEPTH_TEST),
            gl.disable(gl.CULL_FACE),
            reveal.impactAge >= 0)
          ) {
            if (!state.impactOutcome) {
              state.impactOutcome =
                state.progress <= STAGE_ESCAPE_PROGRESS ? "escaped-red" : "laptop";
              if ("escaped-red" === state.impactOutcome)
                state.escapeImpactCamera = {
                  eye: cam.eye.slice(),
                  target: cam.target.slice(),
                };
            }
            const redHang = 1 - smoothstep(0.55, 1.75, reveal.impactAge);
            if ("escaped-red" === state.impactOutcome) {
              const fade = 1 - smoothstep(0.2, ESCAPE_RED_FADE_SECONDS, reveal.impactAge);
              if (reveal.impactAge >= ESCAPE_RED_FADE_SECONDS) {
                ((state.escapeActive = !0),
                  (state.stageActive = !1),
                  (state.impactOutcome = "escaped-active"),
                  (state.progress = STAGE_ESCAPE_PROGRESS),
                  (state.routeDir = 1),
                  (state.turnYaw = 0),
                  (state.turnYawTarget = 0),
                  (state.lastTurnSign = 1),
                  (state.crashTurned = !1),
                  (state.crashTurn = 0));
                updateTheaterNav();
                return void (rafId = requestAnimationFrame(frame));
              }
              return (
                gl.clearColor(0.92 * fade, 0.018 * fade, 0.012 * fade, 1),
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
                void (rafId = requestAnimationFrame(frame))
              );
            }
            if (
              (gl.clearColor(
                0.88 * redHang,
                0.018 * redHang,
                0.012 * redHang,
                1,
              ),
              gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
              reveal.impactAge > 2.35 && !state.handoffDone)
            ) {
              state.handoffDone = !0;
              const wake = window.__wakeToLaptopFromTheater,
                theaterScene = window.__modeTheaterScene;
              return void setTimeout(function () {
                ((window.__theaterLaptopHandoff =
                  "THEATER_LAPTOP_HANDOFF_ENGINE1_RESURRECT_V1"),
                  (window.__modeTheaterActive = !1),
                  (window.isEngine1Dead = !1));
                try {
                  if (theaterScene && "function" == typeof theaterScene.destroy)
                    theaterScene.destroy();
                  else if (((disposed = !0), rafId)) {
                    try {
                      cancelAnimationFrame(rafId);
                    } catch (e) {}
                    rafId = 0;
                  }
                } catch (e) {
                  if (
                    (console.error(
                      "[mode-theater] theater teardown before laptop wake failed",
                      e,
                    ),
                    (disposed = !0),
                    rafId)
                  ) {
                    try {
                      cancelAnimationFrame(rafId);
                    } catch (ee) {}
                    rafId = 0;
                  }
                }
                (window.__modeTheaterScene === theaterScene &&
                  (window.__modeTheaterScene = null),
                  (window.__modeTheaterActive = !1),
                  (window.isEngine1Dead = !1));
                try {
                  canvas && (canvas.style.transform = "");
                } catch (e) {}
                try {
                  "function" == typeof wake
                    ? wake()
                    : console.error(
                        "[mode-theater] __wakeToLaptopFromTheater not available at impact handoff",
                      );
                } catch (e) {
                  console.error("[mode-theater] laptop wake failed", e);
                }
                ((window.__modeTheaterActive = !1),
                  (window.isEngine1Dead = !1));
              }, 0);
            }
            return void (rafId = requestAnimationFrame(frame));
          }
          (gl.clearColor(
            mix(0.006, 0.018, reveal.lights),
            mix(0.007, 0.021, reveal.lights),
            mix(0.008, 0.026, reveal.lights),
            1,
          ),
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT),
            gl.useProgram(program),
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer),
            gl.vertexAttribPointer(locPos, 3, gl.FLOAT, !1, 36, 0),
            gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, !1, 36, 12),
            gl.vertexAttribPointer(locColor, 3, gl.FLOAT, !1, 36, 24),
            gl.uniformMatrix4fv(locViewProj, !1, new Float32Array(vp)),
            gl.uniform3f(locCamera, cam.eye[0], cam.eye[1], cam.eye[2]),
            gl.uniform1f(locHouseLights, reveal.lights),
            gl.uniform1f(locExposure, reveal.exposure),
            gl.drawArrays(gl.TRIANGLES, 0, data.length / 9),
            state.escapeActive &&
              (gl.bindBuffer(gl.ARRAY_BUFFER, escapeBuffer),
              gl.vertexAttribPointer(locPos, 3, gl.FLOAT, !1, 36, 0),
              gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, !1, 36, 12),
              gl.vertexAttribPointer(locColor, 3, gl.FLOAT, !1, 36, 24),
              gl.drawArrays(gl.TRIANGLES, 0, escapeData.length / 9)),
            jetVertexCount > 0 &&
              (gl.bindBuffer(gl.ARRAY_BUFFER, jetBuffer),
              gl.vertexAttribPointer(locPos, 3, gl.FLOAT, !1, 36, 0),
              gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, !1, 36, 12),
              gl.vertexAttribPointer(locColor, 3, gl.FLOAT, !1, 36, 24),
              gl.drawArrays(gl.TRIANGLES, 0, jetVertexCount)),
            state.escapeActive &&
              fireVertexCount > 0 &&
              (gl.depthMask(!1),
              gl.enable(gl.BLEND),
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE),
              gl.useProgram(fireProgram),
              gl.bindBuffer(gl.ARRAY_BUFFER, fireBuffer),
              gl.enableVertexAttribArray(locFireOrigin),
              gl.enableVertexAttribArray(locFireAxis),
              gl.enableVertexAttribArray(locFireLocal),
              gl.enableVertexAttribArray(locFireParams),
              gl.vertexAttribPointer(locFireOrigin, 3, gl.FLOAT, !1, 48, 0),
              gl.vertexAttribPointer(locFireAxis, 3, gl.FLOAT, !1, 48, 12),
              gl.vertexAttribPointer(locFireLocal, 2, gl.FLOAT, !1, 48, 24),
              gl.vertexAttribPointer(locFireParams, 4, gl.FLOAT, !1, 48, 32),
              gl.uniformMatrix4fv(locFireViewProj, !1, new Float32Array(vp)),
              gl.uniform1f(locFireTime, 0.001 * now),
              gl.uniform1f(
                locFireFade,
                1 -
                  smoothstep(
                    POST_CRASH_ROUTE_MAX_PROGRESS - 0.055,
                    POST_CRASH_ROUTE_MAX_PROGRESS,
                    state.progress,
                  ),
              ),
              gl.drawArrays(gl.TRIANGLES, 0, fireVertexCount),
              gl.disable(gl.BLEND),
              gl.depthMask(!0)),
            state.escapeActive &&
              fogVertexCount > 0 &&
              (gl.depthMask(!1),
              gl.enable(gl.BLEND),
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
              gl.useProgram(fogProgram),
              gl.bindBuffer(gl.ARRAY_BUFFER, fogBuffer),
              gl.enableVertexAttribArray(locFogPos),
              gl.enableVertexAttribArray(locFogUv),
              gl.enableVertexAttribArray(locFogAlpha),
              gl.vertexAttribPointer(locFogPos, 3, gl.FLOAT, !1, 24, 0),
              gl.vertexAttribPointer(locFogUv, 2, gl.FLOAT, !1, 24, 12),
              gl.vertexAttribPointer(locFogAlpha, 1, gl.FLOAT, !1, 24, 20),
              gl.uniformMatrix4fv(locFogViewProj, !1, new Float32Array(vp)),
              gl.uniform1f(locFogTime, 0.001 * now),
              gl.uniform1f(
                locFogFade,
                smoothstep(
                  CRASH_TURN_PROGRESS + 0.015,
                  CRASH_ENTRY_PROGRESS + 0.08,
                  state.progress,
                ),
              ),
              gl.drawArrays(gl.TRIANGLES, 0, fogVertexCount),
              gl.disable(gl.BLEND),
              gl.depthMask(!0)),
            gl.useProgram(screenProgram),
            gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer),
            gl.enableVertexAttribArray(locScreenPos),
            gl.enableVertexAttribArray(locScreenUv),
            gl.vertexAttribPointer(locScreenPos, 3, gl.FLOAT, !1, 20, 0),
            gl.vertexAttribPointer(locScreenUv, 2, gl.FLOAT, !1, 20, 12),
            gl.uniformMatrix4fv(locScreenViewProj, !1, new Float32Array(vp)),
            gl.uniform1i(locScreenTex, 0),
            gl.uniform1f(locScreenExposure, reveal.exposure),
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0));
          for (let i = 0; i < screenVideos.length; i++) {
            const video = screenVideos[i];
            if (
              (gl.activeTexture(gl.TEXTURE0),
              gl.bindTexture(gl.TEXTURE_2D, screenTextures[i]),
              video && video.readyState >= 2)
            )
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
            gl.drawArrays(gl.TRIANGLES, 6 * i, 6);
          }
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !1);
          const theaterTrip = (function (progress) {
            const level = progress >= 0.96 ? 3 : progress >= 0.44 ? 2 : 1;
            return "function" == typeof window.__hallucinationTripForLevel
              ? window.__hallucinationTripForLevel(level)
              : 0.32 * level;
          })(state.progress);
          (!state.hallPhase && theaterTrip > 0.01 &&
            (gl.disable(gl.DEPTH_TEST),
            gl.enable(gl.BLEND),
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA),
            gl.useProgram(hallucinationProgram),
            gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationBuffer),
            gl.enableVertexAttribArray(locHallucinationPos),
            gl.vertexAttribPointer(locHallucinationPos, 2, gl.FLOAT, !1, 0, 0),
            gl.uniform2f(locHallucinationRes, canvas.width, canvas.height),
            gl.uniform1f(locHallucinationTime, 0.001 * now),
            gl.uniform1f(locHallucinationTrip, theaterTrip),
            gl.uniform1f(
              locHallucinationSeed,
              17.13 * Math.floor(state.blinkClock / 3.35) + 3.7,
            ),
            gl.drawArrays(gl.TRIANGLES, 0, 3),
            gl.disable(gl.BLEND)));
          // ─── Hallway overlay: the REAL zone2_hallway shader (identical lighting,
          // textures, hallucinations) with its south face transparent so the 3D
          // theater tunnel shows through at the far end.
          if (state.hallPhase && hallwayProgram && hallLoc) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.DEPTH_TEST);
            gl.useProgram(hallwayProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationBuffer);
            gl.enableVertexAttribArray(hallLoc.pos);
            gl.vertexAttribPointer(hallLoc.pos, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texHallFront);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texHallBack);
            gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texHallLeft);
            gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texHallRight);
            gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, texHallTop);
            gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, texHallFloor);
            gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, texHallBlank);
            gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, texHallBlank);
            gl.uniform2f(hallLoc.res, canvas.width, canvas.height);
            gl.uniform1f(hallLoc.time, 0.001 * now);
            gl.uniform2f(hallLoc.mouse, state.lookX, state.lookY);
            gl.uniform1f(hallLoc.camZ, state.hallCamZ);
            gl.uniform1f(
              hallLoc.yawOffset,
              HALL_PHASE_YAW + state.turnYaw,
            );
            gl.uniform1f(hallLoc.blink, state.hallWakeIn < 1 ? 1 - state.hallWakeIn : normalBlink());
            gl.uniform1f(hallLoc.shake, 0);
            gl.uniform1f(hallLoc.isWalking, state.space ? 1 : 0);
            gl.uniform1f(hallLoc.trip, 0);
            gl.uniform1f(hallLoc.framedKitchen, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
          }
          rafId = requestAnimationFrame(frame);
        })),
        {
          gl: gl,
          vertexCount: data.length / 9,
          seek(p) {
            ((state.progress = clamp(p, 0, THEATER_ROUTE_MAX_PROGRESS)),
              (state.routeDir = 1),
              (state.turnYaw = 0),
              (state.turnYawTarget = 0),
              (state.lastTurnSign = 1),
              (state.handoffDone = !1),
              (state.handoffTransitioning = !1),
              (state.stageActive = !1),
              (state.impactOutcome = ""),
              (state.escapeActive = !1),
              (state.escapeImpactCamera = null),
              (state.crashTurned = !1),
              (state.crashTurn = 0),
              (state.stageBeat = 0));
            updateTheaterNav();
          },
          setWalkHeld(held, carriedByPointer) {
            ((state.forwardKeys.Space = !!held && !carriedByPointer),
              (state.carryWalk = !!carriedByPointer),
              syncTheaterForward());
          },
          destroy() {
            ((disposed = !0), rafId && cancelAnimationFrame(rafId));
            window.__modeTheaterNav = null;
            for (const video of screenVideos)
              try {
                video && video.pause && video.pause();
              } catch (e) {}
            try {
              gl.deleteBuffer(buffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(escapeBuffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(fireBuffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(fogBuffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(screenBuffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(hallucinationBuffer);
            } catch (e) {}
            try {
              gl.deleteBuffer(jetBuffer);
            } catch (e) {}
            try {
              gl.deleteProgram(program);
            } catch (e) {}
            try {
              gl.deleteProgram(fireProgram);
            } catch (e) {}
            try {
              gl.deleteProgram(fogProgram);
            } catch (e) {}
            try {
              gl.deleteProgram(screenProgram);
            } catch (e) {}
            try {
              gl.deleteProgram(bedroomOverlayProgram);
            } catch (e) {}
            try {
              gl.deleteProgram(hallucinationProgram);
            } catch (e) {}
            for (const tex of screenTextures)
              try {
                gl.deleteTexture(tex);
              } catch (e) {}
          },
        }
      );
    }),
    (window.startModeTheater = function (options) {
      if (window.__modeTheaterScene && window.__modeTheaterActive)
        return (
          options &&
            options.walkHeld &&
            "function" == typeof window.__modeTheaterScene.setWalkHeld &&
            window.__modeTheaterScene.setWalkHeld(!0, !!options.touchHeld),
          window.__modeTheaterScene
        );
      const canvas = document.getElementById("c");
      if (!canvas || "function" != typeof window.createTheaterGeometryScene)
        return null;
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
      if (
        ((window.isEngine1Dead = !0),
        (window.__modeTheaterActive = !0),
        (window.__modeTheaterNav = null),
        window.__modeTheaterScene && window.__modeTheaterScene.destroy)
      )
        try {
          window.__modeTheaterScene.destroy();
        } catch (e) {}
      if (options && typeof options.slideDir === "number") {
        canvas.style.transition = "none";
        canvas.style.transform = "translateX(" + (-window.innerWidth * options.slideDir) + "px)";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            canvas.style.transition = "transform 0.34s ease-out";
            canvas.style.transform = "";
            setTimeout(() => {
              canvas.style.transition = "";
            }, 350);
          });
        });
      }
      return (
        (window.__modeTheaterScene = window.createTheaterGeometryScene(canvas, {
          walkHeld: !!(options && options.walkHeld),
          touchHeld: !!(options && options.touchHeld),
          fromZone2Bedroom: !!(options && options.fromZone2Bedroom),
          fromZone2: !!(options && options.fromZone2),
          fail(msg) {
            console.error("[mode-theater]", msg);
          },
        })),
        window.__modeTheaterScene &&
          "function" == typeof window.__modeTheaterScene.seek &&
          options &&
          "number" == typeof options.progress &&
          window.__modeTheaterScene.seek(options.progress),
        window.__modeTheaterScene
      );
    }),
    (window.__theaterDebugGoto = function (progress) {
      if (
        ((window.__modeTheaterActive = !1),
        window.__modeTheaterScene && window.__modeTheaterScene.destroy)
      )
        try {
          window.__modeTheaterScene.destroy();
        } catch (e) {}
      window.__modeTheaterScene = null;
      const scene = window.startModeTheater();
      return (
        scene &&
          "function" == typeof scene.seek &&
          scene.seek("number" == typeof progress ? progress : 0.2),
        scene
      );
    }));
})();
