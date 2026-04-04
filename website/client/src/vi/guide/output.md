# Định dạng đầu ra

Repomix hỗ trợ bốn định dạng đầu ra:
- XML (mặc định)
- Markdown
- JSON
- Văn bản thuần túy

Bạn có thể chỉ định định dạng đầu ra bằng cách sử dụng tùy chọn `--style`:

```bash
# XML (mặc định)
repomix --style xml

# Markdown
repomix --style markdown

# Văn bản thuần túy
repomix --style plain
```

## Định dạng XML

Định dạng XML là định dạng mặc định và được khuyến nghị cho hầu hết các trường hợp sử dụng. Nó cung cấp cấu trúc rõ ràng và dễ dàng cho AI phân tích.

Ví dụ về đầu ra XML:

```xml
<repository name="repomix" path="/path/to/repomix">
  <stats>
    <file_count>42</file_count>
    <total_lines>1234</total_lines>
    <total_tokens>5678</total_tokens>
  </stats>
  <top_files>
    <file path="src/index.ts" lines="100" tokens="450" />
    <file path="src/utils.ts" lines="80" tokens="320" />
    <!-- ... -->
  </top_files>
  <files>
    <file path="src/index.ts" language="typescript">
      import { processRepository } from './core';
      // Nội dung tệp...
    </file>
    <file path="src/utils.ts" language="typescript">
      export function formatOutput(data) {
        // Nội dung tệp...
      }
    </file>
    <!-- ... -->
  </files>
  <git_logs>
    <git_log_commit>
      <date>2025-08-20 00:47:19 +0900</date>
      <message>feat(cli): Add --include-logs option for git commit history</message>
      <files>
        README.md
        src/cli/cliRun.ts
        src/core/git/gitCommand.ts
        src/core/git/gitLogHandle.ts
        src/core/output/outputGenerate.ts
      </files>
    </git_log_commit>
    <git_log_commit>
      <date>2025-08-21 00:09:43 +0900</date>
      <message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
      <files>
        .github/workflows/ratchet-update.yml
      </files>
    </git_log_commit>
  </git_logs>
</repository>
```

Định dạng XML đặc biệt hữu ích cho:
- Cung cấp cấu trúc rõ ràng cho AI
- Bao gồm siêu dữ liệu về mỗi tệp (ngôn ngữ, số dòng, số token)
- Phân tích tự động bởi các công cụ

### Tại sao XML là định dạng mặc định?

Repomix sử dụng XML làm định dạng đầu ra mặc định dựa trên nghiên cứu và thử nghiệm rộng rãi. Quyết định này dựa trên bằng chứng thực nghiệm và các cân nhắc thực tế cho phân tích mã được hỗ trợ bởi AI.

