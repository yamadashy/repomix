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
| `topFilesLength` | Não | `10` | Número de maiores arquivos por tamanho para exibir no resumo de métricas |
| `style` | Não | `xml` | Estilo de formato de saída: `xml`, `markdown`, `json` ou `plain` |

**Exemplo:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Esta ferramenta busca, clona e empacota um repositório GitHub em um arquivo XML para análise de IA. Ela automaticamente clona o repositório remoto, analisa sua estrutura e gera um relatório abrangente.

**Parâmetros:**

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `remote` | Sim | — | URL do repositório GitHub ou formato `user/repo` (ex: `"yamadashy/repomix"`, `"https://github.com/user/repo"` ou `"https://github.com/user/repo/tree/branch"`) |
| `compress` | Não | `false` | Habilita compressão Tree-sitter para extrair assinaturas de código essenciais e estrutura enquanto remove detalhes de implementação. Reduz o uso de tokens em ~70% mantendo o significado semântico. Geralmente não é necessário já que `grep_repomix_output` permite recuperação incremental de conteúdo. |
| `includePatterns` | Não | — | Arquivos para incluir usando padrões fast-glob. Separados por vírgula (ex: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Não | — | Arquivos adicionais para excluir usando padrões fast-glob. Separados por vírgula (ex: `"test/**,*.spec.js"`). Complementam `.gitignore` e exclusões integradas. |
| `topFilesLength` | Não | `10` | Número de maiores arquivos por tamanho para exibir no resumo de métricas |
| `style` | Não | `xml` | Estilo de formato de saída: `xml`, `markdown`, `json` ou `plain` |

**Exemplo:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
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
- Fornece acesso seguro à base de código empacotada sem requerer acesso ao sistema de arquivos
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

O servidor MCP do Repomix fornece duas ferramentas de sistema de arquivos que permitem que os assistentes de IA interajam com segurança com o sistema de arquivos local:

1. `file_system_read_file`
  - Lê conteúdo de arquivos do sistema de arquivos local usando caminhos absolutos
  - Inclui validação de segurança integrada para detectar e prevenir acesso a arquivos contendo informações sensíveis
  - Implementa validação de segurança usando [Secretlint](https://github.com/secretlint/secretlint)
  - Previne acesso a arquivos contendo informações sensíveis (chaves de API, senhas, segredos)
  - Valida caminhos absolutos para prevenir ataques de travessia de diretórios
  - Retorna mensagens de erro claras para caminhos inválidos e problemas de segurança

2. `file_system_read_directory`
  - Lista conteúdos de um diretório usando um caminho absoluto
  - Retorna uma lista formatada mostrando arquivos e subdiretórios com indicadores claros
  - Mostra arquivos e diretórios com indicadores claros (`[FILE]` ou `[DIR]`)
  - Fornece navegação segura de diretórios com tratamento apropriado de erros
  - Valida caminhos e garante que sejam absolutos
  - Útil para explorar estrutura de projetos e compreender organização da base de código

Ambas as ferramentas incorporam medidas de segurança robustas:
- Validação de caminhos absolutos para prevenir ataques de travessia de diretórios
- Verificações de permissões para garantir direitos de acesso apropriados
- Integração com Secretlint para detecção de informações sensíveis
- Mensagens de erro claras para depuração e consciência de segurança

**Exemplo:**
```typescript
// Ler um arquivo
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Listar conteúdo do diretório
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Essas ferramentas são particularmente úteis quando os assistentes de IA precisam:
- Analisar arquivos específicos na base de código
- Navegar estruturas de diretórios
- Verificar existência e acessibilidade de arquivos
- Garantir operações seguras do sistema de arquivos

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
