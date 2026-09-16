// Build marker — if this line is missing from the console the browser is
// serving a cached engine2.js and none of the changes below are live.
console.log("[Zone2] build z2dest-roll+mirrorflip");
((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (GLSL.modules.zone2_hallway = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_camZ;
uniform float u_blink;
uniform float u_shake;
uniform float u_isWalking;
uniform float u_trip;
uniform float u_yawOffset;
uniform float u_framedKitchen;
uniform float u_northOpen;
uniform float u_southOpen;
uniform sampler2D u_southPortal;

uniform sampler2D u_texFront;
uniform sampler2D u_texBack;
uniform sampler2D u_texLeft;
uniform sampler2D u_texRight;
uniform sampler2D u_texTop;
uniform sampler2D u_texBottom;
uniform sampler2D u_texDoorLeft;

#ifdef MOBILE
#define u_texDoorRight u_texDoorLeft
#else
uniform sampler2D u_texDoorRight;
#endif

uniform sampler2D u_voidVid;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float _hh(float x) {
  return fract(sin(x * 127.1) * 43758.5453);
}

vec3 safeRay(vec3 rd) {
  vec3 r = rd;
  if (abs(r.x) < 0.0001) r.x = r.x < 0.0 ? -0.0001 : 0.0001;
  if (abs(r.y) < 0.0001) r.y = r.y < 0.0 ? -0.0001 : 0.0001;
  if (abs(r.z) < 0.0001) r.z = r.z < 0.0 ? -0.0001 : 0.0001;
  return r;
}

void traceHall(
  vec3 ro,
  vec3 rd,
  out vec4 hallTex,
  out vec2 tileUV,
  out float wallID,
  out float hitT,
  out vec3 nPos
) {
  vec3 box = vec3(0.5625, 1.0, 3.5);
  vec3 srd = safeRay(rd);
  vec3 tPos = (box * sign(srd) - ro) / srd;

  hitT = min(min(tPos.x, tPos.y), tPos.z);

  vec3 pos = ro + rd * hitT;
  nPos = pos / box;

  vec3 absPos = abs(nPos);
  wallID = -1.0;
  tileUV = vec2(0.0);
  hallTex = vec4(0.0, 0.0, 0.0, 1.0);

  if (absPos.x > absPos.y && absPos.x > absPos.z) {
    if (nPos.x > 0.0) {
      tileUV = vec2(-nPos.z, -nPos.y) * 0.5 + 0.5;
      hallTex = texture2D(u_texRight, tileUV);
      wallID = 1.0;
    } else {
      tileUV = vec2(nPos.z, -nPos.y) * 0.5 + 0.5;
      hallTex = texture2D(u_texLeft, tileUV);
      wallID = 0.0;
    }
  } else if (absPos.y > absPos.x && absPos.y > absPos.z) {
    wallID = 4.0;

    if (nPos.y > 0.0) {
      tileUV = vec2(nPos.x, -nPos.z) * 0.5 + 0.5;
      hallTex = texture2D(u_texTop, tileUV);
    } else {
      tileUV = vec2(nPos.x, nPos.z) * 0.5 + 0.5;
      hallTex = texture2D(u_texBottom, tileUV);
    }
  } else {
    if (nPos.z > 0.0) {
      tileUV = vec2(nPos.x, -nPos.y) * 0.5 + 0.5;
      hallTex = texture2D(u_texFront, tileUV);
      wallID = 2.0;
    } else {
      tileUV = vec2(nPos.x, -nPos.y) * 0.5 + 0.5;
      hallTex = texture2D(u_texBack, tileUV);
      wallID = 3.0;
    }
  }
}

// Projects a view ray past the north face onto a plane PORTAL_DEPTH behind it,
// so whatever is bound to u_voidVid reads as space BEYOND the opening instead of
// paint on the opening. Only rays that actually hit the +Z face reach this, so
// the cone is bounded by the hallway cross-section — a keyhole.
vec2 farPortalUV(vec2 uv, vec2 mouse, float yawOffset, float camZ) {
  vec3 box = vec3(0.5625, 1.0, 3.5);

  // Both constants matter and they move together. PLANE_SCALE has to cover the
  // widest keyhole cone or the edges clamp and smear the plane's border pixels
  // across the opening — the old vec2(2.6, 1.5) clamped by 6x, which is why this
  // read as a flat plate. DZ_MIN stops the cone blowing up as the camera walks
  // into the wall (dz -> 0 sends the sampled extent to infinity).
  const float PORTAL_DEPTH = 9.0;
  const float DZ_MIN       = 0.9;
  const float PLANE_SCALE  = 18.0;

  float dz = max(box.z - camZ, DZ_MIN);

  vec3 ro = vec3(0.0, 0.0, box.z - dz);
  vec3 rd = normalize(vec3(uv.x, uv.y, 1.6));

  rd.yz *= rot(mouse.y * 0.8);
  rd.xz *= rot(mouse.x + yawOffset);
  rd = safeRay(rd);

  float t = (dz + PORTAL_DEPTH) / rd.z;
  vec3 p = ro + rd * t;

  // Uniform scale — the plane keeps the hallway cross-section's aspect, so the
  // route is never stretched sideways the way vec2(2.6, 1.5) stretched it.
  vec2 outUV = vec2(
    p.x / (box.x * PLANE_SCALE),
   -p.y / (box.y * PLANE_SCALE)
  ) * 0.5 + 0.5;

  // No PLANE_SCALE covers the cone at full mouse-look pressed up against the
  // opening, and CLAMP_TO_EDGE there streaks one row of border pixels across
  // the corners — the exact smear that reads as a plate. Mirror-fold instead:
  // out-of-range UVs come back as a reflected continuation of the route, which
  // on abstract void/bh/plane content reads as more space, not a seam.
  outUV = 1.0 - abs(1.0 - mod(outUV, 2.0));

  return outUV;
}

// A dealt north route does NOT put the route on the end wall. It OPENS that end
// into another length of the same hallway: same cross-section, same side walls,
// ceiling and floor plates, running NORTH_LEG_LEN further north. The route sits
// at the far end of THAT leg. So when you turn right out of the bloodied
// bathroom you are looking down half a hallway, and the route starts in the
// opening at the end of it -- which is how blackhole and cabin were wired
// originally. farPortalUV above is the old single-plane treatment; it is only
// still reachable if this leg is ever switched off.
// t and nPos come back as if the leg were part of the same box, so the shared
// fog / tint / floor-glow / vignette tail below treats it as one continuous
// hallway instead of a lit diorama pasted on the end.
vec3 traceNorthLeg(vec3 ro, vec3 rd, inout float t, inout vec3 nPosOut) {
  const float NORTH_LEG_LEN = 3.2;

  vec3 box = vec3(0.5625, 1.0, 3.5);
  vec3 srd = safeRay(rd);

  // Step the ray to the mouth (the old +Z face), then re-enter a continuation
  // box that starts there.
  float tMouth = (box.z - ro.z) / srd.z;
  vec3 mouth = ro + srd * tMouth;

  vec3 cbox = vec3(box.x, box.y, NORTH_LEG_LEN * 0.5);
  vec3 cro = vec3(mouth.x, mouth.y, -cbox.z);

  vec3 tPos = (cbox * sign(srd) - cro) / srd;
  float hitT = min(min(tPos.x, tPos.y), tPos.z);
  vec3 pos = cro + srd * hitT;
  vec3 nPos = pos / cbox;
  vec3 absPos = abs(nPos);

  nPosOut = nPos;

  // Far end of the leg: the opening the route starts in. Fogged far less than
  // the walls, or the destination reads as just another dead end.
  if (absPos.z >= absPos.x && absPos.z >= absPos.y && nPos.z > 0.0) {
    t = tMouth + hitT * 0.2;
    return texture2D(u_voidVid, vec2(nPos.x, nPos.y) * 0.5 + 0.5).rgb;
  }

  // Half-weight the leg's own distance into the fog. At full weight the shared
  // exp(-t) crushes the whole stretch to black and you are back to staring at a
  // dead end; at half it recedes and then opens up as you walk toward it.
  t = tMouth + hitT * 0.5;

  if (absPos.x > absPos.y && absPos.x > absPos.z) {
    return (nPos.x > 0.0
      ? texture2D(u_texRight, vec2(-nPos.z, -nPos.y) * 0.5 + 0.5)
      : texture2D(u_texLeft, vec2(nPos.z, -nPos.y) * 0.5 + 0.5)).rgb;
  }
  if (absPos.y > absPos.x && absPos.y > absPos.z) {
    return (nPos.y > 0.0
      ? texture2D(u_texTop, vec2(nPos.x, -nPos.z) * 0.5 + 0.5)
      : texture2D(u_texBottom, vec2(nPos.x, nPos.z) * 0.5 + 0.5)).rgb;
  }
  return texture2D(u_texBack, vec2(nPos.x, -nPos.y) * 0.5 + 0.5).rgb;
}

vec2 framedKitchenUV(vec2 frontUV) {
  vec2 apertureMin = vec2(0.1904, 0.1851);
  vec2 apertureMax = vec2(0.8130, 0.8126);
  vec2 localUV = clamp((frontUV - apertureMin) / (apertureMax - apertureMin), 0.0, 1.0);
  localUV.x = 0.5 + (localUV.x - 0.5) * 0.835;
  return localUV;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float trip = clamp(u_trip, 0.0, 2.0);

  float warpAmp = 0.004 + trip * 0.006;

  float liquidX =
    sin(uv.y * 12.0 + u_time * 0.4) * warpAmp +
    cos(uv.x * 10.0 - u_time * 0.3) * warpAmp * 0.75;

  float liquidY =
    cos(uv.x * 14.0 + u_time * 0.3) * warpAmp +
    sin(uv.y * 11.0 - u_time * 0.4) * warpAmp * 0.75;

  liquidX += sin(u_time * 30.0) * 0.01 * u_shake;
  liquidY += cos(u_time * 25.0) * 0.01 * u_shake;
  liquidX += sin(uv.y * 3.0 + u_time * 0.15) * trip * 0.004;
  liquidY += cos(uv.x * 4.0 - u_time * 0.12) * trip * 0.003;

  float gTick = floor(u_time * 14.0);
  float glitchProb = 0.985 - trip * 0.04;

  if (step(glitchProb, _hh(gTick * 133.77)) > 0.0) {
    float bandY = floor(uv.y * mix(8.0, 25.0, _hh(gTick * 2.1)));
    liquidX += (_hh(bandY + gTick) - 0.5) * 0.15 * trip;
  }

  float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;
  float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;
  vec3 ro = vec3(bobX, bobY, u_camZ);

  vec3 rd = normalize(vec3(uv.x + liquidX, uv.y + liquidY, 1.6));

  vec2 m = u_mouse * 0.35;
  rd.yz *= rot(m.y * 0.8);
  rd.xz *= rot(m.x + u_yawOffset);

  vec4 hallTex;
  vec2 tileUV;
  float wallID;
  float t;
  vec3 nPos;

  traceHall(ro, rd, hallTex, tileUV, wallID, t, nPos);

  // North wall. u_northOpen == 1 means blood dealt a north route: the fence is
  // GONE and the end of the hall opens into the next stretch.
  if (wallID == 2.0 && u_northOpen > 0.5) {
    // Dealt north route: this face is the MOUTH of the next stretch of hallway,
    // not a surface. Swap the leg in and fall through to the shared lighting
    // tail so it is the same hallway, just longer.
    hallTex = vec4(traceNorthLeg(ro, rd, t, nPos), 1.0);
  } else if (wallID == 2.0 && hallTex.a < 0.999) {
    // Fence still standing: face UVs, so the FORWARD-MASK.png cutout lines up
    // with its own alpha.
    vec2 portalUV = u_framedKitchen > 0.5 ? framedKitchenUV(tileUV) : tileUV;
    if (u_framedKitchen <= 0.5) portalUV.y = 1.0 - portalUV.y;

    vec3 portalCol = texture2D(u_voidVid, portalUV).rgb;
    vec3 col = mix(portalCol, hallTex.rgb, smoothstep(0.46, 0.66, hallTex.a));

    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // South wall. u_southOpen == 1 means blood dealt the elevator: the plate is
  // gone and the space-elevator platform fills that end of the hallway.
  if (wallID == 3.0 && u_southOpen > 0.5) {
    vec2 sUV = tileUV;
    sUV.y = 1.0 - sUV.y;
    gl_FragColor = vec4(texture2D(u_southPortal, sUV).rgb, 1.0);
    return;
  }

  vec3 finalCol = hallTex.rgb;

  bool isCutout =
    hallTex.a < 0.1 ||
    (hallTex.g > 0.4 && hallTex.r < 0.25 && hallTex.b < 0.25);

  // The side-wall doorways. These were flat fill — u_texDoorLeft and
  // u_texDoorRight are bound by the engine (units 7 and 8, the mirror and
  // window renders) and were never once sampled, so every doorway rendered as
  // a dead plate. Sample them. max() against the old flat colour keeps the
  // plate only where nothing is bound, so a blank 1x1 does not go pure black.
  if (isCutout && wallID != 4.0) {
    vec2 doorUV = vec2(tileUV.x, 1.0 - tileUV.y);
    if (wallID == 0.0) {
      finalCol = max(texture2D(u_texDoorLeft, doorUV).rgb, vec3(0.04, 0.03, 0.03));
    } else if (wallID == 1.0) {
      finalCol = max(texture2D(u_texDoorRight, doorUV).rgb, vec3(0.03, 0.03, 0.05));
    }
  }

  if (wallID == 4.0 && isCutout) {
    finalCol = vec3(0.0);
  }

  float fogThickness = 0.5 + trip * 0.15;
  float fogFactor = exp(-t * fogThickness);
  vec3 fogColor = vec3(0.02, 0.03, 0.04);
  fogColor = mix(fogColor, vec3(0.04, 0.03, 0.01), trip * 0.3);
  finalCol = mix(fogColor, finalCol, fogFactor);

  float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));
  vec3 eerieTint = vec3(lum * 0.75, lum * 0.9, lum * 1.1);
  finalCol = mix(finalCol, eerieTint, 0.4 + trip * 0.15);

  float floorGlow =
    smoothstep(-0.3, -0.8, nPos.y) *
    (0.4 + 0.6 * sin(u_time * 1.3 + nPos.z * 0.4));

  finalCol += vec3(0.08, 0.01, 0.005) * floorGlow * (0.3 + trip * 0.4);

  float flicker =
    1.0 - step(0.97, _hh(floor(u_time * 12.0) * 7.3)) * 0.3 * trip;

  finalCol *= flicker;

  float vignette = smoothstep(1.3, 0.2, length(uv));
  finalCol *= vignette;
  finalCol *= 0.65;

  gl_FragColor = vec4(finalCol * (1.0 - u_blink), 1.0);
}
`),
  GLSL.modules.z2_seq_hole ||
    (GLSL.modules.z2_seq_hole = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform sampler2D u_tex;
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        gl_FragColor = texture2D(u_tex, uv);
    }
    `),
  // Same blit, but horizontally mirrored. Used for the bathroom mirror so the
  // reflected bedroom actually reads as a reflection. Hardcoded rather than a
  // uniform flag on z2_seq_hole so there is no uniform-location dependency.
  GLSL.modules.z2_seq_hole_mirrored ||
    (GLSL.modules.z2_seq_hole_mirrored = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform sampler2D u_tex;
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        uv.x = 1.0 - uv.x;
        gl_FragColor = texture2D(u_tex, uv);
    }
    `),
  GLSL.modules.z3_alt_blackhole_walk ||
    (GLSL.modules.z3_alt_blackhole_walk = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_yaw;
uniform float u_pitch;
uniform vec3  u_camPos;
uniform float u_movePhase;
uniform float u_speed;
uniform float u_seed;
uniform float u_audio;
uniform float u_trip;
// Ray-cone width. 1.0 is the walking black-hole camera. The Z3 hallway builds
// its rays as normalize(vec3(uv, 1.6)), so when this pass is the view THROUGH
// the north opening it has to be 1.6 too -- at 1.0 the void is a much wider
// lens than the corridor around it and pans at a different rate, which reads as
// the far view being glued to the screen.
uniform float u_fovK;
// Portal mode. When this pass is the view THROUGH the Z3 north opening rather
// than a scene in its own right, the ray has to be built the corridor's way:
//   u_portal    -- flips camForward to the corridor's pitch-then-yaw order
//   u_uvScale   -- the corridor's own screen-space zoom (u_zoom * surge zoom)
//   u_uvOffset  -- the corridor's own screen-space shake
// The corridor samples u_voidTex at raw gl_FragCoord, so NONE of its uv warp
// reaches this pass on its own. Left unmatched, the void pans at a different
// rate than the corridor around it, which is what reads as the far view being
// glued to the screen instead of sitting still in the world.
uniform float u_portal;
uniform float u_uvScale;
uniform vec2  u_uvOffset;
uniform sampler2D u_texGround;

const int   MARCH_STEPS = 96;
const int   BEND_STEPS  = 26;
const float FAR_CLIP    = 14000.0;
const float EPS         = 0.045;

const vec3  BH_CENTER   = vec3(0.0, 0.0, -3200.0);
const float BH_RADIUS   = 520.0;

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float hash1(float p){ return fract(sin(p*127.1)*43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float hash3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,191.999)))*43758.5453123); }

float noise3(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash3(i); float n100=hash3(i+vec3(1,0,0));
  float n010=hash3(i+vec3(0,1,0)); float n110=hash3(i+vec3(1,1,0));
  float n001=hash3(i+vec3(0,0,1)); float n101=hash3(i+vec3(1,0,1));
  float n011=hash3(i+vec3(0,1,1)); float n111=hash3(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),
             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);
}

vec3 camForward(float yaw, float pitch){
  vec3 f=vec3(0,0,-1);
  // The corridor rotates its ray pitch first (rd.yz*=rot then rd.xz*=rot).
  // These are rotations about fixed WORLD axes, so composing them the other way
  // round is not the same vector once both angles are nonzero -- portal mode
  // has to match the corridor's order or the void drifts as you look around.
  if(u_portal>0.5){ f.yz*=rot(pitch); f.xz*=rot(yaw);   }
  else            { f.xz*=rot(yaw);   f.yz*=rot(pitch); }
  return normalize(f);
}
vec3 camRight(vec3 fwd){ return normalize(cross(fwd,vec3(0,1,0))); }
vec3 camUp(vec3 fwd, vec3 right){ return normalize(cross(right,fwd)); }

float pathCenterX(float z){
  float k = clamp((-z-50.0)/2800.0, 0.0, 1.0);
  return sin(z*0.00165+0.7)*22.0*k + sin(z*0.006+1.8)*3.5;
}
float pathCenterY(float z){
  return -1.25 + smoothstep(-2400.0, -3100.0, z) * 30.0;
}
float pathHalfWidth(float z){
  float t = clamp((-z-20.0)/3300.0, 0.0, 1.0);
  return mix(1.3, 18.0, t*t);
}

vec3 groundColor(vec3 hp, vec3 ro){
  float flowZ = hp.z + u_movePhase * mix(28.0, 64.0, clamp(u_speed,0.0,1.5));
  vec2 guv = vec2(hp.x*0.12+0.5, fract(flowZ*0.035));
  vec3 tex = texture2D(u_texGround, guv).rgb;
  float dist = length(hp-ro);
  tex *= exp(-dist*0.004) * 0.50;
  float cx = pathCenterX(hp.z);
  float hw = pathHalfWidth(hp.z);
  float edge = abs(hp.x-cx)/max(hw,0.001);
  tex *= 1.0 - smoothstep(0.80, 1.02, edge);
  float seg = 1.0-smoothstep(0.0,0.18,abs(fract((flowZ+1000.0)*0.060)-0.5));
  tex += vec3(0.10,0.11,0.16)*seg*(1.0-smoothstep(0.0,0.10,abs(hp.x-cx)))*u_speed*0.5;
  tex += vec3(0.07,0.04,0.02)*smoothstep(-600.0,-2800.0,hp.z)*exp(-dist*0.004)*0.3;
  tex += vec3(0.06,0.07,0.12)*smoothstep(-2800.0,-3200.0,hp.z)*0.24;
  return tex;
}

vec3 cosmos(vec3 rd, vec3 ro){
  vec3 d=normalize(rd); vec3 col=vec3(0.0);
  vec3 p1=normalize(d*900.0+ro*0.012);
  vec3 p2=normalize(d*1600.0+ro*0.020+vec3(17.3,-9.1,5.7));
  col += vec3(0.80,0.86,0.96)*smoothstep(0.9982,1.0,hash3(floor(p1*320.0)+u_seed*0.01))*(0.65+u_audio*0.30);
  col += vec3(0.72,0.76,0.92)*smoothstep(0.9993,1.0,hash3(floor(p2*520.0)+u_seed*0.007))*0.35;
  vec3 neb=d*7.0+ro*vec3(0.0007,0.0003,0.0009);
  float band=smoothstep(0.42,0.0,abs(d.y+sin(d.x*2.4+ro.z*0.0002)*0.16));
  col += vec3(0.10,0.13,0.22)*noise3(neb+vec3(0,u_time*0.005,0))*band*0.90;
  col += vec3(0.08,0.10,0.18)*noise3(neb*1.9+vec3(4.2,-2.3,7.7))*band*0.70;
  col += vec3(0.04,0.06,0.12)*noise3(neb*0.8+vec3(-3.4,2.0,-6.1))*band*0.55;
  col += vec3(0.05,0.07,0.12)*smoothstep(0.85,-0.10,d.y)*0.50;
  return col;
}

vec3 neonPalette(float t){
  return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.00,0.33,0.67)));
}

float sdVoidFractal(vec3 p, float power, float rotA, float rotB){
  vec3 z=p; z.xz*=rot(u_time*rotA); z.yz*=rot(u_time*rotB);
  float scale=1.0;
  vec3 foldOffset=vec3(0.6)+(vec3(0.15)*sin(u_time*0.15+power))+u_audio*0.2;
  for(int i=0;i<8;i++){
    z=abs(z); if(z.x<z.y) z.xy=z.yx; if(z.x<z.z) z.xz=z.zx; if(z.y<z.z) z.yz=z.zy;
    z=z*2.0-foldOffset; scale*=2.0;
  }
  return (length(z)-0.2)/scale;
}

vec3 colorPickoverVoid(vec3 p){
  vec2 c=vec2(p.x*0.4+sin(u_time*0.07)*0.3, p.y*0.4+cos(u_time*0.05)*0.3);
  vec2 z=vec2(0.0); float minDist=1e10; float escapeI=0.0;
  for(int i=0;i<80;i++){
    z=clamp(vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c,-1000.0,1000.0);
    float d=min(abs(z.x),abs(z.y)); if(d<minDist) minDist=d;
    if(dot(z,z)>100.0){escapeI=float(i); break;}
  }
  return neonPalette(fract(clamp(minDist*8.0,0.0,1.0)*2.0+u_time*0.15+escapeI*0.01))
       *(0.4+0.6*(1.0-clamp(minDist*8.0,0.0,1.0)));
}

vec3 marchVoidFractal(vec3 ro, vec3 rd, vec3 fracPos, float fracScale, float power, float rotA, float rotB){
  vec3 lro=(ro-fracPos)/fracScale;
  vec3 lrd=rd;
  float boundR=1.8;
  vec3 oc=lro;
  float b=dot(oc,lrd); float c_=dot(oc,oc)-boundR*boundR;
  float disc=b*b-c_;
  if(disc<0.0) return vec3(0.0);
  float t=max(0.0,-b-sqrt(disc));
  for(int i=0;i<50;i++){
    vec3 p=lro+lrd*t;
    if(length(p)>boundR+0.5) break;
    float d=sdVoidFractal(p,power,rotA,rotB);
    if(d<0.003){
      vec3 e=vec3(0.003,0.0,0.0);
      vec3 n=normalize(vec3(
        sdVoidFractal(p+e.xyy,power,rotA,rotB)-sdVoidFractal(p-e.xyy,power,rotA,rotB),
        sdVoidFractal(p+e.yxy,power,rotA,rotB)-sdVoidFractal(p-e.yxy,power,rotA,rotB),
        sdVoidFractal(p+e.yyx,power,rotA,rotB)-sdVoidFractal(p-e.yyx,power,rotA,rotB)
      ));
      vec3 matCol=colorPickoverVoid(p);
      float diff=max(dot(n,normalize(vec3(0.2,1.0,0.5))),0.0)*0.7+0.15;
      float fres=pow(1.0-max(dot(-lrd,n),0.0),3.0);
      vec3 col=matCol*diff+neonPalette(fract(u_time*0.08+p.y*0.5))*fres*0.3;
      col*=exp(-t*fracScale*0.003);
      return col;
    }
    t+=d*0.7;
    if(t>boundR*3.0) break;
  }
  return vec3(0.0);
}


vec3 accretionGlow(vec3 p, float closestR){
  vec3 rel=p-BH_CENTER; float r=length(rel); float plane=abs(rel.y); float ringR=length(rel.xz);
  float disk=exp(-plane*0.085)*smoothstep(BH_RADIUS*2.6,BH_RADIUS*1.08,ringR)*smoothstep(BH_RADIUS*1.02,BH_RADIUS*1.30,ringR);
  float swirl=0.55+0.45*sin(atan(rel.z,rel.x)*7.0-u_time*0.8+ringR*0.008);
  float turb=noise3(rel*vec3(0.006,0.03,0.006)+vec3(0,u_time*0.03,0));
  vec3 glow=mix(vec3(1.02,0.42,0.12),vec3(1.05,0.63,0.26),smoothstep(BH_RADIUS*1.15,BH_RADIUS*2.2,ringR))*disk*(0.72+0.48*swirl+0.30*turb);
  glow+=vec3(0.34,0.40,0.76)*exp(-abs(r-BH_RADIUS*1.55)*0.022)*smoothstep(0.7,0.0,plane*0.05)*(0.22+u_audio*0.12);
  glow+=vec3(0.10,0.12,0.24)*disk*smoothstep(BH_RADIUS*4.2,BH_RADIUS*1.0,closestR)*0.08;
  return glow*(0.013+u_audio*0.006+u_trip*0.003);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;

  if(u_portal>0.5){
    // Portal: wear the corridor's lens, not our own. Note the block below runs
    // its surge zoom off raw u_time -- ungated seconds-since-load -- so it was
    // widening this pass's FOV by ~0.3% per second forever while the corridor
    // (mt = u_modeTime * u_isOOB) mostly sat at zero. That alone pulled the two
    // views apart within a minute of walking.
    uv = uv*u_uvScale + u_uvOffset;
  } else {
    float liqAmp = 0.10 * u_trip;
    if(liqAmp > 0.001){
      float tw=u_time*0.15;
      vec2 q=vec2(noise3(vec3(uv*2.0, tw)), noise3(vec3(uv*2.0+vec2(tw,0.0), tw)));
      float n3=noise3(vec3(uv*2.0+2.0*q+vec2(1.7,9.2), tw*0.6));
      float n4=noise3(vec3(uv*2.0+2.0*q+vec2(8.3,2.8), tw*0.5));
      uv += (vec2(n3,n4)-0.5) * liqAmp;
    }

    float mt=u_time;
    float w1=sin(mt*0.4+u_seed); float w2=sin(mt*0.9+u_seed*2.0); float w3=sin(mt*1.5+u_seed*3.0);
    float surge=smoothstep(0.8,1.0,(w1+w2+w3)/3.0);
    float snap=pow(surge,2.0)*12.0;
    uv*=1.0+mt*0.003+snap*0.015;

    float gTick=floor(u_time*16.0);
    if(step(0.979,hash1(gTick*133.77+u_seed))>0.0)
      uv.x+=(hash1(floor(uv.y*mix(10.0,30.0,hash1(gTick*2.1)))+gTick)-0.5)*0.18*clamp(u_trip,0.0,1.5);
  }

  vec3 ro=u_camPos;
  vec3 fwd=camForward(u_yaw,u_pitch); vec3 right=camRight(fwd); vec3 up=camUp(fwd,right);
  vec3 rd=normalize(fwd*max(u_fovK, 0.001)+right*uv.x+up*uv.y);
  vec3 col=vec3(0.0);

  float fracAngle=hash1(u_seed*7.7)*6.28;
  vec3 fracPos=vec3(sin(fracAngle)*45.0, pathCenterY(u_camPos.z-300.0)+10.0, u_camPos.z-300.0);
  float fracPow=mix(6.0,10.0,hash1(u_seed*5.3))+sin(u_time*0.05)*1.5;
  float fracRotA=mix(0.05,0.15,hash1(u_seed*9.7))*(hash1(u_seed*4.1)>0.5?1.0:-1.0);
  float fracRotB=mix(0.04,0.12,hash1(u_seed*6.3))*(hash1(u_seed*8.9)>0.5?1.0:-1.0);
  vec3 fracResult=marchVoidFractal(ro, rd, fracPos, 10.0, fracPow, fracRotA, fracRotB);
  bool hitFractal=length(fracResult)>0.001;

  bool hitGround=false;
  if(!hitFractal && rd.y<0.05){
    for(int gi=0;gi<40;gi++){
      float gt=float(gi)*8.0+1.0;
      vec3 gp=ro+rd*gt;
      if(gp.y<pathCenterY(gp.z)+0.09){
        float gtP=gt-8.0;
        for(int ri=0;ri<6;ri++){float mid=(gtP+gt)*0.5; vec3 mp=ro+rd*mid; if(mp.y<pathCenterY(mp.z)+0.09) gt=mid; else gtP=mid;}
        vec3 hp=ro+rd*gt;
        float cx=pathCenterX(hp.z); float hw=pathHalfWidth(hp.z);
        if(abs(hp.x-cx)<hw && hp.z<ro.z+10.0 && gt>0.5){col=groundColor(hp,ro); hitGround=true;}
        break;
      }
    }
  }

  if(!hitGround && !hitFractal){
    vec3 p=ro; float traveled=0.0; float closestR=1e9; bool hitBH=false;
    for(int i=0;i<MARCH_STEPS;i++){
      vec3 toBH=BH_CENTER-p; float r=length(toBH); closestR=min(closestR,r);
      if(r<BH_RADIUS){col=vec3(0); hitBH=true; break;}
      float grav=clamp((BH_RADIUS*(16.0+u_trip*2.0))/(r*r),0.0,0.040);
      rd=normalize(mix(rd,normalize(toBH),grav));
      if(r<BH_RADIUS*4.8 && mod(float(i),2.0)<0.5) col+=accretionGlow(p,closestR);
      float stepLen=clamp(r*0.03,0.75,78.0); stepLen*=1.0+smoothstep(BH_RADIUS*5.5,FAR_CLIP,r)*1.55;
      p+=rd*stepLen; traveled+=stepLen;
      if(traveled>FAR_CLIP) break;
    }
    if(!hitBH){
      vec3 bent=rd; vec3 rp=ro; float bendClosest=1e9;
      for(int i=0;i<BEND_STEPS;i++){
        vec3 toBH=BH_CENTER-rp; float r=length(toBH); bendClosest=min(bendClosest,r);
        if(r<BH_RADIUS*1.03) break;
        bent=normalize(mix(bent,normalize(toBH),clamp((BH_RADIUS*14.0)/(r*r),0.0,0.032)));
        rp+=bent*clamp(r*0.15,34.0,180.0);
        if(length(rp-ro)>FAR_CLIP) break;
      }
      vec3 bg=cosmos(bent,ro);
      bg+=vec3(0.16,0.20,0.34)*exp(-abs(bendClosest-BH_RADIUS*1.68)*0.018)*0.34;
      bg*=1.0-smoothstep(BH_RADIUS*1.30,BH_RADIUS*0.96,bendClosest);
      col+=bg;
    }
  }

  if(hitFractal) col=fracResult;

  col=mix(col,vec3(0.008,0.010,0.016), hitGround ? 0.12 : 0.20);

  float lum=dot(col,vec3(0.299,0.587,0.114));
  col=mix(col,vec3(lum*0.88,lum*0.90,lum*1.04),0.15);

  col*=0.78+0.22*(1.0-smoothstep(0.75,1.5,length(uv)));

  col=1.0-exp(-col*1.08);

  gl_FragColor=vec4(col,1.0);
}
`));

