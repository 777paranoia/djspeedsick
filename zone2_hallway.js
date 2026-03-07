
/*
 * ZONE 2 — HALLWAY ENGINE
 *
 * Architecture:
 *   Zone1 modes are stateless fullscreen shaders — camera is implicit.
 *   Zone2 is stateful: a rail camera with forward position (u_camZ),
 *   a look direction (u_lookYaw from drag), and a sequence state machine
 *   driven from JS that feeds uniforms to the shader.
 *
 *   The shader raymarches the entire hallway as SDF geometry:
 *     - Entry corridor (apartment hallway, ~3m wide, 2.7m tall)
 *     - Extends ~10m to a T-intersection with two open doorways
 *     - Beyond the intersection, hallway continues ~20m, walls decay,
 *       floor extends as a bridge into void → cosmic black hole
 *     - RIGHT ROOM (bedroom): mattress, milk crate, boombox
 *     - LEFT ROOM (bathroom): shower, sink, toilet, MIRROR
 *
 *   Camera rail:
 *     - Forward movement on W / tap-hold / arrow-up
 *     - camZ ranges from 0.0 (entry) to ~10.0 (intersection boundary)
 *     - Left/right look via existing drag system (yaw only, no pitch for now)
 *     - At boundary, forward stops; player can only look L/R into rooms
 *
 *   Sequence state machine (JS side):
 *     WALK       — player advances down hallway
 *     ROOMS      — at intersection, can look L/R into rooms
 *     MIRROR     — looking into bathroom, gaze timer starts
 *     BLINK1     — first blink cycle while looking at mirror
 *     BLINK2     — second blink cycle; goreville appears in mirror doorway
 *     TURNAROUND — player turns around; goreville gone, bedroom normal
 *     PLANE      — looks back at mirror; plane approaching in reflection
 *     IMPACT     — plane hits; red flash
 *     FOG        — room fills with fog; hallway void replaced with plane cabin
 *     ZONE2_FIN  — hold / transition out
 *
 *   New uniforms beyond the standard set:
 *     u_camZ        — rail position (0..10)
 *     u_lookYaw     — horizontal look angle (-PI..PI)
 *     u_seqState    — int, current sequence phase
 *     u_seqTime     — float, time within current phase
 *     u_fogDensity  — float, 0..1 fog fill
 *     u_mirrorMode  — int, what the mirror shows (0=reflection, 1=goreville, 2=plane)
 */

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

// ============================================================
// ZONE 2 HALLWAY FRAGMENT SHADER
// ============================================================

GLSL.modules.zone2_hallway = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_audio;
uniform float u_blink;
uniform float u_wake;
uniform float u_modeTime;

uniform float u_camZ;
uniform float u_lookYaw;
uniform int   u_seqState;
uniform float u_seqTime;
uniform float u_fogDensity;
uniform int   u_mirrorMode;

uniform sampler2D u_texEnv1;  // wall texture / wallpaper
uniform sampler2D u_texEnv2;  // floor texture
uniform sampler2D u_texEnv3;  // ceiling texture
uniform sampler2D u_texEnv4;  // mirror reflection FBO / mode render
uniform sampler2D u_texEnv5;  // void skybox / black hole

#define PI 3.14159265359
float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); }
float noise2(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x),
             mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x),u.y);
}
mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }

// ---- GEOMETRY: SDF PRIMITIVES ----

float sdBox(vec3 p, vec3 b){
  vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);
}

float sdPlane(vec3 p, vec3 n, float d){ return dot(p,n)+d; }

// ---- HALLWAY SDF ----
// Hallway runs along +Z axis, centered at X=0
// Width: 1.5m each side (3m total), Height: 2.7m, floor at Y=0

const float HALL_W   = 1.5;   // half-width
const float HALL_H   = 2.7;   // ceiling height
const float HALL_LEN = 10.0;  // apartment section length to intersection
const float VOID_LEN = 20.0;  // decay section beyond intersection
const float DOOR_Z   = 8.0;   // Z position of room doorways
const float DOOR_W   = 0.9;   // door half-width
const float DOOR_H   = 2.1;   // door height
const float ROOM_D   = 4.0;   // room depth (X direction, away from hall)
const float ROOM_W   = 3.0;   // room width (Z direction)

