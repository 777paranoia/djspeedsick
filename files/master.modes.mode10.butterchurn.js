
// MODE LEFT ROOM

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['room_left'] = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1; 
uniform sampler2D u_texEnv2; 
uniform sampler2D u_texEnv3; 
uniform sampler2D u_texEnv4; 
uniform sampler2D u_texEnv6; 
uniform float u_trip;
uniform float u_modeSeed;

float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); }

float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0.0,0.0)), hash2(i + vec2(1.0,0.0)), u.x),
               mix(hash2(i + vec2(0.0,1.0)), hash2(i + vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

vec4 getScreenCol(vec2 tuv) {
    vec4 room = texture2D(u_texEnv1, tuv);
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (!isGreen) return room;

    vec2 bMin, bMax; vec4 finalCol = room;

    if (tuv.x < 0.35) {
        if (tuv.y < 0.45) {
            bMin = vec2(-0.05, 0.25); bMax = vec2(0.40, 0.55);
            finalCol = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        } else {
            bMin = vec2(-0.05, 0.35); bMax = vec2(0.40, 0.65);
            finalCol = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        }
    } else if (tuv.x > 0.43) {
        bMin = vec2(0.35, 0.30); bMax = vec2(0.75, 0.55);
        finalCol = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    } else {
        bMin = vec2(0.25, 0.40); bMax = vec2(0.45, 0.60);
        finalCol = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    }
    return finalCol;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float panRangeX = 300.0 / 1437.0;
    float panRangeY = 300.0 / 2048.0;
    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 643.0 / 2000.0;
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }
    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;

    float t = u_time * 0.1;
    vec2 q = vec2(0.0);
    q.x = fbm(tuv * 5.0 + vec2(0.0, t));
    q.y = fbm(tuv * 5.0 + vec2(t, 0.0));
    vec2 r = vec2(0.0);
    r.x = fbm(tuv * 5.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
    r.y = fbm(tuv * 5.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t);
    tuv += (r - 0.5) * 0.012 * u_trip; 
    tuv = clamp(tuv, 0.0, 1.0);

    float burstSlot = floor(u_time * 12.0); 
    float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed)); 
    float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1)); 
    float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);
    float rndG = hash1(burstSlot + u_modeSeed);
    float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
    vec2 blockUV = floor(tuv * gridSize) / gridSize;
    float blockRnd = hash2(blockUV + floor(u_time * 30.0)); 
    vec2 motionVector = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
    float doMosh = step(0.9, blockRnd) * activeG;
    vec2 moshUV = mix(tuv, fract(blockUV + motionVector * activeG), doMosh);

    vec3 col = getScreenCol(tuv).rgb;
    vec3 moshCol = getScreenCol(moshUV).rgb;
    col = mix(col, moshCol, doMosh);

    float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG; 
    vec3 degradedCol = floor(col * 3.0) / 3.0;
    float tintRnd = hash1(blockRnd * 3.0);
    vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
    col = mix(col, degradedCol * yuvTint, doDegrade);

    float miniGrid = gridSize * 2.0;
    vec2 miniBlockUV = floor(tuv * miniGrid) / miniGrid;
    float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
    float doMini = step(0.95, miniRnd) * activeG; 
    col = mix(col, vec3(col.b, col.r, col.g), doMini); 

    gl_FragColor = vec4(col, 1.0);
}
`;
// MODE - RIGHT ROOM

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['room_right'] = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1; 
uniform sampler2D u_texEnv2; 
uniform sampler2D u_texEnv3; 
uniform sampler2D u_texEnv4; 
uniform sampler2D u_texEnv6; 
uniform sampler2D u_texEnv5; 
uniform float u_trip;
uniform float u_modeSeed; 

float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); } 

float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0.0,0.0)), hash2(i + vec2(1.0,0.0)), u.x),
               mix(hash2(i + vec2(0.0,1.0)), hash2(i + vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

vec4 getScreenCol(vec2 tuv) {
    vec4 room = texture2D(u_texEnv1, tuv);
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (!isGreen) return room;

    vec2 bMin, bMax; vec2 mapUV; vec4 finalCol = room;

    if (tuv.x > 0.55) {
        bMin = vec2(0.50, 0.40); bMax = vec2(0.95, 0.65);
        mapUV = clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0);
        mapUV.y = 1.0 - mapUV.y;
        vec4 mirrorCol = texture2D(u_texEnv5, mapUV);
        finalCol = vec4(mirrorCol.rgb * 3.0, 1.0);
    } else if (tuv.x < 0.26) {
        bMin = vec2(0.00, 0.35); bMax = vec2(0.35, 0.65);
        finalCol = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    } else if (tuv.x < 0.35) {
        bMin = vec2(0.15, 0.40); bMax = vec2(0.40, 0.65);
        finalCol = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    } else {
        if (tuv.y < 0.49) {
            bMin = vec2(0.25, 0.35); bMax = vec2(0.60, 0.55);
            finalCol = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        } else {
            bMin = vec2(0.25, 0.40); bMax = vec2(0.60, 0.65);
            finalCol = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        }
    }
    return finalCol;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float panRangeX = 300.0 / 1243.0;
    float panRangeY = 300.0 / 2048.0;
    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 643.0 / 2000.0;
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }
    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;

    float t = u_time * 0.1;
    vec2 q = vec2(0.0);
    q.x = fbm(tuv * 5.0 + vec2(0.0, t));
    q.y = fbm(tuv * 5.0 + vec2(t, 0.0));
    vec2 r = vec2(0.0);
    r.x = fbm(tuv * 5.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
    r.y = fbm(tuv * 5.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t);
    tuv += (r - 0.5) * 0.012 * u_trip; 
    tuv = clamp(tuv, 0.0, 1.0);

    float burstSlot = floor(u_time * 12.0); 
    float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed)); 
    float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1)); 
    float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);
    float rndG = hash1(burstSlot + u_modeSeed);
    float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
    vec2 blockUV = floor(tuv * gridSize) / gridSize;
    float blockRnd = hash2(blockUV + floor(u_time * 30.0)); 
    vec2 motionVector = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
    float doMosh = step(0.9, blockRnd) * activeG;
    vec2 moshUV = mix(tuv, fract(blockUV + motionVector * activeG), doMosh);

    vec3 col = getScreenCol(tuv).rgb;
    vec3 moshCol = getScreenCol(moshUV).rgb;
    col = mix(col, moshCol, doMosh);

    float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG; 
    vec3 degradedCol = floor(col * 3.0) / 3.0;
    float tintRnd = hash1(blockRnd * 3.0);
    vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
    col = mix(col, degradedCol * yuvTint, doDegrade);

    float miniGrid = gridSize * 2.0;
    vec2 miniBlockUV = floor(tuv * miniGrid) / miniGrid;
    float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
    float doMini = step(0.95, miniRnd) * activeG; 
    col = mix(col, vec3(col.b, col.r, col.g), doMini); 

    gl_FragColor = vec4(col, 1.0);
}
`;
// MODE 0 - FLY INTRO

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.fly = `
void main() {
  vec2 flyUV = gl_FragCoord.xy / u_resolution.xy;
  flyUV.y = 1.0 - flyUV.y;

  float sx=(hash2(vec2(floor(u_time*40.0),1.7))-0.5)*0.020*u_shake;
  float sy=(hash2(vec2(floor(u_time*40.0),8.3))-0.5)*0.016*u_shake;
  if (u_shake > 0.7 && hash1(u_time * 20.0) > 0.5) {
    sx += (hash1(u_time * 12.0) - 0.5) * 0.08;
    sy += (hash1(u_time * 22.0) - 0.5) * 0.08;
  }

  vec3 col = texture2D(u_texEnv1, clamp(flyUV + vec2(sx, sy), 0.0, 1.0)).rgb;

  // Vignette (was applyRoomBlend - function no longer exists in core)
  vec2 vigUV = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  float vig = 1.0 - dot(vigUV * vec2(0.5, 0.7), vigUV * vec2(0.5, 0.7));
  col *= clamp(vig * 1.3, 0.0, 1.0);

  gl_FragColor = vec4(col * (1.0 - u_blink), 1.0);
}
`;
// MODE 2 - CITY

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.city = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, false); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
  
  vec3 cGreen = vec3(0.15, 0.9, 0.4); vec3 cRed = vec3(0.9, 0.05, 0.15); vec3 cAmber = vec3(1.0, 0.5, 0.0); 
  float traffic = smoothstep(0.7, 1.0, sin(rd.x * 6.0 + u_time * 1.5)) * 0.4;
  vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0)) + mix(mix(cGreen, cRed, sin(rd.x * 4.0 + u_time * 0.5) * 0.5 + 0.5), cAmber, traffic) * (noise1(u_time * 0.2 - rd.x * 3.0) * 0.5 + 0.5 + traffic) * smoothstep(0.0, -0.8, rd.y) * 0.6 * 0.8;
  vec3 col = vec3(0.0);
  
  if(t<70.0){
    vec3 p=ro+rd*t;
    vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),false).x-mapScene(p-vec3(0.01,0,0),false).x, mapScene(p+vec3(0,0.01,0),false).x-mapScene(p-vec3(0,0.01,0),false).x, mapScene(p+vec3(0,0,0.01),false).x-mapScene(p-vec3(0,0,0.01),false).x));
    vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy); bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
    col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t)) + mix(cGreen, cRed, sin(p.x * 0.4) * 0.5 + 0.5) * (noise1(u_time * 0.3 + p.x * 0.1) * 0.4 + 0.6 + smoothstep(0.8, 1.0, sin(p.z * 0.8 + u_time * 2.0)) * 0.2) * smoothstep(2.0, -20.0, p.y) * 0.4 * exp(-0.005 * t * t);
  } else col=texture2D(u_texEnv1,fract(rd.xy*0.5+0.5+vec2(u_time*0.002,0.0))).rgb*0.3+skyTone*0.5;

  col += snow(vec2(atan(rd.z,rd.x)*2.0, rd.y*2.0), 15.0, 0.3, 0.3);
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0); 
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + mix(cGreen, cRed, sin(u_time * 0.6) * 0.5 + 0.5) * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.04) * txW.a * 1.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 2 - FRACTAL CITY

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.fractal = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, true); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
  
  vec3 cGreen = vec3(0.15, 0.9, 0.4); vec3 cRed = vec3(0.9, 0.05, 0.15); vec3 cAmber = vec3(1.0, 0.5, 0.0); 
  float traffic = smoothstep(0.7, 1.0, sin(rd.x * 6.0 + u_time * 1.5)) * 0.4;
  vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0)) + mix(mix(cGreen, cRed, sin(rd.x * 4.0 + u_time * 0.5) * 0.5 + 0.5), cAmber, traffic) * (noise1(u_time * 0.2 - rd.x * 3.0) * 0.5 + 0.5 + traffic) * smoothstep(0.0, -0.8, rd.y) * 0.6 * 0.8;
  vec3 col = vec3(0.0);
  
  if(t<70.0){
    vec3 p=ro+rd*t;
    if(hit.y <= 9.0) {
      vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),true).x-mapScene(p-vec3(0.01,0,0),true).x, mapScene(p+vec3(0,0.01,0),true).x-mapScene(p-vec3(0,0.01,0),true).x, mapScene(p+vec3(0,0,0.01),true).x-mapScene(p-vec3(0,0,0.01),true).x));
      vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy); bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
      col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t)) + mix(cGreen, cRed, sin(p.x * 0.4) * 0.5 + 0.5) * (noise1(u_time * 0.3 + p.x * 0.1) * 0.4 + 0.6 + smoothstep(0.8, 1.0, sin(p.z * 0.8 + u_time * 2.0)) * 0.2) * smoothstep(2.0, -20.0, p.y) * 0.4 * exp(-0.005 * t * t);
    } else {
      col = mix(colorPickover(p), skyTone * 0.12, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
    }
  } else col=texture2D(u_texEnv1,fract(rd.xy*0.5+0.5+vec2(u_time*0.002,0.0))).rgb*0.3+skyTone*0.5;

  col += snow(vec2(atan(rd.z,rd.x)*2.0, rd.y*2.0), 15.0, 0.3, 0.3);
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + mix(cGreen, cRed, sin(u_time * 0.6) * 0.5 + 0.5) * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.04) * txW.a * 1.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 3 - BLACK HOLE

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.bh = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 1.0);
  
  vec2 bhUV = rd.xy * 1.2 + vec2(0.5, 0.5); 
  float split = u_shake * 0.025;
  vec3 col = vec3(
    texture2D(u_texEnv1, clamp(bhUV + vec2(split, -split*0.5), 0.001, 0.999)).r, 
    texture2D(u_texEnv1, clamp(bhUV, 0.001, 0.999)).g, 
    texture2D(u_texEnv1, clamp(bhUV - vec2(split, -split*0.5), 0.001, 0.999)).b
  ) + vec3(0.8, 0.9, 1.0) * u_flash * smoothstep(0.3, 0.0, length(rd.xy)) * 1.5;

  float wr = worldRain(gl_FragCoord.xy/u_resolution.xy, u_time);
  col += vec3(0.62,0.72,0.85) * wr * 0.65;

  if (u_flash > 1.2) col = 1.0 - col;

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1){
      float waterH = texture2D(u_water, edgeUV).r; 
      vec2 wNorm = waterNormal(edgeUV);
      vec2 bhUVw = clamp(rd.xy * 1.2 + vec2(0.5, 0.5) + wNorm * (0.020 + u_shake * 0.02), 0.001, 0.999);
      
      vec3 refCol = vec3(
        texture2D(u_texEnv1, clamp(bhUVw + vec2(split, -split*0.5), 0.001, 0.999)).r, 
        texture2D(u_texEnv1, clamp(bhUVw, 0.001, 0.999)).g, 
        texture2D(u_texEnv1, clamp(bhUVw - vec2(split, -split*0.5), 0.001, 0.999)).b
      ) + vec3(0.8, 0.9, 1.0) * u_flash * smoothstep(0.3, 0.0, length(rd.xy)) * 1.5;
      
      refCol += vec3(0.62,0.72,0.85) * wr * 0.65;
      if (u_flash > 1.2) refCol = 1.0 - refCol;

      col = mix(col, refCol, clamp((waterH - 0.12) * 7.0, 0.0, 0.65));
      col = mix(col + vec3(0.62,0.78,1.0) * pow(clamp(dot(normalize(wNorm), normalize(vec2(0.25,0.85))), 0.0, 1.0), 7.0) * waterH * 1.6, col * 0.72, clamp(waterH * 2.6, 0.0, 0.38));
    }
    col=mix(col, txW.rgb * 0.50, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 4 - MIRROR

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.mirror = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  vec3 col = texture2D(u_texEnv1, clamp(vec2(0.5) + vec2(-rd.x, rd.y) * 1.5, 0.0, 1.0)).rgb;
  col = mix(col, vec3(0.05, 0.05, 0.06), 0.3 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15) * mix(0.1, 1.0, sin(u_time * 0.5) * 0.5 + 0.5);
  
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 5 -- OCEAN

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.ocean = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  
  vec2 envUV = vec2(0.5) + vec2(rd.x, -rd.y) * 1.2;
  float t_w = u_time * 0.5; 
  vec2 waveOffset = vec2(sin(envUV.y * 10.0 + t_w) * 0.02 + sin(envUV.y * 25.0 - t_w * 1.5) * 0.01, cos(envUV.x * 8.0 + t_w * 0.8) * 0.015 + cos(envUV.x * 30.0 + t_w * 2.0) * 0.008);
  
  // The Fix: smoothstep(0.45, 0.7, envUV.y) isolates the bottom half of the screen
  vec2 distUV = clamp(envUV + waveOffset * smoothstep(0.45, 0.7, envUV.y), 0.0, 1.0);
  distUV.y = 1.0 - distUV.y; 
  
  vec3 skyTone = texture2D(u_texEnv1, distUV).rgb;
  skyTone = mix(skyTone, vec3(0.01, 0.05, 0.1), 0.2 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15) * mix(0.5, 1.1, sin(u_time * 0.3) * 0.5 + 0.5);
  
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, true); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
  
  vec3 col = skyTone;
  if(t<70.0 && hit.y > 9.0){
    vec3 p=ro+rd*t;
    col = mix(colorPickover(p), skyTone, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
  }

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec4 txW = texture2D(u_texWindow, 1.0 - abs(fract(wuv * 0.5) * 2.0 - 1.0));
    if(wuv.x<0.0||wuv.x>1.0||wuv.y<0.0||wuv.y>1.0){ txW.a=1.0; txW.rgb=mix(vec3(0.01),txW.rgb,0.3); }
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(wuv*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + vec3(0.05, 0.2, 0.4) * (noise1(u_time * 0.5) * 0.1) * txW.a, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.85*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 6 - EARTH

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.earth = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  vec3 col = mix(texture2D(u_texEnv1, clamp(vec2(0.5) + vec2(rd.x, -rd.y) * 1.5, 0.0, 1.0)).rgb, vec3(0.0), 0.1 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15);
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + vec3(0.2, 0.3, 0.4) * (noise1(u_time * 0.5) * 0.1) * txW.a, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.85*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 7 - DEADCITY


window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.deadcity = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0); 
  vec2 bhUV = rd.xy * 1.2 + vec2(0.5, 0.5);
  vec3 col = texture2D(u_texEnv1, clamp(bhUV, 0.001, 0.999)).rgb;
  
  vec4 cTex = texture2D(u_texEnv2, vec2(fract(bhUV.x), 1.0 - clamp(bhUV.y * 1.0 + 0.05, 0.0, 1.0)));
  col = mix(col, cTex.rgb, cTex.a);

  // Flash lives in the world only, applied before window composite
  col += vec3(0.55,0.78,1.0) * u_flash * 0.35;
  
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    
    if(1.0-clamp(txW.a,0.0,1.0)>0.1){
      float waterH = texture2D(u_water, edgeUV).r; vec2 wNorm = waterNormal(edgeUV) * 0.4;
      vec2 bhUVw = clamp(rd.xy * 1.2 + vec2(0.5, 0.5) + wNorm * 0.020, 0.001, 0.999);
      vec3 bgCol = texture2D(u_texEnv1, bhUVw).rgb;
      
      vec4 cTexW = texture2D(u_texEnv2, vec2(fract(bhUVw.x), 1.0 - clamp(bhUVw.y * 1.0 + 0.05, 0.0, 1.0)));
      bgCol = mix(bgCol, cTexW.rgb, cTexW.a);
      
      col = mix(col, bgCol, clamp((waterH - 0.12) * 7.0, 0.0, 0.65));
      col = mix(col + vec3(0.62,0.78,1.0) * pow(clamp(dot(normalize(wNorm), normalize(vec2(0.25,0.85))), 0.0, 1.0), 7.0) * waterH * 1.6, col * 0.72, clamp(waterH * 2.6, 0.0, 0.38));
    }
    // No flash on the window frame — it sits in front of the world
    col=mix(col, txW.rgb * 0.50, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODE 8 - GOREVILLE 


window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.goreville = `
// Gore textures: u_texEnv1=goresky, u_texEnv2=gorebuilding01,
//                u_texEnv3=gorebuilding02, u_texEnv4=gorebuilding03, u_texEnv5=gorewater
uniform sampler2D u_texEnv3;
uniform sampler2D u_texEnv4;
uniform sampler2D u_texEnv5;

vec3 sampleGoreBuilding(float id, vec2 texUV) {
  vec2 uv = abs(fract(texUV * 0.25) * 2.0 - 1.0);
  if (id < 2.5) return texture2D(u_texEnv2, uv).rgb;
  if (id < 4.5) return texture2D(u_texEnv3, uv).rgb;
  return texture2D(u_texEnv4, uv).rgb;
}

float goreRainLayer(vec2 uv, float t, float scale, float speed, float thickness, float density, float slant) {
  vec2 u = uv; u.x *= u_resolution.x / u_resolution.y; u *= scale; u += vec2(slant, 1.0) * t * speed;
  vec2 id = floor(u); vec2 f = fract(u); float n = hash2(id); float on = step(1.0 - density, n);
  float x = f.x - (0.5 + (n - 0.5) * 0.18); float streak = smoothstep(thickness, 0.0, abs(x));
  float seg = hash2(id + 31.41); float gate = smoothstep(0.15, 0.95, fract(f.y + seg));
  return on * streak * gate;
}

float goreRain(vec2 uv, float t) {
  float r = 0.0;
  r += goreRainLayer(uv, t, 18.0, 2.4, 0.004, 0.13, -0.10);
  r += goreRainLayer(uv, t, 30.0, 3.2, 0.003, 0.16, -0.13);
  r += goreRainLayer(uv, t, 48.0, 4.2, 0.002, 0.20, -0.16);
  return clamp(r, 0.0, 1.0);
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  float t = 0.0; vec2 hit = vec2(0.0);
  for(int i = 0; i < 90; i++) { hit = mapScene(ro + rd * t, false); if(hit.x < 0.001 || t > 70.0) break; t += hit.x; }

  vec3 cBlood   = vec3(0.55, 0.0,  0.02);
  vec3 cCrimson = vec3(0.85, 0.04, 0.04);
  vec3 cDark    = vec3(0.02, 0.0,  0.005);

  vec3 skyTone = texture2D(u_texEnv1, fract(rd.xy * 0.5 + 0.5 + vec2(u_time * 0.0008, 0.0))).rgb;
  skyTone = mix(skyTone, cDark, 0.45);
  skyTone += cCrimson * smoothstep(0.1, -0.7, rd.y) * 0.35;

  vec3 col = vec3(0.0);

  if(t < 70.0) {
    vec3 p = ro + rd * t;

    if(hit.y > 19.5) {
      // Floor - tile gorewater
      vec2 floorUV = p.xz * 0.04 + vec2(u_time * 0.005, 0.0);
      vec3 floorCol = texture2D(u_texEnv5, fract(floorUV)).rgb;
      vec2 wn = waterNormal(gl_FragCoord.xy / u_resolution) * 0.3;
      floorCol = mix(floorCol,
        texture2D(u_texEnv5, fract(floorUV + wn * 0.015)).rgb,
        clamp(texture2D(u_water, gl_FragCoord.xy / u_resolution).r * 5.0, 0.0, 0.6));
      floorCol = mix(floorCol, cBlood, 0.35);
      col = mix(floorCol, skyTone, 1.0 - exp(-0.018 * t * t));

    } else {
      vec3 n = normalize(vec3(
        mapScene(p + vec3(0.01,0,0), false).x - mapScene(p - vec3(0.01,0,0), false).x,
        mapScene(p + vec3(0,0.01,0), false).x - mapScene(p - vec3(0,0.01,0), false).x,
        mapScene(p + vec3(0,0,0.01), false).x - mapScene(p - vec3(0,0,0.01), false).x
      ));
      vec3 bTex = sampleGoreBuilding(hit.y, (abs(n.x) > abs(n.y)) ? p.zy : p.xy);
      bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
      col = mix(bTex * 0.18, skyTone, 1.0 - exp(-0.015 * t * t))
          + cBlood * (noise1(u_time * 0.25 + p.x * 0.1) * 0.4 + 0.6)
          * smoothstep(2.0, -20.0, p.y) * 0.38 * exp(-0.005 * t * t);
    }
  } else {
    col = skyTone;
  }

  // Red rain
  float rain = goreRain(gl_FragCoord.xy / u_resolution.xy, u_time);
  col += cCrimson * rain * 0.75;

  // Window overlay with red-shifted neon
  float dWin = (-1.5 - ro.z) / clean_rd.z;
  if(dWin > 0.0) {
    vec3 pW = ro + clean_rd * dWin;
    vec2 wuv = vec2(pW.x * 0.25 + 0.5, 0.5 - pW.y * 0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0 - clamp(txW.a, 0.0, 1.0) > 0.1)
      col = mix(col, vec3(0.45, 0.08, 0.06), hash2(edgeUV * 80.0) * 0.012);
    col = mix(col,
      txW.rgb * 0.5 + cCrimson * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.05) * txW.a * 1.5,
      txW.a);
  }

  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor = vec4(col * (1.0 - u_blink) * 0.80 * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`;
// MODE 9 - PLANE 

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['plane'] = `

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 ab=b-a, ap=p-a;
  return length(ap-ab*clamp(dot(ap,ab)/dot(ab,ab),0.0,1.0))-r;
}
float sdEllipsoid(vec3 p, vec3 r) {
  float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.0)/k1;
}
float smin(float a, float b, float k) {
  float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h);
}

vec2 sdJet(vec3 p) {
  vec2 res=vec2(1e10,-1.0);
  float fuse=sdCapsule(p,vec3(0,0,-5.6),vec3(0,0,3.0),0.40);
  float nose=sdEllipsoid(p-vec3(0,0.02,3.0),vec3(0.24,0.28,1.6));
  float tailc=sdEllipsoid(p-vec3(0,0.06,-5.6),vec3(0.28,0.25,1.2));
  float body=min(fuse,min(nose,tailc));
  if(body<res.x) res=vec2(body,1.0);
  float dih=0.11;
  vec3 pw=vec3(abs(p.x),p.y-abs(p.x)*dih,p.z);
  vec3 wA=pw-vec3(0.50,-0.03,0.25); wA.xz*=rot(-0.06);
  vec3 wB=pw-vec3(1.90,-0.05,-0.25); wB.xz*=rot(-0.16);
  vec3 wC=pw-vec3(4.00,-0.07,-1.05); wC.xz*=rot(-0.25);
  float wing=min(sdBox(wA,vec3(0.40,0.052,0.78)),min(sdBox(wB,vec3(1.18,0.038,0.60)),sdBox(wC,vec3(0.98,0.024,0.40))));
  wing=smin(wing,body,0.16);
  if(wing<res.x) res=vec2(wing,2.0);
  vec3 wl=vec3(abs(p.x)-5.0,p.y-5.0*dih+0.16,p.z+1.3); wl.xy*=rot(0.20);
  float winglet=sdBox(wl,vec3(0.028,0.26,0.20));
  if(winglet<res.x) res=vec2(winglet,2.0);
  float eY=-0.36-1.90*dih;
  vec3 pe=vec3(abs(p.x)-1.90,p.y-eY,p.z);
  float eng=min(sdCapsule(pe,vec3(0,0,0.80),vec3(0,0,0.28),0.26),min(sdCapsule(pe,vec3(0,0,0.28),vec3(0,0,-0.52),0.20),sdEllipsoid(pe-vec3(0,0,0.85),vec3(0.29,0.29,0.09))));
  if(eng<res.x) res=vec2(eng,3.0);
  float pY=-0.19-1.90*dih;
  float pylon=sdBox(vec3(abs(p.x)-1.90,p.y-pY,p.z+0.12),vec3(0.052,0.16,0.50));
  if(pylon<res.x) res=vec2(pylon,2.0);
  vec3 vt=p-vec3(0,0.54,-4.5); vt.yz*=rot(-0.09);
  float vFin=sdBox(vt,vec3(0.034,0.70,0.80));
  if(vFin<res.x) res=vec2(vFin,4.0);
  vec3 hs=vec3(abs(p.x),p.y,p.z)-vec3(0.88,0.13,-5.0); hs.xz*=rot(-0.13);
  float hFin=sdBox(hs,vec3(0.76,0.028,0.34));
  if(hFin<res.x) res=vec2(hFin,4.0);
  return res;
}

vec3 jetNormal(vec3 p) {
  const float e=0.004;
  return normalize(vec3(
    sdJet(p+vec3(e,0,0)).x-sdJet(p-vec3(e,0,0)).x,
    sdJet(p+vec3(0,e,0)).x-sdJet(p-vec3(0,e,0)).x,
    sdJet(p+vec3(0,0,e)).x-sdJet(p-vec3(0,0,e)).x));
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);

  // --- CITY RAYMARCH ---
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ 
    hit=mapScene(ro+rd*t, false); 
    if(hit.x<0.001||t>70.0) break; 
    t+=hit.x; 
  }

  float cityDepth = (t < 70.0) ? t : 9999.0;

  // --- BACKGROUND & SKY ---
  vec3 cGreen = vec3(0.15, 0.9, 0.4); vec3 cRed = vec3(0.9, 0.05, 0.15); vec3 cAmber = vec3(1.0, 0.5, 0.0); 
  float traffic = smoothstep(0.7, 1.0, sin(rd.x * 6.0 + u_time * 1.5)) * 0.4;
  vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0)) + mix(mix(cGreen, cRed, sin(rd.x * 4.0 + u_time * 0.5) * 0.5 + 0.5), cAmber, traffic) * (noise1(u_time * 0.2 - rd.x * 3.0) * 0.5 + 0.5 + traffic) * smoothstep(0.0, -0.8, rd.y) * 0.6 * 0.8;
  vec3 col = vec3(0.0);
  
  if(t<70.0){
    vec3 p=ro+rd*t;
    vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),false).x-mapScene(p-vec3(0.01,0,0),false).x, mapScene(p+vec3(0,0.01,0),false).x-mapScene(p-vec3(0,0.01,0),false).x, mapScene(p+vec3(0,0,0.01),false).x-mapScene(p-vec3(0,0,0.01),false).x));
    vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy); bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
    col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t)) + mix(cGreen, cRed, sin(p.x * 0.4) * 0.5 + 0.5) * (noise1(u_time * 0.3 + p.x * 0.1) * 0.4 + 0.6 + smoothstep(0.8, 1.0, sin(p.z * 0.8 + u_time * 2.0)) * 0.2) * smoothstep(2.0, -20.0, p.y) * 0.4 * exp(-0.005 * t * t);
  } else col=texture2D(u_texEnv1,fract(rd.xy*0.5+0.5+vec2(u_time*0.002,0.0))).rgb*0.3+skyTone*0.5;

  col += snow(vec2(atan(rd.z,rd.x)*2.0, rd.y*2.0), 15.0, 0.3, 0.3);

  // --- PLANE OVERLAY (CRASH SEQUENCE) ---
  // Using u_modeTime for progress. Change 8.0 to your specific interval if needed.
  float rawA = clamp(u_modeTime / 8.0, 0.0, 1.0);
  float approach = pow(rawA, 1.5); // Exponential rush
  
  float close = smoothstep(0.8, 1.0, approach);
  // Ends at 0.1 to collide with camera
  float planeZ = mix(90.0, 0.1, approach);
  // Y lowered to -0.6
  vec3 planePos = vec3(0.0, -0.6, planeZ);

  vec3 oc2=ro-planePos;
  float bB2=dot(rd,oc2), bC2=dot(oc2,oc2)-81.0, disc2=bB2*bB2-bC2;
  bool planeHit=false; float pd=0.01; vec2 pi=vec2(0.0);
  
  if(disc2>=0.0){
    pd=max(-bB2-sqrt(disc2),0.01);
    if (pd < cityDepth) {
      for(int i=0;i<140;i++){
        vec3 lp=(ro+rd*pd-planePos)/1.4;
        vec2 pr=sdJet(lp); pr.x*=1.4;
        if(pr.x<0.003){planeHit=true;pi=pr;break;}
        if(pd > cityDepth || pd > 280.0) break;
        pd+=pr.x*0.78;
      }
    }
  }

  if(planeHit){
    vec3 hp=(ro+rd*pd-planePos)/1.4;
    vec3 n2=jetNormal(hp);
    float partId=pi.y;
    float dih=0.11;

    vec3 cityDir=normalize(vec3(0.1,1.0,0.3));
    vec3 rimDir=normalize(vec3(0.7,0.3,0.5));
    float kCity=max(dot(n2,-cityDir),0.0)*0.7;
    float kTop=max(dot(n2,vec3(0,1,0)),0.0)*0.12;
    float kRim=pow(max(dot(n2,rimDir),0.0),2.5)*0.4;
    float spec=pow(max(dot(reflect(-cityDir,n2),-rd),0.0),60.0)*0.6;

    vec3 baseCol=vec3(0.80,0.82,0.87);
    float belly=smoothstep(0.1,-0.5,hp.y);
    baseCol=mix(baseCol,vec3(0.68,0.55,0.38),belly*0.4);
    float top2=smoothstep(-0.1,0.6,n2.y);
    baseCol=mix(baseCol,vec3(0.65,0.70,0.85),top2*0.10);
    if(partId>2.5&&partId<3.5) baseCol=vec3(0.60,0.62,0.68);
    if(partId>3.5) baseCol=vec3(0.70,0.72,0.78);

    if(partId<1.5){
      float wY=smoothstep(0.055,0.018,abs(hp.y-0.06));
      float wX=step(0.50,fract(hp.z*2.6+0.12));
      float onS=smoothstep(0.09,0.0,abs(abs(hp.x)-0.38));
      float notNose=smoothstep(2.8,2.0,hp.z);
      float isWin=wY*wX*onS*notNose;
      baseCol=mix(baseCol,vec3(0.06,0.06,0.10),isWin*0.7);
      baseCol=mix(baseCol,vec3(0.9,0.78,0.45),isWin*0.3);
      float ckY=smoothstep(0.045,0.0,abs(hp.y-0.20));
      float ckX=step(0.44,fract(hp.z*0.43+0.24))*step(abs(hp.x),0.28);
      float isNose2=smoothstep(2.4,3.4,hp.z);
      baseCol=mix(baseCol,vec3(0.05,0.08,0.06),ckY*ckX*isNose2*0.9);
      float stripe=smoothstep(0.014,0.004,abs(hp.y-0.01))*step(abs(hp.x),0.40)*notNose;
      baseCol=mix(baseCol,vec3(0.10,0.18,0.42),stripe*0.5);
    }
    if(partId>2.5&&partId<3.5){
      float eY2=-0.36-1.90*dih;
      vec3 ep=vec3(abs(hp.x)-1.90,hp.y-eY2,hp.z);
      float rD=length(ep.xy);
      baseCol=mix(baseCol,vec3(0.03,0.03,0.05),smoothstep(0.27,0.15,rD));
      float blades=abs(sin(atan(ep.y,ep.x)*9.0+u_time*8.0))*0.5+0.5;
      baseCol=mix(baseCol,vec3(0.14,0.14,0.17)*blades,smoothstep(0.14,0.04,rD)*step(0.04,rD)*0.7);
      baseCol=mix(baseCol,vec3(0.7,0.35,0.08),smoothstep(0.06,0.0,rD)*0.5);
    }

    vec3 cityCol=mix(cGreen,cRed,sin(hp.x*0.4+u_time*0.3)*0.5+0.5)*0.6+vec3(0.2,0.1,0.0);
    vec3 lit=baseCol*(kCity*cityCol+kTop*vec3(0.2,0.3,0.5)+0.05)+vec3(0.8,0.85,1.0)*(kRim+spec);

    float fog=exp(-pd*0.003);
    col=mix(col,lit,fog);

    float projS=1.0/max((planeZ-ro.z)*1.4,0.1);
    vec2 fUV=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;
    float nGlare=exp(-dot(fUV,fUV)*mix(8000.0,10.0,approach*approach));
    col+=vec3(0.9,0.88,0.80)*nGlare*smoothstep(0.1,0.8,approach)*mix(0.2,5.0,close);
    
    float eY3=-0.6 + (-0.36-1.90*dih); // Adjusted for lower Y
    vec2 eL=fUV-vec2(-1.90*projS,eY3*projS);
    vec2 eR=fUV-vec2( 1.90*projS,eY3*projS);
    float eGlow=exp(-dot(eL,eL)*mix(5000.0,50.0,approach*approach))+exp(-dot(eR,eR)*mix(5000.0,50.0,approach*approach));
    col+=vec3(0.3,0.5,1.0)*eGlow*smoothstep(0.05,0.7,approach)*0.7;
    
    float strobe=step(0.92,fract(u_time*1.4))*smoothstep(0.1,0.5,approach);
    vec2 sPos=fUV-vec2(0.0,(-0.6 + 0.42)*projS); 
    col+=vec3(1.0,0.2,0.1)*exp(-dot(sPos,sPos)*mix(20000.0,500.0,approach*approach))*strobe*0.7;
  }

  // --- WINDOW MASK ---
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0); 
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + mix(cGreen, cRed, sin(u_time * 0.6) * 0.5 + 0.5) * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.04) * txW.a * 1.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
// MODES_CORE

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.vert = `attribute vec2 p; void main(){ gl_Position=vec4(p,0,1); }`;

GLSL.sim = `
precision highp float;
uniform sampler2D u_prev; uniform sampler2D u_window;
uniform vec2 u_resolution; uniform float u_time;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1)*43758.5); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 win = texture2D(u_window, uv);
  float isGlass = 1.0 - clamp(win.a, 0.0, 1.0);
  if(isGlass < 0.1){ gl_FragColor = vec4(0.0); return; }
  vec2 texel = 1.0 / u_resolution;
  float h = texture2D(u_prev, uv).r;
  float band = floor(uv.x * 12.0); float depthRd = hash1(band * 9.17);
  float speedMul = mix(0.55, 1.55, depthRd); float thickMul = mix(0.65, 1.85, depthRd);
  float cols = 36.0 + depthRd * 56.0; float colId = floor(uv.x * cols);
  float colRnd = hash1(colId * 3.7 + 1.3); float colRnd2 = hash1(colId * 7.1 + 5.9);
  float spawnT1 = step(0.935, fract(u_time * (0.12 + colRnd * 0.16) * speedMul + colRnd2 * 13.7));
  float spawnT2 = step(0.965, fract(u_time * (0.08 + colRnd2 * 0.11) * speedMul + colRnd * 7.3));
  float spawnRnd = hash(uv * vec2(1.0, 2.2) + vec2(floor(u_time * (1.7 + colRnd * 1.9)), band * 11.0));
  float newDrop = (spawnT1 + spawnT2) * step(0.62, spawnRnd) * step(0.5, isGlass) * (0.85 + 1.35 * depthRd);
  float flowIn = texture2D(u_prev, uv - vec2(0.0, texel.y * (2.0 + depthRd * 2.0))).r * (0.22 + 0.38 * depthRd);
  float breakup = mix(0.985, 0.965, hash(vec2(colId, floor(u_time*1.2 + depthRd*9.0))));
  float dryPulse = mix(0.00, 0.08, step(0.992, hash(vec2(colId*2.3, floor(u_time*0.8)))));
  h = clamp(h * (0.92 * breakup) + flowIn + newDrop * (0.045 * thickMul), 0.0, 1.0) * (0.989 - dryPulse*0.25);
  h = clamp(h - smoothstep(0.18, 0.88, h) * (0.20 + 0.22 * depthRd), 0.0, 1.0) * isGlass;
  gl_FragColor = vec4(h, 0.0, depthRd, 1.0);
}
`;

GLSL.core = `
precision highp float;
uniform float u_audio; uniform vec2 u_resolution; uniform float u_time;
uniform vec2 u_mouse; uniform float u_blink; uniform float u_flash;
uniform float u_shake; uniform float u_wake; uniform float u_modeSeed;
uniform int u_mode;
uniform float u_isOOB;
uniform float u_modeTime;
uniform float u_trip;

