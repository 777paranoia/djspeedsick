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
        (window.GLSL && window.GLSL.modules && GLSL.modules.station_mesh) || ""
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
  vec3 rd=normalize(u_forward*1.35 + uv.x*u_right + uv.y*u_up);
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
    vec2 shifted = plane - vec2(0.08, -0.24);
    float earthRadius = 0.50;
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
uniform float u_altAnnexPeripheral;
uniform float u_altAnnexWhiteStrobe;
uniform float u_altAnnexFogPulse;

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

  float mt = u_modeTime * u_isOOB;
  float w1 = sin(mt * 0.4 + u_modeSeed);
  float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
  float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
  float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
  float snap = pow(surge, 2.0) * 1.8 * u_isOOB;
  uv *= 1.0 + mt * 0.0006 + snap * 0.0022;

  float gTick = floor(u_time * 16.0);
  if(step(0.979, hash1(gTick * 133.77 + u_modeSeed)) > 0.0)
    uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5)
      * 0.025 * clamp(u_trip, 0.0, 1.2);

  vec2 texUV = uv / vec2(u_res.x/u_res.y, 1.0) + 0.5;
  vec3 baseCol = texture2D(u_sceneTex, clamp(texUV, 0.0, 1.0)).rgb;

  if(u_altAnnexPeripheral > 0.5){
    vec2 px = vec2(1.0) / max(u_res, vec2(1.0));

    float leftMask = 1.0 - smoothstep(-0.50, 0.22, screenUV.x);
    float edgeMask = smoothstep(0.18, 0.90, length(screenUV * vec2(0.70, 1.04)));
    float cornerMask = smoothstep(0.42, 1.06, length(screenUV * vec2(1.10, 1.10)));
    float blinkBlur = smoothstep(0.05, 0.92, u_blink);
    float altAnnexPeripheralMask = clamp(max(max(leftMask * 0.98, edgeMask), cornerMask * 0.88), 0.0, 1.0);

    vec3 b0  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 2.0,   0.0), 0.0, 1.0)).rgb;
    vec3 b1  = texture2D(u_sceneTex, clamp(texUV + px * vec2(-2.0,   0.0), 0.0, 1.0)).rgb;
    vec3 b2  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 0.0,   2.0), 0.0, 1.0)).rgb;
    vec3 b3  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 0.0,  -2.0), 0.0, 1.0)).rgb;
    vec3 b4  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 6.0,   3.0), 0.0, 1.0)).rgb;
    vec3 b5  = texture2D(u_sceneTex, clamp(texUV + px * vec2(-6.0,  -3.0), 0.0, 1.0)).rgb;
    vec3 b6  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 12.0,  0.0), 0.0, 1.0)).rgb;
    vec3 b7  = texture2D(u_sceneTex, clamp(texUV + px * vec2(-12.0,  0.0), 0.0, 1.0)).rgb;
    vec3 b8  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 0.0,  10.0), 0.0, 1.0)).rgb;
    vec3 b9  = texture2D(u_sceneTex, clamp(texUV + px * vec2( 0.0, -10.0), 0.0, 1.0)).rgb;
    vec3 b10 = texture2D(u_sceneTex, clamp(texUV + px * vec2( 18.0,  7.0), 0.0, 1.0)).rgb;
    vec3 b11 = texture2D(u_sceneTex, clamp(texUV + px * vec2(-18.0, -7.0), 0.0, 1.0)).rgb;
    vec3 b12 = texture2D(u_sceneTex, clamp(texUV + px * vec2( 9.0, -14.0), 0.0, 1.0)).rgb;
    vec3 b13 = texture2D(u_sceneTex, clamp(texUV + px * vec2(-9.0,  14.0), 0.0, 1.0)).rgb;

    vec3 edgeBlurCol = (baseCol + b0 + b1 + b2 + b3 + b4 + b5 + b6 + b7 + b8 + b9 + b10 + b11 + b12 + b13) / 15.0;

    vec2 blinkDir = normalize(vec2(0.72, -0.32));
    vec3 blinkSmear = (
      texture2D(u_sceneTex, clamp(texUV + px * blinkDir *  7.0, 0.0, 1.0)).rgb +
      texture2D(u_sceneTex, clamp(texUV - px * blinkDir *  7.0, 0.0, 1.0)).rgb +
      texture2D(u_sceneTex, clamp(texUV + px * blinkDir * 16.0, 0.0, 1.0)).rgb +
      texture2D(u_sceneTex, clamp(texUV - px * blinkDir * 16.0, 0.0, 1.0)).rgb +
      texture2D(u_sceneTex, clamp(texUV + px * vec2(-blinkDir.y, blinkDir.x) * 10.0, 0.0, 1.0)).rgb +
      texture2D(u_sceneTex, clamp(texUV - px * vec2(-blinkDir.y, blinkDir.x) * 10.0, 0.0, 1.0)).rgb
    ) / 6.0;

    float edgeBlurAmt = altAnnexPeripheralMask * 0.98;
    float blinkBlurAmt = blinkBlur * 0.82;
    baseCol = mix(baseCol, edgeBlurCol, edgeBlurAmt);
    baseCol = mix(baseCol, blinkSmear, blinkBlurAmt);

    float edgeDim = 1.0 - altAnnexPeripheralMask * 0.055;
    float blinkBloom = blinkBlur * (0.035 + 0.035 * leftMask);
    baseCol *= edgeDim;
    baseCol += vec3(0.045, 0.039, 0.036);
    baseCol += vec3(0.16, 0.11, 0.08) * blinkBloom;
  }

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

  float hallucinationTrip = u_trip * mix(0.72, 1.72 + u_blink * 0.85, step(0.5, u_altAnnexPeripheral));
  vec3 col = applyHallucination(baseCol, screenUV, u_fractalSeed, u_blinkAge, hallucinationTrip, u_time);

  if(u_altAnnexPeripheral > 0.5){
    float edgeV = smoothstep(0.18, 1.02, length(screenUV * vec2(0.78, 1.05)));
    col *= 1.0 - edgeV * (0.16 + u_blink * 0.12);
    col *= 0.98;
  }

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

  function z4AltMouseSandboxActive() {
    const z4 = window.currentZone4;
    return !!(
      z4 &&
      !z4.isDead &&
      window.__z4AltAnnexMouseSandbox !== false &&
      typeof z4._isAltAnnexLocked === "function" &&
      z4._isAltAnnexLocked()
    );
  }

  function z4ClampMouse(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function z4ApplyAltAnnexMouseSandbox(ev) {
    if (!z4AltMouseSandboxActive()) return;
    const w = Math.max(1, window.innerWidth || 1);
    const h = Math.max(1, window.innerHeight || 1);
    window.mx = z4ClampMouse(((ev.clientX / w) - 0.5) * 0.72, -0.24, 0.24);
    window.my = z4ClampMouse(((ev.clientY / h) - 0.5) * 0.48, -0.15, 0.15);
  }

  if (!window.__z4InputInstalled) {
    window.__z4InputInstalled = true;
    window.__z4AltAnnexMouseSandbox = true;
    window.addEventListener("mousemove", z4ApplyAltAnnexMouseSandbox, { passive: true });
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
        } else if (z4 && !z4.isDead && z4.phase === "annex_room") {
          window.__z4AnnexTurnRequested = e.code === "ArrowLeft" ? -1 : 1;
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
      this.walkoff = 0;
      this.hallwayT = 0;
      this.enterRingT = 0;
      this.phaseFogArmed = false;

      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;

      this.ringDirection = 1;
      this.ringView = "window";
      this.ringWindowSide = 1;
      this.turnAnimating = false;
      this.turnStart = 0;
      this.turnTo = -1;
      this.turnSpin = 1;
      this.turnAngle = Math.PI;
      this.turnViewTo = null;
      this.turnDirectionTo = null;
      this.turnWindowSideTo = null;
      this.turnDuration = 420;
      this.turnInputLatch = 0;
      this.turnLookX = 0;
      this.turnLookY = 0;

      this.lapCount = 0;
      this.lastRingU = this.ringU;
      this.ringTravel = 0;
      this.signedRingTravel = 0;
      this.lapCrossings = 0;
      this.clockwiseLapCount = 0;
      this.counterClockwiseLapCount = 0;

      this.totalClockwiseTravel = 0;
      this.totalCounterClockwiseTravel = 0;
      this.totalClockwiseLapCount = 0;
      this.totalCounterClockwiseLapCount = 0;

      this.altAnnexPatternStage = 0;
      this.altAnnexCwTravel = 0;
      this.altAnnexCcwTravel = 0;
      this.altAnnexCwLapCount = 0;
      this.altAnnexCcwLapCount = 0;
      this.altAnnexClockwiseReady = false;
      this.altAnnexCounterClockwiseReady = false;
      this.altAnnexDoorOpen = false;
      this.altAnnexRouteActive = false;
      this.annexAltBasementActive = false;
      this.annexBasementVariant = "normal";
      this.altAnnexLastLog = 0;

      this.annexDoorOpen = false;
      this.annexSection = 0;
      this.annexEntryU = this.ringU;
      this.annexTargetU = this.ringU;
      this.annexTurnT = 0;
      this.annexHallT = 0;
      this.annexRoomT = 0;
      this.annexExitT = 0;
      this.annexRoomDir = 1;
      this.annexRoomView = "path";
      this.annexTurnInputLatch = 0;
      this.annexDjBlinkCount = 0;
      this.annexSequenceActive = false;
      this.annexSequenceStart = 0;
      this.annexStrobe = 0;
      this.z4bStopAtCockpit = false;
      this.annexExitFading = false;
      this.blackholeVisible = false;
      this.blackholeIntensity = 0;

      this.descentProgress = 1;
      this.descentStart = 0;
      this.descentDuration = 38000;

      this.fallProgress = 0;
      this.fallStart = 0;
      this.fallDuration = 32000;

      this.neuralIntensity = 0.75;
      this.z4Trip = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4ModeTime = 0.0;
      this.z4IsOOB = 1.0;
      this.z4FractalSeed = Math.random() * 1000.0;
      this.z4BlinkPeakTime = performance.now();

      this.altAnnexNffAudio = null;
      this.altAnnexNffCtx = null;
      this.altAnnexNffSource = null;
      this.altAnnexNffFilter = null;
      this.altAnnexNffGain = null;
      this.altAnnexNffPlaying = false;
      this.altAnnexNffTargetGain = 0.0;
      this.altAnnexMainAudioDucked = false;
      this.altAnnexMainAudioPrevVolume = 1.0;
      this.altAnnexMainAudioPrevMuted = false;

      src.stationBgCombined = z4BuildPsychStationShader();
      src.stationMeshFrag = this._patchAnnexBasementShader(src.stationMeshFrag);

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
      this.altAnnexFXProg = (typeof this._buildAltAnnexFXProgram === "function") ? this._buildAltAnnexFXProgram() : null;
      this.cabinPortalOverlayProg = this._buildRawProgram(
        "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }",
        "precision mediump float; varying vec2 v_uv; uniform sampler2D u_tex; uniform float u_alpha; void main(){ gl_FragColor = vec4(texture2D(u_tex, v_uv).rgb, u_alpha); }"
      );

      this.fallProg = null;
      this._fallShaderBuilt = false;

      this.fboTexture = gl.createTexture();
      this.fboDepth = gl.createRenderbuffer();
      this.fbo = gl.createFramebuffer();
      this.fboWidth = 0;
      this.fboHeight = 0;
      this.cabinPortalProg = null;
      this.cabinPortalFBO = null;
      this.cabinPortalTexture = null;
      this.cabinPortalWidth = 0;
      this.cabinPortalHeight = 0;
      this.z4bVoidFBO = null;
      this.z4bVoidTexture = null;
      this.z4bVoidWidth = 0;
      this.z4bVoidHeight = 0;
      this.z4Mode4OceanProg = null;
      this.z4Mode4OceanEnvTex = null;
      this.z4Mode4OceanWindowTex = null;
      this.z4bVoidMode = null;
      this.z4bVoidMaskTex = null;
      this.z4bCabinState = "idle";
      this.z4bCabinStart = 0;
      this.z4bCabinCrashStart = 0;
      this.z4bCabinCamZ = 12.0;
      this.z4bCabinCamX = 0.0;
      this.z4bCabinYaw = 0.0;
      this.z4bCabinZoom = 1.0;
      this.z4bCabinShake = 0;
      this.z4bCabinFlash = 0;
      this.z4bCabinWalking = false;
      this.z4bIslandStarted = false;

      try {
        if (typeof ActiveMode !== "undefined") {
          this.z4bVoidMode = new ActiveMode(5);
          this.z4bVoidMaskTex = this._makeSolidTexture(0, 0, 0, 0);
          this.z4bVoidMode.maskTex = this.z4bVoidMaskTex;
        }
      } catch (e) {
        this.z4bVoidMode = null;
        this.z4bVoidMaskTex = null;
      }

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

    _patchAnnexBasementShader(fsSource) {
      if (!fsSource) return fsSource;
      if (fsSource.indexOf("u_annexStageRedLight") !== -1 && fsSource.indexOf("u_annexStageWhiteStrobe") !== -1 && fsSource.indexOf("u_annexLightCol0") !== -1) return fsSource;
      if (fsSource.indexOf("u_annexLighting") !== -1) {
        fsSource = fsSource.replace(
          "uniform vec3 u_annexLight2;\\n",
          "uniform vec3 u_annexLight2;\\nuniform vec3 u_annexStageRedLight;\\nuniform float u_annexStageRedGlow;\\nuniform vec3 u_annexStageWhiteLight;\\nuniform float u_annexStageWhiteStrobe;\\n"
        );
        fsSource = fsSource.replace(
          "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    amb *= mix(1.0, 0.42, u_annexStrobe);",
          "    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\\n    vec3 RS = u_annexStageRedLight - v_wpos;\\n    float rdist = dot(RS, RS);\\n    vec3 RSdir = normalize(RS);\\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\\n    float rsoft = smoothstep(0.0, 0.85, rfall);\\n    direct += vec3(1.55, 0.055, 0.028) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\\n    amb += vec3(0.135, 0.010, 0.006) * rsoft * u_annexStageRedGlow;\\n    vec3 WS = u_annexStageWhiteLight - v_wpos;\\n    float wdist = dot(WS, WS);\\n    vec3 WSdir = normalize(WS);\\n    float wfront = smoothstep(-0.18, 0.78, dot(WSdir, n));\\n    float wdown = smoothstep(0.12, 0.92, dot(normalize(v_wpos - u_annexStageWhiteLight), vec3(0.0,-1.0,0.0)));\\n    float wfall = u_annexStageWhiteStrobe / (1.0 + wdist * 0.070);\\n    direct += vec3(5.60, 5.15, 4.70) * wfall * (0.10 + 1.34 * wfront + 0.54 * wdown);\\n    amb += vec3(1.05, 0.92, 0.78) * smoothstep(0.0, 0.70, wfall) * u_annexStageWhiteStrobe;\\n    amb *= mix(1.0, 0.42, u_annexStrobe);"
        );
        return fsSource;
      }
      return fsSource
        .replace(
          "uniform float u_greenKey;\n",
          "uniform float u_greenKey;\nuniform float u_annexLighting;\nuniform float u_annexStrobe;\nuniform float u_annexExitGlow;\nuniform vec3 u_annexExitLight;\nuniform vec3 u_annexLight0;\nuniform vec3 u_annexLight1;\nuniform vec3 u_annexLight2;\nuniform vec3 u_annexLightCol0;\nuniform vec3 u_annexLightCol1;\nuniform vec3 u_annexLightCol2;\nuniform vec3 u_annexStageRedLight;\nuniform float u_annexStageRedGlow;\nuniform vec3 u_annexStageWhiteLight;\nuniform float u_annexStageWhiteStrobe;\n"
        )
        .replace(
          "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 col=base*(amb + diff*vec3(0.52, 0.56, 0.62));\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;",
          "  vec3 amb=vec3(0.18, 0.19, 0.22);\n  amb += vec3(0.05, 0.08, 0.12) * hemi;\n  amb += vec3(0.10, 0.04, 0.02) * floorGlow;\n  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;\n  vec3 direct = diff*vec3(0.52, 0.56, 0.62);\n  if(u_annexLighting > 0.5){\n    float emitter = step(1.25, max(max(u_flatCol.r, u_flatCol.g), u_flatCol.b));\n    amb = mix(vec3(0.026, 0.027, 0.030), amb, emitter);\n    direct *= mix(0.11, 0.80, emitter);\n    spec *= mix(0.12, 1.00, emitter);\n    vec3 bulbSum = vec3(0.0);\n    vec3 L0 = u_annexLight0 - v_wpos;\n    vec3 L1 = u_annexLight1 - v_wpos;\n    vec3 L2 = u_annexLight2 - v_wpos;\n    vec3 D0 = normalize(v_wpos - u_annexLight0);\n    vec3 D1 = normalize(v_wpos - u_annexLight1);\n    vec3 D2 = normalize(v_wpos - u_annexLight2);\n    float c0 = smoothstep(0.64, 0.975, dot(D0, vec3(0.0,-1.0,0.0)));\n    float c1 = smoothstep(0.64, 0.975, dot(D1, vec3(0.0,-1.0,0.0)));\n    float c2 = smoothstep(0.64, 0.975, dot(D2, vec3(0.0,-1.0,0.0)));\n    float f0 = c0 / (1.0 + dot(L0,L0) * 1.35);\n    float f1 = c1 / (1.0 + dot(L1,L1) * 1.35);\n    float f2 = c2 / (1.0 + dot(L2,L2) * 1.35);\n    bulbSum += u_annexLightCol0 * f0 * (0.25 + 0.75 * max(dot(n, normalize(L0)), 0.0));\n    bulbSum += u_annexLightCol1 * f1 * (0.25 + 0.75 * max(dot(n, normalize(L1)), 0.0));\n    bulbSum += u_annexLightCol2 * f2 * (0.25 + 0.75 * max(dot(n, normalize(L2)), 0.0));\n    direct += bulbSum * (1.55 + u_annexStrobe * 4.80);\n    vec3 GE = u_annexExitLight - v_wpos;\n    float gdist = dot(GE, GE);\n    float gcone = smoothstep(0.18, 0.82, dot(normalize(GE), n));\n    float gfall = u_annexExitGlow / (1.0 + gdist * 0.34);\n    direct += vec3(0.00, 1.55, 0.12) * gfall * (0.32 + 1.40 * gcone);\n    amb += vec3(0.00, 0.16, 0.025) * u_annexExitGlow;\n    vec3 RS = u_annexStageRedLight - v_wpos;\n    float rdist = dot(RS, RS);\n    vec3 RSdir = normalize(RS);\n    float rfront = smoothstep(-0.24, 0.78, dot(RSdir, n));\n    float rdown = smoothstep(0.18, 0.96, dot(normalize(v_wpos - u_annexStageRedLight), vec3(0.0,-1.0,0.0)));\n    float rfall = u_annexStageRedGlow / (1.0 + rdist * 0.060);\n    float rsoft = smoothstep(0.0, 0.85, rfall);\n    direct += vec3(1.55, 0.055, 0.028) * rfall * (0.18 + 1.18 * rfront + 0.52 * rdown);\n    amb += vec3(0.135, 0.010, 0.006) * rsoft * u_annexStageRedGlow;\n    amb *= mix(1.0, 0.42, u_annexStrobe);\n  }\n  vec3 col=base*(amb + direct);\n  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;\n  col += vec3(0.65, 0.78, 1.0) * spec;"
        )
        .replace(
          "  float fog=1.0-exp(-dist*0.045);",
          "  float fog=1.0-exp(-dist*mix(0.045, 0.085, step(0.5, u_annexLighting)));"
        )
        .replace(
          "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  col=mix(col, fogCol, fog * 0.32);",
          "  vec3 fogCol=vec3(0.02, 0.025, 0.035);\n  fogCol += vec3(0.02, 0.03, 0.05) * hemi;\n  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;\n  if(u_annexLighting > 0.5) fogCol = mix(fogCol, vec3(0.020, 0.026, 0.034), 0.66);\n  if(u_annexExitGlow > 0.01) fogCol += vec3(0.0, 0.18, 0.025) * u_annexExitGlow;\n  col=mix(col, fogCol, fog * mix(0.32, 0.56, step(0.5, u_annexLighting)));"
        );
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
        col: gl.getUniformLocation(prog, "u_col")
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
      const tex = {
        floor: loadStaticTex(base + "SPACE-FLOOR.png"),
        floorGlass: loadStaticTex(base + "SPACE-FLOOR-GLASS.png"),
        ceil: loadStaticTex(base + "SPACE-CEILING.png"),
        lp1: loadStaticTex(base + "SPACE-LP1.png"),
        lp2: loadStaticTex(base + "SPACE-LP2.png"),
        lp3: loadStaticTex(base + "SPACE-LP3.png"),
        rp1: loadStaticTex(base + "SPACE-RP1.png"),
        rp2: loadStaticTex(base + "SPACE-RP2.png"),
        rp3: loadStaticTex(base + "SPACE-RP3.png"),
        winT: loadStaticTex(base + "SPACE-RP1.png"),
        winC: loadStaticTex(base + "SPACE-RP2.png"),
        winB: loadStaticTex(base + "SPACE-RP3.png"),
        door: loadStaticTex(base + "SPACE-DOOR.png"),
        spaceHallDoor: loadStaticTex(base + "basement/ALT-HALL-DOOR.png"),
        exitWall: loadStaticTex(base + "WALL-EXIT.png"),
        basementWallExit: loadStaticTex(base + "basement/WALL-EXIT.png"),
        basementWall: loadStaticTex(base + "basement/BASEMENT-WALL.png"),
        basementAltWall: loadStaticTex(base + "basement/ALT-WALL.png"),
        basementBackWall: loadStaticTex(base + "basement/BACKWALL.png"),
        basementBathroomClub: loadStaticTex(base + "basement/bathroom-club.png"),
        basementAltDoorHall: loadStaticTex(base + "basement/ALT-HALL-DOOR.png"),
        basementCeil: loadStaticTex(base + "basement/BASEMENT-CEILING.png"),
        basementFloor: loadStaticTex(base + "basement/BASEMENT-FLOOR.png"),
        stairWall: loadStaticTex(base + "basement/STAIR-WALL.png"),
        speakerFront: loadStaticTex(base + "basement/SPEAKERS-FRONT.png"),
        speakerLeft: loadStaticTex(base + "basement/SPEAKERS-LEFT.png"),
        speakerRight: loadStaticTex(base + "basement/SPEAKERS-RIGHT.png"),
        speaker1: loadStaticTex(base + "basement/SPEAKER-1.png"),
        speaker2: loadStaticTex(base + "basement/SPEAKER-2.png"),
        speaker3: loadStaticTex(base + "basement/SPEAKER-3.png"),
        cabinDoorClosed: loadStaticTex("files/img/rooms/z3/door-closed.png"),
        cabinDoorOpen: loadStaticTex("files/img/rooms/z3/door-open.png"),
        cabinCockpit: loadStaticTex("files/img/rooms/z3/cockpit.png"),
        cabinHallLeft: loadStaticTex("files/img/rooms/z2/hallway/RIGHTWALL.png"),
        cabinHallRight: loadStaticTex("files/img/rooms/z2/hallway/LEFTWALL_B.png"),
        cabinHallTop: loadStaticTex("files/img/rooms/z2/hallway/TOP.png"),
        cabinHallBottom: loadStaticTex("files/img/rooms/z2/hallway/GROUND.png"),
        black: this._makeSolidTexture(10, 10, 12, 255),
        earth: this._makeSolidTexture(0, 0, 0, 255),
        crywolf: this._makeSolidTexture(0, 0, 0, 255),
        bh2: this._makeSolidTexture(0, 0, 0, 255)
      };
      this.earthVideo = this._claimLoopingVideo("files/mov/earth.mp4");
      this.crywolfVideo = this._claimLoopingVideo("files/mov/mapped/crywolf.mp4");
      this.bh2Video = this._claimLoopingVideo("files/mov/bh2.mp4");
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
        blend: !!blend
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
      function isInnerWindowSection(i) {
        return i === 15 || i === 0 || i === 1 || i === 4 || i === 12;
      }
      function isOuterWindowSection(i) {
        return i === 1 || i === 7 || i === 8 || i === 9 || i === 15;
      }
      function isOuterDoorSection(i) {
        return i === 0;
      }
      function isGroupedWindowFloorSection(i) {
        return i === 7 || i === 8 || i === 9 || i === 15 || i === 0 || i === 1;
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
          rub1: pointOnFrame(f1, RIGHT_TOP_X, CEIL_Y)
        };

        {
          const floorTex = isGroupedWindowFloorSection(i) ? TEX.floorGlass : TEX.floor;
          const q = [];
          pushQuad(q, pts.fl0, pts.fr0, pts.fr1, pts.fl1, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, floorTex, [1, 1, 1], 1, floorTex === TEX.floorGlass));
        }
        {
          const q = [];
          pushQuad(q, pts.c0r, pts.c0l, pts.c1l, pts.c1r, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));
        }

        if (i !== 8) {
          const leftIsWindow = isInnerWindowSection(i);
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
          const fa0 = sectionFrame(a0);
          const fa1 = sectionFrame(a1);

          
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
          
          const doorL_low = [
            fmid.center[0] + fmid.radial[0] * LEFT_LOW_X + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_LOW_X + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR_low = [
            fmid.center[0] + fmid.radial[0] * LEFT_LOW_X + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_LOW_X + fmid.tangent[2] * hallHalfW
          ];
          
          const doorL_top = [
            fmid.center[0] + fmid.radial[0] * LEFT_TOP_X + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_TOP_X + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR_top = [
            fmid.center[0] + fmid.radial[0] * LEFT_TOP_X + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_TOP_X + fmid.tangent[2] * hallHalfW
          ];

          function dL(y) { return [doorL[0], y, doorL[2]]; }
          function dR(y) { return [doorR[0], y, doorR[2]]; }
          function dL_low(y) { return [doorL_low[0], y, doorL_low[2]]; }
          function dR_low(y) { return [doorR_low[0], y, doorR_low[2]]; }
          function dL_top(y) { return [doorL_top[0], y, doorL_top[2]]; }
          function dR_top(y) { return [doorR_top[0], y, doorR_top[2]]; }

          
          
          {
            const q = [];
            pushQuad(q,
              dL_low(FLOOR_Y),
              pointOnFrame(fa0, LEFT_LOW_X, FLOOR_Y),
              pointOnFrame(fa0, INNER_W, LEFT_MID_BOT),
              dL(LEFT_MID_BOT),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          
          {
            const q = [];
            pushQuad(q,
              dL(LEFT_MID_BOT),
              pointOnFrame(fa0, INNER_W, LEFT_MID_BOT),
              pointOnFrame(fa0, INNER_W, LEFT_MID_TOP),
              dL(LEFT_MID_TOP),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1,1,1], 1));
          }
          
          {
            const q = [];
            pushQuad(q,
              dL(LEFT_MID_TOP),
              pointOnFrame(fa0, INNER_W, LEFT_MID_TOP),
              pointOnFrame(fa0, LEFT_TOP_X, CEIL_Y),
              dL_top(CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }

          
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, LEFT_LOW_X, FLOOR_Y),
              dR_low(FLOOR_Y),
              dR(LEFT_MID_BOT),
              pointOnFrame(fa1, INNER_W, LEFT_MID_BOT),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, INNER_W, LEFT_MID_BOT),
              dR(LEFT_MID_BOT),
              dR(LEFT_MID_TOP),
              pointOnFrame(fa1, INNER_W, LEFT_MID_TOP),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, INNER_W, LEFT_MID_TOP),
              dR(LEFT_MID_TOP),
              dR_top(CEIL_Y),
              pointOnFrame(fa1, LEFT_TOP_X, CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }

          
          
          {
            const q = [];
            pushQuad(q,
              dR(LEFT_MID_TOP),
              dL(LEFT_MID_TOP),
              dL_top(CEIL_Y),
              dR_top(CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }

          
          
          
          {
            const q = [];
            const n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
            pushTri(q,
              dL_low(FLOOR_Y), dL(LEFT_MID_BOT), dL(FLOOR_Y),
              n, n, n,
              0, 1, 1, 0, 0, 0);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const q = [];
            const n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
            pushTri(q,
              dR_low(FLOOR_Y), dR(FLOOR_Y), dR(LEFT_MID_BOT),
              n, n, n,
              0, 1, 0, 0, 1, 0);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
        }

        {
          const rightIsWindow = isOuterWindowSection(i);
          const rightIsDoor = isOuterDoorSection(i);
          if (rightIsDoor) {
            const hallHalfW = 1.15;
            const amid = (i + 0.5) * SECTION_ANGLE;
            const fmid = sectionFrame(amid);
            const fa0 = sectionFrame(a0);
            const fa1 = sectionFrame(a1);

            function doorPoint(x, y, z) {
              return [
                fmid.center[0] + fmid.radial[0] * x + fmid.up[0] * y + fmid.tangent[0] * z,
                fmid.center[1] + fmid.radial[1] * x + fmid.up[1] * y + fmid.tangent[1] * z,
                fmid.center[2] + fmid.radial[2] * x + fmid.up[2] * y + fmid.tangent[2] * z,
              ];
            }

            function dL(y) { return doorPoint(OUTER_W, y, -hallHalfW); }
            function dR(y) { return doorPoint(OUTER_W, y, hallHalfW); }
            function dL_low(y) { return doorPoint(RIGHT_LOW_X, y, -hallHalfW); }
            function dR_low(y) { return doorPoint(RIGHT_LOW_X, y, hallHalfW); }
            function dL_top(y) { return doorPoint(RIGHT_TOP_X, y, -hallHalfW); }
            function dR_top(y) { return doorPoint(RIGHT_TOP_X, y, hallHalfW); }

            {
              const q = [];
              pushQuad(q,
                dL_low(FLOOR_Y),
                pointOnFrame(fa0, RIGHT_LOW_X, FLOOR_Y),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_BOT),
                dL(RIGHT_MID_BOT),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dL(RIGHT_MID_BOT),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_BOT),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_TOP),
                dL(RIGHT_MID_TOP),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dL(RIGHT_MID_TOP),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_TOP),
                pointOnFrame(fa0, RIGHT_TOP_X, CEIL_Y),
                dL_top(CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, RIGHT_LOW_X, FLOOR_Y),
                dR_low(FLOOR_Y),
                dR(RIGHT_MID_BOT),
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_BOT),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_BOT),
                dR(RIGHT_MID_BOT),
                dR(RIGHT_MID_TOP),
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_TOP),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_TOP),
                dR(RIGHT_MID_TOP),
                dR_top(CEIL_Y),
                pointOnFrame(fa1, RIGHT_TOP_X, CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dR(RIGHT_MID_TOP),
                dL(RIGHT_MID_TOP),
                dL_top(CEIL_Y),
                dR_top(CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              const n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
              pushTri(q,
                dL_low(FLOOR_Y), dL(RIGHT_MID_BOT), dL(FLOOR_Y),
                n, n, n,
                0, 1, 1, 0, 0, 0);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              const n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
              pushTri(q,
                dR_low(FLOOR_Y), dR(FLOOR_Y), dR(RIGHT_MID_BOT),
                n, n, n,
                0, 1, 0, 0, 1, 0);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              const doorX = OUTER_W - 0.025;
              const doorTopY = CEIL_Y * 0.88;
              pushQuad(q,
                doorPoint(doorX, FLOOR_Y, hallHalfW),
                doorPoint(doorX, FLOOR_Y, -hallHalfW),
                doorPoint(doorX, doorTopY, -hallHalfW),
                doorPoint(doorX, doorTopY, hallHalfW),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              const doorMesh = self._makeMesh(q, TEX.door, [1, 1, 1], 1);
              doorMesh.annexEntranceDoor = true;
              meshes.push(doorMesh);
            }
          } else if (!rightIsWindow) {
            const q = [];
            pushQuad(q, pts.rlb0, pts.rlm0, pts.rlm1, pts.rlb1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
          }
          if (!rightIsDoor) {
            const q = [];
            pushQuad(q, pts.rlm0, pts.rmt0, pts.rmt1, pts.rlm1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, rightIsWindow ? TEX.winC : TEX.rp2, [1, 1, 1], 1));
          }
          if (!rightIsDoor && !rightIsWindow) {
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
        
        const x0 = -8.0;             
        const x1 = x0 - depth;       
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
            z: liftZ + Math.sin(angle) * radius
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
        const trackBottom = y0 - 78.0;
        addBox(liftX - 0.11, liftX + 0.11, trackBottom, y0 + 0.08, -0.11, 0.11, TEX.black, [0.020, 0.028, 0.040], 0);
        const trackRailR = 0.72;
        const trackRailT = 0.045;
        addBox(liftX + trackRailR - trackRailT, liftX + trackRailR + trackRailT, trackBottom, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailR - trackRailT, liftX - trackRailR + trackRailT, trackBottom, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, trackBottom, y0 + 0.02, trackRailR - trackRailT, trackRailR + trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, trackBottom, y0 + 0.02, -trackRailR - trackRailT, -trackRailR + trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);

        for (let rung = 0; rung < 20; rung++) {
          const ry = y0 - 1.10 - rung * 3.75;
          addRing(liftX, liftZ, 0.70, 0.84, ry - 0.025, ry + 0.025, TEX.black, [0.040, 0.052, 0.066], 0);
          addBox(liftX - 0.94, liftX + 0.94, ry - 0.022, ry + 0.022, -0.022, 0.022, TEX.black, [0.040, 0.052, 0.066], 0);
          addBox(liftX - 0.022, liftX + 0.022, ry - 0.022, ry + 0.022, -0.94, 0.94, TEX.black, [0.040, 0.052, 0.066], 0);
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

        var hx0 = -8.0;               
        var hx1 = INNER_W + 0.02;    
        var hy0 = FLOOR_Y;
        var hy1 = CEIL_Y * 0.88;     
        var hallHalfW = 1.15;        
        var hz0 = -hallHalfW;
        var hz1 = hallHalfW;
        var q;

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx0, hy0, hz1),
          pointLocal(hx1, hy0, hz1), pointLocal(hx1, hy0, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy1, hz1), pointLocal(hx0, hy1, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx1, hy0, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx0, hy1, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));

        q = [];
        pushQuad(
          q,
          pointLocal(hx1, hy0, hz1), pointLocal(hx0, hy0, hz1),
          pointLocal(hx0, hy1, hz1), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));

        var trimW = 0.04;

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz0), pointLocal(hx1, hy0 + 0.01, hz0),
          pointLocal(hx1, hy0 + 0.01, hz0 + trimW), pointLocal(hx0, hy0 + 0.01, hz0 + trimW),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));

        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz1 - trimW), pointLocal(hx1, hy0 + 0.01, hz1 - trimW),
          pointLocal(hx1, hy0 + 0.01, hz1), pointLocal(hx0, hy0 + 0.01, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
      })();

      (function addStationAnnex() {
        const i = 0;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);

        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        function addPanel(p00, p10, p11, p01, tex, flatCol, texMix, blend) {
          const q = [];
          pushQuad(q, p00, p10, p11, p01, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol || [1, 1, 1], typeof texMix === "number" ? texMix : 1, blend));
        }
        function addPanelUV(p00, p10, p11, p01, uv00, uv10, uv11, uv01, tex, flatCol, texMix, blend) {
          const q = [];
          pushQuad(q, p00, p10, p11, p01, uv00, uv10, uv11, uv01);
          meshes.push(self._makeMesh(q, tex, flatCol || [1, 1, 1], typeof texMix === "number" ? texMix : 1, blend));
        }
        function mixPoint(a, b, t) {
          return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t,
          ];
        }
        function patchPoint(p00, p10, p11, p01, u, v) {
          return mixPoint(mixPoint(p00, p10, u), mixPoint(p01, p11, u), v);
        }
        function addTiledPanel(p00, p10, p11, p01, tex, flatCol, texMix, cols, rows) {
          cols = Math.max(1, cols | 0);
          rows = Math.max(1, rows | 0);
          for (let x = 0; x < cols; x++) {
            const u0 = x / cols;
            const u1 = (x + 1) / cols;
            for (let y = 0; y < rows; y++) {
              const v0 = y / rows;
              const v1 = (y + 1) / rows;
              addPanel(
                patchPoint(p00, p10, p11, p01, u0, v0),
                patchPoint(p00, p10, p11, p01, u1, v0),
                patchPoint(p00, p10, p11, p01, u1, v1),
                patchPoint(p00, p10, p11, p01, u0, v1),
                tex,
                flatCol,
                texMix
              );
            }
          }
        }
        function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
          addPanel(pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), tex, flatCol, texMix);
          addPanel(pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), pointLocal(xa, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), pointLocal(xa, ya, za), tex, flatCol, texMix);
          addPanel(pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), tex, flatCol, texMix);
        }
        function addExitWallFace(x, ya, yb, halfW) {
          const q = [];
          pushQuad(
            q,
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, halfW),
            pointLocal(x, yb, halfW),
            pointLocal(x, yb, -halfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.exitWall, [1.0, 1.0, 1.0], 1.0, false);
          mesh.greenKey = true;
          meshes.push(mesh);
        }
        function addCollar(x, ya, yb, innerHalfW, outerHalfW) {
          const d = 0.16;
          const col = [0.025, 0.030, 0.038];
          addBox(x - d, x + d, ya - 0.16, yb + 0.16, -outerHalfW, -innerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, ya - 0.16, yb + 0.16, innerHalfW, outerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, yb, yb + 0.16, -outerHalfW, outerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, ya - 0.16, ya, -outerHalfW, outerHalfW, TEX.black, col, 0);
        }
        function addBulkheadWithOpening(x, ya, yb, halfW, openYa, openYb, openHalfW, tex) {
          const dim = [0.04, 0.045, 0.05];
          addPanel(pointLocal(x, ya, -halfW), pointLocal(x, ya, -openHalfW), pointLocal(x, yb, -openHalfW), pointLocal(x, yb, -halfW), tex, dim, 0.62);
          addPanel(pointLocal(x, ya, openHalfW), pointLocal(x, ya, halfW), pointLocal(x, yb, halfW), pointLocal(x, yb, openHalfW), tex, dim, 0.62);
          addPanel(pointLocal(x, openYb, -openHalfW), pointLocal(x, openYb, openHalfW), pointLocal(x, yb, openHalfW), pointLocal(x, yb, -openHalfW), tex, dim, 0.62);
          addPanel(pointLocal(x, ya, -openHalfW), pointLocal(x, ya, openHalfW), pointLocal(x, openYa, openHalfW), pointLocal(x, openYa, -openHalfW), tex, dim, 0.62);
        }
        function addRoom(xa, xb, ya, yb, za, zb, openA, openB) {
          const xTiles = Math.max(2, Math.ceil(Math.abs(xb - xa) / 2.2));
          const zTiles = Math.max(2, Math.ceil(Math.abs(zb - za) / 2.0));
          const ceilXTiles = Math.max(1, Math.ceil(Math.abs(xb - xa) / 4.8));
          const ceilZTiles = Math.max(1, Math.ceil(Math.abs(zb - za) / 4.8));
          const wallDim = [0.035, 0.040, 0.045];
          const floorDim = [0.050, 0.055, 0.060];
          const ceilDim = [0.025, 0.030, 0.035];
          addTiledPanel(pointLocal(xa, ya, za), pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), TEX.basementFloor, floorDim, 0.55, zTiles, xTiles);
          addTiledPanel(pointLocal(xa, yb, zb), pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), TEX.basementCeil, ceilDim, 0.50, ceilZTiles, ceilXTiles);
          addPanel(pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), TEX.basementWall, wallDim, 0.58);
          addPanel(pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), TEX.basementWall, wallDim, 0.58);
          if (!openA) {
            addPanel(pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), TEX.basementWall, wallDim, 0.58);
          }
          if (!openB) {
            addPanel(pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), TEX.basementWall, wallDim, 0.58);
          }
        }
        function addSpeakerStage(x0, x1, floorY, topY, zBack, zFront) {
          const deckY = floorY + 0.24;
          const backZ = zBack + 0.05;
          const faceZ = zBack + 0.50;
          const stageX0 = x0 + 0.76;
          const stageX1 = x1 + 0.28;
          const dark = [0.010, 0.011, 0.011];

          addBox(stageX0, stageX1, floorY + 0.02, deckY, backZ, faceZ, TEX.black, dark, 0);
          addPanel(
            pointLocal(stageX0, deckY, backZ),
            pointLocal(stageX1, deckY, backZ),
            pointLocal(stageX1, deckY, faceZ),
            pointLocal(stageX0, deckY, faceZ),
            TEX.black,
            [0.016, 0.016, 0.015],
            0
          );

          const y0 = deckY + 0.02;
          const y1 = Math.min(topY, y0 + 1.62);
          addPanel(
            pointLocal(stageX0, y0, faceZ + 0.024),
            pointLocal(stageX1, y0, faceZ + 0.024),
            pointLocal(stageX1, y1, faceZ + 0.024),
            pointLocal(stageX0, y1, faceZ + 0.024),
            TEX.speakerFront,
            [1, 1, 1],
            1,
            true
          );
          addPanel(
            pointLocal(stageX0, y0, backZ),
            pointLocal(stageX0, y0, faceZ),
            pointLocal(stageX0, y1, faceZ),
            pointLocal(stageX0, y1, backZ),
            TEX.speakerLeft,
            [1, 1, 1],
            1,
            true
          );
          addPanel(
            pointLocal(stageX1, y0, faceZ),
            pointLocal(stageX1, y0, backZ),
            pointLocal(stageX1, y1, backZ),
            pointLocal(stageX1, y1, faceZ),
            TEX.speakerRight,
            [1, 1, 1],
            1,
            true
          );
        }
        function addRaveAftermath(x0, x1, y, z0, z1) {
          const bits = [
            [0.18, 0.18, 0.55, 0.10, -0.65, 0.18, 0.42, 0.95],
            [0.40, 0.33, 0.18, 0.12, 0.25, 0.90, 0.20, 0.55],
            [0.62, 0.14, 0.34, 0.09, -0.05, 0.95, 0.12, 0.75],
            [0.78, 0.44, 0.20, 0.10, 0.62, 0.18, 0.95, 0.45],
            [0.28, 0.70, 0.16, 0.08, -0.28, 0.10, 0.85, 0.95],
            [0.52, 0.62, 0.42, 0.06, 0.48, 0.95, 0.15, 0.85],
            [0.13, 0.58, 0.22, 0.07, 0.08, 0.95, 0.12, 0.24],
            [0.35, 0.78, 0.28, 0.08, -0.18, 0.10, 0.78, 0.38],
            [0.69, 0.75, 0.16, 0.06, 0.40, 0.80, 0.28, 0.95],
            [0.86, 0.20, 0.26, 0.08, -0.36, 0.95, 0.75, 0.10],
            [0.47, 0.48, 0.12, 0.12, 0.00, 0.70, 0.95, 0.20],
          ];
          for (let i = 0; i < bits.length; i++) {
            const b = bits[i];
            const cx = x0 + (x1 - x0) * b[0];
            const cz = z0 + (z1 - z0) * b[1];
            const hw = b[2] * 0.5;
            const hd = b[3] * 0.5;
            const rot = b[4];
            const c = Math.cos(rot);
            const s = Math.sin(rot);
            function p(px, pz) {
              return pointLocal(cx + px * c - pz * s, y + 0.018, cz + px * s + pz * c);
            }
            addPanel(
              p(-hw, -hd),
              p(hw, -hd),
              p(hw, hd),
              p(-hw, hd),
              TEX.black,
              [b[5] * 1.45, b[6] * 1.45, b[7] * 1.45],
              0
            );
          }
          function floorStrip(ax, az, bx, bz, halfW, col) {
            const dx = bx - ax;
            const dz = bz - az;
            const inv = 1 / Math.max(0.001, Math.hypot(dx, dz));
            const nx = -dz * inv * halfW;
            const nz = dx * inv * halfW;
            addPanel(
              pointLocal(ax + nx, y + 0.026, az + nz),
              pointLocal(bx + nx, y + 0.026, bz + nz),
              pointLocal(bx - nx, y + 0.026, bz - nz),
              pointLocal(ax - nx, y + 0.026, az - nz),
              TEX.black,
              col,
              0
            );
          }
          floorStrip(x0 + 0.30, z0 + 0.42, x1 - 0.55, z0 + 0.72, 0.035, [0.95, 0.08, 1.80]);
          floorStrip(x0 + 1.10, z1 - 0.92, x1 - 1.20, z1 - 1.48, 0.028, [0.08, 1.35, 1.65]);
          floorStrip(x0 + 2.15, z0 + 2.10, x0 + 3.90, z0 + 2.55, 0.026, [1.70, 0.78, 0.05]);
          floorStrip(x0 + 4.20, z1 - 0.62, x1 - 0.90, z1 - 0.52, 0.020, [0.45, 1.55, 0.20]);
          floorStrip(x0 + 0.78, z0 + 1.10, x0 + 0.78, z0 + 1.11, 0.18, [2.10, 0.28, 0.02]);
          floorStrip(x0 + 3.05, z1 - 1.25, x0 + 3.05, z1 - 1.24, 0.16, [2.40, 0.62, 0.03]);
          floorStrip(x1 - 1.40, z0 + 2.00, x1 - 1.40, z0 + 2.01, 0.17, [1.90, 0.12, 0.02]);
        }
        function addBayStyleHallway(xa, xb, ya, yb, halfW) {
          const z0 = -halfW;
          const z1 = halfW;
          const trimW = 0.04;

          addPanel(
            pointLocal(xa, ya, z0),
            pointLocal(xa, ya, z1),
            pointLocal(xb, ya, z1),
            pointLocal(xb, ya, z0),
            TEX.floor,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, yb, z1),
            pointLocal(xa, yb, z0),
            pointLocal(xb, yb, z0),
            pointLocal(xb, yb, z1),
            TEX.ceil,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, ya, z0),
            pointLocal(xb, ya, z0),
            pointLocal(xb, yb, z0),
            pointLocal(xa, yb, z0),
            TEX.lp2,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xb, ya, z1),
            pointLocal(xa, ya, z1),
            pointLocal(xa, yb, z1),
            pointLocal(xb, yb, z1),
            TEX.rp2,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, ya + 0.01, z0),
            pointLocal(xb, ya + 0.01, z0),
            pointLocal(xb, ya + 0.01, z0 + trimW),
            pointLocal(xa, ya + 0.01, z0 + trimW),
            TEX.black,
            [0.02, 0.02, 0.02],
            0
          );
          addPanel(
            pointLocal(xa, ya + 0.01, z1 - trimW),
            pointLocal(xb, ya + 0.01, z1 - trimW),
            pointLocal(xb, ya + 0.01, z1),
            pointLocal(xa, ya + 0.01, z1),
            TEX.black,
            [0.02, 0.02, 0.02],
            0
          );
        }

        function markMeshes(start, flag) {
          for (let mi = start; mi < meshes.length; mi++) meshes[mi][flag] = true;
        }

        function addAlphaWall(x, ya, yb, halfW, tex) {
          const q = [];
          pushQuad(
            q,
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, halfW),
            pointLocal(x, yb, halfW),
            pointLocal(x, yb, -halfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          meshes.push(self._makeMesh(q, tex, [1, 1, 1], 1, true));
        }

        function addSteepStairwell(xa, xb, topY0, topY1, botY0, botY1, halfW) {
          const z0 = -halfW;
          const z1 = halfW;
          const steps = 18;
          const dx = (xb - xa) / steps;
          const floorDrop = (topY0 - botY0) / steps;
          const ceilDrop = (topY1 - botY1) / steps;
          const wallDim = [0.030, 0.034, 0.038];
          const treadDim = [0.042, 0.046, 0.050];

          for (let k = 0; k < steps; k++) {
            const xA = xa + dx * k;
            const xB = xa + dx * (k + 1);
            const fyA = topY0 - floorDrop * k;
            const fyB = topY0 - floorDrop * (k + 1);
            const cyA = topY1 - ceilDrop * k;
            const cyB = topY1 - ceilDrop * (k + 1);

            addPanel(pointLocal(xA, fyB, z0), pointLocal(xA, fyB, z1), pointLocal(xB, fyB, z1), pointLocal(xB, fyB, z0), TEX.basementFloor, treadDim, 0.62);
            addPanel(pointLocal(xB, fyA, z0), pointLocal(xB, fyA, z1), pointLocal(xB, fyB, z1), pointLocal(xB, fyB, z0), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xA, fyA, z0), pointLocal(xB, fyB, z0), pointLocal(xB, cyB, z0), pointLocal(xA, cyA, z0), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xB, fyB, z1), pointLocal(xA, fyA, z1), pointLocal(xA, cyA, z1), pointLocal(xB, cyB, z1), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xA, cyA, z1), pointLocal(xA, cyA, z0), pointLocal(xB, cyB, z0), pointLocal(xB, cyB, z1), TEX.stairWall, wallDim, 0.66);
          }
        }

        function addStairwellCrackSeal(xa, xb, topY0, topY1, botY0, botY1, halfW) {
          const z0 = -halfW - 0.085;
          const z1 =  halfW + 0.085;
          const dim = [0.026, 0.030, 0.034];

          addPanel(
            pointLocal(xa - 0.035, topY0 - 0.030, z0),
            pointLocal(xb + 0.055, botY0 - 0.030, z0),
            pointLocal(xb + 0.055, botY1 + 0.070, z0),
            pointLocal(xa - 0.035, topY1 + 0.070, z0),
            TEX.stairWall,
            dim,
            0.74
          );

          addPanel(
            pointLocal(xb + 0.055, botY0 - 0.030, z1),
            pointLocal(xa - 0.035, topY0 - 0.030, z1),
            pointLocal(xa - 0.035, topY1 + 0.070, z1),
            pointLocal(xb + 0.055, botY1 + 0.070, z1),
            TEX.stairWall,
            dim,
            0.74
          );

          addPanel(
            pointLocal(xa - 0.035, topY1 + 0.055, z1),
            pointLocal(xa - 0.035, topY1 + 0.055, z0),
            pointLocal(xb + 0.055, botY1 + 0.055, z0),
            pointLocal(xb + 0.055, botY1 + 0.055, z1),
            TEX.stairWall,
            dim,
            0.62
          );

          addPanel(
            pointLocal(xa - 0.035, topY0 - 0.060, z0),
            pointLocal(xa - 0.035, topY0 - 0.060, z1),
            pointLocal(xb + 0.055, botY0 - 0.060, z1),
            pointLocal(xb + 0.055, botY0 - 0.060, z0),
            TEX.stairWall,
            dim,
            0.55
          );
        }

        function addLightPool(cx, cz, floorY, rx, rz, col) {
          return;
        }

        function addCeilingBulb(cx, cz, floorY, ceilY) {
          const by = ceilY - 0.14;
          addBox(cx - 0.045, cx + 0.045, by - 0.055, by + 0.055, cz - 0.045, cz + 0.045, TEX.black, [1.55, 1.85, 2.30], 0);
          addBox(cx - 0.13, cx + 0.13, ceilY - 0.035, ceilY - 0.010, cz - 0.13, cz + 0.13, TEX.black, [0.10, 0.085, 0.060], 0);
          addLightPool(cx, cz, floorY, 0.92, 0.72, [0.34, 0.22, 0.105]);
        }

        const hallY0 = FLOOR_Y;
        const hallY1 = CEIL_Y * 0.88;
        const hallX0 = OUTER_W + 0.12;
        const hallX1 = OUTER_W + 5.20;
        const hallHalfW = 1.15;

        addBayStyleHallway(hallX0, hallX1, hallY0, hallY1, hallHalfW);

        const exteriorStart = meshes.length;
        const oldAnnexX0 = hallX1;
        const oldAnnexX1 = hallX1 + 8.80;
        const oldAnnexHalfW = 4.20;
        const oldAnnexY0 = FLOOR_Y;
        const oldAnnexY1 = hallY1 + 0.16;

        addRoom(oldAnnexX0, oldAnnexX1, oldAnnexY0, oldAnnexY1, -oldAnnexHalfW, oldAnnexHalfW, true, true);
        addSpeakerStage(
          oldAnnexX0 + 0.62,
          oldAnnexX0 + 4.18,
          oldAnnexY0,
          oldAnnexY0 + 1.72,
          -oldAnnexHalfW + 0.48,
          -1.88
        );
        addRaveAftermath(oldAnnexX0 + 0.25, oldAnnexX1 - 0.60, oldAnnexY0, -oldAnnexHalfW + 0.35, oldAnnexHalfW - 0.35);

        const oldExitWallX = oldAnnexX1 - 0.012;
        addExitWallFace(oldExitWallX, oldAnnexY0, oldAnnexY1, oldAnnexHalfW);
        addBayStyleHallway(oldExitWallX + 0.015, oldExitWallX + 4.40, oldAnnexY0, oldAnnexY1, 1.45);
        addBulkheadWithOpening(oldAnnexX0 + 0.01, oldAnnexY0, oldAnnexY1, oldAnnexHalfW, hallY0, hallY1, hallHalfW + 0.12, TEX.basementWall);
        addCollar(oldAnnexX0, hallY0, hallY1, hallHalfW + 0.16, hallHalfW + 0.62);
        markMeshes(exteriorStart, "annexExterior");

        const interiorStart = meshes.length;
        const stairX0 = hallX1;
        const stairX1 = stairX0 + 7.80;
        const stairHalfW = 0.38;
        const annexDrop = 3.80;

        const annexX0 = stairX1;
        const annexX1 = annexX0 + 7.80;
        const annexHalfW = 3.55;
        const annexY0 = FLOOR_Y - annexDrop;
        const annexY1 = hallY1 - annexDrop + 0.24;

        addAlphaWall(
          hallX1 + 0.012,
          hallY0 - 0.02,
          hallY1 + 0.02,
          hallHalfW + 0.02,
          TEX.basementAltDoorHall || TEX.spaceHallDoor
        );

        const topStairDoorBulbStart = meshes.length;
        addBox(hallX1 + 0.030, hallX1 + 0.090, hallY1 - 0.075, hallY1 - 0.015, -0.170, 0.170, TEX.black, [0.060, 0.045, 0.026], 0.0);
        addBox(hallX1 + 0.078, hallX1 + 0.152, hallY1 - 0.150, hallY1 - 0.076, -0.058, 0.058, TEX.black, [4.30, 0.18, 0.08], 0.0);
        addBox(hallX1 + 0.063, hallX1 + 0.168, hallY1 - 0.166, hallY1 - 0.156, -0.078, 0.078, TEX.black, [0.34, 0.05, 0.025], 0.0);
        for (let mi = topStairDoorBulbStart; mi < meshes.length; mi++) meshes[mi].annexTopDoorBulb = true;
        self.altAnnexTopDoorBulbWorld = pointLocal(hallX1 + 0.115, hallY1 - 0.105, 0.0);

        addSteepStairwell(
          stairX0 + 0.12,
          stairX1,
          hallY0,
          hallY1,
          annexY0,
          annexY1,
          stairHalfW
        );

        addStairwellCrackSeal(
          stairX0 + 0.12,
          stairX1,
          hallY0,
          hallY1,
          annexY0,
          annexY1,
          stairHalfW
        );

        const normalAnnexRoomStart = meshes.length;
        addRoom(annexX0, annexX1, annexY0, annexY1, -annexHalfW, annexHalfW, true, true);

        const normalBasementStart = meshes.length;

        {
          const baseStart = meshes.length;
          const exitTilesZ = Math.max(4, Math.ceil((annexHalfW * 2.0) / 1.05));
          const exitTilesY = 1;
          addTiledPanel(
            pointLocal(annexX1 - 0.030, annexY0, -annexHalfW),
            pointLocal(annexX1 - 0.030, annexY0,  annexHalfW),
            pointLocal(annexX1 - 0.030, annexY1,  annexHalfW),
            pointLocal(annexX1 - 0.030, annexY1, -annexHalfW),
            TEX.basementWall,
            [0.035, 0.040, 0.045],
            0.58,
            exitTilesZ,
            exitTilesY
          );
          for (let mi = baseStart; mi < meshes.length; mi++) meshes[mi].annexBaseExitWall = true;
        }

        self.annexExitLightWorld = pointLocal(
          annexX1 - 0.16,
          annexY0 + (annexY1 - annexY0) * 0.48,
          0.0
        );

        {
          const q = [];
          pushQuad(
            q,
            pointLocal(annexX1 - 0.018, annexY0, -annexHalfW),
            pointLocal(annexX1 - 0.018, annexY0,  annexHalfW),
            pointLocal(annexX1 - 0.018, annexY1,  annexHalfW),
            pointLocal(annexX1 - 0.018, annexY1, -annexHalfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.basementWallExit, [1, 1, 1], 1.0, true);
          mesh.greenKey = true;
          mesh.annexEventExitWall = true;
          meshes.push(mesh);
        }

        {
          const portalNearX = annexX1 + 0.045;
          const portalFarX = annexX1 + 1.55;
          const portalHalfW = annexHalfW * 0.245;
          const portalY0 = annexY0 + 0.05;
          const portalY1 = annexY0 + (annexY1 - annexY0) * 0.79;
          const portalCol = [0.006, 0.010, 0.014];

          function addSetbackPanel(p00, p10, p11, p01, tex, flatCol, texMix) {
            const q = [];
            pushQuad(q, p00, p10, p11, p01, [0, 1], [1, 1], [1, 0], [0, 0]);
            const mesh = self._makeMesh(
              q,
              tex,
              flatCol || portalCol,
              typeof texMix === "number" ? texMix : 0.0,
              false
            );
            mesh.annexSetbackPortalTunnel = true;
            meshes.push(mesh);
            return mesh;
          }

          addSetbackPanel(
            pointLocal(portalNearX, portalY0, -portalHalfW),
            pointLocal(portalFarX,  portalY0, -portalHalfW),
            pointLocal(portalFarX,  portalY1, -portalHalfW),
            pointLocal(portalNearX, portalY1, -portalHalfW),
            TEX.black,
            portalCol,
            0.0
          );

          addSetbackPanel(
            pointLocal(portalFarX,  portalY0, portalHalfW),
            pointLocal(portalNearX, portalY0, portalHalfW),
            pointLocal(portalNearX, portalY1, portalHalfW),
            pointLocal(portalFarX,  portalY1, portalHalfW),
            TEX.black,
            portalCol,
            0.0
          );

          addSetbackPanel(
            pointLocal(portalNearX, portalY1, -portalHalfW),
            pointLocal(portalFarX,  portalY1, -portalHalfW),
            pointLocal(portalFarX,  portalY1,  portalHalfW),
            pointLocal(portalNearX, portalY1,  portalHalfW),
            TEX.black,
            [0.010, 0.014, 0.018],
            0.0
          );

          addSetbackPanel(
            pointLocal(portalNearX, portalY0,  portalHalfW),
            pointLocal(portalFarX,  portalY0,  portalHalfW),
            pointLocal(portalFarX,  portalY0, -portalHalfW),
            pointLocal(portalNearX, portalY0, -portalHalfW),
            TEX.black,
            [0.004, 0.007, 0.010],
            0.0
          );

          {
            const q = [];
            const insetW = portalHalfW * 0.88;
            const insetY0 = portalY0 + 0.10;
            const insetY1 = portalY1 - 0.08;

            pushQuad(
              q,
              pointLocal(portalFarX, insetY0, -insetW),
              pointLocal(portalFarX, insetY0,  insetW),
              pointLocal(portalFarX, insetY1,  insetW),
              pointLocal(portalFarX, insetY1, -insetW),
              [0.12, 0.96], [0.88, 0.96], [0.88, 0.04], [0.12, 0.04]
            );

            const mesh = self._makeMesh(q, TEX.black, [1, 1, 1], 1.0, false);
            mesh.annexCabinPortalWall = true;
            mesh.annexSetbackCabinPortal = true;
            meshes.push(mesh);
          }
        }

        {
          const q = [];
          pushQuad(
            q,
            pointLocal(annexX0 + 0.04, annexY0, -annexHalfW + 0.018),
            pointLocal(annexX1 - 0.04, annexY0, -annexHalfW + 0.018),
            pointLocal(annexX1 - 0.04, annexY1, -annexHalfW + 0.018),
            pointLocal(annexX0 + 0.04, annexY1, -annexHalfW + 0.018),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.crywolf, [1, 1, 1], 1.0, false);
          mesh.annexCrywolfWall = true;
          meshes.push(mesh);
        }

        self.annexLightWorld = [
          pointLocal(annexX0 + 2.45, annexY1 - 0.14, -annexHalfW + 1.10),
          pointLocal(annexX0 + 0.78, annexY1 - 0.14,  0.00),
          pointLocal(hallX1 + 0.115, hallY1 - 0.105, 0.0)
        ];
        self.annexLightColorWorld = [
          [0.62, 0.72, 0.88],
          [1.30, 0.06, 0.03],
          [1.30, 0.06, 0.03]
        ];
        addCeilingBulb(annexX0 + 2.45, -annexHalfW + 1.10, annexY0, annexY1);
        addCeilingBulb(annexX0 + 0.78,  0.00, annexY0, annexY1);

        addBulkheadWithOpening(
          annexX0 + 0.01,
          annexY0,
          annexY1,
          annexHalfW,
          annexY0 + 0.08,
          annexY1 - 0.08,
          stairHalfW + 0.20,
          TEX.basementWall
        );

        addCollar(
          annexX0,
          annexY0 + 0.06,
          annexY1 - 0.06,
          stairHalfW + 0.14,
          stairHalfW + 0.66
        );

        addSpeakerStage(
          annexX0 + 0.70,
          annexX0 + 4.35,
          annexY0,
          annexY0 + 1.72,
          -annexHalfW + 0.50,
          -1.95
        );

        addRaveAftermath(
          annexX0 + 0.30,
          annexX1 - 0.60,
          annexY0,
          -annexHalfW + 0.38,
          annexHalfW - 0.38
        );

        for (let mi = normalBasementStart; mi < meshes.length; mi++) meshes[mi].annexNormalOnly = true;

        for (let mi = normalAnnexRoomStart; mi < meshes.length; mi++) {
          meshes[mi].annexNormalOnly = true;
        }

        const altAnnexSpriteRoomStart = meshes.length;
        const altWallTex = TEX.basementAltWall;
        const altDoorHallTex = TEX.basementAltWall;

        function markAltFrom(startIndex) {
          for (let mi = startIndex; mi < meshes.length; mi++) meshes[mi].annexAltOnly = true;
        }

        function addAltQuad(a, b, c, d, tex, col, texMix) {
          const q = [];
          pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
          const mesh = self._makeMesh(q, tex || TEX.black, col || [0.006, 0.005, 0.005], typeof texMix === "number" ? texMix : 0.0, false);
          mesh.blend = false;
          mesh.useTexAlpha = false;
          mesh.annexAltOnly = true;
          meshes.push(mesh);
          return mesh;
        }

        function addAltBox(x0, x1, y0, y1, z0, z1, col, tex, texMix) {
          const s = meshes.length;
          addBox(x0, x1, y0, y1, z0, z1, tex || TEX.black, col || [0.006, 0.005, 0.005], typeof texMix === "number" ? texMix : 0.0);
          markAltFrom(s);
        }

        function addAltFloor(x0, x1, z0, z1, col) {
          addAltQuad(pointLocal(x0, annexY0 + 0.012, z0), pointLocal(x1, annexY0 + 0.012, z0), pointLocal(x1, annexY0 + 0.012, z1), pointLocal(x0, annexY0 + 0.012, z1), TEX.basementFloor, col || [0.014, 0.012, 0.012], 0.52);
        }

        function addAltCeil(x0, x1, z0, z1, col) {
          addAltQuad(pointLocal(x1, annexY1 - 0.012, z0), pointLocal(x0, annexY1 - 0.012, z0), pointLocal(x0, annexY1 - 0.012, z1), pointLocal(x1, annexY1 - 0.012, z1), TEX.basementCeil, col || [0.018, 0.016, 0.017], 0.56);
        }

        function addAltWallZ(x0, x1, z, col) {
          addAltQuad(pointLocal(x0, annexY0, z), pointLocal(x1, annexY0, z), pointLocal(x1, annexY1, z), pointLocal(x0, annexY1, z), altWallTex, col || [0.016, 0.011, 0.012], 0.96);
        }

        function addAltWallX(x, z0, z1, col) {
          addAltQuad(pointLocal(x, annexY0, z1), pointLocal(x, annexY0, z0), pointLocal(x, annexY1, z0), pointLocal(x, annexY1, z1), altWallTex, col || [0.016, 0.011, 0.012], 0.96);
        }

        function addDoorHallWallX(x, z0, z1, col) {
          addAltQuad(pointLocal(x, annexY0, z1), pointLocal(x, annexY0, z0), pointLocal(x, annexY1, z0), pointLocal(x, annexY1, z1), altDoorHallTex, col || [0.020, 0.015, 0.014], 0.98);
        }

        function addDoorHallWallZ(x0, x1, z, col) {
          addAltQuad(pointLocal(x0, annexY0, z), pointLocal(x1, annexY0, z), pointLocal(x1, annexY1, z), pointLocal(x0, annexY1, z), altDoorHallTex, col || [0.020, 0.015, 0.014], 0.98);
        }

        {
          const altX0 = annexX0;
          const altX1 = annexX1;
          const roomLen = altX1 - altX0;
          const stairOpen = stairHalfW + 0.22;

          const pathLeftZ = -0.72;
          const pathRightZ = annexHalfW + 0.42;

          const alcoveStartX = altX0 + roomLen * 0.48;
          const alcoveEndX = altX1 - 0.24;

          const alcoveFrontZ = pathLeftZ;
          const alcoveBackZ = -annexHalfW - 4.60;

          const occluderZ0 = pathLeftZ;
          const occluderZ1 = pathLeftZ;
          const occluderX0 = altX0 + 0.34;
          const occluderX1 = alcoveStartX;
const portalX = alcoveEndX;

          addAltFloor(altX0, altX1 + 0.28, pathLeftZ, pathRightZ, [0.013, 0.012, 0.012]);
          addAltCeil(altX0, altX1 + 0.28, pathLeftZ, pathRightZ, [0.017, 0.015, 0.016]);

          addAltWallZ(altX0, altX1 + 0.28, pathRightZ, [0.014, 0.011, 0.012]);

          // Z4_ALT_ANNEX_BACKWALL_BATHROOM_CLUB_PARALLAX_PATCH
          // Right-hand back wall only. BACKWALL.png is green-keyed; bathroom-club.png is set back behind the keyed area.
          {
            const z4BackWallX = altX1 + 0.24;

            const z4BackWallMesh = addAltQuad(
              pointLocal(z4BackWallX, annexY0, pathRightZ),
              pointLocal(z4BackWallX, annexY0, pathLeftZ),
              pointLocal(z4BackWallX, annexY1, pathLeftZ),
              pointLocal(z4BackWallX, annexY1, pathRightZ),
              TEX.basementBackWall,
              [1.0, 1.0, 1.0],
              1.0
            );
            z4BackWallMesh.greenKey = true;
            z4BackWallMesh.backWallGreenKey = true;

            // Green box measured from BACKWALL.png.
            // Texture is mapped mirrored on this X wall, so convert image UV -> world Z using existing mapping.
            const z4GreenU0 = 1562.0 / 2048.0;
            const z4GreenU1 = 1938.0 / 2048.0;
            const z4GreenT0 = 338.0 / 1017.0;
            const z4GreenT1 = 1009.0 / 1017.0;

            const z4HoleZA = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU0;
            const z4HoleZB = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU1;
            const z4HoleZ0 = Math.min(z4HoleZA, z4HoleZB);
            const z4HoleZ1 = Math.max(z4HoleZA, z4HoleZB);

            const z4HoleYA = annexY1 + (annexY0 - annexY1) * z4GreenT0;
            const z4HoleYB = annexY1 + (annexY0 - annexY1) * z4GreenT1;
            const z4HoleY0 = Math.min(z4HoleYA, z4HoleYB);
            const z4HoleY1 = Math.max(z4HoleYA, z4HoleYB);

            const z4RevealX0 = z4BackWallX + 0.030;
            const z4BathroomX = z4BackWallX + 1.32;
            const z4RevealPadZ = 0.035;
            const z4RevealPadY = 0.030;

            addAltBox(
              z4RevealX0,
              z4BathroomX,
              z4HoleY0 - z4RevealPadY,
              z4HoleY1 + z4RevealPadY,
              z4HoleZ0 - z4RevealPadZ,
              z4HoleZ0 + 0.010,
              [0.014, 0.010, 0.011],
              altWallTex,
              0.96
            );
            addAltBox(
              z4RevealX0,
              z4BathroomX,
              z4HoleY0 - z4RevealPadY,
              z4HoleY1 + z4RevealPadY,
              z4HoleZ1 - 0.010,
              z4HoleZ1 + z4RevealPadZ,
              [0.014, 0.010, 0.011],
              altWallTex,
              0.96
            );
            addAltBox(
              z4RevealX0,
              z4BathroomX,
              z4HoleY1 - 0.010,
              z4HoleY1 + z4RevealPadY,
              z4HoleZ0 - z4RevealPadZ,
              z4HoleZ1 + z4RevealPadZ,
              [0.013, 0.010, 0.011],
              altWallTex,
              0.96
            );
            addAltBox(
              z4RevealX0,
              z4BathroomX,
              z4HoleY0 - z4RevealPadY,
              z4HoleY0 + 0.010,
              z4HoleZ0 - z4RevealPadZ,
              z4HoleZ1 + z4RevealPadZ,
              [0.010, 0.009, 0.009],
              TEX.basementFloor,
              0.72
            );

            {
              const q = [];
              pushQuad(
                q,
                pointLocal(z4BathroomX, z4HoleY0, z4HoleZ1),
                pointLocal(z4BathroomX, z4HoleY0, z4HoleZ0),
                pointLocal(z4BathroomX, z4HoleY1, z4HoleZ0),
                pointLocal(z4BathroomX, z4HoleY1, z4HoleZ1),
                [1, 1],
                [0, 1],
                [0, 0],
                [1, 0]
              );
              const z4BathroomMesh = self._makeMesh(q, TEX.basementBathroomClub, [1.0, 1.0, 1.0], 1.0, false);
              z4BathroomMesh.blend = false;
              z4BathroomMesh.useTexAlpha = false;
              z4BathroomMesh.annexAltOnly = true;
              z4BathroomMesh.backWallBathroomClub = true;
              meshes.push(z4BathroomMesh);
            }

            self.altAnnexBackWallBathroomClubWorld = pointLocal(
              z4BathroomX,
              (z4HoleY0 + z4HoleY1) * 0.5,
              (z4HoleZ0 + z4HoleZ1) * 0.5
            );
          }


          addDoorHallWallX(altX0 + 0.010, pathLeftZ, -stairOpen, [0.020, 0.015, 0.014]);
          addDoorHallWallX(altX0 + 0.010, stairOpen, pathRightZ, [0.020, 0.015, 0.014]);

          addAltBox(altX0 - 0.12, altX0 + 0.32, annexY0, annexY1, -stairOpen - 0.10, -stairOpen + 0.02, [0.020, 0.015, 0.014], altDoorHallTex, 0.98);
          addAltBox(altX0 - 0.12, altX0 + 0.32, annexY0, annexY1, stairOpen - 0.02, stairOpen + 0.10, [0.020, 0.015, 0.014], altDoorHallTex, 0.98);
          addDoorHallWallZ(altX0 - 0.04, altX0 + 0.34, -stairOpen - 0.10, [0.020, 0.015, 0.014]);
          addDoorHallWallZ(altX0 - 0.04, altX0 + 0.34, stairOpen + 0.10, [0.020, 0.015, 0.014]);

          // Z4_ALT_ANNEX_STAIR_FRAME_SEAL_PATCH
          addAltBox(
            altX0 - 0.18,
            altX0 + 0.62,
            annexY0,
            annexY1,
            -stairOpen - 0.055,
            -stairHalfW + 0.045,
            [0.021, 0.016, 0.015],
            altDoorHallTex,
            0.98
          );
          addAltBox(
            altX0 - 0.18,
            altX0 + 0.62,
            annexY0,
            annexY1,
            stairHalfW - 0.045,
            stairOpen + 0.055,
            [0.021, 0.016, 0.015],
            altDoorHallTex,
            0.98
          );
          addAltBox(
            altX0 - 0.18,
            altX0 + 0.62,
            annexY1 - 0.245,
            annexY1 + 0.025,
            -stairOpen - 0.070,
            stairOpen + 0.070,
            [0.020, 0.015, 0.014],
            altDoorHallTex,
            0.98
          );
          addAltBox(
            altX0 + 0.30,
            altX0 + 0.70,
            annexY0,
            annexY1,
            -stairHalfW - 0.050,
            -stairHalfW + 0.035,
            [0.018, 0.014, 0.013],
            altDoorHallTex,
            0.98
          );
          addAltBox(
            altX0 + 0.30,
            altX0 + 0.70,
            annexY0,
            annexY1,
            stairHalfW - 0.035,
            stairHalfW + 0.050,
            [0.018, 0.014, 0.013],
            altDoorHallTex,
            0.98
          );

          const bulbY = annexY1 - 0.185;
          const bulbStart = meshes.length;
          addAltBox(altX0 + 0.035, altX0 + 0.095, bulbY + 0.035, bulbY + 0.085, -0.155, 0.155, [0.030, 0.022, 0.014], TEX.black, 0.0);
          addAltBox(altX0 + 0.085, altX0 + 0.165, bulbY - 0.025, bulbY + 0.045, -0.060, 0.060, [4.10, 0.16, 0.07], TEX.black, 0.0);
          for (let mi = bulbStart; mi < meshes.length; mi++) meshes[mi].annexAltDoorBulb = true;

          addAltWallZ(occluderX0, occluderX1, pathLeftZ, [0.026, 0.023, 0.020]);

          addAltBox(
            occluderX0 - 0.045,
            occluderX1 + 0.045,
            annexY0,
            annexY1,
            pathLeftZ - 0.070,
            pathLeftZ + 0.070,
            [0.026, 0.023, 0.020],
            altWallTex,
            0.98
          );

          addAltFloor(alcoveStartX, alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.011, 0.009, 0.009]);
          addAltCeil(alcoveStartX, alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.016, 0.012, 0.013]);

          addAltWallZ(alcoveStartX, alcoveEndX, alcoveBackZ, [0.032, 0.008, 0.010]);
