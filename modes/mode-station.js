window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};
window.GLSL.engine4 = window.GLSL.engine4 || {};

GLSL.engine4.vert_mesh = `
attribute vec3 a_pos;
attribute vec3 a_nor;
attribute vec2 a_uv;
uniform mat4 u_proj;
uniform mat4 u_view;
varying vec3 v_nor;
varying vec2 v_uv;
varying vec3 v_wpos;
void main(){
  v_nor=a_nor;
  v_uv=a_uv;
  v_wpos=a_pos;
  gl_Position=u_proj*u_view*vec4(a_pos,1.0);
}
`;

GLSL.engine4.vert_screen = `
attribute vec2 a_pos;
void main(){
  gl_Position=vec4(a_pos,0.0,1.0);
}
`;

GLSL.engine4.station_bg_core = `
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

#define MAX_STEPS 90
#define MAX_DIST 70.0
#define SURF_DIST 0.001

float hash1(float x){return fract(sin(x*127.1 + 1.9898)*43758.5);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

float noise1(float t){
  float i=floor(t);
  float f=fract(t);
  f=f*f*(3.0-2.0*f);
  return mix(hash1(i),hash1(i+1.0),f);
}

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
  vec2 c = vec2(
    p.x * 0.4 + sin(u_time * 0.07) * 0.3,
    p.y * 0.4 + cos(u_time * 0.05) * 0.3
  );
  vec2 z = vec2(0.0);
  float minDist = 1e10;
  float escapeI = 0.0;
  for(int i = 0; i < 80; i++) {
    z = clamp(vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c, -1000.0, 1000.0);
    float d = min(abs(z.x), abs(z.y));
    if(d < minDist) minDist = d;
    if(dot(z,z) > 100.0){
      escapeI = float(i);
      break;
    }
  }
  return neonPalette(
    fract(clamp(minDist * 8.0, 0.0, 1.0) * 2.0 + u_time * 0.15 + escapeI * 0.01)
  ) * (0.4 + 0.6 * (1.0 - clamp(minDist * 8.0, 0.0, 1.0)));
}

vec2 mapScene(vec3 p){
  vec2 res=vec2(1000.0,-1.0);
  for(float i=0.0; i<2.0; i++){
    float id = 37.0 + i;
    float x = mix(-1.4,  1.4,  hash1(id * 3.1 + 0.13));
    float y = mix( 0.0,  1.6,  hash1(id * 7.3 + 0.27));
    float z = mix( 0.0,  3.5,  hash1(id * 11.7 + 0.41));
    float sc = mix(0.3, 0.6, hash1(id * 13.1)) * 0.7;
    vec3 fp = p - vec3(x,y,z);
    float bound = length(fp) - (sc * 1.5);
    float df = bound;
    if(bound < 0.2){
      df = max(
        bound,
        sdFractal(
          fp/sc,
          mix(6.0,10.0,hash1(id*5.3))+sin(u_time*mix(0.03,0.08,hash1(id*2.1)))*1.5,
          mix(0.05,0.18,hash1(id*9.7))*(hash1(id*4.1)>0.5?1.0:-1.0),
          mix(0.04,0.14,hash1(id*6.3))*(hash1(id*8.9)>0.5?1.0:-1.0)
        ) * sc
      );
    }
    if(df < res.x) res = vec2(df, 10.0);
  }
  return res;
}
`;

