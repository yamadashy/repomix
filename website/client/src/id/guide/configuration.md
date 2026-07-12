---
title: Konfigurasi
description: Konfigurasikan Repomix dengan file JSON, JSONC, JSON5, JavaScript, atau TypeScript, termasuk format output, pola include dan ignore, serta opsi lanjutan.
---

# Konfigurasi

Repomix dapat dikonfigurasi menggunakan file konfigurasi atau opsi baris perintah. File konfigurasi memungkinkan Anda untuk menyesuaikan berbagai aspek cara pemrosesan dan output codebase Anda.

## Format File Konfigurasi

Repomix mendukung beberapa format file konfigurasi untuk fleksibilitas dan kemudahan penggunaan.

Repomix akan secara otomatis mencari file konfigurasi dalam urutan prioritas berikut:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Konfigurasi JSON

Buat file konfigurasi di direktori proyek Anda:
```bash
repomix --init
```

Ini akan membuat file `repomix.config.json` dengan pengaturan default. Anda juga dapat membuat file konfigurasi global yang akan digunakan sebagai fallback ketika tidak ada konfigurasi lokal yang ditemukan:

```bash
repomix --init --global
```

### Konfigurasi TypeScript

File konfigurasi TypeScript memberikan pengalaman developer terbaik dengan pengecekan tipe lengkap dan dukungan IDE.

**Instalasi:**

Untuk menggunakan konfigurasi TypeScript atau JavaScript dengan `defineConfig`, Anda perlu menginstal Repomix sebagai dev dependency:

```bash
npm install -D repomix
```

**Contoh:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Manfaat:**
- ✅ Pengecekan tipe TypeScript lengkap di IDE Anda
- ✅ Autocomplete dan IntelliSense IDE yang sangat baik
- ✅ Gunakan nilai dinamis (timestamp, environment variables, dll.)

**Contoh Nilai Dinamis:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Generate nama file berbasis timestamp
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Konfigurasi JavaScript

File konfigurasi JavaScript bekerja sama seperti TypeScript, mendukung `defineConfig` dan nilai dinamis.

## Opsi Konfigurasi

