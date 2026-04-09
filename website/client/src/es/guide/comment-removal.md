# Eliminación de comentarios

Repomix puede eliminar automáticamente los comentarios de tu código al generar el archivo de salida. Esto puede ayudar a reducir el ruido y centrarse en el código real.

## Uso

Para habilitar la eliminación de comentarios, establece la opción `removeComments` a `true` en tu archivo `repomix.config.json`:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Lenguajes soportados

Repomix soporta la eliminación de comentarios para una amplia gama de lenguajes de programación, incluyendo:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- Y muchos más...

## Ejemplo

Dado el siguiente código JavaScript:

```javascript
// Este es un comentario de una sola línea
function test() {
  /* Este es un
     comentario multilínea */
  return true;
}
```

Con la eliminación de comentarios habilitada, la salida será:

```javascript
function test() {
  return true;
}
```

## Notas

- La eliminación de comentarios se realiza antes que otros pasos de procesamiento, como la adición de números de línea.
- Algunos comentarios, como los comentarios JSDoc, pueden conservarse dependiendo del lenguaje y el contexto.

## Recursos relacionados

- [Compresión de código](/es/guide/code-compress) - Reducir aún más el conteo de tokens extrayendo la estructura del código
- [Configuración](/es/guide/configuration) - Establecer `output.removeComments` en el archivo de configuración
- [Opciones de línea de comandos](/es/guide/command-line-options) - Usar la flag `--remove-comments`
