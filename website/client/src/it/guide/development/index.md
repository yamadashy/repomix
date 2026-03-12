# Contribuire a Repomix

Grazie per il tuo interesse in **Repomix**! 🚀 Apprezziamo il tuo aiuto per renderlo ancora migliore. Questa guida ti aiuterà a iniziare a contribuire al progetto.

## Come Contribuire

- **Mettere una stella al repository**: Mostra il tuo supporto [aggiungendo una stella al repository](https://github.com/yamadashy/repomix)!
- **Creare un ticket**: Hai trovato un bug? Hai un'idea per una nuova funzionalità? Faccelo sapere [creando un ticket](https://github.com/yamadashy/repomix/issues).
- **Inviare una Pull Request**: Hai trovato qualcosa da correggere o migliorare? Invia una PR!
- **Diffondere la voce**: Condividi la tua esperienza con Repomix sui social media, blog o con la tua community tech.
- **Usare Repomix**: I migliori feedback vengono dall'uso reale, quindi sentiti libero di integrare Repomix nei tuoi progetti!
- **Sponsorizzare**: Supporta lo sviluppo di Repomix [diventando uno sponsor](https://github.com/sponsors/yamadashy).

## Avvio Rapido

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## Comandi di Sviluppo

```bash
# Eseguire il CLI
npm run repomix
# Eseguire i test
npm run test
npm run test-coverage
# Lint del codice
npm run lint
```

## Stile del Codice

- Usare [Biome](https://biomejs.dev/) per linting e formattazione
- Dependency injection per la testabilità
- Mantenere i file sotto le 250 righe
- Aggiungere test per le nuove funzionalità

## Linee Guida per le Pull Request

1. Eseguire tutti i test
2. Passare i controlli di lint
3. Aggiornare la documentazione
4. Seguire lo stile del codice esistente

## Setup di Sviluppo

### Prerequisiti

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (opzionale, per eseguire il sito web o sviluppo containerizzato)

### Sviluppo Locale

Per configurare Repomix per lo sviluppo locale:

```bash
# Clonare il repository
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Installare le dipendenze
npm install

# Eseguire il CLI
npm run repomix
```

### Sviluppo con Docker

Puoi anche eseguire Repomix usando Docker:

```bash
# Costruire l'immagine
docker build -t repomix .

# Eseguire il container
docker run -v ./:/app -it --rm repomix
```

### Struttura del Progetto

Il progetto è organizzato nelle seguenti directory:

```text
src/
├── cli/          # Implementazione CLI
├── config/       # Gestione configurazione
├── core/         # Funzionalità principali
│   ├── file/     # Gestione file
│   ├── metrics/  # Calcolo metriche
│   ├── output/   # Generazione output
│   ├── security/ # Controlli di sicurezza
├── mcp/          # Integrazione server MCP
└── shared/       # Utility condivise
tests/            # Test che riflettono la struttura src/
website/          # Sito web documentazione
├── client/       # Frontend (VitePress)
└── server/       # Backend API
```

## Sviluppo del Sito Web

Il sito web Repomix è costruito con [VitePress](https://vitepress.dev/). Per eseguire il sito web localmente:

```bash
# Prerequisito: Docker deve essere installato sul tuo sistema

# Avviare il server di sviluppo del sito web
npm run website

# Accedere al sito web a http://localhost:5173/
```

Quando aggiorni la documentazione, devi aggiornare prima solo la versione inglese. I maintainer si occuperanno delle traduzioni nelle altre lingue.

## Processo di Release

Per i maintainer e i contributori interessati al processo di release:

1. Aggiornare la versione
```bash
npm version patch  # o minor/major
```

2. Eseguire test e build
```bash
npm run test-coverage
npm run build
```

3. Pubblicare
```bash
npm publish
```

Le nuove release sono gestite dal maintainer. Se pensi che sia necessaria una release, apri un ticket per discuterne.

## Hai Bisogno di Aiuto?

- [Apri un ticket](https://github.com/yamadashy/repomix/issues)
- [Unisciti a Discord](https://discord.gg/wNYzTwZFku)
