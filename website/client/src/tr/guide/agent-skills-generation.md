# Ajan Becerileri Oluşturma

Repomix, [Claude Ajan Becerileri](https://docs.anthropic.com/en/docs/claude-code/skills) biçiminde çıktı oluşturabilir; AI asistanları için yeniden kullanılabilir bir kod tabanı referansı olarak kullanılabilecek yapılandırılmış bir Beceriler dizini yaratır.

Bu özellik, özellikle uzak depolardan uygulamaları referans almak istediğinizde güçlüdür. Açık kaynak projelerinden Beceriler oluşturarak kendi kodunuz üzerinde çalışırken Claude'dan belirli desenleri veya uygulamaları referans almasını kolayca isteyebilirsiniz.

Tek bir paketlenmiş dosya oluşturmak yerine, Beceriler oluşturma AI anlayışına ve grep'e uygun aramaya optimize edilmiş çok sayıda referans dosyasından oluşan yapılandırılmış bir dizin oluşturur.

> [!NOTE]
> Bu deneysel bir özelliktir. Çıktı biçimi ve seçenekler, kullanıcı geri bildirimlerine göre gelecekteki sürümlerde değişebilir.

## Temel Kullanım

Yerel dizininizden Beceriler oluşturun:

```bash
# Mevcut dizinden Beceriler oluştur
repomix --skill-generate

# Özel Beceri adıyla oluştur
repomix --skill-generate my-project-reference

# Belirli bir dizinden oluştur
repomix path/to/directory --skill-generate

# Uzak depodan oluştur
repomix --remote https://github.com/user/repo --skill-generate
```

## Beceriler Konumu Seçimi

Komutu çalıştırdığınızda Repomix, Becerilerin nereye kaydedileceğini seçmenizi ister:

1. **Kişisel Beceriler** (`~/.claude/skills/`) - Makinenizdeki tüm projelerde kullanılabilir
2. **Proje Becerileri** (`.claude/skills/`) - Git aracılığıyla ekibinizle paylaşılır

Beceriler dizini zaten mevcutsa, üzerine yazılmasını onaylamanız istenir.

> [!TIP]
> Proje Becerileri oluştururken büyük dosyaları commit etmemek için bunları `.gitignore`'a eklemeyi düşünün:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Etkileşimsiz Kullanım

CI süreçleri ve otomasyon betikleri için `--skill-output` ve `--force` kullanarak tüm etkileşimli istemleri atlayabilirsiniz:

```bash
# Çıktı dizinini doğrudan belirtin (konum istemini atlar)
repomix --skill-generate --skill-output ./my-skills

# --force ile üzerine yazma onayını atla
repomix --skill-generate --skill-output ./my-skills --force

# Tam etkileşimsiz örnek
repomix --remote user/repo --skill-generate my-skill --skill-output ./output --force
```

| Seçenek | Açıklama |
| --- | --- |
| `--skill-output <path>` | Beceri çıktı dizin yolunu doğrudan belirtin (konum istemini atlar) |
| `-f, --force` | Tüm onay istemlerini atla (örn. beceri dizini üzerine yazma) |

## Oluşturulan Yapı

Beceriler şu yapıyla oluşturulur:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Ana Beceriler meta verisi ve belgeleri
└── references/
    ├── summary.md              # Amaç, biçim ve istatistikler
    ├── project-structure.md    # Satır sayılarıyla dizin ağacı
    ├── files.md                # Tüm dosya içerikleri (grep'e uygun)
    └── tech-stacks.md           # Diller, çerçeveler, bağımlılıklar
```

### Dosya Açıklamaları

#### SKILL.md

Şunları içeren ana Beceriler dosyası:
- Beceriler adı, açıklaması ve proje bilgileri
- Dosya sayısı, satır sayısı ve token sayısı
- Becerilerin nasıl kullanılacağına dair genel bakış
- Dosya konumları ve biçim açıklaması
- Yaygın kullanım durumları ve ipuçları

#### references/summary.md

Şunları içerir:
- **Amaç**: Bunun AI tüketimi için bir referans kod tabanı olduğunu açıklar
- **Dosya Yapısı**: Her referans dosyasında nelerin olduğunu belgeler
- **Kullanım Kılavuzları**: Becerilerin etkili kullanımı
- **İstatistikler**: Dosya türü, dil ve en büyük dosyalara göre dökümü

#### references/project-structure.md

Kolay dosya keşfi için dosya başına satır sayılarıyla dizin ağacı:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Sözdizimi vurgulama başlıklarıyla tüm dosya içerikleri, grep'e uygun aramaya optimize edilmiş:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stacks.md

Bağımlılık dosyalarından otomatik algılanan teknoloji yığını:
- **Diller**: TypeScript, JavaScript, Python vb.
- **Çerçeveler**: React, Next.js, Express, Django vb.
- **Çalışma Zamanı Sürümleri**: Node.js, Python, Go vb.
- **Paket Yöneticisi**: npm, pnpm, poetry vb.
- **Bağımlılıklar**: Tüm doğrudan ve geliştirme bağımlılıkları
- **Yapılandırma Dosyaları**: Algılanan tüm yapılandırma dosyaları

Şu dosyalardan algılanır: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml` vb.

## Otomatik Oluşturulan Beceri Adları

Herhangi bir ad sağlanmazsa Repomix bu deseni kullanarak otomatik bir ad oluşturur:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (kebab-case'e normalize edilir)
```

Beceri adları:
- Kebab-case'e dönüştürülür (küçük harf, kısa çizgiyle ayrılmış)
- En fazla 64 karakterle sınırlıdır
- Yol geçiş saldırılarına karşı korunur

## Repomix Seçenekleriyle Entegrasyon

Beceriler oluşturma, tüm standart Repomix seçeneklerine uygundur:

```bash
# Dosya filtrelemeyle Beceriler oluştur
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Sıkıştırmayla Beceriler oluştur
repomix --skill-generate --compress

# Uzak depodan Beceriler oluştur
repomix --remote yamadashy/repomix --skill-generate

# Belirli çıktı biçimi seçenekleriyle Beceriler oluştur
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Yalnızca Belge İçeren Beceriler

`--include` kullanarak yalnızca bir GitHub deposundan belgeler içeren Beceriler oluşturabilirsiniz. Bu, kendi kodunuz üzerinde çalışırken Claude'un belirli kütüphane veya çerçeve belgelerine referans vermesini istediğinizde kullanışlıdır:

```bash
# Claude Code Action belgeleri
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite belgeleri
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React belgeleri
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Sınırlamalar

`--skill-generate` seçeneği şunlarla birlikte kullanılamaz:
- `--stdout` - Beceriler çıktısı dosya sistemine yazılmasını gerektirir
- `--copy` - Beceriler çıktısı bir dizindir, panoya kopyalanamaz

## Oluşturulan Becerileri Kullanma

Oluşturulduktan sonra Becerileri Claude ile kullanabilirsiniz:

1. **Claude Code**: Beceriler `~/.claude/skills/` veya `.claude/skills/` konumuna kaydedildiyse otomatik olarak kullanılabilir
2. **Claude Web**: Kod tabanı analizi için Beceriler dizinini Claude'a yükleyin
3. **Ekip Paylaşımı**: Ekip genelinde erişim için `.claude/skills/` dizinini deponuza commit edin

## Örnek İş Akışı

### Kişisel Referans Kütüphanesi Oluşturma

```bash
# İlginç bir açık kaynak projesini klonlayın ve analiz edin
repomix --remote facebook/react --skill-generate react-reference

# Beceriler ~/.claude/skills/react-reference/ konumuna kaydedilir
# Artık herhangi bir Claude konuşmasında React'in kod tabanını referans alabilirsiniz
```

### Ekip Projesi Belgeleri

```bash
# Proje dizininde
cd my-project

# Ekibiniz için Beceriler oluşturun
repomix --skill-generate

# İstendiğinde "Proje Becerileri"ni seçin
# Beceriler .claude/skills/repomix-reference-my-project/ konumuna kaydedilir

# Ekibinizle commit edin ve paylaşın
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## İlgili Kaynaklar

- [Claude Code Eklentileri](/tr/guide/claude-code-plugins) - Claude Code için Repomix eklentileri hakkında bilgi edinin
- [MCP Sunucusu](/tr/guide/mcp-server) - Alternatif entegrasyon yöntemi
- [Kod Sıkıştırma](/tr/guide/code-compress) - Sıkıştırmayla token sayısını azaltın
- [Yapılandırma](/tr/guide/configuration) - Repomix davranışını özelleştirin
