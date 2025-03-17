# Configuração

## Início Rápido

Criar arquivo de configuração:
```bash
repomix --init
```

## Arquivo de Configuração

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "Texto personalizado do cabeçalho",
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

## Configuração Global

Criar configuração global:
```bash
repomix --init --global
```

Localização:
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## Padrões de Ignorar

Prioridade:
1. Opções CLI (`--ignore`)
2. `.repomixignore`
3. `.gitignore` e `.git/info/exclude`
4. Padrões padrão

Exemplo de `.repomixignore`:
```text
# Diretórios de cache
.cache/
tmp/

# Saídas de build
dist/
build/

# Logs
*.log
```

## Padrões de Ignorar Padrão

Padrões comuns incluídos por padrão:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Lista completa: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Exemplos

### Compressão de Código

Quando `output.compress` está configurado como `true`, o Repomix extrairá de forma inteligente as estruturas essenciais do código enquanto remove os detalhes de implementação. Isso é particularmente útil para reduzir a contagem de tokens enquanto mantém informações estruturais importantes.

Por exemplo, este código:

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

Será comprimido para:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### Remoção de Comentários

Quando `output.removeComments` está configurado como `true`, todos os comentários do código serão removidos. Isso é útil quando você deseja focar na implementação do código ou reduzir ainda mais a contagem de tokens.
