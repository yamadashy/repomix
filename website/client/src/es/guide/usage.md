# Uso básico

## Inicio rápido

Empaqueta todo tu repositorio:
```bash
repomix
```

## Casos de uso comunes

### Empaquetar directorios específicos
```bash
repomix ruta/al/directorio
```

### Incluir archivos específicos
Usa [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Excluir archivos
```bash
repomix --ignore "**/*.log,tmp/"
```

### Repositorios remotos
```bash
# Usando la URL de GitHub
repomix --remote https://github.com/usuario/repositorio

# Usando la abreviatura
repomix --remote usuario/repositorio

# Rama/etiqueta/commit específico
repomix --remote usuario/repositorio --remote-branch main
repomix --remote usuario/repositorio --remote-branch 935b695
```

### Entrada de lista de archivos (pipe via stdin)

Pasa rutas de archivos a través de stdin para máxima flexibilidad:

```bash
# Usando el comando find
find src -name "*.ts" -type f | repomix

# Usando git para obtener archivos rastreados
git ls-files "*.ts" | repomix

# Usando ls con patrones glob
ls src/**/*.ts | repomix

# Desde un archivo que contiene rutas de archivos
cat file-list.txt | repomix

# Entrada directa con echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# Usando el comando find con guión (indicador explícito de stdin)
find src -name "*.ts" | repomix -
```

Repomix detecta automáticamente cuando se canalizan rutas de archivos a través de stdin, brindando máxima flexibilidad en la selección de qué archivos empaquetar.

> [!NOTE]
> Cuando uses entrada de stdin, las rutas de archivos pueden ser relativas o absolutas, y Repomix manejará automáticamente la resolución de rutas y la eliminación de duplicados.

## Formatos de salida

### XML (predeterminado)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### Texto sin formato
```bash
repomix --style plain
```

## Opciones adicionales

### Eliminar comentarios
```bash
repomix --remove-comments
```

### Mostrar números de línea
```bash
repomix --output-show-line-numbers
```

### Copiar al portapapeles
```bash
repomix --copy
```

### Deshabilitar la verificación de seguridad
```bash
repomix --no-security-check
```

## Configuración

Inicializar el archivo de configuración:
```bash
repomix --init
```

Consulta la [Guía de configuración](/guide/configuration) para obtener opciones detalladas.