float sdHallWalls(vec3 p) {
  // main corridor walls — infinite in Z, bounded in X
  float left  = -(p.x + HALL_W);   // left wall at x = -HALL_W
  float right = p.x - HALL_W;      // right wall at x = +HALL_W

  // cut doorways at DOOR_Z
  // right door (bedroom): x > HALL_W, z in [DOOR_Z - DOOR_W, DOOR_Z + DOOR_W], y < DOOR_H
  float inRightDoor = max(max(p.x - HALL_W, -0.01),
                     max(max(-(p.z - (DOOR_Z - DOOR_W)), p.z - (DOOR_Z + DOOR_W)),
                         p.y - DOOR_H));
  right = max(right, -inRightDoor);

  // left door (bathroom): x < -HALL_W, z in [DOOR_Z - DOOR_W, DOOR_Z + DOOR_W], y < DOOR_H
  float inLeftDoor = max(max(-(p.x + HALL_W), -0.01),
                    max(max(-(p.z - (DOOR_Z - DOOR_W)), p.z - (DOOR_Z + DOOR_W)),
                        p.y - DOOR_H));
  left = max(left, -inLeftDoor);

  return min(left, right);
}

float sdHallFloor(vec3 p) {
  return -p.y;  // floor at y = 0
}

float sdHallCeiling(vec3 p) {
  // ceiling decays after intersection
  float decay = smoothstep(HALL_LEN, HALL_LEN + 8.0, p.z);
  float ceilH = mix(HALL_H, 100.0, decay);  // ceiling lifts away
  return p.y - ceilH;
}

// bedroom (right room, +X side)
float sdBedroom(vec3 p) {
  vec3 rp = p - vec3(HALL_W + ROOM_D * 0.5, 0.0, DOOR_Z);
  float room = sdBox(rp, vec3(ROOM_D * 0.5, HALL_H, ROOM_W * 0.5));
  return -room;  // interior, so negate
}

// bathroom (left room, -X side)
float sdBathroom(vec3 p) {
  vec3 rp = p - vec3(-(HALL_W + ROOM_D * 0.5), 0.0, DOOR_Z);
  float room = sdBox(rp, vec3(ROOM_D * 0.5, HALL_H, ROOM_W * 0.5));
  return -room;
}

// mattress in bedroom
float sdMattress(vec3 p) {
  vec3 mp = p - vec3(HALL_W + ROOM_D * 0.7, 0.12, DOOR_Z - 0.5);
  return sdBox(mp, vec3(0.7, 0.12, 1.0));
}

// milk crate beside mattress
float sdCrate(vec3 p) {
  vec3 cp = p - vec3(HALL_W + ROOM_D * 0.7 - 0.9, 0.2, DOOR_Z - 0.5 - 0.8);
  return sdBox(cp, vec3(0.2, 0.2, 0.2));
}

// boombox on floor
float sdBoombox(vec3 p) {
  vec3 bp = p - vec3(HALL_W + ROOM_D * 0.3, 0.18, DOOR_Z + 0.6);
  return sdBox(bp, vec3(0.35, 0.18, 0.15));
}

// bathroom mirror on back wall
float sdMirror(vec3 p) {
  vec3 mp = p - vec3(-(HALL_W + ROOM_D), 1.4, DOOR_Z);
  return sdBox(mp, vec3(0.02, 0.5, 0.8));
}

// toilet
float sdToilet(vec3 p) {
  vec3 tp = p - vec3(-(HALL_W + ROOM_D * 0.85), 0.25, DOOR_Z + 0.8);
  return sdBox(tp, vec3(0.2, 0.25, 0.2));
}

// sink
float sdSink(vec3 p) {
  vec3 sp = p - vec3(-(HALL_W + ROOM_D), 0.85, DOOR_Z);
  return sdBox(sp, vec3(0.05, 0.15, 0.3));
}

// void bridge floor — extends beyond intersection, zig-zags into black hole
float sdVoidBridge(vec3 p) {
  float z = p.z - HALL_LEN;
  if (z < 0.0) return 999.0;
  float zigzag = sin(z * 0.3) * 0.8;  // gentle sway
  float narrow = mix(HALL_W, 0.4, smoothstep(0.0, VOID_LEN, z));
  float bridgeX = abs(p.x - zigzag) - narrow;
  float bridgeY = abs(p.y - 0.0) - 0.05;  // thin floor slab
  return max(bridgeX, bridgeY);
}

