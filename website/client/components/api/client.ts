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

// NDJSON stream event types
interface ProgressEvent {
  type: 'progress';
  stage: PackProgressStage;
}

interface ResultEvent {
  type: 'result';
  data: PackResult;
}

interface StreamErrorEvent {
  type: 'error';
  message: string;
}

type StreamEvent = ProgressEvent | ResultEvent | StreamErrorEvent;

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
  if (!response.ok) {
    const data = await response.json();
    throw new ApiError((data as ErrorResponse).error);
  }

  // Handle NDJSON stream
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

      // Parse complete lines from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const event = JSON.parse(line) as StreamEvent;
        if (event.type === 'progress') {
          callbacks?.onProgress?.(event.stage);
        } else if (event.type === 'result') {
          result = event.data;
        } else if (event.type === 'error') {
          throw new ApiError(event.message);
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
