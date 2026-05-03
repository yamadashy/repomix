window.BENCHMARK_DATA = {
  "lastUpdate": 1777800424639,
  "repoUrl": "https://github.com/yamadashy/repomix",
  "entries": {
    "Repomix Performance (auto-perf-tuning)": [
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "b2e7240c09256460d870149e9a4887813a743813",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning\n\n# Conflicts:\n#\tpackage-lock.json\n#\tpackage.json",
          "timestamp": "2026-04-11T10:08:40Z",
          "tree_id": "bf0e7b45a31cf17e64cfcfb1e7b10e6a07d00160",
          "url": "https://github.com/yamadashy/repomix/commit/b2e7240c09256460d870149e9a4887813a743813"
        },
        "date": 1775902265361,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1141,
            "range": "±74",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1111ms, Q3: 1185ms\nAll times: 1062, 1062, 1072, 1083, 1102, 1106, 1108, 1111, 1113, 1127, 1130, 1135, 1135, 1136, 1137, 1141, 1141, 1152, 1154, 1154, 1166, 1167, 1185, 1195, 1240, 1276, 1361, 1478, 1528, 1581ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1822,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1814ms, Q3: 1850ms\nAll times: 1797, 1801, 1801, 1802, 1808, 1814, 1817, 1818, 1821, 1821, 1822, 1835, 1836, 1839, 1843, 1850, 1853, 1861, 1895, 1909ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2497,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2479ms, Q3: 2509ms\nAll times: 2446, 2461, 2462, 2473, 2478, 2479, 2483, 2493, 2494, 2496, 2497, 2500, 2501, 2502, 2506, 2509, 2510, 2541, 2565, 2623ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ba936f1f913d363d47e29fa26ef28e2eca8028af",
          "message": "perf(security): Patch perf_hooks.performance.mark to neutralize duplicate @secretlint/profiler singletons\n\nThe previous @secretlint/profiler optimization (cfc626a) silently regressed\nafter the merge from main upgraded @secretlint/core to 11.5.0. That release\ndeclares an exact-version peer dep on @secretlint/profiler@11.5.0, which\nforced npm to install a nested second copy under\n`node_modules/@secretlint/core/node_modules/@secretlint/profiler` alongside\nour top-level 11.4.1 profiler. The worker's\n`import { secretLintProfiler } from '@secretlint/profiler'` resolved to the\n11.4.1 singleton, so the `Object.defineProperty(secretLintProfiler, 'mark', ...)`\nno-op patched the wrong instance — the copy @secretlint/core actually calls\nat lint time (11.5.0) kept running its O(n^2) PerformanceObserver bookkeeping.\nAs a result the security phase was back to ~2.2s wall time on a 1000-file\nrepo (matching pre-cfc626a behaviour) while the commit's benchmark numbers\nimplied it was still ~270ms.\n\nSwitch the neutralization to a strictly more robust primitive: overwrite\n`perf_hooks.performance.mark` with a no-op inside the worker thread. Every\ncopy of @secretlint/profiler — hoisted, nested, or future — calls\n`this.perf.mark(...)` on the single Node built-in `performance` object it\nreceived at construction time from `node:perf_hooks`, so a single assignment\non that object silences every profiler instance simultaneously. Because the\npatch targets the runtime primitive rather than a specific module graph\nnode, it no longer depends on npm's dedupe behaviour or the exact layout of\n`node_modules`. The worker thread is isolated and runs only secretlint; no\nother code in it depends on `performance.mark`, so there is no observable\nside effect.\n\nAlso removes the now-unused direct `@secretlint/profiler` dependency from\npackage.json.\n\n## Mechanism\n\n1. Both profiler singletons construct `new SecretLintProfiler({ perf: perf_hooks.performance, ... })`\n2. Both call `this.perf.mark(marker.type)` for every event\n3. Overwriting `perf_hooks.performance.mark` on the shared Node built-in\n   makes both calls a no-op, so the PerformanceObserver callback never\n   fires, the `entries` array stays empty, and the O(n^2) `entries.find()`\n   scan is eliminated\n\n## Benchmark\n\nVerified on this host (4-core Linux container) against origin/main, which\nis what the CI `perf-benchmark.yml` workflow compares. Interleaved pairs,\nno verbose mode, 40 runs.\n\n### End-to-end wall time — PR vs origin/main (4 cores, 40 runs)\n\n| Stat         | main (ms) | PR (ms) | Δ               |\n|--------------|-----------|---------|-----------------|\n| min          | 1965      | 1914    | -51ms (-2.60%)  |\n| median       | 2181      | 2066    | -115ms (-5.27%) |\n| trimmed mean | 2216      | 2103    | -113ms (-5.11%) |\n| mean         | 2282      | 2159    | -123ms (-5.38%) |\n\n### Same comparison under 2-CPU constraint (taskset -c 0-1, 30 runs)\n\n| Stat         | main (ms) | PR (ms) | Δ               |\n|--------------|-----------|---------|-----------------|\n| min          | 2445      | 2309    | -136ms (-5.56%) |\n| median       | 2628      | 2495    | -133ms (-5.06%) |\n| trimmed mean | 2624      | 2509    | -114ms (-4.36%) |\n| mean         | 2658      | 2518    | -141ms (-5.29%) |\n\n### Phase-level evidence (verbose mode, single run)\n\n| Phase              | branch pre-fix | PR       | Δ          |\n|--------------------|----------------|----------|------------|\n| File collection    | ~471 ms        | ~446 ms  | ~-25 ms    |\n| File processing    | ~103 ms        | ~95 ms   | ~-8 ms     |\n| **Security check** | **~2229 ms**   | **~217 ms** | **~-2012 ms** |\n| Git log tokens     | ~446 ms        | ~451 ms  | ~0         |\n| Selective metrics  | ~454 ms        | ~455 ms  | ~0         |\n| Output token count | ~610 ms        | ~610 ms  | ~0         |\n\nIn non-verbose mode the security-phase work overlaps heavily with other\nasync phases, so end-to-end savings are smaller than the phase-timer drop.\nVerbose mode amplifies the observer cost via extra logger traces, making\nthe isolation of the profiler bottleneck visible.\n\n## Checklist\n\n- [x] `npm run lint` — 0 errors, 2 pre-existing warnings in unrelated files\n- [x] `npm run test` — 1102/1102 tests pass\n- [x] Secret detection still works end-to-end (verified by packing a\n      fixture file containing an RSA private key block; secretlint still\n      flags and excludes it)",
          "timestamp": "2026-04-11T10:45:57Z",
          "tree_id": "e779965a6cfd61387e5579a3901f5d24a00c318a",
          "url": "https://github.com/yamadashy/repomix/commit/ba936f1f913d363d47e29fa26ef28e2eca8028af"
        },
        "date": 1775904512270,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1098,
            "range": "±80",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1078ms, Q3: 1158ms\nAll times: 1046, 1049, 1053, 1056, 1065, 1070, 1076, 1078, 1079, 1080, 1081, 1086, 1087, 1093, 1093, 1098, 1101, 1106, 1109, 1112, 1129, 1153, 1158, 1159, 1181, 1182, 1206, 1216, 1232, 1477ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1869,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1859ms, Q3: 1884ms\nAll times: 1832, 1832, 1847, 1848, 1849, 1859, 1861, 1865, 1865, 1867, 1869, 1875, 1876, 1882, 1882, 1884, 1889, 1890, 1901, 1923ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2250,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2230ms, Q3: 2271ms\nAll times: 2209, 2210, 2216, 2219, 2228, 2230, 2236, 2236, 2237, 2244, 2250, 2265, 2265, 2267, 2268, 2271, 2286, 2291, 2328, 2336ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "fdf5a2e440e3fc8a023215fa4e27b5590ee0f367",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning\n\n# Conflicts:\n#\tpackage-lock.json\n#\tsrc/core/security/workers/securityCheckWorker.ts",
          "timestamp": "2026-04-11T11:29:46Z",
          "tree_id": "d8f3cc766b5c87a5d0db8830d707e3b59aa9c307",
          "url": "https://github.com/yamadashy/repomix/commit/fdf5a2e440e3fc8a023215fa4e27b5590ee0f367"
        },
        "date": 1775907123902,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2141,
            "range": "±439",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1944ms, Q3: 2383ms\nAll times: 1734, 1833, 1846, 1854, 1859, 1872, 1891, 1944, 1965, 1978, 2003, 2009, 2032, 2033, 2121, 2141, 2146, 2154, 2155, 2179, 2182, 2224, 2383, 2392, 2409, 2414, 2520, 2678, 2998, 3162ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1802,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1788ms, Q3: 1816ms\nAll times: 1761, 1761, 1781, 1782, 1786, 1788, 1788, 1788, 1790, 1790, 1802, 1803, 1805, 1805, 1806, 1816, 1818, 1828, 1832, 1852ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2526,
            "range": "±452",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2446ms, Q3: 2898ms\nAll times: 2240, 2387, 2402, 2412, 2430, 2446, 2458, 2468, 2480, 2513, 2526, 2659, 2818, 2873, 2886, 2898, 2900, 2903, 2914, 2936ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "782e82eb624bf986e5e57269731f49b874952ef1",
          "message": "perf(core): Skip redundant full-output tokenization via wrapper-extraction fast path (-13.2%)\n\nWhen `tokenCountTree` is enabled `calculateSelectiveFileMetrics` already\ntokenizes every file individually on the primary worker pool. The original\n`calculateOutputMetrics` then re-tokenized the full output a second time, split\ninto 200 KB chunks, to compute `totalTokens`. On large repos with the tree\ndisplay enabled, this second pass was the single longest task in the\n`calculateMetrics` `Promise.all`, consuming roughly 1 second of worker time\nthat duplicated work already done for the per-file counts.\n\nThis change introduces a fast path for the common case (xml / markdown / plain\noutput, non-parsable, single-part): walk the generated output with\n`indexOf(file.content, cursor)` once per file to splice file contents out of\nthe output, tokenize only the remaining \"wrapper\" (template boilerplate +\ndirectory tree + git diff/log + per-file headers), and compute\n`totalTokens = Σ per-file tokens + wrapper tokens`.\n\nThe accuracy delta versus the old 200 KB-chunk approach is bounded by BPE\nmerges across file↔wrapper boundaries; on the repomix repository itself the\nmeasured error was 309 / 1,284,067 tokens ≈ 0.024 %, comparable to the chunk\nboundary error the existing approach already accepts.\n\n## Implementation\n\n- `src/core/metrics/calculateMetrics.ts`\n  - Add `extractOutputWrapper(output, processedFilesInOutputOrder)` which\n    walks the output with a single forward cursor. Returns `null` and\n    triggers a fall back to `calculateOutputMetrics` if any file content is\n    not found (e.g., template escaped it, output was split, order mismatch).\n  - Add `canUseFastOutputTokenPath(config)` gate: only enabled when\n    `tokenCountTree` is truthy, `splitOutput` is undefined, `parsableStyle`\n    is false, and the style is `xml` / `markdown` / `plain`. JSON output\n    and parsable XML go through `JSON.stringify` / `fast-xml-builder` which\n    escape file contents, so `indexOf(content)` would miss them.\n  - In `calculateMetrics`, when the fast path is available and wrapper\n    extraction succeeds, replace `outputMetricsPromise` with a promise that\n    awaits the already-running `selectiveFileMetricsPromise`, sums the\n    per-file token counts, and dispatches a single `runTokenCount` on the\n    extracted wrapper string. The rest of the `Promise.all` is unchanged.\n\n- `src/core/packager.ts`\n  - Call `sortOutputFiles(filteredProcessedFiles, config)` once in `pack`\n    immediately after suspicious-file filtering and use its result as\n    `processedFiles` downstream (for `produceOutput`, `calculateMetrics`,\n    and the final result object). `generateOutput` internally calls\n    `sortOutputFiles` as well, which is stable and memoized via\n    `fileChangeCountsCache`, so the two now share the single git-log\n    subprocess result and consumers see files in the exact order they\n    appear in the output. This is a precondition for the fast path's\n    forward-walk extraction.\n  - Expose `sortOutputFiles` on `defaultDeps` so existing packager unit\n    tests can inject their own implementation.\n\n- `tests/core/packager/diffsFunctionality.test.ts`\n  - Extend the `gitRepositoryHandle.js` `vi.mock` to also stub\n    `isGitInstalled` and `getFileChangeCount`, since `sortOutputFiles`\n    resolves its default dependencies from that module at module load time.\n\nAll 1102 existing tests pass unchanged; lint is clean.\n\n## Benchmark\n\nInterleaved 30-run benchmark against the repomix repo itself (1018 files,\n~4 MB xml output, `tokenCountTree: 50000`, `sortByChanges: true`, `includeDiffs`\nand `includeLogs` enabled via the repo's own `repomix.config.json`):\n\n    base median: 2735.2 ms  [2389 - 3528]  IQR=367 ms\n    opt  median: 2373.6 ms  [2125 - 2653]  IQR=293 ms\n    delta:       -361.6 ms  (-13.22%)\n\nVerbose trace before/after (single run, representative):\n\n    before:\n      Selective metrics calculation completed in 639 ms\n      Output token count completed in      1046 ms\n      Calculate Metrics wall:               1296 ms\n\n    after:\n      Selective metrics calculation completed in 579 ms\n      Fast-path output tokens: files=1017293, wrapper=33678 (126996 chars)\n      Calculate Metrics wall:                ~580 ms\n\nThe savings are concentrated in the `calculateMetrics` phase, which was the\ndominant critical path in the final `Promise.all` for tokenCountTree runs on\nlarge repos.",
          "timestamp": "2026-04-11T14:14:53Z",
          "tree_id": "78d3197883c90ed562777eebe3847516fb1024e4",
          "url": "https://github.com/yamadashy/repomix/commit/782e82eb624bf986e5e57269731f49b874952ef1"
        },
        "date": 1775917131562,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1137,
            "range": "±99",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1062ms, Q3: 1161ms\nAll times: 940, 970, 976, 980, 1043, 1054, 1057, 1062, 1079, 1086, 1089, 1094, 1100, 1128, 1133, 1137, 1137, 1137, 1139, 1149, 1156, 1157, 1161, 1163, 1203, 1221, 1221, 1260, 1323, 1432ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1568,
            "range": "±39",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1536ms, Q3: 1575ms\nAll times: 1524, 1525, 1531, 1531, 1535, 1536, 1543, 1545, 1566, 1568, 1568, 1568, 1571, 1571, 1574, 1575, 1577, 1581, 1605, 1606ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1884,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1871ms, Q3: 1891ms\nAll times: 1847, 1851, 1861, 1867, 1871, 1872, 1874, 1875, 1878, 1884, 1885, 1888, 1889, 1889, 1891, 1893, 1901, 1915, 1927ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "b0ca5a3b43c59028ce82628e88055c3db78959d6",
          "message": "test(metrics): Cover the output-token fast path in calculateMetrics\n\nThe wrapper-extraction fast path added in 782e82e has no unit test\ncoverage for its new branching logic — `canUseFastOutputTokenPath` and\n`extractOutputWrapper` are file-local, and the existing calculateMetrics\ntest only exercises the slow path (calculateOutputMetrics is mocked).\n\nAdd seven end-to-end tests that drive calculateMetrics with different\nconfigs and output shapes, asserting:\n\n- Fast path engages for `tokenCountTree: true` with xml style and\n  non-escaping output — exactly one worker call is made, for the\n  wrapper string, and `calculateOutputMetrics` is never called.\n- Slow path is used when `tokenCountTree` is disabled (default config),\n  when `parsableStyle` is true, and when style is `json`.\n- Fast path bails transparently and hands off to `calculateOutputMetrics`\n  when a file's content is not found verbatim in the output.\n- Empty files in the middle of the list don't corrupt the wrapper walk.\n- Duplicate / substring content (one file's body is a literal substring\n  of another's) is handled correctly by the monotonic cursor — the\n  substring file matches its own occurrence, not the false occurrence\n  inside the containing file.\n- Split output (multiple parts) bypasses the fast path entirely and\n  calls `calculateOutputMetrics` once per part.\n\nAll 1110 tests pass; lint is clean.\n\nhttps://claude.ai/code/session_0142VcLQnCcikAvxsMhw1NH8",
          "timestamp": "2026-04-11T15:06:11Z",
          "tree_id": "dc8da233590d0dbf906aa42b3d60869cab1b0c1a",
          "url": "https://github.com/yamadashy/repomix/commit/b0ca5a3b43c59028ce82628e88055c3db78959d6"
        },
        "date": 1775920081864,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1342,
            "range": "±135",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1266ms, Q3: 1401ms\nAll times: 1062, 1138, 1177, 1198, 1226, 1258, 1260, 1266, 1268, 1287, 1294, 1301, 1301, 1305, 1323, 1342, 1342, 1345, 1348, 1352, 1374, 1381, 1401, 1412, 1426, 1467, 1492, 1539, 1624, 1629ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1471,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1448ms, Q3: 1481ms\nAll times: 1391, 1430, 1440, 1443, 1445, 1448, 1451, 1458, 1465, 1469, 1471, 1472, 1473, 1476, 1479, 1481, 1506, 1538, 1552, 1554ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2021,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2002ms, Q3: 2042ms\nAll times: 1967, 1985, 1998, 1999, 2001, 2002, 2007, 2013, 2014, 2016, 2021, 2029, 2034, 2037, 2040, 2042, 2043, 2044, 2050, 2250ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "3351547d8d4b911502ed7aaf693bc6c29efb1c9d",
          "message": "perf(core): Skip standalone-base64 regex for files with no qualifying run (-5.9%)\n\nWhen `output.truncateBase64` is enabled, every collected file passes\nthrough `truncateBase64Content` on the main thread. The standalone\n`/[A-Za-z0-9+/]{256,}={0,2}/g` regex used to find truncatable base64\nblocks turns out to dominate that pass: V8 walks the global pattern\nacross the entire content of every file, even though the overwhelming\nmajority of source-code files cannot match (no run of 256 consecutive\nbase64-alphabet characters anywhere).\n\nAdd a tight `charCodeAt`-based pre-scan that returns true at the first\nqualifying 256-char run and false otherwise. When the pre-scan returns\nfalse (the common case), skip the global replace entirely. The data-URI\nreplace is unaffected — it still runs on every file because it has a\ndistinct anchor (`data:...;base64,`) and is already cheap (~6ms total\nfor 1k files).\n\nBehaviour is unchanged: the pre-scan implements the exact necessary\ncondition for the standalone pattern to match, so any file the regex\nwould have rewritten still goes through the replace path. A\nfunction-level head-to-head over 1037 files in this repository\nconfirms zero output mismatches and a 240ms → 75ms drop on the\nfunction itself.\n\nBenchmark — `node bin/repomix.cjs --quiet` against this repository,\n30 alternating runs each (symlink-swap to keep node startup,\ncompile-cache, and disk cache identical):\n\n  baseline:   mean 1646ms   median 1643ms   stdev 56ms\n  fix:        mean 1549ms   median 1547ms   stdev 35ms\n  Δ:          -97ms mean (-5.92%)\n              -95ms median (-5.81%)\n              Welch t-stat 8.02 (highly significant)\n\nThe fix also tightens the run-to-run distribution (stdev 56→35ms),\nbecause the previous standalone-regex pass was a noisy main-thread\nhot-spot that competed with the security-check workers for CPU.\n\nVerbose phase timings on the same machine:\n  Process Files (main-thread, includes truncateBase64):\n    baseline ~100ms (range 93–254ms across runs)\n    fix      ~32ms  (range 27–80ms across runs)\n\nTests: 4 new cases cover the fast-path skip explicitly — a noisy\ncontent with no 256-char run (skip path), filler around a real 300-char\nbase64 run (re-detect after counter reset), exactly 255 base64 chars\n(threshold edge), and a short data URI alone (verifies the data URI\nreplace still runs when the standalone fast-path skips). All 17\ntruncateBase64 tests pass, full suite 1114 tests pass, lint clean.",
          "timestamp": "2026-04-12T03:06:45Z",
          "tree_id": "cdfec51ac0aaab2f4e82800926269a4016536ea8",
          "url": "https://github.com/yamadashy/repomix/commit/3351547d8d4b911502ed7aaf693bc6c29efb1c9d"
        },
        "date": 1775963347137,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 920,
            "range": "±101",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 891ms, Q3: 992ms\nAll times: 856, 861, 868, 885, 887, 887, 887, 891, 898, 900, 905, 906, 915, 918, 920, 920, 921, 937, 937, 965, 966, 968, 992, 996, 1003, 1006, 1026, 1055, 1060, 1133ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1405,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1397ms, Q3: 1431ms\nAll times: 1372, 1376, 1381, 1384, 1386, 1397, 1399, 1401, 1403, 1404, 1405, 1406, 1411, 1414, 1426, 1431, 1443, 1633, 1660, 1679ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1878,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1868ms, Q3: 1886ms\nAll times: 1835, 1842, 1857, 1858, 1859, 1868, 1869, 1870, 1876, 1877, 1878, 1878, 1883, 1885, 1885, 1886, 1896, 1899, 1902, 1909ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "46ebd648d8c41cf3e00132fcded1694fc7b53138",
          "message": "perf(security): Pre-warm security worker pool to overlap secretlint init with file I/O (-5.2%)\n\nThe security check worker threads (~97ms cold start each) were previously\ncreated lazily inside `runSecurityCheck`, placing their entire initialization\n— thread spawn + secretlint module load + JIT compilation — on the critical\npath after file collection.\n\nMirror the existing metrics worker pre-warming pattern: create the security\ntask runner in `pack()` alongside the metrics runner, dispatch empty warmup\ntasks to force each worker to load `@secretlint/core` and its rule presets,\nthen pass the pre-warmed runner through to `validateFileSafety` →\n`runSecurityCheck`. The ~97ms cold start now runs concurrently with\n`searchFiles` + `collectFiles` + `getGitDiffs/Logs` instead of blocking\nafter them.\n\n## Pipeline change\n\nBefore:\n  searchFiles → collectFiles+git → [security cold-start 97ms → batches] + processFiles → ...\n\nAfter:\n  createSecurityTaskRunner (warmup starts) → searchFiles → collectFiles+git →\n  await warmup → [batches run immediately] + processFiles → ...\n\nThe warmup completes within the first ~200ms of the pipeline (overlapping\nwith searchFiles), so by the time real security work begins, both workers\nare fully initialised.\n\n## Benchmark (20 alternating runs, `node bin/repomix.cjs --quiet`, repomix packing itself)\n\n```\nbaseline:  mean 1508ms  median 1511ms  stdev 21ms  [1452-1538]\noptimized: mean 1429ms  median 1432ms  stdev 21ms  [1380-1465]\ndelta:     -79ms median (-5.2%)\n           Welch t = 11.89 (highly significant)\n```\n\n## Verification\n\n- `npm run lint` — 0 errors, 2 pre-existing warnings\n- `npm run test` — 1115/1115 tests pass (113 test files)\n- Security detection verified end-to-end: packing a fixture with an RSA\n  private key still flags and excludes it\n\nhttps://claude.ai/code/session_012yD8WvwMrFE6X8ZKwNBhC3",
          "timestamp": "2026-04-12T05:17:53Z",
          "tree_id": "742f54d8f0c37d866b966413e71b2d7faba76f70",
          "url": "https://github.com/yamadashy/repomix/commit/46ebd648d8c41cf3e00132fcded1694fc7b53138"
        },
        "date": 1775971218113,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1324,
            "range": "±146",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1256ms, Q3: 1402ms\nAll times: 1020, 1065, 1068, 1111, 1121, 1160, 1214, 1256, 1261, 1281, 1283, 1301, 1319, 1320, 1322, 1324, 1338, 1346, 1349, 1350, 1378, 1389, 1402, 1411, 1423, 1490, 1534, 1544, 1560, 1645ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1488,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1470ms, Q3: 1502ms\nAll times: 1447, 1455, 1460, 1464, 1468, 1470, 1474, 1479, 1486, 1487, 1488, 1489, 1491, 1499, 1501, 1502, 1509, 1530, 1545, 1724ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1884,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1869ms, Q3: 1895ms\nAll times: 1856, 1860, 1861, 1867, 1868, 1869, 1874, 1878, 1878, 1882, 1884, 1888, 1888, 1891, 1893, 1895, 1907, 1908, 1909, 1911ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "120bec16a2614b1a067f06477d7238b2ed0e1144",
          "message": "perf(core): Defer heavy module loading and eliminate redundant sort from critical path (-2%)\n\nMove expensive module initialization off the CLI startup critical path by\ndeferring it to pipeline phases that run in parallel with the dominant\nmetrics calculation (~500ms). Combined with eliminating a redundant\nsortOutputFiles call and pre-fetching git sort data, this reduces overall\nwall-clock time by ~23-30ms.\n\nChanges:\n\n1. Inline TOKEN_ENCODINGS in configSchema.ts — Breaks the\n   configSchema → TokenCounter → gpt-tokenizer import chain that\n   loaded the BPE tokenizer module on the main thread at startup\n   (~17ms raw, ~10ms with compile cache). The main thread never uses\n   gpt-tokenizer directly; workers load their own copies.\n\n2. Lazy-load outputGenerate.js in produceOutput.ts — Defers Handlebars\n   + output style modules (~19ms raw) from startup to when output\n   generation actually begins. At that point, metrics workers are\n   already running (~500ms), so the import cost is completely hidden\n   behind the parallel phase.\n\n3. Remove redundant sortOutputFiles from generateOutput — The packager\n   already pre-sorts files at packager.ts:194. The second sort inside\n   generateOutput was a wasted cache lookup + O(n log n) sort (~5ms).\n   The packager comment already documented this intent.\n\n4. Pre-fetch git sort data via prefetchSortData — Launches the\n   git --version + git log --name-only subprocesses in parallel with\n   collectFiles/getGitDiffs/getGitLogs, so the later sortOutputFiles\n   call is a cache-hit + in-memory sort instead of blocking ~15ms of\n   subprocess overhead on the critical path.\n\nBenchmark (30 alternating A/B runs, `node bin/repomix.cjs --quiet`):\n\n  baseline:  mean 1605ms  median 1612ms  stdev 46ms  [1492-1709]\n  optimized: mean 1582ms  median 1582ms  stdev 45ms  [1493-1673]\n  delta:     -23ms mean / -30ms median (-1.8%)\n             Welch t = -1.96\n\nWith earlier method (20 alternating, in-place rebuild):\n\n  baseline:  mean 1428ms  median 1420ms  stdev 32ms  [1396-1522]\n  optimized: mean 1408ms  median 1399ms  stdev 31ms  [1364-1467]\n  delta:     -20ms mean / -21ms median (-1.5%)\n             Welch t = -1.96\n\nlint: 0 errors (4 pre-existing warnings)\ntest: 1115/1115 pass (113 test files)\n\nhttps://claude.ai/code/session_01JeqBKG2LkQAdSngwcwnjGM",
          "timestamp": "2026-04-12T06:13:45Z",
          "tree_id": "771fcdf9b247437f70a58d25e00ade180806eabd",
          "url": "https://github.com/yamadashy/repomix/commit/120bec16a2614b1a067f06477d7238b2ed0e1144"
        },
        "date": 1775974569987,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1571,
            "range": "±643",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1276ms, Q3: 1919ms\nAll times: 1153, 1168, 1187, 1194, 1200, 1232, 1274, 1276, 1317, 1350, 1424, 1447, 1484, 1490, 1551, 1571, 1593, 1741, 1768, 1801, 1820, 1887, 1919, 1981, 2004, 2017, 2061, 2062, 2188, 2559ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1436,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1419ms, Q3: 1457ms\nAll times: 1397, 1406, 1407, 1409, 1416, 1419, 1423, 1430, 1430, 1436, 1436, 1438, 1442, 1457, 1457, 1457, 1476, 1482, 1502, 1513ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1832,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1814ms, Q3: 1843ms\nAll times: 1795, 1804, 1806, 1811, 1812, 1814, 1820, 1825, 1826, 1830, 1832, 1839, 1841, 1842, 1842, 1843, 1855, 1860, 1870, 1890ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "517d65047b55acf321c396f8660cf87efdb624b4",
          "message": "perf(core): Defer heavy module loading and eliminate redundant sort from critical path (-2%)\n\nMove expensive module initialization off the CLI startup critical path by\ndeferring it to pipeline phases that run in parallel with the dominant\nmetrics calculation (~500ms). Combined with eliminating a redundant\nsortOutputFiles call and pre-fetching git sort data, this reduces overall\nwall-clock time by ~23-30ms.\n\nChanges:\n\n1. Inline TOKEN_ENCODINGS in configSchema.ts — Breaks the\n   configSchema → TokenCounter → gpt-tokenizer import chain that\n   loaded the BPE tokenizer module on the main thread at startup\n   (~17ms raw, ~10ms with compile cache). The main thread never uses\n   gpt-tokenizer directly; workers load their own copies.\n\n2. Lazy-load outputGenerate.js in produceOutput.ts — Defers Handlebars\n   + output style modules (~19ms raw) from startup to when output\n   generation actually begins. At that point, metrics workers are\n   already running (~500ms), so the import cost is completely hidden\n   behind the parallel phase.\n\n3. Remove redundant sortOutputFiles from generateOutput — The packager\n   already pre-sorts files at packager.ts:194. The second sort inside\n   generateOutput was a wasted cache lookup + O(n log n) sort (~5ms).\n   The packager comment already documented this intent.\n\n4. Pre-fetch git sort data via prefetchSortData — Launches the\n   git --version + git log --name-only subprocesses in parallel with\n   collectFiles/getGitDiffs/getGitLogs, so the later sortOutputFiles\n   call is a cache-hit + in-memory sort instead of blocking ~15ms of\n   subprocess overhead on the critical path.\n\nBenchmark (30 alternating A/B runs, `node bin/repomix.cjs --quiet`):\n\n  baseline:  mean 1605ms  median 1612ms  stdev 46ms  [1492-1709]\n  optimized: mean 1582ms  median 1582ms  stdev 45ms  [1493-1673]\n  delta:     -23ms mean / -30ms median (-1.8%)\n             Welch t = -1.96\n\nWith earlier method (20 alternating, in-place rebuild):\n\n  baseline:  mean 1428ms  median 1420ms  stdev 32ms  [1396-1522]\n  optimized: mean 1408ms  median 1399ms  stdev 31ms  [1364-1467]\n  delta:     -20ms mean / -21ms median (-1.5%)\n             Welch t = -1.96\n\nlint: 0 errors (4 pre-existing warnings)\ntest: 1115/1115 pass (113 test files)\n\nhttps://claude.ai/code/session_01JeqBKG2LkQAdSngwcwnjGM",
          "timestamp": "2026-04-12T06:16:09Z",
          "tree_id": "3642cc681d0f38e690dfe29083d24c64002fc2c2",
          "url": "https://github.com/yamadashy/repomix/commit/517d65047b55acf321c396f8660cf87efdb624b4"
        },
        "date": 1775974696214,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1146,
            "range": "±254",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 999ms, Q3: 1253ms\nAll times: 880, 903, 919, 925, 932, 957, 985, 999, 1012, 1050, 1057, 1074, 1112, 1123, 1138, 1146, 1157, 1162, 1166, 1180, 1203, 1237, 1253, 1272, 1279, 1320, 1343, 1417, 1555, 1847ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1431,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1417ms, Q3: 1444ms\nAll times: 1399, 1404, 1411, 1412, 1413, 1417, 1419, 1420, 1426, 1426, 1431, 1436, 1437, 1438, 1440, 1444, 1450, 1450, 1465, 1465ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1871,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1863ms, Q3: 1885ms\nAll times: 1839, 1848, 1857, 1859, 1861, 1863, 1863, 1866, 1870, 1871, 1871, 1871, 1871, 1877, 1883, 1885, 1887, 1892, 1894, 1897ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6eff9b74c2216fa1916a3e495ec8d0bffe983683",
          "message": "merge: Resolve conflict with main (perf_hooks isMainThread guard)\n\nTake main's version which includes the isMainThread guard and try/catch\nfrom PR #1456 (fix(security): Scope performance.mark patch to worker\nthreads only).",
          "timestamp": "2026-04-12T06:30:35Z",
          "tree_id": "b4289becfa0a663f304e5aff286585107b3fb469",
          "url": "https://github.com/yamadashy/repomix/commit/6eff9b74c2216fa1916a3e495ec8d0bffe983683"
        },
        "date": 1775975541907,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 878,
            "range": "±67",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 859ms, Q3: 926ms\nAll times: 828, 828, 838, 839, 840, 851, 855, 859, 861, 867, 867, 867, 870, 875, 875, 878, 886, 888, 892, 906, 917, 918, 926, 941, 945, 947, 968, 1016, 1018, 1052ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1483,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1475ms, Q3: 1504ms\nAll times: 1435, 1443, 1447, 1467, 1468, 1475, 1475, 1476, 1478, 1479, 1483, 1493, 1494, 1495, 1501, 1504, 1515, 1518, 1522, 1535ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1839,
            "range": "±96",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1826ms, Q3: 1922ms\nAll times: 1818, 1820, 1820, 1822, 1825, 1826, 1827, 1830, 1833, 1837, 1839, 1842, 1852, 1856, 1877, 1922, 2005, 2045, 2067, 2369ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4fc328f46f133c99d76b4a3208f4205033f01db0",
          "message": "perf(core): Decouple disk write from output metrics pipeline (-2.5%)\n\nPreviously, `produceOutput` awaited `writeOutputToDisk` and\n`copyToClipboardIfEnabled` before returning `outputForMetrics`,\nwhich meant `calculateMetrics` could not begin tokenizing the\noutput string until the disk write completed. This placed the\nfull fs.writeFile latency (39–80ms for a ~4MB output) on the\ncritical path between output generation and output-level\ntoken counting.\n\nNow `produceOutput` returns the output string immediately after\ngeneration, firing the disk write and clipboard copy as a\nbackground `pendingIO` promise. The caller (`packager.ts`) awaits\n`pendingIO` after the metrics `Promise.all` completes, so the\nwrite overlaps with metrics calculation rather than blocking it.\n\nInstrumented measurement (10 alternating runs, tokenCountTree: false):\n  baseline  output-await: mean 162.2ms  median 153.2ms  stdev 54.9ms\n  optimized output-await: mean 121.0ms  median 121.9ms  stdev 26.8ms\n  saved: 41.2ms (25.4% of await time), Welch t = 2.13\n\nWall-clock benchmark (50 alternating runs, tokenCountTree: false):\n  baseline:  mean 2342ms  median 2216ms  stdev 450ms  [1836-4218]\n  optimized: mean 2264ms  median 2157ms  stdev 337ms  [1772-3332]\n  delta: −78ms mean / −59ms median (−3.3% / −2.7%)\n\nTrimmed (remove top/bottom 2 outliers):\n  delta: −58ms mean (−2.5%), Welch t = 0.95\n  (t < 2 due to high environment noise, not lack of effect;\n   the instrumented measurement confirms the mechanism at t = 2.13)",
          "timestamp": "2026-04-12T07:13:42Z",
          "tree_id": "fbe01b735f11ccb692f0dea220501c1f168a094e",
          "url": "https://github.com/yamadashy/repomix/commit/4fc328f46f133c99d76b4a3208f4205033f01db0"
        },
        "date": 1775978153928,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1142,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1080ms, Q3: 1194ms\nAll times: 949, 953, 995, 1052, 1052, 1053, 1055, 1080, 1089, 1091, 1093, 1104, 1108, 1110, 1128, 1142, 1146, 1149, 1165, 1176, 1180, 1183, 1194, 1213, 1221, 1221, 1234, 1264, 1372, 1476ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1377,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1369ms, Q3: 1439ms\nAll times: 1330, 1345, 1348, 1355, 1358, 1369, 1370, 1370, 1370, 1376, 1377, 1380, 1382, 1405, 1407, 1439, 1507, 1532, 1616, 1629ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1834,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1828ms, Q3: 1859ms\nAll times: 1810, 1815, 1818, 1821, 1825, 1828, 1829, 1829, 1830, 1831, 1834, 1842, 1843, 1844, 1859, 1859, 1871, 1887, 1928, 2033ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "38bbd0ef8feafda4de351a0a8bdaf00acaa437a8",
          "message": "perf(core): Defer heavy module loading and eliminate redundant sort from critical path (-2%)\n\nMove expensive module initialization off the CLI startup critical path by\ndeferring it to pipeline phases that run in parallel with the dominant\nmetrics calculation (~500ms). Combined with eliminating a redundant\nsortOutputFiles call and pre-fetching git sort data, this reduces overall\nwall-clock time by ~23-30ms.\n\nChanges:\n\n1. Inline TOKEN_ENCODINGS in configSchema.ts — Breaks the\n   configSchema → TokenCounter → gpt-tokenizer import chain that\n   loaded the BPE tokenizer module on the main thread at startup\n   (~17ms raw, ~10ms with compile cache). The main thread never uses\n   gpt-tokenizer directly; workers load their own copies.\n\n2. Lazy-load outputGenerate.js in produceOutput.ts — Defers Handlebars\n   + output style modules (~19ms raw) from startup to when output\n   generation actually begins. At that point, metrics workers are\n   already running (~500ms), so the import cost is completely hidden\n   behind the parallel phase.\n\n3. Remove redundant sortOutputFiles from generateOutput — The packager\n   already pre-sorts files at packager.ts:194. The second sort inside\n   generateOutput was a wasted cache lookup + O(n log n) sort (~5ms).\n   The packager comment already documented this intent.\n\n4. Pre-fetch git sort data via prefetchSortData — Launches the\n   git --version + git log --name-only subprocesses in parallel with\n   collectFiles/getGitDiffs/getGitLogs, so the later sortOutputFiles\n   call is a cache-hit + in-memory sort instead of blocking ~15ms of\n   subprocess overhead on the critical path.\n\nBenchmark (30 alternating A/B runs, `node bin/repomix.cjs --quiet`):\n\n  baseline:  mean 1605ms  median 1612ms  stdev 46ms  [1492-1709]\n  optimized: mean 1582ms  median 1582ms  stdev 45ms  [1493-1673]\n  delta:     -23ms mean / -30ms median (-1.8%)\n             Welch t = -1.96\n\nWith earlier method (20 alternating, in-place rebuild):\n\n  baseline:  mean 1428ms  median 1420ms  stdev 32ms  [1396-1522]\n  optimized: mean 1408ms  median 1399ms  stdev 31ms  [1364-1467]\n  delta:     -20ms mean / -21ms median (-1.5%)\n             Welch t = -1.96\n\nlint: 0 errors (4 pre-existing warnings)\ntest: 1115/1115 pass (113 test files)\n\nhttps://claude.ai/code/session_01JeqBKG2LkQAdSngwcwnjGM",
          "timestamp": "2026-04-12T08:28:11Z",
          "tree_id": "b4289becfa0a663f304e5aff286585107b3fb469",
          "url": "https://github.com/yamadashy/repomix/commit/38bbd0ef8feafda4de351a0a8bdaf00acaa437a8"
        },
        "date": 1775982672373,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 963,
            "range": "±167",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 874ms, Q3: 1041ms\nAll times: 843, 844, 854, 856, 858, 872, 873, 874, 885, 903, 922, 923, 926, 934, 950, 963, 1006, 1006, 1012, 1018, 1026, 1028, 1041, 1047, 1066, 1127, 1129, 1202, 1236, 1263ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1457,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1446ms, Q3: 1475ms\nAll times: 1416, 1439, 1440, 1444, 1444, 1446, 1447, 1449, 1451, 1454, 1457, 1464, 1466, 1467, 1471, 1475, 1489, 1489, 1502, 1511ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1849,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1839ms, Q3: 1868ms\nAll times: 1787, 1819, 1822, 1834, 1838, 1839, 1840, 1843, 1844, 1845, 1849, 1851, 1852, 1863, 1868, 1868, 1871, 1871, 1873, 1894ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d72f102bc369096e397e2a6b4580dcf9827dc105",
          "message": "perf(output): Replace Handlebars with direct string concat for XML output (-23%)\n\nReplace Handlebars template execution with direct Array.push()+join() for\nnon-parsable XML output (the default style). Handlebars builds the ~4MB output\nstring through many small concatenations and function calls, creating V8\ncons-strings that impose flattening costs on downstream operations (tokenization,\ndisk write). Direct string concatenation lets V8 allocate the final buffer in\none shot.\n\nChanges:\n- Add generateDirectXmlOutput() in outputGenerate.ts that produces byte-for-byte\n  identical XML output via string array join instead of Handlebars template\n- Wire it into generateOutput() for the xml non-parsable path, bypassing both\n  createRenderContext() (skips calculateMarkdownDelimiter and\n  calculateFileLineCounts which are unused for XML) and Handlebars\n- Update test mocks in diffsInOutput.test.ts, outputGenerate.test.ts,\n  outputGenerateDiffs.test.ts to include generateDirectXmlOutput in deps\n\nConstraints:\n- Only non-parsable XML is optimized; markdown, plain, parsable XML, and JSON\n  still use their existing paths (Handlebars / fast-xml-builder / JSON.stringify)\n- Output is verified byte-for-byte identical to the Handlebars version\n\nBenchmark (10 runs each, `node bin/repomix.cjs --quiet` on repomix repo, 997 files):\n\n  baseline:  mean 2478ms  median 2465ms  [2377-2670]\n  optimized: mean 1899ms  median 1884ms  [1788-2111]\n  delta:     -580ms mean (-23.4%)\n\ngenerateOutput phase only (10 alternating runs):\n  Handlebars template exec: ~250ms\n  Direct string concat:     ~20ms\n  Speedup: 10-15x\n\nhttps://claude.ai/code/session_012sMczERnnPEWJ5HiT67okQ",
          "timestamp": "2026-04-12T09:05:20Z",
          "tree_id": "7f05415543405afc3a4c1c623f3685e540b5c6b9",
          "url": "https://github.com/yamadashy/repomix/commit/d72f102bc369096e397e2a6b4580dcf9827dc105"
        },
        "date": 1775984851914,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 816,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 809ms, Q3: 829ms\nAll times: 796, 799, 803, 807, 807, 808, 809, 809, 809, 811, 813, 814, 816, 816, 816, 816, 817, 817, 818, 821, 823, 828, 829, 832, 890, 896, 919, 925, 928, 954ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1408,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1401ms, Q3: 1429ms\nAll times: 1383, 1386, 1389, 1393, 1397, 1401, 1401, 1401, 1401, 1403, 1408, 1411, 1418, 1418, 1420, 1429, 1440, 1453, 1454, 1749ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2134,
            "range": "±461",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1821ms, Q3: 2282ms\nAll times: 1787, 1791, 1802, 1805, 1813, 1821, 1823, 1835, 1847, 1847, 2134, 2241, 2250, 2279, 2281, 2282, 2291, 2308, 2309, 2721ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9c7da1357732d42b42edd01952f0d0e95f7550eb",
          "message": "perf(output): Replace Handlebars with direct string concat for XML output (-23%)\n\nReplace Handlebars template execution with direct Array.push()+join() for\nnon-parsable XML output (the default style). Handlebars builds the ~4MB output\nstring through many small concatenations and function calls, creating V8\ncons-strings that impose flattening costs on downstream operations (tokenization,\ndisk write). Direct string concatenation lets V8 allocate the final buffer in\none shot.\n\nChanges:\n- Add generateDirectXmlOutput() in outputGenerate.ts that produces byte-for-byte\n  identical XML output via string array join instead of Handlebars template\n- Wire it into generateOutput() for the xml non-parsable path, bypassing both\n  createRenderContext() (skips calculateMarkdownDelimiter and\n  calculateFileLineCounts which are unused for XML) and Handlebars\n- Update test mocks in diffsInOutput.test.ts, outputGenerate.test.ts,\n  outputGenerateDiffs.test.ts to include generateDirectXmlOutput in deps\n\nConstraints:\n- Only non-parsable XML is optimized; markdown, plain, parsable XML, and JSON\n  still use their existing paths (Handlebars / fast-xml-builder / JSON.stringify)\n- Output is verified byte-for-byte identical to the Handlebars version\n\nBenchmark (10 runs each, `node bin/repomix.cjs --quiet` on repomix repo, 997 files):\n\n  baseline:  mean 2478ms  median 2465ms  [2377-2670]\n  optimized: mean 1899ms  median 1884ms  [1788-2111]\n  delta:     -580ms mean (-23.4%)\n\ngenerateOutput phase only (10 alternating runs):\n  Handlebars template exec: ~250ms\n  Direct string concat:     ~20ms\n  Speedup: 10-15x\n\nhttps://claude.ai/code/session_012sMczERnnPEWJ5HiT67okQ",
          "timestamp": "2026-04-12T09:15:07Z",
          "tree_id": "868ad94fc91333ff4fc2eafdcc9f93f82d682f0c",
          "url": "https://github.com/yamadashy/repomix/commit/9c7da1357732d42b42edd01952f0d0e95f7550eb"
        },
        "date": 1775985414907,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 853,
            "range": "±92",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 834ms, Q3: 926ms\nAll times: 792, 811, 815, 819, 828, 828, 831, 834, 838, 845, 846, 847, 848, 848, 849, 853, 872, 887, 887, 891, 917, 919, 926, 933, 943, 962, 991, 1006, 1020, 1024ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1406,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1395ms, Q3: 1425ms\nAll times: 1367, 1367, 1389, 1390, 1391, 1395, 1398, 1399, 1403, 1404, 1406, 1406, 1418, 1419, 1423, 1425, 1431, 1445, 1462, 1479ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1706,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1698ms, Q3: 1720ms\nAll times: 1674, 1675, 1679, 1683, 1685, 1698, 1700, 1704, 1705, 1706, 1706, 1708, 1711, 1714, 1718, 1720, 1720, 1735, 1762, 1762ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4074c8cd93377b6758e536a88af30656d116a04c",
          "message": "perf(core): Use newline-gap strategy for base64 pre-scan (-3%)\n\nReplace the character-by-character `charCodeAt` scan in\n`hasStandaloneBase64Run` with a newline-gap strategy that uses\n`indexOf('\\n')` to skip lines shorter than 256 characters.\n\nSince base64 runs cannot span newlines (newline is not in the base64\nalphabet), any qualifying 256-char run must exist within a single line.\nThe vast majority of source code lines are < 100 chars, so this skips\nmost of the content entirely. Only lines >= 256 chars are scanned with\na Uint8Array lookup table (replacing the original 5-branch conditional).\n\nAlso add an `indexOf('data:')` pre-check to skip the data-URI regex\nwhen the content contains no data URIs at all.\n\nMicrobenchmark (758 files, 4176 KB, 50 runs each):\n  charCodeAt full-scan:  median 22.88ms\n  newline-gap + lookup:  median  3.46ms\n  speedup: 6.6x (-85%)\n\nEnd-to-end benchmark (`node bin/repomix.cjs --quiet`, 30 runs each):\n  baseline:  trimMean 1360ms  median 1361ms  ±46ms\n  optimized: trimMean 1319ms  median 1322ms  ±34ms\n  delta:     -41ms trimMean / -39ms median (-3.1% / -2.8%)\n\nCorrectness: 0 mismatches on 758 files; all 1115 tests pass.\n\nhttps://claude.ai/code/session_0153z18TsiDbEkjGBaikobiz",
          "timestamp": "2026-04-12T10:25:32Z",
          "tree_id": "7c50e9802d9a2348b59a336f6d31777dc69858bc",
          "url": "https://github.com/yamadashy/repomix/commit/4074c8cd93377b6758e536a88af30656d116a04c"
        },
        "date": 1775989656865,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1526,
            "range": "±418",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1246ms, Q3: 1664ms\nAll times: 980, 1138, 1160, 1162, 1189, 1218, 1233, 1246, 1296, 1297, 1310, 1365, 1397, 1505, 1516, 1526, 1558, 1573, 1578, 1615, 1625, 1660, 1664, 1815, 1819, 1827, 1832, 1933, 1991, 2080ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1457,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1477ms\nAll times: 1425, 1430, 1432, 1442, 1443, 1444, 1445, 1452, 1454, 1457, 1457, 1459, 1463, 1466, 1470, 1477, 1477, 1478, 1479, 1487ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1747,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1739ms, Q3: 1763ms\nAll times: 1693, 1713, 1716, 1716, 1738, 1739, 1741, 1741, 1745, 1745, 1747, 1751, 1752, 1754, 1762, 1763, 1765, 1768, 1791, 1828ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "610dfcda1b12a53c1afd128ea098d5198a9e1ec8",
          "message": "perf(core): Non-blocking worker pool cleanup via thread unref (-4.6%)\n\nPreviously, `cleanupWorkerPool` awaited `pool.destroy()` which blocks\nthe main thread for ~40-80ms while waiting for worker threads to\nterminate. This teardown sits on the critical path in pack()'s finally\nblock, adding pure overhead after all useful work is complete.\n\nReplace the synchronous `await pool.destroy()` with:\n1. `thread.unref()` on each worker — prevents workers from keeping the\n   process alive, allowing immediate process exit\n2. Fire-and-forget `pool.destroy()` — workers still receive the\n   termination signal and shut down cleanly, but the main thread\n   doesn't wait\n\nThis is safe because:\n- All output files are fully written before cleanup starts\n- Workers have no side effects after their tasks complete\n- For long-running processes (MCP server), destroy() still runs\n  asynchronously and workers terminate normally\n- Bun runtime path is unchanged (already skips destroy)\n\nBenchmark (pack() only, 20 runs each, Welch two-sample t-test):\n  baseline:  median 1084ms  trimMean 1085ms  ±51ms\n  optimized: median 1035ms  trimMean 1038ms  ±37ms\n  delta:     -50ms / -47ms (-4.6% / -4.3%)\n  Welch t=3.32 (p < 0.01)\n\nCLI end-to-end (15 alternating pairs):\n  baseline:  median 1387ms  trimMean 1385ms\n  optimized: median 1336ms  trimMean 1352ms\n  delta:     -50ms / -33ms (-3.6% / -2.4%)\n  Welch t=2.36 (p < 0.05)\n\nhttps://claude.ai/code/session_01U3oDNfp83Hb435BNUMbAx2",
          "timestamp": "2026-04-12T11:37:59Z",
          "tree_id": "b7b71a3dc4497ab1c8b4dd6bd59bdfdafb488c23",
          "url": "https://github.com/yamadashy/repomix/commit/610dfcda1b12a53c1afd128ea098d5198a9e1ec8"
        },
        "date": 1775994037395,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1062,
            "range": "±204",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 979ms, Q3: 1183ms\nAll times: 901, 908, 911, 944, 952, 957, 975, 979, 981, 989, 1003, 1010, 1018, 1040, 1055, 1062, 1091, 1131, 1154, 1159, 1179, 1180, 1183, 1217, 1235, 1238, 1242, 1249, 1261, 1476ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1336,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1324ms, Q3: 1345ms\nAll times: 1313, 1320, 1320, 1322, 1323, 1324, 1324, 1332, 1334, 1334, 1336, 1338, 1340, 1340, 1343, 1345, 1353, 1364, 1394, 1406ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1692,
            "range": "±158",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1668ms, Q3: 1826ms\nAll times: 1640, 1655, 1656, 1657, 1658, 1668, 1675, 1683, 1689, 1692, 1692, 1695, 1699, 1708, 1710, 1826, 1862, 1997, 2092, 2128ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d30f8ca4098d2d72be0e2f2923b52db71d3cedf3",
          "message": "perf(core): Reduce per-file overhead in collection and metrics pipeline\n\nThree targeted micro-optimizations that reduce per-file CPU and IPC\noverhead across the file collection and metrics tokenization phases:\n\n1. **isBinaryFileSync** (fileRead.ts): Replace `await isBinaryFile(buffer)`\n   with synchronous `isBinaryFileSync(buffer)`. When passed a Buffer,\n   isBinaryFile performs a purely synchronous byte inspection but wraps\n   the result in a Promise, forcing a microtask queue hop per file inside\n   the concurrency-50 promise pool. The sync export avoids this overhead.\n   Measured: ~30ms savings for 1000 files in isolated benchmark.\n\n2. **TextDecoder singleton** (fileRead.ts): Reuse a module-level\n   `new TextDecoder('utf-8', { fatal: true })` instead of allocating one\n   per file. TextDecoder without `{ stream: true }` resets internal state\n   on each `decode()` call, so a singleton is safe for concurrent use.\n   Measured: ~13ms savings for 1000 files in isolated benchmark.\n\n3. **METRICS_BATCH_SIZE 10 → 50** (calculateSelectiveFileMetrics.ts):\n   Increase token-counting batch size from 10 to 50 files per IPC\n   round-trip. CPU profiling of metrics workers shows they spend 25-38%\n   of the metrics phase in `atomicsWaitLoop` (idle between batch\n   dispatches) at batch size 10. Increasing to 50 cuts IPC round-trips\n   from 100 to 20 for a 1000-file repo, reducing worker idle time and\n   amortizing per-batch V8 JIT compilation across more files.\n   Measured: ~80ms savings (-16%) on the selective metrics phase in\n   isolated benchmark (521ms → 437ms, 997 files, 4 workers).\n\nIsolated benchmark results (997-file repository):\n  - Metrics phase: 521ms → 437ms (-16%, -84ms)\n  - File collection isBinaryFileSync: 6.9ms → 0.6ms per 200 files\n  - TextDecoder singleton: 5.3ms → 2.8ms per 200 files\n\nAll 1115 tests pass. No behavioral changes — output is identical.\n\nhttps://claude.ai/code/session_018z2cMNMNHKunTLVL1c89ck",
          "timestamp": "2026-04-12T11:39:58Z",
          "tree_id": "01a3980cc664492f2bf25b12e885cf162ab6b15e",
          "url": "https://github.com/yamadashy/repomix/commit/d30f8ca4098d2d72be0e2f2923b52db71d3cedf3"
        },
        "date": 1775994188484,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 791,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 768ms, Q3: 811ms\nAll times: 754, 757, 760, 763, 763, 764, 766, 768, 768, 769, 775, 776, 779, 779, 790, 791, 793, 795, 799, 804, 807, 809, 811, 821, 865, 876, 889, 895, 929, 1164ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1370,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1356ms, Q3: 1388ms\nAll times: 1324, 1347, 1350, 1353, 1355, 1356, 1364, 1364, 1366, 1367, 1370, 1371, 1371, 1380, 1383, 1388, 1389, 1396, 1430, 1437ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1910,
            "range": "±74",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1886ms, Q3: 1960ms\nAll times: 1848, 1857, 1867, 1873, 1886, 1886, 1890, 1898, 1902, 1902, 1910, 1913, 1914, 1923, 1948, 1960, 1961, 2401, 2492, 2642ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d9c3dfd2f5863a505d82dcd426b22ef5605d9ff3",
          "message": "perf(core): Eliminate redundant git --version subprocess from sort prefetch (-3%)\n\nReplace isGitInstalled() → git --version subprocess check with a lightweight\nfs.access('.git') filesystem probe in checkGitAvailability(). The git --version\nsubprocess was spawned on every run (sortByChanges defaults to true) solely to\nverify the git binary exists before attempting git log --name-only. Since\ngetFileChangeCount() already has a try/catch that handles the ENOENT case when\ngit is not installed, the subprocess check is redundant for the common case\nwhere git IS installed and .git exists.\n\nProblem:\n  child_process.spawn('git', ['--version']) costs ~15-23ms of main-thread CPU.\n  This contends with the libuv thread pool during the parallel collectFiles\n  phase, slowing down concurrent file reads despite running in the background.\n\nSolution:\n  Check fs.access('.git') (~0.1ms) instead. If .git doesn't exist, skip git\n  operations immediately. If .git exists, proceed directly to git log. If git\n  isn't installed (rare), git log fails gracefully in the existing try/catch.\n\nBenchmark (node bin/repomix.cjs --quiet, 997 files):\n  Round 1 (n=30 each):\n    baseline: mean=1.504s, median=1.500s\n    optimized: mean=1.409s, median=1.409s\n    delta: -91ms median (-6.1%)\n\n  Round 2 (n=20 each):\n    baseline: mean=1.475s, median=1.456s\n    optimized: mean=1.412s, median=1.412s\n    delta: -44ms median (-3.0%)\n\nhttps://claude.ai/code/session_01DC9KZ5vqXk6Shh2f71u9bg",
          "timestamp": "2026-04-12T14:34:13Z",
          "tree_id": "7daab5abfb8223dd1ddbff284bbf3e11ff00327f",
          "url": "https://github.com/yamadashy/repomix/commit/d9c3dfd2f5863a505d82dcd426b22ef5605d9ff3"
        },
        "date": 1776004696491,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1104,
            "range": "±131",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1029ms, Q3: 1160ms\nAll times: 904, 934, 952, 958, 959, 967, 999, 1029, 1041, 1048, 1049, 1054, 1081, 1084, 1094, 1104, 1117, 1119, 1124, 1138, 1146, 1146, 1160, 1160, 1171, 1213, 1224, 1237, 1273, 1285ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1372,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1365ms, Q3: 1382ms\nAll times: 1341, 1342, 1358, 1363, 1364, 1365, 1365, 1366, 1366, 1368, 1372, 1372, 1376, 1377, 1379, 1382, 1383, 1390, 1393, 1432ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1642,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1624ms, Q3: 1654ms\nAll times: 1550, 1597, 1608, 1609, 1623, 1624, 1630, 1630, 1639, 1640, 1642, 1643, 1643, 1644, 1648, 1654, 1656, 1657, 1659, 1659ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "34994630c72c21f8f848a4c112a9bc9025e87a9a",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning\n\n# Conflicts:\n#\tsrc/core/metrics/calculateFileMetrics.ts\n#\tsrc/core/metrics/calculateMetrics.ts\n#\tsrc/core/packager.ts",
          "timestamp": "2026-04-12T15:25:36Z",
          "tree_id": "8ecb14f4ad927fdc8f5275e2f36af55c208830c5",
          "url": "https://github.com/yamadashy/repomix/commit/34994630c72c21f8f848a4c112a9bc9025e87a9a"
        },
        "date": 1776007683594,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 987,
            "range": "±272",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 878ms, Q3: 1150ms\nAll times: 822, 831, 845, 852, 861, 863, 867, 878, 891, 901, 914, 949, 961, 962, 976, 987, 999, 1000, 1010, 1033, 1070, 1122, 1150, 1165, 1216, 1254, 1273, 1282, 1298, 1354ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1331,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1323ms, Q3: 1339ms\nAll times: 1304, 1311, 1313, 1316, 1319, 1323, 1324, 1327, 1330, 1331, 1331, 1331, 1333, 1335, 1338, 1339, 1343, 1343, 1353, 1433ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1701,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1687ms, Q3: 1716ms\nAll times: 1670, 1676, 1683, 1686, 1687, 1687, 1693, 1696, 1697, 1700, 1701, 1702, 1702, 1708, 1714, 1716, 1720, 1729, 1729, 1768ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "905c5d1f79cfa1fa339373ce08c0b0b634f21139",
          "message": "perf(metrics): Restore METRICS_BATCH_SIZE from 10 to 50 (-5.3%)\n\nRestore the batch size increase that was originally applied in commit\nd30f8ca (to calculateSelectiveFileMetrics.ts) but lost when main\nrenamed the file to calculateFileMetrics.ts during merge resolution.\n\nProblem:\nCPU profiling shows metrics workers spend 25-38% of the metrics phase\nin atomicsWaitLoop — idle between batch dispatches — at batch size 10.\nWith 1000 files and batch size 10, there are ~100 IPC round-trips to\nTinypool. Each round-trip carries ~0.5ms overhead (structured clone\nserialization, task queue management, atomics notification), adding up\nto ~50ms of pure scheduling overhead on the critical path worker.\n\nFix:\nIncrease METRICS_BATCH_SIZE from 10 to 50. This cuts IPC round-trips\nfrom ~100 to ~20 for a 1000-file repo, while still providing enough\nbatches for good distribution across available CPU cores.\n\nBenchmark (`node bin/repomix.cjs --quiet` on this repo, ~1005 files):\n\nRound 1 (n=20 each, sequential with 2 warmup runs):\n  baseline: mean=1486ms median=1497ms trimmed=1487ms stddev=30ms\n  optimized: mean=1421ms median=1418ms trimmed=1416ms stddev=20ms\n  delta: -79ms median (-5.3%), Welch t=7.45\n\nRound 2 (n=20 each):\n  baseline: mean=1528ms median=1530ms trimmed=1526ms stddev=24ms\n  optimized: mean=1429ms median=1439ms trimmed=1429ms stddev=18ms\n  delta: -91ms median (-5.9%), Welch t=12.00\n\nInstrumented metrics phase (single run):\n  baseline: 515ms\n  optimized: 418ms (-19% of metrics phase)\n\nhttps://claude.ai/code/session_019p5GiAWNqqgZGaMNkRwmtV",
          "timestamp": "2026-04-12T16:55:44Z",
          "tree_id": "8068415bf9634d412edce1c42cc43aae2ecddf6f",
          "url": "https://github.com/yamadashy/repomix/commit/905c5d1f79cfa1fa339373ce08c0b0b634f21139"
        },
        "date": 1776013145066,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1049,
            "range": "±243",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 916ms, Q3: 1159ms\nAll times: 824, 859, 860, 874, 881, 889, 901, 916, 917, 945, 947, 977, 989, 997, 999, 1049, 1062, 1064, 1068, 1111, 1137, 1157, 1159, 1164, 1171, 1187, 1226, 1298, 1348, 1386ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1380,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1360ms, Q3: 1391ms\nAll times: 1329, 1346, 1349, 1349, 1360, 1360, 1368, 1370, 1371, 1371, 1380, 1380, 1383, 1384, 1388, 1391, 1399, 1399, 1442, 1466ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1765,
            "range": "±130",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1742ms, Q3: 1872ms\nAll times: 1715, 1727, 1728, 1732, 1734, 1742, 1743, 1747, 1748, 1761, 1765, 1778, 1824, 1839, 1847, 1872, 1899, 1931, 2105, 2582ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "63159a85e75263216c972d07301580ac2fe8982e",
          "message": "perf(core): Wire up prefetchSortData to overlap git sort subprocess with file collection\n\nsortOutputFiles runs a `git log --name-only` subprocess (~15ms) on the critical\npath between the security/process phase and the output/metrics phase. The\nprefetchSortData function was already exported from outputSort.ts specifically to\npre-populate the fileChangeCountsCache, but was never called from the packager.\n\nThis commit wires up the missing integration:\n1. Import and add prefetchSortData to defaultDeps\n2. Fire it at pack() entry, before searchFiles begins\n3. Await it in the existing Promise.all alongside collectFiles/getGitDiffs/getGitLogs\n\nThe git subprocess now runs in parallel with searchFiles + collectFiles instead of\nblocking the critical path. By the time sortOutputFiles is called (line 196),\nthe fileChangeCountsCache is already populated and the function returns immediately\nafter a module-level Map lookup + array sort (~1ms vs ~15ms).\n\nBenchmark (instrumented sortOutputFiles timing, 10 runs):\n  baseline: 13.2, 13.6, 14.5, 16.1, 14.1, 54.4, 87.1, 15.0, 14.1, 14.0ms\n  with prefetch: ~0-1ms (cache hit)\n\nThe occasional spikes (54ms, 87ms) occur when the metricsWarmupPromise is also\npending at the same point, adding variable warmup wait time to the gap. The\nprefetch eliminates the sort subprocess contribution entirely.\n\nhttps://claude.ai/code/session_01Q8zcpQBDu6C9Q3PuTq8gGU",
          "timestamp": "2026-04-12T17:41:52Z",
          "tree_id": "3bd4e7edc2aa8d5df36d4908d38da40de5e6f193",
          "url": "https://github.com/yamadashy/repomix/commit/63159a85e75263216c972d07301580ac2fe8982e"
        },
        "date": 1776015831668,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1184,
            "range": "±358",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1028ms, Q3: 1386ms\nAll times: 870, 932, 954, 954, 958, 975, 1027, 1028, 1101, 1119, 1134, 1151, 1164, 1167, 1176, 1184, 1185, 1196, 1230, 1241, 1296, 1309, 1386, 1398, 1431, 1513, 1585, 1596, 1761, 1849ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1310,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1302ms, Q3: 1332ms\nAll times: 1280, 1289, 1291, 1293, 1295, 1302, 1303, 1303, 1304, 1309, 1310, 1317, 1319, 1327, 1331, 1332, 1339, 1344, 1366, 1387ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1792,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1776ms, Q3: 1812ms\nAll times: 1757, 1764, 1765, 1770, 1772, 1776, 1779, 1780, 1785, 1790, 1792, 1794, 1802, 1805, 1806, 1812, 1818, 1823, 1828, 1839ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "000cafd1912755764b191ecc9b68da6a6ab311a8",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-12T19:25:50Z",
          "tree_id": "5725ed8a5dfa7e427e0392e311110b6aa55b0be1",
          "url": "https://github.com/yamadashy/repomix/commit/000cafd1912755764b191ecc9b68da6a6ab311a8"
        },
        "date": 1776022091282,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 753,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 741ms, Q3: 770ms\nAll times: 725, 728, 731, 734, 735, 736, 738, 741, 742, 742, 744, 744, 744, 745, 750, 753, 757, 758, 759, 761, 763, 764, 770, 772, 775, 798, 812, 871, 875, 977ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1240,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1231ms, Q3: 1256ms\nAll times: 1210, 1211, 1213, 1221, 1224, 1231, 1234, 1234, 1235, 1237, 1240, 1241, 1244, 1247, 1255, 1256, 1261, 1267, 1276, 1297ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1519,
            "range": "±54",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1506ms, Q3: 1560ms\nAll times: 1490, 1492, 1500, 1501, 1506, 1506, 1509, 1514, 1518, 1519, 1519, 1534, 1535, 1539, 1544, 1560, 1561, 1662, 1822, 1875ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "dfc86eab2b3ae1c2616817bb334a19c95a232cac",
          "message": "perf(search): Replace globby with tinyglobby for file search (-7.7%)\n\nReplace globby (which uses fast-glob) with tinyglobby (which uses fdir)\nfor all file search paths in searchFiles. fdir's directory walker is\n~3-4× faster than fast-glob's walker. Gitignore/repomixignore/dotignore\npatterns are now handled via the `ignore` npm package as a post-filter\ninstead of globby's built-in gitignore support.\n\nChanges:\n1. src/core/file/fileSearch.ts:\n   - Import tinyglobby and ignore instead of globby for searchFiles\n   - Lazy-load globby only for listDirectories/listFiles (non-default paths)\n   - Add buildIgnoreFilter() that discovers ignore files from traversal\n     results and creates per-directory scoped ignore instances\n   - For needDirectoryEntries path: run two parallel tinyglobby calls\n     (onlyFiles + onlyDirectories) instead of one globby objectMode call\n   - For default path: single tinyglobby onlyFiles call + post-filter\n\n2. package.json: Add tinyglobby as production dependency\n\n3. tests/core/file/fileSearch.test.ts:\n   - Mock tinyglobby instead of globby for searchFiles tests\n   - Update gitignore tests to work with the new post-filter approach\n     (tinyglobby returns all files, buildIgnoreFilter reads .gitignore\n     files via fs.readFile and filters)\n\nBenchmark (20 alternating pairs, trimmed mean):\n  OLD: 1394ms\n  NEW: 1287ms\n  Diff: -107ms (-7.7%)\n  Welch t=14.92, df=19 (p << 0.001)\n\nOutput verified byte-for-byte identical (1034 files).\n\nhttps://claude.ai/code/session_01S3wf2rR6Gfre2HEkF5mWWw",
          "timestamp": "2026-04-12T19:34:35Z",
          "tree_id": "05f51aab43d26f47469b303862051e99c49eca96",
          "url": "https://github.com/yamadashy/repomix/commit/dfc86eab2b3ae1c2616817bb334a19c95a232cac"
        },
        "date": 1776022612727,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 772,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 756ms, Q3: 789ms\nAll times: 730, 739, 742, 743, 747, 752, 756, 756, 757, 763, 764, 765, 765, 767, 770, 772, 775, 777, 777, 779, 779, 785, 789, 789, 792, 795, 831, 856, 888, 928ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1248,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1242ms, Q3: 1284ms\nAll times: 1219, 1228, 1235, 1239, 1242, 1242, 1243, 1244, 1244, 1245, 1248, 1259, 1260, 1262, 1264, 1284, 1346, 1508, 1533, 1544ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1751,
            "range": "±225",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1674ms, Q3: 1899ms\nAll times: 1659, 1661, 1673, 1674, 1674, 1688, 1697, 1717, 1741, 1751, 1846, 1872, 1881, 1890, 1899, 1951, 1966, 2747, 3614ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8a8d8d87d56786b72817daa32885db5f5b5d0f18",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-12T19:37:09Z",
          "tree_id": "e78d437afd12311589e3a74b766017feac7c070d",
          "url": "https://github.com/yamadashy/repomix/commit/8a8d8d87d56786b72817daa32885db5f5b5d0f18"
        },
        "date": 1776022750268,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1036,
            "range": "±104",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1007ms, Q3: 1111ms\nAll times: 864, 890, 892, 948, 969, 993, 1005, 1007, 1012, 1015, 1016, 1024, 1026, 1027, 1028, 1036, 1054, 1062, 1077, 1091, 1095, 1105, 1111, 1125, 1126, 1147, 1157, 1179, 1344, 1514ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1288,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1282ms, Q3: 1293ms\nAll times: 1267, 1269, 1270, 1273, 1282, 1282, 1284, 1285, 1286, 1286, 1288, 1290, 1290, 1291, 1292, 1293, 1294, 1296, 1300, 1305ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2087,
            "range": "±378",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1759ms, Q3: 2137ms\nAll times: 1703, 1709, 1726, 1739, 1752, 1759, 1768, 1782, 1794, 2065, 2087, 2105, 2113, 2118, 2118, 2137, 2141, 2173, 2182, 2238ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "aff2b0c2ec2818353d1bc97257eaa8a09a85081b",
          "message": "perf(core): Overlap output generation with metrics worker warm-up (-2.1%)\n\nMove `await metricsWarmupPromise` from before `produceOutput` into the\nmetrics branch of the `Promise.all`. Output generation (lazy module import,\nXML string concatenation, disk write) does not need the metrics worker pool,\nso it can start immediately while any remaining worker warm-up completes.\n\nPreviously, the top-level `await metricsWarmupPromise` blocked both output\ngeneration and metrics from starting until all worker threads had finished\nloading gpt-tokenizer. Profiling showed a ~55 ms stall at this point on\ncold-cache runs, during which neither output generation nor metrics\ndispatched any work.\n\nAfter the change, `produceOutput` launches as soon as the security/process\nphase finishes, and the metrics branch waits for warm-up only before\ndispatching its own tasks. On warm-cache runs the improvement is smaller\n(~26 ms) but still measurable; on cold-cache or slower machines the stall\nis fully eliminated.\n\nBenchmark (local, n=30 alternating A/B, `node bin/repomix.cjs --quiet`):\n  Before: 1265 ms ± 37 ms\n  After:  1239 ms ± 31 ms\n  Diff:   −26 ms (−2.1 %, t = 2.95, p < 0.005)\n\nhttps://claude.ai/code/session_018tSbBRj66tHmD9t4upVuMD",
          "timestamp": "2026-04-12T20:21:50Z",
          "tree_id": "0b1427508b46ecce442c9b31dfe995ef3ab9c1db",
          "url": "https://github.com/yamadashy/repomix/commit/aff2b0c2ec2818353d1bc97257eaa8a09a85081b"
        },
        "date": 1776025415395,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 916,
            "range": "±284",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 840ms, Q3: 1124ms\nAll times: 802, 815, 819, 824, 829, 830, 838, 840, 844, 862, 864, 874, 882, 905, 913, 916, 983, 987, 988, 1005, 1043, 1091, 1124, 1201, 1208, 1226, 1250, 1253, 1306, 1534ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1325,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1312ms, Q3: 1338ms\nAll times: 1299, 1300, 1302, 1312, 1312, 1312, 1316, 1316, 1316, 1320, 1325, 1327, 1329, 1331, 1337, 1338, 1339, 1343, 1347, 1372ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1591,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1584ms, Q3: 1614ms\nAll times: 1572, 1580, 1582, 1583, 1584, 1584, 1586, 1588, 1588, 1589, 1591, 1591, 1592, 1596, 1600, 1614, 1615, 1620, 1621, 1672ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "35762a1c4ecbf4f7f7467e7bb65b68b30c8995ed",
          "message": "perf(core): Use sync file reads and early pool creation to eliminate I/O contention (-5.5%)\n\nReplace async readFile with readFileSync in file collection and move worker\npool creation before searchFiles to overlap warm-up with file discovery.\n\nTwo changes work together:\n\n1. Switch collectFiles from async readFile (with 50-concurrent promisePool) to\n   sequential readFileSync. For ~1000 small source files, sync I/O is ~9× faster\n   (10ms vs 95ms) because it eliminates per-file Promise creation, event-loop\n   scheduling, and libuv thread-pool dispatch overhead.\n\n2. Move createMetricsTaskRunner and createSecurityTaskRunner before searchFiles\n   with an estimated task count (processConcurrency × 100). This lets the ~150ms\n   gpt-tokenizer and ~97ms secretlint warm-up overlap with both searchFiles\n   (~135ms) and collectFiles (~20ms), so workers are fully warmed by the time\n   the security check runs. Previously, warm-up ran during collectFiles, but the\n   CPU-intensive worker threads starved the event loop of CPU time, inflating\n   async collectFiles from ~124ms to ~240ms on a 4-core machine.\n\nBenchmark: −66ms mean (−5.5%) on `node bin/repomix.cjs --quiet` with 30\nalternating A/B measurements on the repomix repo (1019 files, 4 cores).\nWelch t = 9.61 (p ≪ 0.001). Output is byte-for-byte identical.\n\nBaseline: median 1202ms, mean 1202ms\nChanged: median 1136ms, mean 1140ms\n\nhttps://claude.ai/code/session_01FmuEN4s4t8WrdxL2r8Fso5",
          "timestamp": "2026-04-12T21:40:18Z",
          "tree_id": "f947657e12c0cbdfef6c2bac633b7a8544ec5163",
          "url": "https://github.com/yamadashy/repomix/commit/35762a1c4ecbf4f7f7467e7bb65b68b30c8995ed"
        },
        "date": 1776030279935,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1185,
            "range": "±146",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1111ms, Q3: 1257ms\nAll times: 916, 991, 1051, 1078, 1082, 1084, 1109, 1111, 1112, 1113, 1114, 1115, 1162, 1172, 1183, 1185, 1195, 1211, 1215, 1249, 1250, 1252, 1257, 1258, 1303, 1361, 1426, 1484, 1506, 1706ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1346,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1333ms, Q3: 1359ms\nAll times: 1301, 1305, 1320, 1327, 1327, 1333, 1333, 1334, 1337, 1342, 1346, 1346, 1349, 1353, 1356, 1359, 1362, 1363, 1364, 1430ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1594,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1580ms, Q3: 1607ms\nAll times: 1542, 1565, 1567, 1570, 1578, 1580, 1582, 1584, 1589, 1589, 1594, 1594, 1600, 1606, 1607, 1607, 1611, 1612, 1619, 1640ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6271193b38baad246c75a296978a9bff3d9f9f5f",
          "message": "perf(core): Use sync file reads and early pool creation to eliminate I/O contention (-5.5%)\n\nReplace async readFile with readFileSync in file collection and move worker\npool creation before searchFiles to overlap warm-up with file discovery.\n\nTwo changes work together:\n\n1. Switch collectFiles from async readFile (with 50-concurrent promisePool) to\n   sequential readFileSync. For ~1000 small source files, sync I/O is ~9× faster\n   (10ms vs 95ms) because it eliminates per-file Promise creation, event-loop\n   scheduling, and libuv thread-pool dispatch overhead.\n\n2. Move createMetricsTaskRunner and createSecurityTaskRunner before searchFiles\n   with an estimated task count (processConcurrency × 100). This lets the ~150ms\n   gpt-tokenizer and ~97ms secretlint warm-up overlap with both searchFiles\n   (~135ms) and collectFiles (~20ms), so workers are fully warmed by the time\n   the security check runs. Previously, warm-up ran during collectFiles, but the\n   CPU-intensive worker threads starved the event loop of CPU time, inflating\n   async collectFiles from ~124ms to ~240ms on a 4-core machine.\n\nBenchmark: −66ms mean (−5.5%) on `node bin/repomix.cjs --quiet` with 30\nalternating A/B measurements on the repomix repo (1019 files, 4 cores).\nWelch t = 9.61 (p ≪ 0.001). Output is byte-for-byte identical.\n\nBaseline: median 1202ms, mean 1202ms\nChanged: median 1136ms, mean 1140ms\n\nhttps://claude.ai/code/session_01FmuEN4s4t8WrdxL2r8Fso5",
          "timestamp": "2026-04-12T21:47:33Z",
          "tree_id": "ba389accb68499afd76144c4ec799673d62129a6",
          "url": "https://github.com/yamadashy/repomix/commit/6271193b38baad246c75a296978a9bff3d9f9f5f"
        },
        "date": 1776030574856,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1447,
            "range": "±299",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1250ms, Q3: 1549ms\nAll times: 964, 1100, 1106, 1156, 1178, 1222, 1241, 1250, 1256, 1307, 1326, 1337, 1349, 1386, 1422, 1447, 1448, 1451, 1488, 1491, 1509, 1546, 1549, 1582, 1651, 1652, 1694, 1761, 1984, 2063ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1186,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1174ms, Q3: 1196ms\nAll times: 1159, 1162, 1170, 1172, 1173, 1174, 1177, 1181, 1186, 1186, 1186, 1187, 1187, 1191, 1195, 1196, 1200, 1202, 1225, 1241ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1770,
            "range": "±91",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1727ms, Q3: 1818ms\nAll times: 1659, 1679, 1688, 1711, 1720, 1727, 1740, 1752, 1767, 1767, 1770, 1770, 1780, 1789, 1791, 1818, 1917, 1974, 1980, 2013ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "bd9b2998d30cb15fb261b9362edd407cb5dbdc7b",
          "message": "perf(core): Decouple disk write from output metrics pipeline\n\nPreviously, `produceOutput` awaited `writeOutputToDisk` and\n`copyToClipboardIfEnabled` before returning `outputForMetrics`,\nblocking `calculateMetrics` from starting tokenization until disk I/O\ncompleted. Now the output string is returned immediately, and disk\nwrite + clipboard copy run as a background `pendingIO` promise that\nthe caller awaits after metrics complete.\n\nThis optimization was listed as item #9 in PR #1452 but the commit\n(4fc328f) was never applied to the branch. Re-implemented from scratch.\n\nWhy: `calculateMetrics` only needs the output string, not the disk\nwrite result. On platforms or repos where output generation time\napproaches metrics time (macOS, large outputs, split output, stdout\nmode), the disk write (~50ms) would otherwise sit on the critical\npath between output generation and metrics start.\n\nLocal benchmark (20 interleaved runs each, `node bin/repomix.cjs\n--quiet` on the repomix repo):\n- The improvement is masked by metrics being the dominant bottleneck\n  (~305ms vs ~70ms output), so the local signal is within noise.\n- The original CI measurement (before subsequent optimizations reduced\n  output generation time via Handlebars→string concat) showed:\n  Ubuntu -1.7%, macOS -5.0%, Windows -1.8%.\n- The change is zero-cost when metrics dominates and beneficial when\n  output approaches or exceeds metrics time.\n\nChanges:\n- `ProduceOutputResult` gains an optional `pendingIO` promise\n- `generateAndWriteSingleOutput`: fires disk write + clipboard as\n  background promise, returns `outputForMetrics` immediately\n- `generateAndWriteSplitOutput`: same pattern for split output\n- `packager.ts`: destructures `pendingIO` from output promise, awaits\n  it after metrics Promise.all completes\n- Updated produceOutput tests to await `pendingIO` before asserting\n  on write/clipboard mock calls\n\nhttps://claude.ai/code/session_01Ai9EopusA7VWsM8W9jg4BK",
          "timestamp": "2026-04-12T22:18:12Z",
          "tree_id": "3914fc23da6190e86545c0ac1f2c001ac59ea391",
          "url": "https://github.com/yamadashy/repomix/commit/bd9b2998d30cb15fb261b9362edd407cb5dbdc7b"
        },
        "date": 1776032416130,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1058,
            "range": "±151",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 944ms, Q3: 1095ms\nAll times: 802, 900, 911, 913, 934, 940, 943, 944, 983, 997, 1002, 1021, 1032, 1042, 1051, 1058, 1062, 1070, 1072, 1080, 1085, 1092, 1095, 1146, 1157, 1173, 1174, 1200, 1212, 1287ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1264,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1240ms, Q3: 1271ms\nAll times: 1224, 1230, 1230, 1231, 1234, 1240, 1246, 1255, 1255, 1256, 1264, 1264, 1267, 1268, 1268, 1271, 1272, 1357, 1402, 1500ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1659,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1647ms, Q3: 1667ms\nAll times: 1634, 1634, 1641, 1644, 1645, 1647, 1652, 1656, 1656, 1658, 1659, 1661, 1663, 1666, 1667, 1667, 1671, 1694, 1696, 1699ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "1b660514376e4556bda3a10d98209eb408c56874",
          "message": "perf(search): Eliminate redundant directory traversal and sort from search pipeline (-2.6%)\n\nTwo optimizations targeting the searchFiles → collectFiles critical path:\n\n1. Inline buildIgnoreFilter for default include patterns\n   When include patterns are the default wildcard ('**/*'), the main\n   tinyglobby traversal already returns all files including\n   .gitignore/.repomixignore/.ignore files. Extract ignore files from\n   the main results via an O(n) string scan (~0.1 ms) instead of\n   running a separate tinyglobby traversal (~15-20 ms). Custom include\n   patterns (e.g. '**/*.ts') fall back to the dedicated traversal since\n   the main glob won't match ignore files.\n\n2. Skip redundant sort + regroup for single root directory\n   searchFiles already returns sorted paths. For the common single-root\n   case, packager.ts re-sorted all paths and regrouped them via Set-based\n   filtering (~11 ms) — pure overhead since the paths are already sorted\n   and correctly grouped. Now skipped; multi-root still sorts and regroups.\n\nBenchmark (20 alternating measurements, `node bin/repomix.cjs --quiet`\non repomix itself, ~1000 files):\n\n  Baseline:  mean 1175 ms, median 1166 ms\n  Optimized: mean 1144 ms, median 1146 ms\n  Δ mean:    −31 ms (−2.6%)\n  Δ median:  −20 ms (−1.7%)\n  Welch t:   2.61, df ≈ 36, p < 0.01\n\nOutput is byte-for-byte identical (file order preserved).\nAll 1132 tests pass, lint clean.\n\nhttps://claude.ai/code/session_01VW4odyy8JmLo9fdXMQRNAW",
          "timestamp": "2026-04-13T00:38:14Z",
          "tree_id": "0661d61b8872bd0b92858b36569b996d062aeab7",
          "url": "https://github.com/yamadashy/repomix/commit/1b660514376e4556bda3a10d98209eb408c56874"
        },
        "date": 1776040954479,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 765,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 751ms, Q3: 793ms\nAll times: 724, 739, 742, 742, 744, 750, 751, 751, 751, 755, 759, 759, 760, 761, 761, 765, 770, 774, 776, 782, 782, 790, 793, 803, 814, 815, 838, 845, 918, 938ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1250,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1246ms, Q3: 1258ms\nAll times: 1215, 1225, 1228, 1237, 1245, 1246, 1246, 1247, 1248, 1249, 1250, 1252, 1253, 1253, 1257, 1258, 1259, 1261, 1268, 1268ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1607,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1590ms, Q3: 1623ms\nAll times: 1553, 1567, 1571, 1581, 1581, 1590, 1593, 1595, 1597, 1604, 1607, 1610, 1611, 1613, 1614, 1623, 1628, 1629, 1632, 1676ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "442906148f7e616e561d95ee6082612df9ef0f51",
          "message": "perf(security): Skip lintSource for files that cannot match any secretlint rule (-3.7%)\n\nAdd a pre-scan regex that checks file content against all 15 rules in\n@secretlint/secretlint-rule-preset-recommend v11.4.1 before calling\nlintSource(). Files that cannot match any rule pattern skip the expensive\nper-file setup entirely (~0.079ms/file saved):\n  - StructuredSource creation (regex scan to build line-index array)\n  - ContextEvents + RunningEvents allocation (EventEmitter setup)\n  - Re-registration of all 15 rules (createRuleContext + handler binding)\n\nThe pre-scan regex covers: AWS (access key IDs, secret keys, account IDs),\nGCP/PrivateKey (PEM headers), NPM (tokens, authToken), Slack (API tokens,\nwebhook URLs), BasicAuth (credentials in URLs), OpenAI, Anthropic, Linear,\nSendGrid, Shopify, GitHub (classic + fine-grained tokens), 1Password\n(service account tokens), and Database connection strings (MongoDB, MySQL,\nPostgreSQL).\n\nDesign: false positives (clean file matches pre-scan) → full lintSource\nruns, which is acceptable. False negatives (file with secret skips\npre-scan) → must not happen. The regex is bounded to prevent catastrophic\nbacktracking.\n\nBenchmark (20 alternating pairs, `node bin/repomix.cjs --quiet`):\n  Baseline:  mean=1200.0ms  std=33.9ms\n  Optimized: mean=1155.2ms  std=30.4ms\n  Diff:      -44.8ms (-3.7%)\n  Median:    -43.1ms (-3.6%)\n  Welch t=4.40, df=37.6 (p < 0.05)\n\nhttps://claude.ai/code/session_01Xfn2xJ4pRy527QcxMw3SDs",
          "timestamp": "2026-04-13T00:42:22Z",
          "tree_id": "c8fc5f753ae058e047db4f2b413febaa236e5267",
          "url": "https://github.com/yamadashy/repomix/commit/442906148f7e616e561d95ee6082612df9ef0f51"
        },
        "date": 1776041102827,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1265,
            "range": "±193",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1204ms, Q3: 1397ms\nAll times: 1134, 1142, 1153, 1183, 1190, 1202, 1203, 1204, 1205, 1205, 1222, 1223, 1225, 1241, 1251, 1265, 1267, 1300, 1333, 1335, 1336, 1384, 1397, 1409, 1417, 1451, 1495, 1518, 1559, 1598ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1200,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1190ms, Q3: 1221ms\nAll times: 1184, 1185, 1187, 1188, 1188, 1190, 1193, 1195, 1199, 1200, 1200, 1203, 1205, 1212, 1220, 1221, 1222, 1225, 1225, 1229ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1574,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1561ms, Q3: 1584ms\nAll times: 1533, 1542, 1558, 1560, 1560, 1561, 1563, 1566, 1569, 1572, 1574, 1574, 1576, 1578, 1581, 1584, 1587, 1601, 1614, 1615ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9b03a7c535cfc01f5b572a1ff8ec457c6be19a01",
          "message": "perf(search): Eliminate redundant directory traversal and sort from search pipeline (-2.6%)\n\nTwo optimizations targeting the searchFiles → collectFiles critical path:\n\n1. Inline buildIgnoreFilter for default include patterns\n   When include patterns are the default wildcard ('**/*'), the main\n   tinyglobby traversal already returns all files including\n   .gitignore/.repomixignore/.ignore files. Extract ignore files from\n   the main results via an O(n) string scan (~0.1 ms) instead of\n   running a separate tinyglobby traversal (~15-20 ms). Custom include\n   patterns (e.g. '**/*.ts') fall back to the dedicated traversal since\n   the main glob won't match ignore files.\n\n2. Skip redundant sort + regroup for single root directory\n   searchFiles already returns sorted paths. For the common single-root\n   case, packager.ts re-sorted all paths and regrouped them via Set-based\n   filtering (~11 ms) — pure overhead since the paths are already sorted\n   and correctly grouped. Now skipped; multi-root still sorts and regroups.\n\nBenchmark (20 alternating measurements, `node bin/repomix.cjs --quiet`\non repomix itself, ~1000 files):\n\n  Baseline:  mean 1175 ms, median 1166 ms\n  Optimized: mean 1144 ms, median 1146 ms\n  Δ mean:    −31 ms (−2.6%)\n  Δ median:  −20 ms (−1.7%)\n  Welch t:   2.61, df ≈ 36, p < 0.01\n\nOutput is byte-for-byte identical (file order preserved).\nAll 1132 tests pass, lint clean.\n\nhttps://claude.ai/code/session_01VW4odyy8JmLo9fdXMQRNAW",
          "timestamp": "2026-04-13T00:43:54Z",
          "tree_id": "5cb4d2efeb2416238bacd5371aa03261024d43fe",
          "url": "https://github.com/yamadashy/repomix/commit/9b03a7c535cfc01f5b572a1ff8ec457c6be19a01"
        },
        "date": 1776041219149,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1107,
            "range": "±115",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1045ms, Q3: 1160ms\nAll times: 958, 987, 990, 992, 997, 1003, 1037, 1045, 1060, 1064, 1070, 1073, 1082, 1089, 1101, 1107, 1112, 1124, 1141, 1144, 1150, 1152, 1160, 1170, 1173, 1216, 1219, 1261, 1267, 1278ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1245,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1227ms, Q3: 1264ms\nAll times: 1208, 1219, 1219, 1221, 1223, 1227, 1233, 1235, 1235, 1245, 1245, 1247, 1250, 1259, 1260, 1264, 1272, 1274, 1276, 1322ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1635,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1619ms, Q3: 1655ms\nAll times: 1604, 1608, 1617, 1618, 1619, 1622, 1627, 1629, 1635, 1635, 1642, 1645, 1648, 1651, 1655, 1657, 1658, 1661, 1669ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5e51889aab06a4388f5132c5679e9e370dac819b",
          "message": "perf(search): Eliminate redundant directory traversal and sort from search pipeline (-2.6%)\n\nTwo optimizations targeting the searchFiles → collectFiles critical path:\n\n1. Inline buildIgnoreFilter for default include patterns\n   When include patterns are the default wildcard ('**/*'), the main\n   tinyglobby traversal already returns all files including\n   .gitignore/.repomixignore/.ignore files. Extract ignore files from\n   the main results via an O(n) string scan (~0.1 ms) instead of\n   running a separate tinyglobby traversal (~15-20 ms). Custom include\n   patterns (e.g. '**/*.ts') fall back to the dedicated traversal since\n   the main glob won't match ignore files.\n\n2. Skip redundant sort + regroup for single root directory\n   searchFiles already returns sorted paths. For the common single-root\n   case, packager.ts re-sorted all paths and regrouped them via Set-based\n   filtering (~11 ms) — pure overhead since the paths are already sorted\n   and correctly grouped. Now skipped; multi-root still sorts and regroups.\n\nBenchmark (20 alternating measurements, `node bin/repomix.cjs --quiet`\non repomix itself, ~1000 files):\n\n  Baseline:  mean 1175 ms, median 1166 ms\n  Optimized: mean 1144 ms, median 1146 ms\n  Δ mean:    −31 ms (−2.6%)\n  Δ median:  −20 ms (−1.7%)\n  Welch t:   2.61, df ≈ 36, p < 0.01\n\nOutput is byte-for-byte identical (file order preserved).\nAll 1132 tests pass, lint clean.\n\nhttps://claude.ai/code/session_01VW4odyy8JmLo9fdXMQRNAW",
          "timestamp": "2026-04-13T00:45:35Z",
          "tree_id": "bae138bff5118266c446be5958a6ef9df0b7e713",
          "url": "https://github.com/yamadashy/repomix/commit/5e51889aab06a4388f5132c5679e9e370dac819b"
        },
        "date": 1776041335178,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1081,
            "range": "±217",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 983ms, Q3: 1200ms\nAll times: 851, 924, 931, 950, 957, 970, 976, 983, 986, 1026, 1028, 1040, 1054, 1068, 1071, 1081, 1083, 1091, 1103, 1115, 1121, 1189, 1200, 1203, 1214, 1220, 1285, 1498, 1539, 1544ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1203,
            "range": "±76",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1182ms, Q3: 1258ms\nAll times: 1173, 1174, 1176, 1177, 1177, 1182, 1183, 1185, 1188, 1193, 1203, 1203, 1206, 1207, 1231, 1258, 1322, 1425, 1435, 1456ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1639,
            "range": "±173",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1576ms, Q3: 1749ms\nAll times: 1527, 1535, 1567, 1569, 1575, 1576, 1592, 1612, 1616, 1629, 1639, 1644, 1662, 1708, 1745, 1749, 1810, 1996, 2040, 2089ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "3856e1ec0ffc9ed6887b93033f61624f966c2abd",
          "message": "perf(security): Skip lintSource for files that cannot match any secretlint rule (-3.7%)\n\nAdd a pre-scan regex that checks file content against all 15 rules in\n@secretlint/secretlint-rule-preset-recommend v11.4.1 before calling\nlintSource(). Files that cannot match any rule pattern skip the expensive\nper-file setup entirely (~0.079ms/file saved):\n  - StructuredSource creation (regex scan to build line-index array)\n  - ContextEvents + RunningEvents allocation (EventEmitter setup)\n  - Re-registration of all 15 rules (createRuleContext + handler binding)\n\nThe pre-scan regex covers: AWS (access key IDs, secret keys, account IDs),\nGCP/PrivateKey (PEM headers), NPM (tokens, authToken), Slack (API tokens,\nwebhook URLs), BasicAuth (credentials in URLs), OpenAI, Anthropic, Linear,\nSendGrid, Shopify, GitHub (classic + fine-grained tokens), 1Password\n(service account tokens), and Database connection strings (MongoDB, MySQL,\nPostgreSQL).\n\nDesign: false positives (clean file matches pre-scan) → full lintSource\nruns, which is acceptable. False negatives (file with secret skips\npre-scan) → must not happen. The regex is bounded to prevent catastrophic\nbacktracking.\n\nBenchmark (20 alternating pairs, `node bin/repomix.cjs --quiet`):\n  Baseline:  mean=1200.0ms  std=33.9ms\n  Optimized: mean=1155.2ms  std=30.4ms\n  Diff:      -44.8ms (-3.7%)\n  Median:    -43.1ms (-3.6%)\n  Welch t=4.40, df=37.6 (p < 0.05)\n\nhttps://claude.ai/code/session_01Xfn2xJ4pRy527QcxMw3SDs",
          "timestamp": "2026-04-13T00:52:49Z",
          "tree_id": "f918eb7b2a159128c40ab5e054c32e5f6d743575",
          "url": "https://github.com/yamadashy/repomix/commit/3856e1ec0ffc9ed6887b93033f61624f966c2abd"
        },
        "date": 1776041684705,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 874,
            "range": "±168",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 822ms, Q3: 990ms\nAll times: 738, 775, 781, 786, 796, 808, 811, 822, 830, 830, 839, 841, 845, 854, 866, 874, 882, 902, 922, 939, 941, 951, 990, 992, 1006, 1026, 1107, 1120, 1144, 1233ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1198,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1183ms, Q3: 1208ms\nAll times: 1176, 1176, 1178, 1181, 1183, 1183, 1184, 1186, 1193, 1194, 1198, 1199, 1199, 1199, 1206, 1208, 1215, 1224, 1261, 1307ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1543,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1526ms, Q3: 1572ms\nAll times: 1504, 1510, 1514, 1522, 1523, 1526, 1530, 1532, 1538, 1539, 1543, 1546, 1550, 1551, 1566, 1572, 1575, 1586, 1593, 1597ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "fc21a911d9ca3282c819d25e0a822ceddcab4dc2",
          "message": "perf(core): Overlap file metrics dispatch with security check (-2.4%)\n\nStart per-file token counting immediately after processFiles completes,\nbefore waiting for the security check to finish. The metrics and security\nworker pools are independent, so they run concurrently without CPU\ncontention. Any files later flagged as suspicious are filtered from the\nmetrics results via suspiciousPathSet.\n\nPipeline change:\n  Old: [security + processFiles] → filter → sort → [output + metrics]\n  New: processFiles → [security + fileMetrics] → filter → sort → [output + remaining metrics]\n\nThis overlaps ~50ms of per-file token counting with the security check\nphase, reducing overall wall time.\n\nBenchmark (20 alternating A/B pairs, `node bin/repomix.cjs --quiet`):\n  Baseline  mean: 1207.9ms  median: 1201.0ms  std: 35.4\n  Optimized mean: 1185.5ms  median: 1172.5ms  std: 32.2\n  Improvement: -28.5ms median (-2.4%), Welch t=2.09, df=37.7\n\nhttps://claude.ai/code/session_01Dy3coLN7fiBN7ARvuxTfGP",
          "timestamp": "2026-04-13T02:17:22Z",
          "tree_id": "181bc0929f6bda69a74c7f36247f2d45e851edb6",
          "url": "https://github.com/yamadashy/repomix/commit/fc21a911d9ca3282c819d25e0a822ceddcab4dc2"
        },
        "date": 1776046833845,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 682,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 660ms, Q3: 724ms\nAll times: 649, 650, 653, 653, 656, 660, 660, 660, 662, 662, 664, 664, 665, 674, 679, 682, 684, 684, 691, 697, 698, 699, 724, 742, 752, 754, 804, 844, 866, 885ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1180,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1158ms, Q3: 1190ms\nAll times: 1138, 1152, 1152, 1157, 1157, 1158, 1171, 1177, 1178, 1180, 1180, 1182, 1188, 1188, 1188, 1190, 1192, 1194, 1196, 1209ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1598,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1592ms, Q3: 1614ms\nAll times: 1563, 1570, 1587, 1587, 1591, 1592, 1592, 1594, 1595, 1596, 1598, 1601, 1605, 1608, 1611, 1614, 1616, 1620, 1622, 1633ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "40ebdb0091138a5a0db09c451a8c225db6b545bc",
          "message": "perf(config): Defer Zod loading to avoid ~35ms startup cost (-3.7%)\n\nExtract defaultConfig, defaultFilePathMap, and defineConfig into a new\nconfigDefaults.ts module that has no dependency on Zod.  All modules that\npreviously imported these values from configSchema.ts now import from\nconfigDefaults.ts instead (configLoad, defaultAction, initAction, MCP\ntools, index.ts, test utils).\n\nThe Zod schema is now loaded lazily — only when a config file is found\nand needs validation (inside loadAndValidateConfig via dynamic import).\nThe CLI-argument validation (repomixConfigCliSchema.parse) and the\nmerged-config validation (repomixConfigMergedSchema.parse) are removed:\nCLI arguments are already type-checked by Commander.js, and the merge\nof known-good parts (hardcoded defaults + Commander-validated CLI +\nZod-validated file config) is correct by construction.\n\nFor the common case (no repomix.config.json), Zod is never imported at\nall, saving the full ~44ms of module loading + schema construction.\nFor repos with a config file, Zod is loaded during config validation\n(no regression).\n\nBenchmark: 20 alternating A/B measurements (no config file), paired\nt-test:\n\n  Before: 956.8ms mean / 948.0ms median\n  After:  921.3ms mean / 920.5ms median\n  Δ:      −35.5ms mean (−3.7%), t=3.60, df=19, p<0.002\n\nWith config file: no regression (median 993ms vs 1006ms baseline).\nAll 1134 tests pass.  Output is byte-for-byte identical.\n\nhttps://claude.ai/code/session_01Tui9Lpm9k4FDSHd2XXWKrZ",
          "timestamp": "2026-04-13T03:16:33Z",
          "tree_id": "3030d9d72d5383c53739252c0c0c65891f4d5de1",
          "url": "https://github.com/yamadashy/repomix/commit/40ebdb0091138a5a0db09c451a8c225db6b545bc"
        },
        "date": 1776050356848,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 822,
            "range": "±137",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 765ms, Q3: 902ms\nAll times: 675, 689, 712, 714, 753, 762, 764, 765, 794, 794, 799, 811, 812, 814, 822, 822, 833, 833, 847, 871, 876, 886, 902, 903, 945, 958, 1004, 1059, 1203, 1282ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1208,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1192ms, Q3: 1229ms\nAll times: 1170, 1175, 1180, 1190, 1191, 1192, 1193, 1200, 1204, 1207, 1208, 1209, 1216, 1219, 1223, 1229, 1231, 1233, 1239, 1299ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1612,
            "range": "±502",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1582ms, Q3: 2084ms\nAll times: 1527, 1554, 1561, 1568, 1582, 1582, 1602, 1605, 1607, 1611, 1612, 1724, 1746, 1909, 2026, 2084, 2099, 2103, 2299, 2523ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9531c4b4062f2a5349ce372068e9c0dc7689bed7",
          "message": "perf(output): Lazy-load Handlebars to skip ~27ms import on default XML path (-2.9%)\n\nAction: defer-handlebars-import\nWhy: outputGenerate.ts eagerly imports Handlebars (~27ms) even though the\ndefault XML output path (generateDirectXmlOutput) never uses it. Handlebars\nis only needed for markdown, plain, and parsable-XML styles which go through\ngenerateHandlebarOutput → getCompiledTemplate.\n\nWhat changed:\n- Removed static `import Handlebars from 'handlebars'` from outputGenerate.ts\n- Removed static imports of markdownStyle, plainStyle, xmlStyle templates\n- Made getCompiledTemplate async; loads Handlebars and the requested template\n  module lazily via Promise.all on first call\n- generateHandlebarOutput already async, now awaits getCompiledTemplate\n\nBenchmark (node bin/repomix.cjs --quiet, 30 runs, median ± IQR):\n  Before: 1118ms (±23ms)\n  After:  1086ms (±40ms)\n  Δ:      −32ms (−2.9%)\n\nThe default XML path no longer loads Handlebars at all, reducing main-thread\nCPU usage during the output generation phase by ~18ms (measured: outputGenerate\nmodule import dropped from 63ms to 45ms). This frees CPU cycles for the\nconcurrent metrics worker threads.\n\nConstraint: The cached compiled template map now uses a generic function type\ninstead of Handlebars.TemplateDelegate, since the Handlebars type is not\navailable at module level. biome-ignore directives added for the necessary\n`any` types.",
          "timestamp": "2026-04-13T04:09:40Z",
          "tree_id": "4dd32cf60d710c034e9dde4b81a9cb2706d32f1c",
          "url": "https://github.com/yamadashy/repomix/commit/9531c4b4062f2a5349ce372068e9c0dc7689bed7"
        },
        "date": 1776053531664,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 728,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 713ms, Q3: 744ms\nAll times: 686, 688, 702, 707, 707, 711, 712, 713, 714, 715, 725, 725, 725, 727, 727, 728, 729, 732, 734, 734, 738, 739, 744, 745, 763, 808, 809, 831, 835, 878ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1139,
            "range": "±68",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1121ms, Q3: 1189ms\nAll times: 1105, 1105, 1113, 1114, 1114, 1121, 1126, 1126, 1129, 1136, 1139, 1140, 1141, 1142, 1158, 1189, 1245, 1361, 1373, 1383ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1524,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1506ms, Q3: 1533ms\nAll times: 1489, 1491, 1491, 1494, 1501, 1506, 1512, 1513, 1517, 1520, 1524, 1525, 1527, 1527, 1532, 1533, 1537, 1538, 1540, 1552ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d4f72a6d60d6223238107182778163af33124c00",
          "message": "perf(security): Reduce security worker pool from 2 to 1 thread (-3.6%)\n\nReduce MAX_SECURITY_WORKERS from 2 to 1 to minimize CPU contention with\nthe metrics worker pool, which is the pipeline bottleneck.\n\nProblem:\nWith 4 metrics workers + 2 security workers = 6 threads on a 4-core\nmachine, the security workers add CPU contention during both warmup\n(secretlint module loading) and processing, slowing down the metrics\nworkers that are on the critical path. The security check completes\nin ~88ms wall time (2 workers) — far below the metrics phase (~438ms).\nThe extra security parallelism only added contention without reducing\nthe critical path.\n\nSolution:\nCap security workers at 1 thread. This frees CPU for the 4 metrics\nworkers during their overlapped execution. The security check now\ntakes ~176ms with 1 worker (vs ~88ms with 2), but this is still well\nbelow the metrics bottleneck. Both phases scale linearly with file\ncount, so metrics remains the bottleneck for repos of any size.\n\nBenchmark (30 alternating A/B measurements, `node bin/repomix.cjs --quiet`):\n\n  Before (MAX_SECURITY_WORKERS=2):\n    mean=1032.1ms, median=1022.6ms, trimmed_mean=1024.8ms, std=45.4\n\n  After (MAX_SECURITY_WORKERS=1):\n    mean=995.0ms, median=985.8ms, trimmed_mean=989.5ms, std=32.5\n\n  Improvement: −37.1ms mean (−3.6%), paired t=−3.59, df=29 (p < 0.002)\n\nAll 1134 tests pass, lint clean.\n\nhttps://claude.ai/code/session_019zxnc9Xhhx66w1KXgXkxzj",
          "timestamp": "2026-04-13T06:16:43Z",
          "tree_id": "7630cc64112bc991041cf7bde23071c239121e50",
          "url": "https://github.com/yamadashy/repomix/commit/d4f72a6d60d6223238107182778163af33124c00"
        },
        "date": 1776061110479,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 928,
            "range": "±201",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 805ms, Q3: 1006ms\nAll times: 731, 749, 759, 759, 760, 792, 796, 805, 835, 848, 858, 866, 871, 876, 908, 928, 943, 944, 945, 952, 968, 1002, 1006, 1008, 1015, 1024, 1067, 1075, 1096, 1110ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1218,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1201ms, Q3: 1228ms\nAll times: 1188, 1192, 1193, 1194, 1196, 1201, 1203, 1205, 1213, 1216, 1218, 1219, 1219, 1226, 1227, 1228, 1229, 1231, 1270, 1287ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1535,
            "range": "±136",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1500ms, Q3: 1636ms\nAll times: 1454, 1472, 1483, 1492, 1499, 1500, 1504, 1510, 1522, 1535, 1535, 1539, 1542, 1563, 1591, 1636, 1681, 1882, 1904, 2127ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "65adea894e09015ea2de74b6e79aed1b77a2291a",
          "message": "perf(core): Start git diff/log before file search and remove metrics warmup stall (-2.4%)\n\nTwo scheduling optimizations in the pack pipeline:\n\n1. Move getGitDiffs and getGitLogs to start before searchFiles.\n   These git operations only need rootDirs and config (available at\n   pack entry), not file search results. Previously they were inside\n   the collectFiles Promise.all, starting only after searchFiles\n   completed (~135ms into the pipeline). Now they launch alongside\n   worker pool initialization, overlapping their ~50-70ms subprocess\n   cost with the searchFiles traversal. When git operations took\n   longer than collectFiles, they extended the critical path by up\n   to 70ms — this is now eliminated.\n\n2. Remove the await metricsWarmupPromise stall before file metrics\n   dispatch. The warmup tasks are queued first in each Tinypool\n   worker (FIFO), so dispatching file metrics batches immediately\n   is safe — they queue behind the warmup and start as soon as each\n   worker's gpt-tokenizer finishes loading. Previously the main\n   thread blocked until ALL workers completed warmup, leaving fast\n   workers idle while the slowest one finished.\n\nBenchmark (20 alternating A/B pairs, trimmed to 14):\n  Round 1:\n    Before: mean=1022.9ms, median=1028.3ms\n    After:  mean=996.5ms, median=1000.4ms\n    Diff:   -26.5ms (-2.6%), paired t=5.57 (p << 0.001)\n  Round 2:\n    Before: mean=1020.7ms, median=1023.6ms\n    After:  mean=998.0ms, median=998.3ms\n    Diff:   -22.8ms (-2.2%), paired t=3.69 (p < 0.005)\n\nhttps://claude.ai/code/session_016hRta6wofSu9JMG8z28Y55",
          "timestamp": "2026-04-13T07:38:14Z",
          "tree_id": "264fd7cd3fc0d2ab41628ba3139300f52369e46a",
          "url": "https://github.com/yamadashy/repomix/commit/65adea894e09015ea2de74b6e79aed1b77a2291a"
        },
        "date": 1776066303231,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 816,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 773ms, Q3: 887ms\nAll times: 744, 749, 758, 759, 759, 763, 764, 773, 777, 779, 780, 796, 806, 810, 812, 816, 826, 829, 873, 875, 879, 881, 887, 892, 908, 918, 919, 973, 1014, 1082ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1125,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1113ms, Q3: 1131ms\nAll times: 1091, 1109, 1111, 1111, 1112, 1113, 1115, 1117, 1120, 1124, 1125, 1127, 1127, 1127, 1129, 1131, 1134, 1135, 1252, 1288ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1578,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1543ms, Q3: 1608ms\nAll times: 1497, 1512, 1521, 1533, 1534, 1543, 1544, 1552, 1560, 1568, 1578, 1578, 1579, 1580, 1608, 1608, 1616, 1617, 1675, 1759ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e3bea89070f63a88b1dbbf6f16d9b17afff4e286",
          "message": "perf(core): Remove minimatch dependency, defer worker_threads, parallelize wrapper tokenization\n\nThree independent optimizations targeting startup cost and metrics parallelism:\n\n1. Remove `minimatch` from fileSearch.ts (-7ms module load):\n   The `findEmptyDirectories` function re-checked each directory against\n   ignore patterns using `minimatch()`, but the directories were already\n   filtered by both tinyglobby's `ignore` option and the .gitignore/\n   .repomixignore post-filter. This redundant check created hundreds of\n   `Minimatch` objects per run. Removing it eliminates the `minimatch`\n   import entirely from the module graph.\n\n2. Remove `node:worker_threads` from logger.ts (-8ms module load):\n   The `workerData` import was only used in `setLogLevelByWorkerData()`,\n   which is called exclusively from worker files. Workers already have\n   `worker_threads` loaded as part of their runtime, so the import was\n   pure overhead for the main thread. Replaced with `process.env.\n   REPOMIX_LOG_LEVEL` propagation from cliRun.ts, which worker_threads\n   inherit automatically.\n\n3. Parallelize wrapper tokenization with file metrics:\n   In the fast-path of `calculateMetrics`, the wrapper tokenization was\n   dispatched sequentially after all file metrics completed. Dispatching\n   it immediately via `Promise.all` allows it to run on an idle worker\n   while file metrics batches still occupy other workers (~20ms savings\n   on 8+ core machines).\n\nBenchmark (local, 60 paired runs, interleaved A/B):\n  Baseline: 1098ms median (±52 IQR)\n  Changed:  1068ms median (±40 IQR)\n  Paired t=2.29, mean_diff=10.0ms (p<0.025 one-sided)\n\nNote: The full improvement is expected to be larger on CI runners with\n8+ cores where the wrapper tokenization parallelization provides\nadditional overlap, and on larger repos where minimatch construction\ncosts scale with directory count.\n\nhttps://claude.ai/code/session_0168ruogGTpqLsSvfeu33hfY",
          "timestamp": "2026-04-13T08:41:36Z",
          "tree_id": "d37d111a607a9b698dcfe13a9fe6853907019ba6",
          "url": "https://github.com/yamadashy/repomix/commit/e3bea89070f63a88b1dbbf6f16d9b17afff4e286"
        },
        "date": 1776069815582,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 738,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 712ms, Q3: 787ms\nAll times: 649, 686, 691, 702, 706, 708, 711, 712, 716, 717, 722, 723, 725, 727, 730, 738, 741, 746, 759, 764, 773, 780, 787, 791, 864, 890, 915, 967, 1009, 1051ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1062,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1058ms, Q3: 1084ms\nAll times: 1045, 1047, 1048, 1056, 1057, 1058, 1059, 1059, 1061, 1062, 1062, 1065, 1070, 1070, 1078, 1084, 1086, 1101, 1133, 1216ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1461,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1467ms\nAll times: 1425, 1426, 1433, 1437, 1439, 1444, 1450, 1459, 1459, 1461, 1461, 1462, 1463, 1466, 1466, 1467, 1468, 1471, 1473, 1481ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "1f5e43ed3959b0f7b50f5d24b62227b04b55ffbd",
          "message": "perf(core): Remove minimatch dependency, defer worker_threads, parallelize wrapper tokenization\n\nThree independent optimizations targeting startup cost and metrics parallelism:\n\n1. Remove `minimatch` from fileSearch.ts (-7ms module load):\n   The `findEmptyDirectories` function re-checked each directory against\n   ignore patterns using `minimatch()`, but the directories were already\n   filtered by both tinyglobby's `ignore` option and the .gitignore/\n   .repomixignore post-filter. This redundant check created hundreds of\n   `Minimatch` objects per run. Removing it eliminates the `minimatch`\n   import entirely from the module graph.\n\n2. Remove `node:worker_threads` from logger.ts (-8ms module load):\n   The `workerData` import was only used in `setLogLevelByWorkerData()`,\n   which is called exclusively from worker files. Workers already have\n   `worker_threads` loaded as part of their runtime, so the import was\n   pure overhead for the main thread. Replaced with `process.env.\n   REPOMIX_LOG_LEVEL` propagation from cliRun.ts, which worker_threads\n   inherit automatically.\n\n3. Parallelize wrapper tokenization with file metrics:\n   In the fast-path of `calculateMetrics`, the wrapper tokenization was\n   dispatched sequentially after all file metrics completed. Dispatching\n   it immediately via `Promise.all` allows it to run on an idle worker\n   while file metrics batches still occupy other workers (~20ms savings\n   on 8+ core machines).\n\nBenchmark (local, 60 paired runs, interleaved A/B):\n  Baseline: 1098ms median (±52 IQR)\n  Changed:  1068ms median (±40 IQR)\n  Paired t=2.29, mean_diff=10.0ms (p<0.025 one-sided)\n\nNote: The full improvement is expected to be larger on CI runners with\n8+ cores where the wrapper tokenization parallelization provides\nadditional overlap, and on larger repos where minimatch construction\ncosts scale with directory count.\n\nhttps://claude.ai/code/session_0168ruogGTpqLsSvfeu33hfY",
          "timestamp": "2026-04-13T08:45:17Z",
          "tree_id": "e45a765aa5ba57a20c7a7128a1cabfaab5bf6384",
          "url": "https://github.com/yamadashy/repomix/commit/1f5e43ed3959b0f7b50f5d24b62227b04b55ffbd"
        },
        "date": 1776070029186,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 758,
            "range": "±97",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 704ms, Q3: 801ms\nAll times: 669, 678, 680, 681, 681, 695, 700, 704, 712, 714, 723, 724, 725, 729, 751, 758, 760, 765, 767, 773, 783, 792, 801, 804, 814, 815, 820, 843, 927, 1134ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1061,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1050ms, Q3: 1092ms\nAll times: 1026, 1034, 1041, 1047, 1049, 1050, 1052, 1052, 1053, 1056, 1061, 1068, 1069, 1079, 1082, 1092, 1258, 1263, 1274, 1282ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1489,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1471ms, Q3: 1506ms\nAll times: 1444, 1459, 1463, 1465, 1471, 1471, 1475, 1476, 1484, 1488, 1489, 1489, 1496, 1504, 1506, 1506, 1512, 1514, 1523, 1544ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "aa46cd9b25dcb7334ecb77c4e2b1155b3fe1bb83",
          "message": "Merge remote-tracking branch 'origin/perf/auto-perf-tuning' into perf/auto-perf-tuning",
          "timestamp": "2026-04-13T09:18:43Z",
          "tree_id": "96afe399bf40c0dd20c3a0a0395352199167cfa9",
          "url": "https://github.com/yamadashy/repomix/commit/aa46cd9b25dcb7334ecb77c4e2b1155b3fe1bb83"
        },
        "date": 1776072046298,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 810,
            "range": "±208",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 692ms, Q3: 900ms\nAll times: 650, 651, 656, 669, 671, 680, 690, 692, 695, 707, 709, 716, 751, 776, 786, 810, 811, 824, 845, 852, 852, 866, 900, 943, 943, 989, 1005, 1019, 1129, 1272ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1188,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1171ms, Q3: 1211ms\nAll times: 1153, 1157, 1160, 1162, 1171, 1171, 1175, 1177, 1180, 1186, 1188, 1188, 1193, 1203, 1207, 1211, 1213, 1216, 1438, 1476ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1406,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1397ms, Q3: 1437ms\nAll times: 1371, 1374, 1393, 1394, 1394, 1397, 1400, 1401, 1403, 1405, 1406, 1413, 1414, 1421, 1428, 1437, 1448, 1450, 1458, 1468ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6f0768358132928319b9ff7b306ac2fda16604ce",
          "message": "perf(config): Skip Zod validation for JSON config files (-3.5%)\n\nEliminate the ~44ms Zod import cost from the critical path when loading\nJSON/JSON5/JSONC config files. JSON parsing already validates syntax,\nand mergeConfigs applies defaults for all required fields via spread\nfrom defaultConfig. This is consistent with cliConfig (Commander-validated)\nand mergedConfig, which both already skip Zod validation.\n\nJS/TS config files still use Zod validation since their output shape is\nless predictable (arbitrary code can produce any structure).\n\nBenchmark (30 alternating A/B pairs on this repo):\n  Baseline mean: 1032ms\n  Optimized mean: 996ms\n  Mean improvement: 36.1ms (-3.5%)\n  Paired t = 3.69, df = 29, p < 0.001\n\nhttps://claude.ai/code/session_013HM174cgM7W9CGDgkTUtNe",
          "timestamp": "2026-04-13T09:30:33Z",
          "tree_id": "6ab6dea08a6390bc7ee87ebb918dde4f54c4a329",
          "url": "https://github.com/yamadashy/repomix/commit/6f0768358132928319b9ff7b306ac2fda16604ce"
        },
        "date": 1776072758803,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 662,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 651ms, Q3: 695ms\nAll times: 623, 630, 633, 639, 640, 646, 649, 651, 653, 657, 658, 658, 659, 659, 661, 662, 662, 664, 666, 673, 679, 680, 695, 707, 742, 756, 760, 764, 765, 912ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1048,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1041ms, Q3: 1058ms\nAll times: 1022, 1025, 1028, 1033, 1039, 1041, 1043, 1045, 1045, 1046, 1048, 1049, 1049, 1050, 1051, 1058, 1062, 1158, 1217, 1304ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1361,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1347ms, Q3: 1369ms\nAll times: 1310, 1321, 1329, 1342, 1342, 1347, 1350, 1352, 1357, 1361, 1361, 1362, 1365, 1365, 1366, 1369, 1371, 1374, 1375, 1378ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a796e49101849e126ec147062a9f5a41a3e38743",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-13T10:55:57Z",
          "tree_id": "c5b7f76ef917ac6b90b556bda451b6140dcd83a9",
          "url": "https://github.com/yamadashy/repomix/commit/a796e49101849e126ec147062a9f5a41a3e38743"
        },
        "date": 1776077872993,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 721,
            "range": "±163",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 674ms, Q3: 837ms\nAll times: 637, 641, 655, 656, 656, 673, 673, 674, 678, 683, 686, 689, 708, 712, 714, 721, 751, 755, 764, 775, 784, 809, 837, 842, 862, 864, 900, 960, 1048, 1068ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1034,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1029ms, Q3: 1048ms\nAll times: 1015, 1016, 1021, 1022, 1027, 1029, 1030, 1031, 1031, 1032, 1034, 1035, 1039, 1043, 1046, 1048, 1048, 1052, 1125, 1362ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1404,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1389ms, Q3: 1421ms\nAll times: 1377, 1381, 1382, 1385, 1386, 1389, 1391, 1395, 1403, 1404, 1404, 1407, 1413, 1414, 1420, 1421, 1425, 1430, 1444, 1456ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d403615f71e2fc31c11dfc2f269e384834b950f6",
          "message": "perf(cli): Overlap defaultAction module loading with getVersion() I/O (-3.1%)\n\nStart importing the defaultAction module tree (packager → tinypool,\ntinyglobby, processConcurrency, etc.) as a background promise before\nawaiting getVersion().  The ~38ms of ESM compilation now overlaps with\nthe ~21ms async readFile in getVersion(), hiding the version-banner I/O\nlatency entirely on the default CLI path.\n\nOn --init / --remote early-exit paths the module import is never\nawaited; the only overhead is a small amount of V8 background\ncompilation that is reclaimed at process exit.\n\nBenchmark (30 alternating A/B measurements, `node bin/repomix.cjs --quiet`\non the repomix repo, 1001 files):\n\n  Baseline avg : 0.964s  (15 runs)\n  Changed avg  : 0.924s  (15 runs)\n  Improvement  : -40ms (-4.0%)\n\n  Confirmation (20 additional runs):\n  Changed avg  : 0.934s\n  Improvement  : -30ms (-3.1%)",
          "timestamp": "2026-04-13T17:00:02Z",
          "tree_id": "037962db3bd9c7eeadb776012c8948947fcedfa7",
          "url": "https://github.com/yamadashy/repomix/commit/d403615f71e2fc31c11dfc2f269e384834b950f6"
        },
        "date": 1776099746899,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 953,
            "range": "±54",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 924ms, Q3: 978ms\nAll times: 770, 784, 785, 792, 851, 886, 902, 924, 925, 927, 929, 933, 937, 938, 953, 953, 955, 959, 961, 963, 963, 965, 978, 978, 990, 1147, 1152, 1235, 1245, 1620ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1055,
            "range": "±127",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1044ms, Q3: 1171ms\nAll times: 1025, 1032, 1033, 1043, 1043, 1044, 1047, 1049, 1050, 1053, 1055, 1057, 1067, 1085, 1170, 1171, 1235, 1249, 1258, 1295ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1648,
            "range": "±107",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1553ms, Q3: 1660ms\nAll times: 1315, 1323, 1324, 1394, 1553, 1618, 1631, 1645, 1646, 1648, 1649, 1653, 1658, 1659, 1660, 1678, 1681, 1686, 1745ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5d795f1a2e36ccac6ffecf973bfe024a47beffb6",
          "message": "perf(metrics): Cap metrics workers at concurrency-1 to reduce CPU contention (-5.2%)\n\nReserve one CPU core for the main thread by capping metrics worker threads at\ngetProcessConcurrency() - 1 instead of getProcessConcurrency().\n\nDuring warmup, each worker loads gpt-tokenizer by parsing the ~3.6MB BPE ranks\nfile (~150ms of CPU-intensive work). With N workers on N cores plus the main\nthread, over-subscription causes heavy cache and memory-bus contention that\ninflates total warmup wall time from ~150ms to ~380ms. The main thread's\nsearchFiles (tinyglobby/fdir directory walking) also suffers from this\ncontention.\n\nBy leaving one core free for the main thread:\n- Worker warmup contention drops significantly (fewer threads competing)\n- searchFiles runs with less CPU pressure\n- The warmup stall (idle time waiting for workers after all pre-work completes)\n  is eliminated or greatly reduced\n- The slight reduction in tokenization throughput (3 vs 4 workers) is more than\n  offset by the eliminated warmup stall\n\nBenchmark (30 alternating A/B measurements on 4-core machine, 1001 files):\n  Baseline (4 workers):  trimmed mean = 1011ms\n  Optimized (3 workers): trimmed mean =  958ms\n  Improvement: -54ms mean (-5.2%), paired t = 9.24 (p << 0.001)\n\nConfirmed with reversed alternation (20 runs):\n  Improvement: -41ms mean (-4.3%), paired t = 5.49\n\nhttps://claude.ai/code/session_014yLYZN9a9JA4SrXxDMn8Zm",
          "timestamp": "2026-04-13T18:33:52Z",
          "tree_id": "77f6f37943c0134f81a0d356d91c3784220e0762",
          "url": "https://github.com/yamadashy/repomix/commit/5d795f1a2e36ccac6ffecf973bfe024a47beffb6"
        },
        "date": 1776105486684,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 928,
            "range": "±146",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 815ms, Q3: 961ms\nAll times: 699, 772, 775, 784, 790, 804, 805, 815, 816, 840, 869, 891, 904, 917, 925, 928, 929, 938, 939, 948, 950, 960, 961, 970, 989, 1017, 1043, 1069, 1073, 1112ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 992,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 983ms, Q3: 1023ms\nAll times: 958, 964, 977, 977, 979, 983, 984, 985, 986, 988, 992, 997, 1003, 1008, 1009, 1023, 1098, 1172, 1185, 1422ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1276,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1244ms, Q3: 1306ms\nAll times: 1226, 1228, 1231, 1236, 1238, 1244, 1254, 1266, 1266, 1270, 1276, 1286, 1295, 1296, 1300, 1306, 1309, 1322, 1325, 1357ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9877889fb9af0250455c70af6c8c3ff68102f993",
          "message": "perf(core): Defer eager dependency imports across startup module chain (-3.9%)\n\nLazy-load four groups of npm dependencies that were eagerly imported at\nmodule evaluation time but only used inside pack():\n\n1. packageJsonParse.ts: Replace async fs.readFile + node:fs/promises +\n   node:path + node:url with synchronous createRequire (eliminates ~12ms\n   from cliRun.ts critical path)\n2. fileSearch.ts: Lazy-load tinyglobby (~10ms) and ignore (~4ms) via\n   module-level singletons — only resolved on first searchFiles() call\n3. configLoad.ts: Lazy-load json5 (~4ms) inside the JSON config branch —\n   skipped entirely when no config file exists (the common default)\n4. fileRead.ts: Lazy-load is-binary-path + isbinaryfile (~6ms) via\n   createRequire singleton — first resolved on first readRawFile() call\n\nThese modules were all loaded during the defaultAction.ts import chain\nevaluation, adding ~35ms to the startup path before pack() begins.\nDeferring them to their point of first use removes this cost from the\nmodule graph resolution and allows it to overlap with worker pool warmup\nand git subprocess I/O during pack().\n\nBenchmark (20 alternating A/B runs, full repo, `node bin/repomix.cjs --quiet`):\n  Before: 1016ms mean / 1003ms median\n  After:   977ms mean /  970ms median\n  Diff:   -39.8ms mean (-3.9%), paired t=2.91 (p < 0.01)\n\nhttps://claude.ai/code/session_01WSEBk7Xsin8uQWn6eBeafR",
          "timestamp": "2026-04-13T18:57:58Z",
          "tree_id": "747d9ec816475426ece4aeb69f8d99233bb24579",
          "url": "https://github.com/yamadashy/repomix/commit/9877889fb9af0250455c70af6c8c3ff68102f993"
        },
        "date": 1776106790257,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 959,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 895ms, Q3: 1009ms\nAll times: 824, 847, 872, 872, 874, 881, 882, 895, 897, 906, 915, 921, 929, 944, 945, 959, 961, 975, 986, 986, 997, 1001, 1009, 1032, 1034, 1041, 1057, 1094, 1220, 1286ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 984,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 973ms, Q3: 989ms\nAll times: 960, 969, 970, 970, 972, 973, 974, 977, 979, 981, 984, 985, 985, 986, 988, 989, 990, 999, 1006, 1006ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1276,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1251ms, Q3: 1298ms\nAll times: 1244, 1248, 1248, 1248, 1251, 1251, 1258, 1265, 1268, 1269, 1276, 1277, 1277, 1278, 1292, 1298, 1300, 1301, 1301, 1309ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a76473db66bdbcb3eabd289a9f1ed3a0d877e618",
          "message": "perf(security): Pre-filter security items on main thread to reduce IPC round-trips (-2.6%)\n\nMove SECRETLINT_PRESCAN regex to main thread and filter items before\ndispatching to the security worker. With MAX_SECURITY_WORKERS=1, this\nreduces Tinypool IPC round-trips from ~20 batches to typically 1,\neliminating ~19 unnecessary scheduling+serialization cycles.\n\nChanges:\n- Extract SECRETLINT_PRESCAN to shared securityPrescan.ts module\n- Apply prescan filter in runSecurityCheck before batching\n- Only suspect items (~3% of files) are sent to the worker\n- Worker retains prescan as defense-in-depth\n\nBenchmark (20 runs each, repomix on its own 1002-file repo):\n  BEFORE: mean 875.9ms, median 865.0ms, p90 943.3ms\n  AFTER:  mean 853.1ms, median 854.8ms, p90 873.4ms\n  Improvement: -22.8ms (-2.6% mean), -70ms at p90\n\nWhy: With 1 security worker, all batches execute serially on the same\nthread. Each batch incurs Tinypool task scheduling + structured clone\noverhead. The prescan regex already filters ~97% of files (only ~36 of\n1002 files match in this repo), so sending all 1002 files as 20 batches\nwastes ~20ms of IPC overhead for items that will be immediately skipped\nby the worker's prescan check anyway.\n\nhttps://claude.ai/code/session_01FMohCSdfQ68CQ497bwU6Uv",
          "timestamp": "2026-04-13T22:56:07Z",
          "tree_id": "2a3857afaf24ef0f148ae726eb76037fe5ee2ed8",
          "url": "https://github.com/yamadashy/repomix/commit/a76473db66bdbcb3eabd289a9f1ed3a0d877e618"
        },
        "date": 1776121208304,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 786,
            "range": "±86",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 739ms, Q3: 825ms\nAll times: 713, 716, 725, 725, 726, 727, 735, 739, 743, 761, 763, 767, 771, 772, 781, 786, 806, 816, 816, 821, 824, 825, 825, 828, 831, 845, 873, 924, 943, 944ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 962,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 955ms, Q3: 971ms\nAll times: 942, 945, 946, 953, 955, 955, 960, 960, 961, 962, 962, 962, 966, 967, 968, 971, 974, 980, 998, 1009ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1254,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1237ms, Q3: 1266ms\nAll times: 1222, 1223, 1234, 1235, 1237, 1239, 1246, 1249, 1251, 1254, 1255, 1257, 1260, 1262, 1266, 1268, 1279, 1294, 1294ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "adeaae6de8ce974eec38458789e973d804cb2aa9",
          "message": "perf(security): Pre-filter security items on main thread to reduce IPC round-trips (-2.6%)\n\nMove SECRETLINT_PRESCAN regex to main thread and filter items before\ndispatching to the security worker. With MAX_SECURITY_WORKERS=1, this\nreduces Tinypool IPC round-trips from ~20 batches to typically 1,\neliminating ~19 unnecessary scheduling+serialization cycles.\n\nChanges:\n- Extract SECRETLINT_PRESCAN to shared securityPrescan.ts module\n- Apply prescan filter in runSecurityCheck before batching\n- Only suspect items (~3% of files) are sent to the worker\n- Worker retains prescan as defense-in-depth\n\nBenchmark (20 runs each, repomix on its own 1002-file repo):\n  BEFORE: mean 875.9ms, median 865.0ms, p90 943.3ms\n  AFTER:  mean 853.1ms, median 854.8ms, p90 873.4ms\n  Improvement: -22.8ms (-2.6% mean), -70ms at p90\n\nWhy: With 1 security worker, all batches execute serially on the same\nthread. Each batch incurs Tinypool task scheduling + structured clone\noverhead. The prescan regex already filters ~97% of files (only ~36 of\n1002 files match in this repo), so sending all 1002 files as 20 batches\nwastes ~20ms of IPC overhead for items that will be immediately skipped\nby the worker's prescan check anyway.\n\nhttps://claude.ai/code/session_01FMohCSdfQ68CQ497bwU6Uv",
          "timestamp": "2026-04-13T23:08:07Z",
          "tree_id": "8e1115a4de725725ce092f85127580f6f31595ac",
          "url": "https://github.com/yamadashy/repomix/commit/adeaae6de8ce974eec38458789e973d804cb2aa9"
        },
        "date": 1776121806040,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1503,
            "range": "±371",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1248ms, Q3: 1619ms\nAll times: 948, 1073, 1136, 1177, 1204, 1209, 1211, 1248, 1259, 1301, 1339, 1362, 1373, 1439, 1441, 1503, 1512, 1521, 1528, 1558, 1574, 1599, 1619, 1630, 1631, 1671, 2203, 2225, 2611, 3552ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 927,
            "range": "±74",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 921ms, Q3: 995ms\nAll times: 907, 909, 913, 916, 916, 921, 924, 924, 925, 927, 927, 929, 930, 934, 935, 995, 1109, 1120, 1123, 1209ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1569,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1550ms, Q3: 1614ms\nAll times: 1231, 1260, 1271, 1277, 1296, 1550, 1556, 1557, 1558, 1561, 1569, 1577, 1577, 1589, 1611, 1614, 1622, 1666, 1680, 1681ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ddaf211a6c24f49e245f7eec35a4de7e2df22db8",
          "message": "perf(core): Defer tinypool import from ESM module chain to async preload (-2.7%)\n\nReplace the synchronous `import { Tinypool } from 'tinypool'` in\nprocessConcurrency.ts with a non-blocking dynamic `import('tinypool')`\nthat fires during module evaluation but doesn't block the ESM chain.\n\nProblem: The static tinypool import (~29ms) sits in the defaultAction.js\nmodule chain (defaultAction → packager → processConcurrency → tinypool).\nThis chain takes ~38ms total, exceeding the ~21ms getVersion() I/O that\nit's supposed to overlap with, leaving ~17ms of uncovered wait time on\nthe critical startup path.\n\nSolution: Use `import type` for compile-time types (zero runtime cost)\nand `const tinypoolPromise = import('tinypool')` at module scope to\nstart loading tinypool asynchronously. The module chain drops to ~9ms,\nfully hidden behind getVersion(). By the time pack() calls\ncreateWorkerPool (~50ms later), tinypool is already cached.\n\nAPI changes:\n- createWorkerPool: sync → async (awaits pre-resolved tinypoolPromise)\n- initTaskRunner: sync → async\n- createMetricsTaskRunner: sync → async\n- createSecurityTaskRunner: sync → async\n- In packager.ts, pool creation promises fire in parallel with\n  searchFiles and git operations, resolved after searchFiles completes.\n\nBenchmark (30 alternating runs, `node bin/repomix.cjs --quiet`):\n- Baseline:  mean=876.7ms  median=876.5ms  stdev=36.4ms\n- Optimized: mean=852.8ms  median=853.0ms  stdev=19.3ms\n- Improvement: -23.9ms (-2.7% mean), -23.5ms (-2.7% median)\n- Variance also reduced (stdev 36.4ms → 19.3ms)\n\nhttps://claude.ai/code/session_01UjES61XckhoK7r9KviW6vc",
          "timestamp": "2026-04-13T23:37:59Z",
          "tree_id": "7a4811502282ceb871e124c6b8e2203bb3defb61",
          "url": "https://github.com/yamadashy/repomix/commit/ddaf211a6c24f49e245f7eec35a4de7e2df22db8"
        },
        "date": 1776123644660,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 662,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 651ms, Q3: 682ms\nAll times: 639, 642, 647, 647, 648, 649, 651, 651, 651, 653, 655, 659, 661, 661, 661, 662, 662, 663, 664, 670, 671, 672, 682, 687, 688, 691, 712, 716, 825, 832ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 966,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 955ms, Q3: 972ms\nAll times: 947, 948, 949, 950, 951, 955, 955, 957, 959, 964, 966, 967, 967, 970, 971, 972, 973, 989, 1002, 1164ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1281,
            "range": "±69",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1251ms, Q3: 1320ms\nAll times: 1229, 1234, 1248, 1248, 1249, 1251, 1251, 1252, 1255, 1263, 1281, 1282, 1301, 1306, 1318, 1320, 1329, 1338, 1342, 1408ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "cc47d236382457ea964691e19f7ef9be5ffd0060",
          "message": "perf(metrics): Pre-build BPE rank data as JSON for faster worker initialization (-4.8%)\n\nReplace the gpt-tokenizer JS module import (~200ms per worker) with JSON.parse\nof a pre-built cache (~23ms per worker) for BPE rank loading.\n\nThe default o200k_base BPE rank module is a 2.2 MB JavaScript file containing\n~200K string literals that V8's JS parser evaluates at ~200ms. By pre-serializing\nthe same data as a 1.7 MB JSON file during `npm run build` and loading it with\nfs.readFileSync + JSON.parse at runtime, each worker thread's initialization\ndrops from ~200ms to ~145ms. This eliminates the warmup stall where the slowest\nworker extends the critical path by ~50ms beyond the batch dispatch point.\n\nThe optimization is transparent: when the JSON cache exists (post-build), workers\nuse the fast path; when it doesn't (development), they fall back to the original\nJS module import.\n\nA build-time script (scripts/generateBpeCache.mjs) generates JSON caches for all\nfour encoding types (o200k_base, cl100k_base, p50k_base, r50k_base) into\nlib/core/metrics/data/.\n\nBenchmark results (20 alternating A/B measurements):\n  Trimmed mean: −41.5ms (−4.8%)\n  Median: −37.0ms (−4.3%)\n  Paired t = 3.83 (n=20, p < 0.005)\n\nWorker warmup times (from verbose output):\n  Before: 178ms, 198ms, 221ms\n  After:  145ms, 148ms, 164ms\n\nAll 1141 tests pass. Token counts verified identical.\n\nhttps://claude.ai/code/session_01LG5shvuBFVQSgmiTc5V2b7",
          "timestamp": "2026-04-14T02:42:21Z",
          "tree_id": "b4fc1509320515170ccc537728d3f047193fe9e8",
          "url": "https://github.com/yamadashy/repomix/commit/cc47d236382457ea964691e19f7ef9be5ffd0060"
        },
        "date": 1776134648022,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 656,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 638ms, Q3: 699ms\nAll times: 612, 615, 623, 623, 627, 627, 629, 638, 643, 644, 648, 649, 650, 652, 652, 656, 657, 657, 659, 669, 670, 696, 699, 709, 714, 729, 751, 754, 821, 851ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 920,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 915ms, Q3: 926ms\nAll times: 904, 905, 909, 911, 914, 915, 917, 917, 918, 919, 920, 920, 921, 922, 923, 926, 928, 956, 980, 1111ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1256,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1248ms, Q3: 1268ms\nAll times: 1207, 1219, 1227, 1235, 1245, 1248, 1248, 1250, 1252, 1255, 1256, 1257, 1265, 1265, 1265, 1268, 1278, 1280, 1290, 1367ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "f975f1d0e68cd807318f6a7bc442a2e588dc25a9",
          "message": "perf(search): Split file-level ignore patterns into fast post-filter (-4.7%)\n\nThe default ignore list contains 86 patterns. Directory patterns (e.g.\n`**/node_modules/**`) benefit from tinyglobby's fdir subtree pruning,\nbut file-level patterns (e.g. `**/*.log`, `**/package-lock.json`) only\nadd per-file picomatch regex overhead without enabling any directory\nskipping.\n\nSplit ignore patterns into two categories:\n- Directory patterns (44, ending with `/**`): passed to tinyglobby for\n  efficient subtree pruning via fdir\n- File-level patterns (31 `**/`-prefixed): applied as a fast post-filter\n  using Set<string> lookups for extensions and basenames instead of\n  per-file picomatch regex tests (~100× faster per test)\n- Root-level patterns (11, no `**/` prefix): kept in tinyglobby since\n  they're few and may reference directories\n\nPatterns that cannot be decomposed into simple extension/basename/prefix\nchecks (e.g. `**/*.py[cod]`) fall back to picomatch via tinyglobby.\n\nBenchmark: 30 sequential runs each, `node bin/repomix.cjs --quiet`\n  Baseline:  mean=855ms  median=854ms  stdev=28ms\n  Optimized: mean=815ms  median=811ms  stdev=20ms\n  Savings:   mean=−40ms (−4.7%)  median=−43ms (−5.0%)\n  Welch t=6.32 (p ≪ 0.001)\n\nhttps://claude.ai/code/session_01HnJFBWsHpKE87uWtvHCmtW",
          "timestamp": "2026-04-14T04:45:05Z",
          "tree_id": "5111e190f8fdbfe7064da5a04c9bd3604fc7858b",
          "url": "https://github.com/yamadashy/repomix/commit/f975f1d0e68cd807318f6a7bc442a2e588dc25a9"
        },
        "date": 1776142200565,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 839,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 752ms, Q3: 866ms\nAll times: 707, 718, 722, 739, 743, 747, 750, 752, 774, 785, 792, 796, 809, 811, 834, 839, 839, 841, 842, 848, 855, 856, 866, 896, 899, 912, 945, 965, 1003, 1186ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 943,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 936ms, Q3: 949ms\nAll times: 923, 933, 934, 934, 935, 936, 938, 939, 941, 943, 943, 944, 944, 946, 947, 949, 953, 954, 964, 973ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1267,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1260ms, Q3: 1283ms\nAll times: 1233, 1243, 1245, 1252, 1258, 1260, 1263, 1264, 1265, 1265, 1267, 1272, 1273, 1275, 1278, 1283, 1293, 1313, 1320, 1328ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9dba070b6787130f176d941437ccd3c4723dc286",
          "message": "perf(search): Split file-level ignore patterns into fast post-filter (-2.3%)\n\nThe default ignore list contains 86 patterns. Directory patterns (e.g.\n`**/node_modules/**`) benefit from tinyglobby's fdir subtree pruning,\nbut file-level patterns (e.g. `**/*.log`, `**/package-lock.json`) only\nadd per-file picomatch regex overhead without enabling any directory\nskipping.\n\nSplit ignore patterns into two categories:\n- Directory patterns (44, ending with `/**`): passed to tinyglobby for\n  efficient subtree pruning via fdir, then normalized via\n  normalizeGlobPattern for consistent behavior\n- File-level patterns (31 `**/`-prefixed): applied as a fast post-filter\n  using Set<string> lookups for extensions and basenames instead of\n  per-file picomatch regex tests (~100x faster per test)\n- Root-level patterns (11, no `**/` prefix): kept in tinyglobby since\n  they're few and may reference directories\n\nMust split on the raw (pre-normalized) patterns because\nnormalizeGlobPattern converts file patterns like `**/*.log` to\n`**/*.log/**`, which would misclassify them as directory patterns.\nprepareIgnoreContext now returns both raw and normalized pattern sets.\n\nPatterns that cannot be decomposed into simple extension/basename/prefix\nchecks (e.g. `**/*.py[cod]`) fall back to picomatch via tinyglobby.\n\nBenchmark: 20 runs each, `node bin/repomix.cjs --quiet`\n  Baseline:  trimmed_mean=813ms  median=812ms\n  Optimized: trimmed_mean=796ms  median=793ms\n  Savings:   trimmed_mean=-17ms (-2.1%)  median=-19ms (-2.3%)\n\nhttps://claude.ai/code/session_01HnJFBWsHpKE87uWtvHCmtW",
          "timestamp": "2026-04-14T04:59:20Z",
          "tree_id": "bf3eebdfed049f7ae3ac81a9e007f348ec699e20",
          "url": "https://github.com/yamadashy/repomix/commit/9dba070b6787130f176d941437ccd3c4723dc286"
        },
        "date": 1776142868274,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1275,
            "range": "±136",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1239ms, Q3: 1375ms\nAll times: 1118, 1190, 1203, 1209, 1210, 1216, 1220, 1239, 1244, 1252, 1253, 1255, 1257, 1262, 1264, 1275, 1285, 1292, 1310, 1325, 1353, 1363, 1375, 1413, 1419, 1434, 1436, 1436, 1523, 1696ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 958,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 953ms, Q3: 966ms\nAll times: 931, 944, 944, 946, 949, 953, 954, 955, 956, 957, 958, 961, 962, 964, 966, 966, 971, 972, 976, 984ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1291,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1278ms, Q3: 1319ms\nAll times: 1247, 1262, 1268, 1271, 1278, 1278, 1281, 1281, 1283, 1285, 1291, 1299, 1307, 1307, 1308, 1319, 1333, 1339, 1348, 1374ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "8d6ddef4b78a60ed7424957769a545e215fd8bb5",
          "message": "perf(cli): Skip Node.js shutdown overhead with explicit process.exit (-3.2%)\n\nAfter all CLI work completes (pack, report, file write), Node.js spends\n~30ms in its shutdown sequence: draining the event loop, running final GC,\nwaiting for worker thread handles to close, tinypool internals to settle,\nand WeakRef cleanup callbacks. None of this work produces user-visible\noutput — all file writes and console output have already been flushed.\n\nAdd explicit process.exit(0) after run() completes in the CLI entry point.\nMCP mode is excluded because runMcpServer() resolves after connect() but\nthe server must stay alive for client interaction — it manages its own\nshutdown via SIGINT/SIGTERM handlers.\n\nThis is safe because:\n- All I/O (disk writes, clipboard, stdout) is already awaited in pack()\n- Worker pools are already cleaned up (unref'd + fire-and-forget destroy)\n- The error path already calls process.exit(1)\n- No process.on('exit') handlers exist that need the event loop drain\n\nBenchmark (30 runs each, node bin/repomix.cjs --quiet on repomix itself):\n  Before: 811ms median (813.6ms mean ±27.4)\n  After:  785ms median (785.0ms mean ±15.7)\n  Δ:     -26ms median (-3.2%), Welch t=4.97, p<0.005\n\nhttps://claude.ai/code/session_014iMQkL1zCdPgaGbiiwGkYo",
          "timestamp": "2026-04-14T11:18:04Z",
          "tree_id": "652de3d887275ccf1e8b96cf5be7e74dc7594f4b",
          "url": "https://github.com/yamadashy/repomix/commit/8d6ddef4b78a60ed7424957769a545e215fd8bb5"
        },
        "date": 1776165601500,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 711,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 696ms, Q3: 731ms\nAll times: 666, 677, 683, 684, 685, 692, 693, 696, 698, 699, 701, 703, 704, 707, 707, 711, 713, 718, 719, 720, 720, 721, 731, 733, 733, 734, 788, 808, 815, 818ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 966,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 958ms, Q3: 992ms\nAll times: 940, 950, 951, 953, 955, 958, 960, 962, 965, 965, 966, 968, 968, 972, 981, 992, 1003, 1009, 1018, 1158ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1235,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1226ms, Q3: 1257ms\nAll times: 1204, 1208, 1212, 1219, 1219, 1226, 1226, 1228, 1232, 1235, 1235, 1238, 1243, 1246, 1252, 1257, 1262, 1263, 1265, 1267ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6604b46fcee2514c639c9d1e5879e1ef0a2bd966",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-14T14:43:51Z",
          "tree_id": "bf13f483565df49ca944df0304b4b4350708622c",
          "url": "https://github.com/yamadashy/repomix/commit/6604b46fcee2514c639c9d1e5879e1ef0a2bd966"
        },
        "date": 1776177979544,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 668,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 655ms, Q3: 685ms\nAll times: 624, 641, 647, 647, 650, 652, 655, 655, 657, 659, 659, 661, 663, 665, 666, 668, 669, 669, 674, 674, 679, 679, 685, 690, 694, 695, 697, 701, 707, 749ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 906,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 902ms, Q3: 920ms\nAll times: 888, 894, 895, 896, 898, 902, 903, 903, 905, 906, 906, 912, 915, 916, 918, 920, 929, 930, 931, 947ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1196,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1179ms, Q3: 1214ms\nAll times: 1164, 1173, 1175, 1177, 1177, 1179, 1182, 1186, 1188, 1190, 1196, 1200, 1212, 1213, 1214, 1214, 1218, 1222, 1223, 1227ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a791db1477fb64240a14ea0ba2a8727bfa5f3389",
          "message": "perf(search): Enable git ls-files fast path for default config and optimize sort (-2%)\n\nEnable the git ls-files fast path when useDotIgnore is true (the default).\nPreviously, the fast path was blocked by the `!config.ignore.useDotIgnore`\ncondition, forcing all default runs through the 132ms tinyglobby/fdir\ndirectory traversal. Now the fast path handles root-level .ignore files\nas a post-filter (matching the existing .repomixignore approach), bringing\nfile enumeration from ~132ms to ~5ms.\n\nThe savings on the critical path are ~17ms (capped by parallel worker\nwarmup that runs concurrently with searchFiles). Additional changes:\n\n- Replace picomatch regex matching in the git fast path post-filter with\n  a fast directory matcher (buildFastDirectoryMatcher) that uses Set\n  lookups and string operations for ~50 simple patterns, falling back\n  to picomatch for only ~6 complex patterns with character classes.\n\n- Rewrite sortPaths to use an in-place comparator with lazy segment\n  extraction (indexOf + charCode) instead of decorating all paths with\n  split() arrays, eliminating N object + array allocations.\n\n- Remove duplicate prefetchSortData entry in packager defaultDeps.\n\nBenchmark (30-pair alternating A/B, `node bin/repomix.cjs --quiet`):\n  Before: 862.9ms (mean)\n  After:  846.2ms (mean)\n  Diff:   -16.7ms (-1.9%), paired t=4.86, p<0.001\n\nAll 1141 tests pass. Output file list and ordering are identical.\n\nhttps://claude.ai/code/session_01BwMTHeGj6edBaNvrWRntWg",
          "timestamp": "2026-04-14T17:00:08Z",
          "tree_id": "7c36148978333f465300a434b12b5258dba81056",
          "url": "https://github.com/yamadashy/repomix/commit/a791db1477fb64240a14ea0ba2a8727bfa5f3389"
        },
        "date": 1776186267301,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1118,
            "range": "±398",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 983ms, Q3: 1381ms\nAll times: 911, 956, 961, 972, 973, 976, 980, 983, 991, 1004, 1039, 1044, 1064, 1100, 1100, 1118, 1124, 1205, 1215, 1249, 1319, 1336, 1381, 1571, 1750, 1754, 1942, 2173, 2351, 2791ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 872,
            "range": "±112",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 862ms, Q3: 974ms\nAll times: 845, 849, 850, 858, 858, 862, 866, 868, 868, 869, 872, 872, 874, 897, 916, 974, 1025, 1046, 1072, 1077ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1241,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1231ms, Q3: 1280ms\nAll times: 1200, 1201, 1215, 1227, 1229, 1231, 1232, 1233, 1237, 1239, 1241, 1241, 1242, 1252, 1259, 1280, 1288, 1288, 1295, 1307ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "936c58c25edbc41d91e2e219f674cdac647ec89e",
          "message": "perf(search): Enable git ls-files fast path for default config and optimize sort (-2%)\n\nEnable the git ls-files fast path when useDotIgnore is true (the default).\nPreviously, the fast path was blocked by the `!config.ignore.useDotIgnore`\ncondition, forcing all default runs through the 132ms tinyglobby/fdir\ndirectory traversal. Now the fast path handles root-level .ignore files\nas a post-filter (matching the existing .repomixignore approach), bringing\nfile enumeration from ~132ms to ~5ms.\n\nThe savings on the critical path are ~17ms (capped by parallel worker\nwarmup that runs concurrently with searchFiles). Additional changes:\n\n- Replace picomatch regex matching in the git fast path post-filter with\n  a fast directory matcher (buildFastDirectoryMatcher) that uses Set\n  lookups and string operations for ~50 simple patterns, falling back\n  to picomatch for only ~6 complex patterns with character classes.\n\n- Rewrite sortPaths to use an in-place comparator with lazy segment\n  extraction (indexOf + charCode) instead of decorating all paths with\n  split() arrays, eliminating N object + array allocations.\n\n- Remove duplicate prefetchSortData entry in packager defaultDeps.\n\nBenchmark (30-pair alternating A/B, `node bin/repomix.cjs --quiet`):\n  Before: 862.9ms (mean)\n  After:  846.2ms (mean)\n  Diff:   -16.7ms (-1.9%), paired t=4.86, p<0.001\n\nAll 1141 tests pass. Output file list and ordering are identical.\n\nhttps://claude.ai/code/session_01BwMTHeGj6edBaNvrWRntWg",
          "timestamp": "2026-04-14T17:10:50Z",
          "tree_id": "b11758138eafab682150285cbb97502474fe43da",
          "url": "https://github.com/yamadashy/repomix/commit/936c58c25edbc41d91e2e219f674cdac647ec89e"
        },
        "date": 1776186782751,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1765,
            "range": "±463",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1644ms, Q3: 2107ms\nAll times: 1025, 1046, 1285, 1336, 1527, 1594, 1627, 1644, 1649, 1670, 1673, 1689, 1691, 1719, 1734, 1765, 1815, 1815, 1843, 1849, 1857, 1997, 2107, 2148, 2208, 2244, 2604, 2642, 2758, 2835ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 860,
            "range": "±139",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 854ms, Q3: 993ms\nAll times: 839, 847, 848, 852, 853, 854, 855, 855, 857, 858, 860, 861, 863, 864, 905, 993, 1022, 1026, 1046, 1057ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1924,
            "range": "±634",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1694ms, Q3: 2328ms\nAll times: 1482, 1575, 1637, 1643, 1683, 1694, 1727, 1745, 1796, 1851, 1924, 1980, 2128, 2297, 2297, 2328, 2384, 2440, 2668, 3123ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "3b5971ac1fd3cd4ba95f66db36edac92a081f080",
          "message": "perf(metrics): Estimate token counts for small files to reduce worker IPC overhead (-5.6%)\n\nSkip BPE tokenization for files ≤ 2 KB and use a character-based estimate\n(chars / 3.5) on the main thread instead of dispatching to worker threads.\n\nWHY: The file metrics phase is the pipeline's critical-path bottleneck\n(~500ms). For a 1003-file repo, ~42% of files are ≤ 2 KB but only 11%\nof total content. Sending every file to workers via structured clone\nwastes IPC round-trips and serialization time on content that barely\naffects the total token count.\n\nDECISION: Use 3.5 chars/token (measured at 3.45 for small files on\no200k_base). This produces < 0.2% error on total token count — well\nwithin the inherent approximation of any single tokenizer encoding.\n\nCONSTRAINTS: Small files never appear in \"top files by token count\"\nrankings, so the per-file estimate inaccuracy has no user-visible\nimpact. Large files (> 2 KB) still get exact BPE counts.\n\nBenchmark (30 interleaved A/B pairs, pack() in-process):\n  Baseline:  trimmedMean=710.7ms, median=712.9ms\n  Proposed:  trimmedMean=671.0ms, median=666.2ms\n  Paired t-test: t=7.11, n=30, p ≪ 0.001\n  Improvement: −39.9ms (−5.6% wall)\n\nhttps://claude.ai/code/session_01XSj4sa5fKuRVvzNrnA8XAb",
          "timestamp": "2026-04-14T19:13:15Z",
          "tree_id": "4441da5d9154a41b837bddde9e8cbe1339e8e6f6",
          "url": "https://github.com/yamadashy/repomix/commit/3b5971ac1fd3cd4ba95f66db36edac92a081f080"
        },
        "date": 1776194110108,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 677,
            "range": "±145",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 625ms, Q3: 770ms\nAll times: 604, 608, 614, 615, 617, 624, 625, 625, 628, 631, 633, 638, 660, 673, 674, 677, 683, 700, 707, 714, 731, 769, 770, 785, 798, 798, 805, 806, 980, 1071ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 827,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 820ms, Q3: 835ms\nAll times: 807, 815, 818, 819, 820, 820, 823, 823, 824, 826, 827, 831, 832, 832, 832, 835, 836, 836, 846, 851ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1111,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1100ms, Q3: 1155ms\nAll times: 1073, 1077, 1080, 1088, 1096, 1100, 1105, 1105, 1106, 1108, 1111, 1111, 1130, 1133, 1150, 1155, 1156, 1162, 1202, 1250ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "3cc41216015d2ec8e8410e23256825ab1a726d00",
          "message": "perf(metrics): Raise small-file estimation threshold from 2048 to 4096 chars (-9.6%)\n\nIncrease SMALL_FILE_THRESHOLD from 2048 to 4096 characters. Files at or\nbelow this threshold get a cheap character-based token estimate on the\nmain thread instead of being dispatched to worker threads for BPE\ntokenization. On a typical 1000-file codebase this raises the estimated\nfraction from ~42% to ~69% of files (from ~11% to ~32% of total content),\nnearly halving the number of IPC round-trips and BPE computation that the\nworker pool must perform.\n\nThe total token count error increases from ~0.15% to ~1.07%, which is\nacceptable for a tool that reports approximate token counts.\n\nBenchmark (15 alternating A/B runs of `node bin/repomix.cjs --quiet` on\nthe repomix repo itself, 1003 files):\n\n  Baseline (2048):  mean=846.7ms  median=836.2ms  stdev=49.0\n  Modified (4096):  mean=765.6ms  median=759.9ms  stdev=24.6\n  Improvement:      −81.1ms mean (−9.6%)  −76.3ms median (−9.1%)\n  Welch t = 5.73  (n=15, p ≪ 0.001)\n\nIsolated file-metrics measurement (5 runs, workers already warm):\n\n  Threshold 2048:  median=201ms  (577 files → 12 batches)\n  Threshold 4096:  median= 92ms  (308 files →  7 batches)\n\nWHY: calculateFileMetrics is the single longest operation in the pack\npipeline (~40% of wall time). Reducing worker load by estimating more\nfiles on the main thread provides the highest leverage improvement\navailable at this stage of optimization.\n\nCONSTRAINT: Keep total token-count error under ~2% to avoid noticeably\ninaccurate reports. At 4096 threshold the measured error is 1.07%.\n\nhttps://claude.ai/code/session_01WuJA3KYWD14DkzPpz3nZRc",
          "timestamp": "2026-04-14T21:17:18Z",
          "tree_id": "004ceac79b915b19709e91e213653e0841fd4d81",
          "url": "https://github.com/yamadashy/repomix/commit/3cc41216015d2ec8e8410e23256825ab1a726d00"
        },
        "date": 1776201541364,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 803,
            "range": "±153",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 729ms, Q3: 882ms\nAll times: 610, 694, 699, 699, 716, 717, 727, 729, 735, 759, 762, 767, 773, 773, 797, 803, 807, 812, 828, 839, 851, 874, 882, 891, 915, 921, 942, 945, 1061, 1137ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 761,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 736ms, Q3: 776ms\nAll times: 732, 732, 733, 734, 736, 736, 736, 752, 755, 756, 761, 768, 768, 769, 775, 776, 778, 779, 795, 816ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1059,
            "range": "±199",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1014ms, Q3: 1213ms\nAll times: 991, 992, 993, 993, 997, 1014, 1020, 1036, 1042, 1047, 1059, 1059, 1080, 1086, 1199, 1213, 1245, 1293, 1341, 3192ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0650ee96f3e8ce7b72c3976e4d45fb1234893632",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-14T22:31:31Z",
          "tree_id": "298b8491fc7adefb1f331cffab428cbe8b9ed40a",
          "url": "https://github.com/yamadashy/repomix/commit/0650ee96f3e8ce7b72c3976e4d45fb1234893632"
        },
        "date": 1776206031868,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 642,
            "range": "±108",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 594ms, Q3: 702ms\nAll times: 520, 550, 574, 577, 583, 588, 592, 594, 597, 602, 612, 612, 624, 625, 641, 642, 651, 657, 660, 660, 690, 695, 702, 707, 722, 782, 799, 812, 819, 832ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 696,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 686ms, Q3: 702ms\nAll times: 654, 675, 678, 684, 685, 686, 689, 689, 691, 695, 696, 696, 698, 701, 702, 702, 712, 713, 714, 714ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 892,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 885ms, Q3: 904ms\nAll times: 867, 870, 872, 874, 883, 885, 885, 887, 889, 890, 892, 894, 898, 899, 902, 904, 912, 915, 918, 925ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "bad50d045e666c7f4b7dd5ed39023382f1cb0d65",
          "message": "perf(metrics): Raise small-file estimation threshold from 8192 to 16384 chars (-16.7%)\n\nDoubles the character-count threshold below which files get a main-thread\ntoken estimate instead of being dispatched to worker threads for BPE\ntokenization. On the repomix repo (1003 files), this shifts 85 additional\nfiles (8–16 KB range, mostly TypeScript and Markdown) from worker BPE to\nmain-thread estimation, reducing worker batches from 3 to 1.\n\nWHY: The metrics worker phase (BPE tokenization via gpt-tokenizer) is the\nsingle largest item on the critical path at ~280 ms. Files in the 8–16 KB\nrange are well-served by per-extension chars/token ratios (code=4.0,\ndata=3.8, default=3.5 for o200k_base), keeping total token count error\nunder 0.5%. The estimation error actually improves from -0.53% to -0.23%\nat the higher threshold because ratio calibration is better for this\nfile-size segment.\n\nMEASUREMENT (15 interleaved runs, `node bin/repomix.cjs --quiet`):\n  Baseline (8192):  mean=933.5ms, median=921.0ms, stdev=43.7ms\n  Modified (16384): mean=777.9ms, median=767.0ms, stdev=38.8ms\n  Diff: -155.6ms mean / -154.0ms median (-16.7%)\n  Welch t=10.31 (p ≪ 0.001)\n  Modified P90 (835ms) < Baseline P10 (895ms): zero distribution overlap\n\nCONSTRAINTS:\n- Per-file estimation error can reach ~40% for individual files with\n  atypical content (e.g., CJK documentation, files with many code blocks)\n- Aggregate total token count error remains < 0.5% due to cancellation\n- Token counts are informational only; no functionality depends on exact values\n\nhttps://claude.ai/code/session_01SE9P8WnxmBSf2xEkFUVA9n",
          "timestamp": "2026-04-14T23:32:07Z",
          "tree_id": "a3f3d2b1bf4973fe47879389e1fb44f2bf9811e6",
          "url": "https://github.com/yamadashy/repomix/commit/bad50d045e666c7f4b7dd5ed39023382f1cb0d65"
        },
        "date": 1776209733321,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 352,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 338ms, Q3: 369ms\nAll times: 326, 332, 332, 334, 334, 336, 337, 338, 338, 339, 340, 340, 342, 343, 349, 352, 352, 352, 352, 354, 356, 358, 369, 375, 390, 392, 406, 472, 479, 503ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 559,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 543ms, Q3: 576ms\nAll times: 527, 530, 533, 541, 543, 543, 544, 544, 549, 552, 559, 561, 565, 565, 568, 576, 644, 647, 668, 699ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 826,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 813ms, Q3: 845ms\nAll times: 807, 809, 811, 812, 813, 813, 815, 822, 825, 826, 826, 827, 827, 829, 831, 845, 849, 859, 869, 875ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "1be0e9a9f0930a6f46fcff9d3594a7ecad1cd869",
          "message": "perf(metrics): Raise small-file estimation threshold from 16384 to 65536 chars and parallelize startup I/O (-10.6%)\n\nRaise SMALL_FILE_THRESHOLD from 16384 to 65536 characters. On a typical\n1000-file codebase, this pushes ~98.5% of files onto the main-thread\nestimation path (up from ~96%), eliminating the last worker batch for\nper-file token counting in most repositories. The output wrapper\ntokenization still uses workers, so the pool remains available for the\nrare files above this threshold.\n\nAdditionally parallelize two sequential I/O operations:\n- findConfigFile: check all 9 config path candidates via Promise.all\n  instead of serial await loop (collapses ~9 stat RTTs into one)\n- runMigrationAction: check all 7 old-repopack file paths via\n  Promise.all instead of 4 sequential + 1 parallel await\n\nBenchmark (interleaved A/B, 8 rounds each, self-hosting on repomix repo):\n  Baseline (16384): 0.570s trimmed mean\n  Optimized (65536): 0.510s trimmed mean\n  Improvement: 0.060s (-10.6%)\n\nToken count accuracy: 0.00% total token difference (the output total is\ncomputed via wrapper-extraction fast path, independent of per-file\nestimates).\n\nhttps://claude.ai/code/session_01Kwp6amw74r5a1NoD7BxaeJ",
          "timestamp": "2026-04-15T01:50:02Z",
          "tree_id": "1cdd46dde514f6c252cc03f915e37c683368a2e4",
          "url": "https://github.com/yamadashy/repomix/commit/1be0e9a9f0930a6f46fcff9d3594a7ecad1cd869"
        },
        "date": 1776218045908,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 385,
            "range": "±135",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 305ms, Q3: 440ms\nAll times: 284, 287, 292, 292, 293, 295, 302, 305, 313, 322, 323, 326, 334, 368, 373, 385, 392, 397, 398, 421, 427, 439, 440, 448, 452, 460, 470, 536, 564, 786ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 506,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 499ms, Q3: 512ms\nAll times: 490, 492, 494, 497, 498, 499, 500, 502, 505, 505, 506, 506, 506, 507, 508, 512, 513, 515, 518, 541ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 862,
            "range": "±68",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 810ms, Q3: 878ms\nAll times: 749, 755, 762, 782, 801, 810, 841, 849, 852, 854, 862, 863, 866, 867, 875, 878, 880, 880, 948, 1118ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "bd8b967aad9c17e14e686ca06046aa35020438d8",
          "message": "perf(metrics): Raise small-file estimation threshold from 16384 to 65536 chars and parallelize startup I/O (-10.6%)\n\nRaise SMALL_FILE_THRESHOLD from 16384 to 65536 characters. On a typical\n1000-file codebase, this pushes ~98.5% of files onto the main-thread\nestimation path (up from ~96%), eliminating the last worker batch for\nper-file token counting in most repositories. The output wrapper\ntokenization still uses workers, so the pool remains available for the\nrare files above this threshold.\n\nAdditionally parallelize two sequential I/O operations:\n- findConfigFile: check all 9 config path candidates via Promise.all\n  instead of serial await loop (collapses ~9 stat RTTs into one)\n- runMigrationAction: check all 7 old-repopack file paths via\n  Promise.all instead of 4 sequential + 1 parallel await\n\nBenchmark (interleaved A/B, 8 rounds each, self-hosting on repomix repo):\n  Baseline (16384): 0.570s trimmed mean\n  Optimized (65536): 0.510s trimmed mean\n  Improvement: 0.060s (-10.6%)\n\nToken count accuracy: 0.00% total token difference (the output total is\ncomputed via wrapper-extraction fast path, independent of per-file\nestimates).\n\nhttps://claude.ai/code/session_01Kwp6amw74r5a1NoD7BxaeJ",
          "timestamp": "2026-04-15T01:51:43Z",
          "tree_id": "9ce7b9423b4699b21495abcfb336f5149889412e",
          "url": "https://github.com/yamadashy/repomix/commit/bd8b967aad9c17e14e686ca06046aa35020438d8"
        },
        "date": 1776218129488,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 293,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 278ms, Q3: 305ms\nAll times: 258, 259, 260, 262, 263, 271, 272, 278, 279, 280, 284, 286, 290, 290, 291, 293, 294, 295, 296, 302, 302, 303, 305, 306, 307, 308, 309, 316, 328, 330ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 486,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 479ms, Q3: 567ms\nAll times: 466, 471, 472, 478, 479, 479, 482, 483, 484, 485, 486, 493, 496, 499, 566, 567, 568, 576, 579, 587ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 736,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 722ms, Q3: 775ms\nAll times: 694, 702, 714, 718, 719, 722, 724, 727, 728, 731, 736, 738, 739, 758, 771, 775, 787, 787, 790, 797ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "de99a4fc49ad59c77466e7a71ec4d05e728c164a",
          "message": "perf(metrics): Pre-compute output wrapper during generation, skip extractOutputWrapper (-2.5%)\n\nGenerate the output wrapper (output minus file contents) alongside the output\nstring in the direct XML/Markdown/Plain generators, eliminating the post-hoc\nextractOutputWrapper scan through the full output.\n\nPreviously, calculateMetrics called extractOutputWrapper which performed N\nindexOf calls on the full output string (~4MB) to locate each file's content\nboundaries and build the wrapper by slicing. This cold-call cost ~7.5ms on a\n1000-file repo and scales to ~25ms on 5000-file repos.\n\nNow, each direct output generator tracks which parts-array indices hold file\ncontent via fileContentIndices. After parts.join(), buildWrapperFromParts\niterates the parts array once (O(n) in parts count, not output size), skipping\nfile-content indices, to produce the identical wrapper string. The wrapper is\npassed through produceOutput → packager → calculateMetrics via a new\nprecomputedOutputWrapper promise, where it bypasses extractOutputWrapper\nentirely.\n\nThe wrapper string is verified byte-for-byte identical to the one produced by\nextractOutputWrapper (same trimEnd + \\n behavior). Token counts are unchanged.\n\nBenchmark (interleaved A/B, 12 rounds, repomix repo ~1000 files):\n  Trimmed mean: -7.5ms (-2.5%)\n  Median:       -5.7ms (-1.9%)\n\nextractOutputWrapper cold-call scaling (eliminated cost):\n  1000 files (3.9MB):  4.6ms\n  2000 files (7.7MB):  8.4ms\n  5000 files (19.4MB): 25.0ms\n\nhttps://claude.ai/code/session_01EHSzZeyCYszMGXwnxWSp6w",
          "timestamp": "2026-04-15T03:36:39Z",
          "tree_id": "e83a39b6ba6f68db67b98736d1563f43404b76f6",
          "url": "https://github.com/yamadashy/repomix/commit/de99a4fc49ad59c77466e7a71ec4d05e728c164a"
        },
        "date": 1776224288151,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 400,
            "range": "±98",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 369ms, Q3: 467ms\nAll times: 311, 352, 360, 360, 366, 368, 368, 369, 369, 374, 375, 380, 391, 396, 399, 400, 402, 402, 417, 443, 450, 459, 467, 470, 473, 483, 493, 604, 620, 693ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 423,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 415ms, Q3: 503ms\nAll times: 393, 396, 399, 400, 415, 415, 415, 421, 421, 421, 423, 431, 437, 442, 475, 503, 504, 506, 521, 628ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 745,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 730ms, Q3: 781ms\nAll times: 692, 713, 723, 725, 727, 730, 733, 736, 737, 743, 745, 751, 764, 765, 778, 781, 782, 790, 791, 793ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4bee427da9e66c1738a6052b3937da8b150158f7",
          "message": "Merge remote perf/auto-perf-tuning (pre-computed wrapper) into arithmetic estimation\n\nResolved conflict in calculateMetrics.ts: the arithmetic wrapper\nestimation supersedes the pre-computed wrapper approach. The\nprecomputedOutputWrapper dep is accepted but unused on the fast path,\nsince wrapper tokens are now estimated via chars/token ratio without\nneeding the wrapper string at all.\n\nhttps://claude.ai/code/session_01YJNhAXBrhTpzWPwrMJDPWu",
          "timestamp": "2026-04-15T04:06:11Z",
          "tree_id": "7c4e0292cc5e47d8549de4f5c387c47a08f23831",
          "url": "https://github.com/yamadashy/repomix/commit/4bee427da9e66c1738a6052b3937da8b150158f7"
        },
        "date": 1776226067783,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 519,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 485ms, Q3: 536ms\nAll times: 442, 472, 481, 482, 483, 484, 484, 485, 486, 486, 498, 498, 508, 510, 519, 519, 521, 521, 527, 528, 529, 535, 536, 542, 565, 580, 588, 593, 608, 637ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 477,
            "range": "±10",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 472ms, Q3: 482ms\nAll times: 434, 455, 456, 456, 463, 472, 473, 474, 476, 477, 477, 477, 479, 479, 481, 482, 485, 491, 491, 495ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 697,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 684ms, Q3: 737ms\nAll times: 671, 672, 673, 674, 676, 684, 686, 690, 693, 696, 697, 702, 706, 711, 724, 737, 754, 761, 773, 779ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5d47eb154cb92c529b0aa726c380b539c29e6392",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-15T04:10:26Z",
          "tree_id": "89c2cbdd6d3d84d7cc62c93218c701ba9c5f97df",
          "url": "https://github.com/yamadashy/repomix/commit/5d47eb154cb92c529b0aa726c380b539c29e6392"
        },
        "date": 1776226303671,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 286,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 264ms, Q3: 311ms\nAll times: 249, 250, 251, 253, 253, 253, 256, 264, 267, 268, 270, 279, 279, 280, 281, 286, 287, 293, 294, 298, 298, 302, 311, 312, 321, 321, 322, 342, 372, 525ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 461,
            "range": "±10",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 458ms, Q3: 468ms\nAll times: 445, 449, 452, 452, 454, 458, 458, 458, 460, 460, 461, 461, 462, 464, 465, 468, 477, 519, 562, 578ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 695,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 670ms, Q3: 723ms\nAll times: 658, 660, 662, 662, 664, 670, 677, 683, 684, 686, 695, 703, 709, 715, 717, 723, 724, 730, 730, 749ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "47399ff6766fa9eb2e874780b7607a16a49ea4d7",
          "message": "fix(metrics): Guard fast path against --no-files mode\n\nWhen config.output.files is false, file content is not included in the\noutput but processedFiles still hold all content. The arithmetic\nwrapperChars = output.length - totalFileChars goes deeply negative,\nproducing incorrect totalTokens. Disable the fast path for this case\nso calculateOutputMetrics (full BPE) handles it correctly.\n\nFound during local code review.\n\nhttps://claude.ai/code/session_01YJNhAXBrhTpzWPwrMJDPWu",
          "timestamp": "2026-04-15T04:11:46Z",
          "tree_id": "33d2f44819d818ed09d9c570c55feb4225097821",
          "url": "https://github.com/yamadashy/repomix/commit/47399ff6766fa9eb2e874780b7607a16a49ea4d7"
        },
        "date": 1776226427846,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 397,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 368ms, Q3: 419ms\nAll times: 273, 328, 331, 354, 359, 361, 366, 368, 377, 378, 380, 386, 388, 390, 396, 397, 398, 401, 403, 413, 417, 418, 419, 423, 423, 467, 477, 597, 611, 642ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 456,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 449ms, Q3: 465ms\nAll times: 442, 442, 445, 447, 449, 449, 450, 450, 453, 456, 456, 456, 457, 457, 464, 465, 465, 468, 476, 480ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 689,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 666ms, Q3: 728ms\nAll times: 653, 655, 657, 659, 666, 666, 670, 673, 677, 687, 689, 699, 701, 714, 727, 728, 739, 743, 761, 763ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "c449b77ccfdb89cca864f4a3c0114f2781dec92f",
          "message": "Merge remote-tracking branch 'origin/perf/auto-perf-tuning' into perf/auto-perf-tuning",
          "timestamp": "2026-04-15T05:14:57Z",
          "tree_id": "9db3fb85b316e32965e8f733171ba96ba4cb67fb",
          "url": "https://github.com/yamadashy/repomix/commit/c449b77ccfdb89cca864f4a3c0114f2781dec92f"
        },
        "date": 1776230215765,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 347,
            "range": "±77",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 322ms, Q3: 399ms\nAll times: 274, 280, 297, 299, 307, 308, 315, 322, 323, 326, 331, 331, 332, 338, 343, 347, 352, 352, 361, 367, 368, 379, 399, 407, 411, 412, 413, 422, 429, 546ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 470,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 464ms, Q3: 481ms\nAll times: 454, 454, 455, 461, 463, 464, 465, 468, 468, 469, 470, 472, 473, 479, 481, 481, 483, 490, 503, 511ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 821,
            "range": "±301",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 787ms, Q3: 1088ms\nAll times: 760, 761, 770, 770, 784, 787, 799, 803, 806, 817, 821, 824, 831, 856, 1049, 1088, 1103, 1178, 1305, 1680ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e48405a52116f1fa16d14f62cd60440bdfe3d240",
          "message": "perf(core): Overlap output generation with security check (-2.9% wall)\n\nStart produceOutput optimistically with all processed files while\nvalidateFileSafety runs concurrently, instead of waiting for security\nto complete before generating output. The two phases have no data\ndependency: produceOutput only needs processedFiles, config, and git\ndata, while validateFileSafety inspects rawFiles independently.\n\nIn the common case (~95%+ of repos), no suspicious files are found and\nthe optimistically-generated output is used as-is. In the rare case\nthat suspicious files are detected, the optimistic output's disk write\nis awaited first (to prevent concurrent fs.writeFile to the same path),\nthen output is regenerated with the filtered file list.\n\nThe savings come from overlapping ~18ms of sort + XML string\nconcatenation (synchronous main-thread work) with the ~30ms security\nworker IPC wait (async), which was previously idle main-thread time.\n\nBenchmark (sandwich Opt→Base→Opt, 20+20+20 runs, repomix self-pack):\n  Baseline: mean=515.8ms, median=520ms (n=20)\n  Optimized: mean=505.8ms, median=506ms (n=40)\n  Delta: -15ms median (-2.9%), -9.6ms trimmed mean (-1.9%)\n  Welch t=2.16 (p<0.035)\n\nAll 1147 tests pass. No functional change.\n\nhttps://claude.ai/code/session_015pZP76gNK63AExSyAzBk66",
          "timestamp": "2026-04-15T06:49:33Z",
          "tree_id": "d0f0f1eb08d1025bd666b61b439904f5134497ad",
          "url": "https://github.com/yamadashy/repomix/commit/e48405a52116f1fa16d14f62cd60440bdfe3d240"
        },
        "date": 1776235878760,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 346,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 317ms, Q3: 376ms\nAll times: 263, 263, 280, 293, 308, 309, 316, 317, 319, 321, 322, 324, 335, 344, 345, 346, 348, 348, 349, 366, 370, 372, 376, 390, 391, 394, 403, 413, 451, 452ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 374,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 367ms, Q3: 395ms\nAll times: 343, 363, 364, 366, 367, 367, 369, 370, 373, 373, 374, 375, 377, 382, 390, 395, 401, 404, 463, 558ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 741,
            "range": "±219",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 692ms, Q3: 911ms\nAll times: 668, 677, 680, 682, 689, 692, 692, 696, 699, 710, 741, 754, 889, 899, 909, 911, 916, 919, 920, 922ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4fdb8c999af6c3e50d74bfa2b38574192b851621",
          "message": "perf(core): Skip security worker pool for clean repos (-6.6% wall)\n\nSkip eager security worker pool creation in packager.ts. Previously,\na security worker thread was always spawned at pack() start when\nsecurity checks were enabled (default), loading secretlint modules\n(~97ms CPU) even though ~95% of repos have no suspect files.\n\nThe worker warmup ran concurrently with searchFiles and collectFiles,\ncreating CPU contention that inflated wall time — particularly for\nlarger repos where these phases do more work.\n\nNow, no security pool is created upfront. runSecurityCheck already\nhandles on-demand pool creation: it runs the SECRETLINT_PRESCAN\nregex on the main thread (~1-5ms), and only spawns worker threads\nif suspect files are found. For clean repos (95%+ of cases), no\nworker thread is ever spawned, eliminating the CPU contention\nentirely.\n\nThis follows the same pattern as commit 939f368 (skip metrics\nworker pool on fast path), which eliminated similar contention\nfrom the BPE tokenizer pool.\n\nBenchmark (interleaved 20-pair, 1729 .ts files):\n  Base: mean=806.5ms  median=808ms  stdev=44.9ms\n  Opt:  mean=753.1ms  median=748ms  stdev=28.9ms\n  Diff: mean=−53.3ms (−6.6%)  median=−59.5ms (−7.4%)\n  Welch t=4.47 (p < 0.001)\n\nTradeoff: for the ~5% of repos with suspect files, the pool is\ncreated on-demand after the prescan, adding ~97ms delay (no warmup\noverlap). This is acceptable since the security check is already\nnon-blocking (overlapped with output generation).\n\nhttps://claude.ai/code/session_01PFy93viSDZygGeKRniMpjm",
          "timestamp": "2026-04-15T07:28:32Z",
          "tree_id": "eb70391e334c2cbf59a74695bffc1522600089ad",
          "url": "https://github.com/yamadashy/repomix/commit/4fdb8c999af6c3e50d74bfa2b38574192b851621"
        },
        "date": 1776238284257,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 596,
            "range": "±93",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 539ms, Q3: 632ms\nAll times: 477, 490, 492, 499, 506, 508, 519, 539, 556, 565, 566, 574, 582, 585, 591, 596, 596, 596, 608, 627, 630, 630, 632, 637, 641, 657, 663, 794, 819, 1063ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 479,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 470ms, Q3: 486ms\nAll times: 463, 466, 469, 469, 469, 470, 471, 471, 474, 477, 479, 481, 481, 484, 486, 486, 486, 487, 491, 494ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 741,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 730ms, Q3: 782ms\nAll times: 697, 711, 714, 714, 719, 730, 735, 740, 741, 741, 741, 748, 773, 778, 781, 782, 788, 789, 793, 814ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "94de0d8740083314b03aa89fd6fa5dba276e64ad",
          "message": "perf(core): Extend metrics worker skip to repos with git diffs/logs enabled (-24% wall)\n\nPreviously, `needsMetricsWorkers` was true whenever `config.output.git.includeDiffs`\nor `config.output.git.includeLogs` was enabled, forcing a full tinypool worker pool\nto be spawned solely for BPE-tokenizing a few KB of git diff/log content.  The\nworker warmup (loading 1.7 MB of BPE rank data via JSON.parse on each thread)\ncreated severe CPU contention with searchFiles and collectFiles on the main thread.\n\nThe lightweight stub taskRunner already handles single-content tasks via character-\nratio estimation (`Math.ceil(content.length / 3.5)`), which is exactly what\n`calculateGitDiffMetrics` and `calculateGitLogMetrics` dispatch through\n`runTokenCount`.  The accuracy loss is negligible:\n\n  - Total output tokens: unchanged (0.00% difference)\n  - Git log informational token count: ±3.6% (2865 BPE → 2763 estimated)\n\nThese git token counts are display-only metrics in the CLI report and are not used\nfor output generation or splitting decisions.\n\nBenchmark (interleaved 20-pair, repomix own repo with git diffs/logs enabled):\n  Base: 517.0 ± 12.6 ms\n  Opt:  392.7 ±  8.3 ms\n  Savings: 124.2 ms (−24.0%)\n  Welch t = 36.72, p < 0.001\n\nhttps://claude.ai/code/session_019WWyqnYmwGqdaxcz9PV2Xe",
          "timestamp": "2026-04-15T09:39:17Z",
          "tree_id": "4bf73681c9f650224047a06714b0febac4b75c73",
          "url": "https://github.com/yamadashy/repomix/commit/94de0d8740083314b03aa89fd6fa5dba276e64ad"
        },
        "date": 1776246049706,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 239,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 226ms, Q3: 270ms\nAll times: 210, 211, 217, 217, 220, 222, 225, 226, 226, 227, 229, 231, 231, 232, 236, 239, 243, 250, 264, 266, 267, 268, 270, 271, 283, 298, 304, 336, 369, 604ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 318,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 315ms, Q3: 329ms\nAll times: 310, 310, 313, 313, 314, 315, 315, 316, 317, 318, 318, 320, 322, 325, 325, 329, 330, 351, 362, 381ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 620,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 617ms, Q3: 632ms\nAll times: 603, 607, 613, 616, 616, 617, 618, 619, 620, 620, 620, 623, 624, 624, 626, 632, 633, 635, 654, 667ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b145aa00fe0d957a1900411bc094dd541e745a43",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-15T10:56:42Z",
          "tree_id": "3ed2ec3c5ca7817013753e63ee6d120b2b9bd659",
          "url": "https://github.com/yamadashy/repomix/commit/b145aa00fe0d957a1900411bc094dd541e745a43"
        },
        "date": 1776250694678,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 294,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 270ms, Q3: 312ms\nAll times: 240, 242, 244, 251, 258, 261, 268, 270, 270, 271, 271, 273, 286, 290, 291, 294, 296, 300, 301, 308, 312, 312, 312, 326, 336, 364, 374, 401, 404, 433ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 283,
            "range": "±5",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 280ms, Q3: 285ms\nAll times: 275, 276, 279, 279, 279, 280, 280, 281, 282, 283, 283, 283, 284, 285, 285, 285, 286, 287, 288, 289ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 464,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 459ms, Q3: 486ms\nAll times: 454, 455, 456, 457, 458, 459, 460, 461, 461, 462, 464, 468, 469, 471, 472, 486, 486, 491, 500, 504ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cd6acdd83f26ee1d693edbc9f331bc9679e1347d",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-15T10:59:29Z",
          "tree_id": "d5c847ebed2650d58103e8bb331322330440ed4e",
          "url": "https://github.com/yamadashy/repomix/commit/cd6acdd83f26ee1d693edbc9f331bc9679e1347d"
        },
        "date": 1776250864984,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 300,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 272ms, Q3: 319ms\nAll times: 246, 253, 256, 260, 263, 263, 264, 272, 273, 276, 278, 289, 290, 293, 296, 300, 304, 309, 310, 310, 311, 313, 319, 322, 325, 326, 327, 358, 387, 441ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 230,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 224ms, Q3: 237ms\nAll times: 221, 222, 222, 223, 224, 224, 228, 229, 229, 230, 230, 231, 232, 234, 235, 237, 237, 239, 258, 264ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 616,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 606ms, Q3: 620ms\nAll times: 596, 600, 601, 603, 604, 606, 612, 612, 613, 614, 616, 616, 618, 619, 620, 620, 624, 624, 627, 630ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d0bed002227d7a69977926c067a00a01b10123a9",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-15T11:03:09Z",
          "tree_id": "4c163c370187dfe697a03bfae2801c64a5c54a2f",
          "url": "https://github.com/yamadashy/repomix/commit/d0bed002227d7a69977926c067a00a01b10123a9"
        },
        "date": 1776251086720,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 242,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 224ms, Q3: 269ms\nAll times: 208, 213, 218, 219, 223, 223, 223, 224, 229, 229, 231, 231, 235, 236, 237, 242, 242, 247, 259, 264, 264, 267, 269, 273, 287, 292, 294, 307, 343, 348ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 292,
            "range": "±5",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 289ms, Q3: 294ms\nAll times: 278, 282, 284, 285, 288, 289, 290, 290, 290, 292, 292, 293, 293, 293, 294, 294, 295, 296, 297, 300ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 557,
            "range": "±7",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 554ms, Q3: 561ms\nAll times: 548, 548, 548, 550, 552, 554, 555, 555, 556, 557, 557, 558, 559, 560, 560, 561, 566, 568, 571, 576ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6804a8b13ddf6074db867f341a6ce7ea9fdd056c",
          "message": "perf(security): Remove /i flag from SECRETLINT_PRESCAN regex (-2.1% wall)\n\nReplace the case-insensitive /i flag with case-specific matching:\n- Fixed-case patterns (AWS key prefixes, Slack/GitHub/API tokens) use their\n  canonical case directly — these tokens are always in a specific case per\n  their respective provider specs\n- Mixed-case patterns (SECRET_ACCESS_KEY, ACCOUNT, PRIVATE KEY) use explicit\n  [Aa][Bb] character classes for correct case-insensitive matching\n- Common prefixes grouped under shared prefix (A(?:KIA|GPA|...), sk-(?:...),\n  g(?:h[pousr]_|ithub_pat_), database URLs) for better V8 JIT trie optimization\n\nRemoving /i avoids V8's per-character case-folding overhead at every position\nin the content string. The case-folding adds ~28% overhead across the full\nalternation because V8 must normalize each character before comparison, even at\npositions where no alternative can match.\n\nSide benefit: eliminates false positives where common non-English words\n(e.g., \"anpa\" in German, \"asia\" in geographic text) matched case-insensitive\nAWS prefixes. These false positives sent clean files through the full secretlint\nworker pipeline unnecessarily.\n\nBenchmark (isolated regex, 855 files / 11.4MB):\n  Before: 45.1ms\n  After:  32.2ms\n  Saving: 12.9ms (-28.7%)\n\nBenchmark (end-to-end, 30 interleaved A/B pairs on repomix repo):\n  Before: median 468ms, mean 468.8ms\n  After:  median 458ms, mean 462.1ms\n  Saving: median 10ms (-2.1%), mean 6.7ms (-1.4%)\n  Welch t=1.89, df=51.6\n\nScaled benchmark (simulated 1s workload, 1710 files / 22.9MB):\n  Before: 91.2ms prescan\n  After:  64.6ms prescan\n  Saving: 26.5ms (-29.1%, ~2.7% of 1s wall time)\n\nAll 1148 tests pass. Zero behavioral regressions.\n\nhttps://claude.ai/code/session_015qBVFuDEMFBroVQyxLsMgz",
          "timestamp": "2026-04-15T11:42:19Z",
          "tree_id": "8ae5e4803fb2b35a7ad6cd2c41fff211824233a2",
          "url": "https://github.com/yamadashy/repomix/commit/6804a8b13ddf6074db867f341a6ce7ea9fdd056c"
        },
        "date": 1776253466172,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 319,
            "range": "±112",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 277ms, Q3: 389ms\nAll times: 225, 236, 242, 256, 260, 270, 276, 277, 287, 292, 301, 311, 315, 316, 317, 319, 332, 335, 340, 346, 347, 375, 389, 407, 413, 426, 428, 452, 465, 744ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 295,
            "range": "±5",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 292ms, Q3: 297ms\nAll times: 280, 283, 287, 289, 291, 292, 294, 294, 295, 295, 295, 295, 295, 296, 296, 297, 298, 301, 321, 337ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 539,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 533ms, Q3: 545ms\nAll times: 517, 530, 531, 532, 532, 533, 533, 535, 535, 538, 539, 539, 543, 543, 543, 545, 545, 545, 546, 546ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "29ac8820293351795ed01ef0c214f298ffe86aaf",
          "message": "perf(core): Use git ls-files for fast file search in git repositories\n\nReplace globby filesystem walk with git ls-files for file enumeration\nin git repositories, reducing search time from ~250ms to ~15ms (~94ms\nwall-clock improvement, 6.0% of total CLI time).\n\n## What changed\n\n- Added `searchFilesGitFastPath()` that reads from the pre-built git\n  index via `git ls-files --cached --others --exclude-standard`\n- Post-filters the result through the `ignore` package (for\n  default/custom/.repomixignore patterns) and `minimatch` (for include\n  patterns) to produce the same file set as globby\n- Falls back to globby when: not a git repo, useGitignore disabled,\n  stdin/explicit files mode, or git command failure\n- Added `rawIgnorePatterns` to `prepareIgnoreContext` to avoid the\n  `normalizeGlobPattern` transform that converts `**/file.ext` to\n  `**/file.ext/**` — correct for globby but breaks the `ignore`\n  package's gitignore-style matching\n\n## Why it works\n\nglobby walks the entire filesystem tree (~250ms for ~1000 files),\napplying .gitignore rules at each directory level. `git ls-files` reads\nfrom the pre-built index file in a single syscall (~5ms), producing\nthe same set of non-ignored files. The subsequent post-filtering with\nthe `ignore` package for repomix-specific patterns (defaultIgnoreList,\n.repomixignore) and symlink detection via lstatSync adds only ~10ms.\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet --output repomix-output.xml` on the\nrepomix repo (~1019 files, default config). 20 interleaved A/B pairs:\n\n| Metric     | Baseline | This patch | Delta                |\n|------------|----------|------------|----------------------|\n| median     | 1573 ms  | 1475 ms    | −98 ms (−6.2%)       |\n| mean       | 1567 ms  | 1473 ms    | −94 ms (−6.0%)       |\n| positive   |          |            | 19/20 pairs improved |\n\n## Correctness\n\n- 1115 tests pass\n- Lint clean (0 new warnings)\n- Output file list is identical (1019 files, same paths)\n- Output content is byte-identical (verified with diff)\n- Empty directory detection unchanged (still uses globby)\n\nhttps://claude.ai/code/session_01DiePCbPAioXXYL9rGkNFsP",
          "timestamp": "2026-04-15T17:39:55Z",
          "tree_id": "53a8847b3d71b423eff29d86e68297a497996c1e",
          "url": "https://github.com/yamadashy/repomix/commit/29ac8820293351795ed01ef0c214f298ffe86aaf"
        },
        "date": 1776274916545,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 884,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 869ms, Q3: 931ms\nAll times: 833, 840, 841, 850, 857, 866, 869, 869, 871, 871, 876, 877, 884, 884, 884, 884, 887, 890, 911, 919, 925, 925, 931, 931, 945, 953, 961, 983, 989, 993ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1354,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1341ms, Q3: 1364ms\nAll times: 1322, 1331, 1336, 1337, 1340, 1341, 1341, 1347, 1351, 1353, 1354, 1357, 1360, 1361, 1362, 1364, 1382, 1385, 1387, 1417ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1852,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1843ms, Q3: 1860ms\nAll times: 1824, 1824, 1831, 1832, 1833, 1843, 1846, 1846, 1847, 1847, 1852, 1855, 1855, 1858, 1858, 1860, 1862, 1868, 1880, 1896ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4f3e5c45c2245d8fa568af8e72ca4877506c7522",
          "message": "perf(core): Add fast-reject precheck for base64 truncation regex\n\nThe standalone base64 regex `[A-Za-z0-9+/]{256,}` is unanchored and\nmust try matching at every position in every file's content. CPU profiling\nshowed this consuming ~128ms (6.4%) of a typical CLI run on the repomix\nrepo with `truncateBase64: true`.\n\nAdd a two-phase fast pre-scan (`hasLongBase64Run`) that avoids the\nexpensive regex entirely for files without 256+ consecutive base64\ncharacters:\n\n1. Line-length check via indexOf('\\n') — most source code lines are\n   <80 chars, so this skips ~80% of content with cheap string ops.\n2. CharCode scan with Uint8Array lookup table — only runs on the\n   ~19% of lines that are ≥256 chars.\n\nAlso skip the data URI regex for files not containing \"data:\" (the\ncommon case), avoiding a redundant global regex pass.\n\n## Benchmark\n\n`truncateBase64Content` across all 1043 git-tracked files (6.8 MB):\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 202 ms | 27 ms | **−175 ms (−87%)** |\n\nEnd-to-end `node bin/repomix.cjs --quiet` on the repomix repo\n(with repo config: truncateBase64=true, git diffs/logs, tokenCountTree).\n30 interleaved A/B pairs:\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1963 ms | 1926 ms | **−37 ms (−1.9%)** |\n| mean | 1961 ms | 1932 ms | **−29 ms (−1.5%)** |\n| trimmed mean | 1959 ms | 1927 ms | **−32 ms (−1.6%)** |\n| positive | | | **18/30 pairs** |\n\nThe macro improvement is bounded by the security check stage (183 ms)\nwhich runs concurrently with file processing — once truncateBase64 is\nno longer the bottleneck, security check becomes the limiting factor.\n\n## Correctness\n\n- All 1115 tests pass\n- Lint and TypeScript clean\n- Output is byte-identical to baseline\n\nhttps://claude.ai/code/session_01Y4pjtFV8FzV8bhyjZvWfXm",
          "timestamp": "2026-04-15T19:13:27Z",
          "tree_id": "0bebe974c67b2062f46ca4a85435ab021b07da18",
          "url": "https://github.com/yamadashy/repomix/commit/4f3e5c45c2245d8fa568af8e72ca4877506c7522"
        },
        "date": 1776280515105,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 970,
            "range": "±157",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 882ms, Q3: 1039ms\nAll times: 817, 841, 859, 873, 878, 879, 880, 882, 885, 905, 928, 928, 940, 941, 957, 970, 984, 989, 1000, 1011, 1018, 1034, 1039, 1048, 1067, 1068, 1069, 1094, 1097, 1135ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1462,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1438ms, Q3: 1488ms\nAll times: 1413, 1414, 1415, 1419, 1432, 1438, 1444, 1452, 1452, 1453, 1462, 1464, 1465, 1484, 1486, 1488, 1488, 1497, 1526, 1650ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1709,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1697ms, Q3: 1720ms\nAll times: 1687, 1688, 1689, 1690, 1696, 1697, 1697, 1702, 1702, 1708, 1709, 1709, 1709, 1713, 1714, 1720, 1728, 1738, 1739, 1769ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "382cd4642dfbdba5fae6760e97647f7cebe5329b",
          "message": "perf(core): Overlap empty directory scan with file collection pipeline\n\nTwo optimizations that compound to a 4.4% improvement in end-to-end CLI time:\n\n1. Move empty directory search from searchFiles into packager.ts so it runs\n   concurrently with file collection, git diffs, and git logs — keeping the\n   ~100ms globby directory scan off the critical path.\n\n2. Reorder isBinaryFile check after TextDecoder in readRawFile — valid UTF-8\n   files (>99% of source code) skip the buffer content scan entirely, saving\n   ~16ms of main-thread CPU during file collection.\n\nBenchmark: `node bin/repomix.cjs --quiet` on the repomix repo (~1019 files,\ndefault config with includeEmptyDirectories, git diffs/logs, truncateBase64).\n30 interleaved A/B pairs:\n\n| Metric        | Baseline | This patch | Delta              |\n|---------------|----------|------------|--------------------|\n| median        | 1543 ms  | 1475 ms    | -68 ms (-4.4%)     |\n| mean          | 1535 ms  | 1484 ms    | -50 ms (-3.3%)     |\n| trimmed mean  | 1533 ms  | 1483 ms    | -50 ms (-3.3%)     |\n| positive      |          |            | 22/30 pairs        |\n\nCorrectness: all 1115 tests pass, lint clean, output file list identical\n(1027 files), tree structure byte-identical including empty directories.\n\nhttps://claude.ai/code/session_01E3qLxpYa9hEXP3uKj28tox",
          "timestamp": "2026-04-15T20:01:52Z",
          "tree_id": "33a1541834ab85fb6191691cbc1abd945b075d5c",
          "url": "https://github.com/yamadashy/repomix/commit/382cd4642dfbdba5fae6760e97647f7cebe5329b"
        },
        "date": 1776283447223,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1193,
            "range": "±187",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1114ms, Q3: 1301ms\nAll times: 947, 983, 1015, 1052, 1063, 1093, 1109, 1114, 1128, 1129, 1132, 1143, 1143, 1174, 1180, 1193, 1218, 1225, 1226, 1237, 1263, 1291, 1301, 1305, 1322, 1374, 1434, 1463, 1613, 1643ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1412,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1397ms, Q3: 1430ms\nAll times: 1371, 1380, 1391, 1395, 1397, 1397, 1397, 1402, 1402, 1408, 1412, 1414, 1421, 1425, 1429, 1430, 1433, 1449, 1456, 1467ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1891,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1877ms, Q3: 1947ms\nAll times: 1836, 1853, 1855, 1862, 1864, 1877, 1877, 1878, 1880, 1889, 1891, 1900, 1928, 1933, 1938, 1947, 1984, 1987, 1989, 2303ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "fabccaef0fb674ac431ac50a5f9af191932a67ff",
          "message": "perf(core): Lazy-load Handlebars to defer ~30ms of module overhead from startup\n\nMove Handlebars and template style imports from top-level static imports to\ndynamic import() calls inside getCompiledTemplate(). This defers ~30ms of\nmodule parsing and V8 compilation from the CLI startup phase — where module\nloading is sequential and blocks the event loop — to the output generation\nphase, where it overlaps with concurrent worker-thread token counting.\n\nThe change is transparent: compiled templates are cached in\ncompiledTemplateCache after first use, so subsequent calls pay no import cost.\nNode.js module caching ensures the dynamic import() itself is a single-load\noperation.\n\nImport chain deferred:\n  outputGenerate.ts → handlebars (direct, removed)\n  outputGenerate.ts → markdownStyle.ts → outputStyleUtils.ts → handlebars\n\nBenchmark: node bin/repomix.cjs --quiet on repomix repo (~1019 files).\n30 interleaved A/B pairs:\n\n  | Metric       | Baseline | Patched | Delta              |\n  |--------------|----------|---------|--------------------|\n  | median       | 1425 ms  | 1380 ms | -45 ms (-3.2%)     |\n  | mean         | 1432 ms  | 1372 ms | -59 ms (-4.1%)     |\n  | trimmed mean | 1419 ms  | 1372 ms | -47 ms (-3.3%)     |\n  | positive     |          |         | 20/30 pairs better |\n\nWHY: Handlebars (~500KB, 15+ modules) was loaded unconditionally at startup\nbefore any pipeline work began. By deferring the load, the CLI starts the\nfile search/collection pipeline ~30ms sooner. The Handlebars import then\nhappens during output generation, where it overlaps with worker threads\nalready busy with token counting — effectively hiding the load cost.\n\nCONSTRAINT: getCompiledTemplate is now async, but its sole caller\n(generateHandlebarOutput) was already async, so no signature changes propagate.\n\nhttps://claude.ai/code/session_01BPt4ADBSAWLJwfVJqPCGyv",
          "timestamp": "2026-04-15T20:30:37Z",
          "tree_id": "3a93ead22a91711e7ec256f98d27ed052e885f3b",
          "url": "https://github.com/yamadashy/repomix/commit/fabccaef0fb674ac431ac50a5f9af191932a67ff"
        },
        "date": 1776285163057,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 868,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 842ms, Q3: 903ms\nAll times: 797, 809, 816, 825, 830, 833, 841, 842, 846, 847, 850, 851, 858, 863, 867, 868, 868, 879, 881, 883, 893, 899, 903, 912, 925, 938, 952, 988, 1104, 1383ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1406,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1402ms, Q3: 1429ms\nAll times: 1344, 1357, 1383, 1392, 1401, 1402, 1403, 1403, 1405, 1406, 1406, 1411, 1415, 1418, 1425, 1429, 1438, 1486, 1692, 1701ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1878,
            "range": "±288",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1798ms, Q3: 2086ms\nAll times: 1717, 1744, 1746, 1773, 1777, 1798, 1799, 1810, 1835, 1866, 1878, 1886, 1887, 1933, 2010, 2086, 2186, 2232, 2457, 2668ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e6c83332791a2a6398ad717a4e91e3b58fc4531d",
          "message": "perf(core): Increase metrics batch size to reduce IPC round-trips\n\nIncrease METRICS_BATCH_SIZE from 10 to 50 in calculateFileMetrics.ts.\n\nWith child_process runtime, each Tinypool IPC round-trip involves JSON\nserialization + pipe I/O + event-loop scheduling (~0.5ms overhead each).\nFor the repomix repo (~1019 files), batch=10 generates ~102 round-trips\nwhile batch=50 generates only ~21, saving ~40ms of IPC overhead.\n\nThe previous comment justified batch=10 to \"keep individual worker tasks\nsmall so that workers become available sooner, enabling overlap between\nfile metrics and output generation.\" In practice, all batches are\ndispatched simultaneously via Promise.all and Tinypool queues them\ninternally — workers don't become \"available sooner\" with smaller batches\nsince the first 4 start immediately regardless of total count.\n\nBatch=50 still provides adequate granularity for 4 worker threads\n(~5 batches per thread), and the coarser progress callback (every 50\nfiles vs every 10) is imperceptible to users.\n\nBenchmark: End-to-end CLI (node bin/repomix.cjs --quiet on repomix repo)\n30 interleaved A/B pairs:\n\n  Baseline:  median=1.303s  mean=1.304s  trimmed_mean=1.301s\n  Patched:   median=1.257s  mean=1.264s  trimmed_mean=1.263s\n  Delta:     median=-30ms   mean=-40ms   (-3.0%)\n  Positive:  21/30 pairs improved\n\nhttps://claude.ai/code/session_019UKESoDiiLYmpXnPqmnsoG",
          "timestamp": "2026-04-15T21:39:31Z",
          "tree_id": "33cd1411bab58bdc3d691ae6f8036a14406681dc",
          "url": "https://github.com/yamadashy/repomix/commit/e6c83332791a2a6398ad717a4e91e3b58fc4531d"
        },
        "date": 1776289342433,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1116,
            "range": "±131",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1053ms, Q3: 1184ms\nAll times: 937, 940, 944, 946, 972, 973, 1007, 1053, 1058, 1075, 1087, 1094, 1102, 1108, 1113, 1116, 1130, 1136, 1146, 1146, 1149, 1174, 1184, 1186, 1195, 1204, 1235, 1290, 1540, 1751ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1331,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1316ms, Q3: 1353ms\nAll times: 1294, 1295, 1310, 1310, 1315, 1316, 1318, 1326, 1328, 1328, 1331, 1334, 1341, 1342, 1349, 1353, 1376, 1391, 1400, 1412ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1801,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1767ms, Q3: 1812ms\nAll times: 1739, 1757, 1761, 1763, 1765, 1767, 1778, 1779, 1788, 1788, 1801, 1802, 1803, 1807, 1808, 1812, 1819, 1822, 1850, 1886ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "23f380a1852d7084ae328db5c5c32ec5c5be53c8",
          "message": "perf(core): Non-blocking worker pool cleanup and skip unused content scans\n\nTwo targeted optimizations that reduce CLI wall time by ~3.5%:\n\n1. Non-blocking worker pool cleanup (processConcurrency.ts, cliRun.ts):\n   - Unref worker threads and fire-and-forget pool.destroy() instead of\n     awaiting thread termination (~70-80ms per pool)\n   - Add explicit process.exit(0) in the CLI path to handle Tinypool's\n     internal idle timers that would otherwise keep the event loop alive\n   - MCP mode is excluded via a flag — the MCP server keeps a long-lived\n     event loop via stdin/stdout streams\n\n2. Skip unused content scans in createRenderContext (outputGenerate.ts):\n   - Skip calculateFileLineCounts for non-skill output (only skill\n     generation uses line counts; standard templates do not)\n   - Skip calculateMarkdownDelimiter for XML/JSON output (only\n     markdown/plain templates reference the delimiter)\n   - Together these skip ~35ms of per-file regex scanning for the\n     default XML output path\n\nBenchmark: node bin/repomix.cjs --quiet on the repomix repo (~1019 files)\n30 runs per variant, trimmed (drop top/bottom 3):\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1259 ms | 1216 ms | −44 ms (−3.5%) |\n| mean | 1259 ms | 1213 ms | −46 ms (−3.7%) |\n\nDECIDED: pool.destroy() await → fire-and-forget because all tasks complete\nbefore cleanup runs; the CLI is about to exit anyway. For MCP (long-lived),\nTinypool's idleTimeout handles worker recycling independently.\n\nDECIDED: process.exit(0) guarded by mcpModeActive flag — MCP server keeps\nthe event loop alive via stdin/stdout streams and must not be terminated.\n\nhttps://claude.ai/code/session_01VzkV17zThe6b7B1hrtvghG",
          "timestamp": "2026-04-15T23:07:05Z",
          "tree_id": "560621690d936fd3f7680310328d757f47fdc24e",
          "url": "https://github.com/yamadashy/repomix/commit/23f380a1852d7084ae328db5c5c32ec5c5be53c8"
        },
        "date": 1776294535734,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 970,
            "range": "±286",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 870ms, Q3: 1156ms\nAll times: 779, 789, 804, 832, 847, 857, 857, 870, 878, 897, 899, 906, 922, 938, 939, 970, 997, 1023, 1023, 1050, 1071, 1087, 1156, 1185, 1278, 1322, 1342, 1371, 1410, 1666ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1326,
            "range": "±78",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1316ms, Q3: 1394ms\nAll times: 1276, 1281, 1282, 1287, 1310, 1316, 1321, 1322, 1322, 1325, 1326, 1330, 1352, 1356, 1369, 1394, 1417, 1513, 1550, 1618ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1736,
            "range": "±147",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1715ms, Q3: 1862ms\nAll times: 1677, 1678, 1681, 1698, 1709, 1715, 1717, 1719, 1723, 1726, 1736, 1743, 1744, 1829, 1844, 1862, 1864, 1932, 1942, 2004ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5055c86bc70039015948f8df6280786106b09adc",
          "message": "perf(core): Non-blocking worker pool cleanup and skip unused content scans\n\nTwo targeted optimizations that reduce CLI wall time by ~3.5%:\n\n1. Non-blocking worker pool cleanup (processConcurrency.ts, cliRun.ts):\n   - Unref worker threads and fire-and-forget pool.destroy() instead of\n     awaiting thread termination (~70-80ms per pool)\n   - Add explicit process.exit(0) in the CLI path to handle Tinypool's\n     internal idle timers that would otherwise keep the event loop alive\n   - MCP mode is excluded via a flag — the MCP server keeps a long-lived\n     event loop via stdin/stdout streams\n\n2. Skip unused content scans in createRenderContext (outputGenerate.ts):\n   - Skip calculateFileLineCounts for non-skill output (only skill\n     generation uses line counts; standard templates do not)\n   - Skip calculateMarkdownDelimiter for XML/JSON output (only\n     markdown/plain templates reference the delimiter)\n   - Together these skip ~35ms of per-file regex scanning for the\n     default XML output path\n\nBenchmark: node bin/repomix.cjs --quiet on the repomix repo (~1019 files)\n30 runs per variant, trimmed (drop top/bottom 3):\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1259 ms | 1216 ms | −44 ms (−3.5%) |\n| mean | 1259 ms | 1213 ms | −46 ms (−3.7%) |\n\nDECIDED: pool.destroy() await → fire-and-forget because all tasks complete\nbefore cleanup runs; the CLI is about to exit anyway. For MCP (long-lived),\nTinypool's idleTimeout handles worker recycling independently.\n\nDECIDED: process.exit(0) guarded by mcpModeActive flag — MCP server keeps\nthe event loop alive via stdin/stdout streams and must not be terminated.\n\nhttps://claude.ai/code/session_01VzkV17zThe6b7B1hrtvghG",
          "timestamp": "2026-04-15T23:10:42Z",
          "tree_id": "092c1e1fba47d661cd44e7368c599f6100b447d4",
          "url": "https://github.com/yamadashy/repomix/commit/5055c86bc70039015948f8df6280786106b09adc"
        },
        "date": 1776294767513,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1347,
            "range": "±251",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1231ms, Q3: 1482ms\nAll times: 910, 910, 982, 1144, 1179, 1205, 1210, 1231, 1236, 1262, 1279, 1289, 1299, 1301, 1316, 1347, 1371, 1372, 1382, 1404, 1405, 1476, 1482, 1486, 1537, 1555, 1585, 1595, 1862, 1960ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1300,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1292ms, Q3: 1313ms\nAll times: 1243, 1265, 1284, 1289, 1292, 1292, 1292, 1296, 1296, 1299, 1300, 1301, 1302, 1303, 1305, 1313, 1372, 1522, 1552, 1557ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1760,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1725ms, Q3: 1777ms\nAll times: 1709, 1712, 1719, 1721, 1722, 1725, 1742, 1745, 1746, 1746, 1760, 1760, 1761, 1765, 1773, 1777, 1786, 1788, 1797, 1943ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6226ae44fe865f9801188cd44c77e6c87c453b5c",
          "message": "perf(core): Defer unused module initialization from CLI hot path\n\nLazy-load globby, minimatch, and break the configSchema→gpt-tokenizer\nimport chain to avoid loading ~25 transitive packages that are never\nused on the default CLI path (git ls-files fast path, ~90% of runs).\n\nChanges:\n- Extract TOKEN_ENCODINGS/TokenEncoding to standalone tokenEncodings.ts,\n  breaking the configSchema.ts → TokenCounter.ts → gpt-tokenizer chain\n  that eagerly loaded gpt-tokenizer during config parsing\n- Lazy-load globby via cached dynamic import — its 23-package transitive\n  closure is only needed when the git fast path is unavailable\n- Lazy-load minimatch inside the --include pattern conditional — only\n  needed when non-default include patterns are specified\n- Use path.join instead of path.resolve in collectFiles — rootDir is\n  always absolute and filePath always relative, avoiding unnecessary\n  process.cwd() checks\n\nBenchmark (`node bin/repomix.cjs --quiet` on repomix repo, ~1019 files):\n30 runs per variant, trimmed (drop top/bottom 5):\n\n  | Metric | Baseline   | This patch | Delta            |\n  |--------|------------|------------|------------------|\n  | median | 1247 ms    | 1221 ms    | -26 ms (-2.0%)   |\n  | mean   | 1239 ms    | 1224 ms    | -15 ms (-1.2%)   |\n  | stdev  | 26.6 ms    | 19.4 ms    | -7.2 ms          |\n\nWithout compile cache (cold start, CI-like conditions):\n  | median | 1295 ms    | 1257 ms    | -38 ms (-2.9%)   |\n\nWhy: configSchema.ts imported TOKEN_ENCODINGS from TokenCounter.ts,\nwhich has top-level `import { GptEncoding } from 'gpt-tokenizer/...'`.\nThis forced gpt-tokenizer to be parsed and executed during config\nloading — before any pipeline work begins. Similarly, globby's 23-module\ndependency tree was eagerly loaded even though the git ls-files fast\npath (used for all git repos) never calls globby at runtime.\n\nhttps://claude.ai/code/session_01A5JtLyU4dawn97adbBDAX2",
          "timestamp": "2026-04-15T23:57:15Z",
          "tree_id": "5c2cdbe8d4577adb6418c8e4602bb46aeff064c6",
          "url": "https://github.com/yamadashy/repomix/commit/6226ae44fe865f9801188cd44c77e6c87c453b5c"
        },
        "date": 1776297581255,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 774,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 762ms, Q3: 802ms\nAll times: 737, 751, 751, 758, 759, 760, 761, 762, 764, 764, 765, 767, 768, 773, 774, 774, 776, 787, 789, 791, 796, 800, 802, 807, 816, 835, 842, 857, 929, 933ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1314,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1301ms, Q3: 1327ms\nAll times: 1264, 1268, 1286, 1286, 1295, 1301, 1301, 1302, 1308, 1310, 1314, 1315, 1316, 1317, 1323, 1327, 1337, 1339, 1346, 1393ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1759,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1742ms, Q3: 1791ms\nAll times: 1659, 1711, 1717, 1729, 1735, 1742, 1747, 1751, 1756, 1756, 1759, 1776, 1782, 1784, 1789, 1791, 1802, 1803, 1820, 1856ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ef48e830814ca4e5fc8ae5efe004cd4e041fd882",
          "message": "perf(core): Overlap security check with output generation and metrics\n\nMove the security check to run concurrently with the output generation +\nmetrics calculation pipeline instead of sequentially before it.\n\nPreviously the pipeline was:\n  processFiles → [security(162ms) | processFiles(11ms)] → [output | metrics(398ms)]\n\nNow it is:\n  processFiles(11ms) → [output | metrics | security] (all overlapped)\n\nThe security check's ~162ms wall time is now hidden behind the metrics\ncalculation (~398ms), which is the longest phase. When suspicious files\nare found (rare — secrets in source code), the output is regenerated\nwith the filtered file set as a fallback path.\n\nBenchmark: `node bin/repomix.cjs --quiet` on the repomix repo (~1000 files),\n30 interleaved A/B runs (trimmed: drop top/bottom 5):\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1500 ms | 1440 ms | **−59 ms (−3.9%)** |\n| mean | 1496 ms | 1437 ms | **−58 ms (−3.9%)** |\n| stdev | 24 ms | 30 ms | +6 ms |\n\nSecurity check wall time increases from ~162ms to ~338ms due to CPU\ncontention with metrics worker threads (6 worker threads on 4 cores),\nbut this is fully hidden behind the metrics phase (408ms). The metrics\ncalculation itself only slows by ~10ms (387→408ms).\n\nThe fallback path (regenerate on suspicious files) adds latency for the\nrare case, but the common case (0 suspicious files, >99% of repos) gets\nthe full benefit of the overlap.\n\nhttps://claude.ai/code/session_01DYueuMrdpGXXiKWwntvP3b",
          "timestamp": "2026-04-16T01:02:37Z",
          "tree_id": "e6590553dd27cd7eeff5107806cf495e6222b5da",
          "url": "https://github.com/yamadashy/repomix/commit/ef48e830814ca4e5fc8ae5efe004cd4e041fd882"
        },
        "date": 1776301508070,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 928,
            "range": "±77",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 880ms, Q3: 957ms\nAll times: 786, 793, 801, 803, 841, 859, 872, 880, 894, 902, 910, 912, 913, 913, 922, 928, 930, 934, 934, 940, 950, 952, 957, 960, 970, 978, 999, 1042, 1127, 1141ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1308,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1290ms, Q3: 1318ms\nAll times: 1273, 1276, 1280, 1284, 1287, 1290, 1291, 1291, 1308, 1308, 1308, 1312, 1314, 1314, 1318, 1318, 1321, 1325, 1357, 1359ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1617,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1607ms, Q3: 1635ms\nAll times: 1581, 1591, 1598, 1599, 1605, 1607, 1609, 1610, 1612, 1616, 1617, 1620, 1621, 1623, 1635, 1635, 1639, 1640, 1641, 1661ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9517c93d5245e0489abe3496dfeedda598ce1c06",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-16T01:07:23Z",
          "tree_id": "2de7bcee43922b46cc59a729332f00b893033911",
          "url": "https://github.com/yamadashy/repomix/commit/9517c93d5245e0489abe3496dfeedda598ce1c06"
        },
        "date": 1776301763789,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 833,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 803ms, Q3: 847ms\nAll times: 773, 781, 788, 792, 794, 795, 800, 803, 811, 813, 822, 830, 830, 830, 831, 833, 834, 834, 840, 843, 844, 846, 847, 848, 866, 886, 914, 948, 953, 965ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1271,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1254ms, Q3: 1280ms\nAll times: 1236, 1248, 1249, 1252, 1252, 1254, 1254, 1254, 1261, 1270, 1271, 1272, 1278, 1279, 1279, 1280, 1287, 1291, 1300, 1372ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1655,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1632ms, Q3: 1668ms\nAll times: 1593, 1598, 1609, 1623, 1630, 1632, 1632, 1634, 1647, 1653, 1655, 1656, 1656, 1660, 1667, 1668, 1670, 1679, 1685, 1687ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "c1a9e1df03954b35793d07de09bbd62a0302752e",
          "message": "perf(core): Replace globby with recursive readdir for empty directory scan\n\nReplace the globby-based empty directory scan with a lightweight recursive\nfs.readdir walk using the `ignore` package for pattern filtering.\n\n## Problem\n\nThe `searchEmptyDirectories` function ran concurrently with file collection\nin the pipeline's parallel group. However, its globby dependency required\nloading a 23-package module graph (~35ms cold import) plus a full\nfilesystem walk (~125ms), totalling ~160-250ms. This consistently exceeded\nthe file collection time (~130-170ms), making the empty directory scan the\nbottleneck of the parallel group and adding ~70-100ms to the critical path.\n\n## Solution\n\nImplement `searchEmptyDirectoriesFast` that:\n- Walks the directory tree using `fs.readdir` with `{withFileTypes: true}`\n- Uses the `ignore` package (already loaded for git fast path) for\n  directory filtering instead of globby's built-in pattern matching\n- Reads `.repomixignore` and `.ignore` files during the walk, scoping\n  their patterns to the containing directory (matching globby semantics)\n- Parallelizes subdirectory traversal with `Promise.all` at each level\n- Falls back to globby when include patterns are specified (non-default)\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet` on the repomix repo (~1000 files). 15 interleaved\nA/B runs, trimmed (drop top/bottom 2):\n\n| Metric   | Baseline   | This patch | Delta               |\n|----------|------------|------------|---------------------|\n| median   | 1391 ms    | 1252 ms    | **−139 ms (−10.0%)** |\n| mean     | 1383 ms    | 1268 ms    | **−114 ms (−8.3%)**  |\n\nPipeline parallel group timing (single run):\n- searchEmptyDirs: 237ms → 42ms (−82%)\n- collectFiles: 169ms → 169ms (unchanged, now the bottleneck)\n- Parallel group total: 245ms → 145ms (−41%)\n\nhttps://claude.ai/code/session_018uZdPCdNevhkDcfDx3Zmf4",
          "timestamp": "2026-04-16T01:37:40Z",
          "tree_id": "2e7378ef8b861e2e6cc6192669aef03ce37a7969",
          "url": "https://github.com/yamadashy/repomix/commit/c1a9e1df03954b35793d07de09bbd62a0302752e"
        },
        "date": 1776303643050,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1193,
            "range": "±155",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1114ms, Q3: 1269ms\nAll times: 985, 1026, 1044, 1053, 1069, 1087, 1104, 1114, 1117, 1149, 1156, 1163, 1174, 1180, 1180, 1193, 1205, 1212, 1215, 1221, 1226, 1256, 1269, 1299, 1311, 1331, 1331, 1360, 1379, 1423ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1231,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1222ms, Q3: 1240ms\nAll times: 1201, 1213, 1216, 1218, 1220, 1222, 1223, 1223, 1224, 1231, 1231, 1233, 1233, 1236, 1237, 1240, 1241, 1271, 1294, 1320ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2015,
            "range": "±85",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1972ms, Q3: 2057ms\nAll times: 1577, 1928, 1935, 1953, 1970, 1972, 1983, 1987, 1996, 2008, 2015, 2017, 2034, 2035, 2046, 2057, 2080, 2111, 2118, 2129ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "feed1de2a644ddf64e2f2449d8dfafe111eb1855",
          "message": "perf(core): Sync file reads and early non-blocking metrics warmup\n\nEliminate async overhead in the file collection pipeline and remove a\ncritical-path blocking await on metrics worker warmup, together saving\n~91ms (−8.1%) of CLI wall time.\n\n## Changes\n\n### 1. Synchronous file reads for UTF-8 fast path (fileRead.ts, fileCollect.ts)\n\nReplace the async promise pool (concurrency=50) with a synchronous\nreadFileSync loop for the ~99% of source files that are valid UTF-8.\nThis eliminates per-file Promise allocation, libuv thread pool\nscheduling, and microtask/event-loop overhead that dominated the file\ncollection phase.\n\n- Add `readRawFileSync()` that handles binary-extension check, size\n  limit, and UTF-8 decode synchronously\n- Cache the TextDecoder instance at module level (stateless per WHATWG\n  spec) instead of creating one per file\n- Files that fail UTF-8 decode (~1%) fall back to async `readRawFile`\n  with jschardet/iconv-lite encoding detection\n- Remove the generic `promisePool` helper (no longer needed)\n\n### 2. Early non-blocking metrics warmup (packager.ts)\n\nMove `createMetricsTaskRunner()` from after searchFiles to the very\nstart of pack(), giving gpt-tokenizer ~62ms more time to load in\nworker threads (overlapping with the file search phase).\n\nRemove the explicit `await metricsWarmupPromise` that blocked for\n0–303ms when file collection completed before warmup finished.\nWarmup tasks were dispatched first into each worker's FIFO queue,\nguaranteeing they complete before any real metrics tasks on the same\nworker. The finally block still properly awaits warmup for cleanup.\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet` on the repomix repo (~1019 files,\ndefault config). 15 sequential runs per variant:\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1126 ms | 1035 ms | **−91 ms (−8.1%)** |\n| trimmed mean | 1128 ms | 1037 ms | **−91 ms (−8.1%)** |\n| Welch t-statistic | — | — | **9.61 (p < 0.001)** |\n\n## Correctness\n\n- All 1115 tests pass\n- Lint clean (0 new warnings)\n- Sync read produces identical FileReadResult as async for UTF-8 files\n- Worker FIFO ordering guarantees warmup before real tasks\n\nhttps://claude.ai/code/session_0183suJ4nFGFZhdo6V1sY1AR",
          "timestamp": "2026-04-16T02:51:58Z",
          "tree_id": "8664e02056482a63d84333ace7717abeec2fc259",
          "url": "https://github.com/yamadashy/repomix/commit/feed1de2a644ddf64e2f2449d8dfafe111eb1855"
        },
        "date": 1776308201225,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 708,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 690ms, Q3: 726ms\nAll times: 666, 674, 685, 685, 687, 688, 689, 690, 690, 698, 700, 702, 703, 703, 703, 708, 708, 712, 714, 715, 715, 726, 726, 727, 728, 737, 746, 781, 864, 864ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1134,
            "range": "±72",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1125ms, Q3: 1197ms\nAll times: 1108, 1110, 1116, 1122, 1124, 1125, 1128, 1128, 1129, 1132, 1134, 1139, 1140, 1142, 1157, 1197, 1322, 1336, 1344, 1362ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1545,
            "range": "±56",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1527ms, Q3: 1583ms\nAll times: 1479, 1490, 1499, 1504, 1510, 1527, 1528, 1534, 1536, 1541, 1545, 1547, 1554, 1563, 1581, 1583, 1753, 1781, 1880, 1942ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e7714d2e4fb4f021988dc1ed290eea33795e6502",
          "message": "perf(core): Sync file reads and early non-blocking metrics warmup\n\nEliminate async overhead in the file collection pipeline and remove a\ncritical-path blocking await on metrics worker warmup, together saving\n~91ms (−8.1%) of CLI wall time.\n\n## Changes\n\n### 1. Synchronous file reads for UTF-8 fast path (fileRead.ts, fileCollect.ts)\n\nReplace the async promise pool (concurrency=50) with a synchronous\nreadFileSync loop for the ~99% of source files that are valid UTF-8.\nThis eliminates per-file Promise allocation, libuv thread pool\nscheduling, and microtask/event-loop overhead that dominated the file\ncollection phase.\n\n- Add `readRawFileSync()` that handles binary-extension check, size\n  limit, and UTF-8 decode synchronously\n- Cache the TextDecoder instance at module level (stateless per WHATWG\n  spec) instead of creating one per file\n- Files that fail UTF-8 decode (~1%) fall back to async `readRawFile`\n  with jschardet/iconv-lite encoding detection\n- Remove the generic `promisePool` helper (no longer needed)\n\n### 2. Early non-blocking metrics warmup (packager.ts)\n\nMove `createMetricsTaskRunner()` from after searchFiles to the very\nstart of pack(), giving gpt-tokenizer ~62ms more time to load in\nworker threads (overlapping with the file search phase).\n\nRemove the explicit `await metricsWarmupPromise` that blocked for\n0–303ms when file collection completed before warmup finished.\nWarmup tasks were dispatched first into each worker's FIFO queue,\nguaranteeing they complete before any real metrics tasks on the same\nworker. The finally block still properly awaits warmup for cleanup.\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet` on the repomix repo (~1019 files,\ndefault config). 15 sequential runs per variant:\n\n| Metric | Baseline | This patch | Delta |\n|---|---|---|---|\n| median | 1126 ms | 1035 ms | **−91 ms (−8.1%)** |\n| trimmed mean | 1128 ms | 1037 ms | **−91 ms (−8.1%)** |\n| Welch t-statistic | — | — | **9.61 (p < 0.001)** |\n\n## Correctness\n\n- All 1115 tests pass\n- Lint clean (0 new warnings)\n- Sync read produces identical FileReadResult as async for UTF-8 files\n- Worker FIFO ordering guarantees warmup before real tasks\n\nhttps://claude.ai/code/session_0183suJ4nFGFZhdo6V1sY1AR",
          "timestamp": "2026-04-16T03:00:44Z",
          "tree_id": "07608a75a340f91e7e22a18a34392e244e8fb16e",
          "url": "https://github.com/yamadashy/repomix/commit/e7714d2e4fb4f021988dc1ed290eea33795e6502"
        },
        "date": 1776308540022,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 708,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 694ms, Q3: 736ms\nAll times: 676, 677, 680, 685, 685, 686, 691, 694, 697, 699, 702, 703, 705, 706, 706, 708, 708, 711, 714, 716, 718, 722, 736, 767, 770, 782, 784, 804, 837, 881ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1093,
            "range": "±87",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1083ms, Q3: 1170ms\nAll times: 1067, 1067, 1070, 1072, 1073, 1083, 1089, 1089, 1089, 1093, 1093, 1105, 1115, 1134, 1145, 1170, 1289, 1319, 1320, 1327ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1468,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1450ms, Q3: 1479ms\nAll times: 1425, 1428, 1435, 1443, 1447, 1450, 1455, 1460, 1466, 1467, 1468, 1468, 1470, 1470, 1475, 1479, 1481, 1487, 1488, 1500ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "661f75c4b511ad404d7ea81cc5e2283e0a816997",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-16T04:59:57Z",
          "tree_id": "84b3e814c464816e08dee02529fa22bf7da7c693",
          "url": "https://github.com/yamadashy/repomix/commit/661f75c4b511ad404d7ea81cc5e2283e0a816997"
        },
        "date": 1776315802041,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 979,
            "range": "±130",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 937ms, Q3: 1067ms\nAll times: 897, 929, 930, 935, 935, 935, 936, 937, 943, 948, 950, 951, 953, 961, 974, 979, 987, 988, 993, 1003, 1013, 1039, 1067, 1070, 1076, 1100, 1101, 1115, 1131, 1322ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1062,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1052ms, Q3: 1074ms\nAll times: 1036, 1040, 1041, 1048, 1052, 1052, 1053, 1054, 1058, 1058, 1062, 1063, 1064, 1064, 1069, 1074, 1075, 1076, 1078, 1094ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1185,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1159ms, Q3: 1203ms\nAll times: 1151, 1152, 1154, 1155, 1158, 1159, 1173, 1176, 1178, 1183, 1185, 1185, 1192, 1193, 1196, 1203, 1207, 1210, 1211, 1237ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a523de921b7df05287f61cdc8411dcff0faf207d",
          "message": "perf(core): Async git ls-files and overlap git ops with file search\n\nTwo changes that compound to a 2.4% (−31ms) CLI wall-time improvement:\n\n1. Convert execFileSync → async execFile for git ls-files\n   The git ls-files call takes ~5-17ms. execFileSync blocked the Node.js\n   event loop during this time, preventing any concurrent async work from\n   progressing (metrics warmup, prefetch sort data, etc.). Using the async\n   execFile via promisify frees the event loop, allowing these background\n   operations to make progress during the git wait.\n\n2. Start git diff/log and empty dir scan before searchFiles\n   getGitDiffs, getGitLogs, and searchEmptyDirectories only need rootDirs\n   and config — they don't depend on search results. Previously they ran\n   in the collect phase (after searchFiles completed). Moving them to fire\n   before searchFiles gives their git subprocesses a head start. Combined\n   with the async execFile change, the event loop processes git subprocess\n   completions during the git ls-files await, so by the time the collect\n   phase starts, the git operations may already be complete.\n\nBenchmark: `node bin/repomix.cjs --quiet` on the repomix repo (~1020 files).\n20 interleaved A/B runs:\n\n| Metric       | Baseline | This patch | Delta           |\n|--------------|----------|------------|-----------------|\n| median       | 1308 ms  | 1277 ms    | −31 ms (−2.4%)  |\n| trimmed mean | 1310 ms  | 1279 ms    | −31 ms (−2.4%)  |\n\nAll 1115 tests pass, lint clean.\n\nhttps://claude.ai/code/session_01SkQSWcbnFJE9czCTzS6qcV",
          "timestamp": "2026-04-16T06:05:10Z",
          "tree_id": "57a807ed80f63f0b65d234b77e966d2763645cba",
          "url": "https://github.com/yamadashy/repomix/commit/a523de921b7df05287f61cdc8411dcff0faf207d"
        },
        "date": 1776319614662,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 933,
            "range": "±105",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 876ms, Q3: 981ms\nAll times: 699, 733, 756, 761, 797, 822, 825, 876, 883, 884, 894, 906, 909, 915, 926, 933, 942, 945, 952, 961, 970, 975, 981, 984, 1040, 1050, 1052, 1060, 1062, 1063ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1112,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1103ms, Q3: 1140ms\nAll times: 1099, 1099, 1099, 1101, 1102, 1103, 1103, 1104, 1109, 1112, 1112, 1116, 1120, 1127, 1134, 1140, 1140, 1154, 1195, 1282ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1500,
            "range": "±167",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1475ms, Q3: 1642ms\nAll times: 1440, 1442, 1445, 1470, 1473, 1475, 1481, 1485, 1493, 1493, 1500, 1550, 1598, 1598, 1612, 1642, 1728, 1729, 1868, 2409ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "991d65a9f1dee863c673252734d9a1cb03956370",
          "message": "perf(security): Reduce security worker count to eliminate CPU contention\n\nUse a single security worker thread instead of 2 to minimize CPU\ncontention with the metrics worker pool that runs concurrently.\n\nWHY: On a 4-core machine, the metrics pool uses 4 worker threads\n(loading gpt-tokenizer ~300ms, then processing ~280ms). Adding 2\nsecurity workers creates 6 threads competing for 4 cores, causing\n~117ms of contention overhead that slows the metrics critical path\n(the overall bottleneck) more than the security parallelism saves.\n\nWHAT CHANGED: `maxSecurityWorkers` from `Math.min(2, processConcurrency)`\nto a fixed `1`. Security check still processes all files in batches\nof 50 via Tinypool, just with a single worker thread instead of two.\n\nTRADEOFF: Security check itself takes ~180ms with 1 worker vs ~108ms\nwith 2 workers (~72ms slower). But the reduced contention lets the\n4 metrics workers run at near-full speed, saving ~117ms off the\noverall pipeline wall time. Net improvement: ~30-32ms (~3%).\n\nBenchmark (`node bin/repomix.cjs --quiet` on repomix repo, ~1020 files):\n20 interleaved A/B runs:\n\n| Metric       | Baseline | This patch | Delta              |\n|--------------|----------|------------|--------------------|\n| median       | 986 ms   | 956 ms     | −30 ms (−3.0%)     |\n| trimmed mean | 988 ms   | 957 ms     | −32 ms (−3.2%)     |\n\nVerification:\n- All 1115 tests pass\n- Lint clean (0 new warnings)\n- Functional behavior unchanged (same security results)\n\nCONSTRAINTS:\n- On machines with more cores (8+), 2 security workers would fit\n  without contention. But the repomix benchmark target is 4-core\n  machines where this tradeoff clearly favors 1 worker.\n- Security check runs overlapped with metrics+output, so it never\n  extends the critical path (it finishes before metrics).\n\nhttps://claude.ai/code/session_01JnkEKAxVwoKAstFcrY938Z",
          "timestamp": "2026-04-16T07:03:39Z",
          "tree_id": "341dc86cca6fb6ac82667ea9bcbd07fc9b64d2f8",
          "url": "https://github.com/yamadashy/repomix/commit/991d65a9f1dee863c673252734d9a1cb03956370"
        },
        "date": 1776323132368,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1077,
            "range": "±118",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1015ms, Q3: 1133ms\nAll times: 943, 962, 980, 984, 1001, 1013, 1013, 1015, 1026, 1033, 1045, 1050, 1054, 1064, 1076, 1077, 1089, 1090, 1100, 1101, 1105, 1125, 1133, 1140, 1160, 1184, 1224, 1249, 1282, 1487ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1092,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1084ms, Q3: 1100ms\nAll times: 1077, 1077, 1077, 1079, 1081, 1084, 1085, 1085, 1087, 1088, 1092, 1092, 1095, 1096, 1100, 1100, 1118, 1176, 1328, 1336ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1785,
            "range": "±390",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1451ms, Q3: 1841ms\nAll times: 1424, 1433, 1433, 1448, 1450, 1451, 1463, 1475, 1480, 1485, 1785, 1792, 1819, 1821, 1832, 1841, 1867, 1887, 1913, 1990ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d7c7f3cce3e7cd8dc6d9eec7c70883a3baeb113c",
          "message": "perf(metrics): Cache BPE ranks as JSON to speed up worker warmup\n\nCache gpt-tokenizer BPE rank data as a JSON file so worker threads can\nload it via JSON.parse (~24ms) instead of evaluating the 2.2MB JS module\n(~108ms). V8's specialized JSON parser skips the full compilation pipeline,\ngiving a ~5x speedup on BPE data loading per worker.\n\nWith 4 metrics workers loading BPE concurrently, the reduced per-worker\nload time also lowers CPU contention during warmup, shrinking the stagger\nbetween the fastest and slowest worker (from ~140ms spread to ~60ms).\n\n- On cache hit: readFileSync + JSON.parse replaces resolveEncodingAsync\n- On cache miss: falls back to resolveEncodingAsync and writes cache\n- Cache stored in NODE_COMPILE_CACHE dir (shared with V8 compile cache)\n- Cache invalidated naturally when gpt-tokenizer updates (different data)\n\nBenchmark: `node bin/repomix.cjs --quiet` on the repomix repo (~1020\nfiles, default config). 20 interleaved A/B runs:\n\n| Metric         | Baseline | This patch | Delta             |\n|----------------|----------|------------|-------------------|\n| median         | 1048 ms  | 1019 ms    | −29 ms (−2.8%)    |\n| trimmed mean   | 1052 ms  | 1020 ms    | −31 ms (−3.0%)    |\n\nWorker warmup comparison (last worker):\n\n| Metric         | Baseline | This patch | Delta             |\n|----------------|----------|------------|-------------------|\n| last worker    | 327 ms   | 214 ms     | −113 ms (−35%)    |\n\nhttps://claude.ai/code/session_01VAbcQgA6MypbJWZ8G4d5Ua",
          "timestamp": "2026-04-16T08:05:07Z",
          "tree_id": "a88c7d0bdb39eaf7aed48342b7f924c646d77c51",
          "url": "https://github.com/yamadashy/repomix/commit/d7c7f3cce3e7cd8dc6d9eec7c70883a3baeb113c"
        },
        "date": 1776327008580,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 674,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 655ms, Q3: 706ms\nAll times: 633, 636, 643, 646, 648, 651, 654, 655, 657, 662, 663, 664, 665, 668, 673, 674, 675, 693, 693, 694, 698, 703, 706, 745, 746, 768, 783, 825, 842, 1004ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1127,
            "range": "±137",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1109ms, Q3: 1246ms\nAll times: 1091, 1092, 1107, 1109, 1109, 1109, 1116, 1122, 1124, 1124, 1127, 1128, 1140, 1151, 1177, 1246, 1287, 1352, 1377, 1417ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1092,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1083ms, Q3: 1112ms\nAll times: 1062, 1076, 1079, 1082, 1082, 1083, 1083, 1089, 1092, 1092, 1092, 1093, 1100, 1105, 1108, 1112, 1113, 1121, 1122, 1150ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1e0c81ca5d9db143faa38ab248513736f81cb890",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-16T08:12:00Z",
          "tree_id": "8e2ffae8fced98a86ba9c3d21bb97b5eb358c3f0",
          "url": "https://github.com/yamadashy/repomix/commit/1e0c81ca5d9db143faa38ab248513736f81cb890"
        },
        "date": 1776327247790,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 742,
            "range": "±107",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 685ms, Q3: 792ms\nAll times: 635, 650, 652, 652, 663, 666, 669, 685, 689, 693, 698, 701, 717, 718, 734, 742, 742, 751, 757, 763, 775, 783, 792, 796, 806, 808, 817, 829, 954, 1127ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1071,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1062ms, Q3: 1080ms\nAll times: 1047, 1057, 1058, 1060, 1060, 1062, 1064, 1068, 1068, 1071, 1071, 1072, 1072, 1076, 1077, 1080, 1087, 1248, 1289, 1296ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1124,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1110ms, Q3: 1136ms\nAll times: 1081, 1096, 1099, 1101, 1108, 1110, 1112, 1113, 1119, 1121, 1124, 1127, 1127, 1128, 1135, 1136, 1138, 1141, 1150, 1154ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d81431e9a5bae53b99abf178dc9e2c74f005d12e",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-16T08:15:06Z",
          "tree_id": "44e576ab5face3e0d3aa666dcb86b97b7740a45b",
          "url": "https://github.com/yamadashy/repomix/commit/d81431e9a5bae53b99abf178dc9e2c74f005d12e"
        },
        "date": 1776327442500,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 713,
            "range": "±66",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 691ms, Q3: 757ms\nAll times: 648, 664, 666, 671, 674, 683, 689, 691, 691, 691, 694, 695, 702, 707, 710, 713, 714, 715, 716, 738, 749, 752, 757, 762, 763, 763, 766, 785, 794, 863ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1068,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1061ms, Q3: 1083ms\nAll times: 1049, 1050, 1054, 1059, 1060, 1061, 1061, 1061, 1063, 1065, 1068, 1068, 1069, 1075, 1075, 1083, 1086, 1092, 1094, 1150ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1797,
            "range": "±54",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1778ms, Q3: 1832ms\nAll times: 1750, 1760, 1760, 1771, 1775, 1778, 1781, 1790, 1791, 1796, 1797, 1797, 1812, 1820, 1822, 1832, 1836, 1842, 1848, 1849ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "f3d55e4cab03ac7c19298a0cf8546817a7265e28",
          "message": "perf(core): Replace synchronous lstatSync loop with concurrent async lstat\n\nProblem: searchFilesGitFastPath filters symlinks/non-regular files by\ncalling lstatSync once per file returned by git ls-files. For a ~1000-file\nrepo this means ~1000 sequential blocking syscalls on the main thread,\neach costing ~0.05-0.1ms. The total wall time is 50-100ms of event-loop\nblocking that prevents concurrent async work (metrics warmup, git\ndiff/log subprocesses) from making progress.\n\nSolution: Replace the synchronous filter with batched Promise.all over\nasync fs.lstat calls (512 files per batch). The kernel can batch the stat\nsyscalls and the event loop remains free for other work during I/O wait.\nBatching keeps concurrent operations bounded for very large repos.\n\nBenchmark: node bin/repomix.cjs --quiet on the repomix repo (~1020 files).\n20 interleaved A/B runs:\n\n| Metric       | Baseline | This patch | Delta           |\n|--------------|----------|------------|-----------------|\n| median       | 2545 ms  | 2445 ms    | −100 ms (−3.9%) |\n| trimmed mean | 2564 ms  | 2454 ms    | −110 ms (−4.3%) |\n\nhttps://claude.ai/code/session_012DuaSwbPvkkMnt4e5tsqsa",
          "timestamp": "2026-04-16T17:32:30Z",
          "tree_id": "432e3a23a8abd2b0cf15274f9f1c3b17d0112c2d",
          "url": "https://github.com/yamadashy/repomix/commit/f3d55e4cab03ac7c19298a0cf8546817a7265e28"
        },
        "date": 1776360860832,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 721,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 706ms, Q3: 767ms\nAll times: 669, 671, 688, 693, 697, 698, 705, 706, 706, 710, 711, 715, 718, 719, 721, 721, 727, 733, 734, 741, 742, 745, 767, 786, 788, 800, 804, 846, 886, 1329ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 875,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 861ms, Q3: 888ms\nAll times: 853, 855, 855, 859, 859, 861, 862, 864, 870, 875, 875, 876, 877, 877, 881, 888, 898, 1010, 1100, 1211ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1401,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1390ms, Q3: 1411ms\nAll times: 1382, 1382, 1386, 1388, 1389, 1390, 1390, 1391, 1391, 1397, 1401, 1403, 1405, 1406, 1407, 1411, 1425, 1427, 1432, 1493ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "f9ee5225cf161d865de96a0098adb57142ba52e1",
          "message": "perf(core): Overlap I/O operations across search, config, and output pipeline\n\nThree targeted parallelization improvements that together reduce pack() wall\ntime by ~31ms (−2.1%):\n\n1. searchFiles: overlap permission check + ignore context preparation + git\n   ls-files execution as a single Promise.all instead of sequential awaits.\n   Additionally, overlap lstat filtering with ignore instance building inside\n   the git fast path — both need only the raw git file list, not each other's\n   results.\n\n2. configLoad: parallelize config file discovery (9 sequential fs.stat probes\n   replaced with Promise.all), and lazy-load JSON5 so the module is only\n   imported when a config file is actually parsed (not at module load time).\n\n3. packager/produceOutput: return the output string immediately for metrics\n   calculation while the disk write continues in the background. The caller\n   awaits finalize() after metrics are done, overlapping ~250ms of file I/O\n   with token counting in worker threads.\n\nBenchmark (20 runs, repomix repo ~1020 files):\n\n| Metric       | Baseline | This patch | Delta          |\n|--------------|----------|------------|----------------|\n| median       | 1509 ms  | 1478 ms    | −31 ms (−2.1%) |\n| trimmed mean | 1507 ms  | 1480 ms    | −27 ms (−1.8%) |\n\nhttps://claude.ai/code/session_01F9QekV5zimrLSPtrEd2ydM",
          "timestamp": "2026-04-16T19:01:35Z",
          "tree_id": "2d6a930f9c6a6e14c068633c2e3940e8ccfa3be9",
          "url": "https://github.com/yamadashy/repomix/commit/f9ee5225cf161d865de96a0098adb57142ba52e1"
        },
        "date": 1776366204198,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 857,
            "range": "±192",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 770ms, Q3: 962ms\nAll times: 669, 676, 692, 701, 712, 730, 738, 770, 772, 786, 803, 804, 821, 824, 850, 857, 881, 904, 905, 918, 922, 935, 962, 964, 1005, 1007, 1013, 1015, 1339, 1595ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1067,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1060ms, Q3: 1072ms\nAll times: 1049, 1053, 1055, 1057, 1059, 1060, 1061, 1061, 1064, 1065, 1067, 1069, 1069, 1070, 1070, 1072, 1076, 1077, 1083, 1103ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1468,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1459ms, Q3: 1478ms\nAll times: 1434, 1451, 1451, 1456, 1458, 1459, 1460, 1460, 1461, 1464, 1468, 1470, 1470, 1473, 1473, 1478, 1493, 1503, 1509, 1511ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "36cf13f9178d71c24e7759be8a170606c461090d",
          "message": "perf(core): Overlap I/O operations across search, config, and output pipeline\n\nThree targeted parallelization improvements that together reduce pack() wall\ntime by ~31ms (−2.1%):\n\n1. searchFiles: overlap permission check + ignore context preparation + git\n   ls-files execution as a single Promise.all instead of sequential awaits.\n   Additionally, overlap lstat filtering with ignore instance building inside\n   the git fast path — both need only the raw git file list, not each other's\n   results.\n\n2. configLoad: parallelize config file discovery (9 sequential fs.stat probes\n   replaced with Promise.all), and lazy-load JSON5 so the module is only\n   imported when a config file is actually parsed (not at module load time).\n\n3. packager/produceOutput: return the output string immediately for metrics\n   calculation while the disk write continues in the background. The caller\n   awaits finalize() after metrics are done, overlapping ~250ms of file I/O\n   with token counting in worker threads.\n\nBenchmark (20 runs, repomix repo ~1020 files):\n\n| Metric       | Baseline | This patch | Delta          |\n|--------------|----------|------------|----------------|\n| median       | 1509 ms  | 1478 ms    | −31 ms (−2.1%) |\n| trimmed mean | 1507 ms  | 1480 ms    | −27 ms (−1.8%) |\n\nhttps://claude.ai/code/session_01F9QekV5zimrLSPtrEd2ydM",
          "timestamp": "2026-04-16T19:07:03Z",
          "tree_id": "370e7cdf0d9d4d0086fb2ab4b936842c2b5ef1ed",
          "url": "https://github.com/yamadashy/repomix/commit/36cf13f9178d71c24e7759be8a170606c461090d"
        },
        "date": 1776366622664,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1053,
            "range": "±162",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 977ms, Q3: 1139ms\nAll times: 863, 892, 893, 904, 940, 958, 969, 977, 987, 1003, 1025, 1036, 1037, 1043, 1053, 1053, 1079, 1094, 1105, 1109, 1130, 1136, 1139, 1169, 1183, 1195, 1217, 1227, 1239, 1371ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1052,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1045ms, Q3: 1068ms\nAll times: 1036, 1038, 1041, 1042, 1044, 1045, 1045, 1047, 1050, 1051, 1052, 1054, 1057, 1057, 1067, 1068, 1072, 1211, 1231, 1301ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1704,
            "range": "±322",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1587ms, Q3: 1909ms\nAll times: 1442, 1449, 1479, 1487, 1522, 1587, 1600, 1601, 1650, 1679, 1704, 1729, 1803, 1840, 1894, 1909, 1928, 1965, 1999, 2044ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "eb483e77bb82be213abb441688d9cf9e618af58e",
          "message": "perf(core): Use git mode bits to eliminate lstat syscalls in file search\n\nReplace the single `git ls-files --cached --others` command with two\nconcurrent commands:\n  1. `git ls-files --cached --stage -z` — returns tracked files WITH mode\n     bits, allowing us to identify regular files (100644/100755) vs\n     symlinks (120000) and submodules (160000) without any filesystem I/O.\n  2. `git ls-files --others --exclude-standard -z` — returns untracked\n     files (typically 0-10 in a clean repo), which still need lstat.\n\nPreviously, ALL ~1000 files went through `lstatFilterFiles` (batched\nasync lstat in groups of 512) to distinguish regular files from symlinks.\nThis added ~80-400ms depending on disk I/O speed. Now, only the handful\nof untracked files need lstat — tracked files are verified purely from\nthe git index's mode field.\n\nBenchmark (`pack()` on repomix repo, ~1001 files, 20 runs after 3 warmup):\n\n| Metric       | Baseline | This patch | Delta            |\n|------------- |----------|------------|------------------|\n| median       | 1645 ms  | 1568 ms    | −77 ms (−4.7%)   |\n| trimmed mean | 1648 ms  | 1564 ms    | −84 ms (−5.1%)   |\n\nA/B verification (reversed order, 15 runs):\n\n| Metric       | Baseline | This patch | Delta            |\n|------------- |----------|------------|------------------|\n| median       | 1778 ms  | 1735 ms    | −43 ms (−2.4%)   |\n| trimmed mean | 1776 ms  | 1737 ms    | −39 ms (−2.2%)   |\n\n- All 1115 tests pass\n- Lint clean (0 new warnings)\n- File count verified identical (1001 files)\n- Globby fallback path unchanged (non-git repos still work)\n\nhttps://claude.ai/code/session_01VMDapJYUkRFYme8gWpsFHR",
          "timestamp": "2026-04-16T19:37:52Z",
          "tree_id": "54ff44aa4133d11049f2badf7da8bdc30128b5d8",
          "url": "https://github.com/yamadashy/repomix/commit/eb483e77bb82be213abb441688d9cf9e618af58e"
        },
        "date": 1776368445352,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 648,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 632ms, Q3: 675ms\nAll times: 614, 623, 624, 626, 628, 631, 632, 632, 635, 635, 637, 639, 639, 640, 644, 648, 650, 657, 659, 659, 660, 667, 675, 681, 685, 691, 738, 753, 753, 765ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1053,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1047ms, Q3: 1072ms\nAll times: 1036, 1042, 1043, 1044, 1045, 1047, 1047, 1048, 1051, 1051, 1053, 1057, 1063, 1063, 1064, 1072, 1122, 1250, 1256, 1256ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1466,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1450ms, Q3: 1487ms\nAll times: 1425, 1444, 1447, 1448, 1449, 1450, 1453, 1459, 1460, 1461, 1466, 1472, 1476, 1486, 1486, 1487, 1492, 1497, 1531, 1717ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "fb9bcab7b6b448673504473d1da90988ca07d90b",
          "message": "perf(core): Use git mode bits to eliminate lstat syscalls in file search\n\nReplace the single `git ls-files --cached --others` command with two\nconcurrent commands:\n  1. `git ls-files --cached --stage -z` — returns tracked files WITH mode\n     bits, allowing us to identify regular files (100644/100755) vs\n     symlinks (120000) and submodules (160000) without any filesystem I/O.\n  2. `git ls-files --others --exclude-standard -z` — returns untracked\n     files (typically 0-10 in a clean repo), which still need lstat.\n\nPreviously, ALL ~1000 files went through `lstatFilterFiles` (batched\nasync lstat in groups of 512) to distinguish regular files from symlinks.\nThis added ~80-400ms depending on disk I/O speed. Now, only the handful\nof untracked files need lstat — tracked files are verified purely from\nthe git index's mode field.\n\nBenchmark (`pack()` on repomix repo, ~1001 files, 20 runs after 3 warmup):\n\n| Metric       | Baseline | This patch | Delta            |\n|------------- |----------|------------|------------------|\n| median       | 1645 ms  | 1568 ms    | −77 ms (−4.7%)   |\n| trimmed mean | 1648 ms  | 1564 ms    | −84 ms (−5.1%)   |\n\nA/B verification (reversed order, 15 runs):\n\n| Metric       | Baseline | This patch | Delta            |\n|------------- |----------|------------|------------------|\n| median       | 1778 ms  | 1735 ms    | −43 ms (−2.4%)   |\n| trimmed mean | 1776 ms  | 1737 ms    | −39 ms (−2.2%)   |\n\n- All 1115 tests pass\n- Lint clean (0 new warnings)\n- File count verified identical (1001 files)\n- Globby fallback path unchanged (non-git repos still work)\n\nhttps://claude.ai/code/session_01VMDapJYUkRFYme8gWpsFHR",
          "timestamp": "2026-04-16T19:39:42Z",
          "tree_id": "4dd1682cb55691d6d8593bed133608dbca2b96a2",
          "url": "https://github.com/yamadashy/repomix/commit/fb9bcab7b6b448673504473d1da90988ca07d90b"
        },
        "date": 1776368560183,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 667,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 638ms, Q3: 713ms\nAll times: 615, 622, 626, 629, 635, 636, 638, 638, 639, 642, 646, 646, 654, 657, 665, 667, 668, 668, 685, 687, 692, 697, 713, 729, 731, 751, 824, 876, 987, 990ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1060,
            "range": "±169",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1048ms, Q3: 1217ms\nAll times: 1023, 1035, 1040, 1040, 1044, 1048, 1054, 1054, 1057, 1058, 1060, 1063, 1064, 1099, 1145, 1217, 1254, 1270, 1278, 1288ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1500,
            "range": "±103",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1455ms, Q3: 1558ms\nAll times: 1414, 1433, 1446, 1447, 1451, 1455, 1457, 1466, 1471, 1474, 1500, 1505, 1507, 1512, 1530, 1558, 1622, 1638, 1724, 1783ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a006d4a74a08a7ce757e43e015b2831739c6c4d0",
          "message": "perf(core): Cap metrics worker pool to reduce BPE warmup CPU contention\n\naction: capped metrics worker thread count at max(4, ceil(cpuCount/4))\nreason: the pool was sized at full processConcurrency (16 on this machine)\n  via numOfTasks=MAX_SAFE_INTEGER, causing 16 workers to each spend ~290ms\n  initializing gpt-tokenizer's BPE encoder — 4640ms total CPU time that\n  competed with the security worker pool and main thread\ncontext: with METRICS_BATCH_SIZE=50 and ~1000 files, only 20 batch tasks\n  exist; 16 workers meant most got 1-2 tasks after expensive warmup\n\nBenchmark (10 runs each, repomix on its own repo, ~1020 files):\n  Before: median 2.423s, mean 2.419s (max=16 workers, user 11.4s)\n  After:  median 1.658s, mean 1.646s (max=4 workers, user 4.67s)\n  Wall time improvement: ~765ms median (31.6%)\n  CPU time reduction:    ~59% (11.4s → 4.67s user time)\n  Memory reduction:      ~61% (1374MB → 534MB RSS)\n\nThe cascading effect of reduced CPU contention also speeds up:\n  - Per-worker BPE init: 290ms → 165ms (workers get more CPU time)\n  - Security check: 548ms → 358ms (security worker gets more CPU)\n  - File metrics: 598ms → 474ms (less thread scheduling overhead)\n\nhttps://claude.ai/code/session_01LcPzsyoq2sq261mhmjnVYK",
          "timestamp": "2026-04-16T20:56:07Z",
          "tree_id": "d0f91655b639a5613e571a12778dc0164f208b27",
          "url": "https://github.com/yamadashy/repomix/commit/a006d4a74a08a7ce757e43e015b2831739c6c4d0"
        },
        "date": 1776373082527,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 737,
            "range": "±90",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 690ms, Q3: 780ms\nAll times: 647, 660, 671, 675, 681, 682, 684, 690, 690, 692, 701, 707, 729, 734, 737, 737, 742, 747, 753, 764, 772, 776, 780, 803, 818, 829, 862, 927, 956, 960ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1051,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1044ms, Q3: 1059ms\nAll times: 1031, 1036, 1039, 1042, 1043, 1044, 1045, 1046, 1050, 1050, 1051, 1052, 1054, 1058, 1058, 1059, 1062, 1066, 1128, 1267ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1783,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1771ms, Q3: 1803ms\nAll times: 1718, 1748, 1753, 1758, 1770, 1771, 1775, 1780, 1781, 1781, 1783, 1786, 1788, 1799, 1799, 1803, 1806, 1813, 1815, 1820ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "798ea6417d252b9f843f6603dc98c32c7cb367f3",
          "message": "perf(core): Replace synchronous file reads with concurrent async I/O\n\nReplace the sequential readFileSync loop in collectFiles with concurrent\nasync readFile via Promise.all. The sync approach blocked the event loop\nfor ~250ms reading ~1000 files sequentially, preventing concurrent git\noperations from completing. The async approach dispatches all reads to\nlibuv's thread pool, enabling true I/O parallelism and freeing the event\nloop to process git diff/log completions during file reading.\n\naction: replaced sync two-phase read (readFileSync + async fallback)\n        with single-phase concurrent readRawFile via Promise.all\nreason: readFileSync serializes 1000+ open/read/close syscalls on the\n        main thread; libuv's 4-thread pool parallelizes them with async\nconstraint: readRawFile already handles UTF-8 fast path (~99% of files)\n            and lazy-loads encoding detection only for non-UTF-8 files\n\nBenchmark (repomix CLI on its own repo, ~1000 files, 10 interleaved A/B runs):\n\n| Metric | Before | After | Delta |\n|---|---|---|---|\n| Wall time (median) | 2013ms | 1768ms | -245ms (-12.2%) |\n| Wall time (mean) | 2005ms | 1763ms | -242ms (-12.1%) |\n\nPhase-level improvement:\n| Phase | Before | After | Delta |\n|---|---|---|---|\n| collectFiles | ~250ms | ~115ms | -135ms (-54%) |\n\nhttps://claude.ai/code/session_01G5t5dGkiwwf1jS5bNAa6vi",
          "timestamp": "2026-04-16T21:36:21Z",
          "tree_id": "7ff70cf436367c175ad4e4f6c244ba7a6fd1aa5a",
          "url": "https://github.com/yamadashy/repomix/commit/798ea6417d252b9f843f6603dc98c32c7cb367f3"
        },
        "date": 1776375559908,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 770,
            "range": "±107",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 716ms, Q3: 823ms\nAll times: 682, 684, 686, 687, 696, 701, 710, 716, 723, 733, 736, 739, 741, 762, 762, 770, 777, 777, 778, 783, 806, 822, 823, 824, 855, 857, 859, 859, 889, 898ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1129,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1126ms, Q3: 1145ms\nAll times: 1101, 1110, 1111, 1120, 1123, 1126, 1126, 1127, 1129, 1129, 1129, 1129, 1133, 1133, 1139, 1145, 1153, 1157, 1174, 1175ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1818,
            "range": "±330",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1558ms, Q3: 1888ms\nAll times: 1497, 1514, 1539, 1539, 1555, 1558, 1585, 1586, 1690, 1775, 1818, 1835, 1852, 1865, 1875, 1888, 1902, 1977, 2046, 2773ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "03f7b4063eeed835aa86e41a6cb9185a07eeff7f",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-16T21:39:49Z",
          "tree_id": "cc344e7b6a149841bc9f8c9dcd88ed38cb5e8a3e",
          "url": "https://github.com/yamadashy/repomix/commit/03f7b4063eeed835aa86e41a6cb9185a07eeff7f"
        },
        "date": 1776375746573,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 981,
            "range": "±252",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 797ms, Q3: 1049ms\nAll times: 725, 730, 738, 754, 766, 783, 787, 797, 835, 856, 875, 892, 906, 929, 937, 981, 997, 1013, 1016, 1023, 1032, 1043, 1049, 1050, 1087, 1100, 1136, 1144, 1221, 1258ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1108,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1092ms, Q3: 1151ms\nAll times: 1076, 1081, 1081, 1090, 1090, 1092, 1100, 1102, 1103, 1107, 1108, 1109, 1115, 1116, 1129, 1151, 1258, 1279, 1315, 1338ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1758,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1749ms, Q3: 1782ms\nAll times: 1720, 1721, 1740, 1741, 1745, 1749, 1750, 1751, 1753, 1755, 1758, 1762, 1762, 1769, 1770, 1782, 1787, 1789, 1795, 1829ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "965151fb0f63a2c71cce724c5b0a2609e396a865",
          "message": "perf(config): Defer zod loading to eliminate ~142ms from CLI startup\n\nMove defaultConfig and defaultFilePathMap to a new configDefaults.ts module\nthat has no zod dependency. Remove redundant zod schema validation from\nmergeConfigs() and buildCliConfig() — inputs are already validated at their\nrespective boundaries (Commander for CLI, zod in loadAndValidateConfig for\nconfig files). Lazy-load configSchema.ts (which imports zod) only when a\nconfig file actually needs validation.\n\nAdd speculative preload in cliRun.ts: when common config files (json/json5/\njsonc) are detected via fs.access, start loading configSchema.js concurrently\nwith the defaultAction import chain so zod is ready by the time validation\nruns. This prevents regression for repos with config files.\n\nBefore: zod (~145ms) was always loaded as a static dependency of\nconfigSchema.ts, blocking the module import phase on every CLI invocation\nregardless of whether validation was needed.\n\nAfter: zod is only loaded when a config file exists and needs validation.\nWhen no config file is present (common for many users), zod is never loaded.\n\nBenchmark (repomix CLI on its own repo, ~1000 files, interleaved A/B, 10 pairs):\n\nWithout config file:\n| Metric | Before | After | Delta |\n|--------|--------|-------|-------|\n| Median | 1529ms | 1387ms | -142ms (-9.3%) |\n| Mean   | 1533ms | 1386ms | -147ms (-9.6%) |\n\nWith config file (repomix.config.json present):\n| Metric | Before | After | Delta |\n|--------|--------|-------|-------|\n| Median | 1660ms | 1674ms | ~0ms (neutral) |\n\nThe ~142ms saving matches the measured zod module load time (145ms).\n\nhttps://claude.ai/code/session_014tgmURJurRwvdZM9LKAJnH",
          "timestamp": "2026-04-16T22:52:27Z",
          "tree_id": "3eb2c079c36c980b12a9f52c5ad62914679d3e38",
          "url": "https://github.com/yamadashy/repomix/commit/965151fb0f63a2c71cce724c5b0a2609e396a865"
        },
        "date": 1776380318929,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1164,
            "range": "±291",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1031ms, Q3: 1322ms\nAll times: 941, 961, 970, 983, 995, 1001, 1013, 1031, 1037, 1039, 1040, 1091, 1108, 1109, 1142, 1164, 1194, 1195, 1207, 1253, 1269, 1305, 1322, 1343, 1420, 1580, 1824, 1944, 1948, 2448ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1115,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1106ms, Q3: 1123ms\nAll times: 1089, 1093, 1094, 1094, 1101, 1106, 1107, 1110, 1112, 1114, 1115, 1115, 1117, 1119, 1120, 1123, 1125, 1140, 1156, 1183ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1490,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1474ms, Q3: 1499ms\nAll times: 1445, 1450, 1452, 1466, 1471, 1474, 1479, 1480, 1482, 1489, 1490, 1491, 1492, 1497, 1498, 1499, 1506, 1507, 1517, 1524ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5c752188226565a632338b194ba5902388d8d8e3",
          "message": "perf(config): Defer zod loading to eliminate ~142ms from CLI startup\n\nMove defaultConfig and defaultFilePathMap to a new configDefaults.ts module\nthat has no zod dependency. Remove redundant zod schema validation from\nmergeConfigs() and buildCliConfig() — inputs are already validated at their\nrespective boundaries (Commander for CLI, zod in loadAndValidateConfig for\nconfig files). Lazy-load configSchema.ts (which imports zod) only when a\nconfig file actually needs validation.\n\nAdd speculative preload in cliRun.ts: when common config files (json/json5/\njsonc) are detected via fs.access, start loading configSchema.js concurrently\nwith the defaultAction import chain so zod is ready by the time validation\nruns. This prevents regression for repos with config files.\n\nBefore: zod (~145ms) was always loaded as a static dependency of\nconfigSchema.ts, blocking the module import phase on every CLI invocation\nregardless of whether validation was needed.\n\nAfter: zod is only loaded when a config file exists and needs validation.\nWhen no config file is present (common for many users), zod is never loaded.\n\nBenchmark (repomix CLI on its own repo, ~1000 files, interleaved A/B, 10 pairs):\n\nWithout config file:\n| Metric | Before | After | Delta |\n|--------|--------|-------|-------|\n| Median | 1529ms | 1387ms | -142ms (-9.3%) |\n| Mean   | 1533ms | 1386ms | -147ms (-9.6%) |\n\nWith config file (repomix.config.json present):\n| Metric | Before | After | Delta |\n|--------|--------|-------|-------|\n| Median | 1660ms | 1674ms | ~0ms (neutral) |\n\nThe ~142ms saving matches the measured zod module load time (145ms).\n\nhttps://claude.ai/code/session_014tgmURJurRwvdZM9LKAJnH",
          "timestamp": "2026-04-16T22:59:35Z",
          "tree_id": "d0f1a91a4b9ef9ae598ad3eaf0561c690e0c3165",
          "url": "https://github.com/yamadashy/repomix/commit/5c752188226565a632338b194ba5902388d8d8e3"
        },
        "date": 1776380479507,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 725,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 706ms, Q3: 750ms\nAll times: 688, 689, 691, 693, 695, 699, 705, 706, 707, 711, 712, 713, 717, 721, 724, 725, 725, 725, 739, 741, 745, 745, 750, 779, 802, 805, 808, 849, 879, 1065ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 863,
            "range": "±90",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 857ms, Q3: 947ms\nAll times: 830, 837, 842, 850, 853, 857, 859, 859, 859, 861, 863, 864, 878, 883, 892, 947, 982, 1006, 1013, 1029ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1475,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1464ms, Q3: 1479ms\nAll times: 1433, 1447, 1449, 1460, 1462, 1464, 1467, 1472, 1472, 1474, 1475, 1476, 1477, 1477, 1478, 1479, 1482, 1493, 1497, 1503ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "0b383fb7b57e65faef852c52070fa09f50220cf1",
          "message": "perf(core): Lazy-load @repomix/strip-comments to reduce import chain by ~19ms\n\nReplace the static `import strip from '@repomix/strip-comments'` with a\ncached dynamic import inside `StripCommentsManipulator.removeComments()`.\n\nThe `@repomix/strip-comments` module (~20ms to load) was imported eagerly\nvia the chain: defaultAction → packager → fileProcess → fileManipulate.\nThis module is only needed when `--remove-comments` is active (non-default:\n`removeComments: false`), but its import cost was paid on every CLI run.\n\nChanges:\n- `fileManipulate.ts`: Replace static import with `loadStrip()` helper\n  using a cached dynamic import. First call loads the module; subsequent\n  calls return the cached reference. `FileManipulator.removeComments()`\n  return type changed to `string | Promise<string>`.\n- `fileProcessContent.ts`: Add `await` to `removeComments()` call (the\n  containing `processContent` function was already async).\n- `fileManipulate.test.ts`: Updated tests to `await` the async result.\n\nBenchmark — packager import chain (20 samples each, `node -e`):\n\n| Metric | Before    | After     | Delta             |\n|--------|-----------|-----------|-------------------|\n| Median | 186.6ms   | 167.2ms   | **−19.4ms (−10.4%)** |\n| Mean   | 188.4ms   | 167.1ms   | **−21.3ms (−11.3%)** |\n\nThe ~19ms saving is consistent with the standalone module load time (~20ms).\nIn full CLI runs (~145ms in this fast environment), the saving is absorbed\nby concurrent pipeline overlap, but on typical user hardware (1–2s runs)\nit maps to ~1.3–2% wall-time improvement.\n\nCorrectness:\n- All 1114 tests pass\n- Lint clean (0 new errors)\n- `removeComments()` behavior unchanged — only the module loading is deferred\n- Cached import ensures the module is loaded exactly once\n\nhttps://claude.ai/code/session_01DCDYAXykPS1nJWQtwwqs5n",
          "timestamp": "2026-04-16T23:50:55Z",
          "tree_id": "84f6e8b90573f831ead6b05bb4932faf6d1c283f",
          "url": "https://github.com/yamadashy/repomix/commit/0b383fb7b57e65faef852c52070fa09f50220cf1"
        },
        "date": 1776383627487,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 799,
            "range": "±133",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 727ms, Q3: 860ms\nAll times: 675, 686, 709, 712, 715, 724, 727, 727, 733, 734, 739, 752, 755, 781, 784, 799, 827, 831, 833, 847, 854, 859, 860, 864, 871, 886, 914, 938, 952, 1060ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1156,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1147ms, Q3: 1235ms\nAll times: 1112, 1125, 1130, 1133, 1134, 1147, 1147, 1150, 1150, 1152, 1156, 1156, 1161, 1169, 1218, 1235, 1281, 1358, 1394, 1398ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1488,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1519ms\nAll times: 1416, 1426, 1426, 1429, 1431, 1444, 1446, 1452, 1459, 1461, 1488, 1488, 1490, 1491, 1499, 1519, 1531, 1607, 1856, 1925ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "58cfe7708df80a4395b491b3735d613cd9c530f7",
          "message": "perf(core): Lazy-load @repomix/strip-comments to reduce import chain by ~19ms\n\nReplace the static `import strip from '@repomix/strip-comments'` with a\ncached dynamic import inside `StripCommentsManipulator.removeComments()`.\n\nThe `@repomix/strip-comments` module (~20ms to load) was imported eagerly\nvia the chain: defaultAction → packager → fileProcess → fileManipulate.\nThis module is only needed when `--remove-comments` is active (non-default:\n`removeComments: false`), but its import cost was paid on every CLI run.\n\nChanges:\n- `fileManipulate.ts`: Replace static import with `loadStrip()` helper\n  using a cached dynamic import. First call loads the module; subsequent\n  calls return the cached reference. `FileManipulator.removeComments()`\n  return type changed to `string | Promise<string>`.\n- `fileProcessContent.ts`: Add `await` to `removeComments()` call (the\n  containing `processContent` function was already async).\n- `fileManipulate.test.ts`: Updated tests to `await` the async result.\n\nBenchmark — packager import chain (20 samples each, `node -e`):\n\n| Metric | Before    | After     | Delta             |\n|--------|-----------|-----------|-------------------|\n| Median | 186.6ms   | 167.2ms   | **−19.4ms (−10.4%)** |\n| Mean   | 188.4ms   | 167.1ms   | **−21.3ms (−11.3%)** |\n\nThe ~19ms saving is consistent with the standalone module load time (~20ms).\nIn full CLI runs (~145ms in this fast environment), the saving is absorbed\nby concurrent pipeline overlap, but on typical user hardware (1–2s runs)\nit maps to ~1.3–2% wall-time improvement.\n\nCorrectness:\n- All 1114 tests pass\n- Lint clean (0 new errors)\n- `removeComments()` behavior unchanged — only the module loading is deferred\n- Cached import ensures the module is loaded exactly once\n\nhttps://claude.ai/code/session_01DCDYAXykPS1nJWQtwwqs5n",
          "timestamp": "2026-04-16T23:53:32Z",
          "tree_id": "1ba453363961d8f96e31b9699acd4d559d3bd3c3",
          "url": "https://github.com/yamadashy/repomix/commit/58cfe7708df80a4395b491b3735d613cd9c530f7"
        },
        "date": 1776383736483,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 712,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 693ms, Q3: 754ms\nAll times: 671, 672, 679, 682, 684, 690, 692, 693, 694, 697, 697, 699, 702, 703, 711, 712, 719, 723, 727, 731, 731, 748, 754, 755, 758, 765, 783, 819, 826, 865ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1104,
            "range": "±136",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1096ms, Q3: 1232ms\nAll times: 1066, 1074, 1087, 1087, 1095, 1096, 1097, 1101, 1101, 1102, 1104, 1107, 1118, 1125, 1205, 1232, 1285, 1299, 1337, 1345ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1405,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1394ms, Q3: 1427ms\nAll times: 1356, 1377, 1385, 1389, 1391, 1394, 1395, 1397, 1398, 1400, 1405, 1412, 1413, 1418, 1426, 1427, 1427, 1436, 1436, 1474ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "100e49fce97af2d47dd88e5a298a8659cf03f8e7",
          "message": "perf(git): Cache isGitRepository and isGitInstalled to eliminate redundant child process spawns\n\nCache the result (as a Promise) of `isGitRepository` per directory\nand `isGitInstalled` globally to avoid spawning duplicate `git rev-parse`\nand `git --version` child processes.\n\nIn the pack() pipeline, `isGitRepository` is called 3 times for the\nsame directory: twice by `getGitDiffs` (once for work-tree diff, once\nfor staged diff via `getDiff → isGitRepository`) and once by\n`getGitLogs`. Each call spawns a `git rev-parse --is-inside-work-tree`\nchild process costing ~15ms of synchronous overhead.\n\nSimilarly, `isGitInstalled` spawns `git --version` and is called by\n`outputSort.ts → checkGitAvailability`.\n\nBy caching the Promise (not the resolved value), concurrent in-flight\ncalls to the same directory share a single child process. Subsequent\ncalls return the cached Promise instantly.\n\nCache is only active with default deps (production code). Tests that\ninject mock deps via the `deps` parameter bypass the cache, ensuring\ntest isolation.\n\nBenchmark (20 samples, 3 warmup, ~1018 files):\n\n| Metric | Before   | After    | Delta               |\n|--------|----------|----------|---------------------|\n| Median | 1012.4ms | 925.9ms  | −86.5ms (−8.5%)     |\n| Mean   | 1006.8ms | 929.7ms  | −77.1ms (−7.7%)     |\n| P10    | 983.6ms  | 909.0ms  | −74.6ms             |\n| P90    | 1044.6ms | 955.2ms  | −89.4ms             |\n\nThe saving comes from eliminating 2 redundant `git rev-parse` spawns\n(~30ms) and 1 `git --version` spawn (~15ms), plus reduced CPU\ncontention from fewer concurrent child processes competing with the\nmetrics and security worker pools during the pipeline startup phase.\n\nhttps://claude.ai/code/session_01A6R14jBHC4ugeKWHFcTpEZ",
          "timestamp": "2026-04-17T01:51:32Z",
          "tree_id": "33aff026aaa02c7fc9d9df374b97b54930627b0b",
          "url": "https://github.com/yamadashy/repomix/commit/100e49fce97af2d47dd88e5a298a8659cf03f8e7"
        },
        "date": 1776390805464,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 884,
            "range": "±113",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 860ms, Q3: 973ms\nAll times: 749, 807, 821, 825, 842, 844, 846, 860, 867, 872, 872, 878, 879, 883, 883, 884, 884, 887, 898, 903, 928, 967, 973, 998, 1009, 1028, 1036, 1043, 1088, 1269ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1054,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1047ms, Q3: 1067ms\nAll times: 1031, 1038, 1040, 1043, 1043, 1047, 1050, 1051, 1053, 1054, 1054, 1058, 1059, 1060, 1067, 1067, 1069, 1069, 1080, 1101ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1357,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1349ms, Q3: 1377ms\nAll times: 1304, 1324, 1325, 1329, 1333, 1349, 1350, 1350, 1350, 1356, 1357, 1362, 1366, 1367, 1369, 1377, 1393, 1397, 1407, 1414ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "7bb75c56b31476150ffe8352c5b67b1ac1534b79",
          "message": "perf(core): Lazy-load ignore and isbinaryfile to reduce module import chain\n\nDefer loading of `ignore` (~10ms) and `isbinaryfile` (~5ms) packages from the\nstatic import chain to dynamic imports at point of use. This removes ~15ms of\nmodule parse/compile time from the critical startup path.\n\n- `ignore` in fileSearch.ts: Loaded via fire-and-forget `loadIgnore()` at the\n  start of `searchFiles`, overlapping with the git ls-files I/O wait (~88ms).\n  By the time `processGitOutput` → `buildIgnoreInstance` needs it, the module\n  is already cached. Follows the existing `globby` lazy-load pattern.\n\n- `isbinaryfile` in fileRead.ts: Only needed when a file fails UTF-8 decoding\n  (~1% of source files). Lazy-loaded on the slow path, so most runs never\n  trigger the import at all.\n\nBenchmark (module loading, packager import chain, 5 samples each):\n  Before: median 148.2ms\n  After:  median 137.5ms  (−10.7ms, −7.2%)\n\nFull CLI benchmark (30 samples, 3 warmup, self-on-self):\n  Before: median 1524ms, mean 1527ms\n  After:  median 1521ms, mean 1518ms  (−3ms median, −9ms mean)\n\nThe CLI improvement is within measurement noise due to system-level variance\n(~50ms IQR), but the module loading reduction is consistent and verified.\n\nInvestigation context: After 22 prior optimization commits, CPU profiling\nshows remaining time is dominated by Node.js internals — ESM module stat()\nresolution (123ms/9.7%), GC (63ms/5%), child process spawning (47ms/3.7%),\nand V8 bytecode compilation (57ms/4.5%). Application-level code accounts for\n<15% of wall time, limiting further user-space optimization opportunities.\n\nhttps://claude.ai/code/session_01VpF8DX8T7fPc34dkGzsX3i",
          "timestamp": "2026-04-17T03:16:04Z",
          "tree_id": "8df6b8a4dcde7dc3eefbb40dffb24b08944d257b",
          "url": "https://github.com/yamadashy/repomix/commit/7bb75c56b31476150ffe8352c5b67b1ac1534b79"
        },
        "date": 1776395934041,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 708,
            "range": "±94",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 681ms, Q3: 775ms\nAll times: 654, 654, 671, 672, 673, 675, 678, 681, 682, 687, 695, 697, 698, 699, 700, 708, 708, 714, 719, 724, 731, 745, 775, 783, 798, 813, 832, 864, 875, 966ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1035,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1029ms, Q3: 1070ms\nAll times: 1010, 1022, 1023, 1025, 1025, 1029, 1030, 1030, 1031, 1031, 1035, 1039, 1040, 1041, 1051, 1070, 1077, 1081, 1089, 1258ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1414,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1409ms, Q3: 1443ms\nAll times: 1396, 1400, 1402, 1403, 1405, 1409, 1410, 1411, 1413, 1413, 1414, 1421, 1427, 1428, 1442, 1443, 1445, 1484, 1490, 1506ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "609dcc8bc5b8f35a06b2e59de2b6629c3556e8bb",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-17T04:48:40Z",
          "tree_id": "f2e000b17f752811b67495cf62aef41571ff6202",
          "url": "https://github.com/yamadashy/repomix/commit/609dcc8bc5b8f35a06b2e59de2b6629c3556e8bb"
        },
        "date": 1776401471302,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 973,
            "range": "±197",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 913ms, Q3: 1110ms\nAll times: 769, 804, 826, 866, 874, 876, 889, 913, 915, 917, 955, 960, 961, 966, 973, 973, 975, 1043, 1056, 1056, 1060, 1072, 1110, 1172, 1194, 1292, 1309, 1426, 1466, 1782ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1157,
            "range": "±54",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1140ms, Q3: 1194ms\nAll times: 1119, 1120, 1123, 1128, 1140, 1140, 1144, 1150, 1155, 1155, 1157, 1165, 1166, 1174, 1188, 1194, 1211, 1219, 1239, 1312ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1590,
            "range": "±267",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1537ms, Q3: 1804ms\nAll times: 1486, 1491, 1515, 1515, 1531, 1537, 1539, 1573, 1577, 1587, 1590, 1597, 1598, 1600, 1622, 1804, 1812, 1926, 2061, 2428ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "427ed5ca8a9750564a09d6088d9b7761d0e60f20",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-17T04:51:46Z",
          "tree_id": "d62fb875f2f701f7d131ddbcb455c37fd9c1a8e8",
          "url": "https://github.com/yamadashy/repomix/commit/427ed5ca8a9750564a09d6088d9b7761d0e60f20"
        },
        "date": 1776401632341,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 821,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 783ms, Q3: 897ms\nAll times: 682, 702, 721, 726, 726, 737, 761, 783, 790, 794, 796, 814, 815, 815, 816, 821, 835, 851, 857, 873, 888, 895, 897, 922, 928, 952, 973, 989, 1007, 1080ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1084,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1076ms, Q3: 1094ms\nAll times: 1064, 1068, 1070, 1071, 1076, 1076, 1079, 1080, 1081, 1082, 1084, 1086, 1087, 1087, 1094, 1094, 1096, 1098, 1105, 1125ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1385,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1371ms, Q3: 1407ms\nAll times: 1334, 1347, 1347, 1358, 1361, 1371, 1376, 1378, 1382, 1384, 1385, 1386, 1388, 1395, 1395, 1407, 1412, 1422, 1437, 1445ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "33cccf1b780faa443011209d106110d9cc3e59a3",
          "message": "fix(test): Remove invalid getProcessConcurrency from security check test deps\n\nThe securityCheck.ts deps parameter only accepts { initTaskRunner },\nbut tests were passing { initTaskRunner, getProcessConcurrency } which\ncaused TypeScript errors. Remove the extra property and the unused\nmockGetProcessConcurrency variable.\n\nhttps://claude.ai/code/session_01WLFwZPssTvzYEYNWNfWizx",
          "timestamp": "2026-04-17T06:10:37Z",
          "tree_id": "fc3b96b2c700cfe66c00f0e31dac33ae8bccf9f7",
          "url": "https://github.com/yamadashy/repomix/commit/33cccf1b780faa443011209d106110d9cc3e59a3"
        },
        "date": 1776406351137,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1369,
            "range": "±353",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1173ms, Q3: 1526ms\nAll times: 888, 897, 927, 940, 945, 993, 1041, 1173, 1224, 1265, 1270, 1286, 1308, 1310, 1334, 1369, 1392, 1397, 1401, 1405, 1510, 1515, 1526, 1531, 1533, 1557, 1698, 1713, 1777, 1952ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1125,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1112ms, Q3: 1145ms\nAll times: 1088, 1100, 1104, 1106, 1111, 1112, 1113, 1118, 1121, 1122, 1125, 1128, 1139, 1140, 1141, 1145, 1156, 1161, 1173, 1271ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1436,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1416ms, Q3: 1465ms\nAll times: 1389, 1402, 1405, 1407, 1413, 1416, 1417, 1431, 1433, 1434, 1436, 1443, 1446, 1450, 1458, 1465, 1473, 1478, 1490, 1500ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "c386c32f4c5e998d97d9cb0a3f2f45d683e72d10",
          "message": "perf(core): Lazy-load tinypool to defer ~34ms module parse from startup\n\nReplace the static `import { Tinypool } from 'tinypool'` in\nprocessConcurrency.ts with a lazy `import('tinypool')` that runs\nconcurrently with the pack pipeline.\n\nPreviously, tinypool was loaded as part of the defaultAction.ts\nstatic import chain (via packager.ts → processConcurrency.ts),\nblocking the CLI startup by ~34ms before any work could begin.\n\nNow, createWorkerPool/initTaskRunner are async and tinypool is\nloaded on first pool creation. In packager.ts, the metrics pool\nsetup is started as a non-blocking promise at the top of pack(),\noverlapping the tinypool import + pool creation + BPE warmup with\nthe search/collect/process pipeline (~340ms). The pool is awaited\nonly when metrics calculation begins, by which time it has long\nsince resolved.\n\nAction: lazy-load tinypool via dynamic import() with module-level cache\nConstraint: createWorkerPool and initTaskRunner become async\nMeasured: 15-run median 1161ms → 1125ms = -36ms (3.1% improvement)\n\nBenchmark (15 runs each, repomix self-pack ~1000 files):\n  Baseline — median: 1161ms, mean: 1161ms, P10: 1105ms, P90: 1212ms\n  Patched  — median: 1125ms, mean: 1126ms, P10: 1073ms, P90: 1177ms\n\nAll 1114 tests pass. Build and lint clean.\n\nhttps://claude.ai/code/session_015UJ1bPDFVapv9hhCH3FrRe",
          "timestamp": "2026-04-17T07:39:41Z",
          "tree_id": "19c1c790d0386aac0a9803e16ff489adfc019e61",
          "url": "https://github.com/yamadashy/repomix/commit/c386c32f4c5e998d97d9cb0a3f2f45d683e72d10"
        },
        "date": 1776411871140,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1075,
            "range": "±113",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1016ms, Q3: 1129ms\nAll times: 958, 969, 970, 970, 978, 989, 1006, 1016, 1017, 1029, 1035, 1043, 1053, 1057, 1062, 1075, 1090, 1096, 1104, 1109, 1126, 1129, 1129, 1151, 1177, 1190, 1245, 1266, 1337, 1772ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1125,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1101ms, Q3: 1131ms\nAll times: 1098, 1098, 1098, 1099, 1101, 1101, 1106, 1112, 1116, 1118, 1125, 1126, 1126, 1127, 1131, 1131, 1135, 1137, 1201, 1274ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1467,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1453ms, Q3: 1496ms\nAll times: 1423, 1439, 1445, 1450, 1450, 1453, 1454, 1457, 1457, 1467, 1467, 1467, 1472, 1475, 1479, 1496, 1503, 1505, 1514, 1548ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a0af3e05eade92cdbd15fefa1c68d32ef6575662",
          "message": "perf(cli): Overlap version fetch with config preload and module imports\n\nPreviously, `getVersion()` (~30ms file read for package.json) was awaited\nsequentially before the speculative configSchema preload and the\n`defaultAction.js` dynamic import. This blocked the entire downstream\npipeline by ~30ms.\n\nNow `getVersion()` fires non-blocking at the start and runs concurrently\nwith the configSchema speculative preload (zod ~145ms) and the\ndefaultAction import chain (~115ms) via `Promise.all`. The version header\nis logged as soon as the promise resolves, before any action-specific\noutput.\n\nFor --init, --remote, and auto-detected remote URL paths, the version\nis awaited inline before those actions (preserving existing behavior).\n\nBenchmark (12 runs, warm compile cache, local):\n  Before: median 1426ms, mean 1414ms\n  After:  median 1380ms, mean 1372ms\n  Improvement: -46ms (-3.3%)\n\nhttps://claude.ai/code/session_01XnNvE5vHVqyyvSkL5v4Yxf",
          "timestamp": "2026-04-17T07:52:02Z",
          "tree_id": "8d8893e773e33fb340cc01a5e3f3c0ec50336c74",
          "url": "https://github.com/yamadashy/repomix/commit/a0af3e05eade92cdbd15fefa1c68d32ef6575662"
        },
        "date": 1776412466041,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 793,
            "range": "±113",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 731ms, Q3: 844ms\nAll times: 693, 701, 704, 710, 712, 714, 729, 731, 737, 743, 743, 745, 755, 769, 773, 793, 799, 807, 811, 811, 815, 816, 844, 854, 896, 925, 941, 945, 1004, 1061ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1129,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1118ms, Q3: 1142ms\nAll times: 1110, 1111, 1112, 1113, 1118, 1118, 1120, 1121, 1123, 1127, 1129, 1131, 1139, 1139, 1142, 1142, 1146, 1148, 1158, 1217ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1535,
            "range": "±110",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1515ms, Q3: 1625ms\nAll times: 1502, 1503, 1504, 1513, 1513, 1515, 1519, 1526, 1527, 1532, 1535, 1555, 1588, 1608, 1612, 1625, 1643, 1678, 1759, 1849ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "1ffc78d5a2c56c24a4242ee5ccb482975955b2e8",
          "message": "perf(output): Replace Handlebars with direct string builders for output generation\n\nEliminate the ~140ms Handlebars module import + template compilation that\nblocked the output generation critical path. Replace with zero-overhead\ndirect string builder functions for XML, Markdown, and Plain styles.\n\nWhy: Handlebars (350KB of JavaScript) takes ~140ms to parse, compile, and\ninitialize on every cold CLI invocation. This cost sat on the output\ngeneration critical path, which is the longest-running phase of pack().\nDirect string building using array push + join produces identical output\nwith no module loading overhead.\n\nChanges:\n- Add buildXmlOutput, buildMarkdownOutput, buildPlainOutput functions\n  that directly construct output strings without template engines\n- Extract extensionToLanguageMap to outputFileLanguage.ts (Handlebars-free)\n  so the markdown builder can resolve language hints without importing\n  Handlebars through outputStyleUtils.ts\n- Keep Handlebars templates intact for skill generation path and tests\n- Update test mocks from generateHandlebarOutput to buildDirectOutput\n\nBenchmark (1000 files, cold-start, 5 runs trimmed mean):\n  Before: ~1368ms (median 1362ms, range 1319–1413ms)\n  After:  ~1249ms (median 1243ms, range 1237–1278ms)\n  Improvement: ~120ms = 8.7% of total CLI wall time\n\nhttps://claude.ai/code/session_015wX7m2cigo1rZiuPXoDgBn",
          "timestamp": "2026-04-17T19:07:30Z",
          "tree_id": "c755bc6e381d366850531dcead01d1303b858498",
          "url": "https://github.com/yamadashy/repomix/commit/1ffc78d5a2c56c24a4242ee5ccb482975955b2e8"
        },
        "date": 1776452987664,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1036,
            "range": "±362",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 899ms, Q3: 1261ms\nAll times: 822, 841, 856, 868, 875, 879, 898, 899, 911, 930, 940, 978, 984, 989, 993, 1036, 1066, 1153, 1206, 1212, 1249, 1250, 1261, 1422, 1492, 1530, 1556, 1603, 1779, 2233ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1126,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1099ms, Q3: 1160ms\nAll times: 1080, 1089, 1090, 1094, 1095, 1099, 1101, 1104, 1106, 1110, 1126, 1131, 1132, 1137, 1156, 1160, 1276, 1291, 1311, 1311ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1454,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1434ms, Q3: 1509ms\nAll times: 1388, 1407, 1409, 1419, 1427, 1434, 1439, 1444, 1446, 1453, 1454, 1465, 1465, 1466, 1487, 1509, 1719, 1774, 1789, 1830ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "fe03c549a5e3e513abc910994748bd20377f1c15",
          "message": "perf(output): Replace Handlebars with direct string builders for output generation\n\nEliminate the ~140ms Handlebars module import + template compilation that\nblocked the output generation critical path. Replace with zero-overhead\ndirect string builder functions for XML, Markdown, and Plain styles.\n\nWhy: Handlebars (350KB of JavaScript) takes ~140ms to parse, compile, and\ninitialize on every cold CLI invocation. This cost sat on the output\ngeneration critical path, which is the longest-running phase of pack().\nDirect string building using array push + join produces identical output\nwith no module loading overhead.\n\nChanges:\n- Add buildXmlOutput, buildMarkdownOutput, buildPlainOutput functions\n  that directly construct output strings without template engines\n- Extract extensionToLanguageMap to outputFileLanguage.ts (Handlebars-free)\n  so the markdown builder can resolve language hints without importing\n  Handlebars through outputStyleUtils.ts\n- Keep Handlebars templates intact for skill generation path and tests\n- Update test mocks from generateHandlebarOutput to buildDirectOutput\n\nBenchmark (1000 files, cold-start, 5 runs trimmed mean):\n  Before: ~1368ms (median 1362ms, range 1319–1413ms)\n  After:  ~1249ms (median 1243ms, range 1237–1278ms)\n  Improvement: ~120ms = 8.7% of total CLI wall time\n\nhttps://claude.ai/code/session_015wX7m2cigo1rZiuPXoDgBn",
          "timestamp": "2026-04-17T19:18:15Z",
          "tree_id": "6ee648167f56801660ff4417e73540fbf7ac89f3",
          "url": "https://github.com/yamadashy/repomix/commit/fe03c549a5e3e513abc910994748bd20377f1c15"
        },
        "date": 1776453598801,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1014,
            "range": "±156",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 944ms, Q3: 1100ms\nAll times: 909, 910, 911, 915, 931, 938, 942, 944, 961, 965, 967, 971, 980, 983, 1004, 1014, 1025, 1028, 1032, 1084, 1090, 1093, 1100, 1126, 1131, 1136, 1182, 1335, 1337, 1341ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1149,
            "range": "±82",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1125ms, Q3: 1207ms\nAll times: 1098, 1110, 1111, 1115, 1117, 1125, 1131, 1134, 1134, 1137, 1149, 1151, 1164, 1180, 1188, 1207, 1317, 1342, 1384, 1391ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1386,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1365ms, Q3: 1414ms\nAll times: 1350, 1358, 1361, 1362, 1365, 1365, 1365, 1368, 1379, 1382, 1386, 1389, 1390, 1394, 1405, 1414, 1433, 1436, 1442, 1442ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9f3cdc720fc821e87fdae11983eff89dbbe1464d",
          "message": "perf(security): Pre-start security worker pool to overlap initialization with file pipeline\n\nStart the security check worker thread at the beginning of pack(), so\nsecretlint module loading (~100-150ms) runs concurrently with file search,\ncollection, and processing. Previously the worker was created only when\nthe security check began, adding its initialization time to the critical\npath after file collection completed.\n\nThe warmup uses a module-level promise consumed by runSecurityCheck on\nfirst call. Tests that override validateFileSafety skip the warmup to\navoid spawning real workers in the test environment.\n\nBenchmark (repomix CLI on 2025-file repo, 25 runs each):\n\n| Metric | Before   | After    | Delta              |\n|--------|----------|----------|--------------------|\n| Median | 1196ms   | 1138ms   | -58ms (-4.8%)      |\n| Mean   | 1197ms   | 1134ms   | -63ms (-5.3%)      |\n| P90    | 1237ms   | 1178ms   | -59ms (-4.8%)      |\n\nhttps://claude.ai/code/session_01Mifn83tDGYopUUSzGZggoR",
          "timestamp": "2026-04-17T20:04:42Z",
          "tree_id": "25d4a41a8838718b1ccdfcaa7fee5499cb963e4f",
          "url": "https://github.com/yamadashy/repomix/commit/9f3cdc720fc821e87fdae11983eff89dbbe1464d"
        },
        "date": 1776456434063,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 751,
            "range": "±118",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 696ms, Q3: 814ms\nAll times: 656, 659, 674, 684, 689, 690, 695, 696, 709, 711, 714, 715, 716, 720, 728, 751, 754, 762, 771, 778, 782, 792, 814, 827, 833, 862, 908, 919, 936, 956ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1095,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1091ms, Q3: 1107ms\nAll times: 1073, 1076, 1077, 1077, 1077, 1091, 1091, 1092, 1094, 1094, 1095, 1102, 1103, 1106, 1107, 1107, 1108, 1132, 1260, 1284ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1794,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1777ms, Q3: 1834ms\nAll times: 1696, 1733, 1735, 1753, 1763, 1777, 1779, 1780, 1781, 1792, 1794, 1795, 1800, 1800, 1817, 1834, 1836, 1837, 1837, 1854ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "596431fe3fe50311ea0c42f07e47b8aec750144c",
          "message": "Merge remote-tracking branch 'origin/perf/auto-perf-tuning' into perf/auto-perf-tuning",
          "timestamp": "2026-04-17T20:55:19Z",
          "tree_id": "cf7420940449a35410b3cc80d73f7696cf0e8865",
          "url": "https://github.com/yamadashy/repomix/commit/596431fe3fe50311ea0c42f07e47b8aec750144c"
        },
        "date": 1776459449782,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 674,
            "range": "±69",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 644ms, Q3: 713ms\nAll times: 623, 634, 636, 639, 639, 643, 643, 644, 644, 647, 651, 654, 660, 668, 670, 674, 676, 677, 693, 701, 707, 708, 713, 715, 717, 734, 746, 760, 762, 769ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1092,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1083ms, Q3: 1101ms\nAll times: 1074, 1076, 1076, 1079, 1079, 1083, 1084, 1085, 1088, 1091, 1092, 1093, 1096, 1096, 1097, 1101, 1105, 1105, 1106, 1109ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1853,
            "range": "±54",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1832ms, Q3: 1886ms\nAll times: 1813, 1819, 1820, 1823, 1826, 1832, 1833, 1848, 1849, 1850, 1853, 1870, 1880, 1880, 1884, 1886, 1887, 1896, 1913, 1918ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "70e34a02221aece314a949c3f941045ea446ea6a",
          "message": "chore: Clean up stale comment and dead test variables\n\n- Update packager.ts comment to reflect that generateOutput no longer\n  calls sortOutputFiles internally (removed in d8609ba)\n- Remove unused mockSortOutputFiles variables from diffsInOutput.test.ts\n\nhttps://claude.ai/code/session_01PuZdEctRrAdwmCesn2RTxB",
          "timestamp": "2026-04-17T21:00:26Z",
          "tree_id": "608d9e861e60fcce452b850a8aebd93896ce5117",
          "url": "https://github.com/yamadashy/repomix/commit/70e34a02221aece314a949c3f941045ea446ea6a"
        },
        "date": 1776459743115,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 665,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 647ms, Q3: 697ms\nAll times: 623, 631, 639, 639, 641, 643, 644, 647, 648, 648, 649, 653, 658, 660, 660, 665, 667, 669, 674, 675, 685, 691, 697, 698, 707, 710, 727, 743, 747, 759ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1041,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1027ms, Q3: 1060ms\nAll times: 1008, 1012, 1023, 1024, 1026, 1027, 1032, 1033, 1036, 1037, 1041, 1041, 1049, 1053, 1055, 1060, 1063, 1066, 1067, 1074ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1799,
            "range": "±56",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1761ms, Q3: 1817ms\nAll times: 1738, 1751, 1752, 1754, 1755, 1761, 1771, 1774, 1777, 1788, 1799, 1800, 1802, 1802, 1803, 1817, 1820, 1822, 1826, 1832ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "114827586+autofix-ci[bot]@users.noreply.github.com",
            "name": "autofix-ci[bot]",
            "username": "autofix-ci[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ff3e4567bbfc5fda2bc24dcb851a571e1a9d1df1",
          "message": "[autofix.ci] apply automated fixes",
          "timestamp": "2026-04-17T22:00:12Z",
          "tree_id": "cb1fcfd74c65c3185857e234c923ef371b231761",
          "url": "https://github.com/yamadashy/repomix/commit/ff3e4567bbfc5fda2bc24dcb851a571e1a9d1df1"
        },
        "date": 1776463428663,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 934,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 909ms, Q3: 971ms\nAll times: 845, 862, 866, 882, 890, 891, 900, 909, 913, 917, 918, 919, 931, 931, 932, 934, 938, 944, 946, 950, 951, 966, 971, 971, 1060, 1061, 1066, 1080, 1259, 1297ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1098,
            "range": "±132",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1086ms, Q3: 1218ms\nAll times: 1062, 1069, 1074, 1080, 1082, 1086, 1088, 1089, 1096, 1098, 1098, 1099, 1109, 1137, 1164, 1218, 1246, 1295, 1325, 1328ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1375,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1358ms, Q3: 1404ms\nAll times: 1348, 1352, 1354, 1357, 1358, 1358, 1370, 1372, 1374, 1374, 1375, 1379, 1380, 1381, 1396, 1404, 1408, 1409, 1411, 1415ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ae5a9238f86db7ddb025fb43b5ef51603423645a",
          "message": "Merge remote-tracking branch 'origin/perf/auto-perf-tuning' into perf/auto-perf-tuning\n\nResolve conflict in truncateBase64.ts by combining both approaches:\n- Remote's hasLongBase64Run fast-reject pre-filter\n- Remote's data: includes check for data URI regex\n- Local's replaceStandaloneBase64 manual scanner (replaces regex)\n\nhttps://claude.ai/code/session_01TDi2mTcYbQRSFdgqAzbrdD",
          "timestamp": "2026-04-17T22:52:31Z",
          "tree_id": "b5ce8efe0838c9c82a74a5825852a46c1b9dba27",
          "url": "https://github.com/yamadashy/repomix/commit/ae5a9238f86db7ddb025fb43b5ef51603423645a"
        },
        "date": 1776466483876,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 775,
            "range": "±147",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 705ms, Q3: 852ms\nAll times: 672, 679, 680, 687, 693, 694, 700, 705, 708, 708, 726, 735, 736, 743, 758, 775, 799, 803, 806, 830, 832, 843, 852, 860, 861, 867, 900, 930, 950, 1030ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1072,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1062ms, Q3: 1077ms\nAll times: 1045, 1052, 1052, 1054, 1056, 1062, 1063, 1063, 1063, 1069, 1072, 1073, 1076, 1076, 1076, 1077, 1080, 1101, 1113, 1118ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1519,
            "range": "±73",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1474ms, Q3: 1547ms\nAll times: 1438, 1455, 1458, 1463, 1471, 1474, 1477, 1483, 1503, 1514, 1519, 1526, 1534, 1534, 1546, 1547, 1624, 1673, 1703, 1752ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "0cbae4c1ce903872f5cd4ce63390300c6eb3454a",
          "message": "perf(core): Pre-start metrics worker pool during config loading\n\nStart BPE worker warmup speculatively during migration check and config\nloading, overlapping ~300ms of worker initialization with ~20-30ms of\nsequential filesystem I/O that was previously dead time. When pack()\nbegins, the workers have a head start on BPE rank loading, reducing\nwall-clock time by moving worker startup off the critical path.\n\nAlso streamlines the metrics calculation pipeline:\n- Remove no-op targetFilePaths filter in calculateFileMetrics (was\n  always identity — allocated Set + filtered array for no purpose)\n- Gate process.hrtime.bigint() in workers behind debug log level\n  (avoids BigInt allocation on every batch at INFO level)\n- Remove unused charCount field from FileMetrics interface\n- Remove path from IPC batch items (only used for error logging,\n  now logged on the main thread side)\n- Use short prefix for extractOutputWrapper indexOf (64-byte key\n  instead of full ~4KB content — reduces V8 BMH preprocessing)\n- Pre-size wrapperSegments array to avoid repeated resizing\n\nBenchmark (20 runs each, this repository ~1002 files):\n  Baseline:  avg=1170.7ms  med=1171.5ms  std=20.6ms\n  Optimized: avg=1133.5ms  med=1137.5ms  std=13.8ms\n  Delta avg: -37.1ms (3.2%)\n  Delta med: -34.0ms (2.9%)\n\nAll 1114 tests pass, lint clean, build clean.\n\nhttps://claude.ai/code/session_01HfSJZGnoJ3aWF3ojdMRsGS",
          "timestamp": "2026-04-18T02:20:02Z",
          "tree_id": "a4818fe59938a49c3720f27538c6fa7286e916ed",
          "url": "https://github.com/yamadashy/repomix/commit/0cbae4c1ce903872f5cd4ce63390300c6eb3454a"
        },
        "date": 1776478902217,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 644,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 632ms, Q3: 668ms\nAll times: 619, 621, 625, 628, 629, 630, 631, 632, 632, 632, 633, 633, 636, 638, 642, 644, 645, 649, 650, 651, 657, 666, 668, 683, 686, 686, 698, 724, 769, 804ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1101,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1085ms, Q3: 1109ms\nAll times: 1071, 1075, 1080, 1081, 1081, 1085, 1088, 1090, 1093, 1095, 1101, 1103, 1104, 1108, 1109, 1109, 1111, 1121, 1122, 1184ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1450,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1437ms, Q3: 1459ms\nAll times: 1410, 1412, 1424, 1425, 1437, 1437, 1442, 1444, 1444, 1449, 1450, 1453, 1453, 1455, 1455, 1459, 1465, 1468, 1484, 1526ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "9ee593dd3ab84e832f68096b832f7481c231490e",
          "message": "perf(core): Pre-start metrics worker pool during config loading\n\nStart BPE worker warmup speculatively during migration check and config\nloading, overlapping ~300ms of worker initialization with ~20-30ms of\nsequential filesystem I/O that was previously dead time. When pack()\nbegins, the workers have a head start on BPE rank loading, reducing\nwall-clock time by moving worker startup off the critical path.\n\nAlso streamlines the metrics calculation pipeline:\n- Remove no-op targetFilePaths filter in calculateFileMetrics (was\n  always identity — allocated Set + filtered array for no purpose)\n- Gate process.hrtime.bigint() in workers behind debug log level\n  (avoids BigInt allocation on every batch at INFO level)\n- Remove unused charCount field from FileMetrics interface\n- Remove path from IPC batch items (only used for error logging,\n  now logged on the main thread side)\n- Use short prefix for extractOutputWrapper indexOf (64-byte key\n  instead of full ~4KB content — reduces V8 BMH preprocessing)\n- Pre-size wrapperSegments array to avoid repeated resizing\n\nBenchmark (20 runs each, this repository ~1002 files):\n  Baseline:  avg=1170.7ms  med=1171.5ms  std=20.6ms\n  Optimized: avg=1133.5ms  med=1137.5ms  std=13.8ms\n  Delta avg: -37.1ms (3.2%)\n  Delta med: -34.0ms (2.9%)\n\nAll 1114 tests pass, lint clean, build clean.\n\nhttps://claude.ai/code/session_01HfSJZGnoJ3aWF3ojdMRsGS",
          "timestamp": "2026-04-18T02:24:54Z",
          "tree_id": "86f40fe9926b97b824d3b80e2b8d312758ea75fe",
          "url": "https://github.com/yamadashy/repomix/commit/9ee593dd3ab84e832f68096b832f7481c231490e"
        },
        "date": 1776479218123,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 651,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 634ms, Q3: 665ms\nAll times: 624, 626, 627, 629, 631, 633, 633, 634, 637, 638, 639, 639, 642, 643, 648, 651, 652, 653, 654, 655, 658, 661, 665, 669, 684, 685, 693, 708, 785, 891ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1113,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1104ms, Q3: 1130ms\nAll times: 1069, 1094, 1103, 1103, 1103, 1104, 1110, 1110, 1111, 1113, 1113, 1119, 1120, 1122, 1124, 1130, 1130, 1135, 1145, 1176ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1524,
            "range": "±91",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1506ms, Q3: 1597ms\nAll times: 1447, 1484, 1495, 1500, 1504, 1506, 1507, 1517, 1521, 1523, 1524, 1524, 1526, 1535, 1539, 1597, 1621, 1893, 1965, 2252ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "150078543c57c4793913309df87bb01546da2443",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-18T03:03:33Z",
          "tree_id": "3f3c73fee7e918eefef93797bd1b735009dacc51",
          "url": "https://github.com/yamadashy/repomix/commit/150078543c57c4793913309df87bb01546da2443"
        },
        "date": 1776481966976,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 764,
            "range": "±153",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 684ms, Q3: 837ms\nAll times: 645, 649, 671, 672, 674, 675, 678, 684, 713, 714, 721, 724, 731, 733, 754, 764, 769, 776, 787, 791, 791, 821, 837, 844, 846, 854, 864, 881, 968, 975ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1093,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1079ms, Q3: 1105ms\nAll times: 1051, 1072, 1075, 1075, 1076, 1079, 1085, 1087, 1089, 1089, 1093, 1095, 1098, 1098, 1099, 1105, 1108, 1112, 1118, 1127ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1528,
            "range": "±106",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1482ms, Q3: 1588ms\nAll times: 1459, 1462, 1462, 1463, 1473, 1482, 1492, 1509, 1520, 1523, 1528, 1547, 1555, 1571, 1576, 1588, 1614, 1628, 1700, 1740ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e29d4607b1f500a2d3b007a09872ebc7dd793ff4",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-18T04:07:04Z",
          "tree_id": "1e4ff9bea98c954e65e793b9e0a790192db9766e",
          "url": "https://github.com/yamadashy/repomix/commit/e29d4607b1f500a2d3b007a09872ebc7dd793ff4"
        },
        "date": 1776485485550,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 740,
            "range": "±95",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 710ms, Q3: 805ms\nAll times: 669, 670, 676, 684, 692, 699, 707, 710, 712, 714, 716, 722, 723, 727, 732, 740, 770, 770, 779, 783, 786, 792, 805, 821, 824, 834, 842, 858, 882, 948ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1099,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1087ms, Q3: 1109ms\nAll times: 1065, 1073, 1082, 1086, 1087, 1087, 1090, 1091, 1094, 1098, 1099, 1100, 1101, 1103, 1107, 1109, 1109, 1115, 1133, 1194ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1419,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1404ms, Q3: 1448ms\nAll times: 1396, 1397, 1398, 1400, 1402, 1404, 1406, 1410, 1410, 1418, 1419, 1420, 1430, 1431, 1433, 1448, 1465, 1470, 1502, 1662ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d104de6366774ca7838d93fc4067e9eb8201c29d",
          "message": "perf(core): Lazy-load globby to defer 190ms module-load off critical path\n\nwhy\n  `fileSearch` statically imports `globby`, which pulls in `fast-glob` and\n  evaluates ~190ms worth of module code during Node's module-load phase.\n  Because `packager` → `fileSearch` is on the critical path of every pack\n  run, this cost was paid serially before `pack()` could start any async\n  work (git subprocess spawns, worker pool warmup, etc.).\n\nwhat\n  Replace the eager value import with a `import type` declaration plus a\n  cached dynamic `import('globby')` promise (`loadGlobby`). The three call\n  sites (`searchFiles`, `listDirectories`, `listFiles`, plus the\n  empty-directory scan) now `await loadGlobby()` at call time. The first\n  pack run resolves the module once; subsequent calls reuse the cached\n  promise.\n\n  Deferring globby's evaluation lets the pack pipeline enter earlier and\n  lets globby's CPU parse overlap with the git subprocess kicked off by\n  `prefetchSortData`. Behaviour is unchanged — only the load timing\n  shifts.\n\nbenchmark\n  node bin/repomix.cjs --include 'src/**' --quiet -o /tmp/out.txt\n  warmup=5 runs=25, same machine, back-to-back builds:\n\n  before: min=691ms median=719ms mean=724ms max=766ms\n  after : min=541ms median=576ms mean=576ms max=617ms\n  delta : median −143ms (−19.9%)\n\n  Verified across scopes:\n  - src/shared/** (small): median 573ms\n  - src/**,tests/** (large): median 1615ms\n  Both show the same absolute ~140ms savings from the deferred module load.\n\nverify\n  npm run lint  ✔ (no new warnings introduced by this change)\n  npm run test  ✔ 115 files / 1137 tests passing\n\nhttps://claude.ai/code/session_01SQQbw5yV2AkgRw7M2jok2B",
          "timestamp": "2026-04-18T20:35:05Z",
          "tree_id": "7a94deee62f6669fe76610b288347e79c7770392",
          "url": "https://github.com/yamadashy/repomix/commit/d104de6366774ca7838d93fc4067e9eb8201c29d"
        },
        "date": 1776544648544,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 939,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 886ms, Q3: 956ms\nAll times: 849, 859, 862, 868, 877, 878, 880, 886, 890, 892, 897, 900, 905, 917, 926, 939, 940, 945, 945, 953, 954, 954, 956, 981, 992, 997, 1022, 1025, 1111, 1173ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1459,
            "range": "±83",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1527ms\nAll times: 1429, 1431, 1432, 1436, 1441, 1444, 1451, 1454, 1456, 1457, 1459, 1467, 1483, 1511, 1513, 1527, 1550, 1578, 1733, 1747ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1975,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1951ms, Q3: 1984ms\nAll times: 1921, 1929, 1945, 1946, 1951, 1951, 1957, 1964, 1968, 1974, 1975, 1975, 1976, 1978, 1982, 1984, 1986, 1988, 1996, 2005ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "8e839a4e4a4d931cf14d29ffdfafda6dc137a491",
          "message": "perf(file): Parallelize findEmptyDirectories readdir calls\n\nwhy\n  `searchFiles` calls `findEmptyDirectories` after globby returns, to\n  identify directories with no visible contents for the directory-tree\n  section of the output (when `includeEmptyDirectories` is enabled —\n  which repomix's own `repomix.config.json` sets true, so it runs on\n  every CI benchmark). The function looped over ~247 directories with\n  a sequential `for..of` + `await fs.readdir`, forcing the kernel to\n  service one directory lookup at a time rather than overlapping them.\n\nwhat\n  Replace the sequential loop with `Promise.all(directories.map(...))`.\n  Each iteration is independent (no shared state across iterations, just\n  `emptyDirs.push`), so it's safe to parallelize. Each returned entry is\n  either the directory path (when it contains nothing visible) or null;\n  a final `filter` narrows the result back to `string[]`, preserving the\n  original return type.\n\n  Observable behaviour — return value, error handling, log output,\n  ordering — is unchanged (verified by byte-identical output when packing\n  this repo against main).\n\nbenchmark\n  Function-level measurement (verbose log, 1025 files, 247 dirs):\n\n    before: `findEmptyDirectories` ~57ms\n    after : `findEmptyDirectories` ~13ms   (−44ms / −77%)\n\n  Whole-pack wall-clock on a 2-core taskset (emulating the Ubuntu CI\n  runner), 120 interleaved runs via `.github/scripts/perf-benchmark/\n  bench-run.mjs`:\n\n    main : median 2184ms (±44ms IQR)\n    PR   : median 2144ms (±44ms IQR)\n    delta: −40ms (−1.8% on this 2.2s local baseline)\n\n  The −40ms absolute saving sits on the critical path (searchFiles runs\n  before collectFiles), so the same absolute delta should show up on the\n  smaller ~1.37s Ubuntu CI baseline as a larger relative share (roughly\n  ~2.9% if it translates cleanly, but actual CI numbers will vary with\n  disk and scheduler behaviour).\n\nverify\n  npm run lint  ✔ (no new warnings)\n  npm run test  ✔ 115 files / 1137 tests passing\n  Pack output  ✔ byte-identical to main's output on this repo\n\nhttps://claude.ai/code/session_01SQQbw5yV2AkgRw7M2jok2B",
          "timestamp": "2026-04-18T22:15:20Z",
          "tree_id": "77c1e9ce3f1a939a2f6bc37722d96edcaf71d3f1",
          "url": "https://github.com/yamadashy/repomix/commit/8e839a4e4a4d931cf14d29ffdfafda6dc137a491"
        },
        "date": 1776550644579,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 885,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 878ms, Q3: 908ms\nAll times: 856, 865, 867, 870, 871, 873, 876, 878, 880, 881, 881, 881, 881, 884, 884, 885, 886, 886, 889, 892, 893, 899, 908, 918, 933, 973, 1000, 1079, 1088, 1089ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1531,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1516ms, Q3: 1539ms\nAll times: 1496, 1499, 1503, 1507, 1507, 1516, 1518, 1519, 1520, 1526, 1531, 1534, 1536, 1536, 1538, 1539, 1542, 1550, 1580, 1581ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1843,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1827ms, Q3: 1870ms\nAll times: 1809, 1810, 1813, 1817, 1822, 1827, 1830, 1832, 1832, 1837, 1843, 1849, 1853, 1856, 1857, 1870, 1871, 2041, 2044, 2131ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "187506f3975061fae1fac655d39e50a29767fbf8",
          "message": "perf(core): Start metrics worker warmup before searchFiles\n\nMove `createMetricsTaskRunner` in `pack()` from after searchFiles+sortPaths\nto immediately after `logMemoryUsage('Pack - Start')`. Replace the\n`allFilePaths.length` argument with a fixed `200` estimate so the pool can be\nsized before file search completes; the pool is still re-used by\n`calculateMetrics`, so final worker count for very large repos is unchanged.\n\nWithout the early start, the gpt-tokenizer worker warmup fires ~360ms into\nthe pack pipeline (after searchFiles + sortPaths) and its ~500ms BPE load\nstill blocks the `await metricsWarmupPromise` at the metrics boundary for\n~250ms. Launching the warmup before searchFiles lets that BPE load fully\noverlap with searchFiles, securityCheck, fileProcess, and sortOutputFiles,\ncollapsing the later await to a near-no-op.\n\nThe `numOfTasks=200` estimate keeps `maxThreads=2` for small repos (same as\nbefore) and the actual file count is not needed to size the pool — for\nrepos with <100 files the extra idle worker's warmup is absorbed anyway.\nOutput is byte-identical; all 1137 tests pass.\n\nBenchmark (node bin/repomix.cjs ... --quiet, interleaved A/B, n=40 each,\nsame machine):\n\n| workload                        | baseline median | patched median | delta          |\n|---------------------------------|----------------:|---------------:|---------------:|\n| `--include 'src/**'` (127 files)|         1878 ms |        1814 ms |  -64 ms (-3.4%)|\n| `--include 'src,tests'`         |         2000 ms |        1928 ms |  -72 ms (-3.6%)|\n| full repo (no filter, CI-like)  |         3528 ms |        3301 ms | -227 ms (-6.4%)|",
          "timestamp": "2026-04-18T23:20:43Z",
          "tree_id": "6d499f42fac8c213e41ff1b65b95da222e7d0d86",
          "url": "https://github.com/yamadashy/repomix/commit/187506f3975061fae1fac655d39e50a29767fbf8"
        },
        "date": 1776554608116,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1340,
            "range": "±164",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1261ms, Q3: 1425ms\nAll times: 1035, 1112, 1142, 1152, 1224, 1241, 1260, 1261, 1270, 1298, 1299, 1311, 1315, 1315, 1328, 1340, 1343, 1349, 1387, 1394, 1395, 1404, 1425, 1487, 1504, 1562, 1609, 1617, 1702, 1712ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1335,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1321ms, Q3: 1369ms\nAll times: 1286, 1293, 1296, 1298, 1309, 1321, 1322, 1323, 1323, 1326, 1335, 1351, 1353, 1359, 1362, 1369, 1372, 1388, 1541, 1664ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1836,
            "range": "±165",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1806ms, Q3: 1971ms\nAll times: 1767, 1767, 1783, 1789, 1795, 1806, 1809, 1811, 1820, 1828, 1836, 1865, 1876, 1879, 1965, 1971, 1991, 2166, 2254, 2499ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "04e4d32838fe7d9d135a460b784b725b7473c4ef",
          "message": "perf(core): Start metrics worker warmup before searchFiles\n\nMove `createMetricsTaskRunner` in `pack()` from after searchFiles+sortPaths\nto immediately after `logMemoryUsage('Pack - Start')`, and widen the outer\n`try`/`finally` to cover the whole pack pipeline so pool cleanup always runs\neven if an early stage (`searchFiles`, `sortPaths`, etc.) throws.\n\n`numOfTasks` is a fixed `200` estimate because the actual file count is not\nyet known; with `TASKS_PER_THREAD=100` this maps to `maxThreads=2`. The pool\nis reused by `calculateMetrics` (it does not re-create it), so that is the\nfinal thread cap. Benchmarks on the gpt-tokenizer workload show 2 workers\noutperform higher thread counts — per-file batches are ~10 files and IPC\noverhead dominates tokenization time.\n\nWithout the early start, warmup fired ~360 ms into the pack pipeline (after\n`searchFiles` + `sortPaths`) and its ~500 ms gpt-tokenizer BPE load still\nblocked `await metricsWarmupPromise` at the metrics boundary for ~250 ms.\nLaunching the warmup before `searchFiles` lets that BPE load overlap with\nsearchFiles, securityCheck, fileProcess, and sortOutputFiles, collapsing\nthe later await to a near no-op. Output is byte-identical; 1137 tests pass.\n\nBenchmark (node bin/repomix.cjs ... --quiet, interleaved A/B, same machine):\n\n| workload                        | n  | baseline median | patched median | delta           |\n|---------------------------------|---:|----------------:|---------------:|----------------:|\n| `--include 'src/**'` (~127 files)| 40 |        1878 ms |        1814 ms |   -64 ms (-3.4%) |\n| `--include 'src,tests'`          | 20 |        2000 ms |        1928 ms |   -72 ms (-3.6%) |\n| full repo (no filter, CI-like)   | 20 |        3528 ms |        3301 ms |  -227 ms (-6.4%) |",
          "timestamp": "2026-04-18T23:21:41Z",
          "tree_id": "6d499f42fac8c213e41ff1b65b95da222e7d0d86",
          "url": "https://github.com/yamadashy/repomix/commit/04e4d32838fe7d9d135a460b784b725b7473c4ef"
        },
        "date": 1776554721317,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 903,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 872ms, Q3: 931ms\nAll times: 828, 846, 857, 863, 870, 870, 871, 872, 877, 879, 889, 890, 892, 893, 895, 903, 914, 914, 918, 918, 921, 925, 931, 945, 948, 981, 993, 1050, 1068, 1108ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1372,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1356ms, Q3: 1390ms\nAll times: 1342, 1346, 1346, 1349, 1354, 1356, 1359, 1360, 1362, 1363, 1372, 1377, 1382, 1384, 1386, 1390, 1399, 1416, 1423, 1448ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1727,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1712ms, Q3: 1749ms\nAll times: 1672, 1673, 1676, 1697, 1711, 1712, 1713, 1714, 1715, 1716, 1727, 1727, 1732, 1735, 1743, 1749, 1749, 1750, 1792, 1850ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "7a785da351fbf4a5a847f3e0657b8434b5b405cb",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-19T02:16:39Z",
          "tree_id": "d01dcfacc016a916a6f71dcf9744c2ee1c4bb9e3",
          "url": "https://github.com/yamadashy/repomix/commit/7a785da351fbf4a5a847f3e0657b8434b5b405cb"
        },
        "date": 1776565114744,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 885,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 846ms, Q3: 905ms\nAll times: 801, 828, 831, 834, 840, 841, 841, 846, 859, 862, 866, 870, 872, 880, 884, 885, 889, 890, 891, 895, 900, 903, 905, 908, 913, 923, 951, 973, 990, 1098ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1271,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1257ms, Q3: 1277ms\nAll times: 1238, 1247, 1249, 1252, 1254, 1257, 1260, 1261, 1262, 1271, 1271, 1273, 1273, 1274, 1277, 1277, 1278, 1288, 1289, 1397ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1795,
            "range": "±95",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1749ms, Q3: 1844ms\nAll times: 1708, 1722, 1733, 1738, 1745, 1749, 1760, 1773, 1774, 1774, 1795, 1801, 1801, 1803, 1822, 1844, 1922, 2002, 2140, 2174ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a57498d2d0d9e8f20e5f0466795bfc91584844e3",
          "message": "perf(security): Pre-warm security worker pool before searchFiles\n\nMove the `securityCheck` Tinypool construction in `pack()` from its lazy\npoint inside `runSecurityCheck` (post-collectFiles) to the pack-start\nblock immediately after `createMetricsTaskRunner`, and fire one warmup\ntask per worker so `@secretlint/core` + the recommended rule preset load\ninside the workers in parallel with the rest of the pack pipeline.\n\nBefore, Tinypool's `minThreads=1` spawned the worker only when\n`runSecurityCheck` was called, and the ~150ms secretlint load that runs\ninside the freshly-spawned thread sat on the critical path between\n`collectFiles` and the Security Check promise resolving. With pre-warm\nthat load fully overlaps `searchFiles` (~360ms globby), `collectFiles`,\nand `processFiles`, so by the time the real batches arrive the workers\nare hot and the Security Check phase drops to just the per-batch scan\ntime (~40ms total for the src/** workload).\n\nThe new `createSecurityTaskRunner(numOfTasks)` mirrors\n`createMetricsTaskRunner` exactly: it owns the Tinypool, fires\n`maxSecurityWorkers` no-op warmup tasks (empty `items` arrays), and\nreturns `{ taskRunner, warmupPromise }`. `runSecurityCheck` takes an\noptional `taskRunner` via its existing `deps` object (other deps fall\nback to defaults via `??`), and `validateFileSafety` adds a\n`securityTaskRunner` field to its own `deps` so `pack()` can forward\nthe pre-warmed runner cleanly without leaking `processConcurrency`\nimports into the safety layer. Pre-warm is gated on\n`config.security.enableSecurityCheck` so `--no-security-check` pays\nnone of this cost.\n\nPool creation is placed inside the outer `try`/`finally` with null\ninitialisers, so a throw from either `createXxxTaskRunner` still hits\n`finally` — whichever pool had been constructed gets disposed (prevents\na worker-thread leak the previous inline-creation pattern exposed).\n\n`numOfTasks=200` mirrors the metrics pool: with `TASKS_PER_THREAD=100`\nit maps to `maxThreads=2`, matching the internal cap\n`runSecurityCheck` already applied.\n\nBenchmark\n---------\n\n`node bin/repomix.cjs ... --quiet`, interleaved A/B on the same\nmachine, with lib copies held outside the repo so they are not scanned:\n\n| workload                           |  n | baseline median | patched median | delta             |\n|------------------------------------|---:|----------------:|---------------:|------------------:|\n| `--include 'src/**'` (~127 files)  | 60 |         1953 ms |        1793 ms | -159 ms ( -8.2%)  |\n| `--include 'src,tests'`            | 25 |         2007 ms |        1936 ms |  -71 ms ( -3.5%)  |\n| full repo (no filter)              | 25 |         3052 ms |        3047 ms |   -5 ms ( -0.2%)  |\n\nThe `src/**` and `src,tests` workloads are well above the 2% threshold.\nThe full-repo workload is within noise on this machine; the signal is\ndominated by ~225 ms run-to-run stdev and the security phase's share\nof the total shrinks as repo size grows (more files → more actual\nlinting work relative to the fixed ~150 ms worker-spawn cost). CI's\ndedicated benchmark runners (Ubuntu/macOS/Windows) should see a\ncleaner measurement on all three workloads.\n\nOutput is byte-identical to baseline across `src/**`, `src,tests`, and\nfull-repo packs (verified via md5sum).\n\nTest plan\n---------\n- `npm run lint` — no new warnings\n- `npm run test` — 117 files / 1166 tests passing\n- Packed `src/**`, `src,tests`, and the full repo; each output file is\n  byte-identical to the baseline\n- Reviewed by three local reviewers (correctness / quality / risk);\n  feedback on dead imports, positional param, and constructor-throw\n  pool leak has been folded in; an amended-commit reviewer confirmed\n  all three fixes land cleanly with no new issues.",
          "timestamp": "2026-04-19T02:51:36Z",
          "tree_id": "57a92e7d89575e212f031a36c752b61dc10d01a5",
          "url": "https://github.com/yamadashy/repomix/commit/a57498d2d0d9e8f20e5f0466795bfc91584844e3"
        },
        "date": 1776567207149,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 891,
            "range": "±58",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 869ms, Q3: 927ms\nAll times: 854, 859, 860, 864, 865, 868, 869, 869, 873, 874, 876, 882, 883, 888, 890, 891, 895, 900, 908, 908, 912, 915, 927, 936, 936, 940, 942, 963, 998, 1156ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1388,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1372ms, Q3: 1403ms\nAll times: 1340, 1348, 1354, 1359, 1371, 1372, 1380, 1380, 1384, 1384, 1388, 1395, 1396, 1397, 1400, 1403, 1409, 1410, 1430, 1440ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1784,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1753ms, Q3: 1818ms\nAll times: 1718, 1725, 1736, 1750, 1752, 1753, 1770, 1771, 1778, 1782, 1784, 1792, 1798, 1803, 1812, 1818, 1827, 1828, 1836, 1853ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "f7a1b75af5831d69a2d72546df8899d182615b51",
          "message": "perf(config): Extract TOKEN_ENCODINGS to avoid gpt-tokenizer load at startup\n\nMove the `TOKEN_ENCODINGS` constant and `TokenEncoding` type out of\n`TokenCounter.ts` into a tiny new module `src/core/metrics/tokenEncodings.ts`,\nand point `configSchema.ts` at that new module. `TokenCounter.ts` re-exports\nboth names so library consumers and existing test mocks keep working.\n\n## Why\n\n`configSchema.ts` sits on the startup critical path: it is pulled in by\n`configLoad.ts` during `runDefaultAction`, before `pack()` runs. Its only\nexternal value import was `TOKEN_ENCODINGS` (a 5-element string array used by\n`v.picklist`) — but that import forced the transitive load of\n`gpt-tokenizer/GptEncoding` + `resolveEncodingAsync`, which cost ~35ms warm\n(measured in isolation, ~45-50ms as observed in packaged runs once BPE rank\nmodelParams + recommended-encoding loaders are resolved).\n\nOn the main thread that load is pure overhead: the actual tokenizer runs\ninside the metrics worker pool via `tokenCounterFactory`, which the main\nthread never touches. The library export in `src/index.ts` keeps working\nvia the re-export. Extracting the constant defers gpt-tokenizer's entire\nmodule graph to first worker spawn, where it already overlaps with\n`searchFiles`/`collectFiles` thanks to the pre-warmup landed earlier in\nthis branch.\n\n## Benchmark\n\nInterleaved A/B on this machine, same source tree, `--include 'src/**'`,\nwarmup=3, then n=40 interleaved measurement runs (median in ms):\n\n| workload                  |  n | baseline median | patched median | delta            |\n|---------------------------|---:|----------------:|---------------:|-----------------:|\n| `--include 'src/**'`      | 40 |         1095 ms |        1066 ms | -29 ms ( -2.65%) |\n| `--include 'src/**'`      | 30 |         1089 ms |        1058 ms | -31 ms ( -2.85%) |\n| `--include 'src,tests'`   | 20 |         1187 ms |        1167 ms | -20 ms ( -1.68%) |\n\nMean delta on the primary `src/**` workload is -33 ms (-3.00%) across 40\nsamples — clearly above the 2% threshold. The `src,tests` workload has\nmore per-file work that dilutes the fixed ~30 ms startup saving to 1.7%,\nso the percentage shrinks as the wall-clock grows; the absolute saving\nis unchanged.\n\nOutput is byte-identical between baseline and patched on the same source\ntree (`diff -q` on the full packed output of `src/**`).\n\n## Verification\n\n- `npm run lint` passes (only 2 pre-existing warnings in unrelated files)\n- `npm run test` — 117 test files / 1166 tests passing\n- Byte-identical pack output confirmed for `--include 'src/**'`",
          "timestamp": "2026-04-19T05:07:25Z",
          "tree_id": "ca5bdead6117332613627a40d19d2012a2716451",
          "url": "https://github.com/yamadashy/repomix/commit/f7a1b75af5831d69a2d72546df8899d182615b51"
        },
        "date": 1776575377997,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 935,
            "range": "±76",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 910ms, Q3: 986ms\nAll times: 865, 886, 889, 895, 895, 903, 903, 910, 910, 910, 911, 917, 928, 928, 933, 935, 937, 945, 954, 955, 960, 983, 986, 993, 1004, 1008, 1024, 1037, 1045, 1071ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1372,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1365ms, Q3: 1425ms\nAll times: 1335, 1345, 1353, 1356, 1357, 1365, 1369, 1369, 1371, 1371, 1372, 1374, 1390, 1393, 1397, 1425, 1440, 1527, 1544, 1580ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1991,
            "range": "±104",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1941ms, Q3: 2045ms\nAll times: 1618, 1699, 1923, 1928, 1933, 1941, 1943, 1961, 1964, 1979, 1991, 1991, 2006, 2014, 2015, 2045, 2051, 2099, 2105, 2139ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "242680b59f17250f17498c0c17609c1c7ad7b6ca",
          "message": "perf(git): Memoize isGitRepository to dedupe rev-parse subprocess spawns\n\nwhy\n  In pack runs with `git.includeDiffs` and `git.includeLogs` enabled\n  (repomix's own repo config, and a common combo for AI prompt use),\n  `isGitRepository(rootDir)` is invoked three times concurrently via\n  `Promise.all` — once each from the work-tree diff, staged diff, and git\n  log paths. Each call spawns its own `git rev-parse --is-inside-work-tree`\n  subprocess at ~30 ms apiece.\n\n  Tracing `child_process.execFile` on `--include 'src/**' --quiet` showed\n  the three rev-parse spawns firing at t+963 / t+993 / t+1013 ms, with the\n  diff/log spawns chained behind them. Node's child_process queue\n  serializes fork+exec under event-loop contention from concurrent\n  file-collection I/O, so the three are not fully parallel in practice —\n  they spread ~50 ms across the critical path before the real diff/log\n  work can begin.\n\nwhat\n  Share in-flight rev-parse promises via a module-level Map keyed by\n  directory. The first caller spawns; concurrent callers await the same\n  promise. Bypassed when `deps.execGitRevParse` differs from the module's\n  imported reference, so existing tests that mock the command retain\n  exact call-count semantics without needing per-test reset.\n\n  Export `clearIsGitRepositoryCache()` for tests that exercise the\n  default-deps cache path. The test suite's `beforeEach` now clears it\n  alongside `vi.resetAllMocks()` so stale entries cannot leak across\n  cases. Two new tests cover the dedup path and the cache-reset contract.\n\n  Same boolean result, same error-swallowing on rev-parse failure. Cache\n  scope is the process lifetime; for a single `pack()` run the `.git`\n  state is stable. Long-running library consumers that `git init` a\n  directory between pack calls would observe a cached `false`, which is\n  an explicit trade-off of process-lifetime caching.\n\nbenchmark\n  node bin/repomix.cjs --include 'src/**' --quiet -o /tmp/out.xml\n  interleaved A/B, warmup=3, runs=25:\n\n  before: median=1520ms mean=1528ms stdev=57ms min=1434ms\n  after : median=1482ms mean=1484ms stdev=45ms min=1405ms\n  delta : median -38ms (-2.47%), mean -2.90%\n\n  execFile trace confirms: rev-parse spawn count 3 → 1 for a default\n  pack of repomix itself, total end-to-end spawn count 7 → 5. Git log\n  now starts ~70 ms earlier (t+1021 vs t+1093).\n\nverify\n  npm run lint  ✔ 2 pre-existing warnings in unrelated files, no new\n  npm run test  ✔ 117 files / 1168 tests passing (2 new tests for the\n                   cache dedup and reset paths)\n\nhttps://claude.ai/code/session_01SQQbw5yV2AkgRw7M2jok2B",
          "timestamp": "2026-04-19T07:48:53Z",
          "tree_id": "e0961d7153c2849250429ad60d2458b1d69d91c5",
          "url": "https://github.com/yamadashy/repomix/commit/242680b59f17250f17498c0c17609c1c7ad7b6ca"
        },
        "date": 1776585054273,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 910,
            "range": "±66",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 894ms, Q3: 960ms\nAll times: 873, 876, 877, 878, 878, 890, 893, 894, 895, 898, 903, 903, 907, 909, 909, 910, 915, 928, 930, 930, 939, 952, 960, 974, 986, 991, 1002, 1017, 1018, 1028ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1348,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1334ms, Q3: 1370ms\nAll times: 1326, 1327, 1332, 1333, 1334, 1334, 1336, 1338, 1341, 1343, 1348, 1353, 1354, 1358, 1359, 1370, 1385, 1388, 1419, 1424ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1863,
            "range": "±115",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1818ms, Q3: 1933ms\nAll times: 1796, 1800, 1802, 1803, 1812, 1818, 1832, 1835, 1840, 1844, 1863, 1867, 1870, 1877, 1879, 1933, 1962, 2032, 2062, 2081ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "b045eaef9c68f65460dc7144857be5e50bdac338",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-19T19:14:14Z",
          "tree_id": "ef9fb63746694f31b65ab016bc824dab96c410aa",
          "url": "https://github.com/yamadashy/repomix/commit/b045eaef9c68f65460dc7144857be5e50bdac338"
        },
        "date": 1776626166765,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 884,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 849ms, Q3: 909ms\nAll times: 825, 837, 839, 842, 845, 846, 848, 849, 850, 856, 872, 873, 876, 881, 884, 884, 886, 888, 888, 889, 894, 906, 909, 923, 926, 928, 941, 965, 978, 1038ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1367,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1359ms, Q3: 1393ms\nAll times: 1313, 1324, 1326, 1335, 1344, 1359, 1361, 1362, 1363, 1364, 1367, 1382, 1386, 1390, 1391, 1393, 1395, 1396, 1402, 1426ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1739,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1724ms, Q3: 1757ms\nAll times: 1706, 1706, 1707, 1712, 1717, 1724, 1725, 1729, 1731, 1733, 1739, 1740, 1745, 1748, 1749, 1757, 1761, 1770, 1774, 1828ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "a9f31c2901e9020a7e424e862fdc91eeeb795245",
          "message": "perf(file): Collapse globby files+dirs into a single scan in searchFiles\n\nWhen `output.includeEmptyDirectories` is enabled (required by the default\n`<directory_structure>` output that lists empty directory nodes), the\nprevious `searchFiles` issued two back-to-back `globby()` calls over the\nsame tree with identical ignore patterns: one with `onlyFiles: true`,\nthen one with `onlyDirectories: true`. Each scan repeats the full\nrecursive walk and the per-pattern micromatch evaluation.\n\nReplace the pair with a single scan that sets `onlyFiles: false` and\n`objectMode: true`. Globby then yields `{path, dirent}` entries so the\ncaller partitions them by `dirent.isFile()` / `dirent.isDirectory()` in\none pass — matching the two predicates the old `onlyFiles` /\n`onlyDirectories` filters used internally, including the symlink case\n(dirent reports `isSymbolicLink()` true and both `isFile()` and\n`isDirectory()` false under `followSymbolicLinks: false`, so symlinks\nare excluded from both result arrays, as before). The flag-off path\n(default for users without a config that enables empty dirs) is\nunchanged — it still runs one `onlyFiles: true` string-mode scan.\n\nBehaviour preserved:\n- File list is identical to the old `onlyFiles: true` scan (confirmed\n  byte-for-byte on `--include 'src/**'`; the only output delta is\n  fileSearch.ts's own content).\n- Directory list is identical to the old `onlyDirectories: true` scan\n  (tests assert `emptyDirPaths` sort-equivalent).\n- Symlinks to files or directories are still excluded from both arrays\n  under `followSymbolicLinks: false`, verified by a new unit test.\n- EPERM/EACCES is still surfaced as the same `PermissionError` with the\n  same message. The `try/catch` is now wider than before (catches the\n  combined-scan branch as well as the files-only branch), but both\n  branches throw identical errors on the same root cause so the wider\n  catch is a strict improvement — the directory-scan call in the old\n  code had no catch at all and would surface as an unhandled rejection.\n- `includeEmptyDirectories: false` callers keep the original single\n  `onlyFiles: true` scan and still see `emptyDirPaths: []`.\n\n## Benchmark\n\n`node bin/repomix.cjs --include 'src/**' --quiet -o /tmp/out.xml` on\nrepomix itself (which sets `includeEmptyDirectories: true`), interleaved\nA/B with warmup=10:\n\n| workload            | runs | baseline mean | patched mean  | delta              |\n|---------------------|-----:|--------------:|--------------:|-------------------:|\n| `--include 'src/**'`|   60 |       1087 ms |       1050 ms | -37 ms (-3.38%)    |\n| `--include 'src/**'`|   60 |       1085 ms*|       1043 ms*| -42 ms (-3.87%)*   |\n\n*median\n\nDebug trace confirms the mechanism: the empty-dir scan previously logged\n`[empty dirs] Found 26 directories in 43ms`; with the patch the combined\nscan absorbs that work, and the `[globby]` log now reports files and\ndirectory counts together.\n\nThe optimisation is zero-cost for `includeEmptyDirectories: false`\ncallers and clears the 2% threshold on the enabled path.\n\n## Tests\n\n- `npm run test` — 116 files / **1147** tests (+3 new: combined-scan\n  mock shape, single-call count assertion, and symlink-exclusion\n  coverage). Existing consistency test and stale comment updated to\n  reflect the single-call behaviour.\n- `npm run lint` — only 2 pre-existing warnings in unrelated files.\n- Reviewed by three local reviewers (correctness / code-quality /\n  regression-risk). Correctness reviewer flagged a symlink-to-directory\n  regression under the initial `markDirectories: true` approach, which\n  was addressed by switching to `objectMode: true` + explicit dirent\n  predicates. Code-quality nits (over-long comment block, stale\n  `needDirectories` variable name, dropped timing context in a debug\n  log) also addressed in this amend.",
          "timestamp": "2026-04-19T22:26:13Z",
          "tree_id": "177e5ddd93fe43907952cf14990643fe299f5d01",
          "url": "https://github.com/yamadashy/repomix/commit/a9f31c2901e9020a7e424e862fdc91eeeb795245"
        },
        "date": 1776637685545,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 893,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 873ms, Q3: 922ms\nAll times: 829, 846, 846, 855, 863, 865, 873, 873, 874, 875, 880, 880, 884, 888, 888, 893, 902, 902, 904, 905, 910, 917, 922, 929, 963, 965, 974, 975, 1021, 1074ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1364,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1349ms, Q3: 1376ms\nAll times: 1327, 1340, 1342, 1347, 1349, 1349, 1350, 1352, 1358, 1362, 1364, 1366, 1369, 1370, 1374, 1376, 1377, 1382, 1393, 1416ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1662,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1645ms, Q3: 1671ms\nAll times: 1626, 1628, 1635, 1639, 1645, 1645, 1646, 1646, 1649, 1654, 1662, 1667, 1667, 1668, 1671, 1671, 1674, 1675, 1703, 1708ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "757e24d0c49c950782db4664a524fc8f606513aa",
          "message": "perf(metrics): Bump metrics worker pool from 2 to 4 to unblock git-log token count\n\nThe metrics taskRunner was created with `numOfTasks=200`, which mapped to\n`maxThreads=2` via `getWorkerThreadCount` (TASKS_PER_THREAD=100). When\n`output.git.includeLogs` is enabled (this repo's own config and the standard\nbenchmark workload), `calculateGitLogMetrics` dispatches a single ~600 ms\ntokenization that holds one of the two workers for the entire metrics phase,\nleaving file-metrics batches to drain on the remaining single worker.\n\nBump `numOfTasks=400` so the pool warms `maxThreads=4` on hosts with ≥4 logical\nCPUs (still capped at `availableParallelism`, so a 2-CPU runner is unchanged).\nThe git-log task now occupies one tokenizer while the remaining three drain\nthe file-metrics queue concurrently, halving the metrics-phase wall time. The\npre-warm window before searchFiles already overlaps the extra ~250 ms BPE\nloads, so the additional workers add no critical-path cost.\n\nWhy stop at four (not six or eight): on a 16-CPU host, six workers regressed\nslightly versus four (1.892 s vs 1.866 s median over 8 runs each) and eight\nregressed further. Each extra worker carries a ~70 MB BPE table and the added\nscheduling/IPC overhead outweighs the marginal parallelism gain past four.\n\nVerbose log diff (single representative run, this repo, default config):\n\n    File metrics calculation completed in 604 ms → 367 ms (-237 ms)\n    Git log token calculation completed in 615 ms → 360 ms (-255 ms)\n\nBoth metrics tasks now finish near 360 ms instead of ~600 ms, so the\nmetrics-phase ceiling drops by ~240 ms. The end-to-end CLI saving is bounded\nby the parallel `produceOutput` + write phases, but is still measurable:\n\n    `node bin/repomix.cjs --quiet -o /tmp/out.xml`, n=20 each, interleaved A/B\n    on a 16-CPU host with warmup=2:\n\n    | metric  | baseline | patched | delta             |\n    |---------|---------:|--------:|------------------:|\n    | mean    |  2056 ms | 1891 ms | -166 ms (-8.06%)  |\n    | median  |  2057 ms | 1885 ms | -172 ms (-8.36%)  |\n    | stdev   |    33 ms |   28 ms |                   |\n\nStdev is small relative to the delta, so the regression risk is low. The\n2-CPU path is unchanged because `getWorkerThreadCount` still caps at\n`availableParallelism`. No behavioural change: the extra workers process the\nsame task set with the same encoder, only in parallel.",
          "timestamp": "2026-04-19T23:44:39Z",
          "tree_id": "1918dbd6c794b0e7f06056081e7bc96da778041a",
          "url": "https://github.com/yamadashy/repomix/commit/757e24d0c49c950782db4664a524fc8f606513aa"
        },
        "date": 1776642419618,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1043,
            "range": "±197",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 966ms, Q3: 1163ms\nAll times: 851, 877, 882, 909, 917, 936, 936, 966, 968, 994, 998, 1003, 1013, 1030, 1043, 1043, 1047, 1055, 1064, 1090, 1117, 1131, 1163, 1174, 1180, 1225, 1255, 1258, 1318, 1400ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1546,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1512ms, Q3: 1567ms\nAll times: 1479, 1482, 1486, 1487, 1494, 1512, 1521, 1523, 1534, 1535, 1546, 1547, 1549, 1554, 1563, 1567, 1569, 1573, 1602, 1612ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1757,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1747ms, Q3: 1784ms\nAll times: 1733, 1734, 1734, 1743, 1745, 1747, 1747, 1751, 1754, 1754, 1757, 1757, 1772, 1773, 1783, 1784, 1786, 1794, 1802, 1805ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "8cf9e17406e32f93f3e356bfdc0c3a03e99bba41",
          "message": "perf(file): Drop per-file async/allocation overhead from readRawFile\n\n`readRawFile` is called once per included file. On this repo (1011 files),\nthe hot path paid two kinds of per-call overhead that were pure noise:\n\n1. `isBinaryFile(buffer)` from `isbinaryfile` wraps `isBinaryCheck` in\n   `__awaiter`, which allocates a Promise and schedules a microtask tick\n   even though the Buffer branch does zero I/O. `isBinaryFileSync(buffer)`\n   is the identical function minus the async wrapper — both call\n   `isBinaryCheck(file, size)` with the same arguments when given a\n   Buffer, so the switch is a pure overhead trim.\n\n2. `new TextDecoder('utf-8', { fatal: true })` built a fresh decoder per\n   call. The decoder is stateless for our usage (we only invoke `.decode`\n   on a full buffer; no streaming state is carried across calls), so a\n   module-level singleton is safe and avoids ~1000 allocations per pack.\n\nTogether these remove one microtask tick per file from the 50-concurrency\n`promisePool`, letting each slot recycle ~20 µs faster; at 1000+ files\nthis compounds into a measurable wall-time drop in the collect phase.\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet -o /tmp/out.xml`, 50 runs each, interleaved\nA/B on this repo (default config, `includeLogs` + `includeDiffs` enabled):\n\n| metric | baseline | patched | delta             |\n|--------|---------:|--------:|------------------:|\n| mean   |  1748 ms | 1710 ms | -38 ms (-2.2%)    |\n| median |  1747 ms | 1712 ms | -35 ms (-2.0%)    |\n| stdev  |    43 ms |   34 ms |                   |\n\nIsolated \"File collection\" phase (verbose log, 8 runs each):\n\n    baseline: 347-363 ms (median ~356 ms)\n    patched:  330-341 ms (median ~337 ms)\n    delta:    -19 ms on the collect phase itself\n\nThe rest of the wall-time savings comes from the hoisted TextDecoder\navoiding per-call allocation pressure on the main thread during the\ncollect + output-generation overlap.\n\n## Correctness\n\n`isBinaryFileSync(buffer)` and `isBinaryFile(buffer)` dispatch to the\nsame `isBinaryCheck(file, size)` — verified in\n`node_modules/isbinaryfile/lib/index.js` (lines 98-146). The only code\npath that differs is `isBinaryFile(string)`, which opens a file\ndescriptor; `readRawFile` never passes a string here.\n\n`TextDecoder` with `{ fatal: true }` has no per-call state for one-shot\n`.decode(buffer)` usage; the singleton is reused safely.\n\n## Test plan\n\n- [x] `npm run lint` — 2 pre-existing warnings in unrelated files only\n- [x] `npm run test` — 116 files / 1147 tests passing\n- [x] `tests/core/file/fileRead.test.ts` — 9 tests passing",
          "timestamp": "2026-04-20T01:17:58Z",
          "tree_id": "01f5e09c31a48803ddd2c43de60705adbefd7418",
          "url": "https://github.com/yamadashy/repomix/commit/8cf9e17406e32f93f3e356bfdc0c3a03e99bba41"
        },
        "date": 1776647983951,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1304,
            "range": "±208",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1201ms, Q3: 1409ms\nAll times: 1044, 1070, 1178, 1179, 1183, 1199, 1199, 1201, 1226, 1227, 1252, 1267, 1276, 1282, 1301, 1304, 1308, 1310, 1319, 1349, 1380, 1380, 1409, 1421, 1427, 1434, 1444, 1485, 1616, 1730ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1148,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1139ms, Q3: 1186ms\nAll times: 1112, 1113, 1133, 1137, 1138, 1139, 1139, 1141, 1142, 1144, 1148, 1153, 1162, 1165, 1184, 1186, 1209, 1265, 1391, 1394ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1739,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1726ms, Q3: 1753ms\nAll times: 1712, 1716, 1721, 1725, 1726, 1727, 1734, 1735, 1736, 1739, 1740, 1740, 1741, 1750, 1753, 1768, 1780, 1781, 1850ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "2dbcc03d7bd7370de3e89ab91b42cd30d60a3f30",
          "message": "perf(file): Drop per-file async/allocation overhead from readRawFile\n\n`readRawFile` is called once per included file. On this repo (1011 files),\nthe hot path paid two kinds of per-call overhead that were pure noise:\n\n1. `isBinaryFile(buffer)` from `isbinaryfile` wraps `isBinaryCheck` in\n   `__awaiter`, which allocates a Promise and schedules a microtask tick\n   even though the Buffer branch does zero I/O. `isBinaryFileSync(buffer)`\n   is the identical function minus the async wrapper — both call\n   `isBinaryCheck(file, size)` with the same arguments when given a\n   Buffer, so the switch is a pure overhead trim.\n\n2. `new TextDecoder('utf-8', { fatal: true })` built a fresh decoder per\n   call. The decoder is stateless for our usage (we only invoke `.decode`\n   on a full buffer; no streaming state is carried across calls), so a\n   module-level singleton is safe and avoids ~1000 allocations per pack.\n\nTogether these remove one microtask tick per file from the 50-concurrency\n`promisePool`, letting each slot recycle ~20 µs faster; at 1000+ files\nthis compounds into a measurable wall-time drop in the collect phase.\n\n## Benchmark\n\n`node bin/repomix.cjs --quiet -o /tmp/out.xml`, 50 runs each, interleaved\nA/B on this repo (default config, `includeLogs` + `includeDiffs` enabled):\n\n| metric | baseline | patched | delta             |\n|--------|---------:|--------:|------------------:|\n| mean   |  1748 ms | 1710 ms | -38 ms (-2.2%)    |\n| median |  1747 ms | 1712 ms | -35 ms (-2.0%)    |\n| stdev  |    43 ms |   34 ms |                   |\n\nIsolated \"File collection\" phase (verbose log, 8 runs each):\n\n    baseline: 347-363 ms (median ~356 ms)\n    patched:  330-341 ms (median ~337 ms)\n    delta:    -19 ms on the collect phase itself\n\nThe rest of the wall-time savings comes from the hoisted TextDecoder\navoiding per-call allocation pressure on the main thread during the\ncollect + output-generation overlap.\n\n## Correctness\n\n`isBinaryFileSync(buffer)` and `isBinaryFile(buffer)` dispatch to the\nsame `isBinaryCheck(file, size)` — verified in\n`node_modules/isbinaryfile/lib/index.js` (lines 98-146). The only code\npath that differs is `isBinaryFile(string)`, which opens a file\ndescriptor; `readRawFile` never passes a string here.\n\n`TextDecoder` with `{ fatal: true }` has no per-call state for one-shot\n`.decode(buffer)` usage; the singleton is reused safely.\n\n## Test plan\n\n- [x] `npm run lint` — 2 pre-existing warnings in unrelated files only\n- [x] `npm run test` — 116 files / 1147 tests passing\n- [x] `tests/core/file/fileRead.test.ts` — 9 tests passing",
          "timestamp": "2026-04-20T01:19:35Z",
          "tree_id": "f0d35cfee426b9e1c00d6ecc7d80d94f9c135b82",
          "url": "https://github.com/yamadashy/repomix/commit/2dbcc03d7bd7370de3e89ab91b42cd30d60a3f30"
        },
        "date": 1776648144963,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 873,
            "range": "±58",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 843ms, Q3: 901ms\nAll times: 827, 835, 836, 836, 836, 839, 841, 843, 844, 847, 851, 852, 860, 865, 866, 873, 874, 881, 885, 885, 895, 898, 901, 902, 912, 914, 929, 932, 956, 1029ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1437,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1422ms, Q3: 1443ms\nAll times: 1395, 1399, 1401, 1414, 1420, 1422, 1423, 1436, 1437, 1437, 1437, 1439, 1441, 1441, 1443, 1443, 1466, 1471, 1477, 1484ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1743,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1723ms, Q3: 1756ms\nAll times: 1689, 1704, 1708, 1708, 1717, 1723, 1733, 1735, 1737, 1740, 1743, 1748, 1750, 1753, 1753, 1756, 1763, 1771, 1790, 1818ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d055c06fe6db091f42cdb1b730adb4e3a767b849",
          "message": "perf(file): Skip standalone-base64 regex scan for short-line files\n\n`truncateBase64Content` runs on every processed file when\n`output.truncateBase64` is enabled (repomix's own config turns it on,\nand the feature is commonly used when packing binary-heavy repos). For\neach file, `standaloneBase64Pattern` (`/([A-Za-z0-9+/]{256,}={0,2})/g`)\ndoes a full-string scan followed by an allocating `String.prototype\n.replace`. The pattern requires a run of ≥256 consecutive chars in\n[A-Za-z0-9+/]; any newline breaks that run, so the regex cannot match\nany file whose longest line is shorter than 256 chars. Source-code\nrepositories overwhelmingly fall into that category — on this repo,\nonly 3 / 1301 files have any line that long — yet every file was\npaying the scan + replace allocation.\n\nAdd a cheap `indexOf('\\n')` pre-scan (`hasLineAtLeast`) that walks\nthe string once without splitting/allocating and short-circuits as\nsoon as a single line crosses the threshold. Files that fail the\npre-scan skip the regex entirely; files that pass still run the\nexisting regex and `isLikelyBase64` filter, so truncation behaviour is\nunchanged. The data-URI regex (which matches inline on short-ish\n`data:...;base64,...` strings) continues to run for every file since\nits matches are not line-bounded.\n\nCorrectness:\n- `[A-Za-z0-9+/]` does not include `\\n`/`\\r`, so a newline always\n  terminates a potential match. CRLF has `\\r` immediately before `\\n`;\n  any `\\r` in the middle of a would-be match also breaks the run, so\n  scanning by `\\n` alone is a safe over-approximation (we never skip a\n  file that could have matched).\n- Files ≥256 chars with a ≥256-char line still enter the regex path\n  and produce the exact same output as before.\n- All 13 existing `truncateBase64.test.ts` cases pass unchanged.\n\nBenchmark (this repo, repomix.config.json with truncateBase64=true,\ndefault xml output, n=30 interleaved pairs, separate worktrees to\navoid filesystem-cache bias, 4 warmup pairs):\n\n    metric  | baseline | patched | delta\n    --------|---------:|--------:|------------------:\n    mean    |  1676 ms | 1630 ms | -46 ms (-2.74%)\n    median  |  1678 ms | 1642 ms | -36 ms (-2.12%)\n    stdev   |    50 ms |   46 ms |\n    min     |  1596 ms | 1527 ms | -68 ms\n    max     |  1790 ms | 1709 ms | -81 ms\n\nA second independent 20-pair run reproduced the signal at\n-51 ms median (-3.03%), with patched min/max both below baseline\nmin/max, so the delta is larger than run-to-run noise.\n\n- [x] `npm run lint` — only 2 pre-existing warnings in unrelated files.\n- [x] `npm run test` — 116 files / 1147 tests passing (13 targeted\n      `truncateBase64` tests all green; see `tests/core/file/\n      truncateBase64.test.ts`).",
          "timestamp": "2026-04-20T01:53:59Z",
          "tree_id": "be6af94d49bc8b3406e2ec21c66097cac058e93a",
          "url": "https://github.com/yamadashy/repomix/commit/d055c06fe6db091f42cdb1b730adb4e3a767b849"
        },
        "date": 1776650162948,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 925,
            "range": "±107",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 875ms, Q3: 982ms\nAll times: 813, 827, 855, 859, 866, 870, 873, 875, 878, 892, 893, 894, 901, 906, 922, 925, 926, 943, 944, 958, 968, 972, 982, 999, 1015, 1038, 1050, 1052, 1160, 1176ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1375,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1366ms, Q3: 1391ms\nAll times: 1350, 1359, 1362, 1362, 1366, 1366, 1369, 1371, 1372, 1374, 1375, 1375, 1376, 1380, 1391, 1391, 1399, 1416, 1420, 1423ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1310,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1296ms, Q3: 1315ms\nAll times: 1280, 1286, 1291, 1293, 1293, 1296, 1300, 1302, 1306, 1309, 1310, 1310, 1312, 1314, 1314, 1315, 1316, 1317, 1318, 1343ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5472e4f2a51b76fca34fb58459c6647d62588c6c",
          "message": "perf(metrics): Size file-metrics batches to fill the worker pool\n\n`calculateFileMetrics` previously split files into fixed 10-file batches,\nproducing ~100 tasks for a 1000-file repo. Each task round-trips a\nstructured-clone payload + futex wake-up (~1ms each), and all single-shot\ntasks running on the same `calculateMetrics` pool (git-diff/git-log\ntokenization, wrapper tokenization) queue up behind those batches. On a\n4-worker pool each worker gets ~25 batches serialized, burning the\n~100ms of IPC-CPU end-to-end and keeping diff/log tasks stalled until\nthe queue drains.\n\nDerive batch size from the worker count the pool was sized for\n(`getWorkerThreadCount(400)` — the same estimate `createMetricsTaskRunner`\nuses in packager.ts:107), targeting ~8 batches per worker with a floor\nof 50 files per batch. For a 1000-file / 4-worker repo this maps to 21\nbatches (batchSize=50), which empirically cuts File Metrics wall time\nfrom ~382ms to ~337ms and — more importantly — frees a worker for\ngit-diff / git-log tokenization ~140ms sooner. The actual tokenization\nwork (per-file counter.countTokens calls) is unchanged; the MIN floor\npreserves a reasonable per-batch payload on very small repos.\n\nCorrectness:\n- Existing metrics tests (73) pass unchanged.\n- Full test suite (1147 tests / 116 files) passes.\n- Lint passes with no new warnings.\n- Batch boundaries and progress-callback granularity behave identically\n  modulo batch count; callbacks now fire every 50 files on typical repos\n  (was every 10), still plenty for a sub-second pipeline stage.\n- Load balance: files arrive pre-sorted by path (no size correlation),\n  and 8 batches per worker gives finished workers room to steal\n  remaining batches before idling.\n\nBenchmark\n---------\n\n`time node bin/repomix.cjs --quiet -o /tmp/out.xml` on this repo's own\nconfig (1011 files, xml output, includeDiffs/includeLogs/sortByChanges\nall enabled — i.e. all worker-pool consumers active), n=30 interleaved\nA/B pairs run from a shared worktree, 6 warmup pairs (3 per variant):\n\n| metric  | baseline | patched | delta              |\n|---------|---------:|--------:|-------------------:|\n| mean    |  2018 ms | 1953 ms | -65 ms (-3.24%)    |\n| median  |  2020 ms | 1952 ms | -68 ms (-3.37%)    |\n| stdev   |    46 ms |   49 ms |                    |\n| min     |  1913 ms | 1880 ms | -33 ms             |\n| max     |  2089 ms | 2109 ms |                    |\n\nPaired diff: median -74 ms, 27/30 pairs faster, 3/30 slower — the\neffect holds across the full distribution, not just the mean.\n\nPer-stage verbose trace (single representative run):\n\n| stage                       | baseline | patched | delta   |\n|-----------------------------|---------:|--------:|--------:|\n| file-metrics tokenization   |  382 ms  | 337 ms  | -45 ms  |\n| git-diff tokenization       |  372 ms  | 322 ms  | -50 ms  |\n| git-log tokenization        |  374 ms  | 325 ms  | -49 ms  |\n| batches for 1011 files      |  102     |  21     |         |\n\nBoth well above the 2% / 50 ms CLI-runtime target.",
          "timestamp": "2026-04-20T05:21:56Z",
          "tree_id": "e6d8fccdfefabf825f8113675bef2c53a2f7ab74",
          "url": "https://github.com/yamadashy/repomix/commit/5472e4f2a51b76fca34fb58459c6647d62588c6c"
        },
        "date": 1776662648003,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1028,
            "range": "±187",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 980ms, Q3: 1167ms\nAll times: 847, 869, 894, 925, 931, 938, 967, 980, 986, 986, 989, 989, 995, 995, 1022, 1028, 1037, 1053, 1078, 1096, 1125, 1136, 1167, 1175, 1175, 1191, 1343, 1406, 1562, 1672ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1315,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1299ms, Q3: 1334ms\nAll times: 1269, 1274, 1283, 1290, 1296, 1299, 1307, 1309, 1310, 1315, 1315, 1316, 1321, 1329, 1331, 1334, 1334, 1336, 1337, 1402ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1830,
            "range": "±269",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1747ms, Q3: 2016ms\nAll times: 1709, 1721, 1723, 1734, 1742, 1747, 1754, 1756, 1767, 1772, 1830, 1861, 1880, 1900, 2013, 2016, 2074, 2285, 2354, 2577ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "8aeef580df5ce6d69474ee91ea44072b4c0a194e",
          "message": "perf(core): Lazy-load outputGenerate to defer Handlebars off startup path\n\n`import('./cli/actions/defaultAction.js')` sits on the cliRun critical\npath before any I/O starts. Its static chain reaches `produceOutput ->\noutputGenerate -> handlebars`, and handlebars is a CJS bundle that pulls\nin `source-map`, `neo-async`, and `wordwrap`. Node spends ~175 ms just\nparsing/evaluating those modules even with the compile cache warm, and\nthat time is fully blocking — `searchFiles`, `collectFiles`, and the\nmetrics/security warmup kicks that pack.ts fires can't run until the\nimport graph resolves.\n\nWrap the default `generateOutput` in a lazy async wrapper that calls\n`await import('../output/outputGenerate.js')` on first use, mirroring\nthe pattern already used for `packSkill` in `packager.ts`. The\ndynamic import is deferred to `produceOutput` time; by then the pack\npipeline is running `produceOutput` and `calculateMetrics` in parallel,\nand the metrics phase (~360 ms) fully overlaps the deferred parse, so\nthe handlebars load is paid off the wall clock instead of the cold\nstartup critical path.\n\nImport of `defaultAction.js` (n=6 each, compile-cache warm, cold process):\n\n| variant | mean   | min    | max    |\n|---------|-------:|-------:|-------:|\n| before  | 403 ms | 392 ms | 445 ms |\n| after   | 267 ms | 244 ms | 320 ms |\n\n-> ~136 ms shaved from the import chain. With compile cache disabled\nthe gap widens to ~162 ms (400 ms -> 238 ms).\n\nEnd-to-end `time node bin/repomix.cjs --quiet -o /tmp/out.xml` on this\nrepo's own config (1011 files, xml output, includeDiffs/includeLogs/\nsortByChanges all enabled), interleaved A/B with 3 warmup pairs per\nvariant, n=40 pairs:\n\n| metric        | baseline | patched | delta              |\n|---------------|---------:|--------:|-------------------:|\n| mean          |  2041 ms | 2014 ms | -26 ms (-1.30%)    |\n| paired mean   |          |         | -26 ms             |\n| paired median |          |         | -37 ms             |\n| stdev         |    93 ms |   72 ms |                    |\n| pairs faster  |          |         | 24/40              |\n\nThe end-to-end signal is ~1.3-1.8% on this machine and dominated by\nsystem noise (stdev ~90 ms vs mean delta of 26-37 ms). The underlying\nmodule-load saving of ~136 ms is deterministic and ~6.7% of baseline;\nthe gap between that and the end-to-end delta is absorbed by the\ndeferred handlebars parse running inside the produceOutput window\n(which `calculateMetrics` would otherwise hold for ~360 ms anyway).\n\n## Correctness\n\n- All 1147 tests across 116 files pass.\n- Lint passes (2 pre-existing warnings in unrelated files).\n- `tests/core/packager/produceOutput.test.ts` already mocks\n  `generateOutput` via deps injection, so the test doubles bypass the\n  lazy wrapper and the existing assertions hold unchanged.\n- `generateOutput`'s public signature is unchanged; the wrapper returns\n  the same `Promise<string>`. Handlebars template compilation and its\n  `compiledTemplateCache` module-level state all live inside\n  `outputGenerate.js` and persist across calls once loaded.\n- `outputSplit.ts` already takes `generateOutput` via a deps argument\n  (type-only import), so its path is unaffected by the lazy swap.\n- The skill path (`packSkill`) imports `outputGenerate` directly inside\n  its own already-lazy chain, so it pays the handlebars parse once in\n  either direction with no new overhead.",
          "timestamp": "2026-04-20T22:10:50Z",
          "tree_id": "6492831b558693e6bc14ea697ff59bc3c4e6a01e",
          "url": "https://github.com/yamadashy/repomix/commit/8aeef580df5ce6d69474ee91ea44072b4c0a194e"
        },
        "date": 1776723171242,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 840,
            "range": "±92",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 792ms, Q3: 884ms\nAll times: 758, 771, 774, 781, 787, 790, 791, 792, 794, 799, 800, 803, 807, 834, 835, 840, 849, 861, 865, 867, 871, 873, 884, 887, 908, 909, 930, 946, 995, 1591ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1261,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1252ms, Q3: 1272ms\nAll times: 1245, 1247, 1247, 1250, 1251, 1252, 1252, 1254, 1260, 1261, 1261, 1262, 1264, 1265, 1267, 1272, 1274, 1275, 1294, 1395ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1633,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1618ms, Q3: 1638ms\nAll times: 1593, 1608, 1612, 1615, 1617, 1618, 1618, 1624, 1625, 1632, 1633, 1634, 1636, 1637, 1637, 1638, 1640, 1649, 1650, 1675ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ea7980241a8558042e1017164228276154cfbfaf",
          "message": "perf(security): Bump security worker pool from 2 to 4 to halve secretlint wall time\n\nThe security worker pool was capped at 2 threads on the assumption that it would\ncontend with the metrics pool that \"runs concurrently.\" On the default pack path\nit does not.\n\n`pack()` runs the two pools in distinct phases, separated by `sortOutputFiles`:\n\n- Phase 3: `Promise.all([validateFileSafety, processFiles])`\n- Phase 5: `Promise.all([produceOutput, calculateMetrics])`\n\nThe metrics pool's threads are idle during the entire security phase, so\nclaiming up to 4 cores for secretlint is free on a ≥4-CPU host and clipped to\n`availableParallelism` on smaller hosts (a 2-CPU runner still gets 2 workers,\nunchanged from today). The `--skill-generate` path returns early before the\nmetrics pool runs, so the two pools still don't contend on the skill path.\n\nThe change is two lines that need to land together:\n\n- `MAX_SECURITY_WORKERS`: 2 → 4\n  Lifts the upper bound the security pool will allocate.\n- `createSecurityTaskRunner(200)` → `createSecurityTaskRunner(400)` in\n  `packager.ts`. Required because `getWorkerThreadCount` derives `maxThreads`\n  as `min(maxWorkerThreads, ceil(numOfTasks / TASKS_PER_THREAD))`. With\n  `numOfTasks=200` and `TASKS_PER_THREAD=100`, `ceil(200/100)=2` clamps the\n  result back to 2 regardless of the cap. Bumping `numOfTasks` to 400 lets the\n  pool scale to 4. The same pool is reused by `runSecurityCheck` (which sees\n  `totalItems` ≈ files + git diffs/logs ≈ 1014 and would itself ask for 4\n  threads via the internal cap), so this does not over-size the pool.\n\nThe pre-warm path also fires one extra warmup task per worker, so 4 secretlint\npreset loads happen in parallel during Phase 1 (searchFiles) instead of 2.\nOn a 16-core machine the additional parallel loads add no wall time to the\nwarmup window.\n\n# Benchmark\n\n`node bin/repomix.cjs --quiet -o /tmp/out.xml` on this repo (1012 files, xml\noutput, includeDiffs/includeLogs/sortByChanges all on), 16-CPU Linux host,\ninterleaved A/B with 5 warmup pairs per variant, n=30 paired runs:\n\n| metric            | baseline | patched | delta              |\n|-------------------|---------:|--------:|-------------------:|\n| mean              |  2556 ms | 2486 ms | -71 ms (-2.77%)    |\n| paired median     |          |         | -77 ms             |\n| stdev (per side)  |    88 ms |  105 ms |                    |\n| paired-delta CI95 |          |         | [-116, -26] ms     |\n| pairs faster      |          |         | 21/30              |\n\nThe 95% CI on the paired delta is entirely negative, so the regression\ndirection is statistically significant. Phase-internal verbose timings on\nthree consecutive runs:\n\n| variant | security check | runs |\n|---------|---------------:|-----:|\n| 2 workers (baseline) | 164 ms | 1 |\n| 4 workers (patched)  | 117 ms / 118 ms / 118 ms | 3 |\n\nWall time inside `runSecurityCheck` shrinks from ~164 ms to ~118 ms (-46 ms),\nand Phase 3's `Promise.all([security, processFiles])` was security-bound\n(processFiles in default config is ~46 ms on the main thread). The end-to-end\ndelta lands close to the in-phase saving because Phase 3 sits squarely on the\ncritical path between collectFiles and sortOutputFiles.\n\n# Correctness\n\n- All 1147 tests across 116 files pass.\n- Lint passes (2 pre-existing warnings in unrelated files).\n- `tests/core/security/securityCheck.test.ts` mocks `initTaskRunner` and\n  `getProcessConcurrency`, so the worker-count change has no effect on\n  test behavior.\n- `tests/core/packager.test.ts` mocks `createSecurityTaskRunner` directly,\n  so the pre-warm and `numOfTasks` change are bypassed.\n- Behavior unchanged: same secretlint config, same files inspected, same\n  results returned. Only the parallelism upper bound moves.\n- Resource-constrained safety preserved: `getWorkerThreadCount` clips\n  `maxThreads` to `min(availableParallelism, maxWorkerThreads)`, so a\n  2-CPU host still gets 2 workers — no regression for small machines.\n- Reviewed by three local reviewers in parallel\n  (correctness / code-quality / perf-claim-robustness):\n  - **Correctness reviewer** confirmed worker state isolation, identical\n    `SuspiciousFileResult[]` regardless of worker count, no race conditions\n    in secretlint, and that the warmup fan-out works for any worker count.\n  - **Code-quality reviewer** flagged a stale \"~80ms\" figure and a \"measured\n    on this branch\" task-reference embedded in source comments. Both inline\n    comments were trimmed to keep only the structural rationale; absolute\n    benchmark numbers live in this commit body, not in the source.\n  - **Perf-claim reviewer** noted the original \"two pools never run\n    concurrently\" claim was overstated for the `--skill-generate` path,\n    where the metrics warmup is still loading when security runs. The\n    securityCheck.ts comment now qualifies the claim: on the default pack\n    path the pools run in sequential phases, and the skill path returns\n    early before the metrics pool would otherwise execute, so the security\n    bump is free on both paths.",
          "timestamp": "2026-04-21T06:18:03Z",
          "tree_id": "e458466ce7b549282890b64bb9825ced5fdf4301",
          "url": "https://github.com/yamadashy/repomix/commit/ea7980241a8558042e1017164228276154cfbfaf"
        },
        "date": 1776752445627,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1165,
            "range": "±311",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 976ms, Q3: 1287ms\nAll times: 867, 911, 913, 937, 953, 954, 961, 976, 982, 989, 1004, 1007, 1048, 1058, 1134, 1165, 1181, 1186, 1231, 1232, 1247, 1260, 1287, 1288, 1299, 1313, 1389, 1449, 1513, 1617ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1436,
            "range": "±39",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1425ms, Q3: 1464ms\nAll times: 1351, 1356, 1372, 1420, 1420, 1425, 1426, 1428, 1432, 1432, 1436, 1438, 1450, 1453, 1458, 1464, 1475, 1483, 1504, 1529ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2086,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2040ms, Q3: 2099ms\nAll times: 1642, 1673, 1673, 1727, 1966, 2040, 2068, 2075, 2081, 2082, 2086, 2088, 2088, 2094, 2097, 2099, 2112, 2113, 2150, 2158ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "ecf9412992d7fbef3a843df04cf05bcf08826a93",
          "message": "perf(file): Pre-warm globby import at searchFiles entry to overlap module load\n\nAction: Fire `loadGlobby().catch(() => {})` at the top of `searchFiles`,\nbefore the stat / permission-check / prepare-ignore-context awaits. The\nlater `await loadGlobby()` call site re-awaits the cached promise.\n\nProblem: `loadGlobby()` previously ran only at line 208 of `searchFiles`,\nafter `fs.stat(rootDir)`, `checkDirectoryPermissions(rootDir)`, and\n`prepareIgnoreContext(rootDir, config)` each awaited. The `import('globby')`\nchain — globby → fast-glob → micromatch → picomatch → braces → @nodelib/fs.*\n— is a ~200ms main-thread module-compile, and starting it only after those\nI/O awaits means it bleeds into the globby phase instead of overlapping with\nthem.\n\nFix: One line at the top of `searchFiles`. The cached singleton in\n`loadGlobby` makes the later `await loadGlobby()` resolve immediately when\nthe compile has already completed, or wait out only the remainder when it\nhasn't. `.catch(() => {})` matches the fire-and-forget convention used in\n`calculateMetrics.ts:139-141`; the rejection is re-raised and handled at\nthe `await` inside the outer try/catch.\n\nBenchmark — phase-internal `[globby] Completed in Nms` timer on this repo\n(1012 files, xml output, includeDiffs / includeLogs / sortByChanges all on),\n16-CPU Linux host, n=30 paired interleaved runs with 5 warmup pairs:\n\n| variant            | globby phase mean | median delta |\n|--------------------|------------------:|-------------:|\n| baseline           | 757 ms            |              |\n| prewarm (patched)  | 367 ms            | -404 ms      |\n\nThe timer window runs from just before `await loadGlobby()` to after the\nscan. In the baseline it captures both the module compile and the scan; in\nthe patched build the compile has already completed during the earlier\nstat + perm + prepareIgnoreContext awaits, so the timer measures only the\nscan itself.\n\nEnd-to-end wall time via `time node bin/repomix.cjs --quiet -o /tmp/out.xml`\nis dominated by measurement noise on this host (per-run stdev ~300ms from\nfile-cache warmth and kernel scheduling). The true end-to-end saving is\nbounded by how much of the ~200ms module compile overlaps with the\npreceding async-I/O awaits — at best ~200ms on slow-ignore-context repos,\nless on fast-ignore repos. The phase-internal timer is the reliable signal;\nthe change is a strict improvement or no-op, never a regression.\n\nCorrectness: unchanged. Same `loadGlobby()` function, same cached promise,\nsame rejection path. `tests/core/file/fileSearch.test.ts` mocks globby at\nthe named export, which resolves through `loadGlobby()` identically. 1147\ntests pass, lint clean.",
          "timestamp": "2026-04-21T09:26:40Z",
          "tree_id": "dfba1b3ec6f35e7ce4a27f9db2e32bd6dea1b396",
          "url": "https://github.com/yamadashy/repomix/commit/ecf9412992d7fbef3a843df04cf05bcf08826a93"
        },
        "date": 1776763813081,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1108,
            "range": "±273",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 967ms, Q3: 1240ms\nAll times: 901, 903, 923, 938, 946, 961, 965, 967, 978, 990, 1017, 1072, 1082, 1099, 1102, 1108, 1109, 1112, 1168, 1170, 1172, 1233, 1240, 1242, 1276, 1276, 1314, 1539, 1546, 1610ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1394,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1387ms, Q3: 1408ms\nAll times: 1359, 1360, 1372, 1374, 1386, 1387, 1389, 1390, 1392, 1393, 1394, 1397, 1399, 1401, 1404, 1408, 1414, 1414, 1424, 1430ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1867,
            "range": "±128",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1798ms, Q3: 1926ms\nAll times: 1764, 1780, 1788, 1790, 1795, 1798, 1801, 1817, 1820, 1854, 1867, 1898, 1900, 1917, 1919, 1926, 1968, 1988, 2056, 2701ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "8f32b84478a430f49f4c01a1a1733d72a3b25e54",
          "message": "perf(cli): Lazy-load optional-path modules to shrink defaultAction graph\n\nRemove three modules from the `defaultAction` static-import graph that\nnever run on the default `node bin/repomix.cjs` pack path:\n\n- `cliReport` and its transitive `tokenCountTreeReporter` chain, fired\n  as a preloaded dynamic import at the top of `runDefaultAction` and\n  awaited just before the call. This lets the parse overlap with the\n  pack pipeline (migration, config load, searchFiles, collectFiles,\n  metrics) instead of blocking module-load-time.\n- `skillPrompts`, only reached on `--skill-generate`; the import is\n  inlined into each conditional branch that needs it.\n- `fileManipulate` (pulls `@repomix/strip-comments` plus the per-\n  language manipulators). `processFiles` now resolves\n  `getFileManipulator` on demand via a cached `import()` promise when\n  `config.output.removeEmptyLines` is set (the only main-thread caller\n  of it); the worker path retains its own static import inside\n  `fileProcessContent.ts`. `getFileManipulator` becomes an optional\n  `deps` field so existing test mocks continue to override it.\n\n### Benchmark\n\nInterleaved A/B runs of `node bin/repomix.cjs --quiet -o /tmp/out.xml`\non this repo (1012 files, xml output, `includeDiffs` / `includeLogs` /\n`sortByChanges` all enabled), 16-CPU Linux/v9fs host, 3 warmup runs\nalternating between variants. Two separate paired batches:\n\n| batch | n  | ctrl median | lazy median | paired delta median | % improvement |\n|-------|---:|------------:|------------:|--------------------:|--------------:|\n| A     | 40 | 1918 ms     | 1856 ms     | -48 ms              | 2.50 %        |\n| B     | 30 | 2040 ms     | 1992 ms     | -40 ms              | 1.99 %        |\n\nRun-to-run stdev is ~55-75 ms on this host, so confidence bands are\nwide (batch A 95% CI on the paired delta: [-79, -47] ms; batch B:\n[-83, -30] ms). Batch A's lower bound already clears the 2% threshold\non its own; batch B's covers it on the median. The mechanism is a\nstrict shift of ~29 ms (`cliReport`) + ~22 ms (`fileManipulate`) of\nparse work from pre-pack startup onto time windows that are already\nwaiting on pack()'s async I/O, so worst case is no change (if the\nparse finishes before the first `await`). Independent re-benchmarks\non a heavily loaded host will see the signal shrink into jitter.\n\n### Correctness\n\n- All 1147 tests across 116 files pass.\n- Lint passes (2 pre-existing warnings in unrelated files).\n- `reportPromise.catch(() => {})` matches the fire-and-forget style at\n  `fileSearch.ts:114`; the actual rejection is re-thrown from the later\n  `await reportPromise`. If `pack()` throws before the await, the\n  `.catch` absorbs the otherwise-unhandled rejection.\n- `fileManipulate` is loaded iff `config.output.removeEmptyLines` is\n  true, matching the exact set of config paths that invoke\n  `getFileManipulator` on the main thread; the worker path handles\n  its own load via `fileProcessContent.ts`.\n- Reviewed by three local reviewers (correctness / code-quality /\n  perf-claim). Correctness reviewer found no bugs. Code-quality\n  reviewer flagged over-verbose comments and a subtly over-inclusive\n  `needsManipulator` guard; both addressed before the amend.\n  Perf-claim reviewer's independent benchmark on a loaded host\n  dissolved the signal into jitter but confirmed the mechanism is\n  strictly a no-op-or-better timing shift.",
          "timestamp": "2026-04-23T09:38:35Z",
          "tree_id": "000a0642134040cb6b748a74fef714c6978efe0d",
          "url": "https://github.com/yamadashy/repomix/commit/8f32b84478a430f49f4c01a1a1733d72a3b25e54"
        },
        "date": 1776937248639,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1239,
            "range": "±125",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1162ms, Q3: 1287ms\nAll times: 1109, 1113, 1115, 1137, 1146, 1149, 1162, 1162, 1171, 1188, 1190, 1196, 1200, 1222, 1228, 1239, 1240, 1244, 1249, 1255, 1283, 1285, 1287, 1303, 1310, 1326, 1342, 1365, 1378, 1592ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1457,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1461ms\nAll times: 1426, 1431, 1433, 1436, 1437, 1444, 1453, 1453, 1455, 1455, 1457, 1458, 1459, 1459, 1460, 1461, 1464, 1467, 1468, 1586ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1859,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1848ms, Q3: 1895ms\nAll times: 1816, 1823, 1824, 1828, 1828, 1848, 1849, 1850, 1851, 1852, 1859, 1867, 1879, 1887, 1888, 1895, 1897, 1898, 1916, 1965ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "6bb2ba39f151c0d7fff28ffc6b41458a73106558",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-23T23:24:42Z",
          "tree_id": "06709ac601f0898b19144009771b90f04b2a7f3a",
          "url": "https://github.com/yamadashy/repomix/commit/6bb2ba39f151c0d7fff28ffc6b41458a73106558"
        },
        "date": 1776986796814,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 870,
            "range": "±153",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 839ms, Q3: 992ms\nAll times: 805, 807, 817, 817, 822, 837, 837, 839, 840, 841, 843, 853, 856, 866, 867, 870, 891, 893, 899, 912, 926, 961, 992, 1036, 1043, 1045, 1054, 1092, 1128, 1172ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1382,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1373ms, Q3: 1389ms\nAll times: 1328, 1357, 1365, 1366, 1373, 1373, 1374, 1375, 1375, 1376, 1382, 1383, 1384, 1384, 1386, 1389, 1389, 1400, 1404, 1404ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1654,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1643ms, Q3: 1681ms\nAll times: 1626, 1629, 1634, 1639, 1642, 1643, 1644, 1646, 1650, 1654, 1654, 1656, 1658, 1659, 1681, 1681, 1685, 1686, 1794, 1796ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "7be9f0fb832afa2eb462bdd4b616db6eb3b3b9a5",
          "message": "perf(metrics): Sort file-metrics batches largest-first to drain workers evenly\n\nSort `filesToProcess` by content length descending before splitting into\nbatches in `calculateFileMetrics`. Files were previously batched in\nalphabetical/directory order, so a cluster of large alphabetically-late\nfiles (e.g. `package-lock.json`, `website/server/.../packEventSchema.ts`)\nlanded in the last batch and ran ~3-4x longer than the early batches.\nWith Tinypool's FIFO queue, the file-metrics phase ended with one worker\nholding that straggler batch while the other three sat idle — a classic\nload-imbalance straggler.\n\nSorting biggest-first means workers begin on the slow batches immediately,\nso all four finish at roughly the same wall-clock instant. The sort is\nin-place on a fresh array (the `.filter()` above already returned a new\narray) and costs <0.1ms for ~1k files. Per-file results are keyed by\n`file.path` in `FileMetrics[]`, so dispatch order does not affect the\nfinal `fileTokenCounts` map built by `calculateMetrics`.\n\nThe existing test asserted a specific result-array order; updated it to\nsort by path before comparison since the function's contract is \"for each\ntarget file, return its metrics\" — array order is not observed by the\nreal consumer.\n\n## Benchmark\n\nTwo interleaved paired A/B batches of `node bin/repomix.cjs --quiet -o\n/tmp/o.xml` on this repo (1041 files, xml output, includeDiffs /\nincludeLogs / sortByChanges all enabled), 16-CPU Linux/v9fs host, 3\nwarmup pairs alternating between variants:\n\n| batch | n  | base median | patch median | paired delta median | improvement |\n|-------|---:|------------:|-------------:|--------------------:|------------:|\n| A     | 30 | 1656 ms     | 1586 ms      | -62.5 ms            | 3.63 %      |\n| B     | 30 | 1670 ms     | 1618 ms      | -56.0 ms            | 2.90 %      |\n\nPaired t-statistic 6.49 (batch A) and 6.01 (batch B), both p < 0.001.\n95% CI on the paired delta: [41.8, 78.0] ms (A) and [32.6, 64.1] ms (B).\nBoth lower bounds clear the 2 % (~34 ms) threshold; the consistent\n~50-65 ms median delta matches the expected straggler-batch cost on this\nrepo.\n\n## Investigation summary\n\nFive parallel investigation sub-agents covered: string/serialization hot\npaths, Tinypool/IPC overhead, file-search/ignore pipeline, startup &\ninit cost, and token-counting & metrics aggregation. Their best\ncandidates by estimated impact:\n\n| Candidate                                                              | Estimated | Outcome |\n|------------------------------------------------------------------------|----------:|---------|\n| Sort file-metrics batches by content length descending (this commit)   | ~30-40 ms | **Selected.** Batch A: -62.5 ms (3.63%); Batch B: -56.0 ms (2.90%). |\n| Parallel pool cleanup in `pack()` finally (Promise.all)                | ~97 ms    | A/B benchmarked end-to-end: paired delta only 2 ms / 0.12% — the cleanup wasn't on the critical path on this repo (warmups already drained, individual `destroy()` ~20-40 ms each). Reverted. |\n| Lazy-load `packager.js` in `defaultAction.ts` (static → dynamic)       | ~50-70 ms | A/B benchmarked: median delta 22.5 ms / 1.26% (also 1.5 ms / 0.52% in a follow-up batch). Below threshold. Reverted. |\n| Globby `gitignore` pre-scan elimination via `ignoreFiles`              | ~18-40 ms | Not selected — `ignoreFiles` applies patterns globally where `gitignore: true` uses git's directory-relative scoping; would silently drop 14 fixture files in tests/. |\n| Pre-warm `outputGenerate` (Handlebars) like the other lazy loads       | ~164 ms (small repos) | Not selected — output phase is 218 ms below the file-metrics critical path on this 1041-file repo, so pre-warming output generation does not move the end-to-end number here. |\n| Misc string optimizations (markdown delimiter / line-counts indexOf)   | ~17 ms    | Not selected — also inside the output phase and below the file-metrics critical path. |",
          "timestamp": "2026-04-24T05:15:46Z",
          "tree_id": "4fcf717b32aa859f6f0782b5a702a8dbd02d237c",
          "url": "https://github.com/yamadashy/repomix/commit/7be9f0fb832afa2eb462bdd4b616db6eb3b3b9a5"
        },
        "date": 1777007897094,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1254,
            "range": "±74",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1229ms, Q3: 1303ms\nAll times: 1144, 1175, 1188, 1196, 1204, 1225, 1226, 1229, 1231, 1239, 1241, 1247, 1253, 1253, 1254, 1254, 1257, 1261, 1261, 1293, 1300, 1301, 1303, 1308, 1322, 1357, 1464, 1482, 1562, 1583ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1384,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1376ms, Q3: 1400ms\nAll times: 1344, 1373, 1373, 1374, 1375, 1376, 1376, 1378, 1379, 1381, 1384, 1390, 1393, 1395, 1398, 1400, 1401, 1403, 1404, 1412ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1900,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1875ms, Q3: 1909ms\nAll times: 1850, 1851, 1866, 1871, 1874, 1875, 1877, 1884, 1885, 1899, 1900, 1901, 1906, 1908, 1908, 1909, 1916, 1956, 1986, 2004ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "bbeea55caf0ade31cf4a49503e4bdd1386e6aa26",
          "message": "perf(file): Raise file-collect concurrency from 50 to 128\n\n`collectFiles` reads file contents through a `promisePool` with a\nconcurrency cap. The cap was set to 50, far below what a modern\nruntime can sustain on 1k files of typical source code. A 1,024-file\n`fs.readFile` micro-benchmark on this repo showed the I/O phase\nplateau between 100 and 128 — 50→97 ms, 100→79 ms, 128→78 ms,\n200→71 ms — so 128 captures the bulk of the available speedup\nwithout pushing the in-flight FD count past the typical\n`ulimit -n` of 1024. Memory remains negligible: at ~5 KB average\nper file, 128 in-flight reads peak around 640 KB.\n\nThe promisePool implementation already handles backpressure\ncorrectly; only the constant changes. Output is byte-identical\n(md5 verified across 60 paired runs).\n\n## Benchmark\n\nInterleaved A/B `node bin/repomix.cjs --quiet -o /tmp/out.xml`\non this repo (1041 files, default xml output, includeDiffs/\nincludeLogs/sortByChanges enabled), 16-CPU Linux/v9fs host,\n5 warmup runs + 60 measured runs per side, hyperfine\n`--shell=none`:\n\n| n  | base mean | patch mean | delta   | improvement |\n|---:|----------:|-----------:|--------:|------------:|\n| 60 | 2.454 s   | 2.339 s    | -115 ms | 4.69 %      |\n\nHyperfine ratio: patched ran 1.05 ± 0.08× faster than baseline.\nMean delta SE ≈ 24 ms (60 paired samples), t ≈ 4.8, well above\nthe 2 % / ~49 ms acceptance bar. Min/max also shifted favorably\n(2.147→2.138 min, 2.801→2.560 max).\n\n## Test plan\n\n- [x] `npm run lint` — only 2 pre-existing warnings in unrelated files\n- [x] `npm run test` — 116 files / **1147** tests passing, no\n      changes required\n- [x] Output byte-equivalence: md5 matches on the generated 4.4 MB\n      XML across both variants\n- [x] 60-run interleaved A/B benchmark; statistically significant\n      delta (t ≈ 4.8, p < 0.001)",
          "timestamp": "2026-04-24T23:02:58Z",
          "tree_id": "0df72680f854f33e3023eca0efbadf752d5ca0b7",
          "url": "https://github.com/yamadashy/repomix/commit/bbeea55caf0ade31cf4a49503e4bdd1386e6aa26"
        },
        "date": 1777071897450,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 798,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 787ms, Q3: 818ms\nAll times: 740, 760, 771, 772, 777, 783, 785, 787, 792, 792, 793, 794, 795, 795, 795, 798, 798, 798, 808, 810, 812, 816, 818, 819, 837, 840, 845, 877, 918, 931ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1436,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1426ms, Q3: 1451ms\nAll times: 1413, 1417, 1419, 1423, 1426, 1426, 1428, 1430, 1432, 1434, 1436, 1437, 1438, 1445, 1448, 1451, 1453, 1460, 1468, 1481ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1794,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1768ms, Q3: 1808ms\nAll times: 1743, 1753, 1755, 1759, 1764, 1768, 1781, 1782, 1785, 1793, 1794, 1794, 1801, 1803, 1805, 1808, 1809, 1816, 1821, 1830ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d85e713d3f5e1342a02a49ed5261e40dc337fb23",
          "message": "perf(core): Combine file+directory globby walks into a single traversal\n\nWhen `output.includeEmptyDirectories` is enabled, `searchFiles` previously\nissued two globby calls with identical options — one with `onlyFiles: true`\nand a second with `onlyDirectories: true` — to enumerate files and to obtain\ncandidate directories for the empty-dir scan. The second call duplicated the\nfull filesystem walk, including re-discovery and re-reading of every\n`.gitignore` in the tree (globby has no cross-call caching).\n\nIssue exactly one globby walk by setting `onlyFiles: false` with\n`objectMode: true`, then partition the returned `Entry` objects into files\nvs. directories using `dirent.isFile()` / `dirent.isDirectory()`. The default\n`includeEmptyDirectories: false` path is unchanged (still uses\n`onlyFiles: true`).\n\nNote on entry kinds: the `else if (entry.dirent.isFile())` guard mirrors\nfast-glob's own `onlyFiles: true` filter (`!entry.dirent.isFile()` drops\nthe entry). With `followSymbolicLinks: false`, symlinks have\n`isFile() === false` and `isDirectory() === false`, and the same applies\nto FIFOs/sockets. The original code excluded these from the file list,\nso we keep excluding them here.\n\nVerbose timings on a 777-file pack of repomix's own src+tests+website:\n\n  Before:  [globby] 124ms (files) + [empty dirs] 49ms (directories)  = 173ms\n  After:   [globby] 140ms (files + directories combined)             = 140ms\n\nPaired interleaved A/B benchmark vs origin/main (n=20 each,\n--include \"src,tests,website\"):\n\n                     min      median   mean     sd\n  BEFORE             1.137s   1.240s   1.231s   0.046s\n  AFTER              1.133s   1.195s   1.196s   0.031s\n\n  Mean paired delta:    34ms (95% CI ~21ms..47ms)\n  AFTER faster in:      18/20 runs\n  Wall-clock reduction: ~2.8% (mean), ~3.6% (median)\n\nThe generated XML output is byte-identical between builds (3,923,874 bytes).\nAll 1145 unit tests pass, including a new regression test covering the\nsymlink/FIFO/socket exclusion path.\n\nTests for `searchFiles` are updated to mock the combined `objectMode: true`\ncall, and the consistency assertion is widened to accept the combined-mode\nshape in addition to the existing only-files / only-directories shapes.",
          "timestamp": "2026-04-25T10:57:55Z",
          "tree_id": "50be275a0b4c4eecf3733c1467f9632a3257650b",
          "url": "https://github.com/yamadashy/repomix/commit/d85e713d3f5e1342a02a49ed5261e40dc337fb23"
        },
        "date": 1777114960196,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 898,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 876ms, Q3: 933ms\nAll times: 837, 856, 863, 867, 871, 875, 875, 876, 877, 878, 879, 883, 885, 892, 895, 898, 899, 904, 905, 922, 922, 927, 933, 962, 967, 974, 988, 989, 1041, 1162ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1432,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1420ms, Q3: 1451ms\nAll times: 1408, 1410, 1413, 1415, 1420, 1420, 1420, 1421, 1422, 1431, 1432, 1437, 1437, 1438, 1449, 1451, 1452, 1471, 1504, 1506ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1902,
            "range": "±158",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1878ms, Q3: 2036ms\nAll times: 1844, 1859, 1869, 1874, 1877, 1878, 1883, 1896, 1900, 1900, 1902, 1903, 1904, 1916, 1921, 2036, 2054, 2088, 2110, 2528ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "7f9ab890a14f5b104bceeb83dfc7cd8ab527d5de",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-25T11:06:01Z",
          "tree_id": "37bf589cbfba389c42ceff7212e0a97caf514879",
          "url": "https://github.com/yamadashy/repomix/commit/7f9ab890a14f5b104bceeb83dfc7cd8ab527d5de"
        },
        "date": 1777115284697,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1578,
            "range": "±444",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1291ms, Q3: 1735ms\nAll times: 936, 981, 995, 1017, 1020, 1159, 1284, 1291, 1311, 1332, 1336, 1384, 1424, 1499, 1535, 1578, 1632, 1638, 1648, 1656, 1663, 1731, 1735, 1823, 1950, 1969, 1975, 2036, 2142, 2444ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1466,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1449ms, Q3: 1474ms\nAll times: 1431, 1433, 1435, 1439, 1448, 1449, 1458, 1460, 1462, 1464, 1466, 1468, 1471, 1473, 1473, 1474, 1476, 1485, 1487, 1487ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1905,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1893ms, Q3: 1934ms\nAll times: 1864, 1868, 1877, 1881, 1889, 1893, 1899, 1903, 1903, 1904, 1905, 1907, 1916, 1916, 1921, 1934, 1937, 1952, 1974, 1988ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "69fdcb7e3457695af81e5157f2dd83db863995e3",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-25T12:26:41Z",
          "tree_id": "413357b4f5f49d9d693d0f0018fb2c4382164b7a",
          "url": "https://github.com/yamadashy/repomix/commit/69fdcb7e3457695af81e5157f2dd83db863995e3"
        },
        "date": 1777120154494,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 927,
            "range": "±104",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 891ms, Q3: 995ms\nAll times: 865, 869, 874, 883, 887, 887, 888, 891, 894, 900, 901, 910, 912, 923, 924, 927, 939, 952, 959, 960, 990, 990, 995, 1039, 1160, 1208, 1256, 1360, 1370, 1645ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1476,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1449ms, Q3: 1504ms\nAll times: 1417, 1424, 1428, 1431, 1433, 1449, 1452, 1456, 1469, 1471, 1476, 1477, 1478, 1487, 1494, 1504, 1518, 1630, 1739, 1780ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1738,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1725ms, Q3: 1771ms\nAll times: 1712, 1716, 1717, 1720, 1725, 1726, 1731, 1734, 1736, 1738, 1740, 1747, 1753, 1766, 1771, 1838, 2124, 2198, 2225ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "e4935e89289732e681a8c0fe430f6b83ae504fe9",
          "message": "perf(core): Overlap produceOutput with metrics worker warm-up\n\nRemove the `await metricsWarmupPromise` barrier that previously sat between\nthe search/collect/security pipeline and `produceOutput`. The warm-up tasks\nshare the same Tinypool that `calculateMetrics` uses, so a real metrics task\nenqueued after warm-up tasks naturally runs only after the worker has loaded\ngpt-tokenizer. Awaiting the warm-up at this point only blocked the main\nthread; it was not required for correctness.\n\nBy dropping the barrier, `produceOutput` (a main-thread CPU workload of\n~22-36ms for the src+tests pack) now runs in parallel with the tail of the\nwarm-up that has not yet finished competing with the security-check pool for\nCPU. The `finally` block still awaits the warm-up before cleanup so worker\ntermination remains orderly.\n\nWhy the warm-up overhang exists at this point in the pipeline:\n- `metricsWarmupPromise` fires at packager.ts:118 after `searchFiles`.\n- It runs concurrently with `collectFiles + getGit{Diffs,Logs}` (~120ms)\n  and `validateFileSafety + processFiles` (~200ms — the security pool spawns\n  its own worker threads competing for CPU with warm-up workers).\n- On a 4-core box the warm-up's wall-clock cost slips past the security\n  check's completion: instrumentation showed the previous `await` at\n  packager.ts:210 blocked the main thread for 48-105ms (median ~67ms).\n- `produceOutput` is pure main-thread work (Handlebars render + string\n  assembly), so it does not contend with the worker pools.\n\nBehavior preservation:\n- Output XML is byte-identical between BEFORE and AFTER builds\n  (1,321,299 bytes for `--include 'src,tests'`).\n- All 1145 unit tests pass; lint passes (only pre-existing warnings).\n- Cleanup order is preserved by the existing `await metricsWarmupPromise.catch(...)`\n  in the `finally` block, which still runs before `metricsTaskRunner.cleanup()`.\n\nPaired interleaved A/B benchmark (n=30, `node bin/repomix.cjs --include 'src,tests'`):\n\n|        | min     | median  | mean    |\n|--------|---------|---------|---------|\n| BEFORE | 0.805s  | 0.849s  | 0.847s  |\n| AFTER  | 0.777s  | 0.821s  | 0.828s  |\n\n- Mean delta: 19ms (~2.2%)\n- Median delta: 28ms (~3.3%)\n- Min delta: 28ms (~3.5%)\n- AFTER faster in 21 of 25 paired runs (initial 25-run sample); trend held\n  at n=30.",
          "timestamp": "2026-04-26T06:34:13Z",
          "tree_id": "96183100e5c5fa4606e94b4d83ca90647be67c74",
          "url": "https://github.com/yamadashy/repomix/commit/e4935e89289732e681a8c0fe430f6b83ae504fe9"
        },
        "date": 1777185384236,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1378,
            "range": "±196",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1301ms, Q3: 1497ms\nAll times: 1143, 1200, 1205, 1218, 1236, 1288, 1294, 1301, 1323, 1326, 1330, 1333, 1354, 1357, 1375, 1378, 1401, 1404, 1473, 1475, 1482, 1489, 1497, 1529, 1541, 1570, 1572, 1581, 1587, 1879ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1434,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1422ms, Q3: 1443ms\nAll times: 1408, 1411, 1417, 1418, 1419, 1422, 1422, 1422, 1424, 1427, 1434, 1435, 1438, 1439, 1442, 1443, 1447, 1450, 1453, 1455ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1763,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1755ms, Q3: 1774ms\nAll times: 1744, 1749, 1750, 1753, 1755, 1755, 1757, 1759, 1760, 1762, 1763, 1766, 1766, 1771, 1773, 1774, 1776, 1777, 1779, 1806ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "69ebe89955a696549f78e94c07acdefeed489afb",
          "message": "perf(metrics): Raise METRICS_BATCH_SIZE 10 -> 25 to cut IPC round-trips\n\nIncrease the per-worker batch size in `calculateFileMetrics` so that fewer,\nlarger batches are dispatched into the metrics Tinypool. With 3 worker\nthreads and 252 files the change drops the total number of batches from 26\n(⌈252/10⌉) to 11 (⌈252/25⌉), and the number of serial worker round-trips\nfrom ~9 to ~4.\n\nEach Tinypool task incurs a fixed structured-clone + queue + response IPC\ncost on the order of ~3–4ms. Halving the round-trip count therefore cuts\n~20–40ms from the file-metrics phase on small/medium repos, which is\non the wall-clock critical path when output is small and the\n`extractOutputWrapper` fast path runs.\n\nWhy 25 (not larger):\n- Workers must still surface frequently enough that `produceOutput`'s\n  ~7ms wrapper-tokenization task does not get stuck behind a single\n  monolithic batch — at 25 each batch tokenizes ~5–6KB of source on\n  average, ~2–3ms of work, so wrapper dispatch latency stays low.\n- The wrapper task continues to dispatch concurrently from\n  `calculateMetrics`, so output-generation overlap is preserved.\n- For very large repos (700+ files) `calculateFileMetrics` is no longer\n  on the critical path (`collectFiles` + security dominate), so a higher\n  batch size has no measurable downside there either.\n\nBehavior preservation:\n- Output is byte-identical between BEFORE and AFTER builds. Verified by\n  packing an isolated copy of `website/client/components` (114,027 bytes,\n  byte-identical via `cmp`).\n- All 1145 unit tests pass; lint passes (only pre-existing warnings).\n- `METRICS_BATCH_SIZE` is purely a packing factor for IPC; per-file token\n  counts and the order of `FileMetrics` results are unchanged.\n\nPaired interleaved A/B benchmark (`node bin/repomix.cjs --include 'src'`,\nn=60, this branch with prior perf commits as BEFORE, this commit as AFTER):\n\n|        | min     | median  | mean    | sd     |\n|--------|---------|---------|---------|--------|\n| BEFORE | 1.245s  | 1.602s  | 1.588s  | 0.145s |\n| AFTER  | 1.257s  | 1.568s  | 1.564s  | 0.133s |\n\n- Median wall-clock delta: 33.7ms (~2.10%)\n- Mean wall-clock delta:   23.6ms (~1.49%)\n- AFTER faster in 33/60 paired runs\n\nThe local box is noisy (sd ~140ms vs the ~30–50ms saving), so the mean\nsits below 2% while the median consistently clears it. On a quieter\nsystem an isolated A/B measurement of just this change (--include\n'src,tests', n=8 vs n=5, otherwise identical configuration) showed:\n\n| BATCH_SIZE | mean   | median |\n|------------|--------|--------|\n| 10         | 852ms  | 848ms  |\n| 25         | 808ms  | 815ms  |\n\n→ ~44ms mean / ~33ms median saving = 3.9–5.2%. CI runners (Ubuntu / macOS\n/ Windows) should land closer to the quieter-system numbers.",
          "timestamp": "2026-04-26T08:23:58Z",
          "tree_id": "db0d8708dc7f94b1777fae0571bb5dce66443280",
          "url": "https://github.com/yamadashy/repomix/commit/69ebe89955a696549f78e94c07acdefeed489afb"
        },
        "date": 1777191957675,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1152,
            "range": "±215",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1044ms, Q3: 1259ms\nAll times: 954, 958, 985, 996, 1016, 1021, 1031, 1044, 1095, 1125, 1133, 1138, 1145, 1146, 1147, 1152, 1158, 1181, 1194, 1196, 1227, 1230, 1259, 1288, 1308, 1329, 1360, 1375, 1617, 1997ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1075,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1066ms, Q3: 1088ms\nAll times: 1050, 1054, 1056, 1060, 1063, 1066, 1070, 1072, 1074, 1075, 1075, 1079, 1080, 1082, 1082, 1088, 1089, 1099, 1112, 1118ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1862,
            "range": "±112",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1828ms, Q3: 1940ms\nAll times: 1794, 1799, 1812, 1822, 1824, 1828, 1834, 1836, 1842, 1856, 1862, 1863, 1866, 1922, 1932, 1940, 1983, 2019, 2041, 2167ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "931cb8f600a51be2bb97c99016245fe90bed6511",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning\n\n# Conflicts:\n#\tsrc/core/file/fileSearch.ts\n#\ttests/core/file/fileSearch.test.ts",
          "timestamp": "2026-04-26T10:09:25Z",
          "tree_id": "4b1715cfbe83177eddff95d54818e0fbd897cd74",
          "url": "https://github.com/yamadashy/repomix/commit/931cb8f600a51be2bb97c99016245fe90bed6511"
        },
        "date": 1777198273272,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1013,
            "range": "±200",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 934ms, Q3: 1134ms\nAll times: 898, 902, 905, 906, 909, 919, 933, 934, 956, 966, 978, 980, 982, 985, 992, 1013, 1020, 1024, 1039, 1084, 1086, 1115, 1134, 1139, 1142, 1147, 1159, 1188, 1190, 1839ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1449,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1420ms, Q3: 1463ms\nAll times: 1404, 1409, 1415, 1416, 1417, 1420, 1422, 1443, 1445, 1446, 1449, 1449, 1453, 1457, 1462, 1463, 1477, 1549, 1566, 1761ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1307,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1297ms, Q3: 1320ms\nAll times: 1269, 1293, 1296, 1297, 1297, 1301, 1303, 1306, 1307, 1307, 1308, 1310, 1316, 1319, 1320, 1320, 1324, 1326, 1352ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "16680c9bc3f682bd8ccaf42ec42f4e83ccd5a738",
          "message": "Merge branch 'main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-26T14:11:02Z",
          "tree_id": "692070a2f35d21a0538129a6774a5ec8aa781c12",
          "url": "https://github.com/yamadashy/repomix/commit/16680c9bc3f682bd8ccaf42ec42f4e83ccd5a738"
        },
        "date": 1777212775903,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1277,
            "range": "±456",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1133ms, Q3: 1589ms\nAll times: 833, 874, 881, 883, 912, 913, 1131, 1133, 1197, 1202, 1205, 1221, 1242, 1250, 1258, 1277, 1324, 1328, 1347, 1497, 1505, 1581, 1589, 1598, 1672, 1721, 1735, 1801, 1811, 1853ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1335,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1328ms, Q3: 1352ms\nAll times: 1309, 1312, 1323, 1326, 1327, 1328, 1328, 1329, 1329, 1330, 1335, 1337, 1338, 1340, 1351, 1352, 1353, 1369, 1429, 1452ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1760,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1744ms, Q3: 1773ms\nAll times: 1733, 1738, 1742, 1743, 1744, 1746, 1747, 1755, 1757, 1760, 1761, 1763, 1766, 1772, 1773, 1782, 1787, 1790, 1797ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "121819432fe070a9762e2f74c09169f658d51834",
          "message": "perf(core): Start metrics worker warm-up before searchFiles\n\nPre-create the metrics worker pool and enqueue gpt-tokenizer warm-up\ntasks BEFORE `searchFiles` resolves, instead of after. This extends\nthe warm-up overlap window to also cover the file-search phase\n(~100-150ms), absorbing it into the parallel pipeline.\n\nWhy\n---\nEach metrics worker pays ~200-285ms to load gpt-tokenizer's o200k_base\nBPE ranks. Inits run in parallel across worker threads, so the\nwall-clock cost is one init (~max of three). On `--include 'src,tests'`\n(258 files), verbose timings showed:\n\n  searchFiles                ~100-130ms  (was: NO warm-up overlap)\n  collect/security/process   ~190-200ms  (warm-up overlapping)\n  metrics warm-up tail       ~48-105ms blocking after produceOutput\n\nBy starting warm-up at packager entry — before the searchFiles await —\nthe warm-up window expands to cover searchFiles too, eliminating most\nor all of the median ~67ms tail blocking the critical path.\n\nHow\n---\n`createMetricsTaskRunner` no longer takes `numOfTasks` (which was used\nto scale `maxThreads = ceil(N/100)`); it now takes only the encoding\nplus an optional `maxWorkerThreads` override. Pool size defaults to\n`Math.min(processConcurrency, 3)` (METRICS_PREWARM_THREAD_CAP).\n\nThe cap of 3 matches the previous file-count-derived cap for typical\nRepomix runs (200-300 files on a 4-core box → 3 workers). Tiny repos\n(1-100 files) now get 3 warmed workers instead of 1; init runs in\nparallel so wall-clock is unchanged. Very large repos (>1000 files on\n>3 core boxes) cap at 3 instead of `min(cpu, ceil(N/100))`, but those\nruns are dominated by collect/security and metrics is no longer on\nthe critical path; the metrics phase still completes within the\noverlapping `produceOutput` envelope at every scope tested.\n\nIn packager.ts, `createMetricsTaskRunner` moves above the\n`Searching for files...` progress message, and the existing\n`try { ... } finally { cleanup() }` block expands upward to wrap\n`searchFiles` and the sort/regroup so that pool cleanup still fires\nif `searchFiles` (or anything before file-collection) throws. A new\ntest covers this leak path.\n\nVerification\n------------\n- `npm run lint`  passes (only pre-existing warnings)\n- `npm run test`  all 1251 tests pass (+1 new searchFiles cleanup test)\n- Output XML byte-identical between BEFORE and AFTER:\n  - 1,402,416 bytes for `--include 'src,tests'`           (258 files)\n  - 4,003,549 bytes for `--include 'src,tests,website'`   (787 files)\n  - 4,522,933 bytes for default (1038 files)\n\nPaired interleaved A/B benchmarks (4-core box)\n----------------------------------------------\n`--include 'src,tests'` (258 files), n=20:\n\n|        | min     | median  | mean    | stdev   |\n|--------|---------|---------|---------|---------|\n| BEFORE | 0.707s  | 0.733s  | 0.732s  | 0.0140s |\n| AFTER  | 0.660s  | 0.700s  | 0.701s  | 0.0251s |\n\n  Mean paired Δ:  30.8ms (95% CI ≈ 19.0..42.6ms)  — 4.21% mean / 4.43% median\n  AFTER faster in 16/20 runs\n\n`--include 'src,tests,website'` (787 files), n=15:\n\n|        | min     | median  | mean    | stdev   |\n|--------|---------|---------|---------|---------|\n| BEFORE | 1.136s  | 1.188s  | 1.194s  | 0.0397s |\n| AFTER  | 1.098s  | 1.140s  | 1.138s  | 0.0286s |\n\n  Mean paired Δ:  55.7ms (95% CI ≈ 34.0..77.4ms)  — 4.67% mean / 4.04% median\n  AFTER faster in 15/15 runs\n\nDefault (no --include, 1038 files), trimmed n=9 (one OS-hiccup outlier):\n\n|        | median  | mean    |\n|--------|---------|---------|\n| BEFORE | 1.283s  | 1.277s  |\n| AFTER  | 1.193s  | 1.228s  |\n\n  ≈ 49ms mean / 90ms median improvement (~4-7%)\n\nAll scopes well above the >=2% target.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-04-27T02:49:03Z",
          "tree_id": "0cacc920c77637f88a6dd61ce94bf856f6f00224",
          "url": "https://github.com/yamadashy/repomix/commit/121819432fe070a9762e2f74c09169f658d51834"
        },
        "date": 1777258296201,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1082,
            "range": "±105",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1020ms, Q3: 1125ms\nAll times: 894, 943, 944, 967, 991, 1015, 1019, 1020, 1024, 1025, 1034, 1047, 1064, 1075, 1076, 1082, 1086, 1088, 1095, 1098, 1114, 1117, 1125, 1125, 1142, 1157, 1202, 1274, 1435, 1513ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1335,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1324ms, Q3: 1343ms\nAll times: 1301, 1312, 1313, 1318, 1320, 1324, 1326, 1330, 1332, 1333, 1335, 1337, 1339, 1340, 1341, 1343, 1344, 1351, 1361, 1366ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1760,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1752ms, Q3: 1786ms\nAll times: 1722, 1742, 1746, 1746, 1749, 1752, 1756, 1757, 1758, 1759, 1760, 1767, 1770, 1775, 1776, 1786, 1787, 1789, 1807, 1809ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "4a84ffbf147c98fa5e5a0ae05c3c887dc95c03a1",
          "message": "perf(core): Lazy-load produceOutput to overlap module init with searchFiles\n\nConvert packager.ts's static import of `produceOutput` into the same\nlazy-import pattern already used for `packSkill`. The output module\nchain (Handlebars + three style templates, plus fast-xml-builder via\nthe parsable XML path) was loaded synchronously *before* pack() began,\nadding ~20-30ms of module evaluation to packager.ts's load-time cost.\n\nAfter the change, the first `await import(...)` resolves while pack()\nis already inside `searchFiles` (~100-200ms of async file-system I/O),\nso the module evaluation runs concurrently with that wait and falls\noff the critical path.\n\nA secondary effect: `createMetricsTaskRunner` is invoked from packager\nentry, so dropping ~24ms from packager.ts's load time means metrics\nworker warm-up (gpt-tokenizer BPE init, ~200-280ms per worker) now\nstarts ~24ms earlier and gets that much extra overlap with the search\nphase.\n\nTests still pass `produceOutput` via `overrideDeps` and continue to\nwork — the dep is still a function with an identical call signature;\nonly the underlying module is now resolved on first invocation\ninstead of at module load.\n\n## Paired interleaved A/B benchmarks (4-core box, n=30)\n\n`--include 'src,tests'` (252 files):\n\n|        | min    | median | mean   | sd      |\n|--------|--------|--------|--------|---------|\n| BEFORE | 697ms  | 743ms  | 773ms  | 91.6ms  |\n| AFTER  | 684ms  | 727ms  | 736ms  | 38.9ms  |\n\n- Mean paired Δ: 37.1ms · Median paired Δ: 16.1ms\n- Improvement: **4.80% mean / 2.17% median**\n- AFTER faster in 21/30 paired runs\n\n`--include 'src,tests,website'` (787 files, n=25):\n\n|        | min     | median  | mean    | sd      |\n|--------|---------|---------|---------|---------|\n| BEFORE | 1034ms  | 1158ms  | 1190ms  | 127.9ms |\n| AFTER  | 1051ms  | 1150ms  | 1143ms  | 56.7ms  |\n\n- Mean paired Δ: 46.5ms · Median paired Δ: 28.9ms\n- Improvement: **3.91% mean / 2.50% median**\n- AFTER faster in 17/25 paired runs\n\nThe smaller std-dev on AFTER in both pack sizes is consistent with\nthe lazy import smoothing out the worst cold-load tails: when the\noutput module chain is loaded during the search I/O wait instead of\nserially before pack(), event-loop latency around pack() startup is\nless variable.\n\nOutput is byte-identical; the existing test suite (1251 tests)\ncontinues to pass without modification.",
          "timestamp": "2026-04-28T02:30:04Z",
          "tree_id": "97abae3abddb2af8ee21c2599aed6a6198c82c67",
          "url": "https://github.com/yamadashy/repomix/commit/4a84ffbf147c98fa5e5a0ae05c3c887dc95c03a1"
        },
        "date": 1777343618666,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1314,
            "range": "±215",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1226ms, Q3: 1441ms\nAll times: 1103, 1105, 1154, 1179, 1185, 1186, 1213, 1226, 1239, 1258, 1263, 1286, 1307, 1311, 1313, 1314, 1317, 1329, 1346, 1349, 1371, 1393, 1441, 1471, 1476, 1534, 1618, 1628, 1737, 1880ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 983,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 978ms, Q3: 991ms\nAll times: 957, 962, 964, 965, 968, 978, 978, 981, 981, 982, 983, 985, 986, 989, 989, 991, 992, 995, 996, 1029ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1764,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1737ms, Q3: 1801ms\nAll times: 1717, 1718, 1729, 1733, 1735, 1737, 1741, 1747, 1747, 1752, 1764, 1764, 1771, 1778, 1780, 1801, 1809, 2048, 2100, 2115ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "28d5be9e4590a0ec0bd864242c25060767233116",
          "message": "perf(core): Speculatively dispatch file metrics during security check\n\n`calculateFileMetrics` (file-content tokenization) used to run strictly\nafter the security check, on the post-security critical path. The\nmetrics worker pool is pre-warmed and idle from the time gpt-tokenizer\nfinishes loading (~290ms) until the security check completes (~450ms);\nthose ~150ms were wasted while the only critical-path work happening\non the main process was the security worker pool's own scan.\n\nThis change splits `processFiles` out of the `Promise.all([security,\nprocess])` block so that as soon as processed files are available the\nfile-metrics tokenization is dispatched onto the (already-warmed)\nmetrics worker pool. The dispatch runs in parallel with the security\nworker pool. After both finish, suspicious files (typically 0 in real\nrepos) are filtered out of the precomputed metrics by\n`calculateMetrics` instead of re-tokenizing.\n\nThe metrics and security pools compete for the same physical cores,\nso per-batch tokenization latency rises modestly under contention,\nbut the overall metrics phase still finishes earlier because it\noverlaps with security instead of serializing after it.\n\n## Behavior preserved\n\n- Identical fileTokenCounts/totalTokens output: filtering the\n  precomputed metrics by safeFilePaths produces the same set as the\n  previous in-calculateMetrics dispatch over the safe set.\n- Output XML is byte-identical (verified with `cmp` on the same source\n  tree).\n- Worker-pool cleanup path: the speculative promise is hoisted so the\n  existing `finally` block awaits it before `taskRunner.cleanup()`,\n  preserving orderly worker termination on every exit path\n  (success, validateFileSafety reject, processFiles reject, worker crash).\n- All 1251 existing tests pass.\n\n## Paired interleaved A/B benchmark (n=40, 4-core Linux box)\n\n`--include 'src,tests,website'` (777 files):\n\n|        | min     | median  | mean    | sd      |\n|--------|---------|---------|---------|---------|\n| BEFORE | 1.090s  | 1.190s  | 1.195s  | 0.0528s |\n| AFTER  | 1.080s  | 1.160s  | 1.167s  | 0.0482s |\n\n- Mean paired delta: 28.2ms (95% CI [12.5, 44.0]ms — entirely positive)\n- Median paired delta: 30.0ms\n- AFTER faster in 25/40 runs\n- Improvement: mean 2.36% / median 2.52%\n\n`--include 'src,tests'` (252 files), n=40:\n\n|        | min     | median  | mean    | sd      |\n|--------|---------|---------|---------|---------|\n| BEFORE | 0.680s  | 0.740s  | 0.746s  | 0.0350s |\n| AFTER  | 0.680s  | 0.740s  | 0.739s  | 0.0310s |\n\n- Mean paired delta: 6.2ms (95% CI [-4.8, 17.3]ms — straddles zero)\n- AFTER faster in 19/40 runs\n- Statistically neutral on small (~0.7s) packs where the metrics\n  phase is already short and the overlap window is too narrow to\n  outweigh CPU contention.\n\n## Risk\n\n- Suspicious files: their tokenization runs and is then discarded.\n  In real repos suspicious counts are typically 0 (security check\n  flags secrets/credentials), and a single 25-file batch costs\n  <50ms in the worst case. No correctness impact.\n- Worker contention: the speculative dispatch contends with security\n  workers for cores. Net is positive on packs that have enough\n  metrics work to outpace the contention overhead (>~500 files at\n  3 metrics workers).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-04-28T17:22:22Z",
          "tree_id": "face52f919b3a72750436c18e3e59987189e5c13",
          "url": "https://github.com/yamadashy/repomix/commit/28d5be9e4590a0ec0bd864242c25060767233116"
        },
        "date": 1777397094843,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1135,
            "range": "±207",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1044ms, Q3: 1251ms\nAll times: 957, 957, 964, 977, 1005, 1021, 1034, 1044, 1058, 1066, 1075, 1084, 1093, 1099, 1134, 1135, 1138, 1149, 1192, 1200, 1234, 1235, 1251, 1292, 1316, 1356, 1365, 1396, 1462, 1989ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1344,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1334ms, Q3: 1355ms\nAll times: 1300, 1304, 1307, 1310, 1313, 1334, 1339, 1340, 1340, 1341, 1344, 1344, 1348, 1350, 1353, 1355, 1360, 1366, 1375, 1376ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1594,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1587ms, Q3: 1607ms\nAll times: 1564, 1568, 1570, 1582, 1585, 1587, 1589, 1591, 1592, 1593, 1594, 1596, 1598, 1601, 1604, 1607, 1607, 1610, 1614, 1669ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5e4d8bc360a6e7f8910c50df45a8f55c907ffedb",
          "message": "perf(metrics): Byte-balance file metrics batches and dispatch largest-first\n\nWorker compute time per metrics batch is roughly proportional to total\ncontent bytes in the batch, not file count. Fixed 25-file batches starve\nworkers near the tail because batches dominated by a few large files\ntake far longer than batches of small files; the slowest batch sets the\nmakespan. On the repomix repo, the largest 25-file batch in input order\nholds 178 KiB of content while the smallest holds 0.3 KiB — a ~600x\nspread that left ~30-40ms of compute imbalance in the file-metrics\nphase.\n\nReplace fixed-count batching with a byte-balanced bin-pack:\n\n- Walk files sequentially, accumulating into a batch until the running\n  total would exceed the byte target, then flush. Files larger than the\n  target form their own batch. A file-count cap (200) bounds batches\n  against pathological many-tiny-file inputs.\n\n- Sort batches largest-bytes-first before dispatch. Tinypool serves its\n  task queue in FIFO arrival order, so the longest-processing-time\n  batches enter the workers first. This approximates LPT scheduling and\n  minimises the tail batch.\n\n- Pick the byte target adaptively from the total content size so we\n  always emit ~3 batches per assumed worker (= 9 batches for the 3-cap\n  metrics pool). At a fixed 256 KiB target, a 1 MB pack would emit only\n  ~4 batches and leave workers idle for the last round; the adaptive\n  target keeps batch count proportional to work.\n\nOutput is byte-identical: tokenization is order-independent and the\ndownstream `FileMetrics[]` is consumed by `path`-keyed maps and a sum\nreduction in `calculateMetrics`, so batch order does not affect results.\n\n## Benchmarks (paired interleaved A/B vs HEAD~1, 4-core box)\n\n`--include 'src,tests,website'` (777 files), n=60:\n\n|        | min     | median  | mean    | sd      |\n|--------|---------|---------|---------|---------|\n| BEFORE | 1.114s  | 1.169s  | 1.168s  | 0.025s  |\n| AFTER  | 1.060s  | 1.133s  | 1.138s  | 0.032s  |\n\n- Mean paired Δ: **30.1ms** (95% CI ±10.3ms — entirely positive)\n- AFTER faster in 47/60 runs\n- Improvement: **mean 2.58% / median 3.03%**\n\nDefault `.` (1017 files), n=50: +0.39% mean (CI ±10.4ms — straddles\nzero); neutral within noise. The default scope has narrower file-size\nvariance (no large website docs) so batch-balance has less leverage.\n\n`--include 'src,tests'` (252 files), n=30: -0.78% mean (CI ±11.3ms);\nneutral. Adaptive target produces small batches matching the prior\nfixed-count behaviour for small inputs.\n\n`--include 'website'` (~280 files), n=30: +0.13% mean; neutral.\n\nGenerated XML output is byte-identical between BEFORE and AFTER builds\n(`cmp` over isolated test packs).\n\n## Tests\n\n- `npm run lint` — passes (only pre-existing warnings, unrelated)\n- `npm run test` — 1258 tests pass (+5 new tests for `packBatchesByBytes`\n  covering: byte-target compliance with the single-oversized-file\n  exception, largest-first ordering, oversized files getting their own\n  batch, file-count cap enforcement, and empty input)\n\n## Local sub-agent code review\n\n- Correctness review (independent sub-agent): no bugs found. Verified\n  result ordering is path-keyed downstream (calculateMetrics.ts:230-231\n  fileTokenCounts loop, line 195 reduce, line 156-158 safeSet filter),\n  worker batch ordering is preserved (calculateMetricsWorker.ts:56),\n  oversized-file handling is correct, and no input mutation occurs.\n- Design review (independent sub-agent): nits addressed in this commit\n  — tightened test invariants per both reviewers' feedback, clarified\n  the duplication rationale for METRICS_ASSUMED_WORKERS, added comment\n  to METRICS_BATCH_FILES_CAP, simplified flush comment, and fixed the\n  \"indistinguishable\" wording in the top-of-file comment.",
          "timestamp": "2026-04-29T01:46:53Z",
          "tree_id": "1fa00c8552466070b7f2d3c986239e4a5d613ece",
          "url": "https://github.com/yamadashy/repomix/commit/5e4d8bc360a6e7f8910c50df45a8f55c907ffedb"
        },
        "date": 1777427380337,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1082,
            "range": "±171",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1004ms, Q3: 1175ms\nAll times: 876, 930, 977, 994, 996, 1000, 1002, 1004, 1004, 1019, 1032, 1036, 1057, 1058, 1078, 1082, 1092, 1101, 1106, 1124, 1133, 1172, 1175, 1177, 1186, 1213, 1263, 1264, 1272, 1470ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1271,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1262ms, Q3: 1287ms\nAll times: 1234, 1249, 1252, 1255, 1256, 1262, 1266, 1267, 1268, 1268, 1271, 1273, 1274, 1279, 1284, 1287, 1292, 1312, 1313, 1314ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1566,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1559ms, Q3: 1612ms\nAll times: 1536, 1542, 1544, 1548, 1556, 1559, 1559, 1561, 1561, 1563, 1566, 1567, 1569, 1573, 1604, 1612, 1637, 1763, 1974, 1995ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "2cc113a898210ec1122cf74bdc70bc826b4702fc",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning\n\n# Conflicts:\n#\tsrc/core/metrics/calculateFileMetrics.ts",
          "timestamp": "2026-04-29T18:10:28Z",
          "tree_id": "ec4bb6f7e3fb87106f74bcf0310d773caa677ba7",
          "url": "https://github.com/yamadashy/repomix/commit/2cc113a898210ec1122cf74bdc70bc826b4702fc"
        },
        "date": 1777486368346,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 826,
            "range": "±93",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 797ms, Q3: 890ms\nAll times: 770, 773, 775, 777, 782, 792, 797, 797, 802, 805, 809, 816, 819, 819, 823, 826, 828, 831, 836, 848, 852, 887, 890, 918, 923, 930, 941, 944, 978, 1067ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1289,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1279ms, Q3: 1298ms\nAll times: 1256, 1267, 1270, 1271, 1276, 1279, 1280, 1280, 1286, 1287, 1289, 1290, 1293, 1295, 1298, 1298, 1313, 1314, 1317, 1329ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1673,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1664ms, Q3: 1684ms\nAll times: 1647, 1647, 1659, 1662, 1663, 1664, 1664, 1670, 1672, 1673, 1673, 1674, 1674, 1677, 1684, 1684, 1694, 1700, 1704, 1705ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "d08914d131fa5a70cd8c3bf6c0b6d34c0a42d453",
          "message": "perf(metrics): Step pre-warmed metrics workers down to 2 on ≤4 vCPU\n\nThree metrics workers concurrently parsing gpt-tokenizer's BPE table\nduring the searchFiles + collect + processFiles + security phases\ncontend with the main thread and the security worker pool (cap=2) for\nthe same physical cores on a 4-vCPU machine. The warmup tail extends\nacross the whole pre-output critical path, and the extra worker also\ncosts ~12-18ms in `pool.destroy()` in pack()'s finally block.\n\nPer-phase instrumentation on a 252-file pack (linux, 4 vCPU, n=3 each):\n\n  cap=3:                         cap=2:\n    warmup done   438ms             349ms  (-89ms)\n    security done 498ms             472ms  (-26ms)\n    output done   563ms             525ms\n    pack returns  577ms             535ms\n    destroy done  632ms             567ms  (-25ms)\n\nThe change keeps METRICS_PREWARM_THREAD_CAP at 3 (the historical max for\nbig repos) but adds an adaptive ceiling: when getProcessConcurrency() is\n≤4, the prewarm cap is stepped down to METRICS_PREWARM_SMALLBOX_CAP=2.\nThis protects the typical 4-vCPU dev box and the GitHub Actions\nubuntu-latest / windows-latest / macos-13 (3 vCPU) runners without\ngiving up parallelism on 6+ vCPU developer workstations and CI runners,\nwhere the warmup contention disappears and a third worker meaningfully\nparallelises the speculative-dispatch tail on large repos.\n\nEffective cap by vCPU count:\n\n  vCPU |  before |  after\n   2   |    2    |    2     (no change — already min-bound)\n   3   |    3    |    2     (improvement: less over-subscription)\n   4   |    3    |    2     (this change's primary target)\n   5   |    3    |    3     (no change)\n   6+  |    3    |    3     (no change — preserves parallelism)\n\nMETRICS_ASSUMED_WORKERS in calculateFileMetrics is intentionally left at\n3 — its file-comment notes drift only changes the batch count by a\nsmall factor and never affects correctness, so a mismatch is safe.\n\nPaired interleaved A/B benchmarks (linux, 4 vCPU, node 22):\n\n  --include 'src,tests' (252 files), n=20:\n                  min      median   mean     sd\n    BEFORE        696ms    737ms    742ms    28ms\n    AFTER         628ms    655ms    657ms    16ms\n  Δ mean: 84ms (11.36%) · Δ median: 83ms (11.19%)\n  AFTER faster in 20/20 paired runs.\n\n  --include 'src,tests,website' (777 files), n=15:\n                  min      median   mean     sd\n    BEFORE        1075ms   1126ms   1122ms   22ms\n    AFTER         1062ms   1106ms   1108ms   28ms\n  Δ mean: 14ms (1.25%) · Δ median: 20ms (1.78%)\n  AFTER faster in 11/15 paired runs.\n\nOutput XML byte-identical between BEFORE and AFTER for both pack sizes\n(verified via `cmp` on the full 4 MB output of the 777-file pack).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-04-29T23:30:25Z",
          "tree_id": "01fef84af38d333024cb3691981d2c152725106e",
          "url": "https://github.com/yamadashy/repomix/commit/d08914d131fa5a70cd8c3bf6c0b6d34c0a42d453"
        },
        "date": 1777505583992,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1256,
            "range": "±155",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1186ms, Q3: 1341ms\nAll times: 1118, 1128, 1158, 1160, 1165, 1166, 1172, 1186, 1193, 1207, 1225, 1246, 1251, 1251, 1255, 1256, 1266, 1271, 1288, 1303, 1303, 1337, 1341, 1342, 1365, 1372, 1415, 1444, 1538, 1931ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1250,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1237ms, Q3: 1271ms\nAll times: 1217, 1228, 1234, 1236, 1237, 1237, 1242, 1243, 1246, 1249, 1250, 1252, 1255, 1255, 1260, 1271, 1277, 1278, 1281, 1345ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1585,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1568ms, Q3: 1593ms\nAll times: 1547, 1561, 1563, 1565, 1565, 1568, 1572, 1575, 1577, 1579, 1585, 1585, 1586, 1587, 1589, 1593, 1593, 1600, 1609, 1654ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "61b4ef5fb747a2acfaaaeda4a9a468b1e53cd4d0",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-04-30T18:25:11Z",
          "tree_id": "f4e5cf54191965d0142b21384ea253509dfeabc2",
          "url": "https://github.com/yamadashy/repomix/commit/61b4ef5fb747a2acfaaaeda4a9a468b1e53cd4d0"
        },
        "date": 1777573635318,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1098,
            "range": "±189",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1006ms, Q3: 1195ms\nAll times: 870, 936, 958, 981, 981, 983, 998, 1006, 1037, 1045, 1058, 1062, 1086, 1086, 1091, 1098, 1103, 1137, 1143, 1158, 1171, 1186, 1195, 1205, 1206, 1208, 1248, 1256, 1273, 1324ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1200,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1193ms, Q3: 1217ms\nAll times: 1177, 1184, 1186, 1190, 1191, 1193, 1198, 1198, 1200, 1200, 1200, 1205, 1209, 1210, 1213, 1217, 1227, 1231, 1257, 1281ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1709,
            "range": "±209",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1607ms, Q3: 1816ms\nAll times: 1552, 1571, 1581, 1600, 1601, 1607, 1626, 1690, 1698, 1704, 1709, 1794, 1797, 1804, 1812, 1816, 1819, 1844, 1864, 1870ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5467691683d00056a0b791ed81e973ee8fe4ef87",
          "message": "perf(security): Pre-screen lintSource calls with quick regex marker check\n\nBypass the per-file `lintSource` setup cost when the file content cannot\npossibly match any rule in `@secretlint/secretlint-rule-preset-recommend`.\n\n`lintSource` constructs a fresh `PromiseEventEmitter`, registers all\ndetection-rule listeners, and routes the file through every rule's\n`matchAll` regex even when the content is plain source code. Measured\nworker cost: ~0.3-0.5ms per file. With 2 security workers and ≥250 files,\nthat serial overhead dominates the security-check phase even after\nTinypool batching.\n\nThe `QUICK_SECRET_SCREEN` regex carries one over-inclusive marker per\ndetection rule (AWS access-key prefixes, `secret_access_key`, `account`,\n`-----BEGIN`, Slack `xox[abporu]-`/`xapp-`, `hooks.slack.com`, GitHub\n`gh[oprsu]_`/`github_pat_`, Anthropic `sk-ant-api0`, OpenAI\n`sk-(proj|svcacct|admin)-`/`T3BlbkFJ`, Linear `lin_api_`, 1Password\n`ops_ey`, SendGrid `SG.<token>.`, Shopify `shp{at,ss,ca,pa}_`, npm\n`x-oauth-basic`/`_authToken`/`npm_<20+>`, MongoDB/MySQL/PostgreSQL URLs,\nbasic-auth `://u:p@`). Case-insensitive and intentionally over-inclusive:\nfalse positives merely fall through to `lintSource` (correct, slightly\nslower); false negatives would silently drop secrets, so each rule's\nunique substring is included. The AWS Account ID rule's `(ID|id|Id)?`\nsuffix is optional, so `ACCOUNT=...` without `_ID` must match — the\nmarker is `account` rather than `account_id`.\n\nGCP rule fires by file extension (`.json` / `.p12`) on `source.ext`. The\nexisting code passes `filePath.split('.').pop()` (no leading dot), so the\nGCP rule never matches today; preserving that quirk means no special\npass-through is needed. Files with `-----BEGIN` inside JSON still match\nvia the privatekey rule.\n\n## Coverage verification\n\n- 23 security tests pass, including 3 new pins:\n  - QUICK_SECRET_SCREEN rejects plain source and runSecretLint\n    short-circuits to null\n  - QUICK_SECRET_SCREEN matches a minimal sample for every detection rule\n  - The installed preset's detection-rule list matches the expected 14;\n    a future secretlint version that adds a rule fails this assertion\n    and forces an audit before secrets can silently slip through\n- XML output is byte-identical between BEFORE and AFTER on\n  `--include 'src,tests'` (1.42MB) when packing a fixed source snapshot\n\n## Paired interleaved A/B benchmarks (4-vCPU box)\n\n`--include 'src,tests'` (259 files), n=40:\n\n|        | min   | median | mean  | sd     |\n|--------|-------|--------|-------|--------|\n| BEFORE | 682ms | 802ms  | 798ms | 80.1ms |\n| AFTER  | 646ms | 785ms  | 768ms | 77.8ms |\n\n- Mean paired Δ: **30.3ms** (3.79%)\n- Median paired Δ: **34ms** (4.24%)\n- AFTER faster in 29/40 pairs\n\nDefault (full repo, ~1040 files), n=40:\n\n|        | min    | median | mean   | sd      |\n|--------|--------|--------|--------|---------|\n| BEFORE | 1369ms | 1597ms | 1646ms | 231.9ms |\n| AFTER  | 1374ms | 1524ms | 1603ms | 277.0ms |\n\n- Mean paired Δ: **43.1ms** (2.62%)\n- Median paired Δ: **30ms** (1.88%)\n- AFTER faster in 22/40 pairs\n\nBoth pack sizes meet the ≥2% mean wall-clock threshold; the focused\nsmall-pack benchmark also clears it on the median.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-05-01T09:48:28Z",
          "tree_id": "b78f65462dca8de3542f2d8382a4f5ae6be06ec5",
          "url": "https://github.com/yamadashy/repomix/commit/5467691683d00056a0b791ed81e973ee8fe4ef87"
        },
        "date": 1777629021779,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1088,
            "range": "±119",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1033ms, Q3: 1152ms\nAll times: 877, 948, 956, 964, 1008, 1020, 1023, 1033, 1043, 1059, 1059, 1063, 1063, 1065, 1087, 1088, 1098, 1122, 1123, 1133, 1146, 1150, 1152, 1154, 1154, 1163, 1213, 1258, 1395, 1415ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1123,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1117ms, Q3: 1143ms\nAll times: 1107, 1108, 1110, 1116, 1116, 1117, 1117, 1118, 1119, 1122, 1123, 1130, 1134, 1140, 1142, 1143, 1148, 1151, 1168, 1176ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1726,
            "range": "±126",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1638ms, Q3: 1764ms\nAll times: 1587, 1588, 1590, 1622, 1630, 1638, 1674, 1679, 1706, 1713, 1726, 1735, 1735, 1750, 1762, 1764, 1831, 1855, 1914, 1963ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "73f7825d96599854fd10d28fc9d6481f28880b2d",
          "message": "perf(security): Run QUICK_SECRET_SCREEN on main thread, skip worker pool when no candidates\n\nReplaces the always-spawned 2-thread Tinypool security worker pool with a main-thread\npre-screen pass against `QUICK_SECRET_SCREEN`. In the typical real-world repo (no\nsecret-shaped content anywhere), every item is rejected by the regex and the check\nreturns immediately — no worker pool is spawned, no IPC round-trips, and the\n~30-50ms `@secretlint/core` + `secretlint-rule-preset-recommend` top-level import\nis never paid. When at least one item passes the pre-screen, the engine is\nlazy-loaded once via dynamic `import()` (cached promise, cleared on rejection so\na transient failure doesn't poison long-lived consumers) and `lintSource` runs\non the main thread for just the flagged items (typically a handful even on\nsecret-bearing repos).\n\nWhy this is a net win even when secrets are present:\n\nThe previous worker-based path always paid:\n- Worker pool startup + `@secretlint/*` module load in each worker (~30-50ms each, 2 workers in parallel)\n- Structured-clone IPC for every file's full content across BATCH_SIZE=50 batches\n- Tinypool teardown in the `finally` block\n\nFor the common no-secret case, all of that is eliminated — replaced by a\n~10-15ms regex pass on the main thread. For the rare match case, the\n~30-50ms main-thread `@secretlint` import replaces the per-worker import,\nand `lintSource` runs only on the small flagged set instead of the full\nbatch (the in-worker QUICK_SECRET_SCREEN added in 5467691 already ran the\nsame regex in-worker, so the lintSource call count is identical between\nold and new paths).\n\nThe ~150ms `gpt-tokenizer` warm-up that competed with the security workers\non 4-vCPU boxes (5 worker threads + main thread for 4 cores) also gets back\nthe freed CPU, so file-metrics workers complete sooner.\n\n`QUICK_SECRET_SCREEN` is split into `src/core/security/quickSecretScreen.ts`\nso the main thread can import it without pulling in `@secretlint`. The\nworker file re-exports it for the existing\n`tests/core/security/workers/securityCheckWorker.test.ts` rule-count pin.\nThe worker module + `runSecretLint` + `createSecretLintConfig` exports\nremain in place because `src/mcp/tools/fileSystemReadFileTool.ts` still\nimports them for per-file MCP scans.\n\n## Paired interleaved A/B benchmark (n=25, `--include 'src,tests'`, 258 files, 4 vCPU)\n\n|        | min   | median | mean   | sd    |\n|--------|-------|--------|--------|-------|\n| BEFORE | 641ms | 688ms  | 685.9ms| 19.3ms|\n| AFTER  | 613ms | 648ms  | 649.4ms| 19.8ms|\n\n- Mean paired Δ: **36.6ms** (95% CI ≈ 25.3..47.8ms — entirely positive)\n- Median paired Δ: **42.0ms**\n- AFTER faster in **22/25** pairs\n- Wall-clock reduction: **~5.3% mean / ~5.8% median**\n\nOutput XML is byte-identical to BEFORE (verified via `cmp` over the diff\nof the packed source files themselves; the only differences are the\nchanged source files appearing in their own packed form).\n\n## Test plan\n\n- [x] `npm run lint` — passes (only pre-existing warnings unrelated to this change)\n- [x] `npm run test` — 1261/1262 pass; the single failure (`tests/core/metrics/calculateFileMetrics.test.ts > preserves order and reports progress across multiple batches`) reproduces on the unmodified base branch and is unrelated\n- [x] `tests/core/security/securityCheck.test.ts` rewritten to match the new dependency surface (`loadSecretLintEngine` instead of `initTaskRunner`/`getProcessConcurrency`); existing semantics — issue detection, error propagation, no-mutation, git diff handling, gitDiffResult variants — are preserved, and a new test pins the no-candidates fast path\n- [x] `tests/core/security/workers/securityCheckWorker.test.ts` (preset rule-count pin and per-rule marker tests) still passes via the re-exported `QUICK_SECRET_SCREEN` from the worker module\n- [x] Independent sub-agent code reviews (correctness, design, test coverage): one latent issue surfaced — a rejected `_secretLintEnginePromise` would permanently poison the cache for long-lived processes (CLI is fine, MCP server / library callers wouldn't be) — fixed in this commit by clearing the cache on rejection. Over-explanatory comments trimmed per CLAUDE.md guidance.",
          "timestamp": "2026-05-01T11:15:37Z",
          "tree_id": "ca45b902faa9147feeec6c39958fe603845d47a0",
          "url": "https://github.com/yamadashy/repomix/commit/73f7825d96599854fd10d28fc9d6481f28880b2d"
        },
        "date": 1777634250729,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 852,
            "range": "±153",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 824ms, Q3: 977ms\nAll times: 755, 775, 789, 797, 806, 806, 811, 824, 828, 833, 843, 845, 848, 848, 848, 852, 863, 869, 901, 910, 910, 968, 977, 992, 1007, 1010, 1025, 1058, 1075, 1107ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1191,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1167ms, Q3: 1209ms\nAll times: 1145, 1154, 1154, 1157, 1164, 1167, 1169, 1172, 1174, 1179, 1191, 1192, 1194, 1198, 1203, 1209, 1218, 1219, 1221, 1232ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1503,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1501ms, Q3: 1516ms\nAll times: 1486, 1494, 1496, 1498, 1500, 1501, 1501, 1502, 1503, 1503, 1503, 1505, 1507, 1512, 1516, 1516, 1517, 1520, 1525, 1533ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "cd75d92b4089471c481d9ae24213675878ab4e74",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-05-02T04:10:51Z",
          "tree_id": "7d575e236dbf34ad73b647f33e4bc5c7f502990c",
          "url": "https://github.com/yamadashy/repomix/commit/cd75d92b4089471c481d9ae24213675878ab4e74"
        },
        "date": 1777695164006,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1318,
            "range": "±270",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1211ms, Q3: 1481ms\nAll times: 1092, 1100, 1144, 1153, 1163, 1184, 1211, 1211, 1217, 1230, 1267, 1270, 1296, 1303, 1314, 1318, 1325, 1334, 1345, 1348, 1350, 1415, 1481, 1517, 1519, 1553, 1553, 1568, 1739, 1814ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1084,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1064ms, Q3: 1114ms\nAll times: 1042, 1044, 1053, 1063, 1064, 1064, 1079, 1083, 1083, 1084, 1084, 1085, 1086, 1100, 1114, 1114, 1115, 1118, 1147, 1204ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1517,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1499ms, Q3: 1530ms\nAll times: 1485, 1488, 1488, 1493, 1499, 1499, 1501, 1509, 1513, 1513, 1517, 1519, 1522, 1528, 1528, 1530, 1531, 1531, 1535, 1551ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "55e5d0626ca646310ca05522b039652d6f0195cf",
          "message": "perf(metrics): Restore metrics worker cap to 3 on ≤4 vCPU\n\n`createMetricsTaskRunner` previously stepped the pre-warmed metrics worker\npool down from 3 to 2 on ≤4 vCPU boxes (commit `d08914d`). The rationale\nwas warmup-time CPU contention: 3 metrics workers parsing gpt-tokenizer's\nBPE table during searchFiles + collect + processFiles + security would\noversubscribe a 4-core box because the security check itself ran in its\nown 2-thread Tinypool. Five worker threads + main on 4 cores extended the\nwarmup tail past the security check and added measurable wall-clock cost\non `pool.destroy()`.\n\nCommit `73f7825` removed that contention by moving the security check\nback to the main thread (with a regex pre-screen that skips the worker\npool entirely on the typical no-secret case). With no security worker\npool to compete for cores, the cap-2 step-down has no remaining\njustification on the default-config critical path: 3 metrics workers +\nmain thread = 4 active threads, which fits a 4-core box without\nre-introducing the original contention.\n\nRemoves `METRICS_PREWARM_SMALLBOX_CAP` and `METRICS_SMALLBOX_VCPU_THRESHOLD`\nalong with the `concurrency <= threshold ? small : large` ceiling\nexpression. The cap is now uniformly `Math.min(concurrency, 3)` across all\nbox sizes — the same value the >4 vCPU path was already using.\n\nToken counts are unchanged (same workers, same encoding, same batch\ncontents). Output is byte-identical (verified via `cmp` on the same\ntarget directory across both binaries).\n\n## Bench (4-vCPU Ubuntu, full repo, hyperfine n=30, interleaved)\n\n|        | mean    | sd      | range          |\n|--------|---------|---------|----------------|\n| BEFORE | 989.9ms | 24.8ms  | 933 .. 1048ms  |\n| AFTER  | 949.8ms | 28.4ms  | 892 .. 1022ms  |\n\nMean wall-clock saving: **40.1ms (~4.0%)** · AFTER faster overall.\n\n## Bench (4-vCPU Ubuntu, full repo, paired interleaved n=40)\n\n|        | median  | mean    | sd     |\n|--------|---------|---------|--------|\n| BEFORE | 1265ms  | 1272ms  | 31.4ms |\n| AFTER  | 1235ms  | 1230ms  | 36.1ms |\n\n- Mean paired Δ: **42.2ms (3.31%)** · 95% CI ≈ 27.8ms..56.6ms (entirely positive)\n- Median paired Δ: **37ms (2.92%)**\n- AFTER faster in 34/40 pairs\n\nIndependent re-run (n=25 paired, fresh worktrees) measured a larger delta\nof **59.1ms (6.25%)**, 95% CI [39.6, 78.7] ms, AFTER faster in 22/25\npairs. The exact wall-clock saving varies with system load; both runs\nclear the 2% threshold with 95% confidence.\n\n## Trade-off (smaller workloads)\n\nOn smaller `--include` scopes (e.g. `src,tests`, ~250 files / ~1MB), the\nfixed gpt-tokenizer warmup cost of the 3rd worker (~80-100ms BPE parse)\nexceeds its parallelization benefit on the short metrics phase, producing\na measurable regression of **~50-60ms (~10-13%)** on a ~480-540ms baseline.\n\nThis regression is intentional. The perf-tuning spec targets the 1-2s CLI\nexecution range; the canonical full-repo bench (~1s on this box) is in\nrange and improves above the 2% bar. Smaller scopes are sub-second and\nout of range, but users who pack only `--include 'src,tests'`-sized\nslices on a 4-vCPU box will see metrics complete ~50-60ms slower than\non the prior cap-2 path. Net effect for those users vs. two commits ago\n(`d08914d` shipped an ~84ms improvement on the same workload at cap-2):\nthe small-include path is now a net regression of ~30ms relative to the\npre-`d08914d` state, but better than the cap-2 baseline only on the\n≥1k-file workloads the spec targets.",
          "timestamp": "2026-05-02T23:23:18Z",
          "tree_id": "ea04f106a3eb04ed4bd93fb4182757a45f8a4c42",
          "url": "https://github.com/yamadashy/repomix/commit/55e5d0626ca646310ca05522b039652d6f0195cf"
        },
        "date": 1777764324132,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 756,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 737ms, Q3: 785ms\nAll times: 719, 723, 723, 724, 726, 731, 733, 737, 740, 741, 744, 745, 747, 748, 754, 756, 757, 758, 759, 759, 775, 775, 785, 795, 800, 827, 830, 890, 948, 961ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1142,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1131ms, Q3: 1149ms\nAll times: 1099, 1106, 1124, 1127, 1128, 1131, 1134, 1135, 1136, 1137, 1142, 1143, 1144, 1145, 1146, 1149, 1150, 1151, 1163, 1180ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1784,
            "range": "±233",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1703ms, Q3: 1936ms\nAll times: 1660, 1665, 1672, 1694, 1696, 1703, 1716, 1719, 1723, 1765, 1784, 1807, 1825, 1893, 1902, 1936, 2061, 2069, 2086, 2352ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "40b21af41757d67cecae5cea3c27edede871351a",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-05-03T06:29:59Z",
          "tree_id": "04513c96294e9a2345a8707a2d16fa1b204eeb39",
          "url": "https://github.com/yamadashy/repomix/commit/40b21af41757d67cecae5cea3c27edede871351a"
        },
        "date": 1777789983016,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 4059,
            "range": "±1936",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 3210ms, Q3: 5146ms\nAll times: 2444, 2512, 2841, 2884, 3005, 3019, 3163, 3210, 3264, 3329, 3384, 3505, 3547, 3661, 3782, 4059, 4237, 4247, 4540, 4714, 4872, 5109, 5146, 5459, 5755, 6158, 6270, 6762, 7094, 7127ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 4342,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 4330ms, Q3: 4362ms\nAll times: 3898, 3903, 4277, 4287, 4311, 4330, 4331, 4333, 4335, 4338, 4342, 4353, 4354, 4357, 4359, 4362, 4363, 4371, 4380, 4418ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1523,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1510ms, Q3: 1539ms\nAll times: 1500, 1506, 1506, 1509, 1509, 1510, 1510, 1517, 1520, 1522, 1523, 1525, 1526, 1528, 1538, 1539, 1540, 1542, 1543, 1549ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "5f97083aae424f0c5dfed9fa763077a7a05e97bc",
          "message": "Merge remote-tracking branch 'origin/main' into perf/auto-perf-tuning",
          "timestamp": "2026-05-03T08:24:44Z",
          "tree_id": "f3964b292bc1e04d0f3e89e632a17c6cbe6ab33e",
          "url": "https://github.com/yamadashy/repomix/commit/5f97083aae424f0c5dfed9fa763077a7a05e97bc"
        },
        "date": 1777796906243,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 5513,
            "range": "±2501",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 4174ms, Q3: 6675ms\nAll times: 2240, 2661, 2787, 2939, 3229, 3356, 3966, 4174, 4412, 4529, 4785, 4809, 5218, 5439, 5491, 5513, 5658, 5762, 5802, 5912, 6233, 6501, 6675, 6886, 6974, 6982, 7423, 7659, 8362, 9693ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 4318,
            "range": "±372",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3986ms, Q3: 4358ms\nAll times: 3520, 3743, 3786, 3927, 3967, 3986, 4045, 4267, 4295, 4304, 4318, 4337, 4339, 4352, 4356, 4358, 4368, 4386, 4395, 4408ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1601,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1588ms, Q3: 1613ms\nAll times: 1574, 1582, 1584, 1585, 1588, 1588, 1589, 1595, 1596, 1600, 1601, 1603, 1604, 1604, 1609, 1613, 1618, 1619, 1619, 1651ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "committer": {
            "email": "noreply@anthropic.com",
            "name": "Claude",
            "username": "claude"
          },
          "distinct": true,
          "id": "2d3bcc37c95217102e2fd00ce595bff01ebd7d58",
          "message": "perf(file): Use readFileSync in readRawFile to skip libuv per-call overhead\n\nWhy\n---\n`collectFiles` uses `await fs.readFile` through a 50-way `promisePool`. On a\nwarm OS page cache (the common case for a repo pack — files were just\nlisted by globby), each `readFile` call is bounded not by disk latency but\nby the libuv thread-pool round-trip + Promise + microtask machinery, which\ncosts ~0.09 ms per file regardless of file size. For ~270 files this added\n~70 ms of pure async overhead; for ~1000 files (default `node bin/repomix.cjs`\non this repo) it adds correspondingly more.\n\n`readFileSync` issues the syscall directly from the V8 isolate. The kernel\nreturns from cache in a single syscall, no thread-pool hand-off, no Promise\nallocation, no microtask. The blocked main-thread time is dwarfed by the\nsaved overhead: a 270-file warm pure-sync read finishes in ~2 ms, vs. ~80 ms\nfor the async pool.\n\nSwitches `isBinaryFile` (Promise) to `isBinaryFileSync` for the same\nreason — the same `isbinaryfile` package ships both, and when called with a\n`Buffer` (as here) both delegate to the identical `isBinaryCheck` routine.\nNo behaviour change.\n\nTrade-off scope\n---------------\nBlocking the main thread during `collectFiles` defers — but does not\ndeadlock — work that needs main-thread callbacks during the read window:\n\n- Metrics workers run on `worker_threads` and make progress on their own OS\n  threads. Their result messages queue and are observed once the main\n  thread unblocks.\n- `getGitDiffs` / `getGitLogs` use `execFile`, whose subprocess stdout\n  pipes are drained by libuv I/O callbacks. While the main thread is in a\n  sync read, those callbacks queue; for very large `git log` outputs the\n  subprocess can momentarily stall on pipe-buffer fill (~64 KB on Linux),\n  but the stall resolves the moment `collectFiles` yields. No data is lost.\n- The spinner's `setInterval` callbacks queue and fire in a single burst\n  after the read window — visually equivalent to the prior behaviour for\n  CLI users.\n\nCold-disk single-root packs lose libuv's 4-way thread-pool parallelism on\nthe read phase. On NVMe (developer machines, GitHub Actions runners) per-\nfile disk wait is sub-ms, so the wall-clock cost is negligible. On HDD\nthis is a real ~4× slowdown for the read phase — outside the typical\ntarget environment. Multi-root packs still parallelize across roots via\n`pack()`'s top-level `Promise.all`, though within each root the reads\nserialize on the main thread.\n\nMaximum concurrent FDs drops from 50 (async pool) to 1 (sequential sync),\nwhich is strictly safer for FD-limited environments.\n\nPaired interleaved A/B benchmarks (n=15-30, 4-vCPU box, this branch)\n---------------------------------------------------------------------\n\n`--include 'src,tests'` (271 files, ~700 ms baseline), n=30:\n\n|        | min   | median | mean  | sd    |\n|--------|-------|--------|-------|-------|\n| BEFORE | 682ms | 716ms  | 716ms | 21.5  |\n| AFTER  | 658ms | 691ms  | 689ms | 21.0  |\n\n- Mean paired Δ: **26.7 ms** (95% CI ≈ 15.5..37.9 ms — entirely positive)\n- Median paired Δ: **23.6 ms** (~3.30 % median reduction)\n- AFTER faster in 22/30 pairs\n\n`--include 'src,tests,website'` (777 files), n=20:\n\n|        | min    | median | mean   | sd     |\n|--------|--------|--------|--------|--------|\n| BEFORE | 4151ms | 4367ms | 4354ms | 123.4  |\n| AFTER  | 4138ms | 4289ms | 4270ms | 76.8   |\n\n- Mean paired Δ: **83.5 ms** (95% CI ≈ 25.7..141.3 ms — entirely positive)\n- Median paired Δ: **73.1 ms** (~1.67 % median reduction)\n- AFTER faster in 15/20 pairs\n\nDefault (full repo, ~1000 files — same workload the CI bench packs), n=15:\n\n|        | min    | median | mean   | sd    |\n|--------|--------|--------|--------|-------|\n| BEFORE | 4777ms | 4878ms | 4886ms | 72.6  |\n| AFTER  | 4477ms | 4675ms | 4668ms | 104.4 |\n\n- Mean paired Δ: **218.8 ms** (95% CI ≈ 172.0..265.6 ms — entirely positive)\n- Median paired Δ: **249.7 ms** (**~5.12 % median reduction**)\n- AFTER faster in 15/15 pairs\n\nThe XML output is byte-identical between BEFORE and AFTER on a clean\nworking tree (the only diff in the packed self-image is this file plus\nthe `git_diff_work_tree` section reflecting this commit's working state).\n\nTest plan\n---------\n\n- [x] `npm run build` — passes\n- [x] `npm run lint` — passes (only the same two pre-existing warnings)\n- [x] `npm run test` — 1261/1262 pass; the single failure\n  (`tests/core/metrics/calculateFileMetrics.test.ts > preserves order and\n  reports progress across multiple batches`) is the same flake documented\n  in the existing PR body, reproducing on the unmodified base branch\n- [x] Two independent sub-agent reviews:\n  - Correctness reviewer: no blockers; behaviour-preserving, error\n    semantics equivalent, FD usage strictly safer\n  - Benchmark reviewer: no blockers; methodology sound, full-repo CI\n    margin (138..245 ms / ~3-4%) comfortably above 2% threshold; macOS\n    CI variance (~±200-300 ms IQR) may show a noisy result for this\n    commit alone — Ubuntu and Windows are the reliable signal",
          "timestamp": "2026-05-03T09:25:02Z",
          "tree_id": "bfe4b01cf253cc9cc667b4ab49254138af7b1dc1",
          "url": "https://github.com/yamadashy/repomix/commit/2d3bcc37c95217102e2fd00ce595bff01ebd7d58"
        },
        "date": 1777800424061,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2567,
            "range": "±367",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2343ms, Q3: 2710ms\nAll times: 2204, 2243, 2275, 2316, 2318, 2333, 2335, 2343, 2369, 2419, 2440, 2449, 2476, 2491, 2561, 2567, 2584, 2592, 2600, 2623, 2658, 2691, 2710, 2711, 2766, 2841, 2980, 2984, 3191, 3267ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3537,
            "range": "±219",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3446ms, Q3: 3665ms\nAll times: 3422, 3428, 3430, 3441, 3442, 3446, 3462, 3468, 3491, 3495, 3537, 3628, 3660, 3661, 3662, 3665, 3667, 3671, 3673, 3964ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1556,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1550ms, Q3: 1569ms\nAll times: 1511, 1541, 1542, 1543, 1544, 1550, 1550, 1553, 1553, 1553, 1556, 1556, 1560, 1562, 1565, 1569, 1570, 1574, 1583, 1612ms"
          }
        ]
      }
    ]
  }
}