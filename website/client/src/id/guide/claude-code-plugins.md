# Plugin Claude Code

Repomix menyediakan plugin resmi untuk [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) yang terintegrasi secara mulus dengan lingkungan pengembangan berbasis AI. Plugin ini memudahkan Anda untuk menganalisis dan mengemas codebase langsung di dalam Claude Code menggunakan perintah bahasa alami.

## Instalasi

### 1. Tambahkan Marketplace Plugin Repomix

Pertama, tambahkan marketplace plugin Repomix ke Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Instal Plugin

Instal plugin menggunakan perintah berikut:

```text
# Instal plugin server MCP (dasar yang direkomendasikan)
/plugin install repomix-mcp@repomix

# Instal plugin perintah (memperluas fungsionalitas)
/plugin install repomix-commands@repomix

# Instal plugin penjelajah repositori (analisis berbasis AI)
/plugin install repomix-explorer@repomix
```

::: tip Hubungan Plugin
Plugin `repomix-mcp` direkomendasikan sebagai dasar. Plugin `repomix-commands` menyediakan perintah slash yang praktis, sementara `repomix-explorer` menambahkan kemampuan analisis berbasis AI. Meskipun Anda dapat menginstalnya secara independen, menggunakan ketiganya memberikan pengalaman yang paling komprehensif.
:::

### Alternatif: Instalasi Interaktif

Anda juga dapat menggunakan installer plugin interaktif:

```text
/plugin
```

Ini akan membuka antarmuka interaktif di mana Anda dapat menjelajahi dan menginstal plugin yang tersedia.

## Plugin yang Tersedia

### 1. repomix-mcp (Plugin Server MCP)

Plugin dasar yang menyediakan analisis codebase berbasis AI melalui integrasi server MCP.

**Fitur:**
- Mengemas repositori lokal dan remote
- Mencari output yang sudah dikemas
- Membaca file dengan pemindaian keamanan bawaan ([Secretlint](https://github.com/secretlint/secretlint))
- Kompresi Tree-sitter otomatis (mengurangi sekitar 70% token)

### 2. repomix-commands (Plugin Perintah Slash)

Menyediakan perintah slash yang praktis dengan dukungan bahasa alami.

**Perintah yang Tersedia:**
- `/repomix-commands:pack-local` - Mengemas codebase lokal dengan berbagai opsi
- `/repomix-commands:pack-remote` - Mengemas dan menganalisis repositori GitHub remote

### 3. repomix-explorer (Plugin Agen Analisis AI)

Agen analisis repositori berbasis AI yang mengeksplorasi codebase secara cerdas menggunakan Repomix CLI.

**Fitur:**
- Eksplorasi dan analisis codebase dengan bahasa alami
- Penemuan pola cerdas dan pemahaman struktur kode
- Analisis bertahap menggunakan grep dan pembacaan file tertarget
- Manajemen konteks otomatis untuk repositori besar

**Perintah yang Tersedia:**
- `/repomix-explorer:explore-local` - Menganalisis codebase lokal dengan bantuan AI
- `/repomix-explorer:explore-remote` - Menganalisis repositori GitHub remote dengan bantuan AI

**Cara kerjanya:**
1. Menjalankan `npx repomix@latest` untuk mengemas repositori
2. Menggunakan alat Grep dan Read untuk mencari output secara efisien
3. Memberikan analisis komprehensif tanpa mengkonsumsi konteks berlebihan

## Contoh Penggunaan

### Mengemas Codebase Lokal

Gunakan perintah `/repomix-commands:pack-local` dengan instruksi bahasa alami:

```text
/repomix-commands:pack-local
Kemas proyek ini dalam format Markdown dengan kompresi
```

Contoh lainnya:
- "Kemas hanya direktori src"
- "Kemas file TypeScript dengan nomor baris"
- "Buat output dalam format JSON"

### Mengemas Repositori Remote

Gunakan perintah `/repomix-commands:pack-remote` untuk menganalisis repositori GitHub:

```text
/repomix-commands:pack-remote yamadashy/repomix
Kemas hanya file TypeScript dari repositori yamadashy/repomix
```

Contoh lainnya:
- "Kemas branch main dengan kompresi"
- "Sertakan hanya file dokumentasi"
- "Kemas direktori tertentu"

### Menjelajahi Codebase Lokal dengan AI

Gunakan perintah `/repomix-explorer:explore-local` untuk analisis berbasis AI:

```text
/repomix-explorer:explore-local ./src
Temukan semua kode terkait autentikasi
```

Contoh lainnya:
- "Analisis struktur proyek ini"
- "Tunjukkan komponen utama"
- "Temukan semua endpoint API"

### Menjelajahi Repositori Remote dengan AI

Gunakan perintah `/repomix-explorer:explore-remote` untuk menganalisis repositori GitHub:

```text
/repomix-explorer:explore-remote facebook/react
Tunjukkan arsitektur komponen utama
```

Contoh lainnya:
- "Temukan semua React hooks di repositori"
- "Jelaskan struktur proyek"
- "Di mana error boundaries didefinisikan?"

## Sumber Daya Terkait

- [Dokumentasi Server MCP](/guide/mcp-server) - Pelajari tentang server MCP yang mendasari
- [Konfigurasi](/guide/configuration) - Sesuaikan perilaku Repomix
- [Keamanan](/guide/security) - Memahami fitur keamanan
- [Opsi Baris Perintah](/guide/command-line-options) - Opsi CLI yang tersedia

## Kode Sumber Plugin

Kode sumber plugin tersedia di repositori Repomix:

- [Marketplace Plugin](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [Plugin MCP](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Plugin Perintah](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Plugin Penjelajah Repositori](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Umpan Balik dan Dukungan

Jika Anda mengalami masalah atau memiliki saran untuk plugin Claude Code:

- [Buka issue di GitHub](https://github.com/yamadashy/repomix/issues)
- [Bergabunglah dengan komunitas Discord kami](https://discord.gg/wNYzTwZFku)
- [Lihat diskusi yang ada](https://github.com/yamadashy/repomix/discussions)
