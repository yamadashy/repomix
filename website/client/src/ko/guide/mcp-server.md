---
title: MCP 서버
description: "Repomix를 Model Context Protocol 서버로 실행해 AI 어시스턴트가 로컬 또는 원격 코드베이스를 직접 패키징, 검색, 읽을 수 있게 합니다."
---

# MCP 서버

Repomix는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)를 지원하며, AI 어시스턴트가 코드베이스와 직접 상호작용할 수 있게 해줍니다. MCP 서버로 실행하면 Repomix는 AI 어시스턴트가 수동 파일 준비 없이 로컬 또는 원격 저장소를 분석용으로 패키징할 수 있는 도구를 제공합니다.

> [!NOTE]  
> 이것은 실험적인 기능으로, 사용자 피드백과 실제 사용 사례를 바탕으로 지속적으로 개선해 나갈 예정입니다

## Repomix를 MCP 서버로 실행하기

Repomix를 MCP 서버로 실행하려면 `--mcp` 플래그를 사용하세요:

```bash
repomix --mcp
```

이렇게 하면 Repomix가 MCP 서버 모드로 시작되어 Model Context Protocol을 지원하는 AI 어시스턴트에서 사용할 수 있게 됩니다.

## 샌드박스 모드

기본적으로 MCP 서버는 호스트 사용자가 접근할 수 있는 모든 경로를 읽을 수 있습니다. 이는 신뢰할 수 있는 로컬 어시스턴트에는 편리하지만, 서버가 신뢰할 수 없는 클라이언트나 에이전트에 노출되는 경우에는 범위가 너무 넓습니다. `--sandbox` 플래그는 서버의 파일 도구를 단일 작업 공간 디렉토리로 제한합니다:

```bash
# 현재 작업 디렉토리로 제한
repomix --mcp --sandbox

# 특정 디렉토리로 제한
repomix --mcp --sandbox path/to/project
```

샌드박스 모드가 켜져 있으면:

- **모든 경로는 작업 공간 루트를 기준으로 한 상대 경로입니다.** 절대 경로, `~`, `..`, Windows 드라이브/UNC 경로는 거부되며, 심볼릭 링크를 통한 경우를 포함하여 루트 밖으로 해석되는 경로는 제외됩니다. 결과와 오류 메시지도 상대 경로로 표시되므로 호스트 경로가 노출되지 않습니다. 이는 아래 도구 참조에 나오는 `directory` 및 `path` 매개변수에도 적용됩니다. 샌드박스 모드에서는 해당 표에서 설명하는 절대 경로가 아니라 작업 공간 루트를 기준으로 한 상대 경로로 전달해야 합니다.
- **읽기 전용이며 루트로 제한된 도구만 등록됩니다:** `pack_codebase`, `read_repomix_output`, `grep_repomix_output`, `file_system_read_file`, `file_system_read_directory`. 원격 패키징, 스킬 생성, 외부 출력 첨부 기능은 네트워크에 접근하거나 파일을 작성하거나 임의의 경로를 참조하므로 비활성화됩니다. 두 `file_system_*` 도구 자체도 샌드박스 모드에서만 사용 가능하며, 작업 공간 루트가 도달 가능한 범위를 제한합니다.

이는 도구 표면에 대한 애플리케이션 수준의 제한(심층 방어)이며, OS 수준의 샌드박스는 아닙니다. 신뢰할 수 없는 클라이언트를 위해 서버를 호스팅할 때는 여전히 플랫폼의 일반적인 격리 방식(컨테이너, 전용 사용자)으로 실행해야 합니다.

`--sandbox`는 MCP 서버에만 영향을 미치며, `--mcp` 없이는 아무런 효과가 없습니다.

## MCP 서버 구성하기

Claude와 같은 AI 어시스턴트와 함께 Repomix를 MCP 서버로 사용하려면 MCP 설정을 구성해야 합니다:

### VS Code의 경우

VS Code에 Repomix MCP 서버를 설치하는 방법은 다음과 같습니다:

1. **설치 배지 사용:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **명령줄 사용:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  VS Code Insiders의 경우:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Cline(VS Code 확장)의 경우

`cline_mcp_settings.json` 파일을 편집하세요:

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

### Cursor의 경우

Cursor에서는 `Cursor Settings` > `MCP` > `+ Add new global MCP server`에서 Cline과 유사한 설정을 추가하세요.

### Claude Desktop의 경우

Cline의 구성과 유사하게 `claude_desktop_config.json` 파일을 편집하세요.

### Claude Code의 경우

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)에서 Repomix를 MCP 서버로 구성하려면 다음 명령어를 사용하세요:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

또는 더 편리한 경험을 위해 **공식 Repomix 플러그인**을 사용할 수 있습니다. 플러그인은 자연어 명령과 더 쉬운 설정을 제공합니다. 자세한 내용은 [Claude Code 플러그인](/ko/guide/claude-code-plugins) 문서를 참조하세요.

### npx 대신 Docker 사용

