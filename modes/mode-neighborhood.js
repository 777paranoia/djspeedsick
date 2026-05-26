((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (GLSL.modules.neighborhood = `

float nbCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float nbSphere(vec3 p, float r) {
  return length(p) - r;
}

void nbTake(inout vec2 res, float d, float id) {
  if(d < res.x) res = vec2(d, id);
}

float nbRoofSlab(vec3 p, vec3 c, float side, float zHalf) {
  vec3 q = p - c;
  q.xy *= rot(side * 0.62);
  return sdBox(q, vec3(1.05, 0.14, zHalf));
}

void nbHouse(inout vec2 res, vec3 p, vec3 c, float w, float h, float d) {
  nbTake(res, sdBox(p - (c + vec3(0.0, h * 0.5, 0.0)), vec3(w, h * 0.5, d)), 2.0);
  nbTake(res, nbRoofSlab(p, c + vec3(-w * 0.44, h + 0.30, 0.0), 1.0, d + 0.20), 3.0);
  nbTake(res, nbRoofSlab(p, c + vec3( w * 0.44, h + 0.30, 0.0), -1.0, d + 0.20), 3.0);
  nbTake(res, sdBox(p - (c + vec3(0.0, h + 0.18, 0.0)), vec3(0.13, 0.24, d + 0.26)), 3.0);
}

void nbCar(inout vec2 res, vec3 p, vec3 c, float a, vec3 tint) {
  vec3 q = p - c;
  q.xz *= rot(a);
  nbTake(res, sdBox(q - vec3(0.0, 0.36, 0.0), vec3(0.55, 0.26, 0.95)), 5.0);
  nbTake(res, sdBox(q - vec3(0.0, 0.68, -0.05), vec3(0.42, 0.22, 0.46)), 5.0);
}

void nbTree(inout vec2 res, vec3 p, vec3 c, float s) {
  nbTake(res, nbCapsule(p, c + vec3(0.0, 0.0, 0.0), c + vec3(0.0, 1.3 * s, 0.0), 0.11 * s), 7.0);
  vec3 q = p - (c + vec3(0.0, 1.75 * s, 0.0));
  float leaves = min(nbSphere(q, 0.88 * s), min(nbSphere(q - vec3(0.42 * s, 0.08 * s, 0.18 * s), 0.58 * s), nbSphere(q - vec3(-0.38 * s, 0.00, -0.26 * s), 0.62 * s)));
  nbTake(res, leaves, 6.0);
}

void nbStreetLight(inout vec2 res, vec3 p, vec3 c, float armSide) {
  nbTake(res, nbCapsule(p, c, c + vec3(0.0, 3.8, 0.0), 0.035), 7.0);
  nbTake(res, nbCapsule(p, c + vec3(0.0, 3.55, 0.0), c + vec3(armSide * 0.78, 3.72, 0.12), 0.03), 7.0);
  nbTake(res, nbSphere(p - (c + vec3(armSide * 0.86, 3.66, 0.15)), 0.13), 8.0);
}

vec2 nbMap(vec3 p) {
  vec2 res = vec2(p.y, 1.0);

  nbHouse(res, p, vec3(4.7, 0.0, 2.8), 1.20, 2.25, 1.30);
  nbHouse(res, p, vec3(5.5, 0.0, 7.2), 1.35, 2.50, 1.55);
  nbHouse(res, p, vec3(6.5, 0.0, 11.7), 1.25, 2.35, 1.35);
  nbHouse(res, p, vec3(7.4, 0.0, 16.2), 1.50, 2.55, 1.55);

  nbTake(res, sdBox(p - vec3(-6.2, 3.35, 9.4), vec3(7.4, 0.28, 1.15)), 4.0);
  nbTake(res, sdBox(p - vec3(-6.2, 3.05, 9.4), vec3(7.7, 0.14, 1.35)), 4.0);
  for(float i = 0.0; i < 5.0; i += 1.0) {
    nbTake(res, sdBox(p - vec3(-11.4 + i * 2.2, 2.35, 9.4), vec3(0.12, 0.80, 1.18)), 4.0);
  }

  nbCar(res, p, vec3(2.35, 0.0, 1.0), 0.05, vec3(1.0, 1.0, 1.0));
  nbCar(res, p, vec3(2.15, 0.0, 4.3), 0.02, vec3(0.9, 0.1, 0.1));
  nbCar(res, p, vec3(2.25, 0.0, 7.0), 0.03, vec3(0.05, 0.06, 0.08));
  nbCar(res, p, vec3(2.40, 0.0, 9.8), 0.05, vec3(0.06, 0.07, 0.08));
  nbCar(res, p, vec3(2.30, 0.0, 13.0), 0.03, vec3(0.08, 0.09, 0.10));
  nbCar(res, p, vec3(-0.35, 0.0, 6.1), 3.08, vec3(0.05, 0.07, 0.09));

  nbTree(res, p, vec3(-3.2, 0.0, 1.4), 1.1);
  nbTree(res, p, vec3(-3.8, 0.0, 4.7), 1.3);
  nbTree(res, p, vec3(-4.2, 0.0, 7.8), 1.25);
  nbTree(res, p, vec3(2.55, 0.0, 6.0), 1.0);
  nbTree(res, p, vec3(3.2, 0.0, 13.4), 1.2);

  nbStreetLight(res, p, vec3(-2.15, 0.0, 0.6), 1.0);
  nbStreetLight(res, p, vec3(0.15, 0.0, 5.8), -1.0);
  nbStreetLight(res, p, vec3(-2.00, 0.0, 10.4), 1.0);
  nbStreetLight(res, p, vec3(-0.20, 0.0, 15.8), -1.0);
  nbStreetLight(res, p, vec3(-6.2, 3.60, 8.4), 1.0);
  nbStreetLight(res, p, vec3(-8.6, 3.60, 9.0), 1.0);
  nbStreetLight(res, p, vec3(-3.6, 3.60, 8.8), 1.0);

  nbTake(res, sdBox(p - vec3(0.95, 2.15, 6.0), vec3(0.78, 0.18, 0.04)), 9.0);
  nbTake(res, nbCapsule(p, vec3(0.95, 0.0, 6.0), vec3(0.95, 2.0, 6.0), 0.035), 7.0);
  return res;
}

vec3 nbNormal(vec3 p) {
  vec2 e = vec2(0.006, 0.0);
  return normalize(vec3(
    nbMap(p + e.xyy).x - nbMap(p - e.xyy).x,
    nbMap(p + e.yxy).x - nbMap(p - e.yxy).x,
    nbMap(p + e.yyx).x - nbMap(p - e.yyx).x));
}

vec3 nbCamera(vec2 uv, out vec3 ro) {
  ro = vec3(0.3, 7.6, -7.4);
  vec3 ta = vec3(1.0, 0.55, 8.5);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ww));
  uv.x *= 1.05;
  uv.y += 0.06;
  return normalize(uu * uv.x + vv * uv.y + ww * 1.25);
}

float nbWindowMask(vec3 p, vec3 n) {
  vec2 uv = abs(n.x) > abs(n.z) ? p.zy : p.xy;
  vec2 cell = floor(uv * vec2(1.35, 1.05));
  vec2 f = abs(fract(uv * vec2(1.35, 1.05)) - 0.5);
  float pane = smoothstep(0.27, 0.22, f.x) * smoothstep(0.32, 0.25, f.y);
  float warm = step(0.45, hash2(cell + vec2(2.7, 9.1)));
  float floorGate = smoothstep(0.45, 0.62, uv.y) * smoothstep(2.45, 2.25, uv.y);
  return pane * warm * floorGate;
}

float nbRoadMask(vec3 p) {
  float main = smoothstep(2.65, 2.35, abs(p.x + 0.65));
  float cross = smoothstep(2.10, 1.75, abs(p.z + 0.40));
  return max(main, cross);
}

float nbCrosswalk(vec3 p) {
  float frontBand = smoothstep(0.68, 0.55, abs(p.z + 0.95)) * smoothstep(3.2, 2.6, abs(p.x + 0.65));
  float frontStripe = step(fract((p.x + 4.8) * 0.72), 0.48);
  float sideBand = smoothstep(0.65, 0.50, abs(p.x + 3.00)) * smoothstep(1.8, 1.25, abs(p.z + 0.35));
  float sideStripe = step(fract((p.z + 2.4) * 0.78), 0.48);
  return max(frontBand * frontStripe, sideBand * sideStripe);
}

vec3 nbCarPaint(vec3 p) {
  float k = hash1(floor(p.z * 0.73) + floor(p.x * 1.9) * 4.7);
  vec3 a = vec3(0.08, 0.09, 0.10);
  vec3 b = vec3(0.78, 0.76, 0.70);
  vec3 c = vec3(0.48, 0.06, 0.035);
  return mix(mix(a, b, step(0.63, k)), c, step(0.82, k));
}

vec3 nbShade(vec3 p, vec3 n, vec3 rd, float id) {
  vec3 col = vec3(0.05, 0.055, 0.055);
  if(id < 1.5) {
    float road = nbRoadMask(p);
    float cracks = smoothstep(0.78, 1.0, fbm(p.xz * 5.0)) * 0.055;
    col = mix(vec3(0.05, 0.075, 0.042), vec3(0.105, 0.105, 0.090), road);
    col += cracks;
    col = mix(col, vec3(0.72, 0.70, 0.62), nbCrosswalk(p) * road);
    float curb = smoothstep(0.08, 0.0, abs(abs(p.x + 0.65) - 2.68)) * smoothstep(1.2, 3.0, p.z);
    col = mix(col, vec3(0.48, 0.47, 0.39), curb);
  } else if(id < 2.5) {
    col = vec3(0.48, 0.41, 0.27) + 0.06 * fbm(p.xz * 3.0 + p.yy);
    float w = nbWindowMask(p, n);
    col = mix(col, vec3(1.0, 0.78, 0.22) * 2.2, w);
  } else if(id < 3.5) {
    col = vec3(0.06, 0.065, 0.075);
    float panels = step(0.55, fract((abs(n.x) > 0.4 ? p.z : p.x) * 1.3));
    col += panels * 0.025;
    float solar = smoothstep(0.18, 0.14, abs(fract(p.z * 0.9) - 0.5)) * smoothstep(0.35, 0.30, abs(fract(p.x * 1.6) - 0.5));
    col = mix(col, vec3(0.06, 0.10, 0.14), solar * 0.45);
  } else if(id < 4.5) {
    col = vec3(0.26, 0.25, 0.20);
  } else if(id < 5.5) {
    col = nbCarPaint(p);
    float glass = smoothstep(0.13, 0.0, abs(n.y - 0.6));
    col = mix(col, vec3(0.025, 0.04, 0.055), glass * 0.45);
  } else if(id < 6.5) {
    col = vec3(0.045, 0.16, 0.055) + fbm(p.xz * 2.4 + p.yy) * vec3(0.03, 0.09, 0.025);
  } else if(id < 7.5) {
    col = vec3(0.035, 0.033, 0.030);
  } else if(id < 8.5) {
    col = vec3(1.0, 0.88, 0.42) * 5.0;
  } else {
    col = vec3(0.02, 0.20, 0.15) * 1.5;
  }

  vec3 moon = normalize(vec3(-0.4, 0.7, -0.5));
  float diff = max(dot(n, moon), 0.0);
  col *= vec3(0.20, 0.24, 0.32) + diff * vec3(0.18, 0.20, 0.23);

  vec3 lp1 = vec3(-1.29, 3.66, 0.75);
  vec3 lp2 = vec3(-0.63, 3.66, 5.95);
  vec3 lp3 = vec3(-1.14, 3.66, 10.55);
  vec3 lp4 = vec3(-1.06, 3.66, 15.95);
  vec3 lampCol = vec3(1.0, 0.84, 0.35);
  float l1 = max(dot(n, normalize(lp1 - p)), 0.0) / (0.8 + dot(lp1 - p, lp1 - p) * 0.16);
  float l2 = max(dot(n, normalize(lp2 - p)), 0.0) / (0.8 + dot(lp2 - p, lp2 - p) * 0.16);
  float l3 = max(dot(n, normalize(lp3 - p)), 0.0) / (0.8 + dot(lp3 - p, lp3 - p) * 0.16);
  float l4 = max(dot(n, normalize(lp4 - p)), 0.0) / (0.8 + dot(lp4 - p, lp4 - p) * 0.16);
  col += lampCol * (l1 + l2 + l3 + l4) * 1.25;
  return col;
}

float nbRayGlow(vec3 ro, vec3 rd, vec3 lp, float size) {
  vec3 v = lp - ro;
  float h = max(dot(v, rd), 0.0);
  float d = length(v - rd * h);
  return exp(-d * size) * smoothstep(0.0, 5.0, h);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  uv += (fbm(uv * 9.0 + u_time * 0.02) - 0.5) * 0.010;

  vec3 ro;
  vec3 rd = nbCamera(uv, ro);
  float t = 0.0;
  vec2 hit = vec2(0.0);
  for(int i = 0; i < 118; i++) {
    vec3 p = ro + rd * t;
    hit = nbMap(p);
    if(hit.x < 0.002 || t > 80.0) break;
    t += hit.x * 0.72;
  }

  vec3 sky = mix(vec3(0.015, 0.025, 0.047), vec3(0.16, 0.18, 0.20), smoothstep(-0.25, 0.85, rd.y));
  sky += vec3(0.20, 0.23, 0.30) * exp(-max(rd.y, 0.0) * 5.0) * 0.22;
  vec3 col = sky;

  if(t < 80.0) {
    vec3 p = ro + rd * t;
    vec3 n = nbNormal(p);
    col = nbShade(p, n, rd, hit.y);
    float fog = 1.0 - exp(-0.018 * t * t);
    col = mix(col, sky + vec3(0.16, 0.15, 0.10) * 0.15, fog);
  }

  vec3 glowCol = vec3(1.0, 0.86, 0.38);
  float glow = 0.0;
  glow += nbRayGlow(ro, rd, vec3(-1.29, 3.66, 0.75), 4.2);
  glow += nbRayGlow(ro, rd, vec3(-0.63, 3.66, 5.95), 4.2);
  glow += nbRayGlow(ro, rd, vec3(-1.14, 3.66, 10.55), 3.6);
  glow += nbRayGlow(ro, rd, vec3(-1.06, 3.66, 15.95), 3.2);
  glow += nbRayGlow(ro, rd, vec3(-5.34, 7.26, 8.55), 3.7);
  glow += nbRayGlow(ro, rd, vec3(-7.74, 7.26, 9.15), 3.7);
  glow += nbRayGlow(ro, rd, vec3(-2.74, 7.26, 8.95), 3.7);
  col += glowCol * glow * 0.75;

  float haze = worldRain(vec2(atan(rd.z, rd.x) * 0.22, rd.y * 0.75), u_time * 0.12) * 0.13;
  col += haze * vec3(0.75, 0.82, 0.95);
  col += (hash2(gl_FragCoord.xy + floor(u_time * 16.0)) - 0.5) * 0.045;
  col *= 1.0 - smoothstep(0.45, 1.05, length(uv)) * 0.35;
  col = pow(max(col, 0.0), vec3(0.82));
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`));
