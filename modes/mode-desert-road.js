window.GLSL = window.GLSL || {};
GLSL.modules = GLSL.modules || {};

GLSL.modules.mode_desert_road = `#version 300 es
precision highp float;
precision highp int;
out vec4 FragColor;

uniform mat4 view;
uniform mat4 proj;
uniform float iTime;
uniform int scrWidth;
uniform int scrHeight;
#define iResolution vec2(float(scrWidth), float(scrHeight))

uniform vec3 boxPos;
uniform vec3 boxPosTarget;

// Tunnel-exit trench (plane-tunnel handoff). Disabled when trenchB.x < 0.5.
//   trenchA = (mouthX, mouthZ, dirX, dirZ)  dir = unit heading the climber
//             walks while emerging (mouth -> road). The cut descends BEHIND
//             the mouth, away from the road.
//   trenchB = (enabled, slope, maxDepth, halfWidth)
// KEEP IN SYNC with the probe shader + the JS mirror (trenchCutJS).
uniform vec4 trenchA;
uniform vec4 trenchB;

// Parked harley: world-space textured quad, depth-tested against the
// terrain (world objects live in the shader, never as DOM stickers).
//   harleyA = (worldX, baseY, worldZ, visible)
//   harleyB = (halfWidth m, height m, quad yaw rad, unused)
uniform sampler2D harleyTex;
uniform vec4 harleyA;
uniform vec4 harleyB;

// Crashed fuselage tube — the visible PATH OUT OF THE TUNNEL. A hollow
// cylinder shell, open at the mouth end, half-buried at ~30 degrees with
// the climb-out ramp running through its interior. True SDF (overhangs!),
// unioned into map() so it raymarches, shadows, and occludes correctly.
//   tubeA = (mouthX, mouthY, mouthZ, enabled)   mouth = center of open end
//   tubeB = (axisX, axisY, axisZ, length)       axis: mouth -> buried end
//   tubeC = (radius, halfThickness, 0, 0)
uniform vec4 tubeA;
uniform vec4 tubeB;
uniform vec4 tubeC;

float tubeShell(vec3 p){
  vec3 pa = p - tubeA.xyz;
  float s = dot(pa, tubeB.xyz);
  vec3 rp = pa - tubeB.xyz * s;
  float radial = length(rp);
  float a = atan(rp.y, rp.x);
  float tear = 0.48 * sin(a * 5.0 + 0.7) + 0.26 * sin(a * 11.0 - 1.4);
  float side = abs(radial - tubeC.x) - tubeC.y;
  float axial = max(-s - tear, s - tubeB.w);
  return max(side, axial);
}

float trenchCut(vec2 xz, float h){
  if(trenchB.x < 0.5) return h;
  vec2 rel = xz - trenchA.xy;
  float along  = dot(rel, -trenchA.zw);
  float across = dot(rel, vec2(-trenchA.w, trenchA.z));
  float depth = min(max(along, 0.0) * trenchB.y, trenchB.z);
  // Half-pipe cross-section: the cut is the lower half of the buried
  // fuselage cylinder, not a flat-bottomed ditch.
  float xr = clamp(abs(across) / trenchB.w, 0.0, 1.0);
  float halfPipe = sqrt(max(1.0 - xr * xr, 0.0));
  float openIn = smoothstep(-1.3, 0.7, along);
  float endCap = 1.0 - smoothstep(8.0, 10.5, along);
  float cut = depth * halfPipe * openIn * endCap;
  // Torn rim lip just outside the cut edge.
  float lip = smoothstep(trenchB.w - 0.05, trenchB.w + 0.30, abs(across)) *
              (1.0 - smoothstep(trenchB.w + 0.30, trenchB.w + 0.95, abs(across)));
  float lipAmt = 0.18 * lip * openIn * endCap * smoothstep(0.4, 1.6, depth);
  return h - cut + lipAmt;
}

// 0..1: how much of the surface at xz belongs to the buried fuselage
// (cut interior or tail section). Drives the hull-metal albedo.
float trenchMask(vec2 xz){
  if(trenchB.x < 0.5) return 0.0;
  vec2 rel = xz - trenchA.xy;
  float along  = dot(rel, -trenchA.zw);
  float across = dot(rel, vec2(-trenchA.w, trenchA.z));
  float depth = min(max(along, 0.0) * trenchB.y, trenchB.z);
  float xr = clamp(abs(across) / trenchB.w, 0.0, 1.0);
  float halfPipe = sqrt(max(1.0 - xr * xr, 0.0));
  float openIn = smoothstep(-1.3, 0.7, along);
  float endCap = 1.0 - smoothstep(8.0, 10.5, along);
  float cut = depth * halfPipe * openIn * endCap;
  return clamp(cut * 1.4, 0.0, 1.0);
}

#define FAR 520.0
#define PI 3.141592653589793
#define TAU 6.283185307179586

float hash11(float x){ return fract(sin(x * 127.1) * 43758.5453123); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float hash31(vec3 p){ return fract(sin(dot(p, vec3(21.71, 157.97, 113.43))) * 45758.5453); }

float n1D(float x){
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), f);
}

float n2D(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rot2(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

float fbm(vec2 p){
  // 4 octaves is plenty for the ground texturing; 5th was sub-pixel detail
  // the user can't see and costs ~1ms per frame on integrated GPUs.
  float v = 0.0;
  float a = 0.5;
  for(int i = 0; i < 4; i++){
    v += n2D(p) * a;
    p = rot2(0.47) * p * 2.05 + vec2(17.3, 8.1);
    a *= 0.5;
  }
  return v;
}

float roadCenter(float z){
  // Long engineered alignments with occasional broad mountain bends.
  float broad = (n1D(z * 0.0024 + 5.7) - 0.5) * 42.0;
  float bend = (n1D(z * 0.0062 + 17.1) - 0.5) * 9.0;
  return broad + bend;
}

float roadHalfWidth(float z){
  return 4.10 + (n1D(z * 0.0045 + 23.4) - 0.5) * 0.24;
}

float roadGrade(float z){
  // The long visible crests and dips are one of the defining features in the
  // supplied references. Keep the grade broad enough to remain driveable.
  float roll = cos(z * 0.0115) * 4.2 +
               cos(z * 0.0045 + 0.45) * 3.2;
  float secondary = (n1D(z * 0.0052 + 31.0) - 0.5) * 1.4;
  return roll + secondary;
}

void roadData(vec2 xz, out float road, out float shoulder, out float centerOffset, out float signedEdge){
  float c = roadCenter(xz.y);
  float w = roadHalfWidth(xz.y);
  centerOffset = xz.x - c;
  signedEdge = abs(centerOffset) - w;
  road = 1.0 - smoothstep(-0.04, 0.22, signedEdge);
  shoulder = 1.0 - smoothstep(0.20, 4.8, signedEdge);
}

float roadFloorHeight(vec3 p){
  float center = roadCenter(p.z);
  float aggregate = n2D(vec2(center * 0.041, p.z * 0.035));
  float crown = abs(p.x - center) * 0.014;
  return roadGrade(p.z) + 0.38 + crown + (aggregate - 0.5) * 0.055;
}

float duneFunc(vec3 p){
  // Basin floor + real mountain mass. The former shader never rose beyond a
  // few metres, so palette changes could not make it resemble Anza-Borrego.
  vec2 q = p.xz;
  vec2 rq = rot2(0.31) * q;
  float grade = roadGrade(p.z);
  float fan = (n2D(q * 0.014 + vec2(3.7, -8.2)) - 0.5) * 2.3;
  float folds = 1.0 - abs(n2D(rq * 0.046 + vec2(-5.0, 11.0)) * 2.0 - 1.0);
  folds = smoothstep(0.43, 0.94, folds) * 0.95;
  float washField = n2D(vec2(q.x * 0.030 + q.y * 0.009, q.y * 0.025) + vec2(17.0, 4.0));
  float wash = 1.0 - smoothstep(0.035, 0.115, abs(washField - 0.50));
  // Mountains rise outside the alluvial corridor. Ridged noise cuts the long
  // diagonal faces and ravines visible in the reference ranges.
  float lateral = abs(p.x - roadCenter(p.z));
  float rangeGate = smoothstep(34.0, 125.0, lateral);
  float massif = n2D(vec2(p.x * 0.0075, p.z * 0.0048) + vec2(19.0, -7.0));
  float ridges = 1.0 - abs(n2D(vec2(p.x * 0.019 + p.z * 0.006,
                                    p.z * 0.012) + vec2(-3.0, 27.0)) * 2.0 - 1.0);
  ridges *= ridges;
  float mountain = rangeGate * rangeGate * (12.0 + massif * 31.0 + ridges * 15.0);
  float cutReach = 1.0 - smoothstep(70.0, 155.0, p.z);
  float cutBank = cutReach * smoothstep(9.5, 27.0, lateral) *
                  (2.0 + folds * 4.2);
  return grade + 0.40 + fan + folds - wash * 0.48 + cutBank + mountain;
}

float surfFunc(vec3 p){
  float dunes = duneFunc(p);
  float road;
  float shoulder;
  float centerOffset;
  float signedEdge;
  roadData(p.xz, road, shoulder, centerOffset, signedEdge);
  float corridor = 1.0 - smoothstep(0.0, 15.0, abs(centerOffset));
  float roadFloor = roadFloorHeight(p);
  float engineered = roadFloor + max(signedEdge, 0.0) * 0.035;
  float flattened = mix(dunes, engineered, shoulder);
  flattened -= road * 0.045;
  float berm = (1.0 - smoothstep(0.15, 1.35, abs(signedEdge))) * (1.0 - road);
  flattened += berm * 0.075;
  return trenchCut(p.xz, mix(dunes, flattened, max(shoulder, corridor * 0.18)));
}

float map(vec3 p){
  float d = p.y - surfFunc(p);
  if(tubeA.w > 0.5) d = min(d, tubeShell(p));
  return d;
}

vec3 tubeNormal(vec3 p){
  vec2 e = vec2(0.02, 0.0);
  return normalize(vec3(
    tubeShell(p + e.xyy) - tubeShell(p - e.xyy),
    tubeShell(p + e.yxy) - tubeShell(p - e.yxy),
    tubeShell(p + e.yyx) - tubeShell(p - e.yyx)));
}

float traceTerrain(vec3 ro, vec3 rd){
  // Height-field march with sign-crossing bisection. The old sphere-trace
  // (step = h * k, epsilon hit test) breaks down on grazing rays: h is a
  // vertical height difference, not a true distance bound, so near-tangent
  // rays either exhaust the iteration budget skimming a crest or hop over
  // real terrain — both render as giant concentric hit/miss rings around
  // the tangent point. Marching with a t-proportional minimum step and
  // bisecting the [prev, cur] bracket on the first h < 0 sample is robust
  // at grazing angles AND gives exact hits (no distance quantization rings).
  float t = 0.0;
  float tPrev = 0.0;
  for(int i = 0; i < 120; i++){
    vec3 p = ro + rd * t;
    float h = map(p);
    if(h < 0.0){
      float a = tPrev, b = t;
      for(int j = 0; j < 9; j++){
        float m = 0.5 * (a + b);
        if(map(ro + rd * m) < 0.0) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    if(h < 0.002) return t;
    if(t > FAR) break;
    tPrev = t;
    t += max(h * 0.62, 0.035 + t * 0.018);
  }
  return FAR;
}

vec3 normalAt(vec3 p, float t){
  // Sample width tracks pixel footprint: a fixed-width normal aliases at
  // distance and the resulting per-pixel normal jitter blooms through the
  // fresnel sky reflection as bright moiré swirls on grazing dune faces.
  float w = max(0.08, t * 2.0 / iResolution.y * 1.5);
  float h = surfFunc(p);
  float hx = surfFunc(p + vec3(w, 0.0, 0.0));
  float hz = surfFunc(p + vec3(0.0, 0.0, w));
  return normalize(vec3(h - hx, w, h - hz));
}

float sandLines(vec2 p, float dist){
  p *= 0.24;
  vec2 p1 = rot2(PI / 4.0) * p;
  vec2 p2 = rot2(PI / 3.0) * p * 1.25;
  float l1 = 0.5 + 0.5 * sin(p1.y * 80.0 + fbm(p1 * 8.0) * 2.0);
  float l2 = 0.5 + 0.5 * sin(p2.y * 76.0 + fbm(p2 * 6.0) * 2.0 + 1.9);
  float c = mix(l1, l2, smoothstep(0.1, 0.9, fbm(p1 * 4.0)));
  return c / (1.0 + dist * dist * 0.015);
}

float softShadow(vec3 ro, vec3 rd){
  // Keep this coarse; the shadow only feeds a diffuse multiplier.
  float res = 1.0;
  float t = 0.35;
  for(int i = 0; i < 16; i++){
    float h = map(ro + rd * t);
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.18, 2.4);
    if(res < 0.02 || t > 48.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 getSky(vec3 ro, vec3 rd, vec3 sunDir){
  // Deep, dry high-desert blue fading to cyan and mineral haze at the basin.
  float altitude = smoothstep(-0.08, 0.78, rd.y);
  vec3 horizon = vec3(0.48, 0.68, 0.81);
  vec3 zenith  = vec3(0.055, 0.285, 0.64);
  vec3 sky = mix(horizon, zenith, pow(altitude, 0.62));
  // Soft pale gold sun (wide), narrow white core.
  float sunWide  = pow(max(dot(rd, sunDir), 0.0), 24.0);
  float sunCore  = pow(max(dot(rd, sunDir), 0.0), 256.0);
  sky += vec3(1.00, 0.88, 0.62) * sunWide * 0.55;
  sky += vec3(1.00, 0.96, 0.86) * sunCore * 1.20;
  // Long wind-sheared cloud bands like the supplied daylight references.
  float az = atan(rd.x, rd.z);
  vec2 cloudP = vec2(az * 1.35 + rd.y * 6.5, rd.y * 9.0);
  float cloudN = n2D(cloudP + vec2(4.2, 12.7)) * 0.52 +
                 n2D(cloudP * vec2(2.4, 0.58) - vec2(9.0, 3.0)) * 0.31 +
                 n2D(cloudP * vec2(5.2, 0.34) + vec2(2.0, 17.0)) * 0.17;
  float highBand = smoothstep(0.54, 0.73, cloudN) *
                   smoothstep(0.06, 0.18, rd.y) * (1.0 - smoothstep(0.64, 0.90, rd.y));
  float lowStreak = smoothstep(0.61, 0.76,
                    n2D(vec2(az * 2.8 + rd.y * 13.0, rd.y * 19.0) + vec2(31.0, 5.0))) *
                    smoothstep(0.015, 0.08, rd.y) * (1.0 - smoothstep(0.23, 0.40, rd.y));
  sky = mix(sky, vec3(0.82, 0.88, 0.93), highBand * 0.46);
  sky = mix(sky, vec3(0.90, 0.91, 0.90), lowStreak * 0.34);

  // Pale grey-tan dust is concentrated tightly around the horizon.
  float haze = exp(-abs(rd.y) * 10.0);
  sky = mix(sky, vec3(0.76, 0.73, 0.66), haze * 0.30);
  return sky;
}

float getMist(vec3 ro, vec3 rd, float t){
  float d = smoothstep(95.0, FAR, t);
  float low = 1.0 - smoothstep(-0.10, 0.65, rd.y);
  return d * low;
}

float ridgeNoise(float x, float scale, float seed){
  return n1D(x * scale + seed) * 0.55 +
         n1D(x * scale * 2.17 + seed * 1.73) * 0.30 +
         n1D(x * scale * 4.31 - seed) * 0.15;
}

vec3 borregoBackdrop(vec3 sky, vec3 ro, vec3 rd, vec3 sunDir){
  float y = rd.y;
  float az = atan(rd.x, rd.z);
  float sunWash = smoothstep(0.25, 0.95, dot(rd, sunDir));

  // A full mountain range, not a thin horizon stripe. Two silhouette layers
  // and directional face noise create the large folded Peninsular Range mass.
  float farProfile = 0.070 + ridgeNoise(az, 2.15, 8.0) * 0.185;
  farProfile += ridgeNoise(az + 2.8, 7.5, 42.0) * 0.030;
  float farFill = (1.0 - smoothstep(farProfile - 0.006, farProfile + 0.005, y)) *
                  smoothstep(-0.145, -0.060, y);
  float faceNoise = n2D(vec2(az * 21.0 + y * 9.0, y * 38.0) + vec2(7.0, 18.0));
  float ravine = pow(abs(sin(az * 18.0 + y * 31.0 + faceNoise * 4.0)), 3.0);
  float faceLight = 0.62 + faceNoise * 0.34 - ravine * 0.27;
  vec3 farCol = mix(vec3(0.31, 0.34, 0.40), vec3(0.58, 0.49, 0.43), sunWash);
  farCol *= faceLight;
  farCol = mix(farCol, vec3(0.51, 0.52, 0.55), 0.18);
  sky = mix(sky, farCol, farFill * 0.96);

  float nearProfile = 0.012 + ridgeNoise(az + 1.7, 3.7, 23.0) * 0.105;
  nearProfile += 0.024 * sin(az * 4.5 + 1.3);
  float nearFill = (1.0 - smoothstep(nearProfile - 0.008, nearProfile + 0.005, y)) *
                   smoothstep(-0.135, -0.055, y);
  vec3 ridgeDir = normalize(vec3(sin(az), 0.16, cos(az)));
  float ridgeLit = 0.35 + 0.65 * max(dot(ridgeDir, sunDir), 0.0);
  float nearFace = n2D(vec2(az * 29.0 - y * 7.0, y * 46.0) + vec2(2.0, 31.0));
  vec3 nearCol = mix(vec3(0.32, 0.30, 0.28), vec3(0.67, 0.56, 0.42), ridgeLit);
  nearCol *= 0.70 + nearFace * 0.34;
  sky = mix(sky, nearCol, nearFill * 0.94);

  float dustLine = smoothstep(-0.075, 0.025, y) * (1.0 - smoothstep(0.035, 0.150, y));
  return mix(sky, vec3(0.73, 0.69, 0.61), dustLine * 0.16);
}

float borregoScrub(vec2 xz, float centerOffset, float t){
  vec2 cell = floor(xz / 4.8);
  vec2 f = fract(xz / 4.8);
  float seed = hash21(cell);
  vec2 jitter = vec2(hash21(cell + vec2(13.1, 2.7)),
                     hash21(cell + vec2(5.4, 19.2))) * 0.70 + 0.15;
  vec2 d = (f - jitter) * vec2(1.18, 0.88);
  float bush = 1.0 - smoothstep(0.055, 0.205, length(d));
  float density = smoothstep(0.42, 0.92, seed);
  float roadClear = smoothstep(7.2, 11.5, abs(centerOffset));
  float farFade = 1.0 - smoothstep(135.0, 260.0, t);
  return bush * density * roadClear * farFade;
}

float ocotilloMark(vec2 xz, float centerOffset, float t){
  vec2 cell = floor((xz + vec2(3.4, 1.1)) / 11.0);
  vec2 f = fract((xz + vec2(3.4, 1.1)) / 11.0);
  float seed = hash21(cell + vec2(41.0, 9.0));
  vec2 base = vec2(hash21(cell + vec2(1.7, 22.4)),
                   hash21(cell + vec2(17.2, 4.8))) * 0.62 + 0.19;
  vec2 d = f - base;
  float stalk = 1.0 - smoothstep(0.006, 0.020, abs(d.x + d.y * 0.18));
  stalk *= smoothstep(0.015, 0.060, d.y) * (1.0 - smoothstep(0.22, 0.42, d.y));
  float crown = 1.0 - smoothstep(0.020, 0.065, length(d - vec2(0.0, 0.28)));
  float density = smoothstep(0.83, 1.0, seed);
  float roadClear = smoothstep(5.0, 13.0, abs(centerOffset));
  float farFade = 1.0 - smoothstep(85.0, 175.0, t);
  return max(stalk, crown * 0.45) * density * roadClear * farFade;
}

vec3 terrainColor(vec3 sp, vec3 rd, vec3 sunDir, float t){
  vec3 n = normalAt(sp, t);
  float diff = max(dot(n, sunDir), 0.0);
  float sh = softShadow(sp + n * 0.12, sunDir);
  float ao = clamp(0.52 + 0.48 * n.y, 0.0, 1.0);

  float road;
  float shoulder;
  float centerOffset;
  float signedEdge;
  roadData(sp.xz, road, shoulder, centerOffset, signedEdge);

  // Anza-Borrego ground: pale tan / khaki / dusty grey, NOT red sandstone.
  // Two grains: large (warmth variation) + small (grit). Faint sand-ripple
  // micro-texture from sandLines, very desaturated.
  // LOD fades: high-frequency detail aliases into moiré swirls / fingerprint
  // rings once its wavelength drops under a pixel. Fade each detail layer
  // toward its mean based on PIXEL FOOTPRINT (metres per pixel), so the
  // cutoff adapts to render resolution instead of a fixed distance.
  float pxm = t * 2.0 / iResolution.y;                  // fov 90: ~m per pixel
  float fadeHi  = 1.0 - smoothstep(0.004, 0.020, pxm);  // mm-scale fbm grains
  float fadeMid = 1.0 - smoothstep(0.030, 0.140, pxm);  // ~0.3 m sand ripples
  float fadeGrit = fadeHi * fadeHi;                     // white-noise sparkle

  float grain  = mix(0.5, fbm(sp.xz * 16.0), fadeHi);
  float grain2 = mix(0.5, fbm(sp.xz * 32.0 - 0.5), fadeHi);
  vec3 sandCol = mix(vec3(0.84, 0.80, 0.69), vec3(0.60, 0.55, 0.45), grain);
  sandCol = mix(sandCol * 1.14, sandCol * 0.78, grain2);
  sandCol *= vec3(1.02, 1.01, 0.98);
  sandCol += sandLines(sp.xz, t) * vec3(0.06, 0.05, 0.04) * fadeMid;
  sandCol *= 0.86 + 0.22 * mix(0.5, hash31(floor(sp * 96.0)), fadeGrit);
  float paleWash = smoothstep(0.57, 0.86, fbm(sp.xz * 0.055 + vec2(18.0, -7.0)));
  sandCol = mix(sandCol, vec3(0.82, 0.78, 0.67), paleWash * (1.0 - road) * 0.24);
  float arroyoField = n2D(vec2(sp.x * 0.030 + sp.z * 0.009,
                               sp.z * 0.025) + vec2(17.0, 4.0));
  float arroyoBed = 1.0 - smoothstep(0.040, 0.125, abs(arroyoField - 0.50));
  sandCol = mix(sandCol, vec3(0.72, 0.70, 0.63), arroyoBed * (1.0 - road) * 0.36);
  float cutSlope = 1.0 - smoothstep(0.58, 0.93, n.y);
  float exposedRock = smoothstep(0.18, 0.82, cutSlope);
  vec3 rockCol = mix(vec3(0.47, 0.44, 0.39), vec3(0.68, 0.58, 0.45),
                    n2D(sp.xz * 0.065 + vec2(12.0, -4.0)));
  sandCol = mix(sandCol, rockCol, exposedRock * (1.0 - road) * 0.62);

  // Weathered S-22 asphalt: sun-bleached aggregate, repaired seams, double
  // yellow center lines and narrow white edges bleeding into gravel shoulders.
  float gravel = mix(0.5, fbm(sp.xz * vec2(10.0, 10.0)), fadeHi);
  vec3 roadCol = mix(vec3(0.075, 0.078, 0.074), vec3(0.21, 0.205, 0.19), gravel);
  roadCol += (fbm(vec2(sp.x * 20.0, sp.z * 3.0)) - 0.5) * 0.065 * fadeHi;
  float seam = 1.0 - smoothstep(0.0, 0.030, abs(fract(sp.z * 0.031 +
                          n1D(sp.z * 0.018) * 0.20) - 0.5));
  roadCol *= 1.0 - seam * 0.10 * fadeMid;
  float laneWear = 1.0 - smoothstep(0.35, 0.95,
                         abs(abs(centerOffset) - roadHalfWidth(sp.z) * 0.49));
  roadCol *= 1.0 - laneWear * 0.055;
  float yellowA = 1.0 - smoothstep(0.025, 0.105, abs(centerOffset - 0.14));
  float yellowB = 1.0 - smoothstep(0.025, 0.105, abs(centerOffset + 0.14));
  float yellowLines = max(yellowA, yellowB);
  float roadW = roadHalfWidth(sp.z);
  float whiteEdges = 1.0 - smoothstep(0.055, 0.135,
                           abs(abs(centerOffset) - max(roadW - 0.30, 1.8)));
  whiteEdges *= road;
  roadCol = mix(roadCol, vec3(0.82, 0.64, 0.19), yellowLines * 0.88);
  roadCol = mix(roadCol, vec3(0.82, 0.80, 0.72), whiteEdges * 0.72);
  float reflector = 1.0 - smoothstep(0.025, 0.10, abs(fract(sp.z * 0.23) - 0.5));
  roadCol += vec3(0.34, 0.25, 0.06) * yellowLines * reflector * fadeMid;

  vec3 col = mix(sandCol, roadCol, road);
  float edgeDust = shoulder * (1.0 - road);
  vec3 shoulderCol = mix(sandCol, vec3(0.60, 0.57, 0.49), 0.28 + gravel * 0.16);
  col = mix(col, shoulderCol, edgeDust * 0.58);
  float scrubShadow = borregoScrub(sp.xz + vec2(0.72, -0.58), centerOffset, t) * (1.0 - road);
  col *= 1.0 - scrubShadow * 0.24;
  float scrub = borregoScrub(sp.xz, centerOffset, t) * (1.0 - road);
  float ocotillo = ocotilloMark(sp.xz, centerOffset, t) * (1.0 - road);
  float plantTone = hash21(floor(sp.xz / 4.8));
  vec3 scrubCol = mix(vec3(0.21, 0.24, 0.15), vec3(0.39, 0.36, 0.21), plantTone);
  col = mix(col, scrubCol, scrub * 0.84);
  col = mix(col, vec3(0.20, 0.15, 0.075), ocotillo * 0.88);

  // Buried fuselage: the other end of the cabin tunnel. Soot-dark inside,
  // pale scuffed airliner skin at the broken lip.
  float hullM = trenchMask(sp.xz);
  if(hullM > 0.001){
    vec2 hrel = sp.xz - trenchA.xy;
    float halong = dot(hrel, -trenchA.zw);
    vec3 hull = mix(vec3(0.68, 0.69, 0.67), vec3(0.070, 0.068, 0.070),
                    smoothstep(0.4, 5.8, halong));
    float rib = smoothstep(0.78, 0.94, 0.5 + 0.5 * sin(halong * 4.4));
    hull *= 0.70 + 0.34 * rib;                       // frame ribs
    hull *= 0.82 + 0.34 * fbm(sp.xz * 6.0);          // scuffed, grimy
    float deep = smoothstep(0.5, 6.5, halong);       // toward the buried tail
    hull += vec3(0.055, 0.014, 0.011) * deep;        // dull red cabin glow
    hull = mix(hull, sandCol, 0.05);                 // faint dust film at lip
    col = mix(col, hull, hullM * 0.96);
  }

  float rim = (1.0 - smoothstep(0.0, 1.3, abs(signedEdge))) * (1.0 - road);
  col += vec3(0.06, 0.045, 0.028) * rim;

  // Pale neutral ambient + pale-gold sun. Less warm bias than red-rock desert.
  vec3 amb = vec3(0.46, 0.48, 0.52) * 0.42;
  vec3 lit = vec3(1.00, 0.92, 0.74) * diff * sh;
  col *= amb + lit;
  col *= ao;

  float fre = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
  col += getSky(sp, reflect(rd, n), sunDir) * fre * 0.08;
  return col;
}

vec3 TraceColor(vec3 ro, vec3 rd){
  vec3 sunDir = normalize(vec3(0.38, 0.58, -0.72));
  float t = traceTerrain(ro, rd);
  vec3 sky = borregoBackdrop(getSky(ro, rd, sunDir), ro, rd, sunDir);
  vec3 col = sky;
  if(t < FAR){
    vec3 sp = ro + rd * t;
    bool hitTube = tubeA.w > 0.5 && tubeShell(sp) < sp.y - surfFunc(sp);
    if(hitTube){
      vec3 tn = tubeNormal(sp);
      if(dot(tn, rd) > 0.0) tn = -tn;
      vec3 pa = sp - tubeA.xyz;
      float s = dot(pa, tubeB.xyz);
      vec3 radVec = pa - tubeB.xyz * s;
      float rl = max(length(radVec), 1e-3);
      if(rl < tubeC.x){
        // Interior wall: same dark cabin section, with frame ribs and seat
        // silhouettes disappearing into warm smoke.
        float rib = smoothstep(0.72, 0.94, 0.5 + 0.5 * sin(s * 4.6));
        float floorBand = 1.0 - smoothstep(0.30, 0.78, radVec.y / rl);
        float seatRows = smoothstep(0.50, 0.95, 0.5 + 0.5 * sin(s * 7.9));
        col = vec3(0.060, 0.058, 0.060) * (0.68 + 0.58 * rib);
        col = mix(col, vec3(0.018, 0.018, 0.021), floorBand * 0.38);
        col = mix(col, vec3(0.020, 0.023, 0.042), seatRows * floorBand * 0.24);
        col += vec3(0.060, 0.014, 0.010) * smoothstep(0.0, 9.0, s); // depth glow
        float lip = 1.0 - smoothstep(0.4, 4.6, s);
        vec3 scrapedLip = mix(vec3(0.58, 0.59, 0.56), vec3(0.10, 0.095, 0.090), floorBand);
        col = mix(col, scrapedLip, lip * 0.72);
        col += vec3(0.052, 0.052, 0.058) *
               max(dot(tn, normalize(vec3(0.3, 0.8, -0.5))), 0.0);
      } else {
        // Exterior: pale fuselage skin from the same wreck, not a generic pipe.
        float sideBand = 1.0 - smoothstep(0.07, 0.24, abs(radVec.y / rl));
        float windows = smoothstep(0.57, 0.93, 0.5 + 0.5 * sin(s * 8.2)) *
                        smoothstep(0.18, 0.56, abs(radVec.y / rl));
        float ribs = smoothstep(0.92, 0.985, 0.5 + 0.5 * sin(s * 4.6));
        vec3 hull = mix(vec3(0.62, 0.64, 0.63), vec3(0.045, 0.047, 0.052), windows * 0.82);
        hull = mix(hull, vec3(0.58, 0.035, 0.040), sideBand * 0.42);
        hull *= 0.82 + 0.30 * fbm(sp.xz * 5.0);        // grime / dents
        hull = mix(hull, vec3(0.12, 0.12, 0.13), ribs * 0.28);
        float dif = max(dot(tn, sunDir), 0.0);
        float sh = softShadow(sp + tn * 0.15, sunDir);
        col = hull * (vec3(0.46, 0.48, 0.52) * 0.44 +
                      vec3(1.00, 0.92, 0.74) * dif * sh);
        float fre = pow(1.0 - max(dot(-rd, tn), 0.0), 3.0);
        col += getSky(sp, reflect(rd, tn), sunDir) * fre * 0.10;
      }
      col = mix(col, sky, smoothstep(0.0, 1.0, t / FAR));
    } else {
      col = terrainColor(sp, rd, sunDir, t);
      float mist = getMist(ro, rd, t);
      // Distance haze separates the basin, foothills and far range without
      // bleaching the entire foreground.
      col = mix(col, sky, mist * 0.58);
    }
  }
  // Parked harley sprite quad (in front of whatever the terrain gave us).
  if(harleyA.w > 0.5){
    vec3 base = vec3(harleyA.x, harleyA.y, harleyA.z);
    vec3 r = vec3(cos(harleyB.z), 0.0, sin(harleyB.z));
    vec3 n = vec3(-r.z, 0.0, r.x);
    float denom = dot(rd, n);
    if(abs(denom) > 1e-4){
      float tq = dot(base - ro, n) / denom;
      if(tq > 0.0 && tq < t){
        vec3 hp = ro + rd * tq;
        float uu = dot(hp - base, r) / harleyB.x;
        float vv = (hp.y - base.y) / harleyB.y;
        if(abs(uu) <= 1.0 && vv >= 0.0 && vv <= 1.0){
          vec4 spr = texture(harleyTex, vec2(uu * 0.5 + 0.5, 1.0 - vv));
          if(spr.a > 0.62){
            vec3 bcol = spr.rgb * vec3(1.0, 0.97, 0.92) * 0.96;
            col = mix(bcol, sky, smoothstep(0.0, 1.0, tq / FAR));
          }
        }
      }
    }
  }
  // Sun bloom: pale gold instead of red.
  col += vec3(0.96, 0.84, 0.62) * pow(max(dot(rd, sunDir), 0.0), 16.0) * 0.35;
  return col;
}

void mainImage(out vec4 fragColor, vec2 fragCoord){
  vec2 u = (fragCoord - iResolution.xy * 0.5) / iResolution.y * 2.0;
  vec3 ro, rd;
  {
    mat3 rot = mat3(view);
    float fov = 90.0;
    float z = -1.0 / tan(radians(fov / 2.0));
    ro = -view[3].xyz * rot;
    rd = normalize(vec3(u.x, u.y, z)) * rot;
  }
  vec3 col = TraceColor(ro, rd);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}

void main(){
  mainImage(FragColor, gl_FragCoord.xy);
}
`;