// black hole attractor sphere in void
float sdBlackHole(vec3 p) {
  vec3 bhPos = vec3(0.0, 15.0, HALL_LEN + VOID_LEN + 10.0);
  return length(p - bhPos) - 5.0;
}


// ---- FULL SCENE ----

const float MAT_WALL   = 1.0;
const float MAT_FLOOR  = 2.0;
const float MAT_CEIL   = 3.0;
const float MAT_ROOM_W = 4.0;  // room walls
const float MAT_MIRROR = 5.0;
const float MAT_MATT   = 6.0;
const float MAT_CRATE  = 7.0;
const float MAT_BBOX   = 8.0;
const float MAT_TOILET = 9.0;
const float MAT_SINK   = 10.0;
const float MAT_BRIDGE = 11.0;
const float MAT_BH     = 12.0;

vec2 mapScene(vec3 p) {
  vec2 res = vec2(999.0, -1.0);
  float d;

  // hallway walls
  d = sdHallWalls(p);
  if (abs(d) < abs(res.x)) res = vec2(d, MAT_WALL);

  // floor
  d = sdHallFloor(p);
  if (d < res.x) res = vec2(d, MAT_FLOOR);

  // ceiling
  d = sdHallCeiling(p);
  if (d < res.x) res = vec2(d, MAT_CEIL);

  // bedroom walls (only evaluate near the room)
  if (p.x > HALL_W - 1.0 && abs(p.z - DOOR_Z) < ROOM_W + 1.0) {
    d = sdBedroom(p);
    if (abs(d) < abs(res.x)) res = vec2(d, MAT_ROOM_W);
    d = sdMattress(p); if (d < res.x) res = vec2(d, MAT_MATT);
    d = sdCrate(p);    if (d < res.x) res = vec2(d, MAT_CRATE);
    d = sdBoombox(p);  if (d < res.x) res = vec2(d, MAT_BBOX);
  }

  // bathroom walls
  if (p.x < -(HALL_W - 1.0) && abs(p.z - DOOR_Z) < ROOM_W + 1.0) {
    d = sdBathroom(p);
    if (abs(d) < abs(res.x)) res = vec2(d, MAT_ROOM_W);
    d = sdMirror(p);  if (d < res.x) res = vec2(d, MAT_MIRROR);
    d = sdToilet(p);  if (d < res.x) res = vec2(d, MAT_TOILET);
    d = sdSink(p);    if (d < res.x) res = vec2(d, MAT_SINK);
  }

  // void bridge
  d = sdVoidBridge(p);
  if (d < res.x) res = vec2(d, MAT_BRIDGE);

  return res;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.002;
  return normalize(vec3(
    mapScene(p+vec3(e,0,0)).x - mapScene(p-vec3(e,0,0)).x,
    mapScene(p+vec3(0,e,0)).x - mapScene(p-vec3(0,e,0)).x,
    mapScene(p+vec3(0,0,e)).x - mapScene(p-vec3(0,0,e)).x
  ));
}


// ---- MATERIALS ----

vec3 wallColor(vec3 p, vec3 n) {
  // apartment wallpaper — slight vertical stripe pattern, aging
  float stripe = smoothstep(0.48, 0.5, fract(p.x * 8.0)) * 0.08;
  float age = noise2(p.xz * 3.0) * 0.1;
  float decay = smoothstep(HALL_LEN - 2.0, HALL_LEN + 5.0, p.z);
  vec3 base = mix(vec3(0.35, 0.32, 0.28), vec3(0.08, 0.06, 0.04), decay);
  return base + stripe - age;
}

vec3 floorColor(vec3 p) {
  // worn hardwood
  float plank = smoothstep(0.48, 0.5, fract(p.z * 4.0)) * 0.06;
  float grain = noise2(p.xz * 20.0 + vec2(0.0, p.z * 5.0)) * 0.04;
  float wear = noise2(p.xz * 0.5) * 0.08;
  return vec3(0.22, 0.15, 0.09) + plank + grain - wear;
}

vec3 mirrorColor(vec3 p, vec3 rd) {
  // sample from mirror FBO (u_texEnv4)
  // map reflected ray to UV
  vec2 mUV = vec2(
    0.5 + rd.x * 0.5,
    0.5 - rd.y * 0.5
  );
  return texture2D(u_texEnv4, clamp(mUV, 0.0, 1.0)).rgb;
}

