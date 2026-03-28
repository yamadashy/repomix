window.BENCHMARK_DATA = {
  "lastUpdate": 1774710223215,
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
      }
    ]
  }
}