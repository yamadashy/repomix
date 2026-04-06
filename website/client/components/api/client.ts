export interface PackOptions {
  removeComments: boolean;
  removeEmptyLines: boolean;
  showLineNumbers: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  includePatterns?: string;
  ignorePatterns?: string;
  outputParsable?: boolean;
  compress?: boolean;
}

export interface FileInfo {
  path: string;
  charCount: number;
  tokenCount: number;
  selected?: boolean;
}

export interface PackRequest {
  url: string;
  format: 'xml' | 'markdown' | 'plain';
  options: PackOptions;
  file?: File;
}

export interface SuspiciousFile {
  filePath: string;
  messages: string[];
}

export interface PackResult {
  content: string;
  format: string;
  metadata: {
    repository: string;
    timestamp: string;
    summary: {
      totalFiles: number;
      totalCharacters: number;
      totalTokens: number;
    };
    topFiles: {
      path: string;
      charCount: number;
      tokenCount: number;
    }[];
    allFiles?: FileInfo[];
    suspiciousFiles?: SuspiciousFile[];
  };
}

export interface ErrorResponse {
  error: string;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export type PackProgressStage = 'cache-check' | 'repository-fetch' | 'extracting' | 'processing';

export interface PackStreamCallbacks {
  onProgress?: (stage: PackProgressStage) => void;
  signal?: AbortSignal;
}

const API_BASE_URL = import.meta.env.PROD ? 'https://api.repomix.com' : 'http://localhost:8080';

interface ParsedSSEEvent {
  event: string;
  data: string;
}

function parseSSEChunk(text: string): { events: ParsedSSEEvent[]; remaining: string } {
  const events: ParsedSSEEvent[] = [];
  const blocks = text.split('\n\n');
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = '';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (event || dataLines.length > 0) {
      events.push({ event, data: dataLines.join('\n') });
    }
  }

  return { events, remaining };
}

export async function packRepository(request: PackRequest, callbacks?: PackStreamCallbacks): Promise<PackResult> {
  const formData = new FormData();

  if (request.file) {
    formData.append('file', request.file);
  } else {
    formData.append('url', request.url);
  }
  formData.append('format', request.format);
  formData.append('options', JSON.stringify(request.options));

  const response = await fetch(`${API_BASE_URL}/api/pack`, {
    method: 'POST',
    body: formData,
    signal: callbacks?.signal,
  });

  // Handle non-streaming error responses (validation errors return JSON)
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    const data = await response.json();
    throw new ApiError((data as ErrorResponse).error);
  }

  // Handle SSE stream
  if (!response.body) {
    throw new ApiError('No response body received');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: PackResult | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSEChunk(buffer);
      buffer = remaining;

      for (const sseEvent of events) {
        if (sseEvent.event === 'progress') {
          const data = JSON.parse(sseEvent.data) as { stage: PackProgressStage };
          callbacks?.onProgress?.(data.stage);
        } else if (sseEvent.event === 'result') {
          result = JSON.parse(sseEvent.data) as PackResult;
        } else if (sseEvent.event === 'error') {
          const data = JSON.parse(sseEvent.data) as { message: string };
          throw new ApiError(data.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new ApiError('No result received from server');
  }

  return result;
}
