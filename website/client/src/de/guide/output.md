# Ausgabeformate

Repomix unterstützt drei Ausgabeformate:
- XML (Standard): Das am stärksten strukturierte Format, ideal für KI-Tools wie Claude, die XML effizient analysieren
- Markdown: Ausgewogenes Verhältnis zwischen Lesbarkeit und Struktur, hervorragend für GitHub und dokumentenorientierte Arbeitsabläufe
- Klartext: Das einfachste Format mit universeller Kompatibilität für alle Tools und Plattformen

## XML-Format

```bash
repomix --style xml
```

Das XML-Format ist für die KI-Verarbeitung mit klar definierten Abschnitten und Strukturen optimiert:

```xml
Diese Datei ist eine zusammengeführte Darstellung des gesamten Quellcodes...

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
```

::: tip Warum XML?
XML-Tags helfen KI-Modellen wie Claude, Inhalte genauer zu analysieren. Die Dokumentation von Claude [empfiehlt die Verwendung von XML-Tags](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) für strukturierte Prompts, wodurch es für das Modell einfacher wird, verschiedene Abschnitte Ihres Quellcodes zu verstehen.
:::

## Markdown-Format

```bash
repomix --style markdown
```

Markdown bietet eine lesbare Formatierung:

```markdown
Diese Datei ist eine zusammengeführte Darstellung des gesamten Quellcodes...

# Dateizusammenfassung
(Metadaten und KI-Anweisungen)

# Verzeichnisstruktur
```
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
```

## Verwendung mit KI-Modellen

Jedes Format funktioniert gut mit KI-Modellen, aber beachten Sie:
- Verwenden Sie XML für Claude und andere KI-Modelle, die strukturierte Eingaben mit klarer Abschnittsabgrenzung bevorzugen
- Verwenden Sie Markdown für allgemeine Lesbarkeit und wenn Sie es mit Menschen zusammen mit KI-Analyse teilen
- Verwenden Sie Klartext für Einfachheit, universelle Kompatibilität und wenn Sie mit Tools arbeiten, die keine Auszeichnungssprache analysieren

## Anpassung

Legen Sie das Standardformat in `repomix.config.json` fest:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## Klartext-Format

```bash
repomix --style plain
```

Ausgabestruktur:
```text
Diese Datei ist eine zusammengeführte Darstellung des gesamten Quellcodes...

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
