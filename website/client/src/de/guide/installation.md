# Installation

## Verwendung von npx (Keine Installation erforderlich)

```bash
npx repomix@latest
```

## Globale Installation

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

Docker-Image herunterladen und ausführen:

```bash
# Aktuelles Verzeichnis
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Bestimmtes Verzeichnis
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Remote-Repository
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode-Erweiterung

Führen Sie Repomix direkt in VSCode mit der von der Community gepflegten [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) Erweiterung aus.

Funktionen:
- Packen Sie jeden Ordner mit wenigen Klicks
- Wählen Sie zwischen Datei- oder Inhaltsmodus zum Kopieren
- Automatische Bereinigung von Ausgabedateien
- Funktioniert mit repomix.config.json

Installieren Sie sie vom [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Browser-Erweiterung

Erhalten Sie direkten Zugang zu Repomix von jedem GitHub-Repository! Unsere Chrome-Erweiterung fügt einen praktischen "Repomix"-Button zu GitHub-Repository-Seiten hinzu.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Installation
- Chrome-Erweiterung: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox-Add-on: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Funktionen
- Ein-Klick-Zugang zu Repomix für jedes GitHub-Repository
- Weitere aufregende Funktionen kommen bald!

## Systemanforderungen

- Node.js: ≥ 20.0.0
- Git: Erforderlich für die Verarbeitung von Remote-Repositories

## Überprüfung

Überprüfen Sie nach der Installation, ob Repomix funktioniert:

```bash
repomix --version
repomix --help
```
