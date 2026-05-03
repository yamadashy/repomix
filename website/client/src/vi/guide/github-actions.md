---
title: GitHub Actions
description: Tự động hóa Repomix trong GitHub Actions để đóng gói repository cho phân tích AI, CI workflow, artifact, code review và output đã nén.
---

# GitHub Actions

Repomix có thể được tích hợp vào quy trình CI/CD của bạn bằng cách sử dụng GitHub Actions, cho phép bạn tự động đóng gói kho lưu trữ của mình và cung cấp đầu ra cho các bước tiếp theo.

## Tổng quan

Tích hợp Repomix với GitHub Actions cho phép bạn:

- Tự động đóng gói kho lưu trữ của bạn khi có thay đổi
- Lưu trữ đầu ra đã đóng gói dưới dạng artifact
- Sử dụng đầu ra đã đóng gói trong các bước quy trình công việc tiếp theo
- Tích hợp với các công cụ AI trong quy trình CI/CD của bạn

## Sử dụng hành động Repomix

Repomix cung cấp một hành động GitHub chính thức mà bạn có thể sử dụng trong quy trình công việc của mình:

```yaml
name: Repomix

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Pack repository
        uses: yamadashy/repomix-action@v1
        with:
          output-file: 'repomix-output.xml'
          style: 'xml'
          remove-comments: false
          show-line-numbers: false
          
      - name: Pack repository (JSON format)
        uses: yamadashy/repomix-action@v1
        with:
          output-file: 'repomix-output.json'
          style: 'json'

      - name: Upload packed output
        uses: actions/upload-artifact@v3
        with:
          name: repomix-output
          path: repomix-output.xml
```

## Tùy chọn cấu hình

Hành động Repomix hỗ trợ các tùy chọn cấu hình sau:

| Tùy chọn | Mô tả | Mặc định |
| --- | --- | --- |
| `output-file` | Tên tệp đầu ra | `repomix-output.xml` |
| `style` | Định dạng đầu ra (xml, markdown, json, plain) | `xml` |
| `remove-comments` | Xóa bình luận khỏi mã nguồn | `false` |
| `show-line-numbers` | Hiển thị số dòng trong đầu ra | `false` |
| `include` | Mẫu bao gồm (phân tách bằng dấu phẩy) | |
| `ignore` | Mẫu bỏ qua (phân tách bằng dấu phẩy) | |
| `respect-gitignore` | Tôn trọng các tệp .gitignore | `true` |
| `compress-code` | Nén mã bằng cách chỉ bao gồm chữ ký hàm | `false` |
| `security-check` | Bật kiểm tra bảo mật | `true` |
| `token-count` | Bật đếm token | `true` |

## Ví dụ quy trình công việc

### Đóng gói và tải lên artifact

```yaml
name: Pack Repository

on:
  push:
    branches: [ main ]

jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Pack repository
        uses: yamadashy/repomix-action@v1
        with:
          output-file: 'codebase.md'
          style: 'markdown'
          remove-comments: true
          show-line-numbers: true

      - name: Upload packed output
        uses: actions/upload-artifact@v3
        with:
          name: codebase
          path: codebase.md
```

### Đóng gói với các mẫu tùy chỉnh

```yaml
name: Pack Repository

on:
  push:
    branches: [ main ]

jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Pack repository
        uses: yamadashy/repomix-action@v1
        with:
          output-file: 'repomix-output.xml'
          include: 'src/**/*.ts,**/*.md'
          ignore: '**/*.test.ts,docs/**'
          compress-code: true
```

### Đóng gói và sử dụng trong bước tiếp theo

```yaml
name: Analyze Repository

on:
  push:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Pack repository
        uses: yamadashy/repomix-action@v1
        with:
          output-file: 'codebase.md'
          style: 'markdown'

      - name: Analyze codebase
        uses: some-ai-analysis-action@v1
        with:
          input-file: 'codebase.md'
```

## Sử dụng Repomix trực tiếp

Nếu bạn muốn sử dụng Repomix trực tiếp trong quy trình công việc của mình thay vì sử dụng hành động chính thức, bạn có thể làm như sau:

```yaml
name: Pack Repository

on:
  push:
    branches: [ main ]

jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Repomix
        run: npm install -g repomix

      - name: Pack repository
        run: repomix --style markdown --output-file codebase.md

      - name: Upload packed output
        uses: actions/upload-artifact@v3
        with:
          name: codebase
          path: codebase.md
```

## Lưu ý bảo mật

Khi sử dụng Repomix trong GitHub Actions, hãy lưu ý những điểm sau:

- Đảm bảo rằng kiểm tra bảo mật được bật để ngăn chặn việc vô tình tiết lộ thông tin nhạy cảm
- Xem xét sử dụng bí mật GitHub cho thông tin nhạy cảm thay vì mã hóa cứng chúng trong mã
- Hãy cẩn thận khi chia sẻ artifact đã đóng gói, vì chúng có thể chứa thông tin nhạy cảm

## Tiếp theo là gì?

- [Tùy chọn dòng lệnh](command-line-options.md): Xem tất cả các tùy chọn dòng lệnh có sẵn
- [Cấu hình](configuration.md): Tìm hiểu về tệp cấu hình
- [Bảo mật](security.md): Tìm hiểu về tính năng bảo mật của Repomix
