---
title: "Konfiguration"
description: "Konfigurieren Sie Repomix mit JSON-, JSONC-, JSON5-, JavaScript- oder TypeScript-Dateien, einschließlich Ausgabeformaten, Include- und Ignore-Mustern sowie erweiterten Optionen."
---

# Konfiguration

Repomix kann über eine Konfigurationsdatei oder Kommandozeilenoptionen konfiguriert werden. Die Konfigurationsdatei ermöglicht es Ihnen, die Verarbeitung und Ausgabe Ihres Codes anzupassen.

## Konfigurationsdateiformate

Repomix unterstützt mehrere Konfigurationsdateiformate für Flexibilität und Benutzerfreundlichkeit.

Repomix sucht automatisch nach Konfigurationsdateien in der folgenden Prioritätsreihenfolge:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### JSON-Konfiguration

Erstellen Sie eine Konfigurationsdatei in Ihrem Projektverzeichnis:
```bash
repomix --init
```

Dies erstellt eine `repomix.config.json`-Datei mit Standardeinstellungen. Sie können auch eine globale Konfigurationsdatei erstellen, die als Fallback verwendet wird, wenn keine lokale Konfiguration gefunden wird:

```bash
repomix --init --global
```

### TypeScript-Konfiguration

TypeScript-Konfigurationsdateien bieten die beste Entwicklererfahrung mit vollständiger Typüberprüfung und IDE-Unterstützung.

**Installation:**

Um TypeScript- oder JavaScript-Konfiguration mit `defineConfig` zu verwenden, müssen Sie Repomix als Entwicklungsabhängigkeit installieren:

```bash
npm install -D repomix
```

**Beispiel:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Vorteile:**
- ✅ Vollständige TypeScript-Typüberprüfung in Ihrer IDE
- ✅ Hervorragende IDE-Autovervollständigung und IntelliSense
- ✅ Verwendung dynamischer Werte (Zeitstempel, Umgebungsvariablen usw.)

**Beispiel für dynamische Werte:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Zeitstempel-basierten Dateinamen generieren
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### JavaScript-Konfiguration

JavaScript-Konfigurationsdateien funktionieren genauso wie TypeScript und unterstützen `defineConfig` und dynamische Werte.

## Konfigurationsoptionen

