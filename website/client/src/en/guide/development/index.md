---
title: Contributing to Repomix
description: Set up the Repomix development environment, run tests, lint code, understand the project structure, and contribute changes to the open source project.
---

# Contributing to Repomix

Thank you for your interest in **Repomix**! 🚀 We'd love your help to make it even better. This guide will help you get started with contributing to the project.

## How to Contribute

- **Star the Repository**: Show your support by [starring the repository](https://github.com/yamadashy/repomix)!
- **Create an Issue**: Spot a bug? Have an idea for a new feature? Let us know by [creating an issue](https://github.com/yamadashy/repomix/issues).
- **Submit a Pull Request**: Found something to fix or improve? Jump in and submit a PR!
- **Spread the Word**: Share your experience with Repomix on social media, blogs, or with your tech community.
- **Use Repomix**: The best feedback comes from real-world usage, so feel free to integrate Repomix into your own projects!
- **Sponsor**: Support the development of Repomix by [becoming a sponsor](https://github.com/sponsors/yamadashy).

## Development Setup

### Prerequisites

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (optional, for running the website or containerized development)

### Local Development

To set up Repomix for local development:

```bash
# Clone repository
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Install dependencies
npm install

# Run CLI
npm run repomix
```

### Nix Development

If you have [Nix](https://nixos.org/download) with flakes enabled, you can enter a reproducible development shell with Node.js 24 and Git pre-installed:

```bash
nix develop
```

Inside the shell, the standard `npm` workflow works as expected:

```bash
npm ci
npm run build
npm run test
npm run lint
```

Note: This shell is for working on Repomix itself, not for installing it as a CLI.

### Docker Development

You can also run Repomix using Docker:

```bash
# Build image
docker build -t repomix .

# Run container
docker run -v ./:/app -it --rm repomix
```

### Project Structure

The project is organized into the following directories:

```
src/
├── cli/          # CLI implementation
├── config/       # Configuration handling
├── core/         # Core functionality
│   ├── file/     # File handling
│   ├── metrics/  # Metrics calculation
│   ├── output/   # Output generation
│   ├── security/ # Security checks
├── mcp/          # MCP server integration
└── shared/       # Shared utilities
tests/            # Tests mirroring src/ structure
website/          # Documentation website
├── client/       # Frontend (VitePress)
└── server/       # Backend API
```

## Development Commands

```bash
# Run CLI
npm run repomix

# Run tests
npm run test
npm run test-coverage

# Lint code
npm run lint
```

### Testing

We use [Vitest](https://vitest.dev/) for testing. To run the tests:

```bash
# Run tests
npm run test

# Test coverage
npm run test-coverage

# Linting
npm run lint-biome
npm run lint-ts
npm run lint-secretlint
```

## Code Style

- Use [Biome](https://biomejs.dev/) for linting and formatting
- Dependency injection for testability
- Keep files under 250 lines
- Add tests for new features

We use [Biome](https://biomejs.dev/) for linting and formatting. Please make sure your code follows the style guide by running:

```bash
npm run lint
```

## Pull Request Guidelines

Before submitting a Pull Request, please ensure:

1. Your code passes all tests: Run `npm run test`
2. Your code adheres to our linting standards: Run `npm run lint`
3. You have updated relevant documentation
4. You follow the existing code style

## Website Development

The Repomix website is built with [VitePress](https://vitepress.dev/). To run the website locally:

```bash
# Prerequisites: Docker must be installed on your system

# Start the website development server
npm run website

# Access the website at http://localhost:5173/
```

When updating documentation, you only need to update the English version first. The maintainers will handle translations to other languages.

## Release Process

For maintainers and contributors interested in the release process:

1. Update version
```bash
npm version patch  # or minor/major
```

2. Run tests and build
```bash
npm run test-coverage
npm run build
```

3. Publish
```bash
npm publish
```

New versions are managed by the maintainer. If you think a release is needed, open an issue to discuss it.

## Need Help?

- [Open an issue](https://github.com/yamadashy/repomix/issues)
- [Join Discord](https://discord.gg/wNYzTwZFku)
