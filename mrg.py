import sys
import os

COMMENT_STYLES = {
    ".py": "#",
    ".sh": "#",
    ".rb": "#",
    ".js": "//",
    ".ts": "//",
    ".c": "//",
    ".cpp": "//",
    ".h": "//",
    ".hpp": "//",
    ".java": "//",
    ".cs": "//",
    ".go": "//",
    ".rs": "//",
    ".php": "//",
    ".swift": "//",
    ".kt": "//",
    ".scala": "//",
    ".css": "/*",
    ".html": "<!--",
    ".xml": "<!--",
    ".sql": "--"
}

def get_comment_prefix(ext):
    return COMMENT_STYLES.get(ext, "#")

def format_title(filename):
    ext = os.path.splitext(filename)[1].lower()
    prefix = get_comment_prefix(ext)

    if prefix == "/*":
        return f"/* ===== {filename} ===== */\n"
    elif prefix == "<!--":
        return f"<!-- ===== {filename} ===== -->\n"
    else:
        return f"{prefix} ===== {filename} =====\n"

def compile_files(files, output="compiled_output.txt"):
    with open(output, "w", encoding="utf-8") as out:
        for file in files:
            if not os.path.exists(file):
                print(f"Skipping missing file: {file}")
                continue

            title = format_title(file)
            out.write(title)

            with open(file, "r", encoding="utf-8") as f:
                out.write(f.read())

            out.write("\n\n")

    print(f"Compiled output written to {output}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python compile.py file1 file2 file3 ...")
        sys.exit(1)

    compile_files(sys.argv[1:])
