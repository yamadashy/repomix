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

### 파일 목록 입력 (pipe via stdin)

최고의 유연성을 위해 stdin을 통해 파일 경로를 전달하세요:

```bash
# find 명령 사용
find src -name "*.ts" -type f | repomix

# git을 사용하여 추적된 파일 가져오기
git ls-files "*.ts" | repomix

# glob 패턴과 함께 ls 사용
ls src/**/*.ts | repomix

# 파일 경로가 포함된 파일에서
cat file-list.txt | repomix

# echo로 직접 입력
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# 대시를 사용한 find 명령 (명시적 stdin 지시자)
find src -name "*.ts" | repomix -
```

Repomix는 파일 경로가 stdin을 통해 파이프될 때 자동으로 감지하여 패킹할 파일 선택에 최고의 유연성을 제공합니다.

> [!NOTE]
> stdin 입력을 사용할 때 파일 경로는 상대 경로 또는 절대 경로가 될 수 있으며, Repomix가 자동으로 경로 해석과 중복 제거를 처리합니다.

### 파일 목록 입력 (pipe via stdin)

최대한의 유연성을 위해 stdin을 통해 파일 경로를 전달하세요:

```bash
# find 명령어 사용
find src -name "*.ts" -type f | repomix

# git을 사용하여 추적된 파일 가져오기
git ls-files "*.ts" | repomix

# glob 패턴과 함께 ls 사용
ls src/**/*.ts | repomix

# 파일 경로가 포함된 파일에서
cat file-list.txt | repomix

# echo를 사용한 직접 입력
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

Repomix는 stdin을 통해 파이프된 파일 경로를 자동으로 감지하여 패킹할 파일을 선택하는 데 최대한의 유연성을 제공합니다.

> [!NOTE]
> stdin 입력 사용 시 파일 경로는 상대 경로 또는 절대 경로일 수 있으며, Repomix가 자동으로 경로 해석과 중복 제거를 처리합니다.

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
