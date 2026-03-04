import re

src = open("engine.js","r",encoding="utf8").read()

# remove duplicate staticAssets declaration
src = re.sub(r'const staticAssets = \{\};\s*function loadStaticTex', 
             'const staticAssets = {};\nfunction loadStaticTex', 
             src, count=1)

# remove second duplicate declaration
src = re.sub(r'\nconst staticAssets = \{\};\s*function loadStaticTex', 
             '\nfunction loadStaticTex', 
             src, count=1)

# ensure ActiveMode constructor block closes properly
src = src.replace(
"this.vidTexs.forEach(t => this.textures.push(t));",
"this.vidTexs.forEach(t => this.textures.push(t));\n        }\n"
)

open("engine_fixed.js","w",encoding="utf8").write(src)

print("engine_fixed.js written")
