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
- `--top-files-len <number>`: Anzahl der größten Dateien in der Zusammenfassung (Standard: 5, z.B. --top-files-len 20)

## Repomix-Ausgabeoptionen
- `-o, --output <file>`: Ausgabedateipfad (Standard: repomix-output.xml, "-" für stdout)
- `--style <type>`: Ausgabeformat: xml, markdown, json oder plain (Standard: xml)
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
- `--split-output <size>`: Ausgabe in mehrere nummerierte Dateien aufteilen (z.B. repomix-output.1.xml, repomix-output.2.xml); Größe z.B. 500kb, 2mb oder 1.5mb
- `--include-empty-directories`: Leere Verzeichnisse in die Ausgabe einschließen
- `--include-full-directory-structure`: Gesamten Repository-Baum im Verzeichnisstruktur-Abschnitt anzeigen, auch bei Verwendung von --include-Mustern
- `--include-diffs`: Git-Diffs in die Ausgabe einschließen (beinhaltet Arbeitsbaum- und gestufte Änderungen separat)
- `--include-logs`: Git-Logs in die Ausgabe einschließen (beinhaltet Commit-Historie mit Daten, Nachrichten und Dateipfaden)
- `--include-logs-count <count>`: Anzahl der Git-Log-Commits, die eingeschlossen werden sollen (Standard: 50)
- `--no-git-sort-by-changes`: Sortierung der Dateien nach Git-Änderungsanzahl deaktivieren (standardmäßig aktiviert)

## Dateiauswahloptionen
- `--include <patterns>`: Liste der Einschlussmuster (kommagetrennt)
- `-i, --ignore <patterns>`: Zusätzliche Ignoriermuster (kommagetrennt)
- `--no-gitignore`: .gitignore-Datei-Nutzung deaktivieren
- `--no-dot-ignore`: .ignore-Datei-Nutzung deaktivieren
- `--no-default-patterns`: Standardmuster deaktivieren

## Remote-Repository-Optionen
- `--remote <url>`: Remote-Repository verarbeiten
- `--remote-branch <name>`: Remote-Branch-Name, Tag oder Commit-Hash angeben (Standard ist Repository-Standard-Branch)

## Konfigurationsoptionen
- `-c, --config <path>`: Benutzerdefinierten Konfigurationsdateipfad
- `--init`: Konfigurationsdatei erstellen
- `--global`: Globale Konfiguration verwenden

## Sicherheitsoptionen
- `--no-security-check`: Scannen nach sensiblen Daten wie API-Schlüsseln und Passwörtern überspringen

## Token-Anzahl-Optionen
- `--token-count-encoding <encoding>`: Tokenizer-Modell für Zählung: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (Standard: o200k_base)

## MCP-Optionen
- `--mcp`: Als Model Context Protocol Server für AI-Tool-Integration ausführen

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

