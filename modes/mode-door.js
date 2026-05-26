((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (window.GLSL.modules.room_door = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1;
uniform sampler2D u_texEnv2;
uniform float u_trip;
uniform float u_zoom;
uniform float u_modeSeed;
uniform float u_blink;
uniform float u_wake;
uniform float u_isOOB;
uniform float u_modeTime;
uniform float u_audio;
uniform float u_flash;
uniform float u_doorOpen;

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float hash1(float x) {
    return fract(sin(x * 127.1 + 1.9898) * 43758.5);
}

float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash2(i + vec2(0.0, 0.0)), hash2(i + vec2(1.0, 0.0)), u.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

    for (int i = 0; i < 4; ++i) {
        v += a * noise2(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }

    return v;
}

float bSDBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

vec2 bMap(vec3 p) {
    float d = 1e9;
    float id = 0.0;

    float dF = p.y + 1.20;

    if (dF < d) {
        d = dF;
        id = 1.0;
    }

    float dW = -bSDBox(p - vec3(0.0, 5.0, 0.0), vec3(25.0, 9.0, 25.0));

    if (dW < d) {
        d = dW;
        id = 2.0;
    }

    float cable = length(p.xz) - 0.55;
    float r1 = length(p.xz - vec2( 1.6,  0.0)) - 0.10;
    float r2 = length(p.xz - vec2(-1.6,  0.0)) - 0.10;
    float r3 = length(p.xz - vec2( 0.0,  1.6)) - 0.10;
    float r4 = length(p.xz - vec2( 0.0, -1.6)) - 0.10;

    float guides = min(min(cable, r1), min(min(r2, r3), r4));

    float sp = 3.5;
    float ly = mod(p.y - 0.40, sp) - sp * 0.5;

    float ring = max(abs(length(p.xz) - 1.85) - 0.06, abs(ly) - 0.10);
    float beam1 = bSDBox(vec3(p.x, ly, p.z), vec3(1.85, 0.10, 0.10));
    float beam2 = bSDBox(vec3(p.x, ly, p.z), vec3(0.10, 0.10, 1.85));
    float scaffold = min(ring, min(beam1, beam2));

    float elev = min(guides, scaffold);

    if (elev < d) {
        d = elev;
        id = 3.0;
    }

    float rad = length(p.xz);
    float disc = max(abs(rad - 2.40) - 1.00, abs(p.y + 0.30) - 0.40);
    float lip = max(abs(rad - 3.30) - 0.18, abs(p.y + 0.78) - 0.06);
    float hub = max(abs(rad - 0.74) - 0.14, abs(p.y - 0.18) - 0.22);
    float platform = min(min(disc, lip), hub);

    float railing = 1e9;

    for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853982;
        vec3 rp = p - vec3(cos(a) * 3.45, 0.30, sin(a) * 3.45);
        railing = min(railing, bSDBox(rp, vec3(0.025, 0.55, 0.025)));
    }

    platform = min(platform, railing);

    if (platform < d) {
        d = platform;
        id = 4.0;
    }

    return vec2(d, id);
}

vec3 bNormal(vec3 p) {
    vec2 e = vec2(0.012, 0.0);
    float d = bMap(p).x;

    return normalize(vec3(
        bMap(p + e.xyy).x - d,
        bMap(p + e.yxy).x - d,
        bMap(p + e.yyx).x - d
    ));
}

#ifdef MOBILE
const int BAY_STEPS = 28;
#else
const int BAY_STEPS = 44;
#endif

vec3 sampleBay(vec2 doorUV) {
    vec2 v = doorUV - 0.48;
    v.x *= 1.40;
    v.y *= -1.55;

    float walk = u_zoom;

    vec3 ro = vec3(0.0, 1.10, mix(-20.0, 2.0, walk));
    vec3 fwd = vec3(0.0, -0.08, 1.0);
    vec3 right = vec3(1.0, 0.0, 0.0);
    vec3 up = vec3(0.0, 1.0, 0.0);

    vec3 rd = normalize(fwd * 1.40 + v.x * right + v.y * up);

    float t = 0.0;
    float id = 0.0;
    bool hit = false;

    for (int i = 0; i < BAY_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 res = bMap(p);

        if (res.x < 0.012) {
            id = res.y;
            hit = true;
            break;
        }

        if (t > 60.0) {
            break;
        }

        t += res.x * 0.85;
    }

    vec3 col = vec3(0.012, 0.014, 0.020);

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = bNormal(p);

        vec3 sunDir = normalize(vec3(0.55, 0.80, 0.30));
        vec3 viewDir = normalize(ro - p);

        float diff = max(dot(n, sunDir), 0.0);
        float hemi = smoothstep(-1.5, 6.0, p.y);
        float ambBase = 0.16;

        if (id < 1.5) {
            vec2 g = floor(p.xz * 0.6);
            float chk = mod(g.x + g.y, 2.0);

            col = mix(vec3(0.045, 0.050, 0.060), vec3(0.075, 0.080, 0.090), chk);

            vec2 cellLocal = fract(p.xz * 0.6) - 0.5;
            float seam = smoothstep(0.46, 0.50, max(abs(cellLocal.x), abs(cellLocal.y)));

            col = mix(col, vec3(0.020, 0.024, 0.032), seam);

            float toCenter = length(p.xz);
            col += vec3(0.30, 0.14, 0.06) * smoothstep(6.5, 1.5, toCenter) * 0.18;
            col *= ambBase + diff * 0.55;
        } else if (id < 2.5) {
            col = vec3(0.040, 0.046, 0.055);
            col += vec3(0.018, 0.026, 0.038) * hemi;
            col *= ambBase + diff * 0.40;

            float bandY = abs(p.y - 4.5);
            float band = smoothstep(0.06, 0.0, bandY);

            col += vec3(0.20, 0.45, 0.85) * band * 0.80;

            float strutAng = atan(p.z, p.x);
            float strut = smoothstep(0.94, 1.0, sin(strutAng * 16.0) * 0.5 + 0.5);

            col *= 1.0 - strut * 0.45;
        } else if (id < 3.5) {
            col = vec3(0.115, 0.125, 0.145);

            float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);
            col += vec3(0.10, 0.16, 0.26) * fres * 0.30;

            float spec = pow(max(dot(reflect(-sunDir, n), viewDir), 0.0), 22.0) * 0.30;
            col += vec3(0.65, 0.78, 1.00) * spec;
            col *= ambBase + diff * 0.65;

            float ledP = fract(p.y * 0.16 - u_time * 0.55);
            float led = smoothstep(0.05, 0.0, abs(ledP - 0.5)) *
                        smoothstep(2.20, 0.55, length(p.xz));

            col += vec3(0.30, 0.62, 1.00) * led * 1.6;
        } else {
            float ang = atan(p.z, p.x);
            float seam = smoothstep(0.92, 1.0, sin(ang * 12.0) * 0.5 + 0.5);

            col = mix(vec3(0.130, 0.140, 0.160), vec3(0.180, 0.190, 0.215), seam);

            float spec = pow(max(dot(reflect(-sunDir, n), viewDir), 0.0), 16.0) * 0.20;
            col += vec3(0.60, 0.70, 0.90) * spec;
            col *= ambBase + diff * 0.70;

            float rimRing = smoothstep(0.06, 0.0, abs(length(p.xz) - 3.40)) * step(p.y, 0.55);
            float pulse = 0.78 + 0.22 * sin(u_time * 1.4 + ang * 6.0);

            col += vec3(0.95, 0.40, 0.16) * rimRing * pulse * 1.1;
        }

        float fog = 1.0 - exp(-t * 0.060);

        vec3 fogCol = vec3(0.022, 0.028, 0.040);
        fogCol += vec3(0.040, 0.018, 0.008) * smoothstep(2.5, 0.0, abs(p.y + 0.8));

        col = mix(col, fogCol, fog * 0.65);
    }

    float voidGlow = smoothstep(0.35, 0.0, doorUV.y) * 0.04;
    col += vec3(0.05, 0.10, 0.18) * voidGlow;

    return col;
}

