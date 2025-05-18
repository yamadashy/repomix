# Installation

## Using npx (No Installation Required)

```bash
npx repomix
```

## Global Installation

### npm
```bash
npm install -g repomix
```

### Yarn
```bash
yarn global add repomix
```

### Homebrew (macOS/Linux)
```bash
brew install repomix
```

## Docker Installation

Pull and run the Docker image for containerized execution, ensuring consistent environments across systems:

```bash
# Current directory - mounts the current directory to /app in the container
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Specific directory - specify a path to process only that directory
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Custom output file - specify an output file name and location
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix -o custom-output.xml

# Remote repository - store output in ./output directory
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

The Docker image includes all dependencies required to run Repomix.

## VSCode Extension

Run Repomix directly in VSCode with the community-maintained [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) extension (created by [massdo](https://github.com/massdo)).

Features:
- Pack any folder with just a few clicks
- Control output format (XML, Markdown, Plain Text)
- Choose between file or content mode for copying
- Automatic cleanup of output files
- Works seamlessly with your existing repomix.config.json
- Manage outputs through VSCode's intuitive interface

Install it from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) or view the [source code on GitHub](https://github.com/massdo/repomix-runner).

## System Requirements

- Node.js: ≥ 18.0.0
- Git: Required for remote repository processing

## Verification

After installation, verify that Repomix is working:

```bash
repomix --version
repomix --help
```