class Zone2RoomMode {
  constructor(e, t) {
    ((this.prog = gl.createProgram()),
      gl.attachShader(
        this.prog,
        compile(
          gl.VERTEX_SHADER,
          `
        attribute vec2 p;
        uniform float u_time;
        uniform float u_trip;
        uniform float u_shake;
        void main() {
            vec2 pos = p;
            float warpX = sin(pos.y * 6.0 + u_time * 1.5) * 0.015 * u_trip;
            float warpY = cos(pos.x * 6.0 + u_time * 1.8) * 0.015 * u_trip;
            pos += vec2(warpX, warpY);
            pos.x += sin(u_time * 30.0) * 0.015 * u_shake;
            pos.y += cos(u_time * 37.0) * 0.015 * u_shake;
            gl_Position = vec4(pos, 0.0, 1.0);
        }
        `,
        ),
      ));
    var i = GLSL.modules[e];
    (IS_MOBILE && (i = "#define MOBILE\n" + i),
      gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, i)),
      gl.linkProgram(this.prog),
      (this.tex = loadStaticTex(t)),
      (this.bcTexGL = gl.createTexture()),
      gl.bindTexture(gl.TEXTURE_2D, this.bcTexGL),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      ),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      (this.bcSourceTex = null),
      (this.U = {
        res: gl.getUniformLocation(this.prog, "u_resolution"),
        time: gl.getUniformLocation(this.prog, "u_time"),
        modeTime: gl.getUniformLocation(this.prog, "u_modeTime"),
        mouse: gl.getUniformLocation(this.prog, "u_mouse"),
        blink: gl.getUniformLocation(this.prog, "u_blink"),
        texEnv1: gl.getUniformLocation(this.prog, "u_texEnv1"),
        texEnv2: gl.getUniformLocation(this.prog, "u_texEnv2"),
        texEnv3: gl.getUniformLocation(this.prog, "u_texEnv3"),
        texEnv4: gl.getUniformLocation(this.prog, "u_texEnv4"),
        wake: gl.getUniformLocation(this.prog, "u_wake"),
        windowTex: gl.getUniformLocation(this.prog, "u_windowTex"),
        bcTex: gl.getUniformLocation(this.prog, "u_bcTex"),
        trip: gl.getUniformLocation(this.prog, "u_trip"),
        shake: gl.getUniformLocation(this.prog, "u_shake"),
        flash: gl.getUniformLocation(this.prog, "u_flash"),
        audio: gl.getUniformLocation(this.prog, "u_audio"),
        modeSeed: gl.getUniformLocation(this.prog, "u_modeSeed"),
      }));
  }
  render(e, t, i, o, n, l, r, s, a, h) {
    // FAIL CLOSED. If this plate's program or photo is gone, draw NOTHING.
    // Falling through left whatever the window/portal ActiveMode last bound on
    // unit 0 -- for deadcity that is files/img/void/ruins01.png -- and the plate
    // painted THAT across the whole bathroom. Bind null first so a bind that
    // does not take samples black instead of somebody else's photo.
    if (!this.prog || !this.tex || !gl.isTexture(this.tex)) return;
    if (
      (gl.useProgram(this.prog),
      gl.activeTexture(gl.TEXTURE0),
      gl.bindTexture(gl.TEXTURE_2D, null),
      gl.bindTexture(gl.TEXTURE_2D, this.tex),
      null !== this.U.texEnv1 && gl.uniform1i(this.U.texEnv1, 0),
      n &&
        gl.isTexture(n) &&
        (gl.activeTexture(gl.TEXTURE1),
        gl.bindTexture(gl.TEXTURE_2D, null),
        gl.bindTexture(gl.TEXTURE_2D, n),
        null !== this.U.windowTex && gl.uniform1i(this.U.windowTex, 1),
        null !== this.U.texEnv2 && gl.uniform1i(this.U.texEnv2, 1),
        null !== this.U.texEnv3 && gl.uniform1i(this.U.texEnv3, 1),
        null !== this.U.texEnv4 && gl.uniform1i(this.U.texEnv4, 1)),
      null !== this.U.bcTex)
    ) {
      if (
        (gl.activeTexture(gl.TEXTURE2),
        gl.bindTexture(gl.TEXTURE_2D, null),
        this.bcSourceTex && gl.isTexture(this.bcSourceTex))
      )
        gl.bindTexture(gl.TEXTURE_2D, this.bcSourceTex);
      else {
        gl.bindTexture(gl.TEXTURE_2D, this.bcTexGL);
        try {
          window.bcCanvas &&
            window.bcCanvas.width > 0 &&
            (gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !1),
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              window.bcCanvas,
            ));
        } catch (e) {}
      }
      gl.uniform1i(this.U.bcTex, 2);
    }
    const d = document.getElementById("c");
    (gl.uniform2f(
      this.U.res,
      d ? d.width : window.innerWidth,
      d ? d.height : window.innerHeight,
    ),
      gl.uniform1f(this.U.time, 0.001 * e),
      gl.uniform2f(this.U.mouse, t, i),
      gl.uniform1f(this.U.blink, o),
      null !== this.U.modeTime && gl.uniform1f(this.U.modeTime, 0.001 * e),
      null !== this.U.wake && gl.uniform1f(this.U.wake, 1),
      null !== this.U.trip && gl.uniform1f(this.U.trip, a || 0),
      null !== this.U.shake && gl.uniform1f(this.U.shake, l || 0),
      null !== this.U.flash && gl.uniform1f(this.U.flash, r || 0),
      null !== this.U.audio && gl.uniform1f(this.U.audio, s || 0),
      null !== this.U.modeSeed && gl.uniform1f(this.U.modeSeed, h || 0),
      this.quadBuffer ||
        ((this.quadBuffer = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        )),
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
    const g = gl.getAttribLocation(this.prog, "p");
    (gl.enableVertexAttribArray(g),
      gl.vertexAttribPointer(g, 2, gl.FLOAT, !1, 0, 0),
      gl.drawArrays(gl.TRIANGLES, 0, 3));
  }
  destroy() {
    try {
      const hud = document.getElementById("z2-hud");
      hud && hud.parentNode && hud.parentNode.removeChild(hud);
    } catch (e) {}
    (gl.deleteTexture(this.tex),
      gl.deleteTexture(this.bcTexGL),
      gl.deleteProgram(this.prog),
      this.quadBuffer && gl.deleteBuffer(this.quadBuffer));
  }
}

