<script setup>
import YouTubeVideo from '../../../components/YouTubeVideo.vue';
</script>

# Kasus Penggunaan

Kekuatan Repomix terletak pada kemampuannya untuk bekerja dengan layanan berlangganan apa pun seperti ChatGPT, Claude, Gemini, Grok tanpa khawatir tentang biaya, sambil menyediakan konteks codebase lengkap yang menghilangkan kebutuhan eksplorasi file—membuat analisis lebih cepat dan sering lebih akurat.

Dengan seluruh codebase tersedia sebagai konteks, Repomix memungkinkan berbagai aplikasi termasuk perencanaan implementasi, investigasi bug, pemeriksaan keamanan perpustakaan pihak ketiga, pembuatan dokumentasi, dan banyak lagi.


## Kasus Penggunaan Dunia Nyata

### Menggunakan Repomix dengan AI Assistant (Contoh Grok)
Video ini menunjukkan cara mengkonversi repositori GitHub ke format yang dapat dibaca AI menggunakan interface web Repomix, kemudian mengunggah ke AI assistant seperti Grok untuk perencanaan strategis dan analisis kode.

**Kasus Penggunaan**: Konversi repositori cepat untuk tools AI
- Paket repo GitHub publik melalui interface web
- Pilih format: XML, Markdown, atau teks plain
- Unggah ke AI assistant untuk memahami codebase

<YouTubeVideo video-id="XTifjfeMp4M" :start="488" />

