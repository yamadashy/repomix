# Konfiguration

Repomix kann über eine Konfigurationsdatei (`repomix.config.json`) oder Kommandozeilenoptionen konfiguriert werden. Die Konfigurationsdatei ermöglicht es Ihnen, die Verarbeitung und Ausgabe Ihres Codes anzupassen.

## Schnellstart

Erstellen Sie eine Konfigurationsdatei in Ihrem Projektverzeichnis:
```bash
repomix --init
```

Dies erstellt eine `repomix.config.json`-Datei mit Standardeinstellungen. Sie können auch eine globale Konfigurationsdatei erstellen, die als Fallback verwendet wird, wenn keine lokale Konfiguration gefunden wird:

```bash
repomix --init --global
```

## Konfigurationsoptionen

| Option                           | Beschreibung                                                                                                                | Standardwert           |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Maximale zu verarbeitende Dateigröße in Bytes. Größere Dateien werden übersprungen. Nützlich zum Ausschließen großer Binär- oder Datendateien | `50000000`            |
| `output.filePath`                | Name der Ausgabedatei. Unterstützt XML-, Markdown- und Textformate                                                         | `"repomix-output.xml"` |
| `output.style`                   | Ausgabestil (`xml`, `markdown`, `plain`). Jedes Format hat seine Vorteile für verschiedene KI-Tools                       | `"xml"`                |
| `output.parsableStyle`           | Ob die Ausgabe gemäß dem gewählten Stilschema escaped werden soll. Ermöglicht besseres Parsing, kann aber die Token-Anzahl erhöhen | `false`                |
| `output.compress`                | Ob Tree-sitter verwendet werden soll, um intelligente Codeextraktion durchzuführen und dabei die Struktur beizubehalten, während die Token-Anzahl reduziert wird | `false`                |
| `output.headerText`              | Benutzerdefinierter Text für den Dateikopf. Nützlich für die Bereitstellung von Kontext oder Anweisungen für KI-Tools    | `null`                 |
| `output.instructionFilePath`     | Pfad zu einer Datei mit detaillierten benutzerdefinierten Anweisungen für die KI-Verarbeitung                            | `null`                 |
| `output.fileSummary`             | Ob eine Zusammenfassung mit Dateianzahl, -größen und anderen Metriken am Anfang der Ausgabe eingefügt werden soll        | `true`                 |
| `output.directoryStructure`      | Ob die Verzeichnisstruktur in der Ausgabe enthalten sein soll. Hilft der KI, die Projektorganisation zu verstehen       | `true`                 |
| `output.files`                   | Ob Dateiinhalte in der Ausgabe enthalten sein sollen. Bei false werden nur Struktur und Metadaten einbezogen            | `true`                 |
| `output.removeComments`          | Ob Kommentare aus unterstützten Dateitypen entfernt werden sollen. Kann Rauschen und Token-Anzahl reduzieren            | `false`                |
| `output.removeEmptyLines`        | Ob leere Zeilen aus der Ausgabe entfernt werden sollen, um die Token-Anzahl zu reduzieren                                | `false`                |
| `output.showLineNumbers`         | Ob Zeilennummern hinzugefügt werden sollen. Hilfreich für das Referenzieren bestimmter Codestellen                      | `false`                |
| `output.truncateBase64`          | Ob lange base64-Datenstrings (z.B. Bilder) abgeschnitten werden sollen, um die Token-Anzahl zu reduzieren               | `false`                |
| `output.copyToClipboard`         | Ob die Ausgabe zusätzlich zum Speichern in die Zwischenablage kopiert werden soll                                        | `false`                |
| `output.topFilesLength`          | Anzahl der in der Zusammenfassung anzuzeigenden Top-Dateien. Bei 0 wird keine Zusammenfassung angezeigt                  | `5`                    |
| `output.includeEmptyDirectories` | Ob leere Verzeichnisse in der Repository-Struktur enthalten sein sollen                                                   | `false`                |
| `output.git.sortByChanges`       | Ob Dateien nach Git-Änderungen sortiert werden sollen. Häufiger geänderte Dateien erscheinen am Ende                     | `true`                 |
| `output.git.sortByChangesMaxCommits` | Maximale Anzahl zu analysierender Commits für Git-Änderungen. Begrenzt die Historien-Tiefe für bessere Performance   | `100`                  |
| `output.git.includeDiffs`        | Ob Git-Unterschiede in der Ausgabe enthalten sein sollen. Zeigt Arbeitsverzeichnis- und Stage-Änderungen separat an     | `false`                |
| `output.git.includeLogs`         | Ob Git-Logs in der Ausgabe enthalten sein sollen. Zeigt Commit-Historie mit Daten, Nachrichten und Dateipfaden an       | `false`                |
| `output.git.includeLogsCount`    | Anzahl der Git-Log-Commits, die in die Ausgabe einbezogen werden sollen                                                   | `50`                   |
| `include`                        | Zu einschließende Dateimuster (verwendet [glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)) | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | Ob Muster aus der `.gitignore`-Datei des Projekts verwendet werden sollen                                                 | `true`                 |
| `ignore.useDefaultPatterns`      | Ob Standard-Ignorier-Muster (node_modules, .git etc.) verwendet werden sollen                                             | `true`                 |
| `ignore.customPatterns`          | Zusätzliche Ignorier-Muster (verwendet [glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)) | `[]`                   |
| `security.enableSecurityCheck`   | Ob Secretlint verwendet werden soll, um Sicherheitsprüfungen auf sensible Informationen durchzuführen                    | `true`                 |
| `tokenCount.encoding`            | Token-Count-Encoding für OpenAIs [tiktoken](https://github.com/openai/tiktoken) Tokenizer. Verwenden Sie `o200k_base` für GPT-4o, `cl100k_base` für GPT-4/3.5. Details siehe [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) | `"o200k_base"`         |

Die Konfigurationsdatei unterstützt [JSON5](https://json5.org/)-Syntax, die Folgendes erlaubt:
- Kommentare (einzeilig und mehrzeilig)
- Nachfolgende Kommas in Objekten und Arrays
- Unquotierte Eigenschaftsnamen
- Flexiblere String-Syntax

## Schema-Validierung

Sie können die Schema-Validierung für Ihre Konfigurationsdatei aktivieren, indem Sie die Eigenschaft `$schema` hinzufügen:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Dies bietet Autovervollständigung und Validierung in Editoren, die JSON-Schema unterstützen.

## Beispiel-Konfigurationsdatei

Hier ist ein Beispiel einer vollständigen Konfigurationsdatei (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Benutzerdefinierte Header-Informationen für die gepackte Datei",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignoreContent": ["components/**", "!components/slider/**"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Muster können auch in .repomixignore angegeben werden
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Speicherorte der Konfigurationsdatei

Repomix sucht in folgender Reihenfolge nach Konfigurationsdateien:
1. Lokale Konfigurationsdatei (`repomix.config.json`) im aktuellen Verzeichnis
2. Globale Konfigurationsdatei:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

Kommandozeilenoptionen haben Vorrang vor Einstellungen in der Konfigurationsdatei.

## Ignorier-Muster

Repomix bietet mehrere Möglichkeiten, zu ignorierende Dateien anzugeben. Die Muster werden in folgender Prioritätsreihenfolge verarbeitet:

1. CLI-Optionen (`--ignore`)
2. `.repomixignore`-Datei im Projektverzeichnis
3. `.gitignore` und `.git/info/exclude` (wenn `ignore.useGitignore` true ist)
4. Standardmuster (wenn `ignore.useDefaultPatterns` true ist)

Beispiel für `.repomixignore`:
```text
# Cache-Verzeichnisse
.cache/
tmp/

# Build-Ausgaben
dist/
build/

# Logs
*.log
```

## Standard-Ignorier-Muster

Wenn `ignore.useDefaultPatterns` true ist, ignoriert Repomix automatisch folgende häufige Muster:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Die vollständige Liste finden Sie in [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Erweiterte Funktionen

### Code-Komprimierung

Die Code-Komprimierungsfunktion (aktiviert durch `output.compress: true`) verwendet [Tree-sitter](https://github.com/tree-sitter/tree-sitter), um wesentliche Code-Strukturen intelligent zu extrahieren und dabei Implementierungsdetails zu entfernen. Dies hilft, die Token-Anzahl zu reduzieren und gleichzeitig wichtige strukturelle Informationen beizubehalten.

Hauptvorteile:
- Signifikante Reduzierung der Token-Anzahl
- Beibehaltung von Klassen- und Funktionssignaturen
- Beibehaltung von Imports und Exports
- Beibehaltung von Typdefinitionen und Interfaces
- Entfernung von Funktionskörpern und Implementierungsdetails

Weitere Details und Beispiele finden Sie im [Code-Komprimierungs-Leitfaden](code-compress).

### Git-Integration

Die `output.git`-Konfiguration bietet leistungsstarke Git-bewusste Funktionen:

- `sortByChanges`: Wenn auf true gesetzt, werden Dateien nach der Anzahl der Git-Änderungen (Commits, die die Datei modifiziert haben) sortiert. Häufiger geänderte Dateien erscheinen am Ende der Ausgabe. Dies hilft, aktiver entwickelte Dateien zu priorisieren. Standard: `true`
- `sortByChangesMaxCommits`: Maximale Anzahl zu analysierender Commits bei der Zählung von Dateiänderungen. Standard: `100`
- `includeDiffs`: Wenn auf true gesetzt, werden Git-Unterschiede in die Ausgabe einbezogen (enthält sowohl Arbeitsverzeichnis- als auch Stage-Änderungen separat). Dies ermöglicht es dem Leser, ausstehende Änderungen im Repository zu sehen. Standard: `false`
- `includeLogs`: Wenn auf true gesetzt, werden Git-Logs in die Ausgabe einbezogen. Zeigt Commit-Historie mit Daten, Nachrichten und Dateipfaden für jeden Commit an. Dies hilft der KI, Entwicklungsmuster und Dateibeziehungen zu verstehen. Standard: `false`
- `includeLogsCount`: Die Anzahl der letzten Commits, die in die Git-Logs einbezogen werden sollen. Standard: `50`

Beispielkonfiguration:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Sicherheitsprüfungen

Wenn `security.enableSecurityCheck` aktiviert ist, verwendet Repomix [Secretlint](https://github.com/secretlint/secretlint), um sensible Informationen zu erkennen, bevor der Code in die Ausgabe aufgenommen wird. Dies hilft, versehentliche Offenlegung zu verhindern von:

- API-Schlüsseln
- Zugriffstoken
- Privaten Schlüsseln
- Passwörtern
- Anderen sensiblen Anmeldeinformationen

### Kommentarentfernung

Wenn `output.removeComments` auf `true` gesetzt ist, werden Kommentare aus unterstützten Dateitypen entfernt, um die Ausgabegröße zu reduzieren und sich auf den wesentlichen Code-Inhalt zu konzentrieren. Dies ist besonders nützlich in folgenden Fällen:

- Verarbeitung stark dokumentierten Codes
- Versuch, die Token-Anzahl zu reduzieren
- Fokussierung auf Code-Struktur und -Logik

Unterstützte Sprachen und detaillierte Beispiele finden Sie im [Kommentarentfernungs-Leitfaden](comment-removal).