uniform sampler2D u_texB1, u_texB2, u_texB3, u_texB4, u_texB5, u_texB6;
uniform sampler2D u_water; uniform sampler2D u_texWindow; 
uniform sampler2D u_texEnv1; uniform sampler2D u_texEnv2;

#define PI 3.14159265359
float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); }
float noise1(float t){ float i=floor(t); float f=fract(t); f=f*f*(3.0-2.0*f); return mix(hash1(i),hash1(i+1.0),f); }

float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0.0,0.0)), hash2(i + vec2(1.0,0.0)), u.x),
               mix(hash2(i + vec2(0.0,1.0)), hash2(i + vec2(1.0,1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
vec3 neonPalette(float t) { return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.00, 0.33, 0.67))); }

float sdFractal(vec3 p, float power, float rotA, float rotB){
  vec3 z = p; z.xz *= rot(u_time * rotA); z.yz *= rot(u_time * rotB);
  float scale = 1.0; vec3 foldOffset = vec3(0.6) + (vec3(0.15) * sin(u_time * 0.15 + power)) + u_audio * 0.2;
  for(int i=0; i<8; i++){
    z=abs(z); if(z.x<z.y) z.xy=z.yx; if(z.x<z.z) z.xz=z.zx; if(z.y<z.z) z.yz=z.zy;
    z=z*2.0-foldOffset; scale*=2.0;
  }
  return (length(z) - 0.2) / scale;
}

