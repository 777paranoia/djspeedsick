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
      function texturedQuad(out, a, b, c, d, ua, ub, uc, ud) {
        function push(p, uv) {
          out.push(p[0], p[1], p[2], uv[0], uv[1]);
        }
        (push(a, ua), push(b, ub), push(c, uc), push(a, ua), push(c, uc), push(d, ud));
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
            b.box([-32, -1, -58], [32, 2.4, -30], [0.075, 0.072, 0.068]),
            b.box([-34, 2.4, -58], [34, 3, -30], [0.115, 0.105, 0.086]),
            b.box([-54, 1, -64], [54, 46, -58], [0.045, 0.048, 0.056]),
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
      // Hall entry surfaces are intentionally omitted: the Z2 tunnel is an
      // open portal (walls/floor/ceiling only) with green screen plates at
      // each end. mode-theater's 3D tunnel geometry takes over at the entry
      // point; no duplicate textured surfaces are needed here.
      const hallucinationBuffer = gl.createBuffer();
      (gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        ));
      // ─── Z2 Hallway Phase (theater route entry) ──────────────────────────
      // Walk camZ from HALL_PHASE_START_Z (north end) southward; exit when
      // camZ drops below HALL_PHASE_EXIT_Z, then fall into theater geometry.
      const HALL_PHASE_START_Z = 2.5,
        HALL_PHASE_EXIT_Z = -2.8,
        HALL_PHASE_YAW = Math.PI, // facing south
        HALL_PHASE_SPEED = 1.02; // units/s  ≈ engine3's 0.034 × 30fps
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
        dragging: !1,
        walkPointerId: null,
        carryWalk: !!(options && options.touchHeld),
        startX: 0,
        startY: 0,
        startLookX: 0,
        startLookY: 0,
        blinkClock: 0,
        stageActive: !1,
        stageStartBlinkIndex: 0,
        stageBeat: 0,
        handoffDone: !1,
        last: performance.now(),
        // hallway phase (theater route from Z2)
        hallPhase: !!(options && options.fromZone2),
        hallCamZ: HALL_PHASE_START_Z,
        hallWakeIn: 0,
      };
      function release(event) {
        if (
          "number" == typeof state.walkPointerId &&
          (!event || event.pointerId === state.walkPointerId)
        )
          ((state.walkPointerId = null), (state.space = !1));
        state.carryWalk && ((state.carryWalk = !1), (state.space = !1));
        state.dragging = !1;
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
          "Space" === event.code &&
            (event.preventDefault(), (state.space = !0));
        },
        { passive: !1 },
      ),
        window.addEventListener(
          "keyup",
          (event) => {
            if (disposed) return;
            "Space" === event.code &&
              (event.preventDefault(), (state.space = !1));
          },
          { passive: !1 },
        ),
        canvas.addEventListener(
          "pointerdown",
          (event) => {
            if (disposed) return;
            (event.preventDefault(),
              isWalkPointer(event)
                ? ((state.space = !0), (state.walkPointerId = event.pointerId))
                : ((state.dragging = !0),
                  (state.startX = event.clientX),
                  (state.startY = event.clientY),
                  (state.startLookX = state.targetLookX),
                  (state.startLookY = state.targetLookY)),
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
                (state.space = isWalkPointer(event))
              );
            event.preventDefault();
            // continuous mouseview: camera follows absolute pointer position
            const nx = (event.clientX / window.innerWidth) * 2 - 1;
            const ny = (event.clientY / window.innerHeight) * 2 - 1;
            ((state.targetLookX = clamp(nx * 0.8, -1, 1)),
              (state.targetLookY = clamp(-ny * 0.55, -1, 1)));
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
      function normalBlink() {
        return (
          smoothstep(0, 0.075, (t = state.blinkClock % 3.35)) *
          (1 - smoothstep(0.13, 0.23, t))
        );
        var t;
      }
      let rafId = 0,
        disposed = !1;
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
            if (state.space) state.hallCamZ -= HALL_PHASE_SPEED * dt;
            if (state.hallCamZ <= HALL_PHASE_EXIT_Z || !hallwayProgram || !hallLoc) {
              state.hallPhase = false;
              state.progress = 0;
            }
            // Fall through: 3D theater renders at progress=0 (tunnel entry camera),
            // then hallway overlay draws on top with transparent south face.
          }
          // ─────────────────────────────────────────────────────────────────
          if (
            (state.space && !state.hallPhase &&
              (state.progress = clamp(state.progress + 0.026 * dt, 0, 1.2)),
            !state.dragging)
          ) {
            const recenter = 1 - Math.pow(8e-4, dt);
            ((state.targetLookX += (0 - state.targetLookX) * recenter),
              (state.targetLookY += (0 - state.targetLookY) * recenter));
          }
          const follow = 1 - Math.pow(2e-4, dt);
          ((state.lookX += (state.targetLookX - state.lookX) * follow),
            (state.lookY += (state.targetLookY - state.lookY) * follow));
          const cam = (function (progress) {
            const stairBaseY = aisleYAtZ(-22) + 2.25,
              topLandingY = aisleYAtZ(262.1) + 2.25;
            function seg(a, b) {
              return clamp((routeProgress - a) / (b - a), 0, 1);
            }
            let x = 0,
              z = -22,
              y = aisleYAtZ(-22) + 2.25,
              yaw = 0,
              finalLook = 0,
              routeProgress = progress;
            if (progress < 0.2) {
              const t = smoothstep(0, 1, clamp(progress / 0.2, 0, 1));
              ((x = 0),
                (z = mix(theaterEntryCameraZ, theaterTunnelInnerZ, t)),
                (y = mix(theaterTunnelFloorY + 2.25, topLandingY, t)),
                (yaw = 0));
            } else routeProgress = clamp(progress - 0.2, 0, 1);
            if (progress >= 0.2 && routeProgress < 0.08)
              ((x = 0),
                (z = mix(theaterTunnelInnerZ, 262.1, seg(0, 0.08))),
                (y = topLandingY),
                (yaw = 0));
            else if (progress >= 0.2 && routeProgress < 0.62)
              ((x = mix(0, -1.45, smoothstep(0, 1, seg(0.08, 0.18)))),
                (z = mix(262.1, -22, seg(0.08, 0.62))),
                (y = aisleYAtZ(z) + 2.25),
                (yaw = 0));
            else if (progress >= 0.2 && routeProgress < 0.635) {
              const t = smoothstep(0, 1, seg(0.62, 0.635));
              yaw = mix(0, 0.5 * -Math.PI, t);
            } else if (progress >= 0.2 && routeProgress < 0.74)
              ((x = mix(-1.45, -43.25, seg(0.635, 0.74))),
                (z = -22),
                (yaw = 0.5 * -Math.PI));
            else if (progress >= 0.2 && routeProgress < 0.755) {
              ((x = -43.25), (z = -22));
              const t = smoothstep(0, 1, seg(0.74, 0.755));
              yaw = mix(0.5 * -Math.PI, 0, t);
            } else if (progress >= 0.2 && routeProgress < 0.84)
              ((x = -43.25),
                (z = mix(-22, -39.25, seg(0.755, 0.84))),
                (yaw = 0));
            else if (progress >= 0.2 && routeProgress < 0.855) {
              ((x = -43.25), (z = -39.25));
              const t = smoothstep(0, 1, seg(0.84, 0.855));
              yaw = mix(0, 0.5 * Math.PI, t);
            } else if (progress >= 0.2 && routeProgress < 0.91) {
              const t = seg(0.855, 0.91);
              ((x = mix(-43.25, -31, t)),
                (z = -39.25),
                (y = mix(stairBaseY, 6.05, t)),
                (yaw = 0.5 * Math.PI));
            } else if (progress >= 0.2 && routeProgress < 0.96)
              ((x = mix(-31, 0, seg(0.91, 0.96))),
                (z = -39.25),
                (y = 6.05),
                (yaw = 0.5 * Math.PI));
            else if (progress >= 0.2) {
              const t = smoothstep(0, 1, seg(0.96, 1));
              ((x = 0),
                (z = -39.25),
                (y = 6.05),
                (yaw = mix(0.5 * Math.PI, Math.PI, t)),
                (finalLook = t));
            }
            const eye = [x, y, z],
              lookDist = mix(34, 48, finalLook),
              lookSideX = Math.cos(yaw),
              lookSideZ = Math.sin(yaw);
            return {
              eye: eye,
              target: [
                eye[0] +
                  Math.sin(yaw) * lookDist +
                  lookSideX * state.lookX * 18,
                mix(eye[1] - 1, 18, finalLook) + 8 * state.lookY,
                eye[2] -
                  Math.cos(yaw) * lookDist +
                  lookSideZ * state.lookX * 18,
              ],
              finalLook: finalLook,
            };
          })(state.progress);
          // During hallPhase the 3D camera tracks the player through the tunnel:
          // hallCamZ goes 2.5→-2.8, south face is at -3.5, so offset = hallCamZ+3.5
          // maps 2.5 → tunnelStartZ+6 (entry cam), -3.5 → tunnelStartZ (portal).
          if (state.hallPhase) {
            const hallEyeZ = theaterEntryCameraZ + (state.hallCamZ + 3.5);
            const eyeY = theaterTunnelFloorY + 2.25;
            cam.eye    = [0, eyeY, hallEyeZ];
            cam.target = [state.lookX * 18, eyeY - 1 + 8 * state.lookY, hallEyeZ - 34];
            cam.finalLook = 0;
          }
          cam.finalLook >= 0.999 && state.progress >= 1.2
            ? (state.stageActive ||
                ((state.stageActive = !0),
                (state.stageStartBlinkIndex =
                  Math.floor(state.blinkClock / 3.35) + 1),
                (state.stageBeat = 0)),
              (state.stageBeat += dt))
            : ((state.stageActive = !1), (state.stageBeat = 0));
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
                    0.78 + 0.28 * flare,
                    0.8 + 0.25 * flare,
                    0.84 + 0.2 * flare,
                  ],
                  belly = [0.54, 0.5, 0.46],
                  metal = [0.58, 0.62, 0.7],
                  dark = [0.035, 0.038, 0.045],
                  engineHot = [0.28, 0.52, 1.25];
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
                  obox(sign * 5.0, 0.39, -1.30, 0.028, 0.26, 0.20, metal);
                }
                (b.beam(P(0, 0, -5.7), P(0, 0.03, 2.9), 0.42 * scale, fuselage),
                  b.beam(
                    P(0, 0.03, 2.35),
                    P(0, 0.05, 4.2),
                    0.26 * scale,
                    fuselage,
                  ),
                  b.beam(
                    P(0, 0.03, -6.35),
                    P(0, 0.03, -5.25),
                    0.3 * scale,
                    belly,
                  ),
                  wing(-1),
                  wing(1));
                for (const sx of [-1, 1])
                  // engine nacelle (mode9: eY = -0.36 - 1.90*0.11 = -0.569 world-y)
                  (b.beam(
                    P(1.90 * sx, -0.569, 0.80),
                    P(1.90 * sx, -0.569, -0.52),
                    0.24 * scale,
                    [0.42, 0.44, 0.5],
                  ),
                    b.beam(
                      P(1.90 * sx, -0.569, -0.52),
                      P(1.90 * sx, -0.569, -0.72),
                      0.18 * scale,
                      engineHot,
                    ),
                    // pylon (mode9: pY = -0.19 - 1.90*0.11 = -0.399 world-y)
                    obox(1.90 * sx, -0.399, -0.12, 0.052, 0.16, 0.50, [0.50, 0.52, 0.58]),
                    // horizontal stabilizer (mode9: x=±0.88, y=0.13, z=-5.0, hx0.76 hy0.028 hz0.34)
                    obox(0.88 * sx, 0.13, -5.00, 0.76, 0.028, 0.34, metal));
                return (
                  // vertical fin (mode9: x=0, y=0.54, z=-4.5, hx0.034 hy0.70 hz0.80)
                  obox(0, 0.54, -4.50, 0.034, 0.70, 0.80, metal),
                  obox(0, 0.18, 3.58, 0.22, 0.16, 0.28, [1.55, 1.42, 1.08]),
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
            const redHang = 1 - smoothstep(0.55, 1.75, reveal.impactAge);
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
            jetVertexCount > 0 &&
              (gl.bindBuffer(gl.ARRAY_BUFFER, jetBuffer),
              gl.vertexAttribPointer(locPos, 3, gl.FLOAT, !1, 36, 0),
              gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, !1, 36, 12),
              gl.vertexAttribPointer(locColor, 3, gl.FLOAT, !1, 36, 24),
              gl.drawArrays(gl.TRIANGLES, 0, jetVertexCount)),
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
          // ─── Hallway overlay: Z2 hallway framing the 3D theater tunnel entry
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
            gl.uniform1f(hallLoc.yawOffset, HALL_PHASE_YAW);
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
            ((state.progress = clamp(p, 0, 1.2)),
              (state.handoffDone = !1),
              (state.stageActive = !1),
              (state.stageBeat = 0));
          },
          setWalkHeld(held, carriedByPointer) {
            ((state.space = !!held), (state.carryWalk = !!carriedByPointer));
          },
          destroy() {
            ((disposed = !0), rafId && cancelAnimationFrame(rafId));
            for (const video of screenVideos)
              try {
                video && video.pause && video.pause();
              } catch (e) {}
            try {
              gl.deleteBuffer(buffer);
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