| Option                           | Beschreibung                                                                                                                | Standardwert           |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Maximale zu verarbeitende Dateigröße in Bytes. Größere Dateien werden übersprungen. Nützlich zum Ausschließen großer Binär- oder Datendateien | `50000000`            |
| `output.filePath`                | Name der Ausgabedatei. Unterstützt XML-, Markdown- und Textformate                                                         | `"repomix-output.xml"` |
| `output.style`                   | Ausgabestil (`xml`, `markdown`, `json`, `plain`). Jedes Format hat seine Vorteile für verschiedene KI-Tools                       | `"xml"`                |
| `output.filePathStyle`           | Darstellung der Dateipfade in der Ausgabe (`target-relative` hält Pfade relativ zum jeweiligen Zielverzeichnis, `cwd-relative` hält Pfade relativ zum aktuellen Arbeitsverzeichnis) | `"target-relative"`    |
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
| `output.splitOutput`             | Ausgabe in mehrere nummerierte Dateien nach maximaler Größe pro Teil aufteilen (z.B. `1000000` für ~1MB). CLI akzeptiert lesbare Größen wie `500kb` oder `2mb`. Hält jede Datei unter dem Limit und verhindert, dass Quelldateien auf mehrere Ausgabedateien aufgeteilt werden | Nicht gesetzt |
| `output.tokenBudget`             | Mit einem von Null verschiedenen Exit-Code fehlschlagen, wenn die gepackte Ausgabe diese Anzahl an Token überschreitet. Dient als Schutz für CI-/Agent-Kontextgrenzen; die Ausgabe wird trotzdem generiert | Nicht gesetzt |
| `output.topFilesLength`          | Anzahl der in der Zusammenfassung anzuzeigenden Top-Dateien. Bei 0 wird keine Zusammenfassung angezeigt                  | `5`                    |
| `output.includeEmptyDirectories` | Ob leere Verzeichnisse in der Repository-Struktur enthalten sein sollen                                                   | `false`                |
| `output.includeFullDirectoryStructure` | Bei Verwendung von `include`-Mustern, ob der vollständige Verzeichnisbaum (unter Beachtung von Ignorier-Mustern) angezeigt werden soll, während nur die inkludierten Dateien verarbeitet werden. Bietet vollständigen Repository-Kontext für die KI-Analyse | `false`                |
| `output.git.sortByChanges`       | Ob Dateien nach Git-Änderungen sortiert werden sollen. Häufiger geänderte Dateien erscheinen am Ende                     | `true`                 |
| `output.git.sortByChangesMaxCommits` | Maximale Anzahl zu analysierender Commits für Git-Änderungen. Begrenzt die Historien-Tiefe für bessere Performance   | `100`                  |
| `output.git.includeDiffs`        | Ob Git-Unterschiede in der Ausgabe enthalten sein sollen. Zeigt Arbeitsverzeichnis- und Stage-Änderungen separat an     | `false`                |
| `output.git.includeLogs`         | Ob Git-Logs in der Ausgabe enthalten sein sollen. Zeigt Commit-Historie mit Daten, Nachrichten und Dateipfaden an       | `false`                |
| `output.git.includeLogsCount`    | Anzahl der Git-Log-Commits, die in die Ausgabe einbezogen werden sollen                                                   | `50`                   |
| `include`                        | Zu einschließende Dateimuster (verwendet [glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)) | `[]`                   |
| `ignore.useGitignore`            | Ob Muster aus der `.gitignore`-Datei des Projekts verwendet werden sollen                                                 | `true`                 |
| `ignore.useDotIgnore`            | Ob Muster aus der `.ignore`-Datei des Projekts verwendet werden sollen                                                    | `true`                 |
| `ignore.useDefaultPatterns`      | Ob Standard-Ignorier-Muster (node_modules, .git etc.) verwendet werden sollen                                             | `true`                 |
| `ignore.customPatterns`          | Zusätzliche Ignorier-Muster (verwendet [glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)) | `[]`                   |
| `security.enableSecurityCheck`   | Ob Secretlint verwendet werden soll, um Sicherheitsprüfungen auf sensible Informationen durchzuführen                    | `true`                 |
| `tokenCount.encoding`            | OpenAI-kompatibles Token-Count-Encoding (z.B. `o200k_base` für GPT-4o, `cl100k_base` für GPT-4/3.5). Verwendet [gpt-tokenizer](https://github.com/nicolo-ribaudo/gpt-tokenizer). | `"o200k_base"`         |

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
    "filePathStyle": "target-relative",
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
1. Lokale Konfigurationsdatei im aktuellen Verzeichnis (Priorität: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Globale Konfigurationsdatei (Priorität: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Kommandozeilenoptionen haben Vorrang vor Einstellungen in der Konfigurationsdatei.

## Include-Muster

Repomix unterstützt die Angabe einzuschließender Dateien mittels [Glob-Mustern](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). Dies ermöglicht eine flexiblere und leistungsfähigere Dateiauswahl:

- Verwenden Sie `**/*.js`, um alle JavaScript-Dateien in jedem Verzeichnis einzuschließen
- Verwenden Sie `src/**/*`, um alle Dateien innerhalb des `src`-Verzeichnisses und seiner Unterverzeichnisse einzuschließen
- Kombinieren Sie mehrere Muster wie `["src/**/*.js", "**/*.md"]`, um JavaScript-Dateien in `src` und alle Markdown-Dateien einzuschließen

Sie können Include-Muster in Ihrer Konfigurationsdatei angeben:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Oder verwenden Sie die Kommandozeilenoption `--include` für einmaliges Filtern.

## Ignorier-Muster

Repomix bietet mehrere Methoden zum Festlegen von Ignorier-Mustern, um bestimmte Dateien oder Verzeichnisse während des Packprozesses auszuschließen:

- **.gitignore**: Standardmäßig werden die in den `.gitignore`-Dateien und `.git/info/exclude` Ihres Projekts aufgelisteten Muster verwendet. Dieses Verhalten kann über die Einstellung `ignore.useGitignore` oder die CLI-Option `--no-gitignore` gesteuert werden.
- **.ignore**: Sie können eine `.ignore`-Datei im Stammverzeichnis Ihres Projekts verwenden, die dem gleichen Format wie `.gitignore` folgt. Diese Datei wird von Tools wie ripgrep und the silver searcher respektiert und reduziert die Notwendigkeit, mehrere Ignorier-Dateien zu pflegen. Dieses Verhalten kann über die Einstellung `ignore.useDotIgnore` oder die CLI-Option `--no-dot-ignore` gesteuert werden.
- **Standardmuster**: Repomix enthält eine Standardliste häufig ausgeschlossener Dateien und Verzeichnisse (z.B. node_modules, .git, Binärdateien). Diese Funktion kann über die Einstellung `ignore.useDefaultPatterns` oder die CLI-Option `--no-default-patterns` gesteuert werden. Weitere Details finden Sie in [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts).
- **.repomixignore**: Sie können eine `.repomixignore`-Datei in Ihrem Projektstamm erstellen, um Repomix-spezifische Ignorier-Muster zu definieren. Diese Datei folgt dem gleichen Format wie `.gitignore`.
- **Benutzerdefinierte Muster**: Zusätzliche Ignorier-Muster können über die Option `ignore.customPatterns` in der Konfigurationsdatei angegeben werden. Sie können diese Einstellung mit der Kommandozeilenoption `-i, --ignore` überschreiben.

**Prioritätsreihenfolge** (von höchster zu niedrigster):

1. Benutzerdefinierte Muster (`ignore.customPatterns`)
2. Ignorier-Dateien (`.repomixignore`, `.ignore`, `.gitignore` und `.git/info/exclude`):
   - Bei verschachtelten Verzeichnissen haben Dateien in tieferen Verzeichnissen höhere Priorität
   - Bei Dateien im selben Verzeichnis werden diese ohne bestimmte Reihenfolge zusammengeführt
3. Standardmuster (wenn `ignore.useDefaultPatterns` true ist und `--no-default-patterns` nicht verwendet wird)

Dieser Ansatz ermöglicht eine flexible Konfiguration des Dateiausschlusses basierend auf den Anforderungen Ihres Projekts. Er hilft, die Größe der generierten Packdatei zu optimieren, indem er den Ausschluss sicherheitssensibler Dateien und großer Binärdateien gewährleistet und gleichzeitig die Preisgabe vertraulicher Informationen verhindert.

**Hinweis:** Binärdateien werden standardmäßig nicht in der gepackten Ausgabe enthalten, aber ihre Pfade werden im Abschnitt "Repository-Struktur" der Ausgabedatei aufgelistet. Dies bietet einen vollständigen Überblick über die Repository-Struktur und hält gleichzeitig die gepackte Datei effizient und textbasiert. Weitere Details finden Sie unter [Binärdateiverarbeitung](#binärdateiverarbeitung).

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

## Binärdateiverarbeitung

Binärdateien (wie Bilder, PDFs, kompilierte Binärdateien, Archive usw.) werden speziell behandelt, um eine effiziente, textbasierte Ausgabe zu gewährleisten:

- **Dateiinhalte**: Binärdateien werden **nicht** in die gepackte Ausgabe aufgenommen, um die Datei textbasiert und effizient für die KI-Verarbeitung zu halten
- **Verzeichnisstruktur**: Binärdateipfade werden im Abschnitt der Verzeichnisstruktur **aufgelistet**, um einen vollständigen Überblick über Ihr Repository zu bieten

Dieser Ansatz stellt sicher, dass Sie eine vollständige Ansicht Ihrer Repository-Struktur erhalten und gleichzeitig eine effiziente, textbasierte Ausgabe beibehalten, die für den KI-Konsum optimiert ist.

**Beispiel:**

Wenn Ihr Repository `logo.png` und `app.jar` enthält:
- Sie erscheinen im Abschnitt Verzeichnisstruktur
- Ihre Inhalte werden nicht im Abschnitt Dateien enthalten sein

**Verzeichnisstruktur-Ausgabe:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

Auf diese Weise können KI-Tools verstehen, dass diese Binärdateien in Ihrer Projektstruktur existieren, ohne deren Binärinhalte zu verarbeiten.

**Hinweis:** Sie können den Schwellenwert für die maximale Dateigröße über die Konfigurationsoption `input.maxFileSize` steuern (Standard: 50MB). Dateien, die größer als dieser Grenzwert sind, werden vollständig übersprungen.

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

## Verwandte Ressourcen

- [Befehlszeilenoptionen](/de/guide/command-line-options) - Vollständige CLI-Referenz (CLI-Optionen überschreiben Konfigurationsdatei-Einstellungen)
- [Ausgabeformate](/de/guide/output) - Details zu jedem Ausgabeformat
- [Sicherheit](/de/guide/security) - Wie Repomix sensible Informationen erkennt
- [Code-Komprimierung](/de/guide/code-compress) - Token-Anzahl mit Tree-sitter reduzieren
- [GitHub-Repository-Verarbeitung](/de/guide/remote-repository-processing) - Optionen für Remote-Repositories
