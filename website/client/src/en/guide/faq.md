---
title: FAQ and Troubleshooting
description: Answers to common Repomix questions about private repositories, output formats, token reduction, remote GitHub repositories, security checks, and AI workflows.
---

# FAQ and Troubleshooting

Use this page when you need a quick answer about choosing the right Repomix workflow, reducing output size, or preparing codebase context for AI assistants.

## General Questions

### What is Repomix used for?

Repomix packs a repository into a single AI-friendly file so you can give an AI assistant broad codebase context without manually copying files. It is useful for code review, bug investigation, refactoring plans, onboarding, documentation, security analysis, and architecture reviews.

### When should I use Repomix instead of an IDE extension or MCP server?

Use the CLI when you want a portable file that works with any AI tool, including ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, or local LLM workflows. Use the MCP server or Claude Code plugins when you want an assistant to request repository context directly from your local environment during an interactive coding session.

### Does Repomix work with private repositories?

Yes. For private repositories, run Repomix locally in a checkout that your machine can already access:

```bash
repomix
```

Repomix uses your local filesystem and git configuration. Review the generated output before sharing it with any external AI service.

### Can Repomix process a public GitHub repository without cloning it?

Yes. Use the `--remote` option with a full URL or `owner/repo` shorthand:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

You can also target a branch, tag, commit, or subdirectory from a supported GitHub URL.

## Output Formats

### Which output format should I choose?

Start with the default XML output if you are unsure:

```bash
repomix
```

Use XML when you want strong structure for Claude or other models that parse tagged context well. Use Markdown when humans will read or edit the packed file. Use JSON when another program will consume the output. Use plain text when you need the simplest possible format.

### How do I change the output format?

Use the `--style` option:

```bash
repomix --style markdown
repomix --style json
repomix --style plain
```

See [Output Formats](/guide/output) for a detailed comparison.

### Can I add custom instructions for the AI assistant?

Yes. Use `output.instructionFilePath` in `repomix.config.json` or provide header text so the generated output includes project-specific guidance. This is useful for coding standards, architecture notes, review goals, and response requirements.

See [Custom Instructions](/guide/custom-instructions) for examples.

## Reducing Token Usage

### The generated file is too large. What should I do?

Narrow the packed context before sending it to an AI assistant:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

For large repositories, combine include and ignore patterns with code compression. You can also split the output or focus on the subsystem related to your question.

### What does `--compress` do?

`--compress` uses Tree-sitter based code compression to keep important structure such as imports, exports, classes, functions, interfaces, and method signatures while removing implementation detail. It is useful when the model needs an architectural overview more than exact line-by-line code.

See [Code Compression](/guide/code-compress) for details.

### Should I remove comments?

Use `--remove-comments` when comments are noisy or consume too many tokens. Keep comments when they contain domain knowledge, API contracts, warnings, or important implementation rationale.

See [Comment Removal](/guide/comment-removal) for the supported behavior.

## Security and Privacy

### Does Repomix upload my code?

The Repomix CLI runs locally and writes an output file on your machine. The website and browser extension have different workflows, so check [Privacy Policy](/guide/privacy) when using hosted or browser-based features.

### How does Repomix avoid including secrets?

Repomix includes Secretlint-based safety checks to detect sensitive values before packing. Treat this as a safety net, not a replacement for reviewing the output yourself. Always inspect generated files before sending private code to an AI provider.

See [Security](/guide/security) for the security model and recommended workflow.

### Should I send a full private codebase to an AI assistant?

Only send code that your organization allows you to share with that AI provider. For sensitive projects, prefer a smaller include pattern, remove unnecessary files, and review the generated output. If possible, use enterprise controls or local models approved by your team.

## Troubleshooting

### Why are files missing from the output?

Repomix respects ignore rules such as `.gitignore`, default ignore patterns, and custom patterns from your configuration. Check your `repomix.config.json`, CLI `--ignore` options, and whether the files are ignored by git.

### Why did Repomix include files I did not want?

Add an ignore pattern:

```bash
repomix --ignore "dist/**,coverage/**,*.log"
```

For repeatable behavior, store ignore patterns in `repomix.config.json`.

### How can I make Repomix output repeatable for a team?

Commit a `repomix.config.json` file with shared output settings, include patterns, ignore patterns, and custom instructions:

```bash
repomix --init
```

Then run `repomix` from the same project root in local development or CI.

### How can I use Repomix in CI?

Use the GitHub Actions integration to generate packed repository output as part of a workflow. This is useful for automated review, artifact creation, or AI analysis in controlled pipelines.

See [Using Repomix with GitHub Actions](/guide/github-actions).

## Related Resources

- [Basic Usage](/guide/usage) - Common CLI workflows
- [Command Line Options](/guide/command-line-options) - Full CLI option reference
- [Prompt Examples](/guide/prompt-examples) - Prompts for code review, security analysis, and documentation
- [Use Cases](/guide/use-cases) - Practical AI workflows with Repomix
