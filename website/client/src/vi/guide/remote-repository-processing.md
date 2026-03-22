# Xử lý kho lưu trữ GitHub

Repomix có thể xử lý các kho lưu trữ từ xa mà không cần clone chúng cục bộ, giúp bạn dễ dàng đóng gói và phân tích các dự án mã nguồn mở.

## Tổng quan

Tính năng xử lý kho lưu trữ từ xa cho phép bạn:

- Đóng gói các kho lưu trữ GitHub công khai
- Chỉ định nhánh, thẻ hoặc commit cụ thể
- Xử lý các đường dẫn cụ thể trong kho lưu trữ
- Phân tích các dự án mã nguồn mở mà không cần clone chúng

## Cú pháp cơ bản

Để xử lý một kho lưu trữ từ xa, sử dụng tùy chọn `--remote`:

```bash
repomix --remote <url_or_shorthand>
```

## Định dạng URL được hỗ trợ

Repomix hỗ trợ nhiều định dạng URL khác nhau:

### Định dạng rút gọn

```bash
repomix --remote owner/repo
```

Ví dụ:

```bash
repomix --remote yamadashy/repomix
```

### URL đầy đủ

```bash
repomix --remote https://github.com/owner/repo
```

Ví dụ:

```bash
repomix --remote https://github.com/yamadashy/repomix
```

### URL nhánh cụ thể

```bash
repomix --remote https://github.com/owner/repo/tree/branch
```

Ví dụ:

```bash
repomix --remote https://github.com/yamadashy/repomix/tree/main
```

### Chỉ định commit cụ thể

Để xử lý một commit cụ thể, sử dụng tùy chọn `--remote-branch` với mã hash commit:

```bash
repomix --remote owner/repo --remote-branch commit_hash
```

Ví dụ:

```bash
repomix --remote yamadashy/repomix --remote-branch 836abcd7335137228ad77feb28655d85712680f1
```

### URL đường dẫn cụ thể

```bash
repomix --remote https://github.com/owner/repo/tree/branch/path/to/directory
```

Ví dụ:

```bash
repomix --remote https://github.com/yamadashy/repomix/tree/main/src
```

## Ví dụ sử dụng

### Đóng gói kho lưu trữ từ xa với định dạng mặc định

```bash
repomix --remote yamadashy/repomix
```

### Đóng gói kho lưu trữ từ xa với định dạng Markdown

```bash
repomix --remote yamadashy/repomix --style markdown
```

### Đóng gói một nhánh cụ thể

```bash
repomix --remote https://github.com/yamadashy/repomix/tree/develop
```

### Đóng gói một thư mục cụ thể trong kho lưu trữ

```bash
repomix --remote https://github.com/yamadashy/repomix/tree/main/src
```

### Đóng gói một commit cụ thể

```bash
repomix --remote yamadashy/repomix --remote-branch 836abcd7335137228ad77feb28655d85712680f1
```

## Giới hạn và lưu ý

Khi sử dụng tính năng xử lý kho lưu trữ từ xa, hãy lưu ý những điểm sau:

- **Chỉ hỗ trợ kho lưu trữ công khai**: Tính năng này chỉ hoạt động với các kho lưu trữ GitHub công khai.
- **Giới hạn kích thước**: Các kho lưu trữ rất lớn có thể gặp vấn đề do giới hạn API GitHub.
- **Không có hỗ trợ .gitignore**: Khi xử lý kho lưu trữ từ xa, Repomix không thể tôn trọng các tệp .gitignore vì nó không có quyền truy cập vào cấu hình Git cục bộ.
- **Giới hạn API**: Có thể áp dụng giới hạn tốc độ API GitHub.

## Sử dụng với Docker

Bạn cũng có thể xử lý các kho lưu trữ từ xa bằng cách sử dụng hình ảnh Docker của Repomix:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

Lệnh này sẽ đóng gói kho lưu trữ từ xa và lưu đầu ra vào thư mục `output` cục bộ của bạn.

## Bảo mật

Để đảm bảo an toàn, các tệp cấu hình (`repomix.config.*`) trong kho lưu trữ từ xa sẽ không được tải theo mặc định. Điều này ngăn chặn các kho lưu trữ không đáng tin cậy thực thi mã thông qua các tệp cấu hình như `repomix.config.ts`.

Cấu hình toàn cục và các tùy chọn dòng lệnh của bạn vẫn được áp dụng.

Để tin tưởng cấu hình của kho lưu trữ từ xa:

```bash
# Sử dụng cờ dòng lệnh
repomix --remote user/repo --remote-trust-config

# Sử dụng biến môi trường
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Khi sử dụng `--config` với `--remote`, cần chỉ định đường dẫn tuyệt đối:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Tiếp theo là gì?

- [Tùy chọn dòng lệnh](command-line-options.md): Xem tất cả các tùy chọn dòng lệnh có sẵn
- [Cấu hình](configuration.md): Tìm hiểu về tệp cấu hình
- [GitHub Actions](github-actions.md): Tìm hiểu về tích hợp GitHub Actions
