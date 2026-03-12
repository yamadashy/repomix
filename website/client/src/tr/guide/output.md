# Çıktı Formatları

Repomix dört çıktı formatını destekler:
- XML (varsayılan)
- Markdown
- JSON
- Düz Metin

## XML Formatı

```bash
repomix --style xml
```

XML formatı, AI işleme için optimize edilmiştir:

```xml
This file is a merged representation of the entire codebase...

<file_summary>
(Metadata and AI instructions)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// File contents here
</file>
</files>

<git_logs>
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
</git_logs>
```

### Neden Varsayılan Format Olarak XML?
Repomix, kapsamlı araştırma ve testlere dayanarak XML'i varsayılan çıktı formatı olarak kullanmaktadır. Bu karar hem deneysel kanıtlara hem de AI destekli kod analizi için pratik değerlendirmelere dayanmaktadır.

XML tercihimiz, başlıca AI sağlayıcılarının resmi önerilerinden büyük ölçüde etkilenmiştir:
- **Anthropic (Claude)**: İstemleri yapılandırmak için XML etiketlerini açıkça önererek "Claude'un eğitim sırasında bu tür istemlere maruz kaldığını" belirtmektedir ([kaynak](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Karmaşık görevler için XML dahil yapılandırılmış formatları önermektedir ([dokümantasyon](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Karmaşık senaryolarda yapılandırılmış istem kullanımını savunmaktadır ([duyuru](https://x.com/OpenAIDevs/status/1890147300493914437), [kılavuz](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Markdown Formatı

```bash
repomix --style markdown
```

Markdown, okunabilir biçimlendirme sağlar:

````markdown
This file is a merged representation of the entire codebase...

# File Summary
(Metadata and AI instructions)

# Directory Structure
```
src/
index.ts
utils/
helper.ts
```

# Files

## File: src/index.ts
```typescript
// File contents here
```

# Git Logs
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## JSON Formatı

```bash
repomix --style json
```

JSON formatı, camelCase özellik adlarıyla yapılandırılmış ve programlı olarak erişilebilir çıktı sağlar:

```json
{
  "fileSummary": {
    "generationHeader": "This file is a merged representation of the entire codebase, combined into a single document by Repomix.",
    "purpose": "This file contains a packed representation of the entire repository's contents...",
    "fileFormat": "The content is organized as follows...",
    "usageGuidelines": "- This file should be treated as read-only...",
    "notes": "- Some files may have been excluded based on .gitignore rules..."
  },
  "userProvidedHeader": "Custom header text if specified",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// File contents here",
    "src/utils.js": "// File contents here"
  },
  "instruction": "Custom instructions from instructionFilePath"
}
```

### JSON Formatının Avantajları

JSON formatı şunlar için idealdir:
- **Programlı işleme**: Herhangi bir programlama dilindeki JSON kütüphaneleriyle kolayca ayrıştırılabilir ve düzenlenebilir
- **API entegrasyonu**: Web servisleri ve uygulamalar tarafından doğrudan tüketilebilir
- **AI araç uyumluluğu**: Makine öğrenmesi ve AI sistemleri için optimize edilmiş yapılandırılmış format
- **Veri analizi**: `jq` gibi araçlarla belirli bilgilerin kolay çıkarımı

### `jq` ile JSON Çıktısını Kullanma

JSON formatı, belirli bilgilerin programlı olarak çıkarılmasını kolaylaştırır. İşte yaygın örnekler:

#### Temel Dosya İşlemleri
```bash
# List all file paths
cat repomix-output.json | jq -r '.files | keys[]'

# Count total number of files
cat repomix-output.json | jq '.files | keys | length'

# Extract specific file content
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Dosya Filtreleme ve Analiz
```bash
# Find files by extension
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Get files containing specific text
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Create a file list with character counts
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) characters"'
```

#### Meta Veri Çıkarma
```bash
# Extract directory structure
cat repomix-output.json | jq -r '.directoryStructure'

# Get file summary information
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Extract user-provided header (if exists)
cat repomix-output.json | jq -r '.userProvidedHeader // "No header provided"'

# Get custom instructions
cat repomix-output.json | jq -r '.instruction // "No instructions provided"'
```

#### Gelişmiş Analiz
```bash
# Find largest files by content length
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Search for files containing specific patterns
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Extract file paths matching multiple extensions
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Düz Metin Formatı

```bash
repomix --style plain
```

Çıktı yapısı:
```text
This file is a merged representation of the entire codebase...

================
File Summary
================
(Metadata and AI instructions)

================
Directory Structure
================
src/
  index.ts
  utils/
    helper.ts

================
Files
================

================
File: src/index.ts
================
// File contents here

================
Git Logs
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
## AI Modelleriyle Kullanım

Her format AI modelleriyle iyi çalışır, ancak şunları göz önünde bulundurun:
- Claude için XML kullanın (en iyi ayrıştırma doğruluğu)
- Genel okunabilirlik için Markdown kullanın
- Programlı işleme ve API entegrasyonu için JSON kullanın
- Sadelik ve evrensel uyumluluk için Düz Metin kullanın

## Özelleştirme

`repomix.config.json` dosyasında varsayılan formatı ayarlayın:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```