function checkZ2Touch(e) {
  if (!e.touches) return;
  if (!window.currentZone2 || window.currentZone2.isDead) return;
  let t = !1;
  const i = window.__mobileWalkZoneContains;
  for (let o = 0; o < e.touches.length; o++) {
    const n = e.touches[o];
    i(n.clientX, n.clientY) && (t = !0);
  }
  if (
    ((window.z2TouchHeld = t),
    t && window.currentZone2.voidVid && window.currentZone2.voidVid.paused)
  ) {
    let e = window.currentZone2.voidVid.play();
    void 0 !== e && e.catch(() => {});
  }
}

function isZ2ForwardKey(e) {
  return !!(
    e &&
    ("Space" === e.code ||
      "ArrowUp" === e.code ||
      "KeyW" === e.code ||
      " " === e.key ||
      "Spacebar" === e.key)
  );
}

const z2ForwardKeys = {
  Space: !!window.z2SpaceHeld,
  ArrowUp: !1,
  KeyW: !1,
};

function getZ2ForwardCode(e) {
  return e && (" " === e.key || "Spacebar" === e.key) ? "Space" : e.code;
}

function syncZ2ForwardHeld() {
  window.z2SpaceHeld = !!(
    z2ForwardKeys.Space ||
    z2ForwardKeys.ArrowUp ||
    z2ForwardKeys.KeyW
  );
}

((window.z2SpaceHeld = window.z2SpaceHeld || !1),
  (window.z2TouchHeld = window.z2TouchHeld || !1),
  (window.__mobileWalkZoneContains =
    window.__mobileWalkZoneContains ||
    function (e, t) {
      const i = window.innerWidth;
      return t >= 0.68 * window.innerHeight && e >= 0.3 * i && e <= 0.7 * i;
    }),
  window.addEventListener("keydown", (e) => {
    isZ2ForwardKey(e) &&
      (e.preventDefault(),
      (z2ForwardKeys[getZ2ForwardCode(e)] = !0),
      syncZ2ForwardHeld(),
      window.currentZone2 &&
        window.currentZone2.voidVid &&
        window.currentZone2.voidVid.play().catch(() => {}));
  }),
  window.addEventListener("keyup", (e) => {
    isZ2ForwardKey(e) &&
      (e.preventDefault(),
      (z2ForwardKeys[getZ2ForwardCode(e)] = !1),
      syncZ2ForwardHeld());
  }),
  window.addEventListener("touchstart", checkZ2Touch, {
    passive: !1,
  }),
  window.addEventListener("touchmove", checkZ2Touch, {
    passive: !1,
  }),
  window.addEventListener("touchend", checkZ2Touch, {
    passive: !1,
  }),
  window.addEventListener("touchcancel", () => {
    window.z2TouchHeld = !1;
  }));

// ── DEBUG: hold a number key to force the blood route ──────────────────────
// Hold it while you're looking into the bathroom, before the mirror's second
// blink. Whatever is down when the blood transition fires wins the roll:
//   1 elevator   2 tunnel (theater)   3 black hole   4 cabin
// Release the key and the roll goes back to a fair 1-of-4. Nothing here runs
// unless a key is actually held — this is an override, not a default.
const Z2_FORCE_ROUTE_KEYS = {
  Digit1: "elevator",
  Digit2: "theater",
  Digit3: "blackhole",
  Digit4: "cabin",
  Numpad1: "elevator",
  Numpad2: "theater",
  Numpad3: "blackhole",
  Numpad4: "cabin",
};
const z2ForceRouteHeld = {};
function z2ForceRouteCode(e) {
  if (e.code && Z2_FORCE_ROUTE_KEYS[e.code]) return e.code;
  // Fall back to e.key so a layout without Digit* codes still works.
  return "1" === e.key || "2" === e.key || "3" === e.key || "4" === e.key
    ? "Digit" + e.key
    : null;
}
function syncZ2ForceRoute() {
  // Last key pressed wins if several are down.
  const codes = Object.keys(z2ForceRouteHeld).filter(
    (c) => z2ForceRouteHeld[c],
  );
  window.__z2ForceRoute = codes.length
    ? Z2_FORCE_ROUTE_KEYS[codes[codes.length - 1]]
    : null;
}
// This listener is module-level, so it is live on every page engine2.js loads
// into — the splash, engine1, the tutorial, everything. Without a gate, holding
// a number anywhere on the site armed a global. Only listen when Zone 2 is
// actually alive AND you are looking into the bathroom before the transformation,
// which is the only moment the override can do anything anyway.
function z2ForceRouteArmable() {
  const z2 = window.currentZone2;
  return !!(
    z2 &&
    !z2.isDead &&
    "left" === z2.activePOV &&
    "W" === z2.facing &&
    "initial" === z2.seqState &&
    !z2.bloodDealt
  );
}
(window.addEventListener("keydown", (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  // Never swallow a number someone is typing into a field (terminal.html, the
  // debug panel inputs).
  const el = document.activeElement,
    tag = el && el.tagName;
  if ("INPUT" === tag || "TEXTAREA" === tag || (el && el.isContentEditable))
    return;
  if (!z2ForceRouteArmable()) return;
  const code = z2ForceRouteCode(e);
  code &&
    (delete z2ForceRouteHeld[code],
    (z2ForceRouteHeld[code] = !0),
    syncZ2ForceRoute());
}),
  window.addEventListener("keyup", (e) => {
    const code = z2ForceRouteCode(e);
    code && (delete z2ForceRouteHeld[code], syncZ2ForceRoute());
  }),
  window.addEventListener("blur", () => {
    for (const k in z2ForceRouteHeld) delete z2ForceRouteHeld[k];
    syncZ2ForceRoute();
  }));

