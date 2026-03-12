# Repomix를 라이브러리로 사용하기

Repomix를 CLI 도구로 사용하는 것 외에도 Node.js 애플리케이션에 직접 기능을 통합할 수 있습니다.

## 설치

프로젝트에 Repomix를 의존성으로 설치하세요:

```bash
npm install repomix
```

## 기본 사용법

Repomix를 사용하는 가장 간단한 방법은 명령줄 인터페이스와 동일한 기능을 제공하는 `runCli` 함수를 통해 사용하는 것입니다:

```javascript
import { runCli, type CliOptions } from 'repomix';

// 사용자 정의 옵션으로 현재 디렉토리 처리
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;
  
  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

`result.packResult`에는 처리된 파일에 대한 다음 정보가 포함됩니다:
- `totalFiles`: 처리된 파일 수
- `totalCharacters`: 총 문자 수
- `totalTokens`: 총 토큰 수(LLM 컨텍스트 제한에 유용)
- `fileCharCounts`: 파일별 문자 수
- `fileTokenCounts`: 파일별 토큰 수

## 원격 저장소 처리

원격 저장소를 클론하고 처리할 수 있습니다:

```javascript
import { runCli, type CliOptions } from 'repomix';

// GitHub 저장소 클론 및 처리
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## 핵심 컴포넌트 사용

더 많은 제어를 위해 Repomix의 저수준 API를 직접 사용할 수 있습니다:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // 파일 찾기 및 수집
  const { filePaths } = await searchFiles(directory, { /* 설정 */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* 설정 */ });
  
  // 토큰 계산
  const tokenCounter = new TokenCounter('o200k_base');
  
  // 분석 결과 반환
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## 번들링

Rolldown이나 esbuild 같은 도구로 repomix를 번들링할 때, 일부 의존성은 external로 유지해야 하며 WASM 파일을 복사해야 합니다:

**External 의존성 (번들 불가):**
- `tinypool` - 파일 경로를 사용하여 워커 스레드 생성
- `tiktoken` - 런타임에 WASM 파일을 동적으로 로드

**복사해야 할 WASM 파일:**
- `web-tree-sitter.wasm` → 번들된 JS와 동일한 디렉토리 (코드 압축 기능에 필요)
- Tree-sitter 언어 파일 → `REPOMIX_WASM_DIR` 환경 변수로 지정된 디렉토리

실제 예제는 [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs)를 참조하세요.

## 실제 사례

Repomix 웹사이트([repomix.com](https://repomix.com))는 원격 저장소를 처리하기 위해 라이브러리로 Repomix를 사용합니다. [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts)에서 구현을 확인할 수 있습니다. 
