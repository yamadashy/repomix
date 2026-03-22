# Procesamiento de repositorios de GitHub

## Uso básico

Procesar repositorios públicos:
```bash
# Usando URL completo
repomix --remote https://github.com/usuario/repositorio

# Usando la abreviatura de GitHub
repomix --remote usuario/repositorio
```

## Selección de rama y commit

```bash
# Rama específica
repomix --remote usuario/repositorio --remote-branch main

# Etiqueta
repomix --remote usuario/repositorio --remote-branch v1.0.0

# Hash de commit
repomix --remote usuario/repositorio --remote-branch 935b695
```

## Requisitos

- Git debe estar instalado
- Conexión a Internet
- Acceso de lectura al repositorio

## Control de salida

```bash
# Ubicación de salida personalizada
repomix --remote usuario/repositorio -o salida-personalizada.xml

# Con formato XML
repomix --remote usuario/repositorio --style xml

# Eliminar comentarios
repomix --remote usuario/repositorio --remove-comments
```

## Uso de Docker

```bash
# Procesar y generar la salida en el directorio actual
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote usuario/repositorio

# Generar la salida en un directorio específico
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote usuario/repositorio
```

## Seguridad

Por seguridad, los archivos de configuración (`repomix.config.*`) de los repositorios remotos no se cargan de forma predeterminada. Esto evita que repositorios no confiables ejecuten código a través de archivos de configuración como `repomix.config.ts`.

Tu configuración global y las opciones de CLI se siguen aplicando.

Para confiar en la configuración de un repositorio remoto:

```bash
# Usando el flag de CLI
repomix --remote usuario/repositorio --remote-trust-config

# Usando una variable de entorno
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote usuario/repositorio
```

Al usar `--config` con `--remote`, se requiere una ruta absoluta:

```bash
repomix --remote usuario/repositorio --config /home/user/repomix.config.json
```

## Problemas comunes

### Problemas de acceso
- Asegúrate de que el repositorio sea público
- Comprueba la instalación de Git
- Verifica la conexión a Internet

### Repositorios grandes
- Usa `--include` para seleccionar rutas específicas
- Habilita `--remove-comments`
- Procesa las ramas por separado
