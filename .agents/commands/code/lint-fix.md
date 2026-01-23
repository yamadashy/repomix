Run `npm run lint` and fix any errors.

## Lint Tools (in order)
1. Biome (`biome check --write`) - Formatter + linter, auto-fixes
2. oxlint (`oxlint --fix`) - Fast linter, auto-fixes
3. tsgo (`--noEmit`) - Type checking (manual fix required)
4. secretlint - Secret detection

## Config Files
- `biome.json`, `.oxlintrc.json`, `.secretlintrc.json`
