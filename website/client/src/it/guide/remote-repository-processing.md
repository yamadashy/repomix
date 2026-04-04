# Elaborazione Repository Remoti

## Utilizzo Base

Elabora repository pubblici:
```bash
# Usando l'URL completo
repomix --remote https://github.com/user/repo
# Usando il formato abbreviato GitHub
repomix --remote user/repo
```

## Selezione Branch e Commit

```bash
# Branch specifico
repomix --remote user/repo --remote-branch main
# Tag
repomix --remote user/repo --remote-branch v1.0.0
# Hash del commit
repomix --remote user/repo --remote-branch 935b695
```

## Prerequisiti

- Git deve essere installato
- Connessione Internet
- Accesso in lettura al repository

## Controllo dell'Output

```bash
# Posizione di output personalizzata
repomix --remote user/repo -o custom-output.xml
# Con formato XML
repomix --remote user/repo --style xml
# Rimuovere i commenti
repomix --remote user/repo --remove-comments
```

## Utilizzo con Docker

```bash
# Elabora e salva nella directory corrente
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
# Output verso una directory specifica
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Sicurezza

Per motivi di sicurezza, i file di configurazione (`repomix.config.*`) presenti nei repository remoti non vengono caricati per impostazione predefinita. Questo impedisce ai repository non attendibili di eseguire codice tramite file di configurazione come `repomix.config.ts`.

La configurazione globale e le opzioni CLI continuano a essere applicate normalmente.

Per considerare attendibile la configurazione di un repository remoto:

```bash
# Usando il flag CLI
repomix --remote user/repo --remote-trust-config

# Usando la variabile d'ambiente
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Quando si usa `--config` con `--remote`, è richiesto un percorso assoluto:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Problemi Comuni

### Problemi di Accesso
- Assicurati che il repository sia pubblico
- Verifica l'installazione di Git
- Controlla la connessione Internet

### Repository Grandi
- Usa `--include` per selezionare percorsi specifici
- Abilita `--remove-comments`
- Elabora i branch separatamente

## Risorse correlate

- [Opzioni da Linea di Comando](/it/guide/command-line-options) - Riferimento completo della CLI incluse le opzioni `--remote`
- [Configurazione](/it/guide/configuration) - Configurare le opzioni predefinite per l'elaborazione remota
- [Compressione Codice](/it/guide/code-compress) - Ridurre la dimensione dell'output per grandi repository
- [Sicurezza](/it/guide/security) - Come Repomix gestisce il rilevamento di dati sensibili