### Menggunakan Repomix dengan LLM CLI Tool Simon Willison
Pelajari cara menggabungkan Repomix dengan [llm CLI tool Simon Willison](https://github.com/simonw/llm) untuk menganalisis seluruh codebase. Video ini menunjukkan cara mengemas repositori ke format XML dan memberikannya ke berbagai LLM untuk Q&A, pembuatan dokumentasi, dan perencanaan implementasi.

**Kasus Penggunaan**: Analisis codebase yang ditingkatkan dengan LLM CLI
- Paket repositori dengan perintah `repomix`
- Gunakan flag `--remote` untuk mengemas langsung dari GitHub
- Lampirkan output ke prompt LLM dengan `-f repo-output.xml`

<YouTubeVideo video-id="UZ-9U1W0e4o" :start="592" />

### Workflow Generasi Kode LLM
Pelajari bagaimana seorang developer menggunakan Repomix untuk memberikan konteks codebase lengkap ke tools seperti Claude dan Aider. Ini memungkinkan pengembangan incremental yang didorong AI, code review yang lebih cerdas, dan dokumentasi otomatis, sambil mempertahankan konsistensi di seluruh proyek.

**Kasus Penggunaan**: Workflow pengembangan yang efisien dengan bantuan AI
- Ekstrak konteks codebase lengkap
- Berikan konteks ke LLM untuk generasi kode yang lebih baik
- Pertahankan konsistensi di seluruh proyek

[Baca workflow lengkap →](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

### Membuat Datapack Pengetahuan untuk LLM
Penulis menggunakan Repomix untuk mengemas konten tulisan mereka—blog, dokumentasi, dan buku—ke format yang kompatibel dengan LLM, memungkinkan pembaca berinteraksi dengan keahlian mereka melalui sistem Q&A yang didukung AI.

**Kasus Penggunaan**: Berbagi pengetahuan dan dokumentasi interaktif
- Paket dokumentasi ke format yang ramah AI
- Aktifkan Q&A interaktif dengan konten
- Buat basis pengetahuan yang komprehensif

[Pelajari lebih lanjut tentang datapack pengetahuan →](https://lethain.com/competitive-advantage-author-llms/)


## Contoh Lainnya

### Pemahaman Kode & Kualitas

#### Investigasi Bug
Bagikan seluruh codebase Anda dengan AI untuk mengidentifikasi akar penyebab masalah di berbagai file dan dependensi.

```
Codebase ini memiliki masalah memory leak di server. Aplikasi crash setelah berjalan selama beberapa jam. Silakan analisis seluruh codebase dan identifikasi penyebab potensial.
```

#### Perencanaan Implementasi
Dapatkan saran implementasi komprehensif yang mempertimbangkan seluruh arsitektur codebase dan pola yang ada.

```
Saya ingin menambahkan autentikasi user ke aplikasi ini. Silakan review struktur codebase saat ini dan sarankan pendekatan terbaik yang sesuai dengan arsitektur yang ada.
```

#### Bantuan Refactoring
Dapatkan saran refactoring yang menjaga konsistensi di seluruh codebase Anda.

```
Codebase ini perlu refactoring untuk meningkatkan maintainability. Silakan sarankan perbaikan sambil menjaga fungsionalitas yang ada tetap utuh.
```

#### Code Review
Code review komprehensif yang mempertimbangkan seluruh konteks proyek.

```
Silakan review codebase ini seolah-olah Anda melakukan code review menyeluruh. Fokus pada kualitas kode, masalah potensial, dan saran perbaikan.
```

#### Pembuatan Dokumentasi
Buat dokumentasi komprehensif yang mencakup seluruh codebase Anda.

```
Buat dokumentasi komprehensif untuk codebase ini, termasuk dokumentasi API, instruksi setup, dan panduan developer.
```

#### Ekstraksi Pengetahuan
Ekstrak pengetahuan teknis dan pola dari codebase Anda.

```
Ekstrak dan dokumentasikan pola arsitektur kunci, keputusan desain, dan praktik terbaik yang digunakan dalam codebase ini.
```

#### Onboarding Codebase
Bantu anggota tim baru memahami struktur codebase dan konsep kunci dengan cepat.

```
Anda membantu developer baru memahami codebase ini. Silakan berikan overview arsitektur, jelaskan komponen utama dan interaksinya, dan highlight file-file paling penting untuk direview terlebih dahulu.
```

### Keamanan & Dependensi

#### Audit Keamanan Dependensi
Analisis perpustakaan pihak ketiga dan dependensi untuk masalah keamanan.

```
Silakan analisis semua dependensi pihak ketiga dalam codebase ini untuk kerentanan keamanan potensial dan sarankan alternatif yang lebih aman jika diperlukan.
```

#### Analisis Integrasi Library
Pahami bagaimana library eksternal diintegrasikan ke dalam codebase Anda.

```
Analisis bagaimana codebase ini terintegrasi dengan library eksternal dan sarankan perbaikan untuk maintainability yang lebih baik.
```

#### Scanning Keamanan Komprehensif
Analisis seluruh codebase Anda untuk kerentanan keamanan potensial dan dapatkan rekomendasi yang dapat ditindaklanjuti.

```
Lakukan audit keamanan komprehensif untuk codebase ini. Periksa kerentanan umum seperti SQL injection, XSS, masalah autentikasi, dan penanganan data yang tidak aman. Berikan rekomendasi spesifik untuk setiap temuan.
```

### Arsitektur & Performa

#### Review Desain API
Review desain API Anda untuk konsistensi, praktik terbaik, dan perbaikan potensial.

```
Review semua endpoint REST API dalam codebase ini. Periksa konsistensi dalam konvensi penamaan, penggunaan metode HTTP, format respons, dan error handling. Sarankan perbaikan mengikuti praktik terbaik REST.
```

#### Perencanaan Migrasi Framework
Dapatkan rencana migrasi detail untuk update ke framework atau bahasa modern.

```
Buat rencana migrasi step-by-step untuk mengkonversi codebase ini dari [framework saat ini] ke [framework target]. Sertakan penilaian risiko, estimasi effort, dan urutan migrasi yang direkomendasikan.
```

#### Optimasi Performa
Identifikasi bottleneck performa dan terima rekomendasi optimasi.

```
Analisis codebase ini untuk bottleneck performa. Cari algoritma yang tidak efisien, query database yang tidak perlu, memory leak, dan area yang bisa mendapat manfaat dari caching atau optimasi.
```

## Sumber Daya Terkait

- [Contoh Prompt](/id/guide/prompt-examples) - Lebih banyak template prompt untuk analisis AI
- [Format Output](/id/guide/output) - Pilih format terbaik untuk model AI Anda
- [Instruksi Khusus](/id/guide/custom-instructions) - Tambahkan konteks untuk memandu analisis AI
- [Pemrosesan Repositori GitHub](/id/guide/remote-repository-processing) - Analisis repositori remote