# Özel Talimatlar

Repomix, çıktı dosyasına dahil edilecek özel talimatlar eklemenizi sağlar. Bu özellik, depoyu işleyen yapay zeka sistemlerine bağlam veya belirli yönergeler sağlamak için kullanışlıdır.

## Kullanım

Özel talimat eklemek için deponuzun kök dizininde bir markdown dosyası oluşturun (örneğin `repomix-instruction.md`). Ardından `repomix.config.json` dosyasında bu dosyanın yolunu belirtin:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

Bu dosyanın içeriği çıktıda "Instruction" bölümüne dahil edilecektir.

## Örnek

```markdown
# Depo Talimatları

Bu depo, Repomix aracının kaynak kodunu içermektedir. Kodu analiz ederken lütfen şu yönergelere uyun:

1. `src/core` dizinindeki temel işlevselliğe odaklanın.
2. `src/core/security` içindeki güvenlik kontrollerine özellikle dikkat edin.
3. `tests` dizinindeki dosyaları yoksayın.
```

Bu ayar, çıktıda aşağıdaki bölümü oluşturacaktır:

```xml
<instruction>
# Depo Talimatları

Bu depo, Repomix aracının kaynak kodunu içermektedir. Kodu analiz ederken lütfen şu yönergelere uyun:

1. `src/core` dizinindeki temel işlevselliğe odaklanın.
2. `src/core/security` içindeki güvenlik kontrollerine özellikle dikkat edin.
3. `tests` dizinindeki dosyaları yoksayın.
</instruction>
```

## İlgili Kaynaklar

- [Yapılandırma](/tr/guide/configuration) - Yapılandırma dosyanızda `output.instructionFilePath` ayarlayın
- [Çıktı Formatları](/tr/guide/output) - Farklı çıktı formatları hakkında bilgi edinin
- [Prompt Örnekleri](/tr/guide/prompt-examples) - AI analizi için örnek promptlar
- [Kullanım Senaryoları](/tr/guide/use-cases) - AI ile Repomix kullanmanın gerçek dünya örnekleri
