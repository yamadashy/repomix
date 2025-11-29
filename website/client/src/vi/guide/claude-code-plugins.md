# Plugin Claude Code

Repomix cung cấp các plugin chính thức cho [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) tích hợp liền mạch với môi trường phát triển được hỗ trợ bởi AI. Các plugin này giúp bạn dễ dàng phân tích và đóng gói codebase trực tiếp trong Claude Code bằng lệnh ngôn ngữ tự nhiên.

## Cài Đặt

### 1. Thêm Repomix Plugin Marketplace

Đầu tiên, thêm Repomix plugin marketplace vào Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Cài Đặt Plugin

Cài đặt các plugin bằng các lệnh sau:

```text
# Cài đặt plugin MCP server (nền tảng được khuyến nghị)
/plugin install repomix-mcp@repomix

# Cài đặt plugin lệnh (mở rộng chức năng)
/plugin install repomix-commands@repomix

# Cài đặt plugin khám phá repository (phân tích hỗ trợ AI)
/plugin install repomix-explorer@repomix
```

::: tip Mối Quan Hệ Plugin
Plugin `repomix-mcp` được khuyến nghị làm nền tảng. Plugin `repomix-commands` cung cấp các lệnh slash tiện lợi, trong khi `repomix-explorer` thêm khả năng phân tích hỗ trợ AI. Mặc dù bạn có thể cài đặt chúng độc lập, việc sử dụng cả ba sẽ mang lại trải nghiệm toàn diện nhất.
:::

### Thay Thế: Cài Đặt Tương Tác

Bạn cũng có thể sử dụng trình cài đặt plugin tương tác:

```text
/plugin
```

Điều này sẽ mở một giao diện tương tác nơi bạn có thể duyệt và cài đặt các plugin có sẵn.

## Các Plugin Có Sẵn

### 1. repomix-mcp (Plugin MCP Server)

Plugin cơ sở cung cấp phân tích codebase được hỗ trợ bởi AI thông qua tích hợp MCP server.

**Tính năng:**
- Đóng gói repository cục bộ và từ xa
- Tìm kiếm đầu ra đã đóng gói
- Đọc file với quét bảo mật tích hợp ([Secretlint](https://github.com/secretlint/secretlint))
- Nén Tree-sitter tự động (giảm khoảng 70% token)

### 2. repomix-commands (Plugin Lệnh Slash)

Cung cấp các lệnh slash tiện lợi với hỗ trợ ngôn ngữ tự nhiên.

**Lệnh Có Sẵn:**
- `/repomix-commands:pack-local` - Đóng gói codebase cục bộ với nhiều tùy chọn
- `/repomix-commands:pack-remote` - Đóng gói và phân tích repository GitHub từ xa

### 3. repomix-explorer (Plugin Agent Phân Tích AI)

Agent phân tích repository được hỗ trợ bởi AI khám phá codebase một cách thông minh sử dụng Repomix CLI.

**Tính năng:**
- Khám phá và phân tích codebase bằng ngôn ngữ tự nhiên
- Phát hiện mẫu thông minh và hiểu cấu trúc code
- Phân tích tăng dần sử dụng grep và đọc file có mục tiêu
- Quản lý ngữ cảnh tự động cho repository lớn

**Lệnh Có Sẵn:**
- `/repomix-explorer:explore-local` - Phân tích codebase cục bộ với hỗ trợ AI
- `/repomix-explorer:explore-remote` - Phân tích repository GitHub từ xa với hỗ trợ AI

**Cách hoạt động:**
1. Chạy `npx repomix@latest` để đóng gói repository
2. Sử dụng công cụ Grep và Read để tìm kiếm đầu ra hiệu quả
3. Cung cấp phân tích toàn diện mà không tiêu thụ quá nhiều ngữ cảnh

## Ví Dụ Sử Dụng

### Đóng Gói Codebase Cục Bộ

Sử dụng lệnh `/repomix-commands:pack-local` với hướng dẫn ngôn ngữ tự nhiên:

```text
/repomix-commands:pack-local
Đóng gói dự án này dưới dạng Markdown với nén
```

Các ví dụ khác:
- "Chỉ đóng gói thư mục src"
- "Đóng gói file TypeScript với số dòng"
- "Tạo đầu ra ở định dạng JSON"

### Đóng Gói Repository Từ Xa

Sử dụng lệnh `/repomix-commands:pack-remote` để phân tích repository GitHub:

```text
/repomix-commands:pack-remote yamadashy/repomix
Chỉ đóng gói file TypeScript từ repository yamadashy/repomix
```

Các ví dụ khác:
- "Đóng gói nhánh main với nén"
- "Chỉ bao gồm file tài liệu"
- "Đóng gói thư mục cụ thể"

### Khám Phá Codebase Cục Bộ với AI

Sử dụng lệnh `/repomix-explorer:explore-local` để phân tích hỗ trợ AI:

```text
/repomix-explorer:explore-local ./src
Tìm tất cả code liên quan đến xác thực
```

Các ví dụ khác:
- "Phân tích cấu trúc của dự án này"
- "Cho tôi xem các component chính"
- "Tìm tất cả các endpoint API"

### Khám Phá Repository Từ Xa với AI

Sử dụng lệnh `/repomix-explorer:explore-remote` để phân tích repository GitHub:

```text
/repomix-explorer:explore-remote facebook/react
Cho tôi xem kiến trúc component chính
```

Các ví dụ khác:
- "Tìm tất cả React hooks trong repository"
- "Giải thích cấu trúc dự án"
- "Các error boundaries được định nghĩa ở đâu?"

## Tài Nguyên Liên Quan

- [Tài Liệu MCP Server](/guide/mcp-server) - Tìm hiểu về MCP server cơ bản
- [Cấu Hình](/guide/configuration) - Tùy chỉnh hành vi Repomix
- [Bảo Mật](/guide/security) - Hiểu các tính năng bảo mật
- [Tùy Chọn Dòng Lệnh](/guide/command-line-options) - Các tùy chọn CLI có sẵn

## Mã Nguồn Plugin

Mã nguồn plugin có sẵn trong repository Repomix:

- [Plugin Marketplace](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Commands Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Repository Explorer Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Phản Hồi và Hỗ Trợ

Nếu bạn gặp vấn đề hoặc có đề xuất cho các plugin Claude Code:

- [Mở issue trên GitHub](https://github.com/yamadashy/repomix/issues)
- [Tham gia cộng đồng Discord](https://discord.gg/wNYzTwZFku)
- [Xem các thảo luận hiện có](https://github.com/yamadashy/repomix/discussions)
