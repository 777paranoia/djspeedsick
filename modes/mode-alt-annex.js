(function () {
  window.Zone4AltAnnex = window.Zone4AltAnnex || {};
  window.Zone4AltAnnex.buildAltAnnexScene = function (ctx) {
    with (ctx) {
              const altAnnexSpriteRoomStart = meshes.length;
              const altWallTex = TEX.basementAltWall;
              const altDoorHallTex = TEX.basementAltWall;
              function markAltFrom(startIndex) {
                for (let mi = startIndex; mi < meshes.length; mi++) meshes[mi].annexAltOnly = true;
              }
              function addAltQuad(a, b, c, d, tex, col, texMix) {
                const q = [];
                pushQuad(q, a, b, c, d, [0, 1], [1, 1], [1, 0], [0, 0]);
                const mesh = self._makeMesh(q, tex || TEX.black, col || [0.006, 0.005, 0.005], typeof texMix === "number" ? texMix : 0.0, false);
                mesh.blend = false;
                mesh.useTexAlpha = false;
                mesh.annexAltOnly = true;
                meshes.push(mesh);
                return mesh;
              }
              function addAltBox(x0, x1, y0, y1, z0, z1, col, tex, texMix) {
                const s = meshes.length;
                addBox(x0, x1, y0, y1, z0, z1, tex || TEX.black, col || [0.006, 0.005, 0.005], typeof texMix === "number" ? texMix : 0.0);
                markAltFrom(s);
              }
              function addAltFloor(x0, x1, z0, z1, col) {
                addAltQuad(pointLocal(x0, annexY0 + 0.012, z0), pointLocal(x1, annexY0 + 0.012, z0), pointLocal(x1, annexY0 + 0.012, z1), pointLocal(x0, annexY0 + 0.012, z1), TEX.basementFloor, col || [0.014, 0.012, 0.012], 0.52);
              }
              function addAltCeil(x0, x1, z0, z1, col) {
                addAltQuad(pointLocal(x1, annexY1 - 0.012, z0), pointLocal(x0, annexY1 - 0.012, z0), pointLocal(x0, annexY1 - 0.012, z1), pointLocal(x1, annexY1 - 0.012, z1), TEX.basementCeil, col || [0.018, 0.016, 0.017], 0.56);
              }
              function addAltWallZ(x0, x1, z, col) {
                addAltQuad(pointLocal(x0, annexY0, z), pointLocal(x1, annexY0, z), pointLocal(x1, annexY1, z), pointLocal(x0, annexY1, z), altWallTex, col || [0.016, 0.011, 0.012], 0.96);
              }
              function addAltWallX(x, z0, z1, col) {
                addAltQuad(pointLocal(x, annexY0, z1), pointLocal(x, annexY0, z0), pointLocal(x, annexY1, z0), pointLocal(x, annexY1, z1), altWallTex, col || [0.016, 0.011, 0.012], 0.96);
              }
              function addDoorHallWallX(x, z0, z1, col) {
                addAltQuad(pointLocal(x, annexY0, z1), pointLocal(x, annexY0, z0), pointLocal(x, annexY1, z0), pointLocal(x, annexY1, z1), altDoorHallTex, col || [0.020, 0.015, 0.014], 0.98);
              }
              function addDoorHallWallZ(x0, x1, z, col) {
                addAltQuad(pointLocal(x0, annexY0, z), pointLocal(x1, annexY0, z), pointLocal(x1, annexY1, z), pointLocal(x0, annexY1, z), altDoorHallTex, col || [0.020, 0.015, 0.014], 0.98);
              }
              {
                const altX0 = annexX0;
                const altX1 = annexX1;
                const roomLen = altX1 - altX0;
                const stairOpen = stairHalfW + 0.22;
                const pathLeftZ = -0.72;
                const pathRightZ = annexHalfW + 0.42;
                const alcoveStartX = altX0 + roomLen * 0.48;
                const alcoveEndX = altX1 - 0.24;
                const alcoveFrontZ = pathLeftZ;
                const alcoveBackZ = -annexHalfW - 4.60;
                const occluderZ0 = pathLeftZ;
                const occluderZ1 = pathLeftZ;
                const occluderX0 = altX0 + 0.34;
                const occluderX1 = alcoveStartX;
                addAltFloor(altX0, altX1 + 0.28, pathLeftZ, pathRightZ, [0.013, 0.012, 0.012]);
                addAltCeil(altX0, altX1 + 0.28, pathLeftZ, pathRightZ, [0.017, 0.015, 0.016]);
                addAltWallZ(altX0, altX1 + 0.28, pathRightZ, [0.014, 0.011, 0.012]);
                {
                  const z4BackWallX = altX1 + 0.24;
                  const z4BackWallMesh = addAltQuad(
                    pointLocal(z4BackWallX, annexY0, pathRightZ),
                    pointLocal(z4BackWallX, annexY0, pathLeftZ),
                    pointLocal(z4BackWallX, annexY1, pathLeftZ),
                    pointLocal(z4BackWallX, annexY1, pathRightZ),
                    TEX.basementBackWall,
                    [1.0, 1.0, 1.0],
                    1.0
                  );
                  z4BackWallMesh.blend = true;
                  z4BackWallMesh.useTexAlpha = true;
                  z4BackWallMesh.annexAltDoorScene = true;
                  z4BackWallMesh.annexAltDoorSceneNoDepth = true;
                  const z4GreenU0 = 1562.0 / 2048.0;
                  const z4GreenU1 = 1938.0 / 2048.0;
                  const z4GreenV0 = 338.0 / 1017.0;
                  const z4GreenV1 = 1009.0 / 1017.0;
                  const z4HoleZA = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU0;
                  const z4HoleZB = pathRightZ + (pathLeftZ - pathRightZ) * z4GreenU1;
                  const z4HoleZ0 = Math.min(z4HoleZA, z4HoleZB);
                  const z4HoleZ1 = Math.max(z4HoleZA, z4HoleZB);
                  const z4HoleYA = annexY1 + (annexY0 - annexY1) * z4GreenV0;
                  const z4HoleYB = annexY1 + (annexY0 - annexY1) * z4GreenV1;
                  const z4HoleY0 = Math.min(z4HoleYA, z4HoleYB);
                  const z4HoleY1 = Math.max(z4HoleYA, z4HoleYB);
                  const z4BathroomX = z4BackWallX + 0.055;
                  const z4DoorStopT = 0.860;
                  const z4DoorStopS = z4DoorStopT * z4DoorStopT * (3 - 2 * z4DoorStopT);
                  const z4DoorStopEyeX = annexX0 + ((annexX1 - 0.07) - annexX0) * z4DoorStopS;
                  const z4DoorStopEyeY = -0.02 - annexDrop;
                  const z4PerspectiveScale = Math.max(
                    1.0,
                    (z4BathroomX - z4DoorStopEyeX) / Math.max(0.001, z4BackWallX - z4DoorStopEyeX)
                  );
                  const z4SetbackScale = 1.0 + (z4PerspectiveScale - 1.0) * 0.42;
                  const z4Overscan = 1.010;
                  const z4HoleZC = (z4HoleZ0 + z4HoleZ1) * 0.5;
                  let z4PlateY0 = z4DoorStopEyeY + (z4HoleY0 - z4DoorStopEyeY) * z4SetbackScale;
                  let z4PlateY1 = z4DoorStopEyeY + (z4HoleY1 - z4DoorStopEyeY) * z4SetbackScale;
                  const z4PlateLift = (z4PlateY1 - z4PlateY0) * 0.18;
                  z4PlateY0 += z4PlateLift;
                  z4PlateY1 += z4PlateLift;
                  z4PlateY0 -= (z4PlateY1 - z4PlateY0) * 0.34;
                  const z4PlateZ0 = z4HoleZC + (z4HoleZ0 - z4HoleZC) * z4SetbackScale * z4Overscan;
                  const z4PlateZ1 = z4HoleZC + (z4HoleZ1 - z4HoleZC) * z4SetbackScale * z4Overscan;
                  const z4BathroomVTop = 0.10;
                  const z4BathroomVBottom = 1.00;
                  function addBathroomRoomQuad(a, b, c, d, tex, col, texMix, uv0, uv1, uv2, uv3) {
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
                      uv3 || [0, 0]
                    );
                    const mesh = self._makeMesh(q, tex || TEX.black, col || [1.0, 1.0, 1.0], typeof texMix === "number" ? texMix : 1.0, false);
                    mesh.annexAltOnly = true;
                    meshes.push(mesh);
                    return mesh;
                  }
                  const z4BathroomMesh = addBathroomRoomQuad(
                    pointLocal(z4BathroomX, z4PlateY0, z4PlateZ1),
                    pointLocal(z4BathroomX, z4PlateY0, z4PlateZ0),
                    pointLocal(z4BathroomX, z4PlateY1, z4PlateZ0),
                    pointLocal(z4BathroomX, z4PlateY1, z4PlateZ1),
                    TEX.basementBathroomClub,
                    [1.0, 1.0, 1.0],
                    1.0,
                    [1, z4BathroomVBottom],
                    [0, z4BathroomVBottom],
                    [0, z4BathroomVTop],
                    [1, z4BathroomVTop]
                  );
                  z4BathroomMesh.backWallBathroomClub = true;
                  z4BathroomMesh.annexAltDoorScene = true;
                  z4BathroomMesh.annexAltDoorSceneNoDepth = true;
                  z4BathroomMesh.blend = true;
                }
                addDoorHallWallX(altX0 + 0.010, pathLeftZ, -stairOpen, [0.020, 0.015, 0.014]);
                addDoorHallWallX(altX0 + 0.010, stairOpen, pathRightZ, [0.020, 0.015, 0.014]);
                addAltBox(altX0 - 0.12, altX0 + 0.32, annexY0, annexY1, -stairOpen - 0.10, -stairOpen + 0.02, [0.020, 0.015, 0.014], altDoorHallTex, 0.98);
                addAltBox(altX0 - 0.12, altX0 + 0.32, annexY0, annexY1, stairOpen - 0.02, stairOpen + 0.10, [0.020, 0.015, 0.014], altDoorHallTex, 0.98);
                addDoorHallWallZ(altX0 - 0.04, altX0 + 0.34, -stairOpen - 0.10, [0.020, 0.015, 0.014]);
                addDoorHallWallZ(altX0 - 0.04, altX0 + 0.34, stairOpen + 0.10, [0.020, 0.015, 0.014]);
                addAltBox(
                  altX0 - 0.18,
                  altX0 + 0.62,
                  annexY0,
                  annexY1,
                  -stairOpen - 0.055,
                  -stairHalfW + 0.045,
                  [0.021, 0.016, 0.015],
                  altDoorHallTex,
                  0.98
                );
                addAltBox(
                  altX0 - 0.18,
                  altX0 + 0.62,
                  annexY0,
                  annexY1,
                  stairHalfW - 0.045,
                  stairOpen + 0.055,
                  [0.021, 0.016, 0.015],
                  altDoorHallTex,
                  0.98
                );
                addAltBox(
                  altX0 - 0.18,
                  altX0 + 0.62,
                  annexY1 - 0.245,
                  annexY1 + 0.025,
                  -stairOpen - 0.070,
                  stairOpen + 0.070,
                  [0.020, 0.015, 0.014],
                  altDoorHallTex,
                  0.98
                );
                addAltBox(
                  altX0 + 0.30,
                  altX0 + 0.70,
                  annexY0,
                  annexY1,
                  -stairHalfW - 0.050,
                  -stairHalfW + 0.035,
                  [0.018, 0.014, 0.013],
                  altDoorHallTex,
                  0.98
                );
                addAltBox(
                  altX0 + 0.30,
                  altX0 + 0.70,
                  annexY0,
                  annexY1,
                  stairHalfW - 0.035,
                  stairHalfW + 0.050,
                  [0.018, 0.014, 0.013],
                  altDoorHallTex,
                  0.98
                );
                const bulbY = annexY1 - 0.185;
                const bulbStart = meshes.length;
                addAltBox(altX0 + 0.035, altX0 + 0.095, bulbY + 0.035, bulbY + 0.085, -0.155, 0.155, [0.030, 0.022, 0.014], TEX.black, 0.0);
                addAltBox(altX0 + 0.085, altX0 + 0.165, bulbY - 0.025, bulbY + 0.045, -0.060, 0.060, [4.10, 0.16, 0.07], TEX.black, 0.0);
                for (let mi = bulbStart; mi < meshes.length; mi++) meshes[mi].annexAltDoorBulb = true;
                addAltWallZ(occluderX0, occluderX1, pathLeftZ, [0.026, 0.023, 0.020]);
                addAltBox(
                  occluderX0 - 0.045,
                  occluderX1 + 0.045,
                  annexY0,
                  annexY1,
                  pathLeftZ - 0.070,
                  pathLeftZ + 0.070,
                  [0.026, 0.023, 0.020],
                  altWallTex,
                  0.98
                );
                addAltFloor(alcoveStartX, alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.011, 0.009, 0.009]);
                addAltCeil(alcoveStartX, alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.016, 0.012, 0.013]);
                addAltWallZ(alcoveStartX, alcoveEndX, alcoveBackZ, [0.032, 0.008, 0.010]);
      const stageRedStart = meshes.length;
                addAltBox(alcoveStartX + 0.42, alcoveEndX - 0.42, annexY1 - 0.190, annexY1 - 0.110, alcoveBackZ + 0.145, alcoveBackZ + 0.285, [2.15, 0.040, 0.020], TEX.black, 0.0);
                addAltBox(alcoveStartX + 0.70, alcoveEndX - 0.70, annexY1 - 0.340, annexY1 - 0.285, alcoveBackZ + 0.320, alcoveBackZ + 0.430, [0.92, 0.026, 0.014], TEX.black, 0.0);
                addAltQuad(
                  pointLocal(alcoveStartX + 0.18, annexY0 + 0.019, alcoveBackZ + 0.38),
                  pointLocal(alcoveEndX - 0.18, annexY0 + 0.019, alcoveBackZ + 0.38),
                  pointLocal(alcoveEndX - 0.34, annexY0 + 0.019, alcoveFrontZ - 0.02),
                  pointLocal(alcoveStartX + 0.34, annexY0 + 0.019, alcoveFrontZ - 0.02),
                  TEX.black,
                  [0.135, 0.007, 0.004],
                  0.0
                );
                addAltQuad(
                  pointLocal(alcoveEndX - 0.20, annexY1 - 0.028, alcoveBackZ + 0.30),
                  pointLocal(alcoveStartX + 0.20, annexY1 - 0.028, alcoveBackZ + 0.30),
                  pointLocal(alcoveStartX + 0.54, annexY1 - 0.028, alcoveFrontZ - 0.08),
                  pointLocal(alcoveEndX - 0.54, annexY1 - 0.028, alcoveFrontZ - 0.08),
                  TEX.black,
                  [0.095, 0.005, 0.003],
                  0.0
                );
                for (let mi = stageRedStart; mi < meshes.length; mi++) meshes[mi].annexAltStageRedGlow = true;
                self.altAnnexStageRedLightWorld = pointLocal(alcoveStartX + (alcoveEndX - alcoveStartX) * 0.50, annexY1 - 0.22, alcoveBackZ + 0.38);
                self.altAnnexStageWhiteLightWorld = pointLocal(alcoveStartX + (alcoveEndX - alcoveStartX) * 0.50, annexY1 - 0.42, alcoveBackZ + 0.94);
                function altCrowdHash(n) {
                  return Math.abs(Math.sin(n * 127.13 + 19.71) * 43758.5453) % 1;
                }
                function makeAltCrowdTexture(img) {
                  const tex = gl.createTexture();
                  gl.bindTexture(gl.TEXTURE_2D, tex);
                  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                  return tex;
                }
                function addAltCrowdMesh(data, tex, col, texMix, blend, useAlpha) {
                  if (!data || data.length < 24) return null;
                  const mesh = self._makeMesh(data, tex || TEX.black, col || [1, 1, 1], typeof texMix === "number" ? texMix : 1.0, !!blend);
                  mesh.annexAltOnly = true;
                  mesh.annexInterior = true;
                  mesh.annexAltCrowdVisual = true;
                  mesh.annexAltCrowd = true;
                  mesh.useTexAlpha = !!useAlpha;
                  meshes.push(mesh);
                  return mesh;
                }
                function addAltCrowdShadow(cx, cz, sx, sz, yaw, rowFade) {
                  const c = Math.cos(yaw);
                  const s = Math.sin(yaw);
                  function rp(dx, dz) {
                    return pointLocal(cx + dx * c - dz * s, annexY0 + 0.020, cz + dx * s + dz * c);
                  }
                  addAltQuad(
                    rp(-sx, -sz),
                    rp( sx, -sz),
                    rp( sx,  sz),
                    rp(-sx,  sz),
                    TEX.black,
                    [0.028 * rowFade, 0.004, 0.003],
                    0.0
                  );
                }
                function addAltExtrudedCrowdPerson(img, tex, cx, cz, sc, yaw, seed, rowFade) {
                  const cw = 84;
                  const ch = 212;
                  const cnv = document.createElement("canvas");
                  cnv.width = cw;
                  cnv.height = ch;
                  const ctx = cnv.getContext("2d", { willReadFrequently: true });
                  ctx.clearRect(0, 0, cw, ch);
                  ctx.drawImage(img, 0, 0, cw, ch);
                  const pix = ctx.getImageData(0, 0, cw, ch).data;
                  const bands = 76;
                  const capSegments = 0;
                  const sliceCount = 8;
                  const personH = sc * (1.54 + altCrowdHash(seed + 2.0) * 0.18);
                  const personW = sc * (0.52 + altCrowdHash(seed + 4.0) * 0.12);
                  const bodyDepth = sc * (0.050 + altCrowdHash(seed + 6.0) * 0.018);
                  const bevel = bodyDepth * 0.58;
                  const yBase = annexY0 + 0.018;
                  const c = Math.cos(yaw);
                  const s = Math.sin(yaw);
                  const face = [];
                  const shell = [];
                  const slices = [];
                  function pLocal(px, py, pz) {
                    const dx = px - cx;
                    const dz = pz - cz;
                    return pointLocal(cx + dx * c - dz * s, py, cz + dx * s + dz * c);
                  }
                  function alphaAt(x, y) {
                    x = Math.max(0, Math.min(cw - 1, x | 0));
                    y = Math.max(0, Math.min(ch - 1, y | 0));
                    return pix[(y * cw + x) * 4 + 3];
                  }
                  const left = new Array(bands);
                  const right = new Array(bands);
                  for (let b = 0; b < bands; b++) {
                    const yImg0 = Math.floor((bands - 1 - b) / bands * ch);
                    const yImg1 = Math.floor((bands - b) / bands * ch);
                    let minX = cw;
                    let maxX = -1;
                    for (let yy = yImg0; yy < yImg1; yy++) {
                      for (let xx = 0; xx < cw; xx++) {
                        if (alphaAt(xx, yy) > 22) {
                          if (xx < minX) minX = xx;
                          if (xx > maxX) maxX = xx;
                        }
                      }
                    }
                    if (maxX > minX) {
                      left[b] = Math.max(0, minX - 1);
                      right[b] = Math.min(cw - 1, maxX + 1);
                    } else {
                      left[b] = null;
                      right[b] = null;
                    }
                  }
                  for (let pass = 0; pass < 3; pass++) {
                    const nl = left.slice();
                    const nr = right.slice();
                    for (let b = 0; b < bands; b++) {
                      if (left[b] === null || right[b] === null) continue;
                      let sl = left[b] * 0.48;
                      let sr = right[b] * 0.48;
                      let wl = 0.48;
                      let wr = 0.48;
                      for (let o = -3; o <= 3; o++) {
                        if (o === 0) continue;
                        const bi = b + o;
                        if (bi < 0 || bi >= bands) continue;
                        if (left[bi] === null || right[bi] === null) continue;
                        const ao = Math.abs(o);
                        const w = ao === 1 ? 0.24 : (ao === 2 ? 0.07 : 0.018);
                        sl += left[bi] * w;
                        sr += right[bi] * w;
                        wl += w;
                        wr += w;
                      }
                      nl[b] = sl / wl;
                      nr[b] = sr / wr;
                    }
                    for (let b = 0; b < bands; b++) {
                      left[b] = nl[b];
                      right[b] = nr[b];
                    }
                  }
                  let firstBand = -1;
                  function roundedSidePoint(side, t, xF, xB, zEdge) {
                    const x = xF + (xB - xF) * t;
                    const inward = (1.0 - Math.sin(Math.PI * t)) * bevel;
                    const z = side < 0 ? zEdge + inward : zEdge - inward;
                    return [x, z];
                  }
                  for (let b = 0; b < bands; b++) {
                    if (left[b] === null || right[b] === null) continue;
                    const v0 = b / bands;
                    const v1 = (b + 1) / bands;
                    const y0 = yBase + personH * v0;
                    const y1 = yBase + personH * v1;
                    const uL = left[b] / (cw - 1);
                    const uR = right[b] / (cw - 1);
                    const zL = cz + (uL - 0.5) * personW;
                    const zR = cz + (uR - 0.5) * personW;
                    const xF = cx - bodyDepth * 0.50;
                    const xB = cx + bodyDepth * 0.50;
                    for (let j = 0; j < sliceCount; j++) {
                      const t = sliceCount === 1 ? 0.5 : j / (sliceCount - 1);
                      const x = xF + (xB - xF) * t;
                      const inward = (1.0 - Math.sin(Math.PI * t)) * bevel;
                      const zLS = zL + inward;
                      const zRS = zR - inward;
                      const target = (j === 0 || j === sliceCount - 1) ? face : slices;
                      pushQuad(
                        target,
                        pLocal(x, y0, zLS),
                        pLocal(x, y0, zRS),
                        pLocal(x, y1, zRS),
                        pLocal(x, y1, zLS),
                        [uL, 1.0 - v0], [uR, 1.0 - v0], [uR, 1.0 - v1], [uL, 1.0 - v1]
                      );
                    }
                    for (let j = 0; j < capSegments; j++) {
                      const t0 = j / capSegments;
                      const t1 = (j + 1) / capSegments;
                      let a = roundedSidePoint(-1, t0, xF, xB, zL);
                      let d = roundedSidePoint(-1, t1, xF, xB, zL);
                      pushQuad(
                        shell,
                        pLocal(a[0], y0, a[1]),
                        pLocal(d[0], y0, d[1]),
                        pLocal(d[0], y1, d[1]),
                        pLocal(a[0], y1, a[1]),
                        [0, 1], [1, 1], [1, 0], [0, 0]
                      );
                      a = roundedSidePoint(1, t0, xF, xB, zR);
                      d = roundedSidePoint(1, t1, xF, xB, zR);
                      pushQuad(
                        shell,
                        pLocal(d[0], y0, d[1]),
                        pLocal(a[0], y0, a[1]),
                        pLocal(a[0], y1, a[1]),
                        pLocal(d[0], y1, d[1]),
                        [0, 1], [1, 1], [1, 0], [0, 0]
                      );
                    }
                    if (firstBand < 0) firstBand = b;
                  }
                  if (firstBand >= 0) {
                    addAltCrowdShadow(cx, cz, bodyDepth * 1.55, personW * 0.40, yaw, rowFade);
                    const tint = [
                      0.36 + altCrowdHash(seed + 11.0) * 0.12,
                      0.24 + altCrowdHash(seed + 12.0) * 0.08,
                      0.22 + altCrowdHash(seed + 13.0) * 0.07
                    ];
                    const softTint = [
                      0.18 + altCrowdHash(seed + 21.0) * 0.05,
                      0.08 + altCrowdHash(seed + 22.0) * 0.03,
                      0.07 + altCrowdHash(seed + 23.0) * 0.025
                    ];
                    addAltCrowdMesh(slices, tex, softTint, 1.0, true, true);
                    addAltCrowdMesh(face, tex, tint, 1.0, true, true);
                  }
                }
                function makeAltFogGradientTexture(r, g, b, a) {
                  const size = 128;
                  const cnv = document.createElement("canvas");
                  cnv.width = size;
                  cnv.height = size;
                  const ctx = cnv.getContext("2d");
                  const grd = ctx.createRadialGradient(size * 0.50, size * 0.50, size * 0.04, size * 0.50, size * 0.50, size * 0.50);
                  grd.addColorStop(0.00, "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")");
                  grd.addColorStop(0.28, "rgba(" + r + "," + g + "," + b + "," + (a * 0.78 / 255) + ")");
                  grd.addColorStop(0.62, "rgba(" + r + "," + g + "," + b + "," + (a * 0.28 / 255) + ")");
                  grd.addColorStop(1.00, "rgba(" + r + "," + g + "," + b + ",0)");
                  ctx.fillStyle = grd;
                  ctx.fillRect(0, 0, size, size);
                  const tex = gl.createTexture();
                  gl.bindTexture(gl.TEXTURE_2D, tex);
                  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                  return tex;
                }
                if (!TEX.altFogRed) TEX.altFogRed = makeAltFogGradientTexture(255, 54, 38, 120);
                if (!TEX.altFogSmoke) TEX.altFogSmoke = makeAltFogGradientTexture(230, 218, 205, 110);
                if (!TEX.altFogWhite) TEX.altFogWhite = makeAltFogGradientTexture(255, 250, 232, 130);
                function addAltDynamicFogWisp(cx, cz, cy, w, h, ang, phase, speed, tex, col, alphaBase) {
                  const q0 = [];
                  pushQuad(
                    q0,
                    pointLocal(cx - w * 0.5, cy - h * 0.5, cz),
                    pointLocal(cx + w * 0.5, cy - h * 0.5, cz),
                    pointLocal(cx + w * 0.5, cy + h * 0.5, cz),
                    pointLocal(cx - w * 0.5, cy + h * 0.5, cz),
                    [0, 1], [1, 1], [1, 0], [0, 0]
                  );
                  const mesh = self._makeMesh(q0, tex, col, 0.0, true);
                  mesh.annexAltOnly = true;
                  mesh.annexInterior = true;
                  mesh.annexAltFog = true;
                  mesh.annexAltFogWisp = true;
                  mesh.altAnnexFogMachine = true;
                  mesh.useTexAlpha = true;
                  mesh.blend = true;
                  mesh.altFogUpdater = function(now) {
                    const t = now * 0.001;
                    const breathe = 0.5 + 0.5 * Math.sin(t * speed + phase);
                    const driftA = Math.sin(t * (speed * 0.43) + phase * 1.73);
                    const driftB = Math.cos(t * (speed * 0.31) + phase * 2.19);
                    const strobe = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
                    const px = cx + driftA * 0.20 + Math.sin(t * 0.13 + phase) * 0.08;
                    const pz = cz + driftB * 0.18 + Math.cos(t * 0.11 + phase * 0.7) * 0.08;
                    const py = cy + Math.sin(t * 0.19 + phase * 1.2) * 0.055;
                    const ww = w * (0.84 + breathe * 0.34 + strobe * 0.16);
                    const hh = h * (0.78 + breathe * 0.42 + strobe * 0.12);
                    const aa = ang + Math.sin(t * 0.17 + phase) * 0.18;
                    const ca = Math.cos(aa);
                    const sa = Math.sin(aa);
                    const hx = ca * ww * 0.5;
                    const hz = sa * ww * 0.5;
                    const y0 = py - hh * 0.5;
                    const y1 = py + hh * 0.5;
                    const q = [];
                    pushQuad(
                      q,
                      pointLocal(px - hx, y0, pz - hz),
                      pointLocal(px + hx, y0, pz + hz),
                      pointLocal(px + hx, y1, pz + hz),
                      pointLocal(px - hx, y1, pz - hz),
                      [0, 1], [1, 1], [1, 0], [0, 0]
                    );
                    const a = alphaBase * (0.48 + breathe * 0.42) + strobe * 0.42;
                    mesh.flatCol = [
                      col[0] * a + strobe * 0.38,
                      col[1] * a + strobe * 0.34,
                      col[2] * a + strobe * 0.28
                    ];
                    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
                    mesh.count = q.length / 8;
                  };
                  meshes.push(mesh);
                  return mesh;
                }
                const altAnnexFogStart = meshes.length;
                for (let fi = 0; fi < 34; fi++) {
                  const seed = 700.0 + fi * 17.0;
                  const u = altCrowdHash(seed + 1.0);
                  const v = altCrowdHash(seed + 2.0);
                  const nearPathBias = Math.pow(altCrowdHash(seed + 3.0), 1.75);
                  const fx = alcoveStartX + 0.22 + (alcoveEndX - alcoveStartX - 0.44) * u;
                  const fz = (alcoveFrontZ - 0.10) + (alcoveBackZ + 0.46 - (alcoveFrontZ - 0.10)) * nearPathBias;
                  const fy = annexY0 + 0.18 + v * (annexY1 - annexY0) * 0.58;
                  const fw = 0.72 + altCrowdHash(seed + 4.0) * 1.35;
                  const fh = 0.22 + altCrowdHash(seed + 5.0) * 0.58;
                  const fa = -0.55 + altCrowdHash(seed + 6.0) * 1.10;
                  const fs = 0.42 + altCrowdHash(seed + 7.0) * 0.68;
                  const tex = fi % 5 === 0 ? TEX.altFogWhite : (fi % 3 === 0 ? TEX.altFogSmoke : TEX.altFogRed);
                  const col = fi % 5 === 0 ? [1.15, 0.92, 0.72] : (fi % 3 === 0 ? [0.82, 0.48, 0.36] : [1.55, 0.11, 0.055]);
                  const alpha = fi % 5 === 0 ? 0.72 : (fi % 3 === 0 ? 0.62 : 0.74);
                  addAltDynamicFogWisp(fx, fz, fy, fw, fh, fa, seed * 0.01, fs, tex, col, alpha);
                }
                for (let mi = altAnnexFogStart; mi < meshes.length; mi++) {
                  meshes[mi].dynamicFogWisp = true;
                }
                function altAnnexFxHash(x) {
                  return (Math.sin(x * 127.1 + 31.7) * 43758.5453123) % 1.0;
                }
                function altAnnexFxHash01(x) {
                  const v = altAnnexFxHash(x);
                  return v < 0.0 ? v + 1.0 : v;
                }
                function makeAltWorldFogTexture(r, g, b, a) {
                  const size = 128;
                  const cnv = document.createElement("canvas");
                  cnv.width = size;
                  cnv.height = size;
                  const ctx = cnv.getContext("2d");
                  const grd = ctx.createRadialGradient(size * 0.50, size * 0.50, size * 0.03, size * 0.50, size * 0.50, size * 0.52);
                  grd.addColorStop(0.00, "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")");
                  grd.addColorStop(0.26, "rgba(" + r + "," + g + "," + b + "," + (a * 0.72 / 255) + ")");
                  grd.addColorStop(0.60, "rgba(" + r + "," + g + "," + b + "," + (a * 0.28 / 255) + ")");
                  grd.addColorStop(1.00, "rgba(" + r + "," + g + "," + b + ",0)");
                  ctx.fillStyle = grd;
                  ctx.fillRect(0, 0, size, size);
                  const tex = gl.createTexture();
                  gl.bindTexture(gl.TEXTURE_2D, tex);
                  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
                  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                  return tex;
                }
                if (!TEX.altWorldFogRed) TEX.altWorldFogRed = makeAltWorldFogTexture(255, 48, 32, 135);
                if (!TEX.altWorldFogSmoke) TEX.altWorldFogSmoke = makeAltWorldFogTexture(235, 222, 208, 125);
                if (!TEX.altWorldStrobe) TEX.altWorldStrobe = makeAltWorldFogTexture(255, 248, 224, 150);
                function addAltWorldFogWisp(cx, cz, cy, w, h, yaw, phase, speed, tex, col, alphaBase) {
                  const q0 = [];
                  pushQuad(
                    q0,
                    pointLocal(cx - w * 0.5, cy - h * 0.5, cz),
                    pointLocal(cx + w * 0.5, cy - h * 0.5, cz),
                    pointLocal(cx + w * 0.5, cy + h * 0.5, cz),
                    pointLocal(cx - w * 0.5, cy + h * 0.5, cz),
                    [0, 1], [1, 1], [1, 0], [0, 0]
                  );
                  const mesh = self._makeMesh(q0, tex, col, 0.0, true);
                  mesh.annexAltOnly = true;
                  mesh.annexInterior = true;
                  mesh.annexAltFog = true;
                  mesh.annexAltCrowdVisual = true;
                  mesh.dynamicFogWisp = true;
                  mesh.altAnnexFogMachine = true;
                  mesh.useTexAlpha = true;
                  mesh.blend = true;
                  mesh.altFogUpdater = function(now) {
                    const t = now * 0.001;
                    const breathe = 0.5 + 0.5 * Math.sin(t * speed + phase);
                    const driftA = Math.sin(t * (speed * 0.38) + phase * 1.73);
                    const driftB = Math.cos(t * (speed * 0.27) + phase * 2.19);
                    const px = cx + driftA * 0.18 + Math.sin(t * 0.11 + phase) * 0.06;
                    const pz = cz + driftB * 0.14 + Math.cos(t * 0.09 + phase * 0.7) * 0.05;
                    const py = cy + Math.sin(t * 0.15 + phase * 1.2) * 0.045;
                    const ww = w * (0.82 + breathe * 0.36);
                    const hh = h * (0.78 + breathe * 0.42);
                    const aa = yaw + Math.sin(t * 0.14 + phase) * 0.20;
                    const ca = Math.cos(aa);
                    const sa = Math.sin(aa);
                    const hx = ca * ww * 0.5;
                    const hz = sa * ww * 0.5;
                    const q = [];
                    pushQuad(
                      q,
                      pointLocal(px - hx, py - hh * 0.5, pz - hz),
                      pointLocal(px + hx, py - hh * 0.5, pz + hz),
                      pointLocal(px + hx, py + hh * 0.5, pz + hz),
                      pointLocal(px - hx, py + hh * 0.5, pz - hz),
                      [0, 1], [1, 1], [1, 0], [0, 0]
                    );
                    const a = alphaBase * (0.52 + breathe * 0.48);
                    const st = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
                    mesh.flatCol = [
                      col[0] * a + st * 0.40,
                      col[1] * a + st * 0.34,
                      col[2] * a + st * 0.28
                    ];
                    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
                    mesh.count = q.length / 8;
                  };
                  meshes.push(mesh);
                }
                function addAltWorldStrobeBeam(x0, x1, y0, y1, z0, z1, phase, strength) {
                  const q = [];
                  pushQuad(
                    q,
                    pointLocal(x0, y1, z0),
                    pointLocal(x1, y1, z0),
                    pointLocal(x1, y0, z1),
                    pointLocal(x0, y0, z1),
                    [0, 1], [1, 1], [1, 0], [0, 0]
                  );
                  const mesh = self._makeMesh(q, TEX.altWorldStrobe, [0.0, 0.0, 0.0], 0.0, true);
                  mesh.annexAltOnly = true;
                  mesh.annexInterior = true;
                  mesh.annexAltStrobeBeam = true;
                  mesh.annexAltCrowdVisual = true;
                  mesh.useTexAlpha = true;
                  mesh.blend = true;
                  mesh.altFogUpdater = function(now) {
                    const st = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
                    const flick = st * strength * (0.78 + 0.22 * Math.sin(now * 0.033 + phase));
                    mesh.flatCol = [2.25 * flick, 2.05 * flick, 1.62 * flick];
                  };
                  meshes.push(mesh);
                }
                const altWorldFxStart = meshes.length;
                for (let fi = 0; fi < 42; fi++) {
                  const seed = 900.0 + fi * 19.0;
                  const u = altAnnexFxHash01(seed + 1.0);
                  const v = altAnnexFxHash01(seed + 2.0);
                  const d = Math.pow(altAnnexFxHash01(seed + 3.0), 1.35);
                  const fx = alcoveStartX + 0.18 + (alcoveEndX - alcoveStartX - 0.36) * u;
                  const fz = alcoveFrontZ - 0.22 + (alcoveBackZ + 0.42 - (alcoveFrontZ - 0.22)) * d;
                  const fy = annexY0 + 0.48 + v * (annexY1 - annexY0) * 0.48;
                  const fw = 0.58 + altAnnexFxHash01(seed + 4.0) * 1.48;
                  const fh = 0.20 + altAnnexFxHash01(seed + 5.0) * 0.62;
                  const fa = -0.62 + altAnnexFxHash01(seed + 6.0) * 1.24;
                  const fs = 0.32 + altAnnexFxHash01(seed + 7.0) * 0.62;
                  const tex = fi % 4 === 0 ? TEX.altWorldFogSmoke : TEX.altWorldFogRed;
                  const col = fi % 4 === 0 ? [1.05, 0.70, 0.54] : [1.65, 0.12, 0.060];
                  const alpha = fi % 4 === 0 ? 0.76 : 0.82;
                  addAltWorldFogWisp(fx, fz, fy, fw, fh, fa, seed * 0.01, fs, tex, col, alpha);
                }
                addAltWorldStrobeBeam(
                  alcoveStartX + 0.30,
                  alcoveEndX - 0.30,
                  annexY0 + 0.22,
                  annexY1 - 0.34,
                  alcoveBackZ + 0.56,
                  alcoveFrontZ - 0.55,
                  1.4,
                  1.00
                );
                addAltWorldStrobeBeam(
                  alcoveStartX + 0.55,
                  alcoveEndX - 0.55,
                  annexY0 + 0.55,
                  annexY1 - 0.18,
                  alcoveBackZ + 0.36,
                  alcoveBackZ + 1.55,
                  2.8,
                  0.72
                );
                for (let mi = altWorldFxStart; mi < meshes.length; mi++) {
                  meshes[mi].worldLockedAlcoveFX = true;
                }
                function addAltBouncingFoldingTable() {
                  function tableState(now) {
                    const t = now * 0.001;
                    const cx0 = alcoveStartX + (alcoveEndX - alcoveStartX) * 0.54;
                    const sx = Math.max(0.12, (alcoveEndX - alcoveStartX) * 0.22);
                    const zFront = alcoveFrontZ - 0.24;
                    const zBack = alcoveBackZ + 0.92;
                    const zWave = 0.5 + 0.5 * Math.sin(t * 0.48 + 1.40);
                    const hop = Math.pow(Math.abs(Math.sin(t * 2.70 + 0.35)), 0.72);
                    return {
                      x: cx0 + Math.sin(t * 0.62 + 0.60) * sx + Math.sin(t * 1.90) * 0.10,
                      y: annexY0 + 1.34 + hop * 0.66 + Math.sin(t * 1.85) * 0.10,
                      z: zBack * zWave + zFront * (1.0 - zWave) + Math.sin(t * 1.28 + 2.40) * 0.12,
                      yaw: Math.sin(t * 1.10) * 0.62 + t * 0.18,
                      wobble: Math.sin(t * 5.10) * 0.055
                    };
                  }
                  function pLocalBox(st, lx, ly, lz) {
                    const ca = Math.cos(st.yaw);
                    const sa = Math.sin(st.yaw);
                    const yy = ly + Math.sin(lx * 2.2 + lz * 1.7) * st.wobble;
                    return pointLocal(
                      st.x + lx * ca - lz * sa,
                      st.y + yy,
                      st.z + lx * sa + lz * ca
                    );
                  }
                  function pushBox(q, st, cx, cy, cz, sx, sy, sz) {
                    const hx = sx * 0.5;
                    const hy = sy * 0.5;
                    const hz = sz * 0.5;
                    const p000 = pLocalBox(st, cx - hx, cy - hy, cz - hz);
                    const p100 = pLocalBox(st, cx + hx, cy - hy, cz - hz);
                    const p110 = pLocalBox(st, cx + hx, cy + hy, cz - hz);
                    const p010 = pLocalBox(st, cx - hx, cy + hy, cz - hz);
                    const p001 = pLocalBox(st, cx - hx, cy - hy, cz + hz);
                    const p101 = pLocalBox(st, cx + hx, cy - hy, cz + hz);
                    const p111 = pLocalBox(st, cx + hx, cy + hy, cz + hz);
                    const p011 = pLocalBox(st, cx - hx, cy + hy, cz + hz);
                    pushQuad(q, p000, p100, p110, p010, [0,1], [1,1], [1,0], [0,0]);
                    pushQuad(q, p101, p001, p011, p111, [0,1], [1,1], [1,0], [0,0]);
                    pushQuad(q, p010, p110, p111, p011, [0,1], [1,1], [1,0], [0,0]);
                    pushQuad(q, p001, p101, p100, p000, [0,1], [1,1], [1,0], [0,0]);
                    pushQuad(q, p001, p000, p010, p011, [0,1], [1,1], [1,0], [0,0]);
                    pushQuad(q, p100, p101, p111, p110, [0,1], [1,1], [1,0], [0,0]);
                  }
                  function buildTableTop(now) {
                    const st = tableState(now);
                    const q = [];
                    pushBox(q, st, 0.00, 0.00, 0.00, 1.04, 0.060, 0.52);
                    pushBox(q, st, 0.00, -0.055, 0.00, 0.88, 0.024, 0.40);
                    return q;
                  }
                  function buildTableLegs(now) {
                    const st = tableState(now);
                    const q = [];
                    const lx = 0.36;
                    const lz = 0.17;
                    pushBox(q, st, 0.00, -0.105, -lz, 0.82, 0.032, 0.035);
                    pushBox(q, st, 0.00, -0.105,  lz, 0.82, 0.032, 0.035);
                    pushBox(q, st, -lx, -0.118, 0.00, 0.035, 0.028, 0.36);
                    pushBox(q, st,  lx, -0.118, 0.00, 0.035, 0.028, 0.36);
                    pushBox(q, st, -0.22, -0.142, 0.00, 0.46, 0.022, 0.026);
                    pushBox(q, st,  0.22, -0.142, 0.00, 0.46, 0.022, 0.026);
                    pushBox(q, st, 0.00, -0.158, 0.00, 0.58, 0.018, 0.020);
                    return q;
                  }
                  const topQ = buildTableTop(0);
                  const legQ = buildTableLegs(0);
                  const topMesh = self._makeMesh(topQ, TEX.black, [0.62, 0.58, 0.48], 0.0, false);
                  const legMesh = self._makeMesh(legQ, TEX.black, [0.045, 0.040, 0.035], 0.0, false);
                  function markTableMesh(mesh, part) {
                    mesh.annexAltOnly = true;
                    mesh.annexInterior = true;
                    mesh.annexAltCrowdVisual = true;
                    mesh.annexAltBouncingTable = true;
                    mesh.worldLockedAlcoveFX = true;
                    mesh.altFogUpdater = function(now) {
                      const q = part === 0 ? buildTableTop(now) : buildTableLegs(now);
                      const strobe = Math.min(1.0, self._altAnnexWhiteStrobe || 0.0);
                      if (part === 0) {
                        mesh.flatCol = [
                          0.50 + strobe * 0.42,
                          0.45 + strobe * 0.34,
                          0.36 + strobe * 0.25
                        ];
                      } else {
                        mesh.flatCol = [
                          0.040 + strobe * 0.18,
                          0.035 + strobe * 0.13,
                          0.030 + strobe * 0.10
                        ];
                      }
                      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
                      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q), gl.DYNAMIC_DRAW);
                      mesh.count = q.length / 8;
                    };
                    meshes.push(mesh);
                  }
                  markTableMesh(topMesh, 0);
                  markTableMesh(legMesh, 1);
                }
                addAltBouncingFoldingTable();
                if (!self._altAnnexCrowdStarted) {
                  self._altAnnexCrowdStarted = true;
                  const crowdBase = "files/img/rooms/z4/basement/crowd/";
                  const crowdFiles = [];
                  for (let ci = 1; ci <= 18; ci++) crowdFiles.push(crowdBase + "CROWD" + String(ci).padStart(2, "0") + ".png");
                  const placements = [];
                  const rows = [
                    { z: alcoveFrontZ - 0.42, n: 9,  s: 0.84, f: 0.66 },
                    { z: alcoveFrontZ - 0.82, n: 10, s: 0.88, f: 0.74 },
                    { z: alcoveFrontZ - 1.26, n: 11, s: 0.94, f: 0.84 },
                    { z: alcoveFrontZ - 1.78, n: 12, s: 1.00, f: 0.94 },
                    { z: alcoveFrontZ - 2.36, n: 12, s: 1.03, f: 1.00 },
                    { z: alcoveFrontZ - 3.02, n: 9,  s: 0.98, f: 0.90 },
                    { z: alcoveFrontZ - 3.66, n: 7,  s: 0.92, f: 0.78 }
                  ];
                  for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    for (let k = 0; k < row.n; k++) {
                      const u = row.n === 1 ? 0.5 : k / (row.n - 1);
                      const seed = 100.0 + r * 31.0 + k * 7.0;
                      const x0 = alcoveStartX + 0.34;
                      const x1 = alcoveEndX - 0.34;
                      const cx = x0 + (x1 - x0) * u + (altCrowdHash(seed) - 0.5) * 0.22;
                      const cz = row.z + (altCrowdHash(seed + 1.0) - 0.5) * 0.18;
                      const sc = row.s * (0.90 + altCrowdHash(seed + 2.0) * 0.22);
                      const yaw = (altCrowdHash(seed + 3.0) - 0.5) * 0.26;
                      const fileIndex = (r * 5 + k * 3) % crowdFiles.length;
                      placements.push({ file: crowdFiles[fileIndex], x: cx, z: cz, s: sc, yaw: yaw, seed: seed, fade: row.f });
                    }
                  }
                  const loaded = {};
                  function useLoadedCrowd(path, done) {
                    if (loaded[path]) {
                      if (loaded[path].img && loaded[path].tex) done(loaded[path].img, loaded[path].tex);
                      else loaded[path].wait.push(done);
                      return;
                    }
                    loaded[path] = { img: null, tex: null, wait: [done] };
                    const img = new Image();
                    img.onload = function () {
                      const tex = makeAltCrowdTexture(img);
                      loaded[path].img = img;
                      loaded[path].tex = tex;
                      const waiters = loaded[path].wait.slice();
                      loaded[path].wait.length = 0;
                      for (let wi = 0; wi < waiters.length; wi++) waiters[wi](img, tex);
                    };
                    img.onerror = function () {
                      console.warn("[Zone4] crowd image failed:", path);
                    };
                    img.src = path;
                  }
                  for (let pi = 0; pi < placements.length; pi++) {
                    const pl = placements[pi];
                    useLoadedCrowd(pl.file, function (img, tex) {
                      addAltExtrudedCrowdPerson(img, tex, pl.x, pl.z, pl.s, pl.yaw, pl.seed, pl.fade);
                    });
                  }
                  self.altAnnexCrowdDebug = {
                    mode: "alt-annex-world-fog-far-wall-strobe-no-upstairs-bleed",
                    count: placements.length,
                    sourceCount: crowdFiles.length,
                    noFlatWallCrowd: true,
                    noSpriteCrowd: true,
                    crowdFacesIntoAlcove: true,
                    roundedExtrusionEdges: true,
                    softRoundedVolume: true,
                    fogMachine: true,
                    dynamicFogWisps: true,
                    visibleFogOverlay: true,
                    postFXWhiteStrobe: true,
                    strongerPeripheralBlur: true,
                    randomWhiteStageStrobe: true,
                    peripheralCameraBlur: true,
                    tightCameraSpan: true,
                    hallucinationsRestored: true,
                    farWallStrobeBlockedByWall: true,
                    hangingFogVisible: true,
                    farWallWorldStrobe: true,
                    bouncingFoldingTable: true,
                    bouncingFoldingTableFoldedLegs: true,
                    bouncingFoldingTableSmaller: true,
                    bouncingFoldingTableMoreVertical: true,
                    crowdHiddenFromStairs: true,
                    noScreenSpaceFog: true,
                    worldLockedAlcoveFog: true,
                    altWallsUseBasementWallInsteadOfAltWall: true,
                    noOpaqueCrowdShell: true,
                    altAnnex180SlideTurn: true,
                    backWallBlackQuadRemoved: true,
                    blackFarWallRectangleRemoved: true,
                    stairFrameSealed: true,
                    insideAlcoveSideWallAdded: true,
                    backWallTextureMapped: true,
                    backWallBathroomClubMapped: true,
                    noBackWallTurnaroundFinal: true,
                    noFarWallTurnaround: true,
                    alcoveCrowdZ0: rows[0].z,
                    alcoveCrowdZ1: rows[rows.length - 1].z
                  };
                }
                addAltWallX(alcoveEndX, alcoveBackZ, alcoveFrontZ, [0.015, 0.008, 0.009]);
                addAltWallX(alcoveStartX, alcoveBackZ, alcoveFrontZ, [0.015, 0.008, 0.009]);
                addAltBox(alcoveStartX + 0.36, alcoveEndX - 0.36, annexY1 - 0.085, annexY1 - 0.018, alcoveBackZ + 0.28, alcoveFrontZ - 0.42, [0.070, 0.000, 0.010], TEX.black, 0.0);
                addAltBox(alcoveStartX + 0.36, alcoveEndX - 0.36, annexY0 + 0.018, annexY0 + 0.052, alcoveBackZ + 0.28, alcoveFrontZ - 0.42, [0.034, 0.000, 0.006], TEX.black, 0.0);
                self.altAnnexExitLightWorld = null;
      self.altAnnexStairDoorBulbWorld = pointLocal(altX0 + 0.125, bulbY, 0.0);
                self.altAnnexRoomDebug = {
                  layout: "alt-annex-world-locked-fog-strobe-hidden-from-stairs",
                  alcoveStartX: alcoveStartX,
                  alcoveEndX: alcoveEndX,
                  occluderX0: occluderX0,
                  occluderX1: occluderX1,
                  pathLeftZ: pathLeftZ,
                  pathRightZ: pathRightZ,
                  alcoveFrontZ: alcoveFrontZ,
                  alcoveBackZ: alcoveBackZ,
                  alcoveFrontFlushWithPath: true,
                  noMouthFrame: true,
                  redStageGlowFromBack: true,
                  extrudedCrowd: true,
                  redStageGlowMedium: true,
                  altRoomUsesAltWallOnly: true,
                  occluderZeroThickness: true
                };
              }
              markMeshes(altAnnexSpriteRoomStart, "annexAltOnly");
    }
  };
})();
