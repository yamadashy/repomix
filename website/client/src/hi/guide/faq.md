---
title: FAQ और समस्या निवारण
description: Repomix में private repositories, C# और Python support, MCP-compatible agents, output formats, token reduction, security checks और AI workflows के बारे में आम सवालों के जवाब।
---

# FAQ और समस्या निवारण

यह पेज सही Repomix workflow चुनने, बड़े output को कम करने और AI assistants के लिए codebase context तैयार करने में मदद करता है।

## आम सवाल

### Repomix किस काम आता है?

Repomix repository को एक AI-friendly file में pack करता है। आप ChatGPT, Claude, Gemini या दूसरे assistants को code review, bug investigation, refactoring, documentation और onboarding के लिए पूरा codebase context दे सकते हैं।

### क्या Repomix private repositories के साथ काम करता है?

हाँ। जिस checkout तक आपकी machine की access है, उसमें Repomix local रूप से चलाएँ:

```bash
repomix
```

Generated file को किसी external AI service से share करने से पहले ज़रूर review करें।

### क्या public GitHub repository को clone किए बिना process किया जा सकता है?

हाँ। `--remote` के साथ shorthand या full URL दें:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### कौन सा output format चुनना चाहिए?

अगर निश्चित न हों तो default XML से शुरू करें। Readable conversations के लिए Markdown, automation के लिए JSON और maximum compatibility के लिए plain text उपयोग करें।

```bash
repomix --style markdown
repomix --style json
```

देखें [Output Formats](/hi/guide/output)।

## Token usage कम करना

### Generated file बहुत बड़ी है। क्या करें?

Context को सीमित करें:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

बड़ी repositories में include/ignore patterns को code compression के साथ मिलाएँ।

### `--compress` क्या करता है?

`--compress` imports, exports, classes, functions और interfaces जैसी महत्वपूर्ण structure रखता है, लेकिन कई implementation details हटा देता है। यह architecture समझाने के लिए उपयोगी है।

## Security और privacy

### क्या CLI मेरा code upload करता है?

Repomix CLI local रूप से चलता है और output file आपकी machine पर लिखता है। Website और browser extension workflows अलग हैं; [Privacy Policy](/hi/guide/privacy) देखें।

### Repomix secrets को कैसे रोकता है?

Repomix Secretlint-based safety checks उपयोग करता है। इसे extra protection मानें और output हमेशा खुद review करें।

## समस्या निवारण

### Output में files क्यों missing हैं?

Repomix `.gitignore`, default ignore rules और custom patterns का पालन करता है। `repomix.config.json`, `--ignore` और git ignore rules जाँचें।

### Team के लिए repeatable output कैसे बनाएँ?

Shared configuration बनाएँ और commit करें:

```bash
repomix --init
```

## अतिरिक्त आम सवाल

### क्या Repomix C#, Python, Java, Go, Rust या अन्य languages के साथ काम करता है?

हाँ। Repomix आपके project की files पढ़ता है और उन्हें AI tools के लिए format करता है, इसलिए यह किसी भी programming language वाले repository को pack कर सकता है। CLI चलाने के लिए Node.js 20 या नया version चाहिए। कुछ advanced features, जैसे Tree-sitter based code compression, language parser support पर निर्भर करते हैं।

### क्या मैं Repomix को Hermes Agent, OpenClaw या अन्य MCP-compatible agents के साथ उपयोग कर सकता हूँ?

हाँ। Repomix MCP server के रूप में चल सकता है:

```bash
npx -y repomix --mcp
```

Hermes Agent के लिए, `~/.hermes/config.yaml` में Repomix को stdio MCP server के रूप में जोड़ें:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

OpenClaw या अन्य MCP-compatible agents में, जहाँ external stdio MCP server configure किया जाता है वहाँ यही command और args इस्तेमाल करें। अगर आपका assistant Agent Skills format support करता है, तो [Repomix Explorer Skill](/hi/guide/repomix-explorer-skill) भी उपयोग कर सकते हैं।

### AI assistant को नई library या framework समझाने के लिए Repomix कैसे उपयोग करें?

Library repository या उसके docs को pack करें और output को reference material के रूप में AI assistant को दें:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Repeated use के लिए reusable Agent Skills directory generate कर सकते हैं:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### CSS, tests, build output या noisy files कैसे exclude करें?

One-off commands के लिए `--ignore` इस्तेमाल करें:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

सिर्फ specific source या docs paths रखने के लिए `--include` इस्तेमाल करें:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### क्या repository size limit है?

CLI में fixed repository size limit नहीं है, लेकिन बहुत बड़े repositories memory, file size, या AI tool के upload और context limits से प्रभावित हो सकते हैं। बड़े projects में targeted include patterns से शुरुआत करें, token-heavy files देखें, और जरूरत हो तो output split करें:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### `--include` करने पर भी `node_modules`, build directories या ignored paths क्यों नहीं आते?

`--include` Repomix द्वारा pack की जाने वाली files को narrow करता है, लेकिन ignore rules फिर भी लागू होते हैं। Files `.gitignore`, `.ignore`, `.repomixignore`, built-in default patterns या `repomix.config.json` से exclude हो सकती हैं। Advanced cases में `--no-gitignore` या `--no-default-patterns` उपयोग कर सकते हैं, लेकिन सावधानी रखें क्योंकि इससे dependencies, build artifacts और अन्य noisy files शामिल हो सकती हैं।

## संबंधित संसाधन

- [बुनियादी उपयोग](/hi/guide/usage)
- [Command Line Options](/hi/guide/command-line-options)
- [Code Compression](/hi/guide/code-compress)
- [Security](/hi/guide/security)
