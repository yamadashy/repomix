---
title: Máy chủ MCP
description: Chạy Repomix như server Model Context Protocol để AI assistant có thể trực tiếp đóng gói, tìm kiếm và đọc codebase local hoặc remote.
---

# Máy chủ MCP

Repomix hỗ trợ [Model Context Protocol (MCP)](https://modelcontextprotocol.io), cho phép các trợ lý AI tương tác trực tiếp với codebase của bạn. Khi chạy như một máy chủ MCP, Repomix cung cấp các công cụ cho phép các trợ lý AI đóng gói repository cục bộ hoặc từ xa để phân tích mà không cần chuẩn bị file thủ công.

> [!NOTE]  
> Đây là một tính năng thử nghiệm mà chúng tôi sẽ tích cực cải thiện dựa trên phản hồi của người dùng và việc sử dụng thực tế

## Chạy Repomix như một Máy chủ MCP

Để chạy Repomix như một máy chủ MCP, sử dụng flag `--mcp`:

```bash
repomix --mcp
```

Điều này khởi động Repomix ở chế độ máy chủ MCP, làm cho nó có sẵn cho các trợ lý AI hỗ trợ Model Context Protocol.

## Cấu hình Máy chủ MCP

Để sử dụng Repomix như một máy chủ MCP với các trợ lý AI như Claude, bạn cần cấu hình các thiết lập MCP:

### Cho VS Code

Bạn có thể cài đặt máy chủ MCP Repomix trong VS Code bằng một trong các phương pháp sau:

1. **Sử dụng huy hiệu cài đặt:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Sử dụng dòng lệnh:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Cho VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Cho Cline (phần mở rộng VS Code)

Chỉnh sửa file `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Cho Cursor

Trong Cursor, thêm một máy chủ MCP mới từ `Cursor Settings` > `MCP` > `+ Add new global MCP server` với cấu hình tương tự như Cline.

### Cho Claude Desktop

Chỉnh sửa file `claude_desktop_config.json` với cấu hình tương tự như Cline.

### Cho Claude Code

Để cấu hình Repomix như máy chủ MCP trong [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), sử dụng lệnh sau:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Hoặc, bạn có thể sử dụng **plugin Repomix chính thức** để có trải nghiệm thuận tiện hơn. Các plugin cung cấp lệnh ngôn ngữ tự nhiên và thiết lập dễ dàng hơn. Xem tài liệu [Plugin Claude Code](/vi/guide/claude-code-plugins) để biết chi tiết.

### Sử dụng Docker thay vì npx

Thay vì sử dụng npx, bạn có thể sử dụng Docker để chạy Repomix như một máy chủ MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Các công cụ MCP có sẵn

Khi chạy như một máy chủ MCP, Repomix cung cấp các công cụ sau:

### pack_codebase

Công cụ này đóng gói một thư mục code cục bộ thành một file XML để phân tích AI. Nó phân tích cấu trúc codebase, trích xuất nội dung code liên quan và tạo ra một báo cáo toàn diện bao gồm metrics, cây file và nội dung code được định dạng.

**Tham số:**

| Tham số | Bắt buộc | Mặc định | Mô tả |
|---------|----------|----------|-------|
| `directory` | Có | — | Đường dẫn tuyệt đối đến thư mục cần đóng gói |
| `compress` | Không | `false` | Kích hoạt nén Tree-sitter để trích xuất các chữ ký code cần thiết và cấu trúc trong khi loại bỏ chi tiết triển khai. Giảm sử dụng token khoảng 70% trong khi bảo toàn ý nghĩa ngữ nghĩa. Thường không cần thiết vì `grep_repomix_output` cho phép truy xuất nội dung tăng dần. |
| `includePatterns` | Không | — | File để bao gồm sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Không | — | File bổ sung để loại trừ sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"test/**,*.spec.js"`). Bổ sung cho `.gitignore` và loại trừ tích hợp. |
| `outputPatterns` | Không | — | Các cấp độ bao gồm theo từng file, phản ánh tùy chọn [`output.patterns`](./configuration.md) trong file cấu hình. Một mảng các mục `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }`. Pattern khớp đầu tiên sẽ được áp dụng; `directoryStructureOnly` được ưu tiên hơn `compress`, và một kết quả khớp không có cờ nào trong hai cờ này sẽ buộc hiển thị nội dung đầy đủ (hữu ích để loại trừ file khỏi `compress` toàn cục). Ghi đè mọi `output.patterns` từ `repomix.config.json` của repository đích. |
| `topFilesLength` | Không | `10` | Số lượng file lớn nhất theo kích thước để hiển thị trong tóm tắt metrics |
| `style` | Không | `xml` | Kiểu định dạng đầu ra: `xml`, `markdown`, `json`, hoặc `plain` |

