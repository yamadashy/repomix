# 출력 형식

Repomix는 네 가지 출력 형식을 지원합니다:
- XML (기본값)
- Markdown
- JSON
- 일반 텍스트

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
```

### 왜 XML을 기본 형식으로 사용하나요?

Repomix는 광범위한 연구와 테스트를 바탕으로 XML을 기본 출력 형식으로 채택했습니다. 이 결정은 실증적 증거와 AI 보조 코드 분석의 실용적 고려사항에 근거합니다.

XML 채택의 주요 이유는 주요 AI 제공업체의 공식 권장사항에 있습니다:
- **Anthropic (Claude)**: 프롬프트 구조화에서 XML 태그 사용을 명시적으로 권장하며, "Claude는 훈련 과정에서 그러한 프롬프트에 노출되었다"고 명시 ([문서](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: 복잡한 작업에서 XML을 포함한 구조화된 형식을 권장 ([문서](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: 복잡한 시나리오에서 구조화된 프롬프팅을 권장 ([발표](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Markdown 형식

```bash
repomix --style markdown
```

Markdown은 읽기 쉬운 형식을 제공합니다:

````markdown
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

# Git 로그

## 커밋: 2025-08-20 00:47:19 +0900
**메시지:** feat(cli): Add --include-logs option for git commit history

**파일:**
- README.md
- src/cli/cliRun.ts
- src/core/git/gitCommand.ts
- src/core/git/gitLogHandle.ts
- src/core/output/outputGenerate.ts

## 커밋: 2025-08-21 00:09:43 +0900
**메시지:** Merge pull request #795 from yamadashy/chore/ratchet-update-ci

**파일:**
- .github/workflows/ratchet-update.yml
````

## JSON 형식

```bash
repomix --style json
```

JSON 형식은 camelCase 속성명을 사용하는 구조화되고 프로그래밍 방식으로 접근 가능한 출력을 제공합니다:

```json
{
  "fileSummary": {
    "generationHeader": "이 파일은 Repomix에 의해 전체 코드베이스를 하나의 문서로 통합한 것입니다.",
    "purpose": "이 파일에는 저장소 전체 콘텐츠의 압축된 표현이 포함되어 있습니다...",
    "fileFormat": "콘텐츠는 다음과 같이 구성되어 있습니다...",
    "usageGuidelines": "- 이 파일은 읽기 전용으로 취급해야 합니다...",
    "notes": "- 일부 파일은 .gitignore 규칙에 따라 제외될 수 있습니다..."
  },
  "userProvidedHeader": "지정된 경우의 사용자 정의 헤더 텍스트",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// 파일 내용",
    "src/utils.js": "// 파일 내용"
  },
  "instruction": "instructionFilePath에서 가져온 사용자 정의 지시사항"
}
```

### JSON 형식의 장점

JSON 형식은 다음 용도에 이상적입니다:
- **프로그래밍 처리**: 모든 프로그래밍 언어에서 JSON 라이브러리를 사용하여 쉽게 파싱하고 조작 가능
- **API 통합**: 웹 서비스 및 애플리케이션에서 직접 사용
- **AI 도구 호환성**: 기계 학습 및 AI 시스템에 최적화된 구조화된 형식
- **데이터 분석**: `jq`와 같은 도구를 사용하여 특정 정보를 간단히 추출

### `jq`를 사용한 JSON 출력 활용

JSON 형식을 사용하면 프로그래밍 방식으로 특정 정보를 쉽게 추출할 수 있습니다. 일반적인 예시는 다음과 같습니다:

#### 기본 파일 작업
```bash
# 모든 파일 경로 나열
cat repomix-output.json | jq -r '.files | keys[]'

# 총 파일 수 계산
cat repomix-output.json | jq '.files | keys | length'

# 특정 파일 내용 추출
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### 파일 필터링 및 분석
```bash
# 확장자로 파일 찾기
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# 특정 텍스트를 포함한 파일 찾기
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# 문자 수와 함께 파일 목록 생성
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) 문자"'
```

#### 메타데이터 추출
```bash
# 디렉토리 구조 추출
cat repomix-output.json | jq -r '.directoryStructure'

# 파일 요약 정보 가져오기
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# 사용자 제공 헤더 추출 (있는 경우)
cat repomix-output.json | jq -r '.userProvidedHeader // "헤더가 제공되지 않음"'

# 사용자 정의 지시사항 가져오기
cat repomix-output.json | jq -r '.instruction // "지시사항이 제공되지 않음"'
```

#### 고급 분석
```bash
# 내용 길이별 최대 파일 찾기
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# 특정 패턴을 포함한 파일 검색
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# 여러 확장자와 일치하는 파일 경로 추출
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

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

================
Git 로그
================
================
Date: 2025-08-20 00:47:19 +0900
Message: feat(cli): Add --include-logs option for git commit history
Files:
  - README.md
  - src/cli/cliRun.ts
  - src/core/git/gitCommand.ts
  - src/core/git/gitLogHandle.ts
  - src/core/output/outputGenerate.ts
================

================
Date: 2025-08-21 00:09:43 +0900
Message: Merge pull request #795 from yamadashy/chore/ratchet-update-ci
Files:
  - .github/workflows/ratchet-update.yml
================
```

## AI 모델과의 사용

각 형식은 AI 모델에서 잘 작동하지만, 다음 사항을 고려하세요:
- Claude에는 XML 사용 (가장 정확한 파싱)
- 일반적인 가독성을 위해서는 Markdown
- 프로그래밍 처리 및 API 통합에는 JSON
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

## 관련 리소스

- [설정](/ko/guide/configuration) - 전체 설정 옵션 레퍼런스
- [명령행 옵션](/ko/guide/command-line-options) - `--style`로 출력 형식 설정
- [코드 압축](/ko/guide/code-compress) - 구조를 유지하면서 토큰 수 줄이기
- [프롬프트 예시](/ko/guide/prompt-examples) - 다양한 AI 모델과 출력 활용 팁
