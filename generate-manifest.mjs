#!/usr/bin/env node
/* =============================================================================
   generate-manifest.mjs  —  builds manifest.json for the gallery wall.

   Scans a folder of images, reads each image's pixel dimensions straight from
   the file header (no dependencies, no npm install), and writes a manifest the
   wall page can lay out instantly.

   USAGE
     node generate-manifest.mjs [galleryDir] [outFile]

   DEFAULTS
     galleryDir = ./files/art/gallery
     outFile    = <galleryDir>/manifest.json

   Re-run it any time you add or remove artwork.
   ========================================================================== */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const galleryDir = process.argv[2] || join('files', 'art', 'gallery');
const outFile    = process.argv[3] || join(galleryDir, 'manifest.json');

const EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif']);

// ---- dimension readers (parse just the header bytes) ------------------------
function pngSize(b) {
  // signature 8 bytes, IHDR length+type 8 bytes, then width/height (BE uint32)
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function gifSize(b) {
  if (b.length < 10 || b.toString('ascii', 0, 3) !== 'GIF') return null;
  return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
}
function jpgSize(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    // SOF markers carry the frame size (skip C4/C8/CC which aren't SOF)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}
function bmpSize(b) {
  if (b.length < 26 || b.toString('ascii', 0, 2) !== 'BM') return null;
  return { w: b.readInt32LE(18), h: Math.abs(b.readInt32LE(22)) };
}
function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = b.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') { return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }; }
  if (fmt === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8X') { // extended: 24-bit dims at offset 24/27, value+1
    const w = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
    const h = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1;
    return { w, h };
  }
  return null;
}
function readSize(file, ext) {
  const b = readFileSync(file);
  switch (ext) {
    case '.png': return pngSize(b);
    case '.gif': return gifSize(b);
    case '.jpg':
    case '.jpeg': return jpgSize(b);
    case '.bmp': return bmpSize(b);
    case '.webp': return webpSize(b);
    default: return null; // .avif etc. — page will measure in-browser
  }
}

// ---- scan -------------------------------------------------------------------
let files;
try {
  files = readdirSync(galleryDir).filter((f) => EXT.has(extname(f).toLowerCase()) && !f.startsWith('.'));
} catch (e) {
  console.error(`Could not read folder: ${galleryDir}\n  ${e.message}`);
  process.exit(1);
}
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const manifest = [];
let measured = 0, unmeasured = 0;
for (const f of files) {
  const full = join(galleryDir, f);
  if (!statSync(full).isFile()) continue;
  const ext = extname(f).toLowerCase();
  let size = null;
  try { size = readSize(full, ext); } catch { /* fall through */ }
  if (size && size.w && size.h) { manifest.push({ src: f, w: size.w, h: size.h }); measured++; }
  else { manifest.push({ src: f }); unmeasured++; } // page measures these in-browser
}

writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${manifest.length} image(s) to ${outFile}`);
console.log(`  ${measured} with dimensions${unmeasured ? `, ${unmeasured} to be measured in-browser` : ''}.`);
if (!manifest.length) console.log('  (No images found — check the folder path.)');