vec3 colorPickover(vec3 p) {
  vec2 c = vec2(p.x * 0.4 + sin(u_time * 0.07) * 0.3, p.y * 0.4 + cos(u_time * 0.05) * 0.3);
  vec2 z = vec2(0.0); float minDist = 1e10; float escapeI = 0.0;
  for(int i = 0; i < 80; i++) {
    z = clamp(vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c, -1000.0, 1000.0);
    float d = min(abs(z.x), abs(z.y)); if(d < minDist) minDist = d;
    if(dot(z,z) > 100.0){ escapeI = float(i); break; }
  }
  return neonPalette(fract(clamp(minDist * 8.0, 0.0, 1.0) * 2.0 + u_time * 0.15 + escapeI * 0.01)) * (0.4 + 0.6 * (1.0 - clamp(minDist * 8.0, 0.0, 1.0)));
}

vec3 colorClifford(vec3 p) {
  float a  =  1.5 + sin(u_time * 0.11) * 0.4; float b  = -1.8 + cos(u_time * 0.07) * 0.3;
  float c2 = -1.9 + sin(u_time * 0.09) * 0.3; float d  =  0.4 + cos(u_time * 0.13) * 0.4;
  float x = p.x * 0.5 + p.z * 0.2; float y = p.y * 0.5 + p.z * 0.1;
  float density = 0.0; float hueAcc = 0.0;
  for(int i = 0; i < 48; i++){
    float nx = sin(a * y) + c2 * cos(a * x); float ny = sin(b * x) + d  * cos(b * y);
    x = nx; y = ny; density += exp(-length(vec2(x, y)) * 0.5); hueAcc  += atan(y, x);
  }
  return neonPalette(fract(hueAcc * 0.05 + u_time * 0.12)) * (0.3 + 0.7 * clamp(density * 0.06, 0.0, 1.0));
}

