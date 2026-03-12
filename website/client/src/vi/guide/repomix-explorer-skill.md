# Repomix Explorer Skill (Agent Skills)

Repomix cung cấp một skill **Repomix Explorer** sẵn sàng sử dụng cho phép các trợ lý lập trình AI phân tích và khám phá codebase bằng Repomix CLI.

Skill này được thiết kế để hoạt động với nhiều công cụ AI khác nhau bao gồm Claude Code, Cursor, Codex, GitHub Copilot và nhiều hơn nữa.

## Cài Đặt Nhanh

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Lệnh này cài đặt skill vào thư mục skills của trợ lý AI của bạn (ví dụ: `.claude/skills/`), làm cho nó có sẵn ngay lập tức.

## Chức Năng

Sau khi cài đặt, bạn có thể phân tích codebase bằng các hướng dẫn ngôn ngữ tự nhiên.

#### Phân tích repository từ xa

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Khám phá codebase cục bộ

```text
"What's in this project?
~/projects/my-app"
```

Điều này không chỉ hữu ích để hiểu codebase mà còn khi bạn muốn triển khai các tính năng bằng cách tham khảo các repository khác của bạn.

## Cách Hoạt Động

Skill Repomix Explorer hướng dẫn các trợ lý AI qua quy trình làm việc hoàn chỉnh:

1. **Chạy các lệnh repomix** - Đóng gói repository thành định dạng thân thiện với AI
2. **Phân tích các file đầu ra** - Sử dụng tìm kiếm mẫu (grep) để tìm code liên quan
3. **Cung cấp thông tin chi tiết** - Báo cáo cấu trúc, số liệu và các đề xuất có thể thực hiện

## Ví Dụ Trường Hợp Sử Dụng

### Hiểu một Codebase Mới

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI sẽ chạy repomix, phân tích đầu ra và cung cấp tổng quan có cấu trúc về codebase.

### Tìm Các Mẫu Cụ Thể

```text
"Find all authentication-related code in this repository."
```

AI sẽ tìm kiếm các mẫu xác thực, phân loại các phát hiện theo file và giải thích cách xác thực được triển khai.

### Tham Khảo Các Dự Án Của Bạn

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI sẽ phân tích repository khác của bạn và giúp bạn tham khảo các triển khai của chính mình.

## Nội Dung Skill

Skill bao gồm:

- **Nhận dạng ý định người dùng** - Hiểu các cách khác nhau mà người dùng yêu cầu phân tích codebase
- **Hướng dẫn lệnh Repomix** - Biết sử dụng các tùy chọn nào (`--compress`, `--include`, v.v.)
- **Quy trình phân tích** - Cách tiếp cận có cấu trúc để khám phá đầu ra đã đóng gói
- **Thực hành tốt nhất** - Mẹo hiệu quả như sử dụng grep trước khi đọc toàn bộ file

## Tài Nguyên Liên Quan

- [Tạo Agent Skills](/vi/guide/agent-skills-generation) - Tạo skills của riêng bạn từ codebase
- [Plugin Claude Code](/vi/guide/claude-code-plugins) - Plugin Repomix cho Claude Code
- [MCP Server](/vi/guide/mcp-server) - Phương pháp tích hợp thay thế