| Opsi                             | Deskripsi                                                                                                                    | Default                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Ukuran file maksimum dalam byte untuk diproses. File yang lebih besar akan dilewati. Berguna untuk mengecualikan file biner besar atau file data | `50000000`            |
| `input.processors`               | Array berurutan berisi entri `{ pattern, command, timeout?, onError? }` yang menjalankan perintah eksternal untuk mentransformasi file yang cocok sebelum dikemas (mis. JSON→TOON). Glob pertama yang cocok yang menang. Menjalankan perintah arbitrer, sehingga hanya dijalankan untuk proses CLI lokal (dan repositori remote dengan `--remote-trust-config`). Lihat [Prosesor File](#prosesor-file) | Tidak diatur            |
| `output.filePath`                | Nama file output. Mendukung format XML, Markdown, dan teks biasa                                                            | `"repomix-output.xml"` |
| `output.style`                   | Gaya output (`xml`, `markdown`, `json`, `plain`). Setiap format memiliki keunggulan tersendiri untuk berbagai alat AI               | `"xml"`                |
| `output.filePathStyle`           | Cara jalur file ditampilkan dalam output (`target-relative` menjaga jalur relatif terhadap setiap root target, `cwd-relative` menjaga jalur relatif terhadap direktori kerja saat ini) | `"target-relative"`    |
| `output.parsableStyle`           | Apakah akan escape output berdasarkan skema gaya yang dipilih. Memungkinkan parsing yang lebih baik tetapi dapat meningkatkan jumlah token | `false`                |
| `output.compress`                | Apakah akan melakukan ekstraksi kode cerdas menggunakan Tree-sitter untuk mengurangi jumlah token sambil mempertahankan struktur | `false`                |
| `output.patterns`                | Level penyertaan per-file. Sebuah array terurut berisi entri `{ pattern, compress?, directoryStructureOnly? }`; glob pertama yang cocok yang menang dan menimpa `output.compress` global untuk file tersebut. Lihat [Level Penyertaan Per-file](#level-penyertaan-per-file) | Tidak diatur           |
| `output.headerText`              | Teks kustom untuk disertakan dalam header file. Berguna untuk memberikan konteks atau instruksi untuk alat AI              | `null`                 |
| `output.instructionFilePath`     | Path ke file yang berisi instruksi kustom rinci untuk pemrosesan AI                                                         | `null`                 |
| `output.fileSummary`             | Apakah akan menyertakan bagian ringkasan di awal yang menampilkan jumlah file, ukuran, dan metrik lainnya                  | `true`                 |
| `output.directoryStructure`      | Apakah akan menyertakan struktur direktori dalam output. Membantu AI memahami organisasi proyek                            | `true`                 |
| `output.files`                   | Apakah akan menyertakan konten file dalam output. Setel ke false untuk hanya menyertakan struktur dan metadata            | `true`                 |
| `output.removeComments`          | Apakah akan menghapus komentar dari jenis file yang didukung. Dapat mengurangi noise dan jumlah token                      | `false`                |
| `output.removeEmptyLines`        | Apakah akan menghapus baris kosong dari output untuk mengurangi jumlah token                                                | `false`                |
| `output.showLineNumbers`         | Apakah akan menambahkan nomor baris ke setiap baris. Berguna untuk mereferensikan bagian kode tertentu                     | `false`                |
| `output.truncateBase64`          | Apakah akan memotong string data base64 yang panjang (misalnya, gambar) untuk mengurangi jumlah token                      | `false`                |
| `output.copyToClipboard`         | Apakah akan menyalin output ke clipboard sistem selain menyimpan file                                                       | `false`                |
| `output.splitOutput`             | Membagi output menjadi beberapa file bernomor berdasarkan ukuran maksimum per bagian (mis., `1000000` untuk ~1MB). CLI menerima ukuran yang dapat dibaca seperti `500kb` atau `2mb`. Menjaga setiap file di bawah batas dan menghindari pemisahan file sumber antar bagian | Tidak diatur |
| `output.tokenBudget`             | Gagal dengan kode keluar bukan nol saat output yang dikemas melebihi jumlah token ini. Berfungsi sebagai pengaman untuk batas konteks CI/agen; output tetap dihasilkan | Tidak diatur |
| `output.topFilesLength`          | Jumlah file teratas untuk ditampilkan dalam ringkasan. Jika diset ke 0, tidak akan ada ringkasan yang ditampilkan         | `5`                    |
| `output.includeEmptyDirectories` | Apakah akan menyertakan direktori kosong dalam struktur repository                                                          | `false`                |
| `output.includeFullDirectoryStructure` | Saat menggunakan pola `include`, apakah akan menampilkan pohon direktori lengkap (sesuai dengan pola ignore) sambil tetap hanya memproses file yang disertakan. Menyediakan konteks repository lengkap untuk analisis AI | `false`                |
| `output.git.sortByChanges`       | Apakah akan mengurutkan file berdasarkan jumlah perubahan git. File dengan lebih banyak perubahan muncul di bagian bawah  | `true`                 |
| `output.git.sortByChangesMaxCommits` | Jumlah maksimum commit untuk dianalisis saat menghitung perubahan git. Membatasi kedalaman riwayat untuk performa     | `100`                  |
| `output.git.includeDiffs`        | Apakah akan menyertakan perbedaan git dalam output. Menampilkan perubahan work tree dan staged secara terpisah            | `false`                |
| `output.git.includeLogs`         | Apakah akan menyertakan log git dalam output. Menampilkan riwayat commit dengan tanggal, pesan, dan jalur file            | `false`                |
| `output.git.includeLogsCount`    | Jumlah commit log git yang akan disertakan dalam output                                                                    | `50`                   |
| `include`                        | Pola file untuk disertakan menggunakan [pola glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)  | `[]`                   |
| `ignore.useGitignore`            | Apakah akan menggunakan pola dari file `.gitignore` proyek                                                                  | `true`                 |
| `ignore.useDotIgnore`            | Apakah akan menggunakan pola dari file `.ignore` proyek                                                                     | `true`                 |
| `ignore.useDefaultPatterns`      | Apakah akan menggunakan pola ignore default (node_modules, .git, dll.)                                                     | `true`                 |
| `ignore.customPatterns`          | Pola tambahan untuk diabaikan menggunakan [pola glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Apakah akan melakukan pemeriksaan keamanan menggunakan Secretlint untuk mendeteksi informasi sensitif                      | `true`                 |
| `tokenCount.encoding`            | Encoding penghitungan token yang kompatibel dengan OpenAI (misalnya, `o200k_base` untuk GPT-4o, `cl100k_base` untuk GPT-4/3.5). Menggunakan [gpt-tokenizer](https://github.com/nicolo-ribaudo/gpt-tokenizer). | `"o200k_base"`         |

File konfigurasi mendukung sintaks [JSON5](https://json5.org/), yang memungkinkan:
- Komentar (baik single-line maupun multi-line)
- Trailing comma dalam objek dan array
- Nama properti tanpa tanda kutip
- Sintaks string yang lebih fleksibel

## Validasi Skema

Anda dapat mengaktifkan validasi skema untuk file konfigurasi Anda dengan menambahkan properti `$schema`:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Ini menyediakan auto-completion dan validasi di editor yang mendukung skema JSON.

## Contoh File Konfigurasi

Berikut adalah contoh file konfigurasi lengkap (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000,
    // "processors": [
    //   { "pattern": "**/*.json", "command": "npx @toon-format/cli {file}" }
    // ]
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "filePathStyle": "target-relative",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Informasi header kustom untuk file yang dikemas.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    // "patterns": [
    //   { "pattern": "docs/**/*", "compress": true },
    //   { "pattern": "website/**/*", "directoryStructureOnly": true }
    // ],
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Pola juga dapat ditentukan di .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Lokasi File Konfigurasi

Repomix mencari file konfigurasi dalam urutan berikut:
1. File konfigurasi lokal di direktori saat ini (urutan prioritas: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. File konfigurasi global (urutan prioritas: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Opsi baris perintah memiliki prioritas lebih tinggi daripada pengaturan file konfigurasi.

## Pola Ignore

Repomix menyediakan beberapa cara untuk menentukan file mana yang harus diabaikan:

- **.gitignore**: Secara default, pola yang tercantum dalam file `.gitignore` dan `.git/info/exclude` proyek digunakan. Perilaku ini dapat dikontrol dengan pengaturan `ignore.useGitignore` atau opsi CLI `--no-gitignore`.
- **.ignore**: Anda dapat menggunakan file `.ignore` di direktori root proyek, mengikuti format yang sama dengan `.gitignore`. File ini digunakan oleh alat seperti ripgrep dan the silver searcher, mengurangi kebutuhan untuk memelihara beberapa file ignore. Perilaku ini dapat dikontrol dengan pengaturan `ignore.useDotIgnore` atau opsi CLI `--no-dot-ignore`.
- **Pola default**: Repomix menyertakan daftar default file dan direktori yang biasanya dikecualikan (misalnya node_modules, .git, file biner). Fitur ini dapat dikontrol dengan pengaturan `ignore.useDefaultPatterns` atau opsi CLI `--no-default-patterns`. Silakan lihat [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) untuk detail lebih lanjut.
- **.repomixignore**: Anda dapat membuat file `.repomixignore` di direktori root proyek untuk mendefinisikan pola ignore khusus Repomix. File ini mengikuti format yang sama dengan `.gitignore`.
- **Pola kustom**: Pola ignore tambahan dapat ditentukan menggunakan opsi `ignore.customPatterns` dalam file konfigurasi. Anda dapat menimpa pengaturan ini dengan opsi baris perintah `-i, --ignore`.

**Urutan prioritas** (dari tinggi ke rendah):

1. Pola kustom (`ignore.customPatterns`)
2. File ignore (`.repomixignore`, `.ignore`, `.gitignore`, dan `.git/info/exclude`):
   - Ketika berada di direktori bersarang, file di direktori yang lebih dalam memiliki prioritas lebih tinggi
   - Ketika berada di direktori yang sama, file-file ini digabungkan tanpa urutan tertentu
3. Pola default (jika `ignore.useDefaultPatterns` adalah true dan tidak menggunakan `--no-default-patterns`)

Contoh `.repomixignore`:
```text
# Direktori cache
.cache/
tmp/

# Output build
dist/
build/

# Log
*.log
```

## Pola Ignore Default

Ketika `ignore.useDefaultPatterns` adalah true, Repomix secara otomatis mengabaikan pola umum:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Untuk daftar lengkap, lihat [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Fitur Lanjutan

### Kompresi Kode

Fitur kompresi kode, diaktifkan dengan `output.compress: true`, menggunakan [Tree-sitter](https://github.com/tree-sitter/tree-sitter) untuk secara cerdas mengekstrak struktur kode penting sambil menghapus detail implementasi. Ini membantu mengurangi jumlah token sambil mempertahankan informasi struktural penting.

Manfaat utama:
- Mengurangi jumlah token secara signifikan
- Mempertahankan signature kelas dan fungsi
- Memelihara import dan export
- Menjaga definisi tipe dan interface
- Menghapus body fungsi dan detail implementasi

Untuk detail dan contoh lebih lanjut, lihat [Panduan Kompresi Kode](code-compress).

### Level Penyertaan Per-file

Sementara `output.compress` menerapkan satu level tunggal ke setiap file, `output.patterns` memungkinkan Anda mengontrol level detail **per glob** dari file konfigurasi Anda. Setiap entri menargetkan file berdasarkan glob (dicocokkan dengan cara yang sama seperti `include`/`ignore`) dan menimpa pengaturan `output.compress` global untuk file yang cocok.

```json5
{
  "output": {
    "compress": false, // default global bertindak sebagai catch-all
    "patterns": [
      { "pattern": "docs/**/*", "compress": true },
      { "pattern": "website/**/*", "directoryStructureOnly": true }
    ]
  }
}
```

Setiap file diselesaikan menjadi salah satu dari tiga level:

- **Konten penuh** (default): konten penuh file disertakan.
- **Terkompresi** (`compress: true`): konten dilewatkan melalui pipeline Tree-sitter yang sama seperti `output.compress`.
- **Hanya struktur direktori** (`directoryStructureOnly: true`): file dicantumkan dalam struktur direktori, tetapi blok kontennya dihilangkan sepenuhnya dari output.

Aturannya:

- Pola dievaluasi sesuai urutan array dan **pola pertama yang cocok yang menang** untuk file tertentu.
- Flag dari pola yang cocok menimpa pengaturan `output.compress` global. Pola yang cocok tanpa menetapkan flag akan memaksa **konten penuh** untuk file tersebut, yang berguna untuk memasukkan file ke whitelist dari `compress` global.
- `directoryStructureOnly` lebih diutamakan daripada `compress` ketika keduanya diatur pada pola yang sama.
- Jika tidak ada pola yang cocok, perilaku global berlaku (konten penuh, atau terkompresi ketika `output.compress` bernilai `true`).

Opsi ini hanya tersedia di file konfigurasi; tidak ada opsi CLI yang setara.

### Prosesor File

`input.processors` menjalankan perintah eksternal untuk mentransformasi konten file **sebelum** dikemas. Setiap entri menargetkan file berdasarkan glob (dicocokkan dengan cara yang sama seperti `include`/`ignore`) dan mengganti konten file yang cocok dengan output standar dari perintah tersebut. Ini berguna untuk transformasi yang mengurangi token atau mengonversi format, misalnya mengonversi JSON ke [TOON](https://github.com/toon-format/toon), meminifikasi SVG, atau mengonversi notebook menjadi skrip biasa.

```json5
{
  "input": {
    "processors": [
      {
        "pattern": "**/*.json",
        "command": "npx @toon-format/cli {file}"
      }
    ]
  }
}
```

Cara kerjanya:

- Repomix menulis konten setiap file yang cocok ke file sementara dan mengganti placeholder `{file}` dalam perintah dengan path file tersebut (placeholder ini **wajib** ada).
- Perintah dijalankan melalui shell, sehingga pipe dan alat seperti `npx` dapat digunakan. Output standarnya menjadi konten baru file tersebut, yang kemudian mengalir melalui sisa pipeline (pemeriksaan keamanan, penghitungan token, dan pembuatan output) seperti file lainnya.
- Pola dievaluasi sesuai urutan array dan **pola pertama yang cocok yang menang** — sebuah file ditransformasi oleh paling banyak satu prosesor (tanpa chaining).

Opsi per-prosesor:

- `timeout`: Waktu maksimum dalam milidetik untuk menunggu perintah. Default: `60000` (60 detik). Perhatikan bahwa `npx` mungkin memerlukan waktu tambahan untuk mengunduh paket pada cache dingin.
- `onError`: Tindakan yang dilakukan ketika perintah keluar dengan status bukan nol atau timeout. `"fail"` (default) membatalkan seluruh proses pack; `"skip"` mencatat peringatan dan menggunakan konten asli file sebagai fallback.

Contoh perintah (masing-masing adalah nilai `command` yang dipasangkan dengan `pattern` yang sesuai):

| Pola | `command` | Fungsinya |
| --- | --- | --- |
| `**/*.json` | `jq -c . {file}` | Memadatkan JSON dengan menghapus spasi kosong |
| `**/*.json` | `npx @toon-format/cli {file}` | Mengonversi JSON ke [TOON](https://github.com/toon-format/toon), format ringkas yang hemat token |
| `**/*.svg` | `npx svgo -i {file} -o -` | Meminimalkan SVG |
| `**/*.ipynb` | `jupyter nbconvert --to script --stdout {file}` | Mengonversi notebook Jupyter menjadi skrip Python biasa |

Karena pola pertama yang cocok yang menang, terapkan hanya satu prosesor per file — misalnya pilih salah satu antara `jq` atau konverter TOON untuk `**/*.json`. Perintah harus menulis konten yang telah ditransformasi ke output standar, dan alat yang dipanggilnya harus tersedia di `PATH` Anda (perintah berbasis `npx` mengunduh alat saat pertama kali digunakan).

::: warning Keamanan
Prosesor file menjalankan **perintah arbitrer** dari file konfigurasi Anda, sehingga mengikuti model kepercayaan yang ketat:

- Hanya berjalan **untuk proses CLI lokal**, di mana Repomix menganggap konfigurasi di direktori kerja Anda adalah milik Anda sendiri — batas kepercayaan yang sama seperti npm script atau Makefile. Begitu pula, jika Anda menjalankan `repomix` di dalam repositori yang diperoleh dari orang lain **tanpa memeriksa `repomix.config.json`-nya terlebih dahulu**, perintah prosesornya akan dieksekusi di mesin Anda. Periksa konfigurasi repositori yang tidak tepercaya sebelum melakukan pack.
- **Dinonaktifkan** untuk library API (`pack()` / `runCli()`), MCP server, dan [repomix.com](https://repomix.com) yang di-hosting, sehingga tidak satu pun dari ketiganya dapat menjalankan perintah dari konfigurasi.
- Untuk repositori remote (`--remote`), konfigurasi dari repositori yang di-clone — dan karenanya prosesornya — hanya dipercaya ketika Anda secara eksplisit meneruskan `--remote-trust-config`. Tanpa itu, konfigurasi remote bahkan tidak dimuat.

Prosesor yang aktif dicatat saat startup sehingga prosesor tak terduga dari konfigurasi yang tidak dikenal dapat terlihat. Karena perintah dicetak saat startup dan dalam pesan error, referensikan kredensial melalui environment variable (mis. `$TOKEN`), yang dicatat tanpa diekspansi, alih-alih menuliskannya langsung di dalam perintah.
:::

Catatan:

- Menggabungkan prosesor **yang mengubah format** dengan `output.compress`, `output.removeComments`, atau `compress` dari `output.patterns` pada file yang sama tidak disarankan: langkah-langkah tersebut dipilih berdasarkan ekstensi asli file, sehingga akan menjalankan penangan bahasa yang salah pada konten yang telah ditransformasi. Untuk alasan yang sama, output Markdown memberi label pada code fence berdasarkan ekstensi asli (mis. file JSON→TOON diberi fence sebagai `json`). Kompresi bersifat best-effort dan akan secara diam-diam fallback ke konten yang ditransformasi jika parsing gagal.
- Dengan `--watch`, file yang cocok akan diproses ulang pada setiap rebuild, yang menjalankan ulang perintah setiap kali.
- Saat timeout, Repomix menghentikan shell dari perintah tersebut; perintah yang memunculkan proses latar belakang (background process) miliknya sendiri yang berjalan lama dapat membiarkannya tetap berjalan.
- Prosesor hanya melihat file teks (file biner dikecualikan sebelum pemrosesan), dan outputnya dibaca sebagai UTF-8.

### Integrasi Git

Konfigurasi `output.git` menyediakan fitur Git-aware yang kuat:

- `sortByChanges`: Ketika true, file diurutkan berdasarkan jumlah perubahan Git (commit yang memodifikasi file). File dengan lebih banyak perubahan muncul di bagian bawah output. Ini membantu memprioritaskan file yang lebih aktif dikembangkan. Default: `true`
- `sortByChangesMaxCommits`: Jumlah maksimum commit untuk dianalisis saat menghitung perubahan file. Default: `100`
- `includeDiffs`: Ketika true, menyertakan perbedaan Git dalam output (termasuk perubahan work tree dan staged secara terpisah). Ini memungkinkan pembaca melihat perubahan yang tertunda di repository. Default: `false`
- `includeLogs`: Ketika true, menyertakan riwayat commit Git dalam output. Menampilkan tanggal commit, pesan, dan jalur file untuk setiap commit. Ini membantu AI memahami pola pengembangan dan hubungan file. Default: `false`
- `includeLogsCount`: Jumlah commit terbaru yang akan disertakan dalam log git. Default: `50`

Contoh konfigurasi:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Pemeriksaan Keamanan

Ketika `security.enableSecurityCheck` diaktifkan, Repomix menggunakan [Secretlint](https://github.com/secretlint/secretlint) untuk mendeteksi informasi sensitif dalam codebase Anda sebelum memasukkannya dalam output. Ini membantu mencegah paparan yang tidak disengaja dari:

- Kunci API
- Token akses
- Kunci pribadi
- Password
- Kredensial sensitif lainnya

### Penghapusan Komentar

Ketika `output.removeComments` diset ke `true`, komentar dihapus dari jenis file yang didukung untuk mengurangi ukuran output dan fokus pada konten kode penting. Ini dapat sangat berguna ketika:

- Bekerja dengan kode yang banyak didokumentasikan
- Mencoba mengurangi jumlah token
- Fokus pada struktur dan logika kode

Untuk bahasa yang didukung dan contoh detail, lihat [Panduan Penghapusan Komentar](comment-removal).

## Sumber Daya Terkait

- [Opsi Baris Perintah](/id/guide/command-line-options) - Referensi CLI lengkap (opsi CLI menimpa pengaturan file konfigurasi)
- [Format Output](/id/guide/output) - Detail tentang setiap format output
- [Keamanan](/id/guide/security) - Bagaimana Repomix mendeteksi informasi sensitif
- [Kompresi Kode](/id/guide/code-compress) - Kurangi jumlah token dengan Tree-sitter
- [Pemrosesan Repositori GitHub](/id/guide/remote-repository-processing) - Opsi untuk repositori remote
