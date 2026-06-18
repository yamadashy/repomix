---
title: Modo de observación
description: Vuelve a empaquetar tu base de código automáticamente cuando cambian los archivos con el modo de observación de Repomix, incluyendo debouncing, gestión de exclusiones y compatibilidad de opciones.
---

# Modo de observación

Repomix puede observar tu base de código y volver a empaquetarla automáticamente cada vez que cambian los archivos. Esto mantiene el archivo de salida actualizado mientras trabajas, lo que resulta útil cuando quieres proporcionar a un asistente de IA una instantánea que se actualiza de forma continua.

## Uso

Inicia el modo de observación con la opción `-w` (o `--watch`):

```bash
repomix --watch
```

Repomix realiza un empaquetado inicial y luego sigue ejecutándose, volviendo a empaquetar con cada cambio. Puedes combinar el modo de observación con las opciones habituales:

```bash
# Observar un conjunto específico de archivos
repomix -w --include "src/**/*.ts"

# Observar con un archivo y un formato de salida personalizados
repomix --watch -o output.md --style markdown
```

Pulsa `Ctrl+C` para detener la observación.

## Cómo funciona

- **Empaquetado inicial**: Repomix empaqueta la base de código una vez y luego informa cuántos archivos está observando.
- **Detección de cambios**: los archivos nuevos, modificados y eliminados activan un nuevo empaquetado.
- **Debouncing**: las ráfagas rápidas de cambios (por ejemplo, al cambiar de rama o al guardar muchos archivos a la vez) se agrupan. Repomix espera 300 ms después del último cambio antes de volver a empaquetar, de modo que una avalancha de ediciones produce una sola reconstrucción.
- **Marcas de tiempo**: después de cada reconstrucción, Repomix imprime una marca de tiempo (`Rebuilt at HH:MM:SS`) para que sepas cuándo se actualizó la salida por última vez.

## Archivos ignorados

El modo de observación respeta las mismas reglas de exclusión que una ejecución normal: `.gitignore`, `.repomixignore`, los patrones predeterminados integrados (como `node_modules` y `.git`) y cualquier patrón `--ignore` que indiques. Los directorios ignorados no se observan, lo que mantiene el modo de observación eficiente en proyectos grandes.

## Compatibilidad de opciones

El modo de observación solo funciona con directorios locales, por lo que no se puede combinar con las siguientes opciones (ya sea que las definas en la línea de comandos o en tu archivo de configuración):

- `--remote` o una URL posicional de repositorio remoto: el modo de observación es solo local
- `--stdout` o `--stdin`: los modos de transmisión no tienen un archivo de salida persistente que actualizar
- `--split-output`
- `--skill-generate`
- `--copy`: volver a empaquetar con cada cambio sobrescribiría el portapapeles repetidamente

Si combinas una de estas con `--watch`, Repomix finaliza con un error que explica el conflicto.

## Recursos relacionados

- [Opciones de línea de comandos](/es/guide/command-line-options) - Referencia completa de la CLI, incluyendo `--watch`
- [Uso básico](/es/guide/usage) - Otras formas de ejecutar Repomix
- [Configuración](/es/guide/configuration) - Define opciones de salida predeterminadas en tu archivo de configuración
