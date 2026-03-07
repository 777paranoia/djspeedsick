

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.highcity = `


vec3 hcScene(vec3 p) {
  vec3 res = vec3(1000.0, 0.0, 0.0);
  float d; float floorD = p.y + 9.5; if(floorD < res.x) res = vec3(floorD, 0.0, 0.0);


  d=sdBox(p-vec3(-3.0, 4.0, 4.0),vec3(1.1,13.0,1.2)); if(d<res.x) res=vec3(d,0.13,0.0); if(d<res.x-23.0) res.z=1.0;
  d=sdBox(p-vec3(-5.5, 6.5, 8.0),vec3(1.3,16.0,1.3)); if(d<res.x) res=vec3(d,0.27,0.0);
  d=sdBox(p-vec3(-4.0,10.5,13.0),vec3(1.2,20.5,1.2)); if(d<res.x) res=vec3(d,0.41,0.0);
  d=sdBox(p-vec3(-7.0, 5.0,10.0),vec3(1.4,14.0,1.4)); if(d<res.x) res=vec3(d,0.55,0.0);
  d=sdBox(p-vec3(-6.0, 8.0,18.0),vec3(1.1,17.0,1.1)); if(d<res.x) res=vec3(d,0.67,0.0);
  d=sdBox(p-vec3(-9.0, 6.0,15.0),vec3(1.5,15.5,1.3)); if(d<res.x) res=vec3(d,0.79,0.0);
  d=sdBox(p-vec3(-3.5, 4.5,20.0),vec3(1.0,14.0,1.0)); if(d<res.x) res=vec3(d,0.33,0.0);


  d=sdBox(p-vec3( 3.0, 4.0, 4.0),vec3(1.1,13.0,1.2)); if(d<res.x) res=vec3(d,0.19,0.0);
  d=sdBox(p-vec3( 5.5, 7.0, 8.0),vec3(1.3,16.5,1.3)); if(d<res.x) res=vec3(d,0.44,0.0);
  d=sdBox(p-vec3( 4.0,11.0,13.0),vec3(1.2,21.0,1.2)); if(d<res.x) res=vec3(d,0.58,0.0);
  d=sdBox(p-vec3( 7.0, 5.5,10.0),vec3(1.4,15.0,1.4)); if(d<res.x) res=vec3(d,0.72,0.0);
  d=sdBox(p-vec3( 6.0, 8.5,18.0),vec3(1.1,18.0,1.1)); if(d<res.x) res=vec3(d,0.86,0.0);
  d=sdBox(p-vec3( 9.0, 6.5,15.0),vec3(1.5,16.0,1.3)); if(d<res.x) res=vec3(d,0.23,0.0);
  d=sdBox(p-vec3( 3.5, 5.0,20.0),vec3(1.0,14.5,1.0)); if(d<res.x) res=vec3(d,0.91,0.0);



  return res;
}

float hcDist(vec3 p) {
  float d = p.y + 9.5;
  d=min(d,sdBox(p-vec3(-3.0, 4.0, 4.0),vec3(1.1,13.0,1.2)));
  d=min(d,sdBox(p-vec3(-5.5, 6.5, 8.0),vec3(1.3,16.0,1.3)));
  d=min(d,sdBox(p-vec3(-4.0,10.5,13.0),vec3(1.2,20.5,1.2)));
  d=min(d,sdBox(p-vec3(-7.0, 5.0,10.0),vec3(1.4,14.0,1.4)));
  d=min(d,sdBox(p-vec3(-6.0, 8.0,18.0),vec3(1.1,17.0,1.1)));
  d=min(d,sdBox(p-vec3(-9.0, 6.0,15.0),vec3(1.5,15.5,1.3)));
  d=min(d,sdBox(p-vec3(-3.5, 4.5,20.0),vec3(1.0,14.0,1.0)));
  d=min(d,sdBox(p-vec3( 3.0, 4.0, 4.0),vec3(1.1,13.0,1.2)));
  d=min(d,sdBox(p-vec3( 5.5, 7.0, 8.0),vec3(1.3,16.5,1.3)));
  d=min(d,sdBox(p-vec3( 4.0,11.0,13.0),vec3(1.2,21.0,1.2)));
  d=min(d,sdBox(p-vec3( 7.0, 5.5,10.0),vec3(1.4,15.0,1.4)));
  d=min(d,sdBox(p-vec3( 6.0, 8.5,18.0),vec3(1.1,18.0,1.1)));
  d=min(d,sdBox(p-vec3( 9.0, 6.5,15.0),vec3(1.5,16.0,1.3)));
  d=min(d,sdBox(p-vec3( 3.5, 5.0,20.0),vec3(1.0,14.5,1.0)));
  return d;
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);

  float t = 0.0;
  vec3 hit = vec3(0.0);
  for(int i = 0; i < 90; i++) {
    hit = hcScene(ro + rd * t);
    if(hit.x < 0.001 || t > 70.0) break;
    t += hit.x;
  }

  vec3 cAmb  = vec3(0.5, 0.28, 0.08);
  vec3 cBlue = vec3(0.04, 0.06, 0.18);
  vec3 skyTone = mix(vec3(0.003,0.005,0.015), cBlue, exp(-max(rd.y,0.0)*3.5))
               + cAmb * smoothstep(0.0,-0.6,rd.y) * 0.3;

  vec3 col = vec3(0.0);

  if(t < 70.0) {
    vec3 p = ro + rd * t;
    float bseed = hit.y;
    float e = 0.01;
    vec3 n = normalize(vec3(
      hcDist(p+vec3(e,0,0))-hcDist(p-vec3(e,0,0)),
      hcDist(p+vec3(0,e,0))-hcDist(p-vec3(0,e,0)),
      hcDist(p+vec3(0,0,e))-hcDist(p-vec3(0,0,e))
    ));

    if(bseed < 0.001) {

      col = vec3(0.04,0.05,0.07);
      col = mix(col, skyTone, 1.0-exp(-0.015*t*t));
    } else if(n.y > 0.7) {

      col = vec3(0.05,0.055,0.07) * (0.5 + 0.5*n.y);
      col = mix(col, skyTone, 1.0-exp(-0.01*t*t));
    } else {

      vec2 texUV = abs(n.z) > abs(n.x) ? p.xy : p.zy;
      vec2 uv = abs(fract(texUV * 0.25) * 2.0 - 1.0);
      vec3 bTex;
      if(bseed < 0.33)      bTex = texture2D(u_texB4, uv).rgb;
      else if(bseed < 0.66) bTex = texture2D(u_texB5, uv).rgb;
      else                  bTex = texture2D(u_texB6, uv).rgb;
      bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.0;
      col = bTex * (0.18 + max(0.0,-n.y)*0.2);
      col = mix(col, skyTone, 1.0-exp(-0.015*t*t));

      vec2 wg = floor(texUV * vec2(5.0, 10.0));
      float won    = step(0.82, hash2(wg + bseed * 17.0));
      float wflick = step(0.96, hash1(hash2(wg) + floor(u_time * 1.5)));
      float wpx    = smoothstep(0.005, 0.0, abs(fract(texUV.x*5.0)-0.5)-0.15)
                   * smoothstep(0.005, 0.0, abs(fract(texUV.y*10.0)-0.5)-0.10);
      col += vec3(1.0, 0.75, 0.35) * won * (1.0-wflick) * wpx * 1.2;
    }
  } else {
    col = skyTone;
  }


  vec2 suv = gl_FragCoord.xy / u_resolution.xy;
  float storm = 0.0;
  storm += worldRainLayer(suv, u_time, 22.0, 3.8, 0.003, 0.18, 0.03);
  storm += worldRainLayer(suv, u_time, 38.0, 5.2, 0.002, 0.22, 0.04);
  storm += worldRainLayer(suv, u_time, 58.0, 7.0, 0.0015, 0.26, 0.05);
  col += vec3(0.55, 0.65, 0.75) * clamp(storm, 0.0, 1.0) * 0.4;

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV=clamp(wuv,0.0,1.0);
    vec4 txW=texture2D(u_texWindow,edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.35,0.42,0.55),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb*0.5+cAmb*(noise1(u_time*0.4)*0.04)*txW.a, txW.a);
  }

  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor = vec4(col*(1.0-u_blink)*0.75*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
