# Formatos de salida

Repomix admite cuatro formatos de salida:
- XML (predeterminado)
- Markdown
- JSON
- Texto sin formato

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

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### ¿Por qué XML como formato predeterminado?

Repomix utiliza XML como formato de salida predeterminado basándose en investigaciones y pruebas extensas. Esta decisión se fundamenta en evidencia empírica y consideraciones prácticas para el análisis de código asistido por IA.

Nuestra elección de XML está principalmente influenciada por las recomendaciones oficiales de los principales proveedores de IA:
- **Anthropic (Claude)**: Recomienda explícitamente el uso de etiquetas XML para estructurar prompts, declarando que "Claude fue expuesto a tales prompts durante el entrenamiento" ([documentación](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Recomienda formatos estructurados incluyendo XML para tareas complejas ([documentación](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Aboga por el prompting estructurado en escenarios complejos ([anuncio](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Formato Markdown

```bash
repomix --style markdown
```

Markdown proporciona un formato legible:

````markdown
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

# Logs de Git
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

## Formato JSON

```bash
repomix --style json
```

El formato JSON proporciona salida estructurada y accesible programáticamente con nombres de propiedades en camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "Este archivo es una representación fusionada de toda la base de código, combinada en un solo documento por Repomix.",
    "purpose": "Este archivo contiene una representación empaquetada del contenido completo del repositorio...",
    "fileFormat": "El contenido está organizado de la siguiente manera...",
    "usageGuidelines": "- Este archivo debe tratarse como de solo lectura...",
    "notes": "- Algunos archivos pueden haber sido excluidos según las reglas de .gitignore..."
  },
  "userProvidedHeader": "Texto de encabezado personalizado si se especifica",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Contenido del archivo aquí",
    "src/utils.js": "// Contenido del archivo aquí"
  },
  "instruction": "Instrucciones personalizadas desde instructionFilePath"
}
```

### Beneficios del formato JSON

El formato JSON es ideal para:
- **Procesamiento programático**: Fácil de analizar y manipular con bibliotecas JSON en cualquier lenguaje de programación
- **Integración de API**: Consumo directo por servicios web y aplicaciones
- **Compatibilidad con herramientas de IA**: Formato estructurado optimizado para aprendizaje automático y sistemas de IA
- **Análisis de datos**: Extracción sencilla de información específica usando herramientas como `jq`

### Trabajando con salida JSON usando `jq`

El formato JSON facilita la extracción programática de información específica. Aquí hay ejemplos comunes:

#### Operaciones básicas de archivos
```bash
# Listar todas las rutas de archivos
cat repomix-output.json | jq -r '.files | keys[]'

# Contar el número total de archivos
cat repomix-output.json | jq '.files | keys | length'

# Extraer contenido de archivo específico
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Filtrado y análisis de archivos
```bash
# Encontrar archivos por extensión
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Obtener archivos que contengan texto específico
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Crear lista de archivos con conteo de caracteres
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) caracteres"'
```

#### Extracción de metadatos
```bash
# Extraer estructura de directorios
cat repomix-output.json | jq -r '.directoryStructure'

# Obtener información de resumen de archivos
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Extraer encabezado proporcionado por el usuario (si existe)
cat repomix-output.json | jq -r '.userProvidedHeader // "No se proporcionó encabezado"'

# Obtener instrucciones personalizadas
cat repomix-output.json | jq -r '.instruction // "No se proporcionaron instrucciones"'
```

#### Análisis avanzado
```bash
# Encontrar archivos más grandes por longitud de contenido
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Buscar archivos que contengan patrones específicos
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Extraer rutas de archivos que coincidan con múltiples extensiones
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

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

================
Logs de Git
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

## Uso con modelos de IA

Cada formato funciona bien con modelos de IA, pero considera:
- Usar XML para Claude (mejor precisión de análisis)
- Usar Markdown para legibilidad general
- Usar JSON para procesamiento programático e integración de API
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
```

## Recursos relacionados

- [Configuración](/es/guide/configuration) - Referencia completa de opciones de configuración
- [Opciones de línea de comandos](/es/guide/command-line-options) - Usar `--style` para establecer el formato de salida
- [Compresión de código](/es/guide/code-compress) - Reducir el conteo de tokens preservando la estructura
- [Ejemplos de prompts](/es/guide/prompt-examples) - Consejos para usar la salida con diferentes modelos de IA
