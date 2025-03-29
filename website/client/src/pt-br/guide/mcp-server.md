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

### read_repomix_output

Esta ferramenta lê o conteúdo de um arquivo de saída do Repomix em ambientes onde o acesso direto a arquivos não é possível.

**Parâmetros:**
- `outputId`: (Obrigatório) ID do arquivo de saída do Repomix a ser lido

**Funcionalidades:**
- Projetado especificamente para ambientes baseados na web ou aplicações em sandbox
- Recupera o conteúdo de saídas geradas anteriormente usando seu ID
- Fornece acesso seguro à base de código empacotada sem requerer acesso ao sistema de arquivos

**Exemplo:**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file e file_system_read_directory

O servidor MCP do Repomix fornece duas ferramentas de sistema de arquivos que permitem que os assistentes de IA interajam com segurança com o sistema de arquivos local:

1. `file_system_read_file`
   - Lê conteúdo de arquivos usando caminhos absolutos
   - Implementa validação de segurança usando [Secretlint](https://github.com/secretlint/secretlint)
   - Previne acesso a arquivos contendo informações sensíveis
   - Retorna mensagens de erro claras para caminhos inválidos e problemas de segurança

2. `file_system_read_directory`
   - Lista conteúdos de diretórios usando caminhos absolutos
   - Mostra arquivos e diretórios com indicadores claros (`[FILE]` ou `[DIR]`)
   - Fornece navegação segura de diretórios com tratamento apropriado de erros
   - Valida caminhos e garante que sejam absolutos

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
- Analisar arquivos específicos no código-base
- Navegar estruturas de diretórios
- Verificar existência e acessibilidade de arquivos
- Garantir operações seguras do sistema de arquivos

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

### Para o Claude Desktop

Edite o arquivo `claude_desktop_config.json` com uma configuração similar à do Cline.

## Benefícios de Usar o Repomix como um Servidor MCP

Usar o Repomix como um servidor MCP oferece várias vantagens:

1. **Integração Direta**: Assistentes de IA podem analisar sua base de código diretamente sem preparação manual de arquivos.
2. **Fluxo de Trabalho Eficiente**: Otimiza o processo de análise de código eliminando a necessidade de gerar e carregar arquivos manualmente.
3. **Saída Consistente**: Garante que o assistente de IA receba a base de código em um formato consistente e otimizado.
4. **Recursos Avançados**: Aproveita todos os recursos do Repomix como compressão de código, contagem de tokens e verificações de segurança.

Uma vez configurado, seu assistente de IA pode usar diretamente as capacidades do Repomix para analisar bases de código, tornando os fluxos de trabalho de análise de código mais eficientes.
