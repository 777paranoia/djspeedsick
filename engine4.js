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

#define MAX_STEPS 90
#define MAX_DIST 70.0
#define SURF_DIST 0.001

float hash1(float x){return fract(sin(x*127.1 + 1.9898)*43758.5);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

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

vec3 colorPickover(vec3 p){
  vec2 c = vec2(p.x * 0.4 + sin(u_time * 0.07) * 0.3, p.y * 0.4 + cos(u_time * 0.05) * 0.3);
  vec2 z = vec2(0.0);
  float minDist = 1e10;
  float escapeI = 0.0;
  for(int i = 0; i < 80; i++) {
    z = clamp(vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c, -1000.0, 1000.0);
    float d = min(abs(z.x), abs(z.y));
    if(d < minDist) minDist = d;
    if(dot(z,z) > 100.0){ escapeI = float(i); break; }
  }
  return neonPalette(fract(clamp(minDist * 8.0, 0.0, 1.0) * 2.0 + u_time * 0.15 + escapeI * 0.01)) * (0.4 + 0.6 * (1.0 - clamp(minDist * 8.0, 0.0, 1.0)));
}

vec2 mapScene(vec3 p){
  vec2 res=vec2(1000.0,-1.0);
  for(float i=0.0; i<2.0; i++){
    float id = 37.0 + i;
    float x = mix(-1.4, 1.4, hash1(id * 3.1 + 0.13));
    float y = mix(0.0, 1.6, hash1(id * 7.3 + 0.27));
    float z = mix(0.0, 3.5, hash1(id * 11.7 + 0.41));
    float sc = mix(0.3, 0.6, hash1(id * 13.1)) * 0.7;
    vec3 fp = p - vec3(x,y,z);
    float bound = length(fp) - (sc * 1.5);
    float df = bound;
    if(bound < 0.2){
      df = max(bound, sdFractal(fp/sc, mix(6.0,10.0,hash1(id*5.3))+sin(u_time*mix(0.03,0.08,hash1(id*2.1)))*1.5, mix(0.05,0.18,hash1(id*9.7))*(hash1(id*4.1)>0.5?1.0:-1.0), mix(0.04,0.14,hash1(id*6.3))*(hash1(id*8.9)>0.5?1.0:-1.0)) * sc);
    }
    if(df < res.x) res = vec2(df, 10.0);
  }
  return res;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  vec3 ro=u_eye;
  vec3 rd=normalize(u_forward*1.55 + uv.x*u_right + uv.y*u_up);
  vec3 tgt = normalize(u_targetDir);
  vec3 worldUp = vec3(0.0,1.0,0.0);
  vec3 rawTgtRight = cross(worldUp, tgt);
  if(length(rawTgtRight) < 0.001) rawTgtRight = vec3(1.0,0.0,0.0);
  vec3 tgtRight = normalize(rawTgtRight);
  vec3 tgtUp = normalize(cross(tgt, tgtRight));
  vec3 deepBg = vec3(0.0);
  float star = step(0.9985, hash2(floor(rd.xy*900.0)+floor(rd.z*300.0)));
  deepBg += vec3(0.65,0.72,0.84)*star*0.35;
  vec3 col = deepBg;
  float lx = dot(rd, tgtRight);
  float ly = dot(rd, tgtUp);
  float lz = dot(rd, tgt);
  if(lz > 0.0){
    vec2 plane = vec2(lx, ly) / max(lz, 0.0001);
    vec2 shifted = plane - vec2(0.10, -0.12);
    float earthRadius = 0.56;
    float d = length(shifted);
    if(d < earthRadius){
      vec2 normP = shifted / earthRadius;
      vec2 envUV = vec2(0.5 + normP.x * 0.44, 0.50 - normP.y * 0.44 + 0.06);
      envUV = vec2(1.0 - envUV.x, 1.0 - envUV.y);
      vec3 earthCol = texture2D(u_env, clamp(envUV, 0.0, 1.0)).rgb;
      float mask = 1.0 - smoothstep(0.90, 1.0, d / earthRadius);
      float rim = smoothstep(0.82, 1.0, d / earthRadius);
      earthCol += vec3(0.10,0.22,0.55) * rim * 0.35;
      col = mix(col, earthCol, mask);
    }
    float cableY = plane.y + 0.12;
    float snake = sin(cableY * 7.5 + u_time * 0.18) * 0.035
                + sin(cableY * 15.0 - u_time * 0.11) * 0.014;
    float cableX = 0.10 + snake;
    float cableSpan = smoothstep(-0.60, -0.44, plane.y)
                    * (1.0 - smoothstep(0.86, 1.02, plane.y));
    float core = 1.0 - smoothstep(0.018, 0.040, abs(plane.x - cableX));
    float shine = 1.0 - smoothstep(0.004, 0.016, abs(plane.x - cableX - 0.014));
    vec3 cableCol = mix(vec3(0.012,0.014,0.018), vec3(0.16,0.20,0.22), shine * 0.45);
    col = mix(col, cableCol, core * cableSpan * 0.88);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;
  }

  function z4BuildPostProcessShader() {
    return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;
uniform sampler2D u_sceneTex;
uniform vec2 u_res;
uniform float u_time;
uniform float u_trip;
uniform float u_fractalSeed;
uniform float u_blinkAge;
uniform float u_blink;
uniform float u_modeSeed;
uniform float u_modeTime;
uniform float u_isOOB;

float hash1(float x){return fract(sin(x*127.1 + 1.9898)*43758.5);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),u.x),
             mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),u.x), u.y);
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
    si += (1.0-step(4.0,dot(z,z)));
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
  float a= 1.5+sin(seed*1.3)*0.5;
  float b=-1.8+cos(seed*0.7)*0.4;
  float c=-1.9+sin(seed*2.1)*0.4;
  float d= 0.4+cos(seed*1.7)*0.4;
  float x=p.x*0.6; float y=p.y*0.6;
  float density=0.0;
  for(int i=0;i<32;i++){
    float nx=sin(a*y)+c*cos(a*x);
    float ny=sin(b*x)+d*cos(b*y);
    x=nx; y=ny;
    density += exp(-length(vec2(x,y)-p*0.6)*2.0);
  }
  return clamp(density*0.08,0.0,1.0);
}

float hallucinationField(vec2 sUV, float typeRoll, float fractalSeed, float time){
  if(typeRoll < 0.4) {
    vec2 region = vec2(-1.76,-0.028) + vec2(hash1(fractalSeed*5.1)-0.5,hash1(fractalSeed*7.3)-0.5)*0.3;
    return burningShip(sUV * 0.5 + region);
  } else if(typeRoll < 0.7) {
    vec2 jc = vec2(-0.8+sin(time*0.015+fractalSeed)*0.15, 0.156+cos(time*0.012)*0.1);
    return juliaSet(sUV * 0.8, jc);
  }
  return clifford(sUV * 1.5, fractalSeed);
}