Lựa chọn XML của chúng tôi chủ yếu được ảnh hưởng bởi các khuyến nghị chính thức từ các nhà cung cấp AI lớn:
- **Anthropic (Claude)**: Khuyến nghị rõ ràng việc sử dụng thẻ XML để cấu trúc prompt, tuyên bố rằng "Claude đã được tiếp xúc với những prompt như vậy trong quá trình huấn luyện" ([tài liệu](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Khuyến nghị các định dạng có cấu trúc bao gồm XML cho các tác vụ phức tạp ([tài liệu](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Ủng hộ prompting có cấu trúc trong các tình huống phức tạp ([thông báo](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Định dạng Markdown

Định dạng Markdown cung cấp đầu ra dễ đọc hơn cho con người, đồng thời vẫn duy trì cấu trúc đủ tốt cho AI.

Ví dụ về đầu ra Markdown:

````markdown
# Repository: repomix

## Stats
- File count: 42
- Total lines: 1234
- Total tokens: 5678

## Top Files
1. src/index.ts (100 lines, 450 tokens)
2. src/utils.ts (80 lines, 320 tokens)
...

## Files

### src/index.ts (typescript)
```typescript
import { processRepository } from './core';
// Nội dung tệp...
```

### src/utils.ts (typescript)
```typescript
export function formatOutput(data) {
  // Nội dung tệp...
}
```

# Git Logs
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
...
````

Định dạng Markdown đặc biệt hữu ích cho:
- Đọc và xem xét bởi con người
- Chia sẻ codebase trong các tài liệu hoặc wiki
- Sử dụng với các công cụ hỗ trợ Markdown

## Định dạng JSON

```bash
repomix --style json
```

Định dạng JSON cung cấp đầu ra có cấu trúc, có thể truy cập theo chương trình với tên thuộc tính camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "File này là đại diện được hợp nhất của toàn bộ codebase, được kết hợp thành một tài liệu duy nhất bởi Repomix.",
    "purpose": "File này chứa đại diện được đóng gói của toàn bộ nội dung repository...",
    "fileFormat": "Nội dung được tổ chức như sau...",
    "usageGuidelines": "- File này nên được xử lý như chỉ đọc...",
    "notes": "- Một số file có thể đã được loại trừ dựa trên quy tắc .gitignore..."
  },
  "userProvidedHeader": "Văn bản header tùy chỉnh nếu được chỉ định",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Nội dung file ở đây",
    "src/utils.js": "// Nội dung file ở đây"
  },
  "instruction": "Hướng dẫn tùy chỉnh từ instructionFilePath"
}
```

### Ưu điểm của định dạng JSON

Định dạng JSON lý tưởng cho:
- **Xử lý theo chương trình**: Dễ dàng phân tích và thao tác với thư viện JSON trong bất kỳ ngôn ngữ lập trình nào
- **Tích hợp API**: Tiêu thụ trực tiếp bởi dịch vụ web và ứng dụng
- **Tương thích với công cụ AI**: Định dạng có cấu trúc được tối ưu hóa cho machine learning và hệ thống AI
- **Phân tích dữ liệu**: Trích xuất thông tin cụ thể một cách đơn giản bằng các công cụ như `jq`

### Làm việc với đầu ra JSON sử dụng `jq`

Định dạng JSON giúp dễ dàng trích xuất thông tin cụ thể theo chương trình. Dưới đây là các ví dụ phổ biến:

#### Thao tác file cơ bản
```bash
# Liệt kê tất cả đường dẫn file
cat repomix-output.json | jq -r '.files | keys[]'

# Đếm tổng số file
cat repomix-output.json | jq '.files | keys | length'

# Trích xuất nội dung file cụ thể
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Lọc và phân tích file
```bash
# Tìm file theo phần mở rộng
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Lấy file chứa văn bản cụ thể
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Tạo danh sách file với số ký tự
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) ký tự"'
```

#### Trích xuất metadata
```bash
# Trích xuất cấu trúc thư mục
cat repomix-output.json | jq -r '.directoryStructure'

# Lấy thông tin tóm tắt file
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Trích xuất header do người dùng cung cấp (nếu tồn tại)
cat repomix-output.json | jq -r '.userProvidedHeader // "Không có header được cung cấp"'

# Lấy hướng dẫn tùy chỉnh
cat repomix-output.json | jq -r '.instruction // "Không có hướng dẫn được cung cấp"'
```

#### Phân tích nâng cao
```bash
# Tìm file lớn nhất theo độ dài nội dung
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Tìm kiếm file chứa các mẫu cụ thể
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Trích xuất đường dẫn file khớp với nhiều phần mở rộng
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Định dạng văn bản thuần túy

Định dạng văn bản thuần túy cung cấp đầu ra đơn giản nhất, không có định dạng đặc biệt.

Ví dụ về đầu ra văn bản thuần túy:

```
Repository: repomix

Stats:
File count: 42
Total lines: 1234
Total tokens: 5678

Top Files:
1. src/index.ts (100 lines, 450 tokens)
2. src/utils.ts (80 lines, 320 tokens)
...

Files:

File: src/index.ts (typescript)
import { processRepository } from './core';
// Nội dung tệp...

File: src/utils.ts (typescript)
export function formatOutput(data) {
  // Nội dung tệp...
}

================
Git Logs
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
...
```

Định dạng văn bản thuần túy đặc biệt hữu ích cho:
- Tương thích tối đa với các công cụ khác nhau
- Trường hợp khi định dạng không quan trọng
- Sử dụng với các công cụ AI cũ hơn có thể gặp khó khăn với XML hoặc Markdown

## Tùy chọn định dạng bổ sung

Ngoài việc chọn định dạng đầu ra, Repomix cũng cung cấp các tùy chọn bổ sung để tùy chỉnh đầu ra:

### Xóa bình luận

Để xóa bình luận khỏi mã nguồn trong đầu ra:

```bash
repomix --remove-comments
```

Điều này có thể hữu ích để giảm kích thước đầu ra và tập trung vào mã thực tế.

### Hiển thị số dòng

Để bao gồm số dòng trong đầu ra:

```bash
repomix --show-line-numbers
```

Điều này giúp dễ dàng tham khảo các dòng cụ thể khi thảo luận về mã với AI.

### Số lượng tệp hàng đầu

Để chỉ định số lượng tệp hàng đầu để hiển thị trong tóm tắt:

```bash
repomix --top-files-length 20
```

Mặc định là 10 tệp.

## Tên tệp đầu ra tùy chỉnh

Để chỉ định tên tệp đầu ra:

```bash
repomix --output-file my-codebase.xml
```

Mặc định, Repomix sẽ tạo:
- `repomix-output.xml` cho định dạng XML
- `repomix-output.md` cho định dạng Markdown
- `repomix-output.txt` cho định dạng văn bản thuần túy

## Tài nguyên liên quan

- [Cấu hình](/vi/guide/configuration) - Tham chiếu đầy đủ về tùy chọn cấu hình
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Sử dụng `--style` để đặt định dạng đầu ra
- [Nén mã](/vi/guide/code-compress) - Giảm số lượng token mà vẫn bảo toàn cấu trúc
- [Ví dụ prompt](/vi/guide/prompt-examples) - Mẹo sử dụng đầu ra với các mô hình AI khác nhau
