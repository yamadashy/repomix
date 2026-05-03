---
title: FAQ y solución de problemas
description: Respuestas a preguntas comunes sobre Repomix, repositorios privados, formatos de salida, reducción de tokens, seguridad y flujos de trabajo con IA.
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

## Recursos relacionados

- [Uso básico](/es/guide/usage)
- [Opciones de línea de comandos](/es/guide/command-line-options)
- [Compresión de código](/es/guide/code-compress)
- [Seguridad](/es/guide/security)
