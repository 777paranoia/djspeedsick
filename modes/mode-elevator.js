window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.elevator_vert = `
attribute vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

GLSL.modules.elevator = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_progress;
uniform float u_walk_angle;
uniform float u_blink;

#define PI 3.141592653589793
#define SURF_DIST 0.02
#define MAX_CITY_STEPS 96
#define MAX_NEAR_STEPS 84
#define MAX_CITY_DIST 220.0
#define MAX_NEAR_DIST 92.0

mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash2(vec2 p){
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

float hash3(vec3 p){
  return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(hash2(i), hash2(i+vec2(1.0,0.0)), f.x),
    mix(hash2(i+vec2(0.0,1.0)), hash2(i+vec2(1.0,1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, -1.3);
    a *= 0.5;
  }
  return v;
}

float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);

  float n000 = hash3(i+vec3(0.0,0.0,0.0));
  float n100 = hash3(i+vec3(1.0,0.0,0.0));
  float n010 = hash3(i+vec3(0.0,1.0,0.0));
  float n110 = hash3(i+vec3(1.0,1.0,0.0));
  float n001 = hash3(i+vec3(0.0,0.0,1.0));
  float n101 = hash3(i+vec3(1.0,0.0,1.0));
  float n011 = hash3(i+vec3(0.0,1.0,1.0));
  float n111 = hash3(i+vec3(1.0,1.0,1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float fbm3(vec3 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){
    v += a * noise3(p);
    p = p * 2.03 + vec3(1.7,-1.3,2.1);
    a *= 0.5;
  }
  return v;
}

float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec2 mapElevator(vec3 p, float carY){
  float d = 1e9;
  float id = 0.0;

  // Cable and guide rails (vertical structure)
  float cable = length(p.xz) - 0.6;
  float r1 = length(p.xz-vec2( 1.5, 0.0)) - 0.1;
  float r2 = length(p.xz-vec2(-1.5, 0.0)) - 0.1;
  float r3 = length(p.xz-vec2( 0.0, 1.5)) - 0.1;
  float r4 = length(p.xz-vec2( 0.0,-1.5)) - 0.1;
  float c = min(cable, min(min(r1,r2), min(r3,r4)));
  if(c < d){ d = c; id = 1.0; }

  // Scaffold rings and beams (repeating along height)
  float sp = 20.0;
  float ly = mod(p.y + sp * 0.5, sp) - sp * 0.5;
  float ring = max(abs(length(p.xz)-1.1)-0.06, abs(ly)-0.12);
  float beam1 = sdBox(vec3(p.x,ly,p.z), vec3(1.5,0.06,0.06));
  float beam2 = sdBox(vec3(p.x,ly,p.z), vec3(0.06,0.06,1.5));
  float s = min(ring, min(beam1, beam2));
  if(s < d){ d = s; id = 2.0; }

  // ── Open platform (wide flat disc) ──
  vec3 cp = p - vec3(0.0, carY, 0.0);
  float rad = length(cp.xz);

  // Main platform body — wide thick disc (radius ~3.4)
  float lowerBody = max(abs(rad-2.4)-1.0, abs(cp.y+0.10)-0.40);
  // Bottom lip / edge ring
  float bottomLip = max(abs(rad-3.3)-0.18, abs(cp.y+0.58)-0.06);
  // Center hub column
  float centerHub = max(abs(rad-0.74)-0.14, abs(cp.y-0.08)-0.22);

  // Railing posts — thin vertical posts at platform outer edge
  float railing = 1e9;
  for(int i=0;i<8;i++){
    float a = float(i) * (PI/4.0);
    vec3 rp = cp - vec3(cos(a)*3.45, 0.50, sin(a)*3.45);
    railing = min(railing, sdBox(rp, vec3(0.025,0.55,0.025)));
  }

  float body = min(min(lowerBody, bottomLip), centerHub);
  body = min(body, railing);
  if(body < d){ d = body; id = 4.0; }

  return vec2(d,id);
}

vec2 mapCity(vec3 p){
  vec2 cell = floor(p.xz * 0.4);
  vec2 local = fract(p.xz * 0.4) - 0.5;
  bool isTarget = (cell.x == 0.0 && cell.y == 0.0);
  float h = isTarget ? 3.0 : (hash2(cell) * 6.0 + 1.0);
  float dFloor = p.y;

  vec3 q = vec3(local.x*2.5, p.y-h*0.5, local.y*2.5);
  float dBldg = sdBox(q, vec3(0.8, h*0.5, 0.8));
  dBldg /= 2.5;
  dBldg = max(dBldg, -(length(p.xz)-4.5));

  float d = min(dFloor, dBldg);
  float id = (d == dFloor) ? ((length(p.xz) < 3.8) ? 7.0 : 5.0) : 6.0;
  return vec2(d,id);
}

vec3 calcNormElevator(vec3 p, float carY){
  vec2 e = vec2(0.02,0.0);
  float d = mapElevator(p,carY).x;
  return normalize(vec3(
    mapElevator(p+e.xyy,carY).x-d,
    mapElevator(p+e.yxy,carY).x-d,
    mapElevator(p+e.yyx,carY).x-d
  ));
}

vec3 calcNormCity(vec3 p){
  vec2 e = vec2(0.012,0.0);
  float d = mapCity(p).x;
  return normalize(vec3(
    mapCity(p+e.xyy).x-d,
    mapCity(p+e.yxy).x-d,
    mapCity(p+e.yyx).x-d
  ));
}

vec3 shadeElevator(vec3 p, vec3 n, vec3 ro, float mid, float altitude){
  vec3 sunDir = normalize(vec3(0.8,0.3,-0.5));
  vec3 viewDir = normalize(ro-p);
  float diff = max(dot(n,sunDir),0.0);
  float spec = pow(max(dot(viewDir,reflect(-sunDir,n)),0.0),24.0);
  float ambient = mix(0.5,0.05,smoothstep(170.0,620.0,altitude));

  vec3 matCol;
  vec3 col;

  if(mid < 1.5){
    matCol = vec3(0.10,0.11,0.14) + vec3(0.02)*smoothstep(0.6,0.7,sin(atan(p.z,p.x)*12.0));
    col = matCol*(ambient+diff*0.8)+vec3(spec)*0.3*smoothstep(260.0,820.0,altitude);
  }else if(mid < 2.5){
    matCol = vec3(0.15,0.17,0.20);
    col = matCol*(ambient+diff*0.8)+vec3(spec)*0.3*smoothstep(260.0,820.0,altitude);
  }else if(mid < 4.5){
    float seam = smoothstep(0.94,1.0,sin(atan(p.z,p.x)*8.0)*0.5+0.5);
    matCol = vec3(0.11,0.12,0.14)+vec3(0.025)*seam;
    col = matCol*(ambient+diff*0.82)+vec3(spec)*0.34*smoothstep(240.0,820.0,altitude);
    float underGlow = smoothstep(0.10,0.0,abs(p.y-floor(p.y/20.0)*20.0-19.2));
    col += vec3(0.95,0.18,0.12)*underGlow*0.14;
  }else if(mid < 5.5){
    // Glass band — handled specially in main, but shade if hit opaquely
    float fres = pow(1.0-max(dot(n,viewDir),0.0),3.5);
    vec3 refl = mix(vec3(0.05,0.07,0.10),vec3(0.42,0.50,0.58),smoothstep(-0.15,0.85,reflect(-viewDir,n).y));
    float band = 0.55+0.45*sin(atan(p.z,p.x)*10.0+p.y*4.0);
    col = mix(vec3(0.015,0.02,0.03),vec3(0.07,0.10,0.14),band*0.5+0.5);
    col += refl*(0.22+fres*0.95);
    col += vec3(spec)*0.55;
    col *= mix(0.65,1.0,diff*0.35+ambient*0.9);
  }else{
    matCol = vec3(0.16,0.17,0.19);
    float ribPulse = 0.5+0.5*sin(u_time*2.0+p.y*3.0);
    col = matCol*(ambient+diff*0.9)+vec3(spec)*0.28;
    col += vec3(0.08,0.22,0.48)*ribPulse*0.12;
  }

  float ledP = fract(p.y*0.12-u_time*1.5);
  float led = smoothstep(0.04,0.0,abs(ledP-0.5))*smoothstep(0.8,0.6,length(p.xz));
  col += vec3(0.08,0.35,0.95)*led*2.5;

  return col;
}

vec3 shadeCity(vec3 p, vec3 n, float mid){
  vec3 col = vec3(0.01,0.01,0.02);

  // Traffic light palette from mode1
  vec3 cGreen = vec3(0.15, 0.9, 0.4);
  vec3 cRed = vec3(0.9, 0.05, 0.15);
  vec3 cAmber = vec3(1.0, 0.5, 0.0);
  float trafficCycle = sin(p.x * 0.4) * 0.5 + 0.5;
  vec3 trafficCol = mix(cGreen, cRed, trafficCycle);

  if(mid < 5.5){
    // Streets / ground
    col = vec3(0.04,0.03,0.02);
    float gridX = smoothstep(0.9,1.0,sin(p.x*PI*0.4));
    float gridZ = smoothstep(0.9,1.0,sin(p.z*PI*0.4));
    col += vec3(1.0,0.6,0.2)*(gridX+gridZ)*0.7;

    // Moving cars — red/white headlights
    float cars = step(0.95,fract(p.x*2.0+u_time*2.0))*gridZ;
    cars += step(0.95,fract(p.z*2.0-u_time*2.5))*gridX;
    col += vec3(1.0,0.2,0.1)*cars;

    // Traffic light color bounce onto streets (from mode1)
    col += trafficCol * smoothstep(2.0, -2.0, p.y) * 0.25 * (gridX + gridZ);

  }else if(mid < 6.5){
    // Building walls
    col = vec3(0.02,0.02,0.03);
    if(abs(n.y) < 0.1){
      // Side faces — dense window grid (mode1 style: 5x10)
      vec2 texUV = (abs(n.x) > abs(n.z)) ? p.zy : p.xy;
      vec2 wg = floor(texUV * vec2(5.0, 10.0));

      // Window on/off per cell (mode1 pattern)
      float won = step(0.75, hash2(wg + floor(p.xz) * 17.0));
      // Flicker — some windows blink (mode1 style)
      float wflick = step(0.94, hash2(vec2(hash2(wg), floor(u_time * 1.5))));
      // Window pixel mask
      float wpx = smoothstep(0.005, 0.0, abs(fract(texUV.x*5.0)-0.5)-0.15)
                 * smoothstep(0.005, 0.0, abs(fract(texUV.y*10.0)-0.5)-0.10);

      // Warm window light
      col += vec3(1.0, 0.75, 0.35) * won * (1.0 - wflick) * wpx * 1.2;
      // Cool blue accent windows
      float blueWin = step(0.92, hash2(wg + 31.0));
      col += vec3(0.3, 0.6, 1.0) * blueWin * won * wpx * 0.8;

      // Traffic light color bounce on lower building walls
      col += trafficCol * smoothstep(2.0, -8.0, p.y) * 0.12;

    }else{
      // Roof
      col = vec3(0.01,0.01,0.015);
      float ac = step(0.9,fract(p.x*2.0)*fract(p.z*2.0));
      col += vec3(0.08)*ac;
      // AC unit / rooftop detail
      float vent = step(0.85, hash2(floor(p.xz * 3.0)));
      col += vec3(0.04, 0.05, 0.06) * vent;
    }
  }else{
    // Target building (helipad)
    col = vec3(0.03);
    if(abs(n.y) > 0.9){
      float dCenter = length(p.xz);
      float ring = smoothstep(0.08,0.0,abs(dCenter-0.8));
      float pulse = 0.5+0.5*sin(u_time*4.0);
      col += vec3(1.0,0.1,0.1)*ring*pulse*2.0;
      float H =
        smoothstep(0.05,0.0,abs(p.x))*step(abs(p.z),0.4)+
        smoothstep(0.05,0.0,abs(p.x-0.4))*step(abs(p.z),0.4)+
        smoothstep(0.05,0.0,abs(p.x+0.4))*step(abs(p.z),0.4)+
        smoothstep(0.05,0.0,abs(p.z))*step(abs(p.x),0.4);
      col += vec3(0.8)*H;
    }else{
      vec2 texUV = (abs(n.x) > abs(n.z)) ? p.zy : p.xy;
      vec2 wg = floor(texUV * vec2(5.0, 10.0));
      float won = step(0.6, hash2(wg + 17.0));
      float wpx = smoothstep(0.005, 0.0, abs(fract(texUV.x*5.0)-0.5)-0.15)
                 * smoothstep(0.005, 0.0, abs(fract(texUV.y*10.0)-0.5)-0.10);
      col += vec3(0.9, 0.2, 0.2) * won * wpx;
    }
  }

  return col;
}

vec3 starField(vec3 rd){
  vec3 col = vec3(0.0);
  vec3 p1 = floor(rd*400.0);
  float r1 = hash3(p1);
  if(r1 > 0.985){
    col += vec3(0.9,0.95,1.0) * (r1-0.985)/0.015 * (0.5+0.5*sin(u_time*(1.0+r1*5.0)));
  }
  vec3 p2 = floor(rd*820.0);
  float r2 = hash3(p2+50.0);
  if(r2 > 0.992){
    col += vec3(0.7,0.75,0.9) * (r2-0.992)/0.008 * 0.35;
  }
  return col;
}

vec3 earthColor(vec3 ro, vec3 rd){
  vec3 stars = starField(rd);
  float earthR = 18000.0;
  float earthCY = 360.0-earthR;
  vec3 center = vec3(0.0,earthCY,0.0);
  vec3 oc = ro-center;
  float b = dot(rd,oc);
  float c = dot(oc,oc)-earthR*earthR;
  float disc = b*b-c;
  if(disc <= 0.0) return stars;

  float t = -b-sqrt(disc);
  if(t <= 0.0) return stars;

  vec3 ep = ro+rd*t;
  vec3 en = normalize(ep-center);
  vec3 np = en;
  np.yz = rot(0.58)*np.yz;
  np.xz = rot(0.82)*np.xz;
  np.xy = rot(-0.24)*np.xy;

  float macroA = fbm3(np*1.7+vec3(4.0,-3.0,1.5));
  float macroB = fbm3(np*3.2+vec3(-2.4,1.2,0.8));
  float macroC = fbm3(np*6.5+vec3(1.1,-0.7,3.6));
  float landField = macroA*0.58+macroB*0.29+macroC*0.13;
  float continent = smoothstep(0.46,0.60,landField);
  float coast = clamp((landField-0.44)/0.16,0.0,1.0);
  float mountain = 1.0-abs(fbm3(np*18.0+vec3(2.0,4.0,-1.0))*2.0-1.0);
  mountain = pow(clamp(mountain,0.0,1.0),2.4)*continent;
  float desert = fbm3(np*9.0+vec3(-1.5,2.0,0.5))*continent;
  float forest = fbm3(np*11.0+vec3(3.0,-1.0,2.5))*continent;
  float waterTint = fbm3(np*12.0+vec3(-3.0,0.5,2.0));

  vec3 deepWater = mix(vec3(0.004,0.02,0.05),vec3(0.01,0.05,0.12),waterTint);
  vec3 shallowWater = mix(vec3(0.02,0.10,0.18),vec3(0.03,0.16,0.24),waterTint);
  vec3 waterCol = mix(deepWater,shallowWater,1.0-coast);

  vec3 greenLand = mix(vec3(0.06,0.11,0.04),vec3(0.16,0.20,0.10),forest);
  vec3 dryLand = mix(vec3(0.18,0.16,0.08),vec3(0.30,0.24,0.13),desert);
  vec3 landCol = mix(greenLand,dryLand,desert*0.75);
  landCol = mix(landCol,vec3(0.35,0.34,0.32),mountain*0.85);

  vec3 earthCol = mix(waterCol,landCol,continent);

  float lat = abs(np.y);
  float ice = smoothstep(0.72,0.93,lat)*(0.45+0.55*fbm3(np*13.0+vec3(1.0,-2.0,3.0)));
  earthCol = mix(earthCol,vec3(0.88,0.91,0.93),clamp(ice,0.0,1.0)*0.85);

  vec3 sunDir = normalize(vec3(0.8,0.3,-0.5));
  float sunAmt = dot(en,sunDir);
  float diff = max(sunAmt,0.0);
  float night = 1.0-smoothstep(-0.04,0.16,sunAmt);

  float cityGlow = smoothstep(0.76,0.89,fbm3(np*45.0+vec3(2.0,-1.0,4.0)))*continent;
  earthCol += vec3(1.0,0.72,0.34)*cityGlow*night*1.35;

  float cloudBase = fbm3(np*7.0+vec3(u_time*0.008,0.0,0.0));
  float cloudDetail = fbm3(np*16.0+vec3(0.0,u_time*0.006,0.0));
  float clouds = smoothstep(0.54,0.70,cloudBase*0.72+cloudDetail*0.28);
  earthCol = mix(earthCol,vec3(0.86,0.89,0.91),clouds*0.72);

  earthCol *= 0.06+diff*1.18;

  float viewDot = max(dot(en,normalize(ro-ep)),0.0);
  float rim = pow(1.0-viewDot,5.5);
  earthCol += vec3(0.12,0.30,0.82)*rim*(0.55+0.25*diff)*1.1;

  return earthCol;
}

float weatherFogRate(float altitude){
  float build = smoothstep(130.0,220.0,altitude)*0.030;
  float storm = smoothstep(220.0,380.0,altitude)*(1.0-smoothstep(620.0,860.0,altitude))*0.110;
  float core = smoothstep(320.0,460.0,altitude)*(1.0-smoothstep(520.0,760.0,altitude))*0.150;
  return 0.018+build+storm+core;
}

vec3 weatherBg(vec3 rd, float altitude, float t){
  float build = smoothstep(120.0,220.0,altitude);
  float storm = smoothstep(240.0,380.0,altitude)*(1.0-smoothstep(620.0,860.0,altitude));
  float core = smoothstep(320.0,460.0,altitude)*(1.0-smoothstep(520.0,760.0,altitude));
  float breakout = smoothstep(720.0,1040.0,altitude);

  float h = clamp(rd.y*0.5+0.5,0.0,1.0);
  vec3 sky = mix(vec3(0.05,0.07,0.10),vec3(0.56,0.64,0.74),pow(h,0.9));
  vec3 stormSky = mix(vec3(0.025,0.030,0.038),vec3(0.11,0.12,0.15),pow(h,0.7));
  vec3 topSky = mix(vec3(0.14,0.19,0.28),vec3(0.42,0.57,0.80),pow(h,0.8));

  vec3 q = normalize(rd+vec3(0.0,0.28,0.0));
  float base = fbm3(q*4.3+vec3(t*0.05,altitude*0.003,-t*0.03));
  float detail = fbm3(q*9.8+vec3(-t*0.08,altitude*0.006,4.0));
  float shelves = fbm3(vec3(rd.x*5.6,rd.y*1.7,rd.z*5.6)+vec3(2.0,t*0.04,-3.0));

  float billow = smoothstep(0.42,0.74,base*0.72+detail*0.28);
  float thick = smoothstep(0.38,0.68,base*0.55+shelves*0.45);

  float lowMask = build*smoothstep(-0.22,0.72,rd.y)*billow;
  float stormMask = storm*smoothstep(-0.35,0.82,rd.y)*thick;
  float coreMask = core*smoothstep(0.46,0.82,base*0.40+detail*0.30+shelves*0.30);

  vec3 lowCol = mix(vec3(0.64,0.69,0.74),vec3(0.86,0.89,0.93),billow);
  vec3 stormCol = mix(vec3(0.06,0.07,0.08),vec3(0.18,0.19,0.22),thick);
  vec3 topCol = mix(vec3(0.76,0.81,0.88),vec3(0.98,1.01,1.06),billow);

  vec3 col = sky;
  col = mix(col,lowCol,lowMask*0.78);
  col = mix(col,stormSky,storm*0.85);
  col = mix(col,stormCol,stormMask*0.82+coreMask*0.95);
  col = mix(col,topSky,breakout*0.70);
  col = mix(col,topCol,breakout*smoothstep(-0.10,0.90,rd.y)*billow*0.55);

  float sunBreak = breakout*smoothstep(0.10,0.95,rd.y)*smoothstep(0.50,0.82,base);
  col += vec3(0.22,0.26,0.32)*sunBreak*0.35;

  return col;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN — first-person on open platform, ascending through city
// ═══════════════════════════════════════════════════════════════

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution.xy) / u_resolution.y;

  float altitude = u_progress * 1100.0;
  float carY = altitude;

  // Camera on platform — track radius orbits with walk_angle
  float trackR = 3.0;
  vec3 ro = vec3(
    cos(u_walk_angle) * trackR,
    carY + 1.8,
    sin(u_walk_angle) * trackR
  );

  // Look direction: outward from platform center, pitched slightly down
  vec3 fwd = normalize(vec3(cos(u_walk_angle), -0.18, sin(u_walk_angle)));

  // Apply mouse look — wide throw
  fwd.xz *= rot(-u_mouse.x * 2.4);
  fwd.y += u_mouse.y * 1.2;
  fwd = normalize(fwd);

  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

  // ── Background by altitude ──
  float spaceBlend = smoothstep(800.0, 1100.0, altitude);
  vec3 bgCol;
  if(spaceBlend > 0.99){
    bgCol = earthColor(ro, rd);
  } else if(spaceBlend < 0.01){
    bgCol = weatherBg(rd, altitude, u_time);
  } else {
    bgCol = mix(weatherBg(rd, altitude, u_time), earthColor(ro, rd), spaceBlend);
  }

  // ── Combined raymarch: elevator + city ──
  float cityVis = 1.0 - smoothstep(400.0, 900.0, altitude);
  float t = 0.0;
  float mid = 0.0;
  bool isCity = false;
  bool didHit = false;

  for(int i = 0; i < MAX_NEAR_STEPS; i++){
    vec3 p = ro + rd * t;
    vec2 hElev = mapElevator(p, carY);
    float dBest = hElev.x;
    float idBest = hElev.y;
    bool cityHit = false;

    if(cityVis > 0.01){
      vec2 hCity = mapCity(p);
      if(hCity.x < dBest){
        dBest = hCity.x;
        idBest = hCity.y + 20.0; // offset city IDs to distinguish
        cityHit = true;
      }
    }

    if(dBest < SURF_DIST){
      mid = idBest;
      isCity = cityHit;
      didHit = true;
      break;
    }
    if(t > MAX_NEAR_DIST) break;
    t += dBest * 0.7;
  }

  // ── Shading ──
  vec3 col = bgCol;

  if(didHit){
    vec3 p = ro + rd * t;

    if(isCity){
      vec2 e = vec2(0.012, 0.0);
      float dc = mapCity(p).x;
      vec3 n = normalize(vec3(
        mapCity(p+e.xyy).x-dc,
        mapCity(p+e.yxy).x-dc,
        mapCity(p+e.yyx).x-dc
      ));
      col = shadeCity(p, n, mid - 20.0);
    } else {
      vec3 n = calcNormElevator(p, carY);
      col = shadeElevator(p, n, ro, mid, altitude);
    }

    // Distance fog
    float fogRate = weatherFogRate(altitude);
    float fog = 1.0 - exp(-t * fogRate);
    col = mix(col, bgCol, fog);
  }

  // ── Post ──
  col *= 1.0 - 0.25 * pow(length(uv * vec2(0.9, 1.0)), 2.0);
  col = 1.0 - exp(-col * 1.10);
  col += vec3(1.0, 0.5, 0.2) * 0.04 * smoothstep(200.0, 0.0, altitude);
  col *= (1.0 - u_blink);

  gl_FragColor = vec4(col, 1.0);
}
`;