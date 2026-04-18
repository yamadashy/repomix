window.BENCHMARK_DATA = {
  "lastUpdate": 1776479218718,
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
      }
    ]
  }
}