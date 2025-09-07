# Configuração

O Repomix pode ser configurado usando um arquivo de configuração (`repomix.config.json`) ou opções de linha de comando. O arquivo de configuração permite que você personalize vários aspectos de como seu código-fonte é processado e gerado.

## Início rápido

Crie um arquivo de configuração no diretório do seu projeto:
```bash
repomix --init
```

Isso criará um arquivo `repomix.config.json` com as configurações padrão. Você também pode criar um arquivo de configuração global que será usado como fallback quando nenhuma configuração local for encontrada:

```bash
repomix --init --global
```

## Opções de configuração

| Opção                           | Descrição                                                                                                                  | Padrão                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Tamanho máximo do arquivo em bytes para processar. Arquivos maiores serão ignorados. Útil para excluir arquivos binários grandes ou arquivos de dados | `50000000`            |
| `output.filePath`                | Nome do arquivo de saída. Suporta formatos XML, Markdown e texto simples                                                   | `"repomix-output.xml"` |
| `output.style`                   | Estilo de saída (`xml`, `markdown`, `plain`). Cada formato tem suas próprias vantagens para diferentes ferramentas de IA   | `"xml"`                |
| `output.parsableStyle`           | Indica se a saída deve ser escapada de acordo com o esquema de estilo escolhido. Permite melhor análise mas pode aumentar a contagem de tokens | `false`                |
| `output.compress`                | Indica se deve realizar extração inteligente de código usando Tree-sitter para reduzir a contagem de tokens enquanto preserva a estrutura | `false`                |
| `output.headerText`              | Texto personalizado para incluir no cabeçalho do arquivo. Útil para fornecer contexto ou instruções para ferramentas de IA | `null`                 |
| `output.instructionFilePath`     | Caminho para um arquivo contendo instruções personalizadas detalhadas para processamento de IA                            | `null`                 |
| `output.fileSummary`             | Indica se deve incluir uma seção de resumo no início mostrando contagens de arquivos, tamanhos e outras métricas         | `true`                 |
| `output.directoryStructure`      | Indica se deve incluir a estrutura de diretórios na saída. Ajuda a IA a entender a organização do projeto                | `true`                 |
| `output.files`                   | Indica se deve incluir o conteúdo dos arquivos na saída. Defina como false para incluir apenas estrutura e metadados     | `true`                 |
| `output.removeComments`          | Indica se deve remover comentários dos tipos de arquivos suportados. Pode reduzir ruído e contagem de tokens             | `false`                |
| `output.removeEmptyLines`        | Indica se deve remover linhas vazias da saída para reduzir a contagem de tokens                                          | `false`                |
| `output.showLineNumbers`         | Indica se deve adicionar números de linha a cada linha. Útil para referenciar partes específicas do código               | `false`                |
| `output.truncateBase64`          | Indica se deve truncar strings de dados base64 longas (por exemplo, imagens) para reduzir a contagem de tokens           | `false`                |
| `output.copyToClipboard`         | Indica se deve copiar a saída para a área de transferência do sistema além de salvar o arquivo                           | `false`                |
| `output.topFilesLength`          | Número de arquivos principais para exibir no resumo. Se definido como 0, nenhum resumo será exibido                      | `5`                    |
| `output.includeEmptyDirectories` | Indica se deve incluir diretórios vazios na estrutura do repositório                                                     | `false`                |
| `output.git.sortByChanges`       | Indica se deve ordenar arquivos por número de alterações git. Arquivos com mais alterações aparecem no final            | `true`                 |
| `output.git.sortByChangesMaxCommits` | Número máximo de commits para analisar ao contar alterações git. Limita a profundidade do histórico por desempenho  | `100`                  |
| `output.git.includeDiffs`        | Indica se deve incluir as diferenças git na saída. Mostra separadamente as alterações da árvore de trabalho e as alterações preparadas | `false`                |
| `output.git.includeLogs`         | Indica se deve incluir logs do git na saída. Mostra histórico de commits com datas, mensagens e caminhos de arquivos            | `false`                |
| `output.git.includeLogsCount`    | Número de commits do log do git para incluir na saída                                                                          | `50`                   |
| `include`                        | Padrões de arquivos para incluir usando [padrões glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | Indica se deve usar os padrões do arquivo `.gitignore` do projeto                                                        | `true`                 |
| `ignore.useDefaultPatterns`      | Indica se deve usar os padrões de ignorar padrão (node_modules, .git, etc.)                                            | `true`                 |
| `ignore.customPatterns`          | Padrões adicionais para ignorar usando [padrões glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Indica se deve realizar verificações de segurança usando Secretlint para detectar informações sensíveis                  | `true`                 |
| `tokenCount.encoding`            | Codificação de contagem de tokens usada pelo tokenizador [tiktoken](https://github.com/openai/tiktoken) da OpenAI. Use `o200k_base` para GPT-4o, `cl100k_base` para GPT-4/3.5. Veja [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) para mais detalhes. | `"o200k_base"`         |

O arquivo de configuração suporta a sintaxe [JSON5](https://json5.org/), que permite:
- Comentários (tanto de uma linha quanto multilinha)
- Vírgulas finais em objetos e arrays
- Nomes de propriedades sem aspas
- Sintaxe de string mais flexível

## Validação de esquema

Você pode habilitar a validação de esquema para seu arquivo de configuração adicionando a propriedade `$schema`:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Isso fornece autocompletar e validação em editores que suportam esquema JSON.

## Exemplo de arquivo de configuração

Aqui está um exemplo de um arquivo de configuração completo (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Informações de cabeçalho personalizadas para o arquivo empacotado.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignoreContent": ["components/**", "!components/slider/**"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Os padrões também podem ser especificados em .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Locais dos arquivos de configuração

O Repomix procura os arquivos de configuração na seguinte ordem:
1. Arquivo de configuração local (`repomix.config.json`) no diretório atual
2. Arquivo de configuração global:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

As opções de linha de comando têm precedência sobre as configurações do arquivo.

## Padrões de ignorar

O Repomix fornece múltiplas formas de especificar quais arquivos devem ser ignorados. Os padrões são processados na seguinte ordem de prioridade:

1. Opções de CLI (`--ignore`)
2. Arquivo `.repomixignore` no diretório do projeto
3. `.gitignore` e `.git/info/exclude` (se `ignore.useGitignore` for verdadeiro)
4. Padrões padrão (se `ignore.useDefaultPatterns` for verdadeiro)

Exemplo de `.repomixignore`:
```text
# Diretórios de cache
.cache/
tmp/

# Saídas de compilação
dist/
build/

# Registros
*.log
```

## Padrões de ignorar padrão

Quando `ignore.useDefaultPatterns` é verdadeiro, o Repomix ignora automaticamente padrões comuns:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Para a lista completa, veja [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Recursos avançados

### Compressão de código

O recurso de compressão de código, habilitado com `output.compress: true`, usa [Tree-sitter](https://github.com/tree-sitter/tree-sitter) para extrair inteligentemente estruturas de código essenciais enquanto remove detalhes de implementação. Isso ajuda a reduzir a contagem de tokens enquanto mantém informações estruturais importantes.

Benefícios principais:
- Reduz significativamente a contagem de tokens
- Preserva as assinaturas de classes e funções
- Mantém importações e exportações
- Conserva definições de tipos e interfaces
- Remove corpos de funções e detalhes de implementação

Para mais detalhes e exemplos, consulte o [Guia de compressão de código](code-compress).

### Integração com Git

A configuração `output.git` fornece recursos poderosos relacionados ao Git:

- `sortByChanges`: Quando verdadeiro, os arquivos são ordenados por número de alterações Git (commits que modificaram o arquivo). Arquivos com mais alterações aparecem no final da saída. Isso ajuda a priorizar os arquivos mais ativamente desenvolvidos. Padrão: `true`
- `sortByChangesMaxCommits`: O número máximo de commits para analisar ao contar alterações de arquivos. Padrão: `100`
- `includeDiffs`: Quando verdadeiro, inclui as diferenças Git na saída (inclui separadamente as alterações da árvore de trabalho e as alterações preparadas). Isso permite que o leitor veja as alterações pendentes no repositório. Padrão: `false`
- `includeLogs`: Quando verdadeiro, inclui o histórico de commits Git na saída. Mostra datas de commit, mensagens e caminhos de arquivos para cada commit. Isso ajuda a IA a entender padrões de desenvolvimento e relacionamentos entre arquivos. Padrão: `false`
- `includeLogsCount`: O número de commits recentes para incluir nos logs git. Padrão: `50`

Exemplo de configuração:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Verificações de segurança

Quando `security.enableSecurityCheck` está habilitado, o Repomix usa [Secretlint](https://github.com/secretlint/secretlint) para detectar informações sensíveis em seu código-fonte antes de incluí-las na saída. Isso ajuda a prevenir a exposição acidental de:

- Chaves de API
- Tokens de acesso
- Chaves privadas
- Senhas
- Outras credenciais sensíveis

### Remoção de comentários

Quando `output.removeComments` é definido como `true`, os comentários são removidos dos tipos de arquivos suportados para reduzir o tamanho da saída e focar no conteúdo essencial do código. Isso pode ser particularmente útil quando:

- Você está trabalhando com código altamente documentado
- Você está tentando reduzir a contagem de tokens
- Você está focando na estrutura e lógica do código

Para os idiomas suportados e exemplos detalhados, consulte o [Guia de remoção de comentários](comment-removal).
