# Configuração

O Repomix pode ser configurado usando um arquivo de configuração ou opções de linha de comando. O arquivo de configuração permite que você personalize vários aspectos de como seu código-fonte é processado e gerado.

## Formatos de arquivos de configuração

O Repomix suporta múltiplos formatos de arquivos de configuração para flexibilidade e facilidade de uso.

O Repomix buscará automaticamente arquivos de configuração na seguinte ordem de prioridade:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Configuração JSON

Crie um arquivo de configuração no diretório do seu projeto:
```bash
repomix --init
```

Isso criará um arquivo `repomix.config.json` com as configurações padrão. Você também pode criar um arquivo de configuração global que será usado como fallback quando nenhuma configuração local for encontrada:

```bash
repomix --init --global
```

### Configuração TypeScript

Os arquivos de configuração TypeScript oferecem a melhor experiência de desenvolvimento com verificação completa de tipos e suporte IDE.

**Instalação:**

Para usar a configuração TypeScript ou JavaScript com `defineConfig`, você precisa instalar o Repomix como dependência de desenvolvimento:

```bash
npm install -D repomix
```

**Exemplo:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Vantagens:**
- ✅ Verificação completa de tipos TypeScript em seu IDE
- ✅ Excelente autocompletar e IntelliSense do IDE
- ✅ Uso de valores dinâmicos (timestamps, variáveis de ambiente, etc.)

**Exemplo de valores dinâmicos:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Gerar nome de arquivo baseado em timestamp
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Configuração JavaScript

Os arquivos de configuração JavaScript funcionam da mesma forma que TypeScript, suportando `defineConfig` e valores dinâmicos.

## Opções de configuração

