# Opções de Linha de Comando

## Opções Básicas
- `-v, --version`: Mostra a versão

## Opções de Saída
- `-o, --output <file>`: Nome do arquivo de saída (padrão: `repomix-output.txt`)
- `--stdout`: Saída para a saída padrão em vez de escrever em um arquivo (não pode ser usado com a opção `--output`)
- `--style <type>`: Estilo de saída (`plain`, `xml`, `markdown`) (padrão: `xml`)
- `--parsable-style`: Habilita saída analisável baseada no esquema do estilo escolhido (padrão: `false`)
- `--compress`: Realiza extração inteligente de código, focando nas assinaturas de funções e classes enquanto remove detalhes de implementação. Para mais detalhes e exemplos, consulte o [Guia de Compressão de Código](code-compress)
- `--output-show-line-numbers`: Adiciona números de linha (padrão: `false`)
- `--copy`: Copia para a área de transferência (padrão: `false`)
- `--no-file-summary`: Desabilita o resumo de arquivos (padrão: `true`)
- `--no-directory-structure`: Desabilita a estrutura de diretórios (padrão: `true`)
- `--no-files`: Desabilita a saída de conteúdo de arquivos (modo somente metadados) (padrão: `true`)
- `--remove-comments`: Remove comentários (padrão: `false`)
- `--remove-empty-lines`: Remove linhas vazias (padrão: `false`)
- `--header-text <text>`: Texto personalizado para incluir no cabeçalho do arquivo
- `--instruction-file-path <path>`: Caminho para um arquivo contendo instruções personalizadas detalhadas
- `--include-empty-directories`: Inclui diretórios vazios na saída (padrão: `false`)
- `--include-diffs`: Inclui diferenças do git na saída (inclui separadamente as alterações da árvore de trabalho e as alterações preparadas) (padrão: `false`)
- `--no-git-sort-by-changes`: Desabilita a ordenação de arquivos por contagem de alterações do git (padrão: `true`)

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

# Saída para a saída padrão
repomix --stdout > custom-output.txt

# Enviar saída para a saída padrão, depois canalizar para outro comando (por exemplo, simonw/llm)
repomix --stdout | llm "Por favor, explique o que este código faz"

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

# Usando stdin para lista de arquivos (detecção automática)
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
