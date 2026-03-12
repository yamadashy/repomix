# Repomix'e Katkıda Bulunma

**Repomix**'e gösterdiğiniz ilgi için teşekkürler! Projeyi daha da iyi hale getirmenize yardımcı olmaktan memnuniyet duyarız. Bu kılavuz, projeye katkıda bulunmaya başlamanız için gereken bilgileri sunar.

## Nasıl Katkıda Bulunabilirsiniz

- **Depoyu Yıldızlayın**: [Depoyu yıldızlayarak](https://github.com/yamadashy/repomix) destek gösterin!
- **Konu Açın**: Bir hata mı buldunuz? Yeni bir özellik fikriniz mi var? [Konu açarak](https://github.com/yamadashy/repomix/issues) bize bildirin.
- **Pull Request Gönderin**: Düzeltilmesi veya iyileştirilmesi gereken bir şey mi gördünüz? Hemen bir PR gönderin!
- **Duyurun**: Repomix deneyiminizi sosyal medyada, bloglarda veya teknoloji topluluğunuzda paylaşın.
- **Repomix'i Kullanın**: En değerli geri bildirimler gerçek kullanımdan gelir; Repomix'i kendi projelerinize entegre etmekten çekinmeyin!
- **Sponsor Olun**: [Sponsor olarak](https://github.com/sponsors/yamadashy) Repomix'in gelişimine destek verin.

## Geliştirme Ortamı Kurulumu

### Ön Koşullar

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (isteğe bağlı; web sitesini çalıştırmak veya konteyner içinde geliştirme için)

### Yerel Geliştirme

Repomix'i yerel geliştirme için kurmak üzere:

```bash
# Clone repository
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Install dependencies
npm install

# Run CLI
npm run repomix
```

### Docker ile Geliştirme

Repomix'i Docker kullanarak da çalıştırabilirsiniz:

```bash
# Build image
docker build -t repomix .

# Run container
docker run -v ./:/app -it --rm repomix
```

### Proje Yapısı

Proje aşağıdaki dizinlere göre organize edilmiştir:

```
src/
├── cli/          # CLI implementation
├── config/       # Configuration handling
├── core/         # Core functionality
│   ├── file/     # File handling
│   ├── metrics/  # Metrics calculation
│   ├── output/   # Output generation
│   ├── security/ # Security checks
├── mcp/          # MCP server integration
└── shared/       # Shared utilities
tests/            # Tests mirroring src/ structure
website/          # Documentation website
├── client/       # Frontend (VitePress)
└── server/       # Backend API
```

## Geliştirme Komutları

```bash
# Run CLI
npm run repomix

# Run tests
npm run test
npm run test-coverage

# Lint code
npm run lint
```

### Test

Test için [Vitest](https://vitest.dev/) kullanıyoruz. Testleri çalıştırmak için:

```bash
# Run tests
npm run test

# Test coverage
npm run test-coverage

# Linting
npm run lint-biome
npm run lint-ts
npm run lint-secretlint
```

## Kod Stili

- Linting ve biçimlendirme için [Biome](https://biomejs.dev/) kullanın
- Test edilebilirlik için bağımlılık enjeksiyonu uygulayın
- Dosyaları 250 satırın altında tutun
- Yeni özellikler için test ekleyin

Linting ve biçimlendirme için [Biome](https://biomejs.dev/) kullanıyoruz. Kodunuzun stil kılavuzuna uygunluğunu aşağıdaki komutla doğrulayın:

```bash
npm run lint
```

## Pull Request Kılavuzu

Pull Request göndermeden önce şunları sağlayın:

1. Kodunuz tüm testleri geçiyor: `npm run test` komutunu çalıştırın
2. Kodunuz linting standartlarımıza uyuyor: `npm run lint` komutunu çalıştırın
3. İlgili belgeleri güncellediniz
4. Mevcut kod stilini takip ettiniz

## Web Sitesi Geliştirme

Repomix web sitesi [VitePress](https://vitepress.dev/) ile oluşturulmuştur. Web sitesini yerel olarak çalıştırmak için:

```bash
# Prerequisites: Docker must be installed on your system

# Start the website development server
npm run website

# Access the website at http://localhost:5173/
```

Belgeleri güncellerken yalnızca İngilizce sürümü güncellemeniz yeterlidir. Diğer dillere çeviriler, proje sorumluları tarafından yapılacaktır.

## Sürüm Yayınlama Süreci

Proje sorumluları ve sürüm süreciyle ilgilenen katkıda bulunanlar için:

1. Sürümü güncelleyin
```bash
npm version patch  # or minor/major
```

2. Testleri çalıştırın ve derleyin
```bash
npm run test-coverage
npm run build
```

3. Yayınlayın
```bash
npm publish
```

Yeni sürümler proje sorumlusu tarafından yönetilmektedir. Bir sürüme ihtiyaç duyulduğunu düşünüyorsanız, bunu tartışmak için bir konu açın.

## Yardıma mı İhtiyacınız Var?

- [Konu açın](https://github.com/yamadashy/repomix/issues)
- [Discord'a katılın](https://discord.gg/wNYzTwZFku)
