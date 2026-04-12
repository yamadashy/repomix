window.BENCHMARK_DATA = {
  "lastUpdate": 1775963347952,
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
      }
    ]
  }
}