((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (GLSL.modules["mode.desert"] = `
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 resolution;
uniform vec2 iResolution;

uniform float u_drive;
uniform float drive;
uniform float iDrive;

uniform vec2 u_look;
uniform vec2 look;
uniform vec2 iLook;

float sat(float x) {
  return clamp(x, 0.0, 1.0);
}

vec2 getResolution() {
  vec2 r = u_resolution;
  if (r.x <= 0.0 || r.y <= 0.0) r = resolution;
  if (r.x <= 0.0 || r.y <= 0.0) r = iResolution;
  if (r.x <= 0.0 || r.y <= 0.0) r = vec2(1920.0, 1080.0);
  return r;
}

float getDrive() {
  return max(max(u_drive, drive), iDrive);
}

vec2 getLook() {
  vec2 l = u_look;

  if (abs(l.x) + abs(l.y) < 0.0001) {
    l = look;
  }

  if (abs(l.x) + abs(l.y) < 0.0001) {
    l = iLook;
  }

  return clamp(l, vec2(-1.0), vec2(1.0));
}

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 74.7);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;

  v += noise(p) * a;
  p = mat2(1.62, -1.17, 1.17, 1.62) * p;
  a *= 0.50;

  v += noise(p) * a;
  p = mat2(1.54, -1.23, 1.23, 1.54) * p;
  a *= 0.50;

  v += noise(p) * a;
  p = mat2(1.71, -1.05, 1.05, 1.71) * p;
  a *= 0.50;

  v += noise(p) * a;
  p = mat2(1.66, -1.11, 1.11, 1.66) * p;
  a *= 0.50;

  v += noise(p) * a;

  return v;
}

float ridged(vec2 p) {
  float n = fbm(p);
  return 1.0 - abs(n * 2.0 - 1.0);
}

float roadMask(float x, float center, float halfWidth, float feather) {
  return 1.0 - smoothstep(halfWidth, halfWidth + feather, abs(x - center));
}

float mesaMask(vec2 uv, float horizon, float lift, float amp, float freq, float sharp) {
  float n = fbm(vec2(uv.x * freq, lift));
  float ridge = horizon + lift + n * amp + sin(uv.x * freq * 2.1 + lift * 41.0) * amp * 0.12;
  float m = 1.0 - smoothstep(ridge - sharp, ridge + sharp, uv.y);
  m *= smoothstep(horizon - 0.055, horizon + 0.010, uv.y);
  return m;
}

float thinCloud(vec2 p, vec2 pos, vec2 scale) {
  vec2 q = (p - pos) / scale;
  float d = dot(q, q);

  float c = exp(-d * 2.2);
  c += exp(-dot(q - vec2(0.55, 0.07), q - vec2(0.55, 0.07)) * 3.8) * 0.55;
  c += exp(-dot(q + vec2(0.48, 0.02), q + vec2(0.48, 0.02)) * 3.6) * 0.45;

  c *= 0.52 + fbm(p * 11.0) * 0.45;
  return smoothstep(0.30, 0.82, c);
}

vec3 tonemap(vec3 c) {
  c = max(c, vec3(0.0));
  c = c / (1.0 + c * 0.70);
  c = pow(c, vec3(0.92));
  return c;
}

void main() {
  vec2 res = getResolution();
  vec2 uv = gl_FragCoord.xy / res.xy;
  float aspect = res.x / res.y;

  vec2 cam = getLook();
  float driveDist = getDrive();

  float horizon = 0.535 + cam.y * 0.040;
  float skyT = sat((uv.y - horizon) / (1.0 - horizon));

  vec3 skyLow = vec3(0.62, 0.70, 0.78);
  vec3 skyMid = vec3(0.30, 0.53, 0.72);
  vec3 skyHigh = vec3(0.045, 0.30, 0.58);

  vec3 sky = mix(skyLow, skyMid, smoothstep(0.0, 0.58, skyT));
  sky = mix(sky, skyHigh, smoothstep(0.35, 1.0, skyT));

  float sunWash = smoothstep(0.18, 0.0, length((uv - vec2(0.03 - cam.x * 0.025, 0.78)) * vec2(0.70, 1.0)));
  sky += vec3(0.38, 0.30, 0.22) * sunWash * 0.18;

  vec2 skyP = vec2((uv.x - 0.5 + cam.x * 0.025) * aspect + 0.5, uv.y);
  float clouds = 0.0;
  clouds += thinCloud(skyP, vec2(0.20, 0.785), vec2(0.15, 0.035));
  clouds += thinCloud(skyP, vec2(0.38, 0.700), vec2(0.10, 0.025)) * 0.55;
  clouds += thinCloud(skyP, vec2(0.82, 0.748), vec2(0.09, 0.020)) * 0.35;
  sky = mix(sky, vec3(0.84, 0.86, 0.87), clouds * 0.14);

  vec3 col = sky;

  vec2 hillUV = vec2(uv.x + cam.x * 0.030, uv.y);

  float mesaFar = mesaMask(hillUV, horizon, 0.018, 0.016, 5.0, 0.0035);
  float mesaMid = mesaMask(hillUV, horizon, 0.006, 0.024, 6.8, 0.0040);
  float mesaNear = mesaMask(hillUV, horizon, -0.006, 0.032, 8.5, 0.0045);

  float strata = 0.5 + 0.5 * sin((uv.y - horizon) * 330.0 + fbm(vec2(uv.x * 12.0, 2.0)) * 5.0);

  col = mix(col, vec3(0.36, 0.31, 0.29) + strata * 0.020, mesaFar * 0.42);
  col = mix(col, vec3(0.50, 0.38, 0.31) + strata * 0.028, mesaMid * 0.55);
  col = mix(col, vec3(0.58, 0.42, 0.30) + strata * 0.038, mesaNear * 0.68);

  float groundMaskVal = 1.0 - smoothstep(horizon - 0.0015, horizon + 0.006, uv.y);

  float groundY = sat((horizon - uv.y) / horizon);
  float perspective = 1.0 / (groundY + 0.030);
  float screenX = uv.x + cam.x * 0.055;

  vec2 world;
  world.x = (screenX - 0.5) * perspective * aspect + cam.x * 0.12 * (1.0 - groundY);
  world.y = perspective + driveDist;

  vec2 warpA = vec2(
    fbm(world * vec2(0.060, 0.025) + vec2(11.7, 4.2)),
    fbm(world * vec2(0.050, 0.030) + vec2(31.1, 9.6))
  );

  vec2 warpB = vec2(
    fbm(world * vec2(0.180, 0.070) + warpA * 2.4),
    fbm(world * vec2(0.140, 0.055) - warpA * 1.9)
  );

  vec2 duneWorld = world + warpA * 7.0 + warpB * 2.5;

  float duneLong = fbm(duneWorld * vec2(0.26, 0.070));
  float duneSharp = ridged(duneWorld * vec2(0.52, 0.115));
  float duneRipple = ridged(vec2(duneWorld.x * 3.9 + fbm(duneWorld * 0.22) * 3.0, duneWorld.y * 0.82));
  float crossRipple = ridged(vec2(duneWorld.x * 8.0 + duneWorld.y * 0.13, duneWorld.y * 0.46));
  float crust = ridged(duneWorld * vec2(2.4, 0.62));
  float fine = noise(duneWorld * vec2(28.0, 8.0));
  float micro = hash(floor(duneWorld * vec2(95.0, 26.0)));

  vec3 sand = vec3(0.50, 0.355, 0.205);
  sand += vec3(0.18, 0.120, 0.060) * duneLong;
  sand += vec3(0.11, 0.085, 0.050) * duneSharp * (0.35 + groundY * 0.60);
  sand += vec3(0.060, 0.050, 0.034) * duneRipple * smoothstep(0.02, 0.95, groundY);
  sand += vec3(0.038, 0.034, 0.026) * crossRipple * smoothstep(0.20, 1.00, groundY);
  sand = mix(sand, vec3(0.31, 0.240, 0.165), smoothstep(0.70, 0.94, crust) * 0.18 * groundY);
  sand += vec3(0.040, 0.034, 0.025) * fine * groundY;
  sand += vec3(0.050, 0.047, 0.040) * smoothstep(0.965, 0.997, micro) * groundY;

  float hardpan = ridged(world * vec2(1.8, 0.37));
  hardpan *= ridged(world * vec2(4.0, 0.95));
  hardpan = smoothstep(0.72, 0.93, hardpan) * smoothstep(0.16, 0.92, groundY);
  sand = mix(sand, vec3(0.245, 0.205, 0.155), hardpan * 0.18);

  float scrubField = noise(world * vec2(1.05, 0.34) + warpB * 1.8);
  float scrubShape = noise(world * vec2(19.0, 5.2));
  float scrub = smoothstep(0.78, 0.95, scrubField) * smoothstep(0.54, 0.92, scrubShape);
  scrub *= smoothstep(0.10, 0.82, groundY);
  scrub *= 1.0 - smoothstep(0.90, 1.0, groundY);
  sand = mix(sand, vec3(0.145, 0.135, 0.075), scrub * 0.52);

  float roadCenter = 0.5 - cam.x * mix(0.020, 0.105, groundY);
  float roadHalf = mix(0.004, 0.182, pow(groundY, 1.05));

  float edgeBreakL = noise(vec2(world.y * 0.55, 19.7)) - 0.5;
  float edgeBreakR = noise(vec2(world.y * 0.58, 91.4)) - 0.5;
  float edgeBreak = mix(edgeBreakL, edgeBreakR, step(roadCenter, uv.x));
  float roadEdge = edgeBreak * mix(0.0008, 0.020, groundY);

  float road = roadMask(
    uv.x,
    roadCenter,
    roadHalf + roadEdge,
    mix(0.0015, 0.018, groundY)
  );

  vec2 roadWorld;
  roadWorld.x = (uv.x - roadCenter) / max(roadHalf, 0.0001);
  roadWorld.y = world.y;

  vec2 roadWarp = vec2(
    fbm(vec2(roadWorld.x * 0.45, roadWorld.y * 0.10)),
    fbm(vec2(roadWorld.x * 0.35 + 7.0, roadWorld.y * 0.14))
  );

  float roadBaseNoise = fbm(vec2(roadWorld.x * 1.15, roadWorld.y * 0.35) + roadWarp * 1.4);
  float washboard = ridged(vec2(roadWorld.x * 0.55, roadWorld.y * 1.65));
  float roadFine = fbm(vec2(roadWorld.x * 9.0, roadWorld.y * 2.5));
  float roadPebble = hash(floor(vec2(roadWorld.x * 86.0, roadWorld.y * 25.0)));

  vec3 dirtRoad = vec3(0.58, 0.425, 0.265);
  dirtRoad += vec3(0.16, 0.110, 0.055) * roadBaseNoise;
  dirtRoad += vec3(0.075, 0.058, 0.036) * washboard * (0.25 + groundY * 0.58);
  dirtRoad += vec3(0.050, 0.041, 0.027) * roadFine;
  dirtRoad += vec3(0.060, 0.055, 0.044) * smoothstep(0.865, 0.988, roadPebble) * groundY;

  float rutL = 1.0 - smoothstep(0.035, 0.128, abs(roadWorld.x + 0.36));
  float rutR = 1.0 - smoothstep(0.035, 0.128, abs(roadWorld.x - 0.36));
  float ruts = (rutL + rutR) * smoothstep(0.08, 0.98, groundY);

  float centerCrown = 1.0 - smoothstep(0.0, 0.82, abs(roadWorld.x));
  dirtRoad = mix(dirtRoad, vec3(0.34, 0.265, 0.185), ruts * 0.26);
  dirtRoad += vec3(0.080, 0.064, 0.040) * centerCrown * (0.20 + groundY * 0.35);

  float dustyCenter = smoothstep(0.95, 0.08, abs(roadWorld.x));
  dirtRoad = mix(dirtRoad, vec3(0.70, 0.550, 0.365), dustyCenter * 0.10);

  float shoulder = roadMask(
    uv.x,
    roadCenter,
    roadHalf + mix(0.014, 0.070, groundY),
    mix(0.004, 0.035, groundY)
  );

  vec3 shoulderCol = mix(sand, vec3(0.48, 0.345, 0.220), 0.42);
  sand = mix(sand, shoulderCol, max(shoulder - road, 0.0) * 0.62);

  vec3 ground = mix(sand, dirtRoad, road);

  float sideLight = mix(0.86, 1.10, smoothstep(0.0, 1.0, uv.x));
  ground *= sideLight;

  float nearContrast = smoothstep(0.10, 1.0, groundY);
  ground = mix(ground, ground * 1.12 - 0.030, nearContrast * 0.50);

  col = mix(col, ground, groundMaskVal);

  float horizonHaze =
    smoothstep(horizon - 0.018, horizon + 0.020, uv.y) *
    (1.0 - smoothstep(horizon + 0.020, horizon + 0.180, uv.y));

  float groundHaze =
    groundMaskVal *
    smoothstep(0.0, 0.28, 1.0 - groundY) *
    smoothstep(0.70, 0.15, groundY);

  col = mix(col, vec3(0.68, 0.65, 0.58), horizonHaze * 0.27);
  col = mix(col, vec3(0.66, 0.57, 0.46), groundHaze * 0.17);

  float vignette = smoothstep(1.10, 0.24, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= mix(0.70, 1.0, vignette);

  float grain = hash(gl_FragCoord.xy) - 0.5;
  col += grain * 0.009;

  col = tonemap(col);

  gl_FragColor = vec4(col, 1.0);
}
`));