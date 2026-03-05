# Yorum Kaldırma

Repomix, çıktı dosyası oluştururken kod tabanınızdaki yorumları otomatik olarak kaldırabilir. Bu özellik, gereksiz gürültüyü azaltarak asıl koda odaklanmanıza yardımcı olur.

## Kullanım

Yorum kaldırmayı etkinleştirmek için `repomix.config.json` dosyasında `removeComments` seçeneğini `true` olarak ayarlayın:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Desteklenen Diller

Repomix, aşağıdakiler dahil geniş bir programlama dili yelpazesinde yorum kaldırmayı destekler:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- Ve daha fazlası...

## Örnek

Aşağıdaki JavaScript kodu verildiğinde:

```javascript
// This is a single-line comment
function test() {
  /* This is a
     multi-line comment */
  return true;
}
```

Yorum kaldırma etkinleştirildiğinde çıktı şu şekilde olacaktır:

```javascript
function test() {
  return true;
}
```

## Notlar

- Yorum kaldırma işlemi, satır numarası ekleme gibi diğer işlem adımlarından önce gerçekleştirilir.
- JSDoc yorumları gibi bazı yorumlar, dile ve bağlama göre korunabilir.
