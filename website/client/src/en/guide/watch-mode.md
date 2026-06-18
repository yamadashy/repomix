---
title: Watch Mode
description: Automatically re-pack your codebase on file changes with Repomix watch mode, including debouncing, ignore handling, and option compatibility.
---

# Watch Mode

Repomix can watch your codebase and automatically re-pack it whenever files change. This keeps the output file up to date while you work, which is handy when you want to feed a continuously refreshed snapshot to an AI assistant.

## Usage

Start watch mode with the `-w` (or `--watch`) flag:

```bash
repomix --watch
```

Repomix performs an initial pack, then keeps running and re-packs on every change. You can combine watch mode with the usual options:

```bash
# Watch a specific set of files
repomix -w --include "src/**/*.ts"

# Watch with a custom output file and format
repomix --watch -o output.md --style markdown
```

Press `Ctrl+C` to stop watching.

## How It Works

- **Initial pack**: Repomix packs the codebase once, then reports how many files it is watching.
- **Change detection**: New, changed, and deleted files all trigger a re-pack.
- **Debouncing**: Rapid bursts of changes (for example, switching branches or saving many files at once) are coalesced. Repomix waits 300 ms after the last change before re-packing, so a flurry of edits results in a single rebuild.
- **Timestamps**: After each rebuild, Repomix prints a timestamp (`Rebuilt at HH:MM:SS`) so you can tell when the output was last refreshed.

## Ignored Files

Watch mode honors the same ignore rules as a normal run: `.gitignore`, `.repomixignore`, the built-in default patterns (such as `node_modules` and `.git`), and any `--ignore` patterns you pass. Ignored directories are not watched, which keeps watch mode efficient on large projects.

## Option Compatibility

Watch mode only works with local directories, so it cannot be combined with the following options (whether you set them on the command line or in your config file):

- `--remote` or a positional remote repository URL — watch mode is local-only
- `--stdout` or `--stdin` — streaming modes have no persistent output file to refresh
- `--split-output`
- `--skill-generate`
- `--copy` — re-packing on every change would repeatedly overwrite the clipboard

If you combine one of these with `--watch`, Repomix exits with an error explaining the conflict.

## Related Resources

- [Command Line Options](/guide/command-line-options) - Full CLI reference, including `--watch`
- [Basic Usage](/guide/usage) - Other ways to run Repomix
- [Configuration](/guide/configuration) - Set default output options in your config file