vec3 applyHallucination(vec3 baseCol, vec2 screenUV, float fractalSeed, float blinkAge, float trip, float time){
  if(trip < 0.05) return baseCol;
  float r = length(screenUV);

  // Mostly peripheral, with only light center bleed so the station can breathe.
  float periph = smoothstep(0.18, 0.86, r);
  float centerBleed = 0.10;
  float breath = smoothstep(0.15, 0.95, 0.5 + 0.5 * sin(time * 0.34 + fractalSeed));

  float surge = smoothstep(3.2, 0.0, blinkAge) * 0.28;
  float strength = (trip * 0.11 + surge + breath * trip * 0.06) * max(periph, centerBleed);

  float typeRoll = hash1(fractalSeed * 3.7);
  float zoom = mix(0.6, 3.0, hash1(fractalSeed * 1.3));
  vec2 drift = vec2(sin(time*0.03+fractalSeed)*0.2, cos(time*0.02+fractalSeed*1.7)*0.2);
  float warpAmt = (trip * 0.16 + surge * 0.52 + breath * trip * 0.10) * mix(0.35, 0.92, periph);
  float ang = atan(screenUV.y, screenUV.x);
  float swirl = sin(r * 12.0 - time * 2.7 + fractalSeed * 4.3) * warpAmt * (0.65 + 0.35 * periph);
  float pinch = (fbm(screenUV * 5.5 + vec2(time * 0.28, -time * 0.21)) - 0.5) * warpAmt * 0.28;
  vec2 warped = vec2(cos(ang + swirl), sin(ang + swirl)) * (r + pinch);
  warped += vec2(
    fbm(screenUV * 8.0 + vec2(time * 0.72, -time * 0.51) + fractalSeed) - 0.5,
    fbm(screenUV.yx * 7.0 + vec2(-time * 0.63, time * 0.84) - fractalSeed) - 0.5
  ) * warpAmt * 0.42;
  warped *= 1.0 + sin(time * 1.9 + r * 18.0 + fractalSeed) * warpAmt * 0.08;

  vec2 sUV = warped / zoom + drift;
  vec2 chromaDir = normalize(vec2(
    cos(time * 0.9 + fractalSeed * 1.3),
    sin(time * 1.2 - fractalSeed * 0.7)
  ));
  vec2 chromaOff = chromaDir * warpAmt * (0.02 + 0.07 * periph);
  float valR = fract(hallucinationField(sUV + chromaOff, typeRoll, fractalSeed, time) * 3.5 + time * 0.05);
  float valG = fract(hallucinationField(sUV, typeRoll, fractalSeed, time) * 3.5 + time * 0.04);
  float valB = fract(hallucinationField(sUV - chromaOff, typeRoll, fractalSeed, time) * 3.5 + time * 0.03);
  float val = (valR + valG + valB) / 3.0;
  vec3 fracCol = vec3(
    sickPal(valR, fractalSeed * 11.3 + 0.3).r,
    sickPal(valG, fractalSeed * 11.3 + 1.7).g,
    sickPal(valB, fractalSeed * 11.3 + 3.1).b
  );
  float maskR = smoothstep(0.0, 0.14, valR) * smoothstep(1.0, 0.68, valR);
  float maskG = smoothstep(0.0, 0.12, valG) * smoothstep(1.0, 0.70, valG);
  float maskB = smoothstep(0.0, 0.14, valB) * smoothstep(1.0, 0.66, valB);
  float fracMask = max(maskG, max(maskR, maskB));
  fracCol *= fracMask;
  float pulse = 0.55 + 0.45 * sin(time * 0.9 + fractalSeed);
  float smear = smoothstep(0.08, 0.95, val) * warpAmt;
  fracCol += sickPal(fract(val * 2.3 - time * 0.09), fractalSeed * 5.7) * smear * 0.18;

  float grain = (hash2(screenUV * 400.0 + floor(time * 24.0) * 7.3) - 0.5) * trip * 0.04;

  float vignette = smoothstep(0.35, 1.1, r) * trip * 0.07 * (0.5 + 0.5 * sin(time * 0.7));

  vec3 result = baseCol;
  result += fracCol * strength * (pulse + 0.35 * smear);
  result += vec3(grain);
  result = mix(result, result * vec3(0.85, 0.65, 0.72), vignette);
  result = mix(result, result + fracCol * 0.08, fracMask * clamp(warpAmt, 0.0, 1.0));
  return result;
}

