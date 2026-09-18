!(function () {
  "use strict";

  window.GLSL = window.GLSL || {};
  window.GLSL.modules = window.GLSL.modules || {};

  const VERTEX_SOURCE = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
precision highp int;

out vec4 FragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_eye;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_focal;
uniform float u_doorOpen;
uniform float u_hallDoorOpen;
uniform float u_walk;
uniform float u_liftOpen;
uniform sampler2D u_harleyTex;
uniform float u_harleyReady;
uniform sampler2D u_tvFrontTex;
uniform sampler2D u_tvLeftTex;
uniform sampler2D u_tvRightTex;
uniform sampler2D u_tvScreenTex;
uniform sampler2D u_mobileRightTex;
uniform float u_topFloor; // 0 = ground (alley/basement), 1 = upper apartment-building hallway
uniform float u_lightning; // 0..1 lightning flash, outdoor alley only
uniform float u_fade;     // 0..1 black fade as the rider reaches their apartment door

#define MAX_STEPS 118
#define FAR_CLIP 155.0
#define HIT_EPSILON 0.0025
#define PI 3.14159265359

float hash11(float x) {
  return fract(sin(x * 127.1) * 43758.5453123);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float greenKey(vec3 color) {
  float greenDominance = color.g - max(color.r, color.b);
  float chroma = smoothstep(0.07, 0.32, greenDominance);
  float brightness = smoothstep(0.16, 0.52, color.g);
  float notWhite = 1.0 - smoothstep(0.70, 0.94, min(min(color.r, color.g), color.b));
  return clamp(chroma * brightness * notWhite, 0.0, 1.0);
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec2 closer(vec2 a, vec2 b) {
  return a.x < b.x ? a : b;
}

vec2 mapElevator(vec3 p) {
  vec2 hit = vec2(1e5, 0.0);

  float lift = 1e5;
  lift = min(lift, sdBox(p - vec3(-35.52, 3.69, 4.25), vec3(0.16, 0.13, 1.95)));
  lift = min(lift, sdBox(p - vec3(-35.42, 1.78, 1.78), vec3(0.10, 1.68, 0.52)));
  lift = min(lift, sdBox(p - vec3(-35.42, 1.78, 6.72), vec3(0.10, 1.68, 0.52)));
  lift = min(lift, sdBox(p - vec3(-39.38, 1.82, 4.25), vec3(0.12, 1.82, 1.70)));
  lift = min(lift, sdBox(p - vec3(-37.45, 1.82, 2.54), vec3(1.95, 1.82, 0.10)));
  lift = min(lift, sdBox(p - vec3(-37.45, 1.82, 5.96), vec3(1.95, 1.82, 0.10)));
  lift = min(lift, sdBox(p - vec3(-37.45, 3.64, 4.25), vec3(1.95, 0.10, 1.70)));
  lift = min(lift, sdBox(p - vec3(-35.95, 1.80, 2.94), vec3(0.34, 1.78, 0.40)));
  lift = min(lift, sdBox(p - vec3(-35.95, 1.80, 5.56), vec3(0.34, 1.78, 0.40)));
  hit = closer(hit, vec2(lift, 5.0));

  float liftDoorL = mix(3.38, 2.20, u_liftOpen);
  float liftDoorR = mix(5.12, 6.30, u_liftOpen);
  float liftDoors = sdBox(p - vec3(-35.28, 1.80, liftDoorL), vec3(0.07, 1.78, 0.87));
  liftDoors = min(liftDoors, sdBox(p - vec3(-35.28, 1.80, liftDoorR), vec3(0.07, 1.78, 0.87)));
  hit = closer(hit, vec2(liftDoors, 5.0));

  float liftPanel = sdRoundBox(p - vec3(-35.95, 1.30, 3.38), vec3(0.30, 0.42, 0.05), 0.02);
  hit = closer(hit, vec2(liftPanel, 5.0));

  float liftCall = sdRoundBox(p - vec3(-35.30, 1.35, 6.42), vec3(0.05, 0.20, 0.11), 0.015);
  hit = closer(hit, vec2(liftCall, 5.0));

  return hit;
}

// Upper apartment-building landing the elevator opens onto: broad concrete
// floor, stairwell/window/railings ahead, and the rider's door on the adjacent
// wall reached by a short right turn.
vec2 mapHallway(vec3 p) {
  vec2 hit = vec2(1e5, 0.0);

  const float ceilY = 2.62;
  const float zSouth = 1.78, zNorth = 10.55, zMid = 6.165, zHalf = 4.385, zStair = 8.42;
  const float xWest = -35.28, xEast = -28.20, xMid = -31.74, xHalf = 3.54;
  const float xPartition = -30.92;

  // Concrete landing. The stairs are no longer visible from the elevator; a
  // partition wall with a labeled stair door shrinks the room.
  float floor = sdBox(p - vec3(xMid, -0.045, zMid), vec3(xHalf + 0.10, 0.045, zHalf));
  hit = closer(hit, vec2(floor, 21.0));

  // Low, continuous landing ceiling like the reference elevator threshold.
  float ceil = sdBox(p - vec3(xMid, ceilY, zMid), vec3(xHalf, 0.08, zHalf));
  hit = closer(hit, vec2(ceil, 23.0));

  hit = closer(hit, mapElevator(p));

  // Landing walls: elevator wall behind, adjacent front-door wall below, and
  // a forward stairwell/window wall.
  float westWall = sdBox(p - vec3(xWest, 1.31, zMid), vec3(0.10, 1.31, zHalf));
  float elevatorCut = sdBox(p - vec3(xWest, 1.18, 4.25), vec3(0.18, 1.18, 1.00));
  westWall = max(westWall, -elevatorCut);
  float southWall = sdBox(p - vec3(xMid, 1.31, zSouth), vec3(xHalf, 1.31, 0.10));
  float frontDoorCut = sdBox(p - vec3(-32.35, 1.05, zSouth), vec3(0.58, 1.05, 0.18));
  southWall = max(southWall, -frontDoorCut);
  float eastWall = sdBox(p - vec3(xEast, 1.31, zMid), vec3(0.10, 1.31, zHalf));
  float northWall = sdBox(p - vec3(xMid, 1.31, zNorth), vec3(xHalf, 1.31, 0.10));
  float stairPartition = sdBox(p - vec3(xPartition, 1.31, zMid), vec3(0.10, 1.31, zHalf));
  float stairDoorCut = sdBox(p - vec3(xPartition, 1.05, zStair), vec3(0.18, 1.05, 0.50));
  stairPartition = max(stairPartition, -stairDoorCut);
  float walls = min(min(westWall, southWall), min(min(eastWall, northWall), stairPartition));
  hit = closer(hit, vec2(walls, 22.0));

  // Front apartment door on the adjacent wall. It opens inward, away from the
  // hallway, as the rider approaches.
  float frontDoorAngle = -u_hallDoorOpen * 1.52;
  vec2 frontHinge = vec2(-32.91, zSouth + 0.075);
  vec2 frontAxis = vec2(cos(frontDoorAngle), sin(frontDoorAngle));
  vec2 frontFace = vec2(-frontAxis.y, frontAxis.x);
  vec2 frontRel = p.xz - frontHinge;
  vec2 frontLocal = vec2(dot(frontRel, frontAxis) - 0.56, dot(frontRel, frontFace));
  float frontDoor = sdRoundBox(vec3(frontLocal.x, p.y - 1.06, frontLocal.y), vec3(0.56, 1.06, 0.035), 0.018);
  hit = closer(hit, vec2(frontDoor, 24.0));
  vec2 frontKnobXZ = frontHinge + frontAxis * 0.94 + frontFace * 0.075;
  float frontKnob = length(vec3(p.x - frontKnobXZ.x, p.y - 0.96, p.z - frontKnobXZ.y)) - 0.070;
  hit = closer(hit, vec2(frontKnob, 31.0));

  float apartmentBackWall = sdBox(p - vec3(-32.35, 1.34, zSouth - 3.05), vec3(3.20, 1.34, 0.035));
  hit = closer(hit, vec2(apartmentBackWall, 34.0));

  // Stair access door in the new partition wall, on the left side when facing
  // out of the elevator.
  float stairDoor = sdBox(p - vec3(xPartition - 0.095, 1.05, zStair), vec3(0.035, 1.05, 0.50));
  hit = closer(hit, vec2(stairDoor, 25.0));
  float stairSign = sdBox(p - vec3(xPartition - 0.160, 2.31, zStair), vec3(0.025, 0.13, 0.52));
  hit = closer(hit, vec2(stairSign, 33.0));

  // Building trim: only baseboards and door casing, no random wall props.
  float trim = sdBox(p - vec3(xMid, 0.13, zNorth - 0.12), vec3(xHalf - 0.10, 0.075, 0.035));
  trim = min(trim, sdBox(p - vec3(xWest + 0.12, 0.13, zMid), vec3(0.035, 0.075, zHalf - 0.30)));
  trim = min(trim, sdBox(p - vec3(xEast - 0.12, 0.13, zMid), vec3(0.035, 0.075, zHalf - 0.30)));
  trim = min(trim, sdBox(p - vec3(xPartition - 0.11, 0.13, (zSouth + zStair - 0.72) * 0.5), vec3(0.035, 0.075, (zStair - 0.72 - zSouth) * 0.5)));
  trim = min(trim, sdBox(p - vec3(xPartition - 0.11, 0.13, (zStair + 0.72 + zNorth) * 0.5), vec3(0.035, 0.075, (zNorth - zStair - 0.72) * 0.5)));
  trim = min(trim, sdBox(p - vec3(xPartition - 0.11, 2.12, zStair), vec3(0.035, 0.040, 0.60)));
  trim = min(trim, sdBox(p - vec3(xPartition - 0.11, 1.08, zStair - 0.58), vec3(0.035, 1.02, 0.035)));
  trim = min(trim, sdBox(p - vec3(xPartition - 0.11, 1.08, zStair + 0.58), vec3(0.035, 1.02, 0.035)));
  hit = closer(hit, vec2(trim, 29.0));

  // Fluorescent fixture over the landing, plus a small detector puck.
  float lights = sdBox(p - vec3(-32.42, ceilY - 0.065, 4.05), vec3(0.74, 0.035, 0.12));
  lights = min(lights, sdBox(p - vec3(-32.30, ceilY - 0.065, 7.78), vec3(0.58, 0.035, 0.11)));
  lights = min(lights, max(length((p - vec3(-31.35, 0.0, 4.60)).xz) - 0.10,
                          abs(p.y - (ceilY - 0.075)) - 0.028));
  lights = min(lights, max(length((p - vec3(-33.52, 0.0, 8.35)).xz) - 0.08,
                          abs(p.y - (ceilY - 0.075)) - 0.024));
  hit = closer(hit, vec2(lights, 27.0));

  return hit;
}

vec2 mapScene(vec3 p) {
  if (u_topFloor > 0.5) return mapHallway(p);
  vec2 hit = vec2(p.y, 1.0);

  // Main alley: the street continues far beyond the visible fog. The wall
  // heights deliberately exceed every camera angle available to the player.
  float rightBlock = sdBox(p - vec3(12.0, 42.0, 56.0), vec3(7.0, 42.0, 78.0));
  hit = closer(hit, vec2(rightBlock, 2.0));

  // Splitting the left-hand building leaves one real opening into the rear
  // service court. Everywhere else the alley remains a narrow urban canyon.
  float leftNear = sdBox(p - vec3(-14.0, 42.0, -11.0), vec3(9.0, 42.0, 11.0));
  float leftFar = sdBox(p - vec3(-14.0, 42.0, 70.0), vec3(9.0, 42.0, 61.5));
  hit = closer(hit, vec2(min(leftNear, leftFar), 3.0));

  // Rear building, with the doorway, basement room and elevator car carved
  // from one solid mass. This keeps the exterior-to-interior walk continuous.
  float rear = sdBox(p - vec3(-33.0, 30.0, 4.25), vec3(10.0, 30.0, 16.0));
  float basement = sdBox(p - vec3(-30.0, 2.30, 4.25), vec3(5.8, 2.15, 2.70)); // ~half the old width
  float doorCut = sdBox(p - vec3(-23.75, 1.72, 2.80), vec3(1.35, 1.72, 1.00)); // moved to the LEFT of the back wall
  float liftCut = sdBox(p - vec3(-37.45, 1.82, 4.25), vec3(2.05, 1.82, 1.70));
  float mysteryCut = sdBox(p - vec3(-29.6, 1.74, 7.12), vec3(0.82, 1.76, 0.30)); // big doorway in +Z wall, across from TV
  rear = max(rear, -min(min(basement, mysteryCut), min(doorCut, liftCut)));
  hit = closer(hit, vec2(rear, 2.0));

  // Plain industrial door (CLOSED) in the +Z wall, directly across from the TV.
  float mysteryDoor = sdRoundBox(p - vec3(-29.6, 1.66, 7.0), vec3(0.70, 1.66, 0.05), 0.02);
  hit = closer(hit, vec2(mysteryDoor, 12.0));

  // Hinged steel service door. The opening exists in the building SDF above;
  // this slab is the only thing barring it and rotates inward as approached.
  vec3 dq = p - vec3(-22.87, 0.0, 1.85);
  dq.xz = rot(-u_doorOpen * 1.42) * dq.xz;
  float door = sdRoundBox(dq - vec3(0.0, 1.72, 1.00), vec3(0.105, 1.72, 1.00), 0.035);
  hit = closer(hit, vec2(door, 4.0));

  hit = closer(hit, mapElevator(p));

  // The tutorial-room CRT, floor-standing halfway through the basement on
  // the rider's left. Its back sits against the negative-Z concrete wall.
  float basementTv = sdRoundBox(
    p - vec3(-29.60, 1.06, 1.95),
    vec3(0.553, 0.91, 0.362),
    0.025
  );
  hit = closer(hit, vec2(basementTv, 11.0));

  // The future fire-escape route is already part of the architecture, but is
  // deliberately non-interactive in this first pass.
  float fire = 1e5;
  fire = min(fire, sdBox(p - vec3(-21.72, 5.28, 7.15), vec3(1.18, 0.09, 1.72)));
  fire = min(fire, sdBox(p - vec3(-21.72, 9.18, 5.52), vec3(1.18, 0.09, 1.72)));
  fire = min(fire, sdCapsule(p, vec3(-21.22, 5.34, 5.65), vec3(-21.22, 9.08, 7.02), 0.075));
  fire = min(fire, sdCapsule(p, vec3(-22.18, 5.34, 5.65), vec3(-22.18, 9.08, 7.02), 0.075));
  for (int i = 0; i < 5; i++) {
    float z = 5.72 + float(i) * 0.33;
    float y = 5.62 + float(i) * 0.75;
    fire = min(fire, sdBox(p - vec3(-21.70, y, z), vec3(1.08, 0.055, 0.10)));
  }
  for (int i = 0; i < 4; i++) {
    float z = 5.60 + float(i) * 1.02;
    fire = min(fire, sdCapsule(p, vec3(-20.62, 5.30, z), vec3(-20.62, 6.32, z), 0.045));
  }
  hit = closer(hit, vec2(fire, 7.0));

  // Repeating iron landings break up the long alley walls without revealing
  // a roofline. They also deepen the high, claustrophobic silhouette.
  vec3 fq = p;
  fq.z = mod(fq.z - 12.0, 22.0) - 11.0;
  fq.y = mod(fq.y - 5.5, 8.0) - 4.0;
  float wallEscapes = sdBox(fq - vec3(-4.56, 0.0, 0.0), vec3(0.62, 0.075, 2.05));
  hit = closer(hit, vec2(wallEscapes, 7.0));

  // Alley clutter: dumpster, rubbish bags, bollards and exposed services.
  float clutter = sdRoundBox(p - vec3(-8.4, 0.88, 7.12), vec3(1.25, 0.88, 0.70), 0.10);
  clutter = min(clutter, length(p - vec3(-10.1, 0.42, 7.32)) - 0.43);
  clutter = min(clutter, length(p - vec3(-10.75, 0.33, 6.95)) - 0.34);
  hit = closer(hit, vec2(clutter, 8.0));

  float services = sdCapsule(p, vec3(-22.72, 0.35, 0.78), vec3(-22.72, 8.4, 0.78), 0.10);
  services = min(services, sdCapsule(p, vec3(-22.68, 3.1, 0.78), vec3(-22.68, 3.1, 1.55), 0.10)); // stops short of the doorway (z 1.80)
  services = min(services, sdCapsule(p, vec3(-22.64, 0.25, 9.10), vec3(-22.64, 7.2, 9.10), 0.085));
  hit = closer(hit, vec2(services, 9.0));

  float lamps = sdRoundBox(p - vec3(-22.48, 4.28, 4.25), vec3(0.20, 0.18, 0.34), 0.06);
  vec3 lq = p;
  lq.z = mod(lq.z - 9.0, 24.0) - 12.0;
  lamps = min(lamps, sdRoundBox(vec3(abs(lq.x) - 4.72, lq.y - 4.65, lq.z), vec3(0.25, 0.14, 0.30), 0.05));
  lamps = min(lamps, sdBox(p - vec3(-28.9, 4.29, 4.25), vec3(1.35, 0.055, 0.16)));
  lamps = min(lamps, sdBox(p - vec3(-38.1, 3.48, 4.25), vec3(0.72, 0.05, 0.14)));
  hit = closer(hit, vec2(lamps, 10.0));

  return hit;
}

vec3 sceneNormal(vec3 p) {
  vec2 e = vec2(0.004, 0.0);
  return normalize(vec3(
    mapScene(p + e.xyy).x - mapScene(p - e.xyy).x,
    mapScene(p + e.yxy).x - mapScene(p - e.yxy).x,
    mapScene(p + e.yyx).x - mapScene(p - e.yyx).x
  ));
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occlusion = 0.0;
  float weight = 1.0;
  for (int i = 1; i <= 4; i++) {
    float d = 0.09 * float(i);
    occlusion += (d - mapScene(p + n * d).x) * weight;
    weight *= 0.55;
  }
  return clamp(1.0 - occlusion * 1.6, 0.18, 1.0);
}

vec3 brickMaterial(vec3 p, vec3 n, out vec3 emission) {
  vec2 uv = abs(n.x) > 0.55 ? vec2(p.z, p.y) : vec2(p.x, p.y);
  float row = floor(uv.y * 2.05);
  vec2 brickUV = vec2(uv.x * 1.18 + mod(row, 2.0) * 0.5, uv.y * 2.05);
  vec2 cell = floor(brickUV);
  vec2 f = fract(brickUV);
  float mortar = 1.0 - smoothstep(0.055, 0.095, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  float variation = hash21(cell) * 0.20 - 0.10;
  vec3 brick = vec3(0.205, 0.092, 0.054) + variation * vec3(0.55, 0.27, 0.16);
  vec3 col = mix(brick, vec3(0.105, 0.102, 0.096), mortar * 0.84);
  col *= 0.78 + noise21(uv * 2.7) * 0.24;

  // Procedural window bays on the tall canyon walls only. The rear dead-end
  // building (p.x <= -22) is skipped — its face is sliced by the building in
  // front of it, which made the bays read as half-windows buried in brick.
  // Panes now fully replace the brick (no mortar showing through) inside a
  // clean recessed frame.
  if (abs(n.x) > 0.72 && p.y > 4.0 && p.x > -22.0) {
    vec2 wUV = vec2((uv.x + 80.0) / 3.35, (uv.y - 2.7) / 3.75);
    vec2 wCell = floor(wUV);
    vec2 wf = fract(wUV) - 0.5;
    float frameMask = step(abs(wf.x), 0.235) * step(abs(wf.y), 0.275);
    float glassMask = step(abs(wf.x), 0.195) * step(abs(wf.y), 0.235);
    float lit = step(0.79, hash21(wCell + vec2(17.0, 4.0)));
    float cool = step(0.61, hash21(wCell + 31.7));
    vec3 glass = mix(vec3(0.010, 0.015, 0.020), vec3(0.40, 0.21, 0.085), lit);
    glass = mix(glass, vec3(0.08, 0.24, 0.30), lit * cool);
    glass *= 0.80 + 0.20 * smoothstep(-0.24, 0.24, -wf.y); // recessed top shadow
    col = mix(col, vec3(0.045, 0.040, 0.035), frameMask);  // dark recessed frame
    col = mix(col, glass, glassMask);                      // clean glass, no brick
    emission += glassMask * lit * mix(vec3(0.20, 0.085, 0.025), vec3(0.025, 0.16, 0.19), cool);
  }
  return col;
}

float sdSegment2(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float glyphLine(vec2 p, vec2 a, vec2 b) {
  return 1.0 - smoothstep(0.030, 0.048, sdSegment2(p, a, b));
}

float stairsGlyph(vec2 p, float glyph) {
  float m = 0.0;
  if (glyph < 0.5) {
    m = max(m, glyphLine(p, vec2(0.22, 0.82), vec2(0.78, 0.82)));
    m = max(m, glyphLine(p, vec2(0.22, 0.82), vec2(0.22, 0.52)));
    m = max(m, glyphLine(p, vec2(0.22, 0.52), vec2(0.78, 0.52)));
    m = max(m, glyphLine(p, vec2(0.78, 0.52), vec2(0.78, 0.18)));
    m = max(m, glyphLine(p, vec2(0.22, 0.18), vec2(0.78, 0.18)));
  } else if (glyph < 1.5) {
    m = max(m, glyphLine(p, vec2(0.18, 0.82), vec2(0.82, 0.82)));
    m = max(m, glyphLine(p, vec2(0.50, 0.82), vec2(0.50, 0.18)));
  } else if (glyph < 2.5) {
    m = max(m, glyphLine(p, vec2(0.24, 0.18), vec2(0.24, 0.78)));
    m = max(m, glyphLine(p, vec2(0.76, 0.18), vec2(0.76, 0.78)));
    m = max(m, glyphLine(p, vec2(0.24, 0.78), vec2(0.76, 0.78)));
    m = max(m, glyphLine(p, vec2(0.24, 0.50), vec2(0.76, 0.50)));
  } else if (glyph < 3.5) {
    m = max(m, glyphLine(p, vec2(0.34, 0.82), vec2(0.66, 0.82)));
    m = max(m, glyphLine(p, vec2(0.50, 0.82), vec2(0.50, 0.18)));
    m = max(m, glyphLine(p, vec2(0.34, 0.18), vec2(0.66, 0.18)));
  } else if (glyph < 4.5) {
    m = max(m, glyphLine(p, vec2(0.24, 0.18), vec2(0.24, 0.82)));
    m = max(m, glyphLine(p, vec2(0.24, 0.82), vec2(0.72, 0.82)));
    m = max(m, glyphLine(p, vec2(0.72, 0.82), vec2(0.72, 0.52)));
    m = max(m, glyphLine(p, vec2(0.24, 0.52), vec2(0.72, 0.52)));
    m = max(m, glyphLine(p, vec2(0.48, 0.52), vec2(0.80, 0.18)));
  } else {
    m = max(m, glyphLine(p, vec2(0.22, 0.82), vec2(0.78, 0.82)));
    m = max(m, glyphLine(p, vec2(0.22, 0.82), vec2(0.22, 0.52)));
    m = max(m, glyphLine(p, vec2(0.22, 0.52), vec2(0.78, 0.52)));
    m = max(m, glyphLine(p, vec2(0.78, 0.52), vec2(0.78, 0.18)));
    m = max(m, glyphLine(p, vec2(0.22, 0.18), vec2(0.78, 0.18)));
  }
  return m;
}

vec3 paneledWoodDoor(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  float grain = noise21(vec2(uv.x * 24.0, uv.y * 5.0));
  grain = grain * 0.72 + noise21(vec2(uv.x * 70.0, uv.y * 14.0)) * 0.28;
  vec3 wood = mix(vec3(0.18, 0.045, 0.014), vec3(0.58, 0.145, 0.035), grain);
  wood *= 0.86 + 0.14 * sin(uv.y * 42.0 + noise21(uv * 8.0) * 3.0);

  float leftStile = 1.0 - smoothstep(0.105, 0.145, uv.x);
  float rightStile = smoothstep(0.855, 0.895, uv.x);
  float topRail = smoothstep(0.900, 0.940, uv.y);
  float bottomRail = 1.0 - smoothstep(0.060, 0.105, uv.y);
  float rails = max(max(leftStile, rightStile), max(topRail, bottomRail));
  rails = max(rails, 1.0 - smoothstep(0.016, 0.034, abs(uv.y - 0.245)));
  rails = max(rails, 1.0 - smoothstep(0.016, 0.034, abs(uv.y - 0.420)));
  rails = max(rails, 1.0 - smoothstep(0.016, 0.034, abs(uv.y - 0.595)));
  rails = max(rails, 1.0 - smoothstep(0.016, 0.034, abs(uv.y - 0.770)));

  float inner = smoothstep(0.165, 0.210, uv.x) * (1.0 - smoothstep(0.790, 0.835, uv.x));
  float grooveY = 1.0 - smoothstep(0.010, 0.026,
    min(min(abs(uv.y - 0.245), abs(uv.y - 0.420)),
        min(abs(uv.y - 0.595), abs(uv.y - 0.770))));
  float grooveX = 1.0 - smoothstep(0.010, 0.026, min(abs(uv.x - 0.165), abs(uv.x - 0.835)));
  vec3 col = mix(wood * 0.60, wood * 1.08, rails * 0.55);
  col = mix(col, vec3(0.040, 0.015, 0.008), max(grooveY * inner, grooveX) * 0.72);
  col *= 0.82 + 0.18 * smoothstep(0.0, 1.0, uv.y);
  return col;
}

vec3 blurredMobileRight(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  vec2 texel = 1.0 / vec2(textureSize(u_mobileRightTex, 0));
  vec3 c = texture(u_mobileRightTex, uv).rgb * 0.22;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(5.0, 0.0), 0.0, 1.0)).rgb * 0.12;
  c += texture(u_mobileRightTex, clamp(uv - texel * vec2(5.0, 0.0), 0.0, 1.0)).rgb * 0.12;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(0.0, 5.0), 0.0, 1.0)).rgb * 0.12;
  c += texture(u_mobileRightTex, clamp(uv - texel * vec2(0.0, 5.0), 0.0, 1.0)).rgb * 0.12;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(8.0, 8.0), 0.0, 1.0)).rgb * 0.075;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(-8.0, 8.0), 0.0, 1.0)).rgb * 0.075;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(8.0, -8.0), 0.0, 1.0)).rgb * 0.075;
  c += texture(u_mobileRightTex, clamp(uv + texel * vec2(-8.0, -8.0), 0.0, 1.0)).rgb * 0.075;
  return mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))), 0.16);
}

