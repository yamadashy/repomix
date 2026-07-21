---
title: "Seguridad"
description: "Aprende cómo Repomix usa Secretlint y comprobaciones de seguridad para detectar secretos, claves API, tokens, credenciales y contenido sensible del repositorio antes de empaquetar."
---

# Seguridad

## Función de verificación de seguridad

Repomix utiliza [Secretlint](https://github.com/secretlint/secretlint) para detectar información sensible en tus archivos:
- Claves de API
- Tokens de acceso
- Credenciales
- Claves privadas
- Variables de entorno

## Configuración

Las verificaciones de seguridad están habilitadas de forma predeterminada.

Deshabilitar a través de CLI:
```bash
repomix --no-security-check
```

O en `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Medidas de seguridad

1. **Manejo de archivos binarios**: Los contenidos de archivos binarios se excluyen de la salida, pero sus rutas se listan en la estructura de directorios para una vista completa del repositorio
2. **Compatible con Git**: Respeta los patrones de `.gitignore`
3. **Detección automatizada**: Busca problemas de seguridad comunes:
    - Credenciales de AWS
    - Cadenas de conexión de bases de datos
    - Tokens de autenticación
    - Claves privadas

## Confianza en la configuración de repositorios remotos {#remote-repository-config-trust}

Cuando empaquetas un repositorio remoto con `--remote`, Repomix trata la configuración de ese repositorio como código no confiable.

### Por qué un archivo de configuración es código

Un `repomix.config.*` no es solo datos:

- `repomix.config.ts` / `.js` / `.mjs` se **ejecuta** al cargarse.
- `input.processors` ejecuta comandos externos sobre los archivos que coinciden.
- `output.instructionFilePath` y los patrones de inclusión que usan `../` leen archivos fuera del repositorio.

Por eso, cargar una configuración sin revisar de un repositorio desconocido es comparable a ejecutar su `Makefile`, o a hacer `npm install` de un paquete con scripts de ciclo de vida.

### Predeterminado: las configuraciones remotas nunca se cargan

Repomix ignora la configuración de un repositorio clonado a menos que se lo pidas explícitamente. Tu configuración global y las opciones de CLI se siguen aplicando. Si nunca pasas el flag descrito a continuación, nada de esta sección puede afectarte.

### Cómo activarlo

```bash
# Usando el flag de CLI
repomix --remote user/repo --remote-trust-config

# Usando una variable de entorno
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Esto otorga a la configuración remota la misma confianza que a una configuración que hayas escrito tú mismo. Úsalo solo para repositorios en los que confíes y que hayas revisado.

### Solicitud de confirmación

En una terminal interactiva, Repomix muestra la configuración que está a punto de ejecutarse y pide confirmación antes de cargarla:

| Opción | Efecto |
| --- | --- |
| **Sí, solo esta vez** | Confía únicamente en esta ejecución. |
| **Sí, y no preguntar de nuevo para este repositorio** | Recuerda la decisión (ver más abajo). |
| **No** (selección predeterminada) | Aborta sin cargar la configuración. |

La configuración que se te muestra está escrita por el autor del repositorio, así que Repomix se asegura de que la visualización no pueda manipularse:

- **Las secuencias de control y ANSI se escapan**, de modo que una configuración no pueda repintar la terminal ni hacer que la advertencia se desplace fuera de la vista.
- **Los caracteres bidireccionales e invisibles se escapan**, de modo que el texto que lees sea el texto que se ejecuta ([Trojan Source](https://trojansource.codes/)).
- **La salida tiene un límite** tanto en número de líneas como en tamaño en bytes, de modo que una configuración rellenada no pueda empujar la advertencia fuera de la pantalla.
- **Cada línea de la configuración lleva un prefijo**, de modo que una configuración no pueda falsificar los propios separadores o mensajes de Repomix.
- **Los enlaces simbólicos se rechazan.** Git conserva los enlaces simbólicos, así que un repositorio puede incluir un `repomix.config.json` que apunte fuera del clon. Repomix exige que la configuración sea un archivo regular dentro del árbol clonado; de lo contrario, los bytes que revisaste no serían los bytes que se ejecutan.

### Recordar una decisión

Elegir "no preguntar de nuevo" guarda un marcador en tu directorio temporal (`$TMPDIR/repomix/trusted-remotes/`), que solo tu cuenta de usuario puede leer y escribir.

El marcador está **anclado al contenido**: registra un hash de la configuración que aprobaste. Si ese repositorio publica después una configuración distinta, el hash ya no coincide y **se te vuelve a preguntar**, el mismo modelo que usa `direnv allow`.

::: warning Alcance del anclaje
El hash cubre solo el archivo de configuración de entrada. Una configuración `.ts` / `.js` puede hacer `import` de otros archivos, e `input.processors` puede invocar scripts externos; ninguno de los dos se incluye en el hash. Un repositorio que ya has aprobado puede cambiar esos archivos mientras el archivo de entrada permanece idéntico. Por eso las configuraciones ejecutables se etiquetan como tales en la solicitud: trata "no preguntar de nuevo" como confianza en el repositorio, no solo en el archivo que leíste.
:::

Los marcadores viven en el directorio temporal, así que las decisiones caducan cuando tu sistema operativo lo limpia. Esto es intencional: caducar hacia "preguntar de nuevo" es la dirección segura.

### Cuándo se omite la solicitud

| Situación | Comportamiento |
| --- | --- |
| Se pasa `--force` | Se confía sin preguntar. El flag implica que aceptas las consecuencias; se imprime un aviso en stderr. |
| Shell no interactivo (CI, pipes) | Se confía sin preguntar, preservando la automatización existente. Se imprime un aviso en stderr. |
| El repositorio ya es de confianza | Se carga sin preguntar, siempre que la configuración no haya cambiado. |
| Se usa un `--config` absoluto | La configuración propia del repositorio clonado nunca se carga, así que no hay nada que confirmar. |
| El clon no tiene archivo de configuración | No hay nada que confiar. |

Con `--stdout`, o cuando la salida estándar se redirige, la solicitud no se puede mostrar. Repomix informa un error con orientación en lugar de confiar silenciosamente en la configuración.

### Recomendaciones

1. Deja `--remote-trust-config` desactivado a menos que necesites la configuración propia del repositorio.
2. Lee la configuración en la solicitud antes de responder, especialmente `input.processors` y cualquier ruta `../`.
3. Prefiere "Sí, solo esta vez" para repositorios que no controlas.
4. En CI, ten en cuenta que la solicitud no puede protegerte: fija la revisión que empaquetas y revísala de antemano.

## Cuando la verificación de seguridad encuentra problemas

Ejemplo de salida:
```bash
🔍 Verificación de seguridad:
──────────────────
2 archivo(s) sospechoso(s) detectado(s) y excluido(s):
1. config/credentials.json
  - Se encontró la clave de acceso de AWS
2. .env.local
  - Se encontró la contraseña de la base de datos
```

## Mejores prácticas

1. Siempre revisa la salida antes de compartirla
2. Usa `.repomixignore` para rutas sensibles
3. Mantén las verificaciones de seguridad habilitadas
4. Elimina los archivos sensibles del repositorio

## Reportar problemas de seguridad

¿Encontraste una vulnerabilidad de seguridad? Por favor:
1. No abras un issue público
2. Envía un correo electrónico a: koukun0120@gmail.com
3. O usa [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)

## Recursos relacionados

- [Procesamiento de repositorios de GitHub](/es/guide/remote-repository-processing) - Empaqueta repositorios que no has clonado tú mismo
- [Configuración](/es/guide/configuration) - Configurar verificaciones de seguridad mediante `security.enableSecurityCheck`
- [Opciones de línea de comandos](/es/guide/command-line-options) - Usar la flag `--no-security-check`
- [Política de privacidad](/es/guide/privacy) - Conocer el manejo de datos de Repomix