vec3 voidSky(vec3 rd) {
  // cosmic void — dark with distant stars
  float stars = step(0.998, hash2(floor(rd.xy * 800.0))) * 1.5;
  float nebula = noise2(rd.xz * 5.0 + u_time * 0.02) * 0.08;
  vec3 base = vec3(0.005, 0.002, 0.015) + nebula * vec3(0.3, 0.1, 0.5);

  // black hole glow
  vec3 bhDir = normalize(vec3(0.0, 0.4, 1.0));
  float bhAngle = max(dot(rd, bhDir), 0.0);
  vec3 bhGlow = vec3(0.6, 0.2, 0.0) * pow(bhAngle, 8.0) * 2.0
              + vec3(1.0, 0.4, 0.1) * pow(bhAngle, 32.0) * 4.0;

  // accretion disk
  float diskAngle = abs(rd.y - bhDir.y * dot(rd, bhDir));
  float disk = exp(-diskAngle * 20.0) * pow(bhAngle, 4.0);
  bhGlow += vec3(1.0, 0.6, 0.2) * disk * 3.0;

  return base + stars + bhGlow;
}

vec3 shade(vec3 p, vec3 n, vec3 rd, float matID) {
  // dim hallway overhead light
  vec3 lightPos = vec3(0.0, HALL_H - 0.1, max(p.z - 1.0, 2.0));
  vec3 ld = normalize(lightPos - p);
  float diff = max(dot(n, ld), 0.0) * 0.4;
  float amb = 0.08;
  float dist = length(lightPos - p);
  float atten = 1.0 / (1.0 + 0.15 * dist + 0.05 * dist * dist);

  vec3 col = vec3(0.0);

  if (matID < 1.5)       col = wallColor(p, n);
  else if (matID < 2.5)  col = floorColor(p);
  else if (matID < 3.5)  col = vec3(0.25, 0.23, 0.20); // ceiling
  else if (matID < 4.5)  col = wallColor(p, n) * 0.9;   // room walls
  else if (matID < 5.5)  col = mirrorColor(p, reflect(rd, n));
  else if (matID < 6.5)  col = vec3(0.35, 0.33, 0.30);  // mattress
  else if (matID < 7.5)  col = vec3(0.5, 0.45, 0.35);   // milk crate
  else if (matID < 8.5)  col = vec3(0.08, 0.08, 0.10);  // boombox
  else if (matID < 9.5)  col = vec3(0.85, 0.82, 0.78);  // toilet
  else if (matID < 10.5) col = vec3(0.8, 0.78, 0.75);   // sink
  else if (matID < 11.5) col = floorColor(p) * 0.6;      // void bridge
  else                    col = vec3(0.0);                // black hole

  vec3 lightCol = vec3(1.0, 0.85, 0.6); // warm tungsten
  return col * (amb + diff * atten) * lightCol;
}


// ---- MAIN ----

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // rail camera
  vec3 ro = vec3(0.0, 1.6, u_camZ);  // eye height 1.6m
  vec3 rd = normalize(vec3(uv, 1.2));

  // apply yaw (left/right look)
  rd.xz *= rot(u_lookYaw);

  // slight head bob while walking
  float walking = u_seqState == 0 ? 1.0 : 0.0;
  ro.y += sin(u_time * 4.0) * 0.02 * walking;

  // march
  float t = 0.0;
  vec2 hit = vec2(0.0);
  for (int i = 0; i < 120; i++) {
    hit = mapScene(ro + rd * t);
    if (abs(hit.x) < 0.001 || t > 60.0) break;
    t += hit.x * 0.8;  // conservative step for thin geometry
  }

  vec3 col = vec3(0.0);

  if (t < 60.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    col = shade(p, n, rd, hit.y);

    // distance fog (apartment haze)
    float fog = 1.0 - exp(-0.01 * t * t);
    vec3 fogCol = vec3(0.04, 0.035, 0.03);
    col = mix(col, fogCol, fog);

    // sequence fog (post-impact)
    col = mix(col, vec3(0.5, 0.48, 0.45), u_fogDensity * (1.0 - exp(-0.05 * t)));
  } else {
    // void sky beyond hallway
    col = voidSky(rd);
  }

  // blink
  col *= (1.0 - u_blink);

  // wake
  col *= smoothstep(0.0, 0.8, u_wake);

  gl_FragColor = vec4(col, 1.0);
}
`;
