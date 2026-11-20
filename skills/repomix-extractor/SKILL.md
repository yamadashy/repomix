---
name: repomix-extractor
description: Reconstructs a real project directory (correct folder structure, filenames, and file contents) from a Repomix markdown export (a single .md file, usually named repomix-output.md, containing many "## File: path" sections each followed by a fenced code block). Use this skill immediately whenever the user uploads a file that looks like a Repomix export, whenever they mention "repomix," or whenever an uploaded .md file turns out to contain repeated "## File:" headers — even if the user just says "look at this repo" or "help me refactor this codebase" without naming Repomix explicitly. Once extracted, treat the reconstructed folder as the actual repository for all subsequent reading, searching, and editing.
---

# Repomix Extractor

## Why this skill exists

Repomix flattens an entire codebase into one markdown file so it can be pasted or uploaded somewhere. That's great for transport, but it's a bad shape to actually *work* in: grepping across a 7,000-line markdown blob, or asking Claude to "find the auth middleware," wastes turns re-reading the same file and is error-prone compared to just having the real files on disk.

The fix is mechanical: turn the markdown back into a real directory tree once, up front, and then interact with it exactly like a normal checked-out repository (`find`, `grep`, `view`, edits, etc.) for the rest of the conversation.

## When to trigger

Reconstruct immediately, without asking permission, whenever any of these are true:
- The uploaded file is named `repomix-output.md` (or similar) or the user says "repomix."
- An uploaded `.md` file contains multiple `## File: <path>` headers followed by code fences — this is the Repomix signature regardless of filename.
- The user asks you to explore, review, or modify "this codebase / repo / project" and the only thing they've given you is a single markdown file.

Do not ask the user to confirm the format or manually describe the structure — detect it and go straight to extraction.

## What Repomix output looks like

```markdown
## File: src/app/page.js
\`\`\`javascript
export default function Home() {
    ...
}
\`\`\`
```

This repeats once per file, in order, for every file in the original repo. There's also a preamble (summary + directory tree) before the first `## File:` — ignore it, it's not needed for extraction.

Repomix's default output fences each file with **3 backticks**. Some files use 4-backtick fences instead — this happens when the file's own content contains a literal triple-backtick fence (e.g. a markdown file with an embedded code block), so Repomix widens the outer fence to avoid ambiguity. `scripts/extract.py` handles both automatically by matching whichever fence width (3 or 4) opens each block and requiring the same width to close it — you don't need to detect or specify which one a given export uses.

## Execution: one command, no manual preview

Don't run `wc -l`, `head`, `sed -n`, or otherwise page through the markdown file to "get a feel for it" first — that only spends turns without changing what you do next. Go straight to extraction:

```bash
python3 <this-skill's-scripts-dir>/extract.py <source_md_path> [dest_dir]
```

**Arguments:**
- `source_md_path` — required. The Repomix export you were given, normally the uploaded file under `/mnt/user-data/uploads/`.
- `dest_dir` — optional. Where to write the reconstructed repo. Defaults to `/home/claude/repo` if omitted.

**Example**, using the paths you'll typically actually see:

```bash
python3 /mnt/skills/repomix-extractor/scripts/extract.py /mnt/user-data/uploads/repomix-output.md /home/claude/repo
```

This reads `/mnt/user-data/uploads/repomix-output.md` and writes every file it finds into `/home/claude/repo`, recreating the original structure exactly (e.g. `/home/claude/repo/backend/routes/authroutes.py`). Substitute the real skill install path and the real uploaded filename for your actual run.

The script:
1. Reads the whole markdown file once.
2. Finds every `## File: <path>` block with its fenced code content.
3. Creates any missing parent directories.
4. Writes each file's exact content to `<dest_dir>/<path>`.
5. Writes `_extraction_manifest.json` in the dest dir listing every path it wrote (and any it skipped for safety — see below).
6. Prints `Extracted N files to <dest_dir>`.

That single call is the entire extraction step. Read the printed count (and manifest if you need the file list) rather than re-parsing the markdown yourself.

## After extraction

