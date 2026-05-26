((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (GLSL.modules.room_laptop = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1;
uniform sampler2D u_texEnv2;
uniform float u_trip;
uniform float u_zoom;
uniform float u_blink;
uniform float u_wake;
uniform float u_flash;

float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }

vec2 fitLaptopImage(vec2 uv) {
    float screenAspect = u_resolution.x / u_resolution.y;
    float imgAspect = 941.0 / 1672.0;
    float visibleAspect = mix(imgAspect, 0.68, smoothstep(0.7, 2.0, screenAspect));
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }
    tuv.x = tuv.x * 0.88 + 0.06;
    tuv.y = tuv.y * 0.88 + 0.06;
    return tuv;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    vec2 tuv = fitLaptopImage(uv);
    float zAmt = clamp(u_zoom, 0.0, 1.0);
    vec2 screenCenter = vec2(0.5, 0.43);
    tuv = mix(tuv, screenCenter + (tuv - screenCenter) * 0.92, zAmt * zAmt);

    // wake camera rise: view starts tilted up, settles to neutral as u_wake goes 0→1
    tuv.y += (1.0 - u_wake) * 0.22;

    // world-space camera pan — laptop is an object on a desk, not a HUD
    tuv.x -= u_mouse.x * 0.18;
    tuv.y -= u_mouse.y * 0.12;

    float scan = sin((uv.y * u_resolution.y + u_time * 20.0) * 1.8) * 0.012;
    float grain = (hash2(gl_FragCoord.xy + floor(u_time * 24.0)) - 0.5) * 0.045 * clamp(u_trip, 0.0, 1.0);
    vec3 col = texture2D(u_texEnv1, clamp(tuv, 0.0, 1.0)).rgb;

    // chroma-key: replace green screen with video, locked to the stable tuv position
    float greenDom = col.g - max(col.r, col.b);
    float keyMask = step(0.35, col.g) * step(0.25, greenDom);
    if (keyMask > 0.5) {
        vec2 vidUV = clamp(tuv, 0.0, 1.0);
        vec3 vid = texture2D(u_texEnv2, vidUV).rgb;
        col = vid;
    }

    col += scan + grain + vec3(u_flash);
    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);
    gl_FragColor = vec4(col, 1.0);
}
`));
