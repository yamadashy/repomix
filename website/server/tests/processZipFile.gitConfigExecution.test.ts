import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
import { runDefaultAction } from 'repomix';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { processZipFile } from '../src/domains/pack/processZipFile.js';

// GHSA-j7x8, second vector. repomix orders output by git change frequency
// (output.git.sortByChanges defaults on), which runs `git log` against the pack
// directory. git trusts a repository's own .git/config, so an uploaded .git can
// turn that ordering pass into command execution — independent of the config
// loader that skipLocalConfig closes. The fix drops `.git/**` during extraction.
//
// Nothing is mocked: a real malicious git repo is built, zipped, and pushed
// through the real pack pipeline, so this fails if the guarantee is lost
// anywhere along the chain.

// A repository whose own config runs `markerPath`'s writer when git verifies a
// signature, plus a commit crafted with a gpgsig header so a signature exists to
// verify. `git log` alone then executes gpg.program.
const buildMaliciousGitRepo = async (repoDir: string, markerPath: string): Promise<void> => {
  const git = (...args: string[]) => execFileSync('git', ['-C', repoDir, ...args], { stdio: 'pipe' });
  await fs.mkdir(repoDir, { recursive: true });
  execFileSync('git', ['init', '-q', repoDir], { stdio: 'pipe' });
  git('config', 'user.email', 'a@b.c');
  git('config', 'user.name', 'a');
  await fs.writeFile(path.join(repoDir, 'f.txt'), 'hi\n');
  git('add', 'f.txt');
  git('commit', '-q', '-m', 'init');
  const tree = git('write-tree').toString().trim();

  const payload = path.join(repoDir, 'pwn.sh');
  await fs.writeFile(payload, `#!/bin/sh\ntouch ${markerPath}\necho '[GNUPG:] GOODSIG fake' 1>&2\nexit 0\n`);
  await fs.chmod(payload, 0o755);
  await fs.appendFile(
    path.join(repoDir, '.git', 'config'),
    `\n[log]\n\tshowSignature = true\n[gpg]\n\tprogram = ${payload}\n`,
  );

  const raw =
    `tree ${tree}\n` +
    'author a <a@b.c> 1700000000 +0000\n' +
    'committer a <a@b.c> 1700000000 +0000\n' +
    'gpgsig -----BEGIN PGP SIGNATURE-----\n \n fake\n -----END PGP SIGNATURE-----\n\nsigned\n';
  const rawPath = path.join(repoDir, 'rawc');
  await fs.writeFile(rawPath, raw);
  const commit = execFileSync('git', ['-C', repoDir, 'hash-object', '-t', 'commit', '-w', 'rawc']).toString().trim();
  git('update-ref', 'refs/heads/main', commit);
  git('symbolic-ref', 'HEAD', 'refs/heads/main');
  await fs.rm(rawPath, { force: true });
};

const zipDirectoryToFile = async (dir: string, name: string): Promise<File> => {
  const entries: Record<string, Uint8Array> = {};
  const walk = async (current: string, base: string): Promise<void> => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const rel = path.join(base, entry.name);
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        entries[rel] = new Uint8Array(await fs.readFile(full));
      }
    }
  };
  await walk(dir, '');
  return new File([zipSync(entries)], name, { type: 'application/zip' });
};

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

describe('processZipFile — an uploaded .git never drives git execution', () => {
  let workDir: string;
  let markerPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-zip-git-test-'));
    process.chdir(workDir);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(workDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    markerPath = path.join(workDir, `marker-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(async () => {
    await fs.rm(markerPath, { force: true });
  });

  test('packs an archive containing a malicious .git without running git against it', async () => {
    const repoDir = await fs.mkdtemp(path.join(workDir, 'repo-'));
    await buildMaliciousGitRepo(repoDir, markerPath);
    const file = await zipDirectoryToFile(repoDir, 'repo.zip');

    const { result } = await processZipFile(file, 'plain', {});

    expect(await exists(markerPath)).toBe(false);
    // The upload still packs — the .git is dropped, not the whole archive.
    expect(result.content).toContain('f.txt');
  });

  test('the same repo does execute when git runs against it directly', async () => {
    // Positive control: proves the payload is live and the git-sort path reaches
    // it, so the assertion above is testing the strip and not a payload that
    // quietly stopped working.
    const repoDir = await fs.mkdtemp(path.join(workDir, 'control-'));
    await buildMaliciousGitRepo(repoDir, markerPath);

    await runDefaultAction([repoDir], repoDir, {
      output: path.join(workDir, 'control-out.txt'),
      style: 'plain',
      securityCheck: true,
      quiet: true,
      skipLocalConfig: true, // isolate the git vector from the config-loader one
    });

    expect(await exists(markerPath)).toBe(true);
  });
});
