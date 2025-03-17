# 기본 사용법

## 빠른 시작

저장소 전체를 패키징:
```bash
repomix
```

## 일반적인 사용 사례

### 특정 디렉토리 패키징
```bash
repomix path/to/directory
```

### 특정 파일 포함
[glob 패턴](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) 사용:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 파일 제외
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

## 출력 형식

### 일반 텍스트 (기본값)
```bash
repomix --style plain
```

### XML
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
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