vec4 getScreenCol(vec2 tuv) {
    vec2 doorwayUV = vec2(0.48, 0.48);
    float roomZoom = 1.0 + u_zoom * u_zoom * 5.5;

    vec2 roomTuv = doorwayUV + (tuv - doorwayUV) / roomZoom;
    roomTuv = clamp(roomTuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, roomTuv);

    bool isDoorway = room.a < 0.15;

    if (!isDoorway) {
        bool isGreen = room.g > 0.3 && room.g - max(room.r, room.b) > 0.15;
        isDoorway = isGreen;
    }

    if (!isDoorway) {
        float mx = max(room.r, max(room.g, room.b));
        isDoorway = mx < 0.025;
    }

    if (isDoorway && u_doorOpen > 0.5) {
        vec2 pUV = tuv;

        float depthFactor = 0.04 * (1.0 - u_zoom);
        pUV.x += u_mouse.x * depthFactor;
        pUV.y += u_mouse.y * depthFactor * 0.5;

        float breathe = sin(u_time * 0.5) * 0.004;
        pUV = (pUV - 0.5) * (1.0 + breathe) + 0.5;
        pUV = clamp(pUV, 0.0, 1.0);

        return vec4(sampleBay(pUV), 1.0);
    }

    return room;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    float gTick = floor(u_time * 16.0);

    if (step(0.979, hash1(gTick * 133.77)) > 0.0) {
        uv.x += (hash1(floor(uv.y * 20.0) + gTick) - 0.5) * 0.21 * clamp(u_trip, 0.0, 1.0);
    }

    float panRangeX = 200.0 / 966.0;
    float panRangeY = 200.0 / 1288.0;

    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 966.0 / 1288.0;

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

    float liqAmp = mix(0.012, 0.08, u_isOOB) * u_trip;
    tuv += (r - 0.5) * liqAmp;

    float mt = u_modeTime * u_isOOB;

    float w1 = sin(mt * 0.4 + u_modeSeed);
    float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
    float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);

    float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
    float snap = pow(surge, 2.0) * 0.06 * u_isOOB;

    tuv = (tuv - 0.5) * (1.0 + snap) + 0.5;
    tuv = clamp(tuv, 0.0, 1.0);

    float burstSlot = floor(u_time * 12.0);
    float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed));
    float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1));
    float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);

    float rndG = hash1(burstSlot + u_modeSeed);
    float gridSize = rndG < 0.33 ? 64.0 : (rndG < 0.66 ? 128.0 : 256.0);

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
    vec3 yuvTint = tintRnd > 0.5 ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);

    col = mix(col, degradedCol * yuvTint, doDegrade);

    float miniGrid = gridSize * 2.0;
    vec2 miniBlockUV = floor(tuv * miniGrid) / miniGrid;
    float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
    float doMini = step(0.95, miniRnd) * activeG;

    col = mix(col, vec3(col.b, col.r, col.g), doMini);

    col += vec3(u_flash);

    gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`));
