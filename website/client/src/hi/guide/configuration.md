# कॉन्फिगरेशन

Repomix को कॉन्फिगरेशन फ़ाइल (`repomix.config.json`) या कमांड-लाइन विकल्पों का उपयोग करके कॉन्फिगर किया जा सकता है। कॉन्फिगरेशन फ़ाइल आपको अपने कोडबेस के प्रसंस्करण और आउटपुट के विभिन्न पहलुओं को अनुकूलित करने की अनुमति देती है।

## तुरंत शुरुआत

अपनी प्रोजेक्ट डायरेक्टरी में एक कॉन्फिगरेशन फ़ाइल बनाएं:
```bash
repomix --init
```

यह डिफ़ॉल्ट सेटिंग्स के साथ एक `repomix.config.json` फ़ाइल बनाएगा। आप एक ग्लोबल कॉन्फिगरेशन फ़ाइल भी बना सकते हैं जो स्थानीय कॉन्फिगरेशन नहीं मिलने पर फ़ॉलबैक के रूप में उपयोग होगी:

```bash
repomix --init --global
```

## कॉन्फिगरेशन विकल्प

| विकल्प                           | विवरण                                                                                                                        | डिफ़ॉल्ट               |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | प्रोसेस करने के लिए अधिकतम फ़ाइल आकार बाइट्स में। इससे बड़ी फ़ाइलें छोड़ दी जाएंगी। बड़ी बाइनरी फ़ाइलों या डेटा फ़ाइलों को बाहर करने के लिए उपयोगी | `50000000`            |
| `output.filePath`                | आउटपुट फ़ाइल का नाम। XML, Markdown, और सादे टेक्स्ट फ़ॉर्मेट का समर्थन करता है                                                | `"repomix-output.xml"` |
| `output.style`                   | आउटपुट स्टाइल (`xml`, `markdown`, `plain`)। प्रत्येक फ़ॉर्मेट के विभिन्न AI टूल्स के लिए अपने फायदे हैं                      | `"xml"`                |
| `output.parsableStyle`           | चुनी गई स्टाइल स्कीमा के अनुसार आउटपुट को एस्केप करना है या नहीं। बेहतर पार्सिंग सक्षम करता है लेकिन टोकन संख्या बढ़ा सकता है | `false`                |
| `output.compress`                | संरचना को संरक्षित करते हुए टोकन संख्या कम करने के लिए Tree-sitter का उपयोग करके बुद्धिमान कोड निष्कर्षण करना है या नहीं     | `false`                |
| `output.headerText`              | फ़ाइल हेडर में शामिल करने के लिए कस्टम टेक्स्ट। AI टूल्स के लिए संदर्भ या निर्देश प्रदान करने के लिए उपयोगी                  | `null`                 |
| `output.instructionFilePath`     | AI प्रसंस्करण के लिए विस्तृत कस्टम निर्देशों वाली फ़ाइल का पथ                                                              | `null`                 |
| `output.fileSummary`             | शुरुआत में फ़ाइल संख्या, आकार और अन्य मेट्रिक्स दिखाने वाला सारांश सेक्शन शामिल करना है या नहीं                           | `true`                 |
| `output.directoryStructure`      | आउटपुट में डायरेक्टरी संरचना शामिल करनी है या नहीं। AI को प्रोजेक्ट संगठन समझने में मदद करता है                          | `true`                 |
| `output.files`                   | आउटपुट में फ़ाइल सामग्री शामिल करनी है या नहीं। केवल संरचना और मेटाडेटा शामिल करने के लिए false सेट करें                  | `true`                 |
| `output.removeComments`          | समर्थित फ़ाइल प्रकारों से टिप्पणियां हटानी हैं या नहीं। शोर और टोकन संख्या कम कर सकता है                                  | `false`                |
| `output.removeEmptyLines`        | टोकन संख्या कम करने के लिए आउटपुट से खाली लाइनें हटानी हैं या नहीं                                                        | `false`                |
| `output.showLineNumbers`         | प्रत्येक लाइन में लाइन नंबर जोड़ना है या नहीं। कोड के विशिष्ट भागों को संदर्भित करने के लिए सहायक                           | `false`                |
| `output.truncateBase64`          | टोकन संख्या कम करने के लिए लंबी base64 डेटा स्ट्रिंग्स (जैसे, छवियां) को छोटा करना है या नहीं                            | `false`                |
| `output.copyToClipboard`         | फ़ाइल सेव करने के अतिरिक्त आउटपुट को सिस्टम क्लिपबोर्ड पर कॉपी करना है या नहीं                                           | `false`                |
| `output.topFilesLength`          | सारांश में दिखाने के लिए शीर्ष फ़ाइलों की संख्या। 0 पर सेट करने से कोई सारांश प्रदर्शित नहीं होगा                           | `5`                    |
| `output.includeEmptyDirectories` | रिपॉजिटरी संरचना में खाली डायरेक्टरियां शामिल करनी हैं या नहीं                                                            | `false`                |
| `output.git.sortByChanges`       | Git परिवर्तन संख्या के अनुसार फ़ाइलों को सॉर्ट करना है या नहीं। अधिक परिवर्तन वाली फ़ाइलें नीचे दिखाई देती हैं                | `true`                 |
| `output.git.sortByChangesMaxCommits` | Git परिवर्तनों का विश्लेषण करने के लिए अधिकतम कमिट संख्या। प्रदर्शन के लिए इतिहास गहराई को सीमित करता है             | `100`                  |
| `output.git.includeDiffs`        | आउटपुट में Git अंतर शामिल करना है या नहीं। वर्क ट्री और स्टेज्ड परिवर्तनों को अलग-अलग दिखाता है                         | `false`                |
| `output.git.includeLogs`         | आउटपुट में Git logs शामिल करना है या नहीं। कमिट तारीखों, संदेशों और फ़ाइल पथों को दिखाता है                               | `false`                |
| `output.git.includeLogsCount`    | आउटपुट में शामिल करने के लिए git log कमिट की संख्या                                                                     | `50`                   |
| `include`                        | शामिल करने के लिए फ़ाइल पैटर्न [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) का उपयोग करके | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | प्रोजेक्ट की `.gitignore` फ़ाइल के पैटर्न का उपयोग करना है या नहीं                                                         | `true`                 |
| `ignore.useDefaultPatterns`      | डिफ़ॉल्ट ignore पैटर्न (node_modules, .git, आदि) का उपयोग करना है या नहीं                                               | `true`                 |
| `ignore.customPatterns`          | अतिरिक्त ignore पैटर्न [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) का उपयोग करके | `[]`                   |
| `security.enableSecurityCheck`   | संवेदनशील जानकारी का पता लगाने के लिए Secretlint का उपयोग करके सुरक्षा जांच करनी है या नहीं                               | `true`                 |
| `tokenCount.encoding`            | OpenAI के [tiktoken](https://github.com/openai/tiktoken) टोकनाइज़र द्वारा उपयोग की जाने वाली टोकन काउंट एन्कोडिंग। GPT-4o के लिए `o200k_base`, GPT-4/3.5 के लिए `cl100k_base` का उपयोग करें। विवरण के लिए [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) देखें | `"o200k_base"`         |

कॉन्फिगरेशन फ़ाइल [JSON5](https://json5.org/) सिंटैक्स का समर्थन करती है, जो निम्नलिखित की अनुमति देता है:
- टिप्पणियां (एकल-लाइन और मल्टी-लाइन दोनों)
- ऑब्जेक्ट्स और एरे में trailing commas
- बिना quotes के प्रॉपर्टी नाम
- अधिक लचीला स्ट्रिंग सिंटैक्स

## स्कीमा सत्यापन

आप `$schema` प्रॉपर्टी जोड़कर अपनी कॉन्फिगरेशन फ़ाइल के लिए स्कीमा सत्यापन सक्षम कर सकते हैं:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

यह JSON स्कीमा समर्थित एडिटर्स में auto-completion और validation प्रदान करता है।

## उदाहरण कॉन्फिगरेशन फ़ाइल

यहां एक पूर्ण कॉन्फिगरेशन फ़ाइल (`repomix.config.json`) का उदाहरण है:

```json5
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "पैकेज्ड फ़ाइल के लिए कस्टम हेडर जानकारी।",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignoreContent": ["components/**", "!components/slider/**"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // पैटर्न .repomixignore में भी निर्दिष्ट किए जा सकते हैं
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## कॉन्फिगरेशन फ़ाइल स्थान

Repomix निम्नलिखित क्रम में कॉन्फिगरेशन फ़ाइलों की तलाश करता है:
1. वर्तमान डायरेक्टरी में स्थानीय कॉन्फिगरेशन फ़ाइल (`repomix.config.json`)
2. ग्लोबल कॉन्फिगरेशन फ़ाइल:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

कमांड-लाइन विकल्प कॉन्फिगरेशन फ़ाइल सेटिंग्स से प्राथमिकता रखते हैं।

## Ignore पैटर्न

Repomix कई तरीके प्रदान करता है जिससे आप निर्दिष्ट कर सकते हैं कि कौन सी फ़ाइलों को ignore करना है। पैटर्न निम्नलिखित प्राथमिकता क्रम में प्रोसेस किए जाते हैं:

1. CLI विकल्प (`--ignore`)
2. प्रोजेक्ट डायरेक्टरी में `.repomixignore` फ़ाइल
3. `.gitignore` और `.git/info/exclude` (यदि `ignore.useGitignore` true है)
4. डिफ़ॉल्ट पैटर्न (यदि `ignore.useDefaultPatterns` true है)

`.repomixignore` का उदाहरण:
```text
# कैश डायरेक्टरीज़
.cache/
tmp/

# बिल्ड आउटपुट
dist/
build/

# लॉग्स
*.log
```

## डिफ़ॉल्ट Ignore पैटर्न

जब `ignore.useDefaultPatterns` true है, तो Repomix स्वचालित रूप से सामान्य पैटर्न को ignore करता है:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

पूरी सूची के लिए [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) देखें

## उन्नत सुविधाएं

### कोड कम्प्रेशन

कोड कम्प्रेशन सुविधा, `output.compress: true` के साथ सक्षम, [Tree-sitter](https://github.com/tree-sitter/tree-sitter) का उपयोग करके आवश्यक कोड संरचनाओं को बुद्धिमानी से निकालती है जबकि implementation details को हटाती है। यह महत्वपूर्ण संरचनात्मक जानकारी बनाए रखते हुए टोकन संख्या कम करने में मदद करता है।

मुख्य लाभ:
- टोकन संख्या में महत्वपूर्ण कमी
- क्लास और फ़ंक्शन signatures को संरक्षित करता है
- imports और exports को बनाए रखता है
- type definitions और interfaces को संरक्षित करता है
- फ़ंक्शन bodies और implementation details को हटाता है

अधिक विवरण और उदाहरणों के लिए, [कोड कम्प्रेशन गाइड](code-compress) देखें।

### Git एकीकरण

`output.git` कॉन्फिगरेशन शक्तिशाली Git-aware सुविधाएं प्रदान करता है:

- `sortByChanges`: जब true है, तो फ़ाइलें Git परिवर्तनों की संख्या (फ़ाइल को modify करने वाले commits) के अनुसार सॉर्ट होती हैं। अधिक परिवर्तन वाली फ़ाइलें आउटपुट के नीचे दिखाई देती हैं। यह अधिक सक्रिय रूप से विकसित फ़ाइलों को प्राथमिकता देने में मदद करता है। डिफ़ॉल्ट: `true`
- `sortByChangesMaxCommits`: फ़ाइल परिवर्तनों की गिनती करते समय विश्लेषित करने के लिए अधिकतम commits। डिफ़ॉल्ट: `100`
- `includeDiffs`: जब true है, तो आउटपुट में Git अंतर शामिल करता है (work tree और staged changes को अलग-अलग शामिल करता है)। यह reader को repository में pending changes देखने की अनुमति देता है। डिफ़ॉल्ट: `false`
- `includeLogs`: जब true है, तो आउटपुट में Git कमिट इतिहास शामिल करता है। प्रत्येक कमिट के लिए कमिट तारीखें, संदेश और फ़ाइल पथ दिखाता है। यह AI को विकास पैटर्न और फ़ाइल संबंधों को समझने में मदद करता है। डिफ़ॉल्ट: `false`
- `includeLogsCount`: git logs में शामिल करने के लिए हाल के commits की संख्या। डिफ़ॉल्ट: `50`

कॉन्फिगरेशन उदाहरण:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### सुरक्षा जांच

जब `security.enableSecurityCheck` सक्षम है, तो Repomix आउटपुट में शामिल करने से पहले आपके कोडबेस में संवेदनशील जानकारी का पता लगाने के लिए [Secretlint](https://github.com/secretlint/secretlint) का उपयोग करता है। यह निम्नलिखित की आकस्मिक exposure को रोकने में मदद करता है:

- API keys
- Access tokens
- Private keys
- Passwords
- अन्य संवेदनशील credentials

### टिप्पणी हटाना

जब `output.removeComments` को `true` सेट किया जाता है, तो आउटपुट का आकार कम करने और आवश्यक कोड सामग्री पर ध्यान केंद्रित करने के लिए समर्थित फ़ाइल प्रकारों से टिप्पणियां हटा दी जाती हैं। यह विशेष रूप से तब उपयोगी हो सकता है जब:

- भारी documented कोड के साथ काम कर रहे हों
- टोकन संख्या कम करने की कोशिश कर रहे हों
- कोड structure और logic पर ध्यान केंद्रित कर रहे हों

समर्थित भाषाओं और विस्तृत उदाहरणों के लिए, [टिप्पणी हटाने की गाइड](comment-removal) देखें।
