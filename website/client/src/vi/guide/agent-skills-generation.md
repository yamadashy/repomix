# Tạo Agent Skills

Repomix có thể tạo đầu ra theo định dạng [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), tạo một thư mục Skills có cấu trúc có thể được sử dụng làm tham chiếu codebase có thể tái sử dụng cho các trợ lý AI.

Tính năng này đặc biệt mạnh mẽ khi bạn muốn tham chiếu các triển khai từ các repository từ xa. Bằng cách tạo Skills từ các dự án mã nguồn mở, bạn có thể dễ dàng yêu cầu Claude tham chiếu các mẫu hoặc triển khai cụ thể trong khi làm việc trên code của riêng bạn.

Thay vì tạo một file đóng gói duy nhất, việc tạo Skills sẽ tạo một thư mục có cấu trúc với nhiều file tham chiếu được tối ưu hóa cho sự hiểu biết của AI và tìm kiếm tương thích grep.

> [!NOTE]
> Đây là một tính năng thử nghiệm. Định dạng đầu ra và các tùy chọn có thể thay đổi trong các bản phát hành tương lai dựa trên phản hồi của người dùng.

## Sử Dụng Cơ Bản

Tạo Skills từ thư mục cục bộ của bạn:

```bash
# Tạo Skills từ thư mục hiện tại
repomix --skill-generate

# Tạo với tên Skills tùy chỉnh
repomix --skill-generate my-project-reference

# Tạo từ thư mục cụ thể
repomix path/to/directory --skill-generate

# Tạo từ repository từ xa
repomix --remote https://github.com/user/repo --skill-generate
```

## Chọn Vị Trí Lưu Skills

Khi bạn chạy lệnh, Repomix sẽ yêu cầu bạn chọn nơi lưu Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Có sẵn trên tất cả các dự án trên máy của bạn
2. **Project Skills** (`.claude/skills/`) - Chia sẻ với nhóm của bạn qua git

Nếu thư mục Skills đã tồn tại, bạn sẽ được yêu cầu xác nhận ghi đè.

> [!TIP]
> Khi tạo Project Skills, hãy cân nhắc thêm chúng vào `.gitignore` để tránh commit các file lớn:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Cấu Trúc Được Tạo

Skills được tạo với cấu trúc sau:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Metadata chính và tài liệu Skills
└── references/
    ├── summary.md              # Mục đích, định dạng và thống kê
    ├── project-structure.md    # Cây thư mục với số dòng
    ├── files.md                # Tất cả nội dung file (tương thích grep)
    └── tech-stack.md           # Ngôn ngữ, framework, dependencies
```

### Mô Tả File

#### SKILL.md

File Skills chính chứa:
- Tên Skills, mô tả và thông tin dự án
- Số lượng file, số dòng và số token
- Tổng quan về cách sử dụng Skills
- Vị trí file và giải thích định dạng
- Các trường hợp sử dụng phổ biến và mẹo

#### references/summary.md

Chứa:
- **Mục đích**: Giải thích đây là codebase tham chiếu cho AI sử dụng
- **Cấu trúc File**: Tài liệu nội dung của mỗi file tham chiếu
- **Hướng dẫn Sử dụng**: Cách sử dụng Skills hiệu quả
- **Thống kê**: Phân tích theo loại file, ngôn ngữ và file lớn nhất

#### references/project-structure.md

Cây thư mục với số dòng mỗi file để dễ dàng khám phá:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Tất cả nội dung file với header syntax highlighting, được tối ưu hóa cho tìm kiếm tương thích grep:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Tech stack được tự động phát hiện từ các file dependency:
- **Ngôn ngữ**: TypeScript, JavaScript, Python, v.v.
- **Framework**: React, Next.js, Express, Django, v.v.
- **Phiên bản Runtime**: Node.js, Python, Go, v.v.
- **Package Manager**: npm, pnpm, poetry, v.v.
- **Dependencies**: Tất cả dependency trực tiếp và dev
- **File Cấu hình**: Tất cả file cấu hình được phát hiện

Được phát hiện từ các file như: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, v.v.

## Tên Skills Tự Động Tạo

Nếu không cung cấp tên, Repomix tự động tạo một tên theo mẫu này:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (chuẩn hóa thành kebab-case)
```

Tên Skills sẽ:
- Được chuyển đổi thành kebab-case (chữ thường, phân cách bằng dấu gạch ngang)
- Giới hạn tối đa 64 ký tự
- Được bảo vệ chống path traversal

## Tích Hợp với Các Tùy Chọn Repomix

Việc tạo Skills tuân thủ tất cả các tùy chọn tiêu chuẩn của Repomix:

```bash
# Tạo Skills với lọc file
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Tạo Skills với nén
repomix --skill-generate --compress

# Tạo Skills từ repository từ xa
repomix --remote yamadashy/repomix --skill-generate

# Tạo Skills với các tùy chọn định dạng đầu ra cụ thể
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Chỉ Tài Liệu

Sử dụng `--include`, bạn có thể tạo Skills chỉ chứa tài liệu từ một repository GitHub. Điều này hữu ích khi bạn muốn Claude tham chiếu tài liệu thư viện hoặc framework cụ thể trong khi làm việc trên code của bạn:

```bash
# Tài liệu Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Tài liệu Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Tài liệu React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Hạn Chế

Tùy chọn `--skill-generate` không thể sử dụng với:
- `--stdout` - Đầu ra Skills yêu cầu ghi vào hệ thống file
- `--copy` - Đầu ra Skills là thư mục, không thể sao chép vào clipboard

## Sử Dụng Skills Đã Tạo

Sau khi tạo, bạn có thể sử dụng Skills với Claude:

1. **Claude Code**: Skills tự động khả dụng nếu được lưu vào `~/.claude/skills/` hoặc `.claude/skills/`
2. **Claude Web**: Tải thư mục Skills lên Claude để phân tích codebase
3. **Chia sẻ Nhóm**: Commit `.claude/skills/` vào repository của bạn để cả nhóm truy cập

## Quy Trình Làm Việc Mẫu

### Tạo Thư Viện Tham Chiếu Cá Nhân

```bash
# Clone và phân tích một dự án mã nguồn mở thú vị
repomix --remote facebook/react --skill-generate react-reference

# Skills được lưu vào ~/.claude/skills/react-reference/
# Bây giờ bạn có thể tham chiếu codebase của React trong bất kỳ cuộc hội thoại Claude nào
```

### Tài Liệu Dự Án Nhóm

```bash
# Trong thư mục dự án của bạn
cd my-project

# Tạo Skills cho nhóm của bạn
repomix --skill-generate

# Chọn "Project Skills" khi được yêu cầu
# Skills được lưu vào .claude/skills/repomix-reference-my-project/

# Commit và chia sẻ với nhóm của bạn
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Tài Nguyên Liên Quan

- [Plugin Claude Code](/vi/guide/claude-code-plugins) - Tìm hiểu về các plugin Repomix cho Claude Code
- [MCP Server](/vi/guide/mcp-server) - Phương pháp tích hợp thay thế
- [Nén Code](/vi/guide/code-compress) - Giảm số token bằng nén
- [Cấu hình](/vi/guide/configuration) - Tùy chỉnh hành vi Repomix