class Zone2Engine {
  constructor() {
    const z2LeftTextures =
      (GLSL.modules && GLSL.modules.z2_room_left_textures) || {};
    ((this.prog = buildProgram("zone2_hallway")),
      gl.useProgram(this.prog),
      (this.U = {
        res: gl.getUniformLocation(this.prog, "u_resolution"),
        time: gl.getUniformLocation(this.prog, "u_time"),
        mouse: gl.getUniformLocation(this.prog, "u_mouse"),
        camZ: gl.getUniformLocation(this.prog, "u_camZ"),
        blink: gl.getUniformLocation(this.prog, "u_blink"),
        shake: gl.getUniformLocation(this.prog, "u_shake"),
        isWalking: gl.getUniformLocation(this.prog, "u_isWalking"),
        trip: gl.getUniformLocation(this.prog, "u_trip"),
        yawOffset: gl.getUniformLocation(this.prog, "u_yawOffset"),
        framedKitchen: gl.getUniformLocation(this.prog, "u_framedKitchen"),
        northOpen: gl.getUniformLocation(this.prog, "u_northOpen"),
        southOpen: gl.getUniformLocation(this.prog, "u_southOpen"),
      }),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texFront"), 0),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texBack"), 1),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texLeft"), 2),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texRight"), 3),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texTop"), 4),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texBottom"), 5),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_texDoorLeft"), 7),
      gl.uniform1i(
        gl.getUniformLocation(this.prog, "u_texDoorRight"),
        IS_MOBILE ? 7 : 8,
      ),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_voidVid"), 6),
      gl.uniform1i(gl.getUniformLocation(this.prog, "u_southPortal"), 9),
      (this.texFront = loadStaticTex(
        "files/img/rooms/z2/hallway/FORWARD-MASK.png",
      )),
      (this.texFrontFrame = loadStaticTex(
        "files/img/rooms/z2/hallway/FORWARD-FRAME.png",
      )),
      (this.texKitchen = loadStaticTex(
        "files/img/rooms/z2/hallway/KITCHEN.png",
      )),
      (this.texFrontAlt = loadStaticTex(
        "files/img/rooms/z2/hallway/FORWARD-alt.png",
      )),
      (this.texBack = loadStaticTex("files/img/rooms/z2/hallway/BACK.png")),
      (this.texBackDoor = loadStaticTex(
        "files/img/rooms/z2/hallway/BACK-DOOR.png",
      )),
      (this.texLeft = loadStaticTex("files/img/rooms/z2/hallway/LEFTWALL.png")),
      (this.texRight = loadStaticTex(
        "files/img/rooms/z2/hallway/RIGHTWALL.png",
      )),
      (this.texTop = loadStaticTex("files/img/rooms/z2/hallway/TOP.png")),
      (this.texBottom = loadStaticTex("files/img/rooms/z2/hallway/GROUND.png")),
      (this.texVoidVid = gl.createTexture()),
      gl.bindTexture(gl.TEXTURE_2D, this.texVoidVid),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      ),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
      (this.voidVid =
        (window.__claimPoolVid && window.__claimPoolVid("files/mov/bh3.mp4")) ||
        document.createElement("video")),
      (this.voidVid.muted = !0),
      (this.voidVid.playsInline = !0),
      (this.voidVid.loop = !0),
      this.voidVid.src ||
        ((this.voidVid.preload = "auto"),
        (this.voidVid.autoplay = !0),
        this.voidVid.setAttribute("playsinline", ""),
        this.voidVid.setAttribute("webkit-playsinline", ""),
        (this.voidVid.src = "files/mov/bh3.mp4"),
        window.__registerVideo && window.__registerVideo(this.voidVid)),
      (this.darvazaCanvas = null),
      (this.darvazaGL = null),
      (this.darvazaProg = null),
      (this.START_Z = -3.4),
      (this.camZ = this.START_Z),
      (this.INTERSECTION_Z = 2.4),
      (this.intersectionReached = !1),
      (this.z2ExitMaskTex = loadStaticTex("files/img/void/canalport-mask.png")),
      (this.leftRoom = GLSL.modules.z2_room_left
        ? new Zone2RoomMode(
            "z2_room_left",
            z2LeftTextures.normal || "files/img/rooms/z2/bathroom.png",
          )
        : null),
      (this.rightRoom = GLSL.modules.z2_room_right
        ? new Zone2RoomMode("z2_room_right", "files/img/rooms/z2/bedrooom.png")
        : null),
      (this.activePOV = "center"),
      (this.facing = "N"),
      (this.hallwayYaw = 0),
      (this.hallwayYawTarget = 0),
      (this.z2ExitStarted = !1),
      (this.z2ExitTime = 0),
      (this.z2ExitTex = null),
      (this.z2ExitMaskTex = null),
      (this.pendingPOV = null),
      (this.slideState = "idle"),
      (this.slideStart = 0),
      (this.slideDir = 0),
      (this.slideOffset = 0),
      (this.povSwitchTime = -9999));
    const e = document.getElementById("c");
    ((this.lastCvsW = e ? e.width : window.innerWidth),
      (this.lastCvsH = e ? e.height : window.innerHeight),
      (this.cx = 0),
      (this.cy = 0),
      (this.lastRenderTime = performance.now()),
      (this.seqState = "initial"),
      (this.leftBlinkCount = 0),
      (this.texBathroomBlood = loadStaticTex(
        "files/img/rooms/z2/bathroom-blood.png",
      )),
      (this.texBathroomNormal = this.leftRoom ? this.leftRoom.tex : null),
      (this.texBathroomHole = loadStaticTex(
        "files/img/rooms/z2/bathroom-hole.png",
      )),
      (this.texBathroomClubTurn = loadStaticTex(
        "files/img/rooms/z2/BATHROOM-CLUB-TURN.png",
      )),
      (this.holeProg = gl.createProgram()),
      gl.attachShader(this.holeProg, compile(gl.VERTEX_SHADER, GLSL.vert)),
      gl.attachShader(
        this.holeProg,
        compile(gl.FRAGMENT_SHADER, GLSL.modules.z2_seq_hole),
      ),
      gl.linkProgram(this.holeProg),
      (this.mirrorBlitProg = gl.createProgram()),
      gl.attachShader(
        this.mirrorBlitProg,
        compile(gl.VERTEX_SHADER, GLSL.vert),
      ),
      gl.attachShader(
        this.mirrorBlitProg,
        compile(gl.FRAGMENT_SHADER, GLSL.modules.z2_seq_hole_mirrored),
      ),
      gl.linkProgram(this.mirrorBlitProg),
      gl.getProgramParameter(this.mirrorBlitProg, gl.LINK_STATUS) ||
        console.error(
          "[Zone2] mirror blit program failed to link:",
          gl.getProgramInfoLog(this.mirrorBlitProg),
        ),
      (this.solidProg = gl.createProgram()),
      gl.attachShader(this.solidProg, compile(gl.VERTEX_SHADER, GLSL.vert)),
      gl.attachShader(
        this.solidProg,
        compile(
          gl.FRAGMENT_SHADER,
          "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }",
        ),
      ),
      gl.linkProgram(this.solidProg),
      (this.blackHoleProg = this._buildModuleProgram("z3_alt_blackhole_walk")),
      (this.windowFBO = this.makeFBO()),
      (this.holeFBO = this.makeFBO()),
      (this.mirrorFBO = this.makeFBO()),
      (this.rightHoleFBO = this.makeFBO()),
      (this.rightHolePostFBO = this.makeFBO()),
      (this.forwardPortalFBO = this.makeFBO()),
      (this.southPortalFBO = this.makeFBO()),
      (this.spaceElevatorProg = this._buildModuleProgram("space_elevator")),
      (this.blankMask = gl.createTexture()),
      gl.bindTexture(gl.TEXTURE_2D, this.blankMask),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]),
      ),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      (this.noWindowTex = gl.createTexture()),
      gl.bindTexture(gl.TEXTURE_2D, this.noWindowTex),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0]),
      ),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      (this.mode9_T_create = performance.now()),
      (this.mode9_T_hole = -1),
      "undefined" != typeof ActiveMode &&
        ((this.mode9 = new ActiveMode(9)),
        (this.mode9.maskTex = this.noWindowTex),
        (this.modeBH = new ActiveMode(3)),
        (this.modeBH.maskTex = this.noWindowTex)),
      // deadcity (7) is OUT. Its buildings are files/img/void/ruins01..06 and
      // those images are never allowed on this screen again.
      (this.windowModes = [1, 2, 5, 6]),
      (this.currentWindowModeIndex = Math.floor(
        Math.random() * this.windowModes.length,
      )),
      (this.windowActiveMode = null),
      "undefined" != typeof ActiveMode &&
        ((this.windowActiveMode = new ActiveMode(
          this.windowModes[this.currentWindowModeIndex],
        )),
        (this.windowActiveMode.maskTex = this.noWindowTex)),
      (this.forwardPortalModeFiles = [
        "modes/mode-bh.js",
        "modes/mode4.js",
        "modes/mode5.js",
        // modes/mode6.js (deadcity) removed -- see windowModes above.
        "modes/mode7.js",
        // Not in the ambient rotation — pinned by the blood roll so the north
        // end shows the route waiting there instead of a random city.
        "modes/mode2.js",
        "modes/mode9.js",
      ]),
      (this.forwardPortalModeKeys = [
        "bh",
        "ocean",
        "earth",
        "goreville",
        "fractal",
        "plane",
      ]),
      (this.forwardPortalModes = [3, 5, 6, 8, 2, 9]),
      // Ambient rotation is the first 4 only. "fractal" and "plane" are
      // reserved for the blood roll and never come up at random.
      (this.currentForwardPortalModeIndex = Math.floor(Math.random() * 4)),
      (this.forwardPortalActiveMode = null),
      (this.forwardPortalCleanFX = !0),
      "undefined" != typeof ActiveMode &&
        ((this.forwardPortalActiveMode = new ActiveMode(
          this.forwardPortalModes[this.currentForwardPortalModeIndex],
        )),
        (this.forwardPortalActiveMode.maskTex = this.noWindowTex)),
      (this.lastBlinkTime = performance.now()),
      (this.nextBlinkInterval = 4e3 + 8e3 * Math.random()),
      (this.blinking = !1),
      (this.blinkStart = 0),
      (this.rBlink = 0),
      (this.z2ModeSeed = 100 * Math.random()),
      (this.z2Trip = this._hallucinationTripForLevel(2)),
      (this.modeSwapped = !1),
      (this.z2FractalSeed = 100 * Math.random()),
      (this.z2BlinkPeakTime = performance.now()),
      (this.redStartTime = -1),
      (this.readyForZone3 = !1),
      (this.zone3Route = "z3"),
      // Routes dealt at the blood transition — one per end, both live.
      // N (right from the mirror): "cabin" | "blackhole"
      // S (left  from the mirror): "elevator" | "theater"
      // null until blood engages.
      (this.bloodRouteN = null),
      (this.bloodRouteS = null),
      (this.bloodDealt = null),
      (this.z3Landing = null),
      (this.cabinTunnelTransitionStarted = !1),
      (this.theaterBedroomHandoffStarted = !1),
      (this.z4LeftBlinkCount = 0),
      (this.z4AltBathroomTurnBlinkCount = 0),
      (this.z4AltBathroomTurnEnterStart = 0),
      (this.z4AltBathroomTurnEnterDuration = 1050),
      (this.__z4AltBathroomTurnLanding = !1),
      (this.__z4AltBathroomTurnMotionDone = !1),
      (this.__framedKitchenForwardWall = !1),
      (this.rightBlinkCount = 0),
      (this.z3bTurbulenceStart = -1),
      (this.z3TransitionStarted = !1),
      (this.isDead = !1));
    this._resetZone2BlackholePath();
  }
  _buildModuleProgram(e) {
    if (!GLSL.modules || !GLSL.modules[e]) return null;
    const t = gl.createProgram(),
      i = compile(gl.VERTEX_SHADER, GLSL.vert);
    let o = GLSL.modules[e];
    IS_MOBILE && (o = "#define MOBILE\n" + o);
    const n = compile(gl.FRAGMENT_SHADER, o);
    return i && n
      ? (gl.attachShader(t, i),
        gl.attachShader(t, n),
        gl.linkProgram(t),
        gl.getProgramParameter(t, gl.LINK_STATUS)
          ? t
          : (console.error(
              "[Zone2] shader link error (" + e + "):",
              gl.getProgramInfoLog(t),
            ),
            gl.deleteProgram(t),
            null))
      : (gl.deleteProgram(t), null);
  }
  _bhPathCenterX(e) {
    const t = Math.max(0, Math.min(1, (-e - 50) / 2800));
    return (
      22 * Math.sin(0.00165 * e + 0.7) * t + 3.5 * Math.sin(0.006 * e + 1.8)
    );
  }
  _bhPathCenterY(e) {
    const t = Math.max(0, Math.min(1, (e - -2400) / -700));
    return t * t * (3 - 2 * t) * 30 - 1.25;
  }
  _resetZone2BlackholePath() {
    const e = -260;
    ((this.blackholeSeed = 1e4 * Math.random()),
      (this.bhCamPos = {
        x: this._bhPathCenterX(e),
        y: this._bhPathCenterY(e) + 3.85,
        z: e,
      }),
      (this.bhYaw = 0),
      (this.bhPitch = -0.05),
      (this.bhMovePhase = 0),
      (this.bhSpeed = 0),
      (this.__z2BlackholePathActive = !0));
  }
  _updateZone2BlackholePath(e, t) {
    this.__z2BlackholePathActive || this._resetZone2BlackholePath();
    const i = Math.max(0.2, Math.min(4, t / 33.33)),
      o =
        "z3b_red" === this.seqState ||
        "theater_bedroom_red" === this.seqState,
      n =
        "z3b_turbulence" === this.seqState ||
        "theater_bedroom_turbulence" === this.seqState,
      l = o ? 46 : n ? 24 : 7,
      r = o ? 1.35 : n ? 0.95 : 0.45;
    ((this.bhCamPos.z = Math.max(-3050, this.bhCamPos.z - i * l)),
      (this.bhMovePhase += i * (o ? 22 : n ? 12 : 3.8)),
      (this.bhSpeed += (r - this.bhSpeed) * Math.min(1, 0.18 * i)));
    const s = 0.001 * e,
      a = 0.012 * Math.sin(0.8 * s) + 0.006 * Math.sin(1.3 * s),
      h = 0.015 * Math.sin(0.35 * s) + 0.008 * Math.sin(0.57 * s),
      d = 0.07 * Math.sin(2 * this.bhMovePhase) * this.bhSpeed,
      g = 0.05 * Math.sin(this.bhMovePhase) * this.bhSpeed,
      c = 0.24 * (this.cx || 0) + (o ? 0.4 * Math.sin(0.004 * e) : 0),
      u = 0.11 * (this.cy || 0) - 0.05 + (o ? 0.14 * Math.sin(0.005 * e) : 0);
    ((this.bhCamPos.x = this._bhPathCenterX(this.bhCamPos.z) + g + h),
      (this.bhCamPos.y = this._bhPathCenterY(this.bhCamPos.z) + 3.85 + d + a),
      (this.bhYaw += (c - this.bhYaw) * Math.min(1, 0.1 * i)),
      (this.bhPitch += (u - this.bhPitch) * Math.min(1, 0.1 * i)));
  }
  _renderZone2BlackholePath(e, t, i, o, n) {
    if (!e || !this.bhCamPos) return;
    (gl.useProgram(e),
      gl.uniform2f(gl.getUniformLocation(e, "u_resolution"), t, i),
      gl.uniform1f(gl.getUniformLocation(e, "u_time"), 0.001 * o),
      gl.uniform1f(gl.getUniformLocation(e, "u_yaw"), this.bhYaw || 0),
      gl.uniform1f(gl.getUniformLocation(e, "u_pitch"), this.bhPitch || 0),
      gl.uniform3f(
        gl.getUniformLocation(e, "u_camPos"),
        this.bhCamPos.x,
        this.bhCamPos.y,
        this.bhCamPos.z,
      ),
      gl.uniform1f(
        gl.getUniformLocation(e, "u_movePhase"),
        this.bhMovePhase || 0,
      ),
      gl.uniform1f(gl.getUniformLocation(e, "u_speed"), this.bhSpeed || 0),
      gl.uniform1f(
        gl.getUniformLocation(e, "u_seed"),
        this.blackholeSeed || this.z2ModeSeed || 0,
      ),
      gl.uniform1f(gl.getUniformLocation(e, "u_audio"), n || 0),
      gl.uniform1f(
        gl.getUniformLocation(e, "u_trip"),
        Math.max(
          this.z2Trip || 0,
          "z3b_red" === this.seqState ||
            "theater_bedroom_red" === this.seqState
            ? 2.2
            : "z3b_turbulence" === this.seqState ||
                "theater_bedroom_turbulence" === this.seqState
              ? 1.65
              : 1.1,
        ),
      ),
      gl.activeTexture(gl.TEXTURE0),
      gl.bindTexture(gl.TEXTURE_2D, this.texBottom),
      gl.uniform1i(gl.getUniformLocation(e, "u_texGround"), 0),
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
    const l = gl.getAttribLocation(e, "p");
    (gl.enableVertexAttribArray(l),
      gl.vertexAttribPointer(l, 2, gl.FLOAT, !1, 0, 0),
      gl.drawArrays(gl.TRIANGLES, 0, 3));
  }
  makeFBO() {
    const e = document.getElementById("c");
    var t = e ? e.width : window.innerWidth,
      i = e ? e.height : window.innerHeight;
    IS_MOBILE && ((t = Math.floor(0.5 * t)), (i = Math.floor(0.5 * i)));
    const o = gl.createTexture();
    (gl.bindTexture(gl.TEXTURE_2D, o),
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        t,
        i,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      ),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR));
    const n = gl.createFramebuffer();
    return (
      gl.bindFramebuffer(gl.FRAMEBUFFER, n),
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        o,
        0,
      ),
      gl.bindFramebuffer(gl.FRAMEBUFFER, null),
      {
        fbo: n,
        tex: o,
      }
    );
  }
  _hallucinationTripForLevel(level) {
    return "function" == typeof window.__hallucinationTripForLevel
      ? window.__hallucinationTripForLevel(level)
      : 0.32 * Math.max(0, Math.min(5, level));
  }
  _hallucinationLevelForScene() {
    return 2;
  }
  // Wipe every texture unit an ActiveMode touched. The engine-1 modes bind
  // their own plates on units 0-8 (deadcity puts ruins01..06 there). Leaving
  // those bound is what let a mode photo leak into a Zone 2 plate.
  _clearTexUnits() {
    for (let u = 0; u < 10; u++)
      (gl.activeTexture(gl.TEXTURE0 + u), gl.bindTexture(gl.TEXTURE_2D, null));
    gl.activeTexture(gl.TEXTURE0);
  }
  _blitTex(e, t, i, flipX) {
    // Same rule as the room plates: a dead FBO texture must not fall through to
    // whatever a mode left on unit 0.
    if (!e || !gl.isTexture(e)) return;
    const prog = flipX ? this.mirrorBlitProg : this.holeProg;
    (gl.useProgram(prog),
      gl.disable(gl.BLEND),
      gl.activeTexture(gl.TEXTURE0),
      gl.bindTexture(gl.TEXTURE_2D, null),
      gl.bindTexture(gl.TEXTURE_2D, e),
      gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0),
      gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), t, i),
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
    const o = gl.getAttribLocation(prog, "p");
    (gl.enableVertexAttribArray(o),
      gl.vertexAttribPointer(o, 2, gl.FLOAT, !1, 0, 0),
      gl.drawArrays(gl.TRIANGLES, 0, 3));
  }
  drawOverlay(e, t, i, o) {
    if (o <= 0) return;
    (gl.useProgram(this.solidProg),
      gl.enable(gl.BLEND),
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
      gl.uniform4f(gl.getUniformLocation(this.solidProg, "u_col"), e, t, i, o),
      this.quadBuffer ||
        ((this.quadBuffer = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        )),
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
    const n = gl.getAttribLocation(this.solidProg, "p");
    (gl.enableVertexAttribArray(n),
      gl.vertexAttribPointer(n, 2, gl.FLOAT, !1, 0, 0),
      gl.drawArrays(gl.TRIANGLES, 0, 3),
      gl.disable(gl.BLEND));
  }
  beginSlide(e, t) {
    "idle" === this.slideState &&
      ((this.pendingPOV = e),
      (this.slideDir = t),
      (this.slideState = "out"),
      (this.slideStart = window.lastNow || performance.now()));
  }
  tickSlide(e) {
    if ("idle" === this.slideState) return;
    const t = e - this.slideStart,
      __z4AltSlide = !!this.__z4AltBathroomSlide,
      __slideDur = __z4AltSlide ? 430 : 340,
      __blackHold = __z4AltSlide ? 28 : 80;
    if ("out" === this.slideState) {
      const i = Math.min(t / __slideDur, 1);
      ((this.slideOffset = i * i * window.innerWidth * this.slideDir),
        i >= 1 &&
          ((this.slideOffset = window.innerWidth * this.slideDir),
          (this.slideState = "black"),
          (this.slideStart = e),
          (this.activePOV = this.pendingPOV),
          (this.hallwayYaw = this.hallwayYawTarget),
          window.dispatchEvent(new Event("mouseup")),
          window.dispatchEvent(new Event("touchend")),
          (this.cx = 0),
          (this.cy = 0),
          (this.povSwitchTime = e),
          "S" === this.facing &&
            ("theater_ready" === this.seqState ||
              "theater" === this.bloodRouteS) &&
            this._beginTheaterHandoffSeamless(this.slideDir),
          // North routes hand off on the TURN, same as the theater does on the
          // south turn. They used to make you walk to the north limit first and
          // then flash red while Zone 2 was torn down -- see
          // _beginZone3HandoffSeamless.
          "N" === this.facing &&
            this.bloodRouteN &&
            this._beginZone3HandoffSeamless(this.slideDir)));
    } else if ("black" === this.slideState)
      t >= __blackHold &&
        ((this.slideOffset = -window.innerWidth * this.slideDir),
        (this.slideState = "in"),
        (this.slideStart = e));
    else if ("in" === this.slideState) {
      const e = Math.min(t / __slideDur, 1),
        i = 1 - (1 - e) * (1 - e);
      ((this.slideOffset = -window.innerWidth * this.slideDir * (1 - i)),
        e >= 1 &&
          ((this.slideOffset = 0),
          (this.slideState = "idle"),
          (this.pendingPOV = null),
          (this.__z4AltBathroomSlide = !1)));
    }
    const i = document.getElementById("c");
    i &&
      (i.style.transform =
        0 !== this.slideOffset
          ? `translateX(${this.slideOffset.toFixed(1)}px)`
          : "");
  }
  _getFacing() {
    return this.facing;
  }
  enableFramedKitchenForwardWall() {
    return ((this.__framedKitchenForwardWall = !0), !0);
  }
  // A dealt north route (cabin / blackhole) used to make you walk to the north
  // limit, commit there, and watch a red overlay while Zone 2 was destroyed and
  // Zone 3 built its intro hallway out of the SAME four plates Zone 2 was
  // already drawing -- RIGHTWALL / LEFTWALL_B / TOP / GROUND. The flash was
  // covering a swap between two identical corridors, and until it fired the
  // north end was a dead leg with an ambient mode pasted in the opening.
  // Alec: whatever happens when the red overlay comes should already have
  // happened when the blood room changed over. So the hand-off is now part of
  // the turn out of the bloodied bathroom -- it runs inside the slide's black
  // hold, and Zone 3 opens with its red overlay already spent. No walk-commit,
  // no flash: the corridor you turn into IS Zone 3's intro hallway.
  _beginZone3HandoffSeamless(dir) {
    if (this.z3TransitionStarted) return !1;
    this.z3TransitionStarted = !0;
    const route = "blackhole" === this.bloodRouteN ? "z3b" : "z3";
    ((this.zone3Route = route),
      (this.readyForZone3 = !1),
      (window.z2SpaceHeld = !1),
      (window.z2TouchHeld = !1),
      // destroy() clears #c's transform and tickSlide's tail rewrites it from
      // slideOffset. Zero it or the canvas is left parked a screen width off
      // with nothing alive to slide it back.
      (this.slideOffset = 0));
    try {
      this.destroy();
    } catch (e) {}
    ((window.currentZone2 = null),
      (window.__zone2Governor = null),
      (window.isEngine1Dead = !0));
    if ("function" == typeof window.startZone3) window.startZone3(route);
    else if ("undefined" != typeof Zone3Engine)
      window.currentZone3 = new Zone3Engine(route);
    const z3 = window.currentZone3;
    if (!z3) return (console.error("[BloodRoute] Zone 3 failed to start"), !1);
    // Straight down the intro hallway. Zone 3 opens facing its own side room by
    // default -- "right" on the alt route, the hole-bathroom otherwise -- and
    // turning out of one bathroom into another is exactly what this replaces.
    ((z3.activePOV = "center"),
      (z3.centerPhase = "hallway"),
      (z3.camZ = z3.HALL_START_Z),
      (z3.cx = 0),
      (z3.cy = 0),
      (z3.yawOffset = 0),
      (z3.yawTarget = 0),
      // The turn IS the transition now. Nothing to cover.
      (z3.z3RedDone = !0),
      (z3.z3RedStart = 0));
    (console.log("[BloodRoute] committed N -> " + this.bloodRouteN + " on the turn (zone3Route " + route + ")"),
      this._finishSlideOnCanvas(dir));
    return !0;
  }
  // Zone 2 owned the slide and is gone before the slide-in half ever runs, so
  // finish that half on the canvas directly. Two rAFs: the first parks #c off
  // screen with transitions off, the second starts the ease back to zero.
  _finishSlideOnCanvas(dir) {
    const c = document.getElementById("c");
    if (!c) return !1;
    const off = (-dir * window.innerWidth).toFixed(1);
    requestAnimationFrame(function () {
      ((c.style.transition = "none"),
        (c.style.transform = "translateX(" + off + "px)"));
      requestAnimationFrame(function () {
        ((c.style.transition =
          "transform 340ms cubic-bezier(0.16, 0.84, 0.44, 1)"),
          (c.style.transform = "translateX(0px)"));
        setTimeout(function () {
          ((c.style.transition = ""), (c.style.transform = ""));
        }, 420);
      });
    });
    return !0;
  }
  _beginTheaterHandoffSeamless(dir) {
    if (this.theaterBedroomHandoffStarted) return !1;
    (this.theaterBedroomHandoffStarted = !0),
      (window.z2SpaceHeld = !1),
      (window.z2TouchHeld = !1);
    try {
      this.destroy();
    } catch (e) {}
    (window.currentZone2 = null),
      (window.__zone2Governor = null),
      (window.isEngine1Dead = !0);
    if ("function" == typeof window.startModeTheater) {
      window.startModeTheater({
        fromZone2: !0,
        progress: 0,
        walkHeld: !1,
        touchHeld: !1,
        slideDir: dir,
      });
    } else {
      console.error("[TheaterRoute] mode-theater is not loaded");
    }
    return !0;
  }
  _beginTheaterBedroomHandoff(now) {
    if (this.theaterBedroomHandoffStarted) return !1;
    const theaterTouchHeld = !!window.z2TouchHeld,
      theaterWalkHeld = !!(window.z2SpaceHeld || theaterTouchHeld);
    ("number" != typeof now && (now = performance.now()),
      (this.theaterBedroomHandoffStarted = !0),
      (window.z2SpaceHeld = !1),
      (window.z2TouchHeld = !1));
    let fadeEl = document.getElementById("zone-fade-overlay");
    return (
      fadeEl ||
        ((fadeEl = document.createElement("div")),
        (fadeEl.id = "zone-fade-overlay"),
        document.body.appendChild(fadeEl)),
      (fadeEl.style.cssText =
        "position:fixed;inset:0;background:#d90000;pointer-events:none;transition:opacity 0.24s ease-in-out;z-index:99999;opacity:1;"),
      setTimeout(() => {
        try {
          this.destroy();
        } catch (e) {}
        (window.currentZone2 = null),
          (window.__zone2Governor = null),
          (window.isEngine1Dead = !0),
          "function" == typeof window.startModeTheater
            ? window.startModeTheater({
                fromZone2: !0,
                fromZone2Bedroom: !0,
                progress: 0,
                walkHeld: !1,
                touchHeld: !1,
              })
            : console.error("[TheaterRoute] mode-theater is not loaded"),
          setTimeout(function () {
            fadeEl.style.opacity = "0";
          }, 90);
      }, 90),
      !0
    );
  }
  releaseAltAnnexNffHandoff() {
    const handoff = window.__z4NffZone2Handoff;
    if (!handoff || handoff.releasing) return !1;
    handoff.releasing = !0;
    try {
      handoff.gain && handoff.ctx
        ? handoff.gain.gain.setTargetAtTime(0, handoff.ctx.currentTime, 0.28)
        : handoff.audio && (handoff.audio.volume = 0);
    } catch (e) {}
    return (
      setTimeout(function () {
        try {
          handoff.audio && handoff.audio.pause();
        } catch (e) {}
        try {
          (handoff.source && handoff.source.disconnect(),
            handoff.filter && handoff.filter.disconnect(),
            handoff.gain && handoff.gain.disconnect());
        } catch (e) {}
        try {
          if (
            handoff.main &&
            handoff.main !== handoff.audio &&
            ((handoff.main.muted = !!handoff.mainPrevMuted),
            (handoff.main.volume =
              "number" == typeof handoff.mainPrevVolume
                ? handoff.mainPrevVolume
                : 1),
            handoff.main.play)
          ) {
            const mainPlay = handoff.main.play();
            mainPlay && mainPlay.catch && mainPlay.catch(function () {});
          }
        } catch (e) {}
        window.__z4NffZone2Handoff === handoff &&
          (window.__z4NffZone2Handoff = null);
      }, 900),
      !0
    );
  }
  _povForFacing(f) {
    return "W" === f ? "left" : "E" === f ? "right" : "center";
  }
  _nextFacing(currentFacing, dir) {
    var row = {
      N_B: {
        L: "S",
        R: "S",
      },
      S_B: {
        L: "N",
        R: "N",
      },
      N_A: {
        L: "W",
        R: "E",
      },
      S_A: {
        L: "E",
        R: "W",
      },
      W_A: {
        L: "S",
        R: "N",
      },
      E_A: {
        L: "N",
        R: "S",
      },
    }[currentFacing + (this.intersectionReached ? "_A" : "_B")];
    return row ? row[dir] : currentFacing;
  }
  _yawForFacing(f) {
    return (
      {
        N: 0,
        S: Math.PI,
        W: Math.PI / 2,
        E: -Math.PI / 2,
      }[f] || 0
    );
  }
  checkPOVThreshold(e, t) {
    if (
      !this.__z4AltBathroomTurnLanding &&
      !("idle" !== this.slideState || e - this.povSwitchTime < 600)
    ) {
      var turnLeft = t >= 1.24;
      if (turnLeft || t <= -1.24) {
        var dir = turnLeft ? "L" : "R",
          slideDir = turnLeft ? 1 : -1,
          prevFacing = this.facing,
          newFacing = this._nextFacing(this.facing, dir);
        if (newFacing !== this.facing) {
          ((this.facing = newFacing),
            (this.hallwayYawTarget = this._yawForFacing(newFacing)));
          var newPOV = this._povForFacing(newFacing);
          (this.beginSlide(newPOV, slideDir), (this.povSwitchTime = e));
        }
      }
    }
  }
  // ── Blood-mode route roll ────────────────────────────────────────────────
  // NO turn sequences. ONE of four is dealt the moment the mirror's second
  // blink turns the bathroom bloody — either/or, never both ends:
  //   LEFT  (face S): elevator platform | theater tunnel
  //   RIGHT (face N): cabin             | black hole
  // The end that wasn't dealt stays plain hallway with no way out, and its
  // portal is blanked so nothing projects behind it.
  static get BLOOD_ROUTES() {
    return [
      ["N", "cabin"],
      ["N", "blackhole"],
      ["S", "elevator"],
      ["S", "theater"],
    ];
  }
  // Single entry point into blood mode. Every path that reaches blood must go
  // through here, or you land in blood with no routes dealt and both turns do
  // nothing.
  _enterBloodMode() {
    return (
      this.leftRoom && (this.leftRoom.tex = this.texBathroomBlood),
      (this.seqState = "blood"),
      this.bloodDealt || this._rollHallDestination(),
      !0
    );
  }
  _rollHallDestination() {
    // Debug override: whichever of 1/2/3/4 is held at this instant wins.
    const forced = window.__z2ForceRoute || null,
      deal = forced
        ? Zone2Engine.BLOOD_ROUTES.filter((r) => r[1] === forced)[0] ||
          Zone2Engine.BLOOD_ROUTES[Math.floor(Math.random() * 4)]
        : Zone2Engine.BLOOD_ROUTES[Math.floor(Math.random() * 4)],
      side = deal[0],
      route = deal[1];
    forced && console.log("[BloodRoute] FORCED by held key -> " + route);
    ((this.bloodRouteN = "N" === side ? route : null),
      (this.bloodRouteS = "S" === side ? route : null),
      (this.bloodDealt = route),
      (this.readyForZone3 = !1),
      (window.__bloodRouteN = this.bloodRouteN),
      (window.__bloodRouteS = this.bloodRouteS));
    // ONLY the dealt end changes. A south deal leaves the north end exactly as
    // it was — fence with the ambient modes rotating behind it.
    // cabin pins "fractal", NOT "plane". mode9 / the oncoming plane is out of
    // the hallway flow entirely — the cabin route no longer teases with it, and
    // pinning it here put the plane at the north end every single cabin roll.
    // The blink handler below has said "cabin -> fractal" the whole time; this
    // line was the one that disagreed.
    this.bloodRouteN &&
      this._setForwardPortalMode(
        "blackhole" === this.bloodRouteN ? "bh" : "fractal",
      );
    // Everything is in place the moment the bathroom turns red — including
    // where Zone 3 opens. Nothing is worked out later.
    // BOTH north routes come in through Zone 3's own INTRO HALLWAY. Bathroom ->
    // right turn -> you are looking down the intro hall, you walk it, and the
    // hall itself delivers you: alt route -> the void at HALL_END_Z, cabin ->
    // the cabin. Landing on the destination (centerPhase "void" / "cabin" at
    // HALL_END_Z) is what skipped the entire approach.
    // The ONLY thing that needs forcing is activePOV: Zone 3 opens facing its
    // own side room by default ("right" on the alt route, "left" -- the Z3
    // bathroom -- otherwise) and you are supposed to arrive facing down the
    // hall. centerPhase "hallway" and camZ = HALL_START_Z are already Zone 3's
    // constructor defaults, so leave them alone.
    this.z3Landing =
      "cabin" === route || "blackhole" === route
        ? { activePOV: "center", centerPhase: "hallway", atHallStart: !0 }
        : null;
    // The theater is the one route whose world lives in another engine, so it
    // used to arrive completely cold: mode-theater built its screen videos and
    // hallway textures inside the turn out of the bathroom, and that construction
    // cost IS the stall. Warm it here instead, with the blood, exactly like the
    // north portal and the elevator platform are armed here.
    "theater" === route ? this._warmTheater() : this._releaseTheaterWarm();
    console.log("[BloodRoute] dealt " + route + " at the " + side + " end");
    return route;
  }
  // Pre-buy everything mode-theater would otherwise fetch at handoff time. GL
  // objects can't be made early (mode-theater takes over this same canvas), but
  // the two mapped screen videos and the hallway plates are pure network/decode
  // work and they are the expensive part. startModeTheater claims what's here.
  _warmTheater() {
    if (window.__theaterWarm) return null;
    const list = (window.MAPPED_VIDEOS || []).slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)),
        tmp = list[i];
      ((list[i] = list[j]), (list[j] = tmp));
    }
    const srcs = list.length
      ? [
          "files/mov/mapped/" + list[0],
          "files/mov/mapped/" + list[1 % list.length],
        ]
      : ["files/mov/mapped/crywolf.mp4", "files/mov/mapped/grate.mp4"];
    const videos = srcs.map(function (src) {
      const v = document.createElement("video");
      ((v.src = src),
        (v.muted = !0),
        (v.loop = !0),
        (v.autoplay = !0),
        (v.playsInline = !0),
        (v.preload = "auto"),
        v.setAttribute("playsinline", ""),
        v.setAttribute("webkit-playsinline", ""),
        window.__registerVideo
          ? window.__registerVideo(v)
          : ((window.__ALL_VIDEOS = window.__ALL_VIDEOS || []),
            window.__ALL_VIDEOS.push(v)));
      const p = v.play && v.play();
      return (p && p.catch && p.catch(function () {}), v);
    });
    const images = [
      "FORWARD-FRAME",
      "KITCHEN",
      "BACK",
      "LEFTWALL",
      "RIGHTWALL",
      "TOP",
      "GROUND",
    ].map(function (n) {
      const im = new Image();
      return (
        (im.crossOrigin = "anonymous"),
        (im.src = "files/img/rooms/z2/hallway/" + n + ".png"),
        im
      );
    });
    ((window.__theaterWarm = { srcs: srcs, videos: videos, images: images }),
      console.log("[BloodRoute] theater warmed with the blood", srcs));
    return window.__theaterWarm;
  }
  // Drop an unclaimed warm bundle — a re-roll that lands somewhere other than
  // the theater must not leave two mapped videos decoding in the background.
  _releaseTheaterWarm() {
    const warm = window.__theaterWarm;
    if (!warm) return !1;
    window.__theaterWarm = null;
    (warm.videos || []).forEach(function (v) {
      try {
        (v.pause(), v.removeAttribute("src"), v.load());
      } catch (e) {}
      try {
        v.parentNode && v.parentNode.removeChild(v);
      } catch (e) {}
      const all = window.__ALL_VIDEOS;
      if (all) {
        const i = all.indexOf(v);
        i >= 0 && all.splice(i, 1);
      }
    });
    return !0;
  }
  // Route readout. OFF unless this is a debug session — hold D on the splash
  // screen, the same gate the debug-ui panel uses (site-ui.js `__debugAllowed`).
  // It used to draw unconditionally, so every player got the green box.
  _z2Hud() {
    const allowed =
      "undefined" != typeof __debugAllowed
        ? !!__debugAllowed
        : !!window.__debugAllowed;
    let el = document.getElementById("z2-hud");
    if (!allowed) {
      (el && el.parentNode && el.parentNode.removeChild(el));
      return;
    }
    if (!el) {
      if (!document.body) return;
      ((el = document.createElement("div")),
        (el.id = "z2-hud"),
        (el.style.cssText =
          "position:fixed;left:8px;top:8px;z-index:2147483647;font:12px/1.4 monospace;" +
          "color:#0f0;background:rgba(0,0,0,.8);border:1px solid #0f0;padding:6px 9px;" +
          "white-space:pre;pointer-events:none;"),
        document.body.appendChild(el));
    }
    const portal = this.bloodRouteN
        ? this.bloodRouteN + " — fence gone, wall fully open"
        : "fence + mode " +
          (this.forwardPortalActiveMode
            ? this.forwardPortalModes[this.currentForwardPortalModeIndex]
            : "-"),
      northLimit = this.bloodRouteN
        ? this.INTERSECTION_Z + 0.8
        : this.INTERSECTION_Z,
      walkHeld = !!(window.z2SpaceHeld || window.z2TouchHeld);
    el.textContent =
      "Z2  build z2dest-roll+mirrorflip\n" +
      "seq    " + this.seqState + "\n" +
      "pov    " + this.activePOV + "   facing " + this.facing + "\n" +
      "DEALT  " + (this.bloodDealt || "— nothing dealt —") + "\n" +
      "       N:" + (this.bloodRouteN || "-") + "  S:" + (this.bloodRouteS || "-") + "\n" +
      "FORCE  " +
        (window.__z2ForceRoute
          ? "HOLDING -> " + window.__z2ForceRoute
          : "- (hold 1 elev / 2 tunnel / 3 bh / 4 cabin)") + "\n" +
      "north  " + portal + "\n" +
      "facing " +
        ("N" === this.facing
          ? this.bloodRouteN
            ? "NO FENCE — open to " + this.bloodRouteN
            : "FORWARD-MASK.png (fence)"
          : "S" === this.facing
            ? "elevator" === this.bloodRouteS
              ? "NO PLATE — space elevator platform"
              : "BACK.png (plate)"
            : "side wall / room") +
        "\n" +
      "camZ   " + (+this.camZ).toFixed(2) + " / " + northLimit.toFixed(2) +
      "   walk " + walkHeld + "\n" +
      "route  " + this.zone3Route +
      "   ready " + !!this.readyForZone3 + "   exit " + !!this.z2ExitStarted;
  }
  // Drop the forward-cutout mode so the north end falls back to the plain void
  // texture. Nothing to look at, nothing to walk into.
  _clearForwardPortalMode() {
    try {
      this.forwardPortalActiveMode && this.forwardPortalActiveMode.destroy();
    } catch (err) {}
    return ((this.forwardPortalActiveMode = null), !0);
  }
  _bloodRouteForFacing(f) {
    return "N" === f ? this.bloodRouteN : "S" === f ? this.bloodRouteS : null;
  }
  _setForwardPortalMode(key) {
    const idx = this.forwardPortalModeKeys
      ? this.forwardPortalModeKeys.indexOf(key)
      : -1;
    if (idx < 0 || "undefined" == typeof ActiveMode) return !1;
    if (
      this.currentForwardPortalModeIndex === idx &&
      this.forwardPortalActiveMode
    )
      return !0;
    try {
      this.forwardPortalActiveMode && this.forwardPortalActiveMode.destroy();
    } catch (err) {}
    return (
      (this.currentForwardPortalModeIndex = idx),
      (this.forwardPortalActiveMode = new ActiveMode(
        this.forwardPortalModes[idx],
      )),
      (this.forwardPortalActiveMode.maskTex = this.noWindowTex),
      !0
    );
  }
  render(e, t, i, o, n, l, r) {
    if (this.isDead) return;
    this._z2Hud();
    this.z2Trip = this._hallucinationTripForLevel(
      this._hallucinationLevelForScene(),
    );
    if (this.readyForZone3 && !this.z3TransitionStarted) {
      this.z3TransitionStarted = !0;
      const e =
        "bedroom_2" === this.seqState ||
        "z3b_turbulence" === this.seqState ||
        "z3b_red" === this.seqState ||
        "z3b" === this.zone3Route
          ? "z3b"
          : "z3";
      // What the north end was showing is what you land in. Zone 3 opens at
      // Zone 3 opens facing its own side room by default — activePOV "left" is
      // the Z3 BATHROOM, and arriving in another bathroom is wrong. Turn it to
      // face down the intro hallway instead. Do NOT jump to the destination:
      // the walk down that hall IS the intro to whichever route was dealt.
      // Apply SYNCHRONOUSLY — startZone3 builds currentZone3 on the spot, so
      // any delay lets Zone 3 paint its default opening for a frame or two
      // before it snaps.
      const landing = this.z3Landing,
        applyLanding = function () {
          const z3 = window.currentZone3;
          if (!z3 || !landing) return;
          ((z3.activePOV = landing.activePOV),
            (z3.centerPhase = landing.centerPhase),
            landing.cabinState && (z3.cabinState = landing.cabinState),
            landing.voidStart && (z3.voidStart = performance.now()),
            // No red here either. This is only the fallback path now -- the
            // turn out of the bloodied bathroom normally hands off first, via
            // _beginZone3HandoffSeamless -- but a red flash between two
            // corridors built from the same plates is the seam Alec called out.
            (z3.z3RedDone = !0),
            (z3.z3RedStart = 0),
            (z3.camZ = landing.atHallStart
              ? z3.HALL_START_Z
              : z3.HALL_END_Z + (landing.camZOffset || 0)));
        };
      return (
        this.destroy(),
        void ("function" == typeof window.startZone3
          ? (window.startZone3(e), applyLanding())
          : "undefined" != typeof Zone3Engine &&
            ((window.currentZone3 = new Zone3Engine(e)), applyLanding()))
      );
    }
    let s = e - this.lastRenderTime;
    if (
      (s > 250 && (s = 33.33),
      (this.lastRenderTime = e),
      (window.lastNow = e),
      window.butterchurnVisualizer && window.butterchurnVisualizer.render(),
      void 0 === this.cx && ((this.cx = t), (this.cy = i)),
      (this.cx += 0.12 * (t - this.cx)),
      (this.cy += 0.12 * (i - this.cy)),
      this.__z4AltBathroomTurnLanding)
    ) {
      const __ed = this.z4AltBathroomTurnEnterDuration || 1050,
        __age = e - (this.z4AltBathroomTurnEnterStart || e);
      if (__age < __ed) {
        const __ep = Math.max(0, Math.min(1, __age / __ed)),
          __ease = 1 - Math.pow(1 - __ep, 3);
        ((this.cx = 2.4 * (1 - __ease)), (this.cy = 0.3 * (1 - __ease)));
      } else
        this.__z4AltBathroomTurnMotionDone ||
          ((this.__z4AltBathroomTurnMotionDone = !0),
          (this.cx = 0),
          (this.cy = 0),
          "number" == typeof window.mx && (window.mx = 0),
          "number" == typeof window.my && (window.my = 0));
    }
    let a = 0;
    if (window.audioAnalyser) {
      window.audioAnalyser.getByteFrequencyData(window.audioData);
      let e = 0;
      for (let t = 0; t < 6; t++) e += window.audioData[t];
      a = e / 1530;
    }
    let h = 0.1 * a;
    var d = 0;
    ("blood" === this.seqState && (d = 0.4),
      "hole" === this.seqState && (d = 1.2),
      "red" === this.seqState && (d = 1.8),
      "bedroom_visited" === this.seqState && (d = 0.2),
      "bedroom_2" === this.seqState && (d = 0.8),
      "z3b_turbulence" === this.seqState && (d = 1.3),
      "z3b_red" === this.seqState && (d = 1.8),
      "theater_bedroom_turbulence" === this.seqState && (d = 1.3),
      "theater_bedroom_red" === this.seqState && (d = 1.8),
      "theater_ready" === this.seqState && (d = 0.2),
      "z4_bathroom" === this.seqState && (d = 0.6),
      "z4_ready" === this.seqState && (d = 0.3),
      (this.seqIntensity = d));
    var g = Math.min(1, 0.15 * this.leftBlinkCount);
    this.neuralIntensity = this.z2Trip + d + g + 0.3 * a;
    const c = document.getElementById("c"),
      u = c ? c.width : window.innerWidth,
      f = c ? c.height : window.innerHeight;
    if (
      this.modeBH &&
      this.rightHoleFBO
    ) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.rightHoleFBO.fbo);
      gl.viewport(0, 0, u, f);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      window.__tripAmount = this.z2Trip;
      this.modeBH.render(e, 0, 0, a, 0, 0, h, 1, this.z2ModeSeed);
      this._clearTexUnits();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, u, f);
    }
    this.checkPOVThreshold(e, t);
    this.tickSlide(e);
    if (this.isDead) return;

    if (
      (e - this.lastBlinkTime > this.nextBlinkInterval &&
        ((this.blinking = !0),
        (this.blinkStart = e),
        (this.lastBlinkTime = e),
        (this.nextBlinkInterval = 4e3 + 8e3 * Math.random())),
      (this.rBlink = 0),
      this.blinking)
    ) {
      let t = e - this.blinkStart;
      t < 120
        ? (this.rBlink = t / 120)
        : t < 200
          ? ((this.rBlink = 1),
            this.modeSwapped ||
              ((this.modeSwapped = !0),
              this.windowActiveMode && this.windowActiveMode.destroy(),
              // The north-end portal stops cycling once a roll has pinned it
              // (black hole -> "bh", cabin -> "fractal"). Ambient rotation is
              // the first 5 entries only.
              (this.__portalPinned = !!this.bloodRouteN),
              this.__portalPinned ||
                (this.forwardPortalActiveMode &&
                  this.forwardPortalActiveMode.destroy()),
              (this.currentWindowModeIndex =
                (this.currentWindowModeIndex + 1) % this.windowModes.length),
              this.__portalPinned ||
                (this.currentForwardPortalModeIndex =
                  (this.currentForwardPortalModeIndex + 1) % 4),
              "undefined" != typeof ActiveMode &&
                ((this.windowActiveMode = new ActiveMode(
                  this.windowModes[this.currentWindowModeIndex],
                )),
                (this.windowActiveMode.maskTex = this.noWindowTex),
                this.__portalPinned ||
                  ((this.forwardPortalActiveMode = new ActiveMode(
                    this.forwardPortalModes[
                      this.currentForwardPortalModeIndex
                    ],
                  )),
                  (this.forwardPortalActiveMode.maskTex = this.noWindowTex))),
              (this.z2ModeSeed = 100 * Math.random()),
              (this.z2Trip = this._hallucinationTripForLevel(
                this._hallucinationLevelForScene(),
              )),
              (this.z2FractalSeed = 100 * Math.random()),
              (this.z2BlinkPeakTime = e)))
          : t < 320
            ? (this.rBlink = 1 - (t - 200) / 120)
            : ((this.rBlink = 0),
              (this.blinking = !1),
              (this.modeSwapped = !1),
              (this.__z4AltBathroomBlinkConsumed = !1),
              "left" === this.activePOV &&
                "z4_alt_bathroom_turn" === this.seqState &&
                ((this.__z4AltBathroomBlinkConsumed = !0),
                this.z4AltBathroomTurnBlinkCount++,
                this.z4AltBathroomTurnBlinkCount >= 2 &&
                  (this.setLeftRoomTexture && this.setLeftRoomTexture("normal"),
                  this.releaseAltAnnexNffHandoff &&
                    this.releaseAltAnnexNffHandoff(),
                  (this.seqState = "initial"),
                  (this.leftBlinkCount = 0),
                  (this.z4AltBathroomTurnBlinkCount = 0),
                  (this.z4AltBathroomTurnEnterStart = 0),
                  (this.__z4AltBathroomTurnLanding = !1),
                  (this.__z4AltBathroomTurnMotionDone = !1),
                  (this.bloodRouteN = null),
                  (this.bloodRouteS = null),
                  (this.bloodDealt = null),
                  (this.theaterBedroomHandoffStarted = !1),
                  (this.z4LeftBlinkCount = 0),
                  (this.zone3Route = "z3"),
                  (this.__z4RouteDisabledUntil = performance.now() + 12e3))),
              !this.__z4AltBathroomBlinkConsumed &&
                "left" === this.activePOV &&
                "initial" === this.seqState &&
                (this.leftBlinkCount++,
                this.leftBlinkCount >= 2 && this._enterBloodMode()),
              "right" === this.activePOV &&
                "bedroom_2" === this.seqState &&
                (this.rightBlinkCount++,
                this.rightBlinkCount >= 2 &&
                  ((this.seqState =
                    "theater" === this.zone3Route
                      ? "theater_bedroom_turbulence"
                      : "z3b_turbulence"),
                  (this.z3bTurbulenceStart = e))),
              "left" === this.activePOV &&
                "z4_bathroom" === this.seqState &&
                (this.z4LeftBlinkCount++,
                this.z4LeftBlinkCount >= 2 &&
                  (this.leftRoom &&
                    (this.leftRoom.tex = this.texBathroomNormal),
                  (this.seqState = "z4_ready"),
                  (this.zone3Route = "z4"),
                  (this.bloodRouteS = "elevator"))));
    }
    ((this.lastCvsW === u && this.lastCvsH === f) ||
      (this.windowFBO &&
        (gl.deleteTexture(this.windowFBO.tex),
        gl.deleteFramebuffer(this.windowFBO.fbo),
        (this.windowFBO = this.makeFBO())),
      this.holeFBO &&
        (gl.deleteTexture(this.holeFBO.tex),
        gl.deleteFramebuffer(this.holeFBO.fbo),
        (this.holeFBO = this.makeFBO())),
      this.mirrorFBO &&
        (gl.deleteTexture(this.mirrorFBO.tex),
        gl.deleteFramebuffer(this.mirrorFBO.fbo),
        (this.mirrorFBO = this.makeFBO())),
      this.rightHoleFBO &&
        (gl.deleteTexture(this.rightHoleFBO.tex),
        gl.deleteFramebuffer(this.rightHoleFBO.fbo),
        (this.rightHoleFBO = this.makeFBO())),
      this.rightHolePostFBO &&
        (gl.deleteTexture(this.rightHolePostFBO.tex),
        gl.deleteFramebuffer(this.rightHolePostFBO.fbo),
        (this.rightHolePostFBO = this.makeFBO())),
      this.forwardPortalFBO &&
        (gl.deleteTexture(this.forwardPortalFBO.tex),
        gl.deleteFramebuffer(this.forwardPortalFBO.fbo),
        (this.forwardPortalFBO = this.makeFBO())),
      (this.lastCvsW = u),
      (this.lastCvsH = f)),
      this.quadBuffer ||
        ((this.quadBuffer = gl.createBuffer()),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer),
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        )));
    const m =
      "bedroom_2" === this.seqState ||
      "z3b_turbulence" === this.seqState ||
      "z3b_red" === this.seqState ||
      "theater_bedroom_turbulence" === this.seqState ||
      "theater_bedroom_red" === this.seqState;
    if (
      (this.rightRoom && (this.rightRoom.bcSourceTex = null),
      m && this.rightHoleFBO && (this.modeBH || this.blackHoleProg))
    ) {
      const z2BlackholePathActive =
          "bedroom_2" === this.seqState ||
          "z3b_turbulence" === this.seqState ||
          "z3b_red" === this.seqState ||
          "theater_bedroom_turbulence" === this.seqState ||
          "theater_bedroom_red" === this.seqState,
        z2UseBlackholePath =
          z2BlackholePathActive && this.blackHoleProg && this.rightHolePostFBO;
      if (z2UseBlackholePath) {
        (gl.bindFramebuffer(gl.FRAMEBUFFER, this.rightHolePostFBO.fbo),
          gl.viewport(0, 0, u, f),
          gl.clearColor(0, 0, 0, 1),
          gl.clear(gl.COLOR_BUFFER_BIT),
          this._updateZone2BlackholePath(e, s),
          this._renderZone2BlackholePath(this.blackHoleProg, u, f, e, a));
      } else
        (gl.bindFramebuffer(gl.FRAMEBUFFER, this.rightHoleFBO.fbo),
          gl.viewport(0, 0, u, f),
          gl.clearColor(0, 0, 0, 1),
          gl.clear(gl.COLOR_BUFFER_BIT),
          (window.__tripAmount = Math.max(
            this.z2Trip,
            "z3b_turbulence" === this.seqState ? 1.2 : 0.9,
          )),
          this.modeBH &&
            this.modeBH.render(e, 0, 0, a, 0, 0, h, 1, this.z2ModeSeed));
      const t = z2UseBlackholePath
        ? this.rightHolePostFBO.tex
        : this.rightHoleFBO.tex;
      (gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.viewport(0, 0, u, f),
        (this.rightRoom.bcSourceTex = t));
    }
    if (
      (("right" !== this.activePOV && "left" !== this.activePOV) ||
        (gl.bindFramebuffer(gl.FRAMEBUFFER, this.windowFBO.fbo),
        gl.viewport(0, 0, u, f),
        gl.clearColor(0, 0, 0, 1),
        gl.clear(gl.COLOR_BUFFER_BIT),
        this.windowActiveMode &&
          ((this.windowActiveMode.maskTex = this.noWindowTex),
          (window.__tripAmount = this.z2Trip),
          this.windowActiveMode.render(
            e,
            0,
            0,
            a,
            0,
            0,
            h,
            1,
            this.z2ModeSeed,
          )),
        this._clearTexUnits(),
        gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        gl.viewport(0, 0, u, f)),
      "left" === this.activePOV && this.leftRoom)
    ) {
      if (
        (this.rightRoom &&
          (gl.bindFramebuffer(gl.FRAMEBUFFER, this.mirrorFBO.fbo),
          gl.viewport(0, 0, u, f),
          gl.clearColor(0, 0, 0, 1),
          gl.clear(gl.COLOR_BUFFER_BIT),
          this.rightRoom.render(
            e,
            -this.cx,
            this.cy,
            0,
            this.windowFBO.tex,
            h,
            0,
            a,
            this.z2Trip,
            this.z2ModeSeed,
          ),
          gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          gl.viewport(0, 0, u, f)),
        gl.clearColor(0, 0, 0, 1),
        gl.clear(gl.COLOR_BUFFER_BIT),
        "hole" === this.seqState)
      ) {
        if (this.mode9 && this.holeFBO) {
          (gl.bindFramebuffer(gl.FRAMEBUFFER, this.holeFBO.fbo),
            gl.viewport(0, 0, u, f),
            gl.clearColor(0, 0, 0, 1),
            gl.clear(gl.COLOR_BUFFER_BIT));
          let t = e;
          (this.mode9_T_hole > 0 &&
            (t = e - this.mode9_T_hole + this.mode9_T_create),
            (window.__tripAmount = this.z2Trip),
            this.mode9.render(t, 0, 0, a, 0, 0, h, 1, this.z2ModeSeed),
            this._clearTexUnits(),
            gl.bindFramebuffer(gl.FRAMEBUFFER, null),
            gl.viewport(0, 0, u, f),
            gl.useProgram(this.holeProg),
            gl.disable(gl.BLEND),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, this.holeFBO.tex),
            gl.uniform1i(gl.getUniformLocation(this.holeProg, "u_tex"), 0),
            gl.uniform2f(
              gl.getUniformLocation(this.holeProg, "u_resolution"),
              u,
              f,
            ));
          const i = gl.getUniformLocation(this.holeProg, "u_time"),
            o = gl.getUniformLocation(this.holeProg, "u_trip"),
            n = gl.getUniformLocation(this.holeProg, "u_seed"),
            l = gl.getUniformLocation(this.holeProg, "u_blink");
          (i && gl.uniform1f(i, 0.001 * e),
            o && gl.uniform1f(o, Math.max(this.z2Trip, 1.05)),
            n && gl.uniform1f(n, this.z2ModeSeed),
            l && gl.uniform1f(l, this.rBlink),
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
          const r = gl.getAttribLocation(this.holeProg, "p");
          (gl.enableVertexAttribArray(r),
            gl.vertexAttribPointer(r, 2, gl.FLOAT, !1, 0, 0),
            gl.drawArrays(gl.TRIANGLES, 0, 3),
            e - this.mode9_T_hole >= 4400 &&
              ((this.seqState = "red"),
              (this.redStartTime = e),
              gl.bindFramebuffer(gl.FRAMEBUFFER, this.holeFBO.fbo),
              gl.clearColor(0, 0, 0, 1),
              gl.clear(gl.COLOR_BUFFER_BIT),
              gl.bindFramebuffer(gl.FRAMEBUFFER, null)));
        }
        (gl.enable(gl.BLEND),
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
          this.leftRoom.render(
            e,
            this.cx,
            this.cy,
            0,
            this.mirrorFBO.tex,
            h,
            0,
            a,
            this.z2Trip,
            this.z2ModeSeed,
          ),
          gl.disable(gl.BLEND),
          "function" == typeof drawHallucinationOverlay &&
            drawHallucinationOverlay(
              e,
              this.z2Trip,
              this.z2FractalSeed,
              0.001 * (e - this.z2BlinkPeakTime),
              2,
            ));
      } else if ("red" === this.seqState) {
        if ((this.drawOverlay(0, 0, 0, 1), this.redStartTime > 0)) {
          let t = e - this.redStartTime,
            i = 0;
          (t < 400
            ? (i = t / 400)
            : t < 2e3
              ? (i = 1 - (t - 400) / 1600)
              : t < 4500
                ? (i = 0)
                : t < 6500
                  ? (i = (t - 4500) / 2e3)
                  : ((i = 1), t > 7e3 && (this.readyForZone3 = !0)),
            i > 0.001 && this.drawOverlay(0.8, 0, 0, i));
        }
      } else {
        if (
          (this._blitTex(this.mirrorFBO.tex, u, f, 1),
          gl.enable(gl.BLEND),
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
          this.leftRoom.render(
            e,
            this.cx,
            this.cy,
            0,
            this.mirrorFBO.tex,
            h,
            0,
            a,
            this.z2Trip,
            this.z2ModeSeed,
          ),
          gl.disable(gl.BLEND),
          "blood" === this.seqState)
        ) {
          let t = 0.5 + 0.5 * Math.sin(0.001 * e);
          this.drawOverlay(0.05 * t, 0, 0, 0.65);
        }
        "function" == typeof drawHallucinationOverlay &&
          drawHallucinationOverlay(
            e,
            this.forwardPortalCleanFX ? 0 : this.z2Trip,
            this.z2FractalSeed,
            0.001 * (e - this.z2BlinkPeakTime),
            2,
          );
      }
      this.rBlink > 0.001 && this.drawOverlay(0, 0, 0, this.rBlink);
    } else if ("right" === this.activePOV && this.rightRoom) {
      const t =
          "z3b_turbulence" === this.seqState ||
          "theater_bedroom_turbulence" === this.seqState,
        i =
          "z3b_red" === this.seqState ||
          "theater_bedroom_red" === this.seqState,
        o = h + (t ? 0.12 + 0.06 * Math.sin(0.03 * e) : 0),
        n = t ? 0.15 + 0.1 * Math.abs(Math.sin(0.021 * e)) : 0;
      if (
        (this.rightRoom.render(
          e,
          this.cx,
          this.cy,
          0,
          this.windowFBO.tex,
          o,
          n,
          a,
          this.z2Trip,
          this.z2ModeSeed,
        ),
        ("blood" !== this.seqState &&
          "bedroom_visited" !== this.seqState &&
          "hole" !== this.seqState &&
          "red" !== this.seqState) ||
          this.drawOverlay(0, 0, 0.05, 0.65),
        "bedroom_2" === this.seqState && this.drawOverlay(0, 0, 0.03, 0.45),
        t && this.z3bTurbulenceStart > 0)
      ) {
        const t = e - this.z3bTurbulenceStart,
          i = 0.28 + 0.18 * Math.abs(Math.sin(0.035 * e));
        (this.drawOverlay(0.16, 0, 0, i),
          t >= 2600 &&
            ((this.seqState =
              "theater" === this.zone3Route
                ? "theater_bedroom_red"
                : "z3b_red"),
            (this.redStartTime = e)));
      }
      i && this.redStartTime <= 0 && (this.redStartTime = e);
      if (i && this.redStartTime > 0) {
        const t = e - this.redStartTime;
        let i = 0;
        if ("theater_bedroom_red" === this.seqState) {
          t < 450
            ? (i = t / 450)
            : t < 700
              ? (i = 1)
              : t < 1700
                ? (i = 1 - (t - 700) / 1000)
                : ((this.seqState = "theater_ready"),
                  (this.redStartTime = 0));
                  // Player stays in the Z2 hallway facing the bedroom (E).
                  // A right-slide (E→S) fires _beginTheaterHandoffSeamless
                  // once facing south, connecting to the theater tunnel.
        } else
          t < 450
            ? (i = t / 450)
            : t < 2100
              ? (i = 1)
              : t < 3100
                ? (i = 1 - (t - 2100) / 1e3)
                : ((this.readyForZone3 = !0), (this.zone3Route = "z3b"));
        i > 0.001 && this.drawOverlay(0.85, 0, 0, i);
      }
      ("function" == typeof drawHallucinationOverlay &&
          drawHallucinationOverlay(
            e,
            this.z2Trip,
            this.z2FractalSeed,
            0.001 * (e - this.z2BlinkPeakTime),
            2,
          ),
        this.rBlink > 0.001 && this.drawOverlay(0, 0, 0, this.rBlink));
    } else {
      (gl.clearColor(0, 0, 0, 1), gl.clear(gl.COLOR_BUFFER_BIT));
      let t = 0;
      var _f = this.facing,
        _seqActive = "initial" !== this.seqState;
      const southLimit = this.START_Z;
      // Once blood is dealt BOTH ends are live. The north end opens up past the
      // intersection so you can walk into whatever the north roll gave you;
      // before blood it stays capped at the intersection like it always was.
      const northRouteLive = !!this.bloodRouteN;
      const northLimit = northRouteLive
        ? this.INTERSECTION_Z + 0.8
        : this.INTERSECTION_Z;
      (("N" === _f && this.camZ < northLimit) || "S" === _f) &&
        (window.z2SpaceHeld || window.z2TouchHeld) &&
        ((this.camZ += "S" === _f ? -0.04 : 0.04),
        (t = 1),
        this.camZ >= this.INTERSECTION_Z && (this.intersectionReached = !0),
        this.camZ >= northLimit &&
          ((this.camZ = northLimit),
          (t = 0),
          northRouteLive &&
            !this.readyForZone3 &&
            ((this.readyForZone3 = !0),
            (this.zone3Route =
              "blackhole" === this.bloodRouteN ? "z3b" : "z3"),
            console.log(
              "[BloodRoute] committed N -> " +
                this.bloodRouteN +
                " (zone3Route " +
                this.zone3Route +
                ")",
            ))),
        this.camZ <= southLimit && ((this.camZ = southLimit), (t = 0)),
        "S" === _f &&
          this.camZ < this.INTERSECTION_Z &&
          this.intersectionReached &&
          (this.intersectionReached = !1),
        // South only lets you out when the deal landed there (or pre-blood,
        // where walking south has always been the way back to Zone 1).
        !("S" === _f && this.camZ <= -1.9) ||
          this.z2ExitStarted ||
          (this.bloodDealt && !this.bloodRouteS) ||
          ((this.z2ExitStarted = !0), (this.z2ExitTime = performance.now())));
      let i = Math.max(
        0,
        Math.min(
          1,
          (this.camZ - this.START_Z) / (this.INTERSECTION_Z - this.START_Z),
        ),
      );
      (window.__audioWetGain &&
        (window.__audioWetGain.gain.value = 0.7 * (1 - 0.9 * i)),
        window.__audioDryGain &&
          (window.__audioDryGain.gain.value = 0.3 + 0.7 * i));
      const framedForwardWall = this.__framedKitchenForwardWall;
      let forwardPortalTex = this.__framedKitchenForwardWall
        ? this.texKitchen
        : this.texVoidVid;
      if (
        !framedForwardWall &&
        this.forwardPortalActiveMode &&
        this.forwardPortalFBO
      ) {
        (gl.bindFramebuffer(gl.FRAMEBUFFER, this.forwardPortalFBO.fbo),
          gl.viewport(0, 0, u, f),
          gl.disable(gl.BLEND),
          gl.disable(gl.DEPTH_TEST),
          gl.clearColor(0, 0, 0, 1),
          gl.clear(gl.COLOR_BUFFER_BIT),
          (this.forwardPortalActiveMode.maskTex = this.noWindowTex));
        const z2ForwardPortalPrevTripAmount =
          "number" == typeof window.__tripAmount ? window.__tripAmount : 0;
        let z2ForwardPortalPrevTripIntensity = null;
        try {
          "undefined" != typeof tripIntensity &&
            ((z2ForwardPortalPrevTripIntensity = tripIntensity),
            (tripIntensity = 0));
        } catch (err) {}
        window.__tripAmount = 0;
        try {
          this.forwardPortalActiveMode.render(
            e,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            this.z2ModeSeed,
          );
        } catch (err) {
          console.error("[Zone2] FORWARD-MASK portal render failed:", err);
        }
        this._clearTexUnits();
        window.__tripAmount = z2ForwardPortalPrevTripAmount;
        try {
          null !== z2ForwardPortalPrevTripIntensity &&
            "undefined" != typeof tripIntensity &&
            (tripIntensity = z2ForwardPortalPrevTripIntensity);
        } catch (err) {}
        (gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          gl.viewport(0, 0, u, f),
          (forwardPortalTex = this.forwardPortalFBO.tex));
      }
      (gl.activeTexture(gl.TEXTURE6),
        this.modeBH && this.rightHoleFBO
          ? gl.bindTexture(gl.TEXTURE_2D, this.rightHoleFBO.tex)
          : gl.bindTexture(gl.TEXTURE_2D, this.texVoidVid),
        this.seqState);
      const n = m
        ? this.rightHolePostFBO && this.rightHolePostFBO.tex
          ? this.rightHolePostFBO.tex
          : this.rightHoleFBO
            ? this.rightHoleFBO.tex
            : this.texVoidVid
        : this.texVoidVid;
      (this._blitTex(n, u, f),
        gl.enable(gl.BLEND),
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA));
      // Space elevator platform for the south end. Rendered into its own FBO
      // only when the elevator is the dealt route. u_walk pulls the camera in
      // as you walk south toward it.
      const southOpen =
        "elevator" === this.bloodRouteS && !!this.spaceElevatorProg;
      if (southOpen) {
        // Fixed framing — no dolly. This used to ramp with camZ, which zoomed
        // the platform toward you while the hallway was already carrying you
        // toward it. SOUTH_ELEVATOR_FRAMING is the knob: 0 is far off, 1 is
        // standing on the deck.
        const walk = 0.34;
        (gl.bindFramebuffer(gl.FRAMEBUFFER, this.southPortalFBO.fbo),
          gl.viewport(0, 0, u, f),
          gl.disable(gl.BLEND),
          gl.useProgram(this.spaceElevatorProg));
        const P = this.spaceElevatorProg,
          uRes = gl.getUniformLocation(P, "u_resolution"),
          uTime = gl.getUniformLocation(P, "u_time"),
          uWalk = gl.getUniformLocation(P, "u_walk"),
          uMouse = gl.getUniformLocation(P, "u_mouse");
        (uRes && gl.uniform2f(uRes, u, f),
          uTime && gl.uniform1f(uTime, 0.001 * e),
          uWalk && gl.uniform1f(uWalk, walk),
          uMouse && gl.uniform2f(uMouse, this.cx, this.cy),
          gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
        const aP = gl.getAttribLocation(P, "p");
        (gl.enableVertexAttribArray(aP),
          gl.vertexAttribPointer(aP, 2, gl.FLOAT, !1, 0, 0),
          gl.drawArrays(gl.TRIANGLES, 0, 3),
          gl.bindFramebuffer(gl.FRAMEBUFFER, null),
          gl.viewport(0, 0, u, f));
      }
      const l = framedForwardWall ? this.texFrontFrame : this.texFront,
        backTex =
          "z4_ready" === this.seqState ||
          "z4" === this.zone3Route ||
          "elevator" === this.bloodRouteS
            ? this.texBackDoor
            : this.texBack;
      (gl.useProgram(this.prog),
        gl.activeTexture(gl.TEXTURE0),
        gl.bindTexture(gl.TEXTURE_2D, l),
        gl.activeTexture(gl.TEXTURE1),
        gl.bindTexture(gl.TEXTURE_2D, backTex),
        gl.activeTexture(gl.TEXTURE2),
        gl.bindTexture(gl.TEXTURE_2D, this.texLeft),
        gl.activeTexture(gl.TEXTURE3),
        gl.bindTexture(gl.TEXTURE_2D, this.texRight),
        gl.activeTexture(gl.TEXTURE4),
        gl.bindTexture(gl.TEXTURE_2D, this.texTop),
        gl.activeTexture(gl.TEXTURE5),
        gl.bindTexture(gl.TEXTURE_2D, this.texBottom),
        gl.activeTexture(gl.TEXTURE6),
        gl.bindTexture(gl.TEXTURE_2D, forwardPortalTex || this.texVoidVid),
        gl.activeTexture(gl.TEXTURE7),
        gl.bindTexture(
          gl.TEXTURE_2D,
          "hole" === this.seqState || "red" === this.seqState
            ? this.holeFBO.tex
            : this.mirrorFBO.tex,
        ),
        IS_MOBILE ||
          (gl.activeTexture(gl.TEXTURE8),
          gl.bindTexture(gl.TEXTURE_2D, this.windowFBO.tex)),
        gl.uniform2f(this.U.res, u, f),
        gl.uniform1f(this.U.time, 0.001 * e),
        gl.uniform2f(this.U.mouse, this.cx, this.cy),
        gl.uniform1f(this.U.camZ, this.camZ),
        gl.uniform1f(this.U.blink, this.rBlink),
        gl.uniform1f(this.U.shake, h),
        gl.uniform1f(this.U.isWalking, t),
        gl.uniform1f(this.U.trip, this.z2Trip),
        gl.uniform1f(this.U.yawOffset, this.hallwayYaw),
        gl.uniform1f(this.U.framedKitchen, framedForwardWall ? 1 : 0),
        this.U.northOpen &&
          gl.uniform1f(this.U.northOpen, this.bloodRouteN ? 1 : 0),
        this.U.southOpen && gl.uniform1f(this.U.southOpen, southOpen ? 1 : 0),
        gl.activeTexture(gl.TEXTURE9),
        gl.bindTexture(
          gl.TEXTURE_2D,
          southOpen ? this.southPortalFBO.tex : this.texVoidVid,
        ),
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
      const r = gl.getAttribLocation(this.prog, "p");
      (gl.enableVertexAttribArray(r),
        gl.vertexAttribPointer(r, 2, gl.FLOAT, !1, 0, 0),
        gl.drawArrays(gl.TRIANGLES, 0, 3),
        gl.disable(gl.BLEND),
        "function" == typeof drawHallucinationOverlay &&
          drawHallucinationOverlay(
            e,
            this.z2Trip,
            this.z2FractalSeed,
            0.001 * (e - this.z2BlinkPeakTime),
            2,
          ),
        this.rBlink > 0.001 && this.drawOverlay(0, 0, 0, this.rBlink));
    }
    if (this.z2ExitStarted && !this.z2ExitDone && !this.z2ExitOverlay) {
      this.z2ExitDone = !0;
      var fadeEl = document.getElementById("zone-fade-overlay");
      (fadeEl ||
        (((fadeEl = document.createElement("div")).id = "zone-fade-overlay"),
        (fadeEl.style.cssText =
          "position:fixed;inset:0;background:black;pointer-events:none;transition:opacity 0.6s ease-in-out;z-index:99999;opacity:0;"),
        document.body.appendChild(fadeEl)),
        (this.z2ExitOverlay = fadeEl),
        setTimeout(function () {
          fadeEl.style.opacity = "1";
        }, 20));
      var self = this;
      setTimeout(function () {
        self.destroy();
        window.currentZone2 = null;
        window.__zone2Governor = null;
        if ("z4" === self.zone3Route) window.__z4Route = !0;
        // The "station" roll puts the space-elevator platform at the SOUTH end
        // of the hallway, so walking out of it goes straight into Zone 4. It no
        // longer detours through Zone 1 waiting for the apartment door to open.
        if (
          "elevator" === self.bloodRouteS &&
          "function" == typeof window.startZone4
        ) {
          console.log("[BloodRoute] committed S -> elevator (Zone 4)");
          window.isEngine1Dead = !0;
          window.startZone4();
        } else if ("function" == typeof window.__returnFromZ2) {
          window.__returnFromZ2();
        }
        setTimeout(function () {
          fadeEl.style.opacity = "0";
        }, 100);
      }, 700);
    }
  }
  beginCabinTunnelTransition() {
    if (this.cabinTunnelTransitionStarted) return;
    this.cabinTunnelTransitionStarted = !0;
    let fadeEl = document.getElementById("zone-fade-overlay");
    (fadeEl ||
      ((fadeEl = document.createElement("div")),
      (fadeEl.id = "zone-fade-overlay"),
      document.body.appendChild(fadeEl)),
      (fadeEl.style.cssText =
        "position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity 0.18s ease-out;z-index:99999;"),
      (window.z2SpaceHeld = !1),
      (window.z2TouchHeld = !1),
      setTimeout(function () {
        fadeEl.style.opacity = "1";
      }, 20),
      setTimeout(() => {
        (this.destroy(),
          (window.currentZone2 = null),
          (window.__zone2Governor = null),
          (window.isEngine1Dead = !0),
          (window.__z2CabinTunnelRoute = !0),
          (window.__z4Route = !1),
          (window.__z4RouteActive = !1));
        if ("function" != typeof window.startDesertDreamTunnel) {
          console.error(
            "[CabinTunnelRoute] cabin-tunnel or desert-road not loaded",
          );
        } else {
          window.startDesertDreamTunnel({
            fromZone2: !0,
            startZ: 168,
          });
        }
        setTimeout(function () {
          fadeEl.style.opacity = "0";
          setTimeout(function () {
            fadeEl && fadeEl.parentNode && fadeEl.parentNode.removeChild(fadeEl);
          }, 280);
        }, 180);
      }, 220));
  }
  _enterAltAnnexBathroomTurnLanding(now) {
    return (
      "number" != typeof now && (now = performance.now()),
      (this.activePOV = "left"),
      (this.facing = "W"),
      (this.pendingPOV = null),
      (this.slideState = "idle"),
      (this.slideOffset = 0),
      (this.slideDir = 0),
      (this.povSwitchTime = now),
      (this.hallwayYaw = this._yawForFacing
        ? this._yawForFacing("W")
        : Math.PI / 2),
      (this.hallwayYawTarget = this.hallwayYaw),
      (this.intersectionReached = !0),
      (this.camZ =
        "number" == typeof this.INTERSECTION_Z
          ? this.INTERSECTION_Z
          : this.camZ),
      (this.seqState = "z4_alt_bathroom_turn"),
      (this.zone3Route = "z3"),
      (this.bloodRouteN = null),
      (this.bloodRouteS = null),
      (this.bloodDealt = null),
      (this.theaterBedroomHandoffStarted = !1),
      (this.z4LeftBlinkCount = 0),
      (this.leftBlinkCount = 0),
      (this.z4AltBathroomTurnBlinkCount = 0),
      (this.z4AltBathroomTurnEnterStart = now),
      (this.z4AltBathroomTurnEnterDuration = 1050),
      (this.__fromAltAnnexDoor = !0),
      (this.__z4AltBathroomTurnLanding = !0),
      (this.__z4AltBathroomTurnMotionDone = !1),
      (this.__z4RouteDisabledUntil = now + 12e3),
      this.setLeftRoomTexture && this.setLeftRoomTexture("clubTurn"),
      (window.__z4Route = !1),
      (window.__z4RouteActive = !1),
      (window.mx = 0),
      (window.my = 0),
      (window.z2SpaceHeld = !1),
      (window.z2TouchHeld = !1),
      !0
    );
  }
  setLeftRoomTexture(e) {
    const t = {
      normal: this.texBathroomNormal,
      blood: this.texBathroomBlood,
      hole: this.texBathroomHole,
      clubTurn: this.texBathroomClubTurn,
    }[e];
    return !!(this.leftRoom && t && ((this.leftRoom.tex = t), 1));
  }
  destroy() {
    this.isDead = !0;
    const e = document.getElementById("c");
    if (
      (e && !this.theaterBedroomHandoffStarted && (e.style.transform = ""),
      this.leftRoom && this.leftRoom.destroy(),
      this.rightRoom && this.rightRoom.destroy(),
      this.windowActiveMode && this.windowActiveMode.destroy(),
      this.forwardPortalActiveMode && this.forwardPortalActiveMode.destroy(),
      this.mode9 && this.mode9.destroy(),
      this.windowFBO &&
        (gl.deleteTexture(this.windowFBO.tex),
        gl.deleteFramebuffer(this.windowFBO.fbo)),
      this.holeFBO &&
        (gl.deleteTexture(this.holeFBO.tex),
        gl.deleteFramebuffer(this.holeFBO.fbo)),
      this.mirrorFBO &&
        (gl.deleteTexture(this.mirrorFBO.tex),
        gl.deleteFramebuffer(this.mirrorFBO.fbo)),
      this.rightHoleFBO &&
        (gl.deleteTexture(this.rightHoleFBO.tex),
        gl.deleteFramebuffer(this.rightHoleFBO.fbo)),
      this.rightHolePostFBO &&
        (gl.deleteTexture(this.rightHolePostFBO.tex),
        gl.deleteFramebuffer(this.rightHolePostFBO.fbo)),
      this.forwardPortalFBO &&
        (gl.deleteTexture(this.forwardPortalFBO.tex),
        gl.deleteFramebuffer(this.forwardPortalFBO.fbo)),
      this.quadBuffer && gl.deleteBuffer(this.quadBuffer),
      this.blankMask && gl.deleteTexture(this.blankMask),
      this.noWindowTex && gl.deleteTexture(this.noWindowTex),
      this.voidVid)
    ) {
      try {
        (this.voidVid.pause(),
          this.voidVid.removeAttribute("src"),
          this.voidVid.load());
      } catch (e) {}
      this.voidVid = null;
    }
    if (this.darvazaGL) {
      try {
        this.darvazaGL.getExtension("WEBGL_lose_context") &&
          this.darvazaGL.getExtension("WEBGL_lose_context").loseContext();
      } catch (e) {}
      ((this.darvazaCanvas = null), (this.darvazaGL = null));
    }
    (gl.deleteTexture(this.texFront),
      gl.deleteTexture(this.texFrontFrame),
      gl.deleteTexture(this.texKitchen),
      gl.deleteTexture(this.texFrontAlt),
      gl.deleteTexture(this.texBack),
      gl.deleteTexture(this.texBackAlt),
      gl.deleteTexture(this.texBackDoor),
      gl.deleteTexture(this.texLeft),
      gl.deleteTexture(this.texRight),
      gl.deleteTexture(this.texTop),
      gl.deleteTexture(this.texBottom),
      gl.deleteTexture(this.texVoidVid),
      gl.deleteProgram(this.holeProg),
      this.mirrorBlitProg && gl.deleteProgram(this.mirrorBlitProg),
      this.spaceElevatorProg && gl.deleteProgram(this.spaceElevatorProg),
      this.southPortalFBO &&
        (gl.deleteTexture(this.southPortalFBO.tex),
        gl.deleteFramebuffer(this.southPortalFBO.fbo)),
      gl.deleteProgram(this.solidProg),
      this.blackHoleProg && gl.deleteProgram(this.blackHoleProg));
  }
}

