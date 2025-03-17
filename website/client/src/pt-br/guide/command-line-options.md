# Opções de Linha de Comando

## Opções Básicas
- `-v, --version`: Mostra a versão

## Opções de Saída
- `-o, --output <file>`: Nome do arquivo de saída (padrão: `repomix-output.txt`)
- `--style <type>`: Estilo de saída (`plain`, `xml`, `markdown`) (padrão: `plain`)
- `--parsable-style`: Habilita saída analisável baseada no esquema do estilo escolhido (padrão: `false`)
- `--compress`: Realiza extração inteligente de código, focando em assinaturas essenciais de funções e classes enquanto remove detalhes de implementação
- `--output-show-line-numbers`: Adiciona números de linha (padrão: `false`)
- `--copy`: Copia para a área de transferência (padrão: `false`)
- `--no-file-summary`: Desabilita o resumo de arquivos (padrão: `true`)
- `--no-directory-structure`: Desabilita a estrutura de diretórios (padrão: `true`)
- `--remove-comments`: Remove comentários (padrão: `false`)
- `--remove-empty-lines`: Remove linhas vazias (padrão: `false`)
- `--header-text <text>`: Texto personalizado para incluir no cabeçalho do arquivo
- `--instruction-file-path <path>`: Caminho para um arquivo contendo instruções personalizadas detalhadas
- `--include-empty-directories`: Inclui diretórios vazios na saída (padrão: `false`)

## Opções de Filtro
- `--include <patterns>`: Padrões para incluir (separados por vírgula)
- `-i, --ignore <patterns>`: Padrões para ignorar (separados por vírgula)
- `--no-gitignore`: Desabilita o uso do arquivo .gitignore
- `--no-default-patterns`: Desabilita padrões padrão

## Opções de Repositório Remoto
- `--remote <url>`: Processa repositório remoto
- `--remote-branch <name>`: Especifica o nome do branch remoto, tag ou hash do commit (padrão é o branch padrão do repositório)

## Opções de Configuração
- `-c, --config <path>`: Caminho do arquivo de configuração personalizado
- `--init`: Cria arquivo de configuração
- `--global`: Usa configuração global

## Opções de Segurança
- `--no-security-check`: Desabilita verificação de segurança (padrão: `true`)

## Opções de Contagem de Tokens
- `--token-count-encoding <encoding>`: Especifica a codificação para contagem de tokens (ex: `o200k_base`, `cl100k_base`) (padrão: `o200k_base`)

## Outras Opções
- `--top-files-len <number>`: Número de arquivos principais para mostrar (padrão: `5`)
- `--verbose`: Habilita log detalhado
- `--quiet`: Desabilita toda saída para stdout

## Exemplos

```bash
# Uso básico
repomix

# Saída personalizada
repomix -o output.xml --style xml

# Saída personalizada com compressão
repomix --compress

# Processar arquivos específicos
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Repositório remoto com branch
repomix --remote https://github.com/user/repo/tree/main

# Repositório remoto com commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repositório remoto com formato curto
repomix --remote user/repo
```

Por exemplo, ao usar a opção `--compress`, este código:

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

Esta compressão ajuda a reduzir a contagem de tokens enquanto mantém informações estruturais importantes sobre o código.
