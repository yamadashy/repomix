import { type DefaultTheme, defineConfig } from 'vitepress';

export const configHi = defineConfig({
  lang: 'hi',
  description: 'अपने कोडबेस को AI-फ्रेंडली फॉर्मेट में पैकेज करें',
  themeConfig: {
    nav: [
      { text: 'गाइड', link: '/hi/guide/', activeMatch: '^/hi/guide/' },
      {
        text: 'Chrome एक्सटेंशन',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Discord में शामिल हों', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/hi/guide/': [
        {
          text: 'परिचय',
          items: [
            { text: 'शुरुआत करना', link: '/hi/guide/' },
            { text: 'इंस्टॉलेशन', link: '/hi/guide/installation' },
            { text: 'बुनियादी उपयोग', link: '/hi/guide/usage' },
            { text: 'प्रॉम्प्ट उदाहरण', link: '/hi/guide/prompt-examples' },
            { text: 'उपयोग के मामले', link: '/hi/guide/use-cases' },
          ],
        },
        {
          text: 'गाइड',
          items: [
            { text: 'आउटपुट फॉर्मेट', link: '/hi/guide/output' },
            { text: 'कमांड लाइन विकल्प', link: '/hi/guide/command-line-options' },
            { text: 'कॉन्फ़िगरेशन', link: '/hi/guide/configuration' },
            { text: 'कस्टम निर्देश', link: '/hi/guide/custom-instructions' },
            { text: 'GitHub रिपॉजिटरी प्रोसेसिंग', link: '/hi/guide/remote-repository-processing' },
            { text: 'टिप्पणी हटाना', link: '/hi/guide/comment-removal' },
            { text: 'कोड कम्प्रेशन', link: '/hi/guide/code-compress' },
            { text: 'सुरक्षा', link: '/hi/guide/security' },
          ],
        },
        {
          text: 'उन्नत',
          items: [
            { text: 'MCP सर्वर', link: '/hi/guide/mcp-server' },
            { text: 'Claude Code प्लगइन्स', link: '/hi/guide/claude-code-plugins' },
            { text: 'Agent Skills जनरेशन', link: '/hi/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/hi/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/hi/guide/github-actions' },
            { text: 'Repomix को लाइब्रेरी के रूप में उपयोग', link: '/hi/guide/development/using-repomix-as-a-library' },
            { text: 'AI-सहायक विकास टिप्स', link: '/hi/guide/tips/best-practices' },
          ],
        },
        {
          text: 'समुदाय',
          items: [
            { text: 'समुदाय प्रोजेक्ट्स', link: '/hi/guide/community-projects' },
            { text: 'Repomix में योगदान', link: '/hi/guide/development/' },
            { text: 'प्रायोजक', link: '/hi/guide/sponsors' },
            { text: 'Privacy Policy', link: '/hi/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configHiSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  hi: {
    translations: {
      button: {
        buttonText: 'खोजें',
        buttonAriaLabel: 'खोजें',
      },
      modal: {
        noResultsText: 'कोई परिणाम नहीं मिला',
        resetButtonTitle: 'खोज रीसेट करें',
        backButtonTitle: 'वापस जाएं',
        displayDetails: 'विवरण दिखाएं',
        footer: {
          selectText: 'चुनें',
          navigateText: 'नेविगेट करें',
          closeText: 'बंद करें',
        },
      },
    },
  },
};
