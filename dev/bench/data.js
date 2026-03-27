window.BENCHMARK_DATA = {
  "lastUpdate": 1774631561602,
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
      }
    ]
  }
}