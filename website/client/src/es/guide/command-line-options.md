# Opciones de línea de comandos

## Opciones básicas
- `-v, --version`: Mostrar versión de la herramienta

## Opciones de entrada/salida CLI
- `--verbose`: Habilitar registro detallado
- `--quiet`: Deshabilitar toda salida a stdout
- `--stdout`: Salida a stdout en lugar de escribir a un archivo (no se puede usar con la opción `--output`)
- `--stdin`: Leer rutas de archivos desde stdin en lugar de descubrir archivos automáticamente
- `--copy`: Copiar adicionalmente la salida generada al portapapeles del sistema
- `--token-count-tree [threshold]`: Mostrar árbol de archivos con resúmenes de conteo de tokens (opcional: umbral mínimo de conteo de tokens). Útil para identificar archivos grandes y optimizar el uso de tokens para límites de contexto de IA
- `--top-files-len <number>`: Número de archivos más grandes a mostrar en el resumen (por defecto: 5, ej: --top-files-len 20)

## Opciones de salida de Repomix
- `-o, --output <file>`: Ruta del archivo de salida (por defecto: repomix-output.xml, usar "-" para stdout)
- `--style <type>`: Formato de salida: xml, markdown, json o plain (por defecto: xml)
- `--parsable-style`: Habilitar salida parseable basada en el esquema de estilo elegido. Ten en cuenta que esto puede aumentar el conteo de tokens.
- `--compress`: Realizar extracción inteligente de código, enfocándose en firmas esenciales de funciones y clases para reducir el conteo de tokens
- `--output-show-line-numbers`: Mostrar números de línea en la salida
- `--no-file-summary`: Deshabilitar salida de sección de resumen de archivos
- `--no-directory-structure`: Deshabilitar salida de sección de estructura de directorios
- `--no-files`: Deshabilitar salida de contenido de archivos (modo solo metadatos)
- `--remove-comments`: Remover comentarios de tipos de archivos soportados
- `--remove-empty-lines`: Remover líneas vacías de la salida
- `--truncate-base64`: Habilitar truncamiento de cadenas de datos base64
- `--header-text <text>`: Texto personalizado para incluir en el encabezado del archivo
- `--instruction-file-path <path>`: Ruta a un archivo que contiene instrucciones personalizadas detalladas
- `--split-output <size>`: Dividir la salida en múltiples archivos numerados (p. ej.: repomix-output.1.xml, repomix-output.2.xml); con tamaños como 500kb, 2mb o 1.5mb
- `--include-empty-directories`: Incluir directorios vacíos en la salida
- `--include-full-directory-structure`: Mostrar el árbol completo del repositorio en la sección Estructura de directorios, incluso al usar patrones --include
- `--include-diffs`: Incluir diffs de git en la salida (incluye cambios del árbol de trabajo y cambios en stage por separado)
- `--include-logs`: Incluir logs de git en la salida (incluye historial de commits con fechas, mensajes y rutas de archivos)
- `--include-logs-count <count>`: Número de commits de log de git a incluir (predeterminado: 50)
- `--no-git-sort-by-changes`: Deshabilitar ordenamiento de archivos por conteo de cambios de git (habilitado por defecto)

## Opciones de selección de archivos
- `--include <patterns>`: Lista de patrones de inclusión (separados por comas)
- `-i, --ignore <patterns>`: Patrones de ignorar adicionales (separados por comas)
- `--no-gitignore`: Deshabilitar uso de archivo .gitignore
- `--no-dot-ignore`: Deshabilitar uso de archivo .ignore
- `--no-default-patterns`: Deshabilitar patrones por defecto

## Opciones de repositorio remoto
- `--remote <url>`: Procesar repositorio remoto
- `--remote-branch <name>`: Especificar nombre de rama remota, etiqueta o hash de commit (por defecto a la rama por defecto del repositorio)

## Opciones de configuración
- `-c, --config <path>`: Ruta de archivo de configuración personalizada
- `--init`: Crear archivo de configuración
- `--global`: Usar configuración global

## Opciones de seguridad
- `--no-security-check`: Omitir escaneo de datos sensibles como claves API y contraseñas

## Opciones de conteo de tokens
- `--token-count-encoding <encoding>`: Modelo tokenizador para conteo: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (por defecto: o200k_base)

## Opciones MCP
- `--mcp`: Ejecutar como servidor Model Context Protocol para integración de herramientas de IA

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

