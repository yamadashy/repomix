# 출력 형식

Repomix는 세 가지 출력 형식을 지원합니다:
- 일반 텍스트 (기본값)
- XML
- Markdown

## 일반 텍스트 형식

```bash
repomix --style plain
```

출력 구조:
```text
이 파일은 전체 코드베이스를 하나의 문서로 통합한 것입니다...

================
파일 요약
================
(메타데이터 및 AI 지시사항)

================
디렉토리 구조
================
src/
  index.ts
  utils/
    helper.ts

================
파일
================

================
File: src/index.ts
================
// 파일 내용
```

## XML 형식

```bash
repomix --style xml
```

XML 형식은 AI 처리에 최적화되어 있습니다:

```xml
이 파일은 전체 코드베이스를 하나의 문서로 통합한 것입니다...

<file_summary>
(메타데이터 및 AI 지시사항)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// 파일 내용
</file>
</files>
```

::: tip XML을 사용하는 이유
XML 태그는 Claude와 같은 AI 모델이 내용을 더 정확하게 파싱하는 데 도움이 됩니다. [Claude 공식 문서](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)에서는 구조화된 프롬프트에 XML 태그 사용을 권장하고 있습니다.
:::

## Markdown 형식

```bash
repomix --style markdown
```

Markdown은 읽기 쉬운 형식을 제공합니다:

```markdown
이 파일은 전체 코드베이스를 하나의 문서로 통합한 것입니다...

# 파일 요약
(메타데이터 및 AI 지시사항)

# 디렉토리 구조
```
src/
index.ts
utils/
helper.ts
```

# 파일

## File: src/index.ts
```typescript
// 파일 내용
```
```

## AI 모델과의 사용

각 형식은 AI 모델에서 잘 작동하지만, 다음 사항을 고려하세요:
- Claude에는 XML 사용 (가장 정확한 파싱)
- 일반적인 가독성을 위해서는 Markdown
- 단순성과 호환성을 위해서는 일반 텍스트

## 사용자 정의

`repomix.config.json`에서 기본 형식 설정:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```
