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
  signal?: AbortSignal;
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

const API_BASE_URL = import.meta.env.PROD ? 'https://api.repomix.com' : 'http://localhost:8080';

export async function packRepository(request: PackRequest): Promise<PackResult> {
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
    signal: request.signal,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError((data as ErrorResponse).error);
  }

  return data as PackResult;
}
