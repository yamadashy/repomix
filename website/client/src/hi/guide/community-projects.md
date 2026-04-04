# कम्युनिटी प्रोजेक्ट्स

Repomix कम्युनिटी द्वारा बनाए गए अद्भुत प्रोजेक्ट्स की खोज करें! ये प्रोजेक्ट्स Repomix की क्षमताओं को बढ़ाते हैं, अन्य भाषाओं में implementations प्रदान करते हैं, या Repomix को बड़े toolsets में integrate करते हैं।

## एडिटर एक्सटेंशन

### Repomix Runner (VSCode एक्सटेंशन)
VSCode एक्सटेंशन जो AI processing के लिए फाइलों को single output में bundle करने में मदद करता है। selected फाइलों को pack करें, reusable bundles बनाएं, और content को clipboard में copy करें।

**Repository**: [massdo/repomix-runner](https://github.com/massdo/repomix-runner)  
**Marketplace**: [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)

## डेस्कटॉप एप्लिकेशन

### Repomix Desktop
एक कम्युनिटी डेस्कटॉप एप्लिकेशन जो Repomix CLI के लिए GUI wrapper प्रदान करता है। Python और CustomTkinter से बनाया गया, यह terminal का उपयोग किए बिना एक user-friendly interface प्रदान करता है।

**Repository**: [KevanMacGee/Repomix-Desktop](https://github.com/KevanMacGee/Repomix-Desktop)

## भाषा implementations

### Python Repomix
Python code के लिए AST-based compression के साथ Repomix का Python implementation। multiple compression modes, detect-secrets का उपयोग करके security checks, और multiprocessing support की सुविधा है।

**Repository**: [AndersonBY/python-repomix](https://github.com/AndersonBY/python-repomix)

## Integration Tools

### Rulefy
Claude AI का उपयोग करके GitHub repositories को custom Cursor AI rules में transform करता है। .rules.mdc फाइलें generate करने के लिए project structure और conventions को extract करता है।

**Repository**: [niklub/rulefy](https://github.com/niklub/rulefy)

### Codebase MCP
Model Context Protocol server जो AI agents को codebases का analysis करने में मदद करने के लिए Repomix का उपयोग करता है। local workspace analysis, remote GitHub repositories, और analysis results save करने के लिए tools प्रदान करता है।

**Repository**: [DeDeveloper23/codebase-mcp](https://github.com/DeDeveloper23/codebase-mcp)

### vibe-tools
AI agents के लिए CLI toolset जिसमें Perplexity के माध्यम से web search, Gemini और Repomix के साथ repository analysis, और Stagehand के साथ browser automation सहित कई capabilities हैं।

**Repository**: [eastlondoner/vibe-tools](https://github.com/eastlondoner/vibe-tools)

## संबंधित संसाधन

- [इंस्टॉलेशन](/hi/guide/installation) - Repomix CLI या ब्राउज़र एक्सटेंशन इंस्टॉल करें
- [MCP सर्वर](/hi/guide/mcp-server) - AI असिस्टेंट्स के लिए Repomix को MCP सर्वर के रूप में उपयोग करें
- [Claude Code प्लगइन्स](/hi/guide/claude-code-plugins) - Claude Code के लिए आधिकारिक प्लगइन्स