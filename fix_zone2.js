const fs = require("fs");

const FILE = "engine2.js";   // your real file
let src = fs.readFileSync(FILE, "utf8");

/* remove duplicate makeFBO(w,h) block */
src = src.replace(
/makeFBO\s*(\s*w\s*,\s*h\s*)\s*{[\s\S]*?return\s*{\s*fbo\s*,\s*tex\s*,\s*w\s*,\s*h\s*};[\s\S]*?}/g,
""
);

/* fix all mirror viewport calls */
src = src.replace(
/gl.viewport\s*(\s*0\s*,\s*0\s*,\s*this.mirrorFBO.w\s*,\s*this.mirrorFBO.h\s*)/g,
"gl.viewport(0,0,cWidth,cHeight)"
);

/* backup viewport fix in case width/height property names appear */
src = src.replace(
/gl.viewport\s*(\s*0\s*,\s*0\s*,\s*this.mirrorFBO.(width|w)\s*,\s*this.mirrorFBO.(height|h)\s*)/g,
"gl.viewport(0,0,cWidth,cHeight)"
);

fs.writeFileSync(FILE, src);

console.log("engine2.js mirror bug patched successfully.");
