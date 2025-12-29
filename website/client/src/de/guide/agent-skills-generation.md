# Agent Skills Generierung

Repomix kann Ausgaben im Format von [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) generieren und dabei ein strukturiertes Skills-Verzeichnis erstellen, das als wiederverwendbare Codebase-Referenz für KI-Assistenten dient.

Diese Funktion ist besonders leistungsfähig, wenn Sie Implementierungen aus entfernten Repositories referenzieren möchten. Durch die Generierung von Skills aus Open-Source-Projekten können Sie Claude einfach bitten, spezifische Muster oder Implementierungen zu referenzieren, während Sie an Ihrem eigenen Code arbeiten.

Anstatt eine einzelne gepackte Datei zu generieren, erstellt die Skills-Generierung ein strukturiertes Verzeichnis mit mehreren Referenzdateien, die für KI-Verständnis und grep-freundliche Suche optimiert sind.

> [!NOTE]
> Dies ist eine experimentelle Funktion. Das Ausgabeformat und die Optionen können sich in zukünftigen Versionen basierend auf Benutzer-Feedback ändern.

## Grundlegende Verwendung

Skills aus Ihrem lokalen Verzeichnis generieren:

```bash
# Skills aus dem aktuellen Verzeichnis generieren
repomix --skill-generate

# Mit benutzerdefiniertem Skills-Namen generieren
repomix --skill-generate my-project-reference

# Aus bestimmtem Verzeichnis generieren
repomix path/to/directory --skill-generate

# Aus entferntem Repository generieren
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills-Speicherort-Auswahl

Wenn Sie den Befehl ausführen, fordert Repomix Sie auf, den Speicherort für die Skills zu wählen:

1. **Personal Skills** (`~/.claude/skills/`) - Verfügbar für alle Projekte auf Ihrem Rechner
2. **Project Skills** (`.claude/skills/`) - Mit Ihrem Team über Git geteilt

Wenn das Skills-Verzeichnis bereits existiert, werden Sie aufgefordert, das Überschreiben zu bestätigen.

> [!TIP]
> Wenn Sie Project Skills generieren, sollten Sie diese zur `.gitignore` hinzufügen, um das Committen großer Dateien zu vermeiden:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Generierte Struktur

Die Skills werden mit folgender Struktur generiert:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Haupt-Skills-Metadaten & Dokumentation
└── references/
    ├── summary.md              # Zweck, Format und Statistiken
    ├── project-structure.md    # Verzeichnisbaum mit Zeilenzahlen
    ├── files.md                # Alle Dateiinhalte (grep-freundlich)
    └── tech-stack.md           # Sprachen, Frameworks, Abhängigkeiten
```

### Dateibeschreibungen

#### SKILL.md

Die Haupt-Skills-Datei enthält:
- Skills-Name, Beschreibung und Projektinformationen
- Dateianzahl, Zeilenanzahl und Token-Anzahl
- Übersicht zur Verwendung der Skills
- Dateispeicherorte und Formaterklärung
- Häufige Anwendungsfälle und Tipps

#### references/summary.md

Enthält:
- **Zweck**: Erklärt, dass dies eine Referenz-Codebase für KI-Nutzung ist
- **Dateistruktur**: Dokumentiert den Inhalt jeder Referenzdatei
- **Nutzungsrichtlinien**: Wie die Skills effektiv verwendet werden
- **Statistiken**: Aufschlüsselung nach Dateityp, Sprache und größten Dateien

#### references/project-structure.md

Verzeichnisbaum mit Zeilenzahlen pro Datei zur einfachen Dateifindung:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Alle Dateiinhalte mit Syntax-Highlighting-Headern, optimiert für grep-freundliche Suche:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Automatisch erkannter Tech-Stack aus Abhängigkeitsdateien:
- **Sprachen**: TypeScript, JavaScript, Python, usw.
- **Frameworks**: React, Next.js, Express, Django, usw.
- **Laufzeitversionen**: Node.js, Python, Go, usw.
- **Paketmanager**: npm, pnpm, poetry, usw.
- **Abhängigkeiten**: Alle direkten und Entwicklungs-Abhängigkeiten
- **Konfigurationsdateien**: Alle erkannten Konfigurationsdateien

Erkannt aus Dateien wie: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, usw.

## Automatisch generierte Skills-Namen

Wenn kein Name angegeben wird, generiert Repomix automatisch einen mit diesem Muster:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalisiert zu kebab-case)
```

Skills-Namen werden:
- In kebab-case konvertiert (Kleinbuchstaben, durch Bindestriche getrennt)
- Auf maximal 64 Zeichen begrenzt
- Gegen Pfad-Traversierung geschützt

## Integration mit Repomix-Optionen

Die Skills-Generierung respektiert alle Standard-Repomix-Optionen:

```bash
# Skills mit Dateifilterung generieren
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Skills mit Komprimierung generieren
repomix --skill-generate --compress

# Skills aus entferntem Repository generieren
repomix --remote yamadashy/repomix --skill-generate

# Skills mit spezifischen Ausgabeformat-Optionen generieren
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Nur-Dokumentations-Skills

Mit `--include` können Sie Skills generieren, die nur die Dokumentation aus einem GitHub-Repository enthalten. Dies ist nützlich, wenn Sie Claude auf spezifische Bibliotheks- oder Framework-Dokumentation verweisen möchten, während Sie an Ihrem Code arbeiten:

```bash
# Claude Code Action Dokumentation
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite Dokumentation
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React Dokumentation
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Einschränkungen

Die Option `--skill-generate` kann nicht verwendet werden mit:
- `--stdout` - Skills-Ausgabe erfordert Schreiben ins Dateisystem
- `--copy` - Skills-Ausgabe ist ein Verzeichnis, nicht in die Zwischenablage kopierbar

## Generierte Skills verwenden

Sobald generiert, können Sie die Skills mit Claude verwenden:

1. **Claude Code**: Die Skills sind automatisch verfügbar, wenn sie unter `~/.claude/skills/` oder `.claude/skills/` gespeichert sind
2. **Claude Web**: Laden Sie das Skills-Verzeichnis zur Codebase-Analyse zu Claude hoch
3. **Team-Teilen**: Committen Sie `.claude/skills/` in Ihr Repository für teamweiten Zugriff

## Beispiel-Workflow

### Persönliche Referenzbibliothek erstellen

```bash
# Ein interessantes Open-Source-Projekt klonen und analysieren
repomix --remote facebook/react --skill-generate react-reference

# Die Skills werden unter ~/.claude/skills/react-reference/ gespeichert
# Jetzt können Sie Reacts Codebase in jeder Claude-Konversation referenzieren
```

### Team-Projekt-Dokumentation

```bash
# In Ihrem Projektverzeichnis
cd my-project

# Skills für Ihr Team generieren
repomix --skill-generate

# Wählen Sie "Project Skills" wenn aufgefordert
# Die Skills werden unter .claude/skills/repomix-reference-my-project/ gespeichert

# Committen und mit Ihrem Team teilen
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Verwandte Ressourcen

- [Claude Code Plugins](/de/guide/claude-code-plugins) - Erfahren Sie mehr über Repomix-Plugins für Claude Code
- [MCP-Server](/de/guide/mcp-server) - Alternative Integrationsmethode
- [Code-Komprimierung](/de/guide/code-compress) - Token-Anzahl durch Komprimierung reduzieren
- [Konfiguration](/de/guide/configuration) - Repomix-Verhalten anpassen
