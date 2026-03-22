# GitHub रिपॉजिटरी प्रोसेसिंग

Repomix आपको GitHub जैसे प्लेटफॉर्म पर होस्ट किए गए रिमोट रिपॉजिटरी को प्रोसेस करने की अनुमति देता है। यह सुविधा उपयोगी है जब आप अपने लोकल मशीन पर रिपॉजिटरी को क्लोन किए बिना कोडबेस का विश्लेषण करना चाहते हैं।

## रिमोट रिपॉजिटरी प्रोसेस करना

रिमोट रिपॉजिटरी प्रोसेस करने के लिए, `--remote` विकल्प का उपयोग करें:

```bash
repomix --remote <username>/<repository>
```

उदाहरण:

```bash
repomix --remote yamadashy/repomix
```

यह GitHub से `yamadashy/repomix` रिपॉजिटरी को डाउनलोड करेगा और प्रोसेस करेगा।

## विशिष्ट ब्रांच या कमिट प्रोसेस करना

डिफॉल्ट रूप से, Repomix रिपॉजिटरी के डिफॉल्ट ब्रांच (आमतौर पर `main` या `master`) को प्रोसेस करेगा। विशिष्ट ब्रांच या कमिट प्रोसेस करने के लिए, `--remote-branch` विकल्प का उपयोग करें:

```bash
repomix --remote <username>/<repository> --remote-branch <branch-or-commit>
```

उदाहरण:

```bash
# विशिष्ट ब्रांच प्रोसेस करना
repomix --remote yamadashy/repomix --remote-branch develop

# विशिष्ट कमिट प्रोसेस करना
repomix --remote yamadashy/repomix --remote-branch 935b695
```

## आउटपुट विकल्प

रिमोट रिपॉजिटरी प्रोसेस करते समय, आप अन्य Repomix विकल्पों का उपयोग कर सकते हैं, जैसे आउटपुट स्टाइल और फिल्टरिंग:

```bash
repomix --remote yamadashy/repomix --style markdown --output-file output.md
```

```bash
repomix --remote yamadashy/repomix --include "src/**/*.ts" --ignore "**/*.test.ts"
```

## प्राइवेट रिपॉजिटरी

Repomix CLI टूल आपके लोकल Git क्रेडेंशियल्स का उपयोग करता है, इसलिए यदि आपके पास प्राइवेट रिपॉजिटरी तक पहुंच है, तो आप उन्हें भी प्रोसेस कर सकते हैं:

```bash
repomix --remote your-org/private-repo
```

## रिमोट प्रोसेसिंग के लाभ

रिमोट रिपॉजिटरी प्रोसेसिंग के कई लाभ हैं:

1. **डिस्क स्पेस बचाना**: आपको अपने लोकल मशीन पर रिपॉजिटरी को क्लोन करने की आवश्यकता नहीं है
2. **समय बचाना**: बड़े रिपॉजिटरी को क्लोन करने में समय लग सकता है
3. **सुविधा**: आपको Git इंस्टॉल करने या सेटअप करने की आवश्यकता नहीं है
4. **एक्सप्लोरेशन**: नए प्रोजेक्ट्स या ओपन सोर्स रिपॉजिटरी का त्वरित विश्लेषण

## रिमोट प्रोसेसिंग सीमाएं

रिमोट रिपॉजिटरी प्रोसेसिंग की कुछ सीमाएं हैं:

1. **नेटवर्क निर्भरता**: आपको इंटरनेट कनेक्शन की आवश्यकता है
2. **डाउनलोड समय**: बड़े रिपॉजिटरी को डाउनलोड करने में समय लग सकता है
3. **API सीमाएं**: GitHub API सीमाओं के अधीन है
4. **Git इतिहास**: वर्तमान में, Repomix केवल निर्दिष्ट ब्रांच या कमिट के स्नैपशॉट को प्रोसेस करता है, न कि पूरे Git इतिहास को

## उदाहरण उपयोग

### ओपन सोर्स प्रोजेक्ट का विश्लेषण

```bash
repomix --remote facebook/react --include "packages/react/**/*.js" --style markdown --output-file react-analysis.md
```

### विशिष्ट ब्रांच का विश्लेषण

```bash
repomix --remote tensorflow/tensorflow --remote-branch r2.9 --include "tensorflow/python/**/*.py" --output-file tensorflow-python-api.xml
```

### कमिट के बीच तुलना

आप विभिन्न कमिट्स के बीच तुलना करने के लिए Repomix का उपयोग कर सकते हैं:

```bash
# पहले कमिट को प्रोसेस करें
repomix --remote user/repo --remote-branch commit1 --output-file output1.xml

# दूसरे कमिट को प्रोसेस करें
repomix --remote user/repo --remote-branch commit2 --output-file output2.xml

# फिर आप दोनों आउटपुट फाइलों को AI मॉडल के साथ उपयोग कर सकते हैं
```

## सुरक्षा

सुरक्षा के लिए, रिमोट रिपॉजिटरी में मौजूद कॉन्फिग फाइलें (`repomix.config.*`) डिफॉल्ट रूप से लोड नहीं की जाती हैं। इससे अविश्वसनीय रिपॉजिटरी `repomix.config.ts` जैसी कॉन्फिग फाइलों के ज़रिए कोड एक्ज़ीक्यूट नहीं कर पाती हैं।

आपकी ग्लोबल कॉन्फिग और CLI विकल्प पहले की तरह लागू होते रहेंगे।

किसी रिमोट रिपॉजिटरी की कॉन्फिग पर भरोसा करने के लिए:

```bash
# CLI फ्लैग का उपयोग करके
repomix --remote user/repo --remote-trust-config

# एनवायरनमेंट वेरिएबल का उपयोग करके
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

`--remote` के साथ `--config` का उपयोग करते समय, एक पूर्ण (absolute) पथ आवश्यक है:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## अगला क्या है?

- [कमांड लाइन विकल्पों](command-line-options.md) के बारे में अधिक जानें
- [कॉन्फिगरेशन विकल्पों](configuration.md) का अन्वेषण करें
- [आउटपुट फॉर्मेट](output.md) के बारे में जानें
