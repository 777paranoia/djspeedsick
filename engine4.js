(function () {
  function z4ResolveSources() {
    const out = {
      elevatorVert: window.GLSL && window.GLSL.modules ? GLSL.modules.elevator_vert : "",
      elevatorFrag: window.GLSL && window.GLSL.modules ? GLSL.modules.elevator : "",
      stationVertMesh:
        (window.GLSL && window.GLSL.engine4 && GLSL.engine4.vert_mesh) ||
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_vert_mesh) ||
        "",
      stationVertScreen:
        (window.GLSL && window.GLSL.engine4 && GLSL.engine4.vert_screen) ||
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_vert_screen) ||
        "",
      stationBgCore:
        (window.GLSL && window.GLSL.engine4 && GLSL.engine4.station_bg_core) ||
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_bg_core) ||
        "",
      stationBgFrag:
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_bg) || "",
      stationMeshFrag:
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_mesh) || "",
    };
    out.stationBgCombined = out.stationBgCore + "\n" + out.stationBgFrag;
    return out;
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
   function z4BuildPsychStationShader() {
    return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_eye;
uniform vec3 u_forward;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_targetDir;
uniform sampler2D u_env;
uniform float u_blink;
uniform float u_trip;
uniform float u_modeSeed;
uniform float u_modeTime;
uniform float u_isOOB;
uniform float u_fractalSeed;
uniform float u_blinkAge;

#define MAX_STEPS 90
#define MAX_DIST 70.0
#define SURF_DIST 0.001

float hash1(float x){return fract(sin(x*127.1 + 1.9898)*43758.5);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(
    mix(hash2(i+vec2(0.0,0.0)),hash2(i+vec2(1.0,0.0)),u.x),
    mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),u.x),
    u.y
  );
}

float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){
    v+=a*noise2(p);
    p=rot(0.5)*p*2.0+vec2(100.0);
    a*=0.5;
  }
  return v;
}

float sdFractal(vec3 p, float power, float rotA, float rotB){
  vec3 z = p;
  z.xz *= rot(u_time * rotA);
  z.yz *= rot(u_time * rotB);
  float scale = 1.0;
  vec3 foldOffset = vec3(0.6) + vec3(0.15) * sin(u_time * 0.15 + power);
  for(int i=0; i<8; i++){
    z=abs(z);
    if(z.x<z.y) z.xy=z.yx;
    if(z.x<z.z) z.xz=z.zx;
    if(z.y<z.z) z.yz=z.zy;
    z=z*2.0-foldOffset;
    scale*=2.0;
  }
  return (length(z) - 0.2) / scale;
}

vec3 neonPalette(float t){
  return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.00, 0.33, 0.67)));
}

vec3 sickPal(float t, float seed){
  vec3 a=vec3(0.5,0.4,0.45);
  vec3 b=vec3(0.5,0.35,0.5);
  vec3 c=vec3(1.0,0.8,1.0);
  vec3 d=vec3(hash1(seed)*0.5,hash1(seed+1.0)*0.3+0.1,hash1(seed+2.0)*0.4+0.3);
  return a+b*cos(6.28318*(c*t+d));
}

float burningShip(vec2 c){
  vec2 z=vec2(0.0); float si=0.0;
  for(int n=0; n<48; n++){
    z=vec2(abs(z.x),abs(z.y));
    z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
    float esc=step(4.0,dot(z,z));
    si += (1.0-esc);
  }
  return si/48.0;
}

float juliaSet(vec2 z, vec2 c){
  float si=0.0;
  for(int n=0; n<36; n++){
    z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
    si += (1.0-step(4.0,dot(z,z)));
  }
  return si/36.0;
}

float clifford(vec2 p, float seed){
  float a =  1.5 + sin(seed * 1.3) * 0.5;
  float b = -1.8 + cos(seed * 0.7) * 0.4;
  float c = -1.9 + sin(seed * 2.1) * 0.4;
  float d =  0.4 + cos(seed * 1.7) * 0.4;
  float x = p.x * 0.6;
  float y = p.y * 0.6;
  float density = 0.0;
  for(int i=0; i<32; i++){
    float nx = sin(a*y) + c*cos(a*x);
    float ny = sin(b*x) + d*cos(b*y);
    x=nx; y=ny;
    density += exp(-length(vec2(x,y)-p*0.6)*2.0);
  }
  return clamp(density * 0.08, 0.0, 1.0);
}

