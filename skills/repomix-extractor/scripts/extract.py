#!/usr/bin/env python3
"""
Reconstruct a project directory tree from a Repomix markdown export.

Usage:
    python3 extract.py <source_md_path> [dest_dir]

Arguments:
    source_md_path   Required. Path to the Repomix markdown export you were
                      given. This is almost always the uploaded file, which
                      lives under /mnt/user-data/uploads/.
    dest_dir          Optional. Where to write the reconstructed repo.
                      Defaults to /home/claude/repo if you don't pass one.

Example:
    python3 extract.py /mnt/user-data/uploads/repomix-output.md /home/claude/repo

    This reads /mnt/user-data/uploads/repomix-output.md and writes every
    file it finds into /home/claude/repo, recreating the original folder
    structure (e.g. /home/claude/repo/backend/routes/authroutes.py).

Prints a summary line and a JSON manifest path on success so the calling
model can immediately report file counts without re-reading the markdown.
"""
import os
import re
import sys
import json


def extract(source_path: str, dest_dir: str):
    with open(source_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Matches: "## File: <path>" followed by a fenced code block, using
    # either 3-backtick fences (Repomix's default) or 4-backtick fences
    # (used when a file's own content contains a triple-backtick fence).
    pattern = re.compile(
        r"^## File: (.+?)\s*\n(`{3,4})[^\n]*\n(.*?)\n\2\s*$",
        re.MULTILINE | re.DOTALL,
    )

    matches = [(path, code) for path, _fence, code in pattern.findall(content)]

    written = []
    skipped = []

    for raw_path, code in matches:
        rel_path = raw_path.strip()

        # Guard against path traversal / absolute paths escaping dest_dir.
        norm = os.path.normpath(rel_path)
        if norm.startswith("..") or os.path.isabs(norm):
            skipped.append(rel_path)
            continue

        full_path = os.path.join(dest_dir, norm)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, "w", encoding="utf-8") as out:
            out.write(code)

        written.append(rel_path)

    manifest = {
        "source": source_path,
        "dest_dir": dest_dir,
        "files_written": len(written),
        "files_skipped": len(skipped),
        "skipped_paths": skipped,
        "paths": written,
    }

    manifest_path = os.path.join(dest_dir, "_extraction_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract.py <source_md_path> [dest_dir]", file=sys.stderr)
        sys.exit(1)

    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/repo"
    os.makedirs(dst, exist_ok=True)

    result = extract(src, dst)

    print(f"Extracted {result['files_written']} files to {dst}")
    if result["files_skipped"]:
        print(f"WARNING: skipped {result['files_skipped']} unsafe path(s): {result['skipped_paths']}")
    if result["files_written"] == 0:
        print("NO_FILES_EXTRACTED", file=sys.stderr)
        sys.exit(2)
