# Configuración

## Inicio Rápido

Crear archivo de configuración:
```bash
repomix --init
```

## Archivo de Configuración

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "Texto de encabezado personalizado",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## Configuración Global

Crear configuración global:
```bash
repomix --init --global
```

Ubicación:
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## Patrones de Ignorar

Prioridad:
1. Opciones CLI (`--ignore`)
2. `.repomixignore`
3. `.gitignore` y `.git/info/exclude`
4. Patrones predeterminados

Ejemplo de `.repomixignore`:
```text
# Directorios de caché
.cache/
tmp/

# Salidas de construcción
dist/
build/

# Registros
*.log
```

## Patrones de Ignorar Predeterminados

Patrones comunes incluidos por defecto:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Lista completa: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Ejemplos

### Compresión de Código

Cuando `output.compress` está configurado como `true`, Repomix extraerá de manera inteligente las estructuras esenciales del código mientras elimina los detalles de implementación. Esto es particularmente útil para reducir el conteo de tokens mientras se mantiene información estructural importante.

Por ejemplo, este código:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

Se comprimirá a:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### Eliminación de Comentarios

Cuando `output.removeComments` está configurado como `true`, se eliminarán todos los comentarios del código. Esto es útil cuando desea enfocarse en la implementación del código o reducir aún más el conteo de tokens.
