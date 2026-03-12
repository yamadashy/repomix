# इंस्टॉलेशन

Repomix को कई तरीकों से इंस्टॉल किया जा सकता है। अपनी आवश्यकताओं के अनुसार सबसे उपयुक्त विधि चुनें।

## npx के साथ बिना इंस्टॉलेशन के उपयोग

आप Repomix को बिना इंस्टॉल किए तुरंत उपयोग कर सकते हैं:

```bash
npx repomix@latest
```

यह विधि तब उपयोगी होती है जब आप Repomix को आजमाना चाहते हैं या इसे केवल एक बार उपयोग करना चाहते हैं।

## ग्लोबल इंस्टॉलेशन

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## प्रोजेक्ट-स्पेसिफिक इंस्टॉलेशन

आप Repomix को अपने प्रोजेक्ट की डिपेंडेंसी के रूप में भी इंस्टॉल कर सकते हैं:

### npm के साथ

```bash
npm install --save-dev repomix
```

### yarn के साथ

```bash
yarn add --dev repomix
```

### pnpm के साथ

```bash
pnpm add -D repomix
```

## Docker के साथ उपयोग

Repomix को Docker कंटेनर के रूप में भी चलाया जा सकता है:

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

## ब्राउज़र एक्सटेंशन

किसी भी GitHub रिपॉजिटरी से Repomix तक तुरंत पहुंच प्राप्त करें! हमारा ब्राउज़र एक्सटेंशन GitHub रिपॉजिटरी पेजों पर एक सुविधाजनक "Repomix" बटन जोड़ता है।

![Repomix Browser Extension](/images/docs/browser-extension.png)

### इंस्टॉलेशन
- Chrome एक्सटेंशन: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox ऐड-ऑन: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### विशेषताएं
- किसी भी GitHub रिपॉजिटरी के लिए वन-क्लिक Repomix पहुंच
- और भी रोमांचक सुविधाएं जल्द ही आ रही हैं!

## GitHub Actions के साथ उपयोग

Repomix को GitHub Actions में एक एक्शन के रूप में भी उपयोग किया जा सकता है। अधिक जानकारी के लिए [GitHub Actions गाइड](github-actions.md) देखें।

## सत्यापन

इंस्टॉलेशन सत्यापित करने के लिए, निम्न कमांड चलाएं:

```bash
repomix --version
```

यह Repomix का वर्तमान वर्जन प्रदर्शित करेगा।

## अगला क्या है?

- [बुनियादी उपयोग](usage.md) के साथ शुरू करें
- [कॉन्फिगरेशन विकल्पों](configuration.md) के बारे में जानें
- [कमांड लाइन विकल्पों](command-line-options.md) का अन्वेषण करें
