window.BENCHMARK_DATA = {
  "lastUpdate": 1774664885882,
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
      }
    ]
  }
}