# Befehlszeilenoptionen

## Grundlegende Optionen
- `-v, --version`: Tool-Version anzeigen

## CLI Ein-/Ausgabeoptionen

| Option | Beschreibung |
|--------|-------------|
| `--verbose` | Ausführliches Debug-Logging aktivieren (zeigt Dateiverarbeitung, Token-Anzahlen und Konfigurationsdetails) |
| `--quiet` | Alle Konsolenausgaben außer Fehler unterdrücken (nützlich für Skripting) |
| `--stdout` | Gepackte Ausgabe direkt an stdout statt in eine Datei schreiben (unterdrückt alle Protokollierung) |
| `--stdin` | Dateipfade von stdin lesen, einen pro Zeile (angegebene Dateien werden direkt verarbeitet) |
| `--copy` | Generierte Ausgabe nach der Verarbeitung in die Systemzwischenablage kopieren |
| `--token-count-tree [threshold]` | Dateibaum mit Token-Anzahlen anzeigen; optionaler Schwellenwert um nur Dateien mit mindestens N Token anzuzeigen (z.B. `--token-count-tree 100`) |
| `--top-files-len <number>` | Anzahl der größten Dateien in der Zusammenfassung (Standard: `5`) |

## Repomix-Ausgabeoptionen

| Option | Beschreibung |
|--------|-------------|
| `-o, --output <file>` | Ausgabedateipfad (Standard: `repomix-output.xml`, `"-"` für stdout) |
| `--style <style>` | Ausgabeformat: `xml`, `markdown`, `json` oder `plain` (Standard: `xml`) |
| `--parsable-style` | Sonderzeichen escapen, um gültiges XML/Markdown sicherzustellen (nötig wenn die Ausgabe Code enthält, der die Formatierung bricht) |
| `--compress` | Wesentliche Code-Struktur (Klassen, Funktionen, Interfaces) mittels Tree-sitter-Parsing extrahieren |
| `--output-show-line-numbers` | Jede Zeile mit ihrer Zeilennummer in der Ausgabe versehen |
| `--no-file-summary` | Datei-Zusammenfassungsbereich aus der Ausgabe weglassen |
| `--no-directory-structure` | Verzeichnisbaum-Visualisierung aus der Ausgabe weglassen |
| `--no-files` | Nur Metadaten ohne Dateiinhalte generieren (nützlich für Repository-Analyse) |
| `--remove-comments` | Alle Code-Kommentare vor dem Packen entfernen |
| `--remove-empty-lines` | Leerzeilen aus allen Dateien entfernen |
| `--truncate-base64` | Lange Base64-Datenstrings kürzen, um die Ausgabegröße zu reduzieren |
| `--header-text <text>` | Benutzerdefinierten Text am Anfang der Ausgabe einfügen |
| `--instruction-file-path <path>` | Pfad zu einer Datei mit benutzerdefinierten Anweisungen, die in die Ausgabe aufgenommen werden |
| `--split-output <size>` | Ausgabe in mehrere nummerierte Dateien aufteilen (z.B. `repomix-output.1.xml`); Größe wie `500kb`, `2mb` oder `1.5mb` |
| `--include-empty-directories` | Ordner ohne Dateien in die Verzeichnisstruktur aufnehmen |
| `--include-full-directory-structure` | Gesamten Repository-Baum im Verzeichnisstruktur-Abschnitt anzeigen, auch bei Verwendung von `--include`-Mustern |
| `--no-git-sort-by-changes` | Dateien nicht nach Git-Änderungshäufigkeit sortieren (Standard: meistgeänderte Dateien zuerst) |
| `--include-diffs` | Git-Diff-Abschnitt mit Arbeitsbaum- und gestuften Änderungen hinzufügen |
| `--include-logs` | Git-Commit-Historie mit Nachrichten und geänderten Dateien hinzufügen |
| `--include-logs-count <count>` | Anzahl der letzten Commits, die mit `--include-logs` eingeschlossen werden (Standard: `50`) |

## Dateiauswahloptionen