// =============================================================================
// Scene runtime: camera + movement.
// =============================================================================
//
// Three phases, all advanced ONLY by live forward input (Space / W / Up Arrow / K /
// touch-hold). Handoff-held input is not carried in; press again to move.
//
//   PHASE_APPROACH : starts ~20 ft (6.1 m) off the road, perpendicular to it,
//                    facing the road. Held input walks the camera straight in
//                    until it reaches the road centerline.
//   PHASE_TURN     : pivots yaw 90° clockwise (right turn from the walker's
//                    POV) over TURN_DURATION worth of held input. Camera
//                    position stays pinned to the road centerline; only yaw
//                    moves.
//   PHASE_TRACK    : rails-locked. camX = roadCenter(camZ), yaw = road tangent,
//                    held input drives camZ forward along the road.
//   PHASE_RIDE     : ArrowUp throttles the motorcycle; ArrowDown brakes.
//
// Mouse position = look offset (yaw + pitch) clamped within rail limits.
// =============================================================================
(function () {
  "use strict";

  // ---- Vertex shader: fullscreen triangle (no attributes) -------------------
  var VERT_SRC =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "void main(){\n" +
    "  vec2 p = vec2(\n" +
    "    (gl_VertexID == 2) ? 3.0 : -1.0,\n" +
    "    (gl_VertexID == 1) ? 3.0 : -1.0\n" +
    "  );\n" +
    "  gl_Position = vec4(p, 0.0, 1.0);\n" +
    "}\n";

  // ---- Probe shader ---------------------------------------------------------
  // Runs the SAME noise + road + dune + surf functions as the main shader, on
  // the GPU, at a single 1×1 pixel. JS reads the result back so the camera
  // floats on whatever the renderer is actually drawing (no float32-vs-float64
  // drift, no burying into invisible dunes).
  //
  //   outColor.r = roadCenter(u_z)
  //   outColor.g = roadHalfWidth(u_z)
  //   outColor.b = surfFunc(vec3(u_x, 0, u_z))
  //   outColor.a = roadCenter(u_z + u_ahead)
  //
  // Functions are duplicated verbatim from the main shader. KEEP THIS IN SYNC
  // if you tweak the noise / road / dune math.
  var PROBE_FRAG_SRC =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "precision highp int;\n" +
    "layout(location = 0) out vec4 outColor;\n" +
    "uniform float u_x;\n" +
    "uniform float u_z;\n" +
    "uniform float u_ahead;\n" +
    "uniform vec4 trenchA;\n" +
    "uniform vec4 trenchB;\n" +
    "#define PI 3.141592653589793\n" +
    "#define TAU 6.283185307179586\n" +
    "float hash11(float x){ return fract(sin(x * 127.1) * 43758.5453123); }\n" +
    "float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }\n" +
    "float n1D(float x){\n" +
    "  float i = floor(x); float f = fract(x);\n" +
    "  f = f * f * (3.0 - 2.0 * f);\n" +
    "  return mix(hash11(i), hash11(i + 1.0), f);\n" +
    "}\n" +
    "float n2D(vec2 p){\n" +
    "  vec2 i = floor(p); vec2 f = fract(p);\n" +
    "  vec2 u = f * f * (3.0 - 2.0 * f);\n" +
    "  float a = hash21(i);\n" +
    "  float b = hash21(i + vec2(1.0, 0.0));\n" +
    "  float c = hash21(i + vec2(0.0, 1.0));\n" +
    "  float d = hash21(i + vec2(1.0, 1.0));\n" +
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n" +
    "}\n" +
    "float roadCenter(float z){\n" +
    "  float broad = (n1D(z * 0.0024 + 5.7) - 0.5) * 42.0;\n" +
    "  float bend = (n1D(z * 0.0062 + 17.1) - 0.5) * 9.0;\n" +
    "  return broad + bend;\n" +
    "}\n" +
    "float roadHalfWidth(float z){ return 4.10 + (n1D(z * 0.0045 + 23.4) - 0.5) * 0.24; }\n" +
    "float roadGrade(float z){\n" +
    "  float roll = cos(z * 0.0115) * 4.2 + cos(z * 0.0045 + 0.45) * 3.2;\n" +
    "  float secondary = (n1D(z * 0.0052 + 31.0) - 0.5) * 1.4;\n" +
    "  return roll + secondary;\n" +
    "}\n" +
    "void roadData(vec2 xz, out float road, out float shoulder, out float centerOffset, out float signedEdge){\n" +
    "  float c = roadCenter(xz.y);\n" +
    "  float w = roadHalfWidth(xz.y);\n" +
    "  centerOffset = xz.x - c;\n" +
    "  signedEdge = abs(centerOffset) - w;\n" +
    "  road = 1.0 - smoothstep(-0.04, 0.22, signedEdge);\n" +
    "  shoulder = 1.0 - smoothstep(0.20, 4.8, signedEdge);\n" +
    "}\n" +
    "float roadFloorHeight(vec3 p){\n" +
    "  float center = roadCenter(p.z);\n" +
    "  float aggregate = n2D(vec2(center * 0.041, p.z * 0.035));\n" +
    "  float crown = abs(p.x - center) * 0.014;\n" +
    "  return roadGrade(p.z) + 0.38 + crown + (aggregate - 0.5) * 0.055;\n" +
    "}\n" +
    "float duneFunc(vec3 p){\n" +
    "  vec2 q = p.xz;\n" +
    "  float c = cos(0.31), s = sin(0.31);\n" +
    "  vec2 rq = vec2(c * q.x - s * q.y, s * q.x + c * q.y);\n" +
    "  float grade = roadGrade(p.z);\n" +
    "  float fan = (n2D(q * 0.014 + vec2(3.7, -8.2)) - 0.5) * 2.3;\n" +
    "  float folds = 1.0 - abs(n2D(rq * 0.046 + vec2(-5.0, 11.0)) * 2.0 - 1.0);\n" +
    "  folds = smoothstep(0.43, 0.94, folds) * 0.95;\n" +
    "  float washField = n2D(vec2(q.x * 0.030 + q.y * 0.009, q.y * 0.025) + vec2(17.0, 4.0));\n" +
    "  float wash = 1.0 - smoothstep(0.035, 0.115, abs(washField - 0.50));\n" +
    "  float lateral = abs(p.x - roadCenter(p.z));\n" +
    "  float rangeGate = smoothstep(34.0, 125.0, lateral);\n" +
    "  float massif = n2D(vec2(p.x * 0.0075, p.z * 0.0048) + vec2(19.0, -7.0));\n" +
    "  float ridges = 1.0 - abs(n2D(vec2(p.x * 0.019 + p.z * 0.006, p.z * 0.012) + vec2(-3.0, 27.0)) * 2.0 - 1.0);\n" +
    "  ridges *= ridges;\n" +
    "  float mountain = rangeGate * rangeGate * (12.0 + massif * 31.0 + ridges * 15.0);\n" +
    "  float cutReach = 1.0 - smoothstep(70.0, 155.0, p.z);\n" +
    "  float cutBank = cutReach * smoothstep(9.5, 27.0, lateral) * (2.0 + folds * 4.2);\n" +
    "  return grade + 0.40 + fan + folds - wash * 0.48 + cutBank + mountain;\n" +
    "}\n" +
    "float trenchCut(vec2 xz, float h){\n" +
    "  if(trenchB.x < 0.5) return h;\n" +
    "  vec2 rel = xz - trenchA.xy;\n" +
    "  float along  = dot(rel, -trenchA.zw);\n" +
    "  float across = dot(rel, vec2(-trenchA.w, trenchA.z));\n" +
    "  float depth = min(max(along, 0.0) * trenchB.y, trenchB.z);\n" +
    "  float xr = clamp(abs(across) / trenchB.w, 0.0, 1.0);\n" +
    "  float halfPipe = sqrt(max(1.0 - xr * xr, 0.0));\n" +
    "  float openIn = smoothstep(-1.3, 0.7, along);\n" +
    "  float endCap = 1.0 - smoothstep(8.0, 10.5, along);\n" +
    "  float cut = depth * halfPipe * openIn * endCap;\n" +
    "  float lip = smoothstep(trenchB.w - 0.05, trenchB.w + 0.30, abs(across)) *\n" +
    "              (1.0 - smoothstep(trenchB.w + 0.30, trenchB.w + 0.95, abs(across)));\n" +
    "  float lipAmt = 0.18 * lip * openIn * endCap * smoothstep(0.4, 1.6, depth);\n" +
    "  return h - cut + lipAmt;\n" +
    "}\n" +
    "float surfFunc(vec3 p){\n" +
    "  float dunes = duneFunc(p);\n" +
    "  float road, shoulder, centerOffset, signedEdge;\n" +
    "  roadData(p.xz, road, shoulder, centerOffset, signedEdge);\n" +
    "  float corridor = 1.0 - smoothstep(0.0, 15.0, abs(centerOffset));\n" +
    "  float roadFloor = roadFloorHeight(p);\n" +
    "  float engineered = roadFloor + max(signedEdge, 0.0) * 0.035;\n" +
    "  float flattened = mix(dunes, engineered, shoulder);\n" +
    "  flattened -= road * 0.045;\n" +
    "  float berm = (1.0 - smoothstep(0.15, 1.35, abs(signedEdge))) * (1.0 - road);\n" +
    "  flattened += berm * 0.075;\n" +
    "  return trenchCut(p.xz, mix(dunes, flattened, max(shoulder, corridor * 0.18)));\n" +
    "}\n" +
    "void main(){\n" +
    "  float c = roadCenter(u_z);\n" +
    "  float w = roadHalfWidth(u_z);\n" +
    "  float h = surfFunc(vec3(u_x, 0.0, u_z));\n" +
    "  float a = roadCenter(u_z + u_ahead);\n" +
    "  outColor = vec4(c, w, h, a);\n" +
    "}\n";

  // ---- JS mirrors of shader noise + road + terrain --------------------------
  // Must track the GLSL above (modulo float32 vs float64) so the camera floats
  // consistently with what gets rendered.
  function hash11JS(x) {
    var v = Math.sin(x * 127.1) * 43758.5453123;
    return v - Math.floor(v);
  }
  function hash21JS(px, pz) {
    var v = Math.sin(px * 127.1 + pz * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }
  function n1DJS(x) {
    var i = Math.floor(x);
    var f = x - i;
    f = f * f * (3 - 2 * f);
    return hash11JS(i) * (1 - f) + hash11JS(i + 1) * f;
  }
  function n2DJS(px, pz) {
    var ix = Math.floor(px), iz = Math.floor(pz);
    var fx = px - ix, fz = pz - iz;
    var ux = fx * fx * (3 - 2 * fx);
    var uz = fz * fz * (3 - 2 * fz);
    var a = hash21JS(ix,     iz);
    var b = hash21JS(ix + 1, iz);
    var c = hash21JS(ix,     iz + 1);
    var d = hash21JS(ix + 1, iz + 1);
    return (a * (1 - ux) + b * ux) * (1 - uz) +
           (c * (1 - ux) + d * ux) *      uz;
  }
  function smoothstepJS(e0, e1, x) {
    var t = (x - e0) / (e1 - e0);
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return t * t * (3 - 2 * t);
  }
  function roadCenterJS(z) {
    var broad = (n1DJS(z * 0.0024 + 5.7) - 0.5) * 42.0;
    var bend = (n1DJS(z * 0.0062 + 17.1) - 0.5) * 9.0;
    return broad + bend;
  }
  function roadHalfWidthJS(z) {
    return 4.10 + (n1DJS(z * 0.0045 + 23.4) - 0.5) * 0.24;
  }
  function roadGradeJS(z) {
    var roll = Math.cos(z * 0.0115) * 4.2 +
               Math.cos(z * 0.0045 + 0.45) * 3.2;
    var secondary = (n1DJS(z * 0.0052 + 31.0) - 0.5) * 1.4;
    return roll + secondary;
  }
  function roadFloorHeightJS(x, z) {
    var center = roadCenterJS(z);
    var aggregate = n2DJS(center * 0.041, z * 0.035);
    var crown = Math.abs(x - center) * 0.014;
    return roadGradeJS(z) + 0.38 + crown + (aggregate - 0.5) * 0.055;
  }
  function duneFuncJS(x, z) {
    var c = Math.cos(0.31), s = Math.sin(0.31);
    var rqx = c * x - s * z;
    var rqz = s * x + c * z;
    var grade = roadGradeJS(z);
    var fan = (n2DJS(x * 0.014 + 3.7, z * 0.014 - 8.2) - 0.5) * 2.3;
    var folds = 1.0 - Math.abs(n2DJS(rqx * 0.046 - 5.0, rqz * 0.046 + 11.0) * 2.0 - 1.0);
    folds = smoothstepJS(0.43, 0.94, folds) * 0.95;
    var washField = n2DJS(x * 0.030 + z * 0.009 + 17.0, z * 0.025 + 4.0);
    var wash = 1.0 - smoothstepJS(0.035, 0.115, Math.abs(washField - 0.50));
    var lateral = Math.abs(x - roadCenterJS(z));
    var rangeGate = smoothstepJS(34.0, 125.0, lateral);
    var massif = n2DJS(x * 0.0075 + 19.0, z * 0.0048 - 7.0);
    var ridges = 1.0 - Math.abs(n2DJS(x * 0.019 + z * 0.006 - 3.0,
                                      z * 0.012 + 27.0) * 2.0 - 1.0);
    ridges *= ridges;
    var mountain = rangeGate * rangeGate * (12.0 + massif * 31.0 + ridges * 15.0);
    var cutReach = 1.0 - smoothstepJS(70.0, 155.0, z);
    var cutBank = cutReach * smoothstepJS(9.5, 27.0, lateral) * (2.0 + folds * 4.2);
    return grade + 0.40 + fan + folds - wash * 0.48 + cutBank + mountain;
  }
  // Tunnel-exit trench mirror. Set by startModeDesertRoad when emergeIntro
  // is on; null = disabled. KEEP IN SYNC with trenchCut in BOTH shaders.
  var TRENCH_JS = null;
  function trenchCutJS(x, z, h) {
    if (!TRENCH_JS) return h;
    var rx = x - TRENCH_JS.mx, rz = z - TRENCH_JS.mz;
    var along  = -(rx * TRENCH_JS.dx + rz * TRENCH_JS.dz);
    var across = -rx * TRENCH_JS.dz + rz * TRENCH_JS.dx;
    var depth = Math.min(Math.max(along, 0) * TRENCH_JS.slope, TRENCH_JS.maxD);
    var xr = Math.min(Math.abs(across) / TRENCH_JS.halfW, 1);
    var halfPipe = Math.sqrt(Math.max(1 - xr * xr, 0));
    var openIn = smoothstepJS(-1.3, 0.7, along);
    var endCap = 1 - smoothstepJS(8.0, 10.5, along);
    var cut = depth * halfPipe * openIn * endCap;
    var lip = smoothstepJS(TRENCH_JS.halfW - 0.05, TRENCH_JS.halfW + 0.30, Math.abs(across)) *
              (1 - smoothstepJS(TRENCH_JS.halfW + 0.30, TRENCH_JS.halfW + 0.95, Math.abs(across)));
    var lipAmt = 0.18 * lip * openIn * endCap * smoothstepJS(0.4, 1.6, depth);
    return h - cut + lipAmt;
  }
  function surfFuncJS(x, z) {
    var dunes = duneFuncJS(x, z);
    var center = roadCenterJS(z);
    var w = roadHalfWidthJS(z);
    var centerOffset = x - center;
    var signedEdge = Math.abs(centerOffset) - w;
    var road     = 1.0 - smoothstepJS(-0.04, 0.22, signedEdge);
    var shoulder = 1.0 - smoothstepJS(0.20, 4.8, signedEdge);
    var corridor = 1.0 - smoothstepJS(0.0, 15.0, Math.abs(centerOffset));
    var roadFloor = roadFloorHeightJS(x, z);
    var engineered = roadFloor + Math.max(signedEdge, 0) * 0.035;
    var flattened = dunes * (1 - shoulder) + engineered * shoulder;
    flattened -= road * 0.045;
    var berm = (1 - smoothstepJS(0.15, 1.35, Math.abs(signedEdge))) * (1 - road);
    flattened += berm * 0.075;
    var blendT = Math.max(shoulder, corridor * 0.18);
    return trenchCutJS(x, z, dunes * (1 - blendT) + flattened * blendT);
  }

  // ---- WebGL helpers --------------------------------------------------------
  function compileShader(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("shader compile failed: " + log);
    }
    return sh;
  }
  function linkProgram(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error("program link failed: " + log);
    }
    return p;
  }

  // ---- Matrix helpers -------------------------------------------------------
  function vsub(a, b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function vcross(a, b){
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }
  function vdot(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function vnorm(a){
    var l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0]/l, a[1]/l, a[2]/l];
  }
  function lookAtMat4(eye, target, up) {
    var f = vnorm(vsub(target, eye));
    var s = vnorm(vcross(f, up));
    var u = vcross(s, f);
    var out = new Float32Array(16);
    out[0]  = s[0]; out[1]  = u[0]; out[2]  = -f[0]; out[3]  = 0;
    out[4]  = s[1]; out[5]  = u[1]; out[6]  = -f[1]; out[7]  = 0;
    out[8]  = s[2]; out[9]  = u[2]; out[10] = -f[2]; out[11] = 0;
    out[12] = -vdot(s, eye);
    out[13] = -vdot(u, eye);
    out[14] =  vdot(f, eye);
    out[15] = 1;
    return out;
  }
  function lerpAngle(a, b, t) {
    var d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function smooth01(t) {
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return t * t * (3 - t * 2);
  }

  // ---- Public API -----------------------------------------------------------
  window.startModeDesertRoad = function (opts) {
    opts = opts || {};

    // --- Tunables ---
    var EYE_ABOVE        = typeof opts.eyeAbove    === "number" ? opts.eyeAbove    : 1.55;
    var WALK_SPEED       = typeof opts.walkSpeed   === "number" ? opts.walkSpeed   : 1.9;  // m/s
    var TURN_DURATION    = typeof opts.turnDur     === "number" ? opts.turnDur     : 0.85; // seconds of held input
    var ROAD_OFFSET      = typeof opts.roadOffset  === "number" ? opts.roadOffset  : 6.10; // ~20 ft
    var TRACK_LOOK_AHEAD = typeof opts.lookAhead   === "number" ? opts.lookAhead   : 8.0;
    var RENDER_SCALE     = typeof opts.renderScale === "number" ? opts.renderScale : 1.00;
    var MAX_DIM          = typeof opts.maxDim      === "number" ? opts.maxDim      : 1600;
    var CENTER_PITCH     = typeof opts.centerPitch === "number" ? opts.centerPitch : -0.025;
    var startZ           = typeof opts.startZ      === "number" ? opts.startZ      : 0.0;

    // --- Canvas ---
    // The desert needs WebGL2. In the standalone harness "#c" is unused, so
    // we grab it directly. Inside the game the engine already holds a WebGL1
    // context on "#c", and a canvas can't switch context type — so if webgl2
    // is refused we swap "#c" for a fresh canvas (the old engine is already
    // dead by the time the cabin-tunnel route hands off here).
    var glOpts = {
      antialias: false, alpha: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    };
    function makeDesertCanvas() {
      var c = document.createElement("canvas");
      c.id = "c";
      c.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;display:block;background:#000;z-index:1;";
      return c;
    }
    var canvas = document.getElementById("c");
    var gl = canvas ? canvas.getContext("webgl2", glOpts) : null;
    if (!gl) {
      var freshCanvas = makeDesertCanvas();
      if (canvas && canvas.parentNode) canvas.parentNode.replaceChild(freshCanvas, canvas);
      else document.body.appendChild(freshCanvas);
      canvas = freshCanvas;
      gl = canvas.getContext("webgl2", glOpts);
    }
    if (!gl) {
      console.error("[mode-desert-road] WebGL2 required");
      return null;
    }

    // --- Program ---
    var vs, fs, program;
    var pvs, pfs, probeProgram;
    try {
      vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
      fs = compileShader(gl, gl.FRAGMENT_SHADER, GLSL.modules.mode_desert_road);
      program = linkProgram(gl, vs, fs);
      pvs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
      pfs = compileShader(gl, gl.FRAGMENT_SHADER, PROBE_FRAG_SRC);
      probeProgram = linkProgram(gl, pvs, pfs);
    } catch (e) {
      console.error("[mode-desert-road]", e.message);
      return null;
    }
    window.__modeDesertRoadActive = true;

    var u = {
      view:      gl.getUniformLocation(program, "view"),
      iTime:     gl.getUniformLocation(program, "iTime"),
      scrWidth:  gl.getUniformLocation(program, "scrWidth"),
      scrHeight: gl.getUniformLocation(program, "scrHeight"),
      trenchA:   gl.getUniformLocation(program, "trenchA"),
      trenchB:   gl.getUniformLocation(program, "trenchB"),
      harleyTex: gl.getUniformLocation(program, "harleyTex"),
      harleyA:   gl.getUniformLocation(program, "harleyA"),
      harleyB:   gl.getUniformLocation(program, "harleyB"),
      tubeA:     gl.getUniformLocation(program, "tubeA"),
      tubeB:     gl.getUniformLocation(program, "tubeB"),
      tubeC:     gl.getUniformLocation(program, "tubeC"),
    };
    var pu = {
      x:       gl.getUniformLocation(probeProgram, "u_x"),
      z:       gl.getUniformLocation(probeProgram, "u_z"),
      ahead:   gl.getUniformLocation(probeProgram, "u_ahead"),
      trenchA: gl.getUniformLocation(probeProgram, "trenchA"),
      trenchB: gl.getUniformLocation(probeProgram, "trenchB"),
    };
    var vao = gl.createVertexArray();

    // ---- 1×1 RGBA32F probe framebuffer ---------------------------------
    // probeBuf packs (roadCenter, roadHalfWidth, surfFunc(x,z), roadCenter(z+ahead)).
    var probeOK = !!gl.getExtension("EXT_color_buffer_float");
    var probeTex = gl.createTexture();
    var probeFbo = gl.createFramebuffer();
    var probeBuf = new Float32Array(4);
    probeBuf[0] = roadCenterJS(startZ);
    probeBuf[1] = roadHalfWidthJS(startZ);
    probeBuf[2] = surfFuncJS(probeBuf[0], startZ);
    probeBuf[3] = roadCenterJS(startZ + TRACK_LOOK_AHEAD);
    if (probeOK) {
      gl.bindTexture(gl.TEXTURE_2D, probeTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, probeTex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn("[mode-desert-road] probe FBO incomplete; falling back to JS terrain");
        probeOK = false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    function runProbe(x, z) {
      if (!probeOK) {
        probeBuf[0] = roadCenterJS(z);
        probeBuf[1] = roadHalfWidthJS(z);
        probeBuf[2] = surfFuncJS(x, z);
        probeBuf[3] = roadCenterJS(z + TRACK_LOOK_AHEAD);
        return;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
      gl.viewport(0, 0, 1, 1);
      gl.useProgram(probeProgram);
      gl.bindVertexArray(vao);
      gl.uniform1f(pu.x, x);
      gl.uniform1f(pu.z, z);
      gl.uniform1f(pu.ahead, TRACK_LOOK_AHEAD);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, probeBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // --- Phase machine ---
    var PHASE_EMERGE   = 3;   // climbing out of the tunnel-exit trench
    var PHASE_APPROACH = 0;
    var PHASE_TURN     = 1;
    var PHASE_TRACK    = 2;
    var PHASE_RIDE     = 4;   // mounted on the harley, throttling down the road

    // --- Parked harley + ride ---------------------------------------------
    // A world-space sprite quad parked on the road ahead. Walking into it
    // (PHASE_TRACK) mounts: the world sprite hides, bike.png overlays the
    // screen as the rider's own machine, and ArrowUp becomes throttle.
    // The overlay counter-shifts against mouse-look so the bike stays
    // straight on the road while the eyes wander.
    var HARLEY = opts.harley !== false;
    var BIKE_AHEAD   = typeof opts.bikeAhead   === "number" ? opts.bikeAhead   : 2.5;
    var RIDE_TOP     = typeof opts.rideSpeed   === "number" ? opts.rideSpeed   : 24;  // m/s
    var RIDE_ACCEL   = typeof opts.rideAccel   === "number" ? opts.rideAccel   : 9;
    var RIDE_DRAG    = typeof opts.rideDrag    === "number" ? opts.rideDrag    : 4.8;
    var RIDE_BRAKE   = typeof opts.rideBrake   === "number" ? opts.rideBrake   : 30;
    var bikeZ = 0, bikeX = 0, bikeY = 0;
    var harleyReady = false;
    var mounted = false;
    var rideSpeed = 0;
    var harleyGlTex = null;
    var bikeOverlayEl = null;

    // --- Tunnel-exit emerge intro (plane-tunnel handoff) ------------------
    // A passenger-jet fuselage section lies half-buried in the dune off the
    // +X side of the road, its TORN-OPEN END angled UP out of the sand. You
    // start deep inside the buried tube and climb the tilted interior up and
    // out through the raised opening, then step down onto the sand and walk
    // to the road. NO ditch is carved into the ground (trench disabled) — the
    // fuselage is the tubeShell alone, occluded by the dune where it's buried.
    var EMERGE = !!(opts.emergeIntro || opts.roadsideIntro || opts.startWithCabinTunnel);
    var EM_TILT       = typeof opts.exitTilt   === "number" ? opts.exitTilt   : 0.5235987756; // 30 degrees
    var EM_COS = Math.cos(EM_TILT), EM_SIN = Math.sin(EM_TILT);
    var TUBE_R        = typeof opts.exitRadius === "number" ? opts.exitRadius : 1.72;
    var TUBE_LEN      = typeof opts.exitLen    === "number" ? opts.exitLen    : 30.0;
    var EMERGE_ALONG0 = typeof opts.emergeAlong0 === "number" ? opts.emergeAlong0 : 13.6;
    var MOUTH_BACK    = typeof opts.mouthBack  === "number" ? opts.mouthBack  : 28.0;
    var MOUTH_RAISE   = typeof opts.mouthRaise === "number" ? opts.mouthRaise : 0.12; // lower lip just above sand
    var emergeAlong = 0;
    var mouthX = 0, mouthZ = 0, mouthY = 0;

    // --- Initial camera placement ---
    var camZ = startZ;
    var camX, camY;
    var yaw = -Math.PI / 2;       // looking -X (out the mouth, toward the road)
    var lookYaw = 0.0;
    var lookPitch = CENTER_PITCH;
    var phase = PHASE_APPROACH;

    runProbe(roadCenterJS(camZ) + ROAD_OFFSET, camZ);
    if (EMERGE) {
      // Mouth sits a couple metres past the +X shoulder, raised above the
      // dune so the opening clearly juts up. Axis = mouth -> buried tail,
      // pointing +X and DOWN into the sand.
      mouthX = probeBuf[0] + probeBuf[1] + MOUTH_BACK; // roadCenter + halfWidth + back
      mouthZ = camZ;
      runProbe(mouthX, mouthZ);
      var groundAtMouth = probeBuf[2];
      mouthY = groundAtMouth + TUBE_R + MOUTH_RAISE;
      gl.useProgram(program);
      if (u.tubeA) gl.uniform4f(u.tubeA, mouthX, mouthY, mouthZ, 1);
      if (u.tubeB) gl.uniform4f(u.tubeB, EM_COS, -EM_SIN, 0, TUBE_LEN); // mouth -> tail
      if (u.tubeC) gl.uniform4f(u.tubeC, TUBE_R, 0.22, 0, 0);
      emergeAlong = EMERGE_ALONG0;
      camX = mouthX + EM_COS * emergeAlong;             // deep inside, +X
      camZ = mouthZ;
      camY = (mouthY - EM_SIN * emergeAlong) - TUBE_R + EYE_ABOVE; // on the tube floor
      phase = PHASE_EMERGE;
    } else {
      TRENCH_JS = null;
      camX = probeBuf[0] + ROAD_OFFSET;       // snap to GPU's roadCenter
      runProbe(camX, camZ);                   // re-probe at the snapped X
      camY = probeBuf[2] + EYE_ABOVE;         // exact GLSL surfFunc height
    }

    // --- Parked harley placement + texture --------------------------------
    // The bike is parked ON the road, AT the point where the perpendicular
    // walk-out from the tunnel meets the road (z = startZ), oriented ALONG
    // the road with its front pointing DOWN-road (+Z = the way you'll ride).
    // You approach from the +X shoulder, so you meet its broad SIDE PROFILE
    // head-on — exactly what a side-on photo reads as. It hides on mount.
    if (HARLEY) {
      bikeZ = startZ;                         // directly ahead from the tunnel mouth
      runProbe(roadCenterJS(bikeZ), bikeZ);   // probeBuf: center/halfWidth at bikeZ
      bikeX = probeBuf[0];                     // ON the road centerline
      runProbe(bikeX, bikeZ);
      bikeY = probeBuf[2];                    // exact ground height under it
      var harleyImg = new Image();
      harleyImg.onload = function () {
        if (destroyed) return;
        harleyGlTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, harleyGlTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, harleyImg);
        // NO mipmaps: the png's transparent texels are WHITE with a=0, so
        // mip averaging bleeds a milky ghost-quad around the sprite.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var halfW = 1.55;                     // ~3.1 m screen-readable cruiser
        var hgt = halfW * 2 * (harleyImg.naturalHeight / Math.max(1, harleyImg.naturalWidth));
        gl.useProgram(program);
        if (u.harleyTex) gl.uniform1i(u.harleyTex, 0);
        if (u.harleyA) gl.uniform4f(u.harleyA, bikeX, bikeY, bikeZ, 1);
        // quad yaw = +pi/2 → in-plane axis r = (0,0,1): the bike lies ALONG
        // the road, photo front (texture u=1, right edge) at +Z = down-road.
        if (u.harleyB) gl.uniform4f(u.harleyB, halfW, hgt, Math.PI * 0.5, 0);
        harleyReady = true;
      };
      harleyImg.onerror = function () {
        console.warn("[mode-desert-road] harley.png failed to load");
      };
      harleyImg.src = "files/img/rooms/z4/harley.png";
    }

    // Turn pivot: 90° clockwise from -X to +Z (right turn from the walker POV).
    //   yaw = -π/2 → fwd = (sin(-π/2), 0, cos(-π/2)) = (-1, 0, 0)   (−X)
    //   yaw =   0  → fwd = (sin(  0  ), 0, cos(  0  )) = ( 0, 0, 1)  (+Z)
    var turnStartYaw = -Math.PI / 2;
    var turnEndYaw   = 0;
    var turnProgress = 0;

    // --- Input ---
    var keys = Object.create(null);
    window.__modeDesertRoadNav = { forward: false, back: false, left: false, right: false };
    function forwardKey(code) {
      return code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "KeyK";
    }
    function turnAliasKey(code) {
      return (
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "KeyA" ||
        code === "KeyD" ||
        code === "KeyH" ||
        code === "KeyL"
      );
    }
    function onKeyDown(e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      keys[e.code] = true;
      if (forwardKey(e.code) || e.code === "ArrowDown" || turnAliasKey(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function onKeyUp(e) {
      keys[e.code] = false;
      if (forwardKey(e.code) || e.code === "ArrowDown" || turnAliasKey(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", onKeyDown, { passive: false, capture: true });
    window.addEventListener("keyup",   onKeyUp,   { passive: false, capture: true });

    // Touch: any held finger counts as "forward".
    var touchHeld = false;
    function onTouchStart(e) { touchHeld = true; e.preventDefault(); }
    function onTouchEnd()    { touchHeld = false; }
    canvas.addEventListener("touchstart",  onTouchStart, { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    function walkHeld() {
      return !paused && !!(keys.Space || keys.KeyW || keys.KeyK || keys.ArrowUp || touchHeld);
    }
    function rideThrottleHeld() {
      return !paused && !!(keys.ArrowUp || touchHeld);
    }
    function rideBrakeHeld() {
      return !paused && !!keys.ArrowDown;
    }
    function syncDesertRoadNav() {
      var nav = { forward: false, back: false, left: false, right: false };
      if (!paused) {
        if (phase === PHASE_RIDE) {
          nav.forward = true;
          nav.back = rideSpeed > 0.05 || rideBrakeHeld();
        } else {
          nav.forward = true;
        }
      }
      window.__modeDesertRoadNav = nav;
      return nav;
    }

    // Mouse -> look offset, clamped to rail limits. No held button: cursor
    // position directly chooses the look direction.
    function clampLook() {
      var yLim = Math.PI * 0.245;
      var pLim = Math.PI * 0.18;
      if (lookYaw   >  yLim) lookYaw   =  yLim;
      if (lookYaw   < -yLim) lookYaw   = -yLim;
      if (lookPitch > CENTER_PITCH + pLim) lookPitch = CENTER_PITCH + pLim;
      if (lookPitch < CENTER_PITCH - pLim) lookPitch = CENTER_PITCH - pLim;
    }
    function onMouseMove(e) {
      var yLim = Math.PI * 0.245,
        pLim = Math.PI * 0.18,
        w = Math.max(1, window.innerWidth || 1),
        h = Math.max(1, window.innerHeight || 1),
        nx = (e.clientX - w / 2) / (w / 2),
        ny = (h / 2 - e.clientY) / (h / 2);
      lookYaw = nx * yLim;
      lookPitch = CENTER_PITCH + ny * pLim;
      clampLook();
    }
    window.addEventListener("mousemove", onMouseMove);

    // --- Resize ---
    var lastW = 0, lastH = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cssW = canvas.clientWidth  || window.innerWidth  || 800;
      var cssH = canvas.clientHeight || window.innerHeight || 600;
      var w = Math.max(2, Math.floor(cssW * dpr * RENDER_SCALE));
      var h = Math.max(2, Math.floor(cssH * dpr * RENDER_SCALE));
      var longest = Math.max(w, h);
      if (longest > MAX_DIM) {
        var k = MAX_DIM / longest;
        w = Math.max(2, Math.floor(w * k));
        h = Math.max(2, Math.floor(h * k));
      }
      if (w !== lastW || h !== lastH) {
        canvas.width = w; canvas.height = h;
        lastW = w; lastH = h;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Mount + cockpit overlay -------------------------------------------
    function mountHarley() {
      mounted = true;
      rideSpeed = 0;
      gl.useProgram(program);
      if (u.harleyA) gl.uniform4f(u.harleyA, bikeX, bikeY, bikeZ, 0); // hide world sprite
      bikeOverlayEl = document.getElementById("bike-overlay");
      if (!bikeOverlayEl) {
        bikeOverlayEl = document.createElement("img");
        bikeOverlayEl.id = "bike-overlay";
        bikeOverlayEl.src = "files/img/rooms/z4/bike.png";
        bikeOverlayEl.alt = "";
        document.body.appendChild(bikeOverlayEl);
      }
      phase = PHASE_RIDE;
    }

    // The overlay is the rider's own machine. Horizontal look may slide it
    // against the world, but vertical eye movement must never lift the bike
    // away from the viewport edge. Keep the PNG permanently bottom-anchored.
    function driveBikeOverlay() {
      if (!bikeOverlayEl || !mounted) return;
      var w = window.innerWidth || 800;
      var h = window.innerHeight || 600;
      var shiftX = Math.tan(lookYaw) * h * 0.5;
      bikeOverlayEl.style.cssText =
        "position:fixed;left:50%;bottom:-3px;z-index:600;pointer-events:none;" +
        "user-select:none;-webkit-user-drag:none;display:block;" +
        "width:" + Math.round(Math.min(w * 0.82, 1320)) + "px;" +
        "height:auto;max-width:none;transform-origin:50% 100%;" +
        "transform:translate3d(calc(-50% + " + shiftX.toFixed(1) + "px),0,0);";
    }

    // --- Frame loop ---
    var prev = performance.now();
    var simTime = 0;
    var rafId = 0;
    var destroyed = false;
    var paused = false;

    function frame(now) {
      if (destroyed) return;
      var dt = Math.min(0.05, (now - prev) * 0.001);
      prev = now;
      if (!paused) simTime += dt;

      // Held-forward gates ALL camera motion. Release = stop. While paused
      // (e.g. the cabin-tunnel overlay still owns the screen) input is
      // ignored entirely — otherwise the same held Space that advances the
      // tunnel would already be walking the desert camera underneath it.
      var held = walkHeld();
      syncDesertRoadNav();

      if (phase === PHASE_EMERGE) {
        // Climb the tilted fuselage interior up toward the raised mouth.
        if (held) emergeAlong -= WALK_SPEED * dt;
        if (emergeAlong <= 0) {
          emergeAlong = 0;
          phase = PHASE_APPROACH;
        }
        camX = mouthX + EM_COS * emergeAlong;
        camZ = mouthZ;
        camY = (mouthY - EM_SIN * emergeAlong) - TUBE_R + EYE_ABOVE;
      }
      else if (phase === PHASE_APPROACH) {
        if (held) camX -= WALK_SPEED * dt;
        runProbe(camX, camZ);
        var rx = probeBuf[0];                   // GPU's roadCenter(camZ)
        if (camX <= rx) {
          camX = rx;
          phase = PHASE_TURN;
          turnProgress = 0;
        }
        // Ease the ~0.8 m step-down from the raised mouth onto the sand
        // instead of snapping, then track the ground exactly.
        var tgtY = probeBuf[2] + EYE_ABOVE;     // GPU's surfFunc(camX, camZ)
        camY += (tgtY - camY) * Math.min(1, 9 * dt);
      }
      else if (phase === PHASE_TURN) {
        if (held) turnProgress = Math.min(1, turnProgress + dt / TURN_DURATION);
        yaw = lerpAngle(turnStartYaw, turnEndYaw, smooth01(turnProgress));
        runProbe(camX, camZ);
        camY = probeBuf[2] + EYE_ABOVE;
        if (turnProgress >= 1) {
          phase = PHASE_TRACK;
          yaw = turnEndYaw;
        }
      }
      else {
        // PHASE_TRACK walks the rails; PHASE_RIDE throttles them.
        if (phase === PHASE_RIDE) {
          var throttleHeld = rideThrottleHeld();
          var brakeHeld = rideBrakeHeld();
          if (throttleHeld && !brakeHeld) {
            rideSpeed = Math.min(RIDE_TOP, rideSpeed + RIDE_ACCEL * dt);
          } else {
            rideSpeed = Math.max(0, rideSpeed - (brakeHeld ? RIDE_BRAKE : RIDE_DRAG) * dt);
          }
          camZ += rideSpeed * dt;
        } else if (held) {
          camZ += WALK_SPEED * dt;
        }
        runProbe(camX, camZ);                   // ahead is baked into probe.a
        camX = probeBuf[0];                     // snap X to GPU's centerline
        camY = probeBuf[2] + EYE_ABOVE;
        var dxA = probeBuf[3] - camX;
        yaw = Math.atan2(dxA, TRACK_LOOK_AHEAD);
        if (phase === PHASE_TRACK && HARLEY && harleyReady && !mounted &&
            camZ >= bikeZ - 2.2) {
          mountHarley();
        }
      }
      syncDesertRoadNav();

      // view = lookAt(eye, eye + forward, up).
      var effYaw   = yaw + lookYaw;
      var effPitch = lookPitch;
      if (phase === PHASE_EMERGE) {
        // Look up the tilted tube toward the bright opening; eases to level
        // as you reach the mouth.
        effPitch += (EM_TILT + 0.16) * Math.min(1, emergeAlong / 5.5);
      }
      var cp = Math.cos(effPitch), sp = Math.sin(effPitch);
      var cy = Math.cos(effYaw),   sy = Math.sin(effYaw);
      var fx = sy * cp, fy = sp, fz = cy * cp;
      var eye  = [camX, camY, camZ];
      var look = [camX + fx, camY + fy, camZ + fz];
      var view = lookAtMat4(eye, look, [0, 1, 0]);
      // Verification-only free camera (no-op in production; only active when
      // a debug global is explicitly set by an offscreen render harness).
      if (window.__DESERT_DEBUG_CAM) {
        var dc = window.__DESERT_DEBUG_CAM;
        var dcp = Math.cos(dc.pitch), dsp = Math.sin(dc.pitch);
        var dcy = Math.cos(dc.yaw),   dsy = Math.sin(dc.yaw);
        view = lookAtMat4([dc.x, dc.y, dc.z],
          [dc.x + dsy * dcp, dc.y + dsp, dc.z + dcy * dcp], [0, 1, 0]);
      }

      driveBikeOverlay();

      // Render.
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      if (harleyGlTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, harleyGlTex);
      }
      gl.uniformMatrix4fv(u.view, false, view);
      if (u.iTime)     gl.uniform1f(u.iTime,     simTime);
      if (u.scrWidth)  gl.uniform1i(u.scrWidth,  canvas.width);
      if (u.scrHeight) gl.uniform1i(u.scrHeight, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    var handle = {
      pause:  function () { paused = true; },
      resume: function () { paused = false; prev = performance.now(); },
      // Snap the live scene straight into a phase. Accepts a string
      // ("emerge"|"approach"|"turn"|"track"|"ride") or the PHASE_* int.
      // Mirrors mode-alley.js seek() so the shared road engine is driven
      // the same way from the debug UI.
      seek: function (target) {
        if (target === "emerge" || target === PHASE_EMERGE) {
          // The fuselage interior only renders when the scene was started
          // with the emerge intro (tube uniforms are set once, at startup).
          phase = PHASE_EMERGE;
          if (EMERGE) {
            emergeAlong = EMERGE_ALONG0;
            camX = mouthX + EM_COS * emergeAlong;
            camZ = mouthZ;
            camY = (mouthY - EM_SIN * emergeAlong) - TUBE_R + EYE_ABOVE;
          }
        } else if (target === "approach" || target === PHASE_APPROACH) {
          // Off the +X shoulder, perpendicular to the road, facing it.
          phase = PHASE_APPROACH;
          turnProgress = 0;
          runProbe(roadCenterJS(camZ) + ROAD_OFFSET, camZ);
          camX = probeBuf[0] + ROAD_OFFSET;
          runProbe(camX, camZ);
          camY = probeBuf[2] + EYE_ABOVE;
          yaw = turnStartYaw;
        } else if (target === "turn" || target === PHASE_TURN) {
          // On the centerline, about to pivot from -X to +Z.
          phase = PHASE_TURN;
          turnProgress = 0;
          camX = roadCenterJS(camZ);
          runProbe(camX, camZ);
          camY = probeBuf[2] + EYE_ABOVE;
          yaw = turnStartYaw;
        } else if (target === "ride" || target === PHASE_RIDE) {
          // Rails-locked on the road, then mount the harley if it's loaded.
          camX = roadCenterJS(camZ);
          runProbe(camX, camZ);
          camY = probeBuf[2] + EYE_ABOVE;
          yaw = Math.atan2(roadCenterJS(camZ + TRACK_LOOK_AHEAD) - camX, TRACK_LOOK_AHEAD);
          turnProgress = 1;
          if (HARLEY && harleyReady) mountHarley();
          else phase = PHASE_TRACK; // bike texture still loading; land on the road
        } else {
          // "track" / "road" (default): rails-locked, walking the road.
          phase = PHASE_TRACK;
          turnProgress = 1;
          camX = roadCenterJS(camZ);
          runProbe(camX, camZ);
          camY = probeBuf[2] + EYE_ABOVE;
          yaw = Math.atan2(roadCenterJS(camZ + TRACK_LOOK_AHEAD) - camX, TRACK_LOOK_AHEAD);
        }
        lookYaw = 0;
        lookPitch = CENTER_PITCH;
        return handle;
      },
      getState: function () {
        return {
          x: camX, y: camY, z: camZ,
          yaw: yaw, lookYaw: lookYaw, lookPitch: lookPitch,
          phase: phase, turnProgress: turnProgress, emergeAlong: emergeAlong,
          mounted: mounted, rideSpeed: rideSpeed,
          throttleHeld: rideThrottleHeld(), brakeHeld: rideBrakeHeld(),
          nav: syncDesertRoadNav(),
          mouthX: mouthX, mouthY: mouthY, mouthZ: mouthZ,
          bikeX: bikeX, bikeY: bikeY, bikeZ: bikeZ,
          held: walkHeld(),
        };
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("keyup",   onKeyUp,   true);
        window.__modeDesertRoadActive = false;
        window.__modeDesertRoadNav = null;
        window.removeEventListener("mousemove",   onMouseMove);
        canvas.removeEventListener("touchstart",  onTouchStart);
        canvas.removeEventListener("touchend",    onTouchEnd);
        canvas.removeEventListener("touchcancel", onTouchEnd);
        window.removeEventListener("resize",      resize);
        try { gl.deleteProgram(program); } catch (e) {}
        try { gl.deleteProgram(probeProgram); } catch (e) {}
        try { gl.deleteShader(vs); } catch (e) {}
        try { gl.deleteShader(fs); } catch (e) {}
        try { gl.deleteShader(pvs); } catch (e) {}
        try { gl.deleteShader(pfs); } catch (e) {}
        try { gl.deleteVertexArray(vao); } catch (e) {}
        try { gl.deleteFramebuffer(probeFbo); } catch (e) {}
        try { gl.deleteTexture(probeTex); } catch (e) {}
        try { if (harleyGlTex) gl.deleteTexture(harleyGlTex); } catch (e) {}
        if (bikeOverlayEl) bikeOverlayEl.style.display = "none";
      },
    };
    window.__modeDesertRoadScene = handle;
    return handle;
  };

  window.stopModeDesertRoad = function () {
    if (window.__modeDesertRoadScene && window.__modeDesertRoadScene.destroy) {
      try { window.__modeDesertRoadScene.destroy(); } catch (e) {}
    }
    window.__modeDesertRoadScene = null;
  };

  // Debug transport: jump straight to any desert phase. Tears down any
  // competing road-engine scene (desert/alley/theater), starts the desert
  // with phase-appropriate opts, then snaps to the target. Mirrors the
  // alley hook (__alleyDebugGoto) — alley shares this same road engine.
  window.__desertDebugGoto = function (target) {
    var competing = [
      window.__modeDesertRoadScene,
      window.__modeAlleyScene,
      window.__modeTheaterScene,
    ];
    for (var i = 0; i < competing.length; i++) {
      var s = competing[i];
      if (s && typeof s.destroy === "function") {
        try { s.destroy(); } catch (e) {}
      }
    }
    window.__modeDesertRoadScene = null;
    window.isEngine1Dead = true;

    var opts = {};
    if (target === "emerge") opts.emergeIntro = true;
    else if (target === "approach") { /* default placement is the approach */ }
    else opts.startOnRoad = true; // turn / track / ride all begin on the road

    var scene = window.startModeDesertRoad(opts);
    if (scene && typeof scene.seek === "function") {
      scene.seek(target || "track");
      if (target === "ride") {
        // harley.png loads async; re-apply the mount once the texture is ready.
        setTimeout(function () {
          if (window.__modeDesertRoadScene === scene) scene.seek("ride");
        }, 140);
        setTimeout(function () {
          if (window.__modeDesertRoadScene === scene) scene.seek("ride");
        }, 360);
      }
    }
    return scene;
  };
})();
