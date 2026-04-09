# Uso Básico

## Início Rápido

Compacte todo o seu repositório:
```bash
repomix
```

## Casos de Uso Comuns

### Compactar Diretórios Específicos
```bash
repomix path/to/directory
```

### Incluir Arquivos Específicos
Use [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Excluir Arquivos
```bash
repomix --ignore "**/*.log,tmp/"
```

### Dividir Saída em Múltiplos Arquivos

Ao trabalhar com grandes bases de código, a saída empacotada pode exceder os limites de tamanho de arquivo impostos por algumas ferramentas de IA (por exemplo, o limite de 1MB do Google AI Studio). Use `--split-output` para dividir automaticamente a saída em múltiplos arquivos:

```bash
repomix --split-output 1mb
```

Isso gera arquivos numerados como:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

O tamanho pode ser especificado com unidades: `500kb`, `1mb`, `2mb`, `1.5mb`, etc. Valores decimais são suportados.

> [!NOTE]
> Arquivos são agrupados por diretório de nível superior para manter o contexto. Um único arquivo ou diretório nunca será dividido entre múltiplos arquivos de saída.

### Repositórios Remotos
```bash
# Usando URL do GitHub
repomix --remote https://github.com/user/repo

# Usando abreviação
repomix --remote user/repo

# Branch/tag/commit específico
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Entrada de Lista de Arquivos (stdin)

Passe caminhos de arquivos via stdin para máxima flexibilidade:

```bash
# Usando comando find
find src -name "*.ts" -type f | repomix --stdin

# Usando git para obter arquivos rastreados
git ls-files "*.ts" | repomix --stdin

# Usando ripgrep (rg) para encontrar arquivos
rg --files --type ts | repomix --stdin

# Usando grep para encontrar arquivos contendo conteúdo específico
grep -l "TODO" **/*.ts | repomix --stdin

# Usando ripgrep para encontrar arquivos com conteúdo específico
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Usando sharkdp/fd para encontrar arquivos
fd -e ts | repomix --stdin

# Usando fzf para selecionar de todos os arquivos
fzf -m | repomix --stdin

# Seleção interativa de arquivos com fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Usando ls com padrões glob
ls src/**/*.ts | repomix --stdin

# De um arquivo contendo caminhos de arquivos
cat file-list.txt | repomix --stdin

# Entrada direta com echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

A opção `--stdin` permite que você canalize uma lista de caminhos de arquivos para o Repomix, oferecendo máxima flexibilidade na seleção de quais arquivos compactar.

Ao usar `--stdin`, os arquivos especificados são efetivamente adicionados aos padrões de inclusão. Isso significa que o comportamento normal de inclusão e exclusão ainda se aplica - arquivos especificados via stdin ainda serão excluídos se coincidirem com padrões de exclusão.

> [!NOTE]
> Ao usar `--stdin`, os caminhos de arquivos podem ser relativos ou absolutos, e o Repomix tratará automaticamente da resolução de caminhos e deduplicação.

### Compressão de Código {#code-compression}

Reduza a contagem de tokens preservando a estrutura do código. Consulte o [guia de Compressão de Código](/pt-br/guide/code-compress) para detalhes.

```bash
repomix --compress

# Você também pode usar com repositórios remotos:
repomix --remote yamadashy/repomix --compress
```

### Integração Git

Incluir informações do Git para fornecer contexto de desenvolvimento para análise de IA:

```bash
# Incluir diffs do git (alterações não commitadas)
repomix --include-diffs

# Incluir logs de commits do git (últimos 50 commits por padrão)
repomix --include-logs

# Incluir número específico de commits
repomix --include-logs --include-logs-count 10

# Incluir tanto diffs quanto logs
repomix --include-diffs --include-logs
```

Isso adiciona contexto valioso sobre:
- **Alterações recentes**: Diffs do Git mostram modificações não commitadas
- **Padrões de desenvolvimento**: Logs do Git revelam quais arquivos são tipicamente alterados juntos
- **Histórico de commits**: Mensagens de commits recentes fornecem insights sobre o foco do desenvolvimento
- **Relacionamentos entre arquivos**: Entender quais arquivos são modificados nos mesmos commits

### Otimização da Contagem de Tokens

Entender a distribuição de tokens da sua base de código é crucial para otimizar as interações com IA. Use a opção `--token-count-tree` para visualizar o uso de tokens em todo o seu projeto:

```bash
repomix --token-count-tree
```

Isso exibe uma visualização hierárquica da sua base de código com contagens de tokens:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Você também pode definir um limite mínimo de tokens para focar em arquivos maiores:

```bash
repomix --token-count-tree 1000  # Mostrar apenas arquivos/diretórios com 1000+ tokens
```

Isso ajuda você a:
- **Identificar arquivos pesados em tokens** - que podem exceder os limites de contexto da IA
- **Otimizar a seleção de arquivos** - usando padrões `--include` e `--ignore`
- **Planejar estratégias de compressão** - direcionando os maiores contribuidores
- **Equilibrar conteúdo vs contexto** - ao preparar código para análise de IA

## Formatos de Saída

### XML (Padrão)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### Texto Simples
```bash
repomix --style plain
```

## Opções Adicionais

### Remover Comentários

Consulte [Remoção de Comentários](/pt-br/guide/comment-removal) para linguagens suportadas e detalhes.

```bash
repomix --remove-comments
```

### Mostrar Números de Linha
```bash
repomix --output-show-line-numbers
```

### Copiar para a Área de Transferência
```bash
repomix --copy
```

### Desativar Verificação de Segurança

Consulte [Segurança](/pt-br/guide/security) para detalhes sobre o que o Repomix detecta.

```bash
repomix --no-security-check
```

## Configuração

Inicializar arquivo de configuração:
```bash
repomix --init
```

Veja o [Guia de Configuração](/pt-br/guide/configuration) para opções detalhadas.

## Recursos relacionados

- [Formatos de Saída](/pt-br/guide/output) - Conheça os formatos XML, Markdown, JSON e texto simples
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Referência completa da CLI
- [Exemplos de Prompts](/pt-br/guide/prompt-examples) - Exemplos de prompts para análise de IA
- [Casos de Uso](/pt-br/guide/use-cases) - Exemplos reais e fluxos de trabalho