vec3 fractalAnchor(float id){
  float x = mix(-1.4,  1.4,  hash1(id * 3.1 + 0.13)); 
  float y = mix( 0.0,  1.6,  hash1(id * 7.3 + 0.27)); 
  float z = mix( 0.0,  3.5,  hash1(id * 11.7 + 0.41)); 
  return vec3(x, y, z);
}
float fractalPower(float id){ return mix(6.0, 10.0, hash1(id * 5.3)) + sin(u_time * mix(0.03, 0.08, hash1(id * 2.1))) * 1.5; }
float fractalRotA(float id){ return mix(0.05, 0.18, hash1(id * 9.7))  * (hash1(id * 4.1) > 0.5 ? 1.0 : -1.0); }
float fractalRotB(float id){ return mix(0.04, 0.14, hash1(id * 6.3))  * (hash1(id * 8.9) > 0.5 ? 1.0 : -1.0); }
float fractalScale(float id){ return mix(0.7, 1.2, hash1(id * 13.1)); }
float fractalFogDensity(float id){ return mix(0.006, 0.03, hash1(id * 17.3)); }

float snow(vec2 uv,float size,float speed,float opacity){
  vec2 grid=uv*size; vec2 id=floor(grid); vec2 f=fract(grid)-0.5;
  f.y+=fract(u_time*speed+hash2(id)*15.0)-0.5; f.x+=sin(u_time*0.5+hash2(id)*6.2831)*0.2;
  return smoothstep(.05,0.0,length(f))*hash2(id)*opacity;
}

