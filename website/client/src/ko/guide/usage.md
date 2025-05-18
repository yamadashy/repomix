# 기본 사용법

## 빠른 시작

저장소 전체를 패키징:
```bash
repomix
```

## 일반적인 사용 사례

### 특정 디렉토리 패키징
관련 코드에 집중하고 토큰 수를 줄이기 위해 특정 디렉토리나 파일만 처리합니다:
```bash
repomix path/to/directory
```

### 특정 파일 포함
[glob 패턴](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)을 사용하여 포함할 파일을 정확하게 제어합니다:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 파일 제외
불필요하거나 민감한 내용을 포함하지 않도록 glob 패턴을 사용하여 특정 파일이나 디렉토리를 건너뜁니다:
```bash
repomix --ignore "**/*.log,tmp/"
```

### 원격 저장소 처리
```bash
# GitHub URL 사용
repomix --remote https://github.com/user/repo

# 단축형 사용
repomix --remote user/repo

# 특정 브랜치/태그/커밋
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### 코드 압축

Tree-sitter를 사용하여 구현 세부 사항을 제거하면서 필수 코드 구조를 지능적으로 추출하여 아키텍처를 유지하면서 토큰 수를 크게 줄입니다:

```bash
repomix --compress

# 원격 저장소에서도 사용할 수 있습니다:
repomix --remote yamadashy/repomix --compress
```

## 출력 형식

### XML (기본값)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### 일반 텍스트
```bash
repomix --style plain
```

## 추가 옵션

### 주석 제거
```bash
repomix --remove-comments
```

### 행 번호 표시
```bash
repomix --output-show-line-numbers
```

### 클립보드에 복사
```bash
repomix --copy
```

### 보안 검사 비활성화
```bash
repomix --no-security-check
```

## 설정

설정 파일 초기화:
```bash
repomix --init
```

더 자세한 설정 옵션은 [설정 가이드](/ko/guide/configuration)를 참조하세요.
