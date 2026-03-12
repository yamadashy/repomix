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
| `output.filePath`                | Nama file output. Mendukung format XML, Markdown, dan teks biasa                                                            | `"repomix-output.xml"` |
| `output.style`                   | Gaya output (`xml`, `markdown`, `json`, `plain`). Setiap format memiliki keunggulan tersendiri untuk berbagai alat AI               | `"xml"`                |
| `output.parsableStyle`           | Apakah akan escape output berdasarkan skema gaya yang dipilih. Memungkinkan parsing yang lebih baik tetapi dapat meningkatkan jumlah token | `false`                |
| `output.compress`                | Apakah akan melakukan ekstraksi kode cerdas menggunakan Tree-sitter untuk mengurangi jumlah token sambil mempertahankan struktur | `false`                |
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
| `tokenCount.encoding`            | Encoding penghitungan token yang digunakan oleh tokenizer [tiktoken](https://github.com/openai/tiktoken) OpenAI. Gunakan `o200k_base` untuk GPT-4o, `cl100k_base` untuk GPT-4/3.5. Lihat [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) untuk detail | `"o200k_base"`         |

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
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
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
