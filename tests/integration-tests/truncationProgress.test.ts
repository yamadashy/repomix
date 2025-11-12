import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Truncation Progress Integration Tests', () => {
  const testDir = join(tmpdir(), 'repomix-truncation-test');
  const outputFile = join(testDir, 'output.xml');

  beforeAll(async () => {
    // Create test directory structure
    await execa('mkdir', ['-p', testDir]);

    // Create test files with different line counts
    await execa('sh', [
      '-c',
      `cat > ${join(testDir, 'small.js')} << 'EOF'
console.log('small file');
console.log('only 5 lines');
console.log('should not be truncated');
console.log('when limit is 50');
console.log('lines');
EOF`,
    ]);

    await execa('sh', [
      '-c',
      `cat > ${join(testDir, 'large.js')} << 'EOF'
${'console.log("line " + i + "");'.repeat(100)}
EOF`,
    ]);

    await execa('sh', [
      '-c',
      `cat > ${join(testDir, 'medium.js')} << 'EOF'
${'console.log("line " + i + "");'.repeat(60)}
EOF`,
    ]);
  });

  afterAll(() => {
    // Clean up test directory
    try {
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
      execa('rm', ['-rf', testDir]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should show truncation progress during processing', async () => {
    const { stdout, stderr } = await execa(
      'npm',
      ['run', 'repomix', '--', '--line', '50', '--verbose', '--output', outputFile, testDir],
      {
        cwd: process.cwd(),
      },
    );

    expect(stderr).toBe('');

    // Should contain truncation progress messages
    expect(stdout).toContain('Processing files...');
    expect(stdout).toContain('truncated');

    // Should contain truncation summary
    expect(stdout).toContain('Truncation Summary:');
    expect(stdout).toContain('Applied line limit: 50 lines per file');

    // Should contain verbose truncation details
    expect(stdout).toContain('Truncation Details (Verbose):');
    expect(stdout).toContain('large.js:');
    expect(stdout).toContain('truncated');
    expect(stdout).toContain('small.js:');
    expect(stdout).toContain('unchanged');
  });

  it('should include truncation indicators in token tree', async () => {
    const { stdout, stderr } = await execa(
      'npm',
      ['run', 'repomix', '--', '--line', '50', '--token-count-tree', '--output', outputFile, testDir],
      {
        cwd: process.cwd(),
      },
    );

    expect(stderr).toBe('');

    // Should show token count tree with truncation indicators
    expect(stdout).toContain('Token Count Tree:');
    expect(stdout).toContain('[T]'); // Truncation indicator
    expect(stdout).toContain('large.js'); // Should be marked as truncated
  });

  it('should generate correct truncation statistics', async () => {
    const { stdout, stderr } = await execa(
      'npm',
      ['run', 'repomix', '--', '--line', '50', '--output', outputFile, testDir],
      {
        cwd: process.cwd(),
      },
    );

    expect(stderr).toBe('');

    // Should show correct statistics
    expect(stdout).toContain('Processed 3 files');
    expect(stdout).toContain('truncated');
    expect(stdout).toContain('unchanged');
    expect(stdout).toContain('Total lines reduced:');
    expect(stdout).toContain('% reduction');
  });

  it('should not show truncation info when line limit is not applied', async () => {
    const { stdout, stderr } = await execa('npm', ['run', 'repomix', '--', '--output', outputFile, testDir], {
      cwd: process.cwd(),
    });

    expect(stderr).toBe('');

    // Should not contain truncation information
    expect(stdout).not.toContain('Truncation Summary:');
    expect(stdout).not.toContain('Applied line limit:');
    expect(stdout).not.toContain('[T]');
  });

  it('should handle progress bar correctly', async () => {
    const { stdout, stderr } = await execa(
      'npm',
      ['run', 'repomix', '--', '--line', '50', '--output', outputFile, testDir],
      {
        cwd: process.cwd(),
      },
    );

    expect(stderr).toBe('');

    // Should show progress bar
    expect(stdout).toMatch(/Processing files\.\.\. \[█+░+\]\s+\d+%/);
  });
});
