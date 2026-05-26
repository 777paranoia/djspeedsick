(function () {
  ((window.Zone4AltAnnex = window.Zone4AltAnnex || {}),
    (window.Zone4AltAnnex.buildAltAnnexScene = function (ctx) {
      with (ctx) {
        const altAnnexSpriteRoomStart = meshes.length,
          altWallTex = TEX.basementAltWall,
          altDoorHallTex = TEX.basementAltWall;
        function markAltFrom(startIndex) {
          for (let mi = startIndex; mi < meshes.length; mi++)
            meshes[mi].annexAltOnly = !0;
        }
        function addAltQuad(a, b, c, d, tex, col, texMix) {
          const q = [];
          pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
          const mesh = self._makeMesh(
            q,
            tex || TEX.black,
            col || [0.006, 0.005, 0.005],
            "number" == typeof texMix ? texMix : 0,
            !1,
          );
          return (
            (mesh.blend = !1),
            (mesh.useTexAlpha = !1),
            (mesh.annexAltOnly = !0),
            meshes.push(mesh),
            mesh
          );
        }
        function addAltBox(x0, x1, y0, y1, z0, z1, col, tex, texMix) {
          const s = meshes.length;
          (addBox(
            x0,
            x1,
            y0,
            y1,
            z0,
            z1,
            tex || TEX.black,
            col || [0.006, 0.005, 0.005],
            "number" == typeof texMix ? texMix : 0,
          ),
            markAltFrom(s));
        }
        function addAltFloor(x0, x1, z0, z1, col) {
          addAltQuad(
            pointLocal(x0, annexY0 + 0.012, z0),
            pointLocal(x1, annexY0 + 0.012, z0),
            pointLocal(x1, annexY0 + 0.012, z1),
            pointLocal(x0, annexY0 + 0.012, z1),
            TEX.basementFloor,
            col || [0.014, 0.012, 0.012],
            0.52,
          );
        }
        function addAltCeil(x0, x1, z0, z1, col) {
          addAltQuad(
            pointLocal(x1, annexY1 - 0.012, z0),
            pointLocal(x0, annexY1 - 0.012, z0),
            pointLocal(x0, annexY1 - 0.012, z1),
            pointLocal(x1, annexY1 - 0.012, z1),
            TEX.basementCeil,
            col || [0.018, 0.016, 0.017],
            0.56,
          );
        }
        function addAltWallZ(x0, x1, z, col) {
          addAltQuad(
            pointLocal(x0, annexY0, z),
            pointLocal(x1, annexY0, z),
            pointLocal(x1, annexY1, z),
            pointLocal(x0, annexY1, z),
            altWallTex,
            col || [0.016, 0.011, 0.012],
            0.96,
          );
        }
        function addAltWallX(x, z0, z1, col) {
          addAltQuad(
            pointLocal(x, annexY0, z1),
            pointLocal(x, annexY0, z0),
            pointLocal(x, annexY1, z0),
            pointLocal(x, annexY1, z1),
            altWallTex,
            col || [0.016, 0.011, 0.012],
            0.96,
          );
        }
        function addDoorHallWallX(x, z0, z1, col) {
          addAltQuad(
            pointLocal(x, annexY0, z1),
            pointLocal(x, annexY0, z0),
            pointLocal(x, annexY1, z0),
            pointLocal(x, annexY1, z1),
            altDoorHallTex,
            col || [0.02, 0.015, 0.014],
            0.98,
          );
        }
        function addDoorHallWallZ(x0, x1, z, col) {
          addAltQuad(
            pointLocal(x0, annexY0, z),
            pointLocal(x1, annexY0, z),
            pointLocal(x1, annexY1, z),
            pointLocal(x0, annexY1, z),
            altDoorHallTex,
            col || [0.02, 0.015, 0.014],
            0.98,
          );
        }
        {
          const altX0 = annexX0,
            altX1 = annexX1,
            roomLen = altX1 - altX0,
            stairOpen = stairHalfW + 0.22,
            pathLeftZ = -0.72,
            pathRightZ = annexHalfW + 0.42,
            alcoveStartX = altX0 + 0.48 * roomLen,
            alcoveEndX = altX1 - 0.24,
            alcoveFrontZ = pathLeftZ,
            alcoveBackZ = -annexHalfW - 4.6,
            occluderZ0 = pathLeftZ,
            occluderZ1 = pathLeftZ,
            occluderX0 = altX0 + 0.34,
            occluderX1 = alcoveStartX;
          (addAltFloor(
            altX0,
            altX1 + 0.28,
            pathLeftZ,
            pathRightZ,
            [0.013, 0.012, 0.012],
          ),
            addAltCeil(
              altX0,
              altX1 + 0.28,
              pathLeftZ,
              pathRightZ,
              [0.017, 0.015, 0.016],
            ),
            addAltWallZ(
              altX0,
              altX1 + 0.28,
              pathRightZ,
              [0.014, 0.011, 0.012],
            ));
          {
            const z4BackWallX = altX1 + 0.24,
              z4BackWallMesh = addAltQuad(
                pointLocal(z4BackWallX, annexY0, pathRightZ),
                pointLocal(z4BackWallX, annexY0, pathLeftZ),
                pointLocal(z4BackWallX, annexY1, pathLeftZ),
                pointLocal(z4BackWallX, annexY1, pathRightZ),
                TEX.basementBackWall,
                [1, 1, 1],
                1,
              );
            ((z4BackWallMesh.blend = !0),
              (z4BackWallMesh.useTexAlpha = !0),
              (z4BackWallMesh.annexAltDoorScene = !0),
              (z4BackWallMesh.annexAltDoorSceneNoDepth = !0));
            const z4GreenU0 = 1562 / 2048,
              z4GreenU1 = 1938 / 2048,
              z4GreenV0 = 338 / 1017,
              z4GreenV1 = 1009 / 1017,
              z4HoleZA = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU0,
              z4HoleZB = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU1,
              z4HoleZ0 = Math.min(z4HoleZA, z4HoleZB),
              z4HoleZ1 = Math.max(z4HoleZA, z4HoleZB),
              z4HoleYA = annexY1 + (annexY0 - annexY1) * z4GreenV0,
              z4HoleYB = annexY1 + (annexY0 - annexY1) * z4GreenV1,
              z4HoleY0 = Math.min(z4HoleYA, z4HoleYB),
              z4HoleY1 = Math.max(z4HoleYA, z4HoleYB),
              z4BathroomX = z4BackWallX + 0.055,
              z4DoorStopT = 0.86,
              z4DoorStopS = z4DoorStopT * z4DoorStopT * (3 - 2 * z4DoorStopT),
              z4DoorStopEyeX =
                annexX0 + (annexX1 - 0.07 - annexX0) * z4DoorStopS,
              z4DoorStopEyeY = -0.02 - annexDrop,
              z4PerspectiveScale = Math.max(
                1,
                (z4BathroomX - z4DoorStopEyeX) /
                  Math.max(0.001, z4BackWallX - z4DoorStopEyeX),
              ),
              z4SetbackScale = 1 + 0.42 * (z4PerspectiveScale - 1),
              z4Overscan = 1.01,
              z4HoleZC = 0.5 * (z4HoleZ0 + z4HoleZ1);
            let z4PlateY0 =
                z4DoorStopEyeY + (z4HoleY0 - z4DoorStopEyeY) * z4SetbackScale,
              z4PlateY1 =
                z4DoorStopEyeY + (z4HoleY1 - z4DoorStopEyeY) * z4SetbackScale;
            const z4PlateLift = 0.18 * (z4PlateY1 - z4PlateY0);
            ((z4PlateY0 += z4PlateLift),
              (z4PlateY1 += z4PlateLift),
              (z4PlateY0 -= 0.34 * (z4PlateY1 - z4PlateY0)));
            const z4PlateZ0 =
                z4HoleZC + (z4HoleZ0 - z4HoleZC) * z4SetbackScale * z4Overscan,
              z4PlateZ1 =
                z4HoleZC + (z4HoleZ1 - z4HoleZC) * z4SetbackScale * z4Overscan,
              z4BathroomVTop = 0.1,
              z4BathroomVBottom = 1;
            function addBathroomRoomQuad(
              a,
              b,
              c,
              d,
              tex,
              col,
              texMix,
              uv0,
              uv1,
              uv2,
              uv3,
            ) {
              const q = [];
              pushQuad(
                q,
                a,
                b,
                c,
                d,
                uv0 || [0, 1],
                uv1 || [1, 1],
                uv2 || [1, 0],
                uv3 || [0, 0],
              );
              const mesh = self._makeMesh(
                q,
                tex || TEX.black,
                col || [1, 1, 1],
                "number" == typeof texMix ? texMix : 1,
                !1,
              );
              return ((mesh.annexAltOnly = !0), meshes.push(mesh), mesh);
            }
            const z4BathroomMesh = addBathroomRoomQuad(
              pointLocal(z4BathroomX, z4PlateY0, z4PlateZ1),
              pointLocal(z4BathroomX, z4PlateY0, z4PlateZ0),
              pointLocal(z4BathroomX, z4PlateY1, z4PlateZ0),
              pointLocal(z4BathroomX, z4PlateY1, z4PlateZ1),
              TEX.basementBathroomClub,
              [1, 1, 1],
              1,
              [1, z4BathroomVBottom],
              [0, z4BathroomVBottom],
              [0, z4BathroomVTop],
              [1, z4BathroomVTop],
            );
            ((z4BathroomMesh.backWallBathroomClub = !0),
              (z4BathroomMesh.annexAltDoorScene = !0),
              (z4BathroomMesh.annexAltDoorSceneNoDepth = !0),
              (z4BathroomMesh.blend = !0));
          }
          (addDoorHallWallX(
            altX0 + 0.01,
            pathLeftZ,
            -stairOpen,
            [0.02, 0.015, 0.014],
          ),
            addDoorHallWallX(
              altX0 + 0.01,
              stairOpen,
              pathRightZ,
              [0.02, 0.015, 0.014],
            ),
            addAltBox(
              altX0 - 0.12,
              altX0 + 0.32,
              annexY0,
              annexY1,
              -stairOpen - 0.1,
              0.02 - stairOpen,
              [0.02, 0.015, 0.014],
              altDoorHallTex,
              0.98,
            ),
            addAltBox(
              altX0 - 0.12,
              altX0 + 0.32,
              annexY0,
              annexY1,
              stairOpen - 0.02,
              stairOpen + 0.1,
              [0.02, 0.015, 0.014],
              altDoorHallTex,
              0.98,
            ),
            addDoorHallWallZ(
              altX0 - 0.04,
              altX0 + 0.34,
              -stairOpen - 0.1,
              [0.02, 0.015, 0.014],
            ),
            addDoorHallWallZ(
              altX0 - 0.04,
              altX0 + 0.34,
              stairOpen + 0.1,
              [0.02, 0.015, 0.014],
            ),
            addAltBox(
              altX0 - 0.18,
              altX0 + 0.62,
              annexY0,
              annexY1,
              -stairOpen - 0.055,
              0.045 - stairHalfW,
              [0.021, 0.016, 0.015],
              altDoorHallTex,
              0.98,
            ),
            addAltBox(
              altX0 - 0.18,
              altX0 + 0.62,
              annexY0,
              annexY1,
              stairHalfW - 0.045,
              stairOpen + 0.055,
              [0.021, 0.016, 0.015],
              altDoorHallTex,
              0.98,
            ),
            addAltBox(
              altX0 - 0.18,
              altX0 + 0.62,
              annexY1 - 0.245,
              annexY1 + 0.025,
              -stairOpen - 0.07,
              stairOpen + 0.07,
              [0.02, 0.015, 0.014],
              altDoorHallTex,
              0.98,
            ),
            addAltBox(
              altX0 + 0.3,
              altX0 + 0.7,
              annexY0,
              annexY1,
              -stairHalfW - 0.05,
              0.035 - stairHalfW,
              [0.018, 0.014, 0.013],
              altDoorHallTex,
              0.98,
            ),
            addAltBox(
              altX0 + 0.3,
              altX0 + 0.7,
              annexY0,
              annexY1,
              stairHalfW - 0.035,
              stairHalfW + 0.05,
              [0.018, 0.014, 0.013],
              altDoorHallTex,
              0.98,
            ));
          const bulbY = annexY1 - 0.185,
            bulbStart = meshes.length;
          (addAltBox(
            altX0 + 0.035,
            altX0 + 0.095,
            bulbY + 0.035,
            bulbY + 0.085,
            -0.155,
            0.155,
            [0.03, 0.022, 0.014],
            TEX.black,
            0,
          ),
            addAltBox(
              altX0 + 0.085,
              altX0 + 0.165,
              bulbY - 0.025,
              bulbY + 0.045,
              -0.06,
              0.06,
              [4.1, 0.16, 0.07],
              TEX.black,
              0,
            ));
          for (let mi = bulbStart; mi < meshes.length; mi++)
            meshes[mi].annexAltDoorBulb = !0;
          (addAltWallZ(occluderX0, occluderX1, pathLeftZ, [0.026, 0.023, 0.02]),
            addAltBox(
              occluderX0 - 0.045,
              occluderX1 + 0.045,
              annexY0,
              annexY1,
              pathLeftZ - 0.07,
              pathLeftZ + 0.07,
              [0.026, 0.023, 0.02],
              altWallTex,
              0.98,
            ),
            addAltFloor(
              alcoveStartX,
              alcoveEndX,
              alcoveBackZ,
              alcoveFrontZ,
              [0.011, 0.009, 0.009],
            ),
            addAltCeil(
              alcoveStartX,
              alcoveEndX,
              alcoveBackZ,
              alcoveFrontZ,
              [0.016, 0.012, 0.013],
            ),
            addAltWallZ(
              alcoveStartX,
              alcoveEndX,
              alcoveBackZ,
              [0.032, 0.008, 0.01],
            ));
          const stageRedStart = meshes.length;
          (addAltBox(
            alcoveStartX + 0.42,
            alcoveEndX - 0.42,
            annexY1 - 0.19,
            annexY1 - 0.11,
            alcoveBackZ + 0.145,
            alcoveBackZ + 0.285,
            [2.15, 0.04, 0.02],
            TEX.black,
            0,
          ),
            addAltBox(
              alcoveStartX + 0.7,
              alcoveEndX - 0.7,
              annexY1 - 0.34,
              annexY1 - 0.285,
              alcoveBackZ + 0.32,
              alcoveBackZ + 0.43,
              [0.92, 0.026, 0.014],
              TEX.black,
              0,
            ),
            addAltQuad(
              pointLocal(
                alcoveStartX + 0.18,
                annexY0 + 0.019,
                alcoveBackZ + 0.38,
              ),
              pointLocal(
                alcoveEndX - 0.18,
                annexY0 + 0.019,
                alcoveBackZ + 0.38,
              ),
              pointLocal(
                alcoveEndX - 0.34,
                annexY0 + 0.019,
                alcoveFrontZ - 0.02,
              ),
              pointLocal(
                alcoveStartX + 0.34,
                annexY0 + 0.019,
                alcoveFrontZ - 0.02,
              ),
              TEX.black,
              [0.135, 0.007, 0.004],
              0,
            ),
            addAltQuad(
              pointLocal(alcoveEndX - 0.2, annexY1 - 0.028, alcoveBackZ + 0.3),
              pointLocal(
                alcoveStartX + 0.2,
                annexY1 - 0.028,
                alcoveBackZ + 0.3,
              ),
              pointLocal(
                alcoveStartX + 0.54,
                annexY1 - 0.028,
                alcoveFrontZ - 0.08,
              ),
              pointLocal(
                alcoveEndX - 0.54,
                annexY1 - 0.028,
                alcoveFrontZ - 0.08,
              ),
              TEX.black,
              [0.095, 0.005, 0.003],
              0,
            ));
          for (let mi = stageRedStart; mi < meshes.length; mi++)
            meshes[mi].annexAltStageRedGlow = !0;
          function altCrowdHash(n) {
            return Math.abs(43758.5453 * Math.sin(127.13 * n + 19.71)) % 1;
          }
          function makeAltCrowdTexture(img) {
            const tex = gl.createTexture();
            return (
              gl.bindTexture(gl.TEXTURE_2D, tex),
              gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0),
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img,
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
              ),
              tex
            );
          }
          function addAltCrowdMesh(data, tex, col, texMix, blend, useAlpha) {
            if (!data || data.length < 24) return null;
            const mesh = self._makeMesh(
              data,
              tex || TEX.black,
              col || [1, 1, 1],
              "number" == typeof texMix ? texMix : 1,
              !!blend,
            );
            return (
              (mesh.annexAltOnly = !0),
              (mesh.annexInterior = !0),
              (mesh.annexAltCrowdVisual = !0),
              (mesh.annexAltCrowd = !0),
              (mesh.useTexAlpha = !!useAlpha),
              meshes.push(mesh),
              mesh
            );
          }
          function addAltCrowdShadow(cx, cz, sx, sz, yaw, rowFade) {
            const c = Math.cos(yaw),
              s = Math.sin(yaw);
            function rp(dx, dz) {
              return pointLocal(
                cx + dx * c - dz * s,
                annexY0 + 0.02,
                cz + dx * s + dz * c,
              );
            }
            addAltQuad(
              rp(-sx, -sz),
              rp(sx, -sz),
              rp(sx, sz),
              rp(-sx, sz),
              TEX.black,
              [0.028 * rowFade, 0.004, 0.003],
              0,
            );
          }
          function addAltExtrudedCrowdPerson(
            img,
            tex,
            cx,
            cz,
            sc,
            yaw,
            seed,
            rowFade,
          ) {
            const cnv = document.createElement("canvas");
            ((cnv.width = 84), (cnv.height = 212));
            const ctx = cnv.getContext("2d", {
              willReadFrequently: !0,
            });
            (ctx.clearRect(0, 0, 84, 212), ctx.drawImage(img, 0, 0, 84, 212));
            const pix = ctx.getImageData(0, 0, 84, 212).data,
              personH = sc * (1.54 + 0.18 * altCrowdHash(seed + 2)),
              personW = sc * (0.52 + 0.12 * altCrowdHash(seed + 4)),
              bodyDepth = sc * (0.05 + 0.018 * altCrowdHash(seed + 6)),
              bevel = 0.58 * bodyDepth,
              yBase = annexY0 + 0.018,
              c = Math.cos(yaw),
              s = Math.sin(yaw),
              face = [],
              shell = [],
              slices = [];
            function pLocal(px, py, pz) {
              const dx = px - cx,
                dz = pz - cz;
              return pointLocal(cx + dx * c - dz * s, py, cz + dx * s + dz * c);
            }
            function alphaAt(x, y) {
              return (
                (x = Math.max(0, Math.min(83, 0 | x))),
                (y = Math.max(0, Math.min(211, 0 | y))),
                pix[4 * (84 * y + x) + 3]
              );
            }
            const left = new Array(76),
              right = new Array(76);
            for (let b = 0; b < 76; b++) {
              const yImg0 = Math.floor(((75 - b) / 76) * 212),
                yImg1 = Math.floor(((76 - b) / 76) * 212);
              let minX = 84,
                maxX = -1;
              for (let yy = yImg0; yy < yImg1; yy++)
                for (let xx = 0; xx < 84; xx++)
                  alphaAt(xx, yy) > 22 &&
                    (xx < minX && (minX = xx), xx > maxX && (maxX = xx));
              maxX > minX
                ? ((left[b] = Math.max(0, minX - 1)),
                  (right[b] = Math.min(83, maxX + 1)))
                : ((left[b] = null), (right[b] = null));
            }
            for (let pass = 0; pass < 3; pass++) {
              const nl = left.slice(),
                nr = right.slice();
              for (let b = 0; b < 76; b++) {
                if (null === left[b] || null === right[b]) continue;
                let sl = 0.48 * left[b],
                  sr = 0.48 * right[b],
                  wl = 0.48,
                  wr = 0.48;
                for (let o = -3; o <= 3; o++) {
                  if (0 === o) continue;
                  const bi = b + o;
                  if (bi < 0 || bi >= 76) continue;
                  if (null === left[bi] || null === right[bi]) continue;
                  const ao = Math.abs(o),
                    w = 1 === ao ? 0.24 : 2 === ao ? 0.07 : 0.018;
                  ((sl += left[bi] * w),
                    (sr += right[bi] * w),
                    (wl += w),
                    (wr += w));
                }
                ((nl[b] = sl / wl), (nr[b] = sr / wr));
              }
              for (let b = 0; b < 76; b++)
                ((left[b] = nl[b]), (right[b] = nr[b]));
            }
            let firstBand = -1;
            function roundedSidePoint(side, t, xF, xB, zEdge) {
              const x = xF + (xB - xF) * t,
                inward = (1 - Math.sin(Math.PI * t)) * bevel;
              return [x, side < 0 ? zEdge + inward : zEdge - inward];
            }
            for (let b = 0; b < 76; b++) {
              if (null === left[b] || null === right[b]) continue;
              const v0 = b / 76,
                v1 = (b + 1) / 76,
                y0 = yBase + personH * v0,
                y1 = yBase + personH * v1,
                uL = left[b] / 83,
                uR = right[b] / 83,
                zL = cz + (uL - 0.5) * personW,
                zR = cz + (uR - 0.5) * personW,
                xF = cx - 0.5 * bodyDepth,
                xB = cx + 0.5 * bodyDepth;
              for (let j = 0; j < 8; j++) {
                const t = j / 7,
                  x = xF + (xB - xF) * t,
                  inward = (1 - Math.sin(Math.PI * t)) * bevel,
                  zLS = zL + inward,
                  zRS = zR - inward;
                pushQuad(
                  0 === j || 7 === j ? face : slices,
                  pLocal(x, y0, zLS),
                  pLocal(x, y0, zRS),
                  pLocal(x, y1, zRS),
                  pLocal(x, y1, zLS),
                  [uL, 1 - v0],
                  [uR, 1 - v0],
                  [uR, 1 - v1],
                  [uL, 1 - v1],
                );
              }
              for (let j = 0; j < 0; j++) {
                const t0 = j / 0,
                  t1 = (j + 1) / 0;
                let a = roundedSidePoint(-1, t0, xF, xB, zL),
                  d = roundedSidePoint(-1, t1, xF, xB, zL);
                (pushQuad(
                  shell,
                  pLocal(a[0], y0, a[1]),
                  pLocal(d[0], y0, d[1]),
                  pLocal(d[0], y1, d[1]),
                  pLocal(a[0], y1, a[1]),
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ),
                  (a = roundedSidePoint(1, t0, xF, xB, zR)),
                  (d = roundedSidePoint(1, t1, xF, xB, zR)),
                  pushQuad(
                    shell,
                    pLocal(d[0], y0, d[1]),
                    pLocal(a[0], y0, a[1]),
                    pLocal(a[0], y1, a[1]),
                    pLocal(d[0], y1, d[1]),
                    [0, 1],
                    [1, 1],
                    [1, 0],
                    [0, 0],
                  ));
              }
              firstBand < 0 && (firstBand = b);
            }
            if (firstBand >= 0) {
              addAltCrowdShadow(
                cx,
                cz,
                1.55 * bodyDepth,
                0.4 * personW,
                yaw,
                rowFade,
              );
              const tint = [
                0.36 + 0.12 * altCrowdHash(seed + 11),
                0.24 + 0.08 * altCrowdHash(seed + 12),
                0.22 + 0.07 * altCrowdHash(seed + 13),
              ];
              (addAltCrowdMesh(
                slices,
                tex,
                [
                  0.18 + 0.05 * altCrowdHash(seed + 21),
                  0.08 + 0.03 * altCrowdHash(seed + 22),
                  0.07 + 0.025 * altCrowdHash(seed + 23),
                ],
                1,
                !0,
                !0,
              ),
                addAltCrowdMesh(face, tex, tint, 1, !0, !0));
            }
          }
          function makeAltFogGradientTexture(r, g, b, a) {
            const cnv = document.createElement("canvas");
            ((cnv.width = 128), (cnv.height = 128));
            const ctx = cnv.getContext("2d"),
              grd = ctx.createRadialGradient(64, 64, 5.12, 64, 64, 64);
            (grd.addColorStop(
              0,
              "rgba(" + r + "," + g + "," + b + "," + a / 255 + ")",
            ),
              grd.addColorStop(
                0.28,
                "rgba(" + r + "," + g + "," + b + "," + (0.78 * a) / 255 + ")",
              ),
              grd.addColorStop(
                0.62,
                "rgba(" + r + "," + g + "," + b + "," + (0.28 * a) / 255 + ")",
              ),
              grd.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)"),
              (ctx.fillStyle = grd),
              ctx.fillRect(0, 0, 128, 128));
            const tex = gl.createTexture();
            return (
              gl.bindTexture(gl.TEXTURE_2D, tex),
              gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0),
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                cnv,
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
              ),
              tex
            );
          }
          function addAltDynamicFogWisp(
            cx,
            cz,
            cy,
            w,
            h,
            ang,
            phase,
            speed,
            tex,
            col,
            alphaBase,
          ) {
            const q0 = [];
            pushQuad(
              q0,
              pointLocal(cx - 0.5 * w, cy - 0.5 * h, cz),
              pointLocal(cx + 0.5 * w, cy - 0.5 * h, cz),
              pointLocal(cx + 0.5 * w, cy + 0.5 * h, cz),
              pointLocal(cx - 0.5 * w, cy + 0.5 * h, cz),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const mesh = self._makeMesh(q0, tex, col, 0, !0);
            return (
              (mesh.annexAltOnly = !0),
              (mesh.annexInterior = !0),
              (mesh.annexAltFog = !0),
              (mesh.annexAltFogWisp = !0),
              (mesh.altAnnexFogMachine = !0),
              (mesh.useTexAlpha = !0),
              (mesh.blend = !0),
              (mesh.altFogUpdater = function (now) {
                const t = 0.001 * now,
                  breathe = 0.5 + 0.5 * Math.sin(t * speed + phase),
                  driftA = Math.sin(t * (0.43 * speed) + 1.73 * phase),
                  driftB = Math.cos(t * (0.31 * speed) + 2.19 * phase),
                  strobe = Math.min(1, self._altAnnexWhiteStrobe || 0),
                  px = cx + 0.2 * driftA + 0.08 * Math.sin(0.13 * t + phase),
                  pz =
                    cz +
                    0.18 * driftB +
                    0.08 * Math.cos(0.11 * t + 0.7 * phase),
                  py = cy + 0.055 * Math.sin(0.19 * t + 1.2 * phase),
                  ww = w * (0.84 + 0.34 * breathe + 0.16 * strobe),
                  hh = h * (0.78 + 0.42 * breathe + 0.12 * strobe),
                  aa = ang + 0.18 * Math.sin(0.17 * t + phase),
                  hx = Math.cos(aa) * ww * 0.5,
                  hz = Math.sin(aa) * ww * 0.5,
                  y0 = py - 0.5 * hh,
                  y1 = py + 0.5 * hh,
                  q = [];
                pushQuad(
                  q,
                  pointLocal(px - hx, y0, pz - hz),
                  pointLocal(px + hx, y0, pz + hz),
                  pointLocal(px + hx, y1, pz + hz),
                  pointLocal(px - hx, y1, pz - hz),
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                );
                const a = alphaBase * (0.48 + 0.42 * breathe) + 0.42 * strobe;
                ((mesh.flatCol = [
                  col[0] * a + 0.38 * strobe,
                  col[1] * a + 0.34 * strobe,
                  col[2] * a + 0.28 * strobe,
                ]),
                  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf),
                  gl.bufferData(
                    gl.ARRAY_BUFFER,
                    new Float32Array(q),
                    gl.DYNAMIC_DRAW,
                  ),
                  (mesh.count = q.length / 8));
              }),
              meshes.push(mesh),
              mesh
            );
          }
          ((self.altAnnexStageRedLightWorld = pointLocal(
            alcoveStartX + 0.5 * (alcoveEndX - alcoveStartX),
            annexY1 - 0.22,
            alcoveBackZ + 0.38,
          )),
            (self.altAnnexStageWhiteLightWorld = pointLocal(
              alcoveStartX + 0.5 * (alcoveEndX - alcoveStartX),
              annexY1 - 0.42,
              alcoveBackZ + 0.94,
            )),
            TEX.altFogRed ||
              (TEX.altFogRed = makeAltFogGradientTexture(255, 54, 38, 120)),
            TEX.altFogSmoke ||
              (TEX.altFogSmoke = makeAltFogGradientTexture(230, 218, 205, 110)),
            TEX.altFogWhite ||
              (TEX.altFogWhite = makeAltFogGradientTexture(
                255,
                250,
                232,
                130,
              )));
          const altAnnexFogStart = meshes.length;
          for (let fi = 0; fi < 34; fi++) {
            const seed = 700 + 17 * fi,
              u = altCrowdHash(seed + 1),
              v = altCrowdHash(seed + 2),
              nearPathBias = Math.pow(altCrowdHash(seed + 3), 1.75),
              fx = alcoveStartX + 0.22 + (alcoveEndX - alcoveStartX - 0.44) * u,
              fz =
                alcoveFrontZ -
                0.1 +
                (alcoveBackZ + 0.46 - (alcoveFrontZ - 0.1)) * nearPathBias,
              fy = annexY0 + 0.18 + v * (annexY1 - annexY0) * 0.58,
              fw = 0.72 + 1.35 * altCrowdHash(seed + 4),
              fh = 0.22 + 0.58 * altCrowdHash(seed + 5),
              fa = 1.1 * altCrowdHash(seed + 6) - 0.55,
              fs = 0.42 + 0.68 * altCrowdHash(seed + 7),
              tex =
                fi % 5 == 0
                  ? TEX.altFogWhite
                  : fi % 3 == 0
                    ? TEX.altFogSmoke
                    : TEX.altFogRed,
              col =
                fi % 5 == 0
                  ? [1.15, 0.92, 0.72]
                  : fi % 3 == 0
                    ? [0.82, 0.48, 0.36]
                    : [1.55, 0.11, 0.055],
              alpha = fi % 5 == 0 ? 0.72 : fi % 3 == 0 ? 0.62 : 0.74;
            addAltDynamicFogWisp(
              fx,
              fz,
              fy,
              fw,
              fh,
              fa,
              0.01 * seed,
              fs,
              tex,
              col,
              alpha,
            );
          }
          for (let mi = altAnnexFogStart; mi < meshes.length; mi++)
            meshes[mi].dynamicFogWisp = !0;
          function altAnnexFxHash(x) {
            return (43758.5453123 * Math.sin(127.1 * x + 31.7)) % 1;
          }
          function altAnnexFxHash01(x) {
            const v = altAnnexFxHash(x);
            return v < 0 ? v + 1 : v;
          }
          function makeAltWorldFogTexture(r, g, b, a) {
            const cnv = document.createElement("canvas");
            ((cnv.width = 128), (cnv.height = 128));
            const ctx = cnv.getContext("2d"),
              grd = ctx.createRadialGradient(64, 64, 3.84, 64, 64, 66.56);
            (grd.addColorStop(
              0,
              "rgba(" + r + "," + g + "," + b + "," + a / 255 + ")",
            ),
              grd.addColorStop(
                0.26,
                "rgba(" + r + "," + g + "," + b + "," + (0.72 * a) / 255 + ")",
              ),
              grd.addColorStop(
                0.6,
                "rgba(" + r + "," + g + "," + b + "," + (0.28 * a) / 255 + ")",
              ),
              grd.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)"),
              (ctx.fillStyle = grd),
              ctx.fillRect(0, 0, 128, 128));
            const tex = gl.createTexture();
            return (
              gl.bindTexture(gl.TEXTURE_2D, tex),
              gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0),
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                cnv,
              ),
              gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1),
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
              ),
              tex
            );
          }
          function addAltWorldFogWisp(
            cx,
            cz,
            cy,
            w,
            h,
            yaw,
            phase,
            speed,
            tex,
            col,
            alphaBase,
          ) {
            const q0 = [];
            pushQuad(
              q0,
              pointLocal(cx - 0.5 * w, cy - 0.5 * h, cz),
              pointLocal(cx + 0.5 * w, cy - 0.5 * h, cz),
              pointLocal(cx + 0.5 * w, cy + 0.5 * h, cz),
              pointLocal(cx - 0.5 * w, cy + 0.5 * h, cz),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const mesh = self._makeMesh(q0, tex, col, 0, !0);
            ((mesh.annexAltOnly = !0),
              (mesh.annexInterior = !0),
              (mesh.annexAltFog = !0),
              (mesh.annexAltCrowdVisual = !0),
              (mesh.dynamicFogWisp = !0),
              (mesh.altAnnexFogMachine = !0),
              (mesh.useTexAlpha = !0),
              (mesh.blend = !0),
              (mesh.altFogUpdater = function (now) {
                const t = 0.001 * now,
                  breathe = 0.5 + 0.5 * Math.sin(t * speed + phase),
                  driftA = Math.sin(t * (0.38 * speed) + 1.73 * phase),
                  driftB = Math.cos(t * (0.27 * speed) + 2.19 * phase),
                  px = cx + 0.18 * driftA + 0.06 * Math.sin(0.11 * t + phase),
                  pz =
                    cz +
                    0.14 * driftB +
                    0.05 * Math.cos(0.09 * t + 0.7 * phase),
                  py = cy + 0.045 * Math.sin(0.15 * t + 1.2 * phase),
                  ww = w * (0.82 + 0.36 * breathe),
                  hh = h * (0.78 + 0.42 * breathe),
                  aa = yaw + 0.2 * Math.sin(0.14 * t + phase),
                  hx = Math.cos(aa) * ww * 0.5,
                  hz = Math.sin(aa) * ww * 0.5,
                  q = [];
                pushQuad(
                  q,
                  pointLocal(px - hx, py - 0.5 * hh, pz - hz),
                  pointLocal(px + hx, py - 0.5 * hh, pz + hz),
                  pointLocal(px + hx, py + 0.5 * hh, pz + hz),
                  pointLocal(px - hx, py + 0.5 * hh, pz - hz),
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                );
                const a = alphaBase * (0.52 + 0.48 * breathe),
                  st = Math.min(1, self._altAnnexWhiteStrobe || 0);
                ((mesh.flatCol = [
                  col[0] * a + 0.4 * st,
                  col[1] * a + 0.34 * st,
                  col[2] * a + 0.28 * st,
                ]),
                  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf),
                  gl.bufferData(
                    gl.ARRAY_BUFFER,
                    new Float32Array(q),
                    gl.DYNAMIC_DRAW,
                  ),
                  (mesh.count = q.length / 8));
              }),
              meshes.push(mesh));
          }
          function addAltWorldStrobeBeam(
            x0,
            x1,
            y0,
            y1,
            z0,
            z1,
            phase,
            strength,
          ) {
            const q = [];
            pushQuad(
              q,
              pointLocal(x0, y1, z0),
              pointLocal(x1, y1, z0),
              pointLocal(x1, y0, z1),
              pointLocal(x0, y0, z1),
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            );
            const mesh = self._makeMesh(
              q,
              TEX.altWorldStrobe,
              [0, 0, 0],
              0,
              !0,
            );
            ((mesh.annexAltOnly = !0),
              (mesh.annexInterior = !0),
              (mesh.annexAltStrobeBeam = !0),
              (mesh.annexAltCrowdVisual = !0),
              (mesh.useTexAlpha = !0),
              (mesh.blend = !0),
              (mesh.altFogUpdater = function (now) {
                const flick =
                  Math.min(1, self._altAnnexWhiteStrobe || 0) *
                  strength *
                  (0.78 + 0.22 * Math.sin(0.033 * now + phase));
                mesh.flatCol = [2.25 * flick, 2.05 * flick, 1.62 * flick];
              }),
              meshes.push(mesh));
          }
          (TEX.altWorldFogRed ||
            (TEX.altWorldFogRed = makeAltWorldFogTexture(255, 48, 32, 135)),
            TEX.altWorldFogSmoke ||
              (TEX.altWorldFogSmoke = makeAltWorldFogTexture(
                235,
                222,
                208,
                125,
              )),
            TEX.altWorldStrobe ||
              (TEX.altWorldStrobe = makeAltWorldFogTexture(
                255,
                248,
                224,
                150,
              )));
          const altWorldFxStart = meshes.length;
          for (let fi = 0; fi < 42; fi++) {
            const seed = 900 + 19 * fi,
              u = altAnnexFxHash01(seed + 1),
              v = altAnnexFxHash01(seed + 2),
              d = Math.pow(altAnnexFxHash01(seed + 3), 1.35),
              fx = alcoveStartX + 0.18 + (alcoveEndX - alcoveStartX - 0.36) * u,
              fz =
                alcoveFrontZ -
                0.22 +
                (alcoveBackZ + 0.42 - (alcoveFrontZ - 0.22)) * d,
              fy = annexY0 + 0.48 + v * (annexY1 - annexY0) * 0.48,
              fw = 0.58 + 1.48 * altAnnexFxHash01(seed + 4),
              fh = 0.2 + 0.62 * altAnnexFxHash01(seed + 5),
              fa = 1.24 * altAnnexFxHash01(seed + 6) - 0.62,
              fs = 0.32 + 0.62 * altAnnexFxHash01(seed + 7),
              tex = fi % 4 == 0 ? TEX.altWorldFogSmoke : TEX.altWorldFogRed,
              col = fi % 4 == 0 ? [1.05, 0.7, 0.54] : [1.65, 0.12, 0.06],
              alpha = fi % 4 == 0 ? 0.76 : 0.82;
            addAltWorldFogWisp(
              fx,
              fz,
              fy,
              fw,
              fh,
              fa,
              0.01 * seed,
              fs,
              tex,
              col,
              alpha,
            );
          }
          (addAltWorldStrobeBeam(
            alcoveStartX + 0.3,
            alcoveEndX - 0.3,
            annexY0 + 0.22,
            annexY1 - 0.34,
            alcoveBackZ + 0.56,
            alcoveFrontZ - 0.55,
            1.4,
            1,
          ),
            addAltWorldStrobeBeam(
              alcoveStartX + 0.55,
              alcoveEndX - 0.55,
              annexY0 + 0.55,
              annexY1 - 0.18,
              alcoveBackZ + 0.36,
              alcoveBackZ + 1.55,
              2.8,
              0.72,
            ));
          for (let mi = altWorldFxStart; mi < meshes.length; mi++)
            meshes[mi].worldLockedAlcoveFX = !0;
          function addAltBouncingFoldingTable() {
            function tableState(now) {
              const t = 0.001 * now,
                cx0 = alcoveStartX + 0.54 * (alcoveEndX - alcoveStartX),
                sx = Math.max(0.12, 0.22 * (alcoveEndX - alcoveStartX)),
                zFront = alcoveFrontZ - 0.24,
                zBack = alcoveBackZ + 0.92,
                zWave = 0.5 + 0.5 * Math.sin(0.48 * t + 1.4),
                hop = Math.pow(Math.abs(Math.sin(2.7 * t + 0.35)), 0.72);
              return {
                x:
                  cx0 + Math.sin(0.62 * t + 0.6) * sx + 0.1 * Math.sin(1.9 * t),
                y: annexY0 + 1.34 + 0.66 * hop + 0.1 * Math.sin(1.85 * t),
                z:
                  zBack * zWave +
                  zFront * (1 - zWave) +
                  0.12 * Math.sin(1.28 * t + 2.4),
                yaw: 0.62 * Math.sin(1.1 * t) + 0.18 * t,
                wobble: 0.055 * Math.sin(5.1 * t),
              };
            }
            function pLocalBox(st, lx, ly, lz) {
              const ca = Math.cos(st.yaw),
                sa = Math.sin(st.yaw),
                yy = ly + Math.sin(2.2 * lx + 1.7 * lz) * st.wobble;
              return pointLocal(
                st.x + lx * ca - lz * sa,
                st.y + yy,
                st.z + lx * sa + lz * ca,
              );
            }
            function pushBox(q, st, cx, cy, cz, sx, sy, sz) {
              const hx = 0.5 * sx,
                hy = 0.5 * sy,
                hz = 0.5 * sz,
                p000 = pLocalBox(st, cx - hx, cy - hy, cz - hz),
                p100 = pLocalBox(st, cx + hx, cy - hy, cz - hz),
                p110 = pLocalBox(st, cx + hx, cy + hy, cz - hz),
                p010 = pLocalBox(st, cx - hx, cy + hy, cz - hz),
                p001 = pLocalBox(st, cx - hx, cy - hy, cz + hz),
                p101 = pLocalBox(st, cx + hx, cy - hy, cz + hz),
                p111 = pLocalBox(st, cx + hx, cy + hy, cz + hz),
                p011 = pLocalBox(st, cx - hx, cy + hy, cz + hz);
              (pushQuad(
                q,
                p000,
                p100,
                p110,
                p010,
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ),
                pushQuad(
                  q,
                  p101,
                  p001,
                  p011,
                  p111,
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ),
                pushQuad(
                  q,
                  p010,
                  p110,
                  p111,
                  p011,
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ),
                pushQuad(
                  q,
                  p001,
                  p101,
                  p100,
                  p000,
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ),
                pushQuad(
                  q,
                  p001,
                  p000,
                  p010,
                  p011,
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ),
                pushQuad(
                  q,
                  p100,
                  p101,
                  p111,
                  p110,
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ));
            }
            function buildTableTop(now) {
              const st = tableState(now),
                q = [];
              return (
                pushBox(q, st, 0, 0, 0, 1.04, 0.06, 0.52),
                pushBox(q, st, 0, -0.055, 0, 0.88, 0.024, 0.4),
                q
              );
            }
            function buildTableLegs(now) {
              const st = tableState(now),
                q = [];
              return (
                pushBox(q, st, 0, -0.105, -0.17, 0.82, 0.032, 0.035),
                pushBox(q, st, 0, -0.105, 0.17, 0.82, 0.032, 0.035),
                pushBox(q, st, -0.36, -0.118, 0, 0.035, 0.028, 0.36),
                pushBox(q, st, 0.36, -0.118, 0, 0.035, 0.028, 0.36),
                pushBox(q, st, -0.22, -0.142, 0, 0.46, 0.022, 0.026),
                pushBox(q, st, 0.22, -0.142, 0, 0.46, 0.022, 0.026),
                pushBox(q, st, 0, -0.158, 0, 0.58, 0.018, 0.02),
                q
              );
            }
            const topQ = buildTableTop(0),
              legQ = buildTableLegs(0),
              topMesh = self._makeMesh(
                topQ,
                TEX.black,
                [0.62, 0.58, 0.48],
                0,
                !1,
              ),
              legMesh = self._makeMesh(
                legQ,
                TEX.black,
                [0.045, 0.04, 0.035],
                0,
                !1,
              );
            function markTableMesh(mesh, part) {
              ((mesh.annexAltOnly = !0),
                (mesh.annexInterior = !0),
                (mesh.annexAltCrowdVisual = !0),
                (mesh.annexAltBouncingTable = !0),
                (mesh.worldLockedAlcoveFX = !0),
                (mesh.altFogUpdater = function (now) {
                  const q =
                      0 === part ? buildTableTop(now) : buildTableLegs(now),
                    strobe = Math.min(1, self._altAnnexWhiteStrobe || 0);
                  ((mesh.flatCol =
                    0 === part
                      ? [
                          0.5 + 0.42 * strobe,
                          0.45 + 0.34 * strobe,
                          0.36 + 0.25 * strobe,
                        ]
                      : [
                          0.04 + 0.18 * strobe,
                          0.035 + 0.13 * strobe,
                          0.03 + 0.1 * strobe,
                        ]),
                    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf),
                    gl.bufferData(
                      gl.ARRAY_BUFFER,
                      new Float32Array(q),
                      gl.DYNAMIC_DRAW,
                    ),
                    (mesh.count = q.length / 8));
                }),
                meshes.push(mesh));
            }
            (markTableMesh(topMesh, 0), markTableMesh(legMesh, 1));
          }
          if ((addAltBouncingFoldingTable(), !self._altAnnexCrowdStarted)) {
            self._altAnnexCrowdStarted = !0;
            const crowdBase = "files/img/rooms/z4/basement/crowd/",
              crowdFiles = [];
            for (let ci = 1; ci <= 18; ci++)
              crowdFiles.push(
                crowdBase + "CROWD" + String(ci).padStart(2, "0") + ".png",
              );
            const placements = [],
              rows = [
                {
                  z: alcoveFrontZ - 0.42,
                  n: 9,
                  s: 0.84,
                  f: 0.66,
                },
                {
                  z: alcoveFrontZ - 0.82,
                  n: 10,
                  s: 0.88,
                  f: 0.74,
                },
                {
                  z: alcoveFrontZ - 1.26,
                  n: 11,
                  s: 0.94,
                  f: 0.84,
                },
                {
                  z: alcoveFrontZ - 1.78,
                  n: 12,
                  s: 1,
                  f: 0.94,
                },
                {
                  z: alcoveFrontZ - 2.36,
                  n: 12,
                  s: 1.03,
                  f: 1,
                },
                {
                  z: alcoveFrontZ - 3.02,
                  n: 9,
                  s: 0.98,
                  f: 0.9,
                },
                {
                  z: alcoveFrontZ - 3.66,
                  n: 7,
                  s: 0.92,
                  f: 0.78,
                },
              ];
            for (let r = 0; r < rows.length; r++) {
              const row = rows[r];
              for (let k = 0; k < row.n; k++) {
                const u = 1 === row.n ? 0.5 : k / (row.n - 1),
                  seed = 100 + 31 * r + 7 * k,
                  x0 = alcoveStartX + 0.34,
                  x1 = alcoveEndX - 0.34,
                  cx = x0 + (x1 - x0) * u + 0.22 * (altCrowdHash(seed) - 0.5),
                  cz = row.z + 0.18 * (altCrowdHash(seed + 1) - 0.5),
                  sc = row.s * (0.9 + 0.22 * altCrowdHash(seed + 2)),
                  yaw = 0.26 * (altCrowdHash(seed + 3) - 0.5),
                  fileIndex = (5 * r + 3 * k) % crowdFiles.length;
                placements.push({
                  file: crowdFiles[fileIndex],
                  x: cx,
                  z: cz,
                  s: sc,
                  yaw: yaw,
                  seed: seed,
                  fade: row.f,
                });
              }
            }
            const loaded = {};
            function useLoadedCrowd(path, done) {
              if (loaded[path])
                return void (loaded[path].img && loaded[path].tex
                  ? done(loaded[path].img, loaded[path].tex)
                  : loaded[path].wait.push(done));
              loaded[path] = {
                img: null,
                tex: null,
                wait: [done],
              };
              const img = new Image();
              ((img.onload = function () {
                const tex = makeAltCrowdTexture(img);
                ((loaded[path].img = img), (loaded[path].tex = tex));
                const waiters = loaded[path].wait.slice();
                loaded[path].wait.length = 0;
                for (let wi = 0; wi < waiters.length; wi++)
                  waiters[wi](img, tex);
              }),
                (img.onerror = function () {
                  console.warn("[Zone4] crowd image failed:", path);
                }),
                (img.src = path));
            }
            for (let pi = 0; pi < placements.length; pi++) {
              const pl = placements[pi];
              useLoadedCrowd(pl.file, function (img, tex) {
                addAltExtrudedCrowdPerson(
                  img,
                  tex,
                  pl.x,
                  pl.z,
                  pl.s,
                  pl.yaw,
                  pl.seed,
                  pl.fade,
                );
              });
            }
            self.altAnnexCrowdDebug = {
              mode: "alt-annex-world-fog-far-wall-strobe-no-upstairs-bleed",
              count: placements.length,
              sourceCount: crowdFiles.length,
              noFlatWallCrowd: !0,
              noSpriteCrowd: !0,
              crowdFacesIntoAlcove: !0,
              roundedExtrusionEdges: !0,
              softRoundedVolume: !0,
              fogMachine: !0,
              dynamicFogWisps: !0,
              visibleFogOverlay: !0,
              postFXWhiteStrobe: !0,
              strongerPeripheralBlur: !0,
              randomWhiteStageStrobe: !0,
              peripheralCameraBlur: !0,
              tightCameraSpan: !0,
              hallucinationsRestored: !0,
              farWallStrobeBlockedByWall: !0,
              hangingFogVisible: !0,
              farWallWorldStrobe: !0,
              bouncingFoldingTable: !0,
              bouncingFoldingTableFoldedLegs: !0,
              bouncingFoldingTableSmaller: !0,
              bouncingFoldingTableMoreVertical: !0,
              crowdHiddenFromStairs: !0,
              noScreenSpaceFog: !0,
              worldLockedAlcoveFog: !0,
              altWallsUseBasementWallInsteadOfAltWall: !0,
              noOpaqueCrowdShell: !0,
              altAnnex180SlideTurn: !0,
              backWallBlackQuadRemoved: !0,
              blackFarWallRectangleRemoved: !0,
              stairFrameSealed: !0,
              insideAlcoveSideWallAdded: !0,
              backWallTextureMapped: !0,
              backWallBathroomClubMapped: !0,
              noBackWallTurnaroundFinal: !0,
              noFarWallTurnaround: !0,
              alcoveCrowdZ0: rows[0].z,
              alcoveCrowdZ1: rows[rows.length - 1].z,
            };
          }
          (addAltWallX(
            alcoveEndX,
            alcoveBackZ,
            alcoveFrontZ,
            [0.015, 0.008, 0.009],
          ),
            addAltWallX(
              alcoveStartX,
              alcoveBackZ,
              alcoveFrontZ,
              [0.015, 0.008, 0.009],
            ),
            addAltBox(
              alcoveStartX + 0.36,
              alcoveEndX - 0.36,
              annexY1 - 0.085,
              annexY1 - 0.018,
              alcoveBackZ + 0.28,
              alcoveFrontZ - 0.42,
              [0.07, 0, 0.01],
              TEX.black,
              0,
            ),
            addAltBox(
              alcoveStartX + 0.36,
              alcoveEndX - 0.36,
              annexY0 + 0.018,
              annexY0 + 0.052,
              alcoveBackZ + 0.28,
              alcoveFrontZ - 0.42,
              [0.034, 0, 0.006],
              TEX.black,
              0,
            ),
            (self.altAnnexExitLightWorld = null),
            (self.altAnnexStairDoorBulbWorld = pointLocal(
              altX0 + 0.125,
              bulbY,
              0,
            )),
            (self.altAnnexRoomDebug = {
              layout: "alt-annex-world-locked-fog-strobe-hidden-from-stairs",
              alcoveStartX: alcoveStartX,
              alcoveEndX: alcoveEndX,
              occluderX0: occluderX0,
              occluderX1: occluderX1,
              pathLeftZ: pathLeftZ,
              pathRightZ: pathRightZ,
              alcoveFrontZ: alcoveFrontZ,
              alcoveBackZ: alcoveBackZ,
              alcoveFrontFlushWithPath: !0,
              noMouthFrame: !0,
              redStageGlowFromBack: !0,
              extrudedCrowd: !0,
              redStageGlowMedium: !0,
              altRoomUsesAltWallOnly: !0,
              occluderZeroThickness: !0,
            }));
        }
        markMeshes(altAnnexSpriteRoomStart, "annexAltOnly");
      }
    }));
})();
