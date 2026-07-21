---
title: Security
description: Learn how Repomix uses Secretlint and safety checks to detect secrets, API keys, tokens, credentials, and sensitive repository content before packing.
---

# Security

## Security Check Feature

Repomix uses [Secretlint](https://github.com/secretlint/secretlint) to detect sensitive information in your files:
- API keys
- Access tokens
- Credentials
- Private keys
- Environment variables

## Configuration

Security checks are enabled by default.

Disable via CLI:
```bash
repomix --no-security-check
```

Or in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Security Measures

1. **Binary File Handling**: Binary file contents are excluded from output, but their paths are listed in the directory structure for complete repository overview
2. **Git-Aware**: Respects `.gitignore` patterns
3. **Automated Detection**: Scans for common security issues:
  - AWS credentials
  - Database connection strings
  - Authentication tokens
  - Private keys

## Remote Repository Config Trust

When you pack a remote repository with `--remote`, Repomix treats that repository's config as untrusted code.

### Why a config file is code

A `repomix.config.*` is not just data:

- `repomix.config.ts` / `.js` / `.mjs` is **executed** when it is loaded.
- `input.processors` runs external commands on matching files.
- `output.instructionFilePath` and include patterns using `../` read files outside the repository.

Loading an unreviewed config from an unfamiliar repository is therefore comparable to running its `Makefile`, or to `npm install` on a package with lifecycle scripts.

### Default: remote configs are never loaded

Repomix ignores a cloned repository's config unless you explicitly ask for it. Your global config and CLI options still apply. If you never pass the flag below, nothing in this section can affect you.

### Opting in

```bash
# Using CLI flag
repomix --remote user/repo --remote-trust-config

# Using environment variable
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

This grants the remote config the same trust as a config you wrote yourself. Only use it for repositories you trust and have reviewed.

### Confirmation prompt

On an interactive terminal, Repomix shows the config that is about to run and asks before loading it:

| Choice | Effect |
| --- | --- |
| **Yes, once** | Trust this run only. |
| **Yes, and don't ask again for this repository** | Remember the decision (see below). |
| **No** (default selection) | Abort without loading the config. |

The config shown to you is written by the repository's author, so Repomix makes sure the display cannot be manipulated:

- **Control and ANSI sequences are escaped**, so a config cannot repaint the terminal or scroll the warning out of view.
- **Bidirectional and invisible characters are escaped**, so the text you read is the text that runs ([Trojan Source](https://trojansource.codes/)).
- **The output is capped** by both line count and byte size, so a padded config cannot push the warning off screen.
- **Every config line is prefixed**, so a config cannot forge Repomix's own separators or messages.
- **Symlinks are refused.** Git preserves symlinks, so a repository can ship a `repomix.config.json` that points outside the clone. Repomix requires the config to be a regular file inside the cloned tree — otherwise the bytes you reviewed would not be the bytes that run.

### Remembering a decision

Choosing "don't ask again" stores a marker under your temporary directory (`$TMPDIR/repomix/trusted-remotes/`), readable and writable only by your user account.

The marker is **content-pinned**: it records a hash of the config you approved. If that repository later ships a different config, the hash no longer matches and **you are asked again** — the same model as `direnv allow`.

::: warning Scope of the pin
The hash covers the entry config file only. A `.ts` / `.js` config can `import` other files, and `input.processors` can invoke external scripts; neither is hashed. A repository you have already trusted can change those while the entry file stays identical. This is why executable configs are labeled as such in the prompt — treat "don't ask again" as trust in the repository, not only in the file you read.
:::

Markers live in the temporary directory, so decisions decay when your OS clears it. That is intentional: expiring toward "ask again" is the safe direction.

### When the prompt is skipped

| Situation | Behavior |
| --- | --- |
| `--force` is passed | Trusted without asking. The flag means you accept the consequences; a notice is printed to stderr. |
| Non-interactive shell (CI, pipes) | Trusted without asking, preserving existing automation. A notice is printed to stderr. |
| Repository already trusted | Loaded without asking, as long as the config is unchanged. |
| An absolute `--config` is used | The cloned repository's own config is never loaded, so there is nothing to confirm. |
| The clone has no config file | Nothing to trust. |

Under `--stdout`, or when stdout is redirected, the prompt cannot be displayed. Repomix reports an error with guidance instead of silently trusting the config.

### Recommendations

1. Leave `--remote-trust-config` off unless you need the repository's own config.
2. Read the config in the prompt before answering, especially `input.processors` and any `../` paths.
3. Prefer "Yes, once" for repositories you do not control.
4. In CI, remember that the prompt cannot protect you — pin the revision you pack and review it beforehand.

## When Security Check Finds Issues

Example output:
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## Best Practices

1. Always review output before sharing
2. Use `.repomixignore` for sensitive paths
3. Keep security checks enabled
4. Remove sensitive files from repository

## Reporting Security Issues

Found a security vulnerability? Please:
1. Do not open a public issue
2. Email: koukun0120@gmail.com
3. Or use [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)

## Related Resources

- [Remote Repository Processing](/guide/remote-repository-processing) - Pack repositories you have not cloned yourself
- [Configuration](/guide/configuration) - Configure security checks via `security.enableSecurityCheck`
- [Command Line Options](/guide/command-line-options) - Use `--no-security-check` flag
- [Privacy Policy](/guide/privacy) - Learn about Repomix's data handling