| Opção                           | Descrição                                                                                                                  | Padrão                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Tamanho máximo do arquivo em bytes para processar. Arquivos maiores serão ignorados. Útil para excluir arquivos binários grandes ou arquivos de dados | `50000000`            |
| `output.filePath`                | Nome do arquivo de saída. Suporta formatos XML, Markdown e texto simples                                                   | `"repomix-output.xml"` |
| `output.style`                   | Estilo de saída (`xml`, `markdown`, `json`, `plain`). Cada formato tem suas próprias vantagens para diferentes ferramentas de IA   | `"xml"`                |
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
| `output.splitOutput`             | Dividir saída em múltiplos arquivos numerados por tamanho máximo por parte (ex., `1000000` para ~1MB). CLI aceita tamanhos legíveis como `500kb` ou `2mb`. Mantém cada arquivo abaixo do limite e evita dividir arquivos de origem entre as partes | Não definido |
| `output.topFilesLength`          | Número de arquivos principais para exibir no resumo. Se definido como 0, nenhum resumo será exibido                      | `5`                    |
| `output.includeEmptyDirectories` | Indica se deve incluir diretórios vazios na estrutura do repositório                                                     | `false`                |
| `output.includeFullDirectoryStructure` | Ao usar padrões `include`, indica se deve exibir a árvore de diretórios completa (respeitando os padrões ignore) enquanto processa apenas os arquivos incluídos. Fornece contexto completo do repositório para análise de IA | `false`                |
| `output.git.sortByChanges`       | Indica se deve ordenar arquivos por número de alterações git. Arquivos com mais alterações aparecem no final            | `true`                 |
| `output.git.sortByChangesMaxCommits` | Número máximo de commits para analisar ao contar alterações git. Limita a profundidade do histórico por desempenho  | `100`                  |
| `output.git.includeDiffs`        | Indica se deve incluir as diferenças git na saída. Mostra separadamente as alterações da árvore de trabalho e as alterações preparadas | `false`                |
| `output.git.includeLogs`         | Indica se deve incluir logs do git na saída. Mostra histórico de commits com datas, mensagens e caminhos de arquivos            | `false`                |
| `output.git.includeLogsCount`    | Número de commits do log do git para incluir na saída                                                                          | `50`                   |
| `include`                        | Padrões de arquivos para incluir usando [padrões glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignore.useGitignore`            | Indica se deve usar os padrões do arquivo `.gitignore` do projeto                                                        | `true`                 |
| `ignore.useDotIgnore`            | Indica se deve usar os padrões do arquivo `.ignore` do projeto                                                           | `true`                 |
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
1. Arquivo de configuração local no diretório atual (ordem de prioridade: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Arquivo de configuração global (ordem de prioridade: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

As opções de linha de comando têm precedência sobre as configurações do arquivo.

## Padrões de inclusão

O Repomix suporta especificar arquivos para incluir usando [padrões glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). Isso permite uma seleção de arquivos mais flexível e poderosa:

- Use `**/*.js` para incluir todos os arquivos JavaScript em qualquer diretório
- Use `src/**/*` para incluir todos os arquivos dentro do diretório `src` e seus subdiretórios
- Combine múltiplos padrões como `["src/**/*.js", "**/*.md"]` para incluir arquivos JavaScript em `src` e todos os arquivos Markdown

Você pode especificar padrões de inclusão em seu arquivo de configuração:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Ou use a opção de linha de comando `--include` para filtragem única.

## Padrões de ignorar

O Repomix oferece múltiplos métodos para definir padrões de ignorar para excluir arquivos ou diretórios específicos durante o processo de empacotamento:

- **.gitignore**: Por padrão, são utilizados os padrões listados nos arquivos `.gitignore` do seu projeto e `.git/info/exclude`. Este comportamento pode ser controlado com a configuração `ignore.useGitignore` ou a opção CLI `--no-gitignore`.
- **.ignore**: Você pode usar um arquivo `.ignore` na raiz do seu projeto, seguindo o mesmo formato que `.gitignore`. Este arquivo é respeitado por ferramentas como ripgrep e the silver searcher, reduzindo a necessidade de manter múltiplos arquivos de ignorar. Este comportamento pode ser controlado com a configuração `ignore.useDotIgnore` ou a opção CLI `--no-dot-ignore`.
- **Padrões padrão**: O Repomix inclui uma lista padrão de arquivos e diretórios comumente excluídos (por exemplo, node_modules, .git, arquivos binários). Esta funcionalidade pode ser controlada com a configuração `ignore.useDefaultPatterns` ou a opção CLI `--no-default-patterns`. Por favor, consulte [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) para mais detalhes.
- **.repomixignore**: Você pode criar um arquivo `.repomixignore` na raiz do seu projeto para definir padrões de ignorar específicos do Repomix. Este arquivo segue o mesmo formato que `.gitignore`.
- **Padrões personalizados**: Padrões de ignorar adicionais podem ser especificados usando a opção `ignore.customPatterns` no arquivo de configuração. Você pode sobrescrever esta configuração com a opção de linha de comando `-i, --ignore`.

**Ordem de prioridade** (da mais alta para a mais baixa):

1. Padrões personalizados (`ignore.customPatterns`)
2. Arquivos de ignorar (`.repomixignore`, `.ignore`, `.gitignore` e `.git/info/exclude`):
   - Quando em diretórios aninhados, arquivos em diretórios mais profundos têm prioridade mais alta
   - Quando no mesmo diretório, esses arquivos são mesclados sem uma ordem particular
3. Padrões padrão (se `ignore.useDefaultPatterns` for verdadeiro e `--no-default-patterns` não for usado)

Esta abordagem permite uma configuração flexível de exclusão de arquivos com base nas necessidades do seu projeto. Ajuda a otimizar o tamanho do arquivo empacotado gerado, garantindo a exclusão de arquivos sensíveis à segurança e arquivos binários grandes, enquanto previne o vazamento de informações confidenciais.

**Nota:** Os arquivos binários não são incluídos na saída empacotada por padrão, mas seus caminhos são listados na seção "Estrutura do Repositório" do arquivo de saída. Isso fornece uma visão completa da estrutura do repositório enquanto mantém o arquivo empacotado eficiente e baseado em texto. Veja [Tratamento de Arquivos Binários](#tratamento-de-arquivos-binários) para mais detalhes.

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

## Tratamento de Arquivos Binários

Arquivos binários (como imagens, PDFs, binários compilados, arquivos compactados, etc.) são tratados especialmente para manter uma saída eficiente baseada em texto:

- **Conteúdos de arquivo**: Arquivos binários **não são incluídos** na saída empacotada para manter o arquivo baseado em texto e eficiente para processamento de IA
- **Estrutura de diretórios**: Caminhos de arquivos binários **são listados** na seção de estrutura de diretórios, fornecendo uma visão completa do seu repositório

Esta abordagem garante que você obtenha uma visão completa da estrutura do seu repositório enquanto mantém uma saída eficiente baseada em texto otimizada para consumo de IA.

**Exemplo:**

Se o seu repositório contém `logo.png` e `app.jar`:
- Eles aparecerão na seção Estrutura de Diretórios
- Seus conteúdos não serão incluídos na seção Arquivos

**Saída de Estrutura de Diretórios:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

Dessa forma, as ferramentas de IA podem entender que esses arquivos binários existem na estrutura do seu projeto sem processar seus conteúdos binários.

**Nota:** Você pode controlar o limite de tamanho máximo de arquivo usando a opção de configuração `input.maxFileSize` (padrão: 50MB). Arquivos maiores que esse limite serão completamente ignorados.

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