void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_res.x/u_res.y, 1.0);
  vec2 screenUV = uv;

  // ── LIQUID UV DISTORTION — softened for a steadier station image ──
  vec2 q = vec2(
    fbm(uv * 2.0 + vec2(0.0, u_time * 0.15)),
    fbm(uv * 2.0 + vec2(u_time * 0.15, 0.0))
  );
  vec2 warpR = vec2(
    fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * u_time * 0.15),
    fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * u_time * 0.15)
  );
  float liqAmp = mix(0.004, 0.014, u_isOOB) * clamp(u_trip, 0.0, 1.2);
  uv += (warpR - 0.5) * liqAmp;

  // ── SNAP/SURGE — Z3-level ──
  float mt = u_modeTime * u_isOOB;
  float w1 = sin(mt * 0.4 + u_modeSeed);
  float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
  float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
  float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
  float snap = pow(surge, 2.0) * 1.8 * u_isOOB;
  uv *= 1.0 + mt * 0.0006 + snap * 0.0022;

  // ── HORIZONTAL GLITCH BANDS ──
  float gTick = floor(u_time * 16.0);
  if(step(0.979, hash1(gTick * 133.77 + u_modeSeed)) > 0.0)
    uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5)
      * 0.025 * clamp(u_trip, 0.0, 1.2);

  // Convert back to texture space
  vec2 texUV = uv / vec2(u_res.x/u_res.y, 1.0) + 0.5;
  vec3 baseCol = texture2D(u_sceneTex, clamp(texUV, 0.0, 1.0)).rgb;

  // ── DIGITAL GLITCH — block mosh, degrade, channel swap ──
  float burstSlot = floor(u_time * 12.0);
  float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed));
  float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1));
  float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);

  if(activeG > 0.01){
    float rndG = hash1(burstSlot + u_modeSeed);
    float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
    vec2 blockUV = floor(texUV * gridSize) / gridSize;
    float blockRnd = hash2(blockUV + floor(u_time * 30.0));
    vec2 motionVec = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
    float doMosh = step(0.9, blockRnd) * activeG;
    vec2 moshUV = fract(blockUV + motionVec * activeG);
    vec3 moshCol = texture2D(u_sceneTex, moshUV).rgb;
    baseCol = mix(baseCol, moshCol, doMosh);

    float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG;
    vec3 degraded = floor(baseCol * 3.0) / 3.0;
    float tintRnd = hash1(blockRnd * 3.0);
    vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
    baseCol = mix(baseCol, degraded * yuvTint, doDegrade);

    float miniGrid = gridSize * 2.0;
    vec2 miniBlock = floor(texUV * miniGrid) / miniGrid;
    float miniRnd = hash2(miniBlock + floor(u_time * 60.0));
    float doMini = step(0.95, miniRnd) * activeG;
    baseCol = mix(baseCol, vec3(baseCol.b, baseCol.r, baseCol.g), doMini);
  }

  // ── FRACTAL HALLUCINATION — everywhere ──
  vec3 col = applyHallucination(baseCol, screenUV, u_fractalSeed, u_blinkAge, u_trip * 0.72, u_time);

  col *= (1.0 - u_blink);
  float vign = 1.0 - 0.22 * pow(length(screenUV * vec2(0.9, 1.0)), 2.0);
  col *= vign;
  col = 1.0 - exp(-col * 1.10);

  gl_FragColor = vec4(col, 1.0);
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
        const z4 = window.currentZone4;
        if (z4 && !z4.isDead && z4.phase === "ring") {
          window.__z4TurnRequested = e.code === "ArrowLeft" ? -1 : 1;
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
      this.walkoff = 0;       // bay walk: 0=back wall, 1=hallway entrance
      this.hallwayT = 0;      // hallway walk: 0=bay end, 1=ring junction
      this.enterRingT = 0;   // blend: 0=hallway exit, 1=fully on ring
      this.phaseFogArmed = false;

      // Shake state
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;

      // 180° slide turn state for ring phase
      this.ringDirection = 1;       // +1 = forward along tangent, -1 = reversed
      this.turnAnimating = false;
      this.turnStart = 0;
      this.turnTo = -1;
      this.turnSpin = 1;
      this.turnDuration = 600;      // ms for 180° slide
      this.turnInputLatch = 0;
      this.turnLookX = 0;
      this.turnLookY = 0;

      // Lap tracking for endgame
      this.lapCount = 0;
      this.lastRingU = this.ringU;
      this.ringTravel = 0;
      this.lapCrossings = 0;         // derived half-lap count for legacy ramps/debug
      this.blackholeVisible = false;
      this.blackholeIntensity = 0;

      // ── Window portal state (3rd-lap station windows) ────────────────
      // Each of the 4 window sections (sections 2/6/10/14) can swap its
      // center panel from the static window texture to a Z1 mode shader.
      // On lap 3 we keep all windows in sync and alternate between mode 7
      // and the user's current live mode.
      this._windowModes = [0, 0, 0, 0];
      this._windowRollTime = 0;
      this._windowRollInterval = 2400;
      this._lap3PortalFlip = false;
      // Cache of compiled Z1 mode programs, keyed by mode name. Built
      // lazily the first time we need one (requires GLSL.modules to have
      // loaded, which happens before Z4 is entered).
      this._portalModeProgs = {};
      // Shared FBO for rendering the active mode shader to an offscreen
      // texture, then sampling it on the Z4 window mesh. Built in
      // _initPortalResources the first time a portal needs to draw.
      this._portalFBO = null;
      this._portalFBOTex = null;
      this._portalFBODepth = null;
      this._portalFBOW = 0;
      this._portalFBOH = 0;
      // Sampler program — simple textured quad that reads the FBO and
      // writes it onto the Z4 mesh with u_proj/u_view transform.
      this._portalSamplerProg = null;

      // Descent / reverse path
      this.descentProgress = 1;      // elevator down: 1→0
      this.descentStart = 0;
      this.descentDuration = 38000;

      // Fall from space
      this.fallProgress = 0;
      this.fallStart = 0;
      this.fallDuration = 32000;     // ~32s — scales with longer 700→3 descent at matched terminal velocity

      this.neuralIntensity = 0.75;
      this.z4Trip = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4ModeTime = 0.0;
      this.z4IsOOB = 1.0;
      this.z4FractalSeed = Math.random() * 1000.0;
      this.z4BlinkPeakTime = performance.now();

      src.stationBgCombined = z4BuildPsychStationShader();

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

      // Fall shader — built lazily on first _renderFall call
      this.fallProg = null;
      this._fallShaderBuilt = false;

      this.fboTexture = gl.createTexture();
      this.fboDepth = gl.createRenderbuffer();
      this.fbo = gl.createFramebuffer();
      this.fboWidth = 0;
      this.fboHeight = 0;

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

    // ── Portal program build ──────────────────────────────────────────
    // Mirrors engine.js's own buildProgram: concatenates GLSL.core with
    // GLSL.modules[modeName] and compiles a raymarched mode shader.
    // Cached per mode name in this._portalModeProgs.
    _buildPortalModeProgram(modeName) {
      if (this._portalModeProgs[modeName] !== undefined) {
        return this._portalModeProgs[modeName];
      }
      if (!window.GLSL || !GLSL.core || !GLSL.modules || !GLSL.modules[modeName] || !GLSL.vert) {
        console.warn("[Zone4] cannot build portal mode:", modeName);
        this._portalModeProgs[modeName] = null;
        return null;
      }
      const fsSrc = GLSL.core + GLSL.modules[modeName];
      const prog = this._buildRawProgram(GLSL.vert, fsSrc);
      if (!prog) {
        console.error("[Zone4] portal mode compile failed:", modeName);
        this._portalModeProgs[modeName] = null;
        return null;
      }
      // Bind texture units once at build time — matches engine.js lines
      // 456-512. Units 0-5: buildings, 6: water (fallback), 7: window mask.
      // Env units: 7 on mobile (shared), 8-13 on desktop.
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB1"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB2"), 1);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB3"), 2);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB4"), 3);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB5"), 4);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texB6"), 5);
      gl.uniform1i(gl.getUniformLocation(prog, "u_water"), 6);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texWindow"), 7);
      const envUnits = IS_MOBILE
        ? [7, 7, 7, 7, 7, 7]
        : [8, 9, 10, 11, 12, 13];
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv1"), envUnits[0]);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv2"), envUnits[1]);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv3"), envUnits[2]);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv4"), envUnits[3]);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv5"), envUnits[5]);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texEnv6"), envUnits[4]);
      this._portalModeProgs[modeName] = prog;
      return prog;
    }

    // ── Portal FBO ────────────────────────────────────────────────────
    // Shared offscreen render target for mode-shader content. Sized to
    // the current canvas so the raymarch matches the portal quad's
    // apparent resolution. Lazy-created; recreated if canvas resizes.
    _ensurePortalFBO() {
      // Preserve canvas aspect ratio — screen-space UV sampling requires
      // FBO aspect = canvas aspect or the mode scene stretches.
      const cw = (canvas.width  | 0) || 512;
      const ch = (canvas.height | 0) || 512;
      const maxDim = 1024;
      let w = cw, h = ch;
      if (w > maxDim || h > maxDim) {
        const s = maxDim / Math.max(w, h);
        w = Math.max(64, Math.floor(w * s));
        h = Math.max(64, Math.floor(h * s));
      }
      if (this._portalFBO && this._portalFBOW === w && this._portalFBOH === h) return;
      if (this._portalFBO) gl.deleteFramebuffer(this._portalFBO);
      if (this._portalFBOTex) gl.deleteTexture(this._portalFBOTex);
      if (this._portalFBODepth) gl.deleteRenderbuffer(this._portalFBODepth);

      this._portalFBOTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._portalFBOTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this._portalFBODepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._portalFBODepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);

      this._portalFBO = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._portalFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._portalFBOTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._portalFBODepth);

      this._portalFBOW = w;
      this._portalFBOH = h;
    }

    // ── Portal sampler program ────────────────────────────────────────
    // Plain textured-quad shader: reads the portal FBO as a 2D texture
    // and writes it to the Z4 window mesh in world space. Same attribute
    // layout as stationMeshProg (stride-32 pos/nor/uv) so the existing
    // _bindStationMesh works.
    _ensurePortalSamplerProg() {
      if (this._portalSamplerProg) return this._portalSamplerProg;
      const vs = "attribute vec3 a_pos; attribute vec3 a_nor; attribute vec2 a_uv;" +
                 "uniform mat4 u_proj; uniform mat4 u_view;" +
                 "varying vec2 v_uv;" +
                 "void main(){ v_uv = a_uv; gl_Position = u_proj * u_view * vec4(a_pos, 1.0); }";
      const fs = "precision mediump float; varying vec2 v_uv;" +
                 "uniform sampler2D u_tex;" +
                 "void main(){ gl_FragColor = texture2D(u_tex, v_uv); }";
      this._portalSamplerProg = this._buildRawProgram(vs, fs);
      return this._portalSamplerProg;
    }

    // ── Render one mode to the portal FBO ─────────────────────────────
    // Binds all Z1 mode-shader textures + uniforms, draws fullscreen tri
    // into the portal FBO. Output: an FBO texture showing the mode scene
    // with its canalport-mask frame already composited (the mode shader
    // does that internally via u_texWindow).
    _renderModeToFBO(modeName, modeId, now, seed) {
      this._ensurePortalFBO();
      const prog = this._buildPortalModeProgram(modeName);
      if (!prog || !this._portalFBO) return false;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this._portalFBO);
      gl.viewport(0, 0, this._portalFBOW, this._portalFBOH);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(prog);

      // Texture binds — match engine.js order. Unit 7 holds the mask.
      const TEX = this.stationTextures;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TEX.b1);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TEX.b2);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TEX.b3);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TEX.b4);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, TEX.b5);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TEX.b6);
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, TEX.envFallback);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TEX.spaceMask);
      if (!IS_MOBILE) {
        for (let u = 8; u <= 13; u++) {
          gl.activeTexture(gl.TEXTURE0 + u);
          gl.bindTexture(gl.TEXTURE_2D, TEX.envFallback);
        }
      }

      // Standard mode-shader uniforms (see engine.js ActiveMode.draw).
      gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), this._portalFBOW, this._portalFBOH);
      gl.uniform1f(gl.getUniformLocation(prog, "u_time"), now * 0.001 + seed * 13.7);
      gl.uniform2f(gl.getUniformLocation(prog, "u_mouse"), 0.0, 0.0);
      gl.uniform1i(gl.getUniformLocation(prog, "u_mode"), modeId | 0);
      gl.uniform1f(gl.getUniformLocation(prog, "u_blink"), 0.0);
      gl.uniform1f(gl.getUniformLocation(prog, "u_flash"), 0.0);
      gl.uniform1f(gl.getUniformLocation(prog, "u_shake"), 0.0);
      gl.uniform1f(gl.getUniformLocation(prog, "u_wake"), 1.0);
      gl.uniform1f(gl.getUniformLocation(prog, "u_modeSeed"), seed);
      gl.uniform1f(gl.getUniformLocation(prog, "u_audio"), 0.3);
      gl.uniform2f(gl.getUniformLocation(prog, "u_texSize"), 1024, 1024);
      gl.uniform1f(gl.getUniformLocation(prog, "u_modeTime"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(prog, "u_trip"), this.z4Trip || 1.0);

      // Full-screen triangle attribute. GLSL.vert declares attribute p.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const loc = gl.getAttribLocation(prog, "p");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      // Restore main-pass viewport — caller expects this.
      gl.viewport(0, 0, canvas.width, canvas.height);
      return true;
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
      const voidBase = "files/img/void/";
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
        // ── Z1 mode-shader textures, bound when rendering portal content.
        // Paths match engine.js's staticAssets loads so the same PNGs are
        // reused. Six building textures, the window mask (canalport-mask
        // analog, user said call it SPACE-MASK.png), and the oob mask.
        b1: loadStaticTex(voidBase + "building01.png"),
        b2: loadStaticTex(voidBase + "building09.png"),
        b3: loadStaticTex(voidBase + "building08.png"),
        b4: loadStaticTex(voidBase + "building07.png"),
        b5: loadStaticTex(voidBase + "building06.png"),
        b6: loadStaticTex(voidBase + "building05.png"),
        // Real canalport-mask.png from engine1 — what Z1 mode shaders
        // expect at u_texWindow. SPACE-MASK.png contains station panel
        // art and was leaking that panel texture into the mode output.
        spaceMask: loadStaticTex(voidBase + "canalport-mask.png"),
        // Neutral env fallbacks — mode shaders sample these for sky/water/
        // other backgrounds. Real Z1 loads ~13 different ones, but a
        // single neutral dark texture works as a visual fallback for Z4
        // portal use where the scenes only need to be recognizable.
        envFallback: this._makeSolidTexture(8, 10, 16, 255),
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
      let windowCounter = 0;   // 0-3 index stamped on each window mesh

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

          // Left slab bottom tier
          {
            const p00 = pointOnFrame(sectionFrame(a0), INNER_W, FLOOR_Y);
            const p10 = [doorL[0], FLOOR_Y, doorL[2]];
            const p11 = [doorL[0], LEFT_MID_BOT, doorL[2]];
            const p01 = pointOnFrame(sectionFrame(a0), INNER_W, LEFT_MID_BOT);
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          // Left slab top tier
          {
            const p00 = pointOnFrame(sectionFrame(a0), INNER_W, LEFT_MID_TOP);
            const p10 = [doorL[0], LEFT_MID_TOP, doorL[2]];
            const p11 = [doorL[0], CEIL_Y, doorL[2]];
            const p01 = pointOnFrame(sectionFrame(a0), INNER_W, CEIL_Y);
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }

          // Right slab bottom tier
          {
            const p00 = [doorR[0], FLOOR_Y, doorR[2]];
            const p10 = pointOnFrame(sectionFrame(a1), INNER_W, FLOOR_Y);
            const p11 = pointOnFrame(sectionFrame(a1), INNER_W, LEFT_MID_BOT);
            const p01 = [doorR[0], LEFT_MID_BOT, doorR[2]];
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          // Right slab top tier
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
            const m = self._makeMesh(q, rightIsWindow ? TEX.winC : TEX.rp2, [1, 1, 1], 1);
            if (rightIsWindow) {
              m.isPortalSurface = true;
              m.windowIdx = windowCounter++;
            }
            meshes.push(m);
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
        function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
          const q = [];
          pushQuad(q, pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), pointLocal(xa, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), pointLocal(xa, ya, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }
        function addRing(cx, cz, innerR, outerR, ya, yb, tex, flatCol, texMix, gapCenter, gapWidth) {
          const q = [];
          const segs = 24;
          const r0 = Math.max(0.02, innerR);
          for (let s = 0; s < segs; s++) {
            const a0 = (s / segs) * Math.PI * 2;
            const a1 = ((s + 1) / segs) * Math.PI * 2;
            if (typeof gapCenter === "number" && typeof gapWidth === "number") {
              const mid = (a0 + a1) * 0.5;
              const gapDelta = Math.atan2(Math.sin(mid - gapCenter), Math.cos(mid - gapCenter));
              if (Math.abs(gapDelta) < gapWidth * 0.5) continue;
            }
            const ox0 = cx + Math.cos(a0) * outerR;
            const oz0 = cz + Math.sin(a0) * outerR;
            const ox1 = cx + Math.cos(a1) * outerR;
            const oz1 = cz + Math.sin(a1) * outerR;
            const ix0 = cx + Math.cos(a0) * r0;
            const iz0 = cz + Math.sin(a0) * r0;
            const ix1 = cx + Math.cos(a1) * r0;
            const iz1 = cz + Math.sin(a1) * r0;

            pushQuad(q, pointLocal(ox0, yb, oz0), pointLocal(ix0, yb, iz0), pointLocal(ix1, yb, iz1), pointLocal(ox1, yb, oz1), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ox1, ya, oz1), pointLocal(ix1, ya, iz1), pointLocal(ix0, ya, iz0), pointLocal(ox0, ya, oz0), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ox1, ya, oz1), pointLocal(ox0, ya, oz0), pointLocal(ox0, yb, oz0), pointLocal(ox1, yb, oz1), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ix0, ya, iz0), pointLocal(ix1, ya, iz1), pointLocal(ix1, yb, iz1), pointLocal(ix0, yb, iz0), [0, 1], [1, 1], [1, 0], [0, 0]);
          }
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }
        function addBar(xa, za, xb, zb, ya, yb, halfT, tex, flatCol, texMix) {
          const dx = xb - xa;
          const dz = zb - za;
          const len = Math.hypot(dx, dz) || 1;
          const nx = (-dz / len) * halfT;
          const nz = (dx / len) * halfT;
          const q = [];
          const a0 = [xa + nx, za + nz];
          const a1 = [xa - nx, za - nz];
          const b0 = [xb + nx, zb + nz];
          const b1 = [xb - nx, zb - nz];
          pushQuad(q, pointLocal(a0[0], ya, a0[1]), pointLocal(b0[0], ya, b0[1]), pointLocal(b0[0], yb, b0[1]), pointLocal(a0[0], yb, a0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(b1[0], ya, b1[1]), pointLocal(a1[0], ya, a1[1]), pointLocal(a1[0], yb, a1[1]), pointLocal(b1[0], yb, b1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a0[0], yb, a0[1]), pointLocal(b0[0], yb, b0[1]), pointLocal(b1[0], yb, b1[1]), pointLocal(a1[0], yb, a1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a1[0], ya, a1[1]), pointLocal(b1[0], ya, b1[1]), pointLocal(b0[0], ya, b0[1]), pointLocal(a0[0], ya, a0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a1[0], ya, a1[1]), pointLocal(a0[0], ya, a0[1]), pointLocal(a0[0], yb, a0[1]), pointLocal(a1[0], yb, a1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(b0[0], ya, b0[1]), pointLocal(b1[0], ya, b1[1]), pointLocal(b1[0], yb, b1[1]), pointLocal(b0[0], yb, b0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }

        const halfW = Math.sin(SECTION_ANGLE * 0.5) * RING_RADIUS * 0.92;
        const depth = 6.2;
        // Bay set back toward center: starts at x0, ends at x1 (deeper)
        const x0 = -8.0;             // hallway-side edge of bay
        const x1 = x0 - depth;       // back wall of bay (-14.2)
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

        const liftX = x1 + 2.22;
        const liftZ = 0.0;
        addRing(liftX, liftZ, 0.90, 2.08, y0 + 0.03, y0 + 0.22, TEX.floor, [1, 1, 1], 1);
        addRing(liftX, liftZ, 1.88, 2.20, y0 + 0.01, y0 + 0.09, TEX.black, [0.06, 0.07, 0.08], 0);
        addRing(liftX, liftZ, 0.42, 0.72, y0 + 0.20, y0 + 0.43, TEX.black, [0.09, 0.10, 0.115], 0);
        addRing(liftX, liftZ, 0.03, 0.16, y0 + 0.20, y1 - 0.04, TEX.black, [0.04, 0.055, 0.075], 0);
        const gateAngle = 0.42;
        const gateWidth = 1.20;
        const gateHingeA = gateAngle - gateWidth * 0.5;
        const gateHingeB = gateAngle + gateWidth * 0.5;
        function gatePoint(radius, angle) {
          return {
            x: liftX + Math.cos(angle) * radius,
            z: liftZ + Math.sin(angle) * radius,
          };
        }
        addRing(liftX, liftZ, 2.04, 2.18, y0 + 0.78, y0 + 0.86, TEX.black, [0.05, 0.065, 0.075], 0, gateAngle, gateWidth);

        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2;
          const gateDelta = Math.atan2(Math.sin(a - gateAngle), Math.cos(a - gateAngle));
          if (Math.abs(gateDelta) < gateWidth * 0.5) continue;
          const px = liftX + Math.cos(a) * 2.13;
          const pz = liftZ + Math.sin(a) * 2.13;
          addBox(px - 0.035, px + 0.035, y0 + 0.20, y0 + 0.84, pz - 0.035, pz + 0.035, TEX.black, [0.035, 0.045, 0.055], 0);
        }

        const hingeLo = gatePoint(2.13, gateHingeA);
        const hingeHi = gatePoint(2.13, gateHingeB);
        addBox(hingeLo.x - 0.045, hingeLo.x + 0.045, y0 + 0.20, y0 + 0.90, hingeLo.z - 0.045, hingeLo.z + 0.045, TEX.black, [0.035, 0.045, 0.055], 0);
        addBox(hingeHi.x - 0.045, hingeHi.x + 0.045, y0 + 0.20, y0 + 0.90, hingeHi.z - 0.045, hingeHi.z + 0.045, TEX.black, [0.035, 0.045, 0.055], 0);

        const leafLo = gatePoint(1.58, gateHingeA - 0.62);
        const leafHi = gatePoint(1.58, gateHingeB + 0.62);
        addBar(hingeLo.x, hingeLo.z, leafLo.x, leafLo.z, y0 + 0.78, y0 + 0.86, 0.035, TEX.black, [0.05, 0.065, 0.075], 0);
        addBar(hingeLo.x, hingeLo.z, leafLo.x, leafLo.z, y0 + 0.44, y0 + 0.50, 0.030, TEX.black, [0.04, 0.052, 0.062], 0);
        addBar(hingeHi.x, hingeHi.z, leafHi.x, leafHi.z, y0 + 0.78, y0 + 0.86, 0.035, TEX.black, [0.05, 0.065, 0.075], 0);
        addBar(hingeHi.x, hingeHi.z, leafHi.x, leafHi.z, y0 + 0.44, y0 + 0.50, 0.030, TEX.black, [0.04, 0.052, 0.062], 0);
        addBox(leafLo.x - 0.035, leafLo.x + 0.035, y0 + 0.42, y0 + 0.86, leafLo.z - 0.035, leafLo.z + 0.035, TEX.black, [0.03, 0.04, 0.05], 0);
        addBox(leafHi.x - 0.035, leafHi.x + 0.035, y0 + 0.42, y0 + 0.86, leafHi.z - 0.035, leafHi.z + 0.035, TEX.black, [0.03, 0.04, 0.05], 0);

        addRing(liftX, liftZ, 0.78, 1.34, y0 - 0.12, y0 - 0.02, TEX.black, [0.045, 0.052, 0.060], 0);
        addRing(liftX, liftZ, 1.20, 1.58, y0 - 0.30, y0 - 0.18, TEX.black, [0.035, 0.044, 0.055], 0);
        addBox(liftX - 0.18, liftX + 0.18, y0 - 7.20, y0 + 0.08, -0.18, 0.18, TEX.black, [0.018, 0.024, 0.034], 0);
        const trackRailR = 0.92;
        const trackRailT = 0.07;
        addBox(liftX + trackRailR - trackRailT, liftX + trackRailR + trackRailT, y0 - 7.20, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.04, 0.052, 0.066], 0);
        addBox(liftX - trackRailR - trackRailT, liftX - trackRailR + trackRailT, y0 - 7.20, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.04, 0.052, 0.066], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, y0 - 7.20, y0 + 0.02, trackRailR - trackRailT, trackRailR + trackRailT, TEX.black, [0.04, 0.052, 0.066], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, y0 - 7.20, y0 + 0.02, -trackRailR - trackRailT, -trackRailR + trackRailT, TEX.black, [0.04, 0.052, 0.066], 0);

        for (let rung = 0; rung < 7; rung++) {
          const ry = y0 - 0.72 - rung * 0.92;
          addRing(liftX, liftZ, 0.84, 1.04, ry - 0.035, ry + 0.035, TEX.black, [0.032, 0.042, 0.054], 0);
          addBox(liftX - 1.22, liftX + 1.22, ry - 0.030, ry + 0.030, -0.030, 0.030, TEX.black, [0.032, 0.042, 0.054], 0);
          addBox(liftX - 0.030, liftX + 0.030, ry - 0.030, ry + 0.030, -1.22, 1.22, TEX.black, [0.032, 0.042, 0.054], 0);
        }

        const railR = 1.36;
        addBox(liftX + railR - 0.055, liftX + railR + 0.055, y0 + 0.16, y1 - 0.04, -0.055, 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - railR - 0.055, liftX - railR + 0.055, y0 + 0.16, y1 - 0.04, -0.055, 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - 0.055, liftX + 0.055, y0 + 0.16, y1 - 0.04, railR - 0.055, railR + 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - 0.055, liftX + 0.055, y0 + 0.16, y1 - 0.04, -railR - 0.055, -railR + 0.055, TEX.black, [0.055, 0.07, 0.09], 0);

        addRing(liftX, liftZ, 1.08, 1.20, y1 - 0.18, y1 - 0.08, TEX.black, [0.045, 0.055, 0.065], 0);
        addBox(liftX - 1.52, liftX + 1.52, y1 - 0.16, y1 - 0.10, -0.045, 0.045, TEX.black, [0.045, 0.055, 0.065], 0);
        addBox(liftX - 0.045, liftX + 0.045, y1 - 0.16, y1 - 0.10, -1.52, 1.52, TEX.black, [0.045, 0.055, 0.065], 0);
      })();

      // ── Hallway connecting bay to ring ──
      // Runs from bay inner edge (x0 = INNER_W + 0.02 ≈ -2.33) to ring center (x = 0)
      // along the bay section's radial axis. Narrower than the bay — a corridor.
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

        var hx0 = -8.0;               // bay doorway (start of hallway)
        var hx1 = INNER_W + 0.02;    // ring inner wall (end of hallway)
        var hy0 = FLOOR_Y;
        var hy1 = CEIL_Y * 0.88;     // slightly lower ceiling than ring
        var hallHalfW = 1.15;        // half-width of hallway
        var hz0 = -hallHalfW;
        var hz1 = hallHalfW;
        var q;

        // Floor
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx0, hy0, hz1),
          pointLocal(hx1, hy0, hz1), pointLocal(hx1, hy0, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));

        // Ceiling
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy1, hz1), pointLocal(hx0, hy1, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));

        // Left wall (z = hz0)
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx1, hy0, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx0, hy1, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));

        // Right wall (z = hz1)
        q = [];
        pushQuad(
          q,
          pointLocal(hx1, hy0, hz1), pointLocal(hx0, hy0, hz1),
          pointLocal(hx0, hy1, hz1), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));

        // Frame strips along hallway edges (dark trim)
        var trimW = 0.04;

        // Floor-wall trim left
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz0), pointLocal(hx1, hy0 + 0.01, hz0),
          pointLocal(hx1, hy0 + 0.01, hz0 + trimW), pointLocal(hx0, hy0 + 0.01, hz0 + trimW),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));

        // Floor-wall trim right
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

      // Update shake decay
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
        // Arrival rumble — screen shakes, then triggers fog
        this.progress = 1;
        this.neuralIntensity = 2.0;
        var elapsed = now - this.phaseStart;
        // Shake intensity builds then holds
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
        // Walk from back of bay toward hallway entrance
        if (moving) {
          this.walkoff = Math.min(1, this.walkoff + dt * 0.30);
        }
        if (this.walkoff >= 1) {
          this.phase = "hallway";
          this.phaseStart = now;
        }
        this.neuralIntensity = 1.4 + this.walkoff * 1.2;

      } else if (this.phase === "hallway") {
        // Walk down straight hallway toward ring junction
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
        // Smooth blend from hallway exit to ring — auto-advances
        this.enterRingT = Math.min(1, this.enterRingT + dt * 0.9);
        if (this.enterRingT >= 1) {
          this.phase = "ring";
          this.phaseStart = now;
        }
        this.neuralIntensity = 2.3;

      } else if (this.phase === "ring") {
        // 180° turn animation
        if (this.turnAnimating) {
          var turnElapsed = now - this.turnStart;
          if (turnElapsed >= this.turnDuration) {
            this.ringDirection = this.turnTo;
            this.turnAnimating = false;
            this.cx = 0;
            this.cy = 0;
            if (typeof window.mx === "number") window.mx = 0;
            if (typeof window.my === "number") window.my = 0;
          }
        }

        // Check for turn request
        if (window.__z4TurnRequested && !this.turnAnimating) {
          const turnReq = typeof window.__z4TurnRequested === "number"
            ? window.__z4TurnRequested
            : 1;
          window.__z4TurnRequested = false;
          this.turnAnimating = true;
          this.turnStart = now;
          this.turnTo = this.ringDirection > 0 ? -1 : 1;
          this.turnSpin = turnReq < 0 ? -1 : 1;
          this.turnLookX = this.cx;
          this.turnLookY = this.cy;
        }
        window.__z4TurnRequested = false;

        if (moving && !this.turnAnimating) {
          this.ringU = (this.ringU + dt * 0.26 * this.ringDirection) % (Math.PI * 2);
        }
        if (this.ringU < 0) this.ringU += Math.PI * 2;

        // ── Lap counting ──
        var prevU = this.lastRingU;
        var currU = this.ringU;
        var deltaU = currU - prevU;
        if (deltaU > Math.PI) deltaU -= Math.PI * 2;
        if (deltaU < -Math.PI) deltaU += Math.PI * 2;
        this.ringTravel += Math.abs(deltaU);
        this.lapCrossings = Math.floor(this.ringTravel / Math.PI);
        this.lastRingU = currU;
        this.lapCount = Math.floor(this.ringTravel / (Math.PI * 2));

        // Legacy blackhole ramp — neutered (never fires on 3-lap endgame).
        if (this.lapCount >= 99) {
          this.blackholeIntensity = 1;
          this.blackholeVisible = true;
        }

        // ── Window-portal alternation on lap 3 ────────────────────────
        // The station windows all share one mode on lap 3 and alternate
        // between mode 7 and the user's current live Z1 mode.
        if (this.lapCount >= 2 && this.lapCount < 3) {
          if (this._windowRollTime === 0) {
            this._windowRollTime = now;
            this._lap3PortalFlip = false;
          } else if (now - this._windowRollTime >= this._windowRollInterval) {
            this._windowRollTime = now;
            this._lap3PortalFlip = !this._lap3PortalFlip;
          }
          var liveMode = 1;
          if (typeof mode !== "undefined") {
            var activeMode = mode | 0;
            if (activeMode >= 1 && activeMode <= 9) liveMode = activeMode;
          }
          var lap3Mode = this._lap3PortalFlip ? 7 : liveMode;
          for (var w = 0; w < 4; w++) {
            this._windowModes[w] = lap3Mode;
          }
        } else {
          this._windowModes[0] = 0;
          this._windowModes[1] = 0;
          this._windowModes[2] = 0;
          this._windowModes[3] = 0;
          this._windowRollTime = 0;
          this._lap3PortalFlip = false;
        }

        // After 3 laps — trigger reverse sequence.
        if (this.lapCount >= 3) {
          this.phase = "reverse_entering_ring";
          this.phaseStart = now;
          this.enterRingT = 1;
        }

        // Lap still escalates, but z4Trip is capped lower so the station
        // hallucination stays readable instead of becoming a permanent wash.
        this.neuralIntensity = 2.2 + Math.min(this.lapCount, 3) * 0.5;

      } else if (this.phase === "reverse_entering_ring") {
        // Auto-blend from ring back to hallway orientation
        this.enterRingT = Math.max(0, this.enterRingT - dt * 0.7);
        if (this.enterRingT <= 0) {
          this.phase = "reverse_hallway";
          this.phaseStart = now;
          this.hallwayT = 1;
        }
        this.neuralIntensity = 2.5;

      } else if (this.phase === "reverse_hallway") {
        // Auto-walk back through hallway
        this.hallwayT = Math.max(0, this.hallwayT - dt * 0.35);
        if (this.hallwayT <= 0) {
          this.phase = "reverse_bay";
          this.phaseStart = now;
          this.walkoff = 1;
        }
        this.neuralIntensity = 2.4;

      } else if (this.phase === "reverse_bay") {
        // Auto-walk back through bay to elevator
        this.walkoff = Math.max(0, this.walkoff - dt * 0.30);
        if (this.walkoff <= 0) {
          this.phase = "fog_in_descent";
          this.phaseStart = now;
          this._setFog(1, this.fogInDuration);
        }
        this.neuralIntensity = 2.2;

      } else if (this.phase === "fog_in_descent") {
        // Fog transition to elevator
        if (now - this.phaseStart >= this.fogInDuration) {
          this.phase = "descent";
          this.phaseStart = now;
          this.descentStart = now;
          this.descentProgress = 1;
          this._setFog(0, this.fogOutDuration);
        }
        this.neuralIntensity = 2.0;

      } else if (this.phase === "descent") {
        // Elevator going down — progress 1→0
        var elapsed = now - this.descentStart;
        this.descentProgress = Math.max(0, 1 - elapsed / this.descentDuration);
        this.progress = this.descentProgress;
        if (moving) this.walkAngle -= dt * 0.42;

        // Shaking ramps up as we descend
        var descentT = 1 - this.descentProgress; // 0→1 as we go down
        this.shakeIntensity = descentT * descentT * 0.08;

        // At 60% down, transition to violent shake
        if (descentT >= 0.6) {
          this.phase = "descent_shake";
          this.phaseStart = now;
        }
        this.neuralIntensity = 2.0 - descentT * 0.5;

      } else if (this.phase === "descent_shake") {
        // Violent shaking — elevator is failing
        var elapsed = now - this.phaseStart;
        var shakeT = Math.min(1, elapsed / 4000); // 4 seconds of escalating shake
        this.shakeIntensity = 0.05 + shakeT * 0.25;
        this.progress = Math.max(0, this.descentProgress - (elapsed / this.descentDuration) * 0.4);

        // Occasional violent snap jolts
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
        // Falling from space to city
        this.fallProgress = Math.min(1, (now - this.fallStart) / this.fallDuration);

        if (this.fallProgress >= 1) {
          this.phase = "impact";
          this.phaseStart = now;
        }
        this.neuralIntensity = 3.0;

      } else if (this.phase === "impact") {
        // White flash then reinit
        var elapsed = now - this.phaseStart;
        if (elapsed > 2500) {
          this.destroy();
          // Full site reinit
          setTimeout(function() {
            window.location.reload();
          }, 200);
        }
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
      // Disable all vertex attribs left over from station mesh rendering
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

    _checkStationTurnThreshold(now) {
      if (this.phase !== "ring") {
        if (Math.abs(this.cx) < 0.72) this.turnInputLatch = 0;
        return;
      }
      if (this.turnAnimating) return;
      let dir = 0;
      if (this.cx >= 1.24) dir = -1;
      else if (this.cx <= -1.24) dir = 1;
      else if (Math.abs(this.cx) < 0.72) this.turnInputLatch = 0;
      if (!dir || this.turnInputLatch === dir) return;
      this.turnInputLatch = dir;
      window.__z4TurnRequested = dir;
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
          var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
          var ringFwd = this._mul(frame.tangent, dir);
          baseForward = this._normalize(this._mix3(frame.radial, ringFwd, t));
        }

      } else {
        // Ring phase — camera at ring center, facing along tangent
        eye = this._add(frame.center, [0, -0.02, 0]);
        // Direction determined by ringDirection (1 or -1, animated during turns)
        var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
        baseForward = this._mul(frame.tangent, dir);
      }

      let lookX = this.cx;
      let lookY = this.cy;
      let fwd = baseForward.slice();
      if (this.turnAnimating) {
        const turnElapsed = this.lastRenderTime - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        fwd = this._rotateAroundAxis(fwd, [0, 1, 0], this.turnSpin * Math.PI * turnT);
        lookX = this.turnLookX * (1 - turnT);
        lookY = this.turnLookY * (1 - turnT);
      }
      fwd = this._rotateAroundAxis(fwd, [0, 1, 0], -lookX * 1.0);

      let right = this._normalize(this._cross(fwd, [0, 1, 0]));
      fwd = this._rotateAroundAxis(fwd, right, -lookY * 0.6);
      right = this._normalize(this._cross(fwd, [0, 1, 0]));
      let up = this._normalize(this._cross(right, fwd));

      const moveHeld = z4SpaceHeld || z4TouchHeld;
      let moveAmp = 0.0;
      if (this.phase === "bay" || this.phase === "hallway" || this.phase === "ring") {
        moveAmp = moveHeld ? 1.0 : 0.0;
      } else if (
        this.phase === "reverse_bay" ||
        this.phase === "reverse_hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "fog_in_descent"
      ) {
        moveAmp = 0.55;
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

      // Apply shake offset to eye position
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

    _renderFall(now) {
      // Build from z4_fall module on first call
      if (!this._fallShaderBuilt) {
        this._fallShaderBuilt = true;
        var src = (window.GLSL && GLSL.modules && GLSL.modules.z4_fall) || null;
        if (!src) { console.error("[Zone4] GLSL.modules.z4_fall not found"); }
        else {
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
        // Render something visible so we know the phase is active
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

      // Disable all vertex attribs left over from station mesh rendering
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

      const cam = this._computeStationCamera();
      const eye = cam.eye;
      const fwd = cam.forward;
      const right = cam.right;
      const up = cam.up;

      const proj = this._perspective(Math.PI / 3.2, canvas.width / canvas.height, 0.05, 220.0);
      const view = this._lookAt(eye, this._add(eye, fwd), [0, 1, 0]);

      // Handle FBO resizing
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

      // ── Render scene to FBO ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fboDepth);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.01, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Draw background to FBO
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
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_eye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_forward"), fwd[0], fwd[1], fwd[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_right"), right[0], right[1], right[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_up"), up[0], up[1], up[2]);
      const earthFrame = this._stationFrame(this.ringU);
      const earthTarget = this._normalize(this._add(
        this._mul(earthFrame.radial, 1.0),
        [0, -0.14, 0]
      ));
      gl.uniform3f(
        gl.getUniformLocation(this.stationBgProg, "u_targetDir"),
        earthTarget[0], earthTarget[1], earthTarget[2]
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.earth);
      gl.uniform1i(gl.getUniformLocation(this.stationBgProg, "u_env"), 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Draw meshes on top in FBO
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.stationMeshProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_eye"), eye[0], eye[1], eye[2]);
      let _stationActive = true;
      let _portalModeRendered = -1;

      // Mode-name lookup by numeric slot 1-9 (matches mode1.js..mode9.js).
      const PORTAL_MODE_NAMES = [
        null,       // 0 = inactive
        "city",     // 1
        "fractal",  // 2
        "bh",       // 3 (mode3.js registers GLSL.modules.mirror — but
                    //    that's actually the BH/mirror kaleidoscope scene.
                    //    The Z1 numbering has mode 3 = bh in sequence.js
                    //    and the shader is named `mirror` in the modules.
                    //    We use the sequence number as intent.)
        "mirror",   // 4
        "ocean",    // 5
        "earth",    // 6
        "deadcity", // 7
        "goreville",// 8
        "plane",    // 9
      ];

      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];

        if (mesh.isPortalSurface) {
          const portalMode = this._windowModes[mesh.windowIdx] | 0;
          if (portalMode <= 0) {
            // Fall through to the normal station mesh path: inactive
            // windows keep their center glass instead of becoming holes.
          } else {
            const modeName = PORTAL_MODE_NAMES[portalMode];
            if (!modeName) continue;

            if (_portalModeRendered !== portalMode) {
              const ok = this._renderModeToFBO(modeName, portalMode, now, portalMode * 7.31 + this.z4ModeSeed);
              if (!ok) continue;
              _portalModeRendered = portalMode;
            }

            gl.enable(gl.DEPTH_TEST);
            const samp = this._ensurePortalSamplerProg();
            if (!samp) continue;

            gl.useProgram(samp);
            gl.uniformMatrix4fv(gl.getUniformLocation(samp, "u_proj"), false, proj);
            gl.uniformMatrix4fv(gl.getUniformLocation(samp, "u_view"), false, view);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._portalFBOTex);
            gl.uniform1i(gl.getUniformLocation(samp, "u_tex"), 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
            const stride = 8 * 4;
            const aPos = gl.getAttribLocation(samp, "a_pos");
            const aUv  = gl.getAttribLocation(samp, "a_uv");
            if (aPos >= 0) {
              gl.enableVertexAttribArray(aPos);
              gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
            }
            if (aUv >= 0) {
              gl.enableVertexAttribArray(aUv);
              gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 6 * 4);
            }
            gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
            _stationActive = false;
            continue;
          }
        }

        if (!_stationActive) {
          gl.useProgram(this.stationMeshProg);
          gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
          gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
          gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);
          gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_eye"), eye[0], eye[1], eye[2]);
          _stationActive = true;
        }
        this._bindStationMesh(mesh);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      }

      // ── Post-process pass — liquid, glitch, fractal hallucination ──
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
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_trip"), this.z4Trip);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_blinkAge"), 0.001 * (now - this.z4BlinkPeakTime));
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_isOOB"), this.z4IsOOB);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    render(now, mx, my) {
      if (this.isDead) return;

      // Force-kill Z1 — prevent any race condition or restart
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

      if (typeof mx !== "number") mx = window.mx || 0;
      if (typeof my !== "number") my = window.my || 0;

      if (!this.turnAnimating) {
        this.cx += (mx - this.cx) * Math.min(1, 0.12 * step);
        this.cy += (my - this.cy) * Math.min(1, 0.12 * step);
      } else {
        const turnElapsed = now - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        this.cx = this.turnLookX * (1 - turnT);
        this.cy = this.turnLookY * (1 - turnT);
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      }
      this._checkStationTurnThreshold(now);

      this._updateBlink(now);
      this._updatePhase(now, dt * 0.001);
      this.z4ModeTime += dt * 0.001;
      this.z4Trip = Math.max(0.18, Math.min(0.86, this.neuralIntensity / 3.6));
      this.z4IsOOB =
        this.phase === "bay" ||
        this.phase === "hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "ring" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "reverse_hallway" ||
        this.phase === "reverse_bay"
          ? 1.0
          : 0.0;

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
      } else {
        this._renderStation(now);
      }

      // Shake overlay during docking
      if (this.phase === "docking_shake") {
        var shakeAlpha = this.shakeIntensity * 3.0;
        this._drawOverlay(0.02, 0.0, 0.0, Math.min(0.15, shakeAlpha));
      }

      // Descent shake — escalating red/dark overlay
      if (this.phase === "descent_shake") {
        var shakeAlpha = this.shakeIntensity * 2.0;
        this._drawOverlay(0.15, 0.0, 0.0, Math.min(0.4, shakeAlpha));
      }

      // Fall entry — "kicked over the edge" flash. Covers the first
      // ~500ms of the fall phase: a sharp hot flash that fades, so the
      // shift from elevator view to freefall reads as an impact rather
      // than a camera cut.
      if (this.phase === "fall") {
        var fallElapsed = now - this.phaseStart;
        if (fallElapsed < 500) {
          var fA = fallElapsed < 80
            ? fallElapsed / 80
            : Math.max(0, 1 - (fallElapsed - 80) / 420);
          this._drawOverlay(1.0, 0.92, 0.82, fA * 0.95);
        }
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
      if (this.postProcessProg) gl.deleteProgram(this.postProcessProg);
      if (this.fallProg) gl.deleteProgram(this.fallProg);

      if (this._portalModeProgs) {
        for (const k in this._portalModeProgs) {
          if (this._portalModeProgs[k]) gl.deleteProgram(this._portalModeProgs[k]);
        }
      }
      if (this._portalSamplerProg) gl.deleteProgram(this._portalSamplerProg);
      if (this._portalFBO) gl.deleteFramebuffer(this._portalFBO);
      if (this._portalFBOTex) gl.deleteTexture(this._portalFBOTex);
      if (this._portalFBODepth) gl.deleteRenderbuffer(this._portalFBODepth);

      if (this.fbo) gl.deleteFramebuffer(this.fbo);
      if (this.fboTexture) gl.deleteTexture(this.fboTexture);
      if (this.fboDepth) gl.deleteRenderbuffer(this.fboDepth);

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
