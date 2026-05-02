---
layout: home
title: Repomix
description: Kemas repositori lokal atau remote ke XML, Markdown, JSON, atau teks biasa yang ramah AI untuk Claude, ChatGPT, Gemini, MCP, dan alur kerja code review.
titleTemplate: Kemas basis kode Anda ke dalam format yang ramah AI
aside: false
editLink: false

features:
  - icon: 🤖
    title: Dioptimalkan untuk AI
    details: Memformat basis kode Anda dengan cara yang mudah dipahami dan diproses oleh AI.

  - icon: ⚙️
    title: Mengenali Git
    details: Secara otomatis menghormati file .gitignore Anda.

  - icon: 🛡️
    title: Fokus pada Keamanan
    details: Mengintegrasikan Secretlint untuk pemeriksaan keamanan yang kuat untuk mendeteksi dan mencegah penyertaan informasi sensitif.

  - icon: 📊
    title: Penghitungan Token
    details: Menyediakan hitungan token untuk setiap file dan seluruh repositori, berguna untuk batas konteks LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Nominasi Open Source Awards

Kami merasa terhormat! Repomix telah dinominasikan untuk kategori **Powered by AI** di [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Ini tidak mungkin terjadi tanpa semua pengguna yang menggunakan dan mendukung Repomix. Terima kasih!

## Apa itu Repomix?

Repomix adalah alat yang powerful yang mengemas seluruh codebase Anda ke dalam satu file yang ramah AI. Baik Anda sedang bekerja pada code review, refactoring, atau membutuhkan bantuan AI untuk proyek Anda, Repomix memudahkan berbagi seluruh konteks repository dengan alat AI.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Mulai Cepat

Setelah Anda menghasilkan file yang dikemas (`repomix-output.xml`) menggunakan Repomix, Anda dapat mengirimkannya ke asisten AI (seperti ChatGPT, Claude) dengan prompt seperti:

```
File ini berisi semua file dalam repositori yang digabungkan menjadi satu.
Saya ingin merefaktor kode, jadi tolong tinjau terlebih dahulu.
```

AI akan menganalisis seluruh basis kode Anda dan memberikan wawasan komprehensif:

![Penggunaan File Repomix 1](/images/docs/repomix-file-usage-1.png)

Ketika mendiskusikan perubahan spesifik, AI dapat membantu menghasilkan kode. Dengan fitur seperti Artifacts dari Claude, Anda bahkan dapat menerima beberapa file yang saling bergantung:

![Penggunaan File Repomix 2](/images/docs/repomix-file-usage-2.png)

Selamat mengkode! 🚀

## Mengapa Repomix?

Kekuatan Repomix terletak pada kemampuannya untuk bekerja dengan layanan berlangganan seperti ChatGPT, Claude, Gemini, Grok tanpa khawatir tentang biaya, sambil menyediakan konteks codebase lengkap yang menghilangkan kebutuhan eksplorasi file—membuat analisis lebih cepat dan seringkali lebih akurat.

Dengan seluruh codebase tersedia sebagai konteks, Repomix memungkinkan berbagai aplikasi termasuk perencanaan implementasi, investigasi bug, pemeriksaan keamanan pustaka pihak ketiga, generasi dokumentasi, dan banyak lagi.

## Menggunakan Alat CLI {#using-the-cli-tool}

Repomix dapat digunakan sebagai alat command-line, menawarkan fitur dan opsi kustomisasi yang kuat.

**Alat CLI dapat mengakses repositori privat** karena menggunakan git yang diinstal secara lokal.

### Mulai Cepat

Anda dapat mencoba Repomix secara instan di direktori proyek Anda tanpa instalasi:

```bash
npx repomix@latest
```

Atau instal secara global untuk penggunaan berulang:

```bash
# Instal dengan npm
npm install -g repomix

# Atau dengan yarn
yarn global add repomix

# Atau dengan bun
bun add -g repomix

# Atau dengan Homebrew (macOS/Linux)
brew install repomix

# Kemudian jalankan di direktori proyek mana pun
repomix
```

Itu saja! Repomix akan menghasilkan file `repomix-output.xml` di direktori Anda saat ini, berisi seluruh repositori Anda dalam format yang ramah AI.



### Penggunaan

Untuk mengemas seluruh repositori Anda:

```bash
repomix
```

Untuk mengemas direktori tertentu:

```bash
repomix path/to/directory
```

Untuk mengemas file atau direktori tertentu menggunakan [pola glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Untuk mengecualikan file atau direktori tertentu:

```bash
repomix --ignore "**/*.log,tmp/"
```

Untuk mengemas repositori jarak jauh:
```bash
# Menggunakan format singkat
npx repomix --remote yamadashy/repomix

# Menggunakan URL lengkap (mendukung cabang dan jalur tertentu)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Menggunakan URL commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Untuk menginisialisasi file konfigurasi baru (`repomix.config.json`):

```bash
repomix --init
```

Setelah Anda menghasilkan file yang dikemas, Anda dapat menggunakannya dengan alat AI Generatif seperti Claude, ChatGPT, dan Gemini.

#### Penggunaan Docker

Anda juga dapat menjalankan Repomix menggunakan Docker 🐳  
Ini berguna jika Anda ingin menjalankan Repomix di lingkungan yang terisolasi atau lebih suka menggunakan kontainer.

Penggunaan dasar (direktori saat ini):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Untuk mengemas direktori tertentu:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Memproses repositori jarak jauh dan output ke direktori `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Format Output

Pilih format output yang Anda inginkan:

```bash
# Format XML (default)
repomix --style xml

# Format Markdown
repomix --style markdown

# Format JSON
repomix --style json

# Format teks biasa
repomix --style plain
```

### Kustomisasi

Buat `repomix.config.json` untuk pengaturan permanen:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Kasus Penggunaan di Dunia Nyata

### [Alur Kerja Pembuatan Kode LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Seorang developer membagikan bagaimana mereka menggunakan Repomix untuk mengekstrak konteks kode dari codebase yang ada, kemudian memanfaatkan konteks tersebut dengan LLM seperti Claude dan Aider untuk perbaikan bertahap, ulasan kode, dan pembuatan dokumentasi otomatis.

### [Membuat Paket Data Pengetahuan untuk LLM](https://lethain.com/competitive-advantage-author-llms/)

Para penulis menggunakan Repomix untuk mengemas konten tertulis mereka—blog, dokumentasi, dan buku—ke dalam format yang kompatibel dengan LLM, memungkinkan pembaca berinteraksi dengan keahlian mereka melalui sistem tanya jawab yang didukung AI.

[Temukan lebih banyak kasus penggunaan →](./guide/use-cases)

## Panduan Pengguna Mahir

Repomix menawarkan fitur-fitur canggih untuk kasus penggunaan lanjutan. Berikut adalah beberapa panduan penting untuk pengguna mahir:

- **[Server MCP](./guide/mcp-server)** - Integrasi Model Context Protocol untuk asisten AI
- **[GitHub Actions](./guide/github-actions)** - Otomatisasi pengemasan codebase dalam alur kerja CI/CD
- **[Kompresi Kode](./guide/code-compress)** - Kompresi cerdas berbasis Tree-sitter (~70% pengurangan token)
- **[Menggunakan sebagai Library](./guide/development/using-repomix-as-a-library)** - Integrasikan Repomix ke dalam aplikasi Node.js Anda
- **[Instruksi Kustom](./guide/custom-instructions)** - Tambahkan prompt dan instruksi kustom ke output
- **[Fitur Keamanan](./guide/security)** - Integrasi Secretlint bawaan dan pemeriksaan keamanan
- **[Best Practices](./guide/tips/best-practices)** - Optimalkan alur kerja AI Anda dengan strategi yang terbukti

### Contoh Lainnya
::: tip Butuh bantuan lebih? 💡
Lihat dokumentasi komprehensif kami di [Panduan](/id/guide/) atau jelajahi [Repositori GitHub](https://github.com/yamadashy/repomix) untuk lebih banyak contoh dan kode sumber.
:::

</div>
