# 코드 압축

코드 압축은 구현 세부 사항을 제거하면서 필수적인 코드 구조를 지능적으로 추출하는 강력한 기능입니다. 이는 코드베이스의 중요한 구조적 정보를 유지하면서 토큰 수를 줄일 때 특히 유용합니다.

> [!NOTE]
> 이것은 실험적인 기능으로, 사용자 피드백과 실제 사용 사례를 바탕으로 지속적으로 개선될 예정입니다.

## 기본 사용법

`--compress` 플래그를 사용하여 코드 압축을 활성화합니다:

```bash
repomix --compress
```

원격 저장소에서도 사용할 수 있습니다:

```bash
repomix --remote user/repo --compress
```

## 작동 방식

압축 알고리즘은 Tree-sitter 파싱을 사용하여 코드를 처리하고, 구현 세부 사항을 제거하면서 필수적인 구조적 요소를 추출하고 보존합니다.

압축 시 유지되는 요소:
- 함수와 메서드 시그니처
- 인터페이스와 타입 정의
- 클래스 구조와 속성
- 중요한 구조적 요소

제거되는 요소:
- 함수와 메서드 구현
- 반복문과 조건문 로직 세부 사항
- 내부 변수 선언
- 구현 관련 코드

### 예시

원본 TypeScript 코드:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

압축 후:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## 설정

설정 파일에서 압축을 활성화할 수 있습니다:

```json
{
  "output": {
    "compress": true
  }
}
```

## 사용 사례

코드 압축은 다음과 같은 경우에 특히 유용합니다:
- 코드 구조와 아키텍처 분석
- LLM 처리를 위한 토큰 수 감소
- 고수준 문서 작성
- 코드 패턴과 시그니처 이해
- API와 인터페이스 설계 공유

## 관련 옵션

압축은 다음 옵션들과 함께 사용할 수 있습니다:
- `--remove-comments`: 코드 주석 제거 ([주석 제거](/ko/guide/comment-removal) 참조)
- `--remove-empty-lines`: 빈 줄 제거
- `--output-show-line-numbers`: 출력에 줄 번호 추가

## 관련 리소스

- [주석 제거](/ko/guide/comment-removal) - 주석을 제거하여 토큰 수를 더 줄이기
- [설정](/ko/guide/configuration) - 설정 파일에서 `output.compress` 설정
- [명령행 옵션](/ko/guide/command-line-options) - 전체 CLI 레퍼런스
