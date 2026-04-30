# Đóng góp cho Repomix

Repomix là một dự án mã nguồn mở và chúng tôi hoan nghênh đóng góp từ cộng đồng. Trang này cung cấp thông tin về cách bạn có thể đóng góp cho dự án.

## Thiết lập môi trường phát triển

### Yêu cầu

- Node.js (phiên bản 20 trở lên)
- npm hoặc yarn
- Git

### Clone kho lưu trữ

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
```

### Cài đặt phụ thuộc

```bash
npm install
```

hoặc nếu bạn sử dụng yarn:

```bash
yarn install
```

### Xây dựng dự án

```bash
npm run build
```

### Chạy các bài kiểm tra

```bash
npm run test
```

### Chạy linter

```bash
npm run lint
```

### Phát triển với Nix

Nếu bạn có [Nix](https://nixos.org/download) với flakes được bật, bạn có thể vào một shell phát triển có thể tái tạo với Node.js 24 và Git được cài đặt sẵn:

```bash
nix develop
```

Trong shell, quy trình `npm` tiêu chuẩn hoạt động như mong đợi:

```bash
npm ci
npm run build
npm run test
npm run lint
```

Lưu ý: shell này dùng để phát triển Repomix, không phải để cài đặt như một CLI.

## Cấu trúc dự án

Dự án Repomix được tổ chức như sau:

```
repomix/
├── src/                  # Mã nguồn chính
│   ├── cli/              # Giao diện dòng lệnh
│   ├── core/             # Chức năng cốt lõi
│   ├── formatters/       # Trình định dạng đầu ra
│   ├── security/         # Kiểm tra bảo mật
│   └── utils/            # Tiện ích
├── test/                 # Bài kiểm tra
├── website/              # Tài liệu trang web
├── .github/              # Cấu hình GitHub
├── package.json          # Cấu hình npm
└── tsconfig.json         # Cấu hình TypeScript
```

## Quy trình đóng góp

### 1. Tạo một vấn đề

Trước khi bắt đầu làm việc trên một tính năng hoặc sửa lỗi, hãy tạo một vấn đề trên GitHub để thảo luận về nó. Điều này giúp đảm bảo rằng công việc của bạn phù hợp với hướng đi của dự án và tránh trùng lặp nỗ lực.

### 2. Fork kho lưu trữ

Fork kho lưu trữ Repomix vào tài khoản GitHub của bạn.

### 3. Tạo một nhánh

Tạo một nhánh mới cho tính năng hoặc sửa lỗi của bạn:

```bash
git checkout -b feature/your-feature-name
```

hoặc

```bash
git checkout -b fix/your-bug-fix
```

### 4. Thực hiện thay đổi của bạn

Thực hiện thay đổi của bạn, tuân theo các quy ước mã của dự án:

- Sử dụng TypeScript cho mã mới
- Tuân theo quy ước đặt tên camelCase cho biến và PascalCase cho lớp
- Viết bài kiểm tra cho mã mới
- Đảm bảo tất cả các bài kiểm tra đều vượt qua
- Cập nhật tài liệu nếu cần

### 5. Commit thay đổi của bạn

```bash
git add .
git commit -m "feat: add new feature" # hoặc "fix: fix some bug"
```

Chúng tôi sử dụng quy ước commit [Conventional Commits](https://www.conventionalcommits.org/).

### 6. Đẩy lên fork của bạn

```bash
git push origin feature/your-feature-name
```

### 7. Tạo một Pull Request

Tạo một Pull Request từ nhánh của bạn đến nhánh `main` của kho lưu trữ Repomix. Trong mô tả Pull Request của bạn:

- Tham chiếu đến vấn đề mà PR giải quyết
- Mô tả thay đổi của bạn
- Mô tả cách kiểm tra thay đổi của bạn
- Thêm ảnh chụp màn hình nếu có thay đổi trực quan

### 8. Xem xét mã

Nhóm Repomix sẽ xem xét PR của bạn và có thể yêu cầu thay đổi. Hãy kiên nhẫn và phản hồi các yêu cầu xem xét một cách kịp thời.

### 9. Hợp nhất

Sau khi PR của bạn được phê duyệt, nó sẽ được hợp nhất vào nhánh chính.

## Hướng dẫn đóng góp

### Mã

- Viết mã rõ ràng và dễ bảo trì
- Bao gồm nhận xét cho mã phức tạp
- Tuân theo các quy ước mã hiện có
- Viết bài kiểm tra cho mã mới
- Đảm bảo tất cả các bài kiểm tra đều vượt qua
- Cập nhật tài liệu nếu cần

### Tài liệu

- Viết tài liệu rõ ràng và ngắn gọn
- Bao gồm ví dụ khi có thể
- Kiểm tra chính tả và ngữ pháp
- Giữ cho tài liệu cập nhật với các thay đổi mã

### Báo cáo lỗi

Khi báo cáo lỗi, hãy bao gồm:

- Phiên bản Repomix bạn đang sử dụng
- Hệ điều hành và phiên bản của bạn
- Các bước để tái tạo lỗi
- Hành vi thực tế và hành vi mong đợi
- Ảnh chụp màn hình hoặc nhật ký nếu có

### Yêu cầu tính năng

Khi yêu cầu tính năng, hãy bao gồm:

- Mô tả rõ ràng về tính năng
- Lý do tại sao tính năng này sẽ có giá trị
- Ví dụ về cách tính năng sẽ được sử dụng
- Bất kỳ tài liệu tham khảo hoặc ví dụ từ các dự án khác

## Phát hành

Repomix tuân theo [Semantic Versioning](https://semver.org/). Các phiên bản được đặt tên theo định dạng `MAJOR.MINOR.PATCH`:

- `MAJOR`: Thay đổi không tương thích với API
- `MINOR`: Thêm chức năng tương thích ngược
- `PATCH`: Sửa lỗi tương thích ngược

## Liên hệ

Nếu bạn có bất kỳ câu hỏi nào về đóng góp cho Repomix, vui lòng:

- [Tham gia Discord của chúng tôi](https://discord.gg/wNYzTwZFku)
- [Mở một vấn đề trên GitHub](https://github.com/yamadashy/repomix/issues)

## Tiếp theo là gì?

- [Sử dụng Repomix như một thư viện](using-repomix-as-a-library.md): Tìm hiểu cách sử dụng Repomix như một thư viện trong dự án của bạn
- [Mẹo phát triển hỗ trợ AI](../tips/best-practices.md): Tìm hiểu về các thực hành tốt nhất cho phát triển hỗ trợ AI
