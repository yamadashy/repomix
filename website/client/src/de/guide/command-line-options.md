# Kommandozeilenoptionen

## Grundlegende Optionen
- `-v, --version`: Zeigt die Werkzeugversion an

## Ausgabeoptionen
- `-o, --output <file>`: Name der Ausgabedatei (Standard: `repomix-output.txt`)
- `--stdout`: Ausgabe an stdout anstatt in eine Datei zu schreiben (kann nicht mit der Option `--output` verwendet werden)
- `--style <type>`: Ausgabestil (`plain`, `xml`, `markdown`) (Standard: `xml`)
- `--parsable-style`: Aktiviert analysierbare Ausgabe basierend auf dem gewählten Stilschema (Standard: `false`)
- `--compress`: Führt intelligente Code-Extraktion durch, konzentriert sich auf wesentliche Funktions- und Klassensignaturen und entfernt Implementierungsdetails. Weitere Details und Beispiele finden Sie im [Code-Komprimierungsleitfaden](code-compress).
- `--output-show-line-numbers`: Fügt Zeilennummern hinzu (Standard: `false`)
- `--copy`: In die Zwischenablage kopieren (Standard: `false`)
- `--no-file-summary`: Deaktiviert die Dateizusammenfassung (Standard: `true`)
- `--no-directory-structure`: Deaktiviert die Verzeichnisstruktur (Standard: `true`)
- `--no-files`: Deaktiviert die Ausgabe von Dateiinhalten (Nur-Metadaten-Modus) (Standard: `true`)
- `--remove-comments`: Entfernt Kommentare (Standard: `false`)
- `--remove-empty-lines`: Entfernt Leerzeilen (Standard: `false`)
- `--header-text <text>`: Benutzerdefinierter Text, der in den Dateikopf aufgenommen werden soll
- `--instruction-file-path <path>`: Pfad zu einer Datei mit detaillierten benutzerdefinierten Anweisungen
- `--include-empty-directories`: Leere Verzeichnisse in die Ausgabe einbeziehen (Standard: `false`)
- `--include-diffs`: Git-Unterschiede in die Ausgabe einbeziehen (enthält sowohl Arbeitsbaum- als auch inszenierte Änderungen separat) (Standard: `false`)
- `--no-git-sort-by-changes`: Deaktiviert die Sortierung von Dateien nach Git-Änderungszählung (Standard: `true`)

## Filteroptionen
- `--include <patterns>`: Einschlussmuster (durch Kommas getrennt)
- `-i, --ignore <patterns>`: Ignorierungsmuster (durch Kommas getrennt)
- `--no-gitignore`: Deaktiviert die Verwendung der .gitignore-Datei
- `--no-default-patterns`: Deaktiviert Standardmuster

## Optionen für Remote-Repositories
- `--remote <url>`: Verarbeitet Remote-Repository
- `--remote-branch <name>`: Gibt den Remote-Branch-Namen, Tag oder Commit-Hash an (standardmäßig der Standard-Branch des Repositories)

## Konfigurationsoptionen
- `-c, --config <path>`: Pfad zur benutzerdefinierten Konfigurationsdatei
- `--init`: Erstellt Konfigurationsdatei
- `--global`: Verwendet globale Konfiguration

## Sicherheitsoptionen
- `--no-security-check`: Deaktiviert Sicherheitsprüfung (Standard: `true`)

## Token-Zähloptionen
- `--token-count-encoding <encoding>`: Gibt die Token-Zählkodierung an (z.B. `o200k_base`, `cl100k_base`) (Standard: `o200k_base`)

## Andere Optionen
- `--top-files-len <number>`: Anzahl der anzuzeigenden Top-Dateien (Standard: `5`)
- `--verbose`: Aktiviert ausführliche Protokollierung
- `--quiet`: Deaktiviert alle Ausgaben an stdout

## Beispiele

```bash
# Grundlegende Verwendung
repomix

# Benutzerdefinierte Ausgabe
repomix -o output.xml --style xml

# Ausgabe an stdout
repomix --stdout > custom-output.txt

# Ausgabe an stdout senden und dann in einen anderen Befehl weiterleiten (zum Beispiel simonw/llm)
repomix --stdout | llm "Bitte erkläre, was dieser Code macht."

# Benutzerdefinierte Ausgabe mit Komprimierung
repomix --compress

# Spezifische Dateien verarbeiten
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Remote-Repository mit Branch
repomix --remote https://github.com/user/repo/tree/main

# Remote-Repository mit Kurzform
repomix --remote user/repo
```
