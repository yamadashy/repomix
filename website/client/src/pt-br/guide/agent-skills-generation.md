# Geração de Agent Skills

O Repomix pode gerar saída no formato [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), criando um diretório estruturado de Skills que pode ser usado como referência de código reutilizável para assistentes de IA.

Este recurso é particularmente poderoso quando você deseja referenciar implementações de repositórios remotos. Ao gerar Skills de projetos de código aberto, você pode facilmente pedir ao Claude para referenciar padrões ou implementações específicas enquanto trabalha em seu próprio código.

Em vez de gerar um único arquivo empacotado, a geração de Skills cria um diretório estruturado com múltiplos arquivos de referência otimizados para compreensão de IA e busca compatível com grep.

> [!NOTE]
> Este é um recurso experimental. O formato de saída e as opções podem mudar em versões futuras com base no feedback dos usuários.

## Uso Básico

Gerar Skills do seu diretório local:

```bash
# Gerar Skills do diretório atual
repomix --skill-generate

# Gerar com nome personalizado de Skills
repomix --skill-generate my-project-reference

# Gerar de um diretório específico
repomix path/to/directory --skill-generate

# Gerar de repositório remoto
repomix --remote https://github.com/user/repo --skill-generate
```

## Seleção de Local dos Skills

Quando você executa o comando, o Repomix solicita que você escolha onde salvar os Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Disponível em todos os projetos na sua máquina
2. **Project Skills** (`.claude/skills/`) - Compartilhado com sua equipe via git

Se o diretório de Skills já existir, será solicitada confirmação para sobrescrever.

> [!TIP]
> Ao gerar Project Skills, considere adicioná-los ao `.gitignore` para evitar fazer commit de arquivos grandes:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Estrutura Gerada

Os Skills são gerados com a seguinte estrutura:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Metadados principais e documentação dos Skills
└── references/
    ├── summary.md              # Propósito, formato e estatísticas
    ├── project-structure.md    # Árvore de diretórios com contagem de linhas
    ├── files.md                # Todo o conteúdo dos arquivos (compatível com grep)
    └── tech-stack.md           # Linguagens, frameworks, dependências
```

### Descrições dos Arquivos

#### SKILL.md

O arquivo principal dos Skills contém:
- Nome dos Skills, descrição e informações do projeto
- Contagem de arquivos, linhas e tokens
- Visão geral de como usar os Skills
- Localizações dos arquivos e explicação do formato
- Casos de uso comuns e dicas

#### references/summary.md

Contém:
- **Propósito**: Explica que é uma base de código de referência para consumo de IA
- **Estrutura de Arquivos**: Documenta o conteúdo de cada arquivo de referência
- **Diretrizes de Uso**: Como usar os Skills efetivamente
- **Estatísticas**: Divisão por tipo de arquivo, linguagem e maiores arquivos

#### references/project-structure.md

Árvore de diretórios com contagem de linhas por arquivo para fácil descoberta:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Todo o conteúdo dos arquivos com cabeçalhos de destaque de sintaxe, otimizado para busca compatível com grep:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Stack tecnológico auto-detectado dos arquivos de dependências:
- **Linguagens**: TypeScript, JavaScript, Python, etc.
- **Frameworks**: React, Next.js, Express, Django, etc.
- **Versões de Runtime**: Node.js, Python, Go, etc.
- **Gerenciador de Pacotes**: npm, pnpm, poetry, etc.
- **Dependências**: Todas as dependências diretas e de desenvolvimento
- **Arquivos de Configuração**: Todos os arquivos de configuração detectados

Detectado de arquivos como: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, etc.

## Nomes de Skills Auto-Gerados

Se nenhum nome for fornecido, o Repomix auto-gera um usando este padrão:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalizado para kebab-case)
```

Os nomes de Skills são:
- Convertidos para kebab-case (minúsculas, separados por hífen)
- Limitados a no máximo 64 caracteres
- Protegidos contra path traversal

## Integração com Opções do Repomix

A geração de Skills respeita todas as opções padrão do Repomix:

```bash
# Gerar Skills com filtragem de arquivos
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Gerar Skills com compressão
repomix --skill-generate --compress

# Gerar Skills de repositório remoto
repomix --remote yamadashy/repomix --skill-generate

# Gerar Skills com opções específicas de formato de saída
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Apenas de Documentação

Usando `--include`, você pode gerar Skills contendo apenas a documentação de um repositório GitHub. Isso é útil quando você quer que o Claude referencie documentação específica de biblioteca ou framework enquanto trabalha em seu código:

```bash
# Documentação do Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Documentação do Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Documentação do React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Limitações

A opção `--skill-generate` não pode ser usada com:
- `--stdout` - A saída de Skills requer escrita no sistema de arquivos
- `--copy` - A saída de Skills é um diretório, não pode ser copiado para a área de transferência

## Usando Skills Gerados

Uma vez gerados, você pode usar os Skills com o Claude:

1. **Claude Code**: Os Skills estão automaticamente disponíveis se salvos em `~/.claude/skills/` ou `.claude/skills/`
2. **Claude Web**: Faça upload do diretório de Skills para o Claude para análise de base de código
3. **Compartilhamento de Equipe**: Faça commit de `.claude/skills/` no seu repositório para acesso de toda a equipe

## Exemplo de Workflow

### Criando uma Biblioteca de Referência Pessoal

```bash
# Clone e analise um projeto de código aberto interessante
repomix --remote facebook/react --skill-generate react-reference

# Os Skills são salvos em ~/.claude/skills/react-reference/
# Agora você pode referenciar a base de código do React em qualquer conversa com o Claude
```

### Documentação de Projeto de Equipe

```bash
# No seu diretório de projeto
cd my-project

# Gere Skills para sua equipe
repomix --skill-generate

# Escolha "Project Skills" quando solicitado
# Os Skills são salvos em .claude/skills/repomix-reference-my-project/

# Faça commit e compartilhe com sua equipe
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Recursos Relacionados

- [Plugins do Claude Code](/pt-br/guide/claude-code-plugins) - Aprenda sobre plugins do Repomix para Claude Code
- [Servidor MCP](/pt-br/guide/mcp-server) - Método de integração alternativo
- [Compressão de Código](/pt-br/guide/code-compress) - Reduzir contagem de tokens com compressão
- [Configuração](/pt-br/guide/configuration) - Personalizar comportamento do Repomix
