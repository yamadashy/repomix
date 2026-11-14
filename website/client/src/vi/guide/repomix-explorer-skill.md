---
title: Repomix Explorer Skill (Agent Skills)
description: Cài đặt Repomix Explorer agent skill để phân tích codebase local và remote bằng Claude Code cùng các AI assistant khác hỗ trợ định dạng Agent Skills.
---

# Repomix Explorer Skill (Agent Skills)

Repomix cung cấp một skill **Repomix Explorer** sẵn sàng sử dụng cho phép các trợ lý lập trình AI phân tích và khám phá codebase bằng Repomix CLI.

Skill này được thiết kế cho Claude Code và các AI assistant khác hỗ trợ định dạng Agent Skills.

## Cài Đặt Nhanh

Với Claude Code, hãy cài plugin Repomix Explorer chính thức:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Plugin Claude Code cung cấp các lệnh có namespace như `/repomix-explorer:explore-local` và `/repomix-explorer:explore-remote`. Xem [Plugin Claude Code](/vi/guide/claude-code-plugins) để biết setup đầy đủ.

Với Codex, Cursor, OpenClaw và các assistant tương thích Agent Skills khác, hãy cài skill độc lập bằng Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Để nhắm tới một assistant cụ thể, truyền `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Với Hermes Agent, hãy cài skill một file bằng lệnh skills native của Hermes Agent:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/skills/repomix-explorer/SKILL.md
```

Nếu bạn chủ yếu dùng Hermes Agent để phân tích repository, cấu hình [MCP Server](/vi/guide/mcp-server) cũng là lựa chọn tốt vì nó chạy Repomix trực tiếp như một MCP server.

## Chức Năng

Sau khi cài đặt, bạn có thể phân tích codebase bằng các hướng dẫn ngôn ngữ tự nhiên.

#### Phân tích repository từ xa

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

Skill này hỗ trợ GitHub, GitLab (bao gồm các bản triển khai trên máy chủ riêng và các nhóm lồng nhau), Bitbucket, Azure DevOps và các nền tảng lưu trữ Git khác. Sử dụng URL clone qua HTTPS hoặc địa chỉ SSH theo kiểu SCP, chẳng hạn như `git@gitlab.example.com:group/subgroup/project.git`, đồng thời giữ nguyên namespace đầy đủ và đường dẫn clone riêng của nhà cung cấp. Cú pháp rút gọn `owner/repo` chỉ dành cho GitHub.

Với các URL web trỏ đến branch, tag, commit, file hoặc thư mục, skill sử dụng URL clone kết hợp với `--remote-branch <ref>` và khi cần, `--include <path or glob>`. Đường dẫn trong URL web không giới hạn những file được đóng gói.

Các repository từ xa ngoài GitHub yêu cầu phải cài đặt Git. Với repository riêng tư, hãy cấu hình thông tin xác thực Git hoặc khóa SSH trong môi trường. Nếu Repomix từ chối một định dạng địa chỉ, hãy dùng URL clone được hỗ trợ hoặc bản checkout cục bộ.

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
