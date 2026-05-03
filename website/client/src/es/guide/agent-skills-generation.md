---
title: "Generación de Agent Skills"
description: "Genera Agent Skills de Claude desde repositorios locales o remotos para que los asistentes de IA reutilicen referencias de código, estructura del proyecto y patrones de implementación."
---

# Generación de Agent Skills

Repomix puede generar salida en formato [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), creando un directorio estructurado de Skills que puede usarse como referencia de código reutilizable para asistentes de IA.

Esta función es particularmente poderosa cuando desea referenciar implementaciones de repositorios remotos. Al generar Skills desde proyectos de código abierto, puede fácilmente pedir a Claude que referencie patrones o implementaciones específicas mientras trabaja en su propio código.

En lugar de generar un único archivo empaquetado, la generación de Skills crea un directorio estructurado con múltiples archivos de referencia optimizados para la comprensión de IA y búsqueda compatible con grep.

> [!NOTE]
> Esta es una función experimental. El formato de salida y las opciones pueden cambiar en futuras versiones basándose en los comentarios de los usuarios.

## Uso Básico

Generar Skills desde su directorio local:

```bash
# Generar Skills desde el directorio actual
repomix --skill-generate

# Generar con nombre personalizado de Skills
repomix --skill-generate my-project-reference

# Generar desde un directorio específico
repomix path/to/directory --skill-generate

# Generar desde repositorio remoto
repomix --remote https://github.com/user/repo --skill-generate
```

## Selección de Ubicación de Skills

Cuando ejecuta el comando, Repomix le solicita elegir dónde guardar los Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Disponible en todos los proyectos de su máquina
2. **Project Skills** (`.claude/skills/`) - Compartido con su equipo vía git

Si el directorio de Skills ya existe, se le pedirá confirmar la sobrescritura.

> [!TIP]
> Al generar Project Skills, considere agregarlos a `.gitignore` para evitar hacer commit de archivos grandes:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Uso no interactivo

Para pipelines de CI y scripts de automatización, puede omitir todas las solicitudes interactivas usando `--skill-output` y `--force`:

```bash
# Especificar directamente el directorio de salida (omite la solicitud de ubicación)
repomix --skill-generate --skill-output ./my-skills

# Omitir la confirmación de sobrescritura con --force
repomix --skill-generate --skill-output ./my-skills --force

# Ejemplo no interactivo completo
repomix --remote user/repo --skill-generate my-skill --skill-output ./output --force
```

| Opción | Descripción |
| --- | --- |
| `--skill-output <path>` | Especificar directamente la ruta del directorio de salida de skills (omite la solicitud de ubicación). |
| `-f, --force` | Omitir todas las solicitudes de confirmación (ej.: sobrescritura del directorio de skills). |

## Estructura Generada

Los Skills se generan con la siguiente estructura:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Metadatos principales y documentación de Skills
└── references/
    ├── summary.md              # Propósito, formato y estadísticas
    ├── project-structure.md    # Árbol de directorios con conteo de líneas
    ├── files.md                # Todo el contenido de archivos (compatible con grep)
    └── tech-stacks.md           # Lenguajes, frameworks, dependencias
```

### Descripciones de Archivos

| Archivo | Propósito | Contenido |
|---------|-----------|-----------|
| `SKILL.md` | Metadatos principales y documentación de Skills | Nombre del Skills, descripción, información del proyecto, conteo de archivos/líneas/tokens, resumen de uso, casos de uso comunes y consejos |
| `references/summary.md` | Propósito, formato y estadísticas | Explicación del código base de referencia, documentación de estructura de archivos, guías de uso, desglose por tipo de archivo y lenguaje |
| `references/project-structure.md` | Descubrimiento de archivos | Árbol de directorios con conteo de líneas por archivo |
| `references/files.md` | Referencia de código con búsqueda | Todo el contenido de archivos con encabezados de resaltado de sintaxis, optimizado para búsqueda compatible con grep |
| `references/tech-stacks.md` | Resumen del stack tecnológico | Lenguajes, frameworks, versiones de runtime, gestores de paquetes, dependencias, archivos de configuración |

#### Ejemplo: references/project-structure.md

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### Ejemplo: references/files.md

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### Ejemplo: references/tech-stacks.md

Stack tecnológico autodetectado desde archivos de dependencias:
- **Lenguajes**: TypeScript, JavaScript, Python, etc.
- **Frameworks**: React, Next.js, Express, Django, etc.
- **Versiones de Runtime**: Node.js, Python, Go, etc.
- **Gestor de Paquetes**: npm, pnpm, poetry, etc.
- **Dependencias**: Todas las dependencias directas y de desarrollo
- **Archivos de Configuración**: Todos los archivos de configuración detectados

Detectado desde archivos como: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, etc.

## Nombres de Skills Autogenerados

Si no se proporciona nombre, Repomix autogenera uno usando este patrón:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalizado a kebab-case)
```

Los nombres de Skills son:
- Convertidos a kebab-case (minúsculas, separados por guiones)
- Limitados a máximo 64 caracteres
- Protegidos contra path traversal

## Integración con Opciones de Repomix

La generación de Skills respeta todas las opciones estándar de Repomix:

```bash
# Generar Skills con filtrado de archivos
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Generar Skills con compresión
repomix --skill-generate --compress

# Generar Skills desde repositorio remoto
repomix --remote yamadashy/repomix --skill-generate

# Generar Skills con opciones específicas de formato de salida
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Solo de Documentación

Usando `--include`, puede generar Skills que contengan solo la documentación de un repositorio de GitHub. Esto es útil cuando desea que Claude referencie documentación específica de biblioteca o framework mientras trabaja en su código:

```bash
# Documentación de Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Documentación de Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Documentación de React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Limitaciones

La opción `--skill-generate` no puede usarse con:
- `--stdout` - La salida de Skills requiere escribir en el sistema de archivos
- `--copy` - La salida de Skills es un directorio, no se puede copiar al portapapeles

## Usando Skills Generados

Una vez generados, puede usar los Skills con Claude:

1. **Claude Code**: Los Skills están disponibles automáticamente si se guardan en `~/.claude/skills/` o `.claude/skills/`
2. **Claude Web**: Suba el directorio de Skills a Claude para análisis de código base
3. **Compartir con Equipo**: Haga commit de `.claude/skills/` a su repositorio para acceso de todo el equipo

## Flujo de Trabajo de Ejemplo

### Crear una Biblioteca de Referencia Personal

```bash
# Clonar y analizar un proyecto de código abierto interesante
repomix --remote facebook/react --skill-generate react-reference

# Los Skills se guardan en ~/.claude/skills/react-reference/
# Ahora puede referenciar el código base de React en cualquier conversación con Claude
```

### Documentación de Proyecto de Equipo

```bash
# En su directorio de proyecto
cd my-project

# Generar Skills para su equipo
repomix --skill-generate

# Elija "Project Skills" cuando se le solicite
# Los Skills se guardan en .claude/skills/repomix-reference-my-project/

# Haga commit y comparta con su equipo
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Recursos Relacionados

- [Plugins de Claude Code](/es/guide/claude-code-plugins) - Aprenda sobre plugins de Repomix para Claude Code
- [Servidor MCP](/es/guide/mcp-server) - Método de integración alternativo
- [Compresión de Código](/es/guide/code-compress) - Reducir conteo de tokens con compresión
- [Configuración](/es/guide/configuration) - Personalizar comportamiento de Repomix
