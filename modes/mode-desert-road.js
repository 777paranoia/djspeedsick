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
  float radial = length(pa - tubeB.xyz * s);
  return max(abs(radial - tubeC.x) - tubeC.y,
             abs(s - tubeB.w * 0.5) - tubeB.w * 0.5);
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

#define FAR 160.0
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
  float big = (n1D(z * 0.006) - 0.5) * 34.0;
  float med = (n1D(z * 0.018 + 13.7) - 0.5) * 11.0;
  float small = sin(z * 0.030 + n1D(z * 0.012 + 7.3) * TAU) * 2.5;
  return big + med + small;
}

float roadHalfWidth(float z){
  return mix(2.2, 3.8, n1D(z * 0.011 + 23.4));
}

void roadData(vec2 xz, out float road, out float shoulder, out float centerOffset, out float signedEdge){
  float c = roadCenter(xz.y);
  float w = roadHalfWidth(xz.y);
  centerOffset = xz.x - c;
  signedEdge = abs(centerOffset) - w;
  road = 1.0 - smoothstep(0.0, 1.35, signedEdge);
  shoulder = 1.0 - smoothstep(1.0, 5.0, signedEdge);
}

float roadFloorHeight(vec3 p){
  float center = roadCenter(p.z);
  float laneNoise = n2D(vec2(center * 0.031, p.z * 0.020));
  float slowNoise = n2D(vec2(center * 0.017 + 19.0, p.z * 0.010));
  return laneNoise * 0.72 + slowNoise * 0.55 + 0.22;
}

float duneFunc(vec3 p){
  vec2 q = p.xz / 2.5;
  float layer1 = n2D(q * 0.20) * 2.0 - 0.5;
  layer1 = smoothstep(0.0, 1.05, layer1);
  float layer2 = n2D(q * 0.275);
  layer2 = 1.0 - abs(layer2 - 0.5) * 2.0;
  layer2 = smoothstep(0.2, 1.0, layer2 * layer2);
  float layer3 = n2D(q * 1.50);
  return (layer1 * 0.70 + layer2 * 0.25 + layer3 * 0.05) * 4.0;
}

