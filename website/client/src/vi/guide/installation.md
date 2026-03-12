# Cài đặt

Có nhiều cách để cài đặt và sử dụng Repomix. Chọn phương pháp phù hợp nhất với quy trình làm việc của bạn.

## Sử dụng npx (Không cần cài đặt)

Cách đơn giản nhất để sử dụng Repomix mà không cần cài đặt là thông qua `npx`:

```bash
npx repomix@latest
```

Lệnh này sẽ tải và chạy phiên bản mới nhất của Repomix trực tiếp từ npm.

## Cài đặt toàn cục

Để sử dụng Repomix từ bất kỳ đâu trong hệ thống của bạn, bạn có thể cài đặt nó toàn cục:

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

Sau khi cài đặt toàn cục, bạn có thể chạy Repomix từ bất kỳ thư mục nào:

```bash
repomix
```

## Cài đặt cục bộ trong dự án

Nếu bạn muốn sử dụng Repomix như một phần của quy trình làm việc dự án của mình, bạn có thể cài đặt nó cục bộ:

### Sử dụng npm

```bash
npm install --save-dev repomix
```

### Sử dụng yarn

```bash
yarn add --dev repomix
```

### Sử dụng pnpm

```bash
pnpm add -D repomix
```

Sau đó, bạn có thể chạy nó thông qua npm scripts trong `package.json` của bạn:

```json
{
  "scripts": {
    "pack-code": "repomix"
  }
}
```

Và chạy nó với:

```bash
npm run pack-code
```

## Sử dụng Docker

Repomix cũng có sẵn dưới dạng hình ảnh Docker, cho phép bạn chạy nó trong một môi trường container:

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Lệnh này gắn kết thư mục hiện tại của bạn vào container và chạy Repomix trên nó.

## Phần mở rộng trình duyệt

Truy cập Repomix ngay lập tức từ bất kỳ repository GitHub nào! Phần mở rộng trình duyệt của chúng tôi thêm nút "Repomix" tiện lợi vào các trang repository GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Cài đặt
- Phần mở rộng Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Add-on Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Tính năng
- Truy cập Repomix chỉ với một cú nhấp chuột từ bất kỳ repository GitHub nào
- Thêm nhiều tính năng thú vị sắp ra mắt!

## Sử dụng GitHub Actions

Repomix có thể được tích hợp vào quy trình CI/CD của bạn bằng cách sử dụng GitHub Actions. Xem [Hướng dẫn GitHub Actions](github-actions.md) để biết thêm chi tiết.

## Xác minh cài đặt

Để xác minh rằng Repomix đã được cài đặt đúng cách, hãy chạy:

```bash
repomix --version
```

Lệnh này sẽ hiển thị phiên bản Repomix hiện được cài đặt.

## Tiếp theo là gì?

- [Sử dụng cơ bản](usage.md): Tìm hiểu cách sử dụng Repomix
- [Cấu hình](configuration.md): Tùy chỉnh Repomix cho nhu cầu của bạn
- [Tùy chọn dòng lệnh](command-line-options.md): Khám phá tất cả các tùy chọn có sẵn