npx 대신 Docker를 사용하여 Repomix를 MCP 서버로 실행할 수 있습니다:

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

## 사용 가능한 MCP 도구

MCP 서버로 실행할 때 Repomix는 다음 도구를 제공합니다:

### pack_codebase

이 도구는 로컬 코드 디렉토리를 AI 분석용 XML 파일로 패키징합니다. 코드베이스 구조를 분석하고 관련 코드 내용을 추출하여 메트릭, 파일 트리, 포맷된 코드 내용을 포함한 포괄적인 보고서를 생성합니다.

**매개변수:**

| 매개변수 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `directory` | 예 | — | 패키징할 디렉토리의 절대 경로 |
| `compress` | 아니오 | `false` | 구현 세부사항을 제거하면서 핵심 코드 시그니처와 구조를 추출하는 Tree-sitter 압축 활성화. 의미를 유지하면서 토큰 사용량을 ~70% 줄입니다. `grep_repomix_output`이 점진적 콘텐츠 검색을 가능하게 하므로 일반적으로 불필요합니다. |
| `includePatterns` | 아니오 | — | fast-glob 패턴으로 포함할 파일 지정. 쉼표로 구분 (예: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | 아니오 | — | fast-glob 패턴으로 제외할 추가 파일 지정. 쉼표로 구분 (예: `"test/**,*.spec.js"`). `.gitignore`와 내장 제외를 보완합니다. |
| `outputPatterns` | 아니오 | — | 설정 파일의 [`output.patterns`](./configuration.md) 옵션에 해당하는 파일별 포함 수준. `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }` 형식의 항목 배열. 처음 일치하는 패턴이 우선하며, `directoryStructureOnly`가 `compress`보다 우선합니다. 두 플래그 모두 지정하지 않은 일치 항목은 전체 콘텐츠를 강제합니다(전역 `compress`에서 특정 파일을 제외할 때 유용). 대상 저장소의 `repomix.config.json`에 있는 `output.patterns`를 재정의합니다. |
| `topFilesLength` | 아니오 | `10` | 메트릭 요약에 표시할 크기별 최대 파일 수 |
| `style` | 아니오 | `xml` | 출력 형식 스타일: `xml`, `markdown`, `json`, 또는 `plain` |

**예시:**
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

위 예시에서(`compress: true`가 일치하지 않는 파일에 대한 catch-all 역할을 하는 경우), `src/core/` 아래의 파일은 전체 콘텐츠로 유지되고, `docs/` 아래의 파일은 디렉토리 구조만 표시되며, 나머지는 모두 압축됩니다.

### pack_remote_repository

이 도구는 GitHub 저장소를 가져와 클론하고 AI 분석용 XML 파일로 패키징합니다. 원격 저장소를 자동으로 클론하고 구조를 분석하여 포괄적인 보고서를 생성합니다.

**매개변수:**

| 매개변수 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `remote` | 예 | — | GitHub 저장소 URL 또는 `user/repo` 형식 (예: `"yamadashy/repomix"`, `"https://github.com/user/repo"` 또는 `"https://github.com/user/repo/tree/branch"`) |
| `compress` | 아니오 | `false` | 구현 세부사항을 제거하면서 핵심 코드 시그니처와 구조를 추출하는 Tree-sitter 압축 활성화. 의미를 유지하면서 토큰 사용량을 ~70% 줄입니다. `grep_repomix_output`이 점진적 콘텐츠 검색을 가능하게 하므로 일반적으로 불필요합니다. |
| `includePatterns` | 아니오 | — | fast-glob 패턴으로 포함할 파일 지정. 쉼표로 구분 (예: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | 아니오 | — | fast-glob 패턴으로 제외할 추가 파일 지정. 쉼표로 구분 (예: `"test/**,*.spec.js"`). `.gitignore`와 내장 제외를 보완합니다. |
| `outputPatterns` | 아니오 | — | 설정 파일의 [`output.patterns`](./configuration.md) 옵션에 해당하는 파일별 포함 수준. `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }` 형식의 항목 배열. 처음 일치하는 패턴이 우선하며, `directoryStructureOnly`가 `compress`보다 우선합니다. 두 플래그 모두 지정하지 않은 일치 항목은 전체 콘텐츠를 강제합니다(전역 `compress`에서 특정 파일을 제외할 때 유용). |
| `topFilesLength` | 아니오 | `10` | 메트릭 요약에 표시할 크기별 최대 파일 수 |
| `style` | 아니오 | `xml` | 출력 형식 스타일: `xml`, `markdown`, `json`, 또는 `plain` |

**예시:**
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

이 도구는 Repomix에서 생성된 출력 파일의 내용을 읽습니다. 대용량 파일에 대한 라인 범위 지정을 통한 부분 읽기를 지원합니다. 이 도구는 직접 파일 시스템 접근이 제한된 환경을 위해 설계되었습니다.

**매개변수:**

| 매개변수 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `outputId` | 예 | — | 읽을 Repomix 출력 파일의 ID |
| `startLine` | 아니오 | 파일 시작 | 시작 라인 번호 (1부터 시작, 포함) |
| `endLine` | 아니오 | 파일 끝 | 끝 라인 번호 (1부터 시작, 포함) |

**기능:**
- 웹 기반 환경이나 샌드박스 애플리케이션을 위해 특별히 설계됨
- ID를 사용하여 이전에 생성된 출력의 내용을 검색
- 파일 시스템 접근 없이 패키징된 코드베이스에 접근 제공
- 대용량 파일의 부분 읽기 지원

**예시:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

이 도구는 JavaScript RegExp 구문을 사용한 grep 유사 기능으로 Repomix 출력 파일에서 패턴을 검색합니다. 일치하는 라인과 일치 항목 주변의 선택적 컨텍스트 라인을 반환합니다.

**매개변수:**

| 매개변수 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `outputId` | 예 | — | 검색할 Repomix 출력 파일의 ID |
| `pattern` | 예 | — | 검색 패턴 (JavaScript RegExp 구문) |
| `contextLines` | 아니오 | `0` | 각 일치 항목 전후에 표시할 컨텍스트 라인 수. `beforeLines`/`afterLines`가 지정되면 재정의됩니다. |
| `beforeLines` | 아니오 | — | 각 일치 항목 전에 표시할 라인 수 (`grep -B`와 같음). `contextLines`보다 우선합니다. |
| `afterLines` | 아니오 | — | 각 일치 항목 후에 표시할 라인 수 (`grep -A`와 같음). `contextLines`보다 우선합니다. |
| `ignoreCase` | 아니오 | `false` | 대소문자를 구분하지 않는 매칭 수행 |

**기능:**
- 강력한 패턴 매칭을 위한 JavaScript RegExp 구문 사용
- 일치 항목의 더 나은 이해를 위한 컨텍스트 라인 지원
- 전/후 컨텍스트 라인의 별도 제어 허용
- 대소문자 구분/비구분 검색 옵션

**예시:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file 및 file_system_read_directory

이 두 파일 시스템 도구는 [샌드박스 모드](#샌드박스-모드)(`--sandbox`)에서만 사용할 수 있으며, 작업 공간 루트가 도달 가능한 범위를 제한합니다. `--sandbox` 없이는 등록되지 않습니다.

1. `file_system_read_file`
  - 작업 공간 루트를 기준으로 한 상대 경로(예: `src/index.ts`)에서 파일 내용 읽기
  - 알려진 시크릿 형식([Secretlint](https://github.com/secretlint/secretlint))과 일치하는 내용을 추가적인 휴리스틱 안전장치로 거부. 접근 경계는 스캔이 아니라 작업 공간 루트임
  - 잘못된 경로에 대해 호스트 경로를 노출하지 않고 명확한 오류 메시지 반환

2. `file_system_read_directory`
  - 작업 공간 루트를 기준으로 한 상대 경로(예: `.` 또는 `src`)에서 디렉토리의 내용 나열
  - 파일과 디렉토리를 명확한 지표(`[FILE]` 또는 `[DIR]`)로 표시
  - 프로젝트 구조 탐색과 코드베이스 조직 이해에 유용

**예시:**
```typescript
// 파일 읽기
const fileContent = await tools.file_system_read_file({
  path: 'src/index.ts'
});

// 디렉토리 내용 나열
const dirContent = await tools.file_system_read_directory({
  path: 'src'
});
```

이러한 도구는 AI 어시스턴트가 다음과 같은 작업을 수행해야 할 때 특히 유용합니다:
- 작업 공간의 특정 파일 분석
- 디렉토리 구조 탐색
- 파일 존재 여부 및 접근 가능성 확인

## Repomix를 MCP 서버로 사용하는 이점

Repomix를 MCP 서버로 사용하면 여러 이점이 있습니다:

1. **직접 통합**: AI 어시스턴트가 수동 파일 준비 없이 코드베이스를 직접 분석할 수 있습니다.
2. **효율적인 워크플로우**: 파일을 수동으로 생성하고 업로드할 필요가 없어 코드 분석 프로세스가 간소화됩니다.
3. **일관된 출력**: AI 어시스턴트가 일관되고 최적화된 형식으로 코드베이스를 받을 수 있습니다.
4. **고급 기능**: 코드 압축, 토큰 카운팅, 보안 검사와 같은 Repomix의 모든 기능을 활용할 수 있습니다.

구성이 완료되면 AI 어시스턴트가 Repomix의 기능을 직접 사용하여 코드베이스를 분석할 수 있어 코드 분석 워크플로우가 더 효율적이 됩니다.

## 관련 리소스

- [Claude Code 플러그인](/ko/guide/claude-code-plugins) - 편리한 Claude Code 플러그인 통합
- [설정](/ko/guide/configuration) - Repomix 동작 사용자 정의
- [명령행 옵션](/ko/guide/command-line-options) - 전체 CLI 레퍼런스
- [출력 형식](/ko/guide/output) - 사용 가능한 출력 형식 알아보기
