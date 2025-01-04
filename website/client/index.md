---
layout: home
title: Repomix
titleTemplate: Packs your entire repository into AI-friendly formats
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

<div class="cli-section">

## Power User Guide

For advanced users who need more control, Repomix offers extensive customization options through its CLI interface.

### Quick Start

You can try Repomix instantly in your project directory without installation:

```bash
npx repomix
```

Or install globally for repeated use:

```bash
# Install using npm
npm install -g repomix

# Alternatively using yarn
yarn global add repomix

# Alternatively using Homebrew (macOS)
brew install repomix

# Then run in any project directory
repomix
```

That's it! Repomix will generate a `repomix-output.txt` file in your current directory, containing your entire repository in an AI-friendly format.



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
repomix --remote https://github.com/yamadashy/repomix

# You can also use GitHub shorthand:
repomix --remote yamadashy/repomix

# You can specify the branch name, tag, or commit hash:
repomix --remote https://github.com/yamadashy/repomix --remote-branch main

# Or use a specific commit hash:
repomix --remote https://github.com/yamadashy/repomix --remote-branch 935b695
```

To initialize a new configuration file (`repomix.config.json`):

```bash
repomix --init
```

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

# Plain text format
repomix --style plain
```

### Customization

Create a `repomix.config.json` for persistent settings:

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

### More Examples
::: tip
💡 Check out our [GitHub repository](https://github.com/yamadashy/repomix) for complete documentation and more examples!
:::

</div>

<style>
.hero-description__accent {
  color: var(--vp-c-brand-1);
}
.cli-section {
  padding-top: 64px;
  margin-bottom: 32px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.cli-section h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  background: linear-gradient(120deg, #f97316 30%, #ffb25c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
