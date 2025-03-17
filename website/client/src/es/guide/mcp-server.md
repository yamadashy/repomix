# Servidor MCP

Repomix es compatible con el [Model Context Protocol (MCP)](https://modelcontextprotocol.io), lo que permite a los asistentes de IA interactuar directamente con tu código. Cuando se ejecuta como servidor MCP, Repomix proporciona herramientas que permiten a los asistentes de IA empaquetar repositorios locales o remotos para su análisis sin necesidad de preparación manual de archivos.

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

## Configuración de servidores MCP

Para usar Repomix como servidor MCP con asistentes de IA como Claude, necesitas configurar los ajustes de MCP:

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
