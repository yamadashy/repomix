---
description: Core project guidelines for the Repomix codebase. Apply these rules when working on any code, documentation, or configuration files within the Repomix project.
alwaysApply: true
---

# Repomix

A tool that packs repository contents into a single AI-friendly file. Supports XML, Markdown, JSON, and plain text output formats.

Refer to `README.md` for full project overview and `CONTRIBUTING.md` for contribution procedures.

## Repository Layout

- `src/` — main source code (`cli/`, `config/`, `core/`, `shared/`). Feature-based structure; avoid dependencies between features
- `tests/` — mirrors the `src/` directory structure
- `website/` — documentation website (VitePress); docs live in 15 language directories (`en` + 14 translated locales) under `website/client/src/`
- `browser/` — browser extension

## Coding Guidelines

- Follow the project's coding standards enforced by Biome (`biome.json`)
- Keep each file focused on a single responsibility. Treat ~250 lines as a signal
  to review a file's cohesion, not a mandate to split: split when the file mixes
  multiple responsibilities, but leave it as-is when the length comes from one
  cohesive concern (e.g. large data/config tables)
- Add comments in English where non-obvious logic exists
- Provide corresponding unit tests for new features
- Verify changes by running:
  ```bash
  npm run lint  # Ensure code style compliance
  npm run test  # Verify all tests pass
  ```

## Non-Obvious Rules and Pitfalls

- The config JSON schema under `website/client/src/public/schemas/` is generated
  (`npm run website-generate-schema`; CI regenerates it after merges to `main`).
  Never edit it by hand.
- User-facing option or feature changes must update the docs in all 15 language
  directories under `website/client/src/`, not just `en`.
- Root `npm run lint` does not typecheck the website client. When changing
  `website/client`, verify with `npm run docs:build` in that directory.
- The VitePress build does not validate in-page anchor links; when renaming a
  heading, search the docs for links to its old anchor.
- GitHub Actions steps must be pinned to full commit SHAs with a version comment
  (e.g. `uses: actions/checkout@<sha> # v7.0.0`); pinact and zizmor enforce this in CI.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with scope: `type(scope): Description`
(e.g. `feat(cli): Add new --no-progress flag`)

- Scope: affected area (cli, core, website, security, etc.)
- Description: clear, concise present tense starting with a capital letter
- Commit body: follow the `contextual-commit` skill (`.claude/skills/contextual-commit/SKILL.md`)

## Pull Request Guidelines

- Follow the template at `.github/pull_request_template.md`
- Include a clear summary of changes at the top
- Reference related issues using `#issue-number`
- Combine small, related changes in the same area into one PR rather than splitting them

## Dependencies and Testing

Inject dependencies through a `deps` object parameter for testability:

```typescript
export const functionName = async (
  param1: Type1,
  param2: Type2,
  deps = {
    defaultFunction1,
    defaultFunction2,
  }
) => {
  // Use deps.defaultFunction1() instead of direct call
};
```

- Mock dependencies by passing test doubles through the deps object
- Use `vi.mock()` only when dependency injection is not feasible

## Output Generation

- Include all content without abbreviation, unless specified otherwise
- Optimize for handling large codebases while maintaining output quality
