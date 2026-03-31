---
layout: home
title: Repomix
titleTemplate: Pack your codebase into AI-friendly formats
aside: false
editLink: false

features:
  - icon: 🤖
    title: AI-Optimized
    details: Formats your codebase in a way that's easy for AI to understand and process.

  - icon: ⚙️
    title: Git-Aware
    details: Automatically respects your .gitignore files.

  - icon: 🛡️
    title: Security-Focused
    details: Incorporates Secretlint for robust security checks to detect and prevent inclusion of sensitive information.

  - icon: 📊
    title: Token Counting
    details: Provides token counts for each file and the entire repository, useful for LLM context limits.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Open Source Awards Nomination

We're honored! Repomix has been nominated for the **Powered by AI** category at the [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

This wouldn't have been possible without all of you using and supporting Repomix. Thank you!

## What is Repomix?

Repomix is a powerful tool that packages your entire codebase into a single AI-friendly file. Whether you're working on code reviews, refactoring, or getting AI assistance with your project, Repomix makes it easy to share your entire repository context with AI tools.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Quick Start

Once you've generated a packed file (`repomix-output.xml`) using Repomix, you can send it to an AI assistant (like ChatGPT, Claude) with a prompt like:

```
This file contains all the files in the repository combined into one.
I want to refactor the code, so please review it first.
```

The AI will analyze your entire codebase and provide comprehensive insights:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

When discussing specific changes, the AI can help generate code. With features like Claude's Artifacts, you can even receive multiple interdependent files:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Happy coding! 🚀

## Why Repomix?

Repomix's strength lies in its ability to work with any subscription service like ChatGPT, Claude, Gemini, Grok without worrying about costs, while providing complete codebase context that eliminates the need for file exploration—making analysis faster and often more accurate.

With the entire codebase available as context, Repomix enables a wide range of applications including implementation planning, bug investigation, third-party library security checks, documentation generation, and much more.

## Using the CLI Tool {#using-the-cli-tool}

Repomix can be used as a command-line tool, offering powerful features and customization options.

**The CLI tool can access private repositories** as it uses your locally installed git.

### Quick Start

You can try Repomix instantly in your project directory without installation:

```bash
npx repomix@latest
```

Or install globally for repeated use:

```bash
# Install using npm
npm install -g repomix

# Alternatively using yarn
yarn global add repomix

# Alternatively using bun
bun add -g repomix

# Alternatively using Homebrew (macOS/Linux)
brew install repomix

# Then run in any project directory
repomix
```

That's it! Repomix will generate a `repomix-output.xml` file in your current directory, containing your entire repository in an AI-friendly format.



### Usage

To pack your entire repository:

```bash
repomix
```

To pack a specific directory:

```bash
repomix path/to/directory
```

To pack specific files or directories using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

To exclude specific files or directories:

```bash
repomix --ignore "**/*.log,tmp/"
```

To pack a remote repository:
```bash
# Using shorthand format
npx repomix --remote yamadashy/repomix

# Using full URL (supports branches and specific paths)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Using commit's URL
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

To initialize a new configuration file:

```bash
repomix --init
```

This will guide you through creating a config file. You can place it in the project root or in the `.config/` directory.

Once you have generated the packed file, you can use it with Generative AI tools like Claude, ChatGPT, and Gemini.

#### Docker Usage

You can also run Repomix using Docker 🐳  
This is useful if you want to run Repomix in an isolated environment or prefer using containers.

Basic usage (current directory):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

To pack a specific directory:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Process a remote repository and output to a `output` directory:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Output Formats

Choose your preferred output format:

```bash
# XML format (default)
repomix --style xml

# Markdown format
repomix --style markdown

# JSON format
repomix --style json

# Plain text format
repomix --style plain
```

### Customization

Create a config file (JSON, YAML, TOML, TypeScript, or JavaScript) for persistent settings:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Real-World Use Cases

### [LLM Code Generation Workflow](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

A developer shares how they use Repomix to extract code context from existing codebases, then leverage that context with LLMs like Claude and Aider for incremental improvements, code reviews, and automated documentation generation.

### [Creating Knowledge Datapacks for LLMs](https://lethain.com/competitive-advantage-author-llms/)

Authors are using Repomix to package their written content—blogs, documentation, and books—into LLM-compatible formats, enabling readers to interact with their expertise through AI-powered Q&A systems.

[Discover more use cases →](/guide/use-cases)

## Power Users Guide

Repomix offers powerful features for advanced use cases. Here are some essential guides for power users:

- **[MCP Server](/guide/mcp-server)** - Model Context Protocol integration for AI assistants
- **[GitHub Actions](/guide/github-actions)** - Automate codebase packing in CI/CD workflows
- **[Code Compression](/guide/code-compress)** - Tree-sitter based intelligent compression (~70% token reduction)
- **[Using as Library](/guide/development/using-repomix-as-a-library)** - Integrate Repomix into your Node.js applications
- **[Custom Instructions](/guide/custom-instructions)** - Add custom prompts and instructions to outputs
- **[Security Features](/guide/security)** - Built-in Secretlint integration and safety checks
- **[Best Practices](/guide/tips/best-practices)** - Optimize your AI workflows with proven strategies

### More Examples
::: tip Need more help? 💡
Check out our comprehensive documentation in the [Guide](/guide/) or explore the [GitHub Repository](https://github.com/yamadashy/repomix) for more examples and source code.
:::

</div>
