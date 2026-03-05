---
layout: home
title: Repomix
titleTemplate: Kod tabanınızı yapay zeka dostu formatlara dönüştürün
aside: false
editLink: false

features:
  - icon: 🤖
    title: Yapay Zeka İçin Optimize
    details: Kod tabanınızı yapay zekanın kolayca anlayıp işleyebileceği bir biçimde düzenler.

  - icon: ⚙️
    title: Git Farkındalıklı
    details: .gitignore dosyalarınıza otomatik olarak uyar.

  - icon: 🛡️
    title: Güvenlik Odaklı
    details: Hassas bilgilerin dahil edilmesini tespit edip önlemek için Secretlint ile güçlü güvenlik kontrolleri uygular.

  - icon: 📊
    title: Token Sayımı
    details: Her dosya ve tüm depo için token sayısı sağlar; LLM bağlam limitleri için oldukça kullanışlıdır.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Açık Kaynak Ödülleri Adaylığı

Onurlandırıldık! Repomix, [JSNation Open Source Awards 2025](https://osawards.com/javascript/) etkinliğinde **Powered by AI** kategorisine aday gösterildi.

Bu, Repomix'i kullanan ve destekleyen herkesiz olmazdı. Teşekkürler!

## Repomix Nedir?

Repomix, tüm kod tabanınızı tek bir yapay zeka dostu dosyada paketleyen güçlü bir araçtır. İster kod incelemesi yapıyor, ister yeniden yapılandırma üzerinde çalışıyor, ister projeniz için yapay zekadan yardım alıyor olun; Repomix tüm depo bağlamını yapay zeka araçlarıyla paylaşmanızı kolaylaştırır.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Hızlı Başlangıç

Repomix ile paketlenmiş bir dosya (`repomix-output.xml`) oluşturduktan sonra, bunu bir yapay zeka asistanına (ChatGPT, Claude gibi) şu şekilde bir mesajla gönderebilirsiniz:

```
Bu dosya, depodaki tüm dosyaları tek bir araya getirir.
Kodu yeniden yapılandırmak istiyorum, önce lütfen gözden geçirin.
```

Yapay zeka tüm kod tabanınızı analiz ederek kapsamlı içgörüler sunar:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Belirli değişiklikleri tartışırken yapay zeka kod üretmenize yardımcı olabilir. Claude'un Artifacts gibi özellikleriyle, birbirine bağımlı birden fazla dosya bile alabilirsiniz:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Keyifli kodlamalar! 🚀

## Neden Repomix?

Repomix'in gücü, ChatGPT, Claude, Gemini, Grok gibi abonelik tabanlı hizmetlerle maliyet kaygısı olmadan çalışabilmesinden gelir. Aynı zamanda dosya gezinme ihtiyacını ortadan kaldıran tam kod tabanı bağlamı sunarak analizi daha hızlı ve çoğu zaman daha doğru hale getirir.

Tüm kod tabanı bağlam olarak mevcut olduğunda Repomix; uygulama planlaması, hata araştırması, üçüncü taraf kütüphane güvenlik kontrolleri, dokümantasyon üretimi ve çok daha fazlası dahil olmak üzere geniş bir kullanım yelpazesine olanak tanır.

## CLI Aracını Kullanma {#using-the-cli-tool}

Repomix, güçlü özellikler ve özelleştirme seçenekleri sunan bir komut satırı aracı olarak kullanılabilir.

**CLI aracı, yerel olarak kurulu git'inizi kullandığı için özel depolara erişebilir.**

### Hızlı Başlangıç

Repomix'i kurulum yapmadan proje dizininizde hemen deneyebilirsiniz:

```bash
npx repomix@latest
```

Ya da tekrar kullanım için global olarak kurabilirsiniz:

```bash
# npm ile kurulum
npm install -g repomix

# yarn ile alternatif
yarn global add repomix

# bun ile alternatif
bun add -g repomix

# Homebrew ile alternatif (macOS/Linux)
brew install repomix

# Ardından herhangi bir proje dizininde çalıştırın
repomix
```

Hepsi bu kadar! Repomix, mevcut dizininizde yapay zeka dostu bir formatta tüm deponuzu içeren bir `repomix-output.xml` dosyası oluşturacak.



### Kullanım

Tüm depoyu paketlemek için:

```bash
repomix
```

Belirli bir dizini paketlemek için:

```bash
repomix path/to/directory
```

[Glob desenleri](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) kullanarak belirli dosya veya dizinleri paketlemek için:

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Belirli dosya veya dizinleri dışarıda bırakmak için:

```bash
repomix --ignore "**/*.log,tmp/"
```

Uzak bir depoyu paketlemek için:
```bash
# Kısa biçim kullanarak
npx repomix --remote yamadashy/repomix

# Tam URL kullanarak (dal ve belirli yolları destekler)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Commit URL'si kullanarak
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Yeni bir yapılandırma dosyası (`repomix.config.json`) başlatmak için:

```bash
repomix --init
```

Paketlenmiş dosyayı oluşturduktan sonra Claude, ChatGPT ve Gemini gibi Üretken Yapay Zeka araçlarıyla kullanabilirsiniz.

#### Docker Kullanımı

Repomix'i Docker ile de çalıştırabilirsiniz 🐳
Bu, Repomix'i izole bir ortamda çalıştırmak veya konteyner kullanmayı tercih edenler için idealdir.

Temel kullanım (mevcut dizin):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Belirli bir dizini paketlemek için:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Uzak bir depoyu işleyip `output` dizinine çıktı almak için:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Çıktı Formatları

Tercih ettiğiniz çıktı formatını seçin:

```bash
# XML formatı (varsayılan)
repomix --style xml

# Markdown formatı
repomix --style markdown

# JSON formatı
repomix --style json

# Düz metin formatı
repomix --style plain
```

### Özelleştirme

Kalıcı ayarlar için `repomix.config.json` oluşturun:

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

## Gerçek Dünya Kullanım Örnekleri

### [LLM Kod Üretimi İş Akışı](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Bir geliştirici, mevcut kod tabanlarından kod bağlamı çıkarmak için Repomix'i nasıl kullandığını, ardından artımlı geliştirmeler, kod incelemeleri ve otomatik dokümantasyon üretimi için Claude ve Aider gibi LLM'lerden nasıl yararlandığını paylaşıyor.

### [LLM'ler için Bilgi Veri Paketleri Oluşturma](https://lethain.com/competitive-advantage-author-llms/)

Yazarlar, blog yazıları, belgeler ve kitaplar gibi yazılı içeriklerini LLM uyumlu formatlara paketlemek için Repomix'i kullanıyor; bu sayede okuyucular yapay zeka destekli soru-cevap sistemleri aracılığıyla uzmanlıklarıyla etkileşime girebiliyor.

[Daha fazla kullanım örneğini keşfedin →](/tr/guide/use-cases)

## İleri Düzey Kullanıcı Rehberi

Repomix, gelişmiş kullanım senaryoları için güçlü özellikler sunar. İşte ileri düzey kullanıcılar için bazı temel rehberler:

- **[MCP Sunucusu](/tr/guide/mcp-server)** - Yapay zeka asistanları için Model Context Protocol entegrasyonu
- **[GitHub Actions](/tr/guide/github-actions)** - CI/CD iş akışlarında kod tabanı paketlemeyi otomatikleştirme
- **[Kod Sıkıştırma](/tr/guide/code-compress)** - Tree-sitter tabanlı akıllı sıkıştırma (yaklaşık %70 token azaltımı)
- **[Kütüphane Olarak Kullanım](/tr/guide/development/using-repomix-as-a-library)** - Repomix'i Node.js uygulamalarınıza entegre etme
- **[Özel Talimatlar](/tr/guide/custom-instructions)** - Çıktılara özel istemler ve talimatlar ekleme
- **[Güvenlik Özellikleri](/tr/guide/security)** - Yerleşik Secretlint entegrasyonu ve güvenlik kontrolleri
- **[En İyi Uygulamalar](/tr/guide/tips/best-practices)** - Kanıtlanmış stratejilerle yapay zeka iş akışlarınızı optimize edin

### Daha Fazla Örnek
::: tip Daha fazla yardıma mı ihtiyacınız var? 💡
Kapsamlı belgelerimizi [Rehber](/tr/guide/) bölümünden inceleyin ya da daha fazla örnek ve kaynak kod için [GitHub Deposunu](https://github.com/yamadashy/repomix) ziyaret edin.
:::

</div>
