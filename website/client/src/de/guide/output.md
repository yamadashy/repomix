# Ausgabeformate

Repomix unterstützt drei Ausgabeformate:
- Klartext (Standard)
- XML
- Markdown

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
```

## XML-Format

```bash
repomix --style xml
```

Das XML-Format ist für die KI-Verarbeitung optimiert:

::: tip Warum XML?
XML-Tags helfen KI-Modellen wie Claude, Inhalte genauer zu analysieren. Die [Claude-Dokumentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) empfiehlt die Verwendung von XML-Tags für strukturierte Prompts.
:::

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

## Markdown-Format

```bash
repomix --style markdown
```

Markdown bietet lesbare Formatierung:

```markdown
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
