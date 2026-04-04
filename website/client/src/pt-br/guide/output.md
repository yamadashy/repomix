# Formatos de Saída

O Repomix suporta quatro formatos de saída:
- XML (padrão)
- Markdown
- JSON
- Texto simples 

## Formato XML

```bash
repomix --style xml
```

O formato XML é otimizado para processamento por IA:

```xml
Este arquivo é uma representação consolidada de toda a base de código...

<file_summary>
(Metadados e instruções para IA)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Conteúdo do arquivo aqui
</file>
</files>

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### Por que XML como formato padrão?

O Repomix usa XML como formato de saída padrão com base em pesquisas e testes extensivos. Esta decisão é fundamentada em evidências empíricas e considerações práticas para análise de código assistida por IA.

Nossa escolha do XML é principalmente influenciada por recomendações oficiais dos principais provedores de IA:
- **Anthropic (Claude)**: Recomenda explicitamente o uso de tags XML para estruturar prompts, afirmando que "Claude foi exposto a tais prompts durante o treinamento" ([documentação](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Recomenda formatos estruturados incluindo XML para tarefas complexas ([documentação](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Defende o uso de prompting estruturado em cenários complexos ([anúncio](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Formato Markdown

```bash
repomix --style markdown
```

O Markdown oferece formatação legível:

````markdown
Este arquivo é uma representação consolidada de toda a base de código...

# Resumo do Arquivo
(Metadados e instruções para IA)

# Estrutura de Diretórios
```
src/
index.ts
utils/
helper.ts
```

# Arquivos

## Arquivo: src/index.ts
```typescript
// Conteúdo do arquivo aqui
```

# Logs do Git
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## Formato JSON

```bash
repomix --style json
```

O formato JSON fornece saída estruturada e programaticamente acessível com nomes de propriedades em camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "Este arquivo é uma representação consolidada de toda a base de código, combinada em um único documento pelo Repomix.",
    "purpose": "Este arquivo contém uma representação empacotada do conteúdo completo do repositório...",
    "fileFormat": "O conteúdo está organizado da seguinte forma...",
    "usageGuidelines": "- Este arquivo deve ser tratado como somente leitura...",
    "notes": "- Alguns arquivos podem ter sido excluídos com base nas regras do .gitignore..."
  },
  "userProvidedHeader": "Texto de cabeçalho personalizado se especificado",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Conteúdo do arquivo aqui",
    "src/utils.js": "// Conteúdo do arquivo aqui"
  },
  "instruction": "Instruções personalizadas do instructionFilePath"
}
```

### Benefícios do Formato JSON

O formato JSON é ideal para:
- **Processamento programático**: Fácil de analisar e manipular com bibliotecas JSON em qualquer linguagem de programação
- **Integração de API**: Consumo direto por serviços web e aplicações
- **Compatibilidade com ferramentas de IA**: Formato estruturado otimizado para aprendizado de máquina e sistemas de IA
- **Análise de dados**: Extração direta de informações específicas usando ferramentas como `jq`

### Trabalhando com Saída JSON usando `jq`

O formato JSON facilita a extração programática de informações específicas. Aqui estão exemplos comuns:

#### Operações Básicas de Arquivos
```bash
# Listar todos os caminhos de arquivo
cat repomix-output.json | jq -r '.files | keys[]'

# Contar o número total de arquivos
cat repomix-output.json | jq '.files | keys | length'

# Extrair conteúdo de arquivo específico
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Filtragem e Análise de Arquivos
```bash
# Encontrar arquivos por extensão
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Obter arquivos contendo texto específico
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Criar lista de arquivos com contagem de caracteres
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) caracteres"'
```

#### Extração de Metadados
```bash
# Extrair estrutura de diretórios
cat repomix-output.json | jq -r '.directoryStructure'

# Obter informações do resumo de arquivos
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Extrair cabeçalho fornecido pelo usuário (se existir)
cat repomix-output.json | jq -r '.userProvidedHeader // "Nenhum cabeçalho fornecido"'

# Obter instruções personalizadas
cat repomix-output.json | jq -r '.instruction // "Nenhuma instrução fornecida"'
```

#### Análise Avançada
```bash
# Encontrar maiores arquivos por comprimento de conteúdo
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Pesquisar arquivos contendo padrões específicos
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Extrair caminhos de arquivos que coincidem com múltiplas extensões
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Formato de Texto Simples

```bash
repomix --style plain
```

Estrutura de saída:
```text
Este arquivo é uma representação consolidada de toda a base de código...

================
Resumo do Arquivo
================
(Metadados e instruções para IA)

================
Estrutura de Diretórios
================
src/
  index.ts
  utils/
    helper.ts

================
Arquivos
================

================
Arquivo: src/index.ts
================
// Conteúdo do arquivo aqui

================
Logs do Git
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## Uso com Modelos de IA

Cada formato funciona bem com modelos de IA, mas considere:
- Use XML para Claude (melhor precisão de análise)
- Use Markdown para leitura geral
- Use JSON para processamento programático e integração de API
- Use Texto Simples para simplicidade e compatibilidade universal

## Customização

Defina o formato padrão no `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## Recursos relacionados

- [Configuração](/pt-br/guide/configuration) - Referência completa de opções de configuração
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Usar `--style` para definir o formato de saída
- [Compressão de Código](/pt-br/guide/code-compress) - Reduzir a contagem de tokens preservando a estrutura
- [Exemplos de Prompts](/pt-br/guide/prompt-examples) - Dicas para usar a saída com diferentes modelos de IA
