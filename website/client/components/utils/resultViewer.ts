import type { Ace } from 'ace-builds';
import type { PackResult } from '../api/client';
import { analyticsUtils } from './analytics';

/**
 * Format timestamp to locale string
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Handle clipboard copy with analytics tracking
 */
export async function copyToClipboard(content: string, format: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    analyticsUtils.trackCopyOutput(format);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Convert repository name to format suitable for filename
 */
function formatRepositoryName(repository: string): string {
  // Extract owner and repo from GitHub URL format or use as is
  const match = repository.match(/(?:https:\/\/github\.com\/)?([^/]+)\/([^/]+)(?:\.git)?$/);
  if (match) {
    const [, owner, repo] = match;
    return `${owner}-${repo}`;
  }
  // For non-GitHub repositories or local files, clean up the name
  return repository.replace(/[/\\]/g, '-').replace(/\.git$/, '');
}

/**
 * Handle file download with analytics tracking
 */
export function downloadResult(content: string, format: string, result: PackResult): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const extension = format === 'markdown' ? 'md' : format === 'xml' ? 'xml' : 'txt';

  const repoName = formatRepositoryName(result.metadata.repository);
  a.href = url;
  a.download = `repomix-output-${repoName}.${extension}`;
  document.body.appendChild(a);
  a.click();

  analyticsUtils.trackDownloadOutput(format);
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Handle sharing with Web Share API as file
 */
export async function shareResult(content: string, format: string, result: PackResult): Promise<boolean> {
  try {
    const repoName = formatRepositoryName(result.metadata.repository);
    const extension = format === 'markdown' ? 'md' : format === 'xml' ? 'xml' : 'txt';
    const filename = `repomix-output-${repoName}.${extension}`;

    const mimeType = format === 'markdown' ? 'text/markdown' : format === 'xml' ? 'application/xml' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    const shareData = {
      files: [file],
    };

    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      analyticsUtils.trackShareOutput(format);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Failed to share:', err);
    return false;
  }
}

/**
 * Check if Web Share API is supported for file sharing
 */
export function canShareFiles(): boolean {
  if (navigator.canShare && typeof navigator.canShare === 'function') {
    try {
      const dummyFile = new File([''], 'dummy.txt', { type: 'text/plain' });
      return navigator.canShare({ files: [dummyFile] });
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Get Ace editor options
 */
export function getEditorOptions(): Partial<Ace.EditorOptions> {
  return {
    readOnly: true,
    wrap: false,
    showPrintMargin: false,
    fontSize: '13px',
    useWorker: false,
    highlightActiveLine: false,
  };
}