float worldRainLayer(vec2 uv, float t, float scale, float speed, float thickness, float density, float slant){
  vec2 u = uv; u.x *= u_resolution.x / u_resolution.y; u *= scale; u += vec2(slant, 1.0) * t * speed;
  vec2 id = floor(u); vec2 f  = fract(u); float n = hash2(id); float on = step(1.0 - density, n);
  float x = f.x - (0.5 + (n - 0.5) * 0.18); float streak = smoothstep(thickness, 0.0, abs(x));
  float seg = hash2(id + 19.17); float gate = smoothstep(0.15, 0.95, fract(f.y + seg));
  return on * streak * gate;
}

float worldRain(vec2 uv, float t){
  float r = 0.0;
  r += worldRainLayer(uv, t, 18.0, 1.8, 0.003, 0.10, 0.06);
  r += worldRainLayer(uv, t, 28.0, 2.4, 0.002, 0.13, 0.08);
  r += worldRainLayer(uv, t, 44.0, 3.2, 0.001, 0.16, 0.10);
  return clamp(r, 0.0, 1.0);
}

vec2 mapScene(vec3 p, bool renderFractals){
  vec2 res=vec2(1000.0,-1.0);
  if(u_mode==8){
    float d1=sdBox(p-vec3(-4.5,0.0, 6.0),vec3(1.6,20.0,2.0)); if(d1<res.x) res=vec2(d1,1.0);
    float d2=sdBox(p-vec3(-6.5,0.0,16.0),vec3(2.0,24.0,2.5)); if(d2<res.x) res=vec2(d2,2.0);
    float d3=sdBox(p-vec3(-8.5,0.0,28.0),vec3(2.6,28.0,3.2)); if(d3<res.x) res=vec2(d3,3.0);
    float d4=sdBox(p-vec3( 4.5,0.0, 7.0),vec3(1.6,20.0,2.0)); if(d4<res.x) res=vec2(d4,4.0);
    float d5=sdBox(p-vec3( 6.5,0.0,17.0),vec3(2.0,24.0,2.5)); if(d5<res.x) res=vec2(d5,5.0);
    float d6=sdBox(p-vec3( 8.5,0.0,29.0),vec3(2.6,28.0,3.2)); if(d6<res.x) res=vec2(d6,6.0);
    float floorD=p.y+9.5; if(floorD<res.x) res=vec2(floorD,20.0);
    return res;
  }
  if (u_mode != 6 && u_mode != 7) {
      float d1=sdBox(p-vec3(-3.0,0.0,2.0), vec3(1.2,12.0,1.5)); if(d1<res.x) res=vec2(d1,1.0);
      float d2=sdBox(p-vec3(-4.2,0.0,7.0), vec3(1.2,12.0,1.5)); if(d2<res.x) res=vec2(d2,2.0);
      float d3=sdBox(p-vec3(-5.4,0.0,12.0),vec3(1.2,12.0,1.5)); if(d3<res.x) res=vec2(d3,3.0);
      float d4=sdBox(p-vec3( 3.0,0.0,2.5), vec3(1.2,12.0,1.5)); if(d4<res.x) res=vec2(d4,4.0);
      float d5=sdBox(p-vec3( 4.2,0.0,7.5), vec3(1.2,12.0,1.5)); if(d5<res.x) res=vec2(d5,5.0);
      float d6=sdBox(p-vec3( 5.4,0.0,12.5),vec3(1.2,12.0,1.5)); if(d6<res.x) res=vec2(d6,6.0);
  }
  if(renderFractals){
    float seed = u_modeSeed; float num = floor(hash1(seed * 31.1) * 1.5) + 1.0; 
    for(float i=0.0; i<2.0; i++){ 
      if(i >= num) break;
      float id = seed * 7.0 + i; 
      float sc = mix(0.3, 0.6, hash1(id * 13.1)) * 0.7; 
      vec3 a = vec3(mix(-1.4,1.4,hash1(id*3.1+0.13)), mix(0.0,1.6,hash1(id*7.3+0.27)), mix(0.0,3.5,hash1(id*11.7+0.41)));
      vec3 fp = p - a; float bound = length(fp) - (sc * 1.5); float df = bound;
      
      if(bound < 0.2) df = max(bound, sdFractal(fp/sc, mix(6.0,10.0,hash1(id*5.3))+sin(u_time*mix(0.03,0.08,hash1(id*2.1)))*1.5, mix(0.05,0.18,hash1(id*9.7))*(hash1(id*4.1)>0.5?1.0:-1.0), mix(0.04,0.14,hash1(id*6.3))*(hash1(id*8.9)>0.5?1.0:-1.0)) * sc);
      if(df < res.x) res = vec2(df, 10.0);
    }
  }  
  return res;
}

