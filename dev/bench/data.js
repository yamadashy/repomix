window.BENCHMARK_DATA = {
  "lastUpdate": 1784354270514,
  "repoUrl": "https://github.com/yamadashy/repomix",
  "entries": {
    "Repomix Performance": [
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "406194748f0acee935e832ea0bc9050d73c59af9",
          "message": "fix(ci): Fix git switch after orphan branch creation\n\ngit switch - fails after git switch --orphan because there is no\nprevious branch reference. Save the branch name explicitly instead.\n\nCo-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-03-28T02:10:38+09:00",
          "tree_id": "3ebc767a4889903e9d95c98f1d48778691170d87",
          "url": "https://github.com/yamadashy/repomix/commit/406194748f0acee935e832ea0bc9050d73c59af9"
        },
        "date": 1774631560768,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2261,
            "range": "±625",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1884ms, Q3: 2509ms\nAll times: 1577, 1630, 1666, 1846, 1882, 1884, 1916, 1990, 2085, 2251, 2261, 2309, 2314, 2369, 2425, 2509, 2565, 2588, 2669, 2878ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3316,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3295ms, Q3: 3325ms\nAll times: 3283, 3291, 3295, 3298, 3313, 3316, 3317, 3325, 3325, 3352ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3646,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3640ms, Q3: 3673ms\nAll times: 3624, 3628, 3640, 3641, 3644, 3646, 3657, 3673, 3682, 3690ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8ddc0471d05a27eb603531a7d0d62c504df47104",
          "message": "Merge pull request #1320 from yamadashy/renovate/homebrew-actions-digest\n\nchore(deps): update homebrew/actions digest to b2a302b",
          "timestamp": "2026-03-28T10:49:31+09:00",
          "tree_id": "fa7ab07e7ab4dc01869a0fb561be8282500bd38d",
          "url": "https://github.com/yamadashy/repomix/commit/8ddc0471d05a27eb603531a7d0d62c504df47104"
        },
        "date": 1774662715133,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1664,
            "range": "±134",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1652ms, Q3: 1786ms\nAll times: 1607, 1613, 1634, 1645, 1648, 1652, 1658, 1660, 1661, 1662, 1664, 1664, 1693, 1699, 1770, 1786, 1844, 1849, 1875, 1888ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3114,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3101ms, Q3: 3127ms\nAll times: 3089, 3099, 3101, 3101, 3109, 3114, 3124, 3127, 3128, 3128ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 4630,
            "range": "±958",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3877ms, Q3: 4835ms\nAll times: 3848, 3871, 3877, 3880, 4594, 4630, 4816, 4835, 4856, 5019ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2deea309a618c4d2561cec6669bfd54f8aef1b91",
          "message": "Merge pull request #1321 from yamadashy/renovate/anthropics-claude-code-action-1.x\n\nchore(deps): update anthropics/claude-code-action action to v1.0.76",
          "timestamp": "2026-03-28T10:50:01+09:00",
          "tree_id": "14ac636dc454740127c4cfd655ce5740c096de15",
          "url": "https://github.com/yamadashy/repomix/commit/2deea309a618c4d2561cec6669bfd54f8aef1b91"
        },
        "date": 1774662854495,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1677,
            "range": "±76",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1664ms, Q3: 1740ms\nAll times: 1572, 1641, 1641, 1642, 1654, 1664, 1669, 1673, 1674, 1675, 1677, 1684, 1685, 1686, 1738, 1740, 1745, 1754, 1756, 2045ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3173,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3148ms, Q3: 3179ms\nAll times: 3092, 3105, 3148, 3158, 3164, 3173, 3173, 3179, 3192, 3321ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 5136,
            "range": "±394",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 4888ms, Q3: 5282ms\nAll times: 4261, 4821, 4888, 5049, 5127, 5136, 5204, 5282, 5387, 5714ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c6b4561f0832a2d886525407bc16ad951f5ad5ac",
          "message": "Merge pull request #1322 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-632f0598a2\n\nchore(deps): bump the npm_and_yarn group across 2 directories with 1 update",
          "timestamp": "2026-03-28T11:10:49+09:00",
          "tree_id": "e06982b819ddd21e28ab75fa9cd1658ad71daf84",
          "url": "https://github.com/yamadashy/repomix/commit/c6b4561f0832a2d886525407bc16ad951f5ad5ac"
        },
        "date": 1774663996158,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1799,
            "range": "±211",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1726ms, Q3: 1937ms\nAll times: 1665, 1679, 1682, 1692, 1724, 1726, 1740, 1742, 1760, 1774, 1799, 1819, 1841, 1889, 1917, 1937, 2000, 2009, 2069, 2078ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3086,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3076ms, Q3: 3093ms\nAll times: 3062, 3072, 3076, 3082, 3083, 3086, 3089, 3093, 3199, 3608ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 4231,
            "range": "±296",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 4078ms, Q3: 4374ms\nAll times: 4050, 4074, 4078, 4171, 4199, 4231, 4265, 4374, 4415, 4550ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "990b4e96ea77332820df67cb8f3ba1bf1b581ff6",
          "message": "Merge pull request #1324 from yamadashy/renovate/codecov-codecov-action-5.x\n\nchore(deps): update codecov/codecov-action action to v5.5.3",
          "timestamp": "2026-03-28T11:23:41+09:00",
          "tree_id": "110227f24fc04436604f55dc6ddf5496be293e31",
          "url": "https://github.com/yamadashy/repomix/commit/990b4e96ea77332820df67cb8f3ba1bf1b581ff6"
        },
        "date": 1774664738813,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1609,
            "range": "±72",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1595ms, Q3: 1667ms\nAll times: 1573, 1582, 1587, 1589, 1594, 1595, 1595, 1596, 1608, 1609, 1609, 1613, 1631, 1632, 1647, 1667, 1811, 1817, 1852, 2090ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3153,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3139ms, Q3: 3159ms\nAll times: 3124, 3125, 3139, 3142, 3149, 3153, 3158, 3159, 3174, 3176ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3876,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3841ms, Q3: 3901ms\nAll times: 3836, 3838, 3841, 3848, 3856, 3876, 3893, 3901, 3924, 4049ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "308c11b4c8606531dabc86ab9f84d21bd7534669",
          "message": "Merge pull request #1323 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-03-28T11:24:57+09:00",
          "tree_id": "3ebef7be38852e9a980619d94f4d76d812cba651",
          "url": "https://github.com/yamadashy/repomix/commit/308c11b4c8606531dabc86ab9f84d21bd7534669"
        },
        "date": 1774664885412,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2185,
            "range": "±229",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2090ms, Q3: 2319ms\nAll times: 1669, 1684, 1706, 1875, 2083, 2090, 2117, 2126, 2151, 2165, 2185, 2224, 2252, 2283, 2300, 2319, 2392, 2421, 2575, 2590ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2950,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2939ms, Q3: 2954ms\nAll times: 2909, 2910, 2939, 2943, 2948, 2950, 2951, 2954, 2968, 2995ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 4057,
            "range": "±76",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3996ms, Q3: 4072ms\nAll times: 3959, 3982, 3996, 4029, 4040, 4057, 4066, 4072, 4384, 4524ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a49d81aa861407eda9badbb6f52e00df30c29b8e",
          "message": "Merge pull request #1302 from yamadashy/perf/pre-init-metrics-worker-pool\n\nperf(core): Pre-initialize metrics worker pool to overlap tiktoken WASM loading",
          "timestamp": "2026-03-28T13:58:11+09:00",
          "tree_id": "40b6c10cc2ad12217414cec53c6c5482641847d1",
          "url": "https://github.com/yamadashy/repomix/commit/a49d81aa861407eda9badbb6f52e00df30c29b8e"
        },
        "date": 1774674057481,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1571,
            "range": "±71",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1545ms, Q3: 1616ms\nAll times: 1508, 1529, 1532, 1538, 1540, 1545, 1554, 1556, 1559, 1570, 1571, 1581, 1585, 1588, 1601, 1616, 1631, 1736, 1812, 1958ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 3154,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3134ms, Q3: 3193ms\nAll times: 3106, 3115, 3134, 3144, 3148, 3154, 3168, 3193, 3563, 3652ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3823,
            "range": "±104",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3784ms, Q3: 3888ms\nAll times: 3772, 3773, 3784, 3788, 3793, 3823, 3838, 3888, 3999, 4158ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "aeed190bf80722edca61c41382d44eb73d9febc0",
          "message": "Merge pull request #1306 from yamadashy/perf/optimize-startup-output-paths\n\nperf(core): Remove Zod from startup path and optimize output generation",
          "timestamp": "2026-03-28T14:28:58+09:00",
          "tree_id": "6dffd682ce454eb8853e0c180d89b700357b1d70",
          "url": "https://github.com/yamadashy/repomix/commit/aeed190bf80722edca61c41382d44eb73d9febc0"
        },
        "date": 1774676212312,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1591,
            "range": "±81",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1557ms, Q3: 1638ms\nAll times: 1534, 1542, 1543, 1544, 1546, 1557, 1559, 1565, 1568, 1589, 1591, 1594, 1601, 1610, 1615, 1638, 1666, 1669, 1723, 1878ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2916,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2905ms, Q3: 2920ms\nAll times: 2893, 2905, 2905, 2908, 2913, 2916, 2918, 2920, 2937, 2996ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3797,
            "range": "±329",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3748ms, Q3: 4077ms\nAll times: 3546, 3690, 3748, 3759, 3775, 3797, 4070, 4077, 4440, 5020ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "18f65a56ae3994db46a3c450053dc44130c98240",
          "message": "Merge pull request #1328 from yamadashy/renovate/oven-sh-setup-bun-2.x\n\nchore(deps): update oven-sh/setup-bun action to v2.2.0",
          "timestamp": "2026-03-28T14:43:36+09:00",
          "tree_id": "116280771ade5aa1c0ee472d3f3cac1b91c0f41b",
          "url": "https://github.com/yamadashy/repomix/commit/18f65a56ae3994db46a3c450053dc44130c98240"
        },
        "date": 1774676855912,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1833,
            "range": "±72",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1799ms, Q3: 1871ms\nAll times: 1704, 1717, 1738, 1741, 1791, 1799, 1804, 1809, 1818, 1833, 1833, 1836, 1839, 1863, 1870, 1871, 1873, 1876, 1897, 2488ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2976,
            "range": "±92",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2932ms, Q3: 3024ms\nAll times: 2899, 2920, 2932, 2947, 2973, 2976, 2993, 3024, 3037, 3053ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3531,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3522ms, Q3: 3544ms\nAll times: 3504, 3518, 3522, 3524, 3526, 3531, 3532, 3544, 3547, 3598ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "66e5e1080e6df5ca93aa5731b346b4aec2ea7e82",
          "message": "Merge pull request #1325 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-03-28T14:44:15+09:00",
          "tree_id": "633055fed4c6b853876d33dae048e5f758ec77ea",
          "url": "https://github.com/yamadashy/repomix/commit/66e5e1080e6df5ca93aa5731b346b4aec2ea7e82"
        },
        "date": 1774676986391,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1656,
            "range": "±624",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1625ms, Q3: 2249ms\nAll times: 1550, 1584, 1599, 1619, 1620, 1625, 1628, 1630, 1638, 1650, 1656, 1710, 1742, 1825, 2080, 2249, 2691, 2702, 2760, 3375ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2884,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2877ms, Q3: 2902ms\nAll times: 2866, 2866, 2877, 2879, 2881, 2884, 2888, 2902, 2917, 2928ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3671,
            "range": "±151",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3636ms, Q3: 3787ms\nAll times: 3589, 3601, 3636, 3642, 3663, 3671, 3742, 3787, 3800, 3807ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a801b60bcff81cd77e1f8efc431d9fc3460c5beb",
          "message": "Merge pull request #1303 from yamadashy/perf/lazy-load-minimatch\n\nperf(core): Optimize chunk merging and avoid redundant string split in grep tool",
          "timestamp": "2026-03-28T15:25:48+09:00",
          "tree_id": "27193e714780f9c03db88bfb560429b2f316edf4",
          "url": "https://github.com/yamadashy/repomix/commit/a801b60bcff81cd77e1f8efc431d9fc3460c5beb"
        },
        "date": 1774679356926,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2409,
            "range": "±335",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2258ms, Q3: 2593ms\nAll times: 1893, 1988, 2084, 2118, 2190, 2258, 2314, 2363, 2370, 2398, 2409, 2459, 2491, 2496, 2503, 2593, 2717, 2915, 2977, 3082ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2928,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2905ms, Q3: 2941ms\nAll times: 2898, 2902, 2905, 2911, 2919, 2928, 2936, 2941, 2945, 3080ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3621,
            "range": "±146",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3580ms, Q3: 3726ms\nAll times: 3532, 3560, 3580, 3587, 3597, 3621, 3626, 3726, 3729, 3792ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c93b9ec6161d6d38f4520ea8778ff5dc51f54a49",
          "message": "Merge pull request #1329 from yamadashy/renovate/major-browser-major-dependencies\n\nchore(deps): update dependency jsdom to v29",
          "timestamp": "2026-03-28T16:01:06+09:00",
          "tree_id": "f73fc8d3f1cd31963386a905f3330c1b12c466c6",
          "url": "https://github.com/yamadashy/repomix/commit/c93b9ec6161d6d38f4520ea8778ff5dc51f54a49"
        },
        "date": 1774681533359,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1593,
            "range": "±190",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1566ms, Q3: 1756ms\nAll times: 1528, 1552, 1552, 1559, 1561, 1566, 1568, 1571, 1577, 1587, 1593, 1629, 1673, 1701, 1723, 1756, 1791, 1911, 1918, 2031ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2950,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2932ms, Q3: 2956ms\nAll times: 2910, 2930, 2932, 2943, 2948, 2950, 2951, 2956, 2963, 2967ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3526,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3505ms, Q3: 3540ms\nAll times: 3490, 3496, 3505, 3506, 3507, 3526, 3533, 3540, 3560, 3680ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b04bd936751cc4e271a3bb5604ce50d43e309d26",
          "message": "Merge pull request #1332 from yamadashy/renovate/docker-build-push-action-7.x\n\nchore(deps): update docker/build-push-action action to v7",
          "timestamp": "2026-03-28T16:09:12+09:00",
          "tree_id": "c0f510164667913a08d2180cb61afae35cb54796",
          "url": "https://github.com/yamadashy/repomix/commit/b04bd936751cc4e271a3bb5604ce50d43e309d26"
        },
        "date": 1774681893892,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1550,
            "range": "±172",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1533ms, Q3: 1705ms\nAll times: 1505, 1513, 1516, 1522, 1525, 1533, 1533, 1535, 1537, 1546, 1550, 1551, 1556, 1559, 1581, 1705, 1737, 1776, 1780, 1801ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2884,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2876ms, Q3: 2895ms\nAll times: 2857, 2869, 2876, 2877, 2881, 2884, 2894, 2895, 2899, 2907ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3843,
            "range": "±348",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3729ms, Q3: 4077ms\nAll times: 3701, 3719, 3729, 3733, 3734, 3843, 3876, 4077, 5138, 5901ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d762d383a9107133ce81d0c4002099e0c6a3c84b",
          "message": "Merge pull request #1333 from yamadashy/renovate/docker-login-action-4.x\n\nchore(deps): update docker/login-action action to v4",
          "timestamp": "2026-03-28T16:09:29+09:00",
          "tree_id": "f97d21b5160dce4dcbf17bedc2f14ea63662eb7f",
          "url": "https://github.com/yamadashy/repomix/commit/d762d383a9107133ce81d0c4002099e0c6a3c84b"
        },
        "date": 1774682024071,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1590,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1565ms, Q3: 1640ms\nAll times: 1513, 1530, 1546, 1546, 1558, 1565, 1575, 1581, 1581, 1590, 1590, 1594, 1595, 1607, 1608, 1640, 1649, 1661, 1707, 1718ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2922,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2905ms, Q3: 2928ms\nAll times: 2892, 2895, 2905, 2909, 2917, 2922, 2927, 2928, 2930, 2967ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3918,
            "range": "±219",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3850ms, Q3: 4069ms\nAll times: 3784, 3811, 3850, 3855, 3863, 3918, 3928, 4069, 4183, 4202ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8c20d12bf3d0f79655fae7fb5a197eba1db68af7",
          "message": "Merge pull request #1340 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260321.1",
          "timestamp": "2026-03-28T17:25:21+09:00",
          "tree_id": "a479c1810baeb3403bcee7b19aec1505ca3c51d2",
          "url": "https://github.com/yamadashy/repomix/commit/8c20d12bf3d0f79655fae7fb5a197eba1db68af7"
        },
        "date": 1774686498896,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1627,
            "range": "±58",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1599ms, Q3: 1657ms\nAll times: 1544, 1547, 1587, 1593, 1594, 1599, 1615, 1617, 1623, 1627, 1627, 1634, 1638, 1646, 1654, 1657, 1733, 1746, 1901, 1980ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2880,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2864ms, Q3: 2890ms\nAll times: 2854, 2859, 2864, 2865, 2869, 2880, 2882, 2890, 2890, 2900ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3629,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3605ms, Q3: 3652ms\nAll times: 3585, 3595, 3605, 3605, 3609, 3629, 3645, 3652, 3661, 3727ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4f7225b6a1994d8858776e62e4f3c8165f7e0296",
          "message": "Merge pull request #1341 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260321.1",
          "timestamp": "2026-03-28T17:25:46+09:00",
          "tree_id": "83ab560d4ef87a437b90d95a4e3eee0b842ecf08",
          "url": "https://github.com/yamadashy/repomix/commit/4f7225b6a1994d8858776e62e4f3c8165f7e0296"
        },
        "date": 1774686616316,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1721,
            "range": "±233",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1603ms, Q3: 1836ms\nAll times: 1570, 1577, 1583, 1585, 1602, 1603, 1614, 1618, 1689, 1692, 1721, 1731, 1739, 1789, 1805, 1836, 1838, 1907, 2101, 2200ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2992,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2985ms, Q3: 2997ms\nAll times: 2971, 2977, 2985, 2991, 2991, 2992, 2995, 2997, 2997, 3045ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3430,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3395ms, Q3: 3436ms\nAll times: 3373, 3377, 3395, 3409, 3427, 3430, 3433, 3436, 3438, 3704ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "28f93e9357f73bb174a180ee9b634a0f18273eb0",
          "message": "Merge pull request #1338 from yamadashy/perf/skip-worker-pool-lightweight-v2\n\nperf(core): Skip worker pool for lightweight file processing",
          "timestamp": "2026-03-28T18:31:23+09:00",
          "tree_id": "ecada18b88b4e34671a8adf11133c157b8ac4302",
          "url": "https://github.com/yamadashy/repomix/commit/28f93e9357f73bb174a180ee9b634a0f18273eb0"
        },
        "date": 1774690385350,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1513,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1502ms, Q3: 1567ms\nAll times: 1474, 1482, 1496, 1496, 1501, 1502, 1505, 1511, 1511, 1512, 1513, 1513, 1518, 1552, 1562, 1567, 1575, 1575, 1601, 1611ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2937,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2929ms, Q3: 2948ms\nAll times: 2911, 2912, 2929, 2932, 2933, 2937, 2938, 2948, 2949, 2970ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3659,
            "range": "±326",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3456ms, Q3: 3782ms\nAll times: 3407, 3419, 3456, 3512, 3623, 3659, 3717, 3782, 3978, 4624ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fe6da909573d27eb0d0634ef858fe8731a620404",
          "message": "Merge pull request #1346 from yamadashy/perf/lazy-load-parallelize-cache\n\nperf(core): Lazy-load CLI actions, parallelize pipeline, and cache security config",
          "timestamp": "2026-03-28T20:44:04+09:00",
          "tree_id": "d3c2c70dc6c21dbe55688e76fc340078ec287807",
          "url": "https://github.com/yamadashy/repomix/commit/fe6da909573d27eb0d0634ef858fe8731a620404"
        },
        "date": 1774698359963,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1500,
            "range": "±162",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1484ms, Q3: 1646ms\nAll times: 1456, 1457, 1466, 1480, 1481, 1484, 1484, 1484, 1486, 1491, 1500, 1507, 1520, 1550, 1598, 1646, 1698, 1796, 1840, 2195ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2734,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2709ms, Q3: 2743ms\nAll times: 2703, 2709, 2709, 2710, 2715, 2734, 2738, 2743, 2748, 2762ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3266,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3229ms, Q3: 3273ms\nAll times: 3213, 3222, 3229, 3234, 3246, 3266, 3272, 3273, 3280, 3296ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "80379dc528e831a71b32ec4bd76c11f6627d207a",
          "message": "Merge pull request #1347 from yamadashy/refactor/extract-review-agents\n\nrefactor(agents): Extract and enhance 6 reviewer agents",
          "timestamp": "2026-03-28T23:46:39+09:00",
          "tree_id": "b5e93d3e7b7573cfbccac67a1ede2b2ca0da8558",
          "url": "https://github.com/yamadashy/repomix/commit/80379dc528e831a71b32ec4bd76c11f6627d207a"
        },
        "date": 1774709328158,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1708,
            "range": "±264",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1655ms, Q3: 1919ms\nAll times: 1555, 1557, 1625, 1629, 1637, 1655, 1655, 1668, 1677, 1703, 1708, 1711, 1735, 1776, 1883, 1919, 2080, 2124, 2192, 2318ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2591,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 2584ms, Q3: 2641ms\nAll times: 2566, 2581, 2584, 2586, 2590, 2591, 2609, 2641, 2645, 2689ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 4059,
            "range": "±208",
            "unit": "ms",
            "extra": "Median of 10 runs\nQ1: 3899ms, Q3: 4107ms\nAll times: 3882, 3885, 3899, 3904, 3969, 4059, 4086, 4107, 4112, 4133ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bd9f343453da6fe6a194c7e9d96d9b2f55c83619",
          "message": "Merge pull request #1348 from yamadashy/perf/benchmark-interleave-extract-scripts\n\nperf(ci): Improve benchmark stability with interleaved execution",
          "timestamp": "2026-03-29T00:01:24+09:00",
          "tree_id": "34f04cc92b4f617dcf428850a28301983c221997",
          "url": "https://github.com/yamadashy/repomix/commit/bd9f343453da6fe6a194c7e9d96d9b2f55c83619"
        },
        "date": 1774710222870,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1478,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1453ms, Q3: 1495ms\nAll times: 1428, 1431, 1437, 1443, 1447, 1447, 1451, 1453, 1454, 1458, 1459, 1462, 1466, 1466, 1476, 1478, 1478, 1486, 1487, 1490, 1494, 1495, 1495, 1517, 1521, 1568, 1616, 1682, 1746, 1805ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2735,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2718ms, Q3: 2759ms\nAll times: 2689, 2703, 2708, 2713, 2717, 2718, 2719, 2719, 2722, 2730, 2735, 2743, 2749, 2757, 2758, 2759, 2759, 2764, 3188, 3193ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3172,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3160ms, Q3: 3184ms\nAll times: 3142, 3143, 3147, 3152, 3156, 3160, 3160, 3161, 3162, 3170, 3172, 3175, 3179, 3182, 3182, 3184, 3192, 3196, 3227, 3235ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3e1fc1a4951a3c18780c94802159137797a61343",
          "message": "Merge pull request #1349 from yamadashy/fix/perf-benchmark-no-cancel\n\nfix(ci): Disable cancel-in-progress for perf benchmark",
          "timestamp": "2026-03-29T00:36:26+09:00",
          "tree_id": "d16f9e864be9c3f932098d3248103a25b820c5cf",
          "url": "https://github.com/yamadashy/repomix/commit/3e1fc1a4951a3c18780c94802159137797a61343"
        },
        "date": 1774712342673,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1494,
            "range": "±111",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1463ms, Q3: 1574ms\nAll times: 1436, 1444, 1448, 1450, 1461, 1462, 1463, 1463, 1467, 1471, 1473, 1473, 1478, 1485, 1493, 1494, 1507, 1512, 1539, 1550, 1551, 1551, 1574, 1612, 1684, 1690, 1710, 1731, 1815, 1887ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2684,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2680ms, Q3: 2699ms\nAll times: 2664, 2668, 2669, 2675, 2678, 2680, 2680, 2681, 2682, 2683, 2684, 2687, 2688, 2690, 2696, 2699, 2699, 2700, 2707, 2709ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3294,
            "range": "±184",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3252ms, Q3: 3436ms\nAll times: 3217, 3246, 3247, 3249, 3251, 3252, 3263, 3274, 3277, 3291, 3294, 3321, 3394, 3417, 3419, 3436, 3438, 3448, 3450, 3470ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b21a85f69810745c34f2e88ff8e58b6dc86936b6",
          "message": "Merge pull request #1351 from yamadashy/chore/allow-deepwiki-mcp-firewall\n\nchore(devcontainer): Add mcp.deepwiki.com to firewall allowed domains",
          "timestamp": "2026-03-29T11:44:16+09:00",
          "tree_id": "09a10512938d41bd05d34215b06602419b3a9dad",
          "url": "https://github.com/yamadashy/repomix/commit/b21a85f69810745c34f2e88ff8e58b6dc86936b6"
        },
        "date": 1774752491316,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1534,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1505ms, Q3: 1556ms\nAll times: 1450, 1489, 1490, 1491, 1494, 1500, 1504, 1505, 1510, 1512, 1514, 1515, 1516, 1518, 1520, 1534, 1535, 1540, 1540, 1543, 1543, 1545, 1556, 1557, 1582, 1603, 1605, 1673, 1678, 1729ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2760,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2748ms, Q3: 2766ms\nAll times: 2727, 2730, 2737, 2747, 2748, 2748, 2748, 2753, 2753, 2755, 2760, 2762, 2764, 2764, 2766, 2766, 2773, 2775, 2782, 2790ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3184,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3169ms, Q3: 3205ms\nAll times: 3142, 3158, 3163, 3164, 3168, 3169, 3172, 3172, 3174, 3182, 3184, 3185, 3185, 3186, 3198, 3205, 3211, 3214, 3266, 3345ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dbc7aeed9bbe6137eadf520bf322b3f12e30e2a7",
          "message": "Merge pull request #1353 from yamadashy/ci/bench-comment-autolink-commit-sha\n\nci(perf-benchmark): Enable GitHub autolink for commit SHAs in benchmark comments",
          "timestamp": "2026-03-29T21:27:06+09:00",
          "tree_id": "290818e6a5c5d291dce29cd57a7b78926782cd96",
          "url": "https://github.com/yamadashy/repomix/commit/dbc7aeed9bbe6137eadf520bf322b3f12e30e2a7"
        },
        "date": 1774787396383,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2752,
            "range": "±287",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2619ms, Q3: 2906ms\nAll times: 2430, 2447, 2496, 2512, 2550, 2577, 2594, 2619, 2620, 2620, 2629, 2652, 2678, 2681, 2688, 2752, 2763, 2782, 2787, 2787, 2880, 2893, 2906, 2924, 2939, 3005, 3182, 3228, 3323, 3733ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2571,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2562ms, Q3: 2588ms\nAll times: 2540, 2546, 2549, 2555, 2562, 2562, 2566, 2566, 2568, 2570, 2571, 2572, 2575, 2577, 2579, 2588, 2594, 2599, 2607, 2633ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3178,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3163ms, Q3: 3189ms\nAll times: 3137, 3147, 3155, 3159, 3162, 3163, 3164, 3167, 3174, 3176, 3178, 3180, 3183, 3185, 3186, 3189, 3201, 3222, 3340, 3525ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "371920b2f2d6252d66e25ea841d7b9a797f570d6",
          "message": "Merge pull request #1350 from yamadashy/perf/swap-tiktoken-to-gpt-tokenizer\n\nperf(core): Replace tiktoken WASM with gpt-tokenizer",
          "timestamp": "2026-03-29T22:33:44+09:00",
          "tree_id": "2e34d5e069224d359b4a4b6c5ed748b17fe58f17",
          "url": "https://github.com/yamadashy/repomix/commit/371920b2f2d6252d66e25ea841d7b9a797f570d6"
        },
        "date": 1774791387973,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1551,
            "range": "±191",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1488ms, Q3: 1679ms\nAll times: 1433, 1434, 1453, 1453, 1474, 1481, 1487, 1488, 1498, 1503, 1506, 1507, 1521, 1547, 1550, 1551, 1589, 1591, 1594, 1619, 1658, 1664, 1679, 1702, 1720, 1835, 1835, 1851, 1857, 1912ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2421,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2412ms, Q3: 2434ms\nAll times: 2400, 2405, 2408, 2410, 2412, 2412, 2417, 2418, 2420, 2421, 2421, 2424, 2425, 2432, 2434, 2434, 2436, 2436, 2437, 2439ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3100,
            "range": "±692",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3003ms, Q3: 3695ms\nAll times: 2975, 2975, 2976, 2982, 2985, 3003, 3006, 3009, 3018, 3031, 3100, 3138, 3403, 3480, 3671, 3695, 3722, 3726, 3797, 3894ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "81fc9ebd9e094c97882a893f766e898c70dc3b2d",
          "message": "Merge pull request #1354 from yamadashy/chore/pr-resolve-outdated-auto-reply\n\nchore(agents): Skip confirmation and auto-reply on pr-resolve-outdated",
          "timestamp": "2026-03-29T23:08:07+09:00",
          "tree_id": "887b25858afed1fd09c61ab878862e899fe6a885",
          "url": "https://github.com/yamadashy/repomix/commit/81fc9ebd9e094c97882a893f766e898c70dc3b2d"
        },
        "date": 1774793407643,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1388,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1373ms, Q3: 1448ms\nAll times: 1361, 1362, 1369, 1369, 1369, 1369, 1370, 1373, 1374, 1377, 1381, 1381, 1383, 1383, 1388, 1388, 1390, 1391, 1396, 1396, 1413, 1431, 1448, 1451, 1469, 1477, 1481, 1651, 1665, 1726ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2354,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2345ms, Q3: 2358ms\nAll times: 2320, 2333, 2339, 2340, 2341, 2345, 2346, 2348, 2349, 2352, 2354, 2354, 2355, 2355, 2356, 2358, 2362, 2366, 2405, 2489ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2987,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2974ms, Q3: 3011ms\nAll times: 2965, 2967, 2970, 2971, 2972, 2974, 2977, 2978, 2980, 2986, 2987, 2994, 2995, 3002, 3011, 3011, 3017, 3017, 3022, 3041ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e3b365232a25c8d8b33e5895107f9a990b632fbc",
          "message": "Merge pull request #1363 from yamadashy/claude/fix-bun-tests-Oj7mE",
          "timestamp": "2026-03-31T20:55:03+09:00",
          "tree_id": "bd3bfbb5764d6326f5c653410fe0df1c5dccfd6f",
          "url": "https://github.com/yamadashy/repomix/commit/e3b365232a25c8d8b33e5895107f9a990b632fbc"
        },
        "date": 1774958235148,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1413,
            "range": "±125",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1364ms, Q3: 1489ms\nAll times: 1319, 1321, 1345, 1348, 1353, 1355, 1363, 1364, 1367, 1371, 1374, 1376, 1376, 1402, 1412, 1413, 1417, 1450, 1457, 1466, 1474, 1479, 1489, 1532, 1536, 1581, 1593, 1613, 1716, 1744ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2370,
            "range": "±9",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2368ms, Q3: 2377ms\nAll times: 2338, 2349, 2357, 2358, 2361, 2368, 2369, 2369, 2370, 2370, 2370, 2373, 2374, 2377, 2377, 2377, 2379, 2384, 2445, 2533ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2902,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2887ms, Q3: 2923ms\nAll times: 2859, 2879, 2880, 2881, 2882, 2887, 2893, 2894, 2896, 2897, 2902, 2902, 2903, 2907, 2913, 2923, 2924, 2926, 2927, 2933ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "47d77f90d937b7811e1231bba959c27168cf3271",
          "message": "Merge pull request #1368 from yamadashy/chore/add-bench-scripts\n\nchore(cli): Add hyperfine benchmark scripts",
          "timestamp": "2026-03-31T22:38:23+09:00",
          "tree_id": "d01f292b6719a47293f7008d13f6bc172578827b",
          "url": "https://github.com/yamadashy/repomix/commit/47d77f90d937b7811e1231bba959c27168cf3271"
        },
        "date": 1774964578473,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1418,
            "range": "±68",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1391ms, Q3: 1459ms\nAll times: 1356, 1357, 1364, 1364, 1374, 1377, 1386, 1391, 1396, 1398, 1406, 1410, 1411, 1417, 1417, 1418, 1420, 1430, 1430, 1432, 1438, 1446, 1459, 1461, 1467, 1479, 1490, 1547, 1561, 1711ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2386,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2366ms, Q3: 2397ms\nAll times: 2347, 2352, 2359, 2362, 2365, 2366, 2371, 2371, 2376, 2377, 2386, 2391, 2392, 2394, 2395, 2397, 2397, 2411, 2696, 2845ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3025,
            "range": "±103",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3004ms, Q3: 3107ms\nAll times: 2957, 2959, 2977, 2984, 2986, 3004, 3004, 3018, 3022, 3024, 3025, 3026, 3034, 3040, 3073, 3107, 3119, 3128, 3161, 3175ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c8f24b75550514c8c95d60fd2932a92b142f3bd3",
          "message": "Merge pull request #1359 from yamadashy/perf/overlap-security-processing-metrics\n\nperf(core): Overlap security check, file processing, and metrics with output generation",
          "timestamp": "2026-03-31T23:37:19+09:00",
          "tree_id": "d51c32ae3bb051cbab5da166b1ed2753ca9b7f8c",
          "url": "https://github.com/yamadashy/repomix/commit/c8f24b75550514c8c95d60fd2932a92b142f3bd3"
        },
        "date": 1774967998787,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2184,
            "range": "±264",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2052ms, Q3: 2316ms\nAll times: 1761, 1802, 1822, 1852, 1906, 1960, 2010, 2052, 2078, 2090, 2097, 2116, 2156, 2159, 2161, 2184, 2230, 2260, 2264, 2278, 2282, 2288, 2316, 2329, 2337, 2346, 2423, 2501, 2630, 3034ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2361,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2339ms, Q3: 2380ms\nAll times: 2314, 2320, 2326, 2327, 2338, 2339, 2342, 2345, 2347, 2352, 2361, 2363, 2364, 2364, 2378, 2380, 2381, 2390, 2398, 2414ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2769,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2759ms, Q3: 2801ms\nAll times: 2711, 2739, 2742, 2754, 2757, 2759, 2760, 2761, 2764, 2766, 2769, 2771, 2772, 2782, 2785, 2801, 3361, 3488, 3493, 3637ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cafbaab0a0697939b95383c06ef57630a8bee235",
          "message": "Merge pull request #1370 from yamadashy/chore/add-bench-cores-script",
          "timestamp": "2026-04-01T20:34:28+09:00",
          "tree_id": "dae0570ef11eedc81103597d342f179b6389fe29",
          "url": "https://github.com/yamadashy/repomix/commit/cafbaab0a0697939b95383c06ef57630a8bee235"
        },
        "date": 1775043451517,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1680,
            "range": "±411",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1600ms, Q3: 2011ms\nAll times: 1411, 1459, 1490, 1514, 1532, 1551, 1582, 1600, 1601, 1604, 1617, 1618, 1622, 1632, 1646, 1680, 1681, 1706, 1759, 1813, 1827, 1980, 2011, 2018, 2069, 2074, 2076, 2081, 2097, 2104ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2245,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2235ms, Q3: 2272ms\nAll times: 2221, 2223, 2226, 2231, 2234, 2235, 2236, 2241, 2242, 2244, 2245, 2249, 2249, 2253, 2265, 2272, 2289, 2291, 2297, 2321ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3060,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 3051ms, Q3: 3115ms\nAll times: 2971, 2987, 3007, 3047, 3051, 3056, 3056, 3057, 3057, 3060, 3064, 3064, 3090, 3102, 3115, 3120, 3123, 3130, 3294ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "729427f6ef4ed156877aac555dabde5ea0e02f5a",
          "message": "Merge pull request #1371 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-282a1442c2",
          "timestamp": "2026-04-01T20:35:20+09:00",
          "tree_id": "fc13a2683bc1565859520dd7b6a5a0e9c45db418",
          "url": "https://github.com/yamadashy/repomix/commit/729427f6ef4ed156877aac555dabde5ea0e02f5a"
        },
        "date": 1775043597019,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1591,
            "range": "±222",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1538ms, Q3: 1760ms\nAll times: 1395, 1456, 1460, 1463, 1475, 1503, 1517, 1538, 1540, 1549, 1550, 1561, 1565, 1574, 1580, 1591, 1601, 1608, 1631, 1646, 1664, 1688, 1760, 1776, 1793, 1820, 1852, 1859, 1896, 1984ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2298,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2283ms, Q3: 2308ms\nAll times: 2268, 2269, 2274, 2276, 2282, 2283, 2290, 2291, 2292, 2293, 2298, 2298, 2299, 2300, 2300, 2308, 2315, 2321, 2345, 2360ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2683,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2675ms, Q3: 2723ms\nAll times: 2656, 2665, 2667, 2671, 2673, 2675, 2676, 2678, 2683, 2683, 2683, 2686, 2690, 2694, 2715, 2723, 2727, 2737, 2741, 2752ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9d6e224a94df25c1bd06b23455296a70561266d8",
          "message": "Merge pull request #1356 from yamadashy/perf/cache-empty-dir-paths\n\nperf(core): Cache empty directory paths to avoid redundant file search",
          "timestamp": "2026-04-02T00:26:39+09:00",
          "tree_id": "9f39d41e3bdcf3870204b7a48ffc12e284484cde",
          "url": "https://github.com/yamadashy/repomix/commit/9d6e224a94df25c1bd06b23455296a70561266d8"
        },
        "date": 1775057322884,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1920,
            "range": "±321",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1785ms, Q3: 2106ms\nAll times: 1603, 1675, 1682, 1684, 1705, 1764, 1768, 1785, 1806, 1823, 1880, 1887, 1894, 1896, 1905, 1920, 1922, 2009, 2053, 2057, 2066, 2086, 2106, 2138, 2161, 2230, 2259, 2281, 2406, 2505ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2274,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2256ms, Q3: 2296ms\nAll times: 2210, 2234, 2251, 2252, 2253, 2256, 2260, 2262, 2269, 2272, 2274, 2277, 2284, 2284, 2288, 2296, 2297, 2300, 2300, 2311ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2706,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 18 runs\nQ1: 2697ms, Q3: 2717ms\nAll times: 2657, 2670, 2677, 2679, 2697, 2700, 2701, 2704, 2706, 2706, 2709, 2711, 2716, 2717, 2722, 2735, 2738, 2768ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "03828983d04ccdbaaea75564f1ab01d253938baa",
          "message": "Merge pull request #1372 from yamadashy/perf/eliminate-child-process-in-default-action\n\nperf(cli): Eliminate child process in default action",
          "timestamp": "2026-04-03T13:12:14+09:00",
          "tree_id": "6717846d14036e1d092acd50947ab1721a5bcf47",
          "url": "https://github.com/yamadashy/repomix/commit/03828983d04ccdbaaea75564f1ab01d253938baa"
        },
        "date": 1775189671228,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1735,
            "range": "±160",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1623ms, Q3: 1783ms\nAll times: 1305, 1348, 1362, 1369, 1548, 1574, 1613, 1623, 1637, 1646, 1657, 1660, 1673, 1714, 1722, 1735, 1736, 1738, 1741, 1746, 1749, 1767, 1783, 1791, 1793, 1797, 1798, 1804, 1848, 1979ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2023,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2015ms, Q3: 2030ms\nAll times: 1995, 2002, 2004, 2007, 2010, 2015, 2017, 2017, 2018, 2022, 2023, 2028, 2028, 2029, 2029, 2030, 2031, 2033, 2045, 2047ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 3078,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 3061ms, Q3: 3099ms\nAll times: 3024, 3044, 3045, 3047, 3056, 3061, 3062, 3063, 3064, 3065, 3078, 3090, 3092, 3095, 3097, 3099, 3105, 3106, 3124, 3148ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b66286b5c00d1eb398a69c9decd986f64fd9e984",
          "message": "Merge pull request #1373 from yamadashy/perf/optimize-output-token-chunk-size\n\nperf(metrics): Reduce output token counting chunks from ~1000 to ~10",
          "timestamp": "2026-04-03T14:32:55+09:00",
          "tree_id": "5a5c23ebc4997b3a70c870ef69654796f9eaa147",
          "url": "https://github.com/yamadashy/repomix/commit/b66286b5c00d1eb398a69c9decd986f64fd9e984"
        },
        "date": 1775194528317,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1344,
            "range": "±168",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1246ms, Q3: 1414ms\nAll times: 1157, 1164, 1182, 1214, 1226, 1226, 1245, 1246, 1251, 1254, 1273, 1275, 1312, 1327, 1339, 1344, 1349, 1380, 1384, 1387, 1391, 1405, 1414, 1457, 1477, 1570, 1584, 1741, 1770, 1777ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2032,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2014ms, Q3: 2066ms\nAll times: 1969, 1978, 1985, 1996, 2002, 2014, 2016, 2023, 2028, 2031, 2032, 2044, 2051, 2055, 2059, 2066, 2078, 2091, 2110, 2233ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2559,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2529ms, Q3: 2584ms\nAll times: 2460, 2493, 2503, 2518, 2529, 2544, 2545, 2545, 2553, 2559, 2562, 2564, 2568, 2570, 2584, 2585, 2639, 2681, 2703ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d7a8979ca1fb344026ee22065279afe86c14125b",
          "message": "Merge pull request #1375 from yamadashy/perf/use-codeload-github-direct\n\nperf(git): Use codeload.github.com directly to skip 302 redirect",
          "timestamp": "2026-04-03T14:52:11+09:00",
          "tree_id": "f39c7776d27dd096dee674ac39f31238bb7265dc",
          "url": "https://github.com/yamadashy/repomix/commit/d7a8979ca1fb344026ee22065279afe86c14125b"
        },
        "date": 1775195666145,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1598,
            "range": "±200",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1467ms, Q3: 1667ms\nAll times: 1212, 1227, 1285, 1315, 1349, 1412, 1465, 1467, 1468, 1471, 1495, 1498, 1562, 1590, 1594, 1598, 1600, 1621, 1642, 1642, 1649, 1651, 1667, 1740, 1793, 1843, 1933, 2094, 2151, 2243ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1945,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1931ms, Q3: 1968ms\nAll times: 1913, 1925, 1926, 1930, 1930, 1931, 1931, 1933, 1941, 1942, 1945, 1949, 1950, 1952, 1956, 1968, 1969, 1973, 1983, 1987ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2446,
            "range": "±69",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2407ms, Q3: 2476ms\nAll times: 2387, 2387, 2391, 2396, 2407, 2413, 2422, 2437, 2441, 2446, 2453, 2458, 2463, 2468, 2476, 2486, 2501, 2539, 2877ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a57938198c91dcdffd8c9488037ed37adbcc537b",
          "message": "Merge pull request #1374 from yamadashy/perf/warm-up-all-metrics-worker-threads\n\nperf(metrics): Warm up all metrics worker threads in parallel",
          "timestamp": "2026-04-03T16:47:20+09:00",
          "tree_id": "a80c32a0ea125766e87755bfd4676425f0e8a563",
          "url": "https://github.com/yamadashy/repomix/commit/a57938198c91dcdffd8c9488037ed37adbcc537b"
        },
        "date": 1775202575382,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1154,
            "range": "±84",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1139ms, Q3: 1223ms\nAll times: 1081, 1098, 1120, 1122, 1124, 1126, 1131, 1139, 1139, 1140, 1141, 1144, 1145, 1148, 1152, 1154, 1160, 1165, 1170, 1178, 1196, 1208, 1223, 1227, 1234, 1242, 1257, 1263, 1371, 1715ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2055,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2045ms, Q3: 2076ms\nAll times: 2008, 2024, 2033, 2043, 2045, 2045, 2051, 2051, 2052, 2054, 2055, 2059, 2074, 2075, 2076, 2076, 2080, 2082, 2086, 2117ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2425,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2413ms, Q3: 2437ms\nAll times: 2396, 2404, 2404, 2405, 2413, 2414, 2420, 2420, 2423, 2425, 2426, 2429, 2434, 2436, 2437, 2442, 2444, 2451, 2483ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2a16edefa163b84f007671ca64330a0f66757b63",
          "message": "Merge pull request #1380 from yamadashy/perf/batch-security-check-tasks\n\nperf(security): Batch security check tasks to reduce IPC overhead",
          "timestamp": "2026-04-04T00:56:53+09:00",
          "tree_id": "8f7ec3a0e4c7089a5894a97423abada05fca30a3",
          "url": "https://github.com/yamadashy/repomix/commit/2a16edefa163b84f007671ca64330a0f66757b63"
        },
        "date": 1775231932998,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1129,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1113ms, Q3: 1148ms\nAll times: 1094, 1102, 1102, 1107, 1108, 1109, 1112, 1113, 1118, 1119, 1119, 1121, 1124, 1127, 1129, 1129, 1129, 1133, 1135, 1138, 1140, 1143, 1148, 1152, 1159, 1169, 1212, 1280, 1297, 1350ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1930,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1924ms, Q3: 1945ms\nAll times: 1912, 1912, 1914, 1915, 1917, 1924, 1925, 1927, 1928, 1929, 1930, 1930, 1931, 1933, 1943, 1945, 1945, 1947, 1949, 1954ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2394,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2376ms, Q3: 2431ms\nAll times: 2331, 2342, 2366, 2368, 2371, 2376, 2378, 2381, 2390, 2391, 2394, 2396, 2404, 2415, 2426, 2431, 2465, 2467, 2478, 2480ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "90c79661f6b6110bbb47885ef537a804fdf29b33",
          "message": "Merge pull request #1383 from yamadashy/renovate/anthropics-claude-code-action-1.x\n\nchore(deps): update anthropics/claude-code-action action to v1.0.81",
          "timestamp": "2026-04-04T19:31:23+09:00",
          "tree_id": "7d91b2568eec2d8eda55331caf9ec56046dc6b58",
          "url": "https://github.com/yamadashy/repomix/commit/90c79661f6b6110bbb47885ef537a804fdf29b33"
        },
        "date": 1775298937117,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1220,
            "range": "±135",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1170ms, Q3: 1305ms\nAll times: 1133, 1148, 1152, 1158, 1163, 1164, 1166, 1170, 1176, 1191, 1196, 1204, 1210, 1210, 1215, 1220, 1226, 1233, 1250, 1273, 1275, 1302, 1305, 1330, 1364, 1386, 1455, 1516, 1619, 1714ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2006,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1995ms, Q3: 2019ms\nAll times: 1973, 1985, 1986, 1989, 1992, 1995, 2000, 2001, 2001, 2002, 2006, 2007, 2009, 2012, 2018, 2019, 2030, 2033, 2039, 2050ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2401,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2395ms, Q3: 2420ms\nAll times: 2366, 2383, 2387, 2393, 2394, 2395, 2398, 2398, 2399, 2399, 2401, 2405, 2409, 2414, 2417, 2420, 2427, 2437, 2451, 2457ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8807d5f21ea65e437b18194e44e320620642df51",
          "message": "Merge pull request #1386 from yamadashy/renovate/codecov-codecov-action-5.x\n\nchore(deps): update codecov/codecov-action action to v5.5.4",
          "timestamp": "2026-04-04T19:32:43+09:00",
          "tree_id": "782aaa9c63d3edb9fb6553da8ff052053e589684",
          "url": "https://github.com/yamadashy/repomix/commit/8807d5f21ea65e437b18194e44e320620642df51"
        },
        "date": 1775299097985,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1158,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1142ms, Q3: 1184ms\nAll times: 1125, 1127, 1129, 1130, 1138, 1141, 1141, 1142, 1145, 1145, 1150, 1153, 1155, 1157, 1157, 1158, 1158, 1160, 1170, 1172, 1177, 1180, 1184, 1207, 1272, 1309, 1310, 1332, 1417, 1556ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1913,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1904ms, Q3: 1929ms\nAll times: 1897, 1897, 1901, 1901, 1903, 1904, 1907, 1910, 1911, 1911, 1913, 1920, 1922, 1924, 1924, 1929, 1932, 2120, 2159, 2286ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2957,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2934ms, Q3: 2981ms\nAll times: 2869, 2901, 2911, 2927, 2927, 2934, 2941, 2945, 2948, 2952, 2957, 2957, 2960, 2973, 2978, 2981, 2983, 2986, 2994, 3001ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a91b529fa67a1ff9ed389f7ec7488c57a0b06bd2",
          "message": "Merge pull request #1388 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-04-04T19:57:02+09:00",
          "tree_id": "afc4d4066ece15ba6e32a1d5bb6211c53e1593dd",
          "url": "https://github.com/yamadashy/repomix/commit/a91b529fa67a1ff9ed389f7ec7488c57a0b06bd2"
        },
        "date": 1775300391760,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1167,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1142ms, Q3: 1212ms\nAll times: 1113, 1119, 1121, 1125, 1127, 1138, 1139, 1142, 1143, 1146, 1147, 1148, 1149, 1156, 1165, 1167, 1180, 1181, 1181, 1182, 1193, 1205, 1212, 1216, 1258, 1279, 1319, 1346, 1452, 1543ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2080,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2054ms, Q3: 2099ms\nAll times: 2026, 2027, 2045, 2052, 2053, 2054, 2054, 2056, 2057, 2071, 2080, 2080, 2086, 2089, 2089, 2099, 2100, 2110, 2122, 2132ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2525,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2508ms, Q3: 2548ms\nAll times: 2479, 2483, 2486, 2496, 2506, 2508, 2512, 2513, 2513, 2524, 2525, 2530, 2534, 2540, 2547, 2548, 2614, 2655, 2691, 3076ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5bd07940f995c100ac0153e5e550f584cc664336",
          "message": "Merge pull request #1385 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-04-04T19:57:28+09:00",
          "tree_id": "959038f5f9a7618819ed73ec6a14aef2e31621aa",
          "url": "https://github.com/yamadashy/repomix/commit/5bd07940f995c100ac0153e5e550f584cc664336"
        },
        "date": 1775300523098,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1568,
            "range": "±183",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1450ms, Q3: 1633ms\nAll times: 1314, 1316, 1325, 1342, 1380, 1435, 1438, 1450, 1475, 1478, 1499, 1507, 1532, 1552, 1558, 1568, 1576, 1591, 1611, 1611, 1611, 1618, 1633, 1655, 1766, 1779, 1784, 1865, 1999, 2117ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2110,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2079ms, Q3: 2122ms\nAll times: 2051, 2061, 2071, 2073, 2076, 2079, 2089, 2096, 2109, 2110, 2110, 2114, 2118, 2119, 2120, 2122, 2127, 2131, 2178, 2215ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2537,
            "range": "±78",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2491ms, Q3: 2569ms\nAll times: 2469, 2479, 2488, 2489, 2489, 2491, 2491, 2493, 2505, 2530, 2537, 2542, 2543, 2564, 2567, 2569, 2580, 2581, 2584, 2598ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "99535ffa925ae28e8529ba7da439c672b60fe728",
          "message": "Merge pull request #1390 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-d44e5332ed\n\nchore(deps): bump the npm_and_yarn group across 3 directories with 2 updates",
          "timestamp": "2026-04-04T21:00:38+09:00",
          "tree_id": "6b739110aa664f1f6b901ba50de51c00057054e0",
          "url": "https://github.com/yamadashy/repomix/commit/99535ffa925ae28e8529ba7da439c672b60fe728"
        },
        "date": 1775304206216,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1652,
            "range": "±218",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1560ms, Q3: 1778ms\nAll times: 1349, 1354, 1395, 1451, 1473, 1522, 1558, 1560, 1569, 1586, 1598, 1625, 1634, 1644, 1647, 1652, 1656, 1662, 1689, 1718, 1733, 1735, 1778, 1781, 1801, 1883, 1890, 1988, 2019, 2032ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2002,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1983ms, Q3: 2030ms\nAll times: 1955, 1968, 1970, 1971, 1978, 1983, 1991, 1992, 1996, 2000, 2002, 2003, 2005, 2006, 2009, 2030, 2030, 2054, 2060, 2069ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2498,
            "range": "±142",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2455ms, Q3: 2597ms\nAll times: 2423, 2436, 2440, 2452, 2455, 2456, 2465, 2481, 2495, 2498, 2507, 2536, 2558, 2572, 2597, 2604, 2607, 2630, 2719ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2accd6aaf11b9f2de5b333444f64a624ca058f05",
          "message": "Merge pull request #1392 from yamadashy/perf/skip-binary-files-during-archive-extraction\n\nperf(core): Skip binary files during GitHub archive tar extraction",
          "timestamp": "2026-04-04T23:42:04+09:00",
          "tree_id": "aac69fe35bca3a2fe80588dbb4fb5d7ba2d061eb",
          "url": "https://github.com/yamadashy/repomix/commit/2accd6aaf11b9f2de5b333444f64a624ca058f05"
        },
        "date": 1775313872007,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1227,
            "range": "±160",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1199ms, Q3: 1359ms\nAll times: 1118, 1177, 1178, 1179, 1179, 1183, 1190, 1199, 1202, 1205, 1207, 1210, 1217, 1220, 1221, 1227, 1232, 1236, 1263, 1308, 1324, 1356, 1359, 1363, 1370, 1372, 1398, 1424, 1492, 1525ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1996,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1983ms, Q3: 2026ms\nAll times: 1960, 1964, 1979, 1982, 1982, 1983, 1985, 1987, 1988, 1989, 1996, 2007, 2009, 2011, 2022, 2026, 2031, 2041, 2049, 2381ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2538,
            "range": "±97",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2495ms, Q3: 2592ms\nAll times: 2446, 2447, 2462, 2470, 2489, 2495, 2502, 2517, 2522, 2522, 2538, 2539, 2540, 2566, 2586, 2592, 2619, 2661, 2726, 3614ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2f561979bdc949a477701d81dc5a294e599d7d4e",
          "message": "Merge pull request #1401 from yamadashy/perf/lazy-load-encoding-libs\n\nperf(core): Lazy-load jschardet and iconv-lite in fileRead",
          "timestamp": "2026-04-05T14:59:00+09:00",
          "tree_id": "d5c4db038ded78398816c28e9056538529364c0e",
          "url": "https://github.com/yamadashy/repomix/commit/2f561979bdc949a477701d81dc5a294e599d7d4e"
        },
        "date": 1775368926014,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1149,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1141ms, Q3: 1206ms\nAll times: 1093, 1120, 1125, 1126, 1136, 1140, 1140, 1141, 1142, 1142, 1142, 1142, 1143, 1146, 1149, 1149, 1155, 1168, 1169, 1176, 1179, 1195, 1206, 1218, 1235, 1242, 1313, 1322, 1376, 1460ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2104,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2088ms, Q3: 2131ms\nAll times: 2027, 2068, 2077, 2083, 2086, 2088, 2094, 2095, 2101, 2104, 2104, 2106, 2108, 2108, 2122, 2131, 2132, 2206, 2444, 2491ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2506,
            "range": "±165",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2487ms, Q3: 2652ms\nAll times: 2413, 2428, 2442, 2481, 2485, 2487, 2496, 2497, 2498, 2500, 2506, 2521, 2561, 2562, 2641, 2652, 2721, 2725, 3006, 3305ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4acbbc07838d4dcae53b5975211b33ba6c3c17a3",
          "message": "Merge pull request #1400 from yamadashy/perf/eliminate-stat-syscall\n\nperf(core): Eliminate redundant stat() syscall in fileRead",
          "timestamp": "2026-04-05T15:05:20+09:00",
          "tree_id": "122c8bccd1417c1c0eb091821027577c4f26e387",
          "url": "https://github.com/yamadashy/repomix/commit/4acbbc07838d4dcae53b5975211b33ba6c3c17a3"
        },
        "date": 1775369264346,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1754,
            "range": "±290",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1674ms, Q3: 1964ms\nAll times: 1427, 1479, 1492, 1509, 1519, 1573, 1664, 1674, 1700, 1703, 1716, 1721, 1722, 1733, 1752, 1754, 1756, 1766, 1822, 1822, 1832, 1834, 1964, 1988, 1989, 1990, 2062, 2093, 2159, 2166ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1906,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1896ms, Q3: 1924ms\nAll times: 1858, 1860, 1884, 1890, 1894, 1896, 1898, 1902, 1904, 1906, 1906, 1915, 1919, 1920, 1924, 1924, 1927, 1930, 1940, 1942ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2441,
            "range": "±221",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2408ms, Q3: 2629ms\nAll times: 2382, 2390, 2395, 2396, 2403, 2408, 2412, 2415, 2423, 2433, 2441, 2441, 2450, 2451, 2455, 2629, 2789, 3071, 3142, 3412ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a96b21275d05452869b00384213a1cfa81d5278e",
          "message": "Merge pull request #1407 from yamadashy/chore/add-ci-path-filters\n\nchore(ci): Add paths-ignore to CI workflow triggers",
          "timestamp": "2026-04-05T22:13:27+09:00",
          "tree_id": "f9d3514a163001d03144db352cb480258c3d514d",
          "url": "https://github.com/yamadashy/repomix/commit/a96b21275d05452869b00384213a1cfa81d5278e"
        },
        "date": 1775394971410,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1231,
            "range": "±119",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1158ms, Q3: 1277ms\nAll times: 1131, 1134, 1137, 1140, 1148, 1151, 1157, 1158, 1161, 1168, 1177, 1199, 1210, 1212, 1214, 1231, 1231, 1241, 1242, 1253, 1258, 1263, 1277, 1280, 1291, 1302, 1311, 1324, 1379, 1408ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2066,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2060ms, Q3: 2091ms\nAll times: 2030, 2043, 2052, 2056, 2060, 2060, 2060, 2062, 2064, 2065, 2066, 2068, 2070, 2074, 2084, 2091, 2093, 2095, 2098, 2099ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2761,
            "range": "±515",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2643ms, Q3: 3158ms\nAll times: 2522, 2598, 2618, 2631, 2643, 2661, 2664, 2698, 2721, 2761, 2886, 3131, 3150, 3156, 3158, 3206, 3343, 3355, 3912ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dc23e80f991460af944c29646e82dc53cb442619",
          "message": "Merge pull request #1406 from yamadashy/chore/add-pr-address-feedback-command\n\nchore(agents): Add unified pr-address-feedback command",
          "timestamp": "2026-04-05T22:32:15+09:00",
          "tree_id": "319e9f41b7e1d0872dd40449902d546c85acb555",
          "url": "https://github.com/yamadashy/repomix/commit/dc23e80f991460af944c29646e82dc53cb442619"
        },
        "date": 1775396112253,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1485,
            "range": "±192",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1390ms, Q3: 1582ms\nAll times: 1237, 1286, 1287, 1288, 1322, 1357, 1367, 1390, 1396, 1413, 1417, 1423, 1427, 1438, 1482, 1485, 1490, 1497, 1514, 1542, 1549, 1561, 1582, 1586, 1587, 1614, 1687, 1736, 1784, 2288ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2053,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2035ms, Q3: 2061ms\nAll times: 1990, 1998, 2009, 2013, 2029, 2035, 2037, 2041, 2044, 2044, 2053, 2053, 2056, 2057, 2058, 2061, 2071, 2077, 2106, 2144ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2453,
            "range": "±216",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2439ms, Q3: 2655ms\nAll times: 2417, 2424, 2428, 2430, 2432, 2439, 2440, 2441, 2442, 2451, 2453, 2454, 2456, 2464, 2466, 2655, 2660, 2699, 2718, 2989ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "55997367550976fb820ddb4fcb651fea887b926e",
          "message": "Merge pull request #1408 from yamadashy/chore/split-ci-workflow\n\nchore(ci): Split monolithic ci.yml into separate workflow files",
          "timestamp": "2026-04-05T22:43:53+09:00",
          "tree_id": "fa2003198ac3b49ad0726023d205012f9214fff9",
          "url": "https://github.com/yamadashy/repomix/commit/55997367550976fb820ddb4fcb651fea887b926e"
        },
        "date": 1775396818804,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1235,
            "range": "±78",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1210ms, Q3: 1288ms\nAll times: 1179, 1186, 1192, 1195, 1203, 1207, 1208, 1210, 1217, 1218, 1220, 1223, 1230, 1230, 1231, 1235, 1236, 1238, 1240, 1242, 1247, 1287, 1288, 1309, 1317, 1324, 1404, 1415, 1507, 1776ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 2104,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2097ms, Q3: 2115ms\nAll times: 2068, 2070, 2087, 2087, 2092, 2097, 2099, 2100, 2101, 2104, 2104, 2107, 2107, 2109, 2111, 2115, 2123, 2128, 2134, 2159ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2657,
            "range": "±56",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2649ms, Q3: 2705ms\nAll times: 2597, 2620, 2627, 2627, 2635, 2649, 2650, 2652, 2652, 2656, 2657, 2657, 2663, 2675, 2700, 2705, 2718, 2926, 3299, 3349ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9d5b92822c40aa6a78c0300e7f9870fe2eced4f1",
          "message": "Merge pull request #1409 from yamadashy/perf/reduce-worker-thread-contention\n\nperf(core): Reduce worker thread contention for faster pipeline execution",
          "timestamp": "2026-04-06T01:36:14+09:00",
          "tree_id": "582d03543ef231440d987994c1cd377416b22793",
          "url": "https://github.com/yamadashy/repomix/commit/9d5b92822c40aa6a78c0300e7f9870fe2eced4f1"
        },
        "date": 1775407129711,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1156,
            "range": "±90",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1134ms, Q3: 1224ms\nAll times: 1100, 1124, 1126, 1129, 1129, 1132, 1132, 1134, 1136, 1138, 1139, 1139, 1145, 1147, 1156, 1156, 1158, 1165, 1167, 1179, 1181, 1214, 1224, 1237, 1240, 1243, 1258, 1271, 1308, 1419ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1992,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1974ms, Q3: 2006ms\nAll times: 1951, 1964, 1964, 1968, 1971, 1974, 1982, 1984, 1986, 1990, 1992, 1993, 2003, 2004, 2004, 2006, 2020, 2020, 2024, 2032ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2471,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2448ms, Q3: 2482ms\nAll times: 2419, 2440, 2443, 2447, 2447, 2448, 2454, 2459, 2462, 2465, 2471, 2472, 2473, 2474, 2476, 2482, 2495, 2498, 2514, 2527ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ffe67700293394d90da29ef7cccb118ea0dff280",
          "message": "Merge pull request #1411 from yamadashy/perf/batch-metrics-token-counting\n\nperf(metrics): Batch token counting IPC to reduce worker round-trip overhead",
          "timestamp": "2026-04-06T14:37:34+09:00",
          "tree_id": "a425ca19a17d6c4d64b9928e91587add0f6311f7",
          "url": "https://github.com/yamadashy/repomix/commit/ffe67700293394d90da29ef7cccb118ea0dff280"
        },
        "date": 1775453988200,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1564,
            "range": "±179",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1471ms, Q3: 1650ms\nAll times: 1393, 1406, 1419, 1440, 1454, 1455, 1456, 1471, 1476, 1478, 1508, 1516, 1534, 1539, 1539, 1564, 1569, 1574, 1590, 1595, 1636, 1639, 1650, 1699, 1712, 1718, 1730, 1800, 1913, 2027ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1991,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1948ms, Q3: 2008ms\nAll times: 1891, 1903, 1910, 1934, 1941, 1948, 1949, 1968, 1985, 1987, 1991, 1993, 1995, 1996, 2001, 2008, 2020, 2026, 2033, 2042ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2349,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2325ms, Q3: 2372ms\nAll times: 2277, 2283, 2306, 2322, 2325, 2325, 2327, 2332, 2334, 2341, 2349, 2350, 2360, 2361, 2367, 2372, 2385, 2401, 2402, 2432ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "01f5c1a8dcdf328e56a4470e49899a85390cf42f",
          "message": "Merge pull request #1413 from yamadashy/docs/remove-tiktoken-references\n\ndocs(core): Replace tiktoken references with gpt-tokenizer",
          "timestamp": "2026-04-06T15:37:39+09:00",
          "tree_id": "29e2b3a3fb48f532c14c1fb480184579f21e4eb7",
          "url": "https://github.com/yamadashy/repomix/commit/01f5c1a8dcdf328e56a4470e49899a85390cf42f"
        },
        "date": 1775457835530,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1384,
            "range": "±205",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1262ms, Q3: 1467ms\nAll times: 1160, 1163, 1227, 1230, 1247, 1249, 1261, 1262, 1277, 1294, 1306, 1327, 1343, 1355, 1383, 1384, 1394, 1406, 1410, 1414, 1450, 1452, 1467, 1484, 1495, 1621, 1683, 1688, 1729, 1834ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1865,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1846ms, Q3: 1899ms\nAll times: 1818, 1825, 1827, 1840, 1842, 1846, 1856, 1857, 1860, 1862, 1865, 1875, 1876, 1885, 1886, 1899, 1907, 1912, 1935, 2057ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2363,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2348ms, Q3: 2403ms\nAll times: 2280, 2311, 2334, 2338, 2340, 2348, 2352, 2355, 2357, 2358, 2363, 2364, 2368, 2370, 2379, 2403, 2408, 2454, 2671, 3003ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c20457164b816ba3a96cc91ca409647cecb40548",
          "message": "Merge pull request #1415 from yamadashy/perf/increase-output-chunk-size\n\nperf(metrics): Increase output token counting chunk size from 100KB to 200KB",
          "timestamp": "2026-04-06T17:51:25+09:00",
          "tree_id": "eba19dfcce1f1f2817dfd41871a9e6857a2e9589",
          "url": "https://github.com/yamadashy/repomix/commit/c20457164b816ba3a96cc91ca409647cecb40548"
        },
        "date": 1775465651195,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1394,
            "range": "±139",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1331ms, Q3: 1470ms\nAll times: 1264, 1271, 1277, 1286, 1302, 1325, 1328, 1331, 1334, 1360, 1360, 1364, 1379, 1384, 1385, 1394, 1401, 1407, 1419, 1429, 1445, 1446, 1470, 1482, 1512, 1521, 1525, 1553, 1736, 1859ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1866,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1855ms, Q3: 1902ms\nAll times: 1804, 1829, 1830, 1831, 1840, 1855, 1855, 1855, 1861, 1864, 1866, 1868, 1877, 1881, 1888, 1902, 1911, 2081, 2138, 2199ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2195,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2160ms, Q3: 2225ms\nAll times: 2148, 2148, 2154, 2157, 2159, 2160, 2168, 2176, 2191, 2193, 2195, 2211, 2214, 2218, 2224, 2225, 2235, 2243, 2246, 2247ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fb24e6452e8a41d552969ad4e4b4b68b88a12b34",
          "message": "Merge pull request #1416 from yamadashy/perf/reduce-metrics-batch-size\n\nperf(metrics): Reduce token counting batch size for better worker utilization",
          "timestamp": "2026-04-06T18:21:29+09:00",
          "tree_id": "b0ab02122d0f905dda2fd4f5f18319c2ef698f3a",
          "url": "https://github.com/yamadashy/repomix/commit/fb24e6452e8a41d552969ad4e4b4b68b88a12b34"
        },
        "date": 1775467425284,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1561,
            "range": "±175",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1498ms, Q3: 1673ms\nAll times: 1208, 1311, 1337, 1364, 1368, 1414, 1473, 1498, 1499, 1530, 1533, 1536, 1538, 1552, 1558, 1561, 1582, 1588, 1608, 1625, 1626, 1658, 1673, 1687, 1707, 1735, 1762, 1763, 1805, 1915ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1781,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1775ms, Q3: 1786ms\nAll times: 1761, 1773, 1773, 1774, 1774, 1775, 1779, 1780, 1781, 1781, 1781, 1782, 1783, 1783, 1785, 1786, 1788, 1789, 1804, 1812ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2944,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2938ms, Q3: 2979ms\nAll times: 2904, 2923, 2924, 2925, 2938, 2940, 2940, 2941, 2942, 2944, 2955, 2958, 2959, 2978, 2979, 2984, 2987, 2988, 3005ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7b9e3d4ccf86d2842af7b04dd31d5ada777deeac",
          "message": "Merge pull request #1417 from yamadashy/fix/website-gpt-tokenizer-bundle\n\nfix(metrics): Use resolveEncodingAsync for bundler-compatible token counting",
          "timestamp": "2026-04-06T18:40:09+09:00",
          "tree_id": "365dd56208f2973ff1222b04c15614e20759dc5b",
          "url": "https://github.com/yamadashy/repomix/commit/7b9e3d4ccf86d2842af7b04dd31d5ada777deeac"
        },
        "date": 1775468591254,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1160,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1138ms, Q3: 1186ms\nAll times: 1107, 1117, 1121, 1122, 1124, 1126, 1132, 1138, 1144, 1144, 1150, 1152, 1152, 1154, 1158, 1160, 1162, 1168, 1175, 1176, 1182, 1185, 1186, 1204, 1225, 1238, 1248, 1359, 1382, 1394ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1943,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1908ms, Q3: 1952ms\nAll times: 1879, 1881, 1886, 1897, 1898, 1908, 1914, 1917, 1924, 1936, 1943, 1943, 1947, 1949, 1950, 1952, 1955, 1982, 1995, 2007ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2495,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2464ms, Q3: 2524ms\nAll times: 2339, 2436, 2440, 2454, 2461, 2464, 2468, 2479, 2487, 2487, 2495, 2496, 2497, 2502, 2507, 2524, 2561, 2582, 2894, 3269ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3bb57cacd9b46b745b505cb0741cf0488103705a",
          "message": "Merge pull request #1420 from yamadashy/feat/add-progress-callback-to-default-action\n\nfeat(core): Add progressCallback parameter to runDefaultAction",
          "timestamp": "2026-04-06T22:02:23+09:00",
          "tree_id": "270770052b967255c84bcc74e0a38528fab258c4",
          "url": "https://github.com/yamadashy/repomix/commit/3bb57cacd9b46b745b505cb0741cf0488103705a"
        },
        "date": 1775480670104,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 2271,
            "range": "±428",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2084ms, Q3: 2512ms\nAll times: 1968, 1998, 2016, 2050, 2051, 2078, 2084, 2084, 2109, 2124, 2145, 2150, 2209, 2240, 2255, 2271, 2281, 2290, 2334, 2394, 2398, 2499, 2512, 2518, 2612, 2620, 2634, 2719, 2929, 2978ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1890,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1880ms, Q3: 1903ms\nAll times: 1839, 1854, 1859, 1866, 1868, 1880, 1881, 1885, 1887, 1888, 1890, 1891, 1892, 1897, 1902, 1903, 1908, 1910, 1941, 1977ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2412,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2402ms, Q3: 2435ms\nAll times: 2370, 2372, 2396, 2399, 2401, 2402, 2406, 2407, 2409, 2410, 2412, 2416, 2418, 2421, 2426, 2435, 2445, 2449, 2463, 2472ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "513d62ac9c6aa86d9ec8c426dc1371cc338bb837",
          "message": "Merge pull request #1423 from yamadashy/chore/reviewer-agents-use-sonnet\n\nchore(agents): Set reviewer agents to use Sonnet model",
          "timestamp": "2026-04-06T22:07:58+09:00",
          "tree_id": "530356ba883de9e98f12d1a658f80abcf32212b5",
          "url": "https://github.com/yamadashy/repomix/commit/513d62ac9c6aa86d9ec8c426dc1371cc338bb837"
        },
        "date": 1775481005415,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1127,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1110ms, Q3: 1152ms\nAll times: 1092, 1095, 1097, 1098, 1101, 1101, 1109, 1110, 1114, 1116, 1119, 1123, 1126, 1126, 1126, 1127, 1129, 1134, 1136, 1140, 1140, 1142, 1152, 1171, 1171, 1182, 1182, 1186, 1371, 1405ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1815,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1800ms, Q3: 1828ms\nAll times: 1773, 1781, 1785, 1786, 1795, 1800, 1807, 1810, 1811, 1814, 1815, 1817, 1823, 1824, 1826, 1828, 1837, 1850, 1852, 1894ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2494,
            "range": "±184",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2420ms, Q3: 2604ms\nAll times: 2397, 2404, 2409, 2412, 2417, 2420, 2432, 2434, 2439, 2439, 2494, 2545, 2549, 2563, 2590, 2604, 2633, 2685, 2979, 3115ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6a645d86637bab9cb670a7a297944039384000f5",
          "message": "Merge pull request #1425 from yamadashy/chore/improve-claude-md\n\nchore(agents): Improve CLAUDE.md clarity and conciseness",
          "timestamp": "2026-04-06T23:24:46+09:00",
          "tree_id": "bc3d4c5050625f199762755f04bc43ac27f3f858",
          "url": "https://github.com/yamadashy/repomix/commit/6a645d86637bab9cb670a7a297944039384000f5"
        },
        "date": 1775485599392,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1459,
            "range": "±237",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1285ms, Q3: 1522ms\nAll times: 1208, 1214, 1216, 1219, 1228, 1248, 1269, 1285, 1334, 1336, 1348, 1397, 1415, 1429, 1451, 1459, 1470, 1488, 1497, 1516, 1520, 1521, 1522, 1528, 1554, 1611, 1755, 1792, 1809, 1826ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1876,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1866ms, Q3: 1883ms\nAll times: 1852, 1854, 1858, 1861, 1865, 1866, 1868, 1868, 1872, 1873, 1876, 1879, 1880, 1881, 1882, 1883, 1886, 1906, 1916, 1927ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2332,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2319ms, Q3: 2342ms\nAll times: 2290, 2296, 2313, 2318, 2318, 2319, 2319, 2322, 2323, 2326, 2332, 2335, 2336, 2338, 2338, 2342, 2344, 2356, 2362, 2375ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eafa70a7ca875f6737a86349397d3233c2d9fa13",
          "message": "Merge pull request #1430 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-8578f1e909\n\nchore(deps): Bump the npm_and_yarn group across 3 directories with 3 updates",
          "timestamp": "2026-04-08T22:37:37+09:00",
          "tree_id": "3d87db94a20a0f2feff45bacc1f036810046d91c",
          "url": "https://github.com/yamadashy/repomix/commit/eafa70a7ca875f6737a86349397d3233c2d9fa13"
        },
        "date": 1775655608311,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1729,
            "range": "±195",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1657ms, Q3: 1852ms\nAll times: 1520, 1556, 1581, 1595, 1612, 1641, 1647, 1657, 1659, 1662, 1681, 1684, 1718, 1724, 1727, 1729, 1755, 1763, 1768, 1772, 1790, 1811, 1852, 1854, 1855, 1879, 1936, 1970, 2015, 2157ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1840,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1825ms, Q3: 1868ms\nAll times: 1736, 1814, 1817, 1818, 1822, 1825, 1827, 1829, 1835, 1836, 1840, 1847, 1848, 1858, 1867, 1868, 1898, 1905, 1913, 1949ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2410,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2379ms, Q3: 2467ms\nAll times: 2306, 2360, 2361, 2368, 2378, 2379, 2387, 2390, 2405, 2409, 2410, 2415, 2424, 2427, 2431, 2467, 2478, 2487, 2615, 2748ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "81bf4ffd46c170db72c076320e713cd150b47de6",
          "message": "Merge pull request #1442 from yamadashy/renovate/homebrew-actions-digest\n\nchore(deps): update homebrew/actions digest to 59e6b20",
          "timestamp": "2026-04-11T11:52:36+09:00",
          "tree_id": "3a8d545e94ee59c944c2073ebc1998140298724b",
          "url": "https://github.com/yamadashy/repomix/commit/81bf4ffd46c170db72c076320e713cd150b47de6"
        },
        "date": 1775876147343,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1822,
            "range": "±259",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1685ms, Q3: 1944ms\nAll times: 1559, 1626, 1631, 1637, 1662, 1679, 1682, 1685, 1711, 1735, 1746, 1765, 1781, 1802, 1813, 1822, 1829, 1887, 1892, 1900, 1911, 1939, 1944, 1974, 1978, 2015, 2070, 2154, 2261, 2680ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1892,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1882ms, Q3: 1912ms\nAll times: 1870, 1876, 1880, 1881, 1882, 1882, 1882, 1885, 1886, 1890, 1892, 1893, 1898, 1899, 1901, 1912, 1913, 1918, 1918, 1924ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2330,
            "range": "±56",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2309ms, Q3: 2365ms\nAll times: 2240, 2270, 2297, 2302, 2304, 2309, 2318, 2319, 2326, 2329, 2330, 2346, 2349, 2350, 2351, 2365, 2366, 2369, 2369, 2376ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ab6ee468241d92c4595ecf5c99af669bb71ad33a",
          "message": "Merge pull request #1444 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-04-11T11:55:38+09:00",
          "tree_id": "cab527232ac0bcb2ccf93d2eb8ed934beb51c8ca",
          "url": "https://github.com/yamadashy/repomix/commit/ab6ee468241d92c4595ecf5c99af669bb71ad33a"
        },
        "date": 1775876310261,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1498,
            "range": "±448",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1362ms, Q3: 1810ms\nAll times: 1257, 1263, 1307, 1317, 1334, 1340, 1342, 1362, 1376, 1422, 1433, 1435, 1483, 1491, 1494, 1498, 1522, 1565, 1635, 1720, 1742, 1746, 1810, 1818, 1863, 1872, 2027, 2081, 2103, 2612ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1750,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1741ms, Q3: 1770ms\nAll times: 1709, 1722, 1732, 1734, 1738, 1741, 1743, 1743, 1743, 1745, 1750, 1751, 1755, 1761, 1764, 1770, 1773, 1773, 1780, 1792ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2513,
            "range": "±106",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2476ms, Q3: 2582ms\nAll times: 2448, 2452, 2453, 2467, 2475, 2476, 2478, 2487, 2501, 2502, 2513, 2527, 2545, 2558, 2564, 2582, 2582, 2616, 2691, 3119ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a6f8885119066eb337cd88e2c5d0a070ad8df274",
          "message": "Merge pull request #1445 from yamadashy/renovate/scripts-non-major-dependencies\n\nchore(deps): update dependency @types/node to ^24.12.2",
          "timestamp": "2026-04-11T11:55:49+09:00",
          "tree_id": "142ab5ec8c46d7f94b1001689d36d1a6f85327ba",
          "url": "https://github.com/yamadashy/repomix/commit/a6f8885119066eb337cd88e2c5d0a070ad8df274"
        },
        "date": 1775876454995,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1370,
            "range": "±177",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1300ms, Q3: 1477ms\nAll times: 1183, 1186, 1217, 1228, 1268, 1270, 1295, 1300, 1305, 1318, 1319, 1335, 1349, 1351, 1357, 1370, 1371, 1372, 1432, 1434, 1435, 1448, 1477, 1511, 1516, 1547, 1581, 1699, 1708, 1774ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1990,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1970ms, Q3: 2006ms\nAll times: 1916, 1941, 1959, 1963, 1965, 1970, 1972, 1976, 1977, 1984, 1990, 1991, 1993, 1993, 2005, 2006, 2009, 2009, 2012, 2019ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2392,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2373ms, Q3: 2420ms\nAll times: 2362, 2365, 2366, 2368, 2370, 2373, 2373, 2378, 2384, 2392, 2392, 2393, 2396, 2404, 2414, 2420, 2427, 2444, 2461, 2471ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "afbab35a6d9fee3ef9f99dc871d498d3d024716f",
          "message": "Merge pull request #1436 from yamadashy/perf/lazy-load-heavy-modules\n\nperf(core): Lazy-load handlebars, fast-xml-builder, and @clack/prompts",
          "timestamp": "2026-04-11T12:59:11+09:00",
          "tree_id": "e029b0add1a0b86d923d238fcf85c197932b73d7",
          "url": "https://github.com/yamadashy/repomix/commit/afbab35a6d9fee3ef9f99dc871d498d3d024716f"
        },
        "date": 1775880107865,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1211,
            "range": "±130",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1177ms, Q3: 1307ms\nAll times: 1144, 1154, 1157, 1163, 1166, 1169, 1169, 1177, 1179, 1184, 1189, 1189, 1191, 1201, 1203, 1211, 1218, 1250, 1262, 1265, 1267, 1277, 1307, 1307, 1308, 1336, 1337, 1350, 1397, 1675ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1822,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1803ms, Q3: 1831ms\nAll times: 1787, 1790, 1792, 1799, 1803, 1803, 1807, 1810, 1812, 1821, 1822, 1823, 1824, 1826, 1829, 1831, 1834, 1867, 1978, 2148ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2343,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2333ms, Q3: 2361ms\nAll times: 2304, 2314, 2317, 2325, 2327, 2333, 2337, 2338, 2339, 2342, 2343, 2346, 2349, 2351, 2351, 2361, 2375, 2379, 2403, 2407ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2fba4e91c95e13a5881125ce4f01422f00484de0",
          "message": "Merge pull request #1451 from yamadashy/renovate/benchmark-action-github-action-benchmark-1.x\n\nchore(deps): update benchmark-action/github-action-benchmark action to v1.22.0",
          "timestamp": "2026-04-11T18:05:48+09:00",
          "tree_id": "5a990bbec811e6dcd31377375050c4bf49d15ff5",
          "url": "https://github.com/yamadashy/repomix/commit/2fba4e91c95e13a5881125ce4f01422f00484de0"
        },
        "date": 1775898474588,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1182,
            "range": "±101",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1160ms, Q3: 1261ms\nAll times: 1125, 1133, 1145, 1147, 1154, 1156, 1157, 1160, 1168, 1170, 1173, 1179, 1179, 1181, 1181, 1182, 1186, 1194, 1199, 1214, 1221, 1226, 1261, 1281, 1286, 1292, 1360, 1388, 1415, 1515ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1790,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1776ms, Q3: 1826ms\nAll times: 1749, 1750, 1756, 1760, 1774, 1776, 1779, 1780, 1785, 1787, 1790, 1794, 1795, 1798, 1824, 1826, 1831, 1840, 1847, 1860ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2396,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2374ms, Q3: 2429ms\nAll times: 2306, 2309, 2312, 2367, 2373, 2374, 2383, 2383, 2384, 2393, 2396, 2396, 2409, 2410, 2414, 2429, 2438, 2448, 2470, 2479ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9ebeb117a98073b09de84c83e0fc2cfe8a9d7cfb",
          "message": "Merge pull request #1446 from yamadashy/renovate/rhysd-actionlint-1.x\n\nchore(deps): update rhysd/actionlint action to v1.7.12",
          "timestamp": "2026-04-11T18:06:50+09:00",
          "tree_id": "294fb3453c4168a2766e84d4bca7cfa831e86723",
          "url": "https://github.com/yamadashy/repomix/commit/9ebeb117a98073b09de84c83e0fc2cfe8a9d7cfb"
        },
        "date": 1775898764655,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1140,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1111ms, Q3: 1186ms\nAll times: 1089, 1092, 1098, 1102, 1103, 1109, 1110, 1111, 1113, 1114, 1119, 1119, 1122, 1124, 1139, 1140, 1152, 1154, 1157, 1160, 1163, 1176, 1186, 1191, 1199, 1205, 1219, 1283, 1355, 1412ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1897,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1877ms, Q3: 1907ms\nAll times: 1849, 1852, 1860, 1869, 1871, 1877, 1878, 1886, 1889, 1897, 1897, 1898, 1901, 1902, 1904, 1907, 1922, 1931, 1934, 1947ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2406,
            "range": "±309",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2364ms, Q3: 2673ms\nAll times: 2339, 2345, 2352, 2354, 2356, 2364, 2365, 2368, 2382, 2405, 2406, 2421, 2447, 2552, 2634, 2673, 2819, 2956, 2966, 3020ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "247646d5c46fed0ecbef828bf500ccc4709be14d",
          "message": "Merge pull request #1449 from yamadashy/ci/perf-benchmark-auto-perf-tuning\n\nci(perf): Track perf/auto-perf-tuning benchmarks on separate gh-pages page",
          "timestamp": "2026-04-11T18:22:28+09:00",
          "tree_id": "9d25ed4156b9ca7fd9fffee7cbef893f10b87c86",
          "url": "https://github.com/yamadashy/repomix/commit/247646d5c46fed0ecbef828bf500ccc4709be14d"
        },
        "date": 1775899495724,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1329,
            "range": "±127",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1264ms, Q3: 1391ms\nAll times: 1192, 1195, 1224, 1226, 1234, 1239, 1257, 1264, 1281, 1290, 1302, 1305, 1307, 1312, 1317, 1329, 1338, 1364, 1369, 1371, 1378, 1383, 1391, 1395, 1396, 1425, 1460, 1483, 1815, 1999ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1909,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1884ms, Q3: 1926ms\nAll times: 1853, 1862, 1874, 1874, 1879, 1884, 1889, 1898, 1902, 1903, 1909, 1914, 1915, 1926, 1926, 1926, 1934, 1941, 2304, 2363ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2349,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2337ms, Q3: 2383ms\nAll times: 2289, 2306, 2321, 2322, 2333, 2337, 2337, 2340, 2340, 2345, 2349, 2354, 2363, 2367, 2367, 2383, 2398, 2398, 2407, 2436ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "97ec025f5d71944d8830b12a8a100b2ca6d7eaab",
          "message": "Merge pull request #1447 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-04-11T18:42:37+09:00",
          "tree_id": "8c5eab3248ef6d2595258b3ca8ee318c045a0060",
          "url": "https://github.com/yamadashy/repomix/commit/97ec025f5d71944d8830b12a8a100b2ca6d7eaab"
        },
        "date": 1775900676322,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1505,
            "range": "±252",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1442ms, Q3: 1694ms\nAll times: 1357, 1402, 1414, 1415, 1416, 1429, 1438, 1442, 1451, 1453, 1457, 1459, 1484, 1493, 1501, 1505, 1506, 1513, 1558, 1570, 1572, 1583, 1694, 1705, 1729, 1737, 1786, 1920, 1980, 2383ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1816,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1794ms, Q3: 1840ms\nAll times: 1761, 1783, 1784, 1787, 1792, 1794, 1800, 1801, 1802, 1810, 1816, 1816, 1825, 1832, 1840, 1840, 1849, 1856, 1870, 2140ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2309,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2301ms, Q3: 2350ms\nAll times: 2236, 2260, 2268, 2297, 2300, 2301, 2302, 2303, 2303, 2308, 2309, 2310, 2310, 2327, 2334, 2350, 2356, 2359, 2364, 2374ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5a011342d442d87c1ae6f39c5a5ed982a1fb7df5",
          "message": "Merge pull request #1453 from yamadashy/perf/security-disable-secretlint-profiler\n\nperf(security): Disable @secretlint/profiler in security worker (-6.5%)",
          "timestamp": "2026-04-11T19:12:25+09:00",
          "tree_id": "7270b996cbed130cb3eaf174eab434adaadcce06",
          "url": "https://github.com/yamadashy/repomix/commit/5a011342d442d87c1ae6f39c5a5ed982a1fb7df5"
        },
        "date": 1775902540753,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1909,
            "range": "±174",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1831ms, Q3: 2005ms\nAll times: 1698, 1751, 1780, 1782, 1805, 1822, 1827, 1831, 1833, 1835, 1839, 1844, 1853, 1873, 1909, 1909, 1913, 1913, 1914, 1938, 1971, 1992, 2005, 2017, 2067, 2078, 2140, 2209, 2524, 2757ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1909,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1871ms, Q3: 1933ms\nAll times: 1836, 1844, 1858, 1860, 1860, 1871, 1876, 1880, 1885, 1905, 1909, 1912, 1918, 1922, 1931, 1933, 1944, 2102, 2126, 2236ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2352,
            "range": "±94",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2324ms, Q3: 2418ms\nAll times: 2282, 2314, 2314, 2316, 2319, 2324, 2330, 2333, 2340, 2351, 2352, 2356, 2359, 2384, 2401, 2418, 2431, 2437, 2441, 2443ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1d02c636fb85c904c6e6b0a169838419b15187cc",
          "message": "Merge pull request #1454 from yamadashy/ci/add-codecov-test-analytics\n\nci: Enable Codecov Test Analytics and update badge token",
          "timestamp": "2026-04-11T19:42:02+09:00",
          "tree_id": "2ce83a9a9f474ecedc8b3ee1f0e1645b92183070",
          "url": "https://github.com/yamadashy/repomix/commit/1d02c636fb85c904c6e6b0a169838419b15187cc"
        },
        "date": 1775904248676,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1582,
            "range": "±400",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1339ms, Q3: 1739ms\nAll times: 1159, 1245, 1270, 1274, 1298, 1331, 1338, 1339, 1372, 1530, 1537, 1538, 1549, 1556, 1562, 1582, 1593, 1593, 1594, 1616, 1658, 1721, 1739, 1746, 1764, 1765, 1777, 1782, 1805, 1885ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1837,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1820ms, Q3: 1843ms\nAll times: 1791, 1795, 1797, 1802, 1803, 1820, 1824, 1827, 1829, 1830, 1837, 1838, 1842, 1842, 1843, 1843, 1852, 1853, 1854, 1855ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2187,
            "range": "±53",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 2159ms, Q3: 2212ms\nAll times: 2125, 2145, 2149, 2153, 2159, 2164, 2170, 2182, 2185, 2187, 2192, 2199, 2201, 2211, 2212, 2212, 2223, 2225, 2266ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9b8a46fa135972fcf81eee7784e121fea21fa909",
          "message": "Merge pull request #1456 from yamadashy/perf/security-neutralize-profiler-via-perf-hooks\n\nperf(security): Patch perf_hooks.performance.mark to neutralize duplicate @secretlint/profiler singletons",
          "timestamp": "2026-04-12T14:32:33+09:00",
          "tree_id": "60517fe20d1566b026620d79c20c15600ec69698",
          "url": "https://github.com/yamadashy/repomix/commit/9b8a46fa135972fcf81eee7784e121fea21fa909"
        },
        "date": 1775972102759,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1161,
            "range": "±89",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1142ms, Q3: 1231ms\nAll times: 1116, 1117, 1120, 1129, 1139, 1141, 1142, 1142, 1149, 1150, 1151, 1153, 1159, 1159, 1159, 1161, 1164, 1179, 1198, 1204, 1206, 1219, 1231, 1266, 1267, 1290, 1310, 1427, 1429, 2028ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1836,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1820ms, Q3: 1849ms\nAll times: 1767, 1776, 1781, 1790, 1813, 1820, 1824, 1824, 1825, 1830, 1836, 1837, 1843, 1844, 1846, 1849, 1872, 1875, 1889, 1896ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2198,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2188ms, Q3: 2253ms\nAll times: 2170, 2181, 2184, 2184, 2188, 2188, 2190, 2190, 2191, 2197, 2198, 2206, 2222, 2227, 2243, 2253, 2260, 2271, 2362, 2477ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4c356f73251746c2cc3edcc68dbe19204aa1e950",
          "message": "Merge pull request #1457 from yamadashy/perf/fast-output-tokenization\n\nperf(core): Skip redundant full-output tokenization via wrapper-extraction fast path (-13.2%)",
          "timestamp": "2026-04-13T00:20:10+09:00",
          "tree_id": "905174e4806045dbff1efb20decd1259331b2189",
          "url": "https://github.com/yamadashy/repomix/commit/4c356f73251746c2cc3edcc68dbe19204aa1e950"
        },
        "date": 1776007358656,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1520,
            "range": "±308",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1353ms, Q3: 1661ms\nAll times: 986, 1003, 1130, 1276, 1281, 1289, 1335, 1353, 1383, 1402, 1431, 1432, 1437, 1484, 1513, 1520, 1563, 1608, 1615, 1627, 1634, 1642, 1661, 1673, 1674, 1684, 1770, 2023, 2048, 2224ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1490,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1473ms, Q3: 1498ms\nAll times: 1451, 1453, 1454, 1469, 1471, 1473, 1473, 1474, 1484, 1485, 1490, 1491, 1491, 1492, 1494, 1498, 1501, 1504, 1504, 1505ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2355,
            "range": "±463",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2192ms, Q3: 2655ms\nAll times: 2154, 2156, 2161, 2164, 2175, 2192, 2215, 2224, 2268, 2342, 2355, 2578, 2595, 2630, 2641, 2655, 2657, 2688, 2726, 2818ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1c01d6951c6494ef226637bb83d5c70cd7e0716f",
          "message": "Merge pull request #1467 from yamadashy/perf/prefetch-sort-data\n\nperf(core): Prefetch git sort data to overlap with file search and collection",
          "timestamp": "2026-04-15T00:41:41+09:00",
          "tree_id": "cba49da97f353c479f12fcb5d8418cbefe43c759",
          "url": "https://github.com/yamadashy/repomix/commit/1c01d6951c6494ef226637bb83d5c70cd7e0716f"
        },
        "date": 1776181436658,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 996,
            "range": "±124",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 978ms, Q3: 1102ms\nAll times: 928, 937, 946, 955, 956, 958, 959, 978, 979, 980, 985, 988, 991, 992, 996, 996, 1008, 1032, 1036, 1041, 1048, 1071, 1102, 1114, 1125, 1184, 1189, 1206, 1234, 1250ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1637,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1623ms, Q3: 1658ms\nAll times: 1604, 1608, 1613, 1620, 1621, 1623, 1625, 1627, 1629, 1635, 1637, 1640, 1646, 1652, 1656, 1658, 1674, 1675, 1686, 1714ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1886,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1863ms, Q3: 1896ms\nAll times: 1859, 1860, 1861, 1861, 1862, 1863, 1865, 1872, 1879, 1883, 1886, 1887, 1889, 1890, 1894, 1896, 1896, 1897, 1899, 1928ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c55528df3718b5adb0952da0a72efcb7772cc482",
          "message": "Merge pull request #1469 from yamadashy/perf/reduce-module-overhead\n\nperf(core): Remove redundant minimatch and parallelize wrapper tokenization",
          "timestamp": "2026-04-15T22:24:43+09:00",
          "tree_id": "435703feb2ba6845db791f74a54749dcaf047bb4",
          "url": "https://github.com/yamadashy/repomix/commit/c55528df3718b5adb0952da0a72efcb7772cc482"
        },
        "date": 1776259633845,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1677,
            "range": "±293",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1512ms, Q3: 1805ms\nAll times: 1408, 1454, 1457, 1482, 1484, 1487, 1508, 1512, 1516, 1559, 1585, 1587, 1609, 1616, 1659, 1677, 1679, 1681, 1698, 1735, 1757, 1765, 1805, 1820, 1841, 1846, 1849, 1886, 1893, 1933ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1512,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1505ms, Q3: 1539ms\nAll times: 1458, 1477, 1495, 1497, 1503, 1505, 1506, 1506, 1507, 1509, 1512, 1519, 1528, 1528, 1530, 1539, 1545, 1546, 1560, 1570ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1987,
            "range": "±153",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1982ms, Q3: 2135ms\nAll times: 1954, 1957, 1970, 1970, 1975, 1982, 1982, 1982, 1984, 1986, 1987, 1988, 1989, 1999, 2001, 2135, 2193, 2357, 2463, 3285ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6c12e9ff2262598190372b2d18b45b3ad33954c6",
          "message": "Merge pull request #1473 from yamadashy/renovate/anthropics-claude-code-action-1.x\n\nchore(deps): update anthropics/claude-code-action action to v1.0.93",
          "timestamp": "2026-04-18T11:58:28+09:00",
          "tree_id": "68322bca770ff8960bf300d71b5f311371962681",
          "url": "https://github.com/yamadashy/repomix/commit/6c12e9ff2262598190372b2d18b45b3ad33954c6"
        },
        "date": 1776481691800,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1397,
            "range": "±254",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1287ms, Q3: 1541ms\nAll times: 1226, 1230, 1269, 1270, 1273, 1274, 1286, 1287, 1296, 1317, 1343, 1358, 1364, 1372, 1378, 1397, 1413, 1414, 1415, 1485, 1512, 1514, 1541, 1545, 1548, 1586, 1666, 1717, 1763, 1824ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1459,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1445ms, Q3: 1479ms\nAll times: 1419, 1423, 1439, 1442, 1445, 1445, 1448, 1448, 1452, 1456, 1459, 1467, 1469, 1471, 1476, 1479, 1488, 1532, 1549, 1736ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1915,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1900ms, Q3: 1928ms\nAll times: 1890, 1893, 1895, 1897, 1899, 1900, 1905, 1907, 1908, 1914, 1915, 1916, 1916, 1920, 1924, 1928, 1928, 1930, 1932, 1957ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4672679df992fca040ed189dfa9ba15731b2a519",
          "message": "Merge pull request #1479 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-04-18T12:12:34+09:00",
          "tree_id": "128a240f37733002582cc88a8fe985fa1690988a",
          "url": "https://github.com/yamadashy/repomix/commit/4672679df992fca040ed189dfa9ba15731b2a519"
        },
        "date": 1776482178045,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 947,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 917ms, Q3: 987ms\nAll times: 877, 883, 894, 907, 912, 915, 917, 917, 919, 924, 929, 936, 941, 944, 944, 947, 948, 959, 967, 971, 972, 985, 987, 994, 1016, 1030, 1035, 1040, 1048, 1052ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1542,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1527ms, Q3: 1584ms\nAll times: 1501, 1508, 1509, 1524, 1526, 1527, 1530, 1530, 1531, 1535, 1542, 1549, 1552, 1554, 1556, 1584, 1594, 1614, 1775, 1846ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1991,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1969ms, Q3: 2018ms\nAll times: 1940, 1942, 1951, 1951, 1968, 1969, 1971, 1980, 1982, 1990, 1991, 1997, 2006, 2010, 2013, 2018, 2019, 2044, 2068, 2072ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "76112c365b620e0aee63aaaba0ba266b492903e5",
          "message": "Merge pull request #1481 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-04-18T12:14:44+09:00",
          "tree_id": "ad09bd3320ede511890c20e6ed6e0f62316e9880",
          "url": "https://github.com/yamadashy/repomix/commit/76112c365b620e0aee63aaaba0ba266b492903e5"
        },
        "date": 1776482297721,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1327,
            "range": "±213",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1168ms, Q3: 1381ms\nAll times: 917, 922, 932, 943, 984, 1011, 1026, 1168, 1194, 1251, 1254, 1260, 1276, 1300, 1311, 1327, 1330, 1350, 1354, 1358, 1369, 1381, 1381, 1394, 1398, 1427, 1484, 1590, 1605, 2122ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1498,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1481ms, Q3: 1509ms\nAll times: 1460, 1474, 1476, 1478, 1480, 1481, 1483, 1493, 1495, 1497, 1498, 1498, 1505, 1505, 1507, 1509, 1514, 1516, 1525, 1592ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1792,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1777ms, Q3: 1814ms\nAll times: 1760, 1766, 1766, 1768, 1771, 1777, 1777, 1780, 1781, 1791, 1792, 1794, 1798, 1812, 1812, 1814, 1814, 1816, 1823, 1870ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "39812feecc09da9368f6c45a1424ef96321e25dc",
          "message": "Merge pull request #1486 from yamadashy/renovate/docker-login-action-4.x\n\nchore(deps): update docker/login-action action to v4.1.0",
          "timestamp": "2026-04-18T13:05:01+09:00",
          "tree_id": "2fcb3ca4b8b6b8727f12a242539d746f500c6cf7",
          "url": "https://github.com/yamadashy/repomix/commit/39812feecc09da9368f6c45a1424ef96321e25dc"
        },
        "date": 1776485357826,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1252,
            "range": "±128",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1150ms, Q3: 1278ms\nAll times: 1083, 1106, 1116, 1117, 1121, 1130, 1139, 1150, 1179, 1185, 1188, 1193, 1214, 1238, 1242, 1252, 1252, 1262, 1264, 1265, 1271, 1273, 1278, 1279, 1281, 1287, 1291, 1324, 1335, 1863ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1533,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1506ms, Q3: 1544ms\nAll times: 1491, 1495, 1495, 1504, 1504, 1506, 1519, 1520, 1528, 1531, 1533, 1535, 1535, 1536, 1543, 1544, 1547, 1548, 1550, 1652ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1879,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1856ms, Q3: 1911ms\nAll times: 1830, 1832, 1836, 1838, 1852, 1856, 1869, 1870, 1873, 1876, 1879, 1889, 1895, 1907, 1908, 1911, 1917, 1918, 1982, 2033ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8c0fb04ec943edddec457d70306a0eafa0f86be3",
          "message": "Merge pull request #1488 from yamadashy/renovate/codecov-codecov-action-6.x\n\nchore(deps): update codecov/codecov-action action to v6",
          "timestamp": "2026-04-18T15:18:35+09:00",
          "tree_id": "57cb11321b72d9d21ae1055e62b2a3203ad15d47",
          "url": "https://github.com/yamadashy/repomix/commit/8c0fb04ec943edddec457d70306a0eafa0f86be3"
        },
        "date": 1776493343500,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1199,
            "range": "±315",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1019ms, Q3: 1334ms\nAll times: 934, 965, 965, 970, 1002, 1010, 1013, 1019, 1021, 1037, 1063, 1074, 1089, 1093, 1142, 1199, 1212, 1216, 1222, 1240, 1269, 1302, 1334, 1369, 1382, 1398, 1441, 1465, 1516, 1532ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1542,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1524ms, Q3: 1573ms\nAll times: 1499, 1504, 1513, 1515, 1519, 1524, 1524, 1526, 1530, 1537, 1542, 1545, 1548, 1549, 1566, 1573, 1598, 1693, 1842, 1945ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1810,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1794ms, Q3: 1828ms\nAll times: 1783, 1787, 1790, 1791, 1794, 1794, 1797, 1799, 1805, 1806, 1810, 1814, 1815, 1816, 1818, 1828, 1832, 1834, 1838, 1881ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b8ef0ec8336415f77a9d181f36f90e5a237111a2",
          "message": "Merge pull request #1491 from yamadashy/renovate/major-scripts-major-dependencies\n\nchore(deps): update dependency typescript to v6",
          "timestamp": "2026-04-18T15:22:05+09:00",
          "tree_id": "b0c40b91473f246d5d6cb147195a5625c80f8952",
          "url": "https://github.com/yamadashy/repomix/commit/b8ef0ec8336415f77a9d181f36f90e5a237111a2"
        },
        "date": 1776493560055,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1046,
            "range": "±150",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1008ms, Q3: 1158ms\nAll times: 960, 982, 994, 997, 1005, 1007, 1008, 1008, 1013, 1018, 1026, 1033, 1040, 1041, 1045, 1046, 1069, 1075, 1098, 1106, 1117, 1127, 1158, 1164, 1169, 1184, 1205, 1239, 1243, 1313ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1517,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1511ms, Q3: 1534ms\nAll times: 1483, 1499, 1506, 1507, 1508, 1511, 1512, 1512, 1512, 1516, 1517, 1518, 1524, 1526, 1527, 1534, 1535, 1554, 1559, 1569ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2082,
            "range": "±164",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 2054ms, Q3: 2218ms\nAll times: 1997, 2033, 2036, 2050, 2051, 2054, 2068, 2069, 2071, 2077, 2082, 2087, 2097, 2145, 2200, 2218, 2237, 2254, 2256, 2395ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f2de8219ecf8a2283b38883aeffc38da980a588f",
          "message": "Merge pull request #1493 from yamadashy/feat/observability-phase2\n\nfeat(server): Log pack options and validation reject reasons",
          "timestamp": "2026-04-18T23:17:47+09:00",
          "tree_id": "e643bd20dca6c1428c334812f554f5e42269ab71",
          "url": "https://github.com/yamadashy/repomix/commit/f2de8219ecf8a2283b38883aeffc38da980a588f"
        },
        "date": 1776522000747,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1023,
            "range": "±127",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 983ms, Q3: 1110ms\nAll times: 927, 956, 959, 959, 969, 980, 982, 983, 984, 986, 989, 995, 998, 1008, 1016, 1023, 1025, 1036, 1053, 1056, 1076, 1093, 1110, 1111, 1142, 1142, 1193, 1199, 1237, 1342ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1586,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1570ms, Q3: 1592ms\nAll times: 1532, 1557, 1561, 1563, 1569, 1570, 1575, 1576, 1578, 1583, 1586, 1586, 1586, 1588, 1589, 1592, 1611, 1614, 1629, 1659ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 2008,
            "range": "±84",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1984ms, Q3: 2068ms\nAll times: 1933, 1956, 1961, 1969, 1971, 1984, 1985, 1987, 2002, 2005, 2008, 2012, 2018, 2019, 2020, 2068, 2109, 2109, 2184, 2221ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9f6d0b5bdba0d8bea746d065cb28cff2b444b1ce",
          "message": "Merge pull request #1489 from yamadashy/perf/try-valibot\n\nperf(config): Migrate configSchema from zod to valibot (experimental)",
          "timestamp": "2026-04-19T10:39:01+09:00",
          "tree_id": "3bc3369dd07cdd1654ae8481861ab5069086eb5a",
          "url": "https://github.com/yamadashy/repomix/commit/9f6d0b5bdba0d8bea746d065cb28cff2b444b1ce"
        },
        "date": 1776562947267,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 892,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 877ms, Q3: 926ms\nAll times: 838, 853, 859, 865, 866, 873, 876, 877, 877, 883, 883, 885, 887, 892, 892, 892, 893, 900, 903, 904, 909, 914, 926, 932, 934, 946, 984, 993, 1037, 1050ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1436,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1415ms, Q3: 1467ms\nAll times: 1397, 1401, 1404, 1409, 1413, 1415, 1416, 1418, 1426, 1428, 1436, 1446, 1454, 1454, 1458, 1467, 1479, 1687, 1700, 1711ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1990,
            "range": "±84",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1914ms, Q3: 1998ms\nAll times: 1858, 1864, 1871, 1877, 1898, 1914, 1915, 1929, 1947, 1975, 1990, 1991, 1992, 1993, 1996, 1998, 2031, 2054, 2235, 2433ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7f54d912d2075579619bf2649bf7361e9b92c0c7",
          "message": "Merge pull request #1495 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260412.1",
          "timestamp": "2026-04-19T21:46:51+09:00",
          "tree_id": "a72ef016cdf87081ecff758f77e1481c0e4a652e",
          "url": "https://github.com/yamadashy/repomix/commit/7f54d912d2075579619bf2649bf7361e9b92c0c7"
        },
        "date": 1776602978637,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1423,
            "range": "±503",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1057ms, Q3: 1560ms\nAll times: 941, 979, 989, 994, 996, 1000, 1050, 1057, 1161, 1222, 1252, 1306, 1322, 1382, 1398, 1423, 1451, 1461, 1471, 1531, 1531, 1542, 1560, 1571, 1621, 1647, 1742, 1800, 1818, 1879ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1497,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1481ms, Q3: 1513ms\nAll times: 1463, 1470, 1470, 1472, 1479, 1481, 1481, 1488, 1495, 1496, 1497, 1498, 1499, 1502, 1507, 1513, 1513, 1514, 1537, 1562ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1779,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1762ms, Q3: 1812ms\nAll times: 1758, 1760, 1761, 1762, 1762, 1762, 1763, 1769, 1774, 1775, 1779, 1784, 1786, 1788, 1788, 1812, 1812, 1812, 1815, 1818ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "caf871270fc0c4ed4ccf3ff96755c282a176106c",
          "message": "Merge pull request #1494 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260412.1",
          "timestamp": "2026-04-19T21:47:11+09:00",
          "tree_id": "939808800c78db80ad0db8ffb492bff2b717c3f0",
          "url": "https://github.com/yamadashy/repomix/commit/caf871270fc0c4ed4ccf3ff96755c282a176106c"
        },
        "date": 1776603112718,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1484,
            "range": "±189",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1404ms, Q3: 1593ms\nAll times: 1318, 1332, 1360, 1379, 1387, 1400, 1401, 1404, 1422, 1429, 1441, 1448, 1451, 1476, 1478, 1484, 1508, 1509, 1516, 1545, 1554, 1586, 1593, 1609, 1622, 1628, 1644, 1687, 1711, 2405ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1495,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1485ms, Q3: 1521ms\nAll times: 1448, 1449, 1460, 1474, 1484, 1485, 1486, 1489, 1492, 1494, 1495, 1496, 1499, 1505, 1516, 1521, 1525, 1526, 1535, 1728ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1489,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1472ms, Q3: 1493ms\nAll times: 1459, 1459, 1460, 1463, 1471, 1472, 1477, 1478, 1478, 1483, 1489, 1489, 1490, 1490, 1491, 1493, 1496, 1500, 1502, 1507ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6dc0b0d446074771f9a1f1f7e2cffbac470dc137",
          "message": "Merge pull request #1497 from yamadashy/refactor/website-server-valibot\n\nrefactor(server): Migrate request validation from zod to valibot",
          "timestamp": "2026-04-19T22:46:59+09:00",
          "tree_id": "189208a3ecb34e596c518fe9bedd60c7d1f9305c",
          "url": "https://github.com/yamadashy/repomix/commit/6dc0b0d446074771f9a1f1f7e2cffbac470dc137"
        },
        "date": 1776606547386,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1568,
            "range": "±324",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1436ms, Q3: 1760ms\nAll times: 1299, 1345, 1370, 1384, 1404, 1414, 1426, 1436, 1456, 1492, 1525, 1542, 1542, 1561, 1567, 1568, 1593, 1600, 1620, 1644, 1714, 1733, 1760, 1777, 1787, 1812, 1896, 1960, 2008, 3014ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1522,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1497ms, Q3: 1535ms\nAll times: 1469, 1472, 1473, 1479, 1481, 1497, 1503, 1505, 1507, 1519, 1522, 1523, 1526, 1527, 1529, 1535, 1571, 1618, 1760, 1786ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1714,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1705ms, Q3: 1727ms\nAll times: 1684, 1686, 1692, 1697, 1705, 1709, 1709, 1710, 1711, 1714, 1716, 1718, 1719, 1719, 1727, 1730, 1755, 1758, 1768ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "27016d0784e920bcf97a2af1a1c9495ca6148c98",
          "message": "Merge pull request #1504 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-707cc257f8\n\nchore(deps-dev): Bump @xmldom/xmldom from 0.9.9 to 0.9.10 in the npm_and_yarn group across 1 directory",
          "timestamp": "2026-04-24T00:19:06+09:00",
          "tree_id": "e0309a2e5ed85e0e294fc6b6ad2ede1e536b59df",
          "url": "https://github.com/yamadashy/repomix/commit/27016d0784e920bcf97a2af1a1c9495ca6148c98"
        },
        "date": 1776957746269,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1145,
            "range": "±314",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 987ms, Q3: 1301ms\nAll times: 899, 914, 946, 951, 959, 973, 984, 987, 987, 1013, 1026, 1038, 1083, 1100, 1108, 1145, 1198, 1227, 1244, 1247, 1261, 1273, 1301, 1315, 1322, 1367, 1465, 1499, 1540, 1541ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1424,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1410ms, Q3: 1433ms\nAll times: 1397, 1403, 1403, 1403, 1404, 1410, 1415, 1415, 1416, 1422, 1424, 1427, 1428, 1432, 1432, 1433, 1437, 1445, 1446, 1456ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1877,
            "range": "±94",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1862ms, Q3: 1956ms\nAll times: 1817, 1822, 1850, 1860, 1862, 1862, 1872, 1873, 1875, 1877, 1893, 1926, 1933, 1935, 1956, 1961, 1968, 1990, 2274ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bb605a7067bd1557ceebda01e0add9c592a7b8eb",
          "message": "Merge pull request #1509 from yamadashy/renovate/homebrew-actions-digest\n\nchore(deps): update homebrew/actions digest to f1cc9df",
          "timestamp": "2026-04-25T18:16:01+09:00",
          "tree_id": "e621d60ea995ae9b0a28ecde4c0753b18f23b75b",
          "url": "https://github.com/yamadashy/repomix/commit/bb605a7067bd1557ceebda01e0add9c592a7b8eb"
        },
        "date": 1777108728286,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 875,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 858ms, Q3: 907ms\nAll times: 839, 843, 852, 852, 852, 855, 856, 858, 860, 866, 867, 869, 870, 872, 875, 875, 880, 880, 889, 902, 904, 906, 907, 911, 927, 929, 938, 955, 964, 1056ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1487,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1477ms, Q3: 1504ms\nAll times: 1470, 1471, 1474, 1474, 1477, 1477, 1479, 1482, 1485, 1485, 1487, 1495, 1496, 1501, 1503, 1504, 1511, 1512, 1519, 1567ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1810,
            "range": "±118",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1772ms, Q3: 1890ms\nAll times: 1760, 1762, 1764, 1767, 1771, 1772, 1777, 1778, 1792, 1801, 1810, 1812, 1822, 1828, 1879, 1890, 1913, 1951, 2023, 2072ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ed18a8c54458879766a62ea964ee692f76c7bd6a",
          "message": "Merge pull request #1512 from yamadashy/renovate/crate-ci-typos-1.x\n\nchore(deps): update crate-ci/typos action to v1.45.1",
          "timestamp": "2026-04-25T18:16:49+09:00",
          "tree_id": "1f4cacd2a14b3b2bb9109f2655ef610ff3ef03ff",
          "url": "https://github.com/yamadashy/repomix/commit/ed18a8c54458879766a62ea964ee692f76c7bd6a"
        },
        "date": 1777108897499,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1276,
            "range": "±314",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1094ms, Q3: 1408ms\nAll times: 986, 992, 1014, 1025, 1032, 1050, 1085, 1094, 1095, 1153, 1159, 1183, 1219, 1235, 1255, 1276, 1281, 1350, 1383, 1389, 1391, 1405, 1408, 1432, 1524, 1537, 1637, 1663, 1681, 1702ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1391,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1382ms, Q3: 1410ms\nAll times: 1372, 1373, 1377, 1379, 1382, 1382, 1382, 1386, 1387, 1390, 1391, 1393, 1394, 1396, 1405, 1410, 1422, 1424, 1434, 1437ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1875,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1868ms, Q3: 1882ms\nAll times: 1848, 1853, 1861, 1866, 1866, 1868, 1869, 1870, 1871, 1873, 1875, 1875, 1880, 1881, 1881, 1882, 1887, 1894, 1897, 1899ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3ea06cb1080fa18ad421b4886f7e5deba06998cb",
          "message": "Merge pull request #1513 from yamadashy/dependabot/npm_and_yarn/browser/npm_and_yarn-87d6b5a2fd\n\nchore(deps): Bump the npm_and_yarn group across 2 directories with 1 update",
          "timestamp": "2026-04-25T20:07:33+09:00",
          "tree_id": "d387086ba4496e01b616543a304cfa0fd133a83f",
          "url": "https://github.com/yamadashy/repomix/commit/3ea06cb1080fa18ad421b4886f7e5deba06998cb"
        },
        "date": 1777115409424,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1429,
            "range": "±181",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1354ms, Q3: 1535ms\nAll times: 1249, 1298, 1306, 1334, 1334, 1345, 1347, 1354, 1356, 1374, 1395, 1398, 1417, 1417, 1428, 1429, 1455, 1456, 1467, 1470, 1515, 1530, 1535, 1573, 1575, 1594, 1605, 1631, 1735, 1791ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1470,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1466ms, Q3: 1530ms\nAll times: 1437, 1439, 1448, 1459, 1466, 1466, 1467, 1467, 1467, 1470, 1470, 1471, 1495, 1495, 1525, 1530, 1535, 1603, 1726, 1836ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1754,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1744ms, Q3: 1784ms\nAll times: 1720, 1724, 1728, 1737, 1737, 1744, 1747, 1748, 1751, 1753, 1754, 1754, 1760, 1764, 1779, 1784, 1787, 1787, 1803, 1803ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "054b9c930fb2c818fb20457ae4713827bb3e4266",
          "message": "Merge pull request #1506 from yamadashy/claude/determined-mayer-TP4HF\n\nperf(core): Automated performance tuning by Claude",
          "timestamp": "2026-04-26T17:02:38+09:00",
          "tree_id": "27ff96d1886586b80e5db0b0f270ae49f767fd0c",
          "url": "https://github.com/yamadashy/repomix/commit/054b9c930fb2c818fb20457ae4713827bb3e4266"
        },
        "date": 1777190665044,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 921,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 901ms, Q3: 942ms\nAll times: 883, 884, 889, 892, 897, 898, 898, 901, 905, 906, 907, 908, 911, 912, 914, 921, 924, 931, 932, 936, 937, 938, 942, 945, 952, 973, 997, 1053, 1180, 1232ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1351,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1344ms, Q3: 1363ms\nAll times: 1326, 1333, 1338, 1339, 1343, 1344, 1347, 1347, 1348, 1349, 1351, 1353, 1355, 1357, 1361, 1363, 1367, 1378, 1477, 1606ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1762,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1753ms, Q3: 1777ms\nAll times: 1734, 1735, 1744, 1745, 1750, 1753, 1755, 1756, 1758, 1760, 1762, 1764, 1775, 1775, 1777, 1777, 1780, 1784, 1793, 1795ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1dd7082779810d4692807aec63196aad35d83b62",
          "message": "Merge pull request #1500 from yamadashy/perf/extract-token-encodings\n\nperf(config): Extract TOKEN_ENCODINGS to avoid gpt-tokenizer load at startup",
          "timestamp": "2026-04-26T18:19:42+09:00",
          "tree_id": "3665ef1d3a596221159195d8b8e005e1ae51df27",
          "url": "https://github.com/yamadashy/repomix/commit/1dd7082779810d4692807aec63196aad35d83b62"
        },
        "date": 1777195335302,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 862,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 846ms, Q3: 873ms\nAll times: 826, 828, 833, 833, 834, 837, 845, 846, 846, 848, 848, 856, 857, 858, 860, 862, 863, 863, 864, 864, 866, 873, 873, 874, 881, 885, 909, 921, 939, 1024ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1445,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1427ms, Q3: 1450ms\nAll times: 1390, 1411, 1422, 1424, 1426, 1427, 1428, 1440, 1441, 1442, 1445, 1446, 1446, 1448, 1448, 1450, 1456, 1473, 1477, 1572ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1867,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1849ms, Q3: 1963ms\nAll times: 1813, 1826, 1839, 1844, 1849, 1851, 1854, 1865, 1867, 1867, 1887, 1890, 1897, 1900, 1963, 1964, 2394, 2403, 2627ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "28b57679262ee6816d8f937dc87e70369e84ff44",
          "message": "Merge pull request #1516 from yamadashy/claude/sleepy-tesla-vUjfm\n\nperf(core): Automated performance tuning by Claude",
          "timestamp": "2026-04-26T18:41:58+09:00",
          "tree_id": "72fabf0e3792edffa560070757abd7c5378e9340",
          "url": "https://github.com/yamadashy/repomix/commit/28b57679262ee6816d8f937dc87e70369e84ff44"
        },
        "date": 1777196634075,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 819,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 805ms, Q3: 838ms\nAll times: 788, 790, 792, 796, 802, 803, 805, 805, 809, 811, 812, 814, 816, 817, 818, 819, 820, 823, 829, 829, 834, 837, 838, 842, 845, 854, 909, 936, 972, 1292ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1062,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1045ms, Q3: 1070ms\nAll times: 1023, 1034, 1037, 1038, 1040, 1045, 1048, 1055, 1056, 1056, 1062, 1063, 1066, 1067, 1068, 1070, 1080, 1080, 1096, 1206ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1370,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1362ms, Q3: 1384ms\nAll times: 1348, 1355, 1360, 1360, 1361, 1362, 1363, 1365, 1368, 1369, 1370, 1373, 1378, 1381, 1381, 1384, 1386, 1389, 1400, 1425ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "458fd8fc6ea4016eac0595586f1ccd537d7c9e28",
          "message": "Merge pull request #1518 from yamadashy/test/improve-coverage\n\ntest: Raise overall coverage from 87.9% to 90.1%",
          "timestamp": "2026-04-26T23:02:31+09:00",
          "tree_id": "8085288796d11de3e3e3542ca62917706dbee7c6",
          "url": "https://github.com/yamadashy/repomix/commit/458fd8fc6ea4016eac0595586f1ccd537d7c9e28"
        },
        "date": 1777212284337,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 830,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 816ms, Q3: 886ms\nAll times: 806, 806, 808, 810, 812, 815, 815, 816, 818, 821, 822, 825, 827, 828, 829, 830, 833, 833, 837, 843, 869, 880, 886, 897, 925, 937, 981, 982, 1006, 1167ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1371,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1366ms, Q3: 1381ms\nAll times: 1350, 1355, 1361, 1364, 1365, 1366, 1369, 1369, 1370, 1370, 1371, 1374, 1375, 1376, 1378, 1381, 1388, 1393, 1400, 1483ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1689,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1681ms, Q3: 1722ms\nAll times: 1656, 1666, 1675, 1678, 1681, 1681, 1687, 1687, 1689, 1689, 1689, 1716, 1719, 1719, 1719, 1722, 1735, 1739, 1749, 1775ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "7dfd2b96657cc88ff60b8ec1fd88b467aa1f8aba",
          "message": "1.14.0",
          "timestamp": "2026-04-26T23:04:36+09:00",
          "tree_id": "32caaa33ce128e019313d6503d78fe49367f33c5",
          "url": "https://github.com/yamadashy/repomix/commit/7dfd2b96657cc88ff60b8ec1fd88b467aa1f8aba"
        },
        "date": 1777212421020,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 875,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 845ms, Q3: 891ms\nAll times: 829, 834, 837, 837, 840, 841, 843, 845, 846, 854, 854, 856, 860, 862, 870, 875, 880, 884, 887, 887, 888, 891, 891, 901, 905, 954, 1047, 1058, 1111, 1279ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1405,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1390ms, Q3: 1420ms\nAll times: 1372, 1373, 1381, 1386, 1389, 1390, 1391, 1395, 1399, 1405, 1405, 1408, 1409, 1412, 1416, 1420, 1422, 1442, 1443, 1448ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1787,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1784ms, Q3: 1809ms\nAll times: 1776, 1777, 1779, 1780, 1783, 1784, 1784, 1785, 1786, 1786, 1787, 1793, 1794, 1799, 1808, 1809, 1812, 1818, 1821, 1875ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "403f4b816eda94fe33a1f7b76eb93b7f61b59ca1",
          "message": "Merge pull request #1523 from yamadashy/docs/release-v1.14.0\n\ndocs(release): Add v1.14.0 release notes",
          "timestamp": "2026-04-30T00:00:26+09:00",
          "tree_id": "8fdaf42e85abd03f0ce79a6495d21cc086690feb",
          "url": "https://github.com/yamadashy/repomix/commit/403f4b816eda94fe33a1f7b76eb93b7f61b59ca1"
        },
        "date": 1777474937706,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 959,
            "range": "±137",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 921ms, Q3: 1058ms\nAll times: 834, 877, 878, 893, 916, 919, 921, 921, 922, 926, 927, 928, 945, 950, 954, 959, 974, 980, 988, 1001, 1008, 1026, 1058, 1102, 1156, 1159, 1167, 1188, 1301, 1361ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1469,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1445ms, Q3: 1489ms\nAll times: 1426, 1427, 1431, 1433, 1442, 1445, 1446, 1448, 1456, 1459, 1469, 1476, 1479, 1485, 1487, 1489, 1498, 1512, 1518, 1534ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1757,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1748ms, Q3: 1764ms\nAll times: 1723, 1733, 1734, 1743, 1745, 1748, 1748, 1750, 1751, 1757, 1757, 1758, 1759, 1760, 1763, 1764, 1768, 1775, 1788, 1796ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "758ab51bac0bbca668e073982f3eef423173a8f0",
          "message": "Merge pull request #1521 from yamadashy/claude/sleepy-tesla-LdYQq\n\nperf(core): Automated performance tuning by Claude",
          "timestamp": "2026-04-30T00:46:07+09:00",
          "tree_id": "5a02c96a3f72c02f459aaf39b1f5b2e46979fb50",
          "url": "https://github.com/yamadashy/repomix/commit/758ab51bac0bbca668e073982f3eef423173a8f0"
        },
        "date": 1777477756656,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 982,
            "range": "±196",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 867ms, Q3: 1063ms\nAll times: 844, 846, 848, 851, 861, 863, 867, 867, 871, 875, 876, 902, 935, 955, 962, 982, 987, 1014, 1020, 1032, 1040, 1059, 1063, 1072, 1099, 1115, 1141, 1152, 1194, 1224ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1490,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1477ms, Q3: 1503ms\nAll times: 1455, 1461, 1471, 1471, 1475, 1477, 1478, 1481, 1483, 1487, 1490, 1496, 1497, 1497, 1501, 1503, 1507, 1509, 1511, 1511ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1756,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1721ms, Q3: 1767ms\nAll times: 1708, 1709, 1714, 1715, 1716, 1721, 1730, 1746, 1749, 1750, 1756, 1761, 1762, 1763, 1766, 1767, 1775, 1779, 1802, 1806ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "253b95fba5a7117ebfbee5147a4861746459aad6",
          "message": "Merge pull request #1525 from yamadashy/feat/nix-flake-devshell\n\nfeat(nix): Add Nix flake with development shell",
          "timestamp": "2026-05-01T00:41:32+09:00",
          "tree_id": "d94fd2a6bab89f43b201cc6132c3dc7ddf64894c",
          "url": "https://github.com/yamadashy/repomix/commit/253b95fba5a7117ebfbee5147a4861746459aad6"
        },
        "date": 1777563855321,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 907,
            "range": "±178",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 850ms, Q3: 1028ms\nAll times: 816, 817, 833, 843, 845, 845, 848, 850, 851, 855, 866, 870, 872, 874, 887, 907, 909, 914, 930, 955, 997, 1019, 1028, 1047, 1064, 1070, 1081, 1098, 1113, 1199ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1407,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1391ms, Q3: 1425ms\nAll times: 1353, 1368, 1371, 1384, 1389, 1391, 1400, 1401, 1403, 1405, 1407, 1411, 1415, 1421, 1423, 1425, 1429, 1440, 1443, 1631ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1743,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1729ms, Q3: 1757ms\nAll times: 1706, 1723, 1727, 1727, 1729, 1730, 1731, 1733, 1739, 1743, 1747, 1749, 1750, 1752, 1757, 1759, 1763, 1764, 1765ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1dcbd51abecde6afe95ef1140a0265cf2542b559",
          "message": "Merge pull request #1529 from yamadashy/renovate/homebrew-actions-digest\n\nchore(deps): update homebrew/actions digest to 51347a6",
          "timestamp": "2026-05-02T11:04:55+09:00",
          "tree_id": "575678320625fc93ea9ad49fac791bb752d528a8",
          "url": "https://github.com/yamadashy/repomix/commit/1dcbd51abecde6afe95ef1140a0265cf2542b559"
        },
        "date": 1777687807307,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1003,
            "range": "±234",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 904ms, Q3: 1138ms\nAll times: 844, 847, 868, 880, 886, 893, 894, 904, 915, 926, 935, 946, 946, 954, 990, 1003, 1009, 1010, 1018, 1064, 1098, 1136, 1138, 1140, 1171, 1176, 1182, 1192, 1207, 1255ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1370,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1353ms, Q3: 1380ms\nAll times: 1341, 1347, 1347, 1351, 1352, 1353, 1356, 1357, 1361, 1368, 1370, 1370, 1372, 1373, 1373, 1380, 1387, 1411, 1414, 1430ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1315,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1300ms, Q3: 1322ms\nAll times: 1290, 1296, 1296, 1299, 1299, 1300, 1304, 1309, 1310, 1312, 1315, 1316, 1316, 1318, 1321, 1322, 1326, 1333, 1334, 1353ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3d606eabb8cce38953cc3c7a0ab6705bbb841b33",
          "message": "Merge pull request #1532 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-05-02T11:05:59+09:00",
          "tree_id": "cec232e9ea931e5c5d231658a2539748d1da30ed",
          "url": "https://github.com/yamadashy/repomix/commit/3d606eabb8cce38953cc3c7a0ab6705bbb841b33"
        },
        "date": 1777687942775,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 797,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 788ms, Q3: 805ms\nAll times: 765, 768, 775, 776, 781, 782, 784, 788, 789, 790, 792, 792, 792, 793, 794, 797, 801, 802, 802, 802, 804, 804, 805, 812, 814, 816, 860, 896, 898, 917ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1394,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1385ms, Q3: 1416ms\nAll times: 1362, 1373, 1379, 1380, 1384, 1385, 1392, 1392, 1393, 1393, 1394, 1397, 1407, 1408, 1413, 1416, 1421, 1429, 1436, 1470ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1823,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1806ms, Q3: 1847ms\nAll times: 1794, 1800, 1801, 1804, 1804, 1806, 1810, 1816, 1817, 1821, 1823, 1835, 1844, 1846, 1846, 1847, 1851, 1857, 1880, 1886ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3fbe25f30e1d599a46695b4951fa419e1b52761d",
          "message": "Merge pull request #1535 from yamadashy/renovate/github-codeql-action-4.x\n\nchore(deps): update github/codeql-action action to v4.35.2",
          "timestamp": "2026-05-03T15:16:19+09:00",
          "tree_id": "29950cbca0d5b4fff670d66a1aea956214c61946",
          "url": "https://github.com/yamadashy/repomix/commit/3fbe25f30e1d599a46695b4951fa419e1b52761d"
        },
        "date": 1777789230401,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 5181,
            "range": "±1641",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 4018ms, Q3: 5659ms\nAll times: 3300, 3364, 3499, 3602, 3782, 3815, 4013, 4018, 4199, 4246, 4348, 4591, 4725, 5114, 5164, 5181, 5259, 5299, 5424, 5538, 5547, 5550, 5659, 6010, 6138, 6189, 6309, 6334, 6515, 7152ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 4392,
            "range": "±350",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 4086ms, Q3: 4436ms\nAll times: 4011, 4059, 4067, 4074, 4077, 4086, 4089, 4090, 4094, 4112, 4392, 4403, 4419, 4422, 4430, 4436, 4446, 4455, 4484, 4486ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1849,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1835ms, Q3: 1863ms\nAll times: 1819, 1823, 1825, 1832, 1832, 1835, 1836, 1841, 1843, 1844, 1849, 1854, 1857, 1859, 1859, 1863, 1874, 1877, 1881, 1887ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "afd329561fd889265f173fad40cb4a9e149bbe34",
          "message": "Merge pull request #1536 from yamadashy/chore/mark-skills-internal\n\nchore(skills): Mark agent-memory and contextual-commit as internal",
          "timestamp": "2026-05-03T15:43:06+09:00",
          "tree_id": "2d496ca7038384c8fa998775d3e2ceb6b01c0338",
          "url": "https://github.com/yamadashy/repomix/commit/afd329561fd889265f173fad40cb4a9e149bbe34"
        },
        "date": 1777790763083,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 4034,
            "range": "±1807",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2952ms, Q3: 4759ms\nAll times: 2225, 2248, 2276, 2422, 2578, 2730, 2819, 2952, 3373, 3475, 3782, 3810, 3844, 3870, 4018, 4034, 4170, 4180, 4280, 4295, 4490, 4642, 4759, 5226, 5469, 5527, 5673, 6214, 6672, 6748ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 4077,
            "range": "±351",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 4030ms, Q3: 4381ms\nAll times: 3995, 4005, 4009, 4018, 4021, 4030, 4039, 4060, 4062, 4066, 4077, 4337, 4359, 4365, 4370, 4381, 4391, 4394, 4414, 4443ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1875,
            "range": "±137",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1842ms, Q3: 1979ms\nAll times: 1812, 1822, 1829, 1829, 1837, 1842, 1852, 1856, 1857, 1875, 1875, 1899, 1940, 1945, 1948, 1979, 2124, 2284, 2341, 2405ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b743c9659c81b5229a56df672221ea17f3c3bbdb",
          "message": "Merge pull request #1543 from yamadashy/chore/codex-review-loop-command\n\nchore(agents): Add codex-review-loop command",
          "timestamp": "2026-05-05T16:22:31+09:00",
          "tree_id": "7ca2cc36fe32048c8cb1321fbd3d94202f966783",
          "url": "https://github.com/yamadashy/repomix/commit/b743c9659c81b5229a56df672221ea17f3c3bbdb"
        },
        "date": 1777965935633,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 3670,
            "range": "±1533",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 2899ms, Q3: 4432ms\nAll times: 2198, 2301, 2306, 2348, 2447, 2455, 2713, 2899, 3000, 3030, 3099, 3293, 3431, 3484, 3533, 3670, 3862, 3870, 3902, 4046, 4104, 4411, 4432, 4624, 4894, 4962, 5330, 7083, 7125, 7469ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 4405,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 4389ms, Q3: 4423ms\nAll times: 4304, 4336, 4371, 4371, 4375, 4389, 4395, 4402, 4402, 4402, 4405, 4408, 4415, 4418, 4419, 4423, 4428, 4430, 4442, 4449ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1788,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1779ms, Q3: 1801ms\nAll times: 1746, 1757, 1759, 1771, 1771, 1779, 1780, 1783, 1785, 1786, 1788, 1795, 1797, 1797, 1799, 1801, 1828, 1854, 2103, 2285ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7df0b1ba913a10786027625094f342eee69e9ca3",
          "message": "Merge pull request #1542 from yamadashy/perf/isbinaryfile-utf8-fastpath\n\nperf(file): Try UTF-8 decode before isBinaryFile to dodge protobuf-detector pathological case",
          "timestamp": "2026-05-06T00:28:16+09:00",
          "tree_id": "3c17b24da237868643088fcf5c83363ddaf34de6",
          "url": "https://github.com/yamadashy/repomix/commit/7df0b1ba913a10786027625094f342eee69e9ca3"
        },
        "date": 1777995055554,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 953,
            "range": "±136",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 923ms, Q3: 1059ms\nAll times: 868, 869, 871, 880, 884, 893, 919, 923, 924, 925, 929, 941, 942, 944, 951, 953, 961, 981, 1010, 1017, 1025, 1027, 1059, 1066, 1089, 1102, 1112, 1120, 1130, 1135ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1371,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1361ms, Q3: 1385ms\nAll times: 1336, 1339, 1349, 1355, 1361, 1361, 1366, 1366, 1367, 1369, 1371, 1375, 1378, 1379, 1382, 1385, 1387, 1395, 1398, 1401ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1885,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1868ms, Q3: 1920ms\nAll times: 1839, 1841, 1851, 1859, 1863, 1868, 1872, 1877, 1880, 1885, 1885, 1888, 1900, 1900, 1912, 1920, 1921, 1926, 1957, 1988ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "55f43dedfdffe27a205fea4d46c72042ba6aacb2",
          "message": "Merge pull request #1534 from yamadashy/renovate/scripts-non-major-dependencies\n\nchore(deps): update dependency typescript to ^6.0.3",
          "timestamp": "2026-05-06T00:48:26+09:00",
          "tree_id": "b25fd0248c063a34531eb527e54ded121bab5208",
          "url": "https://github.com/yamadashy/repomix/commit/55f43dedfdffe27a205fea4d46c72042ba6aacb2"
        },
        "date": 1777996223198,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1032,
            "range": "±151",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 987ms, Q3: 1138ms\nAll times: 918, 933, 935, 948, 958, 962, 964, 987, 991, 992, 1002, 1002, 1008, 1012, 1026, 1032, 1034, 1055, 1075, 1085, 1104, 1134, 1138, 1152, 1161, 1194, 1231, 1301, 1309, 1523ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1439,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1417ms, Q3: 1459ms\nAll times: 1390, 1404, 1411, 1413, 1415, 1417, 1419, 1433, 1435, 1436, 1439, 1440, 1449, 1452, 1457, 1459, 1482, 1499, 1510, 1524ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1712,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1693ms, Q3: 1728ms\nAll times: 1670, 1674, 1676, 1684, 1693, 1693, 1698, 1699, 1699, 1708, 1712, 1721, 1722, 1722, 1726, 1728, 1741, 1742, 1754, 1782ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b99706131b26b68e0d72aab7f93fccebad1460c0",
          "message": "Merge pull request #1515 from yamadashy/feat/dart-extra-definitions\n\nfeat(core): Capture mixin, typedef, getter, setter, and factory in Dart query",
          "timestamp": "2026-05-06T22:28:35+09:00",
          "tree_id": "01b750aa212658cce3cbc004558584657d90cd08",
          "url": "https://github.com/yamadashy/repomix/commit/b99706131b26b68e0d72aab7f93fccebad1460c0"
        },
        "date": 1778074242895,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 830,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 814ms, Q3: 847ms\nAll times: 792, 796, 798, 801, 802, 805, 812, 814, 814, 817, 820, 820, 824, 827, 828, 830, 831, 831, 836, 842, 846, 847, 847, 852, 859, 877, 905, 935, 1078, 1152ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1400,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1395ms, Q3: 1413ms\nAll times: 1376, 1377, 1379, 1386, 1386, 1395, 1395, 1398, 1400, 1400, 1400, 1403, 1403, 1408, 1410, 1413, 1417, 1430, 1435, 1437ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1706,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1697ms, Q3: 1713ms\nAll times: 1678, 1690, 1693, 1693, 1696, 1697, 1701, 1704, 1705, 1706, 1706, 1708, 1708, 1711, 1712, 1713, 1716, 1723, 1726, 1728ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4caea59b2a967d6f6cb21b17d194dbd6f967464a",
          "message": "Merge pull request #1556 from yamadashy/feat/drop-node-20-add-26\n\nchore(deps): Drop Node.js 20, add Node.js 26 support",
          "timestamp": "2026-05-09T21:16:27+09:00",
          "tree_id": "02892aec790a5d71524c7039b9deb43b1eaee428",
          "url": "https://github.com/yamadashy/repomix/commit/4caea59b2a967d6f6cb21b17d194dbd6f967464a"
        },
        "date": 1778329143665,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1103,
            "range": "±336",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 988ms, Q3: 1324ms\nAll times: 927, 946, 947, 958, 959, 972, 974, 988, 999, 1009, 1012, 1014, 1037, 1082, 1100, 1103, 1118, 1148, 1161, 1190, 1221, 1233, 1324, 1332, 1343, 1445, 1446, 1470, 1477, 1628ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1415,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1406ms, Q3: 1438ms\nAll times: 1377, 1390, 1392, 1394, 1395, 1406, 1407, 1412, 1412, 1414, 1415, 1422, 1429, 1429, 1432, 1438, 1438, 1441, 1458, 1505ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1686,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1676ms, Q3: 1696ms\nAll times: 1658, 1664, 1665, 1669, 1674, 1676, 1682, 1683, 1684, 1685, 1686, 1686, 1689, 1691, 1692, 1696, 1697, 1700, 1710, 1716ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d443d16b72a71788b2b030eb484270fae4be9a36",
          "message": "Merge pull request #1553 from yamadashy/renovate/anthropics-claude-code-action-1.x\n\nchore(deps): update anthropics/claude-code-action action to v1.0.111",
          "timestamp": "2026-05-09T21:19:02+09:00",
          "tree_id": "d8d6c62ed671c19bd0aa896bf82fa4066c2a571f",
          "url": "https://github.com/yamadashy/repomix/commit/d443d16b72a71788b2b030eb484270fae4be9a36"
        },
        "date": 1778329561305,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1066,
            "range": "±230",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 935ms, Q3: 1165ms\nAll times: 862, 872, 880, 888, 906, 918, 932, 935, 941, 955, 978, 1017, 1041, 1043, 1044, 1066, 1097, 1099, 1103, 1105, 1135, 1154, 1165, 1197, 1218, 1219, 1227, 1252, 1264, 1373ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1471,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1465ms, Q3: 1489ms\nAll times: 1438, 1439, 1453, 1455, 1457, 1465, 1465, 1467, 1468, 1469, 1471, 1478, 1478, 1483, 1489, 1489, 1499, 1501, 1522, 1523ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1769,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1756ms, Q3: 1787ms\nAll times: 1729, 1744, 1745, 1747, 1751, 1756, 1759, 1762, 1762, 1767, 1769, 1772, 1773, 1781, 1784, 1787, 1794, 1800, 1813, 1841ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "60c1721d043bdffe7c2ec68dacb098290e66098a",
          "message": "Merge pull request #1555 from yamadashy/renovate/github-codeql-action-4.x\n\nchore(deps): update github/codeql-action action to v4.35.3",
          "timestamp": "2026-05-09T21:19:50+09:00",
          "tree_id": "d51b9aaf8101e55ac9cc6f7372fc4261a6f2e116",
          "url": "https://github.com/yamadashy/repomix/commit/60c1721d043bdffe7c2ec68dacb098290e66098a"
        },
        "date": 1778329744507,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 872,
            "range": "±92",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 852ms, Q3: 944ms\nAll times: 818, 823, 829, 844, 845, 845, 851, 852, 852, 854, 859, 862, 863, 863, 870, 872, 876, 879, 880, 880, 912, 923, 944, 952, 972, 975, 976, 1015, 1042, 1137ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1453,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1444ms, Q3: 1481ms\nAll times: 1404, 1408, 1438, 1439, 1442, 1444, 1447, 1447, 1449, 1450, 1453, 1464, 1465, 1466, 1470, 1481, 1497, 1502, 1516, 1525ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1715,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1693ms, Q3: 1730ms\nAll times: 1663, 1679, 1684, 1686, 1688, 1693, 1703, 1706, 1707, 1708, 1715, 1716, 1718, 1720, 1722, 1730, 1740, 1817, 1900, 2237ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "daa7ff3e2b5dc92c5e52781982689ad73f1e8d36",
          "message": "Merge pull request #1558 from yamadashy/chore/renovate-group-github-actions\n\nchore(renovate): Group GitHub Actions, Dockerfile, and Nix updates",
          "timestamp": "2026-05-10T01:02:30+09:00",
          "tree_id": "0500dfca24e09dcac988d9f24bcb2dbf49f1c6e4",
          "url": "https://github.com/yamadashy/repomix/commit/daa7ff3e2b5dc92c5e52781982689ad73f1e8d36"
        },
        "date": 1778342653154,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 994,
            "range": "±107",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 955ms, Q3: 1062ms\nAll times: 869, 886, 887, 906, 906, 936, 948, 955, 956, 959, 971, 972, 974, 992, 992, 994, 1000, 1004, 1008, 1035, 1043, 1044, 1062, 1094, 1112, 1130, 1198, 1200, 1224, 1461ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1304,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1297ms, Q3: 1315ms\nAll times: 1268, 1279, 1286, 1289, 1291, 1297, 1300, 1301, 1302, 1303, 1304, 1305, 1309, 1312, 1314, 1315, 1320, 1321, 1322, 1335ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1365,
            "range": "±39",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1357ms, Q3: 1396ms\nAll times: 1334, 1344, 1354, 1355, 1357, 1357, 1358, 1362, 1365, 1365, 1369, 1376, 1384, 1386, 1396, 1396, 1418, 1427, 1433ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1eb0358548572e3402ec3b22e0fe6d4f288dfcbd",
          "message": "Merge pull request #1549 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-789b1e4b46\n\nchore(deps): Bump the npm_and_yarn group across 3 directories with 3 updates",
          "timestamp": "2026-05-10T14:47:18+09:00",
          "tree_id": "5528b80f8770993279dd465b717ca73bb43204d5",
          "url": "https://github.com/yamadashy/repomix/commit/1eb0358548572e3402ec3b22e0fe6d4f288dfcbd"
        },
        "date": 1778392176110,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 996,
            "range": "±166",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 887ms, Q3: 1053ms\nAll times: 827, 844, 848, 857, 864, 870, 882, 887, 903, 907, 909, 915, 918, 936, 937, 996, 999, 1001, 1023, 1045, 1045, 1050, 1053, 1059, 1071, 1073, 1129, 1136, 1140, 1155ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1381,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1358ms, Q3: 1399ms\nAll times: 1336, 1345, 1346, 1357, 1358, 1358, 1360, 1361, 1362, 1368, 1381, 1382, 1384, 1390, 1395, 1399, 1405, 1405, 1412, 1476ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1343,
            "range": "±360",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1329ms, Q3: 1689ms\nAll times: 1321, 1324, 1327, 1328, 1328, 1329, 1331, 1332, 1338, 1339, 1343, 1350, 1364, 1364, 1435, 1689, 1696, 1719, 1735, 1742ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fd82811b4e6b952259a784250a936a8f5060ce6d",
          "message": "Merge pull request #1561 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-f124fd438d\n\nchore(deps): Bump the npm_and_yarn group across 3 directories with 3 updates",
          "timestamp": "2026-05-10T15:02:24+09:00",
          "tree_id": "4ed88fcac5774f916ff2b7806f9f7427dcbb5758",
          "url": "https://github.com/yamadashy/repomix/commit/fd82811b4e6b952259a784250a936a8f5060ce6d"
        },
        "date": 1778393139424,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1203,
            "range": "±128",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1115ms, Q3: 1243ms\nAll times: 908, 911, 936, 1038, 1056, 1078, 1084, 1115, 1129, 1143, 1157, 1165, 1168, 1174, 1185, 1203, 1213, 1213, 1235, 1239, 1240, 1241, 1243, 1288, 1289, 1309, 1321, 1382, 1400, 1473ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1432,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1408ms, Q3: 1444ms\nAll times: 1387, 1394, 1402, 1404, 1407, 1408, 1409, 1413, 1414, 1420, 1432, 1434, 1434, 1437, 1442, 1444, 1446, 1447, 1448, 1470ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1855,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1835ms, Q3: 1868ms\nAll times: 1820, 1825, 1827, 1831, 1833, 1835, 1842, 1849, 1850, 1853, 1855, 1855, 1855, 1856, 1856, 1868, 1875, 1878, 1889, 1903ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c58db40761f4f754970f2e32e11218142e2219aa",
          "message": "Merge pull request #1564 from yamadashy/feat/agent-carnet-skill\n\nchore(skills): Add agent-carnet skill for repository-local notebook",
          "timestamp": "2026-05-10T23:01:30+09:00",
          "tree_id": "d7904ca620ac83abd0ee3a2cba1d4b2bd4bd736a",
          "url": "https://github.com/yamadashy/repomix/commit/c58db40761f4f754970f2e32e11218142e2219aa"
        },
        "date": 1778421804734,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 825,
            "range": "±95",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 815ms, Q3: 910ms\nAll times: 788, 788, 791, 804, 806, 807, 811, 815, 816, 816, 821, 822, 823, 823, 823, 825, 830, 830, 844, 848, 892, 904, 910, 918, 924, 924, 935, 943, 982, 1030ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1424,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1410ms, Q3: 1446ms\nAll times: 1384, 1387, 1391, 1402, 1404, 1410, 1415, 1417, 1418, 1422, 1424, 1427, 1427, 1437, 1439, 1446, 1462, 1470, 1477, 1488ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1712,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1702ms, Q3: 1725ms\nAll times: 1682, 1694, 1696, 1701, 1702, 1702, 1702, 1706, 1707, 1707, 1712, 1713, 1713, 1715, 1720, 1725, 1727, 1728, 1730, 1757ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e27d8be1c4cb8cab511070724cb7f030a84e1fe2",
          "message": "Merge pull request #1565 from yamadashy/chore/remove-agent-memory-skill\n\nchore(skills): Remove agent-memory skill in favor of agent-carnet",
          "timestamp": "2026-05-10T23:13:25+09:00",
          "tree_id": "3127d54a54fa0cc20c2cb0cea6dcef6c29f97d4d",
          "url": "https://github.com/yamadashy/repomix/commit/e27d8be1c4cb8cab511070724cb7f030a84e1fe2"
        },
        "date": 1778422514269,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1013,
            "range": "±239",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 885ms, Q3: 1124ms\nAll times: 821, 833, 840, 846, 858, 861, 876, 885, 892, 927, 928, 935, 942, 947, 968, 1013, 1026, 1044, 1045, 1080, 1102, 1114, 1124, 1130, 1148, 1152, 1170, 1193, 1419, 1708ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 1069,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1059ms, Q3: 1078ms\nAll times: 1052, 1054, 1054, 1054, 1058, 1059, 1059, 1063, 1066, 1067, 1069, 1070, 1070, 1073, 1075, 1078, 1089, 1097, 1107, 1131ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1718,
            "range": "±51",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1688ms, Q3: 1739ms\nAll times: 1670, 1680, 1681, 1682, 1687, 1688, 1715, 1716, 1716, 1716, 1718, 1720, 1724, 1726, 1735, 1739, 1742, 1743, 1751, 1755ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a30ed5d385015dd410e43b610b178cb22063d6a1",
          "message": "Merge pull request #1562 from yamadashy/perf/token-count-cache\n\nperf(core): Add content-addressed token-count disk cache",
          "timestamp": "2026-05-16T16:13:23+09:00",
          "tree_id": "cd3761c297f4181a09816ae9bc8ef99e172fdb1a",
          "url": "https://github.com/yamadashy/repomix/commit/a30ed5d385015dd410e43b610b178cb22063d6a1"
        },
        "date": 1778915762528,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 731,
            "range": "±97",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 679ms, Q3: 776ms\nAll times: 569, 591, 597, 638, 662, 675, 677, 679, 680, 690, 697, 702, 712, 715, 725, 731, 735, 736, 737, 739, 753, 767, 776, 784, 785, 794, 795, 803, 829, 937ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 763,
            "range": "±76",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 747ms, Q3: 823ms\nAll times: 735, 737, 740, 742, 746, 747, 749, 750, 753, 759, 763, 764, 772, 779, 785, 823, 834, 841, 842, 881ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1490,
            "range": "±56",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1462ms, Q3: 1518ms\nAll times: 1190, 1198, 1218, 1236, 1429, 1462, 1473, 1480, 1488, 1488, 1490, 1495, 1500, 1503, 1510, 1518, 1524, 1542, 1561, 1569ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4f878797ff3bb2bf44b5397f7bc0f4d4166f0493",
          "message": "Merge pull request #1569 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-05-16T16:15:49+09:00",
          "tree_id": "59dea42996668e35b2f8ecc44dc5093963eacd6e",
          "url": "https://github.com/yamadashy/repomix/commit/4f878797ff3bb2bf44b5397f7bc0f4d4166f0493"
        },
        "date": 1778916323264,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 649,
            "range": "±98",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 621ms, Q3: 719ms\nAll times: 593, 594, 600, 603, 607, 616, 619, 621, 621, 622, 630, 631, 636, 639, 648, 649, 660, 672, 680, 688, 691, 701, 719, 727, 735, 743, 749, 772, 783, 826ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 966,
            "range": "±64",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 949ms, Q3: 1013ms\nAll times: 935, 942, 942, 946, 948, 949, 952, 954, 960, 962, 966, 967, 968, 971, 991, 1013, 1072, 1102, 1121, 1123ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1364,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 18 runs\nQ1: 1355ms, Q3: 1388ms\nAll times: 1325, 1338, 1344, 1351, 1355, 1358, 1359, 1359, 1362, 1364, 1367, 1372, 1375, 1388, 1389, 1402, 1416, 1512ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5ccdffe13310cdd43fc1cb25cb717e14296ae03c",
          "message": "Merge pull request #1574 from yamadashy/renovate/major-github-actions-major-dependencies\n\nchore(deps): update github-actions major dependencies (major)",
          "timestamp": "2026-05-16T16:58:12+09:00",
          "tree_id": "8be287708689dda3f60e741d4f406bc2ef5a7f3b",
          "url": "https://github.com/yamadashy/repomix/commit/5ccdffe13310cdd43fc1cb25cb717e14296ae03c"
        },
        "date": 1778918419113,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 603,
            "range": "±78",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 561ms, Q3: 639ms\nAll times: 539, 542, 547, 555, 557, 558, 559, 561, 573, 575, 587, 587, 588, 588, 589, 603, 605, 610, 611, 621, 631, 637, 639, 639, 640, 643, 648, 696, 696, 758ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 993,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 974ms, Q3: 1008ms\nAll times: 960, 960, 964, 968, 969, 974, 974, 987, 989, 991, 993, 995, 998, 1000, 1006, 1008, 1009, 1014, 1033, 1043ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1277,
            "range": "±92",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1225ms, Q3: 1317ms\nAll times: 1179, 1188, 1188, 1191, 1215, 1225, 1227, 1239, 1239, 1244, 1277, 1284, 1293, 1297, 1302, 1317, 1321, 1362, 1397, 1445ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dc14555d7f4e24c920b1df3a456a8e9f5d607320",
          "message": "Merge pull request #1575 from yamadashy/test/auto-perf-regression-guard\n\ntest(core): Add regression-guard specs against auto-perf-tuning silent breakages",
          "timestamp": "2026-05-16T18:14:13+09:00",
          "tree_id": "09d215cfa38e00f25452cad23e714a3a6a71ef5d",
          "url": "https://github.com/yamadashy/repomix/commit/dc14555d7f4e24c920b1df3a456a8e9f5d607320"
        },
        "date": 1778922974372,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 634,
            "range": "±114",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 582ms, Q3: 696ms\nAll times: 570, 576, 577, 578, 579, 579, 580, 582, 583, 596, 600, 605, 613, 629, 633, 634, 657, 664, 669, 680, 681, 692, 696, 697, 699, 707, 714, 791, 796, 819ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 935,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 927ms, Q3: 950ms\nAll times: 912, 919, 922, 924, 927, 927, 931, 932, 935, 935, 935, 937, 937, 942, 946, 950, 952, 962, 968, 978ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1284,
            "range": "±63",
            "unit": "ms",
            "extra": "Median of 19 runs\nQ1: 1265ms, Q3: 1328ms\nAll times: 1253, 1262, 1263, 1264, 1265, 1274, 1275, 1283, 1283, 1284, 1287, 1311, 1316, 1328, 1328, 1329, 1330, 1337, 1340ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dd0c7bf5d9ecc5bfafbee410ed6da5f317e5a73a",
          "message": "Merge pull request #1580 from yamadashy/perf/metrics-cache-aware-prewarm\n\nperf(metrics): Skip the eager metrics warm-up when this repo's cache is already populated",
          "timestamp": "2026-05-21T20:59:29+09:00",
          "tree_id": "5c4f444db859261eca52fd612e9167a42332fe49",
          "url": "https://github.com/yamadashy/repomix/commit/dd0c7bf5d9ecc5bfafbee410ed6da5f317e5a73a"
        },
        "date": 1779364927769,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 513,
            "range": "±98",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 463ms, Q3: 561ms\nAll times: 420, 428, 429, 431, 433, 452, 455, 463, 470, 471, 477, 484, 492, 494, 496, 513, 515, 533, 534, 535, 537, 543, 561, 572, 599, 606, 618, 622, 643, 711ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 863,
            "range": "±65",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 833ms, Q3: 898ms\nAll times: 798, 799, 821, 828, 832, 833, 839, 852, 857, 857, 863, 874, 879, 881, 888, 898, 900, 925, 931, 955ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1145,
            "range": "±154",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1120ms, Q3: 1274ms\nAll times: 1096, 1098, 1100, 1105, 1105, 1120, 1122, 1123, 1126, 1127, 1145, 1148, 1250, 1261, 1266, 1274, 1277, 1282, 1289, 1309ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb945d90ba4e6c2a746bcc58ce6fa8c16329eb6c",
          "message": "Merge pull request #1582 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-facd415ad3\n\nchore(deps): Bump the npm_and_yarn group across 2 directories with 1 update",
          "timestamp": "2026-05-21T21:00:27+09:00",
          "tree_id": "3dbf7fba369089f94a4624202c55814bdae1446a",
          "url": "https://github.com/yamadashy/repomix/commit/eb945d90ba4e6c2a746bcc58ce6fa8c16329eb6c"
        },
        "date": 1779365043508,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 765,
            "range": "±111",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 705ms, Q3: 816ms\nAll times: 598, 614, 630, 650, 672, 692, 699, 705, 726, 730, 730, 755, 756, 757, 762, 765, 778, 786, 788, 792, 796, 815, 816, 832, 833, 837, 871, 880, 911, 976ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 768,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 759ms, Q3: 790ms\nAll times: 734, 748, 751, 753, 757, 759, 761, 764, 765, 767, 768, 768, 781, 788, 790, 790, 802, 859, 864, 970ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1068,
            "range": "±95",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1034ms, Q3: 1129ms\nAll times: 1016, 1019, 1022, 1026, 1028, 1034, 1045, 1050, 1054, 1068, 1068, 1071, 1080, 1107, 1110, 1129, 1159, 1170, 1254, 2832ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "746d0fd1cbee09affe6d65e6e9f9d27e04024c9f",
          "message": "Merge pull request #1584 from yamadashy/ci/website-client-docs-build\n\nci(website): Add docs:build step to website client job",
          "timestamp": "2026-05-22T00:10:31+09:00",
          "tree_id": "8c1df9ec6fe24da6209771bc0fe2b7ed0979edcf",
          "url": "https://github.com/yamadashy/repomix/commit/746d0fd1cbee09affe6d65e6e9f9d27e04024c9f"
        },
        "date": 1779376445049,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 454,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 439ms, Q3: 473ms\nAll times: 420, 421, 425, 428, 431, 438, 439, 439, 441, 442, 444, 444, 446, 449, 449, 454, 456, 457, 458, 462, 465, 471, 473, 476, 483, 488, 497, 510, 511, 549ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 768,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 762ms, Q3: 780ms\nAll times: 753, 755, 758, 759, 761, 762, 762, 762, 765, 765, 768, 768, 770, 778, 780, 780, 781, 782, 782, 786ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 982,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 971ms, Q3: 994ms\nAll times: 956, 963, 963, 966, 970, 971, 975, 975, 976, 978, 982, 983, 987, 991, 992, 994, 999, 1011, 1016, 1055ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b13dd00db53baf195bd929fa483ead4ecb60bc3d",
          "message": "Merge pull request #1591 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-05-24T15:29:02+09:00",
          "tree_id": "d6b974a4aefc33ddfb340c5eb950cdf2f159f0eb",
          "url": "https://github.com/yamadashy/repomix/commit/b13dd00db53baf195bd929fa483ead4ecb60bc3d"
        },
        "date": 1779604268653,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 443,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 433ms, Q3: 457ms\nAll times: 411, 413, 417, 421, 425, 429, 432, 433, 437, 437, 439, 439, 440, 441, 442, 443, 444, 444, 452, 452, 456, 456, 457, 463, 464, 469, 488, 489, 518, 548ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 734,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 729ms, Q3: 741ms\nAll times: 717, 718, 726, 727, 729, 729, 730, 731, 731, 733, 734, 734, 734, 734, 738, 741, 742, 744, 751, 755ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1274,
            "range": "±184",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1146ms, Q3: 1330ms\nAll times: 1128, 1131, 1133, 1144, 1144, 1146, 1149, 1150, 1158, 1230, 1274, 1278, 1280, 1290, 1311, 1330, 1332, 1336, 1339, 1353ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "997e49040b75baa2303d5072e27801ae50552680",
          "message": "Merge pull request #1593 from yamadashy/renovate/scripts-non-major-dependencies\n\nchore(deps): update dependency @types/node to ^24.12.4",
          "timestamp": "2026-05-24T15:29:41+09:00",
          "tree_id": "35a072f24cca4baea0e1de4e8019baec926e150a",
          "url": "https://github.com/yamadashy/repomix/commit/997e49040b75baa2303d5072e27801ae50552680"
        },
        "date": 1779604441792,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 470,
            "range": "±67",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 453ms, Q3: 520ms\nAll times: 441, 445, 445, 447, 449, 450, 450, 453, 455, 456, 457, 460, 461, 463, 464, 470, 478, 483, 491, 492, 494, 506, 520, 534, 537, 545, 561, 561, 573, 625ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 603,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 592ms, Q3: 610ms\nAll times: 583, 586, 587, 590, 590, 592, 594, 594, 597, 597, 603, 603, 605, 606, 606, 610, 628, 685, 718, 770ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1207,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1187ms, Q3: 1223ms\nAll times: 1048, 1067, 1112, 1151, 1163, 1187, 1187, 1193, 1203, 1204, 1207, 1209, 1217, 1219, 1220, 1223, 1232, 1234, 1245, 1255ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "32531c5c8995d5bc0b0907c8ffffcc6c98116fe9",
          "message": "Merge pull request #1594 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update root non-major dependencies",
          "timestamp": "2026-05-24T15:56:00+09:00",
          "tree_id": "5b363d66057d28b933afe0aaec5162dbb936f06a",
          "url": "https://github.com/yamadashy/repomix/commit/32531c5c8995d5bc0b0907c8ffffcc6c98116fe9"
        },
        "date": 1779605872507,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 457,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 444ms, Q3: 503ms\nAll times: 433, 434, 438, 439, 441, 443, 443, 444, 444, 444, 444, 447, 448, 450, 454, 457, 458, 471, 472, 477, 479, 484, 503, 506, 512, 591, 607, 608, 659, 702ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 805,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 775ms, Q3: 832ms\nAll times: 749, 758, 770, 771, 771, 775, 790, 792, 796, 803, 805, 811, 812, 812, 819, 832, 861, 892, 910, 911ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1051,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1039ms, Q3: 1060ms\nAll times: 1030, 1034, 1035, 1036, 1039, 1039, 1040, 1046, 1046, 1050, 1051, 1053, 1055, 1056, 1057, 1060, 1063, 1065, 1068, 1083ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d4c73dc3c82d06fd52d58568a1a8aa480fc526f7",
          "message": "Merge pull request #1595 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-9ddfda7c4f\n\nchore(deps): Bump the npm_and_yarn group across 2 directories with 1 update",
          "timestamp": "2026-05-24T16:01:22+09:00",
          "tree_id": "bb4c1ec12413fe839ce2f0d441de65c5c125ef5f",
          "url": "https://github.com/yamadashy/repomix/commit/d4c73dc3c82d06fd52d58568a1a8aa480fc526f7"
        },
        "date": 1779606183654,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 560,
            "range": "±121",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 507ms, Q3: 628ms\nAll times: 455, 474, 478, 486, 488, 494, 497, 507, 512, 515, 515, 516, 530, 545, 551, 560, 565, 576, 588, 596, 599, 602, 628, 633, 649, 672, 677, 697, 713, 810ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 788,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 780ms, Q3: 802ms\nAll times: 772, 772, 774, 774, 775, 780, 780, 782, 783, 783, 788, 788, 790, 790, 791, 802, 803, 803, 828, 833ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1136,
            "range": "±174",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1117ms, Q3: 1291ms\nAll times: 1106, 1110, 1112, 1112, 1114, 1117, 1118, 1129, 1130, 1131, 1136, 1139, 1154, 1163, 1174, 1291, 1299, 1311, 1335, 1356ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e0924b6430c8baca2eabb477408a4b2a7500b49b",
          "message": "Merge pull request #1597 from yamadashy/chore/skills-reorganize\n\nchore(skills): Reorganize skill directories",
          "timestamp": "2026-05-24T21:52:22+09:00",
          "tree_id": "30698f5c5cde48e6e84af28cdcb2fc439f6c48d9",
          "url": "https://github.com/yamadashy/repomix/commit/e0924b6430c8baca2eabb477408a4b2a7500b49b"
        },
        "date": 1779627248268,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 466,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 448ms, Q3: 474ms\nAll times: 435, 437, 438, 439, 443, 446, 448, 448, 449, 451, 453, 456, 457, 457, 464, 466, 468, 470, 470, 472, 473, 473, 474, 477, 477, 479, 479, 481, 501, 517ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 778,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 767ms, Q3: 790ms\nAll times: 751, 753, 759, 762, 764, 767, 772, 772, 774, 777, 778, 779, 784, 786, 790, 790, 794, 797, 811, 817ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 588,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 580ms, Q3: 596ms\nAll times: 574, 575, 575, 580, 580, 580, 582, 586, 587, 587, 588, 588, 589, 589, 592, 596, 596, 603, 604, 610ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "132f1b87d25f43d277a2cfd178f221a1f6190be2",
          "message": "Merge pull request #1598 from yamadashy/fix/issue-triage-prompt-injection\n\nchore(ci): harden issue triage workflow with least-privilege split",
          "timestamp": "2026-05-24T22:59:55+09:00",
          "tree_id": "adeca105d532dbb3b400a85779e37cc3bb102bec",
          "url": "https://github.com/yamadashy/repomix/commit/132f1b87d25f43d277a2cfd178f221a1f6190be2"
        },
        "date": 1779631275348,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 502,
            "range": "±52",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 483ms, Q3: 535ms\nAll times: 449, 459, 465, 467, 469, 469, 472, 483, 483, 484, 486, 488, 491, 492, 496, 502, 504, 510, 518, 521, 524, 529, 535, 540, 547, 551, 553, 577, 621, 807ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 782,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 766ms, Q3: 800ms\nAll times: 757, 758, 761, 763, 766, 766, 769, 770, 772, 779, 782, 784, 793, 794, 794, 800, 818, 853, 854, 885ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 594,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 590ms, Q3: 605ms\nAll times: 580, 580, 582, 586, 586, 590, 592, 593, 593, 594, 594, 594, 594, 602, 604, 605, 609, 610, 615, 622ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "18b1d610789b6ead4a50c8c45782df1063155506",
          "message": "Merge pull request #1600 from yamadashy/chore/harden-issue-similar-workflow\n\nchore(ci): harden similar-issues workflow with least-privilege split",
          "timestamp": "2026-05-26T00:00:46+09:00",
          "tree_id": "973387fc5fc091be75694be181458d79595ff6aa",
          "url": "https://github.com/yamadashy/repomix/commit/18b1d610789b6ead4a50c8c45782df1063155506"
        },
        "date": 1779721347311,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 611,
            "range": "±152",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 525ms, Q3: 677ms\nAll times: 478, 481, 488, 496, 499, 501, 520, 525, 532, 534, 536, 541, 568, 568, 572, 611, 623, 626, 654, 657, 671, 674, 677, 690, 692, 725, 800, 851, 904, 907ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 824,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 814ms, Q3: 859ms\nAll times: 802, 804, 808, 813, 814, 814, 815, 816, 820, 821, 824, 826, 836, 838, 844, 859, 912, 945, 984, 987ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1093,
            "range": "±44",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1074ms, Q3: 1118ms\nAll times: 1061, 1062, 1062, 1067, 1068, 1074, 1074, 1084, 1086, 1090, 1093, 1098, 1104, 1105, 1105, 1118, 1120, 1120, 1125, 1139ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "094a635b030e556f69afd74432f7892dbba3824c",
          "message": "Merge pull request #1601 from yamadashy/chore/explorer-description\n\nchore(skills): Sharpen repomix-explorer description",
          "timestamp": "2026-05-26T00:30:55+09:00",
          "tree_id": "e82b0c850042b780859aa9443932a14fa2b43ddf",
          "url": "https://github.com/yamadashy/repomix/commit/094a635b030e556f69afd74432f7892dbba3824c"
        },
        "date": 1779723203882,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 439,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 432ms, Q3: 444ms\nAll times: 409, 410, 413, 414, 420, 427, 431, 432, 433, 434, 435, 435, 436, 436, 437, 439, 440, 441, 441, 442, 442, 443, 444, 460, 461, 462, 476, 485, 490, 530ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 735,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 727ms, Q3: 741ms\nAll times: 718, 719, 722, 723, 726, 727, 731, 732, 733, 734, 735, 736, 736, 736, 738, 741, 747, 753, 757, 764ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1084,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1073ms, Q3: 1099ms\nAll times: 1062, 1064, 1065, 1068, 1068, 1073, 1077, 1082, 1082, 1083, 1084, 1088, 1091, 1093, 1097, 1099, 1110, 1112, 1114, 1132ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4f4300a70873906459efa3d10a98b56439fa2e6f",
          "message": "Merge commit from fork\n\nfix(security): prevent argument injection via remote branch ref",
          "timestamp": "2026-05-27T00:38:39+09:00",
          "tree_id": "378dea55f1c9e4c1e110f2b45067fd49e4ac8a48",
          "url": "https://github.com/yamadashy/repomix/commit/4f4300a70873906459efa3d10a98b56439fa2e6f"
        },
        "date": 1779810060367,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 887,
            "range": "±98",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 845ms, Q3: 943ms\nAll times: 770, 779, 802, 822, 824, 830, 841, 845, 848, 849, 866, 867, 869, 873, 874, 887, 888, 915, 922, 930, 933, 940, 943, 952, 971, 988, 1034, 1121, 1149, 1570ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 740,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 735ms, Q3: 756ms\nAll times: 720, 727, 728, 728, 729, 735, 735, 737, 738, 738, 740, 741, 743, 744, 745, 756, 757, 768, 771, 777ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1118,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1106ms, Q3: 1125ms\nAll times: 1102, 1105, 1105, 1105, 1106, 1106, 1108, 1110, 1114, 1115, 1118, 1120, 1122, 1123, 1124, 1125, 1128, 1130, 1136, 1141ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e02cb66cd5e706e1bba364bca43f3e69d594de25",
          "message": "Merge commit from fork\n\nfix(mcp): secret-scan attach-sourced outputs before serving them",
          "timestamp": "2026-05-27T00:39:35+09:00",
          "tree_id": "5ffd112d7124d98e2cbaaaab002f06d9457edb9e",
          "url": "https://github.com/yamadashy/repomix/commit/e02cb66cd5e706e1bba364bca43f3e69d594de25"
        },
        "date": 1779810175965,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 461,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 452ms, Q3: 499ms\nAll times: 421, 423, 432, 435, 445, 451, 451, 452, 454, 455, 455, 455, 457, 458, 459, 461, 463, 471, 471, 478, 483, 483, 499, 502, 502, 519, 525, 532, 542, 566ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 743,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 735ms, Q3: 746ms\nAll times: 724, 727, 731, 732, 735, 735, 736, 739, 740, 741, 743, 743, 744, 745, 746, 746, 751, 755, 755, 771ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1124,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1118ms, Q3: 1134ms\nAll times: 1101, 1107, 1113, 1114, 1118, 1118, 1119, 1120, 1121, 1123, 1124, 1127, 1127, 1129, 1130, 1134, 1137, 1139, 1148, 1150ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "a7b93adfcdb11be923a9a092cceb1cb6739ef8e1",
          "message": "1.14.1",
          "timestamp": "2026-05-27T00:45:16+09:00",
          "tree_id": "2f42c3a6896c51d9050505e043ff4ee4561699a0",
          "url": "https://github.com/yamadashy/repomix/commit/a7b93adfcdb11be923a9a092cceb1cb6739ef8e1"
        },
        "date": 1779810712128,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 473,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 461ms, Q3: 506ms\nAll times: 449, 452, 455, 455, 458, 459, 459, 461, 463, 466, 466, 467, 467, 468, 472, 473, 474, 476, 483, 484, 491, 497, 506, 506, 517, 531, 537, 593, 656, 1278ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 777,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 771ms, Q3: 795ms\nAll times: 751, 760, 769, 770, 770, 771, 772, 774, 774, 775, 777, 781, 783, 792, 794, 795, 796, 801, 806, 813ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1076,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1064ms, Q3: 1089ms\nAll times: 1049, 1052, 1058, 1060, 1062, 1064, 1065, 1067, 1069, 1074, 1076, 1077, 1079, 1079, 1081, 1089, 1091, 1095, 1103, 1104ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "6d7800eada2e5a2e4d2ef24dc4c09a18348c5769",
          "message": "docs(release): Add v1.14.1 release notes\n\nintent(release): document the 1.14.1 security patch (GHSA-9mm9 argument injection, GHSA-hwpp MCP secret-scan bypass) alongside the token-count cache and Dart parsing improvements\ndecision(release-notes): lead with Security since updating is recommended for all users; omit website/deps/internal PRs per release-note guidelines\ndecision(nix): list nixpkgs install under Improvements (user-facing) and the dev flake under Development (contributor-facing), without pinning a nixpkgs version since it lags releases\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-05-28T00:29:38+09:00",
          "tree_id": "a29a1cde6027fe0bfe9f55b6215b4772f3a39c4b",
          "url": "https://github.com/yamadashy/repomix/commit/6d7800eada2e5a2e4d2ef24dc4c09a18348c5769"
        },
        "date": 1779895884529,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 594,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 561ms, Q3: 623ms\nAll times: 486, 507, 512, 546, 553, 558, 559, 561, 562, 568, 574, 577, 583, 587, 592, 594, 596, 597, 599, 599, 611, 617, 623, 626, 629, 646, 654, 662, 748, 891ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 769,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 762ms, Q3: 787ms\nAll times: 742, 748, 753, 756, 761, 762, 762, 765, 765, 768, 769, 773, 776, 778, 787, 787, 790, 799, 801, 827ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1138,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1124ms, Q3: 1158ms\nAll times: 1111, 1113, 1115, 1116, 1122, 1124, 1127, 1131, 1136, 1137, 1138, 1139, 1145, 1145, 1150, 1158, 1214, 1231, 1362, 1365ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "66e8a508a001f6fdc2475390972885c1765a357f",
          "message": "Merge pull request #1603 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-05-30T14:05:46+09:00",
          "tree_id": "e4457ce40da9384ffdbbdcf4cc2b6eecb25a0d24",
          "url": "https://github.com/yamadashy/repomix/commit/66e8a508a001f6fdc2475390972885c1765a357f"
        },
        "date": 1780117731021,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 518,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 491ms, Q3: 546ms\nAll times: 458, 460, 466, 478, 484, 489, 490, 491, 491, 495, 497, 511, 511, 514, 514, 518, 518, 521, 526, 528, 528, 532, 546, 560, 567, 579, 588, 596, 626, 649ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 587,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 581ms, Q3: 593ms\nAll times: 576, 577, 578, 579, 579, 581, 582, 584, 585, 587, 587, 589, 590, 591, 592, 593, 593, 595, 595, 644ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 977,
            "range": "±38",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 962ms, Q3: 1000ms\nAll times: 945, 948, 951, 954, 955, 962, 965, 968, 968, 970, 977, 980, 982, 985, 986, 1000, 1042, 1044, 1068, 1267ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d7d124b49abba58f0cccd091e7451bdba48337b7",
          "message": "Merge pull request #1609 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update anthropics/claude-code-action action to v1.0.133",
          "timestamp": "2026-05-30T14:07:26+09:00",
          "tree_id": "98ae30ac5d925f764abb5e795271ec4aecb65279",
          "url": "https://github.com/yamadashy/repomix/commit/d7d124b49abba58f0cccd091e7451bdba48337b7"
        },
        "date": 1780118021284,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 475,
            "range": "±39",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 460ms, Q3: 499ms\nAll times: 427, 437, 437, 439, 446, 450, 454, 460, 464, 464, 466, 467, 469, 471, 473, 475, 475, 476, 479, 480, 488, 490, 499, 503, 513, 526, 527, 529, 531, 533ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 793,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 784ms, Q3: 803ms\nAll times: 762, 771, 775, 780, 783, 784, 788, 789, 789, 793, 793, 794, 794, 797, 799, 803, 807, 811, 814, 816ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 597,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 592ms, Q3: 606ms\nAll times: 583, 586, 588, 590, 592, 592, 592, 594, 596, 596, 597, 599, 600, 601, 601, 606, 607, 608, 610, 618ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "921dd2393d5f88d792f3ce6e48299c1ea6c17499",
          "message": "Merge pull request #1604 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-05-30T14:17:31+09:00",
          "tree_id": "76f6e843b991d780ae81dee83445d58e1511d330",
          "url": "https://github.com/yamadashy/repomix/commit/921dd2393d5f88d792f3ce6e48299c1ea6c17499"
        },
        "date": 1780118337169,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 417,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 409ms, Q3: 428ms\nAll times: 403, 404, 406, 406, 408, 408, 408, 409, 410, 410, 410, 413, 416, 417, 417, 417, 418, 421, 423, 424, 425, 426, 428, 428, 432, 436, 439, 441, 469, 680ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 740,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 734ms, Q3: 750ms\nAll times: 723, 729, 731, 731, 732, 734, 737, 737, 738, 739, 740, 742, 744, 745, 748, 750, 753, 763, 779, 798ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1024,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1011ms, Q3: 1038ms\nAll times: 1003, 1004, 1006, 1008, 1010, 1011, 1011, 1016, 1017, 1021, 1024, 1025, 1028, 1030, 1034, 1038, 1044, 1051, 1052, 1053ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c90beaef0eb8b26cfe70752b82b5b602ca668972",
          "message": "Merge pull request #1605 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-05-30T14:17:52+09:00",
          "tree_id": "0942dafe541fa3fa7ff7f480708db7fdcec78b15",
          "url": "https://github.com/yamadashy/repomix/commit/c90beaef0eb8b26cfe70752b82b5b602ca668972"
        },
        "date": 1780118522679,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 659,
            "range": "±109",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 579ms, Q3: 688ms\nAll times: 489, 519, 534, 547, 554, 559, 570, 579, 597, 622, 624, 625, 629, 654, 655, 659, 660, 667, 670, 671, 671, 672, 688, 707, 716, 751, 751, 791, 792, 879ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 721,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 710ms, Q3: 734ms\nAll times: 692, 700, 701, 705, 707, 710, 710, 712, 718, 718, 721, 722, 725, 731, 734, 734, 737, 746, 755, 760ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1034,
            "range": "±10",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1028ms, Q3: 1038ms\nAll times: 1017, 1024, 1024, 1025, 1027, 1028, 1029, 1032, 1032, 1032, 1034, 1034, 1035, 1037, 1037, 1038, 1044, 1050, 1056, 1058ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "416d042d43bf9901e0d3842853f7aa27a9895b8e",
          "message": "Merge pull request #1611 from yamadashy/chore/renovate-ignore-clack-prompts\n\nchore(renovate): Ignore @clack/prompts major update",
          "timestamp": "2026-05-30T14:52:40+09:00",
          "tree_id": "b67273f9ac0caeb8f5caeb1903543aec89d5fdc8",
          "url": "https://github.com/yamadashy/repomix/commit/416d042d43bf9901e0d3842853f7aa27a9895b8e"
        },
        "date": 1780120504139,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 528,
            "range": "±171",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 464ms, Q3: 635ms\nAll times: 439, 441, 444, 448, 451, 455, 463, 464, 469, 470, 479, 479, 480, 497, 511, 528, 544, 586, 592, 602, 605, 617, 635, 650, 682, 689, 726, 737, 911, 1034ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 753,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 744ms, Q3: 806ms\nAll times: 733, 736, 738, 739, 742, 744, 745, 746, 752, 752, 753, 759, 761, 769, 777, 806, 835, 846, 851, 966ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 757,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 750ms, Q3: 768ms\nAll times: 742, 744, 746, 746, 749, 750, 750, 752, 755, 757, 757, 757, 757, 762, 762, 768, 779, 811, 868, 960ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ae7a9c3844f0b439218e289f9f6d5ea526288b3e",
          "message": "Merge pull request #1607 from yamadashy/renovate/major-root-major-dependencies\n\nfix(deps): update root major dependencies (major)",
          "timestamp": "2026-05-30T18:27:41+09:00",
          "tree_id": "717a3107223373ffe8be0fcf11e2aaaa32a9e32d",
          "url": "https://github.com/yamadashy/repomix/commit/ae7a9c3844f0b439218e289f9f6d5ea526288b3e"
        },
        "date": 1780133391369,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 505,
            "range": "±57",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 489ms, Q3: 546ms\nAll times: 474, 476, 478, 478, 479, 482, 489, 489, 490, 490, 498, 499, 499, 500, 502, 505, 507, 508, 511, 511, 522, 530, 546, 578, 582, 598, 599, 602, 606, 613ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 854,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 848ms, Q3: 865ms\nAll times: 834, 836, 841, 846, 847, 848, 850, 850, 850, 851, 854, 854, 854, 862, 862, 865, 867, 870, 871, 877ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1216,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1205ms, Q3: 1225ms\nAll times: 1195, 1197, 1200, 1200, 1205, 1205, 1206, 1211, 1213, 1216, 1216, 1218, 1219, 1223, 1224, 1225, 1232, 1234, 1239, 1243ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c4eac374c285efab96cfa89de31f1335ce7b1983",
          "message": "Merge pull request #1613 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260523.1",
          "timestamp": "2026-05-30T18:28:44+09:00",
          "tree_id": "b1d6282aab3efc630ecb3ac4d250788aa2957021",
          "url": "https://github.com/yamadashy/repomix/commit/c4eac374c285efab96cfa89de31f1335ce7b1983"
        },
        "date": 1780133519519,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 532,
            "range": "±73",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 513ms, Q3: 586ms\nAll times: 498, 500, 501, 506, 506, 506, 509, 513, 515, 516, 518, 519, 523, 527, 529, 532, 534, 535, 536, 539, 544, 552, 586, 594, 605, 612, 640, 641, 706, 796ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 854,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 841ms, Q3: 867ms\nAll times: 827, 827, 832, 840, 841, 841, 842, 847, 849, 853, 854, 855, 858, 858, 859, 867, 868, 875, 881, 901ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1037,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1030ms, Q3: 1056ms\nAll times: 1020, 1021, 1024, 1026, 1026, 1030, 1032, 1033, 1037, 1037, 1037, 1039, 1040, 1043, 1047, 1056, 1066, 1070, 1072, 1080ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb54625652e35d5937bcf1deb09368533f96faed",
          "message": "Merge pull request #1614 from yamadashy/ci/schema-update-auto-pr\n\nci(schema): Deliver schema updates via PR instead of direct push to main",
          "timestamp": "2026-06-03T22:10:52+09:00",
          "tree_id": "a3a0d9d8a04400c366e50739b9f5cfd9d94e5466",
          "url": "https://github.com/yamadashy/repomix/commit/eb54625652e35d5937bcf1deb09368533f96faed"
        },
        "date": 1780492350204,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 595,
            "range": "±77",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 573ms, Q3: 650ms\nAll times: 535, 538, 543, 548, 555, 556, 563, 573, 573, 576, 580, 586, 589, 594, 595, 595, 610, 612, 613, 625, 633, 644, 650, 656, 667, 669, 671, 736, 790, 957ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 856,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 845ms, Q3: 868ms\nAll times: 818, 831, 834, 839, 839, 845, 846, 849, 849, 851, 856, 858, 858, 858, 866, 868, 870, 872, 873, 874ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1206,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1193ms, Q3: 1214ms\nAll times: 1177, 1190, 1190, 1191, 1193, 1193, 1195, 1197, 1203, 1205, 1206, 1208, 1208, 1209, 1214, 1214, 1216, 1225, 1231, 1241ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4a6d4c8a7a88ba69958e2252e780368eb3924036",
          "message": "Merge pull request #1619 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-0a9c170602\n\nchore(deps): Bump hono from 4.12.18 to 4.12.23 in the npm_and_yarn group across 1 directory",
          "timestamp": "2026-06-05T15:19:37+09:00",
          "tree_id": "a7f22769430289d889cb5e5241ae758ca847b3a8",
          "url": "https://github.com/yamadashy/repomix/commit/4a6d4c8a7a88ba69958e2252e780368eb3924036"
        },
        "date": 1780640533466,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 608,
            "range": "±128",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 547ms, Q3: 675ms\nAll times: 517, 520, 525, 531, 538, 545, 546, 547, 550, 552, 557, 566, 571, 574, 581, 608, 610, 631, 636, 642, 643, 665, 675, 686, 710, 726, 783, 816, 831, 872ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 838,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 829ms, Q3: 842ms\nAll times: 817, 818, 819, 824, 828, 829, 829, 829, 835, 838, 838, 839, 839, 841, 842, 842, 849, 856, 933, 981ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1021,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1008ms, Q3: 1023ms\nAll times: 988, 999, 1004, 1006, 1007, 1008, 1012, 1015, 1015, 1019, 1021, 1021, 1022, 1022, 1022, 1023, 1024, 1024, 1026, 1027ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c117c9b2c2b935fd759b8ea9e0da1fabca560bfe",
          "message": "Merge pull request #1623 from yamadashy/ci/schema-update-main-only\n\nci(schema): Regenerate schema on main only, not on PR branches",
          "timestamp": "2026-06-05T21:16:31+09:00",
          "tree_id": "5a7893ed72a4a84c157a3a256a0d49a0b8c2f379",
          "url": "https://github.com/yamadashy/repomix/commit/c117c9b2c2b935fd759b8ea9e0da1fabca560bfe"
        },
        "date": 1780661889794,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 666,
            "range": "±106",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 602ms, Q3: 708ms\nAll times: 552, 565, 582, 583, 585, 591, 597, 602, 612, 621, 622, 625, 625, 660, 661, 666, 669, 682, 695, 697, 702, 707, 708, 714, 724, 767, 806, 862, 872, 883ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 842,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 839ms, Q3: 852ms\nAll times: 825, 828, 829, 831, 839, 839, 840, 840, 841, 842, 842, 843, 843, 844, 847, 852, 853, 856, 860, 887ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1114,
            "range": "±31",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1107ms, Q3: 1138ms\nAll times: 1090, 1094, 1099, 1102, 1104, 1107, 1108, 1108, 1111, 1111, 1114, 1115, 1118, 1129, 1135, 1138, 1139, 1141, 1155, 1162ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "edbe25eaa4a8f10d0ef68fc07e55881d13a4d3e8",
          "message": "Merge pull request #1621 from yamadashy/feat/token-budget-1616\n\nfeat(cli): Add --token-budget guard for CI/agent context limits",
          "timestamp": "2026-06-05T22:26:45+09:00",
          "tree_id": "38e4ced9ab1fb4008cfba49300e440d5f6901de0",
          "url": "https://github.com/yamadashy/repomix/commit/edbe25eaa4a8f10d0ef68fc07e55881d13a4d3e8"
        },
        "date": 1780666158777,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 575,
            "range": "±79",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 530ms, Q3: 609ms\nAll times: 491, 494, 497, 504, 509, 511, 519, 530, 533, 553, 557, 563, 565, 566, 572, 575, 578, 578, 579, 591, 599, 601, 609, 611, 622, 630, 658, 674, 678, 765ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 772,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 759ms, Q3: 775ms\nAll times: 757, 757, 757, 758, 758, 759, 764, 770, 771, 772, 772, 773, 774, 774, 774, 775, 783, 784, 785, 794ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1198,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1183ms, Q3: 1223ms\nAll times: 1166, 1166, 1175, 1181, 1182, 1183, 1191, 1191, 1193, 1195, 1198, 1204, 1207, 1217, 1219, 1223, 1237, 1238, 1252, 1275ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3b6018bb02e1341cad385cf8dbaeb3e5ad40654e",
          "message": "Merge pull request #1624 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-06-07T17:18:44+09:00",
          "tree_id": "c015519684c9e90ec07ee9c6b14106fc5d73a706",
          "url": "https://github.com/yamadashy/repomix/commit/3b6018bb02e1341cad385cf8dbaeb3e5ad40654e"
        },
        "date": 1780820515172,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 978,
            "range": "±197",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 923ms, Q3: 1120ms\nAll times: 828, 854, 881, 881, 882, 899, 906, 923, 924, 930, 938, 942, 946, 952, 958, 978, 979, 1034, 1035, 1042, 1046, 1107, 1120, 1121, 1122, 1125, 1140, 1161, 1181, 1603ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 881,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 870ms, Q3: 890ms\nAll times: 848, 849, 852, 854, 862, 870, 872, 872, 874, 874, 881, 882, 884, 886, 887, 890, 892, 897, 901, 909ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1260,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1249ms, Q3: 1297ms\nAll times: 1230, 1235, 1236, 1246, 1247, 1249, 1251, 1254, 1254, 1259, 1260, 1265, 1269, 1270, 1282, 1297, 1391, 1420, 1472, 1553ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ec30f4bcc941e4d2c77f6d8c44e13fc91b82319a",
          "message": "Merge pull request #1626 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-06-07T17:19:24+09:00",
          "tree_id": "711ffb64a4b43e491b7ef475eacf213b930f4198",
          "url": "https://github.com/yamadashy/repomix/commit/ec30f4bcc941e4d2c77f6d8c44e13fc91b82319a"
        },
        "date": 1780820646876,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 647,
            "range": "±113",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 601ms, Q3: 714ms\nAll times: 487, 489, 518, 534, 554, 565, 598, 601, 609, 627, 634, 637, 643, 645, 647, 647, 655, 664, 689, 696, 701, 708, 714, 721, 725, 742, 752, 764, 767, 850ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 750,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 744ms, Q3: 757ms\nAll times: 735, 738, 739, 743, 744, 744, 748, 748, 749, 749, 750, 751, 752, 755, 757, 757, 759, 761, 767, 770ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1201,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1181ms, Q3: 1210ms\nAll times: 1169, 1175, 1176, 1178, 1179, 1181, 1182, 1185, 1185, 1188, 1201, 1203, 1207, 1208, 1208, 1210, 1213, 1217, 1218, 1232ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0f0e4ef032b5a603fe0c7947f700c91ea219622e",
          "message": "Merge pull request #1629 from yamadashy/renovate/major-github-actions-major-dependencies\n\nchore(deps): update github-actions major dependencies to v3",
          "timestamp": "2026-06-07T17:22:07+09:00",
          "tree_id": "afe15ca015511a2aeed17d270a0d06ff3dd81a1f",
          "url": "https://github.com/yamadashy/repomix/commit/0f0e4ef032b5a603fe0c7947f700c91ea219622e"
        },
        "date": 1780820749269,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 525,
            "range": "±58",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 504ms, Q3: 562ms\nAll times: 462, 465, 468, 474, 475, 491, 494, 504, 505, 505, 505, 507, 507, 508, 522, 525, 532, 533, 536, 539, 544, 550, 562, 567, 581, 589, 602, 621, 663, 689ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 808,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 805ms, Q3: 818ms\nAll times: 789, 794, 794, 795, 801, 805, 806, 806, 806, 807, 808, 809, 810, 811, 811, 818, 822, 822, 832, 856ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1075,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1067ms, Q3: 1087ms\nAll times: 1061, 1063, 1065, 1065, 1066, 1067, 1070, 1070, 1071, 1073, 1075, 1075, 1076, 1078, 1079, 1087, 1090, 1103, 1111, 1117ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d62905673dd0e5bea9f335211e7c3814754cbed6",
          "message": "Merge pull request #1618 from Samsen879/fix-multiroot-output-paths\n\nfix multi-root duplicate relative paths",
          "timestamp": "2026-06-07T19:37:02+09:00",
          "tree_id": "fcfa9b334934e58c13a8c9068f0df7a91681a4fa",
          "url": "https://github.com/yamadashy/repomix/commit/d62905673dd0e5bea9f335211e7c3814754cbed6"
        },
        "date": 1780828718662,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 477,
            "range": "±47",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 456ms, Q3: 503ms\nAll times: 447, 449, 452, 453, 454, 454, 455, 456, 457, 462, 464, 468, 470, 470, 475, 477, 478, 481, 482, 482, 486, 487, 503, 506, 507, 519, 520, 520, 539, 544ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 810,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 804ms, Q3: 815ms\nAll times: 793, 795, 797, 800, 801, 804, 804, 805, 806, 806, 810, 811, 813, 814, 814, 815, 821, 821, 822, 828ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1120,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1116ms, Q3: 1131ms\nAll times: 1090, 1091, 1103, 1113, 1115, 1116, 1117, 1118, 1120, 1120, 1120, 1121, 1121, 1122, 1124, 1131, 1189, 1190, 1273, 1477ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fc69dcc31357d5db934f67ceaff4150f67e4735c",
          "message": "Merge pull request #1622 from Samsen879/fix-ignore-gitignore-conflict\n\nfix(file): keep ignored .gitignore rules active",
          "timestamp": "2026-06-08T00:33:17+09:00",
          "tree_id": "0f9a330968372237c5335d0717c3b2158eb81bbe",
          "url": "https://github.com/yamadashy/repomix/commit/fc69dcc31357d5db934f67ceaff4150f67e4735c"
        },
        "date": 1780846534580,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 702,
            "range": "±352",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 620ms, Q3: 972ms\nAll times: 553, 556, 571, 600, 600, 606, 617, 620, 624, 631, 646, 655, 667, 676, 701, 702, 820, 858, 882, 935, 941, 943, 972, 973, 1016, 1093, 1141, 1250, 1305, 1418ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 859,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 846ms, Q3: 871ms\nAll times: 839, 841, 842, 843, 844, 846, 848, 849, 856, 857, 859, 860, 862, 866, 869, 871, 871, 872, 878, 886ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1211,
            "range": "±59",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1198ms, Q3: 1257ms\nAll times: 1162, 1169, 1172, 1190, 1196, 1198, 1200, 1202, 1205, 1207, 1211, 1213, 1223, 1228, 1239, 1257, 1265, 1418, 1473, 1593ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e7a8f86154d9d6253210122aed617e385deb301c",
          "message": "Merge pull request #1634 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-06-13T16:57:49+09:00",
          "tree_id": "64bde3dde9ba0d5d4cc5d39f6a096c2c2e78e81d",
          "url": "https://github.com/yamadashy/repomix/commit/e7a8f86154d9d6253210122aed617e385deb301c"
        },
        "date": 1781337721720,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 566,
            "range": "±81",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 533ms, Q3: 614ms\nAll times: 485, 494, 494, 503, 526, 530, 531, 533, 533, 539, 552, 552, 560, 560, 561, 566, 571, 593, 596, 601, 610, 613, 614, 614, 618, 642, 645, 650, 660, 839ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 770,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 765ms, Q3: 779ms\nAll times: 749, 758, 759, 759, 763, 765, 765, 769, 770, 770, 770, 770, 774, 775, 778, 779, 780, 784, 799, 799ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1133,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1122ms, Q3: 1136ms\nAll times: 1101, 1103, 1106, 1109, 1119, 1122, 1123, 1125, 1130, 1131, 1133, 1133, 1134, 1135, 1135, 1136, 1139, 1140, 1142, 1150ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b337cd687226c9e120fa7d614e33be2ab6614918",
          "message": "Merge pull request #1637 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-06-13T16:57:57+09:00",
          "tree_id": "3090d070d11bd1145c52c93de9094abd5fcc2ff6",
          "url": "https://github.com/yamadashy/repomix/commit/b337cd687226c9e120fa7d614e33be2ab6614918"
        },
        "date": 1781337884986,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 528,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 513ms, Q3: 561ms\nAll times: 478, 482, 494, 494, 507, 508, 510, 513, 513, 515, 515, 517, 519, 519, 522, 528, 528, 531, 548, 553, 555, 559, 561, 561, 562, 570, 589, 592, 595, 606ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 812,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 806ms, Q3: 827ms\nAll times: 783, 786, 798, 800, 806, 806, 806, 809, 810, 811, 812, 813, 820, 821, 825, 827, 828, 838, 839, 842ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1107,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1104ms, Q3: 1122ms\nAll times: 1094, 1094, 1095, 1098, 1099, 1104, 1104, 1105, 1105, 1107, 1107, 1109, 1113, 1115, 1115, 1122, 1122, 1122, 1128, 1130ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "94912c6be9848c05c9fa5bf94c9d5061bd8946ce",
          "message": "Merge pull request #1638 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies to ^7.0.0-dev.20260606.1",
          "timestamp": "2026-06-13T17:07:55+09:00",
          "tree_id": "ab8e8b5019ebbf8dc68c14c02692363842abb64a",
          "url": "https://github.com/yamadashy/repomix/commit/94912c6be9848c05c9fa5bf94c9d5061bd8946ce"
        },
        "date": 1781338198786,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 539,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 522ms, Q3: 565ms\nAll times: 502, 511, 514, 514, 515, 520, 522, 522, 530, 530, 532, 534, 534, 534, 538, 539, 542, 549, 551, 554, 562, 563, 565, 567, 571, 590, 603, 615, 635, 651ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 779,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 771ms, Q3: 786ms\nAll times: 755, 756, 764, 766, 771, 771, 771, 773, 774, 778, 779, 779, 783, 785, 786, 786, 787, 789, 791, 797ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1093,
            "range": "±162",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1078ms, Q3: 1240ms\nAll times: 1066, 1067, 1067, 1068, 1076, 1078, 1078, 1085, 1087, 1092, 1093, 1093, 1098, 1102, 1115, 1240, 1251, 1253, 1321, 1593ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9c19926ad23b573d3f8f1cd8e2b7b46a909f87f6",
          "message": "Merge pull request #1639 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update root non-major dependencies to ^7.0.0-dev.20260606.1",
          "timestamp": "2026-06-13T17:07:59+09:00",
          "tree_id": "19bef00cab02f5c767e952dcde75738464c0aba8",
          "url": "https://github.com/yamadashy/repomix/commit/9c19926ad23b573d3f8f1cd8e2b7b46a909f87f6"
        },
        "date": 1781338413880,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 529,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 507ms, Q3: 548ms\nAll times: 486, 487, 493, 494, 498, 498, 501, 507, 519, 519, 522, 522, 523, 524, 528, 529, 533, 539, 541, 542, 545, 545, 548, 567, 586, 589, 593, 648, 681, 710ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 635,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 632ms, Q3: 644ms\nAll times: 623, 623, 624, 627, 628, 632, 634, 634, 634, 634, 635, 640, 640, 642, 643, 644, 649, 652, 657, 663ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1130,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1120ms, Q3: 1135ms\nAll times: 1112, 1114, 1114, 1116, 1119, 1120, 1123, 1124, 1126, 1126, 1130, 1132, 1133, 1134, 1134, 1135, 1156, 1158, 1161, 1175ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "915f2af824d38fe6a04eaa7885b530cfb940ce9b",
          "message": "Merge pull request #1641 from yamadashy/renovate/major-root-major-dependencies\n\nfix(deps): update root major dependencies to v15",
          "timestamp": "2026-06-13T17:35:16+09:00",
          "tree_id": "ece2c7d7f1dbbd10ee344d655b360cf0649220b9",
          "url": "https://github.com/yamadashy/repomix/commit/915f2af824d38fe6a04eaa7885b530cfb940ce9b"
        },
        "date": 1781339810056,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 478,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 473ms, Q3: 493ms\nAll times: 465, 470, 470, 471, 471, 472, 473, 473, 473, 473, 473, 473, 474, 477, 477, 478, 479, 481, 485, 487, 492, 493, 493, 494, 496, 498, 510, 513, 517, 565ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 809,
            "range": "±32",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 796ms, Q3: 828ms\nAll times: 781, 787, 788, 789, 794, 796, 801, 801, 806, 808, 809, 812, 812, 813, 816, 828, 833, 834, 878, 940ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1167,
            "range": "±49",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1151ms, Q3: 1200ms\nAll times: 1093, 1108, 1120, 1131, 1139, 1151, 1153, 1158, 1158, 1164, 1167, 1168, 1175, 1179, 1180, 1200, 1202, 1270, 1373, 1607ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d7abd413dd88adc73eb62a9c0536f41e8c6e42fa",
          "message": "Merge pull request #1628 from serhiizghama/feat/auto-detect-github-shorthand\n\nfeat(cli): auto-detect GitHub shorthand (owner/repo) in positional arguments",
          "timestamp": "2026-06-14T20:51:42+09:00",
          "tree_id": "ccf6bd0d6a35035a8f9f78612082ba91562e4a74",
          "url": "https://github.com/yamadashy/repomix/commit/d7abd413dd88adc73eb62a9c0536f41e8c6e42fa"
        },
        "date": 1781438005458,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 493,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 485ms, Q3: 525ms\nAll times: 473, 479, 482, 483, 483, 483, 484, 485, 485, 485, 487, 487, 487, 490, 492, 493, 495, 498, 509, 510, 520, 522, 525, 526, 532, 533, 537, 545, 623, 678ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 875,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 867ms, Q3: 884ms\nAll times: 862, 862, 863, 864, 865, 867, 868, 870, 871, 872, 875, 876, 877, 882, 883, 884, 884, 889, 899, 913ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1360,
            "range": "±207",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1184ms, Q3: 1391ms\nAll times: 1154, 1173, 1176, 1178, 1180, 1184, 1187, 1189, 1269, 1320, 1360, 1364, 1380, 1385, 1390, 1391, 1419, 1422, 1426, 1437ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "249b8429a1daa71a6253f0a0f2cb3544666ffd3b",
          "message": "Merge pull request #1650 from yamadashy/dependabot/npm_and_yarn/browser/npm_and_yarn-bed0206944\n\nchore(deps-dev): Bump vite from 8.0.13 to 8.0.16 in /browser in the npm_and_yarn group across 1 directory",
          "timestamp": "2026-06-18T00:01:46+09:00",
          "tree_id": "1a9f01e054bfff57462c84187281965bc2cbf7ad",
          "url": "https://github.com/yamadashy/repomix/commit/249b8429a1daa71a6253f0a0f2cb3544666ffd3b"
        },
        "date": 1781708619877,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 677,
            "range": "±167",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 566ms, Q3: 733ms\nAll times: 497, 500, 520, 523, 549, 558, 559, 566, 596, 613, 614, 636, 645, 672, 675, 677, 679, 709, 721, 722, 727, 731, 733, 736, 737, 742, 746, 767, 828, 858ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 773,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 763ms, Q3: 779ms\nAll times: 758, 759, 760, 760, 761, 763, 763, 766, 768, 769, 773, 774, 774, 777, 778, 779, 789, 844, 947, 988ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1247,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1233ms, Q3: 1263ms\nAll times: 1218, 1223, 1224, 1230, 1233, 1233, 1234, 1237, 1243, 1245, 1247, 1249, 1250, 1250, 1251, 1263, 1264, 1273, 1284, 1286ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f3741808966bdea4dda82e4e270433de8ace0a66",
          "message": "Merge pull request #1643 from yamadashy/feat/file-watch-option\n\nfeat(cli): add --watch / -w option to auto re-pack on file changes",
          "timestamp": "2026-06-18T00:13:07+09:00",
          "tree_id": "cdefc0641fa153bbef64c3f76568e7f8ed075223",
          "url": "https://github.com/yamadashy/repomix/commit/f3741808966bdea4dda82e4e270433de8ace0a66"
        },
        "date": 1781709353503,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 569,
            "range": "±93",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 528ms, Q3: 621ms\nAll times: 509, 510, 511, 511, 512, 517, 527, 528, 535, 556, 557, 557, 562, 563, 564, 569, 571, 574, 577, 593, 593, 608, 621, 623, 624, 626, 628, 643, 727, 863ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 845,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 829ms, Q3: 850ms\nAll times: 809, 818, 827, 827, 827, 829, 830, 834, 837, 837, 845, 846, 846, 849, 849, 850, 850, 855, 856, 859ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1179,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1169ms, Q3: 1191ms\nAll times: 1152, 1159, 1159, 1161, 1169, 1169, 1175, 1177, 1178, 1179, 1179, 1181, 1185, 1190, 1191, 1191, 1195, 1201, 1213, 1250ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "43cb2516173e2364bdbd05b4a5d8ef53236f97a2",
          "message": "Merge pull request #1652 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-90127496af\n\nchore(deps): Bump the npm_and_yarn group across 3 directories with 4 updates",
          "timestamp": "2026-06-18T23:47:32+09:00",
          "tree_id": "47b3c185a3979d67d18d42700c41de650dd13e3b",
          "url": "https://github.com/yamadashy/repomix/commit/43cb2516173e2364bdbd05b4a5d8ef53236f97a2"
        },
        "date": 1781794227928,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 565,
            "range": "±72",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 521ms, Q3: 593ms\nAll times: 501, 501, 505, 510, 510, 514, 518, 521, 521, 523, 535, 536, 539, 544, 548, 565, 565, 569, 570, 574, 576, 584, 593, 606, 621, 645, 656, 658, 674, 712ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 835,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 830ms, Q3: 841ms\nAll times: 821, 824, 826, 828, 830, 830, 833, 833, 834, 835, 835, 837, 837, 838, 840, 841, 843, 843, 852, 864ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1058,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1039ms, Q3: 1072ms\nAll times: 1017, 1024, 1028, 1033, 1034, 1039, 1047, 1049, 1050, 1052, 1058, 1060, 1064, 1065, 1067, 1072, 1077, 1079, 1088, 1093ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4865f5bc7cd2b8215a20c6f45ffe70c1dead699e",
          "message": "Merge pull request #1657 from yamadashy/dependabot/npm_and_yarn/browser/npm_and_yarn-3213b4e331\n\nchore(deps): Bump undici from 7.25.0 to 7.28.0 in /browser in the npm_and_yarn group across 1 directory",
          "timestamp": "2026-06-18T23:52:46+09:00",
          "tree_id": "b2fa9225e5091b54d1d184b67a4d4b8c5338dde2",
          "url": "https://github.com/yamadashy/repomix/commit/4865f5bc7cd2b8215a20c6f45ffe70c1dead699e"
        },
        "date": 1781794495363,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 851,
            "range": "±95",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 789ms, Q3: 884ms\nAll times: 745, 759, 766, 766, 767, 777, 780, 789, 797, 798, 805, 813, 819, 838, 851, 851, 853, 860, 861, 870, 880, 883, 884, 884, 897, 899, 938, 939, 948, 964ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 810,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 803ms, Q3: 817ms\nAll times: 792, 797, 797, 800, 802, 803, 805, 805, 808, 810, 810, 810, 812, 812, 816, 817, 818, 823, 826, 837ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1147,
            "range": "±135",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1130ms, Q3: 1265ms\nAll times: 1108, 1115, 1118, 1121, 1129, 1130, 1130, 1136, 1137, 1144, 1147, 1147, 1154, 1158, 1163, 1265, 1268, 1329, 1361, 1406ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "bb4ac4763faeb7fc3d31438f072a6946b5b290b9",
          "message": "1.15.0\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-19T00:19:03+09:00",
          "tree_id": "9bf73568e26cc5f0740cd3273ca86fc233183e7d",
          "url": "https://github.com/yamadashy/repomix/commit/bb4ac4763faeb7fc3d31438f072a6946b5b290b9"
        },
        "date": 1781796079842,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 688,
            "range": "±223",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 570ms, Q3: 793ms\nAll times: 514, 531, 540, 542, 553, 558, 562, 570, 601, 602, 606, 609, 619, 634, 683, 688, 719, 725, 758, 759, 766, 784, 793, 827, 832, 867, 871, 894, 907, 968ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 871,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 855ms, Q3: 880ms\nAll times: 839, 841, 843, 844, 846, 855, 856, 863, 867, 871, 871, 872, 872, 873, 874, 880, 888, 901, 933, 1116ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1234,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1222ms, Q3: 1241ms\nAll times: 1198, 1203, 1209, 1214, 1219, 1222, 1226, 1228, 1230, 1232, 1234, 1235, 1236, 1238, 1238, 1241, 1242, 1243, 1244, 1263ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "77fe4df591cb4ee61c152cb2e2fefe1738cdf610",
          "message": "Merge pull request #1649 from WilliamK112/expose-skill-project-name\n\nfeat(cli): expose skill project name option",
          "timestamp": "2026-06-20T19:35:35+09:00",
          "tree_id": "dfb48d37cc2136abc13e37c4cb6eee0bd1a36ccc",
          "url": "https://github.com/yamadashy/repomix/commit/77fe4df591cb4ee61c152cb2e2fefe1738cdf610"
        },
        "date": 1781951855263,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 536,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 517ms, Q3: 592ms\nAll times: 484, 487, 488, 488, 496, 500, 504, 517, 519, 519, 524, 527, 534, 534, 535, 536, 537, 538, 549, 553, 553, 565, 592, 620, 623, 637, 678, 684, 783, 788ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 795,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 786ms, Q3: 802ms\nAll times: 782, 783, 784, 785, 785, 786, 787, 793, 793, 794, 795, 795, 799, 799, 799, 802, 803, 803, 803, 810ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 977,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 970ms, Q3: 1018ms\nAll times: 957, 964, 966, 968, 968, 970, 971, 973, 975, 977, 977, 981, 986, 1006, 1009, 1018, 1026, 1034, 1038, 1216ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f6b8a399d627209e267f71ce01cb86aa8ef3b8ba",
          "message": "Merge pull request #1659 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-06-20T19:48:05+09:00",
          "tree_id": "d9f248edce2a7da41f036a8fae487c18e25dbd43",
          "url": "https://github.com/yamadashy/repomix/commit/f6b8a399d627209e267f71ce01cb86aa8ef3b8ba"
        },
        "date": 1781952590398,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 493,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 484ms, Q3: 509ms\nAll times: 479, 479, 479, 480, 480, 480, 483, 484, 485, 485, 486, 487, 487, 489, 491, 493, 495, 496, 502, 502, 503, 504, 509, 535, 543, 561, 577, 588, 598, 653ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 845,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 841ms, Q3: 854ms\nAll times: 826, 829, 833, 833, 835, 841, 844, 844, 844, 845, 845, 845, 847, 849, 851, 854, 861, 864, 903, 935ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1161,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1154ms, Q3: 1178ms\nAll times: 1129, 1139, 1150, 1152, 1153, 1154, 1155, 1155, 1158, 1158, 1161, 1164, 1167, 1168, 1171, 1178, 1182, 1186, 1195, 1197ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "923ae99bba1707facc2b59102da927780bce079c",
          "message": "Merge pull request #1660 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-06-20T19:49:25+09:00",
          "tree_id": "a46d3c66887507d962143c62d0b77819e13ad4d0",
          "url": "https://github.com/yamadashy/repomix/commit/923ae99bba1707facc2b59102da927780bce079c"
        },
        "date": 1781952747855,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 497,
            "range": "±30",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 486ms, Q3: 516ms\nAll times: 467, 469, 472, 482, 483, 483, 483, 486, 490, 492, 492, 493, 493, 494, 495, 497, 497, 500, 507, 507, 511, 516, 516, 526, 529, 530, 532, 549, 566, 576ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 903,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 891ms, Q3: 914ms\nAll times: 871, 873, 881, 883, 888, 891, 892, 893, 895, 901, 903, 905, 906, 907, 913, 914, 916, 918, 928, 1002ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1234,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1230ms, Q3: 1247ms\nAll times: 1212, 1213, 1216, 1221, 1227, 1230, 1230, 1231, 1232, 1233, 1234, 1238, 1239, 1240, 1241, 1247, 1249, 1252, 1283, 1298ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2028d37c06a9bb0cd17325bbf2d30cd5dd4d7140",
          "message": "Merge pull request #1664 from yamadashy/dependabot/npm_and_yarn/npm_and_yarn-f37c866118\n\nchore(deps): Bump the npm_and_yarn group across 2 directories with 1 update",
          "timestamp": "2026-06-20T21:30:04+09:00",
          "tree_id": "83b302dbf53344e7be59fbf602ebf6e6b987daca",
          "url": "https://github.com/yamadashy/repomix/commit/2028d37c06a9bb0cd17325bbf2d30cd5dd4d7140"
        },
        "date": 1781958742445,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 522,
            "range": "±60",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 504ms, Q3: 564ms\nAll times: 481, 493, 496, 501, 501, 501, 501, 504, 504, 505, 506, 510, 511, 518, 520, 522, 523, 524, 527, 528, 532, 541, 564, 569, 582, 586, 589, 600, 608, 645ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 757,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 750ms, Q3: 764ms\nAll times: 745, 747, 748, 748, 749, 750, 753, 753, 755, 756, 757, 757, 760, 761, 761, 764, 774, 776, 779, 782ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1212,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1202ms, Q3: 1220ms\nAll times: 1181, 1192, 1196, 1199, 1200, 1202, 1203, 1204, 1211, 1212, 1212, 1213, 1213, 1215, 1220, 1220, 1220, 1221, 1226, 1250ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "661a4df8df50ae8d1c872bc4f5f3063fe3ffc621",
          "message": "Merge pull request #1632 from serhiizghama/fix/file-manipulator-case-insensitive-extension\n\nfix(core): Match file extensions case-insensitively in getFileManipulator",
          "timestamp": "2026-06-20T22:30:11+09:00",
          "tree_id": "8cc750d3b6e6aa0d69634f8b040a42326fc7e418",
          "url": "https://github.com/yamadashy/repomix/commit/661a4df8df50ae8d1c872bc4f5f3063fe3ffc621"
        },
        "date": 1781962322346,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 516,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 505ms, Q3: 553ms\nAll times: 483, 484, 499, 500, 502, 503, 503, 505, 506, 508, 508, 511, 512, 513, 514, 516, 520, 520, 523, 526, 526, 539, 553, 554, 564, 575, 581, 583, 585, 707ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 883,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 879ms, Q3: 894ms\nAll times: 866, 867, 867, 875, 877, 879, 881, 882, 882, 883, 883, 885, 886, 889, 890, 894, 897, 903, 911, 928ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1479,
            "range": "±74",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1452ms, Q3: 1526ms\nAll times: 1387, 1422, 1427, 1439, 1445, 1452, 1460, 1467, 1475, 1478, 1479, 1498, 1502, 1507, 1520, 1526, 1533, 1543, 1544, 1695ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7a9833efb36c7d1156f9ad1df7de32538a1cc82a",
          "message": "Merge pull request #1665 from yamadashy/docs/file-cohesion-guideline\n\ndocs: Reframe the 250-line rule as a cohesion-review signal",
          "timestamp": "2026-06-20T23:54:09+09:00",
          "tree_id": "a3b242d39c68a8b54d4e585e796b54dd4fcd7215",
          "url": "https://github.com/yamadashy/repomix/commit/7a9833efb36c7d1156f9ad1df7de32538a1cc82a"
        },
        "date": 1781967336005,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 531,
            "range": "±48",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 507ms, Q3: 555ms\nAll times: 477, 486, 494, 495, 499, 500, 501, 507, 507, 508, 508, 509, 509, 519, 528, 531, 535, 537, 539, 543, 548, 554, 555, 571, 571, 578, 582, 600, 636, 651ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 821,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 812ms, Q3: 835ms\nAll times: 801, 806, 810, 811, 812, 812, 814, 818, 820, 821, 821, 826, 829, 832, 832, 835, 835, 838, 860, 868ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1239,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1224ms, Q3: 1245ms\nAll times: 1210, 1211, 1218, 1220, 1221, 1224, 1227, 1233, 1236, 1238, 1239, 1241, 1243, 1243, 1244, 1245, 1245, 1251, 1255, 1265ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "095d078b465eba6c9c55cc2000224918e997341c",
          "message": "Merge pull request #1646 from Samsen879/feature/path-style\n\nAdd cwd-relative output path style",
          "timestamp": "2026-06-21T13:46:18+09:00",
          "tree_id": "1e001f5743aad2c3c27c572301feb2e1686aa52a",
          "url": "https://github.com/yamadashy/repomix/commit/095d078b465eba6c9c55cc2000224918e997341c"
        },
        "date": 1782017276355,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 582,
            "range": "±132",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 524ms, Q3: 656ms\nAll times: 498, 502, 517, 517, 518, 520, 522, 524, 533, 541, 542, 559, 565, 571, 576, 582, 599, 599, 629, 645, 653, 654, 656, 658, 701, 711, 827, 868, 872, 936ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 769,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 754ms, Q3: 776ms\nAll times: 746, 750, 750, 750, 751, 754, 754, 759, 760, 761, 769, 769, 770, 770, 773, 776, 779, 785, 794, 805ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1141,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1130ms, Q3: 1154ms\nAll times: 1101, 1117, 1121, 1126, 1128, 1130, 1137, 1137, 1138, 1139, 1141, 1142, 1143, 1148, 1151, 1154, 1160, 1162, 1167, 1181ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f04db0088ec00969436a0878bdae8f43176f9e11",
          "message": "Merge pull request #1631 from Samsen879/codex/fix-remote-split-output-copy\n\nfix(cli): copy split output files after remote packing",
          "timestamp": "2026-06-22T00:15:00+09:00",
          "tree_id": "912dc1acf2d96ef0ce452465fe8818ad2ab58688",
          "url": "https://github.com/yamadashy/repomix/commit/f04db0088ec00969436a0878bdae8f43176f9e11"
        },
        "date": 1782055021770,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 534,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 517ms, Q3: 551ms\nAll times: 503, 503, 510, 510, 512, 513, 515, 517, 519, 520, 522, 526, 526, 528, 530, 534, 534, 534, 541, 547, 551, 551, 551, 555, 556, 570, 587, 599, 600, 633ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 882,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 877ms, Q3: 902ms\nAll times: 862, 864, 870, 875, 876, 877, 878, 879, 881, 882, 882, 898, 900, 900, 902, 902, 904, 905, 909, 909ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1491,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1482ms, Q3: 1511ms\nAll times: 1462, 1469, 1470, 1471, 1481, 1482, 1483, 1484, 1486, 1487, 1491, 1493, 1500, 1505, 1506, 1511, 1512, 1535, 1543, 1570ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a6605f5f436dda649a103a39477ec542da3320ce",
          "message": "Merge pull request #1671 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-06-27T17:53:50+09:00",
          "tree_id": "461e40bc2feaf5535eb696a1f1a7c734860f528d",
          "url": "https://github.com/yamadashy/repomix/commit/a6605f5f436dda649a103a39477ec542da3320ce"
        },
        "date": 1782550627144,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 491,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 485ms, Q3: 502ms\nAll times: 473, 476, 483, 483, 484, 484, 485, 485, 486, 486, 487, 488, 488, 489, 490, 491, 493, 495, 495, 495, 501, 501, 502, 505, 518, 521, 522, 553, 568, 574ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 764,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 754ms, Q3: 768ms\nAll times: 747, 753, 753, 753, 754, 754, 756, 761, 761, 762, 764, 764, 766, 767, 767, 768, 779, 779, 780, 783ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1434,
            "range": "±35",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1418ms, Q3: 1453ms\nAll times: 1402, 1405, 1411, 1416, 1417, 1418, 1418, 1428, 1429, 1431, 1434, 1435, 1441, 1447, 1451, 1453, 1456, 1458, 1461, 1464ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7b0cfa387990230edd5b729e3e2257aba9526ace",
          "message": "Merge pull request #1673 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update root non-major dependencies",
          "timestamp": "2026-06-27T21:23:49+09:00",
          "tree_id": "edb5e18cf7f52c74011d4b7d602a6082936d4ff6",
          "url": "https://github.com/yamadashy/repomix/commit/7b0cfa387990230edd5b729e3e2257aba9526ace"
        },
        "date": 1782563129007,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 501,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 496ms, Q3: 515ms\nAll times: 487, 489, 490, 490, 494, 495, 495, 496, 497, 497, 498, 499, 499, 500, 500, 501, 501, 501, 506, 507, 512, 514, 515, 516, 519, 525, 526, 544, 578, 602ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 499,
            "range": "±78",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 491ms, Q3: 569ms\nAll times: 473, 480, 480, 484, 489, 491, 491, 492, 492, 493, 499, 506, 507, 508, 548, 569, 611, 612, 630, 709ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1231,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1218ms, Q3: 1258ms\nAll times: 1203, 1204, 1214, 1215, 1215, 1218, 1221, 1222, 1225, 1230, 1231, 1236, 1240, 1255, 1256, 1258, 1266, 1270, 1371, 1434ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cc06cb0e12586fdf00e06965fd9cf0938273efdc",
          "message": "Merge pull request #1674 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260620.1",
          "timestamp": "2026-06-27T22:10:57+09:00",
          "tree_id": "5912c944996b003718d38b05db8279ee35b30bc2",
          "url": "https://github.com/yamadashy/repomix/commit/cc06cb0e12586fdf00e06965fd9cf0938273efdc"
        },
        "date": 1782565944556,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 787,
            "range": "±145",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 721ms, Q3: 866ms\nAll times: 605, 615, 615, 618, 664, 709, 715, 721, 733, 756, 759, 760, 764, 786, 787, 787, 799, 819, 820, 828, 828, 841, 866, 871, 905, 950, 951, 984, 986, 1030ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 876,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 870ms, Q3: 890ms\nAll times: 846, 854, 868, 868, 870, 870, 872, 873, 875, 875, 876, 877, 883, 884, 889, 890, 892, 893, 893, 909ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1220,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1212ms, Q3: 1235ms\nAll times: 1191, 1201, 1204, 1208, 1208, 1212, 1212, 1218, 1218, 1219, 1220, 1227, 1227, 1231, 1231, 1235, 1242, 1245, 1245, 1250ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c104402a22fee4ffa6b9e3885d6fdf144476d8b6",
          "message": "Merge pull request #1670 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-06-27T22:12:38+09:00",
          "tree_id": "3a7ba3763a40c863fd3bb6c658cf8da12a855943",
          "url": "https://github.com/yamadashy/repomix/commit/c104402a22fee4ffa6b9e3885d6fdf144476d8b6"
        },
        "date": 1782566040763,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 569,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 528ms, Q3: 616ms\nAll times: 490, 499, 507, 510, 510, 517, 521, 528, 530, 532, 533, 537, 559, 564, 565, 569, 576, 589, 601, 602, 610, 615, 616, 623, 629, 633, 643, 657, 659, 662ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 852,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 842ms, Q3: 864ms\nAll times: 833, 835, 839, 840, 840, 842, 844, 849, 850, 851, 852, 854, 856, 859, 862, 864, 866, 876, 889, 989ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1215,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1207ms, Q3: 1227ms\nAll times: 1195, 1200, 1201, 1204, 1206, 1207, 1208, 1210, 1213, 1215, 1215, 1220, 1223, 1225, 1225, 1227, 1232, 1236, 1243, 1244ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5f94efc87852dce44731ca9461e2e38847006375",
          "message": "Merge pull request #1676 from yamadashy/chore/remove-homebrew-autobump-workflow\n\nchore(ci): Remove redundant Homebrew bump workflow",
          "timestamp": "2026-06-27T23:31:33+09:00",
          "tree_id": "532d0ad17d9ba066d929e4cc3757ef33ee9f4d42",
          "url": "https://github.com/yamadashy/repomix/commit/5f94efc87852dce44731ca9461e2e38847006375"
        },
        "date": 1782570796405,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 506,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 490ms, Q3: 527ms\nAll times: 483, 485, 486, 486, 489, 489, 489, 490, 491, 495, 495, 496, 501, 501, 504, 506, 507, 508, 512, 517, 517, 518, 527, 533, 538, 547, 548, 549, 551, 556ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 902,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 886ms, Q3: 909ms\nAll times: 875, 880, 880, 882, 883, 886, 892, 894, 900, 900, 902, 905, 907, 908, 909, 909, 915, 917, 926, 936ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 787,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 781ms, Q3: 792ms\nAll times: 778, 779, 780, 780, 781, 781, 782, 785, 785, 786, 787, 787, 789, 789, 790, 792, 793, 795, 796, 806ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "51c03e9ef6bd519bc5b144f7420d5e4b2d845508",
          "message": "Merge pull request #1653 from PMDevSolutions/feat/output-patterns-inclusion-level\n\nfeat(output): add per-file inclusion levels (output.patterns)",
          "timestamp": "2026-06-28T18:38:56+09:00",
          "tree_id": "a4040f3a93e059bf8d03b8838acb0299cc5252fe",
          "url": "https://github.com/yamadashy/repomix/commit/51c03e9ef6bd519bc5b144f7420d5e4b2d845508"
        },
        "date": 1782639627844,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 515,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 505ms, Q3: 523ms\nAll times: 493, 499, 499, 501, 501, 502, 502, 505, 506, 511, 512, 513, 514, 514, 514, 515, 515, 517, 518, 518, 519, 520, 523, 528, 533, 540, 540, 553, 555, 581ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 869,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 862ms, Q3: 877ms\nAll times: 827, 853, 854, 855, 861, 862, 864, 865, 866, 868, 869, 870, 871, 875, 876, 877, 887, 891, 893, 893ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1222,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1213ms, Q3: 1229ms\nAll times: 1191, 1201, 1202, 1211, 1211, 1213, 1213, 1215, 1216, 1217, 1222, 1223, 1223, 1224, 1224, 1229, 1235, 1238, 1241, 1248ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "acb4e9f72606ac9f08eee1719ef40f7e54739f18",
          "message": "Merge pull request #1679 from yamadashy/fix/compress-graceful-degradation\n\nfix(core): fall back to uncompressed content when tree-sitter compression fails",
          "timestamp": "2026-06-29T00:28:08+09:00",
          "tree_id": "3158e9d25099bbb6695afac4fdac48406e6d67a5",
          "url": "https://github.com/yamadashy/repomix/commit/acb4e9f72606ac9f08eee1719ef40f7e54739f18"
        },
        "date": 1782660592092,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 808,
            "range": "±106",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 747ms, Q3: 853ms\nAll times: 640, 649, 681, 706, 723, 741, 742, 747, 755, 761, 763, 786, 797, 800, 802, 808, 815, 819, 821, 831, 836, 842, 853, 854, 858, 859, 868, 887, 897, 949ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 801,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 793ms, Q3: 811ms\nAll times: 781, 789, 790, 790, 792, 793, 794, 794, 799, 799, 801, 802, 805, 806, 810, 811, 811, 812, 815, 816ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1220,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1209ms, Q3: 1225ms\nAll times: 1190, 1204, 1205, 1207, 1208, 1209, 1211, 1213, 1215, 1216, 1220, 1220, 1221, 1223, 1224, 1225, 1230, 1235, 1253, 1260ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "e98afd55061dce37dc6070fc98bb61218939fdf8",
          "message": "1.16.0",
          "timestamp": "2026-06-29T23:18:24+09:00",
          "tree_id": "3d1abdb7c12d7378ac93d2540bf91f07890a4577",
          "url": "https://github.com/yamadashy/repomix/commit/e98afd55061dce37dc6070fc98bb61218939fdf8"
        },
        "date": 1782742831498,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 623,
            "range": "±58",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 609ms, Q3: 667ms\nAll times: 565, 590, 592, 600, 603, 605, 605, 609, 614, 617, 620, 620, 621, 622, 622, 623, 625, 630, 643, 658, 659, 666, 667, 670, 674, 677, 683, 687, 689, 698ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 861,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 844ms, Q3: 884ms\nAll times: 831, 840, 843, 843, 843, 844, 847, 854, 857, 861, 861, 862, 864, 871, 882, 884, 884, 885, 885, 887ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1295,
            "range": "±41",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1273ms, Q3: 1314ms\nAll times: 1236, 1263, 1263, 1268, 1269, 1273, 1274, 1277, 1288, 1292, 1295, 1296, 1302, 1303, 1306, 1314, 1322, 1334, 1450, 1751ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7876cf7eb1bbe46a5042b07405edf81aa0e6626e",
          "message": "Merge pull request #1684 from yamadashy/ci/schema-update-github-token\n\nci(schema): Use GITHUB_TOKEN instead of COMMITTER_TOKEN for schema PR",
          "timestamp": "2026-06-29T23:49:33+09:00",
          "tree_id": "affcc6bcc501b9519332cba2d264a38615e03d04",
          "url": "https://github.com/yamadashy/repomix/commit/7876cf7eb1bbe46a5042b07405edf81aa0e6626e"
        },
        "date": 1782744688278,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1098,
            "range": "±201",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 1007ms, Q3: 1208ms\nAll times: 893, 901, 923, 930, 936, 967, 980, 1007, 1030, 1041, 1052, 1069, 1075, 1084, 1086, 1098, 1121, 1126, 1134, 1164, 1168, 1174, 1208, 1220, 1223, 1230, 1238, 1429, 1491, 1571ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 826,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 820ms, Q3: 837ms\nAll times: 813, 815, 816, 817, 818, 820, 820, 821, 822, 824, 826, 827, 829, 829, 833, 837, 839, 845, 851, 858ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1219,
            "range": "±124",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1202ms, Q3: 1326ms\nAll times: 1183, 1183, 1187, 1199, 1200, 1202, 1204, 1207, 1211, 1216, 1219, 1222, 1227, 1235, 1251, 1326, 1331, 1333, 1335, 1348ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6873d5212227998a4de7395744acc1f2d894cc20",
          "message": "Merge pull request #1681 from isaka1022/fix/tree-sitter-memory-leak\n\nfix(core): free web-tree-sitter Tree after parsing to avoid WASM heap leak",
          "timestamp": "2026-06-30T23:42:43+09:00",
          "tree_id": "e918b1347dd141aba65698cecfcfda6a0bdaa176",
          "url": "https://github.com/yamadashy/repomix/commit/6873d5212227998a4de7395744acc1f2d894cc20"
        },
        "date": 1782830719005,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 805,
            "range": "±137",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 751ms, Q3: 888ms\nAll times: 650, 662, 664, 673, 710, 723, 747, 751, 776, 783, 785, 788, 794, 795, 798, 805, 811, 818, 829, 873, 875, 887, 888, 906, 912, 950, 1032, 1049, 1219, 1266ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 923,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 909ms, Q3: 935ms\nAll times: 876, 901, 901, 907, 908, 909, 913, 914, 916, 921, 923, 926, 928, 932, 935, 935, 936, 938, 943, 956ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1443,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1433ms, Q3: 1456ms\nAll times: 1416, 1418, 1421, 1424, 1428, 1433, 1434, 1436, 1438, 1440, 1443, 1445, 1453, 1453, 1453, 1456, 1457, 1468, 1505, 1512ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "083e31b65a489a774e8ab16965692ff05619f8f2",
          "message": "Merge pull request #1683 from serhiizghama/fix/strip-comments-esm-cjs-extensions\n\nfix(core): strip comments from .mjs/.cjs/.mts/.cts files",
          "timestamp": "2026-07-02T00:10:02+09:00",
          "tree_id": "978d271e2a7498e7e596f1e212ae667005f92367",
          "url": "https://github.com/yamadashy/repomix/commit/083e31b65a489a774e8ab16965692ff05619f8f2"
        },
        "date": 1782918744833,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 784,
            "range": "±177",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 670ms, Q3: 847ms\nAll times: 563, 576, 584, 618, 636, 650, 664, 670, 697, 703, 731, 743, 764, 769, 774, 784, 793, 796, 797, 812, 837, 839, 847, 854, 879, 931, 938, 989, 1021, 1120ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 849,
            "range": "±50",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 837ms, Q3: 887ms\nAll times: 825, 826, 829, 835, 836, 837, 837, 846, 846, 848, 849, 850, 850, 864, 883, 887, 944, 964, 979, 996ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1246,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1228ms, Q3: 1283ms\nAll times: 1220, 1221, 1223, 1225, 1226, 1228, 1232, 1233, 1235, 1238, 1246, 1247, 1265, 1272, 1275, 1283, 1296, 1297, 1303, 1308ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9a3962779163344f20eba7037bb8bfd91d13f186",
          "message": "Merge pull request #1693 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-07-04T18:18:31+09:00",
          "tree_id": "36a2baa7dc0422c6ce906e881449655741d88e86",
          "url": "https://github.com/yamadashy/repomix/commit/9a3962779163344f20eba7037bb8bfd91d13f186"
        },
        "date": 1783156872363,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 500,
            "range": "±18",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 494ms, Q3: 512ms\nAll times: 467, 472, 478, 485, 486, 488, 490, 494, 494, 495, 495, 496, 498, 499, 499, 500, 501, 502, 504, 504, 504, 505, 512, 516, 521, 526, 526, 557, 564, 565ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 830,
            "range": "±42",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 815ms, Q3: 857ms\nAll times: 810, 810, 811, 813, 814, 815, 818, 818, 826, 827, 830, 833, 835, 843, 852, 857, 860, 864, 874, 878ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1196,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1188ms, Q3: 1201ms\nAll times: 1173, 1177, 1179, 1185, 1187, 1188, 1188, 1191, 1195, 1196, 1196, 1197, 1198, 1200, 1200, 1201, 1224, 1225, 1228, 1239ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bd992f56b3ab39f4b85bc2800d3ae5fc93bd4354",
          "message": "Merge pull request #1695 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-07-04T18:18:39+09:00",
          "tree_id": "9dc11ad9b62c344c99570d6e84abd05f29f0f77f",
          "url": "https://github.com/yamadashy/repomix/commit/bd992f56b3ab39f4b85bc2800d3ae5fc93bd4354"
        },
        "date": 1783156970781,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 495,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 486ms, Q3: 505ms\nAll times: 480, 480, 480, 482, 484, 485, 485, 486, 487, 488, 490, 490, 490, 491, 494, 495, 499, 500, 500, 501, 502, 503, 505, 513, 515, 519, 558, 569, 577, 595ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 881,
            "range": "±12",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 876ms, Q3: 888ms\nAll times: 862, 863, 873, 873, 874, 876, 877, 878, 878, 881, 881, 883, 884, 884, 887, 888, 898, 905, 916, 979ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1060,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1047ms, Q3: 1083ms\nAll times: 1026, 1037, 1038, 1041, 1041, 1047, 1052, 1053, 1059, 1060, 1060, 1064, 1065, 1067, 1070, 1083, 1085, 1086, 1104, 1122ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3d93fafbef96bfb0398e482dd04c83db09aca26b",
          "message": "Merge pull request #1692 from yamadashy/renovate/github-actions-non-major-dependencies\n\nchore(deps): update github-actions non-major dependencies",
          "timestamp": "2026-07-04T18:23:10+09:00",
          "tree_id": "eb2ab748938218d25b017206be604ecb9988ee13",
          "url": "https://github.com/yamadashy/repomix/commit/3d93fafbef96bfb0398e482dd04c83db09aca26b"
        },
        "date": 1783157090621,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1078,
            "range": "±146",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 989ms, Q3: 1135ms\nAll times: 857, 908, 924, 926, 974, 977, 984, 989, 1020, 1023, 1025, 1026, 1034, 1046, 1052, 1078, 1094, 1094, 1101, 1101, 1110, 1132, 1135, 1139, 1144, 1155, 1159, 1162, 1199, 1409ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 915,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 909ms, Q3: 929ms\nAll times: 903, 903, 906, 908, 908, 909, 910, 913, 914, 915, 915, 916, 918, 924, 929, 929, 930, 935, 951, 975ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1150,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1145ms, Q3: 1156ms\nAll times: 1129, 1129, 1131, 1140, 1141, 1145, 1145, 1146, 1146, 1146, 1150, 1151, 1155, 1155, 1156, 1156, 1158, 1160, 1169, 1175ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb1c6dd77d29215d16fa5de4ebf77c055006aaa9",
          "message": "Merge pull request #1696 from yamadashy/renovate/major-github-actions-major-dependencies\n\nchore(deps): update github-actions major dependencies to v7",
          "timestamp": "2026-07-04T18:23:35+09:00",
          "tree_id": "fb07a8a43c641f1da81002b89197bfeaf3403251",
          "url": "https://github.com/yamadashy/repomix/commit/eb1c6dd77d29215d16fa5de4ebf77c055006aaa9"
        },
        "date": 1783157205521,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 508,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 504ms, Q3: 518ms\nAll times: 489, 494, 496, 499, 501, 501, 503, 504, 504, 505, 505, 507, 507, 507, 508, 508, 511, 512, 512, 513, 513, 515, 518, 520, 522, 523, 530, 531, 560, 576ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 874,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 863ms, Q3: 888ms\nAll times: 848, 854, 858, 860, 861, 863, 865, 866, 868, 872, 874, 875, 880, 885, 885, 888, 891, 892, 897, 906ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1127,
            "range": "±11",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1121ms, Q3: 1132ms\nAll times: 1106, 1109, 1113, 1115, 1120, 1121, 1122, 1123, 1124, 1124, 1127, 1128, 1129, 1132, 1132, 1132, 1135, 1137, 1154, 1165ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ea6fccb963c4109e80220557667e61b055a10b56",
          "message": "Merge pull request #1690 from yamadashy/dependabot/npm_and_yarn/browser/npm_and_yarn-3213b4e331\n\nchore(deps): Bump undici from 7.27.2 to 7.28.0 in /browser in the npm_and_yarn group across 1 directory",
          "timestamp": "2026-07-04T18:27:38+09:00",
          "tree_id": "6c6d81a595433d65a1b9a2e7bdfb31145ebe7afa",
          "url": "https://github.com/yamadashy/repomix/commit/ea6fccb963c4109e80220557667e61b055a10b56"
        },
        "date": 1783157353796,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 505,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 493ms, Q3: 516ms\nAll times: 482, 488, 489, 490, 490, 492, 492, 493, 494, 495, 497, 497, 501, 504, 504, 505, 508, 509, 509, 512, 513, 514, 516, 522, 536, 536, 549, 551, 552, 563ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 882,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 870ms, Q3: 891ms\nAll times: 860, 863, 865, 866, 870, 870, 872, 874, 878, 879, 882, 883, 884, 887, 890, 891, 891, 892, 892, 899ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1237,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1231ms, Q3: 1252ms\nAll times: 1198, 1203, 1215, 1223, 1229, 1231, 1231, 1232, 1235, 1237, 1237, 1239, 1239, 1240, 1241, 1252, 1253, 1254, 1258, 1262ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d4ab9fcad996d81558538381a0022244f687e7b2",
          "message": "Merge pull request #1697 from yamadashy/fix/zizmor-adhoc-packages-ignore\n\nchore(ci): Ignore adhoc-packages zizmor findings for intentional installs",
          "timestamp": "2026-07-04T22:13:11+09:00",
          "tree_id": "96b75e96b4a67e49e67c3ff735761271a2238fb4",
          "url": "https://github.com/yamadashy/repomix/commit/d4ab9fcad996d81558538381a0022244f687e7b2"
        },
        "date": 1783170924327,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 533,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 526ms, Q3: 552ms\nAll times: 510, 514, 516, 516, 518, 519, 520, 526, 526, 527, 527, 530, 531, 531, 532, 533, 536, 536, 543, 543, 548, 552, 552, 552, 552, 557, 560, 577, 604, 606ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 867,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 854ms, Q3: 874ms\nAll times: 839, 841, 849, 854, 854, 854, 855, 856, 857, 863, 867, 867, 869, 873, 874, 874, 877, 879, 881, 891ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1188,
            "range": "±33",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1175ms, Q3: 1208ms\nAll times: 1169, 1169, 1170, 1172, 1174, 1175, 1178, 1180, 1182, 1183, 1188, 1190, 1191, 1192, 1202, 1208, 1213, 1264, 1368, 1577ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f9befb06c690d1f20d66e868fc9def8e4886947a",
          "message": "Merge pull request #1698 from yamadashy/chore/renovate-weekend-schedule\n\nchore(renovate): Extend schedule to full weekend window",
          "timestamp": "2026-07-04T22:57:41+09:00",
          "tree_id": "11a90c9621886194d7802ce27072bdf79e62c25f",
          "url": "https://github.com/yamadashy/repomix/commit/f9befb06c690d1f20d66e868fc9def8e4886947a"
        },
        "date": 1783173571671,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 582,
            "range": "±140",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 541ms, Q3: 681ms\nAll times: 517, 519, 534, 535, 539, 540, 540, 541, 546, 552, 560, 561, 563, 571, 571, 582, 612, 627, 630, 645, 673, 680, 681, 779, 798, 845, 860, 948, 980, 1123ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 916,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 907ms, Q3: 944ms\nAll times: 888, 896, 896, 901, 902, 907, 911, 912, 913, 913, 916, 928, 931, 933, 944, 944, 946, 956, 958, 980ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1277,
            "range": "±62",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1263ms, Q3: 1325ms\nAll times: 1237, 1241, 1250, 1255, 1262, 1263, 1266, 1271, 1276, 1277, 1277, 1278, 1283, 1297, 1301, 1325, 1330, 1356, 1398, 1400ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "959319230117821ea7fbd2b03ea484849f60c6fd",
          "message": "Merge pull request #1705 from yamadashy/docs/agent-rules-best-practices\n\ndocs(config): Restructure agent rules per Claude Code best practices",
          "timestamp": "2026-07-05T22:22:10+09:00",
          "tree_id": "41e0db34ec95323d110bcec4dc6b97ece2efca9b",
          "url": "https://github.com/yamadashy/repomix/commit/959319230117821ea7fbd2b03ea484849f60c6fd"
        },
        "date": 1783257814504,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 507,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 502ms, Q3: 517ms\nAll times: 481, 494, 495, 498, 499, 499, 501, 502, 503, 504, 504, 504, 505, 506, 506, 507, 508, 515, 516, 516, 516, 516, 517, 518, 522, 525, 527, 553, 578, 589ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 875,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 867ms, Q3: 884ms\nAll times: 846, 856, 857, 864, 865, 867, 868, 873, 874, 874, 875, 876, 877, 879, 879, 884, 888, 891, 922, 922ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1054,
            "range": "±13",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1049ms, Q3: 1062ms\nAll times: 1033, 1046, 1046, 1048, 1048, 1049, 1049, 1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1062, 1065, 1071, 1074, 1079ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9fabcb67035ecc73a6d7622f0938f7ac5f26b7e4",
          "message": "Merge pull request #1699 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-07-05T22:40:06+09:00",
          "tree_id": "2c43e709d71463164d88c16f4f1e0fb4534e0b41",
          "url": "https://github.com/yamadashy/repomix/commit/9fabcb67035ecc73a6d7622f0938f7ac5f26b7e4"
        },
        "date": 1783258967974,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 819,
            "range": "±100",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 783ms, Q3: 883ms\nAll times: 724, 737, 761, 767, 771, 773, 774, 783, 788, 792, 793, 808, 813, 815, 818, 819, 825, 826, 830, 840, 840, 877, 883, 890, 903, 909, 935, 954, 961, 988ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 904,
            "range": "±27",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 894ms, Q3: 921ms\nAll times: 873, 874, 880, 887, 888, 894, 895, 896, 897, 902, 904, 906, 906, 908, 914, 921, 923, 926, 931, 1046ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1364,
            "range": "±75",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1341ms, Q3: 1416ms\nAll times: 1302, 1311, 1314, 1318, 1325, 1341, 1348, 1352, 1353, 1363, 1364, 1370, 1370, 1379, 1388, 1416, 1435, 1463, 1521, 1534ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ad1d80c98ee31b98a2f0db4db5dfb80ae5dd5202",
          "message": "Merge pull request #1701 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260628.1",
          "timestamp": "2026-07-05T22:40:26+09:00",
          "tree_id": "695881816c4d25822ce18aa14c2fb7c8d46f4cd7",
          "url": "https://github.com/yamadashy/repomix/commit/ad1d80c98ee31b98a2f0db4db5dfb80ae5dd5202"
        },
        "date": 1783259072300,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 840,
            "range": "±150",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 747ms, Q3: 897ms\nAll times: 568, 620, 642, 656, 668, 686, 690, 747, 750, 794, 795, 798, 801, 805, 820, 840, 854, 863, 868, 873, 877, 877, 897, 923, 927, 966, 997, 1027, 1072, 1152ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 883,
            "range": "±34",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 875ms, Q3: 909ms\nAll times: 861, 866, 871, 873, 874, 875, 875, 876, 877, 880, 883, 890, 891, 892, 903, 909, 911, 911, 915, 917ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1244,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1231ms, Q3: 1252ms\nAll times: 1209, 1220, 1228, 1230, 1231, 1231, 1233, 1236, 1241, 1244, 1244, 1247, 1247, 1251, 1251, 1252, 1256, 1263, 1263, 1292ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3260a29b728a4b49f48e4a5dc9c5d972b3a09784",
          "message": "Merge pull request #1709 from kongyo2/claude/repomix-refactor-analysis-vr7q20\n\nrefactor: Remove duplicate code found by similarity analysis",
          "timestamp": "2026-07-09T22:35:14+09:00",
          "tree_id": "8929fd3df5e0a4c596aa82cb74c6f5cef35638f6",
          "url": "https://github.com/yamadashy/repomix/commit/3260a29b728a4b49f48e4a5dc9c5d972b3a09784"
        },
        "date": 1783604225635,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 568,
            "range": "±70",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 530ms, Q3: 600ms\nAll times: 482, 509, 510, 516, 522, 524, 525, 530, 530, 539, 545, 548, 553, 556, 562, 568, 570, 577, 578, 589, 598, 599, 600, 601, 622, 626, 637, 662, 815, 900ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 857,
            "range": "±71",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 845ms, Q3: 916ms\nAll times: 836, 837, 841, 841, 841, 845, 845, 851, 855, 855, 857, 862, 865, 867, 883, 916, 970, 979, 993, 1014ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1226,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1222ms, Q3: 1245ms\nAll times: 1204, 1211, 1211, 1215, 1219, 1222, 1222, 1223, 1225, 1225, 1226, 1228, 1235, 1239, 1242, 1245, 1281, 1309, 1421, 1615ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "855217d4b93eff9949db858f0ea8286533b326ee",
          "message": "Merge pull request #1710 from serhiizghama/fix/token-count-tree-underscore-dirs\n\nfix(core): Count underscore-prefixed directories in token count tree",
          "timestamp": "2026-07-09T23:47:56+09:00",
          "tree_id": "2ee9326c87f4fe91cb6e772d9917ba85a1f88be0",
          "url": "https://github.com/yamadashy/repomix/commit/855217d4b93eff9949db858f0ea8286533b326ee"
        },
        "date": 1783608698904,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 779,
            "range": "±140",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 695ms, Q3: 835ms\nAll times: 598, 619, 639, 639, 654, 667, 689, 695, 707, 709, 730, 730, 746, 748, 766, 779, 790, 792, 795, 801, 811, 817, 835, 842, 844, 881, 941, 982, 1062, 1083ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 908,
            "range": "±23",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 894ms, Q3: 917ms\nAll times: 858, 889, 891, 892, 892, 894, 896, 897, 904, 908, 908, 909, 910, 910, 911, 917, 919, 922, 926, 939ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1165,
            "range": "±29",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1156ms, Q3: 1185ms\nAll times: 1136, 1141, 1148, 1149, 1152, 1156, 1158, 1158, 1161, 1163, 1165, 1167, 1175, 1184, 1184, 1185, 1186, 1190, 1228, 1239ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ab81efd8e7e99bc3ae3a897d89e0790e4c999f4f",
          "message": "Merge pull request #1711 from yamadashy/refactor/token-count-tree-typing\n\nrefactor(core): Use a discriminated node type for the token count tree",
          "timestamp": "2026-07-10T00:31:04+09:00",
          "tree_id": "04196f6bc36e5c76dfe9ee93e97446575d697fa5",
          "url": "https://github.com/yamadashy/repomix/commit/ab81efd8e7e99bc3ae3a897d89e0790e4c999f4f"
        },
        "date": 1783611251584,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 1098,
            "range": "±273",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 944ms, Q3: 1217ms\nAll times: 755, 763, 773, 773, 777, 834, 935, 944, 948, 950, 971, 1025, 1025, 1063, 1091, 1098, 1124, 1150, 1168, 1190, 1194, 1215, 1217, 1217, 1242, 1306, 1309, 1384, 1414, 1414ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 654,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 649ms, Q3: 666ms\nAll times: 640, 643, 646, 647, 649, 649, 651, 651, 652, 653, 654, 654, 655, 658, 666, 666, 669, 671, 673, 673ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1187,
            "range": "±37",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1171ms, Q3: 1208ms\nAll times: 1129, 1133, 1142, 1162, 1164, 1171, 1181, 1184, 1186, 1186, 1187, 1189, 1191, 1195, 1196, 1208, 1210, 1222, 1250, 1302ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b4ffba053288a5d9fb344c0037d1e6a26d340210",
          "message": "Merge pull request #1713 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-07-11T19:09:10+09:00",
          "tree_id": "c9fad175d9cbc7ef5264419bab822eebff5ce87d",
          "url": "https://github.com/yamadashy/repomix/commit/b4ffba053288a5d9fb344c0037d1e6a26d340210"
        },
        "date": 1783764669770,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 909,
            "range": "±165",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 822ms, Q3: 987ms\nAll times: 732, 763, 792, 803, 806, 810, 821, 822, 841, 850, 878, 887, 892, 897, 907, 909, 911, 920, 945, 955, 981, 982, 987, 989, 994, 1034, 1048, 1057, 1090, 1220ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 641,
            "range": "±9",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 637ms, Q3: 646ms\nAll times: 628, 632, 632, 633, 635, 637, 638, 639, 639, 640, 641, 642, 643, 644, 646, 646, 648, 649, 652, 657ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1205,
            "range": "±45",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1196ms, Q3: 1241ms\nAll times: 1185, 1187, 1187, 1189, 1189, 1196, 1200, 1201, 1202, 1205, 1205, 1216, 1220, 1229, 1233, 1241, 1242, 1248, 1353, 1354ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5edc73c6f1656c7137f56af783c3e14293a5382e",
          "message": "Merge pull request #1715 from yamadashy/renovate/root-non-major-dependencies\n\nfix(deps): update root non-major dependencies",
          "timestamp": "2026-07-11T19:09:16+09:00",
          "tree_id": "c60c010f51fe6d7e5358f4b3d405814fa04bdf40",
          "url": "https://github.com/yamadashy/repomix/commit/5edc73c6f1656c7137f56af783c3e14293a5382e"
        },
        "date": 1783764793584,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 526,
            "range": "±40",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 514ms, Q3: 554ms\nAll times: 500, 501, 503, 505, 505, 506, 510, 514, 517, 517, 517, 517, 518, 520, 520, 526, 526, 529, 532, 533, 538, 544, 554, 562, 563, 603, 673, 674, 858, 864ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 827,
            "range": "±25",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 819ms, Q3: 844ms\nAll times: 810, 812, 813, 814, 817, 819, 819, 821, 825, 827, 827, 829, 830, 838, 840, 844, 845, 845, 845, 863ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1260,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1254ms, Q3: 1276ms\nAll times: 1239, 1243, 1247, 1251, 1252, 1254, 1254, 1258, 1258, 1259, 1260, 1261, 1261, 1265, 1273, 1276, 1278, 1280, 1287, 1301ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "babe80e6cf1825f05b962022df13c6546623bfcf",
          "message": "Merge pull request #1712 from serhiizghama/fix/tree-sort-posix-separator\n\nfix(core): split file paths on the POSIX separator so the tree doesn't collapse on Windows",
          "timestamp": "2026-07-11T20:40:57+09:00",
          "tree_id": "b037d61e67268064b92de1fd202a075cb04cef1d",
          "url": "https://github.com/yamadashy/repomix/commit/babe80e6cf1825f05b962022df13c6546623bfcf"
        },
        "date": 1783770178157,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 805,
            "range": "±215",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 660ms, Q3: 875ms\nAll times: 567, 581, 599, 621, 629, 637, 652, 660, 669, 681, 706, 716, 726, 766, 786, 805, 822, 828, 846, 853, 861, 863, 875, 884, 889, 907, 921, 944, 983, 1034ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 871,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 864ms, Q3: 881ms\nAll times: 849, 856, 862, 862, 863, 864, 864, 866, 867, 867, 871, 872, 877, 879, 880, 881, 889, 890, 902, 941ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1241,
            "range": "±233",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1221ms, Q3: 1454ms\nAll times: 1189, 1193, 1193, 1200, 1201, 1221, 1227, 1233, 1234, 1235, 1241, 1243, 1259, 1267, 1297, 1454, 1463, 1503, 1531, 1534ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "0747096087e69c5b94e82393a2ce085132f55b79",
          "message": "1.16.1",
          "timestamp": "2026-07-11T21:00:15+09:00",
          "tree_id": "022b3fed11277241df7dcd921fb2b00ae3d4c795",
          "url": "https://github.com/yamadashy/repomix/commit/0747096087e69c5b94e82393a2ce085132f55b79"
        },
        "date": 1783771435631,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 801,
            "range": "±216",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 726ms, Q3: 942ms\nAll times: 596, 602, 644, 645, 653, 686, 697, 726, 727, 740, 755, 771, 781, 790, 792, 801, 803, 808, 893, 909, 918, 936, 942, 956, 968, 983, 1000, 1104, 1129, 1185ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 661,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 650ms, Q3: 670ms\nAll times: 633, 637, 638, 639, 641, 650, 650, 653, 655, 661, 661, 663, 668, 668, 670, 670, 674, 682, 686, 732ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 933,
            "range": "±17",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 926ms, Q3: 943ms\nAll times: 912, 913, 922, 923, 924, 926, 926, 926, 927, 930, 933, 935, 936, 938, 938, 943, 944, 946, 951, 962ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "912bd733df35caa5fd9fa120a5c32b5545264827",
          "message": "chore(deps): Bump Node to 24.15.0 and npm to 12.0.1\n\nThe npm-publish workflow runs `npm install -g npm@latest`, which now resolves\nto npm@12.0.1 and requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`. The pinned\nNode 24.14.0 is just below that floor, so the publish job failed on EBADENGINE.\n\nBump the pinned Node to 24.15.0 to satisfy the latest npm, and align the local\nnpm pin with the version the publish job installs.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-11T21:16:56+09:00",
          "tree_id": "b5a8f5f76deb16a6b2e3508a77d3e40597c74a2e",
          "url": "https://github.com/yamadashy/repomix/commit/912bd733df35caa5fd9fa120a5c32b5545264827"
        },
        "date": 1783772892806,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 490,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 485ms, Q3: 501ms\nAll times: 474, 476, 478, 482, 482, 484, 484, 485, 487, 488, 488, 488, 489, 489, 489, 490, 494, 495, 496, 497, 497, 498, 501, 501, 508, 513, 527, 528, 561, 635ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 848,
            "range": "±14",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 839ms, Q3: 853ms\nAll times: 832, 832, 835, 836, 837, 839, 840, 843, 843, 846, 848, 849, 850, 851, 852, 853, 856, 864, 878, 894ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1186,
            "range": "±21",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1181ms, Q3: 1202ms\nAll times: 1168, 1173, 1174, 1177, 1180, 1181, 1181, 1182, 1182, 1182, 1186, 1189, 1189, 1190, 1190, 1202, 1202, 1203, 1211, 1232ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "distinct": true,
          "id": "4747b66b660d6213382afb8b5aad3b25233024ca",
          "message": "docs(release): Add v1.16.1 release notes",
          "timestamp": "2026-07-11T21:39:17+09:00",
          "tree_id": "e226ae6ef7fd7031433f56e075b8911c4eba08b9",
          "url": "https://github.com/yamadashy/repomix/commit/4747b66b660d6213382afb8b5aad3b25233024ca"
        },
        "date": 1783773655812,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 687,
            "range": "±127",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 620ms, Q3: 747ms\nAll times: 552, 561, 582, 584, 586, 605, 607, 620, 621, 625, 639, 667, 670, 683, 686, 687, 707, 719, 730, 739, 741, 744, 747, 754, 770, 795, 823, 829, 858, 913ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 828,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 820ms, Q3: 839ms\nAll times: 804, 812, 815, 817, 818, 820, 821, 822, 826, 828, 828, 831, 832, 832, 834, 839, 840, 842, 852, 901ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1188,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1181ms, Q3: 1196ms\nAll times: 1160, 1168, 1168, 1169, 1174, 1181, 1181, 1182, 1184, 1185, 1188, 1190, 1190, 1190, 1190, 1196, 1196, 1200, 1201, 1245ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9a9aa42d6af06e4047efb0f19b24fcde88eb608a",
          "message": "Merge pull request #1718 from yamadashy/improve/website-a11y-contrast\n\nfix(website): Improve accessibility contrast and add main landmark",
          "timestamp": "2026-07-12T00:14:30+09:00",
          "tree_id": "2fc038955aa549e37b3eaef847aeaae9f934c17d",
          "url": "https://github.com/yamadashy/repomix/commit/9a9aa42d6af06e4047efb0f19b24fcde88eb608a"
        },
        "date": 1783782977502,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 506,
            "range": "±19",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 500ms, Q3: 519ms\nAll times: 483, 484, 488, 488, 495, 496, 497, 500, 500, 503, 504, 504, 505, 506, 506, 506, 508, 509, 511, 515, 516, 518, 519, 531, 533, 545, 556, 590, 657, 691ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 905,
            "range": "±26",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 890ms, Q3: 916ms\nAll times: 873, 883, 886, 887, 888, 890, 890, 891, 896, 900, 905, 905, 906, 911, 913, 916, 918, 919, 924, 932ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1132,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1118ms, Q3: 1138ms\nAll times: 1095, 1104, 1110, 1113, 1115, 1118, 1119, 1120, 1121, 1128, 1132, 1133, 1135, 1136, 1137, 1138, 1139, 1144, 1173, 1175ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "144f8d8e1fc68956a0d6179af007ffdcefbc95ee",
          "message": "Merge pull request #1719 from yamadashy/feat/mcp-output-patterns\n\nfeat(mcp): Expose output.patterns via pack tools",
          "timestamp": "2026-07-12T13:23:17+09:00",
          "tree_id": "4467ead4b74a140c75d46645235b7f349cbd79fc",
          "url": "https://github.com/yamadashy/repomix/commit/144f8d8e1fc68956a0d6179af007ffdcefbc95ee"
        },
        "date": 1783830324232,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 786,
            "range": "±63",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 752ms, Q3: 815ms\nAll times: 570, 673, 684, 707, 710, 720, 744, 752, 754, 757, 767, 768, 778, 780, 785, 786, 793, 795, 799, 800, 807, 811, 815, 817, 820, 852, 871, 889, 902, 915ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 899,
            "range": "±46",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 886ms, Q3: 932ms\nAll times: 875, 876, 878, 880, 883, 886, 887, 888, 888, 890, 899, 908, 912, 920, 924, 932, 973, 985, 1017, 1172ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1199,
            "range": "±28",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1183ms, Q3: 1211ms\nAll times: 1168, 1168, 1179, 1180, 1182, 1183, 1186, 1189, 1194, 1197, 1199, 1200, 1201, 1202, 1204, 1211, 1218, 1224, 1246, 1371ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "41018c763f5efedfe02b971291aebf63236a0d65",
          "message": "Merge pull request #1720 from yamadashy/feat/file-processors-933\n\nfeat(core): Support custom file processors with external commands",
          "timestamp": "2026-07-13T00:49:23+09:00",
          "tree_id": "a5220b459aa855b8cc2d204f4e1ee507b985228c",
          "url": "https://github.com/yamadashy/repomix/commit/41018c763f5efedfe02b971291aebf63236a0d65"
        },
        "date": 1783871460588,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 508,
            "range": "±61",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 490ms, Q3: 551ms\nAll times: 467, 473, 480, 482, 484, 487, 487, 490, 491, 494, 495, 495, 497, 505, 507, 508, 508, 513, 514, 517, 531, 536, 551, 567, 592, 605, 636, 664, 666, 667ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 940,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 929ms, Q3: 945ms\nAll times: 912, 917, 920, 923, 925, 929, 932, 935, 937, 940, 940, 942, 942, 942, 943, 945, 950, 967, 999, 1084ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1139,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1129ms, Q3: 1153ms\nAll times: 1118, 1121, 1124, 1126, 1127, 1129, 1132, 1134, 1137, 1138, 1139, 1140, 1141, 1147, 1151, 1153, 1154, 1159, 1163, 1167ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "aa88eacfddb0a6092232390598c0545a470045bd",
          "message": "Merge pull request #1721 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260705.1",
          "timestamp": "2026-07-13T00:54:31+09:00",
          "tree_id": "c3d8589668a7fb09a9dc5c812c8f9fc2aa9987ce",
          "url": "https://github.com/yamadashy/repomix/commit/aa88eacfddb0a6092232390598c0545a470045bd"
        },
        "date": 1783871778670,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 527,
            "range": "±55",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 508ms, Q3: 563ms\nAll times: 495, 496, 500, 500, 502, 504, 505, 508, 510, 512, 516, 517, 522, 525, 526, 527, 537, 537, 538, 556, 557, 558, 563, 573, 578, 600, 600, 608, 625, 633ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 663,
            "range": "±16",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 658ms, Q3: 674ms\nAll times: 647, 650, 652, 655, 657, 658, 660, 661, 661, 661, 663, 664, 667, 672, 673, 674, 675, 679, 685, 699ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1168,
            "range": "±43",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1159ms, Q3: 1202ms\nAll times: 1139, 1152, 1154, 1154, 1159, 1159, 1163, 1164, 1167, 1168, 1168, 1173, 1179, 1180, 1186, 1202, 1259, 1332, 1499, 1512ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0f2e7954f8f2973405391728b27b6c12fcfdf165",
          "message": "Merge pull request #1722 from yamadashy/renovate/root-non-major-dependencies\n\nchore(deps): update dependency @typescript/native-preview to ^7.0.0-dev.20260705.1",
          "timestamp": "2026-07-13T00:54:34+09:00",
          "tree_id": "743194fdb2db65b21bcd27fc1444028a12602732",
          "url": "https://github.com/yamadashy/repomix/commit/0f2e7954f8f2973405391728b27b6c12fcfdf165"
        },
        "date": 1783871900414,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 779,
            "range": "±101",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 731ms, Q3: 832ms\nAll times: 577, 599, 652, 707, 709, 718, 728, 731, 737, 740, 761, 771, 774, 775, 776, 779, 791, 794, 795, 798, 827, 831, 832, 845, 846, 870, 876, 991, 1016, 1174ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 876,
            "range": "±20",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 866ms, Q3: 886ms\nAll times: 851, 859, 862, 864, 865, 866, 868, 871, 873, 874, 876, 881, 882, 884, 885, 886, 894, 904, 946, 1004ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1250,
            "range": "±39",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1233ms, Q3: 1272ms\nAll times: 1216, 1218, 1221, 1222, 1222, 1233, 1240, 1241, 1244, 1245, 1250, 1254, 1255, 1255, 1262, 1272, 1274, 1274, 1277, 1319ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a5577d5718b1e88940b71d17fe9842ea45382a3a",
          "message": "Merge pull request #1725 from serhiizghama/fix-files-false-json\n\nfix(output): Widen Markdown fence so git diffs can't break it",
          "timestamp": "2026-07-16T00:31:04+09:00",
          "tree_id": "423e9674870813f860676fa9713ea18cd382b1ea",
          "url": "https://github.com/yamadashy/repomix/commit/a5577d5718b1e88940b71d17fe9842ea45382a3a"
        },
        "date": 1784129691913,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 791,
            "range": "±106",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 702ms, Q3: 808ms\nAll times: 631, 637, 639, 651, 653, 696, 701, 702, 703, 707, 724, 760, 773, 776, 788, 791, 795, 798, 800, 803, 805, 808, 808, 826, 842, 860, 879, 884, 915, 965ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 927,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 913ms, Q3: 949ms\nAll times: 897, 901, 906, 909, 912, 913, 918, 919, 921, 924, 927, 938, 940, 943, 948, 949, 950, 954, 957, 961ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 941,
            "range": "±88",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 929ms, Q3: 1017ms\nAll times: 890, 909, 916, 928, 928, 929, 931, 933, 936, 938, 941, 942, 946, 950, 961, 1017, 1023, 1044, 1195, 1288ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e982a79f71087f95650bef11cf350b4665b14fb4",
          "message": "Merge pull request #1728 from yamadashy/renovate/browser-non-major-dependencies\n\nchore(deps): update browser non-major dependencies",
          "timestamp": "2026-07-18T14:52:56+09:00",
          "tree_id": "da711d5c90e3f1ebfdc04474719c8a629c4d08c3",
          "url": "https://github.com/yamadashy/repomix/commit/e982a79f71087f95650bef11cf350b4665b14fb4"
        },
        "date": 1784354072971,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 580,
            "range": "±71",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 549ms, Q3: 620ms\nAll times: 493, 498, 517, 534, 540, 545, 546, 549, 558, 561, 563, 566, 570, 573, 575, 580, 589, 591, 596, 599, 599, 614, 620, 637, 644, 645, 679, 681, 686, 708ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 838,
            "range": "±22",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 832ms, Q3: 854ms\nAll times: 820, 822, 827, 827, 832, 832, 833, 835, 836, 836, 838, 842, 850, 851, 852, 854, 855, 856, 861, 895ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 1156,
            "range": "±15",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 1150ms, Q3: 1165ms\nAll times: 1134, 1136, 1139, 1146, 1147, 1150, 1151, 1154, 1156, 1156, 1156, 1158, 1159, 1159, 1160, 1165, 1168, 1173, 1179, 1236ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "koukun0120@gmail.com",
            "name": "Kazuki Yamada",
            "username": "yamadashy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "85ba28d95ae99b3a95078718a2e69cfed024e8c2",
          "message": "Merge pull request #1729 from yamadashy/renovate/scripts-non-major-dependencies\n\nchore(deps): update dependency @types/node to ^24.13.3",
          "timestamp": "2026-07-18T14:54:21+09:00",
          "tree_id": "cdb2235202c4062e3808c6dca8beec84ab9b8356",
          "url": "https://github.com/yamadashy/repomix/commit/85ba28d95ae99b3a95078718a2e69cfed024e8c2"
        },
        "date": 1784354269847,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Repomix Pack (macOS)",
            "value": 909,
            "range": "±361",
            "unit": "ms",
            "extra": "Median of 30 runs\nQ1: 625ms, Q3: 986ms\nAll times: 580, 587, 596, 605, 606, 610, 613, 625, 667, 724, 823, 866, 867, 874, 902, 909, 912, 913, 928, 971, 980, 983, 986, 1004, 1010, 1014, 1053, 1057, 1057, 1109ms"
          },
          {
            "name": "Repomix Pack (Linux)",
            "value": 897,
            "range": "±36",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 884ms, Q3: 920ms\nAll times: 862, 867, 874, 880, 881, 884, 884, 891, 896, 897, 897, 898, 898, 901, 916, 920, 921, 922, 929, 965ms"
          },
          {
            "name": "Repomix Pack (Windows)",
            "value": 965,
            "range": "±24",
            "unit": "ms",
            "extra": "Median of 20 runs\nQ1: 959ms, Q3: 983ms\nAll times: 940, 944, 948, 955, 956, 959, 960, 962, 963, 964, 965, 965, 965, 975, 978, 983, 990, 994, 1066, 1183ms"
          }
        ]
      }
    ]
  }
}