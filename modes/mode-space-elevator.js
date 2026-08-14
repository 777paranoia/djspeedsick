// Space elevator platform.
//
// The SDF and shading here are lifted verbatim out of modes/mode-door.js
// (`room_door`), where this same bay is raymarched behind the Z1 doorway when
// __z4Route opens it. Nothing is invented — it is the same cable, guide rails,
// scaffold rings/beams, disc, lip, hub and 8 railing posts, pulled out into a
// standalone full-screen module so the Z2 hallway can show it at the south end
// when blood deals the elevator route.
//
// u_walk 0..1 pulls the camera in from far (-20) to standing on the deck (2),
// same range room_door drove off u_zoom.
((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (window.GLSL.modules.space_elevator = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_walk;
uniform vec2 u_mouse;

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

    // Static framing. u_walk is held at one value by the engine — the platform
    // does NOT dolly. Walking down the hallway moves you through the hallway's
    // own perspective; moving this camera too was a second zoom on top of it.
    float walk = clamp(u_walk, 0.0, 1.0);

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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // sampleBay expects a TOP-DOWN image UV — that is what room_door handed it
    // (a texture tuv), and why it carries the v.y *= -1.55 above. gl_FragCoord
    // counts up from the bottom, so flip here. Without this the chamber renders
    // upside down.
    uv.y = 1.0 - uv.y;
    uv.x += u_mouse.x * 0.035;
    uv.y -= u_mouse.y * 0.020;
    gl_FragColor = vec4(sampleBay(clamp(uv, 0.0, 1.0)), 1.0);
}
`));