vec3 sampleBuilding(float id,vec2 texUV){
  vec2 uv=abs(fract(texUV*0.25)*2.0-1.0);
  if(u_mode==8){
    if(id<2.5) return texture2D(u_texB1,uv).rgb;
    if(id<4.5) return texture2D(u_texB2,uv).rgb;
    return texture2D(u_texB3,uv).rgb;
  }
  if(id<1.5) return texture2D(u_texB1,uv).rgb; if(id<2.5) return texture2D(u_texB2,uv).rgb;
  if(id<3.5) return texture2D(u_texB3,uv).rgb; if(id<4.5) return texture2D(u_texB4,uv).rgb;
  if(id<5.5) return texture2D(u_texB5,uv).rgb; return texture2D(u_texB6,uv).rgb;
}

vec2 waterNormal(vec2 uv){
  vec2 texel = 1.0 / u_resolution;
  float hL = texture2D(u_water, uv - vec2(texel.x, 0.0)).r; float hR = texture2D(u_water, uv + vec2(texel.x, 0.0)).r;
  float hD = texture2D(u_water, uv - vec2(0.0, texel.y)).r; float hU = texture2D(u_water, uv + vec2(0.0, texel.y)).r;
  return vec2(hL - hR, hD - hU) * 7.0;
}

// PURE DATAMOSH / PIXEL DAMAGE LOGIC
vec3 digitalGlitch(vec3 col, vec2 uv) {
  float burstSlot = floor(u_time * 12.0); 
  float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed)); 
  float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1)); 
  float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);
  
  if (activeG < 0.01) return col;

  float rndG = hash1(burstSlot + u_modeSeed);
  float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
  
  vec2 blockUV = floor(uv * gridSize) / gridSize;
  float blockRnd = hash2(blockUV + floor(u_time * 30.0)); 
  
  vec2 motionVector = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
  vec2 moshUV = fract(blockUV + motionVector * activeG);
  
  vec3 moshCol = texture2D(u_texEnv1, moshUV).rgb;
  
  float doMosh = step(0.9, blockRnd) * activeG;
  col = mix(col, moshCol, doMosh);
  
  float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG; 
  vec3 degradedCol = floor(col * 3.0) / 3.0;
  
  float tintRnd = hash1(blockRnd * 3.0);
  vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
  col = mix(col, degradedCol * yuvTint, doDegrade);

  float miniGrid = gridSize * 2.0;
  vec2 miniBlockUV = floor(uv * miniGrid) / miniGrid;
  float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
  float doMini = step(0.95, miniRnd) * activeG; 
  
  col = mix(col, vec3(col.b, col.r, col.g), doMini); 

  return col;
}

