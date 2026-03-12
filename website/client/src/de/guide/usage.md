# Grundlegende Verwendung

## Schnellstart

Packen Sie Ihr gesamtes Repository:
```bash
repomix
```

## Häufige Anwendungsfälle

### Bestimmte Verzeichnisse packen
```bash
repomix path/to/directory
```

### Bestimmte Dateien einschließen
Verwenden Sie [Glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Dateien ausschließen
```bash
repomix --ignore "**/*.log,tmp/"
```

### Ausgabe in mehrere Dateien aufteilen

Bei der Arbeit mit großen Codebasen kann die gepackte Ausgabe Dateigrößenlimits einiger KI-Tools überschreiten (z.B. Google AI Studios 1MB-Limit). Verwenden Sie `--split-output`, um die Ausgabe automatisch in mehrere Dateien aufzuteilen:

```bash
repomix --split-output 1mb
```

Dies erzeugt nummerierte Dateien wie:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Die Größe kann mit Einheiten angegeben werden: `500kb`, `1mb`, `2mb`, `1.5mb` usw. Dezimalwerte werden unterstützt.

> [!NOTE]
> Dateien werden nach Top-Level-Verzeichnis gruppiert, um den Kontext zu erhalten. Eine einzelne Datei oder ein Verzeichnis wird nie auf mehrere Ausgabedateien aufgeteilt.

### Remote-Repositories
```bash
# Mit GitHub-URL
repomix --remote https://github.com/user/repo

# Mit Kurzform
repomix --remote user/repo

# Bestimmter Branch/Tag/Commit
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Dateiliste-Eingabe (stdin)

Übergeben Sie Dateipfade über stdin für ultimative Flexibilität:

```bash
# Mit find-Befehl
find src -name "*.ts" -type f | repomix --stdin

# Mit Git für verfolgte Dateien
git ls-files "*.ts" | repomix --stdin

# Mit ripgrep (rg) zum Finden von Dateien
rg --files --type ts | repomix --stdin

# Mit grep zum Finden von Dateien mit bestimmten Inhalten
grep -l "TODO" **/*.ts | repomix --stdin

# Mit ripgrep zum Finden von Dateien mit bestimmten Inhalten
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Mit sharkdp/fd zum Finden von Dateien
fd -e ts | repomix --stdin

# Mit fzf aus allen Dateien auswählen
fzf -m | repomix --stdin

# Interaktive Dateiauswahl mit fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Mit ls und Glob-Mustern
ls src/**/*.ts | repomix --stdin

# Aus einer Datei mit Dateipfaden
cat file-list.txt | repomix --stdin

# Direkte Eingabe mit echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

Die `--stdin`-Option ermöglicht es Ihnen, eine Liste von Dateipfaden an Repomix zu übertragen und bietet ultimative Flexibilität bei der Auswahl der zu packenden Dateien.

Bei der Verwendung von `--stdin` werden die angegebenen Dateien effektiv zu den Include-Mustern hinzugefügt. Das bedeutet, dass das normale Include- und Ignore-Verhalten weiterhin gilt - über stdin angegebene Dateien werden trotzdem ausgeschlossen, wenn sie mit Ignore-Mustern übereinstimmen.

> [!NOTE]
> Bei der Verwendung von `--stdin` können Dateipfade relativ oder absolut angegeben werden, und Repomix übernimmt automatisch die Pfadauflösung und Deduplizierung.

### Code-Komprimierung

```bash
repomix --compress

# Sie können es auch mit Remote-Repositories verwenden:
repomix --remote yamadashy/repomix --compress
```

### Git-Integration

Git-Informationen einschließen, um Entwicklungskontext für KI-Analysen bereitzustellen:

```bash
# Git-Diffs einschließen (ungespeicherte Änderungen)
repomix --include-diffs

# Git-Commit-Logs einschließen (standardmäßig die letzten 50 Commits)
repomix --include-logs

# Bestimmte Anzahl von Commits einschließen
repomix --include-logs --include-logs-count 10

# Sowohl Diffs als auch Logs einschließen
repomix --include-diffs --include-logs
```

Dies fügt wertvollen Kontext hinzu über:
- **Letzte Änderungen**: Git-Diffs zeigen ungespeicherte Modifikationen
- **Entwicklungsmuster**: Git-Logs zeigen, welche Dateien typischerweise zusammen geändert werden
- **Commit-Historie**: Aktuelle Commit-Nachrichten geben Einblick in den Entwicklungsfokus
- **Dateibeziehungen**: Verstehen, welche Dateien in denselben Commits modifiziert werden

### Token-Anzahl-Optimierung

Das Verständnis der Token-Verteilung Ihrer Codebasis ist entscheidend für die Optimierung von KI-Interaktionen. Verwenden Sie die `--token-count-tree`-Option, um die Token-Nutzung in Ihrem gesamten Projekt zu visualisieren:

```bash
repomix --token-count-tree
```

Dies zeigt eine hierarchische Ansicht Ihrer Codebasis mit Token-Anzahlen:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Sie können auch eine minimale Token-Schwelle setzen, um sich auf größere Dateien zu konzentrieren:

```bash
repomix --token-count-tree 1000  # Nur Dateien/Verzeichnisse mit 1000+ Tokens anzeigen
```

Dies hilft Ihnen dabei:
- **Token-schwere Dateien identifizieren** - Dateien, die KI-Kontextlimits überschreiten könnten
- **Dateiauswahl optimieren** - Verwendung von `--include` und `--ignore` Mustern
- **Komprimierungsstrategien planen** - Zielgerichtete Strategien für die größten Beitragenden
- **Inhalte vs. Kontext ausbalancieren** - Beim Vorbereiten von Code für KI-Analysen

## Ausgabeformate

### XML (Standard)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### Klartext
```bash
repomix --style plain
```

## Zusätzliche Optionen

### Kommentare entfernen
```bash
repomix --remove-comments
```

### Zeilennummern anzeigen
```bash
repomix --output-show-line-numbers
```

### In die Zwischenablage kopieren
```bash
repomix --copy
```

### Sicherheitsprüfung deaktivieren
```bash
repomix --no-security-check
```

## Konfiguration

Konfigurationsdatei initialisieren:
```bash
repomix --init
```

Siehe [Konfigurationsleitfaden](/de/guide/configuration) für detaillierte Optionen. 
