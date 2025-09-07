# 설정

Repomix는 설정 파일(`repomix.config.json`) 또는 명령줄 옵션을 사용하여 설정할 수 있습니다. 설정 파일을 사용하면 코드베이스의 처리 및 출력 방식을 사용자 정의할 수 있습니다.

## 빠른 시작

프로젝트 디렉토리에 설정 파일을 생성합니다:
```bash
repomix --init
```

이렇게 하면 기본 설정이 포함된 `repomix.config.json` 파일이 생성됩니다. 로컬 설정이 없을 때 대체로 사용될 전역 설정 파일을 생성할 수도 있습니다:

```bash
repomix --init --global
```

## 설정 옵션

| 옵션                             | 설명                                                                                                                         | 기본값                 |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | 처리할 최대 파일 크기(바이트). 이 크기를 초과하는 파일은 건너뜁니다. 큰 바이너리 파일이나 데이터 파일을 제외하는 데 유용합니다 | `50000000`            |
| `output.filePath`                | 출력 파일 이름. XML, Markdown, 일반 텍스트 형식을 지원합니다                                                                | `"repomix-output.xml"` |
| `output.style`                   | 출력 스타일(`xml`, `markdown`, `plain`). 각 형식은 다른 AI 도구에 대해 서로 다른 장점이 있습니다                          | `"xml"`                |
| `output.parsableStyle`           | 선택한 스타일 스키마에 따라 출력을 이스케이프할지 여부. 더 나은 구문 분석이 가능하지만 토큰 수가 증가할 수 있습니다      | `false`                |
| `output.compress`                | Tree-sitter를 사용하여 구조를 유지하면서 토큰 수를 줄이기 위해 지능적인 코드 추출을 수행할지 여부                         | `false`                |
| `output.headerText`              | 파일 헤더에 포함할 사용자 정의 텍스트. AI 도구에 컨텍스트나 지침을 제공하는 데 유용합니다                                | `null`                 |
| `output.instructionFilePath`     | AI 처리를 위한 상세한 사용자 정의 지침이 포함된 파일 경로                                                                  | `null`                 |
| `output.fileSummary`             | 출력 시작 부분에 파일 수, 크기 및 기타 메트릭을 보여주는 요약 섹션을 포함할지 여부                                        | `true`                 |
| `output.directoryStructure`      | 출력에 디렉토리 구조를 포함할지 여부. AI가 프로젝트 구성을 이해하는 데 도움이 됩니다                                     | `true`                 |
| `output.files`                   | 출력에 파일 내용을 포함할지 여부. false로 설정하면 구조와 메타데이터만 포함됩니다                                         | `true`                 |
| `output.removeComments`          | 지원되는 파일 유형에서 주석을 제거할지 여부. 노이즈와 토큰 수를 줄일 수 있습니다                                         | `false`                |
| `output.removeEmptyLines`        | 출력에서 빈 줄을 제거하여 토큰 수를 줄일지 여부                                                                            | `false`                |
| `output.showLineNumbers`         | 각 줄에 줄 번호를 추가할지 여부. 코드의 특정 부분을 참조하는 데 도움이 됩니다                                            | `false`                |
| `output.truncateBase64`          | 토큰 수를 줄이기 위해 긴 base64 데이터 문자열(예: 이미지)을 자를지 여부                                                  | `false`                |
| `output.copyToClipboard`         | 파일 저장 외에도 출력을 시스템 클립보드에 복사할지 여부                                                                    | `false`                |
| `output.topFilesLength`          | 요약에 표시할 상위 파일 수. 0으로 설정하면 요약이 표시되지 않습니다                                                        | `5`                    |
| `output.includeEmptyDirectories` | 저장소 구조에 빈 디렉토리를 포함할지 여부                                                                                  | `false`                |
| `output.git.sortByChanges`       | Git 변경 횟수로 파일을 정렬할지 여부. 변경이 많은 파일이 하단에 표시됩니다                                               | `true`                 |
| `output.git.sortByChangesMaxCommits` | Git 변경을 분석할 때 분석할 최대 커밋 수. 성능을 위해 이력 깊이를 제한합니다                                         | `100`                  |
| `output.git.includeDiffs`        | 출력에 Git 차이를 포함할지 여부. 작업 트리와 스테이징된 변경 사항을 별도로 표시합니다                                    | `false`                |
| `output.git.includeLogs`         | 출력에 Git 로그를 포함할지 여부. 커밋 히스토리의 날짜, 메시지, 파일 경로를 표시합니다                                   | `false`                |
| `output.git.includeLogsCount`    | 포함할 Git 로그 커밋 수. 개발 패턴을 이해하기 위한 히스토리 깊이를 제한합니다                                          | `50`                   |
| `include`                        | 포함할 파일 패턴([glob 패턴](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) 사용)                 | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | 프로젝트의 `.gitignore` 파일의 패턴을 사용할지 여부                                                                        | `true`                 |
| `ignore.useDefaultPatterns`      | 기본 무시 패턴(node_modules, .git 등)을 사용할지 여부                                                                     | `true`                 |
| `ignore.customPatterns`          | 추가 무시 패턴([glob 패턴](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) 사용)                   | `[]`                   |
| `security.enableSecurityCheck`   | Secretlint를 사용하여 민감한 정보를 감지하는 보안 검사를 수행할지 여부                                                    | `true`                 |
| `tokenCount.encoding`            | OpenAI의 [tiktoken](https://github.com/openai/tiktoken) 토크나이저가 사용하는 토큰 카운트 인코딩. GPT-4o는 `o200k_base`, GPT-4/3.5는 `cl100k_base`를 사용. 자세한 내용은 [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) 참조 | `"o200k_base"`         |

설정 파일은 [JSON5](https://json5.org/) 구문을 지원하며, 다음을 허용합니다:
- 주석(한 줄 및 여러 줄)
- 객체와 배열의 후행 쉼표
- 따옴표 없는 속성 이름
- 더 유연한 문자열 구문

## 스키마 유효성 검사

`$schema` 속성을 추가하여 설정 파일에 대한 스키마 유효성 검사를 활성화할 수 있습니다:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

이렇게 하면 JSON 스키마를 지원하는 편집기에서 자동 완성 및 유효성 검사 기능을 제공합니다.

## 설정 파일 예시

다음은 전체 설정 파일(`repomix.config.json`)의 예시입니다:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "패키지된 파일의 사용자 정의 헤더 정보",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignoreContent": ["components/**", "!components/slider/**"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // 패턴은 .repomixignore에서도 지정할 수 있습니다
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## 설정 파일 위치

Repomix는 다음 순서로 설정 파일을 찾습니다:
1. 현재 디렉토리의 로컬 설정 파일(`repomix.config.json`)
2. 전역 설정 파일:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

명령줄 옵션은 설정 파일의 설정보다 우선합니다.

## 무시 패턴

Repomix는 무시할 파일을 지정하는 여러 방법을 제공합니다. 패턴은 다음 우선 순위로 처리됩니다:

1. CLI 옵션(`--ignore`)
2. 프로젝트 디렉토리의 `.repomixignore` 파일
3. `.gitignore` 및 `.git/info/exclude`(`ignore.useGitignore`가 true인 경우)
4. 기본 패턴(`ignore.useDefaultPatterns`가 true인 경우)

`.repomixignore` 예시:
```text
# 캐시 디렉토리
.cache/
tmp/

# 빌드 출력
dist/
build/

# 로그
*.log
```

## 기본 무시 패턴

`ignore.useDefaultPatterns`가 true일 때 Repomix는 다음과 같은 일반적인 패턴을 자동으로 무시합니다:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

전체 목록은 [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)를 참조하세요.

## 고급 기능

### 코드 압축

코드 압축 기능(`output.compress: true`로 활성화)은 [Tree-sitter](https://github.com/tree-sitter/tree-sitter)를 사용하여 구현 세부 사항을 제거하면서 필수 코드 구조를 지능적으로 추출합니다. 이는 중요한 구조 정보를 유지하면서 토큰 수를 줄이는 데 도움이 됩니다.

주요 이점:
- 토큰 수를 크게 줄임
- 클래스와 함수 시그니처 유지
- 임포트와 익스포트 유지
- 타입 정의와 인터페이스 유지
- 함수 본문과 구현 세부 사항 제거

자세한 정보와 예시는 [코드 압축 가이드](code-compress)를 참조하세요.

### Git 통합

`output.git` 설정은 강력한 Git 인식 기능을 제공합니다:

- `sortByChanges`: true로 설정하면 파일이 Git 변경 횟수(해당 파일을 수정한 커밋 수)로 정렬됩니다. 변경이 많은 파일이 출력 하단에 나타납니다. 이는 더 활발하게 개발되는 파일을 우선시하는 데 도움이 됩니다. 기본값: `true`
- `sortByChangesMaxCommits`: 파일 변경 횟수를 계산할 때 분석할 최대 커밋 수. 기본값: `100`
- `includeDiffs`: true로 설정하면 Git 차이를 출력에 포함합니다(작업 트리와 스테이징된 변경 사항을 별도로 포함). 이를 통해 독자는 저장소의 대기 중인 변경 사항을 볼 수 있습니다. 기본값: `false`
- `includeLogs`: true로 설정하면 Git 로그를 출력에 포함합니다. 커밋 히스토리의 날짜, 메시지, 파일 경로가 표시되어 AI가 어떤 파일들이 일반적으로 함께 변경되는지 이해할 수 있습니다. 기본값: `false`
- `includeLogsCount`: 포함할 Git 로그 커밋 수입니다. 개발 패턴 분석에 사용되는 히스토리 깊이를 제어합니다. 기본값: `50`

설정 예시:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 30
    }
  }
}
```

### 보안 검사

`security.enableSecurityCheck`가 활성화되면 Repomix는 [Secretlint](https://github.com/secretlint/secretlint)를 사용하여 코드베이스를 출력에 포함하기 전에 민감한 정보를 감지합니다. 이는 다음과 같은 정보의 우발적 노출을 방지하는 데 도움이 됩니다:

- API 키
- 액세스 토큰
- 개인 키
- 비밀번호
- 기타 민감한 자격 증명

### 주석 제거

`output.removeComments`를 `true`로 설정하면 지원되는 파일 유형에서 주석이 제거되어 출력 크기를 줄이고 핵심 코드 내용에 집중할 수 있습니다. 이는 다음과 같은 경우에 특히 유용합니다:

- 많은 문서화가 된 코드 처리
- 토큰 수 줄이기 시도
- 코드 구조와 로직에 집중

지원되는 언어와 자세한 예시는 [주석 제거 가이드](comment-removal)를 참조하세요.
