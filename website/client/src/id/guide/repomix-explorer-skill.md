# Repomix Explorer Skill (Agent Skills)

Repomix menyediakan skill **Repomix Explorer** yang siap pakai yang memungkinkan asisten coding AI untuk menganalisis dan menjelajahi codebase menggunakan Repomix CLI.

Skill ini dirancang untuk bekerja dengan berbagai alat AI termasuk Claude Code, Cursor, Codex, GitHub Copilot, dan lainnya.

## Instalasi Cepat

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Perintah ini menginstal skill ke direktori skills asisten AI Anda (misalnya `.claude/skills/`), membuatnya langsung tersedia.

## Apa yang Dilakukan

Setelah diinstal, Anda dapat menganalisis codebase dengan instruksi bahasa alami.

#### Analisis repository jarak jauh

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Jelajahi codebase lokal

```text
"What's in this project?
~/projects/my-app"
```

Ini berguna tidak hanya untuk memahami codebase, tetapi juga ketika Anda ingin mengimplementasikan fitur dengan mereferensikan repository Anda yang lain.

## Cara Kerja

Skill Repomix Explorer memandu asisten AI melalui alur kerja lengkap:

1. **Jalankan perintah repomix** - Paket repository ke format yang ramah AI
2. **Analisis file output** - Gunakan pencarian pola (grep) untuk menemukan kode yang relevan
3. **Berikan wawasan** - Laporkan struktur, metrik, dan rekomendasi yang dapat ditindaklanjuti

## Contoh Kasus Penggunaan

### Memahami Codebase Baru

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI akan menjalankan repomix, menganalisis output, dan memberikan gambaran terstruktur dari codebase.

### Menemukan Pola Tertentu

```text
"Find all authentication-related code in this repository."
```

AI akan mencari pola autentikasi, mengkategorikan temuan berdasarkan file, dan menjelaskan bagaimana autentikasi diimplementasikan.

### Mereferensikan Proyek Anda Sendiri

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI akan menganalisis repository Anda yang lain dan membantu Anda mereferensikan implementasi Anda sendiri.

## Konten Skill

Skill ini mencakup:

- **Pengenalan maksud pengguna** - Memahami berbagai cara pengguna meminta analisis codebase
- **Panduan perintah Repomix** - Mengetahui opsi mana yang digunakan (`--compress`, `--include`, dll.)
- **Alur kerja analisis** - Pendekatan terstruktur untuk menjelajahi output yang dipaket
- **Praktik terbaik** - Tips efisiensi seperti menggunakan grep sebelum membaca seluruh file

## Sumber Daya Terkait

- [Pembuatan Agent Skills](/id/guide/agent-skills-generation) - Buat skill Anda sendiri dari codebase
- [Plugin Claude Code](/id/guide/claude-code-plugins) - Plugin Repomix untuk Claude Code
- [Server MCP](/id/guide/mcp-server) - Metode integrasi alternatif
