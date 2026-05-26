((window.GLSL = window.GLSL || {}),
  (window.GLSL.modules = window.GLSL.modules || {}),
  (GLSL.modules.z2_room_left_textures = Object.assign(
    {},
    GLSL.modules.z2_room_left_textures || {},
    {
      normal: "files/img/rooms/z2/bathroom.png",
    },
  )),
  (GLSL.modules.z2_room_left = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1;
uniform float u_blink;
uniform float u_wake;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float screenAspect = u_resolution.x / u_resolution.y;
    float imgAspect = 1080.0 / 1920.0;
    float visibleAspect = mix(imgAspect, 0.62, smoothstep(0.7, 2.0, screenAspect));
    float panRangeX = mix(0.06, 0.10, smoothstep(0.7, 1.4, screenAspect));
    float panRangeY = mix(0.06, 0.28, smoothstep(0.7, 1.4, screenAspect));
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
    tuv = clamp(tuv, 0.0, 1.0);
    vec4 room = texture2D(u_texEnv1, tuv);
    float fade = (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);
    gl_FragColor = vec4(room.rgb * fade, room.a);
}
`));
