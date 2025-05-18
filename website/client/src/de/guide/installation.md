# Installation

## Verwendung von npx (Keine Installation erforderlich)

```bash
npx repomix
```

## Globale Installation

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

## Docker-Installation

Laden und führen Sie das Docker-Image für eine containerisierte Ausführung aus, um konsistente Umgebungen über verschiedene Systeme hinweg zu gewährleisten:

```bash
# Aktuelles Verzeichnis - mountet das aktuelle Verzeichnis auf /app im Container
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Spezifisches Verzeichnis - geben Sie einen Pfad an, um nur dieses Verzeichnis zu verarbeiten
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Benutzerdefinierte Ausgabedatei - geben Sie einen Ausgabedateinamen und -ort an
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix -o custom-output.xml

# Remote-Repository - speichern Sie die Ausgabe im ./output-Verzeichnis
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

Das Docker-Image enthält alle Abhängigkeiten, die für die Ausführung von Repomix erforderlich sind.

## VSCode-Erweiterung

Führen Sie Repomix direkt in VSCode mit der von der Community gepflegten [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)-Erweiterung aus (erstellt von [massdo](https://github.com/massdo)).

Funktionen:
- Packen Sie jeden Ordner mit nur wenigen Klicks
- Steuern Sie das Ausgabeformat (XML, Markdown, Klartext)
- Wählen Sie zwischen Datei- oder Inhaltsmodus zum Kopieren
- Automatische Bereinigung von Ausgabedateien
- Arbeitet nahtlos mit Ihrer bestehenden repomix.config.json
- Verwalten Sie Ausgaben über die intuitive Benutzeroberfläche von VSCode

Installieren Sie sie vom [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) oder sehen Sie sich den [Quellcode auf GitHub](https://github.com/massdo/repomix-runner) an.

## Systemanforderungen

- Node.js: ≥ 18.0.0
- Git: Erforderlich für die Verarbeitung von Remote-Repositories

## Überprüfung

Nach der Installation überprüfen Sie, ob Repomix funktioniert:

```bash
repomix --version
repomix --help
```
