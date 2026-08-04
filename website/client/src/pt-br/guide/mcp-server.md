---
title: "Servidor MCP"
description: "Execute o Repomix como servidor Model Context Protocol para que assistentes de IA possam empacotar, pesquisar e ler bases de código locais ou remotas diretamente."
---

# Servidor MCP

O Repomix suporta o [Model Context Protocol (MCP)](https://modelcontextprotocol.io), permitindo que assistentes de IA interajam diretamente com sua base de código. Quando executado como um servidor MCP, o Repomix fornece ferramentas que permitem aos assistentes de IA empacotar repositórios locais ou remotos para análise sem necessidade de preparação manual de arquivos.

> [!NOTE]  
> Este é um recurso experimental que estaremos melhorando ativamente com base no feedback dos usuários e no uso no mundo real

## Executando o Repomix como um Servidor MCP

Para executar o Repomix como um servidor MCP, use a flag `--mcp`:

```bash
repomix --mcp
```

Isso inicia o Repomix no modo servidor MCP, tornando-o disponível para assistentes de IA que suportam o Model Context Protocol.

## Modo Sandbox

Por padrão, o servidor MCP pode ler qualquer caminho que o usuário do host possa acessar. Isso é conveniente para um assistente local confiável, mas é permissivo demais quando o servidor é exposto a um cliente ou agente não confiável. A flag `--sandbox` restringe as ferramentas de arquivo do servidor a um único diretório de workspace:

```bash
# Restringir ao diretório de trabalho atual
repomix --mcp --sandbox

# Restringir a um diretório específico
repomix --mcp --sandbox path/to/project
```

Quando o modo sandbox está ativado:

- **Todo caminho é relativo à raiz do workspace.** Caminhos absolutos, `~`, `..` e caminhos de drive/UNC do Windows são recusados, e caminhos que resolvem para fora da raiz (inclusive através de symlinks) são descartados. Resultados e mensagens de erro também são relativos, para que caminhos do host não sejam expostos. Isso se aplica aos argumentos `directory` e `path` na referência de ferramentas abaixo: no modo sandbox, informe-os relativos à raiz do workspace, e não como os caminhos absolutos que essas tabelas descrevem em outros contextos.
- **Apenas ferramentas somente leitura e restritas à raiz são registradas:** `pack_codebase`, `read_repomix_output`, `grep_repomix_output`, `file_system_read_file` e `file_system_read_directory`. O empacotamento remoto, a geração de skills e o anexo de saídas externas são desabilitados, já que essas operações acessam a rede, gravam arquivos ou referenciam caminhos arbitrários. As duas ferramentas `file_system_*` em si só estão disponíveis no modo sandbox, onde a raiz do workspace delimita o que elas podem alcançar.

Essa é uma restrição da superfície de ferramentas no nível da aplicação (defesa em profundidade), não um sandbox no nível do sistema operacional. Ao hospedar o servidor para clientes não confiáveis, continue executando-o sob o isolamento usual da sua plataforma (containers, usuários dedicados).

`--sandbox` afeta apenas o servidor MCP; não tem efeito sem `--mcp`.

## Configurando Servidores MCP

Para usar o Repomix como um servidor MCP com assistentes de IA como o Claude, você precisa configurar as definições do MCP:

### Para VS Code

Você pode instalar o servidor MCP do Repomix no VS Code usando um destes métodos:

1. **Usando o distintivo de instalação:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Usando a linha de comando:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Para VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Para o Cline (extensão do VS Code)

Edite o arquivo `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Para o Cursor

No Cursor, adicione um novo servidor MCP a partir de `Cursor Settings` > `MCP` > `+ Add new global MCP server` com uma configuração similar à do Cline.

### Para o Claude Desktop

Edite o arquivo `claude_desktop_config.json` com uma configuração similar à do Cline.

### Para o Claude Code

Para configurar o Repomix como servidor MCP no [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), use o seguinte comando:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternativamente, você pode usar os **plugins oficiais do Repomix** para uma experiência mais conveniente. Os plugins fornecem comandos em linguagem natural e configuração mais fácil. Consulte a documentação [Plugins do Claude Code](/pt-br/guide/claude-code-plugins) para obter detalhes.

### Usando Docker em vez de npx

Em vez de usar npx, você pode usar o Docker para executar o Repomix como um servidor MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Ferramentas MCP Disponíveis

Quando executado como um servidor MCP, o Repomix fornece as seguintes ferramentas:

### pack_codebase

Esta ferramenta empacota um diretório de código local em um arquivo XML para análise de IA. Ela analisa a estrutura da base de código, extrai conteúdo de código relevante e gera um relatório abrangente incluindo métricas, árvore de arquivos e conteúdo de código formatado.

**Parâmetros:**

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `directory` | Sim | — | Caminho absoluto para o diretório a ser empacotado |
| `compress` | Não | `false` | Habilita compressão Tree-sitter para extrair assinaturas de código essenciais e estrutura enquanto remove detalhes de implementação. Reduz o uso de tokens em ~70% mantendo o significado semântico. Geralmente não é necessário já que `grep_repomix_output` permite recuperação incremental de conteúdo. |
| `includePatterns` | Não | — | Arquivos para incluir usando padrões fast-glob. Separados por vírgula (ex: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Não | — | Arquivos adicionais para excluir usando padrões fast-glob. Separados por vírgula (ex: `"test/**,*.spec.js"`). Complementam `.gitignore` e exclusões integradas. |
| `outputPatterns` | Não | — | Níveis de inclusão por arquivo, espelhando a opção [`output.patterns`](./configuration.md) do arquivo de configuração. Um array de entradas `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }`. O primeiro padrão correspondente prevalece; `directoryStructureOnly` tem precedência sobre `compress`, e uma correspondência sem nenhuma das duas flags força o conteúdo completo (útil para isentar arquivos de um `compress` global). Sobrescreve qualquer `output.patterns` do `repomix.config.json` do repositório de destino. |
| `topFilesLength` | Não | `10` | Número de maiores arquivos por tamanho para exibir no resumo de métricas |
| `style` | Não | `xml` | Estilo de formato de saída: `xml`, `markdown`, `json` ou `plain` |

**Exemplo:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

Com o exemplo acima (onde `compress: true` atua como o coringa para arquivos não correspondentes), os arquivos em `src/core/` são mantidos com conteúdo completo, os arquivos em `docs/` são listados apenas na árvore de diretórios, e todo o restante é comprimido.

### pack_remote_repository

Esta ferramenta busca, clona e empacota um repositório GitHub em um arquivo XML para análise de IA. Ela automaticamente clona o repositório remoto, analisa sua estrutura e gera um relatório abrangente.

**Parâmetros:**

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `remote` | Sim | — | URL do repositório GitHub ou formato `user/repo` (ex: `"yamadashy/repomix"`, `"https://github.com/user/repo"` ou `"https://github.com/user/repo/tree/branch"`) |
| `compress` | Não | `false` | Habilita compressão Tree-sitter para extrair assinaturas de código essenciais e estrutura enquanto remove detalhes de implementação. Reduz o uso de tokens em ~70% mantendo o significado semântico. Geralmente não é necessário já que `grep_repomix_output` permite recuperação incremental de conteúdo. |
| `includePatterns` | Não | — | Arquivos para incluir usando padrões fast-glob. Separados por vírgula (ex: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Não | — | Arquivos adicionais para excluir usando padrões fast-glob. Separados por vírgula (ex: `"test/**,*.spec.js"`). Complementam `.gitignore` e exclusões integradas. |
| `outputPatterns` | Não | — | Níveis de inclusão por arquivo, espelhando a opção [`output.patterns`](./configuration.md) do arquivo de configuração. Um array de entradas `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }`. O primeiro padrão correspondente prevalece; `directoryStructureOnly` tem precedência sobre `compress`, e uma correspondência sem nenhuma das duas flags força o conteúdo completo (útil para isentar arquivos de um `compress` global). |
| `topFilesLength` | Não | `10` | Número de maiores arquivos por tamanho para exibir no resumo de métricas |
| `style` | Não | `xml` | Estilo de formato de saída: `xml`, `markdown`, `json` ou `plain` |

**Exemplo:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

### read_repomix_output

Esta ferramenta lê o conteúdo de um arquivo de saída gerado pelo Repomix. Suporta leitura parcial com especificação de intervalo de linhas para arquivos grandes. Esta ferramenta é projetada para ambientes onde o acesso direto ao sistema de arquivos é limitado.

**Parâmetros:**

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `outputId` | Sim | — | ID do arquivo de saída do Repomix a ser lido |
| `startLine` | Não | Início do arquivo | Número da linha inicial (baseado em 1, inclusivo) |
| `endLine` | Não | Final do arquivo | Número da linha final (baseado em 1, inclusivo) |

**Funcionalidades:**
- Projetado especificamente para ambientes baseados na web ou aplicações em sandbox
- Recupera o conteúdo de saídas geradas anteriormente usando seu ID
- Fornece acesso à base de código empacotada sem requerer acesso ao sistema de arquivos
- Suporta leitura parcial para arquivos grandes

**Exemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Esta ferramenta busca padrões em um arquivo de saída do Repomix usando funcionalidade similar ao grep com sintaxe JavaScript RegExp. Retorna linhas correspondentes com linhas de contexto opcionais ao redor das correspondências.

**Parâmetros:**

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `outputId` | Sim | — | ID do arquivo de saída do Repomix para buscar |
| `pattern` | Sim | — | Padrão de busca (sintaxe de expressão regular JavaScript RegExp) |
| `contextLines` | Não | `0` | Número de linhas de contexto para mostrar antes e depois de cada correspondência. Sobrescrito por `beforeLines`/`afterLines` se especificado. |
| `beforeLines` | Não | — | Linhas para mostrar antes de cada correspondência (como `grep -B`). Tem precedência sobre `contextLines`. |
| `afterLines` | Não | — | Linhas para mostrar depois de cada correspondência (como `grep -A`). Tem precedência sobre `contextLines`. |
| `ignoreCase` | Não | `false` | Realizar correspondência insensível a maiúsculas e minúsculas |

**Funcionalidades:**
- Usa sintaxe JavaScript RegExp para correspondência de padrões poderosa
- Suporta linhas de contexto para melhor compreensão das correspondências
- Permite controle separado de linhas de contexto antes/depois
- Opções de busca sensível e insensível a maiúsculas e minúsculas

**Exemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file e file_system_read_directory

Essas duas ferramentas de sistema de arquivos só estão disponíveis no [modo sandbox](#modo-sandbox) (`--sandbox`), onde a raiz do workspace delimita o que elas podem alcançar. Sem `--sandbox`, elas não são registradas.

1. `file_system_read_file`
  - Lê o conteúdo de um arquivo em um caminho relativo à raiz do workspace (ex.: `src/index.ts`)
  - Recusa conteúdo que corresponda a formatos de segredos conhecidos ([Secretlint](https://github.com/secretlint/secretlint)) como uma salvaguarda heurística adicional; o limite de acesso é a raiz do workspace, não a varredura
  - Retorna mensagens de erro claras para caminhos inválidos, sem expor caminhos do host

2. `file_system_read_directory`
  - Lista o conteúdo de um diretório em um caminho relativo à raiz do workspace (ex.: `.` ou `src`)
  - Mostra arquivos e diretórios com indicadores claros (`[FILE]` ou `[DIR]`)
  - Útil para explorar estrutura de projetos e compreender organização da base de código

**Exemplo:**
```typescript
// Ler um arquivo
const fileContent = await tools.file_system_read_file({
  path: 'src/index.ts'
});

