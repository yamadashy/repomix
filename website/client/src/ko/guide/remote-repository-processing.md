---
title: GitHub 저장소 처리
description: "전체 URL, user/repo 축약형, 브랜치, 태그, 커밋, Docker, 원격 설정 신뢰 제어를 사용해 GitHub 저장소를 Repomix로 패키징합니다."
---

# GitHub 저장소 처리

## 기본 사용법

공개 저장소 처리:
```bash
# 전체 URL 사용
repomix --remote https://github.com/user/repo

# GitHub 단축형 사용
repomix --remote user/repo
```

`--remote` 없이 `owner/repo` 단축형을 직접 전달할 수도 있습니다:

```bash
repomix yamadashy/repomix
```

`owner/repo`는 상대 로컬 경로와도 구분되지 않기 때문에, Repomix는 해당 이름의 로컬 파일이나 디렉터리가 존재하지 않고 저장소가 GitHub에서 접근 가능한 경우에만 원격 저장소로 처리합니다. 일치하는 로컬 경로가 있으면 항상 그쪽이 우선합니다. `owner/repo` 형태의 경로를 강제로 로컬로 처리하려면 `./`를 앞에 붙이세요(예: `repomix ./owner/repo`). 인수가 패턴과 일치하지만 저장소에 접근할 수 없는 경우(예: 비공개 저장소나 오타)에는 Repomix가 이를 로컬 경로로 처리하도록 폴백합니다.

## 브랜치 및 커밋 선택

```bash
# 특정 브랜치
repomix --remote user/repo --remote-branch main

# 태그
repomix --remote user/repo --remote-branch v1.0.0

# 커밋 해시
repomix --remote user/repo --remote-branch 935b695
```

## 요구 사항

- Git이 설치되어 있어야 함
- 인터넷 연결
- 저장소에 대한 읽기 권한

## 출력 제어

```bash
# 사용자 지정 출력 위치
repomix --remote user/repo -o custom-output.xml

# XML 형식 사용
repomix --remote user/repo --style xml

# 주석 제거
repomix --remote user/repo --remove-comments
```

## Docker 사용

```bash
# 현재 디렉토리에서 처리 및 출력
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# 특정 디렉토리에 출력
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## 보안

보안을 위해 원격 저장소의 설정 파일(`repomix.config.*`)은 기본적으로 로드되지 않습니다. 이를 통해 신뢰할 수 없는 저장소가 `repomix.config.ts` 같은 설정 파일을 통해 코드를 실행하는 것을 방지합니다.

글로벌 설정과 CLI 옵션은 그대로 적용됩니다.

원격 저장소의 설정을 신뢰하려면:

```bash
# CLI 플래그 사용
repomix --remote user/repo --remote-trust-config

# 환경 변수 사용
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

::: warning
`--remote-trust-config`를 사용하면 원격 저장소의 설정이 사용자의 로컬 환경과 동일한 수준으로 신뢰됩니다. 신뢰된 설정은 (`input.processors`를 통해) **임의의 명령을 실행**할 수 있고, (`output.instructionFilePath`나 `../`를 사용하는 include 패턴 등을 통해) **저장소 외부의 로컬 파일을 읽을** 수도 있습니다. 완전히 신뢰하고 검토를 마친 저장소에서만 사용하세요. 낯선 출처의 `npm install`이나 `Makefile`을 실행하기 전에 기울이는 것과 같은 주의가 필요합니다.
:::

### 확인 프롬프트

대화형 터미널에서 저장소의 설정을 신뢰하면, repomix는 실행하려는 설정을 보여주고 불러오기 전에 확인을 요청합니다.

- **예, 이번만**: 이번 실행만 신뢰합니다.
- **예, 이 저장소에서는 다시 묻지 않음**: 임시 파일이 삭제될 때까지, 그리고 해당 설정 파일이 변경되지 않는 동안에만 기억됩니다(설정 파일이 수정되면 다시 확인을 요청합니다). 이 확인은 설정 파일 자체에만 적용된다는 점에 유의하세요. `.ts` / `.js` 설정은 다른 파일을 가져올 수 있으며, 그런 파일은 이 검사 대상에 포함되지 않습니다.
- **아니요**: 설정을 실행하지 않고 중단합니다.

`--force`를 전달했거나, CI와 같은 비대화형 셸을 사용하거나(설정은 이전과 마찬가지로 신뢰되어 기존 자동화가 계속 작동합니다), 이미 해당 저장소를 항상 신뢰하도록 선택한 경우에는 이 확인 프롬프트가 표시되지 않습니다.

전체 신뢰 모델(신뢰된 설정이 할 수 있는 일, 표시되는 설정이 조작으로부터 보호되는 방식, "다시 묻지 않음" 결정이 저장되는 위치)에 대한 자세한 내용은 [보안](/ko/guide/security#remote-repository-config-trust) 문서를 참고하세요.

`--remote`와 `--config`를 함께 사용할 때는 절대 경로를 지정해야 합니다:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## 일반적인 문제

### 접근 문제
- 저장소가 공개되어 있는지 확인
- Git 설치 확인
- 인터넷 연결 확인

### 대용량 저장소
- `--include`를 사용하여 특정 경로 선택
- `--remove-comments` 활성화
- 브랜치별로 개별 처리

## 관련 리소스

- [명령행 옵션](/ko/guide/command-line-options) - `--remote` 옵션을 포함한 전체 CLI 레퍼런스
- [설정](/ko/guide/configuration) - 원격 처리를 위한 기본 옵션 설정
- [코드 압축](/ko/guide/code-compress) - 대규모 저장소의 출력 크기 줄이기
- [보안](/ko/guide/security) - Repomix의 민감한 데이터 감지 방식
