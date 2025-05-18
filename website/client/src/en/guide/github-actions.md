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
| `style`           | Output style (xml, markdown, plain)         | `xml`             |
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

## Advanced Use Cases

### Generating Documentation on PR

This workflow automatically generates a code overview when a PR is opened or updated:

```yaml
name: Generate Code Documentation

on:
  pull_request:
    types: [opened, synchronize]
    branches: [ main, develop ]

jobs:
  document-code:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Pack PR changes
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: pr-overview.md
          style: markdown
          compress: true
          additional-args: "--include 'src/**/*.ts,src/**/*.js'"

      - name: Add PR comment
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const content = fs.readFileSync('pr-overview.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: "## Code Overview\n\nA compressed overview of the code changes has been generated. You can [download the full report](${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}).\n\n<details><summary>Preview (Click to expand)</summary>\n\n```md\n" + content.substring(0, 5000) + (content.length > 5000 ? "\n...(truncated)" : "") + "\n```\n\n</details>"
            });
```

### Scheduled Code Analysis

Run regular code analyses on scheduled intervals:

```yaml
name: Weekly Code Analysis

on:
  schedule:
    - cron: '0 0 * * 0'  # Run at midnight every Sunday

jobs:
  analyze-code:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Generate full codebase report
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: codebase-analysis.xml
          compress: true
          
      - name: Generate source-only report
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          directories: src
          output: source-analysis.xml
          compress: true
          
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: code-analysis-reports
          path: |
            codebase-analysis.xml
            source-analysis.xml
          retention-days: 14
```

### Multi-Repository Analysis

Compare multiple repositories in a single workflow:

```yaml
name: Multi-Repository Analysis

on:
  workflow_dispatch:
    inputs:
      repos:
        description: 'Comma-separated list of repositories (org/repo format)'
        required: true
        default: 'org/repo1,org/repo2'

jobs:
  analyze-repos:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: ${{ fromJson('[' + join(split(github.event.inputs.repos, ','), '","') + '"]') }}
    steps:
      - name: Package repository
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          remote: ${{ matrix.repo }}
          output: ${{ matrix.repo }}.xml
          compress: true
          
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.repo }}-analysis
          path: ${{ matrix.repo }}.xml
          retention-days: 7
```

### Integration with AI Services

Use Repomix output with AI services for automated code review:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'src/**'

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Generate diff package
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: pr-changes.xml
          compress: true
          additional-args: "--output-git-include-diffs"
          
      # Example integration with a hypothetical AI service
      - name: Send to AI service
        run: |
          curl -X POST https://ai-code-review-service.example/analyze \
            -H "Authorization: Bearer ${{ secrets.AI_SERVICE_TOKEN }}" \
            -F "repo=${{ github.repository }}" \
            -F "pr=${{ github.event.pull_request.number }}" \
            -F "code=@pr-changes.xml"
```
