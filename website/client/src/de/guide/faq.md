---
title: FAQ und Fehlerbehebung
description: Antworten auf häufige Fragen zu Repomix, privaten Repositories, Ausgabeformaten, Token-Reduktion, Sicherheit und KI-Workflows.
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

## Weitere Ressourcen

- [Grundlegende Verwendung](/de/guide/usage)
- [Kommandozeilenoptionen](/de/guide/command-line-options)
- [Code-Komprimierung](/de/guide/code-compress)
- [Sicherheit](/de/guide/security)
