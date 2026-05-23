(function () {
  window.GLSL = window.GLSL || {};
  window.GLSL.modules = window.GLSL.modules || {};

  const fallbackShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float progress;
void main() {
  vec2 uv = gl_FragCoord.xy / max(resolution, vec2(1.0));
  vec3 col = vec3(0.010, 0.012, 0.014);
  float aisle = 1.0 - smoothstep(0.03, 0.25, abs(uv.x - 0.5) * (1.0 + uv.y * 3.0));
  float rows = 1.0 - smoothstep(0.02, 0.05, abs(fract((uv.y + progress * 0.18) * 88.0) - 0.5));
  col += rows * vec3(0.035, 0.038, 0.040);
  col += aisle * vec3(0.09, 0.08, 0.045);
  gl_FragColor = vec4(col, 1.0);
}
`;

  window.GLSL.modules.room_theater = fallbackShader;
  window.GLSL.modules["mode.theater"] = fallbackShader;
  window.GLSL.modules["mode-theater"] = fallbackShader;
  window.GLSL.modules["mode-theater.js"] = fallbackShader;

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
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function norm(a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy * 0.5);
    const nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ];
  }

  function lookAt(eye, target, up) {
    const z = norm(sub(eye, target));
    const x = norm(cross(up, z));
    const y = cross(z, x);
    return [
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ];
  }

  function mul4(a, b) {
    const out = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return out;
  }

  function makeProgram(gl, vertexSource, fragmentSource) {
    function shader(type, source) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
      }
      return sh;
    }

    const vs = shader(gl.VERTEX_SHADER, vertexSource);
    const fs = shader(gl.FRAGMENT_SHADER, fragmentSource);
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(pr) || "program link failed");
    }
    return pr;
  }

  function createBuilder() {
    const data = [];

    function tri(a, b, c, n, color) {
      data.push(
        a[0], a[1], a[2], n[0], n[1], n[2], color[0], color[1], color[2],
        b[0], b[1], b[2], n[0], n[1], n[2], color[0], color[1], color[2],
        c[0], c[1], c[2], n[0], n[1], n[2], color[0], color[1], color[2]
      );
    }

    function quad(a, b, c, d, color) {
      const n = norm(cross(sub(b, a), sub(c, a)));
      tri(a, b, c, n, color);
      tri(a, c, d, n, color);
    }

    function box(min, max, color) {
      const x0 = min[0], y0 = min[1], z0 = min[2];
      const x1 = max[0], y1 = max[1], z1 = max[2];
      const p000 = v3(x0, y0, z0);
      const p001 = v3(x0, y0, z1);
      const p010 = v3(x0, y1, z0);
      const p011 = v3(x0, y1, z1);
      const p100 = v3(x1, y0, z0);
      const p101 = v3(x1, y0, z1);
      const p110 = v3(x1, y1, z0);
      const p111 = v3(x1, y1, z1);
      quad(p001, p101, p111, p011, color);
      quad(p100, p000, p010, p110, color);
      quad(p000, p001, p011, p010, color);
      quad(p101, p100, p110, p111, color);
      quad(p010, p011, p111, p110, color);
      quad(p000, p100, p101, p001, color);
    }

    function beam(a, b, radius, color) {
      const d = sub(b, a);
      const len = Math.hypot(d[0], d[1], d[2]);
      if (len < 0.001) return;
      const dir = norm(d);
      const side = norm(Math.abs(dir[1]) > 0.9 ? cross(dir, [1, 0, 0]) : cross(dir, [0, 1, 0]));
      const up = norm(cross(side, dir));
      const s = radius;
      const pointsA = [
        [a[0] + side[0] * s + up[0] * s, a[1] + side[1] * s + up[1] * s, a[2] + side[2] * s + up[2] * s],
        [a[0] - side[0] * s + up[0] * s, a[1] - side[1] * s + up[1] * s, a[2] - side[2] * s + up[2] * s],
        [a[0] - side[0] * s - up[0] * s, a[1] - side[1] * s - up[1] * s, a[2] - side[2] * s - up[2] * s],
        [a[0] + side[0] * s - up[0] * s, a[1] + side[1] * s - up[1] * s, a[2] + side[2] * s - up[2] * s]
      ];
      const pointsB = pointsA.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
      for (let i = 0; i < 4; i++) {
        quad(pointsA[i], pointsA[(i + 1) % 4], pointsB[(i + 1) % 4], pointsB[i], color);
      }
    }

    return { data, quad, box, beam };
  }

  function buildTheater() {
    const b = createBuilder();
    const concrete = [0.125, 0.122, 0.113];
    const darkConcrete = [0.065, 0.066, 0.064];
    const seat = [0.030, 0.036, 0.041];
    const seatHi = [0.080, 0.088, 0.094];
    const yellow = [0.46, 0.34, 0.075];
    const black = [0.006, 0.007, 0.008];
    const steel = [0.014, 0.016, 0.018];

    b.box([-92, -1.25, -42], [92, -1.05, 230], [0.045, 0.046, 0.044]);
    b.box([-42, -0.9, -38], [42, 1.1, -8], [0.018, 0.018, 0.019]);
    b.box([-52, 1.0, -42], [52, 31, -37], steel);
    b.box([-37, 1.2, -43], [37, 27, -36], [0.001, 0.001, 0.002]);

    for (let row = 0; row < 92; row++) {
      const z0 = 12 + row * 2.05;
      const z1 = z0 + 1.58;
      const y0 = row * 0.34;
      const y1 = y0 + 0.30;
      const halfW = 26 + z0 * 0.42;
      const aisle = 3.4 + z0 * 0.018;
      const concourse = row === 24 || row === 25 || row === 48 || row === 49 || row === 70 || row === 71;
      const c = concourse ? [0.160, 0.154, 0.140] : concrete;

      b.box([-halfW, y0, z0], [-aisle, y1, z1], c);
      b.box([aisle, y0, z0], [halfW, y1, z1], c);
      b.box([-aisle + 0.35, y0 + 0.02, z0], [aisle - 0.35, y0 + 0.10, z1], [0.115, 0.110, 0.100]);
      b.box([-aisle + 0.35, y0 + 0.11, z0 + 0.02], [aisle - 0.35, y0 + 0.16, z0 + 0.14], yellow);

      if (!concourse && row % 2 === 0) {
        const seatsPerSide = Math.max(8, Math.min(46, Math.floor(halfW / 2.05)));
        for (let side = -1; side <= 1; side += 2) {
          const inner = aisle + 1.0;
          const outer = halfW - 1.3;
          for (let i = 0; i < seatsPerSide; i++) {
            const t = seatsPerSide === 1 ? 0.5 : i / (seatsPerSide - 1);
            const x = side * mix(inner, outer, t);
            const w = mix(0.62, 0.95, Math.min(1, row / 30));
            const h = mix(0.34, 0.58, Math.min(1, row / 38));
            const d = 0.30;
            const color = (i + row) % 5 === 0 ? seatHi : seat;
            b.box([x - w * 0.5, y1 + 0.03, z0 + 0.50], [x + w * 0.5, y1 + h, z0 + 0.50 + d], color);
            b.box([x - w * 0.38, y1 - 0.07, z0 + 0.70], [x + w * 0.38, y1 + 0.08, z0 + 1.05], [0.018, 0.020, 0.023]);
          }
        }
      }
    }

    for (const x of [-70, -38, 38, 70]) {
      b.box([x - 0.7, -1.0, 8], [x + 0.7, 42, 9.4], black);
      b.box([x - 0.7, -1.0, 104], [x + 0.7, 45, 105.4], black);
    }

    for (let z = -18; z <= 220; z += 24) {
      b.beam([-86, 42, z], [86, 42, z + 4], 0.33, steel);
      b.beam([-86, 38, z], [86, 38, z], 0.22, steel);
    }

    for (let x = -88; x <= 88; x += 22) {
      b.beam([x, 40, -25], [0, 54, 95], 0.18, steel);
      b.beam([x, 39, 220], [0, 54, 95], 0.18, steel);
    }

    b.box([-92, 42, -42], [92, 43.0, 230], [0.012, 0.014, 0.016]);
    b.box([-35, 17, 22], [-24, 25, 23], [0.005, 0.006, 0.007]);
    b.box([24, 17, 22], [35, 25, 23], [0.005, 0.006, 0.007]);
    b.box([-7, 18, 50], [7, 25, 51], [0.005, 0.006, 0.007]);

    b.beam([-4, 0.3, 13], [-1.2, 30.0, 190], 0.12, [0.23, 0.23, 0.21]);
    b.beam([4, 0.3, 13], [1.2, 30.0, 190], 0.12, [0.23, 0.23, 0.21]);
    b.beam([-52, 7, 20], [-18, 28, 185], 0.10, [0.15, 0.15, 0.14]);
    b.beam([52, 7, 20], [18, 28, 185], 0.10, [0.15, 0.15, 0.14]);

    return new Float32Array(b.data);
  }

  window.createTheaterGeometryScene = function createTheaterGeometryScene(canvas, options) {
    const fail = options && options.fail ? options.fail : function (msg) { throw new Error(msg); };
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false
    }) || canvas.getContext("experimental-webgl");

    if (!gl) {
      fail("WebGL is not available.");
      return null;
    }

    const program = makeProgram(gl, `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_color;
uniform mat4 u_viewProj;
uniform vec3 u_camera;
varying vec3 v_color;
varying float v_fog;
varying float v_light;
void main() {
  vec4 world = vec4(a_position, 1.0);
  gl_Position = u_viewProj * world;
  float diff = max(dot(normalize(a_normal), normalize(vec3(-0.32, 0.72, -0.42))), 0.0);
  float rim = pow(max(1.0 - abs(dot(normalize(a_normal), normalize(u_camera - a_position))), 0.0), 2.0);
  v_light = 0.24 + diff * 0.62 + rim * 0.18;
  v_color = a_color;
  v_fog = clamp(length(u_camera - a_position) / 245.0, 0.0, 1.0);
}
`, `
precision highp float;
varying vec3 v_color;
varying float v_fog;
varying float v_light;
void main() {
  vec3 fog = vec3(0.055, 0.060, 0.062);
  vec3 col = v_color * v_light;
  col = mix(col, fog, v_fog * 0.46);
  gl_FragColor = vec4(col, 1.0);
}
`);

    const data = buildTheater();
    const stride = 9 * 4;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    const locPos = gl.getAttribLocation(program, "a_position");
    const locNormal = gl.getAttribLocation(program, "a_normal");
    const locColor = gl.getAttribLocation(program, "a_color");
    const locViewProj = gl.getUniformLocation(program, "u_viewProj");
    const locCamera = gl.getUniformLocation(program, "u_camera");

    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(locNormal);
    gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(locColor);
    gl.vertexAttribPointer(locColor, 3, gl.FLOAT, false, stride, 6 * 4);

    const state = {
      progress: 0,
      space: false,
      lookX: 0,
      lookY: 0,
      targetLookX: 0,
      targetLookY: 0,
      dragging: false,
      startX: 0,
      startY: 0,
      startLookX: 0,
      startLookY: 0,
      last: performance.now()
    };

    function resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        state.space = true;
      }
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        state.space = false;
      }
    }, { passive: false });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.startLookX = state.targetLookX;
      state.startLookY = state.targetLookY;
      canvas.setPointerCapture(event.pointerId);
    }, { passive: false });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      event.preventDefault();
      const size = Math.max(1, Math.min(window.innerWidth, window.innerHeight));
      state.targetLookX = clamp(state.startLookX + (event.clientX - state.startX) / size * 1.6, -1.0, 1.0);
      state.targetLookY = clamp(state.startLookY - (event.clientY - state.startY) / size * 1.1, -1.0, 1.0);
    }, { passive: false });

    function release() {
      state.dragging = false;
    }

    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("lostpointercapture", release);

    function camera(progress) {
      const descend = smoothstep(0.00, 0.66, progress);
      const side = smoothstep(0.64, 0.82, progress);
      const center = smoothstep(0.82, 0.96, progress);
      const turn = smoothstep(0.88, 1.00, progress);

      let eye = [
        mix(0, 0, descend),
        mix(34, 4.0, descend),
        mix(198, 7, descend)
      ];
      eye = [
        mix(eye[0], -50, side),
        mix(eye[1], 3.4, side),
        mix(eye[2], -11, side)
      ];
      eye = [
        mix(eye[0], 0, center),
        mix(eye[1], 4.4, center),
        mix(eye[2], -22, center)
      ];

      let target = [
        mix(0, -10, side),
        mix(1.8, 2.4, side),
        mix(-26, -20, side)
      ];
      target = [
        mix(target[0], 0, turn),
        mix(target[1], 22, turn),
        mix(target[2], 125, turn)
      ];
      target[0] += state.lookX * 22;
      target[1] += state.lookY * 11;

      return { eye, target };
    }

    function frame(now) {
      resize();
      const dt = Math.min(0.05, Math.max(0, (now - state.last) * 0.001));
      state.last = now;

      if (state.space) state.progress = clamp(state.progress + dt * 0.070, 0, 1);

      if (!state.dragging) {
        const recenter = 1 - Math.pow(0.0008, dt);
        state.targetLookX += (0 - state.targetLookX) * recenter;
        state.targetLookY += (0 - state.targetLookY) * recenter;
      }

      const follow = 1 - Math.pow(0.0002, dt);
      state.lookX += (state.targetLookX - state.lookX) * follow;
      state.lookY += (state.targetLookY - state.lookY) * follow;

      const cam = camera(state.progress);
      const proj = perspective(58 * Math.PI / 180, canvas.width / canvas.height, 0.08, 420);
      const view = lookAt(cam.eye, cam.target, [0, 1, 0]);
      const vp = mul4(proj, view);

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clearColor(0.006, 0.007, 0.008, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(locViewProj, false, new Float32Array(vp));
      gl.uniform3f(locCamera, cam.eye[0], cam.eye[1], cam.eye[2]);
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    return { gl, vertexCount: data.length / 9 };
  };
})();
