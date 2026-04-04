# Kod Sıkıştırma

Kod sıkıştırma, uygulama ayrıntılarını kaldırırken temel kod yapılarını akıllıca çıkaran güçlü bir özelliktir. Bu özellik, kod tabanınız hakkındaki önemli yapısal bilgileri korurken token sayısını azaltmak için özellikle kullanışlıdır.

> [!NOTE]
> Bu, kullanıcı geri bildirimleri ve gerçek dünya kullanımına göre aktif olarak geliştireceğimiz deneysel bir özelliktir.

## Temel Kullanım

`--compress` bayrağını kullanarak kod sıkıştırmayı etkinleştirin:

```bash
repomix --compress
```

Uzak depolarla da kullanabilirsiniz:

```bash
repomix --remote user/repo --compress
```

## Nasıl Çalışır

Sıkıştırma algoritması, uygulama ayrıntılarını kaldırırken temel yapısal öğeleri çıkarmak ve korumak için tree-sitter ayrıştırmasını kullanarak kodu işler.

Sıkıştırma şunları korur:
- Fonksiyon ve metod imzaları
- Arayüz ve tür tanımları
- Sınıf yapıları ve özellikleri
- Önemli yapısal öğeler

Şunları kaldırır:
- Fonksiyon ve metod uygulamaları
- Döngü ve koşullu mantık ayrıntıları
- İç değişken bildirimleri
- Uygulamaya özgü kodlar

### Örnek

Orijinal TypeScript kodu:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

Sıkıştırma sonrası:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Yapılandırma

Sıkıştırmayı yapılandırma dosyasında etkinleştirebilirsiniz:

```json
{
  "output": {
    "compress": true
  }
}
```

## Kullanım Senaryoları

Kod sıkıştırma özellikle şu durumlarda işe yarar:
- Kod yapısı ve mimarisini analiz ederken
- LLM işleme için token sayısını azaltırken
- Üst düzey dokümantasyon oluştururken
- Kod kalıplarını ve imzaları anlamaya çalışırken
- API ve arayüz tasarımlarını paylaşırken

## İlgili Seçenekler

Sıkıştırmayı diğer seçeneklerle birleştirebilirsiniz:
- `--remove-comments`: Kod yorumlarını kaldırır (bkz. [Yorum Kaldırma](/tr/guide/comment-removal))
- `--remove-empty-lines`: Boş satırları kaldırır
- `--output-show-line-numbers`: Çıktıya satır numaraları ekler

## İlgili Kaynaklar

- [Yorum Kaldırma](/tr/guide/comment-removal) - Token sayısını daha da azaltmak için yorumları kaldırın
- [Yapılandırma](/tr/guide/configuration) - Yapılandırma dosyanızda `output.compress` ayarlayın
- [Komut Satırı Seçenekleri](/tr/guide/command-line-options) - Tam CLI referansı