vec3 surfaceMaterial(vec3 p, vec3 n, float id, out vec3 emission) {
  emission = vec3(0.0);

  // ── Upper apartment-building hallway (ids 21..27) — decayed, dim, real ──
  if (id > 20.5) {
    if (id < 21.5) {
      // FLOOR — bare smooth concrete
      float fn = noise21(p.xz * 2.2);
      vec3 floorc = mix(vec3(0.255, 0.250, 0.240), vec3(0.170, 0.168, 0.160), fn);
      floorc *= 0.92 + 0.08 * noise21(p.xz * 14.0);
      floorc = mix(floorc, floorc * 0.78, smoothstep(0.6, 0.9, noise21(p.xz * 0.9 + 4.0)) * 0.4);
      return floorc;
    }
    if (id < 22.5) {
      // WALLS — pale warm off-white, soft, faint stains, dark baseboard
      vec3 wall = vec3(0.56, 0.555, 0.535);
      wall *= 0.93 + 0.07 * noise21(p.xy * 2.6);
      wall = mix(wall, wall * 0.80, smoothstep(0.55, 0.92, noise21(p.xy * 1.0 + 7.0)) * 0.35); // faint stains
      float panelBand = smoothstep(0.92, 1.02, p.y) * (1.0 - smoothstep(1.95, 2.05, p.y));
      float sideDepth = smoothstep(7.15, 8.35, p.z);
      wall = mix(wall, vec3(0.46, 0.455, 0.430), panelBand * sideDepth * 0.34);
      wall = mix(wall, vec3(0.11, 0.11, 0.105), smoothstep(0.22, 0.15, p.y)); // dark baseboard
      return wall;
    }
    if (id < 23.5) {
      // CEILING — pale warm off-white
      return vec3(0.52, 0.515, 0.50) * (0.93 + 0.07 * noise21(p.xz * 2.0));
    }
    if (id < 24.5) {
      float doorAngle = -u_hallDoorOpen * 1.52;
      vec2 hinge = vec2(-32.91, 1.855);
      vec2 axis = vec2(cos(doorAngle), sin(doorAngle));
      vec2 face = vec2(-axis.y, axis.x);
      vec2 rel = p.xz - hinge;
      vec2 local = vec2(dot(rel, axis), dot(rel, face));
      vec2 uv = vec2(local.x / 1.12, p.y / 2.12);
      return paneledWoodDoor(uv);
    }
    if (id < 25.5) {
      float local = p.z - 8.42;
      vec2 uv = vec2(local / 1.00 + 0.5, p.y / 2.10);
      vec3 col = paneledWoodDoor(uv);
      float knob = smoothstep(0.055, 0.0, length(vec2(uv.x - 0.18, (uv.y - 0.46) * 1.55)) - 0.045);
      col = mix(col, vec3(0.75, 0.55, 0.22), knob);
      emission += knob * vec3(0.05, 0.035, 0.010);
      return col;
    }
    if (id < 27.5) {
      // Flush ceiling light panels -- soft warm glow.
      emission += vec3(1.0, 0.92, 0.74) * 2.0;
      return vec3(0.86, 0.83, 0.72);
    }
    if (id < 28.5) {
      // Spare hallway concrete material, kept for future small fixtures.
      vec3 c = mix(vec3(0.300, 0.295, 0.285), vec3(0.205, 0.200, 0.190), noise21(p.xz * 3.5));
      c *= 0.9 + 0.1 * noise21(p.xz * 16.0);
      return c;
    }
    if (id < 29.5) {
      // Dark painted railings, mullions, and elevator trim.
      return vec3(0.055, 0.060, 0.058) * (0.82 + 0.18 * noise21(p.xy * 18.0));
    }
    if (id < 30.5) {
      // id 30 -- pale city-window glass, retained for future upper-floor use.
      vec3 glass = vec3(0.34, 0.42, 0.45) * (0.78 + 0.22 * noise21(p.xz * 5.0));
      glass += vec3(0.18, 0.20, 0.20) * smoothstep(0.15, 1.8, p.y);
      emission += vec3(0.025, 0.035, 0.040);
      return glass;
    }
    if (id < 31.5) {
      emission += vec3(0.05, 0.035, 0.010);
      return vec3(0.78, 0.58, 0.24) * (0.88 + 0.12 * noise21(p.xy * 24.0));
    }
    if (id < 32.5) {
      vec2 q = vec2((p.z - 4.78) / 0.68 + 0.5, (p.y - 1.45) / 0.54 + 0.5);
      float frame = 1.0 - step(0.08, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)));
      vec3 paper = mix(vec3(0.46, 0.43, 0.34), vec3(0.18, 0.10, 0.055), frame);
      float stripe = smoothstep(0.43, 0.47, q.y) * (1.0 - smoothstep(0.53, 0.57, q.y));
      return mix(paper, vec3(0.42, 0.12, 0.055), stripe);
    }
    if (id < 33.5) {
      vec2 signUv = vec2((8.42 - p.z) / 0.96 + 0.5, (p.y - 2.31) / 0.22 + 0.5);
      float insideSign = step(0.0, signUv.x) * step(signUv.x, 1.0) *
        step(0.0, signUv.y) * step(signUv.y, 1.0);
      vec2 wordUv = vec2((signUv.x - 0.08) / 0.84, (signUv.y - 0.18) / 0.64);
      float insideWord = step(0.0, wordUv.x) * step(wordUv.x, 1.0) *
        step(0.0, wordUv.y) * step(wordUv.y, 1.0);
      float slot = floor(wordUv.x * 6.0);
      vec2 letterUv = vec2(fract(wordUv.x * 6.0), wordUv.y);
      float ink = stairsGlyph(letterUv, slot) * insideSign * insideWord;
      vec3 sign = vec3(0.040, 0.045, 0.040);
      sign = mix(sign, vec3(0.88, 0.92, 0.78), ink);
      emission += ink * vec3(0.10, 0.12, 0.06);
      return sign;
    }
    // Unlit apartment interior behind the front door. The fade-out leads the
    // door swing, so at most a dark sliver of this is ever visible — keep it
    // near-black with only a hint of the room in it.
    vec2 roomUv = vec2((p.x + 32.35) / 6.40 + 0.5, p.y / 2.68);
    vec3 room = blurredMobileRight(roomUv);
    return room * vec3(0.055, 0.052, 0.048) + vec3(0.004, 0.004, 0.004);
  }

  if (id < 1.5) {
    bool inside = p.x < -24.0;
    float grit = noise21(p.xz * 3.7) * 0.025;
    vec3 col = inside ? vec3(0.105, 0.112, 0.096) : vec3(0.045, 0.050, 0.052);
    col += grit;
    float cracks = smoothstep(0.028, 0.0, abs(noise21(p.xz * 0.75) - 0.49));
    col *= 1.0 - cracks * 0.22;
    float puddle = smoothstep(0.60, 0.77, noise21(p.xz * 0.19 + vec2(4.0, 11.0)));
    if (!inside) {
      col = mix(col, vec3(0.018, 0.028, 0.034), puddle * 0.72);
      float warmReflection = exp(-abs(p.x - 3.9) * 0.45) *
        (0.5 + 0.5 * sin(p.z * 1.55 + noise21(p.xz) * 4.0));
      col += puddle * warmReflection * vec3(0.16, 0.075, 0.025);
    } else {
      float drain = smoothstep(0.34, 0.30, abs(length(p.xz - vec2(-29.2, 1.4)) - 0.42));
      col = mix(col, vec3(0.026), drain);
    }
    return col;
  }

  if (id < 3.5) {
    bool basementWall = p.x < -23.8 && p.y < 4.65 && p.z > 1.3 && p.z < 8.3;
    if (basementWall) {
      float damp = noise21(vec2(p.z * 0.35, p.y * 0.7) + floor(p.x));
      vec3 concrete = mix(vec3(0.115, 0.118, 0.105), vec3(0.055, 0.075, 0.062), smoothstep(0.52, 0.78, damp));
      float seam = smoothstep(0.045, 0.0, abs(fract(p.y * 0.42) - 0.5) - 0.455);
      return mix(concrete, vec3(0.045), seam * 0.55);
    }
    return brickMaterial(p, n, emission);
  }

  if (id < 4.5) {
    float rust = smoothstep(0.57, 0.78, noise21(vec2(p.z * 4.0, p.y * 3.0)));
    vec3 metal = mix(vec3(0.055, 0.078, 0.071), vec3(0.24, 0.075, 0.026), rust);
    float scratches = smoothstep(0.96, 1.0, sin((p.y + p.z) * 73.0) * 0.5 + 0.5);
    return metal + scratches * 0.055;
  }

  if (id < 5.5) {
    float brushed = 0.5 + 0.5 * sin(p.y * 128.0 + noise21(p.yz * 9.0) * 2.0);
    vec3 steel = vec3(0.155, 0.165, 0.158) + brushed * 0.028;
    // Interior control panel (+z face on the front-left return): 2 x 6 buttons,
    // a few lit amber. This is the panel inside the car.
    if (n.z > 0.45 && p.z > 3.34 && p.x > -36.25 && p.x < -35.65 &&
        p.y > 0.94 && p.y < 1.66) {
      steel = vec3(0.085, 0.088, 0.092);                  // dark recessed plate
      vec2 g = vec2((p.x + 36.25) / 0.30, (p.y - 0.94) / 0.12);
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float btn = smoothstep(0.36, 0.27, length(f));      // round button face
      float lit = step(0.66, hash21(cell + 3.0));         // a few illuminated
      vec3 btnCol = mix(vec3(0.21, 0.22, 0.24), vec3(0.95, 0.62, 0.18), lit);
      steel = mix(steel, btnCol, btn);
      emission += btn * lit * vec3(0.55, 0.32, 0.08);
    }
    // Exterior call plate (+x face on the jamb): a 1 x 2 up/down call panel.
    if (n.x > 0.45 && p.x > -35.34 && p.x < -35.23 &&
        p.z > 6.31 && p.z < 6.53 && p.y > 1.17 && p.y < 1.53) {
      steel = vec3(0.080, 0.083, 0.088);
      vec2 g = vec2((p.z - 6.31) / 0.22, (p.y - 1.17) / 0.18);
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float btn = smoothstep(0.40, 0.30, length(f));
      float lit = step(0.5, hash21(cell + 9.0));
      vec3 btnCol = mix(vec3(0.22, 0.23, 0.25), vec3(0.35, 0.85, 0.40), lit);
      steel = mix(steel, btnCol, btn);
      emission += btn * lit * vec3(0.06, 0.30, 0.10);
    }
    return steel;
  }

  if (id < 7.5) {
    float rust = smoothstep(0.48, 0.75, noise21(p.zy * 2.1 + p.x));
    return mix(vec3(0.075, 0.065, 0.057), vec3(0.30, 0.095, 0.030), rust);
  }

  if (id < 8.5) {
    float edge = smoothstep(0.2, 0.0, abs(fract(p.y * 2.3) - 0.5));
    return mix(vec3(0.026, 0.078, 0.061), vec3(0.09, 0.12, 0.08), edge * 0.22);
  }

  if (id < 9.5) {
    return vec3(0.075, 0.066, 0.055) + noise21(p.zy * 4.0) * vec3(0.07, 0.025, 0.010);
  }

  if (id > 11.5 && id < 12.5) {
    // Plain basic INDUSTRIAL DOOR — dingy dark grey steel, simple frame, lever.
    // Full height (~3.3 m) to match the basement's scale; material maps the WHOLE slab.
    float wpos = p.x + 29.6;
    float u = clamp(wpos / 0.70 * 0.5 + 0.5, 0.0, 1.0);
    float py = clamp(p.y / 3.32, 0.0, 1.0);
    vec3 col = vec3(0.090, 0.094, 0.098);
    col *= 0.78 + 0.22 * noise21(vec2(u * 5.0, p.y * 3.0));   // grime + streaks
    float frame = step(0.055, min(min(u, 1.0 - u), min(py, 1.0 - py)));
    col *= mix(0.62, 1.0, frame);                            // recessed centre panel, lighter frame
    float lever = smoothstep(0.02, 0.0, max(abs(wpos + 0.52) - 0.10, abs(p.y - 1.15) - 0.02));
    col = mix(col, vec3(0.32, 0.28, 0.15), lever);          // tarnished brass-ish lever
    return col;
  }

  if (id > 10.5 && id < 11.5) {
    const float tvCenterX = -29.60;
    const float tvHalfWidth = 0.553;
    const float tvBackZ = 1.588;
    const float tvFrontZ = 2.312;
    const float tvHeight = 1.82;
    vec2 tvUv;
    vec4 tvShell;

    if (n.z > 0.45) {
      tvUv = vec2(
        (tvCenterX + tvHalfWidth - p.x) / (tvHalfWidth * 2.0),
        (p.y - 0.15) / tvHeight
      );
      tvShell = texture(u_tvFrontTex, clamp(tvUv, 0.0, 1.0));
      float screenKey = greenKey(tvShell.rgb);
      vec2 screenUv = clamp(
        (tvUv - vec2(0.100, 0.551)) / vec2(0.808, 0.374),
        0.0,
        1.0
      );
      vec3 screen = texture(u_tvScreenTex, screenUv).rgb;
      emission += screen * screenKey * 0.72;
      return mix(tvShell.rgb, screen, screenKey) * 0.72;
    }

    if (n.x > 0.45) {
      tvUv = vec2(
        (p.z - tvBackZ) / (tvFrontZ - tvBackZ),
        (p.y - 0.15) / tvHeight
      );
      tvShell = texture(u_tvLeftTex, clamp(tvUv, 0.0, 1.0));
      return tvShell.rgb * 0.64;
    }

    if (n.x < -0.45) {
      tvUv = vec2(
        (tvFrontZ - p.z) / (tvFrontZ - tvBackZ),
        (p.y - 0.15) / tvHeight
      );
      tvShell = texture(u_tvRightTex, clamp(tvUv, 0.0, 1.0));
      return tvShell.rgb * 0.64;
    }

    return vec3(0.035, 0.032, 0.030);
  }

  float flicker = 0.90 + 0.10 * sin(u_time * 48.0 + hash11(floor(u_time * 3.0)) * 8.0);
  bool fluorescent = p.x < -24.0;
  emission = fluorescent ? vec3(0.46, 0.64, 0.55) * flicker : vec3(1.0, 0.36, 0.08) * 1.4;
  return emission * 0.72 + vec3(0.10);
}