// Listar conteúdo do diretório
const dirContent = await tools.file_system_read_directory({
  path: 'src'
});
```

Essas ferramentas são particularmente úteis quando os assistentes de IA precisam:
- Analisar arquivos específicos no workspace
- Navegar estruturas de diretórios
- Verificar existência e acessibilidade de arquivos

## Benefícios de Usar o Repomix como um Servidor MCP

Usar o Repomix como um servidor MCP oferece várias vantagens:

1. **Integração Direta**: Assistentes de IA podem analisar sua base de código diretamente sem preparação manual de arquivos.
2. **Fluxo de Trabalho Eficiente**: Otimiza o processo de análise de código eliminando a necessidade de gerar e carregar arquivos manualmente.
3. **Saída Consistente**: Garante que o assistente de IA receba a base de código em um formato consistente e otimizado.
4. **Recursos Avançados**: Aproveita todos os recursos do Repomix como compressão de código, contagem de tokens e verificações de segurança.

Uma vez configurado, seu assistente de IA pode usar diretamente as capacidades do Repomix para analisar bases de código, tornando os fluxos de trabalho de análise de código mais eficientes.

## Recursos relacionados

- [Plugins do Claude Code](/pt-br/guide/claude-code-plugins) - Integração conveniente de plugins para Claude Code
- [Configuração](/pt-br/guide/configuration) - Personalizar o comportamento do Repomix
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Referência completa da CLI
- [Formatos de Saída](/pt-br/guide/output) - Conhecer os formatos de saída disponíveis
