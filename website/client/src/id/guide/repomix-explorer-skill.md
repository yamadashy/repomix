---
title: Repomix Explorer Skill (Agent Skills)
description: Instal Repomix Explorer agent skill untuk menganalisis codebase lokal dan remote dengan Claude Code serta AI assistant lain yang mendukung format Agent Skills.
---

# Repomix Explorer Skill (Agent Skills)

Repomix menyediakan skill **Repomix Explorer** yang siap pakai yang memungkinkan asisten coding AI untuk menganalisis dan menjelajahi codebase menggunakan Repomix CLI.

Skill ini dirancang untuk Claude Code dan AI assistant lain yang mendukung format Agent Skills.

## Instalasi Cepat

Untuk Claude Code, instal plugin resmi Repomix Explorer:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Plugin Claude Code menyediakan perintah bernama seperti `/repomix-explorer:explore-local` dan `/repomix-explorer:explore-remote`. Lihat [Plugin Claude Code](/id/guide/claude-code-plugins) untuk setup lengkap.

Untuk Codex, Cursor, OpenClaw, dan asisten lain yang kompatibel dengan Agent Skills, instal skill mandiri dengan Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Untuk menargetkan asisten tertentu, gunakan `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Untuk Hermes Agent, instal skill satu file dengan perintah skills native Hermes Agent:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Jika Anda memakai Hermes Agent terutama untuk analisis repository, setup [MCP Server](/id/guide/mcp-server) juga merupakan opsi yang baik karena menjalankan Repomix langsung sebagai MCP server.

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
