---
title: Xử lý kho lưu trữ GitHub
description: Đóng gói các kho lưu trữ GitHub bằng Repomix với URL đầy đủ, dạng viết tắt user/repo, nhánh, tag, commit, Docker và các kiểm soát tin cậy cấu hình từ xa.
---

# Xử lý kho lưu trữ GitHub

## Cách sử dụng cơ bản

Xử lý các kho lưu trữ công khai:
```bash
# Sử dụng URL đầy đủ
repomix --remote https://github.com/user/repo

# Sử dụng dạng viết tắt của GitHub
repomix --remote user/repo
```

Bạn cũng có thể truyền trực tiếp dạng viết tắt `owner/repo` mà không cần `--remote`:

```bash
repomix yamadashy/repomix
```

Vì `owner/repo` cũng trông giống như một đường dẫn cục bộ tương đối, Repomix chỉ coi nó là kho lưu trữ từ xa khi không tồn tại tệp hoặc thư mục cục bộ nào có tên đó và kho lưu trữ có thể truy cập được trên GitHub. Một đường dẫn cục bộ trùng khớp luôn được ưu tiên; để buộc xử lý cục bộ cho một đường dẫn có dạng `owner/repo`, hãy thêm tiền tố `./` (ví dụ, `repomix ./owner/repo`). Nếu đối số khớp với mẫu nhưng không thể truy cập kho lưu trữ (ví dụ, kho lưu trữ riêng tư hoặc lỗi đánh máy), Repomix sẽ quay lại xử lý nó như một đường dẫn cục bộ.

## Lựa chọn nhánh và commit

```bash
# Nhánh cụ thể
repomix --remote user/repo --remote-branch main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Mã hash của commit
repomix --remote user/repo --remote-branch 935b695
```

## Yêu cầu

- Phải cài đặt Git
- Kết nối Internet
- Quyền đọc kho lưu trữ

## Kiểm soát đầu ra

```bash
# Vị trí đầu ra tùy chỉnh
repomix --remote user/repo -o custom-output.xml

# Với định dạng XML
repomix --remote user/repo --style xml

# Xóa các comment
repomix --remote user/repo --remove-comments
```

## Sử dụng Docker

```bash
# Xử lý và xuất ra thư mục hiện tại
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Xuất ra thư mục cụ thể
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Bảo mật

Vì lý do bảo mật, các tệp cấu hình (`repomix.config.*`) trong các kho lưu trữ từ xa không được tải theo mặc định. Điều này ngăn các kho lưu trữ không đáng tin cậy thực thi mã thông qua các tệp cấu hình như `repomix.config.ts`.

Cấu hình toàn cục và các tùy chọn CLI của bạn vẫn được áp dụng.

Để tin cậy cấu hình của một kho lưu trữ từ xa:

```bash
# Sử dụng cờ CLI
repomix --remote user/repo --remote-trust-config

# Sử dụng biến môi trường
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Khi sử dụng `--config` với `--remote`, bắt buộc phải có đường dẫn tuyệt đối:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Các vấn đề thường gặp

### Vấn đề truy cập
- Đảm bảo kho lưu trữ là công khai
- Kiểm tra việc cài đặt Git
- Xác minh kết nối Internet

### Kho lưu trữ lớn
- Sử dụng `--include` để chọn các đường dẫn cụ thể
- Bật `--remove-comments`
- Xử lý các nhánh riêng biệt

## Tài nguyên liên quan

- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tài liệu tham khảo CLI đầy đủ bao gồm các tùy chọn `--remote`
- [Cấu hình](/vi/guide/configuration) - Thiết lập các tùy chọn mặc định cho xử lý từ xa
- [Nén mã](/vi/guide/code-compress) - Giảm kích thước đầu ra cho các kho lưu trữ lớn
- [Bảo mật](/vi/guide/security) - Cách Repomix xử lý việc phát hiện dữ liệu nhạy cảm
