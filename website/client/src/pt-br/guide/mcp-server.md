# Servidor MCP

O Repomix suporta o [Model Context Protocol (MCP)](https://modelcontextprotocol.io), permitindo que assistentes de IA interajam diretamente com sua base de código. Quando executado como um servidor MCP, o Repomix fornece ferramentas que permitem aos assistentes de IA empacotar repositórios locais ou remotos para análise sem necessidade de preparação manual de arquivos.

## Executando o Repomix como um Servidor MCP

Para executar o Repomix como um servidor MCP, use a flag `--mcp`:

```bash
repomix --mcp
```

Isso inicia o Repomix no modo servidor MCP, tornando-o disponível para assistentes de IA que suportam o Model Context Protocol.

## Ferramentas MCP Disponíveis

Quando executado como um servidor MCP, o Repomix fornece as seguintes ferramentas:

### pack_codebase

Esta ferramenta empacota um diretório de código local em um arquivo consolidado para análise de IA.

**Parâmetros:**
- `directory`: (Obrigatório) Caminho absoluto para o diretório a ser empacotado
- `compress`: (Opcional, padrão: true) Se deve realizar extração inteligente de código para reduzir a contagem de tokens
- `includePatterns`: (Opcional) Lista separada por vírgulas de padrões de inclusão
- `ignorePatterns`: (Opcional) Lista separada por vírgulas de padrões de exclusão

**Exemplo:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

Esta ferramenta busca, clona e empacota um repositório GitHub em um arquivo consolidado para análise de IA.

**Parâmetros:**
- `remote`: (Obrigatório) URL do repositório GitHub ou formato usuário/repo (ex: yamadashy/repomix)
- `compress`: (Opcional, padrão: true) Se deve realizar extração inteligente de código para reduzir a contagem de tokens
- `includePatterns`: (Opcional) Lista separada por vírgulas de padrões de inclusão
- `ignorePatterns`: (Opcional) Lista separada por vírgulas de padrões de exclusão

**Exemplo:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

## Configurando Servidores MCP

Para usar o Repomix como um servidor MCP com assistentes de IA como o Claude, você precisa configurar as definições do MCP:

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

### Para o Claude Desktop

Edite o arquivo `claude_desktop_config.json` com uma configuração similar à do Cline.

## Benefícios de Usar o Repomix como um Servidor MCP

Usar o Repomix como um servidor MCP oferece várias vantagens:

1. **Integração Direta**: Assistentes de IA podem analisar sua base de código diretamente sem preparação manual de arquivos.
2. **Fluxo de Trabalho Eficiente**: Otimiza o processo de análise de código eliminando a necessidade de gerar e carregar arquivos manualmente.
3. **Saída Consistente**: Garante que o assistente de IA receba a base de código em um formato consistente e otimizado.
4. **Recursos Avançados**: Aproveita todos os recursos do Repomix como compressão de código, contagem de tokens e verificações de segurança.

Uma vez configurado, seu assistente de IA pode usar diretamente as capacidades do Repomix para analisar bases de código, tornando os fluxos de trabalho de análise de código mais eficientes.
