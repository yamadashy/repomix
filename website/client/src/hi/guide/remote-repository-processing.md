---
title: GitHub रिपॉजिटरी प्रोसेसिंग
description: पूर्ण URL, user/repo शॉर्टहैंड, ब्रांच, टैग, कमिट, Docker, और रिमोट कॉन्फ़िग ट्रस्ट कंट्रोल का उपयोग करके Repomix के साथ GitHub रिपॉजिटरी पैक करें।
---

# GitHub रिपॉजिटरी प्रोसेसिंग

## बुनियादी उपयोग

सार्वजनिक रिपॉजिटरी प्रोसेस करें:
```bash
# पूर्ण URL का उपयोग करके
repomix --remote https://github.com/user/repo

# GitHub शॉर्टहैंड का उपयोग करके
repomix --remote user/repo
```

आप `owner/repo` शॉर्टहैंड को `--remote` के बिना सीधे भी पास कर सकते हैं:

```bash
repomix yamadashy/repomix
```

चूँकि `owner/repo` एक सापेक्ष स्थानीय पथ जैसा भी दिखता है, इसलिए Repomix इसे रिमोट रिपॉजिटरी के रूप में केवल तभी मानता है जब उस नाम की कोई स्थानीय फ़ाइल या डायरेक्टरी मौजूद न हो और रिपॉजिटरी GitHub पर पहुँच योग्य हो। एक मेल खाता स्थानीय पथ हमेशा प्राथमिकता लेता है; किसी `owner/repo`-आकार वाले पथ के लिए स्थानीय हैंडलिंग को मजबूर करने हेतु इसके आगे `./` लगाएँ (उदाहरण के लिए, `repomix ./owner/repo`)। यदि तर्क पैटर्न से मेल खाता है लेकिन रिपॉजिटरी तक नहीं पहुँचा जा सकता (उदाहरण के लिए, एक निजी रिपॉजिटरी या कोई टाइपो), तो Repomix इसे स्थानीय पथ के रूप में हैंडल करने पर वापस लौट आता है।

## ब्रांच और कमिट चयन

```bash
# विशिष्ट ब्रांच
repomix --remote user/repo --remote-branch main

# टैग
repomix --remote user/repo --remote-branch v1.0.0

# कमिट हैश
repomix --remote user/repo --remote-branch 935b695
```

## आवश्यकताएँ

- Git इंस्टॉल होना चाहिए
- इंटरनेट कनेक्शन
- रिपॉजिटरी तक पढ़ने की पहुँच

## आउटपुट नियंत्रण

```bash
# कस्टम आउटपुट स्थान
repomix --remote user/repo -o custom-output.xml

# XML फ़ॉर्मेट के साथ
repomix --remote user/repo --style xml

# टिप्पणियाँ हटाएँ
repomix --remote user/repo --remove-comments
```

## Docker उपयोग

```bash
# प्रोसेस करें और वर्तमान डायरेक्टरी में आउटपुट दें
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# विशिष्ट डायरेक्टरी में आउटपुट दें
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## सुरक्षा

सुरक्षा के लिए, रिमोट रिपॉजिटरी में कॉन्फ़िग फ़ाइलें (`repomix.config.*`) डिफ़ॉल्ट रूप से लोड नहीं की जातीं। यह अविश्वसनीय रिपॉजिटरी को `repomix.config.ts` जैसी कॉन्फ़िग फ़ाइलों के माध्यम से कोड चलाने से रोकता है।

आपकी ग्लोबल कॉन्फ़िग और CLI विकल्प फिर भी लागू होते हैं।

किसी रिमोट रिपॉजिटरी की कॉन्फ़िग पर भरोसा करने के लिए:

```bash
# CLI फ़्लैग का उपयोग करके
repomix --remote user/repo --remote-trust-config

# एनवायरनमेंट वेरिएबल का उपयोग करके
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

`--remote` के साथ `--config` का उपयोग करते समय, एक पूर्ण पथ आवश्यक होता है:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## सामान्य समस्याएँ

### पहुँच संबंधी समस्याएँ
- सुनिश्चित करें कि रिपॉजिटरी सार्वजनिक है
- Git इंस्टॉलेशन जाँचें
- इंटरनेट कनेक्शन सत्यापित करें

### बड़ी रिपॉजिटरी
- विशिष्ट पथ चुनने के लिए `--include` का उपयोग करें
- `--remove-comments` सक्षम करें
- ब्रांच को अलग-अलग प्रोसेस करें

## संबंधित संसाधन

- [कमांड लाइन विकल्प](/hi/guide/command-line-options) - `--remote` विकल्पों सहित पूर्ण CLI संदर्भ
- [कॉन्फ़िगरेशन](/hi/guide/configuration) - रिमोट प्रोसेसिंग के लिए डिफ़ॉल्ट विकल्प सेट करें
- [कोड कम्प्रेशन](/hi/guide/code-compress) - बड़ी रिपॉजिटरी के लिए आउटपुट आकार कम करें
- [सुरक्षा](/hi/guide/security) - Repomix संवेदनशील डेटा का पता कैसे लगाता है
