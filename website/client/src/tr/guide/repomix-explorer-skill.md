# Repomix Explorer Becerisi (Ajan Becerileri)

Repomix, AI kodlama asistanlarının Repomix CLI kullanarak kod tabanlarını analiz etmesini ve keşfetmesini sağlayan kullanıma hazır bir **Repomix Explorer** becerisi sunar.

Bu beceri; Claude Code, Cursor, Codex, GitHub Copilot ve daha fazlasını kapsayan çeşitli AI araçlarıyla çalışacak şekilde tasarlanmıştır.

## Hızlı Kurulum

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Bu komut, beceriyi AI asistanınızın beceriler dizinine (örn. `.claude/skills/`) kurar ve hemen kullanılabilir hale getirir.

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
