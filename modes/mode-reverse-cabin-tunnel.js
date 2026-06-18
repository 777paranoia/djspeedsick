(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window : this;
  root.GLSL = root.GLSL || {};
  root.GLSL.modules = root.GLSL.modules || {};

  var VERTEX = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  var FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_progress;
uniform vec2 u_mouse;
uniform float u_opacity;
uniform float u_gridFade;
uniform float u_holdWalls;

const float ISLE_PI = 3.14159265359;
const float ISLE_TAU = 6.28318530718;
const float ISLAND_CAB_HALF_LEN   = 11.0;
const float ISLAND_CAB_FUSE_R     = 1.72;
const float ISLAND_CAB_FLOOR_Y    = -0.82;
const float ISLAND_CAB_AISLE_W    = 0.32;
const float ISLAND_CAB_SEAT_PITCH = 0.79;
const float ISLAND_CAB_ROW_START  = -11.0 + 1.8;
const float ISLAND_CAB_EXIT_ROW_Z = -11.0 + 1.8 + 13.0 * 0.79;

float u_z4bIslandEscape = 1.0;

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

float islandSdBox3(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
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

float islandCrashSeat(vec3 p){
  float fy = ISLAND_CAB_FLOOR_Y;
  float back = islandCabinSdRBox(p - vec3(0.0, fy + 0.52, -0.18), vec3(0.16, 0.44, 0.055), 0.035);
  float base = islandCabinSdRBox(p - vec3(0.0, fy + 0.22, 0.08), vec3(0.18, 0.08, 0.20), 0.030);
  float legL = islandSdBox3(p - vec3(-0.10, fy + 0.03, 0.07), vec3(0.020, 0.19, 0.020));
  float legR = islandSdBox3(p - vec3( 0.10, fy + 0.03, 0.07), vec3(0.020, 0.19, 0.020));
  return min(min(back, base), min(legL, legR));
}

float islandCrashHallwayPortal(vec3 p){
  return 40.0;
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
  float hall = islandCrashHallwayPortal(q);
  if(hall < d){ d = hall; id = 36.0; }
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

vec3 islandCrashColor(vec3 lp, vec3 nL, float id){
  float shade = 0.18 + 0.56 * max(0.0, dot(nL, normalize(vec3(-0.35, 0.55, -0.42))));
  float flicker = 0.78 + 0.22 * sin(u_time * 3.9) * sin(u_time * 5.7 + 1.4);
  vec3 shell = vec3(0.34, 0.36, 0.39) * (0.36 + shade);
  float grime = 0.78 + 0.22 * islandNoise(lp.xz * 11.0 + lp.yy * 0.6);
  shell *= grime;
  float rib = 1.0 - smoothstep(0.010, 0.050, abs(fract((lp.z + ISLAND_CAB_HALF_LEN) * 0.28) - 0.5));
  shell *= 0.94 + rib * 0.025;
  if(id > 31.5 && id < 32.5) shell *= vec3(0.34, 0.32, 0.30);
  if(id > 32.5 && id < 33.5) shell *= vec3(0.22, 0.20, 0.19);
  if(id > 33.5 && id < 34.5) shell *= vec3(0.28, 0.29, 0.31);
  return shell * flicker;
}

bool islandCrashPlaneHit(vec3 ro, vec3 rd, out float tHit, out vec3 colHit, out vec3 nHit){
  float dreamEnd = islandCabinDreamEnd();
  float zMax = dreamEnd + 34.0;
  float xMax = ISLAND_CAB_FUSE_R + 2.85;
  float yMin = -2.90;
  float yMax = 4.25;
  tHit = 1e9;
  float t = 0.035;
  bool hit = false;
  float hitID = -1.0;
  vec3 hitP = vec3(0.0);
  for(int i = 0; i < 216; i++){
    vec3 p = ro + rd * t;
    if(p.z < -ISLAND_CAB_HALF_LEN - 2.15 || p.z > zMax || abs(p.x) > xMax || p.y < yMin || p.y > yMax){
      t += 0.55;
    } else {
      vec2 d = islandCrashDreamPlaneMap(p);
      if(d.x < 0.010){
        hit = true;
        hitID = d.y;
        hitP = p;
        break;
      }
      t += clamp(d.x * 0.78, 0.015, 0.58);
    }
    if(t > 148.0) break;
  }
  if(!hit) return false;
  vec3 nL = islandCrashDreamNormalLocal(hitP);
  vec3 shadeP = islandCabinWarp(hitP);
  tHit = t;
  nHit = nL;
  colHit = islandCrashColor(shadeP, nL, hitID);
  return true;
}

vec3 islandCrashCabinFog(vec3 col, vec3 ro, vec3 rd, float dist, out float fogAlpha){
  vec3 lp = ro + rd * dist;
  float e = 1.0;
  float zt = islandCabinDepthT(lp.z);
  float interior = islandCabinInteriorMask(lp.z) * e;
  float zMask = smoothstep(-ISLAND_CAB_HALF_LEN - 0.35, -ISLAND_CAB_HALF_LEN + 1.05, lp.z) *
                (1.0 - smoothstep(islandCabinDreamEnd() + 36.0, islandCabinDreamEnd() + 38.0, lp.z));
  float rMask = 1.0 - smoothstep(ISLAND_CAB_FUSE_R * 1.32, ISLAND_CAB_FUSE_R * 2.05, length(lp.xy));
  float yMask = smoothstep(ISLAND_CAB_FLOOR_Y - 1.10, ISLAND_CAB_FLOOR_Y + 0.12, lp.y) *
                (1.0 - smoothstep(ISLAND_CAB_FUSE_R * 1.02, ISLAND_CAB_FUSE_R * 1.95, lp.y));
  float inside = e * max(interior, zMask * rMask * yMask);
  if(inside < 0.001){ fogAlpha = 0.0; return col; }

  vec3 p0 = ro + rd * 3.0;
  vec3 p1 = ro + rd * 9.0;
  vec3 p2 = ro + rd * 18.0;
  vec3 p3 = ro + rd * 32.0;
  float maxZ = max(max(p0.z, p1.z), max(p2.z, p3.z));
  float phaseA = smoothstep(0.12, 0.40, islandCabinDepthT(maxZ));
  float phaseB = smoothstep(0.40, 0.72, islandCabinDepthT(maxZ));
  float phaseC = smoothstep(0.70, 1.00, islandCabinDepthT(maxZ));

  float centerY = ISLAND_CAB_FLOOR_Y + 0.58;
  float a = atan(p3.y - centerY, p3.x);
  float r = length(vec2(p3.x, p3.y - centerY));
  float spiral = 0.5 + 0.5 * sin(a * 7.0 + p3.z * 0.34 - u_time * 0.38);
  float pulse = 0.5 + 0.5 * sin(islandCabinDepthT(maxZ) * ISLE_TAU * 3.0 + 0.9);
  float ribs = 0.5 + 0.5 * sin(p3.z * 0.78 + r * 4.6);
  float aisle = 1.0 - smoothstep(0.12, 1.05, abs(p2.x));
  float throat = islandCabinTunnelGlow(maxZ);
  float dreamEnd = islandCabinDreamEnd();
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

  float blueStart = smoothstep(0.035, 0.0, u_progress);
  float throatOpen = smoothstep(0.01, 0.09, u_progress);
  vec3 blueFogCol = mix(vec3(0.09, 0.18, 0.28), vec3(0.38, 0.50, 0.60), 0.48 + 0.52 * pulse);
  tunnel = mix(blueFogCol, tunnel, throatOpen);
  tunnel += blueFogCol * blueStart * (0.16 + 0.10 * pulse);

  float ahead = max(islandCabinInteriorMask(p0.z), islandCabinInteriorMask(p2.z));
  float amount = inside * max(0.26, ahead);
  amount *= 0.24 + 0.09 * phaseA + 0.14 * phaseB + 0.28 * max(phaseC, throat);
  amount = clamp(amount + blueStart * 0.20, 0.0, 0.76);

  vec3 mixed = mix(col, tunnel, amount);
  mixed += redFogCol * inside * volume * 0.08;
  mixed += tunnel * inside * (0.040 + 0.065 * max(phaseC, throat));
  fogAlpha = clamp(amount * 0.92 + volume * 0.38 + blueStart * 0.40, 0.0, 1.0);
  return mixed;
}

mat3 cameraBasis(vec3 ro, vec3 ta, float roll){
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ww));
  float cr = cos(roll);
  float sr = sin(roll);
  vec3 ru = uu * cr + vv * sr;
  vec3 rv = vv * cr - uu * sr;
  return mat3(ru, rv, ww);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float p = clamp(u_progress, 0.0, 1.0);
  float dreamEnd = islandCabinDreamEnd();
  float startZ = dreamEnd + 32.5;
  float endZ = -ISLAND_CAB_HALF_LEN - 1.58;
  float z = mix(startZ, endZ, p);
  float lookZ = z - mix(5.4, 7.0, smoothstep(0.30, 0.88, p));

  vec3 ro = islandCabinPathPoint(z);
  ro.y += mix(0.10, 0.02, p);
  vec3 ta = islandCabinPathPoint(lookZ);
  ta.y += mix(-0.04, 0.05, p);
  float roll = islandCabinPathRoll(z) * 0.18;
  mat3 cam = cameraBasis(ro, ta, roll);
  vec2 m = clamp(u_mouse, vec2(-1.0, -1.0), vec2(1.0, 1.0));
  vec3 rd = normalize(cam * normalize(vec3(uv + m * vec2(0.38, 0.22), 1.38)));

  float tHit;
  vec3 surfCol;
  vec3 nHit;
  bool hit = islandCrashPlaneHit(ro, rd, tHit, surfCol, nHit);
  float fogAlpha = 0.0;
  float fogDist = hit ? min(tHit, 48.0) : 42.0;
  vec3 col = hit ? surfCol : vec3(0.0);
  col = islandCrashCabinFog(col, ro, rd, fogDist, fogAlpha);

  if(hit){
    float shade = 0.72 + 0.28 * max(0.0, dot(nHit, normalize(vec3(-0.25, 0.55, -0.55))));
    col *= shade;
  }

  float mouth = smoothstep(0.82, 1.0, p);
  float mouthLight = mouth * smoothstep(0.48, 0.12, length(uv));
  vec3 mouthCol = vec3(0.58, 0.61, 0.60) * mouthLight * 0.38;
  col += mouthCol;

  float alpha = max(hit ? 0.94 : 0.0, fogAlpha);
  alpha = max(alpha, mouthLight * 0.28);
  alpha *= smoothstep(0.0, 0.055, alpha);

  // Porthole mode (u_holdWalls = 1): the layer underneath must only ever be
  // seen THROUGH the opening mouth, never through semi-transparent fuselage
  // walls. Everything outside a circular aperture stays fully opaque; inside
  // the opening the tunnel thins out late so the real desert underlay is what
  // you see at the end instead of a generic full-screen fade.
  float aperture = smoothstep(0.80, 0.985, p);
  float hole = aperture * smoothstep(0.10 + 0.40 * aperture, 0.04, length(uv));
  float exitClear = smoothstep(0.86, 1.0, p);
  float holeAlpha = alpha * mix(1.0, 0.08, exitClear);
  alpha = mix(alpha, mix(1.0, holeAlpha, hole), clamp(u_holdWalls, 0.0, 1.0));

  alpha *= u_opacity;
  if(alpha < 0.004) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

  root.ReverseCabinTunnel = root.ReverseCabinTunnel || {};
  root.ReverseCabinTunnel.vertex = VERTEX;
  root.ReverseCabinTunnel.fragment = FRAGMENT;
  root.GLSL.modules.mode_reverse_cabin_tunnel = FRAGMENT;

  function compile(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader) || "shader compile failed";
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function link(gl, vs, fs) {
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(prog) || "program link failed";
      gl.deleteProgram(prog);
      throw new Error(log);
    }
    return prog;
  }

  function startReverseCabinTunnel(opts) {
    opts = opts || {};
    var canvas = opts.canvas || document.getElementById(opts.canvasId || "reverse-cabin-tunnel");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = opts.canvasId || "reverse-cabin-tunnel";
      canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:10;display:block;pointer-events:auto";
      document.body.appendChild(canvas);
    }

    var gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false
    });
    if (!gl) throw new Error("WebGL unavailable");

    var prog = link(gl, VERTEX, FRAGMENT);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var loc = {
      p: gl.getAttribLocation(prog, "p"),
      res: gl.getUniformLocation(prog, "u_resolution"),
      time: gl.getUniformLocation(prog, "u_time"),
      progress: gl.getUniformLocation(prog, "u_progress"),
      mouse: gl.getUniformLocation(prog, "u_mouse"),
      opacity: gl.getUniformLocation(prog, "u_opacity"),
      gridFade: gl.getUniformLocation(prog, "u_gridFade"),
      holdWalls: gl.getUniformLocation(prog, "u_holdWalls")
    };

    var carriedForwardKeys = opts.forwardKeys || null;
    var initialForwardKeys = {
      Space: carriedForwardKeys
        ? !!carriedForwardKeys.Space
        : !!(opts.spaceHeld || opts.walkHeld),
      ArrowUp: !!(carriedForwardKeys && carriedForwardKeys.ArrowUp),
      KeyW: !!(carriedForwardKeys && carriedForwardKeys.KeyW),
      KeyK: !!(carriedForwardKeys && carriedForwardKeys.KeyK)
    };
    var state = {
      canvas: canvas,
      gl: gl,
      program: prog,
      progress: typeof opts.progress === "number" ? opts.progress : 0,
      autoplay: opts.autoplay !== false,
      speed: typeof opts.speed === "number" ? opts.speed : 0.035,
      opacity: typeof opts.opacity === "number" ? opts.opacity : 1,
      holdWalls: opts.holdWalls ? 1 : 0,
      mouseX: typeof opts.mouseX === "number" ? Math.max(-1, Math.min(1, opts.mouseX)) : 0,
      mouseY: typeof opts.mouseY === "number" ? Math.max(-1, Math.min(1, opts.mouseY)) : 0,
      touchHeld: false,
      running: true,
      space: !!(
        initialForwardKeys.Space ||
        initialForwardKeys.ArrowUp ||
        initialForwardKeys.KeyW ||
        initialForwardKeys.KeyK
      ),
      lastT: performance.now(),
      raf: 0
    };
    root.__cabinTunnelActive = true;
    root.__cabinTunnelNav = { forward: false, back: false, left: false, right: false };
    var forwardKeys = initialForwardKeys;

    function resize() {
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function pointer(e) {
      var r = canvas.getBoundingClientRect();
      var x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      var y = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
      state.mouseX = Math.max(-1, Math.min(1, x));
      state.mouseY = Math.max(-1, Math.min(1, -y));
    }

    function forwardKey(e) {
      if (!e) return "";
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyK") return e.code;
      return e.key === " " || e.key === "Spacebar" ? "Space" : "";
    }
    function syncForward() {
      state.space = !!(forwardKeys.Space || forwardKeys.ArrowUp || forwardKeys.KeyW || forwardKeys.KeyK);
    }
    function syncCabinTunnelNav() {
      root.__cabinTunnelNav = {
        forward: !!(state.running && state.progress < 1.0 &&
          (!state.autoplay || state.space || state.touchHeld)),
        back: false,
        left: false,
        right: false
      };
    }
    function keydown(e) {
      var code = forwardKey(e);
      if (code) {
        forwardKeys[code] = true;
        syncForward();
        e.preventDefault();
      }
      if (e.key === "r" || e.key === "R") state.progress = 0;
    }

    function keyup(e) {
      var code = forwardKey(e);
      if (code) {
        forwardKeys[code] = false;
        syncForward();
        e.preventDefault();
      }
    }

    function frame(now) {
      if (!state.running) return;
      var dt = Math.min(0.05, Math.max(0, (now - state.lastT) * 0.001));
      state.lastT = now;
      if (state.autoplay || state.space) state.progress = Math.min(1, state.progress + dt * state.speed);
      syncCabinTunnelNav();
      if (typeof opts.onFrame === "function") opts.onFrame(state);
      resize();
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc.p);
      gl.vertexAttribPointer(loc.p, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(loc.res, canvas.width, canvas.height);
      gl.uniform1f(loc.time, now * 0.001);
      gl.uniform1f(loc.progress, Math.max(0, Math.min(1, state.progress)));
      gl.uniform2f(loc.mouse, state.mouseX, state.mouseY);
      gl.uniform1f(loc.opacity, state.opacity);
      gl.uniform1f(loc.gridFade, 0);
      gl.uniform1f(loc.holdWalls, state.holdWalls);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (typeof opts.onAfterFrame === "function") opts.onAfterFrame(state);
      state.raf = state.running ? requestAnimationFrame(frame) : 0;
    }

    canvas.addEventListener("mousemove", pointer, true);
    canvas.addEventListener("pointermove", pointer, true);
    root.addEventListener("keydown", keydown, true);
    root.addEventListener("keyup", keyup, true);

    state.stop = function () {
      state.running = false;
      root.__cabinTunnelActive = false;
      root.__cabinTunnelNav = null;
      cancelAnimationFrame(state.raf);
      canvas.removeEventListener("mousemove", pointer, true);
      canvas.removeEventListener("pointermove", pointer, true);
      root.removeEventListener("keydown", keydown, true);
      root.removeEventListener("keyup", keyup, true);
    };

    state.setProgress = function (v) {
      state.progress = Math.max(0, Math.min(1, Number(v) || 0));
    };

    state.setAutoplay = function (v) {
      state.autoplay = !!v;
    };

    root.__reverseCabinTunnel = state;
    syncCabinTunnelNav();
    resize();
    state.raf = requestAnimationFrame(frame);
    return state;
  }

  root.startReverseCabinTunnel = startReverseCabinTunnel;
  root.stopReverseCabinTunnel = function () {
    if (root.__reverseCabinTunnel && root.__reverseCabinTunnel.stop) root.__reverseCabinTunnel.stop();
  };

  root.startDesertDreamTunnel = function (opts) {
    opts = opts || {};
    if (
      typeof root.startReverseCabinTunnel !== "function" ||
      typeof root.startModeDesertRoad !== "function"
    ) {
      console.error("[DesertDreamTunnel] cabin-tunnel or desert-road not loaded");
      return null;
    }

    var desertAt = typeof opts.desertAt === "number" ? opts.desertAt : 0.66;
    var fadeMs = typeof opts.fadeMs === "number" ? opts.fadeMs : 950;
    var fadeInMs = typeof opts.fadeInMs === "number" ? opts.fadeInMs : 0;
    var baseOpacity = typeof opts.opacity === "number" ? opts.opacity : 1;
    var startZ = typeof opts.startZ === "number" ? opts.startZ : 168;
    var desertStarted = false;
    var fadeStart = 0;
    var introStart = 0;
    var introOpaque = fadeInMs <= 0;
    var introCovered = false;

    function startDesert() {
      if (desertStarted) return;
      desertStarted = true;
      root.startModeDesertRoad({
        fromZone2: !!opts.fromZone2,
        fromTheater: !!opts.fromTheater,
        emergeIntro: true,
        startZ: startZ
      });
      if (root.__modeDesertRoadScene && root.__modeDesertRoadScene.pause) {
        root.__modeDesertRoadScene.pause();
      }
      if (typeof opts.onDesertStart === "function") opts.onDesertStart();
    }

    var tunnel = root.startReverseCabinTunnel({
      autoplay: opts.autoplay === undefined ? false : !!opts.autoplay,
      speed: typeof opts.speed === "number" ? opts.speed : 0.04,
      progress: typeof opts.progress === "number" ? opts.progress : 0.06,
      opacity: introOpaque ? baseOpacity : 0,
      holdWalls: opts.holdWalls === undefined ? true : !!opts.holdWalls,
      spaceHeld: !!opts.walkHeld,
      forwardKeys: opts.forwardKeys,
      mouseX: opts.mouseX,
      mouseY: opts.mouseY,
      onFrame: function (state) {
        if (!introOpaque) {
          if (!introStart) introStart = performance.now();
          var introK = Math.min(
            1,
            (performance.now() - introStart) / Math.max(1, fadeInMs)
          );
          state.opacity = baseOpacity * introK;
          if (introK >= 1) {
            introOpaque = true;
            state.opacity = baseOpacity;
          }
        }
        if (typeof opts.onFrame === "function") opts.onFrame(state);
        if (!desertStarted && state.progress >= desertAt) startDesert();
        if (state.progress >= 1) {
          if (!fadeStart) fadeStart = performance.now();
          var k = Math.min(1, (performance.now() - fadeStart) / fadeMs);
          state.opacity = baseOpacity * (1 - k);
          if (k >= 1) {
            state.stop && state.stop();
            if (state.canvas && state.canvas.parentNode) {
              state.canvas.parentNode.removeChild(state.canvas);
            }
            if (root.__modeDesertRoadScene && root.__modeDesertRoadScene.resume) {
              root.__modeDesertRoadScene.resume();
            }
            if (typeof opts.onComplete === "function") opts.onComplete();
          }
        }
      },
      onAfterFrame: function (state) {
        if (introOpaque && !introCovered) {
          introCovered = true;
          if (typeof opts.onIntroOpaque === "function") opts.onIntroOpaque();
        }
        if (typeof opts.onAfterFrame === "function") opts.onAfterFrame(state);
      }
    });

    if (tunnel && tunnel.canvas) {
      var ts = function () {
        tunnel.touchHeld = true;
        tunnel.setAutoplay && tunnel.setAutoplay(true);
      };
      var te = function () {
        tunnel.touchHeld = false;
        tunnel.setAutoplay && tunnel.setAutoplay(false);
      };
      tunnel.canvas.addEventListener("touchstart", ts, { passive: true });
      tunnel.canvas.addEventListener("touchend", te);
      tunnel.canvas.addEventListener("touchcancel", te);
    }

    return tunnel;
  };
})();
