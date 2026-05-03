---
title: FAQ và khắc phục sự cố
description: Câu trả lời cho các câu hỏi thường gặp về Repomix, repository riêng tư, định dạng output, giảm token, repository GitHub remote, bảo mật và workflow AI.
---

# FAQ và khắc phục sự cố

Trang này giúp chọn workflow Repomix phù hợp, giảm output quá lớn và chuẩn bị ngữ cảnh codebase cho trợ lý AI.

## Câu hỏi thường gặp

### Repomix dùng để làm gì?

Repomix đóng gói repository thành một file thân thiện với AI. Bạn có thể đưa ngữ cảnh codebase đầy đủ cho ChatGPT, Claude, Gemini hoặc trợ lý khác để review code, điều tra bug, refactor, viết tài liệu và onboarding.

### Repomix có dùng được với repository riêng tư không?

Có. Chạy Repomix cục bộ trong checkout mà máy của bạn đã có quyền truy cập:

```bash
repomix
```

Hãy kiểm tra file được tạo trước khi chia sẻ với bất kỳ dịch vụ AI bên ngoài nào.

### Có thể xử lý repository GitHub công khai mà không clone không?

Có. Dùng `--remote` với shorthand hoặc URL đầy đủ:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Nên chọn định dạng output nào?

Nếu chưa chắc, hãy bắt đầu với XML mặc định. Dùng Markdown cho hội thoại dễ đọc, JSON cho automation và plain text để tương thích tối đa.

```bash
repomix --style markdown
repomix --style json
```

Xem [Định dạng output](/vi/guide/output).

## Giảm token

### File tạo ra quá lớn. Nên làm gì?

Thu hẹp ngữ cảnh:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Với repository lớn, hãy kết hợp include/ignore pattern với nén code.

### `--compress` làm gì?

`--compress` giữ cấu trúc quan trọng như imports, exports, class, function và interface, đồng thời loại bỏ nhiều chi tiết triển khai. Nó hữu ích khi model cần hiểu kiến trúc.

## Bảo mật và riêng tư

### CLI có upload code của tôi không?

Repomix CLI chạy cục bộ và ghi file output trên máy của bạn. Website và extension trình duyệt có workflow khác; xem [Chính sách quyền riêng tư](/vi/guide/privacy).

### Repomix tránh đưa secret vào output như thế nào?

Repomix dùng safety check dựa trên Secretlint. Hãy coi đây là lớp bảo vệ bổ sung và luôn tự kiểm tra output.

## Khắc phục sự cố

### Vì sao thiếu file trong output?

Repomix tuân theo `.gitignore`, quy tắc ignore mặc định và pattern tùy chỉnh. Kiểm tra `repomix.config.json`, `--ignore` và quy tắc git ignore.

### Làm sao để output reproducible cho team?

Tạo và commit cấu hình dùng chung:

```bash
repomix --init
```

## Tài nguyên liên quan

- [Sử dụng cơ bản](/vi/guide/usage)
- [Tùy chọn command line](/vi/guide/command-line-options)
- [Nén code](/vi/guide/code-compress)
- [Bảo mật](/vi/guide/security)