vec3 applyHallucination(vec3 baseCol, vec2 screenUV, float fractalSeed, float blinkAge, float trip, float time){
  if(trip < 0.05) return baseCol;
  float r = length(screenUV);
  float periph = smoothstep(0.25, 0.9, r);
  float surge = smoothstep(6.0, 0.0, blinkAge) * 0.35;
  float strength = (trip * 0.15 + surge) * periph;
  if(strength < 0.005) return baseCol;

  float typeRoll = hash1(fractalSeed * 3.7);
  float zoom = mix(0.6, 3.0, hash1(fractalSeed * 1.3));
  vec2 drift = vec2(sin(time*0.03+fractalSeed)*0.2, cos(time*0.02+fractalSeed*1.7)*0.2);
  vec2 sUV = screenUV / zoom + drift;
  float val = 0.0;

  if(typeRoll < 0.4) {
    vec2 region = vec2(-1.76, -0.028) + vec2(hash1(fractalSeed*5.1)-0.5, hash1(fractalSeed*7.3)-0.5)*0.3;
    val = burningShip(sUV * 0.5 + region);
  } else if(typeRoll < 0.7) {
    vec2 jc = vec2(-0.8+sin(time*0.015+fractalSeed)*0.15, 0.156+cos(time*0.012)*0.1);
    val = juliaSet(sUV * 0.8, jc);
  } else {
    val = clifford(sUV * 1.5, fractalSeed);
  }

  val = fract(val * 3.5 + time * 0.04);
  vec3 fracCol = sickPal(val, fractalSeed * 11.3);
  fracCol *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);
  float pulse = 0.55 + 0.45 * sin(time * 0.9 + fractalSeed);
  float grain = (hash2(screenUV * 400.0 + floor(time * 24.0) * 7.3) - 0.5) * trip * 0.08;
  float vignette = smoothstep(0.3, 1.1, r) * trip * 0.12 * (0.5 + 0.5 * sin(time * 0.7));

  vec3 result = baseCol;
  result += fracCol * strength * pulse;
  result += vec3(grain);
  result = mix(result, result * vec3(0.85, 0.7, 0.75), vignette);
  return result;
}

vec3 colorPickover(vec3 p){
  vec2 c = vec2(
    p.x * 0.4 + sin(u_time * 0.07) * 0.3,
    p.y * 0.4 + cos(u_time * 0.05) * 0.3
  );
  vec2 z = vec2(0.0);
  float minDist = 1e10;
  float escapeI = 0.0;
  for(int i = 0; i < 80; i++) {
    z = clamp(vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c, -1000.0, 1000.0);
    float d = min(abs(z.x), abs(z.y));
    if(d < minDist) minDist = d;
    if(dot(z,z) > 100.0){
      escapeI = float(i);
      break;
    }
  }
  return neonPalette(fract(clamp(minDist * 8.0, 0.0, 1.0) * 2.0 + u_time * 0.15 + escapeI * 0.01)) * (0.4 + 0.6 * (1.0 - clamp(minDist * 8.0, 0.0, 1.0)));
}

