---
title: FAQ 및 문제 해결
description: Repomix의 비공개 저장소, 출력 형식, 토큰 절감, 원격 GitHub 저장소, 보안 점검, AI 워크플로에 대한 자주 묻는 질문입니다.
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

## 관련 리소스

- [기본 사용법](/ko/guide/usage)
- [명령줄 옵션](/ko/guide/command-line-options)
- [코드 압축](/ko/guide/code-compress)
- [보안](/ko/guide/security)
