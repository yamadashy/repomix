# Uso básico

## Inicio rápido

Empaqueta todo tu repositorio:
```bash
repomix
```

## Casos de uso comunes

### Empaquetar directorios específicos
Procese solo directorios o archivos específicos para enfocarse en código relevante y reducir el recuento de tokens:
```bash
repomix ruta/al/directorio
```

### Incluir archivos específicos
Usa [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) para controlar con precisión qué archivos se incluyen:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Excluir archivos
Omita ciertos archivos o directorios usando patrones glob para evitar incluir contenido innecesario o sensible:
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

### Compresión de código

Utilice Tree-sitter para extraer inteligentemente estructuras de código esenciales mientras elimina detalles de implementación, reduciendo significativamente el recuento de tokens mientras preserva la arquitectura:

```bash
repomix --compress

# También puede usarlo con repositorios remotos:
repomix --remote yamadashy/repomix --compress
```

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
