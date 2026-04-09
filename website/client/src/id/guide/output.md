# Format Output

Repomix mendukung empat format output:
- XML (default)
- Markdown
- JSON
- Plain Text 

## Format XML

```bash
repomix --style xml
```

Format XML dioptimalkan untuk pemrosesan AI:

```xml
Ini adalah representasi gabungan dari seluruh codebase...

<file_summary>
(Metadata dan instruksi AI)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Konten file di sini
</file>
</files>

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### Mengapa XML sebagai Format Default?

Repomix menggunakan XML sebagai format output default berdasarkan penelitian dan pengujian yang ekstensif. Keputusan ini didasarkan pada bukti empiris dan pertimbangan praktis untuk analisis kode yang dibantu AI.

Pilihan kami terhadap XML terutama dipengaruhi oleh rekomendasi resmi dari penyedia AI utama:
- **Anthropic (Claude)**: Secara eksplisit merekomendasikan penggunaan tag XML untuk menyusun prompt, menyatakan bahwa "Claude terekspos pada prompt semacam itu selama pelatihan" ([dokumentasi](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Merekomendasikan format terstruktur termasuk XML untuk tugas kompleks ([dokumentasi](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Menganjurkan prompting terstruktur dalam skenario kompleks ([pengumuman](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Format Markdown

```bash
repomix --style markdown
```

Markdown menyediakan format yang mudah dibaca:

````markdown
Ini adalah representasi gabungan dari seluruh codebase...

# File Summary
(Metadata dan instruksi AI)

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
// Konten file di sini
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

## Format JSON

```bash
repomix --style json
```

Format JSON menyediakan output terstruktur yang dapat diakses secara programatis dengan nama properti camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "File ini adalah representasi gabungan dari seluruh codebase, digabungkan menjadi satu dokumen oleh Repomix.",
    "purpose": "File ini berisi representasi terpacked dari keseluruhan konten repositori...",
    "fileFormat": "Konten diorganisir sebagai berikut...",
    "usageGuidelines": "- File ini harus diperlakukan sebagai read-only...",
    "notes": "- Beberapa file mungkin telah dikecualikan berdasarkan aturan .gitignore..."
  },
  "userProvidedHeader": "Teks header kustom jika ditentukan",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Konten file di sini",
    "src/utils.js": "// Konten file di sini"
  },
  "instruction": "Instruksi kustom dari instructionFilePath"
}
```

### Keuntungan Format JSON

Format JSON ideal untuk:
- **Pemrosesan programatis**: Mudah di-parse dan dimanipulasi dengan library JSON di bahasa pemrograman apa pun
- **Integrasi API**: Konsumsi langsung oleh layanan web dan aplikasi
- **Kompatibilitas tool AI**: Format terstruktur yang dioptimalkan untuk machine learning dan sistem AI
- **Analisis data**: Ekstraksi informasi spesifik yang mudah menggunakan tools seperti `jq`

### Bekerja dengan Output JSON Menggunakan `jq`

Format JSON memudahkan ekstraksi informasi spesifik secara programatis. Berikut adalah contoh umum:

#### Operasi File Dasar
```bash
# Daftar semua path file
cat repomix-output.json | jq -r '.files | keys[]'

# Hitung total jumlah file
cat repomix-output.json | jq '.files | keys | length'

# Ekstrak konten file spesifik
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Filtering dan Analisis File
```bash
# Cari file berdasarkan ekstensi
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Dapatkan file yang berisi teks spesifik
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Buat daftar file dengan jumlah karakter
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) karakter"'
```

#### Ekstraksi Metadata
```bash
# Ekstrak struktur direktori
cat repomix-output.json | jq -r '.directoryStructure'

# Dapatkan informasi file summary
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Ekstrak header yang disediakan user (jika ada)
cat repomix-output.json | jq -r '.userProvidedHeader // "Tidak ada header disediakan"'

# Dapatkan instruksi kustom
cat repomix-output.json | jq -r '.instruction // "Tidak ada instruksi disediakan"'
```

#### Analisis Lanjutan
```bash
# Cari file terbesar berdasarkan panjang konten
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Cari file yang mengandung pola spesifik
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Ekstrak path file yang cocok dengan beberapa ekstensi
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Format Plain Text

```bash
repomix --style plain
```

Struktur output:
```text
Ini adalah representasi gabungan dari seluruh codebase...

================
File Summary
================
(Metadata dan instruksi AI)

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
// Konten file di sini

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

## Penggunaan dengan Model AI

Setiap format bekerja dengan baik dengan model AI, tetapi pertimbangkan:
- Gunakan XML untuk Claude (akurasi parsing terbaik)
- Gunakan Markdown untuk keterbacaan umum
- Gunakan JSON untuk pemrosesan programatis dan integrasi API
- Gunakan Plain Text untuk kesederhanaan dan kompatibilitas universal

## Kustomisasi

Atur format default di `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## Sumber Daya Terkait

- [Konfigurasi](/id/guide/configuration) - Referensi opsi konfigurasi lengkap
- [Opsi Baris Perintah](/id/guide/command-line-options) - Gunakan `--style` untuk mengatur format output
- [Kompresi Kode](/id/guide/code-compress) - Kurangi jumlah token sambil mempertahankan struktur
- [Contoh Prompt](/id/guide/prompt-examples) - Tips menggunakan output dengan berbagai model AI
