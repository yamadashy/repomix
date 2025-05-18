# Uso Básico

## Início Rápido

Compacte todo o seu repositório:
```bash
repomix
```

## Casos de Uso Comuns

### Compactar Diretórios Específicos
Processe apenas diretórios ou arquivos específicos para focar no código relevante e reduzir a contagem de tokens:
```bash
repomix path/to/directory
```

### Incluir Arquivos Específicos
Use [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) para controlar precisamente quais arquivos são incluídos:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Excluir Arquivos
Pule certos arquivos ou diretórios usando padrões glob para evitar incluir conteúdo desnecessário ou sensível:
```bash
repomix --ignore "**/*.log,tmp/"
```

### Repositórios Remotos
```bash
# Usando URL do GitHub
repomix --remote https://github.com/user/repo

# Usando abreviação
repomix --remote user/repo

# Branch/tag/commit específico
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Compressão de Código

Use Tree-sitter para extrair inteligentemente estruturas essenciais de código enquanto remove detalhes de implementação, reduzindo significativamente a contagem de tokens enquanto preserva a arquitetura:

```bash
repomix --compress

# Você também pode usá-lo com repositórios remotos:
repomix --remote yamadashy/repomix --compress
```

## Formatos de Saída

### XML (Padrão)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### Texto Simples
```bash
repomix --style plain
```

## Opções Adicionais

### Remover Comentários
```bash
repomix --remove-comments
```

### Mostrar Números de Linha
```bash
repomix --output-show-line-numbers
```

### Copiar para a Área de Transferência
```bash
repomix --copy
```

### Desativar Verificação de Segurança
```bash
repomix --no-security-check
```

## Configuração

Inicializar arquivo de configuração:
```bash
repomix --init
```

Veja o [Guia de Configuração](/pt-br/guide/configuration) para opções detalhadas.
