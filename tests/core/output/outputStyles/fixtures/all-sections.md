This file is a merged representation of the entire codebase.

# File Summary

## Purpose
Purpose line 1
Purpose line 2

## File Format
The content is organized as follows:
1. This summary section
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- Guideline one
- a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}

## Notes
- Note one
- Note two

# User Provided Header
Custom header

a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}

# Directory Structure
````
src/
  index.ts
  data file.txt
README.md
````

# Files

## File: src/index.ts
````typescript
export const a = '<b>';

// a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}
````

## File: README.md
````markdown
# Title

```ts
const x = 1;
```

````

## File: src/data file.txt
````

````

## File: Dockerfile
````dockerfile
FROM node:24
````


# Git Diffs
## Git Diffs Working Tree
````diff
diff --git a/a.ts b/a.ts
-old
+new a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}
````

## Git Diffs Staged
````diff
diff --git a/b.ts b/b.ts
+added
````


# Git Logs

## Commit: 2026-01-02 03:04:05 +0900
**Message:** feat: first a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}

**Files:**
- src/index.ts
- README.md

## Commit: 2026-01-01 00:00:00 +0000
**Message:** chore: empty commit

**Files:**


# Instruction
Follow these instructions.

a & b < c > d "e" 'f' `g` h=i {{not-a-template}} {{{raw}}}
