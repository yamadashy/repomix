---
title: FAQ und Fehlerbehebung
description: Antworten auf häufige Fragen zu Repomix, privaten Repositories, C#- und Python-Support, MCP-kompatiblen Agenten, Ausgabeformaten, Token-Reduktion, Sicherheit und KI-Workflows.
---

# FAQ und Fehlerbehebung

Diese Seite hilft bei der Wahl des passenden Repomix-Workflows, beim Reduzieren großer Ausgaben und beim Vorbereiten von Codebasis-Kontext für KI-Assistenten.

## Häufige Fragen

### Wofür wird Repomix verwendet?

Repomix packt ein Repository in eine einzige KI-freundliche Datei. So können Sie ChatGPT, Claude, Gemini oder anderen Assistenten vollständigen Codebasis-Kontext für Code-Reviews, Fehlersuche, Refactoring, Dokumentation und Onboarding geben.

### Funktioniert Repomix mit privaten Repositories?

Ja. Führen Sie Repomix lokal in einem Checkout aus, auf den Ihr Rechner bereits Zugriff hat:

```bash
repomix
```

Prüfen Sie die erzeugte Datei, bevor Sie sie an einen externen KI-Dienst weitergeben.

### Kann Repomix öffentliche GitHub-Repositories ohne Klonen verarbeiten?

Ja. Verwenden Sie `--remote` mit Kurzform oder vollständiger URL:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Welches Ausgabeformat sollte ich wählen?

Nutzen Sie standardmäßig XML. Verwenden Sie Markdown für gut lesbare Gespräche, JSON für Automatisierung und Plain Text für maximale Kompatibilität. Sie können das Format mit `--style` ändern:

```bash
repomix --style markdown
repomix --style json
```

Siehe [Ausgabeformate](/de/guide/output).

## Token-Verbrauch reduzieren

### Die erzeugte Datei ist zu groß. Was tun?

Grenzen Sie den Kontext ein:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Kombinieren Sie Include- und Ignore-Muster mit Code-Komprimierung, wenn das Repository groß ist.

### Was macht `--compress`?

`--compress` erhält wichtige Struktur wie Imports, Exports, Klassen, Funktionen und Interfaces, entfernt aber viele Implementierungsdetails. Das ist hilfreich, wenn ein Modell vor allem Architektur und Zusammenhänge verstehen soll.

## Sicherheit und Datenschutz

### Lädt die CLI meinen Code hoch?

Die Repomix-CLI läuft lokal und schreibt eine Ausgabedatei auf Ihrem Rechner. Website- und Browser-Erweiterungs-Workflows unterscheiden sich; lesen Sie dafür die [Datenschutzerklärung](/de/guide/privacy).

### Wie schützt Repomix vor Secrets?

Repomix nutzt Secretlint-basierte Sicherheitsprüfungen. Betrachten Sie diese als zusätzliche Schutzschicht und prüfen Sie die Ausgabe trotzdem selbst.

## Fehlerbehebung

### Warum fehlen Dateien in der Ausgabe?

Repomix respektiert `.gitignore`, Standard-Ignore-Regeln und eigene Ignore-Muster. Prüfen Sie `repomix.config.json`, `--ignore` und Ihre Git-Ignore-Regeln.

### Wie mache ich die Ausgabe im Team reproduzierbar?

Erstellen und committen Sie eine gemeinsame Konfiguration:

```bash
repomix --init
```

## Zusätzliche häufige Fragen

### Funktioniert Repomix mit C#, Python, Java, Go, Rust oder anderen Sprachen?

Ja. Repomix liest die Dateien Ihres Projekts und formatiert sie für KI-Tools, daher kann es Repositories in jeder Programmiersprache packen. Für die CLI benötigen Sie Node.js 20 oder neuer. Einige erweiterte Funktionen, etwa Tree-sitter-basierte Code-Komprimierung, hängen von der Parser-Unterstützung der jeweiligen Sprache ab.

### Kann ich Repomix mit Hermes Agent, OpenClaw oder anderen MCP-kompatiblen Agenten verwenden?

Ja. Repomix kann als MCP-Server laufen:

```bash
npx -y repomix --mcp
```

Für Hermes Agent fügen Sie Repomix als stdio-MCP-Server in `~/.hermes/config.yaml` hinzu:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Für OpenClaw oder andere MCP-kompatible Agenten verwenden Sie denselben Befehl und dieselben Argumente dort, wo der Agent externe stdio-MCP-Server konfiguriert. Wenn Ihr Assistent Agent Skills unterstützt, können Sie auch den [Repomix Explorer Skill](/de/guide/repomix-explorer-skill) verwenden.

### Wie helfe ich einem KI-Assistenten, eine neue Library oder ein Framework zu verstehen?

Packen Sie das Library-Repository oder seine Dokumentation und geben Sie die Ausgabe dem KI-Assistenten als Referenzmaterial:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Für wiederholte Nutzung können Sie daraus wiederverwendbare Agent Skills erzeugen:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Wie schließe ich CSS, Tests, Build-Ausgaben oder andere Stördateien aus?

Für einzelne Befehle verwenden Sie `--ignore`:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Wenn nur bestimmte Quell- oder Dokumentationspfade bleiben sollen, verwenden Sie `--include`:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Gibt es ein Größenlimit für Repositories?

Die CLI hat kein festes Repository-Größenlimit, aber sehr große Repositories können durch Speicher, Dateigröße oder Upload- und Kontextlimits des KI-Tools begrenzt werden. Grenzen Sie große Projekte mit Include-Mustern ein, prüfen Sie tokenreiche Dateien und teilen Sie die Ausgabe bei Bedarf auf:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Warum enthält `--include` keine Dateien aus `node_modules`, Build-Verzeichnissen oder ignorierten Pfaden?

`--include` grenzt die Dateien ein, die Repomix packen soll, aber Ignore-Regeln gelten weiterhin. Dateien können durch `.gitignore`, `.ignore`, `.repomixignore`, integrierte Standardmuster oder `repomix.config.json` ausgeschlossen werden. Für spezielle Fälle können Optionen wie `--no-gitignore` oder `--no-default-patterns` helfen, sie können aber auch Abhängigkeiten, Build-Artefakte und andere Stördateien einschließen.

## Weitere Ressourcen

- [Grundlegende Verwendung](/de/guide/usage)
- [Kommandozeilenoptionen](/de/guide/command-line-options)
- [Code-Komprimierung](/de/guide/code-compress)
- [Sicherheit](/de/guide/security)
