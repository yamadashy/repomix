---
layout: home
title: Repomix
description: Claude, ChatGPT, Gemini, MCP और कोड रिव्यू workflows के लिए local या remote repositories को AI-friendly XML, Markdown, JSON या plain text में पैक करें।
titleTemplate: अपने कोडबेस को AI-फ्रेंडली फॉर्मेट में पैकेज करें
aside: false
editLink: false

features:
  - icon: 🤖
    title: AI-अनुकूलित
    details: आपके कोडबेस को ऐसे प्रारूप में प्रस्तुत करता है जिसे AI आसानी से समझ और प्रोसेस कर सके।

  - icon: ⚙️
    title: Git-जागरूक
    details: स्वचालित रूप से आपकी .gitignore फाइलों का सम्मान करता है।

  - icon: 🛡️
    title: सुरक्षा-केंद्रित
    details: संवेदनशील जानकारी का पता लगाने और उसे शामिल करने से रोकने के लिए मजबूत सुरक्षा जांच के लिए Secretlint को शामिल करता है।

  - icon: 📊
    title: टोकन काउंटिंग
    details: प्रत्येक फाइल और पूरे रिपॉजिटरी के लिए टोकन काउंट प्रदान करता है, जो LLM कॉन्टेक्स्ट सीमाओं के लिए उपयोगी है।

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 ओपन सोर्स अवार्ड्स नामांकन

