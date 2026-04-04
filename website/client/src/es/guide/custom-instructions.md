# Instrucciones Personalizadas

Repomix te permite proporcionar instrucciones personalizadas que se incluirán en el archivo de salida. Esto puede ser útil para agregar contexto o pautas específicas para los sistemas de IA que procesan el repositorio.

## Uso

Para incluir una instrucción personalizada, crea un archivo markdown (por ejemplo, `repomix-instruction.md`) en la raíz de tu repositorio. Luego, especifica la ruta a este archivo en tu `repomix.config.json`:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

El contenido de este archivo se incluirá en la salida bajo la sección "Instruction".

## Ejemplo

```markdown
# Instrucciones del Repositorio

Este repositorio contiene el código fuente de la herramienta Repomix. Por favor, sigue estas pautas al analizar el código:

1. Concéntrate en la funcionalidad principal en el directorio `src/core`.
2. Presta especial atención a las verificaciones de seguridad en `src/core/security`.
3. Ignora cualquier archivo en el directorio `tests`.
```

Esto resultará en la siguiente sección en la salida:

```xml
<instruction>
# Instrucciones del Repositorio

Este repositorio contiene el código fuente de la herramienta Repomix. Por favor, sigue estas pautas al analizar el código:

1. Concéntrate en la funcionalidad principal en el directorio `src/core`.
2. Presta especial atención a las verificaciones de seguridad en `src/core/security`.
3. Ignora cualquier archivo en el directorio `tests`.
</instruction>
```

## Recursos relacionados

- [Configuración](/es/guide/configuration) - Establecer `output.instructionFilePath` en el archivo de configuración
- [Formatos de salida](/es/guide/output) - Conocer los diferentes formatos de salida
- [Ejemplos de prompts](/es/guide/prompt-examples) - Ejemplos de prompts para análisis de IA
- [Casos de uso](/es/guide/use-cases) - Ejemplos reales del uso de Repomix con IA
