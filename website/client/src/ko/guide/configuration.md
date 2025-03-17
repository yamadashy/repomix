# 설정

## 빠른 시작

설정 파일 생성:
```bash
repomix --init
```

## 설정 파일

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "사용자 정의 헤더 텍스트",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## 전역 설정

전역 설정 생성:
```bash
repomix --init --global
```

위치:
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## 무시 패턴

우선순위:
1. CLI 옵션 (`--ignore`)
2. `.repomixignore`
3. `.gitignore` 및 `.git/info/exclude`
4. 기본 패턴

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

기본적으로 포함되는 일반적인 패턴:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

전체 목록: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 예제

### 코드 압축

`output.compress`를 `true`로 설정하면, Repomix는 구현 세부 사항을 제거하면서 필수적인 코드 구조를 지능적으로 추출합니다. 이는 중요한 구조적 정보를 유지하면서 토큰 수를 줄일 때 특히 유용합니다.

예를 들어, 이 코드가:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

다음과 같이 압축됩니다:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### 주석 제거

`output.removeComments`를 `true`로 설정하면, 모든 코드 주석이 제거됩니다. 이는 코드 구현에 집중하거나 토큰 수를 더 줄이고 싶을 때 유용합니다.
