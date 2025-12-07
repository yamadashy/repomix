---
name: lint-fixer
description: "Use this skill to run npm run lint and fix linting issues. Triggers on fixing lint errors after code changes or validating code against project style guidelines."
---

# Lint Fixer

Fix linting issues while preserving code functionality.

## Lint Tools

`npm run lint` runs 4 tools in sequence:

1. **Biome** (`biome check --write`) - Formatter + linter, auto-fixes
2. **oxlint** (`oxlint --fix`) - Fast JS/TS linter, auto-fixes
3. **tsgo** (`tsgo --noEmit`) - TypeScript type checking
4. **secretlint** - Detects secrets/credentials

## Workflow

1. Run `npm run lint` to identify issues
2. Review errors by category (type errors vs style vs secrets)
3. Fix issues - Biome/oxlint auto-fix most style issues
4. Run `npm run lint` again to verify
5. Run `npm run test` to ensure no breakage

## Config Files

- `biome.json` - Formatting rules (2 spaces, 120 chars, single quotes)
- `.oxlintrc.json` - JS/TS lint rules
- `.secretlintrc.json` - Secret detection rules

## Key Points

- Biome/oxlint auto-fix most issues; review changes
- Type errors (tsgo) require manual fixes
- Never change code behavior when fixing lint
- Keep files under 250 lines
