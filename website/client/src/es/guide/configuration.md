# Configuración

Repomix puede configurarse mediante un archivo de configuración o opciones de línea de comandos. El archivo de configuración le permite personalizar varios aspectos de cómo se procesa y genera la salida de su base de código.

## Formatos de archivos de configuración

Repomix admite múltiples formatos de archivos de configuración para mayor flexibilidad y facilidad de uso.

Repomix buscará automáticamente archivos de configuración en el siguiente orden de prioridad:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Configuración JSON

Cree un archivo de configuración en el directorio de su proyecto:
```bash
repomix --init
```

Esto creará un archivo `repomix.config.json` con la configuración predeterminada. También puede crear un archivo de configuración global que se utilizará como respaldo cuando no se encuentre una configuración local:

```bash
repomix --init --global
```

### Configuración TypeScript

Los archivos de configuración TypeScript ofrecen la mejor experiencia de desarrollo con verificación completa de tipos y soporte IDE.

**Instalación:**

Para usar la configuración TypeScript o JavaScript con `defineConfig`, debe instalar Repomix como dependencia de desarrollo:

```bash
npm install -D repomix
```

**Ejemplo:**

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

**Ventajas:**
- ✅ Verificación completa de tipos TypeScript en su IDE
- ✅ Excelente autocompletado e IntelliSense del IDE
- ✅ Uso de valores dinámicos (marcas de tiempo, variables de entorno, etc.)

**Ejemplo de valores dinámicos:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Generar nombre de archivo basado en marca de tiempo
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Configuración JavaScript

Los archivos de configuración JavaScript funcionan igual que TypeScript, admitiendo `defineConfig` y valores dinámicos.

## Opciones de configuración

