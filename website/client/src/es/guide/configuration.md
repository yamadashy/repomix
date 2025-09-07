# Configuración

Repomix puede configurarse mediante un archivo de configuración (`repomix.config.json`) o opciones de línea de comandos. El archivo de configuración le permite personalizar varios aspectos de cómo se procesa y genera la salida de su base de código.

## Inicio rápido

Cree un archivo de configuración en el directorio de su proyecto:
```bash
repomix --init
```

Esto creará un archivo `repomix.config.json` con la configuración predeterminada. También puede crear un archivo de configuración global que se utilizará como respaldo cuando no se encuentre una configuración local:

```bash
repomix --init --global
```

## Opciones de configuración

| Opción                           | Descripción                                                                                                                  | Predeterminado        |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Tamaño máximo de archivo en bytes para procesar. Los archivos más grandes serán ignorados. Útil para excluir archivos binarios grandes o archivos de datos | `50000000`            |
| `output.filePath`                | Nombre del archivo de salida. Admite formatos XML, Markdown y texto plano                                                    | `"repomix-output.xml"` |
| `output.style`                   | Estilo de salida (`xml`, `markdown`, `plain`). Cada formato tiene sus propias ventajas para diferentes herramientas de IA    | `"xml"`                |
| `output.parsableStyle`           | Indica si se debe escapar la salida según el esquema de estilo elegido. Permite un mejor análisis pero puede aumentar el recuento de tokens | `false`                |
| `output.compress`                | Indica si se debe realizar una extracción inteligente de código usando Tree-sitter para reducir el recuento de tokens mientras se preserva la estructura | `false`                |
| `output.headerText`              | Texto personalizado para incluir en el encabezado del archivo. Útil para proporcionar contexto o instrucciones a las herramientas de IA | `null`                 |
| `output.instructionFilePath`     | Ruta a un archivo que contiene instrucciones personalizadas detalladas para el procesamiento de IA                          | `null`                 |
| `output.fileSummary`             | Indica si se debe incluir una sección de resumen al principio mostrando recuentos de archivos, tamaños y otras métricas    | `true`                 |
| `output.directoryStructure`      | Indica si se debe incluir la estructura de directorios en la salida. Ayuda a la IA a entender la organización del proyecto | `true`                 |
| `output.files`                   | Indica si se debe incluir el contenido de los archivos en la salida. Establecer en false para incluir solo estructura y metadatos | `true`                 |
| `output.removeComments`          | Indica si se deben eliminar los comentarios de los tipos de archivos soportados. Puede reducir el ruido y el recuento de tokens | `false`                |
| `output.removeEmptyLines`        | Indica si se deben eliminar las líneas vacías de la salida para reducir el recuento de tokens                              | `false`                |
| `output.showLineNumbers`         | Indica si se deben agregar números de línea a cada línea. Útil para referenciar partes específicas del código              | `false`                |
| `output.truncateBase64`          | Indica si se deben truncar las cadenas de datos base64 largas (por ejemplo, imágenes) para reducir el recuento de tokens  | `false`                |
| `output.copyToClipboard`         | Indica si se debe copiar la salida al portapapeles del sistema además de guardar el archivo                                | `false`                |
| `output.topFilesLength`          | Número de archivos principales para mostrar en el resumen. Si se establece en 0, no se mostrará ningún resumen             | `5`                    |
| `output.includeEmptyDirectories` | Indica si se deben incluir directorios vacíos en la estructura del repositorio                                             | `false`                |
| `output.git.sortByChanges`       | Indica si se deben ordenar los archivos por número de cambios git. Los archivos con más cambios aparecen al final         | `true`                 |
| `output.git.sortByChangesMaxCommits` | Número máximo de commits para analizar al contar cambios git. Limita la profundidad del historial por rendimiento      | `100`                  |
| `output.git.includeDiffs`        | Indica si se deben incluir las diferencias git en la salida. Muestra por separado los cambios del árbol de trabajo y los cambios preparados | `false`                |
| `output.git.includeLogs`         | Indica si se deben incluir los logs de git en la salida. Muestra el historial de commits con fechas, mensajes y rutas de archivos | `false`                |
| `output.git.includeLogsCount`    | Número de commits de log de git a incluir en la salida                                                                          | `50`                   |
| `include`                        | Patrones de archivos a incluir usando [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | Indica si se deben usar los patrones del archivo `.gitignore` del proyecto                                                  | `true`                 |
| `ignore.useDefaultPatterns`      | Indica si se deben usar los patrones de ignorar predeterminados (node_modules, .git, etc.)                                | `true`                 |
| `ignore.customPatterns`          | Patrones adicionales para ignorar usando [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Indica si se deben realizar comprobaciones de seguridad usando Secretlint para detectar información sensible               | `true`                 |
| `tokenCount.encoding`            | Codificación de recuento de tokens utilizada por el tokenizador [tiktoken](https://github.com/openai/tiktoken) de OpenAI. Use `o200k_base` para GPT-4o, `cl100k_base` para GPT-4/3.5. Ver [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) para más detalles. | `"o200k_base"`         |

El archivo de configuración admite la sintaxis [JSON5](https://json5.org/), que permite:
- Comentarios (tanto de una línea como multilínea)
- Comas finales en objetos y arrays
- Nombres de propiedades sin comillas
- Sintaxis de cadena más flexible

## Validación de esquema

Puede habilitar la validación de esquema para su archivo de configuración agregando la propiedad `$schema`:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Esto proporciona autocompletado y validación en editores que admiten esquemas JSON.

## Ejemplo de archivo de configuración

Aquí hay un ejemplo de un archivo de configuración completo (`repomix.config.json`):

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
    "headerText": "Información de encabezado personalizada para el archivo empaquetado.",
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
    // Los patrones también se pueden especificar en .repomixignore
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

## Ubicaciones de los archivos de configuración

Repomix busca los archivos de configuración en el siguiente orden:
1. Archivo de configuración local (`repomix.config.json`) en el directorio actual
2. Archivo de configuración global:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

Las opciones de línea de comandos tienen prioridad sobre la configuración del archivo.

## Patrones de ignorar

Repomix proporciona múltiples formas de especificar qué archivos deben ignorarse. Los patrones se procesan en el siguiente orden de prioridad:

1. Opciones de CLI (`--ignore`)
2. Archivo `.repomixignore` en el directorio del proyecto
3. `.gitignore` y `.git/info/exclude` (si `ignore.useGitignore` es verdadero)
4. Patrones predeterminados (si `ignore.useDefaultPatterns` es verdadero)

Ejemplo de `.repomixignore`:
```text
# Directorios de caché
.cache/
tmp/

# Salidas de compilación
dist/
build/

# Registros
*.log
```

## Patrones de ignorar predeterminados

Cuando `ignore.useDefaultPatterns` es verdadero, Repomix ignora automáticamente patrones comunes:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Para la lista completa, vea [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Características avanzadas

### Compresión de código

La función de compresión de código, habilitada con `output.compress: true`, utiliza [Tree-sitter](https://github.com/tree-sitter/tree-sitter) para extraer inteligentemente estructuras de código esenciales mientras elimina detalles de implementación. Esto ayuda a reducir el recuento de tokens mientras mantiene información estructural importante.

Beneficios principales:
- Reduce significativamente el recuento de tokens
- Preserva las firmas de clases y funciones
- Mantiene importaciones y exportaciones
- Conserva definiciones de tipos e interfaces
- Elimina cuerpos de funciones y detalles de implementación

Para más detalles y ejemplos, consulte la [Guía de compresión de código](code-compress).

### Integración con Git

La configuración `output.git` proporciona potentes características relacionadas con Git:

- `sortByChanges`: Cuando es verdadero, los archivos se ordenan por número de cambios Git (commits que modificaron el archivo). Los archivos con más cambios aparecen al final de la salida. Esto ayuda a priorizar los archivos más activamente desarrollados. Predeterminado: `true`
- `sortByChangesMaxCommits`: El número máximo de commits para analizar al contar cambios de archivos. Predeterminado: `100`
- `includeDiffs`: Cuando es verdadero, incluye las diferencias Git en la salida (incluye por separado los cambios del árbol de trabajo y los cambios preparados). Esto permite al lector ver los cambios pendientes en el repositorio. Predeterminado: `false`
- `includeLogs`: Cuando es verdadero, incluye el historial de commits Git en la salida. Muestra fechas de commits, mensajes y rutas de archivos para cada commit. Esto ayuda a la IA a entender patrones de desarrollo y relaciones entre archivos. Predeterminado: `false`
- `includeLogsCount`: El número de commits recientes a incluir en los logs de git. Predeterminado: `50`

Ejemplo de configuración:
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

### Comprobaciones de seguridad

Cuando `security.enableSecurityCheck` está habilitado, Repomix utiliza [Secretlint](https://github.com/secretlint/secretlint) para detectar información sensible en su base de código antes de incluirla en la salida. Esto ayuda a prevenir la exposición accidental de:

- Claves de API
- Tokens de acceso
- Claves privadas
- Contraseñas
- Otras credenciales sensibles

### Eliminación de comentarios

Cuando `output.removeComments` se establece en `true`, los comentarios se eliminan de los tipos de archivos soportados para reducir el tamaño de salida y enfocarse en el contenido esencial del código. Esto puede ser particularmente útil cuando:

- Está trabajando con código muy documentado
- Está tratando de reducir el recuento de tokens
- Se está enfocando en la estructura y lógica del código

Para los lenguajes soportados y ejemplos detallados, consulte la [Guía de eliminación de comentarios](comment-removal).