GLSL.modules.station_bg = `
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  vec3 ro=u_eye;
  vec3 rd=normalize(u_forward*1.55 + uv.x*u_right + uv.y*u_up);

  vec3 tgt = normalize(u_targetDir);
  vec3 worldUp = vec3(0.0,1.0,0.0);
  vec3 tgtRight = normalize(cross(worldUp, tgt));
  if(length(tgtRight) < 0.001) tgtRight = vec3(1.0,0.0,0.0);
  vec3 tgtUp = normalize(cross(tgt, tgtRight));

  vec3 deepBg = vec3(0.0);
  float star = step(0.9985, hash2(floor(rd.xy*900.0)+floor(rd.z*300.0)));
  deepBg += vec3(0.65,0.72,0.84)*star*0.35;

  float t = 0.0;
  vec2 hit = vec2(0.0);
  for(int i=0; i<MAX_STEPS; i++){
    hit = mapScene(ro + rd * t);
    if(hit.x < SURF_DIST || t > MAX_DIST) break;
    t += hit.x;
  }

  vec3 col = deepBg;
  if(t < MAX_DIST){
    vec3 p = ro + rd * t;
    if(hit.y >= 10.0){
      vec3 fracCol = colorPickover(p);
      col = mix(col, fracCol, 0.28);
    }
  }

  float lx = dot(rd, tgtRight);
  float ly = dot(rd, tgtUp);
  float lz = dot(rd, tgt);
  if(lz > 0.0){
    vec2 plane = vec2(lx, ly) / max(lz, 0.0001);
    float earthRadius = 0.72;
    float d = length(plane);
    if(d < earthRadius){
      vec2 normP = plane / earthRadius;
      vec2 envUV = vec2(
        0.5 + normP.x * 0.44,
        0.50 - normP.y * 0.44 + 0.06
      );
      envUV = vec2(1.0 - envUV.x, 1.0 - envUV.y);
      vec3 earthCol = texture2D(u_env, clamp(envUV, 0.0, 1.0)).rgb;
      float mask = smoothstep(1.0, 0.94, d);
      float rim = smoothstep(0.96, 1.0, 1.0 - d);
      earthCol += vec3(0.10,0.22,0.55) * rim * 0.45;
      col = mix(col, earthCol, mask);
    }
  }

  float vign=1.0-0.22*pow(length(uv*vec2(0.9,1.0)),2.0);
  col*=vign;
  col=1.0-exp(-col*1.10);
  gl_FragColor=vec4(col,1.0);
}
`;

GLSL.modules.station_mesh = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_tex;
uniform vec3 u_lightDir;
uniform vec3 u_eye;
uniform float u_texMix;
uniform float u_useTexAlpha;
uniform vec3 u_flatCol;
uniform vec2 u_screen;
uniform float u_screenSample;
uniform float u_greenKey;

varying vec3 v_nor;
varying vec2 v_uv;
varying vec3 v_wpos;

