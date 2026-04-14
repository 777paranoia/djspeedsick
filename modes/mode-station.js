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
uniform float u_texMix;
uniform vec3 u_flatCol;

varying vec3 v_nor;
varying vec2 v_uv;
varying vec3 v_wpos;

void main(){
  vec3 n=normalize(v_nor);
  float diff=max(dot(n,normalize(u_lightDir)),0.0);
  float amb=0.42;
  vec3 base=mix(u_flatCol, texture2D(u_tex,v_uv).rgb, u_texMix);
  float spec=pow(max(dot(reflect(-normalize(u_lightDir),n),normalize(-v_wpos)),0.0),10.0)*0.12;
  vec3 col=base*(amb+diff*0.68)+spec;
  gl_FragColor=vec4(col,1.0);
}
`;