| Option | Beschreibung |
|--------|-------------|
| `--include <patterns>` | Nur Dateien einschließen, die diesen Glob-Mustern entsprechen (kommagetrennt, z.B. `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Zusätzliche Muster zum Ausschließen (kommagetrennt, z.B. `"*.test.js,docs/**"`) |
| `--no-gitignore` | `.gitignore`-Regeln nicht zum Filtern von Dateien verwenden |
| `--no-dot-ignore` | `.ignore`-Regeln nicht zum Filtern von Dateien verwenden |
| `--no-default-patterns` | Eingebaute Ignoriermuster (`node_modules`, `.git`, Build-Verzeichnisse, usw.) nicht anwenden |

## Remote-Repository-Optionen

| Option | Beschreibung |
|--------|-------------|
| `--remote <url>` | Remote-Repository klonen und packen (GitHub-URL oder `user/repo`-Format) |
| `--remote-branch <name>` | Spezifischen Branch, Tag oder Commit verwenden (Standard: Standard-Branch des Repositories) |
| `--remote-trust-config` | Konfigurationsdateien aus Remote-Repositories vertrauen und laden (aus Sicherheitsgründen standardmäßig deaktiviert) |

## Konfigurationsoptionen

| Option | Beschreibung |
|--------|-------------|
| `-c, --config <path>` | Benutzerdefinierte Konfigurationsdatei statt `repomix.config.json` verwenden |
| `--init` | Neue `repomix.config.json`-Datei mit Standardwerten erstellen |
| `--global` | Mit `--init`, Konfiguration im Home-Verzeichnis statt im aktuellen Verzeichnis erstellen |

## Sicherheitsoptionen
- `--no-security-check`: Scannen nach sensiblen Daten wie API-Schlüsseln und Passwörtern überspringen

## Token-Anzahl-Optionen
- `--token-count-encoding <encoding>`: Tokenizer-Modell für Zählung: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (Standard: o200k_base)

## MCP-Optionen
- `--mcp`: Als Model Context Protocol Server für AI-Tool-Integration ausführen

## Agent Skills Generierungsoptionen

| Option | Beschreibung |
|--------|-------------|
| `--skill-generate [name]` | Claude Agent Skills Format-Ausgabe ins Verzeichnis `.claude/skills/<name>/` generieren (Name wird automatisch generiert, wenn weggelassen) |
| `--skill-output <path>` | Skill-Ausgabeverzeichnis direkt angeben (überspringt die Standortauswahl) |
| `-f, --force` | Alle Bestätigungsaufforderungen überspringen (z.B. Skill-Verzeichnis überschreiben) |

## Verwandte Ressourcen

- [Konfiguration](/de/guide/configuration) - Optionen in der Konfigurationsdatei statt CLI-Flags setzen
- [Ausgabeformate](/de/guide/output) - Details zu XML, Markdown, JSON und Klartext
- [Code-Komprimierung](/de/guide/code-compress) - Wie `--compress` mit Tree-sitter funktioniert
- [Sicherheit](/de/guide/security) - Was `--no-security-check` deaktiviert

## Beispiele

```bash
# Grundlegende Nutzung
repomix

# Benutzerdefinierte Ausgabedatei und Format
repomix -o my-output.xml --style xml

# Ausgabe an stdout
repomix --stdout > custom-output.txt

# Ausgabe an stdout, dann an anderen Befehl weiterleiten (z.B. simonw/llm)
repomix --stdout | llm "Bitte erklären Sie, was dieser Code macht."

# Benutzerdefinierte Ausgabe mit Komprimierung
repomix --compress

# Spezifische Dateien mit Mustern verarbeiten
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Remote-Repository mit Branch
repomix --remote https://github.com/user/repo/tree/main

# Remote-Repository mit Commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Remote-Repository mit Kurzform
repomix --remote user/repo

# Dateiliste mit stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Git-Integration
repomix --include-diffs  # Git-Diffs für ungespeicherte Änderungen einschließen
repomix --include-logs   # Git-Logs einschließen (standardmäßig die letzten 50 Commits)
repomix --include-logs --include-logs-count 10  # Letzten 10 Commits einschließen
repomix --include-diffs --include-logs  # Sowohl Diffs als auch Logs einschließen

# Token-Anzahl-Analyse
repomix --token-count-tree
repomix --token-count-tree 1000  # Nur Dateien/Verzeichnisse mit 1000+ Tokens anzeigen
```

