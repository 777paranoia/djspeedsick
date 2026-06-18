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
uniform float u_doorOpen;
uniform float u_walk;
uniform float u_liftOpen;
uniform sampler2D u_harleyTex;
uniform float u_harleyReady;
uniform sampler2D u_tvFrontTex;
uniform sampler2D u_tvLeftTex;
uniform sampler2D u_tvRightTex;
uniform sampler2D u_tvScreenTex;

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

vec2 mapScene(vec3 p) {
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
  float basement = sdBox(p - vec3(-30.0, 2.30, 4.25), vec3(5.8, 2.15, 5.45));
  float doorCut = sdBox(p - vec3(-23.75, 1.72, 4.25), vec3(1.35, 1.72, 1.38));
  float liftCut = sdBox(p - vec3(-37.45, 1.82, 4.25), vec3(2.05, 1.82, 1.70));
  rear = max(rear, -min(basement, min(doorCut, liftCut)));
  hit = closer(hit, vec2(rear, 2.0));

  // Hinged steel service door. The opening exists in the building SDF above;
  // this slab is the only thing barring it and rotates inward as approached.
  vec3 dq = p - vec3(-22.87, 0.0, 2.87);
  dq.xz = rot(-u_doorOpen * 1.42) * dq.xz;
  float door = sdRoundBox(dq - vec3(0.0, 1.72, 1.38), vec3(0.105, 1.72, 1.38), 0.035);
  hit = closer(hit, vec2(door, 4.0));

  // Recessed elevator car carved into the rear mass: header, jambs, back and
  // side walls, ceiling — plus front returns that wrap the side walls around
  // the front corners so the doorway is framed and the panel has a surface.
  float lift = 1e5;
  lift = min(lift, sdBox(p - vec3(-35.52, 3.69, 4.25), vec3(0.16, 0.13, 1.95)));   // header above doors
  lift = min(lift, sdBox(p - vec3(-35.42, 1.78, 1.78), vec3(0.10, 1.68, 0.52)));   // outer jamb (left)
  lift = min(lift, sdBox(p - vec3(-35.42, 1.78, 6.72), vec3(0.10, 1.68, 0.52)));   // outer jamb (right)
  lift = min(lift, sdBox(p - vec3(-39.38, 1.82, 4.25), vec3(0.12, 1.82, 1.70)));   // back wall
  lift = min(lift, sdBox(p - vec3(-37.45, 1.82, 2.54), vec3(1.95, 1.82, 0.10)));   // side wall (left)
  lift = min(lift, sdBox(p - vec3(-37.45, 1.82, 5.96), vec3(1.95, 1.82, 0.10)));   // side wall (right)
  lift = min(lift, sdBox(p - vec3(-37.45, 3.64, 4.25), vec3(1.95, 0.10, 1.70)));   // ceiling
  lift = min(lift, sdBox(p - vec3(-35.95, 1.80, 2.94), vec3(0.34, 1.78, 0.40)));   // front return (left)
  lift = min(lift, sdBox(p - vec3(-35.95, 1.80, 5.56), vec3(0.34, 1.78, 0.40)));   // front return (right)
  hit = closer(hit, vec2(lift, 5.0));

  // Sliding doors: two full-width steel panels meeting at the centerline.
  // Shut by default; u_liftOpen slides them apart toward the jambs as the
  // rider arrives at the car.
  float liftDoorL = mix(3.38, 2.20, u_liftOpen);
  float liftDoorR = mix(5.12, 6.30, u_liftOpen);
  float liftDoors = sdBox(p - vec3(-35.28, 1.80, liftDoorL), vec3(0.07, 1.78, 0.87));
  liftDoors = min(liftDoors, sdBox(p - vec3(-35.28, 1.80, liftDoorR), vec3(0.07, 1.78, 0.87)));
  hit = closer(hit, vec2(liftDoors, 5.0));

  // Interior control panel: mounted on the inner face of the front-left
  // return, beside the doors, facing into the car. Button rows are drawn in
  // surfaceMaterial (id 5) — this is the panel you use once inside.
  float liftPanel = sdRoundBox(p - vec3(-35.95, 1.30, 3.38), vec3(0.30, 0.42, 0.05), 0.02);
  hit = closer(hit, vec2(liftPanel, 5.0));

  // Exterior call plate: a small panel on the jamb beside the doors, facing
  // the approaching rider — visible while the doors are shut.
  float liftCall = sdRoundBox(p - vec3(-35.30, 1.35, 6.42), vec3(0.05, 0.20, 0.11), 0.015);
  hit = closer(hit, vec2(liftCall, 5.0));

  // The tutorial-room CRT, floor-standing halfway through the basement on
  // the rider's left. Its back sits against the negative-Z concrete wall.
  float basementTv = sdRoundBox(
    p - vec3(-29.60, 1.06, -0.758),
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
  services = min(services, sdCapsule(p, vec3(-22.68, 3.1, 0.78), vec3(-22.68, 3.1, 2.30), 0.10));
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

vec3 surfaceMaterial(vec3 p, vec3 n, float id, out vec3 emission) {
  emission = vec3(0.0);

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
    bool basementWall = p.x < -23.8 && p.y < 4.65 && p.z > -1.5 && p.z < 10.0;
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

  if (id > 10.5) {
    const float tvCenterX = -29.60;
    const float tvHalfWidth = 0.553;
    const float tvBackZ = -1.12;
    const float tvFrontZ = -0.396;
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
  vec3 rd = normalize(forward * 1.50 + right * uv.x + up * uv.y);

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
  if (found) {
    vec3 p = u_eye + rd * travel;
    vec3 n = sceneNormal(p);
    vec3 emission;
    vec3 material = surfaceMaterial(p, n, hit.y, emission);
    float ao = ambientOcclusion(p, n);
    float hemi = 0.10 + 0.11 * max(n.y, 0.0) + 0.035 * max(-n.y, 0.0);
    vec3 light = vec3(0.018, 0.026, 0.038) + vec3(0.09, 0.105, 0.12) * hemi;

    light += pointLight(p, n, vec3(4.25, 4.8, 10.0), vec3(1.0, 0.29, 0.07), 14.0);
    light += pointLight(p, n, vec3(-4.25, 4.7, 33.0), vec3(0.15, 0.42, 0.52), 12.0);
    light += pointLight(p, n, vec3(3.9, 5.1, 68.0), vec3(0.95, 0.22, 0.055), 17.0);
    light += pointLight(p, n, vec3(-20.9, 4.2, 4.25), vec3(1.0, 0.25, 0.055), 18.0);
    light += pointLight(p, n, vec3(-28.9, 4.1, 4.25), vec3(0.38, 0.65, 0.50), 21.0);
    light += pointLight(p, n, vec3(-29.6, 1.35, -0.18), vec3(0.16, 0.28, 0.34), 5.5);
    light += pointLight(p, n, vec3(-38.1, 3.35, 4.25), vec3(0.34, 0.58, 0.52), 16.0);

    vec3 viewDir = normalize(u_eye - p);
    vec3 keyDir = normalize(vec3(-0.35, 0.72, -0.24));
    float specular = pow(max(dot(reflect(-keyDir, n), viewDir), 0.0), hit.y < 1.5 ? 48.0 : 22.0);
    float wet = hit.y < 1.5 ? 0.22 : 0.035;
    col = material * light * ao + emission + specular * wet * vec3(0.34, 0.46, 0.53);

    bool inBasement = p.x < -23.5 || u_eye.x < -24.0;
    float fog = inBasement
      ? 1.0 - exp(-travel * 0.008)
      : 1.0 - exp(-travel * 0.030);
    vec3 fogColor = inBasement ? vec3(0.020, 0.030, 0.025) : vec3(0.008, 0.017, 0.025);
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

  // Fine rain catches the lamps without becoming a foreground curtain.
  vec2 rainUV = gl_FragCoord.xy / u_resolution.xy;
  vec2 rainCell = floor(vec2(rainUV.x * 260.0, rainUV.y * 82.0 - u_time * 9.0));
  vec2 rainF = fract(vec2(rainUV.x * 260.0, rainUV.y * 82.0 - u_time * 9.0));
  float rainSeed = hash21(rainCell);
  float rain = step(0.965, rainSeed) * smoothstep(0.06, 0.0, abs(rainF.x - rainSeed)) *
    smoothstep(0.85, 0.15, rainF.y);
  rain *= smoothstep(-0.45, 0.25, u_eye.x);
  col += rain * vec3(0.12, 0.18, 0.21);

  float vignette = 1.0 - 0.28 * dot(uv * vec2(0.72, 0.88), uv * vec2(0.72, 0.88));
  col *= clamp(vignette, 0.54, 1.0);
  col *= 0.98 + 0.02 * sin(u_time * 8.0 + u_walk * 2.0);
  col = 1.0 - exp(-max(col, 0.0) * 1.24);
  col = pow(col, vec3(0.92));
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
      doorOpen: gl.getUniformLocation(program, "u_doorOpen"),
      walk: gl.getUniformLocation(program, "u_walk"),
      liftOpen: gl.getUniformLocation(program, "u_liftOpen"),
      harleyTex: gl.getUniformLocation(program, "u_harleyTex"),
      harleyReady: gl.getUniformLocation(program, "u_harleyReady"),
      tvFrontTex: gl.getUniformLocation(program, "u_tvFrontTex"),
      tvLeftTex: gl.getUniformLocation(program, "u_tvLeftTex"),
      tvRightTex: gl.getUniformLocation(program, "u_tvRightTex"),
      tvScreenTex: gl.getUniformLocation(program, "u_tvScreenTex"),
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
      liftOpen: 0,
      elevatorTurn: 0,
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
    };

    const HARLEY_STOP_X = -1.8;
    const ELEVATOR_ENTRY_X = -36.4;

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

    const tvFrontTexture = loadTvTexture("tv-F.png");
    const tvLeftTexture = loadTvTexture("tv-L.png");
    const tvRightTexture = loadTvTexture("tv-R.png");
    const tvScreenTexture = makeFallbackTexture([5, 5, 5, 255]);
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
        forward: canAdvance(),
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
          else beginTurnAround(-1);
        }
        return;
      }
      if (rightKey(event) || backKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) beginTurnAround(1);
        return;
      }
      if (forwardKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        state.forwardHeld = canAdvance();
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
        state.phase === "parked" &&
        event.clientX < window.innerWidth * 0.45
      ) {
        event.preventDefault();
        beginLeftTurn();
        return;
      }
      if (canTurnAround() && !isWalkPointer(event)) {
        const edge = window.innerWidth * 0.3;
        if (event.clientX < edge || event.clientX > window.innerWidth - edge) {
          event.preventDefault();
          beginTurnAround(event.clientX < edge ? -1 : 1);
          return;
        }
      }
      if (!canWalk() || !isWalkPointer(event)) return;
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
      overlay.style.cssText =
        "position:fixed;left:50%;bottom:0;z-index:600;pointer-events:none;" +
        "user-select:none;-webkit-user-drag:none;display:block;" +
        "width:" +
        width +
        "px;opacity:" +
        opacity.toFixed(3) +
        ";" +
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
          state.routeDir = 1;
          state.phase = "basement";
        }
      }

      const doorTarget = state.x < -18.25 ? 1 : 0;
      state.doorOpen += (doorTarget - state.doorOpen) * Math.min(1, dt * 1.65);
      // Elevator doors slide open as the rider arrives at the car (x ~ -28..-31).
      const liftTarget = clamp((-28.0 - state.x) / 3.0, 0, 1);
      state.liftOpen += (liftTarget - state.liftOpen) * Math.min(1, dt * 1.4);
      state.lookYaw +=
        (state.lookYawTarget - state.lookYaw) * Math.min(1, dt * 7.5);
      state.lookPitch +=
        (state.lookPitchTarget - state.lookPitch) * Math.min(1, dt * 7.5);
      syncNavigation();
    }

    function frame(now) {
      if (destroyed) return;
      const dt = Math.min(0.05, Math.max(0, (now - previousTime) * 0.001));
      previousTime = now;
      updateMovement(dt);
      styleBikeOverlay(now);
      resize();

      const bob = Math.sin(state.distance * 7.4) * 0.01 * state.walking;
      const sway = Math.sin(state.distance * 3.7) * 0.003 * state.walking;
      const cameraYaw = state.yaw + state.lookYaw + sway;
      const cameraPitch = state.pitch + state.lookPitch + bob * 0.28;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, (now - startTime) * 0.001);
      gl.uniform3f(uniforms.eye, state.x, state.y + bob, state.z);
      gl.uniform1f(uniforms.yaw, cameraYaw);
      gl.uniform1f(uniforms.pitch, cameraPitch);
      gl.uniform1f(uniforms.doorOpen, smooth01(state.doorOpen));
      gl.uniform1f(uniforms.walk, state.distance);
      gl.uniform1f(uniforms.liftOpen, smooth01(state.liftOpen));

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
      state.routeDir = -1;
      state.turning180 = false;
      state.turn180Start = state.yaw;
      state.turn180Target = state.yaw;
      state.turn180Progress = 0;
      state.lastTurnSign = 1;
      state.forwardHeld = false;
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
        state.forwardHeld = !!held && canAdvance();
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
