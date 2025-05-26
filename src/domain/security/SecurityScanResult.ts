/**
 * Result of security scanning a repository
 */
export interface SecurityScanResult {
  /**
   * List of suspicious files with security issues
   */
  suspiciousFiles: SuspiciousFile[];

  /**
   * List of suspicious git diffs with security issues
   */
  suspiciousGitDiffs: SuspiciousFile[];
}

/**
 * Represents a file with security issues
 */
export interface SuspiciousFile {
  /**
   * Path to the suspicious file
   */
  filePath: string;

  /**
   * Security issue messages
   */
  messages: string[];

  /**
   * Type of security check that found the issue
   */
  type: SecurityCheckType;
}

/**
 * Types of security checks
 */
export type SecurityCheckType = 'file' | 'gitDiff';
