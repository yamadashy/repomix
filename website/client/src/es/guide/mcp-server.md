# Servidor MCP

Repomix es compatible con el [Model Context Protocol (MCP)](https://modelcontextprotocol.io), lo que permite a los asistentes de IA interactuar directamente con tu código. Cuando se ejecuta como servidor MCP, Repomix proporciona herramientas que permiten a los asistentes de IA empaquetar repositorios locales o remotos para su análisis sin necesidad de preparación manual de archivos.

> [!NOTE]  
> Esta es una función experimental que mejoraremos activamente según los comentarios de los usuarios y el uso en el mundo real

## Ejecutar Repomix como servidor MCP

Para ejecutar Repomix como servidor MCP, utiliza la opción `--mcp`:

```bash
repomix --mcp
```

Esto inicia Repomix en modo servidor MCP, haciéndolo disponible para asistentes de IA que soporten el Model Context Protocol.

## Configuración de servidores MCP

Para usar Repomix como servidor MCP con asistentes de IA como Claude, necesitas configurar los ajustes de MCP:

### Para VS Code

Puedes instalar el servidor MCP de Repomix en VS Code usando uno de estos métodos:

1. **Usando la insignia de instalación:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Usando la línea de comandos:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Para VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Para Cline (extensión de VS Code)

Edita el archivo `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Para Cursor

En Cursor, añade un nuevo servidor MCP desde `Cursor Settings` > `MCP` > `+ Add new global MCP server` con una configuración similar a la de Cline.

### Para Claude Desktop

Edita el archivo `claude_desktop_config.json` con una configuración similar a la de Cline.

### Para Claude Code

Para configurar Repomix como servidor MCP en [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), usa el siguiente comando:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternativamente, puede usar los **plugins oficiales de Repomix** para una experiencia más conveniente. Los plugins proporcionan comandos en lenguaje natural y configuración más fácil. Consulte la documentación [Plugins de Claude Code](/es/guide/claude-code-plugins) para obtener detalles.

### Usando Docker en lugar de npx

En lugar de usar npx, puedes usar Docker para ejecutar Repomix como servidor MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Herramientas MCP disponibles

Cuando se ejecuta como servidor MCP, Repomix proporciona las siguientes herramientas:

### pack_codebase

Esta herramienta empaqueta un directorio de código local en un archivo XML para análisis de IA. Analiza la estructura del código base, extrae contenido de código relevante y genera un informe completo que incluye métricas, árbol de archivos y contenido de código formateado.

**Parámetros:**

| Parámetro | Requerido | Predeterminado | Descripción |
|-----------|-----------|----------------|-------------|
| `directory` | Sí | — | Ruta absoluta al directorio a empaquetar |
| `compress` | No | `false` | Habilita la compresión Tree-sitter para extraer firmas de código esenciales y estructura mientras elimina detalles de implementación. Reduce el uso de tokens en ~70% manteniendo el significado semántico. Generalmente no es necesario ya que `grep_repomix_output` permite recuperación incremental de contenido. |
| `includePatterns` | No | — | Archivos a incluir usando patrones fast-glob. Separados por comas (ej: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | Archivos adicionales a excluir usando patrones fast-glob. Separados por comas (ej: `"test/**,*.spec.js"`). Complementan `.gitignore` y exclusiones integradas. |
| `topFilesLength` | No | `10` | Número de archivos más grandes por tamaño para mostrar en el resumen de métricas |
| `style` | No | `xml` | Estilo de formato de salida: `xml`, `markdown`, `json` o `plain` |

**Ejemplo:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Esta herramienta obtiene, clona y empaqueta un repositorio de GitHub en un archivo XML para análisis de IA. Clona automáticamente el repositorio remoto, analiza su estructura y genera un informe completo.

**Parámetros:**

| Parámetro | Requerido | Predeterminado | Descripción |
|-----------|-----------|----------------|-------------|
| `remote` | Sí | — | URL del repositorio de GitHub o formato `user/repo` (ej: `"yamadashy/repomix"`, `"https://github.com/user/repo"` o `"https://github.com/user/repo/tree/branch"`) |
| `compress` | No | `false` | Habilita la compresión Tree-sitter para extraer firmas de código esenciales y estructura mientras elimina detalles de implementación. Reduce el uso de tokens en ~70% manteniendo el significado semántico. Generalmente no es necesario ya que `grep_repomix_output` permite recuperación incremental de contenido. |
| `includePatterns` | No | — | Archivos a incluir usando patrones fast-glob. Separados por comas (ej: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | Archivos adicionales a excluir usando patrones fast-glob. Separados por comas (ej: `"test/**,*.spec.js"`). Complementan `.gitignore` y exclusiones integradas. |
| `topFilesLength` | No | `10` | Número de archivos más grandes por tamaño para mostrar en el resumen de métricas |
| `style` | No | `xml` | Estilo de formato de salida: `xml`, `markdown`, `json` o `plain` |

**Ejemplo:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Esta herramienta lee el contenido de un archivo de salida generado por Repomix. Soporta lectura parcial con especificación de rango de líneas para archivos grandes. Esta herramienta está diseñada para entornos donde el acceso directo al sistema de archivos está limitado.

**Parámetros:**

| Parámetro | Requerido | Predeterminado | Descripción |
|-----------|-----------|----------------|-------------|
| `outputId` | Sí | — | ID del archivo de salida de Repomix para leer |
| `startLine` | No | Inicio del archivo | Número de línea de inicio (basado en 1, inclusivo) |
| `endLine` | No | Final del archivo | Número de línea final (basado en 1, inclusivo) |

**Características:**
- Diseñado específicamente para entornos basados en web o aplicaciones en sandbox
- Recupera el contenido de salidas generadas previamente usando su ID
- Proporciona acceso seguro al código empaquetado sin requerir acceso al sistema de archivos
- Soporta lectura parcial para archivos grandes

**Ejemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Esta herramienta busca patrones en un archivo de salida de Repomix usando funcionalidad similar a grep con sintaxis JavaScript RegExp. Devuelve líneas coincidentes con líneas de contexto opcionales alrededor de las coincidencias.

**Parámetros:**

| Parámetro | Requerido | Predeterminado | Descripción |
|-----------|-----------|----------------|-------------|
| `outputId` | Sí | — | ID del archivo de salida de Repomix para buscar |
| `pattern` | Sí | — | Patrón de búsqueda (sintaxis de expresión regular JavaScript RegExp) |
| `contextLines` | No | `0` | Número de líneas de contexto para mostrar antes y después de cada coincidencia. Sobrescrito por `beforeLines`/`afterLines` si se especifica. |
| `beforeLines` | No | — | Líneas a mostrar antes de cada coincidencia (como `grep -B`). Tiene precedencia sobre `contextLines`. |
| `afterLines` | No | — | Líneas a mostrar después de cada coincidencia (como `grep -A`). Tiene precedencia sobre `contextLines`. |
| `ignoreCase` | No | `false` | Realizar coincidencia insensible a mayúsculas y minúsculas |

**Características:**
- Usa sintaxis JavaScript RegExp para coincidencia de patrones potente
- Soporta líneas de contexto para mejor comprensión de las coincidencias
- Permite control separado de líneas de contexto antes/después
- Opciones de búsqueda sensible e insensible a mayúsculas y minúsculas

**Ejemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file y file_system_read_directory

El servidor MCP de Repomix proporciona dos herramientas de sistema de archivos que permiten a los asistentes de IA interactuar de manera segura con el sistema de archivos local:

1. `file_system_read_file`
  - Lee contenido de archivos del sistema de archivos local usando rutas absolutas
  - Incluye validación de seguridad integrada para detectar y prevenir acceso a archivos que contienen información sensible
  - Implementa validación de seguridad usando [Secretlint](https://github.com/secretlint/secretlint)
  - Previene el acceso a archivos que contienen información sensible (claves API, contraseñas, secretos)
  - Valida rutas absolutas para prevenir ataques de traversal de directorios
  - Devuelve mensajes de error claros para rutas inválidas y problemas de seguridad

2. `file_system_read_directory`
  - Lista contenidos de un directorio usando una ruta absoluta
  - Devuelve una lista formateada mostrando archivos y subdirectorios con indicadores claros
  - Muestra archivos y directorios con indicadores claros (`[FILE]` o `[DIR]`)
  - Proporciona navegación segura de directorios con manejo apropiado de errores
  - Valida rutas y asegura que sean absolutas
  - Útil para explorar estructura de proyectos y entender organización del código base

Ambas herramientas incorporan medidas de seguridad robustas:
- Validación de rutas absolutas para prevenir ataques de traversal de directorios
- Verificaciones de permisos para asegurar derechos de acceso apropiados
- Integración con Secretlint para detección de información sensible
- Mensajes de error claros para depuración y conciencia de seguridad

**Ejemplo:**
```typescript
// Leer un archivo
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Listar contenidos de directorio
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Estas herramientas son particularmente útiles cuando los asistentes de IA necesitan:
- Analizar archivos específicos en el código base
- Navegar estructuras de directorios
- Verificar existencia y accesibilidad de archivos
- Asegurar operaciones seguras del sistema de archivos

## Beneficios de usar Repomix como servidor MCP

Usar Repomix como servidor MCP ofrece varias ventajas:

1. **Integración directa**: Los asistentes de IA pueden analizar tu código directamente sin preparación manual de archivos.
2. **Flujo de trabajo eficiente**: Optimiza el proceso de análisis de código eliminando la necesidad de generar y cargar archivos manualmente.
3. **Salida consistente**: Asegura que el asistente de IA reciba el código en un formato consistente y optimizado.
4. **Funciones avanzadas**: Aprovecha todas las características de Repomix como compresión de código, conteo de tokens y verificaciones de seguridad.

Una vez configurado, tu asistente de IA puede usar directamente las capacidades de Repomix para analizar bases de código, haciendo que los flujos de trabajo de análisis de código sean más eficientes.

## Recursos relacionados

- [Plugins de Claude Code](/es/guide/claude-code-plugins) - Integración conveniente de plugins para Claude Code
- [Configuración](/es/guide/configuration) - Personalizar el comportamiento de Repomix
- [Opciones de línea de comandos](/es/guide/command-line-options) - Referencia completa de CLI
- [Formatos de salida](/es/guide/output) - Conocer los formatos de salida disponibles
