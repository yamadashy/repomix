---
title: GitHub Actions
description: AI analysis, CI workflows, artifacts, code review और compressed output के लिए GitHub Actions में Repomix automate करें।
---

# GitHub Actions

Repomix को GitHub Actions के साथ एकीकृत किया जा सकता है ताकि रिपॉजिटरी को स्वचालित रूप से प्रोसेस किया जा सके और AI-फ्रेंडली आउटपुट जनरेट किया जा सके। यह आपको CI/CD पाइपलाइन के हिस्से के रूप में Repomix का उपयोग करने की अनुमति देता है।

## बुनियादी उपयोग

यहां GitHub Actions में Repomix का उपयोग करने के लिए एक बुनियादी वर्कफ़्लो कॉन्फिगरेशन है:

```yaml
name: Repomix

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  repomix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run Repomix
        run: npx repomix --output-file repomix-output.xml
      
      - name: Upload Repomix Output
        uses: actions/upload-artifact@v3
        with:
          name: repomix-output
          path: repomix-output.xml
```

यह वर्कफ़्लो मुख्य ब्रांच पर हर पुश या पुल रिक्वेस्ट पर चलता है, रिपॉजिटरी को प्रोसेस करता है और `repomix-output.xml` फाइल जनरेट करता है, फिर इसे आर्टिफैक्ट के रूप में अपलोड करता है।

## उन्नत कॉन्फिगरेशन

अधिक उन्नत कॉन्फिगरेशन के लिए, आप निम्न विकल्पों को जोड़ सकते हैं:

```yaml
name: Repomix Advanced

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 1'  # हर सोमवार को चलाएं
  
jobs:
  repomix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run Repomix
        run: |
          npx repomix \
            --style markdown \
            --output-file repomix-output.md \
            --include "src/**/*.ts,docs/**/*.md" \
            --ignore "**/*.test.ts,**/node_modules/**" \
            --remove-comments \
            --compress
      
      - name: Upload Repomix Output
        uses: actions/upload-artifact@v3
        with:
          name: repomix-output
          path: repomix-output.md
      
      - name: Create GitHub Release
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: softprops/action-gh-release@v1
        with:
          files: repomix-output.md
          name: Repomix Output ${{ github.sha }}
          tag_name: repomix-${{ github.sha }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

इस उन्नत कॉन्फिगरेशन में, हम निम्न कार्य कर रहे हैं:

1. शेड्यूल्ड रन जोड़ना (हर सोमवार)
2. अधिक Repomix विकल्पों का उपयोग करना
3. मुख्य ब्रांच पर पुश होने पर GitHub रिलीज बनाना

## एनवायरनमेंट वेरिएबल्स और सीक्रेट्स

संवेदनशील जानकारी के साथ काम करते समय, आप GitHub सीक्रेट्स का उपयोग कर सकते हैं:

```yaml
- name: Run Repomix with Auth
  run: npx repomix --remote user/private-repo
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## मैट्रिक्स बिल्ड

कई कॉन्फिगरेशन के साथ Repomix चलाने के लिए, आप मैट्रिक्स बिल्ड का उपयोग कर सकते हैं:

```yaml
jobs:
  repomix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        output-style: [xml, markdown, json, plain]
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Run Repomix
        run: npx repomix --style ${{ matrix.output-style }} --output-file repomix-output.${{ matrix.output-style }}
      
      - name: Upload Repomix Output
        uses: actions/upload-artifact@v3
        with:
          name: repomix-output-${{ matrix.output-style }}-node${{ matrix.node-version }}
          path: repomix-output.${{ matrix.output-style }}
```

## पुल रिक्वेस्ट कमेंट्स

आप Repomix आउटपुट को पुल रिक्वेस्ट पर कमेंट के रूप में भी जोड़ सकते हैं:

```yaml
- name: Run Repomix
  run: npx repomix --style markdown --output-file repomix-output.md

- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v6
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const fs = require('fs');
      const output = fs.readFileSync('repomix-output.md', 'utf8');
      const summary = output.split('\n').slice(0, 20).join('\n') + '\n\n[Full output attached as artifact]';
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: summary
      });
```

## अगला क्या है?

- [कमांड लाइन विकल्पों](command-line-options.md) के बारे में अधिक जानें
- [कॉन्फिगरेशन विकल्पों](configuration.md) का अन्वेषण करें
- [रिमोट रिपॉजिटरी प्रोसेसिंग](remote-repository-processing.md) के बारे में जानें
