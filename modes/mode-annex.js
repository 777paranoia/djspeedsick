(function () {
  window.Zone4Annex = window.Zone4Annex || {};
  window.Zone4Annex.buildStationMeshes = function () {
      const SECTION_COUNT = 16;
      const RING_RADIUS = 15.5;
      const SECTION_ANGLE = (Math.PI * 2) / SECTION_COUNT;
      const FLOOR_Y = -1.05;
      const CEIL_Y = 1.18;
      const INNER_W = -2.35;
      const OUTER_W = 2.35;
      const LEFT_MID_TOP = 0.60;
      const LEFT_MID_BOT = -0.40;
      const RIGHT_MID_TOP = 0.60;
      const RIGHT_MID_BOT = -0.40;
      const LEFT_TOP_X = -1.70;
      const RIGHT_TOP_X = 1.70;
      const LEFT_LOW_X = -1.85;
      const RIGHT_LOW_X = 1.85;
      const meshes = this.stationMeshes;
      const TEX = this.stationTextures;
      function normalize(v) {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
      }
      function sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      }
      function cross(a, b) {
        return [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
      }
      function sectionFrame(a) {
        const center = [Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS];
        const radial = normalize([Math.cos(a), 0, Math.sin(a)]);
        const tangent = normalize([-Math.sin(a), 0, Math.cos(a)]);
        return { center: center, radial: radial, tangent: tangent, up: [0, 1, 0] };
      }
      function isInnerWindowSection(i) {
        return i === 15 || i === 0 || i === 1 || i === 4 || i === 12;
      }
      function isOuterWindowSection(i) {
        return i === 1 || i === 7 || i === 8 || i === 9 || i === 15;
      }
      function isOuterDoorSection(i) {
        return i === 0;
      }
      function isGroupedWindowFloorSection(i) {
        return i === 7 || i === 8 || i === 9 || i === 15 || i === 0 || i === 1;
      }
      function pointOnFrame(f, x, y) {
        return [
          f.center[0] + f.radial[0] * x + f.up[0] * y,
          f.center[1] + f.radial[1] * x + f.up[1] * y,
          f.center[2] + f.radial[2] * x + f.up[2] * y,
        ];
      }
      function pushTri(arr, p0, p1, p2, n0, n1, n2, u0, v0, u1, v1, u2, v2) {
        arr.push(
          p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], u0, v0,
          p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], u1, v1,
          p2[0], p2[1], p2[2], n2[0], n2[1], n2[2], u2, v2
        );
      }
      function quadNormal(a, b, c) {
        return normalize(cross(sub(b, a), sub(c, a)));
      }
      function pushQuad(arr, p00, p10, p11, p01, uv00, uv10, uv11, uv01) {
        const n = quadNormal(p00, p10, p11);
        pushTri(arr, p00, p10, p11, n, n, n, uv00[0], uv00[1], uv10[0], uv10[1], uv11[0], uv11[1]);
        pushTri(arr, p00, p11, p01, n, n, n, uv00[0], uv00[1], uv11[0], uv11[1], uv01[0], uv01[1]);
      }
      const self = this;
      function addSection(i) {
        const a0 = i * SECTION_ANGLE;
        const a1 = (i + 1) * SECTION_ANGLE;
        const f0 = sectionFrame(a0);
        const f1 = sectionFrame(a1);
        const pts = {
          fl0: pointOnFrame(f0, INNER_W, FLOOR_Y),
          fl1: pointOnFrame(f1, INNER_W, FLOOR_Y),
          fr0: pointOnFrame(f0, OUTER_W, FLOOR_Y),
          fr1: pointOnFrame(f1, OUTER_W, FLOOR_Y),
          c0l: pointOnFrame(f0, LEFT_TOP_X, CEIL_Y),
          c1l: pointOnFrame(f1, LEFT_TOP_X, CEIL_Y),
          c0r: pointOnFrame(f0, RIGHT_TOP_X, CEIL_Y),
          c1r: pointOnFrame(f1, RIGHT_TOP_X, CEIL_Y),
          llb0: pointOnFrame(f0, LEFT_LOW_X, FLOOR_Y),
          llb1: pointOnFrame(f1, LEFT_LOW_X, FLOOR_Y),
          llm0: pointOnFrame(f0, INNER_W, LEFT_MID_BOT),
          llm1: pointOnFrame(f1, INNER_W, LEFT_MID_BOT),
          lmt0: pointOnFrame(f0, INNER_W, LEFT_MID_TOP),
          lmt1: pointOnFrame(f1, INNER_W, LEFT_MID_TOP),
          lub0: pointOnFrame(f0, LEFT_TOP_X, CEIL_Y),
          lub1: pointOnFrame(f1, LEFT_TOP_X, CEIL_Y),
          rlb0: pointOnFrame(f0, RIGHT_LOW_X, FLOOR_Y),
          rlb1: pointOnFrame(f1, RIGHT_LOW_X, FLOOR_Y),
          rlm0: pointOnFrame(f0, OUTER_W, RIGHT_MID_BOT),
          rlm1: pointOnFrame(f1, OUTER_W, RIGHT_MID_BOT),
          rmt0: pointOnFrame(f0, OUTER_W, RIGHT_MID_TOP),
          rmt1: pointOnFrame(f1, OUTER_W, RIGHT_MID_TOP),
          rub0: pointOnFrame(f0, RIGHT_TOP_X, CEIL_Y),
          rub1: pointOnFrame(f1, RIGHT_TOP_X, CEIL_Y)
        };
        {
          const floorTex = isGroupedWindowFloorSection(i) ? TEX.floorGlass : TEX.floor;
          const q = [];
          pushQuad(q, pts.fl0, pts.fr0, pts.fr1, pts.fl1, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, floorTex, [1, 1, 1], 1, floorTex === TEX.floorGlass));
        }
        {
          const q = [];
          pushQuad(q, pts.c0r, pts.c0l, pts.c1l, pts.c1r, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));
        }
        if (i !== 8) {
          const leftIsWindow = isInnerWindowSection(i);
          {
            const q = [];
            pushQuad(q, pts.llb0, pts.llm0, pts.llm1, pts.llb1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1));
          }
          if (!leftIsWindow) {
            const q = [];
            pushQuad(q, pts.llm0, pts.lmt0, pts.lmt1, pts.llm1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));
          }
          {
            const q = [];
            pushQuad(q, pts.lmt0, pts.lub0, pts.lub1, pts.lmt1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1));
          }
        }
        if (i === 8) {
          const hallHalfW = 1.15;
          const a0 = i * (Math.PI * 2 / SECTION_COUNT);
          const a1 = (i + 1) * (Math.PI * 2 / SECTION_COUNT);
          const amid = (i + 0.5) * (Math.PI * 2 / SECTION_COUNT);
          const fmid = sectionFrame(amid);
          const fa0 = sectionFrame(a0);
          const fa1 = sectionFrame(a1);
          const doorL = [
            fmid.center[0] + fmid.radial[0] * INNER_W + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * INNER_W + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR = [
            fmid.center[0] + fmid.radial[0] * INNER_W + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * INNER_W + fmid.tangent[2] * hallHalfW
          ];
          const doorL_low = [
            fmid.center[0] + fmid.radial[0] * LEFT_LOW_X + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_LOW_X + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR_low = [
            fmid.center[0] + fmid.radial[0] * LEFT_LOW_X + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_LOW_X + fmid.tangent[2] * hallHalfW
          ];
          const doorL_top = [
            fmid.center[0] + fmid.radial[0] * LEFT_TOP_X + fmid.tangent[0] * (-hallHalfW),
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_TOP_X + fmid.tangent[2] * (-hallHalfW)
          ];
          const doorR_top = [
            fmid.center[0] + fmid.radial[0] * LEFT_TOP_X + fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] + fmid.radial[2] * LEFT_TOP_X + fmid.tangent[2] * hallHalfW
          ];
          function dL(y) { return [doorL[0], y, doorL[2]]; }
          function dR(y) { return [doorR[0], y, doorR[2]]; }
          function dL_low(y) { return [doorL_low[0], y, doorL_low[2]]; }
          function dR_low(y) { return [doorR_low[0], y, doorR_low[2]]; }
          function dL_top(y) { return [doorL_top[0], y, doorL_top[2]]; }
          function dR_top(y) { return [doorR_top[0], y, doorR_top[2]]; }
          {
            const q = [];
            pushQuad(q,
              dL_low(FLOOR_Y),
              pointOnFrame(fa0, LEFT_LOW_X, FLOOR_Y),
              pointOnFrame(fa0, INNER_W, LEFT_MID_BOT),
              dL(LEFT_MID_BOT),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              dL(LEFT_MID_BOT),
              pointOnFrame(fa0, INNER_W, LEFT_MID_BOT),
              pointOnFrame(fa0, INNER_W, LEFT_MID_TOP),
              dL(LEFT_MID_TOP),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              dL(LEFT_MID_TOP),
              pointOnFrame(fa0, INNER_W, LEFT_MID_TOP),
              pointOnFrame(fa0, LEFT_TOP_X, CEIL_Y),
              dL_top(CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, LEFT_LOW_X, FLOOR_Y),
              dR_low(FLOOR_Y),
              dR(LEFT_MID_BOT),
              pointOnFrame(fa1, INNER_W, LEFT_MID_BOT),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, INNER_W, LEFT_MID_BOT),
              dR(LEFT_MID_BOT),
              dR(LEFT_MID_TOP),
              pointOnFrame(fa1, INNER_W, LEFT_MID_TOP),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp2, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              pointOnFrame(fa1, INNER_W, LEFT_MID_TOP),
              dR(LEFT_MID_TOP),
              dR_top(CEIL_Y),
              pointOnFrame(fa1, LEFT_TOP_X, CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }
          {
            const q = [];
            pushQuad(q,
              dR(LEFT_MID_TOP),
              dL(LEFT_MID_TOP),
              dL_top(CEIL_Y),
              dR_top(CEIL_Y),
              [0,1],[1,1],[1,0],[0,0]);
            meshes.push(self._makeMesh(q, TEX.lp1, [1,1,1], 1));
          }
          {
            const q = [];
            const n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
            pushTri(q,
              dL_low(FLOOR_Y), dL(LEFT_MID_BOT), dL(FLOOR_Y),
              n, n, n,
              0, 1, 1, 0, 0, 0);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
          {
            const q = [];
            const n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
            pushTri(q,
              dR_low(FLOOR_Y), dR(FLOOR_Y), dR(LEFT_MID_BOT),
              n, n, n,
              0, 1, 0, 0, 1, 0);
            meshes.push(self._makeMesh(q, TEX.lp3, [1,1,1], 1));
          }
        }
        {
          const rightIsWindow = isOuterWindowSection(i);
          const rightIsDoor = isOuterDoorSection(i);
          if (rightIsDoor) {
            const hallHalfW = 1.15;
            const amid = (i + 0.5) * SECTION_ANGLE;
            const fmid = sectionFrame(amid);
            const fa0 = sectionFrame(a0);
            const fa1 = sectionFrame(a1);
            function doorPoint(x, y, z) {
              return [
                fmid.center[0] + fmid.radial[0] * x + fmid.up[0] * y + fmid.tangent[0] * z,
                fmid.center[1] + fmid.radial[1] * x + fmid.up[1] * y + fmid.tangent[1] * z,
                fmid.center[2] + fmid.radial[2] * x + fmid.up[2] * y + fmid.tangent[2] * z,
              ];
            }
            function dL(y) { return doorPoint(OUTER_W, y, -hallHalfW); }
            function dR(y) { return doorPoint(OUTER_W, y, hallHalfW); }
            function dL_low(y) { return doorPoint(RIGHT_LOW_X, y, -hallHalfW); }
            function dR_low(y) { return doorPoint(RIGHT_LOW_X, y, hallHalfW); }
            function dL_top(y) { return doorPoint(RIGHT_TOP_X, y, -hallHalfW); }
            function dR_top(y) { return doorPoint(RIGHT_TOP_X, y, hallHalfW); }
            {
              const q = [];
              pushQuad(q,
                dL_low(FLOOR_Y),
                pointOnFrame(fa0, RIGHT_LOW_X, FLOOR_Y),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_BOT),
                dL(RIGHT_MID_BOT),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dL(RIGHT_MID_BOT),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_BOT),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_TOP),
                dL(RIGHT_MID_TOP),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dL(RIGHT_MID_TOP),
                pointOnFrame(fa0, OUTER_W, RIGHT_MID_TOP),
                pointOnFrame(fa0, RIGHT_TOP_X, CEIL_Y),
                dL_top(CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, RIGHT_LOW_X, FLOOR_Y),
                dR_low(FLOOR_Y),
                dR(RIGHT_MID_BOT),
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_BOT),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_BOT),
                dR(RIGHT_MID_BOT),
                dR(RIGHT_MID_TOP),
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_TOP),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                pointOnFrame(fa1, OUTER_W, RIGHT_MID_TOP),
                dR(RIGHT_MID_TOP),
                dR_top(CEIL_Y),
                pointOnFrame(fa1, RIGHT_TOP_X, CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              pushQuad(q,
                dR(RIGHT_MID_TOP),
                dL(RIGHT_MID_TOP),
                dL_top(CEIL_Y),
                dR_top(CEIL_Y),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
            }
            {
              const q = [];
              const n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
              pushTri(q,
                dL_low(FLOOR_Y), dL(RIGHT_MID_BOT), dL(FLOOR_Y),
                n, n, n,
                0, 1, 1, 0, 0, 0);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              const n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
              pushTri(q,
                dR_low(FLOOR_Y), dR(FLOOR_Y), dR(RIGHT_MID_BOT),
                n, n, n,
                0, 1, 0, 0, 1, 0);
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
            }
            {
              const q = [];
              const doorX = OUTER_W - 0.025;
              const doorTopY = CEIL_Y * 0.88;
              pushQuad(q,
                doorPoint(doorX, FLOOR_Y, hallHalfW),
                doorPoint(doorX, FLOOR_Y, -hallHalfW),
                doorPoint(doorX, doorTopY, -hallHalfW),
                doorPoint(doorX, doorTopY, hallHalfW),
                [0, 1], [1, 1], [1, 0], [0, 0]);
              const doorMesh = self._makeMesh(q, TEX.door, [1, 1, 1], 1);
              doorMesh.annexEntranceDoor = true;
              meshes.push(doorMesh);
            }
          } else if (!rightIsWindow) {
            const q = [];
            pushQuad(q, pts.rlb0, pts.rlm0, pts.rlm1, pts.rlb1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1));
          }
          if (!rightIsDoor) {
            const q = [];
            pushQuad(q, pts.rlm0, pts.rmt0, pts.rmt1, pts.rlm1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, rightIsWindow ? TEX.winC : TEX.rp2, [1, 1, 1], 1));
          }
          if (!rightIsDoor && !rightIsWindow) {
            const q = [];
            pushQuad(q, pts.rmt0, pts.rub0, pts.rub1, pts.rmt1, [0, 1], [1, 1], [1, 0], [0, 0]);
            meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1));
          }
        }
        const start = sectionFrame(a0);
        const end = sectionFrame(a0 + 0.012);
        const framePts = [
          [INNER_W, FLOOR_Y],
          [INNER_W, LEFT_MID_BOT],
          [INNER_W, LEFT_MID_TOP],
          [LEFT_TOP_X, CEIL_Y],
          [RIGHT_TOP_X, CEIL_Y],
          [OUTER_W, RIGHT_MID_TOP],
          [OUTER_W, RIGHT_MID_BOT],
          [OUTER_W, FLOOR_Y],
        ];
        for (let k = 0; k < framePts.length - 1; k++) {
          const a = pointOnFrame(start, framePts[k][0], framePts[k][1]);
          const b = pointOnFrame(start, framePts[k + 1][0], framePts[k + 1][1]);
          const c = pointOnFrame(end, framePts[k + 1][0], framePts[k + 1][1]);
          const d = pointOnFrame(end, framePts[k][0], framePts[k][1]);
          const q = [];
          pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
        }
      }
      for (let i = 0; i < SECTION_COUNT; i++) addSection(i);
      (function addBay() {
        const i = 8;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);
        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
          const q = [];
          pushQuad(q, pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), pointLocal(xa, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), pointLocal(xa, ya, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }
        function addRing(cx, cz, innerR, outerR, ya, yb, tex, flatCol, texMix, gapCenter, gapWidth) {
          const q = [];
          const segs = 24;
          const r0 = Math.max(0.02, innerR);
          for (let s = 0; s < segs; s++) {
            const a0 = (s / segs) * Math.PI * 2;
            const a1 = ((s + 1) / segs) * Math.PI * 2;
            if (typeof gapCenter === "number" && typeof gapWidth === "number") {
              const mid = (a0 + a1) * 0.5;
              const gapDelta = Math.atan2(Math.sin(mid - gapCenter), Math.cos(mid - gapCenter));
              if (Math.abs(gapDelta) < gapWidth * 0.5) continue;
            }
            const ox0 = cx + Math.cos(a0) * outerR;
            const oz0 = cz + Math.sin(a0) * outerR;
            const ox1 = cx + Math.cos(a1) * outerR;
            const oz1 = cz + Math.sin(a1) * outerR;
            const ix0 = cx + Math.cos(a0) * r0;
            const iz0 = cz + Math.sin(a0) * r0;
            const ix1 = cx + Math.cos(a1) * r0;
            const iz1 = cz + Math.sin(a1) * r0;
            pushQuad(q, pointLocal(ox0, yb, oz0), pointLocal(ix0, yb, iz0), pointLocal(ix1, yb, iz1), pointLocal(ox1, yb, oz1), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ox1, ya, oz1), pointLocal(ix1, ya, iz1), pointLocal(ix0, ya, iz0), pointLocal(ox0, ya, oz0), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ox1, ya, oz1), pointLocal(ox0, ya, oz0), pointLocal(ox0, yb, oz0), pointLocal(ox1, yb, oz1), [0, 1], [1, 1], [1, 0], [0, 0]);
            pushQuad(q, pointLocal(ix0, ya, iz0), pointLocal(ix1, ya, iz1), pointLocal(ix1, yb, iz1), pointLocal(ix0, yb, iz0), [0, 1], [1, 1], [1, 0], [0, 0]);
          }
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }
        function addBar(xa, za, xb, zb, ya, yb, halfT, tex, flatCol, texMix) {
          const dx = xb - xa;
          const dz = zb - za;
          const len = Math.hypot(dx, dz) || 1;
          const nx = (-dz / len) * halfT;
          const nz = (dx / len) * halfT;
          const q = [];
          const a0 = [xa + nx, za + nz];
          const a1 = [xa - nx, za - nz];
          const b0 = [xb + nx, zb + nz];
          const b1 = [xb - nx, zb - nz];
          pushQuad(q, pointLocal(a0[0], ya, a0[1]), pointLocal(b0[0], ya, b0[1]), pointLocal(b0[0], yb, b0[1]), pointLocal(a0[0], yb, a0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(b1[0], ya, b1[1]), pointLocal(a1[0], ya, a1[1]), pointLocal(a1[0], yb, a1[1]), pointLocal(b1[0], yb, b1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a0[0], yb, a0[1]), pointLocal(b0[0], yb, b0[1]), pointLocal(b1[0], yb, b1[1]), pointLocal(a1[0], yb, a1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a1[0], ya, a1[1]), pointLocal(b1[0], ya, b1[1]), pointLocal(b0[0], ya, b0[1]), pointLocal(a0[0], ya, a0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(a1[0], ya, a1[1]), pointLocal(a0[0], ya, a0[1]), pointLocal(a0[0], yb, a0[1]), pointLocal(a1[0], yb, a1[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          pushQuad(q, pointLocal(b0[0], ya, b0[1]), pointLocal(b1[0], ya, b1[1]), pointLocal(b1[0], yb, b1[1]), pointLocal(b0[0], yb, b0[1]), [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol, texMix));
        }
        const halfW = Math.sin(SECTION_ANGLE * 0.5) * RING_RADIUS * 0.92;
        const depth = 6.2;
        const x0 = -8.0;             
        const x1 = x0 - depth;       
        const y0 = FLOOR_Y;
        const y1 = CEIL_Y * 0.92;
        const z0 = -halfW;
        const z1 = halfW;
        let q = [];
        q = [];
        pushQuad(
          q,
          pointLocal(x0, y0, z0), pointLocal(x0, y0, z1), pointLocal(x1, y0, z1), pointLocal(x1, y0, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(x0, y1, z1), pointLocal(x0, y1, z0), pointLocal(x1, y1, z0), pointLocal(x1, y1, z1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(x0, y0, z0), pointLocal(x1, y0, z0), pointLocal(x1, y1, z0), pointLocal(x0, y1, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(x1, y0, z1), pointLocal(x0, y0, z1), pointLocal(x0, y1, z1), pointLocal(x1, y1, z1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(x1, y0, z0), pointLocal(x1, y0, z1), pointLocal(x1, y1, z1), pointLocal(x1, y1, z0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.015, 0.02, 0.04], 0));
        const cx = x1 + 0.04;
        const cy0 = y0 + 0.20;
        const cy1 = y1 - 0.18;
        const cz0 = z0 + 0.34;
        const cz1 = z1 - 0.34;
        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0), pointLocal(cx, cy0, cz1), pointLocal(cx, cy0 + 0.12, cz1), pointLocal(cx, cy0 + 0.12, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));
        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy1 - 0.12, cz0), pointLocal(cx, cy1 - 0.12, cz1), pointLocal(cx, cy1, cz1), pointLocal(cx, cy1, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));
        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0), pointLocal(cx, cy0, cz0 + 0.12), pointLocal(cx, cy1, cz0 + 0.12), pointLocal(cx, cy1, cz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));
        q = [];
        pushQuad(
          q,
          pointLocal(cx, cy0, cz1 - 0.12), pointLocal(cx, cy0, cz1), pointLocal(cx, cy1, cz1), pointLocal(cx, cy1, cz1 - 0.12),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0));
        q = [];
        pushQuad(
          q,
          pointLocal(x1 + 0.55, y0 + 0.10, cz0 + 0.16),
          pointLocal(x1 + 0.55, y0 + 0.10, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz0 + 0.16),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.055, 0.062, 0.070], 0));
        const liftX = x1 + 2.22;
        const liftZ = 0.0;
        addRing(liftX, liftZ, 0.90, 2.08, y0 + 0.03, y0 + 0.22, TEX.black, [0.055, 0.062, 0.070], 0);
        addRing(liftX, liftZ, 1.88, 2.20, y0 + 0.01, y0 + 0.09, TEX.black, [0.06, 0.07, 0.08], 0);
        addRing(liftX, liftZ, 0.42, 0.72, y0 + 0.20, y0 + 0.43, TEX.black, [0.09, 0.10, 0.115], 0);
        addRing(liftX, liftZ, 0.03, 0.16, y0 + 0.20, y1 - 0.04, TEX.black, [0.04, 0.055, 0.075], 0);
        const gateAngle = 0.42;
        const gateWidth = 1.20;
        const gateHingeA = gateAngle - gateWidth * 0.5;
        const gateHingeB = gateAngle + gateWidth * 0.5;
        function gatePoint(radius, angle) {
          return {
            x: liftX + Math.cos(angle) * radius,
            z: liftZ + Math.sin(angle) * radius
          };
        }
        addRing(liftX, liftZ, 2.04, 2.18, y0 + 0.78, y0 + 0.86, TEX.black, [0.05, 0.065, 0.075], 0, gateAngle, gateWidth);
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2;
          const gateDelta = Math.atan2(Math.sin(a - gateAngle), Math.cos(a - gateAngle));
          if (Math.abs(gateDelta) < gateWidth * 0.5) continue;
          const px = liftX + Math.cos(a) * 2.13;
          const pz = liftZ + Math.sin(a) * 2.13;
          addBox(px - 0.035, px + 0.035, y0 + 0.20, y0 + 0.84, pz - 0.035, pz + 0.035, TEX.black, [0.035, 0.045, 0.055], 0);
        }
        const hingeLo = gatePoint(2.13, gateHingeA);
        const hingeHi = gatePoint(2.13, gateHingeB);
        addBox(hingeLo.x - 0.045, hingeLo.x + 0.045, y0 + 0.20, y0 + 0.90, hingeLo.z - 0.045, hingeLo.z + 0.045, TEX.black, [0.035, 0.045, 0.055], 0);
        addBox(hingeHi.x - 0.045, hingeHi.x + 0.045, y0 + 0.20, y0 + 0.90, hingeHi.z - 0.045, hingeHi.z + 0.045, TEX.black, [0.035, 0.045, 0.055], 0);
        const leafLo = gatePoint(1.58, gateHingeA - 0.62);
        const leafHi = gatePoint(1.58, gateHingeB + 0.62);
        addBar(hingeLo.x, hingeLo.z, leafLo.x, leafLo.z, y0 + 0.78, y0 + 0.86, 0.035, TEX.black, [0.05, 0.065, 0.075], 0);
        addBar(hingeLo.x, hingeLo.z, leafLo.x, leafLo.z, y0 + 0.44, y0 + 0.50, 0.030, TEX.black, [0.04, 0.052, 0.062], 0);
        addBar(hingeHi.x, hingeHi.z, leafHi.x, leafHi.z, y0 + 0.78, y0 + 0.86, 0.035, TEX.black, [0.05, 0.065, 0.075], 0);
        addBar(hingeHi.x, hingeHi.z, leafHi.x, leafHi.z, y0 + 0.44, y0 + 0.50, 0.030, TEX.black, [0.04, 0.052, 0.062], 0);
        addBox(leafLo.x - 0.035, leafLo.x + 0.035, y0 + 0.42, y0 + 0.86, leafLo.z - 0.035, leafLo.z + 0.035, TEX.black, [0.03, 0.04, 0.05], 0);
        addBox(leafHi.x - 0.035, leafHi.x + 0.035, y0 + 0.42, y0 + 0.86, leafHi.z - 0.035, leafHi.z + 0.035, TEX.black, [0.03, 0.04, 0.05], 0);
        addRing(liftX, liftZ, 0.78, 1.34, y0 - 0.12, y0 - 0.02, TEX.black, [0.045, 0.052, 0.060], 0);
        addRing(liftX, liftZ, 1.20, 1.58, y0 - 0.30, y0 - 0.18, TEX.black, [0.035, 0.044, 0.055], 0);
        const trackBottom = y0 - 78.0;
        addBox(liftX - 0.11, liftX + 0.11, trackBottom, y0 + 0.08, -0.11, 0.11, TEX.black, [0.020, 0.028, 0.040], 0);
        const trackRailR = 0.72;
        const trackRailT = 0.045;
        addBox(liftX + trackRailR - trackRailT, liftX + trackRailR + trackRailT, trackBottom, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailR - trackRailT, liftX - trackRailR + trackRailT, trackBottom, y0 + 0.02, -trackRailT, trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, trackBottom, y0 + 0.02, trackRailR - trackRailT, trackRailR + trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        addBox(liftX - trackRailT, liftX + trackRailT, trackBottom, y0 + 0.02, -trackRailR - trackRailT, -trackRailR + trackRailT, TEX.black, [0.050, 0.064, 0.080], 0);
        for (let rung = 0; rung < 20; rung++) {
          const ry = y0 - 1.10 - rung * 3.75;
          addRing(liftX, liftZ, 0.70, 0.84, ry - 0.025, ry + 0.025, TEX.black, [0.040, 0.052, 0.066], 0);
          addBox(liftX - 0.94, liftX + 0.94, ry - 0.022, ry + 0.022, -0.022, 0.022, TEX.black, [0.040, 0.052, 0.066], 0);
          addBox(liftX - 0.022, liftX + 0.022, ry - 0.022, ry + 0.022, -0.94, 0.94, TEX.black, [0.040, 0.052, 0.066], 0);
        }
        const railR = 1.36;
        addBox(liftX + railR - 0.055, liftX + railR + 0.055, y0 + 0.16, y1 - 0.04, -0.055, 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - railR - 0.055, liftX - railR + 0.055, y0 + 0.16, y1 - 0.04, -0.055, 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - 0.055, liftX + 0.055, y0 + 0.16, y1 - 0.04, railR - 0.055, railR + 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addBox(liftX - 0.055, liftX + 0.055, y0 + 0.16, y1 - 0.04, -railR - 0.055, -railR + 0.055, TEX.black, [0.055, 0.07, 0.09], 0);
        addRing(liftX, liftZ, 1.08, 1.20, y1 - 0.18, y1 - 0.08, TEX.black, [0.045, 0.055, 0.065], 0);
        addBox(liftX - 1.52, liftX + 1.52, y1 - 0.16, y1 - 0.10, -0.045, 0.045, TEX.black, [0.045, 0.055, 0.065], 0);
        addBox(liftX - 0.045, liftX + 0.045, y1 - 0.16, y1 - 0.10, -1.52, 1.52, TEX.black, [0.045, 0.055, 0.065], 0);
      })();
      (function addHallway() {
        const i = 8;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);
        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        var hx0 = -8.0;               
        var hx1 = INNER_W + 0.02;    
        var hy0 = FLOOR_Y;
        var hy1 = CEIL_Y * 0.88;     
        var hallHalfW = 1.15;        
        var hz0 = -hallHalfW;
        var hz1 = hallHalfW;
        var q;
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx0, hy0, hz1),
          pointLocal(hx1, hy0, hz1), pointLocal(hx1, hy0, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy1, hz1), pointLocal(hx0, hy1, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0, hz0), pointLocal(hx1, hy0, hz0),
          pointLocal(hx1, hy1, hz0), pointLocal(hx0, hy1, hz0),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1));
        q = [];
        pushQuad(
          q,
          pointLocal(hx1, hy0, hz1), pointLocal(hx0, hy0, hz1),
          pointLocal(hx0, hy1, hz1), pointLocal(hx1, hy1, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1));
        var trimW = 0.04;
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz0), pointLocal(hx1, hy0 + 0.01, hz0),
          pointLocal(hx1, hy0 + 0.01, hz0 + trimW), pointLocal(hx0, hy0 + 0.01, hz0 + trimW),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
        q = [];
        pushQuad(
          q,
          pointLocal(hx0, hy0 + 0.01, hz1 - trimW), pointLocal(hx1, hy0 + 0.01, hz1 - trimW),
          pointLocal(hx1, hy0 + 0.01, hz1), pointLocal(hx0, hy0 + 0.01, hz1),
          [0, 1], [1, 1], [1, 0], [0, 0]
        );
        meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0));
      })();
      (function addStationAnnex() {
        const i = 0;
        const amid = (i + 0.5) * SECTION_ANGLE;
        const fm = sectionFrame(amid);
        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        function addPanel(p00, p10, p11, p01, tex, flatCol, texMix, blend) {
          const q = [];
          pushQuad(q, p00, p10, p11, p01, [0, 1], [1, 1], [1, 0], [0, 0]);
          meshes.push(self._makeMesh(q, tex, flatCol || [1, 1, 1], typeof texMix === "number" ? texMix : 1, blend));
        }
        function addPanelUV(p00, p10, p11, p01, uv00, uv10, uv11, uv01, tex, flatCol, texMix, blend) {
          const q = [];
          pushQuad(q, p00, p10, p11, p01, uv00, uv10, uv11, uv01);
          meshes.push(self._makeMesh(q, tex, flatCol || [1, 1, 1], typeof texMix === "number" ? texMix : 1, blend));
        }
        function mixPoint(a, b, t) {
          return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t,
          ];
        }
        function patchPoint(p00, p10, p11, p01, u, v) {
          return mixPoint(mixPoint(p00, p10, u), mixPoint(p01, p11, u), v);
        }
        function addTiledPanel(p00, p10, p11, p01, tex, flatCol, texMix, cols, rows) {
          cols = Math.max(1, cols | 0);
          rows = Math.max(1, rows | 0);
          for (let x = 0; x < cols; x++) {
            const u0 = x / cols;
            const u1 = (x + 1) / cols;
            for (let y = 0; y < rows; y++) {
              const v0 = y / rows;
              const v1 = (y + 1) / rows;
              addPanel(
                patchPoint(p00, p10, p11, p01, u0, v0),
                patchPoint(p00, p10, p11, p01, u1, v0),
                patchPoint(p00, p10, p11, p01, u1, v1),
                patchPoint(p00, p10, p11, p01, u0, v1),
                tex,
                flatCol,
                texMix
              );
            }
          }
        }
        function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
          addPanel(pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), tex, flatCol, texMix);
          addPanel(pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), pointLocal(xa, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), pointLocal(xa, ya, za), tex, flatCol, texMix);
          addPanel(pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), tex, flatCol, texMix);
          addPanel(pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), tex, flatCol, texMix);
        }
        function addExitWallFace(x, ya, yb, halfW) {
          const q = [];
          pushQuad(
            q,
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, halfW),
            pointLocal(x, yb, halfW),
            pointLocal(x, yb, -halfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.exitWall, [1.0, 1.0, 1.0], 1.0, false);
          mesh.greenKey = true;
          meshes.push(mesh);
        }
        function addCollar(x, ya, yb, innerHalfW, outerHalfW) {
          const d = 0.16;
          const col = [0.025, 0.030, 0.038];
          addBox(x - d, x + d, ya - 0.16, yb + 0.16, -outerHalfW, -innerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, ya - 0.16, yb + 0.16, innerHalfW, outerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, yb, yb + 0.16, -outerHalfW, outerHalfW, TEX.black, col, 0);
          addBox(x - d, x + d, ya - 0.16, ya, -outerHalfW, outerHalfW, TEX.black, col, 0);
        }
        function addBulkheadWithOpening(x, ya, yb, halfW, openYa, openYb, openHalfW, tex) {
          const dim = [0.04, 0.045, 0.05];
          addPanel(pointLocal(x, ya, -halfW), pointLocal(x, ya, -openHalfW), pointLocal(x, yb, -openHalfW), pointLocal(x, yb, -halfW), tex, dim, 0.62);
          addPanel(pointLocal(x, ya, openHalfW), pointLocal(x, ya, halfW), pointLocal(x, yb, halfW), pointLocal(x, yb, openHalfW), tex, dim, 0.62);
          addPanel(pointLocal(x, openYb, -openHalfW), pointLocal(x, openYb, openHalfW), pointLocal(x, yb, openHalfW), pointLocal(x, yb, -openHalfW), tex, dim, 0.62);
          addPanel(pointLocal(x, ya, -openHalfW), pointLocal(x, ya, openHalfW), pointLocal(x, openYa, openHalfW), pointLocal(x, openYa, -openHalfW), tex, dim, 0.62);
        }
        function addRoom(xa, xb, ya, yb, za, zb, openA, openB) {
          const xTiles = Math.max(2, Math.ceil(Math.abs(xb - xa) / 2.2));
          const zTiles = Math.max(2, Math.ceil(Math.abs(zb - za) / 2.0));
          const ceilXTiles = Math.max(1, Math.ceil(Math.abs(xb - xa) / 4.8));
          const ceilZTiles = Math.max(1, Math.ceil(Math.abs(zb - za) / 4.8));
          const wallDim = [0.035, 0.040, 0.045];
          const floorDim = [0.050, 0.055, 0.060];
          const ceilDim = [0.025, 0.030, 0.035];
          addTiledPanel(pointLocal(xa, ya, za), pointLocal(xa, ya, zb), pointLocal(xb, ya, zb), pointLocal(xb, ya, za), TEX.basementFloor, floorDim, 0.55, zTiles, xTiles);
          addTiledPanel(pointLocal(xa, yb, zb), pointLocal(xa, yb, za), pointLocal(xb, yb, za), pointLocal(xb, yb, zb), TEX.basementCeil, ceilDim, 0.50, ceilZTiles, ceilXTiles);
          addPanel(pointLocal(xa, ya, za), pointLocal(xb, ya, za), pointLocal(xb, yb, za), pointLocal(xa, yb, za), TEX.basementWall, wallDim, 0.58);
          addPanel(pointLocal(xb, ya, zb), pointLocal(xa, ya, zb), pointLocal(xa, yb, zb), pointLocal(xb, yb, zb), TEX.basementWall, wallDim, 0.58);
          if (!openA) {
            addPanel(pointLocal(xa, ya, zb), pointLocal(xa, ya, za), pointLocal(xa, yb, za), pointLocal(xa, yb, zb), TEX.basementWall, wallDim, 0.58);
          }
          if (!openB) {
            addPanel(pointLocal(xb, ya, za), pointLocal(xb, ya, zb), pointLocal(xb, yb, zb), pointLocal(xb, yb, za), TEX.basementWall, wallDim, 0.58);
          }
        }
        function addSpeakerStage(x0, x1, floorY, topY, zBack, zFront) {
          const deckY = floorY + 0.24;
          const backZ = zBack + 0.05;
          const faceZ = zBack + 0.50;
          const stageX0 = x0 + 0.76;
          const stageX1 = x1 + 0.28;
          const dark = [0.010, 0.011, 0.011];
          addBox(stageX0, stageX1, floorY + 0.02, deckY, backZ, faceZ, TEX.black, dark, 0);
          addPanel(
            pointLocal(stageX0, deckY, backZ),
            pointLocal(stageX1, deckY, backZ),
            pointLocal(stageX1, deckY, faceZ),
            pointLocal(stageX0, deckY, faceZ),
            TEX.black,
            [0.016, 0.016, 0.015],
            0
          );
          const y0 = deckY + 0.02;
          const y1 = Math.min(topY, y0 + 1.62);
          addPanel(
            pointLocal(stageX0, y0, faceZ + 0.024),
            pointLocal(stageX1, y0, faceZ + 0.024),
            pointLocal(stageX1, y1, faceZ + 0.024),
            pointLocal(stageX0, y1, faceZ + 0.024),
            TEX.speakerFront,
            [1, 1, 1],
            1,
            true
          );
          addPanel(
            pointLocal(stageX0, y0, backZ),
            pointLocal(stageX0, y0, faceZ),
            pointLocal(stageX0, y1, faceZ),
            pointLocal(stageX0, y1, backZ),
            TEX.speakerLeft,
            [1, 1, 1],
            1,
            true
          );
          addPanel(
            pointLocal(stageX1, y0, faceZ),
            pointLocal(stageX1, y0, backZ),
            pointLocal(stageX1, y1, backZ),
            pointLocal(stageX1, y1, faceZ),
            TEX.speakerRight,
            [1, 1, 1],
            1,
            true
          );
        }
        function addRaveAftermath(x0, x1, y, z0, z1) {
          const bits = [
            [0.18, 0.18, 0.55, 0.10, -0.65, 0.18, 0.42, 0.95],
            [0.40, 0.33, 0.18, 0.12, 0.25, 0.90, 0.20, 0.55],
            [0.62, 0.14, 0.34, 0.09, -0.05, 0.95, 0.12, 0.75],
            [0.78, 0.44, 0.20, 0.10, 0.62, 0.18, 0.95, 0.45],
            [0.28, 0.70, 0.16, 0.08, -0.28, 0.10, 0.85, 0.95],
            [0.52, 0.62, 0.42, 0.06, 0.48, 0.95, 0.15, 0.85],
            [0.13, 0.58, 0.22, 0.07, 0.08, 0.95, 0.12, 0.24],
            [0.35, 0.78, 0.28, 0.08, -0.18, 0.10, 0.78, 0.38],
            [0.69, 0.75, 0.16, 0.06, 0.40, 0.80, 0.28, 0.95],
            [0.86, 0.20, 0.26, 0.08, -0.36, 0.95, 0.75, 0.10],
            [0.47, 0.48, 0.12, 0.12, 0.00, 0.70, 0.95, 0.20],
          ];
          for (let i = 0; i < bits.length; i++) {
            const b = bits[i];
            const cx = x0 + (x1 - x0) * b[0];
            const cz = z0 + (z1 - z0) * b[1];
            const hw = b[2] * 0.5;
            const hd = b[3] * 0.5;
            const rot = b[4];
            const c = Math.cos(rot);
            const s = Math.sin(rot);
            function p(px, pz) {
              return pointLocal(cx + px * c - pz * s, y + 0.018, cz + px * s + pz * c);
            }
            addPanel(
              p(-hw, -hd),
              p(hw, -hd),
              p(hw, hd),
              p(-hw, hd),
              TEX.black,
              [b[5] * 1.45, b[6] * 1.45, b[7] * 1.45],
              0
            );
          }
          function floorStrip(ax, az, bx, bz, halfW, col) {
            const dx = bx - ax;
            const dz = bz - az;
            const inv = 1 / Math.max(0.001, Math.hypot(dx, dz));
            const nx = -dz * inv * halfW;
            const nz = dx * inv * halfW;
            addPanel(
              pointLocal(ax + nx, y + 0.026, az + nz),
              pointLocal(bx + nx, y + 0.026, bz + nz),
              pointLocal(bx - nx, y + 0.026, bz - nz),
              pointLocal(ax - nx, y + 0.026, az - nz),
              TEX.black,
              col,
              0
            );
          }
          floorStrip(x0 + 0.30, z0 + 0.42, x1 - 0.55, z0 + 0.72, 0.035, [0.95, 0.08, 1.80]);
          floorStrip(x0 + 1.10, z1 - 0.92, x1 - 1.20, z1 - 1.48, 0.028, [0.08, 1.35, 1.65]);
          floorStrip(x0 + 2.15, z0 + 2.10, x0 + 3.90, z0 + 2.55, 0.026, [1.70, 0.78, 0.05]);
          floorStrip(x0 + 4.20, z1 - 0.62, x1 - 0.90, z1 - 0.52, 0.020, [0.45, 1.55, 0.20]);
          floorStrip(x0 + 0.78, z0 + 1.10, x0 + 0.78, z0 + 1.11, 0.18, [2.10, 0.28, 0.02]);
          floorStrip(x0 + 3.05, z1 - 1.25, x0 + 3.05, z1 - 1.24, 0.16, [2.40, 0.62, 0.03]);
          floorStrip(x1 - 1.40, z0 + 2.00, x1 - 1.40, z0 + 2.01, 0.17, [1.90, 0.12, 0.02]);
        }
        function addBayStyleHallway(xa, xb, ya, yb, halfW) {
          const z0 = -halfW;
          const z1 = halfW;
          const trimW = 0.04;
          addPanel(
            pointLocal(xa, ya, z0),
            pointLocal(xa, ya, z1),
            pointLocal(xb, ya, z1),
            pointLocal(xb, ya, z0),
            TEX.floor,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, yb, z1),
            pointLocal(xa, yb, z0),
            pointLocal(xb, yb, z0),
            pointLocal(xb, yb, z1),
            TEX.ceil,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, ya, z0),
            pointLocal(xb, ya, z0),
            pointLocal(xb, yb, z0),
            pointLocal(xa, yb, z0),
            TEX.lp2,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xb, ya, z1),
            pointLocal(xa, ya, z1),
            pointLocal(xa, yb, z1),
            pointLocal(xb, yb, z1),
            TEX.rp2,
            [1, 1, 1],
            1
          );
          addPanel(
            pointLocal(xa, ya + 0.01, z0),
            pointLocal(xb, ya + 0.01, z0),
            pointLocal(xb, ya + 0.01, z0 + trimW),
            pointLocal(xa, ya + 0.01, z0 + trimW),
            TEX.black,
            [0.02, 0.02, 0.02],
            0
          );
          addPanel(
            pointLocal(xa, ya + 0.01, z1 - trimW),
            pointLocal(xb, ya + 0.01, z1 - trimW),
            pointLocal(xb, ya + 0.01, z1),
            pointLocal(xa, ya + 0.01, z1),
            TEX.black,
            [0.02, 0.02, 0.02],
            0
          );
        }
        function markMeshes(start, flag) {
          for (let mi = start; mi < meshes.length; mi++) meshes[mi][flag] = true;
        }
        function addAlphaWall(x, ya, yb, halfW, tex) {
          const q = [];
          pushQuad(
            q,
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, halfW),
            pointLocal(x, yb, halfW),
            pointLocal(x, yb, -halfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          meshes.push(self._makeMesh(q, tex, [1, 1, 1], 1, true));
        }
        function addAnnexCrowdPlane(tex, cx, cz, h, w, facing) {
          if (!tex) return null;
          const y0 = annexY0 + 0.018;
          const y1 = y0 + h;
          const q = [];
          if (facing === "side") {
            pushQuad(
              q,
              pointLocal(cx, y0, cz - w * 0.5),
              pointLocal(cx, y0, cz + w * 0.5),
              pointLocal(cx, y1, cz + w * 0.5),
              pointLocal(cx, y1, cz - w * 0.5),
              [0, 1], [1, 1], [1, 0], [0, 0]
            );
          } else {
            pushQuad(
              q,
              pointLocal(cx - w * 0.5, y0, cz),
              pointLocal(cx + w * 0.5, y0, cz),
              pointLocal(cx + w * 0.5, y1, cz),
              pointLocal(cx - w * 0.5, y1, cz),
              [0, 1], [1, 1], [1, 0], [0, 0]
            );
          }
          const mesh = self._makeMesh(q, tex, [1, 1, 1], 1, true);
          mesh.annexCrowd2 = true;
          mesh.annexCrowdBack = facing !== "side";
          mesh.annexCrowdSide = facing === "side";
          mesh.annexNormalOnly = true;
          mesh.annexInterior = true;
          mesh.useTexAlpha = true;
          mesh.crowdDanceSeed = Math.sin((cx + 19.13) * 17.17 + (cz - 3.7) * 31.31) * 43758.5453;
          mesh.crowdDanceAmp = 0.70 + (Math.abs(mesh.crowdDanceSeed) % 1.0) * 0.46;
          meshes.push(mesh);
          return mesh;
        }
        function addSteepStairwell(xa, xb, topY0, topY1, botY0, botY1, halfW) {
          const z0 = -halfW;
          const z1 = halfW;
          const steps = 18;
          const dx = (xb - xa) / steps;
          const floorDrop = (topY0 - botY0) / steps;
          const ceilDrop = (topY1 - botY1) / steps;
          const wallDim = [0.030, 0.034, 0.038];
          const treadDim = [0.042, 0.046, 0.050];
          for (let k = 0; k < steps; k++) {
            const xA = xa + dx * k;
            const xB = xa + dx * (k + 1);
            const fyA = topY0 - floorDrop * k;
            const fyB = topY0 - floorDrop * (k + 1);
            const cyA = topY1 - ceilDrop * k;
            const cyB = topY1 - ceilDrop * (k + 1);
            addPanel(pointLocal(xA, fyB, z0), pointLocal(xA, fyB, z1), pointLocal(xB, fyB, z1), pointLocal(xB, fyB, z0), TEX.basementFloor, treadDim, 0.62);
            addPanel(pointLocal(xB, fyA, z0), pointLocal(xB, fyA, z1), pointLocal(xB, fyB, z1), pointLocal(xB, fyB, z0), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xA, fyA, z0), pointLocal(xB, fyB, z0), pointLocal(xB, cyB, z0), pointLocal(xA, cyA, z0), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xB, fyB, z1), pointLocal(xA, fyA, z1), pointLocal(xA, cyA, z1), pointLocal(xB, cyB, z1), TEX.stairWall, wallDim, 0.66);
            addPanel(pointLocal(xA, cyA, z1), pointLocal(xA, cyA, z0), pointLocal(xB, cyB, z0), pointLocal(xB, cyB, z1), TEX.stairWall, wallDim, 0.66);
          }
        }
        function addStairwellCrackSeal(xa, xb, topY0, topY1, botY0, botY1, halfW) {
          const z0 = -halfW - 0.085;
          const z1 =  halfW + 0.085;
          const dim = [0.026, 0.030, 0.034];
          addPanel(
            pointLocal(xa - 0.035, topY0 - 0.030, z0),
            pointLocal(xb + 0.055, botY0 - 0.030, z0),
            pointLocal(xb + 0.055, botY1 + 0.070, z0),
            pointLocal(xa - 0.035, topY1 + 0.070, z0),
            TEX.stairWall,
            dim,
            0.74
          );
          addPanel(
            pointLocal(xb + 0.055, botY0 - 0.030, z1),
            pointLocal(xa - 0.035, topY0 - 0.030, z1),
            pointLocal(xa - 0.035, topY1 + 0.070, z1),
            pointLocal(xb + 0.055, botY1 + 0.070, z1),
            TEX.stairWall,
            dim,
            0.74
          );
          addPanel(
            pointLocal(xa - 0.035, topY1 + 0.055, z1),
            pointLocal(xa - 0.035, topY1 + 0.055, z0),
            pointLocal(xb + 0.055, botY1 + 0.055, z0),
            pointLocal(xb + 0.055, botY1 + 0.055, z1),
            TEX.stairWall,
            dim,
            0.62
          );
          addPanel(
            pointLocal(xa - 0.035, topY0 - 0.060, z0),
            pointLocal(xa - 0.035, topY0 - 0.060, z1),
            pointLocal(xb + 0.055, botY0 - 0.060, z1),
            pointLocal(xb + 0.055, botY0 - 0.060, z0),
            TEX.stairWall,
            dim,
            0.55
          );
        }
        function addLightPool(cx, cz, floorY, rx, rz, col) {
          return;
        }
        function addCeilingBulb(cx, cz, floorY, ceilY) {
          const by = ceilY - 0.14;
          addBox(cx - 0.045, cx + 0.045, by - 0.055, by + 0.055, cz - 0.045, cz + 0.045, TEX.black, [1.55, 1.85, 2.30], 0);
          addBox(cx - 0.13, cx + 0.13, ceilY - 0.035, ceilY - 0.010, cz - 0.13, cz + 0.13, TEX.black, [0.10, 0.085, 0.060], 0);
          addLightPool(cx, cz, floorY, 0.92, 0.72, [0.34, 0.22, 0.105]);
        }
        const hallY0 = FLOOR_Y;
        const hallY1 = CEIL_Y * 0.88;
        const hallX0 = OUTER_W + 0.12;
        const hallX1 = OUTER_W + 5.20;
        const hallHalfW = 1.15;
        addBayStyleHallway(hallX0, hallX1, hallY0, hallY1, hallHalfW);
        const exteriorStart = meshes.length;
        const oldAnnexX0 = hallX1;
        const oldAnnexX1 = hallX1 + 8.80;
        const oldAnnexHalfW = 4.20;
        const oldAnnexY0 = FLOOR_Y;
        const oldAnnexY1 = hallY1 + 0.16;
        addRoom(oldAnnexX0, oldAnnexX1, oldAnnexY0, oldAnnexY1, -oldAnnexHalfW, oldAnnexHalfW, true, true);
        addSpeakerStage(
          oldAnnexX0 + 0.62,
          oldAnnexX0 + 4.18,
          oldAnnexY0,
          oldAnnexY0 + 1.72,
          -oldAnnexHalfW + 0.48,
          -1.88
        );
        addRaveAftermath(oldAnnexX0 + 0.25, oldAnnexX1 - 0.60, oldAnnexY0, -oldAnnexHalfW + 0.35, oldAnnexHalfW - 0.35);
        const oldExitWallX = oldAnnexX1 - 0.012;
        addExitWallFace(oldExitWallX, oldAnnexY0, oldAnnexY1, oldAnnexHalfW);
        addBayStyleHallway(oldExitWallX + 0.015, oldExitWallX + 4.40, oldAnnexY0, oldAnnexY1, 1.45);
        addBulkheadWithOpening(oldAnnexX0 + 0.01, oldAnnexY0, oldAnnexY1, oldAnnexHalfW, hallY0, hallY1, hallHalfW + 0.12, TEX.basementWall);
        addCollar(oldAnnexX0, hallY0, hallY1, hallHalfW + 0.16, hallHalfW + 0.62);
        markMeshes(exteriorStart, "annexExterior");
        const interiorStart = meshes.length;
        const stairX0 = hallX1;
        const stairX1 = stairX0 + 7.80;
        const stairHalfW = 0.38;
        const annexDrop = 3.80;
        const annexX0 = stairX1;
        const annexX1 = annexX0 + 7.80;
        const annexHalfW = 3.55;
        const annexY0 = FLOOR_Y - annexDrop;
        const annexY1 = hallY1 - annexDrop + 0.24;
        addAlphaWall(
          hallX1 + 0.012,
          hallY0 - 0.02,
          hallY1 + 0.02,
          hallHalfW + 0.02,
          TEX.basementAltDoorHall || TEX.spaceHallDoor
        );
        const topStairDoorBulbStart = meshes.length;
        addBox(hallX1 + 0.030, hallX1 + 0.090, hallY1 - 0.075, hallY1 - 0.015, -0.170, 0.170, TEX.black, [0.060, 0.045, 0.026], 0.0);
        addBox(hallX1 + 0.078, hallX1 + 0.152, hallY1 - 0.150, hallY1 - 0.076, -0.058, 0.058, TEX.black, [4.30, 0.18, 0.08], 0.0);
        addBox(hallX1 + 0.063, hallX1 + 0.168, hallY1 - 0.166, hallY1 - 0.156, -0.078, 0.078, TEX.black, [0.34, 0.05, 0.025], 0.0);
        for (let mi = topStairDoorBulbStart; mi < meshes.length; mi++) meshes[mi].annexTopDoorBulb = true;
        self.altAnnexTopDoorBulbWorld = pointLocal(hallX1 + 0.115, hallY1 - 0.105, 0.0);
        addSteepStairwell(
          stairX0 + 0.12,
          stairX1,
          hallY0,
          hallY1,
          annexY0,
          annexY1,
          stairHalfW
        );
        addStairwellCrackSeal(
          stairX0 + 0.12,
          stairX1,
          hallY0,
          hallY1,
          annexY0,
          annexY1,
          stairHalfW
        );
        const normalAnnexRoomStart = meshes.length;
        addRoom(annexX0, annexX1, annexY0, annexY1, -annexHalfW, annexHalfW, true, true);
        const normalBasementStart = meshes.length;
        {
          const baseStart = meshes.length;
          const exitTilesZ = Math.max(4, Math.ceil((annexHalfW * 2.0) / 1.05));
          const exitTilesY = 1;
          addTiledPanel(
            pointLocal(annexX1 - 0.030, annexY0, -annexHalfW),
            pointLocal(annexX1 - 0.030, annexY0,  annexHalfW),
            pointLocal(annexX1 - 0.030, annexY1,  annexHalfW),
            pointLocal(annexX1 - 0.030, annexY1, -annexHalfW),
            TEX.basementWall,
            [0.035, 0.040, 0.045],
            0.58,
            exitTilesZ,
            exitTilesY
          );
          for (let mi = baseStart; mi < meshes.length; mi++) meshes[mi].annexBaseExitWall = true;
        }
        self.annexExitLightWorld = pointLocal(
          annexX1 - 0.16,
          annexY0 + (annexY1 - annexY0) * 0.48,
          0.0
        );
        {
          const q = [];
          pushQuad(
            q,
            pointLocal(annexX1 - 0.018, annexY0, -annexHalfW),
            pointLocal(annexX1 - 0.018, annexY0,  annexHalfW),
            pointLocal(annexX1 - 0.018, annexY1,  annexHalfW),
            pointLocal(annexX1 - 0.018, annexY1, -annexHalfW),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.basementWallExit, [1, 1, 1], 1.0, true);
          mesh.greenKey = true;
          mesh.annexEventExitWall = true;
          meshes.push(mesh);
        }
        {
          const portalX = annexX1 + 0.026;
          const portalHalfW = annexHalfW * 0.62;
          const portalY0 = annexY0 + 0.05;
          const portalY1 = annexY0 + (annexY1 - annexY0) * 0.81;
          const q = [];
          pushQuad(
            q,
            pointLocal(portalX, portalY0, -portalHalfW),
            pointLocal(portalX, portalY0,  portalHalfW),
            pointLocal(portalX, portalY1,  portalHalfW),
            pointLocal(portalX, portalY1, -portalHalfW),
            [0.04, 0.97], [0.96, 0.97], [0.96, 0.03], [0.04, 0.03]
          );
          const mesh = self._makeMesh(q, TEX.black, [1, 1, 1], 1.0, false);
          mesh.annexCabinPortalWall = true;
          mesh.annexNormalOnly = true;
          mesh.screenSample = true;
          meshes.push(mesh);
        }
        {
          const q = [];
          pushQuad(
            q,
            pointLocal(annexX0 + 0.04, annexY0, -annexHalfW + 0.018),
            pointLocal(annexX1 - 0.04, annexY0, -annexHalfW + 0.018),
            pointLocal(annexX1 - 0.04, annexY1, -annexHalfW + 0.018),
            pointLocal(annexX0 + 0.04, annexY1, -annexHalfW + 0.018),
            [0, 1], [1, 1], [1, 0], [0, 0]
          );
          const mesh = self._makeMesh(q, TEX.crywolf, [1, 1, 1], 1.0, false);
          mesh.annexCrywolfWall = true;
          meshes.push(mesh);
        }
        self.annexLightWorld = [
          pointLocal(annexX0 + 2.45, annexY1 - 0.14, -annexHalfW + 1.10),
          pointLocal(annexX0 + 0.78, annexY1 - 0.14,  0.00),
          pointLocal(hallX1 + 0.115, hallY1 - 0.105, 0.0)
        ];
        self.annexLightColorWorld = [
          [0.62, 0.72, 0.88],
          [1.30, 0.06, 0.03],
          [1.30, 0.06, 0.03]
        ];
        addCeilingBulb(annexX0 + 2.45, -annexHalfW + 1.10, annexY0, annexY1);
        addCeilingBulb(annexX0 + 0.78,  0.00, annexY0, annexY1);
        addBulkheadWithOpening(
          annexX0 + 0.01,
          annexY0,
          annexY1,
          annexHalfW,
          annexY0 + 0.08,
          annexY1 - 0.08,
          stairHalfW + 0.20,
          TEX.basementWall
        );
        addCollar(
          annexX0,
          annexY0 + 0.06,
          annexY1 - 0.06,
          stairHalfW + 0.14,
          stairHalfW + 0.66
        );
        addSpeakerStage(
          annexX0 + 0.70,
          annexX0 + 4.35,
          annexY0,
          annexY0 + 1.72,
          -annexHalfW + 0.50,
          -1.95
        );
        {
          const crowdBack = TEX.annexCrowdBack || [];
          const crowdSide = TEX.annexCrowdSide || [];
          const backRows = [
            { z: -3.10, xs: [0.56, 0.98, 1.42, 1.88, 2.36, 2.84, 3.32, 3.80, 4.28, 4.76, 5.24, 5.70, 6.14, 6.52], h: 1.52, w: 0.70 },
            { z: -2.78, xs: [0.72, 1.18, 1.66, 2.14, 2.62, 3.10, 3.58, 4.06, 4.54, 5.02, 5.50, 5.98, 6.42], h: 1.50, w: 0.70 },
            { z: -2.44, xs: [0.50, 0.96, 1.44, 1.92, 2.40, 2.90, 3.38, 3.88, 4.36, 4.84, 5.32, 5.80, 6.26], h: 1.47, w: 0.68 },
            { z: -2.10, xs: [0.76, 1.22, 1.70, 2.20, 2.70, 3.18, 3.68, 4.16, 4.66, 5.14, 5.62, 6.08], h: 1.44, w: 0.66 },
            { z: -1.74, xs: [0.58, 1.04, 1.54, 2.04, 2.54, 3.04, 3.54, 4.04, 4.54, 5.04, 5.54, 6.04, 6.46], h: 1.40, w: 0.62 },
            { z: -1.38, xs: [0.86, 1.34, 1.86, 2.38, 2.90, 3.42, 3.94, 4.46, 4.98, 5.50, 6.02], h: 1.36, w: 0.60 },
            { z: -1.02, xs: [1.08, 1.62, 2.18, 2.76, 3.34, 3.92, 4.50, 5.08, 5.66, 6.20], h: 1.32, w: 0.56 },
            { z: -0.66, xs: [1.32, 2.02, 2.72, 3.42, 4.12, 4.82, 5.52, 6.12], h: 1.28, w: 0.52 }
          ];
          for (let r = 0; r < backRows.length; r++) {
            const row = backRows[r];
            for (let k = 0; k < row.xs.length; k++) {
              const n = r * 11 + k * 7;
              const jitterX = (Math.sin(n * 12.9898) * 43758.5453 % 1.0) * 0.16 - 0.08;
              const jitterZ = (Math.sin((n + 4.7) * 78.233) * 43758.5453 % 1.0) * 0.12 - 0.06;
              const scale = 0.92 + ((Math.sin((n + 9.1) * 37.719) * 43758.5453 % 1.0) * 0.16);
              addAnnexCrowdPlane(
                crowdBack[(r * 5 + k * 3) % Math.max(1, crowdBack.length)],
                annexX0 + row.xs[k] + jitterX,
                row.z + jitterZ,
                row.h * scale,
                row.w * scale,
                "back"
              );
            }
          }
          const sideRows = [
            { x: 0.58, z: -1.36, n: 7 },
            { x: 0.84, z:  1.18, n: 6 },
            { x: 1.16, z: -1.18, n: 7 },
            { x: 1.52, z:  1.30, n: 6 },
            { x: 1.94, z: -1.08, n: 7 },
            { x: 2.38, z:  1.36, n: 6 },
            { x: 2.86, z: -1.02, n: 7 },
            { x: 3.36, z:  1.40, n: 6 },
            { x: 3.90, z: -0.96, n: 6 },
            { x: 4.46, z:  1.34, n: 5 },
            { x: 5.04, z: -1.04, n: 5 },
            { x: 5.62, z:  1.22, n: 4 },
            { x: 6.18, z: -1.12, n: 4 },
            { x: 6.68, z:  1.10, n: 3 }
          ];
          let si = 0;
          for (let r = 0; r < sideRows.length; r++) {
            const row = sideRows[r];
            for (let k = 0; k < row.n; k++) {
              const n = 200 + r * 17 + k * 5;
              const spread = (k - (row.n - 1) * 0.5) * 0.28;
              const jitterX = (Math.sin(n * 19.17) * 43758.5453 % 1.0) * 0.18 - 0.09;
              const jitterZ = (Math.sin((n + 2.3) * 31.43) * 43758.5453 % 1.0) * 0.16 - 0.08;
              const scale = 0.88 + ((Math.sin((n + 6.6) * 11.91) * 43758.5453 % 1.0) * 0.18);
              addAnnexCrowdPlane(
                crowdSide[si % Math.max(1, crowdSide.length)],
                annexX0 + row.x + spread + jitterX,
                row.z + jitterZ,
                1.38 * scale,
                0.43 * scale,
                "side"
              );
              si++;
            }
          }
        }
        addRaveAftermath(
          annexX0 + 0.30,
          annexX1 - 0.60,
          annexY0,
          -annexHalfW + 0.38,
          annexHalfW - 0.38
        );
        for (let mi = normalBasementStart; mi < meshes.length; mi++) meshes[mi].annexNormalOnly = true;
        for (let mi = normalAnnexRoomStart; mi < meshes.length; mi++) {
          meshes[mi].annexNormalOnly = true;
        }
        if (!window.Zone4AltAnnex || typeof window.Zone4AltAnnex.buildAltAnnexScene !== "function") {
          throw new Error("Zone4AltAnnex.buildAltAnnexScene missing");
        }
        window.Zone4AltAnnex.buildAltAnnexScene({
          meshes: meshes,
          TEX: TEX,
          self: self,
          gl: gl,
          document: document,
          Image: Image,
          Math: Math,
          console: console,
          pushQuad: pushQuad,
          pointLocal: pointLocal,
          addBox: addBox,
          markMeshes: markMeshes,
          annexX0: annexX0,
          annexX1: annexX1,
          annexY0: annexY0,
          annexY1: annexY1,
          annexHalfW: annexHalfW,
          annexDrop: annexDrop,
          stairHalfW: stairHalfW
        });
markMeshes(interiorStart, "annexInterior");
      })();
  };
})();
