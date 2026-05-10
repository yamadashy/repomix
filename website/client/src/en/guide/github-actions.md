---
title: Using Repomix with GitHub Actions
description: Automate Repomix in GitHub Actions to package repositories for AI analysis, CI workflows, artifacts, code review, and compressed output.
---

# Using Repomix with GitHub Actions

You can automate the process of packing your codebase for AI analysis by integrating Repomix into your GitHub Actions workflows. This is useful for continuous integration (CI), code review, or preparing your repository for LLM-based tools.

## Basic Usage

Add the following step to your workflow YAML to pack your repository:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Using Different Output Formats

You can specify different output formats using the `style` parameter (the default is `xml`):

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.md
    style: markdown
```

```yaml
- name: Pack repository with Repomix (JSON format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.json
    style: json
```

## Packing Multiple Directories with Compression

You can specify multiple directories, include/exclude patterns, and enable smart compression:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.xml
    compress: true
```

## Uploading the Output as an Artifact

To make the packed file available for later workflow steps or for download, upload it as an artifact:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src
    output: repomix-output.xml
    compress: true

- name: Upload Repomix output
  uses: actions/upload-artifact@v4
  with:
    name: repomix-output
    path: repomix-output.xml
```

## Action Inputs

| Name              | Description                                 | Default           |
|-------------------|---------------------------------------------|-------------------|
| `directories`     | Space-separated list of directories to pack | `.`               |
| `include`         | Comma-separated glob patterns to include    | `""`             |
| `ignore`          | Comma-separated glob patterns to ignore     | `""`             |
| `output`          | Output file path                            | `repomix-output.xml`     |
| `compress`        | Enable smart compression                    | `true`            |
| `style`           | Output style (xml, markdown, json, plain)         | `xml`             |
| `additional-args` | Extra CLI arguments for repomix             | `""`             |
| `repomix-version` | Version of the npm package to install       | `latest`          |

## Action Outputs

| Name          | Description                        |
|---------------|------------------------------------|
| `output_file` | Path to the generated output file   |

## Example: Full Workflow

Here is a complete example of a GitHub Actions workflow using Repomix:

```yaml
name: Pack repository with Repomix

on:
  workflow_dispatch:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Pack repository with Repomix
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: repomix-output.xml

      - name: Upload Repomix output
        uses: actions/upload-artifact@v4
        with:
          name: repomix-output.xml
          path: repomix-output.xml
          retention-days: 30
```

See the [complete workflow example](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).

## Publishing to the understand-quickly registry

[`looptech-ai/understand-quickly`](https://github.com/looptech-ai/understand-quickly) is a public, machine-readable registry of code-knowledge and code-context artifacts. It indexes Repomix output through its [`bundle@1`](https://github.com/looptech-ai/understand-quickly/blob/main/schemas/bundle@1.json) format so AI agents (Claude, Codex, Cursor via MCP) can resolve a repo URL to its packed-context bundle.

Publishing is opt-in and only runs for public repos (the body is fetched from `raw.githubusercontent.com`). The workflow packs with Repomix, commits the output to a dedicated `understand-quickly` branch (so the URL is reachable), then publishes a small JSON pointer pinned to that commit SHA. Drop this into `.github/workflows/understand-quickly-publish.yml`:

```yaml
name: understand-quickly publish
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: write }   # needs write to commit packed output
    steps:
      - uses: actions/checkout@v4
      - uses: yamadashy/repomix/.github/actions/repomix@main   # consider pinning @<sha>
        with: { output: repomix-output.xml, style: xml }
      - name: Commit packed output to understand-quickly branch
        env:
          REPO: ${{ github.repository }}
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git checkout --orphan understand-quickly
          git rm -rf --cached . >/dev/null 2>&1 || true
          git add -f repomix-output.xml
          git commit -m "chore(uq): publish $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          git push --force origin understand-quickly
          echo "UQ_SHA=$(git rev-parse HEAD)" >> "$GITHUB_ENV"
      - name: Build bundle@1 sidecar
        env:
          REPO: ${{ github.repository }}
          SHA: ${{ env.UQ_SHA }}
        run: |
          node -e "
            const fs=require('fs');
            const b=fs.statSync('repomix-output.xml').size;
            fs.writeFileSync('repomix-output.bundle.json', JSON.stringify({
              format:'bundle@1',
              manifest:{tool:'repomix',generated_at:new Date().toISOString(),
                byte_count:b,token_estimate:Math.round(b/4),format:'xml'},
              content_url:\`https://raw.githubusercontent.com/\${process.env.REPO}/\${process.env.SHA}/repomix-output.xml\`
            },null,2));"
      - uses: looptech-ai/uq-publish-action@v0.1.0   # consider pinning @<sha>
        with:
          graph-path: repomix-output.bundle.json
          format: bundle@1
          token: ${{ secrets.UNDERSTAND_QUICKLY_TOKEN }}
```

Set `UNDERSTAND_QUICKLY_TOKEN` to a fine-grained PAT with `Repository dispatches: write` on `looptech-ai/understand-quickly` only. Register your repo once via [`npx @understand-quickly/cli add`](https://github.com/looptech-ai/understand-quickly#add-a-repo) or the [wizard](https://looptech-ai.github.io/understand-quickly/add.html); subsequent pushes auto-refresh. See the [protocol](https://github.com/looptech-ai/understand-quickly/blob/main/docs/integrations/protocol.md) and [DATA-LICENSE.md](https://github.com/looptech-ai/understand-quickly/blob/main/DATA-LICENSE.md) for the data-grant semantics — submission is opt-in, gated on the secret being set, and only suitable for public repos.
