<script setup>
import YouTubeVideo from '../../../components/YouTubeVideo.vue';
</script>

# Kullanım Senaryoları

Repomix'in en büyük gücü, ChatGPT, Claude, Gemini, Grok gibi abonelik tabanlı servislerde maliyet kaygısı olmadan çalışabilmesi ve dosya dosya keşfetme ihtiyacını ortadan kaldıran tam kod tabanı bağlamı sunmasıdır. Bu da analizleri daha hızlı ve çoğu zaman daha doğru hale getirir.

Tüm kod tabanı bağlam olarak mevcut olduğunda Repomix; uygulama planlama, hata araştırma, üçüncü taraf kütüphane güvenlik kontrolleri, dokümantasyon oluşturma ve çok daha fazlası için geniş bir kullanım yelpazesi sunar.


## Gerçek Dünya Kullanım Senaryoları

### Repomix'i AI Asistanlarıyla Kullanma (Grok Örneği)
Bu video, Repomix'in web arayüzü aracılığıyla GitHub depolarının AI tarafından okunabilir formatlara nasıl dönüştürüldüğünü ve stratejik planlama ile kod analizi için Grok gibi AI asistanlarına nasıl yüklendiğini göstermektedir.

**Kullanım Senaryosu**: AI araçları için hızlı depo dönüştürme
- Web arayüzü üzerinden herkese açık GitHub depolarını paketleyin
- Format seçin: XML, Markdown veya Düz metin
- Kod tabanını anlamak için AI asistanlarına yükleyin

<YouTubeVideo video-id="XTifjfeMp4M" :start="488" />

