# Memulai dengan Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix adalah alat yang mengemas seluruh repositori Anda menjadi satu file yang ramah AI. Ini dirancang untuk membantu Anda menyediakan basis kode Anda ke Model Bahasa Besar (LLM) seperti ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama, dan lainnya.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Mulai Cepat

Jalankan perintah ini di direktori proyek Anda:

```bash
npx repomix@latest
```

Itu saja! Anda akan menemukan file `repomix-output.xml` yang berisi seluruh repositori Anda dalam format yang ramah AI.

Anda kemudian dapat mengirim file ini ke asisten AI dengan prompt seperti:

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

## Fitur Utama

- **Output Dioptimalkan untuk AI**: Memformat basis kode Anda untuk pemrosesan AI yang mudah
- **Penghitungan Token**: Melacak penggunaan token untuk batas konteks LLM
- **Mengenali Git**: Menghormati file `.gitignore` dan `.git/info/exclude` Anda
- **Fokus pada Keamanan**: Mendeteksi informasi sensitif
- **Beberapa Format Output**: Pilih antara teks biasa, XML, atau Markdown

## Langkah Selanjutnya

- [Panduan Instalasi](installation.md): Berbagai cara untuk menginstal Repomix
- [Panduan Penggunaan](usage.md): Pelajari tentang fitur dasar dan lanjutan
- [Konfigurasi](configuration.md): Kustomisasi Repomix untuk kebutuhan Anda
- [Fitur Keamanan](security.md): Pelajari tentang pemeriksaan keamanan
- [Format Output](output.md): Pilih format terbaik untuk model AI Anda
- [Server MCP](mcp-server.md): Integrasikan Repomix dengan asisten AI secara langsung

## Komunitas

Bergabunglah dengan [komunitas Discord](https://discord.gg/wNYzTwZFku) kami untuk:
- Mendapatkan bantuan dengan Repomix
- Berbagi pengalaman Anda
- Menyarankan fitur baru
- Terhubung dengan pengguna lain

## Dukungan

Menemukan bug atau butuh bantuan?
- [Buka masalah di GitHub](https://github.com/yamadashy/repomix/issues)
- Bergabunglah dengan server Discord kami
- Periksa [dokumentasi](https://repomix.com)
