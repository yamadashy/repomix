# MCP 서버

Repomix는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)를 지원하며, AI 어시스턴트가 코드베이스와 직접 상호작용할 수 있게 해줍니다. MCP 서버로 실행하면 Repomix는 AI 어시스턴트가 수동 파일 준비 없이 로컬 또는 원격 저장소를 분석용으로 패키징할 수 있는 도구를 제공합니다.

> [!NOTE]  
> 이것은 실험적인 기능으로, 사용자 피드백과 실제 사용 사례를 바탕으로 지속적으로 개선해 나갈 예정입니다

## Repomix를 MCP 서버로 실행하기

Repomix를 MCP 서버로 실행하려면 `--mcp` 플래그를 사용하세요:

```bash
repomix --mcp
```

이렇게 하면 Repomix가 MCP 서버 모드로 시작되어 Model Context Protocol을 지원하는 AI 어시스턴트에서 사용할 수 있게 됩니다.

## 사용 가능한 MCP 도구

MCP 서버로 실행할 때 Repomix는 다음 도구를 제공합니다:

### pack_codebase

이 도구는 로컬 코드 디렉토리를 AI 분석용 통합 파일로 패키징합니다.

**매개변수:**
- `directory`: (필수) 패키징할 디렉토리의 절대 경로
- `compress`: (선택, 기본값: true) 토큰 수를 줄이기 위해 지능형 코드 추출을 수행할지 여부
- `includePatterns`: (선택) 쉼표로 구분된 포함 패턴 목록
- `ignorePatterns`: (선택) 쉼표로 구분된 제외 패턴 목록

**예시:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

이 도구는 GitHub 저장소를 가져와 클론하고 AI 분석용 통합 파일로 패키징합니다.

**매개변수:**
- `remote`: (필수) GitHub 저장소 URL 또는 사용자/저장소 형식(예: yamadashy/repomix)
- `compress`: (선택, 기본값: true) 토큰 수를 줄이기 위해 지능형 코드 추출을 수행할지 여부
- `includePatterns`: (선택) 쉼표로 구분된 포함 패턴 목록
- `ignorePatterns`: (선택) 쉼표로 구분된 제외 패턴 목록

**예시:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### read_repomix_output

이 도구는 직접 파일 접근이 불가능한 환경에서 Repomix 출력 파일의 내용을 읽습니다.

**매개변수:**
- `outputId`: (필수) 읽을 Repomix 출력 파일의 ID

**기능:**
- 웹 기반 환경이나 샌드박스 애플리케이션을 위해 특별히 설계됨
- ID를 사용하여 이전에 생성된 출력의 내용을 검색
- 파일 시스템 접근 없이 패키징된 코드베이스에 안전하게 접근 제공

**예시:**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file 및 file_system_read_directory

Repomix의 MCP 서버는 AI 어시스턴트가 로컬 파일 시스템과 안전하게 상호 작용할 수 있는 두 가지 파일 시스템 도구를 제공합니다:

1. `file_system_read_file`
   - 절대 경로를 사용하여 파일 내용 읽기
   - [Secretlint](https://github.com/secretlint/secretlint)를 사용한 보안 검증 구현
   - 민감한 정보가 포함된 파일에 대한 접근 방지
   - 잘못된 경로나 보안 문제에 대한 명확한 오류 메시지 반환

2. `file_system_read_directory`
   - 절대 경로를 사용하여 디렉토리 내용 나열
   - 파일과 디렉토리를 명확한 지표(`[FILE]` 또는 `[DIR]`)로 표시
   - 안전한 디렉토리 탐색과 적절한 오류 처리 제공
   - 경로 검증 및 절대 경로 확인

두 도구 모두 강력한 보안 조치를 포함하고 있습니다:
- 디렉토리 순회 공격을 방지하기 위한 절대 경로 검증
- 적절한 접근 권한을 보장하기 위한 권한 검사
- 민감한 정보 감지를 위한 Secretlint 통합
- 디버깅과 보안 인식을 위한 명확한 오류 메시지

**예시:**
```typescript
// 파일 읽기
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// 디렉토리 내용 나열
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

이러한 도구는 AI 어시스턴트가 다음과 같은 작업을 수행해야 할 때 특히 유용합니다:
- 코드베이스의 특정 파일 분석
- 디렉토리 구조 탐색
- 파일 존재 여부 및 접근 가능성 확인
- 안전한 파일 시스템 작업 보장

## MCP 서버 구성하기

Claude와 같은 AI 어시스턴트와 함께 Repomix를 MCP 서버로 사용하려면 MCP 설정을 구성해야 합니다:

### VS Code의 경우

VS Code에 Repomix MCP 서버를 설치하는 방법은 다음과 같습니다:

1. **설치 배지 사용:**

   [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
   [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **명령줄 사용:**

   ```bash
   code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
   ```

   VS Code Insiders의 경우:
   ```bash
   code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
   ```

### Cline(VS Code 확장)의 경우

`cline_mcp_settings.json` 파일을 편집하세요:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Claude Desktop의 경우

Cline의 구성과 유사하게 `claude_desktop_config.json` 파일을 편집하세요.

## Repomix를 MCP 서버로 사용하는 이점

Repomix를 MCP 서버로 사용하면 여러 이점이 있습니다:

1. **직접 통합**: AI 어시스턴트가 수동 파일 준비 없이 코드베이스를 직접 분석할 수 있습니다.
2. **효율적인 워크플로우**: 파일을 수동으로 생성하고 업로드할 필요가 없어 코드 분석 프로세스가 간소화됩니다.
3. **일관된 출력**: AI 어시스턴트가 일관되고 최적화된 형식으로 코드베이스를 받을 수 있습니다.
4. **고급 기능**: 코드 압축, 토큰 카운팅, 보안 검사와 같은 Repomix의 모든 기능을 활용할 수 있습니다.

구성이 완료되면 AI 어시스턴트가 Repomix의 기능을 직접 사용하여 코드베이스를 분석할 수 있어 코드 분석 워크플로우가 더 효율적이 됩니다.
