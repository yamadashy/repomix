# Kommandozeilenoptionen

## Grundlegende Optionen
- `-v, --version`: Zeigt die Version an

## Ausgabeoptionen
- `-o, --output <file>`: Ausgabedateiname (Standard: `repomix-output.txt`)
- `--stdout`: Ausgabe an die Standardausgabe anstatt in eine Datei (kann nicht mit der Option `--output` verwendet werden)
- `--style <type>`: Ausgabeformat (`plain`, `xml`, `markdown`) (Standard: `xml`)
- `--parsable-style`: Aktiviert parsbare Ausgabe basierend auf dem gewählten Formatschema (Standard: `false`)
- `--compress`: Führt eine intelligente Code-Extraktion durch, die sich auf Funktions- und Klassensignaturen konzentriert und Implementierungsdetails entfernt. Weitere Details und Beispiele finden Sie im [Code-Komprimierungsleitfaden](code-compress)
- `--output-show-line-numbers`: Fügt Zeilennummern hinzu (Standard: `false`)
- `--copy`: In die Zwischenablage kopieren (Standard: `false`)
- `--no-file-summary`: Deaktiviert die Dateizusammenfassung (Standard: `true`)
- `--no-directory-structure`: Deaktiviert die Verzeichnisstruktur (Standard: `true`)
- `--no-files`: Deaktiviert die Ausgabe des Dateiinhalts (Nur-Metadaten-Modus) (Standard: `true`)
- `--remove-comments`: Entfernt Kommentare (Standard: `false`)
- `--remove-empty-lines`: Entfernt leere Zeilen (Standard: `false`)
- `--header-text <text>`: Benutzerdefinierter Text für den Dateikopf
- `--instruction-file-path <path>`: Pfad zu einer Datei mit detaillierten benutzerdefinierten Anweisungen
- `--include-empty-directories`: Leere Verzeichnisse in die Ausgabe einbeziehen (Standard: `false`)
- `--include-diffs`: Git-Unterschiede in die Ausgabe einbeziehen (enthält sowohl Arbeitsbaum- als auch gestaged Änderungen separat) (Standard: `false`)

## Filteroptionen
- `--include <patterns>`: Einzuschließende Muster (durch Komma getrennt)
- `-i, --ignore <patterns>`: Zu ignorierende Muster (durch Komma getrennt)
- `--no-gitignore`: Deaktiviert die Verwendung der .gitignore-Datei
- `--no-default-patterns`: Deaktiviert Standardmuster

## Remote-Repository-Optionen
- `--remote <url>`: Remote-Repository verarbeiten
- `--remote-branch <name>`: Remote-Branch-Name, Tag oder Commit-Hash angeben (Standard ist der Standard-Branch des Repositories)

## Konfigurationsoptionen
- `-c, --config <path>`: Pfad zur benutzerdefinierten Konfigurationsdatei
- `--init`: Konfigurationsdatei erstellen
- `--global`: Globale Konfiguration verwenden

## Sicherheitsoptionen
- `--no-security-check`: Deaktiviert die Sicherheitsprüfung (Standard: `true`)

## Token-Zähloptionen
- `--token-count-encoding <encoding>`: Token-Zählkodierung festlegen (z.B. `o200k_base`, `cl100k_base`) (Standard: `o200k_base`)

## Weitere Optionen
- `--top-files-len <number>`: Anzahl der anzuzeigenden Top-Dateien (Standard: `5`)
- `--verbose`: Ausführliche Protokollierung aktivieren
- `--quiet`: Deaktiviert alle Ausgaben an stdout

## Beispiele

```bash
# Grundlegende Verwendung
repomix

# Benutzerdefinierte Ausgabe
repomix -o output.xml --style xml

# Ausgabe an die Standardausgabe
repomix --stdout > custom-output.txt

# Ausgabe an die Standardausgabe senden, dann in einen anderen Befehl weiterleiten (zum Beispiel: simonw/llm)
repomix --stdout | llm "Bitte erkläre, was dieser Code macht"

# Benutzerdefinierte Ausgabe mit Komprimierung
repomix --compress

# Bestimmte Dateien verarbeiten
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Remote-Repository mit Branch
repomix --remote https://github.com/user/repo/tree/main

# Remote-Repository mit Commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Remote-Repository mit Kurzform
repomix --remote user/repo

# Dateiliste von stdin (automatische Erkennung)
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
