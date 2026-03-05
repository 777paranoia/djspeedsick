// MODE 8 - GOREVILLE 

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.goreville = `
// Gore textures: u_texEnv2=gorebuilding01, u_texEnv3=gorebuilding02,
//                u_texEnv4=gorebuilding03, u_texEnv5=gorewater
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
  r += goreRainLayer(uv, t, 14.0, 3.2, 0.006, 0.22, -0.10);
  r += goreRainLayer(uv, t, 24.0, 4.5, 0.004, 0.28, -0.13);
  r += goreRainLayer(uv, t, 40.0, 6.0, 0.003, 0.34, -0.16);
  r += goreRainLayer(uv, t, 60.0, 8.0, 0.002, 0.38, -0.18);
  r += goreRainLayer(uv, t, 90.0, 10.0, 0.001, 0.42, -0.20);
  return clamp(r, 0.0, 1.0);
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);

  // --- HALLUCINOGEN SWELL WARP (no jitter, pure slow organic distortion) ---
  float swellA = noise1(u_time * 0.07) * 0.5 + 0.5;
  float swellB = noise1(u_time * 0.11 + 5.3) * 0.5 + 0.5;
  float swell  = swellA * swellB; // slow independent oscillators -> occasional peaks
  float warpAmt = mix(0.04, 0.22, swell * swell);
  vec2 wuv2 = rd.xy;
  float wx = fbm(wuv2 * 3.0 + vec2(u_time * 0.018, 0.0));
  float wy = fbm(wuv2 * 3.0 + vec2(0.0, u_time * 0.014) + 4.7);
  rd.xy += (vec2(wx, wy) - 0.5) * warpAmt;
  rd = normalize(rd);

  float t = 0.0; vec2 hit = vec2(0.0);
  for(int i = 0; i < 90; i++) { hit = mapScene(ro + rd * t, true); if(hit.x < 0.001 || t > 70.0) break; t += hit.x; }

  vec3 cBlood   = vec3(0.55, 0.0,  0.02);
  vec3 cCrimson = vec3(0.85, 0.04, 0.04);

  // Black sky
  vec3 skyTone = vec3(0.0);

  // Swell lighting — blood-red light pulse, no movement
  float swellLight = swell * swell * 0.35;

  vec3 col = vec3(0.0);

  if(t < 70.0) {
    vec3 p = ro + rd * t;

    if(hit.y >= 10.0) {
      // Fractal hit
      col = mix(colorPickover(p), skyTone, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
      col = mix(col, cCrimson * 0.4, 0.3);

    } else if(hit.y > 19.5) {
      // Floor
      vec2 floorUV = p.xz * 0.04 + vec2(u_time * 0.005, 0.0);
      vec3 floorCol = texture2D(u_texEnv5, fract(floorUV)).rgb;
      vec2 wn = waterNormal(gl_FragCoord.xy / u_resolution) * 0.3;
      floorCol = mix(floorCol,
        texture2D(u_texEnv5, fract(floorUV + wn * 0.015)).rgb,
        clamp(texture2D(u_water, gl_FragCoord.xy / u_resolution).r * 5.0, 0.0, 0.6));
      floorCol = mix(floorCol, cBlood, 0.35);
      col = mix(floorCol + cCrimson * swellLight, skyTone, 1.0 - exp(-0.018 * t * t));

    } else {
      vec3 n = normalize(vec3(
        mapScene(p + vec3(0.01,0,0), false).x - mapScene(p - vec3(0.01,0,0), false).x,
        mapScene(p + vec3(0,0.01,0), false).x - mapScene(p - vec3(0,0.01,0), false).x,
        mapScene(p + vec3(0,0,0.01), false).x - mapScene(p - vec3(0,0,0.01), false).x
      ));
      vec3 bTex = sampleGoreBuilding(hit.y, (abs(n.x) > abs(n.y)) ? p.zy : p.xy);
      bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
      col = mix(bTex * (0.18 + swellLight), skyTone, 1.0 - exp(-0.015 * t * t))
          + cBlood * (noise1(u_time * 0.25 + p.x * 0.1) * 0.4 + 0.6)
          * smoothstep(2.0, -20.0, p.y) * 0.38 * exp(-0.005 * t * t);
    }
  }

  // Torrential red rain
  float rain = goreRain(gl_FragCoord.xy / u_resolution.xy, u_time);
  col += cCrimson * rain * 1.1;

  // Window overlay
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