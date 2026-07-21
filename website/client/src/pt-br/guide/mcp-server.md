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

## Modelo de Segurança

Entender o que o servidor MCP protege — e o que não protege — importa, porque é o agente de IA, não você, que decide qual ferramenta chamar e com quais argumentos.

- **As ferramentas leem tudo o que o processo consegue ler.** `pack_codebase` empacota qualquer caminho de diretório absoluto fornecido, e a saída empacotada é retornada ao agente. Não há confinamento a uma raiz de projeto; o limite é definido pelas permissões de arquivo do seu sistema operacional.
- **A verificação de segredos é uma heurística, não um controle de acesso.** O [Secretlint](https://github.com/secretlint/secretlint) exclui arquivos que correspondem a formatos de credenciais conhecidos (por exemplo, chaves da AWS e chaves privadas). Ele não reconhece todos os segredos, então arquivos como `~/.netrc` ou um kubeconfig podem passar por ele. Trate uma verificação limpa como "nada óbvio foi encontrado", não como "isto é seguro para compartilhar".
- **Um agente pode ser influenciado pelo conteúdo que lê.** Se ele analisar um repositório não confiável, o texto nesse repositório pode tentar instruí-lo a empacotar um diretório sensível ou clonar uma URL não relacionada. O Repomix se recusa a clonar endpoints de metadados de instâncias de nuvem, mas não consegue distinguir uma solicitação genuína de uma injetada.

Conecte o servidor MCP apenas a agentes e repositórios aos quais você está disposto a conceder esse nível de acesso.

## Benefícios de Usar o Repomix como um Servidor MCP

Usar o Repomix como um servidor MCP oferece várias vantagens:

1. **Integração Direta**: Assistentes de IA podem analisar sua base de código diretamente sem preparação manual de arquivos.
2. **Fluxo de Trabalho Eficiente**: Otimiza o processo de análise de código eliminando a necessidade de gerar e carregar arquivos manualmente.
3. **Saída Consistente**: Garante que o assistente de IA receba a base de código em um formato consistente e otimizado.
4. **Recursos Avançados**: Aproveita todos os recursos do Repomix como compressão de código, contagem de tokens e verificação de segredos.

Uma vez configurado, seu assistente de IA pode usar diretamente as capacidades do Repomix para analisar bases de código, tornando os fluxos de trabalho de análise de código mais eficientes.

## Recursos relacionados

- [Plugins do Claude Code](/pt-br/guide/claude-code-plugins) - Integração conveniente de plugins para Claude Code
- [Configuração](/pt-br/guide/configuration) - Personalizar o comportamento do Repomix
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Referência completa da CLI
- [Formatos de Saída](/pt-br/guide/output) - Conhecer os formatos de saída disponíveis
