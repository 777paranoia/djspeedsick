#!/bin/bash

FILE="index.html"

# Replace existing grid hover JS block with correct films.html-style cursor hover
sed -i '' '/const images = document.querySelectorAll/,/img.addEventListener('"'"'mouseleave'"'"')/c\
<script>\
document.addEventListener("DOMContentLoaded", () => {\
    const images = document.querySelectorAll("#imageGridContainer .grid-item");\
    const tooltip = document.getElementById("grid-tooltip");\
    const gridColumns = 3;\
\
    const details = {\
        grid1:"UNIX666-18",\
        grid2:"INTERDEPRAVITY",\
        grid3:"BPP-6004",\
        grid4:"UNIX666-17",\
        grid5:"UNIX666-16",\
        grid6:"UNIX666-14",\
        grid7:"UNIX666-13",\
        grid8:"UNIX666-12",\
        grid9:"RECYCLED MUSIC"\
    };\
\
    function updateGrid() {\
        const container = document.getElementById("imageGridContainer");\
        const cw = container.clientWidth;\
        const ch = container.clientHeight;\
        const size = Math.min(cw, ch) / 3;\
        const gap = size * 0.12;\
        const totalW = (3 * size) + (2 * gap);\
        const startX = (cw - totalW) / 2;\
        const rows = Math.ceil(images.length / 3);\
        const totalH = (rows * size) + ((rows - 1) * gap);\
        const startY = (ch - totalH) / 2;\
\
        images.forEach((img, i) => {\
            const row = Math.floor(i / 3);\
            const col = i % 3;\
            img.style.width = size + "px";\
            img.style.height = size + "px";\
            img.style.left = (startX + col * (size + gap)) + "px";\
            img.style.top = (startY + row * (size + gap)) + "px";\
        });\
    }\
\
    updateGrid();\
    window.addEventListener("resize", updateGrid);\
\
    images.forEach((img, index) => {\
        const col = index % 3;\
\
        img.addEventListener("mouseenter", () => {\
            tooltip.innerHTML = details[img.id] || "";\
            tooltip.style.display = "block";\
        });\
\
        img.addEventListener("mousemove", event => {\
            const x = event.clientX;\
            const y = event.clientY;\
            const pad = 12;\
            tooltip.style.top = (y - tooltip.offsetHeight / 2) + "px";\
\
            if (col === 0) {\
                tooltip.style.left = (x + pad) + "px";\
            } else if (col === 1) {\
                tooltip.style.left = (x - tooltip.offsetWidth / 2) + "px";\
            } else {\
                tooltip.style.left = (x - tooltip.offsetWidth - pad) + "px";\
            }\
        });\
\
        img.addEventListener("mouseleave", () => {\
            tooltip.style.display = "none";\
        });\
    });\
});\
</script>' $FILE

echo "✔ Tooltip cursor logic patched successfully."
