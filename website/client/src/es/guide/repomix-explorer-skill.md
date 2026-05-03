---
title: "Repomix Explorer Skill (Agent Skills)"
description: "Instala Repomix Explorer Agent Skill para analizar bases de código locales y remotas con Claude Code y otros asistentes de IA compatibles con el formato Agent Skills."
---

# Repomix Explorer Skill (Agent Skills)

Repomix proporciona un skill **Repomix Explorer** listo para usar que permite a los asistentes de codificación de IA analizar y explorar bases de código usando Repomix CLI.

Este skill está diseñado para Claude Code y otros asistentes de IA compatibles con el formato Agent Skills.

## Instalación Rápida

Para Claude Code, instala el plugin oficial Repomix Explorer:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

El plugin de Claude Code proporciona comandos con espacio de nombres como `/repomix-explorer:explore-local` y `/repomix-explorer:explore-remote`. Consulta [Plugins de Claude Code](/es/guide/claude-code-plugins) para la configuración completa.

Para Codex, Cursor, OpenClaw y otros asistentes compatibles con Agent Skills, instala el skill independiente con Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Para apuntar a un asistente específico, usa `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Para Hermes Agent, instala el skill de un solo archivo con el comando nativo de Hermes:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Si usas Hermes principalmente para analizar repositorios, la configuración de [Servidor MCP](/es/guide/mcp-server) también es una buena opción porque ejecuta Repomix directamente como servidor MCP.

## Qué Hace

Una vez instalado, puedes analizar bases de código con instrucciones en lenguaje natural.

#### Analizar repositorios remotos

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Explorar bases de código locales

```text
"What's in this project?
~/projects/my-app"
```

Esto es útil no solo para entender bases de código, sino también cuando quieres implementar características referenciando tus otros repositorios.

## Cómo Funciona

El skill Repomix Explorer guía a los asistentes de IA a través del flujo de trabajo completo:

1. **Ejecutar comandos repomix** - Empaquetar repositorios en formato amigable para IA
2. **Analizar archivos de salida** - Usar búsqueda de patrones (grep) para encontrar código relevante
3. **Proporcionar insights** - Reportar estructura, métricas y recomendaciones accionables

## Casos de Uso de Ejemplo

### Entender una Nueva Base de Código

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

La IA ejecutará repomix, analizará la salida y proporcionará una visión estructurada de la base de código.

### Encontrar Patrones Específicos

```text
"Find all authentication-related code in this repository."
```

La IA buscará patrones de autenticación, categorizará hallazgos por archivo y explicará cómo está implementada la autenticación.

### Referenciar Tus Propios Proyectos

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

La IA analizará tu otro repositorio y te ayudará a referenciar tus propias implementaciones.

## Contenido del Skill

El skill incluye:

- **Reconocimiento de intención del usuario** - Entiende varias formas en que los usuarios piden análisis de bases de código
- **Guía de comandos Repomix** - Sabe qué opciones usar (`--compress`, `--include`, etc.)
- **Flujo de trabajo de análisis** - Enfoque estructurado para explorar salidas empaquetadas
- **Mejores prácticas** - Consejos de eficiencia como usar grep antes de leer archivos completos

## Recursos Relacionados

- [Generación de Agent Skills](/es/guide/agent-skills-generation) - Genera tus propios skills desde bases de código
- [Claude Code Plugins](/es/guide/claude-code-plugins) - Plugins de Repomix para Claude Code
- [Servidor MCP](/es/guide/mcp-server) - Método de integración alternativo
