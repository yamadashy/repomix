# Pembuatan Agent Skills

Repomix dapat menghasilkan output dalam format [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), membuat direktori Skills terstruktur yang dapat digunakan sebagai referensi codebase yang dapat digunakan kembali untuk asisten AI.

Fitur ini sangat powerful ketika Anda ingin mereferensikan implementasi dari repository jarak jauh. Dengan menghasilkan Skills dari proyek open source, Anda dapat dengan mudah meminta Claude untuk mereferensikan pola atau implementasi tertentu saat mengerjakan kode Anda sendiri.

Alih-alih menghasilkan satu file yang dikemas, pembuatan Skills membuat direktori terstruktur dengan beberapa file referensi yang dioptimalkan untuk pemahaman AI dan pencarian yang kompatibel dengan grep.

> [!NOTE]
> Ini adalah fitur eksperimental. Format output dan opsi dapat berubah di rilis mendatang berdasarkan umpan balik pengguna.

## Penggunaan Dasar

Hasilkan Skills dari direktori lokal Anda:

```bash
# Hasilkan Skills dari direktori saat ini
repomix --skill-generate

# Hasilkan dengan nama Skills kustom
repomix --skill-generate my-project-reference

# Hasilkan dari direktori tertentu
repomix path/to/directory --skill-generate

# Hasilkan dari repository jarak jauh
repomix --remote https://github.com/user/repo --skill-generate
```

## Pemilihan Lokasi Skills

Saat Anda menjalankan perintah, Repomix meminta Anda untuk memilih tempat menyimpan Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Tersedia di semua proyek di mesin Anda
2. **Project Skills** (`.claude/skills/`) - Dibagikan dengan tim Anda via git

Jika direktori Skills sudah ada, Anda akan diminta untuk mengkonfirmasi penimpaan.

> [!TIP]
> Saat menghasilkan Project Skills, pertimbangkan untuk menambahkannya ke `.gitignore` untuk menghindari commit file besar:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Struktur yang Dihasilkan

Skills dihasilkan dengan struktur berikut:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Metadata utama Skills & dokumentasi
└── references/
    ├── summary.md              # Tujuan, format, dan statistik
    ├── project-structure.md    # Pohon direktori dengan jumlah baris
    ├── files.md                # Semua konten file (kompatibel grep)
    └── tech-stack.md           # Bahasa, framework, dependensi
```

### Deskripsi File

#### SKILL.md

File Skills utama berisi:
- Nama Skills, deskripsi, dan info proyek
- Jumlah file, jumlah baris, dan jumlah token
- Gambaran cara menggunakan Skills
- Lokasi file dan penjelasan format
- Kasus penggunaan umum dan tips

#### references/summary.md

Berisi:
- **Tujuan**: Menjelaskan ini adalah codebase referensi untuk konsumsi AI
- **Struktur File**: Mendokumentasikan isi setiap file referensi
- **Panduan Penggunaan**: Cara menggunakan Skills secara efektif
- **Statistik**: Rincian berdasarkan tipe file, bahasa, dan file terbesar

#### references/project-structure.md

Pohon direktori dengan jumlah baris per file untuk penemuan file yang mudah:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Semua konten file dengan header syntax highlighting, dioptimalkan untuk pencarian kompatibel grep:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Tech stack yang terdeteksi otomatis dari file dependensi:
- **Bahasa**: TypeScript, JavaScript, Python, dll.
- **Framework**: React, Next.js, Express, Django, dll.
- **Versi Runtime**: Node.js, Python, Go, dll.
- **Package Manager**: npm, pnpm, poetry, dll.
- **Dependensi**: Semua dependensi langsung dan dev
- **File Konfigurasi**: Semua file konfigurasi yang terdeteksi

Terdeteksi dari file seperti: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, dll.

## Nama Skills yang Dihasilkan Otomatis

Jika tidak ada nama yang diberikan, Repomix otomatis menghasilkan satu dengan pola ini:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (dinormalisasi ke kebab-case)
```

Nama Skills akan:
- Dikonversi ke kebab-case (huruf kecil, dipisahkan tanda hubung)
- Dibatasi maksimal 64 karakter
- Dilindungi terhadap path traversal

## Integrasi dengan Opsi Repomix

Pembuatan Skills menghormati semua opsi standar Repomix:

```bash
# Hasilkan Skills dengan pemfilteran file
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Hasilkan Skills dengan kompresi
repomix --skill-generate --compress

# Hasilkan Skills dari repository jarak jauh
repomix --remote yamadashy/repomix --skill-generate

# Hasilkan Skills dengan opsi format output tertentu
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Hanya Dokumentasi

Menggunakan `--include`, Anda dapat menghasilkan Skills yang hanya berisi dokumentasi dari repository GitHub. Ini berguna ketika Anda ingin Claude mereferensikan dokumentasi library atau framework tertentu saat mengerjakan kode Anda:

```bash
# Dokumentasi Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Dokumentasi Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Dokumentasi React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Keterbatasan

Opsi `--skill-generate` tidak dapat digunakan dengan:
- `--stdout` - Output Skills memerlukan penulisan ke filesystem
- `--copy` - Output Skills adalah direktori, tidak dapat disalin ke clipboard

## Menggunakan Skills yang Dihasilkan

Setelah dihasilkan, Anda dapat menggunakan Skills dengan Claude:

1. **Claude Code**: Skills otomatis tersedia jika disimpan ke `~/.claude/skills/` atau `.claude/skills/`
2. **Claude Web**: Unggah direktori Skills ke Claude untuk analisis codebase
3. **Berbagi Tim**: Commit `.claude/skills/` ke repository Anda untuk akses seluruh tim

## Contoh Alur Kerja

### Membuat Library Referensi Pribadi

```bash
# Clone dan analisis proyek open source yang menarik
repomix --remote facebook/react --skill-generate react-reference

# Skills disimpan ke ~/.claude/skills/react-reference/
# Sekarang Anda dapat mereferensikan codebase React dalam percakapan Claude mana pun
```

### Dokumentasi Proyek Tim

```bash
# Di direktori proyek Anda
cd my-project

# Hasilkan Skills untuk tim Anda
repomix --skill-generate

# Pilih "Project Skills" saat diminta
# Skills disimpan ke .claude/skills/repomix-reference-my-project/

# Commit dan bagikan dengan tim Anda
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Sumber Daya Terkait

- [Plugin Claude Code](/id/guide/claude-code-plugins) - Pelajari tentang plugin Repomix untuk Claude Code
- [Server MCP](/id/guide/mcp-server) - Metode integrasi alternatif
- [Kompresi Kode](/id/guide/code-compress) - Kurangi jumlah token dengan kompresi
- [Konfigurasi](/id/guide/configuration) - Sesuaikan perilaku Repomix
