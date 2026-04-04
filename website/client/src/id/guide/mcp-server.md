# Server MCP

Repomix mendukung [Model Context Protocol (MCP)](https://modelcontextprotocol.io), memungkinkan asisten AI untuk berinteraksi langsung dengan codebase Anda. Ketika dijalankan sebagai server MCP, Repomix menyediakan tools yang memungkinkan asisten AI untuk mengemas repository lokal atau remote untuk analisis tanpa memerlukan persiapan file manual.

> [!NOTE]  
> Ini adalah fitur eksperimental yang akan kami tingkatkan secara aktif berdasarkan feedback pengguna dan penggunaan dunia nyata

## Menjalankan Repomix sebagai Server MCP

Untuk menjalankan Repomix sebagai server MCP, gunakan flag `--mcp`:

```bash
repomix --mcp
```

Ini memulai Repomix dalam mode server MCP, membuatnya tersedia untuk asisten AI yang mendukung Model Context Protocol.

## Konfigurasi Server MCP

Untuk menggunakan Repomix sebagai server MCP dengan asisten AI seperti Claude, Anda perlu mengkonfigurasi pengaturan MCP:

### Untuk VS Code

Anda dapat menginstal server MCP Repomix di VS Code menggunakan salah satu metode berikut:

1. **Menggunakan badge instalasi:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Menggunakan command line:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Untuk VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Untuk Cline (ekstensi VS Code)

Edit file `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Untuk Cursor

Di Cursor, tambahkan server MCP baru dari `Cursor Settings` > `MCP` > `+ Add new global MCP server` dengan konfigurasi serupa dengan Cline.

### Untuk Claude Desktop

Edit file `claude_desktop_config.json` dengan konfigurasi serupa dengan Cline.

### Untuk Claude Code

Untuk mengkonfigurasi Repomix sebagai server MCP di [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), gunakan perintah berikut:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Sebagai alternatif, Anda dapat menggunakan **plugin Repomix resmi** untuk pengalaman yang lebih nyaman. Plugin menyediakan perintah bahasa alami dan pengaturan yang lebih mudah. Lihat dokumentasi [Plugin Claude Code](/id/guide/claude-code-plugins) untuk detail.

### Menggunakan Docker sebagai pengganti npx

Sebagai pengganti menggunakan npx, Anda dapat menggunakan Docker untuk menjalankan Repomix sebagai server MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Tools MCP yang Tersedia

Ketika dijalankan sebagai server MCP, Repomix menyediakan tools berikut:

### pack_codebase

Tool ini mengemas direktori kode lokal ke dalam file XML untuk analisis AI. Tool ini menganalisis struktur codebase, mengekstrak konten kode yang relevan, dan menghasilkan laporan komprehensif termasuk metrik, pohon file, dan konten kode yang diformat.

**Parameter:**
- `directory`: (Wajib) Path absolut ke direktori yang akan dikemas
- `compress`: (Opsional, default: false) Mengaktifkan kompresi Tree-sitter untuk mengekstrak signature kode esensial dan struktur sambil menghapus detail implementasi. Mengurangi penggunaan token sekitar 70% sambil mempertahankan makna semantik. Umumnya tidak diperlukan karena grep_repomix_output memungkinkan pengambilan konten incremental. Gunakan hanya ketika Anda khusus membutuhkan konten codebase lengkap untuk repository besar.
- `includePatterns`: (Opsional) Menentukan file yang akan disertakan menggunakan pola fast-glob. Beberapa pola dapat dipisahkan dengan koma (contoh: "**/*.{js,ts}", "src/**,docs/**"). Hanya file yang cocok yang akan diproses.
- `ignorePatterns`: (Opsional) Menentukan file tambahan yang akan dikecualikan menggunakan pola fast-glob. Beberapa pola dapat dipisahkan dengan koma (contoh: "test/**,*.spec.js", "node_modules/**,dist/**"). Pola ini melengkapi .gitignore dan eksklusi built-in.
- `topFilesLength`: (Opsional, default: 10) Jumlah file terbesar berdasarkan ukuran untuk ditampilkan dalam ringkasan metrik untuk analisis codebase.

**Contoh:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Tool ini mengambil, mengkloning, dan mengemas repository GitHub ke dalam file XML untuk analisis AI. Tool ini secara otomatis mengkloning repository remote, menganalisis strukturnya, dan menghasilkan laporan komprehensif.

**Parameter:**
- `remote`: (Wajib) URL repository GitHub atau format user/repo (contoh: "yamadashy/repomix", "https://github.com/user/repo", atau "https://github.com/user/repo/tree/branch")
- `compress`: (Opsional, default: false) Mengaktifkan kompresi Tree-sitter untuk mengekstrak signature kode esensial dan struktur sambil menghapus detail implementasi. Mengurangi penggunaan token sekitar 70% sambil mempertahankan makna semantik. Umumnya tidak diperlukan karena grep_repomix_output memungkinkan pengambilan konten incremental. Gunakan hanya ketika Anda khusus membutuhkan konten codebase lengkap untuk repository besar.
- `includePatterns`: (Opsional) Menentukan file yang akan disertakan menggunakan pola fast-glob. Beberapa pola dapat dipisahkan dengan koma (contoh: "**/*.{js,ts}", "src/**,docs/**"). Hanya file yang cocok yang akan diproses.
- `ignorePatterns`: (Opsional) Menentukan file tambahan yang akan dikecualikan menggunakan pola fast-glob. Beberapa pola dapat dipisahkan dengan koma (contoh: "test/**,*.spec.js", "node_modules/**,dist/**"). Pola ini melengkapi .gitignore dan eksklusi built-in.
- `topFilesLength`: (Opsional, default: 10) Jumlah file terbesar berdasarkan ukuran untuk ditampilkan dalam ringkasan metrik untuk analisis codebase.

**Contoh:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Tool ini membaca konten file output yang dihasilkan oleh Repomix. Mendukung pembacaan parsial dengan spesifikasi rentang baris untuk file besar. Tool ini dirancang untuk lingkungan di mana akses filesystem langsung terbatas.

**Parameter:**
- `outputId`: (Wajib) ID file output Repomix untuk dibaca
- `startLine`: (Opsional) Nomor baris awal (berbasis 1, inklusif). Jika tidak ditentukan, membaca dari awal.
- `endLine`: (Opsional) Nomor baris akhir (berbasis 1, inklusif). Jika tidak ditentukan, membaca hingga akhir.

**Fitur:**
- Dirancang khusus untuk lingkungan berbasis web atau aplikasi sandbox
- Mengambil konten output yang dihasilkan sebelumnya menggunakan ID mereka
- Menyediakan akses aman ke codebase yang dikemas tanpa memerlukan akses filesystem
- Mendukung pembacaan parsial untuk file besar

**Contoh:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Tool ini mencari pola dalam file output Repomix menggunakan fungsionalitas mirip grep dengan sintaks JavaScript RegExp. Mengembalikan baris yang cocok dengan baris konteks opsional di sekitar kecocokan.

**Parameter:**
- `outputId`: (Wajib) ID file output Repomix untuk dicari
- `pattern`: (Wajib) Pola pencarian (sintaks regular expression JavaScript RegExp)
- `contextLines`: (Opsional, default: 0) Jumlah baris konteks untuk ditampilkan sebelum dan sesudah setiap kecocokan. Diganti oleh beforeLines/afterLines jika ditentukan.
- `beforeLines`: (Opsional) Jumlah baris konteks untuk ditampilkan sebelum setiap kecocokan (seperti grep -B). Mengambil prioritas atas contextLines.
- `afterLines`: (Opsional) Jumlah baris konteks untuk ditampilkan setelah setiap kecocokan (seperti grep -A). Mengambil prioritas atas contextLines.
- `ignoreCase`: (Opsional, default: false) Melakukan pencocokan case-insensitive

**Fitur:**
- Menggunakan sintaks JavaScript RegExp untuk pencocokan pola yang kuat
- Mendukung baris konteks untuk pemahaman kecocokan yang lebih baik
- Memungkinkan kontrol terpisah dari baris konteks sebelum/sesudah
- Opsi pencarian case-sensitive dan case-insensitive

**Contoh:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file dan file_system_read_directory

Server MCP Repomix menyediakan dua tools filesystem yang memungkinkan asisten AI untuk berinteraksi dengan aman dengan filesystem lokal:

1. `file_system_read_file`
  - Membaca konten file dari filesystem lokal menggunakan path absolut
  - Termasuk validasi keamanan built-in untuk mendeteksi dan mencegah akses ke file yang berisi informasi sensitif
  - Mengimplementasikan validasi keamanan menggunakan [Secretlint](https://github.com/secretlint/secretlint)
  - Mencegah akses ke file yang berisi informasi sensitif (API keys, password, secrets)
  - Memvalidasi path absolut untuk mencegah serangan directory traversal
  - Mengembalikan pesan error yang jelas untuk path yang tidak valid dan masalah keamanan

2. `file_system_read_directory`
  - Mendaftar konten direktori menggunakan path absolut
  - Mengembalikan daftar berformat yang menampilkan file dan subdirektori dengan indikator yang jelas
  - Menampilkan file dan direktori dengan indikator yang jelas (`[FILE]` atau `[DIR]`)
  - Menyediakan navigasi direktori yang aman dengan penanganan error yang tepat
  - Memvalidasi path dan memastikan mereka absolut
  - Berguna untuk mengeksplorasi struktur proyek dan memahami organisasi codebase

Kedua tools menggabungkan tindakan keamanan yang kuat:
- Validasi path absolut untuk mencegah serangan directory traversal
- Pemeriksaan izin untuk memastikan hak akses yang tepat
- Integrasi dengan Secretlint untuk deteksi informasi sensitif
- Pesan error yang jelas untuk debugging dan kesadaran keamanan yang lebih baik

**Contoh:**
```typescript
// Membaca file
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Mendaftar konten direktori
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Tools ini sangat berguna ketika asisten AI perlu:
- Menganalisis file spesifik dalam codebase
- Menavigasi struktur direktori
- Memverifikasi eksistensi dan aksesibilitas file
- Memastikan operasi filesystem yang aman

## Manfaat Menggunakan Repomix sebagai Server MCP

Menggunakan Repomix sebagai server MCP menawarkan beberapa keuntungan:

1. **Integrasi Langsung**: Asisten AI dapat menganalisis codebase Anda secara langsung tanpa persiapan file manual.
2. **Workflow Efisien**: Merampingkan proses analisis kode dengan menghilangkan kebutuhan untuk menghasilkan dan mengunggah file secara manual.
3. **Output Konsisten**: Memastikan asisten AI menerima codebase dalam format yang konsisten dan dioptimalkan.
4. **Fitur Lanjutan**: Memanfaatkan semua fitur Repomix seperti kompresi kode, penghitungan token, dan pemeriksaan keamanan.

Setelah dikonfigurasi, asisten AI Anda dapat langsung menggunakan kemampuan Repomix untuk menganalisis codebase, membuat workflow analisis kode lebih efisien.

## Sumber Daya Terkait

- [Plugin Claude Code](/id/guide/claude-code-plugins) - Integrasi plugin yang nyaman untuk Claude Code
- [Konfigurasi](/id/guide/configuration) - Kustomisasi perilaku Repomix
- [Opsi Baris Perintah](/id/guide/command-line-options) - Referensi CLI lengkap
- [Format Output](/id/guide/output) - Pelajari tentang format output yang tersedia
