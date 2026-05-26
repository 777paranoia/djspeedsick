((window.Zone4Annex = window.Zone4Annex || {}),
  (window.Zone4Annex.buildStationMeshes = function () {
    const SECTION_ANGLE = (2 * Math.PI) / 16,
      meshes = this.stationMeshes,
      TEX = this.stationTextures;
    function normalize(v) {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    }
    function sub(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }
    function sectionFrame(a) {
      return {
        center: [15.5 * Math.cos(a), 0, 15.5 * Math.sin(a)],
        radial: normalize([Math.cos(a), 0, Math.sin(a)]),
        tangent: normalize([-Math.sin(a), 0, Math.cos(a)]),
        up: [0, 1, 0],
      };
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
        p0[0],
        p0[1],
        p0[2],
        n0[0],
        n0[1],
        n0[2],
        u0,
        v0,
        p1[0],
        p1[1],
        p1[2],
        n1[0],
        n1[1],
        n1[2],
        u1,
        v1,
        p2[0],
        p2[1],
        p2[2],
        n2[0],
        n2[1],
        n2[2],
        u2,
        v2,
      );
    }
    function pushQuad(arr, p00, p10, p11, p01, uv00, uv10, uv11, uv01) {
      const n =
        ((c = p11),
        normalize(
          (function (a, b) {
            return [
              a[1] * b[2] - a[2] * b[1],
              a[2] * b[0] - a[0] * b[2],
              a[0] * b[1] - a[1] * b[0],
            ];
          })(sub(p10, (a = p00)), sub(c, a)),
        ));
      var a, c;
      (pushTri(
        arr,
        p00,
        p10,
        p11,
        n,
        n,
        n,
        uv00[0],
        uv00[1],
        uv10[0],
        uv10[1],
        uv11[0],
        uv11[1],
      ),
        pushTri(
          arr,
          p00,
          p11,
          p01,
          n,
          n,
          n,
          uv00[0],
          uv00[1],
          uv11[0],
          uv11[1],
          uv01[0],
          uv01[1],
        ));
    }
    const self = this;
    function addSection(i) {
      const a0 = i * SECTION_ANGLE,
        a1 = (i + 1) * SECTION_ANGLE,
        f0 = sectionFrame(a0),
        f1 = sectionFrame(a1),
        pts = {
          fl0: pointOnFrame(f0, -2.35, -1.05),
          fl1: pointOnFrame(f1, -2.35, -1.05),
          fr0: pointOnFrame(f0, 2.35, -1.05),
          fr1: pointOnFrame(f1, 2.35, -1.05),
          c0l: pointOnFrame(f0, -1.7, 1.18),
          c1l: pointOnFrame(f1, -1.7, 1.18),
          c0r: pointOnFrame(f0, 1.7, 1.18),
          c1r: pointOnFrame(f1, 1.7, 1.18),
          llb0: pointOnFrame(f0, -1.85, -1.05),
          llb1: pointOnFrame(f1, -1.85, -1.05),
          llm0: pointOnFrame(f0, -2.35, -0.4),
          llm1: pointOnFrame(f1, -2.35, -0.4),
          lmt0: pointOnFrame(f0, -2.35, 0.6),
          lmt1: pointOnFrame(f1, -2.35, 0.6),
          lub0: pointOnFrame(f0, -1.7, 1.18),
          lub1: pointOnFrame(f1, -1.7, 1.18),
          rlb0: pointOnFrame(f0, 1.85, -1.05),
          rlb1: pointOnFrame(f1, 1.85, -1.05),
          rlm0: pointOnFrame(f0, 2.35, -0.4),
          rlm1: pointOnFrame(f1, 2.35, -0.4),
          rmt0: pointOnFrame(f0, 2.35, 0.6),
          rmt1: pointOnFrame(f1, 2.35, 0.6),
          rub0: pointOnFrame(f0, 1.7, 1.18),
          rub1: pointOnFrame(f1, 1.7, 1.18),
        };
      {
        const floorTex = (function (i) {
            return (
              7 === i || 8 === i || 9 === i || 15 === i || 0 === i || 1 === i
            );
          })(i)
            ? TEX.floorGlass
            : TEX.floor,
          q = [];
        (pushQuad(
          q,
          pts.fl0,
          pts.fr0,
          pts.fr1,
          pts.fl1,
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          meshes.push(
            self._makeMesh(
              q,
              floorTex,
              [1, 1, 1],
              1,
              floorTex === TEX.floorGlass,
            ),
          ));
      }
      {
        const q = [];
        (pushQuad(
          q,
          pts.c0r,
          pts.c0l,
          pts.c1l,
          pts.c1r,
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1)));
      }
      if (8 !== i) {
        const leftIsWindow = (function (i) {
          return 15 === i || 0 === i || 1 === i || 4 === i || 12 === i;
        })(i);
        {
          const q = [];
          (pushQuad(
            q,
            pts.llb0,
            pts.llm0,
            pts.llm1,
            pts.llb1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1)));
        }
        if (!leftIsWindow) {
          const q = [];
          (pushQuad(
            q,
            pts.llm0,
            pts.lmt0,
            pts.lmt1,
            pts.llm1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            pts.lmt0,
            pts.lub0,
            pts.lub1,
            pts.lmt1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1)));
        }
      }
      if (8 === i) {
        const hallHalfW = 1.15,
          a0 = i * ((2 * Math.PI) / 16),
          a1 = (i + 1) * ((2 * Math.PI) / 16),
          fmid = sectionFrame((i + 0.5) * ((2 * Math.PI) / 16)),
          fa0 = sectionFrame(a0),
          fa1 = sectionFrame(a1),
          doorL = [
            fmid.center[0] +
              -2.35 * fmid.radial[0] +
              fmid.tangent[0] * -hallHalfW,
            0,
            fmid.center[2] +
              -2.35 * fmid.radial[2] +
              fmid.tangent[2] * -hallHalfW,
          ],
          doorR = [
            fmid.center[0] +
              -2.35 * fmid.radial[0] +
              fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] +
              -2.35 * fmid.radial[2] +
              fmid.tangent[2] * hallHalfW,
          ],
          doorL_low = [
            fmid.center[0] +
              -1.85 * fmid.radial[0] +
              fmid.tangent[0] * -hallHalfW,
            0,
            fmid.center[2] +
              -1.85 * fmid.radial[2] +
              fmid.tangent[2] * -hallHalfW,
          ],
          doorR_low = [
            fmid.center[0] +
              -1.85 * fmid.radial[0] +
              fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] +
              -1.85 * fmid.radial[2] +
              fmid.tangent[2] * hallHalfW,
          ],
          doorL_top = [
            fmid.center[0] +
              -1.7 * fmid.radial[0] +
              fmid.tangent[0] * -hallHalfW,
            0,
            fmid.center[2] +
              -1.7 * fmid.radial[2] +
              fmid.tangent[2] * -hallHalfW,
          ],
          doorR_top = [
            fmid.center[0] +
              -1.7 * fmid.radial[0] +
              fmid.tangent[0] * hallHalfW,
            0,
            fmid.center[2] +
              -1.7 * fmid.radial[2] +
              fmid.tangent[2] * hallHalfW,
          ];
        function dL(y) {
          return [doorL[0], y, doorL[2]];
        }
        function dR(y) {
          return [doorR[0], y, doorR[2]];
        }
        function dL_low(y) {
          return [doorL_low[0], y, doorL_low[2]];
        }
        function dR_low(y) {
          return [doorR_low[0], y, doorR_low[2]];
        }
        function dL_top(y) {
          return [doorL_top[0], y, doorL_top[2]];
        }
        function dR_top(y) {
          return [doorR_top[0], y, doorR_top[2]];
        }
        {
          const q = [];
          (pushQuad(
            q,
            dL_low(-1.05),
            pointOnFrame(fa0, -1.85, -1.05),
            pointOnFrame(fa0, -2.35, -0.4),
            dL(-0.4),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            dL(-0.4),
            pointOnFrame(fa0, -2.35, -0.4),
            pointOnFrame(fa0, -2.35, 0.6),
            dL(0.6),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            dL(0.6),
            pointOnFrame(fa0, -2.35, 0.6),
            pointOnFrame(fa0, -1.7, 1.18),
            dL_top(1.18),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            pointOnFrame(fa1, -1.85, -1.05),
            dR_low(-1.05),
            dR(-0.4),
            pointOnFrame(fa1, -2.35, -0.4),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            pointOnFrame(fa1, -2.35, -0.4),
            dR(-0.4),
            dR(0.6),
            pointOnFrame(fa1, -2.35, 0.6),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            pointOnFrame(fa1, -2.35, 0.6),
            dR(0.6),
            dR_top(1.18),
            pointOnFrame(fa1, -1.7, 1.18),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1)));
        }
        {
          const q = [];
          (pushQuad(
            q,
            dR(0.6),
            dL(0.6),
            dL_top(1.18),
            dR_top(1.18),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.lp1, [1, 1, 1], 1)));
        }
        {
          const q = [],
            n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
          (pushTri(
            q,
            dL_low(-1.05),
            dL(-0.4),
            dL(-1.05),
            n,
            n,
            n,
            0,
            1,
            1,
            0,
            0,
            0,
          ),
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1)));
        }
        {
          const q = [],
            n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
          (pushTri(
            q,
            dR_low(-1.05),
            dR(-1.05),
            dR(-0.4),
            n,
            n,
            n,
            0,
            1,
            0,
            0,
            1,
            0,
          ),
            meshes.push(self._makeMesh(q, TEX.lp3, [1, 1, 1], 1)));
        }
      }
      {
        const rightIsWindow = (function (i) {
            return 1 === i || 7 === i || 8 === i || 9 === i || 15 === i;
          })(i),
          rightIsDoor = (function (i) {
            return 0 === i;
          })(i);
        if (rightIsDoor) {
          const hallHalfW = 1.15,
            fmid = sectionFrame((i + 0.5) * SECTION_ANGLE),
            fa0 = sectionFrame(a0),
            fa1 = sectionFrame(a1);
          function doorPoint(x, y, z) {
            return [
              fmid.center[0] +
                fmid.radial[0] * x +
                fmid.up[0] * y +
                fmid.tangent[0] * z,
              fmid.center[1] +
                fmid.radial[1] * x +
                fmid.up[1] * y +
                fmid.tangent[1] * z,
              fmid.center[2] +
                fmid.radial[2] * x +
                fmid.up[2] * y +
                fmid.tangent[2] * z,
            ];
          }
          function dL(y) {
            return doorPoint(2.35, y, -hallHalfW);
          }
          function dR(y) {
            return doorPoint(2.35, y, hallHalfW);
          }
          function dL_low(y) {
            return doorPoint(1.85, y, -hallHalfW);
          }
          function dR_low(y) {
            return doorPoint(1.85, y, hallHalfW);
          }
          function dL_top(y) {
            return doorPoint(1.7, y, -hallHalfW);
          }
          function dR_top(y) {
            return doorPoint(1.7, y, hallHalfW);
          }
          {
            const q = [];
            (pushQuad(
              q,
              dL_low(-1.05),
              pointOnFrame(fa0, 1.85, -1.05),
              pointOnFrame(fa0, 2.35, -0.4),
              dL(-0.4),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              dL(-0.4),
              pointOnFrame(fa0, 2.35, -0.4),
              pointOnFrame(fa0, 2.35, 0.6),
              dL(0.6),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              dL(0.6),
              pointOnFrame(fa0, 2.35, 0.6),
              pointOnFrame(fa0, 1.7, 1.18),
              dL_top(1.18),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              pointOnFrame(fa1, 1.85, -1.05),
              dR_low(-1.05),
              dR(-0.4),
              pointOnFrame(fa1, 2.35, -0.4),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              pointOnFrame(fa1, 2.35, -0.4),
              dR(-0.4),
              dR(0.6),
              pointOnFrame(fa1, 2.35, 0.6),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              pointOnFrame(fa1, 2.35, 0.6),
              dR(0.6),
              dR_top(1.18),
              pointOnFrame(fa1, 1.7, 1.18),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1)));
          }
          {
            const q = [];
            (pushQuad(
              q,
              dR(0.6),
              dL(0.6),
              dL_top(1.18),
              dR_top(1.18),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
              meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1)));
          }
          {
            const q = [],
              n = [fmid.tangent[0], fmid.tangent[1], fmid.tangent[2]];
            (pushTri(
              q,
              dL_low(-1.05),
              dL(-0.4),
              dL(-1.05),
              n,
              n,
              n,
              0,
              1,
              1,
              0,
              0,
              0,
            ),
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1)));
          }
          {
            const q = [],
              n = [-fmid.tangent[0], -fmid.tangent[1], -fmid.tangent[2]];
            (pushTri(
              q,
              dR_low(-1.05),
              dR(-1.05),
              dR(-0.4),
              n,
              n,
              n,
              0,
              1,
              0,
              0,
              1,
              0,
            ),
              meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1)));
          }
          {
            const q = [],
              doorX = 2.325,
              doorTopY = 1.0384;
            pushQuad(
              q,
              doorPoint(doorX, -1.05, hallHalfW),
              doorPoint(doorX, -1.05, -hallHalfW),
              doorPoint(doorX, doorTopY, -hallHalfW),
              doorPoint(doorX, doorTopY, hallHalfW),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const doorMesh = self._makeMesh(q, TEX.door, [1, 1, 1], 1);
            ((doorMesh.annexEntranceDoor = !0), meshes.push(doorMesh));
          }
        } else if (!rightIsWindow) {
          const q = [];
          (pushQuad(
            q,
            pts.rlb0,
            pts.rlm0,
            pts.rlm1,
            pts.rlb1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.rp3, [1, 1, 1], 1)));
        }
        if (!rightIsDoor) {
          const q = [];
          (pushQuad(
            q,
            pts.rlm0,
            pts.rmt0,
            pts.rmt1,
            pts.rlm1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(
              self._makeMesh(
                q,
                rightIsWindow ? TEX.winC : TEX.rp2,
                [1, 1, 1],
                1,
              ),
            ));
        }
        if (!rightIsDoor && !rightIsWindow) {
          const q = [];
          (pushQuad(
            q,
            pts.rmt0,
            pts.rub0,
            pts.rub1,
            pts.rmt1,
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, TEX.rp1, [1, 1, 1], 1)));
        }
      }
      const start = sectionFrame(a0),
        end = sectionFrame(a0 + 0.012),
        framePts = [
          [-2.35, -1.05],
          [-2.35, -0.4],
          [-2.35, 0.6],
          [-1.7, 1.18],
          [1.7, 1.18],
          [2.35, 0.6],
          [2.35, -0.4],
          [2.35, -1.05],
        ];
      for (let k = 0; k < framePts.length - 1; k++) {
        const q = [];
        (pushQuad(
          q,
          pointOnFrame(start, framePts[k][0], framePts[k][1]),
          pointOnFrame(start, framePts[k + 1][0], framePts[k + 1][1]),
          pointOnFrame(end, framePts[k + 1][0], framePts[k + 1][1]),
          pointOnFrame(end, framePts[k][0], framePts[k][1]),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0)));
      }
    }
    for (let i = 0; i < 16; i++) addSection(i);
    (!(function () {
      const fm = sectionFrame(8.5 * SECTION_ANGLE);
      function pointLocal(x, y, z) {
        return [
          fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
          fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
          fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
        ];
      }
      function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
        const q = [];
        (pushQuad(
          q,
          pointLocal(xa, ya, za),
          pointLocal(xb, ya, za),
          pointLocal(xb, yb, za),
          pointLocal(xa, yb, za),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          pushQuad(
            q,
            pointLocal(xb, ya, zb),
            pointLocal(xa, ya, zb),
            pointLocal(xa, yb, zb),
            pointLocal(xb, yb, zb),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(xa, yb, za),
            pointLocal(xb, yb, za),
            pointLocal(xb, yb, zb),
            pointLocal(xa, yb, zb),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(xa, ya, zb),
            pointLocal(xb, ya, zb),
            pointLocal(xb, ya, za),
            pointLocal(xa, ya, za),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(xa, ya, zb),
            pointLocal(xa, ya, za),
            pointLocal(xa, yb, za),
            pointLocal(xa, yb, zb),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(xb, ya, za),
            pointLocal(xb, ya, zb),
            pointLocal(xb, yb, zb),
            pointLocal(xb, yb, za),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, tex, flatCol, texMix)));
      }
      function addRing(
        cx,
        cz,
        innerR,
        outerR,
        ya,
        yb,
        tex,
        flatCol,
        texMix,
        gapCenter,
        gapWidth,
      ) {
        const q = [],
          r0 = Math.max(0.02, innerR);
        for (let s = 0; s < 24; s++) {
          const a0 = (s / 24) * Math.PI * 2,
            a1 = ((s + 1) / 24) * Math.PI * 2;
          if ("number" == typeof gapCenter && "number" == typeof gapWidth) {
            const mid = 0.5 * (a0 + a1),
              gapDelta = Math.atan2(
                Math.sin(mid - gapCenter),
                Math.cos(mid - gapCenter),
              );
            if (Math.abs(gapDelta) < 0.5 * gapWidth) continue;
          }
          const ox0 = cx + Math.cos(a0) * outerR,
            oz0 = cz + Math.sin(a0) * outerR,
            ox1 = cx + Math.cos(a1) * outerR,
            oz1 = cz + Math.sin(a1) * outerR,
            ix0 = cx + Math.cos(a0) * r0,
            iz0 = cz + Math.sin(a0) * r0,
            ix1 = cx + Math.cos(a1) * r0,
            iz1 = cz + Math.sin(a1) * r0;
          (pushQuad(
            q,
            pointLocal(ox0, yb, oz0),
            pointLocal(ix0, yb, iz0),
            pointLocal(ix1, yb, iz1),
            pointLocal(ox1, yb, oz1),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            pushQuad(
              q,
              pointLocal(ox1, ya, oz1),
              pointLocal(ix1, ya, iz1),
              pointLocal(ix0, ya, iz0),
              pointLocal(ox0, ya, oz0),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
            pushQuad(
              q,
              pointLocal(ox1, ya, oz1),
              pointLocal(ox0, ya, oz0),
              pointLocal(ox0, yb, oz0),
              pointLocal(ox1, yb, oz1),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ),
            pushQuad(
              q,
              pointLocal(ix0, ya, iz0),
              pointLocal(ix1, ya, iz1),
              pointLocal(ix1, yb, iz1),
              pointLocal(ix0, yb, iz0),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ));
        }
        meshes.push(self._makeMesh(q, tex, flatCol, texMix));
      }
      function addBar(xa, za, xb, zb, ya, yb, halfT, tex, flatCol, texMix) {
        const dx = xb - xa,
          dz = zb - za,
          len = Math.hypot(dx, dz) || 1,
          nx = (-dz / len) * halfT,
          nz = (dx / len) * halfT,
          q = [],
          a0 = [xa + nx, za + nz],
          a1 = [xa - nx, za - nz],
          b0 = [xb + nx, zb + nz],
          b1 = [xb - nx, zb - nz];
        (pushQuad(
          q,
          pointLocal(a0[0], ya, a0[1]),
          pointLocal(b0[0], ya, b0[1]),
          pointLocal(b0[0], yb, b0[1]),
          pointLocal(a0[0], yb, a0[1]),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          pushQuad(
            q,
            pointLocal(b1[0], ya, b1[1]),
            pointLocal(a1[0], ya, a1[1]),
            pointLocal(a1[0], yb, a1[1]),
            pointLocal(b1[0], yb, b1[1]),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(a0[0], yb, a0[1]),
            pointLocal(b0[0], yb, b0[1]),
            pointLocal(b1[0], yb, b1[1]),
            pointLocal(a1[0], yb, a1[1]),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(a1[0], ya, a1[1]),
            pointLocal(b1[0], ya, b1[1]),
            pointLocal(b0[0], ya, b0[1]),
            pointLocal(a0[0], ya, a0[1]),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(a1[0], ya, a1[1]),
            pointLocal(a0[0], ya, a0[1]),
            pointLocal(a0[0], yb, a0[1]),
            pointLocal(a1[0], yb, a1[1]),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          pushQuad(
            q,
            pointLocal(b0[0], ya, b0[1]),
            pointLocal(b1[0], ya, b1[1]),
            pointLocal(b1[0], yb, b1[1]),
            pointLocal(b0[0], yb, b0[1]),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, tex, flatCol, texMix)));
      }
      const halfW = 15.5 * Math.sin(0.5 * SECTION_ANGLE) * 0.92,
        x1 = -14.2,
        y0 = -1.05,
        y1 = 1.0856,
        z0 = -halfW,
        z1 = halfW;
      let q = [];
      ((q = []),
        pushQuad(
          q,
          pointLocal(-8, y0, z0),
          pointLocal(-8, y0, z1),
          pointLocal(x1, y0, z1),
          pointLocal(x1, y0, z0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1)),
        (q = []),
        pushQuad(
          q,
          pointLocal(-8, y1, z1),
          pointLocal(-8, y1, z0),
          pointLocal(x1, y1, z0),
          pointLocal(x1, y1, z1),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1)),
        (q = []),
        pushQuad(
          q,
          pointLocal(-8, y0, z0),
          pointLocal(x1, y0, z0),
          pointLocal(x1, y1, z0),
          pointLocal(-8, y1, z0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1)),
        (q = []),
        pushQuad(
          q,
          pointLocal(x1, y0, z1),
          pointLocal(-8, y0, z1),
          pointLocal(-8, y1, z1),
          pointLocal(x1, y1, z1),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1)),
        (q = []),
        pushQuad(
          q,
          pointLocal(x1, y0, z0),
          pointLocal(x1, y0, z1),
          pointLocal(x1, y1, z1),
          pointLocal(x1, y1, z0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.015, 0.02, 0.04], 0)));
      const cx = -14.16,
        cy0 = y0 + 0.2,
        cy1 = 0.9056,
        cz0 = z0 + 0.34,
        cz1 = z1 - 0.34;
      ((q = []),
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0),
          pointLocal(cx, cy0, cz1),
          pointLocal(cx, cy0 + 0.12, cz1),
          pointLocal(cx, cy0 + 0.12, cz0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0)),
        (q = []),
        pushQuad(
          q,
          pointLocal(cx, 0.7856, cz0),
          pointLocal(cx, 0.7856, cz1),
          pointLocal(cx, cy1, cz1),
          pointLocal(cx, cy1, cz0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0)),
        (q = []),
        pushQuad(
          q,
          pointLocal(cx, cy0, cz0),
          pointLocal(cx, cy0, cz0 + 0.12),
          pointLocal(cx, cy1, cz0 + 0.12),
          pointLocal(cx, cy1, cz0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0)),
        (q = []),
        pushQuad(
          q,
          pointLocal(cx, cy0, cz1 - 0.12),
          pointLocal(cx, cy0, cz1),
          pointLocal(cx, cy1, cz1),
          pointLocal(cx, cy1, cz1 - 0.12),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.03, 0.03, 0.03], 0)),
        (q = []),
        pushQuad(
          q,
          pointLocal(x1 + 0.55, y0 + 0.1, cz0 + 0.16),
          pointLocal(x1 + 0.55, y0 + 0.1, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz1 - 0.16),
          pointLocal(x1 + 1.05, y0 + 0.18, cz0 + 0.16),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
        meshes.push(self._makeMesh(q, TEX.black, [0.055, 0.062, 0.07], 0)));
      const liftX = x1 + 2.22;
      function gatePoint(radius, angle) {
        return {
          x: liftX + Math.cos(angle) * radius,
          z: 0 + Math.sin(angle) * radius,
        };
      }
      (addRing(
        liftX,
        0,
        0.9,
        2.08,
        -1.02,
        y0 + 0.22,
        TEX.black,
        [0.055, 0.062, 0.07],
        0,
      ),
        addRing(
          liftX,
          0,
          1.88,
          2.2,
          -1.04,
          y0 + 0.09,
          TEX.black,
          [0.06, 0.07, 0.08],
          0,
        ),
        addRing(
          liftX,
          0,
          0.42,
          0.72,
          y0 + 0.2,
          y0 + 0.43,
          TEX.black,
          [0.09, 0.1, 0.115],
          0,
        ),
        addRing(
          liftX,
          0,
          0.03,
          0.16,
          y0 + 0.2,
          y1 - 0.04,
          TEX.black,
          [0.04, 0.055, 0.075],
          0,
        ),
        addRing(
          liftX,
          0,
          2.04,
          2.18,
          -0.27,
          y0 + 0.86,
          TEX.black,
          [0.05, 0.065, 0.075],
          0,
          0.42,
          1.2,
        ));
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2,
          gateDelta = Math.atan2(Math.sin(a - 0.42), Math.cos(a - 0.42));
        if (Math.abs(gateDelta) < 0.6) continue;
        const px = liftX + 2.13 * Math.cos(a),
          pz = 0 + 2.13 * Math.sin(a);
        addBox(
          px - 0.035,
          px + 0.035,
          y0 + 0.2,
          y0 + 0.84,
          pz - 0.035,
          pz + 0.035,
          TEX.black,
          [0.035, 0.045, 0.055],
          0,
        );
      }
      const hingeLo = gatePoint(2.13, -0.18),
        hingeHi = gatePoint(2.13, 1.02);
      (addBox(
        hingeLo.x - 0.045,
        hingeLo.x + 0.045,
        y0 + 0.2,
        y0 + 0.9,
        hingeLo.z - 0.045,
        hingeLo.z + 0.045,
        TEX.black,
        [0.035, 0.045, 0.055],
        0,
      ),
        addBox(
          hingeHi.x - 0.045,
          hingeHi.x + 0.045,
          y0 + 0.2,
          y0 + 0.9,
          hingeHi.z - 0.045,
          hingeHi.z + 0.045,
          TEX.black,
          [0.035, 0.045, 0.055],
          0,
        ));
      const leafLo = gatePoint(1.58, -0.8),
        leafHi = gatePoint(1.58, 1.02 + 0.62);
      (addBar(
        hingeLo.x,
        hingeLo.z,
        leafLo.x,
        leafLo.z,
        -0.27,
        y0 + 0.86,
        0.035,
        TEX.black,
        [0.05, 0.065, 0.075],
        0,
      ),
        addBar(
          hingeLo.x,
          hingeLo.z,
          leafLo.x,
          leafLo.z,
          y0 + 0.44,
          -0.55,
          0.03,
          TEX.black,
          [0.04, 0.052, 0.062],
          0,
        ),
        addBar(
          hingeHi.x,
          hingeHi.z,
          leafHi.x,
          leafHi.z,
          -0.27,
          y0 + 0.86,
          0.035,
          TEX.black,
          [0.05, 0.065, 0.075],
          0,
        ),
        addBar(
          hingeHi.x,
          hingeHi.z,
          leafHi.x,
          leafHi.z,
          y0 + 0.44,
          -0.55,
          0.03,
          TEX.black,
          [0.04, 0.052, 0.062],
          0,
        ),
        addBox(
          leafLo.x - 0.035,
          leafLo.x + 0.035,
          y0 + 0.42,
          y0 + 0.86,
          leafLo.z - 0.035,
          leafLo.z + 0.035,
          TEX.black,
          [0.03, 0.04, 0.05],
          0,
        ),
        addBox(
          leafHi.x - 0.035,
          leafHi.x + 0.035,
          y0 + 0.42,
          y0 + 0.86,
          leafHi.z - 0.035,
          leafHi.z + 0.035,
          TEX.black,
          [0.03, 0.04, 0.05],
          0,
        ),
        addRing(
          liftX,
          0,
          0.78,
          1.34,
          -1.17,
          -1.07,
          TEX.black,
          [0.045, 0.052, 0.06],
          0,
        ),
        addRing(
          liftX,
          0,
          1.2,
          1.58,
          -1.35,
          -1.23,
          TEX.black,
          [0.035, 0.044, 0.055],
          0,
        ),
        addBox(
          liftX - 0.11,
          -11.87,
          -79.05,
          y0 + 0.08,
          -0.11,
          0.11,
          TEX.black,
          [0.02, 0.028, 0.04],
          0,
        ),
        addBox(
          liftX + 0.72 - 0.045,
          liftX + 0.72 + 0.045,
          -79.05,
          -1.03,
          -0.045,
          0.045,
          TEX.black,
          [0.05, 0.064, 0.08],
          0,
        ),
        addBox(
          -12.745,
          -12.655,
          -79.05,
          -1.03,
          -0.045,
          0.045,
          TEX.black,
          [0.05, 0.064, 0.08],
          0,
        ),
        addBox(
          liftX - 0.045,
          liftX + 0.045,
          -79.05,
          -1.03,
          0.72 - 0.045,
          0.765,
          TEX.black,
          [0.05, 0.064, 0.08],
          0,
        ),
        addBox(
          liftX - 0.045,
          liftX + 0.045,
          -79.05,
          -1.03,
          -0.765,
          0.045 - 0.72,
          TEX.black,
          [0.05, 0.064, 0.08],
          0,
        ));
      for (let rung = 0; rung < 20; rung++) {
        const ry = y0 - 1.1 - 3.75 * rung;
        (addRing(
          liftX,
          0,
          0.7,
          0.84,
          ry - 0.025,
          ry + 0.025,
          TEX.black,
          [0.04, 0.052, 0.066],
          0,
        ),
          addBox(
            liftX - 0.94,
            -11.04,
            ry - 0.022,
            ry + 0.022,
            -0.022,
            0.022,
            TEX.black,
            [0.04, 0.052, 0.066],
            0,
          ),
          addBox(
            liftX - 0.022,
            liftX + 0.022,
            ry - 0.022,
            ry + 0.022,
            -0.94,
            0.94,
            TEX.black,
            [0.04, 0.052, 0.066],
            0,
          ));
      }
      (addBox(
        -10.62 - 0.055,
        -10.565,
        -0.89,
        y1 - 0.04,
        -0.055,
        0.055,
        TEX.black,
        [0.055, 0.07, 0.09],
        0,
      ),
        addBox(
          liftX - 1.36 - 0.055,
          liftX - 1.36 + 0.055,
          -0.89,
          y1 - 0.04,
          -0.055,
          0.055,
          TEX.black,
          [0.055, 0.07, 0.09],
          0,
        ),
        addBox(
          liftX - 0.055,
          liftX + 0.055,
          -0.89,
          y1 - 0.04,
          1.36 - 0.055,
          1.415,
          TEX.black,
          [0.055, 0.07, 0.09],
          0,
        ),
        addBox(
          liftX - 0.055,
          liftX + 0.055,
          -0.89,
          y1 - 0.04,
          -1.415,
          0.055 - 1.36,
          TEX.black,
          [0.055, 0.07, 0.09],
          0,
        ),
        addRing(
          liftX,
          0,
          1.08,
          1.2,
          0.9056,
          y1 - 0.08,
          TEX.black,
          [0.045, 0.055, 0.065],
          0,
        ),
        addBox(
          liftX - 1.52,
          liftX + 1.52,
          y1 - 0.16,
          y1 - 0.1,
          -0.045,
          0.045,
          TEX.black,
          [0.045, 0.055, 0.065],
          0,
        ),
        addBox(
          liftX - 0.045,
          liftX + 0.045,
          y1 - 0.16,
          y1 - 0.1,
          -1.52,
          1.52,
          TEX.black,
          [0.045, 0.055, 0.065],
          0,
        ));
    })(),
      (function () {
        const fm = sectionFrame(8.5 * SECTION_ANGLE);
        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        var q,
          hx1 = -2.33,
          hy0 = -1.05,
          hy1 = 1.0384,
          hz0 = -1.15,
          hz1 = 1.15;
        (pushQuad(
          (q = []),
          pointLocal(-8, hy0, hz0),
          pointLocal(-8, hy0, hz1),
          pointLocal(hx1, hy0, hz1),
          pointLocal(hx1, hy0, hz0),
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ),
          meshes.push(self._makeMesh(q, TEX.floor, [1, 1, 1], 1)),
          pushQuad(
            (q = []),
            pointLocal(-8, hy1, hz1),
            pointLocal(-8, hy1, hz0),
            pointLocal(hx1, hy1, hz0),
            pointLocal(hx1, hy1, hz1),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, TEX.ceil, [1, 1, 1], 1)),
          pushQuad(
            (q = []),
            pointLocal(-8, hy0, hz0),
            pointLocal(hx1, hy0, hz0),
            pointLocal(hx1, hy1, hz0),
            pointLocal(-8, hy1, hz0),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, TEX.lp2, [1, 1, 1], 1)),
          pushQuad(
            (q = []),
            pointLocal(hx1, hy0, hz1),
            pointLocal(-8, hy0, hz1),
            pointLocal(-8, hy1, hz1),
            pointLocal(hx1, hy1, hz1),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, TEX.rp2, [1, 1, 1], 1)),
          pushQuad(
            (q = []),
            pointLocal(-8, -1.04, hz0),
            pointLocal(hx1, -1.04, hz0),
            pointLocal(hx1, -1.04, hz0 + 0.04),
            pointLocal(-8, -1.04, hz0 + 0.04),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0)),
          pushQuad(
            (q = []),
            pointLocal(-8, -1.04, hz1 - 0.04),
            pointLocal(hx1, -1.04, hz1 - 0.04),
            pointLocal(hx1, -1.04, hz1),
            pointLocal(-8, -1.04, hz1),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
          meshes.push(self._makeMesh(q, TEX.black, [0.02, 0.02, 0.02], 0)));
      })(),
      (function () {
        const fm = sectionFrame(0.5 * SECTION_ANGLE);
        function pointLocal(x, y, z) {
          return [
            fm.center[0] + fm.radial[0] * x + fm.up[0] * y + fm.tangent[0] * z,
            fm.center[1] + fm.radial[1] * x + fm.up[1] * y + fm.tangent[1] * z,
            fm.center[2] + fm.radial[2] * x + fm.up[2] * y + fm.tangent[2] * z,
          ];
        }
        function addPanel(p00, p10, p11, p01, tex, flatCol, texMix, blend) {
          const q = [];
          (pushQuad(q, p00, p10, p11, p01, [0, 1], [1, 1], [1, 0], [0, 0]),
            meshes.push(
              self._makeMesh(
                q,
                tex,
                flatCol || [1, 1, 1],
                "number" == typeof texMix ? texMix : 1,
                blend,
              ),
            ));
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
        function addTiledPanel(
          p00,
          p10,
          p11,
          p01,
          tex,
          flatCol,
          texMix,
          cols,
          rows,
        ) {
          ((cols = Math.max(1, 0 | cols)), (rows = Math.max(1, 0 | rows)));
          for (let x = 0; x < cols; x++) {
            const u0 = x / cols,
              u1 = (x + 1) / cols;
            for (let y = 0; y < rows; y++) {
              const v0 = y / rows,
                v1 = (y + 1) / rows;
              addPanel(
                patchPoint(p00, p10, p11, p01, u0, v0),
                patchPoint(p00, p10, p11, p01, u1, v0),
                patchPoint(p00, p10, p11, p01, u1, v1),
                patchPoint(p00, p10, p11, p01, u0, v1),
                tex,
                flatCol,
                texMix,
              );
            }
          }
        }
        function addBox(xa, xb, ya, yb, za, zb, tex, flatCol, texMix) {
          (addPanel(
            pointLocal(xa, ya, za),
            pointLocal(xb, ya, za),
            pointLocal(xb, yb, za),
            pointLocal(xa, yb, za),
            tex,
            flatCol,
            texMix,
          ),
            addPanel(
              pointLocal(xb, ya, zb),
              pointLocal(xa, ya, zb),
              pointLocal(xa, yb, zb),
              pointLocal(xb, yb, zb),
              tex,
              flatCol,
              texMix,
            ),
            addPanel(
              pointLocal(xa, yb, za),
              pointLocal(xb, yb, za),
              pointLocal(xb, yb, zb),
              pointLocal(xa, yb, zb),
              tex,
              flatCol,
              texMix,
            ),
            addPanel(
              pointLocal(xa, ya, zb),
              pointLocal(xb, ya, zb),
              pointLocal(xb, ya, za),
              pointLocal(xa, ya, za),
              tex,
              flatCol,
              texMix,
            ),
            addPanel(
              pointLocal(xa, ya, zb),
              pointLocal(xa, ya, za),
              pointLocal(xa, yb, za),
              pointLocal(xa, yb, zb),
              tex,
              flatCol,
              texMix,
            ),
            addPanel(
              pointLocal(xb, ya, za),
              pointLocal(xb, ya, zb),
              pointLocal(xb, yb, zb),
              pointLocal(xb, yb, za),
              tex,
              flatCol,
              texMix,
            ));
        }
        function addCollar(x, ya, yb, innerHalfW, outerHalfW) {
          const d = 0.16,
            col = [0.025, 0.03, 0.038];
          (addBox(
            x - d,
            x + d,
            ya - 0.16,
            yb + 0.16,
            -outerHalfW,
            -innerHalfW,
            TEX.black,
            col,
            0,
          ),
            addBox(
              x - d,
              x + d,
              ya - 0.16,
              yb + 0.16,
              innerHalfW,
              outerHalfW,
              TEX.black,
              col,
              0,
            ),
            addBox(
              x - d,
              x + d,
              yb,
              yb + 0.16,
              -outerHalfW,
              outerHalfW,
              TEX.black,
              col,
              0,
            ),
            addBox(
              x - d,
              x + d,
              ya - 0.16,
              ya,
              -outerHalfW,
              outerHalfW,
              TEX.black,
              col,
              0,
            ));
        }
        function addBulkheadWithOpening(
          x,
          ya,
          yb,
          halfW,
          openYa,
          openYb,
          openHalfW,
          tex,
        ) {
          const dim = [0.04, 0.045, 0.05];
          (addPanel(
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, -openHalfW),
            pointLocal(x, yb, -openHalfW),
            pointLocal(x, yb, -halfW),
            tex,
            dim,
            0.62,
          ),
            addPanel(
              pointLocal(x, ya, openHalfW),
              pointLocal(x, ya, halfW),
              pointLocal(x, yb, halfW),
              pointLocal(x, yb, openHalfW),
              tex,
              dim,
              0.62,
            ),
            addPanel(
              pointLocal(x, openYb, -openHalfW),
              pointLocal(x, openYb, openHalfW),
              pointLocal(x, yb, openHalfW),
              pointLocal(x, yb, -openHalfW),
              tex,
              dim,
              0.62,
            ),
            addPanel(
              pointLocal(x, ya, -openHalfW),
              pointLocal(x, ya, openHalfW),
              pointLocal(x, openYa, openHalfW),
              pointLocal(x, openYa, -openHalfW),
              tex,
              dim,
              0.62,
            ));
        }
        function addRoom(xa, xb, ya, yb, za, zb, openA, openB) {
          const xTiles = Math.max(2, Math.ceil(Math.abs(xb - xa) / 2.2)),
            zTiles = Math.max(2, Math.ceil(Math.abs(zb - za) / 2)),
            ceilXTiles = Math.max(1, Math.ceil(Math.abs(xb - xa) / 4.8)),
            ceilZTiles = Math.max(1, Math.ceil(Math.abs(zb - za) / 4.8)),
            wallDim = [0.035, 0.04, 0.045];
          (addTiledPanel(
            pointLocal(xa, ya, za),
            pointLocal(xa, ya, zb),
            pointLocal(xb, ya, zb),
            pointLocal(xb, ya, za),
            TEX.basementFloor,
            [0.05, 0.055, 0.06],
            0.55,
            zTiles,
            xTiles,
          ),
            addTiledPanel(
              pointLocal(xa, yb, zb),
              pointLocal(xa, yb, za),
              pointLocal(xb, yb, za),
              pointLocal(xb, yb, zb),
              TEX.basementCeil,
              [0.025, 0.03, 0.035],
              0.5,
              ceilZTiles,
              ceilXTiles,
            ),
            addPanel(
              pointLocal(xa, ya, za),
              pointLocal(xb, ya, za),
              pointLocal(xb, yb, za),
              pointLocal(xa, yb, za),
              TEX.basementWall,
              wallDim,
              0.58,
            ),
            addPanel(
              pointLocal(xb, ya, zb),
              pointLocal(xa, ya, zb),
              pointLocal(xa, yb, zb),
              pointLocal(xb, yb, zb),
              TEX.basementWall,
              wallDim,
              0.58,
            ),
            openA ||
              addPanel(
                pointLocal(xa, ya, zb),
                pointLocal(xa, ya, za),
                pointLocal(xa, yb, za),
                pointLocal(xa, yb, zb),
                TEX.basementWall,
                wallDim,
                0.58,
              ),
            openB ||
              addPanel(
                pointLocal(xb, ya, za),
                pointLocal(xb, ya, zb),
                pointLocal(xb, yb, zb),
                pointLocal(xb, yb, za),
                TEX.basementWall,
                wallDim,
                0.58,
              ));
        }
        function addSpeakerStage(x0, x1, floorY, topY, zBack, zFront) {
          const deckY = floorY + 0.24,
            backZ = zBack + 0.05,
            faceZ = zBack + 0.5,
            stageX0 = x0 + 0.76,
            stageX1 = x1 + 0.28;
          (addBox(
            stageX0,
            stageX1,
            floorY + 0.02,
            deckY,
            backZ,
            faceZ,
            TEX.black,
            [0.01, 0.011, 0.011],
            0,
          ),
            addPanel(
              pointLocal(stageX0, deckY, backZ),
              pointLocal(stageX1, deckY, backZ),
              pointLocal(stageX1, deckY, faceZ),
              pointLocal(stageX0, deckY, faceZ),
              TEX.black,
              [0.016, 0.016, 0.015],
              0,
            ));
          const y0 = deckY + 0.02,
            y1 = Math.min(topY, y0 + 1.62);
          (addPanel(
            pointLocal(stageX0, y0, faceZ + 0.024),
            pointLocal(stageX1, y0, faceZ + 0.024),
            pointLocal(stageX1, y1, faceZ + 0.024),
            pointLocal(stageX0, y1, faceZ + 0.024),
            TEX.speakerFront,
            [1, 1, 1],
            1,
            !0,
          ),
            addPanel(
              pointLocal(stageX0, y0, backZ),
              pointLocal(stageX0, y0, faceZ),
              pointLocal(stageX0, y1, faceZ),
              pointLocal(stageX0, y1, backZ),
              TEX.speakerLeft,
              [1, 1, 1],
              1,
              !0,
            ),
            addPanel(
              pointLocal(stageX1, y0, faceZ),
              pointLocal(stageX1, y0, backZ),
              pointLocal(stageX1, y1, backZ),
              pointLocal(stageX1, y1, faceZ),
              TEX.speakerRight,
              [1, 1, 1],
              1,
              !0,
            ));
        }
        function addRaveAftermath(x0, x1, y, z0, z1) {
          const bits = [
            [0.18, 0.18, 0.55, 0.1, -0.65, 0.18, 0.42, 0.95],
            [0.4, 0.33, 0.18, 0.12, 0.25, 0.9, 0.2, 0.55],
            [0.62, 0.14, 0.34, 0.09, -0.05, 0.95, 0.12, 0.75],
            [0.78, 0.44, 0.2, 0.1, 0.62, 0.18, 0.95, 0.45],
            [0.28, 0.7, 0.16, 0.08, -0.28, 0.1, 0.85, 0.95],
            [0.52, 0.62, 0.42, 0.06, 0.48, 0.95, 0.15, 0.85],
            [0.13, 0.58, 0.22, 0.07, 0.08, 0.95, 0.12, 0.24],
            [0.35, 0.78, 0.28, 0.08, -0.18, 0.1, 0.78, 0.38],
            [0.69, 0.75, 0.16, 0.06, 0.4, 0.8, 0.28, 0.95],
            [0.86, 0.2, 0.26, 0.08, -0.36, 0.95, 0.75, 0.1],
            [0.47, 0.48, 0.12, 0.12, 0, 0.7, 0.95, 0.2],
          ];
          for (let i = 0; i < bits.length; i++) {
            const b = bits[i],
              cx = x0 + (x1 - x0) * b[0],
              cz = z0 + (z1 - z0) * b[1],
              hw = 0.5 * b[2],
              hd = 0.5 * b[3],
              rot = b[4],
              c = Math.cos(rot),
              s = Math.sin(rot);
            function p(px, pz) {
              return pointLocal(
                cx + px * c - pz * s,
                y + 0.018,
                cz + px * s + pz * c,
              );
            }
            addPanel(
              p(-hw, -hd),
              p(hw, -hd),
              p(hw, hd),
              p(-hw, hd),
              TEX.black,
              [1.45 * b[5], 1.45 * b[6], 1.45 * b[7]],
              0,
            );
          }
          function floorStrip(ax, az, bx, bz, halfW, col) {
            const dx = bx - ax,
              dz = bz - az,
              inv = 1 / Math.max(0.001, Math.hypot(dx, dz)),
              nx = -dz * inv * halfW,
              nz = dx * inv * halfW;
            addPanel(
              pointLocal(ax + nx, y + 0.026, az + nz),
              pointLocal(bx + nx, y + 0.026, bz + nz),
              pointLocal(bx - nx, y + 0.026, bz - nz),
              pointLocal(ax - nx, y + 0.026, az - nz),
              TEX.black,
              col,
              0,
            );
          }
          (floorStrip(
            x0 + 0.3,
            z0 + 0.42,
            x1 - 0.55,
            z0 + 0.72,
            0.035,
            [0.95, 0.08, 1.8],
          ),
            floorStrip(
              x0 + 1.1,
              z1 - 0.92,
              x1 - 1.2,
              z1 - 1.48,
              0.028,
              [0.08, 1.35, 1.65],
            ),
            floorStrip(
              x0 + 2.15,
              z0 + 2.1,
              x0 + 3.9,
              z0 + 2.55,
              0.026,
              [1.7, 0.78, 0.05],
            ),
            floorStrip(
              x0 + 4.2,
              z1 - 0.62,
              x1 - 0.9,
              z1 - 0.52,
              0.02,
              [0.45, 1.55, 0.2],
            ),
            floorStrip(
              x0 + 0.78,
              z0 + 1.1,
              x0 + 0.78,
              z0 + 1.11,
              0.18,
              [2.1, 0.28, 0.02],
            ),
            floorStrip(
              x0 + 3.05,
              z1 - 1.25,
              x0 + 3.05,
              z1 - 1.24,
              0.16,
              [2.4, 0.62, 0.03],
            ),
            floorStrip(
              x1 - 1.4,
              z0 + 2,
              x1 - 1.4,
              z0 + 2.01,
              0.17,
              [1.9, 0.12, 0.02],
            ));
        }
        function addBayStyleHallway(xa, xb, ya, yb, halfW) {
          const z0 = -halfW,
            z1 = halfW;
          (addPanel(
            pointLocal(xa, ya, z0),
            pointLocal(xa, ya, z1),
            pointLocal(xb, ya, z1),
            pointLocal(xb, ya, z0),
            TEX.floor,
            [1, 1, 1],
            1,
          ),
            addPanel(
              pointLocal(xa, yb, z1),
              pointLocal(xa, yb, z0),
              pointLocal(xb, yb, z0),
              pointLocal(xb, yb, z1),
              TEX.ceil,
              [1, 1, 1],
              1,
            ),
            addPanel(
              pointLocal(xa, ya, z0),
              pointLocal(xb, ya, z0),
              pointLocal(xb, yb, z0),
              pointLocal(xa, yb, z0),
              TEX.lp2,
              [1, 1, 1],
              1,
            ),
            addPanel(
              pointLocal(xb, ya, z1),
              pointLocal(xa, ya, z1),
              pointLocal(xa, yb, z1),
              pointLocal(xb, yb, z1),
              TEX.rp2,
              [1, 1, 1],
              1,
            ),
            addPanel(
              pointLocal(xa, ya + 0.01, z0),
              pointLocal(xb, ya + 0.01, z0),
              pointLocal(xb, ya + 0.01, z0 + 0.04),
              pointLocal(xa, ya + 0.01, z0 + 0.04),
              TEX.black,
              [0.02, 0.02, 0.02],
              0,
            ),
            addPanel(
              pointLocal(xa, ya + 0.01, z1 - 0.04),
              pointLocal(xb, ya + 0.01, z1 - 0.04),
              pointLocal(xb, ya + 0.01, z1),
              pointLocal(xa, ya + 0.01, z1),
              TEX.black,
              [0.02, 0.02, 0.02],
              0,
            ));
        }
        function markMeshes(start, flag) {
          for (let mi = start; mi < meshes.length; mi++) meshes[mi][flag] = !0;
        }
        function addAlphaWall(x, ya, yb, halfW, tex) {
          const q = [];
          (pushQuad(
            q,
            pointLocal(x, ya, -halfW),
            pointLocal(x, ya, halfW),
            pointLocal(x, yb, halfW),
            pointLocal(x, yb, -halfW),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ),
            meshes.push(self._makeMesh(q, tex, [1, 1, 1], 1, !0)));
        }
        function addAnnexCrowdPlane(tex, cx, cz, h, w, facing) {
          if (!tex) return null;
          const y0 = annexY0 + 0.018,
            y1 = y0 + h,
            q = [];
          "side" === facing
            ? pushQuad(
                q,
                pointLocal(cx, y0, cz - 0.5 * w),
                pointLocal(cx, y0, cz + 0.5 * w),
                pointLocal(cx, y1, cz + 0.5 * w),
                pointLocal(cx, y1, cz - 0.5 * w),
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              )
            : pushQuad(
                q,
                pointLocal(cx - 0.5 * w, y0, cz),
                pointLocal(cx + 0.5 * w, y0, cz),
                pointLocal(cx + 0.5 * w, y1, cz),
                pointLocal(cx - 0.5 * w, y1, cz),
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              );
          const mesh = self._makeMesh(q, tex, [1, 1, 1], 1, !0);
          return (
            (mesh.annexCrowd2 = !0),
            (mesh.annexCrowdBack = "side" !== facing),
            (mesh.annexCrowdSide = "side" === facing),
            (mesh.annexNormalOnly = !0),
            (mesh.annexInterior = !0),
            (mesh.useTexAlpha = !0),
            (mesh.crowdDanceSeed =
              43758.5453 * Math.sin(17.17 * (cx + 19.13) + 31.31 * (cz - 3.7))),
            (mesh.crowdDanceAmp =
              0.7 + (Math.abs(mesh.crowdDanceSeed) % 1) * 0.46),
            meshes.push(mesh),
            mesh
          );
        }
        function addCeilingBulb(cx, cz, floorY, ceilY) {
          const by = ceilY - 0.14;
          (addBox(
            cx - 0.045,
            cx + 0.045,
            by - 0.055,
            by + 0.055,
            cz - 0.045,
            cz + 0.045,
            TEX.black,
            [1.55, 1.85, 2.3],
            0,
          ),
            addBox(
              cx - 0.13,
              cx + 0.13,
              ceilY - 0.035,
              ceilY - 0.01,
              cz - 0.13,
              cz + 0.13,
              TEX.black,
              [0.1, 0.085, 0.06],
              0,
            ));
        }
        const hallX1 = 2.35 + 5.2;
        (!(function () {
          const throatX0 = 2.35 - 0.03,
            z0 = -1.16,
            z1 = 1.16;
          (addPanel(
            pointLocal(throatX0, -1.05, z0),
            pointLocal(2.515, -1.05, z0),
            pointLocal(2.515, 1.0584, z0),
            pointLocal(throatX0, 1.0584, z0),
            TEX.lp2,
            [1, 1, 1],
            1,
          ),
            addPanel(
              pointLocal(2.515, -1.05, z1),
              pointLocal(throatX0, -1.05, z1),
              pointLocal(throatX0, 1.0584, z1),
              pointLocal(2.515, 1.0584, z1),
              TEX.rp2,
              [1, 1, 1],
              1,
            ),
            addPanel(
              pointLocal(throatX0, 1.0584, z1),
              pointLocal(throatX0, 1.0584, z0),
              pointLocal(2.515, 1.0584, z0),
              pointLocal(2.515, 1.0584, z1),
              TEX.ceil,
              [1, 1, 1],
              1,
            ),
            addPanel(
              pointLocal(throatX0 - 0.045, 1.0534, z0 - 0.035),
              pointLocal(throatX0 - 0.045, 1.0534, z1 + 0.035),
              pointLocal(1.73, 1.184, z1 + 0.035),
              pointLocal(1.73, 1.184, z0 - 0.035),
              TEX.ceil,
              [1, 1, 1],
              1,
            ),
            addBox(
              2.265,
              2.33,
              1.0284,
              1.1034,
              -1.21,
              1.21,
              TEX.black,
              [0.024, 0.03, 0.038],
              0,
            ));
        })(),
          addBayStyleHallway(2.47, hallX1, -1.05, 1.0384, 1.15));
        const exteriorStart = meshes.length,
          oldAnnexX0 = hallX1;
        (addRoom(oldAnnexX0, 16.35, -1.05, 1.1984, -4.2, 4.2, !0, !0),
          addSpeakerStage(8.17, 11.73, -1.05, 1.72 - 1.05, -3.72),
          addRaveAftermath(oldAnnexX0 + 0.25, 16.35 - 0.6, -1.05, -3.85, 3.85),
          (function (x) {
            const q = [];
            pushQuad(
              q,
              pointLocal(x, -1.05, -4.2),
              pointLocal(x, -1.05, 4.2),
              pointLocal(x, 1.1984, 4.2),
              pointLocal(x, 1.1984, -4.2),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const mesh = self._makeMesh(q, TEX.exitWall, [1, 1, 1], 1, !1);
            ((mesh.greenKey = !0), meshes.push(mesh));
          })(16.338),
          addBayStyleHallway(16.353, 20.738, -1.05, 1.1984, 1.45),
          addBulkheadWithOpening(
            oldAnnexX0 + 0.01,
            -1.05,
            1.1984,
            4.2,
            -1.05,
            1.0384,
            1.27,
            TEX.basementWall,
          ),
          addCollar(oldAnnexX0, -1.05, 1.0384, 1.15 + 0.16, 1.77),
          markMeshes(exteriorStart, "annexExterior"));
        const interiorStart = meshes.length,
          stairX0 = hallX1,
          stairX1 = stairX0 + 7.8,
          annexX0 = stairX1,
          annexX1 = annexX0 + 7.8,
          annexY0 = -4.85,
          annexY1 = 1.0384 - 3.8 + 0.24,
          topStairDoorWallStart = meshes.length;
        addAlphaWall(7.562, -1.07, 1.0584, 1.17, TEX.spaceHallDoor);
        for (let mi = topStairDoorWallStart; mi < meshes.length; mi++)
          meshes[mi].annexNormalOnly = !0;
        const altTopStairDoorWallStart = meshes.length;
        addAlphaWall(
          7.562,
          -1.07,
          1.0584,
          1.17,
          TEX.basementAltDoorHall || TEX.spaceHallDoor,
        );
        for (let mi = altTopStairDoorWallStart; mi < meshes.length; mi++)
          ((meshes[mi].annexAltOnly = !0), (meshes[mi].annexTopDoorBulb = !0));
        const topStairDoorBulbStart = meshes.length;
        (addBox(
          hallX1 - 0.052,
          hallX1 - 0.014,
          0.9464,
          1.0004,
          -0.185,
          0.185,
          TEX.black,
          [0.07, 0.052, 0.032],
          0,
        ),
          addBox(
            hallX1 - 0.066,
            hallX1 - 0.008,
            0.8604,
            0.9444,
            -0.07,
            0.07,
            TEX.black,
            [3.85, 2.7, 1.16],
            0,
          ),
          addBox(
            hallX1 - 0.071,
            hallX1 - 0.006,
            0.8484,
            0.8604,
            -0.088,
            0.088,
            TEX.black,
            [0.3, 0.2, 0.095],
            0,
          ));
        for (let mi = topStairDoorBulbStart; mi < meshes.length; mi++)
          meshes[mi].annexNormalOnly = !0;
        const topStairDoorGlowStart = meshes.length;
        (addBox(
          hallX1 + 0.03,
          hallX1 + 0.09,
          0.9634,
          1.0234,
          -0.17,
          0.17,
          TEX.black,
          [0.06, 0.045, 0.026],
          0,
        ),
          addBox(
            hallX1 + 0.078,
            hallX1 + 0.152,
            0.8884,
            0.9624,
            -0.058,
            0.058,
            TEX.black,
            [4.3, 0.18, 0.08],
            0,
          ),
          addBox(
            7.613,
            hallX1 + 0.168,
            0.8724,
            0.8824,
            -0.078,
            0.078,
            TEX.black,
            [0.34, 0.05, 0.025],
            0,
          ));
        for (let mi = topStairDoorGlowStart; mi < meshes.length; mi++)
          meshes[mi].annexTopDoorBulb = !0;
        ((self.altAnnexTopDoorBulbWorld = pointLocal(
          hallX1 + 0.115,
          0.9334,
          0,
        )),
          (function (xa, xb, topY0, topY1, botY0) {
            const z0 = -0.38,
              z1 = 0.38,
              dx = (xb - xa) / 18,
              floorDrop = (-1.05 - botY0) / 18,
              wallDim = [0.03, 0.034, 0.038],
              treadDim = [0.042, 0.046, 0.05];
            for (let k = 0; k < 18; k++) {
              const xA = xa + dx * k,
                xB = xa + dx * (k + 1),
                fyA = -1.05 - floorDrop * k,
                fyB = -1.05 - floorDrop * (k + 1),
                cyA = 1.0384 - 0.19777777777777775 * k,
                cyB = 1.0384 - 0.19777777777777775 * (k + 1);
              (addPanel(
                pointLocal(xA, fyB, z0),
                pointLocal(xA, fyB, z1),
                pointLocal(xB, fyB, z1),
                pointLocal(xB, fyB, z0),
                TEX.basementFloor,
                treadDim,
                0.62,
              ),
                addPanel(
                  pointLocal(xB, fyA, z0),
                  pointLocal(xB, fyA, z1),
                  pointLocal(xB, fyB, z1),
                  pointLocal(xB, fyB, z0),
                  TEX.stairWall,
                  wallDim,
                  0.66,
                ),
                addPanel(
                  pointLocal(xA, fyA, z0),
                  pointLocal(xB, fyB, z0),
                  pointLocal(xB, cyB, z0),
                  pointLocal(xA, cyA, z0),
                  TEX.stairWall,
                  wallDim,
                  0.66,
                ),
                addPanel(
                  pointLocal(xB, fyB, z1),
                  pointLocal(xA, fyA, z1),
                  pointLocal(xA, cyA, z1),
                  pointLocal(xB, cyB, z1),
                  TEX.stairWall,
                  wallDim,
                  0.66,
                ),
                addPanel(
                  pointLocal(xA, cyA, z1),
                  pointLocal(xA, cyA, z0),
                  pointLocal(xB, cyB, z0),
                  pointLocal(xB, cyB, z1),
                  TEX.stairWall,
                  wallDim,
                  0.66,
                ));
            }
          })(stairX0 + 0.12, stairX1, 0, 0, annexY0),
          (function (xa, xb, topY0, topY1, botY0, botY1) {
            const z0 = -0.465,
              z1 = 0.465,
              dim = [0.026, 0.03, 0.034];
            (addPanel(
              pointLocal(xa - 0.035, -1.08, z0),
              pointLocal(xb + 0.055, botY0 - 0.03, z0),
              pointLocal(xb + 0.055, botY1 + 0.07, z0),
              pointLocal(xa - 0.035, 1.1084, z0),
              TEX.stairWall,
              dim,
              0.74,
            ),
              addPanel(
                pointLocal(xb + 0.055, botY0 - 0.03, z1),
                pointLocal(xa - 0.035, -1.08, z1),
                pointLocal(xa - 0.035, 1.1084, z1),
                pointLocal(xb + 0.055, botY1 + 0.07, z1),
                TEX.stairWall,
                dim,
                0.74,
              ),
              addPanel(
                pointLocal(xa - 0.035, 1.0934, z1),
                pointLocal(xa - 0.035, 1.0934, z0),
                pointLocal(xb + 0.055, botY1 + 0.055, z0),
                pointLocal(xb + 0.055, botY1 + 0.055, z1),
                TEX.stairWall,
                dim,
                0.62,
              ),
              addPanel(
                pointLocal(xa - 0.035, -1.11, z0),
                pointLocal(xa - 0.035, -1.11, z1),
                pointLocal(xb + 0.055, botY0 - 0.06, z1),
                pointLocal(xb + 0.055, botY0 - 0.06, z0),
                TEX.stairWall,
                dim,
                0.55,
              ));
          })(stairX0 + 0.12, stairX1, 0, 0, annexY0, annexY1));
        const normalAnnexRoomStart = meshes.length;
        addRoom(annexX0, annexX1, annexY0, annexY1, -3.55, 3.55, !0, !0);
        const normalBasementStart = meshes.length;
        {
          const baseStart = meshes.length,
            exitTilesZ = Math.max(4, Math.ceil(7.1 / 1.05)),
            exitTilesY = 1;
          addTiledPanel(
            pointLocal(23.12, annexY0, -3.55),
            pointLocal(23.12, annexY0, 3.55),
            pointLocal(23.12, annexY1, 3.55),
            pointLocal(23.12, annexY1, -3.55),
            TEX.basementWall,
            [0.035, 0.04, 0.045],
            0.58,
            exitTilesZ,
            exitTilesY,
          );
          for (let mi = baseStart; mi < meshes.length; mi++)
            meshes[mi].annexBaseExitWall = !0;
        }
        self.annexExitLightWorld = pointLocal(
          annexX1 - 0.16,
          annexY0 + 0.48 * (annexY1 - annexY0),
          0,
        );
        {
          const q = [];
          pushQuad(
            q,
            pointLocal(23.132, annexY0, -3.55),
            pointLocal(23.132, annexY0, 3.55),
            pointLocal(23.132, annexY1, 3.55),
            pointLocal(23.132, annexY1, -3.55),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          );
          const mesh = self._makeMesh(
            q,
            TEX.basementWallExit,
            [1, 1, 1],
            1,
            !0,
          );
          ((mesh.greenKey = !0),
            (mesh.annexEventExitWall = !0),
            meshes.push(mesh));
        }
        {
          const portalX = annexX1 + 0.026,
            portalHalfW = 2.201,
            portalY0 = annexY0 + 0.05,
            portalY1 = annexY0 + 0.81 * (annexY1 - annexY0),
            q = [];
          pushQuad(
            q,
            pointLocal(portalX, portalY0, -portalHalfW),
            pointLocal(portalX, portalY0, portalHalfW),
            pointLocal(portalX, portalY1, portalHalfW),
            pointLocal(portalX, portalY1, -portalHalfW),
            [0.04, 0.97],
            [0.96, 0.97],
            [0.96, 0.03],
            [0.04, 0.03],
          );
          const mesh = self._makeMesh(q, TEX.black, [1, 1, 1], 1, !1);
          ((mesh.annexCabinPortalWall = !0),
            (mesh.annexNormalOnly = !0),
            (mesh.screenSample = !0),
            meshes.push(mesh));
        }
        {
          const q = [];
          pushQuad(
            q,
            pointLocal(15.39, annexY0, -3.532),
            pointLocal(annexX1 - 0.04, annexY0, -3.532),
            pointLocal(annexX1 - 0.04, annexY1, -3.532),
            pointLocal(15.39, annexY1, -3.532),
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          );
          const mesh = self._makeMesh(q, TEX.crywolf, [1, 1, 1], 1, !1);
          ((mesh.annexCrywolfWall = !0), meshes.push(mesh));
        }
        ((self.annexLightWorld = [
          pointLocal(17.8, annexY1 - 0.14, 1.1 - 3.55),
          pointLocal(annexX0 + 0.78, annexY1 - 0.14, 0),
          pointLocal(hallX1 + 0.115, 0.9334, 0),
        ]),
          (self.annexLightColorWorld = [
            [0.62, 0.72, 0.88],
            [1.3, 0.06, 0.03],
            [1.3, 0.06, 0.03],
          ]),
          addCeilingBulb(17.8, 1.1 - 3.55, 0, annexY1),
          addCeilingBulb(annexX0 + 0.78, 0, 0, annexY1),
          addBulkheadWithOpening(
            annexX0 + 0.01,
            annexY0,
            annexY1,
            3.55,
            annexY0 + 0.08,
            annexY1 - 0.08,
            0.38 + 0.2,
            TEX.basementWall,
          ),
          addCollar(annexX0, annexY0 + 0.06, annexY1 - 0.06, 0.52, 1.04),
          addSpeakerStage(
            16.05,
            annexX0 + 4.35,
            annexY0,
            annexY0 + 1.72,
            -3.05,
          ));
        {
          const crowdBack = TEX.annexCrowdBack || [],
            crowdSide = TEX.annexCrowdSide || [],
            backRows = [
              {
                z: -3.1,
                xs: [
                  0.56, 0.98, 1.42, 1.88, 2.36, 2.84, 3.32, 3.8, 4.28, 4.76,
                  5.24, 5.7, 6.14, 6.52,
                ],
                h: 1.52,
                w: 0.7,
              },
              {
                z: -2.78,
                xs: [
                  0.72, 1.18, 1.66, 2.14, 2.62, 3.1, 3.58, 4.06, 4.54, 5.02,
                  5.5, 5.98, 6.42,
                ],
                h: 1.5,
                w: 0.7,
              },
              {
                z: -2.44,
                xs: [
                  0.5, 0.96, 1.44, 1.92, 2.4, 2.9, 3.38, 3.88, 4.36, 4.84, 5.32,
                  5.8, 6.26,
                ],
                h: 1.47,
                w: 0.68,
              },
              {
                z: -2.1,
                xs: [
                  0.76, 1.22, 1.7, 2.2, 2.7, 3.18, 3.68, 4.16, 4.66, 5.14, 5.62,
                  6.08,
                ],
                h: 1.44,
                w: 0.66,
              },
              {
                z: -1.74,
                xs: [
                  0.58, 1.04, 1.54, 2.04, 2.54, 3.04, 3.54, 4.04, 4.54, 5.04,
                  5.54, 6.04, 6.46,
                ],
                h: 1.4,
                w: 0.62,
              },
              {
                z: -1.38,
                xs: [
                  0.86, 1.34, 1.86, 2.38, 2.9, 3.42, 3.94, 4.46, 4.98, 5.5,
                  6.02,
                ],
                h: 1.36,
                w: 0.6,
              },
              {
                z: -1.02,
                xs: [1.08, 1.62, 2.18, 2.76, 3.34, 3.92, 4.5, 5.08, 5.66, 6.2],
                h: 1.32,
                w: 0.56,
              },
              {
                z: -0.66,
                xs: [1.32, 2.02, 2.72, 3.42, 4.12, 4.82, 5.52, 6.12],
                h: 1.28,
                w: 0.52,
              },
            ];
          for (let r = 0; r < backRows.length; r++) {
            const row = backRows[r];
            for (let k = 0; k < row.xs.length; k++) {
              const n = 11 * r + 7 * k,
                jitterX =
                  ((43758.5453 * Math.sin(12.9898 * n)) % 1) * 0.16 - 0.08,
                jitterZ =
                  ((43758.5453 * Math.sin(78.233 * (n + 4.7))) % 1) * 0.12 -
                  0.06,
                scale =
                  0.92 +
                  ((43758.5453 * Math.sin(37.719 * (n + 9.1))) % 1) * 0.16;
              addAnnexCrowdPlane(
                crowdBack[(5 * r + 3 * k) % Math.max(1, crowdBack.length)],
                annexX0 + row.xs[k] + jitterX,
                row.z + jitterZ,
                row.h * scale,
                row.w * scale,
                "back",
              );
            }
          }
          const sideRows = [
            {
              x: 0.58,
              z: -1.36,
              n: 7,
            },
            {
              x: 0.84,
              z: 1.18,
              n: 6,
            },
            {
              x: 1.16,
              z: -1.18,
              n: 7,
            },
            {
              x: 1.52,
              z: 1.3,
              n: 6,
            },
            {
              x: 1.94,
              z: -1.08,
              n: 7,
            },
            {
              x: 2.38,
              z: 1.36,
              n: 6,
            },
            {
              x: 2.86,
              z: -1.02,
              n: 7,
            },
            {
              x: 3.36,
              z: 1.4,
              n: 6,
            },
            {
              x: 3.9,
              z: -0.96,
              n: 6,
            },
            {
              x: 4.46,
              z: 1.34,
              n: 5,
            },
            {
              x: 5.04,
              z: -1.04,
              n: 5,
            },
            {
              x: 5.62,
              z: 1.22,
              n: 4,
            },
            {
              x: 6.18,
              z: -1.12,
              n: 4,
            },
            {
              x: 6.68,
              z: 1.1,
              n: 3,
            },
          ];
          let si = 0;
          for (let r = 0; r < sideRows.length; r++) {
            const row = sideRows[r];
            for (let k = 0; k < row.n; k++) {
              const n = 200 + 17 * r + 5 * k,
                spread = 0.28 * (k - 0.5 * (row.n - 1)),
                jitterX =
                  ((43758.5453 * Math.sin(19.17 * n)) % 1) * 0.18 - 0.09,
                jitterZ =
                  ((43758.5453 * Math.sin(31.43 * (n + 2.3))) % 1) * 0.16 -
                  0.08,
                scale =
                  0.88 +
                  ((43758.5453 * Math.sin(11.91 * (n + 6.6))) % 1) * 0.18;
              (addAnnexCrowdPlane(
                crowdSide[si % Math.max(1, crowdSide.length)],
                annexX0 + row.x + spread + jitterX,
                row.z + jitterZ,
                1.38 * scale,
                0.43 * scale,
                "side",
              ),
                si++);
            }
          }
        }
        addRaveAftermath(annexX0 + 0.3, 22.55, annexY0, -3.17, 3.17);
        for (let mi = normalBasementStart; mi < meshes.length; mi++)
          meshes[mi].annexNormalOnly = !0;
        for (let mi = normalAnnexRoomStart; mi < meshes.length; mi++)
          meshes[mi].annexNormalOnly = !0;
        if (
          !window.Zone4AltAnnex ||
          "function" != typeof window.Zone4AltAnnex.buildAltAnnexScene
        )
          throw new Error("Zone4AltAnnex.buildAltAnnexScene missing");
        (window.Zone4AltAnnex.buildAltAnnexScene({
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
          annexHalfW: 3.55,
          annexDrop: 3.8,
          stairHalfW: 0.38,
        }),
          markMeshes(interiorStart, "annexInterior"));
      })());
  }));
