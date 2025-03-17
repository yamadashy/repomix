# Formatos de salida

Repomix admite tres formatos de salida:
- Texto sin formato (predeterminado)
- XML
- Markdown

## Formato de texto sin formato

```bash
repomix --style plain
```

Estructura de salida:
```text
Este archivo es una representación fusionada de toda la base de código...

================
Resumen de archivos
================
(Metadatos e instrucciones de IA)

================
Estructura de directorios
================
src/
  index.ts
  utils/
    helper.ts

================
Archivos
================

================
Archivo: src/index.ts
================
// Contenido del archivo aquí
```

## Formato XML

```bash
repomix --style xml
```

El formato XML está optimizado para el procesamiento de IA:

```xml
Este archivo es una representación fusionada de toda la base de código...

<file_summary>
(Metadatos e instrucciones de IA)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Contenido del archivo aquí
</file>
</files>
```

::: tip ¿Por qué XML?
Las etiquetas XML ayudan a los modelos de IA como Claude a analizar el contenido con mayor precisión. La [documentación de Claude](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) recomienda usar etiquetas XML para prompts estructurados.
:::

## Formato Markdown

```bash
repomix --style markdown
```

Markdown proporciona un formato legible:

```markdown
Este archivo es una representación fusionada de toda la base de código...

# Resumen de archivos
(Metadatos e instrucciones de IA)

# Estructura de directorios
```
src/
index.ts
utils/
helper.ts
```

# Archivos

## Archivo: src/index.ts
```typescript
// Contenido del archivo aquí
```
```

## Uso con modelos de IA

Cada formato funciona bien con modelos de IA, pero considera:
- Usar XML para Claude (mejor precisión de análisis)
- Usar Markdown para legibilidad general
- Usar texto sin formato para simplicidad y compatibilidad universal

## Personalización

Establece el formato predeterminado en `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
