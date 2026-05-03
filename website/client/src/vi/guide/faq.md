---
title: FAQ và khắc phục sự cố
description: Câu trả lời cho các câu hỏi thường gặp về Repomix, repository riêng tư, hỗ trợ C# và Python, agent tương thích MCP, định dạng output, giảm token, bảo mật và workflow AI.
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

## Câu hỏi thường gặp bổ sung

### Repomix có hoạt động với C#, Python, Java, Go, Rust hoặc ngôn ngữ khác không?

Có. Repomix đọc file trong project và định dạng chúng cho công cụ AI, vì vậy nó có thể pack repository viết bằng bất kỳ ngôn ngữ lập trình nào. CLI cần Node.js 20 trở lên. Một số tính năng nâng cao, như nén code dựa trên Tree-sitter, phụ thuộc vào hỗ trợ parser của từng ngôn ngữ.

### Tôi có thể dùng Repomix với Hermes Agent, OpenClaw hoặc agent tương thích MCP khác không?

Có. Repomix có thể chạy như MCP server:

```bash
npx -y repomix --mcp
```

Với Hermes Agent, thêm Repomix làm stdio MCP server trong `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Với OpenClaw hoặc các agent tương thích MCP khác, dùng cùng command và args ở nơi agent cho phép cấu hình external stdio MCP server. Nếu assistant hỗ trợ Agent Skills, bạn cũng có thể dùng [Repomix Explorer Skill](/vi/guide/repomix-explorer-skill).

### Làm thế nào dùng Repomix để giúp AI assistant hiểu một library hoặc framework mới?

Pack repository của library hoặc tài liệu của nó, rồi đưa output cho AI assistant làm tài liệu tham khảo:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Nếu dùng lặp lại, bạn có thể tạo thư mục Agent Skills tái sử dụng:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Làm sao loại trừ CSS, test, build output hoặc file gây nhiễu khác?

Dùng `--ignore` cho lệnh một lần:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Dùng `--include` khi bạn chỉ muốn giữ một số path source hoặc docs nhất định:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Có giới hạn kích thước repository không?

CLI không có giới hạn kích thước repository cố định, nhưng repository rất lớn có thể bị giới hạn bởi memory, kích thước file, hoặc giới hạn upload và context của công cụ AI. Với project lớn, hãy bắt đầu bằng include pattern có mục tiêu, kiểm tra file nặng token và split output nếu cần:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Vì sao `--include` không bao gồm file từ `node_modules`, thư mục build hoặc path bị ignore?

`--include` thu hẹp các file Repomix cố gắng pack, nhưng ignore rules vẫn được áp dụng. File vẫn có thể bị loại bởi `.gitignore`, `.ignore`, `.repomixignore`, built-in default patterns hoặc `repomix.config.json`. Trong trường hợp nâng cao, `--no-gitignore` hoặc `--no-default-patterns` có thể hữu ích, nhưng hãy dùng cẩn thận vì chúng có thể bao gồm dependencies, build artifacts hoặc file gây nhiễu khác.

## Tài nguyên liên quan

- [Sử dụng cơ bản](/vi/guide/usage)
- [Tùy chọn command line](/vi/guide/command-line-options)
- [Nén code](/vi/guide/code-compress)
- [Bảo mật](/vi/guide/security)
