# Zu Repomix beitragen

Vielen Dank für Ihr Interesse an **Repomix**! 🚀 Wir freuen uns über Ihre Hilfe, um es noch besser zu machen. Dieser Leitfaden hilft Ihnen, mit der Mitarbeit am Projekt zu beginnen.

## Wie Sie beitragen können

- **Repository mit Stern versehen**: Zeigen Sie Ihre Unterstützung, indem Sie [das Repository mit einem Stern versehen](https://github.com/yamadashy/repomix)!
- **Issue erstellen**: Einen Fehler entdeckt? Eine Idee für ein neues Feature? Lassen Sie es uns wissen, indem Sie [ein Issue erstellen](https://github.com/yamadashy/repomix/issues).
- **Pull Request einreichen**: Etwas zum Beheben oder Verbessern gefunden? Reichen Sie einen PR ein!
- **Weitersagen**: Teilen Sie Ihre Erfahrung mit Repomix in sozialen Medien, Blogs oder in Ihrer Tech-Community.
- **Repomix verwenden**: Das wertvollste Feedback kommt aus der realen Nutzung. Integrieren Sie Repomix gerne in Ihre eigenen Projekte!
- **Sponsern**: Unterstützen Sie die Entwicklung von Repomix, indem Sie [Sponsor werden](https://github.com/sponsors/yamadashy).

## Schnellstart

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## Entwicklungsbefehle

```bash
# CLI ausführen
npm run repomix

# Tests ausführen
npm run test
npm run test-coverage

# Code linting
npm run lint
```

## Code-Stil

- [Biome](https://biomejs.dev/) für Linting und Formatierung verwenden
- Dependency Injection für Testbarkeit
- Dateien unter 250 Zeilen halten
- Tests für neue Funktionen hinzufügen

## Pull-Request-Richtlinien

1. Alle Tests ausführen
2. Linting-Prüfungen bestehen
3. Dokumentation aktualisieren
4. Bestehenden Code-Stil befolgen

## Entwicklungsumgebung

### Voraussetzungen

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (optional, für die Ausführung der Website oder containerisierte Entwicklung)

### Lokale Entwicklung

So richten Sie Repomix für die lokale Entwicklung ein:

```bash
# Repository klonen
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Abhängigkeiten installieren
npm install

# CLI ausführen
npm run repomix
```

### Nix-Entwicklung

Wenn Sie [Nix](https://nixos.org/download) mit aktivierten Flakes verwenden, können Sie eine reproduzierbare Entwicklungs-Shell mit vorinstalliertem Node.js 24 und Git betreten:

```bash
nix develop
```

In der Shell funktioniert der Standard-`npm`-Workflow wie erwartet:

```bash
npm ci
npm run build
npm run test
npm run lint
```

Hinweis: Diese Shell ist für die Arbeit an Repomix selbst gedacht, nicht für die Installation als CLI.

### Docker-Entwicklung

Sie können Repomix auch mit Docker ausführen:

```bash
# Image bauen
docker build -t repomix .

# Container ausführen
docker run -v ./:/app -it --rm repomix
```

### Projektstruktur

Das Projekt ist in folgende Verzeichnisse unterteilt:

```
src/
├── cli/          # CLI-Implementierung
├── config/       # Konfigurationsverarbeitung
├── core/         # Kernfunktionalität
│   ├── file/     # Dateiverarbeitung
│   ├── metrics/  # Metriken-Berechnung
│   ├── output/   # Ausgabegenerierung
│   ├── security/ # Sicherheitsprüfungen
├── mcp/          # MCP-Server-Integration
└── shared/       # Gemeinsame Dienstprogramme
tests/            # Tests, die die src/-Struktur widerspiegeln
website/          # Dokumentationswebsite
├── client/       # Frontend (VitePress)
└── server/       # Backend-API
```

## Website-Entwicklung

Die Repomix-Website ist mit [VitePress](https://vitepress.dev/) erstellt. So führen Sie die Website lokal aus:

```bash
# Voraussetzungen: Docker muss auf Ihrem System installiert sein

# Starten Sie den Website-Entwicklungsserver
npm run website

# Zugriff auf die Website unter http://localhost:5173/
```

Bei der Aktualisierung der Dokumentation müssen Sie nur zuerst die englische Version aktualisieren. Die Maintainer kümmern sich um die Übersetzungen in andere Sprachen.

## Release-Prozess

Für Maintainer und Mitwirkende, die am Release-Prozess interessiert sind:

1. Version aktualisieren
```bash
npm version patch  # oder minor/major
```

2. Tests und Build ausführen
```bash
npm run test-coverage
npm run build
```

3. Veröffentlichen
```bash
npm publish
```

Neue Versionen werden vom Maintainer verwaltet. Wenn Sie der Meinung sind, dass eine Veröffentlichung notwendig ist, öffnen Sie ein Issue, um es zu besprechen.

## Hilfe benötigt?

- [Issue erstellen](https://github.com/yamadashy/repomix/issues)
- [Discord beitreten](https://discord.gg/wNYzTwZFku)  
