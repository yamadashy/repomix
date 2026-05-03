---
title: FAQ y solución de problemas
description: Respuestas a preguntas comunes sobre Repomix, repositorios privados, soporte para C# y Python, agentes compatibles con MCP, formatos de salida, reducción de tokens, seguridad y flujos de IA.
---

# FAQ y solución de problemas

Esta página ayuda a elegir el flujo de trabajo adecuado de Repomix, reducir salidas grandes y preparar contexto de código para asistentes de IA.

## Preguntas frecuentes

### ¿Para qué sirve Repomix?

Repomix empaqueta un repositorio en un único archivo amigable para IA. Esto permite compartir contexto completo de la base de código con ChatGPT, Claude, Gemini u otros asistentes para revisiones, depuración, refactorización, documentación y onboarding.

### ¿Funciona Repomix con repositorios privados?

Sí. Ejecuta Repomix localmente dentro de un checkout al que tu máquina ya tenga acceso:

```bash
repomix
```

Revisa el archivo generado antes de compartirlo con cualquier servicio externo de IA.

### ¿Puede procesar repositorios públicos de GitHub sin clonarlos?

Sí. Usa `--remote` con la forma corta o una URL completa:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### ¿Qué formato de salida debería usar?

Usa XML por defecto. Usa Markdown para conversaciones legibles, JSON para automatización y texto plano para máxima compatibilidad. Cambia el formato con `--style`:

```bash
repomix --style markdown
repomix --style json
```

Consulta [Formatos de salida](/es/guide/output).

## Reducir tokens

### El archivo generado es demasiado grande. ¿Qué hago?

Reduce el contexto:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Combina patrones include e ignore con compresión de código en repositorios grandes.

### ¿Qué hace `--compress`?

`--compress` conserva estructura importante como imports, exports, clases, funciones e interfaces, pero elimina muchos detalles de implementación. Es útil cuando el modelo necesita entender la arquitectura.

## Seguridad y privacidad

### ¿La CLI sube mi código?

La CLI de Repomix se ejecuta localmente y escribe un archivo de salida en tu máquina. El sitio web y la extensión del navegador tienen flujos distintos; consulta la [Política de privacidad](/es/guide/privacy).

### ¿Cómo evita Repomix incluir secretos?

Repomix usa controles basados en Secretlint. Trátalos como una capa adicional y revisa siempre la salida.

## Solución de problemas

### ¿Por qué faltan archivos en la salida?

Repomix respeta `.gitignore`, reglas ignore predeterminadas y patrones personalizados. Revisa `repomix.config.json`, `--ignore` y las reglas de git.

### ¿Cómo hago que la salida sea reproducible en equipo?

Crea y versiona una configuración compartida:

```bash
repomix --init
```

## Preguntas frecuentes adicionales

### ¿Repomix funciona con C#, Python, Java, Go, Rust u otros lenguajes?

Sí. Repomix lee los archivos de tu proyecto y los formatea para herramientas de IA, por lo que puede empaquetar repositorios escritos en cualquier lenguaje. La CLI requiere Node.js 20 o posterior. Algunas funciones avanzadas, como la compresión basada en Tree-sitter, dependen del soporte de parser para cada lenguaje.

### ¿Puedo usar Repomix con Hermes Agent, OpenClaw u otros agentes compatibles con MCP?

Sí. Repomix puede ejecutarse como servidor MCP:

```bash
npx -y repomix --mcp
```

En Hermes Agent, añade Repomix como servidor MCP stdio en `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

En OpenClaw u otros agentes compatibles con MCP, usa el mismo command y args donde el agente permita configurar un servidor MCP stdio externo. Si tu asistente soporta Agent Skills, también puedes usar [Repomix Explorer Skill](/es/guide/repomix-explorer-skill).

### ¿Cómo uso Repomix para ayudar a un asistente de IA a entender una nueva librería o framework?

Empaqueta el repositorio de la librería o su documentación y entrega la salida al asistente como material de referencia:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Para uso repetido, puedes generar un directorio Agent Skills reutilizable:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### ¿Cómo excluyo CSS, tests, build output u otros archivos ruidosos?

Usa `--ignore` para comandos puntuales:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Usa `--include` cuando quieras conservar solo rutas específicas de código o documentación:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### ¿Hay un límite de tamaño de repositorio?

La CLI no tiene un límite fijo de tamaño de repositorio, pero los repositorios muy grandes pueden verse limitados por memoria, tamaño de archivo o límites de carga y contexto de la herramienta de IA. Para proyectos grandes, empieza con patrones include específicos, revisa los archivos con más tokens y divide la salida si es necesario:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### ¿Por qué `--include` no incluye archivos de `node_modules`, directorios de build o rutas ignoradas?

`--include` reduce los archivos que Repomix intenta empaquetar, pero las reglas de ignore siguen aplicándose. Los archivos pueden excluirse por `.gitignore`, `.ignore`, `.repomixignore`, patrones predeterminados integrados o `repomix.config.json`. En casos avanzados puedes usar `--no-gitignore` o `--no-default-patterns`, pero hazlo con cuidado porque pueden incluir dependencias, artefactos de build u otros archivos ruidosos.

## Recursos relacionados

- [Uso básico](/es/guide/usage)
- [Opciones de línea de comandos](/es/guide/command-line-options)
- [Compresión de código](/es/guide/code-compress)
- [Seguridad](/es/guide/security)
