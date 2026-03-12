# Usando Repomix como Biblioteca

Além de usar o Repomix como ferramenta CLI, você pode integrar suas funcionalidades diretamente em suas aplicações Node.js.

## Instalação

Instale o Repomix como dependência em seu projeto:

```bash
npm install repomix
```

## Uso Básico

A maneira mais simples de usar o Repomix é através da função `runCli`, que proporciona a mesma funcionalidade da interface de linha de comando:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Processar o diretório atual com opções personalizadas
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;
  
  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

O `result.packResult` contém informações sobre os arquivos processados, incluindo:
- `totalFiles`: Número de arquivos processados
- `totalCharacters`: Contagem total de caracteres
- `totalTokens`: Contagem total de tokens (útil para limites de contexto de LLM)
- `fileCharCounts`: Contagem de caracteres por arquivo
- `fileTokenCounts`: Contagem de tokens por arquivo

## Processamento de Repositórios Remotos

Você pode clonar e processar um repositório remoto:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Clonar e processar um repositório GitHub
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## Usando Componentes Principais

Para maior controle, você pode usar as APIs de baixo nível do Repomix diretamente:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Encontrar e coletar arquivos
  const { filePaths } = await searchFiles(directory, { /* configuração */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* configuração */ });
  
  // Contar tokens
  const tokenCounter = new TokenCounter('o200k_base');
  
  // Retornar resultados da análise
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Bundling

Ao fazer bundle do repomix com ferramentas como Rolldown ou esbuild, algumas dependências devem permanecer externas e arquivos WASM precisam ser copiados:

**Dependências externas (não podem ser bundled):**
- `tinypool` - Cria threads de worker usando caminhos de arquivo
- `tiktoken` - Carrega arquivos WASM dinamicamente em tempo de execução

**Arquivos WASM a copiar:**
- `web-tree-sitter.wasm` → Mesmo diretório do JS bundled (necessário para o recurso de compressão de código)
- Arquivos de linguagem Tree-sitter → Diretório especificado pela variável de ambiente `REPOMIX_WASM_DIR`

Para um exemplo funcional, consulte [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Exemplo do Mundo Real

O site do Repomix ([repomix.com](https://repomix.com)) usa o Repomix como biblioteca para processar repositórios remotos. Você pode ver a implementação em [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts). 
