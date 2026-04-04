# Instruções Personalizadas

O Repomix permite que você forneça instruções personalizadas que serão incluídas no arquivo de saída. Isso pode ser útil para adicionar contexto ou diretrizes específicas para sistemas de IA que processam o repositório.

## Uso

Para incluir uma instrução personalizada, crie um arquivo markdown (por exemplo, `repomix-instruction.md`) na raiz do seu repositório. Em seguida, especifique o caminho para este arquivo no seu `repomix.config.json`:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

O conteúdo deste arquivo será incluído na saída sob a seção "Instruction".

## Exemplo

```markdown
# Instruções do Repositório

Este repositório contém o código-fonte da ferramenta Repomix. Por favor, siga estas diretrizes ao analisar o código:

1. Concentre-se na funcionalidade principal no diretório `src/core`.
2. Preste atenção especial às verificações de segurança em `src/core/security`.
3. Ignore quaisquer arquivos no diretório `tests`.
```

Isso resultará na seguinte seção na saída:

```xml
<instruction>
# Instruções do Repositório

Este repositório contém o código-fonte da ferramenta Repomix. Por favor, siga estas diretrizes ao analisar o código:

1. Concentre-se na funcionalidade principal no diretório `src/core`.
2. Preste atenção especial às verificações de segurança em `src/core/security`.
3. Ignore quaisquer arquivos no diretório `tests`.
</instruction>
```

## Recursos relacionados

- [Configuração](/pt-br/guide/configuration) - Definir `output.instructionFilePath` no arquivo de configuração
- [Formatos de Saída](/pt-br/guide/output) - Conhecer os diferentes formatos de saída
- [Exemplos de Prompts](/pt-br/guide/prompt-examples) - Exemplos de prompts para análise de IA
- [Casos de Uso](/pt-br/guide/use-cases) - Exemplos reais do uso do Repomix com IA