float surfFunc(vec3 p){
  float dunes = duneFunc(p);
  float road;
  float shoulder;
  float centerOffset;
  float signedEdge;
  roadData(p.xz, road, shoulder, centerOffset, signedEdge);
  float corridor = 1.0 - smoothstep(0.0, 9.0, abs(centerOffset));
  float roadFloor = roadFloorHeight(p);
  float flattened = mix(dunes, roadFloor, shoulder);
  flattened -= road * 0.10;
  float rim = smoothstep(1.8, 0.0, abs(signedEdge)) * (1.0 - road);
  flattened += rim * 0.14;
  return trenchCut(p.xz, mix(dunes, flattened, max(shoulder, corridor * 0.35)));
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
  for(int i = 0; i < 128; i++){
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
    t += max(h * 0.70, 0.02 + t * 0.012);
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
  // 22 iters is enough; the shadow only feeds a diff multiplier, not detail.
  float res = 1.0;
  float t = 0.35;
  for(int i = 0; i < 22; i++){
    float h = map(ro + rd * t);
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.18, 2.4);
    if(res < 0.02 || t > 48.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 getSky(vec3 ro, vec3 rd, vec3 sunDir){
  // Anza-Borrego: low-saturation pale sky, washed-out at the horizon. Big haze
  // band, gold-white sun rather than red. Top is a dusty pale blue, not deep.
  float y = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 horizon = vec3(0.82, 0.74, 0.62);
  vec3 zenith  = vec3(0.52, 0.62, 0.72);
  vec3 sky = mix(horizon, zenith, pow(y, 0.65));
  // Soft pale gold sun (wide), narrow white core.
  float sunWide  = pow(max(dot(rd, sunDir), 0.0), 24.0);
  float sunCore  = pow(max(dot(rd, sunDir), 0.0), 256.0);
  sky += vec3(1.00, 0.88, 0.62) * sunWide * 0.55;
  sky += vec3(1.00, 0.96, 0.86) * sunCore * 1.20;
  // Horizon haze: thick, pale, slightly warm — the Borrego dust hangs low.
  float haze = pow(1.0 - y, 3.0);
  sky = mix(sky, vec3(0.86, 0.80, 0.70), haze * 0.55);
  return sky;
}

float getMist(vec3 ro, vec3 rd, float t){
  float d = smoothstep(14.0, FAR, t);
  float low = smoothstep(0.65, -0.10, rd.y);
  return d * low;
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
  vec3 sandCol = mix(vec3(0.92, 0.86, 0.72), vec3(0.74, 0.66, 0.52), grain);
  sandCol = mix(sandCol * 1.22, sandCol * 0.74, grain2);
  sandCol *= vec3(1.04, 1.02, 0.96);
  sandCol += sandLines(sp.xz, t) * vec3(0.06, 0.05, 0.04) * fadeMid;
  sandCol *= 0.86 + 0.22 * mix(0.5, hash31(floor(sp * 96.0)), fadeGrit);

  // Hard-pack dirt road: grey-brown gravel, with a faded ochre center stripe.
  float gravel = mix(0.5, fbm(sp.xz * vec2(10.0, 10.0)), fadeHi);
  vec3 roadCol = mix(vec3(0.20, 0.18, 0.16), vec3(0.36, 0.32, 0.27), gravel);
  roadCol += (fbm(vec2(sp.x * 26.0, sp.z * 3.5)) - 0.5) * 0.08 * fadeHi;
  float stripe = smoothstep(0.16, 0.0, abs(centerOffset));
  stripe *= step(0.56, fract(sp.z * 0.115));
  roadCol = mix(roadCol, vec3(0.78, 0.70, 0.42), stripe * 0.80);

  vec3 col = mix(sandCol, roadCol, road);
  float edgeDust = shoulder * (1.0 - road);
  col = mix(col, sandCol * 0.78 + roadCol * 0.22, edgeDust * 0.45);

  // Buried fuselage: cut interior + tail get airliner hull instead of sand.
  float hullM = trenchMask(sp.xz);
  if(hullM > 0.001){
    vec2 hrel = sp.xz - trenchA.xy;
    float halong = dot(hrel, -trenchA.zw);
    vec3 hull = vec3(0.44, 0.46, 0.50);
    float rib = smoothstep(0.78, 0.94, 0.5 + 0.5 * sin(halong * 4.4));
    hull *= 0.72 + 0.22 * rib;                       // frame ribs
    hull *= 0.88 + 0.24 * fbm(sp.xz * 6.0);          // scuffed paint
    hull = mix(hull, sandCol, 0.18);                 // dust film
    col = mix(col, hull, hullM * 0.92);
  }

  float rim = smoothstep(1.3, 0.0, abs(signedEdge)) * (1.0 - road);
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
  vec3 sky = getSky(ro, rd, sunDir);
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
        // Interior wall: dark cabin shell with faint frame ribs.
        float rib = smoothstep(0.72, 0.94, 0.5 + 0.5 * sin(s * 4.2));
        col = vec3(0.085, 0.082, 0.080) * (0.75 + 0.55 * rib);
        col += vec3(0.06, 0.06, 0.065) *
               max(dot(tn, normalize(vec3(0.3, 0.8, -0.5))), 0.0);
      } else {
        // Exterior: pale airliner hull with a red livery stripe down the side.
        vec3 hull = vec3(0.74, 0.75, 0.77);
        float band = radVec.y / rl;          // 0 at the sides of the cylinder
        float stripe = 1.0 - smoothstep(0.10, 0.30, abs(band));
        hull = mix(hull, vec3(0.60, 0.045, 0.05), stripe);
        float dif = max(dot(tn, sunDir), 0.0);
        float sh = softShadow(sp + tn * 0.15, sunDir);
        col = hull * (vec3(0.46, 0.48, 0.52) * 0.46 +
                      vec3(1.00, 0.92, 0.74) * dif * sh);
        float fre = pow(1.0 - max(dot(-rd, tn), 0.0), 3.0);
        col += getSky(sp, reflect(rd, tn), sunDir) * fre * 0.12;
      }
      col = mix(col, sky, smoothstep(0.0, 1.0, t / FAR));
    } else {
      col = terrainColor(sp, rd, sunDir, t);
      float mist = getMist(ro, rd, t);
      col = mix(col, sky, smoothstep(0.0, 1.0, t / FAR));
      // Pale dust-haze tint, not warm-orange. Anza-Borrego dust is grey-tan.
      col = col * 0.75 + col * 1.5 * mist + vec3(0.60, 0.55, 0.48) * mist;
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
// Three phases, all advanced ONLY by held forward input (Space / W / Up Arrow /
// touch-hold). No auto-advance anywhere — release the key, the camera stops.
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
//
// Mouse drag = look offset (yaw + pitch) clamped within rail limits.
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
    "  float big = (n1D(z * 0.006) - 0.5) * 34.0;\n" +
    "  float med = (n1D(z * 0.018 + 13.7) - 0.5) * 11.0;\n" +
    "  float small = sin(z * 0.030 + n1D(z * 0.012 + 7.3) * TAU) * 2.5;\n" +
    "  return big + med + small;\n" +
    "}\n" +
    "float roadHalfWidth(float z){ return mix(2.2, 3.8, n1D(z * 0.011 + 23.4)); }\n" +
    "void roadData(vec2 xz, out float road, out float shoulder, out float centerOffset, out float signedEdge){\n" +
    "  float c = roadCenter(xz.y);\n" +
    "  float w = roadHalfWidth(xz.y);\n" +
    "  centerOffset = xz.x - c;\n" +
    "  signedEdge = abs(centerOffset) - w;\n" +
    "  road = 1.0 - smoothstep(0.0, 1.35, signedEdge);\n" +
    "  shoulder = 1.0 - smoothstep(1.0, 5.0, signedEdge);\n" +
    "}\n" +
    "float roadFloorHeight(vec3 p){\n" +
    "  float center = roadCenter(p.z);\n" +
    "  float laneNoise = n2D(vec2(center * 0.031, p.z * 0.020));\n" +
    "  float slowNoise = n2D(vec2(center * 0.017 + 19.0, p.z * 0.010));\n" +
    "  return laneNoise * 0.72 + slowNoise * 0.55 + 0.22;\n" +
    "}\n" +
    "float duneFunc(vec3 p){\n" +
    "  vec2 q = p.xz / 2.5;\n" +
    "  float l1 = n2D(q * 0.20) * 2.0 - 0.5;\n" +
    "  l1 = smoothstep(0.0, 1.05, l1);\n" +
    "  float l2 = n2D(q * 0.275);\n" +
    "  l2 = 1.0 - abs(l2 - 0.5) * 2.0;\n" +
    "  l2 = smoothstep(0.2, 1.0, l2 * l2);\n" +
    "  float l3 = n2D(q * 1.50);\n" +
    "  return (l1 * 0.70 + l2 * 0.25 + l3 * 0.05) * 4.0;\n" +
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
    "  float corridor = 1.0 - smoothstep(0.0, 9.0, abs(centerOffset));\n" +
    "  float roadFloor = roadFloorHeight(p);\n" +
    "  float flattened = mix(dunes, roadFloor, shoulder);\n" +
    "  flattened -= road * 0.10;\n" +
    "  float rim = smoothstep(1.8, 0.0, abs(signedEdge)) * (1.0 - road);\n" +
    "  flattened += rim * 0.14;\n" +
    "  return trenchCut(p.xz, mix(dunes, flattened, max(shoulder, corridor * 0.35)));\n" +
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
    var big   = (n1DJS(z * 0.006)        - 0.5) * 34.0;
    var med   = (n1DJS(z * 0.018 + 13.7) - 0.5) * 11.0;
    var small = Math.sin(z * 0.030 + n1DJS(z * 0.012 + 7.3) * Math.PI * 2) * 2.5;
    return big + med + small;
  }
  function roadHalfWidthJS(z) {
    return 2.2 + (3.8 - 2.2) * n1DJS(z * 0.011 + 23.4);
  }
  function roadFloorHeightJS(x, z) {
    var center = roadCenterJS(z);
    var laneNoise = n2DJS(center * 0.031,        z * 0.020);
    var slowNoise = n2DJS(center * 0.017 + 19.0, z * 0.010);
    return laneNoise * 0.72 + slowNoise * 0.55 + 0.22;
  }
  function duneFuncJS(x, z) {
    var qx = x / 2.5, qz = z / 2.5;
    var l1 = n2DJS(qx * 0.20, qz * 0.20) * 2 - 0.5;
    l1 = smoothstepJS(0.0, 1.05, l1);
    var l2 = n2DJS(qx * 0.275, qz * 0.275);
    l2 = 1.0 - Math.abs(l2 - 0.5) * 2.0;
    l2 = smoothstepJS(0.2, 1.0, l2 * l2);
    var l3 = n2DJS(qx * 1.50, qz * 1.50);
    return (l1 * 0.70 + l2 * 0.25 + l3 * 0.05) * 4.0;
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
    var road     = 1.0 - smoothstepJS(0.0, 1.35, signedEdge);
    var shoulder = 1.0 - smoothstepJS(1.0, 5.0,  signedEdge);
    var corridor = 1.0 - smoothstepJS(0.0, 9.0,  Math.abs(centerOffset));
    var roadFloor = roadFloorHeightJS(x, z);
    var flattened = dunes * (1 - shoulder) + roadFloor * shoulder;
    flattened -= road * 0.10;
    var rim = smoothstepJS(1.8, 0.0, Math.abs(signedEdge)) * (1 - road);
    flattened += rim * 0.14;
    var blendT = Math.max(shoulder, corridor * 0.35);
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
    var LOOK_SENS        = typeof opts.lookSens    === "number" ? opts.lookSens    : 0.0035;
    var RENDER_SCALE     = typeof opts.renderScale === "number" ? opts.renderScale : 1.00;
    var MAX_DIM          = typeof opts.maxDim      === "number" ? opts.maxDim      : 1600;
    var CENTER_PITCH     = typeof opts.centerPitch === "number" ? opts.centerPitch : -0.08;
    var startZ           = typeof opts.startZ      === "number" ? opts.startZ      : 0.0;

    // --- Canvas ---
    var canvas = document.getElementById("c");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "c";
      canvas.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;display:block;background:#000;";
      document.body.appendChild(canvas);
    }
    var gl = canvas.getContext("webgl2", {
      antialias: false, alpha: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    });
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
    // screen as the rider's own machine, and held input becomes throttle.
    // The overlay counter-shifts against mouse-look so the bike stays
    // straight on the road while the eyes wander.
    var HARLEY = opts.harley !== false;
    var BIKE_AHEAD   = typeof opts.bikeAhead   === "number" ? opts.bikeAhead   : 12;
    var RIDE_TOP     = typeof opts.rideSpeed   === "number" ? opts.rideSpeed   : 24;  // m/s
    var RIDE_ACCEL   = 9;
    var RIDE_DRAG    = 14;
    var bikeZ = 0, bikeX = 0, bikeY = 0;
    var harleyReady = false;
    var mounted = false;
    var rideSpeed = 0;
    var harleyGlTex = null;
    var bikeOverlayEl = null;

    // --- Tunnel-exit emerge intro (plane-tunnel handoff) ------------------
    // Camera starts BELOW grade inside a trench carved into the terrain,
    // off the +X side of the road a few feet past the shoulder, and climbs
    // a ~30 degree ramp (held input only) up to the surface. The trench
    // mouth faces the road, so PHASE_APPROACH takes over seamlessly.
    var EMERGE = !!(opts.emergeIntro || opts.roadsideIntro || opts.startWithCabinTunnel);
    var TRENCH_SLOPE  = 0.577; // tan(30 deg)
    var TRENCH_MAXD   = 4.2;
    var TRENCH_HALFW  = 1.35;
    var EMERGE_ALONG0 = typeof opts.emergeAlong0 === "number"
      ? opts.emergeAlong0
      : 7.4;                   // metres of ramp behind the mouth at start
    var MOUTH_BACK    = typeof opts.mouthBack === "number" ? opts.mouthBack : 4.0;
    var emergeAlong = 0;
    var mouthX = 0, mouthZ = 0;

    // --- Initial camera placement ---
    // Probe the GPU so camY is exact (not the JS approximation, which can
    // drift off the rendered ground).
    var camZ = startZ;
    var camX, camY;
    var yaw = -Math.PI / 2;       // looking -X (toward the road)
    var lookYaw = 0.0;
    var lookPitch = CENTER_PITCH;
    var phase = PHASE_APPROACH;

    runProbe(roadCenterJS(camZ) + ROAD_OFFSET, camZ);
    if (EMERGE) {
      mouthX = probeBuf[0] + probeBuf[1] + MOUTH_BACK; // roadCenter + halfWidth + back
      mouthZ = camZ;
      TRENCH_JS = {
        mx: mouthX, mz: mouthZ, dx: -1, dz: 0,
        slope: TRENCH_SLOPE, maxD: TRENCH_MAXD, halfW: TRENCH_HALFW,
      };
      gl.useProgram(program);
      if (u.trenchA) gl.uniform4f(u.trenchA, mouthX, mouthZ, -1, 0);
      if (u.trenchB) gl.uniform4f(u.trenchB, 1, TRENCH_SLOPE, TRENCH_MAXD, TRENCH_HALFW);
      gl.useProgram(probeProgram);
      if (pu.trenchA) gl.uniform4f(pu.trenchA, mouthX, mouthZ, -1, 0);
      if (pu.trenchB) gl.uniform4f(pu.trenchB, 1, TRENCH_SLOPE, TRENCH_MAXD, TRENCH_HALFW);
      // Fuselage tube around the ramp: axis runs from the mouth (just above
      // grade, open end facing the road) down-back at 30 degrees, parallel
      // to and +0.9 m above the climb floor.
      runProbe(mouthX, mouthZ);
      var mouthGroundY = probeBuf[2];
      var tubeInv = 1 / Math.hypot(1, TRENCH_SLOPE);
      gl.useProgram(program);
      if (u.tubeA) gl.uniform4f(u.tubeA, mouthX, mouthGroundY + 0.9, mouthZ, 1);
      if (u.tubeB) gl.uniform4f(u.tubeB, tubeInv, -TRENCH_SLOPE * tubeInv, 0, 11.0);
      if (u.tubeC) gl.uniform4f(u.tubeC, 1.55, 0.25, 0, 0);
      emergeAlong = EMERGE_ALONG0;
      camX = mouthX + emergeAlong;            // behind the mouth, down the ramp
      runProbe(camX, camZ);
      camY = probeBuf[2] + EYE_ABOVE;         // trench floor + eye height
      phase = PHASE_EMERGE;
    } else {
      TRENCH_JS = null;
      camX = probeBuf[0] + ROAD_OFFSET;       // snap to GPU's roadCenter
      runProbe(camX, camZ);                   // re-probe at the snapped X
      camY = probeBuf[2] + EYE_ABOVE;         // exact GLSL surfFunc height
    }

    // --- Parked harley placement + texture --------------------------------
    if (HARLEY) {
      bikeZ = startZ + BIKE_AHEAD;
      runProbe(roadCenterJS(bikeZ), bikeZ);   // probeBuf: center/halfWidth at bikeZ
      bikeX = probeBuf[0] - probeBuf[1] * 0.40;   // right side of the lane (rider view)
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
        var halfW = 1.25;                     // ~2.5 m long cruiser
        var hgt = halfW * 2 * (harleyImg.naturalHeight / Math.max(1, harleyImg.naturalWidth));
        gl.useProgram(program);
        if (u.harleyTex) gl.uniform1i(u.harleyTex, 0);
        if (u.harleyA) gl.uniform4f(u.harleyA, bikeX, bikeY, bikeZ, 1);
        if (u.harleyB) gl.uniform4f(u.harleyB, halfW, hgt, 0.30, 0);
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
    function onKeyDown(e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      keys[e.code] = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" ||
          e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    }
    function onKeyUp(e) { keys[e.code] = false; }
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup",   onKeyUp);

    // Touch: any held finger counts as "forward".
    var touchHeld = false;
    function onTouchStart(e) { touchHeld = true; e.preventDefault(); }
    function onTouchEnd()    { touchHeld = false; }
    canvas.addEventListener("touchstart",  onTouchStart, { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    // Mouse → look offset, clamped to rail limits. NO drag — every mousemove
    // applies a delta. Clicking the canvas requests pointer lock so the
    // cursor can't hit a screen edge and stall.
    var lastMX = 0, lastMY = 0;
    var haveLast = false;
    function clampLook() {
      var yLim = Math.PI * 0.245;
      var pLim = Math.PI * 0.18;
      if (lookYaw   >  yLim) lookYaw   =  yLim;
      if (lookYaw   < -yLim) lookYaw   = -yLim;
      if (lookPitch > CENTER_PITCH + pLim) lookPitch = CENTER_PITCH + pLim;
      if (lookPitch < CENTER_PITCH - pLim) lookPitch = CENTER_PITCH - pLim;
    }
    function onMouseDown(e) {
      if (e.button !== 0) return;
      // Pointer-lock as a nicety; falls back to raw-coord delta below if denied.
      if (canvas.requestPointerLock && document.pointerLockElement !== canvas) {
        try { canvas.requestPointerLock(); } catch (_) {}
      }
    }
    function onMouseMove(e) {
      var dx, dy;
      if (document.pointerLockElement === canvas) {
        dx = e.movementX || 0;
        dy = e.movementY || 0;
      } else {
        if (!haveLast) {
          lastMX = e.clientX; lastMY = e.clientY;
          haveLast = true;
          return;
        }
        dx = e.clientX - lastMX;
        dy = e.clientY - lastMY;
        lastMX = e.clientX; lastMY = e.clientY;
      }
      lookYaw   -= dx * LOOK_SENS;
      lookPitch -= dy * LOOK_SENS;
      clampLook();
    }
    canvas.addEventListener("mousedown", onMouseDown);
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

    // The overlay is the rider's own machine: it tracks the ROAD, not the
    // eyes. Mouse-look pans the view; the bike counter-shifts by the same
    // angle so it stays glued straight ahead on the road. (fov 90 vertical:
    // screen offset of a world direction = tan(angle) * height/2.)
    function driveBikeOverlay(now) {
      if (!bikeOverlayEl || !mounted) return;
      var w = window.innerWidth || 800;
      var h = window.innerHeight || 600;
      var shiftX = Math.tan(lookYaw) * h * 0.5;
      var shiftY = Math.tan(lookPitch - CENTER_PITCH) * h * 0.5;
      var bob = Math.sin(now * 0.012) * Math.min(1, rideSpeed / 8) * 4;
      bikeOverlayEl.style.cssText =
        "position:fixed;left:50%;bottom:0;z-index:600;pointer-events:none;" +
        "user-select:none;-webkit-user-drag:none;display:block;" +
        "width:" + Math.round(Math.min(w * 0.62, 980)) + "px;" +
        "transform:translateX(calc(-50% + " + shiftX.toFixed(1) + "px))" +
        " translateY(" + (shiftY + bob).toFixed(1) + "px);";
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

      // Held-forward gates ALL camera motion. Release = stop.
      var held = !!(keys.Space || keys.KeyW || keys.ArrowUp || touchHeld);

      if (phase === PHASE_EMERGE) {
        // Climb the 30-degree ramp out of the trench. Held input only.
        if (held) emergeAlong -= WALK_SPEED * 0.87 * dt; // horizontal component
        if (emergeAlong <= 0) {
          emergeAlong = 0;
          phase = PHASE_APPROACH;
        }
        camX = mouthX + emergeAlong;
        camZ = mouthZ;
        runProbe(camX, camZ);
        camY = probeBuf[2] + EYE_ABOVE;         // rides the trench floor up
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
        camY = probeBuf[2] + EYE_ABOVE;         // GPU's surfFunc(camX, camZ)
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
          rideSpeed = held
            ? Math.min(RIDE_TOP, rideSpeed + RIDE_ACCEL * dt)
            : Math.max(0, rideSpeed - RIDE_DRAG * dt);
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

      // view = lookAt(eye, eye + forward, up).
      var effYaw   = yaw + lookYaw;
      var effPitch = lookPitch;
      if (phase === PHASE_EMERGE) {
        // Looking up the ramp while underground; eases to level at the mouth.
        effPitch += 0.55 * Math.min(1, emergeAlong / 6.5);
      }
      var cp = Math.cos(effPitch), sp = Math.sin(effPitch);
      var cy = Math.cos(effYaw),   sy = Math.sin(effYaw);
      var fx = sy * cp, fy = sp, fz = cy * cp;
      var eye  = [camX, camY, camZ];
      var look = [camX + fx, camY + fy, camZ + fz];
      var view = lookAtMat4(eye, look, [0, 1, 0]);

      driveBikeOverlay(now);

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
      getState: function () {
        return {
          x: camX, y: camY, z: camZ,
          yaw: yaw, lookYaw: lookYaw, lookPitch: lookPitch,
          phase: phase, turnProgress: turnProgress, emergeAlong: emergeAlong,
          mounted: mounted, rideSpeed: rideSpeed,
          held: !!(keys.Space || keys.KeyW || keys.ArrowUp || touchHeld),
        };
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup",   onKeyUp);
        canvas.removeEventListener("mousedown",   onMouseDown);
        window.removeEventListener("mousemove",   onMouseMove);
        if (document.pointerLockElement === canvas) {
          try { document.exitPointerLock(); } catch (_) {}
        }
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
})();
