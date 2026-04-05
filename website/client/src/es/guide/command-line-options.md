# Opciones de línea de comandos

## Opciones básicas
- `-v, --version`: Mostrar versión de la herramienta

## Opciones de entrada/salida CLI

| Opción | Descripción |
|--------|-------------|
| `--verbose` | Habilitar registro detallado de depuración (muestra procesamiento de archivos, conteo de tokens y detalles de configuración) |
| `--quiet` | Suprimir toda salida de consola excepto errores (útil para scripting) |
| `--stdout` | Escribir salida empaquetada directamente a stdout en lugar de un archivo (suprime todo el registro) |
| `--stdin` | Leer rutas de archivos desde stdin, una por línea (los archivos especificados se procesan directamente) |
| `--copy` | Copiar la salida generada al portapapeles del sistema después del procesamiento |
| `--token-count-tree [threshold]` | Mostrar árbol de archivos con conteo de tokens; umbral opcional para mostrar solo archivos con ≥N tokens (ej: `--token-count-tree 100`) |
| `--top-files-len <number>` | Número de archivos más grandes a mostrar en el resumen (por defecto: `5`) |

## Opciones de salida de Repomix

| Opción | Descripción |
|--------|-------------|
| `-o, --output <file>` | Ruta del archivo de salida (por defecto: `repomix-output.xml`, usar `"-"` para stdout) |
| `--style <style>` | Formato de salida: `xml`, `markdown`, `json` o `plain` (por defecto: `xml`) |
| `--parsable-style` | Escapar caracteres especiales para garantizar XML/Markdown válido (necesario cuando la salida contiene código que rompe el formato) |
| `--compress` | Extraer la estructura esencial del código (clases, funciones, interfaces) usando análisis Tree-sitter |
| `--output-show-line-numbers` | Agregar número de línea a cada línea en la salida |
| `--no-file-summary` | Omitir la sección de resumen de archivos de la salida |
| `--no-directory-structure` | Omitir la visualización del árbol de directorios de la salida |
| `--no-files` | Generar solo metadatos sin contenido de archivos (útil para análisis de repositorio) |
| `--remove-comments` | Eliminar todos los comentarios del código antes de empaquetar |
| `--remove-empty-lines` | Eliminar líneas en blanco de todos los archivos |
| `--truncate-base64` | Truncar cadenas largas de datos base64 para reducir el tamaño de la salida |
| `--header-text <text>` | Texto personalizado para incluir al inicio de la salida |
| `--instruction-file-path <path>` | Ruta a un archivo que contiene instrucciones personalizadas para incluir en la salida |
| `--split-output <size>` | Dividir la salida en múltiples archivos numerados (ej: `repomix-output.1.xml`); tamaño como `500kb`, `2mb` o `1.5mb` |
| `--include-empty-directories` | Incluir carpetas sin archivos en la estructura de directorios |
| `--include-full-directory-structure` | Mostrar el árbol completo del repositorio en la sección Estructura de Directorios, incluso al usar patrones `--include` |
| `--no-git-sort-by-changes` | No ordenar archivos por frecuencia de cambios en git (por defecto: los archivos más modificados primero) |
| `--include-diffs` | Agregar sección de git diff mostrando cambios del árbol de trabajo y cambios en stage |
| `--include-logs` | Agregar historial de commits de git con mensajes y archivos modificados |
| `--include-logs-count <count>` | Número de commits recientes a incluir con `--include-logs` (por defecto: `50`) |

## Opciones de selección de archivos

| Opción | Descripción |
|--------|-------------|
| `--include <patterns>` | Incluir solo archivos que coincidan con estos patrones glob (separados por comas, ej: `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Patrones adicionales a excluir (separados por comas, ej: `"*.test.js,docs/**"`) |
| `--no-gitignore` | No usar reglas `.gitignore` para filtrar archivos |
| `--no-dot-ignore` | No usar reglas `.ignore` para filtrar archivos |
| `--no-default-patterns` | No aplicar patrones de exclusión integrados (`node_modules`, `.git`, directorios de compilación, etc.) |

## Opciones de repositorio remoto

| Opción | Descripción |
|--------|-------------|
| `--remote <url>` | Clonar y empaquetar un repositorio remoto (URL de GitHub o formato `user/repo`) |
| `--remote-branch <name>` | Rama, etiqueta o commit específico a usar (por defecto: la rama por defecto del repositorio) |
| `--remote-trust-config` | Confiar y cargar archivos de configuración de repositorios remotos (deshabilitado por defecto por seguridad) |

## Opciones de configuración

| Opción | Descripción |
|--------|-------------|
| `-c, --config <path>` | Usar archivo de configuración personalizado en lugar de `repomix.config.json` |
| `--init` | Crear un nuevo archivo `repomix.config.json` con valores por defecto |
| `--global` | Con `--init`, crear configuración en el directorio home en lugar del directorio actual |

## Opciones de seguridad
- `--no-security-check`: Omitir escaneo de datos sensibles como claves API y contraseñas

## Opciones de conteo de tokens
- `--token-count-encoding <encoding>`: Modelo tokenizador para conteo: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (por defecto: o200k_base)

## Opciones MCP
- `--mcp`: Ejecutar como servidor Model Context Protocol para integración de herramientas de IA

## Opciones de generación de Agent Skills

| Opción | Descripción |
|--------|-------------|
| `--skill-generate [name]` | Generar salida en formato Claude Agent Skills en el directorio `.claude/skills/<name>/` (nombre autogenerado si se omite) |
| `--skill-output <path>` | Especificar la ruta del directorio de salida de skills directamente (omite la solicitud de ubicación) |
| `-f, --force` | Omitir todas las solicitudes de confirmación (ej: sobrescritura del directorio de skills) |

## Recursos relacionados

- [Configuración](/es/guide/configuration) - Establecer opciones en el archivo de configuración en lugar de flags CLI
- [Formatos de salida](/es/guide/output) - Detalles sobre formatos XML, Markdown, JSON y texto plano
- [Compresión de código](/es/guide/code-compress) - Cómo funciona `--compress` con Tree-sitter
- [Seguridad](/es/guide/security) - Qué desactiva `--no-security-check`

## Ejemplos

```bash
# Uso básico
repomix

# Archivo de salida y formato personalizados
repomix -o my-output.xml --style xml

# Salida a stdout
repomix --stdout > custom-output.txt

# Salida a stdout, luego tubería a otro comando (por ejemplo, simonw/llm)
repomix --stdout | llm "Por favor explica qué hace este código."

# Salida personalizada con compresión
repomix --compress

# Procesar archivos específicos con patrones
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Repositorio remoto con rama
repomix --remote https://github.com/user/repo/tree/main

# Repositorio remoto con commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repositorio remoto con forma abreviada
repomix --remote user/repo

# Lista de archivos usando stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Integración con Git
repomix --include-diffs  # Incluir diffs de git para cambios sin commit
repomix --include-logs   # Incluir logs de git (últimos 50 commits por defecto)
repomix --include-logs --include-logs-count 10  # Incluir últimos 10 commits
repomix --include-diffs --include-logs  # Incluir tanto diffs como logs

# Análisis de conteo de tokens
repomix --token-count-tree
repomix --token-count-tree 1000  # Solo mostrar archivos/directorios con 1000+ tokens
```

