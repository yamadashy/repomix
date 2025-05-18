# Getting Started with Repomix

Repomix is a tool that packs your entire repository into a single, AI-friendly file. It's designed to help you feed your codebase to Large Language Models (LLMs) like ChatGPT, DeepSeek, Perplexity, Gemini, Gemma, Llama, Grok, and more.

## Quick Start

Run this command in your project directory:

```bash
npx repomix
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

## Core Features

- **AI-Optimized Output**: Formats your codebase for easy AI processing with structured sections and clear organization
- **Token Counting**: Tracks token usage for LLM context limits using configurable tokenizers like OpenAI's tiktoken
- **Git-Aware**: Respects your `.gitignore` and `.git/info/exclude` files to prevent including unwanted files
- **Security-Focused**: Detects sensitive information using Secretlint to prevent accidental exposure
- **Multiple Output Formats**: Choose between XML (best for AI), Markdown (balance of readability and structure), or plain text
- **Code Compression**: Intelligently extracts essential code structures while removing implementation details to reduce token count

## What's Next?

- [Installation Guide](installation.md): Different ways to install Repomix
- [Usage Guide](usage.md): Learn about basic and advanced features
- [Configuration](configuration.md): Customize Repomix for your needs
- [Security Features](security.md): Learn about security checks

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
