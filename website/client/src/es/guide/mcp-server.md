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

## Herramientas MCP disponibles

Cuando se ejecuta como servidor MCP, Repomix proporciona las siguientes herramientas:

### pack_codebase

Esta herramienta empaqueta un directorio de código local en un archivo consolidado para análisis de IA.

**Parámetros:**
- `directory`: (Requerido) Ruta absoluta al directorio a empaquetar
- `compress`: (Opcional, predeterminado: true) Si se debe realizar extracción inteligente de código para reducir el recuento de tokens
- `includePatterns`: (Opcional) Lista separada por comas de patrones de inclusión
- `ignorePatterns`: (Opcional) Lista separada por comas de patrones de exclusión

**Ejemplo:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

Esta herramienta obtiene, clona y empaqueta un repositorio de GitHub en un archivo consolidado para análisis de IA.

**Parámetros:**
- `remote`: (Requerido) URL del repositorio de GitHub o formato usuario/repo (ej. yamadashy/repomix)
- `compress`: (Opcional, predeterminado: true) Si se debe realizar extracción inteligente de código para reducir el recuento de tokens
- `includePatterns`: (Opcional) Lista separada por comas de patrones de inclusión
- `ignorePatterns`: (Opcional) Lista separada por comas de patrones de exclusión

**Ejemplo:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### read_repomix_output

Esta herramienta lee el contenido de un archivo de salida de Repomix en entornos donde no es posible el acceso directo a archivos.

**Parámetros:**
- `outputId`: (Requerido) ID del archivo de salida de Repomix para leer

**Características:**
- Diseñado específicamente para entornos basados en web o aplicaciones en sandbox
- Recupera el contenido de salidas generadas previamente usando su ID
- Proporciona acceso seguro al código empaquetado sin requerir acceso al sistema de archivos

**Ejemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file y file_system_read_directory

El servidor MCP de Repomix proporciona dos herramientas de sistema de archivos que permiten a los asistentes de IA interactuar de manera segura con el sistema de archivos local:

1. `file_system_read_file`
   - Lee contenido de archivos usando rutas absolutas
   - Implementa validación de seguridad usando [Secretlint](https://github.com/secretlint/secretlint)
   - Previene el acceso a archivos que contienen información sensible
   - Devuelve mensajes de error claros para rutas inválidas y problemas de seguridad

2. `file_system_read_directory`
   - Lista contenidos de directorios usando rutas absolutas
   - Muestra archivos y directorios con indicadores claros (`[FILE]` o `[DIR]`)
   - Proporciona navegación segura de directorios con manejo apropiado de errores
   - Valida rutas y asegura que sean absolutas

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

### Para Claude Desktop

Edita el archivo `claude_desktop_config.json` con una configuración similar a la de Cline.

## Beneficios de usar Repomix como servidor MCP

Usar Repomix como servidor MCP ofrece varias ventajas:

1. **Integración directa**: Los asistentes de IA pueden analizar tu código directamente sin preparación manual de archivos.
2. **Flujo de trabajo eficiente**: Optimiza el proceso de análisis de código eliminando la necesidad de generar y cargar archivos manualmente.
3. **Salida consistente**: Asegura que el asistente de IA reciba el código en un formato consistente y optimizado.
4. **Funciones avanzadas**: Aprovecha todas las características de Repomix como compresión de código, conteo de tokens y verificaciones de seguridad.

Una vez configurado, tu asistente de IA puede usar directamente las capacidades de Repomix para analizar bases de código, haciendo que los flujos de trabajo de análisis de código sean más eficientes.
