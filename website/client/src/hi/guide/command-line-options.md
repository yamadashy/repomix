# कमांड लाइन विकल्प

Repomix कई कमांड लाइन विकल्प प्रदान करता है जो आपको अपने कोडबेस को प्रोसेस करने के तरीके को अनुकूलित करने की अनुमति देते हैं।

## बुनियादी विकल्प

### वर्जन दिखाना

```bash
repomix --version
```

वर्तमान इंस्टॉल किए गए Repomix का वर्जन दिखाता है।

### मदद दिखाना

```bash
repomix --help
```

उपलब्ध कमांड लाइन विकल्पों की सूची दिखाता है।

## आउटपुट विकल्प

### आउटपुट फाइल

```bash
repomix --output-file <filename>
```

आउटपुट फाइल का नाम निर्दिष्ट करता है। डिफॉल्ट: `repomix-output.xml`

### आउटपुट स्टाइल

```bash
repomix --style <style>
```

आउटपुट फॉर्मेट निर्दिष्ट करता है। विकल्प: `xml`, `markdown`, या `plain`। डिफॉल्ट: `xml`

### स्टैंडर्ड आउटपुट

```bash
repomix --stdout
```

आउटपुट को फाइल के बजाय स्टैंडर्ड आउटपुट (stdout) पर भेजता है।

## फिल्टरिंग विकल्प

### फाइलों को शामिल करना

```bash
repomix --include <patterns>
```

शामिल करने के लिए [ग्लोब पैटर्न](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) निर्दिष्ट करता है। कई पैटर्न को अल्पविराम से अलग किया जा सकता है।

उदाहरण:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### फाइलों को बाहर रखना

```bash
repomix --ignore <patterns>
```

बाहर रखने के लिए [ग्लोब पैटर्न](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) निर्दिष्ट करता है। कई पैटर्न को अल्पविराम से अलग किया जा सकता है।

उदाहरण:
```bash
repomix --ignore "**/*.log,tmp/"
```

### Stdin से फ़ाइल पथ (पाइप के माध्यम से)

Repomix अब स्वचालित रूप से stdin से फ़ाइल पथ का पता लगाता है:

```bash
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

## रिमोट रिपॉजिटरी प्रोसेसिंग

### रिमोट रिपॉजिटरी

```bash
repomix --remote <repository>
```

प्रोसेस करने के लिए रिमोट GitHub रिपॉजिटरी निर्दिष्ट करता है।

उदाहरण:
```bash
repomix --remote yamadashy/repomix
```

### रिमोट ब्रांच

```bash
repomix --remote-branch <branch>
```

प्रोसेस करने के लिए रिमोट रिपॉजिटरी का ब्रांच या कमिट हैश निर्दिष्ट करता है।

उदाहरण:
```bash
repomix --remote yamadashy/repomix --remote-branch main
repomix --remote yamadashy/repomix --remote-branch 935b695
```

## कॉन्फिगरेशन विकल्प

### कॉन्फिगरेशन फाइल

```bash
repomix --config <path>
```

कस्टम कॉन्फिगरेशन फाइल का पथ निर्दिष्ट करता है। डिफॉल्ट: `repomix.config.json`

### कॉन्फिगरेशन फाइल इनिशियलाइज़ करना

```bash
repomix --init
```

वर्तमान डायरेक्टरी में एक डिफॉल्ट कॉन्फिगरेशन फाइल बनाता है।

## सुरक्षा विकल्प

### सुरक्षा जांच

```bash
repomix --no-security-check
```

सुरक्षा जांच को अक्षम करता है। डिफॉल्ट रूप से, Repomix संवेदनशील जानकारी के लिए फाइलों की जांच करता है।

## प्रोसेसिंग विकल्प

### टिप्पणियां हटाना

```bash
repomix --remove-comments
```

आउटपुट से कोड टिप्पणियां हटाता है।

### कोड कम्प्रेशन

```bash
repomix --compress
```

कोड को संक्षिप्त करता है, जिससे टोकन उपयोग कम हो जाता है।

## टोकन काउंटिंग विकल्प

### टोकन काउंटर

```bash
repomix --token-counter <model>
```

टोकन काउंटिंग के लिए उपयोग किए जाने वाले मॉडल को निर्दिष्ट करता है। विकल्प: `gpt-4`, `gpt-3.5-turbo`, `claude`, `llama`, `gemini`। डिफॉल्ट: `gpt-4`

## उदाहरण

### बुनियादी उपयोग

```bash
repomix
```

वर्तमान डायरेक्टरी को प्रोसेस करता है और `repomix-output.xml` फाइल बनाता है।

### कस्टम आउटपुट

```bash
repomix --style markdown --output-file docs/codebase.md
```

वर्तमान डायरेक्टरी को प्रोसेस करता है और मार्कडाउन फॉर्मेट में `docs/codebase.md` फाइल बनाता है।

### विशिष्ट फाइलों को प्रोसेस करना

```bash
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"
```

केवल `src` डायरेक्टरी में TypeScript फाइलों को प्रोसेस करता है, टेस्ट फाइलों को छोड़कर।

### रिमोट रिपॉजिटरी प्रोसेसिंग

```bash
repomix --remote yamadashy/repomix --style markdown
```

GitHub से `yamadashy/repomix` रिपॉजिटरी को प्रोसेस करता है और मार्कडाउन फॉर्मेट में आउटपुट बनाता है।

### टोकन उपयोग को कम करना

```bash
repomix --remove-comments --compress
```

टिप्पणियां हटाकर और कोड को संक्षिप्त करके टोकन उपयोग को कम करता है।

### Stdin का उपयोग करके फ़ाइल सूची (स्वचालित पहचान)

```bash
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

## अगला क्या है?

- [कॉन्फिगरेशन विकल्पों](configuration.md) के बारे में अधिक जानें
- [आउटपुट फॉर्मेट](output.md) का अन्वेषण करें
- [सुरक्षा सुविधाओं](security.md) के बारे में जानें