const stageRedStart = meshes.length;
          addAltBox(alcoveStartX + 0.42, alcoveEndX - 0.42, annexY1 - 0.190, annexY1 - 0.110, alcoveBackZ + 0.145, alcoveBackZ + 0.285, [2.15, 0.040, 0.020], TEX.black, 0.0);
          addAltBox(alcoveStartX + 0.70, alcoveEndX - 0.70, annexY1 - 0.340, annexY1 - 0.285, alcoveBackZ + 0.320, alcoveBackZ + 0.430, [0.92, 0.026, 0.014], TEX.black, 0.0);
          addAltQuad(
            pointLocal(alcoveStartX + 0.18, annexY0 + 0.019, alcoveBackZ + 0.38),
            pointLocal(alcoveEndX - 0.18, annexY0 + 0.019, alcoveBackZ + 0.38),
            pointLocal(alcoveEndX - 0.34, annexY0 + 0.019, alcoveFrontZ - 0.02),
            pointLocal(alcoveStartX + 0.34, annexY0 + 0.019, alcoveFrontZ - 0.02),
            TEX.black,
            [0.135, 0.007, 0.004],
            0.0
          );
          addAltQuad(
            pointLocal(alcoveEndX - 0.20, annexY1 - 0.028, alcoveBackZ + 0.30),
            pointLocal(alcoveStartX + 0.20, annexY1 - 0.028, alcoveBackZ + 0.30),
            pointLocal(alcoveStartX + 0.54, annexY1 - 0.028, alcoveFrontZ - 0.08),
            pointLocal(alcoveEndX - 0.54, annexY1 - 0.028, alcoveFrontZ - 0.08),
            TEX.black,
            [0.095, 0.005, 0.003],
            0.0
          );

          for (let mi = stageRedStart; mi < meshes.length; mi++) meshes[mi].annexAltStageRedGlow = true;
          self.altAnnexStageRedLightWorld = pointLocal(alcoveStartX + (alcoveEndX - alcoveStartX) * 0.50, annexY1 - 0.22, alcoveBackZ + 0.38);
          self.altAnnexStageWhiteLightWorld = pointLocal(alcoveStartX + (alcoveEndX - alcoveStartX) * 0.50, annexY1 - 0.42, alcoveBackZ + 0.94);

          function altCrowdHash(n) {
            return Math.abs(Math.sin(n * 127.13 + 19.71) * 43758.5453) % 1;
          }

          function makeAltCrowdTexture(img) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tex;
          }

          function addAltCrowdMesh(data, tex, col, texMix, blend, useAlpha) {
            if (!data || data.length < 24) return null;
            const mesh = self._makeMesh(data, tex || TEX.black, col || [1, 1, 1], typeof texMix === "number" ? texMix : 1.0, !!blend);
            mesh.annexAltOnly = true;
            mesh.annexInterior = true;
            mesh.annexAltCrowdVisual = true;
            mesh.annexAltCrowd = true;
            mesh.useTexAlpha = !!useAlpha;
            meshes.push(mesh);
            return mesh;
          }

          function addAltCrowdShadow(cx, cz, sx, sz, yaw, rowFade) {
            const c = Math.cos(yaw);
            const s = Math.sin(yaw);
            function rp(dx, dz) {
              return pointLocal(cx + dx * c - dz * s, annexY0 + 0.020, cz + dx * s + dz * c);
            }
            addAltQuad(
              rp(-sx, -sz),
              rp( sx, -sz),
              rp( sx,  sz),
              rp(-sx,  sz),
              TEX.black,
              [0.028 * rowFade, 0.004, 0.003],
              0.0
            );
          }

          function addAltExtrudedCrowdPerson(img, tex, cx, cz, sc, yaw, seed, rowFade) {
            const cw = 84;
            const ch = 212;
            const cnv = document.createElement("canvas");
            cnv.width = cw;
            cnv.height = ch;
            const ctx = cnv.getContext("2d", { willReadFrequently: true });
            ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            const pix = ctx.getImageData(0, 0, cw, ch).data;

            const bands = 76;
            const capSegments = 0;
            const sliceCount = 8;
            const personH = sc * (1.54 + altCrowdHash(seed + 2.0) * 0.18);
            const personW = sc * (0.52 + altCrowdHash(seed + 4.0) * 0.12);
            const bodyDepth = sc * (0.050 + altCrowdHash(seed + 6.0) * 0.018);
            const bevel = bodyDepth * 0.58;
            const yBase = annexY0 + 0.018;
            const c = Math.cos(yaw);
            const s = Math.sin(yaw);
            const face = [];
            const shell = [];
            const slices = [];

            function pLocal(px, py, pz) {
              const dx = px - cx;
              const dz = pz - cz;
              return pointLocal(cx + dx * c - dz * s, py, cz + dx * s + dz * c);
            }

            function alphaAt(x, y) {
              x = Math.max(0, Math.min(cw - 1, x | 0));
              y = Math.max(0, Math.min(ch - 1, y | 0));
              return pix[(y * cw + x) * 4 + 3];
            }

            const left = new Array(bands);
            const right = new Array(bands);

            for (let b = 0; b < bands; b++) {
              const yImg0 = Math.floor((bands - 1 - b) / bands * ch);
              const yImg1 = Math.floor((bands - b) / bands * ch);
              let minX = cw;
              let maxX = -1;

              for (let yy = yImg0; yy < yImg1; yy++) {
                for (let xx = 0; xx < cw; xx++) {
                  if (alphaAt(xx, yy) > 22) {
                    if (xx < minX) minX = xx;
                    if (xx > maxX) maxX = xx;
                  }
                }
              }

              if (maxX > minX) {
                left[b] = Math.max(0, minX - 1);
                right[b] = Math.min(cw - 1, maxX + 1);
              } else {
                left[b] = null;
                right[b] = null;
              }
            }

            for (let pass = 0; pass < 3; pass++) {
              const nl = left.slice();
              const nr = right.slice();

              for (let b = 0; b < bands; b++) {
                if (left[b] === null || right[b] === null) continue;

                let sl = left[b] * 0.48;
                let sr = right[b] * 0.48;
                let wl = 0.48;
                let wr = 0.48;

                for (let o = -3; o <= 3; o++) {
                  if (o === 0) continue;
                  const bi = b + o;
                  if (bi < 0 || bi >= bands) continue;
                  if (left[bi] === null || right[bi] === null) continue;
                  const ao = Math.abs(o);
                  const w = ao === 1 ? 0.24 : (ao === 2 ? 0.07 : 0.018);
                  sl += left[bi] * w;
                  sr += right[bi] * w;
                  wl += w;
                  wr += w;
                }

                nl[b] = sl / wl;
                nr[b] = sr / wr;
              }

              for (let b = 0; b < bands; b++) {
                left[b] = nl[b];
                right[b] = nr[b];
              }
            }

            let firstBand = -1;

            function roundedSidePoint(side, t, xF, xB, zEdge) {
              const x = xF + (xB - xF) * t;
              const inward = (1.0 - Math.sin(Math.PI * t)) * bevel;
              const z = side < 0 ? zEdge + inward : zEdge - inward;
              return [x, z];
            }

            for (let b = 0; b < bands; b++) {
              if (left[b] === null || right[b] === null) continue;

              const v0 = b / bands;
              const v1 = (b + 1) / bands;
              const y0 = yBase + personH * v0;
              const y1 = yBase + personH * v1;

              const uL = left[b] / (cw - 1);
              const uR = right[b] / (cw - 1);

              const zL = cz + (uL - 0.5) * personW;
              const zR = cz + (uR - 0.5) * personW;
              const xF = cx - bodyDepth * 0.50;
              const xB = cx + bodyDepth * 0.50;

              for (let j = 0; j < sliceCount; j++) {
                const t = sliceCount === 1 ? 0.5 : j / (sliceCount - 1);
                const x = xF + (xB - xF) * t;
                const inward = (1.0 - Math.sin(Math.PI * t)) * bevel;
                const zLS = zL + inward;
                const zRS = zR - inward;
                const target = (j === 0 || j === sliceCount - 1) ? face : slices;

                pushQuad(
                  target,
                  pLocal(x, y0, zLS),
                  pLocal(x, y0, zRS),
                  pLocal(x, y1, zRS),
                  pLocal(x, y1, zLS),
                  [uL, 1.0 - v0], [uR, 1.0 - v0], [uR, 1.0 - v1], [uL, 1.0 - v1]
                );
              }

              for (let j = 0; j < capSegments; j++) {
                const t0 = j / capSegments;
                const t1 = (j + 1) / capSegments;

                let a = roundedSidePoint(-1, t0, xF, xB, zL);
                let d = roundedSidePoint(-1, t1, xF, xB, zL);

                pushQuad(
                  shell,
                  pLocal(a[0], y0, a[1]),
                  pLocal(d[0], y0, d[1]),
                  pLocal(d[0], y1, d[1]),
                  pLocal(a[0], y1, a[1]),
                  [0, 1], [1, 1], [1, 0], [0, 0]
                );

                a = roundedSidePoint(1, t0, xF, xB, zR);
                d = roundedSidePoint(1, t1, xF, xB, zR);

                pushQuad(
                  shell,
                  pLocal(d[0], y0, d[1]),
                  pLocal(a[0], y0, a[1]),
                  pLocal(a[0], y1, a[1]),
                  pLocal(d[0], y1, d[1]),
                  [0, 1], [1, 1], [1, 0], [0, 0]
                );
              }

              if (firstBand < 0) firstBand = b;
            }

            if (firstBand >= 0) {
              addAltCrowdShadow(cx, cz, bodyDepth * 1.55, personW * 0.40, yaw, rowFade);

              const tint = [
                0.36 + altCrowdHash(seed + 11.0) * 0.12,
                0.24 + altCrowdHash(seed + 12.0) * 0.08,
                0.22 + altCrowdHash(seed + 13.0) * 0.07
              ];

              const softTint = [
                0.18 + altCrowdHash(seed + 21.0) * 0.05,
                0.08 + altCrowdHash(seed + 22.0) * 0.03,
                0.07 + altCrowdHash(seed + 23.0) * 0.025
              ];

              addAltCrowdMesh(slices, tex, softTint, 1.0, true, true);
              addAltCrowdMesh(face, tex, tint, 1.0, true, true);
            }
          }

          function makeAltFogGradientTexture(r, g, b, a) {
            const size = 128;
            const cnv = document.createElement("canvas");
            cnv.width = size;
            cnv.height = size;
            const ctx = cnv.getContext("2d");
            const grd = ctx.createRadialGradient(size * 0.50, size * 0.50, size * 0.04, size * 0.50, size * 0.50, size * 0.50);
            grd.addColorStop(0.00, "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")");
            grd.addColorStop(0.28, "rgba(" + r + "," + g + "," + b + "," + (a * 0.78 / 255) + ")");
            grd.addColorStop(0.62, "rgba(" + r + "," + g + "," + b + "," + (a * 0.28 / 255) + ")");
            grd.addColorStop(1.00, "rgba(" + r + "," + g + "," + b + ",0)");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, size, size);
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tex;
          }

          if (!TEX.altFogRed) TEX.altFogRed = makeAltFogGradientTexture(255, 54, 38, 120);
          if (!TEX.altFogSmoke) TEX.altFogSmoke = makeAltFogGradientTexture(230, 218, 205, 110);
          if (!TEX.altFogWhite) TEX.altFogWhite = makeAltFogGradientTexture(255, 250, 232, 130);

          function addAltDynamicFogWisp(cx, cz, cy, w, h, ang, phase, speed, tex, col, alphaBase) {
            const q0 = [];
            pushQuad(
              q0,
              pointLocal(cx - w * 0.5, cy - h * 0.5, cz),
              pointLocal(cx + w * 0.5, cy - h * 0.5, cz),
              pointLocal(cx + w * 0.5, cy + h * 0.5, cz),
              pointLocal(cx - w * 0.5, cy + h * 0.5, cz),
              [0, 1], [1, 1], [1, 0], [0, 0]
            );

            const mesh = self._makeMesh(q0, tex, col, 0.0, true);
            mesh.annexAltOnly = true;
            mesh.annexInterior = true;
            mesh.annexAltFog = true;
            mesh.annexAltFogWisp = true;
            mesh.altAnnexFogMachine = true;
            mesh.useTexAlpha = true;
            mesh.blend = true;

            mesh.altFogUpdater = function(now) {
              const t = now * 0.001;
              const breathe = 0.5 + 0.5 * Math.sin(t * speed + phase);
              const driftA = Math.sin(t * (speed * 0.43) + phase * 1.73);
              const driftB = Math.cos(t * (speed * 0.31) + phase * 2.19);
              const strobe = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);

              const px = cx + driftA * 0.20 + Math.sin(t * 0.13 + phase) * 0.08;
              const pz = cz + driftB * 0.18 + Math.cos(t * 0.11 + phase * 0.7) * 0.08;
              const py = cy + Math.sin(t * 0.19 + phase * 1.2) * 0.055;

              const ww = w * (0.84 + breathe * 0.34 + strobe * 0.16);
              const hh = h * (0.78 + breathe * 0.42 + strobe * 0.12);
              const aa = ang + Math.sin(t * 0.17 + phase) * 0.18;

              const ca = Math.cos(aa);
              const sa = Math.sin(aa);
              const hx = ca * ww * 0.5;
              const hz = sa * ww * 0.5;

              const y0 = py - hh * 0.5;
              const y1 = py + hh * 0.5;

              const q = [];
              pushQuad(
                q,
                pointLocal(px - hx, y0, pz - hz),
                pointLocal(px + hx, y0, pz + hz),
                pointLocal(px + hx, y1, pz + hz),
                pointLocal(px - hx, y1, pz - hz),
                [0, 1], [1, 1], [1, 0], [0, 0]
              );

              const a = alphaBase * (0.48 + breathe * 0.42) + strobe * 0.42;
              mesh.flatCol = [
                col[0] * a + strobe * 0.38,
                col[1] * a + strobe * 0.34,
                col[2] * a + strobe * 0.28
              ];

              gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
              mesh.count = q.length / 8;
            };

            meshes.push(mesh);
            return mesh;
          }

          const altAnnexFogStart = meshes.length;

          for (let fi = 0; fi < 34; fi++) {
            const seed = 700.0 + fi * 17.0;
            const u = altCrowdHash(seed + 1.0);
            const v = altCrowdHash(seed + 2.0);
            const nearPathBias = Math.pow(altCrowdHash(seed + 3.0), 1.75);

            const fx = alcoveStartX + 0.22 + (alcoveEndX - alcoveStartX - 0.44) * u;
            const fz = (alcoveFrontZ - 0.10) + (alcoveBackZ + 0.46 - (alcoveFrontZ - 0.10)) * nearPathBias;
            const fy = annexY0 + 0.18 + v * (annexY1 - annexY0) * 0.58;

            const fw = 0.72 + altCrowdHash(seed + 4.0) * 1.35;
            const fh = 0.22 + altCrowdHash(seed + 5.0) * 0.58;
            const fa = -0.55 + altCrowdHash(seed + 6.0) * 1.10;
            const fs = 0.42 + altCrowdHash(seed + 7.0) * 0.68;
            const tex = fi % 5 === 0 ? TEX.altFogWhite : (fi % 3 === 0 ? TEX.altFogSmoke : TEX.altFogRed);
            const col = fi % 5 === 0 ? [1.15, 0.92, 0.72] : (fi % 3 === 0 ? [0.82, 0.48, 0.36] : [1.55, 0.11, 0.055]);
            const alpha = fi % 5 === 0 ? 0.72 : (fi % 3 === 0 ? 0.62 : 0.74);

            addAltDynamicFogWisp(fx, fz, fy, fw, fh, fa, seed * 0.01, fs, tex, col, alpha);
          }

          for (let mi = altAnnexFogStart; mi < meshes.length; mi++) {
            meshes[mi].dynamicFogWisp = true;
          }

          function altAnnexFxHash(x) {
            return (Math.sin(x * 127.1 + 31.7) * 43758.5453123) % 1.0;
          }

          function altAnnexFxHash01(x) {
            const v = altAnnexFxHash(x);
            return v < 0.0 ? v + 1.0 : v;
          }

          function makeAltWorldFogTexture(r, g, b, a) {
            const size = 128;
            const cnv = document.createElement("canvas");
            cnv.width = size;
            cnv.height = size;
            const ctx = cnv.getContext("2d");
            const grd = ctx.createRadialGradient(size * 0.50, size * 0.50, size * 0.03, size * 0.50, size * 0.50, size * 0.52);
            grd.addColorStop(0.00, "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")");
            grd.addColorStop(0.26, "rgba(" + r + "," + g + "," + b + "," + (a * 0.72 / 255) + ")");
            grd.addColorStop(0.60, "rgba(" + r + "," + g + "," + b + "," + (a * 0.28 / 255) + ")");
            grd.addColorStop(1.00, "rgba(" + r + "," + g + "," + b + ",0)");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, size, size);

            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tex;
          }

          if (!TEX.altWorldFogRed) TEX.altWorldFogRed = makeAltWorldFogTexture(255, 48, 32, 135);
          if (!TEX.altWorldFogSmoke) TEX.altWorldFogSmoke = makeAltWorldFogTexture(235, 222, 208, 125);
          if (!TEX.altWorldStrobe) TEX.altWorldStrobe = makeAltWorldFogTexture(255, 248, 224, 150);

          function addAltWorldFogWisp(cx, cz, cy, w, h, yaw, phase, speed, tex, col, alphaBase) {
            const q0 = [];
            pushQuad(
              q0,
              pointLocal(cx - w * 0.5, cy - h * 0.5, cz),
              pointLocal(cx + w * 0.5, cy - h * 0.5, cz),
              pointLocal(cx + w * 0.5, cy + h * 0.5, cz),
              pointLocal(cx - w * 0.5, cy + h * 0.5, cz),
              [0, 1], [1, 1], [1, 0], [0, 0]
            );

            const mesh = self._makeMesh(q0, tex, col, 0.0, true);
            mesh.annexAltOnly = true;
            mesh.annexInterior = true;
            mesh.annexAltFog = true;
            mesh.annexAltCrowdVisual = true;
            mesh.dynamicFogWisp = true;
            mesh.altAnnexFogMachine = true;
            mesh.useTexAlpha = true;
            mesh.blend = true;

            mesh.altFogUpdater = function(now) {
              const t = now * 0.001;
              const breathe = 0.5 + 0.5 * Math.sin(t * speed + phase);
              const driftA = Math.sin(t * (speed * 0.38) + phase * 1.73);
              const driftB = Math.cos(t * (speed * 0.27) + phase * 2.19);
              const px = cx + driftA * 0.18 + Math.sin(t * 0.11 + phase) * 0.06;
              const pz = cz + driftB * 0.14 + Math.cos(t * 0.09 + phase * 0.7) * 0.05;
              const py = cy + Math.sin(t * 0.15 + phase * 1.2) * 0.045;

              const ww = w * (0.82 + breathe * 0.36);
              const hh = h * (0.78 + breathe * 0.42);
              const aa = yaw + Math.sin(t * 0.14 + phase) * 0.20;

              const ca = Math.cos(aa);
              const sa = Math.sin(aa);
              const hx = ca * ww * 0.5;
              const hz = sa * ww * 0.5;

              const q = [];
              pushQuad(
                q,
                pointLocal(px - hx, py - hh * 0.5, pz - hz),
                pointLocal(px + hx, py - hh * 0.5, pz + hz),
                pointLocal(px + hx, py + hh * 0.5, pz + hz),
                pointLocal(px - hx, py + hh * 0.5, pz - hz),
                [0, 1], [1, 1], [1, 0], [0, 0]
              );

              const a = alphaBase * (0.52 + breathe * 0.48);
              const st = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
              mesh.flatCol = [
                col[0] * a + st * 0.40,
                col[1] * a + st * 0.34,
                col[2] * a + st * 0.28
              ];

              gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
              mesh.count = q.length / 8;
            };

            meshes.push(mesh);
          }

          function addAltWorldStrobeBeam(x0, x1, y0, y1, z0, z1, phase, strength) {
            const q = [];
            pushQuad(
              q,
              pointLocal(x0, y1, z0),
              pointLocal(x1, y1, z0),
              pointLocal(x1, y0, z1),
              pointLocal(x0, y0, z1),
              [0, 1], [1, 1], [1, 0], [0, 0]
            );

            const mesh = self._makeMesh(q, TEX.altWorldStrobe, [0.0, 0.0, 0.0], 0.0, true);
            mesh.annexAltOnly = true;
            mesh.annexInterior = true;
            mesh.annexAltStrobeBeam = true;
            mesh.annexAltCrowdVisual = true;
            mesh.useTexAlpha = true;
            mesh.blend = true;

            mesh.altFogUpdater = function(now) {
              const st = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
              const flick = st * strength * (0.78 + 0.22 * Math.sin(now * 0.033 + phase));
              mesh.flatCol = [2.25 * flick, 2.05 * flick, 1.62 * flick];
            };

            meshes.push(mesh);
          }

          const altWorldFxStart = meshes.length;

          for (let fi = 0; fi < 42; fi++) {
            const seed = 900.0 + fi * 19.0;
            const u = altAnnexFxHash01(seed + 1.0);
            const v = altAnnexFxHash01(seed + 2.0);
            const d = Math.pow(altAnnexFxHash01(seed + 3.0), 1.35);

            const fx = alcoveStartX + 0.18 + (alcoveEndX - alcoveStartX - 0.36) * u;
            const fz = alcoveFrontZ - 0.22 + (alcoveBackZ + 0.42 - (alcoveFrontZ - 0.22)) * d;
            const fy = annexY0 + 0.48 + v * (annexY1 - annexY0) * 0.48;

            const fw = 0.58 + altAnnexFxHash01(seed + 4.0) * 1.48;
            const fh = 0.20 + altAnnexFxHash01(seed + 5.0) * 0.62;
            const fa = -0.62 + altAnnexFxHash01(seed + 6.0) * 1.24;
            const fs = 0.32 + altAnnexFxHash01(seed + 7.0) * 0.62;

            const tex = fi % 4 === 0 ? TEX.altWorldFogSmoke : TEX.altWorldFogRed;
            const col = fi % 4 === 0 ? [1.05, 0.70, 0.54] : [1.65, 0.12, 0.060];
            const alpha = fi % 4 === 0 ? 0.76 : 0.82;

            addAltWorldFogWisp(fx, fz, fy, fw, fh, fa, seed * 0.01, fs, tex, col, alpha);
          }

          addAltWorldStrobeBeam(
            alcoveStartX + 0.30,
            alcoveEndX - 0.30,
            annexY0 + 0.22,
            annexY1 - 0.34,
            alcoveBackZ + 0.56,
            alcoveFrontZ - 0.55,
            1.4,
            1.00
          );

          addAltWorldStrobeBeam(
            alcoveStartX + 0.55,
            alcoveEndX - 0.55,
            annexY0 + 0.55,
            annexY1 - 0.18,
            alcoveBackZ + 0.36,
            alcoveBackZ + 1.55,
            2.8,
            0.72
          );

          for (let mi = altWorldFxStart; mi < meshes.length; mi++) {
            meshes[mi].worldLockedAlcoveFX = true;
          }

          function addAltBouncingFoldingTable() {
            function tableState(now) {
              const t = now * 0.001;
              const cx0 = alcoveStartX + (alcoveEndX - alcoveStartX) * 0.54;
              const sx = Math.max(0.12, (alcoveEndX - alcoveStartX) * 0.22);
              const zFront = alcoveFrontZ - 0.24;
              const zBack = alcoveBackZ + 0.92;
              const zWave = 0.5 + 0.5 * Math.sin(t * 0.48 + 1.40);
              const hop = Math.pow(Math.abs(Math.sin(t * 2.70 + 0.35)), 0.72);
              return {
                x: cx0 + Math.sin(t * 0.62 + 0.60) * sx + Math.sin(t * 1.90) * 0.10,
                y: annexY0 + 1.34 + hop * 0.66 + Math.sin(t * 1.85) * 0.10,
                z: zBack * zWave + zFront * (1.0 - zWave) + Math.sin(t * 1.28 + 2.40) * 0.12,
                yaw: Math.sin(t * 1.10) * 0.62 + t * 0.18,
                wobble: Math.sin(t * 5.10) * 0.055
              };
            }

            function pLocalBox(st, lx, ly, lz) {
              const ca = Math.cos(st.yaw);
              const sa = Math.sin(st.yaw);
              const yy = ly + Math.sin(lx * 2.2 + lz * 1.7) * st.wobble;
              return pointLocal(
                st.x + lx * ca - lz * sa,
                st.y + yy,
                st.z + lx * sa + lz * ca
              );
            }

            function pushBox(q, st, cx, cy, cz, sx, sy, sz) {
              const hx = sx * 0.5;
              const hy = sy * 0.5;
              const hz = sz * 0.5;

              const p000 = pLocalBox(st, cx - hx, cy - hy, cz - hz);
              const p100 = pLocalBox(st, cx + hx, cy - hy, cz - hz);
              const p110 = pLocalBox(st, cx + hx, cy + hy, cz - hz);
              const p010 = pLocalBox(st, cx - hx, cy + hy, cz - hz);

              const p001 = pLocalBox(st, cx - hx, cy - hy, cz + hz);
              const p101 = pLocalBox(st, cx + hx, cy - hy, cz + hz);
              const p111 = pLocalBox(st, cx + hx, cy + hy, cz + hz);
              const p011 = pLocalBox(st, cx - hx, cy + hy, cz + hz);

              pushQuad(q, p000, p100, p110, p010, [0,1], [1,1], [1,0], [0,0]);
              pushQuad(q, p101, p001, p011, p111, [0,1], [1,1], [1,0], [0,0]);
              pushQuad(q, p010, p110, p111, p011, [0,1], [1,1], [1,0], [0,0]);
              pushQuad(q, p001, p101, p100, p000, [0,1], [1,1], [1,0], [0,0]);
              pushQuad(q, p001, p000, p010, p011, [0,1], [1,1], [1,0], [0,0]);
              pushQuad(q, p100, p101, p111, p110, [0,1], [1,1], [1,0], [0,0]);
            }

            function buildTableTop(now) {
              const st = tableState(now);
              const q = [];
              pushBox(q, st, 0.00, 0.00, 0.00, 1.04, 0.060, 0.52);
              pushBox(q, st, 0.00, -0.055, 0.00, 0.88, 0.024, 0.40);
              return q;
            }

            function buildTableLegs(now) {
              const st = tableState(now);
              const q = [];
              const lx = 0.36;
              const lz = 0.17;

              pushBox(q, st, 0.00, -0.105, -lz, 0.82, 0.032, 0.035);
              pushBox(q, st, 0.00, -0.105,  lz, 0.82, 0.032, 0.035);

              pushBox(q, st, -lx, -0.118, 0.00, 0.035, 0.028, 0.36);
              pushBox(q, st,  lx, -0.118, 0.00, 0.035, 0.028, 0.36);

              pushBox(q, st, -0.22, -0.142, 0.00, 0.46, 0.022, 0.026);
              pushBox(q, st,  0.22, -0.142, 0.00, 0.46, 0.022, 0.026);

              pushBox(q, st, 0.00, -0.158, 0.00, 0.58, 0.018, 0.020);

              return q;
            }

            const topQ = buildTableTop(0);
            const legQ = buildTableLegs(0);

            const topMesh = self._makeMesh(topQ, TEX.black, [0.62, 0.58, 0.48], 0.0, false);
            const legMesh = self._makeMesh(legQ, TEX.black, [0.045, 0.040, 0.035], 0.0, false);

            function markTableMesh(mesh, part) {
              mesh.annexAltOnly = true;
              mesh.annexInterior = true;
              mesh.annexAltCrowdVisual = true;
              mesh.annexAltBouncingTable = true;
              mesh.worldLockedAlcoveFX = true;
              mesh.altFogUpdater = function(now) {
                const q = part === 0 ? buildTableTop(now) : buildTableLegs(now);
                const strobe = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
                if (part === 0) {
                  mesh.flatCol = [
                    0.50 + strobe * 0.42,
                    0.45 + strobe * 0.34,
                    0.36 + strobe * 0.25
                  ];
                } else {
                  mesh.flatCol = [
                    0.040 + strobe * 0.18,
                    0.035 + strobe * 0.13,
                    0.030 + strobe * 0.10
                  ];
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
                mesh.count = q.length / 8;
              };
              meshes.push(mesh);
            }

            markTableMesh(topMesh, 0);
            markTableMesh(legMesh, 1);
          }

          addAltBouncingFoldingTable();

          if (!self._altAnnexCrowdStarted) {
            self._altAnnexCrowdStarted = true;
            const crowdBase = "files/img/rooms/z4/basement/crowd/";
            const crowdFiles = [];
            for (let ci = 1; ci <= 18; ci++) crowdFiles.push(crowdBase + "CROWD" + String(ci).padStart(2, "0") + ".png");

            const placements = [];
            const rows = [
              { z: alcoveFrontZ - 0.42, n: 9,  s: 0.84, f: 0.66 },
              { z: alcoveFrontZ - 0.82, n: 10, s: 0.88, f: 0.74 },
              { z: alcoveFrontZ - 1.26, n: 11, s: 0.94, f: 0.84 },
              { z: alcoveFrontZ - 1.78, n: 12, s: 1.00, f: 0.94 },
              { z: alcoveFrontZ - 2.36, n: 12, s: 1.03, f: 1.00 },
              { z: alcoveFrontZ - 3.02, n: 9,  s: 0.98, f: 0.90 },
              { z: alcoveFrontZ - 3.66, n: 7,  s: 0.92, f: 0.78 }
            ];

            for (let r = 0; r < rows.length; r++) {
              const row = rows[r];
              for (let k = 0; k < row.n; k++) {
                const u = row.n === 1 ? 0.5 : k / (row.n - 1);
                const seed = 100.0 + r * 31.0 + k * 7.0;
                const x0 = alcoveStartX + 0.34;
                const x1 = alcoveEndX - 0.34;
                const cx = x0 + (x1 - x0) * u + (altCrowdHash(seed) - 0.5) * 0.22;
                const cz = row.z + (altCrowdHash(seed + 1.0) - 0.5) * 0.18;
                const sc = row.s * (0.90 + altCrowdHash(seed + 2.0) * 0.22);
                const yaw = (altCrowdHash(seed + 3.0) - 0.5) * 0.26;
                const fileIndex = (r * 5 + k * 3) % crowdFiles.length;
                placements.push({ file: crowdFiles[fileIndex], x: cx, z: cz, s: sc, yaw: yaw, seed: seed, fade: row.f });
              }
            }

            const loaded = {};
            function useLoadedCrowd(path, done) {
              if (loaded[path]) {
                if (loaded[path].img && loaded[path].tex) done(loaded[path].img, loaded[path].tex);
                else loaded[path].wait.push(done);
                return;
              }
              loaded[path] = { img: null, tex: null, wait: [done] };
              const img = new Image();
              img.onload = function () {
                const tex = makeAltCrowdTexture(img);
                loaded[path].img = img;
                loaded[path].tex = tex;
                const waiters = loaded[path].wait.slice();
                loaded[path].wait.length = 0;
                for (let wi = 0; wi < waiters.length; wi++) waiters[wi](img, tex);
              };
              img.onerror = function () {
                console.warn("[Zone4] crowd image failed:", path);
              };
              img.src = path;
            }

            for (let pi = 0; pi < placements.length; pi++) {
              const pl = placements[pi];
              useLoadedCrowd(pl.file, function (img, tex) {
                addAltExtrudedCrowdPerson(img, tex, pl.x, pl.z, pl.s, pl.yaw, pl.seed, pl.fade);
              });
            }

            self.altAnnexCrowdDebug = {
              mode: "alt-annex-world-fog-far-wall-strobe-no-upstairs-bleed",
              count: placements.length,
              sourceCount: crowdFiles.length,
              noFlatWallCrowd: true,
              noSpriteCrowd: true,
              crowdFacesIntoAlcove: true,
              roundedExtrusionEdges: true,
              softRoundedVolume: true,
              fogMachine: true,
              dynamicFogWisps: true,
              visibleFogOverlay: true,
              postFXWhiteStrobe: true,
              strongerPeripheralBlur: true,
              randomWhiteStageStrobe: true,
              peripheralCameraBlur: true,
              tightCameraSpan: true,
              hallucinationsRestored: true,
              farWallStrobeBlockedByWall: true,
              hangingFogVisible: true,
              farWallWorldStrobe: true,
              bouncingFoldingTable: true,
              bouncingFoldingTableFoldedLegs: true,
              bouncingFoldingTableSmaller: true,
              bouncingFoldingTableMoreVertical: true,
              crowdHiddenFromStairs: true,
              noScreenSpaceFog: true,
              worldLockedAlcoveFog: true,
              altWallsUseBasementWallInsteadOfAltWall: true,
              noOpaqueCrowdShell: true,
              altAnnex180SlideTurn: true,
              backWallBlackQuadRemoved: true,
              blackFarWallRectangleRemoved: true,
              stairFrameSealed: true,
              insideAlcoveSideWallAdded: true,
              backWallTextureMapped: true,
              backWallBathroomClubMapped: true,
              noBackWallTurnaroundFinal: true,
              noFarWallTurnaround: true,
              alcoveCrowdZ0: rows[0].z,
              alcoveCrowdZ1: rows[rows.length - 1].z
            };
          }

          addAltWallX(alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.015, 0.008, 0.009]);

          // Z4_ALT_ANNEX_INSIDE_ALCOVE_SIDE_WALL_PATCH
          // Missing inside wall of the alcove: side wall at alcoveStartX, not a front wall across alcoveFrontZ.
          addAltWallX(alcoveStartX, alcoveBackZ, alcoveFrontZ, [0.015, 0.008, 0.009]);

          addAltBox(alcoveStartX + 0.36, alcoveEndX - 0.36, annexY1 - 0.085, annexY1 - 0.018, alcoveBackZ + 0.28, alcoveFrontZ - 0.42, [0.070, 0.000, 0.010], TEX.black, 0.0);
          addAltBox(alcoveStartX + 0.36, alcoveEndX - 0.36, annexY0 + 0.018, annexY0 + 0.052, alcoveBackZ + 0.28, alcoveFrontZ - 0.42, [0.034, 0.000, 0.006], TEX.black, 0.0);

          self.altAnnexExitLightWorld = null;