### Repomix'i Simon Willison'ın LLM CLI Aracıyla Kullanma
Repomix'i [Simon Willison'ın llm CLI aracıyla](https://github.com/simonw/llm) nasıl birleştireceğinizi ve tüm kod tabanlarını nasıl analiz edeceğinizi öğrenin. Bu video, depoları XML formatına paketlemeyi ve soru-cevap, dokümantasyon oluşturma ile uygulama planlama amacıyla çeşitli LLM'lere beslemeyi göstermektedir.

**Kullanım Senaryosu**: LLM CLI ile geliştirilmiş kod tabanı analizi
- `repomix` komutuyla depoları paketleyin
- Doğrudan GitHub'dan paketlemek için `--remote` bayrağını kullanın
- Çıktıyı `-f repo-output.xml` ile LLM komutlarına ekleyin

<YouTubeVideo video-id="UZ-9U1W0e4o" :start="592" />

### LLM Kod Üretme İş Akışı
Bir geliştiricinin Claude ve Aider gibi araçlara tam kod tabanı bağlamı sağlamak için Repomix'i nasıl kullandığını öğrenin. Bu yaklaşım, AI destekli artımlı geliştirmeyi, daha akıllı kod incelemelerini ve otomatik dokümantasyonu mümkün kılarken proje genelinde tutarlılığı da korur.

**Kullanım Senaryosu**: AI yardımıyla kolaylaştırılmış geliştirme iş akışı
- Tam kod tabanı bağlamını çıkarın
- Daha iyi kod üretimi için LLM'lere bağlam sağlayın
- Tüm proje genelinde tutarlılığı koruyun

[Tam iş akışını okuyun →](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

### LLM'ler için Bilgi Veri Paketleri Oluşturma
Yazarlar, blog yazıları, dokümantasyon ve kitaplar gibi yazılı içeriklerini LLM ile uyumlu formatlara paketlemek için Repomix'i kullanmakta; bu sayede okuyucuların AI destekli soru-cevap sistemleri aracılığıyla uzmanlıklarıyla etkileşime geçmesini sağlamaktadır.

**Kullanım Senaryosu**: Bilgi paylaşımı ve etkileşimli dokümantasyon
- Dokümantasyonu AI dostu formatlara paketleyin
- İçerikle etkileşimli soru-cevap olanağı sunun
- Kapsamlı bilgi tabanları oluşturun

[Bilgi veri paketleri hakkında daha fazla bilgi →](https://lethain.com/competitive-advantage-author-llms/)


## Diğer Örnekler

### Kod Anlama ve Kalite

#### Hata Araştırma
Birden fazla dosya ve bağımlılık genelindeki sorunların kök nedenini belirlemek için tüm kod tabanınızı AI ile paylaşın.

```
Bu kod tabanında sunucuda bir bellek sızıntısı sorunu var. Uygulama birkaç saat çalıştıktan sonra çöküyor. Lütfen tüm kod tabanını analiz edin ve olası nedenleri belirleyin.
```

#### Uygulama Planlama
Tüm kod tabanı mimarinizi ve mevcut kalıpları göz önünde bulunduran kapsamlı uygulama tavsiyeleri alın.

```
Bu uygulamaya kullanıcı kimlik doğrulaması eklemek istiyorum. Lütfen mevcut kod tabanı yapısını inceleyin ve mevcut mimariyle uyumlu en iyi yaklaşımı önerin.
```

#### Yeniden Yapılandırma Desteği
Tüm kod tabanınızda tutarlılığı koruyan yeniden yapılandırma önerileri alın.

```
Bu kod tabanının bakım kolaylığını artırmak için yeniden yapılandırılması gerekiyor. Lütfen mevcut işlevselliği koruyarak iyileştirmeler önerin.
```

#### Kod İncelemesi
Tüm proje bağlamını göz önünde bulunduran kapsamlı kod incelemesi.

```
Bu kod tabanını kapsamlı bir kod incelemesi yapıyormuş gibi inceleyin. Kod kalitesine, olası sorunlara ve iyileştirme önerilerine odaklanın.
```

#### Dokümantasyon Oluşturma
Tüm kod tabanınızı kapsayan kapsamlı dokümantasyon oluşturun.

```
Bu kod tabanı için API dokümantasyonu, kurulum talimatları ve geliştirici kılavuzları dahil olmak üzere kapsamlı bir dokümantasyon oluşturun.
```

#### Bilgi Çıkarma
Kod tabanınızdan teknik bilgi ve kalıpları çıkarın.

```
Bu kod tabanında kullanılan temel mimari kalıpları, tasarım kararlarını ve en iyi uygulamaları çıkarın ve belgeleyin.
```

#### Kod Tabanına Oryantasyon
Yeni ekip üyelerinin kod tabanı yapısını ve temel kavramları hızla anlamasına yardımcı olun.

```
Yeni bir geliştiricinin bu kod tabanını anlamasına yardım ediyorsunuz. Lütfen mimariye genel bir bakış sunun, ana bileşenleri ve aralarındaki etkileşimleri açıklayın ve önce incelenmesi gereken en önemli dosyaları vurgulayın.
```

### Güvenlik ve Bağımlılıklar

#### Bağımlılık Güvenlik Denetimi
Güvenlik sorunları için üçüncü taraf kütüphaneleri ve bağımlılıkları analiz edin.

```
Bu kod tabanındaki tüm üçüncü taraf bağımlılıkları olası güvenlik açıkları açısından analiz edin ve gerektiğinde daha güvenli alternatifler önerin.
```

#### Kütüphane Entegrasyon Analizi
Harici kütüphanelerin kod tabanınıza nasıl entegre edildiğini anlayın.

```
Bu kod tabanının harici kütüphanelerle nasıl entegre olduğunu analiz edin ve daha iyi bakım kolaylığı için iyileştirmeler önerin.
```

#### Kapsamlı Güvenlik Taraması
Olası güvenlik açıkları için tüm kod tabanınızı analiz edin ve uygulanabilir öneriler alın.

```
Bu kod tabanının kapsamlı bir güvenlik denetimini gerçekleştirin. SQL enjeksiyonu, XSS, kimlik doğrulama sorunları ve güvensiz veri işleme gibi yaygın güvenlik açıklarını kontrol edin. Her bulgu için özel öneriler sunun.
```

### Mimari ve Performans

#### API Tasarım İncelemesi
Tutarlılık, en iyi uygulamalar ve olası iyileştirmeler açısından API tasarımınızı inceleyin.

```
Bu kod tabanındaki tüm REST API uç noktalarını inceleyin. Adlandırma kurallarındaki tutarlılığı, HTTP yöntemlerinin kullanımını, yanıt formatlarını ve hata işlemeyi kontrol edin. REST en iyi uygulamalarına göre iyileştirmeler önerin.
```

#### Framework Geçiş Planlaması
Modern framework veya dillere güncelleme için ayrıntılı geçiş planları alın.

```
Bu kod tabanını [mevcut framework]'ten [hedef framework]'e dönüştürmek için adım adım bir geçiş planı oluşturun. Risk değerlendirmesi, tahmini çalışma süreleri ve önerilen geçiş sırasını dahil edin.
```

#### Performans Optimizasyonu
Performans darboğazlarını belirleyin ve optimizasyon önerileri alın.

```
Bu kod tabanını performans darboğazları açısından analiz edin. Verimsiz algoritmalar, gereksiz veritabanı sorguları, bellek sızıntıları ve önbellekleme veya optimizasyondan fayda sağlayabilecek alanları araştırın.
```

## İlgili Kaynaklar

- [Prompt Örnekleri](/tr/guide/prompt-examples) - AI analizi için daha fazla prompt şablonu
- [Çıktı Formatları](/tr/guide/output) - AI modeliniz için en iyi formatı seçin
- [Özel Talimatlar](/tr/guide/custom-instructions) - AI analizini yönlendirmek için bağlam ekleyin
- [GitHub Depo İşleme](/tr/guide/remote-repository-processing) - Uzak depoları analiz edin
