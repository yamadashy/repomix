---
title: "Repomix Explorer Becerisi (Ajan Becerileri)"
description: "Claude Code ve Agent Skills formatını destekleyen diğer yapay zeka asistanlarıyla yerel ve uzak kod tabanlarını analiz etmek için Repomix Explorer agent skill’ini kurun."
---

# Repomix Explorer Becerisi (Ajan Becerileri)

Repomix, AI kodlama asistanlarının Repomix CLI kullanarak kod tabanlarını analiz etmesini ve keşfetmesini sağlayan kullanıma hazır bir **Repomix Explorer** becerisi sunar.

Bu beceri, Claude Code ve Agent Skills formatını destekleyen diğer yapay zeka asistanları için tasarlanmıştır.

## Hızlı Kurulum

Claude Code için resmi Repomix Explorer eklentisini kurun:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Claude Code eklentisi `/repomix-explorer:explore-local` ve `/repomix-explorer:explore-remote` gibi ad alanlı komutlar sağlar. Tam kurulum için [Claude Code Eklentileri](/tr/guide/claude-code-plugins) bölümüne bakın.

Codex, Cursor, OpenClaw ve Agent Skills uyumlu diğer asistanlar için bağımsız skill'i Skills CLI ile kurun:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Belirli bir asistanı hedeflemek için `--agent` kullanın:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Hermes Agent için tek dosyalı skill'i Hermes Agent'ın yerel skills komutuyla kurun:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Hermes Agent'ı ağırlıklı olarak repository analizi için kullanıyorsanız, Repomix'i doğrudan MCP server olarak çalıştıran [MCP Server](/tr/guide/mcp-server) kurulumu da iyi bir seçenektir.

## Ne İşe Yarar

Kurulduktan sonra doğal dil talimatlarıyla kod tabanlarını analiz edebilirsiniz.

### Uzak depoları analiz etme

```text
"Bu deponun yapısı nedir?
https://github.com/facebook/react"
```

### Yerel kod tabanlarını keşfetme

```text
"Bu projede neler var?
~/projects/my-app"
```

Bu özellik yalnızca kod tabanlarını anlamak için değil, aynı zamanda diğer depolarınıza referans vererek özellik uygulamak istediğinizde de kullanışlıdır.

## Nasıl Çalışır

Repomix Explorer becerisi, AI asistanlarına eksiksiz iş akışı boyunca rehberlik eder:

1. **Repomix komutlarını çalıştırır** - Depoları AI'ya uygun biçime paketler
2. **Çıktı dosyalarını analiz eder** - İlgili kodu bulmak için desen araması (grep) kullanır
3. **İçgörüler sunar** - Yapı, metrikler ve eyleme dönüştürülebilir öneriler rapor eder

## Örnek Kullanım Durumları

### Yeni Bir Kod Tabanını Anlama

```text
"Bu projenin mimarisini anlamak istiyorum.
https://github.com/vercel/next.js"
```

AI, repomix çalıştırır, çıktıyı analiz eder ve kod tabanına ilişkin yapılandırılmış bir genel bakış sunar.

### Belirli Desenleri Bulma

```text
"Bu depodaki kimlik doğrulamayla ilgili tüm kodları bul."
```

AI, kimlik doğrulama desenlerini arar, bulguları dosyaya göre kategorize eder ve kimlik doğrulamanın nasıl uygulandığını açıklar.

### Kendi Projelerinize Referans Verme

```text
"Diğer projemde yaptığıma benzer bir özellik uygulamak istiyorum.
~/projects/my-other-app"
```

AI, diğer deponuzu analiz eder ve kendi uygulamalarınıza referans vermenize yardımcı olur.

## Beceri İçeriği

Beceri şunları içerir:

- **Kullanıcı niyet tanıma** - Kullanıcıların kod tabanı analizi için kullandığı çeşitli ifade biçimlerini anlar
- **Repomix komut kılavuzu** - Hangi seçeneklerin kullanılacağını bilir (`--compress`, `--include` vb.)
- **Analiz iş akışı** - Paketlenmiş çıktıyı keşfetmek için yapılandırılmış yaklaşım
- **En iyi uygulamalar** - Tüm dosyaları okumadan önce grep kullanmak gibi verimlilik ipuçları

## İlgili Kaynaklar

- [Ajan Becerileri Oluşturma](/tr/guide/agent-skills-generation) - Kod tabanlarından kendi becerilerinizi oluşturun
- [Claude Code Eklentileri](/tr/guide/claude-code-plugins) - Claude Code için Repomix eklentileri
- [MCP Sunucusu](/tr/guide/mcp-server) - Alternatif entegrasyon yöntemi
