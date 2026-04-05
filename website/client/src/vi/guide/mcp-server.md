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
| `topFilesLength` | Không | `10` | Số lượng file lớn nhất theo kích thước để hiển thị trong tóm tắt metrics |
| `style` | Không | `xml` | Kiểu định dạng đầu ra: `xml`, `markdown`, `json`, hoặc `plain` |

**Ví dụ:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Công cụ này lấy, clone và đóng gói một repository GitHub thành một file XML để phân tích AI. Nó tự động clone repository từ xa, phân tích cấu trúc của nó và tạo ra một báo cáo toàn diện.

**Tham số:**

| Tham số | Bắt buộc | Mặc định | Mô tả |
|---------|----------|----------|-------|
| `remote` | Có | — | URL repository GitHub hoặc định dạng `user/repo` (ví dụ: `"yamadashy/repomix"`, `"https://github.com/user/repo"`, hoặc `"https://github.com/user/repo/tree/branch"`) |
| `compress` | Không | `false` | Kích hoạt nén Tree-sitter để trích xuất các chữ ký code cần thiết và cấu trúc trong khi loại bỏ chi tiết triển khai. Giảm sử dụng token khoảng 70% trong khi bảo toàn ý nghĩa ngữ nghĩa. Thường không cần thiết vì `grep_repomix_output` cho phép truy xuất nội dung tăng dần. |
| `includePatterns` | Không | — | File để bao gồm sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Không | — | File bổ sung để loại trừ sử dụng pattern fast-glob. Tách bằng dấu phẩy (ví dụ: `"test/**,*.spec.js"`). Bổ sung cho `.gitignore` và loại trừ tích hợp. |
| `topFilesLength` | Không | `10` | Số lượng file lớn nhất theo kích thước để hiển thị trong tóm tắt metrics |
| `style` | Không | `xml` | Kiểu định dạng đầu ra: `xml`, `markdown`, `json`, hoặc `plain` |

**Ví dụ:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
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
- Cung cấp truy cập an toàn đến codebase được đóng gói mà không cần truy cập hệ thống file
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

### file_system_read_file và file_system_read_directory

Máy chủ MCP của Repomix cung cấp hai công cụ hệ thống file cho phép các trợ lý AI tương tác an toàn với hệ thống file cục bộ:

1. `file_system_read_file`
  - Đọc nội dung file từ hệ thống file cục bộ sử dụng đường dẫn tuyệt đối
  - Bao gồm xác thực bảo mật tích hợp để phát hiện và ngăn chặn truy cập đến các file chứa thông tin nhạy cảm
  - Triển khai xác thực bảo mật sử dụng [Secretlint](https://github.com/secretlint/secretlint)
  - Ngăn chặn truy cập đến các file chứa thông tin nhạy cảm (khóa API, mật khẩu, bí mật)
  - Xác thực đường dẫn tuyệt đối để ngăn chặn các cuộc tấn công directory traversal
  - Trả về thông báo lỗi rõ ràng cho các đường dẫn không hợp lệ và vấn đề bảo mật

2. `file_system_read_directory`
  - Liệt kê nội dung của một thư mục sử dụng đường dẫn tuyệt đối
  - Trả về một danh sách được định dạng hiển thị các file và thư mục con với các chỉ báo rõ ràng
  - Hiển thị file và thư mục với các chỉ báo rõ ràng (`[FILE]` hoặc `[DIR]`)
  - Cung cấp điều hướng thư mục an toàn với xử lý lỗi thích hợp
  - Xác thực đường dẫn và đảm bảo chúng là tuyệt đối
  - Hữu ích cho việc khám phá cấu trúc dự án và hiểu tổ chức codebase

Cả hai công cụ đều kết hợp các biện pháp bảo mật mạnh mẽ:
- Xác thực đường dẫn tuyệt đối để ngăn chặn các cuộc tấn công directory traversal
- Kiểm tra quyền để đảm bảo quyền truy cập thích hợp
- Tích hợp với Secretlint để phát hiện thông tin nhạy cảm
- Thông báo lỗi rõ ràng để debug tốt hơn và nhận thức bảo mật

**Ví dụ:**
```typescript
// Đọc một file
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Liệt kê nội dung thư mục
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Các công cụ này đặc biệt hữu ích khi các trợ lý AI cần:
- Phân tích các file cụ thể trong codebase
- Điều hướng cấu trúc thư mục
- Xác minh sự tồn tại và khả năng truy cập của file
- Đảm bảo các hoạt động hệ thống file an toàn

## Lợi ích của việc sử dụng Repomix như một Máy chủ MCP

Sử dụng Repomix như một máy chủ MCP mang lại nhiều lợi thế:

1. **Tích hợp trực tiếp**: Các trợ lý AI có thể phân tích codebase của bạn trực tiếp mà không cần chuẩn bị file thủ công.
2. **Luồng công việc hiệu quả**: Tối ưu hóa quy trình phân tích code bằng cách loại bỏ nhu cầu tạo và tải lên file thủ công.
3. **Đầu ra nhất quán**: Đảm bảo rằng trợ lý AI nhận được codebase ở định dạng nhất quán, được tối ưu hóa.
4. **Các tính năng nâng cao**: Tận dụng tất cả các tính năng của Repomix như nén code, đếm token và kiểm tra bảo mật.

Một khi được cấu hình, trợ lý AI của bạn có thể sử dụng trực tiếp các khả năng của Repomix để phân tích codebase, làm cho luồng công việc phân tích code hiệu quả hơn.

## Tài nguyên liên quan

- [Plugin Claude Code](/vi/guide/claude-code-plugins) - Tích hợp plugin tiện lợi cho Claude Code
- [Cấu hình](/vi/guide/configuration) - Tùy chỉnh hành vi Repomix
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tham chiếu CLI đầy đủ
- [Định dạng đầu ra](/vi/guide/output) - Tìm hiểu về các định dạng đầu ra có sẵn
