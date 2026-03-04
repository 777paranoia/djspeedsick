import re
import shutil
from pathlib import Path

FILE = Path("compiled_output.txt")

if not FILE.exists():
    print("compiled_output.txt not found")
    exit(1)

backup = FILE.with_suffix(".txt.bak")
shutil.copy2(FILE, backup)
print("Backup created:", backup)

code = FILE.read_text()

# remove existing RAF calls
code = re.sub(r'requestAnimationFrame\s*\(\s*render\s*\)\s*;', '', code)

governor = """

/* ===== 30 FPS FRAME GOVERNOR ===== */

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let __lastFrameTime = 0;

function __frameGovernor(now){
    if(now - __lastFrameTime >= FRAME_INTERVAL){
        __lastFrameTime = now;
        render(now);
    }
    requestAnimationFrame(__frameGovernor);
}

requestAnimationFrame(__frameGovernor);

"""

code = code.rstrip() + governor

FILE.write_text(code)

print("30 FPS governor injected into compiled_output.txt")