void main(){
  if(u_screenSample > 0.5){
    // Cabin-portal pass-through: sample the cabin FBO at the portal quad's
    // own UVs (0-1 across the door hole) so the full cabin view is always
    // visible regardless of how far away or how small the portal appears
    // on screen. Screen-space sampling caused a tiny cropped thumbnail
    // when viewed from the annex hallway.
    gl_FragColor = vec4(texture2D(u_tex, v_uv).rgb, 1.0);
    return;
  }
  vec3 n=normalize(v_nor);
  vec3 lDir=normalize(u_lightDir);
  vec3 vDir=normalize(u_eye - v_wpos);
  float diff=max(dot(n,lDir),0.0);
  float hemi=smoothstep(-1.1, 1.2, v_wpos.y);
  float floorGlow=smoothstep(0.18, 0.0, abs(v_wpos.y + 1.02));
  float rim=pow(1.0 - max(dot(n, vDir), 0.0), 2.2);
  vec4 sampled = texture2D(u_tex, v_uv);
  if(u_greenKey > 0.5){
    float greenDom = sampled.g - max(sampled.r, sampled.b);
    if(sampled.g > 0.35 && greenDom > 0.18) discard;
  }
  float alpha = mix(1.0, sampled.a, u_useTexAlpha);
  if(alpha < 0.01) discard;
  vec3 base=mix(u_flatCol, sampled.rgb, u_texMix);
  vec3 amb=vec3(0.18, 0.19, 0.22);
  amb += vec3(0.05, 0.08, 0.12) * hemi;
  amb += vec3(0.10, 0.04, 0.02) * floorGlow;
  float spec=pow(max(dot(reflect(-lDir,n),vDir),0.0),16.0)*0.10;
  vec3 col=base*(amb + diff*vec3(0.52, 0.56, 0.62));
  col += vec3(0.08, 0.12, 0.18) * rim * 0.28;
  col += vec3(0.65, 0.78, 1.0) * spec;
  float dist=length(u_eye - v_wpos);
  float fog=1.0-exp(-dist*0.045);
  vec3 fogCol=vec3(0.02, 0.025, 0.035);
  fogCol += vec3(0.02, 0.03, 0.05) * hemi;
  fogCol += vec3(0.03, 0.015, 0.008) * floorGlow;
  col=mix(col, fogCol, fog * 0.32);
  gl_FragColor=vec4(col, alpha);
}
`;

GLSL.modules.z4_fall = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_fallProgress;
uniform float u_blink;

#ifdef MOBILE
const int MAX_STEPS = 50;
#else
const int MAX_STEPS = 90;
#endif
const float MAX_DIST = 112.0;
const float SURF_DIST = 0.015;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float x) { return fract(sin(x*127.1)*43758.5453); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
               u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for(int i=0; i<5; i++) {
        v += a * noise(p);
        p = rot(0.47) * p * 2.05 + vec2(19.7);
        a *= 0.5;
    }
    return v;
}

vec2 map(vec3 p) {
    vec2 cell = floor(p.xz * 0.4);
    vec2 local = fract(p.xz * 0.4) - 0.5;

    bool isTarget = (cell.x == 0.0 && cell.y == 0.0);
    float h = isTarget ? 3.0 : hash(cell) * 6.0 + 1.0;

    float dFloor = p.y;

    vec3 q = vec3(local.x * 2.5, p.y - h*0.5, local.y * 2.5);
    float dBldg = sdBox(q, vec3(0.8, h*0.5, 0.8));
    dBldg /= 2.5;

    float d = min(dFloor, dBldg);
    float id = (d == dFloor) ? 1.0 : (isTarget ? 3.0 : 2.0);
    return vec2(d, id);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    float d = map(p).x;
    return normalize(vec3(map(p+e.xyy).x-d, map(p+e.yxy).x-d, map(p+e.yyx).x-d));
}

vec4 cloudLayer(vec3 ro, vec3 rd, vec2 screenUV, float fallT) {
    float cloudY = 56.0;
    float tc = (cloudY - ro.y) / rd.y;
    if(tc <= 0.0) return vec4(0.0);

    vec3 cp = ro + rd * tc;
    vec2 cuv = cp.xz * 0.045 + vec2(u_time * 0.018, -u_time * 0.012);
    float body = fbm(cuv);
    float detail = fbm(cuv * 3.4 + 11.0);
    float cloud = smoothstep(0.34, 0.78, body + detail * 0.28);
    float hole = smoothstep(0.30, 0.70, fbm(cuv * 1.7 - 9.0));
    cloud *= mix(0.62, 1.0, hole);

    float early = 1.0 - smoothstep(0.10, 0.32, fallT);
    float cloudOnly = 1.0 - smoothstep(0.035, 0.070, fallT);
    float centerBreak = smoothstep(0.05, 0.48, length(screenUV));
    float alpha = cloud * early * mix(0.78, 0.48, centerBreak);
    alpha = max(alpha, cloudOnly * 0.98);
    vec3 c = mix(vec3(0.74,0.78,0.80), vec3(1.0), detail * 0.45);
    c += vec3(0.10, 0.14, 0.18) * smoothstep(0.25, 0.0, body);
    return vec4(c, clamp(alpha, 0.0, 0.98));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    float startY = 84.0;
    float endY = 3.5;
    float ease = 1.0 - pow(1.0 - u_fallProgress, 2.0);
    float camY = mix(startY, endY, ease);

    vec3 ro = vec3(0.0, camY, 0.0);

    ro.x += sin(u_fallProgress * 6.0) * 3.0 * (1.0 - u_fallProgress);
    ro.z += cos(u_fallProgress * 5.0) * 3.0 * (1.0 - u_fallProgress);

    vec3 fwd = normalize(vec3(0.0, -1.0, 0.0));
    vec3 right = normalize(vec3(1.0, 0.0, 0.0));
    vec3 up = cross(right, fwd);

    float spin = u_fallProgress * 3.1415 * 0.5;
    right.xz *= rot(spin);
    up.xz *= rot(spin);

    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

    rd.xy *= rot(u_mouse.y * 0.2);
    rd.xz *= rot(u_mouse.x * 0.2);

    float t = 0.0;
    float id = 0.0;
    for(int i=0; i<MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 res = map(p);
        if(res.x < SURF_DIST) { id = res.y; break; }
        if(t > MAX_DIST) break;
        t += res.x * 0.7;
    }

    vec3 col = vec3(0.01, 0.01, 0.02);

    if(t < MAX_DIST) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);

        if(id == 1.0) {
            col = vec3(0.04, 0.03, 0.02);
            float gridX = smoothstep(0.9, 1.0, sin(p.x * 3.1415 * 0.4));
            float gridZ = smoothstep(0.9, 1.0, sin(p.z * 3.1415 * 0.4));
            col += vec3(1.0, 0.6, 0.2) * (gridX + gridZ) * 0.7;

            float cars = step(0.95, fract(p.x * 2.0 + u_time * 2.0)) * gridZ;
            cars += step(0.95, fract(p.z * 2.0 - u_time * 2.5)) * gridX;
            col += vec3(1.0, 0.2, 0.1) * cars;

        } else if(id == 2.0) {
            col = vec3(0.02, 0.02, 0.03);
            if (abs(n.y) < 0.1) {
                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);
                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));
                float r = hash(floor(winUV * 3.0) + floor(p.xz));
                if(r > 0.8) col += vec3(0.8, 0.8, 0.6) * win;
                if(r > 0.95) col += vec3(0.4, 0.7, 1.0) * win;
            } else {
                col = vec3(0.01, 0.01, 0.015);
                float ac = step(0.9, fract(p.x*2.0)*fract(p.z*2.0));
                col += vec3(0.1) * ac;
            }
        } else if(id == 3.0) {
            col = vec3(0.03);
            if (abs(n.y) > 0.9) {
                float dCenter = length(p.xz);
                float ring = smoothstep(0.08, 0.0, abs(dCenter - 0.8));

                float pulse = 0.5 + 0.5 * sin(u_time * 4.0);
                col += vec3(1.0, 0.1, 0.1) * ring * pulse * 2.0;

                float H = smoothstep(0.05, 0.0, abs(p.x)) * step(abs(p.z), 0.4) +
                          smoothstep(0.05, 0.0, abs(p.x - 0.4)) * step(abs(p.z), 0.4) +
                          smoothstep(0.05, 0.0, abs(p.x + 0.4)) * step(abs(p.z), 0.4) +
                          smoothstep(0.05, 0.0, abs(p.z)) * step(abs(p.x), 0.4);
                col += vec3(0.8) * H;
            } else {
                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);
                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));
                if(hash(floor(winUV * 3.0) + floor(p.xz)) > 0.5) col += vec3(0.9, 0.2, 0.2) * win;
            }
        }

        col = mix(col, vec3(0.01, 0.015, 0.02), 1.0 - exp(-t * 0.02));
    }

    vec4 clouds = cloudLayer(ro, rd, uv, u_fallProgress);
    col = mix(col, clouds.rgb, clouds.a);

    col += vec3(1.0, 0.5, 0.2) * 0.08 * (1.0 - exp(-t * 0.005));

    float flash = smoothstep(0.15, 0.0, u_fallProgress) + smoothstep(0.64, 0.666, u_fallProgress);
    col = mix(col, vec3(1.0), clamp(flash, 0.0, 1.0));

    gl_FragColor = vec4(col * (1.0 - u_blink), 1.0);
}
`; 
