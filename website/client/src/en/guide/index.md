# Getting Started with Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix is a tool that packs your entire repository into a single, AI-friendly file. It's designed to help you feed your codebase to Large Language Models (LLMs) like ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama, and more.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Quick Start

Run this command in your project directory:

```bash
npx repomix@latest
```

That's it! You'll find a `repomix-output.xml` file containing your entire repository in an AI-friendly format.

You can then send this file to an AI assistant with a prompt like:

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

## Core Features

- **AI-Optimized Output**: Formats your codebase for easy AI processing
- **Token Counting**: Tracks token usage for LLM context limits
- **Git-Aware**: Respects your `.gitignore` and `.git/info/exclude` files
- **Security-Focused**: Detects sensitive information
- **Multiple Output Formats**: Choose between plain text, XML, or Markdown

## What's Next?

- [Installation Guide](installation.md): Different ways to install Repomix
- [Usage Guide](usage.md): Learn about basic and advanced features
- [Output Formats](output.md): Choose the best format for your AI model
- [Configuration](configuration.md): Customize Repomix for your needs
- [Security Features](security.md): Learn about security checks
- [MCP Server](mcp-server.md): Integrate Repomix with AI assistants directly

## Community

Join our [Discord community](https://discord.gg/wNYzTwZFku) for:
- Getting help with Repomix
- Sharing your experiences
- Suggesting new features
- Connecting with other users

## Support

Found a bug or need help?
- [Open an issue on GitHub](https://github.com/yamadashy/repomix/issues)
- Join our Discord server
- Check the [documentation](https://repomix.com)
