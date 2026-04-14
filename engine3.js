((window.GLSL = window.GLSL || {}),
        (window.GLSL.modules = window.GLSL.modules || {}),
        (GLSL.modules.z3_bedroom =
          "\nprecision mediump float;\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform float u_blink;\nuniform float u_wake;\nuniform sampler2D u_texEnv1;\nuniform sampler2D u_voidTex;\n\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / u_resolution;\n    uv.y = 1.0 - uv.y;\n    float screenAspect = u_resolution.x / u_resolution.y;\n    float imgAspect = 1080.0 / 1920.0;\n    float visibleAspect = mix(imgAspect, 0.62, smoothstep(0.7, 2.0, screenAspect));\n    float panRangeX = mix(0.06, 0.10, smoothstep(0.7, 1.4, screenAspect));\n    float panRangeY = mix(0.06, 0.28, smoothstep(0.7, 1.4, screenAspect));\n    vec2 tuv;\n    if (screenAspect > visibleAspect) { float scale = visibleAspect / screenAspect; tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5); }\n    else { float scale = screenAspect / visibleAspect; tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y); }\n    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;\n    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;\n    tuv = clamp(tuv, 0.0, 1.0);\n    vec4 room = texture2D(u_texEnv1, tuv);\n    vec3 col = room.rgb;\n    if (room.a < 0.1) {\n        float fboAspect = u_resolution.x / u_resolution.y;\n        float wxMin = 480.0 / 1243.0; float wxMax = 820.0 / 1243.0;\n        float wyMin = 680.0 / 2048.0; float wyMax = 1350.0 / 2048.0;\n        vec2 winUV = vec2((tuv.x - wxMin) / (wxMax - wxMin), 1.0 - ((tuv.y - wyMin) / (wyMax - wyMin)));\n        float winAspect = (wxMax - wxMin) * 1243.0 / ((wyMax - wyMin) * 2048.0);\n        vec2 centered = winUV - 0.5;\n        if (fboAspect < winAspect) centered.y *= fboAspect / winAspect;\n        else centered.x *= winAspect / fboAspect;\n        winUV = centered + 0.5;\n        col = texture2D(u_voidTex, clamp(winUV, 0.0, 1.0)).rgb;\n    }\n    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;\n    if (isGreen) { col = texture2D(u_voidTex, tuv).rgb; }\n    float fogMix = 0.10 + 0.03 * sin(u_time * 0.2);\n    col = mix(col, vec3(0.04, 0.05, 0.08), fogMix);\n    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);\n    gl_FragColor = vec4(col, 1.0);\n}\n"),
        (GLSL.modules.z3_merged =
          "\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nuniform vec2  u_resolution;\nuniform vec2  u_mouse;\nuniform float u_time;\nuniform float u_blink;\nuniform float u_wake;\nuniform float u_camZ;\nuniform float u_camX;\nuniform float u_yawOffset;\nuniform float u_doorOpen;\nuniform float u_doorSwitched;\nuniform float u_isWalking;\nuniform float u_shake;\nuniform float u_flash;\nuniform float u_zoom;\nuniform float u_suctionFade;\nuniform float u_trip;\nuniform float u_modeSeed;\nuniform float u_modeTime;\nuniform float u_isOOB;\nuniform float u_fractalActive;\nuniform float u_fractalSeed;\nuniform float u_blinkAge;\nuniform float u_altRoute;\n\nfloat _mHash(float x){ return fract(sin(x*127.1)*43758.5453); }\n#ifdef MOBILE\nfloat _burningShip(vec2 c){ return 0.5; }\nfloat _julia(vec2 z, vec2 c){ return 0.5; }\n#else\n// Burning Ship — melting building structures, WebGL1-safe (no break)\nfloat _burningShip(vec2 c){\n    vec2 z=vec2(0.0); float si=0.0;\n    #ifdef MOBILE\n    for(int n=0; n<16; n++){\n    #else\n    for(int n=0; n<48; n++){\n    #endif\n        z = vec2(abs(z.x), abs(z.y));\n        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;\n        float esc = step(4.0, dot(z,z));\n        si += (1.0 - esc);\n    }\n    #ifdef MOBILE\n    return si / 16.0;\n    #else\n    return si / 48.0;\n    #endif\n}\n// Julia set — organic alien tendrils\nfloat _julia(vec2 z, vec2 c){\n    float si=0.0;\n    #ifdef MOBILE\n    for(int n=0; n<16; n++){\n    #else\n    for(int n=0; n<36; n++){\n    #endif\n        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;\n        si += (1.0 - step(4.0, dot(z,z)));\n    }\n    #ifdef MOBILE\n    return si / 16.0;\n    #else\n    return si / 36.0;\n    #endif\n}\n#endif\nvec3 _mPal(float t, float seed){\n    // Horror palette — sickly neon\n    vec3 a=vec3(0.5,0.4,0.45);\n    vec3 b=vec3(0.5,0.35,0.5);\n    vec3 c_=vec3(1.0,0.8,1.0);\n    vec3 d=vec3(_mHash(seed)*0.5,_mHash(seed+1.0)*0.3+0.1,_mHash(seed+2.0)*0.4+0.3);\n    return a+b*cos(6.28318*(c_*t+d));\n}\n\nuniform sampler2D u_texLeft;\nuniform sampler2D u_texRight;\nuniform sampler2D u_texTop;\nuniform sampler2D u_texBottom;\nuniform sampler2D u_voidTex;\nuniform sampler2D u_doorClosedTex;\nuniform sampler2D u_doorOpenTex;\nuniform sampler2D u_cockpitTex;\n\n#ifdef MOBILE\nconst int MAX_STEPS = 60;\n#else\nconst int MAX_STEPS = 100;\n#endif\nconst float MAX_DIST  = 25.0;\nconst float SURF_DIST = 0.008;\nconst float FUSE_R      = 1.72;\nconst float FLOOR_Y     = -0.82;\nconst float AISLE_W     = 0.32;\nconst float SEAT_PITCH  = 0.79;\n\nconst float ROW_START   = 5.0;\nconst float EXIT_ROW_Z  = 12.0;\nconst float COCKPIT_Z   = 21.0;\n\nmat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c, -s, s, c); }\nfloat hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat hash1(float x){ return fract(sin(x*127.1)*43758.5453); }\n\nfloat noise2(vec2 p){\n    vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);\n    return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x),u.y);\n}\nfloat fbm(vec2 p){\n    float v=0.0; float a=0.5;\n    mat2 r=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));\n    for(int i=0;i<4;i++){ v+=a*noise2(p); p=r*p*2.0+vec2(100.0); a*=0.5; }\n    return v;\n}\nfloat sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }\nfloat sdRBox(vec3 p, vec3 b, float r){ return sdBox(p,b-r)-r; }\n\nfloat sdSeat(vec3 p){\n    float fy = FLOOR_Y;\n    float cushion = sdBox(p-vec3(0, fy+0.24, 0),        vec3(0.20, 0.045, 0.20));\n    float back    = sdBox(p-vec3(0, fy+0.54,-0.20),      vec3(0.20, 0.24,  0.025));\n    float head    = sdRBox(p-vec3(0, fy+0.86,-0.20),     vec3(0.12, 0.07,  0.03), 0.01);\n    float armL    = sdBox(p-vec3(-0.22, fy+0.32, -0.04), vec3(0.02, 0.055, 0.17));\n    float armR    = sdBox(p-vec3( 0.22, fy+0.32, -0.04), vec3(0.02, 0.055, 0.17));\n    float legs    = sdBox(p-vec3(0, fy+0.11, 0.08),      vec3(0.16, 0.11,  0.025));\n    return min(min(min(cushion,back),min(head,legs)),min(armL,armR));\n}\n\nfloat seatRows(vec3 p){\n    if(p.z < ROW_START - 0.5 || p.z > COCKPIT_Z - 1.0) return 8.0;\n    if(abs(p.z - EXIT_ROW_Z) < 1.5) return 8.0; \n    float cellZ = mod(p.z - ROW_START, SEAT_PITCH) - SEAT_PITCH*0.5;\n    vec3 lp = vec3(p.x, p.y, cellZ);\n    float d = sdSeat(lp - vec3(-AISLE_W-0.25, 0, 0));\n    d = min(d, sdSeat(lp - vec3(-AISLE_W-0.69, 0, 0)));\n    d = min(d, sdSeat(lp - vec3( AISLE_W+0.25, 0, 0)));\n    d = min(d, sdSeat(lp - vec3( AISLE_W+0.69, 0, 0)));\n    return d;\n}\n\nfloat overheadBins(vec3 p){\n    if(abs(p.z - EXIT_ROW_Z) < 1.4) return 8.0;\n    float binL = sdBox(p-vec3(-1.08, 0.72, 12.0), vec3(0.32, 0.14, 10.0));\n    float binR = sdBox(p-vec3( 1.08, 0.72, 12.0), vec3(0.32, 0.14, 10.0));\n    return min(binL, binR);\n}\n\nfloat cockpitWall(vec3 p){\n    float wall = sdBox(p - vec3(0.0, FLOOR_Y + 1.5, COCKPIT_Z), vec3(FUSE_R, 1.5, 0.05));\n    wall = max(wall, length(p.xy)-FUSE_R);\n    wall = max(wall, -(p.y-FLOOR_Y));\n    float doorHole = sdBox(p-vec3(0.0, FLOOR_Y+0.95, COCKPIT_Z), vec3(0.4, 0.95, 0.1));\n    wall = max(wall, -doorHole); \n    return wall;\n}\n\nfloat cockpitDoor(vec3 p) {\n    return sdBox(p-vec3(0.0, FLOOR_Y+0.95, COCKPIT_Z - 0.01), vec3(0.4, 0.95, 0.02));\n}\n\nfloat exitDoor(vec3 p) {\n    return 8.0;\n}\n\nbool inExitHole(vec3 p){\n    return false;\n}\n\nbool isWindowHit(vec3 p){\n    float distToShell = abs(length(p.xy) - FUSE_R);\n    if(distToShell > 0.08) return false;\n    if(p.z < ROW_START || p.z > COCKPIT_Z) return false;\n    float localZ = mod(p.z - ROW_START, SEAT_PITCH);\n    float winCenter = SEAT_PITCH * 0.5;\n    float winH = abs(p.y - 0.18);\n    return abs(localZ - winCenter) < 0.07 && winH < 0.11;\n}\n\nfloat sdFractalStern(vec3 p) {\n    // Fractal floats at the back end of the cabin (stern) — visible after 180 turn\n    vec3 z = p - vec3(0.0, FLOOR_Y + 1.1, ROW_START + 0.5);\n    z.xy *= rot(u_time * 0.13);\n    z.yz *= rot(u_time * 0.17);\n    float scale = 1.0;\n    for(int i = 0; i < 7; i++){\n        z = abs(z);\n        if(z.x < z.y) z.xy = z.yx;\n        if(z.x < z.z) z.xz = z.zx;\n        if(z.y < z.z) z.yz = z.zy;\n        z = z * 2.0 - vec3(0.7);\n        scale *= 2.0;\n    }\n    return (length(z) - 0.15) / scale;\n}\n\nvec2 scene(vec3 p){\n    float toWall  = FUSE_R - length(p.xy);\n    float toFloor = p.y - FLOOR_Y;\n    float toBack  = p.z - 3.49; \n    \n    float d  = min(min(toWall, toFloor), toBack);\n    float id = (d == toFloor) ? 2.0 : 1.0;\n\n    float s = seatRows(p);\n    if(s<d){ d=s; id=3.0; }\n    float b = overheadBins(p);\n    if(b<d){ d=b; id=4.0; }\n    float c = cockpitWall(p);\n    if(c<d){ d=c; id=5.0; }\n    float cd = cockpitDoor(p);\n    if(cd<d){ d=cd; id=10.0; }\n    float ed = exitDoor(p);\n    if(ed<d){ d=ed; id=9.0; }\n    float frac = sdFractalStern(p);\n    if(u_fractalActive > 0.5 && frac < d){ d = frac; id = 11.0; }\n    \n    return vec2(d, id);\n}\n\nvec3 calcNormal(vec3 p){\n    vec2 e = vec2(0.005, 0.0);\n    float d = scene(p).x;\n    return normalize(vec3(scene(p+e.xyy).x-d, scene(p+e.yxy).x-d, scene(p+e.yyx).x-d));\n}\n\nvec3 emergencyStrip(vec3 p){\n    float stripEdge = abs(abs(p.x)-AISLE_W);\n    float onStrip = smoothstep(0.06, 0.0, stripEdge) * smoothstep(FLOOR_Y+0.06, FLOOR_Y+0.005, p.y);\n    float pulse = 0.55 + 0.45*sin(u_time*1.3 + p.z*0.4);\n    return vec3(0.95, 0.12, 0.04) * onStrip * pulse * 4.0;\n}\n\nvoid main() {\n    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;\n    uv *= u_zoom; \n\n    float t_warp = u_time * 0.15;\n    vec2 q = vec2(fbm(uv * 2.0 + vec2(0.0, t_warp)), fbm(uv * 2.0 + vec2(t_warp, 0.0)));\n    vec2 warpR = vec2(\n        fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t_warp),\n        fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t_warp)\n    );\n    float liqAmp = mix(0.015, 0.10, u_isOOB) * u_trip;\n    uv += (warpR - 0.5) * liqAmp;\n\n    // Surge / snap — driven by modeSeed, randomizes on each blink\n    float mt = u_modeTime * u_isOOB;\n    float w1 = sin(mt * 0.4 + u_modeSeed);\n    float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);\n    float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);\n    float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);\n    float snap  = pow(surge, 2.0) * 8.0 * u_isOOB;\n    uv *= 1.0 + mt * 0.003 + snap * 0.015;\n\n    // Glitch scanline — random horizontal offset burst\n    float gTick = floor(u_time * 16.0);\n    if(step(0.979, hash1(gTick * 133.77 + u_modeSeed)) > 0.0)\n        uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5)\n                 * 0.18 * clamp(u_trip, 0.0, 1.5);\n\n    // Shake\n    float latShake = u_shake * 5.0;\n    uv.x += sin(u_time * 40.0) * 0.012 * latShake;\n    uv.y += cos(u_time * 25.0) * 0.012 * latShake;\n\n    float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;\n    float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;\n    \n    vec3 ro = vec3(bobX + u_camX, bobY + snap * 0.08, u_camZ); \n    vec3 rd = normalize(vec3(uv.x, uv.y, 1.6));\n    \n    float yaw   = u_yawOffset - (u_mouse.x * 0.42);\n    float pitch = u_mouse.y * 0.26;\n    rd.yz *= rot(pitch);\n    rd.xz *= rot(yaw);   \n\n    if (u_doorSwitched > 0.5) {\n        rd.x += sin(u_time*2.3)*0.015 * latShake; \n        rd = normalize(rd);\n    }\n\n    vec3 finalCol = vec3(0.0);\n    float t_march = 0.0;\n    bool doRaymarch = false;\n    float t_box = 0.0;\n\n    if (u_camZ < 3.49) {\n        vec3 box = vec3(0.5625, 1.0, 3.5); \n        vec3 tPos = (box * sign(rd) - ro) / rd;\n        t_box = min(min(tPos.x, tPos.y), tPos.z);\n        vec3 boxHit = ro + rd * t_box;\n        vec3 nPos = boxHit / box;\n        vec3 absPos = abs(nPos);\n        \n        int wallID = -1; \n        vec2 tileUV;\n        \n        if (absPos.x > absPos.y && absPos.x > absPos.z) {\n            if (nPos.x > 0.0) { tileUV = vec2(-nPos.z, -nPos.y) * 0.5 + 0.5; finalCol = texture2D(u_texRight, tileUV).rgb; wallID = 1; } \n            else              { tileUV = vec2(nPos.z, -nPos.y) * 0.5 + 0.5; finalCol = texture2D(u_texLeft, tileUV).rgb; wallID = 0; }\n        } else if (absPos.y > absPos.x && absPos.y > absPos.z) {\n            if (nPos.y > 0.0) { tileUV = vec2(nPos.x, -nPos.z) * 0.5 + 0.5; finalCol = texture2D(u_texTop, tileUV).rgb; wallID = 4; } \n            else              { tileUV = vec2(nPos.x, nPos.z) * 0.5 + 0.5; finalCol = texture2D(u_texBottom, tileUV).rgb; wallID = 4; }\n        } else {\n            if (nPos.z > 0.0) { wallID = 2; } \n            else              { wallID = 3; finalCol = vec3(0.0); } \n        }\n\n        if (wallID == 2) {\n            if (u_altRoute > 0.5) {\n                vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                vec3 bhCol = texture2D(u_voidTex, clamp(vuv, 0.0, 1.0)).rgb;\n                float fogFactor = exp(-t_box * 0.16);\n                finalCol = mix(vec3(0.012, 0.009, 0.020), bhCol, fogFactor);\n            } else {\n                doRaymarch = true;\n                t_march = t_box;\n            }\n        } else if (wallID != 3) {\n            vec4 tcol = (wallID==1) ? texture2D(u_texRight, tileUV) : ((wallID==0) ? texture2D(u_texLeft, tileUV) : vec4(1.0));\n            if (tcol.a < 0.1 || (tcol.g > 0.4 && tcol.r < 0.25 && tcol.b < 0.25)) {\n                // Doorway — show dark interior room glimpse, not empty void\n                float depthFog = exp(-t_box * 0.4);\n                vec3 roomCol = (wallID == 0)\n                    ? vec3(0.06, 0.04, 0.04)   // left door: dark bathroom warm\n                    : vec3(0.04, 0.04, 0.07);  // right door: dark bedroom cool\n                // Subtle voidTex bleed so it's not completely dead\n                vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                vec3 voidHint = texture2D(u_voidTex, vuv).rgb * 0.15;\n                finalCol = mix(roomCol + voidHint, vec3(0.03, 0.01, 0.01), 1.0 - depthFog);\n            } else {\n                finalCol = tcol.rgb;\n                float fogFactor = exp(-t_box * 0.5);\n                finalCol = mix(vec3(0.03, 0.01, 0.01), finalCol, fogFactor);\n                float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));\n                finalCol = mix(finalCol, vec3(lum * 0.85, lum * 0.7, lum * 0.7), 0.4);\n            }\n        }\n    } else {\n        doRaymarch = true;\n        t_march = 0.0;\n    }\n\n    if (doRaymarch) {\n        vec3 cp_ro = ro + rd * t_march; \n\n        float t = 0.0; float mid = 0.0; bool hit = false;\n        for(int i=0; i<MAX_STEPS; i++){\n            vec3 p = cp_ro + rd*t;\n            vec2 res = scene(p);\n            if(res.x < SURF_DIST){ mid = res.y; hit = true; break; }\n            if(t > MAX_DIST) break;\n            t += res.x * 0.7;\n        }\n\n        vec3 col = vec3(0.01, 0.012, 0.025);\n        vec3 fogCol = vec3(0.008, 0.008, 0.012);\n\n        if(!hit) {\n            vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n            col = mix(texture2D(u_voidTex, vuv).rgb * 0.3, fogCol, 0.85);\n        } else {\n            vec3 p = cp_ro + rd*t;\n            float totalDist = t_march + t;\n            float fogAmt = clamp((totalDist - 6.0) / 12.0, 0.0, 1.0);\n            fogAmt = fogAmt * fogAmt;\n            \n            if(mid > 4.5 && mid < 5.5) { \n                vec3 n = calcNormal(p);\n                col = vec3(0.1, 0.12, 0.15) * (max(dot(n, vec3(0,0,-1)), 0.0) * 0.4 + 0.15);\n                col = mix(col, fogCol, fogAmt);\n\n            } else if(mid > 9.5 && mid < 10.5) { \n                vec2 cpUV = vec2((p.x + 0.4) / 0.80, 1.0 - ((p.y - FLOOR_Y) / 1.9));\n                vec4 cpTex = texture2D(u_cockpitTex, clamp(cpUV, 0.0, 1.0));\n                \n                if (cpTex.a < 0.2) {\n                    vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                    col = texture2D(u_voidTex, vuv).rgb * 1.2;\n                } else {\n                    vec3 n = calcNormal(p);\n                    col = cpTex.rgb * (max(dot(n, vec3(0,0,-1)), 0.0) * 0.6 + 0.4);\n                    col = mix(col, fogCol, fogAmt);\n                }\n\n            } else if(mid > 10.5 && mid < 11.5) {\n                // Stern fractal — visible after 180 turn at cockpit\n                // Pulsing, breathing geometry that shouldn't exist\n                vec3 n = calcNormal(p);\n                float pulse = 0.5 + 0.5 * sin(u_time * 2.5 + length(p) * 3.0);\n                float pulse2 = 0.5 + 0.5 * sin(u_time * 1.1 + p.y * 5.0);\n                // Deep red → magenta → void black cycling\n                vec3 fracCol = mix(vec3(0.6, 0.02, 0.08), vec3(0.8, 0.05, 0.5), pulse);\n                fracCol = mix(fracCol, vec3(0.02, 0.0, 0.05), pulse2 * 0.4);\n                // Lighting: overhead + emergency strip glow\n                float diff = max(dot(n, normalize(vec3(0.0, 1.0, 1.0))), 0.0) * 0.8 + 0.2;\n                // Inner glow — brighter at the core\n                float coreDist = length(p - vec3(0.0, FLOOR_Y + 1.1, ROW_START + 0.5));\n                float coreGlow = exp(-coreDist * 2.0) * 1.5;\n                col = fracCol * diff + vec3(0.9, 0.1, 0.3) * coreGlow;\n                // Fractal ignores fog — it glows through the darkness\n\n            } else if(mid < 1.5 && isWindowHit(p)) {\n                vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                col = texture2D(u_voidTex, vuv).rgb * mix(1.0, 1.5, fogAmt);\n\n            } else {\n                vec3 n = calcNormal(p);\n                vec3 matCol;\n                if(mid < 1.5)      matCol = vec3(0.45, 0.47, 0.50);\n                else if(mid < 2.5) matCol = vec3(0.14, 0.14, 0.16) + hash2(floor(p.xz*18.0))*0.04;\n                else if(mid < 3.5) matCol = vec3(0.15, 0.17, 0.32);\n                else               matCol = vec3(0.48, 0.48, 0.52);\n\n                float flicker = 0.7 + 0.3 * sin(u_time*3.9) * sin(u_time*5.7+1.4);\n                vec3 ambient = vec3(0.22, 0.24, 0.28) * flicker;\n                vec3 cockpitLit = vec3(0.15, 0.22, 0.28) * max(dot(n, vec3(0,0,-1)), 0.0) * smoothstep(COCKPIT_Z, COCKPIT_Z-10.0, p.z) * 2.5;\n\n                col = matCol * (ambient + emergencyStrip(p) + cockpitLit);\n                col = mix(col, fogCol, fogAmt);\n\n                // ── EXIT DOOR TEXTURE — mapped onto the port wall ──\n                // Door area: port side wall, near EXIT_ROW_Z\n                if(mid < 1.5 && p.x < -0.5) {\n                    float doorH = 1.8;\n                    float doorW = 1.0;\n                    float doorBottom = FLOOR_Y + 0.08;\n                    float doorLeft = EXIT_ROW_Z - doorW * 0.5;\n                    \n                    // UV mapping: Z maps to U, Y maps to V\n                    float du = (p.z - doorLeft) / doorW;\n                    float dv = 1.0 - (p.y - doorBottom) / doorH;\n                    \n                    if(du > 0.0 && du < 1.0 && dv > 0.0 && dv < 1.0) {\n                        vec2 doorUV = vec2(du, dv);\n                        vec4 dTex = (u_doorSwitched > 0.5)\n                            ? texture2D(u_doorOpenTex, doorUV)\n                            : texture2D(u_doorClosedTex, doorUV);\n                        \n                        if(u_doorSwitched > 0.5 && dTex.a < 0.3) {\n                            // Transparent part of door-open.png — show the void\n                            vec2 vuv = gl_FragCoord.xy / u_resolution.xy;\n                            col = texture2D(u_voidTex, vuv).rgb * 1.2;\n                        } else {\n                            // Door texture visible\n                            col = dTex.rgb * 0.8;\n                        }\n                    }\n                }\n            }\n        }\n        \n        col += vec3(1.0, 0.9, 0.9) * u_flash; \n        finalCol = col;\n    } \n    \n    finalCol *= smoothstep(1.3, 0.2, length(uv)) * 0.65;\n\n    // ═══ CABIN HALLUCINATION — Burning Ship/Julia bleeding into reality ═══\n    // Active after cockpit. Builds from peripheral halos to full-screen horror.\n    if (u_fractalActive > 0.5) {\n        vec2 suv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;\n        float r = length(suv);\n        float periph = smoothstep(0.18, 0.85, r);\n\n        // Blink surge + persistent base (never fully gone)\n        float env = smoothstep(6.0, 0.0, u_blinkAge) * 0.35 + 0.15;\n        float strength = periph * env * u_trip;\n\n        if (strength > 0.005) {\n            float typeRoll = _mHash(u_fractalSeed * 3.7);\n            float zoom = mix(0.8, 3.5, _mHash(u_fractalSeed * 1.3));\n            vec2 drift = vec2(sin(u_time*0.03+u_fractalSeed)*0.2, cos(u_time*0.02+u_fractalSeed*1.7)*0.2);\n            vec2 sUV = suv / zoom + drift;\n            float val = 0.0;\n\n            if(typeRoll < 0.45) {\n                // Burning Ship — melting buildings\n                vec2 region = vec2(-1.76, -0.028) + vec2(_mHash(u_fractalSeed*5.1)-0.5, _mHash(u_fractalSeed*7.3)-0.5)*0.3;\n                val = _burningShip(sUV * 0.5 + region);\n            } else if(typeRoll < 0.75) {\n                // Julia set — organic tendrils\n                vec2 jc = vec2(-0.8+sin(u_time*0.015+u_fractalSeed)*0.15, 0.156+cos(u_time*0.012)*0.1);\n                val = _julia(sUV * 0.8, jc);\n            } else {\n                // Deep Burning Ship zoom — antenna/mast structures\n                val = _burningShip(sUV * 0.08 + vec2(-1.755, -0.022));\n            }\n\n            val = fract(val * 3.5 + u_time * 0.04);\n            vec3 fracHalo = _mPal(val, u_fractalSeed * 11.3);\n            fracHalo *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);\n            float pulse = 0.55 + 0.45 * sin(u_time * (0.9 + _mHash(u_fractalSeed*4.0)) + u_fractalSeed);\n            finalCol += fracHalo * strength * pulse;\n\n            // Second layer: faint ghost from different region — creates depth\n            float ghost = _burningShip(suv * 0.3 + vec2(-1.77, -0.01) + drift * 0.5);\n            ghost = fract(ghost * 2.0 + u_time * 0.025);\n            vec3 ghostCol = _mPal(ghost, u_fractalSeed * 7.0 + 50.0) * smoothstep(0.0, 0.15, ghost);\n            finalCol += ghostCol * periph * env * 0.06 * u_trip;\n        }\n    }\n\n    gl_FragColor = vec4(finalCol * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);\n}\n"),
        (GLSL.modules.z3_fall =
          "\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nuniform vec2  u_resolution;\nuniform vec2  u_mouse;\nuniform float u_time;\nuniform float u_fallProgress;\nuniform float u_blink;\n\n#ifdef MOBILE\nconst int MAX_STEPS = 50;\n#else\nconst int MAX_STEPS = 90;\n#endif\nconst float MAX_DIST = 80.0;\nconst float SURF_DIST = 0.015;\n\nfloat hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nmat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }\nfloat sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }\n\nvec2 map(vec3 p) {\n    vec2 cell = floor(p.xz * 0.4);\n    vec2 local = fract(p.xz * 0.4) - 0.5;\n    \n    bool isTarget = (cell.x == 0.0 && cell.y == 0.0);\n    float h = isTarget ? 3.0 : hash(cell) * 6.0 + 1.0;\n    \n    float dFloor = p.y;\n    \n    vec3 q = vec3(local.x * 2.5, p.y - h*0.5, local.y * 2.5);\n    float dBldg = sdBox(q, vec3(0.8, h*0.5, 0.8)); \n    dBldg /= 2.5; \n    \n    float d = min(dFloor, dBldg);\n    float id = (d == dFloor) ? 1.0 : (isTarget ? 3.0 : 2.0);\n    return vec2(d, id);\n}\n\nvec3 calcNormal(vec3 p) {\n    vec2 e = vec2(0.01, 0.0);\n    float d = map(p).x;\n    return normalize(vec3(map(p+e.xyy).x-d, map(p+e.yxy).x-d, map(p+e.yyx).x-d));\n}\n\nvoid main() {\n    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;\n    \n    float startY = 60.0;\n    float endY = 3.5;\n    float ease = 1.0 - pow(1.0 - u_fallProgress, 2.0);\n    float camY = mix(startY, endY, ease);\n    \n    vec3 ro = vec3(0.0, camY, 0.0);\n    \n    ro.x += sin(u_fallProgress * 6.0) * 3.0 * (1.0 - u_fallProgress);\n    ro.z += cos(u_fallProgress * 5.0) * 3.0 * (1.0 - u_fallProgress);\n    \n    vec3 fwd = normalize(vec3(0.0, -1.0, 0.0));\n    vec3 right = normalize(vec3(1.0, 0.0, 0.0));\n    vec3 up = cross(right, fwd);\n    \n    float spin = u_fallProgress * 3.1415 * 0.5;\n    right.xz *= rot(spin);\n    up.xz *= rot(spin);\n    \n    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);\n    \n    rd.xy *= rot(u_mouse.y * 0.2);\n    rd.xz *= rot(u_mouse.x * 0.2);\n\n    float t = 0.0;\n    float id = 0.0;\n    for(int i=0; i<MAX_STEPS; i++) {\n        vec3 p = ro + rd * t;\n        vec2 res = map(p);\n        if(res.x < SURF_DIST) { id = res.y; break; }\n        if(t > MAX_DIST) break;\n        t += res.x * 0.7; \n    }\n\n    vec3 col = vec3(0.01, 0.01, 0.02); \n    \n    if(t < MAX_DIST) {\n        vec3 p = ro + rd * t;\n        vec3 n = calcNormal(p);\n        \n        if(id == 1.0) { \n            col = vec3(0.04, 0.03, 0.02);\n            float gridX = smoothstep(0.9, 1.0, sin(p.x * 3.1415 * 0.4));\n            float gridZ = smoothstep(0.9, 1.0, sin(p.z * 3.1415 * 0.4));\n            col += vec3(1.0, 0.6, 0.2) * (gridX + gridZ) * 0.7; \n            \n            float cars = step(0.95, fract(p.x * 2.0 + u_time * 2.0)) * gridZ;\n            cars += step(0.95, fract(p.z * 2.0 - u_time * 2.5)) * gridX;\n            col += vec3(1.0, 0.2, 0.1) * cars;\n            \n        } else if(id == 2.0) { \n            col = vec3(0.02, 0.02, 0.03);\n            if (abs(n.y) < 0.1) { \n                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);\n                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));\n                float r = hash(floor(winUV * 3.0) + floor(p.xz));\n                if(r > 0.8) col += vec3(0.8, 0.8, 0.6) * win; \n                if(r > 0.95) col += vec3(0.4, 0.7, 1.0) * win; \n            } else { \n                col = vec3(0.01, 0.01, 0.015);\n                float ac = step(0.9, fract(p.x*2.0)*fract(p.z*2.0));\n                col += vec3(0.1) * ac;\n            }\n        } else if(id == 3.0) { \n            col = vec3(0.03);\n            if (abs(n.y) > 0.9) { \n                float dCenter = length(p.xz);\n                float ring = smoothstep(0.08, 0.0, abs(dCenter - 0.8));\n                \n                float pulse = 0.5 + 0.5 * sin(u_time * 4.0);\n                col += vec3(1.0, 0.1, 0.1) * ring * pulse * 2.0; \n                \n                float H = smoothstep(0.05, 0.0, abs(p.x)) * step(abs(p.z), 0.4) + \n                          smoothstep(0.05, 0.0, abs(p.x - 0.4)) * step(abs(p.z), 0.4) + \n                          smoothstep(0.05, 0.0, abs(p.x + 0.4)) * step(abs(p.z), 0.4) +\n                          smoothstep(0.05, 0.0, abs(p.z)) * step(abs(p.x), 0.4); \n                col += vec3(0.8) * H;\n            } else {\n                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);\n                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));\n                if(hash(floor(winUV * 3.0) + floor(p.xz)) > 0.5) col += vec3(0.9, 0.2, 0.2) * win;\n            }\n        }\n        \n        col = mix(col, vec3(0.01, 0.015, 0.02), 1.0 - exp(-t * 0.02));\n    }\n    \n    col += vec3(1.0, 0.5, 0.2) * 0.08 * (1.0 - exp(-t * 0.005));\n    \n    float flash = smoothstep(0.15, 0.0, u_fallProgress) + smoothstep(0.64, 0.666, u_fallProgress);\n    col = mix(col, vec3(1.0), clamp(flash, 0.0, 1.0));\n    \n    gl_FragColor = vec4(col * (1.0 - u_blink), 1.0);\n}\n"));
      let z3SpaceHeld = !1,
        z3TouchHeld = !1;
      function checkZ3Touch(t) {
        if (!t.touches) return;
        if (!window.currentZone3 && !z3SpaceHeld)
          return void (z3TouchHeld = !1);
        let e = !1;
        const i =
          "function" == typeof window.__mobileWalkZoneContains
            ? window.__mobileWalkZoneContains
            : (t, e) => {
                const i = window.innerWidth;
                return (
                  e >= 0.68 * window.innerHeight && t >= 0.3 * i && t <= 0.7 * i
                );
              };
        for (let n = 0; n < t.touches.length; n++) {
          const o = t.touches[n];
          if (i(o.clientX, o.clientY)) {
            e = !0;
            break;
          }
        }
        z3TouchHeld = e;
      }
      (window.addEventListener("keydown", (t) => {
        "Space" === t.code && (t.preventDefault(), (z3SpaceHeld = !0));
      }),
        window.addEventListener("keyup", (t) => {
          "Space" === t.code && (t.preventDefault(), (z3SpaceHeld = !1));
        }),
        window.addEventListener("touchstart", checkZ3Touch, { passive: !1 }),
        window.addEventListener("touchmove", checkZ3Touch, { passive: !1 }),
        window.addEventListener("touchend", checkZ3Touch, { passive: !1 }),
        window.addEventListener("touchcancel", () => {
          z3TouchHeld = !1;
        }));
      class Zone3Engine {
        constructor(t) {
          ((this.route = "z3b" === t ? "z3b" : "z3"),
            (this.isAltRoute = "z3b" === this.route),
            (this.bathroomProg = this._buildProg("z3_bathroom")),
            (this.bedroomProg = this._buildProg("z3_bedroom")),
            (this.centerProg = this._buildProg("z3_merged")),
            (this.fallProg = this._buildProg("z3_fall")),
            (this.voidScreenProg = this._buildProg("z2_seq_hole")),
            (this.blackholeProg = this._buildProg("z3_alt_blackhole_walk")),
            (this.texBathroomHole = loadStaticTex(
              "files/img/rooms/z2/bathroom-hole.png",
            )),
            (this.texBedroom = loadStaticTex(
              "files/img/rooms/z2/bedrooom.png",
            )),
            (this.texDoorClosed = loadStaticTex(
              "files/img/rooms/z3/door-closed.png",
            )),
            (this.texDoorOpen = loadStaticTex(
              "files/img/rooms/z3/door-open.png",
            )),
            (this.texCockpit = loadStaticTex("files/img/rooms/z3/cockpit.png")),
            (this.texHallLeft = loadStaticTex(
              "files/img/rooms/z2/hallway/RIGHTWALL.png",
            )),
            (this.texHallRight = loadStaticTex(
              "files/img/rooms/z2/hallway/LEFTWALL_B.png",
            )),
            (this.texHallTop = loadStaticTex(
              "files/img/rooms/z2/hallway/TOP.png",
            )),
            (this.texHallBottom = loadStaticTex(
              "files/img/rooms/z2/hallway/GROUND.png",
            )),
            (this.quadBuf = gl.createBuffer()),
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf),
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 3, -1, -1, 3]),
              gl.STATIC_DRAW,
            ),
            (this.voidFBO = this._makeFBO()),
            (this.voidMode =
              this.isAltRoute || "undefined" == typeof ActiveMode
                ? null
                : new ActiveMode(2)),
            this.voidMode && (this.voidMode.maskTex = this._makeBlankTex()),
            (this.activePOV = this.isAltRoute ? "right" : "left"),
            (this.centerPhase = "hallway"),
            (this.voidStart = 0),
            (this.bhCamPos = { x: 0, y: 1.68, z: 70 }),
            (this.bhYaw = 0),
            (this.bhPitch = -0.05),
            (this.bhMovePhase = 0),
            (this.bhSpeed = 0),
            (this.HALL_START_Z = -3.4),
            (this.HALL_END_Z = 3.5),
            (this.EXIT_ROW_Z = 12),
            (this.COCKPIT_Z = 21),
            (this.camZ = this.HALL_START_Z),
            (this.camX = 0),
            (this.cabinState = "forward"),
            (this.doorOpen = 0),
            (this.suctionShake = 0),
            (this.flashVal = 0),
            (this.yawOffset = 0),
            (this.yawTarget = 0),
            (this.zoom = 1),
            (this.zoomTarget = 1),
            (this.suctionFade = 0),
            (this.fractalActive = 0),
            (this.doorSwitched = 0),
            (this.suctionYawSnapped = !1),
            (this.fallStart = 0),
            (this.fallProgress = 0),
            (this.isResetting = !1),
            (this.slideState = "idle"),
            (this.slideStart = 0),
            (this.pendingPOV = null),
            (this.slideDir = 0),
            (this.slideOffset = 0),
            (this.povSwitchTime = -9999),
            (this.cx = 0),
            (this.cy = 0),
            (this.lastRenderTime = performance.now()),
            (this.z3ModeSeed = 100 * Math.random()),
            (this.blackholeSeed = 1e4 * Math.random()),
            (this.z3Trip = 0.5),
            (this.z3ModeTime = 0),
            (this.z3IsOOB = 0),
            (this.z3ModeStart = performance.now()),
            (this.z3BlinkPeakTime = performance.now()),
            (this.lastBlinkTime = performance.now()),
            (this.nextBlinkInterval = 3e3 + 6e3 * Math.random()),
            (this.blinking = !1),
            (this.blinkStart = 0),
            (this.blinkSeeded = !1),
            (this.rBlink = 0),
            (this.z3RedStart = performance.now()),
            (this.z3RedDone = !1),
            (this.bhEscapeArmed = !1),
            (this.bhEscapeBlinkCount = 0),
            (this.bhEscapePhase = "none"),
            (this.bhEscapeStart = 0),
            this._resetBlackholeStart(),
            this._initAudio());
        }
        _initAudio() {
          const t = window.__audioCtx;
          if (t)
            try {
              ((this._humOsc = t.createOscillator()),
                (this._humGain = t.createGain()),
                (this._humOsc.type = "sine"),
                (this._humOsc.frequency.value = 62),
                (this._humGain.gain.value = 0),
                this._humOsc.connect(this._humGain),
                this._humGain.connect(t.destination),
                this._humOsc.start());
            } catch (t) {}
        }
        _updateAudio(t) {
          const e = window.__audioCtx;
          if (!e) return;
          const i = e.currentTime,
            n = window.__audioWetGain,
            o = window.__audioDryGain,
            s = window.__audioFilter;
          if ("hallway" === this.centerPhase) {
            const t = Math.max(
              0,
              Math.min(
                1,
                (this.camZ - this.HALL_START_Z) /
                  (this.HALL_END_Z - this.HALL_START_Z),
              ),
            );
            (n &&
              n.gain.setTargetAtTime(
                (this.isAltRoute ? 0.28 : 0.2) +
                  t * (this.isAltRoute ? 0.18 : 0.1),
                i,
                1,
              ),
              o &&
                o.gain.setTargetAtTime(
                  (this.isAltRoute ? 0.44 : 0.5) - 0.16 * t,
                  i,
                  1,
                ),
              s &&
                s.frequency.setTargetAtTime(
                  (this.isAltRoute ? 520 : 650) -
                    t * (this.isAltRoute ? 260 : 180),
                  i,
                  1,
                ),
              this._humGain &&
                this._humGain.gain.setTargetAtTime(
                  (this.isAltRoute ? 0.008 : 0.004) +
                    t * (this.isAltRoute ? 0.02 : 0.01),
                  i,
                  1,
                ),
              this._humOsc &&
                this._humOsc.frequency.setTargetAtTime(
                  (this.isAltRoute ? 52 : 62) + t * (this.isAltRoute ? 18 : 8),
                  i,
                  1,
                ));
          } else if ("cabin" === this.centerPhase) {
            const t = Math.max(
              0,
              Math.min(
                1,
                (this.camZ - this.HALL_END_Z) /
                  (this.COCKPIT_Z - this.HALL_END_Z),
              ),
            );
            if (
              (n && n.gain.setTargetAtTime(0.3 - 0.15 * t, i, 2),
              s && s.frequency.setTargetAtTime(500 - 220 * t, i, 2),
              this._humGain &&
                this._humGain.gain.setTargetAtTime(0.025 * t, i, 3),
              "cockpit_turbulence" === this.cabinState &&
                s &&
                s.frequency.setTargetAtTime(200 + 150 * Math.random(), i, 0.08),
              "suction" === this.cabinState)
            ) {
              const t = Math.abs(this.camX) / 1.1;
              (s &&
                s.frequency.setTargetAtTime(
                  Math.max(80, 280 - 200 * t),
                  i,
                  0.4,
                ),
                this._humGain &&
                  this._humGain.gain.setTargetAtTime(0.025 + 0.04 * t, i, 0.4),
                this._humOsc &&
                  this._humOsc.frequency.setTargetAtTime(62 + 30 * t, i, 0.4));
            }
          } else if ("void" === this.centerPhase)
            if (this.isAltRoute) {
              let e = 0;
              try {
                if (window.audioAnalyser && window.audioData) {
                  window.audioAnalyser.getByteFrequencyData(window.audioData);
                  let t = 0;
                  const i = Math.min(12, window.audioData.length);
                  for (let e = 0; e < i; e++) t += window.audioData[e];
                  e = i > 0 ? t / (255 * i) : 0;
                }
              } catch (t) {}
              if ("rising" === this.bhEscapePhase) {
                const e = Math.min((t - this.bhEscapeStart) / 3e3, 1);
                (n && n.gain.setTargetAtTime(0.34 + 0.15 * e, i, 0.3),
                  s && s.frequency.setTargetAtTime(180 - 80 * e, i, 0.3),
                  this._humGain &&
                    this._humGain.gain.setTargetAtTime(
                      0.025 + 0.03 * e,
                      i,
                      0.3,
                    ),
                  this._humOsc &&
                    this._humOsc.frequency.setTargetAtTime(
                      42 + 20 * e,
                      i,
                      0.3,
                    ));
              } else if ("sucking" === this.bhEscapePhase) {
                const e = Math.min((t - this.bhEscapeStart) / 4e3, 1);
                (n && n.gain.setTargetAtTime(0.49 + 0.2 * e, i, 0.2),
                  o && o.gain.setTargetAtTime(0.3 - 0.2 * e, i, 0.2),
                  s && s.frequency.setTargetAtTime(100 - 50 * e, i, 0.2),
                  this._humGain &&
                    this._humGain.gain.setTargetAtTime(
                      0.055 + 0.04 * e,
                      i,
                      0.2,
                    ),
                  this._humOsc &&
                    this._humOsc.frequency.setTargetAtTime(
                      62 + 40 * e,
                      i,
                      0.2,
                    ));
              } else
                "warp" === this.bhEscapePhase
                  ? (n && n.gain.setTargetAtTime(0.69, i, 0.08),
                    o && o.gain.setTargetAtTime(0.05, i, 0.08),
                    s && s.frequency.setTargetAtTime(40, i, 0.08),
                    this._humGain &&
                      this._humGain.gain.setTargetAtTime(0.1, i, 0.08),
                    this._humOsc &&
                      this._humOsc.frequency.setTargetAtTime(120, i, 0.08))
                  : "black" === this.bhEscapePhase ||
                      "falling" === this.bhEscapePhase
                    ? (n && n.gain.setTargetAtTime(0, i, 0.3),
                      o && o.gain.setTargetAtTime(0, i, 0.3),
                      this._humGain &&
                        this._humGain.gain.setTargetAtTime(0, i, 0.2))
                    : (n && n.gain.setTargetAtTime(0.34 + 0.18 * e, i, 0.45),
                      o && o.gain.setTargetAtTime(0.22 + 0.08 * e, i, 0.45),
                      s &&
                        s.frequency.setTargetAtTime(
                          180 + 260 * e + 25 * Math.sin(0.0017 * t),
                          i,
                          0.35,
                        ),
                      this._humGain &&
                        this._humGain.gain.setTargetAtTime(
                          0.02 + 0.028 * e,
                          i,
                          0.35,
                        ),
                      this._humOsc &&
                        this._humOsc.frequency.setTargetAtTime(
                          42 + 18 * e,
                          i,
                          0.35,
                        ));
            } else
              (n && n.gain.setTargetAtTime(0, i, 0.7),
                o && o.gain.setTargetAtTime(0, i, 0.7),
                this._humGain && this._humGain.gain.setTargetAtTime(0, i, 0.3));
          else
            "falling" === this.centerPhase &&
              (n && n.gain.setTargetAtTime(0, i, 0.5),
              o && o.gain.setTargetAtTime(0, i, 0.5),
              this._humGain && this._humGain.gain.setTargetAtTime(0, i, 0.3));
        }
        _destroyAudio() {
          try {
            (this._humOsc && (this._humOsc.stop(), this._humOsc.disconnect()),
              this._humGain && this._humGain.disconnect());
          } catch (t) {}
        }
        _buildProg(t) {
          if (!GLSL.modules[t]) return null;
          var e = GLSL.modules[t];
          (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)) &&
            (e = "#define MOBILE\n" + e);
          const i = gl.createProgram(),
            n = compile(gl.VERTEX_SHADER, GLSL.vert),
            o = gl.createShader(gl.FRAGMENT_SHADER);
          return (
            gl.shaderSource(o, e),
            gl.compileShader(o),
            gl.getShaderParameter(o, gl.COMPILE_STATUS)
              ? (gl.attachShader(i, n),
                gl.attachShader(i, o),
                gl.linkProgram(i),
                gl.getProgramParameter(i, gl.LINK_STATUS)
                  ? i
                  : (console.error(
                      "[Z3 SHADER LINK ERROR] " + t + ":",
                      gl.getProgramInfoLog(i),
                    ),
                    null))
              : (console.error(
                  "[Z3 SHADER COMPILE ERROR] " + t + ":",
                  gl.getShaderInfoLog(o),
                ),
                null)
          );
        }
        _makeFBO() {
          const t = document.getElementById("c");
          var e = t ? t.width : window.innerWidth,
            i = t ? t.height : window.innerHeight;
          (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)) &&
            ((e = Math.floor(0.5 * e)), (i = Math.floor(0.5 * i)));
          const n = gl.createTexture();
          (gl.bindTexture(gl.TEXTURE_2D, n),
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              e,
              i,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              null,
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
            ));
          const o = gl.createFramebuffer();
          return (
            gl.bindFramebuffer(gl.FRAMEBUFFER, o),
            gl.framebufferTexture2D(
              gl.FRAMEBUFFER,
              gl.COLOR_ATTACHMENT0,
              gl.TEXTURE_2D,
              n,
              0,
            ),
            gl.bindFramebuffer(gl.FRAMEBUFFER, null),
            { fbo: o, tex: n }
          );
        }
        _makeBlankTex() {
          const t = gl.createTexture();
          return (
            gl.bindTexture(gl.TEXTURE_2D, t),
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
            t
          );
        }
        _drawQuad(t) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
          const e = gl.getAttribLocation(t, "p");
          (gl.enableVertexAttribArray(e),
            gl.vertexAttribPointer(e, 2, gl.FLOAT, !1, 0, 0),
            gl.drawArrays(gl.TRIANGLES, 0, 3));
        }
        _drawOverlay(t, e, i, n) {
          n <= 0 ||
            (this._overlayProg ||
              ((this._overlayProg = gl.createProgram()),
              gl.attachShader(
                this._overlayProg,
                compile(gl.VERTEX_SHADER, GLSL.vert),
              ),
              gl.attachShader(
                this._overlayProg,
                compile(
                  gl.FRAGMENT_SHADER,
                  "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }",
                ),
              ),
              gl.linkProgram(this._overlayProg)),
            gl.useProgram(this._overlayProg),
            gl.enable(gl.BLEND),
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
            gl.uniform4f(
              gl.getUniformLocation(this._overlayProg, "u_col"),
              t,
              e,
              i,
              n,
            ),
            this._drawQuad(this._overlayProg),
            gl.disable(gl.BLEND));
        }
        _ensurePortalCompositeProg() {
          this._portalCompositeProg ||
            ((this._portalCompositeProg = gl.createProgram()),
            gl.attachShader(
              this._portalCompositeProg,
              compile(gl.VERTEX_SHADER, GLSL.vert),
            ),
            gl.attachShader(
              this._portalCompositeProg,
              compile(
                gl.FRAGMENT_SHADER,
                "\n            precision mediump float;\n            uniform sampler2D u_tex;\n            uniform vec2 u_resolution;\n            uniform float u_alpha;\n            uniform float u_radius;\n            uniform float u_soft;\n            void main() {\n                vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n                vec2 p = uv * 2.0 - 1.0;\n                p.x *= u_resolution.x / u_resolution.y;\n                float mask = smoothstep(u_radius + u_soft, u_radius - u_soft, length(p));\n                vec3 col = texture2D(u_tex, uv).rgb;\n                gl_FragColor = vec4(col, mask * u_alpha);\n            }\n        ",
              ),
            ),
            gl.linkProgram(this._portalCompositeProg));
        }
        _drawPortalComposite(t, e, i, n, o, s) {
          !t ||
            n <= 0.001 ||
            (this._ensurePortalCompositeProg(),
            gl.useProgram(this._portalCompositeProg),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, t),
            gl.uniform1i(
              gl.getUniformLocation(this._portalCompositeProg, "u_tex"),
              0,
            ),
            gl.uniform2f(
              gl.getUniformLocation(this._portalCompositeProg, "u_resolution"),
              e,
              i,
            ),
            gl.uniform1f(
              gl.getUniformLocation(this._portalCompositeProg, "u_alpha"),
              n,
            ),
            gl.uniform1f(
              gl.getUniformLocation(this._portalCompositeProg, "u_radius"),
              o,
            ),
            gl.uniform1f(
              gl.getUniformLocation(this._portalCompositeProg, "u_soft"),
              s,
            ),
            gl.enable(gl.BLEND),
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA),
            this._drawQuad(this._portalCompositeProg),
            gl.disable(gl.BLEND));
        }
        _bhPathCenterX(t) {
          const e = Math.max(0, Math.min(1, (-t - 50) / 2800));
          return (
            22 * Math.sin(0.00165 * t + 0.7) * e +
            3.5 * Math.sin(0.006 * t + 1.8)
          );
        }
        _bhPathCenterY(t) {
          const e = Math.max(0, Math.min(1, (t - -2400) / -700));
          return 30 * (e * e * (3 - 2 * e)) - 1.25;
        }
        _resetBlackholeStart() {
          const t = -260;
          ((this.blackholeSeed = 1e4 * Math.random()),
            (this.bhCamPos.x = this._bhPathCenterX(t)),
            (this.bhCamPos.y = this._bhPathCenterY(t) + 3.85),
            (this.bhCamPos.z = t),
            (this.bhYaw = 0),
            (this.bhPitch = -0.05),
            (this.bhMovePhase = 0),
            (this.bhSpeed = 0));
        }
        _renderBlackholePass(t, e, i, n) {
          if (!t) return;
          let o = 0;
          try {
            if (window.audioAnalyser && window.audioData) {
              window.audioAnalyser.getByteFrequencyData(window.audioData);
              let t = 0;
              const e = Math.min(12, window.audioData.length);
              for (let i = 0; i < e; i++) t += window.audioData[i];
              o = e > 0 ? t / (255 * e) : 0;
            }
          } catch (t) {}
          (gl.useProgram(t),
            gl.uniform2f(gl.getUniformLocation(t, "u_resolution"), e, i),
            gl.uniform1f(gl.getUniformLocation(t, "u_time"), 0.001 * n),
            gl.uniform1f(gl.getUniformLocation(t, "u_yaw"), this.bhYaw || 0),
            gl.uniform1f(
              gl.getUniformLocation(t, "u_pitch"),
              this.bhPitch || 0,
            ),
            gl.uniform3f(
              gl.getUniformLocation(t, "u_camPos"),
              this.bhCamPos.x,
              this.bhCamPos.y,
              this.bhCamPos.z,
            ),
            gl.uniform1f(
              gl.getUniformLocation(t, "u_movePhase"),
              this.bhMovePhase || 0,
            ),
            gl.uniform1f(
              gl.getUniformLocation(t, "u_speed"),
              this.bhSpeed || 0,
            ),
            gl.uniform1f(
              gl.getUniformLocation(t, "u_seed"),
              this.blackholeSeed || this.z3ModeSeed || 0,
            ),
            gl.uniform1f(gl.getUniformLocation(t, "u_audio"), o),
            gl.uniform1f(
              gl.getUniformLocation(t, "u_trip"),
              Math.max(this.z3Trip || 0, 1.1),
            ),
            gl.activeTexture(gl.TEXTURE0),
            gl.bindTexture(gl.TEXTURE_2D, this.texHallBottom),
            gl.uniform1i(gl.getUniformLocation(t, "u_texGround"), 0),
            this._drawQuad(t));
        }
        tickSlide(t) {
          if ("idle" === this.slideState) {
            const t = document.getElementById("c");
            return (t && (t.style.transform = ""), void (this.slideOffset = 0));
          }
          const e = t - this.slideStart;
          if ("out" === this.slideState) {
            const i = Math.min(e / 340, 1);
            ((this.slideOffset = i * i * window.innerWidth * this.slideDir),
              i >= 1 &&
                ((this.slideOffset = window.innerWidth * this.slideDir),
                (this.slideState = "black"),
                (this.slideStart = t),
                (this.activePOV = this.pendingPOV),
                (this.cx = 0),
                (this.cy = 0),
                (this.povSwitchTime = t),
                window.dispatchEvent(new Event("mouseup")),
                window.dispatchEvent(new Event("touchend"))));
          } else if ("black" === this.slideState)
            e >= 80 &&
              ((this.slideOffset = -window.innerWidth * this.slideDir),
              (this.slideState = "in"),
              (this.slideStart = t));
          else if ("in" === this.slideState) {
            const t = Math.min(e / 340, 1),
              i = 1 - (1 - t) * (1 - t);
            ((this.slideOffset = -window.innerWidth * this.slideDir * (1 - i)),
              t >= 1 &&
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
        checkPOVThreshold(t, e) {
          "idle" !== this.slideState ||
            t - this.povSwitchTime < 600 ||
            ("hallway" !== this.centerPhase
              ? "cabin" === this.centerPhase &&
                Math.abs(this.camZ - this.EXIT_ROW_Z) < 1.5 &&
                ("door_look" !== this.cabinState &&
                "suction" !== this.cabinState
                  ? e <= -0.5
                    ? ((this.previousState = this.cabinState),
                      (this.cabinState = "door_look"),
                      (this.yawTarget =
                        "backward" === this.previousState
                          ? 1.5 * Math.PI
                          : Math.PI / 2),
                      (this.zoomTarget = 2),
                      (this.cx = 0),
                      (this.cy = 0),
                      (this.povSwitchTime = t),
                      window.dispatchEvent(new Event("mouseup")),
                      window.dispatchEvent(new Event("touchend")))
                    : e >= 0.5 &&
                      ((this.previousState = this.cabinState),
                      (this.cabinState = "door_look"),
                      (this.yawTarget =
                        "backward" === this.previousState
                          ? Math.PI / 2
                          : -Math.PI / 2),
                      (this.zoomTarget = 2),
                      (this.cx = 0),
                      (this.cy = 0),
                      (this.povSwitchTime = t),
                      window.dispatchEvent(new Event("mouseup")),
                      window.dispatchEvent(new Event("touchend")))
                  : "door_look" === this.cabinState &&
                    Math.abs(e) >= 0.5 &&
                    ((this.cabinState = this.previousState || "forward"),
                    (this.yawTarget =
                      "backward" === this.cabinState ? Math.PI : 0),
                    (this.zoomTarget = 1),
                    (this.cx = 0),
                    (this.cy = 0),
                    (this.povSwitchTime = t),
                    window.dispatchEvent(new Event("mouseup")),
                    window.dispatchEvent(new Event("touchend"))))
              : this.isAltRoute
                ? "right" === this.activePOV
                  ? e >= 0.75 &&
                    ((this.pendingPOV = "center"),
                    (this.slideDir = 1),
                    (this.slideState = "out"),
                    (this.slideStart = t),
                    (this.povSwitchTime = t),
                    window.dispatchEvent(new Event("mouseup")),
                    window.dispatchEvent(new Event("touchend")))
                  : "center" === this.activePOV &&
                    e <= -0.75 &&
                    ((this.pendingPOV = "right"),
                    (this.slideDir = -1),
                    (this.slideState = "out"),
                    (this.slideStart = t),
                    (this.povSwitchTime = t),
                    window.dispatchEvent(new Event("mouseup")),
                    window.dispatchEvent(new Event("touchend")))
                : "left" === this.activePOV
                  ? e <= -0.75 &&
                    ((this.pendingPOV = "center"),
                    (this.slideDir = -1),
                    (this.slideState = "out"),
                    (this.slideStart = t),
                    (this.povSwitchTime = t),
                    window.dispatchEvent(new Event("mouseup")),
                    window.dispatchEvent(new Event("touchend")))
                  : "center" === this.activePOV &&
                    e >= 0.75 &&
                    ((this.pendingPOV = "left"),
                    (this.slideDir = 1),
                    (this.slideState = "out"),
                    (this.slideStart = t),
                    (this.povSwitchTime = t),
                    window.dispatchEvent(new Event("mouseup")),
                    window.dispatchEvent(new Event("touchend"))));
        }
        updateCenterState(t, e) {
          "cabin" === this.centerPhase && this.camZ < 3.5 && (this.camZ = 3.5);
          let i = z3SpaceHeld || z3TouchHeld,
            n = 0.034 * e;
          if ("hallway" === this.centerPhase) {
            if (this.isAltRoute) {
              const t = 0.24 * (this.cx || 0),
                i = 0.11 * (this.cy || 0) - 0.05,
                n = Math.max(
                  0,
                  Math.min(
                    1,
                    (this.camZ - this.HALL_START_Z) /
                      (this.HALL_END_Z - this.HALL_START_Z),
                  ),
                );
              ((this.bhYaw += (t - this.bhYaw) * Math.min(1, 0.1 * e)),
                (this.bhPitch += (i - this.bhPitch) * Math.min(1, 0.1 * e)),
                (this.bhCamPos.z = 120 - 50 * n),
                (this.bhCamPos.x = this._bhPathCenterX(this.bhCamPos.z)),
                (this.bhCamPos.y = this._bhPathCenterY(this.bhCamPos.z) + 3.2),
                (this.bhMovePhase = 0),
                (this.bhSpeed = 0));
            }
            (i && (this.camZ += n),
              this.camZ >= this.HALL_END_Z &&
                (this.isAltRoute
                  ? ((this.centerPhase = "void"),
                    (this.voidStart = t),
                    (this.camZ = this.HALL_END_Z))
                  : ((this.cx = 0),
                    (this.cy = 0),
                    (this.centerPhase = "cabin"),
                    (this.cabinState = "forward"))));
          } else if ("void" === this.centerPhase)
            if (this.isAltRoute)
              if ("none" !== this.bhEscapePhase) {
                const i = t - this.bhEscapeStart;
                if ("rising" === this.bhEscapePhase) {
                  const n = Math.min(i / 3e3, 1),
                    o = n * n;
                  ((this.bhCamPos.y =
                    this._bhPathCenterY(this.bhCamPos.z) + 3.85 + 25 * o),
                    (this.bhCamPos.z -= (e / 60) * 2 * o),
                    (this.bhPitch = -0.05 - 0.15 * o),
                    (this.suctionShake = 0.03 * o),
                    (this.bhMovePhase += (e / 60) * 2),
                    (this.bhSpeed = 0.3 + 0.4 * o),
                    n >= 1 &&
                      ((this.bhEscapePhase = "sucking"),
                      (this.bhEscapeStart = t)));
                } else if ("sucking" === this.bhEscapePhase) {
                  const n = Math.min(i / 4e3, 1),
                    o = n * n * n,
                    s = 30 + 200 * o;
                  ((this.bhCamPos.z -= s * (e / 60)),
                    (this.bhCamPos.y += 8 * o * (e / 60)),
                    (this.bhPitch = 0.15 * o - 0.2),
                    (this.bhYaw += 0.02 * o * e),
                    (this.suctionShake = 0.03 + 0.06 * o),
                    (this.z3Trip = Math.min(3, this.z3Trip + 0.008 * e)),
                    (this.bhMovePhase += (e / 60) * (10 + 40 * o)),
                    (this.bhSpeed = 0.7 + 0.8 * o),
                    (this.bhCamPos.x = this._bhPathCenterX(this.bhCamPos.z)),
                    n >= 1 &&
                      ((this.bhEscapePhase = "warp"),
                      (this.bhEscapeStart = t)));
                } else if ("warp" === this.bhEscapePhase) {
                  const n = Math.min(i / 1500, 1);
                  ((this.bhCamPos.z -= (e / 60) * 800),
                    (this.bhMovePhase += (e / 60) * 120),
                    (this.bhSpeed = 1.5),
                    (this.suctionShake = 0.09),
                    (this.z3Trip = 3),
                    (this.bhYaw += 0.06 * e),
                    (this.bhPitch += 0.02 * e),
                    n >= 1 &&
                      ((this.bhEscapePhase = "black"),
                      (this.bhEscapeStart = t),
                      (this.suctionShake = 0),
                      (this.bhSpeed = 0)));
                } else if ("black" === this.bhEscapePhase) {
                  Math.min(i / 1200, 1) >= 1 &&
                    ((this.bhEscapePhase = "falling"),
                    (this.centerPhase = "falling"),
                    (this.fallStart = t),
                    (this.cx = 0),
                    (this.cy = 0));
                }
                this.z3IsOOB = 1;
              } else {
                (i ? 1.2 * e : 0) > 0
                  ? ((this.bhCamPos.z -= (e / 60) * 18),
                    (this.bhCamPos.z = Math.max(this.bhCamPos.z, -3050)),
                    (this.bhMovePhase += (e / 60) * 7.5),
                    (this.bhSpeed +=
                      (1 - this.bhSpeed) * Math.min(1, 0.24 * e)),
                    (this.z3Trip = Math.min(2.35, this.z3Trip + 0.0011 * e)))
                  : (this.bhSpeed = 0);
                const n = i ? 0.07 * Math.sin(2 * this.bhMovePhase) : 0,
                  o = i ? 0.05 * Math.sin(this.bhMovePhase) : 0,
                  s = 0.001 * t,
                  a = 0.012 * Math.sin(0.8 * s) + 0.006 * Math.sin(1.3 * s),
                  r = 0.015 * Math.sin(0.35 * s) + 0.008 * Math.sin(0.57 * s);
                ((this.bhCamPos.x =
                  this._bhPathCenterX(this.bhCamPos.z) + o + r),
                  (this.bhCamPos.y =
                    this._bhPathCenterY(this.bhCamPos.z) + 3.85 + n + a));
                const l = 0.24 * (this.cx || 0),
                  h = 0.11 * (this.cy || 0) - 0.05;
                ((this.bhYaw += (l - this.bhYaw) * Math.min(1, 0.1 * e)),
                  (this.bhPitch += (h - this.bhPitch) * Math.min(1, 0.1 * e)),
                  (this.z3IsOOB = 1));
              }
            else
              (i && (this.z3Trip = Math.min(2.35, this.z3Trip + 0.0035 * e)),
                (this.z3IsOOB = 1));
          else if ("cabin" === this.centerPhase) {
            switch (this.cabinState) {
              case "walking_forward":
              case "forward":
                (i &&
                  (this.camZ = Math.min(this.COCKPIT_Z - 1.5, this.camZ + n)),
                  this.camZ >= this.COCKPIT_Z - 1.6 &&
                    ((this.cabinState = "cockpit_turbulence"),
                    (this.turbulenceStart = t),
                    (this.cx = 0),
                    (this.cy = 0)));
                break;
              case "door_look":
                break;
              case "cockpit_turbulence":
                let o = t - this.turbulenceStart;
                ((this.suctionShake = Math.min(0.04, o / 3e4)),
                  (this.flashVal = o > 500 && Math.random() > 0.7 ? 0.8 : 0),
                  o > 3e3 &&
                    ((this.cabinState = "backward"),
                    (this.yawTarget = Math.PI),
                    (this.suctionShake = 0),
                    (this.flashVal = 0),
                    (this.cx = 0),
                    (this.cy = 0),
                    (this.fractalActive = 1),
                    (this.doorSwitched = 1)));
                break;
              case "backward":
                (i && (this.camZ = Math.max(this.EXIT_ROW_Z, this.camZ - n)),
                  this.camZ <= this.EXIT_ROW_Z + 0.2 &&
                    ((this.cabinState = "suction"),
                    (this.doorOpen = 1),
                    (this.zoomTarget = 1.1),
                    (this.cx = 0),
                    (this.cy = 0)));
                break;
              case "suction":
                ((this.suctionShake = 0.015),
                  this.suctionYawSnapped
                    ? ((this.camX +=
                        (-1.4 - this.camX) * Math.min(1, 0.006 * e)),
                      this.camX < -1.2 &&
                        ((this.centerPhase = "falling"),
                        (this.fallStart = t),
                        (this.cx = 0),
                        (this.cy = 0)))
                    : ((this.camX +=
                        (-1.1 - this.camX) * Math.min(1, 0.004 * e)),
                      this.camX < -0.55 &&
                        ((this.suctionYawSnapped = !0),
                        (this.yawTarget = 0.5 * Math.PI),
                        (this.zoomTarget = 1.15))));
            }
            ((this.yawOffset +=
              (this.yawTarget - this.yawOffset) * Math.min(1, 0.08 * e)),
              (this.zoom +=
                (this.zoomTarget - this.zoom) * Math.min(1, 0.08 * e)));
          } else if ("falling" === this.centerPhase) {
            let e = t - this.fallStart;
            if (
              ((this.fallProgress = Math.min(1, e / 1e4)),
              e >= 1e4 && !this.isResetting)
            ) {
              this.isResetting = !0;
              let t = document.createElement("div");
              ((t.style.cssText =
                "position:fixed;inset:0;background:#ffffff;z-index:999999;pointer-events:none;"),
                document.body.appendChild(t),
                setTimeout(() => {
                  window.location.reload(!0);
                }, 50));
            }
          }
        }
        render(t, e, i) {
          if (this.isResetting) return;
          let n = t - this.lastRenderTime;
          ((n > 250 || n <= 0) && (n = 33.33),
            (this.lastRenderTime = t),
            (window.lastNow = t));
          let o = n / (IS_MOBILE ? 50 : 33.33);
          (void 0 === this.cx && ((this.cx = e), (this.cy = i)),
            "falling" !== this.centerPhase
              ? "warp" === this.bhEscapePhase ||
                "black" === this.bhEscapePhase ||
                ((this.cx += (e - this.cx) * Math.min(1, 0.12 * o)),
                (this.cy += (i - this.cy) * Math.min(1, 0.12 * o)))
              : ((this.cx = e), (this.cy = i)));
          const s = document.getElementById("c"),
            a = s ? s.width : window.innerWidth,
            r = s ? s.height : window.innerHeight;
          if (
            (this.tickSlide(t),
            this.checkPOVThreshold(t, e),
            t - this.lastBlinkTime > this.nextBlinkInterval &&
              ((this.blinking = !0),
              (this.blinkStart = t),
              (this.lastBlinkTime = t),
              (this.nextBlinkInterval = 4e3 + 8e3 * Math.random())),
            (this.rBlink = 0),
            this.blinking)
          ) {
            let e = t - this.blinkStart;
            e < 120
              ? (this.rBlink = e / 120)
              : e < 200
                ? ((this.rBlink = 1),
                  this.blinkSeeded ||
                    ((this.blinkSeeded = !0),
                    (this.z3ModeSeed = 100 * Math.random()),
                    (this.z3Trip = 0.3 + 1.4 * Math.random()),
                    (this.z3IsOOB = Math.random() > 0.4 ? 1 : 0),
                    (this.z3ModeStart = t),
                    (this.z3BlinkPeakTime = t),
                    this.bhEscapeArmed &&
                      "none" === this.bhEscapePhase &&
                      this.isAltRoute &&
                      "void" === this.centerPhase &&
                      (this.bhEscapeBlinkCount++,
                      this.bhEscapeBlinkCount >= 2 &&
                        ((this.bhEscapePhase = "rising"),
                        (this.bhEscapeStart = t)))))
                : e < 320
                  ? (this.rBlink = 1 - (e - 200) / 120)
                  : ((this.rBlink = 0),
                    (this.blinking = !1),
                    (this.blinkSeeded = !1));
          }
          ((this.z3ModeTime = 0.001 * (t - this.z3ModeStart)),
            "center" === this.activePOV && this.updateCenterState(t, o),
            this._updateAudio(t));
          var l = 0;
          ("cockpit_turbulence" === this.cabinState
            ? (l = 1.5)
            : "backward" === this.cabinState
              ? (l = 0.8)
              : "suction" === this.cabinState && (l = 2.5),
            "falling" === this.centerPhase && (l = 3),
            this.fractalActive > 0.5 && (l += 0.5),
            "rising" === this.bhEscapePhase
              ? (l = 2)
              : "sucking" === this.bhEscapePhase
                ? (l = 3.5)
                : "warp" === this.bhEscapePhase && (l = 5));
          var h = 0;
          ("cabin" === this.centerPhase &&
            (h =
              0.6 *
              Math.max(
                0,
                (this.camZ - this.HALL_END_Z) /
                  (this.COCKPIT_Z - this.HALL_END_Z),
              )),
            (this.neuralIntensity =
              this.z3Trip + l + h + 10 * this.suctionShake),
            gl.clearColor(0, 0, 0, 1),
            gl.clear(gl.COLOR_BUFFER_BIT));
          const c = "center" !== this.activePOV || "void" !== this.centerPhase;
          if (
            (this.voidFBO &&
              "falling" !== this.centerPhase &&
              c &&
              (gl.bindFramebuffer(gl.FRAMEBUFFER, this.voidFBO.fbo),
              gl.viewport(0, 0, a, r),
              gl.clearColor(0, 0, 0, 1),
              gl.clear(gl.COLOR_BUFFER_BIT),
              this.isAltRoute && this.blackholeProg
                ? this._renderBlackholePass(this.blackholeProg, a, r, t)
                : this.voidMode &&
                  this.voidMode.render(t, 0, 0, 0, 0, 0, 0, 1, 0),
              gl.bindFramebuffer(gl.FRAMEBUFFER, null),
              gl.viewport(0, 0, a, r)),
            "right" === this.activePOV && this.isAltRoute && this.bedroomProg)
          )
            (gl.useProgram(this.bedroomProg),
              gl.activeTexture(gl.TEXTURE0),
              gl.bindTexture(gl.TEXTURE_2D, this.texBedroom),
              gl.activeTexture(gl.TEXTURE1),
              gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex),
              gl.uniform1i(
                gl.getUniformLocation(this.bedroomProg, "u_texEnv1"),
                0,
              ),
              gl.uniform1i(
                gl.getUniformLocation(this.bedroomProg, "u_voidTex"),
                1,
              ),
              gl.uniform2f(
                gl.getUniformLocation(this.bedroomProg, "u_resolution"),
                a,
                r,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bedroomProg, "u_time"),
                0.001 * t,
              ),
              gl.uniform2f(
                gl.getUniformLocation(this.bedroomProg, "u_mouse"),
                this.cx,
                this.cy,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bedroomProg, "u_blink"),
                this.rBlink,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bedroomProg, "u_wake"),
                1,
              ),
              this._drawQuad(this.bedroomProg));
          else if ("left" === this.activePOV && this.bathroomProg)
            (gl.useProgram(this.bathroomProg),
              gl.activeTexture(gl.TEXTURE0),
              gl.bindTexture(gl.TEXTURE_2D, this.texBathroomHole),
              gl.activeTexture(gl.TEXTURE1),
              gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex),
              gl.uniform1i(
                gl.getUniformLocation(this.bathroomProg, "u_texEnv1"),
                0,
              ),
              gl.uniform1i(
                gl.getUniformLocation(this.bathroomProg, "u_voidTex"),
                1,
              ),
              gl.uniform2f(
                gl.getUniformLocation(this.bathroomProg, "u_resolution"),
                a,
                r,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bathroomProg, "u_time"),
                0.001 * t,
              ),
              gl.uniform2f(
                gl.getUniformLocation(this.bathroomProg, "u_mouse"),
                this.cx,
                this.cy,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bathroomProg, "u_blink"),
                this.rBlink,
              ),
              gl.uniform1f(
                gl.getUniformLocation(this.bathroomProg, "u_wake"),
                1,
              ),
              this._drawQuad(this.bathroomProg));
          else if ("center" === this.activePOV)
            if ("falling" === this.centerPhase && this.fallProg)
              (gl.useProgram(this.fallProg),
                gl.uniform2f(
                  gl.getUniformLocation(this.fallProg, "u_resolution"),
                  a,
                  r,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.fallProg, "u_time"),
                  0.001 * t,
                ),
                gl.uniform2f(
                  gl.getUniformLocation(this.fallProg, "u_mouse"),
                  this.cx,
                  this.cy,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.fallProg, "u_fallProgress"),
                  this.fallProgress,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.fallProg, "u_blink"),
                  this.rBlink,
                ),
                this._drawQuad(this.fallProg));
            else if (
              "void" === this.centerPhase &&
              this.isAltRoute &&
              this.blackholeProg
            ) {
              (this._renderBlackholePass(this.blackholeProg, a, r, t),
                this.rBlink > 0.001 && this._drawOverlay(0, 0, 0, this.rBlink));
              const e = 0.001 * (t - (this.voidStart || t)),
                i = Math.max(0, Math.min(0.25, 0.03 * e));
              if (
                (i > 0.001 && this._drawOverlay(0.16, 0, 0, i),
                "rising" === this.bhEscapePhase)
              ) {
                const e = Math.min((t - this.bhEscapeStart) / 3e3, 1);
                this._drawOverlay(0, 0, 0.02, 0.15 * e);
              } else if ("sucking" === this.bhEscapePhase) {
                const e = Math.min((t - this.bhEscapeStart) / 4e3, 1);
                this._drawOverlay(0.06, 0, 0.08, 0.4 * e);
              } else if ("warp" === this.bhEscapePhase) {
                const e = Math.min((t - this.bhEscapeStart) / 1500, 1),
                  i = Math.max(0, 1 - 4 * e),
                  n = Math.max(0, (e - 0.3) / 0.7);
                (i > 0.001 && this._drawOverlay(1, 1, 1, 0.7 * i),
                  n > 0.001 && this._drawOverlay(0, 0, 0, n));
              } else
                "black" === this.bhEscapePhase && this._drawOverlay(0, 0, 0, 1);
            } else if ("void" === this.centerPhase && this.voidScreenProg) {
              (gl.useProgram(this.voidScreenProg),
                gl.activeTexture(gl.TEXTURE0),
                gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex),
                gl.uniform1i(
                  gl.getUniformLocation(this.voidScreenProg, "u_tex"),
                  0,
                ),
                gl.uniform2f(
                  gl.getUniformLocation(this.voidScreenProg, "u_resolution"),
                  a,
                  r,
                ));
              const e = gl.getUniformLocation(this.voidScreenProg, "u_time"),
                i = gl.getUniformLocation(this.voidScreenProg, "u_trip"),
                n = gl.getUniformLocation(this.voidScreenProg, "u_seed"),
                o = gl.getUniformLocation(this.voidScreenProg, "u_blink");
              (e && gl.uniform1f(e, 0.001 * t),
                i && gl.uniform1f(i, Math.max(this.z3Trip, 1.15)),
                n && gl.uniform1f(n, this.z3ModeSeed),
                o && gl.uniform1f(o, this.rBlink),
                this._drawQuad(this.voidScreenProg),
                this.rBlink > 0.001 && this._drawOverlay(0, 0, 0, this.rBlink));
              const s = 0.001 * (t - (this.voidStart || t)),
                l = Math.max(0, Math.min(0.35, 0.06 * s));
              l > 0.001 && this._drawOverlay(0.22, 0, 0, l);
            } else
              this.centerProg &&
                (gl.useProgram(this.centerProg),
                gl.activeTexture(gl.TEXTURE0),
                gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex),
                gl.activeTexture(gl.TEXTURE1),
                gl.bindTexture(gl.TEXTURE_2D, this.texDoorClosed),
                gl.activeTexture(gl.TEXTURE2),
                gl.bindTexture(gl.TEXTURE_2D, this.texDoorOpen),
                gl.activeTexture(gl.TEXTURE3),
                gl.bindTexture(gl.TEXTURE_2D, this.texHallLeft),
                gl.activeTexture(gl.TEXTURE4),
                gl.bindTexture(gl.TEXTURE_2D, this.texHallRight),
                gl.activeTexture(gl.TEXTURE5),
                gl.bindTexture(gl.TEXTURE_2D, this.texHallTop),
                gl.activeTexture(gl.TEXTURE6),
                gl.bindTexture(gl.TEXTURE_2D, this.texHallBottom),
                gl.activeTexture(gl.TEXTURE7),
                gl.bindTexture(gl.TEXTURE_2D, this.texCockpit),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_voidTex"),
                  0,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_doorClosedTex"),
                  1,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_doorOpenTex"),
                  2,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_texLeft"),
                  3,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_texRight"),
                  4,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_texTop"),
                  5,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_texBottom"),
                  6,
                ),
                gl.uniform1i(
                  gl.getUniformLocation(this.centerProg, "u_cockpitTex"),
                  7,
                ),
                gl.uniform2f(
                  gl.getUniformLocation(this.centerProg, "u_resolution"),
                  a,
                  r,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_time"),
                  0.001 * t,
                ),
                gl.uniform2f(
                  gl.getUniformLocation(this.centerProg, "u_mouse"),
                  this.cx,
                  this.cy,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_camZ"),
                  this.camZ,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_camX"),
                  this.camX,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_isWalking"),
                  z3SpaceHeld || z3TouchHeld ? 1 : 0,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_blink"),
                  this.rBlink,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_wake"),
                  1,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_shake"),
                  this.suctionShake,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_flash"),
                  this.flashVal,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_yawOffset"),
                  this.yawOffset,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_doorOpen"),
                  this.doorOpen,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_doorSwitched"),
                  this.doorSwitched,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_zoom"),
                  this.zoom,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_suctionFade"),
                  this.suctionFade,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_trip"),
                  this.z3Trip,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_modeSeed"),
                  this.z3ModeSeed,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_modeTime"),
                  this.z3ModeTime,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_isOOB"),
                  this.z3IsOOB,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_fractalActive"),
                  this.fractalActive,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_fractalSeed"),
                  this.z3ModeSeed,
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_blinkAge"),
                  0.001 * (t - (this.z3BlinkPeakTime || t)),
                ),
                gl.uniform1f(
                  gl.getUniformLocation(this.centerProg, "u_altRoute"),
                  this.isAltRoute ? 1 : 0,
                ),
                this._drawQuad(this.centerProg));
          if (!this.z3RedDone) {
            let e = t - this.z3RedStart,
              i = 0;
            (e < 500
              ? (i = 1)
              : e < 3e3
                ? (i = 1 - (e - 500) / 2500)
                : (this.z3RedDone = !0),
              i > 0.001 && this._drawOverlay(0.8, 0, 0, i));
          }
          "function" == typeof drawHallucinationOverlay &&
            "falling" !== this.centerPhase &&
            drawHallucinationOverlay(
              t,
              this.z3Trip,
              this.z3ModeSeed,
              0.001 * (t - this.z3BlinkPeakTime),
              3,
            );
        }
        destroy() {
          ((this.isDead = !0),
            this._destroyAudio(),
            this.voidMode && this.voidMode.destroy(),
            this.voidFBO &&
              (gl.deleteTexture(this.voidFBO.tex),
              gl.deleteFramebuffer(this.voidFBO.fbo)),
            gl.deleteProgram(this.bathroomProg),
            gl.deleteProgram(this.bedroomProg),
            gl.deleteProgram(this.centerProg),
            gl.deleteProgram(this.fallProg),
            gl.deleteProgram(this.voidScreenProg),
            gl.deleteProgram(this.blackholeProg),
            this._overlayProg && gl.deleteProgram(this._overlayProg),
            this._portalCompositeProg &&
              gl.deleteProgram(this._portalCompositeProg),
            gl.deleteTexture(this.texBathroomHole),
            gl.deleteTexture(this.texBedroom),
            gl.deleteTexture(this.texDoorClosed),
            gl.deleteTexture(this.texDoorOpen),
            gl.deleteTexture(this.texCockpit),
            gl.deleteTexture(this.texHallLeft),
            gl.deleteTexture(this.texHallRight),
            gl.deleteTexture(this.texHallTop),
            gl.deleteTexture(this.texHallBottom),
            gl.deleteBuffer(this.quadBuf));
        }
      }
      window.startZone3 = function (t) {
        window.currentZone3 = new Zone3Engine(t);
        const e =
          1e3 /
          (/Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ) ||
          (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
            ? 20
            : 30);
        let i = 0;
        ((window.__zone3Governor = function (t) {
          (requestAnimationFrame(window.__zone3Governor),
            t - i < e ||
              ((i = t),
              window.currentZone3 &&
                !window.currentZone3.isDead &&
                window.currentZone3.render(t, window.mx || 0, window.my || 0)));
        }),
          requestAnimationFrame(window.__zone3Governor));
      };