window.startZone2 = function (opts) {
  if (
    ((window.currentZone2 = new Zone2Engine()),
    window.__unlockAllVideos && window.__unlockAllVideos(),
    opts && opts.fromZ4AltAnnexDoor && window.currentZone2)
  ) {
    var z2 = window.currentZone2;
    opts.altBathroomTurn &&
    "function" == typeof z2._enterAltAnnexBathroomTurnLanding
      ? z2._enterAltAnnexBathroomTurnLanding()
      : ((z2.activePOV = "center"),
        (z2.pendingPOV = null),
        (z2.slideState = "idle"),
        (z2.slideOffset = 0),
        (z2.slideDir = 0),
        (z2.povSwitchTime = performance.now()),
        (z2.facing = "S"),
        (z2.hallwayYaw = Math.PI),
        (z2.hallwayYawTarget = z2.hallwayYaw),
        (z2.intersectionReached = !0),
        (z2.camZ =
          "number" == typeof z2.INTERSECTION_Z
            ? z2.INTERSECTION_Z - 0.75
            : 1.65),
        (z2.seqState = "initial"),
        (z2.zone3Route = "z3"),
        (z2.bloodRouteN = null),
        (z2.bloodRouteS = null),
        (z2.cabinTunnelTransitionStarted = !1),
        (z2.theaterBedroomHandoffStarted = !1),
        (z2.z4LeftBlinkCount = 0),
        (z2.z4TransitionStarted = !1),
        (z2.z4RouteTriggered = !1),
        (z2.route3Active = !1),
        (z2.route3Step = 0),
        (z2.readyForZone3 = !1),
        (z2.z3TransitionStarted = !1),
        (z2.z2ExitStarted = !1),
        (z2.z2ExitTime = 0),
        (z2.__fromAltAnnexDoor = !0),
        (z2.__z4RouteDisabledUntil = performance.now() + 12e3),
        (window.mx = 0),
        (window.my = 0),
        (window.z2SpaceHeld = !1),
        (window.z2TouchHeld = !1));
		  } else
		    opts &&
		      opts.fromZ4BathroomReturn &&
		      window.currentZone2 &&
	      (((z2 = window.currentZone2).activePOV = "left"),
      (z2.facing = "W"),
      (z2.hallwayYaw = z2._yawForFacing ? z2._yawForFacing("W") : Math.PI / 2),
      (z2.hallwayYawTarget = z2.hallwayYaw),
      (z2.intersectionReached = !0),
      (z2.camZ = z2.INTERSECTION_Z),
      (z2.seqState = "z4_ready"),
      (z2.zone3Route = "z4"),
      (z2.bloodRouteS = "elevator"),
      (z2.cabinTunnelTransitionStarted = !1),
      (z2.theaterBedroomHandoffStarted = !1),
      (z2.z4LeftBlinkCount = 2),
      z2.setLeftRoomTexture && z2.setLeftRoomTexture("normal"));
  opts &&
    opts.framedKitchenForward &&
    window.currentZone2 &&
    window.currentZone2.enableFramedKitchenForwardWall &&
    window.currentZone2.enableFramedKitchenForwardWall();
  let e = document.getElementById("zone-fade-overlay");
  (e ||
    ((e = document.createElement("div")),
    (e.id = "zone-fade-overlay"),
    (e.style.cssText =
      "position:fixed;inset:0;background:black;pointer-events:none;transition:opacity 0.2s ease-in-out;z-index:99999;"),
    document.body.appendChild(e)),
    (e.style.opacity = opts && opts.altBathroomTurn ? "0" : "1"),
    setTimeout(
      () => {
        e.style.opacity = "0";
      },
      opts && opts.altBathroomTurn
        ? 20
        : opts && (opts.fromZ4BathroomReturn || opts.fromZ4AltAnnexDoor)
          ? 80
          : 50,
    ));
  const t = () => {
    if (window.isEngine1Dead) {
      if (!window.__zone2Governor) {
        const e =
          1e3 /
          (/Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ) ||
          (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
            ? 20
            : 30);
        let t = 0,
          __maxVA = 16;
        try {
          __maxVA = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || 16;
        } catch (ee) {
          __maxVA = 16;
        }
        ((window.__zone2Governor = function (i) {
          if (
            (requestAnimationFrame(window.__zone2Governor),
            !(i - t < e) &&
              ((t = i), window.currentZone2 && !window.currentZone2.isDead))
          ) {
            for (let __ai = 0; __ai < __maxVA; __ai++)
              gl.disableVertexAttribArray(__ai);
            window.__z2GovLogged ||
              ((window.__z2GovLogged = !0),
              console.log(
                "[Zone2] governor rendering; vertex-attrib reset active, maxVA=",
                __maxVA,
              ));
            try {
              window.currentZone2.render(
                i,
                window.mx || 0,
                window.my || 0,
                0,
                0,
                0,
                0,
              );
            } catch (err) {
              window.__zone2RenderErrLogged ||
                ((window.__zone2RenderErrLogged = !0),
                console.error("[Zone2] governor render threw:", err));
            }
          }
        }),
          requestAnimationFrame(window.__zone2Governor));
      }
    } else requestAnimationFrame(t);
  };
  t();
};