void setupCamera(out vec3 ro, out vec3 rd, out vec3 clean_rd, float intensity) {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  
  float t = u_time * 0.15;
  vec2 q = vec2(0.0);
  q.x = fbm(uv * 2.0 + vec2(0.0, t));
  q.y = fbm(uv * 2.0 + vec2(t, 0.0));

  vec2 r = vec2(0.0);
  r.x = fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
  r.y = fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t);

  float liqAmp = mix(0.06, 0.16, u_isOOB) * u_trip;
  uv += (r - 0.5) * liqAmp; 

  float mt = u_modeTime * u_isOOB;
  
  // --- THE LUCID SNAP ---
  float w1 = sin(mt * 0.4 + u_modeSeed);
  float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
  float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
  float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
  float snap = pow(surge, 2.0) * 12.0 * u_isOOB;
  // ----------------------

  uv *= 1.0 + mt * 0.005 + (snap * 0.02); 

  float gTick = floor(u_time * 16.0); 
  if (step(0.979, hash1(gTick * 133.77)) > 0.0) uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5) * 0.21; 
  
  vec2 m = u_mouse * 0.35; 
  ro = vec3(0.0, 0.0, -4.5); 
  
  ro.y += mt * 0.03 + snap * 0.15;
  ro.z -= mt * 0.08 + snap;
  
  rd = normalize(vec3(uv, 1.4));
  
  rd.xy *= rot((sin(mt * 0.05) * 0.08 + snap * 0.005) * u_isOOB);
  
  float groggy = 1.0 - u_wake; ro.y -= groggy * 1.2;
  rd.yz *= rot(groggy * 0.4); rd.xz *= rot(groggy * -0.3); rd.xy *= rot(groggy * 0.2);
  rd.yz *= rot(m.y * 0.8); rd.xz *= rot(m.x * 1.0);
  
  if (intensity > 0.0) {
      float sx=(hash2(vec2(floor(u_time*40.0),1.7))-0.5)*0.020*u_shake*intensity;
      float sy=(hash2(vec2(floor(u_time*40.0),8.3))-0.5)*0.016*u_shake*intensity;
      if (u_shake > 0.7 && hash1(u_time * 20.0) > 0.5) { sx += (hash1(u_time * 12.0) - 0.5) * 0.08 * intensity; sy += (hash1(u_time * 22.0) - 0.5) * 0.08 * intensity; }
      rd.xz*=rot(sx); rd.yz*=rot(sy);
  }
  
  clean_rd = rd;
  
  if (intensity > 0.0) {
      float warp = (0.06 + hash1(u_time * 50.0) * u_shake * 0.08 * intensity) / (length(rd.xy) + 0.05) * intensity; 
      rd.xy *= rot(warp * (1.5 + u_shake * 0.5)); rd.xy -= normalize(rd.xy) * (warp * (0.4 + u_shake * 0.3)); rd = normalize(rd); 
  }
}
`;