vec3 pointLight(vec3 p, vec3 n, vec3 lightPos, vec3 color, float power) {
  vec3 delta = lightPos - p;
  float d2 = max(dot(delta, delta), 0.25);
  vec3 l = delta * inversesqrt(d2);
  float diffuse = max(dot(n, l), 0.0);
  return color * diffuse * power / (1.0 + d2 * 0.12);
}

vec3 skyColor(vec3 rd) {
  float up = max(rd.y, 0.0);
  vec3 sky = mix(vec3(0.002, 0.004, 0.008), vec3(0.008, 0.016, 0.028), up);
  float haze = pow(max(rd.z, 0.0), 18.0) * (1.0 - up);
  sky += vec3(0.025, 0.044, 0.058) * haze;
  float star = step(0.9987, hash21(floor(rd.xy * 840.0) + floor(rd.z * 190.0)));
  sky += star * vec3(0.22, 0.28, 0.34) * smoothstep(0.02, 0.30, up);
  return sky;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  float cp = cos(u_pitch), sp = sin(u_pitch);
  float cy = cos(u_yaw), sy = sin(u_yaw);
  vec3 forward = vec3(sy * cp, sp, cy * cp);
  vec3 right = vec3(cy, 0.0, -sy);
  vec3 up = normalize(cross(forward, right));
  vec3 rd = normalize(forward * u_focal + right * uv.x + up * uv.y);

  float travel = 0.0;
  vec2 hit = vec2(0.0);
  bool found = false;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = u_eye + rd * travel;
    hit = mapScene(p);
    if (hit.x < HIT_EPSILON * (1.0 + travel * 0.018)) {
      found = true;
      break;
    }
    travel += max(hit.x * 0.72, 0.012);
    if (travel > FAR_CLIP) break;
  }

  vec3 col = skyColor(rd);
  col += vec3(0.30, 0.36, 0.48) * u_lightning * (1.0 - u_topFloor) *
    smoothstep(-0.10, 0.60, rd.y);
  if (found) {
    vec3 p = u_eye + rd * travel;
    vec3 n = sceneNormal(p);
    vec3 emission;
    vec3 material = surfaceMaterial(p, n, hit.y, emission);
    float ao = ambientOcclusion(p, n);
    float hemi = 0.10 + 0.11 * max(n.y, 0.0) + 0.035 * max(-n.y, 0.0);
    vec3 light = vec3(0.018, 0.026, 0.038) + vec3(0.09, 0.105, 0.12) * hemi;

    float groundLight = 1.0 - u_topFloor;
    light += pointLight(p, n, vec3(4.25, 4.8, 10.0), vec3(1.0, 0.29, 0.07), 14.0) * groundLight;
    light += pointLight(p, n, vec3(-4.25, 4.7, 33.0), vec3(0.15, 0.42, 0.52), 12.0) * groundLight;
    light += pointLight(p, n, vec3(3.9, 5.1, 68.0), vec3(0.95, 0.22, 0.055), 17.0) * groundLight;
    light += pointLight(p, n, vec3(-20.9, 4.2, 4.25), vec3(1.0, 0.25, 0.055), 18.0) * groundLight;
    light += pointLight(p, n, vec3(-28.9, 4.1, 4.25), vec3(0.38, 0.65, 0.50), 21.0) * groundLight;
    light += pointLight(p, n, vec3(-29.6, 1.35, 2.20), vec3(0.16, 0.28, 0.34), 5.5) * groundLight;
    light += pointLight(p, n, vec3(-38.1, 3.35, 4.25), vec3(0.34, 0.58, 0.52), 16.0) * groundLight;
    // Upper landing: warm fluorescent overhead, cool daylight from the stairwell window.
    light += pointLight(p, n, vec3(-32.42, 2.45, 4.05), vec3(1.0, 0.90, 0.72), 8.0) * u_topFloor;
    light += pointLight(p, n, vec3(-28.35, 1.72, 4.88), vec3(0.46, 0.58, 0.66), 5.6) * u_topFloor;
    light += vec3(0.066, 0.064, 0.060) * u_topFloor;

    vec3 viewDir = normalize(u_eye - p);
    vec3 keyDir = normalize(vec3(-0.35, 0.72, -0.24));
    float specular = pow(max(dot(reflect(-keyDir, n), viewDir), 0.0), hit.y < 1.5 ? 48.0 : 22.0);
    float wet = hit.y < 1.5 ? 0.22 : 0.035;
    // Lightning: a cold sky flash on the open alley, top-facing surfaces
    // catching the most. Only a faint spill reaches through the basement door.
    float flashReach = (1.0 - u_topFloor) * (p.x > -23.5 ? 1.0 : 0.06);
    light += vec3(0.52, 0.60, 0.78) * u_lightning * flashReach * (0.30 + 0.70 * max(n.y, 0.0));
    col = material * light * ao + emission + specular * wet * vec3(0.34, 0.46, 0.53);
    col += specular * wet * vec3(0.9, 1.0, 1.2) * u_lightning * flashReach;

    bool inBasement = u_topFloor > 0.5 || p.x < -23.5 || u_eye.x < -24.0;
    float fog = inBasement
      ? 1.0 - exp(-travel * 0.008)
      : 1.0 - exp(-travel * 0.030);
    vec3 fogColor = inBasement ? vec3(0.020, 0.030, 0.025) : vec3(0.008, 0.017, 0.025);
    if (!inBasement) fogColor += vec3(0.10, 0.12, 0.16) * u_lightning;
    col = mix(col, fogColor, fog * (inBasement ? 0.38 : 0.82));
  }

  // The motorcycle remains parked where the rider entered the alley. It is
  // a world-space sprite, so it grows naturally on the return walk and is
  // hidden by nearer geometry instead of behaving like a HUD element.
  if (u_harleyReady > 0.5 && u_eye.x < -0.25 && rd.x > 0.001) {
    const float harleyX = 0.72;
    const float harleyZ = 4.25;
    const float harleyWidth = 3.10;
    const float harleyHeight = 1.744;
    float harleyTravel = (harleyX - u_eye.x) / rd.x;
    if (harleyTravel > 0.0 && harleyTravel < travel) {
      vec3 hp = u_eye + rd * harleyTravel;
      vec2 harleyUv = vec2(
        0.5 + (hp.z - harleyZ) / harleyWidth,
        hp.y / harleyHeight
      );
      if (all(greaterThanEqual(harleyUv, vec2(0.0))) &&
          all(lessThanEqual(harleyUv, vec2(1.0)))) {
        vec4 harley = texture(u_harleyTex, harleyUv);
        float harleyAlpha = smoothstep(0.035, 0.30, harley.a);
        vec3 harleyColor = harley.rgb * vec3(0.56, 0.58, 0.61);
        col = mix(col, harleyColor, harleyAlpha);
      }
    }
  }

  // Rain in world space: six rings of falling streaks at fixed distances
  // around the eye. Each ring is hit along the view ray, so walls occlude it
  // (ring distance vs. the marched hit), far rings read smaller and foggier,
  // and drops only exist over open ground (outside the rear building), which
  // means from the basement you only see rain through the doorway.
  if (u_topFloor < 0.5) {
    float hl = length(rd.xz);
    float theta = atan(rd.z, rd.x);
    float metersPerPixel = 2.0 / (u_resolution.y * 1.5);
    vec3 rainCol = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float radius = 1.2 * pow(1.82, fi);          // 1.2 .. ~24 m
      float t = radius / max(hl, 1e-3);
      if (hl < 1e-3 || t > (found ? travel : 1e4)) continue;
      vec3 wp = u_eye + rd * t;
      if (wp.x < -22.9 || wp.y < 0.0) continue;
      float spacing = 0.075 + fi * 0.03;             // metres between columns
      float width = max(0.0045, metersPerPixel * t * 0.9);
      float along = theta * radius + wp.y * 0.07;    // slight wind slant
      float column = floor(along / spacing);
      float colSeed = hash11(column * 1.37 + fi * 17.0);
      float cellH = 1.4 + fi * 0.2;
      float fall = (wp.y + u_time * (8.5 + colSeed * 2.0)) / cellH + colSeed * 13.0;
      float cell = floor(fall);
      float f = fract(fall);                         // 0 = bottom (head)
      float seed = hash21(vec2(column, cell) + vec2(fi * 31.0, fi * 7.0));
      float present = step(0.50, seed);
      float center = 0.2 + 0.6 * hash11(seed * 91.0);
      float dx = abs(fract(along / spacing) - center) * spacing;
      float line = 1.0 - smoothstep(width * 0.35, width, dx);
      float lenFrac = 0.34 / cellH;
      float streak = smoothstep(0.0, 0.03, f) * (1.0 - smoothstep(0.0, lenFrac, f));
      float amount = present * line * streak;
      if (amount < 0.001) continue;
      // Drops catch whichever lamps are near them.
      vec3 glow = vec3(0.10, 0.14, 0.17);
      vec3 d0 = wp - vec3(4.25, 4.8, 10.0);   glow += vec3(1.0, 0.36, 0.10) * 5.0 / (1.0 + dot(d0, d0) * 0.30);
      vec3 d1 = wp - vec3(-4.25, 4.7, 33.0);  glow += vec3(0.20, 0.50, 0.60) * 4.0 / (1.0 + dot(d1, d1) * 0.30);
      vec3 d2 = wp - vec3(3.9, 5.1, 68.0);    glow += vec3(0.95, 0.30, 0.08) * 5.0 / (1.0 + dot(d2, d2) * 0.30);
      vec3 d3 = wp - vec3(-20.9, 4.2, 4.25);  glow += vec3(1.0, 0.32, 0.08) * 5.0 / (1.0 + dot(d3, d3) * 0.30);
      glow += vec3(0.60, 0.68, 0.82) * u_lightning * 1.6;
      float nearFade = smoothstep(0.9, 1.6, t);      // no streaks glued to the lens
      rainCol += glow * amount * (0.55 - fi * 0.05) * exp(-t * 0.035) * nearFade;
    }
    col += rainCol;
  }

  float vignette = 1.0 - 0.28 * dot(uv * vec2(0.72, 0.88), uv * vec2(0.72, 0.88));
  col *= clamp(vignette, 0.54, 1.0);
  col *= 0.98 + 0.02 * sin(u_time * 8.0 + u_walk * 2.0);
  col = 1.0 - exp(-max(col, 0.0) * 1.24);
  col = pow(col, vec3(0.92));
  col *= (1.0 - clamp(u_fade, 0.0, 1.0)); // fade to black entering the apartment
  FragColor = vec4(col, 1.0);
}`;

  window.GLSL.modules.alley = FRAGMENT_SOURCE;
  window.GLSL.modules.mode_alley = FRAGMENT_SOURCE;
  window.GLSL.modules["mode-alley"] = FRAGMENT_SOURCE;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function smooth01(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "shader compile failed";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "program link failed";
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      throw new Error(message);
    }
    return { program: program, vertex: vertex, fragment: fragment };
  }

  function makeAlleyCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "c";
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;display:block;background:#000;z-index:1;";
    return canvas;
  }

  function stopCompetingScenes() {
    const scenes = [
      window.__modeDesertRoadScene,
      window.__modeTheaterScene,
      window.__modeAlleyScene,
    ];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (scene && typeof scene.destroy === "function") {
        try {
          scene.destroy();
        } catch (error) {}
      }
    }
    const zones = [
      window.currentZone2,
      window.currentZone3,
      window.currentZone4,
    ];
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      if (zone && typeof zone.destroy === "function") {
        try {
          zone.destroy();
        } catch (error) {}
      }
    }
    window.currentZone2 = null;
    window.currentZone3 = null;
    window.currentZone4 = null;
    window.__modeDesertRoadActive = false;
    window.__modeTheaterActive = false;
  }

  window.startModeAlley = function (options) {
    options = options || {};
    if (window.__modeAlleyScene && window.__modeAlleyActive) {
      if (options.walkHeld && window.__modeAlleyScene.setWalkHeld) {
        window.__modeAlleyScene.setWalkHeld(true);
      }
      return window.__modeAlleyScene;
    }

    stopCompetingScenes();
    window.isEngine1Dead = true;

    const glOptions = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    };

    let canvas = document.getElementById("c");
    let gl = canvas ? canvas.getContext("webgl2", glOptions) : null;
    if (!gl) {
      const freshCanvas = makeAlleyCanvas();
      if (canvas && canvas.parentNode)
        canvas.parentNode.replaceChild(freshCanvas, canvas);
      else document.body.appendChild(freshCanvas);
      canvas = freshCanvas;
      gl = canvas.getContext("webgl2", glOptions);
    }
    if (!gl) {
      console.error("[mode-alley] WebGL2 required");
      return null;
    }

    let built;
    try {
      built = createProgram(gl);
    } catch (error) {
      console.error("[mode-alley]", error.message || error);
      return null;
    }

    const program = built.program;
    const vao = gl.createVertexArray();
    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      eye: gl.getUniformLocation(program, "u_eye"),
      yaw: gl.getUniformLocation(program, "u_yaw"),
      pitch: gl.getUniformLocation(program, "u_pitch"),
      focal: gl.getUniformLocation(program, "u_focal"),
      doorOpen: gl.getUniformLocation(program, "u_doorOpen"),
      hallDoorOpen: gl.getUniformLocation(program, "u_hallDoorOpen"),
      walk: gl.getUniformLocation(program, "u_walk"),
      liftOpen: gl.getUniformLocation(program, "u_liftOpen"),
      harleyTex: gl.getUniformLocation(program, "u_harleyTex"),
      harleyReady: gl.getUniformLocation(program, "u_harleyReady"),
      tvFrontTex: gl.getUniformLocation(program, "u_tvFrontTex"),
      tvLeftTex: gl.getUniformLocation(program, "u_tvLeftTex"),
      tvRightTex: gl.getUniformLocation(program, "u_tvRightTex"),
      tvScreenTex: gl.getUniformLocation(program, "u_tvScreenTex"),
      mobileRightTex: gl.getUniformLocation(program, "u_mobileRightTex"),
      topFloor: gl.getUniformLocation(program, "u_topFloor"),
      fade: gl.getUniformLocation(program, "u_fade"),
      lightning: gl.getUniformLocation(program, "u_lightning"),
    };

    const state = {
      phase: "parked",
      x: 0,
      y: 1.62,
      z: 4.25,
      yaw: 0,
      pitch: -0.035,
      lookYaw: 0,
      lookPitch: 0,
      lookYawTarget: 0,
      lookPitchTarget: 0,
      turn: 0,
      doorOpen: 0,
      hallDoorOpen: 0,
      liftOpen: 0,
      elevatorTurn: 0,
      ascend: 0,
      topFloor: 0,
      hallT: 0,
      fade: 0,
      handedOff: false,
      routeDir: -1,
      turning180: false,
      turn180Start: 0,
      turn180Target: 0,
      turn180Progress: 0,
      lastTurnSign: 1,
      forwardHeld: !!options.walkHeld,
      pointerId: null,
      walking: 0,
      distance: 0,
      tvZoom: 0,
    };

    const HARLEY_STOP_X = -1.8;
    const ELEVATOR_ENTRY_X = -36.4;
    // Basement CRT / mystery door face-off: both sit at x = -29.6, TV on the
    // -Z wall, door on the +Z wall. Standing between them allows 90° turns.
    const TV_FACE_X = -29.6;
    const TV_ZONE_HALF = 0.9;
    const TV_STOP_Z = 3.36; // eye z fully zoomed: ~1.05 in front of the screen
    const TV_SCREEN_Y = 1.49; // screen centre height

    let destroyed = false;
    let harleyTexture = null;
    let harleyReady = false;
    const harleyImage = new Image();
    harleyImage.onload = function () {
      if (destroyed) return;
      harleyTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, harleyTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        harleyImage,
      );
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      harleyReady = true;
    };
    harleyImage.onerror = function () {
      console.warn("[mode-alley] harley.png failed to load");
    };
    harleyImage.src = "files/img/rooms/z4/harley.png";

    const tvImages = [];
    function makeFallbackTexture(color) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
      );
      return texture;
    }

    function loadTvTexture(filename) {
      const texture = makeFallbackTexture([18, 16, 15, 255]);
      const image = new Image();
      tvImages.push(image);
      image.onload = function () {
        if (destroyed) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      };
      image.onerror = function () {
        console.warn("[mode-alley] " + filename + " failed to load");
      };
      image.src = "files/img/rooms/tutorial/" + filename;
      return texture;
    }

    function loadImageTexture(path, label, fallback) {
      const texture = makeFallbackTexture(fallback);
      const image = new Image();
      tvImages.push(image);
      image.onload = function () {
        if (destroyed) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      };
      image.onerror = function () {
        console.warn("[mode-alley] " + label + " failed to load");
      };
      image.src = path;
      return texture;
    }

    const tvFrontTexture = loadTvTexture("tv-F.png");
    const tvLeftTexture = loadTvTexture("tv-L.png");
    const tvRightTexture = loadTvTexture("tv-R.png");
    const tvScreenTexture = makeFallbackTexture([5, 5, 5, 255]);
    const mobileRightTexture = loadImageTexture(
      "files/img/rooms/z1/right-mobile.png",
      "right-mobile.png",
      [16, 14, 13, 255],
    );
    let tvVideo = null;
    let tvVideoReady = false;
    let tvVideoAllocated = false;

    if (typeof document.createElement === "function") {
      tvVideo = document.createElement("video");
      tvVideo.muted = true;
      tvVideo.loop = true;
      tvVideo.autoplay = true;
      tvVideo.playsInline = true;
      tvVideo.preload = "auto";
      tvVideo.setAttribute("playsinline", "");
      tvVideo.setAttribute("webkit-playsinline", "");
      tvVideo.setAttribute("aria-hidden", "true");
      tvVideo.style.cssText =
        "position:fixed;left:-10000px;top:0;width:2px;height:2px;" +
        "pointer-events:none;opacity:0.01;";
      tvVideo.addEventListener(
        "canplay",
        function () {
          if (destroyed) return;
          tvVideoReady = true;
          const play = tvVideo.play();
          if (play && play.catch) play.catch(function () {});
        },
        { once: true },
      );
      tvVideo.addEventListener(
        "error",
        function () {
          console.warn("[mode-alley] tutorial tv.mp4 failed to load");
        },
        { once: true },
      );
      document.body.appendChild(tvVideo);
      tvVideo.src = "files/img/rooms/tutorial/tv.mp4";
      tvVideo.load();
    }

    let overlay = document.getElementById("bike-overlay");
    if (!overlay) {
      overlay = document.createElement("img");
      overlay.id = "bike-overlay";
      overlay.src = "files/img/rooms/z4/bike.png";
      overlay.alt = "";
      document.body.appendChild(overlay);
    }

    let rafId = 0;
    let previousTime = performance.now();
    let startTime = previousTime;
    let lastWidth = 0;
    let lastHeight = 0;

    function resize() {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        options.maxDpr || 1.45,
      );
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (width !== lastWidth || height !== lastHeight) {
        canvas.width = width;
        canvas.height = height;
        lastWidth = width;
        lastHeight = height;
      }
    }

    function forwardKey(event) {
      return (
        !!event &&
        (event.code === "Space" ||
          event.code === "ArrowUp" ||
          event.code === "KeyW" ||
          event.code === "KeyK")
      );
    }

    function leftKey(event) {
      return (
        !!event &&
        (event.code === "ArrowLeft" ||
          event.code === "KeyA" ||
          event.code === "KeyH")
      );
    }

    function rightKey(event) {
      return (
        !!event &&
        (event.code === "ArrowRight" ||
          event.code === "KeyD" ||
          event.code === "KeyL")
      );
    }

    function backKey(event) {
      return (
        !!event &&
        (event.code === "ArrowDown" ||
          event.code === "KeyS" ||
          event.code === "KeyJ")
      );
    }

    function beginLeftTurn() {
      if (state.phase !== "parked") return false;
      state.phase = "turning";
      state.forwardHeld = false;
      syncNavigation();
      return true;
    }

    function canTurnAround() {
      return (
        state.turn >= 1 &&
        !state.turning180 &&
        state.tvZoom < 0.05 && // locked while pushed into the CRT
        state.phase !== "turning" &&
        state.phase !== "elevator"
      );
    }

    function beginTurnAround(sign) {
      if (!canTurnAround()) return false;
      const turnSign = sign < 0 ? -1 : 1;
      state.lastTurnSign = turnSign;
      state.turning180 = true;
      state.turn180Start = state.yaw;
      state.turn180Target = state.yaw + turnSign * Math.PI;
      state.turn180Progress = 0;
      state.routeDir = -state.routeDir;
      state.forwardHeld = false;
      state.pointerId = null;
      syncNavigation();
      return true;
    }

    function inTvZone() {
      return (
        state.phase === "basement" &&
        Math.abs(state.x - TV_FACE_X) < TV_ZONE_HALF
      );
    }

    function facingTv() {
      return !state.turning180 && Math.cos(state.yaw) < -0.92;
    }

    function facingMysteryDoor() {
      return !state.turning180 && Math.cos(state.yaw) > 0.92;
    }

    function sideFacing() {
      return facingTv() || facingMysteryDoor();
    }

    function canSideTurn() {
      return canTurnAround() && inTvZone() && state.tvZoom < 0.05;
    }

    // 90° step between the corridor, the TV (-Z wall) and the mystery door
    // (+Z wall). Reuses the turning180 tween; routeDir is re-derived from the
    // final yaw when the turn lands back on the corridor axis.
    function beginSideTurn(sign) {
      if (!canSideTurn()) return false;
      const turnSign = sign < 0 ? -1 : 1;
      state.lastTurnSign = turnSign;
      state.turning180 = true;
      state.turn180Start = state.yaw;
      state.turn180Target = state.yaw + turnSign * Math.PI * 0.5;
      state.turn180Progress = 0;
      state.forwardHeld = false;
      state.pointerId = null;
      syncNavigation();
      return true;
    }

    function canWalk() {
      return (
        !state.turning180 &&
        (state.phase === "court" ||
          state.phase === "door" ||
          state.phase === "basement")
      );
    }

    function canAdvance() {
      return (
        canWalk() &&
        !sideFacing() &&
        (state.routeDir < 0
          ? state.x > ELEVATOR_ENTRY_X
          : state.x < HARLEY_STOP_X)
      );
    }

    function syncNavigation() {
      window.__modeAlleyNav = {
        left: state.phase === "parked",
        right: false,
        back: canTurnAround(),
        forward: canAdvance() || (inTvZone() && facingTv()),
        phase: state.phase,
        turn: state.turn,
        doorOpen: state.doorOpen,
        routeDir: state.routeDir,
      };
      return window.__modeAlleyNav;
    }

    function isWalkPointer(event) {
      return (
        typeof window.__mobileWalkZoneContains === "function" &&
        window.__mobileWalkZoneContains(event.clientX, event.clientY)
      );
    }

    function onKeyDown(event) {
      if (destroyed) return;
      if (leftKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) {
          if (state.phase === "parked") beginLeftTurn();
          else if (canSideTurn()) beginSideTurn(-1);
          else beginTurnAround(-1);
        }
        return;
      }
      if (rightKey(event) || backKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) {
          // In the TV/door zone left-right steps 90°; back stays a full 180.
          if (rightKey(event) && canSideTurn()) beginSideTurn(1);
          else beginTurnAround(1);
        }
        return;
      }
      if (forwardKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        state.forwardHeld =
          canAdvance() ||
          (inTvZone() && facingTv()) ||
          (state.phase === "hallway" && state.hallT < 1);
      }
    }

    function onKeyUp(event) {
      if (!forwardKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      state.forwardHeld = false;
    }

    function onPointerDown(event) {
      if (destroyed) return;
      if (
        event.pointerType === "touch" &&
        state.phase === "parked" &&
        event.clientX < window.innerWidth * 0.45
      ) {
        event.preventDefault();
        beginLeftTurn();
        return;
      }
      if (event.pointerType === "touch" && canTurnAround() && !isWalkPointer(event)) {
        const edge = window.innerWidth * 0.3;
        if (event.clientX < edge || event.clientX > window.innerWidth - edge) {
          event.preventDefault();
          const sign = event.clientX < edge ? -1 : 1;
          if (canSideTurn()) beginSideTurn(sign);
          else beginTurnAround(sign);
          return;
        }
      }
      if ((!canWalk() && state.phase !== "hallway") || !isWalkPointer(event))
        return;
      event.preventDefault();
      state.pointerId = event.pointerId;
      state.forwardHeld = true;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {}
    }

    function releasePointer(event) {
      if (state.pointerId === null) return;
      if (event && event.pointerId !== state.pointerId) return;
      state.pointerId = null;
      state.forwardHeld = false;
    }

    function onMouseMove(event) {
      if (destroyed || state.pointerId !== null) return;
      const nx =
        (event.clientX - window.innerWidth * 0.5) /
        Math.max(window.innerWidth * 0.5, 1);
      const ny =
        (window.innerHeight * 0.5 - event.clientY) /
        Math.max(window.innerHeight * 0.5, 1);
      state.lookYawTarget = clamp(nx * 0.22, -0.22, 0.22);
      state.lookPitchTarget = clamp(ny * 0.15, -0.15, 0.15);
    }

    function styleBikeOverlay(now) {
      if (!overlay) return;
      if (
        state.turn >= 0.92 ||
        state.phase === "court" ||
        state.phase === "door" ||
        state.phase === "basement"
      ) {
        overlay.style.display = "none";
        return;
      }
      const width = Math.round(
        Math.min((window.innerWidth || 800) * 0.82, 1320),
      );
      // World-anchor the bike: it sits at the camera's parked heading (yaw 0),
      // so as the view turns away (state.yaw) or glances aside (lookYaw) the
      // handlebars slide off toward the screen edge and stay put in the world
      // — reading as climbing off the bike — instead of tracking the camera.
      const viewYaw = clamp(state.yaw + state.lookYaw, -1.45, 1.45);
      let shiftX = -Math.tan(viewYaw) * (window.innerHeight || 600) * 0.5;
      shiftX = clamp(shiftX, -width * 1.5, width * 1.5);
      const idle = Math.sin(now * 0.0022) * 1.5;
      const opacity = clamp(1.0 - state.turn * 1.05, 0, 1);
      const blinkShade = 1 - blinkInLevel(now);
      overlay.style.cssText =
        "position:fixed;left:50%;bottom:0;z-index:600;pointer-events:none;" +
        "user-select:none;-webkit-user-drag:none;display:block;" +
        "width:" +
        width +
        "px;opacity:" +
        opacity.toFixed(3) +
        ";filter:brightness(" +
        blinkShade.toFixed(3) +
        ");" +
        "transform:translateX(calc(-50% + " +
        shiftX.toFixed(1) +
        "px)) translateY(" +
        idle.toFixed(1) +
        "px);";
    }

    function syncPhaseToPosition() {
      if (state.x < -23.55) state.phase = "basement";
      else if (state.x < -18.25) state.phase = "door";
      else state.phase = "court";
    }

    function updateMovement(dt) {
      if (state.phase === "turning") {
        state.turn = Math.min(1, state.turn + dt / 0.82);
        state.yaw = -Math.PI * 0.5 * smooth01(state.turn);
        if (state.turn >= 1) {
          state.phase = "court";
          state.yaw = -Math.PI * 0.5;
          syncNavigation();
        }
      }

      if (state.turning180) {
        state.turn180Progress = Math.min(1, state.turn180Progress + dt / 0.82);
        state.yaw =
          state.turn180Start +
          (state.turn180Target - state.turn180Start) *
            smooth01(state.turn180Progress);
        if (state.turn180Progress >= 1) {
          state.yaw = Math.atan2(
            Math.sin(state.turn180Target),
            Math.cos(state.turn180Target),
          );
          state.turning180 = false;
          // Landed on the corridor axis (from a 90° side turn or a 180):
          // keep routeDir in sync with where the camera actually faces.
          const alongX = Math.sin(state.yaw);
          if (Math.abs(alongX) > 0.5) state.routeDir = alongX > 0 ? 1 : -1;
          if (state.routeDir > 0 && state.x >= HARLEY_STOP_X) {
            beginTurnAround(state.lastTurnSign);
          }
        }
      }

      const moving = state.forwardHeld && canAdvance();
      state.walking += ((moving ? 1 : 0) - state.walking) * Math.min(1, dt * 9);
      if (moving) {
        let nextX = state.x + state.routeDir * 2.25 * dt;
        if (state.routeDir < 0) {
          if (nextX < -22.15 && state.doorOpen < 0.78) nextX = -22.15;
          if (nextX < -34.6 && state.liftOpen < 0.72) nextX = -34.6;
        }
        nextX = clamp(
          nextX,
          ELEVATOR_ENTRY_X,
          state.routeDir < 0 ? 0 : HARLEY_STOP_X,
        );
        state.distance += Math.abs(nextX - state.x);
        state.x = nextX;
        syncPhaseToPosition();

        if (state.routeDir < 0 && state.x <= ELEVATOR_ENTRY_X) {
          state.phase = "elevator";
          state.elevatorTurn = 0;
          state.forwardHeld = false;
        } else if (state.routeDir > 0 && state.x >= HARLEY_STOP_X) {
          state.forwardHeld = false;
          beginTurnAround(state.lastTurnSign);
        }
      }
      // Inside the car: turn the rider 180° to face back out through the doors.
      if (state.phase === "elevator") {
        state.elevatorTurn = Math.min(1, state.elevatorTurn + dt / 0.95);
        state.yaw = -Math.PI * 0.5 + Math.PI * smooth01(state.elevatorTurn);
        if (state.elevatorTurn >= 1) {
          state.yaw = Math.PI * 0.5;
          state.phase = "ascend"; // doors shut, ride up, hand into the apartment
        }
      }
      if (state.phase === "ascend") {
        state.ascend += dt;
        // doors shut (0-0.8s) -> ride up -> doors reopen at the top (2.4-3.2s)
        if (state.ascend < 2.4) {
          state.liftOpen = clamp(1 - state.ascend / 0.8, 0, 1);
        } else {
          state.liftOpen = clamp((state.ascend - 2.4) / 0.8, 0, 1);
        }
        // Behind the shut doors, swap to the upper hallway and aim out of the car.
        if (state.ascend > 1.2 && !state.topFloor) {
          state.topFloor = 1;
          state.x = ELEVATOR_ENTRY_X;
          state.y = 1.52; // drop the camera slightly for the upper hallway
          state.z = 4.25;
          state.yaw = Math.PI * 0.5; // face +X, out the doors
          state.routeDir = 1;
          state.forwardHeld = false;
        }
        // Doors open at the top — hand control to the walk down the hallway.
        if (state.ascend > 3.2) {
          state.phase = "hallway";
          state.liftOpen = 1;
        }
      }

      if (state.phase === "hallway") {
        // Guided track (hold to advance): out of the elevator, curve right
        // across the landing, then face the adjacent-wall front door.
        const moving = state.forwardHeld && state.hallT < 1;
        state.walking += ((moving ? 1 : 0) - state.walking) * Math.min(1, dt * 9);
        if (moving) state.hallT = Math.min(1, state.hallT + dt / 5.0);
        const t = state.hallT;
        // The door starts opening only after the fade is already underway
        // (fade begins at t=0.70) — the inside is never really shown.
        const hallDoorTarget = clamp((t - 0.78) / 0.22, 0, 1);
        state.hallDoorOpen +=
          (hallDoorTarget - state.hallDoorOpen) * Math.min(1, dt * 4.2);
        if (t < 0.52) {
          const a = smooth01(t / 0.52);
          state.x = -36.4 + a * 3.05;
          state.z = 4.25;
          state.yaw = Math.PI * 0.5;
        } else if (t < 0.68) {
          const a = smooth01((t - 0.52) / 0.16);
          state.x = -33.35 + a * 1.0;
          state.z = 4.25 - a * 0.62;
          state.yaw = Math.PI * 0.5 + a * (Math.PI * 0.5);
        } else {
          const a = smooth01((t - 0.68) / 0.32);
          state.x = -32.35;
          state.z = 3.63 + a * (2.18 - 3.63);
          state.yaw = Math.PI;
        }
        state.distance = t * 9.0;
        state.liftOpen = 1;
        // Fade to black as the rider reaches the door — the fade leads the
        // door swing, so what's behind it never has to hold up on screen.
        if (t >= 0.7) state.fade = Math.min(1, state.fade + dt / 1.1);
        if (state.fade >= 1 && !state.handedOff) {
          state.handedOff = true;
          if (typeof window.__enterApartmentFromAlley === "function") {
            // Land in engine1 facing the room_right (mode-right.js) POV.
            window.__enterApartmentFromAlley({ pov: "right" });
          } else if (typeof window.stopModeAlley === "function") {
            window.stopModeAlley();
          }
        }
      } else {
        state.hallDoorOpen += (0 - state.hallDoorOpen) * Math.min(1, dt * 4.2);
      }

      // Diagonal approach: the alley path runs down the centre, then cuts LEFT
      // to the basement door (now on the left of the back wall), then straightens
      // to the corridor centre on the way to the elevator.
      if (
        state.phase === "court" ||
        state.phase === "door" ||
        state.phase === "basement"
      ) {
        let targetZ = 4.25;
        if (state.x <= -19.5 && state.x > -22.5) {
          // cut LEFT to the door lane and FINISH before the back-wall opening
          targetZ = 4.25 + (2.8 - 4.25) * smooth01((-19.5 - state.x) / 3.0);
        } else if (state.x <= -22.5 && state.x > -26.5) {
          targetZ = 2.8 + (4.25 - 2.8) * smooth01((-22.5 - state.x) / 3.0); // straighten inside
        }
        state.z += (targetZ - state.z) * Math.min(1, dt * 9);
      }

      const doorTarget = state.x < -18.25 ? 1 : 0;
      state.doorOpen += (doorTarget - state.doorOpen) * Math.min(1, dt * 1.65);
      // Elevator doors slide open as the rider arrives at the car (x ~ -28..-31).
      // Skipped during the ascent, which drives the doors shut itself.
      if (state.phase !== "ascend" && state.phase !== "hallway") {
        const liftTarget = clamp((-28.0 - state.x) / 3.0, 0, 1);
        state.liftOpen += (liftTarget - state.liftOpen) * Math.min(1, dt * 1.4);
      }
      state.lookYaw +=
        (state.lookYawTarget - state.lookYaw) * Math.min(1, dt * 7.5);
      state.lookPitch +=
        (state.lookPitchTarget - state.lookPitch) * Math.min(1, dt * 7.5);
      // Hold forward while facing the basement CRT: dolly up to the screen
      // (tutorial-TV feel — slow push in, quick settle back on release).
      const tvZoomTarget =
        inTvZone() && facingTv() && state.forwardHeld ? 1 : 0;
      state.tvZoom +=
        (tvZoomTarget - state.tvZoom) *
        Math.min(1, dt * (tvZoomTarget > state.tvZoom ? 1.05 : 5.4));
      if (Math.abs(state.tvZoom - tvZoomTarget) < 5e-4)
        state.tvZoom = tvZoomTarget;
      syncNavigation();
    }

    // Lightning: a strike every 7-18 s, shaped as a quick flicker, a dimmer
    // after-flicker, then the main flash decaying over about half a second.
    let nextStrike = performance.now() + 3000 + 5000 * Math.random();
    let strikeStart = -1e9;
    function lightningPulse(t, at, peak, decay) {
      return t >= at ? peak * Math.exp(-(t - at) / decay) : 0;
    }
    function lightningLevel(now) {
      if (now >= nextStrike) {
        strikeStart = now;
        nextStrike = now + 7000 + 11000 * Math.random();
      }
      const t = (now - strikeStart) * 0.001;
      if (t < 0 || t > 1.8) return 0;
      return Math.min(
        1,
        Math.max(
          lightningPulse(t, 0.0, 0.55, 0.045),
          lightningPulse(t, 0.13, 0.35, 0.04),
          lightningPulse(t, 0.24, 0.85, 0.30),
        ),
      );
    }

    // Arriving from the desert mid-blink: the frame is already black, so
    // finish the same blink the engines use (Z2 timing: black to 80 ms, then
    // open linearly over 120 ms).
    const blinkInStart = options.blinkIn ? performance.now() : -1;
    function blinkInLevel(now) {
      if (blinkInStart < 0) return 0;
      const t = now - blinkInStart;
      if (t < 80) return 1;
      if (t < 200) return 1 - (t - 80) / 120;
      return 0;
    }

    function frame(now) {
      if (destroyed) return;
      const dt = Math.min(0.05, Math.max(0, (now - previousTime) * 0.001));
      previousTime = now;
      updateMovement(dt);
      if (destroyed) return; // handed off to engine.js apartment — stop drawing
      styleBikeOverlay(now);
      resize();

      let rumble = 0;
      if (state.phase === "ascend") {
        const up =
          clamp((state.ascend - 0.6) / 0.4, 0, 1) *
          (1 - clamp((state.ascend - 2.2) / 0.4, 0, 1));
        rumble = Math.sin(now * 0.045) * 0.014 * up;
      }
      const tvT = smooth01(clamp(state.tvZoom, 0, 1));
      const cameraYaw = state.yaw + state.lookYaw * (1 - 0.92 * tvT);
      const cameraPitch =
        (state.pitch + state.lookPitch + rumble * 0.5) *
        (1 - tvT);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, (now - startTime) * 0.001);
      gl.uniform3f(
        uniforms.eye,
        state.x + (TV_FACE_X - state.x) * tvT,
        state.y + rumble + (TV_SCREEN_Y - state.y) * tvT,
        state.z + (TV_STOP_Z - state.z) * tvT,
      );
      gl.uniform1f(uniforms.yaw, cameraYaw);
      gl.uniform1f(uniforms.pitch, cameraPitch);
      gl.uniform1f(uniforms.focal, 1.5 + (3.3 - 1.5) * tvT);
      gl.uniform1f(uniforms.doorOpen, smooth01(state.doorOpen));
      gl.uniform1f(uniforms.hallDoorOpen, smooth01(state.hallDoorOpen));
      gl.uniform1f(uniforms.walk, state.distance);
      gl.uniform1f(uniforms.liftOpen, smooth01(state.liftOpen));
      gl.uniform1f(uniforms.topFloor, state.topFloor);
      gl.uniform1f(uniforms.fade, Math.max(state.fade, blinkInLevel(now)));
      gl.uniform1f(uniforms.lightning, lightningLevel(now));

      if (tvVideoReady && tvVideo && tvVideo.readyState >= 2) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, tvScreenTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        if (tvVideoAllocated) {
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            tvVideo,
          );
        } else {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            tvVideo,
          );
          tvVideoAllocated = true;
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, harleyTexture);
      gl.uniform1i(uniforms.harleyTex, 0);
      gl.uniform1f(uniforms.harleyReady, harleyReady ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tvFrontTexture);
      gl.uniform1i(uniforms.tvFrontTex, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tvLeftTexture);
      gl.uniform1i(uniforms.tvLeftTex, 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, tvRightTexture);
      gl.uniform1i(uniforms.tvRightTex, 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, tvScreenTexture);
      gl.uniform1i(uniforms.tvScreenTex, 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, mobileRightTexture);
      gl.uniform1i(uniforms.mobileRightTex, 5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame);
    }

    function seek(target) {
      if (target === "turn" || target === "court" || target === 1) {
        state.phase = "court";
        state.turn = 1;
        state.yaw = -Math.PI * 0.5;
        state.x = 0;
      } else if (target === "door" || target === 2) {
        state.phase = "door";
        state.turn = 1;
        state.yaw = -Math.PI * 0.5;
        state.x = -19.2;
        state.doorOpen = 0.55;
      } else if (target === "basement" || target === 3) {
        state.phase = "basement";
        state.turn = 1;
        state.yaw = -Math.PI * 0.5;
        state.x = -31.0;
        state.doorOpen = 1;
      } else {
        state.phase = "parked";
        state.turn = 0;
        state.yaw = 0;
        state.x = 0;
        state.doorOpen = 0;
      }
      state.liftOpen = state.phase === "basement" ? 1 : 0;
      state.elevatorTurn = 0;
      state.ascend = 0;
      state.topFloor = 0;
      state.hallT = 0;
      state.hallDoorOpen = 0;
      state.fade = 0;
      state.handedOff = false;
      state.routeDir = -1;
      state.turning180 = false;
      state.turn180Start = state.yaw;
      state.turn180Target = state.yaw;
      state.turn180Progress = 0;
      state.lastTurnSign = 1;
      state.forwardHeld = false;
      state.tvZoom = 0;
      state.distance = Math.max(0, -state.x);
      syncNavigation();
      return handle;
    }

    const handle = {
      getState: function () {
        return {
          phase: state.phase,
          x: state.x,
          y: state.y,
          z: state.z,
          yaw: state.yaw,
          turn: state.turn,
          doorOpen: state.doorOpen,
          routeDir: state.routeDir,
          turning180: state.turning180,
          forwardHeld: state.forwardHeld,
          nav: syncNavigation(),
        };
      },
      seek: seek,
      turnLeft: beginLeftTurn,
      turnAround: beginTurnAround,
      setWalkHeld: function (held) {
        state.forwardHeld =
          !!held &&
          (canAdvance() || (state.phase === "hallway" && state.hallT < 1));
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("keyup", onKeyUp, true);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("pointerup", releasePointer);
        window.removeEventListener("pointercancel", releasePointer);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointerup", releasePointer);
        canvas.removeEventListener("pointercancel", releasePointer);
        canvas.removeEventListener("lostpointercapture", releasePointer);
        try {
          harleyImage.onload = null;
          harleyImage.onerror = null;
          for (let i = 0; i < tvImages.length; i++) {
            tvImages[i].onload = null;
            tvImages[i].onerror = null;
          }
          if (tvVideo) {
            tvVideo.pause();
            tvVideo.removeAttribute("src");
            tvVideo.load();
            if (tvVideo.parentNode) tvVideo.parentNode.removeChild(tvVideo);
          }
          if (harleyTexture) gl.deleteTexture(harleyTexture);
          gl.deleteTexture(tvFrontTexture);
          gl.deleteTexture(tvLeftTexture);
          gl.deleteTexture(tvRightTexture);
          gl.deleteTexture(tvScreenTexture);
          gl.deleteTexture(mobileRightTexture);
          gl.deleteVertexArray(vao);
          gl.deleteProgram(program);
          gl.deleteShader(built.vertex);
          gl.deleteShader(built.fragment);
        } catch (error) {}
        if (overlay) overlay.style.display = "none";
        window.__modeAlleyActive = false;
        window.__modeAlleyNav = null;
      },
    };

    window.addEventListener("keydown", onKeyDown, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keyup", onKeyUp, {
      capture: true,
      passive: false,
    });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);
    canvas.addEventListener("lostpointercapture", releasePointer);

    window.__modeAlleyActive = true;
    window.__modeAlleyScene = handle;
    syncNavigation();
    resize();
    styleBikeOverlay(previousTime);
    rafId = requestAnimationFrame(frame);

    if (options.phase) seek(options.phase);
    return handle;
  };

  window.stopModeAlley = function () {
    if (
      window.__modeAlleyScene &&
      typeof window.__modeAlleyScene.destroy === "function"
    ) {
      try {
        window.__modeAlleyScene.destroy();
      } catch (error) {}
    }
    window.__modeAlleyScene = null;
    window.__modeAlleyActive = false;
    window.__modeAlleyNav = null;
  };

  window.__alleyDebugGoto = function (phase) {
    const scene = window.startModeAlley();
    if (scene && typeof scene.seek === "function")
      scene.seek(phase || "parked");
    return scene;
  };
})();
