# Iniziare con Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix è uno strumento che raggruppa l'intero repository di codice in un singolo file adatto all'IA. È progettato per aiutarti a fornire la tua codebase ai Grandi Modelli Linguistici (LLM) come ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama e molti altri.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Avvio Rapido

Esegui questo comando nella directory del tuo progetto:

```bash
npx repomix@latest
```

Tutto qui! Troverai un file `repomix-output.xml` contenente l'intero repository in un formato adatto all'IA.

Puoi poi inviare questo file a un assistente IA con un'istruzione come:

```
Questo file contiene tutti i file del repository combinati in uno solo.
Vorrei fare refactoring del codice, quindi per favore esaminalo prima.
```

L'IA analizzerà la tua intera codebase e fornirà informazioni dettagliate:

![Utilizzo del file Repomix 1](/images/docs/repomix-file-usage-1.png)

Quando discuti modifiche specifiche, l'IA può aiutarti a generare codice. Con funzionalità come gli Artefatti di Claude, puoi anche ricevere più file interdipendenti:

![Utilizzo del file Repomix 2](/images/docs/repomix-file-usage-2.png)

Buona programmazione! 🚀

## Perché Repomix?

La forza di Repomix risiede nella sua capacità di funzionare con servizi in abbonamento come ChatGPT, Claude, Gemini, Grok senza preoccuparsi dei costi, fornendo al contempo un contesto completo della codebase che elimina la necessità di esplorare i file, rendendo l'analisi più veloce e spesso più precisa.

Con l'intera codebase disponibile come contesto, Repomix permette un'ampia gamma di applicazioni tra cui pianificazione dell'implementazione, investigazione di bug, verifiche di sicurezza di librerie di terze parti, generazione di documentazione e molto altro.

## Funzionalità Principali

- **Output ottimizzato per l'IA**: Formatta la tua codebase per un facile elaborazione da parte dell'IA
- **Conteggio token**: Traccia l'utilizzo dei token per i limiti di contesto degli LLM
- **Compatibile con Git**: Rispetta i tuoi file `.gitignore` e `.git/info/exclude`
- **Focalizzato sulla sicurezza**: Rileva le informazioni sensibili
- **Multipli formati di output**: Scegli tra testo semplice, XML o Markdown

## Prossimi Passi

- [Guida all'Installazione](installation.md): Diversi modi per installare Repomix
- [Guida all'Utilizzo](usage.md): Scopri le funzionalità base e avanzate
- [Configurazione](configuration.md): Personalizza Repomix secondo le tue esigenze
- [Funzionalità di Sicurezza](security.md): Scopri i controlli di sicurezza

## Community

Unisciti alla nostra [community Discord](https://discord.gg/wNYzTwZFku) per:
- Ottenere aiuto con Repomix
- Condividere le tue esperienze
- Suggerire nuove funzionalità
- Connetterti con altri utenti

## Supporto

Hai trovato un bug o hai bisogno di aiuto?
- [Apri un ticket su GitHub](https://github.com/yamadashy/repomix/issues)
- Unisciti al nostro server Discord
- Consulta la [documentazione](https://repomix.com)