हमें सम्मान मिला है! Repomix को [JSNation Open Source Awards 2025](https://osawards.com/javascript/) के **Powered by AI** श्रेणी में नामांकित किया गया है।

यह आप सभी के Repomix का उपयोग करने और समर्थन करने के बिना संभव नहीं होता। धन्यवाद!

## Repomix क्या है?

Repomix एक शक्तिशाली टूल है जो आपके पूरे कोडबेस को एक AI-फ्रेंडली फाइल में पैकेज करता है। चाहे आप कोड रिव्यू, रिफैक्टरिंग पर काम कर रहे हों या अपने प्रोजेक्ट के लिए AI सहायता की आवश्यकता हो, Repomix आपके पूरे रिपॉजिटरी कॉन्टेक्स्ट को AI टूल्स के साथ साझा करना आसान बनाता है।

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## त्वरित शुरुआत

एक बार जब आप Repomix का उपयोग करके एक पैक्ड फाइल (`repomix-output.xml`) जनरेट कर लेते हैं, तो आप इसे एक AI असिस्टेंट (जैसे ChatGPT, Claude) को इस तरह के प्रॉम्प्ट के साथ भेज सकते हैं:

```
इस फाइल में रिपॉजिटरी की सभी फाइलें एक में संयोजित हैं।
मैं कोड को रिफैक्टर करना चाहता हूं, इसलिए कृपया पहले इसकी समीक्षा करें।
```

AI आपके पूरे कोडबेस का विश्लेषण करेगा और व्यापक अंतर्दृष्टि प्रदान करेगा:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

विशिष्ट परिवर्तनों पर चर्चा करते समय, AI कोड जनरेट करने में मदद कर सकता है। Claude के आर्टिफैक्ट्स जैसी सुविधाओं के साथ, आप कई परस्पर निर्भर फाइलें भी प्राप्त कर सकते हैं:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

हैप्पी कोडिंग! 🚀

## Repomix क्यों?

Repomix की शक्ति इसकी ChatGPT, Claude, Gemini, Grok जैसी सब्सक्रिप्शन सेवाओं के साथ लागत की चिंता किए बिना काम करने की क्षमता में निहित है, जबकि यह पूर्ण कोडबेस संदर्भ प्रदान करता है जो फाइल अन्वेषण की आवश्यकता को समाप्त करता है - जिससे विश्लेषण तेज़ और अक्सर अधिक सटीक हो जाता है।

पूरे कोडबेस के संदर्भ के रूप में उपलब्ध होने के साथ, Repomix कार्यान्वयन योजना, बग जांच, तृतीय-पक्ष लाइब्रेरी सुरक्षा जांच, दस्तावेज़ीकरण निर्माण, और भी बहुत कुछ सहित अनुप्रयोगों की एक विस्तृत श्रृंखला को सक्षम बनाता है।

## CLI टूल का उपयोग {#using-the-cli-tool}

Repomix को कमांड-लाइन टूल के रूप में उपयोग किया जा सकता है, जो शक्तिशाली सुविधाएँ और अनुकूलन विकल्प प्रदान करता है।

**CLI टूल प्राइवेट रिपॉजिटरी तक पहुंच सकता है** क्योंकि यह आपके स्थानीय रूप से इंस्टॉल किए गए git का उपयोग करता है।

### त्वरित शुरुआत

आप Repomix को अपने प्रोजेक्ट डायरेक्टरी में बिना इंस्टॉलेशन के तुरंत आजमा सकते हैं:

```bash
npx repomix@latest
```

या बार-बार उपयोग के लिए ग्लोबली इंस्टॉल करें:

```bash
# npm का उपयोग करके इंस्टॉल करें
npm install -g repomix

# या yarn के साथ
yarn global add repomix

# या bun के साथ
bun add -g repomix

# या Homebrew के साथ (macOS/Linux)
brew install repomix

# फिर किसी भी प्रोजेक्ट डायरेक्टरी में चलाएं
repomix
```

बस इतना ही! Repomix आपकी वर्तमान डायरेक्टरी में एक `repomix-output.xml` फाइल जनरेट करेगा, जिसमें आपका पूरा रिपॉजिटरी AI-फ्रेंडली फॉर्मेट में होगा।



### उपयोग

अपने पूरे रिपॉजिटरी को पैक करने के लिए:

```bash
repomix
```

किसी विशिष्ट डायरेक्टरी को पैक करने के लिए:

```bash
repomix path/to/directory
```

[ग्लोब पैटर्न](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) का उपयोग करके विशिष्ट फाइलों या डायरेक्टरी को पैक करने के लिए:

```bash
repomix --include "src/**/*.ts,**/*.md"
```

विशिष्ट फाइलों या डायरेक्टरी को बाहर रखने के लिए:

```bash
repomix --ignore "**/*.log,tmp/"
```

रिमोट रिपॉजिटरी को पैक करने के लिए:
```bash
# शॉर्टहैंड फॉर्मेट का उपयोग करके
npx repomix --remote yamadashy/repomix

# पूर्ण URL का उपयोग करके (ब्रांच और विशिष्ट पाथ का समर्थन करता है)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# कमिट के URL का उपयोग करके
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

एक नई कॉन्फिगरेशन फाइल (`repomix.config.json`) को इनिशियलाइज़ करने के लिए:

```bash
repomix --init
```

एक बार जब आप पैक्ड फाइल जनरेट कर लेते हैं, तो आप इसे Claude, ChatGPT और Gemini जैसे जनरेटिव AI टूल के साथ उपयोग कर सकते हैं।

#### Docker उपयोग

आप Docker 🐳 का उपयोग करके भी Repomix चला सकते हैं  
यह उपयोगी है यदि आप Repomix को एक अलग वातावरण में चलाना चाहते हैं या कंटेनर का उपयोग करना पसंद करते हैं।

बेसिक उपयोग (वर्तमान डायरेक्टरी):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

किसी विशिष्ट डायरेक्टरी को पैक करने के लिए:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

रिमोट रिपॉजिटरी को प्रोसेस करें और `output` डायरेक्टरी में आउटपुट करें:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### आउटपुट फॉर्मेट

अपना पसंदीदा आउटपुट फॉर्मेट चुनें:

```bash
# XML फॉर्मेट (डिफॉल्ट)
repomix --style xml

# मार्कडाउन फॉर्मेट
repomix --style markdown

# JSON फॉर्मेट
repomix --style json

# प्लेन टेक्स्ट फॉर्मेट
repomix --style plain
```

### अनुकूलन

स्थायी सेटिंग्स के लिए `repomix.config.json` बनाएं:

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

## वास्तविक दुनिया के उपयोग मामले

### [LLM कोड जेनरेशन वर्कफ़्लो](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

एक डेवलपर साझा करता है कि वे मौजूदा कोडबेस से कोड संदर्भ निकालने के लिए Repomix का उपयोग कैसे करते हैं, फिर Claude और Aider जैसे LLMs के साथ उस संदर्भ का लाभ उठाकर वृद्धिशील सुधार, कोड समीक्षा और स्वचालित दस्तावेज़ीकरण उत्पादन करते हैं।

### [LLMs के लिए ज्ञान डेटापैक बनाना](https://lethain.com/competitive-advantage-author-llms/)

लेखक अपनी लिखित सामग्री—ब्लॉग, दस्तावेज़ीकरण और किताबों—को LLM-संगत प्रारूपों में पैकेज करने के लिए Repomix का उपयोग कर रहे हैं, जिससे पाठक AI-संचालित प्रश्न-उत्तर प्रणालियों के माध्यम से उनकी विशेषज्ञता के साथ बातचीत कर सकें।

[अधिक उपयोग के मामले देखें →](./guide/use-cases)

## पावर यूज़र गाइड

Repomix उन्नत उपयोग के मामलों के लिए शक्तिशाली सुविधाएं प्रदान करता है। पावर यूज़र्स के लिए कुछ आवश्यक गाइड यहां हैं:

- **[MCP सर्वर](./guide/mcp-server)** - AI असिस्टेंट के लिए Model Context Protocol एकीकरण
- **[GitHub Actions](./guide/github-actions)** - CI/CD वर्कफ़्लो में कोडबेस पैकेजिंग को स्वचालित करें
- **[कोड कंप्रेशन](./guide/code-compress)** - Tree-sitter आधारित इंटेलिजेंट कंप्रेशन (~70% टोकन कमी)
- **[लाइब्रेरी के रूप में उपयोग](./guide/development/using-repomix-as-a-library)** - अपने Node.js एप्लिकेशन में Repomix को एकीकृत करें
- **[कस्टम निर्देश](./guide/custom-instructions)** - आउटपुट में कस्टम प्रॉम्प्ट और निर्देश जोड़ें
- **[सुरक्षा सुविधाएं](./guide/security)** - अंतर्निहित Secretlint एकीकरण और सुरक्षा जांच
- **[सर्वोत्तम प्रथाएं](./guide/tips/best-practices)** - सिद्ध रणनीतियों के साथ अपने AI वर्कफ़्लो को अनुकूलित करें

### अधिक उदाहरण
::: tip अधिक मदद चाहिए? 💡
हमारे व्यापक दस्तावेज़ीकरण को [गाइड](/hi/guide/) में देखें या अधिक उदाहरणों और सोर्स कोड के लिए [GitHub रिपॉजिटरी](https://github.com/yamadashy/repomix) का अन्वेषण करें।
:::

</div>