vec2 mapScene(vec3 p){
  vec2 res=vec2(1000.0,-1.0);
  for(float i=0.0; i<2.0; i++){
    float id = 37.0 + i;
    float x = mix(-1.4,  1.4,  hash1(id * 3.1 + 0.13));
    float y = mix( 0.0,  1.6,  hash1(id * 7.3 + 0.27));
    float z = mix( 0.0,  3.5,  hash1(id * 11.7 + 0.41));
    float sc = mix(0.3, 0.6, hash1(id * 13.1)) * 0.7;
    vec3 fp = p - vec3(x,y,z);
    float bound = length(fp) - (sc * 1.5);
    float df = bound;
    if(bound < 0.2){
      df = max(
        bound,
        sdFractal(
          fp/sc,
          mix(6.0,10.0,hash1(id*5.3))+sin(u_time*mix(0.03,0.08,hash1(id*2.1)))*1.5,
          mix(0.05,0.18,hash1(id*9.7))*(hash1(id*4.1)>0.5?1.0:-1.0),
          mix(0.04,0.14,hash1(id*6.3))*(hash1(id*8.9)>0.5?1.0:-1.0)
        ) * sc
      );
    }
    if(df < res.x) res = vec2(df, 10.0);
  }
  return res;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  vec2 screenUV = uv;

  vec2 q = vec2(
    fbm(uv * 2.0 + vec2(0.0, u_time * 0.15)),
    fbm(uv * 2.0 + vec2(u_time * 0.15, 0.0))
  );
  vec2 warpR = vec2(
    fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * u_time * 0.15),
    fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * u_time * 0.15)
  );
  float liqAmp = mix(0.015, 0.10, u_isOOB) * u_trip;
  uv += (warpR - 0.5) * liqAmp;

  float mt = u_modeTime * u_isOOB;
  float w1 = sin(mt * 0.4 + u_modeSeed);
  float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
  float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
  float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
  float snap  = pow(surge, 2.0) * 8.0 * u_isOOB;
  uv *= 1.0 + mt * 0.003 + snap * 0.015;

  float gTick = floor(u_time * 16.0);
  if(step(0.979, hash1(gTick * 133.77 + u_modeSeed)) > 0.0)
    uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5)
      * 0.18 * clamp(u_trip, 0.0, 1.5);

  vec3 ro=u_eye;
  ro.y += snap * 0.08;
  vec3 rd=normalize(u_forward*1.55 + uv.x*u_right + uv.y*u_up);

  vec3 tgt = normalize(u_targetDir);
  vec3 worldUp = vec3(0.0,1.0,0.0);
  vec3 tgtRight = normalize(cross(worldUp, tgt));
  if(length(tgtRight) < 0.001) tgtRight = vec3(1.0,0.0,0.0);
  vec3 tgtUp = normalize(cross(tgt, tgtRight));

  vec3 deepBg = vec3(0.0);
  float star = step(0.9985, hash2(floor(rd.xy*900.0)+floor(rd.z*300.0)));
  deepBg += vec3(0.65,0.72,0.84)*star*0.35;

  float t = 0.0;
  vec2 hit = vec2(0.0);
  for(int i=0; i<MAX_STEPS; i++){
    hit = mapScene(ro + rd * t);
    if(hit.x < SURF_DIST || t > MAX_DIST) break;
    t += hit.x;
  }

  vec3 col = deepBg;
  if(t < MAX_DIST){
    vec3 p = ro + rd * t;
    if(hit.y >= 10.0){
      vec3 fracCol = colorPickover(p);
      col = mix(col, fracCol, 0.28 + 0.22 * u_trip);
      col += neonPalette(length(p.xy) * 0.7 + u_time * 0.2) * 0.08 * u_trip;
    }
  }

  float lx = dot(rd, tgtRight);
  float ly = dot(rd, tgtUp);
  float lz = dot(rd, tgt);
  if(lz > 0.0){
    vec2 plane = vec2(lx, ly) / max(lz, 0.0001);
    float earthRadius = 0.72;
    float d = length(plane);
    if(d < earthRadius){
      vec2 normP = plane / earthRadius;
      vec2 envUV = vec2(
        0.5 + normP.x * 0.44,
        0.50 - normP.y * 0.44 + 0.06
      );
      envUV = vec2(1.0 - envUV.x, 1.0 - envUV.y);
      vec3 earthCol = texture2D(u_env, clamp(envUV, 0.0, 1.0)).rgb;
      float mask = smoothstep(1.0, 0.94, d);
      float rim = smoothstep(0.96, 1.0, 1.0 - d);
      earthCol += vec3(0.10,0.22,0.55) * rim * 0.45;
      col = mix(col, earthCol, mask);
    }
  }

  col = applyHallucination(col, screenUV, u_fractalSeed, u_blinkAge, u_trip, u_time);
  col *= (1.0 - u_blink);
  float vign=1.0-0.22*pow(length(screenUV*vec2(0.9,1.0)),2.0);
  col*=vign;
  col=1.0-exp(-col*1.10);
  gl_FragColor=vec4(col,1.0);
}
`;
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

  if (!window.__z4InputInstalled) {
    window.__z4InputInstalled = true;
    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
        z4SpaceHeld = true;
        window.z4SpaceHeld = true;
      }
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        window.__z4TurnRequested = true;
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

  // --- Camera drag tracking (no snap-back) ---
  window.__z4CameraDragActive = false;
  window.__z4CameraDragX = 0;
  window.__z4CameraDragY = 0;

  function onPointerStart(e) {
    window.__z4CameraDragActive = true;
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    window.__z4CameraDragX = (clientX / window.innerWidth) * 2 - 1;
    window.__z4CameraDragY = (clientY / window.innerHeight) * 2 - 1;
  }

  function onPointerMove(e) {
    if (!window.__z4CameraDragActive) return;
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    window.__z4CameraDragX = (clientX / window.innerWidth) * 2 - 1;
    window.__z4CameraDragY = (clientY / window.innerHeight) * 2 - 1;
  }

  function onPointerEnd() {
    window.__z4CameraDragActive = false;
    // Do NOT reset __z4CameraDragX/Y – keep last position as target
  }

  window.addEventListener('mousedown', onPointerStart);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerEnd);
  window.addEventListener('touchstart', onPointerStart, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerEnd);
  window.addEventListener('touchcancel', onPointerEnd);

  class Zone4Engine {
    constructor() {
      const src = z4ResolveSources();
      src.stationBgCombined = z4BuildPsychStationShader();

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
      this.dragTargetX = 0;
      this.dragTargetY = 0;

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
      this.z4Trip = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4ModeTime = 0.0;
      this.z4IsOOB = 1.0;
      this.z4FractalSeed = Math.random() * 1000.0;
      this.z4BlinkPeakTime = performance.now();

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
      this.turnAnimating = false;
      this.turnStart = 0;
      this.turnFrom = 1;
      this.turnTo = -1;
      this.turnDuration = 600;

      this.neuralIntensity = 0.75;

      this.elevatorProg = this._buildRawProgram(src.elevatorVert, src.elevatorFrag);
      this.stationBgProg = this._buildRawProgram(
        src.stationVertScreen,
        src.stationBgCombined
      );
      this.stationMeshProg = this._buildRawProgram(
        src.stationVertMesh,
        src.stationMeshFrag
      );
      this.overlayProg = this._buildOverlayProgram();

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
        col: gl.getUniformLocation(prog, "u_col"),
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

    _initStationTextures() {
      const base = "files/img/rooms/z4/";
      const tex = {
        floor: loadStaticTex(base + "SPACE-FLOOR.png"),
        ceil: loadStaticTex(base + "SPACE-CEILING.png"),
        lp1: loadStaticTex(base + "SPACE-LP1.png"),
        lp2: loadStaticTex(base + "SPACE-LP2.png"),
        lp3: loadStaticTex(base + "SPACE-LP3.png"),
        rp1: loadStaticTex(base + "SPACE-RP1.png"),
        rp2: loadStaticTex(base + "SPACE-RP2.png"),
        rp3: loadStaticTex(base + "SPACE-RP3.png"),
        winT: loadStaticTex(base + "SPACE-WINDOW-T.png"),
        winC: loadStaticTex(base + "SPACE-WINDOW-C.png"),
        winB: loadStaticTex(base + "SPACE-WINDOW-B.png"),
        black: this._makeSolidTexture(10, 10, 12, 255),
        earth: this._makeSolidTexture(0, 0, 0, 255),
      };
      this.earthVideo = this._claimLoopingVideo("files/mov/earth.mp4");
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
        blend: !!blend,
      };
    }

    _buildStationMeshes() {
      const SECTION_COUNT = 16;
      const RING_RADIUS = 15.5;
      const SECTION_ANGLE = (Math.PI * 2) / SECTION_COUNT;
      const FLOOR_Y = -1.05;
      const CEIL_Y = 1.18;
      const INNER_W = -2.35;
      const OUTER_W = 2.35;
      const LEFT_MID_TOP = 0.60;
      const LEFT_MID_BOT = -0.40;
      const RIGHT_MID_TOP = 0.60;
      const RIGHT_MID_BOT = -0.40;
      const LEFT_TOP_X = -1.70;
      const RIGHT_TOP_X = 1.70;
      const LEFT_LOW_X = -1.85;
      const RIGHT_LOW_X = 1.85;

      const meshes = this.stationMeshes;
      const TEX = this.stationTextures;

      function normalize(v) {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
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
      function sectionFrame(a) {
        const center = [Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS];
        const radial = normalize([Math.cos(a), 0, Math.sin(a)]);
        const tangent = normalize([-Math.sin(a), 0, Math.cos(a)]);
        return { center: center, radial: radial, tangent: tangent, up: [0, 1, 0] };
      }
      function pointOnFrame(f, x, y) {
        return [
          f.center[0] + f.radial[0] * x + f.up[0] * y,
          f.center[1] + f.radial[1] * x + f.up[1] * y,
          f.center[2] + f.radial[2] * x + f.up[2] * y,
        ];
      }
      function pushTri(arr, p0, p1, p2, n0, n1, n2, u0, v0, u1, v1, u2, v2) {
        arr.push(
          p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], u0, v0,
          p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], u1, v1,
          p2[0], p2[1], p2[2], n2[0], n2[1], n2[2], u2, v2
        );
      }
      function quadNormal(a, b, c) {
        return normalize(cross(sub(b, a), sub(c, a)));
      }
      function pushQuad(arr, p00, p10, p11, p01, uv00, uv10, uv11, uv01) {
        const n = quadNormal(p00, p10, p11);
        pushTri(arr, p00, p10, p11, n, n, n, uv00[0], uv00[1], uv10[0], uv10[1], uv11[0], uv11[1]);
        pushTri(arr, p00, p11, p01, n, n, n, uv00[0], uv00[1], uv11[0], uv11[1], uv01[0], uv01[1]);
      }

      const self = this;

      function addSection(i) {
        const a0 = i * SECTION_ANGLE;
        const a1 = (i + 1) * SECTION_ANGLE;
        const f0 = sectionFrame(a0);
        const f1 = sectionFrame(a1);

        const pts = {
          fl0: pointOnFrame(f0, INNER_W, FLOOR_Y),
          fl1: pointOnFrame(f1, INNER_W, FLOOR_Y),
          fr0: pointOnFrame(f0, OUTER_W, FLOOR_Y),
          fr1: pointOnFrame(f1, OUTER_W, FLOOR_Y),

          c0l: pointOnFrame(f0, LEFT_TOP_X, CEIL_Y),
          c1l: pointOnFrame(f1, LEFT_TOP_X, CEIL_Y),
          c0r: pointOnFrame(f0, RIGHT_TOP_X, CEIL_Y),
          c1r: pointOnFrame(f1, RIGHT_TOP_X, CEIL_Y),

          llb0: pointOnFrame(f0, LEFT_LOW_X, FLOOR_Y),
          llb1: pointOnFrame(f1, LEFT_LOW_X, FLOOR_Y),
          llm0: pointOnFrame(f0, INNER_W, LEFT_MID_BOT),
          llm1: pointOnFrame(f1, INNER_W, LEFT_MID_BOT),

          lmt0: pointOnFrame(f0, INNER_W, LEFT_MID_TOP),
          lmt1: pointOnFrame(f1, INNER_W, LEFT_MID_TOP),

          lub0: pointOnFrame(f0, LEFT_TOP_X, CEIL_Y),
          lub1: pointOnFrame(f1, LEFT_TOP_X, CEIL_Y),

          rlb0: pointOnFrame(f0, RIGHT_LOW_X, FLOOR_Y),
          rlb1: pointOnFrame(f1, RIGHT_LOW_X, FLOOR_Y),
          rlm0: pointOnFrame(f0, OUTER_W, RIGHT_MID_BOT),
          rlm1: pointOnFrame(f1, OUTER_W, RIGHT_MID_BOT),
          rmt0: pointOnFrame(f0, OUTER_W, RIGHT_MID_TOP),
          rmt1: pointOnFrame(f1, OUTER_W, RIGHT_MID_TOP),
          rub0: pointOnFrame(f0, RIGHT_TOP_X, CEIL_Y),
          rub1: pointOnFrame(f1, RIGHT_TOP_X, CEIL_Y),
        };

        {
          const q = [];
          pushQuad(q, pts.fl0, pts.fr0, pts.fr1, pts.fl1, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));
        }
        {
          const q = [];
          pushQuad(q, pts.c0r, pts.c0l, pts.c1l, pts.c1r, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));
        }

        if (i !== 8) {
          const leftIsWindow = (i % 4 === 0);
          {
            const q = [];
            pushQuad(q, pts.llb0, pts.llm0, pts.llm1, pts.llb1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1));
          }
          if (!leftIsWindow) {
            const q = [];
            pushQuad(q, pts.llm0, pts.lmt0, pts.lmt1, pts.llm1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));
          }
          {
            const q = [];
            pushQuad(q, pts.lmt0, pts.lub0, pts.lub1, pts.lmt1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1));
          }
        }

        if (i === 8) {
          const hallHalfW = 1.15;

          const a0 = i * (Math.PI * 2 / SECTION_COUNT);
          const a1 = (i + 1) * (Math.PI * 2 / SECTION_COUNT);
          const amid = (i + 0.5) * (Math.PI * 2 / SECTION_COUNT);
          const fmid = sectionFrame(amid);

          const doorL = [
            fmid.center[0] + fmid.radial[0] * INNER_W + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * INNER_W + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR = [
            fmid.center[0] + fmid.radial[0] * INNER_W + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * INNER_W + fmid.tangent[2] * hallHalfW
          ];

          {
            const p00 = pointOnFrame(sectionFrame(a0), INNER_W, FLOOR_Y);
            const p10 = [doorL[0], FLOOR_Y, doorL[2]];
            const p11 = [doorL[0], LEFT_MID_BOT, doorL[2]];
            const p01 = pointOnFrame(sectionFrame(a0), INNER_W, LEFT_MID_BOT);
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const p00 = pointOnFrame(sectionFrame(a0), INNER_W, LEFT_MID_TOP);
            const p10 = [doorL[0], LEFT_MID_TOP, doorL[2]];
            const p11 = [doorL[0], CEIL_Y, doorL[2]];
            const p01 = pointOnFrame(sectionFrame(a0), INNER_W, CEIL_Y);
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }

          {
            const p00 = [doorR[0], FLOOR_Y, doorR[2]];
            const p10 = pointOnFrame(sectionFrame(a1), INNER_W, FLOOR_Y);
            const p11 = pointOnFrame(sectionFrame(a1), INNER_W, LEFT_MID_BOT);
            const p01 = [doorR[0], LEFT_MID_BOT, doorR[2]];
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const p00 = [doorR[0], LEFT_MID_TOP, doorR[2]];
            const p10 = pointOnFrame(sectionFrame(a1), INNER_W, LEFT_MID_TOP);
            const p11 = pointOnFrame(sectionFrame(a1), INNER_W, CEIL_Y);
            const p01 = [doorR[0], CEIL_Y, doorR[2]];
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }
        }

        {
          const rightIsWindow = ((i + 2) % 4 === 0);
          if (!rightIsWindow) {
            const q = [];
            pushQuad(q, pts.rlb0, pts.rlm0, pts.rlm1, pts.rlb1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
          }
          {
            const q = [];
            pushQuad(q, pts.rlm0, pts.rmt0, pts.rmt1, pts.rlm1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, rightIsWindow ? TEX.winC : TEX.rp2, [1, 1, 1], 1));
          }
          if (!rightIsWindow) {
            const q = [];
            pushQuad(q, pts.rmt0, pts.rub0, pts.rub1, pts.rmt1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
          }
        }

        const start = sectionFrame(a0);
        const end = sectionFrame(a0 + 0.012);
        const framePts = [
          [INNER_W, FLOOR_Y],
          [INNER_W, LEFT_MID_BOT],
          [INNER_W, LEFT_MID_TOP],
          [LEFT_TOP_X, CEIL_Y],
          [RIGHT_TOP_X, CEIL_Y],
          [OUTER_W, RIGHT_MID_TOP],
          [OUTER_W, RIGHT_MID_BOT],
          [OUTER_W, FLOOR_Y],
        ];
        for (let k = 0; k < framePts.length - 1; k++) {
          const a = pointOnFrame(start, framePts[k][0], framePts[k][1]);
          const b = pointOnFrame(start, framePts[k + 1][0], framePts[k + 1][1]);
          const c = pointOnFrame(end, framePts[k + 1][0], framePts[k + 1][1]);
          const d = pointOnFrame(end, framePts[k][0], framePts[k][1]);
          const q = [];
          pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
        }
      }

      for (let i = 0; i < SECTION_COUNT; i++) addSection(i);

      (function addBay() {
        const i = 8;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);

        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }

        const halfW = Math.sin(SECTION_ANGLE * 0.5) * RING_RADIUS * 0.92;
        const depth = 6.2;
        const x0 = -8.0;
        const x1 = x0 - depth;
        const y0 = FLOOR_Y;
        const y1 = CEIL_Y * 0.92;
        const z0 = -halfW;
        const z1 = halfW;

        let q = [];

        q = [];
        pushQuad(
          q,
          pointLocal(x0, y0, z0), pointLocal(x0, y0, z1), pointLocal(x1, y0, z1), pointLocal(x1, y0, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(x0, y1, z1), pointLocal(x0, y1, z0), pointLocal(x1, y1, z0), pointLocal(x1, y1, z1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(x0, y0, z0), pointLocal(x1, y0, z0), pointLocal(x1, y1, z0), pointLocal(x0, y1, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(x1, y0, z1), pointLocal(x0, y0, z1), pointLocal(x0, y1, z1), pointLocal(x1, y1, z1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(x1, y0, z0), pointLocal(x1, y0, z1), pointLocal(x1, y1, z1), pointLocal(x1, y1, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.015, 0.02, 0.04], 0));

        const cx = x1 + 0.04;
        const cy0 = y0 + 0.20;
        const cy1 = y1 - 0.18;
        const cz0 = z0 + 0.34;
        const cz1 = z1 - 0.34;

        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0), pointLocal(cx, cy0, cz1), pointLocal(cx, cy0 + 0.12, cz1), pointLocal(cx, cy0 + 0.12, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy1 - 0.12, cz0), pointLocal(cx, cy1 - 0.12, cz1), pointLocal(cx, cy1, cz1), pointLocal(cx, cy1, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0), pointLocal(cx, cy0, cz0 + 0.12), pointLocal(cx, cy1, cz0 + 0.12), pointLocal(cx, cy1, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz1 - 0.12), pointLocal(cx, cy0, cz1), pointLocal(cx, cy1, cz1), pointLocal(cx, cy1, cz1 - 0.12),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(x1 + 0.55, y0 + 0.10, cz0 + 0.16),
          pointLocal(x1 + 0.55, y0 + 0.10, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz0 + 0.16),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));
      })();

      (function addHallway() {
        const i = 8;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);

        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }

        var hx0 = -8.0;
        var hx1 = INNER_W + 0.02;
        var hy0 = FLOOR_Y;
        var hy1 = CEIL_Y * 0.88;
        var hallHalfW = 1.15;
        var hz0 = -hallHalfW;
        var hz1 = hallHalfW;
        var q;

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx0, hy0, hz1),
          pointLocal(hx1, hy0, hz1), pointLocal(hx1, hy0, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy1, hz1), pointLocal(hx0, hy1, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx1, hy0, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx0, hy1, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx1, hy0, hz1), pointLocal(hx0, hy0, hz1),
          pointLocal(hx0, hy1, hz1), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));

        var trimW = 0.04;

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz0), pointLocal(hx1, hy0 + 0.01, hz0),
          pointLocal(hx1, hy0 + 0.01, hz0 + trimW), pointLocal(hx0, hy0 + 0.01, hz0 + trimW),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz1 - trimW), pointLocal(hx1, hy0 + 0.01, hz1 - trimW),
          pointLocal(hx1, hy0 + 0.01, hz1), pointLocal(hx0, hy0 + 0.01, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
      })();
    }

    _updateBlink(now) {
      if (now - this.lastBlinkTime > this.nextBlinkInterval) {
        this.blinking = true;
        this.blinkStart = now;
        this.lastBlinkTime = now;
        this.nextBlinkInterval = 4000 + Math.random() * 7000;
        this.z4ModeSeed = Math.random() * 1000.0;
        this.z4FractalSeed = this.z4ModeSeed;
        this.z4BlinkPeakTime = now;
      }

      this.rBlink = 0;
      if (this.blinking) {
        const e = now - this.blinkStart;
        if (e < 120) this.rBlink = e / 120;
        else if (e < 220) this.rBlink = 1;
        else if (e < 340) this.rBlink = 1 - (e - 220) / 120;
        else {
          this.rBlink = 0;
          this.blinking = false;
        }
      }
    }

    _updatePhase(now, dt) {
      const moving = z4SpaceHeld || z4TouchHeld;

      if (this.shakeIntensity > 0) {
        this.shakeOffsetX = Math.sin(now * 0.037) * Math.cos(now * 0.029) * this.shakeIntensity;
        this.shakeOffsetY = Math.cos(now * 0.031) * Math.sin(now * 0.043) * this.shakeIntensity;
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
        }
        this.neuralIntensity = 2.3;

      } else if (this.phase === "ring") {
        if (this.turnAnimating) {
          var turnElapsed = now - this.turnStart;
          var turnT = Math.min(1, turnElapsed / this.turnDuration);
          turnT = turnT * turnT * (3 - 2 * turnT);
          this.ringDirection = this.turnFrom + (this.turnTo - this.turnFrom) * turnT;
          if (turnElapsed >= this.turnDuration) {
            this.ringDirection = this.turnTo;
            this.turnAnimating = false;
          }
        }

        if (window.__z4TurnRequested && !this.turnAnimating) {
          window.__z4TurnRequested = false;
          this.turnAnimating = true;
          this.turnStart = now;
          this.turnFrom = this.ringDirection > 0 ? 1 : -1;
          this.turnTo = -this.turnFrom;
        }
        window.__z4TurnRequested = false;

        if (moving) this.ringU = (this.ringU + dt * 0.26 * this.ringDirection) % (Math.PI * 2);
        if (this.ringU < 0) this.ringU += Math.PI * 2;
        this.neuralIntensity = 2.2;
      }
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

    _renderElevator(now) {
      if (!this.elevatorProg) return;

      gl.disable(gl.DEPTH_TEST);
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

    _computeStationCamera() {
      const angle = this.ringU;
      const frame = this._stationFrame(angle);
      const SECTION_ANGLE = (Math.PI * 2) / 16;

      let eye;
      let baseForward;

      if (this.phase === "bay") {
        const bayBackX = -13.5;
        const bayDoorX = -8.0;
        const y = -0.02;
        const walkX = bayBackX + (bayDoorX - bayBackX) * this.walkoff;
        eye = this._add(frame.center, this._add(this._mul(frame.radial, walkX), [0, y, 0]));
        baseForward = frame.radial.slice();

      } else if (this.phase === "hallway") {
        const hallStart = -8.0;
        const hallEnd = -2.33;
        const y = -0.02;
        const walkX = hallStart + (hallEnd - hallStart) * this.hallwayT;
        eye = this._add(frame.center, this._add(this._mul(frame.radial, walkX), [0, y, 0]));
        baseForward = frame.radial.slice();

      } else if (this.phase === "entering_ring") {
        var t = this.enterRingT;
        t = t * t * (3 - 2 * t);
        var hallEye = this._add(frame.center, this._add(this._mul(frame.radial, -2.33), [0, -0.02, 0]));
        var ringEye = this._add(frame.center, [0, -0.02, 0]);
        eye = this._mix3(hallEye, ringEye, t);
        var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
        var ringFwd = this._mul(frame.tangent, dir);
        baseForward = this._normalize(this._mix3(frame.radial, ringFwd, t));

      } else {
        eye = this._add(frame.center, [0, -0.02, 0]);
        var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
        baseForward = this._mul(frame.tangent, dir);
      }

      let fwd = baseForward.slice();
      fwd = this._rotateAroundAxis(fwd, [0, 1, 0], -this.cx * 1.0);

      let right = this._normalize(this._cross(fwd, [0, 1, 0]));
      fwd = this._rotateAroundAxis(fwd, right, -this.cy * 0.6);
      right = this._normalize(this._cross(fwd, [0, 1, 0]));
      const up = this._normalize(this._cross(right, fwd));

      if (this.shakeIntensity > 0) {
        eye = this._add(eye, this._mul(right, this.shakeOffsetX));
        eye = this._add(eye, this._mul(up, this.shakeOffsetY));
      }

      return {
        eye: eye,
        forward: this._normalize(fwd),
        right: right,
        up: up,
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
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_texMix"), mesh.texMix);
      gl.uniform3f(
        gl.getUniformLocation(this.stationMeshProg, "u_flatCol"),
        mesh.flatCol[0], mesh.flatCol[1], mesh.flatCol[2]
      );
    }

    _renderStation(now) {
      if (!this.stationBgProg || !this.stationMeshProg) return;

      this._updateVideoTexture(this.stationTextures.earth, this.earthVideo);

      const cam = this._computeStationCamera();
      const eye = cam.eye;
      const fwd = cam.forward;
      const right = cam.right;
      const up = cam.up;

      const proj = this._perspective(Math.PI / 3.2, canvas.width / canvas.height, 0.05, 220.0);
      const view = this._lookAt(eye, this._add(eye, fwd), [0, 1, 0]);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.01, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.stationBgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);

      const bgPos = gl.getAttribLocation(this.stationBgProg, "a_pos");
      gl.enableVertexAttribArray(bgPos);
      gl.vertexAttribPointer(bgPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(this.stationBgProg, "u_res"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_time"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_trip"), this.z4Trip);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_isOOB"), this.z4IsOOB);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_blinkAge"), 0.001 * (now - this.z4BlinkPeakTime));
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_eye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_forward"), fwd[0], fwd[1], fwd[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_right"), right[0], right[1], right[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_up"), up[0], up[1], up[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_targetDir"), 1.0, 0.0, 0.0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.earth);
      gl.uniform1i(gl.getUniformLocation(this.stationBgProg, "u_env"), 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.stationMeshProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);

      for (let i = 0; i < this.stationMeshes.length; i++) {
        this._bindStationMesh(this.stationMeshes[i]);
        gl.drawArrays(gl.TRIANGLES, 0, this.stationMeshes[i].count);
      }
    }

    render(now, mx, my) {
      if (this.isDead) return;

      let dt = now - this.lastRenderTime;
      if (dt > 250 || dt <= 0) dt = 33.33;
      this.lastRenderTime = now;

      const step = dt / (IS_MOBILE ? 50 : 33.33);

      if (typeof mx !== "number") mx = window.mx || 0;
      if (typeof my !== "number") my = window.my || 0;

      // --- Camera drag handling: no snap-back ---
      if (window.__z4CameraDragActive) {
        // While dragging, update the target from current mouse/touch position
        this.dragTargetX = mx;
        this.dragTargetY = my;
      }
      // Smoothly move camera angles toward the last known drag target (no reset)
      this.cx += (this.dragTargetX - this.cx) * Math.min(1, 0.12 * step);
      this.cy += (this.dragTargetY - this.cy) * Math.min(1, 0.12 * step);

      this._updateBlink(now);
      this._updatePhase(now, dt * 0.001);
      this.z4ModeTime += dt * 0.001;
      this.z4Trip = Math.max(0.35, Math.min(1.35, this.neuralIntensity / 2.0));
      this.z4IsOOB =
        this.phase === "bay" ||
        this.phase === "hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "ring"
          ? 1.0
          : 0.0;

      if (this.phase === "ascent" || this.phase === "docking_shake" || this.phase === "fog_in") {
        this._renderElevator(now);
      } else {
        this._renderStation(now);
      }

      if (this.phase === "docking_shake") {
        var shakeAlpha = this.shakeIntensity * 3.0;
        this._drawOverlay(0.02, 0.0, 0.0, Math.min(0.15, shakeAlpha));
      }

      if (this.rBlink > 0.001) this._drawOverlay(0, 0, 0, this.rBlink);
    }

    destroy() {
      this.isDead = true;

      if (this.fogOverlay) this.fogOverlay.style.opacity = "0";

      if (this.earthVideo) {
        try {
          this.earthVideo.pause();
        } catch (e) {}
      }

      if (this.elevatorProg) gl.deleteProgram(this.elevatorProg);
      if (this.stationBgProg) gl.deleteProgram(this.stationBgProg);
      if (this.stationMeshProg) gl.deleteProgram(this.stationMeshProg);
      if (this.overlayProg && this.overlayProg.prog) gl.deleteProgram(this.overlayProg.prog);

      if (this.fullTri) gl.deleteBuffer(this.fullTri);
      if (this.screenQuad) gl.deleteBuffer(this.screenQuad);

      if (this.stationTextures) {
        for (const k in this.stationTextures) {
          if (this.stationTextures[k]) gl.deleteTexture(this.stationTextures[k]);
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
      }
    }
    requestAnimationFrame(loop);
  };

  window.Zone4Engine = Zone4Engine;
})();