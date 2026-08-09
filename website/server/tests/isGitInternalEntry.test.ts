import { describe, expect, test } from 'vitest';
import { isGitInternalEntry } from '../src/domains/pack/processZipFile.js';

// The end-to-end .git RCE test can only exercise the '/' form: a `.git\config`
// entry is a harmless literal filename on the Linux test/deploy host and never
// forms a repository there, so it cannot drive execution to assert against.
// This covers the predicate directly instead, including the Windows-separator
// case a crafted archive can carry.
describe('isGitInternalEntry', () => {
  test.each([
    '.git',
    '.git/config',
    '.git/hooks/pre-commit',
    'sub/.git/config',
    '.git\\config',
    'sub\\.git\\config',
    'sub/.git\\config',
  ])('treats %j as git-internal', (entry) => {
    expect(isGitInternalEntry(entry)).toBe(true);
  });

  test.each([
    'README.md',
    'src/index.ts',
    '.gitignore',
    '.github/workflows/ci.yml',
    'a.git',
    'git/config',
  ])('leaves %j alone', (entry) => {
    expect(isGitInternalEntry(entry)).toBe(false);
  });
});