self.altAnnexStairDoorBulbWorld = pointLocal(altX0 + 0.125, bulbY, 0.0);
          self.altAnnexRoomDebug = {
            layout: "alt-annex-world-locked-fog-strobe-hidden-from-stairs",
            alcoveStartX: alcoveStartX,
            alcoveEndX: alcoveEndX,
            occluderX0: occluderX0,
            occluderX1: occluderX1,
            pathLeftZ: pathLeftZ,
            pathRightZ: pathRightZ,
            alcoveFrontZ: alcoveFrontZ,
            alcoveBackZ: alcoveBackZ,
            alcoveFrontFlushWithPath: true,
            noMouthFrame: true,
            redStageGlowFromBack: true,
            extrudedCrowd: true,
            redStageGlowMedium: true,
            altRoomUsesAltWallOnly: true,
            occluderZeroThickness: true
          };
        }

        markMeshes(altAnnexSpriteRoomStart, "annexAltOnly");

markMeshes(interiorStart, "annexInterior");

      })();
    }

    _smooth01(t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    }

    _isAltAnnexNffActive() {
      return !!(
        (
          this.annexAltBasementActive ||
          this.annexBasementVariant === "alt" ||
          this.altAnnexRouteActive ||
          this._altAnnexCleanView ||
          (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
        ) &&
        (
          this.phase === "annex_turn_in" ||
          this.phase === "annex_hallway" ||
          this.phase === "annex_turn_in" ||          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
    }

    _altAnnexNffFocus() {
      if (this.phase === "annex_turn_in") return 0.06 + this._smooth01(this.annexTurnT || 0) * 0.12;
      if (this.phase === "annex_hallway") {
        const t = Math.max(0, Math.min(1, this.annexHallT || 0));
        const top = this._smooth01(Math.min(1, t / 0.38));
        const stairs = this._smooth01(Math.max(0, (t - 0.28) / 0.72));
        return 0.12 + top * 0.16 + stairs * 0.46;
      }
      if (this.phase === "annex_room") return 0.64 + this._smooth01(this.annexRoomT || 0) * 0.30;
      if (this.phase === "annex_exit_door") return 0.84;
      return 0.0;
    }

    _ensureAltAnnexNffAudio() {
      if (this.altAnnexNffAudio) return true;
      const a = new Audio("files/aud/nff.mp3");
      a.loop = true;
      a.preload = "auto";
      a.volume = 0.0;
      a.setAttribute("playsinline", "");
      a.setAttribute("webkit-playsinline", "");
      this.altAnnexNffAudio = a;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = window.__z4NffAudioContext || (window.__z4NffAudioContext = new AC());
          const src = ctx.createMediaElementSource(a);
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          filter.type = "lowpass";
          filter.frequency.value = 520;
          filter.Q.value = 0.82;
          gain.gain.value = 0.0;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.altAnnexNffCtx = ctx;
          this.altAnnexNffSource = src;
          this.altAnnexNffFilter = filter;
          this.altAnnexNffGain = gain;
          a.volume = 1.0;
        }
      } catch (e) {
        this.altAnnexNffCtx = null;
        this.altAnnexNffSource = null;
        this.altAnnexNffFilter = null;
        this.altAnnexNffGain = null;
      }
      return true;
    }

    _duckAltAnnexMainAudio(active) {
      const main = document.getElementById("audioPlayer") || window.audioPlayer || null;
      if (!main || main === this.altAnnexNffAudio) return;

      if (active) {
        if (!this.altAnnexMainAudioDucked) {
          this.altAnnexMainAudioDucked = true;
          this.altAnnexMainAudioPrevVolume = typeof main.volume === "number" ? main.volume : 1.0;
          this.altAnnexMainAudioPrevMuted = !!main.muted;
        }
        try {
          main.volume += (0.0 - main.volume) * 0.18;
          if (main.volume < 0.015) main.volume = 0.0;
        } catch (e) {}
      } else if (this.altAnnexMainAudioDucked) {
        const target = typeof this.altAnnexMainAudioPrevVolume === "number" ? this.altAnnexMainAudioPrevVolume : 1.0;
        try {
          main.muted = !!this.altAnnexMainAudioPrevMuted;
          main.volume += (target - main.volume) * 0.12;
          if (Math.abs(main.volume - target) < 0.02) {
            main.volume = target;
            this.altAnnexMainAudioDucked = false;
          }
        } catch (e) {
          this.altAnnexMainAudioDucked = false;
        }
      }
    }

    _updateAltAnnexNffAudio(now) {
      const active = this._isAltAnnexNffActive();
      if (!active) {
        this._duckAltAnnexMainAudio(false);
        if (this.altAnnexNffAudio) {
          if (this.altAnnexNffGain && this.altAnnexNffCtx) {
            try {
              const t = this.altAnnexNffCtx.currentTime;
              this.altAnnexNffGain.gain.setTargetAtTime(0.0, t, 0.35);
            } catch (e) {}
          } else {
            this.altAnnexNffAudio.volume += (0.0 - this.altAnnexNffAudio.volume) * 0.08;
            if (this.altAnnexNffAudio.volume < 0.004) {
              try { this.altAnnexNffAudio.pause(); } catch (e) {}
              this.altAnnexNffPlaying = false;
            }
          }
        }
        return;
      }
      this._ensureAltAnnexNffAudio();
      this._duckAltAnnexMainAudio(true);
      const a = this.altAnnexNffAudio;
      if (!a) return;
      const focus = this._altAnnexNffFocus();
      const distant = 1.0 - focus;
      const targetGain = 0.045 + focus * 0.42;
      const targetFreq = 430 + focus * 3100;
      const targetQ = 0.70 + distant * 0.45;
      this.altAnnexNffTargetGain = targetGain;
      if (this.altAnnexNffCtx && this.altAnnexNffGain && this.altAnnexNffFilter) {
        try {
          if (this.altAnnexNffCtx.state === "suspended") this.altAnnexNffCtx.resume();
          const t = this.altAnnexNffCtx.currentTime;
          this.altAnnexNffGain.gain.setTargetAtTime(targetGain, t, 0.18);
          this.altAnnexNffFilter.frequency.setTargetAtTime(targetFreq, t, 0.22);
          this.altAnnexNffFilter.Q.setTargetAtTime(targetQ, t, 0.28);
          a.volume = 1.0;
        } catch (e) {}
      } else {
        a.volume += (targetGain - a.volume) * 0.08;
      }
      try {
        if (a.paused || !this.altAnnexNffPlaying) {
          const pr = a.play();
          if (pr && pr.catch) pr.catch(function () {});
          this.altAnnexNffPlaying = true;
        }
      } catch (e) {}
    }

    _forceAnnexSequenceAudio() {
      const path = "files/aud/053.mp3";
      try {
        window.audioTracks = window.audioTracks || [];
        if (window.audioTracks.indexOf(path) < 0) window.audioTracks.push(path);
      } catch (e) {}

      try {
        const a =
          document.getElementById("audioPlayer") ||
          window.audioPlayer ||
          document.querySelector("audio");

        if (!a) return;

        const current = a.currentSrc || a.src || "";
        if (current.indexOf(path) < 0) {
          a.pause();
          a.src = path;
          a.currentTime = 0;
          a.loop = true;
          if (a.load) a.load();
        } else {
          a.currentTime = 0;
        }

        a.volume = 1.0;
        const p = a.play();
        p && p.catch && p.catch(function () {});
      } catch (e) {}
    }

    _triggerAnnexDjSequence(now) {
      if (this.annexSequenceActive) return;

      this.annexSequenceActive = true;
      this.annexSequenceStart = now;
      this.annexDjBlinkCount = 2;
      this.annexStrobe = 1;

      this.z4Trip = Math.max(this.z4Trip || 1.0, 1.55);
      this.z4IsOOB = 1.0;
      this.z4ModeSeed = Math.random() * 1000.0;
      this.z4FractalSeed = this.z4ModeSeed;
      this.z4BlinkPeakTime = now;

      this._forceAnnexSequenceAudio();
      try {
        if (this.crywolfVideo) {
          this.crywolfVideo.currentTime = 0;
          const vp = this.crywolfVideo.play();
          vp && vp.catch && vp.catch(function () {});
        }
        if (this.bh2Video) {
          this.bh2Video.currentTime = 0;
          const bp = this.bh2Video.play();
          bp && bp.catch && bp.catch(function () {});
        }
      } catch (e) {}
    }

    _hardShiftAudioForZone2Return() {
      try {
        if (this.altAnnexNffGain && this.altAnnexNffCtx) {
          this.altAnnexNffGain.gain.setValueAtTime(0.0, this.altAnnexNffCtx.currentTime);
        }
        if (this.altAnnexNffAudio) {
          this.altAnnexNffAudio.pause();
          this.altAnnexNffAudio.currentTime = 0;
          this.altAnnexNffPlaying = false;
        }
      } catch (e) {}

      try {
        const main = document.getElementById("audioPlayer") || window.audioPlayer || document.querySelector("audio");
        if (!main || main === this.altAnnexNffAudio) return;

        const tracks = Array.isArray(window.audioTracks) ? window.audioTracks : [];
        let pick = "files/aud/011.mp3";

        for (let i = 0; i < tracks.length; i++) {
          const t = tracks[(i + 3) % tracks.length];
          if (typeof t === "string" && t.indexOf("nff.mp3") < 0 && t.indexOf("053.mp3") < 0) {
            pick = t;
            break;
          }
        }

        main.pause();
        main.muted = false;
        main.volume = typeof this.altAnnexMainAudioPrevVolume === "number"
          ? Math.max(0.65, this.altAnnexMainAudioPrevVolume)
          : 1.0;
        main.src = pick;
        main.currentTime = 0;
        if (main.load) main.load();

        const pr = main.play();
        pr && pr.catch && pr.catch(function () {});
        this.altAnnexMainAudioDucked = false;
      } catch (e) {}
    }

    _beginZ3BBlackHoleFromAltAnnex(now) {
    }

    _beginZ4BCabin(now) {
      const fromAnnexSequence = !!this.annexSequenceActive;

      this.phase = "z4b_cabin";
      this.phaseStart = now;
      this.z4bCabinState = fromAnnexSequence ? "side_entry" : "entry";
      this.z4bCabinStart = now;
      this.z4bCabinCrashStart = 0;

      this.z4bCabinCamZ = 12.0;
      this.z4bCabinCamX = fromAnnexSequence ? -1.42 : 0.0;
      this.z4bCabinYaw = fromAnnexSequence ? -Math.PI * 0.5 : 0.0;
      this.z4bCabinZoom = 1.0;
      this.z4bCabinShake = 0;
      this.z4bCabinFlash = 0;
      this.z4bCabinWalking = true;
      this.z4bCabinFractalActive = fromAnnexSequence;
      this.z4bStopAtCockpit = fromAnnexSequence || !!this.z4bStopAtCockpit;

      this.cx = 0;
      this.cy = 0;
      if (typeof window.mx === "number") window.mx = 0;
      if (typeof window.my === "number") window.my = 0;
    }

    _installZ4BIslandLogoTextureHook() {
      window.__z4bInstallIslandLogoTextureHook = function () {
        return true;
      };
      return true;
    }

    _startZ4BIslandWake(now) {
      if (this.z4bIslandStarted) return;
      this.z4bIslandStarted = true;

      function cleanupWakeBits() {
        const old = document.getElementById("z4b-island-wake-overlay");
        if (old && old.parentNode) old.parentNode.removeChild(old);

        const canvases = Array.prototype.slice.call(document.querySelectorAll("canvas"));
        const c = document.getElementById("c");
        if (c && canvases.indexOf(c) < 0) canvases.unshift(c);

        canvases.forEach(function (el) {
          if (el.dataset && el.dataset.z4bWakeTransforming) delete el.dataset.z4bWakeTransforming;
          el.style.transition = "";
          el.style.transformOrigin = "";
          el.style.transform = "";
          el.style.filter = "";
          el.style.willChange = "";
        });
      }

      function restoreIslandShaderIfNeeded() {
        try {
          if (
            window.GLSL &&
            window.GLSL.modules &&
            window.__z4bIslandOriginalShader &&
            typeof window.__z4bIslandOriginalShader === "string"
          ) {
            window.GLSL.modules.z4b_island = window.__z4bIslandOriginalShader;
            window.GLSL.modules.island = window.GLSL.modules.z4b_island;
            window.GLSL.modules.island = window.GLSL.modules.z4b_island;
          }

          if (typeof PROGRAM_CACHE !== "undefined") {
            if (PROGRAM_CACHE.z4b_island) {
              try { gl.deleteProgram(PROGRAM_CACHE.z4b_island); } catch (e) {}
              delete PROGRAM_CACHE.z4b_island;
            }
            if (PROGRAM_CACHE.island) {
              try { gl.deleteProgram(PROGRAM_CACHE.island); } catch (e) {}
              delete PROGRAM_CACHE.island;
            }
          }
        } catch (e) {}
      }

      function makeBlackOverlay() {
        let ov = document.getElementById("z4b-island-wake-overlay");
        if (!ov) {
          ov = document.createElement("div");
          ov.id = "z4b-island-wake-overlay";
          document.body.appendChild(ov);
        }

        ov.style.cssText =
          "position:fixed;inset:0;background:#000;opacity:1;" +
          "z-index:2147483647;pointer-events:none;transition:none;";

        return ov;
      }

      cleanupWakeBits();
      this._installZ4BIslandLogoTextureHook();
      makeBlackOverlay();

      window.__z4bIslandActive = true;
      window.__z4bIslandWakeStart = 0;
      window.__z4bIslandWakeDuration = 0;
      window.__z4bIslandLookX = 0.0;
      window.__z4bIslandLookY = 0.0;

      try {
        this._setFog && this._setFog(0, 0);
      } catch (e) {}

      this.destroy();

      setTimeout(function () {
        cleanupWakeBits();
        if (window.__z4bInstallIslandLogoTextureHook) window.__z4bInstallIslandLogoTextureHook();

        const ov = makeBlackOverlay();

        if (typeof window.startZ4BIsland === "function") {
          window.startZ4BIsland();
          if (window.__z4bInstallIslandLogoTextureHook) window.__z4bInstallIslandLogoTextureHook();
        } else {
          console.error("[Zone4] startZ4BIsland is missing");
          return;
        }

        const fadeStart = performance.now();
        const hold = 650;
        const fadeDur = 2600;

        function ease(t) {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        }

        function frame() {
          const age = performance.now() - fadeStart;
          const fadeT = ease((age - hold) / fadeDur);

          ov.style.opacity = String(1.0 - fadeT);

          if (fadeT < 1.0) {
            requestAnimationFrame(frame);
          } else if (ov && ov.parentNode) {
            ov.parentNode.removeChild(ov);
          }
        }

        requestAnimationFrame(frame);
      }, 120);
    }

    _resetAltAnnexLapPattern() {
      this.totalClockwiseTravel = 0;
      this.totalCounterClockwiseTravel = 0;
      this.totalClockwiseLapCount = 0;
      this.totalCounterClockwiseLapCount = 0;

      this.altAnnexPatternStage = 0;
      this.altAnnexCwTravel = 0;
      this.altAnnexCcwTravel = 0;
      this.altAnnexCwLapCount = 0;
      this.altAnnexCcwLapCount = 0;
      this.altAnnexClockwiseReady = false;
      this.altAnnexCounterClockwiseReady = false;
      this.altAnnexDoorOpen = false;
      this.altAnnexRouteActive = false;
      this.annexAltBasementActive = false;
      this.annexBasementVariant = "normal";
      this._publishAltAnnexState();
    }

    _publishAltAnnexState() {
      window.__z4AltAnnex = {
        stage: this.altAnnexPatternStage || 0,
        cw: this.altAnnexCwLapCount || 0,
        ccw: this.altAnnexCcwLapCount || 0,
        cwReady: !!this.altAnnexClockwiseReady,
        ccwReady: !!this.altAnnexCounterClockwiseReady,
        doorOpen: !!this.altAnnexDoorOpen,
        routeActive: !!this.altAnnexRouteActive,
        basementVariant: this.annexBasementVariant || "normal",
        cwProgress: Math.max(0, Math.min(1, (this.altAnnexCwTravel || 0) / (Math.PI * 2))),
        ccwProgress: Math.max(0, Math.min(1, (this.altAnnexCcwTravel || 0) / (Math.PI * 2))),
        totalCW: this.totalClockwiseLapCount || 0,
        totalCCW: this.totalCounterClockwiseLapCount || 0,
        netCW: this.clockwiseLapCount || 0,
        netCCW: this.counterClockwiseLapCount || 0
      };
    }

    _updateAltAnnexLapPattern(deltaU, now) {
      const TAU = Math.PI * 2;
      if (!isFinite(deltaU) || Math.abs(deltaU) < 0.000001) {
        this._publishAltAnnexState();
        return;
      }

      if (deltaU > 0) this.totalClockwiseTravel += deltaU;
      else this.totalCounterClockwiseTravel += -deltaU;

      this.totalClockwiseLapCount = Math.floor(this.totalClockwiseTravel / TAU);
      this.totalCounterClockwiseLapCount = Math.floor(this.totalCounterClockwiseTravel / TAU);

      if (this.altAnnexPatternStage >= 2) {
        this.altAnnexCwLapCount = 1;
        this.altAnnexCcwLapCount = 1;
        this.altAnnexClockwiseReady = true;
        this.altAnnexCounterClockwiseReady = true;
        this.altAnnexDoorOpen = true;
        this._publishAltAnnexState();
        return;
      }

      if (this.altAnnexPatternStage === 0) {
        if (deltaU > 0) {
          this.altAnnexCwTravel += deltaU;
          this.altAnnexCwLapCount = Math.floor(this.altAnnexCwTravel / TAU);

          if (this.altAnnexCwLapCount >= 1) {
            this.altAnnexCwLapCount = 1;
            this.altAnnexClockwiseReady = true;
            this.altAnnexPatternStage = 1;
            this.altAnnexCcwTravel = 0;
            this.altAnnexCcwLapCount = 0;

            if (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) {
              console.log("[Zone4] ALT annex: clockwise lap complete. Reverse and complete one counterclockwise lap.");
              this.altAnnexLastLog = now;
            }
          }
        } else if (!this.altAnnexClockwiseReady) {
          this.altAnnexCwTravel = 0;
          this.altAnnexCwLapCount = 0;
        }
      } else if (this.altAnnexPatternStage === 1) {
        this.altAnnexCwLapCount = 1;
        this.altAnnexClockwiseReady = true;

        if (deltaU < 0) {
          this.altAnnexCcwTravel += -deltaU;
          this.altAnnexCcwLapCount = Math.floor(this.altAnnexCcwTravel / TAU);

          if (this.altAnnexCcwLapCount >= 1) {
            this.altAnnexCcwLapCount = 1;
            this.altAnnexCounterClockwiseReady = true;
            this.altAnnexPatternStage = 2;
            this.altAnnexDoorOpen = true;

            if (!this.altAnnexLastLog || now - this.altAnnexLastLog > 700) {
              console.log("[Zone4] ALT annex: one clockwise + one counterclockwise complete. Annex doorway is now open.");
              this.altAnnexLastLog = now;
            }
          }
        }
      }

      this.altAnnexDoorOpen = !!(this.altAnnexClockwiseReady && this.altAnnexCounterClockwiseReady);
      this._publishAltAnnexState();
    }

    _updateBlink(now) {
      const facingDjBooth =
        this.phase === "annex_room" &&
        (this.annexRoomView || "path") === "stage" &&
        !this.turnAnimating &&
        !this.annexSequenceActive;

      if (!facingDjBooth && !this.annexSequenceActive) {
        this.annexDjBlinkCount = 0;
      }

      if (now - this.lastBlinkTime > this.nextBlinkInterval) {
        this.blinking = true;
        this.blinkStart = now;
        this.lastBlinkTime = now;
        this.nextBlinkInterval = 4000 + Math.random() * 7000;
        this.z4ModeSeed = Math.random() * 1000.0;
        this.z4FractalSeed = this.z4ModeSeed;
        this.z4BlinkPeakTime = now;

        if (facingDjBooth) {
          this.annexDjBlinkCount = (this.annexDjBlinkCount || 0) + 1;
          if (this.annexDjBlinkCount >= 2) this._triggerAnnexDjSequence(now);
        }
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
        this.progress = 1;
        this.neuralIntensity = 2.0;
        var elapsed = now - this.phaseStart;
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
        if (moving) {
          this.walkoff = Math.min(1, this.walkoff + dt * 0.30);
        }
        if (this.walkoff >= 1) {
          this.phase = "hallway";
          this.phaseStart = now;
        }
        this.neuralIntensity = 1.4 + this.walkoff * 1.2;

      } else if (this.phase === "hallway") {
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
        this.enterRingT = Math.min(1, this.enterRingT + dt * 0.9);
        if (this.enterRingT >= 1) {
          this.phase = "ring";
          this.phaseStart = now;
          this.ringView = "window";
          this.ringWindowSide = 1;
          this.turnInputLatch = 0;
        }
        this.neuralIntensity = 2.3;

      } else if (this.phase === "ring") {
        if (this.turnAnimating) {
          var turnElapsed = now - this.turnStart;
          if (turnElapsed >= this.turnDuration) {
            if (typeof this.turnDirectionTo === "number") this.ringDirection = this.turnDirectionTo;
            else this.ringDirection = this.turnTo;
            if (this.turnViewTo) this.ringView = this.turnViewTo;
            if (typeof this.turnWindowSideTo === "number") this.ringWindowSide = this.turnWindowSideTo;
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
            this.cx = 0;
            this.cy = 0;
            if (typeof window.mx === "number") window.mx = 0;
            if (typeof window.my === "number") window.my = 0;
          }
        }

        if (window.__z4TurnRequested && !this.turnAnimating) {
          const turnReq = typeof window.__z4TurnRequested === "number"
            ? window.__z4TurnRequested
            : 1;
          window.__z4TurnRequested = false;
          if (this.ringView === "window") {
            const windowSide = this.ringWindowSide || 1;
            this._startStationViewTurn(
              now,
              -turnReq * Math.PI * 0.5,
              "path",
              windowSide * turnReq,
              windowSide
            );
          } else {
            const windowSide = this._stationWindowSideAtRingU();
            const requestedWindowSide = -(this.ringDirection || 1) * turnReq;
            if (windowSide && windowSide === requestedWindowSide) {
              this._startStationViewTurn(
                now,
                -turnReq * Math.PI * 0.5,
                "window",
                this.ringDirection,
                windowSide
              );
            } else {
              this.turnTo = this.ringDirection > 0 ? -1 : 1;
              this.turnSpin = -turnReq;
              this._startStationViewTurn(
                now,
                this.turnSpin * Math.PI,
                "path",
                this.turnTo,
                this.ringWindowSide
              );
            }
          }
        }
        window.__z4TurnRequested = false;

        if (moving && !this.turnAnimating && this.ringView === "path") {
          this.ringU = (this.ringU + dt * 0.26 * this.ringDirection) % (Math.PI * 2);
        }
        if (this.ringU < 0) this.ringU += Math.PI * 2;

        var prevU = this.lastRingU;
        var currU = this.ringU;
        var deltaU = currU - prevU;
        if (deltaU > Math.PI) deltaU -= Math.PI * 2;
        if (deltaU < -Math.PI) deltaU += Math.PI * 2;
        this.ringTravel += Math.abs(deltaU);
        this.signedRingTravel += deltaU;
        this.lapCrossings = Math.floor(Math.abs(this.signedRingTravel) / Math.PI);
        this.lastRingU = currU;
        this.clockwiseLapCount = Math.floor(Math.max(0, this.signedRingTravel) / (Math.PI * 2));
        this.counterClockwiseLapCount = Math.floor(Math.max(0, -this.signedRingTravel) / (Math.PI * 2));
        this.lapCount = Math.max(this.clockwiseLapCount, this.counterClockwiseLapCount);

        this._updateAltAnnexLapPattern(deltaU, now);

        var normalAnnexDoorOpen = this.counterClockwiseLapCount >= 3;
        this.annexDoorOpen = normalAnnexDoorOpen || this.altAnnexDoorOpen;

        if (this.lapCount >= 99) {
          this.blackholeIntensity = 1;
          this.blackholeVisible = true;
        }

        var SECTION_ANGLE_LAP = (Math.PI * 2) / 16;
        if (this.annexDoorOpen && moving && this.ringView === "path") {
          var annexU = (this.annexSection + 0.5) * SECTION_ANGLE_LAP;
          var annexDist = Math.abs(this.ringU - annexU);
          if (annexDist > Math.PI) annexDist = Math.PI * 2 - annexDist;
          if (annexDist <= SECTION_ANGLE_LAP * 0.5) {
            this.annexEntryU = annexU;
            this.annexTargetU = annexU;
            this.ringU = annexU;
            this.lastRingU = annexU;
            this.phase = "annex_turn_in";
            this.phaseStart = now;
            this.annexTurnT = 0;
            this.annexHallT = 0;
            this.annexRoomT = 0;
            this.annexExitT = 0;
            this.annexRoomDir = 1;
            this.annexRoomView = "path";
            this.annexTurnInputLatch = 0;
            this.altAnnexRouteActive = !!(
              this.altAnnexDoorOpen ||
              this.altAnnexCounterClockwiseReady ||
              this.annexBasementVariant === "alt"
            );
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this.annexAltPortalOpen = this.annexAltBasementActive;
            this.altAnnexRouteActive = !!(
              this.altAnnexDoorOpen ||
              this.altAnnexCounterClockwiseReady ||
              this.annexBasementVariant === "alt"
            );
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this.annexAltPortalOpen = this.annexAltBasementActive;
            this.altAnnexRouteActive = !!(
              this.altAnnexDoorOpen ||
              this.altAnnexCounterClockwiseReady ||
              this.annexBasementVariant === "alt"
            );
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this.annexAltPortalOpen = this.annexAltBasementActive;
            this.altAnnexRouteActive = !!(
              this.altAnnexDoorOpen ||
              this.altAnnexCounterClockwiseReady ||
              this.annexBasementVariant === "alt"
            );
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this.annexAltPortalOpen = this.annexAltBasementActive;

            this.altAnnexRouteActive = !!this.altAnnexDoorOpen;
            this.annexAltBasementActive = !!this.altAnnexRouteActive;
            this.annexBasementVariant = this.annexAltBasementActive ? "alt" : "normal";
            this._publishAltAnnexState();
            console.log("[Zone4] annex entry variant:", this.annexBasementVariant);

            this.ringView = "path";
            this.turnAnimating = false;
            this.turnInputLatch = 0;
          }
        } else if (this.clockwiseLapCount >= 3) {
          var entranceU = (this.stationSection + 0.5) * SECTION_ANGLE_LAP;
          var angDist = Math.abs(this.ringU - entranceU);
          if (angDist > Math.PI) angDist = Math.PI * 2 - angDist;
          if (angDist <= SECTION_ANGLE_LAP * 0.5) {
            this.ringU = entranceU;
            this.lastRingU = entranceU;
            this.phase = "reverse_entering_ring";
            this.phaseStart = now;
            this.enterRingT = 1;
          }
        }

        
        this.neuralIntensity = 2.2 + this.lapCount * 0.65;

      } else if (this.phase === "annex_turn_in") {
        if (moving) this.annexTurnT = Math.min(1, this.annexTurnT + dt * 0.95);
        if (this.annexTurnT >= 1) {
          this.phase = "annex_hallway";
          this.phaseStart = now;
          this.annexHallT = 0;
        }
        this.neuralIntensity = 3.0;

      } else if (this.phase === "annex_hallway") {
        if (moving) this.annexHallT = Math.min(1, this.annexHallT + dt * 0.17);
        if (this.annexHallT >= 1) {
          this.phase = "annex_room";
          this.phaseStart = now;
          this.annexRoomT = 0;
          this.annexRoomDir = 1;
          this.annexRoomView = "path";
          this.annexTurnInputLatch = 0;
        }
        this.neuralIntensity = 3.1;

      } else if (this.phase === "annex_room") {
        const altAnnexLocked = typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked();
        const altAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();

        if (altAnnexLocked) {
          this.annexRoomView = "path";
          this.annexRoomDir = 1;
          this.annexTurnInputLatch = 0;
          this.turnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;

          if (this.turnAnimating) {
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
          }
        }

        const turnReq = altAnnexLocked ? 0 : (window.__z4AnnexTurnRequested || 0);
        const centerZone = this.annexRoomT >= 0.34 && this.annexRoomT <= 0.72;
        const farZone = this.annexRoomT >= 0.965;
        const entranceZone = this.annexRoomT <= 0.025;

        if (this.turnAnimating) {
          var annexTurnElapsed = now - this.turnStart;
          if (annexTurnElapsed >= this.turnDuration) {
            if (this.turnViewTo === "annex_stage") this.annexRoomView = "stage";
            else if (this.turnViewTo === "annex_path") this.annexRoomView = "path";
            if (typeof this.turnDirectionTo === "number") this.annexRoomDir = this.turnDirectionTo;
            this.turnAnimating = false;
            this.turnViewTo = null;
            this.turnDirectionTo = null;
            this.turnWindowSideTo = null;
            this.cx = 0;
            this.cy = 0;
            this.annexTurnInputLatch = 0;
            window.__z4AnnexTurnRequested = 0;
            if (typeof window.mx === "number") window.mx = 0;
            if (typeof window.my === "number") window.my = 0;
          }
        }

        if (!this.turnAnimating && entranceZone && (this.annexRoomDir || 1) < 0) {
          this.annexRoomT = 0;
          this.annexRoomView = "path";
          this.annexTurnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;

          this._startStationViewTurn(now, Math.PI, "annex_path", 1, null);
        }

        if (turnReq && !this.turnAnimating) {
          window.__z4AnnexTurnRequested = 0;

          const dirNow = this.annexRoomDir || 1;
          const stageReq = dirNow >= 0 ? -1 : 1;
          const pathReq = dirNow >= 0 ? 1 : -1;
          const toStageAngle = dirNow >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          const toPathAngle = dirNow >= 0 ? -Math.PI * 0.5 : Math.PI * 0.5;

          if ((this.annexRoomView || "path") === "stage") {
            if (centerZone && turnReq === pathReq) {
              this._startStationViewTurn(now, toPathAngle, "annex_path", dirNow, null);
            }
          } else if (!altAnnexRouteNow && farZone && !this.annexSequenceActive) {
            this.annexRoomT = 1;
            this._startStationViewTurn(now, turnReq * Math.PI, "annex_path", -1, null);
          } else if (centerZone && turnReq === stageReq) {
            this._startStationViewTurn(now, toStageAngle, "annex_stage", dirNow, null);
          }

          this.annexTurnInputLatch = 0;
        } else if (!turnReq && Math.abs(this.cx) < 0.48) {
          this.annexTurnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
        }
        // Z4_ALT_ANNEX_NO_FORCED_FAR_WALL_AUTOTURN_PATCH
        // Removed forced turn at annexRoomT >= 0.955. Camera may reach annexRoomT = 1.

        if (
          this.annexSequenceActive &&
          !altAnnexRouteNow &&
          moving &&
          !this.turnAnimating &&
          (this.annexRoomView || "path") === "path" &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.955
        ) {
          this.annexRoomT = 1;
          this.annexExitT = 0;
          this.phase = "annex_exit_door";
          this.phaseStart = now;
          this.neuralIntensity = 3.9;
          return;
        }

        if (moving && !this.turnAnimating && (this.annexRoomView || "path") === "path") {
          const dir = this.annexRoomDir || 1;
          const roomSpeed = altAnnexRouteNow ? 0.16 : 0.13;
          this.annexRoomT = Math.max(0, Math.min(1, this.annexRoomT + dt * roomSpeed * dir));
        }

        

        // Z4_ALT_ANNEX_EAT_BACK_WALL_TURN_REQUESTS_FINAL
        // At the back wall, do not turn around; clamp at the wall and clear queued turn requests.
        if (
          altAnnexRouteNow &&
          !this.turnAnimating &&
          (this.annexRoomView || "path") === "path" &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.995
        ) {
          this.annexRoomT = 1;
          this.annexTurnInputLatch = 0;
          this.turnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
        }
// Z4_ALT_ANNEX_EAT_FAR_WALL_TURN_REQUESTS_PATCH
        // At the back wall, do not turn around. Clear any queued drag/arrow turn instead.
        if (
          altAnnexRouteNow &&
          !this.turnAnimating &&
          (this.annexRoomView || "path") === "path" &&
          (this.annexRoomDir || 1) > 0 &&
          this.annexRoomT >= 0.995
        ) {
          this.annexRoomT = 1;
          this.annexTurnInputLatch = 0;
          window.__z4AnnexTurnRequested = 0;
        }

        if (this.annexRoomT >= 1) this.annexRoomT = 1;
        if (this.annexRoomT <= 0) this.annexRoomT = 0;
        this.neuralIntensity = altAnnexLocked ? 3.55 : (this.annexSequenceActive ? 3.8 : 3.25);

      } else if (this.phase === "annex_exit_door") {
        if (moving) this.annexExitT = Math.min(1, (this.annexExitT || 0) + dt * 0.42);
        if (this.annexExitT >= 1) {
          this.annexExitT = 1;
          this._beginZ4BCabin(now);
return;
        }
        this.neuralIntensity = 3.95;

      } else if (this.phase === "z4b_cabin") {
        this.neuralIntensity = 3.45;
        this.z4bCabinWalking = false;
        this.z4bCabinFlash = 0;

        function smoothZ4B(t) {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        }

        if (this.z4bCabinState === "side_entry") {
          var sideAge = now - this.z4bCabinStart;
          var sideRaw = Math.max(0, Math.min(1, sideAge / 2550));
          var sideMoveT = smoothZ4B((sideRaw - 0.02) / 0.62);
          var sideTurnT = smoothZ4B((sideRaw - 0.18) / 0.72);
          var sideSettleT = smoothZ4B((sideRaw - 0.70) / 0.30);

          this.z4bCabinCamX = -1.42 * (1.0 - sideMoveT);
          this.z4bCabinCamZ = 12.0 + 0.22 * sideSettleT;
          this.z4bCabinYaw = -Math.PI * 0.5 * (1.0 - sideTurnT);
          this.z4bCabinZoom = 0.985 + 0.015 * sideTurnT;
          this.z4bCabinShake = 0.0;
          this.z4bCabinFlash = 0.0;
          this.z4bCabinWalking = sideRaw < 0.84;
          this.neuralIntensity = 3.75 - 0.14 * sideTurnT;

          if (sideRaw >= 1) {
            this.z4bCabinState = "side_settle";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0.0;
            this.z4bCabinCamZ = 12.22;
            this.z4bCabinYaw = 0.0;
            this.z4bCabinZoom = 1.0;
            this.z4bCabinWalking = false;
          }

        } else if (this.z4bCabinState === "side_turn") {
          this.z4bCabinState = "side_settle";
          this.z4bCabinStart = now;
          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.22;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = false;

        } else if (this.z4bCabinState === "side_settle") {
          var settleAge = now - this.z4bCabinStart;
          var settleT = smoothZ4B(settleAge / 520);

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.22 + 0.08 * settleT;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.0;
          this.z4bCabinFlash = 0.0;
          this.neuralIntensity = 3.48;

          if (settleT >= 1) {
            this.z4bCabinState = "forward";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0.0;
            this.z4bCabinCamZ = 12.30;
            this.z4bCabinYaw = 0.0;
            this.z4bCabinZoom = 1.0;
          }

        } else if (this.z4bCabinState === "entry") {
          var entryAge = now - this.z4bCabinStart;
          var entryT = smoothZ4B(entryAge / 900);

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 12.0 + 0.25 * entryT;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinZoom = 1.0;
          this.z4bCabinWalking = true;

          if (entryT >= 1) {
            this.z4bCabinState = "forward";
            this.z4bCabinStart = now;
            this.z4bCabinCamX = 0;
            this.z4bCabinYaw = 0;
            this.z4bCabinZoom = 1;
          }

        } else if (this.z4bCabinState === "forward") {
          this.z4bCabinCamX = 0.0;
          this.z4bCabinYaw = 0.0;

          if (moving) {
            this.z4bCabinCamZ = Math.min(19.7, this.z4bCabinCamZ + dt * 1.55);
            this.z4bCabinWalking = true;
          }

          if (this.z4bCabinCamZ >= 19.7) {
            if (this.z4bStopAtCockpit) {
              this.z4bCabinState = "hold_cockpit";
              this.z4bCabinStart = now;
              this.z4bCabinCamZ = 19.7;
              this.z4bCabinCamX = 0.0;
              this.z4bCabinYaw = 0.0;
              this.z4bCabinWalking = false;
              this.z4bCabinShake = 0;
              this.z4bCabinFlash = 0;
            } else {
              this.z4bCabinState = "turbulence";
              this.z4bCabinStart = now;
              this.z4bCabinCrashStart = 0;
              this.z4bCabinWalking = false;
            }
          }

        } else if (this.z4bCabinState === "hold_cockpit") {
          var holdAge = now - this.z4bCabinStart;

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.004 + 0.006 * Math.sin(holdAge * 0.006);
          this.z4bCabinFlash = 0;
          this.z4bCabinZoom = 1.0;
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 0;
          this.neuralIntensity = 3.35;

          if (holdAge >= 1500) {
            this.z4bCabinState = "turbulence";
            this.z4bCabinStart = now;
            this.z4bCabinWalking = false;
          }

        } else if (this.z4bCabinState === "turbulence") {
          var turbAge = now - this.z4bCabinStart;
          var turbT = Math.min(1, turbAge / 9200);
          var turbEase = turbT * turbT * (3.0 - 2.0 * turbT);

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.012 + 0.23 * Math.pow(turbT, 1.85);
          this.z4bCabinFlash = turbAge > 1100 && Math.random() > 0.94 - turbT * 0.42 ? 0.18 + 0.70 * turbT : 0;
          this.z4bCabinZoom = 1.0 + 0.075 * turbEase + 0.010 * Math.sin(turbAge * 0.010);
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 0;
          this.neuralIntensity = 3.55 + turbEase * 2.25;

          if (turbAge >= 9200) {
            this.z4bCabinState = "crash";
            this.z4bCabinCrashStart = now;
            this.z4bCabinFlash = 1.0;
            this.z4bCabinShake = 0.30;
          }

        } else if (this.z4bCabinState === "crash") {
          var crashAge = now - (this.z4bCabinCrashStart || now);
          var redT = Math.max(0, Math.min(1, (crashAge - 650) / 2300));
          var blackT = Math.max(0, Math.min(1, (crashAge - 3300) / 2300));
          var impactT = Math.min(1, crashAge / 5600);

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0.25 + 0.17 * Math.sin(crashAge * 0.027) + 0.15 * impactT;
          this.z4bCabinFlash =
            crashAge < 280
              ? 1.0
              : Math.max(0, 0.45 * (1.0 - blackT)) * (Math.random() > 0.66 ? 1.0 : 0.0);
          this.z4bCabinZoom = 1.10 + 0.16 * impactT + 0.020 * Math.sin(crashAge * 0.018);
          this.z4bCrashRedAlpha = redT * (1.0 - blackT * 0.35);
          this.z4bCrashBlackAlpha = blackT;
          this.neuralIntensity = 5.3;

          if (crashAge >= 5900) {
            this.z4bCabinState = "black_hold";
            this.z4bCabinStart = now;
            this.z4bCabinFlash = 0;
            this.z4bCabinShake = 0;
            this.z4bCrashRedAlpha = 0;
            this.z4bCrashBlackAlpha = 1;
          }

        } else if (this.z4bCabinState === "black_hold") {
          var blackAge = now - this.z4bCabinStart;

          this.z4bCabinCamX = 0.0;
          this.z4bCabinCamZ = 19.7;
          this.z4bCabinYaw = 0.0;
          this.z4bCabinWalking = false;
          this.z4bCabinShake = 0;
          this.z4bCabinFlash = 0;
          this.z4bCabinZoom = 1.0;
          this.z4bCrashRedAlpha = 0;
          this.z4bCrashBlackAlpha = 1;
          this.neuralIntensity = 0.0;

          if (blackAge >= 3200) this._startZ4BIslandWake(now);
        }

      } else if (this.phase === "reverse_entering_ring") {
        this.enterRingT = Math.max(0, this.enterRingT - dt * 0.7);
        if (this.enterRingT <= 0) {
          this.phase = "reverse_hallway";
          this.phaseStart = now;
          this.hallwayT = 1;
        }
        this.neuralIntensity = 2.5;

      } else if (this.phase === "reverse_hallway") {
        this.hallwayT = Math.max(0, this.hallwayT - dt * 0.35);
        if (this.hallwayT <= 0) {
          this.phase = "reverse_bay";
          this.phaseStart = now;
          this.walkoff = 1;
        }
        this.neuralIntensity = 2.4;

      } else if (this.phase === "reverse_bay") {
        this.walkoff = Math.max(0, this.walkoff - dt * 0.30);
        if (this.walkoff <= 0) {
          this.phase = "fog_in_descent";
          this.phaseStart = now;
          this._setFog(1, this.fogInDuration);
        }
        this.neuralIntensity = 2.2;

      } else if (this.phase === "fog_in_descent") {
        if (now - this.phaseStart >= this.fogInDuration) {
          this.phase = "descent";
          this.phaseStart = now;
          this.descentStart = now;
          this.descentProgress = 1;
          this._setFog(0, this.fogOutDuration);
        }
        this.neuralIntensity = 2.0;

      } else if (this.phase === "descent") {
        var elapsed = now - this.descentStart;
        this.descentProgress = Math.max(0, 1 - elapsed / this.descentDuration);
        this.progress = this.descentProgress;
        if (moving) this.walkAngle -= dt * 0.42;

        var descentT = 1 - this.descentProgress; 
        this.shakeIntensity = descentT * descentT * 0.08;

        if (descentT >= 0.6) {
          this.phase = "descent_shake";
          this.phaseStart = now;
        }
        this.neuralIntensity = 2.0 - descentT * 0.5;

      } else if (this.phase === "descent_shake") {
        var elapsed = now - this.phaseStart;
        var shakeT = Math.min(1, elapsed / 4000); 
        this.shakeIntensity = 0.05 + shakeT * 0.25;
        this.progress = Math.max(0, this.descentProgress - (elapsed / this.descentDuration) * 0.4);

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
        this.fallProgress = Math.min(1, (now - this.fallStart) / this.fallDuration);

        if (this.fallProgress >= 1) {
          this.phase = "impact";
          this.phaseStart = now;
        }
        this.neuralIntensity = 3.0;

      } else if (this.phase === "impact") {
        var elapsed = now - this.phaseStart;
        if (elapsed > 2500) {
          this.destroy();
          setTimeout(function() {
            window.location.reload();
          }, 200);
        }
      }
    }

    _buildAltAnnexFXProgram() {
      const prog = gl.createProgram();
      const vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv=p*0.5+0.5; gl_Position=vec4(p,0.0,1.0); }"
      );
      const fs = compile(
        gl.FRAGMENT_SHADER,
        "precision mediump float; varying vec2 v_uv; uniform vec2 u_res; uniform float u_time; uniform float u_strobe; uniform float u_fogPulse; float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);} float noise2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),u.x),mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),u.x),u.y);} float fbm(vec2 p){float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise2(p);p=p*2.07+vec2(31.7,12.4);a*=0.5;} return v;} void main(){ vec2 uv=(v_uv-0.5)*vec2(u_res.x/u_res.y,1.0); float left=1.0-smoothstep(-0.62,0.06,uv.x); float wall=1.0-smoothstep(-0.20,-0.03,uv.x); float hang=smoothstep(-0.34,0.22,uv.y)*smoothstep(0.96,0.18,uv.y); float n=fbm(uv*vec2(1.65,3.70)+vec2(u_time*0.030,-u_time*0.020)); n+=0.44*fbm(uv*vec2(5.8,2.1)+vec2(-u_time*0.018,u_time*0.040)); n+=0.18*fbm(uv*vec2(10.0,4.2)+vec2(u_time*0.012,u_time*0.016)); float fog=smoothstep(0.37,0.86,n)*left*hang; vec2 sp=uv-vec2(-0.80,0.04); float cone=smoothstep(0.88,0.06,length(sp*vec2(0.66,1.08))); float slash=smoothstep(0.22,0.0,abs(sp.y+sp.x*0.52)); float st=clamp(max(cone,slash*left)*wall*u_strobe,0.0,1.0); vec3 fogCol=mix(vec3(0.36,0.025,0.018),vec3(0.68,0.40,0.32),smoothstep(0.62,1.0,n)); vec3 col=fogCol*fog*(0.86+u_fogPulse*0.58)+vec3(1.0,0.94,0.76)*st*2.2; float a=clamp(fog*(0.20+u_fogPulse*0.10)+st*0.40,0.0,0.72); gl_FragColor=vec4(col,a); }"
      );
      if (!vs || !fs) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[Zone4] Alt annex FX link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
      }
      return {
        prog: prog,
        p: gl.getAttribLocation(prog, "p"),
        res: gl.getUniformLocation(prog, "u_res"),
        time: gl.getUniformLocation(prog, "u_time"),
        strobe: gl.getUniformLocation(prog, "u_strobe"),
        fogPulse: gl.getUniformLocation(prog, "u_fogPulse")
      };
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

    _drawAltAnnexFX(now) {
      if (!this._altAnnexCleanView) return;
      if (!(this.phase === "annex_room" || this.phase === "annex_exit_door")) return;
      this._drawOverlay(0.0, 0.0, 0.0, 0.035);
    }

    _drawCabinPortalOverlay(a) {
      if (!this.cabinPortalOverlayProg || !this.cabinPortalTexture || a <= 0.001) return;
      gl.useProgram(this.cabinPortalOverlayProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);
      const pLoc = gl.getAttribLocation(this.cabinPortalOverlayProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalOverlayProg, "u_tex"), 0);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalOverlayProg, "u_alpha"), a);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }

    _renderElevator(now) {
      if (!this.elevatorProg) return;

      gl.disable(gl.DEPTH_TEST);
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

    _angleDistance(a, b) {
      var d = Math.abs(a - b);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d;
    }

    _stationWindowSideAtRingU() {
      const sectionAngle = (Math.PI * 2) / 16;
      const outerU = (this.stationSection + 0.5) * sectionAngle;
      const innerU = (outerU + Math.PI) % (Math.PI * 2);
      const groupHalfWidth = sectionAngle * 1.5;
      if (this._angleDistance(this.ringU, outerU) <= groupHalfWidth) return 1;
      if (this._angleDistance(this.ringU, innerU) <= groupHalfWidth) return -1;
      return 0;
    }

    _startStationViewTurn(now, angle, viewTo, directionTo, windowSideTo) {
      if (this.turnAnimating) return false;
      this.turnAnimating = true;
      this.turnStart = now;
      this.turnAngle = angle;
      this.turnViewTo = viewTo || null;
      this.turnDirectionTo = typeof directionTo === "number" ? directionTo : null;
      this.turnWindowSideTo = typeof windowSideTo === "number" ? windowSideTo : null;
      this.turnLookX = this.cx;
      this.turnLookY = this.cy;
      return true;
    }

    _isAltAnnexRoute() {
      return !!(
        this.annexAltBasementActive ||
        this.annexBasementVariant === "alt" ||
        this.altAnnexRouteActive
      );
    }

    _isAltAnnexLocked() {
      return !!(
        (this.annexAltBasementActive || this.annexBasementVariant === "alt" || this.altAnnexRouteActive) &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
    }

    _checkStationTurnThreshold(now) {
      const inAnnexRoom = this.phase === "annex_room";
      const inRing = this.phase === "ring";

      if (inAnnexRoom && this._isAltAnnexLocked()) {
        this.turnInputLatch = 0;
        this.annexTurnInputLatch = 0;
        window.__z4AnnexTurnRequested = 0;
        return;
      }

      if (!inRing && !inAnnexRoom) {
        if (Math.abs(this.cx) < 0.34) {
          this.turnInputLatch = 0;
          this.annexTurnInputLatch = 0;
          window.__z4TurnRequested = 0;
          window.__z4AnnexTurnRequested = 0;
        }
        return;
      }

      if (this.turnAnimating) return;

      let dir = 0;
      if (this.cx >= 0.76) dir = 1;
      else if (this.cx <= -0.76) dir = -1;
      else if (Math.abs(this.cx) < 0.30) {
        this.turnInputLatch = 0;
        this.annexTurnInputLatch = 0;
        if (inRing) window.__z4TurnRequested = 0;
        if (inAnnexRoom) window.__z4AnnexTurnRequested = 0;
      }

      if (!dir) return;

      if (inAnnexRoom) {
        if (this.annexTurnInputLatch === dir && window.__z4AnnexTurnRequested === dir) return;
        this.annexTurnInputLatch = dir;
        window.__z4AnnexTurnRequested = dir;
        return;
      }

      if (this.turnInputLatch === dir && window.__z4TurnRequested === dir) return;
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
          baseForward = frame.radial.slice();
        }

      } else if (
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_turn_in" ||        this.phase === "annex_room" ||
        this.phase === "annex_exit_door"
      ) {
        const annexAngle = (this.annexSection + 0.5) * SECTION_ANGLE;
        const entryAngle = typeof this.annexEntryU === "number" ? this.annexEntryU : annexAngle;
        const targetAngle = typeof this.annexTargetU === "number" ? this.annexTargetU : annexAngle;
        let activeFrame = this._stationFrame(annexAngle);

        const hallEntryX = 2.70;
        const hallEndX = 7.55;
        const stairEndX = 15.35;
        // Z4_ALT_ANNEX_REACH_BACK_WALL_FINAL
        const roomEndX = 23.08;
        const annexDrop = 3.80;
        const altAnnexLocked = typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked();
        const altAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();
        const altAnnexLaneZ = 0.0;

        let localX = 0.0;
        let localY = -0.02;
        let localZ = 0.0;

        function smooth(t) {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        }

        function mixAngle(a, b, t) {
          let d = b - a;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          return a + d * t;
        }

        if (this.phase === "annex_turn_in") {
          const rawTurnT = Math.max(0, Math.min(1, this.annexTurnT));
          const yawT = smooth(rawTurnT / 0.46);
          const moveT = smooth((rawTurnT - 0.18) / 0.82);
          activeFrame = this._stationFrame(mixAngle(entryAngle, targetAngle, yawT));
          localX = hallEntryX * moveT;
          localZ = 0.0;
          const pathForward = this._mul(activeFrame.tangent, this.ringDirection || -1);
          baseForward = this._normalize(this._mix3(pathForward, activeFrame.radial, yawT));

                } else if (
          this.phase === "annex_hallway") {
          const rawT = Math.max(0, Math.min(1, this.annexHallT));

          if (rawT < 0.38) {
            let walkT = smooth(rawT / 0.38);
            localX = hallEntryX + (hallEndX - hallEntryX) * walkT;
            localY = -0.02;
          } else {
            let stairT = smooth((rawT - 0.38) / 0.62);
            localX = hallEndX + (stairEndX - hallEndX) * stairT;
            localY = -0.02 - annexDrop * stairT;
            if (altAnnexLocked) localZ = 0.0;
          }

          baseForward = activeFrame.radial.slice();

        } else if (this.phase === "annex_room") {
          let roomT = smooth(this.annexRoomT);
          localX = stairEndX + (roomEndX - stairEndX) * roomT;
          localY = -0.02 - annexDrop;

          if (altAnnexLocked) {
            localZ = 0.0;
            baseForward = activeFrame.radial.slice();
          } else {
            localZ = altAnnexRouteNow ? 0.0 : Math.sin(roomT * Math.PI) * 0.18;

            if ((this.annexRoomView || "path") === "stage") {
              baseForward = this._mul(activeFrame.tangent, -1);
            } else {
              baseForward = this._mul(activeFrame.radial, this.annexRoomDir || 1);
            }
          }

        } else {
          let exitT = smooth(this.annexExitT);
          localX = roomEndX + 1.72 * exitT;
          localY = -0.02 - annexDrop;
          localZ = 0.0;
          baseForward = activeFrame.radial.slice();
        }

        eye = this._add(
          activeFrame.center,
          this._add(
            this._add(this._mul(activeFrame.radial, localX), this._mul(activeFrame.tangent, localZ)),
            [0, localY, 0]
          )
        );

      } else {
        eye = this._add(frame.center, [0, -0.02, 0]);
        var dir = typeof this.ringDirection === "number" ? this.ringDirection : 1;
        baseForward = this.ringView === "window"
          ? this._mul(frame.radial, this.ringWindowSide || 1)
          : this._mul(frame.tangent, dir);
      }

      let lookX = this.cx;
      let lookY = this.cy;
      let fwd = baseForward.slice();

      if (typeof this._isAltAnnexLocked === "function" && this._isAltAnnexLocked()) {
        lookX = Math.max(-0.24, Math.min(0.24, lookX));
        lookY = Math.max(-0.15, Math.min(0.15, lookY));
      }

      if (this.turnAnimating) {
        const turnElapsed = this.lastRenderTime - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        fwd = this._rotateAroundAxis(fwd, [0, 1, 0], (this.turnAngle || Math.PI) * turnT);
        lookX = this.turnLookX * (1 - turnT);
        lookY = this.turnLookY * (1 - turnT);
      }

      fwd = this._rotateAroundAxis(fwd, [0, 1, 0], -lookX * 1.0);

      let right = this._normalize(this._cross(fwd, [0, 1, 0]));
      const pitchReach = this.phase === "ring" ? 0.95 : 0.6;
      fwd = this._rotateAroundAxis(fwd, right, -lookY * pitchReach);
      right = this._normalize(this._cross(fwd, [0, 1, 0]));
      let up = this._normalize(this._cross(right, fwd));

      const moveHeld = z4SpaceHeld || z4TouchHeld;
      let moveAmp = 0.0;

      if (this.phase === "bay" || this.phase === "hallway" || (this.phase === "ring" && this.ringView === "path")) {
        moveAmp = moveHeld ? 1.0 : 0.0;
      } else if (
        this.phase === "reverse_bay" ||
        this.phase === "reverse_hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "fog_in_descent"
      ) {
        moveAmp = 0.55;
      } else if (
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door"
      ) {
        moveAmp = (moveHeld && !(this.phase === "annex_room" && (this.annexRoomView || "path") !== "path")) ? 0.55 : 0.0;
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

      if (this.shakeIntensity > 0) {
        eye = this._add(eye, this._mul(right, this.shakeOffsetX));
        eye = this._add(eye, this._mul(up, this.shakeOffsetY));
      }

      return {
        eye: eye,
        forward: this._normalize(fwd),
        right: right,
        up: up
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
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_useTexAlpha"), (mesh.useTexAlpha || mesh.blend) ? 1.0 : 0.0);
      gl.uniform3f(
        gl.getUniformLocation(this.stationMeshProg, "u_flatCol"),
        mesh.flatCol[0], mesh.flatCol[1], mesh.flatCol[2]
      );
      gl.uniform2f(gl.getUniformLocation(this.stationMeshProg, "u_screen"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.stationMeshProg, "u_screenSample"), (mesh.screenSample ? 1.0 : 0.0));
      gl.uniform1f(
        gl.getUniformLocation(this.stationMeshProg, "u_greenKey"),
        mesh.greenKey ? 1.0 : 0.0
      );

      const annexLightingLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexLighting");
      if (annexLightingLoc !== null) gl.uniform1f(annexLightingLoc, this._annexLightingActive ? 1.0 : 0.0);
      const annexStrobeLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexStrobe");
      if (annexStrobeLoc !== null) gl.uniform1f(annexStrobeLoc, this._annexStrobe || 0.0);
      const annexExitGlowLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexExitGlow");
      if (annexExitGlowLoc !== null) gl.uniform1f(annexExitGlowLoc, this._annexExitGlow || 0.0);
      const annexExitLight = this.annexExitLightWorld || [0, 0, 0];
      const annexExitLightLoc = gl.getUniformLocation(this.stationMeshProg, "u_annexExitLight");
      if (annexExitLightLoc !== null) gl.uniform3f(annexExitLightLoc, annexExitLight[0], annexExitLight[1], annexExitLight[2]);
      const annexLights = this.annexLightWorld || [[0,0,0],[0,0,0],[0,0,0]];
      const annexLight0 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight0");
      const annexLight1 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight1");
      const annexLight2 = gl.getUniformLocation(this.stationMeshProg, "u_annexLight2");
      if (annexLight0 !== null) gl.uniform3f(annexLight0, annexLights[0][0], annexLights[0][1], annexLights[0][2]);
      if (annexLight1 !== null) gl.uniform3f(annexLight1, annexLights[1][0], annexLights[1][1], annexLights[1][2]);
      if (annexLight2 !== null) gl.uniform3f(annexLight2, annexLights[2][0], annexLights[2][1], annexLights[2][2]);
      const annexLightCols = this.annexLightColorWorld || [[0.62, 0.72, 0.88], [1.30, 0.06, 0.03], [1.30, 0.06, 0.03]];
      const annexLightCol0 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol0");
      const annexLightCol1 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol1");
      const annexLightCol2 = gl.getUniformLocation(this.stationMeshProg, "u_annexLightCol2");
      if (annexLightCol0 !== null) gl.uniform3f(annexLightCol0, annexLightCols[0][0], annexLightCols[0][1], annexLightCols[0][2]);
      if (annexLightCol1 !== null) gl.uniform3f(annexLightCol1, annexLightCols[1][0], annexLightCols[1][1], annexLightCols[1][2]);
      if (annexLightCol2 !== null) gl.uniform3f(annexLightCol2, annexLightCols[2][0], annexLightCols[2][1], annexLightCols[2][2]);
      const redStageActive = !!(this._altAnnexCleanView && this.altAnnexStageRedLightWorld);
      const redStageLight = redStageActive ? this.altAnnexStageRedLightWorld : [999.0, 999.0, 999.0];
      const annexStageRedLight = gl.getUniformLocation(this.stationMeshProg, "u_annexStageRedLight");
      const annexStageRedGlow = gl.getUniformLocation(this.stationMeshProg, "u_annexStageRedGlow");
      if (annexStageRedLight !== null) gl.uniform3f(annexStageRedLight, redStageLight[0], redStageLight[1], redStageLight[2]);
      if (annexStageRedGlow !== null) gl.uniform1f(annexStageRedGlow, redStageActive ? 0.62 : 0.0);
      const whiteStageLight = (this.altAnnexStageWhiteLightWorld || this.altAnnexStageRedLightWorld || [999.0, 999.0, 999.0]);
      const annexStageWhiteLight = gl.getUniformLocation(this.stationMeshProg, "u_annexStageWhiteLight");
      const annexStageWhiteStrobe = gl.getUniformLocation(this.stationMeshProg, "u_annexStageWhiteStrobe");
      if (annexStageWhiteLight !== null) gl.uniform3f(annexStageWhiteLight, whiteStageLight[0], whiteStageLight[1], whiteStageLight[2]);
      if (annexStageWhiteStrobe !== null) gl.uniform1f(annexStageWhiteStrobe, this._altAnnexWhiteStrobe || 0.0);
    }

    _ensureMode4VoidTarget() {
      const w = canvas.width;
      const h = canvas.height;

      if (!this.z4bVoidFBO) this.z4bVoidFBO = gl.createFramebuffer();

      if (!this.z4bVoidTexture) {
        this.z4bVoidTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }

      if (this.z4bVoidWidth !== w || this.z4bVoidHeight !== h) {
        this.z4bVoidWidth = w;
        this.z4bVoidHeight = h;
        gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }

      return true;
    }

    _renderMode4VoidFBO(now) {
      if (!this.z4bVoidMode) {
        try {
          if (typeof ActiveMode !== "undefined") {
            this.z4bVoidMode = new ActiveMode(5);
            this.z4bVoidMaskTex = this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0);
            this.z4bVoidMode.maskTex = this.z4bVoidMaskTex;
          }
        } catch (e) {
          this.z4bVoidMode = null;
        }
      }

      if (!this.z4bVoidMode) return false;
      if (!this._ensureMode4VoidTarget()) return false;

      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const prevViewport = gl.getParameter(gl.VIEWPORT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.z4bVoidFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.z4bVoidTexture, 0);
      gl.viewport(0, 0, this.z4bVoidWidth, this.z4bVoidHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      try {
        this.z4bVoidMode.maskTex = this.z4bVoidMaskTex || this._makeSolidTexture(0, 0, 0, 0);
        this.z4bVoidMode.render(now, 0, 0, 0, 0, 0, 0, 1.0, 0);
      } catch (e) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO);
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);

      return true;
    }

    _patchZ4BCockpitVoidUV() {
      if (!window.GLSL || !window.GLSL.modules || !window.GLSL.modules.z3_merged) return;

      let src = window.GLSL.modules.z3_merged;
      if (src.indexOf("z4bCockpitVoidOffset") >= 0) return;

      const rawScreen =
        'vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';
      const rawFixed =
        'vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9, 0.0, 1.0));\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';
      const shifted =
        'vec2 vuv = vec2(clamp((p.x + FUSE_R) / (FUSE_R * 2.0), 0.0, 1.0), clamp((p.y - FLOOR_Y) / 1.9 + 0.18, 0.0, 1.0)); \n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;';

      if (src.indexOf(rawFixed) >= 0) {
        src = src.replace(rawFixed, shifted);
      } else if (src.indexOf(rawScreen) >= 0) {
        src = src.replace(rawScreen, shifted);
      } else {
        throw new Error("cockpit windshield void sample line not found");
      }

      window.GLSL.modules.z3_merged = src;
    }

    _ensureCabinPortalProgram() {
      if (this.cabinPortalProg) return true;

      this._patchZ4BCockpitVoidUV();

      const src =
        (window.GLSL && window.GLSL.modules && window.GLSL.modules.z3_merged) ||
        null;

      if (!src) return false;

      this.cabinPortalProg = this._buildRawProgram(
        "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }",
        src
      );

      return !!this.cabinPortalProg;
    }

    _ensureCabinPortalTarget() {
      
      
      
      const w = canvas.width;
      const h = canvas.height;
      if (!this.cabinPortalFBO) this.cabinPortalFBO = gl.createFramebuffer();
      if (!this.cabinPortalTexture) {
        this.cabinPortalTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      if (this.cabinPortalWidth !== w || this.cabinPortalHeight !== h) {
        this.cabinPortalWidth = w;
        this.cabinPortalHeight = h;
        gl.bindTexture(gl.TEXTURE_2D, this.cabinPortalTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      return true;
    }

    _renderZ4BCabin(now) {
      if (!this._ensureCabinPortalProgram()) return;

      
      
      this._renderMode4VoidFBO(now);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0.005, 0.006, 0.010, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      gl.useProgram(this.cabinPortalProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.cabinPortalProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(this.cabinPortalProg, "u_resolution"), canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(this.cabinPortalProg, "u_mouse"), this.cx, this.cy);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_time"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_wake"), 1);

      var cabinOOB =
        this.z4bCabinFractalActive ||
        this.z4bCabinState === "turbulence" ||
        this.z4bCabinState === "crash" ||
        this.z4bCabinState === "side_entry" ||
        this.z4bCabinState === "side_turn" ||
        this.z4bCabinState === "side_settle"
          ? 1.0
          : 0.0;

      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_camZ"), this.z4bCabinCamZ);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_camX"), this.z4bCabinCamX);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_yawOffset"), this.z4bCabinYaw);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_doorOpen"), 1);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_doorSwitched"), 1);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_isWalking"), this.z4bCabinWalking ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_shake"), this.z4bCabinShake);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_flash"), this.z4bCabinFlash);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_suctionFade"), 0);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_zoom"), this.z4bCabinZoom);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_trip"), this.z4Trip);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_modeSeed"), this.z4ModeSeed);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_modeTime"), this.z4ModeTime);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_isOOB"), cabinOOB);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_fractalActive"), this.z4bCabinFractalActive ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_fractalSeed"), this.z4FractalSeed);
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_blinkAge"), 0.001 * (now - (this.z4BlinkPeakTime || now)));
      gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_altRoute"), 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture || this.stationTextures.black);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_voidTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_doorClosedTex"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_doorOpenTex"), 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texLeft"), 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texRight"), 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texTop"), 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texBottom"), 6);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_cockpitTex"), 7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    _drawZ4BCrashOverlays(now) {
      if (this.phase !== "z4b_cabin") return;

      var red = this.z4bCrashRedAlpha || 0;
      var black = this.z4bCrashBlackAlpha || 0;

      if (red > 0.001) {
        var pulse = 0.88 + 0.12 * Math.sin(now * 0.021);
        this._drawOverlay(0.95, 0.0, 0.0, Math.min(1, red * pulse));
      }

      if (black > 0.001) {
        this._drawOverlay(0.0, 0.0, 0.0, Math.min(1, black));
      }
    }

    _renderCabinPortalFBO(now) {
      
      
      
      
      
      if (!this._ensureCabinPortalProgram()) return;
      if (!this._ensureCabinPortalTarget()) return;

      const prevFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const prevViewport = gl.getParameter(gl.VIEWPORT);

      
      this._renderMode4VoidFBO(now);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.cabinPortalFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cabinPortalTexture, 0);
      gl.viewport(0, 0, this.cabinPortalWidth, this.cabinPortalHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0.005, 0.006, 0.010, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
        gl.useProgram(this.cabinPortalProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTri);
      const pLoc = gl.getAttribLocation(this.cabinPortalProg, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(this.cabinPortalProg, "u_resolution"), this.cabinPortalWidth, this.cabinPortalHeight);
  gl.uniform2f(gl.getUniformLocation(this.cabinPortalProg, "u_mouse"), 0.0, 0.0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_time"), now * 0.001);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_blink"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_wake"), 1);

  
  
  
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_camZ"), 12.0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_camX"), -1.30);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_yawOffset"), -Math.PI * 0.5);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_doorOpen"), 1);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_doorSwitched"), 1);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_isWalking"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_shake"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_flash"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_suctionFade"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_zoom"), 0.92);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_trip"), this.z4Trip);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_modeSeed"), this.z4ModeSeed);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_modeTime"), this.z4ModeTime);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_isOOB"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_fractalActive"), 0);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_fractalSeed"), this.z4FractalSeed);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_blinkAge"), 999);
  gl.uniform1f(gl.getUniformLocation(this.cabinPortalProg, "u_altRoute"), 0);
gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.z4bVoidTexture || this.stationTextures.black);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_voidTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorClosed);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_doorClosedTex"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinDoorOpen);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_doorOpenTex"), 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallLeft);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texLeft"), 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallRight);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texRight"), 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallTop);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texTop"), 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinHallBottom);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_texBottom"), 6);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.cabinCockpit);
      gl.uniform1i(gl.getUniformLocation(this.cabinPortalProg, "u_cockpitTex"), 7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO);
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }

    _renderFall(now) {
      if (!this._fallShaderBuilt) {
        this._fallShaderBuilt = true;
        var src = (window.GLSL && GLSL.modules && GLSL.modules.z4_fall) || null;
        if (!src) { console.error("[Zone4] GLSL.modules.z4_fall not found"); }
        if (src) {
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
      if (this.annexSequenceActive) this._updateVideoTexture(this.stationTextures.crywolf, this.crywolfVideo);
      if (this.annexSequenceActive || this.annexAltBasementActive || this.phase === "z4b_cabin") this._updateVideoTexture(this.stationTextures.bh2, this.bh2Video);

      const cam = this._computeStationCamera();

      const eye = cam.eye;
      const fwd = cam.forward;
      const right = cam.right;
      const up = cam.up;

      const proj = this._perspective(Math.PI / 2.65, canvas.width / canvas.height, 0.05, 220.0);
      const view = this._lookAt(eye, this._add(eye, fwd), [0, 1, 0]);

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

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fboDepth);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.01, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.stationBgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.screenQuad);

      const bgPos = gl.getAttribLocation(this.stationBgProg, "a_pos");
      gl.enableVertexAttribArray(bgPos);
      gl.vertexAttribPointer(bgPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(this.stationBgProg, "u_res"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_time"), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_blink"), this.rBlink);
      gl.uniform1f(gl.getUniformLocation(this.stationBgProg, "u_trip"), this._altAnnexCleanView ? 0.0 : this.z4Trip);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_eye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_forward"), fwd[0], fwd[1], fwd[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_right"), right[0], right[1], right[2]);
      gl.uniform3f(gl.getUniformLocation(this.stationBgProg, "u_up"), up[0], up[1], up[2]);
      const earthFrame = this._stationFrame(this.ringU);
      const earthSide = this.ringView === "window"
        ? (this.ringWindowSide || 1)
        : (this._stationWindowSideAtRingU() || 1);
      const earthTarget = this._normalize(this._add(
        this._mul(earthFrame.radial, earthSide),
        [0, -0.48, 0]
      ));
      gl.uniform3f(
        gl.getUniformLocation(this.stationBgProg, "u_targetDir"),
        earthTarget[0], earthTarget[1], earthTarget[2]
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.stationTextures.earth);
      gl.uniform1i(gl.getUniformLocation(this.stationBgProg, "u_env"), 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (this._altAnnexCleanView) {
        gl.clearColor(0.030, 0.026, 0.028, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }

      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.stationMeshProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_proj"), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.stationMeshProg, "u_view"), false, view);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_lightDir"), 0.3, 0.9, -0.4);
      gl.uniform3f(gl.getUniformLocation(this.stationMeshProg, "u_eye"), eye[0], eye[1], eye[2]);

      const inAnnexInterior =
        (this.phase === "annex_turn_in" && (this.annexTurnT || 0) >= 0.34) ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door";

      this._annexLightingActive = inAnnexInterior;
      this._annexStrobe = 0.0;
      this._annexExitGlow = (this.annexSequenceActive && inAnnexInterior) ? 1.0 : 0.0;
      this._altAnnexWhiteStrobe = 0.0;
      this._altAnnexFogPulse = 0.0;
      if (this._altAnnexCleanView && inAnnexInterior) {
        const strobeRate = 9.75;
        const strobePhase = ((now * 0.001 * strobeRate) % 1.0 + 1.0) % 1.0;
        const strobeSlot = Math.floor(now * 0.001 * strobeRate);
        const sr = Math.sin(strobeSlot * 127.1 + 31.7) * 43758.5453123;
        const strobeRnd = sr - Math.floor(sr);
        const sp = Math.sin(strobeSlot * 53.7 + 9.91) * 43758.5453123;
        const strobePow = sp - Math.floor(sp);
        if (strobeRnd > 0.28 && strobePhase < 0.165) {
          this._altAnnexWhiteStrobe = (1.0 - strobePhase / 0.165) * (2.40 + strobePow * 3.20);
        }
        this._altAnnexFogPulse = 0.72 + 0.28 * Math.sin(now * 0.001 * 0.58 + Math.sin(now * 0.001 * 0.17) * 1.55);
      }

      if (this.annexSequenceActive && inAnnexInterior) {
        const beatMs = 60000.0 / 140.0;
        const strobePhase =
          (((now - (this.annexSequenceStart || now)) % beatMs) + beatMs) %
          beatMs / beatMs;

        this._annexStrobe = strobePhase < 0.115 ? 1.0 : 0.0;
        if (strobePhase > 0.48 && strobePhase < 0.54) {
          this._annexStrobe = Math.max(this._annexStrobe, 0.45);
        }
      }

      const shouldDrawStationMesh = (mesh) => {
        const altRoomVisualBlocked =
          (
            this.annexAltBasementActive ||
            this.annexBasementVariant === "alt" ||
            this.altAnnexRouteActive ||
            (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
          ) &&
          !(this.phase === "annex_room" || this.phase === "annex_exit_door");

        if (
          altRoomVisualBlocked &&
          (
            mesh.annexAltCrowdVisual ||
            mesh.annexAltCrowd ||
            mesh.altAnnexCrowd ||
            mesh.annexCrowd ||
            mesh.crowdPerson ||
            mesh.annexAltFog ||
            mesh.annexAltFogWisp ||
            mesh.dynamicFogWisp ||
            mesh.altAnnexFogMachine ||
            mesh.annexAltStrobeBeam ||
            mesh.altAnnexStrobeBeam ||
            (mesh.annexAltOnly && mesh.blend && !mesh.annexAltDoorBulb && !mesh.annexTopDoorBulb)
          )
        ) return false;
        if (mesh.altAnnexFogMachine && !mesh.annexAltFogWisp && !mesh.dynamicFogWisp) return false;
        const z4AltAnnexRouteNow = typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute();
        if (mesh.annexAltOnly && !z4AltAnnexRouteNow) return false;
        if (mesh.annexNormalOnly && z4AltAnnexRouteNow) return false;
        if (mesh.annexBaseExitWall && z4AltAnnexRouteNow) return false;
        if (mesh.annexBaseExitWall && this.annexAltBasementActive) return false;
        if (mesh.annexEventExitWall && !this.annexSequenceActive) return false;
        if (mesh.annexCabinPortalWall && !this.annexSequenceActive) return false;
        if (mesh.annexSetbackPortalTunnel && !this.annexSequenceActive) return false;
        if (mesh.annexBh2PortalWall && !this.annexSequenceActive) return false;
        if (mesh.annexBaseExitWall && this.annexSequenceActive) return false;
        if (mesh.annexCrywolfWall && !this.annexSequenceActive) return false;
        if (mesh.annexInterior && !inAnnexInterior) return false;
        if (mesh.annexExterior && inAnnexInterior) return false;
        if (mesh.annexEntranceDoor && this.annexDoorOpen) return false;
        return true;
      };

      const drawStationMesh = (mesh) => {
const __z4AltExitPortalDrawPatched = true;
        if (mesh.annexCabinPortalWall) {
          mesh.tex = this.cabinPortalTexture || this.stationTextures.black;
        } else if (mesh.annexBh2PortalWall) {
          mesh.tex = this.stationTextures.bh2 || this.stationTextures.black;
        } else if (mesh.annexAltZ3BPortalWall || mesh.annexAltBhPortalWall) {
          mesh.tex = this.stationTextures.black;
          mesh.texMix = 0.0;
          mesh.flatCol = [0.0, 2.85, 0.12];
        }
        this._bindStationMesh(mesh);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      };

      if (this._altAnnexCleanView) {
        for (let i = 0; i < this.stationMeshes.length; i++) {
          const mesh = this.stationMeshes[i];
          if (mesh && typeof mesh.altFogUpdater === "function" && shouldDrawStationMesh(mesh)) {
            mesh.altFogUpdater(now);
          }
        }
      }

      gl.disable(gl.BLEND);
      gl.depthMask(true);
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        if (!shouldDrawStationMesh(mesh)) continue;
        if (mesh.blend) continue;
        drawStationMesh(mesh);
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (let i = 0; i < this.stationMeshes.length; i++) {
        const mesh = this.stationMeshes[i];
        if (!shouldDrawStationMesh(mesh)) continue;
        if (!mesh.blend) continue;
        drawStationMesh(mesh);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);

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
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexPeripheral"), this._altAnnexCleanView ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexWhiteStrobe"), this._altAnnexWhiteStrobe || 0.0);
      gl.uniform1f(gl.getUniformLocation(this.postProcessProg, "u_altAnnexFogPulse"), this._altAnnexFogPulse || 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    }

    render(now, mx, my) {
      if (this.isDead) return;

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

      if (typeof mx !== "number") mx = typeof window.mx === "number" ? window.mx : this.cx;
      if (typeof my !== "number") my = typeof window.my === "number" ? window.my : this.cy;

      const altAnnexHardLookClamp = !!(
        typeof this._isAltAnnexLocked === "function" &&
        this._isAltAnnexLocked()
      );
      if (altAnnexHardLookClamp) {
        mx = Math.max(-0.24, Math.min(0.24, mx));
        my = Math.max(-0.15, Math.min(0.15, my));
        if (typeof window.mx === "number") window.mx = mx;
        if (typeof window.my === "number") window.my = my;
      }

      const stickyLook = this.phase === "z4b_cabin";
      if (stickyLook) {
        const lx = typeof window.__z4bIslandLookX === "number" ? window.__z4bIslandLookX : this.cx;
        const ly = typeof window.__z4bIslandLookY === "number" ? window.__z4bIslandLookY : this.cy;
        if (Math.abs(mx) < 0.0005 && Math.abs(my) < 0.0005 && (Math.abs(lx) > 0.0005 || Math.abs(ly) > 0.0005 || Math.abs(this.cx) > 0.0005 || Math.abs(this.cy) > 0.0005)) {
          mx = lx;
          my = ly;
        }
      }

      if (!this.turnAnimating) {
        this.cx += (mx - this.cx) * Math.min(1, 0.12 * step);
        this.cy += (my - this.cy) * Math.min(1, 0.12 * step);
      } else {
        const turnElapsed = now - this.turnStart;
        let turnT = Math.min(1, Math.max(0, turnElapsed / this.turnDuration));
        turnT = turnT * turnT * (3 - 2 * turnT);
        this.cx = this.turnLookX * (1 - turnT);
        this.cy = this.turnLookY * (1 - turnT);
      }

      const altAnnexHardLookClampAfterSmooth = !!(
        typeof this._isAltAnnexLocked === "function" &&
        this._isAltAnnexLocked()
      );
      if (altAnnexHardLookClampAfterSmooth) {
        this.cx = Math.max(-0.24, Math.min(0.24, this.cx));
        this.cy = Math.max(-0.15, Math.min(0.15, this.cy));
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      }

      if (stickyLook) {
        window.__z4bIslandLookX = this.cx;
        window.__z4bIslandLookY = this.cy;
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      } else if (this.turnAnimating) {
        if (typeof window.mx === "number") window.mx = this.cx;
        if (typeof window.my === "number") window.my = this.cy;
      }

      this._checkStationTurnThreshold(now);

      this._updateBlink(now);
      this._updatePhase(now, dt * 0.001);
      if (this.isDead) return;
      this.z4ModeTime += dt * 0.001;
      this._altAnnexCleanView = !!(
        (
          this.annexAltBasementActive ||
          this.annexBasementVariant === "alt" ||
          this.altAnnexRouteActive ||
          this.altAnnexDoorOpen ||
          this.altAnnexCounterClockwiseReady ||
          (typeof this._isAltAnnexRoute === "function" && this._isAltAnnexRoute())
        ) &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      );
      if (this._altAnnexCleanView) {
        this.neuralIntensity = 0;
        this.rBlink = 0;
        this.blinking = false;
        this.blackholeVisible = false;
        this.blackholeIntensity = 0;
        this.hallucinationIntensity = 0;
        this.hallucinationLevel = 0;
        this.glitchIntensity = 0;
        this.glitchAmount = 0;
        this.chromaticAberration = 0;
        this.vignetteIntensity = 0;
        this.noiseIntensity = 0;
        this.scanlineIntensity = 0;
        this.warpIntensity = 0;
        this.distortionIntensity = 0;
      }
      this.z4Trip = this._altAnnexCleanView ? 0.58 : Math.max(0.18, Math.min(1.4, this.neuralIntensity / 3.6));
      this.z4IsOOB = this._altAnnexCleanView ? 1.0 : (this.phase === "bay" ||
        this.phase === "hallway" ||
        this.phase === "entering_ring" ||
        this.phase === "ring" ||
        this.phase === "annex_turn_in" ||
        this.phase === "annex_hallway" ||
        this.phase === "annex_room" ||
        this.phase === "annex_exit_door" ||
        this.phase === "z4b_cabin" ||
        this.phase === "reverse_entering_ring" ||
        this.phase === "reverse_hallway" ||
        this.phase === "reverse_bay"
          ? 1.0
          : 0.0)

      if (typeof this._updateAltAnnexNffAudio === "function") {
        this._updateAltAnnexNffAudio(now);
      }

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
      } else if (this.phase === "z4b_cabin") {
        this._renderZ4BCabin(now);
        this._drawZ4BCrashOverlays(now);
      } else {
        if (
          this.annexSequenceActive &&
          !this._altAnnexCleanView &&
          (
            this.phase === "annex_room" ||
            this.phase === "annex_exit_door"
          )
        ) {
          this._renderCabinPortalFBO(now);
        }
        this._renderStation(now);
        if (
          this._altAnnexCleanView &&
          (
            this.phase === "annex_hallway" ||            this.phase === "annex_room" ||
            this.phase === "annex_exit_door"
          )
        ) {
          this._drawAltAnnexFX(now);
        }
      }

      if (
        !this._altAnnexCleanView &&
        (
          this.phase === "annex_hallway" ||
          this.phase === "annex_room" ||
          this.phase === "annex_exit_door"
        )
      ) {
        var hazeBase =
          this.phase === "annex_hallway" ? 0.12 :
          this.phase === "annex_room" ? 0.24 :
          0.28;
        var hazePulse = 0.030 * (0.5 + 0.5 * Math.sin(now * 0.0017));
        this._drawOverlay(0.18, 0.035, 0.0, hazeBase + hazePulse);
        this._drawOverlay(0.42, 0.03, 0.0, 0.045 + hazePulse * 0.35);
        if (this.phase === "annex_exit_door") {
          var exitFade = Math.max(0, Math.min(1, this.annexExitT || 0));
          this._drawOverlay(0.00, 0.85, 0.10, 0.07 + exitFade * 0.20);
          this._drawOverlay(0.00, 0.00, 0.00, Math.max(0, (exitFade - 0.72) / 0.28) * 0.82);
        }
      }

      if (this.phase === "docking_shake") {
        var shakeAlpha = this.shakeIntensity * 3.0;
        this._drawOverlay(0.02, 0.0, 0.0, Math.min(0.15, shakeAlpha));
      }

      if (this.phase === "descent_shake") {
        var shakeAlpha = this.shakeIntensity * 2.0;
        this._drawOverlay(0.15, 0.0, 0.0, Math.min(0.4, shakeAlpha));
      }

      
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

      try { this._duckAltAnnexMainAudio(false); } catch (e) {}

      if (this.altAnnexNffAudio) {
        try { this.altAnnexNffAudio.pause(); } catch (e) {}
        try { this.altAnnexNffAudio.removeAttribute("src"); this.altAnnexNffAudio.load(); } catch (e) {}
      }

      try {
        if (this.altAnnexNffSource) this.altAnnexNffSource.disconnect();
        if (this.altAnnexNffFilter) this.altAnnexNffFilter.disconnect();
        if (this.altAnnexNffGain) this.altAnnexNffGain.disconnect();
      } catch (e) {}

      if (this.elevatorProg) gl.deleteProgram(this.elevatorProg);
      if (this.stationBgProg) gl.deleteProgram(this.stationBgProg);
      if (this.stationMeshProg) gl.deleteProgram(this.stationMeshProg);
      if (this.cabinPortalProg) gl.deleteProgram(this.cabinPortalProg);
      if (this.cabinPortalOverlayProg) gl.deleteProgram(this.cabinPortalOverlayProg);
      if (this.overlayProg && this.overlayProg.prog) gl.deleteProgram(this.overlayProg.prog);
      if (this.altAnnexFXProg && this.altAnnexFXProg.prog) gl.deleteProgram(this.altAnnexFXProg.prog);
      if (this.postProcessProg) gl.deleteProgram(this.postProcessProg);
      if (this.fallProg) gl.deleteProgram(this.fallProg);

      if (this.fbo) gl.deleteFramebuffer(this.fbo);
      if (this.fboTexture) gl.deleteTexture(this.fboTexture);
      if (this.fboDepth) gl.deleteRenderbuffer(this.fboDepth);
      if (this.cabinPortalFBO) gl.deleteFramebuffer(this.cabinPortalFBO);
      if (this.cabinPortalTexture) gl.deleteTexture(this.cabinPortalTexture);

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