| Opción                           | Descripción                                                                                                                  | Predeterminado        |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Tamaño máximo de archivo en bytes para procesar. Los archivos más grandes serán ignorados. Útil para excluir archivos binarios grandes o archivos de datos | `50000000`            |
| `output.filePath`                | Nombre del archivo de salida. Admite formatos XML, Markdown y texto plano                                                    | `"repomix-output.xml"` |
| `output.style`                   | Estilo de salida (`xml`, `markdown`, `json`, `plain`). Cada formato tiene sus propias ventajas para diferentes herramientas de IA    | `"xml"`                |
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
| `output.splitOutput`             | Dividir la salida en múltiples archivos numerados por tamaño máximo por parte (ej., `1000000` para ~1MB). CLI acepta tamaños legibles como `500kb` o `2mb`. Mantiene cada archivo bajo el límite y evita dividir archivos de origen entre partes | No establecido |
| `output.topFilesLength`          | Número de archivos principales para mostrar en el resumen. Si se establece en 0, no se mostrará ningún resumen             | `5`                    |
| `output.includeEmptyDirectories` | Indica si se deben incluir directorios vacíos en la estructura del repositorio                                             | `false`                |
| `output.includeFullDirectoryStructure` | Al usar patrones `include`, indica si se debe mostrar el árbol de directorios completo (respetando los patrones ignore) mientras se procesan solo los archivos incluidos. Proporciona contexto completo del repositorio para análisis de IA | `false`                |
| `output.git.sortByChanges`       | Indica si se deben ordenar los archivos por número de cambios git. Los archivos con más cambios aparecen al final         | `true`                 |
| `output.git.sortByChangesMaxCommits` | Número máximo de commits para analizar al contar cambios git. Limita la profundidad del historial por rendimiento      | `100`                  |
| `output.git.includeDiffs`        | Indica si se deben incluir las diferencias git en la salida. Muestra por separado los cambios del árbol de trabajo y los cambios preparados | `false`                |
| `output.git.includeLogs`         | Indica si se deben incluir los logs de git en la salida. Muestra el historial de commits con fechas, mensajes y rutas de archivos | `false`                |
| `output.git.includeLogsCount`    | Número de commits de log de git a incluir en la salida                                                                          | `50`                   |
| `include`                        | Patrones de archivos a incluir usando [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignore.useGitignore`            | Indica si se deben usar los patrones del archivo `.gitignore` del proyecto                                                  | `true`                 |
| `ignore.useDotIgnore`            | Indica si se deben usar los patrones del archivo `.ignore` del proyecto                                                     | `true`                 |
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
1. Archivo de configuración local en el directorio actual (orden de prioridad: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Archivo de configuración global (orden de prioridad: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Las opciones de línea de comandos tienen prioridad sobre la configuración del archivo.

## Patrones de inclusión

Repomix admite especificar archivos para incluir usando [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). Esto permite una selección de archivos más flexible y potente:

- Use `**/*.js` para incluir todos los archivos JavaScript en cualquier directorio
- Use `src/**/*` para incluir todos los archivos dentro del directorio `src` y sus subdirectorios
- Combine múltiples patrones como `["src/**/*.js", "**/*.md"]` para incluir archivos JavaScript en `src` y todos los archivos Markdown

Puede especificar patrones de inclusión en su archivo de configuración:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

O use la opción de línea de comandos `--include` para filtrado único.

## Patrones de ignorar

Repomix ofrece múltiples métodos para establecer patrones de ignorar para excluir archivos o directorios específicos durante el proceso de empaquetado:

- **.gitignore**: Por defecto, se utilizan los patrones listados en los archivos `.gitignore` de su proyecto y `.git/info/exclude`. Este comportamiento se puede controlar con la configuración `ignore.useGitignore` o la opción CLI `--no-gitignore`.
- **.ignore**: Puede usar un archivo `.ignore` en la raíz de su proyecto, siguiendo el mismo formato que `.gitignore`. Este archivo es respetado por herramientas como ripgrep y the silver searcher, reduciendo la necesidad de mantener múltiples archivos de ignorar. Este comportamiento se puede controlar con la configuración `ignore.useDotIgnore` o la opción CLI `--no-dot-ignore`.
- **Patrones predeterminados**: Repomix incluye una lista predeterminada de archivos y directorios comúnmente excluidos (por ejemplo, node_modules, .git, archivos binarios). Esta característica se puede controlar con la configuración `ignore.useDefaultPatterns` o la opción CLI `--no-default-patterns`. Consulte [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) para más detalles.
- **.repomixignore**: Puede crear un archivo `.repomixignore` en la raíz de su proyecto para definir patrones de ignorar específicos de Repomix. Este archivo sigue el mismo formato que `.gitignore`.
- **Patrones personalizados**: Se pueden especificar patrones de ignorar adicionales usando la opción `ignore.customPatterns` en el archivo de configuración. Puede sobrescribir esta configuración con la opción de línea de comandos `-i, --ignore`.

**Orden de prioridad** (de mayor a menor):

1. Patrones personalizados (`ignore.customPatterns`)
2. Archivos de ignorar (`.repomixignore`, `.ignore`, `.gitignore` y `.git/info/exclude`):
   - Cuando están en directorios anidados, los archivos en directorios más profundos tienen mayor prioridad
   - Cuando están en el mismo directorio, estos archivos se fusionan sin un orden particular
3. Patrones predeterminados (si `ignore.useDefaultPatterns` es verdadero y `--no-default-patterns` no se usa)

Este enfoque permite una configuración flexible de exclusión de archivos basada en las necesidades de su proyecto. Ayuda a optimizar el tamaño del archivo empaquetado generado asegurando la exclusión de archivos sensibles a la seguridad y archivos binarios grandes, mientras previene la fuga de información confidencial.

**Nota:** Los archivos binarios no se incluyen en la salida empaquetada por defecto, pero sus rutas se listan en la sección "Estructura del Repositorio" del archivo de salida. Esto proporciona una visión completa de la estructura del repositorio mientras mantiene el archivo empaquetado eficiente y basado en texto. Consulte [Manejo de archivos binarios](#manejo-de-archivos-binarios) para más detalles.

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

## Manejo de archivos binarios

Los archivos binarios (como imágenes, PDFs, binarios compilados, archivos, etc.) se manejan de manera especial para mantener una salida eficiente basada en texto:

- **Contenidos de archivo**: Los archivos binarios **no se incluyen** en la salida empaquetada para mantener el archivo basado en texto y eficiente para el procesamiento de IA
- **Estructura de directorios**: Las rutas de archivos binarios **se listan** en la sección de estructura de directorios, proporcionando una visión completa de su repositorio

Este enfoque garantiza que obtenga una vista completa de la estructura de su repositorio mientras mantiene una salida eficiente basada en texto optimizada para el consumo de IA.

**Ejemplo:**

Si su repositorio contiene `logo.png` y `app.jar`:
- Aparecerán en la sección Estructura de Directorios
- Sus contenidos no se incluirán en la sección Archivos

**Salida de Estructura de Directorios:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

De esta manera, las herramientas de IA pueden entender que estos archivos binarios existen en la estructura de su proyecto sin procesar sus contenidos binarios.

**Nota:** Puede controlar el umbral de tamaño máximo de archivo usando la opción de configuración `input.maxFileSize` (predeterminado: 50MB). Los archivos más grandes que este límite se omitirán por completo.

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

## Recursos relacionados

- [Opciones de línea de comandos](/es/guide/command-line-options) - Referencia completa de CLI (las opciones CLI anulan la configuración del archivo)
- [Formatos de salida](/es/guide/output) - Detalles sobre cada formato de salida
- [Seguridad](/es/guide/security) - Cómo Repomix detecta información sensible
- [Compresión de código](/es/guide/code-compress) - Reducir el conteo de tokens con Tree-sitter
- [Procesamiento de repositorios de GitHub](/es/guide/remote-repository-processing) - Opciones para repositorios remotos
