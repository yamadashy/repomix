# Installation

## Using npx (No Installation Required)

```bash
npx repomix@latest
```

## Global Installation

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Docker Installation

Pull and run the Docker image:

```bash
# Current directory
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Specific directory
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Remote repository
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode Extension

Run Repomix directly in VSCode with the community-maintained [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) extension.

Features:
- Pack any folder with just a few clicks
- Choose between file or content mode for copying
- Automatic cleanup of output files
- Works with repomix.config.json

Install it from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Browser Extension

Get instant access to Repomix directly from any GitHub repository! Our Chrome extension adds a convenient "Repomix" button to GitHub repository pages.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Install
- Chrome Extension: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox Add-on: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Features
- One-click access to Repomix for any GitHub repository
- More exciting features coming soon!

## System Requirements

- Node.js: ≥ 20.0.0
- Git: Required for remote repository processing

## Verification

After installation, verify that Repomix is working:

```bash
repomix --version
repomix --help
```
