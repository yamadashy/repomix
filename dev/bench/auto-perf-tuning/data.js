window.BENCHMARK_DATA = {
  "lastUpdate": 1776032416604,
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
      }
    ]
  }
}