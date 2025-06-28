# Tùy chọn dòng lệnh

Repomix cung cấp nhiều tùy chọn dòng lệnh để tùy chỉnh hành vi của nó. Dưới đây là danh sách đầy đủ các tùy chọn có sẵn.

## Tùy chọn cơ bản

| Tùy chọn | Mô tả |
| --- | --- |
| `--help`, `-h` | Hiển thị thông tin trợ giúp |
| `--version`, `-v` | Hiển thị phiên bản |
| `--init` | Tạo tệp cấu hình mẫu (`repomix.config.json`) |

## Tùy chọn đầu vào

| Tùy chọn | Mô tả |
| --- | --- |
| `--remote <url>` | Xử lý kho lưu trữ từ xa thay vì kho lưu trữ cục bộ |
| `--include <patterns>` | Chỉ bao gồm các tệp khớp với các mẫu được cung cấp (phân tách bằng dấu phẩy) |
| `--ignore <patterns>` | Bỏ qua các tệp khớp với các mẫu được cung cấp (phân tách bằng dấu phẩy) |
| `--no-respect-gitignore` | Không tôn trọng các tệp .gitignore |
| `--config <path>` | Chỉ định đường dẫn đến tệp cấu hình |

## Tùy chọn đầu ra

| Tùy chọn | Mô tả |
| --- | --- |
| `--output-file <path>`, `-o <path>` | Chỉ định tên tệp đầu ra |
| `--style <style>` | Định dạng đầu ra (xml, markdown, plain) |
| `--remove-comments` | Xóa bình luận khỏi mã nguồn |
| `--show-line-numbers` | Hiển thị số dòng trong đầu ra |
| `--top-files-length <number>` | Số lượng tệp hàng đầu để hiển thị trong tóm tắt |

## Tùy chọn bảo mật

| Tùy chọn | Mô tả |
| --- | --- |
| `--no-security-check` | Tắt kiểm tra bảo mật |
| `--secretlint-config <path>` | Chỉ định đường dẫn đến tệp cấu hình Secretlint |

## Tùy chọn nâng cao

| Tùy chọn | Mô tả |
| --- | --- |
| `--compress-code` | Nén mã bằng cách chỉ bao gồm chữ ký hàm |
| `--no-token-count` | Tắt đếm token |
| `--no-color` | Tắt đầu ra màu |
| `--debug` | Bật chế độ gỡ lỗi |

## Ví dụ

### Đóng gói với các tùy chọn cơ bản

```bash
repomix --style markdown --output-file codebase.md
```

### Đóng gói với các mẫu bao gồm và loại trừ

```bash
repomix --include "src/**/*.ts,**/*.md" --ignore "**/*.test.ts,docs/**"
```

### Đóng gói với các tùy chọn nâng cao

```bash
repomix --remove-comments --show-line-numbers --compress-code
```

### Đóng gói kho lưu trữ từ xa

```bash
repomix --remote https://github.com/yamadashy/repomix --style markdown
```

## Sử dụng với tệp cấu hình

Thay vì chỉ định tất cả các tùy chọn trên dòng lệnh, bạn có thể sử dụng tệp cấu hình:

```bash
repomix --config custom-config.json
```

Hoặc chỉ cần đặt một tệp `repomix.config.json` trong thư mục hiện tại.

## Tiếp theo là gì?

- [Cấu hình](configuration.md): Tìm hiểu về tệp cấu hình
- [Sử dụng cơ bản](usage.md): Quay lại hướng dẫn sử dụng cơ bản
- [Xử lý kho lưu trữ từ xa](remote-repository-processing.md): Tìm hiểu thêm về xử lý kho lưu trữ từ xa
