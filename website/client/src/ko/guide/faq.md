---
title: FAQ 및 문제 해결
description: Repomix의 비공개 저장소, C# 및 Python 지원, MCP 호환 에이전트, 출력 형식, 토큰 절감, 보안 점검, AI 워크플로에 대한 자주 묻는 질문입니다.
---

# FAQ 및 문제 해결

이 페이지는 Repomix 워크플로를 선택하고, 큰 출력을 줄이고, AI 어시스턴트에 전달할 코드베이스 컨텍스트를 준비할 때 자주 묻는 질문에 답합니다.

## 자주 묻는 질문

### Repomix는 무엇에 사용하나요?

Repomix는 저장소를 하나의 AI 친화적 파일로 패키징합니다. ChatGPT, Claude, Gemini 같은 AI 어시스턴트에 전체 코드베이스 컨텍스트를 제공하여 코드 리뷰, 버그 조사, 리팩터링, 문서화, 온보딩에 활용할 수 있습니다.

### 비공개 저장소에도 사용할 수 있나요?

예. 로컬에서 접근 가능한 checkout 안에서 Repomix를 실행하세요.

```bash
repomix
```

외부 AI 서비스에 공유하기 전에 생성된 파일을 직접 검토하세요.

### 공개 GitHub 저장소를 클론 없이 처리할 수 있나요?

예. `--remote`에 축약형이나 전체 URL을 지정합니다.

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### 어떤 출력 형식을 선택해야 하나요?

기본값인 XML부터 시작하세요. 읽기 쉬운 대화에는 Markdown, 자동화에는 JSON, 최대 호환성에는 plain text가 적합합니다.

```bash
repomix --style markdown
repomix --style json
```

자세한 내용은 [출력 형식](/ko/guide/output)을 참고하세요.

## 토큰 사용량 줄이기

### 생성된 파일이 너무 큽니다. 어떻게 해야 하나요?

대상 범위를 좁히세요.

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

큰 저장소에서는 include/ignore 패턴과 코드 압축을 함께 사용하는 것이 좋습니다.

### `--compress`는 무엇을 하나요?

`--compress`는 import, export, class, function, interface 같은 중요한 구조를 유지하면서 많은 구현 세부 정보를 제거합니다. 모델이 전체 아키텍처를 이해해야 할 때 유용합니다.

## 보안 및 개인정보

### CLI가 코드를 업로드하나요?

Repomix CLI는 로컬에서 실행되며 출력 파일을 내 컴퓨터에 씁니다. 웹사이트와 브라우저 확장은 다른 흐름을 가지므로 [개인정보 처리방침](/ko/guide/privacy)을 확인하세요.

### Secret 포함을 어떻게 방지하나요?

Repomix는 Secretlint 기반 안전 점검을 사용합니다. 하지만 보조 안전장치로 보고, 출력 파일은 항상 직접 검토하세요.

## 문제 해결

### 출력에 파일이 누락됩니다.

Repomix는 `.gitignore`, 기본 ignore 규칙, 사용자 지정 ignore 패턴을 따릅니다. `repomix.config.json`, `--ignore`, git ignore 설정을 확인하세요.

### 팀에서 같은 출력을 재현하려면?

공유 설정 파일을 만들고 커밋하세요.

```bash
repomix --init
```

## 추가 자주 묻는 질문

### Repomix는 C#, Python, Java, Go, Rust 같은 다른 언어 저장소에서도 동작하나요?

예. Repomix는 프로젝트 파일을 읽어 AI 도구에 맞게 포맷하므로 어떤 프로그래밍 언어로 작성된 저장소도 패킹할 수 있습니다. CLI를 실행하려면 Node.js 20 이상이 필요합니다. Tree-sitter 기반 코드 압축 같은 일부 고급 기능은 언어별 파서 지원 여부에 따라 달라질 수 있습니다.

### Hermes Agent, OpenClaw 또는 다른 MCP 호환 에이전트와 Repomix를 사용할 수 있나요?

예. Repomix는 MCP 서버로 실행할 수 있습니다:

```bash
npx -y repomix --mcp
```

Hermes Agent에서는 `~/.hermes/config.yaml`에 Repomix를 stdio MCP 서버로 추가합니다:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

OpenClaw 또는 다른 MCP 호환 에이전트에서는 외부 stdio MCP 서버를 설정하는 위치에 동일한 command와 args를 사용합니다. Assistant가 Agent Skills를 지원한다면 [Repomix Explorer Skill](/ko/guide/repomix-explorer-skill)도 사용할 수 있습니다.

### AI 어시스턴트가 새 라이브러리나 프레임워크를 이해하도록 Repomix를 어떻게 사용하나요?

라이브러리 저장소나 문서를 패킹한 뒤, 그 출력을 AI 어시스턴트에게 참고 자료로 제공합니다:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

반복해서 사용할 경우 재사용 가능한 Agent Skills 디렉터리로 생성할 수도 있습니다:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### CSS, 테스트, 빌드 출력 또는 노이즈가 많은 파일은 어떻게 제외하나요?

일회성 명령에는 `--ignore`를 사용합니다:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

특정 소스나 문서 경로만 남기려면 `--include`를 사용합니다:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### 저장소 크기 제한이 있나요?

CLI에는 고정된 저장소 크기 제한이 없지만, 매우 큰 저장소는 메모리, 파일 크기, AI 도구의 업로드 및 컨텍스트 제한의 영향을 받을 수 있습니다. 큰 프로젝트에서는 대상 include 패턴으로 시작하고, 토큰이 큰 파일을 확인한 뒤 필요하면 출력을 분할하세요:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### `--include`를 사용해도 `node_modules`, 빌드 디렉터리 또는 무시된 경로의 파일이 포함되지 않는 이유는 무엇인가요?

`--include`는 Repomix가 패킹하려는 파일을 좁히지만, ignore 규칙은 계속 적용됩니다. 파일은 `.gitignore`, `.ignore`, `.repomixignore`, 내장 기본 패턴 또는 `repomix.config.json`에 의해 제외될 수 있습니다. 고급 경우에는 `--no-gitignore` 또는 `--no-default-patterns`를 사용할 수 있지만, 의존성, 빌드 산출물 또는 다른 노이즈 파일까지 포함될 수 있으므로 주의하세요.

## 관련 리소스

- [기본 사용법](/ko/guide/usage)
- [명령줄 옵션](/ko/guide/command-line-options)
- [코드 압축](/ko/guide/code-compress)
- [보안](/ko/guide/security)
