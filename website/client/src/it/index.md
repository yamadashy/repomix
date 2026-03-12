---
layout: home
title: Repomix
titleTemplate: Impacchetta il tuo codice in formati adatti all'IA
aside: false
editLink: false

features:
  - icon: 🤖
    title: Ottimizzato per l'IA
    details: Formatta la tua codebase in un modo facilmente comprensibile e processabile dall'IA.
  - icon: ⚙️
    title: Compatibile con Git
    details: Rispetta automaticamente i tuoi file .gitignore.
  - icon: 🛡️
    title: Focalizzato sulla Sicurezza
    details: Integra Secretlint per controlli di sicurezza robusti per rilevare e prevenire l'inclusione di informazioni sensibili.
  - icon: 📊
    title: Conteggio Token
    details: Fornisce il conteggio dei token per ogni file e per l'intero repository, utile per i limiti di contesto degli LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Nomination agli Open Source Awards

Siamo onorati! Repomix è stato nominato nella categoria **Powered by AI** ai [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Questo non sarebbe stato possibile senza tutti voi che usate e supportate Repomix. Grazie!

## Cos'è Repomix?

Repomix è uno strumento potente che impacchetta l'intera tua codebase in un singolo file compatibile con l'IA. Che tu stia lavorando a revisioni del codice, refactoring o abbia bisogno di assistenza IA per il tuo progetto, Repomix rende facile condividere tutto il contesto del tuo repository con gli strumenti IA.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Avvio Rapido

Una volta generato un file compresso (`repomix-output.xml`) con Repomix, puoi inviarlo a un assistente IA (come ChatGPT, Claude) con un'istruzione come:

```
Questo file contiene tutti i file del repository combinati in uno solo.
Vorrei fare refactoring del codice, quindi per favore esaminalo prima.
```

L'IA analizzerà la tua intera codebase e fornirà informazioni dettagliate:

![Utilizzo di Repomix 1](/images/docs/repomix-file-usage-1.png)

Quando discuti modifiche specifiche, l'IA può aiutarti a generare codice. Con funzionalità come gli Artefatti di Claude, puoi anche ricevere più file interdipendenti:

![Utilizzo di Repomix 2](/images/docs/repomix-file-usage-2.png)

Buona programmazione! 🚀

## Perché Repomix?

La forza di Repomix risiede nella sua capacità di funzionare con servizi in abbonamento come ChatGPT, Claude, Gemini, Grok senza preoccuparsi dei costi, fornendo al contempo un contesto completo della codebase che elimina la necessità di esplorare i file, rendendo l'analisi più veloce e spesso più precisa.

Con l'intera codebase disponibile come contesto, Repomix permette un'ampia gamma di applicazioni tra cui pianificazione dell'implementazione, investigazione di bug, verifiche di sicurezza di librerie di terze parti, generazione di documentazione e molto altro.

## Utilizzo dello Strumento CLI {#using-the-cli-tool}

Repomix può essere usato come strumento a linea di comando, offrendo potenti funzionalità e opzioni di personalizzazione.

**Lo strumento CLI può accedere ai repository privati** poiché utilizza il Git installato localmente.

### Avvio Rapido

Puoi provare Repomix istantaneamente nella directory del tuo progetto senza installazione:

```bash
npx repomix@latest
```

Oppure installalo globalmente per un uso ripetuto:

```bash
# Installazione con npm
npm install -g repomix

# O con yarn
yarn global add repomix

# O con bun
bun add -g repomix

# O con Homebrew (macOS/Linux)
brew install repomix

# Poi eseguilo in qualsiasi directory di progetto
repomix
```

Tutto qui! Repomix genererà un file `repomix-output.xml` nella tua directory corrente, contenente l'intero repository in un formato adatto all'IA.

### Utilizzo

Per impacchettare l'intero repository:

```bash
repomix
```

Per impacchettare una directory specifica:

```bash
repomix path/to/directory
```

Per impacchettare file o directory specifici usando [pattern glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Per escludere file o directory specifici:

```bash
repomix --ignore "**/*.log,tmp/"
```

Per impacchettare un repository remoto:
```bash
# Usando il formato abbreviato
npx repomix --remote yamadashy/repomix

# Usando l'URL completo (supporta branch e percorsi specifici)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Usando l'URL di un commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Per inizializzare un nuovo file di configurazione (`repomix.config.json`):

```bash
repomix --init
```

Una volta generato il file compresso, puoi usarlo con strumenti di IA generativa come Claude, ChatGPT e Gemini.

#### Utilizzo con Docker

Puoi anche eseguire Repomix con Docker 🐳
È utile se vuoi eseguire Repomix in un ambiente isolato o preferisci usare i container.

Utilizzo base (directory corrente):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Per impacchettare una directory specifica:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Elaborare un repository remoto e salvare in una directory `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Formati di Output

Scegli il tuo formato di output preferito:

```bash
# Formato XML (predefinito)
repomix --style xml

# Formato Markdown
repomix --style markdown

# Formato JSON
repomix --style json

# Formato testo semplice
repomix --style plain
```

### Personalizzazione

Crea un `repomix.config.json` per impostazioni persistenti:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Casi d'Uso Reali

### [Workflow di Generazione Codice con LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Uno sviluppatore condivide come usa Repomix per estrarre il contesto del codice da codebase esistenti, poi sfrutta questo contesto con LLM come Claude e Aider per miglioramenti incrementali, revisioni del codice e generazione automatizzata di documentazione.

### [Creazione di Pacchetti di Conoscenza per gli LLM](https://lethain.com/competitive-advantage-author-llms/)

Gli autori usano Repomix per impacchettare i loro contenuti scritti—blog, documentazione e libri—in formati compatibili con gli LLM, permettendo ai lettori di interagire con la loro esperienza tramite sistemi di domanda e risposta alimentati dall'IA.

[Scopri altri casi d'uso →](./guide/use-cases)

## Guida per Utenti Avanzati

Repomix offre funzionalità potenti per casi d'uso avanzati. Ecco alcune guide essenziali per utenti avanzati:

- **[Server MCP](./guide/mcp-server)** - Integrazione del Model Context Protocol per assistenti IA
- **[GitHub Actions](./guide/github-actions)** - Automatizza l'impacchettamento delle codebase nei workflow CI/CD
- **[Compressione Codice](./guide/code-compress)** - Compressione intelligente basata su Tree-sitter (~70% di riduzione token)
- **[Usare come Libreria](./guide/development/using-repomix-as-a-library)** - Integra Repomix nelle tue applicazioni Node.js
- **[Istruzioni Personalizzate](./guide/custom-instructions)** - Aggiungi prompt e istruzioni personalizzate agli output
- **[Funzionalità di Sicurezza](./guide/security)** - Integrazione Secretlint incorporata e controlli di sicurezza
- **[Best Practice](./guide/tips/best-practices)** - Ottimizza i tuoi workflow IA con strategie comprovate

### Altri Esempi
::: tip Hai bisogno di più aiuto? 💡
Consulta la nostra [guida](./guide/) per istruzioni dettagliate, o visita il nostro [repository GitHub](https://github.com/yamadashy/repomix) per più esempi e codice sorgente.
:::

</div>
