# Repomix ile Başlarken

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix, tüm deponuzu tek bir yapay zeka dostu dosyada paketleyen bir araçtır. ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama ve daha fazlası gibi Büyük Dil Modelleri'ne (LLM) kod tabanınızı beslemek için tasarlanmıştır.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Hızlı Başlangıç

Proje dizininizde şu komutu çalıştırın:

```bash
npx repomix@latest
```

Hepsi bu kadar! Tüm deponuzu yapay zeka dostu bir formatta içeren bir `repomix-output.xml` dosyası oluşturulacak.

Ardından bu dosyayı bir yapay zeka asistanına şu şekilde bir mesajla gönderebilirsiniz:

```text
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

## Temel Özellikler

- **Yapay Zeka İçin Optimize Çıktı**: Kod tabanınızı yapay zekanın kolayca işleyebileceği biçimde düzenler
- **Token Sayımı**: LLM bağlam limitleri için token kullanımını takip eder
- **Git Farkındalıklı**: `.gitignore` ve `.git/info/exclude` dosyalarınıza uyar
- **Güvenlik Odaklı**: Hassas bilgileri tespit eder
- **Çoklu Çıktı Formatları**: Düz metin, XML veya Markdown arasında seçim yapın

## Sırada Ne Var?

- [Kurulum Rehberi](installation.md): Repomix'i kurmanın farklı yolları
- [Kullanım Rehberi](usage.md): Temel ve gelişmiş özellikler hakkında bilgi edinin
- [Yapılandırma](configuration.md): Repomix'i ihtiyaçlarınıza göre özelleştirin
- [Güvenlik Özellikleri](security.md): Güvenlik kontrolleri hakkında bilgi edinin
- [Çıktı Formatları](output.md): AI modeliniz için en iyi formatı seçin
- [MCP Sunucusu](mcp-server.md): Repomix'i AI asistanlarıyla doğrudan entegre edin

## Topluluk

Şu konular için [Discord topluluğumuza](https://discord.gg/wNYzTwZFku) katılın:
- Repomix ile ilgili yardım alma
- Deneyimlerinizi paylaşma
- Yeni özellik önerme
- Diğer kullanıcılarla bağlantı kurma

## Destek

Bir hata mı buldunuz ya da yardıma mı ihtiyacınız var?
- [GitHub'da bir sorun açın](https://github.com/yamadashy/repomix/issues)
- Discord sunucumuza katılın
- [Belgelere](https://repomix.com) göz atın
