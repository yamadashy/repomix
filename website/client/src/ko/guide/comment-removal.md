# 주석 제거

Repomix는 출력 파일을 생성할 때 코드베이스에서 주석을 자동으로 제거할 수 있습니다. 이를 통해 노이즈를 줄이고 실제 코드에 집중할 수 있습니다.

## 사용법

주석 제거를 활성화하려면 `repomix.config.json`에서 `removeComments` 옵션을 `true`로 설정합니다.

```json
{
  "output": {
    "removeComments": true
  }
}
```

## 지원되는 언어

Repomix는 다음을 포함한 광범위한 프로그래밍 언어에 대한 주석 제거를 지원합니다.

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- 그리고 더 많은 언어들...

## 예시

다음 JavaScript 코드가 주어졌을 때:

```javascript
// 이것은 한 줄 주석입니다
function test() {
  /* 이것은
     여러 줄 주석입니다 */
  return true;
}
```

주석 제거를 활성화하면 출력은 다음과 같습니다.

```javascript
function test() {
  return true;
}
```

## 참고

- 주석 제거는 행 번호 추가와 같은 다른 처리 단계 전에 수행됩니다.
- JSDoc 주석과 같은 일부 주석은 언어 및 컨텍스트에 따라 보존될 수 있습니다.

## 관련 리소스

- [코드 압축](/ko/guide/code-compress) - 코드 구조 추출로 토큰 수를 더 줄이기
- [설정](/ko/guide/configuration) - 설정 파일에서 `output.removeComments` 설정
- [명령행 옵션](/ko/guide/command-line-options) - `--remove-comments` 플래그 사용
