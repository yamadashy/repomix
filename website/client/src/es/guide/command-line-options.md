# Opciones de Línea de Comandos

## Opciones Básicas
- `-v, --version`: Muestra la versión

## Opciones de Salida
- `-o, --output <file>`: Nombre del archivo de salida (predeterminado: `repomix-output.txt`)
- `--stdout`: Salida a la salida estándar en lugar de escribir a un archivo (no puede usarse con la opción `--output`)
- `--style <type>`: Estilo de salida (`plain`, `xml`, `markdown`) (predeterminado: `xml`)
- `--parsable-style`: Habilita la salida analizable basada en el esquema del estilo elegido (predeterminado: `false`)
- `--compress`: Realiza una extracción inteligente de código, centrándose en las firmas de funciones y clases mientras elimina los detalles de implementación. Para más detalles y ejemplos, consulte la [Guía de Compresión de Código](code-compress)
- `--output-show-line-numbers`: Agrega números de línea (predeterminado: `false`)
- `--copy`: Copiar al portapapeles (predeterminado: `false`)
- `--no-file-summary`: Deshabilita el resumen de archivos (predeterminado: `true`)
- `--no-directory-structure`: Deshabilita la estructura de directorios (predeterminado: `true`)
- `--no-files`: Deshabilita la salida del contenido de archivos (modo solo metadatos) (predeterminado: `true`)
- `--remove-comments`: Elimina comentarios (predeterminado: `false`)
- `--remove-empty-lines`: Elimina líneas vacías (predeterminado: `false`)
- `--header-text <text>`: Texto personalizado para incluir en el encabezado del archivo
- `--instruction-file-path <path>`: Ruta al archivo con instrucciones personalizadas detalladas
- `--include-empty-directories`: Incluye directorios vacíos en la salida (predeterminado: `false`)
- `--include-diffs`: Incluye las diferencias de git en la salida (incluye por separado los cambios del árbol de trabajo y los cambios preparados) (predeterminado: `false`)

## Opciones de Filtrado
- `--include <patterns>`: Patrones a incluir (separados por comas)
- `-i, --ignore <patterns>`: Patrones a ignorar (separados por comas)
- `--no-gitignore`: Deshabilita el uso del archivo .gitignore
- `--no-default-patterns`: Deshabilita los patrones predeterminados

## Opciones de Repositorio Remoto
- `--remote <url>`: Procesa repositorio remoto
- `--remote-branch <name>`: Especifica el nombre de la rama remota, etiqueta o hash de commit (por defecto es la rama principal del repositorio)

## Opciones de Configuración
- `-c, --config <path>`: Ruta del archivo de configuración personalizado
- `--init`: Crea archivo de configuración
- `--global`: Usa configuración global

## Opciones de Seguridad
- `--no-security-check`: Deshabilita la verificación de seguridad (predeterminado: `true`)

## Opciones de Conteo de Tokens
- `--token-count-encoding <encoding>`: Especifica la codificación para el conteo de tokens (ej. `o200k_base`, `cl100k_base`) (predeterminado: `o200k_base`)

## Otras Opciones
- `--top-files-len <number>`: Número de archivos principales a mostrar (predeterminado: `5`)
- `--verbose`: Habilita el registro detallado
- `--quiet`: Deshabilita toda la salida a stdout

## Ejemplos

```bash
# Uso básico
repomix

# Salida personalizada
repomix -o output.xml --style xml

# Salida a la salida estándar
repomix --stdout > custom-output.txt

# Enviar salida a la salida estándar, luego canalizar a otro comando (por ejemplo, simonw/llm)
repomix --stdout | llm "Por favor explica qué hace este código"

# Salida personalizada con compresión
repomix --compress

# Procesar archivos específicos
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Repositorio remoto con rama
repomix --remote https://github.com/user/repo/tree/main

# Repositorio remoto con commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repositorio remoto con formato abreviado
repomix --remote user/repo

# Lista de archivos desde stdin (detección automática)
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