**Ví dụ:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

Với ví dụ trên (`compress: true` đóng vai trò là phương án bao quát cho các file không khớp), các file trong `src/core/` được giữ nguyên nội dung đầy đủ, các file trong `docs/` chỉ được liệt kê trong cấu trúc thư mục, và mọi thứ còn lại đều được nén.

### pack_remote_repository

Công cụ này lấy, clone và đóng gói một repository GitHub thành một file XML để phân tích AI. Nó tự động clone repository từ xa, phân tích cấu trúc của nó và tạo ra một báo cáo toàn diện.

**Tham số:**

| Tham số | Bắt buộc | Mặc định | Mô tả |
|---------|----------|----------|-------|
| `remote` | Có | — | URL repository GitHub hoặc định dạng `user/repo` (ví dụ: `"yamadashy/repomix"`, `"https://github.com/user/repo"`, hoặc `"https://github.com/user/repo/tree/branch"`) |
| `compress` | Không | `false` | Kích hoạt nén Tree-sitter để trích xuất các chữ ký code cần thiết và cấu trúc trong khi loại bỏ chi tiết triển khai. Giảm sử dụng token khoảng 70% trong khi bảo toàn ý nghĩa ngữ nghĩa. Thường không cần thiết vì `grep_repomix_output` cho phép truy xuất nội dung tăng dần. |
| `includePatterns` | Không | — | File để bao gồm sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Không | — | File bổ sung để loại trừ sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"test/**,*.spec.js"`). Bổ sung cho `.gitignore` và loại trừ tích hợp. |
| `outputPatterns` | Không | — | Các cấp độ bao gồm theo từng file, phản ánh tùy chọn [`output.patterns`](./configuration.md) trong file cấu hình. Một mảng các mục `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }`. Pattern khớp đầu tiên sẽ được áp dụng; `directoryStructureOnly` được ưu tiên hơn `compress`, và một kết quả khớp không có cờ nào trong hai cờ này sẽ buộc hiển thị nội dung đầy đủ (hữu ích để loại trừ file khỏi `compress` toàn cục). |
| `topFilesLength` | Không | `10` | Số lượng file lớn nhất theo kích thước để hiển thị trong tóm tắt metrics |
| `style` | Không | `xml` | Kiểu định dạng đầu ra: `xml`, `markdown`, `json`, hoặc `plain` |

**Ví dụ:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

### read_repomix_output

Công cụ này đọc nội dung của một file đầu ra được tạo bởi Repomix. Hỗ trợ đọc một phần với chỉ định phạm vi dòng cho các file lớn. Công cụ này được thiết kế cho các môi trường mà việc truy cập hệ thống file trực tiếp bị hạn chế.

**Tham số:**

| Tham số | Bắt buộc | Mặc định | Mô tả |
|---------|----------|----------|-------|
| `outputId` | Có | — | ID của file đầu ra Repomix cần đọc |
| `startLine` | Không | Đầu file | Số dòng bắt đầu (bắt đầu từ 1, bao gồm) |
| `endLine` | Không | Cuối file | Số dòng kết thúc (bắt đầu từ 1, bao gồm) |

**Tính năng:**
- Được thiết kế đặc biệt cho các môi trường dựa trên web hoặc ứng dụng sandbox
- Truy xuất nội dung của các đầu ra được tạo trước đó bằng ID của chúng
- Cung cấp truy cập đến codebase được đóng gói mà không cần truy cập hệ thống file
- Hỗ trợ đọc một phần cho các file lớn

**Ví dụ:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Công cụ này tìm kiếm các pattern trong một file đầu ra Repomix sử dụng chức năng giống grep với cú pháp JavaScript RegExp. Trả về các dòng khớp với các dòng ngữ cảnh tùy chọn xung quanh các kết quả khớp.

**Tham số:**

| Tham số | Bắt buộc | Mặc định | Mô tả |
|---------|----------|----------|-------|
| `outputId` | Có | — | ID của file đầu ra Repomix cần tìm kiếm |
| `pattern` | Có | — | Pattern tìm kiếm (cú pháp JavaScript RegExp) |
| `contextLines` | Không | `0` | Số dòng ngữ cảnh trước và sau mỗi kết quả khớp. Bị ghi đè bởi `beforeLines`/`afterLines` nếu được chỉ định. |
| `beforeLines` | Không | — | Dòng hiển thị trước mỗi kết quả khớp (như `grep -B`). Ưu tiên hơn `contextLines`. |
| `afterLines` | Không | — | Dòng hiển thị sau mỗi kết quả khớp (như `grep -A`). Ưu tiên hơn `contextLines`. |
| `ignoreCase` | Không | `false` | Thực hiện khớp không phân biệt chữ hoa chữ thường |

**Tính năng:**
- Sử dụng cú pháp JavaScript RegExp cho khớp pattern mạnh mẽ
- Hỗ trợ các dòng ngữ cảnh để hiểu rõ hơn về các kết quả khớp
- Cho phép điều khiển riêng biệt các dòng ngữ cảnh trước/sau
- Tùy chọn tìm kiếm phân biệt và không phân biệt chữ hoa chữ thường

**Ví dụ:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

## Mô hình bảo mật

Việc hiểu rõ những gì máy chủ MCP bảo vệ và không bảo vệ là điều quan trọng, vì AI agent — chứ không phải bạn — mới là bên quyết định gọi công cụ nào và với đối số gì.

- **Các công cụ đọc được bất cứ thứ gì mà tiến trình có thể đọc.** `pack_codebase` đóng gói bất kỳ đường dẫn thư mục tuyệt đối nào được cung cấp, và đầu ra đã đóng gói được trả về cho agent. Không có giới hạn trong phạm vi thư mục gốc của dự án; ranh giới duy nhất là quyền truy cập file của hệ điều hành bạn đang dùng.
- **Quét bí mật là một phương pháp heuristic, không phải là một cơ chế kiểm soát truy cập.** [Secretlint](https://github.com/secretlint/secretlint) loại trừ các file khớp với các định dạng thông tin xác thực đã biết (ví dụ: khóa AWS và khóa riêng tư). Nó không nhận diện được mọi loại bí mật, vì vậy các file như `~/.netrc` hoặc một kubeconfig vẫn có thể lọt qua. Hãy xem một lần quét "sạch" là "không tìm thấy gì rõ ràng", chứ không phải là "an toàn để chia sẻ".
- **Một agent có thể bị điều khiển bởi chính nội dung mà nó đọc.** Nếu nó phân tích một repository không đáng tin cậy, văn bản trong repository đó có thể cố gắng hướng dẫn nó đóng gói một thư mục nhạy cảm hoặc clone một URL không liên quan. Repomix từ chối clone các endpoint metadata của cloud instance, nhưng nó không thể phân biệt một yêu cầu hợp lệ với một yêu cầu bị chèn (injected).

Chỉ kết nối máy chủ MCP với các agent và repository mà bạn sẵn sàng cấp mức độ truy cập này.

## Lợi ích của việc sử dụng Repomix như một Máy chủ MCP

Sử dụng Repomix như một máy chủ MCP mang lại nhiều lợi thế:

1. **Tích hợp trực tiếp**: Các trợ lý AI có thể phân tích codebase của bạn trực tiếp mà không cần chuẩn bị file thủ công.
2. **Luồng công việc hiệu quả**: Tối ưu hóa quy trình phân tích code bằng cách loại bỏ nhu cầu tạo và tải lên file thủ công.
3. **Đầu ra nhất quán**: Đảm bảo rằng trợ lý AI nhận được codebase ở định dạng nhất quán, được tối ưu hóa.
4. **Các tính năng nâng cao**: Tận dụng tất cả các tính năng của Repomix như nén code, đếm token và quét bí mật.

Một khi được cấu hình, trợ lý AI của bạn có thể sử dụng trực tiếp các khả năng của Repomix để phân tích codebase, làm cho luồng công việc phân tích code hiệu quả hơn.

## Tài nguyên liên quan

- [Plugin Claude Code](/vi/guide/claude-code-plugins) - Tích hợp plugin tiện lợi cho Claude Code
- [Cấu hình](/vi/guide/configuration) - Tùy chỉnh hành vi Repomix
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tham chiếu CLI đầy đủ
- [Định dạng đầu ra](/vi/guide/output) - Tìm hiểu về các định dạng đầu ra có sẵn
