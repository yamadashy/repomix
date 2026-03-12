# Instalasi


Repomix dapat diinstal dengan berbagai cara, tergantung pada kebutuhan dan preferensi Anda.

## Menggunakan npx (Tanpa Instalasi)

Cara tercepat untuk mencoba Repomix adalah dengan menggunakan `npx` tanpa instalasi:

```bash
npx repomix@latest
```

Ini akan mengunduh dan menjalankan Repomix secara langsung di direktori proyek Anda.

## Instalasi Global

Untuk penggunaan berulang, Anda dapat menginstal Repomix secara global:

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Menggunakan Docker

Anda juga dapat menjalankan Repomix menggunakan Docker:

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

## Ekstensi Browser

Dapatkan akses instan ke Repomix langsung dari repositori GitHub mana pun! Ekstensi browser kami menambahkan tombol "Repomix" yang nyaman ke halaman repositori GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Instalasi
- Ekstensi Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Add-on Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Fitur
- Akses satu klik ke Repomix untuk repositori GitHub mana pun
- Fitur menarik lainnya akan segera hadir!

## Verifikasi Instalasi

Setelah instalasi, Anda dapat memverifikasi bahwa Repomix telah diinstal dengan benar dengan menjalankan:

```bash
repomix --version
```

## Langkah Selanjutnya

Setelah Anda menginstal Repomix, lihat [Panduan Penggunaan](usage.md) untuk mempelajari cara menggunakannya.
