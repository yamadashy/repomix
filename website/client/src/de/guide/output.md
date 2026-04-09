# Ausgabeformate

Repomix unterstützt vier Ausgabeformate:
- XML (Standard)
- Markdown
- JSON
- Klartext

## XML-Format

```bash
repomix --style xml
```

Das XML-Format ist für die KI-Verarbeitung optimiert:

```xml
Diese Datei ist eine zusammengeführte Darstellung der gesamten Codebasis...

<file_summary>
(Metadaten und KI-Anweisungen)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Dateiinhalt hier
</file>
</files>

<git_logs>
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
</git_logs>
```

### Warum XML als Standardformat?

Repomix verwendet XML als Standard-Ausgabeformat basierend auf umfangreichen Forschungen und Tests. Diese Entscheidung gründet auf empirischen Belegen und praktischen Überlegungen für KI-unterstützte Codeanalyse.

Unsere Wahl von XML wird hauptsächlich von offiziellen Empfehlungen großer KI-Anbieter beeinflusst:
- **Anthropic (Claude)**: Empfiehlt explizit die Verwendung von XML-Tags zur Strukturierung von Prompts und erklärt, dass "Claude während des Trainings solchen Prompts ausgesetzt war" ([Dokumentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Empfiehlt strukturierte Formate einschließlich XML für komplexe Aufgaben ([Dokumentation](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Befürwortet strukturiertes Prompting in komplexen Szenarien ([Ankündigung](https://x.com/OpenAIDevs/status/1890147300493914437), [Cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Markdown-Format

```bash
repomix --style markdown
```

Markdown bietet lesbare Formatierung:

````markdown
Diese Datei ist eine zusammengeführte Darstellung der gesamten Codebasis...

# Dateizusammenfassung
(Metadaten und KI-Anweisungen)

# Verzeichnisstruktur
```text
src/
  index.ts
  utils/
    helper.ts
```

# Dateien

## Datei: src/index.ts
```typescript
// Dateiinhalt hier
```

# Git-Logs
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
```` 

## JSON-Format

```bash
repomix --style json
```

Das JSON-Format bietet strukturierte, programmatisch zugängliche Ausgabe mit camelCase-Eigenschaftsnamen:

```json
{
  "fileSummary": {
    "generationHeader": "Diese Datei ist eine zusammengeführte Darstellung der gesamten Codebasis, die von Repomix in ein einziges Dokument kombiniert wurde.",
    "purpose": "Diese Datei enthält eine gepackte Darstellung des gesamten Repository-Inhalts...",
    "fileFormat": "Der Inhalt ist wie folgt organisiert...",
    "usageGuidelines": "- Diese Datei sollte als schreibgeschützt behandelt werden...",
    "notes": "- Einige Dateien wurden möglicherweise aufgrund von .gitignore-Regeln ausgeschlossen..."
  },
  "userProvidedHeader": "Benutzerdefinierter Header-Text falls angegeben",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Dateiinhalt hier",
    "src/utils.js": "// Dateiinhalt hier"
  },
  "instruction": "Benutzerdefinierte Anweisungen aus instructionFilePath"
}
```

### Vorteile des JSON-Formats

Das JSON-Format ist ideal für:
- **Programmatische Verarbeitung**: Einfaches Parsen und Manipulieren mit JSON-Bibliotheken in jeder Programmiersprache
- **API-Integration**: Direkte Nutzung durch Webdienste und Anwendungen
- **KI-Tool-Kompatibilität**: Strukturiertes Format optimiert für maschinelles Lernen und KI-Systeme
- **Datenanalyse**: Unkomplizierte Extraktion spezifischer Informationen mit Tools wie `jq`

### Arbeiten mit JSON-Ausgabe mit `jq`

Das JSON-Format macht es einfach, spezifische Informationen programmatisch zu extrahieren. Hier sind häufige Beispiele:

#### Grundlegende Dateioperationen
```bash
# Alle Dateipfade auflisten
cat repomix-output.json | jq -r '.files | keys[]'

# Gesamtanzahl der Dateien zählen
cat repomix-output.json | jq '.files | keys | length'

# Spezifischen Dateiinhalt extrahieren
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Dateifilterung und -analyse
```bash
# Dateien nach Erweiterung finden
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Dateien mit spezifischem Text finden
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Dateiliste mit Zeichenzählung erstellen
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) Zeichen"'
```

#### Metadaten-Extraktion
```bash
# Verzeichnisstruktur extrahieren
cat repomix-output.json | jq -r '.directoryStructure'

# Dateizusammenfassungsinformationen abrufen
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Benutzerdefinierte Header extrahieren (falls vorhanden)
cat repomix-output.json | jq -r '.userProvidedHeader // "Kein Header angegeben"'

# Benutzerdefinierte Anweisungen abrufen
cat repomix-output.json | jq -r '.instruction // "Keine Anweisungen angegeben"'
```

#### Erweiterte Analyse
```bash
# Größte Dateien nach Inhaltslänge finden
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Nach Dateien mit spezifischen Mustern suchen
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Dateipfade mit mehreren Erweiterungen extrahieren
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Klartext-Format

```bash
repomix --style plain
```

Ausgabestruktur:
```text
Diese Datei ist eine zusammengeführte Darstellung der gesamten Codebasis...

================
Dateizusammenfassung
================
(Metadaten und KI-Anweisungen)

================
Verzeichnisstruktur
================
src/
  index.ts
  utils/
    helper.ts

================
Dateien
================

================
Datei: src/index.ts
================
// Dateiinhalt hier

================
Git-Logs
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## Verwendung mit KI-Modellen

Jedes Format funktioniert gut mit KI-Modellen, aber berücksichtigen Sie:
- Verwenden Sie XML für Claude (beste Parsing-Genauigkeit)
- Verwenden Sie Markdown für allgemeine Lesbarkeit
- Verwenden Sie JSON für programmatische Verarbeitung und API-Integration
- Verwenden Sie Klartext für Einfachheit und universelle Kompatibilität

## Anpassung

Setzen Sie das Standardformat in `repomix.config.json`:
```json
{
  "output": {
    "style": "json",
    "filePath": "output.json"
  }
}

## Verwandte Ressourcen

- [Konfiguration](/de/guide/configuration) - Vollständige Referenz der Konfigurationsoptionen
- [Befehlszeilenoptionen](/de/guide/command-line-options) - `--style` zum Setzen des Ausgabeformats verwenden
- [Code-Komprimierung](/de/guide/code-compress) - Token-Anzahl reduzieren und Struktur beibehalten
- [Prompt-Beispiele](/de/guide/prompt-examples) - Tipps zur Verwendung der Ausgabe mit verschiedenen KI-Modellen
```
