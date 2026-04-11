window.BENCHMARK_DATA = {
  "lastUpdate": 1775899496204,
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
      }
    ]
  }
}