import os from 'node:os';
import path from 'node:path';

// Disable the token-count disk cache by default for the entire test suite so
// that (a) test runs do not read or write the developer's real cache file in
// $TMPDIR and (b) tests asserting on worker dispatch behavior are not skewed
// by entries left behind by a previous run. Tests that exercise the cache
// directly explicitly clear this variable in their own setup.
if (process.env.REPOMIX_TOKEN_CACHE === undefined) {
  process.env.REPOMIX_TOKEN_CACHE = '0';
}

// Redirect the BPE-ranks disk cache to an isolated per-process temp directory so
// any test that re-enables the cache (by clearing REPOMIX_TOKEN_CACHE) never
// touches the developer's real $TMPDIR/repomix cache. Tests that exercise the
// cache directly override this with their own temp dir.
if (process.env.REPOMIX_BPE_RANKS_CACHE_PATH === undefined) {
  process.env.REPOMIX_BPE_RANKS_CACHE_PATH = path.join(os.tmpdir(), `repomix-test-bpe-ranks-${process.pid}`);
}
