# Plugins de Claude Code

Repomix proporciona plugins oficiales para [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) que se integran perfectamente con el entorno de desarrollo impulsado por IA. Estos plugins facilitan el analisis y empaquetado de bases de codigo directamente dentro de Claude Code utilizando comandos en lenguaje natural.

## Instalacion

### 1. Agregar el Marketplace de Plugins de Repomix

Primero, agregue el marketplace de plugins de Repomix a Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Instalar Plugins

Instale los plugins usando los siguientes comandos:

```text
# Instalar plugin del servidor MCP (base recomendada)
/plugin install repomix-mcp@repomix

# Instalar plugin de comandos (extiende la funcionalidad)
/plugin install repomix-commands@repomix

# Instalar plugin explorador de repositorios (analisis impulsado por IA)
/plugin install repomix-explorer@repomix
```

::: tip Relacion entre Plugins
El plugin `repomix-mcp` se recomienda como base. El plugin `repomix-commands` proporciona comandos slash convenientes, mientras que `repomix-explorer` agrega capacidades de analisis impulsadas por IA. Aunque puede instalarlos independientemente, usar los tres proporciona la experiencia mas completa.
:::

### Alternativa: Instalacion Interactiva

Tambien puede usar el instalador de plugins interactivo:

```text
/plugin
```

Esto abrira una interfaz interactiva donde puede explorar e instalar plugins disponibles.

## Plugins Disponibles

### 1. repomix-mcp (Plugin del Servidor MCP)

Plugin fundamental que proporciona analisis de codigo impulsado por IA a traves de la integracion del servidor MCP.

**Caracteristicas:**
- Empaquetar repositorios locales y remotos
- Buscar salidas empaquetadas
- Leer archivos con escaneo de seguridad integrado ([Secretlint](https://github.com/secretlint/secretlint))
- Compresion automatica Tree-sitter (reduccion de aproximadamente 70% de tokens)

### 2. repomix-commands (Plugin de Comandos Slash)

Proporciona comandos slash convenientes con soporte de lenguaje natural.

**Comandos Disponibles:**
- `/repomix-commands:pack-local` - Empaquetar base de codigo local con varias opciones
- `/repomix-commands:pack-remote` - Empaquetar y analizar repositorios remotos de GitHub

### 3. repomix-explorer (Plugin de Agente de Analisis de IA)

Agente de analisis de repositorios impulsado por IA que explora bases de codigo de manera inteligente utilizando Repomix CLI.

**Caracteristicas:**
- Exploracion y analisis de bases de codigo en lenguaje natural
- Descubrimiento inteligente de patrones y comprension de la estructura del codigo
- Analisis incremental usando grep y lectura de archivos especificos
- Gestion automatica de contexto para repositorios grandes

**Comandos Disponibles:**
- `/repomix-explorer:explore-local` - Analizar base de codigo local con asistencia de IA
- `/repomix-explorer:explore-remote` - Analizar repositorios remotos de GitHub con asistencia de IA

**Como funciona:**
1. Ejecuta `npx repomix@latest` para empaquetar el repositorio
2. Usa herramientas Grep y Read para buscar eficientemente la salida
3. Proporciona analisis integral sin consumir contexto excesivo

## Ejemplos de Uso

### Empaquetando una Base de Codigo Local

Use el comando `/repomix-commands:pack-local` con instrucciones en lenguaje natural:

```text
/repomix-commands:pack-local
Empaquetar este proyecto en formato Markdown con compresion
```

Otros ejemplos:
- "Empaquetar solo el directorio src"
- "Empaquetar archivos TypeScript con numeros de linea"
- "Generar salida en formato JSON"

### Empaquetando un Repositorio Remoto

Use el comando `/repomix-commands:pack-remote` para analizar repositorios de GitHub:

```text
/repomix-commands:pack-remote yamadashy/repomix
Empaquetar solo archivos TypeScript del repositorio yamadashy/repomix
```

Otros ejemplos:
- "Empaquetar la rama main con compresion"
- "Incluir solo archivos de documentacion"
- "Empaquetar directorios especificos"

### Explorar Base de Codigo Local con IA

Use el comando `/repomix-explorer:explore-local` para analisis impulsado por IA:

```text
/repomix-explorer:explore-local ./src
Encontrar todo el codigo relacionado con autenticacion
```

Otros ejemplos:
- "Analizar la estructura de este proyecto"
- "Mostrarme los componentes principales"
- "Encontrar todos los endpoints de API"

### Explorar Repositorio Remoto con IA

Use el comando `/repomix-explorer:explore-remote` para analizar repositorios de GitHub:

```text
/repomix-explorer:explore-remote facebook/react
Mostrarme la arquitectura de componentes principal
```

Otros ejemplos:
- "Encontrar todos los hooks de React en el repositorio"
- "Explicar la estructura del proyecto"
- "Donde se definen los limites de error?"

## Recursos Relacionados

- [Documentacion del Servidor MCP](/guide/mcp-server) - Aprenda sobre el servidor MCP subyacente
- [Configuracion](/guide/configuration) - Personalice el comportamiento de Repomix
- [Seguridad](/guide/security) - Comprenda las caracteristicas de seguridad
- [Opciones de Linea de Comandos](/guide/command-line-options) - Opciones CLI disponibles

## Codigo Fuente de los Plugins

El codigo fuente de los plugins esta disponible en el repositorio de Repomix:

- [Marketplace de Plugins](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [Plugin MCP](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Plugin de Comandos](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Plugin Explorador de Repositorios](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Comentarios y Soporte

Si encuentra problemas o tiene sugerencias para los plugins de Claude Code:

- [Abrir un issue en GitHub](https://github.com/yamadashy/repomix/issues)
- [Unase a nuestra comunidad de Discord](https://discord.gg/wNYzTwZFku)
- [Ver discusiones existentes](https://github.com/yamadashy/repomix/discussions)
