# Opções de Linha de Comando

## Opções Básicas
- `-v, --version`: Mostrar versão da ferramenta

## Opções de Entrada/Saída CLI
- `--verbose`: Habilitar registro detalhado
- `--quiet`: Desabilitar toda saída para stdout
- `--stdout`: Saída para stdout em vez de escrever para um arquivo (não pode ser usado com a opção `--output`)
- `--stdin`: Ler caminhos de arquivos do stdin em vez de descobrir arquivos automaticamente
- `--copy`: Copiar adicionalmente a saída gerada para a área de transferência do sistema
- `--token-count-tree [threshold]`: Exibir árvore de arquivos com resumos de contagem de tokens (opcional: limite mínimo de contagem de tokens). Útil para identificar arquivos grandes e otimizar o uso de tokens para limites de contexto de IA
- `--top-files-len <number>`: Número dos maiores arquivos para exibir no resumo (padrão: 5, ex: --top-files-len 20)

## Opções de Saída do Repomix
- `-o, --output <file>`: Caminho do arquivo de saída (padrão: repomix-output.xml, usar "-" para stdout)
- `--style <type>`: Formato de saída: xml, markdown, json ou plain (padrão: xml)
- `--parsable-style`: Habilitar saída analisável baseada no esquema de estilo escolhido. Note que isso pode aumentar a contagem de tokens.
- `--compress`: Realizar extração inteligente de código, focando em assinaturas essenciais de funções e classes para reduzir a contagem de tokens
- `--output-show-line-numbers`: Mostrar números de linha na saída
- `--no-file-summary`: Desabilitar saída da seção de resumo de arquivos
- `--no-directory-structure`: Desabilitar saída da seção de estrutura de diretórios
- `--no-files`: Desabilitar saída de conteúdo de arquivos (modo somente metadados)
- `--remove-comments`: Remover comentários de tipos de arquivos suportados
- `--remove-empty-lines`: Remover linhas vazias da saída
- `--truncate-base64`: Habilitar truncamento de strings de dados base64
- `--header-text <text>`: Texto personalizado para incluir no cabeçalho do arquivo
- `--instruction-file-path <path>`: Caminho para um arquivo contendo instruções personalizadas detalhadas
- `--include-empty-directories`: Incluir diretórios vazios na saída
- `--include-full-directory-structure`: Mostrar a árvore completa do repositório na seção Estrutura de Diretórios, mesmo ao usar padrões --include
- `--include-diffs`: Incluir diffs do git na saída (inclui mudanças da árvore de trabalho e mudanças em stage separadamente)
- `--include-logs`: Incluir logs do git na saída (inclui histórico de commits com datas, mensagens e caminhos de arquivos)
- `--include-logs-count <count>`: Número de commits do log do git para incluir (padrão: 50)
- `--no-git-sort-by-changes`: Desabilitar ordenação de arquivos por contagem de mudanças do git (habilitado por padrão)

## Opções de Seleção de Arquivos
- `--include <patterns>`: Lista de padrões de inclusão (separados por vírgula)
- `-i, --ignore <patterns>`: Padrões de ignorar adicionais (separados por vírgula)
- `--no-gitignore`: Desabilitar uso do arquivo .gitignore
- `--no-dot-ignore`: Desabilitar uso do arquivo .ignore
- `--no-default-patterns`: Desabilitar padrões padrão

## Opções de Repositório Remoto
- `--remote <url>`: Processar repositório remoto
- `--remote-branch <name>`: Especificar nome do branch remoto, tag ou hash do commit (padrão para o branch padrão do repositório)

## Opções de Configuração
- `-c, --config <path>`: Caminho do arquivo de configuração personalizado
- `--init`: Criar arquivo de configuração
- `--global`: Usar configuração global

## Opções de Segurança
- `--no-security-check`: Pular verificação de dados sensíveis como chaves de API e senhas

## Opções de Contagem de Tokens
- `--token-count-encoding <encoding>`: Modelo tokenizador para contagem: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (padrão: o200k_base)

## Opções MCP
- `--mcp`: Executar como servidor Model Context Protocol para integração de ferramentas de IA

## Opções de Histórico de Commits do Git

Esses flags independentes espelham a estrutura do git log para controle detalhado:

**Flags de Formato de Diff** (mutuamente exclusivos - escolha um):
- `--stat`: Mostrar contagem de alterações por arquivo (git log --stat)
- `--patch`: Mostrar diffs linha por linha (git log --patch)
- `--numstat`: Mostrar adições/exclusões numéricas por arquivo (git log --numstat)
- `--shortstat`: Mostrar resumo de uma linha das alterações (git log --shortstat)
- `--dirstat`: Mostrar distribuição de alterações por diretório (git log --dirstat)
- `--name-only`: Mostrar apenas nomes de arquivos (git log --name-only) - padrão
- `--name-status`: Mostrar nomes de arquivos com status A/M/D/R (git log --name-status)
- `--raw`: Mostrar formato de baixo nível com hashes SHA e modos (git log --raw)

**Opções de Nível de Detalhe e Gráfico** (combináveis com qualquer formato de diff):
- `--graph`: Incluir visualização de gráfico de commits ASCII e Mermaid (git log --graph --all)
- `--summary`: Mostrar operações de arquivos como criações, renomeações, mudanças de modo (git log --summary)
- `--commit-range <range>`: Intervalo de commits Git para analisar (padrão: HEAD~50..HEAD, suporta sintaxes .. e ..., ex: "HEAD~100..HEAD", "v1.0..v2.0", "main...feature-branch")

## Exemplos

```bash
# Uso básico
repomix

# Arquivo de saída e formato personalizados
repomix -o my-output.xml --style xml

# Saída para stdout
repomix --stdout > custom-output.txt

# Saída para stdout, depois pipe para outro comando (ex., simonw/llm)
repomix --stdout | llm "Por favor explique o que este código faz."

# Saída personalizada com compressão
repomix --compress

# Processar arquivos específicos com padrões
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Repositório remoto com branch
repomix --remote https://github.com/user/repo/tree/main

# Repositório remoto com commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repositório remoto com forma abreviada
repomix --remote user/repo

# Lista de arquivos usando stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Integração Git
repomix --include-diffs  # Incluir diffs do git para mudanças não commitadas
repomix --include-logs   # Incluir logs do git (últimos 50 commits por padrão)
repomix --include-logs --include-logs-count 10  # Incluir últimos 10 commits
repomix --include-diffs --include-logs  # Incluir tanto diffs quanto logs

# Análise de contagem de tokens
repomix --token-count-tree
repomix --token-count-tree 1000  # Mostrar apenas arquivos/diretórios com 1000+ tokens
```

