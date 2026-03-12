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