- Treat `/home/claude/repo` (or whatever dest_dir you used) as the real project root from here on.
- Use normal filesystem tools — `find`, `grep`, `view`, `str_replace` — directly against it, the same way you would with a freshly cloned git repo.
- Do not go back and re-read `repomix-output.md`. If you need to check something about a file, read the reconstructed copy, not the markdown.
- If the user uploads a *second* Repomix export in the same conversation (e.g., an updated snapshot), re-run the script — it overwrites in place, which is what you want for picking up changes.

## Fast workflow for edit requests

When the user asks for a change to the reconstructed repo, follow this sequence every time. It keeps a typical edit request down to a handful of tool calls.

1. **Extract once.** Run `extract.py` a single time. Do not page through the markdown first, and do not go back to it afterward.
2. **Search, don't read.** Use `grep` with keywords from the request to locate the relevant files. Open only the files it points to.
3. **Read the project's guidelines once.** If the repo has contribution or style guides, or docs that track changes, read them in the same call as the search. They show the expected conventions and which docs need updating alongside the change, so no second pass is needed.
4. **Find the root cause before editing.** Look for the smallest fix. Often a behavior change comes down to one formula or one value. Change that, then adjust only the dependent pieces.
5. **Batch the edits.** Apply all file changes in a single script using exact string replacements, and copy every changed file to `/mnt/user-data/outputs` in that same call. Do not make one edit call per file, and do not re-open each file afterward. Print the relevant changed lines in the same call as the sanity check.
6. **Present once.** Call `present_files` a single time with all changed files, preserving relative paths, then give a short summary of what changed.

These steps sit alongside the coding rules below; the rules govern how the code looks, this workflow governs how few steps it takes.

## Validation

After running the script:
- If it prints `Extracted 0 files` or exits with `NO_FILES_EXTRACTED`, the file likely isn't a standard Repomix markdown export at all, or uses a different format (e.g., Repomix's XML or plain-text output modes instead of markdown) — the bundled script already handles both 3- and 4-backtick fences, so a zero count isn't a fence-width issue. Open the first ~50 lines of the source file to check the actual header/fence pattern, then adjust the regex in a one-off Python snippet rather than re-running the bundled script blindly.
- If it reports skipped paths (shown as a `WARNING` line), those were headers with `../` or absolute paths that the script refused to write outside `dest_dir` for safety. Mention this to the user rather than silently dropping files.
- Otherwise, no further verification is needed — the script either writes a file with byte-for-byte fenced content or it doesn't extract it at all, so a nonzero count is a reliable success signal.

## Notes on scope

This skill only handles the **Markdown** export format (the one shown above, using `## File:` headers and fenced code blocks), since that's what Repomix produces by default and what you'll encounter almost always. If a user's export instead uses XML-style `<file path="...">` tags or Repomix's plain-text separators, say so, and adapt `scripts/extract.py`'s regex for that run rather than assuming the bundled version handles it — don't silently produce a wrong or empty extraction.

## Coding rules for any edits made inside the reconstructed repo

Once the repo is reconstructed and you're asked to make changes to it, every code edit and every file you present back follows these rules without exception:

- **Present the actual changed file(s) after editing** — don't just describe the change in prose; write the modified file to disk and share it.
- **No comments** in the code you write or leave behind.
- **No explanations** accompanying the code — the code is the deliverable, not a write-up of what changed.
- **No extra blank lines** — don't add blank lines for visual separation that weren't already part of the existing style.
- **Preserve 100% of existing functionality, UI, logic, and design** — a requested change touches only what it needs to; nothing else about behavior or appearance shifts as a side effect.
- **Keep naming and imports unchanged** unless the change specifically requires renaming or a new import.
- **Inline simple logic where possible** rather than introducing new helper variables/functions for something trivial.
- **Remove redundancy without changing behavior** if you notice it directly in code you're already touching — don't go hunting for unrelated cleanup elsewhere.
- **Match the existing formatting/style exactly** — quote style, spacing, indentation, bracket placement, whatever convention the surrounding file already uses.
- **Touch only the lines that require a change.** Everything else in the file stays byte-for-byte identical — no reflowing, no reformatting untouched code, no reordering.

These rules apply to every subsequent edit in the conversation, not just the first one — carry them forward even after several rounds of changes.
