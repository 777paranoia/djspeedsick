#!/usr/bin/env node
/**
 * build-bundle.js
 *
 * 1. Zips a timestamped backup of all JS files being bundled + all HTML files.
 * 2. Minifies + concatenates:
 *      bundle-modes.js  ← all modes/*.js
 *      bundle-core.js   ← brain-monitor, debug-ui, engine(1-4), gallery,
 *                         glsl-core, player, site-ui, tutorial, videos
 * 3. Writes bundle-manifest.json (byte offsets + original HTML tag blocks).
 * 4. Patches each HTML file that loads any bundled script — replaces those
 *    individual <script> tags with the two bundle tags.
 * 5. Stubs tutorial.js (site-ui.js injects it dynamically; stub prevents
 *    double-execution since the real code is already in bundle-core.js).
 * 6. Optional: pass --delete-sources to remove bundled source files.
 *
 * Usage:  node build-bundle.js [--delete-sources]
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const ROOT = __dirname;
const DELETE_SOURCES = process.argv.includes("--delete-sources");

// ─── file lists (order = execution order) ────────────────────────────────────

const MODE_FILES = [
  "modes/mode1.js",
  "modes/mode2.js",
  "modes/mode-bh.js",
  "modes/mode3.js",
  "modes/mode4.js",
  "modes/mode5.js",
  "modes/mode6.js",
  "modes/mode7.js",
  "modes/mode9.js",
  "modes/mode-neighborhood.js",
  "modes/mode-right.js",
  "modes/mode-back.js",
  "modes/mode-left.js",
  "modes/mode-left2.js",
  "modes/mode-right2.js",
  "modes/mode-bedroom3.js",
  "modes/mode-cabin.js",
  "modes/mode-door.js",
  "modes/mode-elevator.js",
  "modes/mode-station.js",
  "modes/mode-alt-annex.js",
  "modes/mode-annex.js",
  "modes/mode-laptop.js",
  "modes/mode-island.js",
  "modes/mode-theater.js",
];

const CORE_FILES = [
  "site-ui.js",
  "glsl-core.js",
  "engine.js",
  "engine2.js",
  "engine3.js",
  "engine4.js",
  "brain-monitor.js",
  "player.js",
  "videos.js",
  "gallery.js",
  "debug-ui.js",
  "tutorial.js",
];

const HTML_FILES = [
  "index.html",
  "desktop.html",
  "doom.html",
  "terminal.html",
  "portfolio.html",
];

const BUNDLE_TAGS =
  '<script src="bundle-modes.js"></script>' +
  '<script src="bundle-core.js"></script>';

// ─── helpers ─────────────────────────────────────────────────────────────────

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function ensureTerser() {
  const local = path.join(ROOT, "node_modules", "terser");
  if (fs.existsSync(local)) return require(local);
  try {
    return require("terser");
  } catch (_) {}
  console.log("terser not found — installing locally…");
  execSync("npm install --save-dev terser", { cwd: ROOT, stdio: "inherit" });
  return require(path.join(ROOT, "node_modules", "terser"));
}

// ─── step 1: backup (JS files + HTML files) ──────────────────────────────────

function createBackup(jsFiles) {
  const ts = timestamp();
  const zipName = `backup-${ts}.zip`;
  const tmpZip = path.join(os.tmpdir(), zipName);
  const zipPath = path.join(ROOT, zipName);

  // include both JS sources and HTML files in the backup
  const allToBackup = [
    ...jsFiles,
    ...HTML_FILES.map((f) => path.join(ROOT, f)),
  ].filter((f) => fs.existsSync(f));

  const rel = allToBackup.map((f) => JSON.stringify(path.relative(ROOT, f)));

  try {
    execSync(`zip ${JSON.stringify(tmpZip)} ${rel.join(" ")}`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    fs.copyFileSync(tmpZip, zipPath);
    try {
      fs.unlinkSync(tmpZip);
    } catch (_) {}
    console.log(`✓ backup → ${zipName}`);
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`✗  zip failed — aborting before any minification: ${msg}`);
    process.exit(1);
  }
  return zipName;
}

// ─── step 2: build one bundle ────────────────────────────────────────────────

async function buildBundle(terser, files, outName) {
  const pieces = [];
  const chunks = [];
  let cursor = 0;

  for (const file of files) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
      console.warn(`  ⚠  missing: ${file} — skipped`);
      continue;
    }

    const code = fs.readFileSync(src, "utf8");
    let minified;

    try {
      const result = await terser.minify(code, {
        compress: { passes: 2, drop_console: false, drop_debugger: false },
        mangle: false,
        format: { comments: false },
      });
      minified = result.code;
    } catch (err) {
      console.warn(`  ⚠  terser fallback for ${file}: ${err.message}`);
      minified = code
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\n{3,}/g, "\n")
        .trim();
    }

    const sep = pieces.length > 0 ? "\n" : "";
    const piece = sep + minified;
    const nbytes = Buffer.byteLength(piece, "utf8");

    chunks.push({ file, start: cursor, length: nbytes });
    pieces.push(piece);
    cursor += nbytes;

    console.log(`  • ${file}`);
  }

  const bundle = pieces.join("");
  fs.writeFileSync(path.join(ROOT, outName), bundle, "utf8");

  const kb = (Buffer.byteLength(bundle, "utf8") / 1024).toFixed(1);
  console.log(`✓ ${outName}  (${chunks.length} files, ${kb} KB)`);
  return chunks;
}

// ─── step 3: patch HTML files ────────────────────────────────────────────────

const TAG_RE = /<script\s+src="([^"?]+)(?:\?[^"]*)?"><\/script>/g;
const BUNDLE_RE =
  /<script\s+src="bundle-modes\.js"><\/script><script\s+src="bundle-core\.js"><\/script>/;

function extractOrigBlock(html) {
  const allBundled = new Set([...MODE_FILES, ...CORE_FILES]);
  let block = "";
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(html)) !== null) {
    if (allBundled.has(m[1])) block += m[0];
  }
  return block;
}

function patchHTML(zipName) {
  const allBundled = new Set([...MODE_FILES, ...CORE_FILES]);
  const htmlPatches = {};

  for (const htmlFile of HTML_FILES) {
    const p = path.join(ROOT, htmlFile);
    if (!fs.existsSync(p)) continue;

    let html = fs.readFileSync(p, "utf8");

    // Already patched — recover original block from the backup zip
    if (BUNDLE_RE.test(html)) {
      if (zipName) {
        try {
          const zipPath = path.join(ROOT, zipName);
          const orig = execSync(
            `unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(htmlFile)}`,
            { cwd: ROOT },
          ).toString();
          const block = extractOrigBlock(orig);
          if (block) {
            htmlPatches[htmlFile] = block;
            console.log(
              `  • ${htmlFile} (already patched — tag block recovered from backup)`,
            );
          }
        } catch (_) {
          console.warn(
            `  ⚠  ${htmlFile} already patched and backup unreadable — skipping`,
          );
        }
      } else {
        console.warn(
          `  ⚠  ${htmlFile} already patched and no backup available — skipping`,
        );
      }
      continue;
    }

    // Normal case — patch fresh HTML
    let inserted = false;
    let origBlock = "";

    TAG_RE.lastIndex = 0;
    const patched = html.replace(TAG_RE, (match, src) => {
      if (!allBundled.has(src)) return match;
      origBlock += match;
      if (!inserted) {
        inserted = true;
        return BUNDLE_TAGS;
      }
      return "";
    });

    if (inserted) {
      fs.writeFileSync(p, patched, "utf8");
      htmlPatches[htmlFile] = origBlock;
      console.log(`  • ${htmlFile}`);
    }
  }

  return htmlPatches;
}

// ─── step 4: manifest ────────────────────────────────────────────────────────

function writeManifest(modeChunks, coreChunks, htmlPatches, zipName) {
  const manifest = {
    built: new Date().toISOString(),
    backup: zipName || null,
    htmlPatches,
    bundles: {
      "bundle-modes.js": modeChunks,
      "bundle-core.js": coreChunks,
    },
  };
  fs.writeFileSync(
    path.join(ROOT, "bundle-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  console.log("✓ bundle-manifest.json");
}

// ─── optional step 6: delete source files ────────────────────────────────────

function deleteSourceFiles() {
  const allFiles = [...MODE_FILES, ...CORE_FILES];
  let deleted = 0;

  for (const file of allFiles) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    fs.unlinkSync(p);
    deleted++;
  }

  // remove modes/ directory if now empty
  const modesDir = path.join(ROOT, "modes");
  if (fs.existsSync(modesDir)) {
    const remaining = fs.readdirSync(modesDir);
    if (remaining.length === 0) {
      fs.rmdirSync(modesDir);
      console.log("✓ modes/ directory removed");
    } else {
      console.log(
        `  modes/ still has ${remaining.length} file(s) — left in place`,
      );
    }
  }

  console.log(`✓ ${deleted} source file(s) removed`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== build-bundle.js ===\n");

  const allJS = [...MODE_FILES, ...CORE_FILES].map((f) => path.join(ROOT, f));

  console.log("[ 1 / 6 ]  creating backup (JS + HTML)…");
  const zipName = createBackup(allJS);
  // backup must exist before any minification proceeds
  if (!zipName || !fs.existsSync(path.join(ROOT, zipName))) {
    console.error("✗  backup not confirmed on disk — aborting");
    process.exit(1);
  }

  const terser = ensureTerser();

  console.log("\n[ 2 / 6 ]  building bundle-modes.js…");
  const modeChunks = await buildBundle(terser, MODE_FILES, "bundle-modes.js");

  console.log("\n[ 3 / 6 ]  building bundle-core.js…");
  const coreChunks = await buildBundle(terser, CORE_FILES, "bundle-core.js");

  console.log("\n[ 4 / 6 ]  patching HTML files…");
  const htmlPatches = patchHTML(zipName);

  console.log("\n[ 5 / 6 ]  writing manifest…");
  writeManifest(modeChunks, coreChunks, htmlPatches, zipName);

  if (DELETE_SOURCES) {
    console.log("\n[ 6 / 6 ]  removing source files…");
    deleteSourceFiles();
  } else {
    console.log(
      "\n[ 6 / 6 ]  source files kept (pass --delete-sources to remove them)",
    );
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
