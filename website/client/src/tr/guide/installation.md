# Kurulum

## npx ile Kullanım (Kurulum Gerekmez)

```bash
npx repomix@latest
```

## Global Kurulum

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

## Docker ile Kurulum

Docker imajını çekip çalıştırın:

```bash
# Mevcut dizin
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Belirli bir dizin
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Uzak depo
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode Eklentisi

Topluluk tarafından geliştirilen [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) eklentisiyle Repomix'i doğrudan VSCode içinde çalıştırın.

Özellikler:
- Birkaç tıklamayla herhangi bir klasörü paketleyin
- Kopyalama için dosya veya içerik modu arasında seçim yapın
- Çıktı dosyalarını otomatik temizleme
- repomix.config.json desteği

[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)'ten kurun.

## Tarayıcı Eklentisi

Herhangi bir GitHub deposundan Repomix'e anında erişin! Chrome eklentimiz, GitHub depo sayfalarına kullanışlı bir "Repomix" düğmesi ekler.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Kurulum
- Chrome Eklentisi: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox Eklentisi: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Özellikler
- Herhangi bir GitHub deposu için tek tıkla Repomix erişimi
- Yakında daha heyecan verici özellikler!

## Sistem Gereksinimleri

- Node.js: ≥ 20.0.0
- Git: Uzak depo işleme için gerekli

## Doğrulama

Kurulumdan sonra Repomix'in çalıştığını doğrulayın:

```bash
repomix --version
repomix --help
```
