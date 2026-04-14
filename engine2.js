((window.GLSL = window.GLSL || {}),
        (window.GLSL.modules = window.GLSL.modules || {}),
        (GLSL.modules.zone2_hallway =
          "\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\nuniform vec2 u_resolution;\nuniform float u_time;\nuniform vec2 u_mouse;\nuniform float u_camZ;\nuniform float u_blink;\nuniform float u_shake; \nuniform float u_isWalking;\nuniform float u_trip;\nuniform float u_yawOffset;\n\nuniform sampler2D u_texFront;\nuniform sampler2D u_texBack;\nuniform sampler2D u_texLeft;\nuniform sampler2D u_texRight;\nuniform sampler2D u_texTop;\nuniform sampler2D u_texBottom;\nuniform sampler2D u_texDoorLeft;\n#ifdef MOBILE\n#define u_texDoorRight u_texDoorLeft\n#else\nuniform sampler2D u_texDoorRight;\n#endif\nuniform sampler2D u_voidVid;    \n\nmat2 rot(float a) {\n    float s = sin(a), c = cos(a);\n    return mat2(c, -s, s, c);\n}\nfloat _hh(float x){ return fract(sin(x*127.1)*43758.5453); }\nfloat _hh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n\nvoid main() {\n    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;\n    float trip = clamp(u_trip, 0.0, 2.0);\n    \n    float warpAmp = 0.004 + trip * 0.012;\n    float liquidX = sin(uv.y * 12.0 + u_time * 0.4) * warpAmp + cos(uv.x * 10.0 - u_time * 0.3) * warpAmp * 0.75;\n    float liquidY = cos(uv.x * 14.0 + u_time * 0.3) * warpAmp + sin(uv.y * 11.0 - u_time * 0.4) * warpAmp * 0.75;\n    liquidX += sin(u_time * 30.0) * 0.01 * u_shake;\n    liquidY += cos(u_time * 25.0) * 0.01 * u_shake;\n    liquidX += sin(uv.y * 3.0 + u_time * 0.15) * trip * 0.008;\n    liquidY += cos(uv.x * 4.0 - u_time * 0.12) * trip * 0.006;\n    \n    float gTick = floor(u_time * 14.0);\n    float glitchProb = 0.985 - trip * 0.04;\n    if(step(glitchProb, _hh(gTick * 133.77)) > 0.0) {\n        float bandY = floor(uv.y * mix(8.0, 25.0, _hh(gTick * 2.1)));\n        liquidX += (_hh(bandY + gTick) - 0.5) * 0.15 * trip;\n    }\n\n    vec3 box = vec3(0.5625, 1.0, 3.5); \n    \n    float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;\n    float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;\n    vec3 ro = vec3(bobX, bobY, u_camZ);\n    vec3 rd = normalize(vec3(uv.x + liquidX, uv.y + liquidY, 1.6));\n    \n    vec2 m = u_mouse * 0.35;\n    rd.yz *= rot(m.y * 0.8);\n    rd.xz *= rot(m.x + u_yawOffset);\n    \n    vec3 safeRd = max(abs(rd), vec3(0.0001)) * sign(rd);\n    vec3 tPos = (box * sign(safeRd) - ro) / safeRd;\n    float t = min(min(tPos.x, tPos.y), tPos.z);\n    vec3 pos = ro + rd * t;\n    vec3 nPos = pos / box;\n    vec3 absPos = abs(nPos);\n    \n    vec4 hallTex;\n    vec2 tileUV;\n    int wallID = -1;\n    if (absPos.x > absPos.y && absPos.x > absPos.z) {\n        if (nPos.x > 0.0) { \n            tileUV = vec2(-nPos.z, -nPos.y) * 0.5 + 0.5;\n            hallTex = texture2D(u_texRight, tileUV);\n            wallID = 1;\n        } else { \n            tileUV = vec2(nPos.z, -nPos.y) * 0.5 + 0.5;\n            hallTex = texture2D(u_texLeft, tileUV);\n            wallID = 0;\n        }\n    } else if (absPos.y > absPos.x && absPos.y > absPos.z) {\n        wallID = 4;\n        if (nPos.y > 0.0) { \n            tileUV = vec2(nPos.x, -nPos.z) * 0.5 + 0.5;\n            hallTex = texture2D(u_texTop, tileUV);\n        } else { \n            tileUV = vec2(nPos.x, nPos.z) * 0.5 + 0.5;\n            hallTex = texture2D(u_texBottom, tileUV);\n        }\n    } else {\n        if (nPos.z > 0.0) { \n            tileUV = vec2(nPos.x, -nPos.y) * 0.5 + 0.5;\n            hallTex = texture2D(u_texFront, tileUV);\n            wallID = 2;\n        } else { \n            tileUV = vec2(-nPos.x, -nPos.y) * 0.5 + 0.5;\n            hallTex = texture2D(u_texBack, tileUV);\n            wallID = 3;\n        }\n    }\n    \n    vec3 finalCol = hallTex.rgb;\n    bool isCutout = hallTex.a < 0.1 || (hallTex.g > 0.4 && hallTex.r < 0.25 && hallTex.b < 0.25);\n    float outAlpha = 1.0;\n    \n    bool isVideoPortal = false;\n    if (isCutout && wallID != 4) {\n        vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n        if (wallID == 2) {\n            vec2 portalMin = vec2(0.2939, 0.2876);\n            vec2 portalMax = vec2(0.7070, 0.7119);\n            vec2 puv = clamp((tileUV - portalMin) / (portalMax - portalMin), 0.0, 1.0);\n            finalCol = texture2D(u_voidVid, puv).rgb;\n            outAlpha = 1.0;\n            isVideoPortal = true;\n        } else if (wallID == 0) {\n            finalCol = vec3(0.04, 0.03, 0.03);\n        } else if (wallID == 1) {\n            finalCol = vec3(0.03, 0.03, 0.05);\n        }\n    }\n    \n    if (wallID == 4 && isCutout) finalCol = vec3(0.0);\n    \n    if (!isVideoPortal) {\n        float fogThickness = 0.5 + trip * 0.15;\n        float fogFactor = exp(-t * fogThickness);\n        vec3 fogColor = vec3(0.02, 0.03, 0.04);\n        fogColor = mix(fogColor, vec3(0.04, 0.03, 0.01), trip * 0.3);\n        finalCol = mix(fogColor, finalCol, fogFactor);\n    }\n    \n    float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));\n    vec3 eerieTint = vec3(lum * 0.75, lum * 0.9, lum * 1.1); \n    finalCol = mix(finalCol, eerieTint, 0.4 + trip * 0.15);\n    \n    float floorGlow = smoothstep(-0.3, -0.8, nPos.y) * (0.4 + 0.6 * sin(u_time * 1.3 + pos.z * 0.4));\n    finalCol += vec3(0.08, 0.01, 0.005) * floorGlow * (0.3 + trip * 0.4);\n    \n    float flicker = 1.0 - step(0.97, _hh(floor(u_time * 12.0) * 7.3)) * 0.3 * trip;\n    finalCol *= flicker;\n\n    float vignette = smoothstep(1.3, 0.2, length(uv));\n    finalCol *= vignette;\n    finalCol *= 0.65;\n    \n    gl_FragColor = vec4(finalCol * (1.0 - u_blink), outAlpha);\n}\n"),
        GLSL.modules.z2_seq_hole ||
          (GLSL.modules.z2_seq_hole =
            "\n    precision mediump float;\n    uniform vec2 u_resolution;\n    uniform sampler2D u_tex;\n    void main() {\n        vec2 uv = gl_FragCoord.xy / u_resolution;\n        gl_FragColor = texture2D(u_tex, uv);\n    }\n    "),
        GLSL.modules.z3_alt_blackhole_walk ||
          (GLSL.modules.z3_alt_blackhole_walk =
            "\nprecision highp float;\n\nuniform vec2  u_resolution;\nuniform float u_time;\nuniform float u_yaw;\nuniform float u_pitch;\nuniform vec3  u_camPos;\nuniform float u_movePhase;\nuniform float u_speed;\nuniform float u_seed;\nuniform float u_audio;\nuniform float u_trip;\nuniform sampler2D u_texGround;\n\nconst int   MARCH_STEPS = 96;\nconst int   BEND_STEPS  = 26;\nconst float FAR_CLIP    = 14000.0;\nconst float EPS         = 0.045;\n\nconst vec3  BH_CENTER   = vec3(0.0, 0.0, -3200.0);\nconst float BH_RADIUS   = 520.0;\n\nmat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }\nfloat hash1(float p){ return fract(sin(p*127.1)*43758.5453123); }\nfloat hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }\nfloat hash3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,191.999)))*43758.5453123); }\n\nfloat noise3(vec3 p){\n  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);\n  float n000=hash3(i); float n100=hash3(i+vec3(1,0,0));\n  float n010=hash3(i+vec3(0,1,0)); float n110=hash3(i+vec3(1,1,0));\n  float n001=hash3(i+vec3(0,0,1)); float n101=hash3(i+vec3(1,0,1));\n  float n011=hash3(i+vec3(0,1,1)); float n111=hash3(i+vec3(1,1,1));\n  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),\n             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);\n}\n\nvec3 camForward(float yaw, float pitch){\n  vec3 f=vec3(0,0,-1); f.xz*=rot(yaw); f.yz*=rot(pitch); return normalize(f);\n}\nvec3 camRight(vec3 fwd){ return normalize(cross(fwd,vec3(0,1,0))); }\nvec3 camUp(vec3 fwd, vec3 right){ return normalize(cross(right,fwd)); }\n\nfloat pathCenterX(float z){\n  float k = clamp((-z-50.0)/2800.0, 0.0, 1.0);\n  return sin(z*0.00165+0.7)*22.0*k + sin(z*0.006+1.8)*3.5;\n}\nfloat pathCenterY(float z){\n  return -1.25 + smoothstep(-2400.0, -3100.0, z) * 30.0;\n}\nfloat pathHalfWidth(float z){\n  float t = clamp((-z-20.0)/3300.0, 0.0, 1.0);\n  return mix(1.3, 18.0, t*t);\n}\n\nvec3 groundColor(vec3 hp, vec3 ro){\n  float flowZ = hp.z + u_movePhase * mix(28.0, 64.0, clamp(u_speed,0.0,1.5));\n  vec2 guv = vec2(hp.x*0.12+0.5, fract(flowZ*0.035));\n  vec3 tex = texture2D(u_texGround, guv).rgb;\n  float dist = length(hp-ro);\n  tex *= exp(-dist*0.004) * 0.50;\n  float cx = pathCenterX(hp.z);\n  float hw = pathHalfWidth(hp.z);\n  float edge = abs(hp.x-cx)/max(hw,0.001);\n  tex *= 1.0 - smoothstep(0.80, 1.02, edge);\n  float seg = 1.0-smoothstep(0.0,0.18,abs(fract((flowZ+1000.0)*0.060)-0.5));\n  tex += vec3(0.10,0.11,0.16)*seg*(1.0-smoothstep(0.0,0.10,abs(hp.x-cx)))*u_speed*0.5;\n  tex += vec3(0.07,0.04,0.02)*smoothstep(-600.0,-2800.0,hp.z)*exp(-dist*0.004)*0.3;\n  tex += vec3(0.06,0.07,0.12)*smoothstep(-2800.0,-3200.0,hp.z)*0.24;\n  return tex;\n}\n\nvec3 cosmos(vec3 rd, vec3 ro){\n  vec3 d=normalize(rd); vec3 col=vec3(0.0);\n  vec3 p1=normalize(d*900.0+ro*0.012);\n  vec3 p2=normalize(d*1600.0+ro*0.020+vec3(17.3,-9.1,5.7));\n  col += vec3(0.80,0.86,0.96)*smoothstep(0.9982,1.0,hash3(floor(p1*320.0)+u_seed*0.01))*(0.65+u_audio*0.30);\n  col += vec3(0.72,0.76,0.92)*smoothstep(0.9993,1.0,hash3(floor(p2*520.0)+u_seed*0.007))*0.35;\n  vec3 neb=d*7.0+ro*vec3(0.0007,0.0003,0.0009);\n  float band=smoothstep(0.42,0.0,abs(d.y+sin(d.x*2.4+ro.z*0.0002)*0.16));\n  col += vec3(0.10,0.13,0.22)*noise3(neb+vec3(0,u_time*0.005,0))*band*0.90;\n  col += vec3(0.08,0.10,0.18)*noise3(neb*1.9+vec3(4.2,-2.3,7.7))*band*0.70;\n  col += vec3(0.04,0.06,0.12)*noise3(neb*0.8+vec3(-3.4,2.0,-6.1))*band*0.55;\n  col += vec3(0.05,0.07,0.12)*smoothstep(0.85,-0.10,d.y)*0.50;\n  return col;\n}\n\nvec3 neonPalette(float t){\n  return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.00,0.33,0.67)));\n}\n\nfloat sdVoidFractal(vec3 p, float power, float rotA, float rotB){\n  vec3 z=p; z.xz*=rot(u_time*rotA); z.yz*=rot(u_time*rotB);\n  float scale=1.0;\n  vec3 foldOffset=vec3(0.6)+(vec3(0.15)*sin(u_time*0.15+power))+u_audio*0.2;\n  for(int i=0;i<8;i++){\n    z=abs(z); if(z.x<z.y) z.xy=z.yx; if(z.x<z.z) z.xz=z.zx; if(z.y<z.z) z.yz=z.zy;\n    z=z*2.0-foldOffset; scale*=2.0;\n  }\n  return (length(z)-0.2)/scale;\n}\n\nvec3 colorPickoverVoid(vec3 p){\n  vec2 c=vec2(p.x*0.4+sin(u_time*0.07)*0.3, p.y*0.4+cos(u_time*0.05)*0.3);\n  vec2 z=vec2(0.0); float minDist=1e10; float escapeI=0.0;\n  for(int i=0;i<80;i++){\n    z=clamp(vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c,-1000.0,1000.0);\n    float d=min(abs(z.x),abs(z.y)); if(d<minDist) minDist=d;\n    if(dot(z,z)>100.0){escapeI=float(i); break;}\n  }\n  return neonPalette(fract(clamp(minDist*8.0,0.0,1.0)*2.0+u_time*0.15+escapeI*0.01))\n       *(0.4+0.6*(1.0-clamp(minDist*8.0,0.0,1.0)));\n}\n\nvec3 marchVoidFractal(vec3 ro, vec3 rd, vec3 fracPos, float fracScale, float power, float rotA, float rotB){\n  vec3 lro=(ro-fracPos)/fracScale;\n  vec3 lrd=rd;\n  float boundR=1.8;\n  vec3 oc=lro;\n  float b=dot(oc,lrd); float c_=dot(oc,oc)-boundR*boundR;\n  float disc=b*b-c_;\n  if(disc<0.0) return vec3(0.0);\n  float t=max(0.0,-b-sqrt(disc));\n  for(int i=0;i<50;i++){\n    vec3 p=lro+lrd*t;\n    if(length(p)>boundR+0.5) break;\n    float d=sdVoidFractal(p,power,rotA,rotB);\n    if(d<0.003){\n      vec3 e=vec3(0.003,0.0,0.0);\n      vec3 n=normalize(vec3(\n        sdVoidFractal(p+e.xyy,power,rotA,rotB)-sdVoidFractal(p-e.xyy,power,rotA,rotB),\n        sdVoidFractal(p+e.yxy,power,rotA,rotB)-sdVoidFractal(p-e.yxy,power,rotA,rotB),\n        sdVoidFractal(p+e.yyx,power,rotA,rotB)-sdVoidFractal(p-e.yyx,power,rotA,rotB)\n      ));\n      vec3 matCol=colorPickoverVoid(p);\n      float diff=max(dot(n,normalize(vec3(0.2,1.0,0.5))),0.0)*0.7+0.15;\n      float fres=pow(1.0-max(dot(-lrd,n),0.0),3.0);\n      vec3 col=matCol*diff+neonPalette(fract(u_time*0.08+p.y*0.5))*fres*0.3;\n      col*=exp(-t*fracScale*0.003);\n      return col;\n    }\n    t+=d*0.7;\n    if(t>boundR*3.0) break;\n  }\n  return vec3(0.0);\n}\n\n\nvec3 accretionGlow(vec3 p, float closestR){\n  vec3 rel=p-BH_CENTER; float r=length(rel); float plane=abs(rel.y); float ringR=length(rel.xz);\n  float disk=exp(-plane*0.085)*smoothstep(BH_RADIUS*2.6,BH_RADIUS*1.08,ringR)*smoothstep(BH_RADIUS*1.02,BH_RADIUS*1.30,ringR);\n  float swirl=0.55+0.45*sin(atan(rel.z,rel.x)*7.0-u_time*0.8+ringR*0.008);\n  float turb=noise3(rel*vec3(0.006,0.03,0.006)+vec3(0,u_time*0.03,0));\n  vec3 glow=mix(vec3(1.02,0.42,0.12),vec3(1.05,0.63,0.26),smoothstep(BH_RADIUS*1.15,BH_RADIUS*2.2,ringR))*disk*(0.72+0.48*swirl+0.30*turb);\n  glow+=vec3(0.34,0.40,0.76)*exp(-abs(r-BH_RADIUS*1.55)*0.022)*smoothstep(0.7,0.0,plane*0.05)*(0.22+u_audio*0.12);\n  glow+=vec3(0.10,0.12,0.24)*disk*smoothstep(BH_RADIUS*4.2,BH_RADIUS*1.0,closestR)*0.08;\n  return glow*(0.013+u_audio*0.006+u_trip*0.003);\n}\n\nvoid main(){\n  vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;\n\n  float liqAmp = 0.10 * u_trip;\n  if(liqAmp > 0.001){\n    float tw=u_time*0.15;\n    vec2 q=vec2(noise3(vec3(uv*2.0, tw)), noise3(vec3(uv*2.0+vec2(tw,0.0), tw)));\n    float n3=noise3(vec3(uv*2.0+2.0*q+vec2(1.7,9.2), tw*0.6));\n    float n4=noise3(vec3(uv*2.0+2.0*q+vec2(8.3,2.8), tw*0.5));\n    uv += (vec2(n3,n4)-0.5) * liqAmp;\n  }\n\n  float mt=u_time;\n  float w1=sin(mt*0.4+u_seed); float w2=sin(mt*0.9+u_seed*2.0); float w3=sin(mt*1.5+u_seed*3.0);\n  float surge=smoothstep(0.8,1.0,(w1+w2+w3)/3.0);\n  float snap=pow(surge,2.0)*12.0;\n  uv*=1.0+mt*0.003+snap*0.015;\n\n  float gTick=floor(u_time*16.0);\n  if(step(0.979,hash1(gTick*133.77+u_seed))>0.0)\n    uv.x+=(hash1(floor(uv.y*mix(10.0,30.0,hash1(gTick*2.1)))+gTick)-0.5)*0.18*clamp(u_trip,0.0,1.5);\n\n  vec3 ro=u_camPos;\n  vec3 fwd=camForward(u_yaw,u_pitch); vec3 right=camRight(fwd); vec3 up=camUp(fwd,right);\n  vec3 rd=normalize(fwd+right*uv.x+up*uv.y);\n  vec3 col=vec3(0.0);\n\n  float fracAngle=hash1(u_seed*7.7)*6.28;\n  vec3 fracPos=vec3(sin(fracAngle)*45.0, pathCenterY(u_camPos.z-300.0)+10.0, u_camPos.z-300.0);\n  float fracPow=mix(6.0,10.0,hash1(u_seed*5.3))+sin(u_time*0.05)*1.5;\n  float fracRotA=mix(0.05,0.15,hash1(u_seed*9.7))*(hash1(u_seed*4.1)>0.5?1.0:-1.0);\n  float fracRotB=mix(0.04,0.12,hash1(u_seed*6.3))*(hash1(u_seed*8.9)>0.5?1.0:-1.0);\n  vec3 fracResult=marchVoidFractal(ro, rd, fracPos, 10.0, fracPow, fracRotA, fracRotB);\n  bool hitFractal=length(fracResult)>0.001;\n\n  bool hitGround=false;\n  if(!hitFractal && rd.y<0.05){\n    for(int gi=0;gi<40;gi++){\n      float gt=float(gi)*8.0+1.0;\n      vec3 gp=ro+rd*gt;\n      if(gp.y<pathCenterY(gp.z)+0.09){\n        float gtP=gt-8.0;\n        for(int ri=0;ri<6;ri++){float mid=(gtP+gt)*0.5; vec3 mp=ro+rd*mid; if(mp.y<pathCenterY(mp.z)+0.09) gt=mid; else gtP=mid;}\n        vec3 hp=ro+rd*gt;\n        float cx=pathCenterX(hp.z); float hw=pathHalfWidth(hp.z);\n        if(abs(hp.x-cx)<hw && hp.z<ro.z+10.0 && gt>0.5){col=groundColor(hp,ro); hitGround=true;}\n        break;\n      }\n    }\n  }\n\n  if(!hitGround && !hitFractal){\n    vec3 p=ro; float traveled=0.0; float closestR=1e9; bool hitBH=false;\n    for(int i=0;i<MARCH_STEPS;i++){\n      vec3 toBH=BH_CENTER-p; float r=length(toBH); closestR=min(closestR,r);\n      if(r<BH_RADIUS){col=vec3(0); hitBH=true; break;}\n      float grav=clamp((BH_RADIUS*(16.0+u_trip*2.0))/(r*r),0.0,0.040);\n      rd=normalize(mix(rd,normalize(toBH),grav));\n      if(r<BH_RADIUS*4.8 && mod(float(i),2.0)<0.5) col+=accretionGlow(p,closestR);\n      float stepLen=clamp(r*0.03,0.75,78.0); stepLen*=1.0+smoothstep(BH_RADIUS*5.5,FAR_CLIP,r)*1.55;\n      p+=rd*stepLen; traveled+=stepLen;\n      if(traveled>FAR_CLIP) break;\n    }\n    if(!hitBH){\n      vec3 bent=rd; vec3 rp=ro; float bendClosest=1e9;\n      for(int i=0;i<BEND_STEPS;i++){\n        vec3 toBH=BH_CENTER-rp; float r=length(toBH); bendClosest=min(bendClosest,r);\n        if(r<BH_RADIUS*1.03) break;\n        bent=normalize(mix(bent,normalize(toBH),clamp((BH_RADIUS*14.0)/(r*r),0.0,0.032)));\n        rp+=bent*clamp(r*0.15,34.0,180.0);\n        if(length(rp-ro)>FAR_CLIP) break;\n      }\n      vec3 bg=cosmos(bent,ro);\n      bg+=vec3(0.16,0.20,0.34)*exp(-abs(bendClosest-BH_RADIUS*1.68)*0.018)*0.34;\n      bg*=1.0-smoothstep(BH_RADIUS*1.30,BH_RADIUS*0.96,bendClosest);\n      col+=bg;\n    }\n  }\n\n  if(hitFractal) col=fracResult;\n\n  col=mix(col,vec3(0.008,0.010,0.016), hitGround ? 0.12 : 0.20);\n\n  float lum=dot(col,vec3(0.299,0.587,0.114));\n  col=mix(col,vec3(lum*0.88,lum*0.90,lum*1.04),0.15);\n\n  col*=0.78+0.22*(1.0-smoothstep(0.75,1.5,length(uv)));\n\n  col=1.0-exp(-col*1.08);\n\n  gl_FragColor=vec4(col,1.0);\n}\n"));
      class Zone2RoomMode {
        constructor(e, t) {
          this.prog = gl.createProgram();
          gl.attachShader(
            this.prog,
            compile(
              gl.VERTEX_SHADER,
              "\n        attribute vec2 p;\n        uniform float u_time;\n        uniform float u_trip;\n        uniform float u_shake;\n        void main() {\n            vec2 pos = p;\n            float warpX = sin(pos.y * 6.0 + u_time * 1.5) * 0.015 * u_trip;\n            float warpY = cos(pos.x * 6.0 + u_time * 1.8) * 0.015 * u_trip;\n            pos += vec2(warpX, warpY);\n            pos.x += sin(u_time * 30.0) * 0.015 * u_shake;\n            pos.y += cos(u_time * 37.0) * 0.015 * u_shake;\n            gl_Position = vec4(pos, 0.0, 1.0);\n        }\n        ",
            ),
          );
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
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
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
          if (
            (gl.useProgram(this.prog),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, this.tex),
            null !== this.U.texEnv1 && gl.uniform1i(this.U.texEnv1, 0),
            n &&
              (gl.activeTexture(gl.TEXTURE1),
              gl.bindTexture(gl.TEXTURE_2D, n),
              null !== this.U.windowTex && gl.uniform1i(this.U.windowTex, 1),
              null !== this.U.texEnv2 && gl.uniform1i(this.U.texEnv2, 1),
              null !== this.U.texEnv3 && gl.uniform1i(this.U.texEnv3, 1),
              null !== this.U.texEnv4 && gl.uniform1i(this.U.texEnv4, 1)),
            null !== this.U.bcTex)
          ) {
            if ((gl.activeTexture(gl.TEXTURE2), this.bcSourceTex))
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
            null !== this.U.modeTime &&
              gl.uniform1f(this.U.modeTime, 0.001 * e),
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
          t &&
            window.currentZone2.voidVid &&
            window.currentZone2.voidVid.paused)
        ) {
          let e = window.currentZone2.voidVid.play();
          void 0 !== e && e.catch(() => {});
        }
      }
      ((window.z2SpaceHeld = window.z2SpaceHeld || !1),
        (window.z2TouchHeld = window.z2TouchHeld || !1),
        (window.__mobileWalkZoneContains =
          window.__mobileWalkZoneContains ||
          function (e, t) {
            const i = window.innerWidth;
            return (
              t >= 0.68 * window.innerHeight && e >= 0.3 * i && e <= 0.7 * i
            );
          }),
        window.addEventListener("keydown", (e) => {
          "Space" === e.code &&
            (e.preventDefault(),
            (window.z2SpaceHeld = !0),
            window.currentZone2 &&
              window.currentZone2.voidVid &&
              window.currentZone2.voidVid.play().catch(() => {}));
        }),
        window.addEventListener("keyup", (e) => {
          "Space" === e.code && (e.preventDefault(), (window.z2SpaceHeld = !1));
        }),
        window.addEventListener("touchstart", checkZ2Touch, { passive: !1 }),
        window.addEventListener("touchmove", checkZ2Touch, { passive: !1 }),
        window.addEventListener("touchend", checkZ2Touch, { passive: !1 }),
        window.addEventListener("touchcancel", () => {
          window.z2TouchHeld = !1;
        }));
      class Zone2Engine {
        constructor() {
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
            (this.texFront = loadStaticTex(
              "files/img/rooms/z2/hallway/FORWARD.png",
            )),
            (this.texFrontAlt = loadStaticTex(
              "files/img/rooms/z2/hallway/FORWARD-alt.png",
            )),
            (this.texBack = loadStaticTex(
              "files/img/rooms/z2/hallway/BACK.png",
            )),
            (this.texBackAlt = loadStaticTex(
              "files/img/rooms/z2/hallway/BACK-ALT.png",
            )),
            (this.texBackDoor = loadStaticTex(
              "files/img/rooms/z2/hallway/BACK-DOOR.png",
            )),
            (this.texLeft = loadStaticTex(
              "files/img/rooms/z2/hallway/LEFTWALL.png",
            )),
            (this.texRight = loadStaticTex(
              "files/img/rooms/z2/hallway/RIGHTWALL.png",
            )),
            (this.texTop = loadStaticTex("files/img/rooms/z2/hallway/TOP.png")),
            (this.texBottom = loadStaticTex(
              "files/img/rooms/z2/hallway/GROUND.png",
            )),
            (this.texVoidVid = gl.createTexture()),
            gl.bindTexture(gl.TEXTURE_2D, this.texVoidVid),
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR),
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
                  "files/img/rooms/z2/bathroom.png",
                )
              : null),
            (this.rightRoom = GLSL.modules.z2_room_right
              ? new Zone2RoomMode(
                  "z2_room_right",
                  "files/img/rooms/z2/bedrooom.png",
                )
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
            (this.holeProg = gl.createProgram()),
            gl.attachShader(
              this.holeProg,
              compile(gl.VERTEX_SHADER, GLSL.vert),
            ),
            gl.attachShader(
              this.holeProg,
              compile(gl.FRAGMENT_SHADER, GLSL.modules.z2_seq_hole),
            ),
            gl.linkProgram(this.holeProg),
            (this.solidProg = gl.createProgram()),
            gl.attachShader(
              this.solidProg,
              compile(gl.VERTEX_SHADER, GLSL.vert),
            ),
            gl.attachShader(
              this.solidProg,
              compile(
                gl.FRAGMENT_SHADER,
                "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }",
              ),
            ),
            gl.linkProgram(this.solidProg),
            (this.windowFBO = this.makeFBO()),
            (this.holeFBO = this.makeFBO()),
            (this.mirrorFBO = this.makeFBO()),
            (this.rightHoleFBO = this.makeFBO()),
            (this.rightHolePostFBO = this.makeFBO()),
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
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
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
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
            (this.mode9_T_create = performance.now()),
            (this.mode9_T_hole = -1),
            "undefined" != typeof ActiveMode &&
              ((this.mode9 = new ActiveMode(9)),
              (this.mode9.maskTex = this.noWindowTex),
              (this.modeBH = new ActiveMode(3)),
              (this.modeBH.maskTex = this.noWindowTex)),
            (this.windowModes = [1, 2, 5, 6, 7]),
            (this.currentWindowModeIndex = Math.floor(
              Math.random() * this.windowModes.length,
            )),
            (this.windowActiveMode = null),
            "undefined" != typeof ActiveMode &&
              ((this.windowActiveMode = new ActiveMode(
                this.windowModes[this.currentWindowModeIndex],
              )),
              (this.windowActiveMode.maskTex = this.noWindowTex)),
            (this.lastBlinkTime = performance.now()),
            (this.nextBlinkInterval = 4e3 + 8e3 * Math.random()),
            (this.blinking = !1),
            (this.blinkStart = 0),
            (this.rBlink = 0),
            (this.z2ModeSeed = 100 * Math.random()),
            (this.z2Trip = 0.2 + 1.5 * Math.random()),
            (this.modeSwapped = !1),
            (this.z2FractalSeed = 100 * Math.random()),
            (this.z2BlinkPeakTime = performance.now()),
            (this.redStartTime = -1),
            (this.readyForZone3 = !1),
            (this.zone3Route = "z3"),
            (this.z4RouteStep = 0),
            (this.z4RouteActive = false),
            (this.z4LeftBlinkCount = 0),
            (this.rightBlinkCount = 0),
            (this.z3bTurbulenceStart = -1),
            (this.z3TransitionStarted = !1),
            (this.isDead = !1));
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
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE,
            ),
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE,
            ),
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
            { fbo: n, tex: o }
          );
        }
        _blitTex(e, t, i) {
          (gl.useProgram(this.holeProg),
            gl.disable(gl.BLEND),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, e),
            gl.uniform1i(gl.getUniformLocation(this.holeProg, "u_tex"), 0),
            gl.uniform2f(
              gl.getUniformLocation(this.holeProg, "u_resolution"),
              t,
              i,
            ),
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
          const o = gl.getAttribLocation(this.holeProg, "p");
          (gl.enableVertexAttribArray(o),
            gl.vertexAttribPointer(o, 2, gl.FLOAT, !1, 0, 0),
            gl.drawArrays(gl.TRIANGLES, 0, 3));
        }
        drawOverlay(e, t, i, o) {
          if (o <= 0) return;
          (gl.useProgram(this.solidProg),
            gl.enable(gl.BLEND),
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
            gl.uniform4f(
              gl.getUniformLocation(this.solidProg, "u_col"),
              e,
              t,
              i,
              o,
            ),
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
          const t = e - this.slideStart;
          if ("out" === this.slideState) {
            const i = Math.min(t / 340, 1);
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
                (this.povSwitchTime = e)));
          } else if ("black" === this.slideState)
            t >= 80 &&
              ((this.slideOffset = -window.innerWidth * this.slideDir),
              (this.slideState = "in"),
              (this.slideStart = e));
          else if ("in" === this.slideState) {
            const e = Math.min(t / 340, 1),
              i = 1 - (1 - e) * (1 - e);
            ((this.slideOffset = -window.innerWidth * this.slideDir * (1 - i)),
              e >= 1 &&
                ((this.slideOffset = 0),
                (this.slideState = "idle"),
                (this.pendingPOV = null)));
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
        _povForFacing(f) {
          if (f === "W") return "left";
          if (f === "E") return "right";
          return "center";
        }
        _nextFacing(currentFacing, dir) {
          var zoneB = !this.intersectionReached;
          var table = {
            "N_B": { L: "S", R: "S" },
            "S_B": { L: "N", R: "N" },
            "N_A": { L: "W", R: "E" },
            "S_A": { L: "E", R: "W" },
            "W_A": { L: "S", R: "N" },
            "E_A": { L: "N", R: "S" },
          };
          var key = currentFacing + (zoneB ? "_B" : "_A");
          var row = table[key];
          if (!row) return currentFacing;
          return row[dir];
        }
        _yawForFacing(f) {
          return { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[f] || 0;
        }
        checkPOVThreshold(e, t) {
          if (
            "idle" !== this.slideState ||
            e - this.povSwitchTime < 600
          ) return;

          var dragLeft = t >= 1.24;
          var dragRight = t <= -1.24;
          if (!dragLeft && !dragRight) return;

          var dir = dragLeft ? "L" : "R";
          var slideDir = dragLeft ? 1 : -1;

          var newFacing = this._nextFacing(this.facing, dir);
          if (newFacing === this.facing) return;

          this.facing = newFacing;
          this.hallwayYawTarget = this._yawForFacing(newFacing);

          var newPOV = this._povForFacing(newFacing);
          this.beginSlide(newPOV, slideDir);
          this.povSwitchTime = e;

          if (newFacing !== "W" && !this.z4RouteActive) {
            if (this.seqState === "hole" || this.seqState === "red") {
              this.seqState = "blood";
              this.leftRoom && (this.leftRoom.tex = this.texBathroomBlood);
              this.redStartTime = -1;
            }
          }

          if (newFacing !== "E" && !this.z4RouteActive) {
            if (this.seqState === "bedroom_2" || this.seqState === "z3b_turbulence" || this.seqState === "z3b_red") {
              this.seqState = "bedroom_visited";
              this.rightBlinkCount = 0;
              this.z3bTurbulenceStart = -1;
            }
          }

          // ── Z4 route turn pattern tracking ──
          // Pattern from blood/W: L(→S), L(→E), R(→S), R(→W)
          // z4RouteStep: 0=waiting, 1=S, 2=E, 3=S, 4=W (ready for blinks)
          var z4Consumed = false;
          if (this.seqState === "blood" || this.z4RouteActive) {
            var expectedTurns = [
              { dir: "L", to: "S" },
              { dir: "L", to: "E" },
              { dir: "R", to: "S" },
              { dir: "R", to: "W" },
            ];
            var step = this.z4RouteStep;
            if (step < 4) {
              var expect = expectedTurns[step];
              console.log("[Z4Route] step=" + step + " dir=" + dir + " newFacing=" + newFacing + " expect=" + JSON.stringify(expect) + " seqState=" + this.seqState + " z4Active=" + this.z4RouteActive);
              if (expect && newFacing === expect.to && dir === expect.dir) {
                this.z4RouteStep = step + 1;
                this.z4RouteActive = true;
                z4Consumed = true;
                console.log("[Z4Route] MATCH -> step now " + this.z4RouteStep);
                if (this.z4RouteStep >= 4) {
                  this.seqState = "z4_bathroom";
                  this.z4LeftBlinkCount = 0;
                  console.log("[Z4Route] COMPLETE -> z4_bathroom");
                }
              } else if (this.z4RouteStep > 0) {
                console.log("[Z4Route] RESET — wrong turn");
                this.z4RouteStep = 0;
                this.z4RouteActive = false;
              }
            }
          } else {
            console.log("[Z4Route] SKIPPED — seqState=" + this.seqState + " z4Active=" + this.z4RouteActive);
          }

          if (!z4Consumed) {
            if (newFacing === "E" && this.seqState === "blood") {
              this.seqState = "bedroom_visited";
              this.zone3Route = "z3";
            } else if (newFacing === "W" && this.seqState === "bedroom_visited") {
              this.seqState = "hole";
              this.zone3Route = "z3";
              this.leftRoom && (this.leftRoom.tex = this.texBathroomHole);
              this.mode9_T_hole = performance.now();
            } else if (newFacing === "E" && this.seqState === "bedroom_visited") {
              this.seqState = "z4_bathroom";
              this.z4LeftBlinkCount = 0;
              this.leftRoom && (this.leftRoom.tex = this.texBathroomNormal);
              this.zone3Route = "z4";
            }
          }
        }
        render(e, t, i, o, n, l, r) {
          if (this.isDead) return;
          if (this.readyForZone3 && !this.z3TransitionStarted) {
            this.z3TransitionStarted = !0;
            const e =
              "bedroom_2" === this.seqState ||
              "z3b_turbulence" === this.seqState ||
              "z3b_red" === this.seqState ||
              "z3b" === this.zone3Route
                ? "z3b"
                : "z3";
            return (
              this.destroy(),
              void ("function" == typeof window.startZone3
                ? window.startZone3(e)
                : "undefined" != typeof Zone3Engine &&
                  (window.currentZone3 = new Zone3Engine(e)))
            );
          }
          let s = e - this.lastRenderTime;
          (s > 250 && (s = 33.33),
            (this.lastRenderTime = e),
            (window.lastNow = e),
            window.butterchurnVisualizer &&
              window.butterchurnVisualizer.render(),
            void 0 === this.cx && ((this.cx = t), (this.cy = i)),
            (this.cx += 0.12 * (t - this.cx)),
            (this.cy += 0.12 * (i - this.cy)));
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
            "z4_bathroom" === this.seqState && (d = 0.6),
            "z4_ready" === this.seqState && (d = 0.3));
          this.seqIntensity = d;
          var g = Math.min(1, 0.15 * this.leftBlinkCount);
          this.neuralIntensity = this.z2Trip + d + g + 0.3 * a;
          const c = document.getElementById("c"),
            u = c ? c.width : window.innerWidth,
            f = c ? c.height : window.innerHeight;
          if (
            (this.checkPOVThreshold(e, t),
            this.tickSlide(e),
            e - this.lastBlinkTime > this.nextBlinkInterval &&
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
                    (this.currentWindowModeIndex =
                      (this.currentWindowModeIndex + 1) %
                      this.windowModes.length),
                    "undefined" != typeof ActiveMode &&
                      ((this.windowActiveMode = new ActiveMode(
                        this.windowModes[this.currentWindowModeIndex],
                      )),
                      (this.windowActiveMode.maskTex = this.noWindowTex)),
                    (this.z2ModeSeed = 100 * Math.random()),
                    (this.z2Trip = 0.2 + 1.5 * Math.random()),
                    (this.z2FractalSeed = 100 * Math.random()),
                    (this.z2BlinkPeakTime = e)))
                : t < 320
                  ? (this.rBlink = 1 - (t - 200) / 120)
                  : ((this.rBlink = 0),
                    (this.blinking = !1),
                    (this.modeSwapped = !1),
                    "left" === this.activePOV &&
                      "initial" === this.seqState &&
                      (this.leftBlinkCount++,
                      this.leftBlinkCount >= 2 &&
                        (this.leftRoom &&
                          (this.leftRoom.tex = this.texBathroomBlood),
                        (this.seqState = "blood"))),
                    "right" === this.activePOV &&
                      "bedroom_2" === this.seqState &&
                      (this.rightBlinkCount++,
                      this.rightBlinkCount >= 2 &&
                        ((this.seqState = "z3b_turbulence"),
                        (this.z3bTurbulenceStart = e))),
                    "left" === this.activePOV &&
                      "z4_bathroom" === this.seqState &&
                      (this.z4LeftBlinkCount++,
                      this.z4LeftBlinkCount >= 2 &&
                        (this.leftRoom && (this.leftRoom.tex = this.texBathroomNormal),
                        (this.seqState = "z4_ready"),
                        (this.zone3Route = "z4"))));
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
            "z3b_red" === this.seqState;
          if (
            (this.rightRoom && (this.rightRoom.bcSourceTex = null),
            m && this.modeBH && this.rightHoleFBO)
          ) {
            (gl.bindFramebuffer(gl.FRAMEBUFFER, this.rightHoleFBO.fbo),
              gl.viewport(0, 0, u, f),
              gl.clearColor(0, 0, 0, 1),
              gl.clear(gl.COLOR_BUFFER_BIT),
              (window.__tripAmount = Math.max(
                this.z2Trip,
                "z3b_turbulence" === this.seqState ? 1.2 : 0.9,
              )),
              this.modeBH.render(e, 0, 0, a, 0, 0, h, 1, this.z2ModeSeed));
            const t = this.rightHolePostFBO
              ? this.rightHolePostFBO.tex
              : this.rightHoleFBO.tex;
            if (this.blackHoleProg && this.rightHolePostFBO) {
              (gl.bindFramebuffer(gl.FRAMEBUFFER, this.rightHolePostFBO.fbo),
                gl.viewport(0, 0, u, f),
                gl.clearColor(0, 0, 0, 1),
                gl.clear(gl.COLOR_BUFFER_BIT),
                gl.useProgram(this.blackHoleProg),
                gl.activeTexture(gl.TEXTURE0),
                gl.bindTexture(gl.TEXTURE_2D, this.rightHoleFBO.tex),
                gl.uniform1i(
                  gl.getUniformLocation(this.blackHoleProg, "u_tex"),
                  0,
                ),
                gl.uniform2f(
                  gl.getUniformLocation(this.blackHoleProg, "u_resolution"),
                  u,
                  f,
                ));
              const t = gl.getUniformLocation(this.blackHoleProg, "u_time"),
                i = gl.getUniformLocation(this.blackHoleProg, "u_trip"),
                o = gl.getUniformLocation(this.blackHoleProg, "u_seed"),
                n = gl.getUniformLocation(this.blackHoleProg, "u_blink");
              (t && gl.uniform1f(t, 0.001 * e),
                i &&
                  gl.uniform1f(
                    i,
                    Math.max(
                      this.z2Trip,
                      "z3b_turbulence" === this.seqState ? 1.65 : 1.15,
                    ),
                  ),
                o && gl.uniform1f(o, this.z2ModeSeed),
                n && gl.uniform1f(n, this.rBlink),
                gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer));
              const l = gl.getAttribLocation(this.blackHoleProg, "p");
              (gl.enableVertexAttribArray(l),
                gl.vertexAttribPointer(l, 2, gl.FLOAT, !1, 0, 0),
                gl.drawArrays(gl.TRIANGLES, 0, 3));
            }
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
                  gl.bindFramebuffer(gl.FRAMEBUFFER, null),
                  gl.viewport(0, 0, u, f),
                  gl.useProgram(this.holeProg),
                  gl.disable(gl.BLEND),
                  gl.activeTexture(gl.TEXTURE0),
                  gl.bindTexture(gl.TEXTURE_2D, this.holeFBO.tex),
                  gl.uniform1i(
                    gl.getUniformLocation(this.holeProg, "u_tex"),
                    0,
                  ),
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
                (this._blitTex(this.mirrorFBO.tex, u, f),
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
                  this.z2Trip,
                  this.z2FractalSeed,
                  0.001 * (e - this.z2BlinkPeakTime),
                  2,
                );
            }
            this.rBlink > 0.001 && this.drawOverlay(0, 0, 0, this.rBlink);
          } else if ("right" === this.activePOV && this.rightRoom) {
            const t = "z3b_turbulence" === this.seqState,
              i = "z3b_red" === this.seqState,
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
              "bedroom_2" === this.seqState &&
                this.drawOverlay(0, 0, 0.03, 0.45),
              t && this.z3bTurbulenceStart > 0)
            ) {
              const t = e - this.z3bTurbulenceStart,
                i = 0.28 + 0.18 * Math.abs(Math.sin(0.035 * e));
              (this.drawOverlay(0.16, 0, 0, i),
                t >= 2600 &&
                  ((this.seqState = "z3b_red"), (this.redStartTime = e)));
            }
            if (i && this.redStartTime > 0) {
              const t = e - this.redStartTime;
              let i = 0;
              (t < 450
                ? (i = t / 450)
                : t < 2100
                  ? (i = 1)
                  : t < 3100
                    ? (i = 1 - (t - 2100) / 1e3)
                    : ((this.readyForZone3 = !0), (this.zone3Route = "z3b")),
                i > 0.001 && this.drawOverlay(0.85, 0, 0, i));
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
            var _f = this.facing;
            var _seqActive = this.seqState !== "initial";
            var _canWalk = (_f === "N" && !this.intersectionReached) || _f === "S";
            if (_canWalk && (window.z2SpaceHeld || window.z2TouchHeld)) {
              this.camZ += _f === "S" ? -0.04 : 0.04;
              t = 1;
              if (this.camZ >= this.INTERSECTION_Z) {
                this.camZ = this.INTERSECTION_Z;
                this.intersectionReached = !0;
                t = 0;
              }
              if (this.camZ <= this.START_Z) {
                this.camZ = this.START_Z; t = 0;
              }
              if (_f === "S" && this.camZ < this.INTERSECTION_Z && this.intersectionReached) {
                this.intersectionReached = !1;
              }
              if (_f === "S" && this.camZ <= -1.9 && (!_seqActive || this.seqState === "z4_ready") && !this.z2ExitStarted) {
                this.z2ExitStarted = true;
                this.z2ExitTime = performance.now();
              }
            }
            let i = Math.max(
              0,
              Math.min(
                1,
                (this.camZ - this.START_Z) /
                  (this.INTERSECTION_Z - this.START_Z),
              ),
            );
            (window.__audioWetGain &&
              (window.__audioWetGain.gain.value = 0.7 * (1 - 0.9 * i)),
              window.__audioDryGain &&
                (window.__audioDryGain.gain.value = 0.3 + 0.7 * i));
            (function(self, now) {
              if (!self.darvazaGL) {
                self.darvazaCanvas = document.createElement("canvas");
                self.darvazaCanvas.width = 512;
                self.darvazaCanvas.height = 512;
                self.darvazaGL = self.darvazaCanvas.getContext("webgl",{antialias:false,depth:false,stencil:false,alpha:false});
                if (!self.darvazaGL) return;
                const dgl = self.darvazaGL;
                const vs = "attribute vec2 p; void main(){ gl_Position=vec4(p,0,1); }";
                const fs = [
                  "precision highp float;",
                  "uniform vec2 u_resolution; uniform float u_time; uniform float u_trip;",
                  "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
                  "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
                  "float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*n(p);p*=2.1;a*=0.5;}return v;}",
                  "void main(){",
                  "  vec2 uv=gl_FragCoord.xy/u_resolution;",
                  "  float t=u_time;",
                  "  float seq=clamp(u_trip,0.0,3.0);",
                  "  vec3 skyTop=vec3(0.12,0.07,0.05); vec3 skyHoriz=vec3(0.95,0.55,0.12);",
                  "  vec3 sky=mix(skyHoriz,skyTop,smoothstep(0.25,0.85,uv.y));",
                  "  sky+=fbm(uv*3.0+vec2(t*0.015,0.0))*0.06*vec3(1.0,0.5,0.2);",
                  "  float smoke1=fbm(vec2(uv.x*1.8+0.3,uv.y*2.5-t*0.25))*smoothstep(0.62,0.28,uv.y)*smoothstep(0.20,0.52,uv.y);",
                  "  float smoke2=fbm(vec2(uv.x*2.1-0.5,uv.y*2.2-t*0.20)+5.3)*smoothstep(0.62,0.22,uv.y)*smoothstep(0.18,0.50,uv.y);",
                  "  float smoke=max(smoke1,smoke2)*0.5;",
                  "  sky=mix(sky,vec3(0.05,0.03,0.02),smoke);",
                  "  sky+=vec3(1.0,0.45,0.08)*exp(-abs(uv.y-0.62)*10.0)*0.9;",
                  "  float hillY=0.62+sin(uv.x*2.9+1.1)*0.018+sin(uv.x*5.3)*0.010+sin(uv.x*11.7)*0.005;",
                  "  float hill=smoothstep(0.006,0.0,uv.y-hillY);",
                  "  float groundMask=smoothstep(0.62,0.68,uv.y);",
                  "  float depth=clamp((uv.y-0.62)/0.38,0.0,1.0);",
                  "  float gn=fbm(vec2(uv.x*3.5,uv.y*7.0+t*0.008));",
                  "  vec3 groundBase=mix(vec3(0.38,0.14,0.03),vec3(0.65,0.28,0.06),gn);",
                  "  groundBase*=mix(0.4,1.0,depth);",
                  "  vec2 fUV=vec2(uv.x*2.2,depth*3.0);",
                  "  float f1=fbm(fUV+vec2(t*0.18,-t*0.12));",
                  "  float f2=fbm(fUV*1.6+vec2(-t*0.14,t*0.20)+4.3);",
                  "  float f3=fbm(fUV*0.8+vec2(t*0.07,t*0.05)+8.1);",
                  "  float fire=pow(max(max(f1,f2)*f3-0.08,0.0)*2.8,0.85);",
                  "  fire*=groundMask*mix(0.2,1.0,depth*depth);",
                  "  vec3 fireCol=vec3(1.0,0.30,0.01);",
                  "  fireCol=mix(fireCol,vec3(1.0,0.78,0.15),smoothstep(0.2,0.6,fire));",
                  "  fireCol=mix(fireCol,vec3(1.0,1.0,0.88),smoothstep(0.6,1.0,fire));",
                  "  float glow=fbm(fUV*0.5+vec2(t*0.04,0.0))*groundMask*mix(0.0,1.0,depth);",
                  "  groundBase+=vec3(1.0,0.40,0.03)*glow*1.8;",
                  "  vec3 col=sky;",
                  "  col=mix(col,vec3(0.05,0.03,0.02),hill);",
                  "  col=mix(col,groundBase,groundMask);",
                  "  col+=fireCol*fire*5.0;",
                  // Edge flames driven by seq (u_trip)
                  "  if(seq>0.1){",
                  "    float ed=seq*0.35;",
                  "    float eleft=fbm(vec2(uv.x*3.0+t*0.4,uv.y*4.0-t*1.2))*smoothstep(ed,0.0,uv.x);",
                  "    float eright=fbm(vec2((1.0-uv.x)*3.0-t*0.4,uv.y*4.0-t*1.1)+3.1)*smoothstep(ed,0.0,1.0-uv.x);",
                  "    float etop=fbm(vec2(uv.x*4.0+t*0.3,(1.0-uv.y)*3.0-t*1.3)+6.2)*smoothstep(ed,0.0,1.0-uv.y);",
                  "    float ebottom=fbm(vec2(uv.x*4.0-t*0.35,uv.y*3.0-t*1.4)+9.3)*smoothstep(ed,0.0,uv.y);",
                  "    float edge=max(max(eleft,eright),max(etop,ebottom));",
                  "    edge=pow(max(edge-0.1,0.0)*1.5,0.8)*seq;",
                  "    vec3 edgeCol=mix(vec3(1.0,0.20,0.0),vec3(1.0,0.80,0.1),edge);",
                  "    col+=edgeCol*edge*3.5;",
                  "    col=mix(col,col*vec3(1.4,0.6,0.2),clamp(seq*0.15,0.0,0.5));",
                  "  }",
                  "  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);",
                  "}"
                ].join("\n");
                function cs2(dgl,tp,src){const s=dgl.createShader(tp);dgl.shaderSource(s,src);dgl.compileShader(s);if(!dgl.getShaderParameter(s,dgl.COMPILE_STATUS))console.error('[fire]',dgl.getShaderInfoLog(s));return s;}
                const prog=dgl.createProgram();
                dgl.attachShader(prog,cs2(dgl,dgl.VERTEX_SHADER,vs));
                dgl.attachShader(prog,cs2(dgl,dgl.FRAGMENT_SHADER,fs));
                dgl.linkProgram(prog);
                const buf=dgl.createBuffer();
                dgl.bindBuffer(dgl.ARRAY_BUFFER,buf);
                dgl.bufferData(dgl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),dgl.STATIC_DRAW);
                self.darvazaProg={prog,buf,uRes:dgl.getUniformLocation(prog,'u_resolution'),uTime:dgl.getUniformLocation(prog,'u_time'),uTrip:dgl.getUniformLocation(prog,'u_trip')};
              }
              const dgl=self.darvazaGL, dp=self.darvazaProg;
              if(!dgl||!dp)return;
              dgl.viewport(0,0,512,512);
              dgl.useProgram(dp.prog);
              dgl.uniform2f(dp.uRes,512,512);
              dgl.uniform1f(dp.uTime,now*0.001);
              dgl.uniform1f(dp.uTrip,self.seqIntensity||0.0);
              dgl.bindBuffer(dgl.ARRAY_BUFFER,dp.buf);
              const loc=dgl.getAttribLocation(dp.prog,'p');
              dgl.enableVertexAttribArray(loc);
              dgl.vertexAttribPointer(loc,2,dgl.FLOAT,false,0,0);
              dgl.drawArrays(dgl.TRIANGLES,0,3);
              dgl.flush();
              gl.activeTexture(gl.TEXTURE6);
              gl.bindTexture(gl.TEXTURE_2D,self.texVoidVid);
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,self.darvazaCanvas);
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
            })(this, e);
            const o = "initial" !== this.seqState,
              n = m
                ? this.rightHolePostFBO && this.rightHolePostFBO.tex
                  ? this.rightHolePostFBO.tex
                  : this.rightHoleFBO
                    ? this.rightHoleFBO.tex
                    : this.texVoidVid
                : this.texVoidVid;
            (this._blitTex(n, u, f),
              gl.enable(gl.BLEND),
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA));
            const l = m
              ? this.texFront
              : this.texFront;
            (gl.useProgram(this.prog),
              gl.activeTexture(gl.TEXTURE0),
              gl.bindTexture(gl.TEXTURE_2D, l),
              gl.activeTexture(gl.TEXTURE1),
              gl.bindTexture(gl.TEXTURE_2D, this.seqState === "initial" ? this.texBack : (this.seqState === "z4_ready" || this.zone3Route === "z4") ? this.texBackDoor : this.texBackAlt),
              gl.activeTexture(gl.TEXTURE2),
              gl.bindTexture(gl.TEXTURE_2D, this.texLeft),
              gl.activeTexture(gl.TEXTURE3),
              gl.bindTexture(gl.TEXTURE_2D, this.texRight),
              gl.activeTexture(gl.TEXTURE4),
              gl.bindTexture(gl.TEXTURE_2D, this.texTop),
              gl.activeTexture(gl.TEXTURE5),
              gl.bindTexture(gl.TEXTURE_2D, this.texBottom),
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
          if (this.z2ExitStarted && !this.z2ExitDone) {
            if (!this.z2ExitOverlay) {
              this.z2ExitDone = true;
              var fadeEl = document.getElementById("zone-fade-overlay");
              if (!fadeEl) {
                fadeEl = document.createElement("div");
                fadeEl.id = "zone-fade-overlay";
                fadeEl.style.cssText = "position:fixed;inset:0;background:black;pointer-events:none;transition:opacity 0.6s ease-in-out;z-index:99999;opacity:0;";
                document.body.appendChild(fadeEl);
              }
              this.z2ExitOverlay = fadeEl;
              setTimeout(function() { fadeEl.style.opacity = "1"; }, 20);
              var self = this;
              setTimeout(function() {
                self.destroy();
                window.currentZone2 = null;
                window.__zone2Governor = null;
                if (self.zone3Route === "z4") window.__z4Route = true;
                window.isEngine1Dead = false;
                if (typeof phase !== "undefined") phase = "open";
                if (typeof blink !== "undefined") blink = 0;
                if (typeof timer !== "undefined") timer = performance.now();
                if (typeof mode !== "undefined" && typeof ActiveMode !== "undefined") {
                  activePOV = "center";
                  mx = 0; my = 0; cx = 0; cy = 0;
                  currentEngine = new ActiveMode(mode);
                  if (typeof initSideEngines === "function") initSideEngines();
                  if (typeof __lastFrameTime !== "undefined") __lastFrameTime = 0;
                  if (typeof __frameGovernor === "function") requestAnimationFrame(__frameGovernor);
                }
                setTimeout(function() { fadeEl.style.opacity = "0"; }, 100);
              }, 700);
            }
          }
        }
        destroy() {
          this.isDead = !0;
          const e = document.getElementById("c");
          if (
            (e && (e.style.transform = ""),
            this.leftRoom && this.leftRoom.destroy(),
            this.rightRoom && this.rightRoom.destroy(),
            this.windowActiveMode && this.windowActiveMode.destroy(),
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
            this.quadBuffer && gl.deleteBuffer(this.quadBuffer),
            this.blankMask && gl.deleteTexture(this.blankMask),
            this.noWindowTex && gl.deleteTexture(this.noWindowTex))
          ) {}
          if (this.darvazaGL) {
            try { this.darvazaGL.getExtension("WEBGL_lose_context") && this.darvazaGL.getExtension("WEBGL_lose_context").loseContext(); } catch(e) {}
            this.darvazaCanvas = null;
            this.darvazaGL = null;
          }
          (gl.deleteTexture(this.texFront),
            gl.deleteTexture(this.texBack),
            gl.deleteTexture(this.texBackAlt),
            gl.deleteTexture(this.texBackDoor),
            gl.deleteTexture(this.texLeft),
            gl.deleteTexture(this.texRight),
            gl.deleteTexture(this.texTop),
            gl.deleteTexture(this.texBottom),
            gl.deleteTexture(this.texVoidVid),
            gl.deleteProgram(this.holeProg),
            gl.deleteProgram(this.solidProg));
        }
      }
      window.startZone2 = function () {
        ((window.currentZone2 = new Zone2Engine()),
          window.__unlockAllVideos && window.__unlockAllVideos());
        let e = document.getElementById("zone-fade-overlay");
        (e ||
          ((e = document.createElement("div")),
          (e.id = "zone-fade-overlay"),
          (e.style.cssText =
            "position:fixed;inset:0;background:black;pointer-events:none;transition:opacity 0.2s ease-in-out;z-index:99999;"),
          document.body.appendChild(e)),
          (e.style.opacity = "1"),
          setTimeout(() => {
            e.style.opacity = "0";
          }, 50),
          setTimeout(() => {
            "function" == typeof window.showTransientCenterOverlay &&
              window.showTransientCenterOverlay(
                "files/img/rooms/ctrls.png",
                1800,
                1350,
              );
          }, 180));
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
              let t = 0;
              ((window.__zone2Governor = function (i) {
                (requestAnimationFrame(window.__zone2Governor),
                  i - t < e ||
                    ((t = i),
                    window.currentZone2 &&
                      !window.currentZone2.isDead &&
                      window.currentZone2.render(
                        i,
                        window.mx || 0,
                        window.my || 0,
                        0,
                        0,
                        0,
                        0,
                      )));
              }),
                requestAnimationFrame(window.__zone2Governor));
            }
          } else requestAnimationFrame(t);
        };
        t();
      };