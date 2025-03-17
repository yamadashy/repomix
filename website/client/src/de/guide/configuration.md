# Konfiguration

## Schnellstart

Konfigurationsdatei erstellen:
```bash
repomix --init
```

## Konfigurationsdatei

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "Benutzerdefinierter Kopftext",
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

## Globale Konfiguration

Globale Konfiguration erstellen:
```bash
repomix --init --global
```

Speicherort:
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## Ignore-Muster

Prioritätsreihenfolge:
1. CLI-Optionen (`--ignore`)
2. `.repomixignore`
3. `.gitignore` und `.git/info/exclude`
4. Standard-Muster

Beispiel für `.repomixignore`:
```text
# Cache-Verzeichnisse
.cache/
tmp/

# Build-Ausgaben
dist/
build/

# Logs
*.log
```

## Standard-Ignore-Muster

Standardmäßig enthaltene häufige Muster:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Vollständige Liste: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Beispiele

### Code-Komprimierung

Wenn `output.compress` auf `true` gesetzt ist, extrahiert Repomix intelligenterweise wesentliche Code-Strukturen und entfernt dabei Implementierungsdetails. Dies ist besonders nützlich, um die Token-Anzahl zu reduzieren und gleichzeitig wichtige strukturelle Informationen beizubehalten.

Zum Beispiel wird dieser Code:

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

komprimiert zu:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### Kommentarentfernung

Wenn `output.removeComments` auf `true` gesetzt ist, werden alle Code-Kommentare entfernt. Dies ist nützlich, wenn Sie sich auf die Code-Implementierung konzentrieren möchten oder die Token-Anzahl weiter reduzieren möchten.
