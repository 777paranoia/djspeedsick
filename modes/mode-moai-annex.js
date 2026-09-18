(function () {
  ((window.GLSL = window.GLSL || {}),
    (window.GLSL.modules = window.GLSL.modules || {}),
    (GLSL.modules.z4_space_br = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1;
uniform sampler2D u_bcTex;
uniform float u_blink;
uniform float u_wake;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float screenAspect = u_resolution.x / u_resolution.y;
    float imgAspect = 1080.0 / 1920.0;
    float wide = smoothstep(0.7, 2.0, screenAspect);
    float bandH = mix(1.0, 0.52, wide);
    float stretch = mix(1.0, 1.35, wide);
    float bandCenterY = mix(0.5, 0.60, wide);
    float panX = mix(0.06, 0.05, wide);
    float panY = mix(0.06, 0.15, wide);
    float uSpan = bandH * screenAspect / (imgAspect * stretch);
    vec2 tuv;
    tuv.x = 0.5 + (uv.x - 0.5) * uSpan + u_mouse.x * panX;
    tuv.y = bandCenterY + (uv.y - 0.5) * bandH - u_mouse.y * panY;
    tuv = clamp(tuv, 0.0, 1.0);
    vec4 room = texture2D(u_texEnv1, tuv);
    vec3 col = room.rgb;
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (isGreen) { col = texture2D(u_bcTex, tuv).rgb; }
    gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`));
  ((window.Zone4MoaiAnnex = window.Zone4MoaiAnnex || {}),
    (window.Zone4MoaiAnnex.buildMoaiAnnexScene = function (ctx) {
      with (ctx) {
        const P = pointLocal,
          B = addBox;
        const moaiRoomStart = meshes.length,
          X0 = 2.52,
          X1 = 10.4,
          Y0 = -1.05,
          Y1 = 2.35,
          HALF_W = 2.9,
          THROAT_HALF_W = 1.16,
          WALL_L = -(HALF_W - 0.02),
          WALL_R = HALF_W - 0.02,
          SILL_Y = Y0 + 0.62,
          HEAD_Y = Y1 - 0.44,
          metalDark = [0.05, 0.055, 0.068],
          frameCol = [0.1, 0.11, 0.13];
        function addQuadUV(a, b, c, d, tex, col, texMix, blend) {
          const q = [];
          pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
          const mesh = self._makeMesh(
            q,
            tex || TEX.black,
            col || [1, 1, 1],
            "number" == typeof texMix ? texMix : 1,
            !!blend,
          );
          return (meshes.push(mesh), mesh);
        }
        function wallFacingPosZ(x0, x1, y0, y1, z, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const xa = x0 + ((x1 - x0) * k) / n,
              xb = x0 + ((x1 - x0) * (k + 1)) / n;
            addQuadUV(
              P(xa, y0, z),
              P(xb, y0, z),
              P(xb, y1, z),
              P(xa, y1, z),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }
        function wallFacingNegZ(x0, x1, y0, y1, z, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const xa = x0 + ((x1 - x0) * k) / n,
              xb = x0 + ((x1 - x0) * (k + 1)) / n;
            addQuadUV(
              P(xb, y0, z),
              P(xa, y0, z),
              P(xa, y1, z),
              P(xb, y1, z),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }
        function wallFacingNegX(x, z0, z1, y0, y1, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const za = z0 + ((z1 - z0) * k) / n,
              zb = z0 + ((z1 - z0) * (k + 1)) / n;
            addQuadUV(
              P(x, y0, za),
              P(x, y0, zb),
              P(x, y1, zb),
              P(x, y1, za),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }
        function wallFacingPosX(x, z0, z1, y0, y1, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const za = z0 + ((z1 - z0) * k) / n,
              zb = z0 + ((z1 - z0) * (k + 1)) / n;
            addQuadUV(
              P(x, y0, zb),
              P(x, y0, za),
              P(x, y1, za),
              P(x, y1, zb),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }
        function floorPatch(x0, x1, z0, z1, y, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const xa = x0 + ((x1 - x0) * k) / n,
              xb = x0 + ((x1 - x0) * (k + 1)) / n;
            addQuadUV(
              P(xa, y, z1),
              P(xb, y, z1),
              P(xb, y, z0),
              P(xa, y, z0),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }
        function ceilPatch(x0, x1, z0, z1, y, tex, tiles) {
          const n = Math.max(1, tiles || 1);
          for (let k = 0; k < n; k++) {
            const xa = x0 + ((x1 - x0) * k) / n,
              xb = x0 + ((x1 - x0) * (k + 1)) / n;
            addQuadUV(
              P(xa, y, z0),
              P(xb, y, z0),
              P(xb, y, z1),
              P(xa, y, z1),
              tex,
              [1, 1, 1],
              1,
            );
          }
        }

        floorPatch(X0 - 0.04, X1, -HALF_W, HALF_W, Y0 + 0.012, TEX.floor, 3);
        ceilPatch(X0 - 0.04, X1, -HALF_W, HALF_W, Y1 - 0.012, TEX.ceil, 3);
        wallFacingNegX(X1 - 0.02, -HALF_W, HALF_W, Y0, Y1, TEX.rp2, 2);
        wallFacingPosX(X0, -HALF_W, -THROAT_HALF_W, Y0, Y1, TEX.lp2, 1);
        wallFacingPosX(X0, THROAT_HALF_W, HALF_W, Y0, Y1, TEX.lp2, 1);
        wallFacingPosX(X0, -THROAT_HALF_W, THROAT_HALF_W, 1.0584, Y1, TEX.lp1, 1);

        const WIN_X0 = X0 + 0.42,
          WIN_X1 = X1 - 0.42;
        wallFacingNegZ(X0, X1 - 0.02, Y0, SILL_Y, WALL_R, TEX.rp3, 3);
        wallFacingNegZ(X0, X1 - 0.02, HEAD_Y, Y1, WALL_R, TEX.rp1, 3);
        wallFacingNegZ(X0, WIN_X0, SILL_Y, HEAD_Y, WALL_R, TEX.rp2, 1);
        wallFacingNegZ(WIN_X1, X1 - 0.02, SILL_Y, HEAD_Y, WALL_R, TEX.rp2, 1);
        B(WIN_X0, WIN_X1, SILL_Y - 0.035, SILL_Y + 0.02, WALL_R - 0.06, WALL_R, TEX.black, frameCol, 0);
        B(WIN_X0, WIN_X1, HEAD_Y - 0.02, HEAD_Y + 0.035, WALL_R - 0.06, WALL_R, TEX.black, frameCol, 0);
        for (let m = 1; m <= 3; m++) {
          const mx = WIN_X0 + ((WIN_X1 - WIN_X0) * m) / 4;
          B(mx - 0.035, mx + 0.035, SILL_Y, HEAD_Y, WALL_R - 0.06, WALL_R, TEX.black, frameCol, 0);
        }

        {
          const CC_X = (X0 + X1) * 0.5,
            CC_Z = WALL_R - 0.24,
            DESK_Y = Y0 + 0.72,
            deskHalf = 1.24,
            screenCols = {
              cool: [0.16, 1.45, 1.2],
              pale: [0.42, 1.3, 1.15],
              dim: [0.1, 0.82, 0.74],
            };
          B(CC_X - deskHalf, CC_X + deskHalf, Y0 + 0.1, DESK_Y,
            CC_Z - 0.28, CC_Z + 0.26, TEX.rp2, [0.62, 0.64, 0.68], 0.72);
          B(CC_X - deskHalf + 0.12, CC_X + deskHalf - 0.12, Y0, Y0 + 0.1,
            CC_Z - 0.16, CC_Z + 0.22, TEX.black, [0.09, 0.1, 0.12], 0);
          B(CC_X - deskHalf, CC_X + deskHalf, DESK_Y, DESK_Y + 0.035,
            CC_Z - 0.3, CC_Z + 0.28, TEX.black, [0.14, 0.15, 0.17], 0);
          B(CC_X - 0.28, CC_X + 0.28, DESK_Y + 0.035, DESK_Y + 0.075,
            CC_Z - 0.25, CC_Z - 0.09, TEX.black, [0.13, 0.14, 0.16], 0);
          B(CC_X + 0.62, CC_X + 0.85, DESK_Y + 0.035, DESK_Y + 0.21,
            CC_Z - 0.15, CC_Z + 0.05, TEX.rp2, [0.5, 0.52, 0.55], 0.7);
          B(CC_X - 0.9, CC_X - 0.66, DESK_Y + 0.035, DESK_Y + 0.2,
            CC_Z - 0.16, CC_Z + 0.08, TEX.rp2, [0.5, 0.52, 0.55], 0.7);
          function monitor(u, y0, w, h, yaw, col, depthOff) {
            const ca = Math.cos(yaw),
              sa = Math.sin(yaw),
              cx = CC_X + u * ca,
              cz = CC_Z + u * sa + (depthOff || 0),
              nx = sa,
              nz = -ca,
              hw = w * 0.5,
              y1 = y0 + h,
              face = (ox, oz, half, a0, a1) =>
                addQuadUV(
                  P(cx + half * ca + ox, a0, cz + half * sa + oz),
                  P(cx - half * ca + ox, a0, cz - half * sa + oz),
                  P(cx - half * ca + ox, a1, cz - half * sa + oz),
                  P(cx + half * ca + ox, a1, cz + half * sa + oz),
                  TEX.black,
                  col,
                  0,
                );
            face(-nx * 0.04, -nz * 0.04, hw + 0.03, y0 - 0.03, y1 + 0.03);
            addQuadUV(
              P(cx + hw * ca, y0, cz + hw * sa),
              P(cx - hw * ca, y0, cz - hw * sa),
              P(cx - hw * ca, y1, cz - hw * sa),
              P(cx + hw * ca, y1, cz + hw * sa),
              TEX.black,
              [0.055, 0.06, 0.07],
              0,
            );
          }
          monitor(-0.368, DESK_Y + 0.24, 0.705, 0.426, 0, screenCols.cool);
          monitor(0.368, DESK_Y + 0.24, 0.705, 0.426, 0, screenCols.dim);
          monitor(0, DESK_Y + 0.704, 1.066, 0.607, 0, screenCols.pale);
          monitor(-0.368, DESK_Y + 1.344, 0.656, 0.361, 0, screenCols.dim);
          monitor(0.4, DESK_Y + 1.344, 0.508, 0.361, 0, screenCols.cool);
          monitor(-0.992, DESK_Y + 0.208, 0.541, 0.377, 0.62, screenCols.dim, -0.13);
          monitor(-1.04, DESK_Y + 0.688, 0.607, 0.426, 0.62, screenCols.cool, -0.13);
          monitor(-0.96, DESK_Y + 1.216, 0.426, 0.312, 0.62, screenCols.pale, -0.13);
          monitor(0.992, DESK_Y + 0.208, 0.541, 0.377, -0.62, screenCols.pale, -0.13);
          monitor(1.04, DESK_Y + 0.688, 0.607, 0.426, -0.62, screenCols.dim, -0.13);
          monitor(0.944, DESK_Y + 1.2, 0.459, 0.328, -0.62, screenCols.cool, -0.13);
        }

        const BR_EYE_X = 8.875,
          BR_HOLE_W = 0.861,
          BR_HOLE_H = 1.536,
          BR_SILL_Y = Y0 + 0.018,
          BR_EYE_TO_WALL = 0.722,
          BR_PLATE_SETBACK = 0.055,
          BR_X0 = 7.95,
          BR_X1 = X1 - 0.02,
          BR_SIDE_Z = -BR_EYE_TO_WALL,
          BR_DOOR_X0 = BR_EYE_X - BR_HOLE_W * 0.5,
          BR_DOOR_X1 = BR_EYE_X + BR_HOLE_W * 0.5,
          BR_DOOR_TOP = BR_SILL_Y + BR_HOLE_H,
          BR_FRAME_D = 0.1;
        wallFacingPosZ(X0, X1 - 0.02, Y0, Y1, WALL_L, TEX.lp2, 3);
        wallFacingPosX(BR_X0, WALL_L, BR_SIDE_Z, Y0, Y1, TEX.lp2, 1);
        wallFacingPosZ(BR_X0, BR_DOOR_X0, Y0, Y1, BR_SIDE_Z, TEX.lp2, 1);
        wallFacingPosZ(BR_DOOR_X1, BR_X1, Y0, Y1, BR_SIDE_Z, TEX.lp2, 1);
        wallFacingPosZ(BR_DOOR_X0, BR_DOOR_X1, Y0, BR_SILL_Y, BR_SIDE_Z, TEX.lp2, 1);
        {
          const eyeY = -0.02,
            plateZ = BR_SIDE_Z - BR_PLATE_SETBACK,
            pScale = Math.abs(plateZ) / Math.abs(BR_SIDE_Z),
            setback = 1 + 0.42 * (pScale - 1),
            overscan = 1.01,
            holeY0 = BR_SILL_Y,
            holeY1 = BR_DOOR_TOP;
          let plateY0 = eyeY + (holeY0 - eyeY) * setback,
            plateY1 = eyeY + (holeY1 - eyeY) * setback;
          const lift = 0.18 * (plateY1 - plateY0);
          ((plateY0 += lift), (plateY1 += lift));
          plateY0 -= 0.34 * (plateY1 - plateY0);
          const plateX0 = BR_EYE_X + (BR_DOOR_X0 - BR_EYE_X) * setback * overscan,
            plateX1 = BR_EYE_X + (BR_DOOR_X1 - BR_EYE_X) * setback * overscan,
            vTop = 0.1,
            vBottom = 1,
            q = [];
          pushQuad(
            q,
            P(plateX1, plateY0, plateZ),
            P(plateX0, plateY0, plateZ),
            P(plateX0, plateY1, plateZ),
            P(plateX1, plateY1, plateZ),
            [1, vBottom],
            [0, vBottom],
            [0, vTop],
            [1, vTop],
          );
          const mesh = self._makeMesh(q, TEX.spaceBathroom, [1, 1, 1], 1, !1);
          ((mesh.greenKey = !0), meshes.push(mesh));
        }
        wallFacingPosZ(
          BR_DOOR_X0,
          BR_DOOR_X1,
          BR_DOOR_TOP,
          Y1,
          BR_SIDE_Z,
          TEX.lp1,
          1,
        );
        B(
          BR_DOOR_X0 - 0.075,
          BR_DOOR_X0 + 0.025,
          Y0,
          BR_DOOR_TOP + 0.075,
          BR_SIDE_Z,
          BR_SIDE_Z + BR_FRAME_D,
          TEX.black,
          frameCol,
          0,
        );
        B(
          BR_DOOR_X1 - 0.025,
          BR_DOOR_X1 + 0.075,
          Y0,
          BR_DOOR_TOP + 0.075,
          BR_SIDE_Z,
          BR_SIDE_Z + BR_FRAME_D,
          TEX.black,
          frameCol,
          0,
        );
        B(
          BR_DOOR_X0 - 0.075,
          BR_DOOR_X1 + 0.075,
          BR_DOOR_TOP - 0.025,
          BR_DOOR_TOP + 0.075,
          BR_SIDE_Z,
          BR_SIDE_Z + BR_FRAME_D,
          TEX.black,
          frameCol,
          0,
        );

        const CRYO_R = 0.85,
          CRYO_Z = -1.95,
          CRYO_SEGS = 12,
          PED_H = 0.22,
          capBottomY = Y1 - 0.5,
          moaiFaces = [TEX.moaiFace1, TEX.moaiFace2, TEX.moaiFace3];
        function addCryoCylinder(cx, faceTex) {
          B(cx - 0.92, cx + 0.92, Y0, Y0 + PED_H, CRYO_Z - 0.92, CRYO_Z + 0.92, TEX.black, metalDark, 0);
          B(cx - 0.8, cx + 0.8, Y0 + PED_H, Y0 + PED_H + 0.04, CRYO_Z - 0.8, CRYO_Z + 0.8, TEX.black, frameCol, 0);
          B(cx - 0.82, cx + 0.82, capBottomY, capBottomY + 0.22, CRYO_Z - 0.82, CRYO_Z + 0.82, TEX.black, metalDark, 0);
          addQuadUV(
            P(cx - 0.62, capBottomY - 0.01, CRYO_Z - 0.62),
            P(cx + 0.62, capBottomY - 0.01, CRYO_Z - 0.62),
            P(cx + 0.62, capBottomY - 0.01, CRYO_Z + 0.62),
            P(cx - 0.62, capBottomY - 0.01, CRYO_Z + 0.62),
            TEX.black,
            [2.4, 4.2, 6.2],
            0,
          );
          B(
            cx - 0.36,
            cx + 0.36,
            Y0 + PED_H + 0.05,
            capBottomY - 0.04,
            CRYO_Z - 0.66,
            CRYO_Z - 0.58,
            TEX.black,
            [0.8, 1.9, 3.2],
            0,
          );
          const mw = 0.44,
            md = 0.32,
            mB = Y0 + PED_H + 0.05,
            mT = mB + 2.5;
          addQuadUV(
            P(cx - mw, mB, CRYO_Z + md),
            P(cx + mw, mB, CRYO_Z + md),
            P(cx + mw, mT, CRYO_Z + md),
            P(cx - mw, mT, CRYO_Z + md),
            faceTex,
            [1.7, 2.0, 2.4],
            0.86,
          );
          addQuadUV(
            P(cx + mw, mB, CRYO_Z - md),
            P(cx - mw, mB, CRYO_Z - md),
            P(cx - mw, mT, CRYO_Z - md),
            P(cx + mw, mT, CRYO_Z - md),
            TEX.moaiBack,
            [1.7, 2.0, 2.4],
            0.86,
          );
          addQuadUV(
            P(cx + mw, mB, CRYO_Z + md),
            P(cx + mw, mB, CRYO_Z - md),
            P(cx + mw, mT, CRYO_Z - md),
            P(cx + mw, mT, CRYO_Z + md),
            TEX.moaiSide,
            [1.7, 2.0, 2.4],
            0.86,
          );
          addQuadUV(
            P(cx - mw, mB, CRYO_Z - md),
            P(cx - mw, mB, CRYO_Z + md),
            P(cx - mw, mT, CRYO_Z + md),
            P(cx - mw, mT, CRYO_Z - md),
            TEX.moaiSide,
            [1.7, 2.0, 2.4],
            0.86,
          );
          addQuadUV(
            P(cx - mw, mT, CRYO_Z - md),
            P(cx + mw, mT, CRYO_Z - md),
            P(cx + mw, mT, CRYO_Z + md),
            P(cx - mw, mT, CRYO_Z + md),
            TEX.black,
            [0.16, 0.16, 0.17],
            0,
          );
          for (let s = 0; s < CRYO_SEGS; s++) {
            const a0 = (s / CRYO_SEGS) * 2 * Math.PI,
              a1 = ((s + 1) / CRYO_SEGS) * 2 * Math.PI,
              p = function (a, y) {
                return P(
                  cx + Math.cos(a) * CRYO_R,
                  y,
                  CRYO_Z + Math.sin(a) * CRYO_R,
                );
              },
              q = [];
            pushQuad(
              q,
              p(a1, Y0 + PED_H + 0.04),
              p(a0, Y0 + PED_H + 0.04),
              p(a0, capBottomY),
              p(a1, capBottomY),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const mesh = self._makeMesh(
              q,
              TEX.cryoFrost,
              [0.55, 0.8, 1.15],
              0.35,
              !0,
            );
            ((mesh.useTexAlpha = !0), meshes.push(mesh));
          }
          for (let s = 0; s < CRYO_SEGS; s++) {
            const a0 = (s / CRYO_SEGS) * 2 * Math.PI,
              a1 = ((s + 1) / CRYO_SEGS) * 2 * Math.PI,
              gp = function (a, y) {
                return P(
                  cx + Math.cos(a) * (CRYO_R + 0.045),
                  y,
                  CRYO_Z + Math.sin(a) * (CRYO_R + 0.045),
                );
              };
            for (const band of [
              [Y0 + PED_H + 0.04, Y0 + PED_H + 0.17],
              [capBottomY - 0.13, capBottomY],
            ]) {
              const q2 = [];
              pushQuad(
                q2,
                gp(a1, band[0]),
                gp(a0, band[0]),
                gp(a0, band[1]),
                gp(a1, band[1]),
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              );
              const gm = self._makeMesh(
                q2,
                TEX.cryoFrost,
                [1.2, 2.6, 4.2],
                0.15,
                !0,
              );
              ((gm.useTexAlpha = !0), meshes.push(gm));
            }
          }
          B(cx + 0.66, cx + 0.96, Y0 + 1.0, Y0 + 1.45, CRYO_Z + 0.76, CRYO_Z + 0.86, TEX.black, metalDark, 0);
          addQuadUV(
            P(cx + 0.685, Y0 + 1.04, CRYO_Z + 0.865),
            P(cx + 0.935, Y0 + 1.04, CRYO_Z + 0.865),
            P(cx + 0.935, Y0 + 1.41, CRYO_Z + 0.865),
            P(cx + 0.685, Y0 + 1.41, CRYO_Z + 0.865),
            TEX.black,
            [0.2, 0.75, 1.15],
            0,
          );
        }
        const cryoXs = [3.6, 3.6 + 2 * CRYO_R, 3.6 + 4 * CRYO_R];
        for (let c = 0; c < cryoXs.length; c++)
          addCryoCylinder(cryoXs[c], moaiFaces[c % moaiFaces.length]);

        for (let c = 0; c < cryoXs.length; c++) {
          B(
            cryoXs[c] - 0.6,
            cryoXs[c] + 0.6,
            Y1 - 0.085,
            Y1 - 0.042,
            -0.2,
            0.35,
            TEX.black,
            [2.7, 2.95, 3.5],
            0,
          );
        }

        markMeshes(moaiRoomStart, "annexMoaiOnly");
      }
    }));
})();
