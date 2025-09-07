# Befehlszeilenoptionen

## Grundlegende Optionen
- `-v, --version`: Tool-Version anzeigen

## CLI Ein-/Ausgabeoptionen
- `--verbose`: Ausführliche Protokollierung aktivieren
- `--quiet`: Alle Ausgaben an stdout deaktivieren
- `--stdout`: Ausgabe an stdout statt in eine Datei (kann nicht mit `--output` Option verwendet werden)
- `--stdin`: Dateipfade von stdin lesen statt Dateien automatisch zu entdecken
- `--copy`: Generierte Ausgabe zusätzlich in die Systemzwischenablage kopieren
- `--token-count-tree [threshold]`: Dateibaum mit Token-Anzahl-Zusammenfassungen anzeigen (optional: minimale Token-Anzahl-Schwelle). Nützlich zur Identifizierung großer Dateien und Optimierung der Token-Nutzung für KI-Kontextlimits
- `--top-files-len <number>`: Anzahl der Top-Dateien in der Zusammenfassung

## Repomix-Ausgabeoptionen
- `-o, --output <file>`: Ausgabedateiname angeben
- `--style <style>`: Ausgabestil angeben (`xml`, `markdown`, `plain`)
- `--parsable-style`: Parsbare Ausgabe basierend auf dem gewählten Stil-Schema aktivieren. Beachten Sie, dass dies die Token-Anzahl erhöhen kann.
- `--compress`: Intelligente Code-Extraktion durchführen, die sich auf wesentliche Funktions- und Klassensignaturen konzentriert, um die Token-Anzahl zu reduzieren
- `--output-show-line-numbers`: Zeilennummern in der Ausgabe anzeigen
- `--no-file-summary`: Datei-Zusammenfassungsbereich-Ausgabe deaktivieren
- `--no-directory-structure`: Verzeichnisstruktur-Bereich-Ausgabe deaktivieren
- `--no-files`: Dateiinhalt-Ausgabe deaktivieren (nur Metadaten-Modus)
- `--remove-comments`: Kommentare aus unterstützten Dateitypen entfernen
- `--remove-empty-lines`: Leere Zeilen aus der Ausgabe entfernen
- `--truncate-base64`: Kürzung von Base64-Datenstrings aktivieren
- `--header-text <text>`: Benutzerdefinierten Text im Dateikopf einschließen
- `--instruction-file-path <path>`: Pfad zu einer Datei mit detaillierten benutzerdefinierten Anweisungen
- `--include-empty-directories`: Leere Verzeichnisse in die Ausgabe einschließen
- `--include-diffs`: Git-Diffs in die Ausgabe einschließen (beinhaltet Arbeitsbaum- und gestufte Änderungen separat)
- `--include-logs`: Git-Logs in die Ausgabe einschließen (beinhaltet Commit-Historie mit Daten, Nachrichten und Dateipfaden)
- `--include-logs-count <count>`: Anzahl der Git-Log-Commits, die eingeschlossen werden sollen (Standard: 50)
- `--no-git-sort-by-changes`: Sortierung der Dateien nach Git-Änderungsanzahl deaktivieren (standardmäßig aktiviert)

## Dateiauswahloptionen
- `--include <patterns>`: Liste der Einschlussmuster (kommagetrennt)
- `-i, --ignore <patterns>`: Zusätzliche Ignoriermuster (kommagetrennt)
- `--ignore-content <patterns>`: Skip file content for matched patterns (comma-separated; prefix with `!` to keep specific paths)
- `--no-gitignore`: .gitignore-Datei-Nutzung deaktivieren
- `--no-default-patterns`: Standardmuster deaktivieren

## Remote-Repository-Optionen
- `--remote <url>`: Remote-Repository verarbeiten
- `--remote-branch <name>`: Remote-Branch-Name, Tag oder Commit-Hash angeben (Standard ist Repository-Standard-Branch)

## Konfigurationsoptionen
- `-c, --config <path>`: Benutzerdefinierten Konfigurationsdateipfad
- `--init`: Konfigurationsdatei erstellen
- `--global`: Globale Konfiguration verwenden

## Sicherheitsoptionen
- `--no-security-check`: Sicherheitsprüfung deaktivieren (Standard: `true`)

## Token-Anzahl-Optionen
- `--token-count-encoding <encoding>`: Token-Anzahl-Kodierung angeben, die von OpenAIs [tiktoken](https://github.com/openai/tiktoken) Tokenizer verwendet wird (z.B. `o200k_base` für GPT-4o, `cl100k_base` für GPT-4/3.5). Siehe [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) für Kodierungsdetails.


## Beispiele

```bash
# Grundlegende Nutzung
repomix

# Benutzerdefinierte Ausgabe
repomix -o output.xml --style xml

# Ausgabe an stdout
repomix --stdout > custom-output.txt

# Ausgabe an stdout, dann an anderen Befehl weiterleiten (z.B. simonw/llm)
repomix --stdout | llm "Bitte erklären Sie, was dieser Code macht."

# Benutzerdefinierte Ausgabe mit Komprimierung
repomix --compress

# Spezifische Dateien verarbeiten
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Ignore file contents for matching patterns
repomix --ignore-content "components/**,!components/slider/**"

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

